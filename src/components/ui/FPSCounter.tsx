'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fixed-position overlay displaying current frames per second.
 */
export default function FPSCounter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(performance.now());
  const raf = useRef<number>();

  useEffect(() => {
    const loop = () => {
      frames.current += 1;
      const now = performance.now();

      if (now - last.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        last.current = now;
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="fixed right-4 top-4 z-50 rounded-md bg-black/60 px-3 py-1 text-xs font-mono text-white">
      {fps} FPS
    </div>
  );
} 