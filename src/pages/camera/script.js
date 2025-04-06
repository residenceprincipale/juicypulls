import debounce from '@/scripts/debounce.js'
import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('camera')

const channelContainer = document.querySelector('.channel')
let hasInput = false

function handleInput(channel) {
	console.log('channel', channel)
	if (hasInput) return
	hasInput = true
	channelContainer.innerHTML = channel
	experience.scene.dispatchEvent({ type: 'display-snow' })
	confirmDebounced()
}

function confirm() {
	dispatchEvent(new CustomEvent('no-signal', { detail: { visible: false } }))
	experience.scene.dispatchEvent({ type: 'camera-change', message: channelContainer.innerHTML })
	channelContainer.innerHTML = ''
	hasInput = false
}

const confirmDebounced = debounce(confirm, 1000)

socket.on('channel-change', handleInput)

addEventListener('keydown', (event) => {
	if (!isNaN(Number(event.key)))
		socket.send({
			event: 'channel-change',
			data: event.key,
			receiver: 'camera',
		})
})

const noSignalElement = document.querySelector('.no-signal')
addEventListener('no-signal', ({ detail }) => {
	if (!noSignalElement) return
	noSignalElement.style.display = detail.visible ? 'block' : 'none'
})
