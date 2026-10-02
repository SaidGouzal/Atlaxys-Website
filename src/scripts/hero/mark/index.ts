/**
 * Hero mark — the eager, tiny part (no Three.js, no GSAP).
 *
 * Places the mark's slot beside the headline (desktop) or uses its in-flow
 * slot (phones, tablets), then decides how to show it:
 *
 *   3D     motion allowed, WebGL 2, enough CPU/memory, no Data Saver, not a
 *          slow connection → stage.ts (Three.js + GSAP) is fetched when the
 *          browser is idle and the slot is near the viewport;
 *   still  otherwise → a pre-rendered image of the same 3D mark, fetched
 *          only then (it stays display:none, and lazy, in the 3D case).
 *
 * State lives on the hero: data-mark="gl" | "static" | "none".
 */
import { fitBox, lineBoxes, type Rect } from './layout';

/** Proportions of the mark's box (the rest pose's projection, and the still images). */
export const MARK_ASPECT = 1.5;

export interface Placement {
  mode: 'fit' | 'flow';
  /** The box the assembled mark fills, relative to the hero. */
  frame: Rect;
  /** The hero's own box: the canvas never leaves it. */
  bounds: Rect;
}

const px = (value: string) => parseFloat(value) || 0;

/** Measures the hero and places the slot. Null when there is no room for the mark. */
export function placeMark(hero: HTMLElement, slot: HTMLElement): Placement | null {
  const origin = hero.getBoundingClientRect();
  const bounds: Rect = { x: 0, y: 0, w: origin.width, h: origin.height };

  if (getComputedStyle(slot).position !== 'absolute') {
    slot.removeAttribute('data-placed');
    const r = slot.getBoundingClientRect();
    const h = Math.min(r.height, r.width / MARK_ASPECT);
    const w = h * MARK_ASPECT;
    if (h < 40) return null;
    const frame = { x: r.left - origin.left + (r.width - w) / 2, y: r.top - origin.top + (r.height - h) / 2, w, h };
    return { mode: 'flow', frame, bounds };
  }

  const container = hero.querySelector<HTMLElement>('[data-mark-area]');
  const footer = hero.querySelector<HTMLElement>('[data-mark-floor]');
  const title = hero.querySelector<HTMLElement>('h1');
  if (!container || !footer || !title) return null;
  const c = container.getBoundingClientRect();
  const cs = getComputedStyle(container);
  const top = document.querySelector<HTMLElement>('[data-header]')?.offsetHeight ?? 72;
  // Above the capabilities row, and within the first screen: the mark is seen on arrival.
  const floor = Math.min(footer.getBoundingClientRect().top - origin.top - 8, window.innerHeight - 24);
  const area: Rect = {
    x: c.left - origin.left + px(cs.paddingLeft),
    y: top + 28,
    w: c.width - px(cs.paddingLeft) - px(cs.paddingRight),
    h: floor - top - 28,
  };
  const obstacles = Array.from(hero.querySelectorAll('[data-mark-avoid]')).flatMap((el) => lineBoxes(el, origin));
  const t = title.getBoundingClientRect();
  const rtl = getComputedStyle(hero).direction === 'rtl';
  const frame = fitBox(area, obstacles, {
    aspect: MARK_ASPECT,
    minH: 170,
    maxH: Math.min(area.h * 0.8, 560),
    pad: 36,
    prefer: { x: rtl ? area.x + area.w * 0.16 : area.x + area.w * 0.84, y: t.top - origin.top + t.height * 0.62 },
  });
  if (!frame) {
    slot.removeAttribute('data-placed');
    return null;
  }
  slot.style.setProperty('--mark-x', `${Math.round(frame.x)}px`);
  slot.style.setProperty('--mark-y', `${Math.round(frame.y)}px`);
  slot.style.setProperty('--mark-w', `${Math.round(frame.w)}px`);
  slot.style.setProperty('--mark-h', `${Math.round(frame.h)}px`);
  slot.setAttribute('data-placed', '');
  return { mode: 'fit', frame, bounds };
}

function webgl2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

/** Can this device run the 3D mark comfortably? */
function capable(): boolean {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };
  return (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !nav.connection?.saveData &&
    !/(^|-)2g$|^3g$/.test(nav.connection?.effectiveType ?? '') &&
    (nav.hardwareConcurrency ?? 4) >= 4 &&
    (nav.deviceMemory ?? 8) >= 4 &&
    webgl2()
  );
}

export function initHeroMark() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const slot = hero?.querySelector<HTMLElement>('[data-mark-slot]');
  const layer = hero?.querySelector<HTMLElement>('[data-mark-gl]');
  if (!hero || !slot || !layer) return;

  let watching = false;
  const placeStill = () => {
    if (hero.dataset.mark !== 'gl') hero.dataset.mark = placeMark(hero, slot) ? 'static' : 'none';
  };
  const showStill = () => {
    placeStill();
    if (watching) return;
    watching = true;
    // Keep the still beside the text as the layout changes (resize, web fonts).
    new ResizeObserver(placeStill).observe(hero);
    document.fonts?.ready.then(placeStill);
  };

  if (!capable()) {
    showStill();
    return;
  }

  // Place now (no layout jump later), load the 3D when idle and near the viewport.
  placeMark(hero, slot);
  const load = () => {
    import('./stage')
      .then(({ startStage }) => startStage({ hero, slot, layer, onFail: showStill }))
      .catch((error) => {
        console.warn('[hero] 3D mark unavailable, showing the still image.', error);
        layer.replaceChildren();
        delete hero.dataset.mark;
        showStill();
      });
  };
  const whenIdle = () => {
    const idle = () =>
      typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(load, { timeout: 2500 }) : setTimeout(load, 500);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        idle();
      },
      { rootMargin: '25% 0px' },
    );
    io.observe(slot.getBoundingClientRect().height ? slot : hero);
  };
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
