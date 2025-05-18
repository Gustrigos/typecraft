'use client';

import { useBlockStore } from '@lib/blocks/store';
import { usePlayerStore } from '@store/playerStore';
import { useBox } from '@react-three/cannon';
import { useMemo } from 'react';

function BlockBody({ position }: { position: [number, number, number] }) {
  useBox(() => ({ args: [1, 1, 1], mass: 0, position }), undefined, [position.toString()]);
  return null;
}

export default function NearPhysicsBlocks({ radius = 6 }: { radius?: number }) {
  const blocks = useBlockStore((s) => s.blocks);
  const playerPos = usePlayerStore((s) => s.position);

  const nearby = useMemo(() => {
    const [px, py, pz] = playerPos;
    const r2 = radius * radius;
    return blocks.filter((b) => {
      const dx = b.position[0] - px;
      const dz = b.position[2] - pz;
      return dx * dx + dz * dz <= r2;
    });
  }, [blocks, playerPos, radius]);

  return (
    <>
      {nearby.map((b) => (
        <BlockBody key={b.id} position={b.position} />
      ))}
    </>
  );
} 