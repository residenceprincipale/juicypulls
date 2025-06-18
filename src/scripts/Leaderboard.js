/**
 * Gestion du leaderboard pour Flipette avec Supabase
 */
import { gsap } from 'gsap'

export default class Leaderboard {
	constructor(socket) {
		this.socket = socket
		this.leaderboard = []
		this.currentName = ['A', 'A', 'A', 'A']
		this.selectedLetterIndex = 0
		this.isEnteringName = false
		this.currentScore = 0

		// Éléments DOM
		this.leaderboardOverlay = document.querySelector('.leaderboard-overlay')
		this.leaderboardScores = document.querySelector('.leaderboard-scores')
		this.nameInput = document.querySelector('.name-input')
		this.letterElements = document.querySelectorAll('.letter')

		// Charger les scores depuis localStorage au démarrage
		this._loadLeaderboardFromLocalStorage()

		// Initialisation
		this._setupEventListeners()
	}

	/**
	 * Chargement du leaderboard depuis localStorage
	 */
	_loadLeaderboardFromLocalStorage() {
		try {
			const data = localStorage.getItem('flipette-leaderboard')
			if (data) {
				this.leaderboard = JSON.parse(data)
			}
			this._renderLeaderboard()
		} catch (e) {
			console.error('Erreur lors du chargement du leaderboard:', e)
			this.leaderboard = this._getDefaultLeaderboard()
			this._renderLeaderboard()
		}
	}

	/**
	 * Renvoie un leaderboard par défaut
	 */
	_getDefaultLeaderboard() {
		return [
			{ name: 'FLIP', score: 25000 },
			{ name: 'ETTE', score: 20000 },
			{ name: 'BEST', score: 15000 },
			{ name: 'PLAY', score: 10000 },
			{ name: 'GAME', score: 5000 },
		]
	}

	/**
	 * Sauvegarde du leaderboard dans le localStorage
	 */
	_saveLeaderboard() {
		try {
			localStorage.setItem('flipette-leaderboard', JSON.stringify(this.leaderboard))
		} catch (e) {
			console.error('Erreur de sauvegarde du leaderboard:', e)
		}
	}

	/**
	 * Configuration des écouteurs d'événements pour les commandes
	 */
	_setupEventListeners() {
		// Événements de socket pour la communication avec le jeu
		this.socket.on('button', (data) => {
			if (this.isEnteringName) {
				this._handleButtonPress(data.index)
			}
		})

		this.socket.on('button-collect', () => {
			if (this.isEnteringName) {
				this._submitName()
				gsap.to(this.nameInput, {
					autoAlpha: 0,
					duration: 0.3,
					ease: 'rough({strength: 3, points: 10, randomize: true})',
				})
			}
		})
	}

	/**
	 * Gère les pressions des boutons directionnels
	 * @param {string} direction - La direction (left, right, up, down)
	 */
	_handleButtonPress(direction) {
		switch (direction) {
			case 0:
				this.selectedLetterIndex = Math.max(0, this.selectedLetterIndex - 1)
				break
			case 1:
				this.selectedLetterIndex = Math.min(3, this.selectedLetterIndex + 1)
				break
			case 3:
				this._incrementLetter()
				break
			case 4:
				this._decrementLetter()
				break
		}

		this._updateLetterDisplay()
	}

	/**
	 * Incrémente la lettre sélectionnée (A → B → C...)
	 */
	_incrementLetter() {
		const currentChar = this.currentName[this.selectedLetterIndex].charCodeAt(0)
		// Z → espace (32) → A, espace → A
		let newChar
		if (currentChar === 90) {
			// Z
			newChar = 32 // espace
		} else if (currentChar === 32) {
			// espace
			newChar = 65 // A
		} else {
			newChar = currentChar + 1
		}
		this.currentName[this.selectedLetterIndex] = String.fromCharCode(newChar)
	}

	/**
	 * Décrémente la lettre sélectionnée (C → B → A...)
	 */
	_decrementLetter() {
		const currentChar = this.currentName[this.selectedLetterIndex].charCodeAt(0)
		// A → espace → Z, espace → Z
		let newChar
		if (currentChar === 65) {
			// A
			newChar = 32 // espace
		} else if (currentChar === 32) {
			// espace
			newChar = 90 // Z
		} else {
			newChar = currentChar - 1
		}
		this.currentName[this.selectedLetterIndex] = String.fromCharCode(newChar)
	}

	/**
	 * Met à jour l'affichage des lettres dans l'interface
	 */
	_updateLetterDisplay() {
		this.letterElements.forEach((element, index) => {
			element.textContent = this.currentName[index]

			if (index === this.selectedLetterIndex) {
				element.classList.add('active')
			} else {
				element.classList.remove('active')
			}
		})
	}

	/**
	 * Soumet le nom et enregistre le score
	 */
	_submitName() {
		const name = this.currentName.join('')
		this._addScore(name, this.currentScore)
		this.isEnteringName = false
		this.showLeaderboard()
	}

	/**
	 * Ajoute un score au leaderboard
	 * @param {string} name - Le nom du joueur
	 * @param {number} score - Le score du joueur
	 */
	async _addScore(name, score) {
		// Ajoute le score et trie le leaderboard
		this.leaderboard.push({ name, score })
		this.leaderboard.sort((a, b) => b.score - a.score)
		if (this.leaderboard.length > 10) {
			this.leaderboard = this.leaderboard.slice(0, 10)
		}
		this._saveLeaderboard()
		this._renderLeaderboard()
	}

	/**
	 * Vérifie si un score peut entrer dans le leaderboard
	 * @param {number} score - Le score à vérifier
	 * @returns {boolean} - true si le score peut entrer dans le leaderboard
	 */
	async _isHighScore(score) {
		if (this.leaderboard.length < 10) return true
		const minScore = this.leaderboard[this.leaderboard.length - 1].score
		return score > minScore
	}

	/**
	 * Affiche l'interface de saisie du nom
	 */
	_showNameInput() {
		gsap.to(this.leaderboardOverlay, {
			autoAlpha: 1,
			duration: 0.3,
			ease: 'rough({strength: 3, points: 10, randomize: true})',
		})
		gsap.to(this.nameInput, {
			autoAlpha: 1,
			duration: 0.3,
			ease: 'rough({strength: 3, points: 10, randomize: true})',
		})
		this.isEnteringName = true

		// Initialisation des lettres
		this.currentName = ['A', 'A', 'A', 'A']
		this.selectedLetterIndex = 0
		this._updateLetterDisplay()
	}

	/**
	 * Affiche le leaderboard
	 */
	showLeaderboard() {
		gsap.to(this.leaderboardOverlay, {
			autoAlpha: 1,
			duration: 0.3,
			ease: 'rough({strength: 3, points: 10, randomize: true})',
		})
		gsap.to(this.nameInput, {
			autoAlpha: 0,
			duration: 0.3,
			ease: 'rough({strength: 3, points: 10, randomize: true})',
		})
		this._renderLeaderboard()
	}

	/**
	 * Masque l'overlay du leaderboard
	 */
	hideLeaderboard() {
		gsap.to(this.leaderboardOverlay, {
			autoAlpha: 0,
			duration: 0.3,
			ease: 'rough({strength: 3, points: 10, randomize: true})',
		})
	}

	/**
	 * Rendu du leaderboard dans l'interface
	 */
	_renderLeaderboard() {
		// Vide la liste actuelle
		this.leaderboardScores.innerHTML = ''

		// Ajoute chaque entrée du leaderboard
		this.leaderboard.forEach((entry, index) => {
			const scoreItem = document.createElement('div')
			scoreItem.classList.add('score-item')

			// Si c'est le score qu'on vient d'ajouter
			const isNewScore = entry.name === this.currentName.join('') && entry.score === this.currentScore
			if (isNewScore) {
				scoreItem.classList.add('highlight')
			}

			// Rang
			const rankElement = document.createElement('div')
			rankElement.classList.add('score-rank')
			rankElement.textContent = `${index + 1}.`

			// Nom
			const nameElement = document.createElement('div')
			nameElement.classList.add('score-name')
			nameElement.textContent = entry.name

			// Valeur du score
			const scoreElement = document.createElement('div')
			scoreElement.classList.add('score-value')
			scoreElement.textContent = entry.score.toString().padStart(5, '0')

			// Assemblage
			scoreItem.appendChild(rankElement)
			scoreItem.appendChild(nameElement)
			scoreItem.appendChild(scoreElement)

			this.leaderboardScores.appendChild(scoreItem)
		})
	}

	/**
	 * Traite un game over et le score final
	 * @param {number} score - Le score final
	 */
	async handleGameOver(score) {
		this.currentScore = score

		if (await this._isHighScore(score)) {
			this._showNameInput()
		} else {
			this.showLeaderboard()
		}
	}
}
