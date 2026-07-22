/**
 * Shared scroll-animation utilities used by all story sections.
 *
 * @module story-scroll-utils
 */

/**
 * Returns true when the user prefers reduced motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Attaches a passive scroll listener that computes a 0-1 progress value based
 * on how far `element` has scrolled through its sticky scroll distance.
 * Calls `callback(progress)` gated through requestAnimationFrame.
 *
 * @param {HTMLElement} element - The scrollable container (typically the section root with a tall scroll height).
 * @param {Object} callbacks - Object with an `onProgress(p)` method receiving 0-1 value.
 * @returns {Function} Cleanup function that removes the scroll listener.
 */
export function createScrollProgress(element, callbacks) {
  if (prefersReducedMotion()) {
    callbacks.onProgress(1);
    return function noop() {};
  }

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(function () {
      const rect = element.getBoundingClientRect();
      const scrollHeight = element.scrollHeight || element.offsetHeight;
      const viewportHeight = window.innerHeight;

      /* Total distance the element travels from entering at the bottom
         of the viewport to its bottom edge leaving the top. */
      const totalDistance = scrollHeight - viewportHeight;

      if (totalDistance <= 0) {
        callbacks.onProgress(1);
        ticking = false;
        return;
      }

      /* How far we have scrolled into the element:
         When rect.top === 0 → progress = 0 (element just pinned)
         When the element's bottom aligns with viewport top → progress = 1 */
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / totalDistance, 0), 1);

      callbacks.onProgress(progress);
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  /* Fire once immediately to set initial state */
  onScroll();

  return function cleanup() {
    window.removeEventListener('scroll', onScroll);
  };
}

/**
 * Creates an IntersectionObserver that adds `.is-visible` when elements enter
 * the viewport. One-shot: auto-disconnects each entry after reveal.
 *
 * @param {NodeList|Array<HTMLElement>} elements - Elements to observe.
 * @param {Object} [options] - Optional configuration.
 * @param {number} [options.threshold=0.1] - Visibility threshold (0-1).
 * @param {number} [options.staggerDelay=0] - Milliseconds between staggered reveals.
 * @returns {IntersectionObserver|null} The observer instance, or null if reduced motion.
 */
export function createRevealObserver(elements, options) {
  const opts = Object.assign({ threshold: 0.1, staggerDelay: 0 }, options);

  if (prefersReducedMotion()) {
    for (const el of elements) {
      el.classList.add('is-visible');
    }
    return null;
  }

  let revealIndex = 0;

  const observer = new IntersectionObserver(
    function (entries) {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const el = entry.target;
        observer.unobserve(el);

        if (opts.staggerDelay > 0) {
          const delay = revealIndex * opts.staggerDelay;
          revealIndex++;
          setTimeout(function () {
            el.classList.add('is-visible');
          }, delay);
        } else {
          el.classList.add('is-visible');
        }
      }
    },
    { threshold: opts.threshold }
  );

  for (const el of elements) {
    observer.observe(el);
  }

  return observer;
}
