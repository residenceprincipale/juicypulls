import Experience from 'core/Experience.js'
import fragmentShader from './fragmentShader.frag'
import vertexShader from './vertexShader.vert'
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'

export default class Machine {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.casino
		this._resource = this._resources.items.casinoModel

		this._createLight()
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

	_createLight() {
		this._light = new DirectionalLight('#ffffff', 2.9)
		this._light.position.set(0, 1.7, 1.5)
		this._light.name = 'machineLight'
		this._scene.add(this._light)

		this._light.target.position.set(0, 1, 0)

		// Debug
		if (this._debug.active) {
			const debugFolder = addObjectDebug(this._debug.ui, this._light)
		}
	}

	_createRouletteMaterial() {
		const wheelTexture = this._resources.items.wheelTexture;
		wheelTexture.wrapS = RepeatWrapping
		wheelTexture.wrapT = RepeatWrapping
		wheelTexture.flipY = false

		this._rouletteMaterial = new ShaderMaterial({
			vertexShader,
			fragmentShader,
			name: "Roulette",
			uniforms: {
				uTime: { value: 0 },
				uTexture: { value: this._resources.items.wheelTexture },
				uAoTexture: { value: this._resources.items.roulettesAO },
				uMatcapMap: { value: this._resources.items.glassMatcap },
				uMatcapOffset: { value: new Vector2(0, 0) },
				uMatcapIntensity: { value: 0.2 },
				uRoughness: { value: 0.5 },
				uWheelsSpacing: { value: 4.8 },
				uWheelsOffset: { value: 0.76 },
				uAOIntensity: { value: 0.30 },
				uBaseRotationOffset: { value: -0.843 },
				uRotation0: { value: 0 },
				uRotation1: { value: 0 },
				uRotation2: { value: 0 },
				uRotation3: { value: 0 },
				uRotation4: { value: 0 },
			}
		})
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
		addMaterialDebug(folder, this._rouletteMaterial)
	}
}
