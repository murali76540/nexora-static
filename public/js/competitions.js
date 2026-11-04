/**
 * NEXORA Competitions Directory & Join Flow
 * E.G.S. Pillay Engineering College
 */

let allCompetitions = [];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('competitionsGrid') || document.getElementById('featuredCompetitionsGrid')) {
    loadCompetitions();
  }
  initFilters();
});

async function loadCompetitions() {
  const grid = document.getElementById('competitionsGrid') || document.getElementById('featuredCompetitionsGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">Loading competitions from institutional ledger...</div>';

  try {
    const res = await NexoraAPI.request('/competitions');
    allCompetitions = res.competitions || [];
    renderCompetitions(allCompetitions, grid);
  } catch (err) {
    grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger-red); text-align: center; padding: 3rem;">Failed to load competitions: ${err.message}</div>`;
  }
}

function renderCompetitions(competitions, container) {
  if (competitions.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No active competitions found matching criteria.</div>';
    return;
  }

  container.innerHTML = competitions.map(comp => {
    const remainingSlots = Math.max(0, (comp.participantLimit || 100) - (comp.currentParticipants || 0));
    const deadlineFormatted = comp.initialDeadline ? new Date(comp.initialDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
    const isFull = remainingSlots === 0;

    const now = Date.now();
    const startTimeMs = comp.startTime ? new Date(comp.startTime).getTime() : 0;
    const isUpcoming = startTimeMs > now;
    const startFormatted = comp.startTime ? new Date(comp.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;

    let statusBadge = '<span class="badge badge-emerald">ACTIVE (V1.0)</span>';
    if (isUpcoming) {
      statusBadge = '<span class="badge badge-amber">🔒 STARTS SOON</span>';
    } else if (comp.currentVersion === '2.0') {
      statusBadge = '<span class="badge badge-impact-critical">⚡ DISRUPTION ACTIVE</span>';
    } else if (comp.currentVersion === 'DRAFT') {
      statusBadge = '<span class="badge badge-cyan">OPEN FOR ENROLLMENT</span>';
    }

    return `
      <div class="card card-hover" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.4rem;">
            <span class="badge badge-blue">${comp.department}</span>
            ${statusBadge}
          </div>

          <h3 style="font-size: 1.15rem; margin-bottom: 0.6rem; line-height: 1.4;">${comp.title}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem;">${comp.description}</p>
        </div>

        <div>
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.85rem; margin-bottom: 1.25rem; font-size: 0.8rem; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="color: var(--text-muted);">Available Slots</div>
              <strong style="color: ${isFull ? 'var(--danger-red)' : 'var(--accent-cyan)'}; font-family: var(--font-mono);">
                ${remainingSlots} / ${comp.participantLimit || 100} left
              </strong>
            </div>
            <div style="text-align: right;">
              <div style="color: var(--text-muted);">${isUpcoming ? 'Starts At' : 'Initial Deadline'}</div>
              <strong class="font-mono">${isUpcoming ? startFormatted : deadlineFormatted}</strong>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem;">
            <a href="/competition.html?id=${comp.id}" class="btn btn-secondary btn-sm" style="flex: 1;">View Dossier</a>
            <button onclick="openJoinModal('${comp.id}', '${comp.title.replace(/'/g, "\\'")}')" class="btn btn-primary btn-sm" style="flex: 1;" ${isFull ? 'disabled' : ''}>
              ${isFull ? 'Challenge Full' : 'Enroll Now'}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initFilters() {
  const searchInput = document.getElementById('compSearchInput');
  const deptFilter = document.getElementById('deptFilterSelect');

  const filterAction = () => {
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const dept = deptFilter ? deptFilter.value : '';

    const filtered = allCompetitions.filter(c => {
      const matchQuery = c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query);
      const matchDept = dept === '' || c.department.includes(dept);
      return matchQuery && matchDept;
    });

    const grid = document.getElementById('competitionsGrid');
    if (grid) renderCompetitions(filtered, grid);
  };

  if (searchInput) searchInput.addEventListener('input', filterAction);
  if (deptFilter) deptFilter.addEventListener('change', filterAction);
}

// Modal Join Logic
let currentJoinCompId = null;

function openJoinModal(id, title) {
  const user = NexoraAPI.getUser();
  if (!user) {
    showToast('Please log in as a member to enroll.', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 800);
    return;
  }

  currentJoinCompId = id;
  const modal = document.getElementById('joinModal');
  const modalTitle = document.getElementById('joinModalCompTitle');
  if (modalTitle) modalTitle.textContent = title;
  if (modal) modal.classList.add('open');
}

function closeJoinModal() {
  const modal = document.getElementById('joinModal');
  if (modal) modal.classList.remove('open');
}

async function confirmJoinCompetition() {
  if (!currentJoinCompId) return;

  const pathwayRadio = document.querySelector('input[name="selectedPathway"]:checked');
  const pathway = pathwayRadio ? pathwayRadio.value : 'AI_ASSISTED';

  const btn = document.getElementById('confirmJoinBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enrolling in Challenge...';
  }

  try {
    const res = await NexoraAPI.request(`/competitions/${currentJoinCompId}/join`, {
      method: 'POST',
      body: JSON.stringify({ pathway })
    });

    showToast('Successfully enrolled! Launching Challenge Workspace...', 'success');
    closeJoinModal();
    setTimeout(() => {
      window.location.href = `/workspace.html?id=${currentJoinCompId}`;
    }, 600);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Confirm Enrollment';
    }
  }
}

window.openJoinModal = openJoinModal;
window.closeJoinModal = closeJoinModal;
window.confirmJoinCompetition = confirmJoinCompetition;
