// src/js/profile_optimizer.js
// Core engine wrapper for LinkedIn full-profile screenshot + upload (no UI)

(function () {
  'use strict';

  if (window.__lp_profile_optimizer_engine_injected) return;
  window.__lp_profile_optimizer_engine_injected = true;

  // Require shared screenshot engine
  if (!window.lpScreenshotEngine) {
    console.error('[ProfileOptimizer] lpScreenshotEngine not found on window');
    return;
  }

  // Destructure what we need from the shared engine
  const {
    safeLog,
    setScreenshotContext,
    savePageState,
    restorePageState,
    applyComprehensiveCaptureMode,
    captureWithProfessionalTechniques,
    processScreenshots,
    dataUrlToBlob
  } = window.lpScreenshotEngine;

  // Set logging context for this module
  setScreenshotContext('ProfileOptimizer');

  function isLinkedInProfile() {
    try {
      const url = window.location.href;
      const profilePattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/;
      return profilePattern.test(url);
    } catch (e) {
      return false;
    }
  }

  function getProfileUsername() {
    try {
      const match = window.location.pathname.match(/\/in\/([^\/]+)/);
      return match ? match[1].replace(/[^a-zA-Z0-9_-]/g, '_') : 'profile';
    } catch (e) {
      return 'profile';
    }
  }

  // --------- MAIN PUBLIC ENTRIES ---------

  // Capture & stitch; returns dataUrl + username
  window.lpCaptureFullProfileScreenshot = async function () {
    if (!isLinkedInProfile()) {
      throw new Error('Not on a LinkedIn profile URL');
    }

    let originalState = null;
    try {
      originalState = await savePageState();
      await applyComprehensiveCaptureMode();
      const screenshots = await captureWithProfessionalTechniques();
      const finalImage = await processScreenshots(screenshots);
      safeLog('Full long screenshot generated');
      return {
        dataUrl: finalImage,
        username: getProfileUsername()
      };
    } finally {
      await restorePageState(originalState);
    }
  };

  // Capture + upload to vision-debug; returns { ok, analysisId? }
  window.lpRunProfileOptimization = async function () {
    // SET FLAG TO PREVENT SAVE_LEAD FROM INTERFERING
    window.__lp_profile_optimizer_running = true;
    safeLog('Flag set - running profile optimization');

    try {
      if (!isLinkedInProfile()) {
        throw new Error('Not on a LinkedIn profile URL');
      }

      // 1) Capture stitched screenshot
      const captureResult = await window.lpCaptureFullProfileScreenshot();
      const { dataUrl } = captureResult;

      // 2) Convert dataUrl to Blob
      const blob = dataUrlToBlob(dataUrl);

      // 3) Get token from tokenManager
      if (!window.tokenManager || typeof window.tokenManager.getToken !== 'function') {
        throw new Error('Not logged in via extension');
      }
      const accessToken = await window.tokenManager.getToken();
      if (!accessToken) {
        throw new Error('No valid access token. Please log in again.');
      }

      // 4) Build FormData
      const formData = new FormData();
      formData.append('image', blob, getProfileUsername() + '.png');
      formData.append('profile_url', window.location.href);
      formData.append('section', 'full');

      // 5) POST to vision-debug endpoint
      safeLog('Uploading to vision-debug...');
      const resp = await fetch('http://localhost:8000/profile-optimizer/vision-debug/', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken
          // Do NOT set Content-Type; browser sets multipart boundary
        },
        body: formData
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        const msg =
          (json && (json.error || json.detail || json.message)) ||
          `Upload failed with status ${resp.status}`;
        throw new Error(msg);
      }

      safeLog('Upload success, analysis_id:', json.analysis_id);

      // Notify dashboard that analysis is complete
      try {
        chrome.runtime.sendMessage({
          type: 'LP_PROFILE_ANALYSIS_DONE',
          analysisId: json.analysis_id
        });
        safeLog('Sent LP_PROFILE_ANALYSIS_DONE to service worker');
      } catch (e) {
        safeLog('Could not notify dashboard:', e.message);
      }

      return {
        ok: true,
        analysisId: json.analysis_id || null
      };
    } catch (error) {
      safeLog('Error during analysis:', error.message);
      throw error;
    } finally {
      // ALWAYS clear flag when done
      window.__lp_profile_optimizer_running = false;
      safeLog('Flag cleared - optimization complete');
    }
  };
})();  // close IIFE

// Listen for popup requests to run the optimizer
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'LP_RUN_PROFILE_OPTIMIZER') {
    (async () => {
      try {
        const res = await window.lpRunProfileOptimization();
        sendResponse(res);
      } catch (e) {
        window.__lp_profile_optimizer_running = false;
        sendResponse({ ok: false, error: e.message || 'Optimization failed' });
      }
    })();
    return true; // async
  }
});
