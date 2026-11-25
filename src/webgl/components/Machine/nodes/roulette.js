import { clamp, float, fract, mix, step, uv, vec2, vec3 } from 'three/tsl'
import { aoColor, rotateUV } from '@/webgl/materials/PhongMaterial'

const WHEEL_COUNT = 5

/**
 * Wheels of the main roulette (PhongCustomMaterial nodes): the 5 wheels share one symbol strip, each scrolled by
 * its `uRotationN` (MachineManager tweens them). The texture alpha marks the symbols: the wheel background around
 * them gets the background color, the specular and the glass matcap.
 */
export default function rouletteNodes(uniforms) {
	const surfaceUv = uv()
	const wheelsUv = rotateUV(surfaceUv, float(Math.PI / 2))
	const wheelWidth = float(1).div(uniforms.uWheelsSpacing)

	let v = wheelsUv.y.add(uniforms.uBaseRotationOffset)
	for (let index = 0; index < WHEEL_COUNT; index++) {
		const isInWheel = step(wheelWidth.mul(index), wheelsUv.x).mul(step(wheelsUv.x, wheelWidth.mul(index + 1)))
		v = v.sub(uniforms[`uRotation${index}`].mul(isInWheel))
	}
	const u = fract(wheelsUv.x.mul(uniforms.uWheelsSpacing)).div(uniforms.uWheelsSpacing).add(uniforms.uWheelsOffset)

	const albedo = uniforms.uAlbedoMap.sample(vec2(u, v))
	const background = albedo.a.oneMinus()
	const roughness = uniforms.uRoughnessMap
		.sample(surfaceUv.mul(uniforms.uRoughnessRepeat))
		.r.mul(uniforms.uRoughnessIntensity)
		.mul(background)

	return {
		diffuse: mix(uniforms.uBackgroundColor, albedo.rgb.mul(uniforms.uAlbedoIntensity), albedo.a),
		specularStrength: uniforms.uSpecularIntensity.mul(roughness).mul(background),
		post: (color, { matcap }) => {
			// Baked shadow of the wheel window
			const ao = uniforms.uAoMap
				.sample(surfaceUv.mul(vec2(0.8, 1)).add(vec2(0.06, 0)))
				.g.sub(1)
				.mul(uniforms.uAOIntensity)
				.add(1)
			const glass = clamp(matcap().sub(1).mul(uniforms.uMatcapIntensity).add(1), 0, 1)
			return color.mul(aoColor(ao)).mul(mix(glass, vec3(1), albedo.a))
		},
	}
}
