import WebSocket, { WebSocketServer } from 'ws'

const socketServer = new WebSocketServer({
	port: process.env.PORT || 3001,
})

const clients = new Map()

socketServer.on('error', console.error)
socketServer.on('listening', () => {
	console.log('listening on port %s', socketServer.options.port)
})

socketServer.on('connection', (socket, client) => {
	const url = new URL(client.url, 'http://localhost')
	const name = url.searchParams.get('name')
	if (clients.has(name)) {
		socket.send('name already in use')
		socket.close()
	} else {
		socket.name = name
		clients.set(name, socket)
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
	console.log('received from %s: %s', name, message)
	if (message.includes('receiver')) {
		const receiverName = JSON.parse(message).receiver
		const receiverClient = clients.get(receiverName)
		if (!receiverClient) {
			socket.send('receiver not found')
			return
		}
		console.log('sending to %s: %s', receiverName, message)
		receiverClient.send(message, { binary: isBinary })
	} else {
		socketServer.clients.forEach((client) => {
			if (client.readyState !== WebSocket.OPEN || client === socket) return
			console.log('sending to %s: %s', client.name, message)
			client.send(message, { binary: isBinary })
		})
	}
}
// socketServer.listen()
