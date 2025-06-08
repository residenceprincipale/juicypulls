import Socket from '@/scripts/Socket.js'

const socket = new Socket()
export default class TutorialManager {
    constructor() {
        socket.connect('tutorial')

        this._createEventListeners()
    }

    start() {
        // send message PULL LEVER
        // send 

        socket.send({
            event: 'start-tutorial',
            data: {},
        })
    }

    nextStep() {
        console.log('TutorialManager next step')
    }

    previousStep() {
        console.log('TutorialManager previous step')
    }

    _createEventListeners() {
        socket.on('pull-lever', this.pullLever.bind(this))
    }

    pullLever() {
        console.log('TutorialManager pull lever')
    }
}