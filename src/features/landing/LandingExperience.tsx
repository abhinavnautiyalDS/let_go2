"use client";

import { motion } from "framer-motion";
import SceneBackground from "./components/shared/SceneBackground";
import LandingDesktop from "./components/desktop/LandingDesktop";
import LandingMobile from "./components/mobile/LandingMobile";
import { useLandingNavigation } from "./hooks/useLandingNavigation";

export default function LandingExperience() {
  const { isTransitioning, onBegin } = useLandingNavigation();

  return (
    <main className="home-page">
      <div className="home-bg" aria-hidden="true">
        <SceneBackground />
      </div>

      <div className="home-content">
        <LandingDesktop isTransitioning={isTransitioning} onBegin={onBegin} />
        <LandingMobile isTransitioning={isTransitioning} onBegin={onBegin} />
      </div>

      <motion.div
        className="route-transition-overlay"
        initial={false}
        animate={{ opacity: isTransitioning ? 1 : 0 }}
        transition={{ duration: 0.24, ease: "easeInOut" }}
        aria-hidden="true"
      />
    </main>
  );
}
