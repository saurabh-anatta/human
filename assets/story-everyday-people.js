/* ==========================================================================
   Our Story — Everyday People Photo Grid Section JS
   Scattered fade-in animation for portrait tiles via createRevealObserver.
   Optional subtle parallax drift on alternate columns.
   ========================================================================== */

/**
 * Initialise the Everyday People section.
 * @param {HTMLElement} sectionEl - The sticky child (.story-everyday-people)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  var chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  var tiles = Array.from(sectionEl.querySelectorAll('.story-everyday-people__tile'));
  if (tiles.length === 0) return;

  /* ---- Reduced motion: show everything immediately ---- */
  if (utils.prefersReducedMotion()) {
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].classList.add('is-visible');
    }
    return;
  }

  /* ---- Fisher-Yates shuffle for scattered reveal order ---- */
  var shuffled = tiles.slice();
  for (var j = shuffled.length - 1; j > 0; j--) {
    var k = Math.floor(Math.random() * (j + 1));
    var temp = shuffled[j];
    shuffled[j] = shuffled[k];
    shuffled[k] = temp;
  }

  /* ---- Reveal tiles with staggered timing ---- */
  utils.createRevealObserver(shuffled, { threshold: 0.1, staggerDelay: 30 });

  /* ---- Subtle parallax drift on alternate columns ---- */
  var columns = Array.from(sectionEl.querySelectorAll('.story-everyday-people__column'));
  if (columns.length === 0) return;

  function parallaxTick() {
    var rect = chapterEl.getBoundingClientRect();
    var vh = window.innerHeight;

    /* Section not in view — skip work */
    if (rect.bottom < 0 || rect.top > vh) return;

    var scrolled = utils.getScrollPx(chapterEl);
    var drift = scrolled * 0.003;
    var maxDrift = 3;
    var clampedDrift = Math.min(drift, maxDrift);

    for (var c = 0; c < columns.length; c++) {
      var colIndex = parseInt(columns[c].getAttribute('data-col') || '0', 10);
      var direction = colIndex % 2 === 0 ? 1 : -1;
      columns[c].style.setProperty('--sep-parallax', (direction * clampedDrift) + 'px');
    }
  }

  utils.registerRafCallback(parallaxTick);
}
