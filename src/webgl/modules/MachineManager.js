import Experience from 'core/Experience.js'
import gsap from 'gsap'
import Socket from '@/scripts/Socket.js'

const socket = new Socket()
socket.connect('machine')

export default class MachineManager {
    constructor(options = {}) {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug

        this._machine = options.machine
        this._secondRoulette = options.secondRoulette
        this._physicalDebug = options.physicalDebug
        this._hands = options.hands

        this._createConstants()

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
        this._spinSecondRouletteWheels();
    }

    /**
     * Private
     */
    _createConstants() {
        this._currentSpinPoints = 0;
        this._rollingPoints = 0;
        this._collectedPoints = 0;
        this._round = 1
        this._spinsLeft = 3
        this._maxSpins = 3

        this._numWheels = 5;
        this._segments = 5;
        this._results = new Array(5).fill(0);
        this._customCombinations = new Map(); // Custom sequences with their points
        this._basePoints = {
            "Quintuple": 50,
            "Carré": 40,
            "Full House": 35,
            "Brelan": 25,
            "Double Paire": 20,
            "Paire": 10,
            "Carte haute": 5
        };

        // de bas en haut sur la texture (depend des uvs de la roulette et de la base rotation offset)
        // this._wheelEmojis = ["🍌", "🍊", "🔺", "🍏", "7️⃣", "❤️"];
        //reversed version
        this._wheelEmojis = ["", "7️⃣", "🍏", "🔺", "🍊", "🍌"];
        this._wheelEmojis = ["🔴", "👑", "💎", "💀", "👁️"];
        this._wheelEmojis = ["🔴", "👑", "💎", "💀", "7️⃣"];
        // reverse the array
        this._wheelEmojis = this._wheelEmojis.reverse();

        this._symbolValues = {
            "jeton": 100, // Jeton
            "couronne": 50,  // Couronne
            "diamant": 0,   // Diamant
            "crane": "malus", // Crâne
            "oeuil": "special" // Œil
        };

        this._symbolNames = [
            'oeuil',
            'crane',
            'diamant',
            'couronne',
            'jeton',
        ]

        this._combinationPoints = {
            "5jeton": 1000,
            "5couronne": 600,
            "unique": 1500 // Suite complète (différent symbole sur chaque roulette)
        };

        // Second roulette specific constants
        this._secondRouletteNumWheels = 2;
        this._secondRouletteSegments = 5;
        this._secondRouletteResults = new Array(2).fill(0);
        this._secondRouletteWheelEmojis = ["🔮", "🎭", "🎯", "⚡", "🎲"];
        this._secondRouletteSymbolNames = [
            'magic',   // 🔮
            'mask',    // 🎭
            'target',  // 🎯
            'thunder', // ⚡
            'dice'     // 🎲
        ];
        this._secondRouletteSymbolValues = {
            "magic": 200,    // 🔮
            "mask": 150,     // 🎭
            "target": 300,   // 🎯
            "thunder": 250,  // ⚡
            "dice": 400      // 🎲
        };
        this._secondRouletteCombinationBonus = {
            "match": 2.5,     // Multiplier when both wheels match
            "specialMatch": 5 // Multiplier for specific combinations
        };
    }

    _addCustomCombination(sequence, points) {
        const sortedSeq = sequence.sort((a, b) => a - b).join(",");
        this._customCombinations.set(sortedSeq, points);
    }

    _countOccurrences() {
        const counts = this._symbolNames.reduce((acc, symbol) => {
            acc[symbol] = 0; // Initialize all symbols with zero count
            return acc;
        }, {});

        this._results.forEach(index => {
            const symbolName = this._symbolNames[index];
            counts[symbolName] = (counts[symbolName] || 0) + 1;
        });

        return counts;
    }

    /** Checks for a custom sequence */
    _isCustomSequence() {
        const sortedResults = [...new Set(this._results)].sort((a, b) => a - b).join(",");
        return this._customCombinations.get(sortedResults) || null;
    }

    _lockWheel(index) {
        gsap.killTweensOf(this._machine.wheels[index].rotation);

        if (!this._machine.wheels[index].isLocked) {
            this._machine.wheels[index].isLocked = true;
        } else {
            this._machine.wheels[index].isLocked = false;
        }
    }

    _collect() {
        this._spinsLeft = 3
        this._collectedPoints += this._rollingPoints;
        this._rollingPoints = 0;
        console.log(`Collected ${points} points! Total: ${this.__totalPoints}`);
        this._physicalDebug.printToRightScreen(`Collected ${this._collectedPoints} points!`);

        this._machine.wheels.forEach(wheel => {
            wheel.isLocked = false
        })

        // Update screen points
        socket.send({
            event: 'update-collected-points',
            data: {
                value: this._collectedPoints,
            },
            receiver: 'physical-debug', // add physical non-debug too
        })

        socket.send({
            event: 'update-rolling-points',
            data: {
                value: this._rollingPoints,
            },
            receiver: 'physical-debug', // add physical non-debug too
        })

        socket.send({
            event: 'update-spins',
            data: {
                value: this._spinsLeft,
            },
            receiver: 'physical-debug', // add physical non-debug too
        })

        socket.send({
            event: 'reset-buttons-light',
            receiver: 'physical-debug', // add physical non-debug too
        })
    }

    _getCombination() {
        const counts = this._countOccurrences();
        let points = 0;
        let craniumCount = counts["crane"] || 0;
        let eyeCount = counts["oeuil"] || 0;
        let uniqueSymbols = Object.keys(counts).filter(symbol => counts[symbol] > 0).length; // Fix unique detection

        // Check for special cases first
        if (craniumCount >= 3) return { name: "Farkle", points: 0, farkle: true };
        if (craniumCount === 2) points -= 30;
        if (craniumCount === 1) points -= 10;

        // Check for unique symbol jackpot
        if (uniqueSymbols === this._machine.wheels.length) {
            return { name: "Suite Complète", points: this._combinationPoints["unique"] };
        }

        // Count normal points for jetons and couronnes
        points += (counts["jeton"] || 0) * this._symbolValues["jeton"];
        points += (counts["couronne"] || 0) * this._symbolValues["couronne"];

        // Check for 5-symbol special jackpot
        ["jeton", "couronne"].forEach(symbol => {
            let comboKey = `5${symbol}`;
            if (counts[symbol] === 5 && this._combinationPoints[comboKey]) {
                points = this._combinationPoints[comboKey]; // Override with jackpot
            }
        });

        // Handle special Eye mechanic
        if (eyeCount >= 3) {
            return { name: "Special Roulette", points: 0, special: true };
        }

        const isLastSpin = this._spinsLeft === 0;

        if (points <= 0 && isLastSpin) return { name: "Farkle", points: 0, farkle: true };
        else if (points <= 0) return { name: "No crocodilo bombardelo...", points, farkle: false };

        return { name: "Valid Combination", points, farkle: false };
    }

    _getPoints() {
        const combination = this._getCombination();
        return combination.points;
    }

    _spinWheels() {
        this._currentSpinIsDone = false;
        const previousResults = this._results;
        this._results = this._machine.wheels.map((wheel, index) => {
            if (wheel.isLocked) return previousResults[index];
            return Math.floor(Math.random() * this._wheelEmojis.length);
        });

        console.log("Spin Result:", this._results.map(index => this._wheelEmojis[index]).join(" "));
        this._physicalDebug.printToRightScreen(`Spin Result: ${this._results.map(index => this._wheelEmojis[index]).join(" ")}`);

        const { name, points, farkle, special } = this._getCombination();

        this._currentSpinPoints = points;

        if (this._spinsLeft === 0) {
            this._collect();
            this._spinsLeft = 3
        }
        this._rollingPoints += points;
        this._spinsLeft -= 1;

        socket.send({
            event: 'update-spins',
            data: {
                value: this._spinsLeft,
            },
            receiver: 'physical-debug', // add physical non-debug too
        })

        if (farkle) {
            console.log("Farkle! Score of the round is lost.");
            this._physicalDebug.printToRightScreen("Farkle! Score of the round is lost.");
            this._rollingPoints = 0;
        } else {
            console.log(`Combination: ${name}`);
            console.log(`Points: ${points}`);
            this._physicalDebug.printToRightScreen(`Combination: ${name}`);
            this._physicalDebug.printToRightScreen(`Points: ${points}`);
        }

        if (special) {
            console.log("Triggering Special Roulette Mechanics!");
            this._physicalDebug.printToRightScreen("Triggering Special Roulette Mechanics!");

            // Trigger the second roulette
            this._triggerSecondRoulette();
        }

        gsap.delayedCall(2, () => {
            socket.send({
                event: 'update-rolling-points',
                data: {
                    value: this._rollingPoints,
                },
                receiver: 'physical-debug', // add physical non-debug too
            })

            this._currentSpinIsDone = true;
        })

        this._machine.wheels.forEach((wheel, index) => {
            gsap.killTweensOf(wheel.rotation);
            if (wheel.isLocked) return;

            const randomSegment = this._results[index];
            const segmentAngle = 1 / this._wheelEmojis.length;
            const fullRotations = 5;
            const rotationDegrees = wheel.rotation.value;
            const previousRotationDegrees = rotationDegrees % 1;
            const rotationToStopAngle = randomSegment * segmentAngle - previousRotationDegrees;
            const targetRotation = rotationDegrees + (fullRotations + rotationToStopAngle);

            gsap.to(wheel.rotation, {
                value: targetRotation,
                duration: 2 + index * 0.3,
                ease: 'power4.out'
            });
        });
    }

    _triggerSecondRoulette() {
        // Transition to second roulette
        gsap.timeline()
            .call(() => {
                this._machine.animateInnerMachineBack();
            })
            .call(() => {
                this._secondRoulette.animateFlapOut();
            })
            .delay(1)
            .call(() => {
                this._spinSecondRouletteWheels();
            });
    }

    _spinSecondRouletteWheels() {
        this._secondRouletteResults = Array(this._secondRouletteNumWheels).fill(0).map(() =>
            Math.floor(Math.random() * this._secondRouletteSegments)
        );

        console.log("Second Roulette Spin Result:",
            this._secondRouletteResults.map(index => this._secondRouletteWheelEmojis[index]).join(" "));

        if (this._physicalDebug) {
            this._physicalDebug.printToRightScreen(
                `Second Roulette: ${this._secondRouletteResults.map(index => this._secondRouletteWheelEmojis[index]).join(" ")}`
            );
        }

        // Get the bonus points from second roulette
        const secondRouletteBonus = this._getSecondRouletteCombination();

        // Animate the wheels
        this._secondRoulette.wheels.forEach((wheel, index) => {
            gsap.killTweensOf(wheel.rotation);

            const randomSegment = this._secondRouletteResults[index];
            const segmentAngle = 1 / this._secondRouletteSegments;
            const fullRotations = 5;
            const rotationDegrees = wheel.rotation.value;
            const previousRotationDegrees = rotationDegrees % 1;
            const rotationToStopAngle = randomSegment * segmentAngle - previousRotationDegrees;
            const targetRotation = rotationDegrees + (fullRotations + rotationToStopAngle);

            gsap.to(wheel.rotation, {
                value: targetRotation,
                duration: 2 + index * 0.3,
                ease: 'power4.out'
            });
        });

        // After wheels stop, process the bonus and return to main machine
        const secondRouletteTimeline = gsap.timeline()
            .call(() => {
                // Apply bonus to collected points
                this._collectedPoints += secondRouletteBonus.points;

                console.log(`Second Roulette Bonus: ${secondRouletteBonus.name}`);
                console.log(`Bonus Points: ${secondRouletteBonus.points}`);

                if (this._physicalDebug) {
                    this._physicalDebug.printToRightScreen(`Bonus: ${secondRouletteBonus.name}`);
                    this._physicalDebug.printToRightScreen(`Points: ${secondRouletteBonus.points}`);
                }

                // Update collected points display
                socket.send({
                    event: 'update-collected-points',
                    data: {
                        value: this._collectedPoints,
                    },
                    receiver: 'physical-debug',
                });
            })

        secondRouletteTimeline.call(() => {
            console.log("Animating flap in");
            this._secondRoulette.animateFlapIn();
        }, null, 6)

        secondRouletteTimeline.call(() => {
            this._machine.animateInnerMachineFront();
        }, null, 8)
    }

    _getSecondRouletteCombination() {
        // Convert result indices to symbol names
        const symbols = this._secondRouletteResults.map(index =>
            this._secondRouletteSymbolNames[index]
        );

        // Calculate base points from the symbols
        let points = symbols.reduce((sum, symbol) =>
            sum + this._secondRouletteSymbolValues[symbol], 0);

        // Check if both wheels show the same symbol (matching pair)
        const isMatch = symbols[0] === symbols[1];

        // Check for special combinations
        const specialCombos = {
            "magic-thunder": "Magical Thunder",  // 🔮 + ⚡
            "target-dice": "Lucky Shot",         // 🎯 + 🎲
            "mask-target": "Perfect Disguise"    // 🎭 + 🎯
        };

        // Sort the symbols to check for special combos regardless of wheel order
        const comboKey = [...symbols].sort().join('-');
        const specialComboName = specialCombos[comboKey];

        // Apply multipliers based on combinations
        if (isMatch) {
            // Both wheels show same symbol
            points *= this._secondRouletteCombinationBonus.match;
            return {
                name: `Double ${symbols[0]} (${this._secondRouletteWheelEmojis[this._secondRouletteResults[0]]})`,
                points: Math.round(points),
                isSpecial: false
            };
        } else if (specialComboName) {
            // Special combination
            points *= this._secondRouletteCombinationBonus.specialMatch;
            return {
                name: specialComboName,
                points: Math.round(points),
                isSpecial: true
            };
        }

        // Regular combination (no multiplier)
        return {
            name: "Mixed Symbols",
            points: Math.round(points),
            isSpecial: false
        };
    }

    /**
     * Events
     */
    _createEventListeners() {
        socket.on('lever', (e) => { this._leverClickHandler(e) })
        socket.on('button', (e) => { this._buttonClickHandler(e) })
        socket.on('button-collect', (e) => { this._buttonCollectClickHandler(e) })
        // socket.on('remote', (e) => { this._remoteClickHandler(e) })
    }

    _leverClickHandler(e) {
        this._spinWheels()
    }

    _buttonClickHandler(e) {
        if (this._machine.isHandFighting) {
            // remap index to 0, 1, 2 (exclude 3 or more)
            if (e.index > 2) return;
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
                receiver: 'physical-debug', // add physical non-debug too
            })
        }
    }

    _buttonCollectClickHandler(e) {
        this._collect()
    }

    _remoteClickHandler(e) {
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
            this._secondRouletteTimeline = gsap.timeline();
            this._secondRouletteTimeline.call(() => {
                this._machine.animateInnerMachineBack()
            })
            this._secondRouletteTimeline.call(() => {
                this._secondRoulette.animateIn()
            })
        });

        folder.addButton({
            title: 'Spin Second Roulette',
        }).on('click', () => {
            this._spinSecondRouletteWheels();
        });
    }
}
