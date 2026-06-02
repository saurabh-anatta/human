import { Component } from '@theme/component';
import { requestIdleCallback } from '@theme/utilities';

const SWIPER_VERSION = '12.1.3';
const SWIPER_BASE_URL = `https://cdn.jsdelivr.net/npm/swiper@${SWIPER_VERSION}`;

export class CarouselComponent extends Component {
  /** @type {any} */
  SwiperClass = null;

  /** @type {any[] | null} */
  SwiperModules = null;

  /** @type {any} */
  swiper = null;

  connectedCallback() {
    super.connectedCallback();

    const settingsEl = this.querySelector('script[type="application/json"]');
    const earlySettings = JSON.parse(settingsEl?.textContent || '{}');
    if (earlySettings.arrows === 'external' && earlySettings.externalRoot) {
      document.getElementById(earlySettings.externalRoot)?.classList.add('is-active');
    }

    requestIdleCallback(async () => {
      await this.loadSwiper();
      this.initSwiper();
    });
  }

  disconnectedCallback() {
    this.swiper?.destroy();
    super.disconnectedCallback();
  }

  async loadSwiper() {
    const windowObject = /** @type {any} */ (window);

    if (windowObject.Swiper && windowObject.SwiperModules) {
      this.SwiperClass = windowObject.Swiper;
      this.SwiperModules = windowObject.SwiperModules;
      return;
    }

    ['swiper', 'navigation', 'pagination', 'a11y'].forEach((name) => this.loadStyle(name));

    try {
      const moduleNames = ['navigation', 'pagination', 'autoplay', 'a11y'];
      const [{ default: Swiper }, ...loadedModules] = await Promise.all([
        // @ts-ignore — dynamic import from CDN
        import(`${SWIPER_BASE_URL}/swiper.min.mjs`),
        // @ts-ignore — dynamic import from CDN
        ...moduleNames.map(
          // @ts-ignore — dynamic import from CDN
          (m) => import(`${SWIPER_BASE_URL}/modules/${m}.min.mjs`)
        ),
      ]);

      windowObject.Swiper = Swiper;
      windowObject.SwiperModules = loadedModules.map((m) => m.default);

      this.SwiperClass = windowObject.Swiper;
      this.SwiperModules = windowObject.SwiperModules;
    } catch (err) {
      console.error('Swiper load failed', err);
    }
  }

  /** @param {string} name */
  loadStyle(name) {
    const id = `swiper-${name}-css`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `${SWIPER_BASE_URL}/${name === 'swiper' ? '' : 'modules/'}${name}.min.css`;
    document.head.appendChild(link);
  }

  initSwiper() {
    const container = /** @type {HTMLElement | null} */ (this.querySelector('.swiper'));
    if (!container || !this.SwiperClass) return;

    this.swiper?.destroy();

    const settingsEl = this.querySelector('script[type="application/json"]');
    /** @type {Record<string, any>} */
    const settings = JSON.parse(settingsEl?.textContent || '{}');

    const arrows = settings.arrows || 'default';
    const externalRoot = settings.externalRoot
      ? document.getElementById(settings.externalRoot)
      : null;

    const mobileSlides = settings.slidesPerViewMobile ?? 1;
    const desktopSlides = settings.slidesPerViewDesktop ?? 4;
    const mobileGap = settings.gapMobile ?? 8;
    const desktopGap = settings.gapDesktop ?? 16;

    this.swiper = new this.SwiperClass(container, {
      modules: this.SwiperModules,
      slidesPerView: mobileSlides,
      spaceBetween: mobileGap,
      breakpoints: {
        750: {
          slidesPerView: Math.min(desktopSlides, mobileSlides + 1),
          spaceBetween: mobileGap,
        },
        1024: {
          slidesPerView: desktopSlides,
          spaceBetween: desktopGap,
        },
      },
      autoplay: settings.autoplay
        ? {
            delay: (settings.autoplayDelay ?? 5) * 1000,
            disableOnInteraction: false,
          }
        : false,
      pagination: settings.pagination
        ? { el: this.querySelector('.swiper-pagination'), clickable: true }
        : false,
      navigation:
        arrows === 'none'
          ? false
          : {
              nextEl:
                arrows === 'external' && externalRoot
                  ? externalRoot.querySelector('[data-carousel-arrow="next"]')
                  : this.querySelector('.swiper-button-next'),
              prevEl:
                arrows === 'external' && externalRoot
                  ? externalRoot.querySelector('[data-carousel-arrow="prev"]')
                  : this.querySelector('.swiper-button-prev'),
            },
    });
  }
}

if (!customElements.get('carousel-component')) {
  customElements.define('carousel-component', CarouselComponent);
}
