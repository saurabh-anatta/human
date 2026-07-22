/**
 * Section-specific JS for the product reveal scroll-pinned chapter.
 * Drives: canvas frame-sequence scrubbing, heading entrance,
 * supporting copy fade, and retailer logo row reveal.
 *
 * @module story-product-reveal
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
 * Pads a number to a given width with leading zeros.
 * @param {number} num - The number to pad.
 * @param {number} width - Target width.
 * @returns {string}
 */
function padNumber(num, width) {
  var str = String(num);
  while (str.length < width) {
    str = '0' + str;
  }
  return str;
}

/**
 * Sets all animated elements to their final visible state.
 * @param {HTMLElement} headingEl
 * @param {HTMLElement} supportingEl
 * @param {HTMLElement} retailerRow
 */
function showSettledState(headingEl, supportingEl, retailerRow) {
  if (headingEl) {
    headingEl.style.opacity = '1';
    headingEl.style.transform = 'none';
  }
  if (supportingEl) {
    supportingEl.style.opacity = '1';
  }
  if (retailerRow) {
    retailerRow.style.opacity = '1';
    retailerRow.style.transform = 'none';
  }
}

/**
 * Initialises the product reveal section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-product-reveal__scroll-track');
  var canvas = sectionEl.querySelector('.story-product-reveal__canvas');
  var headingEl = sectionEl.querySelector('.story-product-reveal__heading');
  var supportingEl = sectionEl.querySelector('.story-product-reveal__supporting-copy');
  var retailerRow = sectionEl.querySelector('.story-product-reveal__retailer-row');

  var frameBaseUrl = sectionEl.dataset.frameBaseUrl || '';
  var frameCount = parseInt(sectionEl.dataset.frameCount, 10) || 0;
  var isStatic = frameCount <= 0 || frameBaseUrl === '';

  /* Reduced motion: show settled state immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    sectionEl.classList.add('story-product-reveal--static');
    showSettledState(headingEl, supportingEl, retailerRow);
    return function cleanup() {};
  }

  /* Slow-connection guard */
  var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn && (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g')) {
    isStatic = true;
  }

  /* Static fallback mode: show settled composition without scroll animation */
  if (isStatic) {
    sectionEl.classList.add('story-product-reveal--static');
    showSettledState(headingEl, supportingEl, retailerRow);
    return function cleanup() {};
  }

  /* --- Frame preloading --- */
  var frames = new Array(frameCount);
  var loaded = new Array(frameCount);
  for (var i = 0; i < frameCount; i++) {
    loaded[i] = false;
  }

  var ctx = canvas.getContext('2d');
  var canvasSized = false;
  var lastDrawnIndex = -1;

  /**
   * Callback when a frame image finishes loading.
   * @param {number} index - The frame index that loaded.
   */
  function onFrameLoad(index) {
    loaded[index] = true;

    /* Size canvas to first loaded frame's natural dimensions */
    if (!canvasSized) {
      canvas.width = frames[index].naturalWidth;
      canvas.height = frames[index].naturalHeight;
      canvasSized = true;

      /* Draw the first frame as poster */
      ctx.drawImage(frames[index], 0, 0);
      lastDrawnIndex = index;
    }
  }

  /* Load frame 0 eagerly as the poster */
  frames[0] = new Image();
  frames[0].onload = function () { onFrameLoad(0); };
  frames[0].onerror = function () {
    /* If frame 0 fails to load, fall back to static mode */
    sectionEl.classList.add('story-product-reveal--static');
    showSettledState(headingEl, supportingEl, retailerRow);
  };
  frames[0].src = frameBaseUrl + padNumber(1, 4) + '.jpg';

  /* Stagger remaining frames via setTimeout to avoid blocking */
  for (var f = 1; f < frameCount; f++) {
    (function (idx) {
      setTimeout(function () {
        frames[idx] = new Image();
        frames[idx].onload = function () { onFrameLoad(idx); };
        frames[idx].onerror = function () { /* silently skip missing frames */ };
        frames[idx].src = frameBaseUrl + padNumber(idx + 1, 4) + '.jpg';
      }, idx * 16);
    })(f);
  }

  /**
   * Finds the nearest loaded frame to the target index.
   * @param {number} targetIndex - The desired frame index.
   * @returns {number} The index of the nearest loaded frame, or -1 if none loaded.
   */
  function findNearestLoaded(targetIndex) {
    if (loaded[targetIndex]) return targetIndex;

    /* Search outward from target */
    for (var offset = 1; offset < frameCount; offset++) {
      var lower = targetIndex - offset;
      var upper = targetIndex + offset;
      if (lower >= 0 && loaded[lower]) return lower;
      if (upper < frameCount && loaded[upper]) return upper;
    }
    return -1;
  }

  /**
   * Draws the specified frame (or nearest loaded) to the canvas.
   * @param {number} index - Target frame index.
   */
  function drawFrame(index) {
    var drawIndex = findNearestLoaded(index);
    if (drawIndex < 0 || drawIndex === lastDrawnIndex) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frames[drawIndex], 0, 0);
    lastDrawnIndex = drawIndex;
  }

  /* --- Scroll progress handler --- */
  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* Phase: Heading entrance (0 - 0.15) — opacity 0→1, translateY 40→0 */
        if (headingEl) {
          var hp = phaseProgress(p, 0, 0.15);
          headingEl.style.opacity = lerp(0, 1, hp);
          headingEl.style.transform = 'translateY(' + lerp(40, 0, hp) + 'px)';
        }

        /* Phase: Supporting copy (0.10 - 0.20) — opacity 0→1 */
        if (supportingEl) {
          var sp = phaseProgress(p, 0.10, 0.20);
          supportingEl.style.opacity = lerp(0, 1, sp);
        }

        /* Phase: Frame scrubbing (0 - 0.9) */
        if (canvasSized && frameCount > 0) {
          var fp = phaseProgress(p, 0, 0.9);
          var frameIndex = Math.min(Math.floor(fp * frameCount), frameCount - 1);
          drawFrame(frameIndex);
        }

        /* Phase: Retailer row reveal (0.85 - 1.0) — opacity 0→1, translateY 20→0 */
        if (retailerRow) {
          var rp = phaseProgress(p, 0.85, 1.0);
          retailerRow.style.opacity = lerp(0, 1, rp);
          retailerRow.style.transform = 'translateY(' + lerp(20, 0, rp) + 'px)';
        }

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
