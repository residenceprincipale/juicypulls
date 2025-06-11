import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'
import initSecondScreenMessage from '@/scripts/secondScreenMessage.js'
import { gsap } from 'gsap'
import { flickerAnimation } from '@/scripts/uiAnimations.js'

const canvasElement = document.querySelector('canvas#webgl')
const experience = new Experience(canvasElement)

const socket = new Socket()
socket.connect('score')

//duplicate .score and apply filter blur to do like bloom
const overlayElement = document.querySelector('.overlay')
const scoreElement = document.querySelector('.score')
const currentElement = document.querySelector('.current')
const tokensElement = document.querySelector('.tokens')
const tokensValueElement = tokensElement.querySelector('.value')
const quotaElement = document.querySelector('.quota')
const quotaValueElement = quotaElement.querySelector('.value')
const bankElement = document.querySelector('.bank')
const bankValueElement = bankElement.querySelector('.value')
const progressBarElement = document.querySelector('.progress-bar')
const fullscreenTextElement = document.querySelector('.fullscreen-text')
const innerTextElement = document.querySelector('.inner-text')
let lastOverlayElement = null
let collectedPoints = 0
let quotaValue = 0

// Variables pour stopper les flicker animations
let stopCurrentFlicker = null
let stopTokensFlicker = null
let stopBankFlicker = null
let stopQuotaFlicker = null

splitCharacters(currentElement)
splitCharacters(tokensValueElement)
splitCharacters(bankValueElement)
cloneAndBlur()

function cloneAndBlur() {
	if (lastOverlayElement) {
		lastOverlayElement.remove()
	}
	const overlayClone = overlayElement.cloneNode(true)
	overlayClone.classList.add('overlay-blur')
	scoreElement.parentNode.appendChild(overlayClone)
	lastOverlayElement = overlayClone
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

socket.on('update-rolling-points', updateRollingPoints)
socket.on('update-spin-tokens', updateSpinTokens)
socket.on('reset', reset)
socket.on('update-quota', updateQuota)
socket.on('update-collected-points', updateCollectedPoints)
socket.on('hide', hide)
socket.on('show', show)

function hide({ immediate = false } = {}) {
	if (stopCurrentFlicker) stopCurrentFlicker()
	if (stopTokensFlicker) stopTokensFlicker()
	if (stopBankFlicker) stopBankFlicker()
	if (stopQuotaFlicker) stopQuotaFlicker()
	if (immediate) {
		currentElement.style.visibility = 'hidden'
		quotaElement.style.visibility = 'hidden'
		bankElement.style.visibility = 'hidden'
		tokensElement.style.visibility = 'hidden'
		experience.sceneManager.score.hideAnimation(immediate)
		cloneAndBlur()
		return
	}
	gsap.fromTo(
		[currentElement, quotaElement],
		{ opacity: 1 },
		{
			opacity: 0,
			duration: 0.5,
			delay: 1.25,
			onComplete: () => {
				cloneAndBlur()
			},
		},
	)
	gsap.fromTo(
		bankElement,
		{ opacity: 1 },
		{
			opacity: 0,
			duration: 0.5,
			delay: 1,
			onComplete: () => {
				cloneAndBlur()
			},
		},
	)
	gsap.fromTo(
		tokensElement,
		{ opacity: 1 },
		{
			opacity: 0,
			duration: 0.5,
			delay: 0.75,
			onComplete: () => {
				cloneAndBlur()
			},
		},
	)
	experience.sceneManager.score.hideAnimation(immediate)
}

function show({ immediate = false } = {}) {
	if (immediate) {
		currentElement.style.opacity = 1
		quotaElement.style.opacity = 1
		bankElement.style.opacity = 1
		tokensElement.style.opacity = 1
		stopCurrentFlicker = flickerAnimation(currentElement)
		stopQuotaFlicker = flickerAnimation(quotaElement)
		stopBankFlicker = flickerAnimation(bankElement)
		stopTokensFlicker = flickerAnimation(tokensElement)
		experience.sceneManager.score.showAnimation(immediate)
		cloneAndBlur()
		return
	}
	gsap.fromTo(
		[currentElement, quotaElement],
		{ opacity: 0 },
		{
			opacity: 1,
			duration: 1,
			delay: 2,
			onComplete: () => {
				stopCurrentFlicker = flickerAnimation(currentElement)
				stopQuotaFlicker = flickerAnimation(quotaElement)
				cloneAndBlur()
			},
		},
	)
	gsap.fromTo(
		bankElement,
		{ opacity: 0 },
		{
			opacity: 1,
			duration: 1,
			delay: 1.5,
			onComplete: () => {
				stopBankFlicker = flickerAnimation(bankElement)
				cloneAndBlur()
			},
		},
	)
	gsap.fromTo(
		tokensElement,
		{ opacity: 0 },
		{
			opacity: 1,
			duration: 1,
			delay: 1,
			onComplete: () => {
				stopTokensFlicker = flickerAnimation(tokensElement)
				cloneAndBlur()
			},
		},
	)
	experience.sceneManager.score.showAnimation(immediate)
}
function updateRollingPoints({ value }) {
	const oldValue = parseInt(currentElement.textContent.replace(/[^\d-]/g, '')) || 0
	const newValue = value

	if (newValue === oldValue) return

	gsap.killTweensOf(currentElement)
	gsap.to(
		{ value: oldValue },
		{
			value: newValue,
			duration: 0.6,
			ease: 'power2.out',
			onUpdate: function () {
				const displayValue = Math.round(this.targets()[0].value)
				currentElement.textContent = displayValue.toString().padStart(4, '0')
				splitCharacters(currentElement)
				cloneAndBlur()
			},
		},
	)
}

function updateCollectedPoints({ value }) {
	const oldValue = parseInt(bankValueElement.textContent.replace(/\D/g, '')) || 0
	collectedPoints = value
	gsap.to(
		{ value: oldValue },
		{
			value,
			duration: 0.6,
			ease: 'power2.out',
			onUpdate: function () {
				const displayValue = Math.round(this.targets()[0].value)
				bankValueElement.textContent = displayValue.toString().padStart(4, '0')
				splitCharacters(bankValueElement)
				cloneAndBlur()
			},
		},
	)
	// Update progress bar
	const progress = collectedPoints / quotaValue
	gsap.to(progressBarElement, {
		scaleX: progress,
		duration: 0.6,
		ease: 'power2.out',
		onUpdate: function () {
			cloneAndBlur()
		},
	})
}

function updateSpinTokens({ value }) {
	const stringValue = value.toString()
	tokensValueElement.textContent = stringValue.toString().padStart(4, '0')
	splitCharacters(tokensValueElement)
	cloneAndBlur()
}

function updateQuota({ value }) {
	quotaValue = value
	quotaValueElement.textContent = value.toString().padStart(4, '0')
	//update progress bar
	const progress = collectedPoints / value
	gsap.to(progressBarElement, {
		scaleX: progress,
		duration: 0.6,
		ease: 'power2.out',
		onUpdate: function () {
			cloneAndBlur()
		},
	})
}

function reset() {
	currentElement.textContent = '0000'
	splitCharacters(currentElement)
	bankValueElement.textContent = '0000'
	splitCharacters(bankValueElement)
	tokensValueElement.textContent = '0000'
	splitCharacters(tokensValueElement)
	quotaValueElement.textContent = '0000'
	splitCharacters(quotaValueElement)
	cloneAndBlur()
}

function fullscreenCallback(textElement) {
	fullscreenTextElement.appendChild(textElement)
	currentElement.style.visibility = 'hidden'
	bankElement.style.visibility = 'hidden'
	tokensElement.style.visibility = 'hidden'
	quotaElement.style.visibility = 'hidden'
	canvasElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function innerCallback(textElement) {
	innerTextElement.appendChild(textElement)
	currentElement.style.visibility = 'hidden'
	bankElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function hideCallback() {
	fullscreenTextElement.innerHTML = ''
	innerTextElement.innerHTML = ''
	currentElement.style.visibility = 'visible'
	bankElement.style.visibility = 'visible'
	tokensElement.style.visibility = 'visible'
	quotaElement.style.visibility = 'visible'
	canvasElement.style.visibility = 'visible'
	cloneAndBlur()
}

initSecondScreenMessage(socket, fullscreenCallback, innerCallback, hideCallback)

// if is an iframe
if (window.self !== window.top) {
	document.querySelector('html').style.fontSize = innerHeight * 0.015 + 'px'
}
