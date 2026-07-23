/* ==========================================================================
   Our Story — Nitric Oxide Chapter (Flat → 3D particle molecule)
   Exports init(sectionEl, utils, threeUrl) per the story-section pattern.
   ========================================================================== */

/**
 * Initialise the Nitric Oxide chapter with 3-phase scroll-driven molecule.
 * Phase A: flat DOM N–O molecule + headline
 * Phase B: crossfade to 3D particle-cloud molecule via Three.js
 * Phase C: molecule moves aside, copy fades in, interactive drag-to-rotate
 *
 * @param {HTMLElement} sectionEl - The element with data-section-id
 * @param {Object} utils - The story-utils module
 * @param {string} threeUrl - URL to the Three.js ESM asset
 */
export async function init(sectionEl, utils, threeUrl) {
  /* --- Reduced motion: skip all Three.js, CSS handles static layout --- */
  if (utils.prefersReducedMotion()) {
    sectionEl.classList.add('is-reduced-motion');
    return;
  }

  const chapterEl = sectionEl.closest('.story-chapter');
  if (!chapterEl) return;

  /* --- Cache DOM refs --- */
  const flatView = sectionEl.querySelector('.story-no-molecule__flat-view');
  const headline = sectionEl.querySelector('.story-no-molecule__headline');
  const canvasEl = sectionEl.querySelector('.story-no-molecule__three-canvas');
  const labelN = sectionEl.querySelector('.story-no-molecule__label--n');
  const labelO = sectionEl.querySelector('.story-no-molecule__label--o');
  const shadowN = sectionEl.querySelector('.story-no-molecule__shadow--n');
  const shadowO = sectionEl.querySelector('.story-no-molecule__shadow--o');
  const copyEl = sectionEl.querySelector('.story-no-molecule__copy');
  const scrollHint = sectionEl.querySelector('.story-no-molecule__scroll-hint');

  if (!canvasEl) return;

  /* --- Import Three.js --- */
  let THREE;
  try {
    THREE = await import(threeUrl);
  } catch (err) {
    sectionEl.classList.add('is-reduced-motion');
    return;
  }

  /* --- Detect mobile / low-end --- */
  const isMobile = () => window.innerWidth <= 640;
  const pCount = (isMobile() && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ? 500 : 1050;

  /* --- Sprite texture (64x64 radial gradient) --- */
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 64;
  spriteCanvas.height = 64;
  const spriteCtx = spriteCanvas.getContext('2d');
  const grad = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  spriteCtx.fillStyle = grad;
  spriteCtx.fillRect(0, 0, 64, 64);
  const spriteTexture = new THREE.CanvasTexture(spriteCanvas);

  /* --- Renderer --- */
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true
    });
  } catch (err) {
    sectionEl.classList.add('is-reduced-motion');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);

  /* --- Scene + Camera --- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    38,
    canvasEl.clientWidth / canvasEl.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.3, 9.5);

  /* --- Lights --- */
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(-3, 6, 5);
  scene.add(dirLight);

  /* --- Fibonacci sphere point distribution --- */
  function fibonacciSphere(count, radius) {
    const positions = new Float32Array(count * 3);
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;
      positions[i * 3] = Math.cos(theta) * r * radius;
      positions[i * 3 + 1] = y * radius;
      positions[i * 3 + 2] = Math.sin(theta) * r * radius;
    }
    return positions;
  }

  /* --- Build atom particle clouds --- */
  const atomRadius = 0.72;
  const atomSep = 0.82;

  function makePointsMat() {
    return new THREE.PointsMaterial({
      size: 0.055,
      map: spriteTexture,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffffff
    });
  }

  const geomN = new THREE.BufferGeometry();
  geomN.setAttribute('position', new THREE.BufferAttribute(fibonacciSphere(pCount, atomRadius), 3));
  const matN = makePointsMat();
  const atomN = new THREE.Points(geomN, matN);
  atomN.position.x = -atomSep;

  const geomO = new THREE.BufferGeometry();
  geomO.setAttribute('position', new THREE.BufferAttribute(fibonacciSphere(pCount, atomRadius), 3));
  const matO = makePointsMat();
  const atomO = new THREE.Points(geomO, matO);
  atomO.position.x = atomSep;

  /* --- Bond line --- */
  const bondGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-atomSep, 0, 0),
    new THREE.Vector3(atomSep, 0, 0)
  ]);
  const bondMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35
  });
  const bondLine = new THREE.Line(bondGeom, bondMat);

  /* --- Molecule group --- */
  const molecule = new THREE.Group();
  molecule.add(atomN);
  molecule.add(atomO);
  molecule.add(bondLine);
  scene.add(molecule);

  /* --- Animation state --- */
  let rotCurrentY = 0;
  let rotCurrentX = 0;
  let posCurrentX = 0;
  let posCurrentY = 0;
  let autoRotateAccum = 0;
  let autoRampCurrent = 0;
  let dragAccumY = 0;
  let dragAccumX = 0;
  let dragVelY = 0;
  let dragVelX = 0;
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastTime = performance.now();

  /* --- Drag interaction on canvas --- */
  canvasEl.style.cursor = 'grab';

  canvasEl.addEventListener('pointerdown', function (e) {
    isDragging = true;
    canvasEl.style.cursor = 'grabbing';
    canvasEl.setPointerCapture(e.pointerId);
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    dragVelY = 0;
    dragVelX = 0;
  });

  canvasEl.addEventListener('pointermove', function (e) {
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    dragVelY += dx * 0.014;
    dragVelX += dy * 0.014;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });

  canvasEl.addEventListener('pointerup', function (e) {
    isDragging = false;
    canvasEl.style.cursor = 'grab';
    canvasEl.releasePointerCapture(e.pointerId);
  });

  canvasEl.addEventListener('pointercancel', function () {
    isDragging = false;
    canvasEl.style.cursor = 'grab';
  });

  /* --- Keyframe tables --- */
  const KF_HEADLINE_OP = [[0, 1], [200, 1], [450, 0]];
  const KF_FLAT_OP = [[0, 1], [200, 1], [450, 0]];
  const KF_SCROLL_HINT_OP = [[0, 1], [100, 1], [300, 0]];
  const KF_CANVAS_OP = [[80, 0], [200, 0.3], [500, 1]];
  const KF_MOL_ROTY = [[0, 0.02], [700, 0.68]];
  const KF_MOL_ROTX = [[0, 0], [700, -0.20]];
  const KF_MOL_POS_X = [[700, 0], [1700, 2.4]];
  const KF_MOL_POS_Y_MOBILE = [[700, 0], [1700, -1.5]];
  const KF_COPY_OP = [[1000, 0], [1500, 1]];
  const KF_AUTO_ROTATE = [[700, 0], [1700, 1]];

  /* --- Projection helper --- */
  const projVec = new THREE.Vector3();
  const sizeVec = new THREE.Vector2();

  function projectToScreen(worldPos) {
    projVec.copy(worldPos);
    projVec.project(camera);
    renderer.getSize(sizeVec);
    return {
      x: (projVec.x * 0.5 + 0.5) * sizeVec.x,
      y: (-projVec.y * 0.5 + 0.5) * sizeVec.y
    };
  }

  /* --- Reusable THREE.Vector3 for world position queries --- */
  const tmpWorldVec = new THREE.Vector3();

  /* --- Tick function (registered in shared rAF loop) --- */
  function tick() {
    const scrollPx = utils.getScrollPx(chapterEl);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const mobile = isMobile();

    /* ---- Phase A: headline + flat view + scroll hint ---- */
    if (headline) headline.style.opacity = utils.kfVal(KF_HEADLINE_OP, scrollPx);
    if (flatView) flatView.style.opacity = utils.kfVal(KF_FLAT_OP, scrollPx);
    if (scrollHint) scrollHint.style.opacity = utils.kfVal(KF_SCROLL_HINT_OP, scrollPx);

    /* ---- Phase B: canvas opacity ---- */
    const canvasOp = utils.kfVal(KF_CANVAS_OP, scrollPx);
    canvasEl.style.opacity = canvasOp;

    /* ---- Scroll-driven rotation targets ---- */
    const scrollRotY = utils.kfVal(KF_MOL_ROTY, scrollPx);
    const scrollRotX = utils.kfVal(KF_MOL_ROTX, scrollPx);

    /* ---- Phase C: position + copy + auto-rotate ramp ---- */
    let posTargetX = 0;
    let posTargetY = 0;
    if (mobile) {
      posTargetY = utils.kfVal(KF_MOL_POS_Y_MOBILE, scrollPx);
    } else {
      posTargetX = utils.kfVal(KF_MOL_POS_X, scrollPx);
    }

    if (copyEl) copyEl.style.opacity = utils.kfVal(KF_COPY_OP, scrollPx);

    /* Auto-rotate: accumulates over time, scaled by ramp factor (lerped at 0.03/frame) */
    const autoRampTarget = utils.kfVal(KF_AUTO_ROTATE, scrollPx);
    autoRampCurrent += (autoRampTarget - autoRampCurrent) * 0.03;
    autoRotateAccum += autoRampCurrent * 0.38 * dt;

    /* Drag: accumulate velocity into persistent offset, damp velocity */
    dragAccumY += dragVelY;
    dragAccumX += dragVelX;
    if (!isDragging) {
      dragVelY *= 0.93;
      dragVelX *= 0.93;
    }
    /* Zero-out tiny residuals */
    if (Math.abs(dragVelY) < 0.0001) dragVelY = 0;
    if (Math.abs(dragVelX) < 0.0001) dragVelX = 0;

    /* Compose rotation target: scroll base + auto-rotate + drag offset */
    const rotTargetY = scrollRotY + autoRotateAccum + dragAccumY;
    const rotTargetX = scrollRotX + dragAccumX;

    /* Lerp current rotation toward target */
    rotCurrentY += (rotTargetY - rotCurrentY) * 0.06;
    rotCurrentX += (rotTargetX - rotCurrentX) * 0.06;
    molecule.rotation.y = rotCurrentY;
    molecule.rotation.x = rotCurrentX;

    /* Lerp position */
    posCurrentX += (posTargetX - posCurrentX) * 0.04;
    posCurrentY += (posTargetY - posCurrentY) * 0.04;
    molecule.position.x = posCurrentX;
    molecule.position.y = posCurrentY;

    /* ---- Idle breathing pulse ---- */
    const time = now / 1000;
    const breathN = 1 + 0.028 * Math.sin(time * 1.3);
    const breathO = 1 + 0.028 * Math.sin(time * 1.1 + 1.5);
    atomN.scale.set(breathN, breathN, breathN);
    atomO.scale.set(breathO, breathO, breathO);

    /* ---- Render ---- */
    if (canvasOp > 0.01) {
      renderer.render(scene, camera);
    }

    /* ---- Projected labels ---- */
    const labelsVisible = canvasOp > 0.3;
    if (labelN && labelO) {
      if (labelsVisible) {
        atomN.getWorldPosition(tmpWorldVec);
        const sN = projectToScreen(tmpWorldVec);
        labelN.style.left = sN.x + 'px';
        labelN.style.top = sN.y + 'px';
        labelN.style.opacity = '1';

        atomO.getWorldPosition(tmpWorldVec);
        const sO = projectToScreen(tmpWorldVec);
        labelO.style.left = sO.x + 'px';
        labelO.style.top = sO.y + 'px';
        labelO.style.opacity = '1';
      } else {
        labelN.style.opacity = '0';
        labelO.style.opacity = '0';
      }
    }

    /* ---- Ground shadows ---- */
    if (shadowN && shadowO) {
      if (labelsVisible) {
        const groundPlaneY = -1.2;

        atomN.getWorldPosition(tmpWorldVec);
        const nWorldY = tmpWorldVec.y;
        tmpWorldVec.y = groundPlaneY;
        const shN = projectToScreen(tmpWorldVec);
        shadowN.style.left = shN.x + 'px';
        shadowN.style.top = shN.y + 'px';
        shadowN.style.opacity = 0.25 * (1 - Math.max(0, Math.min(1, nWorldY / 2)));

        atomO.getWorldPosition(tmpWorldVec);
        const oWorldY = tmpWorldVec.y;
        tmpWorldVec.y = groundPlaneY;
        const shO = projectToScreen(tmpWorldVec);
        shadowO.style.left = shO.x + 'px';
        shadowO.style.top = shO.y + 'px';
        shadowO.style.opacity = 0.25 * (1 - Math.max(0, Math.min(1, oWorldY / 2)));
      } else {
        shadowN.style.opacity = '0';
        shadowO.style.opacity = '0';
      }
    }
  }

  /* --- Register in shared rAF loop --- */
  utils.registerRafCallback(tick);

  /* --- Resize handler --- */
  let resizeTimer = null;
  function handleResize() {
    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 120);
  }

  window.addEventListener('resize', onResize);

  handleResize();

  /* --- Cleanup on section unload (theme editor hot-swap) --- */
  function cleanup() {
    utils.unregisterRafCallback(tick);
    window.removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    renderer.dispose();
    geomN.dispose();
    geomO.dispose();
    matN.dispose();
    matO.dispose();
    bondGeom.dispose();
    bondMat.dispose();
    spriteTexture.dispose();
  }

  document.addEventListener('shopify:section:unload', function (e) {
    if (e.detail && e.detail.sectionId === sectionEl.dataset.sectionId) {
      cleanup();
    }
  });
}
