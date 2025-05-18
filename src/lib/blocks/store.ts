import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise';

export type BlockType =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'sand'
  | 'water'
  | 'wood'
  | 'leaves'
  | 'bedrock';

export interface Block {
  id: string;
  position: [number, number, number];
  type: BlockType;
}

interface BlockState {
  blocks: Block[];
  addBlock: (position: [number, number, number], type?: BlockType) => void;
  removeBlock: (id: string) => void;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Generates a lightly rolling terrain using 2-D simplex noise. Heights range
// from 1-5 blocks so we get gentle hills / small "mountains".
function generateTerrain(size: number): Block[] {
  const noise2D = createNoise2D();
  const terrain: Block[] = [];
  const half = size / 2;

  const SEA_LEVEL = 3; // water surface at y index 3 (y + 0.5 in world coords)

  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      // Height noise value in [-1, 1]
      const n = noise2D(x / 25, z / 25);
      // Map to an integer height between 1 and 6 (gentle hills)
      const height = Math.round(((n + 1) / 2) * 5) + 1;

      // Build ground column
      for (let y = 0; y < height; y++) {
        const isSurface = y === height - 1;
        let type: BlockType;

        if (y === 0) {
          type = 'bedrock';
        } else if (!isSurface && y < height - 3) {
          type = 'stone';
        } else if (!isSurface) {
          type = 'dirt';
        } else {
          // Surface block
          if (height <= 2) type = 'sand';
          else type = 'grass';
        }

        terrain.push({
          id: generateId(),
          position: [x, y + 0.5, z],
          type,
        });
      }

      // Fill water up to sea level when terrain is lower
      if (height < SEA_LEVEL) {
        for (let y = height; y < SEA_LEVEL; y++) {
          terrain.push({
            id: generateId(),
            position: [x, y + 0.5, z],
            type: 'water',
          });
        }
      }

      // Attempt to place a simple tree on some grass blocks
      const isGrassSurface = height > 2 && terrain[terrain.length - 1].type === 'grass';
      if (isGrassSurface && Math.random() < 0.04) {
        const trunkHeight = 3 + Math.floor(Math.random() * 2); // 3-4 blocks tall
        const surfaceY = height - 1;

        // Trunk
        for (let t = 1; t <= trunkHeight; t++) {
          terrain.push({
            id: generateId(),
            position: [x, surfaceY + t + 0.5, z],
            type: 'wood',
          });
        }

        // Leaves (simple 3x3 cube on top layer, 1 layer thickness)
        const leavesY = surfaceY + trunkHeight;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            // Skip centre where trunk exists & make rough sphere
            if (Math.abs(dx) + Math.abs(dz) > 3) continue;
            if (dx === 0 && dz === 0) continue;
            terrain.push({
              id: generateId(),
              position: [x + dx, leavesY + 0.5, z + dz],
              type: 'leaves',
            });
          }
        }
      }
    }
  }

  return terrain;
}

export const useBlockStore = create<BlockState>((set) => ({
  blocks: generateTerrain(50),
  addBlock: (position: [number, number, number], type = 'dirt') =>
    set((state) => ({
      blocks: [...state.blocks, { id: generateId(), position, type }],
    })),
  removeBlock: (id: string) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
    })),
  selectedId: null,
  setSelected: (id: string | null) => set(() => ({ selectedId: id })),
})); 