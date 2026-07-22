/**
 * Section-specific JS for the problem scroll-pinned chapter.
 * Drives chart heading reveal, media slide cross-fades, SVG graph stroke
 * animation, annotation reveals, and stat callout via scroll progress.
 *
 * @module story-the-problem
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
 * Initialises the problem section scroll animation.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  var scrollTrack = sectionEl.querySelector('.story-the-problem__scroll-track');
  var eyebrowEl = sectionEl.querySelector('.story-the-problem__eyebrow');
  var chartHeading = sectionEl.querySelector('.story-the-problem__chart-heading');
  var slides = sectionEl.querySelectorAll('.story-the-problem__slide');
  var graphEl = sectionEl.querySelector('.story-the-problem__graph');
  var graphLine = sectionEl.querySelector('.story-the-problem__graph-line');
  var graphDots = sectionEl.querySelectorAll('.story-the-problem__graph-dot');
  var annotations = sectionEl.querySelectorAll('.story-the-problem__annotation');
  var gradientEl = sectionEl.querySelector('.story-the-problem__gradient');
  var statEl = sectionEl.querySelector('.story-the-problem__stat');

  /* Cache SVG path total length and set initial stroke-dasharray */
  var totalLength = 0;
  if (graphLine) {
    totalLength = graphLine.getTotalLength();
    graphLine.style.strokeDasharray = totalLength;
    graphLine.style.strokeDashoffset = totalLength;
  }

  /* Reduced motion: show everything immediately, skip scroll animation */
  if (utils.prefersReducedMotion()) {
    if (graphLine) graphLine.style.strokeDashoffset = '0';
    if (eyebrowEl) eyebrowEl.style.opacity = '1';
    if (chartHeading) chartHeading.style.opacity = '1';
    for (var ri = 0; ri < slides.length; ri++) {
      slides[ri].style.opacity = '1';
      slides[ri].style.transform = 'none';
      var rCaption = slides[ri].querySelector('.story-the-problem__slide-caption');
      if (rCaption) rCaption.style.opacity = '1';
    }
    if (graphEl) graphEl.style.opacity = '1';
    for (var rdi = 0; rdi < graphDots.length; rdi++) {
      graphDots[rdi].style.opacity = '1';
    }
    for (var rai = 0; rai < annotations.length; rai++) {
      annotations[rai].style.opacity = '1';
    }
    if (gradientEl) gradientEl.style.opacity = '1';
    if (statEl) {
      statEl.style.opacity = '1';
      statEl.style.transform = 'none';
    }
    return function cleanup() {};
  }

  var slideCount = slides.length;

  var cleanupScroll = utils.createScrollProgress(scrollTrack, {
    onProgress: function (p) {
      requestAnimationFrame(function () {

        /* ---- Phase A (0.00–0.12): eyebrow + chart heading fade in ---- */
        var aP = phaseProgress(p, 0.00, 0.12);

        if (eyebrowEl) {
          if (p <= 0.12) {
            eyebrowEl.style.opacity = lerp(0, 1, aP);
          } else {
            var eyeFade = phaseProgress(p, 0.12, 0.20);
            eyebrowEl.style.opacity = lerp(1, 0, eyeFade);
          }
        }

        if (chartHeading) {
          if (p <= 0.12) {
            chartHeading.style.opacity = lerp(0, 1, aP);
          } else if (p <= 0.20) {
            var bH = phaseProgress(p, 0.12, 0.20);
            chartHeading.style.opacity = lerp(1, 0.1, bH);
          } else if (p <= 0.55) {
            chartHeading.style.opacity = 0.1;
          } else {
            var dH = phaseProgress(p, 0.55, 0.65);
            chartHeading.style.opacity = lerp(0.1, 0, dH);
          }
        }

        /* ---- Slides (0.12–0.55): slide-up sequentially ---- */
        if (slideCount > 0) {
          var sPhaseStart = 0.12;
          var sPhaseEnd = 0.55;
          var perSlide = (sPhaseEnd - sPhaseStart) / slideCount;

          for (var si = 0; si < slideCount; si++) {
            var sStart = sPhaseStart + si * perSlide;
            var sEnd = sStart + perSlide;

            /* Slide up: first 40% of slide range */
            var slideUpP = phaseProgress(p, sStart, sStart + perSlide * 0.4);
            var yOffset = lerp(100, 0, slideUpP);
            slides[si].style.transform = 'translateY(' + yOffset + '%)';
            slides[si].style.opacity = slideUpP > 0 ? 1 : 0;

            /* Caption within slide */
            var captionEl = slides[si].querySelector('.story-the-problem__slide-caption');
            if (captionEl) {
              var cFadeIn = phaseProgress(p, sStart + perSlide * 0.15, sStart + perSlide * 0.45);
              var cFadeOut = 0;
              if (si < slideCount - 1) {
                cFadeOut = phaseProgress(p, sEnd - perSlide * 0.25, sEnd);
              }
              var cOpacity = cFadeIn * (1 - cFadeOut);
              captionEl.style.opacity = Math.min(Math.max(cOpacity, 0), 1);
            }
          }

          /* Desat overlay on last slide: fade in during graph entry */
          var lastSlideDesat = slides[slideCount - 1].querySelector('.story-the-problem__slide-desat');
          if (lastSlideDesat) {
            var desatP = phaseProgress(p, 0.55, 0.65);
            lastSlideDesat.style.opacity = lerp(0, 1, desatP);
          }
        }

        /* ---- Phase D (0.55–0.68): gradient + graph fade in ---- */
        if (gradientEl) {
          var gradP = phaseProgress(p, 0.58, 0.68);
          gradientEl.style.opacity = lerp(0, 1, gradP);
        }

        if (graphEl) {
          var graphFade = phaseProgress(p, 0.60, 0.68);
          graphEl.style.opacity = lerp(0, 1, graphFade);
        }

        /* ---- Phase E (0.65–0.90): SVG stroke draws ---- */
        if (graphLine && totalLength > 0) {
          var eP = phaseProgress(p, 0.65, 0.90);
          graphLine.style.strokeDashoffset = lerp(totalLength, 0, eP);
        }

        /* Annotations fade in at progressive sub-thresholds */
        var annThresholds = [
          [0.70, 0.76],
          [0.78, 0.84],
          [0.86, 0.92]
        ];
        for (var ai = 0; ai < annotations.length && ai < annThresholds.length; ai++) {
          var annP = phaseProgress(p, annThresholds[ai][0], annThresholds[ai][1]);
          annotations[ai].style.opacity = lerp(0, 1, annP);
        }

        /* Graph dots fade with their annotations */
        for (var di = 0; di < graphDots.length && di < annThresholds.length; di++) {
          var dotP = phaseProgress(p, annThresholds[di][0], annThresholds[di][1]);
          graphDots[di].style.opacity = lerp(0, 1, dotP);
        }

        /* ---- Phase F (0.88–1.0): stat fades in from below ---- */
        if (statEl) {
          var fP = phaseProgress(p, 0.88, 1.0);
          statEl.style.opacity = lerp(0, 1, fP);
          statEl.style.transform = 'translateY(' + lerp(30, 0, fP) + 'px)';
        }

      });
    }
  });

  return function cleanup() {
    cleanupScroll();
  };
}
