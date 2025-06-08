import Experience from 'core/Experience.js'
import { CineonToneMapping, PCFSoftShadowMap, SRGBColorSpace, WebGLRenderer } from 'three'
import { EffectComposer, EffectPass, RenderPass, ScanlineEffect } from 'postprocessing'
import { EffectComposer as ThreeEffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass as ThreeRenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { VhsEffect } from 'webgl/effects/VHS/VhsEffect.js'
import { TransitionEffect } from 'webgl/effects/Transition/TransitionEffect.js'
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

		// Resize active composer
		if (this.activeComposer) {
			this.activeComposer.setSize(this.sizes.width, this.sizes.height)
		}

		// Resize bloom pass
		if (this.bloomPass) {
			this.bloomPass.setSize(this.sizes.width, this.sizes.height)
		}
	}

	update() {
		// Use composer if available, otherwise render directly
		if (this.activeComposer) {
			this.activeComposer.render()
		} else {
			this.instance.render(this.scene, this.camera.instance)
		}
	}

	hasPostProcessingPasses() {
		const sceneName = this.getCurrentSceneName()
		const sceneSettings = this.postProcessingSettings.sceneSettings[sceneName?.toLowerCase()]

		if (!sceneSettings) return false

		// Check if any effect is enabled
		for (const effectName in sceneSettings) {
			const effect = sceneSettings[effectName]
			if (effect && effect.enabled) {
				return true
			}
		}

		return false
	}

	getCurrentSceneName() {
		// Get the current scene name from the scene manager
		if (this.experience.sceneManager?.sceneName) {
			return this.experience.sceneManager.sceneName
		}
		return 'main' // Default fallback
	}

	createPostProcessing() {
		// Clear any existing composers
		this.activeComposer = null
		this.composer = null
		this.threeComposer = null
		this.bloomPass = null

		// Only create post-processing if there are passes to use
		if (!this.hasPostProcessingPasses()) {
			console.log('No post-processing passes needed, using direct rendering')
			return
		}

		const sceneName = this.getCurrentSceneName()
		const bloomSettings = this.postProcessingSettings.getBloomSettings(sceneName)

		if (bloomSettings && bloomSettings.enabled) {
			this.createBloomPostProcessing(bloomSettings)
		} else {
			// Future: Add other post-processing effects here
			// For now, if no bloom but has other effects, we could create standard post-processing
			console.log('No recognized post-processing effects enabled')
		}
	}

	createBloomPostProcessing(bloomSettings) {
		// Create Three.js EffectComposer for bloom
		this.threeComposer = new ThreeEffectComposer(this.instance)

		// Add render pass
		const renderPass = new ThreeRenderPass(this.scene, this.camera.instance)
		this.threeComposer.addPass(renderPass)

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
			dpr: this.sizes.pixelRatio
		})

		this.threeComposer.addPass(this.bloomPass)

		// Set as active composer
		this.activeComposer = this.threeComposer

		// Set initial size
		this.activeComposer.setSize(this.sizes.width, this.sizes.height)
		this.bloomPass.setSize(this.sizes.width, this.sizes.height)

		console.log('Bloom post-processing initialized')

		// Add debug controls if debug is active
		if (this.experience.debug.active) {
			this.addBloomDebugControls(bloomSettings)
		}
	}

	createStandardPostProcessing() {
		// Create postprocessing EffectComposer for other effects
		this.composer = new EffectComposer(this.instance)
		this.composer.addPass(new RenderPass(this.scene, this.camera.instance))

		this.transitionEffect = new TransitionEffect()
		this.transitionPass = new EffectPass(this.camera.instance, this.transitionEffect)
		this.transitionPass.enabled = false
		this.composer.addPass(this.transitionPass)

		setInterval(() => {
			if (this.transitionPass.enabled) return
			this.transitionPass.enabled = true
			setTimeout(() => {
				this.transitionPass.enabled = false
			}, 200)
		}, 3000)

		this.composer.addPass(new EffectPass(this.camera.instance, new VhsEffect()))

		// Set as active composer
		this.activeComposer = this.composer

		console.log('Standard post-processing initialized')
	}

	addBloomDebugControls(bloomSettings) {
		const folder = this.experience.debug.ui.addFolder({
			title: 'Post Processing - Bloom',
			expanded: false,
		})

		folder.addBinding(bloomSettings, 'enabled', {
			label: 'Enabled'
		}).on('change', (ev) => {
			if (this.bloomPass) {
				this.bloomPass.enabled = ev.value
			}
			// Recreate post-processing if bloom is toggled
			this.createPostProcessing()
		})

		folder.addBinding(bloomSettings, 'strength', {
			label: 'Strength',
			min: 0,
			max: 3,
			step: 0.01
		}).on('change', (ev) => {
			if (this.bloomPass) {
				this.bloomPass.strength = ev.value
			}
		})

		folder.addBinding(bloomSettings, 'radius', {
			label: 'Radius',
			min: 0,
			max: 1,
			step: 0.01
		}).on('change', (ev) => {
			if (this.bloomPass) {
				this.bloomPass.radius = ev.value
			}
		})

		folder.addBinding(bloomSettings, 'threshold', {
			label: 'Threshold',
			min: 0,
			max: 2,
			step: 0.01
		}).on('change', (ev) => {
			if (this.bloomPass) {
				this.bloomPass.threshold = ev.value
			}
		})

		folder.addBinding(bloomSettings, 'smoothWidth', {
			label: 'Smooth Width',
			min: 0,
			max: 2,
			step: 0.01
		}).on('change', (ev) => {
			if (this.bloomPass) {
				this.bloomPass.smoothWidth = ev.value
			}
		})

		// Add copy settings button
		folder.addButton({
			title: 'Copy Settings',
		}).on('click', () => {
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
		navigator.clipboard.writeText(settingsCode).then(() => {
			console.log('✅ Bloom settings copied to clipboard!')
			console.log(`📋 Settings for '${sceneName}' scene:`)
			console.log(settingsCode)

			// Show temporary notification if debug UI supports it
			this.showCopyNotification('Bloom settings copied to clipboard!')
		}).catch(err => {
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

	// Method to update bloom settings at runtime
	updateBloomSettings(property, value) {
		const sceneName = this.getCurrentSceneName()
		if (this.postProcessingSettings.updateBloomSetting(sceneName, property, value)) {
			if (this.bloomPass && this.bloomPass[property] !== undefined) {
				this.bloomPass[property] = value
			}
		}
	}

	// Method to toggle bloom
	toggleBloom(enabled) {
		const sceneName = this.getCurrentSceneName()
		this.postProcessingSettings.updateBloomSetting(sceneName, 'enabled', enabled)
		if (this.bloomPass) {
			this.bloomPass.enabled = enabled
		}
		// Recreate post-processing to handle composer changes
		this.createPostProcessing()
	}

	// Method to update camera references in postprocessing
	updateCameraReferences() {
		if (!this.activeComposer) return

		// Update Three.js composer camera references
		if (this.threeComposer && this.threeComposer.passes) {
			this.threeComposer.passes.forEach(pass => {
				if (pass.camera) {
					pass.camera = this.camera.instance
				}
			})
		}

		// Update postprocessing composer camera references
		if (this.composer && this.composer.passes) {
			this.composer.passes.forEach(pass => {
				if (pass.camera) {
					pass.camera = this.camera.instance
				}
			})
		}

		// Update bloom pass camera reference
		if (this.bloomPass && this.bloomPass._camera) {
			this.bloomPass._camera = this.camera.instance
		}

		// Update transition pass camera reference
		if (this.transitionPass && this.transitionPass.camera) {
			this.transitionPass.camera = this.camera.instance
		}

		console.log('Updated camera references in postprocessing')
	}
}
