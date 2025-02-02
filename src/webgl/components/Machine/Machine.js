import Experience from 'core/Experience.js'
import fragmentShader from './fragmentShader.frag'
import vertexShader from './vertexShader.vert'
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'

export default class Cube {
	constructor(_position = new Vector3(0, 0, 0)) {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.debug = this.experience.debug
		this.resources = this.scene.resources

		this.position = _position

		this.setMaterial()

		this.resource = this.resources.items.casinoModel

		this.setModel()

		this.setInteraction()

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

		if (this.debug.active) this.setDebug()
	}

	setModel() {
		this.model = this.resource.scene
		this.model.name = 'casino machine'
		this.scene.add(this.model)

		// Array to store wheel meshes
		this.wheels = []

		this.model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name === 'machine') {
				// Main machine model
			} else if (child.name.includes('roue')) {
				child.material = this.material
				this.wheels.push(child) // Push each wheel mesh into the wheels array
			} else if (child.name.includes('led')) {
				child.material = new MeshBasicMaterial({ color: 0xffffff })
			} else if (child.name.includes('base')) {
				child.material = new MeshBasicMaterial({ color: 0x000000 })
			}
		})

		this.wheels.forEach((wheel, index) => {
			//offset to center o ssymbol
			const offset = (Math.PI / 3) / 2
			wheel.rotation.x = offset
		})
	}

	setMaterial() {
		// Material for the wheels
		this.material = new MeshBasicMaterial({ map: this.resources.items.wheelTexture })
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

		if (counts[0] === 5) return "Quintuple (Five of a Kind)";
		if (counts[0] === 4) return "Carré (Four of a Kind)";
		if (counts[0] === 3 && counts[1] === 2) return "Full House";
		if (counts[0] === 3) return "Brelan (Three of a Kind)";
		if (counts[0] === 2 && counts[1] === 2) return "Double Paire (Two Pair)";
		if (counts[0] === 2) return "Paire (One Pair)";

		return "Carte haute (High Card)";
	}

	/** Get points based on combination */
	getPoints(combination) {
		if (combination.includes("Custom Combination")) {
			return parseInt(combination.match(/\d+/)[0]); // Extract points from the name
		}
		return this.basePoints[combination] || 0;
	}

	spinWheels() {
		const segmentOffset = 0; // Adjust this value if needed

		this.results = this.wheels.map(() => Math.floor(Math.random() * this.segments));

		console.log("Spin Result:", this.results);
		const combination = this.getCombination();
		const points = this.getPoints(combination);

		console.log(`Combination: ${combination}`);
		console.log(`Points: ${points}`);

		this.wheels.forEach((wheel, index) => {
			gsap.killTweensOf(wheel.rotation);

			const randomSegment = this.results[index];
			const segmentAngle = 360 / this.segments;

			const fullRotations = 5; // for more realism

			const rotationDegrees = (wheel.rotation.x * 180) / Math.PI;
			const previousRotationDegrees = rotationDegrees % 360;
			const rotationToStopAngle = randomSegment * segmentAngle - previousRotationDegrees + segmentAngle / 2; // rotation needed to go from previous to new result

			const targetRotation = rotationDegrees + (fullRotations * 360 + rotationToStopAngle);

			gsap.to(wheel.rotation, {
				x: (targetRotation * Math.PI) / 180, // Convert to radians
				duration: 3 + index * 0.3, // Stagger effect
				ease: 'power4.out',
				onComplete: () => {
				},
			});
		});
	}

}
