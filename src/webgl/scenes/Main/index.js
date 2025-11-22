import Experience from 'core/Experience.js'
import Machine from '@/webgl/components/Machine/index.js'
import LightsMain from '@/webgl/components/LightsMain/index.js'
import Hands from '@/webgl/components/Hands/index.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import PhysicalDebug from '@/webgl/components/PhysicalDebug/index.js'
import { Color, VSMShadowMap } from 'three'
import gsap from 'gsap'
import MachineManager from '@/webgl/modules/MachineManager'
import SecondRoulette from '@/webgl/components/SecondRoulette'
import BackgroundEnvironment from '@/webgl/components/BackgroundEnvironment/index.js'
import Gun from '@/webgl/components/Gun/index.js'
import Target from '@/webgl/components/Target/index.js'
import ShooterManager from '@/webgl/modules/ShooterManager'
import TutorialManager from '@/webgl/modules/TutorialManager'
import Logo from '@/webgl/components/Logo/index.js'
import ShadowMap from '@/webgl/modules/ShadowMap'

import Socket from '@/scripts/Socket.js'
import ScoreScreen from '@/webgl/components/ScoreScreen'
import ScoreScreenManager from '@/webgl/modules/ScoreScreenManager'
import CombinationsScreen from '@/webgl/components/CombinationsScreen'
import CombinationsScreenManager from '@/webgl/modules/CombinationsScreenManager'

const socket = new Socket()

export default class Main {
	constructor() {
		socket.connect('scene')
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)
		this._debug = this._experience.debug
		this._lights = new LightsMain()
		// this._shadowMap = this._createShadowMap()
		this._camera = this._experience.camera

		this._scene.background = new Color(0x000000)

		if (this._debug.active) this._debug.ui.addBlade({ view: 'separator' })

		this._scene.resources.on('ready', () => {
			this._experience.renderer.createPostProcessing()

			this._backgroundEnvironment = new BackgroundEnvironment()
			this._gun = new Gun()
			// this._target = new Target()
			// this._target.animateIn()
			this._logo = new Logo()
			this._machine = new Machine()

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

			// if (this._debug.active) {
			this._machine.isDebugDev = true
			this._physicalDebug = new PhysicalDebug()
			this._machineManager._physicalDebug = this._physicalDebug
			// }
			this._createEventListeners()

			if (this._debug.active) this.setDebug()

			this._isSecondChanceEnabled = false
			this._hands.hide()

			this.startSkipIntro()
		})
	}

	dispose() {
		console.log('[Main Scene] Starting disposal...')

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
		if (this._physicalDebug && this._physicalDebug.dispose) {
			this._physicalDebug.dispose()
		}
		if (this._tutorialManager && this._tutorialManager.dispose) {
			this._tutorialManager.dispose()
		}

		// Dispose resources
		if (this._scene.resources && this._scene.resources.dispose) {
			this._scene.resources.dispose()
		}

		console.log('[Main Scene] Disposal complete')
	}

	reset() {
		// if (this._logo) this._logo.reset()
	}

	start() {
		// this._lights.turnOff()
		this._machine.turnOffLeds()
		this._machine.hide()
		this._hands.hide()
		this._backgroundEnvironment.hide()
		this._gun.hide()
		this._logo.show()

		this._tutorialInputPressed = false
		this._loseCount = 0
	}

	startSkipIntro() {
		this._logo.hide()

		gsap.delayedCall(2, () => {
			socket.send({
				event: 'show',
				data: {
					immediate: true,
				},
				receiver: ['combi', 'score'],
			})

			this._machineManager.spinTokens = 10
			this._machineManager.quota = 200

			this._machineManager.round = 1
		})
	}

	startTutorial() {
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
		// this._machineManager.startGame()
		// start round ?
		this._machineManager.round = 1
		this._lights.blockColorChange = false
	}

	startRound() {
		// animate available tokens and quota
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
		// reset bulbs
		socket.send({
			event: 'x1',
			receiver: 'bulbs',
		})
		this._machineManager._multiplier = 1
		// animate machine out
		// start shooter
		this._machine.animateInnerMachineOut()
		this._machineManager.isLeverLocked = true
		this._machineManager.isCollectLocked = true
		socket.send({
			event: 'show-message',
			data: {
				size: 'inner',
				message: 'Shooter time',
				modifier: [
					{
						text: 'SHOOT',
						color: 'red',
					},
				],
			},
			receiver: ['score'],
		})
		this._scene.resources.items.messageAudio.play()

		gsap.delayedCall(1.5, () => {
			this._shooterManager.startGame()
			socket.send({
				event: 'show-message',
				data: {
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
				},
				receiver: ['combi'],
			})
			this._scene.resources.items.messageAudio.play()
		})
	}

	endShooter() {
		// animate machine in
		// start round

		console.log('END SHOOTER')
		console.log('start round', this._machineManager.round)

		this._machineManager.quota = this._machineManager.quota += 400
		this._machineManager.isLeverLocked = false
		this._machineManager.isCollectLocked = false
	}

	endGame() {}

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
		this._machineManager.quota = this._machineManager.quota += 400
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
		socket.send({
			event: 'lose-final',
		})
	}

	triggerFlashlightView() {
		this._camera.instance.position.x = gsap.to(this._camera.instance.position, {
			x: 1.36,
			duration: 1,
			ease: 'Power2.inOut',
		})
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
		if (this._fox) this.fox.update(timeData)
		if (this._gun) this._gun.update(timeData)
		if (this._hands) this._hands.update(timeData)
		if (this._physicalDebug) this._physicalDebug.update(timeData)
		if (this._lights) this._lights.update(timeData)
		if (this._shooterManager) this._shooterManager.update(timeData)

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
		socket.on('reset', this.reset.bind(this))
		socket.on('start-round', this.startRound.bind(this))
		socket.on('complete-round', this.completeRound.bind(this))
		socket.on('start-shooter', this.startShooter.bind(this))

		// listen to any button input event from socket
		socket.on('button', this.handleButtonInput.bind(this))
	}

	_disposeEventListeners() {
		socket.off('reset', this.reset.bind(this))
		socket.off('start-round', this.startRound.bind(this))
		socket.off('complete-round', this.completeRound.bind(this))
		socket.off('start-shooter', this.startShooter.bind(this))

		// listen to any buttoff input event from socket
		socket.off('button', this.handleButtonInput.bind(this))
	}

	setDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Game Events',
			expanded: false,
		})
		folder
			.addButton({
				title: 'Trigger Flashlight',
			})
			.on('click', () => {
				this.triggerFlashlightView()
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
		folder
			.addButton({
				title: 'End Game',
			})
			.on('click', () => {
				this.endGame()
			})
		folder
			.addButton({
				title: 'Reset',
			})
			.on('click', () => {
				this.reset()
			})
	}
}
