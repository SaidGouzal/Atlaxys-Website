/**
 * Scroll reveals with IntersectionObserver + CSS transitions (no GSAP).
 * Elements: [data-reveal] (fade/rise, "fade", "mask") and [data-draw] (SVG
 * traces). Groups marked [data-reveal-stagger] cascade their children.
 */
export function initReveal() {
  window.__atlaxysMotion = true;
  const root = document.documentElement;
  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], [data-draw]'));

  if (!root.classList.contains('motion') || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-reveal-stagger]').forEach((group) => {
    const step = Number(group.dataset.revealStagger) || 70;
    group.querySelectorAll<HTMLElement>(':scope > [data-reveal], :scope > * > [data-reveal]').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', String(i * step));
    });
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );

  targets.forEach((el) => io.observe(el));
}
