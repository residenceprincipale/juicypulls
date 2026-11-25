import { uv } from 'three/tsl'
import { screenPost } from '@/webgl/materials/PhongMaterial'

// Score screen glass (PhongCustomMaterial nodes): the farkle and jackpot videos over the base color
export default function scoreScreenNodes(uniforms) {
	const surfaceUv = uv()
	const diffuse = uniforms.uDiffuseColor
		.add(uniforms.uVideoFarkle.sample(surfaceUv).rgb.mul(uniforms.uFarkleOpacity))
		.add(uniforms.uVideoJackpotx3.sample(surfaceUv).rgb.mul(uniforms.uJackpotx3Opacity).mul(uniforms.uVideoTint))
		.add(uniforms.uVideoJackpotx4.sample(surfaceUv).rgb.mul(uniforms.uJackpotx4Opacity).mul(uniforms.uVideoTint))
		.add(uniforms.uVideoJackpotx5.sample(surfaceUv).rgb.mul(uniforms.uJackpotx5Opacity).mul(uniforms.uVideoTint))

	return {
		diffuse,
		post: (color, { matcap }) => screenPost(uniforms, color, matcap),
	}
}
