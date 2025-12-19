// src/js/profile_optimizer_popup.js
// Popup UI controller for Profile Optimizer

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('lp-prof-status');
  const mainBtn = document.getElementById('lp-prof-main-btn');

  async function checkContext() {
    // 1) Check active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs && tabs[0];
      const url = tab && tab.url ? tab.url : '';

      const isLinkedInProfile =
        /^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/i.test(url || '');

      // 2) Check token via tokenManager
      let hasToken = false;
      try {
        if (window.tokenManager && typeof window.tokenManager.getToken === 'function') {
          const token = await window.tokenManager.getToken();
          hasToken = !!token;
        }
      } catch (e) {
        hasToken = false;
      }

      if (!isLinkedInProfile && !hasToken) {
        statusEl.textContent =
          'Open a LinkedIn profile and log in from the extension to enable optimization.';
        mainBtn.disabled = true;
        return;
      }

      if (!isLinkedInProfile) {
        statusEl.textContent =
          'You are logged in, but this is not a LinkedIn profile URL. Open a /in/ profile.';
        mainBtn.disabled = true;
        return;
      }

      if (!hasToken) {
        statusEl.textContent =
          'This is a LinkedIn profile, but you are not logged in. Use the Login popup first.';
        mainBtn.disabled = true;
        return;
      }

      // Both OK
      statusEl.textContent =
        'You are logged in on a LinkedIn profile. Click the button below to start analysis.';
      mainBtn.disabled = false;
    });
  }

  mainBtn.addEventListener('click', () => {
    mainBtn.disabled = true;
    mainBtn.textContent = '⏳ Analyzing profile...';
    statusEl.textContent =
      'Capturing and uploading your full profile. Please keep this LinkedIn tab and this extension popup open until analysis finishes.';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || !tab.id) {
        statusEl.textContent = 'Could not find active tab.';
        mainBtn.disabled = false;
        mainBtn.textContent = '🎯 Analyze this profile';
        return;
      }

      chrome.tabs.sendMessage(
        tab.id,
        { type: 'LP_RUN_PROFILE_OPTIMIZER' },
        (resp) => {
          mainBtn.disabled = false;

          if (!resp || !resp.ok) {
            mainBtn.textContent = '🎯 Analyze this profile';
            statusEl.textContent =
              'Analysis failed: ' + (resp && resp.error ? resp.error : 'Unknown error');
            return;
          }

          // Success: show “complete” state
          mainBtn.textContent = '✅ Analysis complete';
          statusEl.textContent =
            '✅ Your profile was captured and sent for optimization. Now open your LeadzMachine dashboard to see detailed tips and scores for this profile.';
        }
      );
    });
  });

  checkContext();
});
