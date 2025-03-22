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
	console.log('received from %s', name)
	try {
		const parsedMessage = JSON.parse(message);
		const receiverName = parsedMessage.receiver;

		if (receiverName) {
			const receiverClient = clients.get(receiverName);
			if (!receiverClient) {
				socket.send(JSON.stringify({ event: "error", message: "receiver not found" }));
				return;
			}
			console.log('sending to %s', receiverName);
			receiverClient.send(JSON.stringify(parsedMessage), { binary: isBinary });
		} else {
			console.log("No receiver specified, broadcasting...");
			socketServer.clients.forEach((client) => {
				if (client.readyState !== WebSocket.OPEN || client === socket) return;
				console.log('sending to %s', client.name);
				client.send(JSON.stringify(parsedMessage), { binary: isBinary });
			});
		}
	} catch (err) {
		console.error("Failed to parse incoming message:", err);
	}

}
// socketServer.listen()
