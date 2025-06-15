// Fichier preload.js pour Electron
const { contextBridge, ipcRenderer } = require('electron')

// Expose des fonctions sécurisées à la fenêtre de rendu
contextBridge.exposeInMainWorld('electronAPI', {
	// Vous pouvez ajouter ici des fonctions pour communiquer avec le processus principal
	// Par exemple, pour envoyer des événements au processus principal
	send: (channel, data) => {
		// Liste blanche des canaux autorisés
		const validChannels = ['app-ready', 'request-server-status', 'close-app']
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data)
		}
	},
	// Pour recevoir des messages du processus principal
	receive: (channel, func) => {
		const validChannels = ['server-status', 'port-connected', 'port-data', 'port-error']
		if (validChannels.includes(channel)) {
			// Supprime les anciens listeners pour éviter les duplications
			ipcRenderer.removeAllListeners(channel)
			// Ajoute le nouveau listener
			ipcRenderer.on(channel, (_, ...args) => func(...args))
		}
	},
})

// Indiquer que la page est chargée
window.addEventListener('DOMContentLoaded', () => {
	console.log('Preload script chargé avec succès')
})
