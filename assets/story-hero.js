/* ==========================================================================
   Our Story — Hero Section (Particle Ring + DISCOVER fade)
   Exports init(sectionEl, utils) per the story-section pattern.
   ========================================================================== */

/**
 * Initialise the hero particle-ring canvas and scroll-driven DISCOVER fade.
 * @param {HTMLElement} sectionEl - The element with data-section-id
 * @param {Object} utils - The story-utils module
 */
export function init(sectionEl, utils) {
  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  const canvas = sectionEl.querySelector('.story-hero__canvas');
  const discoverEl = sectionEl.querySelector('.story-hero__discover');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const DOT_COLOR = '#5a0808';
  const ROTATION_SPEED = 0.012; /* rad/s */
  const FADE_DISTANCE = 320; /* px of scroll to fully fade DISCOVER */

  let offscreen = null;
  let offCtx = null;
  let vw = 0;
  let vh = 0;
  let startTime = 0;
  let resizeTimer = null;

  /* --- Seeded pseudo-RNG (mulberry32) for deterministic dots --- */
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --- Bake the particle ring to an offscreen canvas --- */
  function bake() {
    vw = window.innerWidth;
    vh = window.innerHeight;

    canvas.width = vw;
    canvas.height = vh;

    const diag = Math.hypot(vw, vh) + 100;
    const size = Math.ceil(diag);

    offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    offCtx = offscreen.getContext('2d');

    offCtx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const bandSpacing = diag / 11;
    const maxR = diag / 2;
    const numBands = Math.ceil(maxR / bandSpacing) + 1;
    const rng = mulberry32(42);

    for (let b = 0; b < numBands; b++) {
      const bandR = b * bandSpacing;
      if (bandR > maxR * 1.1) break;

      /* Density modulated by sin(phase * PI) ^ 1.8 */
      const phase = bandR / maxR;
      const sinVal = Math.sin(phase * Math.PI);
      const density = Math.pow(Math.abs(sinVal), 1.8);

      /* Circumference-based dot count to distribute ~80k total dots */
      const circumference = Math.max(1, 2 * Math.PI * bandR);
      const baseDots = circumference * 3.2;
      const dotsInBand = Math.round(baseDots * density);

      /* Center fade-in over first ~1.1 ring radii */
      const centerFade = bandR < bandSpacing * 1.1
        ? bandR / (bandSpacing * 1.1)
        : 1;

      /* Outer fade: 1 - (r / (maxR * 0.88)) ^ 4 */
      const outerRatio = bandR / (maxR * 0.88);
      const outerFade = outerRatio >= 1 ? 0 : 1 - Math.pow(outerRatio, 4);

      const bandAlphaScale = centerFade * outerFade;
      if (bandAlphaScale <= 0.01) continue;

      for (let d = 0; d < dotsInBand; d++) {
        const angle = rng() * Math.PI * 2;
        const rOffset = (rng() - 0.5) * bandSpacing * 0.8;
        const r = bandR + rOffset;

        if (r < 0 || r > maxR * 1.05) continue;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        /* Dot radius 1.5–7px */
        const dotR = 1.5 + rng() * 5.5;

        /* Per-dot alpha 0.28–0.80, scaled by band fades */
        const dotAlpha = (0.28 + rng() * 0.52) * bandAlphaScale;

        offCtx.globalAlpha = dotAlpha;
        offCtx.fillStyle = DOT_COLOR;
        offCtx.beginPath();
        offCtx.arc(x, y, dotR, 0, Math.PI * 2);
        offCtx.fill();
      }
    }

    offCtx.globalAlpha = 1;
  }

  /* --- Draw one frame of the rotating particle ring --- */
  function drawFrame(elapsed) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, vw, vh);

    if (!offscreen) return;

    const t = elapsed;
    const rotation = ROTATION_SPEED * t;
    const driftX = Math.sin(t * 0.18) * 22;
    const driftY = Math.cos(t * 0.13) * 16;

    const centerX = vw / 2 + driftX;
    const centerY = vh / 2 + driftY;

    ctx.save();
    ctx.globalAlpha = 0.90;
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.drawImage(offscreen, -offscreen.width / 2, -offscreen.height / 2);
    ctx.restore();
  }

  /* --- Reduced motion path --- */
  if (utils.prefersReducedMotion()) {
    sectionEl.setAttribute('data-reduced-motion', '');
    bake();
    drawFrame(0);

    /* Still handle resize for a static redraw */
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        bake();
        drawFrame(0);
      }, 120);
    });
    return;
  }

  /* --- Full animation path --- */
  bake();
  startTime = performance.now() / 1000;

  function tick() {
    const now = performance.now() / 1000;
    const elapsed = now - startTime;

    drawFrame(elapsed);

    /* DISCOVER fade: opacity 1 → 0 over first FADE_DISTANCE px */
    if (discoverEl) {
      const scrollPx = utils.getScrollPx(chapterEl);
      const opacity = Math.max(0, 1 - scrollPx / FADE_DISTANCE);
      discoverEl.style.opacity = opacity;
    }
  }

  utils.registerRafCallback(tick);

  /* Debounced resize: re-bake offscreen canvas */
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      bake();
    }, 120);
  });
}
