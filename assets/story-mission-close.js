/**
 * Mission Close scroll-pinned video with sequential text overlays.
 * ES module — loaded via <script type="module"> in the section Liquid file.
 */

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Progress (0–1)
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Remaps a value within [start, end] to 0–1, clamped.
 * @param {number} value - Current progress
 * @param {number} start - Phase start
 * @param {number} end - Phase end
 * @returns {number} 0–1 within the phase
 */
function phaseProgress(value, start, end) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

/**
 * Initializes the Mission Close scroll-scrubbed animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initMissionClose(sectionEl, { createScrollProgress, prefersReducedMotion }) {
  /* --- Play/pause toggle for background video --- */
  const bgVideo = sectionEl.querySelector('.story-mission-close__video');
  const toggleBtn = sectionEl.querySelector('[data-video-toggle]');
  if (toggleBtn && bgVideo) {
    toggleBtn.addEventListener('click', () => {
      if (bgVideo.paused) {
        bgVideo.play();
        toggleBtn.setAttribute('aria-label', 'Pause background video');
        toggleBtn.classList.remove('is-paused');
      } else {
        bgVideo.pause();
        toggleBtn.setAttribute('aria-label', 'Play background video');
        toggleBtn.classList.add('is-paused');
      }
    });
  }

  /* --- Short-circuit scroll animation for reduced motion --- */
  if (prefersReducedMotion()) return;

  /* --- Scroll-pinned video area --- */
  const scrollContainer = sectionEl.querySelector('.story-mission-close__scroll-container');
  if (!scrollContainer) return;

  /* --- DOM refs --- */
  const textBlock1 = sectionEl.querySelector('.story-mission-close__text-block--1');
  const textBlock2 = sectionEl.querySelector('.story-mission-close__text-block--2');

  let rafPending = false;

  /* --- Phase windows --- */
  /* Text block 1: fade in 0.05→0.15, visible 0.15→0.30, fade out 0.30→0.40 */
  /* Gap with no text: 0.40→0.55 */
  /* Text block 2: fade in 0.55→0.65, visible 0.65→0.80, fade out 0.80→0.90 */
  /* Video plays through to sticky release at 1.0 */

  /**
   * Maps scroll progress (0–1) to text-block opacities.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {
    if (rafPending) return;
    rafPending = true;

    requestAnimationFrame(() => {
      rafPending = false;

      /* Text block 1 */
      if (textBlock1) {
        const fadeIn1 = phaseProgress(p, 0.05, 0.15);
        const fadeOut1 = phaseProgress(p, 0.30, 0.40);
        const opacity1 = fadeIn1 * (1 - fadeOut1);
        textBlock1.style.opacity = String(opacity1);
      }

      /* Text block 2 */
      if (textBlock2) {
        const fadeIn2 = phaseProgress(p, 0.55, 0.65);
        const fadeOut2 = phaseProgress(p, 0.80, 0.90);
        const opacity2 = fadeIn2 * (1 - fadeOut2);
        textBlock2.style.opacity = String(opacity2);
      }
    });
  }

  const cleanupScroll = createScrollProgress(scrollContainer, onProgress);

  /* --- Cleanup --- */
  return () => {
    cleanupScroll();
  };
}
