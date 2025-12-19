import React from 'react';
import styles from './GameBoard.module.css';

interface SharkControlsProps {
    onRotate: (direction: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
    currentRotation: number;
}

export const SharkControls: React.FC<SharkControlsProps> = ({ onRotate, onConfirm, onCancel, currentRotation }) => {
    return (
        <div className={styles.controls} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button onClick={() => onRotate((currentRotation - 1 + 6) % 6)}>↺</button>
                <span>Rotation: {currentRotation}</span>
                <button onClick={() => onRotate((currentRotation + 1) % 6)}>↻</button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onConfirm} style={{ background: '#4ade80', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Confirm</button>
                <button onClick={onCancel} style={{ background: '#f87171', border: 'none', padding: '5px 10px', borderRadius: '4px' }}>Cancel</button>
            </div>
        </div>
    );
};
