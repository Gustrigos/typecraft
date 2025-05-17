'use client';

import React, { useMemo } from 'react';
import { Box, Edges } from '@react-three/drei';
import { useBlockStore } from '@lib/blocks/store';

interface BlockProps {
  id: string;
  position: [number, number, number];
  type: 'grass' | 'dirt' | 'stone' | 'sand';
}

export default function Block({ id, position, type }: BlockProps) {
  const removeBlock = useBlockStore((s) => s.removeBlock);
  const addBlock = useBlockStore((s) => s.addBlock);
  const selectedId = useBlockStore((s) => s.selectedId);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    // Left click (button === 0) -> remove block
    // Right click (button === 2) -> add block adjacent
    if (e.nativeEvent.button === 0) {
      removeBlock(id);
      return;
    }

    if (e.nativeEvent.button === 2) {
      const faceNormal = e.face?.normal ?? { x: 0, y: 0, z: 0 };
      const newPos: [number, number, number] = [
        position[0] + faceNormal.x,
        position[1] + faceNormal.y,
        position[2] + faceNormal.z,
      ];
      addBlock(newPos);
    }
  };

  // Generate per-face colors: [right, left, top, bottom, front, back]
  const materials = useMemo(() => {
    const dirtBrown = '#A0522D';
    const grassGreen = '#3CB043';
    const grey = '#808080';
    const sandYellow = '#F4E2B5';

    // Add a bit more contrast to grass block: top vibrant green, sides greenish-brown
    const grass: string[] = [dirtBrown, dirtBrown, grassGreen, dirtBrown, dirtBrown, dirtBrown];
    const dirt: string[] = Array(6).fill(dirtBrown);
    const stone: string[] = Array(6).fill(grey);
    const sand: string[] = Array(6).fill(sandYellow);

    switch (type) {
      case 'grass':
        return grass;
      case 'stone':
        return stone;
      case 'sand':
        return sand;
      case 'dirt':
      default:
        return dirt;
    }
  }, [type]);

  const isGround = position[1] <= 0.5 + 1e-6;

  return (
    <Box
      args={[1, 1, 1]}
      position={position}
      castShadow={!isGround}
      receiveShadow
      userData={{ id }}
      onPointerDown={handlePointerDown}
    >
      {materials.map((c: string, i: number) => (
        <meshStandardMaterial key={i} attach={`material-${i}`} color={c} />
      ))}
      {selectedId === id && <Edges scale={1.05} color="yellow" />}
    </Box>
  );
} 