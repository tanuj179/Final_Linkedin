// ========================================
// MESSAGE LISTENER (Extension Communication)
// ========================================
function initializeMessageListener() {
  console.log('[Dashboard] Attaching message listener...');
  
  window.addEventListener('message', function(event) {
    console.log('[Dashboard] Message event received:', event.data);
    
    if (!event.data) {
      console.log('[Dashboard] No data in event, skipping');
      return;
    }

    const msgType = event.data.type;
    console.log('[Dashboard] Processing message type:', msgType);
    
    // Handle token from extension
    if (msgType === 'LP_EXTENSION_TOKEN') {
      console.log('[Dashboard] ✅ Token received');
      extensionAccessToken = event.data.token;
      tokenReceived = true;
      fillUserProfile();

      if (typeof fetchProfileOptimizer === 'function') {
        fetchProfileOptimizer();
      }
      // 🔹 NEW: load history once token is ready
      if (typeof fetchProfileOptimizerHistory === 'function') {
        fetchProfileOptimizerHistory();
      }

      return;
    }
    
    // Handle new lead saved
    if (msgType === 'LP_LEAD_ADDED') {
      console.log('[Dashboard] ✅ Lead added, refreshing leads...');
      fetchLeads();
      if (currentView !== 'leads') {
        switchView('leads');
        updateSidebarActiveState('leads');
      }
      window.dashboardShowSnackbar('Lead saved successfully!', 'success');
      return;
    }
    
    // Handle lead updated
    if (msgType === 'LP_LEAD_UPDATED') {
      console.log('[Dashboard] ✅ Lead updated, refreshing...');
      fetchLeads();
      return;
    }

    // Handle profile analysis completion
    if (msgType === 'LP_PROFILE_ANALYSIS_DONE') {
      console.log('[Dashboard] ✅ Profile analysis done!');
      if (typeof fetchProfileOptimizer === 'function') {
        console.log('[Dashboard] Fetching updated profile optimizer...');
        fetchProfileOptimizer();
      }
      // 🔹 NEW: also refresh history when a new analysis is created
      if (typeof fetchProfileOptimizerHistory === 'function') {
        fetchProfileOptimizerHistory();
      }

      setTimeout(() => {
        console.log('[Dashboard] Showing success snackbar');
        window.dashboardShowSnackbar('✅ Profile analysis complete! Check your updated score.', 'success');
      }, 800);
      return;
    }

    console.log('[Dashboard] Unknown message type:', msgType);
  });
}
