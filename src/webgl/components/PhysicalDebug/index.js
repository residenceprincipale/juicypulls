import Experience from 'core/Experience.js'
import bus from 'core/EventBus.js'
import { Color, MeshBasicMaterial, MeshMatcapMaterial, MeshPhongMaterial } from 'three'
import gsap from 'gsap'

// Hold buttons 0–4 on the number row, matched by physical key (AZERTY `& é " ' (`, QWERTY `1 2 3 4 5`)
const BUTTON_KEY_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']

/**
 * Lever, hold buttons and collect button of the machine.
 * The model is hidden, but its meshes still receive clicks (raycasting ignores visibility).
 * They sit off-screen from the machine view, so clicking doesn't work until the 3D buttons are built.
 * Keyboard: Space = lever, Enter = collect, number row = hold buttons.
 */
export default class PhysicalDebug {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._buttonLightsEnabled = Array(5).fill(false)

		this._resource = this._resources.items.physicalPartsModel

		this._createMaterials()
		this._createModel()
		this._createInteraction()
		this._createEventListeners()
	}

	/**
	 * Public
	 */
	dispose() {
		this._unsubscribers?.forEach((unsubscribe) => unsubscribe())
		this._unsubscribers = null
		window.removeEventListener('keydown', this._keydownHandler)
	}

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resource.scene
		this._model.name = 'physical machine parts'
		this._scene.add(this._model)
		this._model.visible = false

		this._leds = []

		this._model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name.includes('led')) {
				this._leds.push(child)
			} else if (child.name.includes('base')) {
				child.material = new MeshMatcapMaterial({ matcap: this._resources.items.goldMatcap })
			} else if (child.name.includes('collect')) {
				this._collectButton = child
			} else if (child.name.includes('machine')) {
				child.material = new MeshBasicMaterial({ color: new Color(0x000000) })
			} else if (child.name.includes('lever')) {
				this._lever = child
				child.material = new MeshPhongMaterial({ color: new Color(0x444444) })
			} else if (child.name.includes('ball')) {
				child.material = new MeshPhongMaterial({ color: new Color(0xff0000) })
			}
		})

		this._leds.forEach((led) => {
			led.material = this._ledWhiteMaterial
			led.isWhite = true
		})
	}

	_createMaterials() {
		this._ledMaterials = [
			new MeshBasicMaterial({ color: 0xffff00 }), // Yellow
			new MeshBasicMaterial({ color: 0xff0000 }), // Red
			new MeshBasicMaterial({ color: 0x0000ff }), // Blue
			new MeshBasicMaterial({ color: 0x008000 }), // Green
			new MeshBasicMaterial({ color: 0xff00f0 }), // Orange
		]

		this._ledWhiteMaterial = new MeshBasicMaterial({ color: 0xffffff })
	}

	_createInteraction() {
		this._experience.interactionManager.addInteractiveObject(this._lever)
		this._lever.addEventListener('click', () => {
			this._leverClickHandler()
		})

		this._experience.interactionManager.addInteractiveObject(this._collectButton)
		this._collectButton.addEventListener('click', () => {
			this._collectButtonClickHandler()
		})

		this._leds.forEach((led, index) => {
			this._experience.interactionManager.addInteractiveObject(led)
			led.addEventListener('click', () => {
				this._pressButton(index)
			})
		})
	}

	_pressButton(index) {
		if (this._buttonLightsEnabled[index]) {
			const led = this._leds[index]
			led.isWhite = !led.isWhite
			led.material = led.isWhite ? this._ledWhiteMaterial : this._ledMaterials[index]
		}

		bus.emit('button', { index })
	}

	_leverClickHandler() {
		if (this._isCliked) return
		this._isCliked = true

		gsap.killTweensOf(this._lever.rotation)
		gsap.to(this._lever.rotation, {
			duration: 0.5,
			x: -1.5,
			ease: 'power1.inOut',
			yoyo: true,
			repeat: 1,
		})

		gsap.delayedCall(0.15, () => {
			bus.emit('lever')
		})

		gsap.delayedCall(1, () => {
			this._isCliked = false
		})
	}

	_collectButtonClickHandler() {
		this._collectButton.material.color.set(0x008000)

		gsap.delayedCall(0.1, () => {
			this._collectButton.material.color.set(0xffffff)
		})

		bus.emit('button-collect')
	}

	_createEventListeners() {
		this._keydownHandler = (e) => {
			if (e.repeat) return

			const buttonIndex = BUTTON_KEY_CODES.indexOf(e.code)
			if (buttonIndex !== -1) {
				this._pressButton(buttonIndex)
			} else if (e.key === 'Enter') {
				this._collectButtonClickHandler()
			} else if (e.key === ' ') {
				e.preventDefault() // Empêche le scroll par défaut de la barre d'espace
				this._leverClickHandler()
			}
		}
		window.addEventListener('keydown', this._keydownHandler)

		this._unsubscribers = [bus.on('button-lights-enabled', (data) => this._buttonLightsEnabledHandler(data))]
	}

	_buttonLightsEnabledHandler({ value, index }) {
		if (index === -1) {
			this._buttonLightsEnabled.fill(value)
			this._leds.forEach((led) => {
				led.material = this._ledWhiteMaterial
				led.isWhite = true
			})
		} else {
			this._buttonLightsEnabled[index] = value
		}
	}
}
