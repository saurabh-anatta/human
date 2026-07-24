/**
 * Our Story — What's Next Chapter
 * Scroll-driven parallax for the product image column, subtle vessel-line
 * parallax, and staggered chip pop-in via createRevealObserver.
 *
 * @module story-whats-next
 */

/**
 * Initialise the whats-next chapter scroll animation.
 * @param {HTMLElement} sectionEl - The sticky child (.story-whats-next) bearing data-section-id
 * @param {Object} utils - The story-utils module (getScrollProgress, registerRafCallback, etc.)
 */
export function init(sectionEl, utils) {
  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  const productCol = sectionEl.querySelector('.story-whats-next__product-column');
  const vesselLines = sectionEl.querySelector('.story-whats-next__vessel-lines');
  const revealEls = sectionEl.querySelectorAll('.story-reveal');
  const chipEls = sectionEl.querySelectorAll('.story-whats-next__chip');

  /* Reduced motion: skip all scroll-driven animation, reveal everything */
  if (utils.prefersReducedMotion()) {
    return;
  }

  /* Stagger-reveal text elements */
  if (revealEls.length) {
    utils.createRevealObserver(revealEls, { threshold: 0.1 });
  }

  /* Stagger-reveal chips with delay */
  if (chipEls.length) {
    utils.createRevealObserver(chipEls, { threshold: 0.1, staggerDelay: 150 });
  }

  if (!productCol) return;

  /**
   * RAF tick — shifts the product column upward and applies subtle
   * parallax to the vessel contour lines as scroll progress advances.
   */
  function tick() {
    const progress = utils.getScrollProgress(chapterEl);

    /* Product column scrolls upward with progress.
       maxShift = how much taller the column is than the viewport. */
    const maxShift = productCol.scrollHeight - sectionEl.clientHeight;
    const shift = Math.max(0, maxShift);
    productCol.style.transform = 'translateY(' + (-progress * shift) + 'px)';

    /* Subtle vessel-line parallax (5 % of product shift) */
    if (vesselLines) {
      vesselLines.style.transform = 'translateY(' + (-progress * shift * 0.05) + 'px)';
    }
  }

  utils.registerRafCallback(tick);
}
