import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl';
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial, DirectionalLightHelper } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'

import materialUniforms from './materialSettings.js'
export default class Machine {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.casino
		this._resource = this._resources.items.casinoModel

		// this._createLights()
		this._createMaterial()
		this._createRouletteMaterial()
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

	get material() {
		return this._material;
	}

	get rouletteMaterial() {
		return this._rouletteMaterial;
	}

	get light() {
		return this._light
	}

	get wheels() {
		return this._wheels
	}

	/**
	 * Public
	 */
	animateInnerMachineOut() {
		this._isHandFighting = true
		this._innerOutTimeline = gsap.timeline();
		this._innerOutTimeline.to(this._innerMachine.position, {
			z: -0.6,
			ease: "none",
			duration: 1,
		})
		this._innerOutTimeline.to(this._innerMachine.position, {
			y: -0.6,
			ease: "none",
			duration: 1,
			delay: 0.5
		})
	}

	animateInnerMachineIn() {
		this._isHandFighting = false
		this._innerInTimeline = gsap.timeline();
		this._innerInTimeline.to(this._innerMachine.position, {
			y: 0,
			ease: "none",
			duration: 0.4,
		})
		this._innerInTimeline.to(this._innerMachine.position, {
			z: 0,
			ease: "none",
			duration: 0.8,
			delay: 0.4
		})
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
			if (child.name.includes('slut-base')) {
				child.material = this._material
			} else if (child.name.includes('wheels')) {
				child.material = this._rouletteMaterial;
				this._leds.push(child)
			} else if (child.name.includes('gold')) {
				child.material = new MeshMatcapMaterial({ matcap: this._resources.items.goldMatcap })
			}
			if (child.name.includes('slut-base-inner')) {
				this._innerMachine = child
			}
		})

		this._wheels.forEach((wheel, index) => {
			wheel.rotation = this._rouletteMaterial.uniforms[`uRotation${index}`]
			// wheel.rotation.value = (1.0 / this._segments) / 2
		})
	}

	_createMaterial() {
		// Material for the wheels
		const texture = this._resources.items.casinoRoughness
		texture.flipY = false;

		this._material = new MeshPhongMaterial({ color: 0x333333, map: this._resources.items.casinoRoughness })
	}

	_createLights() {
		this._lightTop = new DirectionalLight('#ffffff', 2.9);
		this._lightTop.position.set(0, 1.7, 1.5);
		this._lightTop.name = 'machineLightTop';
		this._scene.add(this._lightTop);

		this._lightTop.target.position.set(0, 1, 0);

		// Debug
		if (this._debug.active) {
			addObjectDebug(this._debug.ui, this._lightTop);
			// const topLightHelper = new DirectionalLightHelper(this._lightTop, 0.5);
			// this._scene.add(topLightHelper);
		}

		// light left
		this._lightLeft = new DirectionalLight('#ffffff', 2);
		this._lightLeft.position.set(-1, 1, 1);
		this._lightLeft.name = 'machineLightLeft';
		this._scene.add(this._lightLeft);

		this._lightLeft.target.position.set(0, 1, 0);

		// Debug
		if (this._debug.active) {
			addObjectDebug(this._debug.ui, this._lightLeft);
			// const leftLightHelper = new DirectionalLightHelper(this._lightLeft, 0.5);
			// this._scene.add(leftLightHelper);
		}

		// light right
		this._lightRight = new DirectionalLight('#ffffff', 2);
		this._lightRight.position.set(1, 1, 1);
		this._lightRight.name = 'machineLightRight';
		this._scene.add(this._lightRight);

		this._lightRight.target.position.set(0, 1, 0);

		// Debug
		if (this._debug.active) {
			addObjectDebug(this._debug.ui, this._lightRight);
			// const rightLightHelper = new DirectionalLightHelper(this._lightRight, 0.5);
			// this._scene.add(rightLightHelper);
		}
	}

	_createRouletteMaterial() {
		const wheelAlbedo = this._resources.items.wheelAlbedo;
		wheelAlbedo.wrapS = RepeatWrapping
		wheelAlbedo.wrapT = RepeatWrapping
		wheelAlbedo.flipY = false

		const wheelNormal = this._resources.items.wheelNormal;
		wheelNormal.wrapS = RepeatWrapping
		wheelNormal.wrapT = RepeatWrapping
		wheelNormal.flipY = false

		this._rouletteMaterial = new PhongCustomMaterial({
			vertexShader,
			fragmentShader,
			uniforms: materialUniforms,
			defines: {
				USE_NORMAL: true,
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
			title: 'Machine',
			expanded: true,
		})
		// addMaterialDebug(folder, this._rouletteMaterial)
		addCustomMaterialDebug(folder, materialUniforms, this._resources, this._rouletteMaterial)
	}
}
