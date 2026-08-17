/* ==========================================================================
   story-subnav.js — Sticky sub-nav capsule behavior
   Loaded lazily by story-subnav.liquid on first IntersectionObserver hit.
   ========================================================================== */

/**
 * Initialise the sticky sub-nav capsule.
 *
 * @param {HTMLElement} sectionEl - The story-subnav section root
 * @param {Object} utils - story-utils.js module (unused directly here,
 *   but keeps the init(sectionEl, utils) contract consistent with other
 *   story section JS modules)
 */
export function init(sectionEl, utils) {
  const capsule = sectionEl.querySelector('.ssn__capsule');
  const links = sectionEl.querySelectorAll('.ssn__link');
  const pill = sectionEl.querySelector('.ssn__pill');

  if (!capsule || links.length === 0) return;

  /* ------------------------------------------------------------------
     1. Sticky offset — account for the site header height
     ------------------------------------------------------------------ */
  function updateStickyOffset() {
    const headerHeight = parseInt(
      getComputedStyle(document.body).getPropertyValue('--header-height') || '0',
      10
    );
    capsule.style.top = (headerHeight + 12) + 'px';
  }

  updateStickyOffset();
  window.addEventListener('resize', updateStickyOffset, { passive: true });

  /* ------------------------------------------------------------------
     2. Scroll-spy — highlight the link whose chapter is most visible
     ------------------------------------------------------------------ */

  /** @type {HTMLElement[]} */
  const chapters = Array.from(
    document.querySelectorAll('.story-chapter[data-anchor]')
  );

  /** @type {Map<string, HTMLElement>} anchor → link element */
  const linkMap = new Map();
  for (const link of links) {
    const anchor = link.dataset.anchor;
    if (anchor) linkMap.set(anchor, link);
  }

  /** @type {HTMLElement|null} Currently active link */
  let activeLink = null;

  /**
   * Determine which chapter is most in view and activate its nav link.
   */
  function updateScrollSpy() {
    if (chapters.length === 0) return;

    const viewportMid = window.innerHeight / 2;
    let bestChapter = null;
    let bestDistance = Infinity;

    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      /* Distance from chapter's vertical center to viewport center */
      const chapterMid = rect.top + rect.height / 2;
      const distance = Math.abs(chapterMid - viewportMid);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestChapter = chapter;
      }
    }

    if (!bestChapter) return;

    const anchor = bestChapter.dataset.anchor;
    const targetLink = linkMap.get(anchor);

    if (targetLink && targetLink !== activeLink) {
      if (activeLink) activeLink.classList.remove('ssn__link--active');
      targetLink.classList.add('ssn__link--active');
      activeLink = targetLink;
      movePill(targetLink);
      scrollLinkIntoView(targetLink);
    }
  }

  /**
   * Position the sliding pill indicator behind the active link.
   * @param {HTMLElement} linkEl
   */
  function movePill(linkEl) {
    if (!pill) return;
    const navScroller = capsule.querySelector('.ssn__nav');
    if (!navScroller) return;

    const scrollerRect = navScroller.getBoundingClientRect();
    const linkRect = linkEl.getBoundingClientRect();

    pill.style.transform = `translateX(${linkRect.left - scrollerRect.left + navScroller.scrollLeft}px)`;
    pill.style.width = `${linkRect.width}px`;
  }

  /**
   * On mobile, ensure the active link is scrolled into the visible area
   * of the horizontally-scrollable nav.
   * @param {HTMLElement} linkEl
   */
  function scrollLinkIntoView(linkEl) {
    const navScroller = capsule.querySelector('.ssn__nav');
    if (!navScroller) return;

    const navRect = navScroller.getBoundingClientRect();
    const linkRect = linkEl.getBoundingClientRect();

    /* If the link is partially or fully outside the visible nav area */
    if (linkRect.left < navRect.left || linkRect.right > navRect.right) {
      linkEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }

  /* Throttled scroll listener */
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateScrollSpy();
        ticking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Initial check */
  updateScrollSpy();

  /* ------------------------------------------------------------------
     3. Click → smooth-scroll to the wrapper top
     ------------------------------------------------------------------ */
  for (const link of links) {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      const anchor = link.dataset.anchor;
      if (!anchor) return;

      const targetChapter = document.querySelector(
        `.story-chapter[data-anchor="${anchor}"]`
      );
      if (!targetChapter) return;

      /* Offset by header height so the chapter starts below the header */
      const headerHeight = parseInt(
        getComputedStyle(document.body).getPropertyValue('--header-height') || '0',
        10
      );

      const targetTop =
        targetChapter.getBoundingClientRect().top +
        window.scrollY -
        headerHeight;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     4. Stuck state — toggle .ssn__capsule--stuck for visual treatment
     ------------------------------------------------------------------ */
  const stuckObserver = new IntersectionObserver(
    ([entry]) => {
      /* When the sentinel goes out of view, the capsule is stuck */
      capsule.classList.toggle('ssn__capsule--stuck', !entry.isIntersecting);
    },
    { threshold: 0 }
  );

  const sentinel = sectionEl.querySelector('.ssn__sentinel');
  if (sentinel) stuckObserver.observe(sentinel);
}
