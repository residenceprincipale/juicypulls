import Experience from 'core/Experience.js'
import { Scene, BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial } from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
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
			new MeshBasicMaterial({ color: 0xff00f0 })  // Orange
		];

		this.ledWhiteMaterial = new MeshBasicMaterial({ color: 0xffffff })

		this.setModel()
		this.setInteraction()

		this.css3dRenderer = this.setCss3dRenderer()
		this.css3dScene = this.setCss3dScene()
		this.css3dScreen = this.setCss3dScreen()

		this.addEventListeners()

		if (this.debug.active) this.setDebug()
	}

	// public
	updateCollectedPoints() {
		this.collectedElement.textContent = this.machine.collectedPoints;
	}

	updateRollingPoints() {
		this.rollingElement.textContent = this.machine.rollingPoints;
		console.log(this.machine.rollingPoints);
	}

	// private
	setModel() {
		this.model = this.resource.scene
		this.model.name = 'physical machine parts'
		this.scene.add(this.model)

		this.leds = []

		const collectButtonTexture = this.resources.items.collectButtonTexture
		collectButtonTexture.flipY = false

		this.model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name.includes('led')) {
				this.leds.push(child)
			} else if (child.name.includes('base')) {
				child.material = new MeshMatcapMaterial({ matcap: this.resources.items.goldMatcap })
			} else if (child.name.includes('collect')) {
				child.material = new MeshBasicMaterial({ map: collectButtonTexture })
				this.collectButton = child
			} else if (child.name.includes('machine')) {
				child.material = new MeshBasicMaterial({ color: new Color(0x000000) })
			} else if (child.name.includes('lever')) {
				this.lever = child
				child.material = new MeshPhongMaterial({ color: new Color(0x444444) })
			} else if (child.name.includes('ball')) {
				child.material = new MeshPhongMaterial({ color: new Color(0xff0000) })
			} else if (child.name.includes('screen')) {
				this.doubleScreenPlane = child
				child.material = new MeshBasicMaterial({ color: new Color(0x000000) })
			}
		})

		this.leds.forEach((led, i) => {
			led.material = this.ledWhiteMaterial
			led.isWhite = true
		})
	}

	setCss3dRenderer() {
		const renderer = new CSS3DRenderer()
		renderer.setSize(window.innerWidth, window.innerHeight)
		renderer.domElement.style.position = 'fixed'
		renderer.domElement.style.top = 0
		renderer.domElement.style.pointerEvents = 'none'
		document.body.appendChild(renderer.domElement)

		return renderer
	}

	setCss3dScene() {
		const scene = new Scene()

		return scene
	}

	setCss3dScreen() {
		const screenElement = document.querySelector('.top-screens')

		this.collectedElement = screenElement.querySelector('.score-container')
		this.rollingElement = screenElement.querySelector('.current-container')
		this.videoElement = screenElement.querySelector('.joined-screen')

		const cssObject = new CSS3DObject(screenElement)

		cssObject.position.copy(this.doubleScreenPlane.position)
		cssObject.position.x += 0.15

		cssObject.rotation.x = this.doubleScreenPlane.rotation.x - Math.PI / 2
		cssObject.scale.set(0.003, 0.003, 0.003)

		this.css3dScene.add(cssObject)

		return cssObject
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

		this.experience.interactionManager.addInteractiveObject(this.collectButton)
		this.collectButton.addEventListener('click', (e) => {
			this.collectButton.material.color.set(0x008000)
			gsap.delayedCall(0.1, () => {
				this.collectButton.material.color.set(0xffffff)
			})

			this.machine.collect();
		});

		this.leds.forEach((led, i) => {
			this.experience.interactionManager.addInteractiveObject(led)

			led.addEventListener('click', (e) => {
				this.machine.lockWheel(i) // locks or unlocks the wheel

				led.isWhite = !led.isWhite

				if (led.isWhite) {
					led.material = this.ledWhiteMaterial
				} else {
					led.material = this.ledMaterials[i]
				}
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

	update() {
		if (this.css3dRenderer) this.css3dRenderer.render(this.css3dScene, this.experience.camera.instance);
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

		window.addEventListener('resize', () => {
			this.css3dRenderer.setSize(window.innerWidth, window.innerHeight);
		});
	}

	setDebug() {
		const folder = this.debug.ui.addFolder({
			title: 'Physical Parts',
			expanded: true,
		})
	}
}
