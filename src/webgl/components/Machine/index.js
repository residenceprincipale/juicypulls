import Experience from 'core/Experience.js'
import rouletteVertexShader from './shadersRoulette/vertex.glsl'
import rouletteFragmentShader from './shadersRoulette/fragment.glsl'
import innerReflectionVertexShader from './shadersInnerReflection/vertex.glsl'
import innerReflectionFragmentShader from './shadersInnerReflection/fragment.glsl'
import ledsVertexShader from './shadersLeds/vertex.glsl'
import ledsFragmentShader from './shadersLeds/fragment.glsl'
import innerLedsVertexShader from './shadersInnerLeds/vertex.glsl'
import innerLedsFragmentShader from './shadersInnerLeds/fragment.glsl'
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
		this._createLedsMaterial()
		this._createInnerLedsMaterial()
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
		this._innerOutTimeline.add(this.turnOffInnerLeds(), 0)
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
		this._innerInTimeline.add(this.turnOnInnerLeds(), "+=0.2")

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
		if (this._innerLeds.material.uniforms.uOpacity.value === 0) return

		const timeline = gsap.timeline()
		timeline.to(this._innerLeds.material.uniforms.uOpacity, {
			value: 0,
			duration: 0.1,
			ease: 'none',
		})
		timeline.to(this._outerLeds.material.uniforms.uOpacity, {
			value: 0,
			duration: 0.1,
			ease: 'none',
		})
		timeline.to(this._separatorsLeds.material.uniforms.uOpacity, {
			value: 0,
			duration: 0.1,
			ease: 'none',
		})

		return timeline
	}

	turnOffInnerLeds() {
		if (this._innerLeds.material.uniforms.uOpacity.value === 0) return

		const timeline = gsap.timeline()
		timeline.to(this._innerLeds.material.uniforms.uOpacity, {
			value: 0,
			duration: 0.1,
			ease: 'none',
		})
		timeline.to(this._separatorsLeds.material.uniforms.uOpacity, {
			value: 0,
			duration: 0.1,
			ease: 'none',
		})

		return timeline
	}

	turnOnLeds() {
		if (this._innerLeds.material.uniforms.uOpacity.value === 1) return

		const timeline = gsap.timeline()
		// Simple flicker effect for all LEDs
		timeline
			.to(this._innerLeds.material.uniforms.uOpacity, {
				value: 0.3,
				duration: 0.05,
				ease: 'power1.in',
			})
			.to(this._innerLeds.material.uniforms.uOpacity, {
				value: 0.8,
				duration: 0.03,
				ease: 'power1.out',
			})
			.to(this._innerLeds.material.uniforms.uOpacity, {
				value: 1,
				duration: 0.1,
				ease: 'power1.out',
			})
			.to(this._outerLeds.material.uniforms.uOpacity, {
				value: 0.4,
				duration: 0.04,
				ease: 'power1.in',
			}, 0.02)
			.to(this._outerLeds.material.uniforms.uOpacity, {
				value: 1,
				duration: 0.12,
				ease: 'power1.out',
			})
			.to(this._separatorsLeds.material.uniforms.uOpacity, {
				value: 0.2,
				duration: 0.03,
				ease: 'power1.in',
			}, 0.04)
			.to(this._separatorsLeds.material.uniforms.uOpacity, {
				value: 1,
				duration: 0.08,
				ease: 'power1.out',
			})

		return timeline
	}

	turnOnInnerLeds() {
		if (this._innerLeds.material.uniforms.uOpacity.value === 1) return

		const timeline = gsap.timeline()

		timeline
			.to(this._innerLeds.material.uniforms.uOpacity, {
				value: 0.2,
				duration: 0.04,
				ease: 'power1.in',
			})
			.to(this._innerLeds.material.uniforms.uOpacity, {
				value: 0.7,
				duration: 0.02,
				ease: 'power1.out',
			})
			.to(this._innerLeds.material.uniforms.uOpacity, {
				value: 1,
				duration: 0.08,
				ease: 'power1.out',
			})
			.to(this._separatorsLeds.material.uniforms.uOpacity, {
				value: 0.3,
				duration: 0.03,
				ease: 'power1.in',
			}, 0.02)
			.to(this._separatorsLeds.material.uniforms.uOpacity, {
				value: 1,
				duration: 0.1,
				ease: 'power1.out',
			})

		return timeline
	}

	turnOnWheelLeds() {
		if (this._innerLeds.material.uniforms.uOpacity.value === 1) return

	}

	animateWheelLock({ index, value, color }) {
		// this._innerLedsMaterial.uniforms[`uLockedOpacity${index}`].value = value ? 1 : 0

		const timeline = gsap.timeline()
		timeline.to(this._innerLedsMaterial.uniforms[`uLockedOpacity${index}`], {
			value: value ? 1 : 0,
			duration: 0.04,
			ease: 'power1.out',
		})

		timeline.to(this._innerLedsMaterial.uniforms[`uLockedOpacity${index}`], {
			value: value ? 0 : 1,
			duration: 0.04,
			ease: 'power1.in',
		}, 0.05)
		timeline.to(this._innerLedsMaterial.uniforms[`uLockedOpacity${index}`], {
			value: value ? 1 : 0,
			duration: 0.04,
			ease: 'power1.out',
		}, 0.1)

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
				child.material = this._ledsMaterial.clone()
				child.userData.renderBloom = true
				this._leds.push(child)
			}
			if (child.name === 'leds-inner-wheels') {
				child.material = this._innerLedsMaterial
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

	_createLedsMaterial() {
		this._ledsMaterial = new ShaderMaterial({
			vertexShader: ledsVertexShader,
			fragmentShader: ledsFragmentShader,
			name: 'Leds Material',
			transparent: true,
			uniforms: {
				uColor: { value: new Color(0xffffff) },
				uOpacity: { value: 1.0 },
				uMaskProgressEnd: { value: 0.0 },
				uMaskProgressStart: { value: 0.0 }
			},
		})
	}

	_createInnerLedsMaterial() {
		this._innerLedsMaterial = new ShaderMaterial({
			vertexShader: innerLedsVertexShader,
			fragmentShader: innerLedsFragmentShader,
			name: 'Inner Leds Material',
			transparent: true,
			uniforms: {
				uColor: { value: new Color(0xffffff) },
				uLockedColor: { value: new Color(0xffe161) },
				uOpacity: { value: 1.0 },
				uLockedOpacity0: { value: 0.0 },
				uLockedOpacity1: { value: 0.0 },
				uLockedOpacity2: { value: 0.0 },
				uLockedOpacity3: { value: 0.0 },
				uLockedOpacity4: { value: 0.0 },
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

		const color = {
			value: "#000000"
		}

		folder.addBinding(color, 'value').on('change', (value) => {
			this._innerLedsMaterial.uniforms.uLockedColor.value = new Color(value.value)
		})
		folder.addBinding(this._innerLeds.material.uniforms.uOpacity, 'value')

		// folder.addBinding(this._innerLeds.material.uniforms.uColor, 'value')
		// folder.addBinding(this._innerLeds.material.uniforms.uMaskProgressStart, 'value')
		// folder.addBinding(this._innerLeds.material.uniforms.uMaskProgressEnd, 'value')
		// folder.addBinding(this._outerLeds.material.uniforms.uMaskProgressStart, 'value')
		// folder.addBinding(this._outerLeds.material.uniforms.uMaskProgressEnd, 'value')
		// folder.addBinding(this._separatorsLeds.material.uniforms.uMaskProgressStart, 'value')
		// folder.addBinding(this._separatorsLeds.material.uniforms.uMaskProgressEnd, 'value')

		// addMaterialDebug(folder, this._rouletteMaterial)
		addCustomMaterialDebug(folder, rouletteMaterialUniforms, this._resources, this._rouletteMaterial)
		addCustomMaterialDebug(folder, baseMaterialUniforms, this._resources, this._baseMaterial)
		addCustomMaterialDebug(folder, goldMaterialUniforms, this._resources, this._goldMaterial)
		addCustomMaterialDebug(folder, goldLogoMaterialUniforms, this._resources, this._goldLogoMaterial)
		// addCustomMaterialDebug(folder, innerReflectionMaterialUniforms, this._resources, this._innerReflectionMaterial)
	}
}
