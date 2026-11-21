import Experience from 'core/Experience.js'
import { CineonToneMapping, PCFSoftShadowMap, SRGBColorSpace, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { CustomUnrealBloomPass } from 'webgl/vendor/bloom/CustomUnrealBloomPass.js'
import PostProcessingSettings from 'core/PostProcessingSettings.js'

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
		this.instance = new WebGLRenderer({
			canvas: this.canvas,
			powerPreference: 'high-performance',
			alpha: true,
		})
		this.instance.outputColorSpace = SRGBColorSpace
		this.instance.toneMapping = CineonToneMapping
		this.instance.toneMappingExposure = 1.75
		this.instance.shadowMap.enabled = true
		this.instance.shadowMap.type = PCFSoftShadowMap
		this.instance.setClearColor('#211d20')
		this.instance.setSize(this.sizes.width, this.sizes.height)
		this.instance.setPixelRatio(this.sizes.pixelRatio)
	}

	resize() {
		this.instance.setSize(this.sizes.width, this.sizes.height)
		this.instance.setPixelRatio(this.sizes.pixelRatio)

		// Resize composer
		if (this.composer) {
			this.composer.setSize(this.sizes.width, this.sizes.height)
		}

		// Resize bloom pass
		if (this.bloomPass) {
			this.bloomPass.setSize(this.sizes.width, this.sizes.height)
		}
	}

	update() {
		// Use composer if available, otherwise render directly
		if (this.composer) {
			this.composer.render()
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
		// Clear any existing composer
		this.composer = null
		this.bloomPass = null

		const sceneName = this.getCurrentSceneName()
		const bloomSettings = this.postProcessingSettings.getBloomSettings(sceneName)

		// Only create post-processing if there are passes to use
		if (!bloomSettings || !bloomSettings.enabled) {
			console.log('No post-processing passes needed, using direct rendering')
			return
		}

		this.createBloomPostProcessing(bloomSettings)
	}

	createBloomPostProcessing(bloomSettings) {
		this.composer = new EffectComposer(this.instance)

		// Add render pass
		const renderPass = new RenderPass(this.scene, this.camera.instance)
		this.composer.addPass(renderPass)

		// Create and configure bloom pass
		this.bloomPass = new CustomUnrealBloomPass({
			type: bloomSettings.type,
			strength: bloomSettings.strength,
			radius: bloomSettings.radius,
			threshold: bloomSettings.threshold,
			smoothWidth: bloomSettings.smoothWidth,
			resolution: bloomSettings.resolution,
			camera: this.camera.instance,
			scene: this.scene,
			dpr: this.sizes.pixelRatio,
		})

		this.composer.addPass(this.bloomPass)

		// Set initial size
		this.composer.setSize(this.sizes.width, this.sizes.height)
		this.bloomPass.setSize(this.sizes.width, this.sizes.height)

		// Add debug controls if debug is active
		if (this.experience.debug.active) {
			this.addBloomDebugControls(bloomSettings)
		}
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
				if (this.bloomPass) {
					this.bloomPass.enabled = ev.value
				}
			})

		folder
			.addBinding(bloomSettings, 'strength', {
				label: 'Strength',
				min: 0,
				max: 3,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) {
					this.bloomPass.strength = ev.value
				}
			})

		folder
			.addBinding(bloomSettings, 'radius', {
				label: 'Radius',
				min: 0,
				max: 1,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) {
					this.bloomPass.radius = ev.value
				}
			})

		folder
			.addBinding(bloomSettings, 'threshold', {
				label: 'Threshold',
				min: 0,
				max: 2,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) {
					this.bloomPass.threshold = ev.value
				}
			})

		folder
			.addBinding(bloomSettings, 'smoothWidth', {
				label: 'Smooth Width',
				min: 0,
				max: 2,
				step: 0.01,
			})
			.on('change', (ev) => {
				if (this.bloomPass) {
					this.bloomPass.smoothWidth = ev.value
				}
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
		if (!this.composer) return

		this.composer.passes.forEach((pass) => {
			if (pass.camera) {
				pass.camera = this.camera.instance
			}
		})

		// Update bloom pass camera reference
		if (this.bloomPass && this.bloomPass._camera) {
			this.bloomPass._camera = this.camera.instance
		}

		console.log('Updated camera references in postprocessing')
	}

	dispose() {
		// Dispose composer
		if (this.composer) {
			this.composer.dispose()
			this.composer = null
		}

		// Dispose bloom pass
		if (this.bloomPass) {
			this.bloomPass.dispose()
			this.bloomPass = null
		}
	}
}
