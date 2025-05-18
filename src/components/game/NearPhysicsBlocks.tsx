'use client';

import { useBlockStore } from '@lib/blocks/store';
import { usePlayerStore } from '@store/playerStore';
import { useCompoundBody } from '@react-three/cannon';
import { useMemo } from 'react';

export default function NearPhysicsBlocks({ radius = 6 }: { radius?: number }) {
  const blocks = useBlockStore((s) => s.blocks);
  const playerPos = usePlayerStore((s) => s.position);

  // Build a single compound body for nearby blocks
  const shapes = useMemo(() => {
    const [px, , pz] = playerPos;
    const r2 = radius * radius;
    // Partition nearby blocks into leaves and others
    const nearby = blocks.filter((b) => {
      const dx = b.position[0] - px;
      const dz = b.position[2] - pz;
      return dx * dx + dz * dz <= r2;
    });
    const leafBlocks = nearby.filter((b) => b.type === 'leaves');
    const otherBlocks = nearby.filter((b) => b.type !== 'leaves');
    const result: { type: 'Box'; args: [number, number, number]; position: [number, number, number] }[] = [];
    // individual shapes for non-leaf blocks
    otherBlocks.forEach((b) => {
      result.push({ type: 'Box', args: [1, 1, 1], position: b.position });
    });
    // single aggregated shape for all leaves
    if (leafBlocks.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      leafBlocks.forEach((b) => {
        minX = Math.min(minX, b.position[0]);
        maxX = Math.max(maxX, b.position[0]);
        minY = Math.min(minY, b.position[1]);
        maxY = Math.max(maxY, b.position[1]);
        minZ = Math.min(minZ, b.position[2]);
        maxZ = Math.max(maxZ, b.position[2]);
      });
      const sizeX = maxX - minX + 1;
      const sizeY = maxY - minY + 1;
      const sizeZ = maxZ - minZ + 1;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      result.push({ type: 'Box', args: [sizeX, sizeY, sizeZ], position: [centerX, centerY, centerZ] });
    }
    return result;
  }, [blocks, playerPos, radius]);

  useCompoundBody(
    () => ({ mass: 0, shapes }),
    undefined,
    [shapes],
  );

  return null;
} 