import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
import settings from './settings'

import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import gsap from 'gsap'
import { RoughEase } from 'gsap/EasePack'
gsap.registerPlugin(RoughEase)

import addObjectDebug from 'utils/addObjectDebug.js'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'

export default class CombinationsScreen {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._tint = new Color('white')
		// this._resource = this._resources.items.environmentModel

		this._createMaterial()
		this._createModel()
		this._createEventListeners()

		if (this._debug.active) this._createDebug()
		this.showAnimation(true)

		this.show()
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

	get tint() {
		return this._tint
	}

	set tint(value) {
		this._tint = value
		gsap.to(this._material.uniforms.uTint.value, {
			r: value.r,
			g: value.g,
			b: value.b,
			duration: 0.5,
			ease: `rough({
				template:none,
				strength: 3,
				points:10,
				randomize:true,
				})`,
		})
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

	show() {
		this._showTimeline?.kill()
		this._showTimeline = gsap.timeline()
		this._showTimeline.to(this._material.uniforms.uScreenLuminosity, {
			value: 1.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	hide() {
		this._hideTimeline?.kill()
		this._hideTimeline = gsap.timeline()
		this._hideTimeline.to(this._material.uniforms.uScreenLuminosity, {
			value: 0.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	reset() {
		this._material.uniforms.uHighlightIndex1.value = -1
		this._material.uniforms.uHighlightIndex2.value = -1
		this._material.uniforms.uHighlightIndex3.value = -1
		this._material.uniforms.uHighlightIndex4.value = -1
		this._material.uniforms.uHighlightIndex5.value = -1
		this._material.uniforms.uHighlightIndex6.value = -1
	}

	update() {
		if (this.material) this.material.uniforms.uTime.value = this._experience.time.elapsed * 0.001
	}

	displayCombination({ indexRow, indexColumn }) {
		this._material.uniforms['uHighlightIndex' + indexRow].value = indexColumn

		this._blinkingTimeline?.kill()
		this._blinkingTimeline = gsap.timeline()
		this._blinkingTimeline.to(this._material.uniforms['uBlinkingFactor' + indexRow], { value: 1, duration: 0 })
		this._blinkingTimeline.to(this._material.uniforms['uBlinkingFactor' + indexRow], { value: 0, duration: 0 }, 2)
	}

	displayMarquee({ tint }) {
		this._material.uniforms.uMarqueeTint.value.set(tint)

		this._showMarqueeTimeline?.kill()
		this._showMarqueeTimeline = gsap.timeline()
		this._showMarqueeTimeline.to(this._material.uniforms.uMarqueeOpacity, {
			value: 1.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resources.items.screenModel.scene.children[0]
		this._model.rotation.z = Math.PI * 0.5
		this._model.material = this._material
		this._model.name = 'combi background'

		this._scene.add(this._model)
	}

	_createMaterial() {
		this._material = new PhongCustomMaterial({
			uniforms: settings,
			name: 'Combi Screen Material',
			transparent: true,
			defines: {
				USE_ROUGHNESS: false,
				USE_MATCAP: true,
				USE_AO: false,
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

		const debugFolder = this._debug.ui.addFolder({
			title: 'Combi screen',
			expanded: true,
		})

		// Material debug
		addCustomMaterialDebug(debugFolder, settings, this._resources, this._material)

		// Transform controls for the model
		addTransformDebug(debugFolder, this._model)
	}
}
