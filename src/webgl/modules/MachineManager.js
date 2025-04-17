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

        this._createConstants()

        this._createEventListeners()

        // if (this._debug.active) this._createDebug()
    }

    /**
     * Getters & Setters
     */

    /**
     * Public

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

        const { name, points, farkle, special } = this._getCombination();

        this._currentSpinPoints = points;

        this._rollingPoints += points;
        if (this._spinsLeft === 0) {
            this._spinsLeft = 3
        }
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
            this._rollingPoints = 0;
        } else {
            console.log(`Combination: ${name}`);
            console.log(`Points: ${points}`);
        }

        if (special) {
            console.log("Triggering Special Roulette Mechanics!");
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
        if (this._spinsLeft === 3) {

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
        addMaterialDebug(folder, this._rouletteMaterial)
    }
}
