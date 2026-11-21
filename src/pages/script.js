import Experience from 'core/Experience.js'
import bus from 'core/EventBus.js'
import gsap from 'gsap'

const experience = new Experience(document.querySelector('canvas#webgl'))

const subliminalMessage = document.querySelector('.subliminal-message')
const screamerVideoElement = document.querySelector('.screamer-video')

// Store timeouts so we can clear them on dispose
let subliminalTimeout = null
let screamerDelayedCall = null

function onSubliminalMessage({ message }) {
	const occurence = 5
	experience.scene.resources.items.subliminalAudio.play()

	subliminalMessage.innerHTML = Array.from({ length: occurence }, () => {
		const randomX = Math.random() * 600 - 300
		return `<span style="transform: translateX(${randomX}px)">${message}</span>`
	}).join('')
	subliminalMessage.style.display = 'flex'

	if (subliminalTimeout) clearTimeout(subliminalTimeout)
	subliminalTimeout = setTimeout(() => {
		subliminalMessage.style.display = 'none'
		experience.scene.resources.items.subliminalAudio.stop()
	}, 250)
}

function onLoseFinal() {
	gsap.to(screamerVideoElement, {
		autoAlpha: 1,
		duration: 0.5,
	})
	screamerVideoElement.playbackRate = 1.2
	screamerVideoElement.play()

	if (screamerDelayedCall) screamerDelayedCall.kill()
	screamerDelayedCall = gsap.delayedCall(3.5, () => {
		experience.scene.resources.items.screamerAudio.play()
	})
	screamerVideoElement.onended = () => {
		experience.scene.resources.items.screamerAudio.stop()
		Object.keys(experience.scene.resources.items).forEach((item) => {
			item.includes('Audio') && experience.scene.resources.items[item].stop()
		})
		document.body.style.display = 'none'
		// Pulling the lever restarts the game
		bus.on('lever', () => {
			window.location.reload()
		})
	}
}

function onJackpot() {
	experience.scene.resources.items.jackpotAudio.play()
}

const unsubscribers = [
	bus.on('show-subliminal', onSubliminalMessage),
	bus.on('lose-final', onLoseFinal),
	bus.on('jackpot', onJackpot),
]

// ------------------------------------------------------------------
// Cleanup function
// ------------------------------------------------------------------
function cleanup() {
	console.log('[Cleanup] Removing event listeners and cleaning up')

	// Remove event bus listeners
	unsubscribers.forEach((unsubscribe) => unsubscribe())

	// Clear timeouts
	if (subliminalTimeout) {
		clearTimeout(subliminalTimeout)
		subliminalTimeout = null
	}

	// Kill GSAP animations
	if (screamerDelayedCall) {
		screamerDelayedCall.kill()
		screamerDelayedCall = null
	}
	gsap.killTweensOf(screamerVideoElement)

	// Dispose experience
	if (experience && experience.dispose) {
		experience.dispose()
	}
}

// ------------------------------------------------------------------
// HMR hooks
// ------------------------------------------------------------------
if (import.meta.hot) {
	// Called *before* the module is replaced
	import.meta.hot.accept(() => {
		console.log('[HMR] Module will be updated – disposing old scene')
	})

	// Called *after* the module is replaced (i.e. right before the old
	// instance is garbage‑collected)
	import.meta.hot.dispose(() => {
		console.log('[HMR] Disposing old Three.js objects')
		cleanup()
	})
}
