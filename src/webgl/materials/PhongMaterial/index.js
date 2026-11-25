import Experience from 'core/Experience.js'
import {
	Color,
	DataTexture,
	LightingModel,
	MeshBasicNodeMaterial,
	MeshPhongNodeMaterial,
	Vector2,
	Vector3,
	Vector4,
} from 'three/webgpu'
import {
	BRDF_Lambert,
	F_Schlick,
	clamp,
	cos,
	cross,
	diffuseColor,
	dot,
	float,
	lights,
	mix,
	normalMap,
	normalView,
	positionViewDirection,
	sin,
	texture,
	uniform,
	uv,
	vec2,
	vec3,
	vec4,
} from 'three/tsl'

// Uniforms every lit material has (overridden by the settings file)
const LIT_DEFAULTS = {
	uAmbientIntensity: { value: 1 },
	uDiffuseIntensity: { value: 2 },
	uSpecularIntensity: { value: 1 },
	uShininess: { value: 100 },
	uOpacity: { value: 1 },
	uAmbientColor: { value: '#ffffff' },
	uDiffuseColor: { value: '#dd0000' },
	uSpecularColor: { value: '#ffffff' },
	uEmissiveColor: { value: '#000000' },
}

// Stands in for a missing texture: black, like an unbound sampler in the former GLSL materials
const BLACK_TEXTURE = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
BLACK_TEXTURE.needsUpdate = true

/**
 * Turns a settings object (`{ uName: { value } }`, see the *Settings.js files) into TSL uniform nodes.
 * Every node has a `.value` like the old ShaderMaterial uniforms, so tweens, game code and the debug panel keep
 * writing `material.uniforms.uName.value`.
 *   - number / boolean → float uniform
 *   - '#hex' or '0x..' string, or a Color → color uniform
 *   - other string → texture from resources (by name), or a Texture → texture node
 *   - { x, y } / { x, y, z } / { x, y, z, w } → vector uniform
 */
export function createUniforms(settings = {}) {
	const resources = new Experience().scene.resources
	const uniforms = {}

	for (const key in settings) {
		const value = settings[key]?.value
		if (value === undefined) continue

		if (typeof value === 'string') {
			if (value.startsWith('#')) uniforms[key] = uniform(new Color(value))
			else if (value.startsWith('0x')) uniforms[key] = uniform(new Color(parseInt(value)))
			else uniforms[key] = texture(resources?.items[value] ?? BLACK_TEXTURE)
		} else if (value?.isColor) {
			uniforms[key] = uniform(value.clone())
		} else if (value?.isTexture) {
			uniforms[key] = texture(value)
		} else if (typeof value === 'object' && value !== null) {
			if (value.w !== undefined) uniforms[key] = uniform(new Vector4(value.x, value.y, value.z, value.w))
			else if (value.z !== undefined) uniforms[key] = uniform(new Vector3(value.x, value.y, value.z))
			else uniforms[key] = uniform(new Vector2(value.x, value.y))
		} else {
			uniforms[key] = uniform(Number(value))
		}
	}

	return uniforms
}

// Returns the uniform, creating it with `fallback` when the settings file doesn't define it
export function useUniform(uniforms, name, fallback) {
	if (!uniforms[name]) uniforms[name] = createUniforms({ [name]: { value: fallback } })[name]
	return uniforms[name]
}

// Texture uniform a feature samples; black when the settings file doesn't define it (reported in #debug)
export function useTexture(uniforms, name, materialName = 'material') {
	if (!uniforms[name] && new Experience().debug.active) {
		console.warn(`${materialName}: a feature samples ${name}, which its settings don't define (black is used)`)
	}
	return useUniform(uniforms, name, BLACK_TEXTURE)
}

/**
 * Helpers shared by the component materials
 */
// View-space matcap lookup (0.495 avoids the undersized edges of matcap disks)
export function matcapColor(uniforms, roughness = float(1)) {
	const viewDirection = positionViewDirection
	const x = vec3(viewDirection.z, 0, viewDirection.x.negate()).normalize()
	const y = cross(viewDirection, x)
	const matcapUv = vec2(dot(x, normalView), dot(y, normalView)).mul(0.495).add(0.5).mul(roughness)
	return useTexture(uniforms, 'uMatcapMap', 'A matcap material').sample(
		matcapUv.add(useUniform(uniforms, 'uMatcapOffset', { x: 0, y: 0 })),
	).rgb
}

// AO factor (1 = none) → color multiplier, darkening toward a purple-ish black
export function aoColor(ao) {
	return mix(vec3(1), vec3(0.01, 0, 0.01), ao.oneMinus())
}

// Machine screens, after lighting: brightness (uScreenLuminosity, the screen on/off flicker) then a faint glass reflection
export function screenPost(uniforms, color, matcap) {
	return color.mul(uniforms.uScreenLuminosity).add(clamp(matcap().mul(0.05).mul(uniforms.uMatcapIntensity), 0, 1))
}

export function rotateUV(uvNode, rotation) {
	const cosAngle = cos(rotation)
	const sinAngle = sin(rotation)
	const centered = uvNode.sub(0.5)
	return vec2(
		cosAngle.mul(centered.x).add(sinAngle.mul(centered.y)),
		cosAngle.mul(centered.y).sub(sinAngle.mul(centered.x)),
	).add(0.5)
}

/**
 * The project's Phong lighting: direct diffuse scaled by uDiffuseIntensity, Blinn-Phong specular scaled by the
 * material's specular strength. The ambient part (uAmbientColor) goes through the emissive node, so materials
 * that no light reaches still get it.
 */
class CustomPhongLightingModel extends LightingModel {
	constructor(material) {
		super()
		this._material = material
	}

	direct({ lightDirection, lightColor, reflectedLight }) {
		const uniforms = this._material.uniforms
		const dotNL = normalView.dot(lightDirection).clamp()
		const irradiance = dotNL.mul(lightColor)

		reflectedLight.directDiffuse.addAssign(
			irradiance.mul(BRDF_Lambert({ diffuseColor: diffuseColor.rgb })).mul(uniforms.uDiffuseIntensity),
		)

		const halfDirection = lightDirection.add(positionViewDirection).normalize()
		const dotNH = normalView.dot(halfDirection).clamp()
		const dotVH = positionViewDirection.dot(halfDirection).clamp()
		const fresnel = F_Schlick({ f0: uniforms.uSpecularColor, f90: 1.0, dotVH })
		const shininess = uniforms.uShininess.max(1e-4)
		const distribution = float(1 / Math.PI)
			.mul(shininess.mul(0.5).add(1))
			.mul(dotNH.pow(shininess))
		reflectedLight.directSpecular.addAssign(
			irradiance.mul(fresnel.mul(0.25).mul(distribution)).mul(this._material.specularStrengthNode),
		)
	}
}

/**
 * Lit material used by most meshes (TSL / WebGPU port of the former GLSL PhongCustomMaterial).
 *
 * `defines` toggles the features read from the settings: USE_ALBEDO, USE_ROUGHNESS, USE_MATCAP, USE_AO,
 * USE_NORMAL, and which scene lights reach it: USE_POINT_LIGHTS, USE_SPOT_LIGHTS (directional lights always do,
 * or only the ones listed in `lights` with `useSelectiveLights`).
 *
 * `nodes(uniforms)` lets a component replace steps of the shading, each optional:
 *   - diffuse: base color (vec3)
 *   - roughness: float, also scales the specular
 *   - specularStrength: float
 *   - opacity: float
 *   - post(color, helpers): lit color → final color (default: AO then matcap)
 */
export class PhongCustomMaterial extends MeshPhongNodeMaterial {
	constructor(options = {}) {
		super()
		const {
			uniforms = {},
			defines = {},
			name = 'CustomPhongMaterial',
			lights: selectiveLights = [],
			useSelectiveLights = false,
			parameters = {},
			nodes,
		} = options

		this._options = options
		this.name = name
		this.transparent = true
		this.features = defines
		this.uniforms = createUniforms({ ...LIT_DEFAULTS, ...uniforms })
		this.setValues(parameters)

		this._setupNodes(nodes?.(this.uniforms) ?? {})
		this.lightsNode = lights(this._getLights(selectiveLights, useSelectiveLights))
	}

	clone() {
		return cloneWithValues(this)
	}

	setupLightingModel() {
		return new CustomPhongLightingModel(this)
	}

	setupOutput(builder, outputNode) {
		const color = this._postNode(outputNode.rgb)
		return super.setupOutput(builder, vec4(clamp(color, 0, 1), outputNode.a))
	}

	_setupNodes(overrides) {
		const uniforms = this.uniforms
		const features = this.features
		const surfaceUv = uv()
		const repeat = (name) => surfaceUv.mul(useUniform(uniforms, name, { x: 1, y: 1 }))
		const intensity = (name) => useUniform(uniforms, name, 1)
		this._repeatedUv = repeat
		this._intensity = intensity

		const roughness =
			overrides.roughness ??
			(features.USE_ROUGHNESS
				? useTexture(uniforms, 'uRoughnessMap', this.name)
						.sample(repeat('uRoughnessRepeat'))
						.r.mul(intensity('uRoughnessIntensity'))
				: float(1))

		const diffuse =
			overrides.diffuse ??
			(features.USE_ALBEDO
				? mix(
						uniforms.uDiffuseColor,
						useTexture(uniforms, 'uAlbedoMap', this.name).sample(repeat('uAlbedoRepeat')).rgb,
						intensity('uAlbedoIntensity'),
					)
				: uniforms.uDiffuseColor)

		this.colorNode = vec4(diffuse, 1)
		this.opacityNode = overrides.opacity ?? uniforms.uOpacity
		this.specularStrengthNode = overrides.specularStrength ?? uniforms.uSpecularIntensity.mul(roughness)
		// Ambient: irradiance uAmbientColor on a Lambert surface
		this.emissiveNode = BRDF_Lambert({ diffuseColor: diffuse })
			.mul(uniforms.uAmbientColor)
			.mul(uniforms.uAmbientIntensity)
			.add(uniforms.uEmissiveColor)

		if (features.USE_NORMAL) {
			const scale = useUniform(uniforms, 'uNormalScale', { x: 1, y: 1 })
			this.normalNode = normalMap(useTexture(uniforms, 'uNormalMap', this.name).sample(repeat('uNormalRepeat')), scale)
		}

		const helpers = { matcap: (matcapRoughness) => matcapColor(uniforms, matcapRoughness), aoColor }
		this._postNode = overrides.post ? (color) => overrides.post(color, helpers) : (color) => this._defaultPost(color)
	}

	_defaultPost(color) {
		const uniforms = this.uniforms
		const features = this.features

		if (features.USE_AO) {
			const ao = useTexture(uniforms, 'uAOMap', this.name)
				.sample(this._repeatedUv('uAOMapRepeat'))
				.g.sub(1)
				.mul(this._intensity('uAOMapIntensity'))
				.add(1)
			color = color.mul(aoColor(ao))
		}
		if (features.USE_MATCAP) {
			color = color.mul(clamp(matcapColor(uniforms).sub(1).mul(this._intensity('uMatcapIntensity')).add(1), 0, 1))
		}
		return color
	}

	_getLights(selectiveLights, useSelectiveLights) {
		const sceneLights = []
		new Experience().scene.traverse((object) => {
			if (!object.isLight) return
			if (object.isDirectionalLight) {
				if (!useSelectiveLights || selectiveLights.includes(object.name)) sceneLights.push(object)
			} else if (object.isPointLight) {
				if (this.features.USE_POINT_LIGHTS) sceneLights.push(object)
			} else if (object.isSpotLight) {
				if (this.features.USE_SPOT_LIGHTS) sceneLights.push(object)
			}
		})
		return sceneLights
	}
}

/**
 * Unlit material with the same `uniforms` API, for LEDs, the flashlight beam and the targets.
 * `nodes(uniforms)` returns { color (vec3), opacity (float) }.
 */
export class UnlitCustomMaterial extends MeshBasicNodeMaterial {
	constructor(options = {}) {
		super()
		const { uniforms = {}, name = 'UnlitCustomMaterial', parameters = {}, nodes } = options

		this._options = options
		this.name = name
		this.uniforms = createUniforms(uniforms)
		this.setValues(parameters)

		const { color, opacity } = nodes?.(this.uniforms) ?? {}
		if (color) this.colorNode = vec4(color, 1)
		if (opacity) this.opacityNode = opacity
	}

	clone() {
		return cloneWithValues(this)
	}
}

// A clone gets its own uniforms (built from the same options), starting from the current values
function cloneWithValues(material) {
	const copy = new material.constructor(material._options)
	for (const key in material.uniforms) {
		const source = material.uniforms[key]
		const target = useUniform(copy.uniforms, key, source.value)
		if (source.value?.isTexture || typeof source.value !== 'object') target.value = source.value
		else target.value.copy(source.value)
	}
	return copy
}
