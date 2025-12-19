/**
 * LinkedIn Productivity - Homepage JavaScript
 * Handles interactions, animations, and dynamic content
 */

// Wait for DOM to be fully loaded before executing scripts
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all page functionality
    initializePage();
});

/**
 * Main initialization function
 * Calls all component initialization functions
 */
function initializePage() {
    updateCopyrightYear();
    initializeAnimations();
    initializeCTAButtons();
    initializeSmoothScroll();
    initializeAccessibility();
    logPagePerformance();
}

/**
 * Update copyright year dynamically
 * Ensures the footer always shows the current year
 */
function updateCopyrightYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        const currentYear = new Date().getFullYear();
        yearElement.textContent = currentYear;
    }
}

/**
 * Initialize entrance animations
 * Adds fade-in animations to key elements on page load
 */
function initializeAnimations() {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        console.log('Reduced motion preference detected - skipping animations');
        return;
    }
    
    // Elements to animate on page load
    const animationTargets = [
        { selector: '.brand-logo', delay: 100 },
        { selector: '.hero-title', delay: 200 },
        { selector: '.hero-tagline', delay: 300 },
        { selector: '.btn-cta', delay: 400 },
        { selector: '.plan-card', delay: 500 }
    ];
    
    // Apply fade-in animation to each element
    animationTargets.forEach(target => {
        const elements = document.querySelectorAll(target.selector);
        
        elements.forEach((element, index) => {
            // Set initial state
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            // Animate in with staggered delay
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, target.delay + (index * 100));
        });
    });
}

/**
 * Initialize CTA button interactions
 * Adds click tracking and visual feedback
 */
function initializeCTAButtons() {
    // Get all CTA buttons (download and plan buttons)
    const ctaButtons = document.querySelectorAll('.btn-cta, .btn-plan');
    
    ctaButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Add click animation
            this.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            // Log button click for analytics
            const buttonText = this.textContent.trim();
            console.log(`CTA Button clicked: "${buttonText}" at ${new Date().toISOString()}`);
            
            // Optional: Send to analytics service
            // trackButtonClick(buttonText);
        });
        
        // Enhance hover effects
        button.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s ease';
        });
    });
}

/**
 * Initialize smooth scrolling for anchor links
 * Provides smooth scroll behavior for internal links
 */
function initializeSmoothScroll() {
    // Get all anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Only proceed if target exists
            if (targetId !== '#' && targetId !== '') {
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    e.preventDefault();
                    
                    // Smooth scroll to target
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                    
                    // Update URL without jumping
                    history.pushState(null, null, targetId);
                }
            }
        });
    });
}

/**
 * Accessibility enhancements
 * Ensures keyboard navigation and screen reader support
 */
function initializeAccessibility() {
    // Add skip to main content link
    addSkipToMainLink();
    
    // Ensure all interactive elements are keyboard accessible
    const interactiveElements = document.querySelectorAll('a, button');
    
    interactiveElements.forEach(element => {
        // Ensure proper tabindex
        if (!element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }
        
        // Add keyboard support for Enter key
        element.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && this.tagName === 'A' && !this.hasAttribute('href')) {
                this.click();
            }
        });
    });
    
    // Announce dynamic content changes to screen readers
    announceToScreenReader('LinkedIn Productivity homepage loaded');
}

/**
 * Add skip to main content link for screen readers
 * Improves accessibility for keyboard and screen reader users
 */
function addSkipToMainLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#plans';
    skipLink.className = 'skip-to-main';
    skipLink.textContent = 'Skip to plans section';
    skipLink.setAttribute('aria-label', 'Skip to main content');
    
    // Style the skip link (visible only on focus)
    skipLink.style.cssText = `
        position: absolute;
        left: -9999px;
        z-index: 999;
        padding: 1rem 1.5rem;
        background: ${getComputedStyle(document.documentElement).getPropertyValue('--color-primary')};
        color: white;
        text-decoration: none;
        border-radius: 0 0 8px 0;
        font-weight: 600;
    `;
    
    // Show skip link on focus
    skipLink.addEventListener('focus', function() {
        this.style.left = '0';
        this.style.top = '0';
    });
    
    // Hide skip link when it loses focus
    skipLink.addEventListener('blur', function() {
        this.style.left = '-9999px';
    });
    
    // Insert skip link as first element in body
    document.body.insertBefore(skipLink, document.body.firstChild);
}

/**
 * Announce messages to screen readers
 * Uses ARIA live regions for dynamic content
 */
function announceToScreenReader(message) {
    // Create or get existing live region
    let liveRegion = document.getElementById('sr-live-region');
    
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'sr-live-region';
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -9999px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
    }
    
    // Announce message
    liveRegion.textContent = message;
    
    // Clear message after announcement
    setTimeout(() => {
        liveRegion.textContent = '';
    }, 1000);
}

/**
 * Log page performance metrics
 * Tracks and logs page load performance
 */
function logPagePerformance() {
    // Wait for page to fully load
    window.addEventListener('load', function() {
        // Use setTimeout to ensure all resources are loaded
        setTimeout(() => {
            if (window.performance && window.performance.timing) {
                const perfData = window.performance.timing;
                const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                const domContentLoadedTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
                
                console.log('=== Page Performance Metrics ===');
                console.log(`Page Load Time: ${pageLoadTime}ms`);
                console.log(`DOM Content Loaded: ${domContentLoadedTime}ms`);
                console.log('================================');
                
                // Optional: Send to analytics service
                // trackPerformance({ pageLoadTime, domContentLoadedTime });
            }
        }, 0);
    });
}

/**
 * Handle page visibility changes
 * Useful for analytics and performance optimization
 */
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Page hidden at:', new Date().toISOString());
    } else {
        console.log('Page visible at:', new Date().toISOString());
    }
});

/**
 * Global error handler
 * Catches and logs JavaScript errors
 */
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
    
    // Optional: Send to error tracking service
    // trackError(e);
});

/**
 * Track button clicks (placeholder for analytics integration)
 * Replace with actual analytics implementation
 */
function trackButtonClick(buttonText) {
    // Example Google Analytics event tracking
    // if (typeof gtag !== 'undefined') {
    //     gtag('event', 'click', {
    //         'event_category': 'CTA Button',
    //         'event_label': buttonText
    //     });
    // }
    
    console.log('Button click tracked:', buttonText);
}

/**
 * Track performance metrics (placeholder for analytics integration)
 * Replace with actual analytics implementation
 */
function trackPerformance(metrics) {
    // Example performance tracking
    // if (typeof gtag !== 'undefined') {
    //     gtag('event', 'timing_complete', {
    //         'name': 'page_load',
    //         'value': metrics.pageLoadTime
    //     });
    // }
    
    console.log('Performance metrics tracked:', metrics);
}

/**
 * Export functions for testing (if using a module system)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializePage,
        updateCopyrightYear,
        initializeAnimations,
        initializeCTAButtons,
        initializeSmoothScroll,
        initializeAccessibility
    };
}
