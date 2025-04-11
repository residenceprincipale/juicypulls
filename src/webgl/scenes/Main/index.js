import Experience from 'core/Experience.js'
import Environment from 'components/Environment.js'
import Floor from 'components/Floor.js'
import Fox from 'components/Fox/Fox.js'
import Cube from 'components/Cube/Cube.js'
import Machine from '@/webgl/components/Machine/index.js'
import Hands from '@/webgl/components/Hands/index.js'
import CameraPlayer from '@/webgl/components/CameraPlayer/index.js'
import VAT from 'components/VAT'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import PhysicalMachineParts from '@/webgl/components/PhysicalMachineParts/index.js'
import { Color } from 'three'
import gsap from 'gsap'

export default class Main {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.scene.resources = new Resources(sources)
		this.debug = this.experience.debug


		// this.scene.background = new Color(0x000000);

		// Wait for resources
		this.scene.resources.on('ready', () => {

			this.machine = new Machine()
			this.hands = new Hands()
			// this.cameraPlayer = new CameraPlayer()

			if (window.location.hash === "#debug-dev") {
				this.machine.isDebugDev = true;

				console.log("Debug physical parts enabled!");
				this.physicalMachineParts = new PhysicalMachineParts()
			}
		})

		if (this.debug.active) this.setDebug()
	}

	update() {
		if (this.fox) this.fox.update()
		if (this.hands) this.hands.update()
		if (this.physicalMachineParts) this.physicalMachineParts.update()
	}

	lose() {
		//TODO: FAIT FULL TIMELINES ADD CLEAN DE FOU

		//TODO: AJOUTE UN TICKET FULL REFACTO
		if (this.machine) this.machine.animateInnerMachineOut()

		if (this.hands) this.hands.setupFight()
	}

	setDebug() {
		this.debug.ui.addButton({
			title: 'Bagarre',
		}).on('click', () => {
			this.lose()
		});
	}
}
