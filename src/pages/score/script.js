import Socket from '@/scripts/Socket.js'
import Experience from 'core/Experience.js'
import initSecondScreenMessage from '@/scripts/secondScreenMessage.js'
import { gsap } from 'gsap'
import { RoughEase } from 'gsap/EasePack'
import { flickerAnimation } from '@/scripts/uiAnimations.js'
import { Color } from 'three'
import Leaderboard from '@/scripts/Leaderboard.js'
gsap.registerPlugin(RoughEase)

const canvasElement = document.querySelector('canvas#webgl')
const experience = new Experience(canvasElement)
let scoreBackground = undefined
experience.sceneManager._scene.resources.on('ready', () => {
	scoreBackground = experience.sceneManager.score
})

const socket = new Socket()
socket.connect('score')
const leaderboard = new Leaderboard(socket)
leaderboard.showLeaderboard()

const autoShow = false
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
const farkleVideoElement = document.querySelector('.farkle-video')
const jackpotX4VideoElement = document.querySelector('.jackpot-x4-video')
const jackpotX3VideoElement = document.querySelector('.jackpot-x3-video')
const jackpotX5VideoElement = document.querySelector('.jackpot-x5-video')
const jackpotX4VideoContainerElement = document.querySelector('.jackpot-x4-video-container')
const leftScreamerVideoElement = document.querySelector('.left-screamer-video')
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
	return
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
socket.on('farkle', farkle)
socket.on('jackpot', jackpot)
socket.on('lose-final', loseFinal)

function loseFinal({ leaderboardPoints }) {
	scoreBackground.tint = new Color('#ff4726')
	gsap.to(overlayElement, {
		autoAlpha: 0,
		duration: 0.5,
	})

	leftScreamerVideoElement.style.display = 'initial'
	leftScreamerVideoElement.playbackRate = 1.2
	leftScreamerVideoElement.play()
	leftScreamerVideoElement.onended = () => {
		leftScreamerVideoElement.style.display = 'none'
		gsap.set(overlayElement, {
			autoAlpha: 1,
		})
		hide({ immediate: true })
		scoreBackground.tint = new Color('white')
		leaderboard.handleGameOver(leaderboardPoints)
	}
}
let isFirstJackpot = true
async function jackpot({ symbol, count }) {
	if (isFirstJackpot) {
		isFirstJackpot = false
		setTimeout(() => {
			socket.send({
				event: 'jackpot-end',
			})
		}, 3000)
		return
	}
	stopQuotaFlicker()
	stopCurrentFlicker()
	stopBankFlicker()
	stopTokensFlicker()
	gsap.to([currentElement, quotaElement, tokensElement, bankElement], {
		autoAlpha: 0,
		ease: 'rough({strength: 3, points: 10, randomize: true})',
		duration: 0.25,
	})
	jackpotX4VideoContainerElement.style.display = 'initial'
	if (count === 4) {
		await scoreBackground.hideAnimation(0.1)
		gsap.set(jackpotX4VideoElement, {
			autoAlpha: 1,
		})
		jackpotX4VideoElement.play()

		jackpotX4VideoElement.onended = () => {
			jackpotX4VideoContainerElement.style.display = 'none'
			gsap.set(jackpotX4VideoElement, {
				autoAlpha: 0,
			})
			gsap.to([currentElement, quotaElement, tokensElement, bankElement], {
				autoAlpha: 1,
				duration: 0.5,
				ease: 'steps(3)',
			})

			socket.send({
				event: 'jackpot-end',
			})
		}
	} else if (count === 3) {
		await scoreBackground.hideAnimation(0.1)
		jackpotX3VideoElement.play()
		gsap.set(jackpotX3VideoElement, {
			autoAlpha: 1,
		})

		jackpotX3VideoElement.onended = () => {
			jackpotX4VideoContainerElement.style.display = 'none'
			gsap.set(jackpotX3VideoElement, {
				autoAlpha: 0,
			})
			gsap.to([currentElement, quotaElement, tokensElement, bankElement], {
				autoAlpha: 1,
				duration: 0.5,
				ease: 'steps(3)',
			})
			socket.send({
				event: 'jackpot-end',
			})
		}
	} else if (count === 5) {
		await scoreBackground.hideAnimation(0.1)
		jackpotX5VideoElement.play()
		gsap.set(jackpotX5VideoElement, {
			autoAlpha: 1,
		})

		jackpotX5VideoElement.onended = () => {
			jackpotX4VideoContainerElement.style.display = 'none'
			gsap.set(jackpotX5VideoElement, {
				autoAlpha: 0,
			})
			gsap.to([currentElement, quotaElement, tokensElement, bankElement], {
				autoAlpha: 1,
				duration: 0.5,
				ease: 'steps(3)',
			})
			socket.send({
				event: 'jackpot-end',
			})
		}
	}
	scoreBackground.showAnimation()
	stopCurrentFlicker = flickerAnimation(currentElement)
	stopQuotaFlicker = flickerAnimation(quotaElement)
	stopBankFlicker = flickerAnimation(bankElement)
	stopTokensFlicker = flickerAnimation(tokensElement)
	switch (symbol) {
		case '🍋':
			jackpotX4VideoContainerElement.style.background = '#d9ffd9'
			break
		case '🍒':
			jackpotX4VideoContainerElement.style.background = '#ff99cc'
			break
		case '🍊':
			jackpotX4VideoContainerElement.style.background = '#ffd280'
			break
		case '🍇':
			jackpotX4VideoContainerElement.style.background = '#804d80'
			break
		case '7':
			jackpotX4VideoContainerElement.style.background = '#80ffff'
			break
	}
}

function farkle() {
	farkleVideoElement.style.display = 'initial'

	// Stop flicker animations
	if (stopCurrentFlicker) stopCurrentFlicker()
	if (stopQuotaFlicker) stopQuotaFlicker()
	scoreBackground.tint = new Color('#ff4726')
	gsap.to([currentElement, quotaElement], {
		autoAlpha: 0,
		color: '#ff4726',
		duration: 0.5,
		onComplete: () => {
			farkleVideoElement.play()
		},
	})
	gsap.to([tokensElement, bankElement], {
		color: '#ff4726',
		duration: 0.5,
	})
	farkleVideoElement.onended = () => {
		farkleVideoElement.style.display = 'none'
		gsap.to([currentElement, quotaElement], {
			autoAlpha: 1,
			duration: 0.5,
			color: '',
			onUpdate: cloneAndBlur,
			onComplete: () => {
				stopCurrentFlicker = flickerAnimation(currentElement)
				stopQuotaFlicker = flickerAnimation(quotaElement)
			},
		})
		gsap.to([tokensElement, bankElement], {
			color: '',
			duration: 0.5,
		})
		scoreBackground.tint = new Color('white')
	}
}

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
		scoreBackground.hideAnimation(0)
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
	experience.sceneManager.score.hideAnimation(immediate ? 0 : null)
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
		experience.sceneManager.score.showAnimation(0)
		cloneAndBlur()
		return
	}
	gsap.fromTo(
		[currentElement, quotaElement],
		{ opacity: 0 },
		{
			opacity: 1,
			duration: 0.5,
			delay: 1,
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
			duration: 0.5,
			delay: 0.75,
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
			duration: 0.5,
			delay: 0.5,
			onComplete: () => {
				stopTokensFlicker = flickerAnimation(tokensElement)
				cloneAndBlur()
			},
		},
	)
	experience.sceneManager.score.showAnimation(immediate ? 0 : null)
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
			duration: 0.3,
			ease: 'power2.out',
			onUpdate: function () {
				const displayValue = Math.round(this.targets()[0].value)
				currentElement.textContent = displayValue.toString().padStart(4, '0')
				splitCharacters(currentElement)
				cloneAndBlur()
			},
		},
	)

	//blink
	gsap.fromTo(
		currentElement,
		{
			opacity: 1,
		},
		{
			opacity: 0.05,
			duration: 0.15,
			ease: 'steps(1)',
			repeat: 3,
			yoyo: true,
			delay: 0.1,
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
	const progress = value / quotaValue
	gsap.to(progressBarElement, {
		scaleX: progress,
		duration: 0.6,
		ease: 'power2.out',
		onUpdate: function () {
			cloneAndBlur()
		},
	})

	//blink
	gsap.fromTo(
		bankValueElement,
		{
			opacity: 1,
		},
		{
			opacity: 0.05,
			duration: 0.15,
			ease: 'steps(1)',
			repeat: 3,
			yoyo: true,
			delay: 0.6,
		},
	)
}

function updateSpinTokens({ value }) {
	const oldValue = parseInt(tokensValueElement.textContent.replace(/\D/g, '')) || 0
	const newValue = value

	if (newValue === oldValue) return

	gsap.killTweensOf(tokensValueElement)
	gsap.to(
		{ value: oldValue },
		{
			value: newValue,
			duration: 0.6,
			ease: 'power2.out',
			onUpdate: function () {
				const displayValue = Math.round(this.targets()[0].value)
				tokensValueElement.textContent = displayValue.toString().padStart(4, '0')
				splitCharacters(tokensValueElement)
				cloneAndBlur()
			},
		},
	)

	//blink
	gsap.fromTo(
		tokensValueElement,
		{
			opacity: 1,
		},
		{
			opacity: 0.05,
			duration: 0.15,
			ease: 'steps(1)',
			repeat: 3,
			yoyo: true,
			delay: 0.6,
		},
	)
}

function updateQuota({ value }) {
	const oldValue = parseInt(quotaValueElement.textContent.replace(/\D/g, '')) || 0
	const newValue = value
	quotaValue = value

	if (newValue === oldValue) return

	gsap.killTweensOf(quotaValueElement)
	gsap.to(
		{ value: oldValue },
		{
			value: newValue,
			duration: 0.6,
			ease: 'power2.out',
			onUpdate: function () {
				const displayValue = Math.round(this.targets()[0].value)
				quotaValueElement.textContent = displayValue.toString().padStart(4, '0')
				cloneAndBlur()
			},
		},
	)

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

	//blink
	gsap.fromTo(
		quotaValueElement,
		{
			opacity: 1,
		},
		{
			opacity: 0.05,
			duration: 0.15,
			ease: 'steps(1)',
			repeat: 3,
			yoyo: true,
			delay: 0.6,
		},
	)
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
	leaderboard.hideLeaderboard()
	fullscreenTextElement.appendChild(textElement)
	currentElement.style.visibility = 'hidden'
	bankElement.style.visibility = 'hidden'
	tokensElement.style.visibility = 'hidden'
	quotaElement.style.visibility = 'hidden'
	canvasElement.style.visibility = 'hidden'
	cloneAndBlur()
}

function innerCallback(textElement) {
	leaderboard.hideLeaderboard()
	innerTextElement.appendChild(textElement)
	currentElement.style.visibility = 'hidden'
	quotaElement.style.visibility = 'hidden'
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

document.querySelector('html').style.fontSize = innerHeight * 0.015625 + 'px'

// if autoShow is true, show the score immediately
if (autoShow) {
	experience.sceneManager._scene.resources.on('ready', () => {
		show({ immediate: true })
	})
}
