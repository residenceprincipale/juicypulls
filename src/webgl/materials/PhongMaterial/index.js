import { ShaderMaterial, ShaderChunk, Color, Vector3, Vector2, UniformsUtils, UniformsLib } from 'three'
import defaultVertexShader from './shaders/vertex.glsl'
import defaultFragmentShader from './shaders/fragment.glsl'
import Experience from 'core/Experience.js'

// Import custom shader chunks
import customLightsPhongParsFragment from '../../shaders/chunks/lights_phong_selective_pars_fragment.glsl'
import customLightsPhongFragment from '../../shaders/chunks/lights_selective_fragment_begin.glsl'

// Add custom shader chunks to ShaderChunk (always used by default)
ShaderChunk['custom_lights_phong_pars_fragment'] = customLightsPhongParsFragment
ShaderChunk['custom_lights_phong_fragment'] = customLightsPhongFragment

export class PhongCustomMaterial extends ShaderMaterial {
	constructor({
		vertexShader = defaultVertexShader,
		fragmentShader = defaultFragmentShader,
		defines = {},
		uniforms = {},
		parameters = {},
		name = 'CustomPhongMaterial',
		lights = [], // Array of light keys that should affect this material
		useSelectiveLights = false, // Whether to enable selective lighting for this material
	} = {}) {
		const experience = new Experience()
		const resources = experience.scene.resources

		const processedUniforms = {}
		for (const key in uniforms) {
			const element = uniforms[key]
			if (!element) continue
			if (typeof element.value === 'string') {
				if (element.value.startsWith('#')) {
					// color hex
					processedUniforms[key] = { value: new Color(element.value) }
				} else if (element.value.startsWith('0x')) {
					// color not hex
					processedUniforms[key] = { value: new Color(parseInt(element.value)) }
				} else {
					// texture
					processedUniforms[key] = { value: resources.items[element.value] }
				}
			} else if (element.value !== undefined) {
				if (element.value.z !== undefined) {
					processedUniforms[key] = { value: new Vector3(element.value.x, element.value.y, element.value.z) }
				} else if (element.value.y !== undefined) {
					processedUniforms[key] = { value: new Vector2(element.value.x, element.value.y) }
				} else {
					processedUniforms[key] = { value: element.value }
				}
			}
		}

		const defaultUniforms = UniformsUtils.merge([
			UniformsLib.lights,
			UniformsLib.fog,
			{
				uAmbientIntensity: { value: 1.0 },
				uDiffuseIntensity: { value: 2.0 },
				uSpecularIntensity: { value: 1.0 },
				uShininess: { value: 100.0 },
				uOpacity: { value: 1.0 },
				uAmbientColor: { value: new Color(0xffffff) },
				uDiffuseColor: { value: new Color(0xdd0000) },
				uSpecularColor: { value: new Color(0xffffff) },
				uEmissiveColor: { value: new Color(0x000000) },
			},
		])

		let mergedUniforms = UniformsUtils.merge([defaultUniforms, processedUniforms])

		// Handle selective lighting
		const finalDefines = { ...defines }
		if (useSelectiveLights && experience.selectiveLightManager) {
			finalDefines.SELECTIVE_DIR_LIGHTS = ''

			// Get selective light uniforms for this material
			const selectiveLightUniforms = experience.selectiveLightManager.getMaterialUniforms(lights)
			console.log('selectiveLightUniforms', selectiveLightUniforms)
			mergedUniforms = UniformsUtils.merge([mergedUniforms, selectiveLightUniforms])

			console.log('mergedUniforms', mergedUniforms)

			console.log(`Material "${name}" using selective lights:`, lights)
		}

		super({
			vertexShader,
			fragmentShader,
			uniforms: mergedUniforms,
			defines: finalDefines,
			lights: true,
			fog: true,
			transparent: true,
			name,
			...parameters,
		})

		// Store configuration for debugging
		this.selectiveLights = lights
		this.useSelectiveLights = useSelectiveLights
	}

	/**
	 * Update the selective lights for this material
	 * @param {Array} newLights - Array of light keys
	 */
	updateSelectiveLights(newLights) {
		if (!this.useSelectiveLights) {
			console.warn('Material not configured for selective lighting')
			return
		}

		const experience = new Experience()
		if (experience.selectiveLightManager) {
			const selectiveLightUniforms = experience.selectiveLightManager.getMaterialUniforms(newLights)

			// Update uniforms
			if (this.uniforms.uSelectiveLightsArray) {
				this.uniforms.uSelectiveLightsArray.value = selectiveLightUniforms.uSelectiveLightsArray.value
			}

			this.selectiveLights = newLights
			console.log(`Updated material "${this.name}" selective lights:`, newLights)
		}
	}
}
