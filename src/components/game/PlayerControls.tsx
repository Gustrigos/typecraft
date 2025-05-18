'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useRef, useEffect, useMemo } from 'react';
import { useSphere } from '@react-three/cannon';
import { useBlockStore } from '@lib/blocks/store';
import { usePlayerStore } from '@store/playerStore';

const WALK_SPEED = 10;
const JUMP_FORCE = 6;
const CAMERA_HEIGHT = 2.0; 
const SPHERE_RADIUS = 0.5;

export default function PlayerControls() {
  const { camera } = useThree();
  const keys = useRef<{ [key: string]: boolean }>({});
  const jumpRequested = useRef(false);
  const lastJumpTime = useRef(0);

  const SPAWN_X = 0;
  const SPAWN_Z = 0;

  const blocks = useBlockStore((s) => s.blocks);
  const spawnY = useMemo(() => {
    const column = blocks.filter((b) => b.position[0] === SPAWN_X && b.position[2] === SPAWN_Z);
    const top = column.reduce((max, b) => Math.max(max, b.position[1] + SPHERE_RADIUS), SPHERE_RADIUS);
    return top + SPHERE_RADIUS + 1; // spawn sphere just above block top (+1 for safety)
  }, [blocks]);

  const [ref, api] = useSphere(() => ({
    mass: 1,
    args: [SPHERE_RADIUS],
    position: [SPAWN_X, spawnY, SPAWN_Z],
    fixedRotation: true,
    linearDamping: 0,
    friction: 0,
    restitution: 0,
    onCollide: (e: any) => {
      // Normal can be in contact.ni (array) or contact.contactNormal
      const normalArr: number[] | undefined = e.contact?.ni || e.contact?.contactNormal;
      if (normalArr) {
        const ny = normalArr[1];
        if (Math.abs(ny) > 0.5) {
          groundedUntil.current = performance.now() + 100; // keep grounded for next 100ms
        }
      }
    },
    onCollideEnd: () => {
      // We leave clearing to the timer in useFrame
    },
  }));

  const groundedUntil = useRef(0);

  // Set camera to spawn height right after mount
  useEffect(() => {
    camera.position.set(SPAWN_X, spawnY + CAMERA_HEIGHT, SPAWN_Z);
    // Initialise local refs so first frame isn't 0
    position.current = [SPAWN_X, spawnY, SPAWN_Z];
  }, [spawnY, camera]);

  const velocity = useRef<[number, number, number]>([0, 0, 0]);
  const position = useRef<[number, number, number]>([0, 0, 0]);
  useEffect(() => {
    const unsubV = api.velocity.subscribe((v) => {
      velocity.current = v;
    });
    return () => unsubV();
  }, [api.velocity]);
  useEffect(() => {
    const unsubP = api.position.subscribe((p) => {
      position.current = p;
      usePlayerStore.getState().setPosition([p[0], p[1], p[2]]);
    });
    return () => unsubP();
  }, [api.position]);

  // Reuse vector instances to avoid per-frame allocations
  const forwardRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());
  const dirRef = useRef(new Vector3());
  // Remember last valid horizontal forward so we can keep moving if the player looks straight up/down
  const lastForwardRef = useRef(new Vector3(0, 0, -1));
  const lastHorizontalSet = useRef(new Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') jumpRequested.current = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.code === 'Space') jumpRequested.current = false;
    };
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
    };
  }, []);

  useFrame(() => {
    const k = keys.current;
    const moveX = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) + (k['KeyA'] || k['ArrowLeft'] ? -1 : 0);
    const moveZ = (k['KeyS'] || k['ArrowDown'] ? 1 : 0) + (k['KeyW'] || k['ArrowUp'] ? -1 : 0);

    // camera basis vectors
    const forward = forwardRef.current;
    camera.getWorldDirection(forward);
    forward.y = 0;

    if (forward.lengthSq() < 1e-6) {
      // Looking straight up / down – use the last non-zero forward vector so WASD still works
      forward.copy(lastForwardRef.current);
    } else {
      forward.normalize();
      lastForwardRef.current.copy(forward);
    }

    const right = rightRef.current;
    right.crossVectors(forward, camera.up).normalize();

    const dir = dirRef.current;
    dir.copy(forward).multiplyScalar(-moveZ).add(right.multiplyScalar(moveX));

    const horizontalMoving = dir.lengthSq() > 0;

    if (horizontalMoving) {
      dir.normalize().multiplyScalar(WALK_SPEED);

      // Apply horizontal velocity while preserving current vertical
      api.wakeUp?.();
      api.velocity.set(dir.x, velocity.current[1], dir.z);
      lastHorizontalSet.current.copy(dir);
    } else if (lastHorizontalSet.current.lengthSq() > 0.0001) {
      // Stop horizontal movement when keys released
      api.velocity.set(0, velocity.current[1], 0);
      lastHorizontalSet.current.set(0, 0, 0);
    }

    // Jump once per key press when grounded
    const now = performance.now();
    let onGround = now < groundedUntil.current;
    if (!onGround && Math.abs(velocity.current[1]) < 0.05) {
      onGround = true;
      groundedUntil.current = now + 50; // quick grace
    }

    if (
      jumpRequested.current &&
      onGround &&
      now - lastJumpTime.current > 100 // debounce to avoid multi-jump per keydown
    ) {
      api.applyImpulse([0, JUMP_FORCE, 0], [0, 0, 0]);
      lastJumpTime.current = now;
      jumpRequested.current = false;
    }

    // Sync camera
    camera.position.set(position.current[0], position.current[1] + CAMERA_HEIGHT, position.current[2]);
  });

  return (
    <>
      <PointerLockControls />
      <mesh ref={ref as any} visible={false} />
    </>
  );
} 