import Experience from 'core/Experience.js'
import { AnimationMixer, Material, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import InputManager from 'utils/InputManager.js'
import addObjectDebug from 'utils/addObjectDebug.js'
import AnimationController from 'utils/AnimationController.js'

export default class Mob {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.resources = this.scene.resources
		this.debug = this.experience.debug
		this.time = this.experience.time

		// Resource
		this.resource = this.resources.items.mobModel

		this.setModel()
		const plane = new Mesh(new PlaneGeometry(), new MeshBasicMaterial())
		plane.rotation.x = Math.PI * 0.5
		this.scene.add(plane)

		this.animation = new AnimationController({
			animations: this.resource.animations,
			model: this.resource.scene,
		})

		if (this.debug.active) this.setDebug()
	}

	setModel() {
		this.model = this.resource.scene
		this.model.name = 'mob'
		this.scene.add(this.model)
	}

	update() {
		this.animation.update(this.time.delta * 0.001)
	}

	setDebug() {
		const debugFolder = addObjectDebug(this.debug.ui, this.model)
		this.animation.setDebug(debugFolder)
	}
}
