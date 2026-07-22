/**
 * Section-specific JS for the mission close scroll-pinned chapter.
 * Drives: desaturation overlay opacity, vessel-line fade-in,
 * and video play/pause via IntersectionObserver.
 *
 * Text blocks scroll naturally over the sticky video via CSS —
 * no JS-driven text positioning needed.
 *
 * @module story-mission-close
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
 * Initialises the mission close section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-mission-close__scroll-track');
  var desatEl = sectionEl.querySelector('.story-mission-close__desat');
  var vesselLineEl = sectionEl.querySelector('.story-mission-close__vessel-line');
  var videoEl = sectionEl.querySelector('.story-mission-close__video');
  var stickyEl = sectionEl.querySelector('.story-mission-close__sticky');

  /* Reduced motion: show settled state immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (desatEl) desatEl.style.opacity = '0';
    if (vesselLineEl) vesselLineEl.style.opacity = '1';
    return function cleanup() {};
  }

  /* Video play/pause via IntersectionObserver */
  var videoObserver = null;
  if (videoEl && stickyEl) {
    videoObserver = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            var playPromise = videoEl.play();
            if (playPromise !== undefined) {
              playPromise.catch(function () {
                /* Autoplay blocked — ignore silently */
              });
            }
          } else {
            videoEl.pause();
          }
        }
      },
      { threshold: 0.1 }
    );
    videoObserver.observe(stickyEl);
  }

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* Phase 1 (0.00–0.10): desat overlay fades in from 0 to 1 */
        /* Phase 2 (0.10–0.75): desat stays at 1 (text blocks scroll through via CSS) */
        /* Phase 3 (0.85–1.00): desat fades out from 1 to 0 */
        if (desatEl) {
          var desatOpacity;
          if (p <= 0.1) {
            desatOpacity = lerp(0, 1, phaseProgress(p, 0.0, 0.1));
          } else if (p <= 0.85) {
            desatOpacity = 1;
          } else {
            desatOpacity = lerp(1, 0, phaseProgress(p, 0.85, 1.0));
          }
          desatEl.style.opacity = desatOpacity;
        }

        /* Phase 4 (0.65–0.85): vessel-line image fades in from 0 to 1 */
        if (vesselLineEl) {
          vesselLineEl.style.opacity = lerp(0, 1, phaseProgress(p, 0.65, 0.85));
        }

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
    if (videoObserver) {
      videoObserver.disconnect();
    }
  };
}
