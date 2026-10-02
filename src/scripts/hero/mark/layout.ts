/**
 * Where the 3D mark goes in the hero, measured from the real text.
 *
 * The headline's right edge is ragged and differs per language (French runs
 * wider, Arabic is mirrored), so a fixed column would either collide with
 * the text or waste the space. Instead the text's line boxes are measured and
 * the largest box of the mark's proportions that clears all of them is
 * chosen, preferring the inline-end side, level with the headline.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Line boxes of an element's content, merged per line, relative to `origin`. */
export function lineBoxes(el: Element, origin: DOMRect): Rect[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 1 && r.height > 1);
  const lines: Rect[] = [];
  for (const r of rects) {
    const box = { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
    const line = lines.find((l) => Math.min(l.y + l.h, box.y + box.h) - Math.max(l.y, box.y) > Math.min(l.h, box.h) * 0.5);
    if (!line) {
      lines.push(box);
      continue;
    }
    const x0 = Math.min(line.x, box.x);
    const y0 = Math.min(line.y, box.y);
    line.w = Math.max(line.x + line.w, box.x + box.w) - x0;
    line.h = Math.max(line.y + line.h, box.y + box.h) - y0;
    line.x = x0;
    line.y = y0;
  }
  return lines;
}

export interface FitOptions {
  /** Width / height of the mark's box. */
  aspect: number;
  minH: number;
  maxH: number;
  /** Clearance around text, px. */
  pad: number;
  /** Preferred centre of the mark (scores ties between equal sizes). */
  prefer: { x: number; y: number };
}

/** Largest box of `aspect` inside `area` that clears every obstacle; null if none reaches `minH`. */
export function fitBox(area: Rect, obstacles: Rect[], { aspect, minH, maxH, pad, prefer }: FitOptions): Rect | null {
  const blocked = obstacles.map((o) => ({ x: o.x - pad, y: o.y - pad * 0.4, w: o.w + pad * 2, h: o.h + pad * 0.8 }));
  const step = 12;
  for (let h = Math.min(maxH, area.h, area.w / aspect); h >= minH; h -= 8) {
    const w = h * aspect;
    let best: Rect | null = null;
    let bestScore = Infinity;
    for (let y = area.y; y + h <= area.y + area.h; y += step) {
      for (let x = area.x; x + w <= area.x + area.w; x += step) {
        const box = { x, y, w, h };
        if (blocked.some((b) => intersects(b, box))) continue;
        const score = Math.hypot(x + w / 2 - prefer.x, (y + h / 2 - prefer.y) * 1.4);
        if (score < bestScore) {
          bestScore = score;
          best = box;
        }
      }
    }
    if (best) return best;
  }
  return null;
}
