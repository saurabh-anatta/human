import { Component } from '@theme/component';

const SUB_NAV_HEIGHT = 40;
const ACTIVE_CLASS = 'story-sub-nav__link--active';

class StorySubNav extends Component {
  /** @type {IntersectionObserver[]} */
  #observers = [];

  /** @type {((event: Event) => void) | null} */
  #clickHandler = null;

  connectedCallback() {
    super.connectedCallback();

    const links = this.querySelectorAll('a[data-anchor]');
    if (links.length === 0) return;

    /* ---- Scrollspy via IntersectionObserver ---- */
    for (const link of links) {
      const anchorId = link.getAttribute('data-anchor');
      if (!anchorId) continue;

      const target = document.getElementById(anchorId);
      if (!target) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.#setActiveLink(link);
            }
          }
        },
        {
          threshold: 0,
          rootMargin: '-40% 0px -55% 0px',
        }
      );

      observer.observe(target);
      this.#observers.push(observer);
    }

    /* ---- Smooth-scroll click handler (delegated) ---- */
    this.#clickHandler = (event) => {
      const anchor = /** @type {HTMLElement} */ (event.target).closest('a[data-anchor]');
      if (!anchor) return;

      event.preventDefault();

      const anchorId = anchor.getAttribute('data-anchor');
      if (!anchorId) return;

      const target = document.getElementById(anchorId);
      if (!target) return;

      const headerHeight = parseFloat(
        getComputedStyle(document.body).getPropertyValue('--header-height')
      ) || 0;

      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - SUB_NAV_HEIGHT;

      window.scrollTo({ top, behavior: 'smooth' });
    };

    this.addEventListener('click', this.#clickHandler);
  }

  /**
   * Sets the active class on the given link and removes it from all siblings.
   * @param {Element} activeLink
   */
  #setActiveLink(activeLink) {
    const links = this.querySelectorAll('a[data-anchor]');
    for (const link of links) {
      link.classList.toggle(ACTIVE_CLASS, link === activeLink);
    }
  }

  disconnectedCallback() {
    for (const observer of this.#observers) {
      observer.disconnect();
    }
    this.#observers = [];

    if (this.#clickHandler) {
      this.removeEventListener('click', this.#clickHandler);
      this.#clickHandler = null;
    }
  }
}

customElements.define('story-sub-nav', StorySubNav);
