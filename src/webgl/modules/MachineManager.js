import Experience from 'core/Experience.js'
import gsap from 'gsap'
import Socket from '@/scripts/Socket.js'

const socket = new Socket()

// Configuration constants moved outside the class
export const MAIN_ROULETTE_CONFIG = {
	numWheels: 5,
	segments: 6,
	wheelEmojis: ['🍋', '🍇', '🍊', '🍒', '💀', '7'].reverse(),
	symbolNames: ['7', '💀', '🍒', '🍊', '🍇', '🍋'],
	symbolValues: {
		'🍇': 100, // 🍇
		'🍊': 50, // 🍊
		'🍋': 0, // 🍋
		'🍒': 0, // 🍒
		'💀': 'malus', // Crâne
		7: 'jackpot', // Œil
	},
	malusPoints: {
		1: -100, // Two craniums
		2: -200, // One cranium
	},
	occurrencePoints: {
		triple: 100, // Points for a triple of any symbol (except cranium)
		quadruple: 200, // Points for four of any symbol (except cranium)
		quintuple: 500, // Points for five of any symbol (except cranium)
	},
	combinationPoints: {
		'5🍇': 1000,
		'5🍊': 600,
	},
}

const SECOND_ROULETTE_CONFIG = {
	numWheels: 2,
	segments: 5,
	wheelEmojis: ['🔮', '🎭', '🎯', '⚡', '🎲'],
	symbolNames: ['magic', 'mask', 'target', 'thunder', 'dice'],
	symbolValues: {
		magic: 200, // 🔮
		mask: 150, // 🎭
		target: 300, // 🎯
		thunder: 250, // ⚡
		dice: 400, // 🎲
	},
	combinationBonus: {
		match: 2.5, // Multiplier when both wheels match
		specialMatch: 5, // Multiplier for specific combinations
	},
	specialCombos: {
		'magic-thunder': 'Magical Thunder', // 🔮 + ⚡
		'target-dice': 'Lucky Shot', // 🎯 + 🎲
		'mask-target': 'Perfect Disguise', // 🎭 + 🎯
	},
}

export default class MachineManager {
	constructor(options = {}) {
		socket.connect('machine')
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug

		this._machine = options.machine
		this._secondRoulette = options.secondRoulette
		this._physicalDebug = options.physicalDebug
		this._hands = options.hands

		this._initializeGameState()
		this._createEventListeners()

		if (this._debug.active) this._createDebug()

		//test
	}

	/**
	 * Getters & Setters
	 */
	get machine() {
		return this._machine
	}

	get secondRoulette() {
		return this._secondRoulette
	}

	/**
	 * Private - Initialization
	 */
	_initializeGameState() {
		// Game state
		this._rollingPoints = 0
		this._lockedPoints = 0
		this._collectedPoints = 0
		this._round = 1
		this._maxSpins = false
		this._spinsLeft = 3
		this._currentSpinIsDone = true
		this._currentSpins = 0
		this._currentSpinPoints = 0
		this._spinTokens = 10 // Initialize spin tokens to 10

		socket.send({
			event: 'update-spin-tokens',
			data: {
				value: this._spinTokens,
			},
			receiver: 'physical-debug',
		})

		// Main roulette state
		this._results = new Array(MAIN_ROULETTE_CONFIG.numWheels).fill(0)
		this._previousResults = new Array(MAIN_ROULETTE_CONFIG.numWheels).fill(0)
		this._customCombinations = new Map()

		// Second roulette state
		this._secondRouletteResults = new Array(SECOND_ROULETTE_CONFIG.numWheels).fill(0)

		socket.send({
			event: 'button-lights-enabled',
			data: { value: false, index: -1 },
			receiver: this._machine.isDebugDev ? 'physical-debug' : 'input-board',
		})
	}

	/**
	 * Main Roulette Logic
	 */
	_spinWheels() {
		this._machine.wheels.forEach((wheel, index) => {
			if (wheel.isLocked) {
				wheel.isDisabled = true
				console.log(`Wheel ${index} is blocked`)
				socket.send({
					event: 'button-lights-enabled',
					data: { value: false, index: index },
					receiver: this._machine.isDebugDev ? 'physical-debug' : 'input-board',
				})
			}
		})
		if (this._machine.wheels.every((wheel) => wheel.isLocked)) {
			this._logMessage('All wheels are locked! Collecting points automatically.')
			this._collect()
			return
		}

		if (!this._currentSpinIsDone) return

		// Only check and use spin tokens at the beginning of a new round
		// (when currentSpins is 0, meaning it's the first spin after collect or farkle)
		if (this._currentSpins === 0) {
			// Check if player has spin tokens available
			if (this._spinTokens <= 0) {
				this._logMessage('No spin tokens left! Game over.')
				return
			}

			// Decrement spin tokens only for the first spin of a round
			this._spinTokens--
			this._updateSpinTokensDisplay()
		}

		this._currentSpinIsDone = false
		this._previousResults = [...this._results]

		// Determine new results for non-locked wheels
		this._results = this._machine.wheels.map((wheel, index) => {
			if (wheel.isLocked) return this._previousResults[index]
			return Math.floor(Math.random() * MAIN_ROULETTE_CONFIG.segments)
		})

		this._logSpinResult(this._results, MAIN_ROULETTE_CONFIG.wheelEmojis)

		// Increment spins first
		this._currentSpins += 1

		// Check for triple cranium farkle
		const counts = this._countOccurrences(this._results, MAIN_ROULETTE_CONFIG.symbolNames)
		if (counts['💀'] >= 3) {
			this._logMessage('Farkle! Triple cranium - score of the round is lost.')
			this._rollingPoints = 0
			this._currentSpins = 0
			this._updatePointsDisplay()
			gsap.delayedCall(2, () => {
				socket.send({
					event: 'button-lights-enabled',
					data: { value: false, index: -1 },
					receiver: this._machine.isDebugDev ? 'physical-debug' : 'input-board',
				})
				this._machine.wheels.forEach((wheel) => {
					wheel.isDisabled = true
					wheel.isLocked = false
				})
			})
		} else {
			const special = counts['7'] >= 3

			// Trigger special roulette if needed
			if (special) {
				this._logMessage('Triggering Special Roulette Mechanics!')
				this._triggerSecondRoulette()
			}
		}

		const points = this._getPoints({ lockedOnly: false }).pointsBeforeCranium
		if (this._rollingPoints - points >= 0) {
			this._logMessage('Farkle! No points from last spin.')
			//TODO faire une fonction de reset
			this._currentSpins = 0
			this._rollingPoints = 0
			this._updatePointsDisplay()

			gsap.delayedCall(2, () => {
				this._collect()
				socket.send({
					event: 'button-lights-enabled',
					data: { value: false, index: -1 },
					receiver: this._machine.isDebugDev ? 'physical-debug' : 'input-board',
				})
				this._machine.wheels.forEach((wheel) => {
					wheel.isDisabled = true
					wheel.isLocked = false
				})
			})
		}

		// Animate wheels
		this._animateWheelSpin(this._machine.wheels, this._results, MAIN_ROULETTE_CONFIG.segments)

		// Update UI when animation completes
		gsap.delayedCall(2, () => {
			this._currentSpinIsDone = true
			this._rollingPoints = this._getPoints().points || 0
			this._updatePointsDisplay()

			if (this._currentSpins === 1) {
				socket.send({
					event: 'button-lights-enabled',
					data: { value: true, index: -1 },
					receiver: this._machine.isDebugDev ? 'physical-debug' : 'input-board',
				})
				this._machine.wheels.forEach((wheel) => {
					wheel.isDisabled = false
				})
			}
		})
	}

	/**
	 * Points Calculation
	 */
	_getPoints(options = { lockedOnly: true }) {
		// This function calculates points considering ONLY locked wheels
		// Get results for locked wheels only
		const results = []

		this._machine.wheels.forEach((wheel, index) => {
			const isCranium = MAIN_ROULETTE_CONFIG.symbolNames[this._results[index]] === '💀'
			const shouldAdd = isCranium || !options.lockedOnly || wheel.isLocked
			if (shouldAdd) {
				results.push(this._results[index])
			}
		})

		// If no wheels are locked, return 0 points
		if (results.length === 0) {
			return 0
		}

		// Count occurrences of symbols in locked wheels
		const counts = {}
		MAIN_ROULETTE_CONFIG.symbolNames.forEach((name) => (counts[name] = 0))

		results.forEach((index) => {
			const symbolName = MAIN_ROULETTE_CONFIG.symbolNames[index]
			counts[symbolName] = (counts[symbolName] || 0) + 1
		})

		// Calculate total points
		let points = 0

		// 1. Calculate occurrence points (pairs, triples)
		points += this._calculateOccurrencePoints(counts)

		// 2. Calculate individual symbol points
		points += this._calculateIndividualSymbolPoints(counts)

		// 3. Apply cranium penalties
		const pointsBeforeCranium = points
		const craniumCount = counts['💀'] || 0
		points += MAIN_ROULETTE_CONFIG.malusPoints[craniumCount] || 0

		// Don't allow negative points
		return {
			points: Math.max(0, points),
			pointsBeforeCranium,
		}
	}

	_calculateIndividualSymbolPoints(counts) {
		// Calculate individual symbol points (not occurrence-based)
		let points = 0
		points += (counts['🍇'] || 0) * MAIN_ROULETTE_CONFIG.symbolValues['🍇']
		points += (counts['🍊'] || 0) * MAIN_ROULETTE_CONFIG.symbolValues['🍊']
		// Add points for other symbols if needed

		return points
	}

	_calculateOccurrencePoints(counts) {
		// Calculate points based on symbol occurrences (pairs, triples, etc.)
		let occurrencePoints = 0

		// Exclude 💀 from occurrence calculations
		const validSymbols = Object.keys(counts).filter((symbol) => symbol !== '💀' && counts[symbol] > 1)

		validSymbols.forEach((symbol) => {
			const count = counts[symbol]
			if (count === 3) {
				occurrencePoints += MAIN_ROULETTE_CONFIG.occurrencePoints.triple
			} else if (count === 4) {
				occurrencePoints += MAIN_ROULETTE_CONFIG.occurrencePoints.quadruple
			} else if (count === 5) {
				occurrencePoints += MAIN_ROULETTE_CONFIG.occurrencePoints.quintuple
			}
		})

		return occurrencePoints
	}

	/**
	 * Second Roulette Logic
	 */
	_triggerSecondRoulette() {
		this._secondRouletteTimeline?.kill()
		this._secondRouletteTimeline = gsap.timeline()
		this._secondRouletteTimeline.add(this._machine.animateInnerMachineBack())
		this._secondRouletteTimeline.add(this._secondRoulette.animateIn())
		this._secondRouletteTimeline.add(this._secondRoulette.animateFlapOut(), '>-1')
		this._secondRouletteTimeline.delay(1)
		this._secondRouletteTimeline.call(() => {
			this._spinSecondRouletteWheels()
		})
	}

	_spinSecondRouletteWheels() {
		this._secondRouletteResults = Array(SECOND_ROULETTE_CONFIG.numWheels)
			.fill(0)
			.map(() => Math.floor(Math.random() * SECOND_ROULETTE_CONFIG.segments))

		this._logSpinResult(this._secondRouletteResults, SECOND_ROULETTE_CONFIG.wheelEmojis, true)

		// Get the bonus points from second roulette
		const secondRouletteBonus = this._getSecondRouletteCombination()

		// Animate the wheels
		this._animateWheelSpin(this._secondRoulette.wheels, this._secondRouletteResults, SECOND_ROULETTE_CONFIG.segments)

		// After wheels stop, process the bonus and return to main machine
		const secondRouletteTimeline = gsap.timeline().call(() => {
			// Apply bonus to collected points
			this._collectedPoints += secondRouletteBonus.points

			this._logMessage(`Second Roulette Bonus: ${secondRouletteBonus.name}`)
			this._logMessage(`Bonus Points: ${secondRouletteBonus.points}`)

			// Update collected points display
			this._updateCollectedPointsDisplay()
		})

		// Use the dedicated method for animating out the second roulette
		secondRouletteTimeline.call(
			() => {
				this._animateSecondRouletteOut()
			},
			null,
			6,
		)
	}

	_getSecondRouletteCombination() {
		// Convert result indices to symbol names
		const symbols = this._secondRouletteResults.map((index) => SECOND_ROULETTE_CONFIG.symbolNames[index])

		// Calculate base points from the symbols
		let points = symbols.reduce((sum, symbol) => sum + SECOND_ROULETTE_CONFIG.symbolValues[symbol], 0)

		// Check if both wheels show the same symbol (matching pair)
		const isMatch = symbols[0] === symbols[1]

		// Sort the symbols to check for special combos regardless of wheel order
		const comboKey = [...symbols].sort().join('-')
		const specialComboName = SECOND_ROULETTE_CONFIG.specialCombos[comboKey]

		// Apply multipliers based on combinations
		if (isMatch) {
			// Both wheels show same symbol
			points *= SECOND_ROULETTE_CONFIG.combinationBonus.match
			return {
				name: `Double ${symbols[0]} (${SECOND_ROULETTE_CONFIG.wheelEmojis[this._secondRouletteResults[0]]})`,
				points: Math.round(points),
				isSpecial: false,
			}
		} else if (specialComboName) {
			// Special combination
			points *= SECOND_ROULETTE_CONFIG.combinationBonus.specialMatch
			return {
				name: specialComboName,
				points: Math.round(points),
				isSpecial: true,
			}
		}

		// Regular combination (no multiplier)
		return {
			name: 'Mixed Symbols',
			points: Math.round(points),
			isSpecial: false,
		}
	}

	/**
	 * Common Utilities
	 */
	_animateWheelSpin(wheels, results, numSegments) {
		wheels.forEach((wheel, index) => {
			gsap.killTweensOf(wheel.rotation)
			if (wheel.isLocked) return

			const randomSegment = results[index]
			const segmentAngle = 1 / numSegments
			const fullRotations = 5
			const rotationDegrees = wheel.rotation.value
			const previousRotationDegrees = rotationDegrees % 1
			const rotationToStopAngle = randomSegment * segmentAngle - previousRotationDegrees
			const targetRotation = rotationDegrees + (fullRotations + rotationToStopAngle)

			gsap.to(wheel.rotation, {
				value: targetRotation,
				duration: 2 + index * 0.3,
				ease: 'power4.out',
			})
		})
	}

	_countOccurrences(results, symbolNames) {
		const counts = symbolNames.reduce((acc, symbol) => {
			acc[symbol] = 0
			return acc
		}, {})

		results.forEach((index) => {
			const symbolName = symbolNames[index]
			counts[symbolName] = (counts[symbolName] || 0) + 1
		})

		return counts
	}

	_logSpinResult(results, wheelEmojis, isSecondRoulette = false) {
		const resultEmojis = results.map((index) => wheelEmojis[index]).join(' ')
		const message = isSecondRoulette ? `Second Roulette Spin Result: ${resultEmojis}` : `Spin Result: ${resultEmojis}`

		if (this._physicalDebug) {
			this._physicalDebug.printToRightScreen(message)
		}
	}

	_logMessage(message) {
		console.log(message)
		if (this._physicalDebug) {
			this._physicalDebug.printToRightScreen(message)
		}
	}

	/**
	 * UI Updates
	 */
	_updatePointsDisplay() {
		socket.send({
			event: 'update-rolling-points',
			data: {
				value: this._rollingPoints,
			},
			receiver: this._machine.isDebugDev ? 'physical-debug' : 'score',
		})
	}

	_updateSpinsDisplay() {
		socket.send({
			event: 'update-spins',
			data: {
				value: this._spinsLeft,
			},
			receiver: this._machine.isDebugDev ? 'physical-debug' : 'score',
		})
	}

	_updateSpinTokensDisplay() {
		socket.send({
			event: 'update-spin-tokens',
			data: {
				value: this._spinTokens,
			},
			receiver: this._machine.isDebugDev ? 'physical-debug' : 'score',
		})

		// Also log to debug console
		this._logMessage(`Spin tokens remaining: ${this._spinTokens}`)
	}

	_updateCollectedPointsDisplay() {
		socket.send({
			event: 'update-collected-points',
			data: {
				value: this._collectedPoints,
			},
			receiver: this._machine.isDebugDev ? 'physical-debug' : 'score',
		})
	}

	/**
	 * Game Control
	 */
	_lockWheel(index) {
		if (this._machine.wheels[index].isDisabled) return
		gsap.killTweensOf(this._machine.wheels[index].rotation)

		// Toggle lock state
		this._machine.wheels[index].isLocked = !this._machine.wheels[index].isLocked

		// Log the lock/unlock action
		if (this._machine.wheels[index].isLocked) {
			this._logMessage(`Wheel ${index} locked`)
		} else {
			this._logMessage(`Wheel ${index} unlocked`)
		}

		// Recalculate points based only on locked wheels
		this._rollingPoints = this._getPoints().points || 0

		// Log updated points
		this._logMessage(`Updated rolling points: ${this._rollingPoints}`)

		// Update UI
		this._updatePointsDisplay()
	}

	_collect() {
		// Reset spins for next round
		this._currentSpins = 0
		this._collectedPoints += this._rollingPoints
		this._logMessage(`Collected ${this._rollingPoints} points!`)
		socket.send({
			event: 'button-lights-enabled',
			data: { value: false, index: -1 },
			receiver: this._machine.isDebugDev ? 'physical-debug' : 'input-board',
		})
		this._rollingPoints = 0

		// Unlock all wheels
		this._machine.wheels.forEach((wheel) => {
			wheel.isLocked = false
			wheel.isDisabled = true
		})

		// Update UI
		this._updateCollectedPointsDisplay()
		this._updatePointsDisplay()
		this._updateSpinsDisplay()
	}

	/**
	 * Animation
	 */
	_animateSecondRouletteOut() {
		this._secondRouletteTimeline?.kill()
		this._secondRouletteTimeline = gsap.timeline()
		// First animate flap in
		this._secondRouletteTimeline.add(this._secondRoulette.animateFlapIn())
		// Then animate the second roulette out with a slight delay
		this._secondRouletteTimeline.add(this._secondRoulette.animateOut())
		this._secondRouletteTimeline.add(this._machine.animateInnerMachineFront())
	}

	/**
	 * Events
	 */
	_createEventListeners() {
		socket.on('lever', (e) => {
			this._leverClickHandler(e)
		})
		socket.on('button', (e) => {
			this._buttonClickHandler(e)
		})
		socket.on('button-collect', (e) => {
			this._buttonCollectClickHandler(e)
		})
		socket.on('update-spin-tokens', (e) => {
			if (e.value === '+1') {
				this._spinTokens = parseInt(this._spinTokens) + 1
			} else {
				this._spinTokens = e.value
			}
			this._updateSpinTokensDisplay()
		})
	}

	_leverClickHandler(e) {
		this._spinWheels()
	}

	_buttonClickHandler(e) {
		if (this._machine.isHandFighting) {
			// remap index to 0, 1, 2 (exclude 3 or more)
			if (e.index > 2) return
			this._hands.setHandAnimation(e.index % 3)
		} else if (this._currentSpins > 0 && this._currentSpinIsDone) {
			// Only allow locking wheels after first spin and when current spin is done
			this._lockWheel(e.index)
		}
	}

	_buttonCollectClickHandler(e) {
		this._collect()
	}

	/**
	 * Debug
	 */
	_createDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Machine Manager',
			expanded: true,
		})

		folder
			.addButton({
				title: 'Second roulette',
			})
			.on('click', () => {
				this._secondRouletteTimeline?.kill()
				this._secondRouletteTimeline = gsap.timeline()
				this._secondRouletteTimeline.add(this._machine.animateInnerMachineBack())
				this._secondRouletteTimeline.add(this._secondRoulette.animateIn())
				this._secondRouletteTimeline.add(this._secondRoulette.animateFlapOut(), '>-1')
			})

		folder
			.addButton({
				title: 'Second roulette Out',
			})
			.on('click', () => {
				this._animateSecondRouletteOut()
			})

		folder
			.addButton({
				title: 'Spin Second Roulette',
			})
			.on('click', () => {
				this._spinSecondRouletteWheels()
			})
	}
}
