'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useRef, useEffect, useMemo } from 'react';
import { useSphere } from '@react-three/cannon';
import { useBlockStore } from '@lib/blocks/store';

const WALK_SPEED = 10;
const JUMP_FORCE = 6;
const CAMERA_HEIGHT = 2.0; // 2.5 blocks felt too high
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
    return top + SPHERE_RADIUS; // spawn sphere just above block top
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') {
        jumpRequested.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.code === 'Space') jumpRequested.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const velocity = useRef<[number, number, number]>([0, 0, 0]);
  const position = useRef<[number, number, number]>([0, 0, 0]);
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((v) => (velocity.current = v));
    return unsubscribe;
  }, [api.velocity]);
  useEffect(() => {
    const unsubscribe = api.position.subscribe((p) => (position.current = p));
    return unsubscribe;
  }, [api.position]);

  // Reuse vector instances to avoid per-frame allocations
  const forwardRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());
  const dirRef = useRef(new Vector3());
  // Remember last valid horizontal forward so we can keep moving if the player looks straight up/down
  const lastForwardRef = useRef(new Vector3(0, 0, -1));

  useFrame(() => {
    const k = keys.current;

    // input axes
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

    let moving = dir.lengthSq() > 0;
    if (moving) {
      dir.normalize().multiplyScalar(WALK_SPEED);
    } else {
      dir.set(0, 0, 0);
    }

    // set horizontal velocity directly; keeps responsiveness
    // Keep the body awake even when velocity is zero to avoid it falling asleep prematurely
    api.wakeUp?.();
    api.velocity.set(dir.x, velocity.current[1], dir.z);

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

  // Expose for debugging in console
  // @ts-ignore
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.playerApi = api;
  }

  return (
    <>
      <PointerLockControls />
      <mesh ref={ref as any} visible={false} />
    </>
  );
} 