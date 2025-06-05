import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'
import { MAIN_ROULETTE_CONFIG } from 'webgl/modules/MachineManager.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('combi')

console.log(MAIN_ROULETTE_CONFIG)

//matrix 5*7
const matrix = [['-', 'x1', 'x3', 'x4', 'x5']]
MAIN_ROULETTE_CONFIG.symbolNames.forEach((emoji) => {
	const emojiValue = MAIN_ROULETTE_CONFIG.symbolValues[emoji]
	const occurrencePoints = MAIN_ROULETTE_CONFIG.occurrencePoints
	matrix.push([
		emoji,
		emojiValue,
		emojiValue * 3 + occurrencePoints.triple,
		emojiValue * 4 + occurrencePoints.quadruple,
		emojiValue * 5 + occurrencePoints.quintuple,
	])
})
const combiElement = document.querySelector('.combi')

matrix.forEach((el) => {
	el.forEach((cell) => {
		const cellElement = document.createElement('div')
		cellElement.classList.add('combi__item')
		cellElement.textContent = cell
		combiElement.appendChild(cellElement)
	})
})
