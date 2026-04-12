// ============================================================
// /autosave.js
// Auto Save + Crash Recovery for DACUM Live Pro.
//
// Strategy:
//   - Observes dutiesContainer + document-level state-change
//     events via a MutationObserver + input listener.
//   - Debounces writes (800 ms) to avoid hammering localStorage.
//   - Writes two places on every autosave trigger:
//       1. dacum_projects  (via saveCurrentProject)
//       2. dacum_session_backup  (lightweight crash guard)
//   - On startup, checks the session backup and offers recovery
//     via a non-blocking dialog rendered in JS (no HTML changes).
//
// Rules obeyed:
//   ✗ Never touches duties.js / tasks.js / history.js / snapshots.js
//   ✗ Never resets undo/redo
//   ✗ Never modifies renderer logic
// ============================================================

import { saveCurrentProject,
         getActiveProjectId }  from './dacum_projects.js';
import { renderAll }           from './workshop_snapshots.js';
import { appState }            from './state.js';
import { syncAllFromDOM }      from './duties.js';

const LS_BACKUP     = 'dacum_session_backup';
const DEBOUNCE_MS   = 800;
let   _debounceTimer = null;
let   _started       = false;

// ── Public API ────────────────────────────────────────────────

/**
 * Attach observers to the duties container and document inputs.
 * Safe to call multiple times — guards against double-init.
 */
export function startAutoSave() {
  if (_started) return;
  _started = true;

  // Wait until DOM is ready (called from DOMContentLoaded, but be safe)
  const attach = () => {
    _watchDutiesContainer();
    _watchDocumentInputs();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
}

/**
 * Immediately flush current state to the session backup key.
 * Also called internally on every debounced save.
 */
export function saveSessionBackup() {
  try {
    syncAllFromDOM();
    const backup = {
      timestamp: Date.now(),
      projectId: getActiveProjectId() || null,
      state:     _snapshotAppState(),
    };
    localStorage.setItem(LS_BACKUP, JSON.stringify(backup));
  } catch (e) {
    // Storage full or serialisation error — silently skip backup
    console.warn('[autosave] session backup failed:', e);
  }
}

/**
 * Check for a crash-recovery backup on startup.
 * If one exists and is newer than the stored project, show the
 * recovery dialog.  Must be called after the project system is
 * initialised (i.e. after initProjectsSidebar in app.js).
 */
export function checkCrashRecovery() {
  try {
    const raw = localStorage.getItem(LS_BACKUP);
    if (!raw) return;

    const backup = JSON.parse(raw);
    if (!backup || !backup.timestamp || !backup.state) {
      localStorage.removeItem(LS_BACKUP);
      return;
    }

    // Compare backup timestamp against the project's lastSaved timestamp.
    // If the backup is newer by more than 5 s → offer recovery.
    const projectLastSaved = _getProjectLastSaved(backup.projectId);
    const delta = backup.timestamp - (projectLastSaved || 0);
    if (delta < 5000) {
      // Not meaningfully newer — discard silently
      localStorage.removeItem(LS_BACKUP);
      return;
    }

    _showRecoveryDialog(backup);
  } catch (e) {
    console.warn('[autosave] crash recovery check failed:', e);
    localStorage.removeItem(LS_BACKUP);
  }
}

// ── Internal: debounced autosave trigger ─────────────────────

function _scheduleAutoSave() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(_flushAutoSave, DEBOUNCE_MS);
}

function _flushAutoSave() {
  try {
    saveCurrentProject();   // persists to dacum_projects
    saveSessionBackup();    // persists crash-guard backup
  } catch (e) {
    console.warn('[autosave] flush failed:', e);
  }
}

// ── Internal: observers ───────────────────────────────────────

/** Watch the duties container for DOM mutations (add/remove nodes). */
function _watchDutiesContainer() {
  const container = document.getElementById('dutiesContainer');
  if (!container) return;

  const observer = new MutationObserver(() => _scheduleAutoSave());
  observer.observe(container, { childList: true, subtree: true });
}

/**
 * Watch input/change events on the whole document for text edits
 * in duties, tasks, and chart-info fields.
 */
function _watchDocumentInputs() {
  const WATCHED = [
    'input[data-duty-id]',
    'input[data-task-id]',
    '#dacumDate', '#venue', '#producedFor', '#producedBy',
    '#occupationTitle', '#jobTitle', '#sector', '#context',
    '#facilitators', '#observers', '#panelMembers',
    '#knowledgeInput', '#skillsInput', '#behaviorsInput',
    '#toolsInput', '#trendsInput', '#acronymsInput', '#careerPathInput',
  ].join(', ');

  document.addEventListener('input', function (e) {
    if (e.target.matches(WATCHED)) _scheduleAutoSave();
  }, { passive: true });

  // Also catch select/radio/checkbox changes (e.g. collection mode)
  document.addEventListener('change', function (e) {
    if (e.target.closest('#duties-tab, #info-tab, #additional-info-tab')) {
      _scheduleAutoSave();
    }
  }, { passive: true });
}

// ── Internal: recovery dialog ─────────────────────────────────

function _showRecoveryDialog(backup) {
  // Inject dialog styles once
  if (!document.getElementById('as-dialog-styles')) {
    const s = document.createElement('style');
    s.id = 'as-dialog-styles';
    s.textContent = `
      #asRecoveryOverlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55);
        z-index: 9999;
        display: flex; align-items: center; justify-content: center;
      }
      #asRecoveryDialog {
        background: #fff;
        border-radius: 14px;
        padding: 28px 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        font-family: inherit;
        text-align: center;
      }
      #asRecoveryDialog h2 {
        margin: 0 0 10px;
        font-size: 1.15em;
        color: #1f2937;
      }
      #asRecoveryDialog p {
        margin: 0 0 22px;
        font-size: 0.92em;
        color: #6b7280;
        line-height: 1.55;
      }
      #asRecoveryDialog .as-meta {
        display: inline-block;
        background: #f3f4f6;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 0.82em;
        color: #374151;
        margin-bottom: 20px;
      }
      .as-btn-row { display: flex; gap: 12px; justify-content: center; }
      .as-btn {
        border: none; border-radius: 8px;
        padding: 10px 26px; font-size: 0.95em;
        font-weight: 600; cursor: pointer;
        transition: all 0.15s;
      }
      .as-btn-restore {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .as-btn-restore:hover { opacity: 0.88; transform: translateY(-1px); }
      .as-btn-discard {
        background: #f3f4f6; color: #6b7280;
      }
      .as-btn-discard:hover { background: #e5e7eb; }
    `;
    document.head.appendChild(s);
  }

  const date    = new Date(backup.timestamp);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const overlay = document.createElement('div');
  overlay.id = 'asRecoveryOverlay';
  overlay.innerHTML = `
    <div id="asRecoveryDialog">
      <h2>⚡ Unsaved Work Found</h2>
      <p>We found unsaved work from your previous session.<br>Would you like to restore it?</p>
      <span class="as-meta">📅 ${dateStr} · ${timeStr}</span>
      <div class="as-btn-row">
        <button class="as-btn as-btn-restore" id="asBtnRestore">↩ Restore</button>
        <button class="as-btn as-btn-discard" id="asBtnDiscard">Discard</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('asBtnRestore').addEventListener('click', () => {
    _applyBackupState(backup.state);
    renderAll();
    localStorage.removeItem(LS_BACKUP);
    overlay.remove();
  });

  document.getElementById('asBtnDiscard').addEventListener('click', () => {
    localStorage.removeItem(LS_BACKUP);
    overlay.remove();
  });
}

// ── Internal: state helpers ───────────────────────────────────

/** Lightweight serialisable snapshot of appState (no DOM, no functions). */
function _snapshotAppState() {
  try {
    return JSON.parse(JSON.stringify({
      dutiesData:               appState.dutiesData              || [],
      dutyCount:                appState.dutyCount               || 0,
      taskCounts:               appState.taskCounts              || {},
      producedForImage:         appState.producedForImage        || null,
      producedByImage:          appState.producedByImage         || null,
      customSectionCounter:     appState.customSectionCounter    || 0,
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
      _chartInfo:               appState._chartInfo              || {},
      _additionalInfo:          appState._additionalInfo         || {},
    }));
  } catch { return {}; }
}

/** Apply a raw state object into appState (same as _applyState in dacum_projects). */
function _applyBackupState(s) {
  if (!s) return;
  appState.dutiesData               = s.dutiesData               || [];
  appState.dutyCount                = s.dutyCount                || 0;
  appState.taskCounts               = s.taskCounts               || {};
  appState.producedForImage         = s.producedForImage         || null;
  appState.producedByImage          = s.producedByImage          || null;
  appState.customSectionCounter     = s.customSectionCounter     || 0;
  if (s.skillsLevelData) appState.skillsLevelData = s.skillsLevelData;
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
}

/** Return the lastSaved timestamp of a stored project (or 0). */
function _getProjectLastSaved(projectId) {
  if (!projectId) return 0;
  try {
    const projects = JSON.parse(localStorage.getItem('dacum_projects') || '[]');
    const p = projects.find(p => p.id === projectId);
    return p?.lastSaved || p?.created || 0;
  } catch { return 0; }
}
