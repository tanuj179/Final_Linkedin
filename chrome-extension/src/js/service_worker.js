// src/js/service_worker.js
// Service worker: handle CAPTURE_VISIBLE, LP_LEAD_ADDED, LP_PROFILE_ANALYSIS_DONE, and choose popup (auth vs optimizer).

console.log('[SW] service_worker starting');

// Decide which popup HTML to show for the current tab
async function updateActionPopupForTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const url = tab.url || '';

    const isLinkedInProfile = /^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/i.test(url);

    // Check token in extension storage
    const stored = await chrome.storage.local.get('lp_device_token_v1');
    const tokenObj = stored.lp_device_token_v1;
    const hasToken = !!(tokenObj && tokenObj.accessToken);

    if (isLinkedInProfile && hasToken) {
      await chrome.action.setPopup({
        popup: 'src/html/profile_optimizer_popup.html'
      });
    } else {
      await chrome.action.setPopup({
        popup: 'src/html/popup.html'
      });
    }
  } catch (e) {
    console.warn('[SW] updateActionPopupForTab error, falling back to auth popup:', e);
    await chrome.action.setPopup({ popup: 'src/html/popup.html' });
  }
}

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log(
    '[SW] onMessage received:',
    msg,
    'from',
    sender && (sender.tab ? `tab ${sender.tab.id}` : sender.id)
  );

  // Handle async operations
  if (msg.action === 'captureVisible') {
    handleCaptureVisible(sender, sendResponse);
    return true; // Keep channel open for async response
  }

  // ⭐ Handle comment analysis request with screenshot
  if (msg.type === 'LP_RUN_COMMENT_ANALYSIS') {
    handleCommentAnalysis(msg, sendResponse);
    return true; // Keep channel open for async response
  }

  if (msg.type === 'LP_LEAD_ADDED') {
    handleLeadAdded(sendResponse);
    return true;
  }

  if (msg.type === 'LP_PROFILE_ANALYSIS_DONE') {
    handleProfileAnalysisDone(sendResponse);
    return true;
  }

  // Unknown type
  console.warn('[SW] unknown message type:', msg.action || msg.type);
  sendResponse({ ok: false, error: 'unknown_type', received: msg });
  return false;
});

// ⭐ Handle comment analysis request
async function handleCommentAnalysis(msg, sendResponse) {
  console.log('[SW] LP_RUN_COMMENT_ANALYSIS requested');

  const { postScreenshot, tone } = msg;

  if (!postScreenshot) {
    console.error('[SW] Missing postScreenshot data');
    return sendResponse({ ok: false, error: 'Post image data is missing.' });
  }

  try {
    const stored = await chrome.storage.local.get('lp_device_token_v1');
    const tokenObj = stored.lp_device_token_v1;
    const accessToken = tokenObj && tokenObj.accessToken;

    if (!accessToken) {
      return sendResponse({
        ok: false,
        error: 'Not logged in. Please log in to use the Comment Helper.'
      });
    }

    const API_ENDPOINT = 'YOUR_BACKEND_API_URL/api/v1/analyze_post_for_comment/'; // <--- REPLACE

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        image_data: postScreenshot,
        requested_tone: tone,
        url: 'https://www.linkedin.com'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[SW] Comment analysis successful');
      sendResponse({
        ok: true,
        comment: data.comment_text || data.reply || 'AI comment ready.'
      });
    } else {
      console.error('[SW] API failed:', data);
      sendResponse({
        ok: false,
        error: data.message || data.error || 'Failed to generate comment from API.'
      });
    }
  } catch (error) {
    console.error('[SW] Error during comment analysis:', error);
    sendResponse({
      ok: false,
      error: error.message || 'Network or API error occurred.'
    });
  }
}

// Handle viewport capture (for profile screenshot + comments)
async function handleCaptureVisible(sender, sendResponse) {
  console.log('[SW] CAPTURE_VISIBLE requested from sender:', sender);

  try {
    // Use sender tab if available (content script)
    let targetTab = null;

    if (sender && sender.tab && sender.tab.id) {
      console.log('[SW] Using sender tab:', sender.tab.id);
      targetTab = sender.tab;
    } else {
      // Fallback: get active tab
      console.log('[SW] No sender tab, querying active tab');
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      targetTab = activeTab;
    }

    if (!targetTab) {
      console.error('[SW] No target tab found');
      sendResponse({
        success: false,
        error: 'No active tab found.'
      });
      return;
    }

    console.log('[SW] Target tab:', targetTab.id, targetTab.url);

    // Ensure we're on LinkedIn
    if (!targetTab.url || !targetTab.url.includes('linkedin.com')) {
      console.error('[SW] Not a LinkedIn tab:', targetTab.url);
      sendResponse({
        success: false,
        error: 'Please ensure you are on a LinkedIn profile page'
      });
      return;
    }

    // Capture the visible viewport
    const dataUrl = await chrome.tabs.captureVisibleTab(targetTab.windowId, {
      format: 'png'
    });

    if (!dataUrl) {
      throw new Error('Failed to capture viewport - no data returned');
    }

    console.log('[SW] Viewport captured successfully, size:', dataUrl.length);
    sendResponse({ success: true, dataUrl });
  } catch (error) {
    console.error('[SW] CaptureVisible error:', error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to capture viewport',
      detail: String(error)
    });
  }
}

// Handle lead added message - forward to dashboard tabs
async function handleLeadAdded(sendResponse) {
  console.log('[SW] LP_LEAD_ADDED - forwarding to dashboard tabs');

  try {
    const tabs = await chrome.tabs.query({
      url: 'http://127.0.0.1:8000/dashboard*'
    });

    console.log('[SW] Found', tabs.length, 'dashboard tabs');

    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'LP_LEAD_ADDED' });
        console.log('[SW] Message sent to tab', tab.id);
      } catch (err) {
        console.debug(`[SW] Could not send to tab ${tab.id}:`, err.message);
      }
    }

    sendResponse({ ok: true });
  } catch (error) {
    console.error('[SW] Error forwarding lead added:', error);
    sendResponse({ ok: false, error: error.message });
  }
}

// Handle profile analysis done - forward to dashboard tabs
async function handleProfileAnalysisDone(sendResponse) {
  console.log('[SW] LP_PROFILE_ANALYSIS_DONE - forwarding to dashboard tabs');

  try {
    const tabs = await chrome.tabs.query({
      url: 'http://127.0.0.1:8000/dashboard*'
    });

    console.log('[SW] Found', tabs.length, 'dashboard tabs');

    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'LP_PROFILE_ANALYSIS_DONE' });
        console.log('[SW] Message sent to tab', tab.id);
      } catch (err) {
        console.debug(`[SW] Could not send to tab ${tab.id}:`, err.message);
      }
    }

    sendResponse({ ok: true });
  } catch (error) {
    console.error('[SW] Error forwarding profile analysis done:', error);
    sendResponse({ ok: false, error: error.message });
  }
}

// Lifecycle: choose popup on install/start and when tabs change
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SW] Extension installed/updated');
  chrome.action.setPopup({ popup: 'src/html/popup.html' });
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[SW] Extension started');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id != null) {
    await updateActionPopupForTab(tab.id);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateActionPopupForTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    await updateActionPopupForTab(tabId);
  }
});
