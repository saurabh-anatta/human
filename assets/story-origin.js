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

  /* ------------------------------------------------------------------ */
  /* Movement 1 — pinned canvas: texts reveal one by one over the same   */
  /* background, then the archival imagery takes over with a parallax    */
  /* drift while the blue annotation line draws in.                      */
  /* ------------------------------------------------------------------ */

  var m1Track = sectionEl.querySelector('.story-origin__m1-track');
  var textPanel1 = sectionEl.querySelector('.story-origin__text-panel--1');
  var textPanel2 = sectionEl.querySelector('.story-origin__text-panel--2');
  var archivalEl = sectionEl.querySelector('.story-origin__archival');
  var archivalImg1 = sectionEl.querySelector('.story-origin__archival-img--1');
  var archivalImg2 = sectionEl.querySelector('.story-origin__archival-img--2');
  var archivalLine = sectionEl.querySelector('.story-origin__archival-line');
  var archivalArrows = sectionEl.querySelector('.story-origin__archival-arrows');
  var cleanupM1 = null;

  /* Fade+rise in, hold, fade out — all panels share the same slot */
  function panelOpacity(el, p, inStart, inEnd, outStart, outEnd) {
    var inP = phaseProgress(p, inStart, inEnd);
    var outP = phaseProgress(p, outStart, outEnd);
    el.style.opacity = inP * (1 - outP);
    el.style.transform = 'translateY(' + lerp(24, 0, inP) + 'px)';
  }

  if (m1Track) {
    cleanupM1 = utils.createScrollProgress(m1Track, {
      onProgress: function (p) {
        requestAnimationFrame(function () {
          /* Text 1 (“In 1998…”): in 0.03-0.10, out 0.24-0.31 */
          if (textPanel1) panelOpacity(textPanel1, p, 0.03, 0.10, 0.24, 0.31);

          /* Text 2 (“In 2009…”): in 0.34-0.41, out 0.55-0.62 */
          if (textPanel2) panelOpacity(textPanel2, p, 0.34, 0.41, 0.55, 0.62);

          /* Archival imagery takes over the canvas: in 0.63-0.69 */
          if (archivalEl) {
            archivalEl.style.opacity = phaseProgress(p, 0.63, 0.69);
          }

          /* Image 1 drifts, hands off to image 2 at 0.80-0.86 */
          if (archivalImg1) {
            archivalImg1.style.opacity = 1 - phaseProgress(p, 0.80, 0.86);
            archivalImg1.style.transform =
              'scale(1.08) translateY(' + lerp(20, -20, phaseProgress(p, 0.63, 0.86)) + 'px)';
          }
          if (archivalImg2) {
            archivalImg2.style.opacity = phaseProgress(p, 0.80, 0.86);
            archivalImg2.style.transform =
              'scale(1.08) translateY(' + lerp(20, -20, phaseProgress(p, 0.80, 1.0)) + 'px)';
          }

          /* Blue annotation line draws across, then the arrows appear */
          if (archivalLine) {
            archivalLine.style.strokeDashoffset = 1 - phaseProgress(p, 0.68, 0.82);
          }
          if (archivalArrows) {
            archivalArrows.style.opacity = phaseProgress(p, 0.82, 0.88);
          }
        });
      }
    });
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
    if (cleanupM1) cleanupM1();
    if (toggleBtn) toggleBtn.removeEventListener('click', handleToggle);
  };
}
