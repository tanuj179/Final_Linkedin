/**
 * Email Verification Page JavaScript
 * Handles verification button click and success message display
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeVerification();
});

/**
 * Initialize verification functionality
 */
function initializeVerification() {
    const verifyBtn = document.getElementById('verifyBtn');
    const successMessage = document.getElementById('successMessage');
    
    if (verifyBtn && successMessage) {
        // Add click event listener to verify button
        verifyBtn.addEventListener('click', handleVerification);
    }
}

/**
 * Handle verification button click
 * Shows success message and disables button
 */
function handleVerification() {
    const verifyBtn = document.getElementById('verifyBtn');
    const successMessage = document.getElementById('successMessage');
    
    // Add loading state to button
    verifyBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verifying...';
    verifyBtn.disabled = true;
    
    // Simulate verification process (replace with actual API call if needed)
    setTimeout(() => {
        // Hide the button
        verifyBtn.style.display = 'none';
        
        // Show success message
        successMessage.classList.remove('d-none');
        
        // Log verification (for debugging)
        console.log('User verified at:', new Date().toISOString());
        
        // Optional: Redirect to login page after a delay
        // setTimeout(() => {
        //     window.location.href = 'login.html';
        // }, 3000);
        
    }, 1500); // 1.5 second delay to simulate processing
}

/**
 * Handle keyboard accessibility
 * Allows Enter key to trigger verification
 */
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const verifyBtn = document.getElementById('verifyBtn');
        if (verifyBtn && !verifyBtn.disabled && verifyBtn.style.display !== 'none') {
            verifyBtn.click();
        }
    }
});
