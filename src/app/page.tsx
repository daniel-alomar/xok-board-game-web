'use client';

import React, { useState } from 'react';
import { getSocket } from '@/lib/socket';
import { GameClient } from '@/components/GameClient';
import { GameState, PlayerColor } from '@/game/types';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [playerColor, setPlayerColor] = useState<PlayerColor | 'spectator' | null>(null);
  const [initialState, setInitialState] = useState<GameState | null>(null);
  const socket = getSocket();

  const createRoom = () => {
    socket.connect();
    socket.emit('create_room', (response: { roomId: string, color: PlayerColor }) => {
      setRoomId(response.roomId);
      setPlayerColor(response.color); // Should be 'white'
      // Need initial state? Usually empty board.
      // Ideally 'create_room' callback returns state too or we assume default.
      // But GameClient waits for 'game_update' or needs validation. 
      // Let's assume GameClient handles 'game_update' on mount/connect?
      // Actually `createInitialGameState` is deterministic.
      // But better if server sends it.
      // Let's update server to send state on create too, or just fetch it.
      // `join_room` sends state. `create_room` callback in my server code only sent {roomId, color}.
      // I should update server to send state too, OR just immediately join?
      // Actually, after create, I should technically 'join' or the server considers me joined.
      // Server code: `socket.join(roomId)`.

      // I'll update GameClient to fetch state or wait for update?
      // Let's just trigger a 'join_room' for simplicity? No, I'm already in.
      // I'll update server code to return state in create_room callback for consistency.
      // For now, I'll assume standard initial state.
    });
  };

  const joinRoom = () => {
    if (!inputRoomId) return;
    socket.connect();
    socket.emit('join_room', inputRoomId, (response: { roomId: string, color: PlayerColor, state: GameState, error?: string }) => {
      if (response.error) {
        alert(response.error);
        return;
      }
      setRoomId(response.roomId);
      setPlayerColor(response.color);
      setInitialState(response.state);
    });
  };

  if (roomId && playerColor) {
    // If we created the room, we might not have initialState from callback yet if I didn't update server.
    // Hack: if no initialState, assume default? OR wait?
    // Let's force 'initialState' requirement.
    // I will update server code quickly to return state in create, OR handle it here.

    // Actually, distinct handling:
    // If I created, I know it's empty state. 
    // BUT to be safe, I'll update the server code in next step to return state.
    // For now, I'll render GameClient IF initialState is present.
    if (initialState) {
      return <GameClient roomId={roomId} playerColor={playerColor as PlayerColor} initialState={initialState} />;
    } else {
      // Fetch state or assume default
      // I'll fix server code.
      return <div>Loading Game...</div>;
    }
  }

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
      <h1>🦈 XOK Board Game</h1>

      <div style={{ display: 'flex', gap: '20px', marginTop: '40px' }}>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Create New Game</h3>
          <button onClick={createRoom} style={{ padding: '10px 20px', fontSize: '16px' }}>Create Room</button>
        </div>

        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Join Game</h3>
          <input
            type="text"
            placeholder="Room Code"
            value={inputRoomId}
            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
            style={{ padding: '10px', fontSize: '16px', textTransform: 'uppercase' }}
          />
          <button onClick={joinRoom} style={{ padding: '10px 20px', fontSize: '16px', marginLeft: '10px' }}>Join</button>
        </div>
      </div>
    </main>
  );
}
