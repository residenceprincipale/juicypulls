import Experience from 'core/Experience.js'
import bus from 'core/EventBus.js'
import Machine from '@/webgl/components/Machine/index.js'
import LightsMain from '@/webgl/components/LightsMain/index.js'
import Hands from '@/webgl/components/Hands/index.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import MachineControls from '@/webgl/components/MachineControls/index.js'
import { Box3, Color } from 'three'
import gsap from 'gsap'
import MachineManager from '@/webgl/modules/MachineManager'
import SecondRoulette from '@/webgl/components/SecondRoulette'
import BackgroundEnvironment from '@/webgl/components/BackgroundEnvironment/index.js'
import Gun from '@/webgl/components/Gun/index.js'
import ShooterManager from '@/webgl/modules/ShooterManager'
import TutorialManager from '@/webgl/modules/TutorialManager'
import Logo from '@/webgl/components/Logo/index.js'
import Flashlight from '@/webgl/components/Flashlight/index.js'

import ScoreScreen from '@/webgl/components/ScoreScreen'
import ScoreScreenManager from '@/webgl/modules/ScoreScreenManager'
import CombinationsScreen from '@/webgl/components/CombinationsScreen'
import CombinationsScreenManager from '@/webgl/modules/CombinationsScreenManager'
import FlashlightManager from '@/webgl/modules/FlashLightManager'

// Hold button that blinks during the intro (the middle one)
const INTRO_BUTTON_INDEX = 2
// Buttons kept in view with the two screens and the lever knob, for any window shape
const FRAMED_BUTTONS = ['BOUTON_1', 'BOUTON_2', 'BOUTON_3', 'BOUTON_4', 'BOUTON_5', 'BOUTON_COLLECT']

export default class Main {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)
		this._debug = this._experience.debug
		this._lights = new LightsMain()
		this._camera = this._experience.camera

		this._scene.background = new Color(0x000000)

		if (this._debug.active) this._debug.ui.addBlade({ view: 'separator' })

		this._scene.resources.on('ready', () => {
			this._experience.renderer.createPostProcessing()

			this._backgroundEnvironment = new BackgroundEnvironment()
			this._gun = new Gun()
			this._logo = new Logo()
			this._machine = new Machine()
			this._flashlight = new Flashlight()

			// Left Machine Screen
			this.scoreScreen = new ScoreScreen()
			this.scoreScreenManager = new ScoreScreenManager()
			this.scoreScreenManager.screen = this.scoreScreen

			// Right Machine Screen
			this.combinationsScreen = new CombinationsScreen()
			this.combinationsScreenManager = new CombinationsScreenManager()
			this.combinationsScreenManager.screen = this.combinationsScreen

			this._secondRoulette = new SecondRoulette()
			this._hands = new Hands({ machine: this._machine })

			if (this._debug.active) this._debug.ui.addBlade({ view: 'separator' })

			// managers
			this._machineManager = new MachineManager({
				machine: this._machine,
				secondRoulette: this._secondRoulette,
				hands: this._hands,
				scene: this,
			})

			this._shooterManager = new ShooterManager({
				gun: this._gun,
				machine: this._machine,
				scene: this,
				machineManager: this._machineManager,
			})

			this._flashlightManager = new FlashlightManager({
				light: this._lights.spotLightTorch,
				flashlightModel: this._flashlight,
			})

			// Lever, hold buttons and collect button of the cabinet (mouse, touch and keyboard)
			this._machineControls = new MachineControls({
				machine: this._machine,
				machineManager: this._machineManager,
			})

			this._createEventListeners()
			this._frameMachine()

			if (this._debug.active) this.setDebug()

			this._isSecondChanceEnabled = false
			this._hands.hide()

			// `?skip-intro` jumps straight into a game (development and tests)
			if (new URLSearchParams(location.search).has('skip-intro')) this.startSkipIntro()
			else this.start()
		})
	}

	get machineControls() {
		return this._machineControls
	}

	dispose() {
		console.log('[Main Scene] Starting disposal...')

		console.clear()

		// Dispose event listeners
		this._disposeEventListeners()

		// Kill all GSAP timelines and delayed calls
		gsap.killTweensOf(this)
		gsap.globalTimeline.clear()

		// Dispose all components
		if (this._lights && this._lights.dispose) {
			this._lights.dispose()
		}
		if (this._backgroundEnvironment && this._backgroundEnvironment.dispose) {
			this._backgroundEnvironment.dispose()
		}
		if (this._gun && this._gun.dispose) {
			this._gun.dispose()
		}
		if (this._logo && this._logo.dispose) {
			this._logo.dispose()
		}
		if (this._machine && this._machine.dispose) {
			this._machine.dispose()
		}
		if (this.scoreScreen && this.scoreScreen.dispose) {
			this.scoreScreen.dispose()
		}
		if (this.scoreScreenManager && this.scoreScreenManager.dispose) {
			this.scoreScreenManager.dispose()
		}
		if (this.combinationsScreen && this.combinationsScreen.dispose) {
			this.combinationsScreen.dispose()
		}
		if (this.combinationsScreenManager && this.combinationsScreenManager.dispose) {
			this.combinationsScreenManager.dispose()
		}
		if (this._secondRoulette && this._secondRoulette.dispose) {
			this._secondRoulette.dispose()
		}
		if (this._hands && this._hands.dispose) {
			this._hands.dispose()
		}
		if (this._machineManager && this._machineManager.dispose) {
			this._machineManager.dispose()
		}
		if (this._shooterManager && this._shooterManager.dispose) {
			this._shooterManager.dispose()
		}
		if (this._machineControls && this._machineControls.dispose) {
			this._machineControls.dispose()
		}
		if (this._tutorialManager && this._tutorialManager.dispose) {
			this._tutorialManager.dispose()
		}
		if (this._flashlightManager && this._flashlightManager.dispose) {
			this._flashlightManager.dispose()
		}

		// Dispose resources
		if (this._scene.resources && this._scene.resources.dispose) {
			this._scene.resources.dispose()
		}

		console.log('[Main Scene] Disposal complete')
	}

	/**
	 * Intro: the machine is off and one hold button blinks. The first input (that press, or any other control)
	 * powers it on and starts the tutorial. That first input also unlocks the browser audio (Howler unlocks on it).
	 */
	start() {
		// this._lights.turnOff()
		this._machine.turnOffLeds()
		this._machine.hide()
		this._hands.hide()
		this._backgroundEnvironment.hide()
		this._gun.hide()
		this._logo.show()
		bus.emit('hide')

		this._tutorialManager = new TutorialManager({
			machineManager: this._machineManager,
			machine: this._machine,
			scene: this,
		})
		this._machineControls.blinkButton(INTRO_BUTTON_INDEX, true)

		this._isPlayingTutorial = true
		this._tutorialInputPressed = false
		this._loseCount = 0
	}

	startSkipIntro() {
		this._logo.hide()

		gsap.delayedCall(2, () => {
			bus.emit('show')

			this._machineManager.spinTokens = 10
			this._machineManager.quota = 200

			this._machineManager.round = 1
			this._flashlightManager.enabled = true
		})
	}

	startTutorial() {
		this._machineControls.blinkButton(INTRO_BUTTON_INDEX, false)
		this._logo.hide()
		this._lights.blockColorChange = true

		gsap.delayedCall(1.5, () => {
			this._lights.turnOff({ immediate: true })
			this._machine.show()
			this._backgroundEnvironment.show()
		})

		gsap.delayedCall(2.5, () => {
			this._lights.turnOn()
		})

		gsap.delayedCall(3.5, () => {
			this._machine.turnOnLeds()
		})

		gsap.delayedCall(4.5, () => {
			this._tutorialManager.start()
		})
	}

	startGame() {
		this._machineManager.round = 1
		this._lights.blockColorChange = false
		this._flashlightManager.enabled = true
	}

	completeRound(options) {
		// animate obtained quota
		console.log('COMPLETE ROUND :', options.index)

		// showw shooter indications on top screens
		// animate lights
		this._machineManager.collectedPoints = 0
		this._gun.show()

		this.startShooter()
	}

	startShooter() {
		// reset multiplier
		this._machineManager.multiplier = 1
		// animate machine out
		// start shooter
		this._machine.animateInnerMachineOut()
		this._machineManager.isLeverLocked = true
		this._machineManager.isCollectLocked = true
		bus.emit('show-message', {
			screen: 'score',
			size: 'inner',
			message: 'Shooter time',
			modifier: [
				{
					text: 'SHOOT',
					color: 'red',
				},
			],
		})
		this._scene.resources.items.messageAudio.play()

		gsap.delayedCall(1.5, () => {
			this._shooterManager.startGame()
			bus.emit('show-message', {
				screen: 'combi',
				message: 'USE YOUR BUTTONS. <BR> THEY’RE JUST TARGETS. <BR> 1 TARGET = 1 JETONS.',
				modifier: [
					{
						text: 'BUTTONS',
						color: 'yellow',
					},
					{
						text: 'JETONS',
						color: 'yellow',
					},
				],
			})
			this._scene.resources.items.messageAudio.play()
		})
	}

	endShooter() {
		// animate machine in
		// start round

		console.log('END SHOOTER')
		console.log('start round', this._machineManager.round)

		this._machineManager.quota += 400
		this._machineManager.isLeverLocked = false
		this._machineManager.isCollectLocked = false
	}

	lose() {
		console.log('LOSE GAME')
		if (this._isSecondChanceEnabled) {
			this._loseCount += 1
			this._hands.show()
			if (this._machine) this._machine.animateInnerMachineOut()
			if (this._hands) this._hands.setupFight()
			this._machineManager.isLeverLocked = true
		} else {
			this.loseFinal()
		}
	}

	respawn() {
		console.log('RESPAWN')
		this._machineManager.quota += 400
		this._machineManager.spinTokens = 3
		this._machineManager.isLeverLocked = false
	}

	async loseFinal() {
		console.log('LOSE FINAL')

		// turn outer leds to red
		// flsah scene lights on start to red and flash red

		this._machine.turnOffLeds()
		this._backgroundEnvironment.hide()
		this._machine.changeOuterLedsColor('#ff0000')
		await this._machine.animateInnerMachineOut()
		this._lights.animateLoseFinal()
		bus.emit('lose-final')
	}

	// Debug: leans out to the casino and back (the game does it when the pointer rests on the window edges)
	toggleFlashlightView() {
		this._flashlightManager.lookAside(!this._flashlightManager.isLookingAside)
	}

	triggerFarkle() {
		this._machineManager.spinWheels([1, 1, 1, 1, 1])
	}

	triggerJackpot() {
		this._machineManager.spinWheels([5, 5, 5, 5, 5])
	}
	triggerX4() {
		this._machineManager.spinWheels([3, 3, 3, 3, 5])
	}
	triggerX3() {
		this._machineManager.spinWheels([4, 4, 4, 3, 5])
	}

	trigger777() {
		this._machineManager.spinWheels([2, 0, 0, 0, 3])
	}

	update() {
		const timeData = {
			deltaTime: this._experience.time.delta,
			elapsedTime: this._experience.time.elapsed,
		}
		if (this._gun) this._gun.update(timeData)
		if (this._hands) this._hands.update(timeData)
		if (this._lights) this._lights.update(timeData)
		if (this._shooterManager) this._shooterManager.update(timeData)
		if (this._flashlightManager) this._flashlightManager.update(timeData)
		if (this._flashlight) this._flashlight.update(timeData)
		if (this._machineControls) this._machineControls.update(timeData)

		if (this.scoreScreen) this.scoreScreen.update()
		if (this.combinationsScreen) this.combinationsScreen.update()
	}

	handleButtonInput(button) {
		if (!this._tutorialInputPressed && this._isPlayingTutorial) {
			this._tutorialInputPressed = true
			this.startTutorial()
		}
	}

	/**
	 * Private
	 */

	_createEventListeners() {
		this._unsubscribers = [
			// any button press starts the tutorial
			// Any control powers the machine on during the intro
			bus.on('button', (data) => this.handleButtonInput(data)),
			bus.on('lever', () => this.handleButtonInput()),
			bus.on('button-collect', () => this.handleButtonInput()),
		]
	}

	// Fits the camera to the screens, buttons and lever, for any window shape
	_frameMachine() {
		// World matrices aren't computed before the first render
		this._scene.updateMatrixWorld(true)
		const cabinet = this._machine.cabinetModel
		const box = new Box3()
		box.expandByObject(this.scoreScreen.model)
		box.expandByObject(this.combinationsScreen.model)
		FRAMED_BUTTONS.forEach((name) => box.expandByObject(cabinet.getObjectByName(name)))

		// The lever's knob must stay clickable, but its base can go below the frame
		const lever = new Box3().expandByObject(cabinet.getObjectByName('MANCHE'))
		lever.min.y = Math.max(lever.min.y, box.min.y)
		box.union(lever)

		this._camera.setFraming(box)
	}

	_disposeEventListeners() {
		this._unsubscribers?.forEach((unsubscribe) => unsubscribe())
		this._unsubscribers = null
	}

	setDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Game Events',
			expanded: false,
		})
		folder
			.addButton({
				title: 'Toggle Flashlight View',
			})
			.on('click', () => {
				this.toggleFlashlightView()
			})
		folder
			.addButton({
				title: 'Trigger Farkle',
			})
			.on('click', () => {
				this.triggerFarkle()
			})
		folder
			.addButton({
				title: 'Trigger Jackpot',
			})
			.on('click', () => {
				this.triggerJackpot()
			})
		folder
			.addButton({
				title: 'Trigger x3',
			})
			.on('click', () => {
				this.triggerX3()
			})
		folder
			.addButton({
				title: 'Trigger x4',
			})
			.on('click', () => {
				this.triggerX4()
			})
		folder
			.addButton({
				title: 'Trigger "777"',
			})
			.on('click', () => {
				this.trigger777()
			})
		folder
			.addButton({
				title: 'Start Shooter',
			})
			.on('click', () => {
				this.startShooter()
			})
		folder
			.addButton({
				title: 'End Shooter',
			})
			.on('click', () => {
				this.endShooter()
			})
		folder
			.addButton({
				title: 'Lose',
			})
			.on('click', () => {
				this.lose()
			})
		folder
			.addButton({
				title: 'Lose Final',
			})
			.on('click', () => {
				this.loseFinal()
			})
	}
}
