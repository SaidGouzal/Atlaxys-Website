/**
 * Header behaviour: scroll state, disclosures (mega-menu, language menu),
 * hover intent for pointer users, and the mobile navigation dialog.
 * Everything works with keyboard only; hover is an enhancement.
 */

const HIDE_AFTER = 240;

function setExpanded(toggle: HTMLElement, panel: HTMLElement, open: boolean) {
  toggle.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
  if (panel.hasAttribute('data-mega-panel')) {
    document.querySelector('[data-header]')?.classList.toggle('is-mega-open', open);
  }
}

function initDisclosures() {
  const toggles = Array.from(document.querySelectorAll<HTMLElement>('[data-disclosure-toggle]'));
  const pairs = toggles
    .map((toggle) => ({ toggle, panel: document.getElementById(toggle.getAttribute('aria-controls') ?? '') }))
    .filter((p): p is { toggle: HTMLElement; panel: HTMLElement } => Boolean(p.panel));

  const closeAll = (except?: HTMLElement) =>
    pairs.forEach(({ toggle, panel }) => toggle !== except && setExpanded(toggle, panel, false));

  pairs.forEach(({ toggle, panel }) => {
    const container = toggle.closest<HTMLElement>('[data-mega-item], [data-disclosure]') ?? toggle.parentElement!;

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      closeAll(toggle);
      setExpanded(toggle, panel, open);
    });

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setExpanded(toggle, panel, false);
        toggle.focus();
      }
    });

    container.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && !container.contains(next)) setExpanded(toggle, panel, false);
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node;
    pairs.forEach(({ toggle, panel }) => {
      const container = toggle.closest('[data-mega-item], [data-disclosure]') ?? toggle.parentElement;
      if (container && !container.contains(target)) setExpanded(toggle, panel, false);
    });
  });
}

/** Open the mega-menu on hover for mouse users, with intent delays. */
function initMegaHover() {
  const item = document.querySelector<HTMLElement>('[data-mega-item]');
  const toggle = item?.querySelector<HTMLElement>('[data-mega-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-mega-panel]');
  if (!item || !toggle || !panel) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let timer: number | undefined;
  const schedule = (open: boolean, delay: number) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => setExpanded(toggle, panel, open), delay);
  };

  item.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && schedule(true, 90));
  item.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && schedule(false, 220));
}

function initScrollState(header: HTMLElement) {
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const megaOpen = header.classList.contains('is-mega-open');
    const focusInside = header.contains(document.activeElement);
    if (y > lastY + 4 && y > HIDE_AFTER && !megaOpen && !focusInside) {
      header.classList.add('is-hidden');
    } else if (y < lastY - 4 || y <= HIDE_AFTER) {
      header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}

function initMobileNav() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-mobile-nav]');
  const openBtn = document.querySelector<HTMLElement>('[data-mobile-nav-open]');
  if (!dialog || !openBtn) return;

  const root = document.documentElement;
  openBtn.addEventListener('click', () => {
    dialog.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
    root.style.overflow = 'hidden';
  });

  dialog.querySelector('[data-mobile-nav-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    openBtn.setAttribute('aria-expanded', 'false');
    root.style.overflow = '';
  });
  dialog.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => dialog.close()));

  // Leaving the mobile breakpoint closes the dialog.
  window.matchMedia('(min-width: 64rem)').addEventListener('change', (e) => e.matches && dialog.open && dialog.close());
}

export function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  initScrollState(header);
  initDisclosures();
  initMegaHover();
  initMobileNav();
}
