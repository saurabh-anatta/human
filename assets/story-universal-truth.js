/**
 * Section-specific JS for the universal-truth vessel canvas.
 *
 * Scroll-scrubbed drawing: an invisible "pen" sits at ~88% of the viewport
 * height. Every [data-sut-draw] element draws exactly as far as it has
 * scrolled past the pen — lines grow via scaleY, SVG strokes draw via
 * pathLength-normalised dashoffset, text fades up. Because progress is
 * recomputed from scroll position every frame, scrolling back up reverses
 * the drawing.
 *
 * @module story-universal-truth
 */

/**
 * Smoothstep easing for text reveals (gentler than linear).
 * @param {number} t - Progress (0-1).
 * @returns {number}
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Initialises the universal-truth section.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module.
 * @returns {Function} Cleanup function that removes listeners.
 */
export function init(sectionEl, utils) {
  /* Reduced motion: the section CSS renders everything fully drawn. */
  if (utils.prefersReducedMotion()) {
    return function cleanup() {};
  }

  const items = [];
  const drawEls = sectionEl.querySelectorAll('[data-sut-draw]');

  for (const el of drawEls) {
    const kind = el.getAttribute('data-sut-draw');
    items.push({
      el: el,
      kind: kind,
      paths: kind === 'svg' ? el.querySelectorAll('path') : null,
      strands: kind === 'strands' ? el.querySelectorAll('.story-universal-truth__strand') : null
    });
  }

  let ticking = false;

  function applyDraw() {
    const penY = window.innerHeight * 0.88;

    for (const item of items) {
      const rect = item.el.getBoundingClientRect();

      /* getBoundingClientRect reports the TRANSFORMED size — a line at
         scaleY(0) measures 0 tall and would never draw. offsetHeight is the
         layout height, immune to transforms; SVG elements have no
         offsetHeight, but they are never transformed so rect.height is safe.
         rect.top stays correct for scaled lines because transform-origin is
         top. */
      let height = item.el.offsetHeight || rect.height;
      /* A percentage/auto-height line inside a flex-grown wrapper can measure
         0 — use the wrapper's layout height so the segment still draws. */
      if (height === 0 && item.el.parentElement) {
        height = item.el.parentElement.offsetHeight;
      }
      if (height === 0) continue;

      /* 0 when the element's top reaches the pen, 1 when its bottom passes it */
      const progress = Math.min(Math.max((penY - rect.top) / height, 0), 1);

      if (item.kind === 'line') {
        item.el.style.transform = 'scaleY(' + progress + ')';
      } else if (item.kind === 'svg') {
        for (const path of item.paths) {
          path.style.strokeDashoffset = 1 - progress;
        }
      } else if (item.kind === 'strands') {
        for (const strand of item.strands) {
          strand.style.transform = 'scaleY(' + progress + ')';
        }
      } else if (item.kind === 'text') {
        const eased = smoothstep(progress);
        item.el.style.opacity = eased;
        item.el.style.transform = 'translateY(' + (1 - eased) * 24 + 'px)';
      }
    }

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(applyDraw);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  return function cleanup() {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  };
}
