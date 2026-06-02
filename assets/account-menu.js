import { Component } from '@theme/component';

/**
 * Account menu dropdown/drawer component.
 * Desktop: dropdown popover below trigger; opens on hover (pointer devices) and click.
 * Mobile: full-height side drawer with overlay.
 *
 * @extends {Component}
 */
class AccountMenu extends Component {
  /** @type {ReturnType<typeof setTimeout> | null} */
  #hoverCloseTimer = null;

  connectedCallback() {
    super.connectedCallback();

    this.headerComponent = document.querySelector('#header-component');

    document.addEventListener('keydown', this.#onKeydown);
    document.addEventListener('click', this.#onDocumentClick);
    this.headerComponent?.addEventListener('mouseover', this.#onHeaderMouseover);

  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.#onKeydown);
    document.removeEventListener('click', this.#onDocumentClick);
    this.headerComponent?.removeEventListener('mouseover', this.#onHeaderMouseover);

  }

  toggle = () => {
    if (this.hasAttribute('open')) {
      this.close();
    } else {
      this.open();
    }
  };

  open = () => {
    clearTimeout(this.#hoverCloseTimer ?? undefined);
    this.setAttribute('open', '');
    /** @type {HTMLElement | undefined} */ (this.refs.trigger)?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  #openWithFocus = () => {
    this.open();
    const firstFocusable = /** @type {HTMLElement | undefined} */ (this.refs.panel)?.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable instanceof HTMLElement) {
      firstFocusable.focus();
    }
  };

  close = () => {
    clearTimeout(this.#hoverCloseTimer ?? undefined);
    this.removeAttribute('open');
    /** @type {HTMLElement | undefined} */ (this.refs.trigger)?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  onOverlayPointerenter = () => {
    if (window.innerWidth < 1024) return;
    this.close();
  };

  onPointerenter = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.innerWidth < 1024) return;
    clearTimeout(this.#hoverCloseTimer ?? undefined);
    if (!this.hasAttribute('open')) {
      this.open();
    }
  };

  onPointerleave = () => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.innerWidth < 1024) return;
    this.#hoverCloseTimer = setTimeout(this.close, 150);
  };

  /**
   * @param {KeyboardEvent} event
   */
  #onKeydown = (event) => {
    const trigger = /** @type {HTMLElement | undefined} */ (this.refs.trigger);
    if (event.key === 'Escape' && this.hasAttribute('open')) {
      this.close();
      if (trigger instanceof HTMLElement) trigger.focus();
    }

    if (event.key === 'Enter' && document.activeElement === trigger && !this.hasAttribute('open')) {
      event.preventDefault();
      this.#openWithFocus();
    }

    if (event.key === 'Tab' && this.hasAttribute('open')) {
      setTimeout(() => {
        if (!this.contains(document.activeElement)) {
          this.close();
        }
      }, 0);
    }
  };

  /**
   * @param {Event} event
   */
  #onDocumentClick = (event) => {
    if (!this.hasAttribute('open')) return;
    if (event.target instanceof Node && !this.contains(event.target)) {
      this.close();
    }
  };

  /**
   * @param {Event} event
   */
  #onHeaderMouseover = (event) => {
    if (window.innerWidth < 750) return;
    if (!this.hasAttribute('open')) return;
    if (event.target instanceof Element) {
      const menuLink = event.target.closest('.menu-list__link');
      if (menuLink && !this.contains(menuLink)) {
        this.close();
      }
    }
  };
}

if (!customElements.get('account-menu')) {
  customElements.define('account-menu', AccountMenu);
}
