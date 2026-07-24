/* ==========================================================================
   Our Story — Product Reveal Section JS
   Parallax product image + shadow scale/opacity + headline reveal.
   ========================================================================== */

/**
 * Initialise the product-reveal section animations.
 * @param {HTMLElement} sectionEl - The sticky child (.story-product-reveal)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  if (utils.prefersReducedMotion()) return;

  var chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  /* --- Headline reveal --- */
  var headline = sectionEl.querySelector('.story-product-reveal__headline');
  if (headline) {
    utils.createRevealObserver([headline], { threshold: 0.3 });
  }

  /* --- Product parallax + shadow --- */
  var productImg = sectionEl.querySelector('.story-product-reveal__product-img');
  var shadow = sectionEl.querySelector('.story-product-reveal__shadow');

  if (!productImg) return;

  var pinDist = chapterEl.offsetHeight - window.innerHeight;
  if (pinDist <= 0) pinDist = 3000;

  var scaleKf = [[0, 1], [pinDist, 0.8]];
  var opacityKf = [[0, 1], [pinDist, 0.5]];

  function tick() {
    var scrollPx = utils.getScrollPx(chapterEl);
    var offsetY = -(scrollPx * 0.15);

    productImg.style.transform = 'translateY(' + offsetY + 'px)';

    if (shadow) {
      var s = utils.kfVal(scaleKf, scrollPx);
      var o = utils.kfVal(opacityKf, scrollPx);
      shadow.style.transform = 'translateX(-50%) scaleX(' + s + ') scaleY(' + s + ')';
      shadow.style.opacity = o;
    }
  }

  utils.registerRafCallback(tick);
}
