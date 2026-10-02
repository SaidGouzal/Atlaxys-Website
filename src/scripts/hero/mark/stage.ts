/**
 * Hero mark — the lazy part: Three.js scene + GSAP choreography.
 *
 *   enter    the mark assembles once its slot is in view (never before the
 *            headline has had its moment).
 *   pointer  light and reflections follow a mouse or pen; touch gets a slow drift.
 *   scroll   ScrollTrigger scrubs the hero's exit: the mark opens into its
 *            exploded blueprint view, lags behind the page a little, then
 *            fades as the next section arrives.
 *   pause    the hero's "Pause background animation" button freezes it.
 *
 * Rendering stops whenever the hero is off-screen or the tab is hidden.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { placeMark, type Placement } from './index';
import { createMarkScene } from './scene';

gsap.registerPlugin(ScrollTrigger);

interface StageOptions {
  hero: HTMLElement;
  slot: HTMLElement;
  layer: HTMLElement;
  /** Show the still image instead (context lost). */
  onFail: () => void;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export async function startStage({ hero, slot, layer, onFail }: StageOptions) {
  const theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const cleanups: (() => void)[] = [];
  const teardown = () => cleanups.splice(0).forEach((fn) => fn());

  const scene = createMarkScene(layer, {
    theme: theme(),
    rtl: getComputedStyle(hero).direction === 'rtl',
    coarse: !fine,
    onContextLost: () => {
      teardown();
      delete hero.dataset.mark;
      onFail();
    },
  });
  cleanups.push(() => scene.destroy());
  await scene.ready;

  // ---- Visibility --------------------------------------------------------------
  let onScreen = false;
  const sync = () => scene.setActive(onScreen && !document.hidden && hero.dataset.mark === 'gl');

  // ---- Placement -----------------------------------------------------------
  let placement: Placement | null = null;
  const place = () => {
    placement = placeMark(hero, slot);
    hero.dataset.mark = placement ? 'gl' : 'none';
    if (placement) scene.layout(placement.frame, placement.bounds);
    sync();
  };
  place();
  let raf = 0;
  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(place);
  });
  resizeObserver.observe(hero);
  document.fonts?.ready.then(place);
  cleanups.push(() => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
  });

  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = Boolean(entry?.isIntersecting);
    sync();
  });
  visibility.observe(layer);
  document.addEventListener('visibilitychange', sync);
  cleanups.push(() => {
    visibility.disconnect();
    document.removeEventListener('visibilitychange', sync);
  });

  // ---- Enter: assemble when the slot is in view --------------------------------
  const enter = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      enter.disconnect();
      // The headline's entrance (CSS, ~1.2 s) comes first: reading order.
      void scene.assemble(Math.max(0.15, 1.2 - performance.now() / 1000));
    },
    { threshold: 0.35 },
  );
  enter.observe(slot);
  cleanups.push(() => enter.disconnect());

  // ---- Pause control ------------------------------------------------------------
  const paused = () => scene.setPaused(hero.classList.contains('is-motion-paused'));
  const classes = new MutationObserver(paused);
  classes.observe(hero, { attributes: true, attributeFilter: ['class'] });
  paused();
  cleanups.push(() => classes.disconnect());

  // ---- Theme -------------------------------------------------------------------
  const onTheme = () => scene.setTheme(theme());
  window.addEventListener('atlaxys:themechange', onTheme);
  cleanups.push(() => window.removeEventListener('atlaxys:themechange', onTheme));

  // ---- Pointer (mouse and pen; touch scrolls) ---------------------------------
  if (fine) {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !placement) return;
      const r = hero.getBoundingClientRect();
      const { frame } = placement;
      scene.setPointer(
        (e.clientX - (r.left + frame.x + frame.w / 2)) / (r.width * 0.5),
        -(e.clientY - (r.top + frame.y + frame.h / 2)) / (r.height * 0.5),
      );
    };
    const onLeave = () => scene.setPointer(null);
    hero.addEventListener('pointermove', onMove, { passive: true });
    hero.addEventListener('pointerleave', onLeave);
    cleanups.push(() => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    });
  }

  // ---- Scroll: the exploded view ------------------------------------------------
  // Desktop: the whole hero exit. Phones/tablets: from the slot's centre passing
  // the middle of the screen until it leaves.
  const mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 64rem)', narrow: '(max-width: 63.99rem)' }, (context) => {
    const wide = Boolean(context.conditions?.wide);
    const state = { p: 0 };
    const apply = () => {
      const p = state.p;
      scene.setExplode(smoothstep(0.02, 0.62, p));
      // Lags a little behind the page, and is gone before the next section's text arrives.
      const lag = placement ? (wide ? placement.bounds.h * 0.14 : placement.frame.h * 0.2) : 0;
      scene.canvas.style.transform = `translate3d(0, ${(p * lag).toFixed(1)}px, 0)`;
      scene.canvas.style.opacity = String(1 - smoothstep(0.5, 0.82, p));
    };
    gsap.to(state, {
      p: 1,
      ease: 'none',
      onUpdate: apply,
      scrollTrigger: wide
        ? { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.8 }
        : { trigger: slot, start: 'center 42%', end: 'bottom top', scrub: 0.8 },
    });
    return () => {
      scene.canvas.style.transform = '';
      scene.canvas.style.opacity = '';
    };
  });
  cleanups.push(() => mm.revert());
}
