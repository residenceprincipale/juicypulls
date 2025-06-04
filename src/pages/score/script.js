import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('score')

//duplicate .score and apply filter blur to do like bloom
const scoreElement = document.querySelector('.score')
const currentElement = document.querySelector('.current')
const tokensElement = document.querySelector('.tokens')
const tokensValueElement = tokensElement.querySelector('.value')
const quotaElement = document.querySelector('.quota')
const quotaValueElement = quotaElement.querySelector('.value')
const bankElement = document.querySelector('.bank')
const bankValueElement = bankElement.querySelector('.value')
let lastScoreElement = null

splitCharacters(currentElement)
splitCharacters(tokensValueElement)
splitCharacters(quotaValueElement)
cloneAndBlur()

function cloneAndBlur() {
	if (lastScoreElement) {
		lastScoreElement.remove()
	}
	const scoreClone = scoreElement.cloneNode(true)
	scoreClone.classList.add('score-blur')
	scoreElement.parentNode.appendChild(scoreClone)
	lastScoreElement = scoreClone
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

socket.on('update-spin-tokens', ({ value }) => {
	tokensValueElement.textContent = value.toString().padStart(4, '0')
	splitCharacters(tokensValueElement)
	cloneAndBlur()
})
