/**
 * Reveal entrance + carousel controller for the Timeline section.
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
 * Initializes the Timeline section reveal animations and carousel.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createRevealObserver: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initTimeline(sectionEl, { createRevealObserver, prefersReducedMotion }) {
  /* --- Heading reveal --- */
  const heading = sectionEl.querySelector('[data-reveal="heading"]');
  let cleanupHeading = () => {};
  if (heading) {
    cleanupHeading = createRevealObserver([heading], { threshold: 0.1 });
  }

  /* --- Carousel reveal (slide-in from left) --- */
  const carousel = sectionEl.querySelector('.story-timeline__carousel');
  let cleanupCarousel = () => {};
  if (carousel) {
    cleanupCarousel = createRevealObserver([carousel], { threshold: 0.1 });
  }

  /* --- Carousel interaction --- */
  const track = sectionEl.querySelector('.story-timeline__track');
  const prevBtn = sectionEl.querySelector('.story-timeline__nav-btn--prev');
  const nextBtn = sectionEl.querySelector('.story-timeline__nav-btn--next');
  const cards = track ? Array.from(track.children) : [];

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

  /** @param {MouseEvent} e */
  function onPrevClick(e) {
    goToIndex(currentIndex - 1);
  }

  /** @param {MouseEvent} e */
  function onNextClick(e) {
    goToIndex(currentIndex + 1);
  }

  if (prevBtn) prevBtn.addEventListener('click', onPrevClick);
  if (nextBtn) nextBtn.addEventListener('click', onNextClick);

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

  function onMouseLeave() {
    if (isDragging) onDragEnd();
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
    track.addEventListener('mouseleave', onMouseLeave);
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
    cleanupHeading();
    cleanupCarousel();
    if (animationId) cancelAnimationFrame(animationId);
    if (track) {
      track.removeEventListener('mousedown', onDragStart);
      track.removeEventListener('mousemove', onDragMove);
      track.removeEventListener('mouseup', onDragEnd);
      track.removeEventListener('mouseleave', onMouseLeave);
      track.removeEventListener('touchstart', onDragStart);
      track.removeEventListener('touchmove', onDragMove);
      track.removeEventListener('touchend', onDragEnd);
    }
    if (prevBtn) prevBtn.removeEventListener('click', onPrevClick);
    if (nextBtn) nextBtn.removeEventListener('click', onNextClick);
  };
}
