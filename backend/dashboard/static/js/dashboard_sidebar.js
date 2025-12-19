// ========================================
// SIDEBAR
// ========================================
function initializeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const toggleIcon = document.getElementById('toggleIcon');
  
  const savedState = localStorage.getItem('sidebarCollapsed');
  if (savedState === 'true') {
    sidebarCollapsed = true;
    sidebar?.classList.add('collapsed');
    toggleIcon?.classList.replace('bi-chevron-left', 'bi-chevron-right');
  }
  
  sidebarToggle?.addEventListener('click', function() {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar?.classList.toggle('collapsed');
    
    if (sidebarCollapsed) {
      toggleIcon?.classList.replace('bi-chevron-left', 'bi-chevron-right');
    } else {
      toggleIcon?.classList.replace('bi-chevron-right', 'bi-chevron-left');
    }
    
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
  });
  
  mobileMenuBtn?.addEventListener('click', function() {
    sidebar?.classList.toggle('show');
    sidebarOverlay?.classList.toggle('show');
  });
  
  sidebarOverlay?.addEventListener('click', function() {
    sidebar?.classList.remove('show');
    sidebarOverlay?.classList.remove('show');
  });
  
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', function() {
      const view = this.getAttribute('data-view');
      switchView(view);
      updateSidebarActiveState(view);
      
      sidebar?.classList.remove('show');
      sidebarOverlay?.classList.remove('show');
    });
  });
}

function updateSidebarActiveState(view) {
  document.querySelectorAll('.sidebar-item').forEach(item => {
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}
