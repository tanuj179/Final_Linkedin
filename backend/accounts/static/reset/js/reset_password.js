/**
 * Reset Password Page JavaScript
 * Handles form validation, password matching, and submission
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeResetPassword();
});

/**
 * Initialize reset password functionality
 */
function initializeResetPassword() {
    const form = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const submitBtn = document.getElementById('submitBtn');
    
    // Add input event listeners for real-time validation
    newPasswordInput.addEventListener('input', validatePasswords);
    confirmPasswordInput.addEventListener('input', validatePasswords);
    
    // Add form submit event listener
    form.addEventListener('submit', handleSubmit);
    
    // Add password toggle functionality
    initializePasswordToggles();
}

/**
 * Validate passwords and enable/disable submit button
 */
function validatePasswords() {
    const newPassword = document.getElementById('newPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const submitBtn = document.getElementById('submitBtn');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    const newPasswordValue = newPassword.value.trim();
    const confirmPasswordValue = confirmPassword.value.trim();
    
    let isValid = true;
    
    // Validate new password (minimum 8 characters)
    if (newPasswordValue.length > 0 && newPasswordValue.length < 8) {
        newPassword.classList.add('is-invalid');
        newPassword.classList.remove('is-valid');
        newPasswordError.textContent = 'Password must be at least 8 characters long.';
        isValid = false;
    } else if (newPasswordValue.length >= 8) {
        newPassword.classList.remove('is-invalid');
        newPassword.classList.add('is-valid');
    } else {
        newPassword.classList.remove('is-invalid', 'is-valid');
    }
    
    // Validate confirm password (must match new password)
    if (confirmPasswordValue.length > 0) {
        if (confirmPasswordValue !== newPasswordValue) {
            confirmPassword.classList.add('is-invalid');
            confirmPassword.classList.remove('is-valid');
            confirmPasswordError.textContent = 'Passwords do not match.';
            isValid = false;
        } else if (newPasswordValue.length >= 8) {
            confirmPassword.classList.remove('is-invalid');
            confirmPassword.classList.add('is-valid');
        } else {
            confirmPassword.classList.add('is-invalid');
            confirmPassword.classList.remove('is-valid');
            confirmPasswordError.textContent = 'Password must be at least 8 characters long.';
            isValid = false;
        }
    } else {
        confirmPassword.classList.remove('is-invalid', 'is-valid');
    }
    
    // Enable/disable submit button based on validation
    if (newPasswordValue.length >= 8 && 
        confirmPasswordValue.length >= 8 && 
        newPasswordValue === confirmPasswordValue) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

/**
 * Handle form submission
 * @param {Event} e - Form submit event
 */

async function handleSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');
    const form = document.getElementById('resetPasswordForm');
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    // Get the reset token from the URL path (e.g., /accounts/reset/your_token/)
    // You may use window.location.pathname.split('/') or URLSearchParams if you use tokens in query
    const token = window.location.pathname.split('/').filter(Boolean).pop();

    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Resetting...';
    submitBtn.disabled = true;

    try {
        const resp = await fetch(`/accounts/reset/${token}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                new_password: newPassword,
                confirm_password: confirmPassword
            })
        });
        const data = await resp.json();

        if (resp.ok) {
            // Hide the form
            form.style.display = 'none';

            // Show success message
            successMessage.classList.remove('d-none');

            // Logout everywhere logic (extension, dashboard)
            window.postMessage({ type: 'LP_EXTENSION_LOGOUT' }, "*");
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            // Redirect after delay
            setTimeout(() => {
                window.location.href = "http://127.0.0.1:8000/home/";
            }, 2000);
        } else {
            submitBtn.innerHTML = 'Reset Password';
            submitBtn.disabled = false;
            // Show error (customize for your design)
            alert(data.error || 'Reset failed');
        }
    } catch {
        submitBtn.innerHTML = 'Reset Password';
        submitBtn.disabled = false;
        alert('Network error');
    }
}

/**
 * Initialize password visibility toggle buttons
 */
function initializePasswordToggles() {
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const newPasswordIcon = document.getElementById('newPasswordIcon');
    const confirmPasswordIcon = document.getElementById('confirmPasswordIcon');
    
    // Toggle new password visibility
    toggleNewPassword.addEventListener('click', function() {
        togglePasswordVisibility(newPasswordInput, newPasswordIcon);
    });
    
    // Toggle confirm password visibility
    toggleConfirmPassword.addEventListener('click', function() {
        togglePasswordVisibility(confirmPasswordInput, confirmPasswordIcon);
    });
}

/**
 * Toggle password field visibility
 * @param {HTMLInputElement} passwordInput - Password input field
 * @param {HTMLElement} icon - Eye icon element
 */
function togglePasswordVisibility(passwordInput, icon) {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('bi-eye');
        icon.classList.add('bi-eye-slash');
    } else {
        passwordInput.type = 'password';
        icon.classList.remove('bi-eye-slash');
        icon.classList.add('bi-eye');
    }
}

/**
 * Handle keyboard accessibility
 * Allows Enter key to submit form when button is enabled
 */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn && !submitBtn.disabled) {
            e.preventDefault();
            document.getElementById('resetPasswordForm').requestSubmit();
        }
    }
});
