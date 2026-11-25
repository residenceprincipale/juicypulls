import { step, uv } from 'three/tsl'

const WHEEL_COUNT = 5

// Outer LEDs and separators: a flat color (UnlitCustomMaterial nodes)
export function ledsNodes(uniforms) {
	return { color: uniforms.uColor, opacity: uniforms.uOpacity }
}

// LED strip around the wheels: one fifth per wheel, tinted with uLockedColorN while wheel N is held
export function innerLedsNodes(uniforms) {
	const x = uv().x
	let color = uniforms.uColor
	for (let index = 0; index < WHEEL_COUNT; index++) {
		const start = index / WHEEL_COUNT
		const isInZone = index === WHEEL_COUNT - 1 ? step(start, x) : step(start, x).mul(step(x, start + 1 / WHEEL_COUNT))
		color = color.mix(uniforms[`uLockedColor${index}`], uniforms[`uLockedOpacity${index}`].mul(isInZone))
	}
	return { color, opacity: uniforms.uOpacity }
}
