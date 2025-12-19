const statusEl = document.getElementById('status');
const longBtn = document.getElementById('captureLongBtn');

function setStatus(html) {
  statusEl.innerHTML = html || '';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error('No active tab found');
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('edge://')
  ) {
    throw new Error('Cannot capture browser internal pages');
  }
  return tab;
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'] // match filename in manifest
  });
  await new Promise((r) => setTimeout(r, 100));
}

// Auto long‑post capture (up to N steps)
longBtn.addEventListener('click', async () => {
  longBtn.disabled = true;
  setStatus(
    '📜 Center the post you want. The helper will scroll a few screens and capture them automatically…'
  );

  try {
    const tab = await getActiveTab();
    setStatus('<span class="spinner"></span>Injecting helper…');
    await ensureContentScript(tab.id);

    setStatus('<span class="spinner"></span>Capturing long post…');
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'autoLongPostCapture'
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Long post capture failed');
    }

    // If you still want to save locally:
    await chrome.runtime.sendMessage({
      action: 'downloadImage',
      dataUrl: response.dataUrl,
      filename: 'linkedin-long-post.png'
    });

    setStatus('✅ Long post screenshot saved.');
  } catch (err) {
    console.error('autoLongPostCapture error:', err);
    setStatus('❌ ' + err.message);
  } finally {
    setTimeout(() => {
      longBtn.disabled = false;
    }, 2500);
  }
});
