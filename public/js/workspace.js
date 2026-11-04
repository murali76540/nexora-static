/**
 * NEXORA Participant Workspace Logic
 * 8-Stage Chronological Lifecycle Engine
 * E.G.S. Pillay Engineering College
 */

let currentCompId = null;
let currentCompData = null;
let userEnrollment = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('wsTitle')) return;

  const urlParams = new URLSearchParams(window.location.search);
  currentCompId = urlParams.get('id');

  const user = NexoraAPI.getUser();
  if (!user) {
    showToast('Please sign in to access your challenge workspace.', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 800);
    return;
  }

  if (!currentCompId) {
    try {
      const myJoined = await NexoraAPI.request('/competitions/my-joined');
      if (myJoined.joined && myJoined.joined.length > 0) {
        currentCompId = myJoined.joined[0].competitionId;
      }
    } catch (e) {}
  }

  if (!currentCompId) {
    showToast('No competition selected. Redirecting to Member Dashboard...', 'info');
    setTimeout(() => { window.location.href = '/dashboard.html?tab=member'; }, 1000);
    return;
  }

  await loadWorkspaceData();
  initPathwaySelector();
  initSubmissionForms();
  initVersionSelector();
});

async function loadWorkspaceData() {
  try {
    const res = await NexoraAPI.request(`/competitions/${currentCompId}`);
    currentCompData = res.competition;
    const versions = res.versions || [];
    userEnrollment = res.userEnrollment;

    renderWorkspaceHeader(currentCompData, res.hasStarted);
    renderProblemVersions(versions, currentCompData.currentVersion, res.hasStarted);
    renderStageIndicator(currentCompData, userEnrollment);
    await loadSubmissionHistory();
  } catch (err) {
    showToast('Failed to load challenge workspace: ' + err.message, 'error');
  }
}

function renderWorkspaceHeader(comp, hasStarted = true) {
  document.getElementById('wsTitle').textContent = comp.title;
  document.getElementById('wsDept').textContent = comp.department;
  document.getElementById('wsVersion').textContent = `Problem Ver: ${comp.currentVersion || '1.0'}`;

  const deadline = comp.revisedDeadline || comp.initialDeadline;
  document.getElementById('wsDeadline').textContent = new Date(deadline).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const now = Date.now();
  const startTime = comp.startTime ? new Date(comp.startTime).getTime() : 0;
  const isStarted = hasStarted && (now >= startTime);

  const disruptionBanner = document.getElementById('wsDisruptionAlert');
  if (!isStarted) {
    if (disruptionBanner) {
      disruptionBanner.style.display = 'block';
      disruptionBanner.style.background = 'var(--warning-amber)';
      disruptionBanner.style.color = '#000000';
      disruptionBanner.textContent = `🔒 COMPETITION LOCKED: Officially begins on ${new Date(comp.startTime).toLocaleString()}. Problem statement and submissions will unlock at start time.`;
    }
    const initBtn = document.querySelector('#initialSubmissionForm button[type="submit"]');
    if (initBtn) {
      initBtn.disabled = true;
      initBtn.textContent = 'Submission Locked Until Competition Starts';
    }
  } else if (comp.currentVersion === '2.0') {
    if (disruptionBanner) {
      disruptionBanner.style.display = 'block';
      disruptionBanner.style.background = '#EF4444';
      disruptionBanner.style.color = '#FFFFFF';
      disruptionBanner.textContent = '⚡ CRITICAL DISRUPTION DETECTED: Problem Version 2.0 has been released! Adapt your solution below.';
    }
  } else {
    if (disruptionBanner) disruptionBanner.style.display = 'none';
  }
}

function renderStageIndicator(comp, enrollment) {
  // Determine current stage based on version & submission status
  let stageNumber = 3; // Default at Pathway Selection
  if (enrollment && enrollment.initialSubmitted) {
    stageNumber = 4;
  }
  if (comp.currentVersion === '2.0') {
    stageNumber = enrollment && enrollment.initialSubmitted ? 6 : 5;
    if (enrollment && enrollment.revisedSubmitted) {
      stageNumber = 7;
    }
  }

  const indicator = document.getElementById('wsStageBadge');
  if (indicator) {
    indicator.textContent = `Current: Stage 0${stageNumber}`;
  }

  // Highlight step items
  document.querySelectorAll('.stage-step').forEach((el, index) => {
    const stepNum = index + 1;
    if (stepNum < stageNumber) {
      el.classList.add('completed');
    } else if (stepNum === stageNumber) {
      el.classList.add('active');
    }
  });
}

function renderProblemVersions(versions, activeVersionNum, hasStarted = true) {
  const v1 = versions.find(v => v.versionNumber === '1.0');
  const v2 = versions.find(v => v.versionNumber === '2.0');

  // Render V1 Details
  if (v1) {
    if (v1.locked) {
      document.getElementById('v1Title').textContent = 'Problem Statement Locked';
      document.getElementById('v1Background').textContent = 'This challenge problem statement will be unlocked at competition start time.';
      document.getElementById('v1Statement').innerHTML = `<div style="background: rgba(245, 158, 11, 0.1); border: 1px dashed var(--warning-amber); padding: 1.5rem; text-align: center; border-radius: var(--radius-sm);"><div style="font-size: 2rem; margin-bottom: 0.5rem;">🔒</div><strong>Problem Statement Under Embargo</strong><p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">Unlocks automatically on: ${new Date(v1.startTime).toLocaleString()}</p></div>`;
      const reqList = document.getElementById('v1Requirements');
      if (reqList) reqList.innerHTML = '<li style="color: var(--text-muted);">Specifications locked until competition begins.</li>';
      const constList = document.getElementById('v1Constraints');
      if (constList) constList.innerHTML = '<li style="color: var(--text-muted);">Operational constraints locked.</li>';
    } else {
      document.getElementById('v1Title').textContent = v1.title || 'Initial Specifications';
      document.getElementById('v1Background').textContent = v1.realWorldBackground || '';
      document.getElementById('v1Statement').textContent = v1.problemStatement || 'Problem statement details pending.';
      
      const reqList = document.getElementById('v1Requirements');
      if (reqList) {
        if (v1.technicalRequirements && v1.technicalRequirements.length > 0) {
          reqList.innerHTML = v1.technicalRequirements.map(r => `<li>${r}</li>`).join('');
        } else {
          reqList.innerHTML = '<li style="color: var(--text-muted);">No specific requirements listed.</li>';
        }
      }

      const constList = document.getElementById('v1Constraints');
      if (constList) {
        if (v1.constraints && v1.constraints.length > 0) {
          constList.innerHTML = v1.constraints.map(c => `<li>${c}</li>`).join('');
        } else {
          constList.innerHTML = '<li style="color: var(--text-muted);">No specific constraints listed.</li>';
        }
      }
    }
  } else {
    document.getElementById('v1Title').textContent = 'Problem Statement Pending Release';
    document.getElementById('v1Background').textContent = '';
    document.getElementById('v1Statement').innerHTML = '<div style="color: var(--text-muted); padding: 1rem; text-align: center;">The administrator has not published the problem statement for this challenge yet.</div>';
  }

  // Render V2 Details if published
  const v2Card = document.getElementById('v2Card');
  if (v2 && v2Card) {
    v2Card.style.display = 'block';
    document.getElementById('v2Title').textContent = v2.title || 'Disruption Alert';
    const impactEl = document.getElementById('v2ImpactBadge');
    if (impactEl) {
      impactEl.textContent = `IMPACT: ${v2.impactLevel || 'CRITICAL'}`;
      impactEl.className = `badge badge-impact-${(v2.impactLevel || 'critical').toLowerCase()}`;
    }
    document.getElementById('v2Statement').textContent = v2.updatedStatement || '';
    document.getElementById('v2Explanation').textContent = v2.explanationOfChanges || '';

    const v2ReqList = document.getElementById('v2Requirements');
    if (v2ReqList && v2.newRequirements) {
      v2ReqList.innerHTML = v2.newRequirements.map(r => `<li style="color: #F87171;">⚠️ ${r}</li>`).join('');
    }

    // Show Revision Form if initial submitted
    const revBox = document.getElementById('revisionSubmissionBox');
    if (revBox) revBox.style.display = 'block';
  } else if (v2Card) {
    // V2 not published yet
    v2Card.style.display = 'none';
  }
}

function initPathwaySelector() {
  const pathwayRadios = document.querySelectorAll('input[name="wsPathway"]');
  const aiBox = document.getElementById('aiAssistedFields');
  const nonAiBox = document.getElementById('withoutAiFields');

  pathwayRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'AI_ASSISTED') {
        if (aiBox) aiBox.style.display = 'block';
        if (nonAiBox) nonAiBox.style.display = 'none';
      } else {
        if (aiBox) aiBox.style.display = 'none';
        if (nonAiBox) nonAiBox.style.display = 'block';
      }
    });
  });
}

function initVersionSelector() {
  const tabs = document.querySelectorAll('.version-view-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-view');
      if (target === 'comparison') {
        document.getElementById('v1Card').style.display = 'block';
        document.getElementById('v2Card').style.display = 'block';
      } else if (target === 'v1') {
        document.getElementById('v1Card').style.display = 'block';
        document.getElementById('v2Card').style.display = 'none';
      } else if (target === 'v2') {
        document.getElementById('v1Card').style.display = 'none';
        document.getElementById('v2Card').style.display = 'block';
      }
    });
  });
}

function initSubmissionForms() {
  // Stage 04: Initial Solution Form
  const initialForm = document.getElementById('initialSubmissionForm');
  if (initialForm) {
    initialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = initialForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Generating Cryptographic Receipt...';

      const pathway = document.querySelector('input[name="wsPathway"]:checked').value;
      const solutionTitle = document.getElementById('initSolutionTitle').value;
      const technicalApproach = document.getElementById('initTechnicalApproach').value;
      const methodology = document.getElementById('initMethodology').value;
      const repoUrl = document.getElementById('initRepoUrl').value;

      // AI declaration fields
      const aiDeclaration = {
        toolsUsed: document.getElementById('aiToolsUsed')?.value || '',
        promptsSubmitted: document.getElementById('aiPromptsSubmitted')?.value || '',
        humanModifications: document.getElementById('aiHumanModifications')?.value || '',
        verificationSteps: document.getElementById('aiVerificationSteps')?.value || ''
      };

      const independentMethodology = {
        algorithmLogic: document.getElementById('noAiLogic')?.value || '',
        implementationDetails: document.getElementById('noAiImplementation')?.value || ''
      };

      try {
        const res = await NexoraAPI.request('/submissions/initial', {
          method: 'POST',
          body: JSON.stringify({
            competitionId: currentCompId,
            pathway,
            solutionTitle,
            technicalApproach,
            methodology,
            repoUrl,
            aiDeclaration,
            independentMethodology
          })
        });

        showToast('Initial Solution submitted! Cryptographic receipt generated.', 'success');
        displayReceiptModal(res.receipt);
        await loadWorkspaceData();
      } catch (err) {
        showToast('Submission error: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Initial Solution (Stage 04)';
      }
    });
  }

  // Stage 07: Adaptive Revision Form
  const revForm = document.getElementById('revisionSubmissionForm');
  if (revForm) {
    revForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = revForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Generating Revision Receipt...';

      const solutionTitle = document.getElementById('revSolutionTitle').value;
      const updatedSolution = document.getElementById('revUpdatedSolution').value;
      const revisedMethodology = document.getElementById('revRevisedMethodology')?.value || '';
      const explanationOfChanges = document.getElementById('revExplanationOfChanges').value;
      const adaptationStrategy = document.getElementById('revAdaptationStrategy').value;
      const repoUrl = document.getElementById('revRepoUrl').value;
      const testingEvidence = document.getElementById('revTestingEvidence').value;

      try {
        const res = await NexoraAPI.request('/submissions/revision', {
          method: 'POST',
          body: JSON.stringify({
            competitionId: currentCompId,
            solutionTitle,
            updatedSolution,
            revisedMethodology,
            explanationOfChanges,
            adaptationStrategy,
            repoUrl,
            testingEvidence
          })
        });

        showToast('Adaptive Revision submitted! Revision receipt generated.', 'success');
        displayReceiptModal(res.receipt);
        await loadWorkspaceData();
      } catch (err) {
        showToast('Revision submission error: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Adaptive Revision (Stage 07)';
      }
    });
  }
}

async function loadSubmissionHistory() {
  try {
    const res = await NexoraAPI.request(`/submissions/my-history/${currentCompId}`);
    const history = res.history || {};

    const historyBox = document.getElementById('submissionHistoryList');
    if (!historyBox) return;

    if (!history.initial && !history.revision) {
      historyBox.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">No submissions yet. Complete Stage 04 above.</div>';
      return;
    }

    let html = '';
    if (history.initial) {
      html += `
        <div class="receipt-card" style="margin-bottom: 1rem;">
          <div class="receipt-header">
            <div>
              <span class="badge badge-blue">VERSION 1.0 (INITIAL)</span>
              <div class="receipt-id" style="margin-top: 0.25rem;">${history.initial.receiptId}</div>
            </div>
            <button onclick="verifyCryptographicReceipt('${history.initial.receiptId}')" class="btn btn-outline btn-sm">Verify Hash</button>
          </div>
          <div style="font-size: 0.8rem; margin-bottom: 0.5rem;">
            <strong>Solution:</strong> ${history.initial.solutionTitle} | <strong>Pathway:</strong> ${history.initial.pathway}
          </div>
          <div class="receipt-hash-row">
            <span>SHA-256: ${history.initial.receiptHash}</span>
          </div>
        </div>
      `;
    }

    if (history.revision) {
      html += `
        <div class="receipt-card" style="border-color: #EF4444;">
          <div class="receipt-header">
            <div>
              <span class="badge badge-impact-critical">VERSION 2.0 (REVISION)</span>
              <div class="receipt-id" style="margin-top: 0.25rem; color: #F87171;">${history.revision.receiptId}</div>
            </div>
            <button onclick="verifyCryptographicReceipt('${history.revision.receiptId}')" class="btn btn-outline btn-sm">Verify Hash</button>
          </div>
          <div style="font-size: 0.8rem; margin-bottom: 0.5rem;">
            <strong>Strategy:</strong> ${history.revision.adaptationStrategy.slice(0, 100)}...
          </div>
          <div class="receipt-hash-row">
            <span>SHA-256: ${history.revision.receiptHash}</span>
          </div>
        </div>
      `;
    }

    historyBox.innerHTML = html;
  } catch (e) {
    // History box silently handles
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

window.closeReceiptModal = closeReceiptModal;
window.verifyCryptographicReceipt = verifyCryptographicReceipt;
