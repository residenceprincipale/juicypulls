import { BufferAttribute, CanvasTexture, Mesh, MeshBasicMaterial, SRGBColorSpace, Vector3 } from 'three'
import gsap from 'gsap'

const FONT_FAMILY = '"League Gothic", "Arial Narrow", sans-serif'
const TEXT_COLOR = '#ffffff'
const LINE_HEIGHT = 1.05
const CANVAS_WIDTH = 1024
// Default distance of the text layer in front of the glass, in meters
const SURFACE_OFFSET = 0.003

/**
 * Text layer of a machine screen: a canvas texture on a copy of the screen glass, just in front of it.
 * It uses a basic material, so it needs no lighting and shows the canvas colors as drawn.
 * The canvas covers the glass's bounding rectangle, with its aspect ratio.
 */
export default class ScreenText {
	/**
	 * @param {{ screenMesh: Mesh, camera: Camera, offset?: number, renderOrder?: number }} options
	 * `offset` must clear any mesh drawn over the glass; layers stacked on one screen need increasing offsets and render orders.
	 */
	constructor({ screenMesh, camera, offset = SURFACE_OFFSET, renderOrder = 10 }) {
		this._screenMesh = screenMesh
		this._camera = camera
		this._offset = offset
		this._renderOrder = renderOrder

		this._createCanvas()
		this._createMesh()
		this._loadFont()
	}

	/**
	 * Getters & Setters
	 */
	get width() {
		return this._canvas.width
	}

	get height() {
		return this._canvas.height
	}

	get material() {
		return this._material
	}

	get mesh() {
		return this._mesh
	}

	/**
	 * Public
	 */
	// Redraws the whole layer: `drawFn(screenText)` calls the draw helpers below
	draw(drawFn) {
		this._lastDraw = drawFn
		this._context.clearRect(0, 0, this.width, this.height)
		drawFn(this)
		this._texture.needsUpdate = true
	}

	clear() {
		this.draw(() => {})
		this._lastDraw = null
	}

	// Fractions of the glass [x, y, width, height] → pixel rect
	toPixels([x, y, width, height]) {
		return { x: x * this.width, y: y * this.height, width: width * this.width, height: height * this.height }
	}

	// Flickers the layer in or out like the screens (returns the tween)
	fade(opacity, { duration = 0.5, delay = 0 } = {}) {
		this._fadeTween?.kill()
		this._fadeTween = gsap.to(this._material, {
			opacity,
			duration,
			delay,
			ease: "rough({ template: 'none', strength: 2, points: 10, randomize: true })",
		})
		return this._fadeTween
	}

	// Polygon from [x, y] fractions of the glass
	fillPolygon(points, color = '#000000') {
		this._context.fillStyle = color
		this._context.beginPath()
		points.forEach(([x, y], index) => this._context[index ? 'lineTo' : 'moveTo'](x * this.width, y * this.height))
		this._context.closePath()
		this._context.fill()
	}

	fillRect({ x, y, width, height }, color = '#000000') {
		this._context.fillStyle = color
		this._context.fillRect(x, y, width, height)
	}

	/**
	 * Writes a message centered in `rect` (pixels), at the largest size that fits.
	 * Lines split on '\n' or '<br>'. `modifier` colors keywords: [{ text, color }].
	 */
	drawMessage({ message, modifier = [], rect, maxFontSize = rect.height }) {
		const lines = String(message)
			.split(/\s*<br\s*\/?>\s*|\n/i)
			.map((line) => line.trim().toUpperCase())
			.filter(Boolean)
		if (!lines.length) return

		const context = this._context
		let fontSize = Math.min(maxFontSize, rect.height / (lines.length * LINE_HEIGHT))
		context.font = `${fontSize}px ${FONT_FAMILY}`
		const widest = Math.max(...lines.map((line) => context.measureText(line).width))
		fontSize *= Math.min(1, (rect.width * 0.92) / widest)

		const lineHeight = fontSize * LINE_HEIGHT
		const top = rect.y + rect.height / 2 - (lines.length * lineHeight) / 2 + lineHeight / 2
		lines.forEach((line, index) => {
			this._drawSegments(
				this._splitModifiers(line, modifier),
				rect.x + rect.width / 2,
				top + index * lineHeight,
				fontSize,
			)
		})
	}

	// Single line of text centered on (x, y), optionally rotated (radians)
	drawLabel({ text, x, y, fontSize, color = TEXT_COLOR, rotation = 0 }) {
		const context = this._context
		context.save()
		context.translate(x, y)
		context.rotate(rotation)
		this._drawSegments([{ text: String(text).toUpperCase(), color }], 0, 0, fontSize)
		context.restore()
	}

	dispose() {
		this._fadeTween?.kill()
		this._mesh.removeFromParent()
		this._geometry.dispose()
		this._material.dispose()
		this._texture.dispose()
	}

	/**
	 * Private
	 */
	_createCanvas() {
		this._geometry = this._createPlanarGeometry()

		this._canvas = document.createElement('canvas')
		this._canvas.width = CANVAS_WIDTH
		this._canvas.height = Math.round(CANVAS_WIDTH / this._aspect)
		this._context = this._canvas.getContext('2d')

		this._texture = new CanvasTexture(this._canvas)
		this._texture.colorSpace = SRGBColorSpace
		this._texture.flipY = false // v = 0 is the top row of the canvas
		this._texture.anisotropy = 4
	}

	/**
	 * Copy of the glass with planar UVs: the canvas spans its bounding rectangle as seen from the camera.
	 * The glass UVs can't be used: they're split into islands (the combinations screen side slots have their own).
	 */
	_createPlanarGeometry() {
		const geometry = this._screenMesh.geometry.clone()
		geometry.computeBoundingBox()
		const { min, max } = geometry.boundingBox
		const size = max.clone().sub(min)
		const center = geometry.boundingBox.getCenter(new Vector3())

		// The glass is flat: its two largest local axes span it. Find which one runs left-right on screen.
		this._screenMesh.updateWorldMatrix(true, false)
		const toNdc = (point) => point.applyMatrix4(this._screenMesh.matrixWorld).project(this._camera)
		const centerNdc = toNdc(center.clone())
		const [first, second] = [0, 1, 2]
			.sort((a, b) => size.getComponent(b) - size.getComponent(a))
			.slice(0, 2)
			.map((axis) => {
				const edge = center.clone().setComponent(axis, max.getComponent(axis))
				return { axis, screen: toNdc(edge).sub(centerNdc) }
			})
		const horizontal = Math.abs(first.screen.x) > Math.abs(second.screen.x) ? first : second
		const vertical = horizontal === first ? second : first

		const positions = geometry.attributes.position
		const uvs = new Float32Array(positions.count * 2)
		const normalize = (index, { axis }) =>
			(positions.getComponent(index, axis) - min.getComponent(axis)) / size.getComponent(axis)
		for (let i = 0; i < positions.count; i++) {
			const u = normalize(i, horizontal)
			const v = normalize(i, vertical)
			uvs[i * 2] = horizontal.screen.x >= 0 ? u : 1 - u
			uvs[i * 2 + 1] = vertical.screen.y >= 0 ? 1 - v : v
		}
		geometry.setAttribute('uv', new BufferAttribute(uvs, 2))

		this._aspect = size.getComponent(horizontal.axis) / size.getComponent(vertical.axis)
		return geometry
	}

	_createMesh() {
		this._material = new MeshBasicMaterial({
			map: this._texture,
			transparent: true,
			depthWrite: false,
			toneMapped: false,
		})

		this._mesh = new Mesh(this._geometry, this._material)
		this._mesh.name = `${this._screenMesh.name} text`
		this._mesh.renderOrder = this._renderOrder

		// Push the layer off the glass, toward the camera
		const normal = this._getAverageNormal()
		const worldNormal = normal.clone().transformDirection(this._screenMesh.matrixWorld)
		const toCamera = this._camera.position.clone().sub(this._screenMesh.getWorldPosition(new Vector3()))
		if (worldNormal.dot(toCamera) < 0) normal.negate()
		const worldScale = this._screenMesh.getWorldScale(new Vector3()).x
		this._mesh.position.copy(normal).multiplyScalar(this._offset / worldScale)

		this._screenMesh.add(this._mesh)
	}

	_getAverageNormal() {
		const normals = this._screenMesh.geometry.attributes.normal.array
		const normal = new Vector3()
		for (let i = 0; i < normals.length; i += 3)
			((normal.x += normals[i]), (normal.y += normals[i + 1]), (normal.z += normals[i + 2]))
		return normal.normalize()
	}

	// Redraws once League Gothic is loaded (it's declared in pages/style.css)
	_loadFont() {
		document.fonts?.load(`100px ${FONT_FAMILY}`).then(() => {
			if (this._lastDraw) this.draw(this._lastDraw)
		})
	}

	_splitModifiers(line, modifier) {
		let segments = [{ text: line, color: TEXT_COLOR }]
		modifier.forEach(({ text, color }) => {
			const keyword = text.toUpperCase()
			segments = segments.flatMap((segment) => {
				if (segment.color !== TEXT_COLOR || !segment.text.includes(keyword)) return [segment]
				return segment.text
					.split(keyword)
					.flatMap((part, index) => (index === 0 ? [part] : [{ keyword }, part]))
					.filter((part) => part !== '')
					.map((part) =>
						part.keyword ? { text: keyword, color: color || TEXT_COLOR } : { text: part, color: TEXT_COLOR },
					)
			})
		})
		return segments
	}

	_drawSegments(segments, centerX, centerY, fontSize) {
		const context = this._context
		context.font = `${fontSize}px ${FONT_FAMILY}`
		context.textBaseline = 'middle'
		context.textAlign = 'left'
		context.shadowBlur = fontSize * 0.2

		const widths = segments.map(({ text }) => context.measureText(text).width)
		let x = centerX - widths.reduce((sum, width) => sum + width, 0) / 2
		segments.forEach(({ text, color }, index) => {
			context.fillStyle = color
			context.shadowColor = color
			context.fillText(text, x, centerY)
			x += widths[index]
		})
		context.shadowBlur = 0
	}
}
