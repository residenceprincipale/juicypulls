import Experience from 'core/Experience.js'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
import characterVertexShader from './shadersCharacters/vertex.glsl'
import characterFragmentShader from './shadersCharacters/fragment.glsl'

import screenSettings from './screenSettings'
import screenCharactersSettings from './screenCharactersSettings'
import metalSettings from './metalSettings'
import ledsSettings from './ledsSettings'
import ScreenText from 'components/ScreenText/index.js'

import { Color } from 'three'
import gsap from 'gsap'
import { RoughEase } from 'gsap/EasePack'
gsap.registerPlugin(RoughEase)

import addObjectDebug from 'utils/addObjectDebug.js'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'

// Message areas on the glass, in [x, y] fractions. The V-shaped frame crosses the glass from 0.6 (sides) to 0.78
// (center), so the text always sits above it.
const MESSAGE_LAYOUTS = {
	// Covers the score and the quota; jetons and bank stay visible
	inner: {
		backdrop: [
			[0, 0],
			[1, 0],
			[1, 0.6],
			[0.5, 0.78],
			[0, 0.6],
		],
		text: [0.05, 0.08, 0.9, 0.42],
	},
	fullscreen: {
		backdrop: [
			[0, 0],
			[1, 0],
			[1, 1],
			[0, 1],
		],
		text: [0.05, 0.08, 0.9, 0.42],
	},
}

export default class ScoreScreen {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._tint = new Color('white')
		// this._resource = this._resources.items.environmentModel
		//

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

	get text() {
		return this._text
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
		this._showTimeline.to(
			this._charactersMaterial.uniforms.uScreenLuminosity,
			{
				value: 1.0,
				ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
			},
			0,
		)

		return this._showTimeline
	}

	hide() {
		this._hideTimeline?.kill()
		this._hideTimeline = gsap.timeline()
		// this._hideTimeline.to(this._screenMaterial.uniforms.uScreenLuminosity, {
		// 	value: 0.0,
		// 	ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		// })
		this._hideTimeline.to(
			this._charactersMaterial.uniforms.uScreenLuminosity,
			{
				value: 0.0,
				ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
			},
			0,
		)

		return this._hideTimeline
	}

	/**
	 * @param {{ message: string, modifier?: Array<{ text: string, color?: string }>, size?: 'fullscreen' | 'inner' }} options
	 */
	showMessage({ message, modifier = [], size = 'fullscreen' }) {
		const layout = MESSAGE_LAYOUTS[size] || MESSAGE_LAYOUTS.fullscreen
		this._text.draw((text) => {
			text.fillPolygon(layout.backdrop)
			text.drawMessage({ message, modifier, rect: text.toPixels(layout.text) })
		})
		this._text.material.opacity = 0
		return this._text.fade(1)
	}

	hideMessage() {
		return this._text.fade(0).eventCallback('onComplete', () => this._text.clear())
	}

	updateBank(value) {
		this._charactersMaterial.uniforms.uBank.value = value
		this._showBankTimeline?.kill()
		this._showBankTimeline = gsap.timeline({ repeat: 2 })
		this._showBankTimeline.fromTo(
			this._charactersMaterial.uniforms.uBankOpacity,
			{
				value: 0.0,
			},
			{
				value: 1,
				ease: 'steps(1)',
				duration: 0.6,
			},
		)
	}

	updateJetons(value) {
		this._charactersMaterial.uniforms.uJetons.value = value
		this._showJetonsTimeline?.kill()
		this._showJetonsTimeline = gsap.timeline({ repeat: 2 })
		this._showJetonsTimeline.fromTo(
			this._charactersMaterial.uniforms.uJetonsOpacity,
			{
				value: 0.0,
			},
			{
				value: 1,
				ease: 'steps(1)',
				duration: 0.6,
			},
		)
	}

	updateScore(value) {
		this._charactersMaterial.uniforms.uScore.value = value
		this._showScoreTimeline?.kill()
		this._showScoreTimeline = gsap.timeline({ repeat: 2 })
		this._showScoreTimeline.fromTo(
			this._charactersMaterial.uniforms.uScoreOpacity,
			{
				value: 0.0,
			},
			{
				value: 1,
				ease: 'steps(1)',
				duration: 0.6,
			},
		)
	}

	updateQuota(value) {
		this._charactersMaterial.uniforms.uQuota.value = value
		this._showQuotaTimeline?.kill()
		this._showQuotaTimeline = gsap.timeline({ repeat: 2 })
		this._showQuotaTimeline.fromTo(
			this._charactersMaterial.uniforms.uQuotaOpacity,
			{
				value: 0.0,
			},
			{
				value: 1,
				ease: 'steps(1)',
				duration: 0.6,
			},
		)
	}

	farkle() {
		this._showFarkleTimeline?.kill()
		this._showFarkleTimeline = gsap.timeline({
			onStart: () => {
				this._resources.items.farkleVideo.source.data.currentTime = 0.01
				this._resources.items.farkleVideo.source.data.play()
			},
			onComplete: () => {
				this._resources.items.farkleVideo.source.data.currentTime = 0.01
				this._resources.items.farkleVideo.source.data.pause()
			},
		})
		this._showFarkleTimeline.to(this._screenMaterial.uniforms.uFarkleOpacity, {
			value: 1.0,
			ease: 'sine.inOut',
		})
		this._showFarkleTimeline.to(
			this._screenMaterial.uniforms.uFarkleOpacity,
			{
				value: 0.0,
				ease: 'sine.inOut',
			},
			3,
		)

		return this._showFarkleTimeline
	}

	jackpot({ tint, count }) {
		this._screenMaterial.uniforms.uVideoTint.value.set(tint)

		this._showJackpotTimeline?.kill()
		this._showJackpotTimeline = gsap.timeline({
			onStart: () => {
				this._resources.items['jackpot' + count + 'Video'].source.data.currentTime = 0.01
				this._resources.items['jackpot' + count + 'Video'].source.data.play()
			},
			onComplete: () => {
				this._resources.items['jackpot' + count + 'Video'].source.data.currentTime = 0.01
				this._resources.items['jackpot' + count + 'Video'].source.data.pause()
			},
		})
		this._showJackpotTimeline.to(this._screenMaterial.uniforms['uJackpot' + count + 'Opacity'], {
			value: 1.0,
			ease: 'sine.inOut',
		})
		this._showJackpotTimeline.to(
			this._screenMaterial.uniforms['uJackpot' + count + 'Opacity'],
			{
				value: 0.0,
				ease: 'sine.inOut',
			},
			2.5,
		)

		return this._showJackpotTimeline
	}

	update() {
		if (this._screenMaterial) this._screenMaterial.uniforms.uTime.value = this._experience.time.elapsed * 0.001
	}

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resources.items.scoreScreenModel.scene
		this._model.traverse((child) => {
			if (child.name === 'screen-score') {
				this._screenMesh = child
				this._screenMesh.material = this._screenMaterial
				// this._screenMesh.material = new MeshBasicMaterial({ color: '#000000' })
			}
			if (child.name === 'screenCharacters-score') {
				this._charactersMesh = child
				this._charactersMesh.material = this._charactersMaterial
			}
			if (child.name === 'metal-score') {
				this._metalMesh = child
				this._metalMesh.material = this._metalMaterial
			}
			if (child.name === 'leds-score') {
				child.userData.renderBloom = true
				this._ledsMesh = child
				this._ledsMesh.material = this._ledsMaterial
			}
		})

		this._model.name = 'Score Screen'

		this._model.position.set(-0.254, 0.505, -0.792)
		this._model.scale.set(0.132, 0.132, 0.132)
		this._model.rotation.set(0.35, 0.0, 0.0)

		this._scene.add(this._model)

		// Text layer for messages, just in front of the glass
		this._model.updateMatrixWorld(true)
		// The digits mesh stands up to ~6 mm in front of the glass, so the text layer goes in front of it
		this._text = new ScreenText({
			screenMesh: this._screenMesh,
			camera: this._experience.camera.instance,
			offset: 0.008,
		})
	}

	_createMaterials() {
		this._screenMaterial = new PhongCustomMaterial({
			uniforms: screenSettings,
			name: 'Score Screen Material',
			transparent: true,
			defines: {
				USE_ROUGHNESS: false,
				USE_MATCAP: true,
				USE_AO: false,
			},
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
		})

		this._charactersMaterial = new PhongCustomMaterial({
			uniforms: screenCharactersSettings,
			name: 'Score Characters Material',
			transparent: true,
			defines: {
				USE_ROUGHNESS: false,
				USE_MATCAP: true,
				USE_AO: false,
			},
			vertexShader: characterVertexShader,
			fragmentShader: characterFragmentShader,
		})

		this._metalMaterial = new PhongCustomMaterial({
			uniforms: metalSettings,
			name: 'Score Metal Material',
			defines: {
				USE_ROUGHNESS: false,
				USE_MATCAP: true,
				USE_AO: false,
			},
		})

		this._ledsMaterial = new PhongCustomMaterial({
			uniforms: ledsSettings,
			name: 'Score Leds Material',
			defines: {
				USE_ROUGHNESS: false,
				USE_MATCAP: false,
				USE_AO: false,
			},
		})
	}

	_createEventListeners() {
		// Add event listeners here if needed
	}

	_createDebug() {
		if (!this._debug.active) return

		const debugFolder = this._debug.ui.addFolder({
			title: 'Score screen',
			expanded: true,
		})

		// Material debug
		addCustomMaterialDebug(debugFolder, screenSettings, this._resources, this._screenMaterial)
		addCustomMaterialDebug(debugFolder, screenCharactersSettings, this._resources, this._charactersMaterial)
		// addCustomMaterialDebug(debugFolder, metalSettings, this._resources, this._metalMaterial)
		// addCustomMaterialDebug(debugFolder, ledsSettings, this._resources, this._ledsMaterial)

		// Transform controls for the model
		addTransformDebug(debugFolder, this._model)
		// addTransformDebug(debugFolder, this._textMesh)
	}
}
