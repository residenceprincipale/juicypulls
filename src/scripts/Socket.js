// Socket.js
import EventEmitter from 'core/EventEmitter.js'
import fauxServer from './FauxServer.js' // 🆕

export default class Socket extends EventEmitter {
	constructor() {
		super()
		this.name = null
		this.ws = null
		this.connectedViaFaux = false // NEW: track if we're using FauxServer
	}

	connect(name) {
		this.name = name

		try {
			this.ws = new WebSocket(`${import.meta.env.VITE_SERVER_URL}?name=${name}`)

			this.ws.onopen = () => {
				this.trigger('open')
			}

			this.ws.onmessage = (messageEvent) => {
				const messageData = JSON.parse(messageEvent.data)
				this.trigger(messageData.event, [messageData.data])
				this.trigger('message', [messageData])
			}

			this.ws.onclose = () => {
				this.trigger('close')
			}

			this.ws.onerror = (err) => {
				console.warn('[Socket] WebSocket error, switching to FauxServer:', err)
				this._fallbackToFaux()
			}
		} catch (err) {
			console.warn('[Socket] WebSocket failed, falling back:', err)
			this._fallbackToFaux()
		}
	}

	disconnect() {
		if (this.connectedViaFaux) {
			// Disconnect from FauxServer
			fauxServer.disconnect(this)
			this.trigger('close')
		} else if (this.ws && this.ws.readyState < 2) {
			// Disconnect WebSocket if still connecting or open
			this.ws.close()
		} else {
			console.warn('[Socket] No active connection to disconnect')
		}
	}

	send({ event, data, receiver }) {
		const message = JSON.stringify({ event, data, receiver })

		if (this.connectedViaFaux) {
			this._onInternalMessage(message)
		} else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(message)
		} else {
			console.warn('[Socket] No connection to send')
		}
	}

	_fallbackToFaux() {
		this.connectedViaFaux = true
		fauxServer.connect(this, this.name) // Register the real Socket instance itself
	}

	_onInternalMessage(message) {
		fauxServer.handleMessage(this, message)
	}
}
