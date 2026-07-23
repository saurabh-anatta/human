/**
 * Section-specific JS for the cinematic entry hero.
 * Handles scroll-driven parallax fade-out and reduced-motion fallback.
 *
 * @module story-cinematic-entry
 */

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Progress (0-1).
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Maps a value within a [start, end] sub-range to 0-1, clamped.
 * @param {number} value - Current progress (0-1).
 * @param {number} start - Phase start threshold.
 * @param {number} end - Phase end threshold.
 * @returns {number}
 */
function phaseProgress(value, start, end) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

/**
 * Initialises the cinematic entry section.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  const contentEl = sectionEl.querySelector('.story-cinematic-entry__content');
  const topEl = sectionEl.querySelector('.story-cinematic-entry__top');
  const bottomEl = sectionEl.querySelector('.story-cinematic-entry__bottom');
  const videoEl = sectionEl.querySelector('.story-cinematic-entry__video');

  /* Collect all elements that should fade out on scroll */
  const fadeEls = [contentEl, topEl, bottomEl].filter(Boolean);

  /* Reduced motion: pause video, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (videoEl) {
      videoEl.pause();
    }
    return function cleanup() {};
  }

  /* Parallax fade-out: opacity 1 -> 0, translateY 0 -> -30px over the first
     half of the hero scrolling out of view. The hero is exactly one viewport
     tall (no sticky scroll track), so progress is derived from how far the
     section has moved past the top of the viewport — NOT from
     utils.createScrollProgress, whose totalDistance is 0 here and would
     report progress 1 (fully faded) on load. */
  let cleanupScroll = function () {};

  if (fadeEls.length > 0) {
    let ticking = false;

    const applyFade = function () {
      const rect = sectionEl.getBoundingClientRect();
      const height = rect.height || window.innerHeight;
      const progress = Math.min(Math.max(-rect.top / height, 0), 1);
      const phase = phaseProgress(progress, 0, 0.5);
      const opacity = lerp(1, 0, phase);
      const translateY = lerp(0, -30, phase);

      for (const el of fadeEls) {
        el.style.opacity = opacity;
        if (el === contentEl) {
          el.style.transform = 'translateY(' + translateY + 'px)';
        } else {
          /* Preserve translateX(-50%) centering on absolutely-positioned elements */
          el.style.transform = 'translateX(-50%) translateY(' + translateY + 'px)';
        }
      }
      ticking = false;
    };

    const onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(applyFade);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    cleanupScroll = function () {
      window.removeEventListener('scroll', onScroll);
    };
  }

  return function cleanup() {
    cleanupScroll();
  };
}
