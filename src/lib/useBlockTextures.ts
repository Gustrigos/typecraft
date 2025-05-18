import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Provides procedural CanvasTextures for block faces: grassTop, grassSide, dirt, stone, sand.
 */
export function useBlockTextures() {
  return useMemo(() => {
    const size = 16;

    function shadeColor(color: string, percent: number) {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const r = Math.max(0, Math.min(255, (num >> 16) + amt));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
      const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    function createTexture(draw: (ctx: CanvasRenderingContext2D) => void) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      draw(ctx);
      const texture = new THREE.CanvasTexture(canvas);
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    }

    function addNoise(ctx: CanvasRenderingContext2D, baseColor: string, count: number) {
      for (let i = 0; i < count; i++) {
        const shade = (Math.random() * 2 - 1) * 15;
        ctx.fillStyle = shadeColor(baseColor, shade);
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const grassTop = createTexture((ctx) => {
      const base = '#3CB043';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 30);
    });

    const grassSide = createTexture((ctx) => {
      const base = '#A0522D';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#3CB043';
      ctx.fillRect(0, 0, size, size / 4);
      addNoise(ctx, base, 20);
    });

    const dirt = createTexture((ctx) => {
      const base = '#A0522D';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 40);
    });

    const stone = createTexture((ctx) => {
      const base = '#808080';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 30);
    });

    const sand = createTexture((ctx) => {
      const base = '#F4E2B5';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 30);
    });

    const water = createTexture((ctx) => {
      const base = '#117cbf';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 20);
    });

    const wood = createTexture((ctx) => {
      const base = '#8B5A2B';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      // simple vertical stripes to hint bark
      ctx.fillStyle = shadeColor(base, -10);
      for (let x = 0; x < size; x += 4) {
        ctx.fillRect(x, 0, 2, size);
      }
      addNoise(ctx, base, 15);
    });

    const leaves = createTexture((ctx) => {
      const base = '#258a2c';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 50);
    });

    const bedrock = createTexture((ctx) => {
      const base = '#4B4B4B';
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      addNoise(ctx, base, 60);
    });

    return { grassTop, grassSide, dirt, stone, sand, water, wood, leaves, bedrock };
  }, []);
} 