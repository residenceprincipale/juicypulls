import Experience from 'core/Experience.js'
import fragmentShader from './fragmentShader.frag'
import vertexShader from './vertexShader.vert'
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'

export default class Cube {
	constructor(_position = new Vector3(0, 0, 0)) {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.debug = this.experience.debug
		this.resources = this.scene.resources

		this.position = _position

		this.numWheels = 5;
		this.segments = 6;
		this.results = new Array(5).fill(0);
		this.customCombinations = new Map(); // Custom sequences with their points
		this.basePoints = {
			"Quintuple": 50,
			"Carré": 40,
			"Full House": 35,
			"Brelan": 25,
			"Double Paire": 20,
			"Paire": 10,
			"Carte haute": 5
		};
		// de bas en haut sur la texture (depend des uvs de la roulette et de la base rotation offset)
		// this.wheelEmojis = ["🍌", "🍊", "🔺", "🍏", "7️⃣", "❤️"];
		//reversed version
		this.wheelEmojis = ["❤️", "7️⃣", "🍏", "🔺", "🍊", "🍌"];

		this.setMaterial()
		this.setRouletteMaterial()

		this.resource = this.resources.items.casinoModel

		this.setModel()

		this.setInteraction()


		this.ledMaterials = [
			new MeshBasicMaterial({ color: 0xffff00 }), // Yellow
			new MeshBasicMaterial({ color: 0xff0000 }), // Red
			new MeshBasicMaterial({ color: 0x0000ff }), // Blue
			new MeshBasicMaterial({ color: 0x008000 }), // Green
			new MeshBasicMaterial({ color: 0xffa500 })  // Orange
		];

		this.addEventListeners()

		if (this.debug.active) this.setDebug()
	}

	setModel() {
		this.model = this.resource.scene
		this.model.name = 'casino machine'
		this.scene.add(this.model)

		// Array to store wheel meshes
		this.wheels = [
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
		]
		this.leds = []

		const keyTexture = this.resources.items.keysTexture
		keyTexture.flipY = false

		this.model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name.includes('SLUT')) {
				child.material = this.material
			} else if (child.name.includes('ROULETTE')) {
				child.material = this.rouletteMaterial;
				this.leds.push(child)
			} else if (child.name.includes('base')) {
				child.material = new MeshBasicMaterial({ color: 0x000000 })
			} else if (child.name.includes('keyplanes')) {
				child.material = new MeshBasicMaterial({ map: keyTexture })
			}
		})

		this.wheels.forEach((wheel, index) => {
			wheel.rotation = this.rouletteMaterial.uniforms[`uRotation${index}`]
			// wheel.rotation.value = (1.0 / this.segments) / 2
		})
	}

	setMaterial() {
		// Material for the wheels
		const texture = this.resources.items.casinoRoughness
		texture.flipY = false;
		this.material = new MeshBasicMaterial({ map: this.resources.items.casinoRoughness })
	}

	setRouletteMaterial() {
		const wheelTexture = this.resources.items.wheelTexture;
		wheelTexture.wrapS = RepeatWrapping
		wheelTexture.wrapT = RepeatWrapping
		wheelTexture.flipY = false

		this.rouletteMaterial = new ShaderMaterial({
			vertexShader,
			fragmentShader,
			name: "Roulette",
			uniforms: {
				uTime: { value: 0 },
				uTexture: { value: this.resources.items.wheelTexture },
				uAoTexture: { value: this.resources.items.roulettesAO },
				uMatcapMap: { value: this.resources.items.glassMatcap },
				uMatcapOffset: { value: new Vector2(0, 0) },
				uMatcapIntensity: { value: 0.2 },
				uRoughness: { value: 0.5 },
				uWheelsSpacing: { value: 4.8 },
				uWheelsOffset: { value: 0.78 },
				uAOIntensity: { value: 1 },
				uBaseRotationOffset: { value: - (1.0 / this.segments) * 2 },
				uRotation0: { value: 0 },
				uRotation1: { value: 0 },
				uRotation2: { value: 0 },
				uRotation3: { value: 0 },
				uRotation4: { value: 0 },
			}
		})
	}

	// Optional: Add an interaction to trigger the spin
	setInteraction() {
		this.experience.interactionManager.addInteractiveObject(this.model)
		this.model.addEventListener('click', () => {
			// debounce
			if (this.isCliked) return
			this.isCliked = true
			this.spinWheels()
			gsap.delayedCall(0.5, () => {
				this.isCliked = false
			})
		})
	}

	/**
	* Combinaison Detection Logic
	*/
	addCustomCombination(sequence, points) {
		const sortedSeq = sequence.sort((a, b) => a - b).join(",");
		this.customCombinations.set(sortedSeq, points);
	}

	/** Count occurrences of each number */
	countOccurrences() {
		return this.results.reduce((acc, num) => {
			acc[num] = (acc[num] || 0) + 1;
			return acc;
		}, {});
	}

	/** Checks for a custom sequence */
	isCustomSequence() {
		const sortedResults = [...new Set(this.results)].sort((a, b) => a - b).join(",");
		return this.customCombinations.get(sortedResults) || null;
	}

	/** Determines the best combination */
	getCombination() {
		const counts = Object.values(this.countOccurrences()).sort((a, b) => b - a);

		// Check for a custom sequence
		const customPoints = this.isCustomSequence();
		if (customPoints !== null) return `Custom Combination (Worth ${customPoints} Points)`;

		if (counts[0] === 5) return "Quintuple";
		if (counts[0] === 4) return "Carré";
		if (counts[0] === 3 && counts[1] === 2) return "Full House";
		if (counts[0] === 3) return "Brelan";
		if (counts[0] === 2 && counts[1] === 2) return "Double Paire";
		if (counts[0] === 2) return "Paire";

		return "Carte haute (High Card)";
	}

	/** Get points based on combination */
	getPoints(combination) {
		if (combination.includes("Custom Combination")) {
			return parseInt(combination.match(/\d+/)[0]); // Extract points from the name
		}
		return this.basePoints[combination] || 0;
	}

	lockWheel(index) {
		gsap.killTweensOf(this.wheels[index].rotation);

		if (!this.wheels[index].isLocked) {
			this.wheels[index].isLocked = true;
			this.leds[index].material = this.ledMaterials[index];
		} else {
			this.wheels[index].isLocked = false;
			this.leds[index].material = new MeshBasicMaterial({ color: 0xffffff });
		}
	}

	spinWheels() {
		const segmentOffset = 0; // Adjust this value if needed

		const previousResults = this.results;

		this.results = this.wheels.map((wheel, index) => {
			if (wheel.isLocked) return previousResults[index]; // Skip locked wheels
			return Math.floor(Math.random() * this.segments);
		});

		console.log("Spin Result :", this.results); // Original array
		console.log("Spin Result :", this.results.map(index => this.wheelEmojis[index]).join(" "));

		const combination = this.getCombination();
		const points = this.getPoints(combination);

		console.log(`Combination: ${combination}`);
		console.log(`Points: ${points}`);

		this.wheels.forEach((wheel, index) => {
			gsap.killTweensOf(wheel.rotation);

			if (wheel.isLocked) return; // Skip locked wheels

			const randomSegment = this.results[index];
			const segmentAngle = 1 / this.segments;

			const fullRotations = 5; // for more realism

			const rotationDegrees = wheel.rotation.value;
			const previousRotationDegrees = rotationDegrees % 1;
			const rotationToStopAngle = randomSegment * segmentAngle - previousRotationDegrees; // rotation needed to go from previous to new result

			const targetRotation = rotationDegrees + (fullRotations + rotationToStopAngle);

			gsap.to(wheel.rotation, {
				value: targetRotation, // Convert to radians
				duration: 3 + index * 0.3, // Stagger effect
				ease: 'power4.out',
				onComplete: () => {
				},
			});
		});
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
			title: 'Machine',
			expanded: true,
		})
		addMaterialDebug(folder, this.rouletteMaterial)
	}
}
