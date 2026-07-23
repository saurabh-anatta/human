/* ==========================================================================
   Our Story — Blood Vessels Chapter (Scroll-scrubbed video / Canvas 2D fallback)
   Exports init(sectionEl, utils) per the story-section pattern.
   ========================================================================== */

/**
 * Initialise the Blood Vessels chapter with scroll-driven cinematic animation.
 * Video mode: scrubs <video> currentTime proportionally to scroll progress.
 * Canvas mode: 2D particle system simulating heart → blood cell dispersal.
 *
 * @param {HTMLElement} sectionEl - The element with data-section-id
 * @param {Object} utils - The story-utils module
 */
export function init(sectionEl, utils) {
  /* --- Reduced motion: skip all animation, CSS handles static layout --- */
  if (utils.prefersReducedMotion()) {
    sectionEl.classList.add('is-reduced-motion');
    return;
  }

  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  /* --- Cache DOM refs --- */
  const heartGlow = sectionEl.querySelector('.story-blood-vessels__heart-glow');
  const videoEl = sectionEl.querySelector('.story-blood-vessels__video');
  const canvasEl = sectionEl.querySelector('.story-blood-vessels__canvas');
  const headline = sectionEl.querySelector('.story-blood-vessels__headline');
  const exitCopy = sectionEl.querySelector('.story-blood-vessels__exit-copy');
  const scrollHint = sectionEl.querySelector('.story-blood-vessels__scroll-hint');

  /* --- Determine mode: video vs canvas fallback --- */
  const hasVideo = videoEl && videoEl.getAttribute('src');
  const useCanvas = !hasVideo && canvasEl;

  /* --- Keyframe tables (tuned to pin_distance ~5000px) ---
   * Phase 1 (0–600):   heart-glow pulse visible → fade out
   * Phase 2 (400–1200): video/canvas fade in
   * Phase 2b(800–2000): headline fade in, hold
   * Phase 3 (2000–2800): headline fade out, scrub forward
   * Phase 4 (2800–3800): peak density, continue scrub
   * Phase 5 (3800–4200): dispersal, continue scrub
   * Phase 6 (4200–5000): exit copy fade in
   */
  const KF_HEART_GLOW = [[0, 1], [400, 1], [600, 0]];
  const KF_SCROLL_HINT = [[0, 1], [100, 1], [300, 0]];
  const KF_MEDIA_OP = [[400, 0], [800, 0.5], [1200, 1]];
  const KF_HEADLINE_IN = [[800, 0], [1400, 1], [2000, 1]];
  const KF_HEADLINE_OUT = [[2000, 1], [2800, 0]];
  const KF_VIDEO_PROGRESS = [[400, 0], [4200, 1]];
  const KF_EXIT_COPY = [[4200, 0], [4800, 1]];

  /* --- Video setup --- */
  let videoReady = false;

  if (hasVideo) {
    const onLoaded = function () {
      videoReady = true;
      videoEl.removeEventListener('loadedmetadata', onLoaded);
    };
    videoEl.addEventListener('loadedmetadata', onLoaded);

    /* If metadata is already cached from a previous visit */
    if (videoEl.readyState >= 1) {
      videoReady = true;
    } else {
      /* Switch from preload="none" to auto so the browser starts fetching */
      videoEl.preload = 'auto';
      videoEl.load();
    }
  }

  /* --- Canvas 2D fallback setup --- */
  let ctx = null;
  const particles = [];
  let spriteImg = null;
  const isMobile = window.innerWidth <= 749;
  const PARTICLE_COUNT = isMobile ? 120 : 200;

  /* Canvas dispersal/zoom keyframes */
  const KF_DISPERSAL = [[400, 0], [2800, 0.3], [3800, 0.8], [4200, 1]];
  const KF_ZOOM = [[400, 1], [2800, 1.8], [4200, 2.5]];

  if (useCanvas) {
    ctx = canvasEl.getContext('2d');
    if (!ctx) {
      sectionEl.classList.add('is-reduced-motion');
      return;
    }

    /* Pre-bake sprite to offscreen canvas */
    spriteImg = document.createElement('canvas');
    spriteImg.width = 40;
    spriteImg.height = 40;
    const sctx = spriteImg.getContext('2d');
    const grad = sctx.createRadialGradient(20, 20, 0, 20, 20, 20);
    grad.addColorStop(0, 'rgba(188, 15, 15, 0.9)');
    grad.addColorStop(0.3, 'rgba(188, 15, 15, 0.6)');
    grad.addColorStop(0.7, 'rgba(140, 10, 10, 0.3)');
    grad.addColorStop(1, 'rgba(100, 5, 5, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 40, 40);

    /* Seed particles in heart-shaped point mask */
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = (i / PARTICLE_COUNT) * Math.PI * 2;
      /* Heart parametric equation */
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      /* Normalize to 0..1 with jitter */
      const jitter = 0.3;
      particles.push({
        hx: 0.5 + (hx / 40) + (Math.random() - 0.5) * jitter,
        hy: 0.5 + (hy / 40) + (Math.random() - 0.5) * jitter,
        dx: Math.random(),
        dy: Math.random(),
        baseSize: 8 + Math.random() * 16,
        phase: Math.random() * Math.PI * 2
      });
    }

    resizeCanvas();
  }

  /**
   * Resize the canvas to match its CSS dimensions at the correct pixel ratio.
   */
  function resizeCanvas() {
    if (!canvasEl || !ctx) return;
    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Draw the particle system frame for the canvas fallback.
   * @param {number} scrollPx - Current scroll offset within the chapter
   */
  function drawParticles(scrollPx) {
    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const dispersal = utils.kfVal(KF_DISPERSAL, scrollPx);
    const zoom = utils.kfVal(KF_ZOOM, scrollPx);
    const now = performance.now() / 1000;
    const cx = w / 2;
    const cy = h / 2;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      /* Lerp between heart position and dispersed position */
      const px = p.hx + (p.dx - p.hx) * dispersal;
      const py = p.hy + (p.dy - p.hy) * dispersal;
      /* Apply zoom from center */
      const zx = cx + (px * w - cx) * zoom;
      const zy = cy + (py * h - cy) * zoom;
      /* Breathing size oscillation */
      const breath = 1 + 0.15 * Math.sin(now * 1.5 + p.phase);
      const size = p.baseSize * zoom * breath;

      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(now * 2 + p.phase);
      ctx.drawImage(spriteImg, zx - size / 2, zy - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  /* --- Tick function (registered in shared rAF loop) --- */
  function animate() {
    const scrollPx = utils.getScrollPx(chapterEl);

    /* Phase 1: heart glow */
    if (heartGlow) {
      heartGlow.style.opacity = utils.kfVal(KF_HEART_GLOW, scrollPx);
    }

    /* Scroll hint */
    if (scrollHint) {
      scrollHint.style.opacity = utils.kfVal(KF_SCROLL_HINT, scrollPx);
    }

    /* Phase 2: media opacity */
    const mediaOp = utils.kfVal(KF_MEDIA_OP, scrollPx);

    /* Phase 2b–3: headline fade in then out */
    if (headline) {
      const hIn = utils.kfVal(KF_HEADLINE_IN, scrollPx);
      const hOut = utils.kfVal(KF_HEADLINE_OUT, scrollPx);
      headline.style.opacity = Math.min(hIn, hOut);
    }

    /* Phase 6: exit copy */
    if (exitCopy) {
      exitCopy.style.opacity = utils.kfVal(KF_EXIT_COPY, scrollPx);
    }

    /* Video scrubbing */
    if (hasVideo && videoReady && videoEl.duration) {
      videoEl.style.opacity = mediaOp;
      const progress = utils.kfVal(KF_VIDEO_PROGRESS, scrollPx);
      const targetTime = progress * videoEl.duration;
      /* Only seek if difference is notable (avoids micro-stutter) */
      if (Math.abs(videoEl.currentTime - targetTime) > 0.02) {
        videoEl.currentTime = targetTime;
      }
    }

    /* Canvas fallback */
    if (useCanvas && ctx) {
      canvasEl.style.opacity = mediaOp;
      if (mediaOp > 0.01) {
        drawParticles(scrollPx);
      }
    }
  }

  /* --- Register in shared rAF loop --- */
  utils.registerRafCallback(animate);

  /* --- Resize handler --- */
  let resizeTimer = null;

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (useCanvas) resizeCanvas();
    }, 120);
  }

  window.addEventListener('resize', onResize);

  /* --- Cleanup on section unload (theme editor hot-swap) --- */
  function cleanup() {
    utils.unregisterRafCallback(animate);
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
  }

  document.addEventListener('shopify:section:unload', function (e) {
    if (e.detail && e.detail.sectionId === sectionEl.dataset.sectionId) {
      cleanup();
    }
  });
}
