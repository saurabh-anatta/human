/**
 * Section-specific JS for the story sub nav.
 * Provides scroll-spy highlighting and smooth-scroll on pill click.
 *
 * @module story-subnav
 */

/**
 * Initialises the sub nav scroll-spy and smooth-scroll behaviour.
 *
 * @param {HTMLElement} sectionEl - The section root element.
 * @param {Object} utils - The story-scroll-utils module (must expose prefersReducedMotion).
 * @returns {Function} Cleanup function that disconnects observers and removes listeners.
 */
export function initSubnav(sectionEl, utils) {
  const pills = sectionEl.querySelectorAll('.story-subnav__pill');
  const observers = [];
  const isMobile = function () {
    return window.innerWidth <= 749;
  };

  /* ------------------------------------------------------------------ */
  /* Scroll-spy                                                          */
  /* ------------------------------------------------------------------ */

  /** @type {HTMLElement|null} Currently active pill */
  let activePill = null;

  function setActive(pill) {
    if (activePill === pill) return;

    if (activePill) {
      activePill.classList.remove('is-active');
    }

    pill.classList.add('is-active');
    activePill = pill;

    /* On mobile, auto-scroll the bar so the active pill is visible */
    if (isMobile()) {
      pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  for (const pill of pills) {
    const anchorId = pill.getAttribute('data-anchor');
    if (!anchorId) continue;

    const target = document.getElementById(anchorId);
    if (!target) continue;

    const observer = new IntersectionObserver(
      function (entries) {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(pill);
          }
        }
      },
      {
        /* Activates when the target crosses the top ~20% of the viewport */
        rootMargin: '-20% 0px -79% 0px',
        threshold: 0
      }
    );

    observer.observe(target);
    observers.push(observer);
  }

  /* ------------------------------------------------------------------ */
  /* Smooth scroll on click                                              */
  /* ------------------------------------------------------------------ */

  function onClick(e) {
    const pill = e.target.closest('.story-subnav__pill');
    if (!pill) return;

    e.preventDefault();

    const anchorId = pill.getAttribute('data-anchor');
    if (!anchorId) return;

    const target = document.getElementById(anchorId);
    if (!target) return;

    /* Read header offset from CSS variable maintained by header.js */
    const headerHeight =
      parseInt(getComputedStyle(document.body).getPropertyValue('--header-height'), 10) || 0;

    /* Add the subnav bar's own height so the target isn't hidden behind it */
    const bar = sectionEl.querySelector('.story-subnav__bar');
    const barHeight = bar ? bar.offsetHeight : 0;

    /* Extra breathing room between subnav bottom and section top */
    const gap = 12;

    const totalOffset = headerHeight + barHeight + gap;

    window.scrollTo({
      top: target.offsetTop - totalOffset,
      behavior: utils.prefersReducedMotion() ? 'auto' : 'smooth'
    });
  }

  sectionEl.addEventListener('click', onClick);

  /* ------------------------------------------------------------------ */
  /* Cleanup                                                             */
  /* ------------------------------------------------------------------ */

  return function cleanup() {
    for (const obs of observers) {
      obs.disconnect();
    }
    sectionEl.removeEventListener('click', onClick);
  };
}
