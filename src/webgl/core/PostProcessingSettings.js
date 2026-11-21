export default class PostProcessingSettings {
	constructor() {
		this.sceneSettings = {
			main: {
				// SELECTIVE: only meshes with `userData.renderBloom = true` bloom (threshold and smoothWidth unused)
				bloom: {
					enabled: true,
					type: 'SELECTIVE', // 'LUMINOSITY', 'SELECTIVE', 'TEXTURE'
					strength: 1.5,
					radius: 0.59,
					threshold: 0,
					smoothWidth: 0.67,
					resolution: { x: 256, y: 256 },
				},
			},
		}
	}

	getSettings(sceneName, effectName) {
		const scene = this.sceneSettings[sceneName]
		if (!scene) return null

		return scene[effectName] || null
	}

	getBloomSettings(sceneName) {
		return this.getSettings(sceneName, 'bloom')
	}
}
