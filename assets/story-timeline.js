/**
 * Section-specific JS for the Timeline scroll-pinned chapter.
 * Drives: title entrance, athletes/everyone-else beat reveals,
 * vessel stroke-draw, carousel entrance from offscreen-left,
 * and interactive drag/arrow/keyboard carousel.
 *
 * @module story-timeline
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
 * Initialises the Timeline section scroll animation and carousel.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-timeline__scroll-track');
  var sectionTitle = sectionEl.querySelector('.story-timeline__section-title');
  var decorativeLine = sectionEl.querySelector('.story-timeline__decorative-line');
  var athletesMedia = sectionEl.querySelector('.story-timeline__athletes-media');
  var desatOverlay = sectionEl.querySelector('.story-timeline__desat-overlay');
  var athletesCopy = sectionEl.querySelector('.story-timeline__athletes-copy');
  var everyoneCopy = sectionEl.querySelector('.story-timeline__everyone-copy');
  var vesselSvg = sectionEl.querySelector('.story-timeline__vessel-svg');
  var carousel = sectionEl.querySelector('.story-timeline__carousel');
  var carouselTrack = sectionEl.querySelector('.story-timeline__carousel-track');
  var prevBtn = sectionEl.querySelector('.story-timeline__arrow--prev');
  var nextBtn = sectionEl.querySelector('.story-timeline__arrow--next');

  if (!scrollTrack || !carouselTrack) return function cleanup() {};

  /* ---- Vessel stroke-draw controllers ---- */
  var vesselPaths = sectionEl.querySelectorAll('.story-timeline__vessel-path');
  var strokeControllers = [];
  for (var i = 0; i < vesselPaths.length; i++) {
    strokeControllers.push(utils.initStrokeDraw(vesselPaths[i]));
  }

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
    var firstCard = carouselTrack.querySelector('.story-timeline__milestone');
    if (!firstCard) return 324;
    var style = window.getComputedStyle(carouselTrack);
    var gap = parseFloat(style.gap) || 24;
    return firstCard.offsetWidth + gap;
  }

  /** Navigate the carousel by a given number of steps (negative = prev, positive = next). */
  function navigateCarousel(steps) {
    if (!isSettled) return;
    recalcMinOffset();
    var step = getCardStep();
    carouselTrack.style.transition = 'transform 0.3s ease';
    carouselOffset = clamp(carouselOffset - (steps * step), minOffset, 0);
    applyTrackTransform();
    updateArrows();
    setTimeout(function () {
      if (carouselTrack) carouselTrack.style.transition = '';
    }, 320);
  }

  /* ---- Reduced motion: skip scroll, enable carousel immediately ---- */
  if (utils.prefersReducedMotion()) {
    if (sectionTitle) {
      sectionTitle.style.opacity = '1';
      sectionTitle.style.transform = '';
    }
    if (decorativeLine) {
      decorativeLine.style.opacity = '0';
    }
    if (athletesMedia) {
      athletesMedia.style.opacity = '0';
    }
    if (desatOverlay) {
      desatOverlay.style.opacity = '0';
    }
    if (athletesCopy) {
      athletesCopy.style.opacity = '0';
    }
    if (everyoneCopy) {
      everyoneCopy.style.opacity = '1';
      everyoneCopy.style.transform = '';
    }
    entranceX = 0;
    isSettled = true;
    applyTrackTransform();
    updateArrows();

    setupInteractivity();
    return function cleanup() {
      teardownInteractivity();
    };
  }

  /* ---- Scroll entrance ---- */
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {
        /* Phase A (0.00–0.20): title opacity 0→1 + translateY from ~55vh → 0 */
        if (sectionTitle) {
          var titleT = phaseProgress(p, 0.00, 0.20);
          var titleOpacity = lerp(0, 1, titleT);
          var titleYStart = Math.min(viewportHeight * 0.55, 550);
          var titleY = lerp(titleYStart, 0, titleT);
          sectionTitle.style.opacity = titleOpacity;
          sectionTitle.style.transform = 'translate(-50%, -50%) translateY(' + titleY + 'px)';
        }

        /* Phase B (0.10–0.30): athletes beat — image layer + desat overlay + copy fade in */
        if (athletesMedia) {
          var athletesMediaT = phaseProgress(p, 0.10, 0.25);
          athletesMedia.style.opacity = lerp(0, 1, athletesMediaT);
        }
        if (desatOverlay) {
          var desatT = phaseProgress(p, 0.15, 0.30);
          desatOverlay.style.opacity = lerp(0, 1, desatT);
        }
        if (athletesCopy) {
          var athletesCopyInT = phaseProgress(p, 0.18, 0.30);
          var athletesCopyOutT = phaseProgress(p, 0.35, 0.45);
          var athletesCopyOpacity = athletesCopyOutT > 0 ? lerp(1, 0, athletesCopyOutT) : lerp(0, 1, athletesCopyInT);
          athletesCopy.style.opacity = athletesCopyOpacity;
        }

        /* Phase C (0.35–0.50): athletes fades, everyone-else copy fades in; athletes media fades */
        if (athletesMedia) {
          var athletesFadeT = phaseProgress(p, 0.40, 0.55);
          if (athletesFadeT > 0) {
            athletesMedia.style.opacity = lerp(1, 0, athletesFadeT);
          }
        }
        if (desatOverlay) {
          var desatFadeT = phaseProgress(p, 0.40, 0.55);
          if (desatFadeT > 0) {
            desatOverlay.style.opacity = lerp(1, 0, desatFadeT);
          }
        }
        if (everyoneCopy) {
          var everyoneInT = phaseProgress(p, 0.38, 0.50);
          var everyoneOutT = phaseProgress(p, 0.55, 0.65);
          var everyoneOpacity = everyoneOutT > 0 ? lerp(1, 0, everyoneOutT) : lerp(0, 1, everyoneInT);
          everyoneCopy.style.opacity = everyoneOpacity;
        }

        /* Decorative line — rotate + fade, matching advisory board pattern */
        if (decorativeLine) {
          var lineInT = phaseProgress(p, 0.05, 0.35);
          var lineRotation = lerp(-90, 0, lineInT);
          var lineOpacity;
          if (p < 0.35) {
            lineOpacity = lerp(0, 1, lineInT);
          } else {
            var lineFadeT = phaseProgress(p, 0.35, 0.50);
            lineOpacity = lerp(1, 0, lineFadeT);
          }
          decorativeLine.style.opacity = lineOpacity;
          decorativeLine.style.transform = 'translate(-50%, -50%) rotate(' + lineRotation + 'deg)';
        }

        /* Phase D (0.30–0.55): vessel SVG stroke draw */
        var vesselT = phaseProgress(p, 0.30, 0.55);
        for (var i = 0; i < strokeControllers.length; i++) {
          strokeControllers[i].update(vesselT);
        }

        /* Phase E (0.45–0.72): carousel-track entrance from offscreen-left */
        var carouselT = phaseProgress(p, 0.45, 0.72);
        entranceX = lerp(-viewportWidth, 0, carouselT);

        /* Also fade title out as carousel enters */
        if (sectionTitle && p > 0.50) {
          var titleFadeT = phaseProgress(p, 0.50, 0.62);
          sectionTitle.style.opacity = lerp(1, 0, titleFadeT);
        }

        applyTrackTransform();

        /* Phase F (0.72–1.0): hold settled state */
        var wasSettled = isSettled;
        isSettled = p >= 0.72;

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

    if (!dragIntentDecided) {
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);
      if (absDx < 5 && absDy < 5) return;
      dragIntentDecided = true;
      dragIsHorizontal = absDx > absDy;
      if (!dragIsHorizontal) {
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
    viewportHeight = window.innerHeight;
    recalcMinOffset();
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
