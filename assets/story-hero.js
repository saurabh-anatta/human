/**
 * story-hero.js — Particle ring canvas + scroll animations for the Hero section.
 *
 * REUSE CONTRACT:
 *   The closing CTA section imports this module and calls init(sectionEl, utils)
 *   with its own section element. The function locates the canvas via
 *   sectionEl.querySelector('.story-hero__canvas'). Any section that contains
 *   a .story-hero__canvas element can use this init function.
 *
 * Exports:
 *   init(sectionEl, utils) — set up particle ring, rotation, and scroll effects
 */

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (mulberry32) for deterministic dot placement           */
/* ------------------------------------------------------------------ */

/**
 * Returns a seeded pseudo-random number generator.
 * @param {number} seed
 * @returns {() => number} — returns a float in [0, 1)
 */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  Ring baking                                                        */
/* ------------------------------------------------------------------ */

/**
 * Bakes concentric ring bands of dark dots onto an offscreen canvas context.
 * @param {CanvasRenderingContext2D} ctx — offscreen canvas context
 * @param {number} size — canvas width & height (square)
 */
function bakeRing(ctx, size) {
  var rand = mulberry32(42);
  var cx = size / 2;
  var cy = size / 2;
  var numRings = 11;
  var ringSpacing = size / numRings;
  var maxR = size * 0.5;
  var TWO_PI = Math.PI * 2;

  for (var i = 0; i < numRings; i++) {
    var phase = i / (numRings - 1);
    var density = Math.pow(Math.sin(phase * Math.PI), 1.8);
    var centerFade = Math.min(1, (i * ringSpacing) / (1.1 * ringSpacing));

    /* Each ring band: radial range from inner to outer edge */
    var bandInner = i * ringSpacing;
    var bandOuter = (i + 1) * ringSpacing;

    /* Number of dots proportional to density and band area */
    var dotsInBand = Math.round(7300 * density + 200);

    for (var d = 0; d < dotsInBand; d++) {
      var angle = rand() * TWO_PI;
      var r = bandInner + rand() * (bandOuter - bandInner);

      /* Outer fade — suppress dots beyond ~88% of max radius */
      var outerFade = 1 - Math.pow(r / (maxR * 0.88), 4);
      if (outerFade < 0) outerFade = 0;

      var dotRadius = 1.5 + rand() * 5.5;
      var dotAlpha = 0.28 + rand() * 0.52;
      var alpha = dotAlpha * centerFade * outerFade;

      if (alpha < 0.01) continue;

      var x = cx + Math.cos(angle) * r;
      var y = cy + Math.sin(angle) * r;

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, TWO_PI);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/*  Canvas size helper                                                 */
/* ------------------------------------------------------------------ */

/**
 * @returns {number} — canvas size (square) large enough to cover the viewport
 *                      even when rotated
 */
function calcSize() {
  return Math.ceil(Math.hypot(window.innerWidth, window.innerHeight)) + 100;
}

/* ------------------------------------------------------------------ */
/*  Public init                                                        */
/* ------------------------------------------------------------------ */

/**
 * Initialises the particle ring canvas and scroll effects for a section.
 *
 * @param {HTMLElement} sectionEl — the section element (must contain .story-hero__canvas)
 * @param {{ prefersReducedMotion: () => boolean, registerRafCallback: (fn: (t: number) => void) => void, unregisterRafCallback: (fn: (t: number) => void) => void, createRevealObserver: Function }} utils
 */
export function init(sectionEl, utils) {
  var canvas = sectionEl.querySelector('.story-hero__canvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* ---- Offscreen canvas for baked ring ---- */
  var offscreen = document.createElement('canvas');
  var offCtx = offscreen.getContext('2d');
  var size = 0;

  /**
   * Resize and re-bake the offscreen ring texture.
   */
  function rebake() {
    size = calcSize();
    offscreen.width = size;
    offscreen.height = size;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    offCtx.clearRect(0, 0, size, size);
    offCtx.fillStyle = '#5a0808';
    bakeRing(offCtx, size);
  }

  rebake();

  /* ---- Debounced resize handler ---- */
  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      rebake();
      /* Draw one frame immediately after rebake so canvas isn't blank during resize */
      if (utils.prefersReducedMotion()) {
        drawStatic();
      }
    }, 120);
  }
  window.addEventListener('resize', onResize);

  /* ---- Draw functions ---- */

  /**
   * Draw a single static frame (no rotation, no drift).
   */
  function drawStatic() {
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.globalAlpha = 0.90;
    ctx.drawImage(offscreen, -size / 2, -size / 2);
    ctx.restore();
  }

  /**
   * Animated draw callback for rAF loop.
   * @param {number} time — DOMHighResTimeStamp
   */
  function draw(time) {
    var w = canvas.width;
    var h = canvas.height;
    var t = time * 0.001; /* seconds */

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    /* Slow rotation: 0.012 rad/s */
    ctx.rotate(t * 0.012);

    /* Gentle drift */
    var driftX = Math.sin(t * 0.18) * 22;
    var driftY = Math.cos(t * 0.13) * 16;
    ctx.translate(driftX, driftY);

    ctx.globalAlpha = 0.90;
    ctx.drawImage(offscreen, -size / 2, -size / 2);
    ctx.restore();
  }

  /* ---- Start rendering ---- */
  if (utils.prefersReducedMotion()) {
    /* Static single frame — no rAF loop */
    drawStatic();
  } else {
    utils.registerRafCallback(draw);
  }

  /* ---- DISCOVER scroll fade ---- */
  if (!utils.prefersReducedMotion()) {
    var discoverGroup = sectionEl.querySelector('.story-hero__discover-group');
    if (discoverGroup) {
      window.addEventListener('scroll', function () {
        var scrollY = window.scrollY;
        var opacity = Math.max(0, 1 - scrollY / 320);
        discoverGroup.style.opacity = opacity;
      }, { passive: true });
    }
  }
}
