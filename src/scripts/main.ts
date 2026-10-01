/**
 * Site-wide client entry (loaded as a deferred module on every page).
 *
 * Budget: this file and its static imports stay tiny. GSAP-powered
 * enhancements are code-split and fetched when the browser is idle, and only
 * for visitors who have not asked for reduced motion.
 */
import { initClickTracking } from './analytics/track';
import { initReveal } from './motion/reveal';

// Campaign attribution is captured by the consent manager, and only after
// marketing consent (src/scripts/analytics/consent.ts).
initClickTracking();
initReveal();

const root = document.documentElement;
// GSAP flourishes are for tablets and desktops. Phones keep the CSS/observer
// reveals only — no extra JavaScript, no scroll-linked layout work.
const wantsEnhancedMotion =
  root.classList.contains('motion') && root.dataset.motion !== 'lite' && window.matchMedia('(min-width: 48rem)').matches;

function revealSplitFallback() {
  document.querySelectorAll('[data-split], [data-scrub-words]').forEach((el) => el.classList.add('is-split'));
}

if (wantsEnhancedMotion) {
  const load = () =>
    import('./motion/enhance')
      .then((m) => m.initEnhancements())
      .catch(revealSplitFallback);
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(load, { timeout: 1200 });
  else setTimeout(load, 150);
  // Never leave headings hidden if the enhancement chunk is slow to arrive.
  window.setTimeout(() => {
    if (!window.__atlaxysEnhanced) revealSplitFallback();
  }, 4000);
} else {
  revealSplitFallback();
}
