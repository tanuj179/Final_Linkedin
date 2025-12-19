// ========================================
// LEADS MANAGEMENT
// ========================================
async function fetchLeads() {
  console.log('[Dashboard] Fetching leads...');

  if (!extensionAccessToken) {
    console.warn('[Dashboard] No token for leads fetch');
    leadsData = [];
    filteredLeads = [];
    renderLeads();
    return;
  }

  try {
    const resp = await fetch("http://127.0.0.1:8000/leads/my/", {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + extensionAccessToken }
    });

    if (!handleApiResponse(resp)) {
      leadsData = [];
      filteredLeads = [];
      renderLeads();
      return;
    }

    if (resp.ok) {
      const apiLeads = await resp.json();
      leadsData = apiLeads.map(lead => transformLeadData(lead));
      filteredLeads = [...leadsData];
      console.log(`[Dashboard] Loaded ${leadsData.length} leads`);
      renderLeads();
    } else {
      console.error('[Dashboard] Failed to fetch leads:', resp.status);
      leadsData = [];
      filteredLeads = [];
      renderLeads();
    }
  } catch (err) {
    console.error('[Dashboard] Error fetching leads:', err);
    leadsData = [];
    filteredLeads = [];
    renderLeads();
  }
}

function transformLeadData(apiLead) {
  const nameParts = (apiLead.name || 'Unknown').trim().split(' ');
  let avatar = '';

  if (nameParts.length === 1) {
    avatar = nameParts[0].substring(0, 2).toUpperCase();
  } else {
    avatar = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }

  return {
    id: apiLead.id,
    name: apiLead.name || 'Unknown',
    title: apiLead.job_title || '',
    company: apiLead.company || '',
    email: apiLead.email || '',
    status: apiLead.tags || 'prospect',
    addedDate: apiLead.added_date,
    avatar: avatar,
    avatarColor: generateAvatarColor(apiLead.name || 'Unknown'),
    linkedin_url: apiLead.linkedin_url
  };
}

function generateAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const gradients = [
    'linear-gradient(135deg, #a855f7, #ec4899)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #22c55e, #10b981)',
    'linear-gradient(135deg, #f97316, #ef4444)',
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #8b5cf6, #d946ef)',
    'linear-gradient(135deg, #14b8a6, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #10b981, #059669)'
  ];

  return gradients[Math.abs(hash) % gradients.length];
}

function filterLeads() {
  const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('filterStatus')?.value || 'all';

  const newlyFilteredLeads = leadsData.filter(lead => {
    const matchesSearch =
      (lead.name || '').toLowerCase().includes(searchTerm) ||
      (lead.company || '').toLowerCase().includes(searchTerm) ||
      (lead.email || '').toLowerCase().includes(searchTerm);

    const matchesStatus = statusFilter === 'all' ||
      (lead.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  if (newlyFilteredLeads.length !== filteredLeads.length) {
    currentPage = 1;
  }

  filteredLeads = newlyFilteredLeads;
  renderLeads();
}

function renderLeads() {
  const leadsTableBody = document.getElementById('leadsTableBody');
  const leadsCards = document.getElementById('leadsCards');
  const emptyState = document.getElementById('emptyState');
  const leadsCount = document.getElementById('leadsCount');
  const tableCard = document.getElementById('leadsTableCard');

  const totalLeads = filteredLeads.length;
  const startIndex = (currentPage - 1) * leadsPerPage;
  const endIndex = startIndex + leadsPerPage;
  const leadsToRender = filteredLeads.slice(startIndex, endIndex);

  if (leadsCount) {
    leadsCount.textContent = `${totalLeads} ${totalLeads === 1 ? 'lead' : 'leads'} found`;
  }

  // Empty state: hide both layouts, show empty card
  if (totalLeads === 0) {
    if (tableCard) tableCard.classList.add('d-none');   // hides table even on desktop
    if (leadsCards) leadsCards.classList.add('d-none'); // hides cards even on mobile
    emptyState?.classList.remove('d-none');
    renderPaginationControls(0);
    return;
  } else {
    // Restore Bootstrap defaults; do NOT touch responsive classes
    if (tableCard) tableCard.classList.remove('d-none');
    if (leadsCards) leadsCards.classList.remove('d-none');
    emptyState?.classList.add('d-none');
  }

  // TABLE
  if (leadsTableBody) {
    leadsTableBody.innerHTML = leadsToRender.map(lead => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="lead-avatar" style="background: ${lead.avatarColor}">
              ${window.dashboardEscapeHtml(lead.avatar)}
            </div>
            <div>
              <div class="fw-semibold">${window.dashboardEscapeHtml(lead.name)}</div>
              <div class="small text-muted">${window.dashboardEscapeHtml(lead.title)}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-building text-muted"></i>
            <span>${window.dashboardEscapeHtml(lead.company) || '-'}</span>
          </div>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-envelope text-muted"></i>
            <span class="small">${window.dashboardEscapeHtml(lead.email) || '-'}</span>
          </div>
        </td>
        <td>
          <span class="status-badge status-${lead.status.toLowerCase()}">
            ${window.dashboardEscapeHtml(lead.status.toUpperCase())}
          </span>
        </td>
        <td>${window.dashboardFormatDate(lead.addedDate)}</td>
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

  // CARDS
  if (leadsCards) {
    leadsCards.innerHTML = leadsToRender.map(lead => `
      <div class="lead-card">
        <div class="d-flex align-items-start gap-3 mb-3">
          <div class="lead-avatar" style="background: ${lead.avatarColor}">
            ${window.dashboardEscapeHtml(lead.avatar)}
          </div>
          <div class="flex-grow-1">
            <div class="fw-semibold mb-1">${window.dashboardEscapeHtml(lead.name)}</div>
            <div class="small text-muted mb-1">${window.dashboardEscapeHtml(lead.title)}</div>
            <div class="d-flex align-items-center gap-2 small text-muted mb-2">
              <i class="bi bi-building"></i>
              <span>${window.dashboardEscapeHtml(lead.company) || '-'}</span>
            </div>
            <span class="status-badge status-${lead.status.toLowerCase()}">
              ${window.dashboardEscapeHtml(lead.status.toUpperCase())}
            </span>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2 small text-muted mb-3">
          <i class="bi bi-envelope"></i>
          <span class="text-truncate">${window.dashboardEscapeHtml(lead.email) || '-'}</span>
        </div>
        <div class="d-flex justify-content-between align-items-center">
          <span class="small text-muted">${window.dashboardFormatDate(lead.addedDate)}</span>
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

  renderPaginationControls(totalLeads);
}

// ========================================
// LEAD ACTIONS
// ========================================
function openLinkedIn(id) {
  const lead = leadsData.find(l => l.id === id);
  if (lead?.linkedin_url) {
    window.open(lead.linkedin_url, '_blank');
  } else {
    window.dashboardShowSnackbar('LinkedIn URL not available', 'warning');
  }
}

function editLead(id) {
  window.dashboardShowSnackbar('Edit functionality coming soon!', 'info');
}

function deleteLead(id) {
  leadIdToDelete = id;
  const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  modal.show();
}

// ========================================
// PAGINATION CONTROLS
// ========================================
function goToPage(page) {
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  if (page >= 1 && page <= totalPages) {
    currentPage = page;
    renderLeads();
  }
}

function renderPaginationControls(totalLeads) {
  const paginationEl = document.getElementById('leadsPagination');
  if (!paginationEl) return;

  const totalPages = Math.ceil(totalLeads / leadsPerPage);

  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let paginationHtml = `<ul class="pagination mb-0">`;

  paginationHtml += `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
  `;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (currentPage <= 3) {
    endPage = Math.min(totalPages, 5);
    startPage = 1;
  }
  if (currentPage > totalPages - 3) {
    startPage = Math.max(1, totalPages - 4);
    endPage = totalPages;
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHtml += `
      <li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
      </li>
    `;
  }

  paginationHtml += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `;

  paginationHtml += `</ul>`;
  paginationEl.innerHTML = paginationHtml;
}

// ========================================
// LEADS TABLE INIT
// ========================================
function initializeLeadsTable() {
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const exportBtn = document.getElementById('exportBtn');

  searchInput?.addEventListener('input', filterLeads);
  filterStatus?.addEventListener('change', filterLeads);
  exportBtn?.addEventListener('click', () => {
    window.dashboardShowSnackbar('Export functionality coming soon!', 'info');
  });
}

document.getElementById('confirmDeleteBtn')?.addEventListener('click', async function () {
  if (!leadIdToDelete) return;

  this.disabled = true;

  try {
    const resp = await fetch(`http://127.0.0.1:8000/leads/delete/${leadIdToDelete}/`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + extensionAccessToken },
      targetAddressSpace: 'local'
    });

    if (!handleApiResponse(resp)) {
      this.disabled = false;
      return;
    }

    if (resp.ok) {
      leadsData = leadsData.filter(lead => lead.id !== leadIdToDelete);
      filterLeads();
      window.dashboardShowSnackbar("Lead deleted successfully!", "success");
    } else if (resp.status === 404) {
      window.dashboardShowSnackbar("Lead not found", "warning");
      fetchLeads();
    } else {
      window.dashboardShowSnackbar("Delete failed, please try again", "danger");
    }
  } catch (err) {
    console.error('[Dashboard] Error deleting lead:', err);
    window.dashboardShowSnackbar("Network error. Please try again.", "danger");
  }

  bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
  this.disabled = false;
  leadIdToDelete = null;
});
