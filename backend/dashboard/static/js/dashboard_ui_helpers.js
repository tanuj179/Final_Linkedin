// src/js/dashboard_ui_helpers.js
// Shared UI helpers for dashboard (alerts, snackbars, formatting)

(function () {
  'use strict';

  // Date formatter
  if (!window.dashboardFormatDate) {
    window.dashboardFormatDate = function (dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };
  }

  // HTML escape
  if (!window.dashboardEscapeHtml) {
    window.dashboardEscapeHtml = function (text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };
  }

  // Alert helper (Bootstrap alert inside modals)
  if (!window.dashboardShowAlert) {
    window.dashboardShowAlert = function (alertBox, type, message) {
      if (!alertBox) return;
      alertBox.className = `alert alert-${type} d-flex align-items-center`;
      alertBox.innerHTML = `
        <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2"></i>
        <span>${window.dashboardEscapeHtml(message)}</span>
      `;
      alertBox.classList.remove('d-none');
    };
  }

  // Snackbar helper (top-center toast on dashboard)
  if (!window.dashboardShowSnackbar) {
    window.dashboardShowSnackbar = function (message, type = 'success') {
      let snackbar = document.getElementById('dashboardSnackbar');

      if (!snackbar) {
        snackbar = document.createElement('div');
        snackbar.id = 'dashboardSnackbar';
        snackbar.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;min-width:300px;max-width:500px;';
        document.body.appendChild(snackbar);
      }

      snackbar.className = `alert alert-${type} text-center shadow-lg`;
      snackbar.textContent = message;
      snackbar.style.display = 'block';

      clearTimeout(window.__dashboard_snackbar_timeout);
      window.__dashboard_snackbar_timeout = setTimeout(() => {
        snackbar.style.display = 'none';
      }, 3000);
    };
  }

  // Handle bfcache (back-forward cache) reload
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      window.location.reload(true);
    }
  });
})();
