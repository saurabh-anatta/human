/**
 * Scroll-scrubbed animation + carousel controller for The Board section.
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
 * Initializes The Board scroll-scrubbed animation and carousel.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, createRevealObserver: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initTheBoard(sectionEl, { createScrollProgress, createRevealObserver, prefersReducedMotion }) {
  const scrollContainer = sectionEl.querySelector('.story-the-board__scroll-container');
  if (!scrollContainer) return;

  /* --- Part 1: Scroll animation DOM refs --- */
  const stage = sectionEl.querySelector('.story-the-board__stage');
  const mediaWrapper = sectionEl.querySelector('.story-the-board__media-wrapper');
  const desatOverlay = sectionEl.querySelector('.story-the-board__desat-overlay');
  const eyebrow = sectionEl.querySelector('.story-the-board__eyebrow');
  const quote = sectionEl.querySelector('.story-the-board__quote');
  const attribution = sectionEl.querySelector('.story-the-board__attribution');

  /* --- Settled dimensions --- */
  const SETTLED_W = 476;
  const SETTLED_H = 430;
  const SETTLED_RADIUS = 32;
  const SETTLED_W_MOBILE = 280;
  const SETTLED_H_MOBILE = 253;

  /**
   * Returns the settled image dimensions based on viewport size.
   * @returns {{ w: number, h: number }}
   */
  function getSettledDims() {
    const isMobile = window.innerWidth <= 749;
    return {
      w: isMobile ? SETTLED_W_MOBILE : SETTLED_W,
      h: isMobile ? SETTLED_H_MOBILE : SETTLED_H,
    };
  }

  /* --- Set initial states (progress = 0) --- */
  if (mediaWrapper) {
    mediaWrapper.style.width = '100%';
    mediaWrapper.style.height = '100%';
    mediaWrapper.style.top = '0px';
    mediaWrapper.style.left = '0px';
    mediaWrapper.style.borderRadius = '0px';
    mediaWrapper.style.willChange = 'width, height, top, left, border-radius';
  }
  if (desatOverlay) desatOverlay.style.opacity = '1';
  if (eyebrow) eyebrow.style.opacity = '0';
  if (quote) quote.style.opacity = '0';
  if (attribution) attribution.style.opacity = '0';

  /* --- Phase windows --- */
  const SHRINK_START = 0.05;
  const SHRINK_END = 0.40;
  const DESAT_START = 0.05;
  const DESAT_END = 0.40;
  const TEXT_START = 0.30;
  const TEXT_END = 0.50;
  const ATTR_START = 0.45;
  const ATTR_END = 0.60;

  /**
   * Maps scroll progress (0–1) to animation states for all Part 1 elements.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {
    if (!stage) return;
    const stageW = stage.offsetWidth;
    const stageH = stage.offsetHeight;
    const settled = getSettledDims();

    /* ===== Image shrink phase (0.05–0.40) ===== */
    if (mediaWrapper) {
      const shrinkT = phaseProgress(p, SHRINK_START, SHRINK_END);
      const w = lerp(stageW, settled.w, shrinkT);
      const h = lerp(stageH, settled.h, shrinkT);
      const settledTop = stageH * 0.12;
      const settledLeft = (stageW - settled.w) / 2;
      const t = lerp(0, settledTop, shrinkT);
      const l = lerp(0, settledLeft, shrinkT);
      const r = lerp(0, SETTLED_RADIUS, shrinkT);

      mediaWrapper.style.width = w + 'px';
      mediaWrapper.style.height = h + 'px';
      mediaWrapper.style.top = t + 'px';
      mediaWrapper.style.left = l + 'px';
      mediaWrapper.style.borderRadius = r + 'px';
    }

    /* ===== Desat overlay fade-out (0.05–0.40) ===== */
    if (desatOverlay) {
      const desatT = phaseProgress(p, DESAT_START, DESAT_END);
      desatOverlay.style.opacity = String(1 - desatT);
    }

    /* ===== Eyebrow + quote fade-in (0.30–0.50) ===== */
    if (eyebrow) {
      const textT = phaseProgress(p, TEXT_START, TEXT_END);
      eyebrow.style.opacity = String(textT);
    }
    if (quote) {
      const textT = phaseProgress(p, TEXT_START, TEXT_END);
      quote.style.opacity = String(textT);
    }

    /* ===== Attribution fade-in (0.45–0.60) ===== */
    if (attribution) {
      const attrT = phaseProgress(p, ATTR_START, ATTR_END);
      attribution.style.opacity = String(attrT);
    }
  }

  const cleanupScroll = createScrollProgress(scrollContainer, onProgress);

  /* ====================================================================
   *  Part 2 — Carousel entrance + interaction
   * ==================================================================== */

  const carousel = sectionEl.querySelector('.story-the-board__carousel');
  const track = sectionEl.querySelector('.story-the-board__carousel-track');
  const prevBtn = sectionEl.querySelector('.story-the-board__carousel-btn--prev');
  const nextBtn = sectionEl.querySelector('.story-the-board__carousel-btn--next');
  const cards = track ? Array.from(track.children) : [];

  /* --- Entrance observer (slide-in via .is-visible) --- */
  let cleanupReveal = () => {};
  if (carousel) {
    cleanupReveal = createRevealObserver([carousel], { threshold: 0.1 });
  }

  /* --- Carousel state --- */
  let currentIndex = 0;
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;
  let animationId = null;

  /**
   * Returns one card's width + gap (the step size).
   * @returns {number}
   */
  function getCardStep() {
    if (cards.length === 0 || !track) return 0;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 24;
    return cards[0].offsetWidth + gap;
  }

  /**
   * Returns the maximum carousel index (how many steps we can shift).
   * @returns {number}
   */
  function getMaxIndex() {
    if (!track || !carousel || cards.length === 0) return 0;
    const trackW = track.scrollWidth;
    const containerW = carousel.offsetWidth;
    const cardStep = getCardStep();
    if (cardStep === 0) return 0;
    const maxScroll = trackW - containerW;
    if (maxScroll <= 0) return 0;
    return Math.ceil(maxScroll / cardStep);
  }

  /** @param {number} value */
  function setTrackTranslate(value) {
    if (track) track.style.transform = 'translateX(' + value + 'px)';
  }

  function updateButtons() {
    if (prevBtn) prevBtn.disabled = currentIndex <= 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= getMaxIndex();
  }

  /**
   * Navigates the carousel to a specific index, clamped to valid bounds.
   * @param {number} index
   */
  function goToIndex(index) {
    const maxIdx = getMaxIndex();
    currentIndex = Math.max(0, Math.min(index, maxIdx));
    const cardStep = getCardStep();
    currentTranslate = -(currentIndex * cardStep);
    prevTranslate = currentTranslate;
    setTrackTranslate(currentTranslate);
    updateButtons();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => goToIndex(currentIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goToIndex(currentIndex + 1));

  /* --- Pointer / touch drag --- */

  /** @param {MouseEvent|TouchEvent} e */
  function getPointerX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
  }

  /** @param {MouseEvent|TouchEvent} e */
  function onDragStart(e) {
    isDragging = true;
    startX = getPointerX(e);
    if (track) track.style.transition = 'none';
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(animateFrame);
  }

  /** @param {MouseEvent|TouchEvent} e */
  function onDragMove(e) {
    if (!isDragging) return;
    const x = getPointerX(e);
    currentTranslate = prevTranslate + x - startX;
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (track) track.style.transition = '';

    const cardStep = getCardStep();
    if (cardStep > 0) {
      const movedBy = currentTranslate - prevTranslate;
      if (Math.abs(movedBy) > cardStep * 0.2) {
        goToIndex(movedBy < 0 ? currentIndex + 1 : currentIndex - 1);
      } else {
        goToIndex(currentIndex);
      }
    }
  }

  function animateFrame() {
    if (isDragging) {
      setTrackTranslate(currentTranslate);
      animationId = requestAnimationFrame(animateFrame);
    }
  }

  if (track) {
    track.addEventListener('mousedown', onDragStart);
    track.addEventListener('mousemove', onDragMove);
    track.addEventListener('mouseup', onDragEnd);
    track.addEventListener('mouseleave', () => { if (isDragging) onDragEnd(); });
    track.addEventListener('touchstart', onDragStart, { passive: true });
    track.addEventListener('touchmove', onDragMove, { passive: true });
    track.addEventListener('touchend', onDragEnd);

    /* Prevent native image drag */
    for (const card of cards) {
      const imgs = card.querySelectorAll('img');
      for (const img of imgs) {
        img.addEventListener('dragstart', (e) => e.preventDefault());
      }
    }
  }

  updateButtons();

  /* --- Cleanup --- */
  return () => {
    cleanupScroll();
    cleanupReveal();
    if (animationId) cancelAnimationFrame(animationId);
    if (track) {
      track.removeEventListener('mousedown', onDragStart);
      track.removeEventListener('mousemove', onDragMove);
      track.removeEventListener('mouseup', onDragEnd);
      track.removeEventListener('touchstart', onDragStart);
      track.removeEventListener('touchmove', onDragMove);
      track.removeEventListener('touchend', onDragEnd);
    }
    if (prevBtn) prevBtn.removeEventListener('click', () => goToIndex(currentIndex - 1));
    if (nextBtn) nextBtn.removeEventListener('click', () => goToIndex(currentIndex + 1));
  };
}
