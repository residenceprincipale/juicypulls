import debounce from '@/scripts/debounce.js'

const channelContainer = document.querySelector('.channel')

let channelContent = '--'

function handleInput(channel) {
	channelContainer.style.visibility = 'visible'
	if (channelContent.includes('--')) channelContent = '-' + channel
	else if (channelContent.includes('-')) channelContent = channelContent[1] + channel

	if (channelContainer.innerHTML !== channelContent) channelContainer.innerHTML = channelContent

	resetDebounced()
}

function reset() {
	channelContent = '--'
	channelContainer.innerHTML = channelContent
	channelContainer.style.visibility = 'hidden'
}

const resetDebounced = debounce(reset, 1000)

addEventListener('keydown', (event) => {
	if (!isNaN(Number(event.key))) handleInput(event.key)
})
