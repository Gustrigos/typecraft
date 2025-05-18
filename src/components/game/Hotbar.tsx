'use client';

import React, { useEffect } from 'react';
import { useInventoryStore } from '@lib/inventory/store';
import { BlockType } from '@lib/blocks/store';

const BLOCK_TYPES: BlockType[] = ['grass', 'dirt', 'stone', 'sand', 'wood', 'leaves', 'water'];
const COLOR_MAP: Record<BlockType, string> = {
  grass: '#3CB043',
  dirt: '#A0522D',
  stone: '#808080',
  sand: '#F4E2B5',
  wood: '#8B5A2B',
  leaves: '#3CB043',
  water: '#117cbf',
  bedrock: '#4B4B4B',
};

export default function Hotbar() {
  const selectedType = useInventoryStore((s) => s.selectedType);
  const setSelected = useInventoryStore((s) => s.setSelectedType);

  // Keyboard shortcuts 1-4
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = parseInt(e.key, 10);
      if (!isNaN(idx) && idx >= 1 && idx <= BLOCK_TYPES.length) {
        setSelected(BLOCK_TYPES[idx - 1]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setSelected]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(0,0,0,0.4)',
        padding: '8px',
        borderRadius: '6px',
        zIndex: 11,
      }}
    >
      {BLOCK_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => setSelected(type)}
          style={{
            width: '48px',
            height: '48px',
            border: '2px solid',
            borderColor: selectedType === type ? 'yellow' : 'rgba(255,255,255,0.4)',
            backgroundColor: COLOR_MAP[type],
            borderRadius: '4px',
          }}
        />
      ))}
    </div>
  );
} 