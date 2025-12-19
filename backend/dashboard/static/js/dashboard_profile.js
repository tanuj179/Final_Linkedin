// ========================================
// USER PROFILE
// ========================================
async function fillUserProfile() {
  const nameEls = [
    document.getElementById('profileName'),
    document.getElementById('profileDropdownName')
  ];
  const emailEls = [
    document.getElementById('profileEmail'),
    document.getElementById('profileDropdownEmail')
  ];

  if (!extensionAccessToken) {
    console.warn('[Dashboard] No token for profile fetch');
    window.location.href = "http://127.0.0.1:8000/home/";
    return;
  }

  nameEls.forEach(el => el && (el.textContent = "Loading..."));
  emailEls.forEach(el => el && (el.textContent = ""));

  try {
    const resp = await fetch("http://127.0.0.1:8000/accounts/profile/", {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + extensionAccessToken }
    });

    if (!handleApiResponse(resp)) return;

    if (resp.ok) {
      const data = await resp.json();
      nameEls.forEach(el => el && (el.textContent = data.username || 'User'));
      emailEls.forEach(el => el && (el.textContent = data.email || ''));
      console.log('[Dashboard] Profile loaded, fetching leads...');
      fetchLeads();
    } else {
      nameEls.forEach(el => el && (el.textContent = "Not available"));
    }
  } catch (err) {
    console.error('[Dashboard] Error loading profile:', err);
    nameEls.forEach(el => el && (el.textContent = "Error"));
  }
}
