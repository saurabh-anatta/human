/**
 * Section-specific JS for the universal-truth scroll-pinned chapter.
 * Drives SVG vessel stroke animation, word-by-word text reveal,
 * dual cage vessel effects, and heartbeat squiggle via scroll progress.
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
  const bgVesselContainer = sectionEl.querySelector('.story-universal-truth__bg-vessels');
  const bgVesselPathEls = sectionEl.querySelectorAll('.story-universal-truth__bg-vessels path');

  /* Split supporting text into individual word spans for staggered reveal */
  var wordSpans = [];
  if (supportingEl) {
    var rawText = supportingEl.textContent.trim();
    supportingEl.textContent = '';
    var words = rawText.split(/\s+/);
    for (var wi = 0; wi < words.length; wi++) {
      var wordSpan = document.createElement('span');
      wordSpan.className = 'story-universal-truth__word';
      wordSpan.textContent = words[wi];
      supportingEl.appendChild(wordSpan);
      wordSpans.push(wordSpan);
      if (wi < words.length - 1) {
        supportingEl.appendChild(document.createTextNode(' '));
      }
    }
  }

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

  /* Cache bg vessel path lengths */
  const bgPathData = [];
  for (const bgPath of bgVesselPathEls) {
    const totalLength = bgPath.getTotalLength();
    bgPath.style.strokeDasharray = totalLength;
    bgPath.style.strokeDashoffset = totalLength;
    bgPathData.push({
      el: bgPath,
      totalLength: totalLength
    });
  }

  /* Reduced motion: show everything immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    for (const pd of pathData) {
      pd.el.style.strokeDashoffset = '0';
    }
    for (const bd of bgPathData) {
      bd.el.style.strokeDashoffset = '0';
    }
    if (bgVesselContainer) {
      bgVesselContainer.style.opacity = '0.4';
    }
    if (eyebrowEl) eyebrowEl.style.opacity = '1';
    if (headingEl) {
      headingEl.style.opacity = '1';
      headingEl.style.transform = 'none';
    }
    for (var si = 0; si < wordSpans.length; si++) {
      wordSpans[si].style.opacity = '1';
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
  const stemEnterPaths = pathData.filter(function (d) { return d.phase === 'stem-enter'; });
  const heartbeatPaths = pathData.filter(function (d) { return d.phase === 'heartbeat'; });
  const stemMidPaths = pathData.filter(function (d) { return d.phase === 'stem-mid'; });
  const cage1Paths = pathData.filter(function (d) { return d.phase === 'cage-1'; });
  const cage2Paths = pathData.filter(function (d) { return d.phase === 'cage-2'; });
  const stemExitPaths = pathData.filter(function (d) { return d.phase === 'stem-exit'; });

  var totalWords = wordSpans.length;

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* ---- Phase 1 (0.00 → 0.06): Stem enter draws downward ---- */
        for (var ai = 0; ai < stemEnterPaths.length; ai++) {
          var a1 = phaseProgress(p, 0.00, 0.06);
          stemEnterPaths[ai].el.style.strokeDashoffset = lerp(stemEnterPaths[ai].totalLength, 0, a1);
        }

        /* ---- Phase 2 (0.04 → 0.14): Heartbeats draw sequentially —
           small pulse, then big pulse, then the tail into the text ---- */
        for (var bi = 0; bi < heartbeatPaths.length; bi++) {
          var hbStart = 0.04 + bi * 0.03;
          var b1 = phaseProgress(p, hbStart, hbStart + 0.04);
          heartbeatPaths[bi].el.style.strokeDashoffset = lerp(heartbeatPaths[bi].totalLength, 0, b1);
        }

        /* ---- Phase 3 (0.08 → 0.20): Heading zoom in (Bose-style scale 3.5→1) ---- */
        if (headingEl) {
          var c1 = phaseProgress(p, 0.08, 0.20);
          headingEl.style.transform = 'scale(' + lerp(3.5, 1, c1) + ')';
          headingEl.style.opacity = lerp(0, 1, c1);
        }

        /* Eyebrow: fade in during phase 3, fade out during phase 6 */
        if (eyebrowEl) {
          var eyeIn = phaseProgress(p, 0.08, 0.20);
          var eyeOut = phaseProgress(p, 0.33, 0.42);
          eyebrowEl.style.opacity = lerp(0, 1, eyeIn) * (1 - eyeOut);
        }

        /* ---- Phase 4 (0.18 → 0.32): Word-by-word supporting text reveal ---- */
        for (var di = 0; di < totalWords; di++) {
          var wordStart = lerp(0.18, 0.30, di / totalWords);
          var wordEnd = wordStart + 0.02;
          var dProg = phaseProgress(p, wordStart, wordEnd);
          wordSpans[di].style.opacity = dProg;
        }

        /* ---- Phase 5 (0.15 → 0.35): Background vessels draw ---- */
        var bgDrawProg = phaseProgress(p, 0.15, 0.35);
        for (var ei = 0; ei < bgPathData.length; ei++) {
          bgPathData[ei].el.style.strokeDashoffset = lerp(bgPathData[ei].totalLength, 0, bgDrawProg);
        }

        /* Background vessels opacity: smooth fade in then fade out */
        if (bgVesselContainer) {
          var bgIn = phaseProgress(p, 0.15, 0.30);
          var bgOut = phaseProgress(p, 0.33, 0.42);
          bgVesselContainer.style.opacity = lerp(0, 0.4, bgIn) * (1 - bgOut);
        }

        /* ---- Phase 6 (0.33 → 0.42): Text block 1 fades out + slides up ---- */
        if (textBlock1) {
          var f1 = phaseProgress(p, 0.33, 0.42);
          textBlock1.style.opacity = lerp(1, 0, f1);
          textBlock1.style.transform = 'translateY(' + lerp(0, -20, f1) + 'px)';
        }

        /* ---- Phase 7 (0.38 → 0.50): Stem mid long draw ---- */
        for (var gi = 0; gi < stemMidPaths.length; gi++) {
          var g1 = phaseProgress(p, 0.38, 0.50);
          stemMidPaths[gi].el.style.strokeDashoffset = lerp(stemMidPaths[gi].totalLength, 0, g1);
        }

        /* ---- Phase 8+9 (0.47 → 0.68 staggered): Cage 1 draws (fan → converge) ---- */
        for (var hi = 0; hi < cage1Paths.length; hi++) {
          var hStagger = hi * 0.008;
          var h1 = phaseProgress(p, 0.47 + hStagger, 0.68 + hStagger);
          cage1Paths[hi].el.style.strokeDashoffset = lerp(cage1Paths[hi].totalLength, 0, h1);
        }

        /* ---- Phase 9 (0.60 → 0.72): Text block 2 appears ---- */
        if (textBlock2) {
          var i1 = phaseProgress(p, 0.60, 0.72);
          textBlock2.style.transform = 'scale(' + lerp(1.3, 1, i1) + ')';
          textBlock2.style.opacity = lerp(0, 1, i1);
        }

        /* ---- Phase 10+11 (0.70 → 0.90 staggered): Cage 2 draws (fan → converge) ---- */
        for (var ji = 0; ji < cage2Paths.length; ji++) {
          var jStagger = ji * 0.008;
          var j1 = phaseProgress(p, 0.70 + jStagger, 0.90 + jStagger);
          cage2Paths[ji].el.style.strokeDashoffset = lerp(cage2Paths[ji].totalLength, 0, j1);
        }

        /* ---- Phase 12 (0.87 → 0.97): Stem exit draws downward ---- */
        for (var ki = 0; ki < stemExitPaths.length; ki++) {
          var k1 = phaseProgress(p, 0.87, 0.97);
          stemExitPaths[ki].el.style.strokeDashoffset = lerp(stemExitPaths[ki].totalLength, 0, k1);
        }

        /* ---- Phase 13 (0.55 → 0.75): Arrows fade in (staggered) ---- */
        for (var li = 0; li < arrowEls.length; li++) {
          var lStagger = li * 0.04;
          var l1 = phaseProgress(p, 0.55 + lStagger, 0.75 + lStagger);
          arrowEls[li].style.opacity = lerp(0, 0.6, l1);
        }

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
