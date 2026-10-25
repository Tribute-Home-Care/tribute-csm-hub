/* ===========================================================================
   CSM Hub V2 — phone behaviour
   ---------------------------------------------------------------------------
   Navigation and layout only. This file calls the app's own showPage() and
   moves existing DOM around; it never fetches, never writes, never touches a
   capability, and never decides anything about Viv, LTC, calendar or email.
   If it were deleted the app would still work, just with a desktop sidebar on
   a phone.
   =========================================================================== */
(function () {
  'use strict';

  var MOBILE = window.matchMedia('(max-width: 760px)');
  var STANDALONE = window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;

  if (STANDALONE) document.documentElement.classList.add('v2-standalone');

  /* The four destinations that earn a permanent slot. Chosen from the real
     nav: Home and Client Tracker are where the day is spent, Coverage Notes
     is the shared/handoff surface. Everything else lives behind More, which
     opens the full sidebar rather than a reduced copy of it — so nothing is
     unreachable and there is one source of truth for the menu. */
  var TABS = [
    { page: 'home',     label: 'Home',     icon: '⌂' },
    { page: 'clients',  label: 'Clients',  icon: '◎' },
    { page: 'coverage', label: 'Coverage', icon: '◴' },
    { page: null,       label: 'More',     icon: '≡' }
  ];

  var PAGE_TITLES = {
    home: 'Home', clients: 'Client Tracker', s60: 'Success in 30',
    coverage: 'Coverage Notes', emailcomm: 'Email Community',
    ltc: 'LTC Submissions', md: 'Maryland Compliance', priority: 'Fill Priority',
    assistant: 'Tribute Assistant', kpi: 'KPI Tracker',
    pulse: 'Client Pulse', team: 'Team Overview', comms: 'Communications'
  };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---- drawer ----------------------------------------------------------- */
  function openDrawer()  { document.documentElement.classList.add('v2-drawer-open'); }
  function closeDrawer() { document.documentElement.classList.remove('v2-drawer-open'); }
  function toggleDrawer(){ document.documentElement.classList.toggle('v2-drawer-open'); }

  /* ---- chrome ----------------------------------------------------------- */
  function buildChrome() {
    if (document.querySelector('.v2-tabbar')) return;

    var scrim = el('div', 'v2-scrim');
    scrim.addEventListener('click', closeDrawer);
    document.body.appendChild(scrim);

    var bar = el('nav', 'v2-tabbar');
    bar.setAttribute('aria-label', 'Primary');
    TABS.forEach(function (t) {
      var b = el('button', 'v2-tab',
        '<span class="v2-tab-ico" aria-hidden="true">' + t.icon + '</span><span>' + t.label + '</span>');
      b.type = 'button';
      b.dataset.page = t.page || '';
      b.addEventListener('click', function () {
        if (!t.page) { toggleDrawer(); return; }
        closeDrawer();
        // The app's own navigation. No parallel router.
        if (typeof window.showPage === 'function') window.showPage(t.page);
        syncActive(t.page);
      });
      bar.appendChild(b);
    });
    document.body.appendChild(bar);

    var top = el('header', 'v2-topbar');
    var menu = el('button', 'v2-tb-btn', '≡');
    menu.type = 'button';
    menu.setAttribute('aria-label', 'Menu');
    menu.addEventListener('click', toggleDrawer);
    var title = el('div', 'v2-tb-title', 'Home');
    var who = el('button', 'v2-tb-btn', '<span class="v2-tb-av" id="v2-tb-av"></span>');
    who.type = 'button';
    who.setAttribute('aria-label', 'Profile');
    who.addEventListener('click', function () {
      if (typeof window.switchProfile === 'function') window.switchProfile();
      else openDrawer();
    });
    top.appendChild(menu); top.appendChild(title); top.appendChild(who);

    var main = document.querySelector('.main');
    if (main) main.insertBefore(top, main.firstChild);
  }

  function setTitle(page) {
    var t = document.querySelector('.v2-tb-title');
    if (t) t.textContent = PAGE_TITLES[page] || 'CSM Hub';
  }

  function syncActive(page) {
    document.querySelectorAll('.v2-tab').forEach(function (b) {
      if (b.dataset.page && b.dataset.page === page) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    setTitle(page);
  }

  /* Mirror the initials the sidebar already computed, rather than deriving
     identity here. */
  function syncAvatar() {
    var src = document.getElementById('sb-av');
    var dst = document.getElementById('v2-tb-av');
    if (src && dst) dst.textContent = (src.textContent || '').trim().slice(0, 2);
  }

  /* ---- tables ----------------------------------------------------------- */
  /* Give every cell the label of its column so CSS can render it as a card.
     Runs after the app renders, and is cheap enough to repeat. */
  function cardify(root) {
    (root || document).querySelectorAll('table').forEach(function (tbl) {
      if (tbl.closest('.v2-no-cardify')) return;
      var head = tbl.querySelector('thead tr');
      if (!head) return;
      var labels = [].map.call(head.children, function (th) {
        return (th.textContent || '').trim();
      });
      // Too wide to ever read as a card? Let it scroll on its own instead.
      if (labels.length > 9) {
        if (!tbl.parentElement.classList.contains('v2-scroll-x')) {
          var wrap = el('div', 'v2-scroll-x');
          tbl.parentNode.insertBefore(wrap, tbl); wrap.appendChild(tbl);
        }
        return;
      }
      tbl.classList.add('v2-cardify');
      [].forEach.call(tbl.querySelectorAll('tbody tr'), function (tr) {
        [].forEach.call(tr.children, function (td, i) {
          if (!td.hasAttribute('data-label')) td.setAttribute('data-label', labels[i] || '');
          if (i === 0) td.classList.add('v2-primary');
        });
      });
    });
  }

  /* ---- modals ----------------------------------------------------------- */
  /* Lock the page behind an open sheet so the body does not scroll under it,
     which on iOS is the difference between a sheet and a mess. */
  function watchModals() {
    var mo = document.querySelectorAll('.mo');
    if (!mo.length) return;
    var obs = new MutationObserver(function () {
      var open = [].some.call(document.querySelectorAll('.mo'), function (m) {
        return getComputedStyle(m).display !== 'none';
      });
      document.body.style.overflow = open && MOBILE.matches ? 'hidden' : '';
    });
    [].forEach.call(mo, function (m) {
      obs.observe(m, { attributes: true, attributeFilter: ['style', 'class'] });
    });
  }

  /* ---- wiring ----------------------------------------------------------- */
  function apply() {
    if (!MOBILE.matches) {
      closeDrawer();
      document.body.style.overflow = '';
      return;
    }
    buildChrome();
    syncAvatar();
    cardify(document);
  }

  function hookNavigation() {
    // Wrap the app's showPage so the tab bar and title follow it, whatever
    // triggered the change — tab, drawer, deep link or in-page button.
    var orig = window.showPage;
    if (typeof orig !== 'function' || orig.__v2mobile) return;
    var wrapped = function (page) {
      var r = orig.apply(this, arguments);
      try {
        closeDrawer();
        syncActive(page);
        if (MOBILE.matches) setTimeout(function () { cardify(document); }, 0);
      } catch (e) {}
      return r;
    };
    wrapped.__v2mobile = true;
    window.showPage = wrapped;
  }

  function start() {
    apply();
    hookNavigation();
    watchModals();
    // The app renders asynchronously after sync; re-run the cheap parts.
    var n = 0;
    var t = setInterval(function () {
      if (++n > 20) return clearInterval(t);
      if (MOBILE.matches) { syncAvatar(); cardify(document); }
      hookNavigation();
    }, 1500);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else start();

  MOBILE.addEventListener ? MOBILE.addEventListener('change', apply)
                          : MOBILE.addListener(apply);

  window.TributeMobile = {
    isMobile: function () { return MOBILE.matches; },
    isStandalone: function () { return STANDALONE; },
    openDrawer: openDrawer, closeDrawer: closeDrawer, cardify: cardify
  };
})();
