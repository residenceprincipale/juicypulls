import EventEmitter from 'core/EventEmitter.js'

let instance = null
export default class Socket extends EventEmitter {
	constructor() {
		if (instance) {
			return instance
		}
		super()
		instance = this
	}

	connect(name) {
		this.ws = new WebSocket(`ws://localhost:3001?name=${name}`)

		// console.log('connecting to %s', process.env.VITE_SERVER_URL)

		this.ws.onopen = () => {
			this.trigger('open')
		}
		this.ws.onmessage = (messageEvent) => {
			const messageData = JSON.parse(messageEvent.data)
			this.trigger(messageData.event, [messageData.data])
			this.trigger('message', [messageData])
		}
		this.ws.onclose = (event) => {
			this.trigger('close')
		}
	}

	disconnect() {
		this.ws.close()
	}

	send({ event, data, receiver }) {
		const message = JSON.stringify({ event, data, receiver })
		this.ws.send(message)
	}
}
