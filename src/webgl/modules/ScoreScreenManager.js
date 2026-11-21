import Experience from 'core/Experience.js'
import bus from 'core/EventBus.js'
import gsap from 'gsap'
import { getSymbolTint } from 'webgl/modules/screenSymbols.js'

// Jackpot sizes that have a video on the score screen
const JACKPOT_COUNTS = [3, 4, 5]

export default class ScoreScreenManager {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug

		this._createEventListeners()
	}

	/**
	 * Getters & Setters
	 */
	set screen(value) {
		this._screen = value
	}

	get screen() {
		return this._screen
	}

	/**
	 * Public
	 */
	dispose() {
		this._unsubscribers?.forEach((unsubscribe) => unsubscribe())
		this._unsubscribers = null
		this._jackpotTimeline?.kill()
		this._farkleTimeline?.kill()
	}

	/**
	 * Private
	 */
	_hide() {
		this._screen.hide()
	}

	_show() {
		this._screen.show()
	}

	_reset() {
		this._screen.updateScore(0)
		this._screen.updateJetons(0)
		this._screen.updateQuota(0)
		this._screen.updateBank(0)
	}

	_updateRollingPoints({ value }) {
		this._screen.updateScore(value)
	}

	_updateSpinTokens({ value }) {
		this._screen.updateJetons(value)
	}

	_updateQuota({ value }) {
		this._screen.updateQuota(value)
	}

	_updateCollectedPoints({ value }) {
		this._screen.updateBank(value)
	}

	_jackpot({ symbol, count }) {
		const tint = getSymbolTint(symbol)
		if (!tint || !JACKPOT_COUNTS.includes(count)) {
			console.warn('Invalid jackpot:', symbol, count)
			return
		}

		this._jackpotTimeline?.kill()
		this._jackpotTimeline = gsap.timeline()
		this._jackpotTimeline.add(this._screen.hide(), 0)
		this._jackpotTimeline.add(this._screen.jackpot({ tint, count: `x${count}` }), 0.1)
		this._jackpotTimeline.add(this._screen.show(), 3)
	}

	_farkle() {
		this._screen.updateScore(0)

		this._farkleTimeline?.kill()
		this._farkleTimeline = gsap.timeline()
		this._farkleTimeline.add(this._screen.hide(), 0)
		this._farkleTimeline.add(this._screen.farkle(), 0.1)
		this._farkleTimeline.add(this._screen.show(), 2.7)
	}

	_loseFinal() {
		this._screen.hide()
	}

	_createEventListeners() {
		this._unsubscribers = [
			bus.on('update-collected-points', (data) => this._updateCollectedPoints(data)),
			bus.on('update-rolling-points', (data) => this._updateRollingPoints(data)),
			bus.on('update-spin-tokens', (data) => this._updateSpinTokens(data)),
			bus.on('update-quota', (data) => this._updateQuota(data)),
			bus.on('reset', () => this._reset()),
			bus.on('show', () => this._show()),
			bus.on('hide', () => this._hide()),
			bus.on('farkle', () => this._farkle()),
			bus.on('jackpot', (data) => this._jackpot(data)),
			bus.on('lose-final', () => this._loseFinal()),
		]
	}
}
