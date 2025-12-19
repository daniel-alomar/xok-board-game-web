import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import { GameState } from './src/game/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Inlined socket logic to prevent import issues during debugging
const rooms = new Map<string, GameState>();

function setupGameSocket(io: Server) {
    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        socket.on('create_room', (callback) => {
            const roomId = Math.random().toString(36).substring(7).toUpperCase();

            const initialState: GameState = {
                roomId,
                board: {}, // Will be populated by logic in real app
                players: { white: socket.id, black: null },
                currentPlayer: 'white',
                turnPhase: 'select_action',
                reserves: { white: { fish: 14, shark_small: 3, shark_big: 3 }, black: { fish: 14, shark_small: 3, shark_big: 3 } },
                winner: null
            };

            rooms.set(roomId, initialState);
            socket.join(roomId);

            console.log(`Room created: ${roomId}`);
            callback({ roomId, color: 'white', state: initialState });
        });

        socket.on('join_room', (roomId: string, callback) => {
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
        res.status(200).json({ status: 'ok', server: 'ts-node-custom', socket: true });
    });

    server.all('(.*)', (req, res) => {
        return handle(req, res);
    });

    httpServer.listen(port, '0.0.0.0', () => {
        console.log(`> Ready on http://0.0.0.0:${port}`);
        console.log('> Socket.io active');
    });
}).catch(err => {
    console.error('Error preparing app:', err);
    process.exit(1);
});
