/**
 * Section-specific JS for the miracle molecule scroll-pinned chapter.
 * Drives video-pin text overlay, blur transition with molecule SVG,
 * and split image+text pair cycling via scroll progress.
 *
 * @module story-miracle-molecule
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
 * Initialises the miracle molecule section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-miracle-molecule__scroll-track');
  var eyebrowEl = sectionEl.querySelector('.story-miracle-molecule__eyebrow');
  var stage1Text1 = sectionEl.querySelector('.story-miracle-molecule__stage1-text--1');
  var stage1Text2 = sectionEl.querySelector('.story-miracle-molecule__stage1-text--2');
  var mediaLayer = sectionEl.querySelector('.story-miracle-molecule__media-layer');
  var desatLayer = sectionEl.querySelector('.story-miracle-molecule__desat-layer');
  var blurLayer = sectionEl.querySelector('.story-miracle-molecule__blur-layer');
  var noText = sectionEl.querySelector('.story-miracle-molecule__no-text');
  var noSub = sectionEl.querySelector('.story-miracle-molecule__no-sub');
  var moleculeSvg = sectionEl.querySelector('.story-miracle-molecule__molecule');
  var moleculeGroup = sectionEl.querySelector('.story-miracle-molecule__molecule-group');
  var moleculeLabels = sectionEl.querySelectorAll('.story-miracle-molecule__molecule-label');
  var stage3 = sectionEl.querySelector('.story-miracle-molecule__stage3');
  var stage3Images = sectionEl.querySelectorAll('.story-miracle-molecule__pair-image');
  var stage3Texts = sectionEl.querySelectorAll('.story-miracle-molecule__pair-text');
  var closingText = sectionEl.querySelector('.story-miracle-molecule__closing');

  /* Reduced motion: show everything immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (eyebrowEl) eyebrowEl.style.opacity = '1';
    if (stage1Text1) stage1Text1.style.opacity = '1';
    if (stage1Text2) stage1Text2.style.opacity = '1';
    if (desatLayer) desatLayer.style.display = 'none';
    if (blurLayer) blurLayer.style.opacity = '1';
    if (noText) noText.style.opacity = '1';
    if (noSub) noSub.style.opacity = '1';
    if (moleculeSvg) moleculeSvg.style.opacity = '1';
    for (var li = 0; li < moleculeLabels.length; li++) {
      moleculeLabels[li].style.opacity = '1';
    }
    if (stage3) stage3.style.opacity = '1';
    for (var ii = 0; ii < stage3Images.length; ii++) {
      stage3Images[ii].style.opacity = '1';
    }
    for (var ti = 0; ti < stage3Texts.length; ti++) {
      stage3Texts[ti].style.opacity = '1';
    }
    if (closingText) closingText.style.opacity = '1';
    return function cleanup() {};
  }

  var pairCount = stage3Texts.length;

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* ---- Stage 1 (0.00–0.25): eyebrow + two text blocks ---- */

        /* Eyebrow: in 0.00-0.05, hold, out 0.22-0.28 */
        if (eyebrowEl) {
          if (p <= 0.05) {
            eyebrowEl.style.opacity = lerp(0, 1, phaseProgress(p, 0.00, 0.05));
          } else if (p <= 0.22) {
            eyebrowEl.style.opacity = '1';
          } else {
            eyebrowEl.style.opacity = lerp(1, 0, phaseProgress(p, 0.22, 0.28));
          }
        }

        /* stage1_text_1: in 0.02-0.08, hold 0.08-0.10, out 0.10-0.15 */
        if (stage1Text1) {
          if (p <= 0.08) {
            stage1Text1.style.opacity = lerp(0, 1, phaseProgress(p, 0.02, 0.08));
          } else if (p <= 0.10) {
            stage1Text1.style.opacity = '1';
          } else {
            stage1Text1.style.opacity = lerp(1, 0, phaseProgress(p, 0.10, 0.15));
          }
        }

        /* stage1_text_2: in 0.12-0.18, hold 0.18-0.20, out 0.20-0.25 */
        if (stage1Text2) {
          if (p <= 0.18) {
            stage1Text2.style.opacity = lerp(0, 1, phaseProgress(p, 0.12, 0.18));
          } else if (p <= 0.20) {
            stage1Text2.style.opacity = '1';
          } else {
            stage1Text2.style.opacity = lerp(1, 0, phaseProgress(p, 0.20, 0.25));
          }
        }

        /* ---- Stage 2 transition (0.20–0.35) ---- */

        /* Desat layer fades out */
        if (desatLayer) {
          desatLayer.style.opacity = lerp(1, 0, phaseProgress(p, 0.20, 0.28));
        }

        /* Blur layer (dark overlay) fades in */
        if (blurLayer) {
          blurLayer.style.opacity = lerp(0, 1, phaseProgress(p, 0.20, 0.30));
        }

        /* Media layer gets blurred */
        if (mediaLayer) {
          var blurAmt = lerp(0, 47, phaseProgress(p, 0.20, 0.30));
          mediaLayer.style.filter = blurAmt > 0.5 ? 'blur(' + blurAmt + 'px)' : 'none';
        }

        /* Molecule SVG: fade in 0.24-0.32, fade out 0.55-0.62 */
        if (moleculeSvg) {
          if (p <= 0.55) {
            moleculeSvg.style.opacity = lerp(0, 1, phaseProgress(p, 0.24, 0.32));
          } else {
            moleculeSvg.style.opacity = lerp(1, 0, phaseProgress(p, 0.55, 0.62));
          }
        }

        /* Molecule group: scale 0.7→1.0, rotate 0→2.4deg over 0.24-0.50 */
        if (moleculeGroup) {
          var molScale = lerp(0.7, 1.0, phaseProgress(p, 0.24, 0.50));
          var molRotate = lerp(0, 2.4, phaseProgress(p, 0.24, 0.50));
          moleculeGroup.setAttribute('transform',
            'translate(200,200) scale(' + molScale + ') rotate(' + molRotate + ') translate(-200,-200)');
        }

        /* NO text: in 0.25-0.33, hold, out 0.55-0.62 */
        if (noText) {
          if (p <= 0.55) {
            noText.style.opacity = lerp(0, 1, phaseProgress(p, 0.25, 0.33));
          } else {
            noText.style.opacity = lerp(1, 0, phaseProgress(p, 0.55, 0.62));
          }
        }

        /* NO sub: in 0.30-0.38, hold, out 0.55-0.62 */
        if (noSub) {
          if (p <= 0.55) {
            noSub.style.opacity = lerp(0, 1, phaseProgress(p, 0.30, 0.38));
          } else {
            noSub.style.opacity = lerp(1, 0, phaseProgress(p, 0.55, 0.62));
          }
        }

        /* Molecule N/O labels: in 0.40-0.48, hold, out 0.55-0.62 */
        for (var mi = 0; mi < moleculeLabels.length; mi++) {
          if (p <= 0.55) {
            moleculeLabels[mi].style.opacity = lerp(0, 1, phaseProgress(p, 0.40, 0.48));
          } else {
            moleculeLabels[mi].style.opacity = lerp(1, 0, phaseProgress(p, 0.55, 0.62));
          }
        }

        /* ---- Stage 3 (0.55–1.00): split image+text pairs ---- */

        /* Stage 3 container fades in */
        if (stage3) {
          stage3.style.opacity = lerp(0, 1, phaseProgress(p, 0.58, 0.65));
        }

        /* Cycle through pairs */
        if (pairCount > 0) {
          var s3Start = 0.62;
          var s3End = 0.92;
          var perPair = (s3End - s3Start) / pairCount;

          for (var pi = 0; pi < pairCount; pi++) {
            var pStart = s3Start + pi * perPair;
            var pEnd = pStart + perPair;

            /* Image: fade in first 30%, fade out last 30% (last stays) */
            var imgIn = phaseProgress(p, pStart, pStart + perPair * 0.3);
            var imgOut = 0;
            if (pi < pairCount - 1) {
              imgOut = phaseProgress(p, pEnd - perPair * 0.3, pEnd);
            }
            var imgOp = imgIn * (1 - imgOut);
            if (stage3Images[pi]) {
              stage3Images[pi].style.opacity = Math.min(Math.max(imgOp, 0), 1);
            }

            /* Text: fade in 10-40%, fade out 65-95% of range (last stays) */
            var txtIn = phaseProgress(p, pStart + perPair * 0.1, pStart + perPair * 0.4);
            var txtOut = 0;
            if (pi < pairCount - 1) {
              txtOut = phaseProgress(p, pEnd - perPair * 0.35, pEnd - perPair * 0.05);
            }
            var txtOp = txtIn * (1 - txtOut);
            if (stage3Texts[pi]) {
              stage3Texts[pi].style.opacity = Math.min(Math.max(txtOp, 0), 1);
            }
          }
        }

        /* Closing text: in 0.92-1.00 */
        if (closingText) {
          closingText.style.opacity = lerp(0, 1, phaseProgress(p, 0.92, 1.0));
        }

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
