/**
 * Section-specific JS for the universal-truth vessel canvas.
 * The section is a natural-flow, ~3-screen-tall canvas; every vessel piece
 * (line segments, heartbeats, tree flare/converge, strands) and text block
 * carries [data-sut-reveal] and draws in one-shot via CSS transitions when
 * it enters the viewport. Reduced motion is handled by createRevealObserver
 * (reveals everything immediately) plus the section's CSS.
 *
 * @module story-universal-truth
 */

/**
 * Initialises the universal-truth section.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that disconnects the observer.
 */
export function init(sectionEl, utils) {
  const revealEls = sectionEl.querySelectorAll('[data-sut-reveal]');

  const observer = utils.createRevealObserver(revealEls, { threshold: 0.15 });

  return function cleanup() {
    if (observer) observer.disconnect();
  };
}
