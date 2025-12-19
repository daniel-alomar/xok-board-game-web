import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { setupGameSocket } from './src/server/gameHub';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);
    const io = new Server(httpServer);

    setupGameSocket(io);

    server.all('(.*)', (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
        console.log('> Socket.io initialized');
    });
}).catch(err => {
    console.error('Error preparing app:', err);
    process.exit(1);
});
