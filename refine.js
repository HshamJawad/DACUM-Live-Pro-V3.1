// ============================================================
// /refine.js
// AI Result Refinement — non-destructive post-processing.
//
// Design rules:
//   • Only activates AFTER AI generation (markAiGenerated flag).
//   • Always pushes to history FIRST → fully undo-able with Ctrl+Z.
//   • Never silently discards user edits made after generation.
//   • Operates on appState.dutiesData directly, then re-renders once.
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
