/**
 * Section-specific JS for the Advisory Board scroll-pinned chapter.
 * Drives: heading/decorative-line reveal, carousel entrance from
 * offscreen-left, and interactive drag/arrow/keyboard carousel.
 *
 * @module story-advisory-board
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
 * Clamps a number between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Initialises the Advisory Board section scroll animation and carousel.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-advisory-board__scroll-track');
  var headingArea = sectionEl.querySelector('.story-advisory-board__heading-area');
  var decorativeLine = sectionEl.querySelector('.story-advisory-board__decorative-line');
  var carousel = sectionEl.querySelector('.story-advisory-board__carousel');
  var carouselTrack = sectionEl.querySelector('.story-advisory-board__carousel-track');
  var prevBtn = sectionEl.querySelector('.story-advisory-board__arrow--prev');
  var nextBtn = sectionEl.querySelector('.story-advisory-board__arrow--next');

  if (!scrollTrack || !carouselTrack) return function cleanup() {};

  /* ---- State ---- */
  var isSettled = false;
  var entranceX = 0;
  var carouselOffset = 0;
  var isDragging = false;
  var dragStartX = 0;
  var dragStartOffset = 0;
  var dragIntentDecided = false;
  var dragIsHorizontal = false;
  var dragStartY = 0;
  var minOffset = 0;

  /** Recalculate the minimum carousel offset (most-negative = scrolled fully right). */
  function recalcMinOffset() {
    if (!carousel || !carouselTrack) return;
    var trackWidth = carouselTrack.scrollWidth;
    var containerWidth = carousel.clientWidth;
    minOffset = Math.min(0, -(trackWidth - containerWidth));
  }

  recalcMinOffset();

  /** Apply the current transform to the carousel track, combining entrance + drag offset. */
  function applyTrackTransform() {
    if (!carouselTrack) return;
    var x = entranceX + carouselOffset;
    carouselTrack.style.transform = 'translateX(' + x + 'px)';
  }

  /** Update arrow button disabled states. */
  function updateArrows() {
    if (prevBtn) {
      if (carouselOffset >= 0) {
        prevBtn.setAttribute('aria-disabled', 'true');
      } else {
        prevBtn.removeAttribute('aria-disabled');
      }
    }
    if (nextBtn) {
      recalcMinOffset();
      if (carouselOffset <= minOffset) {
        nextBtn.setAttribute('aria-disabled', 'true');
      } else {
        nextBtn.removeAttribute('aria-disabled');
      }
    }
  }

  /** Get the width of a single card step (card width + gap). */
  function getCardStep() {
    var firstCard = carouselTrack.querySelector('.story-advisory-board__card');
    if (!firstCard) return 330;
    var style = window.getComputedStyle(carouselTrack);
    var gap = parseFloat(style.gap) || 24;
    return firstCard.offsetWidth + gap;
  }

  /** Navigate the carousel by a given number of steps (negative = prev, positive = next). */
  function navigateCarousel(steps) {
    if (!isSettled) return;
    recalcMinOffset();
    var step = getCardStep();
    /* Remove transition class first, then add for smooth animation */
    carouselTrack.style.transition = 'transform 0.3s ease';
    carouselOffset = clamp(carouselOffset - (steps * step), minOffset, 0);
    applyTrackTransform();
    updateArrows();
    /* Remove transition after it completes to avoid laggy drag */
    setTimeout(function () {
      if (carouselTrack) carouselTrack.style.transition = '';
    }, 320);
  }

  /* ---- Reduced motion: skip scroll, enable carousel immediately ---- */
  if (utils.prefersReducedMotion()) {
    if (headingArea) {
      headingArea.style.opacity = '1';
      headingArea.style.transform = 'translateX(-50%)';
    }
    if (decorativeLine) {
      decorativeLine.style.opacity = '1';
      decorativeLine.style.transform = 'rotate(3deg)';
    }
    entranceX = 0;
    isSettled = true;
    applyTrackTransform();
    updateArrows();

    /* Wire up interactivity and return cleanup */
    setupInteractivity();
    return function cleanup() {
      teardownInteractivity();
    };
  }

  /* ---- Scroll entrance ---- */
  var viewportWidth = window.innerWidth;

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {
        /* Phase A (0.0-0.4): heading-area opacity 0->1, translateY 30->0 */
        if (headingArea) {
          var headingT = phaseProgress(p, 0.0, 0.4);
          var headingOpacity = lerp(0, 1, headingT);
          var headingY = lerp(30, 0, headingT);
          headingArea.style.opacity = headingOpacity;
          headingArea.style.transform = 'translateX(-50%) translateY(' + headingY + 'px)';
        }

        /* Phase B (0.05-0.25): decorative-line opacity 0->1, rotation -2->3deg */
        if (decorativeLine) {
          var lineT = phaseProgress(p, 0.05, 0.25);
          var lineOpacity = lerp(0, 1, lineT);
          var lineRotation = lerp(-2, 3, lineT);
          decorativeLine.style.opacity = lineOpacity;
          decorativeLine.style.transform = 'rotate(' + lineRotation + 'deg)';
        }

        /* Phase C (0.15-0.65): carousel-track entrance from offscreen-left */
        var carouselT = phaseProgress(p, 0.15, 0.65);
        entranceX = lerp(-viewportWidth, 0, carouselT);

        applyTrackTransform();

        /* Phase D (0.65-1.0): hold settled state */
        var wasSettled = isSettled;
        isSettled = p >= 0.65;

        if (isSettled && !wasSettled) {
          entranceX = 0;
          applyTrackTransform();
          updateArrows();
        }

        if (!isSettled && wasSettled) {
          /* Scrolling back up — reset carousel offset */
          carouselOffset = 0;
          updateArrows();
        }
      });
    }
  });

  /* ---- Carousel interactivity ---- */
  function onPointerDown(e) {
    if (!isSettled) return;
    /* Only respond to primary button (mouse) or touch */
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isDragging = true;
    dragIntentDecided = false;
    dragIsHorizontal = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffset = carouselOffset;
    carouselTrack.style.transition = '';
    carouselTrack.classList.add('is-dragging');
    carouselTrack.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;

    /* Decide drag intent direction on first significant move */
    if (!dragIntentDecided) {
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);
      if (absDx < 5 && absDy < 5) return; /* Too small to decide */
      dragIntentDecided = true;
      dragIsHorizontal = absDx > absDy;
      if (!dragIsHorizontal) {
        /* User intends vertical scroll — cancel drag */
        isDragging = false;
        carouselTrack.classList.remove('is-dragging');
        try { carouselTrack.releasePointerCapture(e.pointerId); } catch (_) {}
        return;
      }
    }

    if (!dragIsHorizontal) return;

    e.preventDefault();
    recalcMinOffset();
    carouselOffset = clamp(dragStartOffset + dx, minOffset, 0);
    applyTrackTransform();
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    carouselTrack.classList.remove('is-dragging');
    try { carouselTrack.releasePointerCapture(e.pointerId); } catch (_) {}

    /* Snap to nearest card edge */
    if (dragIsHorizontal) {
      var step = getCardStep();
      if (step > 0) {
        recalcMinOffset();
        var snapped = Math.round(carouselOffset / step) * step;
        carouselOffset = clamp(snapped, minOffset, 0);
        carouselTrack.style.transition = 'transform 0.3s ease';
        applyTrackTransform();
        updateArrows();
        setTimeout(function () {
          if (carouselTrack) carouselTrack.style.transition = '';
        }, 320);
      }
    }
  }

  function onPrevClick() {
    navigateCarousel(-1);
  }

  function onNextClick() {
    navigateCarousel(1);
  }

  function onKeydown(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateCarousel(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateCarousel(1);
    }
  }

  function onResize() {
    viewportWidth = window.innerWidth;
    recalcMinOffset();
    /* Clamp current offset in case container got wider */
    carouselOffset = clamp(carouselOffset, minOffset, 0);
    if (isSettled) {
      entranceX = 0;
      applyTrackTransform();
      updateArrows();
    }
  }

  function setupInteractivity() {
    if (carouselTrack) {
      carouselTrack.addEventListener('pointerdown', onPointerDown);
      carouselTrack.addEventListener('pointermove', onPointerMove);
      carouselTrack.addEventListener('pointerup', onPointerUp);
      carouselTrack.addEventListener('pointercancel', onPointerUp);
    }
    if (prevBtn) prevBtn.addEventListener('click', onPrevClick);
    if (nextBtn) nextBtn.addEventListener('click', onNextClick);
    if (carousel) carousel.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize, { passive: true });
  }

  function teardownInteractivity() {
    if (carouselTrack) {
      carouselTrack.removeEventListener('pointerdown', onPointerDown);
      carouselTrack.removeEventListener('pointermove', onPointerMove);
      carouselTrack.removeEventListener('pointerup', onPointerUp);
      carouselTrack.removeEventListener('pointercancel', onPointerUp);
    }
    if (prevBtn) prevBtn.removeEventListener('click', onPrevClick);
    if (nextBtn) nextBtn.removeEventListener('click', onNextClick);
    if (carousel) carousel.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
  }

  setupInteractivity();

  return function cleanup() {
    cleanupScroll();
    teardownInteractivity();
  };
}
