/**
 * Section-specific JS for the proof scroll-pinned chapter.
 * Drives: image scale-up, intro text fade in/out, eyebrow reveal,
 * and 8 glassmorphism stat cards staggered one at a time with
 * 0.2-opacity look-ahead preview.
 *
 * @module story-proof
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
 * Initialises the proof section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-proof__scroll-track');
  var bgImage = sectionEl.querySelector('.story-proof__bg-image');
  var introEl = sectionEl.querySelector('.story-proof__intro');
  var introHeading = sectionEl.querySelector('.story-proof__intro-heading');
  var introBody = sectionEl.querySelector('.story-proof__intro-body');
  var eyebrowEl = sectionEl.querySelector('.story-proof__eyebrow');
  var cards = sectionEl.querySelectorAll('.story-proof__stat-card');
  var numCards = cards.length;

  /* Reduced motion: show settled state immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (bgImage) bgImage.style.transform = 'scale(1)';
    if (introEl) introEl.style.display = 'none';
    if (eyebrowEl) eyebrowEl.style.opacity = '1';
    for (var i = 0; i < numCards; i++) {
      cards[i].style.opacity = '1';
      cards[i].style.transform = 'none';
    }
    return function cleanup() {};
  }

  /* Initialise heading/body to opacity 0 for staggered fade-in */
  if (introHeading) introHeading.style.opacity = '0';
  if (introBody) introBody.style.opacity = '0';

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* Phase 1 (0.00-0.08): background image scale 0.7 -> 1.0 */
        if (bgImage) {
          var scale = lerp(0.7, 1.0, phaseProgress(p, 0.0, 0.08));
          bgImage.style.transform = 'scale(' + scale + ')';
        }

        /* Phase 2 (0.06-0.14): intro heading opacity 0->1 */
        if (introHeading) {
          introHeading.style.opacity = lerp(0, 1, phaseProgress(p, 0.06, 0.14));
        }

        /* Phase 3 (0.10-0.18): intro body opacity 0->1 */
        if (introBody) {
          introBody.style.opacity = lerp(0, 1, phaseProgress(p, 0.10, 0.18));
        }

        /* Intro container: visible while heading/body animate, fades out in phase 4 */
        if (introEl) {
          if (p >= 0.24) {
            introEl.style.opacity = '0';
          } else if (p >= 0.18) {
            introEl.style.opacity = lerp(1, 0, phaseProgress(p, 0.18, 0.24));
          } else if (p >= 0.06) {
            introEl.style.opacity = '1';
          } else {
            introEl.style.opacity = '0';
          }
        }

        /* Phase 4 (0.18-0.24): eyebrow fades in */
        if (eyebrowEl) {
          eyebrowEl.style.opacity = lerp(0, 1, phaseProgress(p, 0.18, 0.24));
        }

        /* Phase 5 (0.24-0.88): cards stagger in one at a time */
        if (numCards > 0) {
          var cardsStart = 0.24;
          var cardsEnd = 0.88;
          var sliceSize = (cardsEnd - cardsStart) / numCards;

          for (var i = 0; i < numCards; i++) {
            var cardStart = cardsStart + i * sliceSize;
            var cardEnd = cardStart + sliceSize;
            var cardProgress = phaseProgress(p, cardStart, cardEnd);

            /* Own reveal: opacity 0->1, translateY 30->0 */
            var revealOpacity = lerp(0, 1, cardProgress);
            var translateY = lerp(30, 0, cardProgress);

            /* Look-ahead preview: next card shows at 0.2 opacity
               when the current (previous) card is past 50% progress */
            var previewOpacity = 0;
            if (i > 0 && cardProgress === 0) {
              var prevStart = cardsStart + (i - 1) * sliceSize;
              var prevEnd = prevStart + sliceSize;
              var prevProgress = phaseProgress(p, prevStart, prevEnd);
              if (prevProgress > 0.5) {
                previewOpacity = 0.2;
              }
            }

            var finalOpacity = Math.max(revealOpacity, previewOpacity);
            cards[i].style.opacity = finalOpacity;
            cards[i].style.transform = 'translateY(' + translateY + 'px)';
          }
        }

        /* Phase 6 (0.88-1.0): hold settled state */

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
