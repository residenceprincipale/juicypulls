import Socket from '@/scripts/Socket.js'
import gsap from 'gsap'
import { MAIN_ROULETTE_CONFIG } from './MachineManager'

const socket = new Socket()
export default class TutorialManager {
    constructor(options = {}) {
        this._machineManager = options.machineManager
        this._scene = options.scene

        socket.connect('tutorial')

        this._createEventListeners()

        this._setupMachineManager()
    }

    start() {
        this._isStarted = true

        socket.send({
            event: 'start-tutorial',
            data: {},
        })

        socket.send({
            event: 'show-message',
            data: {
                message: 'PULL THE LEVER',
                size: 'fullscreen',
            },
            receiver: 'score',
        })

        socket.send({
            event: 'show-message',
            data: {
                message: 'PULL THE LEVER',
                size: 'fullscreen',
            },
            receiver: 'combi',
        })
    }

    _setupMachineManager() {
        this._machineManager.firstSpinDone = false
        this._machineManager.isLeverLocked = true
        this._machineManager.spinTokens = 1
    }

    _goToHoldStep() {
        socket.send({
            event: 'show-message',
            data: {
                message: '',
                size: 'fullscreen',
            },
            receiver: 'score',
        })

        socket.send({
            event: 'show-message',
            data: {
                message: '',
                size: 'fullscreen',
            },
            receiver: 'combi',
        })

        gsap.delayedCall(0.5, () => {
            socket.send({
                event: 'show-message',
                data: {
                    message: 'HOLD WHEELS,\nSCORE BIG.',
                    size: 'inner',
                    modifier: [
                        {
                            text: 'HOLD',
                            color: 'yellow',
                        },
                    ],
                },
                receiver: 'score',
            })

            socket.send({
                event: 'hide-message',
                receiver: 'combi',
            })

            this._machineManager.sendPointsToTutorial()
        })
    }

    _goToBankStep() {
        this._isBankStep = true

        socket.send({
            event: 'hide-message',
            receiver: 'score',
        })

        socket.send({
            event: 'show-message',
            data: {
                message: 'BANK ANYTIME TO REACH QUOTA,\nWATCH YOUR JETONS.',
                size: 'inner',
                modifier: [
                    {
                        text: 'BANK',
                        color: 'yellow',
                    },
                ],
            },
            receiver: 'combi',
        })

        this._listenToBank = true

        gsap.delayedCall(1.5, () => {
            this._machineManager.quota = 1000
        })

        gsap.delayedCall(2, () => {
            this._machineManager.spinTokens = 10
        })
    }

    _goToLastStep() {
        socket.send({
            event: 'hide-message',
            receiver: 'combi',
        })

        gsap.delayedCall(1, () => {
            socket.send({
                event: 'show-message',
                data: {
                    message: 'SPIN AT WILL.\nMISS ONCE, LOSE IT ALL.',
                    size: 'inner',
                    // modifier: [
                    //     {
                    //         text: 'YOU WIN!',
                    //         color: 'yellow',
                    //     },
                    // ],
                },
                receiver: 'score',
            })
        })

        gsap.delayedCall(2, () => {
            socket.send({
                event: 'show-message',
                data: {
                    message: 'NOW PULL THE LEVER TO START',
                    size: 'inner',
                    // modifier: [
                    //     {
                    //         text: 'YOU WIN!',
                    //         color: 'yellow',
                    //     },
                    // ],
                },
                receiver: 'combi',
            })

            this._machineManager.isLeverLocked = false
            this._listenToLeverStart = true

            this._scene.startGame()
        })
    }

    _endTutorial() {
        this._isStarted = false
        this._listenToLeverStart = false

        socket.send({
            event: 'hide-message',
            receiver: 'combi',
        })

        socket.send({
            event: 'hide-message',
            receiver: 'score',
        })
    }

    _createEventListeners() {
        socket.on('lever', this._leverClickHandler.bind(this))
        socket.on('update-rolling-points', this._updateRollingPoints.bind(this))
        socket.on('button-collect', this._buttonCollectClickHandler.bind(this))
    }

    _leverClickHandler() {
        if (!this._isStarted) return

        if (!this._machineManager.firstSpinDone) {
            this._machineManager.firstSpinDone = true
            this._machineManager.isLeverLocked = true
            this._machineManager.spinWheels([5, 2, 2, 2, 3])
            this._goToHoldStep()
        } else if (this._listenToLeverStart) {
            this._endTutorial()
        }
    }

    _updateRollingPoints(data) {
        if (this._isBankStep) return

        if (data.value === MAIN_ROULETTE_CONFIG.combinationPoints['3🍒']) {
            this._goToBankStep()
        }
    }

    _buttonCollectClickHandler() {
        if (this._listenToBank) {
            this._listenToBank = false
            this._goToLastStep()
        }
    }
}