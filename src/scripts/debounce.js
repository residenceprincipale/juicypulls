/**
 * Debounce function
 * @param functionToDebounce
 * @param delay
 * @returns {(function(...[*]): void)|*}
 */
export default function debounce(functionToDebounce, delay) {
	let timeoutId
	return function (...args) {
		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => {
			functionToDebounce(...args)
		}, delay)
	}
}
