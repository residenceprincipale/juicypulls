import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'

import { MAIN_ROULETTE_CONFIG } from 'webgl/modules/MachineManager.js'
import gsap from 'gsap'

const multiplierOrder = ['x1', 'x3', 'x4', 'x5']
const symbolOrder = MAIN_ROULETTE_CONFIG.symbolNames

const SYMBOL_TINTS_ARRAY = ['#8bffe6', '#fb8bff', '#ffee8b', '#c08bff', '#00c8ff', '#ff0000']

export default class CombinationsScreenManager {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug

		const socket = new Socket()
		socket.connect('combi')

		socket.on('update-combi', this._updateCombi)
		socket.on('reset-combi', this._resetCombi)
		socket.on('reset', this._resetCombi)
		// socket.on('hide', this._hide)
		// socket.on('show', this._show)
		socket.on('jackpot', this._jackpot)
		// socket.on('jackpot-end', this._jackpotEnd)
		socket.on('farkle', this._farkle)
		// socket.on('lose-final', this._loseFinal)
		//

		if (this._debug.active) this._createDebug()
	}

	set screen(value) {
		this._screen = value
		const indexRow = 1
		const indexColumn = 4
		gsap.delayedCall(1.5, () => {
			this._screen.displayCombination({ indexRow, indexColumn })
			this._symbolIndex = indexRow
			this._jackpot()
		})
	}

	get screen() {
		return this._screen
	}

	_resetCombi() {
		// call reset
	}

	_updateCombi({ symbol, value }) {
		console.log({ symbol, value })
		const symbolIndex = symbolOrder.indexOf(symbol)
		const multiplierIndex = multiplierOrder.indexOf(value)
		if (symbolIndex === -1 || multiplierIndex === -1) {
			console.warn('Invalid symbol or value:', symbol, value)
			return
		}
		this._symbolIndex = symbolIndex

		this._screen.displayCombination({ indexRow: symbolIndex, indexColumn: multiplierIndex })

		// Affichage des points si la combinaison existe
		const combiKey = `${multiplierIndex + 3}${symbol}` // x1=3, x3=4, x4=5, x5=6 symboles
	}

	_jackpot() {
		// TODO: reset le marquee au update combi ? en focntion de la chronologie jsp comment ça marche deja
		this._screen.displayMarquee({ tint: SYMBOL_TINTS_ARRAY[this._symbolIndex - 1] })
	}

	_createDebug() {
		if (!this._debug.active) return

		const debugFolder = this._debug.ui.addFolder({
			title: 'Combinations Screen Manager',
			expanded: true,
		})
	}x
}
