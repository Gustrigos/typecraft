'use client';

import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useRef, useEffect, useMemo } from 'react';
import { useSphere } from '@react-three/cannon';
import { useBlockStore } from '@lib/blocks/store';
import { createPortal } from 'react-dom';

const WALK_SPEED = 10;
const JUMP_FORCE = 6;
const CAMERA_HEIGHT = 2.0; 
const SPHERE_RADIUS = 0.5;

export default function PlayerControls() {
  const { camera } = useThree();
  const jumpRequested = useRef(false);
  const [subscribeKeys, getKeys] = useKeyboardControls();
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

  // Convert jump key presses to jump requests
  useEffect(() => {
    const unsub = subscribeKeys(
      (state) => state.jump,
      (value) => {
        if (value) jumpRequested.current = true;
      }
    );
    return () => unsub();
  }, [subscribeKeys]);

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
    });
    return () => unsubP();
  }, [api.position]);

  // Reuse vector instances to avoid per-frame allocations
  const forwardRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());
  const dirRef = useRef(new Vector3());
  // Remember last valid horizontal forward so we can keep moving if the player looks straight up/down
  const lastForwardRef = useRef(new Vector3(0, 0, -1));

  useFrame(() => {
    const { forward: moveForward, back: moveBack, left: moveLeft, right: moveRight } = getKeys();

    const moveX = (moveRight ? 1 : 0) + (moveLeft ? -1 : 0);
    const moveZ = (moveBack ? 1 : 0) + (moveForward ? -1 : 0);

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

  return (
    <>
      <PointerLockControls />
      <mesh ref={ref as any} visible={false} />
    </>
  );
} 