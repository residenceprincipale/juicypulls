import { Raycaster, Vector2 } from 'three'
import Experience from 'core/Experience.js'

export default class InteractionManager {
	constructor(camera) {
		this.camera = camera
		this.experience = new Experience()
		this.sizes = this.experience.sizes

		this.raycaster = new Raycaster()
		this.pointer = new Vector2()

		// Bind event handlers
		this.handleMouseMove = this.handleMouseMove.bind(this)
		this.handleClick = this.handleClick.bind(this)
		this.handleMouseDown = this.handleMouseDown.bind(this)
		this.handleMouseUp = this.handleMouseUp.bind(this)

		this.lastPosition = new Vector2()
		this.dragElement = null

		this.#setEvents()

		this.interactiveObjects = []
		this.intersectsObjects = []
		this.needsUpdate = false
	}

	handleMouseMove(event) {
		this.pointer.x = (event.clientX / this.sizes.width) * 2 - 1
		this.pointer.y = -(event.clientY / this.sizes.height) * 2 + 1
		this.needsUpdate = true
	}

	handleClick(event) {
		if (!this.intersectsObjects.length) return
		this.intersectsObjects.forEach((object) => {
			object.dispatchEvent({ type: 'click' })
		})
	}

	handleMouseDown(event) {
		if (!this.intersectsObjects.length) return
		this.intersectsObjects.forEach((object) => {
			if (object.isHovered) {
				this.dragElement = object
			}
		})
		this.lastPosition.copy(this.pointer)
	}

	handleMouseUp(event) {
		const distance = this.lastPosition.distanceTo(this.pointer)
		if (distance > 0.01) {
			//TODO: WIP
			// this.dragElement.dispatchEvent({ type: 'drag', distance, direction: this.pointer.clone().sub(lastPosition) })
			// this.intersectsObjects.forEach((object) => {
			// 	object.dispatchEvent({ type: 'drag', distance: lastPosition.distanceTo(this.pointer) })
			// })
		}
		this.lastPosition.set(0, 0)
	}

	#setEvents() {
		addEventListener('mousemove', this.handleMouseMove)
		addEventListener('click', this.handleClick)
		addEventListener('mousedown', this.handleMouseDown)
		addEventListener('mouseup', this.handleMouseUp)
	}

	addInteractiveObject(object) {
		if (!this.interactiveObjects.includes(object)) this.interactiveObjects.push(object)
	}

	update() {
		if (!this.needsUpdate) return
		this.intersectsObjects = []
		if (!this.interactiveObjects.length) return
		this.raycaster.setFromCamera(this.pointer, this.camera)

		const intersects = this.raycaster.intersectObjects(this.interactiveObjects)

		intersects.forEach((intersect) => {
			this.interactiveObjects.forEach((object) => {
				if (object.children.includes(intersect.object)) {
					object.dispatchEvent({ type: 'mouseover' })
					this.intersectsObjects.push(object)
					object.isHovered = true
				}
			})
			intersect.object.dispatchEvent({ type: 'mouseover' })
			this.intersectsObjects.push(intersect.object)
			intersect.object.isHovered = true
		})
	}

	dispose() {
		removeEventListener('mousemove', this.handleMouseMove)
		removeEventListener('click', this.handleClick)
		removeEventListener('mousedown', this.handleMouseDown)
		removeEventListener('mouseup', this.handleMouseUp)
		this.interactiveObjects = []
		this.intersectsObjects = []
	}
}
