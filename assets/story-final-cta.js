/**
 * Final CTA section — entrance reveal animation.
 *
 * Uses createRevealObserver for staggered content fade-in
 * and a separate IntersectionObserver for vessel-line settle.
 *
 * @module story-final-cta
 */

/**
 * Initialise the Final CTA section.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - Shared story-scroll-utils module.
 */
export function init(sectionEl, utils) {
  const revealEls = sectionEl.querySelectorAll('[data-reveal]');
  const vesselLine = sectionEl.querySelector('.story-final-cta__vessel-line');

  /* Reduced-motion guard: show everything immediately, skip observers */
  if (utils.prefersReducedMotion()) {
    for (const el of revealEls) {
      el.classList.add('is-visible');
    }
    if (vesselLine) {
      vesselLine.classList.add('is-settled');
    }
    return;
  }

  /* Staggered entrance reveal for content elements */
  if (revealEls.length > 0) {
    utils.createRevealObserver(revealEls, { threshold: 0.15, staggerDelay: 150 });
  }

  /* One-shot observer for vessel-line settle animation */
  if (vesselLine) {
    const vesselObserver = new IntersectionObserver(
      function (entries) {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          vesselLine.classList.add('is-settled');
          vesselObserver.unobserve(entry.target);
          vesselObserver.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    vesselObserver.observe(vesselLine);
  }
}
