/**
 * Toggles the inline (collapsible) filter panel on the desktop PLP.
 *
 * The open state lives on <body> as a class so it survives section
 * re-renders — facet updates morph the entire section HTML, which would
 * reset any state stored on elements inside it.
 */
const OPEN_CLASS = 'filters-panel-open';

class FacetsInlineToggle extends HTMLElement {
  connectedCallback() {
    this.addEventListener('click', this.#handleClick);
    this.#syncAria();
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.#handleClick);
  }

  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('button')) return;

    document.body.classList.toggle(OPEN_CLASS);
    this.#syncAria();
  };

  #syncAria() {
    const expanded = document.body.classList.contains(OPEN_CLASS) ? 'true' : 'false';
    this.querySelector('button')?.setAttribute('aria-expanded', expanded);
  }
}

if (!customElements.get('facets-inline-toggle')) {
  customElements.define('facets-inline-toggle', FacetsInlineToggle);
}
