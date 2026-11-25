import { dot, floor, mod, uv, vec2, vec3 } from 'three/tsl'

// Shooter target face (UnlitCustomMaterial nodes): one of the 9 faces of a 3×3 atlas (uFaceIndex), in grayscale
export default function faceNodes(uniforms) {
	const index = floor(uniforms.uFaceIndex)
	const cell = vec2(mod(index, 3), floor(index.div(3)))
	const face = uniforms.uFaceTexture.sample(uv().div(3).add(cell.div(3)))
	const gray = dot(face.rgb, vec3(0.299, 0.587, 0.114))

	return { color: vec3(gray), opacity: face.a.mul(uniforms.uOpacity) }
}
