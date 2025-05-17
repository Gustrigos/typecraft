import { create } from 'zustand';
import { createNoise2D } from 'simplex-noise';

export type BlockType = 'grass' | 'dirt' | 'stone' | 'sand';

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

  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      // Noise value in [-1, 1]
      const n = noise2D(x / 25, z / 25);
      // Map to an integer height between 1 and 5
      const height = Math.round(((n + 1) / 2) * 4) + 1;

      for (let y = 0; y < height; y++) {
        const isSurface = y === height - 1;
        let type: BlockType;

        if (isSurface) {
          // Very low elevations become sand, otherwise grass
          type = height <= 2 ? 'sand' : 'grass';
        } else {
          // Sub-surface dirt for now (could become stone below certain depth)
          type = 'dirt';
        }

        terrain.push({
          id: generateId(),
          position: [x, y + 0.5, z],
          type,
        });
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