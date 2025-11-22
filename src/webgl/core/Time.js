import EventEmitter from 'core/EventEmitter.js'

export default class Time extends EventEmitter {
	constructor() {
		super()

		// Setup
		this.start = performance.now()
		this.current = this.start
		this.elapsed = 0
		this.delta = 16
		this.animationFrameId = null
		this.stopped = false

		this.tick = this.tick.bind(this)
		this.animationFrameId = requestAnimationFrame(this.tick)
	}

	tick(currentTime) {
		if (this.stopped) return

		this.delta = currentTime - this.current
		this.current = currentTime
		this.elapsed = this.current - this.start

		this.trigger('tick')

		this.animationFrameId = requestAnimationFrame(this.tick)
	}

	dispose() {
		this.stopped = true
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}
	}
}
