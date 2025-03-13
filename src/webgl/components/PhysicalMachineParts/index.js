import Experience from 'core/Experience.js'
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'

export default class PhysicalMachineParts {
	constructor(_position = new Vector3(0, 0, 0)) {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.debug = this.experience.debug
		this.resources = this.scene.resources
		this.machine = this.experience.activeScene.machine

		this.position = _position

		this.numWheels = 5;

		// de bas en haut sur la texture (depend des uvs de la roulette et de la base rotation offset)
		// this.wheelEmojis = ["🍌", "🍊", "🔺", "🍏", "7️⃣", "❤️"];
		//reversed version
		this.wheelEmojis = ["", "7️⃣", "🍏", "🔺", "🍊", "🍌"];
		this.wheelEmojis = ["🔴", "👑", "💎", "💀", "👁️"];
		// reverse the array
		this.wheelEmojis = this.wheelEmojis.reverse();

		this.symbolValues = {
			"jeton": 100, // Jeton
			"couronne": 50,  // Couronne
			"diamant": 0,   // Diamant
			"crane": "malus", // Crâne
			"oeuil": "special" // Œil
		};
		this.symbolNames = [
			'oeuil',
			'crane',
			'diamant',
			'couronne',
			'jeton',
		]

		this.resource = this.resources.items.physicalPartsModel

		this.ledMaterials = [
			new MeshBasicMaterial({ color: 0xffff00 }), // Yellow
			new MeshBasicMaterial({ color: 0xff0000 }), // Red
			new MeshBasicMaterial({ color: 0x0000ff }), // Blue
			new MeshBasicMaterial({ color: 0x008000 }), // Green
			new MeshBasicMaterial({ color: 0xffa500 })  // Orange
		];

		this.ledWhiteMaterial = new MeshBasicMaterial({ color: 0xffffff })

		this.setModel()
		this.setInteraction()

		this.addEventListeners()

		if (this.debug.active) this.setDebug()
	}

	setModel() {
		this.model = this.resource.scene
		this.model.name = 'physical machine parts'
		this.scene.add(this.model)

		this.leds = []

		const keyTexture = this.resources.items.keysTexture
		keyTexture.flipY = false

		this.model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name.includes('led')) {
				this.leds.push(child)
			} else if (child.name.includes('base')) {
				child.material = new MeshMatcapMaterial({ matcap: this.resources.items.goldMatcap })
			} else if (child.name.includes('keyplanes')) {
				child.material = new MeshBasicMaterial({ color: new Color(0x000000), map: keyTexture })
			} else if (child.name.includes('machine')) {
				child.material = new MeshBasicMaterial({ color: new Color(0x000000) })
			} else if (child.name.includes('lever')) {
				this.lever = child
				child.material = new MeshPhongMaterial({ color: new Color(0x444444) })
			} else if (child.name.includes('ball')) {
				child.material = new MeshPhongMaterial({ color: new Color(0xff0000) })
			}
		})

		this.leds.forEach((led, i) => {
			led.material = this.ledWhiteMaterial
		})
	}
	// Optional: Add an interaction to trigger the spin
	setInteraction() {
		this.experience.interactionManager.addInteractiveObject(this.lever)

		this.lever.addEventListener('click', (e) => {
			// debounce
			if (this.isCliked) return
			this.isCliked = true
			this.playAnimation()
			gsap.delayedCall(1, () => {
				this.isCliked = false
			})
		})

		this.leds.forEach((led, i) => {
			this.experience.interactionManager.addInteractiveObject(led)

			led.addEventListener('click', (e) => {
				led.material = this.ledMaterials[i]
				this.machine.lockWheel(i)
			})
		})

	}

	playAnimation() {
		gsap.killTweensOf(this.lever.rotation)
		gsap.to(this.lever.rotation, {
			duration: 0.5,
			x: -1.5,
			ease: 'power1.inOut',
			yoyo: true,
			repeat: 1,
		})

		gsap.delayedCall(0.15, () => {
			this.machine.spinWheels()
		})
	}

	addEventListeners() {
		//listen to keyboard touches
		document.addEventListener('keydown', (event) => {
			switch (event.key) {
				case ' ':
					this.spinWheels()
					break
				case 'e':
					this.lockWheel(0)
					break
				case 'v':
					this.lockWheel(1)
					break
				case 'y':
					this.lockWheel(2)
					break
				case 'j':
					this.lockWheel(3)
					break
				case 'm':
					this.lockWheel(4)
					break
				default:
					break
			}
		})
	}

	setDebug() {
		const folder = this.debug.ui.addFolder({
			title: 'Physical Parts',
			expanded: true,
		})
	}
}
