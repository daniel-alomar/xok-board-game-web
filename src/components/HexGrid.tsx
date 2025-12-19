import React from 'react';
import { HexCoordinate, Cell, GameState, Piece } from '@/game/types';
import { generateBoardMap, getHexKey } from '@/game/hexUtils';
import styles from './GameBoard.module.css';

interface HexGridProps {
    state: GameState;
    onCellClick: (q: number, r: number) => void;
}

const HEX_SIZE = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

const hexToPixel = (q: number, r: number) => {
    const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = HEX_SIZE * ((3 / 2) * r);
    return { x, y };
};

const Hexagon = ({ q, r, onClick, piece }: { q: number, r: number, onClick: () => void, piece: Piece | null }) => {
    const { x, y } = hexToPixel(q, r);
    const points = [
        [0, -HEX_SIZE],
        [HEX_WIDTH / 2, -HEX_SIZE / 2],
        [HEX_WIDTH / 2, HEX_SIZE / 2],
        [0, HEX_SIZE],
        [-HEX_WIDTH / 2, HEX_SIZE / 2],
        [-HEX_WIDTH / 2, -HEX_SIZE / 2],
    ].map(p => p.join(',')).join(' ');

    return (
        <g transform={`translate(${x}, ${y})`}>
            <polygon
                points={points}
                className={styles.hexCell}
                onClick={onClick}
            />
            {/* Debug Coordinates
      <text y="5" textAnchor="middle" fontSize="10" fill="#666">{q},{r}</text>
      */}
            {piece && (
                <PieceRender piece={piece} />
            )}
        </g>
    );
};

const PieceRender = ({ piece }: { piece: Piece }) => {
    // Rotation mapping: 0 -> -90 (Up-Right?) No.
    // 0 in Hex Directions is q=1, r=-1 (Top Right).
    // SVG 0 is usually Right (3 o'clock).
    // Let's assume standard rotation: 60 * direction.
    // Direction 0 (Top-Right) corresponds to -30 degrees? 
    // Wait, let's look at `hexUtils`: `q:1, r:-1` is Top-Right in pointy topped hex?
    // Pointy top: Directions are 0 to 5 starting from Top-Right (30 deg) usually.
    // I will use `transform={`rotate(${piece.rotation * 60})`}` and ensure the SVG art is aligned to "Direction 0".

    // Fish is simple circle/shape. Shark has direction.

    if (piece.type === 'fish') {
        return (
            <circle r={HEX_SIZE * 0.6} fill={piece.color === 'white' ? '#fff' : '#333'} stroke="#000" strokeWidth="2" />
        );
    }

    const isBig = piece.type === 'shark_big';

    return (
        <g transform={`rotate(${(piece.rotation * 60) - 30})`} className={styles.piece}>
            {/* Shark Body */}
            <path d="M0,-25 L15,10 L0,20 L-15,10 Z" fill={piece.color === 'white' ? '#fff' : '#333'} stroke="#000" strokeWidth="2" />
            {/* Mouth */}
            <circle cx="0" cy="-25" r="5" fill="red" />
            {isBig && <circle cx="10" cy="-20" r="5" fill="red" />} {/* Second mouth simulation */}
        </g>
    );
};

export const HexGrid: React.FC<HexGridProps> = ({ state, onCellClick }) => {
    const boardKeys = Array.from(generateBoardMap(4)); // Radius 4 from constants

    return (
        <svg viewBox="-400 -400 800 800" width="800" height="800" className={styles.hexGrid}>
            <g transform="translate(0,0)"> {/* Center is 0,0 */}
                {boardKeys.map(key => {
                    const [q, r] = key.split(',').map(Number);
                    const cell = state.cells[key];
                    return (
                        <Hexagon
                            key={key}
                            q={q}
                            r={r}
                            onClick={() => onCellClick(q, r)}
                            piece={cell ? cell.piece : null}
                        />
                    );
                })}
            </g>
        </svg>
    );
};
