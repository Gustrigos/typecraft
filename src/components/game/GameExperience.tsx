'use client';

import { Canvas } from '@react-three/fiber';
import { Sky, KeyboardControls } from '@react-three/drei';
import { Physics, usePlane } from '@react-three/cannon';
import World from './World';
import Blocks from './Blocks';
import PlayerControls from './PlayerControls';
import PhysicsBlocks from './PhysicsBlocks';

function PhysicsGround() {
  usePlane(() => ({ args: [100, 100], rotation: [-Math.PI / 2, 0, 0], position: [0, 0, 0] }));
  return null;
}

export default function GameExperience() {
  return (
    <Canvas shadows camera={{ position: [10, 10, 10], fov: 60 }} style={{ height: '100vh', width: '100vw' }}>
      <Physics gravity={[0, -9.81, 0]}>
        <PhysicsGround />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight castShadow position={[10, 15, 5]} intensity={1.2} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

        {/* Environment */}
        <Sky sunPosition={[100, 20, 100]} />

        {/* Game world */}
        <World />
        <Blocks />
        <PhysicsBlocks />
        <KeyboardControls
          map={[
            { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
            { name: 'back', keys: ['KeyS', 'ArrowDown'] },
            { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
            { name: 'right', keys: ['KeyD', 'ArrowRight'] },
            { name: 'jump', keys: ['Space'] },
          ]}
        >
          <PlayerControls />
        </KeyboardControls>
      </Physics>

      {/* Player controls (pointer lock) handled above */}
    </Canvas>
  );
} 