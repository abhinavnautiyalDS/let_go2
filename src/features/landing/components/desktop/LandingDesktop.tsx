"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { landingSteps } from "../../data/landing-content";
import type { LandingNavigation } from "../../types";

export default function LandingDesktop({ onBegin }: LandingNavigation) {
  return (
    <div className="landing-composition landing-composition--desktop">
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
      >
        LET GO
      </motion.h1>

      <motion.p
        className="hero-japanese"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, delay: 1, ease: "easeOut" }}
      >
        手放す — Tehanasu
      </motion.p>

      <motion.div
        className="hero-divider"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 1.2, delay: 1.6, ease: "easeOut" }}
      />

      <motion.p
        className="hero-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 2.2, ease: "easeOut" }}
      >
        An ancient ritual of release.
      </motion.p>

      <motion.p
        className="hero-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 2.8, ease: "easeOut" }}
      >
        Write. Burn. Let go.
        <br />
        In three quiet steps, release
        <br />
        what no longer belongs to you.
      </motion.p>

      <motion.div
        className="steps-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 3.5, ease: "easeOut" }}
      >
        {landingSteps.map((step) => (
          <div className="step" key={step.number}>
            <div className="step-circle">{step.number}</div>
            <div className="step-content">
              <h3>
                {step.title} <span className="step-jp">— {step.japaneseName}</span>
              </h3>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 4.8, ease: "easeOut" }}
      >
        <Link href="/ritual" className="begin-hero" onClick={onBegin}>
          BEGIN THE RITUAL
        </Link>
      </motion.div>

      <motion.p
        className="hero-philosophy"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 5.5, ease: "easeOut" }}
      >
        物の哀れ —{" "}
        <span className="philosophy-en">
          Mono no aware: the gentle sadness of things passing.
        </span>
      </motion.p>

      <motion.div
        className="scroll-hint"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, delay: 6.5, ease: "easeOut" }}
      >
        <span>Scroll to explore</span>
      </motion.div>
    </div>
  );
}
