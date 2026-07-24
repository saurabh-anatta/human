/* ==========================================================================
   Our Story — Lifestyle Video Section JS
   Handles reveal animations, video play/pause, and cycling word rotation.
   ========================================================================== */

/**
 * Initialise the Lifestyle Video section.
 * @param {HTMLElement} sectionEl - The sticky child (.story-lifestyle-video)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  var chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  var revealEls = Array.from(sectionEl.querySelectorAll('.story-reveal'));

  /* ---- Reduced motion: reveal all, skip video autoplay, skip cycling ---- */
  if (utils.prefersReducedMotion()) {
    for (var i = 0; i < revealEls.length; i++) {
      revealEls[i].classList.add('is-visible');
    }
    return;
  }

  /* ---- Staggered reveal for text card and benefit rows ---- */
  if (revealEls.length > 0) {
    utils.createRevealObserver(revealEls, { threshold: 0.15, staggerDelay: 150 });
  }

  /* ---- Video play/pause on viewport intersection ---- */
  var videoEl = sectionEl.querySelector('video');
  if (videoEl) {
    var videoObserver = new IntersectionObserver(function (entries) {
      for (var v = 0; v < entries.length; v++) {
        if (entries[v].isIntersecting) {
          videoEl.play().catch(function () {});
        } else {
          videoEl.pause();
        }
      }
    }, { threshold: 0.3 });
    videoObserver.observe(videoEl);
  }

  /* ---- Cycling word rotation ---- */
  var cyclingContainer = sectionEl.querySelector('.story-lifestyle-video__cycling-word');
  if (cyclingContainer) {
    var wordItems = Array.from(cyclingContainer.querySelectorAll('.story-lifestyle-video__cycling-word-item'));
    if (wordItems.length > 1) {
      var currentIndex = 0;

      /* Measure widest word to prevent layout shift */
      var maxWidth = 0;
      for (var w = 0; w < wordItems.length; w++) {
        var wasActive = wordItems[w].classList.contains('is-active');
        wordItems[w].classList.add('is-active');
        var wordWidth = wordItems[w].offsetWidth;
        if (wordWidth > maxWidth) maxWidth = wordWidth;
        if (!wasActive) {
          wordItems[w].classList.remove('is-active');
        }
      }
      cyclingContainer.style.minWidth = maxWidth + 'px';

      setInterval(function () {
        wordItems[currentIndex].classList.remove('is-active');
        currentIndex = (currentIndex + 1) % wordItems.length;
        wordItems[currentIndex].classList.add('is-active');
      }, 3000);
    }
  }
}
