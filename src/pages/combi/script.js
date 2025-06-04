import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'
import { MAIN_ROULETTE_CONFIG } from 'webgl/modules/MachineManager.js'

const experience = new Experience(document.querySelector('canvas#webgl'))

const socket = new Socket()
socket.connect('combi')

//matrix 5*7
const matrix = [
	['-', 'x1', 'x3', 'x4', 'x5'],
	['orange', '-', '50', '100', '500'],
	['lime', '25', '100', '300', '800'],
	['cherry', '50', '250', '450', '1000'],
	['grapes', '75', '350', '550', '1400'],
	['farkleIcon', '-100', 'farkle', 'farkle', 'farkle'],
	['special', '-', 'jackpot', 'jackpot', 'jackpot'],
]
const combiElement = document.querySelector('.combi')

matrix.forEach((el) => {
	el.forEach((cell) => {
		const cellElement = document.createElement('div')
		cellElement.classList.add('combi__item')
		cellElement.textContent = cell
		combiElement.appendChild(cellElement)
	})
})

console.log(MAIN_ROULETTE_CONFIG)
