import config from 'scenes/config.js'
import Experience from 'core/Experience.js'

export default class SceneManager {
	constructor() {
		this.experience = new Experience()
		this.debug = this.experience.debug
		this.scenes = config

		//lowercase the keys
		for (let key in this.scenes) {
			this.scenes[key.toLowerCase()] = this.scenes[key]
		}

		if (this.experience.canvas.attributes.getNamedItem('scene')) {
			this._sceneName = this.experience.canvas.attributes.getNamedItem('scene').value
		}

		const urlParams = new URLSearchParams(window.location.search)
		if (urlParams.has('scene')) {
			this.sceneName = urlParams.get('scene')
			console.log(this._sceneName)
		}

		// if scene name is not in the list, get the first one
		if (!this.scenes[this._sceneName]) {
			console.warn(`Scene ${this._sceneName} not found, using ${Object.keys(this.scenes)[0]} instead`)
			this.sceneName = Object.keys(this.scenes)[0]
		}

		if (this.debug.active) this.setDebug()

		// create scene
		return new this.scenes[this.sceneName]()
	}

	get sceneName() {
		return this._sceneName
	}

	set sceneName(value) {
		this._sceneName = value
	}

	setDebug() {
		this.debug.ui
			.addBlade({
				view: 'list',
				label: 'scene',
				options: Object.keys(this.scenes).map((key) => {
					return { text: key, value: key }
				}),
				value: this.sceneName,
			})
			.on('change', ({ value }) => {
				window.location.href = `?scene=${value}#debug`
			})
	}
}
