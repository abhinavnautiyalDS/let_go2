"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { landingSteps } from "../../data/landing-content";
import type { LandingNavigation } from "../../types";

export default function LandingMobile({ onBegin }: LandingNavigation) {
  return (
    <div className="landing-composition landing-composition--mobile">
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
      >
        LET GO
      </motion.h1>

      <motion.p
        className="hero-japanese"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
      >
        手放す — Tehanasu
      </motion.p>

      <motion.div
        className="hero-divider"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.9, delay: 1, ease: "easeOut" }}
      />

      <motion.p
        className="hero-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
      >
        An ancient ritual of release.
      </motion.p>

      <motion.p
        className="hero-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5, ease: "easeOut" }}
      >
        Write. Burn. Let go.
        <br />
        Release what no longer belongs to you.
      </motion.p>

      <motion.div
        className="mobile-steps"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.9, ease: "easeOut" }}
      >
        {landingSteps.map((step) => (
          <div className="mobile-step" key={step.number}>
            <span className="mobile-step-number">{step.number}</span>
            <div>
              <h2>
                {step.title} <span>— {step.japaneseName}</span>
              </h2>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5, ease: "easeOut" }}
      >
        <Link href="/ritual" className="begin-hero" onClick={onBegin}>
          BEGIN THE RITUAL
        </Link>
      </motion.div>

      <motion.p
        className="hero-philosophy"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 2.9, ease: "easeOut" }}
      >
        物の哀れ
        <span className="philosophy-en">
          Mono no aware — the gentle sadness of things passing.
        </span>
      </motion.p>
    </div>
  );
}
