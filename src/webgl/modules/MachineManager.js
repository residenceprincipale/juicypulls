import Experience from 'core/Experience.js'
import gsap from 'gsap'
import Socket from '@/scripts/Socket.js'

const socket = new Socket()
socket.connect('machine')

// Configuration constants moved outside the class
const MAIN_ROULETTE_CONFIG = {
    numWheels: 5,
    segments: 5,
    wheelEmojis: ["🔴", "👑", "💎", "💀", "7️⃣"].reverse(),
    symbolNames: ['oeuil', 'crane', 'diamant', 'couronne', 'jeton'],
    symbolValues: {
        "jeton": 100,    // Jeton
        "couronne": 50,  // Couronne
        "diamant": 0,    // Diamant
        "crane": "malus", // Crâne
        "oeuil": "special" // Œil
    },
    combinationPoints: {
        "5jeton": 1000,
        "5couronne": 600,
        "unique": 1500 // Suite complète (différent symbole sur chaque roulette)
    },
    basePoints: {
        "Quintuple": 50,
        "Carré": 40,
        "Full House": 35,
        "Brelan": 25,
        "Double Paire": 20,
        "Paire": 10,
        "Carte haute": 5
    }
}

const SECOND_ROULETTE_CONFIG = {
    numWheels: 2,
    segments: 5,
    wheelEmojis: ["🔮", "🎭", "🎯", "⚡", "🎲"],
    symbolNames: ['magic', 'mask', 'target', 'thunder', 'dice'],
    symbolValues: {
        "magic": 200,    // 🔮
        "mask": 150,     // 🎭
        "target": 300,   // 🎯
        "thunder": 250,  // ⚡
        "dice": 400      // 🎲
    },
    combinationBonus: {
        "match": 2.5,     // Multiplier when both wheels match
        "specialMatch": 5 // Multiplier for specific combinations
    },
    specialCombos: {
        "magic-thunder": "Magical Thunder",  // 🔮 + ⚡
        "target-dice": "Lucky Shot",         // 🎯 + 🎲
        "mask-target": "Perfect Disguise"    // 🎭 + 🎯
    }
}

export default class MachineManager {
    constructor(options = {}) {
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
     * Public
     */
    spinSecondRoulette() {
        this._spinRouletteWheels(this._secondRoulette, SECOND_ROULETTE_CONFIG)
    }

    /**
     * Private - Initialization
     */
    _initializeGameState() {
        // Game state
        this._currentSpinPoints = 0
        this._rollingPoints = 0
        this._lockedPoints = 0
        this._collectedPoints = 0
        this._round = 1
        this._spinsLeft = 3
        this._maxSpins = 3
        this._currentSpinIsDone = true

        // Main roulette state
        this._results = new Array(MAIN_ROULETTE_CONFIG.numWheels).fill(0)
        this._previousResults = new Array(MAIN_ROULETTE_CONFIG.numWheels).fill(0)
        this._customCombinations = new Map()

        // Second roulette state
        this._secondRouletteResults = new Array(SECOND_ROULETTE_CONFIG.numWheels).fill(0)
    }

    /**
     * Main Roulette Logic
     */
    _spinWheels() {
        if (!this._currentSpinIsDone) return

        this._currentSpinIsDone = false
        this._previousResults = [...this._results]

        // Determine new results for non-locked wheels
        this._results = this._machine.wheels.map((wheel, index) => {
            if (wheel.isLocked) return this._previousResults[index]
            return Math.floor(Math.random() * MAIN_ROULETTE_CONFIG.segments)
        })

        this._logSpinResult(this._results, MAIN_ROULETTE_CONFIG.wheelEmojis)

        // Calculate points from this spin
        const spinResult = this._calculateMainRouletteResult()
        const { points, combinationName, farkle, special } = spinResult

        // Update game state
        this._updateGameState(points, farkle)

        // Animate wheels
        this._animateWheelSpin(this._machine.wheels, this._results, MAIN_ROULETTE_CONFIG.segments)

        // Handle special cases
        if (special) {
            this._logMessage("Triggering Special Roulette Mechanics!")
            this._triggerSecondRoulette()
        }

        // Update UI after spin completes
        gsap.delayedCall(2, () => {
            this._updatePointsDisplay()
            this._currentSpinIsDone = true
        })
    }

    _calculateMainRouletteResult() {
        const hasLockedWheels = this._machine.wheels.some(wheel => wheel.isLocked)

        // If we have locked wheels and not first spin, calculate differently
        if (hasLockedWheels && this._spinsLeft < this._maxSpins - 1) {
            return this._calculateNewPoints()
        } else {
            return this._getCombination()
        }
    }

    _getCombination() {
        const counts = this._countOccurrences(this._results, MAIN_ROULETTE_CONFIG.symbolNames)
        let points = 0
        let craniumCount = counts["crane"] || 0
        let eyeCount = counts["oeuil"] || 0
        let uniqueSymbols = Object.keys(counts).filter(symbol => counts[symbol] > 0).length

        // Check for special cases first
        if (craniumCount >= 3) {
            return { name: "Farkle", points: 0, farkle: true, special: false }
        }

        if (craniumCount === 2) points -= 30
        if (craniumCount === 1) points -= 10

        // Check for unique symbol jackpot
        if (uniqueSymbols === this._machine.wheels.length) {
            return {
                name: "Suite Complète",
                points: MAIN_ROULETTE_CONFIG.combinationPoints["unique"],
                farkle: false,
                special: false
            }
        }

        // Count normal points for jetons and couronnes
        points += (counts["jeton"] || 0) * MAIN_ROULETTE_CONFIG.symbolValues["jeton"]
        points += (counts["couronne"] || 0) * MAIN_ROULETTE_CONFIG.symbolValues["couronne"]

        // Check for 5-symbol special jackpot
        const specialPoints = ["jeton", "couronne"]
        specialPoints.forEach(symbol => {
            let comboKey = `5${symbol}`
            if (counts[symbol] === 5 && MAIN_ROULETTE_CONFIG.combinationPoints[comboKey]) {
                points = MAIN_ROULETTE_CONFIG.combinationPoints[comboKey]
            }
        })

        // Handle special Eye mechanic
        if (eyeCount >= 3) {
            return { name: "Special Roulette", points: 0, farkle: false, special: true }
        }

        const isLastSpin = this._spinsLeft === 0
        if (points <= 0 && isLastSpin) {
            return { name: "Farkle", points: 0, farkle: true, special: false }
        } else if (points <= 0) {
            return { name: "No Points", points, farkle: false, special: false }
        }

        return { name: "Valid Combination", points, farkle: false, special: false }
    }

    _calculateNewPoints() {
        // Create temporary arrays for unlocked positions
        const unlockedIndices = []
        let unlockedResults = []

        // Find which wheel positions are not locked
        this._machine.wheels.forEach((wheel, index) => {
            if (!wheel.isLocked) {
                unlockedIndices.push(index)
                unlockedResults.push(this._results[index])
            }
        })

        if (unlockedResults.length === 0) {
            return {
                name: "All Wheels Locked",
                points: 0,
                farkle: false,
                special: false
            }
        }

        // Calculate counts for unlocked wheels only
        const counts = {}
        MAIN_ROULETTE_CONFIG.symbolNames.forEach(name => counts[name] = 0)

        unlockedResults.forEach(index => {
            const symbolName = MAIN_ROULETTE_CONFIG.symbolNames[index]
            counts[symbolName] = (counts[symbolName] || 0) + 1
        })

        // Calculate points based on unlocked symbols
        let points = 0
        let craniumCount = counts["crane"] || 0
        let eyeCount = counts["oeuil"] || 0

        // Check for Farkle conditions on unlocked wheels
        if (craniumCount >= 3 || (craniumCount > 0 && craniumCount >= unlockedResults.length)) {
            return {
                name: "Farkle on New Wheels",
                points: 0,
                farkle: true,
                special: false
            }
        }

        // Count points for unlocked jetons and couronnes
        points += (counts["jeton"] || 0) * MAIN_ROULETTE_CONFIG.symbolValues["jeton"]
        points += (counts["couronne"] || 0) * MAIN_ROULETTE_CONFIG.symbolValues["couronne"]

        // Apply penalties for cranes
        if (craniumCount === 2) points -= 30
        if (craniumCount === 1) points -= 10

        // Check for special Eye mechanic
        if (eyeCount >= 3) {
            return {
                name: "Special Roulette",
                points: 0,
                farkle: false,
                special: true
            }
        }

        // Name the combination based on unlocked wheels
        let name = "New Points"
        if (points <= 0) name = "No New Points"

        return {
            name: name,
            points: Math.max(0, points),  // Don't allow negative points
            farkle: false,
            special: eyeCount >= 3
        }
    }

    _updateGameState(points, farkle) {
        // Track previous rolling points before updating
        const previousRollingPoints = this._rollingPoints
        this._spinsLeft -= 1
        this._currentSpinPoints = points

        if (farkle) {
            this._logMessage("Farkle! Score of the round is lost.")
            this._rollingPoints = 0
            this._lockedPoints = 0
        } else {
            const hasLockedWheels = this._machine.wheels.some(wheel => wheel.isLocked)

            if (this._spinsLeft < this._maxSpins - 1) { // Not the first spin
                if (hasLockedWheels) {
                    // On last spin, check if new points were made
                    if (this._spinsLeft === 0 && points <= 0) {
                        this._logMessage("No new points on last spin! Farkle!")
                        this._rollingPoints = 0
                        this._lockedPoints = 0
                    } else {
                        // Keep previous locked points and add current spin points
                        this._lockedPoints = previousRollingPoints
                        this._rollingPoints = this._lockedPoints + points
                    }
                } else {
                    // No locked wheels, just use current combination points
                    this._rollingPoints = points
                    this._lockedPoints = 0
                }
            } else {
                // First spin, just use the points
                this._rollingPoints = points
                this._lockedPoints = 0
            }
        }

        // If it's the last spin, collect automatically
        if (this._spinsLeft === 0) {
            this._collect()
        }

        this._updateSpinsDisplay()
    }

    /**
     * Second Roulette Logic
     */
    _triggerSecondRoulette() {
        // Transition to second roulette
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
        this._secondRouletteResults = Array(SECOND_ROULETTE_CONFIG.numWheels).fill(0).map(() =>
            Math.floor(Math.random() * SECOND_ROULETTE_CONFIG.segments)
        )

        this._logSpinResult(this._secondRouletteResults, SECOND_ROULETTE_CONFIG.wheelEmojis, true)

        // Get the bonus points from second roulette
        const secondRouletteBonus = this._getSecondRouletteCombination()

        // Animate the wheels
        this._animateWheelSpin(this._secondRoulette.wheels, this._secondRouletteResults, SECOND_ROULETTE_CONFIG.segments)

        // After wheels stop, process the bonus and return to main machine
        const secondRouletteTimeline = gsap.timeline()
            .call(() => {
                // Apply bonus to collected points
                this._collectedPoints += secondRouletteBonus.points

                this._logMessage(`Second Roulette Bonus: ${secondRouletteBonus.name}`)
                this._logMessage(`Bonus Points: ${secondRouletteBonus.points}`)

                // Update collected points display
                this._updateCollectedPointsDisplay()
            })

        // Use the dedicated method for animating out the second roulette
        secondRouletteTimeline.call(() => {
            this._animateSecondRouletteOut()
        }, null, 6)
    }

    _getSecondRouletteCombination() {
        // Convert result indices to symbol names
        const symbols = this._secondRouletteResults.map(index =>
            SECOND_ROULETTE_CONFIG.symbolNames[index]
        )

        // Calculate base points from the symbols
        let points = symbols.reduce((sum, symbol) =>
            sum + SECOND_ROULETTE_CONFIG.symbolValues[symbol], 0)

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
                isSpecial: false
            }
        } else if (specialComboName) {
            // Special combination
            points *= SECOND_ROULETTE_CONFIG.combinationBonus.specialMatch
            return {
                name: specialComboName,
                points: Math.round(points),
                isSpecial: true
            }
        }

        // Regular combination (no multiplier)
        return {
            name: "Mixed Symbols",
            points: Math.round(points),
            isSpecial: false
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
                ease: 'power4.out'
            })
        })
    }

    _countOccurrences(results, symbolNames) {
        const counts = symbolNames.reduce((acc, symbol) => {
            acc[symbol] = 0
            return acc
        }, {})

        results.forEach(index => {
            const symbolName = symbolNames[index]
            counts[symbolName] = (counts[symbolName] || 0) + 1
        })

        return counts
    }

    _logSpinResult(results, wheelEmojis, isSecondRoulette = false) {
        const resultEmojis = results.map(index => wheelEmojis[index]).join(" ")
        const message = isSecondRoulette ?
            `Second Roulette Spin Result: ${resultEmojis}` :
            `Spin Result: ${resultEmojis}`

        console.log(message)

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
            receiver: 'physical-debug',
        })
    }

    _updateSpinsDisplay() {
        socket.send({
            event: 'update-spins',
            data: {
                value: this._spinsLeft,
            },
            receiver: 'physical-debug',
        })
    }

    _updateCollectedPointsDisplay() {
        socket.send({
            event: 'update-collected-points',
            data: {
                value: this._collectedPoints,
            },
            receiver: 'physical-debug',
        })
    }

    /**
     * Game Control
     */
    _lockWheel(index) {
        gsap.killTweensOf(this._machine.wheels[index].rotation)

        if (!this._machine.wheels[index].isLocked) {
            this._machine.wheels[index].isLocked = true
            console.log(`Wheel ${index} locked. Current rolling points: ${this._rollingPoints}`)
        } else {
            this._machine.wheels[index].isLocked = false
            console.log(`Wheel ${index} unlocked.`)
        }
    }

    _collect() {
        this._spinsLeft = 3
        this._collectedPoints += this._rollingPoints
        this._rollingPoints = 0
        this._lockedPoints = 0

        this._logMessage(`Collected ${this._collectedPoints} points!`)

        // Unlock all wheels
        this._machine.wheels.forEach(wheel => {
            wheel.isLocked = false
        })

        // Update UI
        this._updateCollectedPointsDisplay()
        this._updatePointsDisplay()
        this._updateSpinsDisplay()

        socket.send({
            event: 'reset-buttons-light',
            receiver: 'physical-debug',
        })
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
        socket.on('lever', (e) => { this._leverClickHandler(e) })
        socket.on('button', (e) => { this._buttonClickHandler(e) })
        socket.on('button-collect', (e) => { this._buttonCollectClickHandler(e) })
    }

    _leverClickHandler(e) {
        this._spinWheels()
    }

    _buttonClickHandler(e) {
        if (this._machine.isHandFighting) {
            // remap index to 0, 1, 2 (exclude 3 or more)
            if (e.index > 2) return
            this._hands.setHandAnimation(e.index % 3)
        } else if (this._spinsLeft === 3) {
            this._lockWheel(e.index)
        } else if (this._currentSpinIsDone) {
            this._lockWheel(e.index)
            socket.send({
                event: 'button-light',
                data: {
                    index: e.index,
                },
                receiver: 'physical-debug',
            })
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
            title: 'MachineManager',
            expanded: true,
        })

        folder.addButton({
            title: 'Second roulette',
        }).on('click', () => {
            this._secondRouletteTimeline?.kill()
            this._secondRouletteTimeline = gsap.timeline()
            this._secondRouletteTimeline.add(this._machine.animateInnerMachineBack())
            this._secondRouletteTimeline.add(this._secondRoulette.animateIn())
            this._secondRouletteTimeline.add(this._secondRoulette.animateFlapOut(), '>-1')
        })

        folder.addButton({
            title: 'Second roulette Out',
        }).on('click', () => {
            this._animateSecondRouletteOut()
        })

        folder.addButton({
            title: 'Spin Second Roulette',
        }).on('click', () => {
            this._spinSecondRouletteWheels()
        })
    }
}
