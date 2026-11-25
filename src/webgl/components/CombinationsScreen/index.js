import Experience from 'core/Experience.js'
import combinationsScreenNodes from './nodes/screen.js'

import screenSettings from './screenSettings'
import metalSettings from './metalSettings'
import ledsSettings from './ledsSettings'
import ScreenText from 'components/ScreenText/index.js'

import { Color, Mesh, PlaneGeometry } from 'three'
import gsap from 'gsap'
import { RoughEase } from 'gsap/EasePack'
gsap.registerPlugin(RoughEase)

import addObjectDebug from 'utils/addObjectDebug.js'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'

// Areas on the glass, as [x, y, width, height] fractions. Metal frames split the glass into a central panel
// (the combinations table) and a narrow slot on each side.
const MESSAGE_LAYOUTS = {
	// Covers the table; the side slots keep the round and the multiplier
	inner: { backdrop: [0.13, 0, 0.76, 1], text: [0.16, 0.06, 0.7, 0.88] },
	fullscreen: { backdrop: [0, 0, 1, 1], text: [0.16, 0.06, 0.7, 0.88] },
}
// Centers of the side slots (x) for the vertical status labels
const STATUS_SLOT_X = { round: 0.05, multiplier: 0.945 }
const MULTIPLIER_COLOR = '#ffd400'

export default class CombinationsScreen {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._tint = new Color('white')
		this._blinkingTimelines = []

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
	}

	hide() {
		this._hideTimeline?.kill()
		this._hideTimeline = gsap.timeline()
		this._hideTimeline.to(this._screenMaterial.uniforms.uScreenLuminosity, {
			value: 0.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
	}

	/**
	 * @param {{ message: string, modifier?: Array<{ text: string, color?: string }>, size?: 'fullscreen' | 'inner' }} options
	 */
	showMessage({ message, modifier = [], size = 'fullscreen' }) {
		const layout = MESSAGE_LAYOUTS[size] || MESSAGE_LAYOUTS.fullscreen
		this._text.draw((text) => {
			text.fillRect(text.toPixels(layout.backdrop))
			text.drawMessage({ message, modifier, rect: text.toPixels(layout.text) })
		})
		this._text.material.opacity = 0
		return this._text.fade(1)
	}

	hideMessage() {
		return this._text.fade(0).eventCallback('onComplete', () => this._text.clear())
	}

	/**
	 * Round (left slot) and multiplier (right slot), shown once the round starts
	 * @param {{ round?: number, multiplier?: number }} status
	 */
	setStatus(status) {
		Object.assign(this._status, status)
		const { round, multiplier } = this._status

		this._statusText.draw((text) => {
			if (!round) return
			const fontSize = text.width * 0.085
			const y = text.height / 2
			text.drawLabel({
				text: `Round ${round}`,
				x: text.width * STATUS_SLOT_X.round,
				y,
				fontSize,
				rotation: -Math.PI / 2,
			})
			text.drawLabel({
				text: `Multiplier x${multiplier}`,
				x: text.width * STATUS_SLOT_X.multiplier,
				y,
				fontSize,
				rotation: -Math.PI / 2,
				color: multiplier > 1 ? MULTIPLIER_COLOR : undefined,
			})
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

	/**
	 * @param {number} indexRow 1–6 (row 0 is the header)
	 * @param {number} indexColumn 1–4 (column 0 holds the symbol icons)
	 */
	displayCombination({ indexRow, indexColumn }) {
		this._screenMaterial.uniforms['uHighlightIndex' + indexRow].value = indexColumn

		// One blinking timeline per row, so highlighting a row doesn't leave another one blinking
		const blinkingFactor = this._screenMaterial.uniforms['uBlinkingFactor' + indexRow]
		this._blinkingTimelines[indexRow]?.kill()
		this._blinkingTimelines[indexRow] = gsap.timeline()
		this._blinkingTimelines[indexRow].to(blinkingFactor, { value: 1, duration: 0 })
		this._blinkingTimelines[indexRow].to(blinkingFactor, { value: 0, duration: 0 }, 2)
	}

	displayMarquee({ tint }) {
		this._screenMaterial.uniforms.uMarqueeTint.value.set(tint)
		this._screenMaterial.uniforms.uVideoMarquee.value.source.data.currentTime = 0.01
		this._screenMaterial.uniforms.uVideoMarquee.value.source.data.play()

		this._showMarqueeTimeline?.kill()
		this._showMarqueeTimeline = gsap.timeline({
			onComplete: () => {
				this._screenMaterial.uniforms.uVideoMarquee.value.source.data.pause()
				this._screenMaterial.uniforms.uVideoMarquee.value.source.data.currentTime = 0.01
			},
		})
		this._showMarqueeTimeline.to(this._screenMaterial.uniforms.uMarqueeOpacity, {
			value: 1.0,
			ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
		})
		// The marquee plays in the side slots, over the round and multiplier
		this._showMarqueeTimeline.add(this._statusText.fade(0), 0)
		this._showMarqueeTimeline.add(() => this._statusText.fade(1), 3.0)
		this._showMarqueeTimeline.to(
			this._screenMaterial.uniforms.uMarqueeOpacity,
			{
				value: 0.0,
				ease: "rough({ template: 'none', strength: 2, points: 7, randomize: true })",
			},
			3.0,
		)
	}

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resources.items.combinationScreenModel.scene
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
				child.userData.renderBloom = true
				this._ledsMesh = child
				this._ledsMesh.material = this._ledsMaterial
			}
		})

		this._model.name = 'Combination Screen'
		this._model.position.set(0.26, 0.52, -0.795)
		this._model.scale.set(0.132, 0.132, 0.132)
		this._model.rotation.set(0.35, 0.0, 0.0)

		this._scene.add(this._model)

		// Text layers just in front of the glass: round and multiplier in the side slots, messages on top
		this._model.updateMatrixWorld(true)
		const camera = this._experience.camera.instance
		this._statusText = new ScreenText({ screenMesh: this._screenMesh, camera, offset: 0.003, renderOrder: 10 })
		this._text = new ScreenText({ screenMesh: this._screenMesh, camera, offset: 0.004, renderOrder: 11 })
		this._status = { round: 0, multiplier: 1 }
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
			nodes: combinationsScreenNodes,
		})

		this._metalMaterial = new PhongCustomMaterial({
			uniforms: metalSettings,
			name: 'Combi Metal Material',
			defines: {
				USE_ROUGHNESS: false,
				USE_MATCAP: true,
				USE_AO: false,
			},
		})

		this._ledsMaterial = new PhongCustomMaterial({
			uniforms: ledsSettings,
			name: 'Combi Leds Material',
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
