import Experience from 'core/Experience.js'
import ScoreBackground from 'components/ScoreBackground/index.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'

export default class Score {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)

		this._scene.resources.on('ready', () => {
			this.score = new ScoreBackground()
		})
	}
}
