/* ================================================================
   dacum-phase1.js  v1.0
   Phase 1 UI Upgrade — ChatGPT-style sidebar layout
   ----------------------------------------------------------------
   WHAT THIS FILE DOES:
     1. Waits for #dacumProjectsSidebar to be injected by app.js
     2. Injects a .dps-head (logo + sidebar-toggle button) at top
     3. Wraps all existing sidebar children in .dps-sidebar-content
     4. Moves .tabs into a vertical-nav section at top of content
     5. Adds "Projects" label above the existing project list area
     6. Adds three-dots menus to each project card (MutationObserver)
     7. Closes all dropdowns on outside-click / Escape

   CRITICAL RULES:
     ✓ Does NOT modify app.js, dacum-mobile.js, or any module
     ✓ Does NOT remove existing event listeners (tabs, cards, etc.)
     ✓ Does NOT change appState or any data structures
     ✓ The invisible #btnSidebarToggle in the toolbar remains the
       source of truth — dacum-mobile.js still wires to it.
       The new .dps-head-toggle physically CLICKS that sentinel.
   ================================================================ */

(function () {
  'use strict';

  if (window.__DPH1_INIT__) return;
  window.__DPH1_INIT__ = true;

  /* ── Helpers ────────────────────────────────────────────────── */

  /** Safely click the invisible sentinel button wired by dacum-mobile.js */
  function _triggerSidebarToggle() {
    var sentinel = document.getElementById('btnSidebarToggle');
    if (sentinel) sentinel.click();
  }

  /* ── STEP 1: Inject sidebar head ─────────────────────────────
     Inserts .dps-head BEFORE all existing sidebar children.
     Idempotent — won't add a second head if called twice.        */
  function injectSidebarHead(sidebar) {
    if (sidebar.querySelector('.dps-head')) return;   /* already done */

    var head = document.createElement('div');
    head.className = 'dps-head';
    head.innerHTML =
      '<span class="dps-head-logo">' +
        '📊 DACUM Live Pro' +
        '<small>Analysis · Verification · CBT</small>' +
      '</span>' +
      '<button class="dps-head-toggle" title="Collapse sidebar" aria-label="Collapse sidebar">' +
        '<svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true">' +
          '<rect x="2" y="3.5"  width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
          '<rect x="2" y="8.1"  width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
          '<rect x="2" y="12.7" width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
        '</svg>' +
      '</button>';

    /* Wire the visual toggle button → invisible sentinel */
    var btn = head.querySelector('.dps-head-toggle');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      _triggerSidebarToggle();
    });

    sidebar.insertBefore(head, sidebar.firstChild);
  }

  /* ── STEP 2: Wrap existing sidebar body in .dps-sidebar-content
     Creates a single scrollable flex-child that holds everything
     under the fixed head.
     Idempotent.                                                   */
  function wrapSidebarContent(sidebar) {
    if (sidebar.querySelector('.dps-sidebar-content')) return;

    /* Collect all children EXCEPT the head we just added */
    var children = Array.prototype.slice.call(sidebar.children).filter(function (c) {
      return !c.classList.contains('dps-head');
    });

    var wrap = document.createElement('div');
    wrap.className = 'dps-sidebar-content';

    children.forEach(function (c) { wrap.appendChild(c); });
    sidebar.appendChild(wrap);
  }

  /* ── STEP 3: Move .tabs into sidebar nav section ─────────────
     Finds .tabs in the main document, wraps it in a
     .dps-nav-section with a label, and prepends it to
     .dps-sidebar-content.
     Moving DOM nodes preserves all attached event listeners.
     Idempotent.                                                   */
  function moveTabs(sidebar) {
    var content = sidebar.querySelector('.dps-sidebar-content');
    if (!content) return;
    if (content.querySelector('.dps-nav-section')) return;  /* already done */

    var tabs = document.querySelector('.container .tabs');
    if (!tabs) return;

    /* Build the nav wrapper */
    var navSection = document.createElement('div');
    navSection.className = 'dps-nav-section';

    var navLabel = document.createElement('div');
    navLabel.className = 'dps-nav-label';
    navLabel.textContent = 'Navigation';

    navSection.appendChild(navLabel);
    navSection.appendChild(tabs);   /* move the live DOM node */

    content.insertBefore(navSection, content.firstChild);
  }

  /* ── STEP 4: Insert "Projects" label above the project list ──
     Idempotent.                                                   */
  function injectProjectsLabel(sidebar) {
    var content = sidebar.querySelector('.dps-sidebar-content');
    if (!content) return;
    if (content.querySelector('.dps-projects-label')) return;

    /* The nav section is first; insert the label right after it */
    var navSection = content.querySelector('.dps-nav-section');
    var label = document.createElement('div');
    label.className = 'dps-projects-label';
    label.textContent = 'Projects';

    if (navSection && navSection.nextSibling) {
      content.insertBefore(label, navSection.nextSibling);
    } else {
      content.appendChild(label);
    }
  }

  /* ── STEP 5: Inject pencil (rename) + delete buttons into each card ──
     Matches the original card design: two stacked icon buttons top-right.
     Pencil → makes title contenteditable; blur or Enter commits.
     Delete → delegates to hidden native delete button (preserves logic).
     Idempotent.                                                          */

  function _findCardId(card) {
    return card.dataset.projectId ||
           card.dataset.id ||
           card.getAttribute('data-project-id') ||
           null;
  }

  function _findBtn(root, keywords) {
    var btns = root.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].closest('.dps-card-actions-wrap')) continue;
      var t = (btns[i].textContent + ' ' + (btns[i].title || '')).toLowerCase();
      for (var k = 0; k < keywords.length; k++) {
        if (t.indexOf(keywords[k]) !== -1) return btns[i];
      }
    }
    return null;
  }

  function _hideNativeActions(card) {
    var cached = { rename: null, delete: null };
    cached.rename = _findBtn(card, ['rename', 'edit', '✏']);
    cached.delete = _findBtn(card, ['delete', 'remove', '🗑', '✕', '×', 'trash']);

    var actionSelectors = [
      '.dps-card-actions', '.dps-card-footer', '.dps-card-btns',
      '.dps-card-controls', '.dps-card-buttons', '.dps-card-action-row',
      '.dps-btn-row', '[class*="card-action"]', '[class*="card-btn"]',
      '[class*="card-control"]', '[class*="card-footer"]'
    ];
    actionSelectors.forEach(function (sel) {
      card.querySelectorAll(sel).forEach(function (el) { el.style.display = 'none'; });
    });

    var cardBody = card.querySelector('.dps-card-body') || card;
    cardBody.querySelectorAll('button').forEach(function (btn) {
      if (btn.closest('.dps-card-actions-wrap')) return;
      btn.style.display = 'none';
    });
    return cached;
  }

  /* ── Inline rename: make title editable, commit on blur/Enter ── */
  function _startInlineRename(card, projectId, cachedBtn) {
    var nameEl =
      card.querySelector('.dps-card-name') ||
      card.querySelector('.dps-project-name') ||
      card.querySelector('[class*="card-title"]') ||
      card.querySelector('[class*="project-name"]') ||
      card.querySelector('[class*="card-name"]');

    if (!nameEl) {
      /* Fallback: native button or global */
      if (cachedBtn) { cachedBtn.click(); return; }
      if (typeof window.renameProject === 'function') {
        var cur2 = '';
        var next2 = window.prompt('Rename project:', cur2);
        if (next2 && next2.trim()) window.renameProject(projectId, next2.trim());
      }
      return;
    }

    if (nameEl.getAttribute('contenteditable') === 'true') return; /* already editing */

    var original = nameEl.textContent.trim();
    nameEl.setAttribute('contenteditable', 'true');
    nameEl.classList.add('dps-title-editing');
    nameEl.focus();

    /* Select all text */
    var range = document.createRange();
    range.selectNodeContents(nameEl);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    function _commit() {
      var newName = nameEl.textContent.trim();
      nameEl.setAttribute('contenteditable', 'false');
      nameEl.classList.remove('dps-title-editing');
      if (!newName) { nameEl.textContent = original; return; }
      if (newName === original) return;

      /* Prefer global module function */
      if (typeof window.renameProject === 'function') {
        window.renameProject(projectId, newName);
      } else if (cachedBtn) {
        /* Restore original text and let native handler take over */
        nameEl.textContent = original;
        cachedBtn.click();
      }
    }

    function _onKey(e) {
      if (e.key === 'Enter') { e.preventDefault(); _commit(); nameEl.removeEventListener('keydown', _onKey); }
      if (e.key === 'Escape') {
        nameEl.textContent = original;
        nameEl.setAttribute('contenteditable', 'false');
        nameEl.classList.remove('dps-title-editing');
        nameEl.removeEventListener('keydown', _onKey);
      }
    }

    nameEl.addEventListener('keydown', _onKey);
    nameEl.addEventListener('blur', function _onBlur() {
      nameEl.removeEventListener('keydown', _onKey);
      nameEl.removeEventListener('blur', _onBlur);
      _commit();
    });

    /* Stop click-on-card from triggering project open while editing */
    nameEl.addEventListener('click', function(e) { e.stopPropagation(); }, { once: true });
  }

  function _doDelete(card, projectId, cachedBtn) {
    if (cachedBtn) { cachedBtn.click(); return; }
    if (typeof window.deleteProject === 'function') {
      if (window.confirm('Delete this project? This cannot be undone.')) {
        window.deleteProject(projectId);
      }
      return;
    }
    var btn = _findBtn(card, ['delete', 'remove', '🗑', '✕', 'trash']);
    if (btn) btn.click();
  }

  function injectCardActions(card) {
    if (card.querySelector('.dps-card-actions-wrap')) return; /* idempotent */
    if (!card.closest('#dacumProjectsSidebar')) return;

    var projectId = _findCardId(card);
    var cached = _hideNativeActions(card);

    /* ── Wrapper: two buttons stacked ── */
    var wrap = document.createElement('div');
    wrap.className = 'dps-card-actions-wrap';

    /* Pencil button */
    var pencilBtn = document.createElement('button');
    pencilBtn.className = 'dps-card-btn dps-card-btn-rename';
    pencilBtn.title = 'Rename project';
    pencilBtn.setAttribute('aria-label', 'Rename project');
    pencilBtn.innerHTML = '✏️';

    /* Delete button */
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'dps-card-btn dps-card-btn-delete';
    deleteBtn.title = 'Delete project';
    deleteBtn.setAttribute('aria-label', 'Delete project');
    deleteBtn.innerHTML = '✕';

    wrap.appendChild(pencilBtn);
    wrap.appendChild(deleteBtn);

    pencilBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _startInlineRename(card, projectId, cached.rename);
    });

    deleteBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      _doDelete(card, projectId, cached.delete);
    });

    /* Attach to card body */
    var host = card.querySelector('.dps-card-body') || card;
    if (window.getComputedStyle(host).position === 'static') {
      host.style.position = 'relative';
    }
    host.appendChild(wrap);
  }

  /* ── STEP 6: Observe project list for new cards ── */
  function observeProjectCards(sidebar) {
    sidebar.querySelectorAll('.dps-card, [data-project-id], [data-id]').forEach(injectCardActions);

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList.contains('dps-card') || node.dataset.projectId || node.dataset.id) {
            injectCardActions(node);
          }
          node.querySelectorAll('.dps-card, [data-project-id], [data-id]').forEach(injectCardActions);
        });
      });
    });

    observer.observe(sidebar, { childList: true, subtree: true });
  }

  /* ── STEP 7: Sync toolbar class for re-open button fallback ──
     Browsers that don't support :has() need a class on the toolbar
     to show #btnReopenSidebar. We watch the sidebar's classList
     for dps-force-hidden and mirror it as .sidebar-is-hidden on
     #dacumTopToolbar.                                             */
  function observeCollapsedState(sidebar) {
    var toolbar = document.getElementById('dacumTopToolbar');
    if (!toolbar) return;

    function _sync() {
      var hidden = sidebar.classList.contains('dps-force-hidden');
      toolbar.classList.toggle('sidebar-is-hidden', hidden);
    }

    _sync(); /* initial */

    new MutationObserver(_sync).observe(sidebar, {
      attributes: true,
      attributeFilter: ['class']
    });
  }

  /* ── Main init: run all steps once sidebar is in DOM ─────────── */
  function _init(sidebar) {
    injectSidebarHead(sidebar);
    wrapSidebarContent(sidebar);
    moveTabs(sidebar);
    injectProjectsLabel(sidebar);
    observeProjectCards(sidebar);
    observeCollapsedState(sidebar);   /* Step 7: toolbar re-open button sync */
  }

  /* ── Bootstrap ───────────────────────────────────────────────── */
  function _boot() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (sb) { _init(sb); return; }

    /* Poll — sidebar is injected async by app.js module */
    var _n = 0;
    var _poll = setInterval(function () {
      _n++;
      var found = document.getElementById('dacumProjectsSidebar');
      if (found || _n > 100) {
        clearInterval(_poll);
        if (found) _init(found);
      }
    }, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

})();
