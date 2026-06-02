import { Component } from '@theme/component';
import { isMobileBreakpoint } from '@theme/utilities';

/**
 * Manages footer-specific interactive behaviour:
 *
 * 1. Exclusive accordion menus — only one menu can be open at a time on mobile.
 *    Wraps the entire footer section so the Component base class collects every
 *    `ref="menuDetails[]"` element (the <details> inside each menu block) as
 *    `this.refs.menuDetails`. Siblings collapse instantly because accordion-custom's
 *    CSS applies `transition: none` to elements that are not `:focus-within`.
 *
 * 2. Widget shortcuts — openAccessibility() and openTalkdeskChat() are called by
 *    the on:click bindings on the footer's Accessibility and Chat buttons.
 *
 * @typedef {{ menuDetails: HTMLDetailsElement[] }} FooterMenusRefs
 * @extends {Component<FooterMenusRefs>}
 */
class FooterMenus extends Component {
  /** @type {AbortController} */
  #controller = new AbortController();

  connectedCallback() {
    super.connectedCallback();

    // <details> toggle events do not bubble — capture phase is required.
    document.addEventListener('toggle', this.#onMenuToggle, {
      signal: this.#controller.signal,
      capture: true,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#controller.abort();
  }

  /**
   * When an accordion menu opens on mobile, close every other open menu
   * collected in this footer.
   *
   * @param {Event} event
   */
  #onMenuToggle = (event) => {
    const details = event.target;

    if (!(details instanceof HTMLDetailsElement)) return;
    if (!details.classList.contains('menu__details') || !details.open) return;
    if (!isMobileBreakpoint()) return;

    // Ignore events from outside this footer.
    if (!this.contains(details)) return;

    /** @type {HTMLDetailsElement[]} */
    const menuDetails = /** @type {any} */ (this.refs.menuDetails) ?? [];

    for (const sibling of menuDetails) {
      if (sibling !== details && sibling.open) {
        sibling.open = false;
      }
    }
  };

  /**
   * Opens the third-party accessibility widget (UserWay / accessiBe).
   * Searches every `access-widget-ui` shadow root for the trigger button.
   */
  openAccessibility() {
    for (const widget of document.querySelectorAll('access-widget-ui')) {
      if (widget.shadowRoot) {
        const trigger = /** @type {HTMLElement|null} */ (widget.shadowRoot.querySelector('[data-testid="acsb-trigger"]'));
        if (trigger) {
          trigger.click();
          return;
        }
      }
    }
    console.warn('Accessibility menu trigger not found in any shadow root!');
  }

  /**
   * Opens the Talkdesk live-chat widget by clicking the trigger element
   * injected by talkdeskChat.js after the SDK initialises.
   */
  openTalkdeskChat() {
    const trigger = /** @type {HTMLElement|null} */ (document.querySelector('#talkdesk-chat-widget-trigger'));
    trigger?.click();
  }
}

if (!customElements.get('footer-menus')) {
  customElements.define('footer-menus', FooterMenus);
}

/**
 * Expose as window globals so footer-widget-button blocks (which live outside
 * the footer-menus element) can call them via window.openAccessibility?.()
 *
 * @type {{ openAccessibility?: () => void, openTalkdeskChat?: () => void }}
 */
const _win = /** @type {any} */ (window);

_win.openAccessibility = function () {
  for (const widget of document.querySelectorAll('access-widget-ui')) {
    if (widget.shadowRoot) {
      const trigger = /** @type {HTMLElement|null} */ (widget.shadowRoot.querySelector('[data-testid="acsb-trigger"]'));
      if (trigger) {
        trigger.click();
        return;
      }
    }
  }
  console.warn('Accessibility menu trigger not found in any shadow root!');
};

_win.openTalkdeskChat = function () {
  const trigger = /** @type {HTMLElement|null} */ (document.querySelector('#talkdesk-chat-widget-trigger'));
  trigger?.click();
};
