/**
 * Scroll-scrubbed animation controller for The Problem section.
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
 * Initializes The Problem scroll-scrubbed animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, createRevealObserver: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initTheProblem(sectionEl, { createScrollProgress, createRevealObserver, prefersReducedMotion }) {
  /* --- Intro reveal (normal-flow, uses IntersectionObserver) --- */
  const revealEls = sectionEl.querySelectorAll('[data-reveal]');
  const cleanupReveal = createRevealObserver(revealEls);

  /* --- Scroll-pinned chart area --- */
  const scrollContainer = sectionEl.querySelector('.story-the-problem__scroll-container');
  if (!scrollContainer) return cleanupReveal;

  /* --- DOM refs --- */
  const chart = sectionEl.querySelector('.story-the-problem__chart');
  const bgImages = sectionEl.querySelectorAll('.story-the-problem__bg-image');
  const desatOverlay = sectionEl.querySelector('.story-the-problem__desat-overlay');
  const darkOverlay = sectionEl.querySelector('.story-the-problem__dark-overlay');
  const curves = sectionEl.querySelectorAll('.story-the-problem__curve');
  const callouts = sectionEl.querySelectorAll('.story-the-problem__callout');
  const statOverlay = sectionEl.querySelector('.story-the-problem__stat-overlay');

  /* --- Compute and cache stroke lengths --- */
  const curveLengths = [];
  for (const curve of curves) {
    const len = curve.getTotalLength();
    curveLengths.push(len);
    curve.style.strokeDasharray = String(len);
    curve.style.strokeDashoffset = String(len);
  }

  /* --- Set initial states (progress = 0) --- */
  if (chart) chart.style.opacity = '0';
  for (const img of bgImages) img.style.opacity = '0';
  if (desatOverlay) desatOverlay.style.opacity = '1';
  if (darkOverlay) {
    darkOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    darkOverlay.style.backdropFilter = 'blur(0px)';
    darkOverlay.style.webkitBackdropFilter = 'blur(0px)';
  }
  for (const callout of callouts) callout.style.opacity = '0';
  if (statOverlay) statOverlay.style.opacity = '0';

  /* --- Callout appearance thresholds (scroll-progress points) --- */
  const CALLOUT_THRESHOLDS = [0.15, 0.35, 0.55];

  /**
   * Maps scroll progress (0–1) to animation states for all elements.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {

    /* ===== Chart SVG fade in (0.00–0.08) ===== */
    const chartOp = phaseProgress(p, 0.00, 0.08);
    if (chart) chart.style.opacity = String(chartOp);

    /* ===== Background image crossfade ===== */
    if (bgImages.length >= 1) {
      /* bg1: appears 0.00–0.05, fades out 0.25–0.35 */
      const fade1 = p < 0.25
        ? phaseProgress(p, 0.00, 0.05)
        : 1 - phaseProgress(p, 0.25, 0.35);
      bgImages[0].style.opacity = String(Math.max(0, Math.min(1, fade1)));
    }
    if (bgImages.length >= 2) {
      /* bg2: fades in 0.20–0.30, fades out 0.45–0.55 */
      const in2 = phaseProgress(p, 0.20, 0.30);
      const out2 = 1 - phaseProgress(p, 0.45, 0.55);
      bgImages[1].style.opacity = String(Math.max(0, Math.min(1, Math.min(in2, out2))));
    }
    if (bgImages.length >= 3) {
      /* bg3: fades in 0.40–0.50, persists */
      bgImages[2].style.opacity = String(Math.min(1, phaseProgress(p, 0.40, 0.50)));
    }

    /* ===== Curve line drawing (0.08–0.60) ===== */
    const curveT = phaseProgress(p, 0.08, 0.60);
    for (let i = 0; i < curves.length; i++) {
      curves[i].style.strokeDashoffset = String(curveLengths[i] * (1 - curveT));
    }

    /* ===== Callout reveals ===== */
    for (let i = 0; i < callouts.length; i++) {
      const threshold = CALLOUT_THRESHOLDS[i] ?? 0.5;
      callouts[i].style.opacity = String(phaseProgress(p, threshold, threshold + 0.06));
    }

    /* ===== Dark overlay ===== */
    if (darkOverlay) {
      /* Start dark (0.7) so chart is readable, lighten as chart appears,
         then darken again toward stat reveal */
      let alpha;
      if (p < 0.08) {
        alpha = lerp(0.7, 0.45, chartOp);
      } else if (p < 0.60) {
        alpha = 0.45;
      } else {
        alpha = lerp(0.45, 0.8, phaseProgress(p, 0.60, 0.85));
      }
      darkOverlay.style.backgroundColor = 'rgba(0,0,0,' + alpha + ')';
    }

    /* ===== Desaturation overlay — fade out for color reveal (0.60–0.80) ===== */
    if (desatOverlay) {
      const desatFade = 1 - phaseProgress(p, 0.60, 0.80);
      desatOverlay.style.opacity = String(Math.max(0, desatFade));
    }

    /* ===== Stat overlay (0.80–1.0) ===== */
    if (statOverlay) {
      statOverlay.style.opacity = String(phaseProgress(p, 0.80, 0.95));
    }
  }

  const cleanupScroll = createScrollProgress(scrollContainer, onProgress);

  return () => {
    cleanupReveal();
    cleanupScroll();
  };
}
