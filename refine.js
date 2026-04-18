// ============================================================
// /refine.js
// AI Result Refinement — non-destructive post-processing.
//
// Design rules:
//   • Only activates AFTER AI generation (markAiGenerated flag).
//   • Always pushes to history FIRST → fully undo-able with Ctrl+Z.
//   • Never silently discards user edits made after generation.
//   • Operates on appState.dutiesData directly, then re-renders once.
//
// Post-refine UX (added):
//   • Persistent summary card appended inside #refineResultsSection
//     that stays visible until user dismisses, re-runs refine, or
//     clears/loads a project.
//   • Temporary green highlight on any duty/task whose text was
//     mutated in-place (2500 ms), so the user can see exactly what
//     the refinement touched.  Deletions (duplicates/fragments) can
//     only be reported via the summary card since they're gone from
//     the DOM.
// ============================================================

import { appState }                          from './state.js';
import { syncAllFromDOM, renderDutiesFromState } from './duties.js';
import { pushHistoryState }                  from './history.js';
import { showStatus }                        from './renderer.js';

// ── Module-level flag (pure UI state, not saved to appState) ──

let _aiGenerated = false;

/** Call immediately after a successful AI generation. */
export function markAiGenerated() {
  _aiGenerated = true;
  _showRefineSection();
}

/** Call on app init / clear-all / load-project to reset. */
export function clearAiGeneratedFlag() {
  _aiGenerated = false;
  _hideRefineSection();
  _removeSummaryCard();     // also clear any stale summary from previous run
}

// ── Visibility helpers ────────────────────────────────────────

function _showRefineSection() {
  const el = document.getElementById('refineResultsSection');
  if (el) {
    el.style.display = 'block';
    el.style.animation = 'refine-fade-in 0.35s ease';
  }
}

function _hideRefineSection() {
  const el = document.getElementById('refineResultsSection');
  if (el) el.style.display = 'none';
}

// ── Public entry point ────────────────────────────────────────

/**
 * refineResults()
 * Applies a set of soft, well-defined transformations to the
 * current dutiesData.  The whole operation is pushed onto the
 * undo stack before any mutation → one Ctrl+Z reverts it all.
 */
export function refineResults() {
  if (!_aiGenerated) return;

  // Flush any pending DOM edits into state first
  syncAllFromDOM();

  // Push BEFORE mutation → undo restores this exact snapshot
  pushHistoryState();

  // Capture text snapshot BEFORE mutation — used to compute highlights
  const beforeSnap = _captureDiffSnapshot();

  const stats = {
    trimmed:    0,
    periods:    0,
    clauses:    0,
    normalized: 0,
    duplicates: 0,
    fragments:  0,
  };

  appState.dutiesData = (appState.dutiesData || []).map(duty => {
    // ── Duty title ─────────────────────────────────────────
    const cleanTitle = _normalizeTitle(duty.title, stats);

    // ── Tasks ──────────────────────────────────────────────
    const seen = new Set();

    const cleanedTasks = duty.tasks
      .map(task => _cleanTask(task, stats))
      .filter(task => {
        // Remove fragments (fewer than 2 words after cleaning)
        const wordCount = task.text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 2) {
          stats.fragments++;
          return false;
        }
        // Remove exact duplicates within the same duty (case-insensitive)
        const key = task.text.trim().toLowerCase();
        if (seen.has(key)) {
          stats.duplicates++;
          return false;
        }
        seen.add(key);
        return true;
      })
      // Re-number tasks sequentially after filtering
      .map((task, i) => ({ ...task, num: i + 1 }));

    return { ...duty, title: cleanTitle, tasks: cleanedTasks };
  });

  renderDutiesFromState();

  // Diff the after-state against the captured snapshot and apply
  // a temporary highlight to every changed element still on screen
  const changed = _computeChanges(beforeSnap);
  _applyRefinedHighlights(changed);

  // Build the persistent summary card (replaces any previous one)
  _renderSummaryCard(stats, changed);

  // Legacy toast — kept for continuity; the card is the primary signal
  _reportStats(stats);
}

// ── Task-level cleaner ────────────────────────────────────────

function _cleanTask(task, stats) {
  let text = task.text;

  // 1. Trim surrounding whitespace
  const trimmed = text.trim();
  if (trimmed !== text) { stats.trimmed++; text = trimmed; }

  // 2. Remove trailing period (DACUM standard: no sentence-end punctuation)
  if (/[.。]$/.test(text)) {
    text = text.replace(/[.。]\s*$/, '').trimEnd();
    stats.periods++;
  }

  // 3. Strip result/purpose clauses appended to tasks
  //    e.g. "Install valve to ensure flow" → "Install valve"
  const stripped = _stripResultClauses(text);
  if (stripped !== text) { stats.clauses++; text = stripped; }

  // 4. Capitalize first letter
  if (text.length > 0) {
    const cap = text[0].toUpperCase() + text.slice(1);
    if (cap !== text) { stats.normalized++; text = cap; }
  }

  // 5. Remove double spaces
  text = text.replace(/  +/g, ' ').trim();

  return { ...task, text };
}

// ── Title normalizer ──────────────────────────────────────────

function _normalizeTitle(title, stats) {
  if (!title) return title;
  let t = title.trim();
  // Remove trailing period from duty titles
  if (/[.。]$/.test(t)) { t = t.replace(/[.。]\s*$/, '').trimEnd(); stats.periods++; }
  // Capitalize first letter
  if (t.length > 0) {
    const cap = t[0].toUpperCase() + t.slice(1);
    if (cap !== t) { stats.normalized++; t = cap; }
  }
  return t;
}

// ── Result-clause patterns ────────────────────────────────────
//
// These strips purpose/result phrases that DACUM convention
// forbids on task statements (tasks describe WHAT, not WHY).

const _CLAUSE_PATTERNS = [
  /,?\s+to ensure\b.*$/i,
  /,?\s+in order to\b.*$/i,
  /,?\s+so that\b.*$/i,
  /,?\s+so as to\b.*$/i,
  /,?\s+for the purpose of\b.*$/i,
  /,?\s+to prevent\b.*$/i,
  /,?\s+to maintain\b.*$/i,
  /,?\s+to achieve\b.*$/i,
  /,?\s+to verify\b.*$/i,
  /,?\s+to confirm\b.*$/i,
  /,?\s+to support\b.*$/i,
  /,?\s+to facilitate\b.*$/i,
  /,?\s+to improve\b.*$/i,
  /,?\s+to reduce\b.*$/i,
  /,?\s+to avoid\b.*$/i,
];

function _stripResultClauses(text) {
  let result = text;
  for (const pattern of _CLAUSE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

// ── Diff snapshot + highlight plumbing ────────────────────────

function _captureDiffSnapshot() {
  const snap = { duties: {}, tasks: {} };
  (appState.dutiesData || []).forEach(duty => {
    snap.duties[duty.id] = duty.title || '';
    (duty.tasks || []).forEach(task => {
      snap.tasks[task.inputId] = task.text || '';
    });
  });
  return snap;
}

function _computeChanges(beforeSnap) {
  const changedDuties = [];
  const changedTasks  = [];
  (appState.dutiesData || []).forEach(duty => {
    const before = beforeSnap.duties[duty.id];
    if (before !== undefined && before !== (duty.title || '')) {
      changedDuties.push(duty.id);
    }
    (duty.tasks || []).forEach(task => {
      const b = beforeSnap.tasks[task.inputId];
      if (b !== undefined && b !== (task.text || '')) {
        changedTasks.push(task.inputId);
      }
    });
  });
  return { changedDuties, changedTasks };
}

function _applyRefinedHighlights({ changedDuties, changedTasks }) {
  const HL       = 'refined-highlight';
  const DURATION = 2500;
  const esc      = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape : (s => s);

  changedTasks.forEach(inputId => {
    const el = document.querySelector(`[data-task-id="${esc(inputId)}"]`);
    if (!el) return;
    const target = el.closest('.dcv-task-card') || el.closest('.task-item') || el;
    target.classList.add(HL);
    setTimeout(() => {
      const still   = document.querySelector(`[data-task-id="${esc(inputId)}"]`);
      const stillTg = still ? (still.closest('.dcv-task-card') || still.closest('.task-item') || still) : null;
      if (stillTg) stillTg.classList.remove(HL);
    }, DURATION);
  });

  changedDuties.forEach(dutyId => {
    const el = document.querySelector(`[data-duty-id="${esc(dutyId)}"]`);
    if (!el) return;
    const target = el.closest('.dcv-duty-card') || el;
    target.classList.add(HL);
    setTimeout(() => {
      const still   = document.querySelector(`[data-duty-id="${esc(dutyId)}"]`);
      const stillTg = still ? (still.closest('.dcv-duty-card') || still) : null;
      if (stillTg) stillTg.classList.remove(HL);
    }, DURATION);
  });
}

// ── Persistent summary card ───────────────────────────────────

function _removeSummaryCard() {
  const existing = document.getElementById('refineSummaryCard');
  if (existing) existing.remove();
}

function _renderSummaryCard(stats, changed) {
  const parent = document.getElementById('refineResultsSection');
  if (!parent) return;

  _removeSummaryCard();     // always replace, never stack

  const total = stats.trimmed + stats.periods + stats.clauses +
                stats.normalized + stats.duplicates + stats.fragments;
  const highlightCount = changed.changedDuties.length + changed.changedTasks.length;

  const card = document.createElement('div');
  card.id = 'refineSummaryCard';
  card.className = 'refine-summary-card';

  if (total === 0) {
    card.innerHTML = `
      <button class="refine-summary-close" title="Dismiss" aria-label="Dismiss">×</button>
      <div class="refine-summary-icon">✓</div>
      <div class="refine-summary-title">No refinement needed</div>
      <div class="refine-summary-body">
        AI output already follows DACUM conventions — no trailing periods,
        no result clauses, no duplicate tasks, all statements well-formed.
      </div>
    `;
  } else {
    const bullets = [];
    if (stats.normalized) bullets.push(`${stats.normalized} capitalisation fix${stats.normalized > 1 ? 'es' : ''}`);
    if (stats.periods)    bullets.push(`${stats.periods} trailing period${stats.periods > 1 ? 's' : ''} removed`);
    if (stats.clauses)    bullets.push(`${stats.clauses} result clause${stats.clauses > 1 ? 's' : ''} stripped`);
    if (stats.duplicates) bullets.push(`${stats.duplicates} duplicate task${stats.duplicates > 1 ? 's' : ''} removed`);
    if (stats.fragments)  bullets.push(`${stats.fragments} fragment task${stats.fragments > 1 ? 's' : ''} removed`);
    if (stats.trimmed)    bullets.push(`${stats.trimmed} whitespace fix${stats.trimmed > 1 ? 'es' : ''}`);

    const listHtml = bullets.map(b => `<li>${b}</li>`).join('');
    const hintHtml = highlightCount > 0
      ? `<div class="refine-summary-hint">💡 ${highlightCount} item${highlightCount > 1 ? 's' : ''} highlighted below (fades in ~2.5s)</div>`
      : '';

    card.innerHTML = `
      <button class="refine-summary-close" title="Dismiss" aria-label="Dismiss">×</button>
      <div class="refine-summary-icon">✨</div>
      <div class="refine-summary-title">Refinement applied</div>
      <ul class="refine-summary-list">${listHtml}</ul>
      ${hintHtml}
      <div class="refine-summary-undo">
        Press <kbd>Ctrl</kbd>+<kbd>Z</kbd> to undo all changes.
      </div>
    `;
  }

  // Wire the × button — self-contained, no events.js change needed
  const closeBtn = card.querySelector('.refine-summary-close');
  if (closeBtn) closeBtn.addEventListener('click', () => card.remove());

  parent.appendChild(card);
}

// ── Status reporter ───────────────────────────────────────────

function _reportStats(stats) {
  const total = stats.trimmed + stats.periods + stats.clauses +
                stats.normalized + stats.duplicates + stats.fragments;

  if (total === 0) {
    showStatus('✓ Refinement complete — tasks are already clean and well-formed!', 'success');
    return;
  }

  const parts = [];
  if (stats.normalized) parts.push(`${stats.normalized} capitalisation fix${stats.normalized > 1 ? 'es' : ''}`);
  if (stats.periods)    parts.push(`${stats.periods} trailing period${stats.periods > 1 ? 's' : ''} removed`);
  if (stats.clauses)    parts.push(`${stats.clauses} result clause${stats.clauses > 1 ? 's' : ''} stripped`);
  if (stats.duplicates) parts.push(`${stats.duplicates} duplicate task${stats.duplicates > 1 ? 's' : ''} removed`);
  if (stats.fragments)  parts.push(`${stats.fragments} fragment task${stats.fragments > 1 ? 's' : ''} removed`);
  if (stats.trimmed)    parts.push(`${stats.trimmed} whitespace fix${stats.trimmed > 1 ? 'es' : ''}`);

  showStatus(`✓ Refined: ${parts.join(' · ')}. — Use Ctrl+Z to undo all changes.`, 'success');
}
