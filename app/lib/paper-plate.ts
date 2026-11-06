/**
 * Live compositor for the green-screen practical burn plate.
 *
 * The video supplies the real paper, flame, smoke and ash. The visitor's ink
 * is redrawn in the paper's current orientation and clipped to the surviving
 * paper-material pixels on every decoded frame. There is no independent
 * left-to-right name wipe.
 */

export type PaperPlateOptions = {
  video: HTMLVideoElement;
  target: HTMLCanvasElement;
  name: string;
  fontFamily?: string;
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
};
const caches = new WeakMap<HTMLCanvasElement, PlateCache>();

function greenAlpha(r: number, g: number, b: number): number {
  const dominance = g - (r + b) * 0.5;
  const ratio = g / Math.max(1, (r + b) * 0.5);
  const t = Math.max(0, Math.min(1, (dominance - 7) / 25));
  const q = Math.max(0, Math.min(1, (ratio - 1.05) / 0.18));
  const smoothT = t * t * (3 - 2 * t);
  const smoothQ = q * q * (3 - 2 * q);
  return Math.round((1 - smoothT * smoothQ) * 255);
}

function isPaper(r: number, g: number, b: number): boolean {
  const lum = (r * 3 + g * 4 + b) / 8;
  return r > 72 && r < 218 && g > 48 && g < 184 &&
    b > 22 && b < 142 && r - g > 7 && r - g < 76 &&
    g - b > 5 && g - b < 72 && lum > 58 && lum < 185;
}

/** Estimate the oriented bounds of surviving tan/brown sheet material. */
function findPaperAxes(data: Uint8ClampedArray, width: number, height: number): PaperAxes | null {
  let sx = 0, sy = 0, count = 0;
  const points: Point[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (!isPaper(data[i], data[i + 1], data[i + 2])) continue;
      points.push({ x, y });
      sx += x; sy += y; count++;
    }
  }
  if (count < 80) return null;

  const cx = sx / count, cy = sy / count;
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
  const next = { source, plate, ink, width, height, sheetW: 0, sheetH: 0 };
  caches.set(target, next);
  return next;
}

/**
 * Draw a keyed source frame and the name projected onto its surviving sheet.
 * The practical footage is 16:9; the target canvas keeps its existing scene
 * dimensions and CSS transform.
 */
export function renderPaperPlate({
  video, target, name,
  fontFamily = '"Segoe Print", "Bradley Hand", cursive',
}: PaperPlateOptions): boolean {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;

  const cache = getCache(target, video);
  const { source, plate, ink, width, height } = cache;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  const pctx = plate.getContext("2d");
  const ictx = ink.getContext("2d");
  const tctx = target.getContext("2d");
  if (!sctx || !pctx || !ictx || !tctx) return false;

  sctx.drawImage(video, 0, 0, width, height);
  const frame = sctx.getImageData(0, 0, width, height);
  const px = frame.data;
  const keyed = pctx.createImageData(width, height);
  for (let i = 0; i < px.length; i += 4) {
    keyed.data[i] = px[i];
    keyed.data[i + 1] = px[i + 1];
    keyed.data[i + 2] = px[i + 2];
    keyed.data[i + 3] = greenAlpha(px[i], px[i + 1], px[i + 2]);
  }
  pctx.putImageData(keyed, 0, 0);

  const targetWidth = target.width || 1280;
  const targetHeight = target.height || 720;
  tctx.clearRect(0, 0, targetWidth, targetHeight);
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(plate, 0, 0, targetWidth, targetHeight);

  if (!name.trim()) return true;
  const axes = findPaperAxes(px, width, height);
  if (!axes) return true;

  const currentW = axes.maxU - axes.minU;
  const currentH = axes.maxV - axes.minV;
  // Lock the sheet's scale from its first clean frame. Later frames may show
  // only a fragment; shrinking the text to that fragment makes the name swim.
  if (!cache.sheetW && currentW > 20 && currentH > 12) {
    cache.sheetW = currentW;
    cache.sheetH = currentH;
  }
  const sheetW = cache.sheetW || currentW;
  const sheetH = cache.sheetH || currentH;
  if (sheetW < 20 || sheetH < 12) return true;

  const centerX = axes.cx;
  const centerY = axes.cy;
  ictx.clearRect(0, 0, width, height);
  const fontSize = Math.max(10, Math.min(sheetH * 0.19, sheetW * 0.105));
  ictx.save();
  ictx.translate(centerX, centerY);
  ictx.rotate(Math.atan2(axes.uy, axes.ux));
  ictx.fillStyle = "rgba(34, 24, 18, 0.94)";
  ictx.textAlign = "center";
  ictx.textBaseline = "middle";
  ictx.font = `400 ${fontSize}px ${fontFamily}`;
  const maxWidth = sheetW * 0.76;
  const words = name.trim().split(/\\s+/);
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
  if (lines.length > 2) {
    const last = lines.pop()!;
    lines[1] = lines.slice(1).join(" ") + " " + last;
  }
  const lineHeight = fontSize * 1.22;
  lines.forEach((value, index) =>
    ictx.fillText(value, 0, (index - (lines.length - 1) / 2) * lineHeight, maxWidth)
  );
  ictx.restore();

  // Clip ink to the live paper-material matte. As the real sheet chars and
  // breaks apart, the corresponding letters lose support and disappear with it.
  const inkFrame = ictx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (inkFrame.data[i + 3] && !isPaper(px[i], px[i + 1], px[i + 2])) {
        inkFrame.data[i + 3] = 0;
      }
    }
  }
  ictx.putImageData(inkFrame, 0, 0);
  tctx.drawImage(ink, 0, 0, targetWidth, targetHeight);
  return true;
}
