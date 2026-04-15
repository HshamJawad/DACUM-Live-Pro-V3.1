/* ============================================================
   dacum-mobile.js  v9
   Button #btnSidebarToggle is hardcoded in index.html.

   Desktop (>1100px): sidebar push-layout, always starts visible.
                      Toggle uses dps-collapsed / dps-is-collapsed (68px rail).
   Mobile (≤1100px):  sidebar is hidden on load (translateX -100%).
                      Toggle adds/removes dps-mobile-open.
   ============================================================ */
(function () {
  'use strict';

  if (window.__SIDEBAR_INIT__) return;
  window.__SIDEBAR_INIT__ = true;

  var BREAKPOINT = 1100;

  /* ── Inject supplemental CSS ────────────────────────────── */
  function _injectMobileCSS() {
    if (document.getElementById('dps-mobile-styles')) return;
    var s = document.createElement('style');
    s.id = 'dps-mobile-styles';
    s.textContent =
      /* Show toolbar toggle button on mobile only */
      '@media (max-width:1100px){' +
        '#btnSidebarToggle{' +
          'display:inline-flex!important;' +
          'align-items:center;justify-content:center;' +
          'background:transparent;' +
          'border:1.5px solid rgba(255,255,255,0.18);' +
          'border-radius:8px;' +
          'padding:7px 9px;cursor:pointer;color:#e2e8f0;' +
          'transition:background 0.15s;' +
        '}' +
        '#btnSidebarToggle:hover{background:rgba(255,255,255,0.1);}' +
      '}' +
      /* Scroll fix: projects list must always be scrollable */
      '.dps-projects-section{overflow:hidden!important;flex:1;min-height:0;display:flex;flex-direction:column;}' +
      '.dps-list{flex:1;min-height:0;overflow-y:auto!important;overflow-x:hidden;}' +
      /* Smooth transitions */
      '.dps-sidebar{transition:width 0.25s cubic-bezier(.4,0,.2,1)!important;}' +
      '@media (max-width:1100px){' +
        '.dps-sidebar{transition:transform 0.28s cubic-bezier(.4,0,.2,1)!important;}' +
      '}';
    document.head.appendChild(s);
  }

  /* ── Set hamburger icon on toolbar toggle button ────────── */
  function _setToggleIcon() {
    var btn = document.getElementById('btnSidebarToggle');
    if (!btn || btn.querySelector('svg')) return;
    btn.innerHTML =
      '<svg viewBox="0 0 18 18" width="16" height="16" fill="none" aria-hidden="true">' +
        '<rect x="2" y="3.5"  width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
        '<rect x="2" y="8.1"  width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
        '<rect x="2" y="12.7" width="14" height="1.8" rx="0.9" fill="currentColor"/>' +
      '</svg>';
  }

  /* ── Backdrop ───────────────────────────────────────────── */
  function _backdrop() {
    var el = document.getElementById('dpsMobileBackdrop');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dpsMobileBackdrop';
      document.body.appendChild(el);
    }
    return el;
  }

  function _isMobile() { return window.innerWidth <= BREAKPOINT; }

  /* ── Open ───────────────────────────────────────────────── */
  function openSidebar() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (!sb) return;
    if (_isMobile()) {
      sb.classList.add('dps-mobile-open');
      _backdrop().classList.add('dps-backdrop-visible');
      document.body.style.overflow = 'hidden';
    } else {
      /* Desktop: uncollapse from 68px icon rail → 260px */
      sb.classList.remove('dps-collapsed');
      var w = document.getElementById('dacumAppWrapper');
      if (w) w.classList.remove('dps-is-collapsed');
      try { localStorage.setItem('dps_sidebar_collapsed', '0'); } catch(e) {}
    }
  }

  /* ── Close ──────────────────────────────────────────────── */
  function closeSidebar() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (!sb) return;
    if (_isMobile()) {
      sb.classList.remove('dps-mobile-open');
      _backdrop().classList.remove('dps-backdrop-visible');
      document.body.style.overflow = '';
    } else {
      /* Desktop: collapse to 68px icon rail */
      sb.classList.add('dps-collapsed');
      var w = document.getElementById('dacumAppWrapper');
      if (w) w.classList.add('dps-is-collapsed');
      try { localStorage.setItem('dps_sidebar_collapsed', '1'); } catch(e) {}
    }
  }

  /* ── Toggle ─────────────────────────────────────────────── */
  function toggleSidebar() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (!sb) return;
    var isOpen = _isMobile()
      ? sb.classList.contains('dps-mobile-open')
      : !sb.classList.contains('dps-collapsed');   /* updated: 68px rail check */
    isOpen ? closeSidebar() : openSidebar();
  }

  /* ── Set correct initial state ──────────────────────────── */
  function _setInitialState() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (!sb) return;
    var w = document.getElementById('dacumAppWrapper');
    if (_isMobile()) {
      /* Mobile: sidebar hidden off-screen; strip desktop-only classes */
      sb.classList.remove('dps-mobile-open');
      sb.classList.remove('dps-force-hidden');   /* irrelevant on mobile */
      sb.classList.remove('dps-collapsed');       /* no icon rail on mobile */
      _backdrop().classList.remove('dps-backdrop-visible');
      document.body.style.overflow = '';
      if (w) { w.classList.remove('dps-force-hidden-wrapper'); w.classList.remove('dps-is-collapsed'); }
    } else {
      /* Desktop: strip mobile-only classes, restore persisted collapse state */
      sb.classList.remove('dps-mobile-open');
      sb.classList.remove('dps-force-hidden');
      _backdrop().classList.remove('dps-backdrop-visible');
      document.body.style.overflow = '';
      if (w) w.classList.remove('dps-force-hidden-wrapper');
      try {
        var wasCollapsed = localStorage.getItem('dps_sidebar_collapsed') === '1';
        sb.classList.toggle('dps-collapsed', wasCollapsed);
        if (w) w.classList.toggle('dps-is-collapsed', wasCollapsed);
      } catch(e) {
        sb.classList.remove('dps-collapsed');
        if (w) w.classList.remove('dps-is-collapsed');
      }
    }
  }

  /* ── Swipe support (mobile open/close) ─────────────────── */
  function _addSwipe() {
    var _tx = null, _ty = null;

    document.addEventListener('touchstart', function (e) {
      if (!_isMobile()) return;
      var t = e.touches[0];
      _tx = t.clientX;
      _ty = t.clientY;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
      if (!_isMobile() || _tx === null) return;
      var t   = e.changedTouches[0];
      var dx  = t.clientX - _tx;
      var dy  = t.clientY - _ty;
      var startX = _tx;
      _tx = null; _ty = null;

      /* Ignore primarily-vertical swipes */
      if (Math.abs(dy) > Math.abs(dx)) return;
      /* Require at least 50 px horizontal travel */
      if (Math.abs(dx) < 50) return;

      var sb = document.getElementById('dacumProjectsSidebar');
      if (!sb) return;
      var isOpen = sb.classList.contains('dps-mobile-open');

      if (dx > 0 && !isOpen && startX <= 30) {
        /* Swipe-right from left edge → open */
        openSidebar();
      } else if (dx < 0 && isOpen) {
        /* Swipe-left while open → close */
        closeSidebar();
      }
    }, { passive: true });
  }

  /* ── Wire ───────────────────────────────────────────────── */
  var _wired = false;
  function _wire() {
    if (_wired) return;
    _wired = true;

    _injectMobileCSS();
    _setToggleIcon();
    _setInitialState();

    /* Toggle button (toolbar — visible on mobile via injected CSS) */
    var btn = document.getElementById('btnSidebarToggle');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSidebar();
      });
    }

    /* Backdrop click */
    _backdrop().addEventListener('click', closeSidebar);

    /* Project card click on mobile → close sidebar */
    document.addEventListener('click', function (e) {
      if (!_isMobile()) return;
      if (e.target.closest('.dps-card-body')) setTimeout(closeSidebar, 80);
    });

    /* Nav item click on mobile → close sidebar after tab switches */
    document.addEventListener('click', function (e) {
      if (!_isMobile()) return;
      if (e.target.closest('.dps-nav-item[data-target-tab]')) setTimeout(closeSidebar, 120);
    });

    /* Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

    /* Touch swipe */
    _addSwipe();

    /* Resize: re-apply correct initial state when crossing breakpoint */
    var _rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(_rt);
      _rt = setTimeout(_setInitialState, 150);
    });
  }

  /* ── Bootstrap ──────────────────────────────────────────── */
  function _boot() {
    if (document.getElementById('dacumProjectsSidebar')) { _wire(); return; }
    var _n = 0;
    var _p = setInterval(function () {
      _n++;
      if (document.getElementById('dacumProjectsSidebar') || _n > 60) {
        clearInterval(_p);
        _wire();
      }
    }, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

})();
