import { Component } from '@theme/component';

/**
 * PdpFlavorPicker — Handles custom variant selection via flavor cards.
 * Dispatches 'pdp:variant-change' with { variantId, variant } detail.
 */
class PdpFlavorPicker extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.variantData = [];

    const dataEl = this.querySelector('[data-variant-json]');

    if (dataEl) {
      try {
        this.variantData = JSON.parse(dataEl.textContent);
      } catch (e) {
        /* silent */
      }
    }

    this.cards = this.querySelectorAll('[data-variant-id]');

    for (const card of this.cards) {
      card.addEventListener('click', this.#handleCardClick.bind(this));
    }

    this.#initSelectedState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    for (const card of this.cards) {
      card.removeEventListener('click', this.#handleCardClick.bind(this));
    }
  }

  #initSelectedState() {
    const url = new URL(window.location.href);
    const variantParam = url.searchParams.get('variant');

    if (variantParam) {
      this.#selectCard(variantParam);
    }
  }

  #handleCardClick(event) {
    const card = event.currentTarget;
    const variantId = card.getAttribute('data-variant-id');

    if (!variantId) return;

    this.#selectCard(variantId);
    this.#updateUrl(variantId);
    this.#dispatchChange(variantId);
  }

  #selectCard(variantId) {
    for (const card of this.cards) {
      const isSelected = card.getAttribute('data-variant-id') === String(variantId);
      card.setAttribute('data-selected', isSelected ? 'true' : 'false');
    }
  }

  #updateUrl(variantId) {
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variantId);
    history.replaceState({}, '', url.toString());
  }

  #dispatchChange(variantId) {
    const variant = this.variantData.find((v) => String(v.id) === String(variantId));

    this.dispatchEvent(
      new CustomEvent('pdp:variant-change', {
        detail: { variantId, variant },
        bubbles: true,
      })
    );
  }
}

customElements.define('pdp-flavor-picker', PdpFlavorPicker);

/**
 * PdpSubscribeOptions — Handles subscribe & save plan selection.
 * Dispatches 'pdp:plan-change' with { planId, tierId } detail.
 */
class PdpSubscribeOptions extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.options = this.querySelectorAll('[data-plan-tier]');

    for (const option of this.options) {
      option.addEventListener('click', this.#handleOptionClick.bind(this));
    }

    const firstOption = this.querySelector('[data-plan-tier][data-selected="true"]');

    if (!firstOption && this.options.length > 0) {
      this.options[0].setAttribute('data-selected', 'true');
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    for (const option of this.options) {
      option.removeEventListener('click', this.#handleOptionClick.bind(this));
    }
  }

  #handleOptionClick(event) {
    const option = event.currentTarget;
    const tierId = option.getAttribute('data-plan-tier');
    const planId = option.getAttribute('data-selling-plan') || '';

    for (const opt of this.options) {
      opt.setAttribute('data-selected', 'false');
    }

    option.setAttribute('data-selected', 'true');

    this.dispatchEvent(
      new CustomEvent('pdp:plan-change', {
        detail: { planId, tierId },
        bubbles: true,
      })
    );
  }
}

customElements.define('pdp-subscribe-options', PdpSubscribeOptions);

/**
 * PdpPurchaseForm — Handles the product form submission via AJAX.
 * Listens for pdp:variant-change and pdp:plan-change to update hidden inputs.
 */
class PdpPurchaseForm extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.form = this.querySelector('form[action*="/cart/add"]');

    this.#boundVariantHandler = this.#handleVariantChange.bind(this);
    this.#boundPlanHandler = this.#handlePlanChange.bind(this);

    document.addEventListener('pdp:variant-change', this.#boundVariantHandler);
    document.addEventListener('pdp:plan-change', this.#boundPlanHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pdp:variant-change', this.#boundVariantHandler);
    document.removeEventListener('pdp:plan-change', this.#boundPlanHandler);
  }

  #boundVariantHandler;
  #boundPlanHandler;

  #handleVariantChange(event) {
    const { variantId } = event.detail;
    const variantInput = this.querySelector('input[name="id"]');

    if (variantInput && variantId) {
      variantInput.value = variantId;
    }
  }

  #handlePlanChange(event) {
    const { planId } = event.detail;
    let planInput = this.querySelector('input[name="selling_plan"]');

    if (planId) {
      if (!planInput) {
        planInput = document.createElement('input');
        planInput.type = 'hidden';
        planInput.name = 'selling_plan';

        if (this.form) {
          this.form.appendChild(planInput);
        }
      }

      planInput.value = planId;
    } else if (planInput) {
      planInput.remove();
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    if (!this.form) return;

    const submitBtn = this.querySelector('[data-submit-btn]');

    if (submitBtn) {
      submitBtn.setAttribute('disabled', '');
      submitBtn.classList.add('is-loading');
    }

    const formData = new FormData(this.form);

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Add to cart failed');
      }

      const data = await response.json();

      this.dispatchEvent(
        new CustomEvent('cart:item-added', {
          detail: { item: data },
          bubbles: true,
        })
      );

      if (submitBtn) {
        submitBtn.textContent = 'ADDED!';
        setTimeout(() => {
          submitBtn.textContent = submitBtn.getAttribute('data-default-text') || 'ADD TO CART';
          submitBtn.removeAttribute('disabled');
          submitBtn.classList.remove('is-loading');
        }, 2000);
      }
    } catch (error) {
      if (submitBtn) {
        submitBtn.removeAttribute('disabled');
        submitBtn.classList.remove('is-loading');
      }
    }
  }
}

customElements.define('pdp-purchase-form', PdpPurchaseForm);

/**
 * PdpKnowledgePanel — Handles accordion expand/collapse with smooth animation.
 */
class PdpKnowledgePanel extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.headers = this.querySelectorAll('[data-accordion-header]');

    for (const header of this.headers) {
      header.addEventListener('click', this.#handleToggle.bind(this));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    for (const header of this.headers) {
      header.removeEventListener('click', this.#handleToggle.bind(this));
    }
  }

  #handleToggle(event) {
    const header = event.currentTarget;
    const sectionId = header.getAttribute('data-accordion-header');
    const content = this.querySelector(`[data-accordion-content="${sectionId}"]`);
    const icon = header.querySelector('[data-accordion-icon]');

    if (!content) return;

    const isOpen = content.getAttribute('data-open') === 'true';

    if (isOpen) {
      content.style.maxHeight = content.scrollHeight + 'px';
      requestAnimationFrame(() => {
        content.style.maxHeight = '0px';
      });
      content.setAttribute('data-open', 'false');

      if (icon) {
        icon.setAttribute('data-open', 'false');
      }
    } else {
      content.setAttribute('data-open', 'true');
      content.style.maxHeight = content.scrollHeight + 'px';

      content.addEventListener(
        'transitionend',
        () => {
          if (content.getAttribute('data-open') === 'true') {
            content.style.maxHeight = 'none';
          }
        },
        { once: true }
      );

      if (icon) {
        icon.setAttribute('data-open', 'true');
      }
    }
  }
}

customElements.define('pdp-knowledge-panel', PdpKnowledgePanel);

/**
 * PdpAiChat — Manages the AI question input and pill interactions.
 */
class PdpAiChat extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.input = this.querySelector('[data-chat-input]');
    this.pills = this.querySelectorAll('[data-chat-pill]');

    for (const pill of this.pills) {
      pill.addEventListener('click', this.#handlePillClick.bind(this));
    }

    if (this.input) {
      this.input.addEventListener('keydown', this.#handleInputKeydown.bind(this));
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    for (const pill of this.pills) {
      pill.removeEventListener('click', this.#handlePillClick.bind(this));
    }

    if (this.input) {
      this.input.removeEventListener('keydown', this.#handleInputKeydown.bind(this));
    }
  }

  #handlePillClick(event) {
    const pill = event.currentTarget;
    const question = pill.getAttribute('data-chat-pill');

    if (this.input && question) {
      this.input.value = question;
      this.input.focus();
    }
  }

  #handleInputKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const query = this.input.value.trim();

      if (query) {
        this.dispatchEvent(
          new CustomEvent('pdp:chat-query', {
            detail: { query },
            bubbles: true,
          })
        );
      }
    }
  }
}

customElements.define('pdp-ai-chat', PdpAiChat);
