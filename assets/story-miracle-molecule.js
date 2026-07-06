/**
 * Scroll-scrubbed animation controller for the Miracle Molecule section.
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
 * Initializes the Miracle Molecule scroll-scrubbed animation.
 * @param {Element} sectionEl - The shopify-section wrapper element
 * @param {{ createScrollProgress: Function, prefersReducedMotion: Function }} utils
 * @returns {(() => void) | undefined} Cleanup function
 */
export function initMiracleMolecule(sectionEl, { createScrollProgress, prefersReducedMotion }) {
  if (prefersReducedMotion()) return;

  const scrollContainer = sectionEl.querySelector('.story-miracle-molecule__scroll-container');
  if (!scrollContainer) return;

  /* --- DOM refs --- */
  const intro = sectionEl.querySelector('.story-miracle-molecule__intro');
  const eyebrow = sectionEl.querySelector('.story-miracle-molecule__eyebrow');
  const overlayImage = sectionEl.querySelector('.story-miracle-molecule__overlay-image');
  const desatOverlay = sectionEl.querySelector('.story-miracle-molecule__desat-overlay');
  const darkOverlay = sectionEl.querySelector('.story-miracle-molecule__dark-overlay');
  const molecule = sectionEl.querySelector('.story-miracle-molecule__molecule');
  const nobel = sectionEl.querySelector('.story-miracle-molecule__nobel');
  const cards = sectionEl.querySelectorAll('.story-miracle-molecule__card');
  const line = sectionEl.querySelector('.story-miracle-molecule__line');
  const particles = sectionEl.querySelectorAll('[data-particle]');
  const noLabels = sectionEl.querySelectorAll('.story-miracle-molecule__no-label');

  if (!intro) return;

  /* --- Set initial states (p = 0) --- */
  intro.style.opacity = '0';
  if (eyebrow) eyebrow.style.opacity = '0';
  if (overlayImage) overlayImage.style.opacity = '0';
  if (desatOverlay) desatOverlay.style.opacity = '1';
  if (darkOverlay) {
    darkOverlay.style.backgroundColor = 'rgba(0,0,0,0)';
    darkOverlay.style.backdropFilter = 'blur(0px)';
    darkOverlay.style.webkitBackdropFilter = 'blur(0px)';
  }
  if (molecule) {
    molecule.style.opacity = '0';
    molecule.style.transform = 'scale(0.6) rotate(0deg)';
  }
  if (nobel) nobel.style.opacity = '0';
  for (const card of cards) card.style.opacity = '0';
  if (line) line.style.opacity = '0';
  for (const pt of particles) pt.style.opacity = '0';
  for (const label of noLabels) label.style.opacity = '0';

  /* --- Precomputed card phase boundaries --- */
  const cardCount = cards.length;
  const CARD_PHASE_START = 0.22;
  const CARD_PHASE_END = 0.92;
  const CARD_RANGE = CARD_PHASE_END - CARD_PHASE_START;
  const CARD_WIDTH = cardCount > 0 ? CARD_RANGE / cardCount : 0;
  const FADE_W = 0.04;

  /* --- Particle tier boundaries --- */
  const EARLY_COUNT = Math.min(5, particles.length);
  const MID_COUNT = Math.min(12, particles.length);

  /**
   * Maps scroll progress (0–1) to animation states for all elements.
   * Purely mathematical — no state flags — reverses correctly on scroll-up.
   * @param {number} p - Scroll progress 0–1
   */
  function onProgress(p) {

    /* ===== PHASE 1: Video + Intro (0.00–0.10) ===== */
    const introIn = phaseProgress(p, 0.0, 0.10);

    /* ===== PHASE 2: Blur Transition (0.10–0.22) ===== */
    const darkAmount = phaseProgress(p, 0.10, 0.22);
    const blurPx = lerp(0, 47, darkAmount);
    const desatFade = 1 - phaseProgress(p, 0.10, 0.18);
    const introOut = 1 - phaseProgress(p, 0.18, 0.24);

    /* --- Desaturation overlay --- */
    if (desatOverlay) {
      desatOverlay.style.opacity = String(Math.max(0, desatFade));
    }

    /* --- Dark overlay --- */
    if (darkOverlay) {
      darkOverlay.style.backgroundColor = 'rgba(0,0,0,' + darkAmount + ')';
      darkOverlay.style.backdropFilter = 'blur(' + blurPx + 'px)';
      darkOverlay.style.webkitBackdropFilter = 'blur(' + blurPx + 'px)';
    }

    /* --- Intro text opacity --- */
    let introOpacity;
    if (p < 0.10) {
      introOpacity = introIn;
    } else if (p < 0.18) {
      introOpacity = 1;
    } else {
      introOpacity = Math.max(0, introOut);
    }
    intro.style.opacity = String(introOpacity);

    /* --- Eyebrow opacity (mirrors intro) --- */
    if (eyebrow) {
      let eyebrowOp;
      if (p < 0.10) {
        eyebrowOp = introIn;
      } else if (p < 0.18) {
        eyebrowOp = 1;
      } else {
        eyebrowOp = Math.max(0, introOut);
      }
      eyebrow.style.opacity = String(eyebrowOp);
    }

    /* --- Overlay image opacity (mirrors intro) --- */
    if (overlayImage) {
      let imgOp;
      if (p < 0.10) {
        imgOp = introIn;
      } else if (p < 0.18) {
        imgOp = 1;
      } else {
        imgOp = Math.max(0, introOut);
      }
      overlayImage.style.opacity = String(imgOp);
    }

    /* ===== PHASE 3: Text Cards + Molecule (0.22–0.92) ===== */
    if (cardCount > 0) {
      /** @type {number[]} */
      const cardOpacities = [];

      for (let i = 0; i < cardCount; i++) {
        const cStart = CARD_PHASE_START + i * CARD_WIDTH;
        const cEnd = cStart + CARD_WIDTH;
        const isLast = i === cardCount - 1;

        let opacity = 0;
        if (p >= cStart) {
          const fadeInEnd = cStart + FADE_W;
          const fadeOutStart = cEnd - FADE_W;

          if (p < fadeInEnd) {
            opacity = phaseProgress(p, cStart, fadeInEnd);
          } else if (isLast || p < fadeOutStart) {
            opacity = 1;
          } else if (p < cEnd) {
            opacity = 1 - phaseProgress(p, fadeOutStart, cEnd);
          }
        }

        cardOpacities[i] = opacity;
        cards[i].style.opacity = String(opacity);
      }

      /* --- Molecule container: fade in at phase 3 start, persist --- */
      const moleculeFadeIn = phaseProgress(p, CARD_PHASE_START, CARD_PHASE_START + 0.06);
      const moleculeVisible = p <= CARD_PHASE_END ? moleculeFadeIn : 0;

      if (molecule) {
        molecule.style.opacity = String(moleculeVisible);

        /* Scale & rotation based on phase 3 sub-progress */
        const p3 = phaseProgress(p, CARD_PHASE_START, CARD_PHASE_END);
        let scale;
        let rotation;

        if (p3 < 0.25) {
          /* Card 0 range: scale up, rotation increases */
          const t = phaseProgress(p3, 0, 0.25);
          scale = lerp(0.6, 1.0, t);
          rotation = lerp(0, 2.4, t);
        } else if (p3 < 0.75) {
          /* Cards 1–2: stable */
          scale = 1.0;
          rotation = 2.4;
        } else {
          /* Card 3: scale grows further */
          const t = phaseProgress(p3, 0.75, 1.0);
          scale = lerp(1.0, 1.25, t);
          rotation = 2.4;
        }

        molecule.style.transform = 'scale(' + scale + ') rotate(' + rotation + 'deg)';
      }

      /* --- Particle opacity per tier --- */
      const p3 = phaseProgress(p, CARD_PHASE_START, CARD_PHASE_END);

      for (let i = 0; i < particles.length; i++) {
        let pOp = 0;

        if (p3 < 0.25) {
          /* Card 0: first 5 particles fade in */
          pOp = i < EARLY_COUNT ? phaseProgress(p3, 0.05, 0.20) : 0;
        } else if (p3 < 0.50) {
          /* Card 1 (Nobel card): particles dim */
          if (i < EARLY_COUNT) {
            pOp = lerp(1, 0.15, phaseProgress(p3, 0.25, 0.35));
          }
        } else if (p3 < 0.75) {
          /* Card 2: medium visibility, more particles appear */
          const midFade = phaseProgress(p3, 0.50, 0.60);
          if (i < EARLY_COUNT) {
            pOp = lerp(0.15, 0.7, midFade);
          } else if (i < MID_COUNT) {
            pOp = lerp(0, 0.5, midFade);
          }
        } else {
          /* Card 3: all particles at full brightness */
          const fullFade = phaseProgress(p3, 0.75, 0.85);
          if (i < MID_COUNT) {
            pOp = lerp(0.7, 1, fullFade);
          } else {
            pOp = fullFade;
          }
        }

        particles[i].style.opacity = String(Math.max(0, pOp));
      }

      /* --- NO labels: visible from card 2 onward (p3 >= 0.50) --- */
      const noOp = phaseProgress(p3, 0.50, 0.55);
      for (const label of noLabels) {
        label.style.opacity = String(noOp);
      }

      /* --- Nobel Prize logo: driven by cards with data-show-nobel --- */
      if (nobel) {
        let nobelOp = 0;
        for (let i = 0; i < cardCount; i++) {
          if (cards[i].dataset.showNobel === 'true') {
            nobelOp = Math.max(nobelOp, cardOpacities[i]);
          }
        }
        nobel.style.opacity = String(nobelOp);
      }
    }

    /* ===== PHASE 4: Exit line (0.92–1.0) ===== */
    if (line) {
      line.style.opacity = String(phaseProgress(p, 0.92, 1.0));
    }
  }

  return createScrollProgress(scrollContainer, onProgress);
}
