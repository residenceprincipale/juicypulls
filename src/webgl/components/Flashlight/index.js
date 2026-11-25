import Experience from 'core/Experience.js'
import rayNodes from './nodes/ray.js'
import {
	BoxGeometry,
	Mesh,
	Vector3,
	MeshBasicMaterial,
	Vector2,
	RepeatWrapping,
	MeshMatcapMaterial,
	Color,
	MeshStandardMaterial,
	DirectionalLight,
	MeshPhongMaterial,
	DirectionalLightHelper,
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import { PhongCustomMaterial, UnlitCustomMaterial } from '@/webgl/materials/PhongMaterial'

import sampleMaterialUniforms from './settings.js'
import rayMaterialUniforms from './raySettings.js'
import { ConeGeometry } from 'three'

export default class Flashlight {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.items.flashlightModel // Adjust this based on your resource name

		this._createMaterial()
		this._createRayMaterial()
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

	update(timeDate) {
		if (this._rayMaterial) this._rayMaterial.uniforms.uTime.value = timeDate.elapsedTime
	}

	/**
	 * Private
	 */

	_createModel() {
		this._model = this._resource.scene
		this._model.traverse((child) => {
			if (child.name === 'light') child.material = this._material
			if (child.name === 'ray') child.material = this._rayMaterial
		})
		this._model.name = 'flashlight component'
		this._model.position.set(1.53, -0.372, -0.067)
		this._model.rotation.set(3.142, -0.114, 3.142)
		this._model.scale.set(0.195, 0.195, 0.195)

		this._scene.add(this._model)
	}

	_createMaterial() {
		this._material = new PhongCustomMaterial({
			// vertexShader: sampleVertexShader,
			// fragmentShader: sampleFragmentShader,
			uniforms: sampleMaterialUniforms,
			name: 'Flashlight Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		})
	}

	_createRayMaterial() {
		this._rayMaterial = new UnlitCustomMaterial({
			uniforms: rayMaterialUniforms,
			name: 'FlashLight Ray Material',
			parameters: { transparent: true },
			nodes: rayNodes,
		})
	}

	_createEventListeners() {
		// Add event listeners here if needed
	}

	_createDebug() {
		if (!this._debug.active) return

		const debugFolder = this._debug.ui.addFolder({
			title: 'Flashlight Component',
			expanded: true,
		})

		// Material debug
		addCustomMaterialDebug(debugFolder, sampleMaterialUniforms, this._resources, this._material)
		addCustomMaterialDebug(debugFolder, rayMaterialUniforms, this._resources, this._rayMaterial)

		// Transform controls for the model
		addTransformDebug(debugFolder, this._model)
	}
}
