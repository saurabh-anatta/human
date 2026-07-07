/**
 * CTA closing section — fade-in-on-enter reveal animation.
 * ES module — loaded via <script type="module"> in the section Liquid file.
 */

/**
 * Initializes the CTA reveal animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createRevealObserver: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initCta(sectionEl, { createRevealObserver }) {
  const revealEls = sectionEl.querySelectorAll('[data-reveal]');
  if (revealEls.length === 0) return;

  const cleanup = createRevealObserver(revealEls);
  return cleanup;
}
