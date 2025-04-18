import Experience from 'core/Experience.js'
import { CineonToneMapping, PCFSoftShadowMap, SRGBColorSpace, WebGLRenderer } from 'three'
import { EffectComposer, EffectPass, RenderPass, ScanlineEffect } from 'postprocessing'
import { VhsEffect } from 'webgl/effects/VHS/VhsEffect.js'
import { TransitionEffect } from 'webgl/effects/Transition/TransitionEffect.js'

export default class Renderer {
	constructor() {
		this.experience = new Experience()
		this.canvas = this.experience.canvas
		this.sizes = this.experience.sizes
		this.scene = this.experience.scene
		this.camera = this.experience.camera

		this.setInstance()
		this.createPostProcessing()
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
	}

	update() {
		if (this.composer) {
			this.composer.render()
		} else {
			this.instance.render(this.scene, this.camera.instance)
		}
	}

	createPostProcessing() {
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
	}
}
