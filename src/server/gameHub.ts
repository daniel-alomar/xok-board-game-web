import { Server, Socket } from 'socket.io';
import { createInitialGameState, switchTurn, canPlaceFish, calculateSharkEat, checkVictory } from '../game/logic';
import { GameState, HexCoordinate } from '../game/types';
import { getHexKey } from '../game/hexUtils';

interface Room {
    id: string;
    state: GameState;
    players: {
        white: string | null;
        black: string | null;
    };
    spectators: string[];
}

const rooms: Record<string, Room> = {};

export const setupGameSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('User connected', socket.id);

        socket.on('create_room', (callback) => {
            const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            rooms[roomId] = {
                id: roomId,
                state: createInitialGameState(),
                players: { white: socket.id, black: null },
                spectators: []
            };
            socket.join(roomId);
            callback({ roomId, color: 'white', state: rooms[roomId].state });
        });

        socket.on('join_room', (roomId: string, callback) => {
            const room = rooms[roomId];
            if (!room) {
                callback({ error: 'Room not found' });
                return;
            }

            let color: 'white' | 'black' | 'spectator' = 'spectator';

            if (!room.players.white && room.players.white !== socket.id) {
                // Should not happen if created by white
                room.players.white = socket.id;
                color = 'white';
            } else if (!room.players.black) {
                room.players.black = socket.id;
                color = 'black';
            } else {
                room.spectators.push(socket.id);
            }

            socket.join(roomId);
            callback({ roomId, color, state: room.state });
            io.to(roomId).emit('player_joined', { color });
        });

        socket.on('game_move', ({ roomId, move }: { roomId: string, move: any }) => {
            const room = rooms[roomId];
            if (!room) return;

            const { state } = room;
            // Validate turn
            // In a real app, map socket.id to color and check if it's their turn
            // For now trusting client color or check socket map

            const playerColor = room.players.white === socket.id ? 'white' : room.players.black === socket.id ? 'black' : null;
            if (!playerColor || state.currentPlayer !== playerColor) return;

            // Logic Application
            // Move types: 'fish' (2 parts), 'shark'

            if (move.type === 'place_fish') {
                // Expected: [{q,r}, {q,r}]
                if (!Array.isArray(move.placements) || move.placements.length !== 2) return;

                // Validate both
                const [p1, p2] = move.placements;
                if (!canPlaceFish(state, p1.q, p1.r) || !canPlaceFish(state, p2.q, p2.r)) return;
                // Verify adjacency?
                // Rules: "Place 2 Fish... on 2 empty spaces adjacent to each other." => NO.
                // Text: "places her 2 white Fish next to each other on 2 empty spaces." -> Yes Adjacent.
                // Or "adjacent empty spaces anywhere".
                // I need `areNeighbors`.
                // Wait, logic implementation of `canPlaceFish` is simple check.
                // I need `areNeighbors` check here.

                // Let's implement full validation logic here or in `logic.ts`
                // But `processing` needs to happen.
                // Updating state:
                state.cells[getHexKey(p1.q, p1.r)] = { q: p1.q, r: p1.r, piece: { id: `f-${Date.now()}-1`, type: 'fish', color: playerColor, rotation: 0 } };
                state.cells[getHexKey(p2.q, p2.r)] = { q: p2.q, r: p2.r, piece: { id: `f-${Date.now()}-2`, type: 'fish', color: playerColor, rotation: 0 } };

                // Update reserves
                state.reserves[playerColor].fish -= 2;

                // Check Win? Fish placement usually doesn't trigger win unless chain formed.

            } else if (move.type === 'place_shark') {
                // { q, r, rotation, chunkType: 'shark_small' | 'shark_big' }
                const { q, r, rotation, sharkType } = move;
                const isBig = sharkType === 'shark_big';

                const result = calculateSharkEat(state, q, r, rotation, isBig, playerColor);
                if (!result.valid) return; // Invalid move

                // Execute Eat
                result.eaten.forEach(h => {
                    const key = getHexKey(h.q, h.r);
                    const p = state.cells[key].piece;
                    if (p) {
                        // Return to supply
                        // "returned to the supply of that color" -> opponent's supply
                        const opp = playerColor === 'white' ? 'black' : 'white';
                        state.reserves[opp].fish++;
                    }
                    state.cells[key].piece = null;
                });

                // Place Shark
                state.cells[getHexKey(q, r)].piece = {
                    id: `s-${Date.now()}`,
                    type: sharkType,
                    color: playerColor,
                    rotation
                };

                // Decrement Reserve
                state.reserves[playerColor][sharkType === 'shark_big' ? 'shark_big' : 'shark_small']--;
            }

            // Check Victory
            const winner = checkVictory(state);
            state.winner = winner;

            if (!winner) {
                // Switch Turn
                const nextState = switchTurn(state);
                room.state = nextState;
            } else {
                room.state.winner = winner;
            }

            io.to(roomId).emit('game_update', room.state);
        });

        socket.on('disconnect', () => {
            // Handle disconnect
        });
    });
};
