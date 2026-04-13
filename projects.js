// ============================================================
// /projects.js
// Project-level ops: clear, switch tab, AI generation
// ============================================================

import { appState } from './state.js';
import { showStatus } from './renderer.js';
import { addDuty, addTask, renderDutiesFromState } from './duties.js';
import { resetSkillsLevel, renderSkillsLevel } from './renderer.js';
import { renderLearningOutcomes, renderPCSourceList, renderModules, renderModuleLoList,
  renderClusters, renderAvailableTasks } from './modules.js';
import { checkUsageLimit, incrementUsage, showLoadingModal, hideLoadingModal } from './storage.js';

const BACKEND_URL = 'https://dacum-ai-backend-production.up.railway.app';

// ── Tab Switching ─────────────────────────────────────────────

export function switchTab(tabId) {
  if (tabId === 'clustering-tab' && !appState.clusteringAllowed) {
    alert(
      'Please choose an option in Task Verification tab:\n\n' +
      '1. Finalize & Create Live Voting Session\n   OR\n' +
      '2. Proceed to Competency Clustering Without Verification\n\n' +
      'You must select one option before proceeding.'
    );
    return;
  }

  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
  const selectedContent = document.getElementById(tabId);

  if (selectedTab && selectedContent) {
    selectedTab.classList.add('active');
    selectedContent.classList.add('active');

    if (tabId === 'learning-outcomes-tab') {
      renderPCSourceList();
      renderLearningOutcomes();
    }
    if (tabId === 'module-mapping-tab') {
      renderModuleLoList();
      renderModules();
    }
  }
}

// ── Clear All ─────────────────────────────────────────────────

export function clearAll() {
  // ── Smart summary of what will be erased ──────────────────
  const dutyCount   = (appState.dutiesData || []).length;
  const taskCount   = (appState.dutiesData || []).reduce((s, d) => s + (d.tasks || []).length, 0);
  const hasVotes    = Object.keys(appState.workshopResults || {}).length > 0;
  const hasSession  = !!appState.lwSessionId;
  const hasClusters = (appState.clusteringData?.clusters || []).length > 0;
  const hasOutcomes = (appState.learningOutcomesData?.outcomes || []).length > 0;
  const hasModules  = (appState.moduleMappingData?.modules || []).length > 0;
  const occupation  = document.getElementById('occupationTitle')?.value?.trim() || '';

  const lines = [];
  if (occupation)   lines.push(`📋  Occupation: "${occupation}"`);
  if (dutyCount)    lines.push(`✅  ${dutyCount} Duties — ${taskCount} Tasks`);
  if (hasVotes)     lines.push(`🗳️   Voting results & dashboard data`);
  if (hasSession)   lines.push(`📡  Live workshop session`);
  if (hasClusters)  lines.push(`🎯  Competency clusters`);
  if (hasOutcomes)  lines.push(`🎓  Learning outcomes`);
  if (hasModules)   lines.push(`📦  Module mapping`);

  const summary = lines.length
    ? `\nThe following data will be permanently erased:\n\n${lines.join('\n')}\n`
    : '\nAll fields are already empty.\n';

  const message =
    `⚠️  CLEAR ALL DATA\n` +
    `${'─'.repeat(38)}\n` +
    `${summary}\n` +
    `This action cannot be undone.\n` +
    `Are you sure you want to continue?`;

  if (!confirm(message)) return false;

  _doClear();
  showStatus('✅ All data cleared successfully. Ready for a new DACUM session.', 'success');
  return true;
}

/**
 * clearAllSilent — same as clearAll but no confirm dialog and no status toast.
 * Used internally when the last project is deleted (DOM must be reset quietly).
 */
export function clearAllSilent() {
  _doClear();
}

// ── Internal DOM reset (shared by clearAll and clearAllSilent) ─

function _doClear() {
  // ── Chart Info ────────────────────────────────────────────
  ['dacumDate','producedFor','producedBy','occupationTitle','jobTitle',
   'sector','context','venue','facilitators','observers','panelMembers'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Images
  appState.producedForImage = null;
  appState.producedByImage  = null;
  _resetImagePreview('producedFor');
  _resetImagePreview('producedBy');

  // ── Duties (state-first, then single render) ──────────────
  appState.dutiesData = [];
  appState.dutyCount  = 0;
  appState.taskCounts = {};
  addDuty();
  addTask(`duty_${appState.dutyCount}`);

  // ── Additional Info ───────────────────────────────────────
  _resetHeading('knowledgeHeading',  'Knowledge Requirements');
  _resetHeading('skillsHeading',     'Skills Requirements');
  _resetHeading('behaviorsHeading',  'Worker Behaviors/Traits');
  _resetHeading('toolsHeading',      'Tools, Equipment, Supplies and Materials');
  _resetHeading('trendsHeading',     'Future Trends and Concerns');
  _resetHeading('acronymsHeading',   'Acronyms');
  _resetHeading('careerPathHeading', 'Career Path');
  ['knowledgeInput','skillsInput','behaviorsInput','toolsInput',
   'trendsInput','acronymsInput','careerPathInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('customSectionsContainer').innerHTML = '';
  appState.customSectionCounter = 0;

  // ── Task Verification (individual ratings + UI) ───────────
  appState.verificationRatings  = {};
  appState.taskMetadata         = {};
  appState.collectionMode       = 'workshop';
  appState.workflowMode         = 'standard';
  const modeWorkshop = document.getElementById('mode-workshop');
  const modeSurvey   = document.getElementById('mode-survey');
  const wfStandard   = document.getElementById('workflow-standard');
  const wfExtended   = document.getElementById('workflow-extended');
  if (modeWorkshop) modeWorkshop.checked = true;
  if (modeSurvey)   modeSurvey.checked   = false;
  if (wfStandard)   wfStandard.checked   = true;
  if (wfExtended)   wfExtended.checked   = false;
  const verCont = document.getElementById('verificationAccordionContainer');
  if (verCont) { verCont.innerHTML = ''; verCont.classList.remove('workflow-extended'); }
  appState.workshopParticipants = 10;
  appState.workshopCounts       = {};
  appState.workshopResults      = {};
  appState.priorityFormula      = 'if';
  const wp  = document.getElementById('workshopParticipants');
  const fif = document.getElementById('formula-if');
  const ifd = document.getElementById('formula-ifd');
  if (wp)  wp.value    = 10;
  if (fif) fif.checked = true;
  if (ifd) ifd.checked = false;

  // ── Dashboard DOM ─────────────────────────────────────────
  const dbBody = document.getElementById('dashboardTableBody');
  const dbSum  = document.getElementById('dashboardSummary');
  const dlBody = document.getElementById('dutyLevelTableBody');
  const dlCont = document.getElementById('dutyLevelContent');
  if (dbBody) dbBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;">No data — use Task Verification to collect votes.</td></tr>`;
  if (dbSum)  dbSum.innerHTML  = '';
  if (dlBody) dlBody.innerHTML = '';
  if (dlCont && dlCont.style.display !== 'none') dlCont.style.display = 'none';

  // ── Live Workshop session ─────────────────────────────────
  appState.lwSessionId         = null;
  appState.lwFinalizedData     = null;
  appState.lwAggregatedResults = null;

  const lwResults  = document.getElementById('lwResultsContainer');
  const lwExport   = document.getElementById('lwExportButtons');
  const lwSession  = document.getElementById('lwSessionId');
  const lwLink     = document.getElementById('lwParticipantLink');
  const lwQRModal  = document.getElementById('lwQRModal');
  const lwSection  = document.getElementById('liveWorkshopSection');

  if (lwResults)  lwResults.innerHTML  = '<p style="color:#999;font-style:italic;text-align:center;padding:30px;">No votes received yet.</p>';
  if (lwExport)   lwExport.style.display  = 'none';
  if (lwSession)  lwSession.textContent   = '';
  if (lwLink)     { lwLink.textContent = ''; lwLink.removeAttribute('data-full-url'); }
  if (lwQRModal)  lwQRModal.style.display = 'none';
  if (lwSection)  lwSection.style.display = 'none';

  // ── Decision / routing flags ──────────────────────────────
  appState.verificationDecisionMade = false;
  appState.clusteringAllowed        = false;
  const btnLW = document.getElementById('btnLWFinalize');
  const btnBP = document.getElementById('btnBypassToClustering');
  const btnRD = document.getElementById('btnResetDecision');
  if (btnLW) btnLW.disabled        = false;
  if (btnBP) btnBP.disabled        = false;
  if (btnRD) btnRD.style.display   = 'none';

  // ── Clustering ────────────────────────────────────────────
  appState.clusteringData = { availableTasks: [], clusters: [], clusterCounter: 0 };

  // ── Learning Outcomes ─────────────────────────────────────
  appState.learningOutcomesData = { outcomes: [], outcomeCounter: 0 };
  renderLearningOutcomes();
  renderPCSourceList();

  // ── Module Mapping ────────────────────────────────────────
  appState.moduleMappingData = { modules: [], moduleCounter: 0 };
  renderModules();
  renderModuleLoList();

  // ── Switch to Chart Info tab ──────────────────────────────
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const infoTab  = document.querySelector('[data-tab="info-tab"]');
  const infoCont = document.getElementById('info-tab');
  if (infoTab)  infoTab.classList.add('active');
  if (infoCont) infoCont.classList.add('active');
}

// ── Clear Current Tab ─────────────────────────────────────────

export function clearCurrentTab(tabId) {
  if (!confirm('Are you sure you want to clear this tab? This cannot be undone!')) return;

  if (tabId === 'info-tab') {
    ['dacumDate','venue','producedFor','producedBy','occupationTitle','jobTitle',
     'sector','context','facilitators','observers','panelMembers'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    appState.producedForImage = null;
    appState.producedByImage  = null;
    _resetImagePreview('producedFor');
    _resetImagePreview('producedBy');
    showStatus('Chart Info cleared!', 'success');

  } else if (tabId === 'duties-tab') {
    document.getElementById('dutiesContainer').innerHTML = '';
    appState.dutyCount  = 0;
    appState.taskCounts = {};
    addDuty();
    addTask(`duty_${appState.dutyCount}`);
    showStatus('Duties & Tasks cleared!', 'success');

  } else if (tabId === 'additional-info-tab') {
    ['knowledgeInput','skillsInput','behaviorsInput','toolsInput',
     'trendsInput','acronymsInput','careerPathInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('customSectionsContainer').innerHTML = '';
    appState.customSectionCounter = 0;
    resetSkillsLevel(false); // false = no confirm
    showStatus('Additional Info cleared!', 'success');

  } else if (tabId === 'verification-tab') {
    appState.verificationRatings = {};
    appState.workshopCounts      = {};
    appState.workshopResults     = {};
    const verCont = document.getElementById('verificationAccordionContainer');
    if (verCont) verCont.innerHTML = '';
    const dbBody = document.getElementById('dashboardTableBody');
    const dbSum  = document.getElementById('dashboardSummary');
    if (dbBody) dbBody.innerHTML = '';
    if (dbSum)  dbSum.innerHTML  = '';
    appState.verificationDecisionMade = false;
    appState.clusteringAllowed        = false;
    const btnLW = document.getElementById('btnLWFinalize');
    const btnBP = document.getElementById('btnBypassToClustering');
    const btnRD = document.getElementById('btnResetDecision');
    if (btnLW) btnLW.disabled = false;
    if (btnBP) btnBP.disabled = false;
    if (btnRD) btnRD.style.display = 'none';
    showStatus('Task Verification cleared!', 'success');

  } else if (tabId === 'clustering-tab') {
    appState.clusteringData = { availableTasks: [], clusters: [], clusterCounter: 0 };
    renderAvailableTasks();
    renderClusters();
    showStatus('Competency Clusters cleared!', 'success');

  } else if (tabId === 'learning-outcomes-tab') {
    appState.learningOutcomesData = { outcomes: [], outcomeCounter: 0 };
    renderLearningOutcomes();
    renderPCSourceList();
    showStatus('Learning Outcomes cleared!', 'success');

  } else if (tabId === 'module-mapping-tab') {
    appState.moduleMappingData = { modules: [], moduleCounter: 0 };
    renderModules();
    renderModuleLoList();
    showStatus('Module Mapping cleared!', 'success');
  }
}

// ── AI DACUM Generation ───────────────────────────────────────

export async function generateAIDacum() {
  console.log('🚀 AI Generation Started');

  const usageStatus = checkUsageLimit();
  if (!usageStatus.allowed) {
    showStatus(`❌ Daily limit reached (${usageStatus.count} generations). Try again tomorrow!`, 'error');
    return;
  }

  const occupationTitle = document.getElementById('occupationTitle').value.trim();
  const jobTitle        = document.getElementById('jobTitle').value.trim();
  const sector          = document.getElementById('sector').value.trim();
  const context         = document.getElementById('context').value.trim();

  if (!occupationTitle || !jobTitle) {
    showStatus('Please enter both Occupation Title and Job Title before generating AI draft', 'error');
    return;
  }

  const existingDuties = document.querySelectorAll('[data-duty-id]');
  let hasContent = false;
  existingDuties.forEach(inp => { if (inp.value.trim()) hasContent = true; });

  if (hasContent) {
    if (!confirm('⚠️ AI GENERATION WILL REPLACE ALL EXISTING DUTIES AND TASKS\n\nClick OK to continue, or Cancel to keep your current work.')) {
      showStatus('AI generation cancelled. Your existing duties are preserved.', 'error');
      return;
    }
  }

  showLoadingModal();
  await new Promise(resolve => setTimeout(resolve, 100));

  const prompt = `You are an occupational analysis engine. Your task is to generate a DATA-INFORMED DACUM DRAFT that will be injected directly into a DACUM chart user interface.

INPUT:
Occupation Title: ${occupationTitle}
Job / Role: ${jobTitle}${sector ? `\nSector: ${sector}` : ''}${context ? `\nCountry / Context: ${context}` : ''}

TASK:
Generate a DACUM draft for the SPECIFIED JOB / ROLE (not the entire occupation).

STRUCTURE GUIDELINES (NOT FIXED LIMITS):
- Identify a reasonable number of DUTIES, usually between 6 and 12,
  sufficient to fully cover the JOB being analyzed.
- For each DUTY, generate a variable number of TASKS, usually between 6 and 20,
  based on the actual work required for that duty.
- Different duties may have different numbers of tasks.
- The total number of tasks for the JOB is usually between 75 and 125,
  but completeness and logical job coverage take priority over numeric targets.

PRIORITY RULE:
- Stop generating duties or tasks once the JOB scope is fully and logically covered,
  even if the upper guideline limits have not been reached.

RULES FOR DUTIES:
- Duties represent broad areas of responsibility within the JOB.
- Duties must be written as responsibility titles.
- Use verb-based responsibility phrasing
  (e.g., "Apply Safety, Health, Environment and Quality in the Workplace").
- Avoid overlap or duplication between duties.

RULES FOR TASKS:
- Each task must start with ONE clear occupational action verb.
- Use operational, observable verbs only
  (e.g., Install, Inspect, Maintain, Test, Repair, Calibrate, Diagnose, Configure).
- Follow the structure: Verb + Object + (Qualifier if needed).
- Use ONE verb only per task (no combined or compound verbs).
- Tasks must describe what the worker DOES, not outcomes, purposes, or intentions.
- Tasks must describe real, observable work activities.
- Do NOT include outcomes, results, or phrases such as "to ensure", "in order to".
- Do NOT use learning, academic, or cognitive verbs (e.g., understand, learn, know).
- Do NOT include competencies, skills, knowledge, tools, equipment, software,
  materials, or safety rules.
- Tasks must be specific, concrete, and actionable.
- Avoid organizational, administrative, or policy-oriented verbs
  (e.g., comply, adhere, manage, coordinate, supervise, report).
- Focus on hands-on job-specific work activities performed directly by the worker.

METHODOLOGICAL NOTE:
- Use labor-market and contextual signals for realism (data-informed),
  but prioritize expert occupational logic and job coherence
  over generic data patterns.

OUTPUT FORMAT (STRICT – NO EXTRA TEXT):
Return ONLY valid JSON using the following structure:

{
  "duties": [
    {
      "title": "Duty title here",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ]
}

Generate the DACUM draft now in valid JSON format only.`;

  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-dacum`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response from backend - no content found');
    }

    let jsonText = data.content[0].text.trim()
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let dacumData;
    try { dacumData = JSON.parse(jsonText); }
    catch (e) { throw new Error('Failed to parse AI response as JSON'); }

    if (!dacumData.duties || !Array.isArray(dacumData.duties)) {
      throw new Error('Invalid DACUM structure - duties array not found');
    }
    if (dacumData.duties.length === 0) throw new Error('No duties generated by AI');

    // ── State-first population (fixes card-view re-render wipe) ──
    // Build appState.dutiesData directly then render once at the end.
    appState.dutiesData = [];
    appState.dutyCount  = 0;
    appState.taskCounts = {};

    dacumData.duties.forEach(dutyData => {
      appState.dutyCount++;
      const dutyId = `duty_${appState.dutyCount}`;
      appState.taskCounts[dutyId] = 0;

      const tasks = [];
      if (dutyData.tasks && Array.isArray(dutyData.tasks)) {
        dutyData.tasks.forEach(taskText => {
          appState.taskCounts[dutyId]++;
          const n = appState.taskCounts[dutyId];
          tasks.push({
            divId:   `task_${dutyId}_${n}`,
            inputId: `${dutyId}_${n}`,
            num:     n,
            text:    String(taskText || '').trim()
          });
        });
      }

      appState.dutiesData.push({
        id:    dutyId,
        num:   appState.dutyCount,
        title: String(dutyData.title || '').trim(),
        tasks
      });
    });

    // Single render from state — no DOM thrashing
    renderDutiesFromState();

    hideLoadingModal();
    incrementUsage();
    showStatus(`✓ AI draft generated successfully! ${dacumData.duties.length} duties with tasks created.`, 'success');

  } catch (error) {
    hideLoadingModal();
    console.error('Error generating AI DACUM:', error);
    showStatus('AI generation failed. See the error dialog for details.', 'error');
    _showAIErrorModal(error.message || String(error));
  }
}

// ── AI Error Modal ───────────────────────────────────────────

function _showAIErrorModal(errorMessage) {
  const existing = document.getElementById('aiErrorModal');
  if (existing) existing.remove();

  const isOffline = /Failed to fetch|NetworkError|network|ECONNREFUSED|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED|503|502/i.test(errorMessage);

  const modal = document.createElement('div');
  modal.id = 'aiErrorModal';
  modal.setAttribute('role', 'alertdialog');
  modal.setAttribute('aria-modal', 'true');
  modal.style.cssText =
    'position:fixed;inset:0;z-index:999999;display:flex;align-items:center;' +
    'justify-content:center;padding:20px;background:rgba(0,0,0,0.55);' +
    'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);' +
    'animation:aiErrFadeIn 0.2s ease';

  const icon   = isOffline ? '\uD83D\uDD0C' : '\u26A0\uFE0F';
  const title  = isOffline ? 'AI Service Unavailable' : 'AI Generation Failed';
  const sub    = isOffline ? 'Backend server unreachable' : 'Check connection and try again';
  const hdrBg  = isOffline
    ? 'linear-gradient(135deg,#fff7ed,#ffedd5)'
    : 'linear-gradient(135deg,#fef2f2,#fee2e2)';
  const hdrBdr = isOffline ? '#fed7aa' : '#fecaca';
  const hdrClr = isOffline ? '#9a3412' : '#991b1b';
  const subClr = isOffline ? '#c2410c' : '#b91c1c';

  const bodyText = isOffline
    ? 'The AI backend server is currently offline or unreachable.<br><br>' +
      'The AI generation service requires an active Railway backend. ' +
      'You can still use the tool manually to add duties and tasks.'
    : 'An error occurred while generating the AI draft:<br><br>' +
      '<code style="font-size:0.82em;background:#f1f5f9;padding:4px 8px;' +
      'border-radius:4px;word-break:break-all;">' +
      (errorMessage || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>';

  const offlineTips = isOffline
    ? '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;' +
      'padding:12px 14px;margin-bottom:16px;">' +
      '<p style="margin:0;font-size:0.82em;color:#15803d;font-weight:600;">' +
      '\u2705 What you can do instead:</p>' +
      '<ul style="margin:6px 0 0;padding-left:18px;font-size:0.82em;color:#166534;line-height:1.8;">' +
      '<li>Add duties and tasks manually</li>' +
      '<li>Use the + Add Duty / + Add Task buttons</li>' +
      '<li>Import a saved JSON project file</li></ul></div>'
    : '';

  modal.innerHTML =
    '<div style="background:#fff;border-radius:16px;max-width:420px;width:100%;' +
    'box-shadow:0 24px 60px rgba(0,0,0,0.35);overflow:hidden;' +
    'font-family:\'Segoe UI\',system-ui,sans-serif;animation:aiErrSlideIn 0.22s ease;">' +
      '<div style="padding:20px 22px 16px;display:flex;align-items:center;gap:12px;' +
      'background:' + hdrBg + ';border-bottom:1px solid ' + hdrBdr + ';">' +
        '<span style="font-size:1.8em;line-height:1;">' + icon + '</span>' +
        '<div>' +
          '<p style="margin:0;font-size:1em;font-weight:800;color:' + hdrClr + ';">' + title + '</p>' +
          '<p style="margin:2px 0 0;font-size:0.78em;color:' + subClr + ';">' + sub + '</p>' +
        '</div>' +
      '</div>' +
      '<div style="padding:18px 22px 20px;">' +
        '<p style="margin:0 0 16px;font-size:0.88em;color:#374151;line-height:1.6;">' + bodyText + '</p>' +
        offlineTips +
        '<div style="display:flex;justify-content:flex-end;">' +
          '<button id="aiErrorModalClose" style="padding:9px 22px;background:#667eea;' +
          'color:#fff;border:none;border-radius:8px;font-size:0.9em;font-weight:700;' +
          'cursor:pointer;transition:background 0.15s;"' +
          ' onmouseover="this.style.background=\'#5a67d8\'"' +
          ' onmouseout="this.style.background=\'#667eea\'">Got it</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  if (!document.getElementById('aiErrStyles')) {
    const s = document.createElement('style');
    s.id = 'aiErrStyles';
    s.textContent =
      '@keyframes aiErrFadeIn  { from{opacity:0} to{opacity:1} }' +
      '@keyframes aiErrSlideIn { from{transform:translateY(-14px);opacity:0}' +
      ' to{transform:translateY(0);opacity:1} }';
    document.head.appendChild(s);
  }

  document.body.appendChild(modal);

  function _close() { modal.remove(); }
  document.getElementById('aiErrorModalClose').addEventListener('click', _close);
  modal.addEventListener('click', function(e) { if (e.target === modal) _close(); });
  document.addEventListener('keydown', function _esc(e) {
    if (e.key === 'Escape') { _close(); document.removeEventListener('keydown', _esc); }
  });
}

// ── Private helpers ───────────────────────────────────────────

function _resetImagePreview(imageType) {
  const previewDiv = document.getElementById(`${imageType}ImagePreview`);
  if (previewDiv) {
    previewDiv.innerHTML = '<span style="color:#999;font-size:0.9em;">No image</span>';
    previewDiv.classList.remove('has-image');
  }
  const cap = imageType.charAt(0).toUpperCase() + imageType.slice(1);
  const removeBtn = document.getElementById(`remove${cap}Image`);
  if (removeBtn) removeBtn.style.display = 'none';
  const fileInput = document.getElementById(`${imageType}ImageInput`);
  if (fileInput) fileInput.value = '';
}

function _resetHeading(headingId, defaultText) {
  const el = document.getElementById(headingId);
  if (el) {
    el.textContent = defaultText;
    el.setAttribute('contenteditable', 'false');
  }
}
