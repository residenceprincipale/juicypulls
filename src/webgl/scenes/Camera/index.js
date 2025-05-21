import Experience from 'core/Experience.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import Environment from 'components/Environment.js'
import { AmbientLight, DirectionalLight } from 'three'
import Mob from 'components/Mob/Mob.js'

export default class Camera {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.scene.resources = new Resources(sources)
		this.scene.class = this

		// Wait for resources
		this.scene.resources.on('ready', () => {
			this.experience.renderer.createPostProcessing()
			this.environment = new Environment()
			this.mob = new Mob()

			this.scene.add(new DirectionalLight(0xffffff, 3))
			this.scene.add(new AmbientLight())
		})

		this.scene.addEventListener('display-snow', () => {
			this.experience.renderer.transitionPass.enabled = true
			console.log('display-snow')
		})
		this.scene.addEventListener('camera-change', (channel) => {
			this.environment.changeCamera(channel.message)
			this.experience.renderer.transitionPass.enabled = false
			console.log('camera-change')
		})

		// setInterval(() => {
		// 	this.snow.displaySnow(true)
		// 	setTimeout(() => {
		// 		this.snow.displaySnow(false)
		// 		this.environment.changeCamera(Math.floor(Math.random() * 10))
		// 	}, 1000)
		// }, 5000)
	}

	update() {
		if (this.snow) this.snow.update()
		if (this.environment) this.environment.update()
		if (this.mob) this.mob.update()
	}
}
