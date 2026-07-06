/**
 * Scroll-scrubbed animation controller for the Universal Truth section.
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
 * Initializes the Universal Truth scroll-scrubbed animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initUniversalTruth(sectionEl, { createScrollProgress, prefersReducedMotion }) {
  if (prefersReducedMotion()) return;

  const scrollContainer = sectionEl.querySelector('.story-universal-truth__scroll-container');
  const heading = sectionEl.querySelector('.story-universal-truth__heading');
  const eyebrow = sectionEl.querySelector('.story-universal-truth__eyebrow');
  const lines = sectionEl.querySelectorAll('.story-universal-truth__line');
  const closing = sectionEl.querySelector('.story-universal-truth__closing');
  const glass = sectionEl.querySelector('.story-universal-truth__glass');
  const vesselPaths = sectionEl.querySelectorAll('.story-universal-truth__vessel');

  if (!scrollContainer || !heading || !closing || !glass) return;

  /* --- Prepare vessel path lengths for stroke-draw animation --- */
  /** @type {{ el: SVGPathElement, totalLength: number }[]} */
  const vesselData = [];
  for (const path of vesselPaths) {
    const totalLength = path.getTotalLength();
    path.style.strokeDasharray = String(totalLength);
    path.style.strokeDashoffset = String(totalLength);
    vesselData.push({ el: path, totalLength });
  }

  /* --- Set initial states (p = 0) --- */
  heading.style.transform = 'scale(6.25)';
  heading.style.opacity = '0.3';
  if (eyebrow) eyebrow.style.opacity = '0';
  for (const line of lines) {
    line.style.opacity = '0';
  }
  closing.style.opacity = '0';
  closing.style.transform = 'scale(6.67)';
  glass.style.opacity = '1';

  /**
   * Maps scroll progress (0–1) to animation states for all elements.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {
    /* ===== HEADING ZOOM ===== */
    /* Phase 1 (0–0.12): scale 6.25 → 1.875, opacity 0.3 → 1 */
    /* Phase 2 (0.12–0.18): scale 1.875 → 1 (settle to base 32px) */
    let headingScale;
    let headingOpacity;

    if (p < 0.12) {
      const t = phaseProgress(p, 0, 0.12);
      headingScale = lerp(6.25, 1.875, t);
      headingOpacity = lerp(0.3, 1, t);
    } else if (p < 0.18) {
      const t = phaseProgress(p, 0.12, 0.18);
      headingScale = lerp(1.875, 1, t);
      headingOpacity = 1;
    } else {
      headingScale = 1;
      headingOpacity = 1;
    }

    /* ===== EYEBROW: fade in during Phase 1 ===== */
    let eyebrowOpacity = phaseProgress(p, 0.04, 0.12);

    /* ===== GLASS OVERLAY ===== */
    /* Visible during heading zoom-in, fades away, reappears for closing zoom */
    let glassOpacity;
    if (p < 0.08) {
      glassOpacity = lerp(1, 0, phaseProgress(p, 0, 0.08));
    } else if (p < 0.55) {
      glassOpacity = 0;
    } else if (p < 0.62) {
      glassOpacity = lerp(0, 1, phaseProgress(p, 0.55, 0.62));
    } else if (p < 0.72) {
      glassOpacity = lerp(1, 0, phaseProgress(p, 0.65, 0.72));
    } else {
      glassOpacity = 0;
    }

    /* ===== LINES: sequential fade-in (0.20–0.48) ===== */
    const linePhases = [
      [0.20, 0.27],
      [0.27, 0.34],
      [0.34, 0.41],
      [0.41, 0.48],
    ];
    const lineOpacities = [];
    for (let i = 0; i < 4; i++) {
      lineOpacities[i] = phaseProgress(p, linePhases[i][0], linePhases[i][1]);
    }

    /* ===== ALL TEXT FADE OUT (0.50–0.58) ===== */
    if (p >= 0.50) {
      const fadeOut = p < 0.58 ? 1 - phaseProgress(p, 0.50, 0.58) : 0;
      headingOpacity = headingOpacity * fadeOut;
      eyebrowOpacity = eyebrowOpacity * fadeOut;
      for (let i = 0; i < lineOpacities.length; i++) {
        lineOpacities[i] = lineOpacities[i] * fadeOut;
      }
    }

    /* --- Apply heading --- */
    heading.style.transform = 'scale(' + headingScale + ')';
    heading.style.opacity = String(headingOpacity);

    /* --- Apply eyebrow --- */
    if (eyebrow) {
      eyebrow.style.opacity = String(eyebrowOpacity);
    }

    /* --- Apply lines --- */
    for (let i = 0; i < lines.length && i < lineOpacities.length; i++) {
      lines[i].style.opacity = String(lineOpacities[i]);
    }

    /* --- Apply glass --- */
    glass.style.opacity = String(glassOpacity);

    /* ===== CLOSING ZOOM (0.60–0.75): scale 6.67 → 1, opacity 0.3 → 1 ===== */
    let closingScale;
    let closingOpacity;

    if (p < 0.60) {
      closingScale = 6.67;
      closingOpacity = 0;
    } else if (p < 0.75) {
      const t = phaseProgress(p, 0.60, 0.75);
      closingScale = lerp(6.67, 1, t);
      closingOpacity = lerp(0.3, 1, t);
    } else {
      closingScale = 1;
      closingOpacity = 1;
    }

    closing.style.transform = 'scale(' + closingScale + ')';
    closing.style.opacity = String(closingOpacity);

    /* ===== VESSEL STROKE-DRAW: staggered reveal ===== */
    const vesselCount = vesselData.length;
    for (let i = 0; i < vesselCount; i++) {
      /* Stagger start so earlier paths begin drawing sooner */
      const staggerStart = (i / vesselCount) * 0.3;
      const staggerEnd = staggerStart + 0.7;
      const vp = phaseProgress(p, staggerStart, Math.min(staggerEnd, 1));
      const offset = vesselData[i].totalLength * (1 - vp);
      vesselData[i].el.style.strokeDashoffset = String(offset);
    }
  }

  return createScrollProgress(scrollContainer, onProgress);
}
