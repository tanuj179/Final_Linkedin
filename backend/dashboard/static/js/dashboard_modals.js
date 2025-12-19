// ========================================
// MODALS
// ========================================
function initializeModals() {
 
  document.getElementById('updatePasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const alertBox = document.getElementById('updatePasswordAlert');
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      window.dashboardShowAlert(alertBox, 'danger', 'All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      window.dashboardShowAlert(alertBox, 'danger', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      window.dashboardShowAlert(alertBox, 'danger', 'Password must be at least 8 characters');
      return;
    }
    if (oldPassword === newPassword) {
      window.dashboardShowAlert(alertBox, 'danger', 'New password must be different from old password');
      return;
    }
    
    try {
      const resp = await fetch("http://127.0.0.1:8000/accounts/update-password/", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + extensionAccessToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_new_password: confirmPassword
        })
      });
      
      if (!handleApiResponse(resp)) return;
      
      const data = await resp.json();
      
      if (resp.ok) {
        window.postMessage({ type: 'LP_EXTENSION_LOGOUT' }, "*");
        bootstrap.Modal.getInstance(document.getElementById('updatePasswordModal'))?.hide();
        this.reset();
        alertBox?.classList.add('d-none');
        localStorage.clear();
        window.location.href = "http://127.0.0.1:8000/home/";
      } else {
        window.dashboardShowAlert(alertBox, 'danger', data.error || Object.values(data)[0]);
      }
    } catch (error) {
      console.error('[Dashboard] Update password error:', error);
      window.dashboardShowAlert(alertBox, 'danger', 'Network error. Please try again.');
    }
  });
  
  document.getElementById('resetPasswordForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value;
    const alertBox = document.getElementById('resetPasswordAlert');
    
    try {
      const resp = await fetch('http://127.0.0.1:8000/accounts/request-reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await resp.json();
      
      if (resp.ok) {
        window.dashboardShowAlert(alertBox, 'success', 'Reset password link sent to your email!');
        setTimeout(() => {
          bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'))?.hide();
          this.reset();
          alertBox?.classList.add('d-none');
        }, 2000);
      } else {
        window.dashboardShowAlert(alertBox, 'danger', data.error || Object.values(data)[0]);
      }
    } catch (error) {
      console.error('[Dashboard] Reset password error:', error);
      window.dashboardShowAlert(alertBox, 'danger', 'Network error. Please try again.');
    }
  });
  
  document.getElementById('confirmLogoutBtn')?.addEventListener('click', function() {
    window.postMessage({ type: 'LP_EXTENSION_LOGOUT' }, "*");
    bootstrap.Modal.getInstance(document.getElementById('logoutModal'))?.hide();
    localStorage.clear();
    window.location.href = "http://127.0.0.1:8000/home/";
  });
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('hidden.bs.modal', function() {
      const form = this.querySelector('form');
      form?.reset();
      const alert = this.querySelector('.alert');
      alert?.classList.add('d-none');
    });
  });
}
