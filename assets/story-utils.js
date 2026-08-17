/**
 * story-utils.js — Shared ES module utilities for all Our Story sections.
 *
 * Exports:
 *   prefersReducedMotion()
 *   registerRafCallback(fn)
 *   unregisterRafCallback(fn)
 *   getScrollPx(wrapperEl)
 *   getScrollProgress(wrapperEl)
 *   kfVal(keyframes, scrollPx)
 *   createRevealObserver(elements, opts)
 */

/* ------------------------------------------------------------------ */
/*  Reduced motion                                                     */
/* ------------------------------------------------------------------ */

/**
 * @returns {boolean} true when the user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------ */
/*  Shared rAF loop                                                    */
/* ------------------------------------------------------------------ */

/** @type {Array<(time: number) => void>} */
const callbacks = [];

/** @type {number|null} */
let rafId = null;

/**
 * Internal tick — calls every registered callback with the DOMHighResTimeStamp.
 * @param {number} time
 */
function tick(time) {
  for (const fn of callbacks) {
    fn(time);
  }
  if (callbacks.length > 0) {
    rafId = requestAnimationFrame(tick);
  }
}

/**
 * Register a callback to run on every animation frame.
 * Starts the loop automatically when the first callback is added.
 * @param {(time: number) => void} fn
 */
export function registerRafCallback(fn) {
  if (callbacks.indexOf(fn) !== -1) return;
  callbacks.push(fn);
  if (callbacks.length === 1) {
    rafId = requestAnimationFrame(tick);
  }
}

/**
 * Remove a previously registered callback.
 * Stops the loop automatically when the last callback is removed.
 * @param {(time: number) => void} fn
 */
export function unregisterRafCallback(fn) {
  const idx = callbacks.indexOf(fn);
  if (idx === -1) return;
  callbacks.splice(idx, 1);
  if (callbacks.length === 0 && rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

/* ------------------------------------------------------------------ */
/*  Scroll helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Returns how many pixels the wrapper has scrolled past the viewport top.
 * Clamps at 0 (wrapper hasn't reached the top yet).
 * @param {HTMLElement} wrapperEl
 * @returns {number}
 */
export function getScrollPx(wrapperEl) {
  return Math.max(0, -wrapperEl.getBoundingClientRect().top);
}

/**
 * Returns a 0–1 progress value for how far through the wrapper we've scrolled.
 * 0 = wrapper top just hit viewport top; 1 = wrapper bottom at viewport bottom.
 * @param {HTMLElement} wrapperEl
 * @returns {number}
 */
export function getScrollProgress(wrapperEl) {
  const rect = wrapperEl.getBoundingClientRect();
  const travel = rect.height - window.innerHeight;
  if (travel <= 0) return 0;
  const raw = -rect.top / travel;
  return Math.max(0, Math.min(1, raw));
}

/* ------------------------------------------------------------------ */
/*  Keyframe interpolation                                             */
/* ------------------------------------------------------------------ */

/**
 * Linearly interpolates a value from a sorted array of [scrollPx, value] stops.
 * Clamps at the first and last stop.
 *
 * @param {Array<[number, number]>} keyframes — sorted ascending by scrollPx
 * @param {number} scrollPx
 * @returns {number}
 */
export function kfVal(keyframes, scrollPx) {
  if (keyframes.length === 0) return 0;
  if (scrollPx <= keyframes[0][0]) return keyframes[0][1];
  if (scrollPx >= keyframes[keyframes.length - 1][0]) return keyframes[keyframes.length - 1][1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const [px0, v0] = keyframes[i];
    const [px1, v1] = keyframes[i + 1];
    if (scrollPx >= px0 && scrollPx <= px1) {
      const t = (scrollPx - px0) / (px1 - px0);
      return v0 + (v1 - v0) * t;
    }
  }
  return keyframes[keyframes.length - 1][1];
}

/* ------------------------------------------------------------------ */
/*  Reveal observer                                                    */
/* ------------------------------------------------------------------ */

/**
 * Creates an IntersectionObserver that adds 'is-visible' to elements when they
 * enter the viewport.  Optionally staggers the transitionDelay per element.
 *
 * @param {NodeList|HTMLElement[]} elements
 * @param {{ threshold?: number, staggerDelay?: number }} [opts]
 * @returns {IntersectionObserver}
 */
export function createRevealObserver(elements, opts) {
  const threshold = (opts && opts.threshold) || 0.15;
  const staggerDelay = (opts && opts.staggerDelay) || 0;

  const observer = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (staggerDelay > 0) {
          const idx = Array.prototype.indexOf.call(elements, entry.target);
          if (idx > 0) {
            entry.target.style.transitionDelay = (idx * staggerDelay) + 'ms';
          }
        }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: threshold });

  for (const el of elements) {
    observer.observe(el);
  }

  return observer;
}
