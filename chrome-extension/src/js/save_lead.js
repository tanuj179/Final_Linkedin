// src/js/save_lead.js
// EXACT copy of Save Lead UI & logic from content_script.js
// Does NOT include token injection, logout, or forwarding

(function () {
  if (window.__lp_injected) return;
  window.__lp_injected = true;

  // Helper: Check if current page is a LinkedIn profile
  function isLinkedInProfile() {
    const url = window.location.href;
    const profilePattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/]+\/?$/;
    return profilePattern.test(url);
  }

  // Helper: Extract name from page title (SAFE - no DOM scraping)
  function extractNameFromTitle() {
    const title = document.title;
    
    if (!title || !title.includes('|')) {
      return '';
    }
    
    // LinkedIn profile titles: "Name - Job Title at Company | LinkedIn"
    const mainPart = title.split('|')[0].trim();
    const parts = mainPart.split(' - ');
    
    // Clean the name - remove any numbers/symbols that might be added
    let name = parts[0].trim();
    
    // Remove "(1)" or similar patterns from the name
    name = name.replace(/\(\d+\)/g, '').trim();
    
    return name;
  }

  const saveLeadBtn = document.createElement('div');
  saveLeadBtn.className = 'lp-save-lead-btn';
  saveLeadBtn.innerHTML = '💾';
  saveLeadBtn.title = 'Save LinkedIn Lead';
  document.body.appendChild(saveLeadBtn);

  const saveModal = document.createElement('div');
  saveModal.className = 'lp-save-modal';
  saveModal.innerHTML = `
    <h4><span>💾</span> Save LinkedIn Lead</h4>
    <div class="form-group">
      <label for="lead-name">Name *</label>
      <input type="text" id="lead-name" placeholder="Enter full name" required autocomplete="off" />
    </div>
    <div class="form-group">
      <label for="lead-url">Profile URL</label>
      <input type="text" id="lead-url" readonly />
    </div>
    <div class="form-group">
      <label for="lead-tags">Tags (comma-separated)</label>
      <input type="text" id="lead-tags" placeholder="e.g., Hot Lead, Decision Maker" autocomplete="off" />
    </div>
    <div class="button-row">
      <button class="btn-cancel" id="cancel-save-lead">Cancel</button>
      <button class="btn-save" id="confirm-save-lead">Save Lead</button>
    </div>
  `;
  document.body.appendChild(saveModal);

  async function checkAuthAndShowButton() {
    if (!isLinkedInProfile()) {
      saveLeadBtn.style.display = 'none';
      saveModal.style.display = 'none';
      return;
    }

    try {
      const accessToken = await tokenManager.getToken();
      if (accessToken) {
        saveLeadBtn.style.display = 'flex';
      } else {
        saveLeadBtn.style.display = 'none';
        saveModal.style.display = 'none';
      }
    } catch (e) {
      console.error('[ContentScript] checkAuthAndShowButton error', e);
      saveLeadBtn.style.display = 'none';
      saveModal.style.display = 'none';
    }
  }

  checkAuthAndShowButton();

  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      checkAuthAndShowButton();
    }
  }).observe(document, { subtree: true, childList: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.lp_device_token_v1) {
      checkAuthAndShowButton();
    }
  });

  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'LP_EXTENSION_LOGOUT') {
      saveLeadBtn.style.display = 'none';
      saveModal.style.display = 'none';
      saveModal
        .querySelectorAll('input[type="text"]:not([readonly])')
        .forEach((input) => (input.value = ''));
    }
  });

  saveLeadBtn.addEventListener('click', () => {
    // --- MUTUAL EXCLUSIVITY CHECK ---
    if (window.lpActiveModalId && window.lpActiveModalId !== 'save-lead') {
      console.log('[SaveLead] Another modal is open, cannot open Save Lead.');
      return; // Do not open if another modal is active
    }
    window.lpActiveModalId = 'save-lead'; // Set this modal as active
    // --- END MUTUAL EXCLUSIVITY CHECK ---
    
    const name = extractNameFromTitle();

    document.getElementById('lead-url').value = window.location.href;
    document.getElementById('lead-name').value = name || '';

    saveModal.style.display = 'block';
    document.getElementById('lead-name').focus();
    document.getElementById('lead-name').select();
  });

  document.getElementById('cancel-save-lead').addEventListener('click', () => {
    saveModal.style.display = 'none';
    saveModal
      .querySelectorAll('input[type="text"]:not([readonly])')
      .forEach((input) => (input.value = ''));
    // --- MUTUAL EXCLUSIVITY RESET ---
    window.lpActiveModalId = null; // Clear active modal on close
    // --- END MUTUAL EXCLUSIVITY RESET ---
  });

  function showToast(text) {
    const existingToast = document.querySelector('.lp-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'lp-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  document.getElementById('confirm-save-lead').addEventListener('click', async () => {
    // Block if some other long operation (upload/screenshot/save) is running
    if (window.lpIsGlobalBusy && window.lpIsGlobalBusy()) {
      return;
    }

    const name = document.getElementById('lead-name').value.trim();
    const url = document.getElementById('lead-url').value;

    if (!name) {
      window.lpShowToast('⚠️ Please enter a name');
      document.getElementById('lead-name').focus();
      return;
    }

    if (!isLinkedInProfile()) {
      window.lpShowToast('❌ Please save from a LinkedIn profile page');
      return;
    }

    const saveBtn = document.getElementById('confirm-save-lead');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    if (window.lpSetGlobalBusy) {
      window.lpSetGlobalBusy(true);
    }

    try {
      const accessToken = await tokenManager.getToken();

      if (!accessToken) {
        window.lpShowToast('❌ Not logged in');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Lead';
        saveModal.style.display = 'none';
        saveLeadBtn.style.display = 'none';
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/leads/save/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken,
        },
        body: JSON.stringify({
          name: name,
          linkedin_url: url,
          tags: document.getElementById('lead-tags').value.trim() || 'Prospect',
        }),
      });

            const result = await response.json();

      if (response.ok) {
        window.lpShowToast('✅ Lead saved successfully!');
        saveModal.style.display = 'none';
        saveModal
          .querySelectorAll('input[type="text"]:not([readonly])')
          .forEach((input) => (input.value = ''));
        window.lpActiveModalId = null;

        if (!window.__lp_profile_optimizer_running) {
          console.log('[SaveLead] Notifying dashboard of new lead');
          try {
            chrome.runtime.sendMessage({ type: 'LP_LEAD_ADDED' }, () => {
              if (chrome.runtime.lastError) {
                console.warn('[ContentScript] sendMessage failed:', chrome.runtime.lastError.message);
              }
            });
          } catch (e) {
            console.warn('[SaveLead] Could not send message:', e.message);
          }
        } else {
          console.log('[SaveLead] Profile optimizer running, skipping LP_LEAD_ADDED');
        }
      } else {
        // NEW: handle trial/plan limit
        if (response.status === 403 && result.limit_reached) {
          const msg = result.detail ||
            '⚠️ Your trial has ended. Please buy a plan to continue saving leads.';
          window.lpShowToast(msg);

          // Optional: open pricing page in new tab
          if (result.upgrade_url) {
            // small delay so toast is visible
            setTimeout(() => {
              window.open(result.upgrade_url, '_blank');
            }, 800);
          }

          // Close modal and prevent further actions for this click
          saveModal.style.display = 'none';
          window.lpActiveModalId = null;
        } else {
          let errorMsg = 'Failed to save lead';
          if (result.error) {
            errorMsg = result.error;
          } else if (result.name || result.linkedin_url) {
            errorMsg = result.name ? result.name[0] : result.linkedin_url[0];
          }
          window.lpShowToast('❌ ' + errorMsg);
        }
      }

    } catch (error) {
      console.error('Save lead error:', error);
      window.lpShowToast('❌ Network error. Please try again.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Lead';

      if (window.lpSetGlobalBusy) {
        window.lpSetGlobalBusy(false);
      }
    }
  });

  document.getElementById('lead-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('confirm-save-lead').click();
    }
  });

  document.addEventListener('click', (e) => {
    if (!saveModal.contains(e.target) && !saveLeadBtn.contains(e.target)) {
      if (saveModal.style.display === 'block') {
        saveModal.style.display = 'none';
        // --- MUTUAL EXCLUSIVITY RESET ---
        window.lpActiveModalId = null; // Clear active modal on outside click
        // --- END MUTUAL EXCLUSIVITY RESET ---
      }
    }
  });
})();
