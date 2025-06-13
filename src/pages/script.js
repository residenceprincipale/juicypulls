import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'
import gsap from 'gsap'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('game')

if (!window.location.hash.includes('debug')) {
	const canvas = document.querySelector('canvas#webgl')
	canvas.style.cursor = 'none'
}
const subliminalMessage = document.querySelector('.subliminal-message')
const screamerVideoElement = document.querySelector('.screamer-video')

socket.on('show-subliminal', onSubliminalMessage)
socket.on('lose-final', onLoseFinal)
socket.on('jackpot', () => {
	experience.scene.resources.items.jackpotAudio.play()
})
socket.on('jackpot-end', () => {
	experience.scene.resources.items.jackpotAudio.stop()
})

function onSubliminalMessage({ message }) {
	const occurence = 5
	experience.scene.resources.items.subliminalAudio.play()

	subliminalMessage.innerHTML = Array.from({ length: occurence }, () => {
		const randomX = Math.random() * 600 - 300
		return `<span style="transform: translateX(${randomX}px)">${message}</span>`
	}).join('')
	subliminalMessage.style.display = 'flex'

	setTimeout(() => {
		subliminalMessage.style.display = 'none'
		experience.scene.resources.items.subliminalAudio.stop()
	}, 250)
}

function onLoseFinal() {
	gsap.to(screamerVideoElement, {
		autoAlpha: 1,
		duration: 0.5,
	})
	screamerVideoElement.play()

	experience.scene.resources.items.screamerAudio.play()
	screamerVideoElement.onended = () => {
		experience.scene.resources.items.screamerAudio.stop()
		Object.keys(experience.scene.resources.items).forEach((item) => {
			item.includes('Audio') && experience.scene.resources.items[item].stop()
		})
		document.body.style.display = 'none'
		socket.on('lever', () => {
			window.location.reload()
		})
	}
}
