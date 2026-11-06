/**
 * Runtime paper-plate compositor for the practical green-screen burn footage.
 *
 * The plate is treated as the source of truth: green is keyed away, the live
 * paper region is estimated from its warm, low-saturation material pixels, and
 * the visitor's ink is clipped to that region every decoded video frame.
 *
 * This deliberately avoids a second, independent name-wipe animation.
 */

export type PaperPlateOptions = {
  video: HTMLVideoElement;
  target: HTMLCanvasElement;
  name: string;
  fontFamily?: string;
};

/** Soft green-screen key that preserves warm flame edges and smoke. */
function greenAlpha(r: number, g: number, b: number): number {
  const dominance = g - (r + b) * 0.5;
  const ratio = g / Math.max(1, (r + b) * 0.5);
  const t = Math.max(0, Math.min(1, (dominance - 7) / 25));
  const q = Math.max(0, Math.min(1, (ratio - 1.05) / 0.18));
  const key = t * t * (3 - 2 * t) * q * q * (3 - 2 * q);
  return Math.round((1 - key) * 255);
}

type Point = { x: number; y: number };

/**
 * Estimate the visible sheet's oriented bounds from its tan/brown material.
 * Burnt charcoal, orange flame and green backing are intentionally excluded.
 */
function findPaperAxes(data: Uint8ClampedArray, width: number, height: number) {
  let sx = 0, sy = 0, count = 0;
  const points: Point[] = [];
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (r * 3 + g * 4 + b) / 8;
      const paper = r > 72 && r < 218 && g > 48 && g < 184 &&
        b > 22 && b < 142 && r - g > 7 && r - g < 76 &&
        g - b > 5 && g - b < 72 && lum > 58 && lum < 185;
      if (!paper) continue;
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

/**
 * Draw one decoded frame. Returns false until the video has usable pixels.
 * The ink is rendered in the sheet's current orientation and clipped by a
 * live material matte, so ink cannot remain floating over the green backing.
 */
export function renderPaperPlate({ video, target, name, fontFamily = '"Segoe Print", "Bradley Hand", cursive' }: PaperPlateOptions): boolean {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;

  const width = Math.max(1, Math.round(video.videoWidth * 0.375));
  const height = Math.max(1, Math.round(video.videoHeight * 0.375));
  const source = document.createElement("canvas");
  source.width = width; source.height = height;
  const sctx = source.getContext("2d", { willReadFrequently: true });
  const tctx = target.getContext("2d");
  if (!sctx || !tctx) return false;

  sctx.drawImage(video, 0, 0, width, height);
  const frame = sctx.getImageData(0, 0, width, height);
  const px = frame.data;
  const keyed = sctx.createImageData(width, height);
  const axes = findPaperAxes(px, width, height);

  for (let i = 0; i < px.length; i += 4) {
    keyed.data[i] = px[i];
    keyed.data[i + 1] = px[i + 1];
    keyed.data[i + 2] = px[i + 2];
    keyed.data[i + 3] = greenAlpha(px[i], px[i + 1], px[i + 2]);
  }

  target.width = target.clientWidth || target.width;
  target.height = target.clientHeight || target.height;
  tctx.clearRect(0, 0, target.width, target.height);
  tctx.imageSmoothingEnabled = true;
  tctx.putImageData(keyed, 0, 0);
  // Scale the source plate to the display canvas after keying at reduced res.
  const plate = document.createElement("canvas");
  plate.width = width; plate.height = height;
  plate.getContext("2d")?.putImageData(keyed, 0, 0);
  tctx.clearRect(0, 0, target.width, target.height);
  tctx.drawImage(plate, 0, 0, target.width, target.height);

  if (axes && name.trim()) {
    const sx = target.width / width, sy = target.height / height;
    const { cx, cy, ux, uy, vx, vy, minU, maxU, minV, maxV } = axes;
    const sheetW = maxU - minU, sheetH = maxV - minV;
    if (sheetW > 20 && sheetH > 12) {
      const centerX = cx + ux * (minU + maxU) * 0.5 + vx * (minV + maxV) * 0.5;
      const centerY = cy + uy * (minU + maxU) * 0.5 + vy * (minV + maxV) * 0.5;
      const ink = document.createElement("canvas");
      ink.width = width; ink.height = height;
      const ictx = ink.getContext("2d");
      if (ictx) {
        const fontSize = Math.max(10, Math.min(sheetH * 0.19, sheetW * 0.105));
        ictx.save();
        ictx.translate(centerX, centerY);
        ictx.rotate(Math.atan2(uy, ux));
        ictx.fillStyle = "rgba(34, 24, 18, 0.94)";
        ictx.textAlign = "center";
        ictx.textBaseline = "middle";
        ictx.font = `400 ${fontSize}px ${fontFamily}`;
        const maxWidth = sheetW * 0.76;
        const words = name.trim().split(/\\s+/);
        let line = "", lines: string[] = [];
        for (const word of words) {
          const candidate = line ? line + " " + word : word;
          if (ictx.measureText(candidate).width > maxWidth && line) {
            lines.push(line); line = word;
          } else line = candidate;
        }
        if (line) lines.push(line);
        if (lines.length > 2) lines = [lines.slice(0, -1).join(" "), lines[lines.length - 1]];
        const lineHeight = fontSize * 1.22;
        lines.forEach((value, index) =>
          ictx.fillText(value, 0, (index - (lines.length - 1) / 2) * lineHeight, maxWidth)
        );
        ictx.restore();

        // Use the live paper-material pixels as a matte for the ink.
        const inkFrame = ictx.getImageData(0, 0, width, height);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (!inkFrame.data[i + 3]) continue;
            const r = px[i], g = px[i + 1], b = px[i + 2];
            const material = r > 72 && r < 218 && g > 48 && g < 184 &&
              b > 22 && b < 142 && r - g > 7 && r - g < 76 &&
              g - b > 5 && g - b < 72;
            if (!material) inkFrame.data[i + 3] = 0;
          }
        }
        ictx.putImageData(inkFrame, 0, 0);
        tctx.save();
        tctx.globalCompositeOperation = "source-over";
        tctx.drawImage(ink, 0, 0, target.width, target.height);
        tctx.restore();
      }
    }
  }
  return true;
}
