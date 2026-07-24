/* ==========================================================================
   Our Story — Proof Statistics Section JS
   Count-up animation with ease-out curve, star pop-in, and staggered reveal.
   ========================================================================== */

/**
 * Initialise the proof statistics section.
 * @param {HTMLElement} sectionEl - The sticky child (.story-proof-statistics)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  /* Early exit for reduced motion — Liquid renders final state, CSS shows everything settled */
  if (utils.prefersReducedMotion()) return;

  /* Reveal animations on intro + stat elements */
  var revealEls = sectionEl.querySelectorAll('.story-reveal');
  if (revealEls.length > 0) {
    utils.createRevealObserver(revealEls, { threshold: 0.2, staggerDelay: 150 });
  }

  /* Gather stat elements */
  var statEls = sectionEl.querySelectorAll('.story-proof-statistics__stat');
  if (statEls.length === 0) return;

  var enableCountUp = sectionEl.dataset.enableCountUp === 'true';

  /* Observe section visibility to trigger count-up + star animations */
  var triggered = false;
  var observer = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting && !triggered) {
        triggered = true;
        observer.disconnect();
        runAnimations(statEls, enableCountUp, utils);
        break;
      }
    }
  }, { threshold: 0.15 });

  observer.observe(sectionEl);
}

/**
 * Format a number with commas as thousands separators.
 * @param {number} n
 * @returns {string}
 */
function formatWithCommas(n) {
  var str = Math.floor(n).toString();
  var result = '';
  var count = 0;
  for (var i = str.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      result = ',' + result;
    }
    result = str[i] + result;
    count++;
  }
  return result;
}

/**
 * Ease-out cubic curve.
 * @param {number} t - Progress 0–1
 * @returns {number}
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Run count-up and star pop-in animations across all stat elements.
 * @param {NodeList} statEls
 * @param {boolean} enableCountUp
 * @param {Object} utils
 */
function runAnimations(statEls, enableCountUp, utils) {
  var STAGGER = 150;
  var DURATION = 1000;
  var STAR_STAGGER = 80;

  for (var i = 0; i < statEls.length; i++) {
    (function (statEl, index) {
      var delay = index * STAGGER;
      var numberEl = statEl.querySelector('.story-proof-statistics__stat-number');
      if (!numberEl) return;

      var targetValue = parseInt(numberEl.dataset.value, 10);
      var suffix = numberEl.dataset.suffix || '';
      var rawValue = numberEl.dataset.value || '';
      var useCommas = rawValue.indexOf(',') !== -1;
      var shouldCountUp = enableCountUp && numberEl.dataset.countUp === 'true' && !isNaN(targetValue);

      if (!shouldCountUp) {
        /* No count-up — pop stars after reveal settles */
        setTimeout(function () {
          popStars(statEl, STAR_STAGGER);
        }, delay + 300);
        return;
      }

      /* Start count-up after stagger delay */
      setTimeout(function () {
        numberEl.textContent = '0' + suffix;
        var startTime = null;

        function tick() {
          if (startTime === null) {
            startTime = performance.now();
          }

          var elapsed = performance.now() - startTime;
          var progress = Math.min(elapsed / DURATION, 1);
          var eased = easeOutCubic(progress);
          var current = Math.floor(eased * targetValue);

          var formatted = useCommas ? formatWithCommas(current) : current.toString();
          numberEl.textContent = formatted + suffix;

          if (progress >= 1) {
            /* Set final value and clean up */
            var finalStr = useCommas ? formatWithCommas(targetValue) : targetValue.toString();
            numberEl.textContent = finalStr + suffix;
            utils.unregisterRafCallback(tick);
            popStars(statEl, STAR_STAGGER);
          }
        }

        utils.registerRafCallback(tick);
      }, delay);
    })(statEls[i], i);
  }
}

/**
 * Sequential pop-in of star elements within a stat card.
 * @param {HTMLElement} statEl
 * @param {number} stagger - ms between each star pop-in
 */
function popStars(statEl, stagger) {
  var stars = statEl.querySelectorAll('.story-proof-statistics__star');
  for (var i = 0; i < stars.length; i++) {
    (function (star, idx) {
      setTimeout(function () {
        star.classList.add('is-popped');
      }, idx * stagger);
    })(stars[i], i);
  }
}
