// Symbol rows on the machine screens, top to bottom (matches `textures/combi/combinations.jpg`),
// and the tint used for each symbol's jackpot effects.
export const SCREEN_SYMBOLS = ['🍋', '🍒', '🍊', '🍇', '7', '💀']
export const SYMBOL_TINTS = ['#8bffe6', '#fb8bff', '#ffee8b', '#c08bff', '#00c8ff', '#ff0000']

export function getSymbolTint(symbol) {
	return SYMBOL_TINTS[SCREEN_SYMBOLS.indexOf(symbol)]
}
