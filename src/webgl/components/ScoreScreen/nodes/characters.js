import { BufferAttribute } from 'three/webgpu'
import { attribute, floor, fract, mix, step, uv, vec2, vec3 } from 'three/tsl'
import { screenPost } from '@/webgl/materials/PhongMaterial'

// Matches the off-white of the atlas
const MAX_WHITE = vec3(0.8)

// Per-vertex flags of the digits model, packed in two attributes (WebGPU allows 8 vertex buffers, the model has 10)
const VALUE_FLAGS = ['_isscore', '_isquota', '_isbank', '_isjetons']
const OTHER_FLAGS = ['_isquotabar', '_numberdecimal']

export function packCharacterAttributes(geometry) {
	const pack = (names, packedName) => {
		const count = geometry.attributes[names[0]].count
		const packed = new Float32Array(count * names.length)
		names.forEach((name, component) => {
			const attribute = geometry.attributes[name]
			for (let i = 0; i < count; i++) packed[i * names.length + component] = attribute.getX(i)
			geometry.deleteAttribute(name)
		})
		geometry.setAttribute(packedName, new BufferAttribute(packed, names.length))
	}
	pack(VALUE_FLAGS, '_valueflags')
	pack(OTHER_FLAGS, '_otherflags')
}

/**
 * Score screen digits (PhongCustomMaterial nodes). Each digit is a quad of the model whose vertex attributes say
 * which value it shows (`_isscore`, `_isquota`, `_isbank`, `_isjetons`) and which decimal place
 * (`_numberdecimal`), packed by `packCharacterAttributes`; the atlas holds 0–9 side by side, so the digit only shifts the u coordinate.
 * The quota bar (second UV set) fills with bank / quota, drawn in negative.
 */
export default function charactersNodes(uniforms) {
	const surfaceUv = uv()
	const valueFlags = step(0.5, attribute('_valueflags', 'vec4'))
	const otherFlags = attribute('_otherflags', 'vec2')
	const isScore = valueFlags.x
	const isQuota = valueFlags.y
	const isBank = valueFlags.z
	const isJetons = valueFlags.w
	const isQuotaBar = step(0.5, otherFlags.x)
	const numberDecimal = otherFlags.y

	// The "+ 0.0001" works around a floating point imprecision in fract/floor
	const digit = (value) => floor(fract(value.mul(numberDecimal).add(0.0001)).mul(10)).mul(0.1)
	const offsetX = digit(uniforms.uScore)
		.mul(isScore)
		.add(digit(uniforms.uQuota).mul(isQuota))
		.add(digit(uniforms.uBank).mul(isBank))
		.add(digit(uniforms.uJetons).mul(isJetons))

	// Per-value blink opacity (1 elsewhere)
	const blink = (opacity, isValue) => opacity.mul(isValue).add(isValue.oneMinus())
	let color = uniforms.uCharactersAtlas
		.sample(vec2(surfaceUv.x.add(offsetX), surfaceUv.y))
		.rgb.mul(blink(uniforms.uScoreOpacity, isScore))
		.mul(blink(uniforms.uQuotaOpacity, isQuota))
		.mul(blink(uniforms.uBankOpacity, isBank))
		.mul(blink(uniforms.uJetonsOpacity, isJetons))

	// Quota bar: black background, filled part in negative, white borders (main UV y >= 1)
	const barUv = uv(1)
	const progress = step(barUv.x, uniforms.uBank.div(uniforms.uQuota))
	color = color.mul(isQuotaBar.oneMinus())
	color = mix(color, MAX_WHITE.sub(color), step(0, barUv.x).mul(progress))
	color = mix(color, MAX_WHITE, isQuotaBar.mul(step(1, surfaceUv.y)))

	return {
		diffuse: color,
		opacity: uniforms.uOpacity.mul(uniforms.uScreenLuminosity),
		post: (lit, { matcap }) => screenPost(uniforms, lit, matcap),
	}
}
