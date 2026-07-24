/* ==========================================================================
   Our Story — Athletes & Branching Lines Section JS
   Scroll-driven: red-line draw, SVG branch stroke animation, text reveals,
   and reel video autoplay via IntersectionObserver.
   ========================================================================== */

/**
 * Initialise the athletes & branching lines section.
 * @param {HTMLElement} sectionEl - The sticky child (.story-athletes-branching-lines)
 * @param {Object} utils - Shared story-utils module
 */
export function init(sectionEl, utils) {
  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  const redline = sectionEl.querySelector('[data-redline]');
  const centerContinuation = sectionEl.querySelector('[data-center-continuation]');
  const strands = Array.from(sectionEl.querySelectorAll('[data-strand]'));
  const branchesSvg = sectionEl.querySelector('.story-athletes-branching-lines__branches');
  const revealEls = Array.from(sectionEl.querySelectorAll('.story-reveal'));
  const videos = Array.from(sectionEl.querySelectorAll('[data-reel-video]'));

  /* ---- Compute stroke lengths for SVG animation ---- */
  var centerLen = 0;
  if (centerContinuation) {
    centerLen = centerContinuation.getTotalLength();
    centerContinuation.setAttribute('stroke-dasharray', centerLen);
    centerContinuation.setAttribute('stroke-dashoffset', centerLen);
  }

  var strandLengths = [];
  for (var i = 0; i < strands.length; i++) {
    var len = strands[i].getTotalLength();
    strands[i].setAttribute('stroke-dasharray', len);
    strands[i].setAttribute('stroke-dashoffset', len);
    strandLengths.push(len);
  }

  /* ---- Reduced motion: settle everything immediately ---- */
  if (utils.prefersReducedMotion()) {
    if (redline) redline.style.transform = 'scaleY(1)';
    if (centerContinuation) centerContinuation.setAttribute('stroke-dashoffset', '0');
    for (var j = 0; j < strands.length; j++) {
      strands[j].setAttribute('stroke-dashoffset', '0');
    }
    for (var k = 0; k < revealEls.length; k++) {
      revealEls[k].classList.add('is-visible');
    }
    return;
  }

  /* ---- Text reveals ---- */
  utils.createRevealObserver(revealEls, { threshold: 0.15, staggerDelay: 200 });

  /* ---- Stagger offsets per strand (inner draws before outer) ----
     Strand data-strand-index: 0=left-outer, 1=left-mid, 2=left-inner,
     3=center, 4=right-inner, 5=right-mid, 6=right-outer */
  var strandStagger = [];
  for (var s = 0; s < strands.length; s++) {
    var idx = parseInt(strands[s].getAttribute('data-strand-index') || s, 10);
    var distFromCenter = Math.abs(idx - 3);
    strandStagger.push(distFromCenter * 0.03);
  }

  /* ---- Scroll-driven animation tick ---- */
  function tick() {
    var progress = utils.getScrollProgress(chapterEl);

    /* Red line: progress [0 → 0.25] → scaleY [0 → 1] */
    if (redline) {
      var lineProgress = Math.min(1, Math.max(0, progress / 0.25));
      redline.style.transform = 'scaleY(' + lineProgress + ')';
    }

    /* Center continuation: progress [0.2 → 0.35] → dashoffset [len → 0] */
    if (centerContinuation && centerLen > 0) {
      var contProgress = Math.min(1, Math.max(0, (progress - 0.2) / 0.15));
      centerContinuation.setAttribute('stroke-dashoffset', centerLen * (1 - contProgress));
    }

    /* Strands: progress [0.3 → 0.7] with stagger → dashoffset [len → 0] */
    for (var i = 0; i < strands.length; i++) {
      var stagger = strandStagger[i] || 0;
      var startP = 0.3 + stagger;
      var endP = 0.7 + stagger;
      var range = endP - startP;
      var drawProgress = range > 0 ? Math.min(1, Math.max(0, (progress - startP) / range)) : 0;
      strands[i].setAttribute('stroke-dashoffset', strandLengths[i] * (1 - drawProgress));
    }

    /* Branch tail fade: progress [0.65 → 0.85] → opacity [1 → 0.2] */
    if (branchesSvg) {
      var fadeProgress = Math.min(1, Math.max(0, (progress - 0.65) / 0.2));
      var opacity = 1 - (fadeProgress * 0.8);
      branchesSvg.style.opacity = opacity;
    }
  }

  utils.registerRafCallback(tick);

  /* ---- Video autoplay — separate IntersectionObserver per video ---- */
  for (var v = 0; v < videos.length; v++) {
    (function (video) {
      var observer = new IntersectionObserver(
        function (entries) {
          for (var e = 0; e < entries.length; e++) {
            if (entries[e].isIntersecting) {
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
    })(videos[v]);
  }
}
