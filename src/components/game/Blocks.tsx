'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useBlockStore as useBlockStoreImport, BlockType } from '@lib/blocks/store';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Raycaster, Vector2, InstancedMesh, Texture } from 'three';
import { Instances, Instance, Box, Edges } from '@react-three/drei';
import { useBlockTextures } from '@lib/useBlockTextures';
import { useInventoryStore } from '@lib/inventory/store';
import { usePlayerStore } from '@store/playerStore';

export default function Blocks() {
  const blocks = useBlockStoreImport((s) => s.blocks);
  const setSelected = useBlockStoreImport((s) => s.setSelected);
  const addBlock = useBlockStoreImport((s) => s.addBlock);
  const removeBlock = useBlockStoreImport((s) => s.removeBlock);
  const textures = useBlockTextures();
  const selectedType = useInventoryStore((s) => s.selectedType);
  const consumeInvItem = useInventoryStore((s) => s.consumeItem);
  const groupRef = useRef<Group>(null!);
  const raycaster = useRef(new Raycaster());
  const frameCount = useRef(0);
  const lastSelected = useRef<string | null>(null);
  const { camera } = useThree();

  const CHUNK_SIZE = 16; // keep in sync with block store

  // Raycast every 4 frames (~15 fps @60hz) instead of 2
  const RAYCAST_INTERVAL = 4;

  useFrame(() => {
    // Throttle raycasting
    frameCount.current++;
    if (frameCount.current % RAYCAST_INTERVAL !== 0) return;

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
        } else if (hitObject === waterMeshRef.current) {
          nextSelected = waterBlocks[idx]?.id ?? null;
        } else if (hitObject === woodMeshRef.current) {
          nextSelected = woodBlocks[idx]?.id ?? null;
        } else if (hitObject === leafMeshRef.current) {
          nextSelected = leafBlocks[idx]?.id ?? null;
        } else if (hitObject === bedrockMeshRef.current) {
          nextSelected = bedrockBlocks[idx]?.id ?? null;
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

  // Animate water texture for flow effect
  useFrame((_, delta) => {
    textures.water.offset.x += delta * 0.1;
    textures.water.offset.y += delta * 0.1;
  });

  // Water flow simulation: flow laterally and fall as waterfalls every 1.5s
  const waterSimTimer = useRef(0);
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);
  // keep playerPos updated cheaply without rerender subscription
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((state) => {
      playerPosRef.current = state.position;
    });
    return () => unsub();
  }, []);

  useFrame((_, delta) => {
    waterSimTimer.current += delta;
    if (waterSimTimer.current < 1.5) return; // run every 1.5s
    waterSimTimer.current = 0;
    const { blocks: allBlocks, addBlock, removeBlock, loadedChunks } = useBlockStoreImport.getState();
    const isInsideLoaded = (x: number, z: number) =>
      Boolean(loadedChunks[`${Math.floor(x / CHUNK_SIZE)}:${Math.floor(z / CHUNK_SIZE)}`]);
    const occupied = new Set(allBlocks.map((b) => b.position.join(',')));
    const [px, , pz] = playerPosRef.current;
    const VIEW_R2 = 400; // Only simulate water within 20 blocks radius of player
    allBlocks.forEach((b) => {
      if (b.type === 'water') {
        const [x, y, z] = b.position;
        const dx = x - px;
        const dz = z - pz;
        if (dx * dx + dz * dz > VIEW_R2) return; // skip far water
        const belowKey = [x, y - 1, z].join(',');
        if (!occupied.has(belowKey) && isInsideLoaded(x, z)) {
          removeBlock(b.id);
          addBlock([x, y - 1, z], 'water');
        } else {
          // pick one random lateral direction per tick
          const dirs = [
            [x + 1, y, z],
            [x - 1, y, z],
            [x, y, z + 1],
            [x, y, z - 1],
          ];
          const next = dirs[Math.floor(Math.random() * dirs.length)];
          const key = next.join(',');
          if (!occupied.has(key) && isInsideLoaded(next[0], next[2])) {
            addBlock(next as [number, number, number], 'water');
          }
        }
      }
    });
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
      water: [],
      wood: [],
      leaves: [],
      bedrock: [],
    } as any;
    blocks.forEach((b) => {
      if (!(b.position[1] === 0.5 && b.type === 'grass')) {
        groups[b.type].push(b);
      }
    });
    return groups;
  }, [blocks]);

  const {
    grass: grassBlocks,
    dirt: dirtBlocks,
    stone: stoneBlocks,
    sand: sandBlocks,
    water: waterBlocks,
    wood: woodBlocks,
    leaves: leafBlocks,
    bedrock: bedrockBlocks,
  } = groupedByType;

  // Cluster contiguous water blocks to remove internal borders
  const waterClusters = useMemo(() => {
    const visited = new Set<string>();
    const posMap = new Map<string, [number, number, number]>();
    waterBlocks.forEach((b) => posMap.set(b.position.join(','), b.position));
    const clusters: { sizeX: number; sizeY: number; sizeZ: number; centerX: number; centerY: number; centerZ: number }[] = [];
    waterBlocks.forEach((b) => {
      const startKey = b.position.join(',');
      if (visited.has(startKey)) return;
      const queue = [startKey];
      visited.add(startKey);
      let [minX, minY, minZ] = b.position;
      let [maxX, maxY, maxZ] = b.position;
      while (queue.length) {
        const key = queue.shift()!;
        const [x, y, z] = posMap.get(key)!;
        for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
          const nk = [x + dx, y + dy, z + dz].join(',');
          if (posMap.has(nk) && !visited.has(nk)) {
            visited.add(nk);
            queue.push(nk);
            const [nx, ny, nz] = posMap.get(nk)!;
            minX = Math.min(minX, nx);
            maxX = Math.max(maxX, nx);
            minY = Math.min(minY, ny);
            maxY = Math.max(maxY, ny);
            minZ = Math.min(minZ, nz);
            maxZ = Math.max(maxZ, nz);
          }
        }
      }
      clusters.push({
        sizeX: maxX - minX + 1,
        sizeY: maxY - minY + 1,
        sizeZ: maxZ - minZ + 1,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
        centerZ: (minZ + maxZ) / 2,
      });
    });
    return clusters;
  }, [waterBlocks]);

  // Keep refs to each instanced mesh so we can map intersection → block id
  const groundMeshRef = useRef<InstancedMesh>(null!);
  const grassMeshRef = useRef<InstancedMesh>(null!);
  const dirtMeshRef = useRef<InstancedMesh>(null!);
  const stoneMeshRef = useRef<InstancedMesh>(null!);
  const sandMeshRef = useRef<InstancedMesh>(null!);
  const waterMeshRef = useRef<InstancedMesh>(null!);
  const woodMeshRef = useRef<InstancedMesh>(null!);
  const leafMeshRef = useRef<InstancedMesh>(null!);
  const bedrockMeshRef = useRef<InstancedMesh>(null!);

  // Helper to render a generic instanced group for a specific set of blocks & materials
  const renderInstances = (
    refs: React.MutableRefObject<InstancedMesh>,
    blocksArr: { id: string; position: [number, number, number]; type: BlockType }[],
    materials: Texture[],
    keyPrefix: string,
  ) =>
    blocksArr.length > 0 && (
      <Instances key={`${keyPrefix}-${blocksArr.length}`} ref={refs} limit={blocksArr.length} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        {materials.map((c, i: number) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            map={c}
            transparent={keyPrefix === 'water'}
            opacity={keyPrefix === 'water' ? 0.6 : 1}
          />
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
                if (consumeInvItem(selectedType)) {
                  addBlock(newPos, selectedType);
                }
              }
            }}
          />
        ))}
      </Instances>
    );

  const selectedId = useBlockStoreImport((s) => s.selectedId);
  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedId), [blocks, selectedId]);

  return (
    <group ref={groupRef}>
      {/* Static ground layer rendered using a single instanced mesh */}
      {groundBlocks.length > 0 && (
        <Instances key={`ground-${groundBlocks.length}`} ref={groundMeshRef} limit={groundBlocks.length} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          {/* Per-face multi-material for grass using CanvasTextures */}
          <meshStandardMaterial attach='material-0' map={textures.grassSide} />
          <meshStandardMaterial attach='material-1' map={textures.grassSide} />
          <meshStandardMaterial attach='material-2' map={textures.grassTop} />
          <meshStandardMaterial attach='material-3' map={textures.grassSide} />
          <meshStandardMaterial attach='material-4' map={textures.grassSide} />
          <meshStandardMaterial attach='material-5' map={textures.grassSide} />
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
                  if (consumeInvItem(selectedType)) {
                    addBlock(newPos, selectedType);
                  }
                }
              }}
            />
          ))}
        </Instances>
      )}

      {/* Instanced meshes for non-ground blocks */}
      {renderInstances(
        grassMeshRef,
        grassBlocks,
        [
          textures.grassSide,
          textures.grassSide,
          textures.grassTop,
          textures.grassSide,
          textures.grassSide,
          textures.grassSide,
        ],
        'grass',
      )}
      {renderInstances(dirtMeshRef, dirtBlocks, Array(6).fill(textures.dirt), 'dirt')}
      {renderInstances(stoneMeshRef, stoneBlocks, Array(6).fill(textures.stone), 'stone')}
      {renderInstances(sandMeshRef, sandBlocks, Array(6).fill(textures.sand), 'sand')}
      {waterClusters.map((c, i) => {
        // shrink cluster slightly to prevent z-fighting with neighboring blocks
        const eps = 0.02;
        const sx = Math.max(c.sizeX - eps, 0);
        const sy = Math.max(c.sizeY - eps, 0);
        const sz = Math.max(c.sizeZ - eps, 0);
        return (
          <Box
            key={`water-${i}`}
            args={[sx, sy, sz]}
            position={[c.centerX, c.centerY, c.centerZ]}
            raycast={() => null}
          >
            <meshStandardMaterial
              attach="material"
              map={textures.water}
              transparent
              opacity={0.6}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={1}
            />
          </Box>
        );
      })}
      {renderInstances(woodMeshRef, woodBlocks, Array(6).fill(textures.wood), 'wood')}
      {renderInstances(leafMeshRef, leafBlocks, Array(6).fill(textures.leaves), 'leaves')}
      {renderInstances(bedrockMeshRef, bedrockBlocks, Array(6).fill(textures.bedrock), 'bedrock')}

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