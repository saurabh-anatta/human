/* ==========================================================================
   Our Story — University Stadium Section JS
   Scroll-based reveal: logo fade-in and bg settle at ~50% reveal progress.
   ========================================================================== */

/**
 * Initialise the university stadium section.
 * @param {HTMLElement} sectionEl - The sticky child (.story-university-stadium)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  var logo = sectionEl.querySelector('.story-university-stadium__logo');
  var bg = sectionEl.querySelector('.story-university-stadium__bg');

  /* --- Reduced motion: settle immediately, no scroll animation --- */
  if (utils.prefersReducedMotion()) {
    if (logo) logo.classList.add('is-visible');
    if (bg) bg.classList.add('is-settled');
    return;
  }

  var chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  var revealed = false;

  function checkReveal() {
    if (revealed) return;

    var rect = chapterEl.getBoundingClientRect();
    /* progress: 0 when chapter top is at viewport bottom, 1 when at viewport top */
    var progress = 1 - (rect.top / window.innerHeight);

    if (progress >= 0.5) {
      revealed = true;
      if (logo) logo.classList.add('is-visible');
      if (bg) bg.classList.add('is-settled');
      utils.unregisterRafCallback(checkReveal);
    }
  }

  utils.registerRafCallback(checkReveal);
}
