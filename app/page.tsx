'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import SceneBackground from '@/app/components/SceneBackground';

export default function HomePage() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const enterRitual = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (isTransitioning) return;
    setIsTransitioning(true);
    window.setTimeout(() => router.push('/ritual'), 260);
  };

  return (
    <main className="home-page">
      <div className="home-bg">
        <SceneBackground />
      </div>

      <div className="home-content">
        {/* ─── HERO ────────────────────────────────────────────── */}
        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, delay: 0.3, ease: 'easeOut' }}
        >
          LET GO
        </motion.h1>

        <motion.p
          className="hero-japanese"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.8, delay: 1.0, ease: 'easeOut' }}
        >
          手放す — Tehanasu
        </motion.p>

        <motion.div
          className="hero-divider"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 1.2, delay: 1.6, ease: 'easeOut' }}
        />

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.2, ease: 'easeOut' }}
        >
          An ancient ritual of release.
        </motion.p>

        <motion.p
          className="hero-tagline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 2.8, ease: 'easeOut' }}
        >
          Write. Burn. Let go.<br />
          In three quiet steps, release<br />
          what no longer belongs to you.
        </motion.p>

        {/* ─── STEPS ────────────────────────────────────────────── */}
        <motion.div
          className="steps-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 3.5, ease: 'easeOut' }}
        >
          <div className="step">
            <div className="step-circle">1</div>
            <div className="step-content">
              <h3>Write <span className="step-jp">— Kotodama</span></h3>
              <p>Write the name you're ready to release.</p>
            </div>
          </div>

          <div className="step-divider" />

          <div className="step">
            <div className="step-circle">2</div>
            <div className="step-content">
              <h3>Burn <span className="step-jp">— Keshō</span></h3>
              <p>Watch the paper burn. The name becomes ash.</p>
            </div>
          </div>

          <div className="step-divider" />

          <div className="step">
            <div className="step-circle">3</div>
            <div className="step-content">
              <h3>Release <span className="step-jp">— Tehanasu</span></h3>
              <p>Leave it behind. The room warms. You are lighter.</p>
            </div>
          </div>
        </motion.div>

        {/* ─── BEGIN BUTTON ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 4.8, ease: 'easeOut' }}
        >
          <Link href="/ritual" className="begin-hero" onClick={enterRitual}>
            BEGIN THE RITUAL
          </Link>
        </motion.div>

        {/* ─── PHILOSOPHICAL FOOTER ───────────────────────────── */}
        <motion.p
          className="hero-philosophy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 5.5, ease: 'easeOut' }}
        >
          物の哀れ — <span className="philosophy-en">Mono no aware: the gentle sadness of things passing.</span>
        </motion.p>

        {/* ─── SCROLL HINT ─────────────────────────────────────── */}
        <motion.div
          className="scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 6.5, ease: 'easeOut' }}
        >
          <span>Scroll to explore</span>
        </motion.div>
      </div>

      <motion.div
        className="route-transition-overlay"
        initial={false}
        animate={{ opacity: isTransitioning ? 1 : 0 }}
        transition={{ duration: 0.24, ease: 'easeInOut' }}
        aria-hidden="true"
      />
    </main>
  );
}