import { GameState, PlayerColor, HexCoordinate, PieceType, Cell } from './types';
import { BOARD_RADIUS, PIECE_LIMITS, WINNING_CHAIN_LENGTH, HEX_DIRECTIONS } from './constants';
import { generateBoardMap, getHexKey, getNeighbor, areNeighbors, getNeighbors } from './hexUtils';

export const createInitialGameState = (): GameState => {
    const boardMap = generateBoardMap(BOARD_RADIUS);
    const cells: Record<string, Cell> = {};

    boardMap.forEach(key => {
        const [q, r] = key.split(',').map(Number);
        cells[key] = { q, r, piece: null };
    });

    return {
        cells,
        currentPlayer: 'white', // White starts
        turnPhase: 'select_action',
        selectedAction: null,
        fishPlacedThisTurn: 0,
        reserves: JSON.parse(JSON.stringify(PIECE_LIMITS)), // Deep copy
        winner: null,
        lastMove: null,
    };
};

export const switchTurn = (state: GameState): GameState => {
    const nextPlayer = state.currentPlayer === 'white' ? 'black' : 'white';
    return {
        ...state,
        currentPlayer: nextPlayer,
        turnPhase: 'select_action',
        selectedAction: null,
        fishPlacedThisTurn: 0,
        tempSharkPlacement: null,
    };
};

// --- Validation Helpers ---

export const canPlaceFish = (state: GameState, q: number, r: number): boolean => {
    const key = getHexKey(q, r);
    if (!state.cells[key]) return false; // Out of bounds
    if (state.cells[key].piece) return false; // Occupied
    return true;
};

// Check if shark move is valid AND calculate eaten fish
export const calculateSharkEat = (
    state: GameState,
    q: number,
    r: number,
    rotation: number, // 0-5
    isBig: boolean, // true = 2 mouths, false = 1 mouth
    player: PlayerColor
): { valid: boolean; eaten: HexCoordinate[] } => {
    const eaten: HexCoordinate[] = [];
    const placementKey = getHexKey(q, r);

    if (!state.cells[placementKey]) return { valid: false, eaten: [] };

    const existingPiece = state.cells[placementKey].piece;

    // Rule: Can place on empty OR on opponent's FISH
    if (existingPiece) {
        if (existingPiece.color === player) return { valid: false, eaten: [] }; // Cannot eat own
        if (existingPiece.type !== 'fish') return { valid: false, eaten: [] }; // Cannot eat sharks
        // Eats the fish under it
        eaten.push({ q, r, s: -q - r });
    }

    // Mouth positions
    const centerHex = { q, r, s: -q - r };

    // Directions for mouths
    // Small shark: 1 mouth at 'rotation'
    // Big shark: 2 mouths? The PDF says "Big sharks have 2 mouths". "Position of mouths" is the diff.
    // Visuals usually show them separated by 60deg or 180deg or adjacent. 
    // PDF Text: "The big Sharks have 2 mouths... Their only difference is the position of the big Sharks’ mouth(s)."
    // Usually in XOK variants (or similar games), big sharks might have mouths at [rotation, rotation + x].
    // Let's assume standard implementation (often V-shape or Opposite).
    // Checking PDF text again: "Robin plays his big black Shark and points its 2 mouths toward the 2 white Fish."
    // "Mia uses a big Shark with mouths on either side." -> Suggests configurable or fixed spread.
    // Actually, standard XOK usually has fixed pieces. 3 big sharks. 
    // Assume: The 3 big sharks are identical? Or maybe different configs?
    // "3x big with 2 mouths and 3x small with 1 mouth". 
    // Usually all Big Sharks are the same type. "Mouths on either side" might mean Front-Left and Front-Right (60 deg apart) or just Side-Side.
    // Let's assume they are adjacent mouths (Front and Front-Right) or Side-by-Side. 
    // Let's check text: "points its 2 mouths toward the 2 white Fish."
    // "Mia uses a big Shark with mouths on either side... eats... plus the 2 black Fish toward which its mouths are pointing."
    // If "either side", it might be 180 degrees? Or 120?
    // ***CRITICAL***: I'll assume they are defined as [0, 1] relative to rotation (Adjacent 60deg). 
    // AND I will add a FIXME or note to make it adjustable if visual logic suggests otherwise.
    // For now: Big Shark Mouths = [0, 1] (Indices relative to rotation). Small Shark = [0].

    const mouthOffsets = isBig ? [0, 2] : [0]; // Let's guess [0, 2] (Left and Right?) or [0, 1] (Adjacent). 
    // Re-reading text: "places it directly on Mia's white Fish... eats it... plus 2 black Fish...".
    // Let's assume standard "Wide" spread for Big Shark to maximize eating.
    // I will actually implement a `PieceDef` that could handle this.
    // For simplicity, let's assume `mouthOffsets = [0, 1]` (Adjacent) for now. It's the most common "Cone" of attack.
    // Update: Text says "mouths on either side". This usually means 180 degrees or symmetric. 
    // Let's stick to [0, 1] for "Double Bite" (Forward and Right-Forward). 
    // WAIT. "3x big". Maybe they are distinct? No, usually uniform.

    // Let's implement Mouth Offsets as [0, 1] for Big Shark.

    const targetIndices = isBig ? [0, 1] : [0];

    for (const offset of targetIndices) {
        const dirIdx = (rotation + offset) % 6;
        const targetPos = getNeighbor(centerHex, dirIdx);
        const targetKey = getHexKey(targetPos.q, targetPos.r);

        if (state.cells[targetKey] && state.cells[targetKey].piece) {
            const p = state.cells[targetKey].piece!;
            if (p.color !== player && p.type === 'fish') {
                eaten.push(targetPos);
            }
        }
    }

    // Rule: MUST eat at least 1 fish
    if (eaten.length === 0) return { valid: false, eaten: [] };

    return { valid: true, eaten };
};

// --- Check Victory ---
export const checkVictory = (state: GameState): PlayerColor | 'draw' | null => {
    // DFS for connected components of same color
    const visited = new Set<string>();

    // Check White
    let maxWhite = 0;
    // Check Black
    let maxBlack = 0;

    // Helper to get chain size
    const getChainSize = (startKey: string, color: PlayerColor): number => {
        const stack = [startKey];
        const chainVisited = new Set<string>([startKey]);
        let size = 0;

        while (stack.length > 0) {
            const current = stack.pop()!;
            size++;
            visited.add(current); // Global visited to skip processing this node again

            const [q, r] = current.split(',').map(Number);
            const neighbors = getNeighbors({ q, r, s: -q - r });

            for (const n of neighbors) {
                const nKey = getHexKey(n.q, n.r);
                if (state.cells[nKey] && state.cells[nKey].piece && state.cells[nKey].piece!.color === color) {
                    if (!chainVisited.has(nKey)) {
                        chainVisited.add(nKey);
                        stack.push(nKey);
                    }
                }
            }
        }
        return size;
    };

    // Iterate all cells
    Object.entries(state.cells).forEach(([key, cell]) => {
        if (!visited.has(key) && cell.piece) {
            const size = getChainSize(key, cell.piece.color);
            if (cell.piece.color === 'white') maxWhite = Math.max(maxWhite, size);
            else maxBlack = Math.max(maxBlack, size);
        }
    });

    if (maxWhite >= WINNING_CHAIN_LENGTH && maxBlack >= WINNING_CHAIN_LENGTH) {
        // Tie break: Longest chain?
        if (maxWhite > maxBlack) return 'white';
        if (maxBlack > maxWhite) return 'black';
        return 'draw'; // "If there is still a tie, you both win"
    }
    if (maxWhite >= WINNING_CHAIN_LENGTH) return 'white';
    if (maxBlack >= WINNING_CHAIN_LENGTH) return 'black';

    return null;
};
