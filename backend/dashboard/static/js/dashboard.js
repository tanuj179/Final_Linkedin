/**
 * LinkedIn Productivity Dashboard - Optimized
 * Handles leads management, profile display, and user interactions
 */

// ========================================
// STATE MANAGEMENT
// ========================================
let leadsData = [];
let filteredLeads = [];
let extensionAccessToken = null;
let tokenReceived = false;
let sidebarCollapsed = false;
let currentView = 'leads';
let leadIdToDelete = null;
// ========================================
// PAGINATION STATE
// ========================================
let currentPage = 1;
const leadsPerPage = 10;

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[Dashboard] Initializing...');
    
    initializeSidebar();
    initializeViews();
    initializeLeadsTable();
    initializeModals();
    initializeMessageListener();
    startTokenTimeout();
    
});

