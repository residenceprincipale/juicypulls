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
import goldMaterialUniforms from './goldMaterialSettings.js'
import goldLogoMaterialUniforms from './goldLogoMaterialSettings.js'
import innerReflectionMaterialUniforms from './innerReflectionMaterialSettings.js'
export default class Machine {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.items.rouletteModel

		// this._createLights()
		this._createRouletteMaterial()
		this._createBaseMaterial()
		this._createGoldMaterial()
		this._createGoldLogoMaterial()
		// this._createInnerReflectionMaterial()
		this._createBloomMaterial()
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
	hide() {
		this._model.visible = false
	}

	show() {
		this._model.visible = true
	}

	animateInnerMachineOut() {
		// this._isHandFighting = true
		this._innerOutTimeline?.kill()
		this._innerOutTimeline = gsap.timeline()
		this._innerOutTimeline.add(this.turnOffLeds(), 0)
		this._innerOutTimeline.to(this._innerMachine.position, {
			z: -0.4,
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

	turnOffLeds() {
		const timeline = gsap.timeline()
		timeline.to(this._innerLeds.material, {
			opacity: 0,
			duration: 0.1,
			ease: 'none',
		})
		timeline.to(this._outerLeds.material, {
			opacity: 0,
			duration: 0.1,
			ease: 'none',
		})
		timeline.to(this._separatorsLeds.material, {
			opacity: 0,
			duration: 0.1,
			ease: 'none',
		})

		return timeline
	}

	turnOffInnerLeds() {
		const timeline = gsap.timeline()
		timeline.to(this._innerLeds.material, {
			opacity: 0,
			duration: 0.1,
			ease: 'none',
		})
		timeline.to(this._separatorsLeds.material, {
			opacity: 0,
			duration: 0.1,
			ease: 'none',
		})

		return timeline
	}

	turnOnLeds() {
		const timeline = gsap.timeline()
		// Simple flicker effect for all LEDs
		timeline
			.to(this._innerLeds.material, {
				opacity: 0.3,
				duration: 0.05,
				ease: 'power1.in',
			})
			.to(this._innerLeds.material, {
				opacity: 0.8,
				duration: 0.03,
				ease: 'power1.out',
			})
			.to(this._innerLeds.material, {
				opacity: 1,
				duration: 0.1,
				ease: 'power1.out',
			})
			.to(this._outerLeds.material, {
				opacity: 0.4,
				duration: 0.04,
				ease: 'power1.in',
			}, 0.02)
			.to(this._outerLeds.material, {
				opacity: 1,
				duration: 0.12,
				ease: 'power1.out',
			})
			.to(this._separatorsLeds.material, {
				opacity: 0.2,
				duration: 0.03,
				ease: 'power1.in',
			}, 0.04)
			.to(this._separatorsLeds.material, {
				opacity: 1,
				duration: 0.08,
				ease: 'power1.out',
			})

		return timeline
	}

	turnOnInnerLeds() {
		const timeline = gsap.timeline()
		// Simple flicker effect for inner LEDs
		timeline
			.to(this._innerLeds.material, {
				opacity: 0.2,
				duration: 0.04,
				ease: 'power1.in',
			})
			.to(this._innerLeds.material, {
				opacity: 0.7,
				duration: 0.02,
				ease: 'power1.out',
			})
			.to(this._innerLeds.material, {
				opacity: 1,
				duration: 0.08,
				ease: 'power1.out',
			})
			.to(this._separatorsLeds.material, {
				opacity: 0.3,
				duration: 0.03,
				ease: 'power1.in',
			}, 0.02)
			.to(this._separatorsLeds.material, {
				opacity: 1,
				duration: 0.1,
				ease: 'power1.out',
			})

		return timeline
	}
	/**
	 * Private
	 */

	_createModel() {
		this._model = this._resource.scene
		this._model.name = 'machine'
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
			if (child.name.includes('metal') || child.name.includes('inside')) {
				child.material = this._baseMaterial
			} else if (child.name.includes('wheels')) {
				child.material = this._rouletteMaterial
			}
			if (child.name.includes('gold')) {
				child.material = this._goldMaterial
			}
			if (child.name.includes('logo')) {
				child.material = this._goldLogoMaterial
				this._logoMesh = child
			}
			if (child.name.includes('inner-wheels-metal')) {
				this._innerMachine = child
			}
			if (child.name.includes('led')) {
				child.material = this._bloomMaterial.clone()
				child.userData.renderBloom = true
				this._leds.push(child)
			}
			if (child.name === 'leds-inner-wheels') {
				this._innerLeds = child
			}
			if (child.name === 'leds-outer-machine') {
				this._outerLeds = child
			}
			if (child.name === 'leds-separators') {
				this._separatorsLeds = child
			}
		})

		this._wheels.forEach((wheel, index) => {
			wheel.rotation = this._rouletteMaterial.uniforms[`uRotation${index}`]
			// this._innerReflectionMaterial.uniforms[`uRotation${index}`] = wheel.rotation
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
				USE_AO: true,
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

	_createGoldMaterial() {
		this._goldMaterial = new PhongCustomMaterial({
			uniforms: goldMaterialUniforms,
			name: 'Gold Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
		})
	}

	_createGoldLogoMaterial() {
		this._goldLogoMaterial = new PhongCustomMaterial({
			uniforms: goldLogoMaterialUniforms,
			name: 'Gold Logo Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
		})
	}

	_createBloomMaterial() {
		const brightMaterial = new MeshBasicMaterial({
			color: 0xffffff,
			opacity: 1,
			transparent: true,
		})

		this._bloomMaterial = brightMaterial
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

		folder.addButton({
			title: 'Animate Out'
		}).on('click', () => {
			this.animateInnerMachineOut()
		})

		folder.addButton({
			title: 'Animate In'
		}).on('click', () => {
			this.animateInnerMachineIn()
		})

		// addMaterialDebug(folder, this._rouletteMaterial)
		addCustomMaterialDebug(folder, rouletteMaterialUniforms, this._resources, this._rouletteMaterial)
		addCustomMaterialDebug(folder, baseMaterialUniforms, this._resources, this._baseMaterial)
		addCustomMaterialDebug(folder, goldMaterialUniforms, this._resources, this._goldMaterial)
		addCustomMaterialDebug(folder, goldLogoMaterialUniforms, this._resources, this._goldLogoMaterial)
		// addCustomMaterialDebug(folder, innerReflectionMaterialUniforms, this._resources, this._innerReflectionMaterial)
	}
}
