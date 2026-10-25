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

  // 900px, not 760: between those two widths the desktop rail used to turn
  // into a horizontal scroller that hid destinations off the right edge. One
  // navigation model now covers every width below the desk.
  var MOBILE = window.matchMedia('(max-width: 900px)');
  var STANDALONE = window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;

  if (STANDALONE) document.documentElement.classList.add('v2-standalone');

  /* The four destinations that earn a permanent slot. Chosen from the real
     nav: Home and Client Tracker are where the day is spent, Coverage Notes
     is the shared/handoff surface. Everything else lives behind More, which
     opens the full sidebar rather than a reduced copy of it — so nothing is
     unreachable and there is one source of truth for the menu. */
  function svg(d) {
    return '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      d + '</svg>';
  }
  var TABS = [
    { page: 'home',     label: 'Home',
      icon: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>') },
    { page: 'clients',  label: 'Clients',
      icon: svg('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.2 19.5c.5-3.2 3-5.1 5.8-5.1s5.3 1.9 5.8 5.1"/><path d="M16.5 7.2a3 3 0 0 1 0 5.6"/><path d="M18 19.5c-.2-1.7-.8-3-1.7-3.9"/>') },
    { page: 'coverage', label: 'Coverage',
      icon: svg('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3.5v3M16 3.5v3M3.5 10h17"/>') },
    { page: null,       label: 'More',
      icon: svg('<path d="M4 7h16M4 12h16M4 17h16"/>') }
  ];

  // The same words the rail uses, so the two never disagree about what a
  // place is called.
  var PAGE_TITLES = {
    home: 'Home', clients: 'Clients', s60: 'Success in 30',
    coverage: 'Coverage', emailcomm: 'Community Email',
    ltc: 'LTC', md: 'Maryland Compliance', priority: 'Fill Priority',
    assistant: 'Assistant', kpi: 'KPI Tracker',
    pulse: 'Client Pulse', team: 'Team', comms: 'Communications'
  };

  /* When a client is open the one title bar becomes THEIRS: their name, and a
     way back to the list. A second bar under the first would be 92px of chrome
     before any of the client appeared. */
  var _client = null;

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
        '<span class="v2-tab-ico">' + t.icon + '</span><span>' + t.label + '</span>');
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
    var menu = el('button', 'v2-tb-btn', ICO_MENU);
    menu.type = 'button';
    menu.id = 'v2-tb-lead';
    menu.setAttribute('aria-label', 'Menu');
    menu.addEventListener('click', function () {
      if (_client && window.TributeRedesign) { TributeRedesign.deselect(); return; }
      toggleDrawer();
    });
    var title = el('div', 'v2-tb-title', 'Home');
    // Search comes with us: #rd-top is hidden on a phone, and losing search
    // from a client-heavy app would be a real regression.
    var find = el('button', 'v2-tb-btn',
      svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'));
    find.type = 'button';
    find.setAttribute('aria-label', 'Search');
    find.addEventListener('click', function () {
      var b = document.querySelector('.rd-search-btn');
      if (b) { b.click(); return; }
      if (typeof window.openSearch === 'function') window.openSearch();
    });

    var who = el('button', 'v2-tb-btn', '<span class="v2-tb-av" id="v2-tb-av"></span>');
    who.type = 'button';
    who.setAttribute('aria-label', 'Profile');
    who.addEventListener('click', function () {
      if (typeof window.switchProfile === 'function') window.switchProfile();
      else openDrawer();
    });
    top.appendChild(menu); top.appendChild(title);
    top.appendChild(find); top.appendChild(who);

    var main = document.querySelector('.main');
    if (main) main.insertBefore(top, main.firstChild);
  }

  var ICO_MENU = svg('<path d="M4 7h16M4 12h16M4 17h16"/>');
  var ICO_BACK = svg('<path d="M20 12H5m6-6-6 6 6 6"/>');

  function setTitle(page) {
    var t = document.querySelector('.v2-tb-title');
    if (!t) return;
    t.textContent = _client || PAGE_TITLES[page] || 'CSM Hub';
  }

  function syncClientBar() {
    var lead = document.getElementById('v2-tb-lead');
    document.documentElement.classList.toggle('v2-client', !!_client);
    if (lead) {
      lead.innerHTML = _client ? ICO_BACK : ICO_MENU;
      lead.setAttribute('aria-label', _client ? 'Back to clients' : 'Menu');
    }
    var t = document.querySelector('.v2-tb-title');
    if (t && _client) t.textContent = _client;
  }

  window.addEventListener('tribute:client-selected', function (e) {
    _client = (MOBILE.matches && e.detail && e.detail.name) || null;
    syncClientBar();
    if (!_client) {
      var a = document.querySelector('.v2-tab[aria-current="page"]');
      setTitle(a ? a.dataset.page : 'clients');
    }
  });

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
  // The chrome belongs to the app shell. On the market and profile pickers
  // #app is hidden, and a tab bar floating over a chooser is just confusing.
  function inApp() {
    var app = document.getElementById('app');
    if (!app) return false;
    if (getComputedStyle(app).display === 'none') return false;
    return app.getBoundingClientRect().height > 0;
  }
  function syncShell() {
    document.documentElement.classList.toggle('v2-in-app', MOBILE.matches && inApp());
  }
  function apply() {
    if (!MOBILE.matches) {
      closeDrawer();
      _client = null;
      document.documentElement.classList.remove('v2-in-app', 'v2-client');
      document.body.style.overflow = '';
      return;
    }
    buildChrome();
    syncShell();
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
        if (page !== 'clients') { _client = null; syncClientBar(); }
        syncShell();
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
      if (MOBILE.matches) { syncShell(); syncAvatar(); cardify(document); syncClientBar(); }
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
