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
    occurrencePoints: {
        "triple": 40,    // Points for a triple of any symbol (except cranium)
        "quadruple": 60, // Points for four of any symbol (except cranium)
        "quintuple": 100 // Points for five of any symbol (except cranium)
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
        this._currentSpins = 0

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
        // If user tries to spin with no spins left, auto-collect
        // if (this._spinsLeft <= 0) {
        //     // this._logMessage("No spins left! Collecting points automatically.")
        //     // this._collect()
        //     // return
        //     // else if all wheels are locked
        // } else 
        if (this._machine.wheels.every(wheel => wheel.isLocked)) {
            this._logMessage("All wheels are locked! Collecting points automatically.")
            this._collect()
            return
        }

        if (!this._currentSpinIsDone) return

        this._currentSpinIsDone = false
        this._previousResults = [...this._results]

        // Determine new results for non-locked wheels
        this._results = this._machine.wheels.map((wheel, index) => {
            if (wheel.isLocked) return this._previousResults[index]
            return Math.floor(Math.random() * MAIN_ROULETTE_CONFIG.segments)
        })

        this._logSpinResult(this._results, MAIN_ROULETTE_CONFIG.wheelEmojis)

        // Decrement spins first
        // this._spinsLeft -= 1
        // this._updateSpinsDisplay()
        this._currentSpins += 1

        // Check for triple cranium farkle
        const counts = this._countOccurrences(this._results, MAIN_ROULETTE_CONFIG.symbolNames)
        if (counts["crane"] >= 3) {
            // Farkle - clear points and update UI
            this._logMessage("Farkle! Triple cranium - score of the round is lost.")
            this._rollingPoints = 0
            this._currentSpins = 0
            this._updatePointsDisplay()

            // Note: Even on last spin, we don't auto-collect anymore
        } else {
            // Check for special roulette trigger (3+ eyes)
            const special = counts["oeuil"] >= 3

            // No auto-collect on last spin - user must manually collect

            // Trigger special roulette if needed
            if (special) {
                this._logMessage("Triggering Special Roulette Mechanics!")
                this._triggerSecondRoulette()
            }
        }

        // if last spin then get points all wheels including the non locked ones but dont add then to the rolling points and if its zero new points then its farkle 
        // if (this._spinsLeft === 0) {
        const points = this._getPoints({ isLastSpin: true })
        if (this._rollingPoints - points >= 0) {
            this._logMessage("Farkle! No points from last spin.")
            this._currentSpins = 0
            this._rollingPoints = 0
            this._updatePointsDisplay()

            gsap.delayedCall(2, () => {
                this._collect()
            })
        }
        // }

        // Animate wheels
        this._animateWheelSpin(this._machine.wheels, this._results, MAIN_ROULETTE_CONFIG.segments)

        // Update UI when animation completes
        gsap.delayedCall(2, () => {
            this._currentSpinIsDone = true
        })
    }

    /**
     * Points Calculation
     */
    _getPoints(options = { isLastSpin: false }) {
        // This function calculates points considering ONLY locked wheels
        // Get results for locked wheels only
        const results = []

        this._machine.wheels.forEach((wheel, index) => {
            if (options.isLastSpin) {
                results.push(this._results[index])
            } else if (wheel.isLocked) {
                results.push(this._results[index])
            }
        })

        // If no wheels are locked, return 0 points
        if (results.length === 0) {
            return 0
        }

        // Count occurrences of symbols in locked wheels
        const counts = {}
        MAIN_ROULETTE_CONFIG.symbolNames.forEach(name => counts[name] = 0)

        results.forEach(index => {
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
        const craniumCount = counts["crane"] || 0
        if (craniumCount === 2) points -= 30
        if (craniumCount === 1) points -= 10

        // Don't allow negative points
        return Math.max(0, points)
    }

    _calculateIndividualSymbolPoints(counts) {
        // Calculate individual symbol points (not occurrence-based)
        let points = 0
        points += (counts["jeton"] || 0) * MAIN_ROULETTE_CONFIG.symbolValues["jeton"]
        points += (counts["couronne"] || 0) * MAIN_ROULETTE_CONFIG.symbolValues["couronne"]
        // Add points for other symbols if needed

        return points
    }

    _calculateOccurrencePoints(counts) {
        // Calculate points based on symbol occurrences (pairs, triples, etc.)
        let occurrencePoints = 0

        // Exclude crane from occurrence calculations
        const validSymbols = Object.keys(counts).filter(symbol =>
            symbol !== "crane" && counts[symbol] > 1
        )

        validSymbols.forEach(symbol => {
            const count = counts[symbol]
            // if (count === 2) {
            //     occurrencePoints += MAIN_ROULETTE_CONFIG.occurrencePoints.pair
            // } else 
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

        // Toggle lock state
        this._machine.wheels[index].isLocked = !this._machine.wheels[index].isLocked

        // Log the lock/unlock action
        if (this._machine.wheels[index].isLocked) {
            this._logMessage(`Wheel ${index} locked`)
        } else {
            this._logMessage(`Wheel ${index} unlocked`)
        }

        // Recalculate points based only on locked wheels
        this._rollingPoints = this._getPoints()

        // Log updated points
        this._logMessage(`Updated rolling points: ${this._rollingPoints}`)

        // Update UI
        this._updatePointsDisplay()

        // Update UI for locked wheel
        socket.send({
            event: 'button-light',
            data: {
                index: index,
                state: this._machine.wheels[index].isLocked
            },
            receiver: 'physical-debug',
        })
    }

    _collect() {
        // Reset spins for next round
        this._currentSpins = 0
        this._collectedPoints += this._rollingPoints
        this._logMessage(`Collected ${this._rollingPoints} points!`)

        this._rollingPoints = 0

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
        } else if (this._currentSpins > 0 && this._currentSpinIsDone) {
            // Only allow locking wheels after first spin and when current spin is done
            this._lockWheel(e.index)
            console.log('locking wheel', e.index)
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
