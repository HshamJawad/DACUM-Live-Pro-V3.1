// ============================================================
// /drag_drop.js
// Drag & Drop for TASK CARDS — Card View ONLY.
//
// Uses SortableJS (loaded globally via CDN in index.html).
//
// Contract (strictly non-invasive):
//   • Does NOT modify duties.js, tasks.js, history.js or state shape
//   • Does NOT touch table view — only wires `.dcv-tasks-scroll`
//   • Operates through a MutationObserver on `#dutiesContainer`
//     so every re-render of the duties DOM gets its Sortable
//     instances re-initialised automatically
//   • On drop, rebuilds `appState.dutiesData[*].tasks` from DOM
//     order (so Table View, exports, history, JSON save all
//     reflect the new order automatically)
//   • Preserves task identity — task objects keep their .divId,
//     .inputId and .num, so verification ratings, taskMetadata,
//     clustering references, learning outcomes and module
//     mappings remain intact after a move.
// ============================================================

import { appState }             from './state.js';
import { getViewMode,
         renderDutiesFromState,
         syncAllFromDOM }        from './duties.js';
import { pushHistoryState }      from './history.js';
import { saveCurrentProject }    from './dacum_projects.js';

const INIT_FLAG  = '_dacumDragInit';
const GROUP_NAME = 'dacum-tasks';

let _observer  = null;
let _initTimer = null;

// ── Public API ────────────────────────────────────────────────

/**
 * Wire SortableJS onto every existing `.dcv-tasks-scroll` and
 * attach a MutationObserver so future renders are covered too.
 * Safe to call multiple times — guarded internally.
 */
export function initDragDrop() {
  if (typeof window.Sortable === 'undefined') {
    console.warn('[drag_drop] SortableJS not loaded — drag & drop disabled.');
    return;
  }

  // First pass (covers any duties already rendered on boot)
  _initAllScrolls();

  const container = document.getElementById('dutiesContainer');
  if (!container) return;

  if (_observer) return;   // already observing

  _observer = new MutationObserver(_scheduleInit);
  _observer.observe(container, { childList: true, subtree: true });
}

// ── Internals ────────────────────────────────────────────────

function _scheduleInit() {
  clearTimeout(_initTimer);
  _initTimer = setTimeout(_initAllScrolls, 40);
}

function _initAllScrolls() {
  // Only active in Card View — Table View keeps its original behaviour
  if (getViewMode() !== 'card') return;

  document.querySelectorAll('.dcv-tasks-scroll').forEach(scrollEl => {
    if (scrollEl[INIT_FLAG]) return;      // already wired
    scrollEl[INIT_FLAG] = true;

    // Extract dutyId from `tasks_${duty.id}` and expose it as a
    // data attribute so `onEnd` can read it reliably.
    const dutyId = (scrollEl.id || '').replace(/^tasks_/, '');
    if (!dutyId) return;
    scrollEl.dataset.dutyId = dutyId;

    window.Sortable.create(scrollEl, {
      group:            GROUP_NAME,          // allow cross-duty moves
      animation:        150,
      draggable:        '.dcv-task-card',    // only task cards
      filter:           '.dcv-task-input, .dcv-close-btn, .dcv-add-task-btn',
      preventOnFilter:  false,                // keep textarea focus + button clicks
      ghostClass:       'drag-ghost',
      chosenClass:      'drag-chosen',
      dragClass:        'drag-dragging',
      forceFallback:    false,
      fallbackOnBody:   true,
      onEnd:            _onDragEnd,
    });
  });
}

function _onDragEnd(evt) {
  const fromDutyId = evt.from?.dataset?.dutyId;
  const toDutyId   = evt.to?.dataset?.dutyId;
  if (!fromDutyId || !toDutyId) return;

  // No-op guard: same container, same index
  if (fromDutyId === toDutyId && evt.oldIndex === evt.newIndex) return;

  // Capture the moved task's divId BEFORE rerender detaches evt.item,
  // so we can re-find the NEW DOM node after renderDutiesFromState()
  // and apply the temporary highlight class.
  const movedDivId = evt.item?.id || null;

  // 1 · Capture any in-flight textarea edits into state BEFORE mutation
  syncAllFromDOM();

  // 2 · Anchor the pre-drag state for Undo
  pushHistoryState();

  // 3 · Build an inputId → task lookup from current state
  const byInputId = {};
  (appState.dutiesData || []).forEach(d => {
    (d.tasks || []).forEach(t => { byInputId[t.inputId] = t; });
  });

  // 4 · Rebuild the tasks array of every affected duty from DOM order
  const affected = fromDutyId === toDutyId
    ? [fromDutyId]
    : [fromDutyId, toDutyId];

  affected.forEach(dutyId => {
    const scrollEl = document.getElementById(`tasks_${dutyId}`);
    const duty     = (appState.dutiesData || []).find(d => d.id === dutyId);
    if (!scrollEl || !duty) return;

    const newTasks = [];
    scrollEl.querySelectorAll('.dcv-task-card [data-task-id]').forEach(input => {
      const inputId = input.getAttribute('data-task-id');
      const task    = byInputId[inputId];
      if (task) newTasks.push(task);
    });
    duty.tasks = newTasks;
  });

  // 5 · Persist + normalise DOM via the canonical render pipeline
  try { saveCurrentProject(); } catch (_) { /* autosave will catch up */ }
  renderDutiesFromState();

  // 6 · Flash a temporary highlight on the moved card (no animation)
  if (movedDivId) {
    const freshEl = document.getElementById(movedDivId);
    if (freshEl) {
      freshEl.classList.add('task-moved-highlight');
      setTimeout(() => {
        const stillThere = document.getElementById(movedDivId);
        if (stillThere) stillThere.classList.remove('task-moved-highlight');
      }, 1500);
    }
  }
}
