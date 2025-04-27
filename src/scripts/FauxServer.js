// FauxServer.js
class FauxServer {
    constructor() {
        if (FauxServer.instance) return FauxServer.instance;
        FauxServer.instance = this;

        this.clients = new Map();
    }

    connect(clientSocket, name) {
        if (this.clients.has(name)) {
            clientSocket.trigger('error', ['name already in use']);
            return;
        }

        clientSocket.name = name;
        this.clients.set(name, clientSocket);

        clientSocket._onInternalDisconnect = () => {
            this.clients.delete(name);
            clientSocket.trigger('close');
        };

        clientSocket._onInternalMessage = (message) => {
            this._handleMessage(clientSocket, message);
        };

        clientSocket.trigger('open');
    }

    disconnect(clientSocket) {
        this.clients.delete(clientSocket.name);
    }

    _handleMessage(senderSocket, message) {
        console.log('received from %s', senderSocket.name);
        try {
            const parsed = JSON.parse(message);
            const { event, data, receiver } = parsed;

            if (receiver) {
                const target = this.clients.get(receiver);
                if (!target) {
                    senderSocket.trigger('message', [{
                        event: 'error',
                        data: 'receiver not found',
                    }]);
                    return;
                }
                console.log('sending to %s', target.name);

                // target.trigger('message', [{ event, data }]);
                target.trigger(event, [data]);
            } else {
                // broadcast
                for (const [_, client] of this.clients) {
                    if (client !== senderSocket) {
                        client.trigger('message', [{ event, data }]);
                        client.trigger(event, [data]);
                    }
                }
            }
        } catch (err) {
            console.error('[FauxServer] Failed to parse message:', err);
        }
    }
}

const fauxServer = new FauxServer();
export default fauxServer;
