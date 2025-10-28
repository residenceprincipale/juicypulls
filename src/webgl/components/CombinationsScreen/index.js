import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'

import screenSettings from './screenSettings'
import metalSettings from './metalSettings'
import ledsSettings from './ledsSettings'

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

		this._createMaterials()
		this._createModel()
		this._createEventListeners()

		if (this._debug.active) this._createDebug()

		this.show()
	}

	/**
	 * Getters & Setters
	 */
	get model() {
		return this._model
	}

	get tint() {
		return this._tint
	}

	set tint(value) {
		this._tint = value
		gsap.to(this._screenMaterial.uniforms.uTint.value, {
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
	show() {
		this._showTimeline?.kill()
		this._showTimeline = gsap.timeline()
		this._showTimeline.to(this._screenMaterial.uniforms.uScreenLuminosity, {
			value: 1.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	hide() {
		this._hideTimeline?.kill()
		this._hideTimeline = gsap.timeline()
		this._hideTimeline.to(this._screenMaterial.uniforms.uScreenLuminosity, {
			value: 0.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	reset() {
		this._screenMaterial.uniforms.uHighlightIndex1.value = -1
		this._screenMaterial.uniforms.uHighlightIndex2.value = -1
		this._screenMaterial.uniforms.uHighlightIndex3.value = -1
		this._screenMaterial.uniforms.uHighlightIndex4.value = -1
		this._screenMaterial.uniforms.uHighlightIndex5.value = -1
		this._screenMaterial.uniforms.uHighlightIndex6.value = -1
	}

	update() {
		if (this._screenMaterial) this._screenMaterial.uniforms.uTime.value = this._experience.time.elapsed * 0.001
	}

	displayCombination({ indexRow, indexColumn }) {
		this._screenMaterial.uniforms['uHighlightIndex' + indexRow].value = indexColumn

		this._blinkingTimeline?.kill()
		this._blinkingTimeline = gsap.timeline()
		this._blinkingTimeline.to(this._screenMaterial.uniforms['uBlinkingFactor' + indexRow], { value: 1, duration: 0 })
		this._blinkingTimeline.to(this._screenMaterial.uniforms['uBlinkingFactor' + indexRow], { value: 0, duration: 0 }, 2)
	}

	displayMarquee({ tint }) {
		this._screenMaterial.uniforms.uMarqueeTint.value.set(tint)

		this._showMarqueeTimeline?.kill()
		this._showMarqueeTimeline = gsap.timeline()
		this._showMarqueeTimeline.to(this._screenMaterial.uniforms.uMarqueeOpacity, {
			value: 1.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resources.items.screenModel.scene
		this._model.traverse((child) => {
			if (child.name === 'screen') {
				this._screenMesh = child
				this._screenMesh.material = this._screenMaterial
			}
			if (child.name === 'metal') {
				this._metalMesh = child
				this._metalMesh.material = this._metalMaterial
			}
			if (child.name === 'leds') {
				this._ledsMesh = child
				this._ledsMesh.material = this._ledsMaterial
			}
		})

		this._model.name = 'Combination Screen'

		this._scene.add(this._model)
	}

	_createMaterials() {
		this._screenMaterial = new PhongCustomMaterial({
			uniforms: screenSettings,
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

		this._metalMaterial = new PhongCustomMaterial({
			uniforms: metalSettings,
			name: 'Combi Metal Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
		})

		this._ledsMaterial = new PhongCustomMaterial({
			uniforms: ledsSettings,
			name: 'Combi Leds Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
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
		addCustomMaterialDebug(debugFolder, screenSettings, this._resources, this._screenMaterial)
		addCustomMaterialDebug(debugFolder, metalSettings, this._resources, this._metalMaterial)
		addCustomMaterialDebug(debugFolder, ledsSettings, this._resources, this._ledsMaterial)

		// Transform controls for the model
		addTransformDebug(debugFolder, this._model)
	}
}
