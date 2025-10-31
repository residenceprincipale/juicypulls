import Experience from 'core/Experience.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import ScoreScreen from 'components/ScoreScreen/index.js'
import ScoreScreenManager from '@/webgl/modules/ScoreScreenManager'
import LightsMain from '@/webgl/components/LightsMain'

export default class LeftScreen {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)

		this._lights = new LightsMain()

		this._scene.resources.on('ready', () => {
			// this._experience.renderer.createPostProcessing()

			this.scoreScreen = new ScoreScreen()
			// this.scoreScreenManager = new ScoreScreenManager()
			// this.scoreScreenManager.screen = this.scoreScreen
		})
	}

	update() {
		if (this.scoreScreen) this.scoreScreen.update()
	}
}
