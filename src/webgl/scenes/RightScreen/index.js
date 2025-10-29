import Experience from 'core/Experience.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import CombinationsScreen from 'components/CombinationsScreen/index.js'
import CombinationsScreenManager from '@/webgl/modules/CombinationsScreenManager'
import LightsMain from '@/webgl/components/LightsMain'

export default class RightScreen {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)

		this._lights = new LightsMain()

		this._scene.resources.on('ready', () => {
			this._experience.renderer.createPostProcessing()

			this.combinationsScreen = new CombinationsScreen()
			this.combinationsScreenManager = new CombinationsScreenManager()
			this.combinationsScreenManager.screen = this.combinationsScreen
		})
	}

	update() {
		if (this.combinationsScreen) this.combinationsScreen.update()
	}
}
