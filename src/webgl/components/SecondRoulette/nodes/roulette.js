import { clamp, float, fract, mix, select, step, uv, vec2, vec3 } from 'three/tsl'
import { rotateUV } from '@/webgl/materials/PhongMaterial'

/**
 * The second roulette's 2 wheels (PhongCustomMaterial nodes), each scrolled by its `uRotationN`, each with its own
 * offset on the symbol texture. The texture alpha marks the symbols, as on the main roulette.
 */
export default function secondRouletteNodes(uniforms) {
	const surfaceUv = uv()
	const wheelsUv = rotateUV(surfaceUv, float(Math.PI / 2))
	const wheelWidth = float(1).div(uniforms.uWheelsSpacing)

	const isFirstWheel = step(wheelsUv.x, wheelWidth)
	const isSecondWheel = step(wheelWidth, wheelsUv.x).mul(step(wheelsUv.x, wheelWidth.mul(2)))
	const v = wheelsUv.y
		.add(uniforms.uBaseRotationOffset)
		.sub(uniforms.uRotation0.mul(isFirstWheel))
		.sub(uniforms.uRotation1.mul(isSecondWheel))

	const offset = select(wheelsUv.x.lessThan(wheelWidth), uniforms.uWheelsOffset, uniforms.uWheelsOffset1)
	const u = fract(wheelsUv.x.mul(uniforms.uWheelsSpacing)).div(uniforms.uWheelsSpacing).add(offset)

	const albedo = uniforms.uAlbedoMap.sample(vec2(u, v).mul(uniforms.uAlbedoRepeat))
	const background = albedo.a.oneMinus()
	const roughness = uniforms.uRoughnessMap
		.sample(surfaceUv.mul(uniforms.uRoughnessRepeat))
		.r.mul(uniforms.uRoughnessIntensity)
		.mul(background)

	return {
		diffuse: mix(uniforms.uBackgroundColor, albedo.rgb, albedo.a),
		specularStrength: uniforms.uSpecularIntensity.mul(roughness).mul(background),
		post: (color, { matcap }) => {
			const glass = clamp(matcap().sub(1).mul(uniforms.uMatcapIntensity).add(1), 0, 1)
			return color.mul(mix(glass, vec3(1), albedo.a))
		},
	}
}
