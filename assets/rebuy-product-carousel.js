import { Component } from '@theme/component';
import { requestIdleCallback } from '@theme/utilities';

const SWIPER_VERSION = '12.1.3';
const SWIPER_BASE_URL = `https://cdn.jsdelivr.net/npm/swiper@${SWIPER_VERSION}`;

/**
 * @typedef {object} Refs
 * @property {HTMLElement} swiperContainer
 * @property {HTMLElement} swiperWrapper
 * @property {HTMLElement} [pagination]
 * @property {HTMLButtonElement} [navPrev]
 * @property {HTMLButtonElement} [navNext]
 */

/**
 * @typedef {object} ProductItem
 * @property {string | number} id
 * @property {string} handle
 * @property {string} title
 * @property {string} url
 * @property {string[]} images
 * @property {number} priceCents
 * @property {string} badge
 * @property {string} badgeColor
 * @property {string} miniDescription
 */

/**
 * Fetches products from a Rebuy Data Source, optionally enriches them with
 * Shopify Storefront API metafields (badge, short description), then renders
 * them in a Swiper carousel. Cards support image hover-swap and 1.1x scale.
 *
 * Config is read from an inline `<script type="application/json">` child.
 *
 * @extends {Component<Refs>}
 */
export class RebuyProductCarousel extends Component {
  /** @type {Record<string, any>} */
  #cfg = {};

  /** @type {any} */
  #swiper = null;

  connectedCallback() {
    super.connectedCallback();

    const settingsEl = this.querySelector('script[type="application/json"]');
    this.#cfg = JSON.parse(settingsEl?.textContent || '{}');

    requestIdleCallback(async () => {
      await this.#loadSwiper();
      const products = await this.#fetchRebuyProducts();
      if (products.length) this.#renderSlides(products);
      this.#initSwiper();
      this.#initReviewObserver();
    });
  }

  disconnectedCallback() {
    this.#swiper?.destroy();
    super.disconnectedCallback();
  }

  // ---------------------------------------------------------------------------
  // Rebuy fetch + Storefront enrichment
  // ---------------------------------------------------------------------------

  async #fetchRebuyProducts() {
    const { rulesetId, apiKey, maxItems = 8 } = this.#cfg;
    if (!rulesetId || !apiKey) return [];

    try {
      const url =
        `https://rebuyengine.com/api/v1/custom/id/${encodeURIComponent(rulesetId)}` +
        `?key=${encodeURIComponent(apiKey)}&limit=${maxItems}`;

      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error(`Rebuy API ${res.status}`);

      const data = await res.json();
      const raw = Array.isArray(data)
        ? data
        : Array.isArray(data.products)
          ? data.products
          : Array.isArray(data.data)
            ? data.data
            : [];

      let products = raw.slice(0, maxItems).map((item) => this.#normalizeProduct(item));

      // Enrich with Shopify metafields when a storefront token is provided
      const { storefrontToken, showBadges, showDescription } = this.#cfg;
      if (storefrontToken && (showBadges || showDescription)) {
        const handles = products.map((p) => p.handle).filter(Boolean);
        if (handles.length) {
          const metaMap = await this.#fetchStorefrontMetafields(handles);
          products = products.map((p) => ({
            ...p,
            badge: metaMap[p.handle]?.badge ?? '',
            badgeColor: metaMap[p.handle]?.badgeColor ?? '',
            miniDescription: metaMap[p.handle]?.miniDescription ?? '',
          }));
        }
      }

      return products;
    } catch (err) {
      console.warn('[RebuyProductCarousel] Fetch failed', err);
      return [];
    }
  }

  /** @param {Record<string, any>} item @returns {ProductItem} */
  #normalizeProduct(item) {
    const handle = item.handle || '';
    const url = handle ? `/products/${handle}` : '#';

    /** @type {string[]} */
    const images = [];
    if (Array.isArray(item.images)) {
      for (const img of item.images) {
        if (!img) continue;
        if (typeof img === 'string') images.push(img);
        else if (img.src) images.push(img.src);
        else if (img.preview_image?.src) images.push(img.preview_image.src);
      }
    } else if (item.image) {
      images.push(typeof item.image === 'string' ? item.image : item.image.src);
    }

    let priceCents = 0;
    if (Array.isArray(item.variants) && item.variants.length) {
      const prices = item.variants
        .map((v) => Math.round(parseFloat(String(v?.price ?? 0).replace(/[^0-9.]/g, '')) * 100))
        .filter((n) => n > 0);
      priceCents = prices.length ? Math.min(...prices) : 0;
    }
    if (!priceCents) {
      const raw = item.min_price ?? item.price ?? 0;
      priceCents = Math.round(parseFloat(String(raw).replace(/[^0-9.]/g, '')) * 100);
    }

    return {
      id: item.id,
      handle,
      title: item.title || '',
      url,
      images,
      priceCents,
      badge: '',
      badgeColor: '',
      miniDescription: '',
    };
  }

  /**
   * Fetches badge and short-description metafields from Shopify Storefront API.
   * @param {string[]} handles
   * @returns {Promise<Record<string, { badge: string; badgeColor: string; miniDescription: string }>>}
   */
  async #fetchStorefrontMetafields(handles) {
    const token = this.#cfg.storefrontToken;
    if (!token || !window.Shopify?.shop) return {};

    const query = `
      query ($query: String!) {
        products(first: ${handles.length}, query: $query) {
          edges {
            node {
              handle
              badge:            metafield(namespace: "custom", key: "product_card_badge")                    { value }
              badgeColor:       metafield(namespace: "custom", key: "product_card_badge_type")               { value }
              miniDescription:  metafield(namespace: "custom", key: "rebuy_mini_cart_product_description")  { value }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch(`https://${window.Shopify.shop}/api/2026-04/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': token,
        },
        body: JSON.stringify({
          query,
          variables: {
            query: handles.map((h) => `handle:${h}`).join(' OR '),
          },
        }),
      });

      const json = await res.json();
      if (json.errors) {
        throw new Error(`Shopify Storefront API Error: ${JSON.stringify(json.errors)}`);
      }

      /** @type {Record<string, any>} */
      const map = {};
      json.data.products.edges.forEach(({ node }) => {
        map[node.handle] = {
          badge: node.badge?.value || '',
          badgeColor: node.badgeColor?.value || '',
          miniDescription: node.miniDescription?.value || '',
        };
      });
      return map;
    } catch (err) {
      console.error('Error fetching Shopify metafields:', err);
      return {};
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  /** @param {ProductItem[]} products */
  #renderSlides(products) {
    if (!this.refs.swiperWrapper) return;
    this.refs.swiperWrapper.innerHTML = products.map((p) => this.#buildSlideHTML(p)).join('');
  }

  /** @param {ProductItem} product */
  #buildSlideHTML(product) {
    const {
      showReviews,
      minReviews = 10,
      showBadges,
      showDescription,
      showPrice,
      appearance,
    } = this.#cfg;

    const img1 = this.#imageUrl(product.images[0]);
    const img2 = this.#imageUrl(product.images[1]);

    return `
      <div class="swiper-slide rpc-slide" role="listitem">
        <div class="rpc-card ${appearance === 'white' ? 'rpc-card--white' : ''}">
          <a href="${product.url}" class="rpc-card__link" aria-label="${this.#escape(product.title)}">

            <div class="rpc-card__image">
              ${img1 ? `<img class="rpc-card__img rpc-card__img--primary" src="${img1}" alt="" loading="lazy" decoding="async">` : ''}
              ${img2 ? `<img class="rpc-card__img rpc-card__img--hover"   src="${img2}" alt="" loading="lazy" decoding="async">` : ''}
            </div>

            <div class="rpc-card__body">
              <h3 class="rpc-card__title">${this.#escape(product.title)}</h3>

              ${showReviews ? this.#buildReviewHTML(product, minReviews) : ''}

              ${showBadges && product.badge ? this.#buildBadgeHTML(product.badge, product.badgeColor) : ''}

              ${showDescription && product.miniDescription ? `<p class="rpc-card__mini-desc">${this.#escape(product.miniDescription)}</p>` : ''}

              ${showPrice ? `<p class="rpc-card__price">${this.#formatMoney(product.priceCents)}</p>` : ''}

              <span class="rpc-card__cta">SHOP NOW</span>
            </div>

          </a>
        </div>
      </div>
    `;
  }

  /**
   * Renders a Bazaarvoice inline-rating gate div.
   * BV populates it asynchronously; #initReviewObserver handles visibility.
   * @param {ProductItem} product
   * @param {number} minReviews
   */
  #buildReviewHTML(product, minReviews) {
    return `
      <div
        class="rpc-card__rating"
        data-bv-show="inline_rating"
        data-bv-product-id="${product.id}"
        data-threshold="${minReviews}"
        id="rpc-reviews-${product.id}"
      ></div>
    `;
  }

  /**
   * @param {string} text
   * @param {string} type - badge type value from metafield (e.g. "primary", "secondary")
   */
  #buildBadgeHTML(text, type) {
    const modifier = type ? ` rpc-card__badge--${this.#escape(type)}` : '';
    return `<div class="rpc-card__badge${modifier}">${this.#escape(text)}</div>`;
  }

  // ---------------------------------------------------------------------------
  // Bazaarvoice review observer
  // ---------------------------------------------------------------------------

  /**
   * Watches for BV injecting rating content into gate divs and toggles
   * visibility based on the minimum-reviews threshold.
   */
  #initReviewObserver() {
    if (!this.#cfg.showReviews || !('MutationObserver' in window)) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!mutation.addedNodes.length) continue;

        const gate = /** @type {Element | null} */ (
          mutation.target instanceof Element
            ? mutation.target.closest('[data-bv-show="inline_rating"]')
            : null
        );
        if (!gate) continue;

        const text = gate.textContent || '';
        const match = text.match(/\(([\d,]+)\)/) || text.match(/([\d,]+)\s*reviews?/i);
        if (!match) continue;

        const count = parseInt(match[1].replace(/,/g, ''), 10);
        const threshold = parseInt(gate.getAttribute('data-threshold') || '0', 10);

        if (count >= threshold) {
          /** @type {HTMLElement} */ (gate).style.opacity = '1';
        } else {
          /** @type {HTMLElement} */ (gate).style.display = 'none';
        }
      }
    });

    observer.observe(this, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------------
  // Swiper
  // ---------------------------------------------------------------------------

  async #loadSwiper() {
    // @ts-ignore — Swiper and SwiperModules are set dynamically on window
    if (window.Swiper && window.SwiperModules) return;

    for (const name of ['swiper', 'navigation', 'pagination', 'a11y']) {
      const id = `swiper-${name}-css`;
      if (document.getElementById(id)) continue;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `${SWIPER_BASE_URL}/${name === 'swiper' ? '' : 'modules/'}${name}.min.css`;
      document.head.appendChild(link);
    }

    try {
      const moduleNames = ['navigation', 'pagination', 'autoplay', 'a11y'];
      const [{ default: Swiper }, ...modules] = await Promise.all([
        import(`${SWIPER_BASE_URL}/swiper.min.mjs`),
        ...moduleNames.map((m) => import(`${SWIPER_BASE_URL}/modules/${m}.min.mjs`)),
      ]);
      // @ts-ignore
      window.Swiper = Swiper;
      // @ts-ignore
      window.SwiperModules = modules.map((m) => m.default);
    } catch (err) {
      console.error('[RebuyProductCarousel] Swiper load failed', err);
    }
  }

  #initSwiper() {
    // @ts-ignore — Swiper is set dynamically on window by #loadSwiper
    if (!this.refs.swiperContainer || !window.Swiper) return;

    const {
      slidesPerViewMobile = 1.275,
      slidesPerViewDesktop = 3.288,
      gapMobile = 16,
      gapDesktop = 16,
      autoplay = false,
      autoplayDelay = 5,
      pagination = false,
      showNav = false,
    } = this.#cfg;

    // @ts-ignore
    this.#swiper = new window.Swiper(this.refs.swiperContainer, {
      // @ts-ignore
      modules: window.SwiperModules,
      slidesPerView: slidesPerViewMobile,
      spaceBetween: gapMobile,
      breakpoints: {
        750: { slidesPerView: slidesPerViewMobile + 1, spaceBetween: gapMobile },
        1024: { slidesPerView: slidesPerViewDesktop, spaceBetween: gapDesktop },
      },
      autoplay: autoplay ? { delay: autoplayDelay * 1000, disableOnInteraction: false } : false,
      pagination:
        pagination && this.refs.pagination ? { el: this.refs.pagination, clickable: true } : false,
      navigation: showNav
        ? {
            nextEl: this.refs.navNext ?? null,
            prevEl: this.refs.navPrev ?? null,
          }
        : false,
    });
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /** @param {string} [src] */
  #imageUrl(src) {
    if (!src) return '';
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}width=600&height=600&format=webp`;
  }

  /** @param {number} cents */
  #formatMoney(cents) {
    try {
      // @ts-ignore — formatMoney and money_format are Shopify theme globals
      if (window.Shopify?.formatMoney) {
        // @ts-ignore
        return window.Shopify.formatMoney(
          cents,
          // @ts-ignore
          window.Shopify.money_format || '${{amount}}'
        );
      }
    } catch {}
    return (cents / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD',
    });
  }

  /** @param {string} str */
  #escape(str) {
    return String(str || '').replace(
      /[&<>"']/g,
      (m) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        })[m] ?? m
    );
  }
}

if (!customElements.get('rebuy-product-carousel')) {
  customElements.define('rebuy-product-carousel', RebuyProductCarousel);
}
