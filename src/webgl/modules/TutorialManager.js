import bus from 'core/EventBus.js'
import gsap from 'gsap'
import { MAIN_ROULETTE_CONFIG } from './MachineManager'

// Created by Main.start() (the intro); `?skip-intro` skips it
export default class TutorialManager {
	constructor(options = {}) {
		this._machineManager = options.machineManager
		this._machine = options.machine
		this._scene = options.scene

		this._createEventListeners()

		this._setupMachineManager()
	}

	start() {
		this._isStarted = true

		bus.emit('show-message', {
			message: 'PULL THE LEVER',
			size: 'fullscreen',
		})
		this._scene._scene.resources.items.messageAudio.play()
	}

	dispose() {
		this._unsubscribers?.forEach((unsubscribe) => unsubscribe())
		this._unsubscribers = null
	}

	_setupMachineManager() {
		this._machineManager.firstSpinDone = false
		this._machineManager.isLeverLocked = true
		this._machineManager.spinTokens = 1
	}

	_goToHoldStep() {
		bus.emit('show')
		bus.emit('hide-message')

		gsap.delayedCall(1.5, () => {
			bus.emit('show-message', {
				screen: 'score',
				message: 'PRESS BUTTONS TO HOLD WHEELS, \n GET BIG COMBOS',
				size: 'inner',
				modifier: [
					{
						text: 'BUTTONS',
						color: 'yellow',
					},
					{
						text: 'COMBOS',
						color: 'yellow',
					},
				],
			})
			this._scene._scene.resources.items.messageAudio.play()

			this._listenToPoints = true

			// The forced spin puts the cherries on wheels 1–3: prompt their wheels and hold buttons
			;[1, 2, 3].forEach((index) => {
				this._machine.animateWheelBlink({ index, value: true })
				this._scene.machineControls.blinkButton(index, true)
			})
		})
	}

	_goToBankStep() {
		this._isBankStep = true
		this._scene.machineControls.blinkButton(-1, false)

		bus.emit('hide-message', { screen: 'score' })

		bus.emit('show-message', {
			screen: 'combi',
			message: 'BANK ANYTIME TO REACH QUOTA,\nWATCH YOUR JETONS.',
			size: 'inner',
			modifier: [
				{
					text: 'BANK',
					color: 'yellow',
				},
			],
		})
		this._scene._scene.resources.items.messageAudio.play()

		this._listenToBank = true

		gsap.delayedCall(1.5, () => {
			this._machineManager.quota = 1000
		})

		gsap.delayedCall(2, () => {
			this._machineManager.spinTokens = 10
		})
	}

	_goToLastStep() {
		bus.emit('hide-message', { screen: 'combi' })

		gsap.delayedCall(1, () => {
			bus.emit('show-message', {
				screen: 'score',
				message: 'SPIN AT WILL.\nMISS ONCE, LOSE IT ALL.',
				size: 'inner',
			})
			this._scene._scene.resources.items.messageAudio.play()
		})

		gsap.delayedCall(2, () => {
			bus.emit('show-message', {
				screen: 'combi',
				message: 'NOW PULL THE LEVER TO START',
				size: 'inner',
			})
			this._scene._scene.resources.items.messageAudio.play()

			this._machineManager.isLeverLocked = false
			this._listenToLeverStart = true

			this._scene.startGame()
		})
	}

	_endTutorial() {
		this._isStarted = false
		this._listenToLeverStart = false

		bus.emit('hide-message')
	}

	_createEventListeners() {
		this._unsubscribers = [
			bus.on('lever', () => this._leverClickHandler()),
			bus.on('update-rolling-points', (data) => this._updateRollingPoints(data)),
			bus.on('button-collect', () => this._buttonCollectClickHandler()),
		]
	}

	_leverClickHandler() {
		if (!this._isStarted) return

		if (!this._machineManager.firstSpinDone) {
			this._machineManager.firstSpinDone = true
			this._machineManager.isLeverLocked = true
			this._machineManager.spinWheels([5, 2, 2, 2, 3])
			this._goToHoldStep()
		} else if (this._listenToLeverStart) {
			this._endTutorial()
		}
	}

	_updateRollingPoints(data) {
		if (!this._listenToPoints || this._isBankStep) return

		if (data.value === MAIN_ROULETTE_CONFIG.combinationPoints['3🍒']) {
			this._goToBankStep()
		}
	}

	_buttonCollectClickHandler() {
		if (this._listenToBank) {
			this._listenToBank = false
			this._goToLastStep()
		}
	}
}
