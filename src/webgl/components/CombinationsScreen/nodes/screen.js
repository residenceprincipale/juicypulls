import { clamp, sin, step, uv, vec2, vec3 } from 'three/tsl'
import { screenPost } from '@/webgl/materials/PhongMaterial'

const ROWS = 7
const COLUMNS = 5
// Size of the highlight grid relative to the glass, centered
const GRID_SIZE = vec2(1.57, 1.07)
const HIGHLIGHTED_ROWS = 6

/**
 * Combinations screen glass (PhongCustomMaterial nodes): the combinations table, the highlighted cell of each row
 * (`uHighlightIndexN` = column, -1 = none; row 6 is the skulls, in red), blinking while `uBlinkingFactorN` is 1,
 * and the jackpot marquee video in the side slots (second UV set).
 */
export default function combinationsScreenNodes(uniforms) {
	const surfaceUv = uv()

	// Table, slightly scaled down, its colored edges cropped
	const displayUv = surfaceUv.mul(0.97).add(0.015)
	const table = uniforms.uCombinations.sample(displayUv).rgb.mul(step(displayUv.x, 0.99)).mul(step(0.01, displayUv.y))

	// Highlight grid
	const gridUv = surfaceUv.mul(GRID_SIZE).sub(GRID_SIZE.sub(1).div(2))
	const isInGrid = step(gridUv.x, 0.99).mul(step(gridUv.y, 0.99)).mul(step(0.01, gridUv.x)).mul(step(0.01, gridUv.y))
	const grid = vec2(gridUv.x.mul(COLUMNS), gridUv.y.mul(ROWS)).mul(isInGrid)
	const blinkingOpacity = sin(uniforms.uTime.mul(uniforms.uBlinkingSpeed)).add(1)

	let highlights = vec3(0)
	for (let row = 1; row <= HIGHLIGHTED_ROWS; row++) {
		const column = uniforms[`uHighlightIndex${row}`]
		const isCell = step(grid.x, column.add(1))
			.mul(step(column, grid.x))
			.mul(step(grid.y, row + 1))
			.mul(step(row, grid.y))
		const color = row === HIGHLIGHTED_ROWS ? uniforms.uRedHighlightColor : uniforms.uGreenHighlightColor
		highlights = highlights.add(color.mul(isCell).mul(blinkingOpacity.add(1).sub(uniforms[`uBlinkingFactor${row}`])))
	}
	highlights = clamp(highlights, 0, 1)

	// The highlight replaces the cell color
	let diffuse = table.add(uniforms.uDiffuseColor)
	diffuse = diffuse.mul(vec3(1).sub(highlights.r.add(highlights.g).add(highlights.b)).add(highlights))

	// Marquee video in the side slots
	const marqueeUv = uv(1)
	const marquee = uniforms.uVideoMarquee.sample(marqueeUv).rgb.mul(step(marqueeUv.x, 0.99)).mul(step(0.01, marqueeUv.y))
	diffuse = diffuse.add(marquee.mul(uniforms.uMarqueeTint).mul(uniforms.uMarqueeOpacity.mul(2)))

	return {
		diffuse,
		post: (color, { matcap }) => screenPost(uniforms, color, matcap),
	}
}
