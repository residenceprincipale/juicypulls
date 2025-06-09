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
		this.spinAnimation()
		setInterval(() => {
			this.spinAnimation()
		}, 3000)
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
		const spinTimeline = gsap.timeline({
			defaults: {
				duration: 1,
			},
		})

		spinTimeline.to(
			this._material.uniforms.uTopOpacity,
			{
				value: 1,
			},
			0,
		)
		spinTimeline.to(
			this._material.uniforms.uBottomLeftOpacity,
			{
				value: 0,
			},
			0,
		)
		spinTimeline.to(
			this._material.uniforms.uBottomRightOpacity,
			{
				value: 0,
			},
			0,
		)

		spinTimeline.to(
			this._material.uniforms.uTopOpacity,
			{
				value: 0,
			},
			1,
		)
		spinTimeline.to(
			this._material.uniforms.uBottomLeftOpacity,
			{
				value: 1,
			},
			1,
		)
		spinTimeline.to(
			this._material.uniforms.uBottomRightOpacity,
			{
				value: 0,
			},
			1,
		)

		spinTimeline.to(
			this._material.uniforms.uTopOpacity,
			{
				value: 0,
			},
			2,
		)
		spinTimeline.to(
			this._material.uniforms.uBottomLeftOpacity,
			{
				value: 0,
			},
			2,
		)
		spinTimeline.to(
			this._material.uniforms.uBottomRightOpacity,
			{
				value: 1,
			},
			2,
		)
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
				uAmbientOpacity: { value: 1 },
				uBarsOpacity: { value: 0 },
				uBottomLeftOpacity: { value: 0 },
				uBottomRightOpacity: { value: 0 },
				uStrokeOpacity: { value: 1 },
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
