// content_script.js
(function () {
  'use strict';

  if (window.hasScreenshotCapture) return;
  window.hasScreenshotCapture = true;

  console.log('[PostShot] content script loaded on', window.location.href);

  // Listen for commands from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoLongPostCapture') {
      console.log('[PostShot] autoLongPostCapture requested');
      autoCaptureLongPost()
        .then((dataUrl) => sendResponse({ success: true, dataUrl }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async
    }
  });

  // ---- High-level helpers ----

  // Auto‑capture up to N viewports starting from current scroll
  async function autoCaptureLongPost() {
    const MAX_STEPS = 4;   // cap, you can make 4–5
    const OVERLAP = 80;    // px overlap between frames
    const DELAY = 400;     // ms delay so scroll feels natural

    let originalState = null;
    const screenshots = [];

    try {
      originalState = await savePageState();
      await applyComprehensiveCaptureMode();

      const dims = getPageDimensions();
      const stepHeight = dims.viewportHeight - OVERLAP;

      let currentY = window.pageYOffset;

      // Detect current post and its bottom
      const POST_SELECTOR =
        '.feed-shared-update-v2__control-menu-container, .fie-impression-container';
      const centerElem = document.elementFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 3
      );
      const post = centerElem && centerElem.closest(POST_SELECTOR);
      let postBottom = null;
      if (post) {
        const rect = post.getBoundingClientRect();
        postBottom = window.scrollY + rect.bottom;
        console.log('[PostShot] detected post bottom at', postBottom);
      }

      for (let i = 0; i < MAX_STEPS; i++) {
        // Let layout settle a bit then capture
        await new Promise((r) => setTimeout(r, DELAY));
        const shot = await captureViewport();
        screenshots.push({ dataUrl: shot.dataUrl });
        console.log('[PostShot] auto step', i + 1, 'captured');

        // Compute next scroll position
        const nextY = currentY + stepHeight;
        const maxScroll = dims.totalHeight - dims.viewportHeight;

        // Stop if next viewport would go past end of this post
        if (postBottom !== null) {
          const nextBottomViewport = nextY + dims.viewportHeight;
          if (nextBottomViewport >= postBottom + 40) {
            console.log('[PostShot] reached end of post, stopping auto capture');
            break;
          }
        }

        // Stop if near page bottom
        if (nextY >= maxScroll) {
          console.log('[PostShot] reached page bottom, stopping auto capture');
          break;
        }

        currentY = nextY;
        window.scrollTo({ top: currentY, behavior: 'instant' });
      }

      return await processScreenshots(screenshots);
    } finally {
      await restorePageState(originalState);
    }
  }

  // ---- State save / restore ----

  async function savePageState() {
    const state = {
      originalScroll: window.pageYOffset,
      originalOverflow: {
        html: document.documentElement.style.overflow,
        body: document.body.style.overflow
      },
      timestamp: Date.now()
    };
    console.log('[PostShot] Page state saved');
    return state;
  }

  async function restorePageState(originalState) {
    if (!originalState) return;

    console.log('[PostShot] Restoring original page state...');
    try {
      const tempStyle = document.getElementById(window.screenshotTempStyleId);
      if (tempStyle && tempStyle.parentNode) {
        tempStyle.parentNode.removeChild(tempStyle);
      }

      window.scrollTo({
        top: originalState.originalScroll,
        behavior: 'instant'
      });

      document.documentElement.style.overflow =
        originalState.originalOverflow.html;
      document.body.style.overflow = originalState.originalOverflow.body;

      delete window.screenshotTempStyleId;

      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log('[PostShot] Page state restored');
    } catch (error) {
      console.error('[PostShot] Error during state restoration:', error);
    }
  }

  // ---- Capture mode (hide sticky headers etc.) ----

  async function applyComprehensiveCaptureMode() {
    console.log('[PostShot] Applying LinkedIn optimizations (hide sticky headers)...');

    const tempStyleId = `screenshot-temp-${Date.now()}`;
    const tempStyle = document.createElement('style');
    tempStyle.id = tempStyleId;

    const siteOptimizations = getSiteSpecificOptimizations();

    tempStyle.textContent = `
      /* LinkedIn full profile/feed capture mode - comprehensive sticky header fix */
      ${siteOptimizations.hideSelectors.join(', ')} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        position: absolute !important;
        top: -9999px !important;
        left: -9999px !important;
        z-index: -1 !important;
      }

      [style*="position: fixed"]:not([data-screenshot-keep]),
      [style*="position: sticky"]:not([data-screenshot-keep]),
      .fixed-top, .sticky-top, .navbar-fixed-top {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }

      ${siteOptimizations.layoutAdjustments}

      * {
        animation-play-state: paused !important;
        transition: none !important;
      }

      html, body {
        overflow: hidden !important;
      }

      main, article, .content, [role="main"] {
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;

    document.head.appendChild(tempStyle);
    window.screenshotTempStyleId = tempStyleId;

    await new Promise((resolve) => setTimeout(resolve, 300));
    console.log('[PostShot] Optimizations applied');
  }

  function getSiteSpecificOptimizations() {
    return {
      hideSelectors: [
        '.scaffold-layout-toolbar',
        '.scaffold-layout-toolbar--is-fixed',
        '.scaffold-layout-toolbar--is-fixed-visible',
        'section.scaffold-layout-toolbar',
        '.global-nav',
        '.global-nav__nav',
        '.scaffold-layout__header',
        '.scaffold-layout__rail',
        '.scaffold-layout__aside',
        '.scaffold-layout__sidebar',
        '.msg-overlay-conversation-bubble',
        '.notifications-overlay',
        '.artdeco-toasts',
        '.pv-profile-sticky-header-v2',
        '.pv-top-card-sticky-header',
        '.lp-save-lead-btn'
      ],
      layoutAdjustments: `
        .scaffold-layout__main {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        .scaffold-layout__content {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
        .scaffold-layout-container {
          padding-top: 0 !important;
          margin-top: 0 !important;
        }
        .scaffold-layout__rail,
        .scaffold-layout__aside,
        .scaffold-layout__sidebar {
          width: 0 !important;
          max-width: 0 !important;
          flex: 0 0 0 !important;
        }
        .scaffold-layout__content--main {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 20px !important;
        }
        .pv-top-card,
        .pv-profile-section,
        .pvs-profile-section,
        .artdeco-card {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `
    };
  }

  // ---- Stitch multiple segments vertically ----

  async function processScreenshots(screenshots) {
    if (!screenshots || screenshots.length === 0) {
      throw new Error('No screenshots to process');
    }

    if (screenshots.length === 1) {
      console.log('[PostShot] Single screenshot - no stitching needed');
      return screenshots[0].dataUrl;
    }

    console.log('[PostShot] Stitching', screenshots.length, 'segments');

    const dims = getPageDimensions();
    const segmentCount = screenshots.length;
    const dpr = dims.devicePixelRatio;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: false,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    canvas.width = dims.viewportWidth * dpr;
    canvas.height = dims.viewportHeight * segmentCount * dpr;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const img = await loadImage(screenshot.dataUrl);

      const destY = i * dims.viewportHeight * dpr;
      ctx.drawImage(img, 0, destY);

      console.log('[PostShot] Placed segment', i + 1, 'at', destY);
    }

    const finalDataUrl = canvas.toDataURL('image/png', 1.0);
    canvas.width = canvas.height = 0;

    console.log('[PostShot] Stitching complete');
    return finalDataUrl;
  }

  // ---- Utils ----

  function getPageDimensions() {
    const body = document.body;
    const html = document.documentElement;

    const totalHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );

    return {
      totalHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  async function captureViewport() {
    const response = await chrome.runtime.sendMessage({ action: 'captureVisible' });

    if (!response || !response.ok || !response.dataUrl) {
      throw new Error(
        response && response.error ? response.error : 'Viewport capture failed'
      );
    }

    return {
      dataUrl: response.dataUrl,
      capturedAt: Date.now()
    };
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image loading failed'));
      img.src = dataUrl;
    });
  }

  async function downloadImage(dataUrl) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const hostname = window.location.hostname.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `postshot-${hostname}-${timestamp}.png`;

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'downloadImage',
          dataUrl,
          filename
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.ok) {
            console.log('[PostShot] Screenshot saved as', filename);
            resolve();
          } else {
            reject(new Error('Download failed'));
          }
        }
      );
    });
  }
})();
