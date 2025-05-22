'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@store/playerStore';
import { useBlockStore } from '@lib/blocks/store';

// Radius (in chunk units) to keep around the player. 2 → 5×5 chunk square.
const VIEW_RADIUS = 2;
const CHUNK_SIZE = 16;

function worldToChunk(v: number) {
  return Math.floor(v / CHUNK_SIZE);
}

export default function ChunkManager() {
  const position = usePlayerStore((s) => s.position);
  const ensureChunks = useBlockStore((s) => s.ensureChunks);
  const lastChunk = useRef<[number, number]>([Infinity, Infinity]);

  useEffect(() => {
    const [x, , z] = position;
    const cx = worldToChunk(x);
    const cz = worldToChunk(z);

    // Only react when player crosses into a new chunk
    if (cx !== lastChunk.current[0] || cz !== lastChunk.current[1]) {
      lastChunk.current = [cx, cz];
      ensureChunks(cx, cz, VIEW_RADIUS);
    }
  }, [position, ensureChunks]);

  return null;
} 