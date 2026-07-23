## Recent
[chat] createScrollProgress (story-scroll-utils.js) reports progress=1 immediately when totalDistance <= 0 (section scrollHeight <= viewport). Never use it for non-pinned 100svh sections (e.g. cinematic entry hero) — fade targets get opacity 0 on load. Use a local scroll handler based on -rect.top / rect.height instead.
