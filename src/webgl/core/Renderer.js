import Experience from 'core/Experience.js'
import { CineonToneMapping, PostProcessing, SRGBColorSpace, WebGPURenderer } from 'three/webgpu'
import { float, mrt, output, pass, uniform } from 'three/tsl'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import PostProcessingSettings from 'core/PostProcessingSettings.js'

/**
 * WebGPURenderer (falls back to WebGL2 where WebGPU isn't available; `?force-webgl` forces the fallback).
 * Selective bloom: the scene pass writes a `bloomIntensity` target next to the color, 0 by default and 1 for
 * meshes with `userData.renderBloom = true` (see `#syncBloomFlags`). The bloom only blurs color × intensity.
 */
export default class Renderer {
	constructor() {
		this.experience = new Experience()
		this.canvas = this.experience.canvas
		this.sizes = this.experience.sizes
		this.scene = this.experience.scene
		this.camera = this.experience.camera
		this.postProcessingSettings = new PostProcessingSettings()

		this.setInstance()
	}

	setInstance() {
		this.instance = new WebGPURenderer({
			canvas: this.canvas,
			powerPreference: 'high-performance',
			alpha: true,
			forceWebGL: new URLSearchParams(location.search).has('force-webgl'),
		})
		this.instance.outputColorSpace = SRGBColorSpace
		this.instance.toneMapping = CineonToneMapping
		this.instance.toneMappingExposure = 1.75
		this.instance.setClearColor('#211d20')
		this.instance.setSize(this.sizes.width, this.sizes.height)
		this.instance.setPixelRatio(this.sizes.pixelRatio)

		// The renderer initializes asynchronously (WebGPU device); frames are skipped until it's ready
		this.isReady = false
		this.instance.init().then(() => {
			this.isReady = true
			console.info(`Renderer: ${this.instance.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback'}`)
		})
	}

	resize() {
		this.instance.setSize(this.sizes.width, this.sizes.height)
		this.instance.setPixelRatio(this.sizes.pixelRatio)
	}

	update() {
		if (!this.isReady) return

		if (this.postProcessing) {
			this.#syncBloomFlags()
			this.postProcessing.render()
		} else {
			this.instance.render(this.scene, this.camera.instance)
		}
	}

	getCurrentSceneName() {
		// Get the current scene name from the scene manager
		const urlParams = new URLSearchParams(window.location.search)
		if (urlParams.has('scene')) {
			return urlParams.get('scene')
		} else return 'main'
	}

	createPostProcessing() {
		this.postProcessing = null
		this.bloomPass = null

		const sceneName = this.getCurrentSceneName()
		const bloomSettings = this.postProcessingSettings.getBloomSettings(sceneName)

		if (!bloomSettings || !bloomSettings.enabled) {
			console.log('No post-processing passes needed, using direct rendering')
			return
		}

		this.createBloomPostProcessing(bloomSettings)
	}

	createBloomPostProcessing(bloomSettings) {
		this.scenePass = pass(this.scene, this.camera.instance)
		this.scenePass.setMRT(mrt({ output, bloomIntensity: float(0) }))

		const sceneColor = this.scenePass.getTextureNode('output')
		const bloomIntensity = this.scenePass.getTextureNode('bloomIntensity')

		this.bloomPass = bloom(
			sceneColor.mul(bloomIntensity),
			bloomSettings.strength,
			bloomSettings.radius,
			bloomSettings.threshold,
		)
		this.sceneColor = sceneColor

		this.postProcessing = new PostProcessing(this.instance)
		this.#setBloomEnabled(true)

		if (this.experience.debug.active) {
			this.addBloomDebugControls(bloomSettings)
		}
	}

	#setBloomEnabled(value) {
		this.postProcessing.outputNode = value ? this.sceneColor.add(this.bloomPass) : this.sceneColor
		this.postProcessing.needsUpdate = true
	}

	// Gives the materials of flagged meshes a bloom intensity output, driven by the flag (no recompile on toggle)
	#syncBloomFlags() {
		this.scene.traverse((object) => {
			if (object.userData.renderBloom === undefined || !object.material) return

			const material = object.material
			if (!material.userData.bloomIntensity) {
				material.userData.bloomIntensity = uniform(0)
				material.mrtNode = mrt({ bloomIntensity: material.userData.bloomIntensity })
				material.needsUpdate = true
			}
			material.userData.bloomIntensity.value = object.userData.renderBloom && object.visible ? 1 : 0
		})
	}

	addBloomDebugControls(bloomSettings) {
		const folder = this.experience.debug.ui.addFolder({
			title: 'Post Processing - Bloom',
			expanded: false,
		})

		folder
			.addBinding(bloomSettings, 'enabled', {
				label: 'Enabled',
			})
			.on('change', (ev) => {
				if (this.bloomPass) this.#setBloomEnabled(ev.value)
			})

		folder
			.addBinding(bloomSettings, 'strength', {
				label: 'Strength',
				min: 0,
				max: 3,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) this.bloomPass.strength.value = ev.value
			})

		folder
			.addBinding(bloomSettings, 'radius', {
				label: 'Radius',
				min: 0,
				max: 1,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) this.bloomPass.radius.value = ev.value
			})

		folder
			.addBinding(bloomSettings, 'threshold', {
				label: 'Threshold',
				min: 0,
				max: 2,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) this.bloomPass.threshold.value = ev.value
			})

		folder
			.addBinding(bloomSettings, 'smoothWidth', {
				label: 'Smooth Width',
				min: 0,
				max: 2,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) this.bloomPass.smoothWidth.value = ev.value
			})

		// Add copy settings button
		folder
			.addButton({
				title: 'Copy Settings',
			})
			.on('click', () => {
				this.copyBloomSettings(bloomSettings)
			})
	}

	copyBloomSettings(bloomSettings) {
		const sceneName = this.getCurrentSceneName()

		// Format the settings as code that can be pasted into PostProcessingSettings.js
		const settingsCode = `bloom: {
	enabled: ${bloomSettings.enabled},
	type: '${bloomSettings.type}', // 'LUMINOSITY', 'SELECTIVE', 'TEXTURE'
	strength: ${bloomSettings.strength},
	radius: ${bloomSettings.radius},
	threshold: ${bloomSettings.threshold},
	smoothWidth: ${bloomSettings.smoothWidth},
	resolution: { x: ${bloomSettings.resolution.x}, y: ${bloomSettings.resolution.y} },
}`

		// Copy to clipboard
		navigator.clipboard
			.writeText(settingsCode)
			.then(() => {
				console.log('✅ Bloom settings copied to clipboard!')
				console.log(`📋 Settings for '${sceneName}' scene:`)
				console.log(settingsCode)

				// Show temporary notification if debug UI supports it
				this.showCopyNotification('Bloom settings copied to clipboard!')
			})
			.catch((err) => {
				console.error('❌ Failed to copy to clipboard:', err)
			})
	}

	showCopyNotification(message) {
		// Try to show a temporary notification in the debug UI
		try {
			// Create a temporary blade that auto-removes itself
			const notification = this.experience.debug.ui.addBlade({
				view: 'text',
				label: '✅ Copied!',
				value: 'Settings copied to clipboard',
				disabled: true,
			})

			// Remove after 3 seconds
			setTimeout(() => {
				if (notification && notification.dispose) {
					notification.dispose()
				}
			}, 3000)
		} catch (e) {
			// If UI notification fails, just log to console
			console.log('✅', message)
		}
	}

	// Method to update camera references in postprocessing
	updateCameraReferences() {
		if (this.scenePass) this.scenePass.camera = this.camera.instance
	}

	dispose() {
		this.postProcessing?.dispose()
		this.postProcessing = null
		this.bloomPass?.dispose()
		this.bloomPass = null
		this.instance.dispose()
	}
}
