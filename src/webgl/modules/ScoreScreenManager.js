import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'

import { MAIN_ROULETTE_CONFIG } from 'webgl/modules/MachineManager.js'
import gsap from 'gsap'

const multiplierOrder = ['x1', 'x3', 'x4', 'x5']
const symbolOrder = MAIN_ROULETTE_CONFIG.symbolNames

const SYMBOL_TINTS_ARRAY = ['#8bffe6', '#fb8bff', '#ffee8b', '#c08bff', '#00c8ff', '#ff0000']

export default class ScoreScreenManager {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug

		const socket = new Socket()
		socket.connect('score')

		socket.on('update-collected-points', this._updateCollectedPoints)
		socket.on('update-rolling-points', this._updateRollingPoints)
		socket.on('update-spin-tokens', this._updateSpinTokens.bind(this))
		socket.on('update-quota', this._updateQuota)
		socket.on('reset', this._reset)
		socket.on('show', this._show)
		socket.on('hide', this._hide)
		socket.on('farkle', this._farkle)
		socket.on('jackpot', this._jackpot)
		socket.on('lose-final', this._loseFinal)
		//

		if (this._debug.active) this._createDebug()
	}

	set screen(value) {
		this._screen = value
		gsap.delayedCall(1.5, () => {
			// this._farkle()
			this._jackpot({ symbol: '🍒', count: 'x3' })
		})
	}

	get screen() {
		return this._screen
	}

	_hide() {
		this._screen.hide()
	}
	_show() {
		this._screen.show()
	}

	_reset() {
		this._screen.updateScore(0)
		this._screen.updateTokens(0)
		this._screen.updateQuota(0)
		this._screen.updateBank(0)
	}

	_updateRollingPoints({ value }) {
		this._screen.updateScore(value)
	}
	_updateSpinTokens({ value }) {
		this._screen.updateTokens(value)
	}
	_updateQuota({ value }) {
		this._screen.updateQuota(value)
	}
	_updateCollectedPoints({ value }) {
		this._screen.updateBank(value)
	}

	_jackpot({ symbol, count }) {
		const symbolIndex = symbolOrder.indexOf(symbol)
		const multiplierIndex = multiplierOrder.indexOf(count)
		if (symbolIndex === -1 || multiplierIndex === -1) {
			console.warn('Invalid symbol or value:', symbol, count)
			return
		}

		this._symbolIndex = symbolIndex
		const tint = SYMBOL_TINTS_ARRAY[this._symbolIndex - 1]
		this._jackpotTimeline?.kill()
		this._jackpotTimeline = new gsap.timeline()
		this._jackpotTimeline.add(this._screen.hide(), 0)
		this._jackpotTimeline.add(this._screen.jackpot({ tint, count }), 0.1)
		this._jackpotTimeline.add(this._screen.show(), 3)
	}

	_farkle() {
		this._screen.updateScore(0)

		this._farkleTimeline?.kill()
		this._farkleTimeline = new gsap.timeline()
		this._farkleTimeline.add(this._screen.hide(), 0)
		this._farkleTimeline.add(this._screen.farkle(), 0.1)
		this._farkleTimeline.add(this._screen.show(), 2.7)
	}

	_loseFinal() {
		this._screen.hide()
	}

	_createDebug() {
		if (!this._debug.active) return

		const debugFolder = this._debug.ui.addFolder({
			title: 'Score Screen Manager',
			expanded: true,
		})
	}
}
