/**
 * The 3D Atlaxys mark (Three.js), choreographed with GSAP.
 *
 *   assemble  the logo's own parts arrive in order: the steel A rises from
 *             its baseline, the blade cuts through it, the traces route out
 *             of the blade and close round their rings — each part behind a
 *             hot signal edge. Then signals travel the traces now and then.
 *   pointer   the studio's reflections and a probe light follow the pointer,
 *             and the mark turns slightly towards it (touch: a slow drift).
 *   scroll    leaving the hero, the mark opens into an exploded axonometric
 *             view over a hairline blueprint of itself: the architecture
 *             behind the logo (see stage.ts).
 *
 * Cost: 6 meshes, 2 line sets, one glow quad; render loop on gsap.ticker,
 * stopped off-screen. The DOM side (layout, triggers, fallbacks) is stage.ts.
 */
import { gsap } from 'gsap';
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three';
import { MARK, toMarkSpace } from '@/lib/brand/mark';
import { FRONT, buildMarkGeometries, markOutlines } from './geometry';
import type { Rect } from './layout';
import { PALETTES, createMaterials, withSignal, type SignalUniforms, type Theme } from './materials';
import { bakeStudio } from './studio';

export interface MarkSceneOptions {
  theme: Theme;
  /** Right-to-left page: the mark turns the other way (it is never mirrored). */
  rtl: boolean;
  /** Touch-first device: autonomous light drift, lower pixel ratio. */
  coarse: boolean;
  /** Render single stills on demand (no loop). Used by scripts/render-mark-stills.mjs. */
  still?: boolean;
  /** Called if the GPU drops the context; the page falls back to the still image. */
  onContextLost?: () => void;
}

export interface MarkScene {
  readonly canvas: HTMLCanvasElement;
  /** Compile shaders off the main thread where supported. */
  ready: Promise<void>;
  /**
   * Place the mark. `frame` is the box the assembled mark fills; the canvas
   * covers that box plus room for the exploded view, clipped to `bounds`.
   * Both in the container's CSS pixels.
   */
  layout(frame: Rect, bounds: Rect): void;
  /** Play the assembly. Resolves when the mark is complete. */
  assemble(delay?: number): Promise<void>;
  /** Show the finished mark immediately (no assembly). */
  complete(): void;
  /** 0 = in the hero, 1 = fully opened into the exploded view. */
  setExplode(progress: number): void;
  /** Pointer in −1…1 (x right, y up), or null when it leaves. */
  setPointer(x: number | null, y?: number): void;
  setTheme(theme: Theme): void;
  /** Freeze the autonomous motion (WCAG 2.2.2 pause control). */
  setPaused(paused: boolean): void;
  /** Start/stop rendering (off-screen, hidden tab). */
  setActive(active: boolean): void;
  /** One frame of the finished mark, as a PNG data URL (still mode). */
  renderStill(pose?: { rotX: number; rotY: number }): string;
  destroy(): void;
}

/** Rest pose: the mark turns its face towards the headline. */
const REST = { rotX: 0.14, rotY: -0.42 };
/** Extra turn and tilt of the exploded axonometric view. */
const EXPLODED = { rotX: 0.3, rotY: -0.34 };
/** How far each part travels (mark-space units) when exploded: z, then x/y. */
const SPREAD = {
  body: new Vector3(-0.14, 0.2, -1),
  leg: new Vector3(0.3, -0.45, -0.55),
  blade: new Vector3(-0.22, -0.12, 0.36),
  trace: new Vector3(0.6, 0.14, 0.86),
};
/** Where each part starts its arrival from (offset from its place). */
const ARRIVE = {
  body: new Vector3(0, -0.25, -0.8),
  leg: new Vector3(0.1, -0.3, -0.5),
  blade: new Vector3(-0.3, -0.15, 0.5),
  trace: new Vector3(-0.2, 0, 0.35),
};
const FOV = 24;
/** Room around the frame for the exploded view (fractions of the frame). */
const MARGIN = { x: 0.34, y: 0.5 };
const SIGNAL_PERIOD = 4.6;

const smoothstep = (a: number, b: number, x: number) => {
  const t = MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const glowMaterial = () =>
  new ShaderMaterial({
    uniforms: { uColor: { value: new Color('#ff5c00') }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = length((vUv - 0.5) * 2.0);
        float a = pow(max(0.0, 1.0 - d), 2.2) * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

export function createMarkScene(container: HTMLElement, opts: MarkSceneOptions): MarkScene {
  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: Boolean(opts.still),
  });
  const maxRatio = opts.still ? 1 : opts.coarse ? 1.75 : 2;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, maxRatio);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  // No tone mapping: tone mappers pull saturated colours towards white, and the
  // brand orange must stay the brand orange. Highlights on the steel clip to white.
  renderer.toneMapping = NoToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 200);
  const dir = opts.rtl ? -1 : 1;

  // ---- Parts ---------------------------------------------------------------
  const geo = buildMarkGeometries();
  const mats = createMaterials();
  const root = new Group();
  const parts = new Group();
  root.add(parts);
  scene.add(root);

  const steelMats = [mats.steel, mats.steel.clone()];
  const bottom = toMarkSpace([0, MARK.bounds.maxY])[1];
  const top = toMarkSpace([0, MARK.bounds.minY])[1];
  const steelAxis = { kind: 'axis' as const, origin: new Vector2(0, bottom), dir: new Vector2(0, 1), length: top - bottom };

  const tip = new Vector2(...toMarkSpace(MARK.blade.lower[0]));
  const bladeEnd = new Vector2(...toMarkSpace(MARK.blade.upper[MARK.blade.upper.length - 1]!));
  const bladeDir = bladeEnd.clone().sub(tip).normalize();
  const bladeLength = Math.max(...[...MARK.blade.lower, ...MARK.blade.upper].map((p) => new Vector2(...toMarkSpace(p)).sub(tip).dot(bladeDir)));

  type Part = { group: Group; signal: SignalUniforms; spread: Vector3 };
  const makePart = (geometry: BufferGeometry, material: MeshStandardMaterial, signal: SignalUniforms, spread: Vector3): Part => {
    const group = new Group();
    group.add(new Mesh(geometry, material));
    parts.add(group);
    return { group, signal, spread };
  };
  const body = makePart(geo.body, steelMats[0]!, withSignal(steelMats[0]!, steelAxis), SPREAD.body);
  const leg = makePart(geo.leg, steelMats[1]!, withSignal(steelMats[1]!, steelAxis), SPREAD.leg);
  const blade = makePart(geo.blade, mats.blade, withSignal(mats.blade, { kind: 'axis', origin: tip, dir: bladeDir, length: bladeLength }), SPREAD.blade);
  const traceMats = geo.traces.map(() => mats.trace());
  const traces = geo.traces.map((t, i) =>
    makePart(t.geometry, traceMats[i]!, withSignal(traceMats[i]!, { kind: 'path', ...t.layout, points: t.layout.path }), SPREAD.trace.clone().multiplyScalar(1 + i * 0.06)),
  );
  const allParts = [body, leg, blade, ...traces];

  // Orange glow behind the blade (dark theme), like the soft glow in the logo file.
  const glow = new Mesh(new PlaneGeometry(1, 1), glowMaterial());
  const [gx, gy] = toMarkSpace([700, 520]);
  glow.position.set(gx, gy, FRONT - 0.9);
  glow.scale.set(7.5, 4.6, 1);
  root.add(glow);

  // Blueprint: the assembled outline, as dashed hairlines on the datum plane.
  const outline: number[] = [];
  for (const loop of markOutlines()) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % loop.length]!;
      outline.push(a.x, a.y, FRONT, b.x, b.y, FRONT);
    }
  }
  const blueprintGeo = new BufferGeometry();
  blueprintGeo.setAttribute('position', new BufferAttribute(new Float32Array(outline), 3));
  const blueprintMat = new LineDashedMaterial({ dashSize: 0.05, gapSize: 0.045, transparent: true, opacity: 0, depthWrite: false });
  const blueprint = new LineSegments(blueprintGeo, blueprintMat);
  blueprint.computeLineDistances();
  root.add(blueprint);

  // Assembly guides: hairlines along each part's travel, from the datum to the part.
  const anchors: { part: Part; at: [number, number] }[] = [
    { part: body, at: toMarkSpace([569.2, 244.6]) },
    { part: body, at: toMarkSpace([675.2, 244.6]) },
    { part: body, at: toMarkSpace([313.5, 702.6]) },
    { part: leg, at: toMarkSpace([909.7, 702.6]) },
    { part: blade, at: toMarkSpace([450.5, 705.2]) },
    { part: blade, at: toMarkSpace([835.9, 445.3]) },
    ...traces.map((part, i) => ({ part, at: [geo.traces[i]!.layout.node.center.x, geo.traces[i]!.layout.node.center.y] as [number, number] })),
  ];
  const guideGeo = new BufferGeometry();
  const guidePos = new Float32Array(anchors.length * 6);
  guideGeo.setAttribute('position', new BufferAttribute(guidePos, 3));
  const guideMat = new LineBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const guides = new LineSegments(guideGeo, guideMat);
  guides.frustumCulled = false;
  root.add(guides);

  // Probe light that follows the pointer: glints travel along the chamfers.
  const probe = new PointLight('#fff1e2', 0, 0, 2);
  probe.position.set(2, 2, 4);
  scene.add(probe);

  // ---- Theme ---------------------------------------------------------------
  const studios = new Map<Theme, { texture: Texture; dispose(): void }>();
  let theme = opts.theme;
  const applyTheme = () => {
    const p = PALETTES[theme];
    if (!studios.has(theme)) studios.set(theme, bakeStudio(renderer, theme));
    scene.environment = studios.get(theme)!.texture;
    steelMats.forEach((m) => {
      m.color.copy(p.steel);
      m.roughness = p.steelRoughness;
    });
    mats.blade.emissiveIntensity = p.bladeEmissive;
    traceMats.forEach((m) => (m.emissiveIntensity = p.traceEmissive));
    allParts.forEach((part) => part.signal.uHot.value.copy(p.hot));
    blueprintMat.color.copy(p.blueprint);
    guideMat.color.copy(p.blueprint);
    probe.intensity = theme === 'dark' ? 26 : 16;
  };
  applyTheme();

  // ---- State -----------------------------------------------------------------
  const reveal = { body: 0, leg: 0, blade: 0, t0: 0, t1: 0, t2: 0, turn: 0 };
  let explode = 0;
  let paused = false;
  let active = false;
  let assembled = false;
  let clock = 0; // autonomous time: float, drift, signals (frozen while paused)
  let signalClock = -1;
  const pointer = new Vector2();
  const pointerTarget = new Vector2();
  let pointerIn = false;
  let dirty = true;

  // Rest-pose bounds, used to frame the mark.
  let rest = REST;
  const restBox = new Box3();
  const restSize = new Vector3();
  const restCenter = new Vector3();
  const measureRest = () => {
    root.rotation.set(rest.rotX, rest.rotY * dir, 0);
    root.position.set(0, 0, 0);
    parts.children.forEach((g) => g.position.set(0, 0, 0));
    root.updateMatrixWorld(true);
    restBox.setFromObject(parts);
    restBox.getSize(restSize);
    restBox.getCenter(restCenter);
  };
  measureRest();

  let frame: Rect = { x: 0, y: 0, w: 1, h: 1 };
  const layout = (next: Rect, bounds: Rect) => {
    frame = next;
    const full: Rect = {
      x: frame.x - frame.w * MARGIN.x,
      y: frame.y - frame.h * MARGIN.y,
      w: frame.w * (1 + 2 * MARGIN.x),
      h: frame.h * (1 + 2 * MARGIN.y),
    };
    const x0 = Math.max(full.x, bounds.x);
    const y0 = Math.max(full.y, bounds.y);
    const x1 = Math.min(full.x + full.w, bounds.x + bounds.w);
    const y1 = Math.min(full.y + full.h, bounds.y + bounds.h);
    const view: Rect = { x: Math.floor(x0), y: Math.floor(y0), w: Math.max(1, Math.ceil(x1 - x0)), h: Math.max(1, Math.ceil(y1 - y0)) };

    Object.assign(canvas.style, { left: `${view.x}px`, top: `${view.y}px`, width: `${view.w}px`, height: `${view.h}px` });
    renderer.setSize(view.w, view.h, false);

    // Distance at which the rest-pose mark fills the frame (height or width, whichever binds).
    const tan = Math.tan(MathUtils.degToRad(FOV / 2));
    const aspect = full.w / full.h;
    const byHeight = (restSize.y * full.h) / (2 * tan * frame.h);
    const byWidth = (restSize.x * full.w) / (2 * tan * aspect * frame.w);
    const distance = Math.max(byHeight, byWidth) + restSize.z / 2;
    camera.aspect = aspect;
    camera.position.set(restCenter.x, restCenter.y + distance * 0.06, restCenter.z + distance);
    camera.lookAt(restCenter);
    camera.far = distance * 3;
    camera.setViewOffset(full.w, full.h, view.x - full.x, view.y - full.y, view.w, view.h);
    camera.updateProjectionMatrix();
    dirty = true;
  };

  // ---- Pose ---------------------------------------------------------------
  const apply = (dt: number) => {
    // Pointer smoothing, frame-rate independent.
    const k = 1 - Math.exp(-dt * 3.2);
    if (opts.coarse || !pointerIn) {
      // No pointer: a slow autonomous drift of the light keeps the metal alive.
      pointerTarget.set(Math.sin(clock * 0.21) * 0.55, Math.sin(clock * 0.13 + 1) * 0.25);
    }
    pointer.lerp(pointerTarget, k);

    const e = explode;
    const settle = 1 - Math.pow(1 - reveal.turn, 3);
    const float = assembled ? 1 - e : 0;
    root.rotation.set(
      rest.rotX + EXPLODED.rotX * e - pointer.y * 0.08 + Math.sin(clock * 0.5) * 0.012 * float,
      (rest.rotY + EXPLODED.rotY * e) * dir - (1 - settle) * 0.55 * dir + pointer.x * 0.14 + Math.sin(clock * 0.37) * 0.02 * float,
      0,
    );
    root.position.set(0, Math.sin(clock * 0.62) * 0.045 * float, 0);

    // Each part arrives from depth as it is revealed, and travels out when exploded.
    const place = (part: Part, r: number, from: Vector3) => {
      const arrive = Math.pow(1 - r, 3);
      part.group.position.copy(part.spread).multiplyScalar(e).addScaledVector(from, arrive);
      part.signal.uReveal.value = r;
    };
    place(body, reveal.body, ARRIVE.body);
    place(leg, reveal.leg, ARRIVE.leg);
    place(blade, reveal.blade, ARRIVE.blade);
    traces.forEach((t, i) => place(t, [reveal.t0, reveal.t1, reveal.t2][i]!, ARRIVE.trace));

    // Signals: each trace in turn, then a slower sheen up the blade.
    const p = PALETTES[theme];
    const pulseGain = theme === 'dark' ? 1.1 : 0.7;
    traces.forEach((t, i) => {
      const len = geo.traces[i]!.layout.length;
      const local = signalClock < 0 ? -1 : (signalClock - i * 0.42) % SIGNAL_PERIOD;
      t.signal.uPulse.value = local < 0 ? -1 : local * 2.1 - 0.1;
      t.signal.uPulseGain.value = local < 0 || local * 2.1 > len + 1.2 ? 0 : pulseGain;
    });
    const sheen = signalClock < 0 ? -1 : ((signalClock + SIGNAL_PERIOD * 0.55) % (SIGNAL_PERIOD * 2)) * 2.4 - 0.4;
    blade.signal.uPulse.value = sheen;
    blade.signal.uPulseGain.value = sheen < 0 || sheen > bladeLength + 1 ? 0 : pulseGain * 0.35;

    // Glow follows the blade in and fades out as the mark opens.
    (glow.material as ShaderMaterial).uniforms.uOpacity!.value = 0.2 * p.glow * reveal.blade * (1 - e);

    // Blueprint and guides.
    const draft = smoothstep(0.12, 0.62, e);
    blueprintMat.opacity = p.blueprintOpacity * draft;
    guideMat.opacity = p.blueprintOpacity * 0.6 * draft;
    blueprint.visible = guides.visible = draft > 0.001;
    if (guides.visible) {
      anchors.forEach(({ part, at }, i) => {
        const o = part.group.position;
        guidePos.set([at[0], at[1], FRONT, at[0] + o.x, at[1] + o.y, FRONT + o.z], i * 6);
      });
      guideGeo.getAttribute('position').needsUpdate = true;
    }

    // Probe light in front of the mark, where the pointer is.
    probe.position.set(restCenter.x + pointer.x * 4.5, restCenter.y + pointer.y * 2.6 + 0.6, restCenter.z + 3.6);
    // The studio turns with the exploded view (lighting stays put while the mark turns);
    // the pointer swings it the other way, so reflections slide across the metal.
    scene.environmentRotation.set(EXPLODED.rotX * e * 0.9, EXPLODED.rotY * e * dir * 0.9 - pointer.x * 0.5 + 0.15 * dir, 0);
  };

  // ---- Loop ------------------------------------------------------------------
  let frames = 0;
  let slowFrames = 0;
  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, 100) / 1000;
    const animating = !paused && assembled;
    if (animating) {
      clock += dt;
      if (signalClock >= 0) signalClock += dt;
    }
    const moving = pointer.distanceToSquared(pointerTarget) > 1e-7;
    if (!animating && !moving && !dirty && !introPlaying()) return;
    dirty = false;
    apply(dt);
    renderer.render(scene, camera);

    // Adaptive quality: if frames are consistently slow, lower the resolution once or twice.
    if (assembled && pixelRatio > 1 && ++frames > 30) {
      slowFrames = deltaMs > 28 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 45) {
        pixelRatio = Math.max(1, pixelRatio - 0.4);
        renderer.setPixelRatio(pixelRatio);
        layoutAgain();
        slowFrames = 0;
      }
    }
  };
  let lastBounds: Rect | null = null;
  const layoutAgain = () => lastBounds && layout(frame, lastBounds);

  let intro: gsap.core.Timeline | null = null;
  const introPlaying = () => Boolean(intro?.isActive());

  const setActive = (next: boolean) => {
    if (opts.still || next === active) return;
    active = next;
    if (active) {
      dirty = true;
      gsap.ticker.add(tick);
    } else gsap.ticker.remove(tick);
  };

  const finish = () => {
    assembled = true;
    signalClock = SIGNAL_PERIOD - 0.6; // first signals leave shortly after the mark completes
    dirty = true;
  };

  // ---- Context loss ----------------------------------------------------------
  const onLost = (event: Event) => {
    event.preventDefault();
    setActive(false);
    opts.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const ready = renderer
    .compileAsync(scene, camera)
    .catch(() => undefined)
    .then(() => undefined);

  return {
    canvas,
    ready,
    layout(next, bounds) {
      lastBounds = bounds;
      layout(next, bounds);
    },
    assemble(delay = 0) {
      return new Promise<void>((resolve) => {
        intro?.kill();
        Object.assign(reveal, { body: 0, leg: 0, blade: 0, t0: 0, t1: 0, t2: 0, turn: 0 });
        intro = gsap
          .timeline({ delay, defaults: { ease: 'power2.inOut' }, onUpdate: () => (dirty = true), onComplete: () => (finish(), resolve()) })
          .to(reveal, { turn: 1, duration: 2.8, ease: 'expo.out' }, 0)
          .to(reveal, { body: 1, duration: 1.15 }, 0)
          .to(reveal, { leg: 1, duration: 0.9 }, 0.2)
          .to(reveal, { blade: 1, duration: 0.95, ease: 'power3.inOut' }, 0.62)
          .to(reveal, { t0: 1, duration: 0.75 }, 1.3)
          .to(reveal, { t1: 1, duration: 0.95 }, 1.38)
          .to(reveal, { t2: 1, duration: 0.8 }, 1.5);
        if (paused) intro.pause();
      });
    },
    complete() {
      intro?.kill();
      Object.assign(reveal, { body: 1, leg: 1, blade: 1, t0: 1, t1: 1, t2: 1, turn: 1 });
      finish();
    },
    setExplode(progress) {
      explode = MathUtils.clamp(progress, 0, 1);
      dirty = true;
    },
    setPointer(x, y = 0) {
      pointerIn = x !== null;
      if (x !== null) pointerTarget.set(MathUtils.clamp(x, -1, 1), MathUtils.clamp(y, -1, 1));
    },
    setTheme(next) {
      if (next === theme) return;
      theme = next;
      applyTheme();
      dirty = true;
      // A paused or off-screen mark still shows the new colours straight away.
      if (!active || paused) {
        apply(0);
        renderer.render(scene, camera);
      }
    },
    setPaused(next) {
      paused = next;
      if (paused) intro?.pause();
      else intro?.resume();
      dirty = true;
    },
    setActive,
    renderStill(pose = { rotX: 0.08, rotY: -0.18 }) {
      Object.assign(reveal, { body: 1, leg: 1, blade: 1, t0: 1, t1: 1, t2: 1, turn: 1 });
      assembled = false;
      explode = 0;
      rest = pose;
      measureRest();
      layoutAgain();
      pointerIn = true;
      pointerTarget.set(0, 0);
      pointer.set(0, 0);
      apply(0);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },
    destroy() {
      setActive(false);
      intro?.kill();
      canvas.removeEventListener('webglcontextlost', onLost);
      scene.traverse((object) => {
        if (object instanceof Mesh || object instanceof LineSegments) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => m.dispose());
        }
      });
      studios.forEach((s) => s.dispose());
      renderer.dispose();
      canvas.remove();
    },
  };
}
