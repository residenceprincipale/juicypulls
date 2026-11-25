import { abs, cameraPosition, dot, float, normalWorld, positionWorld, smoothstep, uv } from 'three/tsl'

// Torch beam (UnlitCustomMaterial nodes): a faint cone, brighter facing the camera, with drifting noise, fading at its end
export default function rayNodes(uniforms) {
	const surfaceUv = uv()
	const viewDirection = cameraPosition.sub(positionWorld).normalize()
	const facing = abs(dot(viewDirection, normalWorld)).pow(uniforms.uFresnelPower)
	const noise = uniforms.uNoiseTexture
		.sample(surfaceUv.add(uniforms.uTime.mul(0.00001).mul(uniforms.uNoiseSpeed)))
		.r.mul(uniforms.uNoiseIntensity)
	const fadeOut = smoothstep(0, 0.2, surfaceUv.y).oneMinus()

	return { color: uniforms.uColor, opacity: float(0.1).mul(facing).mul(noise).mul(fadeOut) }
}
