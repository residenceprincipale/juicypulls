import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'

const canvasElement = document.querySelector('canvas#webgl')
const experience = new Experience(canvasElement)

const socket = new Socket()
socket.connect('score')

//duplicate .score and apply filter blur to do like bloom
const overlayElement = document.querySelector('.overlay')
const scoreElement = document.querySelector('.score')
const currentElement = document.querySelector('.current')
const tokensElement = document.querySelector('.tokens')
const tokensValueElement = tokensElement.querySelector('.value')
const quotaElement = document.querySelector('.quota')
const quotaValueElement = quotaElement.querySelector('.value')
const bankElement = document.querySelector('.bank')
const bankValueElement = bankElement.querySelector('.value')
let lastOverlayElement = null

splitCharacters(currentElement)
splitCharacters(tokensValueElement)
splitCharacters(quotaValueElement)
cloneAndBlur()

function cloneAndBlur() {
	if (lastOverlayElement) {
		lastOverlayElement.remove()
	}
	const overlayClone = overlayElement.cloneNode(true)
	overlayClone.classList.add('overlay-blur')
	scoreElement.parentNode.appendChild(overlayClone)
	lastOverlayElement = overlayClone
}

function splitCharacters(element) {
	const text = element.textContent
	const characters = text.split('')
	element.textContent = '' // Clear the original text
	characters.forEach((char) => {
		const span = document.createElement('span')
		span.textContent = char
		element.appendChild(span)
	})
}

socket.on('update-rolling-points', ({ value }) => {
	currentElement.textContent = value.toString().padStart(4, '0')
	splitCharacters(currentElement)
	cloneAndBlur()
})

socket.on('update-collected-points', ({ value }) => {
	bankValueElement.textContent = value.toString().padStart(4, '0')
	cloneAndBlur()
})

socket.on('update-spin-tokens', ({ value }) => {
	tokensValueElement.textContent = value.toString().padStart(4, '0')
	splitCharacters(tokensValueElement)
	cloneAndBlur()
})

socket.on('show-message', showMessage)
socket.on('hide-message', hideMessage)

const fullscreenTextElement = document.querySelector('.fullscreen-text')
const innerTextElement = document.querySelector('.inner-text')

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
		fullscreenTextElement.appendChild(textElement)
		currentElement.style.visibility = 'hidden'
		bankElement.style.visibility = 'hidden'
		tokensElement.style.visibility = 'hidden'
		quotaElement.style.visibility = 'hidden'
		canvasElement.style.visibility = 'hidden'
	} else if (size === 'inner') {
		innerTextElement.appendChild(textElement)
		currentElement.style.visibility = 'hidden'
		bankElement.style.visibility = 'hidden'
	}
	cloneAndBlur()
}

function hideMessage() {
	fullscreenTextElement.innerHTML = ''
	innerTextElement.innerHTML = ''
	currentElement.style.visibility = 'visible'
	bankElement.style.visibility = 'visible'
	tokensElement.style.visibility = 'visible'
	quotaElement.style.visibility = 'visible'
	canvasElement.style.visibility = 'visible'
}
