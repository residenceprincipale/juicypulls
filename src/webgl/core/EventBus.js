/**
 * In-page event bus shared by the game logic, the machine screens and the inputs.
 *
 * - `on(event, callback)` returns an unsubscribe function: keep it and call it in `dispose()`.
 * - `emit(event, data)` calls every listener synchronously. A listener that throws is logged
 *   and doesn't stop the others.
 *
 * Event names are kebab-case (`update-quota`, `button-collect`, …). See CLAUDE.md for the list.
 */
class EventBus {
	constructor() {
		this._listeners = new Map()
	}

	on(event, callback) {
		if (!this._listeners.has(event)) this._listeners.set(event, new Set())
		this._listeners.get(event).add(callback)

		return () => this.off(event, callback)
	}

	off(event, callback) {
		const listeners = this._listeners.get(event)
		if (!listeners) return

		listeners.delete(callback)
		if (listeners.size === 0) this._listeners.delete(event)
	}

	emit(event, data) {
		const listeners = this._listeners.get(event)
		if (!listeners) return

		// Copy so a listener can unsubscribe while the event is being dispatched
		for (const callback of [...listeners]) {
			try {
				callback(data)
			} catch (error) {
				console.error(`[EventBus] Listener for "${event}" failed:`, error)
			}
		}
	}
}

export default new EventBus()
