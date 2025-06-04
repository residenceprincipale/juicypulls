import Experience from 'core/Experience.js'
import Environment from 'components/Environment.js'
import Floor from 'components/Floor.js'
import Fox from 'components/Fox/Fox.js'
import Cube from 'components/Cube/Cube.js'
import Machine from '@/webgl/components/Machine/index.js'
import LightsMain from '@/webgl/components/LightsMain/index.js'
import Hands from '@/webgl/components/Hands/index.js'
import CameraPlayer from '@/webgl/components/CameraPlayer/index.js'
import VAT from 'components/VAT'
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
		this._camera.setCamera('sceneCamera')
		this._camera.instance.position.set(0, 0.01, 1.45)
		this._camera.instance.rotation.set(0, 0, 0)

		if (this._debug.active) this._debug.ui.addBlade({ view: 'separator' })

		this._scene.resources.on('ready', () => {
			// Initialize post-processing (including bloom)
			this._experience.renderer.createPostProcessing()

			// components
			this._backgroundEnvironment = new BackgroundEnvironment()
			this._gun = new Gun()
			this._target = new Target()
			this._machine = new Machine()
			this._secondRoulette = new SecondRoulette()
			this._hands = new Hands({ machine: this._machine })

			if (this._debug.active) this._debug.ui.addBlade({ view: 'separator' })

			// managers
			this._machineManager = new MachineManager({
				machine: this._machine,
				secondRoulette: this._secondRoulette,
				hands: this._hands,
			})
			this._shooterManager = new ShooterManager({ gun: this._gun, machine: this._machine })

			// this.cameraPlayer = new CameraPlayer()

			if (window.location.hash === '#debug-dev') {
				this._machine.isDebugDev = true
				console.log('Debug physical parts enabled!')
				this._physicalDebug = new PhysicalDebug()
				this._machineManager._physicalDebug = this._physicalDebug
			}
		})

		this._createEventListeners()

		if (this._debug.active) this.setDebug()
	}

	reset() {}

	start() {
		// animate screens flash
		// light up machine
	}

	startTutorial() {
		// play rigged machine animation
		// display ui panel
	}

	nextStepTutorial() {
		// go to next UI panel
	}

	displayCombinations() {
		// display combinations flash animation
	}

	displayScore() {
		// display score flash animation
	}

	endTutorial() {
		// remove ui panels
	}

	startRound() {
		// animate available tokens and quota
	}

	completeRound() {
		// animate obtained quota
	}

	startShooter() {
		// animate machine out
		// start shooter
		this._machine.animateInnerMachineOut()

		gsap.delayedCall(1.5, () => {
			this._shooterManager.startGame()
		})
	}

	endShooter() {
		// animate machine in
		// start round
	}

	endGame() {}

	lose() {
		if (this._machine) this._machine.animateInnerMachineOut()
		if (this._hands) this._hands.setupFight()
	}

	loseFinal() {}

	startSecondChance() {}

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
		socket.on('start', this.start.bind(this))
		socket.on('start-tutorial', this.startTutorial.bind(this))
		socket.on('display-combinations', this.displayCombinations.bind(this))
		socket.on('display-score', this.displayScore.bind(this))
		socket.on('end-tutorial', this.endTutorial.bind(this))
		socket.on('start-round', this.startRound.bind(this))
		socket.on('complete-round', this.completeRound.bind(this))
		socket.on('start-shooter', this.startShooter.bind(this))
	}

	setDebug() {
		// this._debug.ui.addButton({
		// 	title: 'Bagarre',
		// }).on('click', () => {
		// 	this.lose()
		// });

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
