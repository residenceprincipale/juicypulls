import { Raycaster, Vector2 } from 'three'
import Experience from 'core/Experience.js'

/**
 * Pointer picking for registered objects: only the nearest visible hit gets the events.
 * Events dispatched on the registered object: 'mouseover', 'mouseout', 'click' (on pointer down, so touch works too).
 * Set `object.userData.interactive = false` to ignore an object temporarily.
 */
export default class InteractionManager {
	constructor(camera) {
		this.camera = camera
		this.experience = new Experience()
		this.sizes = this.experience.sizes
		this.canvas = this.experience.canvas

		this.raycaster = new Raycaster()
		this.pointer = new Vector2()

		this.interactiveObjects = []
		this.hoveredObject = null
		this.needsUpdate = false

		this.handlePointerMove = this.handlePointerMove.bind(this)
		this.handlePointerDown = this.handlePointerDown.bind(this)
		this._createEventListeners()
	}

	addInteractiveObject(object) {
		if (!this.interactiveObjects.includes(object)) this.interactiveObjects.push(object)
	}

	removeInteractiveObject(object) {
		this.interactiveObjects = this.interactiveObjects.filter((item) => item !== object)
		if (this.hoveredObject === object) this._setHovered(null)
	}

	handlePointerMove(event) {
		this._setPointer(event)
		this.needsUpdate = true
	}

	handlePointerDown(event) {
		if (event.button !== 0) return
		this._setPointer(event)
		this._pick()
		this.hoveredObject?.dispatchEvent({ type: 'click' })
	}

	update() {
		if (!this.needsUpdate) return
		this.needsUpdate = false
		this._pick()
	}

	dispose() {
		removeEventListener('pointermove', this.handlePointerMove)
		removeEventListener('pointerdown', this.handlePointerDown)
		this._setHovered(null)
		this.interactiveObjects = []
	}

	_createEventListeners() {
		addEventListener('pointermove', this.handlePointerMove)
		addEventListener('pointerdown', this.handlePointerDown)
	}

	_setPointer(event) {
		this.pointer.x = (event.clientX / this.sizes.width) * 2 - 1
		this.pointer.y = -(event.clientY / this.sizes.height) * 2 + 1
	}

	_pick() {
		const candidates = this.interactiveObjects.filter((object) => this._isActive(object))
		if (!candidates.length) return this._setHovered(null)

		this.raycaster.setFromCamera(this.pointer, this.camera)
		const hit = this.raycaster.intersectObjects(candidates, true).find(({ object }) => this._isVisible(object))
		this._setHovered(hit ? this._getRegisteredAncestor(hit.object) : null)
	}

	_setHovered(object) {
		if (object === this.hoveredObject) return
		this.hoveredObject?.dispatchEvent({ type: 'mouseout' })
		this.hoveredObject = object
		object?.dispatchEvent({ type: 'mouseover' })
		if (this.canvas) this.canvas.style.cursor = object ? 'pointer' : ''
	}

	_isActive(object) {
		return object.userData.interactive !== false && this._isVisible(object)
	}

	// Raycasting ignores `visible`, so hidden meshes and children of hidden groups are filtered here
	_isVisible(object) {
		for (let current = object; current; current = current.parent) if (!current.visible) return false
		return true
	}

	_getRegisteredAncestor(object) {
		for (let current = object; current; current = current.parent) {
			if (this.interactiveObjects.includes(current)) return current
		}
		return null
	}
}
