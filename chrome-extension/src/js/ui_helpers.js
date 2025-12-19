(function () {
  'use strict';

  if (!window.lpIsGlobalBusy) {
    window.lpIsGlobalBusy = function () {
      return !!window.__lp_global_busy;
    };
  }

  if (!window.lpSetGlobalBusy) {
    window.lpSetGlobalBusy = function (isBusy) {
      window.__lp_global_busy = !!isBusy;

      try {
        const saveLeadBtn = document.querySelector('.lp-save-lead-btn');
        const confirmSaveBtn = document.getElementById('confirm-save-lead');
        const optimizeBtnEl = document.querySelector('.lp-optimize-btn');
        const takeScreenshotBtnEl = document.getElementById('lp-take-screenshot');
        const uploadBtnEl = document.getElementById('lp-upload-btn');

        const allButtons = [
          saveLeadBtn,
          confirmSaveBtn,
          optimizeBtnEl,
          takeScreenshotBtnEl,
          uploadBtnEl,
        ].filter(Boolean);

        allButtons.forEach((btn) => {
          if (isBusy) {
            btn.setAttribute('data-lp-busy', '1');
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.6';
            btn.style.cursor = 'not-allowed';
          } else {
            btn.removeAttribute('data-lp-busy');
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
            btn.style.cursor = '';
          }
        });
      } catch (e) {
        console.warn('[LP] lpSetGlobalBusy error', e);
      }
    };
  }

  if (!window.lpShowToast) {
  window.lpShowToast = function (text) {
    try {
      const existing = document.querySelector('.lp-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'lp-toast';
      toast.textContent = text;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3500);
    } catch (e) {
      console.warn('[LP] lpShowToast error', e);
    }
  };
}

})();
