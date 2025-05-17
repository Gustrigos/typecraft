'use client';

import React from 'react';
import { useBlockStore } from '@lib/blocks/store';
import { useBox } from '@react-three/cannon';

function BlockBody({ position }: { position: [number, number, number] }) {
  useBox(() => ({
    args: [1, 1, 1],
    mass: 0,
    position,
  }), undefined, [position.toString()]);
  return null;
}

export default function PhysicsBlocks() {
  // Exclude ground layer (y === 0.5) from physics bodies – the infinite plane already handles collisions.
  const blocks = useBlockStore((s) => s.blocks);
  const nonGroundBlocks = blocks.filter((b) => b.position[1] !== 0.5);

  return (
    <>
      {nonGroundBlocks.map((b) => (
        <BlockBody key={b.id} position={b.position} />
      ))}
    </>
  );
} 