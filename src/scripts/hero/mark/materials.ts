/**
 * Materials for the 3D mark, and the two theme palettes.
 *
 * Steel: polished metal (all of its look comes from the studio environment
 * reflections). Blade: lacquered orange with a clear coat. Traces: satin
 * orange that also emits a little light — they are the signal.
 *
 * `withSignal` patches a standard/physical material with the motion
 * vocabulary of the site, computed in the fragment shader from the part's
 * own 2D position, so it is exact whatever the triangulation:
 *   • reveal — the part "routes in" along an axis (steel, blade) or along
 *     its path and then round its ring (traces), behind a hot orange edge;
 *   • signal — a pulse that travels the same way.
 */
import { Color, MeshPhysicalMaterial, Vector2, Vector4, type IUniform, type MeshStandardMaterial } from 'three';

export type Theme = 'dark' | 'light';

export interface Palette {
  /** Multiplies the baked steel gradient: white steel on dark, graphite on light. */
  steel: Color;
  steelRoughness: number;
  bladeEmissive: number;
  traceEmissive: number;
  /** Hot edge / signal colour (HDR). */
  hot: Color;
  blueprint: Color;
  blueprintOpacity: number;
  glow: number;
}

export const PALETTES: Record<Theme, Palette> = {
  dark: {
    steel: new Color(1, 1, 1),
    steelRoughness: 0.2,
    bladeEmissive: 0.26,
    traceEmissive: 0.5,
    hot: new Color('#ffa057').multiplyScalar(4),
    blueprint: new Color('#aeb6c1'),
    blueprintOpacity: 0.6,
    glow: 1,
  },
  light: {
    // The logo's ink version for light surfaces: graphite instead of white steel.
    steel: new Color('#2c323b'),
    steelRoughness: 0.26,
    bladeEmissive: 0.08,
    traceEmissive: 0.24,
    hot: new Color('#ff7a1a').multiplyScalar(2.2),
    blueprint: new Color('#525a66'),
    blueprintOpacity: 0.62,
    glow: 0,
  },
};

export interface SignalUniforms {
  /** 0 → hidden, 1 → fully revealed. */
  uReveal: IUniform<number>;
  /** Signal head position along the part (mark-space units); < 0 = no signal. */
  uPulse: IUniform<number>;
  uPulseGain: IUniform<number>;
  uEdgeGain: IUniform<number>;
  uHot: IUniform<Color>;
  uLen: IUniform<number>;
}

export type SignalPath =
  | { kind: 'axis'; origin: Vector2; dir: Vector2; length: number }
  | { kind: 'path'; points: Vector2[]; node: { center: Vector2; mid: number; outer: number }; entryAngle: number; length: number };

const header = /* glsl */ `
  varying vec3 vMarkPos;
  uniform float uReveal;
  uniform float uPulse;
  uniform float uPulseGain;
  uniform float uEdgeGain;
  uniform float uLen;
  uniform vec3 uHot;
  #ifdef MARK_PATH
    uniform vec2 uPts[4];
    uniform float uCum[4];
    uniform int uCount;
    uniform vec4 uNode;   // centre.xy, mid radius, outer radius
    uniform vec2 uRing;   // entry angle, distance at the ring entry
    float markParam(vec2 p) {
      vec2 dc = p - uNode.xy;
      if (length(dc) < uNode.w + 0.002) {
        // Round the ring from the entry point, both ways at once.
        float a = abs(mod(atan(dc.y, dc.x) - uRing.x + PI, PI2) - PI);
        return uRing.y + a * uNode.z;
      }
      float best = 1e9;
      float s = 0.0;
      for (int i = 0; i < 3; i++) {
        if (i >= uCount - 1) break;
        vec2 a = uPts[i];
        vec2 ab = uPts[i + 1] - a;
        float l2 = dot(ab, ab);
        float t = clamp(dot(p - a, ab) / l2, 0.0, 1.0);
        float d = distance(p, a + ab * t);
        if (d < best) { best = d; s = uCum[i] + t * sqrt(l2); }
      }
      return s;
    }
  #else
    uniform vec4 uAxis;   // origin.xy, direction.xy
    float markParam(vec2 p) { return dot(p - uAxis.xy, uAxis.zw); }
  #endif
`;

const reveal = /* glsl */ `
  float markS = markParam(vMarkPos.xy);
  float markFront = uReveal * (uLen + 0.1) - 0.05;
  if (markS > markFront) discard;
  float markHot = exp(-(markFront - markS) * 9.0) * (1.0 - smoothstep(0.86, 1.0, uReveal));
  float markBehind = uPulse - markS;
  float markPulse = uPulse < 0.0 ? 0.0 : (markBehind >= 0.0 ? exp(-markBehind * 5.0) : exp(-markBehind * markBehind * 900.0));
`;

const emissive = /* glsl */ `
  #ifdef USE_COLOR
    totalEmissiveRadiance *= vColor.rgb;
  #endif
  totalEmissiveRadiance += uHot * (markHot * uEdgeGain + markPulse * uPulseGain);
`;

export function withSignal<M extends MeshStandardMaterial>(material: M, path: SignalPath): SignalUniforms {
  const uniforms: SignalUniforms & Record<string, IUniform> = {
    uReveal: { value: 1 },
    uPulse: { value: -1 },
    uPulseGain: { value: 0 },
    uEdgeGain: { value: 1 },
    uHot: { value: new Color() },
    uLen: { value: path.length },
  };
  if (path.kind === 'axis') {
    uniforms.uAxis = { value: new Vector4(path.origin.x, path.origin.y, path.dir.x, path.dir.y) };
  } else {
    const pts = [...path.points];
    while (pts.length < 4) pts.push(pts[pts.length - 1]!.clone());
    const cum = [0];
    for (let i = 1; i < 4; i++) cum.push(cum[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
    uniforms.uPts = { value: pts };
    uniforms.uCum = { value: cum };
    uniforms.uCount = { value: path.points.length };
    uniforms.uNode = { value: new Vector4(path.node.center.x, path.node.center.y, path.node.mid, path.node.outer) };
    uniforms.uRing = { value: new Vector2(path.entryAngle, cum[path.points.length - 1]!) };
    material.defines = { ...material.defines, MARK_PATH: '' };
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMarkPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMarkPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${header}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${reveal}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissive}`);
  };
  material.customProgramCacheKey = () => `atlaxys-mark-${path.kind}`;
  return uniforms;
}

export function createMaterials() {
  const steel = new MeshPhysicalMaterial({ vertexColors: true, metalness: 1, roughness: 0.2 });
  // Emissive is white: the shader tints it with the baked logo colours, so the
  // orange stays saturated instead of washing out under the studio's reflections.
  // Reflections are tinted warm too (specularColor): a white sheen would turn the brand orange pastel.
  const blade = new MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0,
    roughness: 0.36,
    specularIntensity: 0.7,
    specularColor: new Color('#ff9048'),
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    // The studio is bright for the steel's sake; keep the orange at its brand value.
    color: new Color(0.66, 0.66, 0.66),
    emissive: new Color(1, 1, 1),
  });
  const trace = () =>
    new MeshPhysicalMaterial({
      vertexColors: true,
      metalness: 0,
      roughness: 0.4,
      specularIntensity: 0.6,
      specularColor: new Color('#ffa058'),
      color: new Color(0.72, 0.72, 0.72),
      emissive: new Color(1, 1, 1),
    });
  return { steel, blade, trace };
}
