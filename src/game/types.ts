export type PlayerColor = 'white' | 'black';

export type PieceType = 'fish' | 'shark_small' | 'shark_big';

export interface HexCoordinate {
    q: number;
    r: number;
    s: number; // q + r + s = 0
}

export interface Piece {
    id: string;
    type: PieceType;
    color: PlayerColor;
    rotation: number; // 0 to 5 (6 directions)
}

export interface Cell {
    q: number;
    r: number;
    piece: Piece | null;
}

export interface GameState {
    cells: Record<string, Cell>; // Key: "q,r"
    currentPlayer: PlayerColor;
    turnPhase: 'select_action' | 'placing_fish_1' | 'placing_fish_2' | 'placing_shark' | 'rotating_shark';
    selectedAction: 'play_fish' | 'play_shark' | null;
    fishPlacedThisTurn: number; // 0 or 1 (need 2)
    reserves: {
        white: { fish: number; shark_small: number; shark_big: number };
        black: { fish: number; shark_small: number; shark_big: number };
    };
    winner: PlayerColor | 'draw' | null;
    lastMove: {
        from?: HexCoordinate;
        to: HexCoordinate;
    } | null;
    tempSharkPlacement?: {
        q: number;
        r: number;
        pieceType: 'shark_small' | 'shark_big';
    } | null; // For UI flow before confirming rotation
}
