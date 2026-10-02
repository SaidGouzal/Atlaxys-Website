/**
 * Three.js geometry for the 3D mark, built at runtime from the measured
 * vector data in src/lib/brand/mark.ts (no model file to download).
 *
 * Every part is an extrusion with a flat 45° chamfer — the design system's
 * chamfer motif — sized so the silhouette stays exactly the logo's
 * (bevelOffset = −bevelSize). All front faces share one plane, so seen
 * head-on the mark reads as the flat logo; the depths differ behind it.
 */
import { BufferAttribute, Color, ExtrudeGeometry, Path, Shape, Vector2, type BufferGeometry } from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MARK, MARK_UNIT, toMarkSpace, type MarkTrace, type Pt } from '@/lib/brand/mark';

/** Front plane of every part (mark-space z). */
export const FRONT = 0.24;

export const DEPTH = { steel: 0.48, blade: 0.3, trace: 0.15 } as const;
const BEVEL = { steel: 0.032, blade: 0.024, trace: 0.018 } as const;

const v2 = (p: Pt) => new Vector2(...toMarkSpace(p));

/** Catmull-Rom through `points` as cubic Béziers, appended to `path` (which is already at points[0]). */
function splineThrough(path: Path, points: Vector2[]) {
  const n = points.length;
  const at = (i: number) => {
    if (i < 0) return points[0]!.clone().multiplyScalar(2).sub(points[1]!);
    if (i >= n) return points[n - 1]!.clone().multiplyScalar(2).sub(points[n - 2]!);
    return points[i]!;
  };
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = p1.clone().add(p2.clone().sub(p0).multiplyScalar(1 / 6));
    const c2 = p2.clone().sub(p3.clone().sub(p1).multiplyScalar(1 / 6));
    path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p2.x, p2.y);
  }
}

/** The A body, with the apex's rounded top-left corner. */
export function bodyShape(): Shape {
  const pts = MARK.body.map(v2);
  const r = MARK.apexRadius / MARK_UNIT;
  const shape = new Shape();
  pts.forEach((p, i) => {
    if (i !== 1) {
      if (i === 0) shape.moveTo(p.x, p.y);
      else shape.lineTo(p.x, p.y);
      return;
    }
    // Fillet: tangent points along both edges, joined by a quadratic curve.
    const prev = pts[0]!;
    const next = pts[2]!;
    const a = prev.clone().sub(p).normalize();
    const b = next.clone().sub(p).normalize();
    const d = r / Math.tan(Math.acos(a.dot(b)) / 2);
    const t1 = p.clone().addScaledVector(a, d);
    const t2 = p.clone().addScaledVector(b, d);
    shape.lineTo(t1.x, t1.y);
    shape.quadraticCurveTo(p.x, p.y, t2.x, t2.y);
  });
  shape.closePath();
  return shape;
}

export function legShape(): Shape {
  const pts = MARK.leg.map(v2);
  const shape = new Shape();
  shape.moveTo(pts[0]!.x, pts[0]!.y);
  pts.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
  shape.closePath();
  return shape;
}

/** Blade: lower edge from the tip to the right end, square end, upper edge back to the tip. */
export function bladeShape(): Shape {
  const lower = MARK.blade.lower.map(v2);
  const upper = MARK.blade.upper.map(v2).reverse();
  const shape = new Shape();
  shape.moveTo(lower[0]!.x, lower[0]!.y);
  splineThrough(shape, lower);
  shape.lineTo(upper[0]!.x, upper[0]!.y);
  splineThrough(shape, upper);
  shape.closePath();
  return shape;
}

export interface TraceLayout {
  shape: Shape;
  /** Centreline from the start to where it meets the ring (mark space). */
  path: Vector2[];
  /** Ring centre and mid radius. */
  node: { center: Vector2; mid: number; outer: number };
  /** Direction from the node centre towards where the trace enters (radians). */
  entryAngle: number;
  /** Trace length + half the ring's mid circumference: the reveal runs both ways round the ring. */
  length: number;
}

/**
 * One trace and its ring node as a single outline: the stroke's two sides
 * (mitred at the 45° bends) meet the ring's outer circle, the outline runs
 * round the far side of the ring, and the ring's hole is a hole. One mesh,
 * no seams, no overlapping faces.
 */
export function traceLayout(trace: MarkTrace): TraceLayout {
  const half = MARK.traceWidth / 2 / MARK_UNIT;
  const outer = MARK.node.outer / MARK_UNIT;
  const inner = MARK.node.inner / MARK_UNIT;
  const pts = trace.path.map(v2);
  const center = pts[pts.length - 1]!;

  const dirs = pts.slice(1).map((p, i) => p.clone().sub(pts[i]!).normalize());
  const normal = (d: Vector2) => new Vector2(-d.y, d.x); // left of travel
  const last = dirs[dirs.length - 1]!;
  const phi = Math.asin(half / outer);

  // Offset polyline on one side (+1 left, −1 right), mitred, ending on the ring.
  const side = (sign: 1 | -1): Vector2[] => {
    const out: Vector2[] = [];
    const n0 = normal(dirs[0]!);
    // Slanted start: positive slant moves the top (+n) corner forward.
    out.push(pts[0]!.clone().addScaledVector(n0, sign * half).addScaledVector(dirs[0]!, (sign * trace.startSlant) / 2 / MARK_UNIT));
    for (let i = 1; i < pts.length - 1; i++) {
      const na = normal(dirs[i - 1]!);
      const nb = normal(dirs[i]!);
      const m = na.clone().add(nb).normalize();
      out.push(pts[i]!.clone().addScaledVector(m, (sign * half) / m.dot(na)));
    }
    out.push(center.clone().addScaledVector(last, -outer * Math.cos(phi)).addScaledVector(normal(last), sign * half));
    return out;
  };

  const right = side(-1);
  const left = side(1);
  const entryAngle = Math.atan2(-last.y, -last.x);

  const shape = new Shape();
  shape.moveTo(right[0]!.x, right[0]!.y);
  right.slice(1).forEach((p) => shape.lineTo(p.x, p.y));
  // Round the far side of the ring: counter-clockwise from the right side's hit point to the left side's.
  shape.absarc(center.x, center.y, outer, entryAngle + phi, entryAngle - phi, false);
  left
    .slice(0, -1)
    .reverse()
    .forEach((p) => shape.lineTo(p.x, p.y));
  shape.closePath();
  const hole = new Path();
  hole.absarc(center.x, center.y, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  // Centreline for the reveal / signal shader: start → … → ring entry.
  const path = [...pts.slice(0, -1), center.clone().addScaledVector(last, -outer)];
  let length = 0;
  for (let i = 1; i < path.length; i++) length += path[i]!.distanceTo(path[i - 1]!);
  const mid = (outer + inner) / 2;
  return { shape, path, node: { center, mid, outer }, entryAngle, length: length + Math.PI * mid };
}

/**
 * Extrude with a 45° chamfer, the silhouette kept exact, front face on
 * FRONT. Normals are creased: curved walls shade smoothly, chamfer edges
 * stay crisp.
 */
export function extrude(shape: Shape, depth: number, bevel: number, curveSegments = 4): BufferGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: depth - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments,
  });
  geometry.deleteAttribute('uv');
  geometry.translate(0, 0, FRONT - (depth - bevel));
  const creased = toCreasedNormals(geometry, Math.PI / 5);
  geometry.dispose();
  return creased;
}

/** Bakes a colour per vertex from its mark-space position (gradients from the logo). */
function paint(geometry: BufferGeometry, colorAt: (x: number, y: number, out: Color) => void) {
  const pos = geometry.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    colorAt(pos.getX(i), pos.getY(i), c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface MarkGeometries {
  body: BufferGeometry;
  leg: BufferGeometry;
  blade: BufferGeometry;
  traces: { geometry: BufferGeometry; layout: TraceLayout; id: MarkTrace['id'] }[];
}

export function buildMarkGeometries(): MarkGeometries {
  const { colors } = MARK;
  const top = toMarkSpace([0, MARK.bounds.minY])[1];
  const bottom = toMarkSpace([0, MARK.bounds.maxY])[1];

  // Steel: white at the apex to cool steel at the feet, as in the logo.
  const steelTop = new Color(colors.steelTop);
  const steelBottom = new Color(colors.steelBottom);
  const steel = (_x: number, y: number, out: Color) => out.lerpColors(steelBottom, steelTop, smooth(bottom, top, y));

  const body = extrude(bodyShape(), DEPTH.steel, BEVEL.steel, 6);
  const leg = extrude(legShape(), DEPTH.steel, BEVEL.steel, 1);
  paint(body, steel);
  paint(leg, steel);

  // Blade: amber shoulder, signal orange body, deeper towards the tip.
  const blade = extrude(bladeShape(), DEPTH.blade, BEVEL.blade, 4);
  const [sx, sy] = toMarkSpace(MARK.blade.shoulder);
  const amber = new Color(colors.bladeAmber);
  const orange = new Color(colors.blade);
  const deep = new Color(colors.bladeTip);
  const tipY = toMarkSpace([0, 700])[1];
  paint(blade, (x, y, out) => {
    const shoulder = 1 - smooth(0, 1.5, Math.hypot(x - sx, y - sy));
    out.lerpColors(orange, deep, smooth(tipY + 0.9, tipY, y)).lerp(amber, shoulder * shoulder);
  });

  // Traces brighten towards their nodes.
  const traceStart = new Color(colors.traceStart);
  const traceEnd = new Color(colors.traceEnd);
  const x0 = toMarkSpace([800, 0])[0];
  const x1 = toMarkSpace([1060, 0])[0];
  const traces = MARK.traces.map((trace) => {
    const layout = traceLayout(trace);
    const geometry = extrude(layout.shape, DEPTH.trace, BEVEL.trace, 10);
    paint(geometry, (x, _y, out) => out.lerpColors(traceStart, traceEnd, smooth(x0, x1, x)));
    return { geometry, layout, id: trace.id };
  });

  return { body, leg, blade, traces };
}

/** 2D outlines of every part (for the blueprint drawn behind the exploded view). */
export function markOutlines(): Vector2[][] {
  const outlines: Vector2[][] = [bodyShape(), legShape(), bladeShape()].map((s) => s.getPoints(6));
  for (const trace of MARK.traces) {
    const { shape } = traceLayout(trace);
    outlines.push(shape.getPoints(10), ...shape.holes.map((h) => h.getPoints(10)));
  }
  return outlines;
}
