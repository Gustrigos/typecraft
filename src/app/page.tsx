import dynamic from "next/dynamic";
import Crosshair from "@components/ui/Crosshair";
import Hotbar from "@components/game/Hotbar";

const GameExperience = dynamic(
  () => import("@components/game/GameExperience"),
  {
    ssr: false,
  }
);

export default function HomePage() {
  return (
    <>
      <GameExperience />
      <Crosshair />
      <Hotbar />
    </>
  );
} 