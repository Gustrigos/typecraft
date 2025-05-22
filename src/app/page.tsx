'use client';

import dynamic from "next/dynamic";
import Crosshair from "@components/ui/Crosshair";
import Hotbar from "@components/game/Hotbar";
import FPSCounter from "@components/ui/FPSCounter";
import GameMenu from "@components/game/GameMenu";
import { KeyboardControls } from "@react-three/drei";

const GameExperience = dynamic(
  () => import("@components/game/GameExperience"),
  {
    ssr: false,
  }
);

const keyMap = [
  { name: "forward", keys: ["KeyW", "w", "ArrowUp"] },
  { name: "back", keys: ["KeyS", "s", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "a", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "d", "ArrowRight"] },
  { name: "jump", keys: ["Space", " "] },
] as const;

export default function HomePage() {
  return (
    <KeyboardControls map={keyMap as any}>
      <GameExperience />
      <Crosshair />
      <Hotbar />
      <FPSCounter />
      <GameMenu />
    </KeyboardControls>
  );
} 