const { app, BrowserWindow, screen, dialog } = require('electron')
const { spawn, fork } = require('child_process')
const path = require('path')
const url = require('url')
const fs = require('fs')

let mainWindow, scoreWindow, combiWindow
let serverProcess

// Déterminer si l'application est en mode packagé ou non
const isPackaged = app.isPackaged

// Déterminer le chemin de base de l'application
const getAppPath = () => {
	return isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, '..')
}

// Amélioration de la gestion des erreurs
function handleError(title, error) {
	console.error(`${title}:`, error)

	// Afficher un dialogue d'erreur uniquement si les fenêtres ne sont pas encore créées
	if (!mainWindow || !mainWindow.isVisible()) {
		dialog.showErrorBox(title, `${error.message}\n\nVérifiez les logs pour plus de détails.`)
	}
}

function startServer() {
	try {
		const appPath = getAppPath()
		console.log(`Démarrage du serveur depuis: ${appPath}`)

		// Chemin vers le fichier server/index.js
		const serverPath = path.join(appPath, 'server', 'index.js')

		// Vérifier que le fichier serveur existe
		if (!fs.existsSync(serverPath)) {
			throw new Error(`Le fichier serveur n'existe pas: ${serverPath}`)
		}

		// En mode packagé, utilisez le Node.js intégré à Electron plutôt qu'un processus externe
		if (isPackaged) {
			// Utiliser require pour charger le serveur directement
			try {
				console.log('Chargement direct du serveur dans le processus Electron')

				// Sauvegarder le répertoire courant actuel
				const currentDir = process.cwd()

				// Changer temporairement le répertoire courant pour le serveur
				process.chdir(appPath)

				// Importer le module serveur
				const serverModule = require(serverPath)

				// Restaurer le répertoire courant
				process.chdir(currentDir)

				console.log('Serveur démarré avec succès via import direct')

				// Nous n'avons pas de processus enfant à suivre dans ce cas
				serverProcess = {
					kill: () => {
						console.log('Arrêt du serveur intégré')
						// Si le serveur a une méthode de fermeture propre, l'appeler ici
						if (serverModule && typeof serverModule.close === 'function') {
							serverModule.close()
						}
						// Sinon, rien à faire puisque le serveur s'exécute dans le même processus
					},
				}
			} catch (error) {
				console.error('Erreur lors du chargement direct du serveur:', error)

				// Fallback : essayer de démarrer avec fork au lieu de spawn
				console.log('Tentative de démarrage du serveur avec process.fork()')
				serverProcess = fork(serverPath, [], {
					cwd: appPath,
					stdio: 'inherit',
				})

				console.log('Serveur démarré avec fork (fallback)')

				serverProcess.on('error', (err) => {
					handleError('Erreur du serveur', err)
				})

				serverProcess.on('close', (code) => {
					console.log(`Serveur arrêté avec code: ${code}`)
					if (code !== 0 && code !== null) {
						handleError('Arrêt anormal du serveur', new Error(`Code de sortie: ${code}`))
					}
				})
			}
		} else {
			// En développement, utilisez spawn comme avant
			serverProcess = spawn('node', [serverPath], {
				cwd: appPath,
				stdio: 'inherit',
			})

			console.log('Serveur démarré avec spawn (mode développement)')

			serverProcess.on('error', (err) => {
				handleError('Erreur du serveur', err)
			})

			serverProcess.on('close', (code) => {
				console.log(`Serveur arrêté avec code: ${code}`)
				if (code !== 0 && code !== null) {
					handleError('Arrêt anormal du serveur', new Error(`Code de sortie: ${code}`))
				}
			})
		}
	} catch (error) {
		handleError('Erreur au démarrage du serveur', error)
	}
}

async function createWindows() {
	try {
		const displays = screen.getAllDisplays()
		const primaryDisplay = screen.getPrimaryDisplay()

		console.log(`Nombre d'écrans détectés: ${displays.length}`)
		displays.forEach((display, i) => {
			console.log(
				`Écran ${i}: ${display.size.width}x${display.size.height} - Primaire: ${display.id === primaryDisplay.id}`,
			)
		})

		// Options de base pour les fenêtres avec une meilleure gestion des erreurs
		const windowOptions = {
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				preload: path.join(__dirname, 'preload.js'),
			},
			show: false,
		}

		// Si nous avons au moins 3 écrans
		if (displays.length >= 3) {
			// Écran principal (en bas)
			mainWindow = new BrowserWindow({
				...windowOptions,
				x: primaryDisplay.bounds.x,
				y: primaryDisplay.bounds.y,
				width: primaryDisplay.size.width,
				height: primaryDisplay.size.height,
				fullscreen: true,
			})

			// Écran score (en haut à gauche) - ratio 4:3
			const leftDisplay = displays.find((d) => d.id !== primaryDisplay.id)
			if (leftDisplay) {
				scoreWindow = new BrowserWindow({
					...windowOptions,
					x: leftDisplay.bounds.x,
					y: leftDisplay.bounds.y,
					width: leftDisplay.size.width,
					height: leftDisplay.size.height,
					fullscreen: true, // Désactiver le plein écran pour respecter les dimensions
				})
			}

			// Écran combi (en haut à droite) - ratio 4:3
			const rightDisplay = displays.find((d) => d.id !== primaryDisplay.id && (!leftDisplay || d.id !== leftDisplay.id))
			if (rightDisplay) {
				combiWindow = new BrowserWindow({
					...windowOptions,
					x: rightDisplay.bounds.x,
					y: rightDisplay.bounds.y,
					width: rightDisplay.size.width,
					height: rightDisplay.size.height,
					fullscreen: true, // Désactiver le plein écran pour respecter les dimensions
				})
			}
		} else {
			console.log("Moins de 3 écrans détectés. Création des fenêtres sur l'écran principal.")

			// Calcul des dimensions pour éviter les superpositions
			const margin = 20 // marge entre les fenêtres

			// Écran principal (occupe la moitié inférieure) - ratio 16:10
			const mainHeight = Math.floor(primaryDisplay.size.height / 2 - margin)
			const mainWidth = Math.round(mainHeight * (16 / 10))
			const mainXOffset = Math.round((primaryDisplay.size.width - mainWidth) / 2)

			// Écran score (quart supérieur gauche) - ratio 4:3
			const scoreHeight = Math.floor(primaryDisplay.size.height / 2 - margin)
			const scoreWidth = Math.round(scoreHeight * (4 / 3))

			mainWindow = new BrowserWindow({
				...windowOptions,
				x: primaryDisplay.bounds.x + mainXOffset,
				y: primaryDisplay.size.height,
				width: mainWidth,
				height: mainHeight,
				frame: false,
			})

			scoreWindow = new BrowserWindow({
				...windowOptions,
				x: primaryDisplay.bounds.x,
				y: primaryDisplay.bounds.y,
				width: scoreWidth,
				height: scoreHeight,
				frame: false,
			})

			// Écran combi (quart supérieur droit) - ratio 4:3
			combiWindow = new BrowserWindow({
				...windowOptions,
				x: primaryDisplay.bounds.x + primaryDisplay.size.width - scoreWidth,
				y: primaryDisplay.bounds.y,
				width: scoreWidth,
				height: scoreHeight,
				frame: false,
			})
		}

		// Attendre que le serveur démarre avant de charger les pages
		setTimeout(() => {
			try {
				// Déterminer les chemins en fonction du mode packagé ou non
				const appPath = getAppPath()

				// Mode développement
				if (process.env.NODE_ENV === 'development') {
					loadDevelopmentPages()
				}
				// Mode production
				else {
					loadProductionPages(appPath)
				}

				// Configurer les événements ready-to-show pour toutes les fenêtres
				setupWindowEvents()
			} catch (error) {
				handleError('Erreur lors du chargement des pages', error)
			}
		}, 2000) // Délai de 2 secondes pour laisser le serveur démarrer

		// Charger les pages en mode développement
		function loadDevelopmentPages() {
			mainWindow.loadURL('http://localhost:3000/')
			scoreWindow.loadURL('http://localhost:3000/score/')
			combiWindow.loadURL('http://localhost:3000/combi/')
		}

		// Charger les pages en mode production avec vérification et gestion des erreurs améliorée
		function loadProductionPages(appPath) {
			const indexPath = path.join(appPath, 'dist', 'index.html')
			const scorePath = path.join(appPath, 'dist', 'score', 'index.html')
			const combiPath = path.join(appPath, 'dist', 'combi', 'index.html')

			console.log('Chargement des fichiers en mode production:')
			console.log(`- Page principale: ${indexPath}`)
			console.log(`- Page score: ${scorePath}`)
			console.log(`- Page combi: ${combiPath}`)

			// Fonction de chargement sécurisée avec tentatives multiples
			const safeLoadFile = (window, filePath, windowName, maxAttempts = 3) => {
				let attempts = 0

				const tryLoad = () => {
					attempts++
					if (fs.existsSync(filePath)) {
						window.loadFile(filePath)
						return true
					} else if (attempts < maxAttempts) {
						console.log(`Fichier ${windowName} introuvable, nouvelle tentative ${attempts}/${maxAttempts}...`)
						setTimeout(tryLoad, 500)
						return false
					} else {
						console.error(`Impossible de trouver le fichier pour ${windowName} après ${maxAttempts} tentatives`)
						return false
					}
				}

				return tryLoad()
			}

			// Chargement avec gestion d'erreurs
			safeLoadFile(mainWindow, indexPath, 'principale')
			safeLoadFile(scoreWindow, scorePath, 'score')
			safeLoadFile(combiWindow, combiPath, 'combi')
		}

		// Configuration des événements pour les fenêtres
		function setupWindowEvents() {
			// Variables pour éviter les rechargements en boucle
			const reloadAttempts = {
				main: 0,
				score: 0,
				combi: 0,
			}
			const MAX_RELOAD_ATTEMPTS = 2

			// Montrer les fenêtres une fois qu'elles sont prêtes
			mainWindow.once('ready-to-show', () => {
				console.log('Fenêtre principale prête à être affichée')
				reloadAttempts.main = 0 // Réinitialiser le compteur quand la page est chargée avec succès
				mainWindow.show()
			})
			scoreWindow.once('ready-to-show', () => {
				console.log('Fenêtre score prête à être affichée')
				reloadAttempts.score = 0 // Réinitialiser le compteur quand la page est chargée avec succès
				scoreWindow.show()
			})
			combiWindow.once('ready-to-show', () => {
				console.log('Fenêtre combi prête à être affichée')
				reloadAttempts.combi = 0 // Réinitialiser le compteur quand la page est chargée avec succès
				combiWindow.show()
			})

			// Gérer les erreurs de chargement des pages avec protection contre les boucles infinies
			mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
				console.log(`Échec de chargement de la page principale: ${errorCode} - ${errorDescription}`)

				// Limiter le nombre de tentatives de rechargement pour éviter les boucles infinies
				if (errorCode === -6 && reloadAttempts.main < MAX_RELOAD_ATTEMPTS) {
					// ERR_FILE_NOT_FOUND
					reloadAttempts.main++
					console.log(
						`Tentative de rechargement de la page principale... (${reloadAttempts.main}/${MAX_RELOAD_ATTEMPTS})`,
					)

					setTimeout(() => {
						if (!mainWindow.isDestroyed()) {
							const currentURL = mainWindow.webContents.getURL()
							if (currentURL) {
								mainWindow.loadURL(currentURL)
							} else {
								// Si l'URL est vide, charger le chemin par défaut
								const appPath = getAppPath()
								const indexPath = path.join(appPath, 'dist', 'index.html')
								if (fs.existsSync(indexPath)) {
									mainWindow.loadFile(indexPath)
								}
							}
						}
					}, 1000)
				} else if (reloadAttempts.main >= MAX_RELOAD_ATTEMPTS) {
					console.log('Nombre maximal de tentatives de rechargement atteint pour la page principale')
					// Ne pas afficher l'erreur pour éviter de bloquer l'interface
				} else if (errorCode !== -3) {
					// Ignorer ERR_ABORTED qui est normal lors d'une redirection
					handleError('Échec de chargement de la page principale', new Error(`${errorCode}: ${errorDescription}`))
				}
			})

			// Gérer de façon similaire les erreurs pour les autres fenêtres
			scoreWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
				console.log(`Échec de chargement de la page score: ${errorCode} - ${errorDescription}`)

				// Limiter le nombre de tentatives de rechargement pour éviter les boucles infinies
				if (errorCode === -6 && reloadAttempts.score < MAX_RELOAD_ATTEMPTS) {
					reloadAttempts.score++
					console.log(`Tentative de rechargement de la page score... (${reloadAttempts.score}/${MAX_RELOAD_ATTEMPTS})`)

					setTimeout(() => {
						if (!scoreWindow.isDestroyed()) {
							const currentURL = scoreWindow.webContents.getURL()
							if (currentURL) {
								scoreWindow.loadURL(currentURL)
							} else {
								const appPath = getAppPath()
								const scorePath = path.join(appPath, 'dist', 'score', 'index.html')
								if (fs.existsSync(scorePath)) {
									scoreWindow.loadFile(scorePath)
								}
							}
						}
					}, 1000)
				} else if (reloadAttempts.score >= MAX_RELOAD_ATTEMPTS) {
					console.log('Nombre maximal de tentatives de rechargement atteint pour la page score')
				} else if (errorCode !== -3) {
					handleError('Échec de chargement de la page score', new Error(`${errorCode}: ${errorDescription}`))
				}
			})

			combiWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
				console.log(`Échec de chargement de la page combi: ${errorCode} - ${errorDescription}`)

				// Limiter le nombre de tentatives de rechargement pour éviter les boucles infinies
				if (errorCode === -6 && reloadAttempts.combi < MAX_RELOAD_ATTEMPTS) {
					reloadAttempts.combi++
					console.log(`Tentative de rechargement de la page combi... (${reloadAttempts.combi}/${MAX_RELOAD_ATTEMPTS})`)

					setTimeout(() => {
						if (!combiWindow.isDestroyed()) {
							const currentURL = combiWindow.webContents.getURL()
							if (currentURL) {
								combiWindow.loadURL(currentURL)
							} else {
								const appPath = getAppPath()
								const combiPath = path.join(appPath, 'dist', 'combi', 'index.html')
								if (fs.existsSync(combiPath)) {
									combiWindow.loadFile(combiPath)
								}
							}
						}
					}, 1000)
				} else if (reloadAttempts.combi >= MAX_RELOAD_ATTEMPTS) {
					console.log('Nombre maximal de tentatives de rechargement atteint pour la page combi')
				} else if (errorCode !== -3) {
					handleError('Échec de chargement de la page combi', new Error(`${errorCode}: ${errorDescription}`))
				}
			})
		}
	} catch (error) {
		handleError('Erreur lors de la création des fenêtres', error)
	}
}

app.whenReady().then(() => {
	try {
		console.log('Application prête à démarrer')
		console.log(`Mode packagé: ${isPackaged ? 'Oui' : 'Non'}`)
		console.log(`Chemin de l'application: ${getAppPath()}`)

		startServer()
		createWindows()

		app.on('activate', function () {
			if (BrowserWindow.getAllWindows().length === 0) createWindows()
		})
	} catch (error) {
		handleError("Erreur au démarrage de l'application", error)
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('will-quit', () => {
	// Arrêter le serveur quand l'application se ferme
	if (serverProcess) {
		serverProcess.kill()
	}
})
