/**
 * Scroll-scrubbed animation controller for the Origin section.
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
 * Initializes the Origin scroll-scrubbed animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, createRevealObserver: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initOrigin(sectionEl, { createScrollProgress, createRevealObserver, prefersReducedMotion }) {
  /* --- Intro reveal (normal-flow, uses IntersectionObserver) --- */
  const revealEls = sectionEl.querySelectorAll('[data-reveal]');
  const cleanupReveal = createRevealObserver(revealEls);

  /* --- Modal logic (always wired, even for reduced motion) --- */
  const watchBtn = sectionEl.querySelector('[data-watch-btn]');
  const dialog = sectionEl.querySelector('.story-origin__modal');
  const modalVideo = dialog ? dialog.querySelector('video') : null;
  const closeBtn = dialog ? dialog.querySelector('[data-modal-close]') : null;

  if (watchBtn && dialog) {
    watchBtn.addEventListener('click', () => {
      dialog.showModal();
      if (modalVideo) {
        modalVideo.currentTime = 0;
        modalVideo.play();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        dialog.close();
      });
    }

    dialog.addEventListener('close', () => {
      if (modalVideo) {
        modalVideo.pause();
      }
    });
  }

  /* --- Play/pause toggle for background video --- */
  const bgVideo = sectionEl.querySelector('.story-origin__video');
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

  /* --- Short-circuit scroll animation for reduced motion (modal still works) --- */
  if (prefersReducedMotion()) return cleanupReveal;

  /* --- Scroll-pinned video area --- */
  const scrollContainer = sectionEl.querySelector('.story-origin__scroll-container');
  if (!scrollContainer) return cleanupReveal;

  /* --- DOM refs --- */
  const desatOverlay = sectionEl.querySelector('.story-origin__desat-overlay');
  const darkOverlay = sectionEl.querySelector('.story-origin__dark-overlay');
  const logo = sectionEl.querySelector('.story-origin__logo');
  const heading = sectionEl.querySelector('.story-origin__overlay-heading');
  const subtitle = sectionEl.querySelector('.story-origin__overlay-subtitle');
  const watchBtnEl = sectionEl.querySelector('[data-watch-btn]');

  /* --- Set initial states (progress = 0) --- */
  if (desatOverlay) desatOverlay.style.opacity = '1';
  if (darkOverlay) darkOverlay.style.backgroundColor = 'rgba(0,0,0,0)';
  if (logo) logo.style.opacity = '0';
  if (heading) heading.style.opacity = '0';
  if (subtitle) subtitle.style.opacity = '0';
  if (watchBtnEl) watchBtnEl.style.opacity = '0';

  /**
   * Maps scroll progress (0–1) to animation states for all elements.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {

    /* ===== Desat overlay fade-out (0.00–0.15) ===== */
    if (desatOverlay) {
      const desatOp = 1 - phaseProgress(p, 0.0, 0.15);
      desatOverlay.style.opacity = String(desatOp);
    }

    /* ===== Dark overlay to rgba(0,0,0,0.4) (0.00–0.20) ===== */
    if (darkOverlay) {
      const alpha = lerp(0, 0.4, phaseProgress(p, 0.0, 0.20));
      darkOverlay.style.backgroundColor = 'rgba(0,0,0,' + alpha + ')';
    }

    /* ===== Logo fade-in (0.15–0.30) ===== */
    if (logo) {
      logo.style.opacity = String(phaseProgress(p, 0.15, 0.30));
    }

    /* ===== Heading fade-in (0.20–0.35) ===== */
    if (heading) {
      heading.style.opacity = String(phaseProgress(p, 0.20, 0.35));
    }

    /* ===== Subtitle fade-in (0.25–0.38) ===== */
    if (subtitle) {
      subtitle.style.opacity = String(phaseProgress(p, 0.25, 0.38));
    }

    /* ===== Watch button fade-in (0.65–0.85) ===== */
    if (watchBtnEl) {
      watchBtnEl.style.opacity = String(phaseProgress(p, 0.65, 0.85));
      watchBtnEl.style.pointerEvents = p >= 0.70 ? 'auto' : 'none';
    }
  }

  const cleanupScroll = createScrollProgress(scrollContainer, onProgress);

  return () => {
    cleanupReveal();
    cleanupScroll();
  };
}
