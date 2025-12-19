'use client';

import React, { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { GameState, PlayerColor, HexCoordinate } from '@/game/types';
import { HexGrid } from './HexGrid';
import { SharkControls } from './SharkControls';
import styles from './GameBoard.module.css';

interface GameClientProps {
    roomId: string;
    initialState: GameState;
    playerColor: PlayerColor | 'spectator';
}

export const GameClient: React.FC<GameClientProps> = ({ roomId, initialState, playerColor }) => {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [selectedAction, setSelectedAction] = useState<'fish' | 'shark_small' | 'shark_big' | null>(null);
    const [tempPlacements, setTempPlacements] = useState<{ q: number, r: number }[]>([]);
    const [sharkPlacement, setSharkPlacement] = useState<{ q: number, r: number, type: 'shark_small' | 'shark_big' } | null>(null);
    const [sharkRotation, setSharkRotation] = useState<number>(0);

    const socket = getSocket();

    useEffect(() => {
        socket.on('game_update', (newState: GameState) => {
            setGameState(newState);
            // Reset local temp state on update
            setTempPlacements([]);
            setSharkPlacement(null);
            setSharkRotation(0);
        });

        return () => {
            socket.off('game_update');
        };
    }, []);

    const handleCellClick = (q: number, r: number) => {
        if (gameState.currentPlayer !== playerColor) return;
        if (gameState.winner) return;

        // Fish Logic
        if (selectedAction === 'fish') {
            if (sharkPlacement) return; // Should not happen

            // Toggle selection
            const existingIdx = tempPlacements.findIndex(p => p.q === q && p.r === r);
            if (existingIdx >= 0) {
                setTempPlacements(prev => prev.filter((_, i) => i !== existingIdx));
                return;
            }

            if (tempPlacements.length < 2) {
                // Add
                const newPlacements = [...tempPlacements, { q, r }];
                setTempPlacements(newPlacements);

                if (newPlacements.length === 2) {
                    // Check if ready to submit? User might want to confirm.
                    // For speed, let's auto-submit if valid?
                    // Better validation check:
                    socket.emit('game_move', {
                        roomId,
                        move: {
                            type: 'place_fish',
                            placements: newPlacements
                        }
                    });
                }
            }
        }
        // Shark Logic
        else if (selectedAction === 'shark_small' || selectedAction === 'shark_big') {
            setSharkPlacement({ q, r, type: selectedAction });
            setSharkRotation(0); // Reset rotation default
        }
    };

    const handleSharkConfirm = () => {
        if (!sharkPlacement) return;
        socket.emit('game_move', {
            roomId,
            move: {
                type: 'place_shark',
                q: sharkPlacement.q,
                r: sharkPlacement.r,
                rotation: sharkRotation,
                sharkType: sharkPlacement.type
            }
        });
    };

    return (
        <div className={styles.boardContainer}>
            <div style={{ marginBottom: '20px' }}>
                <h2>Room: {roomId} | You are: {playerColor}</h2>
                <div>
                    Current Turn: {gameState.currentPlayer}
                    {gameState.winner && <span style={{ color: 'gold', fontWeight: 'bold' }}> | WINNER: {gameState.winner}</span>}
                </div>
            </div>

            <div className={styles.gameArea}>
                <HexGrid state={gameState} onCellClick={handleCellClick} />

                {/* Temporary Visuals for Fish Placement */}
                {/* This requires HexGrid to accept highlights props or we overlay.
                    For simplicity, we modify the state passed to HexGrid optimistically or
                    Pass a separate HIGHLIGHTS prop to HexGrid.
                    Let's update HexGrid to support highlights later.
                    For now, it's blind until update. (Not ideal).
                    
                    FIX: Update HexGrid prop signature to accept 'highlights'.
                */}

                {sharkPlacement && (
                    <SharkControls
                        currentRotation={sharkRotation}
                        onRotate={setSharkRotation}
                        onConfirm={handleSharkConfirm}
                        onCancel={() => setSharkPlacement(null)}
                    />
                )}
            </div>

            <div className={styles.controls}>
                <h3>Actions</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        disabled={gameState.currentPlayer !== playerColor || gameState.winner !== null}
                        onClick={() => setSelectedAction('fish')}
                        style={{ border: selectedAction === 'fish' ? '2px solid blue' : '1px solid gray' }}
                    >
                        Play 2 Fish ({gameState.reserves[playerColor === 'spectator' ? 'white' : playerColor].fish})
                    </button>
                    <button
                        disabled={gameState.currentPlayer !== playerColor || gameState.winner !== null}
                        onClick={() => setSelectedAction('shark_small')}
                        style={{ border: selectedAction === 'shark_small' ? '2px solid blue' : '1px solid gray' }}
                    >
                        Small Shark ({gameState.reserves[playerColor === 'spectator' ? 'white' : playerColor].shark_small})
                    </button>
                    <button
                        disabled={gameState.currentPlayer !== playerColor || gameState.winner !== null}
                        onClick={() => setSelectedAction('shark_big')}
                        style={{ border: selectedAction === 'shark_big' ? '2px solid blue' : '1px solid gray' }}
                    >
                        Big Shark ({gameState.reserves[playerColor === 'spectator' ? 'white' : playerColor].shark_big})
                    </button>
                </div>
            </div>
        </div>
    );
};
