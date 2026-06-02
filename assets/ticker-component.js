import { Component } from '@theme/component';
import { debounce, requestIdleCallback } from '@theme/utilities';

const SWIPER_VERSION = '12.1.3';
const SWIPER_BASE_URL = `https://cdn.jsdelivr.net/npm/swiper@${SWIPER_VERSION}`;
const DESKTOP_BREAKPOINT = '(min-width: 750px)';

const SPEED_MIN_MS = 2000;
const SPEED_MAX_MS = 12000;

export class TickerComponent extends Component {
  /** @type {any} */
  SwiperClass = null;

  /** @type {any[] | null} */
  SwiperModules = null;

  /** @type {any} */
  swiper = null;

  /** @type {(((() => void) & { cancel(): void }) | null)} */
  #onResize = null;

  #wasDesktop = false;

  connectedCallback() {
    super.connectedCallback();

    requestIdleCallback(async () => {
      await this.#loadSwiper();
      this.#wasDesktop = window.matchMedia(DESKTOP_BREAKPOINT).matches;
      this.#initSwiper();

      this.#onResize = debounce(() => this.#handleResize(), 200);
      window.addEventListener('resize', this.#onResize);
    });
  }

  disconnectedCallback() {
    if (this.#onResize) {
      window.removeEventListener('resize', this.#onResize);
      this.#onResize.cancel();
    }
    this.swiper?.destroy();
    super.disconnectedCallback();
  }

  #handleResize() {
    const isDesktop = window.matchMedia(DESKTOP_BREAKPOINT).matches;
    if (isDesktop !== this.#wasDesktop) {
      this.#wasDesktop = isDesktop;
      this.#initSwiper();
    } else {
      this.swiper?.update();
    }
  }

  async #loadSwiper() {
    const w = /** @type {any} */ (window);
    w.SwiperModuleCache = w.SwiperModuleCache || {};

    this.#loadStyle('swiper');

    try {
      const swiperPromise = w.Swiper
        ? Promise.resolve({ default: w.Swiper })
        : // @ts-ignore — dynamic CDN import
          import(`${SWIPER_BASE_URL}/swiper.min.mjs`);

      const autoplayPromise = w.SwiperModuleCache.autoplay
        ? Promise.resolve({ default: w.SwiperModuleCache.autoplay })
        : // @ts-ignore — dynamic CDN import
          import(`${SWIPER_BASE_URL}/modules/autoplay.min.mjs`);

      const [{ default: Swiper }, { default: Autoplay }] = await Promise.all([
        swiperPromise,
        autoplayPromise,
      ]);

      w.Swiper = Swiper;
      w.SwiperModuleCache.autoplay = Autoplay;
      this.SwiperClass = Swiper;
      this.SwiperModules = [Autoplay];
    } catch (err) {
      console.error('Ticker: Swiper load failed', err);
    }
  }

  /** @param {string} name */
  #loadStyle(name) {
    const id = `swiper-${name}-css`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `${SWIPER_BASE_URL}/${name === 'swiper' ? '' : 'modules/'}${name}.min.css`;
    document.head.appendChild(link);
  }

  #initSwiper() {
    const container = /** @type {HTMLElement | null} */ (this.querySelector('.swiper'));
    if (!container || !this.SwiperClass) return;

    this.swiper?.destroy();

    /** @type {{ speed?: number, gapMobile?: number, gapDesktop?: number, reverse?: boolean, enableMotionDesktop?: boolean }} */
    const settings = JSON.parse(this.getAttribute('data-settings') || '{}');

    const speedSetting = Math.min(Math.max(settings.speed ?? 5, 1), 10);
    const speedMs = SPEED_MAX_MS - ((speedSetting - 1) / 9) * (SPEED_MAX_MS - SPEED_MIN_MS);
    const isDesktop = window.matchMedia(DESKTOP_BREAKPOINT).matches;
    const isReverse = settings.reverse === true;
    const enableMotion = isDesktop ? settings.enableMotionDesktop !== false : true;
    const gapMobile = settings.gapMobile ?? 32;
    const gapDesktop = settings.gapDesktop ?? 32;

    this.swiper = new this.SwiperClass(container, {
      modules: this.SwiperModules,
      slidesPerView: 'auto',
      spaceBetween: gapMobile,
      breakpoints: {
        750: { spaceBetween: gapDesktop },
      },
      loop: enableMotion,
      loopAdditionalSlides: 8,
      loopAddBlankSlides: true,
      speed: speedMs,
      allowTouchMove: false,
      autoplay: enableMotion
        ? {
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
            reverseDirection: isReverse,
          }
        : false,
    });
  }
}

if (!customElements.get('ticker-component')) {
  customElements.define('ticker-component', TickerComponent);
}
