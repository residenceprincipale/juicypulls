import WebSocket, { WebSocketServer } from 'ws'
import { SerialPort, ReadlineParser } from 'serialport'
import os from 'os'

const socketServer = new WebSocketServer({
	port: process.env.PORT || 3001,
})

const clients = new Map()

const bulbsArduino = new SerialPort({ path: '/dev/cu.usbmodem8401', baudRate: 9600 }, (error) => {
	if (error) {
		console.error('Error opening serial port for bulbs:', error)
	} else {
		console.log('Serial port opened for bulbs')
	}
})

const inputArduino = new SerialPort({ path: '/dev/cu.usbserial-59140062441', baudRate: 115200 }, (error) => {
	if (error) {
		console.error('Error opening input serial port:', error)
	} else {
		console.log('Input serial port opened')
	}
})
const inputParser = inputArduino.pipe(new ReadlineParser({ delimiter: '\n' }))
inputParser.on('data', (data) => {
	console.log(data)
	handleMessage('input-board', null, data, false)
})

socketServer.on('error', console.error)
socketServer.on('listening', () => {
	const address = os.networkInterfaces().en1 || os.networkInterfaces().en0
	console.log(`listening on ws://${address[1].address}:${socketServer.options.port}`)
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
		const receiver = parsedMessage.receiver

		if (Array.isArray(receiver)) {
			// Handle array of receivers
			for (const receiverName of receiver) {
				if (receiverName === 'bulbs') {
					bulbsArduino.write(JSON.stringify(parsedMessage))
					console.log('sending to bulbs arduino')
					continue
				} else if (receiverName === 'input-board') {
					inputArduino.write(JSON.stringify(parsedMessage))
					console.log('sending to input board')
					continue
				}
				const receiverClient = clients.get(receiverName)
				if (receiverClient) {
					console.log('sending to %s', receiverName, parsedMessage.event, parsedMessage.data)
					receiverClient.send(JSON.stringify(parsedMessage), { binary: isBinary })
				} else {
					console.warn(`Receiver "${receiverName}" not found`)
				}
			}
		} else if (receiver) {
			// Handle single receiver
			if (receiver === 'bulbs') {
				bulbsArduino.write(JSON.stringify(parsedMessage))
				console.log('sending to bulbs arduino')
				return
			} else if (receiver === 'input-board') {
				inputArduino.write(JSON.stringify(parsedMessage))
				console.log('sending to input board')
				return
			}
			const receiverClient = clients.get(receiver)
			if (!receiverClient) {
				if (socket) socket.send(JSON.stringify({ event: 'error', message: 'receiver not found' }))
				return
			}
			console.log('sending to %s', receiver, parsedMessage.event, parsedMessage.data)
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
