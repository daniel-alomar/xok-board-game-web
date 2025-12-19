const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
// Inline setupGameSocket logic to avoid TS import issues
// We need to replicate the logic from src/server/gameHub.ts
// BUT simpler: define it here.

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost'; // Internal for Next
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// GameHub Logic Inlined
const rooms = new Map(); // roomId -> GameState

function setupGameSocket(io) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('create_room', (callback) => {
            const roomId = Math.random().toString(36).substring(7).toUpperCase();

            // Initial State (Simplified for JS)
            const initialState = {
                roomId,
                board: {}, // Map not serializable directly? converted in logic
                players: { white: socket.id, black: null },
                currentPlayer: 'white',
                turnPhase: 'select_action',
                reserves: { white: { fish: 14, shark_small: 3, shark_big: 3 }, black: { fish: 14, shark_small: 3, shark_big: 3 } },
                winner: null
            };

            rooms.set(roomId, initialState);
            socket.join(roomId);

            console.log(`Room created: ${roomId} by ${socket.id}`);

            // Note: In real app we might need full logic but for now let's ensure creation works
            callback({ roomId, color: 'white', state: initialState });
        });

        socket.on('join_room', (roomId, callback) => {
            const room = rooms.get(roomId);
            if (!room) {
                return callback({ error: 'Room not found' });
            }
            if (room.players.black) {
                return callback({ error: 'Room full' });
            }

            room.players.black = socket.id;
            socket.join(roomId);
            console.log(`Player joined room: ${roomId}`);

            io.to(roomId).emit('player_joined', { color: 'black' });
            callback({ roomId, color: 'black', state: room });
        });

        // Handling game_move requires the full logic.ts which is TS.
        // For debugging "Create Room", this is sufficient to verify connection.
        // Once verified, we need to solve the TS import properly or compile.
    });
}

app.prepare().then(() => {
    const server = express();
    const httpServer = createServer(server);

    const io = new Server(httpServer, {
        path: '/socket.io',
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
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
