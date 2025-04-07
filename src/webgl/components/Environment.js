import Experience from 'core/Experience.js'

export default class Environment {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.resources = this.scene.resources
		this.debug = this.experience.debug

		this.glb = this.resources.items.environmentModel
		this._createModel()
	}

	_createModel() {
		this.scene.add(this.glb.scene)
		// this.changeCamera(0)
	}

	changeCamera(index) {
		if (this.glb.cameras[index]) {
			this.experience.camera.instance = this.glb.cameras[index]
			this.experience.camera.resize()
		} else {
			console.warn(`Camera with index ${index} not found`)
			this.scene.dispatchEvent({ type: 'display-snow' })
			dispatchEvent(new CustomEvent('no-signal', { detail: { visible: true } }))
		}
	}
}
