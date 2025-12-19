const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

console.log('--- SERVER.JS STARTING ---');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();

function setupGameSocket(io) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);
        socket.on('create_room', (callback) => {
            const roomId = Math.random().toString(36).substring(7).toUpperCase();
            const initialState = {
                roomId,
                board: {},
                players: { white: socket.id, black: null },
                currentPlayer: 'white',
                turnPhase: 'select_action',
                reserves: { white: { fish: 14, shark_small: 3, shark_big: 3 }, black: { fish: 14, shark_small: 3, shark_big: 3 } },
                winner: null
            };
            rooms.set(roomId, initialState);
            socket.join(roomId);
            callback({ roomId, color: 'white', state: initialState });
        });
        socket.on('join_room', (roomId, callback) => {
            const room = rooms.get(roomId);
            if (!room) return callback({ error: 'Room not found' });
            if (room.players.black) return callback({ error: 'Room full' });
            room.players.black = socket.id;
            socket.join(roomId);
            io.to(roomId).emit('player_joined', { color: 'black' });
            callback({ roomId, color: 'black', state: room });
        });
    });
}

app.prepare().then(() => {
    const server = express();

    // Intercept at HTTP level to prove execution
    const httpServer = createServer((req, res) => {
        // Log every request to stdout to verify traffic
        console.log(`[HTTP] ${req.method} ${req.url}`);

        if (req.url === '/ping') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('PONG_FROM_NODE_SERVER');
            return;
        }
        server(req, res);
    });

    const io = new Server(httpServer, {
        path: '/socket.io',
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    setupGameSocket(io);

    server.get('/api/health', (req, res) => {
        res.status(200).json({ status: 'ok', server: 'node-js-custom', socket_active: true });
    });

    server.all('*', (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, '0.0.0.0', (err) => {
        if (err) throw err;
        console.log(`> Ready on http://0.0.0.0:${port}`);
        console.log('> Socket.io active');
    });
}).catch(err => {
    console.error('Error preparing app:', err);
    process.exit(1);
});
