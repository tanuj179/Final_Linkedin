// src/js/content_script.js

console.log('[ContentScript] Starting...');

if (
  window.location.hostname === '127.0.0.1' &&
  window.location.pathname.startsWith('/dashboard')
) {
  console.log('[ContentScript] On dashboard, attaching listeners...');

  chrome.storage.local.get('lp_device_token_v1', function (data) {
    if (data && data.lp_device_token_v1 && data.lp_device_token_v1.accessToken) {
      window.postMessage(
        {
          type: 'LP_EXTENSION_TOKEN',
          token: data.lp_device_token_v1.accessToken,
          refresh: data.lp_device_token_v1.refreshToken
        },
        '*'
      );
      console.log('[ContentScript] ✅ Sent token to dashboard');
    }
  });
}

window.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'LP_EXTENSION_LOGOUT') {
    chrome.storage.local.remove('lp_device_token_v1', function () {
      console.log('[ContentScript] ✅ Token cleared on logout');
    });
  }
});

if (
  window.location.hostname === '127.0.0.1' &&
  window.location.pathname.startsWith('/dashboard')
) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[ContentScript] Received from extension:', msg.type);

    // Forward EVERYTHING to dashboard, let dashboard decide what to do
    if (msg.type === 'LP_LEAD_ADDED') {
      console.log('[ContentScript] ✅ Forwarding LP_LEAD_ADDED');
      window.postMessage({ type: 'LP_LEAD_ADDED' }, '*');
    }

    if (msg.type === 'LP_LEAD_UPDATED') {
      console.log('[ContentScript] ✅ Forwarding LP_LEAD_UPDATED');
      window.postMessage({ type: 'LP_LEAD_UPDATED' }, '*');
    }

    if (msg.type === 'LP_PROFILE_ANALYSIS_DONE') {
      console.log('[ContentScript] ✅ Forwarding LP_PROFILE_ANALYSIS_DONE');
      window.postMessage({ 
        type: 'LP_PROFILE_ANALYSIS_DONE',
        analysisId: msg.analysisId 
      }, '*');
    }
  });
}
