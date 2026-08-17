/* ==========================================================================
   story-utils.js — Shared scroll-animation utilities for the "Our Story" page
   Loaded lazily by story-subnav on first IntersectionObserver hit.
   Every story section JS imports from this module.
   ========================================================================== */

/**
 * @returns {boolean} true when the user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns how many scroll-pixels the wrapper has been scrolled past the
 * viewport top. Clamped ≥ 0 (negative values before the wrapper enters
 * aren't useful).
 *
 * @param {HTMLElement} wrapperEl - A .story-chapter wrapper
 * @returns {number} Scroll distance in px (≥ 0)
 */
export function getScrollPx(wrapperEl) {
  return Math.max(0, -wrapperEl.getBoundingClientRect().top);
}

/**
 * Returns a 0–1 progress value for how far through a wrapper the user has
 * scrolled. 0 = top of wrapper at viewport top, 1 = bottom of wrapper
 * has reached viewport bottom.
 *
 * @param {HTMLElement} wrapperEl - A .story-chapter wrapper
 * @returns {number} Scroll progress clamped to 0–1
 */
export function getScrollProgress(wrapperEl) {
  const range = wrapperEl.offsetHeight - window.innerHeight;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, getScrollPx(wrapperEl) / range));
}

/**
 * Piecewise-linear interpolation with smoothstep easing between keyframe
 * stops. Used to drive CSS properties (opacity, translateY, scale, etc.)
 * from scroll position.
 *
 * @param {Array<[number, number]>} keyframes - Array of [scrollPx, value]
 *   pairs sorted ascending by scrollPx.
 * @param {number} scrollPx - Current scroll position in px.
 * @returns {number} Interpolated value at scrollPx.
 */
export function kfVal(keyframes, scrollPx) {
  if (keyframes.length === 0) return 0;

  /* Before the first stop — clamp to first value */
  if (scrollPx <= keyframes[0][0]) return keyframes[0][1];

  /* After the last stop — clamp to last value */
  if (scrollPx >= keyframes[keyframes.length - 1][0]) {
    return keyframes[keyframes.length - 1][1];
  }

  /* Find the two surrounding stops */
  for (let i = 0; i < keyframes.length - 1; i++) {
    const [px0, v0] = keyframes[i];
    const [px1, v1] = keyframes[i + 1];

    if (scrollPx >= px0 && scrollPx <= px1) {
      /* Local t in 0–1 range within this segment */
      const t = (scrollPx - px0) / (px1 - px0);

      /* Smoothstep easing: t² × (3 - 2t) */
      const eased = t * t * (3 - 2 * t);

      return v0 + (v1 - v0) * eased;
    }
  }

  /* Fallback — should not reach here with sorted keyframes */
  return keyframes[keyframes.length - 1][1];
}

/**
 * Creates an IntersectionObserver that adds .is-visible to elements when
 * they enter the viewport. One-shot: unobserves each element after reveal.
 *
 * @param {NodeList|Array<HTMLElement>} elements - Elements with .story-reveal
 * @param {Object} [opts]
 * @param {number} [opts.threshold=0.15] - Intersection ratio to trigger
 * @param {string} [opts.rootMargin='0px 0px -60px 0px'] - Observer margin
 */
export function createRevealObserver(elements, opts = {}) {
  if (prefersReducedMotion()) {
    /* Immediately show all elements — skip animation */
    for (const el of elements) {
      el.classList.add('is-visible');
    }
    return;
  }

  const threshold = opts.threshold ?? 0.15;
  const rootMargin = opts.rootMargin ?? '0px 0px -60px 0px';

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

  for (const el of elements) {
    observer.observe(el);
  }
}

/* --------------------------------------------------------------------------
   Shared rAF loop
   --------------------------------------------------------------------------
   Sections register/unregister callbacks. The loop starts on first register
   and stops when the set is empty — no idle-spinning.
   -------------------------------------------------------------------------- */

/** @type {Set<function>} */
const _rafCallbacks = new Set();

/** @type {number|null} */
let _rafId = null;

/**
 * Internal tick — calls every registered callback, then requests next frame.
 */
function _tick() {
  for (const fn of _rafCallbacks) {
    fn();
  }
  if (_rafCallbacks.size > 0) {
    _rafId = requestAnimationFrame(_tick);
  } else {
    _rafId = null;
  }
}

/**
 * Register a callback to run every animation frame.
 * Starts the rAF loop if it isn't running.
 *
 * @param {function} fn
 */
export function registerRafCallback(fn) {
  _rafCallbacks.add(fn);
  if (_rafId === null) {
    _rafId = requestAnimationFrame(_tick);
  }
}

/**
 * Unregister a previously registered rAF callback.
 * Stops the loop when the set is empty.
 *
 * @param {function} fn
 */
export function unregisterRafCallback(fn) {
  _rafCallbacks.delete(fn);
  if (_rafCallbacks.size === 0 && _rafId !== null) {
    cancelAnimationFrame(_rafId);
    _rafId = null;
  }
}
