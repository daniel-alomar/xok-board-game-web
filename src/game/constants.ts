export const BOARD_RADIUS = 4; // Adjust based on board size needed (4 = 61 hexes)

export const HEX_DIRECTIONS = [
    { q: 1, r: -1 }, // 0: Top Right (approx)
    { q: 1, r: 0 },  // 1: Right
    { q: 0, r: 1 },  // 2: Bottom Right
    { q: -1, r: 1 }, // 3: Bottom Left
    { q: -1, r: 0 }, // 4: Left
    { q: 0, r: -1 }, // 5: Top Left
];

export const PIECE_LIMITS = {
    white: { fish: 14, shark_small: 3, shark_big: 3 },
    black: { fish: 14, shark_small: 3, shark_big: 3 }
};

export const WINNING_CHAIN_LENGTH = 10;
