// background.js
// Service worker: handle captureVisible and downloadImage messages

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log(
    '[SW] onMessage received:',
    msg,
    'from',
    sender && (sender.tab ? `tab ${sender.tab.id}` : sender.id)
  );

  if (msg.action === 'captureVisible') {
    handleCaptureVisible(sender, sendResponse);
    return true; // async
  }

  if (msg.action === 'downloadImage') {
    handleDownload(msg, sendResponse);
    return true; // async
  }

  console.warn('[SW] unknown message action:', msg && msg.action);
  sendResponse({ ok: false, error: 'unknown_action', received: msg });
  return false;
});

// Capture current visible viewport of active LinkedIn tab
async function handleCaptureVisible(sender, sendResponse) {
  console.log('[SW] captureVisible requested from sender:', sender);

  try {
    let targetTab = null;

    if (sender && sender.tab && sender.tab.id) {
      targetTab = sender.tab;
    } else {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      targetTab = activeTab;
    }

    if (!targetTab) {
      sendResponse({
        ok: false,
        error: 'No active tab found. Open a LinkedIn tab first.'
      });
      return;
    }

    if (!targetTab.url || !targetTab.url.includes('linkedin.com')) {
      sendResponse({
        ok: false,
        error: 'Please run capture on a LinkedIn tab.'
      });
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(targetTab.windowId, {
      format: 'png'
    });

    if (!dataUrl) {
      throw new Error('Failed to capture screenshot - no data returned');
    }

    console.log('[SW] Screenshot captured, size:', dataUrl.length);
    sendResponse({ ok: true, dataUrl });
  } catch (error) {
    console.error('[SW] captureVisible error:', error);
    sendResponse({
      ok: false,
      error: error.message || 'Failed to capture screenshot',
      detail: String(error)
    });
  }
}

// Optional explicit download helper
async function handleDownload(msg, sendResponse) {
  try {
    const downloadId = await chrome.downloads.download({
      url: msg.dataUrl,
      filename: msg.filename || 'linkedin-post.png',
      saveAs: false
    });
    console.log('[SW] downloadImage started with ID:', downloadId);
    sendResponse({ ok: true, downloadId });
  } catch (e) {
    console.error('[SW] downloadImage error:', e);
    sendResponse({ ok: false, error: e.message || String(e) });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[SW] Screenshot helper installed/updated');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[SW] Screenshot helper started');
});
