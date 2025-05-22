'use client';

import { useBlockStore } from '@lib/blocks/store';
import { usePlayerStore } from '@store/playerStore';
import { useCompoundBody } from '@react-three/cannon';
import { useMemo } from 'react';

const CHUNK_SIZE = 16; // Keep in sync with block store

export default function NearPhysicsBlocks({ radius = 6 }: { radius?: number }) {
  const blocks = useBlockStore((s) => s.blocks);
  const playerPos = usePlayerStore((s) => s.position);

  const chunkX = Math.floor(playerPos[0] / CHUNK_SIZE);
  const chunkZ = Math.floor(playerPos[2] / CHUNK_SIZE);

  // coarse grid quantisation (4-block cells) so we update shapes when player
  // has moved a noticeable distance even within the same chunk
  const gridX = Math.floor(playerPos[0] / 4);
  const gridZ = Math.floor(playerPos[2] / 4);

  // Build a single compound body for nearby blocks
  const shapes = useMemo(() => {
    const [px, , pz] = playerPos;

    // No-op: chunk quantisation is handled via the dependency array

    const r2 = radius * radius;
    // Partition nearby blocks into leaves and others
    const nearby = blocks.filter((b) => {
      const dx = b.position[0] - px;
      const dz = b.position[2] - pz;
      return dx * dx + dz * dz <= r2;
    });
    // Exclude water and leaves from physics so the player can move through foliage and fluids
    const otherBlocks = nearby.filter((b) => b.type !== 'leaves' && b.type !== 'water');
    const result: { type: 'Box'; args: [number, number, number]; position: [number, number, number] }[] = [];
    // individual shapes for non-leaf blocks
    otherBlocks.forEach((b) => {
      result.push({ type: 'Box', args: [1, 1, 1], position: b.position });
    });
    // leaves intentionally skipped to remain non-solid

    return result;
  }, [blocks, radius, chunkX, chunkZ, gridX, gridZ]);

  useCompoundBody(
    () => ({ mass: 0, shapes }),
    undefined,
    [shapes],
  );

  return null;
} 