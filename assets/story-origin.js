/**
 * Section-specific JS for the origin scroll-pinned chapter.
 * Drives Movement 2: dark overlay fade, sequential lockup content reveals
 * (logo → heading/sub-line → pill button), and video play/pause toggle.
 *
 * @module story-origin
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
 * Initialises the origin section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-origin__scroll-track');
  var darkOverlay = sectionEl.querySelector('.story-origin__dark-overlay');
  var logoEl = sectionEl.querySelector('.story-origin__logo');
  var lockupText = sectionEl.querySelector('.story-origin__lockup-text');
  var pillBtn = sectionEl.querySelector('.story-origin__pill-btn');
  var videoEl = sectionEl.querySelector('.story-origin__media-layer video');
  var toggleBtn = sectionEl.querySelector('.story-origin__video-toggle');

  /* Video toggle handler — wired regardless of reduced-motion */
  function handleToggle() {
    if (!videoEl) return;
    if (videoEl.paused) {
      videoEl.play();
      if (toggleBtn) {
        toggleBtn.classList.remove('paused');
        toggleBtn.setAttribute('aria-label', 'Pause video');
      }
    } else {
      videoEl.pause();
      if (toggleBtn) {
        toggleBtn.classList.add('paused');
        toggleBtn.setAttribute('aria-label', 'Play video');
      }
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', handleToggle);
  }

  /* Reduced motion: show everything immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (darkOverlay) darkOverlay.style.opacity = '0.4';
    if (logoEl) logoEl.style.opacity = '1';
    if (lockupText) lockupText.style.opacity = '1';
    if (pillBtn) pillBtn.style.opacity = '1';
    return function cleanup() {
      if (toggleBtn) toggleBtn.removeEventListener('click', handleToggle);
    };
  }

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* Phase 1 (0.0→0.2): dark overlay opacity ramps to 0.4 */
        if (darkOverlay) {
          darkOverlay.style.opacity = lerp(0, 0.4, phaseProgress(p, 0.0, 0.2));
        }

        /* Phase 2 (0.15→0.35): logo fades in */
        if (logoEl) {
          logoEl.style.opacity = lerp(0, 1, phaseProgress(p, 0.15, 0.35));
        }

        /* Phase 3 (0.35→0.55): heading + sub-line fade in */
        if (lockupText) {
          lockupText.style.opacity = lerp(0, 1, phaseProgress(p, 0.35, 0.55));
        }

        /* Phase 4 (0.55→0.75): pill button fades in */
        if (pillBtn) {
          pillBtn.style.opacity = lerp(0, 1, phaseProgress(p, 0.55, 0.75));
        }

        /* Phase 5 (0.75→1.0): hold state — no additional animation */

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
    if (toggleBtn) toggleBtn.removeEventListener('click', handleToggle);
  };
}
