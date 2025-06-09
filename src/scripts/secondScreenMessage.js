import { flickerAnimation } from '@/scripts/uiAnimations.js'

export default function initSecondScreenMessage(socket, fullscreenCallback, innerCallback, hideCallback) {
	socket.on('show-message', showMessage)
	socket.on('hide-message', hideCallback)

	/**
	 * @param {'fullscreen' | 'inner'} size
	 * @param {String} message
	 * @param {Array<{text: String, color: String|undefined, animation: String|undefined}>} modifier
	 * @example
	 * showMessage({
	 * 	message: `PULL THE LEVER`,
	 * 	size: 'fullscreen',
	 * 	modifier: [
	 * 		{
	 * 			text: 'PULL',
	 * 			color: '#ff0000',
	 * 			animation: 'flicker',
	 * 		},
	 * 	],
	 * })
	 */
	function showMessage({ size = 'fullscreen', message, modifier = [] }) {
		hideCallback()
		const textElement = document.createElement('span')
		textElement.classList.add('text')
		textElement.innerText = message

		if (modifier.length > 0) {
			modifier.forEach(({ text, color, animation }) => {
				const modifierElement = document.createElement('span')
				modifierElement.classList.add('modifier')
				if (color) modifierElement.style.color = color
				modifierElement.innerText = text
				textElement.innerHTML = message.replace(text, modifierElement.outerHTML)

				const newModifierElement = textElement.querySelector('.modifier:last-child')

				if (animation) {
					if (animation === 'flicker') {
						flickerAnimation(newModifierElement)
					} else {
						console.warn(`Unknown animation: ${animation}`)
					}
				}
			})
		}
		if (size === 'fullscreen') {
			fullscreenCallback(textElement)
		} else if (size === 'inner') {
			innerCallback(textElement)
		}
	}
}
