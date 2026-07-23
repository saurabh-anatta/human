/* ==========================================================================
   Our Story — Shared Utility Module
   Imported by all story section JS via the inline-IIFE pattern.
   NOT registered in the Horizon importmap.
   ========================================================================== */

/**
 * Check if the user prefers reduced motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get local scroll progress (0–1) within a .story-chapter wrapper.
 * @param {HTMLElement} wrapperEl - The .story-chapter element
 * @returns {number} Progress clamped between 0 and 1
 */
export function getScrollProgress(wrapperEl) {
  const scrolled = window.scrollY - wrapperEl.offsetTop;
  const scrollRange = wrapperEl.offsetHeight - window.innerHeight;
  if (scrollRange <= 0) return 0;
  return Math.max(0, Math.min(1, scrolled / scrollRange));
}

/**
 * Get raw pixels scrolled into a .story-chapter wrapper.
 * @param {HTMLElement} wrapperEl - The .story-chapter element
 * @returns {number} Pixels scrolled (min 0)
 */
export function getScrollPx(wrapperEl) {
  return Math.max(0, window.scrollY - wrapperEl.offsetTop);
}

/**
 * Piecewise-linear interpolation with smoothstep easing between keyframe stops.
 * @param {Array<[number, number]>} keyframes - Sorted array of [scrollPx, value] pairs
 * @param {number} scrollPx - Current scroll position in pixels
 * @returns {number} Interpolated value
 */
export function kfVal(keyframes, scrollPx) {
  if (!keyframes || keyframes.length === 0) return 0;
  if (scrollPx <= keyframes[0][0]) return keyframes[0][1];
  if (scrollPx >= keyframes[keyframes.length - 1][0]) return keyframes[keyframes.length - 1][1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const [stop0, value0] = keyframes[i];
    const [stop1, value1] = keyframes[i + 1];
    if (scrollPx >= stop0 && scrollPx <= stop1) {
      const range = stop1 - stop0;
      if (range === 0) return value0;
      let t = (scrollPx - stop0) / range;
      /* smoothstep */
      t = t * t * (3 - 2 * t);
      return value0 + (value1 - value0) * t;
    }
  }

  return keyframes[keyframes.length - 1][1];
}

/**
 * Create a one-shot IntersectionObserver that adds .is-visible with stagger.
 * Under prefers-reduced-motion, immediately adds .is-visible to all elements.
 * @param {NodeList|Array<HTMLElement>} elements
 * @param {Object} [options]
 * @param {number} [options.threshold=0.15]
 * @param {number} [options.staggerDelay=150]
 */
export function createRevealObserver(elements, { threshold = 0.15, staggerDelay = 150 } = {}) {
  const els = Array.from(elements);
  if (els.length === 0) return;

  if (prefersReducedMotion()) {
    for (const el of els) {
      el.classList.add('is-visible');
    }
    return;
  }

  let revealedCount = 0;
  const total = els.length;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = els.indexOf(entry.target);
          const delay = idx >= 0 ? idx * staggerDelay : 0;
          setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, delay);
          observer.unobserve(entry.target);
          revealedCount++;
          if (revealedCount >= total) {
            observer.disconnect();
          }
        }
      }
    },
    { threshold }
  );

  for (const el of els) {
    observer.observe(el);
  }
}

/* --- Shared rAF loop --- */
const rafCallbacks = new Set();
let rafId = null;

function rafLoop() {
  for (const fn of rafCallbacks) {
    fn();
  }
  if (rafCallbacks.size > 0) {
    rafId = requestAnimationFrame(rafLoop);
  } else {
    rafId = null;
  }
}

/**
 * Register a callback to run on every animation frame.
 * The loop starts automatically when the first callback is registered.
 * @param {Function} fn
 */
export function registerRafCallback(fn) {
  rafCallbacks.add(fn);
  if (rafId === null) {
    rafId = requestAnimationFrame(rafLoop);
  }
}

/**
 * Unregister a callback from the shared rAF loop.
 * The loop stops automatically when the set is empty.
 * @param {Function} fn
 */
export function unregisterRafCallback(fn) {
  rafCallbacks.delete(fn);
  if (rafCallbacks.size === 0 && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
