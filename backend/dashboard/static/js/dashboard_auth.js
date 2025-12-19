// ========================================
// TOKEN TIMEOUT
// ========================================
function startTokenTimeout() {
  setTimeout(() => {
    if (!tokenReceived) {
      console.warn('[Dashboard] Token not received, redirecting to home');
      window.location.href = "http://127.0.0.1:8000/home/";
    }
  }, 3000);
}


// ========================================
// SESSION & AUTH MANAGEMENT
// ========================================
function handleApiResponse(response) {
  if (response.status === 401 || response.status === 403) {
    showSessionExpiredUI();
    setTimeout(() => logoutAndRedirect(), 2000);
    return false;
  }
  return true;
}


function showSessionExpiredUI() {
  const banner = document.getElementById('sessionExpiredBanner');
  if (banner) {
    banner.classList.remove('d-none');
  }
}


function logoutAndRedirect() {
  console.log('[Dashboard] Logging out and redirecting...');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  extensionAccessToken = null;
  tokenReceived = false;
  
  window.postMessage({ type: 'LP_EXTENSION_LOGOUT' }, "*");
  window.location.href = "http://127.0.0.1:8000/home/";
}
