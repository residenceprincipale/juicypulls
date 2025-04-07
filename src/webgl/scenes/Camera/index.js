import Experience from 'core/Experience.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import Environment from 'components/Environment.js'
import { DirectionalLight } from 'three'
import Snow from 'components/Snow/index.js'
import Nav from 'components/Nav/index.js'

export default class Camera {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.scene.resources = new Resources(sources)
		this.scene.class = this

		// Wait for resources
		this.scene.resources.on('ready', () => {
			this.snow = new Snow()
			this.environment = new Environment()
			this.nav = new Nav()

			this.scene.add(new DirectionalLight())
		})
		this.scene.addEventListener('display-snow', () => {
			this.snow.displaySnow(true)
		})
		this.scene.addEventListener('camera-change', (channel) => {
			this.snow.displaySnow(false)
			this.environment.changeCamera(channel.message)
		})
	}

	update() {
		if (this.snow) this.snow.update()
		if (this.nav) this.nav.update()
	}
}
