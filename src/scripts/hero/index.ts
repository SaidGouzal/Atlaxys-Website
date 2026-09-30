/**
 * Decides whether the WebGL hero is worth loading on this device.
 *
 * Loads Three.js only when ALL are true:
 *   • motion is allowed (no prefers-reduced-motion)
 *   • wide viewport and a fine pointer (desktop / laptop)
 *   • no Data Saver, at least 4 CPU cores
 *   • WebGL is available
 * Otherwise the server-rendered SVG field stays — it is the same design.
 */
import type { SignalField } from '@/lib/signal/routing';

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function capable(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  return (
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    window.matchMedia('(min-width: 64rem) and (pointer: fine)').matches &&
    !nav.connection?.saveData &&
    (nav.hardwareConcurrency ?? 4) >= 4 &&
    (nav.deviceMemory ?? 8) >= 4 &&
    webglAvailable()
  );
}

export function initHeroField() {
  const root = document.querySelector<HTMLElement>('[data-signal-field]');
  const mount = root?.querySelector<HTMLElement>('[data-signal-gl]');
  const data = root?.querySelector<HTMLScriptElement>('[data-signal-data]');
  if (!root || !mount || !data) return;

  // Pause the SVG pulses whenever the hero is off-screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => root.classList.toggle('is-paused', !entry?.isIntersecting)).observe(root);
  }

  if (!capable()) return;

  const load = async () => {
    try {
      const field = JSON.parse(data.textContent ?? '{}') as SignalField;
      const { createSignalScene } = await import('./signal-scene');
      createSignalScene(mount, field, { rtl: document.documentElement.dir === 'rtl' });
      requestAnimationFrame(() => root.classList.add('is-gl'));
    } catch (error) {
      console.warn('[hero] WebGL field unavailable, keeping SVG fallback.', error);
    }
  };

  // Wait for the page to finish loading, then for an idle moment.
  const whenIdle = () =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => void load(), { timeout: 2500 }) : setTimeout(load, 600);
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}
