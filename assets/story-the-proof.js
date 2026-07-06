/**
 * Scroll-scrubbed animation controller for The Proof section.
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
 * Initializes The Proof scroll-scrubbed animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initTheProof(sectionEl, { createScrollProgress, prefersReducedMotion }) {
  const scrollContainer = sectionEl.querySelector('.story-the-proof__scroll-container');
  if (!scrollContainer) return;

  /* --- DOM refs --- */
  const mediaFrame = sectionEl.querySelector('.story-the-proof__media-frame');
  const desatOverlay = sectionEl.querySelector('.story-the-proof__desat-overlay');
  const cards = sectionEl.querySelectorAll('.story-the-proof__card');
  const cardCount = cards.length;

  /* --- Set initial states (progress = 0) --- */
  if (mediaFrame) {
    mediaFrame.style.transform = 'scale(0.85)';
    mediaFrame.style.borderRadius = '16px';
    mediaFrame.style.willChange = 'transform, border-radius';
  }
  if (desatOverlay) desatOverlay.style.opacity = '1';
  for (const card of cards) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
  }

  /* --- Phase windows --- */
  const EXPAND_START = 0.00;
  const EXPAND_END = 0.12;
  const DESAT_FADE_START = 0.05;
  const DESAT_FADE_END = 0.20;
  const CARDS_START = 0.12;
  const CARDS_END = 0.92;
  const cardSpan = cardCount > 0 ? (CARDS_END - CARDS_START) / cardCount : 0;

  /**
   * Maps scroll progress (0–1) to animation states for all elements.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {

    /* ===== Image expansion phase (0.00–0.12) ===== */
    if (mediaFrame) {
      const expandT = phaseProgress(p, EXPAND_START, EXPAND_END);
      const scale = lerp(0.85, 1.0, expandT);
      const radius = lerp(16, 0, expandT);
      mediaFrame.style.transform = 'scale(' + scale + ')';
      mediaFrame.style.borderRadius = radius + 'px';
    }

    /* ===== Desat overlay fade-out (0.05–0.20) ===== */
    if (desatOverlay) {
      const desatT = phaseProgress(p, DESAT_FADE_START, DESAT_FADE_END);
      desatOverlay.style.opacity = String(1 - desatT);
    }

    /* ===== Card reveals (0.12–0.92) ===== */
    for (let i = 0; i < cardCount; i++) {
      const cardStart = CARDS_START + (i * cardSpan);
      const cardEnd = cardStart + cardSpan;
      const cardMid = cardStart + cardSpan * 0.3;

      const t = phaseProgress(p, cardStart, cardEnd);

      let opacity;
      let translateY;

      if (t <= 0) {
        /* Not yet reached — check if this is the next upcoming card */
        const prevCardEnd = i > 0 ? CARDS_START + (i - 1) * cardSpan + cardSpan : CARDS_START;
        const prevCardRevealing = p >= (CARDS_START + (i - 1) * cardSpan) && i > 0;
        if (prevCardRevealing && p >= CARDS_START + (i - 1) * cardSpan + cardSpan * 0.3) {
          /* Preview the next card at 0.2 opacity */
          opacity = 0.2;
          translateY = 20;
        } else {
          opacity = 0;
          translateY = 20;
        }
      } else if (t <= 0.3) {
        /* Preview phase: 0→0.2 opacity */
        const previewT = t / 0.3;
        opacity = lerp(0, 0.2, previewT);
        translateY = 20;
      } else {
        /* Full reveal phase: 0.2→1.0 opacity, translateY 20→0 */
        const revealT = (t - 0.3) / 0.7;
        opacity = lerp(0.2, 1.0, revealT);
        translateY = lerp(20, 0, revealT);
      }

      cards[i].style.opacity = String(opacity);
      cards[i].style.transform = 'translateY(' + translateY + 'px)';
    }
  }

  const cleanupScroll = createScrollProgress(scrollContainer, onProgress);

  return () => {
    cleanupScroll();
  };
}
