document.addEventListener('DOMContentLoaded', function() {
  initializeVerification();
});

function getTokenFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

function initializeVerification() {
  const verifyBtn = document.getElementById('verifyBtn');
  const successMessage = document.getElementById('successMessage');
  if (verifyBtn && successMessage) {
    verifyBtn.addEventListener('click', () => handleVerification(verifyBtn, successMessage));
  }
}

async function handleVerification(verifyBtn, successMessage) {
  verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verifying...';
  verifyBtn.disabled = true;

  const token = getTokenFromURL();
  if (!token) {
    showError("Missing verification token.");
    return;
  }
  try {
    const resp = await fetch(`/accounts/verify/${token}/`, { method: 'GET' });
    const result = await resp.json();
    if (resp.ok && result.message) {
      verifyBtn.style.display = 'none';
      successMessage.classList.remove('d-none');
      successMessage.classList.remove('alert-danger');
      successMessage.classList.add('alert-success');
      successMessage.innerHTML = `
        <div>
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong>Email verified!</strong>
        </div>
        <div style="margin-top:6px;font-weight:400;">You can now log in via <span style="color:#0a66c2;font-weight:500;">Chrome Extension</span>.</div>
      `;

    } else {
      showError(result.error || "Verification failed.");
    }
  } catch (err) {
    showError("Network error. Please try again.");
  }

  function showError(msg) {
    verifyBtn.style.display = 'none';
    successMessage.classList.remove('alert-success');
    successMessage.classList.add('alert-danger');
    successMessage.classList.remove('d-none');
    successMessage.innerHTML = `<i class="bi bi-x-circle-fill me-2"></i> <strong>${msg}</strong>`;
  }
}

// Optional: Allow Enter key for verification
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn && !verifyBtn.disabled && verifyBtn.style.display !== 'none') {
      verifyBtn.click();
    }
  }
});
