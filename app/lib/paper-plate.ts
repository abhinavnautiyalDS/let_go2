/**
 * Live compositor for the practical paper burn.
 *
 * The source footage owns the paper, folds, flames, smoke and ash. The visitor
 * name is painted into that live plate on every decoded frame, using the
 * largest connected paper region as its moving coordinate system. Ink is
 * texture-modulated and multiplied into the paper pixels so it reads as
 * absorbed handwriting rather than a floating text layer.
 */
export type PaperPlateOptions = {
  video: HTMLVideoElement;
  target: HTMLCanvasElement;
  name: string;
  fontFamily?: string;
  opacity?: number;
};

type Point = { x: number; y: number };
type PaperAxes = {
  cx: number; cy: number; ux: number; uy: number; vx: number; vy: number;
  minU: number; maxU: number; minV: number; maxV: number;
};
type PlateCache = {
  source: HTMLCanvasElement;
  plate: HTMLCanvasElement;
  ink: HTMLCanvasElement;
  width: number;
  height: number;
  sheetW: number;
  sheetH: number;
  lastAxes: PaperAxes | null;
};
const caches = new WeakMap<HTMLCanvasElement, PlateCache>();

function greenAlpha(r: number, g: number, b: number): number {
  const dominance = g - (r + b) * 0.5;
  const ratio = g / Math.max(1, (r + b) * 0.5);
  const t = Math.max(0, Math.min(1, (dominance - 7) / 25));
  const q = Math.max(0, Math.min(1, (ratio - 1.05) / 0.18));
  return Math.round((1 - (t * t * (3 - 2 * t)) * (q * q * (3 - 2 * q))) * 255);
}

function isPaper(r: number, g: number, b: number): boolean {
  const lum = (r * 3 + g * 4 + b) / 8;
  return r > 72 && r < 218 && g > 48 && g < 184 &&
    b > 22 && b < 142 && r - g > 7 && r - g < 76 &&
    g - b > 5 && g - b < 72 && lum > 58 && lum < 185;
}

/**
 * Find the dominant connected sheet, not the PCA of every tan pixel in the
 * frame. The old all-pixel PCA mixed separate paper fragments and ash into
 * one imaginary plane, which made the name drift and rotate independently
 * from the sheet.
 */
function findPaperAxes(data: Uint8ClampedArray, width: number, height: number): PaperAxes | null {
  const step = 2;
  const gw = Math.ceil(width / step);
  const gh = Math.ceil(height / step);
  const mask = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const x = gx * step, y = gy * step;
      const i = (y * width + x) * 4;
      if (isPaper(data[i], data[i + 1], data[i + 2])) mask[gy * gw + gx] = 1;
    }
  }

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let largest: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let head = 0, tail = 0;
    const component: number[] = [];
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const index = queue[head++];
      component.push(index);
      const x = index % gw, y = Math.floor(index / gw);
      const neighbours = [
        x > 0 ? index - 1 : -1,
        x + 1 < gw ? index + 1 : -1,
        y > 0 ? index - gw : -1,
        y + 1 < gh ? index + gw : -1,
      ];
      for (const next of neighbours) {
        if (next >= 0 && mask[next] && !visited[next]) {
          visited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    if (component.length > largest.length) largest = component;
  }
  if (largest.length < 55) return null;

  const points: Point[] = largest.map((index) => ({
    x: (index % gw) * step,
    y: Math.floor(index / gw) * step,
  }));
  let sx = 0, sy = 0;
  for (const p of points) { sx += p.x; sy += p.y; }
  const cx = sx / points.length, cy = sy / points.length;
  let xx = 0, yy = 0, xy = 0;
  for (const p of points) {
    const dx = p.x - cx, dy = p.y - cy;
    xx += dx * dx; yy += dy * dy; xy += dx * dy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const vx = -uy, vy = ux;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const p of points) {
    const dx = p.x - cx, dy = p.y - cy;
    const u = dx * ux + dy * uy, v = dx * vx + dy * vy;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  return { cx, cy, ux, uy, vx, vy, minU, maxU, minV, maxV };
}

function getCache(target: HTMLCanvasElement, video: HTMLVideoElement): PlateCache {
  const width = Math.max(1, Math.round(video.videoWidth * 0.375));
  const height = Math.max(1, Math.round(video.videoHeight * 0.375));
  const existing = caches.get(target);
  if (existing && existing.width === width && existing.height === height) return existing;
  const source = document.createElement("canvas");
  const plate = document.createElement("canvas");
  const ink = document.createElement("canvas");
  source.width = plate.width = ink.width = width;
  source.height = plate.height = ink.height = height;
  const next = { source, plate, ink, width, height, sheetW: 0, sheetH: 0, lastAxes: null };
  caches.set(target, next);
  return next;
}

export function renderPaperPlate({
  video, target, name, opacity = 1,
  fontFamily = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
}: PaperPlateOptions): boolean {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
  const cache = getCache(target, video);
  const { source, plate, ink, width, height } = cache;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  const pctx = plate.getContext("2d");
  const ictx = ink.getContext("2d", { willReadFrequently: true });
  const tctx = target.getContext("2d");
  if (!sctx || !pctx || !ictx || !tctx) return false;

  sctx.drawImage(video, 0, 0, width, height);
  const frame = sctx.getImageData(0, 0, width, height);
  const px = frame.data;
  const keyed = pctx.createImageData(width, height);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    keyed.data[i + 3] = greenAlpha(r, g, b);
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const paper = isPaper(r, g, b);
    const warmFlame = r > g && g > b && luminance > 78
      ? Math.max(0, Math.min(1, (r - g + 10) / 58)) *
        Math.max(0, Math.min(1, (g - b + 8) / 72)) *
        Math.max(0, Math.min(1, (luminance - 65) / 115))
      : 0;
    const contrast = (value: number) => (value - 112) * 1.055 + 112;
    const warmth = paper ? 1 : warmFlame;
    keyed.data[i] = Math.max(0, Math.min(255, contrast(r) + (paper ? 5 : warmth * 12)));
    keyed.data[i + 1] = Math.max(0, Math.min(255, contrast(g) + (paper ? 2 : warmth * 15)));
    keyed.data[i + 2] = Math.max(0, Math.min(255, contrast(b) - (paper ? 5 : warmth * 13)));
  }
  pctx.putImageData(keyed, 0, 0);

  const targetWidth = target.width || 1280;
  const targetHeight = target.height || 720;
  const drawW = targetWidth;
  const drawH = targetHeight;
  ictx.clearRect(0, 0, width, height);

  if (name.trim()) {
    const detected = findPaperAxes(px, width, height);
    if (detected) {
      const previous = cache.lastAxes;
      if (previous) {
        const dot = detected.ux * previous.ux + detected.uy * previous.uy;
        if (dot < 0) {
          detected.ux *= -1; detected.uy *= -1;
          detected.vx *= -1; detected.vy *= -1;
          const oldMinU = detected.minU, oldMaxU = detected.maxU;
          const oldMinV = detected.minV, oldMaxV = detected.maxV;
          detected.minU = -oldMaxU; detected.maxU = -oldMinU;
          detected.minV = -oldMaxV; detected.maxV = -oldMinV;
        }
        const blend = 0.42;
        const mix = (a: number, b: number) => a + (b - a) * blend;
        detected.cx = mix(previous.cx, detected.cx);
        detected.cy = mix(previous.cy, detected.cy);
        detected.ux = mix(previous.ux, detected.ux);
        detected.uy = mix(previous.uy, detected.uy);
        const norm = Math.hypot(detected.ux, detected.uy) || 1;
        detected.ux /= norm; detected.uy /= norm;
        detected.vx = -detected.uy; detected.vy = detected.ux;
        detected.minU = mix(previous.minU, detected.minU);
        detected.maxU = mix(previous.maxU, detected.maxU);
        detected.minV = mix(previous.minV, detected.minV);
        detected.maxV = mix(previous.maxV, detected.maxV);
      }
      cache.lastAxes = { ...detected };
      const currentW = detected.maxU - detected.minU;
      const currentH = detected.maxV - detected.minV;
      if (!cache.sheetW && currentW > 20 && currentH > 12) {
        cache.sheetW = currentW;
        cache.sheetH = currentH;
      }
      const sheetW = cache.sheetW || currentW;
      const sheetH = cache.sheetH || currentH;
      if (sheetW > 20 && sheetH > 12) {
        const fontSize = Math.max(10, Math.min(sheetH * 0.19, sheetW * 0.105));
        ictx.save();
        ictx.translate(detected.cx, detected.cy);
        ictx.rotate(Math.atan2(detected.uy, detected.ux));
        ictx.fillStyle = "rgba(43, 29, 20, 0.92)";
        ictx.textAlign = "center";
        ictx.textBaseline = "middle";
        ictx.font = `400 ${fontSize}px ${fontFamily}`;
        const maxWidth = sheetW * 0.76;
        const words = name.trim().split(/\s+/);
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
          const candidate = line ? line + " " + word : word;
          if (ictx.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else line = candidate;
        }
        if (line) lines.push(line);
        while (lines.length > 2) lines.splice(1, 1, lines.slice(1).join(" "));
        const lineHeight = fontSize * 1.22;
        lines.forEach((value, index) =>
          ictx.fillText(value, 0, (index - (lines.length - 1) / 2) * lineHeight, maxWidth)
        );
        ictx.restore();

        // Break the perfectly digital alpha edge with the actual paper's
        // luminance and fibre variation. The ink darkens existing pixels
        // rather than sitting above them as an opaque vector layer.
        const inkFrame = ictx.getImageData(0, 0, width, height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const alpha = inkFrame.data[i + 3];
            if (!alpha) continue;
            if (!isPaper(px[i], px[i + 1], px[i + 2])) {
              inkFrame.data[i + 3] = 0;
              continue;
            }
            const r = px[i], g = px[i + 1], b = px[i + 2];
            const luminance = (r * 3 + g * 4 + b) / 8;
            const fibre = Math.max(0.48, Math.min(1, 0.76 + (luminance - 105) / 300 + (r - g) / 420));
            inkFrame.data[i + 3] = Math.round(alpha * fibre);
            inkFrame.data[i] = 47;
            inkFrame.data[i + 1] = 32;
            inkFrame.data[i + 2] = 23;
          }
        }
        ictx.putImageData(inkFrame, 0, 0);
        pctx.save();
        pctx.globalCompositeOperation = "multiply";
        pctx.globalAlpha = 0.88;
        pctx.drawImage(ink, 0, 0);
        pctx.restore();
      }
    }
  }

  tctx.clearRect(0, 0, targetWidth, targetHeight);
  tctx.save();
  tctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  tctx.imageSmoothingEnabled = true;
  // Match the static first-frame plate exactly: no extra 6% zoom on the
  // moving source, which was the visible size/position jump at BEGIN.
  tctx.drawImage(plate, 0, 0, drawW, drawH);
  const glow = tctx.createRadialGradient(
    targetWidth * 0.51, targetHeight * 0.67, targetWidth * 0.012,
    targetWidth * 0.51, targetHeight * 0.67, targetWidth * 0.29
  );
  glow.addColorStop(0, "rgba(255, 174, 72, 0.105)");
  glow.addColorStop(0.42, "rgba(255, 137, 48, 0.045)");
  glow.addColorStop(1, "rgba(255, 120, 35, 0)");
  tctx.globalCompositeOperation = "screen";
  tctx.fillStyle = glow;
  tctx.fillRect(0, 0, targetWidth, targetHeight);
  tctx.restore();
  return true;
}
