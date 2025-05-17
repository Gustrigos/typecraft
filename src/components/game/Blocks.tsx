'use client';

import React, { useRef, useMemo } from 'react';
import { useBlockStore, BlockType } from '@lib/blocks/store';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Raycaster, Vector2, InstancedMesh } from 'three';
import { Instances, Instance, Box, Edges } from '@react-three/drei';

export default function Blocks() {
  const blocks = useBlockStore((s) => s.blocks);
  const setSelected = useBlockStore((s) => s.setSelected);
  const addBlock = useBlockStore((s) => s.addBlock);
  const removeBlock = useBlockStore((s) => s.removeBlock);
  const groupRef = useRef<Group>(null!);
  const raycaster = useRef(new Raycaster());
  const frameCount = useRef(0);
  const lastSelected = useRef<string | null>(null);
  const { camera } = useThree();

  useFrame(() => {
    // Throttle raycasting to every other frame to save some CPU
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;

    if (!groupRef.current) return;
    raycaster.current.setFromCamera(new Vector2(0, 0), camera); // center of screen
    const intersects = raycaster.current.intersectObjects(groupRef.current.children, true);
    let nextSelected: string | null = null;

    if (intersects.length > 0) {
      const inter = intersects[0] as any;
      const hitObject = inter.object as any;

      if ('instanceId' in inter && inter.instanceId !== undefined && hitObject.isInstancedMesh) {
        const idx = inter.instanceId as number;

        if (hitObject === groundMeshRef.current) {
          nextSelected = groundBlocks[idx]?.id ?? null;
        } else if (hitObject === grassMeshRef.current) {
          nextSelected = grassBlocks[idx]?.id ?? null;
        } else if (hitObject === dirtMeshRef.current) {
          nextSelected = dirtBlocks[idx]?.id ?? null;
        } else if (hitObject === stoneMeshRef.current) {
          nextSelected = stoneBlocks[idx]?.id ?? null;
        } else if (hitObject === sandMeshRef.current) {
          nextSelected = sandBlocks[idx]?.id ?? null;
        }
      } else {
        // Regular mesh block
        nextSelected = (hitObject.userData as { id?: string }).id ?? null;
      }
    }

    // Only update global state when the selected block actually changes
    if (nextSelected !== lastSelected.current) {
      lastSelected.current = nextSelected;
      setSelected(nextSelected);
    }
  });

  // Separate ground blocks which are static and always grass
  const groundBlocks = blocks.filter((b) => b.position[1] === 0.5 && b.type === 'grass');

  // Split remaining blocks by type for instanced rendering
  const groupedByType = useMemo(() => {
    const groups: Record<BlockType, { id: string; position: [number, number, number]; type: BlockType }[]> = {
      grass: [],
      dirt: [],
      stone: [],
      sand: [],
    } as any;
    blocks.forEach((b) => {
      if (!(b.position[1] === 0.5 && b.type === 'grass')) {
        groups[b.type].push(b);
      }
    });
    return groups;
  }, [blocks]);

  const { grass: grassBlocks, dirt: dirtBlocks, stone: stoneBlocks, sand: sandBlocks } = groupedByType;

  // Keep refs to each instanced mesh so we can map intersection → block id
  const groundMeshRef = useRef<InstancedMesh>(null!);
  const grassMeshRef = useRef<InstancedMesh>(null!);
  const dirtMeshRef = useRef<InstancedMesh>(null!);
  const stoneMeshRef = useRef<InstancedMesh>(null!);
  const sandMeshRef = useRef<InstancedMesh>(null!);

  // Helper to render a generic instanced group for a specific set of blocks & materials
  const renderInstances = (
    refs: React.MutableRefObject<InstancedMesh>,
    blocksArr: { id: string; position: [number, number, number]; type: BlockType }[],
    materials: string[],
    keyPrefix: string,
  ) =>
    blocksArr.length > 0 && (
      <Instances key={`${keyPrefix}-${blocksArr.length}`} ref={refs} limit={blocksArr.length} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        {materials.map((c, i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} color={c} />
        ))}
        {blocksArr.map((b) => (
          <Instance
            key={b.id}
            position={b.position}
            userData={{ id: b.id }}
            onPointerDown={(e) => {
              e.stopPropagation();
              const id = b.id;

              if (e.nativeEvent.button === 0) {
                removeBlock(id);
                return;
              }

              if (e.nativeEvent.button === 2) {
                const faceNormal = e.face?.normal ?? { x: 0, y: 0, z: 0 };
                const newPos: [number, number, number] = [
                  b.position[0] + faceNormal.x,
                  b.position[1] + faceNormal.y,
                  b.position[2] + faceNormal.z,
                ];
                addBlock(newPos);
              }
            }}
          />
        ))}
      </Instances>
    );

  const selectedId = useBlockStore((s) => s.selectedId);
  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedId), [blocks, selectedId]);

  return (
    <group ref={groupRef}>
      {/* Static ground layer rendered using a single instanced mesh */}
      {groundBlocks.length > 0 && (
        <Instances key={`ground-${groundBlocks.length}`} ref={groundMeshRef} limit={groundBlocks.length} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          {/* Per-face multi-material for grass (top green, others brown) */}
          <meshStandardMaterial attach='material-0' color={'#8B4513'} />
          <meshStandardMaterial attach='material-1' color={'#8B4513'} />
          <meshStandardMaterial attach='material-2' color={'#228B22'} />
          <meshStandardMaterial attach='material-3' color={'#8B4513'} />
          <meshStandardMaterial attach='material-4' color={'#8B4513'} />
          <meshStandardMaterial attach='material-5' color={'#8B4513'} />
          {groundBlocks.map((b) => (
            <Instance
              key={b.id}
              position={b.position}
              userData={{ id: b.id }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const id = b.id;

                // Left click -> remove
                if (e.nativeEvent.button === 0) {
                  removeBlock(id);
                  return;
                }

                // Right click -> add adjacent block using face normal
                if (e.nativeEvent.button === 2) {
                  const faceNormal = e.face?.normal ?? { x: 0, y: 0, z: 0 };
                  const newPos: [number, number, number] = [
                    b.position[0] + faceNormal.x,
                    b.position[1] + faceNormal.y,
                    b.position[2] + faceNormal.z,
                  ];
                  addBlock(newPos);
                }
              }}
            />
          ))}
        </Instances>
      )}

      {/* Instanced meshes for non-ground blocks */}
      {renderInstances(grassMeshRef, grassBlocks, ['#8B4513', '#8B4513', '#3CB043', '#8B4513', '#8B4513', '#8B4513'], 'grass')}
      {renderInstances(dirtMeshRef, dirtBlocks, Array(6).fill('#A0522D'), 'dirt')}
      {renderInstances(stoneMeshRef, stoneBlocks, Array(6).fill('#808080'), 'stone')}
      {renderInstances(sandMeshRef, sandBlocks, Array(6).fill('#F4E2B5'), 'sand')}

      {/* Highlight selected block with an overlay wireframe */}
      {selectedBlock && (
        <Box args={[1, 1, 1]} position={selectedBlock.position} raycast={() => null}>
          <meshBasicMaterial attach='material' visible={false} />
          <Edges scale={1.05} color='yellow' />
        </Box>
      )}
    </group>
  );
} 