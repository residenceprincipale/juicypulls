import debounce from '@/scripts/debounce.js'
import Experience from 'core/Experience.js'
import Socket from '@/scripts/Socket.js'
import { init } from 'recast-navigation'

init()

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('camera')

initChannelChange()

function initChannelChange() {
	const channelContainer = document.querySelector('.channel')
	let hasInput = false

	function handleChannelChange(channel) {
		if (hasInput) return
		hasInput = true
		channelContainer.innerHTML = channel
		experience.scene.dispatchEvent({ type: 'display-snow' })
		confirmDebounced()
	}

	function confirmChannelChange() {
		dispatchEvent(new CustomEvent('no-signal', { detail: { visible: false } }))
		experience.scene.dispatchEvent({ type: 'camera-change', message: channelContainer.innerHTML })
		channelContainer.innerHTML = ''
		hasInput = false
	}

	const confirmDebounced = debounce(confirmChannelChange, 1000)

	socket.on('channel-change', handleChannelChange)

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
}
