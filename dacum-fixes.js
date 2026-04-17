/* ============================================================
   dacum-fixes.js  v3.2
   FIX 1: AI card guard (old badge stays hidden)
   FIX 3: PWA Install prompt + button styling
   FIX 5: Version tag
   NOTE:  Hamburger/resize logic is fully owned by dacum-mobile.js
          to avoid double-init conflicts.
   ============================================================ */
(function () {
  'use strict';

  /* ── FIX 5: Version tag ─────────────────────────────────── */
  console.log('%c[DACUM] Running version 3.2', 'color:#667eea;font-weight:700;');

  /* ── FIX 1: AI card guard ───────────────────────────────── */
  window.__USE_NEW_AI_CARD__ = true;

  function _hideOldBadge() {
    var badge = document.getElementById('usageBadge');
    if (badge) badge.style.display = 'none';
  }

  /* ── PWA Install button CSS (injected once) ─────────────── */
  function _injectInstallCSS() {
    if (document.getElementById('dacum-install-styles')) return;
    var s = document.createElement('style');
    s.id = 'dacum-install-styles';
    s.textContent =
      /* Hidden by default — only shown when beforeinstallprompt fires */
      '#dacumInstallBtn { display: none !important; }' +
      '#dacumInstallBtn.dacum-install-visible {' +
        'display:inline-flex!important;' +
        'align-items:center;' +
        'gap:6px;' +
        'background:linear-gradient(135deg,#cba6f7,#89b4fa);' +
        'color:#1e1e2e;' +
        'border:none;' +
        'border-radius:8px;' +
        'padding:6px 13px;' +
        'font-size:0.82em;' +
        'font-weight:700;' +
        'cursor:pointer;' +
        'white-space:nowrap;' +
        'letter-spacing:0.01em;' +
        'box-shadow:0 2px 10px rgba(203,166,247,0.3);' +
        'transition:opacity 0.15s,transform 0.1s;' +
        'flex-shrink:0;' +
      '}' +
      '#dacumInstallBtn.dacum-install-visible:hover{opacity:0.88;}' +
      '#dacumInstallBtn.dacum-install-visible:active{transform:scale(0.96);}' +
      /* On very small screens only show icon, not text */
      '@media (max-width:480px){' +
        '#dacumInstallBtn.dacum-install-visible span.install-label{display:none!important;}' +
      '}';
    document.head.appendChild(s);
  }

  /* ── FIX 3: PWA Install prompt ──────────────────────────── */
  var _deferredPrompt = null;

  function _injectInstallButton() {
    if (document.getElementById('dacumInstallBtn')) return;

    var btn = document.createElement('button');
    btn.id        = 'dacumInstallBtn';
    btn.title     = 'Install DACUM Live Pro as an app';
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"' +
      ' stroke="currentColor" stroke-width="2.5"' +
      ' stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3v13M6 11l6 6 6-6"/>' +
      '<path d="M5 21h14"/></svg>' +
      '<span class="install-label"> Install App</span>';

    /* Safe insertion: try .dtb-right first, then toolbar, then body */
    var target =
      document.querySelector('.dtb-right') ||
      document.getElementById('dacumTopToolbar') ||
      document.body;

    target.appendChild(btn);
    console.log('[PWA] Install button injected into:', target.id || target.className || 'body');

    btn.addEventListener('click', async function () {
      if (!_deferredPrompt) return;
      _deferredPrompt.prompt();
      var result = await _deferredPrompt.userChoice;
      console.log('[PWA] Install choice:', result.outcome);
      _deferredPrompt = null;
      btn.classList.remove('dacum-install-visible');
    });
  }

  function _showInstallButton() {
    _injectInstallCSS();        /* ensure CSS exists before showing */
    _injectInstallButton();
    var btn = document.getElementById('dacumInstallBtn');
    if (btn) btn.classList.add('dacum-install-visible');
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    /* Button may not exist yet if DOM is still loading — defer slightly */
    setTimeout(_showInstallButton, 0);
    console.log('[PWA] Install prompt captured.');
  });

  window.addEventListener('appinstalled', function () {
    _deferredPrompt = null;
    var btn = document.getElementById('dacumInstallBtn');
    if (btn) btn.classList.remove('dacum-install-visible');
    console.log('[PWA] App installed.');
  });

  /* ── SW Version Guardian ───────────────────────────────── */
  // Immediately trigger a SW update check on every page load.
  // This catches cases where the old SW is serving stale files.
  function _forceSWUpdate() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg) {
        reg.update().then(function () {
          console.log('[DACUM] SW update check complete');
          // If a SW is already waiting, activate it immediately
          if (reg.waiting) {
            console.log('[DACUM] SW waiting found — activating');
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }).catch(function () {});
      }
    }).catch(function () {});
  }

  /* ── Bootstrap ─────────────────────────────────────────── */
  function _init() {
    _hideOldBadge();
    _injectInstallCSS();
    _forceSWUpdate();
    /* Sidebar/hamburger handled entirely by dacum-mobile.js */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
