import Experience from 'core/Experience.js'
import bus from 'core/EventBus.js'
import { SCREEN_SYMBOLS, getSymbolTint } from 'webgl/modules/screenSymbols.js'

// Columns of the combinations table, left to right (column 0 holds the symbol icons)
const COMBI_COLUMNS = ['x1', 'x3', 'x4', 'x5']

export default class CombinationsScreenManager {
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
	}

	/**
	 * Private
	 */
	_resetCombi() {
		this._screen.reset()
	}

	_updateCombi({ symbol, value }) {
		const rowIndex = SCREEN_SYMBOLS.indexOf(symbol)
		const columnIndex = COMBI_COLUMNS.indexOf(value)
		// Pairs ('x2') have no column in the table: keep the previous highlight
		if (rowIndex === -1 || columnIndex === -1) return

		// Rows and columns start at 1 (row 0 is the header, column 0 the icons)
		this._screen.displayCombination({ indexRow: rowIndex + 1, indexColumn: columnIndex + 1 })
	}

	_jackpot({ symbol }) {
		const tint = getSymbolTint(symbol)
		if (tint) this._screen.displayMarquee({ tint })
	}

	_createEventListeners() {
		this._unsubscribers = [
			bus.on('update-combi', (data) => this._updateCombi(data)),
			bus.on('reset-combi', () => this._resetCombi()),
			bus.on('reset', () => this._resetCombi()),
			bus.on('jackpot', (data) => this._jackpot(data)),
		]
	}
}
