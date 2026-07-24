/* ==========================================================================
   Our Story — Closing CTA Section
   Reuses the hero's particle-ring canvas via initRing.
   Exports init(sectionEl, utils, heroMod).
   ========================================================================== */

/**
 * Initialise the Closing CTA section — canvas ring + reveal animations.
 * @param {HTMLElement} sectionEl - The element with data-section-id
 * @param {Object} utils - The story-utils module
 * @param {Object} heroMod - The story-hero module (provides initRing)
 */
export function init(sectionEl, utils, heroMod) {
  const canvas = sectionEl.querySelector('.story-hero__canvas');
  if (!canvas) return;

  const ring = heroMod.initRing(canvas, utils);

  /* Reveal animations for headline + button */
  utils.createRevealObserver(
    sectionEl.querySelectorAll('.story-reveal'),
    { threshold: 0.1, staggerDelay: 150 }
  );

  if (!ring) {
    /* Reduced motion — initRing drew a static frame, no animation needed */
    sectionEl.setAttribute('data-reduced-motion', '');
    return;
  }

  /* Viewport-pause: only run the rAF callback when section is visible */
  const draw = ring.draw;
  let isVisible = false;

  const visObserver = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (!isVisible) {
          isVisible = true;
          utils.registerRafCallback(draw);
        }
      } else {
        if (isVisible) {
          isVisible = false;
          utils.unregisterRafCallback(draw);
        }
      }
    }
  }, { threshold: 0 });

  visObserver.observe(sectionEl);
}
