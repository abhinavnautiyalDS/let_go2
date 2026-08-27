'use client';

import { motion } from 'framer-motion';

const staticLayers = [
  "BACKGROUND.png",
  "WINDOW.png",
  "TABLE.png",
  "CUP.png",
  "LAMP.png",
];

const rainDrops = Array.from({ length: 200 }, (_, i) => ({
  left: (i * 11.73) % 85,
  top: (i * 17.41) % 100,
  delay: (i * 0.37) % 4,
  duration: 0.9 + ((i * 0.09) % 0.6),
  length: 14 + ((i * 16) % 22),
  opacity: 0.3 + ((i * 0.07) % 0.28),
}));

export default function SceneBackground() {
  return (
    <div className="scene-background-container">
      <div className="scene-camera">
        <motion.img
          src="/assets/scene-01/person.png"
          className="layer person-breathing"
          alt=""
          animate={{ scaleY: [1, 1.007, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {staticLayers.map((layer) => (
          <img
            key={layer}
            src={`/assets/scene-01/${layer}`}
            className="layer"
            alt=""
          />
        ))}

        <motion.div
          className="lamp-glow"
          animate={{
            opacity: [0.48, 0.5, 0.48],
            scale: [1.03, 1.02, 1.03],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.img
          src="/assets/scene-01/curtain.png"
          className="layer curtain"
          alt=""
          animate={{
            x: [0, 0, -2, 0, 0],
            rotate: [0, 0.5, -0.3, 0.4, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />

        <video
          className="steam-video"
          src="/assets/scene-01/steam.mp4"
          autoPlay
          loop
          muted
          playsInline
        />

        <div className="rain">
          {rainDrops.map((drop, i) => (
            <span
              key={i}
              className="raindrop"
              style={{
                left: `${drop.left}%`,
                top: `${drop.top}%`,
                height: `${drop.length}px`,
                opacity: drop.opacity,
                animationDelay: `${drop.delay}s`,
                animationDuration: `${drop.duration}s`,
              }}
            />
          ))}
        </div>

        <div className="film-grain" />
      </div>
    </div>
  );
}