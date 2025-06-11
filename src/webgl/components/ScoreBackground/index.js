import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'

import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'

export default class ScoreBackground {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		// this._resource = this._resources.items.environmentModel

		this._createMaterial()
		this._createModel()
		this._createEventListeners()

		if (this._debug.active) this._createDebug()
		// this.spinAnimation()
	}

	/**
	 * Getters & Setters
	 */
	get model() {
		return this._model
	}

	get material() {
		return this._material
	}

	/**
	 * Public
	 */
	spinAnimation() {
		const timeline = gsap.timeline({ repeat: -1, defaults: { duration: 0.05 } })
		const steps = [
			{ uTop: 1, uBottomLeft: 0, uBottomRight: 0 },
			{ uTop: 0, uBottomLeft: 1, uBottomRight: 0 },
			{ uTop: 0, uBottomLeft: 0, uBottomRight: 1 },
			{ uTop: 0, uBottomLeft: 0, uBottomRight: 0 },
		]

		steps.forEach((step, i) => {
			timeline.to(this._material.uniforms.uTopOpacity, { value: step.uTop })
			timeline.to(this._material.uniforms.uBottomLeftOpacity, { value: step.uBottomLeft })
			timeline.to(this._material.uniforms.uBottomRightOpacity, { value: step.uBottomRight })
		})
	}

	showAnimation(immediate = false) {
		if (immediate) {
			this._material.uniforms.uAmbientOpacity.value = 1
			this._material.uniforms.uBarsOpacity.value = 1
			this._material.uniforms.uBottomLeftOpacity.value = 1
			this._material.uniforms.uBottomRightOpacity.value = 1
			this._material.uniforms.uTopOpacity.value = 1
			this._material.uniforms.uStrokeOpacity.value = 1
			this.idleAnimation()
			return
		}
		const timeline = gsap.timeline({
			defaults: { duration: 0.5 },
			onComplete: () => {
				this.idleAnimation()
			},
		})
		timeline.to(this._material.uniforms.uAmbientOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uBarsOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uBottomLeftOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uBottomRightOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uTopOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uStrokeOpacity, { value: 1 })
	}

	hideAnimation(immediate = false) {
		if (this._idleTween) {
			this._idleTween.kill()
			this._idleTween = null
		}
		if (immediate) {
			this._material.uniforms.uAmbientOpacity.value = 0
			this._material.uniforms.uBarsOpacity.value = 0
			this._material.uniforms.uBottomLeftOpacity.value = 0
			this._material.uniforms.uBottomRightOpacity.value = 0
			this._material.uniforms.uTopOpacity.value = 0
			this._material.uniforms.uStrokeOpacity.value = 0
			return
		}
		const timeline = gsap.timeline({
			defaults: { duration: 0.25 },
		})
		timeline.to(this._material.uniforms.uAmbientOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uBarsOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uBottomLeftOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uBottomRightOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uTopOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uStrokeOpacity, { value: 0 })
	}

	idleAnimation() {
		if (this._idleTween) this._idleTween.kill()
		this._idleTween = gsap.timeline({ repeat: -1, defaults: { duration: 0.5 } })
		this._idleTween.to(this._material.uniforms.uAmbientOpacity, { value: 0.75, yoyo: true, repeat: -1 })
		this._idleTween.to(this._material.uniforms.uBarsOpacity, { value: 0.75, yoyo: true, repeat: -1 }, '<')
		this._idleTween.to(this._material.uniforms.uBottomLeftOpacity, { value: 0.75, yoyo: true, repeat: -1 }, '<')
		this._idleTween.to(this._material.uniforms.uBottomRightOpacity, { value: 0.75, yoyo: true, repeat: -1 }, '<')
		this._idleTween.to(this._material.uniforms.uTopOpacity, { value: 0.75, yoyo: true, repeat: -1 }, '<')
	}

	/**
	 * Private
	 */

	_createModel() {
		const geometry = new PlaneGeometry(2, 2)
		this._model = new Mesh(geometry, this._material)
		this._model.name = 'score background'

		this._scene.add(this._model)
	}

	_createMaterial() {
		this._material = new ShaderMaterial({
			uniforms: {
				uAmbient: { value: this._resources.items.ambientTexture },
				uBars: { value: this._resources.items.barsTexture },
				uBottomLeft: { value: this._resources.items.bottomLeftTexture },
				uBottomRight: { value: this._resources.items.bottomRightTexture },
				uStroke: { value: this._resources.items.strokeTexture },
				uTop: { value: this._resources.items.topTexture },
				uAmbientOpacity: { value: 0 },
				uBarsOpacity: { value: 0 },
				uBottomLeftOpacity: { value: 0 },
				uBottomRightOpacity: { value: 0 },
				uStrokeOpacity: { value: 0 },
				uTopOpacity: { value: 0 },
			},
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
		})
	}

	_createEventListeners() {
		// Add event listeners here if needed
	}

	_createDebug() {
		if (!this._debug.active) return

		addObjectDebug(this._debug.ui, this._model)

		// Material debug
		// addCustomMaterialDebug(debugFolder, materialUniforms, this._resources, this._material)
	}
}
