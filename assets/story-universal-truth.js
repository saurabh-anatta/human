/**
 * Section-specific JS for the universal-truth scroll-pinned chapter.
 * Drives SVG vessel stroke animation and text zoom/fade effects via scroll progress.
 *
 * @module story-universal-truth
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
 * Initialises the universal-truth section.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  const scrollTrack = sectionEl.querySelector('.story-universal-truth__scroll-track');
  const eyebrowEl = sectionEl.querySelector('.story-universal-truth__eyebrow');
  const textBlock1 = sectionEl.querySelector('.story-universal-truth__text-block-1');
  const headingEl = sectionEl.querySelector('.story-universal-truth__heading');
  const supportingEl = sectionEl.querySelector('.story-universal-truth__supporting');
  const textBlock2 = sectionEl.querySelector('.story-universal-truth__text-block-2');
  const arrowEls = sectionEl.querySelectorAll('.story-universal-truth__arrow');

  /* Cache all vessel paths and compute their total lengths */
  const vesselPaths = sectionEl.querySelectorAll('.story-universal-truth__vessel-path');
  const pathData = [];

  for (const path of vesselPaths) {
    const totalLength = path.getTotalLength();
    path.style.strokeDasharray = totalLength;
    path.style.strokeDashoffset = totalLength;
    pathData.push({
      el: path,
      totalLength: totalLength,
      phase: path.dataset.phase
    });
  }

  /* Reduced motion: show everything immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    for (const pd of pathData) {
      pd.el.style.strokeDashoffset = '0';
    }
    if (eyebrowEl) eyebrowEl.style.opacity = '1';
    if (headingEl) {
      headingEl.style.opacity = '1';
      headingEl.style.transform = 'none';
    }
    if (supportingEl) {
      supportingEl.style.opacity = '1';
      supportingEl.style.transform = 'none';
    }
    if (textBlock2) {
      textBlock2.style.opacity = '1';
      textBlock2.style.transform = 'none';
    }
    for (const arrow of arrowEls) {
      arrow.style.opacity = '0.6';
    }
    return function cleanup() {};
  }

  /* Group paths by phase for targeted animation */
  const stemTopPaths = pathData.filter(function (d) { return d.phase === 'stem-top'; });
  const branchPaths = pathData.filter(function (d) { return d.phase && d.phase.indexOf('branch-') === 0; });
  const convergePaths = pathData.filter(function (d) { return d.phase && d.phase.indexOf('converge-') === 0; });
  const stemBottomPaths = pathData.filter(function (d) { return d.phase === 'stem-bottom'; });

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {
        /* Phase A (0.00 → 0.15): eyebrow fades in */
        if (eyebrowEl) {
          var a = phaseProgress(p, 0.00, 0.15);
          eyebrowEl.style.opacity = lerp(0, 1, a);
        }

        /* Phase B (0.00 → 0.25): stem-top path draws downward */
        for (var bi = 0; bi < stemTopPaths.length; bi++) {
          var bPd = stemTopPaths[bi];
          var b = phaseProgress(p, 0.00, 0.25);
          bPd.el.style.strokeDashoffset = lerp(bPd.totalLength, 0, b);
        }

        /* Phase C (0.08 → 0.30): text block 1 heading zooms in */
        if (headingEl) {
          var c = phaseProgress(p, 0.08, 0.30);
          var cScale = lerp(3.5, 1, c);
          var cOpacity = lerp(0, 1, c);
          headingEl.style.transform = 'scale(' + cScale + ')';
          headingEl.style.opacity = cOpacity;
        }

        /* Phase D (0.25 → 0.40): supporting line fades in + slides up */
        if (supportingEl) {
          var d = phaseProgress(p, 0.25, 0.40);
          var dOpacity = lerp(0, 1, d);
          var dTranslateY = lerp(20, 0, d);
          supportingEl.style.opacity = dOpacity;
          supportingEl.style.transform = 'translateY(' + dTranslateY + 'px)';
        }

        /* Phase E (0.30 → 0.55): branch paths draw outward (staggered) */
        for (var ei = 0; ei < branchPaths.length; ei++) {
          var ePd = branchPaths[ei];
          var eStagger = ei * 0.03;
          var e = phaseProgress(p, 0.30 + eStagger, 0.55 + eStagger);
          ePd.el.style.strokeDashoffset = lerp(ePd.totalLength, 0, e);
        }

        /* Phase F (0.35 → 0.50): text block 1 fades out + slides up */
        if (textBlock1) {
          var f = phaseProgress(p, 0.35, 0.50);
          var fOpacity = lerp(1, 0, f);
          var fTranslateY = lerp(0, -20, f);
          textBlock1.style.opacity = fOpacity;
          textBlock1.style.transform = 'translateY(' + fTranslateY + 'px)';
        }

        /* Phase G (0.45 → 0.65): text block 2 fades + zooms in */
        if (textBlock2) {
          var g = phaseProgress(p, 0.45, 0.65);
          var gScale = lerp(1.3, 1, g);
          var gOpacity = lerp(0, 1, g);
          textBlock2.style.transform = 'scale(' + gScale + ')';
          textBlock2.style.opacity = gOpacity;
        }

        /* Phase H (0.55 → 0.80): converge paths draw inward (staggered) */
        for (var hi = 0; hi < convergePaths.length; hi++) {
          var hPd = convergePaths[hi];
          var hStagger = hi * 0.03;
          var h = phaseProgress(p, 0.55 + hStagger, 0.80 + hStagger);
          hPd.el.style.strokeDashoffset = lerp(hPd.totalLength, 0, h);
        }

        /* Phase I (0.75 → 0.95): stem-bottom draws downward */
        for (var ii = 0; ii < stemBottomPaths.length; ii++) {
          var iPd = stemBottomPaths[ii];
          var iProg = phaseProgress(p, 0.75, 0.95);
          iPd.el.style.strokeDashoffset = lerp(iPd.totalLength, 0, iProg);
        }

        /* Phase J (0.60 → 0.80): decorative arrows fade in (staggered) */
        for (var ji = 0; ji < arrowEls.length; ji++) {
          var jStagger = ji * 0.04;
          var j = phaseProgress(p, 0.60 + jStagger, 0.80 + jStagger);
          arrowEls[ji].style.opacity = lerp(0, 0.6, j);
        }
      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
