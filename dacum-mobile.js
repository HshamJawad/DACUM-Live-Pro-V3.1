/* ============================================================
   dacum-mobile.js  v8
   Button #btnSidebarToggle is hardcoded in index.html.

   Desktop (>1100px): sidebar push-layout, always starts visible.
                      Toggle uses dps-force-hidden / wrapper class.
   Mobile (≤1100px):  sidebar is hidden on load (translateX -100%).
                      Toggle adds/removes dps-mobile-open.
   ============================================================ */
(function () {
  'use strict';

  if (window.__SIDEBAR_INIT__) return;
  window.__SIDEBAR_INIT__ = true;

  var BREAKPOINT = 1100;

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
      sb.classList.remove('dps-force-hidden');
      var w = document.getElementById('dacumAppWrapper');
      if (w) w.classList.remove('dps-force-hidden-wrapper');
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
      sb.classList.add('dps-force-hidden');
      var w = document.getElementById('dacumAppWrapper');
      if (w) w.classList.add('dps-force-hidden-wrapper');
    }
  }

  /* ── Toggle ─────────────────────────────────────────────── */
  function toggleSidebar() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (!sb) return;
    var isOpen = _isMobile()
      ? sb.classList.contains('dps-mobile-open')
      : !sb.classList.contains('dps-force-hidden');
    isOpen ? closeSidebar() : openSidebar();
  }

  /* ── Set correct initial state ──────────────────────────── */
  function _setInitialState() {
    var sb = document.getElementById('dacumProjectsSidebar');
    if (!sb) return;
    if (_isMobile()) {
      /* Mobile: start HIDDEN — user opens with button */
      sb.classList.remove('dps-mobile-open');
      sb.classList.remove('dps-force-hidden');  /* irrelevant on mobile */
      _backdrop().classList.remove('dps-backdrop-visible');
      document.body.style.overflow = '';
    } else {
      /* Desktop: start VISIBLE */
      sb.classList.remove('dps-mobile-open');
      sb.classList.remove('dps-force-hidden');
      var w = document.getElementById('dacumAppWrapper');
      if (w) w.classList.remove('dps-force-hidden-wrapper');
    }
  }

  /* ── Wire ───────────────────────────────────────────────── */
  var _wired = false;
  function _wire() {
    if (_wired) return;
    _wired = true;

    _setInitialState();

    /* Toggle button (always in HTML) */
    var btn = document.getElementById('btnSidebarToggle');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleSidebar();
      });
    }

    /* Backdrop click */
    _backdrop().addEventListener('click', closeSidebar);

    /* Project card click on mobile → close */
    document.addEventListener('click', function (e) {
      if (!_isMobile()) return;
      if (e.target.closest('.dps-card-body')) setTimeout(closeSidebar, 80);
    });

    /* Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });

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
