// ============================================================
// /duties.js
// Duty / Task creation, removal, and DOM management.
//
// Architecture: ALL mutations go to appState.dutiesData FIRST,
// then renderDutiesFromState() rebuilds the DOM from state.
// History pushes are NOT done here — that is the caller's job
// (events.js), keeping concerns cleanly separated.
//
// Card View: A second rendering mode that mirrors the same
// data-action attributes so events.js delegation works unchanged.
// View mode is persisted in localStorage under 'dacum_view_mode'.
// ============================================================

import { appState }   from './state.js';
import { showStatus } from './renderer.js';

// ── View mode (persisted) ─────────────────────────────────────

const LS_VIEW = 'dacum_view_mode';

export function getViewMode() {
  return localStorage.getItem(LS_VIEW) || 'card';   // default: card view
}

export function setViewMode(mode) {
  localStorage.setItem(LS_VIEW, mode);
}

export function toggleViewMode() {
  const next = getViewMode() === 'card' ? 'table' : 'card';
  setViewMode(next);
  renderDutiesFromState();
  _updateToggleButton();
}

function _updateToggleButton() {
  const btn     = document.getElementById('btnToggleDutiesView');
  const heading = document.getElementById('dutiesViewHeading');
  if (!btn) return;
  const isCard = getViewMode() === 'card';
  btn.textContent = isCard ? '📋 Table View' : '🃏 Card View';
  btn.className   = 'dcv-toggle-btn' + (isCard ? ' is-card' : '');
  if (heading) heading.textContent = isCard ? 'Card View — Duties & Tasks' : 'Duties and Tasks';
}

// ── DOM Renderer ──────────────────────────────────────────────

/**
 * Rebuild the entire dutiesContainer from appState.dutiesData.
 * Renders either TABLE view (original) or CARD view depending on
 * the current view mode.  Called after every state mutation and
 * after every undo/redo.
 */
export function renderDutiesFromState() {
  const container = document.getElementById('dutiesContainer');
  if (!container) return;

  _updateToggleButton();

  if (getViewMode() === 'card') {
    _renderCardView(container);
  } else {
    _renderTableView(container);
  }
}

// ── TABLE VIEW (original, unchanged) ─────────────────────────

function _renderTableView(container) {
  container.className = '';   // remove card-view-mode class
  container.innerHTML = '';

  // Show original Add Duty button, hide card Add Duty button
  _setAddDutyVisibility('table');

  (appState.dutiesData || []).forEach(duty => {
    const dutyDiv = document.createElement('div');
    dutyDiv.className = 'duty-row';
    dutyDiv.id = duty.id;
    dutyDiv.innerHTML = `
      <div class="duty-header">
        <h4>Duty ${duty.num}</h4>
        <div style="display:flex;gap:10px;">
          <button class="btn-clear-section" data-action="clear-duty"   data-duty-id="${duty.id}">🗑️ Clear</button>
          <button class="btn-remove"         data-action="remove-duty"  data-duty-id="${duty.id}">🗑️ Remove Duty</button>
        </div>
      </div>
      <input type="text" placeholder="Enter duty description"
             data-duty-id="${duty.id}" value="${_esc(duty.title)}">
      <div class="task-list" id="tasks_${duty.id}"></div>
      <button class="btn-add" data-action="add-task" data-duty-id="${duty.id}">➕ Add Task</button>
    `;
    container.appendChild(dutyDiv);

    const taskList = document.getElementById(`tasks_${duty.id}`);
    duty.tasks.forEach(task => {
      const taskDiv = document.createElement('div');
      taskDiv.className = 'task-item';
      taskDiv.id = task.divId;
      taskDiv.innerHTML = `
        <span class="task-label">Task ${task.num}:</span>
        <input type="text" style="flex:1;" placeholder="Enter task description"
               data-task-id="${task.inputId}" value="${_esc(task.text)}">
        <button class="btn-remove" data-action="remove-task" data-task-div-id="${task.divId}">🗑️</button>
      `;
      taskList.appendChild(taskDiv);
    });
  });
}

// ── CARD VIEW ─────────────────────────────────────────────────

function _renderCardView(container) {
  container.className = 'card-view-mode';
  container.innerHTML = '';

  _setAddDutyVisibility('card');

  (appState.dutiesData || []).forEach(duty => {
    // Outer wrapper keeps the same ID so events targeting duty.id still work
    const dutyDiv = document.createElement('div');
    dutyDiv.className = 'duty-row';
    dutyDiv.id = duty.id;

    // ── dcv-row: blue duty card + scrollable task strip ──
    const row = document.createElement('div');
    row.className = 'dcv-row';

    // ─── Blue Duty Card ───────────────────────────────────
    const dutyCard = document.createElement('div');
    dutyCard.className = 'dcv-duty-card';
    dutyCard.innerHTML = `
      <button class="dcv-close-btn" data-action="remove-duty" data-duty-id="${duty.id}"
              title="Remove duty">✕</button>
      <span class="dcv-duty-label">Duty ${duty.num}</span>
      <textarea class="dcv-duty-input"
                data-duty-id="${duty.id}"
                placeholder="Enter duty"
                rows="2">${_esc(duty.title)}</textarea>
    `;
    row.appendChild(dutyCard);

    // ─── Tasks area: scroll strip + add button ────────────
    const tasksArea = document.createElement('div');
    tasksArea.className = 'dcv-tasks-area';

    const tasksScroll = document.createElement('div');
    tasksScroll.className = 'dcv-tasks-scroll';
    tasksScroll.id = `tasks_${duty.id}`;

    duty.tasks.forEach(task => {
      tasksScroll.appendChild(_makeTaskCard(task));
    });

    // ── Add Task button lives INSIDE the scroll strip ──
    const addTaskBtn = document.createElement('button');
    addTaskBtn.className = 'dcv-add-task-btn';
    addTaskBtn.setAttribute('data-action', 'add-task');
    addTaskBtn.setAttribute('data-duty-id', duty.id);
    addTaskBtn.innerHTML = '＋ Task';
    tasksScroll.appendChild(addTaskBtn);   // ← inside scroll, moves with cards

    tasksArea.appendChild(tasksScroll);
    row.appendChild(tasksArea);

    dutyDiv.appendChild(row);
    container.appendChild(dutyDiv);
  });
}

function _makeTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'dcv-task-card';
  card.id = task.divId;
  card.innerHTML = `
    <button class="dcv-close-btn" data-action="remove-task" data-task-div-id="${task.divId}"
            title="Remove task">✕</button>
    <span class="dcv-task-label">Task ${task.num}</span>
    <textarea class="dcv-task-input"
              data-task-id="${task.inputId}"
              placeholder="Enter task"
              rows="2">${_esc(task.text)}</textarea>
  `;
  return card;
}

// ── Add Duty button visibility ────────────────────────────────

function _setAddDutyVisibility(mode) {
  const orig   = document.getElementById('btnAddDuty');
  let   cardBtn = document.getElementById('btnAddDutyCard');

  if (mode === 'card') {
    if (orig) orig.style.display = 'none';
    if (!cardBtn) {
      cardBtn           = document.createElement('button');
      cardBtn.id        = 'btnAddDutyCard';
      cardBtn.className = 'dcv-add-duty-btn';
      cardBtn.innerHTML = '＋ Add Duty';
      // Insert after dutiesContainer
      const container = document.getElementById('dutiesContainer');
      if (container && container.parentNode) {
        container.parentNode.insertBefore(cardBtn, container.nextSibling);
      }
      // Wire ONCE with onclick — never accumulates extra listeners
      cardBtn.onclick = () => addDuty();
    }
    cardBtn.style.display = 'inline-flex';
  } else {
    if (orig)    orig.style.display    = '';
    if (cardBtn) cardBtn.style.display = 'none';
  }
}

// ── State sync helpers (called from events.js input handler) ──

/**
 * Sync a duty title from a live DOM input/textarea into appState.
 * Works for both table view (input) and card view (textarea).
 */
export function syncDutyTitle(dutyId, value) {
  const duty = (appState.dutiesData || []).find(d => d.id === dutyId);
  if (duty) duty.title = value;
}

/**
 * Sync a task text from a live DOM input/textarea into appState.
 */
export function syncTaskText(taskInputId, value) {
  for (const duty of (appState.dutiesData || [])) {
    const task = duty.tasks.find(t => t.inputId === taskInputId);
    if (task) { task.text = value; return; }
  }
}

/**
 * Walk every visible duty/task input OR textarea in the DOM and flush
 * values into appState.dutiesData.  Works for both view modes.
 */
export function syncAllFromDOM() {
  // duty inputs (table) and textareas (card)
  document.querySelectorAll('input[data-duty-id], textarea[data-duty-id]').forEach(el => {
    syncDutyTitle(el.getAttribute('data-duty-id'), el.value);
  });
  // task inputs (table) and textareas (card)
  document.querySelectorAll('input[data-task-id], textarea[data-task-id]').forEach(el => {
    syncTaskText(el.getAttribute('data-task-id'), el.value);
  });
}

// ── Structural mutations (pure state + re-render, NO history) ─

export function addDuty() {
  if (appState.dutyCount === 0) appState.dutiesData = [];
  appState.dutyCount++;
  const dutyId = `duty_${appState.dutyCount}`;
  appState.dutiesData.push({
    id:    dutyId,
    num:   appState.dutyCount,
    title: '',
    tasks: [],
  });
  renderDutiesFromState();
}

export function removeDuty(dutyId) {
  syncAllFromDOM();
  appState.dutiesData = (appState.dutiesData || []).filter(d => d.id !== dutyId);
  renderDutiesFromState();
}

export function addTask(dutyId) {
  if (!appState.taskCounts[dutyId]) appState.taskCounts[dutyId] = 0;
  appState.taskCounts[dutyId]++;
  const n       = appState.taskCounts[dutyId];
  const divId   = `task_${dutyId}_${n}`;
  const inputId = `${dutyId}_${n}`;

  const duty = (appState.dutiesData || []).find(d => d.id === dutyId);
  if (duty) duty.tasks.push({ divId, inputId, num: n, text: '' });

  renderDutiesFromState();
}

export function removeTask(taskDivId) {
  syncAllFromDOM();
  for (const duty of (appState.dutiesData || [])) {
    const idx = duty.tasks.findIndex(t => t.divId === taskDivId);
    if (idx !== -1) { duty.tasks.splice(idx, 1); break; }
  }
  renderDutiesFromState();
}

export function clearDuty(dutyId) {
  if (!confirm('Are you sure you want to clear this duty and all its tasks?')) return;
  syncAllFromDOM();
  const duty = (appState.dutiesData || []).find(d => d.id === dutyId);
  if (duty) { duty.title = ''; duty.tasks = []; }
  appState.taskCounts[dutyId] = 0;
  renderDutiesFromState();
  showStatus('Duty cleared! ✓', 'success');
}

// ── Utility (unchanged public API) ───────────────────────────

export function getTaskCode(taskId) {
  const parts = taskId.split('_');
  if (parts.length >= 3) {
    const dutyLetter = String.fromCharCode(64 + parseInt(parts[1]));
    return `Task ${dutyLetter}${parts[2]}`;
  }
  return '';
}

export function extractDutiesAndTasks() {
  const result = {};
  for (const duty of (appState.dutiesData || [])) {
    const tasks = duty.tasks
      .filter(t => t.text.trim())
      .map(t => ({ id: t.inputId, text: t.text }));
    if (duty.title.trim() || tasks.length > 0) {
      result[duty.id] = { title: duty.title, tasks };
    }
  }
  return result;
}

// ── Private helpers ───────────────────────────────────────────

function _esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
