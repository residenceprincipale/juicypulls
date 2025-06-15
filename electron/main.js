const { app, BrowserWindow, screen } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const url = require('url')

let mainWindow, scoreWindow, combiWindow
let serverProcess

function startServer() {
	// Lancer le serveur Node.js
	serverProcess = spawn('node', ['server/index.js'], {
		cwd: path.join(__dirname, '..'),
		stdio: 'inherit',
	})

	console.log('Serveur démarré')

	serverProcess.on('error', (err) => {
		console.error('Erreur du serveur:', err)
	})

	serverProcess.on('close', (code) => {
		console.log(`Serveur arrêté avec code: ${code}`)
	})
}

async function createWindows() {
	const displays = screen.getAllDisplays()
	const primaryDisplay = screen.getPrimaryDisplay()

	console.log(`Nombre d'écrans détectés: ${displays.length}`)
	displays.forEach((display, i) => {
		console.log(
			`Écran ${i}: ${display.size.width}x${display.size.height} - Primaire: ${display.id === primaryDisplay.id}`,
		)
	})

	// Options de base pour les fenêtres
	const windowOptions = {
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
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

		// Écran score (en haut à gauche)
		const leftDisplay = displays.find((d) => d.id !== primaryDisplay.id)
		if (leftDisplay) {
			scoreWindow = new BrowserWindow({
				...windowOptions,
				x: leftDisplay.bounds.x,
				y: leftDisplay.bounds.y,
				width: leftDisplay.size.width,
				height: leftDisplay.size.height,
				fullscreen: true,
			})
		}

		// Écran combi (en haut à droite)
		const rightDisplay = displays.find((d) => d.id !== primaryDisplay.id && (!leftDisplay || d.id !== leftDisplay.id))
		if (rightDisplay) {
			combiWindow = new BrowserWindow({
				...windowOptions,
				x: rightDisplay.bounds.x,
				y: rightDisplay.bounds.y,
				width: rightDisplay.size.width,
				height: rightDisplay.size.height,
				fullscreen: true,
			})
		}
	} else {
		console.log("Moins de 3 écrans détectés. Création des fenêtres sur l'écran principal.")

		// Écran principal (occupe la moitié inférieure)
		mainWindow = new BrowserWindow({
			...windowOptions,
			x: primaryDisplay.bounds.x,
			y: primaryDisplay.bounds.y + primaryDisplay.size.height / 2,
			width: primaryDisplay.size.width,
			height: primaryDisplay.size.height / 2,
		})

		// ��cran score (quart supérieur gauche)
		scoreWindow = new BrowserWindow({
			...windowOptions,
			x: primaryDisplay.bounds.x,
			y: primaryDisplay.bounds.y,
			width: primaryDisplay.size.width / 2,
			height: primaryDisplay.size.height / 2,
		})

		// Écran combi (quart supérieur droit)
		combiWindow = new BrowserWindow({
			...windowOptions,
			x: primaryDisplay.bounds.x + primaryDisplay.size.width / 2,
			y: primaryDisplay.bounds.y,
			width: primaryDisplay.size.width / 2,
			height: primaryDisplay.size.height / 2,
		})
	}

	// Attendre que le serveur démarre avant de charger les pages
	setTimeout(() => {
		// Mode développement
		if (process.env.NODE_ENV === 'development') {
			mainWindow.loadURL('http://localhost:3000/')
			scoreWindow.loadURL('http://localhost:3000/score/')
			combiWindow.loadURL('http://localhost:3000/combi/')
		}
		// Mode production
		else {
			mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
			scoreWindow.loadFile(path.join(__dirname, '../dist/score/index.html'))
			combiWindow.loadFile(path.join(__dirname, '../dist/combi/index.html'))
		}

		mainWindow.once('ready-to-show', () => mainWindow.show())
		scoreWindow.once('ready-to-show', () => scoreWindow.show())
		combiWindow.once('ready-to-show', () => combiWindow.show())
	}, 2000) // Délai de 2 secondes pour laisser le serveur démarrer

	// Activer DevTools en mode développement
	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools({ mode: 'detach' })
	}
}

app.whenReady().then(() => {
	startServer()
	createWindows()

	app.on('activate', function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindows()
	})
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
