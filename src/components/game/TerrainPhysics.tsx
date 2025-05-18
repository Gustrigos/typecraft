import { useHeightfield } from '@react-three/cannon';
import { useBlockStore } from '@lib/blocks/store';
import { useMemo } from 'react';

export default function TerrainPhysics() {
  const blocks = useBlockStore((s) => s.blocks);

  const { heights, minX, minZ } = useMemo(() => {
    // Build height grid map (top block Y value) for a 2D heightfield.
    // Assuming terrain is rectangular grid with integer x,z.
    const map = new Map<string, number>();

    blocks.forEach((b) => {
      const key = `${b.position[0]}:${b.position[2]}`;
      const topY = (map.get(key) ?? -Infinity);
      if (b.position[1] > topY) map.set(key, b.position[1]);
    });

    const xs = Array.from(new Set(blocks.map((b) => b.position[0]))).sort((a,b)=>a-b);
    const zs = Array.from(new Set(blocks.map((b) => b.position[2]))).sort((a,b)=>a-b);
    const minXVal = xs[0];
    const minZVal = zs[0];
    const grid: number[][] = [];
    zs.forEach((z) => {
      const row: number[] = [];
      xs.forEach((x) => {
        const y = map.get(`${x}:${z}`) ?? 0.5; // Default ground height
        row.push(y - 0.5); // convert block center to surface height
      });
      grid.push(row);
    });

    return { heights: grid, minX: minXVal, minZ: minZVal };
  }, [blocks]);

  useHeightfield(() => ({
    args: [heights, { elementSize: 1 }],
    position: [minX, 0, minZ],
    rotation: [-Math.PI / 2, 0, 0],
  }), undefined, [heights]);

  return null;
} 