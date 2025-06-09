import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'
import initSecondScreenMessage from '@/scripts/secondScreenMessage.js'

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

const fullscreenTextElement = document.querySelector('.fullscreen-text')
const innerTextElement = document.querySelector('.inner-text')

function fullscreenCallback(textElement) {
	fullscreenTextElement.appendChild(textElement)
	currentElement.style.visibility = 'hidden'
	bankElement.style.visibility = 'hidden'
	tokensElement.style.visibility = 'hidden'
	quotaElement.style.visibility = 'hidden'
	canvasElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function innerCallback(textElement) {
	innerTextElement.appendChild(textElement)
	currentElement.style.visibility = 'hidden'
	bankElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function hideCallback() {
	fullscreenTextElement.innerHTML = ''
	innerTextElement.innerHTML = ''
	currentElement.style.visibility = 'visible'
	bankElement.style.visibility = 'visible'
	tokensElement.style.visibility = 'visible'
	quotaElement.style.visibility = 'visible'
	canvasElement.style.visibility = 'visible'
	cloneAndBlur()
}

initSecondScreenMessage(socket, fullscreenCallback, innerCallback, hideCallback)

socket.on('open', () => {
	socket.send({
		event: 'show-message',
		data: {
			message: 'SCORE',
			size: 'inner',
			modifier: [
				{
					text: 'SCORE',
					color: '#ff0000',
				},
			],
		},
		receiver: 'combi',
	})
})
