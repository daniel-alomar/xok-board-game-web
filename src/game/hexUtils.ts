import { HexCoordinate } from './types';
import { HEX_DIRECTIONS, BOARD_RADIUS } from './constants';

export const getHexKey = (q: number, r: number): string => `${q},${r}`;

export const parseHexKey = (key: string): HexCoordinate => {
    const [q, r] = key.split(',').map(Number);
    return { q, r, s: -q - r };
};

export const getNeighbor = (hex: HexCoordinate, directionIndex: number): HexCoordinate => {
    const dir = HEX_DIRECTIONS[directionIndex % 6];
    return {
        q: hex.q + dir.q,
        r: hex.r + dir.r,
        s: hex.s - dir.q - dir.r
    };
};

export const getNeighbors = (hex: HexCoordinate): HexCoordinate[] => {
    return HEX_DIRECTIONS.map((dir) => ({
        q: hex.q + dir.q,
        r: hex.r + dir.r,
        s: hex.s - dir.q - dir.r
    }));
};

export const areNeighbors = (h1: HexCoordinate, h2: HexCoordinate): boolean => {
    const dq = h1.q - h2.q;
    const dr = h1.r - h2.r;
    const ds = h1.s - h2.s;
    // In axial coords, distance is (abs(dq) + abs(dr) + abs(ds)) / 2
    // Neighbors have distance 1
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2 === 1;
};

export const generateBoardMap = (radius: number): Set<string> => {
    const map = new Set<string>();
    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);
        for (let r = r1; r <= r2; r++) {
            map.add(getHexKey(q, r));
        }
    }
    return map;
};

export const getLineOfSight = (
    start: HexCoordinate,
    directionIndex: number,
    length: number
): HexCoordinate[] => {
    const line: HexCoordinate[] = [];
    let current = start;
    for (let i = 0; i < length; i++) {
        current = getNeighbor(current, directionIndex);
        line.push(current);
    }
    return line;
};
