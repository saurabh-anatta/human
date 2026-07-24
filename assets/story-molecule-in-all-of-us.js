/**
 * Our Story — Molecule in All of Us Chapter
 * Scroll-driven parallax for the image column and decorative vessel lines.
 *
 * @module story-molecule-in-all-of-us
 */

/**
 * Initialise the molecule-in-all-of-us chapter scroll animation.
 * @param {HTMLElement} sectionEl - The sticky child (.story-molecule-in-all-of-us) bearing data-section-id
 * @param {Object} utils - The story-utils module (getScrollProgress, registerRafCallback, etc.)
 */
export function init(sectionEl, utils) {
  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  const imagesCol = sectionEl.querySelector('.story-molecule-in-all-of-us__images');
  const vesselLines = sectionEl.querySelector('.story-molecule-in-all-of-us__vessel-lines');

  if (!imagesCol) return;

  /* Reduced motion: skip all scroll-driven animation */
  if (utils.prefersReducedMotion()) {
    return;
  }

  /**
   * RAF tick — shifts the image column upward and applies subtle
   * parallax to the vessel contour lines as scroll progress advances.
   */
  function tick() {
    const progress = utils.getScrollProgress(chapterEl);

    /* Image column scrolls upward with progress.
       maxShift = how much taller the column is than the viewport. */
    const maxShift = imagesCol.scrollHeight - sectionEl.clientHeight;
    const shift = Math.max(0, maxShift);
    imagesCol.style.transform = 'translateY(' + (-progress * shift) + 'px)';

    /* Subtle vessel-line parallax (5 % of image shift) */
    if (vesselLines) {
      vesselLines.style.transform = 'translateY(' + (-progress * shift * 0.05) + 'px)';
    }
  }

  utils.registerRafCallback(tick);
}
