/**
 * The Atlaxys mark (the "A" symbol) as vector data.
 *
 * Measured from the official logo file, src/assets/brand/source/
 * atlaxys-app-icon.webp (1254 × 1254 px), so the 3D hero mark is the logo
 * itself, not a redrawing of it:
 *
 *   • steel parts — sub-pixel line fits of every straight edge, intersected
 *     into corners (99% overlap with the original pixels);
 *   • blade       — its outline resampled every ~20 px and passed through a
 *     Catmull-Rom spline (98% overlap);
 *   • traces      — 12 px strokes with 45° bends, ending in ring nodes.
 *
 * The logo's own rules are kept: the legs lean at ~61°, every gap around the
 * blade is ~20–24 px, the middle trace starts parallel to the blade's lower
 * edge and the bottom trace parallel to the leg. The lower-right leg sits
 * ~10 px left of the upper stroke, as in the original.
 *
 * Coordinates are source-image pixels (x right, y down). Consumers convert
 * with `toMarkSpace` (1 unit = 100 px, y up, origin at the mark's centre).
 */

export type Pt = readonly [x: number, y: number];

export interface MarkTrace {
  id: 'top' | 'mid' | 'bot';
  /** Centreline from the start to the node centre. */
  path: readonly Pt[];
  /**
   * Horizontal offset (px) of the start cut's top corner relative to its
   * bottom corner: the start is cut on a slant, parallel to a neighbouring
   * edge. 0 = square cut (the top trace grows out of the blade's tip).
   */
  startSlant: number;
}

export const MARK = {
  source: { file: 'src/assets/brand/source/atlaxys-app-icon.webp', size: 1254 },

  /** The A without its lower-right leg: left leg, apex, upper right stroke. */
  body: [
    [675.2, 244.6], // apex, top right
    [569.2, 244.6], // apex, top left (sharp corner; drawn rounded, see apexRadius)
    [313.5, 702.6], // left leg, outer foot
    [421.2, 702.6], // left leg, inner foot
    [618.3, 345.0], // counter apex
    [680.2, 460.0], // inner cut against the blade
    [776.3, 435.4], // outer cut against the blade
  ] as const satisfies readonly Pt[],
  /** Radius of the apex's rounded top-left corner (px). */
  apexRadius: 11,

  /** Lower-right leg, below the blade. */
  leg: [
    [717.1, 550.7],
    [800.9, 702.6],
    [909.7, 702.6],
    [817.5, 532.1],
    [750.1, 532.2],
  ] as const satisfies readonly Pt[],

  /**
   * The orange blade. Both edges run from the sharp tip at the left foot to
   * the right end, where the blade narrows to the trace width and becomes
   * the top trace.
   */
  blade: {
    lower: [
      [450.5, 705.2], [467.9, 695.7], [484.1, 683.8], [500.1, 671.6], [515.9, 659.0], [531.6, 646.4],
      [547.3, 633.9], [563.1, 621.5], [579.2, 609.4], [595.4, 597.3], [611.8, 585.7], [628.5, 574.5],
      [645.5, 563.8], [662.7, 553.3], [680.1, 543.2], [697.6, 533.3], [715.2, 523.6], [732.7, 513.6],
      [750.3, 503.8], [767.7, 493.6], [785.0, 483.4], [802.0, 472.7], [818.8, 461.6], [835.9, 451.2],
    ] as const satisfies readonly Pt[],
    upper: [
      [450.5, 705.2], [459.2, 686.9], [469.2, 669.2], [479.2, 651.5], [489.0, 633.6], [499.0, 615.9],
      [508.9, 598.1], [518.8, 580.3], [528.8, 562.5], [538.7, 544.8], [549.1, 527.2], [561.1, 510.9],
      [579.2, 502.0], [599.0, 497.4], [618.9, 493.0], [638.7, 488.7], [658.6, 484.6], [678.5, 480.2],
      [698.3, 475.8], [718.2, 471.3], [737.9, 466.4], [757.6, 461.4], [777.3, 456.1], [796.9, 450.8],
      [816.4, 445.2], [835.9, 439.3],
    ] as const satisfies readonly Pt[],
    /** Where the amber highlight of the blade sits (its upper-left shoulder). */
    shoulder: [578, 512] as Pt,
  },

  traceWidth: 12,
  node: { outer: 21.3, inner: 9.75 },
  traces: [
    { id: 'top', path: [[835.9, 445.3], [877.6, 445.3], [956.2, 366.7]], startSlant: 0 },
    { id: 'mid', path: [[791, 504], [895, 504], [953.7, 445.3], [1048.8, 445.3]], startSlant: 20 },
    { id: 'bot', path: [[843.5, 540.7], [993.4, 540.7]], startSlant: -6.5 },
  ] as const satisfies readonly MarkTrace[],

  /** Sampled from the source file. */
  colors: {
    steelTop: '#f8fafb',
    steelBottom: '#cbd4e2',
    bladeAmber: '#fe8d03',
    blade: '#fe5e00',
    bladeTip: '#ea4906',
    traceStart: '#fb7301',
    traceEnd: '#fc8f01',
  },

  /** Bounding box of the whole mark, px. */
  bounds: { minX: 313.5, minY: 244.6, maxX: 1070.1, maxY: 705.4 },
} as const;

/** Pixels per mark-space unit. */
export const MARK_UNIT = 100;

/** Centre of the mark's bounding box, px. */
export const MARK_CENTER: Pt = [(MARK.bounds.minX + MARK.bounds.maxX) / 2, (MARK.bounds.minY + MARK.bounds.maxY) / 2];

/** Source pixels → mark space (1 unit = 100 px, y up, origin at the centre). */
export const toMarkSpace = ([x, y]: Pt): [number, number] => [(x - MARK_CENTER[0]) / MARK_UNIT, -(y - MARK_CENTER[1]) / MARK_UNIT];

/** Width / height of the mark, in mark-space units. */
export const MARK_SIZE = {
  width: (MARK.bounds.maxX - MARK.bounds.minX) / MARK_UNIT,
  height: (MARK.bounds.maxY - MARK.bounds.minY) / MARK_UNIT,
} as const;
