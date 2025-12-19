// ========================================
// PROFILE OPTIMIZER (simple)
// ========================================

let profileOptimizerData = null;
let profileOptimizerHistory = [];

// pagination state for history
let profileHistoryPage = 1;
const profileHistoryPerPage = 5;

async function fetchProfileOptimizer() {
  console.log('[Dashboard] Fetching profile optimizer data...');

  if (!extensionAccessToken) {
    console.warn('[Dashboard] No token for profile optimizer');
    return;
  }

  try {
    const resp = await fetch('http://127.0.0.1:8000/profile-optimizer/latest/', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + extensionAccessToken }
    });

    if (!handleApiResponse(resp)) {
      return;
    }

    if (!resp.ok) {
      console.error('[Dashboard] Profile optimizer fetch failed:', resp.status);
      return;
    }

    profileOptimizerData = await resp.json();
    renderProfileOptimizer();
  } catch (err) {
    console.error('[Dashboard] Error fetching profile optimizer:', err);
  }
}

// fetch ALL analyses for history table
async function fetchProfileOptimizerHistory() {
  console.log('[Dashboard] Fetching profile optimizer history...');

  if (!extensionAccessToken) {
    console.warn('[Dashboard] No token for profile optimizer history');
    return;
  }

  try {
    const resp = await fetch('http://127.0.0.1:8000/profile-optimizer/analyses/', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + extensionAccessToken }
    });

    if (!handleApiResponse(resp)) {
      return;
    }

    if (!resp.ok) {
      console.error('[Dashboard] Profile optimizer history fetch failed:', resp.status);
      return;
    }

    profileOptimizerHistory = await resp.json();
    profileHistoryPage = 1;       // reset page whenever new data comes
    renderProfileOptimizerHistory();
  } catch (err) {
    console.error('[Dashboard] Error fetching profile optimizer history:', err);
  }
}

function renderProfileOptimizer() {
  if (!profileOptimizerData) return;
  const d = profileOptimizerData;

  // ----- SCORE BLOCK -----
  const scoreValueEl = document.getElementById('profileScoreValue');
  const scoreMaxEl = document.getElementById('profileScoreMax');
  const headingEl = document.getElementById('profileScoreHeading');
  const subtitleEl = document.getElementById('profileScoreSubtitle');
  const badgeTextEl = document.getElementById('profileScoreBadgeText');

  if (scoreValueEl) scoreValueEl.textContent = d.overall_score ?? 0;
  if (scoreMaxEl) scoreMaxEl.textContent = 100; // fixed denominator for now
  if (headingEl) headingEl.textContent = 'AI Profile Score';
  if (subtitleEl && !subtitleEl.dataset.locked) {
    subtitleEl.textContent = 'Latest profile analysis';
  }
  if (badgeTextEl) badgeTextEl.textContent = `Overall score: ${d.overall_score}/100`;

  // ----- TIPS AS TITLED SECTIONS -----
  const tipsHeadingEl = document.getElementById('improvementTipsHeading');
  const tipsListEl = document.getElementById('tipsList');
  if (tipsHeadingEl) tipsHeadingEl.textContent = 'Improvement Tips';

  if (!tipsListEl) return;

  const quickWins       = Array.isArray(d.quick_wins)       ? d.quick_wins       : [];
  const headlineOptions = Array.isArray(d.headline_options) ? d.headline_options : [];
  const aboutOutline    = Array.isArray(d.about_outline)    ? d.about_outline    : [];
  const ctaSnippets     = Array.isArray(d.cta_snippets)     ? d.cta_snippets     : [];
  const assetSpecs      = Array.isArray(d.asset_specs)      ? d.asset_specs      : [];

  const sections = [];

  if (quickWins.length) {
    sections.push({
      title: 'Quick Wins',
      priority: 'high',
      items: quickWins
    });
  }

  if (headlineOptions.length) {
    sections.push({
      title: 'Headline Ideas',
      priority: 'medium',
      items: headlineOptions
    });
  }

  if (aboutOutline.length) {
    sections.push({
      title: 'About Section Outline',
      priority: 'medium',
      items: aboutOutline
    });
  }

  if (ctaSnippets.length) {
    sections.push({
      title: 'CTA Ideas',
      priority: 'low',
      items: ctaSnippets
    });
  }

  if (assetSpecs.length) {
    sections.push({
      title: 'Assets to Prepare',
      priority: 'low',
      items: assetSpecs.map(
        spec => `${spec.name}: recommended size ${spec.size}`
      )
    });
  }

  if (!sections.length) {
    tipsListEl.innerHTML = '<div class="text-muted small">No tips available.</div>';
    return;
  }

  tipsListEl.classList.add('profile-sections-grid');

  tipsListEl.innerHTML = sections.map((section, index) => {
    const priority = section.priority || 'medium';
    let badgeClass = 'bg-warning-subtle text-warning';
    if (priority === 'high') badgeClass = 'bg-danger-subtle text-danger';
    if (priority === 'low')  badgeClass = 'bg-info-subtle text-info';

    const itemsHtml = (section.items || []).map(text => `
      <li>${window.dashboardEscapeHtml(text)}</li>
    `).join('');

    const countLabel = `${section.items?.length || 0} tips`;
    const isOpen = false;

    return `
      <div class="profile-section-card ${isOpen ? 'is-open' : 'is-collapsed'}" data-priority="${priority}">
        <div class="profile-section-header">
          <div>
            <div class="profile-section-title">
              ${window.dashboardEscapeHtml(section.title)}
            </div>
            <div class="profile-section-meta">
              ${window.dashboardEscapeHtml(countLabel)}
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge ${badgeClass} profile-section-priority">
              ${window.dashboardEscapeHtml(priority)}
            </span>
            <button class="profile-section-toggle" type="button" data-section-index="${index}">
              <i class="bi bi-chevron-down profile-section-toggle-icon"></i>
            </button>
          </div>
        </div>
        <div class="profile-section-body ${isOpen ? '' : 'collapsed'}">
          <ul>
            ${itemsHtml}
          </ul>
        </div>
      </div>
    `;
  }).join('');
}

// history renderer with pagination (5 per page), date-only, latest first
function renderProfileOptimizerHistory() {
  const tbody   = document.getElementById('profileHistoryBody');
  const countEl = document.getElementById('profileHistoryCount');
  const emptyEl = document.getElementById('profileHistoryEmptyState');
  const pagerEl = document.getElementById('profileHistoryPagination');

  if (!tbody) return;

  if (!Array.isArray(profileOptimizerHistory) || profileOptimizerHistory.length === 0) {
    tbody.innerHTML = '';
    if (countEl) countEl.textContent = '0 analyses found';
    if (emptyEl) emptyEl.classList.remove('d-none');
    if (pagerEl) pagerEl.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.classList.add('d-none');

  // latest first
  const sorted = [...profileOptimizerHistory].sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (countEl) countEl.textContent = `${sorted.length} analyses found`;

  const totalPages = Math.ceil(sorted.length / profileHistoryPerPage);
  if (profileHistoryPage > totalPages) profileHistoryPage = totalPages;

  const startIdx = (profileHistoryPage - 1) * profileHistoryPerPage;
  const pageItems = sorted.slice(startIdx, startIdx + profileHistoryPerPage);

  tbody.innerHTML = pageItems.map(item => {
    const d = item.created_at ? new Date(item.created_at) : null;
    const dateStr = d ? d.toLocaleDateString() : 'Unknown'; // date only [web:82][web:88]
    const score   = item.overall_score ?? 0;
    const section = item.section || 'full';
    const status  = item.ocr_status || 'ok';

    return `
      <tr data-analysis-id="${item.id}">
        <td>${window.dashboardEscapeHtml(dateStr)}</td>
        <td>${window.dashboardEscapeHtml(String(score))}</td>
        <td>${window.dashboardEscapeHtml(section)}</td>
        <td>${window.dashboardEscapeHtml(status)}</td>
        <td class="text-center">
          <button type="button"
                  class="btn btn-sm btn-outline-primary profile-history-view-btn"
                  data-analysis-id="${item.id}">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // pagination controls
  if (pagerEl) {
    if (totalPages <= 1) {
      pagerEl.innerHTML = '';
    } else {
      let html = `
        <nav aria-label="Profile history pages">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item ${profileHistoryPage === 1 ? 'disabled' : ''}">
              <button class="page-link profile-history-page-btn" data-page="${profileHistoryPage - 1}">&laquo;</button>
            </li>
      `;
      for (let p = 1; p <= totalPages; p++) {
        html += `
          <li class="page-item ${p === profileHistoryPage ? 'active' : ''}">
            <button class="page-link profile-history-page-btn" data-page="${p}">${p}</button>
          </li>
        `;
      }
      html += `
            <li class="page-item ${profileHistoryPage === totalPages ? 'disabled' : ''}">
              <button class="page-link profile-history-page-btn" data-page="${profileHistoryPage + 1}">&raquo;</button>
            </li>
          </ul>
        </nav>
      `;
      pagerEl.innerHTML = html;
    }
  }
}

// ========================================
// GLOBAL PROFILE OPTIMIZER HANDLERS
// ========================================

if (window.__profileOptimizerToggleListenerSetup !== true) {
  document.addEventListener('click', function (event) {
    // 1) section toggle (existing behaviour)
    const toggleBtn = event.target.closest('.profile-section-toggle');
    if (toggleBtn) {
      const card = toggleBtn.closest('.profile-section-card');
      const body = card?.querySelector('.profile-section-body');

      if (!card || !body) return;

      card.classList.toggle('is-open');
      card.classList.toggle('is-collapsed');
      body.classList.toggle('collapsed');
      event.stopPropagation();
      return;
    }

    // 2) history "View" button
    const viewBtn = event.target.closest('.profile-history-view-btn');
    if (viewBtn) {
      const id = parseInt(viewBtn.getAttribute('data-analysis-id'), 10);
      const selected = profileOptimizerHistory.find(x => x.id === id);
      if (!selected) return;

      // reuse existing renderer with selected analysis
      profileOptimizerData = selected;

      const subtitleEl = document.getElementById('profileScoreSubtitle');
      if (subtitleEl && selected.created_at) {
        const d = new Date(selected.created_at);
        subtitleEl.textContent = `Analysis from ${d.toLocaleDateString()}`;
        subtitleEl.dataset.locked = '1';
      }

      renderProfileOptimizer();

      if (typeof window.dashboardShowSnackbar === 'function') {
        window.dashboardShowSnackbar('Loaded analysis for this profile. Card updated.', 'info');
      }
      return;
    }

    // 3) history pagination buttons
    const pageBtn = event.target.closest('.profile-history-page-btn');
    if (pageBtn) {
      const page = parseInt(pageBtn.getAttribute('data-page'), 10);
      if (!isNaN(page) && page > 0) {
        profileHistoryPage = page;
        renderProfileOptimizerHistory();
      }
      return;
    }
  });

  window.__profileOptimizerToggleListenerSetup = true;
}

// For future extension if needed
function initializeProfileOptimizer() {
  // currently no-op; data is fetched after token via fetchProfileOptimizer()
}
