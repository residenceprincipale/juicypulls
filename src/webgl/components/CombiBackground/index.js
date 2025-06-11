import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'

import { Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'

export default class CombiBackground {
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

	showAnimation(immediate = false) {
		if (immediate) {
			this._material.uniforms.uAmbientOpacity.value = 1
			this._material.uniforms.uBarsOpacity.value = 1
			this._material.uniforms.uInnerOpacity.value = 1
			this._material.uniforms.uOuterOpacity.value = 1
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
		timeline.to(this._material.uniforms.uInnerOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uOuterOpacity, { value: 1 })
		timeline.to(this._material.uniforms.uStrokeOpacity, { value: 1 })
	}

	hideAnimation(immediate = false) {
		if (this._idleTimeline) {
			this._idleTimeline.kill()
			this._idleTimeline = null
		}
		if (immediate) {
			this._material.uniforms.uAmbientOpacity.value = 0
			this._material.uniforms.uBarsOpacity.value = 0
			this._material.uniforms.uInnerOpacity.value = 0
			this._material.uniforms.uOuterOpacity.value = 0
			this._material.uniforms.uStrokeOpacity.value = 0
			return
		}
		const timeline = gsap.timeline({ defaults: { duration: 0.25 } })
		timeline.to(this._material.uniforms.uAmbientOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uBarsOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uInnerOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uOuterOpacity, { value: 0 })
		timeline.to(this._material.uniforms.uStrokeOpacity, { value: 0 })
	}

	idleAnimation() {
		if (this._idleTimeline) {
			this._idleTimeline.kill()
		}
		const timeline = gsap.timeline({ repeat: -1, defaults: { duration: 0.5 } })
		this._idleTimeline = timeline
		const steps = [
			{ uAmbientOpacity: 1, uBarsOpacity: 1, uInnerOpacity: 1, uOuterOpacity: 1, uStrokeOpacity: 1 },
			{ uAmbientOpacity: 0.75, uBarsOpacity: 0.75, uInnerOpacity: 0.75, uOuterOpacity: 0.75, uStrokeOpacity: 0.75 },
			{ uAmbientOpacity: 1, uBarsOpacity: 1, uInnerOpacity: 1, uOuterOpacity: 1, uStrokeOpacity: 1 },
		]

		steps.forEach((step) => {
			timeline.to(this._material.uniforms.uAmbientOpacity, { value: step.uAmbientOpacity })
			timeline.to(this._material.uniforms.uBarsOpacity, { value: step.uBarsOpacity })
			timeline.to(this._material.uniforms.uInnerOpacity, { value: step.uInnerOpacity })
			timeline.to(this._material.uniforms.uOuterOpacity, { value: step.uOuterOpacity })
			timeline.to(this._material.uniforms.uStrokeOpacity, { value: step.uStrokeOpacity })
		})
	}

	/**
	 * Private
	 */

	_createModel() {
		const geometry = new PlaneGeometry(2, 2)
		this._model = new Mesh(geometry, this._material)
		this._model.name = 'combi background'

		this._scene.add(this._model)
	}

	_createMaterial() {
		this._material = new ShaderMaterial({
			uniforms: {
				uAmbient: { value: this._resources.items.ambientTexture },
				uAmbientOpacity: { value: 0 },
				uBars: { value: this._resources.items.barsTexture },
				uBarsOpacity: { value: 0 },
				uInner: { value: this._resources.items.innerTexture },
				uInnerOpacity: { value: 0 },
				uOuter: { value: this._resources.items.outerTexture },
				uOuterOpacity: { value: 0 },
				uStroke: { value: this._resources.items.strokeTexture },
				uStrokeOpacity: { value: 0 },
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
