import { create } from 'zustand';
import { BlockType } from '@lib/blocks/store';

interface InventoryState {
  selectedType: BlockType;
  setSelectedType: (type: BlockType) => void;
  consumeItem: (type: BlockType) => boolean;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  selectedType: 'dirt',
  setSelectedType: (type) => set(() => ({ selectedType: type })),
  // Creative mode: always allow placement
  consumeItem: () => true,
})); 