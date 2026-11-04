/**
 * NEXORA Unified Dashboard Architecture
 * STRICT REQUIREMENT: EXACTLY THREE DASHBOARD CATEGORIES
 * 1. Member Dashboard
 * 2. Organiser Dashboard
 * 3. Admin Dashboard
 * E.G.S. Pillay Engineering College
 */

let currentUser = null;
let activeCategory = 'member';
let countdownTimerInterval = null;
let allLiveCompetitions = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = NexoraAPI.getUser();

  // Validate Authentication & Determine Category
  if (!currentUser) {
    showToast('Authentication required. Redirecting to login...', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 600);
    return;
  }

  // Determine authorized category from role
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');

  // Enforce authorized role-based category access
  if (currentUser.role === 'admin') {
    activeCategory = (requestedTab === 'organizer' || requestedTab === 'admin') ? requestedTab : 'admin';
  } else if (currentUser.role === 'organizer') {
    activeCategory = 'organizer';
  } else {
    activeCategory = 'member';
  }

  renderSidebar();
  renderCategoryView();
});

// Render Sidebar with ONLY the user's authorized category
function renderSidebar() {
  const categoryLabel = document.getElementById('sidebarCategoryLabel');
  const userMiniName = document.getElementById('userMiniName');
  const userMiniRole = document.getElementById('userMiniRole');
  const userAvatarChar = document.getElementById('userAvatarChar');
  const navContainer = document.getElementById('sidebarNavItems');

  if (userMiniName) userMiniName.textContent = currentUser.name || currentUser.email;
  if (userMiniRole) userMiniRole.textContent = currentUser.role.toUpperCase();
  if (userAvatarChar) userAvatarChar.textContent = (currentUser.name || currentUser.email || 'U')[0].toUpperCase();

  if (categoryLabel) {
    if (activeCategory === 'member') categoryLabel.textContent = 'MEMBER CATEGORY';
    if (activeCategory === 'organizer') categoryLabel.textContent = 'ORGANISER CATEGORY';
    if (activeCategory === 'admin') categoryLabel.textContent = 'ADMIN CATEGORY';
  }

  if (!navContainer) return;

  // Build navigation items strictly for the active authorized category
  if (activeCategory === 'member') {
    navContainer.innerHTML = `
      <div class="sidebar-section-title">Member Navigation</div>
      <a href="#member-overview" class="sidebar-link active" onclick="switchSection('member-overview', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
        Overview
      </a>
      <a href="#member-problems" class="sidebar-link" onclick="switchSection('member-problems', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        Problem Statements
      </a>
      <a href="#member-joined" class="sidebar-link" onclick="switchSection('member-joined', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        My Joined Challenges
      </a>
      <a href="#member-browse" class="sidebar-link" onclick="switchSection('member-browse', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon></svg>
        Join Active Challenges
      </a>
      <a href="#member-history" class="sidebar-link" onclick="switchSection('member-history', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        Submission History
      </a>
    `;
  } else if (activeCategory === 'organizer') {
    navContainer.innerHTML = `
      <div class="sidebar-section-title">Organiser Navigation</div>
      <a href="#org-competitions" class="sidebar-link active" onclick="switchSection('org-competitions', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        Competition Management
      </a>
      <a href="#org-problem" class="sidebar-link" onclick="switchSection('org-problem', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        Problem Versioning (V1 & V2)
      </a>
      <a href="#org-submissions" class="sidebar-link" onclick="switchSection('org-submissions', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
        Submissions & Receipts
      </a>
      <a href="#org-judge" class="sidebar-link" onclick="switchSection('org-judge', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7.5" r="4"></circle></svg>
        Scoped Judge Evaluation
      </a>
      <a href="#org-leaderboard" class="sidebar-link" onclick="switchSection('org-leaderboard', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        Leaderboard Controls
      </a>
    `;
  } else if (activeCategory === 'admin') {
    navContainer.innerHTML = `
      <div class="sidebar-section-title">Admin Navigation</div>
      <a href="#admin-overview" class="sidebar-link active" onclick="switchSection('admin-overview', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        System Overview
      </a>
      <a href="#admin-users" class="sidebar-link" onclick="switchSection('admin-users', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        User Management
      </a>
      <a href="#admin-leaderboard" class="sidebar-link" onclick="switchSection('admin-leaderboard', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        Master Leaderboard Control
      </a>
      <a href="#admin-audit" class="sidebar-link" onclick="switchSection('admin-audit', this)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        Security Audit Logs
      </a>
    `;
  }
}

// Section Switching
function switchSection(sectionId, linkEl) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  if (linkEl) {
    linkEl.classList.add('active');
  } else {
    const matchingLink = document.querySelector(`.sidebar-link[href="#${sectionId}"]`);
    if (matchingLink) matchingLink.classList.add('active');
  }

  document.querySelectorAll('.dashboard-view-section').forEach(sec => {
    sec.style.display = 'none';
  });

  const target = document.getElementById(sectionId);
  if (target) {
    target.style.display = 'block';
  }

  if (sectionId === 'member-problems') {
    loadMemberProblems();
  }
}

// Render Content for Category
async function renderCategoryView() {
  document.getElementById('memberDashboardContainer').style.display = activeCategory === 'member' ? 'block' : 'none';
  document.getElementById('organizerDashboardContainer').style.display = activeCategory === 'organizer' ? 'block' : 'none';
  document.getElementById('adminDashboardContainer').style.display = activeCategory === 'admin' ? 'block' : 'none';

  if (activeCategory === 'member') {
    await loadMemberData();
    await loadMemberProblems();
  } else if (activeCategory === 'organizer') {
    await loadOrganizerData();
  } else if (activeCategory === 'admin') {
    await loadAdminData();
  }
}

/* ==========================================
   CATEGORY 1: MEMBER DASHBOARD LOGIC
   ========================================== */
async function loadMemberData() {
  try {
    const res = await NexoraAPI.request('/competitions/my-joined');
    const joined = res.joined || [];

    const joinedCountEl = document.getElementById('memberJoinedCount');
    if (joinedCountEl) joinedCountEl.textContent = joined.length;
    
    // Active submissions count
    const activeSubmissions = joined.filter(j => j.initialSubmitted).length;
    const subCountEl = document.getElementById('memberActiveSubCount');
    if (subCountEl) subCountEl.textContent = activeSubmissions;

    // Render joined cards in Overview
    const joinedList = document.getElementById('memberJoinedList');
    if (joinedList) {
      if (joined.length === 0) {
        joinedList.innerHTML = `
          <div style="color: var(--text-muted); padding: 1.5rem; text-align: center;">
            You have not enrolled in any challenges yet.
            <div style="margin-top: 0.75rem;">
              <a href="#member-browse" onclick="switchSection('member-browse', null)" class="btn btn-primary btn-sm">Explore Active Challenges</a>
            </div>
          </div>
        `;
      } else {
        joinedList.innerHTML = joined.map(j => {
          const comp = j.competition || {};
          const isV2 = comp.currentVersion === '2.0';
          return `
            <div class="card" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
              <div>
                <div style="display: flex; gap: 0.5rem; margin-bottom: 0.4rem; flex-wrap: wrap;">
                  <span class="badge badge-blue">${comp.department || 'Engineering'}</span>
                  <span class="badge ${isV2 ? 'badge-impact-critical' : 'badge-emerald'}">
                    ${isV2 ? '⚡ DISRUPTION ACTIVE' : 'STAGE 1 ACTIVE'}
                  </span>
                  <span class="badge badge-cyan">${j.pathway}</span>
                </div>
                <h4 style="font-size: 1.1rem; margin-bottom: 0.25rem;">${comp.title || j.competitionId}</h4>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  Status: ${j.revisedSubmitted ? 'Adaptive Revision Submitted ✅' : j.initialSubmitted ? 'Initial Solution Submitted ✅' : 'Pending Initial Submission ⏳'}
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <a href="#member-problems" onclick="switchSection('member-problems', null)" class="btn btn-outline btn-sm">View Problem</a>
                <a href="/workspace.html?id=${j.competitionId}" class="btn btn-primary btn-sm">Open Workspace</a>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Render detailed joined list
    const detailedJoinedList = document.getElementById('memberJoinedDetailedList');
    if (detailedJoinedList && joinedList) {
      detailedJoinedList.innerHTML = joinedList.innerHTML;
    }

    // Load submission history
    const subRes = await NexoraAPI.request('/submissions/my-submissions');
    const subs = subRes.submissions || [];
    const historyList = document.getElementById('memberSubHistoryTable');
    if (historyList) {
      if (subs.length === 0) {
        historyList.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No submissions recorded yet.</td></tr>';
      } else {
        historyList.innerHTML = subs.map(s => `
          <tr>
            <td class="font-mono font-bold" style="color: var(--accent-cyan);">${s.receiptId}</td>
            <td>${s.solutionTitle}</td>
            <td><span class="badge ${s.version === '2.0' ? 'badge-impact-critical' : 'badge-blue'}">v${s.version}</span></td>
            <td class="font-mono" style="font-size: 0.75rem;">${s.receiptHash.slice(0, 16)}...</td>
            <td><button onclick="verifyCryptographicReceipt('${s.receiptId}')" class="btn btn-outline btn-sm">Verify Hash</button></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load member dashboard: ' + err.message, 'error');
  }
}

// MEMBER: Load Problem Statement Dashboard
async function loadMemberProblems() {
  const container = document.getElementById('memberProblemsList');
  if (!container) return;

  container.innerHTML = '<div style="color: var(--text-muted); padding: 1.5rem; text-align: center;">Loading problem statements from institutional ledger...</div>';

  try {
    const res = await NexoraAPI.request('/competitions/my-problems');
    const problems = res.problems || [];

    if (problems.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 3.5rem 1.5rem;">
          <div style="font-size: 2.75rem; margin-bottom: 0.75rem;">📋</div>
          <h3 style="margin-bottom: 0.5rem;">No Problem Statements Available</h3>
          <p style="color: var(--text-secondary); max-width: 540px; margin: 0 auto 1.5rem;">
            You have not enrolled in any competitions yet, or no challenge problem statements have been deployed.
            Problem statements will be displayed here once you enroll and the admin updates the problem statements based on the competition starting time.
          </p>
          <a href="#member-browse" onclick="switchSection('member-browse', null)" class="btn btn-primary btn-sm">Explore Active Competitions</a>
        </div>
      `;
      return;
    }

    container.innerHTML = problems.map(p => {
      const startTimeFormatted = p.startTime ? new Date(p.startTime).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'TBD';

      const deadlineFormatted = p.initialDeadline ? new Date(p.initialDeadline).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'TBD';

      // CASE 1: LOCKED BEFORE START TIME
      if (p.problemStatus === 'LOCKED') {
        return `
          <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--warning-amber);">
            <div class="card-header">
              <div>
                <span class="badge badge-blue">${p.department}</span>
                <h3 style="font-size: 1.35rem; margin-top: 0.35rem;">${p.title}</h3>
              </div>
              <span class="badge badge-amber">🔒 LOCKED UNTIL START</span>
            </div>

            <div style="padding: 1.5rem 0; text-align: center;">
              <div style="font-size: 3rem; margin-bottom: 0.75rem;">⏳</div>
              <h4 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--warning-amber);">Problem Statement Embargo Active</h4>
              <p style="color: var(--text-secondary); max-width: 580px; margin: 0 auto 1.25rem; font-size: 0.9rem;">
                The problem statement for this competition has not been released yet. The administration will update problem statements based on the competition starting time.
              </p>

              <div style="display: inline-flex; align-items: center; gap: 1.5rem; background: var(--bg-secondary); padding: 1rem 1.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Official Starting Time</div>
                  <strong class="font-mono" style="color: var(--text-primary); font-size: 0.95rem;">${startTimeFormatted}</strong>
                </div>
                <div style="border-left: 1px solid var(--border-strong); padding-left: 1.5rem;">
                  <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Unlocks Automatically In</div>
                  <strong class="font-mono countdown-timer" data-seconds="${p.secondsUntilStart}" style="font-size: 1.35rem; color: var(--warning-amber);">
                    ${formatSeconds(p.secondsUntilStart)}
                  </strong>
                </div>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-subtle); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted);">
              <span>Enrolled Pathway: <strong style="color: var(--accent-cyan);">${p.pathway}</strong></span>
              <span>Deadline: <strong class="font-mono">${deadlineFormatted}</strong></span>
            </div>
          </div>
        `;
      }

      // CASE 2: PENDING ADMIN RELEASE (STARTED, BUT NO V1 PUBLISHED YET)
      if (p.problemStatus === 'PENDING_ADMIN') {
        return `
          <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--accent-cyan);">
            <div class="card-header">
              <div>
                <span class="badge badge-blue">${p.department}</span>
                <h3 style="font-size: 1.35rem; margin-top: 0.35rem;">${p.title}</h3>
              </div>
              <span class="badge badge-cyan">⏳ AWAITING ADMIN UPDATE</span>
            </div>

            <div style="padding: 1.5rem 0; text-align: center;">
              <div style="font-size: 2.75rem; margin-bottom: 0.75rem;">📝</div>
              <h4 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--accent-cyan);">Competition Has Begun!</h4>
              <p style="color: var(--text-secondary); max-width: 560px; margin: 0 auto 1.25rem; font-size: 0.9rem;">
                The competition starting time has arrived. The administrator is currently updating the official problem statement specifications. It will appear here as soon as published.
              </p>
              <button onclick="loadMemberProblems()" class="btn btn-outline btn-sm">Check for Admin Problem Statement Update</button>
            </div>
          </div>
        `;
      }

      // CASE 3: UNLOCKED PROBLEM STATEMENT (V1 / V2 LIVE)
      const v1 = p.v1 || {};
      const v2 = p.v2 || null;

      const v1Reqs = (v1.technicalRequirements || []).map(r => `<li>${r}</li>`).join('') || '<li style="color: var(--text-muted);">No specific requirements listed.</li>';
      const v1Consts = (v1.constraints || []).map(c => `<li>${c}</li>`).join('') || '<li style="color: var(--text-muted);">Standard engineering constraints apply.</li>';

      let v2DisruptionHtml = '';
      if (v2) {
        const v2Reqs = (v2.newRequirements || []).map(r => `<li style="color: #F87171;">⚠️ ${r}</li>`).join('');
        v2DisruptionHtml = `
          <div style="margin-top: 1.5rem; background: rgba(239, 68, 68, 0.08); border-left: 4px solid var(--danger-red); padding: 1.25rem; border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h4 style="color: #F87171; font-size: 1.1rem; margin: 0;">⚡ VERSION 2.0 CRITICAL DISRUPTION DETECTED</h4>
              <span class="badge badge-impact-${(v2.impactLevel || 'critical').toLowerCase()}">IMPACT: ${v2.impactLevel}</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-primary); margin-bottom: 0.75rem;">${v2.updatedStatement}</p>
            <strong style="font-size: 0.8rem; text-transform: uppercase; color: #F87171;">New Technical Constraints:</strong>
            <ul style="padding-left: 1.25rem; margin-top: 0.35rem; font-size: 0.85rem;">
              ${v2Reqs}
            </ul>
            ${v2.explanationOfChanges ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;"><strong>Rationale:</strong> ${v2.explanationOfChanges}</div>` : ''}
          </div>
        `;
      }

      return `
        <div class="card" style="margin-bottom: 2rem; border-left: 4px solid var(--success-emerald);">
          <div class="card-header">
            <div>
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
                <span class="badge badge-blue">${p.department}</span>
                <span class="badge badge-cyan">${p.pathway}</span>
                <span class="badge ${v2 ? 'badge-impact-critical' : 'badge-emerald'}">
                  ${v2 ? 'Version 2.0 Active' : 'Version 1.0 Baseline'}
                </span>
              </div>
              <h3 style="font-size: 1.35rem; margin-bottom: 0.25rem;">${p.title}</h3>
            </div>
            <a href="/workspace.html?id=${p.competitionId}" class="btn btn-primary btn-sm">Launch Workspace &rarr;</a>
          </div>

          <div style="margin-top: 1rem;">
            <h4 style="font-size: 1.1rem; color: var(--accent-cyan); margin-bottom: 0.5rem;">${v1.title || 'Official Problem Specification'}</h4>
            ${v1.realWorldBackground ? `<p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.6;">${v1.realWorldBackground}</p>` : ''}
            
            <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-bottom: 1.25rem;">
              <strong style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">Problem Statement:</strong>
              <div style="font-size: 0.95rem; line-height: 1.65; color: var(--text-primary); white-space: pre-line;">${v1.problemStatement}</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
              <div>
                <strong style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Technical Requirements:</strong>
                <ul style="padding-left: 1.25rem; margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                  ${v1Reqs}
                </ul>
              </div>
              <div>
                <strong style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Operational Constraints:</strong>
                <ul style="padding-left: 1.25rem; margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
                  ${v1Consts}
                </ul>
              </div>
            </div>

            ${v2DisruptionHtml}
          </div>

          <div style="border-top: 1px solid var(--border-subtle); margin-top: 1.5rem; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Started: <strong class="font-mono">${startTimeFormatted}</strong> | Deadline: <strong class="font-mono" style="color: var(--warning-amber);">${deadlineFormatted}</strong>
            </div>
            <a href="/workspace.html?id=${p.competitionId}" class="btn btn-secondary btn-sm">
              ${p.initialSubmitted ? 'Review / Revise Solution' : 'Submit Initial Solution (Stage 04)'}
            </a>
          </div>
        </div>
      `;
    }).join('');

    initCountdownTimers();
  } catch (err) {
    container.innerHTML = `<div style="color: var(--danger-red); padding: 1.5rem; text-align: center;">Error loading problem statements: ${err.message}</div>`;
  }
}

// Timer Helper: Formats total seconds into HH:MM:SS
function formatSeconds(totalSec) {
  if (totalSec <= 0) return '00:00:00';
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 24) {
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return `${days}d ${remHrs}h ${mins.toString().padStart(2, '0')}m`;
  }
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function initCountdownTimers() {
  if (countdownTimerInterval) clearInterval(countdownTimerInterval);

  countdownTimerInterval = setInterval(() => {
    let anyNeedsRefresh = false;
    document.querySelectorAll('.countdown-timer').forEach(el => {
      let current = parseInt(el.dataset.seconds, 10);
      if (current > 0) {
        current -= 1;
        el.dataset.seconds = current;
        el.textContent = formatSeconds(current);
        if (current === 0) anyNeedsRefresh = true;
      }
    });

    if (anyNeedsRefresh) {
      showToast('Competition start time reached! Problem statement unlocked.', 'success');
      loadMemberProblems();
    }
  }, 1000);
}

/* ==========================================
   CATEGORY 2: ORGANISER DASHBOARD LOGIC
   ========================================== */
async function loadOrganizerData() {
  try {
    const res = await NexoraAPI.request('/competitions');
    allLiveCompetitions = res.competitions || [];

    // Populate all competition dropdown selectors across tabs
    const compSelects = document.querySelectorAll('.org-comp-selector, .admin-comp-selector');
    compSelects.forEach(sel => {
      if (allLiveCompetitions.length === 0) {
        sel.innerHTML = '<option value="">No competitions configured yet</option>';
      } else {
        const currentVal = sel.value;
        sel.innerHTML = allLiveCompetitions.map(c => `
          <option value="${c.id}">${c.title} (Ver ${c.currentVersion || '1.0'})</option>
        `).join('');
        if (currentVal && allLiveCompetitions.some(c => c.id === currentVal)) {
          sel.value = currentVal;
        }
      }
    });

    // Auto-populate V1 Form fields when target changes
    const v1TargetSelect = document.getElementById('v1TargetComp');
    if (v1TargetSelect && !v1TargetSelect.dataset.listener) {
      v1TargetSelect.dataset.listener = 'true';
      v1TargetSelect.addEventListener('change', populateV1FormForSelectedComp);
    }
    populateV1FormForSelectedComp();

    // Render competition management cards
    const orgCompTable = document.getElementById('orgCompetitionsTable');
    if (orgCompTable) {
      if (allLiveCompetitions.length === 0) {
        orgCompTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No competitions deployed yet. Deploy your first competition above.</td></tr>';
      } else {
        orgCompTable.innerHTML = allLiveCompetitions.map(c => `
          <tr>
            <td>
              <strong>${c.title}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${c.department}</div>
              <div style="font-size: 0.7rem; color: var(--accent-cyan); font-family: var(--font-mono);">Starts: ${c.startTime ? new Date(c.startTime).toLocaleString() : 'TBD'}</div>
            </td>
            <td><span class="badge ${c.currentVersion === '2.0' ? 'badge-impact-critical' : 'badge-emerald'}">Ver ${c.currentVersion || '1.0'}</span></td>
            <td class="font-mono">${c.currentParticipants || 0} / ${c.participantLimit || 100}</td>
            <td><span class="badge badge-cyan">${c.status || 'ACTIVE'}</span></td>
            <td>
              <a href="/workspace.html?id=${c.id}" class="btn btn-secondary btn-sm">Inspect</a>
              <button onclick="loadCompetitionRoster('${c.id}')" class="btn btn-outline btn-sm">Roster</button>
            </td>
          </tr>
        `).join('');
      }
    }

    // Attach Create Competition Form handler
    const createCompForm = document.getElementById('orgCreateCompForm');
    if (createCompForm && !createCompForm.dataset.bound) {
      createCompForm.dataset.bound = 'true';

      // Set default datetime inputs to now + 2 hours for start, now + 3 days for deadline
      const now = new Date();
      const defaultStart = new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 16);
      const defaultDeadline = new Date(now.getTime() + 72 * 3600 * 1000).toISOString().slice(0, 16);
      const startInp = document.getElementById('newCompStartTime');
      const deadInp = document.getElementById('newCompDeadline');
      if (startInp && !startInp.value) startInp.value = defaultStart;
      if (deadInp && !deadInp.value) deadInp.value = defaultDeadline;

      createCompForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('newCompTitle').value;
        const department = document.getElementById('newCompDept').value;
        const description = document.getElementById('newCompDesc').value;
        const participantLimit = parseInt(document.getElementById('newCompLimit').value, 10) || 100;
        const startTime = document.getElementById('newCompStartTime').value ? new Date(document.getElementById('newCompStartTime').value).toISOString() : new Date().toISOString();
        const initialDeadline = document.getElementById('newCompDeadline').value ? new Date(document.getElementById('newCompDeadline').value).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString();

        try {
          await NexoraAPI.request('/competitions', {
            method: 'POST',
            body: JSON.stringify({ title, department, description, participantLimit, startTime, initialDeadline })
          });
          showToast('Competition created successfully! Now update its problem statement in Problem Versioning tab.', 'success');
          createCompForm.reset();
          loadOrganizerData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    }

    // Attach Version 1.0 Problem Statement Creation / Update Form handler
    const updateV1Form = document.getElementById('updateV1ProblemForm');
    if (updateV1Form && !updateV1Form.dataset.bound) {
      updateV1Form.dataset.bound = 'true';
      updateV1Form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const competitionId = document.getElementById('v1TargetComp').value;
        if (!competitionId) {
          showToast('Please select a target competition.', 'error');
          return;
        }

        const title = document.getElementById('v1ProblemTitle').value;
        const realWorldBackground = document.getElementById('v1RealWorldBackground').value;
        const problemStatement = document.getElementById('v1ProblemStatement').value;
        const technicalRequirements = document.getElementById('v1TechnicalReqs').value.split('\n').filter(r => r.trim());
        const constraints = document.getElementById('v1Constraints').value.split('\n').filter(c => c.trim());
        const startTimeVal = document.getElementById('v1CompStartTime').value;
        const startTime = startTimeVal ? new Date(startTimeVal).toISOString() : undefined;

        try {
          await NexoraAPI.request(`/competitions/${competitionId}/update-problem`, {
            method: 'POST',
            body: JSON.stringify({
              title,
              realWorldBackground,
              problemStatement,
              technicalRequirements,
              constraints,
              startTime
            })
          });
          showToast('Problem statement updated successfully! It will unlock for members based on competition start time.', 'success');
          loadOrganizerData();
        } catch (err) {
          showToast('Failed to update problem statement: ' + err.message, 'error');
        }
      });
    }

    // Attach Version 2.0 Shift Release Form handler
    const publishV2Form = document.getElementById('publishV2DisruptionForm');
    if (publishV2Form && !publishV2Form.dataset.bound) {
      publishV2Form.dataset.bound = 'true';
      publishV2Form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const competitionId = document.getElementById('v2TargetComp').value;
        if (!competitionId) {
          showToast('Please select a competition.', 'error');
          return;
        }

        const disruptionType = document.getElementById('v2DisruptionType').value;
        const impactLevel = document.getElementById('v2ImpactLevel').value;
        const updatedStatement = document.getElementById('v2UpdatedStatement').value;
        const newReqs = document.getElementById('v2NewReqs').value.split('\n').filter(r => r.trim());
        const explanationOfChanges = document.getElementById('v2Explanation').value;
        const deadlineExtensionHours = parseInt(document.getElementById('v2ExtensionHours').value, 10) || 0;

        try {
          await NexoraAPI.request(`/competitions/${competitionId}/publish-v2`, {
            method: 'POST',
            body: JSON.stringify({
              disruptionType,
              impactLevel,
              updatedStatement,
              newRequirements: newReqs,
              explanationOfChanges,
              deadlineExtensionHours
            })
          });
          showToast('Version 2.0 Disruption published! Real-time alerts broadcasted to participants.', 'success');
          loadOrganizerData();
        } catch (err) {
          showToast('Failed to publish V2.0: ' + err.message, 'error');
        }
      });
    }

    // Attach Scoped Rubric Evaluation Form handler
    initRubricForm();
  } catch (err) {
    showToast('Failed to load organizer dashboard: ' + err.message, 'error');
  }
}

// Auto-fill V1 Problem Form when competition is selected
async function populateV1FormForSelectedComp() {
  const sel = document.getElementById('v1TargetComp');
  if (!sel || !sel.value) return;

  const compId = sel.value;
  try {
    const res = await NexoraAPI.request(`/competitions/${compId}`);
    const comp = res.competition;
    const versions = res.versions || [];
    const v1 = versions.find(v => v.versionNumber === '1.0');

    const titleInp = document.getElementById('v1ProblemTitle');
    const startInp = document.getElementById('v1CompStartTime');
    const bgInp = document.getElementById('v1RealWorldBackground');
    const statementInp = document.getElementById('v1ProblemStatement');
    const reqInp = document.getElementById('v1TechnicalReqs');
    const constInp = document.getElementById('v1Constraints');

    if (comp && comp.startTime && startInp) {
      startInp.value = new Date(comp.startTime).toISOString().slice(0, 16);
    }

    if (v1) {
      if (titleInp) titleInp.value = v1.title || '';
      if (bgInp) bgInp.value = v1.realWorldBackground || '';
      if (statementInp) statementInp.value = v1.problemStatement || '';
      if (reqInp) reqInp.value = (v1.technicalRequirements || []).join('\n');
      if (constInp) constInp.value = (v1.constraints || []).join('\n');
    } else {
      if (titleInp && !titleInp.value) titleInp.value = comp.title || '';
    }
  } catch (e) {}
}

// Scoped Judge Evaluation (7-Criteria Rubric)
function initRubricForm() {
  const form = document.getElementById('judgeEvaluationForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';

  // Live total score calculation
  const scoreInputs = form.querySelectorAll('.rubric-score-input');
  const liveTotalEl = document.getElementById('liveTotalWeightedScore');

  const updateLiveTotal = () => {
    let total = 0;
    const weights = {
      scorePU: 0.15,
      scoreTD: 0.15,
      scoreAD: 0.20,
      scoreCC: 0.15,
      scorePF: 0.15,
      scorePI: 0.10,
      scoreIN: 0.10
    };
    for (const [id, weight] of Object.entries(weights)) {
      const val = parseFloat(document.getElementById(id)?.value) || 0;
      total += val * weight;
    }
    if (liveTotalEl) liveTotalEl.textContent = total.toFixed(2);
  };

  scoreInputs.forEach(inp => inp.addEventListener('input', updateLiveTotal));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const competitionId = document.getElementById('evalTargetComp').value;
    const userId = document.getElementById('evalTargetUser').value;
    const pathway = document.getElementById('evalPathway').value;
    const publicFeedback = document.getElementById('evalPublicFeedback').value;
    const privateJudgeNotes = document.getElementById('evalPrivateNotes').value;

    const scores = {
      problemUnderstanding: parseFloat(document.getElementById('scorePU').value) || 0,
      technicalDepth: parseFloat(document.getElementById('scoreTD').value) || 0,
      adaptability: parseFloat(document.getElementById('scoreAD').value) || 0,
      codeCompleteness: parseFloat(document.getElementById('scoreCC').value) || 0,
      practicalFeasibility: parseFloat(document.getElementById('scorePF').value) || 0,
      pathwayIntegrity: parseFloat(document.getElementById('scorePI').value) || 0,
      innovation: parseFloat(document.getElementById('scoreIN').value) || 0
    };

    try {
      await NexoraAPI.request('/evaluations/submit', {
        method: 'POST',
        body: JSON.stringify({
          competitionId,
          userId,
          pathway,
          scores,
          publicFeedback,
          privateJudgeNotes
        })
      });
      showToast('Evaluation submitted with 7-criteria weighted calculation!', 'success');
      form.reset();
      updateLiveTotal();
    } catch (err) {
      showToast('Evaluation failed: ' + err.message, 'error');
    }
  });
}

// Leaderboard controls (Toggle & Publish)
async function toggleLeaderboardPublish(competitionId, publishState) {
  if (!competitionId) {
    showToast('Please select a competition first.', 'error');
    return;
  }
  try {
    const res = await NexoraAPI.request(`/leaderboard/${competitionId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ isPublished: publishState })
    });
    showToast(res.message, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function toggleSelectedLeaderboard(publishState) {
  const sel = document.getElementById('orgLeaderboardCompSelect');
  const compId = sel ? sel.value : null;
  toggleLeaderboardPublish(compId, publishState);
}

function previewSelectedLeaderboard() {
  const sel = document.getElementById('orgLeaderboardCompSelect');
  const compId = sel ? sel.value : null;
  if (!compId) {
    showToast('Please select a competition.', 'error');
    return;
  }
  window.open(`/results.html?comp=${compId}`, '_blank');
}

function toggleAdminSelectedLeaderboard(publishState) {
  const sel = document.getElementById('adminLeaderboardCompSelect');
  const compId = sel ? sel.value : null;
  toggleLeaderboardPublish(compId, publishState);
}

// Competition Roster Inspection
async function loadCompetitionRoster(competitionId) {
  const modal = document.getElementById('rosterModal');
  const content = document.getElementById('rosterModalContent');
  if (!modal || !content) return;

  modal.classList.add('open');
  content.innerHTML = '<div style="color: var(--text-muted); padding: 1.5rem; text-align: center;">Fetching roster from ledger...</div>';

  try {
    const res = await NexoraAPI.request(`/competitions/${competitionId}/roster`);
    const members = res.members || [];

    if (members.length === 0) {
      content.innerHTML = '<div style="color: var(--text-muted); padding: 2rem; text-align: center;">No students have enrolled in this competition yet.</div>';
      return;
    }

    content.innerHTML = `
      <div class="table-responsive">
        <table class="table-custom">
          <thead>
            <tr>
              <th>Student Member</th>
              <th>Pathway</th>
              <th>Initial Sub</th>
              <th>Revision</th>
              <th>Enrolled At</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td><strong>${m.userEmail || m.userId}</strong></td>
                <td><span class="badge ${m.pathway === 'WITHOUT_AI' ? 'badge-cyan' : 'badge-blue'}">${m.pathway}</span></td>
                <td>${m.initialSubmitted ? '✅ Submitted' : '⏳ Pending'}</td>
                <td>${m.revisedSubmitted ? '✅ Submitted' : '—'}</td>
                <td style="font-size: 0.75rem; color: var(--text-muted);">${new Date(m.joinedAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div style="color: var(--danger-red); padding: 1rem;">Failed to load roster: ${err.message}</div>`;
  }
}

function closeRosterModal() {
  const modal = document.getElementById('rosterModal');
  if (modal) modal.classList.remove('open');
}

// Receipt Verification Modal
async function verifyCryptographicReceipt(receiptId) {
  try {
    const res = await NexoraAPI.request(`/submissions/receipt/${receiptId}`);
    if (res.verified) {
      displayReceiptModal(res.receipt);
      showToast('Receipt verified against tamper-proof ledger!', 'success');
    }
  } catch (err) {
    showToast('Verification failed: ' + err.message, 'error');
  }
}

function displayReceiptModal(receipt) {
  const modal = document.getElementById('receiptModal');
  if (!modal) return;
  document.getElementById('modalReceiptId').textContent = receipt.receiptId;
  document.getElementById('modalReceiptHash').textContent = receipt.receiptHash;
  document.getElementById('modalReceiptTimestamp').textContent = new Date(receipt.submittedAt).toUTCString();
  modal.classList.add('open');
}

function closeReceiptModal() {
  const modal = document.getElementById('receiptModal');
  if (modal) modal.classList.remove('open');
}

/* ==========================================
   CATEGORY 3: ADMIN DASHBOARD LOGIC
   ========================================== */
async function loadAdminData() {
  try {
    // 1. Load System Overview Metrics
    const metricsRes = await NexoraAPI.request('/admin/metrics');
    const m = metricsRes.metrics || {};

    document.getElementById('adminMetricUsers').textContent = m.totalUsers || 0;
    document.getElementById('adminMetricComps').textContent = m.totalCompetitions || 0;
    document.getElementById('adminMetricSubs').textContent = m.totalSubmissions || 0;
    document.getElementById('adminMetricUptime').textContent = `${Math.floor((m.uptimeSeconds || 0) / 60)} min`;
    document.getElementById('adminMetricHealth').textContent = m.serverHealth || 'ONLINE';

    // Populate persistent database engine cards
    const dbStatusEl = document.getElementById('adminDbStatus');
    const dbRecordsEl = document.getElementById('adminDbRecords');
    const dbSizeEl = document.getElementById('adminDbSize');
    const dbPathEl = document.getElementById('adminDbPath');

    if (dbStatusEl) dbStatusEl.textContent = m.databaseStatus || 'CONNECTED';
    if (dbRecordsEl) dbRecordsEl.textContent = `${m.databaseRecords || 0} records`;
    if (dbSizeEl) dbSizeEl.textContent = `${m.diskSizeKB || 0} KB`;
    if (dbPathEl) dbPathEl.textContent = m.storageDirectory || './data';

    // 2. Load User Management
    const usersRes = await NexoraAPI.request('/admin/users');
    const users = usersRes.users || [];
    const usersTable = document.getElementById('adminUsersTable');
    if (usersTable) {
      if (users.length === 0) {
        usersTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No registered users yet.</td></tr>';
      } else {
        usersTable.innerHTML = users.map(u => `
          <tr>
            <td><strong>${u.name}</strong><div style="font-size: 0.75rem; color: var(--text-muted);">${u.email}</div></td>
            <td><span class="badge ${u.role === 'admin' ? 'badge-red' : u.role === 'organizer' ? 'badge-amber' : 'badge-blue'}">${u.role.toUpperCase()}</span></td>
            <td>${u.department || 'General'}</td>
            <td><span class="badge ${u.status === 'active' ? 'badge-emerald' : 'badge-red'}">${u.status}</span></td>
            <td>
              <button onclick="changeUserRole('${u.id}', '${u.role === 'participant' ? 'organizer' : 'participant'}')" class="btn btn-outline btn-sm">
                ${u.role === 'participant' ? 'Promote to Organizer' : 'Demote to Participant'}
              </button>
            </td>
          </tr>
        `).join('');
      }
    }

    // 3. Load Security Audit Logs (Append-only)
    const auditRes = await NexoraAPI.request('/admin/audit-logs');
    const logs = auditRes.logs || [];
    const auditFeed = document.getElementById('adminAuditFeed');
    if (auditFeed) {
      if (logs.length === 0) {
        auditFeed.innerHTML = '<div style="color: var(--text-muted); padding: 1rem;">No security logs recorded yet.</div>';
      } else {
        auditFeed.innerHTML = logs.map(l => `
          <div class="audit-item">
            <div>
              <span class="audit-action-tag">${l.action}</span>
              <span style="color: var(--text-primary); margin-left: 0.5rem;">${l.performedBy} (${l.role})</span>
              <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">
                Details: ${JSON.stringify(l.details)}
              </div>
            </div>
            <div style="color: var(--text-muted); font-size: 0.7rem;">
              ${new Date(l.timestamp).toLocaleTimeString()}
            </div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load admin dashboard: ' + err.message, 'error');
  }
}

async function changeUserRole(userId, newRole) {
  try {
    await NexoraAPI.request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    showToast(`Role updated to ${newRole}`, 'success');
    loadAdminData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function triggerDatabaseBackup() {
  try {
    const res = await NexoraAPI.request('/admin/database/backup', { method: 'POST' });
    showToast(`Database backup created successfully! (${res.backup.filesCount} files saved)`, 'success');
    loadAdminData();
  } catch (err) {
    showToast('Failed to create database backup: ' + err.message, 'error');
  }
}

window.switchSection = switchSection;
window.loadMemberProblems = loadMemberProblems;
window.toggleLeaderboardPublish = toggleLeaderboardPublish;
window.toggleSelectedLeaderboard = toggleSelectedLeaderboard;
window.previewSelectedLeaderboard = previewSelectedLeaderboard;
window.toggleAdminSelectedLeaderboard = toggleAdminSelectedLeaderboard;
window.loadCompetitionRoster = loadCompetitionRoster;
window.closeRosterModal = closeRosterModal;
window.verifyCryptographicReceipt = verifyCryptographicReceipt;
window.closeReceiptModal = closeReceiptModal;
window.changeUserRole = changeUserRole;
window.triggerDatabaseBackup = triggerDatabaseBackup;
