'use client';

import { useEffect } from 'react';
import { useUIStore } from '@store/uiStore';

/**
 * Full-screen in-game menu toggled via the ESC key.
 */
export default function GameMenu() {
  const isOpen = useUIStore((s) => s.isMenuOpen);
  const toggleMenu = useUIStore((s) => s.toggleMenu);
  const setMenuOpen = useUIStore((s) => s.setMenuOpen);

  // Toggle menu visibility on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleMenu();
      }
    };

    const handlePointerLockChange = () => {
      const locked = !!document.pointerLockElement;
      setMenuOpen(!locked);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [toggleMenu, setMenuOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70">
      <div className="w-80 rounded-lg bg-neutral-800 p-6 shadow-lg">
        <h2 className="mb-6 text-center text-xl font-bold text-white">Game Menu</h2>
        <button
          type="button"
          onClick={toggleMenu}
          className="mb-4 w-full rounded-md bg-neutral-700 py-2 text-white transition-colors hover:bg-neutral-600"
        >
          Resume (ESC)
        </button>
        <div className="text-center text-sm text-neutral-400">Settings coming soon</div>
      </div>
    </div>
  );
} 