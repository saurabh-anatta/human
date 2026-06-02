import { Component } from '@theme/component';

/**
 * @typedef {object} Refs
 * @property {HTMLDialogElement} dialog
 * @property {HTMLButtonElement} trigger
 * @property {HTMLVideoElement} [videoDesktop]
 * @property {HTMLVideoElement} [videoMobile]
 * @property {HTMLVideoElement} [thumbVideo]
 * @property {HTMLElement[]} [thumbToggleIcon]
 * @property {HTMLElement[]} [playIcon]
 * @property {HTMLElement[]} [muteIcon]
 *
 * @extends Component<Refs>
 */
class VideoModalComponent extends Component {
  requiredRefs = ['dialog', 'trigger'];

  #previousScrollY = 0;
  #desktopMedia = window.matchMedia('(min-width: 750px)');
  #reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /** @type {IntersectionObserver | null} */
  #thumbObserver = null;

  get #activeVideo() {
    const { videoDesktop, videoMobile } = this.refs;
    if (!this.#desktopMedia.matches && videoMobile) return videoMobile;
    return videoDesktop ?? videoMobile ?? null;
  }

  /** @param {(video: HTMLVideoElement) => void} fn */
  #forEachVideo(fn) {
    const { videoDesktop, videoMobile } = this.refs;
    if (videoDesktop) fn(videoDesktop);
    if (videoMobile) fn(videoMobile);
  }

  connectedCallback() {
    super.connectedCallback();

    this.#forEachVideo((video) => {
      video.addEventListener('play', this.#syncPlayState);
      video.addEventListener('pause', this.#syncPlayState);
      video.addEventListener('volumechange', this.#syncVolumeState);
    });

    document.addEventListener('keydown', this.#handleKeydown);

    // autoplay thumbnail video when in view
    const { thumbVideo } = this.refs;
    if (thumbVideo instanceof HTMLVideoElement) {
      thumbVideo.addEventListener('play', this.#syncThumbState);
      thumbVideo.addEventListener('pause', this.#syncThumbState);

      if (
        thumbVideo.dataset.autoplay === 'true' &&
        !this.#reducedMotion.matches &&
        'IntersectionObserver' in window
      ) {
        this.#thumbObserver = new IntersectionObserver(
          ([entry]) => {
            if (!entry) return;
            if (entry.isIntersecting && thumbVideo.paused) {
              thumbVideo.play().catch(() => {});
            } else if (!entry.isIntersecting && !thumbVideo.paused) {
              thumbVideo.pause();
            }
          },
          { rootMargin: '200px 0px', threshold: 0 }
        );
        this.#thumbObserver.observe(thumbVideo);
      }

      this.#syncThumbState();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#thumbObserver?.disconnect();
    this.#thumbObserver = null;
    document.removeEventListener('keydown', this.#handleKeydown);
  }

  /* ───── Dialog lifecycle ───── */

  showDialog = () => {
    const { dialog } = this.refs;
    const video = this.#activeVideo;
    if (dialog.open || !video) return;

    this.#previousScrollY = window.scrollY;

    requestAnimationFrame(() => {
      document.body.style.width = '100%';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.#previousScrollY}px`;

      dialog.showModal();
      dialog.focus();
      dialog.addEventListener('click', this.#handleBackdropClick);
      dialog.addEventListener('cancel', this.#handleCancel);
      this.#desktopMedia.addEventListener('change', this.#handleViewportChange);

      this.#attachSources(video);
      this.#enableCaptions(video);
      this.#applyVolume(video);

      if (this.dataset.autoplay !== 'false') {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }

      this.#syncVolumeState();
    });
  };

  closeDialog = () => {
    const { dialog } = this.refs;
    if (!dialog.open) return;

    dialog.removeEventListener('click', this.#handleBackdropClick);
    dialog.removeEventListener('cancel', this.#handleCancel);
    this.#desktopMedia.removeEventListener('change', this.#handleViewportChange);

    this.#forEachVideo((video) => {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
      this.#detachSources(video);
    });

    document.body.style.width = '';
    document.body.style.position = '';
    document.body.style.top = '';
    window.scrollTo({ top: this.#previousScrollY, behavior: 'instant' });

    dialog.close();
  };

  /** @param {Event} event */
  #handleCancel = (event) => {
    event.preventDefault();
    this.closeDialog();
  };

  /**
   * @param {MouseEvent} event
   */
  #handleBackdropClick = (event) => {
    const { dialog } = this.refs;
    const target = event.target;
    if (target === dialog) {
      this.closeDialog();
      return;
    }
    if (target instanceof Element && target.classList.contains('video-modal__player')) {
      this.closeDialog();
    }
  };

  #handleViewportChange = () => {
    const { dialog, videoDesktop, videoMobile } = this.refs;
    if (!dialog.open || !videoDesktop || !videoMobile) return;

    const next = this.#activeVideo;
    const prev = next === videoDesktop ? videoMobile : videoDesktop;
    if (!next || next === prev) return;

    const sync = this.dataset.syncTimeline === 'true';
    const resumeTime = sync ? prev.currentTime : 0;
    const wasPlaying = sync ? !prev.paused : true;
    const wasMuted = sync ? prev.muted : undefined;

    prev.pause();
    this.#detachSources(prev);

    this.#attachSources(next);
    this.#enableCaptions(next);
    this.#applyVolume(next);
    if (wasMuted !== undefined) next.muted = wasMuted;

    const start = () => {
      if (resumeTime > 0) next.currentTime = resumeTime;
      if (wasPlaying) next.play().catch(() => {});
    };
    if (sync) {
      const onMeta = () => {
        start();
        next.removeEventListener('loadedmetadata', onMeta);
      };
      next.addEventListener('loadedmetadata', onMeta);
    } else {
      start();
    }
  };

  /* ───── Controls ───── */

  /** @param {KeyboardEvent} event */
  #handleKeydown = (event) => {
    const { dialog } = this.refs;
    if (!dialog.open) return;

    const onButton = event.target instanceof HTMLButtonElement;
    const video = this.#activeVideo;

    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        if (onButton) break;
        event.preventDefault();
        this.togglePlay();
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        this.toggleMute();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (video) video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (video) video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (video) {
          video.volume = Math.min(1, video.volume + 0.1);
          video.muted = false;
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (video) video.volume = Math.max(0, video.volume - 0.1);
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          video?.requestFullscreen?.();
        }
        break;
    }
  };

  togglePlay = () => {
    const video = this.#activeVideo;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  toggleMute = () => {
    const video = this.#activeVideo;
    if (!video) return;
    video.muted = !video.muted;
  };

  /** @param {MouseEvent} event */
  toggleThumb = (event) => {
    const { thumbVideo } = this.refs;
    if (!(thumbVideo instanceof HTMLVideoElement)) return;
    event.stopPropagation();

    if (thumbVideo.paused) {
      thumbVideo.play().catch(() => {});
    } else {
      thumbVideo.pause();
    }
    this.#syncThumbState();
  };

  /* ───── State sync ───── */

  #syncPlayState = () => {
    const video = this.#activeVideo;
    if (!video) return;
    const { playIcon } = this.refs;
    const playLabel = video.paused
      ? (this.dataset.labelPlay ?? 'Play')
      : (this.dataset.labelPause ?? 'Pause');
    for (const btn of this.querySelectorAll('[data-play-button]')) {
      btn.setAttribute('aria-label', playLabel);
    }
    if (!playIcon) return;
    const state = video.paused ? 'paused' : 'playing';
    for (const icon of playIcon) icon.toggleAttribute('hidden', icon.dataset.state !== state);
  };

  #syncVolumeState = () => {
    const video = this.#activeVideo;
    if (!video) return;
    const { muteIcon, muteButton } = this.refs;
    const muted = video.muted || video.volume === 0;

    if (muteIcon) {
      const state = muted ? 'muted' : 'unmuted';
      for (const icon of muteIcon) icon.toggleAttribute('hidden', icon.dataset.state !== state);
    }

    if (muteButton instanceof HTMLElement) {
      muteButton.setAttribute(
        'aria-label',
        muted
          ? (muteButton.dataset.labelUnmute ?? 'Unmute')
          : (muteButton.dataset.labelMute ?? 'Mute')
      );
    }
  };

  #syncThumbState = () => {
    const { thumbVideo, thumbToggleIcon } = this.refs;
    if (!(thumbVideo instanceof HTMLVideoElement) || !thumbToggleIcon) return;
    const state = thumbVideo.paused ? 'paused' : 'playing';
    for (const icon of thumbToggleIcon)
      icon.toggleAttribute('hidden', icon.dataset.state !== state);

    const button = this.querySelector('.video-modal__thumb-toggle');
    if (button instanceof HTMLElement) {
      button.setAttribute(
        'aria-label',
        thumbVideo.paused
          ? (this.dataset.labelPlay ?? 'Play')
          : (this.dataset.labelPause ?? 'Pause')
      );
    }
  };

  /* ───── Source management ───── */

  /** @param {HTMLVideoElement} video */
  #attachSources(video) {
    const sources = video.querySelectorAll('source[data-src]');
    for (const source of sources) {
      const url = source instanceof HTMLSourceElement ? source.dataset.src : null;
      if (url && !source.getAttribute('src')) source.setAttribute('src', url);
    }
    video.load();
  }

  /** @param {HTMLVideoElement} video */
  #detachSources(video) {
    const sources = video.querySelectorAll('source[data-src]');
    for (const source of sources) source.removeAttribute('src');
  }

  /** @param {HTMLVideoElement} video */
  #enableCaptions(video) {
    const tracks = video.textTracks;
    if (!tracks || tracks.length === 0) return;
    for (const track of tracks) {
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        track.mode = 'showing';
        break;
      }
    }
  }

  /** @param {HTMLVideoElement} video */
  #applyVolume(video) {
    const volume = Number(this.dataset.volume);
    if (!Number.isNaN(volume)) video.volume = Math.min(1, Math.max(0, volume));
    video.muted = this.dataset.startUnmuted !== 'true';
  }
}

if (!customElements.get('video-modal-component')) {
  customElements.define('video-modal-component', VideoModalComponent);
}
