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
  /** Map of loaded chunk keys "cx:cz" */
  loadedChunks: Record<string, true>;
  /** Generate & add the given chunk if not already loaded */
  loadChunk: (cx: number, cz: number) => void;
  /** Remove all blocks belonging to the given chunk */
  unloadChunk: (cx: number, cz: number) => void;
  /** Utility: ensure radius of chunks around (cx,cz) are loaded, and far ones are pruned */
  ensureChunks: (cx: number, cz: number, radius: number) => void;
  addBlock: (position: [number, number, number], type?: BlockType) => void;
  removeBlock: (id: string) => void;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
}

// Constants for chunk system
const CHUNK_SIZE = 16; // 16x16 columns like classic Minecraft
const SEA_LEVEL = 3; // water surface at y index 3 (y + 0.5 in world coords)

const noise2D = createNoise2D();

function chunkKey(cx: number, cz: number) {
  return `${cx}:${cz}`;
}

function blockId(x: number, y: number, z: number) {
  return `${x},${y},${z}`;
}

function generateChunk(cx: number, cz: number): Block[] {
  const blocks: Block[] = [];
  const startX = cx * CHUNK_SIZE;
  const startZ = cz * CHUNK_SIZE;

  // Track ids we have already added for this chunk to prevent duplicates (e.g. overlapping tree foliage)
  const added = new Set<string>();

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const x = startX + lx;
      const z = startZ + lz;

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

        const bid = blockId(x, y, z);
        if (!added.has(bid)) {
          blocks.push({ id: bid, position: [x, y + 0.5, z], type });
          added.add(bid);
        }
      }

      // Fill water up to sea level when terrain is lower
      if (height < SEA_LEVEL) {
        for (let y = height; y < SEA_LEVEL; y++) {
          const bid = blockId(x, y, z);
          if (!added.has(bid)) {
            blocks.push({ id: bid, position: [x, y + 0.5, z], type: 'water' });
            added.add(bid);
          }
        }
      }

      // Attempt to place a simple tree on some grass blocks
      const isGrassSurface = height > 2 && blocks[blocks.length - 1].type === 'grass';
      if (isGrassSurface && Math.random() < 0.04) {
        const trunkHeight = 3 + Math.floor(Math.random() * 2); // 3-4 blocks tall
        const surfaceY = height - 1;

        // Trunk
        for (let t = 1; t <= trunkHeight; t++) {
          const bid = blockId(x, surfaceY + t, z);
          if (!added.has(bid)) {
            blocks.push({ id: bid, position: [x, surfaceY + t + 0.5, z], type: 'wood' });
            added.add(bid);
          }
        }

        // Leaves (simple sphere-ish crown)
        const leavesY = surfaceY + trunkHeight;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) + Math.abs(dz) > 3) continue;
            if (dx === 0 && dz === 0) continue;
            const bid = blockId(x + dx, leavesY, z + dz);
            if (!added.has(bid)) {
              blocks.push({ id: bid, position: [x + dx, leavesY + 0.5, z + dz], type: 'leaves' });
              added.add(bid);
            }
          }
        }
      }
    }
  }

  return blocks;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export const useBlockStore = create<BlockState>((set, get) => {
  function loadChunkInternal(cx: number, cz: number) {
    const key = chunkKey(cx, cz);
    if (get().loadedChunks[key]) return; // already loaded

    const newBlocks = generateChunk(cx, cz);
    set((state) => {
      const existing = new Set(state.blocks.map((b) => b.id));
      const filtered = newBlocks.filter((b) => !existing.has(b.id));
      return {
        blocks: [...state.blocks, ...filtered],
        loadedChunks: { ...state.loadedChunks, [key]: true },
      };
    });
  }

  function unloadChunkInternal(cx: number, cz: number) {
    const key = chunkKey(cx, cz);
    if (!get().loadedChunks[key]) return;

    set((state) => ({
      blocks: state.blocks.filter((b) => {
        const bx = Math.floor(b.position[0]);
        const bz = Math.floor(b.position[2]);
        return !(Math.floor(bx / CHUNK_SIZE) === cx && Math.floor(bz / CHUNK_SIZE) === cz);
      }),
      loadedChunks: Object.fromEntries(Object.entries(state.loadedChunks).filter(([k]) => k !== key)),
    }));
  }

  function ensureChunks(cx: number, cz: number, radius: number) {
    const needed: Record<string, true> = {};
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        needed[chunkKey(cx + dx, cz + dz)] = true;
      }
    }
    const current = get().loadedChunks;
    // Load missing
    Object.keys(needed).forEach((k) => {
      if (!current[k]) {
        const [xStr, zStr] = k.split(':');
        loadChunkInternal(parseInt(xStr), parseInt(zStr));
      }
    });
    // Unload extras
    Object.keys(current).forEach((k) => {
      if (!needed[k]) {
        const [xStr, zStr] = k.split(':');
        unloadChunkInternal(parseInt(xStr), parseInt(zStr));
      }
    });
  }

  // Initialise with origin chunk so spawn area exists
  const initialBlocks = generateChunk(0, 0);

  return {
    blocks: initialBlocks,
    loadedChunks: { [chunkKey(0, 0)]: true },
    loadChunk: loadChunkInternal,
    unloadChunk: unloadChunkInternal,
    ensureChunks,
    addBlock: (position: [number, number, number], type: BlockType = 'dirt') =>
      set((state) => ({
        blocks: [...state.blocks, { id: generateId(), position, type }],
      })),
    removeBlock: (id: string) =>
      set((state) => ({
        blocks: state.blocks.filter((b) => b.id !== id),
      })),
    selectedId: null,
    setSelected: (id: string | null) => set(() => ({ selectedId: id })),
  } as BlockState;
}); 