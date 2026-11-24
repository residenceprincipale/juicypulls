import Experience from 'core/Experience.js'
import bus from 'core/EventBus.js'
import gsap from 'gsap'
import { BoxGeometry, Color, Mesh, MeshBasicMaterial, Vector3 } from 'three'

// Hold buttons 0–4 on the number row, matched by physical key (AZERTY `& é " ' (`, QWERTY `1 2 3 4 5`)
const BUTTON_KEY_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']
// LED colors of the original cabinet's buttons
const BUTTON_COLORS = ['#ffff00', '#ff0000', '#0000ff', '#00ff40', '#ff00f0']
const COLLECT_COLOR = '#ffffff'
const GLOW_INTENSITY = 0.6
// Travel of a pressed button along its own axis, in meters
const PRESS_DEPTH = 0.008
// Lever swing toward the player, in radians
const LEVER_PULL_ANGLE = 0.9
// Blink period of a prompted button, in ms
const BLINK_PERIOD = 800

/**
 * The machine's controls: the 5 hold buttons, the collect button and the lever of the cabinet model.
 * Mouse/touch: click them. Keyboard: Space = lever, Enter = collect, number row = hold buttons.
 * A hold button glows while its wheel is held, the collect button while there are points to bank.
 */
export default class MachineControls {
	constructor({ machine, machineManager }) {
		this._experience = new Experience()
		this._interactionManager = this._experience.interactionManager
		this._machine = machine
		this._machineManager = machineManager
		this._cabinet = machine.cabinetModel

		this._enabled = true
		this._blinkingIndexes = new Set()

		this._createButtons()
		this._createLever()
		this._createInteraction()
		this._createEventListeners()
	}

	/**
	 * Getters & Setters
	 */
	get enabled() {
		return this._enabled
	}

	// Pointer input only: the keyboard keeps working (it brings the player back to the machine)
	set enabled(value) {
		this._enabled = value
		this._getMeshes().forEach((mesh) => (mesh.userData.interactive = value))
	}

	/**
	 * Public
	 */
	// Makes a hold button blink to prompt the player (index -1 = all)
	blinkButton(index, value) {
		const indexes = index === -1 ? this._buttons.map((_, i) => i) : [index]
		indexes.forEach((i) => (value ? this._blinkingIndexes.add(i) : this._blinkingIndexes.delete(i)))
	}

	pressButton(index) {
		this._animatePress(this._buttons[index])
		bus.emit('button', { index })
	}

	pressCollect() {
		this._animatePress(this._collect)
		bus.emit('button-collect')
	}

	pullLever() {
		if (this._leverTimeline?.isActive()) return

		this._leverTimeline = gsap.timeline()
		this._leverTimeline.to(this._lever.rotation, {
			x: this._leverRestRotation + LEVER_PULL_ANGLE,
			duration: 0.25,
			ease: 'power2.in',
		})
		this._leverTimeline.call(() => bus.emit('lever'))
		this._leverTimeline.to(this._lever.rotation, {
			x: this._leverRestRotation,
			duration: 0.6,
			ease: 'back.out(2)',
		})
	}

	update({ elapsedTime }) {
		const blinkOn = Math.floor(elapsedTime / (BLINK_PERIOD / 2)) % 2 === 0

		this._buttons.forEach((button, index) => {
			const isHeld = this._machine.wheels[index]?.isLocked
			const isBlinking = this._blinkingIndexes.has(index) && blinkOn
			this._setGlow(button, isHeld || isBlinking)
		})

		const canCollect = this._machineManager.currentSpins > 0 && this._machineManager.rollingPoints > 0
		this._setGlow(this._collect, canCollect)
	}

	dispose() {
		this._unsubscribers?.forEach((unsubscribe) => unsubscribe())
		this._unsubscribers = null
		window.removeEventListener('keydown', this._keydownHandler)
		this._getMeshes().forEach((mesh) => this._interactionManager.removeInteractiveObject(mesh))
		this._leverTimeline?.kill()
		this._leverHitArea.geometry.dispose()
		this._leverHitArea.material.dispose()
		;[...this._buttons, this._collect].forEach((control) => {
			control.pressTimeline?.kill()
			control.mesh.material.dispose()
			control.bloomMaterial.dispose()
		})
	}

	/**
	 * Private
	 */
	_createButtons() {
		this._buttons = BUTTON_COLORS.map((color, index) =>
			this._createControl(this._cabinet.getObjectByName(`BOUTON_${index + 1}`), color),
		)
		this._collect = this._createControl(this._cabinet.getObjectByName('BOUTON_COLLECT'), COLLECT_COLOR)
	}

	_createControl(mesh, color) {
		// Own material for the glow, sharing every other uniform with the cabinet material (so its debug still applies)
		const sharedMaterial = mesh.material
		mesh.material = sharedMaterial.clone()
		mesh.material.uniforms = { ...sharedMaterial.uniforms, uEmissiveColor: { value: new Color(0x000000) } }

		const direction = new Vector3(0, 0, 1).applyQuaternion(mesh.quaternion)

		return {
			mesh,
			color: new Color(color),
			bloomMaterial: new MeshBasicMaterial({ color }),
			isGlowing: false,
			restPosition: mesh.position.clone(),
			pressedPosition: mesh.position.clone().addScaledVector(direction, PRESS_DEPTH),
		}
	}

	_createLever() {
		this._lever = this._cabinet.getObjectByName('MANCHE')
		this._leverRestRotation = this._lever.rotation.x

		// The shaft is thin on screen: an invisible box around the whole lever makes it easy to grab
		this._lever.geometry.computeBoundingBox()
		const box = this._lever.geometry.boundingBox
		const size = box.getSize(new Vector3())
		this._leverHitArea = new Mesh(new BoxGeometry(size.x, size.y, size.z), new MeshBasicMaterial({ visible: false }))
		this._leverHitArea.name = 'lever hit area'
		this._leverHitArea.userData.renderBloom = false
		box.getCenter(this._leverHitArea.position)
		this._lever.add(this._leverHitArea)
	}

	_setGlow(control, value) {
		if (control.isGlowing === value) return
		control.isGlowing = value

		const emissive = control.mesh.material.uniforms.uEmissiveColor.value
		if (value) {
			emissive.copy(control.color).multiplyScalar(GLOW_INTENSITY)
			control.mesh.userData.renderBloom = true
			control.mesh.userData.bloomMaterial = control.bloomMaterial
		} else {
			emissive.setRGB(0, 0, 0)
			delete control.mesh.userData.renderBloom
			delete control.mesh.userData.bloomMaterial
		}
	}

	_animatePress(control) {
		control.pressTimeline?.kill()
		control.pressTimeline = gsap.timeline()
		control.pressTimeline.to(control.mesh.position, { ...this._toXYZ(control.pressedPosition), duration: 0.06 })
		control.pressTimeline.to(control.mesh.position, { ...this._toXYZ(control.restPosition), duration: 0.14 })
	}

	_toXYZ({ x, y, z }) {
		return { x, y, z }
	}

	_getMeshes() {
		return [...this._buttons.map((button) => button.mesh), this._collect.mesh, this._lever]
	}

	_createInteraction() {
		this._buttons.forEach((button, index) => {
			button.mesh.addEventListener('click', () => this.pressButton(index))
		})
		this._collect.mesh.addEventListener('click', () => this.pressCollect())
		this._lever.addEventListener('click', () => this.pullLever())

		this._getMeshes().forEach((mesh) => this._interactionManager.addInteractiveObject(mesh))
	}

	_createEventListeners() {
		this._keydownHandler = (event) => {
			if (event.repeat) return

			const buttonIndex = BUTTON_KEY_CODES.indexOf(event.code)
			if (buttonIndex !== -1) {
				this.pressButton(buttonIndex)
			} else if (event.key === 'Enter') {
				this.pressCollect()
			} else if (event.key === ' ') {
				event.preventDefault() // Space would scroll the page
				this.pullLever()
			}
		}
		window.addEventListener('keydown', this._keydownHandler)

		// No clicking the machine while leaning out to the casino
		this._unsubscribers = [bus.on('look-aside', ({ value }) => (this.enabled = !value))]
	}
}
