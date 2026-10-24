/* ═══════════════════════════════════════════════════════════════════════════
   TRIBUTE CSM HUB — REDESIGN BEHAVIOUR LAYER  (pass 2)
   ═══════════════════════════════════════════════════════════════════════════
   Reads application state through window.TributeApp (prototype/bridge.js)
   rather than indirect eval. Overrides exactly one renderer — the Client
   Tracker list — and otherwise only decorates what the application already
   drew.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1. UTILITIES ─────────────────────────────────────────────────────── */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const A = () => window.TributeApp || { fn: {} };
  const I = (n, c) => (window.TributeIcons ? window.TributeIcons.svg(n, c) : '');
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const DAY = 864e5;
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const daysSince = (d) => (d ? Math.floor((new Date(todayISO() + 'T12:00:00') - new Date(String(d).slice(0, 10) + 'T12:00:00')) / DAY) : null);
  const fmtShort = (d) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  /* ── 2. NAVIGATION RAIL ───────────────────────────────────────────────── */
  // The rail is where symbols earn the most: a dozen destinations scanned
  // dozens of times a day, where the mark is the landmark and the word is
  // the confirmation. Every one is a domain symbol, not a library lookup.
  const NAV_ICON = {
    home: 'home', priority: 'fill', clients: 'client', pulse: 'pulse',
    s60: 'onboarding', ltc: 'ltc', md: 'compliance', coverage: 'coverage',
    emailcomm: 'communication', assistant: 'sparkle', expectations: 'flag',
    kpi: 'chart', team: 'team', comms: 'conversation'
  };

  /* Card headings, curated. NOT every heading: the brief is right that an
     icon beside every label turns them all into decoration and none of them
     into a landmark. These are the recurring domain concepts whose cards a
     CSM hunts for on a crowded page. Everything else — To-Do, Quick Notes,
     1:1 Notes, the Home section headings — stays text, and that restraint is
     what makes these few read. */
  const HEADING_ICON = [
    [/upcoming .*visits?/i, 'visit'],
    [/open visits?/i, 'fill'],
    [/change of condition/i, 'pulse'],
    [/care conversations?/i, 'conversation'],
    [/community tracker|communities/i, 'community'],
    [/ltc (insurance )?records?/i, 'ltc'],
    [/required milestones/i, 'onboarding'],
    [/team coverage|handoffs?/i, 'coverage']
  ];
  function markHeadings() {
    $$('.ct').forEach(function (el) {
      if (el.dataset.rdSym) return;
      el.dataset.rdSym = '1';
      const t = (el.textContent || '').trim();
      for (let i = 0; i < HEADING_ICON.length; i++) {
        if (HEADING_ICON[i][0].test(t)) {
          const sp = document.createElement('span');
          sp.className = 'ct-sym ti-skip';
          sp.innerHTML = I(HEADING_ICON[i][1]);
          el.prepend(sp);
          return;
        }
      }
    });
  }
  const GROUPS = [
    ['Today', [['home', 'Home'], ['priority', 'Fill Priority']]],
    ['Clients', [['clients', 'Client Tracker'], ['pulse', 'Client Pulse'], ['s60', 'Success in 30']]],
    ['Operations', [['ltc', 'LTC Submissions'], ['md', 'Maryland Compliance']]],
    ['Relationships', [['coverage', 'Coverage & Communities'], ['emailcomm', 'Email Community']]],
    ['Knowledge', [['assistant', 'Tribute Assistant'], ['expectations', 'Role Expectations'], ['kpi', 'KPI Tracker']]],
    ['Team', [['team', 'Team Overview']]]
  ];
  const NAV_ID = { pulse: 'nav-pulse', team: 'nav-team', md: 'nav-md' };

  function rebuildNav() {
    const navEl = $('.sb-nav');
    if (!navEl || navEl.dataset.rd) return;
    const original = {};
    $$('.nav-item', navEl).forEach((el) => {
      const m = /showPage\('([a-z0-9]+)'/.exec(el.getAttribute('onclick') || '');
      if (m) original[m[1]] = el;
    });
    const mgrSec = $('#mgr-sec', navEl);
    const frag = document.createDocumentFragment();

    GROUPS.forEach(function (g) {
      const title = g[0], items = g[1];
      const present = items.filter(function (it) { return original[it[0]] || it[0] === 'expectations'; });
      if (!present.length) return;
      if (title === 'Team' && mgrSec) { mgrSec.textContent = 'Team'; frag.appendChild(mgrSec); }
      else { const h = document.createElement('div'); h.className = 'nav-sec'; h.textContent = title; frag.appendChild(h); }

      present.forEach(function (it) {
        const key = it[0], label = it[1];
        let el = original[key];
        if (!el) {
          // Role Expectations: page, renderer and showPage route all exist in
          // production with nothing pointing at them. Restored, not invented.
          el = document.createElement('div');
          el.className = 'nav-item';
          el.setAttribute('onclick', "showPage('" + key + "',this)");
          el.dataset.rdRestored = '1';
        }
        let icon = $('.nav-icon', el);
        if (!icon) { icon = document.createElement('span'); icon.className = 'nav-icon'; el.prepend(icon); }
        icon.innerHTML = I(NAV_ICON[key] || 'circle');
        Array.from(el.childNodes).forEach(function (n) { if (n.nodeType === 3) n.remove(); });
        if (!$('.nav-label', el)) {
          const lab = document.createElement('span');
          lab.className = 'nav-label'; lab.textContent = label; el.appendChild(lab);
        }
        if (!$('.nav-cnt', el)) {
          const cnt = document.createElement('span');
          cnt.className = 'nav-cnt'; cnt.id = 'rdc-' + key; el.appendChild(cnt);
        }
        if (NAV_ID[key] && !el.id) el.id = NAV_ID[key];
        el.dataset.page = key;
        frag.appendChild(el);
      });
    });
    navEl.innerHTML = '';
    navEl.appendChild(frag);
    navEl.dataset.rd = '1';
  }

  /* Permission reveal happens AFTER the rail is built, so grouping can only
     be judged once. Measured for a CSM: ten destinations under SIX headings,
     one of them ("Team") with nothing under it at all and one ("Operations")
     with a single item. Six headings to scan ten things is the navigation
     telling you about itself.

     Two rules, applied to what is actually visible:
       - a heading with no visible items is not a heading
       - a group of one is not a group; it joins the one above it

     A director, who can see Maryland Compliance and Team Overview, keeps
     every group — the structure earns itself there, and nothing is
     hard-coded per role. */
  function tidyNav() {
    const navEl = $('.sb-nav');
    if (!navEl || !navEl.dataset.rd) return;
    const kids = Array.from(navEl.children);
    const groups = [];
    kids.forEach(function (el) {
      if (el.classList.contains('nav-sec')) groups.push({ head: el, items: [] });
      else if (groups.length) groups[groups.length - 1].items.push(el);
    });
    const shown = function (el) { return el.offsetParent !== null || el.style.display === ''; };
    const key = groups.map(function (g) {
      return g.head.textContent + ':' + g.items.filter(shown).length;
    }).join('|');
    if (key === tidyNav._key) return;
    tidyNav._key = key;

    let prev = null;
    groups.forEach(function (g) {
      const live = g.items.filter(shown);
      g.head.style.display = '';
      if (!live.length) { g.head.style.display = 'none'; return; }
      // "Team" is exempt. It is not an organising convenience, it is a
      // permission boundary — the one group a CSM cannot see — and folding
      // "Team Overview" up under "Knowledge" would read as a knowledge
      // article rather than as somebody else's caseload.
      const exempt = /^team$/i.test((g.head.textContent || '').trim());
      if (live.length === 1 && prev && !exempt) { g.head.style.display = 'none'; }
      else prev = g;
    });
  }

  /* ── 3. TOP BAR ───────────────────────────────────────────────────────── */
  function mountTop() {
    const main = $('.main');
    if (!main || $('#rd-top')) return;
    const bar = document.createElement('div');
    bar.id = 'rd-top';
    bar.innerHTML =
      '<div class="rd-top-in">' +
      '<div class="rd-h1" id="rd-title">Home</div>' +
      '<button type="button" class="rd-search-btn" id="rd-search-open">' + I('search') +
      '<span>Search</span><kbd>⌘K</kbd></button>' +
      '<div class="rd-ctx" id="rd-ctx"></div></div>';
    main.prepend(bar);
    window.addEventListener('scroll', function () { bar.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
    $('#rd-search-open').addEventListener('click', openPalette);
  }

  function refreshTop() {
    const t = $('#rd-title');
    const active = $('.nav-item.active .nav-label') || $('.nav-item.active');
    if (t && active) {
      const v = (active.textContent || '').trim();
      if (v && t.textContent !== v) t.textContent = v;
    }
    const ctx = $('#rd-ctx');
    if (!ctx) return;
    const bits = [];
    const app = A(), p = app.profile, data = app.data;
    if (p && p.market) bits.push('<b>' + esc(p.market) + '</b>');
    const gen = data && data.shared && data.shared.viv && data.shared.viv.generatedAt;
    if (gen) {
      const hrs = (Date.now() - new Date(gen).getTime()) / 36e5;
      const label = hrs < 1 ? 'just now' : hrs < 24 ? Math.round(hrs) + 'h ago' : Math.round(hrs / 24) + 'd ago';
      bits.push('<span class="' + (hrs > 36 ? 'stale' : '') + '">Synced ' + label + '</span>');
    }
    const html = bits.join('<span class="sep"></span>');
    if (ctx.innerHTML !== html) ctx.innerHTML = html;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     4. CLIENT TRACKER  —  split view
     ═══════════════════════════════════════════════════════════════════════
     Pass 2 fixed the ROW. It did not fix the INTERACTION. Opening a client
     pushed a 575px record into the list: 165 words, 18 buttons, 14 bordered
     boxes and 8 uppercase labels, with the next client shoved off screen so
     the user saw list context and a full record competing for the same eye.

     The record is no longer inline. Selecting a client fills a workspace
     beside the list, and the list never changes height. Five areas, one
     visible at a time:

       Overview        what is true right now, and nothing else
       Care            Pulse, baseline, care plan, care conversations
       Schedule        next and recent visits, open visits
       Communication   touchpoints, contact, preferences, draft update
       More            LTC, coverage, fill priority, administrative fields

     Overview is a summary, not a database dump. Type, start of care, email,
     CSM, birthday and fill score all moved behind "View full details".
     Community shows the name and one contact; the rest lives in the
     Community entity rather than being duplicated into every client.

     ACTIONS. Seven competing buttons became one primary and one overflow:
       [Log activity ▾]  →  Visit · Touchpoint · Care conversation
       [•••]             →  Edit client · Fill priority · Draft update ·
                            Add LTC record · View community
     Every one of those calls the application's own function. Nothing moved
     out of the product; it moved out of the way.

     COMPATIBILITY. The application writes into `cm-det-body-<id>` (setPulseAck
     re-renders through it) and reads `cm-det-<id>`. Both still exist, in a
     hidden container, so every existing code path still lands somewhere real.
     ═══════════════════════════════════════════════════════════════════════ */
  const VIEWS = [
    ['attention', 'Needs attention'],
    ['soon', 'Due soon'],
    ['all', 'All clients'],
    ['onboarding', 'Onboarding'],
    ['coverage', 'Coverage']
  ];
  let _view = 'attention';
  let _selected = null;
  let _section = 'overview';
  let _showAdmin = false;

  function visitSt(c) {
    if (c.freq === 'NA') return 'none';
    const cad = parseInt(c.freq) || 90;
    const d = daysSince(c.lastVisit);
    if (d === null) return 'never';
    if (d > cad) return 'overdue';
    if (d > cad - 14) return 'soon';
    return 'ok';
  }
  function rowsFor(key, cid) {
    try {
      return (A().fn.get(key) || []).filter(function (x) { return x.clientId === cid; })
        .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    } catch (e) { return []; }
  }
  function lastOf(key, cid) { const r = rowsFor(key, cid); return r.length ? r[0].date : null; }
  function tpSt(c) {
    const cad = (A().tpCadence || {})[c.tier] || 30;
    const d = daysSince(lastOf('touchpoints', c.id));
    if (d === null) return 'never';
    if (d > cad) return 'overdue';
    if (d > cad - 7) return 'soon';
    return 'ok';
  }
  function ciSt(c) {
    const cad = (A().ciCadence || {})[c.tier] || 180;
    const d = daysSince(lastOf('checkins', c.id));
    if (d === null) return 'never';
    if (d > cad) return 'overdue';
    if (d > cad - 30) return 'soon';
    return 'ok';
  }
  function nextVisit(c) {
    try { const d = A().fn.nextDue(c.lastVisit, c.freq); return d ? d.toISOString().slice(0, 10) : null; }
    catch (e) { return null; }
  }

  function exceptionFor(c) {
    const vst = String(c.vivStatus || '').toLowerCase();
    if (vst && vst !== 'active') {
      const label = { 'pending-discharge': 'Pending discharge', 'onhold': 'On hold', 'on-hold': 'On hold', 'processing': 'Processing' }[vst]
        || (vst.indexOf('hospital') > -1 ? 'In hospital' : vst.indexOf('facility') > -1 ? 'In facility' : c.vivStatus);
      return { tone: 'bad', text: label + (c.vivDischarged ? ' · ' + fmtShort(c.vivDischarged) : ''), rank: 0 };
    }
    const vs = visitSt(c), ts = tpSt(c), cs = ciSt(c);
    if (vs === 'never') return { tone: 'bad', text: 'No visit on record', rank: 1 };
    if (vs === 'overdue') return { tone: 'bad', text: 'Visit overdue ' + plural(daysSince(c.lastVisit) - (parseInt(c.freq) || 90), 'day'), rank: 2 };
    if (ts === 'overdue') return { tone: 'bad', text: 'Touchpoint overdue ' + plural(daysSince(lastOf('touchpoints', c.id)) - ((A().tpCadence || {})[c.tier] || 30), 'day'), rank: 3 };
    if (ts === 'never') return { tone: 'warn', text: 'No touchpoint on record', rank: 4 };
    if (cs === 'overdue') return { tone: 'warn', text: 'Care conversation overdue', rank: 5 };
    if (vs === 'soon') return { tone: 'warn', text: 'Visit due ' + fmtShort(nextVisit(c)), rank: 6 };
    if (ts === 'soon') return { tone: 'warn', text: 'Touchpoint due soon', rank: 7 };
    if (cs === 'soon') return { tone: 'warn', text: 'Care conversation due soon', rank: 8 };
    return null;
  }

  function trackerRows() {
    const app = A();
    let clients = app.fn.get('clients') || [];
    const p = app.profile;
    if (p && p.dualMarket && app.juliaMarket !== 'all') {
      clients = clients.filter(function (c) { return (c.market || 'Massachusetts') === app.juliaMarket; });
    }
    const qEl = $('#cm-search'), tEl = $('#cm-tier'), sEl = $('#cm-status');
    const q = (qEl ? qEl.value : '').toLowerCase().trim();
    const tf = tEl ? tEl.value : '';
    const sf = sEl ? sEl.value : '';
    let list = clients.map(function (c) { return { c: c, ex: exceptionFor(c) }; });
    if (q) list = list.filter(function (r) {
      return ((r.c.name || '') + ' ' + (r.c.loc || '') + ' ' + (r.c.city || '') + ' ' + (r.c.notes || '')).toLowerCase().indexOf(q) > -1;
    });
    if (tf) list = list.filter(function (r) { return r.c.tier === tf; });
    if (sf === 'overdue') list = list.filter(function (r) { return r.ex && r.ex.tone === 'bad'; });
    else if (sf === 'due_soon') list = list.filter(function (r) { return !!r.ex; });
    if (_view === 'attention') list = list.filter(function (r) { return !!r.ex; });
    else if (_view === 'soon') list = list.filter(function (r) { return r.ex && r.ex.tone === 'warn'; });
    else if (_view === 'onboarding') list = list.filter(function (r) { return r.c.startDate && (daysSince(r.c.startDate) || 999) <= 30; });
    else if (_view === 'coverage') list = list.filter(function (r) { return !!r.c.vacation; });
    list.sort(function (a, b) {
      const ra = a.ex ? a.ex.rank : 99, rb = b.ex ? b.ex.rank : 99;
      return ra - rb || String(a.c.name).localeCompare(String(b.c.name));
    });
    return list;
  }

  let _origRenderClientMaster = null;

  // Hidden container holding the cm-det-* nodes the application still writes
  // into. Nothing here is displayed; it exists so no existing code path finds
  // a missing element.
  let _compatProfile = null;
  function compatHost() {
    let h = $('#rd-compat');
    if (!h) {
      h = document.createElement('div');
      h.id = 'rd-compat';
      h.setAttribute('aria-hidden', 'true');
      document.body.appendChild(h);
    }
    // A role switch must not leave the previous profile's client ids in the
    // document. They are hidden, but they are still ids another profile's
    // code could resolve, and that is the class of bug that produced the
    // duplicate-id defect in the first place.
    const pid = (A().profile || {}).id || null;
    if (pid !== _compatProfile) { h.innerHTML = ''; _compatProfile = pid; }
    return h;
  }
  function ensureCompat(cid) {
    const host = compatHost();
    if (!document.getElementById('cm-det-' + cid)) {
      const d = document.createElement('div');
      d.id = 'cm-det-' + cid;
      d.style.display = 'none';
      d.innerHTML = '<span id="cm-arr-' + cid + '"></span><div id="cm-det-body-' + cid + '"></div>';
      host.appendChild(d);
    }
  }

  function renderTrackerList() {
    const el = $('#client-master-table');
    const app = A();
    if (!el || !app.profile) return;

    if (app.profile.isCSC) {
      compatHost();                       // clears anything left by another role
      const vb = $('#rd-views'); if (vb) vb.remove();
      const sp = $('#rd-split'); if (sp) sp.classList.add('no-ws');
      if (_origRenderClientMaster) _origRenderClientMaster();
      return;
    }

    // The CSC branch of the original renderer repurposes #cm-tier as a CSM
    // filter and its non-CSC branch restores it; the override skips the
    // original, so restore it here exactly as the application does.
    const tierSel = $('#cm-tier');
    if (tierSel && !Array.prototype.some.call(tierSel.options, function (o) { return o.value === 'High'; })) {
      const keep = tierSel.value;
      tierSel.innerHTML = '<option value="">All Tiers</option><option value="High">High Need</option>' +
        '<option value="Medium">Medium Need</option><option value="Low">Low Need</option>';
      tierSel.value = Array.prototype.some.call(tierSel.options, function (o) { return o.value === keep; }) ? keep : '';
    }

    mountSplit();

    if (app.profile.dualMarket && !$('#julia-mkt-bar')) {
      const bar = document.createElement('div');
      bar.id = 'julia-mkt-bar';
      bar.className = 'market-filter-bar';
      bar.innerHTML = '<span class="mfb-lab">Market</span>' +
        '<button class="mfb-btn active" id="mfb-all" onclick="setJuliaFilter(\'all\',this)">All</button>' +
        '<button class="mfb-btn" id="mfb-ma" onclick="setJuliaFilter(\'Massachusetts\',this)">Massachusetts</button>' +
        '<button class="mfb-btn" id="mfb-chi" onclick="setJuliaFilter(\'Chicago\',this)">Chicago</button>';
      const vb = $('#rd-views');
      if (vb) vb.parentElement.insertBefore(bar, vb);
    }

    const all = app.fn.get('clients') || [];
    const counts = {
      all: all.length,
      attention: all.filter(function (c) { return !!exceptionFor(c); }).length,
      soon: all.filter(function (c) { const e = exceptionFor(c); return e && e.tone === 'warn'; }).length,
      onboarding: all.filter(function (c) { return c.startDate && (daysSince(c.startDate) || 999) <= 30; }).length,
      coverage: all.filter(function (c) { return !!c.vacation; }).length
    };
    const rows = trackerRows();

    let viewBar = $('#rd-views');
    if (!viewBar) {
      viewBar = document.createElement('div');
      viewBar.id = 'rd-views';
      viewBar.setAttribute('role', 'tablist');
      el.parentElement.insertBefore(viewBar, el);
    }
    viewBar.innerHTML = VIEWS.map(function (v) {
      return '<button type="button" class="rd-view" role="tab" data-view="' + v[0] + '" aria-selected="' + (_view === v[0]) + '">' +
        esc(v[1]) + (counts[v[0]] ? '<span class="n">' + counts[v[0]] + '</span>' : '') + '</button>';
    }).join('');
    $$('.rd-view', viewBar).forEach(function (b) {
      b.addEventListener('click', function () { _view = b.dataset.view; renderTrackerList(); });
    });

    if (!rows.length) { el.innerHTML = emptyState(all.length); renderWorkspace(); return; }

    el.innerHTML = '<ul class="rd-cl rd-tracker-list" role="listbox">' + rows.map(function (r) {
      const c = r.c, ex = r.ex, eid = esc(c.id);
      const sel = _selected === c.id;
      // ONE exception, or nothing at all. A healthy client carries no mark:
      // no dot, no badge, no "On track". The absence is the statement.
      const status = ex ? '<span class="rd-cl-ex ' + ex.tone + '">' + esc(ex.text) + '</span>' : '';
      const nv = nextVisit(c);
      const next = nv ? '<span class="rd-cl-next">' + fmtShort(nv) + '</span>' : '';
      return '<li><button type="button" class="rd-cl-open' + (sel ? ' sel' : '') + '" role="option"' +
        ' aria-selected="' + sel + '" data-cid="' + eid + '">' +
        '<span class="rd-cl-id"><span class="rd-cl-name">' + esc(c.name) + '</span>' +
        (c.loc || c.city ? '<span class="rd-cl-where">' + esc([c.loc, c.city].filter(Boolean).join(', ')) + '</span>' : '') +
        '</span>' + status + next + '</button></li>';
    }).join('') + '</ul>';

    rows.forEach(function (r) { ensureCompat(r.c.id); });
    $$('.rd-cl-open', el).forEach(function (b) {
      b.addEventListener('click', function () { selectClient(b.dataset.cid); });
    });
    renderWorkspace();
  }

  function mountSplit() {
    const el = $('#client-master-table');
    if (!el || $('#rd-split')) return;
    const split = document.createElement('div');
    split.id = 'rd-split';
    const left = document.createElement('div');
    left.className = 'rd-split-list';
    const right = document.createElement('div');
    right.className = 'rd-split-ws';
    right.id = 'rd-ws';
    el.parentElement.insertBefore(split, el);
    split.appendChild(left);
    split.appendChild(right);
    const vb = $('#rd-views');
    if (vb) left.appendChild(vb);
    left.appendChild(el);
  }

  function selectClient(cid) {
    _selected = cid;
    _section = 'overview';
    _showAdmin = false;
    ensureCompat(cid);
    // Keep the application's own open/closed state in step, so anything that
    // reads it (and setPulseAck's re-render target) behaves as before.
    const det = document.getElementById('cm-det-' + cid);
    if (det && det.style.display === 'none' && window.toggleClientDetail) {
      try { toggleClientDetail(cid); } catch (e) {}
    }
    $$('.rd-cl-open').forEach(function (b) {
      const on = b.dataset.cid === cid;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-selected', String(on));
    });
    renderWorkspace();
    const sp = $('#rd-split'); if (sp) sp.classList.add('has-sel');
    if (window.TributeRouter) TributeRouter.push({ page: 'clients', client: cid, section: null, layer: null });
    if (window.innerWidth <= 980) {
      const ws = $('#rd-ws'); if (ws && ws.scrollIntoView) ws.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  function deselectClient() {
    const prev = _selected;
    _selected = null;
    const det = prev && document.getElementById('cm-det-' + prev);
    if (det && det.style.display !== 'none' && window.toggleClientDetail) {
      try { toggleClientDetail(prev); } catch (e) {}
    }
    $$('.rd-cl-open').forEach(function (b) { b.classList.remove('sel'); b.setAttribute('aria-selected', 'false'); });
    const sp = $('#rd-split'); if (sp) sp.classList.remove('has-sel');
    renderWorkspace();
  }

  /* ── The workspace ────────────────────────────────────────────────────── */
  const WS_AREAS = [['overview', 'Overview'], ['care', 'Care'], ['schedule', 'Schedule'],
    ['communication', 'Communication'], ['more', 'More']];

  function pulseFor(c) {
    const p = A().pulse;
    return (p && c.vivId && p.byCid) ? p.byCid[c.vivId] : null;
  }
  function kv(label, value) {
    if (!value) return '';
    return '<div class="rd-kv"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }
  function block(title, body, quiet) {
    if (!body) return '';
    return '<section class="rd-ws-block' + (quiet ? ' quiet' : '') + '">' +
      (title ? '<h4>' + esc(title) + '</h4>' : '') + body + '</section>';
  }
  function eventLine(date, text, meta) {
    return '<div class="rd-ev"><span class="d">' + fmtShort(date) + '</span>' +
      '<span class="t">' + esc(text) + '</span>' +
      (meta ? '<span class="m">' + esc(meta) + '</span>' : '') + '</div>';
  }

  function renderWorkspace() {
    const ws = $('#rd-ws');
    if (!ws) return;
    const app = A();
    const c = _selected ? (app.fn.get('clients') || []).find(function (x) { return x.id === _selected; }) : null;
    if (!c) {
      ws.innerHTML = '<div class="rd-ws-empty">' + ART.calm +
        '<p>Choose a client to see how they are doing.</p></div>';
      return;
    }
    const ex = exceptionFor(c);
    const pp = pulseFor(c);

    const head =
      '<header class="rd-ws-head">' +
      '<button type="button" class="rd-ws-back">' + I('arrowLeft') + 'All clients</button>' +
      '<h2>' + esc(c.name) + '</h2>' +
      '<p class="rd-ws-sub">' + esc([c.loc, c.city].filter(Boolean).join(', ') || 'Private residence') +
      (c.type ? '<span class="dot">·</span>' + esc(c.type) : '') + '</p>' +
      '<nav class="rd-cw-rail" role="tablist">' + WS_AREAS.map(function (a) {
        return '<button type="button" role="tab" data-key="' + a[0] + '" aria-selected="' + (_section === a[0]) + '">' + esc(a[1]) + '</button>';
      }).join('') + '</nav></header>';

    let body = '';
    if (_section === 'overview') body = wsOverview(c, ex, pp);
    else if (_section === 'care') body = wsCare(c, pp);
    else if (_section === 'schedule') body = wsSchedule(c);
    else if (_section === 'communication') body = wsCommunication(c);
    else body = wsMore(c);

    ws.innerHTML = head + '<div class="rd-ws-body">' + body + '</div>' + wsActions(c);

    $$('.rd-cw-rail button', ws).forEach(function (b) {
      b.addEventListener('click', function () {
        _section = b.dataset.key;
        renderWorkspace();
        if (window.TributeRouter) TributeRouter.push({ page: 'clients', client: c.id, section: _section });
      });
    });
    const back = $('.rd-ws-back', ws);
    if (back) back.addEventListener('click', function () { deselectClient(); if (window.TributeRouter) TributeRouter.push({ page: 'clients', client: null }); });
    wireWsActions(ws, c);
    swapIcons(ws);
  }

  // OVERVIEW — a summary, not a dump. Everything administrative is behind
  // "View full details".
  function wsOverview(c, ex, pp) {
    let out = '';
    if (ex) out += block('Needs attention',
      '<p class="rd-ws-ex ' + ex.tone + '">' + esc(ex.text) + '</p>');
    // One compact Pulse signal, not a bordered box with three buttons.
    if (pp && pp.level && pp.level !== 'green' && !c.pulseAck) {
      out += block('', '<div class="rd-signal ' + (pp.level === 'red' ? 'bad' : 'warn') + '">' +
        '<span class="k">' + (pp.level === 'red' ? 'Needs attention' : 'Watch') + '</span>' +
        '<p>' + esc(String(pp.headline || '').split('. ')[0] + '.') + '</p>' +
        '<button type="button" class="rd-link" data-go="care">Review</button></div>');
    }
    const nv = nextVisit(c);
    if (nv) out += block('Next', '<p class="rd-ws-next">Visit<span class="dot">·</span>' + fmtShort(nv) + '</p>');
    if (c.contact) out += block('Family contact', '<p class="rd-ws-plain">' + esc(c.contact) + '</p>');

    const recent = rowsFor('touchpoints', c.id).slice(0, 2).concat(rowsFor('visits', c.id).slice(0, 1))
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 2);
    if (recent.length) out += block('Recent', recent.map(function (r) {
      return eventLine(r.date, r.type || 'Contact', '');
    }).join(''));

    // Administrative fields, folded away.
    out += '<details class="rd-more"' + (_showAdmin ? ' open' : '') + '><summary>View full details</summary>' +
      '<dl class="rd-kvs">' +
      kv('Type', c.type) + kv('Start of care', c.startDate ? fmtShort(c.startDate) : '') +
      kv('Tier', c.tier) + kv('Visit cadence', c.freq === 'NA' ? 'None' : (c.freq || 90) + ' days') +
      kv('Weekly hours', c.weeklyHours) + kv('CSM', c.csm) +
      kv('Contact email', c.contactEmail) + kv('Birthday', c.birthday ? fmtShort(c.birthday) : '') +
      kv('Caregivers', c.caregivers) + kv('Care plan', c.carePlanDate ? fmtShort(c.carePlanDate) : '') +
      '</dl></details>';
    return out;
  }

  function wsCare(c, pp) {
    let out = '';
    if (pp) {
      const tone = pp.level === 'red' ? 'bad' : pp.level === 'amber' ? 'warn' : 'ok';
      out += block('Pulse',
        '<div class="rd-signal ' + tone + '">' +
        '<span class="k">' + (pp.level === 'red' ? 'Needs attention' : pp.level === 'amber' ? 'Watch' : 'Stable') + '</span>' +
        '<p>' + esc(pp.headline || '') + '</p></div>' +
        ((pp.aiWatch && pp.aiWatch.length) ? '<ul class="rd-ul">' + pp.aiWatch.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
        (c.pulseAck
          ? '<p class="rd-ws-quiet">Acknowledged by ' + esc(c.pulseAck.by || '') + ' · ' +
            esc((window.PULSE_ACK_LABEL || {})[c.pulseAck.state] || c.pulseAck.state || '') +
            ' <button type="button" class="rd-link" data-act="ack-clear">Undo</button></p>'
          : '<div class="rd-ack"><span>Acknowledge</span>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_none">Nothing needed</button>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_working">Working on it</button>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_1to1">Raising in 1:1</button></div>'));
    }
    if (c.baselineNarrative) out += block('Baseline', '<p class="rd-ws-plain">' + esc(c.baselineNarrative) + '</p>');
    const cis = rowsFor('checkins', c.id);
    out += block('Care conversations',
      cis.length ? cis.slice(0, 4).map(function (x) {
        return eventLine(x.date, 'Satisfaction ' + (x.satisfaction || '—') + '/5', x.working ? String(x.working).slice(0, 48) : '');
      }).join('') : '<p class="rd-ws-quiet">Nothing logged yet.</p>');
    if (c.carePlanDate) out += block('Care plan', '<p class="rd-ws-plain">Last updated ' + fmtShort(c.carePlanDate) + '</p>', true);
    return out;
  }

  function wsSchedule(c) {
    let out = '';
    const nv = nextVisit(c);
    out += block('Next visit', nv ? '<p class="rd-ws-next">' + fmtShort(nv) + '</p>'
      : '<p class="rd-ws-quiet">' + (c.freq === 'NA' ? 'No visit cadence set.' : 'Not scheduled.') + '</p>');
    const vs = rowsFor('visits', c.id);
    out += block('Recent visits', vs.length
      ? vs.slice(0, 5).map(function (v) { return eventLine(v.date, v.type || 'Visit', v.by || ''); }).join('')
      : '<p class="rd-ws-quiet">Nothing logged yet.</p>');
    try {
      const ov = (((A().data.profiles || {})[A().profile.id] || {}).vivOpenVisits || [])
        .filter(function (o) { return o.clientId === c.id; });
      if (ov.length) out += block('Open visits', ov.slice(0, 5).map(function (o) {
        return eventLine(o.day, (o.type || 'Visit') + ' unfilled', o.hours ? o.hours + 'h' : '');
      }).join(''));
    } catch (e) {}
    if (c.vacation) out += block('Coverage', '<p class="rd-ws-plain">' + esc(c.vacation) + '</p>', true);
    out += extraBlocks('schedule', c);
    return out;
  }

  // Blocks contributed by another prototype layer, so a capability can live
  // in a client area without this file knowing what it is.
  function extraBlocks(area, c) {
    const list = (window.TributeRedesign && window.TributeRedesign.areaBlocks &&
                  window.TributeRedesign.areaBlocks[area]) || [];
    return list.map(function (f) {
      try { const r = f(c); return r ? block(r.title, r.html, r.quiet) : ''; } catch (e) { return ''; }
    }).join('');
  }

  function wsCommunication(c) {
    let out = '';
    const tps = rowsFor('touchpoints', c.id);
    out += block('Recent touchpoints', tps.length
      ? tps.slice(0, 6).map(function (t) { return eventLine(t.date, t.type || 'Touchpoint', String(t.note || t.notes || '').slice(0, 44)); }).join('')
      : '<p class="rd-ws-quiet">Nothing logged yet.</p>');
    const contact = [c.contact, c.contactEmail].filter(Boolean).join(' · ');
    if (contact) out += block('Family contact', '<p class="rd-ws-plain">' + esc(contact) + '</p>');
    if (c.comm) out += block('Preferences', '<p class="rd-ws-plain">' + esc(c.comm) + '</p>', true);
    out += extraBlocks('communication', c);
    return out;
  }

  function wsMore(c) {
    let out = '';
    // Community: the name and one contact. The directory lives in the
    // Community entity rather than being copied into every client record.
    if (c.loc) {
      let cm = {};
      try { cm = ((A().data.shared || {}).communities || {})[c.loc] || {}; } catch (e) {}
      out += block('Community', '<p class="rd-ws-plain">' + esc(c.loc) + '</p>' +
        (cm.mainContact ? '<p class="rd-ws-quiet">' + esc(cm.mainContact) + '</p>' : '') +
        '<button type="button" class="rd-link" data-act="community">View community</button>');
    }
    // Identity, not a name match. prototype/workflows.js joins on the
    // stable clientId and only falls back to a name for legacy records
    // with no id — and says which is which rather than presenting a guess
    // as a fact.
    let recs = [], legacy = [], ambiguous = [];
    try {
      const W = window.TributeWorkflows;
      if (W && W.ltcIdentity) {
        const r = W.ltcIdentity.forClient(c);
        recs = r.linked; legacy = r.legacy; ambiguous = r.ambiguous;
      } else {
        recs = ((typeof window.getLTC === 'function' ? getLTC() : (((A().data || {}).shared || {}).ltc)) || [])
          .filter(function (r) { return (r.clientName || '').toLowerCase() === (c.name || '').toLowerCase(); });
      }
    } catch (e) {}
    const ltcLine = function (r, tag) {
      return '<p class="rd-ws-plain">' + esc(r.insurer || 'Unknown insurer') +
        (tag ? '<span class="rd-flag">' + esc(tag) + '</span>' : '') + '</p>' +
        '<p class="rd-ws-quiet">Policy ' + esc(r.policyNum || '—') + ' · Claim ' + esc(r.claimNum || '—') + '</p>';
    };
    const ltcBody =
      recs.map(function (r) { return ltcLine(r, ''); }).join('') +
      legacy.map(function (r) { return ltcLine(r, 'matched by name'); }).join('') +
      (ambiguous.length
        ? '<p class="rd-ws-warn">' + ambiguous.length + ' record' + (ambiguous.length > 1 ? 's' : '') +
          ' matches this name but more than one client shares it, so ' +
          (ambiguous.length > 1 ? 'they have' : 'it has') + ' not been attached to anyone. Open LTC Records and link ' +
          (ambiguous.length > 1 ? 'them' : 'it') + ' to the right client.</p>'
        : '');
    out += block('LTC insurance', ltcBody || '<p class="rd-ws-quiet">No record on file.</p>');
    const mdNav = $('#nav-md');
    if (mdNav && mdNav.style.display !== 'none' && /maryland|baltimore|annapolis|bethesda/i.test(c.market || '')) {
      out += block('Compliance', '<button type="button" class="rd-link" data-act="compliance">Open the Maryland board for this client</button>');
    }
    out += block('Fill priority', '<button type="button" class="rd-link" data-act="fill">Open fill priority</button>', true);
    if (c.notes) out += block('Notes', '<p class="rd-ws-plain">' + esc(c.notes) + '</p>', true);
    if (c.rateHistory) out += block('Rates', '<p class="rd-ws-plain">' + esc(c.rateHistory) + '</p>', true);
    return out;
  }

  // One primary action and one overflow. Every item calls the application's
  // own function; nothing was reimplemented and nothing was removed.
  function wsActions(c) {
    return '<footer class="rd-ws-actions">' +
      '<div class="rd-menu"><button type="button" class="btn btn-p" data-menu="log">Log activity' + I('chevronDown') + '</button>' +
      '<div class="rd-menu-list" data-for="log">' +
      '<button type="button" data-act="log-visit">Visit</button>' +
      '<button type="button" data-act="log-tp">Touchpoint</button>' +
      '<button type="button" data-act="log-ci">Care conversation</button>' +
      '</div></div>' +
      '<div class="rd-menu"><button type="button" class="btn btn-icon" data-menu="more" aria-label="More actions">' + I('more') + '</button>' +
      '<div class="rd-menu-list right" data-for="more">' +
      '<button type="button" data-act="edit">Edit client</button>' +
      '<button type="button" data-act="draft">Draft update</button>' +
      '<button type="button" data-act="fill">Fill priority</button>' +
      '<button type="button" data-act="ltc-add">Add LTC record</button>' +
      '</div></div></footer>';
  }

  function wireWsActions(ws, c) {
    const call = function (fn) { const f = window[fn]; return typeof f === 'function' ? f : null; };
    $$('[data-menu]', ws).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        const list = $('.rd-menu-list[data-for="' + b.dataset.menu + '"]', ws);
        const open = list.classList.contains('open');
        $$('.rd-menu-list', ws).forEach(function (l) { l.classList.remove('open'); });
        if (!open) list.classList.add('open');
      });
    });
    document.addEventListener('click', function () { $$('.rd-menu-list').forEach(function (l) { l.classList.remove('open'); }); }, { once: true });

    $$('[data-act]', ws).forEach(function (b) {
      b.addEventListener('click', async function (e) {
        e.stopPropagation();
        $$('.rd-menu-list', ws).forEach(function (l) { l.classList.remove('open'); });
        const a = b.dataset.act, f = {
          'log-visit': function () { const g = call('openLogPanel'); if (g) g('visit', c.id, c.name); },
          'log-tp': function () { const g = call('openLogPanel'); if (g) g('touchpoint', c.id, c.name); },
          'log-ci': function () { const g = call('openLogPanel'); if (g) g('checkin', c.id, c.name); },
          'edit': function () { const g = call('editClient'); if (g) g(c.id); },
          'draft': function () { const g = call('openDraft'); if (g) g(c.id); },
          'fill': function () { const g = call('openFillPriority'); if (g) g(c.id); },
          'ltc-add': function () { const g = call('openLTCFromClient'); if (g) g(c.id, c.name); },
          'community': function () {
            const nv = $('.nav-item[data-page="coverage"]'); if (nv) nv.click();
            setTimeout(function () { const g = call('selectCommunity'); if (g) g(c.loc); }, 120);
          },
          'compliance': function () {
            const nv = $('#nav-md'); if (nv) nv.click();
            setTimeout(function () { const g = call('mdSelect'); if (g) g(c.vivId); }, 450);
          },
          'ack-clear': function () { const g = call('clearPulseAck'); if (g) { g(c.id); renderWorkspace(); } }
        }[a];
        if (f) return f();

        if (a === 'ack') {
          // setPulseAck owns the record shape and the save, so it stays the
          // writer. It collects an optional note with window.prompt, which is
          // browser chrome; the product dialog is substituted for the
          // duration of that one call and then removed.
          const note = await rdDialog({ title: 'Acknowledge', body: 'Anything worth adding?', input: '', ok: 'Save' });
          if (note === null) return;
          const realPrompt = window.prompt;
          window.prompt = function () { return note; };
          try { const g = call('setPulseAck'); if (g) g(c.id, b.dataset.state); }
          finally { window.prompt = realPrompt; }
          renderWorkspace();
          return;
        }
        if (b.dataset.go) { _section = b.dataset.go; renderWorkspace(); }
      });
    });
    $$('[data-go]', ws).forEach(function (b) {
      b.addEventListener('click', function () { _section = b.dataset.go; renderWorkspace(); });
    });
    const det = $('.rd-more', ws);
    if (det) det.addEventListener('toggle', function () { _showAdmin = det.open; });
  }

  function emptyState(total) {
    if (!total) return illustration('welcome', 'Your caseload is on its way',
      'Clients arrive from Viv on the next sync. You can also add one by hand.');
    if (_view === 'attention') return illustration('allclear', 'Everyone is caught up',
      'Every client is inside cadence for visits, touchpoints and care conversations.');
    if (_view === 'soon') return illustration('allclear', 'Nothing due in the next two weeks',
      'You are ahead of every cadence on this caseload.');
    if (_view === 'onboarding') return illustration('calm', 'No one in their first 30 days',
      'New clients appear here the day care starts.');
    if (_view === 'coverage') return illustration('calm', 'No coverage notes',
      'Vacations and cover arrangements you record will show here.');
    return illustration('search', 'No clients match', 'Try another view, or clear the search and filters.');
  }

  const ART = {
    allclear:
      '<svg viewBox="0 0 120 80" class="rd-art" aria-hidden="true">' +
      '<path d="M8 64h104" class="l3"/>' +
      '<path d="M24 64V42a7 7 0 0 1 7-7h11a7 7 0 0 1 7 7v22" class="l2"/>' +
      '<path d="M31 64V51h11v13" class="l3"/>' +
      '<path d="M70 64V34a6 6 0 0 1 6-6h10a6 6 0 0 1 6 6v30" class="l2"/>' +
      '<path d="M76 38h10M76 46h10M76 54h6" class="l3"/>' +
      '<circle cx="60" cy="18" r="9.5" class="l1 accent"/>' +
      '<path d="m55.6 18.2 3.2 3.2 5.6-6.4" class="l1 accent"/></svg>',
    calm:
      '<svg viewBox="0 0 120 80" class="rd-art" aria-hidden="true">' +
      '<path d="M8 64h104" class="l3"/>' +
      '<rect x="31" y="27" width="58" height="31" rx="5" class="l2"/>' +
      '<path d="M41 39h27M41 47h16" class="l3"/>' +
      '<path d="M60 11v7" class="l3"/><circle cx="60" cy="19" r="1.6" class="l3"/></svg>',
    search:
      '<svg viewBox="0 0 120 80" class="rd-art" aria-hidden="true">' +
      '<circle cx="53" cy="33" r="18" class="l2"/><path d="m66 46 15 15" class="l2"/>' +
      '<path d="M45 33h16" class="l3"/><path d="M8 70h104" class="l3"/></svg>',
    welcome:
      '<svg viewBox="0 0 120 80" class="rd-art" aria-hidden="true">' +
      '<path d="M8 66h104" class="l3"/>' +
      '<path d="M22 66V38l19-14 19 14v28" class="l2"/>' +
      '<path d="M34 66V52h14v14" class="l3"/>' +
      '<path d="M70 66V46a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v20" class="l2"/>' +
      '<path d="M78 51h6M78 57h6" class="l3"/>' +
      '<path d="M60 12v9M55.5 16.5h9" class="l1 accent"/></svg>'
  };
  function illustration(kind, title, body) {
    return '<div class="rd-empty">' + (ART[kind] || '') +
      '<div class="rd-empty-t">' + esc(title) + '</div>' +
      '<div class="rd-empty-b">' + esc(body) + '</div></div>';
  }

  function installTracker() {
    if (_origRenderClientMaster || typeof window.renderClientMaster !== 'function') return;
    if (window.renderClientMaster.__rd) return;
    _origRenderClientMaster = window.renderClientMaster;
    const wrapped = function () {
      try { renderTrackerList(); }
      catch (e) {
        console.error('[redesign] tracker failed; falling back to the original renderer:', e);
        try { _origRenderClientMaster(); } catch (e2) {}
      }
    };
    wrapped.__rd = true;
    wrapped.original = _origRenderClientMaster;
    window.renderClientMaster = wrapped;
  }

  /* ── 5. (the workspace replaces the old inline rail) ───────────────────── */
  function decorateClientDetail() { /* inline expansion is gone; see section 4 */ }

  /* ── 6. HOME ──────────────────────────────────────────────────────────── */
  function restructureHome() {
    const page = $('#page-home');
    if (!page || page.dataset.rd) return;
    const ph = $('.ph', page), stats = $('.g4', page), caseload = $('#home-caseload', page),
      drill = $('#home-drill', page), grid = $('.g2', page), upcoming = $('#v-upcoming-card', page);
    const sec = function (id, title, lede) {
      const s = document.createElement('div');
      s.className = 'rd-sec'; s.id = id;
      s.innerHTML = '<div class="rd-sec-h"><h3>' + esc(title) + '</h3>' +
        (lede ? '<span class="lede">' + esc(lede) + '</span>' : '') + '</div>';
      return s;
    };
    const sAttn = sec('rd-s-attn', 'Needs attention');
    sAttn.insertAdjacentHTML('beforeend', '<div id="rd-attn"></div>');
    const sNext = sec('rd-s-next', 'Coming up', 'Next two weeks');
    const sCase = sec('rd-s-case', 'Caseload health');
    const sTools = sec('rd-s-tools', 'Working notes');
    sTools.className = 'rd-sec quiet';
    if (ph && ph.nextSibling) page.insertBefore(sAttn, ph.nextSibling); else page.appendChild(sAttn);
    sAttn.after(sNext); sNext.after(sCase); sCase.after(sTools);
    if (upcoming) sNext.appendChild(upcoming);
    sNext.insertAdjacentHTML('beforeend', '<div class="card" id="rd-next"></div>');
    if (stats) sCase.appendChild(stats);
    if (caseload) sCase.appendChild(caseload);
    if (drill) sCase.appendChild(drill);
    if (grid) sTools.appendChild(grid);
    page.dataset.rd = '1';
  }

  // Calm Control: a category with nothing in it produces NO card at all.
  function attentionSignals() {
    const app = A();
    const out = [];
    if (!app.ready) return out;
    let cl = [], todos = [];
    try { cl = app.fn.get('clients') || []; todos = app.fn.get('todos') || []; } catch (e) { return out; }
    const real = cl.filter(function (c) { return !c.isOffice; });
    const exc = real.map(function (c) { return { c: c, ex: exceptionFor(c) }; }).filter(function (r) { return r.ex; });
    const bad = exc.filter(function (r) { return r.ex.tone === 'bad'; });
    const warn = exc.filter(function (r) { return r.ex.tone === 'warn'; });

    if (bad.length) out.push({
      n: bad.length, label: bad.length === 1 ? 'Client needs action' : 'Clients need action',
      sub: bad.slice(0, 2).map(function (r) { return String(r.c.name).split(' ')[0]; }).join(', ') +
        (bad.length > 2 ? ' and ' + (bad.length - 2) + ' more' : ''),
      tone: 'bad', go: 'clients', view: 'attention'
    });
    if (warn.length) out.push({ n: warn.length, label: 'Due soon', sub: 'Within two weeks', tone: 'warn', go: 'clients', view: 'soon' });
    try {
      if (typeof window._myCocTasks === 'function') {
        const coc = _myCocTasks().filter(function (t) { return t.open; });
        if (coc.length) out.push({ n: coc.length, label: coc.length === 1 ? 'Change of condition' : 'Changes of condition', sub: 'Open in Viv', tone: 'bad', go: 'clients' });
      }
    } catch (e) {}
    const t = todayISO();
    const ovTodo = todos.filter(function (x) { return !x.done && x.due && x.due < t; });
    if (ovTodo.length) out.push({ n: ovTodo.length, label: 'Tasks past due', sub: String(ovTodo[0].text || '').slice(0, 44), tone: 'warn', go: 'home' });
    try {
      const ov = ((app.data.profiles[app.profile.id]) || {}).vivOpenVisits || [];
      if (ov.length) out.push({ n: ov.length, label: 'Open visits', sub: 'Unfilled on my caseload', tone: 'warn', go: 'priority' });
    } catch (e) {}
    const onb = real.filter(function (c) { return c.startDate && (daysSince(c.startDate) || 999) <= 30; });
    if (onb.length) out.push({ n: onb.length, label: 'In first 30 days', sub: 'Onboarding milestones', tone: 'info', go: 's60' });
    const ltc = app.ltcBoard;
    if (ltc && ltc.counts && ltc.counts.blocked) out.push({ n: ltc.counts.blocked, label: 'LTC blocked', sub: 'Cannot submit yet', tone: 'bad', go: 'ltc' });
    // Other prototype layers add their own signals here rather than editing
    // this function. Each returns a signal object or null.
    (window.TributeRedesign && window.TributeRedesign.signalSources || []).forEach(function (f) {
      try { const sg = f(); if (sg) out.push(sg); } catch (e) {}
    });
    const md = app.maryland;
    if (md && Array.isArray(md.rows) && $('#nav-md') && $('#nav-md').style.display !== 'none') {
      const f = md.rows.filter(function (r) { return r.assessmentStatus === 'overdue' || r.assessmentStatus === 'none on file' || r.reassessmentCount > 0; }).length;
      if (f) out.push({ n: f, label: 'Compliance gaps', sub: 'Maryland requirements', tone: 'bad', go: 'md' });
    }
    return out;
  }

  // Which sources the environment has recorded as failing. In V2 this comes
  // from the diagnostics layer; locally there is nothing to report.
  const SOURCE_LABEL = {
    csm_hub: 'The Viv sync', csm_data: 'The shared document',
    client_pulse: 'Client Pulse', md_compliance: 'Maryland Compliance',
    ltc_board: 'The LTC board', csm_comms: 'Communications', coc_tasks: 'Change of condition'
  };
  // Endpoints that feed the Hub's own plumbing rather than this panel. If
  // one of them is unreachable that is worth knowing, but it is not a reason
  // to tell a CSM their caseload might be incomplete — and it must never put
  // an endpoint name in front of them. Seen live: the attention panel read
  // "v2_write_config did not answer, so this list may be incomplete."
  const NOT_A_DATA_SOURCE = { v2_write_config: 1, v2_feedback: 1, usage_time: 1, build_stamp: 1 };
  function failedSources() {
    const App = window.TributeApp;
    if (!App || !App.anomalies) return [];
    const bad = {};
    App.anomalies.forEach(function (a) {
      if (a.kind !== 'api-error' && a.kind !== 'api-failure') return;
      const key = String(a.where || '').split('.')[0];
      if (NOT_A_DATA_SOURCE[key]) return;
      // Only ever show a name we have written in plain English. An unmapped
      // endpoint becomes "One of the sources" rather than leaking its id.
      bad[SOURCE_LABEL[key] || 'One of the sources'] = true;
    });
    return Object.keys(bad);
  }

  let _attnKey = '';
  function renderAttention() {
    const el = $('#rd-attn');
    if (!el) return;
    const sig = attentionSignals();
    const rank = { bad: 0, warn: 1, info: 2 };
    sig.sort(function (a, b) { return (rank[a.tone] - rank[b.tone]) || (b.n - a.n); });
    const key = sig.map(function (s) { return s.tone + s.n + s.label; }).join('|') +
                '#' + failedSources().join(',');
    if (key !== _attnKey) {
      _attnKey = key;
      // THE RULE: an endpoint that FAILED is not an endpoint that said
      // "nothing". Silence from a broken source must never be rendered as
      // reassurance — that is the pass-1 defect ("Nothing is overdue" on a
      // caseload with five overdue visits) in a different costume, and it is
      // the one the production brief names explicitly.
      const broken = failedSources();
      if (!sig.length && broken.length) {
        el.innerHTML = illustration('calm', 'Some of this could not be loaded',
          broken.join(', ') + (broken.length === 1 ? ' did not answer' : ' did not answer') +
          ', so this list is incomplete. Reload, or check back shortly \u2014 ' +
          'this is not an all-clear.');
      } else if (!sig.length) {
        // Tribute's public voice is warm and direct. "Everything is caught
        // up" says the same operational thing as "0 outstanding items" and
        // sounds like a colleague rather than a ticket queue. The detail
        // line stays precise, because precision is what makes the warmth
        // trustworthy rather than vague.
        el.innerHTML = illustration('allclear', 'Everything is caught up',
          'No overdue visits or touchpoints, nothing flagged, and no tasks past due.');
      } else {
        // Calm control: at most four cards. Six tiles is a dashboard, and a
        // dashboard is a thing you have to read. Everything past the fourth
        // collapses into one quiet line that still names what is there, so
        // nothing is hidden -- it is just not shouting.
        const SHOW = 4;
        const front = sig.slice(0, SHOW), rest = sig.slice(SHOW);
        el.innerHTML = front.map(function (s) {
          return '<button type="button" class="rd-attn-card ' + s.tone + '" data-go="' + s.go + '"' +
            (s.view ? ' data-view="' + s.view + '"' : '') + '>' +
            '<span class="rd-attn-n">' + s.n + '</span>' +
            '<span class="rd-attn-l">' + esc(s.label) + '</span>' +
            '<span class="rd-attn-s">' + esc(s.sub) + '</span></button>';
        }).join('') +
        (rest.length ? '<div class="rd-attn-more">' + rest.map(function (s) {
          return '<button type="button" class="rd-attn-link" data-go="' + s.go + '"' +
            (s.view ? ' data-view="' + s.view + '"' : '') + '>' +
            '<b>' + s.n + '</b> ' + esc(String(s.label).toLowerCase()) + '</button>';
        }).join('<span class="sep">\u00b7</span>') + '</div>' : '');
        if (broken.length) {
          el.insertAdjacentHTML('beforeend',
            '<p class="rd-attn-partial">' + esc(broken.join(', ')) +
            ' did not answer, so this list may be incomplete.</p>');
        }
        $$('.rd-attn-card, .rd-attn-link', el).forEach(function (c) {
          c.addEventListener('click', function () {
            if (c.dataset.view) _view = c.dataset.view;
            const n = $('.nav-item[data-page="' + c.dataset.go + '"]');
            if (n) n.click();
          });
        });
      }
      refreshNavCounts(sig);
    }
    renderComingUp();
  }

  let _nextKey = '';
  function renderComingUp() {
    const el = $('#rd-next');
    const app = A();
    if (!el || !app.ready) return;
    let cl = [], todos = [];
    try { cl = app.fn.get('clients') || []; todos = app.fn.get('todos') || []; } catch (e) { return; }
    const t = todayISO(), in14 = new Date(Date.now() + 14 * DAY).toISOString().slice(0, 10);
    const rows = [];
    cl.filter(function (c) { return !c.isOffice && c.freq !== 'NA' && c.lastVisit; }).forEach(function (c) {
      const s = nextVisit(c);
      if (s && s >= t && s <= in14) rows.push({ when: s, what: 'Visit due', who: c.name });
    });
    todos.filter(function (x) { return !x.done && x.due && x.due >= t && x.due <= in14; })
      .forEach(function (x) { rows.push({ when: x.due, what: 'Task', who: String(x.text || '').slice(0, 54) }); });
    rows.sort(function (a, b) { return a.when.localeCompare(b.when); });
    const key = rows.map(function (r) { return r.when + r.who; }).join('|');
    if (key === _nextKey) return;
    _nextKey = key;
    if (!rows.length) { el.innerHTML = '<div class="rd-quiet">Nothing scheduled in the next two weeks.</div>'; return; }
    el.innerHTML = rows.slice(0, 10).map(function (r) {
      return '<div class="rd-next-row"><span class="d">' + fmtShort(r.when) + '</span>' +
        '<span class="w">' + esc(r.who) + '</span><span class="k">' + esc(r.what) + '</span></div>';
    }).join('') + (rows.length > 10 ? '<div class="rd-quiet">and ' + (rows.length - 10) + ' more</div>' : '');
  }

  function refreshNavCounts(sig) {
    const by = {};
    (sig || []).forEach(function (s) { by[s.go] = (by[s.go] || 0) + s.n; });
    ['home', 'clients', 's60', 'priority', 'ltc', 'md'].forEach(function (k) {
      const el = $('#rdc-' + k);
      if (!el) return;
      const v = by[k] > 0 ? String(by[k]) : '';
      if (el.textContent !== v) el.textContent = v;
      el.classList.toggle('zero', !v);
    });
  }

  /* ── 7. GLOBAL SEARCH ─────────────────────────────────────────────────── */
  function mountPalette() {
    if ($('#rd-pal')) return;
    const d = document.createElement('div');
    d.id = 'rd-pal';
    d.innerHTML = '<div class="rd-pal-box" role="dialog" aria-modal="true" aria-label="Search">' +
      '<div class="rd-pal-top ti-skip">' + I('search') +
      '<input id="rd-pal-input" type="text" placeholder="Search clients, communities, pages…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="rd-pal-results">' +
      '<kbd>esc</kbd></div><div id="rd-pal-results" role="listbox"></div></div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (e) { if (e.target === d) closePalette(); });
    $('#rd-pal-input').addEventListener('input', renderPalette);
    $('#rd-pal-input').addEventListener('keydown', paletteKeys);
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
      if (e.key === 'Escape' && $('#rd-pal') && $('#rd-pal').classList.contains('open')) { e.preventDefault(); closePalette(); }
    });
  }
  let _palPrev = null;
  function openPalette() {
    const p = $('#rd-pal'); if (!p) return;
    _palPrev = document.activeElement;
    p.classList.add('open');
    const i = $('#rd-pal-input'); i.value = ''; i.focus();
    renderPalette();
  }
  function closePalette() {
    const p = $('#rd-pal'); if (p) p.classList.remove('open');
    if (_palPrev && _palPrev.focus) try { _palPrev.focus(); } catch (e) {}
  }

  // Permission scoping mirrors the application's own: a CSM sees their own
  // caseload, a CSC or director their market, a manager everything.
  function paletteItems() {
    const app = A();
    const items = [];
    const add = function (grp, label, sub, run, icon) { items.push({ grp: grp, label: label, sub: sub, run: run, icon: icon }); };

    $$('.nav-item').forEach(function (n) {
      if (n.style.display === 'none') return;
      const lab = (($('.nav-label', n) || n).textContent || '').trim();
      add('Pages', lab, '', function () { n.click(); }, NAV_ICON[n.dataset.page] || 'circle');
    });
    if (!app.ready) return items;
    const p = app.profile;
    try {
      const seen = {};
      const pushClient = function (c) {
        if (!c || seen[c.id || c.name]) return;
        seen[c.id || c.name] = 1;
        add('Clients', c.name, [c.loc, c.csm].filter(Boolean).join(' · '), function () { openClient(c.id); }, 'person');
      };
      if (p.isManager) {
        (app.profiles || []).forEach(function (pr) { (((app.data.profiles || {})[pr.id] || {}).clients || []).forEach(pushClient); });
      } else if (p.isCSC || p.isDirector) {
        const hub = app.selectedHub || (Array.isArray(p.hub) ? p.hub[0] : p.hub);
        (app.profiles || []).filter(function (pr) { return Array.isArray(pr.hub) ? pr.hub.indexOf(hub) > -1 : pr.hub === hub; })
          .forEach(function (pr) { (((app.data.profiles || {})[pr.id] || {}).clients || []).forEach(pushClient); });
      } else {
        (app.fn.get('clients') || []).forEach(pushClient);
      }
      const comms = (app.data.shared && app.data.shared.communities) || {};
      Object.keys(comms).forEach(function (n) {
        const cm = comms[n] || {};
        const multi = Array.isArray(p.hub) && p.hub.length > 1;
        if (!p.isManager && !multi && cm.market && p.market && cm.market !== p.market) return;
        add('Communities', n, cm.market || '', function () {
          const nv = $('.nav-item[data-page="coverage"]'); if (nv) nv.click();
          setTimeout(function () { if (typeof window.selectCommunity === 'function') selectCommunity(n); }, 80);
        }, 'community');
      });
      if (p.isManager) (app.profiles || []).forEach(function (pr) {
        add('People', pr.name, pr.role, function () { if (typeof window.openCSMDetail === 'function') openCSMDetail(pr.id); }, 'person');
      });
      if (typeof window.getCustomKB === 'function') {
        (getCustomKB() || []).forEach(function (k) {
          add('Guidance', k.title || k.q || 'Entry', 'Knowledge base',
            function () { const nv = $('.nav-item[data-page="assistant"]'); if (nv) nv.click(); }, 'book');
        });
      }
    } catch (e) { /* a partial palette beats a broken one */ }
    return items;
  }

  function openClient(id) {
    const nv = $('.nav-item[data-page="clients"]');
    if (nv) nv.click();
    setTimeout(function () {
      if (!document.getElementById('cm-det-' + id)) { _view = 'all'; renderTrackerList(); }
      setTimeout(function () {
        const det = document.getElementById('cm-det-' + id);
        if (det && det.style.display === 'none' && window.toggleClientDetail) toggleClientDetail(id);
        const row = det && det.closest ? det.closest('.rd-cl-row') : null;
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 100);
    }, 100);
  }

  let palSel = 0, palRows = [];
  function renderPalette() {
    const q = ($('#rd-pal-input').value || '').toLowerCase().trim();
    const all = paletteItems();
    const order = { Clients: 0, Communities: 1, Pages: 2, People: 3, Guidance: 4 };
    palRows = (q ? all.filter(function (i) { return (i.label + ' ' + (i.sub || '')).toLowerCase().indexOf(q) > -1; })
      : all.filter(function (i) { return i.grp === 'Pages'; }))
      .sort(function (a, b) { return (order[a.grp] - order[b.grp]) || String(a.label).localeCompare(String(b.label)); })
      .slice(0, 40);
    palSel = 0;
    const box = $('#rd-pal-results');
    if (!palRows.length) {
      box.innerHTML = '<div class="rd-pal-empty">' + (q ? 'Nothing matching “' + esc(q) + '”' : 'Start typing') + '</div>';
      return;
    }
    let html = '', grp = '';
    palRows.forEach(function (r, i) {
      if (r.grp !== grp) { grp = r.grp; html += '<div class="rd-pal-grp">' + esc(grp) + '</div>'; }
      html += '<button class="rd-pal-row' + (i === 0 ? ' sel' : '') + '" role="option" aria-selected="' + (i === 0) + '" data-i="' + i + '">' +
        '<span class="ic ti-skip">' + I(r.icon || 'circle') + '</span><span class="lb">' + esc(r.label) + '</span>' +
        (r.sub ? '<span class="r-sub">' + esc(r.sub) + '</span>' : '') + '</button>';
    });
    box.innerHTML = html;
    $$('.rd-pal-row', box).forEach(function (b) {
      b.addEventListener('click', function () { closePalette(); palRows[+b.dataset.i].run(); });
    });
  }
  function paletteKeys(e) {
    if (!palRows.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palRows.length) % palRows.length;
      $$('.rd-pal-row').forEach(function (b, i) {
        b.classList.toggle('sel', i === palSel);
        b.setAttribute('aria-selected', String(i === palSel));
      });
      const s = $$('.rd-pal-row')[palSel]; if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { e.preventDefault(); closePalette(); palRows[palSel].run(); }
  }

  /* ── 8. INTERACTION QUALITY ───────────────────────────────────────────── */
  // A product-shaped replacement for window.prompt / window.confirm. The
  // application's existing SYNCHRONOUS call sites are left on the native
  // dialogs deliberately — swapping those would change control flow, which
  // is a behaviour change, not a design one. Listed in TECH-DEBT.md.
  function rdDialog(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const wrap = document.createElement('div');
      wrap.className = 'mo open rd-dlg';
      wrap.innerHTML =
        '<div class="md' + (opts.wide ? ' rd-dlg-wide' : '') + '" style="width:' + (opts.width || (opts.wide ? 620 : 420)) + 'px;">' +
        '<div class="mh"><div class="mt">' + esc(opts.title || 'Confirm') + '</div></div>' +
        (opts.body ? '<p class="rd-dlg-b">' + esc(opts.body) + '</p>' : '') +
        // Trusted markup from the layer itself, never from user or Viv text —
        // everything interpolated into it has gone through esc() already.
        (opts.html ? '<div class="rd-dlg-h">' + opts.html + '</div>' : '') +
        (opts.input !== undefined ? '<div class="fg"><input class="fc" id="rd-dlg-in" value="' + esc(opts.input || '') + '"></div>' : '') +
        '<div class="rd-dlg-f">' +
        '<button class="btn btn-o" data-a="cancel">' + esc(opts.cancel || 'Cancel') + '</button>' +
        (opts.ok === '' ? '' :
          '<button class="btn ' + (opts.danger ? 'btn-d' : 'btn-p') + '" data-a="ok">' + esc(opts.ok || 'Confirm') + '</button>') +
        '</div></div>';
      document.body.appendChild(wrap);
      const input = wrap.querySelector('#rd-dlg-in');
      const okb = wrap.querySelector('[data-a="ok"]');
      if (input) { input.focus(); input.select(); } else if (okb) okb.focus();
      const done = function (v) { wrap.remove(); resolve(v); };
      wrap.addEventListener('click', function (e) {
        if (e.target === wrap) return done(opts.input !== undefined ? null : false);
        const a = e.target.closest('[data-a]');
        if (!a) return;
        done(a.dataset.a === 'ok' ? (opts.input !== undefined ? (input ? input.value : '') : true)
          : (opts.input !== undefined ? null : false));
      });
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') done(opts.input !== undefined ? null : false);
        if (e.key === 'Enter' && input) done(input.value);
      });
    });
  }


  /* ── 8b. THE MARKET SCREEN ────────────────────────────────────────────────
     A brand moment, not a utility screen. The emoji come out, the labels stop
     shouting abbreviations, and the illustration becomes the focal point.

     "MA CSM Hub / Massachusetts" becomes "Massachusetts / CSM Hub": the place
     is what you are choosing, and a premium product reads naturally rather
     than in initials.

     The house glyph above the title is removed rather than replaced. It was
     filling space, and the brief is right that whitespace is acceptable —
     the type carries it now.

     The original cards and their onclick handlers are left in place and
     restyled in situ, so selectHub() and every downstream route are
     untouched. */
  const MARKET_NAME = { MA: 'Massachusetts', CHI: 'Chicago', MD: 'Maryland' };

  // The approved mark. Three placements and no more: the market screen, the
  // sidebar, and the profile screen. The brief asks for branding used
  // sparingly, and a logo repeated on every surface is a watermark, not a
  // brand. Rendered with mix-blend-mode:multiply, which is how the
  // Transformation Map already places this same white-background file on a
  // warm canvas.
  function logoImg(cls) {
    const b = window.TributeBrand;
    if (!b) return '';
    return '<img class="rd-logo ' + (cls || '') + '" src="' + b.logo +
      '" alt="Tribute Home Care" width="' + b.logoW + '" height="' + b.logoH + '">';
  }

  function mountSidebarBrand() {
    const h1 = $('.sb-brand h1');
    if (!h1 || h1.dataset.rdLogo || !window.TributeBrand) return;
    h1.dataset.rdLogo = '1';
    h1.innerHTML = logoImg('sb');
    h1.classList.add('ti-skip');
  }

  function recomposeHubScreen() {
    const screen = $('#screen-hub');
    if (!screen || screen.dataset.rd) return;
    const cards = $$('.hub-card', screen);
    if (!cards.length) return;
    screen.dataset.rd = '1';

    const head = screen.firstElementChild;
    if (head) {
      head.classList.add('rd-hub-head');
      // The decorative house glyph: removed, not replaced.
      const glyph = head.firstElementChild;
      if (glyph && !glyph.tagName.match(/^H/) && (glyph.textContent || '').trim().length <= 3) glyph.remove();
      const h1 = $('h1', head), p = $('p', head);
      if (h1) {
        h1.removeAttribute('style');
        h1.classList.add('rd-hub-lockup', 'ti-skip');
        h1.innerHTML = logoImg('hub') + '<span class="rd-hub-product">CSM Hub</span>';
      }
      if (p) { p.removeAttribute('style'); p.textContent = 'Choose your market'; }
    }
    const row = cards[0].parentElement;
    if (row) { row.removeAttribute('style'); row.className = 'rd-hub-row'; }

    cards.forEach(function (card) {
      const key = (card.id || '').replace('hub-card-', '');
      const icon = $('.hub-icon', card);
      const name = $('.hub-name', card);
      const sub = $('.hub-sub', card);
      if (icon && window.TributeIcons) { icon.innerHTML = TributeIcons.market(key); icon.classList.add('ti-skip'); }
      // The place leads; "CSM Hub" is the quiet second line.
      if (name) name.textContent = MARKET_NAME[key] || (sub ? sub.textContent : name.textContent);
      if (sub) sub.textContent = 'CSM Hub';
      card.setAttribute('type', 'button');
    });
  }

  // The profile screen header echoes the chosen market with the same mark.
  function recomposeProfileScreen() {
    const em = $('#profile-hub-emoji');
    if (!em || !window.TributeIcons) return;
    const key = A().selectedHub;
    const want = key ? 'mk-' + key : '';
    if (em.dataset.rdMk === want) return;
    em.dataset.rdMk = want;
    em.classList.add('ti-skip', 'rd-hub-mark');
    em.innerHTML = key ? TributeIcons.market(key) : '';
    const t = $('#profile-hub-title');
    if (t && key) t.textContent = MARKET_NAME[key] || t.textContent;
  }

  /* ── 9. ICONS ─────────────────────────────────────────────────────────── */
  function swapIcons(root) {
    if (!window.TributeIcons) return;
    try { TributeIcons.swap(root || document.body); } catch (e) { /* never fatal */ }
  }

  // The greeting's wave emoji was the last application-authored emoji in the
  // operational interface. The brief is right that it is decoration standing
  // in for tone: "Good morning, Julia" at 27px with room around it is warmer
  // than a glyph, and nothing replaces it.
  function stripGreetingWave() {
    const g = $('#home-g');
    if (!g) return;
    const t = g.textContent || '';
    const clean = t.replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2190-\u2BFF]\uFE0F?/g, '').replace(/\s+$/, '');
    if (clean !== t) g.textContent = clean;
  }

  // The debounced tick was not enough. updateHome() writes the greeting, and
  // if no further mutation follows before the observer settles the wave is
  // still on screen — which is how a role switch during the regression sweep
  // caught "Good afternoon, Sam! \uD83D\uDC4B" on a run that was supposed to
  // assert zero emoji. Strip it the moment the application writes it.
  let _greetHooked = false;
  function hookGreeting() {
    if (_greetHooked || typeof window.updateHome !== 'function' || window.updateHome.__rd) return;
    const orig = window.updateHome;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      try { stripGreetingWave(); } catch (e) {}
      return r;
    };
    wrapped.__rd = true; wrapped.original = orig;
    window.updateHome = wrapped;
    _greetHooked = true;
  }

  function retuneStaleNote() {
    $$('body > div').forEach(function (b) {
      if (b.id === 'rd-stale-note' || !/saved copy of the CSM Hub/.test(b.textContent || '')) return;
      b.id = 'rd-stale-note';
      b.removeAttribute('style');
      b.textContent = 'REDESIGN PROTOTYPE — not the live CSM Hub, and none of this data is real.';
    });
    const build = $('#sb-build');
    if (build && /not the live hub/.test(build.textContent || '')) {
      build.textContent = build.textContent.replace('not the live hub', 'redesign prototype');
    }
  }

  /* ── 10. WIRING AND PERFORMANCE ───────────────────────────────────────── */
  // Pass 1 polled every 2.5s and re-walked the DOM each time. This version is
  // observer-driven with a debounce, every decoration is idempotent behind a
  // dataset flag, both render paths compare a key before touching the DOM,
  // and mutations this layer caused are ignored so decoration cannot
  // re-trigger decoration. One 30s timer remains as a safety net.
  const perf = { ticks: 0, totalMs: 0, lastMs: 0, maxMs: 0, bootMs: 0, byReason: {} };

  let _decorating = false;
  // Subtrees the observer saw change since the last tick. The icon swap
  // walks only these, because the hub never unmounts a page: once every page
  // has rendered once, a whole-document walk is several thousand text nodes
  // and it costs ~150ms. Scoped, it costs almost nothing.
  let _dirty = new Set();
  let _firstSwapDone = false;

  function tick(reason) {
    const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    perf.ticks++;
    perf.byReason[reason] = (perf.byReason[reason] || 0) + 1;
    _decorating = true;
    try {
      rebuildNav();
      tidyNav();
      mountTop();
      installTracker();
      if (window.TributeWorkflows) window.TributeWorkflows.install();
      restructureHome();
      refreshTop();
      retuneStaleNote();
      mountSidebarBrand();
      recomposeHubScreen();
      recomposeProfileScreen();
      if (!_firstSwapDone) { swapIcons(document.body); _firstSwapDone = true; }
      else {
        // Always the active page: it is one subtree, it is the only thing on
        // screen, and a page re-rendered by a profile switch has new content
        // the mutation list may not have attributed to it. A sticky
        // "already swapped" flag per page was tried and was wrong for
        // exactly that case.
        const activePage = $('.page.active');
        if (activePage) swapIcons(activePage);
        _dirty.forEach(function (n) {
          if (n && n.isConnected && (!activePage || !activePage.contains(n))) swapIcons(n);
        });
      }
      _dirty.clear();
      markHeadings();
      hookGreeting();
      stripGreetingWave();
      const home = $('#page-home');
      if (home && home.classList.contains('active')) renderAttention();

      if (window.TributeRouter && !TributeRouter.enabled && A().ready) TributeRouter.start();
      hookShowPage();
    } catch (e) {
      console.warn('[redesign] non-fatal in tick(' + reason + '):', e && e.message);
    }
    // Release on the next task, so mutations this tick caused are observed
    // while the flag is still set and therefore ignored.
    setTimeout(function () { _decorating = false; }, 0);
    const ms = ((window.performance && performance.now) ? performance.now() : Date.now()) - t0;
    perf.lastMs = ms; perf.totalMs += ms;
    if (perf.ticks === 1) perf.bootMs = ms;            // the first pass walks the whole document
    else if (ms > perf.maxMs) perf.maxMs = ms;         // steady-state peak, reported separately
  }

  // showPage only toggles classes when a page's content already exists, and
  // a class change is an `attributes` mutation, which this layer does not
  // observe. So re-opening a page that was first built while inactive fired
  // no tick and it kept its original glyphs. Hook the navigation itself.
  function hookShowPage() {
    if (typeof window.showPage !== 'function' || window.showPage.__rdSwap) return;
    const orig = window.showPage;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      const pg = $('.page.active');
      if (pg) swapIcons(pg);
      return r;
    };
    wrapped.__rdSwap = true;
    window.showPage = wrapped;
  }

  function boot() {
    mountPalette();
    hookShowPage();
    tick('boot');
    let t = null;
    const mo = new MutationObserver(function (muts) {
      let relevant = false;
      for (let i = 0; i < muts.length; i++) {
        const tgt = muts[i].target;
        if (!tgt || !tgt.closest) continue;
        if (tgt.closest('#rd-pal, #rd-top, #proto-bar, .rd-dlg, .rd-cw-rail, #rd-views')) continue;
        relevant = true;
        // Record the subtree so the icon pass can be scoped to it.
        _dirty.add(tgt.nodeType === 1 ? tgt : tgt.parentElement);
        if (_dirty.size > 40) { _dirty.clear(); _dirty.add(document.body); break; }
      }
      if (!relevant || _decorating) return;
      clearTimeout(t);
      t = setTimeout(function () { tick('mutation'); }, 90);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    setInterval(function () { tick('heartbeat'); }, 30000);
    window.addEventListener('hashchange', function () { setTimeout(function () { tick('hash'); }, 60); });

  }

  window.TributeRedesign = {
    perf: perf,
    select: function (cid) { if (_selected !== cid) selectClient(cid); },
    deselect: function () { if (_selected) deselectClient(); },
    get selected() { return _selected; },
    get section() { return _section; },
    // perf.maxMs is a session high-water mark. Switching role in-session is
    // a prototype-only operation (production reloads), and it re-decorates
    // the whole document, so without a reset every later role inherits that
    // one peak and the measurement stops meaning anything.
    resetPerf: function () { perf.ticks = 0; perf.totalMs = 0; perf.lastMs = 0; perf.maxMs = 0; perf.byReason = {}; },
    dialog: rdDialog,
    // Shared with prototype/workflows.js so the three redesigned
    // workflow screens draw from exactly one set of primitives.
    ui: { esc: esc, icon: I, fmtShort: fmtShort, plural: plural,
          illustration: illustration, art: ART, daysSince: daysSince },
    setView: function (v) { _view = v; renderTrackerList(); },
    get view() { return _view; },
    renderTracker: renderTrackerList,
    renderWorkspace: renderWorkspace,
    tidyNav: tidyNav,
    renderAttention: function () { _attnKey = ''; renderAttention(); },
    caseload: function () { return A().myClients ? A().myClients() : []; },
    // Extension points for prototype/workflows.js: a Home signal source and
    // extra blocks inside a client workspace area.
    signalSources: [],
    areaBlocks: { schedule: [], communication: [], care: [], overview: [], more: [] },
    exceptionFor: exceptionFor,
    trackerRows: trackerRows,
    tick: tick
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
