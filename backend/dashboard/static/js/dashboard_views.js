// ========================================
// VIEWS
// ========================================
function initializeViews() {
  const savedView = localStorage.getItem('currentView') || 'leads';
  switchView(savedView);
  updateSidebarActiveState(savedView);
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
  
  localStorage.setItem('currentView', view);
}
