import { HomeFeatures } from "@/components/layout/HomeFeatures";
import { HomeHero } from "@/components/layout/HomeHero";
import { HomeStatusStrip } from "@/components/layout/HomeStatusStrip";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeStatusStrip />
      <HomeFeatures />
    </>
  );
}
