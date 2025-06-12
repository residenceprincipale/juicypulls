import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'

import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'

export default class ScoreBackground {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		// this._resource = this._resources.items.environmentModel

		this._tint = new Color(0xffffff)
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

	get tint() {
		return this._tint
	}

	set tint(value) {
		this._tint = value
		gsap.to(this._material.uniforms.uTint.value, {
			r: value.r,
			g: value.g,
			b: value.b,
			duration: 0.5,
			ease: `rough({
				template:none.out,
				strength: 10,
				points:20,
				taper:none,
				randomize:true,
				clamp:false
				})`,
		})
	}
	//M0,0 C0,0 0.141,0 0.141,0 0.141,0 0.143,0.166 0.143,0.166 0.143,0.166 0.274,0 0.274,0 0.274,0 0.286,0.333 0.286,0.333 0.286,0.333 0.374,0.281 0.374,0.281 0.374,0.281 0.43,0.5 0.43,0.5 0.43,0.5 0.57,0.09 0.57,0.09 0.57,0.09 0.571,0.666 0.571,0.666 0.571,0.666 0.713,0.666 0.713,0.666 0.713,0.666 0.782,0.47 0.782,0.47 0.782,0.47 0.857,0.706 0.857,0.706 0.857,0.706 0.858,1 0.858,1 0.858,1 1,1 1,1

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

	showAnimation(duration = 0.25) {
		const timeline = gsap.timeline({
			defaults: { duration, ease: 'steps(3)' },
			onComplete: () => {
				this.idleAnimation()
			},
		})
		timeline.to(this._material.uniforms.uAmbientOpacity, { value: 1 }, '<')
		timeline.to(this._material.uniforms.uBottomRightOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uBottomLeftOpacity, { value: 1 }, '<')
		timeline.to(this._material.uniforms.uTopOpacity, { value: 1 }, '<')
		timeline.to(this._material.uniforms.uStrokeOpacity, { value: 1 }, '<')
		timeline.to(this._material.uniforms.uBarsOpacity, { value: 1 })
	}

	async hideAnimation(duration = 0.25) {
		if (this._idleTween) {
			this._idleTween.kill()
			this._idleTween = null
		}

		return new Promise((resolve) => {
			const timeline = gsap.timeline({
				defaults: { duration, ease: "rough({ template: 'none', strength: 2, points: 10 , randomize: true })" },
				onComplete: resolve,
			})
			timeline.to(this._material.uniforms.uAmbientOpacity, { value: 0 })
			timeline.to(this._material.uniforms.uBarsOpacity, { value: 0 }, '<')
			timeline.to(this._material.uniforms.uBottomLeftOpacity, { value: 0 })
			timeline.to(this._material.uniforms.uBottomRightOpacity, { value: 0 })
			timeline.to(this._material.uniforms.uTopOpacity, { value: 0 }, '<')
			timeline.to(this._material.uniforms.uStrokeOpacity, { value: 0 }, '<')
		})
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
				uTint: { value: this._tint },
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
