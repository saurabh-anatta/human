/* ==========================================================================
   story-subnav.js — Sticky sub-nav capsule behavior
   Imported by story-subnav.liquid on page load (above-the-fold, no lazy IO).
   ========================================================================== */

/**
 * Initialise the sticky sub-nav capsule.
 *
 * @param {HTMLElement} sectionEl - The [data-story-subnav] root element
 * @param {Object} utils - story-utils.js module exports
 */
export function init(sectionEl, utils) {
  const capsule = sectionEl.querySelector('.story-subnav__capsule');
  const list = sectionEl.querySelector('.story-subnav__list');
  const links = sectionEl.querySelectorAll('.story-subnav__link');

  if (!capsule || links.length === 0) return;

  /* ------------------------------------------------------------------
     1. STICKY: position:fixed when scrolled past the resting position
     ------------------------------------------------------------------ */

  /**
   * Read the Horizon sticky header height so the subnav docks below it.
   * Checks #header-group first, falls back to .header-section.
   * @returns {number}
   */
  function getHeaderHeight() {
    const headerGroup = document.getElementById('header-group');
    if (headerGroup) {
      const headerSection = headerGroup.querySelector('.header-section');
      if (headerSection) return headerSection.offsetHeight;
      return headerGroup.offsetHeight;
    }
    const headerSection = document.querySelector('.header-section');
    if (headerSection) return headerSection.offsetHeight;
    return 0;
  }

  /* Record the subnav's resting Y position (page-relative, measured once) */
  const restingTop = sectionEl.getBoundingClientRect().top + window.scrollY;

  /* Parent Shopify section wrapper — used to reserve space when child goes fixed */
  const shopifySection = sectionEl.closest('.shopify-section');

  let isStuck = false;

  /**
   * Toggle the stuck class based on scroll position. When stuck, the
   * subnav becomes position:fixed below the site header. The parent
   * wrapper gets a min-height to prevent layout shift.
   */
  function updateSticky() {
    const headerH = getHeaderHeight();
    const shouldStick = window.scrollY >= restingTop - headerH;

    if (shouldStick && !isStuck) {
      isStuck = true;
      /* Lock parent height before the child leaves flow */
      if (shopifySection) {
        shopifySection.style.minHeight = sectionEl.offsetHeight + 'px';
      }
      sectionEl.style.setProperty('--ssn-header-offset', headerH + 'px');
      sectionEl.classList.add('story-subnav--stuck');
    } else if (!shouldStick && isStuck) {
      isStuck = false;
      sectionEl.classList.remove('story-subnav--stuck');
      if (shopifySection) {
        shopifySection.style.minHeight = '';
      }
    }
  }

  /* ------------------------------------------------------------------
     2. SCROLL-SPY: IntersectionObserver on .story-chapter wrappers
     ------------------------------------------------------------------ */

  /** @type {NodeListOf<HTMLElement>} */
  const chapters = document.querySelectorAll('.story-chapter[data-anchor]');

  /** @type {Map<string, HTMLElement>} anchor string -> link element */
  const linkMap = new Map();
  for (const link of links) {
    const anchor = link.dataset.anchor;
    if (anchor) linkMap.set(anchor, link);
  }

  /** @type {HTMLElement|null} */
  let activeLink = null;

  /**
   * Activate a nav link by its anchor string. Removes the active class
   * from the previous link and adds it to the new one. On mobile,
   * scrolls the link into the visible area of the horizontal scroller.
   * @param {string} anchor
   */
  function setActiveLink(anchor) {
    const targetLink = linkMap.get(anchor);
    if (!targetLink || targetLink === activeLink) return;

    if (activeLink) activeLink.classList.remove('story-subnav__link--active');
    targetLink.classList.add('story-subnav__link--active');
    activeLink = targetLink;

    /* On mobile, ensure the active link is visible in the horizontal scroller */
    if (list && window.innerWidth <= 749) {
      const listRect = list.getBoundingClientRect();
      const linkRect = targetLink.getBoundingClientRect();
      if (linkRect.left < listRect.left || linkRect.right > listRect.right) {
        targetLink.scrollIntoView({
          inline: 'center',
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }

  /*
   * rootMargin '-40% 0px -60% 0px' creates a trigger line at the 40%
   * mark from the viewport top. Chapters (which are many vh tall) are
   * considered "in view" when their extent crosses this line. As the
   * user scrolls, the chapter spanning the 40% line is the active one.
   */
  const spyObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const anchor = entry.target.dataset.anchor;
          if (anchor) setActiveLink(anchor);
        }
      }
    },
    { rootMargin: '-40% 0px -60% 0px' }
  );

  for (const chapter of chapters) {
    spyObserver.observe(chapter);
  }

  /* ------------------------------------------------------------------
     3. SMOOTH-SCROLL: click -> scroll to wrapper top
     Event delegation on the nav list for .story-subnav__link clicks.
     ------------------------------------------------------------------ */

  list.addEventListener('click', (e) => {
    const link = e.target.closest('.story-subnav__link');
    if (!link) return;

    e.preventDefault();

    const anchor = link.dataset.anchor;
    if (!anchor) return;

    const targetChapter = document.querySelector(
      '.story-chapter[data-anchor="' + anchor + '"]'
    );
    if (!targetChapter) return;

    /* Scroll to the wrapper top so pinned chapters start at progress 0 */
    const wrapperOffsetTop =
      targetChapter.getBoundingClientRect().top + window.scrollY;

    /* AC-13: fall back to instant scroll under prefers-reduced-motion */
    const scrollBehavior = utils.prefersReducedMotion() ? 'instant' : 'smooth';

    window.scrollTo({ top: wrapperOffsetTop, behavior: scrollBehavior });
  });

  /* ------------------------------------------------------------------
     4. Throttled scroll listener for sticky state
     ------------------------------------------------------------------ */

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateSticky();
        ticking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Recalculate header offset on resize (header height may change) */
  window.addEventListener('resize', () => {
    if (isStuck) {
      sectionEl.style.setProperty('--ssn-header-offset', getHeaderHeight() + 'px');
    }
  }, { passive: true });

  /* Initial check — may already need to be stuck on page load */
  updateSticky();
}
