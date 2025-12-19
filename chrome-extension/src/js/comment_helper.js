// src/js/comment_helper.js (Merged with content_script.js logic)
console.log('[CommentHelper] script loaded on', window.location.href);

(function () {
  'use strict';

  // --- PostShot/Screenshot Logic (Moved from content_script.js) ---

  // Check to prevent double injection, keeping the old check for safety
  if (window.__lp_comment_helper_injected) return;
  window.__lp_comment_helper_injected = true;

  // Global flag to indicate screenshot logic is present (used by external components)
  if (window.hasScreenshotCapture) return;
  window.hasScreenshotCapture = true;
  console.log('[PostShot/CommentHelper] Screenshot capture logic loaded.');

  if (!window.lpScreenshotEngine) {
    console.error('[CommentHelper] lpScreenshotEngine not found on window');
    return;
  }

  const {
    safeLog,
    setScreenshotContext,
    savePageState,
    restorePageState,
    applyComprehensiveCaptureMode,
    getPageDimensions,
    loadImage,
    captureViewport,
    dataUrlToBlob 

  } = window.lpScreenshotEngine;

  setScreenshotContext('CommentHelper');

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
        '.feed-shared-update-v2__control-menu-container, .fie-impression-container, .update-components-update-v2';
      const centerElem = document.elementFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 3
      );
      // Find the closest ancestor that represents a post/update
      const post = centerElem && centerElem.closest(POST_SELECTOR);
      let postBottom = null;
      if (post) {
        const rect = post.getBoundingClientRect();
        postBottom = window.scrollY + rect.bottom;
        safeLog('[CommentHelper] detected post bottom at', postBottom);
      }

      for (let i = 0; i < MAX_STEPS; i++) {
        // Let layout settle a bit then capture
        await new Promise((r) => setTimeout(r, DELAY));
        const shot = await captureViewport();
        screenshots.push({ dataUrl: shot.dataUrl });
        safeLog('[CommentHelper] auto step', i + 1, 'captured');

        // Compute next scroll position
        const nextY = currentY + stepHeight;
        const maxScroll = dims.totalHeight - dims.viewportHeight;

        // Stop if next viewport would go past end of this post
        if (postBottom !== null) {
          if (nextY >= postBottom - 100) {
            safeLog('[CommentHelper] next scroll past end of post, stopping auto capture');
            break;
          }
        }

        // Stop if near page bottom
        if (nextY >= maxScroll - 5) {
          safeLog('[CommentHelper] reached page bottom, stopping auto capture');
          break;
        }

        currentY = nextY;
        window.scrollTo({ top: currentY, behavior: 'instant' });
      }

      return await processPostScreenshots(screenshots);
    } finally {
      await restorePageState(originalState);
    }
  }

  // --- Stitch multiple segments vertically (post-specific) ---
  async function processPostScreenshots(screenshots) {
    if (!screenshots || screenshots.length === 0) {
      throw new Error('No screenshots to process');
    }

    if (screenshots.length === 1) {
      safeLog('[CommentHelper] Single screenshot - no stitching needed');
      return screenshots[0].dataUrl;
    }

    safeLog('[CommentHelper] Stitching', screenshots.length, 'segments');

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

      safeLog('[CommentHelper] Placed segment', i + 1, 'at', destY);
    }

    const finalDataUrl = canvas.toDataURL('image/png', 1.0);
    canvas.width = canvas.height = 0;

    safeLog('[CommentHelper] Stitching complete');
    return finalDataUrl;
  }

  // --- Comment Helper UI/Logic (Original comment_helper.js logic) ---

  function isLinkedInFeed() {
    return (
      window.location.hostname === 'www.linkedin.com' &&
      window.location.pathname.startsWith('/feed')
    );
  }

  let helperBtn = null;
  let helperModal = null;

  function createUiIfNeeded() {
    if (helperBtn || helperModal) return;

    // Floating button
    helperBtn = document.createElement('div');
    helperBtn.className = 'lp-comment-helper-btn';
    helperBtn.innerHTML = '💬';
    helperBtn.title = 'Comment Helper';
    helperBtn.style.display = 'flex';
    document.body.appendChild(helperBtn);

    // Modal
    helperModal = document.createElement('div');
    helperModal.className = 'lp-comment-helper-modal';
    helperModal.innerHTML = `
      <div class="lp-ch-card">
        <div class="lp-ch-header">
          <div class="lp-ch-title-row">
            <span class="lp-ch-icon">💬</span>
            <div>
              <div class="lp-ch-title">Comment Helper</div>
              <div class="lp-ch-subtitle">Draft a smart reply in seconds.</div>
            </div>
          </div>
        </div>

        <div class="lp-ch-info">
          <strong>Tip:</strong>
          <span>Before running analysis, keep the post text and any key image clearly visible on your screen.</span>
        </div>

        <div class="lp-ch-tones-label">Choose the tone for your comment:</div>
        <div class="lp-ch-tone-row">
          <button class="lp-ch-tone-chip lp-ch-tone-chip--active" data-tone="positive">😊 Positive</button>
          <button class="lp-ch-tone-chip" data-tone="insightful">💡 Insightful</button>
          <button class="lp-ch-tone-chip" data-tone="celebration">🎉 Congratulations</button>
        </div>

        <label class="lp-ch-draft-label">Draft comment</label>
        <textarea class="lp-ch-draft-input" id="lp-ch-draft" placeholder="Your AI-generated comment will appear here. You can edit it before posting."></textarea>

        <div class="lp-ch-footer">
          <button class="lp-ch-btn-secondary" id="lp-ch-close">Close</button>
          <button class="lp-ch-btn-primary" id="lp-ch-analyze">Generate comment</button>
        </div>
      </div>
    `;
    document.body.appendChild(helperModal);

    // Open modal
    helperBtn.addEventListener('click', () => {
      if (window.lpActiveModalId && window.lpActiveModalId !== 'comment-helper') {
        safeLog('[CommentHelper] Another modal is open, cannot open Comment Helper.');
        return;
      }
      window.lpActiveModalId = 'comment-helper';
      helperModal.style.display = 'block';
    });

    // Close handlers
    const closeBtn = helperModal.querySelector('#lp-ch-close');
    closeBtn.addEventListener('click', () => {
      helperModal.style.display = 'none';
      window.lpActiveModalId = null;
      if (draftInput) draftInput.value = '';
    });

    // Global click: guard when elements are null
    document.addEventListener('click', (e) => {
      if (!helperModal || !helperBtn) return;

      if (!helperModal.contains(e.target) && !helperBtn.contains(e.target)) {
        if (helperModal.style.display === 'block') {
          helperModal.style.display = 'none';
          window.lpActiveModalId = null;
          if (draftInput) draftInput.value = '';
        }
      }
    });

    // Tone selection + draft behavior
    const toneButtons = helperModal.querySelectorAll('.lp-ch-tone-chip');
    let selectedTone = 'positive';

    toneButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toneButtons.forEach((b) =>
          b.classList.remove('lp-ch-tone-chip--active')
        );
        btn.classList.add('lp-ch-tone-chip--active');
        selectedTone = btn.dataset.tone;
      });
    });

    const draftInput = helperModal.querySelector('#lp-ch-draft');
    const analyzeBtn = helperModal.querySelector('#lp-ch-analyze');

if (analyzeBtn && draftInput) {
  analyzeBtn.addEventListener('click', async () => {
    // Must be logged in
    if (!window.tokenManager || typeof window.tokenManager.getToken !== 'function') {
      if (window.lpShowToast) {
        window.lpShowToast(
          'Please log in from the extension before generating a comment.'
        );
      }
      return;
    }

    // Prevent double click while busy
    if (analyzeBtn.dataset.busy === '1') {
      return;
    }
    analyzeBtn.dataset.busy = '1';

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Checking quota...';
    draftInput.value = 'Checking your comment limit...';

    let postImageDataUrl = null;

    try {
      // === NEW: check quota BEFORE screenshot ===
      const accessToken = await window.tokenManager.getToken();
      if (!accessToken) {
        throw new Error('No valid access token. Please log in again.');
      }

      const quotaResp = await fetch('http://127.0.0.1:8000/comment-generator/check-quota/', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + accessToken
        }
      });

      const quotaJson = await quotaResp.json().catch(() => ({}));

      if (quotaResp.status === 403 && quotaJson && quotaJson.limit_reached) {
        const msg =
          quotaJson.detail ||
          '⚠️ Your trial comment limit is reached. Please buy a plan to continue.';

        if (window.lpShowToast) {
          window.lpShowToast(msg);
        }

        if (quotaJson.upgrade_url) {
          setTimeout(() => {
            window.open(quotaJson.upgrade_url, '_blank');
          }, 800);
        }

        analyzeBtn.dataset.busy = '0';
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Generate comment';
        draftInput.value = '';
        return; // STOP: no screenshot, no generate API
      }

      if (!quotaResp.ok) {
        const msg =
          (quotaJson && (quotaJson.error || quotaJson.detail || quotaJson.message)) ||
          `Quota check failed with status ${quotaResp.status}`;
        throw new Error(msg);
      }
      // === END NEW QUOTA CHECK ===

      // Now safe to proceed with screenshot
      // Hide floating button + modal during capture only
      if (helperBtn) {
        helperBtn.style.display = 'none';
      }
      if (helperModal) {
        helperModal.style.display = 'none';
        window.lpActiveModalId = null;
      }

      analyzeBtn.textContent = '⏳ Capturing post...';
      draftInput.value = 'Capturing post segments and stitching them together...';

      // 1. Capture the post image (stitched)
      postImageDataUrl = await autoCaptureLongPost();

      // ✔ As soon as screenshot is done, bring UI back
      if (helperBtn) helperBtn.style.display = 'flex';
      if (helperModal) helperModal.style.display = 'block';
      window.lpActiveModalId = 'comment-helper';

      analyzeBtn.textContent = '⏳ Generating comment...';
      draftInput.value =
        'Image captured. Analyzing the visible post and generating a comment, please wait...';
    } catch (err) {
      analyzeBtn.dataset.busy = '0';
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Generate comment';
      draftInput.value = '';
      const errorMessage = err.message || 'Comment generation failed.';
      if (window.lpShowToast) {
        window.lpShowToast('⚠️ ' + errorMessage);
      } else {
        console.error('[CommentHelper] ' + errorMessage);
      }
      // Show UI again before exit
      if (helperBtn) helperBtn.style.display = 'flex';
      if (helperModal) helperModal.style.display = 'block';
      window.lpActiveModalId = 'comment-helper';
      return;
    }

    try {
      // 2. Convert dataUrl to Blob
      const blob = dataUrlToBlob(postImageDataUrl);

      // 3. Get token (already have accessToken above, but safe)
      const accessToken = await window.tokenManager.getToken();
      if (!accessToken) {
        throw new Error('No valid access token. Please log in again.');
      }

      // 4. Build FormData
      const formData = new FormData();
      formData.append('image', blob, 'post.png');
      formData.append('tone', selectedTone || 'supportive_empathetic');
      formData.append('post_url', window.location.href);

      // 5. POST to comment-generator endpoint
      const resp = await fetch('http://127.0.0.1:8000/comment-generator/generate/', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken
        },
        body: formData
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg =
          (json && (json.error || json.detail || json.message)) ||
          `Comment API failed with status ${resp.status}`;
        throw new Error(msg);
      }

      // 6. Call latest endpoint for structured result
      const latestResp = await fetch('http://127.0.0.1:8000/comment-generator/latest/', {
        headers: {
          Authorization: 'Bearer ' + accessToken
        }
      });

      const latestJson = await latestResp.json().catch(() => ({}));
      if (!latestResp.ok) {
        const msg =
          (latestJson && (latestJson.error || latestJson.detail || latestJson.message)) ||
          `Latest API failed with status ${latestResp.status}`;
        throw new Error(msg);
      }

      const primary = latestJson.primary_comment || latestJson.comment || '';
      const altComments = Array.isArray(latestJson.alt_comments)
        ? latestJson.alt_comments
        : [];
      const styleTags = Array.isArray(latestJson.style_tags)
        ? latestJson.style_tags
        : [];

      analyzeBtn.dataset.busy = '0';
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = '✅ Comment ready';

      draftInput.value = primary;
      safeLog('[CommentHelper] Alt comments:', altComments);
      safeLog('[CommentHelper] Style tags:', styleTags);

      setTimeout(() => {
        analyzeBtn.textContent = 'Generate comment';
      }, 3000);

      if (window.lpShowToast) {
        window.lpShowToast(
          '✨ Comment generated. Review and post it on LinkedIn.'
        );
      }
    } catch (err) {
      analyzeBtn.dataset.busy = '0';
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Generate comment';
      draftInput.value = '';
      const errorMessage = err.message || 'Comment generation failed.';
      if (window.lpShowToast) {
        window.lpShowToast('⚠️ ' + errorMessage);
      } else {
        console.error('[CommentHelper] ' + errorMessage);
      }
    }
  });
}


  }

  function removeUi() {
    if (helperBtn) {
      helperBtn.remove();
      helperBtn = null;
    }
    if (helperModal) {
      const draftInput = helperModal.querySelector('#lp-ch-draft');
      if (draftInput) draftInput.value = '';
      helperModal.remove();
      helperModal = null;
    }
    if (window.lpActiveModalId === 'comment-helper') {
      window.lpActiveModalId = null;
    }
  }

  async function checkAuthAndToggleHelper() {
    if (!isLinkedInFeed()) {
      removeUi();
      return;
    }

    try {
      const token = await window.tokenManager.getToken();
      if (token) {
        createUiIfNeeded();
      } else {
        removeUi();
      }
    } catch (e) {
      console.error('[CommentHelper] checkAuthAndToggleHelper error', e);
      removeUi();
    }
  }

  // Initial run
  checkAuthAndToggleHelper();

  // React to URL changes (SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkAuthAndToggleHelper();
    }
  }).observe(document, { subtree: true, childList: true });

  // React to token changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lp_device_token_v1) {
      checkAuthAndToggleHelper();
    }
  });

  // React to logout broadcast
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'LP_EXTENSION_LOGOUT') {
      removeUi();
    }
  });

  // --- External Message Listener for Screenshot Capture (optional) ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autoLongPostCapture') {
      safeLog('[CommentHelper] autoLongPostCapture requested via message');
      autoCaptureLongPost()
        .then((dataUrl) => sendResponse({ success: true, dataUrl }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async
    }
  });
})();
