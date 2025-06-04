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
				uAmbientOpacity: { value: 1 },
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
