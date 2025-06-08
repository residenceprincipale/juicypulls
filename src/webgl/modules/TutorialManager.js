import Socket from '@/scripts/Socket.js'
import gsap from 'gsap'

const socket = new Socket()
export default class TutorialManager {
    constructor(options = {}) {
        this._machineManager = options.machineManager

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
    }

    _setupMachineManager() {
        this._machineManager.isPlayingTutorial = true
        this._machineManager.firstSpinDone = false
        this._machineManager.isLeverLocked = true
    }

    _nextStep() {
        console.log('TutorialManager next step')
    }

    _previousStep() {
        console.log('TutorialManager previous step')
    }

    _createEventListeners() {
        socket.on('lever', this._leverClickHandler.bind(this))
    }

    _leverClickHandler() {
        if (!this._isStarted) return

        if (this._machineManager.isPlayingTutorial && !this._machineManager.firstSpinDone) {
            this._machineManager.firstSpinDone = true
            this._machineManager.isLeverLocked = true
            this._machineManager._spinWheels([4, 2, 2, 5, 3])

            gsap.delayedCall(3, () => {
                socket.send({
                    event: 'tutorial-step',
                    data: {
                        index: 1,
                    },
                })
            })
        }
    }
}