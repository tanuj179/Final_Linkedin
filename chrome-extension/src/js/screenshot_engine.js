// src/js/screenshot_engine.js
// Shared screenshot engine for LinkedIn (profile + posts)

(function () {
  'use strict';

  // Avoid double injection
  if (window.__lp_screenshot_engine_injected) return;
  window.__lp_screenshot_engine_injected = true;

  // Current context: "ProfileOptimizer", "PostShot", etc.
  let screenshotContext = 'ScreenshotEngine';

  function setScreenshotContext(ctx) {
    screenshotContext = ctx || 'ScreenshotEngine';
  }

  // Basic logging helper
  function safeLog(...args) {
    try {
      console.log(`[${screenshotContext}]`, ...args);
    } catch (e) {}
  }

  // Send message to service worker for captureVisible
  function sendMessageAsync(message) {
    return new Promise((resolve) => {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          console.error('[ScreenshotEngine] chrome.runtime is undefined!');
          return resolve(null);
        }
        chrome.runtime.sendMessage(message, (resp) => {
          if (chrome.runtime.lastError) {
            console.warn(
              '[ScreenshotEngine] sendMessage lastError:',
              chrome.runtime.lastError.message
            );
            return resolve(null);
          }
          resolve(resp || null);
        });
      } catch (e) {
        console.error('[ScreenshotEngine] sendMessage exception', e);
        resolve(null);
      }
    });
  }

  // --------- STATE SAVE / RESTORE ---------

  async function savePageState() {
    const state = {
      originalScroll: window.pageYOffset,
      originalOverflow: {
        html: document.documentElement.style.overflow,
        body: document.body.style.overflow
      },
      timestamp: Date.now()
    };

    safeLog('Page state saved');
    return state;
  }

  async function restorePageState(originalState) {
    if (!originalState) return;

    safeLog('Restoring page state...');

    const tempStyle = document.getElementById(window.screenshotTempStyleId);
    if (tempStyle && tempStyle.parentNode) {
      tempStyle.parentNode.removeChild(tempStyle);
    }

    window.scrollTo({ top: originalState.originalScroll, behavior: 'instant' });
    document.documentElement.style.overflow = originalState.originalOverflow.html;
    document.body.style.overflow = originalState.originalOverflow.body;

    delete window.screenshotTempStyleId;

    await new Promise((resolve) => setTimeout(resolve, 150));

    if (window.lpUpdateSaveLeadVisibility) {
      await window.lpUpdateSaveLeadVisibility();
    }

    safeLog('Page fully restored');
  }

  // --------- CAPTURE MODE CSS ---------

  async function applyComprehensiveCaptureMode() {
    safeLog('Applying LinkedIn optimizations (hide sticky headers)...');

    const tempStyleId = `screenshot-temp-${Date.now()}`;
    const tempStyle = document.createElement('style');
    tempStyle.id = tempStyleId;

    const siteOptimizations = getSiteSpecificOptimizations();

    tempStyle.textContent = `
      /* LinkedIn full profile capture mode - comprehensive sticky header fix */
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

    safeLog('Optimizations applied');
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
      '.scaffold-layout__sidebar',              // new: sidebar container
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


  // --------- MULTI-SCROLL CAPTURE ---------

  function getProfileScrollBounds() {
    const main = document.querySelector('.scaffold-layout__main');
    const mainRect = main ? main.getBoundingClientRect() : null;

    const viewportTop = window.scrollY;

    const top = mainRect ? viewportTop + mainRect.top : 0;

    const bottom = mainRect
      ? viewportTop + mainRect.bottom
      : document.documentElement.scrollHeight;

    const minBottom = top + window.innerHeight;

    return {
      top: Math.max(0, top),
      bottom: Math.max(minBottom, bottom)
    };
  }

  async function captureWithProfessionalTechniques() {
    const dimensions = getPageDimensions();
    safeLog('Page dimensions:', dimensions);

    const screenshots = [];
    const { viewportHeight } = dimensions;
    const OVERLAP_PIXELS = 100;
    const CAPTURE_DELAY = 600;

    const bounds = getProfileScrollBounds();
    const effectiveHeight = viewportHeight - OVERLAP_PIXELS;
    const totalRange = bounds.bottom - bounds.top;

    if (totalRange <= viewportHeight * 1.2) {
      safeLog('Short main area - single capture');
      window.scrollTo({ top: bounds.top, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, CAPTURE_DELAY));
      const screenshot = await captureViewport();
      screenshots.push({
        ...screenshot,
        scrollPosition: bounds.top,
        index: 0,
        isSingle: true
      });
    } else {
      const totalCaptures = Math.ceil(totalRange / effectiveHeight);
      safeLog(`Long main area - ${totalCaptures} captures`);

      const maxY = bounds.bottom - viewportHeight;

      for (let i = 0; i < totalCaptures; i++) {
        let scrollY = bounds.top + i * effectiveHeight;
        if (scrollY > maxY) scrollY = maxY;

        safeLog(`Capture ${i + 1}/${totalCaptures} at ${scrollY}`);

        window.scrollTo({ top: scrollY, behavior: 'instant' });

        await reHideStickyElements();
        await new Promise((resolve) => setTimeout(resolve, CAPTURE_DELAY));

        const screenshot = await captureViewport();
        screenshots.push({
          ...screenshot,
          scrollPosition: scrollY,
          index: i,
          isFirst: i === 0,
          isLast: i === totalCaptures - 1
        });

        if (scrollY >= maxY) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    safeLog(`Captured ${screenshots.length} bounded viewports`);
    return screenshots;
  }

  async function reHideStickyElements() {
    const selectors = [
      '.scaffold-layout-toolbar',
      '.scaffold-layout-toolbar--is-fixed',
      '.scaffold-layout-toolbar--is-fixed-visible',
      'section.scaffold-layout-toolbar'
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.cssText = `
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          position: absolute !important;
          top: -9999px !important;
        `;
      });
    });
  }

  // --------- STITCHING ---------

  async function processScreenshots(screenshots) {
    if (screenshots.length === 1) {
      safeLog('Single screenshot - no stitch');
      return screenshots[0].dataUrl;
    }

    safeLog(`Stitching ${screenshots.length} screenshots...`);
    const dimensions = getPageDimensions();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', {
      alpha: false,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    canvas.width = dimensions.viewportWidth * dimensions.devicePixelRatio;
    canvas.height = dimensions.totalHeight * dimensions.devicePixelRatio;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const OVERLAP_PIXELS = 100;
    const overlapPx = OVERLAP_PIXELS * dimensions.devicePixelRatio;

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      const img = await loadImage(screenshot.dataUrl);

      const destY = screenshot.scrollPosition * dimensions.devicePixelRatio;

      if (i > 0 && !screenshot.isLast) {
        ctx.drawImage(
          img,
          0,
          overlapPx,
          img.width,
          img.height - overlapPx,
          0,
          destY,
          img.width,
          img.height - overlapPx
        );
      } else {
        ctx.drawImage(img, 0, destY);
      }

      safeLog(`Stitched part ${i + 1}/${screenshots.length}`);
    }

    const finalDataUrl = canvas.toDataURL('image/png', 1.0);
    canvas.remove();

    safeLog('Stitching complete');
    return finalDataUrl;
  }

  // --------- HELPERS ---------

  function getPageDimensions() {
    return {
      totalHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  async function captureViewport() {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new Error('Chrome Extension API not available. Check manifest and permissions.');
    }

    const response = await sendMessageAsync({ action: 'captureVisible' });

    if (!response || !response.success || !response.dataUrl) {
      throw new Error((response && response.error) || 'Viewport capture failed');
    }

    return { dataUrl: response.dataUrl, capturedAt: Date.now() };
  }

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = dataUrl;
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0].match(/data:(.*);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(parts[1]);
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binary.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }

  // Expose engine on window for other content scripts
  window.lpScreenshotEngine = {
    safeLog,
    setScreenshotContext,
    sendMessageAsync,
    savePageState,
    restorePageState,
    applyComprehensiveCaptureMode,
    getSiteSpecificOptimizations,
    getProfileScrollBounds,
    captureWithProfessionalTechniques,
    reHideStickyElements,
    processScreenshots,
    getPageDimensions,
    captureViewport,
    loadImage,
    dataUrlToBlob
  };
})();
