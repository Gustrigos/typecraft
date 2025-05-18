import { create } from 'zustand';

interface PlayerState {
  position: [number, number, number];
  setPosition: (p: [number, number, number]) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  position: [0, 0, 0],
  setPosition: (p) => set({ position: p }),
})); 