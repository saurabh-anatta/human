/**
 * Section-specific JS for the In Memoriam scroll-pinned chapter.
 * Drives: desat overlay fade, clip-path shrink from full-bleed to
 * contained card, caption chip / eyebrow / quote reveal.
 *
 * @module story-in-memoriam
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
 * Initialises the In Memoriam section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-in-memoriam__scroll-track');
  var mediaLayer = sectionEl.querySelector('.story-in-memoriam__media-layer');
  var desatEl = sectionEl.querySelector('.story-in-memoriam__desat');
  var captionChip = sectionEl.querySelector('.story-in-memoriam__caption-chip');
  var quoteTicks = sectionEl.querySelector('.story-in-memoriam__quote-ticks');
  var eyebrowEl = sectionEl.querySelector('.story-in-memoriam__eyebrow');
  var quoteEl = sectionEl.querySelector('.story-in-memoriam__quote');

  /* Settled-state clip-path target values (percentages / px) */
  var SETTLED_TOP = 6;
  var SETTLED_RIGHT = 23;
  var SETTLED_BOTTOM = 30;
  var SETTLED_LEFT = 23;
  var SETTLED_RADIUS = 12;

  /* Reduced motion: show settled state immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (desatEl) desatEl.style.display = 'none';
    if (mediaLayer) {
      mediaLayer.style.clipPath = 'none';
    }
    if (captionChip) {
      captionChip.style.opacity = '1';
      captionChip.style.transform = 'translateX(-50%)';
    }
    if (quoteTicks) quoteTicks.style.opacity = '1';
    if (eyebrowEl) eyebrowEl.style.opacity = '1';
    if (quoteEl) {
      quoteEl.style.opacity = '1';
      quoteEl.style.transform = 'none';
    }
    return function cleanup() {};
  }

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* Phase 1 (0.00-0.15): Desat overlay opacity 1 -> 0 (B&W to colour) */
        if (desatEl) {
          desatEl.style.opacity = lerp(1, 0, phaseProgress(p, 0.0, 0.15));
        }

        /* Phase 2 (0.10-0.55): Media-layer clip-path lerps from full-bleed
           to settled card — each param individually interpolated */
        var clipT = phaseProgress(p, 0.10, 0.55);
        if (mediaLayer) {
          var top = lerp(0, SETTLED_TOP, clipT);
          var right = lerp(0, SETTLED_RIGHT, clipT);
          var bottom = lerp(0, SETTLED_BOTTOM, clipT);
          var left = lerp(0, SETTLED_LEFT, clipT);
          var radius = lerp(0, SETTLED_RADIUS, clipT);
          mediaLayer.style.clipPath = 'inset(' + top + '% ' + right + '% ' + bottom + '% ' + left + '% round ' + radius + 'px)';
        }

        /* Phase 3 (0.50-0.65): Caption chip opacity 0->1, translateY 10->0.
           Quote ticks opacity 0->1. */
        if (captionChip) {
          var captionT = phaseProgress(p, 0.50, 0.65);
          captionChip.style.opacity = lerp(0, 1, captionT);
          var captionY = lerp(10, 0, captionT);
          captionChip.style.transform = 'translateX(-50%) translateY(' + captionY + 'px)';
        }
        if (quoteTicks) {
          quoteTicks.style.opacity = lerp(0, 1, phaseProgress(p, 0.50, 0.65));
        }

        /* Phase 4 (0.55-0.70): Eyebrow opacity 0->1 */
        if (eyebrowEl) {
          eyebrowEl.style.opacity = lerp(0, 1, phaseProgress(p, 0.55, 0.70));
        }

        /* Phase 5 (0.60-0.75): Quote text opacity 0->1, translateY 20->0 */
        if (quoteEl) {
          var quoteT = phaseProgress(p, 0.60, 0.75);
          quoteEl.style.opacity = lerp(0, 1, quoteT);
          var quoteY = lerp(20, 0, quoteT);
          quoteEl.style.transform = 'translateY(' + quoteY + 'px)';
        }

        /* Phase 6 (0.75-1.0): Hold settled state */

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
