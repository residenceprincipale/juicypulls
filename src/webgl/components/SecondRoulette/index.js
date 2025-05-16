import Experience from 'core/Experience.js'
import rouletteVertexShader from './shadersRoulette/vertex.glsl';
import rouletteFragmentShader from './shadersRoulette/fragment.glsl';
import innerReflectionVertexShader from './shadersInnerReflection/vertex.glsl';
import innerReflectionFragmentShader from './shadersInnerReflection/fragment.glsl';
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial, DirectionalLightHelper } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'

import rouletteMaterialUniforms from './rouletteMaterialSettings.js'
import baseMaterialUniforms from './baseMaterialSettings.js'
import flapMaterialUniforms from './flapMaterialSettings.js'
import innerMaterialUniforms from './innerMaterialSettings.js'
import innerReflectionMaterialUniforms from './innerReflectionMaterialSettings.js'
export default class SecondRoulette {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		// this._resource = this._resources.casino
		this._resource = this._resources.items.secondRouletteModel

		// this._createLights()
		// this._createRouletteMaterial()
		this._createBaseMaterial()
		this._createFlapMaterial()
		// this._createInnerMaterial()
		// this._createInnerReflectionMaterial()
		this._createModel()

		this._createEventListeners()

		if (this._debug.active) this._createDebug()
	}

	/**
	 * Getters & Setters
	 */
	get model() {
		return this._model;
	}

	get rouletteMaterial() {
		return this._rouletteMaterial;
	}

	get wheels() {
		return this._wheels
	}

	/**
	 * Public
	 */

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resource.scene
		this._model.name = 'second roulette'
		this._scene.add(this._model)

		// Array to store wheel meshes
		this._wheels = [
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
		]
		this._leds = []

		this._model.traverse((child) => {
			if (!child.isMesh) return
			// if (child.name.includes('arrows')) {
			// 	child.material = this._arrowsMaterial
			// } else if (child.name.includes('attach')) {
			// 	child.material = this._attachMaterial
			// } else if (child.name.includes('base')) {
			child.material = this._baseMaterial;
			// } else if (child.name.includes('wheels')) {
			// 	child.material = this._rouletteMaterial
			// } else if (child.name.includes('VOLET')) {
			// 	child.material = this._voletMaterial
			// }

			if (child.name.includes('VOLET_HAUT')) {
				this._topFlap = child
				this._topFlap.material = this._flapMaterial
			} else if (child.name.includes('VOLET_BAS')) {
				this._bottomFlap = child
				this._bottomFlap.material = this._flapMaterial
			}
		})

		this._wheels.forEach((wheel, index) => {
			// wheel.rotation = this._rouletteMaterial.uniforms[`uRotation${index}`]
			// this._innerReflectionMaterial.uniforms[`uRotation${index}`] = wheel.rotation
			// wheel.rotation.value = (1.0 / this._segments) / 2
		})
	}

	_createBaseMaterial() {
		this._baseMaterial = new PhongCustomMaterial({
			// vertexShader: baseVertexShader,
			// fragmentShader: baseFragmentShader,
			uniforms: baseMaterialUniforms,
			name: 'Base Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_ALBEDO: true,
				USE_NORMAL: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
		});
	}

	_createFlapMaterial() {
		this._flapMaterial = new PhongCustomMaterial({
			// vertexShader: baseVertexShader,
			// fragmentShader: baseFragmentShader,
			uniforms: flapMaterialUniforms,
			name: 'Flap Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_ALBEDO: true,
				USE_NORMAL: true,
				USE_MATCAP: true,
			},
		});
	}

	_createRouletteMaterial() {
		this._rouletteMaterial = new PhongCustomMaterial({
			vertexShader: rouletteVertexShader,
			fragmentShader: rouletteFragmentShader,
			uniforms: rouletteMaterialUniforms,
			name: 'Roulette Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		});
	}

	_createInnerReflectionMaterial() {
		this._innerReflectionMaterial = new PhongCustomMaterial({
			vertexShader: innerReflectionVertexShader,
			fragmentShader: innerReflectionFragmentShader,
			// vertexShader: rouletteVertexShader,
			// fragmentShader: rouletteFragmentShader,
			uniforms: innerReflectionMaterialUniforms,
			name: 'Inner Reflection Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		});
	}

	_createInnerMaterial() {
		this._innerMaterial = new PhongCustomMaterial({
			// vertexShader: innerVertexShader,
			// fragmentShader: innerFragmentShader,
			uniforms: innerMaterialUniforms,
			name: 'Inner Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		});
	}

	/**
	 * Events
	 */
	_createEventListeners() {

	}

	/**
	 * Debug
	 */
	_createDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Second Roulette',
			expanded: true,
		})
		// addMaterialDebug(folder, this._rouletteMaterial)
		// addCustomMaterialDebug(folder, rouletteMaterialUniforms, this._resources, this._rouletteMaterial)
		addCustomMaterialDebug(folder, baseMaterialUniforms, this._resources, this._baseMaterial)
		addCustomMaterialDebug(folder, flapMaterialUniforms, this._resources, this._flapMaterial)
		// addCustomMaterialDebug(folder, innerMaterialUniforms, this._resources, this._innerMaterial)
		// addCustomMaterialDebug(folder, innerReflectionMaterialUniforms, this._resources, this._innerReflectionMaterial)
	}
}
