import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'
import { MAIN_ROULETTE_CONFIG } from 'webgl/modules/MachineManager.js'
import initSecondScreenMessage from '@/scripts/secondScreenMessage.js'

const canvasElement = document.querySelector('canvas#webgl')
const overlayElement = document.querySelector('.overlay')
const combiElement = document.querySelector('.combi')
const fullscreenTextElement = document.querySelector('.fullscreen-text')
const innerTextElement = document.querySelector('.inner-text')

const experience = new Experience(canvasElement)
const socket = new Socket()
socket.connect('combi')

const emojiBackgrounds = {
	'🍒': '58.5%',
	'🍊': '41%',
	'🍇': '22.5%',
	'🍋': '4%',
	'💀': '78%',
	7: '97%',
}

const multiplierOrder = ['x1', 'x3', 'x4', 'x5']
const symbolOrder = MAIN_ROULETTE_CONFIG.symbolNames

function buildMatrix() {
	const matrix = [['-', ...multiplierOrder]]
	MAIN_ROULETTE_CONFIG.symbolNames.reverse().forEach((emoji) => {
		const emojiValue = MAIN_ROULETTE_CONFIG.symbolValues[emoji]
		const { triple, quadruple, quintuple } = MAIN_ROULETTE_CONFIG.occurrencePoints
		const malusPoints = MAIN_ROULETTE_CONFIG.malusPoints
		if (emojiValue === 'malus') {
			matrix.push([emoji, malusPoints[1], 'FARKLE', 'FARKLE', 'FARKLE'])
		} else if (emojiValue === 'special') {
			matrix.push([emoji, '-', 'SPECIAL', 'SPECIAL', 'SPECIAL'])
		} else {
			matrix.push([
				emoji,
				emojiValue > 0 ? emojiValue : '-',
				emojiValue * 3 + triple,
				emojiValue * 4 + quadruple,
				emojiValue * 5 + quintuple,
			])
		}
	})
	return matrix
}

function createCell(cell, yIndex, xIndex) {
	const cellElement = document.createElement('div')
	cellElement.classList.add('combi__item')
	cellElement.dataset.row = yIndex
	cellElement.dataset.column = xIndex
	cellElement.dataset.content = cell

	const borderElement = document.createElement('div')
	borderElement.classList.add('combi__item-border')
	cellElement.appendChild(borderElement)

	if (Object.prototype.hasOwnProperty.call(emojiBackgrounds, cell)) {
		const img = document.createElement('div')
		img.classList.add('combi__item-img')
		img.style.backgroundPositionY = emojiBackgrounds[cell]
		cellElement.appendChild(img)
	} else {
		const textElement = document.createElement('div')
		textElement.classList.add('combi__item-text')
		textElement.innerHTML = `<span>${cell}</span>`
		cellElement.appendChild(textElement)
		const scaleFactor = Math.min(3 / textElement.textContent.length, 1)
		textElement.style.transform = `scaleX(${scaleFactor})`
	}
	return cellElement
}

function renderMatrix(matrix, combiElement) {
	matrix.forEach((row, yIndex) => {
		row.forEach((cell, xIndex) => {
			const cellElement = createCell(cell, yIndex, xIndex)
			combiElement.appendChild(cellElement)
		})
	})
}

const matrix = buildMatrix()
renderMatrix(matrix, combiElement)

let lastOverlayElement = null

function cloneAndBlur() {
	if (lastOverlayElement) lastOverlayElement.remove()
	const overlayClone = overlayElement.cloneNode(true)
	overlayClone.classList.add('overlay-blur')
	combiElement.parentNode.appendChild(overlayClone)
	lastOverlayElement = overlayClone
}

function resetCombi() {
	combiElement.querySelectorAll('.combi__item--active').forEach((cell) => {
		cell.classList.remove('combi__item--active')
	})
	cloneAndBlur()
}

function updateCombi({ symbol, value }) {
	// x2 est équivalent à x1
	if (value === 'x2') value = 'x1'
	const symbolIndex = symbolOrder.indexOf(symbol)
	const multiplierIndex = multiplierOrder.indexOf(value)
	if (symbolIndex === -1 || multiplierIndex === -1) {
		console.warn('Invalid symbol or value:', symbol, value)
		return
	}
	combiElement
		.querySelectorAll(`.combi__item[data-row="${symbolIndex + 1}"].combi__item--active`)
		.forEach((cell) => cell.classList.remove('combi__item--active'))
	const cellElement = combiElement.querySelector(
		`.combi__item[data-row="${symbolIndex + 1}"][data-column="${multiplierIndex + 1}"]`,
	)
	if (cellElement) {
		cellElement.classList.add('combi__item--active')
	}
	cloneAndBlur()
}

cloneAndBlur()
socket.on('update-combi', updateCombi)
socket.on('reset-combi', resetCombi)

function fullscreenCallback(textElement) {
	fullscreenTextElement.appendChild(textElement)
	canvasElement.style.visibility = 'hidden'
	combiElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function innerCallback(textElement) {
	innerTextElement.appendChild(textElement)
	combiElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function hideCallback() {
	fullscreenTextElement.innerHTML = ''
	innerTextElement.innerHTML = ''
	canvasElement.style.visibility = 'visible'
	combiElement.style.visibility = 'visible'
	cloneAndBlur()
}

initSecondScreenMessage(socket, fullscreenCallback, innerCallback, hideCallback)

// if is an iframe
if (window.self !== window.top) {
	document.querySelector('html').style.fontSize = '4px'
}
