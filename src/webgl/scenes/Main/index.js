import Experience from 'core/Experience.js'
import Machine from '@/webgl/components/Machine/index.js'
import LightsMain from '@/webgl/components/LightsMain/index.js'
import Hands from '@/webgl/components/Hands/index.js'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import PhysicalDebug from '@/webgl/components/PhysicalDebug/index.js'
import { Color } from 'three'
import gsap from 'gsap'
import MachineManager from '@/webgl/modules/MachineManager'
import SecondRoulette from '@/webgl/components/SecondRoulette'
import BackgroundEnvironment from '@/webgl/components/BackgroundEnvironment/index.js'
import Gun from '@/webgl/components/Gun/index.js'
import Target from '@/webgl/components/Target/index.js'
import ShooterManager from '@/webgl/modules/ShooterManager'
import TutorialManager from '@/webgl/modules/TutorialManager'
import Logo from '@/webgl/components/Logo/index.js'

import Socket from '@/scripts/Socket.js'

const socket = new Socket()

export default class Main {
	constructor() {
		socket.connect('scene')
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
			this._target = new Target()
			this._logo = new Logo()
			this._machine = new Machine()
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

			if (this._debug.active) {
				this._machine.isDebugDev = true
				this._physicalDebug = new PhysicalDebug()
				this._machineManager._physicalDebug = this._physicalDebug
			}
			this._createEventListeners()

			if (this._debug.active) this.setDebug()

			if (this._debug.tutorialActive || !this._debug.active) {
				this._tutorialManager = new TutorialManager({ machineManager: this._machineManager, machine: this._machine, scene: this })
				this.start()

				this._isPlayingTutorial = true
			} else {
				this.startSkipIntro()
			}
		})
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

		gsap.delayedCall(1.5, () => {
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
		// animate machine out
		// start shooter
		this._machine.animateInnerMachineOut()
		this._machineManager.isLeverLocked = true

		gsap.delayedCall(1.5, () => {
			this._shooterManager.startGame()
		})
	}

	endShooter() {
		// animate machine in
		// start round

		console.log('END SHOOTER')
		console.log('start round', this._machineManager.round)

		this._machineManager.quota = this._machineManager.quota += 400
		this._machineManager.isLeverLocked = false
	}

	endGame() { }

	lose() {
		console.log('LOSE GAME')
		this._loseCount += 1
		this._hands.show()
		if (this._machine) this._machine.animateInnerMachineOut()
		if (this._hands) this._hands.setupFight()
		this._machineManager.isLeverLocked = true
	}

	respawn() {
		console.log('RESPAWN')
		this._machineManager.quota = this._machineManager.quota += 400
		this._machineManager.spinTokens = 3
		this._machineManager.isLeverLocked = false
	}

	loseFinal() {
		console.log('LOSE FINAL')

		this._machineManager.turnOffLeds()
		this._lights.turnOff()
	}

	startSecondChance() { }

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
	}

	_createEventListeners() {
		socket.on('reset', this.reset.bind(this))
		socket.on('start-round', this.startRound.bind(this))
		socket.on('complete-round', this.completeRound.bind(this))
		socket.on('start-shooter', this.startShooter.bind(this))

		// listen to any button input event from socket
		socket.on('button', this.handleButtonInput.bind(this))
	}

	handleButtonInput(button) {
		if (!this._tutorialInputPressed && this._isPlayingTutorial) {
			this._tutorialInputPressed = true
			this.startTutorial()
		}
	}

	setDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Game Events',
			expanded: false,
		})
		folder
			.addButton({
				title: 'Start',
			})
			.on('click', () => {
				this.start()
			})

		folder
			.addButton({
				title: 'Start Tutorial',
			})
			.on('click', () => {
				this.startTutorial()
			})
		folder
			.addButton({
				title: 'Display Combinations',
			})
			.on('click', () => {
				this.displayCombinations()
			})
		folder
			.addButton({
				title: 'Display Score',
			})
			.on('click', () => {
				this.displayScore()
			})
		folder
			.addButton({
				title: 'End Tutorial',
			})
			.on('click', () => {
				this.endTutorial()
			})

		folder
			.addButton({
				title: 'Start Round',
			})
			.on('click', () => {
				this.startRound()
			})
		folder
			.addButton({
				title: 'Complete Round',
			})
			.on('click', () => {
				this.completeRound()
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
				title: 'Start Second Chance',
			})
			.on('click', () => {
				this.startSecondChance()
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
