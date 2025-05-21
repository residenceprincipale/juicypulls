import WebSocket, { WebSocketServer } from 'ws'
import { SerialPort } from 'serialport'
import os from 'os'

const socketServer = new WebSocketServer({
	port: process.env.PORT || 3001,
})

const clients = new Map()

// const arduino = new SerialPort({ path: '/dev/cu.usbmodem101', baudRate: 9600 }, (error) => {
// 	if (error) {
// 		console.error('Error opening serial port:', error)
// 	} else {
// 		console.log('Serial port opened')
// 	}
// })

socketServer.on('error', console.error)
socketServer.on('listening', () => {
	console.log(`listening on ws://${os.networkInterfaces().en0[1].address}:${socketServer.options.port}`)
})

socketServer.on('connection', (socket, client) => {
	const url = new URL(client.url, 'http://localhost')
	const name = url.searchParams.get('name')
	if (clients.has(name)) {
		console.log('name already in use: %s', name)
		socket.send('name already in use')
		socket.close()
	} else {
		socket.name = name
		clients.set(name, socket)
		console.log('connected: %s', name)
	}

	socket.on('error', console.error)
	socket.on('close', () => handleDisconnection(name))

	socket.on('message', (message, isBinary) => handleMessage(name, socket, message, isBinary))
})

function handleDisconnection(name) {
	console.log('disconnected: %s', name)
	clients.delete(name)
}

function handleMessage(name, socket, message, isBinary) {
	try {
		const parsedMessage = JSON.parse(message)
		console.log('received from %s', name, parsedMessage.event, parsedMessage.data)
		const receiverName = parsedMessage.receiver

		if (receiverName) {
			if (receiverName === 'bulbs') {
				arduino.write(parsedMessage.data)
				console.log('sending to arduino')
				return
			}
			const receiverClient = clients.get(receiverName)
			if (!receiverClient) {
				socket.send(JSON.stringify({ event: 'error', message: 'receiver not found' }))
				return
			}
			console.log('sending to %s', receiverName, parsedMessage.event, parsedMessage.data)
			receiverClient.send(JSON.stringify(parsedMessage), { binary: isBinary })
		} else {
			console.log('No receiver specified, broadcasting...')
			socketServer.clients.forEach((client) => {
				if (client.readyState !== WebSocket.OPEN || client === socket) return
				console.log('sending to %s', client.name, parsedMessage.event, parsedMessage.data)
				client.send(JSON.stringify(parsedMessage), { binary: isBinary })
			})
		}
	} catch (err) {
		console.error('Failed to parse incoming message:', err)
	}
}
