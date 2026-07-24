/**
 * Our Story — Timeline Chapter
 * Scroll-animated vertical timeline with milestone reveals and video autoplay.
 *
 * @module story-timeline
 */

/**
 * Initialise the timeline chapter scroll animation and video autoplay.
 * @param {HTMLElement} sectionEl - The sticky child (.story-timeline) bearing data-section-id
 * @param {Object} utils - The story-utils module (getScrollProgress, registerRafCallback, etc.)
 */
export function init(sectionEl, utils) {
  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  const line = sectionEl.querySelector('.story-timeline__line');
  const milestones = Array.from(sectionEl.querySelectorAll('.story-timeline__milestone'));
  const dots = Array.from(sectionEl.querySelectorAll('.story-timeline__dot'));
  const track = sectionEl.querySelector('.story-timeline__track');
  const videos = Array.from(sectionEl.querySelectorAll('.story-timeline__video'));

  if (!line || milestones.length === 0) return;

  /* ---- Reduced motion: show everything settled, skip animations ---- */
  if (utils.prefersReducedMotion()) {
    line.style.clipPath = 'none';
    for (const milestone of milestones) {
      milestone.classList.add('is-visible');
    }
    for (const dot of dots) {
      dot.classList.add('is-visible');
    }
    return;
  }

  /* ---- Dot Y-position fractions (relative to the track height) ---- */
  let dotFractions = [];

  function computeDotPositions() {
    if (!track) return;
    const trackRect = track.getBoundingClientRect();
    const trackHeight = trackRect.height;
    if (trackHeight <= 0) return;

    dotFractions = [];
    for (const dot of dots) {
      const dotRect = dot.getBoundingClientRect();
      const dotCenter = dotRect.top + dotRect.height / 2 - trackRect.top;
      dotFractions.push(Math.max(0, Math.min(1, dotCenter / trackHeight)));
    }
  }

  computeDotPositions();

  /* Recalculate on resize (debounced) */
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(computeDotPositions, 200);
  }
  window.addEventListener('resize', onResize);

  /* ---- Scroll-driven animation tick ---- */
  function tick() {
    const progress = utils.getScrollProgress(chapterEl);

    /* Map scroll progress [0 → 0.85] to line draw [0% → 100%] */
    const lineProgress = Math.min(1, progress / 0.85);
    const clipBottom = 100 - lineProgress * 100;
    line.style.clipPath = 'inset(0 0 ' + clipBottom + '% 0)';

    /* Reveal milestones when the drawn line reaches their dot */
    for (let i = 0; i < dots.length; i++) {
      const fraction = dotFractions[i];
      if (fraction === undefined) continue;

      if (lineProgress >= fraction) {
        dots[i].classList.add('is-visible');
        milestones[i].classList.add('is-visible');
      } else {
        dots[i].classList.remove('is-visible');
        milestones[i].classList.remove('is-visible');
      }
    }
  }

  utils.registerRafCallback(tick);

  /* ---- Video autoplay — separate IntersectionObserver per video ---- */
  for (const video of videos) {
    const observer = new IntersectionObserver(
      function (entries) {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.play().catch(function () {
              /* Autoplay blocked by browser policy — poster stays visible */
            });
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(video);
  }
}
