/* ==========================================================================
   Our Story — Sticky Sub-Nav Capsule
   Exports init(sectionEl, utils) per the story-section pattern.
   ========================================================================== */

/**
 * Initialise the sub-nav scroll-spy, click-to-scroll, and header-height tracking.
 * @param {HTMLElement} sectionEl - The <nav> element with data-section-id
 * @param {Object} utils - The story-utils module
 */
export function init(sectionEl, utils) {
  const shopifySection = sectionEl.closest('.shopify-section');
  if (!shopifySection) return;

  /* --- Header height measurement --- */
  const headerEl =
    document.querySelector('#header-group') ||
    document.querySelector('.header-section') ||
    document.querySelector('header');

  function measureHeader() {
    const h = headerEl ? headerEl.getBoundingClientRect().height : 0;
    shopifySection.style.setProperty('--ssn-header-height', h + 'px');
  }

  measureHeader();

  if (headerEl && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(measureHeader);
    ro.observe(headerEl);
  }

  /* --- Collect nav items --- */
  const navItems = Array.from(sectionEl.querySelectorAll('.story-subnav__item'));
  if (navItems.length === 0) return;

  const navAnchors = navItems.map((item) =>
    (item.getAttribute('href') || '').replace('#', '')
  );

  function getChapters() {
    return Array.from(document.querySelectorAll('.story-chapter[data-anchor]'));
  }

  /* --- Scroll-spy via rAF --- */
  let currentAnchor = '';

  function scrollSpy() {
    const chapters = getChapters();
    if (chapters.length === 0) return;

    /*
     * Overlay chapters have large negative top margins, so document ranges
     * overlap. The chapter visually on screen is the LAST one (in DOM order)
     * whose top edge has crossed the activation line.
     */
    const threshold = window.innerHeight * 0.4;
    let activeIndex = -1;

    for (let i = 0; i < chapters.length; i++) {
      if (chapters[i].getBoundingClientRect().top <= threshold) {
        activeIndex = i;
      }
    }

    /*
     * Not every chapter has a nav item (e.g. blood-vessels, the-advisors).
     * Walk backwards to the nearest chapter that does, so its pill stays lit
     * through the un-navigated chapters that belong to it.
     */
    let activeAnchor = '';
    for (let i = activeIndex; i >= 0; i--) {
      const anchor = chapters[i].getAttribute('data-anchor');
      if (anchor && navAnchors.indexOf(anchor) !== -1) {
        activeAnchor = anchor;
        break;
      }
    }

    /* At the very top (hero) nothing matches — treat it as the first item */
    if (!activeAnchor) {
      activeAnchor = navAnchors[0] || '';
    }

    if (activeAnchor && activeAnchor !== currentAnchor) {
      currentAnchor = activeAnchor;

      for (const item of navItems) {
        const href = item.getAttribute('href') || '';
        const anchor = href.replace('#', '');
        if (anchor === activeAnchor) {
          item.classList.add('story-subnav__item--active');
          /* On mobile, scroll active item into view within the capsule */
          if (window.innerWidth <= 749) {
            item.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
          }
        } else {
          item.classList.remove('story-subnav__item--active');
        }
      }
    }
  }

  utils.registerRafCallback(scrollSpy);

  /* --- Click handler for smooth-scroll --- */
  sectionEl.addEventListener('click', (e) => {
    const link = e.target.closest('.story-subnav__item');
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute('href') || '';
    const anchor = href.replace('#', '');
    if (!anchor) return;

    const target = document.querySelector('.story-chapter[data-anchor="' + anchor + '"]');
    if (!target) return;

    /* The first nav chapter starts the story — take it from the very top */
    const chapters = getChapters();
    let firstNavChapter = null;
    for (const chapter of chapters) {
      const chapterAnchor = chapter.getAttribute('data-anchor');
      if (chapterAnchor && navAnchors.indexOf(chapterAnchor) !== -1) {
        firstNavChapter = chapter;
        break;
      }
    }

    /* rect-based document offset — offsetTop is unreliable with positioned ancestors */
    const top =
      target === firstNavChapter
        ? 0
        : Math.max(0, target.getBoundingClientRect().top + window.scrollY);

    window.scrollTo({ top, behavior: 'smooth' });
  });
}
