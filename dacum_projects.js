// ============================================================
// /dacum_projects.js
// Multi-Project System for DACUM Live Pro.
//
// Naming note: the existing projects.js owns clearAll/switchTab/
// generateAIDacum — this module uses the name dacum_projects.js
// to avoid any collision.
//
// localStorage key : 'dacum_projects'
// Active project   : 'dacum_active_project'
// Max projects     : 50
// ============================================================

import { appState }           from './state.js';
import { showStatus }         from './renderer.js';
import { syncAllFromDOM }     from './duties.js';
import { renderAll }          from './workshop_snapshots.js';
import { resetHistoryToCurrentState } from './history.js';

const LS_PROJECTS = 'dacum_projects';
const LS_ACTIVE   = 'dacum_active_project';
const MAX_PROJECTS = 50;

let _searchQuery = '';

// ── Public API ────────────────────────────────────────────────

export function createProject(name) {
  hideWelcomeOverlay();   // dismiss welcome screen if visible
  const label    = (name || '').trim() || 'Untitled DACUM Project';
  const projects = _loadProjects();
  const id       = `project_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const project = {
    id,
    name:    label,
    created: Date.now(),
    state:   _captureState(),
  };

  projects.push(project);
  if (projects.length > MAX_PROJECTS) projects.splice(0, 1);

  _saveProjects(projects);
  _setActive(id);
  renderProjectsSidebar();
  showStatus(`✅ Project "${label}" created`, 'success');
  return id;
}

// ── Import a project from parsed JSON data ────────────────────
// Called by snapshots.js after parsing each imported file.
// Creates a new project entry in the sidebar automatically.
export function importProjectFromData(data, fileName) {
  // Extract name from filename first — strip date/time suffix (e.g. _2026-03-14_22-45.json)
  // This preserves user-renamed project names when re-importing exported files
  const stemFromFile = fileName
    .replace(/\.json$/i, '')                        // remove .json
    .replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}$/, '') // strip _YYYY-MM-DD_HH-MM
    .replace(/_\d{4}-\d{2}-\d{2}$/, '')             // strip _YYYY-MM-DD (older format)
    .replace(/[_]+/g, ' ')                           // underscores → spaces
    .trim();

  const label = stemFromFile
             || (data?.chartInfo?.occupationTitle || '').trim()
             || (data?.chartInfo?.jobTitle || '').trim()
             || 'Imported Project';

  const id = `project_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const projects = _loadProjects();

  // Build state object from imported JSON — mirrors _applyState fields
  const s = data;
  const state = {
    // Prefer dutiesData (rich format saved by new export), fall back to duties (flat legacy)
    dutiesData:               s.dutiesData && s.dutiesData.length > 0
                              ? s.dutiesData
                              : _dutiesArrayToState(s.duties || []),
    dutyCount:                s.dutiesData && s.dutiesData.length > 0
                              ? s.dutiesData.length
                              : (s.duties ? s.duties.length : 0),
    taskCounts:               s.taskCounts || {},
    producedForImage:         s.chartInfo?.producedForImage || null,
    producedByImage:          s.chartInfo?.producedByImage  || null,
    customSectionCounter:     0,
    skillsLevelData:          s.skillsLevelMatrix || s.skillsLevelData,
    verificationRatings:      s.verification?.ratings        || {},
    taskMetadata:             s.verification?.taskMetadata   || {},
    collectionMode:           s.verification?.collectionMode || 'workshop',
    workflowMode:             s.verification?.workflowMode   || 'standard',
    workshopParticipants:     s.verification?.workshopParticipants || 10,
    priorityFormula:          s.verification?.priorityFormula || 'if',
    workshopCounts:           s.verification?.workshopCounts || {},
    workshopResults:          s.verification?.workshopResults || {},
    tvExportMode:             'appendix',
    trainingLoadMethod:       s.verification?.trainingLoadMethod || 'advanced',
    clusteringData:           s.competencyClusters
                              ? { clusters: s.competencyClusters.clusters || [],
                                  availableTasks: s.competencyClusters.availableTasks || [],
                                  clusterCounter: s.competencyClusters.clusterCounter || 0 }
                              : { clusters: [], availableTasks: [], clusterCounter: 0 },
    learningOutcomesData:     s.learningOutcomes
                              ? { outcomes: s.learningOutcomes.outcomes || [],
                                  outcomeCounter: s.learningOutcomes.outcomeCounter || 0 }
                              : { outcomes: [], outcomeCounter: 0 },
    moduleMappingData:        s.moduleMapping
                              ? { modules: s.moduleMapping.modules || [],
                                  moduleCounter: s.moduleMapping.moduleCounter || 0 }
                              : { modules: [], moduleCounter: 0 },
    verificationDecisionMade: false,
    clusteringAllowed:        false,
    lwSessionId:              null,
    lwFinalizedData:          null,
    lwAggregatedResults:      null,
    lwIsFinalized:            false,
    lwParticipantUrl:         '',
    _chartInfo: {
      dacumDate:       s.chartInfo?.dacumDate       || '',
      venue:           s.chartInfo?.venue            || '',
      producedFor:     s.chartInfo?.producedFor      || '',
      producedBy:      s.chartInfo?.producedBy       || '',
      occupationTitle: s.chartInfo?.occupationTitle  || '',
      jobTitle:        s.chartInfo?.jobTitle         || '',
      sector:          s.chartInfo?.sector           || '',
      context:         s.chartInfo?.context          || '',
      facilitators:    s.chartInfo?.facilitators     || [],
      observers:       s.chartInfo?.observers        || [],
      panelMembers:    s.chartInfo?.panelMembers     || [],
    },
    _additionalInfo: {
      headings: s.additionalInfo?.headings || {},
      content:  s.additionalInfo?.content  || {},
      customSections: s.additionalInfo?.customSections || [],
    },
  };

  // Recalculate dutyCount and taskCounts from dutiesData
  if (state.dutiesData && state.dutiesData.length > 0) {
    state.dutyCount = state.dutiesData.length;
    state.dutiesData.forEach(duty => {
      state.taskCounts[duty.id] = duty.tasks ? duty.tasks.length : 0;
    });
  } else {
    state.dutyCount = 0;
  }

  const project = { id, name: label, created: Date.now(), lastSaved: Date.now(), state };
  projects.push(project);
  if (projects.length > MAX_PROJECTS) projects.splice(0, 1);
  _saveProjects(projects);

  return { id, label };
}

// Convert old flat duties format [{duty, tasks:[]}] → appState dutiesData format
function _dutiesArrayToState(dutiesArr) {
  return (dutiesArr || []).map((d, i) => {
    const dutyId = `duty_${i + 1}`;
    const tasks  = (d.tasks || []).map((text, j) => ({
      divId:   `task_${dutyId}_${j + 1}`,
      inputId: `${dutyId}_${j + 1}`,
      num:     j + 1,
      text:    String(text || '').trim()
    }));
    return { id: dutyId, num: i + 1, title: String(d.duty || '').trim(), tasks };
  });
}

export function loadProject(id) {
  const projects = _loadProjects();
  const project  = projects.find(p => p.id === id);
  if (!project) { showStatus('❌ Project not found', 'error'); return; }

  // Auto-save current project before switching
  saveCurrentProject();

  _applyState(project.state);
  renderAll();
  resetHistoryToCurrentState();
  _setActive(id);
  renderProjectsSidebar();

  // ── Auto-refresh dashboard and sync dropdown to loaded project ──
  try {
    // Sync dropdown selection to this project (if it has results)
    const sel = document.getElementById('dashboardProjectSelector');
    if (sel) {
      const hasResults = Object.keys(project.state?.workshopResults || {}).length > 0;
      // Rebuild options then select this project (or current)
      // renderDashboardProjectSelector is called inside refreshDashboard
    }
    // Import refreshDashboard dynamically from appState callback, or fire directly
    if (typeof appState._onResultsRefreshed === 'function') {
      // Reuse existing callback mechanism
    }
    // Direct approach: dispatch a custom event that tasks.js can listen to
    document.dispatchEvent(new CustomEvent('dacum:project-loaded', { detail: { projectId: id } }));
  } catch(e) {}

  showStatus(`📂 Loaded: "${project.name}"`, 'success');
}

export function saveCurrentProject() {
  const id = _getActive();
  if (!id) return;
  const projects = _loadProjects();
  const idx      = projects.findIndex(p => p.id === id);
  if (idx === -1) return;
  projects[idx].state     = _captureState();
  projects[idx].lastSaved = Date.now();   // ← timestamp used by crash recovery
  _saveProjects(projects);
}

export function renameProject(id, newName) {
  const label    = (newName || '').trim();
  if (!label) return;
  const projects = _loadProjects();
  const project  = projects.find(p => p.id === id);
  if (!project) return;
  project.name = label;
  _saveProjects(projects);
  renderProjectsSidebar();
  showStatus(`✏️ Renamed to "${label}"`, 'success');
}

export function deleteProject(id) {
  let projects = _loadProjects();
  const project = projects.find(p => p.id === id);
  if (!project) return;
  projects = projects.filter(p => p.id !== id);
  _saveProjects(projects);

  // If deleted project was active, switch to the next available one
  if (_getActive() === id) {
    if (projects.length > 0) {
      loadProject(projects[projects.length - 1].id);
    } else {
      _setActive(null);
      renderProjectsSidebar();
      // Signal events.js to silently reset the DOM (no confirm dialog)
      document.dispatchEvent(new CustomEvent('dacum:last-project-deleted'));
      showWelcomeOverlay();
    }
  }
  renderProjectsSidebar();
  showStatus(`🗑️ Project deleted`, 'success');
}

export function getProjects() {
  return _loadProjects();
}

export function getActiveProjectId() {
  return _getActive();
}

/**
 * deleteActiveProject — removes the currently active project card from the sidebar
 * WITHOUT touching the DOM (caller is responsible for having cleared the DOM first).
 * Shows the welcome overlay afterwards.
 * Called by events.js after a confirmed clearAll().
 */
export function deleteActiveProject() {
  const id = _getActive();
  if (id) {
    let projects = _loadProjects();
    projects = projects.filter(p => p.id !== id);
    _saveProjects(projects);
    _setActive(null);
  }
  renderProjectsSidebar();
  showWelcomeOverlay();
}

/**
 * showWelcomeOverlay — full-screen overlay prompting the user to create a project.
 * Automatically dismissed when createProject() succeeds.
 */
export function showWelcomeOverlay() {
  hideWelcomeOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'dacumWelcomeOverlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:900;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(15,23,42,0.90);' +
    'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
    'animation:dacumWelcomeFadeIn 0.25s ease;';

  overlay.innerHTML = `
    <div style="
      background:#1e1e2e;
      border:1px solid #313244;
      border-radius:20px;
      max-width:460px;
      width:90%;
      padding:44px 40px 36px;
      text-align:center;
      box-shadow:0 32px 80px rgba(0,0,0,0.55);
      font-family:'Segoe UI',system-ui,sans-serif;
      animation:dacumWelcomeSlideIn 0.28s cubic-bezier(.16,1,.3,1);
    ">
      <div style="font-size:3.2em;line-height:1;margin-bottom:16px;">📋</div>
      <h2 style="
        color:#cba6f7;font-size:1.45em;margin:0 0 12px;
        font-weight:800;letter-spacing:-0.01em;
      ">Welcome to DACUM Live Pro</h2>
      <p style="
        color:#a6adc8;font-size:0.91em;line-height:1.75;margin:0 0 8px;
      ">Every analysis begins with a <strong style="color:#cdd6f4;">project</strong>.</p>
      <p style="
        color:#a6adc8;font-size:0.91em;line-height:1.75;margin:0 0 32px;
      ">Click the button below to create your first project —<br>
      this is <strong style="color:#cdd6f4;">Step 1</strong> before entering any data.</p>

      <button id="dacumWelcomeNewBtn" style="
        display:block;width:100%;
        background:linear-gradient(135deg,#cba6f7 0%,#89b4fa 100%);
        color:#1e1e2e;border:none;border-radius:12px;
        padding:15px 28px;font-size:1.05em;font-weight:800;
        cursor:pointer;letter-spacing:0.01em;
        box-shadow:0 4px 20px rgba(203,166,247,0.3);
        transition:opacity 0.15s,transform 0.1s;
      "
      onmouseover="this.style.opacity='0.88'"
      onmouseout="this.style.opacity='1'"
      onmousedown="this.style.transform='scale(0.97)'"
      onmouseup="this.style.transform='scale(1)'">
        + &nbsp;Create New Project
      </button>

      <p style="color:#45475a;font-size:0.76em;margin:20px 0 0;line-height:1.6;">
        Tip: You can also import an existing project using the
        <strong style="color:#6c7086;">Load JSON</strong> button in the toolbar.
      </p>
    </div>`;

  if (!document.getElementById('dacumWelcomeStyles')) {
    const s = document.createElement('style');
    s.id = 'dacumWelcomeStyles';
    s.textContent =
      '@keyframes dacumWelcomeFadeIn  { from{opacity:0} to{opacity:1} }' +
      '@keyframes dacumWelcomeSlideIn { from{transform:translateY(-18px);opacity:0} to{transform:translateY(0);opacity:1} }';
    document.head.appendChild(s);
  }

  document.body.appendChild(overlay);

  document.getElementById('dacumWelcomeNewBtn').addEventListener('click', () => {
    const name = prompt('Project name:', `DACUM Project ${_loadProjects().length + 1}`);
    if (name !== null) createProject(name);
  });
}

function hideWelcomeOverlay() {
  const el = document.getElementById('dacumWelcomeOverlay');
  if (el) el.remove();
}

/** Inject sidebar HTML into the page (call once from app.js). */
export function initProjectsSidebar() {
  if (document.getElementById('dacumProjectsSidebar')) return;

  // Sidebar element
  const aside = document.createElement('aside');
  aside.id = 'dacumProjectsSidebar';
  aside.className = 'dps-sidebar dps-expanded';
  aside.innerHTML = `
    <div class="dps-header">
      <span class="dps-title">📁 Projects</span>
      <button class="dps-new-btn" id="dpsNewProject" title="New project">＋ New</button>
    </div>
    <div class="dps-search-wrap">
      <div class="dps-search-box">
        <svg class="dps-search-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dpsSearchGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#cba6f7"/>
              <stop offset="100%" stop-color="#89b4fa"/>
            </linearGradient>
          </defs>
          <circle cx="8.5" cy="8.5" r="5" stroke="url(#dpsSearchGrad)" stroke-width="1.8"/>
          <line x1="12.5" y1="12.5" x2="16" y2="16" stroke="url(#dpsSearchGrad)" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <input class="dps-search" id="dpsSearch" type="text"
               placeholder="Search projects…" autocomplete="off">
      </div>
    </div>
    <div class="dps-list" id="dpsProjectList"></div>
    <button class="dps-toggle" id="dpsToggle" title="Collapse sidebar">◀</button>
  `;

  // Inject CSS
  _injectCSS();

  // Wrap main content so sidebar pushes it
  const app = document.querySelector('.container') || document.body;
  const wrapper = document.createElement('div');
  wrapper.id = 'dacumAppWrapper';
  app.parentNode.insertBefore(wrapper, app);
  wrapper.appendChild(aside);
  wrapper.appendChild(app);

  // Wire events
  document.getElementById('dpsNewProject').addEventListener('click', () => {
    const name = prompt('Project name:', `DACUM Project ${_loadProjects().length + 1}`);
    if (name !== null) createProject(name);
  });

  const _dpsSearchEl = document.getElementById('dpsSearch');
  _dpsSearchEl.addEventListener('input', function () {
    _searchQuery = this.value.trim().toLowerCase();
    const box = this.closest('.dps-search-box');
    if (box) box.classList.toggle('has-value', this.value.length > 0);
    renderProjectsSidebar();
  });
  _dpsSearchEl.addEventListener('focus', function () {
    const box = this.closest('.dps-search-box');
    if (box) box.classList.add('is-focused');
  });
  _dpsSearchEl.addEventListener('blur', function () {
    const box = this.closest('.dps-search-box');
    if (box) box.classList.remove('is-focused');
  });

  document.getElementById('dpsToggle').addEventListener('click', _toggleSidebar);

  _positionToggle();
  renderProjectsSidebar();

  // Show welcome overlay on first open if no projects exist yet
  if (_loadProjects().length === 0) {
    showWelcomeOverlay();
  }
}

/** Re-render the project list cards. */
export function renderProjectsSidebar() {
  const list = document.getElementById('dpsProjectList');
  if (!list) return;

  const activeId = _getActive();
  let projects   = _loadProjects().slice().reverse(); // newest first

  // Search filter — prefix-first sort
  if (_searchQuery) {
    projects = projects.filter(p => p.name.toLowerCase().includes(_searchQuery));
    projects.sort((a, b) => {
      const aStart = a.name.toLowerCase().startsWith(_searchQuery) ? 0 : 1;
      const bStart = b.name.toLowerCase().startsWith(_searchQuery) ? 0 : 1;
      return aStart - bStart;
    });
  }

  if (projects.length === 0) {
    list.innerHTML = `<p class="dps-empty">${_searchQuery ? 'No matching projects.' : 'No projects yet.<br>Click <strong>＋ New</strong> to start.'}</p>`;
    return;
  }

  list.innerHTML = projects.map(p => {
    const isActive  = p.id === activeId;
    const dutyCount = (p.state?.dutiesData || []).length;
    const taskCount = (p.state?.dutiesData || []).reduce((s, d) => s + (d.tasks?.length || 0), 0);
    const date      = new Date(p.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="dps-card${isActive ? ' dps-active' : ''}" data-project-id="${p.id}">
        <div class="dps-card-body" data-action="load-project" data-project-id="${p.id}">
          <div class="dps-card-name-wrap">
            <span class="dps-card-name" data-project-id="${p.id}">${_esc(p.name)}</span>
            <input class="dps-card-name-input" data-project-id="${p.id}"
                   value="${_esc(p.name)}" style="display:none"
                   maxlength="60" autocomplete="off" spellcheck="false">
          </div>
          <div class="dps-card-meta">🕐 ${date}</div>
          <div class="dps-card-stats">
            <span>📋 ${dutyCount} ${dutyCount === 1 ? 'duty' : 'duties'}</span>
            <span>✅ ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}</span>
          </div>
        </div>
        <div class="dps-card-actions">
          <button class="dps-icon-btn dps-rename" data-action="rename-project" data-project-id="${p.id}" title="Rename">✏️</button>
          <button class="dps-icon-btn dps-delete" data-action="delete-project" data-project-id="${p.id}" title="Delete">✕</button>
        </div>
      </div>`;
  }).join('');

  // Delegated click handler (re-attach each render using event delegation on stable parent)
  list.onclick = function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id     = btn.getAttribute('data-project-id');

    if (action === 'load-project') {
      loadProject(id);
    } else if (action === 'rename-project') {
      _startInlineRename(id);
    } else if (action === 'confirm-rename') {
      // Trigger blur on the input to commit
      const card  = e.target.closest('.dps-card');
      const input = card?.querySelector('.dps-card-name-input');
      if (input) input.blur();
    } else if (action === 'delete-project') {
      const proj = _loadProjects().find(p => p.id === id);
      const confirmed = confirm(
        `Are you sure you want to delete "${proj?.name || 'this project'}"?\n\nThis action cannot be undone.`
      );
      if (confirmed) deleteProject(id);
    }
  };
}

// ── State capture / apply (mirrors workshop_snapshots logic) ──

function _captureState() {
  syncAllFromDOM();

  const chartInfo = {
    dacumDate:       _val('dacumDate'),
    venue:           _val('venue'),
    producedFor:     _val('producedFor'),
    producedBy:      _val('producedBy'),
    occupationTitle: _val('occupationTitle'),
    jobTitle:        _val('jobTitle'),
    sector:          _val('sector'),
    context:         _val('context'),
    facilitators:    _val('facilitators'),
    observers:       _val('observers'),
    panelMembers:    _val('panelMembers'),
  };

  const additionalInfo = {
    headings: {
      knowledge:  _text('knowledgeHeading'),
      skills:     _text('skillsHeading'),
      behaviors:  _text('behaviorsHeading'),
      tools:      _text('toolsHeading'),
      trends:     _text('trendsHeading'),
      acronyms:   _text('acronymsHeading'),
      careerPath: _text('careerPathHeading'),
    },
    content: {
      knowledge:  _val('knowledgeInput'),
      skills:     _val('skillsInput'),
      behaviors:  _val('behaviorsInput'),
      tools:      _val('toolsInput'),
      trends:     _val('trendsInput'),
      acronyms:   _val('acronymsInput'),
      careerPath: _val('careerPathInput'),
    },
    customSections: _captureCustomSections(),
  };

  return JSON.parse(JSON.stringify({
    dutiesData:               appState.dutiesData              || [],
    dutyCount:                appState.dutyCount,
    taskCounts:               appState.taskCounts              || {},
    producedForImage:         appState.producedForImage,
    producedByImage:          appState.producedByImage,
    customSectionCounter:     appState.customSectionCounter,
    skillsLevelData:          appState.skillsLevelData,
    verificationRatings:      appState.verificationRatings     || {},
    taskMetadata:             appState.taskMetadata            || {},
    collectionMode:           appState.collectionMode,
    workflowMode:             appState.workflowMode,
    workshopParticipants:     appState.workshopParticipants,
    priorityFormula:          appState.priorityFormula,
    workshopCounts:           appState.workshopCounts          || {},
    workshopResults:          appState.workshopResults         || {},
    tvExportMode:             appState.tvExportMode,
    trainingLoadMethod:       appState.trainingLoadMethod,
    clusteringData:           appState.clusteringData,
    learningOutcomesData:     appState.learningOutcomesData,
    moduleMappingData:        appState.moduleMappingData,
    verificationDecisionMade: appState.verificationDecisionMade,
    clusteringAllowed:        appState.clusteringAllowed,
    _chartInfo:               chartInfo,
    _additionalInfo:          additionalInfo,
    // ── Live Workshop session ──────────────────────────────
    lwSessionId:              appState.lwSessionId         || null,
    lwFinalizedData:          appState.lwFinalizedData      || null,
    lwAggregatedResults:      appState.lwAggregatedResults  || null,
    lwParticipantUrl:         (function() {
      const el = document.getElementById('lwParticipantLink');
      return el ? el.getAttribute('data-full-url') || '' : '';
    })(),
    lwIsFinalized:            appState.lwIsFinalized        || false,
  }));
}

function _applyState(s) {
  if (!s) return;
  appState.dutiesData               = s.dutiesData               || [];
  appState.dutyCount                = s.dutyCount                || 0;
  appState.taskCounts               = s.taskCounts               || {};
  appState.producedForImage         = s.producedForImage         || null;
  appState.producedByImage          = s.producedByImage          || null;
  appState.customSectionCounter     = s.customSectionCounter     || 0;
  appState.skillsLevelData          = s.skillsLevelData;
  appState.verificationRatings      = s.verificationRatings      || {};
  appState.taskMetadata             = s.taskMetadata             || {};
  appState.collectionMode           = s.collectionMode           || 'workshop';
  appState.workflowMode             = s.workflowMode             || 'standard';
  appState.workshopParticipants     = s.workshopParticipants     || 10;
  appState.priorityFormula          = s.priorityFormula          || 'if';
  appState.workshopCounts           = s.workshopCounts           || {};
  appState.workshopResults          = s.workshopResults          || {};
  appState.tvExportMode             = s.tvExportMode             || 'appendix';
  appState.trainingLoadMethod       = s.trainingLoadMethod       || 'advanced';
  appState.clusteringData           = s.clusteringData           || { clusters: [], availableTasks: [], clusterCounter: 0 };
  appState.learningOutcomesData     = s.learningOutcomesData     || { outcomes: [], outcomeCounter: 0 };
  appState.moduleMappingData        = s.moduleMappingData        || { modules: [], moduleCounter: 0 };
  appState.verificationDecisionMade = s.verificationDecisionMade || false;
  appState.clusteringAllowed        = s.clusteringAllowed        || false;
  appState._chartInfo               = s._chartInfo               || {};
  appState._additionalInfo          = s._additionalInfo          || {};
  // ── Live Workshop session ──────────────────────────────
  appState.lwSessionId              = s.lwSessionId              || null;
  appState.lwFinalizedData          = s.lwFinalizedData          || null;
  appState.lwAggregatedResults      = s.lwAggregatedResults      || null;
  appState.lwIsFinalized            = s.lwIsFinalized            || false;
  _applyLiveWorkshopDOM(s);
}

// ── Restore live workshop DOM after project switch ─────────────

function _applyLiveWorkshopDOM(s) {
  const sessionId      = s.lwSessionId     || null;
  const participantUrl = s.lwParticipantUrl || '';
  const isFinalized    = s.lwIsFinalized    || false;
  const hasDecision    = s.verificationDecisionMade || false;

  const lwSection    = document.getElementById('liveWorkshopSection');
  const lwStep1      = document.getElementById('lwStep1-finalize');
  const lwStep2      = document.getElementById('lwStep2-session');
  const lwSessionEl  = document.getElementById('lwSessionId');
  const lwLinkEl     = document.getElementById('lwParticipantLink');
  const lwResults    = document.getElementById('lwResultsContainer');
  const lwExport     = document.getElementById('lwExportButtons');
  const lwQRModal    = document.getElementById('lwQRModal');
  const btnFinalize  = document.getElementById('btnLWFinalize');
  const btnBypass    = document.getElementById('btnBypassToClustering');
  const btnReset     = document.getElementById('btnResetDecision');

  // Always close QR modal on project switch
  if (lwQRModal) lwQRModal.style.display = 'none';

  // lwStep1 (Finalize / Bypass buttons) is ALWAYS visible —
  // it's the entry point for any project.
  if (lwSection) lwSection.style.display = 'block';
  if (lwStep1)   lwStep1.style.display   = 'block';

  if (sessionId && isFinalized) {
    // ── Project has an active session ─────────────────────
    if (lwStep2)     lwStep2.style.display  = 'block';
    if (lwSessionEl) lwSessionEl.textContent = sessionId;

    // Populate project info row (name + duties/tasks count)
    const lwProjectInfo  = document.getElementById('lwProjectInfo');
    const lwProjectName  = document.getElementById('lwProjectName');
    const lwProjectStats = document.getElementById('lwProjectStats');
    const activeId = localStorage.getItem('dacum_active_project') || '';
    let allProjects = [];
    try { allProjects = JSON.parse(localStorage.getItem('dacum_projects') || '[]'); } catch(e){}
    const proj = allProjects.find(p => p.id === activeId);
    if (proj && lwProjectInfo && lwProjectName && lwProjectStats) {
      const dCount = (proj.state?.dutiesData || []).length;
      const tCount = (proj.state?.dutiesData || []).reduce((a, d) => a + (d.tasks?.length || 0), 0);
      lwProjectName.textContent  = proj.name;
      lwProjectStats.textContent = `${dCount} ${dCount === 1 ? 'duty' : 'duties'} · ${tCount} ${tCount === 1 ? 'task' : 'tasks'}`;
      lwProjectInfo.style.display = 'block';
    } else if (lwProjectInfo) {
      lwProjectInfo.style.display = 'none';
    }

    if (lwLinkEl && participantUrl) {
      const shortLink = participantUrl.includes('/')
        ? participantUrl.substring(participantUrl.lastIndexOf('/') + 1)
        : participantUrl;
      lwLinkEl.textContent = shortLink;
      lwLinkEl.setAttribute('data-full-url', participantUrl);
    } else if (lwLinkEl) {
      lwLinkEl.textContent = '';
      lwLinkEl.removeAttribute('data-full-url');
    }

    // Results area
    if (s.lwAggregatedResults && lwResults) {
      lwResults.innerHTML = '<p style="color:#16a34a;font-style:italic;text-align:center;padding:20px;">✅ Voting results available — click Refresh to view.</p>';
    } else if (lwResults) {
      lwResults.innerHTML = '<p style="color:#999;font-style:italic;text-align:center;padding:30px;">No votes received yet.</p>';
    }
    if (lwExport) lwExport.style.display = s.lwAggregatedResults ? 'block' : 'none';

    // Session active: hide Finalize + Bypass, only show Reset Decision
    if (btnFinalize) btnFinalize.style.display = 'none';
    if (btnBypass)   btnBypass.style.display   = 'none';
    if (btnReset)    btnReset.style.display     = 'inline-block';

  } else {
    // ── No session yet — fresh project ────────────────────
    if (lwStep2)     lwStep2.style.display  = 'none';
    if (lwSessionEl) lwSessionEl.textContent = '';
    if (lwLinkEl)  { lwLinkEl.textContent = ''; lwLinkEl.removeAttribute('data-full-url'); }
    if (lwResults)   lwResults.innerHTML    = '';
    if (lwExport)    lwExport.style.display = 'none';

    // Hide project info row
    const _lwPI = document.getElementById('lwProjectInfo');
    if (_lwPI) _lwPI.style.display = 'none';

    // No session: show Finalize + Bypass, hide Reset unless decision made
    if (btnFinalize) { btnFinalize.style.display = ''; btnFinalize.disabled = false; btnFinalize.title = ''; }
    if (btnBypass)   { btnBypass.style.display   = ''; btnBypass.disabled   = false; }
    if (btnReset)      btnReset.style.display = hasDecision ? 'inline-block' : 'none';
  }
}

// ── localStorage ──────────────────────────────────────────────

function _loadProjects() {
  try { return JSON.parse(localStorage.getItem(LS_PROJECTS) || '[]'); }
  catch { return []; }
}

function _saveProjects(list) {
  try { localStorage.setItem(LS_PROJECTS, JSON.stringify(list)); }
  catch {
    showStatus('⚠️ Storage full — oldest project removed.', 'error');
    list.splice(0, 1);
    try { localStorage.setItem(LS_PROJECTS, JSON.stringify(list)); } catch {}
  }
}

function _getActive()      { return localStorage.getItem(LS_ACTIVE) || null; }
function _setActive(id)    { id ? localStorage.setItem(LS_ACTIVE, id) : localStorage.removeItem(LS_ACTIVE); }

// ── Inline rename ─────────────────────────────────────────────

function _startInlineRename(id) {
  const card   = document.querySelector(`.dps-card[data-project-id="${id}"]`);
  if (!card) return;

  const nameSpan  = card.querySelector('.dps-card-name');
  const nameInput = card.querySelector('.dps-card-name-input');
  const renameBtn = card.querySelector('.dps-rename');
  if (!nameSpan || !nameInput) return;

  // Switch to edit mode
  nameSpan.style.display  = 'none';
  nameInput.style.display = 'block';

  // CRITICAL: stop click/mousedown bubbling so card-body "load-project"
  // handler doesn't fire when user clicks inside the input field.
  function _stopBubble(e) { e.stopPropagation(); }
  nameInput.addEventListener('click',     _stopBubble);
  nameInput.addEventListener('mousedown', _stopBubble);

  // Delay focus to next tick so the rename-button's own click event
  // finishes before we attach the blur listener.
  setTimeout(function () {
    nameInput.focus();
    // Place cursor at end (not select-all) so user can click to position
    const len = nameInput.value.length;
    nameInput.setSelectionRange(len, len);
  }, 0);

  // Mark card as editing
  card.classList.add('dps-editing');
  if (renameBtn) renameBtn.setAttribute('data-action', 'confirm-rename');

  function commit() {
    const val = nameInput.value.trim();
    if (val && val !== nameSpan.textContent) {
      renameProject(id, val);   // triggers renderProjectsSidebar
    } else {
      restore();
    }
    cleanup();
  }

  function restore() {
    nameInput.style.display = 'none';
    nameSpan.style.display  = '';
    card.classList.remove('dps-editing');
    if (renameBtn) renameBtn.setAttribute('data-action', 'rename-project');
  }

  function abort() {
    restore();
    cleanup();
  }

  function cleanup() {
    nameInput.removeEventListener('blur',      commit);
    nameInput.removeEventListener('keydown',   onKey);
    nameInput.removeEventListener('click',     _stopBubble);
    nameInput.removeEventListener('mousedown', _stopBubble);
  }

  function onKey(e) {
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); abort();  }
  }

  // Add blur listener after a tick so the rename-button click doesn't
  // immediately trigger it.
  setTimeout(function () {
    nameInput.addEventListener('blur',    commit);
    nameInput.addEventListener('keydown', onKey);
  }, 0);
}

// ── Sidebar toggle ────────────────────────────────────────────

function _toggleSidebar() {
  const sb      = document.getElementById('dacumProjectsSidebar');
  const wrapper = document.getElementById('dacumAppWrapper');
  const btn     = document.getElementById('dpsToggle');
  if (!sb) return;
  const collapsed = sb.classList.toggle('dps-collapsed');
  if (wrapper) wrapper.classList.toggle('dps-is-collapsed', collapsed);
  if (btn) btn.textContent = collapsed ? '▶' : '◀';
  _positionToggle();
}

function _positionToggle() {
  const sb  = document.getElementById('dacumProjectsSidebar');
  const btn = document.getElementById('dpsToggle');
  if (!sb || !btn) return;
  const collapsed = sb.classList.contains('dps-collapsed');
  btn.style.left = (collapsed ? 0 : 260) + 'px';
}

// ── DOM capture helpers ───────────────────────────────────────

function _captureCustomSections() {
  const sections = [];
  document.querySelectorAll('#customSectionsContainer .section-container').forEach(div => {
    const heading  = div.querySelector('h3');
    const textarea = div.querySelector('textarea');
    if (heading && textarea) sections.push({ heading: heading.textContent, content: textarea.value });
  });
  return sections;
}

function _val(id)  { const el = document.getElementById(id); return el ? el.value : ''; }
function _text(id) { const el = document.getElementById(id); return el ? el.textContent : ''; }

function _esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── CSS injection ─────────────────────────────────────────────

function _injectCSS() {
  if (document.getElementById('dps-styles')) return;
  const style = document.createElement('style');
  style.id = 'dps-styles';
  style.textContent = `
/* ── Layout root ── */
#dacumAppWrapper {
  display: block;
  width: 100%;
}

/* Main container shifts right to make room for fixed sidebar */
#dacumAppWrapper > .container {
  margin-left: 260px;
  transition: margin-left 0.25s ease;
  min-width: 0;
  overflow-x: hidden;
}
#dacumAppWrapper.dps-is-collapsed > .container {
  margin-left: 0;
}

/* Tabs wrap instead of overflow */
.tabs {
  flex-wrap: wrap !important;
  overflow-x: visible !important;
}

/* ── Sidebar — fully fixed, full height below toolbar ── */
.dps-sidebar {
  position: fixed;
  top: 60px;
  left: 0;
  width: 260px;
  height: calc(100vh - 60px);
  overflow-y: auto;
  overflow-x: hidden;
  background: #1e1e2e;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  z-index: 300;
  box-shadow: 2px 0 16px rgba(0,0,0,0.3);
  scrollbar-width: thin;
  scrollbar-color: #45475a transparent;
}
.dps-collapsed {
  width: 0 !important;
  overflow: hidden !important;
  box-shadow: none !important;
}

/* ── Header ── */
.dps-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 12px 10px;
  border-bottom: 1px solid #313244;
  gap: 8px;
  min-height: 52px;
  flex-shrink: 0;
}
.dps-title {
  font-size: 0.92em;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  color: #cba6f7;
  letter-spacing: 0.03em;
}
.dps-collapsed .dps-title,
.dps-collapsed .dps-search-wrap,
.dps-collapsed .dps-list,
.dps-collapsed .dps-new-btn { display: none; }

/* ── New button ── */
.dps-new-btn {
  background: #cba6f7;
  color: #1e1e2e;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.8em;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s;
}
.dps-new-btn:hover { background: #b4a1e8; }

/* ── Search ── */
.dps-search-wrap { padding: 8px 10px 6px; flex-shrink: 0; }
.dps-search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.dps-search-icon {
  position: absolute;
  left: 9px;
  width: 14px;
  height: 14px;
  pointer-events: none;
  flex-shrink: 0;
  opacity: 1;
  transition: opacity 0.12s;
}
/* Hide icon when focused OR when has value — cursor never overlaps */
.dps-search-box.has-value .dps-search-icon,
.dps-search-box.is-focused .dps-search-icon { opacity: 0; }
.dps-search {
  width: 100%;
  padding: 6px 10px 6px 30px;
  border-radius: 8px;
  border: 1.5px solid #313244;
  background: #181825;
  color: #cdd6f4;
  font-size: 0.8em;
  outline: none;
  box-sizing: border-box;
  height: 32px;
  transition: border-color 0.15s, padding-left 0.12s;
}
/* Remove left indent once icon is hidden */
.dps-search-box.has-value .dps-search,
.dps-search-box.is-focused .dps-search { padding-left: 10px; }
.dps-search:focus { border-color: #cba6f7; }
.dps-search::placeholder { color: #45475a; font-style: italic; }

/* ── List ── */
.dps-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 16px;
  scrollbar-width: thin;
  scrollbar-color: #45475a transparent;
}
.dps-empty {
  color: #6c7086;
  font-size: 0.82em;
  text-align: center;
  padding: 20px 8px;
  line-height: 1.6;
}

/* ── Cards ── */
.dps-card {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid #313244;
  margin-bottom: 7px;
  background: #181825;
  transition: background 0.15s, border-color 0.15s;
  cursor: pointer;
  padding: 2px 2px 2px 0;
}
.dps-card:hover         { background: #26263a; border-color: #45475a; }
.dps-card.dps-active    { background: #2a273f; border-color: #cba6f7; }
.dps-card.dps-editing   { border-color: #cba6f7; background: #2a273f; }
.dps-card-body          { flex: 1; padding: 8px 4px 8px 10px; min-width: 0; }

/* Name display + inline input */
.dps-card-name-wrap { margin-bottom: 3px; }
.dps-card-name {
  display: block;
  font-size: 0.88em;
  font-weight: 600;
  color: #cdd6f4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dps-active .dps-card-name { color: #cba6f7; }

.dps-card-name-input {
  width: 100%;
  background: #1e1e2e;
  border: 1.5px solid #cba6f7;
  border-radius: 5px;
  color: #cdd6f4;
  font-size: 0.88em;
  font-weight: 600;
  font-family: inherit;
  padding: 3px 7px;
  outline: none;
  box-sizing: border-box;
}

.dps-card-meta  { font-size: 0.72em; color: #6c7086; margin-top: 2px; }
.dps-card-stats {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.72em;
  color: #a6adc8;
}

/* ── Card action buttons — always visible, clearly colored ── */
.dps-card-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px 7px 7px 0;
  flex-shrink: 0;
}
.dps-icon-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.82em;
  transition: background 0.12s, transform 0.1s;
  padding: 0;
  flex-shrink: 0;
}
.dps-icon-btn:active { transform: scale(0.92); }

/* Rename — blue tint, always visible */
.dps-rename {
  background: #1e3a5f;
  color: #93c5fd;
}
.dps-rename:hover { background: #2563eb; color: #fff; }

/* Delete — red tint, always visible */
.dps-delete {
  background: #3e2a2a;
  color: #f38ba8;
}
.dps-delete:hover { background: #dc2626; color: #fff; }

/* ── Toggle button — fixed, always on the right edge of the sidebar ── */
#dpsToggle {
  position: fixed;
  top: 50vh;
  transform: translateY(-50%);
  left: 260px;
  background: #45475a;
  color: #cdd6f4;
  border: none;
  border-radius: 0 6px 6px 0;
  width: 16px;
  height: 48px;
  padding: 0;
  font-size: 0.65em;
  cursor: pointer;
  z-index: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, left 0.25s ease;
}
#dpsToggle:hover { background: #cba6f7; color: #1e1e2e; }
`;
  document.head.appendChild(style);
}
