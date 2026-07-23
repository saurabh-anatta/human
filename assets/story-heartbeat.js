/* ==========================================================================
   Our Story — Heartbeat Chapter (ECG Line + Horizontal Pan)
   Exports init(sectionEl, utils) per the story-section pattern.
   ========================================================================== */

/**
 * Initialise the heartbeat chapter with dual-canvas ECG animation.
 * All animation state is a pure function of scrollPx — scrolling back
 * up reverses everything identically.
 *
 * @param {HTMLElement} sectionEl - The element with data-section-id
 * @param {Object} utils - The story-utils module
 */
export function init(sectionEl, utils) {
  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  const canvasBack = sectionEl.querySelector('.story-heartbeat__canvas-back');
  const canvasFront = sectionEl.querySelector('.story-heartbeat__canvas-front');
  if (!canvasFront || !canvasBack) return;

  const ctxFront = canvasFront.getContext('2d');
  const ctxBack = canvasBack.getContext('2d');
  if (!ctxFront || !ctxBack) return;

  const elderEl = sectionEl.querySelector('.story-heartbeat__image--elder');
  const runnerEl = sectionEl.querySelector('.story-heartbeat__image--runner');
  const textEls = [
    sectionEl.querySelector('.story-heartbeat__text--beat-1'),
    sectionEl.querySelector('.story-heartbeat__text--beat-2'),
    sectionEl.querySelector('.story-heartbeat__text--beat-3'),
    sectionEl.querySelector('.story-heartbeat__text--beat-4')
  ];
  const scrollHintEl = sectionEl.querySelector('.story-heartbeat__scroll-hint');

  /* ---- Mutable state ---- */
  let W = 0;
  let H = 0;
  let dpr = 1;
  let lastScrollPx = -1;
  let resizeTimer = null;
  let cameraKF = [];
  let tipKF = [];

  /* ====================================================================
     Keyframe tables (tuned for 12000 px pin distance)
     Scaled proportionally on resize when pin_distance differs.
     ==================================================================== */

  /** Camera: scrollPx → cameraX in viewport-widths. Pan → dwell → pan. */
  const BASE_CAMERA_KF = [
    [0, 0], [1100, 0], [2100, 1.0], [3200, 1.0],
    [4200, 2.0], [5200, 2.0], [6100, 2.7], [6900, 2.7],
    [8200, 3.5], [9300, 3.5], [10700, 4.4], [12000, 4.4]
  ];

  /** Tip: scrollPx → tipX in viewport-widths. Races ahead of camera. */
  const BASE_TIP_KF = [
    [0, -0.08], [400, 0.14], [800, 0.30], [1000, 0.38],
    [1200, 0.50], [1600, 0.90], [1900, 1.26], [2200, 1.42],
    [2500, 1.58], [3400, 1.95], [3700, 2.12], [4000, 2.30],
    [5000, 3.20], [7000, 4.00], [10000, 4.50], [12000, 4.60]
  ];

  /* ---- Scene layout constants (viewport-width units) ---- */
  const SPIKE_POS = [0.36, 1.38, 2.05];
  const SPLIT_POINT = 2.0;
  const ELDER_X = 0.18;
  const RUNNER_X = 2.85;
  const BEAT_X = [0.12, 1.25, 2.05, 3.9];

  /* ====================================================================
     Helpers
     ==================================================================== */

  function smoothstep(a, b, x) {
    let t = (x - a) / (b - a);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t * t * (3 - 2 * t);
  }

  /**
   * ECG spike Y-value at dx pixels from spike center.
   * Linear interpolation between control points gives the characteristic
   * sharp R-wave peak of a medical-instrument trace.
   *
   * @param {number} dx   – pixels from spike center (negative = left)
   * @param {number} baseY – baseline Y in CSS px
   * @param {number} sH   – spike height (R-wave amplitude)
   * @param {number} dH   – dip height (S-wave amplitude)
   * @returns {number} y value in CSS px
   */
  function spikeY(dx, baseY, sH, dH) {
    /* Control points: [dx offset, y offset from baseline]
       Positive y-offset = below baseline (canvas y grows downward) */
    const kp = [
      [-30, 0], [-18, 8], [-8, 0], [-3, 0],
      [0, -sH], [5, dH * 0.3], [12, dH],
      [25, dH * 0.15], [40, 0]
    ];
    if (dx <= -30 || dx >= 40) return baseY;
    for (let i = 0; i < kp.length - 1; i++) {
      if (dx >= kp[i][0] && dx <= kp[i + 1][0]) {
        const r = kp[i + 1][0] - kp[i][0];
        const t = r === 0 ? 0 : (dx - kp[i][0]) / r;
        return baseY + kp[i][1] + t * (kp[i + 1][1] - kp[i][1]);
      }
    }
    return baseY;
  }

  /** Compute ECG Y for any scene-space x pixel. */
  function ecgY(x, baseY, sH, dH, spPx) {
    for (let s = 0; s < spPx.length; s++) {
      const dx = x - spPx[s];
      if (dx >= -30 && dx <= 40) return spikeY(dx, baseY, sH, dH);
    }
    return baseY;
  }

  /* ====================================================================
     Canvas drawing — Front (ECG line + tip dot)
     ==================================================================== */

  function drawFront(camPx, tipPx) {
    /* Reset transform and clear */
    ctxFront.setTransform(1, 0, 0, 1, 0, 0);
    ctxFront.clearRect(0, 0, canvasFront.width, canvasFront.height);
    if (tipPx <= 0) return;

    const baseY = H - 46;
    const sH = 0.24 * H;
    const dH = 0.06 * H;
    const spPx = [SPIKE_POS[0] * W, SPIKE_POS[1] * W, SPIKE_POS[2] * W];

    /* Set scene-space transform: DPR scaling + camera offset */
    ctxFront.setTransform(dpr, 0, 0, dpr, -camPx * dpr, 0);

    /* Build path points (flat array: x0,y0,x1,y1,…) at 2 px resolution */
    const pts = [];
    const step = 2;
    for (let x = 0; x <= tipPx; x += step) {
      pts.push(x, ecgY(x, baseY, sH, dH, spPx));
    }
    /* Ensure exact tip point is present */
    const tipYval = ecgY(tipPx, baseY, sH, dH, spPx);
    if (pts.length === 0 || pts[pts.length - 2] < tipPx) {
      pts.push(tipPx, tipYval);
    }
    const len = pts.length >> 1;
    if (len < 2) return;

    /* --- Main line stroke --- */
    ctxFront.strokeStyle = 'rgba(215, 42, 42, 0.92)';
    ctxFront.lineWidth = 1.5;
    ctxFront.lineCap = 'round';
    ctxFront.lineJoin = 'round';
    ctxFront.shadowColor = '#D72A2A';
    ctxFront.shadowBlur = 3;

    ctxFront.beginPath();
    ctxFront.moveTo(pts[0], pts[1]);
    for (let i = 1; i < len; i++) {
      ctxFront.lineTo(pts[i * 2], pts[i * 2 + 1]);
    }
    ctxFront.stroke();

    /* --- Flare pass near spike apexes --- */
    for (let s = 0; s < spPx.length; s++) {
      if (tipPx < spPx[s] - 60) continue;
      const fStart = Math.max(0, spPx[s] - 60);
      const fEnd = Math.min(tipPx, spPx[s] + 60);

      ctxFront.shadowBlur = 22;
      ctxFront.beginPath();
      let started = false;
      for (let i = 0; i < len; i++) {
        const px = pts[i * 2];
        if (px >= fStart && px <= fEnd) {
          if (!started) { ctxFront.moveTo(px, pts[i * 2 + 1]); started = true; }
          else { ctxFront.lineTo(px, pts[i * 2 + 1]); }
        }
      }
      if (started) ctxFront.stroke();
    }

    /* --- Tip dot with glow --- */
    ctxFront.shadowBlur = 12;
    ctxFront.shadowColor = '#D72A2A';
    ctxFront.fillStyle = '#D72A2A';
    ctxFront.beginPath();
    ctxFront.arc(tipPx, tipYval, 2.2, 0, Math.PI * 2);
    ctxFront.fill();
  }

  /* ====================================================================
     Canvas drawing — Back (splinter fan / blood-vessel strands)
     ==================================================================== */

  function drawBack(camPx, tipPx) {
    ctxBack.setTransform(1, 0, 0, 1, 0, 0);
    ctxBack.clearRect(0, 0, canvasBack.width, canvasBack.height);

    const splitPx = SPLIT_POINT * W;
    if (tipPx <= splitPx) return;

    const baseY = H - 46;
    const fanLen = tipPx - splitPx;
    const maxSpread = 0.26 * H;
    const growth = smoothstep(0, 2.6 * W, fanLen);
    if (growth < 0.005) return;

    ctxBack.setTransform(dpr, 0, 0, dpr, -camPx * dpr, 0);
    ctxBack.lineCap = 'round';

    const alphas = [0.30, 0.35, 0.50, 0.70, 0.90, 0.90, 0.70, 0.50, 0.35, 0.30];
    const widths = [0.8, 0.8, 1.0, 1.2, 1.5, 1.5, 1.2, 1.0, 0.8, 0.8];

    for (let i = 0; i < 10; i++) {
      const spread = ((i - 4.5) / 4.5) * maxSpread * growth;
      const endX = tipPx;
      const endY = baseY + spread;

      /* Bezier control points — early diverge, then run horizontal */
      const cp1x = splitPx + fanLen * 0.15;
      const cp1y = baseY + spread * 0.05;
      const cp2x = splitPx + fanLen * 0.28;
      const cp2y = baseY + spread * 0.85;

      ctxBack.strokeStyle = 'rgba(188, 15, 15, ' + alphas[i] + ')';
      ctxBack.lineWidth = widths[i];
      ctxBack.shadowColor = '#BC0F0F';
      ctxBack.shadowBlur = 4;

      ctxBack.beginPath();
      ctxBack.moveTo(splitPx, baseY);
      ctxBack.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctxBack.stroke();
    }
  }

  /* ====================================================================
     DOM element positioning (images + text)
     ==================================================================== */

  function positionImages(camPx, tipVw) {
    if (elderEl) {
      elderEl.style.transform = 'translateX(' + (ELDER_X * W - camPx) + 'px)';
      /* Visible early, fades out centered around tipVw ≈ 1.8 */
      let eo = 1;
      if (tipVw > 1.69) eo = 1 - smoothstep(1.69, 1.91, tipVw);
      elderEl.style.opacity = eo;
    }

    if (runnerEl) {
      runnerEl.style.transform = 'translateX(' + (RUNNER_X * W - camPx) + 'px)';
      /* Fades in at tipVw ≈ 2.4, fades out centered at ≈ 4.0 */
      let ro = 0;
      if (tipVw >= 2.4 && tipVw < 3.89) {
        ro = smoothstep(2.4, 2.58, tipVw);
      } else if (tipVw >= 3.89) {
        ro = 1 - smoothstep(3.89, 4.11, tipVw);
      }
      runnerEl.style.opacity = ro;
    }
  }

  function positionText(camPx) {
    const fadeStart = 0.76 * W;
    const fadeWidth = 0.32 * W;

    for (let i = 0; i < textEls.length; i++) {
      const el = textEls[i];
      if (!el) continue;

      const px = BEAT_X[i] * W - camPx;
      /* Opacity ramps 0 → 1 as the text crosses from right into the viewport */
      const op = px < fadeStart ? Math.min(1, (fadeStart - px) / fadeWidth) : 0;

      el.style.transform = 'translateX(' + px + 'px)';
      el.style.opacity = op;
    }
  }

  /* ====================================================================
     Sizing & keyframe scaling
     ==================================================================== */

  function doResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    /* Size canvas buffers for Retina clarity */
    canvasFront.width = W * dpr;
    canvasFront.height = H * dpr;
    canvasBack.width = W * dpr;
    canvasBack.height = H * dpr;

    /* Scale keyframe stops proportionally to actual pin distance */
    const maxScroll = chapterEl.offsetHeight - H;
    const scale = maxScroll > 0 ? maxScroll / 12000 : 1;
    cameraKF = BASE_CAMERA_KF.map(function (k) { return [k[0] * scale, k[1]]; });
    tipKF = BASE_TIP_KF.map(function (k) { return [k[0] * scale, k[1]]; });

    lastScrollPx = -1; /* force redraw on next tick */
  }

  /* ====================================================================
     Reduced motion — bail out; CSS handles static stacked fallback
     ==================================================================== */

  if (utils.prefersReducedMotion()) return;

  /* ====================================================================
     Full animation path
     ==================================================================== */

  doResize();

  function tick() {
    const scrollPx = utils.getScrollPx(chapterEl);
    const maxScroll = chapterEl.offsetHeight - H;

    /* Early return when chapter is off-screen below viewport */
    if (scrollPx > maxScroll + H) return;

    /* Skip redundant redraws when scroll hasn't changed */
    if (scrollPx === lastScrollPx) return;
    lastScrollPx = scrollPx;

    /* Compute camera & tip from keyframes (pure function of scrollPx) */
    const camVw = utils.kfVal(cameraKF, scrollPx);
    const tipVw = utils.kfVal(tipKF, scrollPx);
    const camPx = camVw * W;
    const tipPx = tipVw * W;

    /* Draw canvases */
    drawFront(camPx, tipPx);
    drawBack(camPx, tipPx);

    /* Position DOM elements */
    positionImages(camPx, tipVw);
    positionText(camPx);

    /* Scroll hint fades out over first 200px of local scroll */
    if (scrollHintEl) {
      scrollHintEl.style.opacity = Math.max(0, 1 - scrollPx / 200);
    }
  }

  utils.registerRafCallback(tick);

  /* Debounced resize: recalculate canvas sizes and keyframe scaling */
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(doResize, 120);
  });
}
