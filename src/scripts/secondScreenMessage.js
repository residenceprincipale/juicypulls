export default function initSecondScreenMessage(socket, fullscreenCallback, innerCallback, hideCallback) {
	socket.on('show-message', showMessage)
	socket.on('hide-message', hideCallback)

	/**
	 * @param {'fullscreen' | 'inner'} size
	 * @param {String} message
	 * @param {Array<{text: String, color: String}>} modifier
	 * @example
	 * showMessage({
	 * 	message: `PULL THE LEVER`,
	 * 	size: 'fullscreen',
	 * 	modifier: [
	 * 		{
	 * 			text: 'PULL',
	 * 			color: '#ff0000',
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
			modifier.forEach(({ text, color }) => {
				const modifierElement = document.createElement('span')
				modifierElement.classList.add('modifier')
				modifierElement.style.color = color
				modifierElement.innerText = text
				textElement.innerHTML = message.replace(text, modifierElement.outerHTML)
			})
		}
		if (size === 'fullscreen') {
			fullscreenCallback(textElement)
		} else if (size === 'inner') {
			innerCallback(textElement)
		}
	}
}
