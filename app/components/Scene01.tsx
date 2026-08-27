"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ─── ASSET PATHS ────────────────────────────────────────────────────────────
const ASSET_BASE = "/assets/scene-01";
const AUDIO_BASE = "/assets/audio";

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

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const chromaAlpha = (r: number, g: number, b: number) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max > 0 ? (max - min) / max : 0;

  const greenDominance = g - (r + b) * 0.5;
  const greenRatio = g / Math.max(1, (r + b) * 0.5);

  const dominance = smoothstep(5, 24, greenDominance);
  const ratio = smoothstep(1.04, 1.18, greenRatio);
  const saturationGate = smoothstep(0.08, 0.22, saturation);
  const greenGate = Math.max(0, Math.min(1, dominance * ratio * saturationGate));

  return Math.round(Math.max(0, Math.min(255, (1 - greenGate) * 255)));
};

// ─── NAME FITTING HELPERS ──────────────────────────────────────────────────

const fitNameFontSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxFontSize: number,
  fontFamily: string
): number => {
  let low = 8;
  let high = maxFontSize;
  let best = maxFontSize;
  const weight = "400";

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = `${weight} ${mid}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    const height =
      (metrics.actualBoundingBoxAscent || mid * 0.7) +
      (metrics.actualBoundingBoxDescent || mid * 0.3);

    if (width <= maxWidth && height <= maxHeight) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
};

const measureNameFontSize = (
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxFontSize: number,
  fontFamily: string
): number => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return maxFontSize;
  return fitNameFontSize(ctx, text, maxWidth, maxHeight, maxFontSize, fontFamily);
};

const getMaxLinesForLength = (text: string): number => {
  const len = text.trim().length;
  if (len <= 18) return 1;
  if (len <= 36) return 2;
  if (len <= 60) return 3;
  if (len <= 90) return 4;
  if (len <= 130) return 5;
  return 6;
};

const measureNameFontSizeMultiline = (
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxFontSize: number,
  maxLines: number,
  fontFamily: string
): number => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return maxFontSize;
  return fitNameMultiline(ctx, text, maxWidth, maxHeight, maxFontSize, fontFamily, maxLines).fontSize;
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [text];

  const lines: string[] = [];
  let current = words[0];

  const breakLongWord = (word: string): string[] => {
    if (ctx.measureText(word).width <= maxWidth) return [word];
    const parts: string[] = [];
    let chunk = "";
    for (const ch of word) {
      const test = chunk + ch;
      if (ctx.measureText(test).width <= maxWidth || chunk === "") {
        chunk = test;
      } else {
        parts.push(chunk);
        chunk = ch;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  };

  if (ctx.measureText(current).width > maxWidth) {
    const broken = breakLongWord(current);
    lines.push(...broken.slice(0, -1));
    current = broken[broken.length - 1] ?? "";
  }

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const test = `${current} ${word}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      if (ctx.measureText(word).width > maxWidth) {
        const broken = breakLongWord(word);
        lines.push(...broken.slice(0, -1));
        current = broken[broken.length - 1] ?? "";
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
};

const fitNameMultiline = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxFontSize: number,
  fontFamily: string,
  maxLines: number = 3
): { fontSize: number; lines: string[]; lineHeight: number } => {
  let low = 8;
  let high = Math.max(8, Math.floor(maxFontSize));
  let best = { fontSize: 8, lines: wrapText(ctx, text, maxWidth).slice(0, maxLines), lineHeight: 8 * 1.25 };

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    ctx.font = `400 ${mid}px ${fontFamily}`;
    const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
    const lineHeight = mid * 1.25;
    const totalHeight = lines.length * lineHeight;
    const widest = lines.reduce(
      (max, l) => Math.max(max, ctx.measureText(l).width),
      0
    );

    if (widest <= maxWidth && totalHeight <= maxHeight) {
      best = { fontSize: mid, lines, lineHeight };
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
};

const computePaperTextBounds = (
  alpha: Uint8ClampedArray,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } | null => {
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) return null;

  const insetX = (maxX - minX) * 0.12;
  const insetY = (maxY - minY) * 0.12;

  return {
    x: (minX + insetX) / w,
    y: (minY + insetY) / h,
    w: (maxX - minX - insetX * 2) / w,
    h: (maxY - minY - insetY * 2) / h,
  };
};

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const W = 1280;
const H = 720;
const SOURCE_W = 320;
const SOURCE_H = 180;

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function Scene01() {
  // ─── FLOW STATE ────────────────────────────────────────────────────
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [started, setStarted] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [showPaper, setShowPaper] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [paperBurned, setPaperBurned] = useState(false);
  const [name, setName] = useState("");

  // ─── OTHER STATES ──────────────────────────────────────────────────
  const [worldChanged, setWorldChanged] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [paperReady, setPaperReady] = useState(false);

  const [breathPhase, setBreathPhase] = useState<"inhale" | "exhale" | null>(null);
  const [showLetGoText, setShowLetGoText] = useState(false);
  const [releaseRaysOpacity, setReleaseRaysOpacity] = useState(0);
  const [dustOpacity, setDustOpacity] = useState(0);

  type PostBurnStage =
    | "idle"
    | "silence"
    | "breathing"
    | "breathPause"
    | "release"
    | "affirmation"
    | "memory"
    | "checkout"
    | "card"
    | "donation"
    | "final";

  const [postBurnStage, setPostBurnStage] = useState<PostBurnStage>("idle");
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false);
  const [showCardCheckout, setShowCardCheckout] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showFinalExit, setShowFinalExit] = useState(false);

  // ─── REFS ──────────────────────────────────────────────────────────

  const nameOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameFullCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nameWipeRafRef = useRef<number | null>(null);
  const NAME_WIPE_DURATION_MS = 1400;

  const cardContentRef = useRef<HTMLDivElement | null>(null);
  const [cardNameFontSize, setCardNameFontSize] = useState(56);

  const rainAudio = useRef<HTMLAudioElement | null>(null);
  const roomAudio = useRef<HTMLAudioElement | null>(null);
  const fireAudio = useRef<HTMLAudioElement | null>(null);
  const clickAudio = useRef<HTMLAudioElement | null>(null);
  const inhaleAudio = useRef<HTMLAudioElement | null>(null);
  const exhaleAudio = useRef<HTMLAudioElement | null>(null);
  const subtleWindAudio = useRef<HTMLAudioElement | null>(null);
  const releaseAmbienceAudio = useRef<HTMLAudioElement | null>(null);

  const fireVideoRef = useRef<HTMLVideoElement | null>(null);
  const sceneCameraRef = useRef<HTMLDivElement | null>(null);

  const burnCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fireCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ashCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeIntervals = useRef<Set<number>>(new Set());
  const activeTimeouts = useRef<Set<number>>(new Set());

  const trackedTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      activeTimeouts.current.delete(id);
      fn();
    }, ms);
    activeTimeouts.current.add(id);
    return id;
  };

  const trackedInterval = (fn: () => void, ms: number) => {
    const id = window.setInterval(fn, ms);
    activeIntervals.current.add(id);
    return id;
  };

  const clearTrackedInterval = (id: number) => {
    window.clearInterval(id);
    activeIntervals.current.delete(id);
  };

  useEffect(() => {
    return () => {
      activeTimeouts.current.forEach((id) => window.clearTimeout(id));
      activeIntervals.current.forEach((id) => window.clearInterval(id));
      [
        rainAudio,
        roomAudio,
        fireAudio,
        clickAudio,
        inhaleAudio,
        exhaleAudio,
        subtleWindAudio,
        releaseAmbienceAudio,
      ].forEach((ref) => {
        const audio = ref.current;
        if (audio) {
          audio.pause();
        }
      });
    };
  }, []);

  // ─── AUDIO HELPERS ──────────────────────────────────────────────────────

  const fadeAudio = (
    audio: HTMLAudioElement | null,
    targetVolume: number,
    duration: number,
    onDone?: () => void
  ) => {
    if (!audio) return;
    const startVolume = audio.volume;
    const difference = targetVolume - startVolume;
    const steps = 30;
    const stepTime = Math.max(16, duration / steps);
    let currentStep = 0;
    const interval = trackedInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      audio.volume = Math.max(0, Math.min(1, startVolume + difference * progress));
      if (currentStep >= steps) {
        clearTrackedInterval(interval);
        audio.volume = Math.max(0, Math.min(1, targetVolume));
        onDone?.();
      }
    }, stepTime);
    return interval;
  };

  const stopAudio = (audio: HTMLAudioElement | null, duration = 800) => {
    if (!audio) return;
    if (audio.paused) return;
    fadeAudio(audio, 0, duration, () => {
      audio.pause();
    });
  };

  const playOnce = (audio: HTMLAudioElement | null, volume: number) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  };

  const playLoop = (audio: HTMLAudioElement | null, volume: number) => {
    if (!audio) return;
    audio.loop = true;
    if (audio.paused) {
      audio.volume = 0;
      audio.play().catch(() => {});
    }
    fadeAudio(audio, volume, 2500);
  };

  // ─── FULLSCREEN TOGGLE ─────────────────────────────────────────────

  const toggleFullscreen = () => {
    const element = document.documentElement;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().catch((err) => {
        console.warn("Fullscreen error:", err.message);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.warn("Exit fullscreen error:", err.message);
      });
    }
  };

  // ─── RESPONSIVE CAMERA ──────────────────────────────────────────────

  const [cameraTarget, setCameraTarget] = useState({
    scale: 1.25,
    x: -35,
    y: -170,
  });

  useEffect(() => {
    const updateCamera = () => {
      const isMobile = window.innerWidth < 768;
      const isTablet = window.innerWidth < 1024 && window.innerWidth >= 768;
      const isLandscapeNow = window.innerWidth > window.innerHeight;

      if (!started) {
        if (isMobile && isLandscapeNow) {
          setCameraTarget({ scale: 1.0, x: -15, y: -100 });
        } else if (isMobile) {
          setCameraTarget({ scale: 1.0, x: -10, y: -100 });
        } else if (isTablet) {
          setCameraTarget({ scale: 1.15, x: -25, y: -140 });
        } else {
          setCameraTarget({ scale: 1.25, x: -35, y: -170 });
        }
      } else {
        if (isMobile && isLandscapeNow) {
          setCameraTarget({ scale: 1.35, x: -50, y: -180 });
        } else if (isMobile) {
          setCameraTarget({ scale: 1.4, x: -60, y: -200 });
        } else if (isTablet) {
          setCameraTarget({ scale: 1.6, x: -90, y: -240 });
        } else {
          setCameraTarget({ scale: 1.75, x: -120, y: -280 });
        }
      }
    };

    updateCamera();
    window.addEventListener("resize", updateCamera);
    return () => window.removeEventListener("resize", updateCamera);
  }, [started]);

  // ─── LAMP FLICKER ──────────────────────────────────────────────────

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setFlicker(true);
      setTimeout(() => setFlicker(false), 500);
    }, 20000);
    return () => clearInterval(interval);
  }, [started]);

  // ─── GUIDE → BEGIN OVERLAY (NO CAMERA MOVEMENT) ─────────────────

  // When guide is dismissed → show the BEGIN overlay
  useEffect(() => {
    if (!guideDismissed) return;

    // Show the BEGIN overlay immediately
    setIntroFinished(true);
  }, [guideDismissed]);

  // ─── BEGIN BUTTON → CAMERA MOVEMENT + PAPER ─────────────────────

  const handleBeginRitual = () => {
    toggleFullscreen();
    setStarted(true); // Triggers camera animation
    setShowPaper(true); // Paper will appear after camera settles
    playOnce(clickAudio.current, 0.2);
  };

  // ─── AUDIO ──────────────────────────────────────────────────────────

  useEffect(() => {
    const rain = rainAudio.current;
    if (!rain) return;
    rain.loop = true;
    rain.volume = 0.16;
    rain.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (!started) return;
    fadeAudio(rainAudio.current, 0.14, 3000);
    playLoop(roomAudio.current, 0.14);
  }, [started]);

  useEffect(() => {
    if (!started || nameLocked) return;
    fadeAudio(roomAudio.current, 0.09, 2000);
  }, [started, nameLocked]);

  useEffect(() => {
    if (!nameLocked) return;
    fadeAudio(roomAudio.current, 0.05, 400);
    const timer = trackedTimeout(() => setBurning(true), 550);
    return () => window.clearTimeout(timer);
  }, [nameLocked]);

  // ─── PAPER BURNING ─────────────────────────────────────────────────

  const [burning, setBurning] = useState(false);

  useEffect(() => {
    if (!burning) return;
    const fire = fireAudio.current;
    if (fire) {
      fire.currentTime = 0;
      fire.loop = true;
      fire.volume = 0;
      fire.play().catch(() => {});
      fadeAudio(fire, 0.4, 1200);
    }
    fadeAudio(rainAudio.current, 0.05, 1800);
    fadeAudio(roomAudio.current, 0.03, 1800);
  }, [burning]);

  useEffect(() => {
    if (!burning) return;
    if (nameWipeRafRef.current !== null) {
      cancelAnimationFrame(nameWipeRafRef.current);
      nameWipeRafRef.current = null;
    }
    const overlay = nameOverlayCanvasRef.current;
    const ctx = overlay?.getContext("2d");
    ctx?.clearRect(0, 0, W, H);
  }, [burning]);

  // ─── PAPER PNG LOADING ─────────────────────────────────────────────

  const paperPngRef = useRef<HTMLImageElement | null>(null);
  const lowResPaperData = useRef<Uint8ClampedArray | null>(null);
  const lowResPaperAlpha = useRef<Uint8ClampedArray | null>(null);
  const paperTextBoundsRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const burnMask = useRef<Float32Array>(new Float32Array(SOURCE_W * SOURCE_H));
  const tempDiffusion = useRef<Float32Array>(new Float32Array(SOURCE_W * SOURCE_H));
  const fireMaskData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const compositeData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const burnMaskImageData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const charImageData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));
  const edgeImageData = useRef<Uint8ClampedArray>(new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4));

  const lowResPaperCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResCompositeCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResBurnMaskCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResCharCanvas = useRef<HTMLCanvasElement | null>(null);
  const lowResEdgeCanvas = useRef<HTMLCanvasElement | null>(null);
  const fireMaskCanvas = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvas = useRef<HTMLCanvasElement | null>(null);

  const compositorReady = useRef(false);
  const compositorStarted = useRef(false);
  const loopId = useRef<number | null>(null);
  const renderActive = useRef(false);
  const videoEndedRef = useRef(false);
  const burnMaskDirty = useRef(true);
  const initialFrameRef = useRef<Uint8ClampedArray | null>(null);
  const hasInitialRef = useRef(false);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const hasPreviousRef = useRef(false);
  const finalRenderPending = useRef(false);
  const compositorEnded = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `${ASSET_BASE}/fire-paper-first-frame.png`;
    img.onload = () => {
      paperPngRef.current = img;
      setPaperReady(true);

      const canvas = burnCanvasRef.current;
      if (!canvas) return;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);

      const lrCanvas = document.createElement("canvas");
      lrCanvas.width = SOURCE_W;
      lrCanvas.height = SOURCE_H;
      const lrCtx = lrCanvas.getContext("2d", { willReadFrequently: true });
      if (!lrCtx) return;
      lrCtx.drawImage(img, 0, 0, SOURCE_W, SOURCE_H);
      const imageData = lrCtx.getImageData(0, 0, SOURCE_W, SOURCE_H);
      lowResPaperData.current = new Uint8ClampedArray(imageData.data);
      const alpha = new Uint8ClampedArray(SOURCE_W * SOURCE_H);
      for (let i = 0; i < SOURCE_W * SOURCE_H; i++) {
        alpha[i] = imageData.data[i * 4 + 3];
      }
      lowResPaperAlpha.current = alpha;
      lowResPaperCanvas.current = lrCanvas;

      paperTextBoundsRef.current = computePaperTextBounds(alpha, SOURCE_W, SOURCE_H);

      const compCanvas = document.createElement("canvas");
      compCanvas.width = SOURCE_W;
      compCanvas.height = SOURCE_H;
      const compCtx = compCanvas.getContext("2d");
      if (compCtx) {
        compCtx.drawImage(img, 0, 0, SOURCE_W, SOURCE_H);
      }
      lowResCompositeCanvas.current = compCanvas;

      lowResBurnMaskCanvas.current = document.createElement("canvas");
      lowResBurnMaskCanvas.current.width = SOURCE_W;
      lowResBurnMaskCanvas.current.height = SOURCE_H;
      lowResCharCanvas.current = document.createElement("canvas");
      lowResCharCanvas.current.width = SOURCE_W;
      lowResCharCanvas.current.height = SOURCE_H;
      lowResEdgeCanvas.current = document.createElement("canvas");
      lowResEdgeCanvas.current.width = SOURCE_W;
      lowResEdgeCanvas.current.height = SOURCE_H;
    };
    return () => { img.onload = null; };
  }, []);

  // ─── NAME WIPE ANIMATION ───────────────────────────────────────────

  const animateNameWipe = (durationMs: number) => {
    const overlay = nameOverlayCanvasRef.current;
    const full = nameFullCanvasRef.current;
    if (!overlay || !full) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    if (nameWipeRafRef.current !== null) {
      cancelAnimationFrame(nameWipeRafRef.current);
      nameWipeRafRef.current = null;
    }

    const bounds = paperTextBoundsRef.current ?? { x: 0.13, y: 0.33, w: 0.74, h: 0.34 };
    const startX = W * bounds.x;
    const wipeWidth = W * bounds.w;
    const featherPx = Math.max(24, wipeWidth * 0.08);

    ctx.clearRect(0, 0, W, H);
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = t * t * (3 - 2 * t);
      const edgeX = startX + wipeWidth * eased;

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(full, 0, 0);

      ctx.globalCompositeOperation = "destination-in";
      const grad = ctx.createLinearGradient(edgeX - featherPx, 0, edgeX, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, edgeX, H);
      ctx.globalCompositeOperation = "source-over";

      if (t < 1) {
        nameWipeRafRef.current = requestAnimationFrame(step);
      } else {
        nameWipeRafRef.current = null;
      }
    };

    nameWipeRafRef.current = requestAnimationFrame(step);
  };

  // ─── NAME RENDER ────────────────────────────────────────────────────

  useEffect(() => {
    if (!nameLocked || !name || !paperReady) return;

    const fontFamily = '"Segoe Print", "Bradley Hand", cursive';
    const color = "rgba(20,17,15,0.94)";
    const bounds = paperTextBoundsRef.current ?? { x: 0.13, y: 0.33, w: 0.74, h: 0.34 };
    const maxLines = getMaxLinesForLength(name);

    const lrCanvas = lowResPaperCanvas.current;
    if (lrCanvas) {
      const ctx = lrCanvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, SOURCE_W, SOURCE_H);
        if (paperPngRef.current) {
          ctx.drawImage(paperPngRef.current, 0, 0, SOURCE_W, SOURCE_H);
        }

        const maxW = SOURCE_W * bounds.w;
        const maxH = SOURCE_H * bounds.h;
        const cx = SOURCE_W * (bounds.x + bounds.w / 2);
        const cy = SOURCE_H * (bounds.y + bounds.h / 2);
        const fitted = fitNameMultiline(ctx, name, maxW, maxH, 22, fontFamily, maxLines);

        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `400 ${fitted.fontSize}px ${fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const startY = cy - ((fitted.lines.length - 1) * fitted.lineHeight) / 2;
        fitted.lines.forEach((line, i) =>
          ctx.fillText(line, cx, startY + i * fitted.lineHeight)
        );
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, SOURCE_W, SOURCE_H);
        lowResPaperData.current = new Uint8ClampedArray(imageData.data);
        const alpha = new Uint8ClampedArray(SOURCE_W * SOURCE_H);
        for (let i = 0; i < SOURCE_W * SOURCE_H; i++) {
          alpha[i] = imageData.data[i * 4 + 3];
        }
        lowResPaperAlpha.current = alpha;

        if (lowResCompositeCanvas.current) {
          const compCtx = lowResCompositeCanvas.current.getContext("2d");
          if (compCtx) {
            compCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
            compCtx.drawImage(lrCanvas, 0, 0);
          }
        }
      }
    }

    if (!nameFullCanvasRef.current) {
      nameFullCanvasRef.current = document.createElement("canvas");
    }
    const full = nameFullCanvasRef.current;
    full.width = W;
    full.height = H;
    const fctx = full.getContext("2d");
    if (fctx) {
      fctx.clearRect(0, 0, W, H);

      const maxW = W * bounds.w;
      const maxH = H * bounds.h;
      const cx = W * (bounds.x + bounds.w / 2);
      const cy = H * (bounds.y + bounds.h / 2);
      const fitted = fitNameMultiline(fctx, name, maxW, maxH, 90, fontFamily, maxLines);

      fctx.save();
      fctx.fillStyle = color;
      fctx.font = `400 ${fitted.fontSize}px ${fontFamily}`;
      fctx.textAlign = "center";
      fctx.textBaseline = "middle";
      const startY = cy - ((fitted.lines.length - 1) * fitted.lineHeight) / 2;
      fitted.lines.forEach((line, i) =>
        fctx.fillText(line, cx, startY + i * fitted.lineHeight)
      );
      fctx.restore();
    }

    const overlay = nameOverlayCanvasRef.current;
    if (overlay) {
      overlay.width = W;
      overlay.height = H;
    }
    animateNameWipe(NAME_WIPE_DURATION_MS);
  }, [nameLocked, name, paperReady]);

  // ─── COMPOSITOR ─────────────────────────────────────────────────────

  const initCompositor = () => {
    if (compositorStarted.current) return;
    compositorStarted.current = true;
    compositorEnded.current = false;
    finalRenderPending.current = false;

    const video = fireVideoRef.current;
    const burnCanvas = burnCanvasRef.current;
    const fireCanvas = fireCanvasRef.current;

    if (!video || !burnCanvas || !fireCanvas) {
      compositorStarted.current = false;
      return;
    }

    fireCanvas.width = W;
    fireCanvas.height = H;

    sourceCanvas.current = document.createElement("canvas");
    sourceCanvas.current.width = SOURCE_W;
    sourceCanvas.current.height = SOURCE_H;
    const sourceCtx = sourceCanvas.current.getContext("2d", { willReadFrequently: true });
    if (!sourceCtx) { compositorStarted.current = false; return; }

    fireMaskCanvas.current = document.createElement("canvas");
    fireMaskCanvas.current.width = SOURCE_W;
    fireMaskCanvas.current.height = SOURCE_H;
    const fireMaskCtx = fireMaskCanvas.current.getContext("2d", { willReadFrequently: true });
    if (!fireMaskCtx) { compositorStarted.current = false; return; }

    if (!lowResCompositeCanvas.current) {
      const comp = document.createElement("canvas");
      comp.width = SOURCE_W;
      comp.height = SOURCE_H;
      lowResCompositeCanvas.current = comp;
      if (lowResPaperCanvas.current) {
        const ctx = comp.getContext("2d");
        if (ctx) ctx.drawImage(lowResPaperCanvas.current, 0, 0);
      }
    }

    initialFrameRef.current = new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4);
    previousFrameRef.current = new Uint8ClampedArray(SOURCE_W * SOURCE_H * 4);

    let ended = false;
    let lastTime = -1;

    const render = () => {
      if (ended || !renderActive.current || compositorEnded.current) {
        loopId.current = null;
        return;
      }

      const scheduleNext = () => {
        if (typeof (video as any).requestVideoFrameCallback === "function") {
          (video as any).requestVideoFrameCallback(render);
        } else {
          loopId.current = requestAnimationFrame(render);
        }
      };

      if (video.readyState < 2) {
        scheduleNext();
        return;
      }

      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        scheduleNext();
        return;
      }

      const progress = Math.max(0, Math.min(1, video.currentTime / duration));
      const timeChanged = Math.abs(video.currentTime - lastTime) > 0.005;
      if (timeChanged) lastTime = video.currentTime;

      sourceCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      sourceCtx.drawImage(video, 0, 0, SOURCE_W, SOURCE_H);
      const frame = sourceCtx.getImageData(0, 0, SOURCE_W, SOURCE_H);
      const px = frame.data;

      if (!hasInitialRef.current) {
        const init = new Uint8ClampedArray(px);
        initialFrameRef.current = init;
        hasInitialRef.current = true;
        previousFrameRef.current = new Uint8ClampedArray(px);
        hasPreviousRef.current = true;
        compositorReady.current = true;
      }

      const fireMask = fireMaskData.current;
      const initPx = initialFrameRef.current!;
      const prevPx = previousFrameRef.current!;

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const ir = initPx[i], ig = initPx[i + 1], ib = initPx[i + 2];
        const sourceAlpha = chromaAlpha(r, g, b) / 255;
        if (sourceAlpha <= 0.01) {
          fireMask[i + 3] = 0;
          continue;
        }

        const diff = Math.abs(r - ir) + Math.abs(g - ig) + Math.abs(b - ib);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max > 0 ? (max - min) / max : 0;
        const warm = smoothstep(0, 35, r - g) * smoothstep(0, 40, g - b);
        const brightWarm = smoothstep(70, 170, luminance) * smoothstep(0.08, 0.25, saturation) * warm;

        let motion = 0;
        if (hasPreviousRef.current) {
          const dr = Math.abs(r - prevPx[i]);
          const dg = Math.abs(g - prevPx[i + 1]);
          const db = Math.abs(b - prevPx[i + 2]);
          motion = smoothstep(4, 28, (dr + dg + db) / 3);
        }

        const changed = smoothstep(18, 70, diff);
        const smokeLike = changed * smoothstep(35, 180, luminance) * (1 - smoothstep(0.28, 0.62, saturation));
        const effect = Math.max(changed, brightWarm * 0.95, motion * 0.75, smokeLike * 0.65);
        const alpha = Math.round(Math.max(0, Math.min(1, effect)) * sourceAlpha * 255);

        const spill = Math.max(0, g - Math.max(r, b));
        const cleanG = Math.round(g - spill * 0.42);
        fireMask[i] = r;
        fireMask[i + 1] = cleanG;
        fireMask[i + 2] = b;
        fireMask[i + 3] = alpha;
      }

      // const fireMaskImage = new ImageData(fireMask, SOURCE_W, SOURCE_H);
      // fireMaskCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      // fireMaskCtx.putImageData(fireMaskImage, 0, 0);

      const fireMaskImage = fireMaskCtx.createImageData(SOURCE_W, SOURCE_H);
      fireMaskImage.data.set(fireMask);
      fireMaskCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      fireMaskCtx.putImageData(fireMaskImage, 0, 0);

      const fireCtx = fireCanvas.getContext("2d");
      if (fireCtx) {
        fireCtx.clearRect(0, 0, W, H);
        fireCtx.imageSmoothingEnabled = true;
        const masked = document.createElement("canvas");
        masked.width = SOURCE_W;
        masked.height = SOURCE_H;
        const mCtx = masked.getContext("2d");
        if (mCtx) {
          mCtx.drawImage(video, 0, 0, SOURCE_W, SOURCE_H);
          mCtx.globalCompositeOperation = "destination-in";
          mCtx.drawImage(fireMaskCanvas.current!, 0, 0);
          mCtx.globalCompositeOperation = "source-over";
          fireCtx.drawImage(masked, 0, 0, W, H);
        }
      }

      const burnHasReachedEnd =
        progress >= 0.995 ||
        video.currentTime >= duration - 0.15 ||
        video.ended;

      if (burnHasReachedEnd && !videoEndedRef.current) {
        videoEndedRef.current = true;
        const mask = burnMask.current;
        const alphaArr = lowResPaperAlpha.current;
        if (alphaArr) {
          for (let i = 0; i < SOURCE_W * SOURCE_H; i++) {
            if (alphaArr[i] > 0) mask[i] = 1;
          }
        }
        burnMaskDirty.current = true;
        finalRenderPending.current = true;
      }

      if (timeChanged && !videoEndedRef.current && !compositorEnded.current) {
        const mask = burnMask.current;
        const alphaArr = lowResPaperAlpha.current;
        if (!alphaArr) { scheduleNext(); return; }
        const w = SOURCE_W;
        const h = SOURCE_H;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const fireAlpha = fireMask[idx * 4 + 3] / 255;
            if (fireAlpha < 0.025) continue;
            if (alphaArr[idx] <= 0.01) continue;
            const heatGain = 0.008 + fireAlpha * 0.024;
            mask[idx] = Math.min(1, mask[idx] + heatGain * fireAlpha * 0.6);
          }
        }

        const temp = tempDiffusion.current;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            let sum = mask[idx] * 0.6;
            let wsum = 0.6;
            if (x > 0 && alphaArr[idx - 1] > 0.01) { sum += mask[idx - 1] * 0.2; wsum += 0.2; }
            if (x < w - 1 && alphaArr[idx + 1] > 0.01) { sum += mask[idx + 1] * 0.2; wsum += 0.2; }
            temp[idx] = wsum > 0 ? sum / wsum : mask[idx];
          }
        }
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            let sum = temp[idx] * 0.6;
            let wsum = 0.6;
            if (y > 0 && alphaArr[idx - w] > 0.01) { sum += temp[idx - w] * 0.2; wsum += 0.2; }
            if (y < h - 1 && alphaArr[idx + w] > 0.01) { sum += temp[idx + w] * 0.2; wsum += 0.2; }
            mask[idx] = wsum > 0 ? Math.min(1, sum / wsum) : temp[idx];
          }
        }
        burnMaskDirty.current = true;
      }

      if (burnMaskDirty.current && lowResPaperData.current) {
        const paperData = lowResPaperData.current;
        const alphaArr = lowResPaperAlpha.current!;
        const mask = burnMask.current;
        const comp = compositeData.current;
        const burnImg = burnMaskImageData.current;
        const charImg = charImageData.current;
        const edgeImg = edgeImageData.current;

        const isFinal = finalRenderPending.current;

        for (let y = 0; y < SOURCE_H; y++) {
          for (let x = 0; x < SOURCE_W; x++) {
            const idx = y * SOURCE_W + x;
            const paperAlpha = alphaArr[idx] / 255;
            if (paperAlpha < 0.01) {
              const mi = idx * 4;
              comp[mi] = 0; comp[mi + 1] = 0; comp[mi + 2] = 0; comp[mi + 3] = 0;
              burnImg[mi] = 0; burnImg[mi+1] = 0; burnImg[mi+2] = 0; burnImg[mi+3] = 0;
              charImg[mi] = 0; charImg[mi+1] = 0; charImg[mi+2] = 0; charImg[mi+3] = 0;
              edgeImg[mi] = 0; edgeImg[mi+1] = 0; edgeImg[mi+2] = 0; edgeImg[mi+3] = 0;
              continue;
            }
            const d = mask[idx];
            const organic = 0.045 * Math.sin(x * 0.31 + y * 0.17) +
              0.028 * Math.sin(x * 0.067 - y * 0.21) +
              0.018 * Math.sin((x + y) * 0.43);
            const consumed = smoothstep(0.56 + organic, 0.86 + organic, d);
            const survival = paperAlpha * (1 - consumed);

            const mi = idx * 4;
            burnImg[mi] = 255; burnImg[mi+1] = 255; burnImg[mi+2] = 255; burnImg[mi+3] = Math.round(survival * 255);

            if (isFinal) {
              charImg[mi] = 0; charImg[mi+1] = 0; charImg[mi+2] = 0; charImg[mi+3] = 0;
              edgeImg[mi] = 0; edgeImg[mi+1] = 0; edgeImg[mi+2] = 0; edgeImg[mi+3] = 0;

              const ashPatch = 0.5 + 0.5 * Math.sin(x * 0.53 + y * 0.29) * Math.sin(x * 0.17 - y * 0.41);
              const ashAlpha = paperAlpha * Math.max(0, Math.min(1, 0.04 + ashPatch * 0.09));
              comp[mi] = 42; comp[mi+1] = 37; comp[mi+2] = 32; comp[mi+3] = Math.round(ashAlpha * 255);
            } else {
              const charStrength = paperAlpha * smoothstep(0.18, 0.58, d) * (1 - consumed * 0.65);
              charImg[mi] = 32; charImg[mi+1] = 20; charImg[mi+2] = 12; charImg[mi+3] = Math.round(charStrength * 150);

              const activeEdge = paperAlpha * smoothstep(0.20, 0.42, d) * (1 - smoothstep(0.55, 0.78, d));
              edgeImg[mi] = 255; edgeImg[mi+1] = 108; edgeImg[mi+2] = 22; edgeImg[mi+3] = Math.round(activeEdge * 52);

              const pr = paperData[mi], pg = paperData[mi+1], pb = paperData[mi+2];
              comp[mi] = pr; comp[mi+1] = pg; comp[mi+2] = pb; comp[mi+3] = Math.round(survival * 255);
            }
          }
        }

        const compCanvas = lowResCompositeCanvas.current;
        const burnMaskCanvas = lowResBurnMaskCanvas.current;
        const charCanvas = lowResCharCanvas.current;
        const edgeCanvas = lowResEdgeCanvas.current;

        if (compCanvas && burnMaskCanvas && charCanvas && edgeCanvas) {
          const compCtx = compCanvas.getContext("2d");
          const burnCtx = burnMaskCanvas.getContext("2d");
          const charCtx = charCanvas.getContext("2d");
          const edgeCtx = edgeCanvas.getContext("2d");

          if (compCtx && burnCtx && charCtx && edgeCtx) {
            // const compImageData = new ImageData(comp, SOURCE_W, SOURCE_H);
            // compCtx.putImageData(compImageData, 0, 0);

            // const burnImageData = new ImageData(burnImg, SOURCE_W, SOURCE_H);
            // burnCtx.putImageData(burnImageData, 0, 0);

            // const charImageDataObj = new ImageData(charImg, SOURCE_W, SOURCE_H);
            // charCtx.putImageData(charImageDataObj, 0, 0);

            // const edgeImageDataObj = new ImageData(edgeImg, SOURCE_W, SOURCE_H);
            // edgeCtx.putImageData(edgeImageDataObj, 0, 0);


            const compImageData = compCtx.createImageData(SOURCE_W, SOURCE_H);
            compImageData.data.set(comp);
            compCtx.putImageData(compImageData, 0, 0);

            const burnImageData = burnCtx.createImageData(SOURCE_W, SOURCE_H);
            burnImageData.data.set(burnImg);
            burnCtx.putImageData(burnImageData, 0, 0);

            const charImageDataObj = charCtx.createImageData(SOURCE_W, SOURCE_H);
            charImageDataObj.data.set(charImg);
            charCtx.putImageData(charImageDataObj, 0, 0);

            const edgeImageDataObj = edgeCtx.createImageData(SOURCE_W, SOURCE_H);
            edgeImageDataObj.data.set(edgeImg);
            edgeCtx.putImageData(edgeImageDataObj, 0, 0);
          }
        }

        burnMaskDirty.current = false;
      }

      const burnCtx = burnCanvas.getContext("2d");
      if (burnCtx && lowResCompositeCanvas.current) {
        burnCtx.clearRect(0, 0, W, H);
        burnCtx.imageSmoothingEnabled = true;
        burnCtx.drawImage(lowResCompositeCanvas.current, 0, 0, W, H);

        if (!finalRenderPending.current && lowResCharCanvas.current && lowResEdgeCanvas.current) {
          burnCtx.globalCompositeOperation = "source-over";
          burnCtx.drawImage(lowResCharCanvas.current, 0, 0, W, H);
          burnCtx.globalCompositeOperation = "screen";
          burnCtx.drawImage(lowResEdgeCanvas.current, 0, 0, W, H);
          burnCtx.globalCompositeOperation = "source-over";
        }
      }

      // if (hasPreviousRef.current) {
      //   previousFrameRef.current.set(px);
      // } else {
      //   previousFrameRef.current.set(px);
      //   hasPreviousRef.current = true;
      // }

      const previousFrame = previousFrameRef.current;

      if (previousFrame) {
        previousFrame.set(px);
      } else {
        previousFrameRef.current = new Uint8ClampedArray(px);
        hasPreviousRef.current = true;
      }

      if (finalRenderPending.current && !compositorEnded.current) {
        const ashCanvas = ashCanvasRef.current;

        if (ashCanvas) {
          ashCanvas.width = W;
          ashCanvas.height = H;

          const ashCtx = ashCanvas.getContext("2d");

          if (ashCtx) {
            ashCtx.clearRect(0, 0, W, H);
            ashCtx.drawImage(burnCanvas, 0, 0, W, H);
          }
        }

        compositorEnded.current = true;
        setPaperBurned(true);
        ended = true;
        loopId.current = null;
        return;
      }

      scheduleNext();
    };

    renderActive.current = true;

    const startLoop = () => {
      if (video.readyState < 2) {
        video.addEventListener("loadeddata", startLoop, { once: true });
        return;
      }

      video.pause();
      video.currentTime = 0;
      sourceCtx.clearRect(0, 0, SOURCE_W, SOURCE_H);
      sourceCtx.drawImage(video, 0, 0, SOURCE_W, SOURCE_H);
      const first = sourceCtx.getImageData(0, 0, SOURCE_W, SOURCE_H).data;
      initialFrameRef.current = new Uint8ClampedArray(first);
      previousFrameRef.current = new Uint8ClampedArray(first);
      hasInitialRef.current = true;
      hasPreviousRef.current = true;
      compositorReady.current = true;

      video.currentTime = 0;
      video.play().catch(() => { });
      videoEndedRef.current = false;

      if (typeof (video as any).requestVideoFrameCallback === "function") {
        (video as any).requestVideoFrameCallback(render);
      } else {
        loopId.current = requestAnimationFrame(render);
      }
    };

    startLoop();

    return () => {
      ended = true;
      renderActive.current = false;
      if (loopId.current !== null) {
        cancelAnimationFrame(loopId.current);
        loopId.current = null;
      }
      compositorStarted.current = false;
    };
  };

  useEffect(() => {
    if (!burning) return;
    initCompositor();
  }, [burning]);

  // ─── POST-BURN SEQUENCE ────────────────────────────────────────────

  useEffect(() => {
    if (!paperBurned || postBurnStage !== "idle") return;

    stopAudio(fireAudio.current, 700);
    stopAudio(rainAudio.current, 700);
    stopAudio(roomAudio.current, 700);

    const timer = trackedTimeout(() => {
      setPostBurnStage("silence");
    }, 750);
    return () => window.clearTimeout(timer);
  }, [paperBurned, postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "silence") return;
    const timer = trackedTimeout(() => {
      setPostBurnStage("breathing");
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "breathing") return;

    const phases: Array<"inhale" | "exhale"> = ["inhale", "exhale", "inhale", "exhale"];
    const phaseDuration = 4000;
    let phaseIndex = 0;
    let cancelled = false;

    const playBreath = () => {
      if (cancelled) return;
      if (phaseIndex >= phases.length) {
        setBreathPhase(null);
        setPostBurnStage("breathPause");
        return;
      }
      const phase = phases[phaseIndex];
      setBreathPhase(phase);
      playOnce(phase === "inhale" ? inhaleAudio.current : exhaleAudio.current, 0.45);
      phaseIndex++;
      trackedTimeout(playBreath, phaseDuration);
    };

    const startTimer = trackedTimeout(playBreath, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
    };
  }, [postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "breathPause") return;
    const timer = trackedTimeout(() => {
      setPostBurnStage("release");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "release") return;

    setWorldChanged(true);

    const windTimer = trackedTimeout(() => {
      const wind = subtleWindAudio.current;
      if (wind) {
        wind.loop = true;
        wind.volume = 0;
        wind.play().catch(() => {});
        fadeAudio(wind, 0.045, 3500);
      }
    }, 400);

    const ambienceTimer = trackedTimeout(() => {
      const amb = releaseAmbienceAudio.current;
      if (amb) {
        amb.loop = true;
        amb.volume = 0;
        amb.play().catch(() => {});
        fadeAudio(amb, 0.13, 4500);
      }
    }, 900);

    let rayStep = 0;
    const totalSteps = 80;
    const rayInterval = trackedInterval(() => {
      rayStep++;
      const t = smoothstep(0, 1, rayStep / totalSteps);
      setReleaseRaysOpacity(Math.min(0.17, t * 0.17));
      setDustOpacity(Math.min(0.5, t * 0.1));
      if (rayStep >= totalSteps) {
        clearTrackedInterval(rayInterval);

        fadeAudio(subtleWindAudio.current, 0, 3000);

        trackedTimeout(() => {
          setShowLetGoText(true);
          trackedTimeout(() => {
            setPostBurnStage("affirmation");
          }, 2600);
        }, 900);
      }
    }, 100);

    return () => {
      window.clearTimeout(windTimer);
      window.clearTimeout(ambienceTimer);
      clearTrackedInterval(rayInterval);
    };
  }, [postBurnStage]);

  useEffect(() => {
    if (postBurnStage !== "affirmation") return;

    const timer = trackedTimeout(() => {
      setPostBurnStage("memory");
    }, 9000);

    return () => window.clearTimeout(timer);
  }, [postBurnStage]);

  // ─── MEMORY PROMPT / CARD ──────────────────────────────────────────

  const openMemoryCard = () => {
    setShowMemoryPrompt(false);
    setShowCardCheckout(true);
    setPostBurnStage("checkout");
  };

  const skipMemoryCard = () => {
    setShowMemoryPrompt(false);
    setShowCardCheckout(false);
    setShowFinalExit(true);
    setPostBurnStage("final");
  };

  const handleCardPayment = () => {
    setShowCardCheckout(false);
    setShowCard(true);
    setPostBurnStage("card");
  };

  const handleSaveCard = () => {
    window.print();
  };

  const handleCardContinue = () => {
    setShowCard(false);
    setShowDonation(true);
    setPostBurnStage("donation");
  };

  useEffect(() => {
    if (!name || postBurnStage !== "card") return;

    const compute = () => {
      const el = cardContentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxW = rect.width * 0.88;
      const maxH = rect.height * 0.32;
      const maxLines = getMaxLinesForLength(name);
      const size = measureNameFontSizeMultiline(
        name,
        maxW,
        maxH,
        56,
        maxLines,
        '"Segoe Print", "Bradley Hand", cursive'
      );
      setCardNameFontSize(size);
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [name, postBurnStage]);

  // ─── RENDER ──────────────────────────────────────────────────────────

  return (
    <main className="scene">
      <audio ref={rainAudio} src={`${AUDIO_BASE}/rain.mp3`} preload="auto" />
      <audio ref={roomAudio} src={`${AUDIO_BASE}/room.mp3`} preload="auto" />
      <audio ref={fireAudio} src={`${AUDIO_BASE}/fire.mp3`} preload="auto" />
      <audio ref={clickAudio} src={`${AUDIO_BASE}/click.mp3`} preload="auto" />
      <audio ref={inhaleAudio} src={`${AUDIO_BASE}/inhale.mp3`} preload="auto" />
      <audio ref={exhaleAudio} src={`${AUDIO_BASE}/exhale.mp3`} preload="auto" />
      <audio ref={subtleWindAudio} src={`${AUDIO_BASE}/subtle-wind.mp3`} preload="auto" />
      <audio ref={releaseAmbienceAudio} src={`${AUDIO_BASE}/release-ambience.mp3`} preload="auto" />

      <motion.div
        ref={sceneCameraRef}
        className="scene-camera"
        initial={{ scale: 1, x: 0, y: 0 }}
        animate={{ scale: cameraTarget.scale, x: cameraTarget.x, y: cameraTarget.y }}
        transition={{ duration: started ? 5 : 12, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="breath-scale-wrapper"
          animate={
            postBurnStage === "breathing"
              ? { scale: breathPhase === "inhale" ? 1.004 : 1 }
              : { scale: 1 }
          }
          transition={{ duration: 4, ease: "easeInOut" }}
        >
          <motion.img
            src={`${ASSET_BASE}/PERSON.png`}
            className="layer person-breathing"
            alt=""
            animate={{ scaleY: [1, 1.007, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {staticLayers.map((layer) => (
            <motion.img
              key={layer}
              src={`${ASSET_BASE}/${layer}`}
              className="layer"
              alt=""
              animate={{ opacity: 1 }}
              transition={{ duration: 0 }}
            />
          ))}

          <canvas
            ref={burnCanvasRef}
            className={`burn-paper-canvas ${paperReady ? "burn-paper-canvas--active" : ""}`}
            aria-hidden="true"
          />

          <canvas
            ref={nameOverlayCanvasRef}
            className="name-overlay-canvas"
            aria-hidden="true"
          />

          <canvas
            ref={ashCanvasRef}
            className={`burn-ash-canvas ${paperBurned ? "burn-ash-canvas--visible" : ""}`}
            aria-hidden="true"
          />

          <div className="burn-fire-window" aria-hidden="true">
            <canvas
              ref={fireCanvasRef}
              className="burn-fire-canvas burn-fire-canvas--active"
            />
            <video
              ref={fireVideoRef}
              className="burn-fire-source"
              src={`${ASSET_BASE}/fire-sources.mp4`}
              muted
              playsInline
              preload="auto"
            />
          </div>

          {/* ─── ASH WARM GLOW ─── */}
          {paperBurned && (
            <motion.div
              className="ash-warm-glow"
              style={{ opacity: releaseRaysOpacity > 0 ? Math.min(1, releaseRaysOpacity / 0.17) : 0 }}
              aria-hidden="true"
            />
          )}

          {/* ─── LAMP GLOW ─── */}
          <motion.div
            className="lamp-glow"
            animate={{
              opacity: flicker ? [0.8, 0.2, 0.8] : (worldChanged ? [0.5, 0.56, 0.5] : [0.48, 0.5, 0.48]),
              scale: flicker ? [1.05, 0.95, 1.05] : (worldChanged ? [1.02, 1.03, 1.02] : [1.03, 1.02, 1.03]),
            }}
            transition={{
              duration: flicker ? 0.3 : (worldChanged ? 6.5 : 30),
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* ─── CURTAIN ─── */}
          <motion.img
            src={`${ASSET_BASE}/CURTAIN.png`}
            className="layer curtain"
            alt=""
            animate={
              postBurnStage === "breathing"
                ? { x: breathPhase === "inhale" ? [0, 3] : [3, 0], rotate: breathPhase === "inhale" ? [0, 0.15] : [0.15, 0] }
                : worldChanged
                ? { x: [0, 9, -4, 6, 0], rotate: [0, 0.14, -0.08, 0.12, 0] }
                : { x: [0, 0, -2, 0, 0], rotate: [0, 0.5, -0.3, 0.4, 0] }
            }
            transition={
              postBurnStage === "breathing"
                ? { duration: 2, ease: "easeInOut" }
                : { duration: worldChanged ? 22 : 15, repeat: Infinity, ease: "easeInOut" }
            }
          />

          <video
            className={`steam-video ${worldChanged ? "steam-video--warm" : ""}`}
            src={`${ASSET_BASE}/steam.mp4`}
            autoPlay
            loop
            muted
            playsInline
          />

          <motion.div
            className="rain"
            animate={{ opacity: paperBurned ? 0 : 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
          >
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
          </motion.div>

          <div className="film-grain" />

          {/* ─── RELEASE RAYS & DUST ────────────────────────────────── */}
          {(postBurnStage === "release" ||
            postBurnStage === "memory" ||
            postBurnStage === "checkout" ||
            postBurnStage === "card" ||
            postBurnStage === "donation" ||
            postBurnStage === "final") && (
            <>
              <motion.img
                src={`${ASSET_BASE}/release/release-rays.png`}
                className="release-rays"
                style={{
                  opacity: releaseRaysOpacity,
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "1672px",
                  height: "941px",
                  objectFit: "cover",
                  pointerEvents: "none",
                  zIndex: 35,
                }}
                initial={{ scale: 1, x: 0, y: 0 }}
                animate={{
                  scale: [1, 1.02, 1.01, 1.03, 1],
                  x: [0, 2, -1, 1, 0],
                  y: [0, -1, 1, 0, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src={`${ASSET_BASE}/release/release-dust.png`}
                className="release-dust"
                style={{
                  opacity: dustOpacity,
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "1672px",
                  height: "941px",
                  objectFit: "cover",
                  pointerEvents: "none",
                  zIndex: 36,
                }}
                animate={{ x: [0, 3, -2, 1, 0], y: [0, -1, 2, 0, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}

          {/* ─── WARM LIGHT OVERLAY ────────────────────────────────── */}
          {worldChanged && (
            <motion.div
              className="room-warmth-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0.12, 0.18, 0.14] }}
              transition={{ duration: 12, ease: "easeOut" }}
            />
          )}

          {worldChanged && (
            <>
              <motion.div
                className="window-daylight"
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: [0.85, 0.78, 0.85], scale: [1, 1.008, 1] }}
                transition={{
                  duration: 8,
                  delay: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                aria-hidden="true"
              />
              <motion.div
                className="sun-rays"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: [0.85, 0.78, 0.85], x: 0 }}
                transition={{
                  opacity: { duration: 8, delay: 0.7, repeat: Infinity, ease: "easeInOut" },
                  x: { duration: 8, delay: 0.7, ease: "easeOut" },
                }}
                aria-hidden="true"
              >
                <span className="sun-ray sun-ray-1" />
                <span className="sun-ray sun-ray-2" />
                <span className="sun-ray sun-ray-3" />
              </motion.div>
              <motion.div
                className="sunlight-patch"
                initial={{ opacity: 0, scale: 0.72, x: -20 }}
                animate={{ opacity: [0.38, 0.34, 0.38], scale: [1, 1.006, 1] }}
                transition={{
                  duration: 8,
                  delay: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                aria-hidden="true"
              />
              <motion.div
                className="room-warmth"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.38, 0.34, 0.38] }}
                transition={{ duration: 8, delay: 4, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              />
            </>
          )}
        </motion.div>
      </motion.div>

      {/* ─── IMMERSION GUIDE ────────────────────────────────────────── */}
      <AnimatePresence>
        {!guideDismissed && !started && (
          <motion.div
            className="immersion-guide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            onPointerDown={() => {
              setGuideDismissed(true);
              playOnce(clickAudio.current, 0.15);
            }}
          >
            <div className="immersion-guide-content">
              <p className="guide-eyebrow">BEFORE YOU BEGIN</p>
              <h2 className="guide-title">IMMERSE YOURSELF</h2>
              <div className="guide-divider" />

              <ul className="guide-list">
                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                  </span>
                  <span>Use headphones for a richer, more intimate experience.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </span>
                  <span>Follow the text as it appears — let it guide your focus.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M2 10v4M6 6v12M10 8v8M14 4v16M18 6v12M22 10v4" />
                    </svg>
                  </span>
                  <span>Attune to the surrounding audio scene. Let it hold you.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </span>
                  <span>Bring your emotions exactly as they are.</span>
                </li>

                <li className="guide-item">
                  <span className="guide-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <span>There is no rush. Take your time.</span>
                </li>
              </ul>

              <p className="guide-all-the-best">All the best.</p>
              <p className="guide-dismiss">(tap anywhere to continue)</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── RITUAL BEGIN OVERLAY ────────────────────────────────────── */}
      <AnimatePresence>
        {introFinished && !showPaper && !nameLocked && !started && (
          <motion.div
            className="begin-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            <div className="begin-scrim" />
            <motion.p
              className="begin-title"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2, delay: 0.3 }}
            >
              LET GO
            </motion.p>
            <motion.div
              className="begin-divider"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 1.2, delay: 1.6 }}
            />
            <motion.p
              className="begin-subtitle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 2.4 }}
            >
              Some things are easier to release than to keep carrying.
            </motion.p>
            <motion.button
              className="begin-button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, delay: 4.4 }}
              onClick={handleBeginRitual}
            >
              BEGIN
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PAPER INSTRUCTION ───────────────────────────────────────── */}
      <motion.div
        className="paper-instruction"
        initial={{ opacity: 0 }}
        animate={{ opacity: showPaper && !paperBurned ? 1 : 0 }}
        transition={{ delay: showPaper ? 4.5 : 0, duration: 2 }}
      >
        {!nameLocked && (
          <>
            <p>Write the name you're ready to let go of.</p>
            <input
              className="name-input"
              type="text"
              placeholder="write their name..."
              autoComplete="off"
              maxLength={70}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim() !== "") {
                  setNameLocked(true);
                  playOnce(clickAudio.current, 0.2);
                }
              }}
            />
          </>
        )}
      </motion.div>

      {/* ─── BREATHING PHASE ────────────────────────────────────────── */}
      {postBurnStage === "breathing" && breathPhase && (
        <motion.div
          className="breathing-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 4 }}
        >
          <p className="breath-label">
            {breathPhase === "inhale" ? "INHALE" : "EXHALE"}
            <span className="breath-sub">{breathPhase === "inhale" ? "吸う" : "吐く"}</span>
          </p>
        </motion.div>
      )}

      {/* ─── AFFIRMATION PHASE ────────────────────────────────────────── */}
      {postBurnStage === "affirmation" && (
        <motion.div
          className="affirmation-sequence"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 4 }}
        >
          <div className="affirmation-line">
            <span className="affirmation-en">You can put it down now.</span>
            <span className="affirmation-jp">もう、手放していい。</span>
          </div>
          <div className="affirmation-line">
            <span className="affirmation-en">You don't have to carry it anymore.</span>
            <span className="affirmation-jp">もう、抱えていかなくていい。</span>
          </div>
          <div className="affirmation-line">
            <span className="affirmation-en">What happened can stay in the past.</span>
            <span className="affirmation-jp">起きたことは、過去に置いていい。</span>
          </div>
          <div className="affirmation-line">
            <span className="affirmation-en">You are free to move forward.</span>
            <span className="affirmation-jp">これから先へ、進んでいい。</span>
          </div>
        </motion.div>
      )}

      {/* ─── LET GO TEXT ───────────────────────────────────────────── */}
      {showLetGoText && postBurnStage === "release" && (
        <motion.div
          className="let-go-text-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4, ease: "easeOut" }}
        >
          <p className="let-go-text">LET GO</p>
          <p className="let-go-sub">手放す</p>
        </motion.div>
      )}

      {/* ─── MEMORY PROMPT ───────────────────────────────────────────── */}
      <AnimatePresence>
        {postBurnStage === "memory" && (
          <motion.div
            className="memory-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          >
            <div className="memory-prompt-content">
              <p className="memory-prompt-title">Would you like to preserve this moment?</p>
              <p className="memory-prompt-subtitle">Keep a small reminder of what you chose to release.</p>
              <div className="memory-prompt-actions">
                <button className="memory-prompt-btn primary" onClick={() => { openMemoryCard(); playOnce(clickAudio.current, 0.2); }}>
                  YES
                </button>
                <button className="memory-prompt-btn secondary" onClick={() => { skipMemoryCard(); playOnce(clickAudio.current, 0.2); }}>
                  NO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CHECKOUT ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {postBurnStage === "checkout" && (
          <div className="card-checkout-stage">
            <motion.div
              className="card-checkout"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="card-checkout-eyebrow">A SMALL KEEPSAKE</span>
              <p className="card-checkout-title">Keep a piece of this moment.</p>
              <p className="card-checkout-copy">
                A personalized LET GO card with their name
                and the date you chose to let go.
              </p>
              <div className="card-price">₹5</div>
              <button className="card-payment-button" onClick={() => { handleCardPayment(); playOnce(clickAudio.current, 0.2); }}>
                CREATE MY CARD — ₹5
              </button>
              <button className="card-payment-later" onClick={() => { skipMemoryCard(); playOnce(clickAudio.current, 0.2); }}>
                NOT NOW
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PERSONALIZED KEEPSAKE CARD ────────────────────────────────── */}
      {postBurnStage === "card" && (
        <>
          <motion.div
            className="card-stage-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          />
          <div className="keepsake-card-stage">
            <motion.div
              className="keepsake-card"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 2.2, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="card-paper-texture" aria-hidden="true" />
              <div className="card-inner-frame" aria-hidden="true" />

              <motion.img
                src={`${ASSET_BASE}/card/botanical.png`}
                className="card-botanical card-botanical-top"
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.80 }}
                transition={{ duration: 1.6, delay: 1.0 }}
              />

              <div className="card-content" ref={cardContentRef}>
                <motion.p
                  className="card-kicker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.3, delay: 1.2 }}
                >
                  A MOMENT RELEASED
                </motion.p>

                <motion.img
                  src={`${ASSET_BASE}/card/ornament.png`}
                  className="card-ornament-img"
                  alt=""
                  aria-hidden="true"
                  initial={{ opacity: 0, scaleX: 0.6 }}
                  animate={{ opacity: 20, scaleX: 2 }}
                  transition={{ duration: 1.2, delay: 1.4 }}
                />

                <motion.h2
                  className="card-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.6, delay: 1.6 }}
                >
                  <span className="card-title-en">LET GO</span>
                  <span className="card-title-jp">手放す</span>
                </motion.h2>

                <motion.div
                  className="card-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.6, delay: 2.0 }}
                >
                  <p className="card-subtitle">You released</p>
                  <p className="card-handwritten-name" style={{ fontSize: `${cardNameFontSize}px` }}>{name}</p>
                  <p className="card-date">
                    {new Date()
                      .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                      .toUpperCase()}
                  </p>
                  <p className="card-quote">You chose to let go.</p>
                </motion.div>
              </div>

              <motion.img
                src={`${ASSET_BASE}/card/landscape.png`}
                className="card-landscape"
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ duration: 2, delay: 2.2 }}
              />

              <motion.img
                src={`${ASSET_BASE}/card/botanical-bottom.png`}
                className="card-botanical card-botanical-bottom"
                alt=""
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 1.6, delay: 2.3 }}
              />

              <motion.div
                className="card-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.3, delay: 2.5 }}
              >
                <button
                  className="card-action-save"
                  aria-label="Save my card"
                  onClick={() => { handleSaveCard(); playOnce(clickAudio.current, 0.2); }}
                >
                  SAVE MY CARD
                </button>
                <button
                  className="card-action-continue"
                  aria-label="Continue"
                  onClick={() => { handleCardContinue(); playOnce(clickAudio.current, 0.2); }}
                >
                  CONTINUE
                </button>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}

      {/* ─── DONATION ──────────────────────────────────────────────────── */}
      {postBurnStage === "donation" && (
        <motion.div
          className="donation-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
        >
          <div className="donation-card">
            <span className="donation-eyebrow">KEEP LET GO ALIVE</span>
            <p className="donation-title">If this moment helped you breathe a little easier, you can help keep LET GO here for someone else.</p>
            <p className="donation-note">Completely optional. The experience remains yours either way.</p>
            <button className="donation-primary-button" onClick={() => { setShowDonation(false); setShowFinalExit(true); setPostBurnStage("final"); playOnce(clickAudio.current, 0.2); }}>
              SUPPORT LET GO
            </button>
            <button className="donation-secondary-button" onClick={() => { setShowDonation(false); setShowFinalExit(true); setPostBurnStage("final"); playOnce(clickAudio.current, 0.2); }}>
              NOT NOW
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── FINAL EXIT ────────────────────────────────────────────────── */}
      {postBurnStage === "final" && (
        <motion.div
          className="final-exit"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5 }}
        >
          <p>You can come back whenever you need to let something go.</p>
          <button onClick={() => { window.location.reload(); playOnce(clickAudio.current, 0.2); }}>
            RETURN
          </button>
        </motion.div>
      )}
    </main>
  );
}
