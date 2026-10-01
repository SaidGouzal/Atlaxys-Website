/**
 * WebGL signal field (Three.js).
 *
 * Draw calls: 3 (grid dots, traces, terminals). All animation happens in
 * shaders driven by a handful of uniforms, so the CPU does almost nothing per
 * frame. Rendering pauses when the hero is off-screen or the tab is hidden.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  MathUtils,
  PerspectiveCamera,
  Plane,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { SignalField } from '@/lib/signal/routing';

const SIGNAL = new Color('#ff8828');
const STEEL = new Color('#c3cbd5');
const SPACING = 0.5;

const commonUniforms = () => ({
  uTime: { value: 0 },
  uDraw: { value: 0 },
  uFade: { value: 1 },
  uPointer: { value: new Vector2(999, 999) },
  uSignal: { value: SIGNAL },
  uSteel: { value: STEEL },
});

const traceVertex = /* glsl */ `
  attribute float aDist;
  attribute float aLen;
  attribute float aHot;
  attribute float aPhase;
  varying float vDist;
  varying float vLen;
  varying float vHot;
  varying float vPhase;
  varying vec3 vWorld;
  void main() {
    vDist = aDist; vLen = aLen; vHot = aHot; vPhase = aPhase;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const traceFragment = /* glsl */ `
  uniform float uTime;
  uniform float uDraw;
  uniform float uFade;
  uniform vec2 uPointer;
  uniform vec3 uSignal;
  uniform vec3 uSteel;
  varying float vDist;
  varying float vLen;
  varying float vHot;
  varying float vPhase;
  varying vec3 vWorld;
  void main() {
    // Route-in: traces grow from their origin.
    float drawn = smoothstep(vDist - 0.6, vDist, uDraw * (vLen + 0.6));
    if (drawn <= 0.001) discard;

    // Travelling pulse on "hot" traces.
    float cycle = vLen + 10.0;
    float head = mod(uTime * 4.2 + vPhase * cycle, cycle);
    float pulse = vHot * smoothstep(head - 2.4, head, vDist) * step(vDist, head);

    // Pointer probe.
    float probe = smoothstep(3.2, 0.0, distance(vWorld.xz, uPointer));

    // Depth fade toward the horizon.
    float depth = smoothstep(-9.0, 5.0, vWorld.z);

    vec3 base = mix(uSteel, uSignal, vHot * 0.55);
    vec3 color = mix(base, uSignal, pulse);
    color = mix(color, vec3(1.0), probe * 0.35);
    float alpha = (0.16 + vHot * 0.18 + pulse * 0.85 + probe * 0.45) * depth * uFade * drawn;
    gl_FragColor = vec4(color, alpha);
  }
`;

const pointVertex = /* glsl */ `
  attribute float aSize;
  attribute float aKind;   // 0 = grid dot, 1 = terminal, 2 = hot terminal
  attribute float aLen;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  varying float vKind;
  varying float vProbe;
  varying float vArrive;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 view = viewMatrix * world;
    vKind = aKind;
    vProbe = smoothstep(3.0, 0.0, distance(world.xz, uPointer));
    float cycle = aLen + 10.0;
    float head = mod(uTime * 4.2 + aPhase * cycle, cycle);
    vArrive = step(1.5, aKind) * smoothstep(aLen - 1.2, aLen, head) * (1.0 - step(aLen + 1.6, head));
    vDepth = smoothstep(-9.0, 5.0, world.z);
    gl_Position = projectionMatrix * view;
    gl_PointSize = aSize * uPixelRatio * (1.0 + vProbe * 0.8 + vArrive * 0.6) * (18.0 / -view.z);
  }
`;

const pointFragment = /* glsl */ `
  uniform float uDraw;
  uniform float uFade;
  uniform vec3 uSignal;
  uniform vec3 uSteel;
  varying float vKind;
  varying float vProbe;
  varying float vArrive;
  varying float vDepth;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (vKind < 0.5) {
      // Grid dot.
      float dot = smoothstep(0.5, 0.2, r);
      float a = dot * (0.1 + vProbe * 0.6) * vDepth * uFade;
      gl_FragColor = vec4(mix(uSteel, uSignal, vProbe * 0.4), a);
      return;
    }
    // Ring terminal.
    float ring = smoothstep(0.5, 0.42, r) * smoothstep(0.22, 0.3, r);
    float core = smoothstep(0.24, 0.0, r) * vArrive;
    vec3 color = vKind > 1.5 ? uSignal : mix(uSteel, uSignal, vProbe);
    float a = (ring * (0.45 + vProbe * 0.5 + vArrive * 0.5) + core) * vDepth * uFade * step(0.98, uDraw);
    gl_FragColor = vec4(color, a);
  }
`;

export interface SignalScene {
  destroy(): void;
}

export function createSignalScene(container: HTMLElement, field: SignalField, opts: { rtl: boolean }): SignalScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  const baseCam = new Vector3(opts.rtl ? -3.2 : 3.2, 9.5, 13.5);
  const lookAt = new Vector3(opts.rtl ? -2.4 : 2.4, 0, -1.5);
  camera.position.copy(baseCam);
  camera.lookAt(lookAt);

  const mirror = opts.rtl ? -1 : 1;
  const toWorld = (x: number, y: number): [number, number, number] => [
    mirror * (x - field.cols * 0.32) * SPACING,
    0,
    (y - field.rows / 2) * SPACING,
  ];

  // ---- Traces --------------------------------------------------------
  const tPos: number[] = [];
  const tDist: number[] = [];
  const tLen: number[] = [];
  const tHot: number[] = [];
  const tPhase: number[] = [];
  for (const trace of field.traces) {
    let dist = 0;
    for (let i = 1; i < trace.points.length; i++) {
      const [ax, ay] = trace.points[i - 1]!;
      const [bx, by] = trace.points[i]!;
      const seg = Math.hypot(bx - ax, by - ay);
      tPos.push(...toWorld(ax, ay), ...toWorld(bx, by));
      tDist.push(dist * SPACING, (dist + seg) * SPACING);
      dist += seg;
      for (let k = 0; k < 2; k++) {
        tLen.push(trace.length * SPACING);
        tHot.push(trace.hot ? 1 : 0);
        tPhase.push(trace.phase);
      }
    }
  }
  const traceGeo = new BufferGeometry();
  traceGeo.setAttribute('position', new BufferAttribute(new Float32Array(tPos), 3));
  traceGeo.setAttribute('aDist', new BufferAttribute(new Float32Array(tDist), 1));
  traceGeo.setAttribute('aLen', new BufferAttribute(new Float32Array(tLen), 1));
  traceGeo.setAttribute('aHot', new BufferAttribute(new Float32Array(tHot), 1));
  traceGeo.setAttribute('aPhase', new BufferAttribute(new Float32Array(tPhase), 1));
  const traceUniforms = commonUniforms();
  const traceMat = new ShaderMaterial({
    uniforms: traceUniforms,
    vertexShader: traceVertex,
    fragmentShader: traceFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  scene.add(new LineSegments(traceGeo, traceMat));

  // ---- Grid dots + terminals (one Points object) ----------------------
  const pPos: number[] = [];
  const pSize: number[] = [];
  const pKind: number[] = [];
  const pLen: number[] = [];
  const pPhase: number[] = [];
  for (let y = 0; y < field.rows; y++) {
    for (let x = 0; x < field.cols; x++) {
      pPos.push(...toWorld(x, y));
      pSize.push(3);
      pKind.push(0);
      pLen.push(0);
      pPhase.push(0);
    }
  }
  for (const trace of field.traces) {
    const [ex, ey] = trace.points[trace.points.length - 1]!;
    pPos.push(...toWorld(ex, ey));
    pSize.push(15);
    pKind.push(trace.hot ? 2 : 1);
    pLen.push(trace.length * SPACING);
    pPhase.push(trace.phase);
  }
  const pointGeo = new BufferGeometry();
  pointGeo.setAttribute('position', new BufferAttribute(new Float32Array(pPos), 3));
  pointGeo.setAttribute('aSize', new BufferAttribute(new Float32Array(pSize), 1));
  pointGeo.setAttribute('aKind', new BufferAttribute(new Float32Array(pKind), 1));
  pointGeo.setAttribute('aLen', new BufferAttribute(new Float32Array(pLen), 1));
  pointGeo.setAttribute('aPhase', new BufferAttribute(new Float32Array(pPhase), 1));
  const pointUniforms = { ...commonUniforms(), uPixelRatio: { value: pixelRatio } };
  const pointMat = new ShaderMaterial({
    uniforms: pointUniforms,
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  scene.add(new Points(pointGeo, pointMat));

  const allUniforms = [traceUniforms, pointUniforms];
  const setUniform = <K extends keyof ReturnType<typeof commonUniforms>>(key: K, fn: (u: ReturnType<typeof commonUniforms>[K]) => void) =>
    allUniforms.forEach((u) => fn(u[key]));

  // ---- Pointer probe ------------------------------------------------------
  const raycaster = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), 0);
  const ndc = new Vector2();
  const hit = new Vector3();
  const probe = new Vector2(999, 999);
  const probeTarget = new Vector2(999, 999);
  const tilt = new Vector2();
  const tiltTarget = new Vector2();

  const onPointerMove = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    tiltTarget.set(ndc.x, ndc.y);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(ground, hit)) probeTarget.set(hit.x, hit.z);
  };
  const onPointerLeave = () => probeTarget.set(999, 999);
  const hero = container.closest<HTMLElement>('[data-hero]') ?? container;
  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave);

  // ---- Size ------------------------------------------------------------
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // ---- Visibility & scroll ---------------------------------------------
  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = Boolean(entry?.isIntersecting)));
  io.observe(container);

  let scrollFade = 1;
  const onScroll = () => {
    const h = hero.offsetHeight || window.innerHeight;
    scrollFade = 1 - MathUtils.clamp(window.scrollY / (h * 0.9), 0, 1);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Loop ------------------------------------------------------------
  // Time only advances while the animation is running, so pausing freezes it in place.
  let elapsed = 0;
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = now - last;
    last = now;
    if (!visible || document.hidden || hero.classList.contains('is-motion-paused')) return;
    elapsed += Math.min(dt, 100);
    const t = elapsed / 1000;
    const draw = MathUtils.clamp((t - 0.1) / 2.2, 0, 1);
    const eased = 1 - Math.pow(1 - draw, 3);

    // Snap away when the pointer leaves; glide while it moves.
    if (probeTarget.x > 900 || probe.x > 900) probe.copy(probeTarget);
    else probe.lerp(probeTarget, 0.12);
    tilt.lerp(tiltTarget, 0.05);

    camera.position.set(
      baseCam.x + tilt.x * 0.9,
      baseCam.y + tilt.y * 0.5 + (1 - scrollFade) * 3,
      baseCam.z - (1 - scrollFade) * 2.5,
    );
    camera.lookAt(lookAt);

    setUniform('uTime', (u) => (u.value = t));
    setUniform('uDraw', (u) => (u.value = eased));
    setUniform('uFade', (u) => (u.value = scrollFade));
    setUniform('uPointer', (u) => u.value.copy(probe));
    renderer.render(scene, camera);
  });

  return {
    destroy() {
      renderer.setAnimationLoop(null);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      io.disconnect();
      traceGeo.dispose();
      pointGeo.dispose();
      traceMat.dispose();
      pointMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
