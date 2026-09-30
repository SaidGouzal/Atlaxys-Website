/**
 * Signal field generator — the Atlaxys hero visual.
 *
 * Routes circuit traces across a grid the way a PCB autorouter would: long
 * straight runs, 45° bends only, no shared cells, each trace ending in a ring
 * terminal — the same language as the traces leaving the "A" in the logo.
 *
 * Deterministic (seeded), so the server-rendered SVG fallback and the WebGL
 * scene draw exactly the same field.
 */

export type Point = [x: number, y: number];

export interface Trace {
  points: Point[];
  /** Length in grid units. */
  length: number;
  /** Carries an orange signal pulse. */
  hot: boolean;
  /** Pulse phase offset (0–1). */
  phase: number;
}

export interface SignalField {
  cols: number;
  rows: number;
  traces: Trace[];
}

export interface FieldOptions {
  cols?: number;
  rows?: number;
  count?: number;
  seed?: number;
  /** Horizontal band (0–1) where traces start. */
  startBand?: [number, number];
  hotRatio?: number;
}

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRS = { E: [1, 0], NE: [1, -1], SE: [1, 1] } as const;
type Dir = keyof typeof DIRS;

export function generateField(options: FieldOptions = {}): SignalField {
  const { cols = 46, rows = 28, count = 34, seed = 11, startBand = [0.02, 0.4], hotRatio = 0.28 } = options;
  const rand = mulberry32(seed);
  const occupied = new Uint8Array(cols * rows);
  const idx = (x: number, y: number) => y * cols + x;
  const free = (x: number, y: number) => x >= 0 && y >= 1 && x < cols && y < rows - 1 && !occupied[idx(x, y)];
  const traces: Trace[] = [];

  for (let attempt = 0; attempt < count * 12 && traces.length < count; attempt++) {
    let x = Math.floor((startBand[0] + rand() * (startBand[1] - startBand[0])) * cols);
    let y = 1 + Math.floor(rand() * (rows - 2));
    if (!free(x, y)) continue;

    const path: Point[] = [[x, y]];
    const cells: number[] = [idx(x, y)];
    let dir: Dir = 'E';
    let segments = 0;
    const maxSegments = 3 + Math.floor(rand() * 4);
    let blocked = false;

    while (segments < maxSegments && !blocked) {
      const run = dir === 'E' ? 3 + Math.floor(rand() * 9) : 1 + Math.floor(rand() * 3);
      const [dx, dy] = DIRS[dir];
      let moved = 0;
      for (let s = 0; s < run; s++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!free(nx, ny) || cells.includes(idx(nx, ny))) {
          blocked = true;
          break;
        }
        // Avoid crossing another trace on a diagonal.
        if (dy !== 0 && occupied[idx(x + dx, y)] && occupied[idx(x, y + dy)]) {
          blocked = true;
          break;
        }
        x = nx;
        y = ny;
        cells.push(idx(x, y));
        moved++;
      }
      if (moved > 0) {
        path.push([x, y]);
        segments++;
      }
      dir = dir === 'E' ? (rand() < 0.5 ? 'NE' : 'SE') : 'E';
      if (moved === 0 && segments === 0) break;
    }

    const length = cells.length - 1;
    if (path.length < 2 || length < 6) continue;

    cells.forEach((c) => (occupied[c] = 1));
    traces.push({ points: path, length: pathLength(path), hot: rand() < hotRatio, phase: rand() });
  }

  return { cols, rows, traces };
}

export function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]!;
    const [bx, by] = points[i]!;
    total += Math.hypot(bx - ax, by - ay);
  }
  return total;
}

/** SVG path data for a trace, scaled to `unit` px per grid cell. */
export function tracePath(trace: Trace, unit: number): string {
  return trace.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x * unit} ${y * unit}`).join(' ');
}
