import { Component } from '@theme/component';
import { isClickedOutside } from '@theme/utilities';

/**
 * @typedef {object} KcsRefs
 * @property {HTMLDialogElement} dialog
 *
 * @extends Component<KcsRefs>
 */
class KcsSearchComponent extends Component {
  requiredRefs = ['dialog'];

  #previousScrollY = 0;

  showDialog = () => {
    const { dialog } = this.refs;
    if (dialog.open) return;

    this.#previousScrollY = window.scrollY;

    requestAnimationFrame(() => {
      document.body.style.width = '100%';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.#previousScrollY}px`;

      dialog.showModal();
      this.dispatchEvent(new CustomEvent('dialog:open'));

      dialog.addEventListener('cancel', this.#handleCancel);
      this.addEventListener('click', this.#handleClick);
      this.addEventListener('keydown', this.#handleKeyDown);
    });
  };

  closeDialog = () => {
    const { dialog } = this.refs;
    if (!dialog.open) return;

    dialog.removeEventListener('cancel', this.#handleCancel);
    this.removeEventListener('click', this.#handleClick);
    this.removeEventListener('keydown', this.#handleKeyDown);

    document.body.style.width = '';
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo({ top: this.#previousScrollY, behavior: 'instant' });

    dialog.close();
    this.dispatchEvent(new CustomEvent('dialog:close'));
  };

  toggleDialog = () => {
    if (this.refs.dialog.open) {
      this.closeDialog();
    } else {
      this.showDialog();
    }
  };

  /** @param {Event} event */
  #handleCancel = (event) => {
    event.preventDefault();
    this.closeDialog();
  };

  /** @param {MouseEvent} event */
  #handleClick = (event) => {
    if (isClickedOutside(event, this.refs.dialog)) {
      this.closeDialog();
    }
  };

  /** @param {KeyboardEvent} event */
  #handleKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.closeDialog();
  };
}

if (!customElements.get('kcs-search-component')) {
  customElements.define('kcs-search-component', KcsSearchComponent);
}

class KcsRotatingText extends HTMLElement {
  /** @type {string[]} */
  #questions = [];
  #idx = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  #timer = null;
  /** @type {HTMLElement | null} */
  #host = null;

  connectedCallback() {
    this.#host = this.closest('kcs-search-component');
    this.#questions = [...(this.#host?.querySelectorAll('template[data-question]') ?? [])]
      .map((t) => /** @type {HTMLElement} */ (t).dataset.question?.trim() ?? '')
      .filter((q) => q !== '');
    if (this.#questions.length > 0) this.textContent = this.#questions[0] ?? null;
    if (this.#questions.length < 2) return;

    const ms = Number(this.dataset.interval) || 4000;
    this.#start(ms);

    this.#host?.addEventListener('dialog:open', this.#pause);
    this.#host?.addEventListener('dialog:close', this.#resume);
  }

  disconnectedCallback() {
    clearInterval(this.#timer ?? undefined);
    this.#host?.removeEventListener('dialog:open', this.#pause);
    this.#host?.removeEventListener('dialog:close', this.#resume);
    this.#host = null;
  }

  /** @param {number} ms */
  #start(ms) {
    this.#timer = setInterval(() => this.#next(), ms);
  }

  #next = () => {
    this.style.opacity = '0';
    setTimeout(() => {
      this.#idx = (this.#idx + 1) % this.#questions.length;
      this.textContent = this.#questions[this.#idx] ?? null;
      this.style.opacity = '1';
    }, 200);
  };

  #pause = () => {
    clearInterval(this.#timer ?? undefined);
    this.#timer = null;
  };

  #resume = () => {
    if (this.#timer) return;
    this.#start(Number(this.dataset.interval) || 4000);
  };
}

if (!customElements.get('kcs-rotating-text')) {
  customElements.define('kcs-rotating-text', KcsRotatingText);
}
