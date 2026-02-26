/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { VoxelData } from '../types';
import { COLORS, CONFIG } from './voxelConstants';

// Helper to prevent overlapping voxels
function setBlock(map: Map<string, VoxelData>, x: number, y: number, z: number, color: number) {
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rz = Math.round(z);
    const key = `${rx},${ry},${rz}`;
    map.set(key, { x: rx, y: ry, z: rz, color });
}

function generateSphere(map: Map<string, VoxelData>, cx: number, cy: number, cz: number, r: number, col: number, sy = 1) {
    const r2 = r * r;
    const xMin = Math.floor(cx - r);
    const xMax = Math.ceil(cx + r);
    const yMin = Math.floor(cy - r * sy);
    const yMax = Math.ceil(cy + r * sy);
    const zMin = Math.floor(cz - r);
    const zMax = Math.ceil(cz + r);

    for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
            for (let z = zMin; z <= zMax; z++) {
                const dx = x - cx;
                const dy = (y - cy) / sy;
                const dz = z - cz;
                if (dx * dx + dy * dy + dz * dz <= r2) {
                    setBlock(map, x, y, z, col);
                }
            }
        }
    }
}

function generateBox(map: Map<string, VoxelData>, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: number) {
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);
    const zMin = Math.min(z1, z2);
    const zMax = Math.max(z1, z2);

    for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
            for (let z = zMin; z <= zMax; z++) {
                setBlock(map, x, y, z, color);
            }
        }
    }
}

export const Generators = {
    Eagle: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        // Branch
        for (let x = -8; x < 8; x++) {
            const y = Math.sin(x * 0.2) * 1.5;
            const z = Math.cos(x * 0.1) * 1.5;
            generateSphere(map, x, y, z, 1.8, COLORS.WOOD);
            if (Math.random() > 0.7) generateSphere(map, x, y + 2, z + (Math.random() - 0.5) * 3, 1.5, COLORS.GREEN);
        }
        // Body
        const EX = 0, EY = 2, EZ = 2;
        generateSphere(map, EX, EY + 6, EZ, 4.5, COLORS.DARK, 1.4);
        // Chest
        for (let x = EX - 2; x <= EX + 2; x++) for (let y = EY + 4; y <= EY + 9; y++) setBlock(map, x, y, EZ + 3, COLORS.LIGHT);
        // Wings (Rough approximation)
        for (let x of [-4, -3, 3, 4]) for (let y = EY + 4; y <= EY + 10; y++) for (let z = EZ - 2; z <= EZ + 3; z++) setBlock(map, x, y, z, COLORS.DARK);
        // Tail
        for (let x = EX - 2; x <= EX + 2; x++) for (let y = EY; y <= EY + 4; y++) for (let z = EZ - 5; z <= EZ - 3; z++) setBlock(map, x, y, z, COLORS.WHITE);
        // Head
        const HY = EY + 12, HZ = EZ + 1;
        generateSphere(map, EX, HY, HZ, 2.8, COLORS.WHITE);
        generateSphere(map, EX, HY - 2, HZ, 2.5, COLORS.WHITE);
        // Talons
        [[-2, 0], [-2, 1], [2, 0], [2, 1]].forEach(o => setBlock(map, EX + o[0], EY + o[1], EZ, COLORS.TALON));
        // Beak
        [[0, 1], [0, 2], [1, 1], [-1, 1]].forEach(o => setBlock(map, EX + o[0], HY, HZ + 2 + o[1], COLORS.GOLD));
        setBlock(map, EX, HY - 1, HZ + 3, COLORS.GOLD);
        // Eyes
        [[-1.5, COLORS.BLACK], [1.5, COLORS.BLACK]].forEach(o => setBlock(map, EX + o[0], HY + 0.5, HZ + 1.5, o[1]));
        [[-1.5, COLORS.WHITE], [1.5, COLORS.WHITE]].forEach(o => setBlock(map, EX + o[0], HY + 1.5, HZ + 1.5, o[1]));

        return Array.from(map.values());
    },

    Cat: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const CY = CONFIG.FLOOR_Y + 1; const CX = 0, CZ = 0;
        // Paws
        generateSphere(map, CX - 3, CY + 2, CZ, 2.2, COLORS.DARK, 1.2);
        generateSphere(map, CX + 3, CY + 2, CZ, 2.2, COLORS.DARK, 1.2);
        // Body
        for (let y = 0; y < 7; y++) {
            const r = 3.5 - (y * 0.2);
            generateSphere(map, CX, CY + 2 + y, CZ, r, COLORS.DARK);
            generateSphere(map, CX, CY + 2 + y, CZ + 2, r * 0.6, COLORS.WHITE);
        }
        // Legs
        for (let y = 0; y < 5; y++) {
            setBlock(map, CX - 1.5, CY + y, CZ + 3, COLORS.WHITE); setBlock(map, CX + 1.5, CY + y, CZ + 3, COLORS.WHITE);
            setBlock(map, CX - 1.5, CY + y, CZ + 2, COLORS.WHITE); setBlock(map, CX + 1.5, CY + y, CZ + 2, COLORS.WHITE);
        }
        // Head
        const CHY = CY + 9;
        generateSphere(map, CX, CHY, CZ, 3.2, COLORS.LIGHT, 0.8);
        // Ears
        [[-2, 1], [2, 1]].forEach(side => {
            setBlock(map, CX + side[0], CHY + 3, CZ, COLORS.DARK); setBlock(map, CX + side[0] * 0.8, CHY + 3, CZ + 1, COLORS.WHITE);
            setBlock(map, CX + side[0], CHY + 4, CZ, COLORS.DARK);
        });
        // Tail
        for (let i = 0; i < 12; i++) {
            const a = i * 0.3, tx = Math.cos(a) * 4.5, tz = Math.sin(a) * 4.5;
            if (tz > -2) { setBlock(map, CX + tx, CY, CZ + tz, COLORS.DARK); setBlock(map, CX + tx, CY + 1, CZ + tz, COLORS.DARK); }
        }
        // Face
        setBlock(map, CX - 1, CHY + 0.5, CZ + 2.5, COLORS.GOLD); setBlock(map, CX + 1, CHY + 0.5, CZ + 2.5, COLORS.GOLD);
        setBlock(map, CX - 1, CHY + 0.5, CZ + 3, COLORS.BLACK); setBlock(map, CX + 1, CHY + 0.5, CZ + 3, COLORS.BLACK);
        setBlock(map, CX, CHY, CZ + 3, COLORS.TALON);
        return Array.from(map.values());
    },

    Rabbit: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const LOG_Y = CONFIG.FLOOR_Y + 2.5;
        const RX = 0, RZ = 0;
        // Log
        for (let x = -6; x <= 6; x++) {
            const radius = 2.8 + Math.sin(x * 0.5) * 0.2;
            generateSphere(map, x, LOG_Y, 0, radius, COLORS.DARK);
            if (x === -6 || x === 6) generateSphere(map, x, LOG_Y, 0, radius - 0.5, COLORS.WOOD);
            if (Math.random() > 0.8) setBlock(map, x, LOG_Y + radius, (Math.random() - 0.5) * 2, COLORS.GREEN);
        }
        // Body
        const BY = LOG_Y + 2.5;
        generateSphere(map, RX - 1.5, BY + 1.5, RZ - 1.5, 1.8, COLORS.WHITE);
        generateSphere(map, RX + 1.5, BY + 1.5, RZ - 1.5, 1.8, COLORS.WHITE);
        generateSphere(map, RX, BY + 2, RZ, 2.2, COLORS.WHITE, 0.8);
        generateSphere(map, RX, BY + 2.5, RZ + 1.5, 1.5, COLORS.WHITE);
        setBlock(map, RX - 1.2, BY, RZ + 2.2, COLORS.LIGHT); setBlock(map, RX + 1.2, BY, RZ + 2.2, COLORS.LIGHT);
        setBlock(map, RX - 2.2, BY, RZ - 0.5, COLORS.WHITE); setBlock(map, RX + 2.2, BY, RZ - 0.5, COLORS.WHITE);
        generateSphere(map, RX, BY + 1.5, RZ - 2.5, 1.0, COLORS.WHITE);
        // Head
        const HY = BY + 4.5; const HZ = RZ + 1;
        generateSphere(map, RX, HY, HZ, 1.7, COLORS.WHITE);
        generateSphere(map, RX - 1.1, HY - 0.5, HZ + 0.5, 1.0, COLORS.WHITE);
        generateSphere(map, RX + 1.1, HY - 0.5, HZ + 0.5, 1.0, COLORS.WHITE);
        // Ears
        for (let y = 0; y < 5; y++) {
            const curve = y * 0.2;
            setBlock(map, RX - 0.8, HY + 1.5 + y, HZ - curve, COLORS.WHITE); setBlock(map, RX - 1.2, HY + 1.5 + y, HZ - curve, COLORS.WHITE);
            setBlock(map, RX - 1.0, HY + 1.5 + y, HZ - curve + 0.5, COLORS.LIGHT);
            setBlock(map, RX + 0.8, HY + 1.5 + y, HZ - curve, COLORS.WHITE); setBlock(map, RX + 1.2, HY + 1.5 + y, HZ - curve, COLORS.WHITE);
            setBlock(map, RX + 1.0, HY + 1.5 + y, HZ - curve + 0.5, COLORS.LIGHT);
        }
        setBlock(map, RX - 0.8, HY + 0.2, HZ + 1.5, COLORS.BLACK); setBlock(map, RX + 0.8, HY + 0.2, HZ + 1.5, COLORS.BLACK);
        setBlock(map, RX, HY - 0.5, HZ + 1.8, COLORS.TALON);
        return Array.from(map.values());
    },

    Twins: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        function buildMiniEagle(offsetX: number, offsetZ: number, mirror: boolean) {
            // Branch
            for (let x = -5; x < 5; x++) {
                const y = Math.sin(x * 0.4) * 0.5;
                generateSphere(map, offsetX + x, y, offsetZ, 1.2, COLORS.WOOD);
                if (Math.random() > 0.8) generateSphere(map, offsetX + x, y + 1, offsetZ, 1, COLORS.GREEN);
            }
            const EX = offsetX, EY = 1.5, EZ = offsetZ;
            generateSphere(map, EX, EY + 4, EZ, 3.0, COLORS.DARK, 1.4);
            for (let x = EX - 1; x <= EX + 1; x++) for (let y = EY + 2; y <= EY + 6; y++) setBlock(map, x, y, EZ + 2, COLORS.LIGHT);
            for (let x = EX - 1; x <= EX + 1; x++) for (let y = EY + 2; y <= EY + 3; y++) setBlock(map, x, y, EZ - 3, COLORS.WHITE);
            for (let y = EY + 2; y <= EY + 6; y++) for (let z = EZ - 1; z <= EZ + 2; z++) { setBlock(map, EX - 3, y, z, COLORS.DARK); setBlock(map, EX + 3, y, z, COLORS.DARK); }
            const HY = EY + 8, HZ = EZ + 1;
            generateSphere(map, EX, HY, HZ, 2.0, COLORS.WHITE);
            setBlock(map, EX, HY, HZ + 2, COLORS.GOLD); setBlock(map, EX, HY - 0.5, HZ + 2, COLORS.GOLD);
            setBlock(map, EX - 1, HY + 0.5, HZ + 1, COLORS.BLACK); setBlock(map, EX + 1, HY + 0.5, HZ + 1, COLORS.BLACK);
            setBlock(map, EX - 1, EY, EZ, COLORS.TALON); setBlock(map, EX + 1, EY, EZ, COLORS.TALON);
        }
        buildMiniEagle(-10, 2, false);
        buildMiniEagle(10, -2, true);
        return Array.from(map.values());
    },

    Castle: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Base
        generateBox(map, -8, Y, -8, 8, Y + 4, 8, COLORS.LIGHT);
        // Towers
        [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([tx, tz]) => {
            generateBox(map, tx - 2, Y, tz - 2, tx + 2, Y + 8, tz + 2, COLORS.DARK);
            generateBox(map, tx - 2.5, Y + 8, tz - 2.5, tx + 2.5, Y + 9, tz + 2.5, COLORS.DARK); // Battlements
        });
        // Keep
        generateBox(map, -4, Y + 4, -4, 4, Y + 8, 4, COLORS.LIGHT);
        generateBox(map, -4.5, Y + 8, -4.5, 4.5, Y + 9, 4.5, COLORS.DARK);
        // Gate
        generateBox(map, -2, Y, 8, 2, Y + 3, 9, COLORS.WOOD);
        return Array.from(map.values());
    },

    Robot: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 4;
        // Legs
        generateBox(map, -2, Y - 4, 0, -1, Y + 2, 1, COLORS.DARK);
        generateBox(map, 1, Y - 4, 0, 2, Y + 2, 1, COLORS.DARK);
        // Torso
        generateBox(map, -2.5, Y + 2, -1, 2.5, Y + 7, 1.5, COLORS.LIGHT);
        // Arms
        generateBox(map, -4, Y + 3, 0, -2.5, Y + 6, 1, COLORS.DARK);
        generateBox(map, 2.5, Y + 3, 0, 4, Y + 6, 1, COLORS.DARK);
        // Head
        generateBox(map, -1.5, Y + 7, -1, 1.5, Y + 10, 1.5, COLORS.WHITE);
        // Eyes
        setBlock(map, -0.5, Y + 8, 1.5, COLORS.RED);
        setBlock(map, 0.5, Y + 8, 1.5, COLORS.RED);
        return Array.from(map.values());
    },

    Tree: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        // Trunk
        generateBox(map, -1, Y, -1, 1, Y + 6, 1, COLORS.WOOD);
        // Leaves
        generateSphere(map, 0, Y + 8, 0, 4, COLORS.GREEN);
        generateSphere(map, 0, Y + 10, 0, 3, COLORS.GREEN);
        generateSphere(map, 2, Y + 7, 2, 2, COLORS.GREEN);
        generateSphere(map, -2, Y + 7, -2, 2, COLORS.GREEN);
        return Array.from(map.values());
    },

    Car: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Wheels
        [[-3, -2], [3, -2], [-3, 2], [3, 2]].forEach(([wx, wz]) => {
            generateSphere(map, wx, Y, wz, 1, COLORS.BLACK);
        });
        // Chassis
        generateBox(map, -4, Y + 1, -2.5, 4, Y + 3, 2.5, COLORS.RED);
        // Cabin
        generateBox(map, -2, Y + 3, -2, 2, Y + 5, 2, COLORS.WHITE); // Glass/Top
        return Array.from(map.values());
    },

    Boat: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Hull
        for (let y = 0; y < 3; y++) {
             generateBox(map, -5 + y, Y + y, -2, 5 - y, Y + y + 1, 2, COLORS.WOOD);
        }
        // Mast
        generateBox(map, 0, Y + 2, 0, 0, Y + 8, 0, COLORS.DARK);
        // Sail
        generateBox(map, 0, Y + 4, 0, 0, Y + 7, 3, COLORS.WHITE);
        return Array.from(map.values());
    },

    Plane: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 5;
        // Fuselage
        generateBox(map, -6, Y, -1, 6, Y + 2, 1, COLORS.WHITE);
        // Wings
        generateBox(map, -1, Y, -6, 2, Y + 1, 6, COLORS.RED);
        // Tail
        generateBox(map, -6, Y + 2, 0, -4, Y + 4, 0, COLORS.RED);
        // Propeller
        generateBox(map, 6, Y, -2, 6, Y + 2, 2, COLORS.BLACK);
        return Array.from(map.values());
    },

    House: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        // Walls
        generateBox(map, -4, Y, -4, 4, Y + 5, 4, COLORS.WOOD);
        // Roof
        for (let i = 0; i <= 4; i++) {
            generateBox(map, -4 + i, Y + 5 + i, -4, 4 - i, Y + 6 + i, 4, COLORS.RED);
        }
        // Door
        generateBox(map, -1, Y, 4, 1, Y + 3, 4, COLORS.DARK);
        return Array.from(map.values());
    },

    Duck: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Body
        generateSphere(map, 0, Y + 2, 0, 3, COLORS.GOLD); // Yellowish
        // Head
        generateSphere(map, 2, Y + 4, 0, 1.5, COLORS.GOLD);
        // Beak
        generateBox(map, 3, Y + 3.5, -0.5, 4, Y + 4.5, 0.5, COLORS.ORANGE);
        // Wings
        generateBox(map, -1, Y + 2, 2, 1, Y + 3, 3, COLORS.GOLD);
        generateBox(map, -1, Y + 2, -3, 1, Y + 3, -2, COLORS.GOLD);
        return Array.from(map.values());
    },

    Penguin: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Body
        generateBox(map, -2, Y, -2, 2, Y + 6, 2, COLORS.BLACK);
        generateBox(map, -1.5, Y, 2, 1.5, Y + 5, 2.2, COLORS.WHITE); // Belly
        // Head
        generateBox(map, -1.5, Y + 6, -1.5, 1.5, Y + 8, 1.5, COLORS.BLACK);
        // Beak
        setBlock(map, 0, Y + 6.5, 1.6, COLORS.ORANGE);
        // Feet
        setBlock(map, -1, Y, 1, COLORS.ORANGE);
        setBlock(map, 1, Y, 1, COLORS.ORANGE);
        return Array.from(map.values());
    },

    Snowman: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y;
        // Bottom
        generateSphere(map, 0, Y + 2, 0, 2.5, COLORS.WHITE);
        // Middle
        generateSphere(map, 0, Y + 5.5, 0, 1.8, COLORS.WHITE);
        // Top
        generateSphere(map, 0, Y + 8, 0, 1.2, COLORS.WHITE);
        // Eyes
        setBlock(map, -0.5, Y + 8.2, 1, COLORS.BLACK);
        setBlock(map, 0.5, Y + 8.2, 1, COLORS.BLACK);
        // Nose
        setBlock(map, 0, Y + 8, 1.2, COLORS.ORANGE);
        // Arms
        generateBox(map, -3, Y + 6, 0, -1.5, Y + 6.2, 0, COLORS.WOOD);
        generateBox(map, 1.5, Y + 6, 0, 3, Y + 6.2, 0, COLORS.WOOD);
        return Array.from(map.values());
    },

    Pikachu: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Body
        generateSphere(map, 0, Y + 2.5, 0, 2.5, COLORS.YELLOW);
        // Head
        generateSphere(map, 0, Y + 5.5, 0, 2.2, COLORS.YELLOW);
        // Ears
        generateBox(map, -2.5, Y + 7, 0, -1.5, Y + 10, 0.5, COLORS.YELLOW);
        generateBox(map, 1.5, Y + 7, 0, 2.5, Y + 10, 0.5, COLORS.YELLOW);
        // Ear tips
        generateBox(map, -2.5, Y + 9.5, 0, -1.5, Y + 10, 0.5, COLORS.BLACK);
        generateBox(map, 1.5, Y + 9.5, 0, 2.5, Y + 10, 0.5, COLORS.BLACK);
        // Tail
        generateBox(map, 0, Y + 1, -3, 1, Y + 2, -2, COLORS.WOOD);
        generateBox(map, 1, Y + 2, -3, 2, Y + 4, -2, COLORS.WOOD);
        generateBox(map, 1, Y + 4, -3, 3, Y + 5, -2, COLORS.YELLOW);
        // Cheeks
        setBlock(map, -1.5, Y + 5, 1.8, COLORS.RED);
        setBlock(map, 1.5, Y + 5, 1.8, COLORS.RED);
        // Eyes
        setBlock(map, -0.8, Y + 6, 1.8, COLORS.BLACK);
        setBlock(map, 0.8, Y + 6, 1.8, COLORS.BLACK);
        return Array.from(map.values());
    },

    Naruto: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 4;
        // Legs
        generateBox(map, -1.5, Y - 4, 0, -0.5, Y, 1, COLORS.ORANGE);
        generateBox(map, 0.5, Y - 4, 0, 1.5, Y, 1, COLORS.ORANGE);
        // Torso
        generateBox(map, -1.5, Y, -0.5, 1.5, Y + 4, 1.5, COLORS.ORANGE);
        generateBox(map, -1.5, Y + 2, -0.6, 1.5, Y + 4, 1.6, COLORS.BLACK); // Jacket detail
        // Arms
        generateBox(map, -2.5, Y + 2, 0, -1.5, Y + 4, 1, COLORS.ORANGE);
        generateBox(map, 1.5, Y + 2, 0, 2.5, Y + 4, 1, COLORS.ORANGE);
        // Head
        generateBox(map, -1.5, Y + 4, -1.5, 1.5, Y + 7, 1.5, COLORS.LIGHT); // Skin
        // Hair
        generateSphere(map, 0, Y + 7.5, 0, 2, COLORS.YELLOW);
        // Headband
        generateBox(map, -1.6, Y + 6.5, -1.6, 1.6, Y + 7, 1.6, COLORS.BLACK);
        setBlock(map, 0, Y + 6.5, 1.7, COLORS.WHITE); // Plate
        return Array.from(map.values());
    },

    Goku: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 4;
        // Legs
        generateBox(map, -1.5, Y - 4, 0, -0.5, Y, 1, COLORS.ORANGE);
        generateBox(map, 0.5, Y - 4, 0, 1.5, Y, 1, COLORS.ORANGE);
        // Torso
        generateBox(map, -1.5, Y, -0.5, 1.5, Y + 4, 1.5, COLORS.ORANGE);
        generateBox(map, -1.5, Y + 2, -0.6, 1.5, Y + 4, 1.6, COLORS.BLUE); // Shirt detail
        // Arms
        generateBox(map, -2.5, Y + 2, 0, -1.5, Y + 4, 1, COLORS.LIGHT); // Skin
        generateBox(map, 1.5, Y + 2, 0, 2.5, Y + 4, 1, COLORS.LIGHT);
        // Head
        generateBox(map, -1.5, Y + 4, -1.5, 1.5, Y + 7, 1.5, COLORS.LIGHT);
        // Hair
        generateSphere(map, 0, Y + 8, 0, 2.5, COLORS.BLACK);
        generateBox(map, -2, Y + 7, 0, -1, Y + 9, 1, COLORS.BLACK); // Spikes
        generateBox(map, 1, Y + 7, 0, 2, Y + 9, 1, COLORS.BLACK);
        return Array.from(map.values());
    },

    Totoro: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 1;
        // Body
        generateSphere(map, 0, Y + 4, 0, 4.5, COLORS.BLACK); // Greyish (using Black for now or Dark)
        generateSphere(map, 0, Y + 3, 2, 3.5, COLORS.WHITE); // Belly
        // Ears
        generateBox(map, -2, Y + 8, 0, -1, Y + 10, 1, COLORS.BLACK);
        generateBox(map, 1, Y + 8, 0, 2, Y + 10, 1, COLORS.BLACK);
        // Arms
        generateSphere(map, -4, Y + 4, 0, 1.5, COLORS.BLACK);
        generateSphere(map, 4, Y + 4, 0, 1.5, COLORS.BLACK);
        // Eyes
        setBlock(map, -1.5, Y + 7, 3, COLORS.WHITE);
        setBlock(map, 1.5, Y + 7, 3, COLORS.WHITE);
        setBlock(map, -1.5, Y + 7, 3.5, COLORS.BLACK);
        setBlock(map, 1.5, Y + 7, 3.5, COLORS.BLACK);
        // Nose
        setBlock(map, 0, Y + 7.5, 3.5, COLORS.BLACK);
        return Array.from(map.values());
    },

    SailorMoon: (): VoxelData[] => {
        const map = new Map<string, VoxelData>();
        const Y = CONFIG.FLOOR_Y + 4;
        // Legs
        generateBox(map, -1.5, Y - 4, 0, -0.5, Y, 1, COLORS.LIGHT); // Skin
        generateBox(map, 0.5, Y - 4, 0, 1.5, Y, 1, COLORS.LIGHT);
        setBlock(map, -1, Y - 4, 0.5, COLORS.RED); // Boots
        setBlock(map, 1, Y - 4, 0.5, COLORS.RED);
        // Skirt
        generateBox(map, -2, Y, -1.5, 2, Y + 1, 1.5, COLORS.BLUE);
        // Torso
        generateBox(map, -1.5, Y + 1, -0.5, 1.5, Y + 4, 1.5, COLORS.WHITE);
        // Bow
        generateBox(map, -0.5, Y + 2, 1.6, 0.5, Y + 3, 2, COLORS.RED);
        // Head
        generateBox(map, -1.5, Y + 4, -1.5, 1.5, Y + 7, 1.5, COLORS.LIGHT);
        // Hair
        generateSphere(map, 0, Y + 7.5, 0, 2, COLORS.GOLD);
        // Pigtails
        generateBox(map, -3, Y + 5, 0, -2, Y + 9, 1, COLORS.GOLD);
        generateBox(map, 2, Y + 5, 0, 3, Y + 9, 1, COLORS.GOLD);
        return Array.from(map.values());
    }
};
