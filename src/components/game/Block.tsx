"use client";

import React, { useMemo } from "react";
import { Edges } from "@react-three/drei";
import * as THREE from "three";
import { useBlockStore } from "@lib/blocks/store";
import { useInventoryStore } from "@lib/inventory/store";

type BlockType = "grass" | "dirt" | "stone" | "sand" | "water" | "wood" | "leaves" | "bedrock";

interface BlockProps {
  id: string;
  position: [number, number, number];
  type: BlockType;
}

const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

const dirtBrown = "#A0522D";
const grassGreen = "#3CB043";
const grey = "#808080";
const sandYellow = "#F4E2B5";
const waterBlue = "#3DAEF5";
const woodBrown = "#8B5A2B";
const leavesGreen = "#3CB043";
const bedrockGrey = "#4B4B4B";

function createMaterials(colours: string[]) {
  return colours.map((c) => new THREE.MeshStandardMaterial({ color: c }));
}

const MATERIAL_MAP: Record<BlockType, THREE.Material[]> = {
  grass: createMaterials([dirtBrown, dirtBrown, grassGreen, dirtBrown, dirtBrown, dirtBrown]),
  dirt: createMaterials(Array(6).fill(dirtBrown)),
  stone: createMaterials(Array(6).fill(grey)),
  sand: createMaterials(Array(6).fill(sandYellow)),
  water: createMaterials(Array(6).fill(waterBlue)),
  wood: createMaterials(Array(6).fill(woodBrown)),
  leaves: createMaterials(Array(6).fill(leavesGreen)),
  bedrock: createMaterials(Array(6).fill(bedrockGrey)),
};

/**
 * Renders a single interactive block using shared geometry and materials to minimise draw calls.
 */
export default function Block({ id, position, type }: BlockProps) {
  const removeBlock = useBlockStore((s) => s.removeBlock);
  const addBlock = useBlockStore((s) => s.addBlock);
  const selectedId = useBlockStore((s) => s.selectedId);
  const selectedType = useInventoryStore((s) => s.selectedType);
  const consumeInvItem = useInventoryStore((s) => s.consumeItem);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
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
      if (consumeInvItem(selectedType)) {
        addBlock(newPos, selectedType);
      }
    }
  };

  const materials = useMemo(() => MATERIAL_MAP[type], [type]);

  const isGround = position[1] <= 0.5 + 1e-6;

  return (
    <mesh
      geometry={BOX_GEOMETRY}
      material={materials as unknown as THREE.Material}
      position={position}
      castShadow={!isGround}
      receiveShadow
      userData={{ id }}
      onPointerDown={handlePointerDown}
    >
      {selectedId === id && <Edges scale={1.05} color="yellow" />}
    </mesh>
  );
} 