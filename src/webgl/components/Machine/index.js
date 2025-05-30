import Experience from 'core/Experience.js'
import rouletteVertexShader from './shadersRoulette/vertex.glsl'
import rouletteFragmentShader from './shadersRoulette/fragment.glsl'
import innerReflectionVertexShader from './shadersInnerReflection/vertex.glsl'
import innerReflectionFragmentShader from './shadersInnerReflection/fragment.glsl'
import {
	BoxGeometry,
	Mesh,
	ShaderMaterial,
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
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'

import rouletteMaterialUniforms from './rouletteMaterialSettings.js'
import baseMaterialUniforms from './baseMaterialSettings.js'
import innerMaterialUniforms from './innerMaterialSettings.js'
import innerReflectionMaterialUniforms from './innerReflectionMaterialSettings.js'
export default class Machine {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.items.casinoModel

		// this._createLights()
		this._createRouletteMaterial()
		this._createBaseMaterial()
		this._createInnerMaterial()
		this._createInnerReflectionMaterial()
		this._createModel()

		this._createEventListeners()

		// this.animateInnerMachineOut()

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

	get rouletteMaterial() {
		return this._rouletteMaterial
	}

	get wheels() {
		return this._wheels
	}

	get isHandFighting() {
		return this._isHandFighting
	}

	/**
	 * Public
	 */
	animateInnerMachineOut() {
		// this._isHandFighting = true
		this._innerOutTimeline?.kill()
		this._innerOutTimeline = gsap.timeline()
		this._innerOutTimeline.to(this._innerMachine.position, {
			z: -0.6,
			ease: 'none',
			duration: 0.4,
		})
		this._innerOutTimeline.to(this._innerMachine.position, {
			y: -0.6,
			ease: 'none',
			duration: 0.4,
			delay: 0.5,
		})

		return this._innerOutTimeline
	}

	animateInnerMachineIn() {
		// this._isHandFighting = false
		this._innerInTimeline?.kill()
		this._innerInTimeline = gsap.timeline()
		this._innerInTimeline.to(this._innerMachine.position, {
			y: 0,
			ease: 'none',
			duration: 0.4,
		})
		this._innerInTimeline.to(this._innerMachine.position, {
			z: 0,
			ease: 'none',
			duration: 0.8,
			delay: 0.4,
		})

		return this._innerInTimeline
	}

	animateInnerMachineBack() {
		this._isMachineBack = true
		this._innerBackTimeline?.kill()
		this._innerBackTimeline = gsap.timeline()
		this._innerBackTimeline.to(this._innerMachine.position, {
			z: -0.45,
			ease: 'none',
			duration: 1,
		})

		return this._innerBackTimeline
	}

	animateInnerMachineFront() {
		this._isMachineBack = false
		this._innerFrontTimeline?.kill()
		this._innerFrontTimeline = gsap.timeline()
		this._innerFrontTimeline.to(this._innerMachine.position, {
			z: 0.07,
			ease: 'none',
			duration: 0.8,
		})

		return this._innerFrontTimeline
	}

	/**
	 * Private
	 */

	_createModel() {
		this._model = this._resource.scene
		this._model.name = 'casino machine'
		this._scene.add(this._model)

		// Array to store wheel meshes
		this._wheels = [
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
		]
		this._leds = []

		this._model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name.includes('gold-inner')) {
				child.material = this._innerReflectionMaterial
			} else if (child.name.includes('slut-base')) {
				child.material = this._baseMaterial
			} else if (child.name.includes('wheels')) {
				child.material = this._rouletteMaterial
				this._leds.push(child)
			} else if (child.name.includes('gold')) {
				child.material = this._innerMaterial
			}
			if (child.name.includes('slut-base-inner')) {
				this._innerMachine = child
			}
		})

		this._wheels.forEach((wheel, index) => {
			wheel.rotation = this._rouletteMaterial.uniforms[`uRotation${index}`]
			this._innerReflectionMaterial.uniforms[`uRotation${index}`] = wheel.rotation
			// wheel.rotation.value = (1.0 / this._segments) / 2
		})
	}

	_createBaseMaterial() {
		this._baseMaterial = new PhongCustomMaterial({
			uniforms: baseMaterialUniforms,
			name: 'Base Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		})
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
		})
	}

	_createInnerReflectionMaterial() {
		this._innerReflectionMaterial = new PhongCustomMaterial({
			vertexShader: innerReflectionVertexShader,
			fragmentShader: innerReflectionFragmentShader,
			uniforms: innerReflectionMaterialUniforms,
			name: 'Inner Reflection Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		})
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
		})
	}

	/**
	 * Events
	 */
	_createEventListeners() { }

	/**
	 * Debug
	 */
	_createDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Machine',
			expanded: true,
		})
		// addMaterialDebug(folder, this._rouletteMaterial)
		addCustomMaterialDebug(folder, rouletteMaterialUniforms, this._resources, this._rouletteMaterial)
		addCustomMaterialDebug(folder, baseMaterialUniforms, this._resources, this._baseMaterial)
		addCustomMaterialDebug(folder, innerMaterialUniforms, this._resources, this._innerMaterial)
		addCustomMaterialDebug(folder, innerReflectionMaterialUniforms, this._resources, this._innerReflectionMaterial)
	}
}
