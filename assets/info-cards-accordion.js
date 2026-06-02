// @ts-nocheck
const TRANSITION_DURATION = 400;

class InfoCardsAccordion extends HTMLElement {
  #mq = window.matchMedia('(min-width: 750px)');
  #reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  #controller = new AbortController();

  connectedCallback() {
    const { signal } = this.#controller;
    this.#wrapPanels();
    this.#setupA11y();
    this.#initState();
    this.addEventListener('click', this.#onTriggerClick, { signal });
    this.#mq.addEventListener('change', this.#onMediaChange, { signal });
  }

  disconnectedCallback() {
    this.#controller.abort();
    this.#controller = new AbortController();
  }

  #setupA11y() {
    const uid = this.id;
    this.#triggers().forEach((trigger, i) => {
      const card = trigger.closest('[data-info-card]');
      const panel = card ? card.querySelector('[data-info-panel]') : null;
      if (!panel) return;
      trigger.id = trigger.id || `${uid}-trigger-${i}`;
      panel.id = panel.id || `${uid}-panel-${i}`;
      trigger.setAttribute('aria-controls', panel.id);
      panel.setAttribute('aria-labelledby', trigger.id);
    });
  }

  #initState() {
    if (this.#mq.matches) {
      this.#openAll();
      return;
    }

    this.#triggers().forEach((t) => t.removeAttribute('tabindex'));

    const triggers = this.#triggers();
    let defaultTrigger = null;
    for (const trigger of triggers) {
      const card = trigger.closest('[data-info-card]');
      if (card && card.getAttribute('data-open-by-default') === 'true') {
        defaultTrigger = trigger;
        break;
      }
    }
    if (!defaultTrigger && triggers.length > 0) defaultTrigger = triggers[0];

    for (const trigger of triggers) {
      const panel = this.#panelFor(trigger);
      if (trigger === defaultTrigger) {
        this.#openPanel(trigger, panel);
      } else {
        this.#closePanel(trigger, panel);
      }
    }
  }

  #wrapPanels() {
    for (const trigger of this.#triggers()) {
      const card = trigger.closest('[data-info-card]');
      if (!card || card.querySelector('[data-info-panel]')) continue;
      const panel = document.createElement('div');
      panel.className = 'info-card-content';
      panel.setAttribute('data-info-panel', '');
      panel.setAttribute('role', 'region');
      panel.setAttribute('hidden', '');
      const inner = document.createElement('div');
      inner.className = 'info-card-content__inner';
      for (const child of Array.from(card.children)) {
        if (child !== trigger) inner.appendChild(child);
      }
      panel.appendChild(inner);
      card.appendChild(panel);
    }
  }

  #triggers() {
    return Array.from(this.querySelectorAll('[data-info-trigger]'));
  }

  #panelFor(trigger) {
    const card = trigger.closest('[data-info-card]');
    return card ? card.querySelector('[data-info-panel]') : null;
  }

  #openPanel(trigger, panel) {
    trigger.setAttribute('aria-expanded', 'true');
    if (!panel) return;
    panel.removeAttribute('hidden');
    if (this.#reducedMotion.matches) {
      panel.setAttribute('data-open', '');
    } else {
      requestAnimationFrame(() => panel.setAttribute('data-open', ''));
    }
  }

  #closePanel(trigger, panel) {
    trigger.setAttribute('aria-expanded', 'false');
    if (!panel) return;

    if (!panel.hasAttribute('data-open')) {
      panel.setAttribute('hidden', '');
      return;
    }

    panel.removeAttribute('data-open');

    if (this.#reducedMotion.matches) {
      panel.setAttribute('hidden', '');
      return;
    }

    const timeout = setTimeout(() => {
      panel.removeEventListener('transitionend', onEnd);
      panel.setAttribute('hidden', '');
    }, TRANSITION_DURATION);

    function onEnd(e) {
      if (e.propertyName !== 'grid-template-rows') return;
      clearTimeout(timeout);
      panel.removeEventListener('transitionend', onEnd);
      panel.setAttribute('hidden', '');
    }
    panel.addEventListener('transitionend', onEnd);
  }

  #onTriggerClick = (event) => {
    const trigger = event.target.closest('[data-info-trigger]');
    if (!trigger || !this.contains(trigger)) return;
    if (this.#mq.matches) return;

    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    const panel = this.#panelFor(trigger);

    for (const t of this.#triggers()) {
      this.#closePanel(t, this.#panelFor(t));
    }

    if (!isExpanded) {
      this.#openPanel(trigger, panel);

      if (panel && !this.#reducedMotion.matches) {
        const scrollTimeout = setTimeout(() => {
          panel.removeEventListener('transitionend', onScrollEnd);
        }, TRANSITION_DURATION);

        function onScrollEnd(e) {
          if (e.propertyName !== 'grid-template-rows') return;
          clearTimeout(scrollTimeout);
          panel.removeEventListener('transitionend', onScrollEnd);
          if (trigger.getBoundingClientRect().top < 0) {
            trigger.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        panel.addEventListener('transitionend', onScrollEnd);
      }
    }
  };

  #openAll() {
    for (const t of this.#triggers()) {
      const card = t.closest('[data-info-card]');
      const panel = card ? card.querySelector('[data-info-panel]') : null;
      t.setAttribute('aria-expanded', 'true');
      t.setAttribute('tabindex', '-1');
      if (panel) {
        panel.removeAttribute('hidden');
        panel.setAttribute('data-open', '');
      }
    }
  }

  #onMediaChange = (event) => {
    if (event.matches) {
      this.#openAll();
    } else {
      this.#initState();
    }
  };
}

if (!customElements.get('info-cards-accordion')) {
  customElements.define('info-cards-accordion', InfoCardsAccordion);
}
