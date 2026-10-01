/**
 * GSAP enhancement layer (code-split, idle-loaded, motion-permitting only).
 *
 *   [data-split]           heading lines rise out of a mask on scroll
 *   [data-scrub-words]     words brighten as the paragraph scrolls through
 *   [data-magnetic]        buttons lean toward the pointer (fine pointers)
 *   [data-parallax="0.2"]  vertical parallax, factor of element height
 *   [data-hscroll]         pinned horizontal sequence (≥ 1024px)
 *   [data-counter]         number transitions
 *
 * Arabic text is split by lines/words only — never characters — so cursive
 * joining is preserved.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const isRTL = () => document.documentElement.dir === 'rtl';

/**
 * Right-to-left text is never split: word/line fragments are inline-blocks,
 * and bidi reordering would scramble embedded Latin words (brand names,
 * acronyms). RTL headings and statements animate as whole elements instead.
 */
function rtlFallback() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    el.classList.add('is-split');
    // opacity (not autoAlpha/visibility) keeps the heading in the accessibility tree.
    gsap.from(el, { opacity: 0, y: 28, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  document.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach((el) => {
    el.classList.add('is-split');
    gsap.fromTo(el, { opacity: 0.5 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 55%', scrub: 0.4 } });
  });
}

function splitHeadings() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split');
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.15,
          ease: 'expo.out',
          stagger: 0.085,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      },
    });
  });
}

function scrubWords() {
  document.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach((el) => {
    SplitText.create(el, {
      type: 'words',
      wordsClass: 'scrub-word',
      // Paragraphs may not carry aria-label; the words stay readable as text.
      aria: 'none',
      autoSplit: true,
      onSplit(self) {
        el.classList.add('is-split');
        return gsap.fromTo(
          self.words,
          // Dim state still meets WCAG AA contrast (~4.9:1).
          { opacity: 0.5 },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.12,
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 58%', scrub: 0.4 },
          },
        );
      },
    });
  });
}

function magnetic() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.32);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

function parallax() {
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const factor = Number(el.dataset.parallax) || 0.15;
    gsap.fromTo(
      el,
      { yPercent: factor * 50 },
      {
        yPercent: -factor * 50,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

function horizontalSequences() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 64rem)', () => {
    document.querySelectorAll<HTMLElement>('[data-hscroll]').forEach((section) => {
      const track = section.querySelector<HTMLElement>('[data-hscroll-track]');
      if (!track) return;
      const progress = section.querySelector<HTMLElement>('[data-hscroll-progress]');
      const counter = section.querySelector<HTMLElement>('[data-hscroll-counter]');
      const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-hscroll-step]'));
      const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
      section.classList.add('is-pinned');
      steps[0]?.classList.add('is-active');

      const tween = gsap.to(track, {
        x: () => (isRTL() ? distance() : -distance()),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate(self) {
            if (progress) progress.style.transform = `scaleX(${self.progress})`;
            const active = Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999));
            steps.forEach((s, i) => s.classList.toggle('is-active', i <= active));
            if (counter) counter.textContent = String(active + 1).padStart(2, '0');
          },
        },
      });

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { clearProps: 'transform' });
        section.classList.remove('is-pinned');
      };
    });
  });
}

function counters() {
  document.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => {
    const to = Number(el.dataset.counter);
    if (!Number.isFinite(to)) return;
    const pad = (el.textContent ?? '').trim().length;
    const state = { value: 0 };
    gsap.to(state, {
      value: to,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(state.value)).padStart(pad, '0');
      },
    });
  });
}

export function initEnhancements() {
  window.__atlaxysEnhanced = true;
  const run = () => {
    if (isRTL()) rtlFallback();
    else {
      splitHeadings();
      scrubWords();
    }
    magnetic();
    parallax();
    horizontalSequences();
    counters();
    ScrollTrigger.refresh();
  };
  // Split after web fonts are ready so line breaks are measured correctly.
  if (document.fonts?.status === 'loaded') run();
  else document.fonts.ready.then(run, run);
}
