import Experience from 'core/Experience.js'
import Environment from 'components/Environment.js'
import Floor from 'components/Floor.js'
import Fox from 'components/Fox/Fox.js'
import Cube from 'components/Cube/Cube.js'
import Machine from '@/webgl/components/Machine/index.js'
import CameraPlayer from '@/webgl/components/CameraPlayer/index.js'
import VAT from 'components/VAT'
import Resources from 'core/Resources.js'
import sources from './sources.json'
import PhysicalMachineParts from '@/webgl/components/PhysicalMachineParts/index.js'
import { Color } from 'three'

export default class Main {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.scene.resources = new Resources(sources)

		this.scene.background = new Color(0x000000);

		// Wait for resources
		this.scene.resources.on('ready', () => {

			this.machine = new Machine()
			// this.cameraPlayer = new CameraPlayer()

			if (window.location.hash === "#debug-dev") {
				this.machine.isDebugDev = true;

				console.log("Debug physical parts enabled!");
				this.physicalMachineParts = new PhysicalMachineParts()
			}
		})
	}

	update() {
		if (this.fox) this.fox.update()
		if (this.physicalMachineParts) this.physicalMachineParts.update()
	}
}
