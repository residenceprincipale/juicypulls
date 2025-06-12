import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('game')

if (!window.location.hash.includes('debug')) {
	const canvas = document.querySelector('canvas#webgl')
	canvas.style.cursor = 'none'
}
const subliminalMessage = document.querySelector('.subliminal-message')

socket.on('show-subliminal', onSubliminalMessage)

function onSubliminalMessage({ message }) {
	const occurence = 5

	subliminalMessage.innerHTML = Array.from({ length: occurence }, () => {
		const randomX = Math.random() * 600 - 300
		return `<span style="transform: translateX(${randomX}px)">${message}</span>`
	}).join('')
	subliminalMessage.style.display = 'flex'

	setTimeout(() => {
		subliminalMessage.style.display = 'none'
	}, 200)
}
