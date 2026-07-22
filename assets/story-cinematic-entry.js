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
  const videoEl = sectionEl.querySelector('.story-cinematic-entry__video');

  /* Reduced motion: pause video, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (videoEl) {
      videoEl.pause();
    }
    return function cleanup() {};
  }

  /* Parallax fade-out: opacity 1 -> 0, translateY 0 -> -30px over first half of scroll */
  let cleanupScroll = function () {};

  if (contentEl) {
    cleanupScroll = utils.createScrollProgress(sectionEl, {
      onProgress: function (progress) {
        const phase = phaseProgress(progress, 0, 0.5);
        const opacity = lerp(1, 0, phase);
        const translateY = lerp(0, -30, phase);

        requestAnimationFrame(function () {
          contentEl.style.opacity = opacity;
          contentEl.style.transform = 'translateY(' + translateY + 'px)';
        });
      }
    });
  }

  return function cleanup() {
    cleanupScroll();
  };
}
