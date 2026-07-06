/**
 * Shared scroll-animation utilities for Our Story page chapters.
 * Plain ES module — no framework dependency.
 */

/**
 * Returns true if the user prefers reduced motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Creates an IntersectionObserver that adds `.is-visible` to `[data-reveal]`
 * elements on first entry (one-shot). If reduced motion is preferred, all
 * elements receive `.is-visible` immediately without an observer.
 *
 * @param {NodeList|Element[]} elements - Elements with `[data-reveal]`
 * @param {{ threshold?: number, rootMargin?: string }} [options]
 * @returns {() => void} Cleanup function that disconnects the observer
 */
export function createRevealObserver(elements, options = {}) {
  const els = Array.from(elements);
  if (els.length === 0) return () => {};

  /* Reduced-motion fallback: immediately reveal all elements */
  if (prefersReducedMotion()) {
    for (const el of els) {
      el.classList.add('is-visible');
    }
    return () => {};
  }

  const threshold = options.threshold ?? 0.15;
  const rootMargin = options.rootMargin ?? '0px';

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold, rootMargin }
  );

  for (const el of els) {
    observer.observe(el);
  }

  return () => {
    observer.disconnect();
  };
}

/**
 * Tracks scroll progress of a sticky/pinned element and invokes a callback
 * with a 0–1 progress value. Also dispatches a `story:scroll-progress`
 * CustomEvent on the element for inter-component communication.
 *
 * If reduced motion is preferred, calls `callback(1)` immediately and returns
 * a no-op cleanup function.
 *
 * @param {Element} element - The DOM element to track
 * @param {(progress: number) => void} callback - Called with progress 0–1
 * @returns {() => void} Cleanup function that removes the scroll listener
 */
export function createScrollProgress(element, callback) {
  if (prefersReducedMotion()) {
    callback(1);
    return () => {};
  }

  const onScroll = () => {
    const rect = element.getBoundingClientRect();
    const elementTop = window.scrollY + rect.top;
    const elementHeight = element.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollRange = elementHeight - viewportHeight;

    let progress = 0;
    if (scrollRange > 0) {
      progress = (window.scrollY - elementTop) / scrollRange;
      progress = Math.max(0, Math.min(1, progress));
    }

    callback(progress);

    element.dispatchEvent(
      new CustomEvent('story:scroll-progress', {
        detail: { progress },
        bubbles: true,
      })
    );
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  /* Initial calculation */
  onScroll();

  return () => {
    window.removeEventListener('scroll', onScroll);
  };
}
