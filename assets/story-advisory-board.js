/* ==========================================================================
   Our Story — Advisory Board Section JS
   Auto-rotating infinite carousel with drag/swipe and on-demand video playback.
   ========================================================================== */

/**
 * Initialise the advisory board section.
 * @param {HTMLElement} sectionEl - The sticky child (.story-advisory-board)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  /* --- Reveal animations on header text --- */
  var revealEls = sectionEl.querySelectorAll('.story-reveal');
  if (revealEls.length > 0) {
    utils.createRevealObserver(revealEls, { threshold: 0.15, staggerDelay: 150 });
  }

  var carousel = sectionEl.querySelector('.story-advisory-board__carousel');
  var track = sectionEl.querySelector('.story-advisory-board__track');
  if (!carousel || !track) return;

  /* --- Reduced-motion: static scrollable row, no auto-rotate --- */
  if (utils.prefersReducedMotion()) {
    carousel.classList.add('story-advisory-board__carousel--static');
    setupVideoButtons(carousel);
    return;
  }

  /* --- Clone cards for seamless infinite loop --- */
  var originalCards = track.querySelectorAll('.story-advisory-board__card');
  var cardCount = originalCards.length;
  if (cardCount === 0) return;

  for (var i = 0; i < cardCount; i++) {
    var clone = originalCards[i].cloneNode(true);
    clone.removeAttribute('data-shopify-editor-block');
    track.appendChild(clone);
  }

  /* --- Compute total width of original card set --- */
  function computeSetWidth() {
    var gap = 24;
    return cardCount * 280 + (cardCount - 1) * gap;
  }

  var setWidth = computeSetWidth();
  var autoSpeed = parseFloat(carousel.dataset.autoSpeed) || 40;
  var pxPerSecond = setWidth / autoSpeed;

  /* --- Auto-rotate state --- */
  var offset = 0;
  var paused = false;
  var lastTime = null;
  var idleTimer = null;
  var IDLE_RESUME_MS = 3000;

  function tick() {
    if (paused) {
      lastTime = null;
      return;
    }

    var now = performance.now();
    if (lastTime === null) {
      lastTime = now;
      return;
    }

    var dt = (now - lastTime) / 1000;
    lastTime = now;

    offset += pxPerSecond * dt;

    if (offset >= setWidth) {
      offset -= setWidth;
    }

    track.style.transform = 'translateX(' + (-offset) + 'px)';
  }

  utils.registerRafCallback(tick);

  /* --- Pause / resume helpers --- */
  function pauseCarousel() {
    paused = true;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function scheduleResume() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      paused = false;
      lastTime = null;
      idleTimer = null;
    }, IDLE_RESUME_MS);
  }

  /* --- Mouse hover pause --- */
  carousel.addEventListener('mouseenter', function () {
    pauseCarousel();
  });

  carousel.addEventListener('mouseleave', function () {
    if (!isDragging) {
      scheduleResume();
    }
  });

  /* --- Drag / swipe via pointer events --- */
  var isDragging = false;
  var dragStartX = 0;
  var dragStartY = 0;
  var dragOffsetAtStart = 0;
  var horizontalLock = null;

  carousel.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    isDragging = true;
    horizontalLock = null;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOffsetAtStart = offset;
    pauseCarousel();
    carousel.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  carousel.addEventListener('pointermove', function (e) {
    if (!isDragging) return;

    var dx = e.clientX - dragStartX;
    var dy = e.clientY - dragStartY;

    /* Determine dominant axis on first significant move */
    if (horizontalLock === null) {
      var absDx = Math.abs(dx);
      var absDy = Math.abs(dy);
      if (absDx > 5 || absDy > 5) {
        horizontalLock = absDx > absDy;
      }
    }

    if (horizontalLock === false) return;

    e.preventDefault();

    var newOffset = dragOffsetAtStart - dx;

    /* Wrap within bounds */
    while (newOffset < 0) newOffset += setWidth;
    while (newOffset >= setWidth) newOffset -= setWidth;

    offset = newOffset;
    track.style.transform = 'translateX(' + (-offset) + 'px)';
  });

  carousel.addEventListener('pointerup', function () {
    if (!isDragging) return;
    isDragging = false;
    horizontalLock = null;
    scheduleResume();
  });

  carousel.addEventListener('pointercancel', function () {
    if (!isDragging) return;
    isDragging = false;
    horizontalLock = null;
    scheduleResume();
  });

  /* Prevent native drag on images */
  track.addEventListener('dragstart', function (e) {
    e.preventDefault();
  });

  /* --- Video play button delegation --- */
  setupVideoButtons(carousel);
}

/**
 * Delegate click on play buttons to create <video> elements on demand.
 * @param {HTMLElement} container
 */
function setupVideoButtons(container) {
  container.addEventListener('click', function (e) {
    var btn = e.target.closest('.story-advisory-board__card-play');
    if (!btn) return;

    var videoUrl = btn.dataset.videoUrl;
    if (!videoUrl) return;

    var imgContainer = btn.closest('.story-advisory-board__card-img');
    if (!imgContainer) return;

    e.preventDefault();

    /* Create video element */
    var video = document.createElement('video');
    video.className = 'story-advisory-board__card-video';
    video.src = videoUrl;
    video.autoplay = true;
    video.controls = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');

    imgContainer.appendChild(video);
    btn.hidden = true;

    /* Restore poster on video end */
    video.addEventListener('ended', function () {
      video.remove();
      btn.hidden = false;
    });
  });
}
