// Dashboard JavaScript

// Sample leads data
const leadsData = [
    {
        id: 1,
        name: 'Sarah Johnson',
        title: 'VP of Sales',
        company: 'TechCorp Inc.',
        email: 'sarah.j@techcorp.com',
        status: 'hot',
        addedDate: '2025-01-10',
        avatar: 'SJ',
        avatarColor: 'linear-gradient(135deg, #a855f7, #ec4899)'
    },
    {
        id: 2,
        name: 'Michael Chen',
        title: 'Marketing Director',
        company: 'Growth Solutions',
        email: 'mchen@growth.io',
        status: 'warm',
        addedDate: '2025-01-12',
        avatar: 'MC',
        avatarColor: 'linear-gradient(135deg, #3b82f6, #06b6d4)'
    },
    {
        id: 3,
        name: 'Emily Rodriguez',
        title: 'CEO',
        company: 'StartupX',
        email: 'emily@startupx.com',
        status: 'hot',
        addedDate: '2025-01-15',
        avatar: 'ER',
        avatarColor: 'linear-gradient(135deg, #22c55e, #10b981)'
    },
    {
        id: 4,
        name: 'David Kim',
        title: 'Product Manager',
        company: 'InnovateLabs',
        email: 'dkim@innovate.com',
        status: 'cold',
        addedDate: '2025-01-08',
        avatar: 'DK',
        avatarColor: 'linear-gradient(135deg, #f97316, #ef4444)'
    },
    {
        id: 5,
        name: 'Jessica Taylor',
        title: 'Head of Operations',
        company: 'CloudNet',
        email: 'jtaylor@cloudnet.com',
        status: 'warm',
        addedDate: '2025-01-14',
        avatar: 'JT',
        avatarColor: 'linear-gradient(135deg, #6366f1, #a855f7)'
    },
    {
        id: 6,
        name: 'Alex Martinez',
        title: 'CTO',
        company: 'DevWorks',
        email: 'alex@devworks.com',
        status: 'hot',
        addedDate: '2025-01-16',
        avatar: 'AM',
        avatarColor: 'linear-gradient(135deg, #ec4899, #f43f5e)'
    }
];

// State
let currentView = 'leads';
let filteredLeads = [...leadsData];
let sidebarCollapsed = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebar();
    initializeViews();
    initializeLeadsTable();
    initializeModals();
    initializeFilters();
    renderLeads();
});

// Sidebar functionality
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const toggleIcon = document.getElementById('toggleIcon');

    // Desktop sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebarCollapsed = !sidebarCollapsed;
            sidebar.classList.toggle('collapsed');
            
            if (sidebarCollapsed) {
                toggleIcon.classList.remove('bi-chevron-left');
                toggleIcon.classList.add('bi-chevron-right');
            } else {
                toggleIcon.classList.remove('bi-chevron-right');
                toggleIcon.classList.add('bi-chevron-left');
            }
        });
    }

    // Mobile sidebar toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            sidebarOverlay.classList.toggle('show');
        });
    }

    // Close mobile sidebar when overlay is clicked
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
        });
    }

    // Sidebar navigation
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            switchView(view);
            
            // Close mobile sidebar after selection
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('show');
            
            // Update active state
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// View switching
function initializeViews() {
    // Set initial view to leads
    switchView('leads');
}

function switchView(view) {
    currentView = view;
    const profileView = document.getElementById('profileView');
    const leadsView = document.getElementById('leadsView');
    
    if (view === 'profile') {
        profileView.style.display = 'block';
        leadsView.style.display = 'none';
    } else {
        profileView.style.display = 'none';
        leadsView.style.display = 'block';
    }
}

// Leads table functionality
function initializeLeadsTable() {
    const searchInput = document.getElementById('searchInput');
    const filterStatus = document.getElementById('filterStatus');
    const exportBtn = document.getElementById('exportBtn');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterLeads();
        });
    }
    
    if (filterStatus) {
        filterStatus.addEventListener('change', function() {
            filterLeads();
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            alert('Exporting leads to CSV...');
        });
    }
}

function initializeFilters() {
    // Filters are already initialized in initializeLeadsTable
}

function filterLeads() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    
    filteredLeads = leadsData.filter(lead => {
        const matchesSearch = 
            lead.name.toLowerCase().includes(searchTerm) ||
            lead.company.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm);
        
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
    
    renderLeads();
}

function renderLeads() {
    const leadsTableBody = document.getElementById('leadsTableBody');
    const leadsCards = document.getElementById('leadsCards');
    const emptyState = document.getElementById('emptyState');
    const leadsCount = document.getElementById('leadsCount');
    const tableCard = leadsTableBody.closest('.card');
    
    // Update count
    if (leadsCount) {
        const count = filteredLeads.length;
        leadsCount.textContent = `${count} ${count === 1 ? 'lead' : 'leads'} found`;
    }
    
    // Show/hide empty state
    if (filteredLeads.length === 0) {
        if (tableCard) tableCard.classList.add('d-none');
        if (leadsCards) leadsCards.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
        return;
    } else {
        if (tableCard) tableCard.classList.remove('d-none');
        if (leadsCards) leadsCards.classList.remove('d-none');
        if (emptyState) emptyState.classList.add('d-none');
    }
    
    // Render desktop table
    if (leadsTableBody) {
        leadsTableBody.innerHTML = filteredLeads.map(lead => `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="lead-avatar" style="background: ${lead.avatarColor}">
                            ${lead.avatar}
                        </div>
                        <div>
                            <div class="fw-semibold">${lead.name}</div>
                            <div class="small text-muted">${lead.title}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-building text-muted"></i>
                        <span>${lead.company}</span>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-envelope text-muted"></i>
                        <span class="small">${lead.email}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge status-${lead.status}">
                        ${lead.status.toUpperCase()}
                    </span>
                </td>
                <td>${formatDate(lead.addedDate)}</td>
                <td>
                    <div class="d-flex gap-2 justify-content-center">
                        <button class="action-btn action-btn-linkedin" onclick="openLinkedIn(${lead.id})" title="View LinkedIn Profile">
                            <i class="bi bi-linkedin"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editLead(${lead.id})" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteLead(${lead.id})" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Render mobile cards
    if (leadsCards) {
        leadsCards.innerHTML = filteredLeads.map(lead => `
            <div class="lead-card">
                <div class="d-flex align-items-start gap-3 mb-3">
                    <div class="lead-avatar" style="background: ${lead.avatarColor}">
                        ${lead.avatar}
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-semibold mb-1">${lead.name}</div>
                        <div class="small text-muted mb-1">${lead.title}</div>
                        <div class="d-flex align-items-center gap-2 small text-muted mb-2">
                            <i class="bi bi-building"></i>
                            <span>${lead.company}</span>
                        </div>
                        <span class="status-badge status-${lead.status}">
                            ${lead.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2 small text-muted mb-3">
                    <i class="bi bi-envelope"></i>
                    <span class="text-truncate">${lead.email}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="small text-muted">${formatDate(lead.addedDate)}</span>
                    <div class="d-flex gap-2">
                        <button class="action-btn action-btn-linkedin" onclick="openLinkedIn(${lead.id})">
                            <i class="bi bi-linkedin"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editLead(${lead.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deleteLead(${lead.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Lead actions
function openLinkedIn(id) {
    window.open('https://linkedin.com', '_blank');
}

function editLead(id) {
    alert(`Editing lead ${id}`);
}

function deleteLead(id) {
    if (confirm('Are you sure you want to delete this lead?')) {
        const index = leadsData.findIndex(lead => lead.id === id);
        if (index > -1) {
            leadsData.splice(index, 1);
            filterLeads();
        }
    }
}

// Date formatter
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Modal functionality
function initializeModals() {
    // Refresh Score Button
    const refreshScoreBtn = document.getElementById('refreshScoreBtn');
    if (refreshScoreBtn) {
        refreshScoreBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            icon.classList.add('rotating');
            this.disabled = true;
            
            setTimeout(() => {
                icon.classList.remove('rotating');
                this.disabled = false;
                const newScore = Math.floor(Math.random() * 20) + 80;
                document.querySelector('.score-value').textContent = newScore;
            }, 2000);
        });
    }
    
    // Update Password Form
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const alertBox = document.getElementById('updatePasswordAlert');
            
            // Validation
            if (!oldPassword || !newPassword || !confirmPassword) {
                showAlert(alertBox, 'danger', 'All fields are required');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showAlert(alertBox, 'danger', 'New passwords do not match');
                return;
            }
            
            if (newPassword.length < 8) {
                showAlert(alertBox, 'danger', 'Password must be at least 8 characters');
                return;
            }
            
            // Success
            showAlert(alertBox, 'success', 'Password updated successfully!');
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('updatePasswordModal')).hide();
                updatePasswordForm.reset();
                alertBox.classList.add('d-none');
            }, 2000);
        });
    }
    
    // Reset Password Form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            const alertBox = document.getElementById('resetPasswordAlert');
            
            // Validation
            if (!email) {
                showAlert(alertBox, 'danger', 'Email is required');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showAlert(alertBox, 'danger', 'Please enter a valid email address');
                return;
            }
            
            // Success (80% success rate for demo)
            const success = Math.random() > 0.2;
            if (success) {
                showAlert(alertBox, 'success', 'Password reset link sent to your email!');
                setTimeout(() => {
                    bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal')).hide();
                    resetPasswordForm.reset();
                    alertBox.classList.add('d-none');
                }, 2000);
            } else {
                showAlert(alertBox, 'danger', 'Failed to send reset link. Please try again.');
            }
        });
    }
    
    // Logout Confirmation
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function() {
            alert('You have been logged out successfully!');
            bootstrap.Modal.getInstance(document.getElementById('logoutModal')).hide();
        });
    }
}

// Show alert helper
function showAlert(alertBox, type, message) {
    alertBox.className = `alert alert-${type} d-flex align-items-center`;
    alertBox.innerHTML = `
        <i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2"></i>
        <span>${message}</span>
    `;
    alertBox.classList.remove('d-none');
}

// Close modals and reset forms when hidden
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('hidden.bs.modal', function() {
        const form = this.querySelector('form');
        if (form) form.reset();
        
        const alert = this.querySelector('.alert');
        if (alert) alert.classList.add('d-none');
    });
});
