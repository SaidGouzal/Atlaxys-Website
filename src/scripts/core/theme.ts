/**
 * Light / dark theme.
 *
 * The inline script at the top of BaseLayout.astro sets <html data-theme>
 * before the first paint. This module keeps it in sync afterwards: the
 * toggle buttons, the visitor's stored choice, the device setting (followed
 * live while nothing is stored), other open tabs and the browser UI colour.
 *
 * Storing: a choice is saved only when it differs from the default, so a
 * visitor who switches back to their device's theme goes back to following
 * the device.
 *
 * Components that draw colours themselves (the WebGL hero) listen for the
 * `atlaxys:themechange` window event.
 */

export type Theme = 'light' | 'dark';

const KEY = 'atlaxys-theme';
const root = document.documentElement;
const prefersLight = window.matchMedia('(prefers-color-scheme: light)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export const currentTheme = (): Theme => (root.dataset.theme === 'light' ? 'light' : 'dark');

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

/** The theme a visitor without a stored choice sees (site.theme.default). */
function defaultTheme(): Theme {
  const configured = root.dataset.themeDefault;
  if (configured === 'light' || configured === 'dark') return configured;
  return prefersLight.matches ? 'light' : 'dark';
}

function syncToggles() {
  const dark = String(currentTheme() === 'dark');
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) => button.setAttribute('aria-pressed', dark));
}

function apply(theme: Theme) {
  if (theme === currentTheme()) return;
  root.dataset.theme = theme;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const colour = meta?.dataset[theme];
  if (meta && colour) meta.content = colour;
  syncToggles();
  window.dispatchEvent(new CustomEvent('atlaxys:themechange', { detail: { theme } }));
}

/** Swap without letting per-element colour transitions replay the change. */
function applyWithoutTransitions(theme: Theme) {
  root.classList.add('is-theme-switching');
  apply(theme);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-theme-switching')));
}

/**
 * The new theme opens as a circle from the button that was pressed (View
 * Transitions API). Instant where that API is missing or motion is reduced.
 */
function switchTo(theme: Theme, origin?: HTMLElement) {
  if (reducedMotion.matches || typeof document.startViewTransition !== 'function') {
    applyWithoutTransitions(theme);
    return;
  }
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  root.classList.add('is-theme-switching');
  const transition = document.startViewTransition(() => apply(theme));
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 620, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove('is-theme-switching'));
}

function choose(theme: Theme, origin?: HTMLElement) {
  try {
    if (theme === defaultTheme()) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  switchTo(theme, origin);
}

let initialised = false;

export function initTheme() {
  if (initialised) return;
  initialised = true;

  syncToggles();
  document.querySelectorAll<HTMLElement>('[data-theme-toggle]').forEach((button) =>
    button.addEventListener('click', () => choose(currentTheme() === 'dark' ? 'light' : 'dark', button)),
  );

  // Follow the device while the visitor has not made a choice of their own.
  prefersLight.addEventListener('change', () => {
    if (!storedTheme()) applyWithoutTransitions(defaultTheme());
  });

  // Another tab changed the theme.
  window.addEventListener('storage', (event) => {
    if (event.key === KEY || event.key === null) applyWithoutTransitions(storedTheme() ?? defaultTheme());
  });

  // Back/forward cache: the page may come back with the theme it was left in.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) applyWithoutTransitions(storedTheme() ?? defaultTheme());
  });
}
