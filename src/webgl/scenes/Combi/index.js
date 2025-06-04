import Experience from 'core/Experience.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import CombiBackground from 'components/CombiBackground/index.js'

export default class Combi {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)

		this._scene.resources.on('ready', () => {
			this._score = new CombiBackground()
		})
	}
}
