// Global state to manage which modal is currently open for mutual exclusivity
if (typeof window.lpActiveModalId === 'undefined') {
  window.lpActiveModalId = null; // Can be 'save-lead', 'profile-optimize', or null
}

const TOKEN_KEY = 'lp_device_token_v1';

const tokenManager = {
  async setToken(accessToken, refreshToken) {
    // Decode JWT expiry
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const exp = payload.exp * 1000; // ms
    const obj = {
      accessToken,
      refreshToken,
      accessExpiresAt: exp,
      refreshExpiresAt: Date.now() + 7 * 24 * 3600 * 1000 // one week
    };
    await chrome.storage.local.set({ [TOKEN_KEY]: obj });
    return obj;
  },
  async getToken() {
    const res = await chrome.storage.local.get(TOKEN_KEY);
    const t = res[TOKEN_KEY];
    if (!t) return null;
    if (Date.now() < (t.accessExpiresAt || 0)) return t.accessToken;
    return await this.refreshToken();
  },
  async refreshToken() {
    const res = await chrome.storage.local.get(TOKEN_KEY);
    const t = res[TOKEN_KEY];
    if (!t || !t.refreshToken) return null;
    if (Date.now() > (t.refreshExpiresAt || 0)) {
      await this.clearToken();
      return null;
    }
    try {
      const resp = await fetch('http://127.0.0.1:8000/accounts/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: t.refreshToken })
      });
      const result = await resp.json();
      if (resp.ok && result.access) {
        return await this.setToken(result.access, t.refreshToken);
      } else {
        await this.clearToken();
        return null;
      }
    } catch {
      return null;
    }
  },
  async clearToken() {
    await chrome.storage.local.remove(TOKEN_KEY);
  }
};

window.tokenManager = tokenManager;