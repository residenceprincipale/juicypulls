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

export default class Main {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._scene.resources = new Resources(sources)
		this._debug = this._experience.debug
		this._lights = new LightsMain()

		this._camera = this._experience.camera
		console.log(this._camera)
		this._camera.setCamera('sceneCamera')
		this._camera.instance.position.set(0, 0.01, 1.45)
		this._camera.instance.rotation.set(0, 0, 0)

		this._scene.resources.on('ready', () => {

			this._backgroundEnvironment = new BackgroundEnvironment()
			this._gun = new Gun()
			this._target = new Target()
			this._machine = new Machine()
			this._secondRoulette = new SecondRoulette()
			this._hands = new Hands({ machine: this._machine })
			this._machineManager = new MachineManager({ machine: this._machine, secondRoulette: this._secondRoulette, hands: this._hands })
			this._shooterManager = new ShooterManager({ gun: this._gun, machine: this._machine })

			// this.cameraPlayer = new CameraPlayer()

			if (window.location.hash === "#debug-dev") {
				this._machine.isDebugDev = true;
				console.log("Debug physical parts enabled!");
				this._physicalDebug = new PhysicalDebug()
				this._machineManager._physicalDebug = this._physicalDebug;
			}
		})

		if (this._debug.active) this.setDebug()
	}

	update() {
		if (this._fox) this.fox.update()
		if (this._gun) this._gun.update()
		if (this._hands) this._hands.update()
		if (this._physicalDebug) this._physicalDebug.update()
		if (this._lights) this._lights.update()
		if (this._shooterManager) this._shooterManager.update()
	}

	lose() {
		if (this._machine) this._machine.animateInnerMachineOut()
		if (this._hands) this._hands.setupFight()
	}

	setDebug() {
		this._debug.ui.addButton({
			title: 'Bagarre',
		}).on('click', () => {
			this.lose()
		});
	}
}
