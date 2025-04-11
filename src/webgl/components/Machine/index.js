import Experience from 'core/Experience.js'
import fragmentShader from './fragmentShader.frag'
import vertexShader from './vertexShader.vert'
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'

export default class Machine {
	constructor(_position = new Vector3(0, 0, 0)) {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.debug = this.experience.debug
		this.resources = this.scene.resources

		this.position = _position

		this.numWheels = 5;
		this.segments = 5;
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

		this.currentSpinPoints = 0;
		this.rollingPoints = 0;
		this.collectedPoints = 0;
		this.round = 1
		this.spinsLeft = 3
		this.maxSpins = 3

		/**
		* Custom Combination Points
		*/
		this.combinationPoints = {
			"5jeton": 1000,
			"5couronne": 600,
			"unique": 1500 // Suite complète (différent symbole sur chaque roulette)
		};



		this.setLight()
		this.setMaterial()
		this.setRouletteMaterial()

		this.resource = this.resources.items.casinoModel

		this.setModel()

		// this.setInteraction()


		this.ledMaterials = [
			new MeshBasicMaterial({ color: 0xffff00 }), // Yellow
			new MeshBasicMaterial({ color: 0xff0000 }), // Red
			new MeshBasicMaterial({ color: 0x0000ff }), // Blue
			new MeshBasicMaterial({ color: 0x008000 }), // Green
			new MeshBasicMaterial({ color: 0xffa500 })  // Orange
		];

		this.addEventListeners()

		if (this.debug.active) this.setDebug()

		// this.animateInnerMachineOut()
	}

	animateInnerMachineOut() {
		this.isHandFighting = true
		this.innerOutTimeline = gsap.timeline();
		this.innerOutTimeline.to(this.innerMachine.position, {
			z: -0.6,
			ease: "none",
			duration: 1,
		})
		this.innerOutTimeline.to(this.innerMachine.position, {
			y: -0.6,
			ease: "none",
			duration: 1,
			delay: 0.5
		})
	}

	animateInnerMachineIn() {
		this.isHandFighting = false
		this.innerInTimeline = gsap.timeline();
		this.innerInTimeline.to(this.innerMachine.position, {
			y: 0,
			ease: "none",
			duration: 0.4,
		})
		this.innerInTimeline.to(this.innerMachine.position, {
			z: 0,
			ease: "none",
			duration: 0.8,
			delay: 0.4
		})
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

		this.model.traverse((child) => {
			if (!child.isMesh) return
			if (child.name.includes('slut-base')) {
				child.material = this.material
			} else if (child.name.includes('wheels')) {
				child.material = this.rouletteMaterial;
				this.leds.push(child)
			} else if (child.name.includes('gold')) {
				child.material = new MeshMatcapMaterial({ matcap: this.resources.items.goldMatcap })
			}
			if (child.name.includes('slut-base-inner')) {
				this.innerMachine = child
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

		this.material = new MeshPhongMaterial({ color: 0x333333, map: this.resources.items.casinoRoughness })
	}

	setLight() {
		this.sunLight = new DirectionalLight('#ffffff', 2.9)
		this.sunLight.position.set(0, 1.7, 1.5)
		this.sunLight.name = 'sunLight'
		this.scene.add(this.sunLight)

		this.sunLight.target.position.set(0, 1, 0)

		// Debug
		if (this.debug.active) {
			const debugFolder = addObjectDebug(this.debug.ui, this.sunLight)
		}
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
				uWheelsOffset: { value: 0.76 },
				uAOIntensity: { value: 0.30 },
				uBaseRotationOffset: { value: -0.843 },
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
		this.model.addEventListener('click', (e) => {
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

	countOccurrences() {
		const counts = this.symbolNames.reduce((acc, symbol) => {
			acc[symbol] = 0; // Initialize all symbols with zero count
			return acc;
		}, {});

		this.results.forEach(index => {
			const symbolName = this.symbolNames[index];
			counts[symbolName] = (counts[symbolName] || 0) + 1;
		});

		return counts;
	}

	/** Checks for a custom sequence */
	isCustomSequence() {
		const sortedResults = [...new Set(this.results)].sort((a, b) => a - b).join(",");
		return this.customCombinations.get(sortedResults) || null;
	}

	lockWheel(index) {
		gsap.killTweensOf(this.wheels[index].rotation);

		if (!this.wheels[index].isLocked) {
			this.wheels[index].isLocked = true;
		} else {
			this.wheels[index].isLocked = false;
		}
	}

	collect() {
		this.spinsLeft = 3
		this.collectedPoints += this.rollingPoints;
		this.rollingPoints = 0;
		console.log(`Collected ${points} points! Total: ${this._totalPoints}`);

		this.wheels.forEach(wheel => {
			wheel.isLocked = false
		})

		// Update screen points
		if (this.isDebugDev) {
			this.experience.activeScene.physicalMachineParts.updateCollectedPoints(this.collectedPoints);
			this.experience.activeScene.physicalMachineParts.updateRollingPoints(this.rollingPoints);
			this.experience.activeScene.physicalMachineParts.updateSpins(this.spinsLeft);
			this.experience.activeScene.physicalMachineParts.resetButtons()
		} else {
			// Update external screen points SOCKET HERE
		}
	}

	/**
	* Determines the best combination and applies malus effects
	*/
	getCombination() {
		const counts = this.countOccurrences();
		let points = 0;
		let craniumCount = counts["crane"] || 0;
		let eyeCount = counts["oeuil"] || 0;
		let uniqueSymbols = Object.keys(counts).filter(symbol => counts[symbol] > 0).length; // Fix unique detection

		// Check for special cases first
		if (craniumCount >= 3) return { name: "Farkle", points: 0, farkle: true };
		if (craniumCount === 2) points -= 30;
		if (craniumCount === 1) points -= 10;

		// Check for unique symbol jackpot
		if (uniqueSymbols === this.wheels.length) {
			return { name: "Suite Complète", points: this.combinationPoints["unique"] };
		}

		// Count normal points for jetons and couronnes
		points += (counts["jeton"] || 0) * this.symbolValues["jeton"];
		points += (counts["couronne"] || 0) * this.symbolValues["couronne"];

		// Check for 5-symbol special jackpot
		["jeton", "couronne"].forEach(symbol => {
			let comboKey = `5${symbol}`;
			if (counts[symbol] === 5 && this.combinationPoints[comboKey]) {
				points = this.combinationPoints[comboKey]; // Override with jackpot
			}
		});

		// Handle special Eye mechanic
		if (eyeCount >= 3) {
			return { name: "Special Roulette", points: 0, special: true };
		}

		const isLastSpin = this.spinsLeft === 0;

		if (points <= 0 && isLastSpin) return { name: "Farkle", points: 0, farkle: true };
		else if (points <= 0) return { name: "No crocodilo bombardelo...", points, farkle: false };

		return { name: "Valid Combination", points, farkle: false };
	}

	/**
	* Get points based on the combination detected
	*/
	getPoints() {
		const combination = this.getCombination();
		return combination.points;
	}

	/**
	* Spins the wheels and evaluates the results
	*/
	spinWheels() {
		const previousResults = this.results;
		this.results = this.wheels.map((wheel, index) => {
			if (wheel.isLocked) return previousResults[index];
			return Math.floor(Math.random() * this.wheelEmojis.length);
		});

		console.log("Spin Result:", this.results.map(index => this.wheelEmojis[index]).join(" "));

		const { name, points, farkle, special } = this.getCombination();

		this.currentSpinPoints = points;

		this.rollingPoints += points;
		if (this.spinsLeft === 0) {
			this.spinsLeft = 3
		}
		this.spinsLeft -= 1;

		if (farkle) {
			console.log("Farkle! Score of the round is lost.");
			this.rollingPoints = 0;
		} else {
			console.log(`Combination: ${name}`);
			console.log(`Points: ${points}`);
		}

		if (special) {
			console.log("Triggering Special Roulette Mechanics!");
		}


		// Update screen points
		if (this.isDebugDev) {
			this.experience.activeScene.physicalMachineParts.updateRollingPoints(this.rollingPoints);
			this.experience.activeScene.physicalMachineParts.updateSpins(this.spinsLeft);

			// this.physicalMachineParts.updateRollingPoints(this.rollingPoints);
		} else {
			// Update external screen points SOCKET HERE
		}

		this.wheels.forEach((wheel, index) => {
			gsap.killTweensOf(wheel.rotation);
			if (wheel.isLocked) return;

			const randomSegment = this.results[index];
			const segmentAngle = 1 / this.wheelEmojis.length;
			const fullRotations = 5;
			const rotationDegrees = wheel.rotation.value;
			const previousRotationDegrees = rotationDegrees % 1;
			const rotationToStopAngle = randomSegment * segmentAngle - previousRotationDegrees;
			const targetRotation = rotationDegrees + (fullRotations + rotationToStopAngle);

			gsap.to(wheel.rotation, {
				value: targetRotation,
				duration: 3 + index * 0.3,
				ease: 'power4.out'
			});
		});


	}

	addEventListeners() {
		//listen to keyboard touches
		// document.addEventListener('keydown', (event) => {
		// 	switch (event.key) {
		// 		case ' ':
		// 			this.spinWheels()
		// 			break
		// 		case 'e':
		// 			this.lockWheel(0)
		// 			break
		// 		case 'v':
		// 			this.lockWheel(1)
		// 			break
		// 		case 'y':
		// 			this.lockWheel(2)
		// 			break
		// 		case 'j':
		// 			this.lockWheel(3)
		// 			break
		// 		case 'm':
		// 			this.lockWheel(4)
		// 			break
		// 		default:
		// 			break
		// 	}
		// })
	}

	setDebug() {
		const folder = this.debug.ui.addFolder({
			title: 'Machine',
			expanded: true,
		})
		addMaterialDebug(folder, this.rouletteMaterial)
	}
}
