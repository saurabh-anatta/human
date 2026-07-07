/**
 * Product Reveal frame-sequence scroll animation.
 * ES module — loaded via <script type="module"> in the section Liquid file.
 */

/**
 * Linear interpolation between two values.
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Progress (0–1)
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Remaps a value within [start, end] to 0–1, clamped.
 * @param {number} value - Current progress
 * @param {number} start - Phase start
 * @param {number} end - Phase end
 * @returns {number} 0–1 within the phase
 */
function phaseProgress(value, start, end) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / (end - start);
}

/**
 * Initializes the Product Reveal scroll-scrubbed frame-sequence animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, createRevealObserver: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initProductReveal(sectionEl, { createScrollProgress, createRevealObserver, prefersReducedMotion }) {
  const scrollContainer = sectionEl.querySelector('.story-product-reveal__scroll-container');
  if (!scrollContainer) return;

  const stage = sectionEl.querySelector('.story-product-reveal__stage');
  const canvas = sectionEl.querySelector('.story-product-reveal__canvas');
  const poster = sectionEl.querySelector('.story-product-reveal__poster');
  const heading = sectionEl.querySelector('.story-product-reveal__heading');

  if (!canvas || !stage) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const framesBaseUrl = canvas.dataset.framesBaseUrl || '';
  const frameCount = parseInt(canvas.dataset.frameCount, 10) || 60;

  /* Reduced motion: show poster, force heading visible, skip scroll binding */
  if (prefersReducedMotion()) {
    if (heading) heading.style.opacity = '1';
    return;
  }

  /* --- Frame storage --- */
  const frames = new Array(frameCount);
  let framesStartedLoading = false;
  let currentFrameIndex = -1;
  let rafPending = false;

  /* --- Canvas sizing via ResizeObserver --- */
  function sizeCanvas() {
    const w = stage.offsetWidth;
    const h = stage.offsetHeight;
    if (w === 0 || h === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* Redraw current frame after resize */
    if (currentFrameIndex >= 0) {
      drawFrame(currentFrameIndex);
    }
  }

  const resizeObserver = new ResizeObserver(sizeCanvas);
  resizeObserver.observe(stage);

  /**
   * Draws an image to the canvas using cover-fit (simulates object-fit: cover).
   * Calculates source crop rect so the image fills the canvas without distortion.
   * @param {HTMLImageElement} img - The image to draw
   */
  function drawCoverFit(img) {
    const cw = stage.offsetWidth;
    const ch = stage.offsetHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (iw === 0 || ih === 0 || cw === 0 || ch === 0) return;

    const imgRatio = iw / ih;
    const canvasRatio = cw / ch;
    let sx, sy, sw, sh;

    if (imgRatio > canvasRatio) {
      /* Image wider than canvas — crop sides */
      sh = ih;
      sw = ih * canvasRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      /* Image taller — crop top/bottom */
      sw = iw;
      sh = iw / canvasRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  }

  /**
   * Draws a specific frame to the canvas if it is loaded.
   * Hides the poster image once a frame is successfully drawn.
   * @param {number} index - Frame index (0-based)
   */
  function drawFrame(index) {
    if (index < 0 || index >= frameCount) return;
    const frame = frames[index];
    if (frame && frame.complete && frame.naturalWidth > 0) {
      drawCoverFit(frame);
      /* Hide poster once canvas has content */
      if (poster) poster.style.opacity = '0';
    }
  }

  /**
   * Builds a frame URL from the base URL and a zero-padded 3-digit index.
   * Example: baseUrl = "https://cdn.example.com/frames/frame-", index 0 → "…frame-001.jpg"
   * @param {number} index - 0-based frame index
   * @returns {string} Full frame URL
   */
  function buildFrameUrl(index) {
    const padded = String(index + 1).padStart(3, '0');
    return framesBaseUrl + padded + '.jpg';
  }

  /* --- Frame preloading --- */
  function preloadFrames() {
    if (!framesBaseUrl || framesStartedLoading) return;
    framesStartedLoading = true;

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      const frameIndex = i;
      img.onload = () => {
        /* If this is the current target frame, draw it now */
        if (frameIndex === currentFrameIndex) {
          drawFrame(frameIndex);
        }
        /* Draw frame 0 as initial content if nothing has been drawn yet */
        if (frameIndex === 0 && currentFrameIndex <= 0) {
          drawFrame(0);
        }
      };
      img.src = buildFrameUrl(i);
      frames[i] = img;
    }
  }

  /* --- Lazy preload trigger via IntersectionObserver --- */
  const preloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          preloadFrames();
          preloadObserver.disconnect();
        }
      }
    },
    { rootMargin: '0px 0px 200% 0px' }
  );
  preloadObserver.observe(scrollContainer);

  /* --- Phase windows --- */
  const HEADING_FADE_START = 0;
  const HEADING_FADE_END = 0.05;

  /**
   * Maps scroll progress (0–1) to frame index and heading opacity.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {
    /* Frame selection: map progress directly to frame index */
    const targetIndex = Math.round(p * (frameCount - 1));

    if (targetIndex !== currentFrameIndex) {
      currentFrameIndex = targetIndex;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          drawFrame(currentFrameIndex);
        });
      }
    }

    /* Heading opacity — fades in quickly (0 → 0.05) then stays at 1 */
    if (heading) {
      const headingOpacity = phaseProgress(p, HEADING_FADE_START, HEADING_FADE_END);
      heading.style.opacity = String(headingOpacity);
    }
  }

  const cleanupScroll = createScrollProgress(scrollContainer, onProgress);

  /* --- Cleanup --- */
  return () => {
    cleanupScroll();
    resizeObserver.disconnect();
    preloadObserver.disconnect();
  };
}
