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
    emailcomm: 'community', assistant: 'sparkle', expectations: 'flag',
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
  /* Three groups, because a CSM is responsible for CLIENTS and everything
     else is a tool for caring for them. Work is the day. Operations is the
     machinery behind it. Tools are what you reach for. Six headings over ten
     destinations was the rail describing itself; three is the rail getting
     out of the way. Visibility is still decided by the application's own
     role rules — nothing here grants or hides a capability. */
  const GROUPS = [
    ['Work', [['home', 'Home'], ['clients', 'Clients'], ['coverage', 'Coverage'],
              ['s60', 'Onboarding'], ['priority', 'Fill Priority'], ['pulse', 'Client Pulse']]],
    ['Operations', [['md', 'Maryland Compliance'], ['ltc', 'LTC'],
                    ['emailcomm', 'Communities'], ['team', 'Team'],
                    ['__metrics', 'Daily Metrics'], ['__sereview', 'Exception Review']]],
    ['Tools', [['assistant', 'Assistant'], ['kpi', 'KPI Tracker'],
               ['expectations', 'Role Expectations'],
               ['__guide', 'Guide'], ['__feedback', 'Feedback']]]
  ];
  /* Two rail entries that are not pages. They open the capability the Hub
     already has — one Guide, one Feedback sheet — rather than a second
     implementation of either. */
  const NAV_EXTRA = {
    // The Guide is a Hub destination now, not a second browser tab, so it is
    // built as an ordinary nav item: the router's permission model works by
    // routing THROUGH the rail, and it needs a real onclick to route through.
    __guide: { icon: 'book', id: 'v2-guide-link', page: 'guide',
               ok: function () { return !!window.TributeGuide; } },
    __feedback: { icon: 'conversation', id: 'v2-nav-feedback',
                  ok: function () { return !!(window.TributeApp && window.TributeApp.feedback); },
                  /* A tester sends feedback; the people running the pilot read
                     it. Same nav item, because asking someone to remember a
                     second one during a pilot is how it goes unread. The
                     server decides who may actually see submissions - this
                     only decides which panel opens first. */
                  go: function () {
                    const A = window.TributeApp, fb = A && A.feedback;
                    if (!fb) return;
                    let admin = false;
                    try {
                      const me = String(((A.account || {}).username) || '').toLowerCase();
                      admin = (A.adminUpns || []).some(u => String(u).toLowerCase() === me);
                    } catch (e) {}
                    if (admin && fb.openInbox) fb.openInbox(); else fb.open();
                  } },

    /* Courtney's daily metrics. ok() is the access gate as well as the
       presence check: the rail does not show a destination the signed-in
       person cannot open, and the module refuses on its own account too, so
       hiding the nav item is not the only thing standing in the way. */
    __metrics: { icon: 'chart', id: 'v2-nav-metrics', page: 'metrics',
                 ok: function () {
                   return !!(window.TributeMetrics && window.TributeMetrics.allowed());
                 } },
    /* Every client Service Exception, read for what it describes, and the
       complaints heard in CSM email that never became one. Same gate as
       Daily Metrics; the server keeps its own list as well. */
    __sereview: { icon: 'conversation', id: 'v2-nav-sereview', page: 'sereview',
                  ok: function () {
                    return !!(window.TributeSEReview && window.TributeSEReview.allowed());
                  } }
  };

  const NAV_ID = { pulse: 'nav-pulse', team: 'nav-team', md: 'nav-md' };

  function rebuildNav() {
    const navEl = $('.sb-nav');
    if (!navEl || navEl.dataset.rd) return;
    const original = {};
    $$('.nav-item', navEl).forEach((el) => {
      const m = /showPage\('([a-z0-9]+)'/.exec(el.getAttribute('onclick') || '');
      if (m) original[m[1]] = el;
    });
    const frag = document.createDocumentFragment();

    GROUPS.forEach(function (g) {
      const title = g[0], items = g[1];
      const present = items.filter(function (it) {
        const x = NAV_EXTRA[it[0]];
        if (x) return x.ok();
        return original[it[0]] || it[0] === 'expectations';
      });
      if (!present.length) return;
      const h = document.createElement('div'); h.className = 'nav-sec'; h.textContent = title; frag.appendChild(h);

      present.forEach(function (it) {
        const key = it[0], label = it[1];
        const extra = NAV_EXTRA[key];
        let el = original[key];
        if (extra) {
          el = document.createElement('div');
          el.className = 'nav-item';
          el.id = extra.id;
          if (extra.page) {
            el.setAttribute('onclick', "showPage('" + extra.page + "',this)");
            el.dataset.page = extra.page;
          } else {
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.addEventListener('click', function () { try { extra.go(); } catch (e) {} });
            el.addEventListener('keydown', function (ev) {
              if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); try { extra.go(); } catch (e) {} }
            });
          }
          const ic = document.createElement('span'); ic.className = 'nav-icon';
          ic.innerHTML = I(extra.icon); el.appendChild(ic);
          const lb = document.createElement('span'); lb.className = 'nav-label'; lb.textContent = label;
          el.appendChild(lb);
          frag.appendChild(el);
          return;
        }
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
    /* V1's launchProfile still reaches for the nav elements this rail
       replaced, and sets .style.display on them for every profile it opens.
       NAV_ID keeps nav-pulse / nav-team / nav-md alive for exactly that
       reason; #mgr-sec was missed, so the moment the rail had been rebuilt
       once, switching profile threw

         Cannot read properties of null (reading 'style')

       inside launchProfile, ABOVE `await loadDataFromFile()`. The shared
       document was then never reloaded for the profile being opened, and
       the Viv sync, the landing page and the welcome never ran. A silent
       half-opened profile, from a console error nobody was watching.

       So the node is kept rather than dropped: parked in a hidden holder
       where V1 can keep writing to its style harmlessly. The holder is
       display:none on the PARENT, so it stays hidden whatever V1 sets on
       the child. The new rail draws its own section headings. */
    const keep = document.createDocumentFragment();
    ['mgr-sec'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) keep.appendChild(el);
    });

    navEl.innerHTML = '';
    navEl.appendChild(frag);
    if (keep.childNodes.length) {
      const holder = document.createElement('div');
      holder.style.display = 'none';
      holder.dataset.rdKeep = '1';
      holder.appendChild(keep);
      navEl.appendChild(holder);
    }
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
  /* The rail is built once. Guide and Feedback come from layers that are only
     present in the deployed build, and if either of them finished loading
     after that one build the entry would be missing for the whole session
     with nothing to say why. Cheap to check, so it is checked. */
  function ensureNavExtras() {
    const navEl = $('.sb-nav');
    if (!navEl || !navEl.dataset.rd) return;
    Object.keys(NAV_EXTRA).forEach(function (key) {
      const x = NAV_EXTRA[key];
      if (!x.ok() || document.getElementById(x.id)) return;
      const label = (GROUPS.reduce(function (a, g) { return a.concat(g[1]); }, [])
        .find(function (it) { return it[0] === key; }) || [key, key])[1];
      const el = document.createElement('div');
      el.className = 'nav-item'; el.id = x.id;
      if (x.page) {
        el.setAttribute('onclick', "showPage('" + x.page + "',this)");
        el.dataset.page = x.page;
      } else {
        el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
        el.addEventListener('click', function () { try { x.go(); } catch (e) {} });
        el.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); try { x.go(); } catch (e) {} }
        });
      }
      el.innerHTML = '<span class="nav-icon">' + I(x.icon) + '</span>' +
                     '<span class="nav-label">' + esc(label) + '</span>';
      navEl.appendChild(el);
    });
  }

  function tidyNav() {
    const navEl = $('.sb-nav');
    if (!navEl || !navEl.dataset.rd) return;
    ensureNavExtras();
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
      // Three groups all survive for every role now: the thinnest caseload
      // still sees Home / Clients / Coverage / Success in 30 / Fill Priority
      // under Work and at least LTC and Community Email under Operations. The
      // rule is kept anyway, because a future permission change could empty
      // one and a heading over a single item is noise.
      if (live.length === 1 && prev) { g.head.style.display = 'none'; }
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
  /* COURTNEY'S ORDER, IN HER WORDS (3 Nov): "all clients", "needs attention",
     "success in 30", "due soon", "coverage updates". All five views already
     existed; she asked for the order and two of the names, and she was right
     to call it a reorder. "Success in 30" rather than "Onboarding" because
     the PAGE became Onboarding and she asked to keep the Success in 30 plan
     at the client level, which is what this view is.

     The landing view stays Needs attention. She asked where the tabs sit,
     not which one opens, and opening on what needs action is the more useful
     default. Easy to flip if she wants the first tab to lead. */
  /* COVERAGE UPDATES IS GONE (Courtney, 17 Nov). She asked for it on 3 Nov
     and asked for it back out two weeks later, with the reason: "Coverage
     updates duplicates the Coverage page. One home for coverage." That is the
     same rule as the rest of her review, applied to a tab she had asked for,
     so it goes. Coverage readiness lives on the Coverage page, which now also
     holds handing off, and the client's own coverage note is on Summary. */
  const VIEWS = [
    ['all', 'All clients'],
    ['attention', 'Needs attention'],
    ['onboarding', 'Success in 30'],
    ['soon', 'Due soon']
  ];
  const CM_SEARCH_PLACEHOLDER = 'Search a client, a family contact, a caregiver, a care manager\u2026';
  let _view = 'attention';
  /* Urgency is the default sort and stays it; a column the reader picked beats
     a ranking they cannot see, so these hold what they picked. */
  let _sortKey = '', _sortDir = 'asc';
  let _selected = null;
  let _section = 'overview';
  let _showAdmin = false;

  /* EVERYTHING KNOWN ABOUT A CLIENT THAT A CSM MIGHT TYPE. Built in one
     place so the list and the search palette cannot disagree about what is
     findable, which was the whole shape of the counts problem a week ago.

     vivContactsFor() returns only what is already in hand. It never triggers
     a read: forty clients fetched on every keystroke would be forty Viv calls
     per letter. So phone search is complete for clients opened this session
     and partial otherwise, which is a limit worth fixing at the source rather
     than papering over here. */
  function vivContactsFor(c) {
    if (!c || !c.vivId || !window.TributeClientData) return [];
    const out = [];
    /* The whole caseload's contacts, from one read primed at startup. Without
       it this function could only answer for clients already opened, and the
       Hub's own contact fields are empty on every record, so the search had
       nothing to find. TributeClientData.contacts() prefers the full client
       read where one is loaded and falls back to the bulk answer. */
    try {
      (TributeClientData.contacts(c.vivId) || []).forEach(function (x) {
        if (x && (x.name || x.phone)) out.push(x);
      });
    } catch (e) { /* a search that finds less beats a list that throws */ }
    // The care team only comes from the full read: it is the schedule
    // grouped, and no crawl carries it.
    let snap = null;
    try { snap = TributeClientData.client(c.vivId); } catch (e) { snap = null; }
    const d = snap && snap.state === 'ready' && snap.data;
    if (d) (d.careTeam || []).forEach(function (x) {
      if (x && x.name) out.push({ name: x.name, role: 'caregiver' });
    });
    return out;
  }

  /* Asked when the roster is known, never on a keystroke, and asked again
     while the answer is not in hand.

     The first version asked once and gave up. Two things make one attempt
     wrong: the cache can be warming, which is a "not yet" rather than a "no";
     and this runs from the first list render, which on a cold load happens
     before the app has published its proxy URL, so the very first attempt
     fails for a reason that has nothing to do with contacts. Measured live,
     that is exactly what happened: the state read `failed` while the same
     request by hand returned 202 immediately afterwards.

     Bounded in both directions. Not more than once every twenty seconds, so
     typing in the search box cannot turn this into a request per keystroke,
     and not more than a few times in all, so a genuinely broken endpoint is
     not retried forever. */
  let _primeAt = 0, _primeTries = 0;
  const PRIME_GAP = 20000, PRIME_MAX = 6;
  function primeContacts() {
    if (!window.TributeClientData || !TributeClientData.primeContacts) return;
    const st = TributeClientData.contactsState ? TributeClientData.contactsState() : '';
    if (st === 'ready' || st === 'loading') return;
    if (_primeTries >= PRIME_MAX) return;
    if (Date.now() - _primeAt < PRIME_GAP) return;
    let cl = [];
    try { cl = A().fn.get('clients') || []; } catch (e) { return; }
    const ids = cl.map(function (c) { return c.vivId; }).filter(Boolean);
    if (!ids.length) return;
    _primeAt = Date.now(); _primeTries++;
    try {
      TributeClientData.primeContacts(ids).then(function () {
        // The list may be on screen with a search already typed in it.
        if (_view !== undefined) renderTrackerList();
      });
    } catch (e) {}
  }
  // Digits only, so 617-555-0142, (617) 555 0142 and 6175550142 all match.
  const digits = function (v) { return String(v == null ? '' : v).replace(/\D+/g, ''); };
  function clientHaystack(c) {
    const parts = [c.name, c.loc, c.city, c.notes, c.contact, c.contactEmail,
                   c.caregivers, (c.gcm && c.gcm !== 'none' ? c.gcm : ''), c.address, c.csm];
    vivContactsFor(c).forEach(function (x) {
      parts.push(x.name, x.email, x.relation || x.relationship, x.phone, digits(x.phone));
    });
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  /* WHAT "NEEDS ACTION" MEANS, IN ONE PLACE.
     Courtney's third rule: "The numbers have to match. If the badge says 9,
     the list under it has 9 clients in it." And her complaint: "CSMs stop
     trusting the Hub fast if 17, 18 and 42 all mean needs attention."

     This used to be the cadence exception alone. The Today's list, built to
     her section-2 spec, also puts an unsorted Pulse flag in Need action
     today — correctly: a client taken by paramedics needs the CSM whatever
     their visit cadence says, which is her priority 1. The two agreed only
     while Pulse was failing to load. The moment it loaded, Home read 38 and
     the Clients badge read 16, both labelled as needing action.

     So one definition, asked by the Home tile, the Clients tab, the rail
     badge and the Today's list. Due soon is then everything else that is
     merely warned about, which keeps the two a partition rather than two
     overlapping counts. */
  function pulseOpen(c) {
    if (c.pulseAck) return false;                 // sorted is not unsorted
    const pp = pulseFor(c);
    return !!(pp && pp.level && pp.level !== 'green');
  }
  function needsAction(c) {
    const e = exceptionFor(c);
    if (e && e.tone === 'bad') return true;
    return pulseOpen(c);
  }
  function dueSoonOnly(c) {
    if (needsAction(c)) return false;
    const e = exceptionFor(c);
    return !!(e && e.tone === 'warn');
  }

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
      /* A client's market is Viv's gcity, which is CITY level: Boston,
         MetroWest Boston, North of Boston, South of Boston. Nothing in
         production carries the literal 'Massachusetts', so comparing against
         it matched only clients with a blank market and the Massachusetts
         filter returned nothing at all. Chicago worked by coincidence,
         because there the city and the state filter share a name.
         Reported by a CSM on pilot day. */
      const MARKETS_IN = {
        Massachusetts: ['Massachusetts', 'Boston', 'MetroWest Boston', 'North of Boston', 'South of Boston'],
        Chicago: ['Chicago', 'Illinois'],
      };
      const want = MARKETS_IN[app.juliaMarket] || [app.juliaMarket];
      clients = clients.filter(function (c) {
        // A blank market still falls to Massachusetts, as it did before.
        return want.indexOf(c.market || 'Massachusetts') > -1;
      });
    }
    /* THE STATUS DROPDOWN IS GONE, because the tabs already do it.
       Courtney, 17 Nov: "Three filter systems stacked on top of each other...
       The Status dropdown ('Any overdue', 'Due within 14 days') does the same
       thing as the tabs." It was worse than redundant: "Due Within 14 Days"
       filtered on ANY exception, so it and the Needs attention tab disagreed
       about what they were showing. Search, Tier and Market remain. */
    const qEl = $('#cm-search'), tEl = $('#cm-tier');
    const q = (qEl ? qEl.value : '').toLowerCase().trim();
    const tf = tEl ? tEl.value : '';
    let list = clients.map(function (c) { return { c: c, ex: exceptionFor(c) }; });
    /* SEARCH REACHES THE PEOPLE AROUND THE CLIENT (Courtney, priority 12):
       "Search covers family contacts, GCMs, caregivers and phone numbers, not
       just clients. When a daughter calls, the CSM knows her name, not always
       the client's."

       A daughter's name typed here now finds her mother. So does a care
       manager's name, a caregiver's, and any phone number the Viv read has
       already brought back for a client this session. The Hub's own record
       (contact, contactEmail, caregivers, gcm) is always searchable; Viv's
       fuller contact list is searchable for clients that have been opened,
       and clientHaystack() says which is which. */
    if (q) list = list.filter(function (r) { return clientHaystack(r.c).indexOf(q) > -1; });
    if (tf) list = list.filter(function (r) { return r.c.tier === tf; });
    // Same partition as the counts above: the list under a tab has to hold
    // exactly what the tab's number says.
    if (_view === 'attention') list = list.filter(function (r) { return needsAction(r.c); });
    else if (_view === 'soon') list = list.filter(function (r) { return dueSoonOnly(r.c); });
    else if (_view === 'onboarding') list = list.filter(function (r) { return r.c.startDate && (daysSince(r.c.startDate) || 999) <= 30; });

    /* SORTING. Urgency first is the right default and stays the default, but
       she asked to be able to sort by next visit due, start date and A to Z
       ("Sort the client list" was also an action item from 12 Nov). A column
       the reader chose beats a ranking they cannot see. */
    const dir = _sortDir === 'desc' ? -1 : 1;
    const byName = function (a, b) { return String(a.c.name).localeCompare(String(b.c.name)); };
    const nullsLast = function (v) { return v == null || v === '' ? '￿' : String(v); };
    if (_sortKey === 'name') list.sort(function (a, b) { return dir * byName(a, b); });
    else if (_sortKey === 'tier') list.sort(function (a, b) {
      const o = { High: 0, Medium: 1, Low: 2 };
      return dir * ((o[a.c.tier] == null ? 9 : o[a.c.tier]) - (o[b.c.tier] == null ? 9 : o[b.c.tier])) || byName(a, b); });
    else if (_sortKey === 'last') list.sort(function (a, b) {
      return dir * nullsLast(a.c.lastVisit).localeCompare(nullsLast(b.c.lastVisit)) || byName(a, b); });
    else if (_sortKey === 'next') list.sort(function (a, b) {
      return dir * nullsLast(nextVisit(a.c)).localeCompare(nullsLast(nextVisit(b.c))) || byName(a, b); });
    else if (_sortKey === 'start') list.sort(function (a, b) {
      return dir * nullsLast(a.c.startDate).localeCompare(nullsLast(b.c.startDate)) || byName(a, b); });
    else if (_sortKey === 'community') list.sort(function (a, b) {
      return dir * nullsLast(a.c.loc || a.c.city).localeCompare(nullsLast(b.c.loc || b.c.city)) || byName(a, b); });
    else list.sort(function (a, b) {
      const ra = a.ex ? a.ex.rank : 99, rb = b.ex ? b.ex.rank : 99;
      return ra - rb || byName(a, b);
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

    // The CSP branch of the original renderer repurposes #cm-tier as a CSM
    // filter and its non-CSP branch restores it; the override skips the
    // original, so restore it here exactly as the application does.
    const tierSel = $('#cm-tier');
    if (tierSel && !Array.prototype.some.call(tierSel.options, function (o) { return o.value === 'High'; })) {
      const keep = tierSel.value;
      tierSel.innerHTML = '<option value="">All Tiers</option><option value="High">High Need</option>' +
        '<option value="Medium">Medium Need</option><option value="Low">Low Need</option>';
      tierSel.value = Array.prototype.some.call(tierSel.options, function (o) { return o.value === keep; }) ? keep : '';
    }

    mountSplit();
    syncSplitPanes();
    primeContacts();

    /* A search people do not know they can run is a search that does not
       exist. The box reaches family contacts, care managers and caregivers
       now, so it has to say so. Set from here rather than in index.html,
       because V1 runs its own renderer and there the old wording is still
       the truth. */
    const sEl = $('#cm-search');
    if (sEl && sEl.placeholder !== CM_SEARCH_PLACEHOLDER) sEl.placeholder = CM_SEARCH_PLACEHOLDER;

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
    /* THE NUMBERS HAVE TO MATCH, which is Courtney's third rule (17 Nov):
       "If the badge says 9, the list under it has 9 clients in it."

       Needs attention counted EVERY exception and Due soon counted the
       warnings, so Due soon's clients were inside Needs attention's count as
       well. Home meanwhile counts only the bad ones as needing action. Three
       numbers, overlapping, all labelled as if they meant the same thing:
       "CSMs stop trusting the Hub fast if 17, 18 and 42 all mean needs
       attention".

       The two now partition the exceptions. Needs attention is the bad ones,
       which is what Home has always called needing action, and Due soon is the
       warnings. Nothing is counted twice and the tab agrees with the tile. */
    const counts = {
      all: all.length,
      attention: all.filter(needsAction).length,
      soon: all.filter(dueSoonOnly).length,
      onboarding: all.filter(function (c) { return c.startDate && (daysSince(c.startDate) || 999) <= 30; }).length
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

    /* A client the filter has just excluded must not stay open beside the
       list. Switching market used to leave the previous client selected and
       rendered in the workspace, so Massachusetts could show an empty list
       next to an open Chicago client. Reported by a CSM on pilot day. */
    if (_selected && !rows.some(function (r) { return r.c.id === _selected; })) {
      _selected = null;
    }

    if (!rows.length) { el.innerHTML = emptyState(all.length); renderWorkspace(); return; }

    /* TWO SHAPES, ONE LIST.
       Courtney asked for a table: "Rows don't tell you enough. Name, community,
       one status. To see the tier, the last visit, or who to call, you have to
       open the client." Seven columns need the full width, and the moment a
       client is open this pane is a third of the screen — which is why she also
       asked for the client to open as its own page. Until it does, the table is
       what you get with nothing selected and the compact list is what you get
       beside an open client. Same rows, same order, same filters. */
    /* THE CLIENT IS ITS OWN PAGE NOW (Courtney, 17 Nov, section 3): "Client
       opens as its own full page." Her complaint was concrete: "Opening a
       client keeps the whole list header above it. The client name starts
       halfway down the screen under the search bar and filters."

       So selection no longer splits the screen, it replaces it. The list,
       the view tabs, the market chips and the page's own filter bar all go,
       The compact list that used to sit beside an open client went with the
       split: nothing renders it any more, and a second shape of the same list
       kept for a layout that no longer exists is just code to mislead.

       With nothing selected the workspace pane is hidden outright rather than
       holding an empty panel: "On the tabs, an empty 'Choose a client to see
       how they are doing' panel also sits under the list." */
    el.innerHTML = clientListTable(rows);

    rows.forEach(function (r) { ensureCompat(r.c.id); });
    $$('[data-cid]', el).forEach(function (b) {
      b.addEventListener('click', function () { selectClient(b.dataset.cid); });
    });
    $$('[data-sort]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        const k = b.dataset.sort;
        if (_sortKey === k) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
        else { _sortKey = k; _sortDir = 'asc'; }
        renderTrackerList();
      });
    });
    renderWorkspace();
  }

  /* Her columns: Client, Tier, Status and why, Last visit, Next due, Family
     contact, Community. Sortable by the ones worth sorting by.

     THE FAMILY CONTACT IS THE HUB'S OWN RECORD, not the Viv read. The Viv
     contact is fetched per client when you open one, and fetching it for forty
     rows to fill a column would be a Viv call per client on every keystroke in
     the search box. So this is what the CSM recorded, and an email is a real
     mailto. A phone number needs the Viv read, so there is no Call button
     here pretending it can dial. */
  const CL_COLS = [['name', 'Client'], ['tier', 'Tier'], ['', 'Status'],
                   ['last', 'Last visit'], ['next', 'Next due'],
                   ['', 'Family contact'], ['community', 'Community']];
  function clientListTable(rows) {
    const head = CL_COLS.map(function (col) {
      const k = col[0];
      if (!k) return '<th scope="col">' + esc(col[1]) + '</th>';
      const on = _sortKey === k;
      return '<th scope="col" aria-sort="' + (on ? (_sortDir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' +
        '<button type="button" data-sort="' + k + '">' + esc(col[1]) +
        (on ? '<span class="rd-clt-ar">' + (_sortDir === 'asc' ? '↑' : '↓') + '</span>' : '') +
        '</button></th>';
    }).join('');
    const body = rows.map(function (r) {
      const c = r.c, ex = r.ex;
      const nv = nextVisit(c);
      // An assessment due inside a week is marked, which was an action item
      // from 12 Nov and is the one row state worth catching at a glance.
      const newish = c.startDate && (daysSince(c.startDate) || 999) <= 30;
      // daysSince is negative for a future date, so days-until is its negation.
      const until = nv ? -daysSince(nv) : null;
      const soonAsmt = newish && until !== null && until >= 0 && until <= 7;
      const mail = c.contactEmail
        ? '<a href="mailto:' + esc(c.contactEmail) + '" onclick="event.stopPropagation()">Email</a>' : '';
      return '<tr class="rd-clt-row' + (soonAsmt ? ' due' : '') + '" data-cid="' + esc(c.id) + '" tabindex="0">' +
        '<th scope="row"><span class="rd-clt-n">' + esc(c.name) + '</span>' +
          (soonAsmt ? '<span class="rd-clt-tag">Assessment due</span>' : '') + '</th>' +
        '<td>' + (c.tier ? esc(c.tier) : '<span class="rd-ws-quiet">—</span>') + '</td>' +
        '<td>' + (ex ? '<span class="rd-cl-ex ' + ex.tone + '">' + esc(ex.text) + '</span>' : '') + '</td>' +
        '<td>' + (c.lastVisit ? esc(fmtShort(c.lastVisit)) : '<span class="rd-ws-quiet">None</span>') + '</td>' +
        '<td>' + (nv ? esc(fmtShort(nv)) : (c.freq === 'NA' ? '<span class="rd-ws-quiet">No cadence</span>' : '')) + '</td>' +
        '<td class="rd-clt-con">' + (c.contact ? esc(c.contact) : '') +
          (mail ? '<span class="rd-clt-act">' + mail + '</span>' : '') + '</td>' +
        '<td>' + esc([c.loc, c.city].filter(Boolean).join(', ')) + '</td>' +
        '</tr>';
    }).join('');
    return '<div class="rd-clt-wrap"><table class="rd-clt"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
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

  /* WHERE AM I, AND WHAT IS EITHER SIDE OF ME (Courtney, 17 Nov, section 3):
     "A bar across the top has a clear '← Back to [list name]' button that
     returns to the same tab and filter, and Prev / Next buttons with the
     client's name ('Next · Vance ›', '2 of 9') so CSMs can move through the
     list they came from without going back each time."

     Read from trackerRows() rather than from a copy taken at selection time,
     so Prev and Next follow the list as it stands: the same search, the same
     tier, the same tab, the same sort. _view and the filters are never
     cleared by opening a client, which is what makes Back land where she
     left. A client the filter no longer matches has no position, and the
     controls say so by not being there. */
  function viewName() {
    const v = VIEWS.filter(function (x) { return x[0] === _view; })[0];
    return v ? v[1] : 'Clients';
  }
  function listPos(cid) {
    let rows;
    try { rows = trackerRows(); } catch (e) { return null; }
    if (!rows || !rows.length) return null;
    let i = -1;
    for (let k = 0; k < rows.length; k++) if (rows[k].c.id === cid) { i = k; break; }
    if (i < 0) return null;
    return { i: i, n: rows.length,
             prev: i > 0 ? rows[i - 1].c : null,
             next: i < rows.length - 1 ? rows[i + 1].c : null };
  }
  function seqBtn(dir, c) {
    const word = dir === 'prev' ? 'Prev' : 'Next';
    if (!c) {
      return '<button type="button" class="rd-cw-step" disabled aria-label="No ' +
        (dir === 'prev' ? 'earlier' : 'later') + ' client in this list">' +
        (dir === 'prev' ? '‹' : '›') + '</button>';
    }
    const label = dir === 'prev'
      ? '‹<span>' + esc(word) + ' · ' + esc(c.name) + '</span>'
      : '<span>' + esc(word) + ' · ' + esc(c.name) + '</span>›';
    return '<button type="button" class="rd-cw-step" data-seq="' + esc(c.id) + '" title="' +
      esc(word + ': ' + c.name) + '">' + label + '</button>';
  }

  /* ONE PLACE DECIDES WHAT PANES EXIST, and everything that changes the
     selection calls it. When only renderTrackerList set `no-ws`, selecting a
     client left it on: the workspace rendered its 8KB of HTML into a pane the
     stylesheet had hidden, so the page went blank with the client's own route
     in the address bar. Found by opening it. */
  function syncSplitPanes() {
    const sp = $('#rd-split');
    if (!sp) return;
    sp.classList.toggle('no-ws', !_selected);
    sp.classList.toggle('has-sel', !!_selected);
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
    // The list is a table now, and the open client replaces it rather than
    // sitting beside it, so this marks the row you will come back to.
    $$('#client-master-table [data-cid]').forEach(function (b) {
      const on = b.dataset.cid === cid;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-selected', String(on));
    });
    syncSplitPanes();
    renderWorkspace();
    announceSelection(cid);
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
    $$('#client-master-table [data-cid]').forEach(function (b) { b.classList.remove('sel'); b.setAttribute('aria-selected', 'false'); });
    syncSplitPanes();
    renderWorkspace();
    announceSelection(null);
  }

  /* The page's own chrome belongs to the LIST, not to the client. On a desk
     it sits above both columns and is unobtrusive; on a phone, where the list
     gives way to the client entirely, it was 300px of title, search box, two
     filters and two buttons stacked on top of the person — the top half of the
     screen spent on controls for a list that is no longer on screen. Marked
     here, hidden by the phone layer only. */
  function markListChrome() {
    const page = $('#page-clients');
    if (!page) return;
    const mark = function (el) { if (el && el.parentElement === page) el.classList.add('rd-list-chrome'); };
    mark($('.ph', page));
    mark($('#cm-legend', page));
    const search = $('#cm-search', page);
    if (search) { let n = search; while (n && n.parentElement !== page) n = n.parentElement; mark(n); }
    // Marked above, hidden here: an open client is the whole page at every
    // width now, not only on a phone. This is the "client name starts halfway
    // down the screen" fault, and the chrome is what was above it.
    page.classList.toggle('rd-client-open', !!_selected);
  }

  /* One event, so a phone's single title bar can become the client's without
     this file knowing anything about phones. */
  function announceSelection(cid) {
    markListChrome();
    // Ask Scribe what it has for this client; the workspace redraws when the
    // answer lands, the same way the Viv read does.
    try {
      const c = cid ? (A().fn.get('clients') || []).find(function (x) { return x.id === cid; }) : null;
      if (c && c.vivId && window.TributeScribeReview) TributeScribeReview.listFor(c);
    } catch (e) {}
    const c = cid ? (A().fn.get('clients') || []).find(function (x) { return x.id === cid; }) : null;
    try {
      window.dispatchEvent(new CustomEvent('tribute:client-selected',
        { detail: { cid: cid || null, name: c ? c.name : null } }));
    } catch (e) {}
  }

  /* ── The client workspace ─────────────────────────────────────────────────
     A client is the centre of this application, so opening one opens a place,
     not another dashboard. Four sections earn a permanent chip — Overview,
     Care Plan, Schedule, Activity — and the rest of what a CSM occasionally
     needs is one tap away behind More rather than permanently in the way.

     Everything factual here comes from Viv through two READS (v2-client.js).
     Nothing is stored, copied or synchronised, and a read that fails says so
     instead of rendering as an empty day. */
  /* "Summary", not "Overview", and Activity before Schedule: Courtney's
     review of 17 Nov, which asks for four tabs reading Summary, Care Plan,
     Activity, Schedule, and for Summary to be "one page you can read top to
     bottom before a call". The More menu's five views still exist while
     their content is being moved onto Summary; removing the menu before then
     would make Care Team, Client Information, Pulse and LTC unreachable. */
  const WS_AREAS = [['overview', 'Summary'], ['careplan', 'Care Plan'],
                    ['activity', 'Activity'], ['schedule', 'Schedule']];
  const WS_MORE = [['team', 'Care Team'], ['info', 'Client Information'],
                   ['communication', 'Communication'], ['care', 'Pulse & Care'],
                   ['admin', 'LTC & Other']];
  const WS_TITLE = {};
  WS_AREAS.concat(WS_MORE).forEach(function (a) { WS_TITLE[a[0]] = a[1]; });

  /* Live reads. Absent in the local prototype, which has no endpoint to call —
     the workspace then shows what the roster knows and says the rest is
     unavailable here, rather than inventing it. */
  function CD(c) {
    const S = window.TributeClientData;
    if (!S || !c || !c.vivId) return { state: 'none', data: null, error: null };
    return S.client(c.vivId);
  }
  function CP(c) {
    const S = window.TributeClientData;
    if (!S || !c || !c.vivId) return { state: 'none', data: null, error: null };
    return S.careplan(c.vivId);
  }

  /* The Pulse headline is an ARRAY of points, not a sentence. Passed through
     esc() it became "a, b, c" on one line - a CSM asked for the bullets to
     sit one above the other, and she was describing a rendering bug rather
     than a preference. Handles a plain string too, because older cached
     reads carry one. */
  function pulseHeadline(h) {
    const list = Array.isArray(h) ? h.filter(Boolean) : (h ? [h] : []);
    if (!list.length) return '';
    if (list.length === 1) return '<p>' + esc(String(list[0])) + '</p>';
    return '<ul class="rd-ul rd-pulse-head">' +
      list.map(function (x) { return '<li>' + esc(String(x)) + '</li>'; }).join('') + '</ul>';
  }
  /* The first point only, for a one-line summary elsewhere. */
  function pulseFirst(h) {
    const list = Array.isArray(h) ? h.filter(Boolean) : (h ? [h] : []);
    return list.length ? String(list[0]).split('. ')[0] : '';
  }

  function pulseFor(c) {
    const p = A().pulse;
    return (p && c.vivId && p.byCid) ? p.byCid[c.vivId] : null;
  }
  function kv(label, value, extra) {
    if (!value) return '';
    return '<div class="rd-kv"><dt>' + esc(label) + '</dt><dd>' + (extra ? value : esc(value)) + '</dd></div>';
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
  function quiet(t) { return '<p class="rd-ws-quiet">' + esc(t) + '</p>'; }
  /* A read that did not answer and a day with nothing in it look identical on
     screen and mean opposite things, so they never share a rendering. */
  function unread(snap, what) {
    if (snap.state === 'loading') return '<p class="rd-ws-load">Reading ' + esc(what) + ' from Viv…</p>';
    if (snap.state === 'error') return '<p class="rd-ws-warn">' + esc(snap.error || 'Viv did not answer.') +
      (snap.retryable === false ? ''
        : ' <button type="button" class="rd-link" data-act="reload">Try again</button>') + '</p>';
    if (snap.state === 'none') return '<p class="rd-ws-quiet">' + esc(what) +
      ' comes from Viv and is not available in this build.</p>';
    return null;
  }

  /* ── schedule shaping ───────────────────────────────────────────────────
     The server already formatted each visit's start and end in the CLIENT's
     own market timezone and told us which date that was. Nothing here re-reads
     a clock, because the browser's timezone is not the client's. */
  function localDay(off) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + (off || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayLabel(iso) {
    if (iso === localDay(0)) return 'Today';
    if (iso === localDay(1)) return 'Tomorrow';
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function visitsOn(snap, iso) {
    const v = (snap.data && snap.data.schedule && snap.data.schedule.visits) || [];
    return v.filter(function (x) { return x.date === iso && !x.canceled; });
  }
  function visitRow(v) {
    const who = v.open ? 'Open visit' : (v.caregiver || 'Caregiver');
    const note = v.open ? 'Needs coverage' : (v.supervisory ? (v.type || 'CSM visit') : (v.type || ''));
    return '<li class="rd-vz' + (v.open ? ' open' : '') + '">' +
      '<span class="rd-vz-t">' + esc(v.start) + ' – ' + esc(v.end) + '</span>' +
      '<span class="rd-vz-w">' + esc(who) + '</span>' +
      (note ? '<span class="rd-vz-m">' + esc(note) + '</span>' : '') + '</li>';
  }
  function visitList(list) { return '<ul class="rd-vzs">' + list.map(visitRow).join('') + '</ul>'; }

  /* ── care plan shaping ──────────────────────────────────────────────────
     The form's own section titles are used verbatim. Nothing is renamed and no
     category is invented; the only editorial act is the order, so that what a
     CSM needs standing in a hallway comes before what the office needs. */
  const CP_ORDER = [/personal care|adl/i, /mobilit/i, /transfer/i, /medication/i,
    /meal|nutrition|diet/i, /cognit|memory|dementia/i, /safety|fall|emergenc/i,
    /behaviou?r/i, /housekeep|home|laundr/i, /companion|social/i,
    /preference|routine|likes/i, /restrict|precaution/i, /instruction/i];
  /* The real Tribute care plan shouts at you in its own section titles —
     "IMPORTANT: Overview of Care **PLEASE READ**". Whoever wrote the form
     already decided what matters most for that client, and that decision
     beats a generic ordering built from guesses about category names. */
  const CP_FLAGGED = /\bimportant\b|please read/i;
  /* Demographics are the name, the date of birth and the address. They are
     already in the header and in Client Information, and they are not what
     anyone opens a care plan for. Kept, because it is a real section of the
     real document, but last. */
  const CP_ADMIN = /demographic/i;
  /* Viv's care-plan answers are rich text. They arrive as HTML — <p>, <strong>,
     <u>, <li>, <br> — and the Hub escapes everything it renders, which is the
     right instinct and the wrong result: a CSM was reading "<p><strong><u>"
     out loud off a care plan. Tags are converted to plain text with its line
     breaks intact and the result is still escaped, so nothing from Viv is ever
     injected into the page. Markdown emphasis goes the same way. */
  function cpText(v) {
    let t = String(v == null ? '' : v);
    if (/<[a-z!/][^>]*>/i.test(t)) {
      t = t
        .replace(/<\s*(br|hr)\s*\/?>/gi, '\n')
        .replace(/<\s*\/\s*(p|div|tr|h[1-6])\s*>/gi, '\n')
        .replace(/<\s*li[^>]*>/gi, '\n• ')
        .replace(/<\s*\/\s*(li|ul|ol)\s*>/gi, '\n')
        .replace(/<[^>]*>/g, '');
    }
    return t
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
      .replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n').map(function (l) { return l.trim(); }).join('\n')
      .trim();
  }
  function cpTitle(t) {
    return cpText(t).replace(/\s*\n\s*/g, ' ').replace(/[*_]{2,}/g, '').trim();
  }
  function cpRank(title) {
    for (let i = 0; i < CP_ORDER.length; i++) if (CP_ORDER[i].test(title || '')) return i;
    return CP_ORDER.length + 1;
  }
  function cpBand(title) {
    if (CP_ADMIN.test(title || '')) return 2;      // administrative, last
    if (CP_FLAGGED.test(title || '')) return 0;    // the form's own emphasis, first
    return 1;
  }
  function cpSections(snap) {
    const p = snap.data && snap.data.careplan;
    const s = ((p && p.sections) || []).map(function (x, i) {
      return {
        title: cpTitle(x.title), _i: i,
        items: (x.items || []).map(function (it) {
          return { q: cpTitle(it.q), a: cpText(it.a) };
        }).filter(function (it) { return it.a; })
      };
    }).filter(function (x) { return x.items.length; });
    // Band first, then the category order, then the form's own order. Stable,
    // so two sections the rules cannot tell apart stay as the plan wrote them.
    return s.sort(function (a, b) {
      return cpBand(a.title) - cpBand(b.title)
          || cpRank(a.title) - cpRank(b.title)
          || a._i - b._i;
    });
  }

  /* ── activity ───────────────────────────────────────────────────────────
     Operational events only: what somebody did with this client, in order.
     No technical logs. */
  function activityFor(c, snap) {
    const out = [];
    rowsFor('visits', c.id).forEach(function (v) {
      out.push({ date: v.date, kind: 'Visit', text: v.type || 'Visit', party: 'visit', meta: v.by || '' }); });
    /* WHO THE CONTACT WAS WITH, so the Activity filter can mean something.
       Courtney asked for All / Family / Caregiver / Visits (17 Nov). The
       touchpoint TYPE already carries it: CG-PREP and CG-CHK are the caregiver
       conversations from Success in 30, the rest are family or GCM. Derived at
       source rather than guessed from the label when it is rendered. */
    rowsFor('touchpoints', c.id).forEach(function (t) {
      const ty = String(t.type || '');
      out.push({ date: t.date, kind: 'Touchpoint', text: t.type || 'Touchpoint',
                 party: /^CG-/i.test(ty) ? 'caregiver' : 'family',
                 meta: String(t.note || t.notes || '').slice(0, 60) }); });
    rowsFor('checkins', c.id).forEach(function (x) {
      out.push({ date: x.date, kind: 'Care conversation', party: 'family',
                 text: 'Satisfaction ' + (x.satisfaction || '—') + '/5',
                 meta: String(x.working || '').slice(0, 60) }); });
    rowsFor('s60', c.id).forEach(function (m) {
      out.push({ date: m.date, kind: 'Success in 30', text: m.type || m.milestone || 'Milestone', meta: '' }); });
    /* A finished to-do is history (Courtney, section 6): "It saves to the
       client's Activity as 'Task completed', with the task, the outcome, the
       note, the CSM's name, and the date and time." Her complaint was that
       clearing the list destroyed the record. It does not any more, because
       the record was never on the list.

       Party is family: these are the calls, voicemails and emails a CSM makes
       about a client, which is the same filter a touchpoint lands in. */
    rowsFor('tasks', c.id).forEach(function (t) {
      out.push({ date: t.date, kind: 'Task completed', party: 'family',
                 text: t.outcome || 'Done',
                 meta: [String(t.text || '').slice(0, 70), t.note, t.by].filter(Boolean).join(' \u00b7 ') }); });
    try {
      const comms = ((A().data.shared || {}).comms || {}).byClient || {};
      ((comms[c.vivId] || comms[c.id] || {}).events || []).forEach(function (e) {
        out.push({ date: String(e.date || e.day || '').slice(0, 10), kind: 'Communication', party: 'family',
                   text: e.kind || e.type || 'Contact', meta: String(e.subject || e.with || '').slice(0, 60) });
      });
    } catch (e) {}
    // Reviewed Scribe encounters are real operational history: somebody
    // documented this client on this day. Model logs are not, and none appear.
    try {
      const sc = window.TributeScribeReview && TributeScribeReview.cached(c.vivId);
      (sc || []).forEach(function (e) {
        const n = (e.counts || {});
        const bits = [];
        if (n.carePlan) bits.push(plural(n.carePlan, 'care plan change') + ' proposed');
        if (n.clarifications) bits.push(plural(n.clarifications, 'question'));
        out.push({ date: String(e.occurredAt || '').slice(0, 10),
          kind: TributeScribeReview.sourceLabel(e.sourceType),
          text: e.reviewStatus === 'finalized' ? 'Documentation reviewed' : 'Documentation drafted',
          meta: bits.join(' · ') });
      });
    } catch (e) {}
    const pp = pulseFor(c);
    if (pp && pp.generatedAt) out.push({ date: String(pp.generatedAt).slice(0, 10), kind: 'Pulse',
      text: (pp.level === 'red' ? 'Needs attention' : pp.level === 'amber' ? 'Watch' : 'Stable'),
      meta: pulseFirst(pp.headline) });
    // Completed caregiver visits from Viv, which the Hub's own log does not hold.
    const sv = (snap.data && snap.data.schedule && snap.data.schedule.visits) || [];
    const today = localDay(0);
    sv.filter(function (v) { return v.date < today && !v.canceled && v.caregiver && !v.supervisory; })
      .forEach(function (v) {
        out.push({ date: v.date, kind: 'Care visit',
                   text: v.caregiver, meta: v.start + ' – ' + v.end }); });
    return out.filter(function (x) { return x.date; })
      .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }
  function activityLines(items) {
    return '<ol class="rd-tl">' + items.map(function (x) {
      return '<li><span class="rd-tl-d">' + esc(fmtShort(x.date)) + '</span>' +
        '<span class="rd-tl-b"><span class="rd-tl-k">' + esc(x.kind) + '</span>' +
        '<span class="rd-tl-t">' + esc(x.text) + '</span>' +
        (x.meta ? '<span class="rd-tl-m">' + esc(x.meta) + '</span>' : '') + '</span></li>';
    }).join('') + '</ol>';
  }

  /* ── the header ─────────────────────────────────────────────────────────
     Person first, in the spirit of a contact card rather than a record page:
     the name, where they live, and the few actions you take while standing
     there. Everything administrative is a section away. */
  function wsHeader(c, snap) {
    const d = snap.data || {};
    const ct = d.contact || {};
    // The roster already carries Viv's formatted address, so it is on screen
    // the instant the client opens rather than after a round trip. The live
    // read replaces it when it lands.
    const addr = ct.address || c.address || '';
    const street = addr ? addr.split(',')[0] : '';
    const rest = addr ? addr.split(',').slice(1).join(',').trim().replace(/,\s*(United States|USA)$/i, '') : '';
    const status = (c.vivStatus && String(c.vivStatus).toLowerCase() !== 'active')
      ? c.vivStatus : (d.service && d.service.status) || 'Active';
    const meta = [c.market || (d.market || ''), status].filter(Boolean).join(' · ');

    const acts = [];
    const phone = ct.phone || (d.primaryContact && d.primaryContact.phone) || '';
    if (phone) acts.push('<a class="rd-act" href="tel:' + esc(phone.replace(/[^\d+]/g, '')) + '">' +
      I('phone') + '<span>Call</span></a>');
    if (addr) acts.push('<a class="rd-act" target="_blank" rel="noreferrer"' +
      ' href="https://maps.apple.com/?q=' + encodeURIComponent(addr) + '">' +
      I('pin') + '<span>Directions</span></a>');
    acts.push('<button type="button" class="rd-act" data-act="log-tp">' + I('conversation') + '<span>Log contact</span></button>');
    // Scribe. The reserved placeholder is now the real thing: one tap from
    // the client, because that is where a CSM is standing when they need it.
    if (window.TributeScribe && c.vivId) {
      acts.push('<button type="button" class="rd-act scribe" data-act="scribe">' +
        I('mic') + '<span>Scribe</span></button>');
    } else {
      acts.push('<button type="button" class="rd-act soon" disabled aria-disabled="true"' +
        ' title="Coming soon">' + I('mic') + '<span>Record Visit</span>' +
        '<em class="rd-soon">Soon</em></button>');
    }

    /* TIER, AT A GLANCE, WHERE THE CSM IS ALREADY LOOKING.
       Tier drives both cadences and most of what Needs attention says, and it
       was reachable only by opening Details and reading a key/value row.
       "I'd like it to clearly show tiers on each client's profile with a quick
       glance as it does with the fill priority" (Courtney, 11/03) — so it
       borrows fill priority's vocabulary rather than inventing a second one:
       the same three tones, the same dot, in the header beside the name. */
    const TIER_TONE = { High: 'hi', Medium: 'med', Low: 'lo' };
    const TIER_TEXT = { High: 'High need', Medium: 'Medium', Low: 'Low' };
    const tone = TIER_TONE[c.tier];
    const tierPill = tone
      ? '<span class="rd-cw-tier ' + tone + '" title="Touchpoint and care-conversation cadence follow the tier">' +
        '<span class="dot" aria-hidden="true">\u25CF</span>' + esc(TIER_TEXT[c.tier]) + '</span>'
      : '<span class="rd-cw-tier none" title="No tier set, so no cadence is being measured">No tier set</span>';

    return '<header class="rd-cw-head">' +
      '<div class="rd-cw-bar"><button type="button" class="rd-ws-back">' + I('arrowLeft') +
      '<span>Back to ' + esc(viewName()) + '</span></button>' +
      '<span class="rd-cw-bar-n">' + esc(c.name) + '</span>' +
      (function () {
        const pos = listPos(c.id);
        if (!pos) return '';
        return '<nav class="rd-cw-seq" aria-label="Move through ' + esc(viewName()) + '">' +
          seqBtn('prev', pos.prev) +
          '<span class="rd-cw-pos">' + (pos.i + 1) + ' of ' + pos.n + '</span>' +
          seqBtn('next', pos.next) + '</nav>';
      })() + '</div>' +
      '<h2 class="rd-cw-name">' + esc(c.name) + tierPill + '</h2>' +
      '<p class="rd-cw-meta">' + esc(meta) + '</p>' +
      (addr
        ? '<address class="rd-cw-addr">' + esc(street) + (ct.unit ? ' · ' + esc(ct.unit) : '') +
          (rest ? '<span>' + esc(rest) + '</span>' : '') + '</address>'
        : (c.loc || c.city ? '<address class="rd-cw-addr"><span>' +
            esc([c.loc, c.city].filter(Boolean).join(', ')) + '</span></address>'
          : (snap.state === 'loading' ? '<address class="rd-cw-addr skel">&nbsp;</address>' : ''))) +
      '<div class="rd-cw-acts">' + acts.join('') + '</div>' +
      /* FOUR TABS, NO MORE MENU. Courtney's priority 2, agreed 12 Nov: nine
         views for one client, with the family contact, the care team and the
         Pulse flag all hidden behind a dropdown.

         Every one of those five now has a home on a tab. Care Team sits with
         the Schedule, which is honest as well as tidier because Viv keeps no
         care-team roster and that list IS the schedule grouped. Client
         Information became the header line and the Contacts card. LTC became
         the Community and LTC card. Pulse became the banner. Communication is
         gone, because it showed Activity's own touchpoints under a second
         heading, and Activity now filters by who the contact was with.

         The section keys still resolve, so an old link or a saved route to
         ?section=team opens the tab that now holds it rather than nothing. */
      '<nav class="rd-cw-rail" role="tablist">' +
      WS_AREAS.map(function (a) {
        return '<button type="button" role="tab" data-key="' + a[0] + '" aria-selected="' +
          (_section === a[0]) + '">' + esc(a[1]) + '</button>';
      }).join('') + '</nav></header>';
  }

  function renderWorkspace() {
    const ws = $('#rd-ws');
    if (!ws) return;
    const app = A();
    const c = _selected ? (app.fn.get('clients') || []).find(function (x) { return x.id === _selected; }) : null;
    if (!c) {
      // The pane is hidden when nothing is selected, so an illustration here
      // would only be a panel nobody asked for, under a list.
      ws.innerHTML = '';
      return;
    }
    const snap = CD(c);
    const ex = exceptionFor(c);
    const pp = pulseFor(c);

    /* A route from before the four-tab change still has to land somewhere
       sensible. ?section=team or =info was a real destination; it is now part
       of a tab, so send it to the tab that holds it rather than to nothing. */
    const MOVED = { team: 'schedule', info: 'overview', communication: 'activity',
                    care: 'overview', admin: 'overview' };
    if (MOVED[_section]) _section = MOVED[_section];

    let body = '';
    if (_section === 'careplan') body = wsCarePlan(c);
    else if (_section === 'schedule') body = wsSchedule(c, snap);
    else if (_section === 'activity') body = wsActivity(c, snap);
    else body = wsOverview(c, ex, pp, snap);

    const sub = '';

    ws.innerHTML = wsHeader(c, snap) + wsPulseBanner(c, pp)
      + '<div class="rd-ws-body">' + sub + body + '</div>' + wsActions(c);

    $$('.rd-cw-rail button[data-key]', ws).forEach(function (b) {
      b.addEventListener('click', function () {
        _section = b.dataset.key;
        renderWorkspace();
        if (window.TributeRouter) TributeRouter.push({ page: 'clients', client: c.id, section: _section });
      });
    });
    $$('[data-actf]', ws).forEach(function (b) {
      b.addEventListener('click', function () { _actFilter = b.dataset.actf; renderWorkspace(); });
    });
    $$('[data-seq]', ws).forEach(function (b) {
      b.addEventListener('click', function () { selectClient(b.dataset.seq); });
    });
    const back = $('.rd-ws-back', ws);
    if (back) back.addEventListener('click', function () { deselectClient(); if (window.TributeRouter) TributeRouter.push({ page: 'clients', client: null }); });
    wireWsActions(ws, c);
    swapIcons(ws);
    watchHeadCollapse(ws);
  }

  /* §19 — a strong title to orient by, which gets out of the way once you are
     working. The compact bar is the same back button and the same name, so
     nothing is lost when the large one goes. */
  function watchHeadCollapse(ws) {
    const head = $('.rd-cw-head', ws), name = $('.rd-cw-name', ws);
    if (!head || !name) return;
    const scroller = (function (n) {
      for (let p = n.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowY;
        if (o === 'auto' || o === 'scroll') return p;
      }
      return window;
    })(ws);
    const on = function () {
      const top = scroller === window ? window.scrollY : scroller.scrollTop;
      const trip = name.offsetTop + name.offsetHeight - (scroller === window ? head.getBoundingClientRect().top + window.scrollY : 0);
      head.classList.toggle('compact', top > Math.max(40, trip));
    };
    if (ws.__collapse) (ws.__sc || window).removeEventListener('scroll', ws.__collapse);
    ws.__collapse = on; ws.__sc = scroller;
    scroller.addEventListener('scroll', on, { passive: true });
    on();
  }

  /* ── OVERVIEW — what do I need to know about this client right now? ───── */
  /* CADENCE: am I on track with this client?
     Courtney, 17 Nov: "No cadence anywhere. Last visit, next visit due, next
     touchpoint due and care conversation due aren't on the client page. In the
     original Hub this was the Check-Ins view, and it's how CSMs know if
     they're on track with a client."

     Nothing new is computed. visitSt, tpSt, ciSt and nextVisit have always
     been here, driving the exception on the list; they were simply never shown
     on the client they describe. Each row carries its own state, because "last
     visit 40 days ago" means nothing until you know the cadence is 30. */
  function wsCadence(c) {
    const tpCad = (A().tpCadence || {})[c.tier] || 30;
    const ciCad = (A().ciCadence || {})[c.tier] || 180;
    const tone = { overdue: 'bad', soon: 'warn', never: 'bad', none: '', ok: 'ok' };
    const row = function (label, state, when, due) {
      const t = tone[state] || '';
      return '<div class="rd-cad' + (t ? ' ' + t : '') + '">' +
        '<dt>' + esc(label) + '</dt>' +
        '<dd>' + (when ? esc(when) : '<span class="rd-ws-quiet">Nothing on record</span>') +
        (due ? '<span class="rd-sub">' + esc(due) + '</span>' : '') + '</dd></div>';
    };
    const vs = visitSt(c), ts = tpSt(c), cs = ciSt(c);
    const lastV = c.lastVisit ? fmtShort(c.lastVisit) + ' · ' + plural(daysSince(c.lastVisit), 'day') + ' ago' : '';
    const lastT = lastOf('touchpoints', c.id), lastC = lastOf('checkins', c.id);
    return block('Cadence',
      '<dl class="rd-cads">' +
      row('Last visit', vs, lastV,
          c.freq === 'NA' ? 'No visit cadence set'
            : (vs === 'overdue' ? 'Overdue' : nextVisit(c) ? 'Next due ' + fmtShort(nextVisit(c)) : '')) +
      row('Touchpoint', ts, lastT ? fmtShort(lastT) + ' · ' + plural(daysSince(lastT), 'day') + ' ago' : '',
          'Every ' + plural(tpCad, 'day') + (c.tier ? ' · ' + esc(c.tier) + ' need' : '')) +
      row('Care conversation', cs, lastC ? fmtShort(lastC) + ' · ' + plural(daysSince(lastC), 'day') + ' ago' : '',
          'Every ' + plural(ciCad, 'day')) +
      '</dl>');
  }

  function wsOverview(c, ex, pp, snap) {
    let out = '';

    /* Attention. Rendered only when something is actually wrong: an empty
       "all clear" card every day teaches people to stop reading the one that
       matters. */
    const attn = [];
    if (ex) attn.push({ tone: ex.tone, text: ex.text });
    if (pp && pp.level && pp.level !== 'green' && !c.pulseAck)
      attn.push({ tone: pp.level === 'red' ? 'bad' : 'warn',
                  text: pulseFirst(pp.headline) + '.', go: 'care' });
    const openToday = visitsOn(snap, localDay(0)).filter(function (v) { return v.open; });
    if (openToday.length) attn.push({ tone: 'bad',
      text: openToday.length === 1 ? 'An open visit today needs coverage'
                                   : openToday.length + ' open visits today need coverage', go: 'schedule' });
    // A read that failed and might work on a retry is worth a CSM's attention.
    // A capability the server does not have yet is not — it would say the same
    // thing on every client, every day, and the section below already says it.
    if (snap.state === 'error' && snap.retryable !== false)
      attn.push({ tone: 'warn', text: snap.error });
    if (attn.length) out += block('Needs attention', '<ul class="rd-attn-l">' + attn.map(function (a) {
      return '<li class="' + a.tone + '">' + esc(a.text) +
        (a.go ? ' <button type="button" class="rd-link" data-go="' + a.go + '">Open</button>' : '') + '</li>';
    }).join('') + '</ul>');

    /* Today — the single most useful thing on a phone. */
    const today = visitsOn(snap, localDay(0));
    const todayBody = unread(snap, 'today’s schedule') ||
      (today.length ? visitList(today) : quiet('No visits scheduled today.'));
    out += block('Today', todayBody);

    /* Next visit — only once today is done with, so it is never a duplicate. */
    const sv = (snap.data && snap.data.schedule && snap.data.schedule.visits) || [];
    const nowCut = localDay(0);
    const next = sv.filter(function (v) { return !v.canceled && v.date > nowCut; })[0];
    if (next) out += block('Next visit',
      '<p class="rd-ws-next"><strong>' + esc(dayLabel(next.date)) + '</strong>' +
      '<span class="dot">·</span>' + esc(next.start) + ' – ' + esc(next.end) + '</p>' +
      '<p class="rd-ws-plain">' + esc(next.open ? 'Open visit · needs coverage' : (next.caregiver || 'Caregiver')) +
      (next.type && !next.open ? '<span class="dot">·</span>' + esc(next.type) : '') + '</p>');
    else if (!today.length && snap.state === 'ready')
      out += block('Next visit', quiet('Nothing scheduled in the next two weeks.'));

    /* The care snapshot moved to the right column as Quick care facts, so it
       is NOT rendered here as well. It was briefly in both, which doubled the
       exact thing Courtney complained about: "the Care Snapshot is the care
       plan again, as long paragraphs. It pushes everything else down." */

    /* Care team preview. */
    const team = (snap.data && snap.data.careTeam) || [];
    if (team.length) out += block('Care team',
      '<ul class="rd-team">' + team.slice(0, 3).map(teamRow).join('') + '</ul>' +
      (team.length > 3 ? '<button type="button" class="rd-link" data-go="team">All ' +
        team.length + ' caregivers →</button>' : ''));

    /* Anything Scribe has waiting. Only when there is something: a CSM with
       no drafts should see no mention of Scribe here at all. */
    try {
      const sc = (window.TributeScribeReview && TributeScribeReview.cached(c.vivId)) || [];
      const open = sc.filter(function (e) { return e.status === 'ready' || e.status === 'review_in_progress'; });
      if (open.length) out += block('Scribe', '<ul class="rd-scribe-l">' + open.slice(0, 3).map(function (e) {
        const n = e.counts || {};
        return '<li><button type="button" class="rd-link" data-act="scribe-open" data-enc="' + esc(e.id) + '">' +
          esc(TributeScribeReview.sourceLabel(e.sourceType)) + ' · ' + fmtShort(e.occurredAt) +
          '</button><span>' + esc([n.carePlan ? plural(n.carePlan, 'proposed change') : '',
            n.clarifications ? plural(n.clarifications, 'question') : ''].filter(Boolean).join(' · ') ||
            'draft ready to review') + '</span></li>';
      }).join('') + '</ul>');
    } catch (e) {}

    /* Recent activity. */
    const acts = activityFor(c, snap);
    if (acts.length) out += block('Recent', activityLines(acts.slice(0, 4)) +
      '<button type="button" class="rd-link" data-go="activity">View all activity →</button>');

    /* TWO COLUMNS, which is what the Summary is for.
       Courtney, 17 Nov: "Summary is one page you can read top to bottom
       before a call." Left is what you are tracking, right is what you need in
       your hand: contacts, the few care facts, where they live, and a coverage
       note if somebody is covering.

       The right column is assembled from the views that sat under More, which
       is why they can stop being separate destinations. Nothing is removed
       from the Hub, it is moved to where it gets read. */
    return '<div class="rd-sum">' +
      '<div class="rd-sum-l">' + wsCadence(c) + out + '</div>' +
      '<div class="rd-sum-r">' + wsSummaryRight(c, snap) + '</div>' +
      '</div>';
  }

  /* The right-hand column: Contacts, Quick care facts, Community and LTC, and
     the coverage note. Each is the useful part of a former More view, not the
     whole of it: the full detail still has a home on its own tab. */
  function wsSummaryRight(c, snap) {
    const d = snap.data || {};
    const tel = function (p) { return p ? '<a href="tel:' + esc(String(p).replace(/[^\d+]/g, '')) + '">' + esc(p) + '</a>' : ''; };
    const mail = function (e) { return e ? '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>' : ''; };
    let out = '';

    /* CONTACTS, which she found buried under More > Client Information: "For
       this client there was no Call button on the page at all because the
       client has no phone of their own." The family contact is often the only
       number that reaches anybody. */
    const pc = d.primaryContact;
    const others = (d.contacts || []).filter(function (x) { return !pc || x.name !== pc.name; });
    const ct = d.contact || {};
    if (pc || others.length || ct.phone) {
      out += block('Contacts',
        (pc ? '<div class="rd-con"><dt>' + esc(pc.name || 'Primary contact') +
            (pc.relationship ? '<span class="rd-sub">' + esc(pc.relationship) + '</span>' : '') + '</dt>' +
            '<dd>' + [tel(pc.phone), mail(pc.email)].filter(Boolean).join('<span class="rd-sub"></span>') + '</dd></div>' : '') +
        (ct.phone ? '<div class="rd-con"><dt>Client' + (ct.otherPhone ? '' : '') + '</dt><dd>' + tel(ct.phone) + '</dd></div>' : '') +
        (others.length
          ? '<details class="rd-more"><summary>' + plural(others.length, 'other contact') + '</summary>' +
            others.map(function (x) {
              return '<div class="rd-con"><dt>' + esc(x.name) +
                (x.relationship ? '<span class="rd-sub">' + esc(x.relationship) + '</span>' : '') +
                (x.emergency ? '<span class="rd-sub">Emergency</span>' : '') + '</dt>' +
                '<dd>' + [tel(x.phone), mail(x.email)].filter(Boolean).join('<span class="rd-sub"></span>') + '</dd></div>';
            }).join('') + '</details>'
          : ''));
    } else {
      out += block('Contacts', unread(snap, 'contact details') || quiet('No family contact is on file in Viv.'));
    }

    out += wsSnapshot(c);                 // Quick care facts, from the care plan

    /* Where they live, and who pays. */
    const sv = d.service || {};
    const comm = sv.community || c.loc;
    if (comm || c.tributeSecure || sv.clientNum || c.vivNum) {
      out += block('Community and LTC',
        '<dl class="rd-kvs">' +
        kv('Community', comm) +
        kv('Unit', ct.unit) +
        kv('Start of care', (sv.careStarted || c.startDate) ? fmtShort(sv.careStarted || c.startDate) : '') +
        kv('Client number', sv.clientNum || c.vivNum) +
        kv('Tribute Secure', (sv.tributeSecure || c.tributeSecure) ? 'Yes' : '') +
        '</dl>' +
        (comm ? '<button type="button" class="rd-link" data-act="community">View community</button>' : ''));
    }

    /* Only when somebody is actually covering. */
    const cov = c.coverage;
    if (cov && (cov.coveredBy || cov.to || cov.note)) {
      out += block('Coverage',
        '<p class="rd-ws-plain">' + esc(cov.to || cov.coveredBy || 'Covered') +
        (cov.since ? '<span class="rd-sub">since ' + esc(fmtShort(cov.since)) + '</span>' : '') + '</p>' +
        (cov.note ? '<p class="rd-ws-quiet">' + esc(cov.note) + '</p>' : ''));
    }
    return out;
  }

  function wsSnapshot(c) {
    const snap = CP(c);
    const miss = unread(snap, 'the care plan');
    if (miss) return block('Quick care facts', miss);
    const p = snap.data && snap.data.careplan;
    if (!p) return block('Quick care facts', quiet('No care plan on file in Viv yet.'));
    const secs = cpSections(snap);
    if (!secs.length) return block('Quick care facts',
      quiet('The care plan is on file but has no structured answers to summarise.') +
      '<button type="button" class="rd-link" data-go="careplan">Open the care plan →</button>');
    const pick = secs.filter(function (s) {
      return cpBand(s.title) === 0 || cpRank(s.title) < CP_ORDER.length;
    }).slice(0, 4);
    const show = (pick.length ? pick : secs.filter(function (s) {
      return cpBand(s.title) !== 2; }).slice(0, 3));
    /* "Quick care facts (meds, allergies, safety, emergency protocol in one or
       two lines each)" — Courtney, 17 Nov. The sections were already the right
       ones, picked by CP_ORDER and by the form's own IMPORTANT / PLEASE READ
       markers. What made this unreadable was length: the care plan's answers
       are paragraphs, and four of them stacked is the wall she described as
       "the care plan again".

       Each one is clamped to two lines rather than cut, so nothing is lost and
       nothing is rewritten: the full text is one click away on the Care Plan
       tab, which she asked to keep exactly as it is. */
    return block('Quick care facts',
      show.map(function (s) {
        return '<div class="rd-snap"><span class="rd-snap-k">' + esc(s.title) + '</span>' +
          '<p class="rd-snap-t">' + esc(s.items.slice(0, 2).map(function (i) { return i.a; }).join(' · ')) + '</p></div>';
      }).join('') +
      '<button type="button" class="rd-link" data-go="careplan">Full care plan →</button>');
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

  /* Days read in week order whatever order they arrive in: "Mon · Wed · Fri"
     is a pattern, "Tue · Sat · Mon" is a list. */
  const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function orderDays(d) {
    return (d || []).slice().sort(function (a, b) {
      return DOW_ORDER.indexOf(a) - DOW_ORDER.indexOf(b);
    });
  }
  function teamRow(t) {
    const bits = [];
    if (t.days && t.days.length) bits.push(orderDays(t.days).join(' · '));
    if (t.hours) bits.push(t.hours + 'h');
    return '<li><span class="rd-team-n">' + esc(t.name) + '</span>' +
      (bits.length ? '<span class="rd-team-s">' + esc(bits.join('  ·  ')) + '</span>' : '') +
      (t.next ? '<span class="rd-team-x">Next ' +
        esc(new Date(t.next).toLocaleDateString('en-US', { weekday: 'short' })) + '</span>' : '') + '</li>';
  }

  /* ── CARE PLAN ──────────────────────────────────────────────────────────
     The real approved plan, in the form's own sections, readable standing in
     someone's living room. Long sections collapse; nothing is truncated away. */
  function wsCarePlan(c) {
    const snap = CP(c);
    const miss = unread(snap, 'the care plan');
    if (miss) return block('', miss);
    const p = snap.data && snap.data.careplan;
    if (!p) return block('Care plan',
      quiet('No care plan is on file for this client in Viv.') +
      (c.carePlanDate ? quiet('The Hub records one on ' + fmtShort(c.carePlanDate) + '.') : ''));

    // Selection and display are separate. The server orders an approved plan
    // with no approval date by its document timestamp so it can still compete;
    // the page must not then print that timestamp as if somebody approved on
    // it. When Viv holds no approval date, say exactly that.
    const dateKnown = p.approvalDateKnown !== false && !!p.date;
    const state = p.status === 'approved'
      ? 'Approved' + (p.approvedBy ? ' by ' + p.approvedBy : '') +
        (dateKnown ? ' · ' + fmtShort(p.date) : ' · Approval date not recorded in Viv')
      : p.status === 'submitted'
        ? 'Not approved · submitted' + (p.docDate ? ' ' + fmtShort(p.docDate) : (p.date ? ' ' + fmtShort(p.date) : ''))
        : 'Not approved · draft' + (p.docDate ? ' ' + fmtShort(p.docDate) : (p.date ? ' ' + fmtShort(p.date) : ''));
    let out = '<div class="rd-cp-head"><h4>' + esc(p.title || 'Care Plan') + '</h4>' +
      '<p class="rd-ws-quiet">' + esc(state) + '</p>' +
      (p.stale ? '<p class="rd-ws-warn">This plan is over six months old.</p>' : '') +
      (p.status !== 'approved'
        ? '<p class="rd-ws-warn">This is not an approved plan. It is the newest care plan on file for this client; ' +
          'an approved one would be shown instead.</p>' : '') +
      '</div>';

    const secs = cpSections(snap);
    if (!secs.length) {
      out += quiet('This plan has no structured answers recorded.');
    } else {
      out += secs.map(function (s, i) {
        const long = s.items.length > 4;
        const items = '<dl class="rd-kvs rd-cp-kvs">' + s.items.map(function (it) {
          return '<div class="rd-kv"><dt>' + esc(it.q) + '</dt><dd>' + esc(it.a) + '</dd></div>';
        }).join('') + '</dl>';
        if (!long) return '<section class="rd-cp-sec"><h5>' + esc(s.title) + '</h5>' + items + '</section>';
        return '<details class="rd-cp-sec rd-cp-fold"' + (i < 2 ? ' open' : '') + '>' +
          '<summary><h5>' + esc(s.title) + '</h5><span>' + s.items.length + '</span></summary>' +
          items + '</details>';
      }).join('');
    }
    if (p.viewUrl) out += '<p class="rd-ws-quiet"><a class="rd-link" target="_blank" rel="noreferrer" href="' +
      esc(p.viewUrl) + '">Open the signed plan in Viv →</a></p>';
    return out;
  }

  /* ── SCHEDULE — who is coming, and when ─────────────────────────────── */
  function wsSchedule(c, snap) {
    const miss = unread(snap, 'the schedule');
    if (miss) return block('', miss);
    const sch = (snap.data && snap.data.schedule) || {};
    const all = (sch.visits || []).filter(function (v) { return !v.supervisory; });
    const today = localDay(0);
    const upcoming = all.filter(function (v) { return v.date >= today; });

    let out = '';
    if (sch.note) out += '<p class="rd-ws-warn">' + esc(sch.note) + '</p>';
    if (!upcoming.length) {
      out += block('Upcoming', quiet('Nothing is scheduled for this client in the next two weeks.'));
    } else {
      const byDay = {};
      upcoming.forEach(function (v) { (byDay[v.date] = byDay[v.date] || []).push(v); });
      out += Object.keys(byDay).sort().map(function (d) {
        return '<section class="rd-ws-block"><h4>' + esc(dayLabel(d)) + '</h4>' +
          visitList(byDay[d]) + '</section>';
      }).join('');
    }
    if (sch.tzLabel) out += '<p class="rd-ws-quiet">Times are ' + esc(sch.tzLabel) + ', the client’s own.</p>';

    const past = all.filter(function (v) { return v.date < today; })
      .sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    if (past.length) out += '<details class="rd-more"><summary>Earlier this fortnight</summary>' +
      Object.keys(past.reduce(function (m, v) { m[v.date] = 1; return m; }, {})).sort().reverse()
        .map(function (d) {
          return '<div class="rd-past-d"><span>' + esc(dayLabel(d)) + '</span>' +
            visitList(past.filter(function (v) { return v.date === d; })) + '</div>';
        }).join('') + '</details>';

    /* The CSM's own visit cadence is Hub judgment, not Viv's schedule, so it
       is named separately rather than mixed into the caregiver week. */
    const nv = nextVisit(c);
    out += block('Your next visit', nv ? '<p class="rd-ws-next">' + fmtShort(nv) + '</p>'
      : quiet(c.freq === 'NA' ? 'No visit cadence set.' : 'Not scheduled.'), true);
    /* THE CARE TEAM BELONGS WITH THE SCHEDULE, which is where Courtney put it
       (17 Nov: "More > Care Team → Schedule tab + care team card on Summary").
       It is honest placement as well as tidier: Viv keeps no care-team roster,
       so this list IS the schedule, grouped by caregiver. Summary keeps the
       top three as a preview. */
    out += block('Care team', wsTeam(c, snap));
    out += extraBlocks('schedule', c);
    return out;
  }

  /* ── CARE TEAM ──────────────────────────────────────────────────────── */
  function wsTeam(c, snap) {
    const miss = unread(snap, 'the care team');
    if (miss) return block('', miss);
    const team = (snap.data && snap.data.careTeam) || [];
    let out = '';
    if (!team.length) out += quiet('No caregiver is scheduled with this client in this fortnight.');
    else out += '<ul class="rd-team big">' + team.map(function (t) {
      const bits = [];
      if (t.days && t.days.length) bits.push(orderDays(t.days).join(' · '));
      bits.push(plural(t.visits, 'visit'));
      if (t.hours) bits.push(t.hours + ' hours');
      return '<li><span class="rd-team-n">' + esc(t.name) + '</span>' +
        '<span class="rd-team-s">' + esc(bits.join('  ·  ')) + '</span>' +
        '<span class="rd-team-x">' + (t.next
          ? 'Next ' + esc(new Date(t.next).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
          : t.last ? 'Last ' + esc(new Date(t.last).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : '') +
        '</span></li>';
    }).join('') + '</ul>';
    /* Honest about provenance: Viv holds no care-team roster, so this IS the
       schedule, grouped. The CSM's own note is kept beside it, not merged. */
    out += '<p class="rd-ws-quiet">From the schedule for ' +
      esc((snap.data && snap.data.schedule && snap.data.schedule.from) || '') + ' to ' +
      esc((snap.data && snap.data.schedule && snap.data.schedule.to) || '') +
      '. Viv does not keep a separate care-team list.</p>';
    if (c.caregivers) out += block('Your note', '<p class="rd-ws-plain">' + esc(c.caregivers) + '</p>', true);
    return out;
  }

  /* ── CLIENT INFORMATION ─────────────────────────────────────────────── */
  function wsInfo(c, snap) {
    const d = snap.data || {};
    const ct = d.contact || {};
    const miss = unread(snap, 'contact details');
    let out = '';

    const tel = function (p) { return p ? '<a href="tel:' + esc(p.replace(/[^\d+]/g, '')) + '">' + esc(p) + '</a>' : ''; };
    const mail = function (e) { return e ? '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>' : ''; };

    if (miss && !ct.address) out += block('Contact', miss);
    else out += block('Contact',
      '<dl class="rd-kvs">' +
      kv('Address', ct.address ? esc(ct.address) + (ct.unit ? '<span class="rd-sub">' + esc(ct.unit) + '</span>' : '') +
        '<span class="rd-sub"><a class="rd-link" target="_blank" rel="noreferrer" href="https://maps.apple.com/?q=' +
        encodeURIComponent(ct.address) + '">Directions</a></span>' : '', true) +
      kv('Phone', tel(ct.phone), true) +
      kv('Other phone', tel(ct.otherPhone), true) +
      kv('Email', mail(ct.email), true) +
      '</dl>');

    const pc = d.primaryContact;
    if (pc) out += block('Primary contact',
      '<dl class="rd-kvs">' +
      kv('Name', pc.name) + kv('Relationship', pc.relationship) +
      kv('Phone', tel(pc.phone), true) + kv('Email', mail(pc.email), true) + '</dl>' +
      (d.primaryContactSource === 'familyDetails'
        ? quiet('No primary contact is set in Viv, so this is the first family contact on file.') : ''));
    else if (!miss) out += block('Primary contact', quiet('No family contact is on file in Viv.'));

    const others = (d.contacts || []).filter(function (x) { return !pc || x.name !== pc.name; });
    if (others.length) out += '<details class="rd-more"><summary>Other contacts (' + others.length + ')</summary>' +
      '<dl class="rd-kvs">' + others.map(function (x) {
        return '<div class="rd-kv"><dt>' + esc(x.name) + (x.relationship ? ' · ' + esc(x.relationship) : '') + '</dt>' +
          '<dd>' + [tel(x.phone), mail(x.email)].filter(Boolean).join('<span class="rd-sub"></span>') +
          (x.emergency ? '<span class="rd-sub">Emergency contact</span>' : '') + '</dd></div>';
      }).join('') + '</dl></details>';

    const sv = d.service || {};
    out += block('Care and service', '<dl class="rd-kvs">' +
      kv('Start of care', (sv.careStarted || c.startDate) ? fmtShort(sv.careStarted || c.startDate) : '') +
      kv('Market', c.market || d.market) +
      kv('Service type', sv.caseType || c.type) +
      kv('Community', sv.community || c.loc) +
      kv('Status', sv.status || c.vivStatus) +
      kv('CSM', sv.csm || c.csm) +
      kv('Scheduling partner', sv.admin) +
      kv('Client number', sv.clientNum || c.vivNum) +
      kv('Tribute Secure', sv.tributeSecure || c.tributeSecure ? 'Yes' : '') +
      '</dl>');

    out += '<details class="rd-more"' + (_showAdmin ? ' open' : '') + '><summary>Hub details</summary>' +
      '<dl class="rd-kvs">' +
      kv('Tier', c.tier) + kv('Visit cadence', c.freq === 'NA' ? 'None' : (c.freq || 90) + ' days') +
      kv('Weekly hours', c.weeklyHours) + kv('Birthday', c.birthday ? fmtShort(c.birthday) : '') +
      kv('Communication preferences', c.comm) +
      kv('Rates', c.rateHistory) + kv('Notes', c.notes) +
      '</dl></details>';
    return out;
  }

  /* ── ACTIVITY ───────────────────────────────────────────────────────── */
  /* All / Family / Caregiver / Visits, which is what Courtney asked for, and
     what lets the Communication view stop being a separate destination: it
     showed the same touchpoints as Activity with a different heading. */
  let _actFilter = 'all';
  const ACT_FILTERS = [['all', 'All'], ['family', 'Family'],
                       ['caregiver', 'Caregiver'], ['visit', 'Visits']];

  function wsActivity(c, snap) {
    const items = activityFor(c, snap);
    if (!items.length) return block('', quiet('Nothing has been logged for this client yet.'));

    // Counts come from everything, so a filter with nothing in it still says
    // so rather than disappearing and leaving a CSM wondering where it went.
    const n = {}; ACT_FILTERS.forEach(function (f) { n[f[0]] = 0; });
    items.forEach(function (x) { n.all++; if (n[x.party] !== undefined) n[x.party]++; });

    const chips = '<div class="rd-actf" role="tablist">' + ACT_FILTERS.map(function (f) {
      return '<button type="button" role="tab" class="rd-actf-b" data-actf="' + f[0] + '"' +
        ' aria-selected="' + (_actFilter === f[0]) + '">' + esc(f[1]) +
        (n[f[0]] ? '<span class="n">' + n[f[0]] + '</span>' : '') + '</button>';
    }).join('') + '</div>';

    const shown = _actFilter === 'all' ? items
      : items.filter(function (x) { return x.party === _actFilter; });
    if (!shown.length) return chips + block('', quiet('Nothing logged under that filter yet.'));

    const byMonth = {};
    shown.forEach(function (x) {
      const k = String(x.date).slice(0, 7);
      (byMonth[k] = byMonth[k] || []).push(x);
    });
    return chips + Object.keys(byMonth).sort().reverse().slice(0, 6).map(function (k) {
      const label = new Date(k + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return '<section class="rd-ws-block"><h4>' + esc(label) + '</h4>' +
        activityLines(byMonth[k]) + '</section>';
    }).join('')
      + extraBlocks('activity', c)
      /* The Communication view is gone, but another layer contributes a block
         to it: workflows.js registers "Weekly schedule emails sent" there.
         Dropping the view without re-homing that block would have removed a
         real record of what was sent to a family, silently and with nothing
         in the diff to show it. Activity is where it belongs anyway. */
      + extraBlocks('communication', c);
  }

  /* WHAT AN ACKNOWLEDGEMENT IS CALLED.
     This used to read window.PULSE_ACK_LABEL, which is always undefined: the
     map is a top-level `const` in the Hub, so it is a global BINDING and not a
     property of window. Every lookup missed and fell through to the raw key,
     which is why the page read "aware_none" next to an acknowledgement
     (Courtney, 17 Nov). Reached bare, behind a guard, with our own words as a
     fallback so a raw key can never surface again. */
  const ACK_WORDS = { aware_none: 'Nothing needed',
                      aware_working: 'Working on it',
                      aware_1to1: 'Raising in the 1:1' };
  function ackLabel(state) {
    const k = String(state || '');
    try { if (typeof PULSE_ACK_LABEL !== 'undefined' && PULSE_ACK_LABEL && PULSE_ACK_LABEL[k]) return PULSE_ACK_LABEL[k]; }
    catch (e) {}
    return ACK_WORDS[k] || 'Acknowledged';
  }

  /* THE PULSE FLAG, AT THE TOP, WHERE IT IS ABOUT THE CLIENT.
     Courtney's first priority (17 Nov): "the most important thing about a
     client is two clicks deep under More > Pulse & Care". Her example was a
     client taken by paramedics whose Summary said only "No visit on record".

     No flag, no banner. A green client is not news, and a banner that is
     always there stops being read. */
  /* WHOSE CALL IS THIS (Courtney, section 9, Client Pulse): "Add the
     escalation paths to Pulse's sources so 'whose call' matches who handles
     it now: MA and Chicago come to me, Maryland goes to the Senior CSM."

     A red flag is the moment a CSM asks who to take this to, so the answer
     is on the flag rather than in a document. Only on red: an amber is a
     watch, and telling someone to escalate a watch would teach them to
     ignore the line.

     Derived from PROFILES by ROLE, never a typed-in name. The two routes she
     gave are roles, not people, and a hardcoded name goes stale the day
     somebody changes job while the role stays true. If no profile holds the
     role, the line is absent rather than wrong.

     NOT DONE: she also asks for the escalation paths in the Assistant's
     sources. That needs the escalation paths document itself, which this does
     not have; what is here is only the two routes she wrote down. */
  function escalateTo(c) {
    const app = A();
    const all = app.profiles || [];
    // PULSE_MKT_STATE and PULSE_HUB_STATE are top-level `const` in the Hub, so
    // they are global BINDINGS and not window properties: reached bare behind
    // a guard. Reading them off window returns undefined and the line would
    // simply never appear, which is how this class of bug hides.
    const mkt = function (o, k) { try { return o[k] || ''; } catch (e) { return ''; } };
    const st = (typeof PULSE_MKT_STATE !== 'undefined'
                 ? mkt(PULSE_MKT_STATE, String(c.market || '').trim()) : '') ||
               (typeof PULSE_HUB_STATE !== 'undefined'
                 ? mkt(PULSE_HUB_STATE, app.selectedHub) : '');
    const byRole = function (re, hub) {
      return all.filter(function (p) {
        if (!re.test(String(p.role || ''))) return false;
        if (!hub) return true;
        return Array.isArray(p.hub) ? p.hub.indexOf(hub) > -1 : p.hub === hub;
      })[0];
    };
    if (st === 'MD') return byRole(/^Senior CSM/i, 'MD');
    if (st === 'MA' || st === 'IL') return byRole(/Director of Client Solutions/i);
    return null;
  }

  function wsPulseBanner(c, pp) {
    if (!pp || !pp.level || pp.level === 'green') return '';
    const tone = pp.level === 'red' ? 'bad' : 'warn';
    const ack = c.pulseAck;
    return '<div class="rd-pb ' + tone + '">' +
      '<div class="rd-pb-k">' + (pp.level === 'red' ? 'Needs attention' : 'Watch') + '</div>' +
      '<div class="rd-pb-b">' + pulseHeadline(pp.headline) +
        ((pp.aiWatch && pp.aiWatch.length)
          ? '<ul class="rd-ul">' + pp.aiWatch.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>'
          : '') +
        (function () {
          if (pp.level !== 'red') return '';
          const e = escalateTo(c);
          return e ? '<p class="rd-pb-esc">Escalate to ' + esc(e.name) +
            ' \u00b7 ' + esc(e.role) + '</p>' : '';
        })() +
        (ack
          ? '<p class="rd-pb-ack">' + esc(ackLabel(ack.state)) +
            (ack.by ? ' &middot; ' + esc(ack.by) : '') +
            ' <button type="button" class="rd-link" data-act="ack-clear">Undo</button></p>'
          : '<div class="rd-ack"><span>Mark it</span>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_working">Working on it</button>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_1to1">Raising in 1:1</button>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_none">Nothing needed</button></div>') +
      '</div></div>';
  }

  function wsCare(c, pp) {
    let out = '';
    if (pp) {
      const tone = pp.level === 'red' ? 'bad' : pp.level === 'amber' ? 'warn' : 'ok';
      out += block('Pulse',
        '<div class="rd-signal ' + tone + '">' +
        '<span class="k">' + (pp.level === 'red' ? 'Needs attention' : pp.level === 'amber' ? 'Watch' : 'Stable') + '</span>' +
        pulseHeadline(pp.headline) + '</div>' +
        ((pp.aiWatch && pp.aiWatch.length) ? '<ul class="rd-ul">' + pp.aiWatch.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' : '') +
        (c.pulseAck
          ? '<p class="rd-ws-quiet">Acknowledged by ' + esc(c.pulseAck.by || '') + ' · ' +
            esc(ackLabel(c.pulseAck.state)) +
            ' <button type="button" class="rd-link" data-act="ack-clear">Undo</button></p>'
          : '<div class="rd-ack"><span>Acknowledge</span>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_none">Nothing needed</button>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_working">Working on it</button>' +
            '<button type="button" class="rd-link" data-act="ack" data-state="aware_1to1">Raising in 1:1</button></div>'));
    } else out += block('Pulse', quiet('No Pulse read for this client yet.'));
    if (c.baselineNarrative) out += block('Baseline', '<p class="rd-ws-plain">' + esc(c.baselineNarrative) + '</p>');
    const cis = rowsFor('checkins', c.id);
    out += block('Care conversations',
      cis.length ? cis.slice(0, 4).map(function (x) {
        return eventLine(x.date, 'Satisfaction ' + (x.satisfaction || '—') + '/5', x.working ? String(x.working).slice(0, 48) : '');
      }).join('') : quiet('Nothing logged yet.'));
    out += extraBlocks('care', c);
    return out;
  }

  function wsCommunication(c) {
    let out = '';
    const tps = rowsFor('touchpoints', c.id);
    out += block('Recent touchpoints', tps.length
      ? tps.slice(0, 6).map(function (t) { return eventLine(t.date, t.type || 'Touchpoint', String(t.note || t.notes || '').slice(0, 44)); }).join('')
      : quiet('Nothing logged yet.'));
    if (c.comm) out += block('Preferences', '<p class="rd-ws-plain">' + esc(c.comm) + '</p>', true);
    out += extraBlocks('communication', c);
    return out;
  }

  function wsMore(c) {
    let out = '';
    if (c.loc) {
      let cm = {};
      try { cm = ((A().data.shared || {}).communities || {})[c.loc] || {}; } catch (e) {}
      out += block('Community', '<p class="rd-ws-plain">' + esc(c.loc) + '</p>' +
        (cm.mainContact ? quiet(cm.mainContact) : '') +
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
    out += block('LTC insurance', ltcBody || quiet('No record on file.'));
    const mdNav = $('#nav-md');
    if (mdNav && mdNav.style.display !== 'none' && /maryland|baltimore|annapolis|bethesda/i.test(c.market || '')) {
      out += block('Compliance', '<button type="button" class="rd-link" data-act="compliance">Open the Maryland board for this client</button>');
    }
    out += block('Fill priority', '<button type="button" class="rd-link" data-act="fill">Open fill priority</button>', true);
    out += extraBlocks('more', c);
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

    $$('[data-go]', ws).forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        $$('.rd-menu-list', ws).forEach(function (l) { l.classList.remove('open'); });
        _section = b.dataset.go;
        renderWorkspace();
        if (window.TributeRouter) TributeRouter.push({ page: 'clients', client: c.id, section: _section });
      });
    });

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
          'reload': function () { if (window.TributeClientData) TributeClientData.reload(c.vivId); renderWorkspace(); },
          'scribe': function () { if (window.TributeScribe) TributeScribe.open(c); },
          'scribe-open': function () {
            if (window.TributeScribeReview) TributeScribeReview.open(c, b.dataset.enc); },
          'community': function () {
            // Communities became its own page on 17 Nov; selectCommunity()
            // routes there itself, so this no longer opens Coverage first.
            const g = call('selectCommunity'); if (g) g(c.loc);
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
      });
    });
    const det = $('.rd-more', ws);
    if (det) det.addEventListener('toggle', function () { _showAdmin = det.open; });
  }

  /* A read landing is the only reason the workspace redraws by itself. */
  window.addEventListener('tribute:client-data', function () {
    if (_selected) renderWorkspace();
  });
  window.addEventListener('tribute:scribe-list', function () {
    if (_selected) renderWorkspace();
  });


  function emptyState(total) {
    if (!total) return illustration('welcome', 'Your caseload is on its way',
      'Clients arrive from Viv on the next sync. You can also add one by hand.');
    if (_view === 'attention') return illustration('allclear', 'Everyone is caught up',
      'Every client is inside cadence for visits, touchpoints and care conversations.');
    if (_view === 'soon') return illustration('allclear', 'Nothing due in the next two weeks',
      'You are ahead of every cadence on this caseload.');
    if (_view === 'onboarding') return illustration('calm', 'No one in their first 30 days',
      'New clients appear here the day care starts.');
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
    wrapLtc();
  }

  /* ── LTC board: people we no longer serve ──────────────────────────────
     An LTC insurance record outlives the client's discharge, because the
     billing tail does. But a board of people you stopped serving months ago
     makes the whole surface feel wrong, and a CSM said so on pilot day.

     They are hidden rather than deleted, with a count and a way back: a
     record can still matter after discharge, so losing it would be worse
     than showing it.

     The board only. A discharged client's own LTC panel is untouched, which
     is where you would go if you were actually winding one down. */
  let _ltcShowDischarged = false;

  function dischargedNames() {
    const app = A();
    const out = new Set();
    try {
      (app.fn.get('clients') || []).forEach(function (c) {
        const st = String(c.vivStatus || '').toLowerCase();
        if (c.vivDischarged || st === 'discharged' || st === 'inactive') {
          if (c.name) out.add(String(c.name).toLowerCase().trim());
        }
      });
    } catch (e) {}
    return out;
  }

  function wrapLtc() {
    if (typeof window.renderLTC !== 'function' || window.renderLTC.__rd) return;
    const orig = window.renderLTC;
    const wrapped = function () {
      orig.apply(this, arguments);
      let hidden = 0;
      try {
        const gone = dischargedNames();
        if (gone.size) {
          const el = document.getElementById('ltc-table');
          if (el) {
            // The original renders a card per record and the client's name is
            // the first bold line in each, so the rows are matched the same
            // way the client detail already matches LTC records: by name.
            [].forEach.call(el.children, function (card) {
              const nm = card.querySelector('div[style*="font-weight:700"]');
              const n = nm ? nm.textContent.toLowerCase().trim() : '';
              if (n && gone.has(n)) {
                if (_ltcShowDischarged) { card.style.opacity = '.55'; }
                else { card.style.display = 'none'; hidden++; }
              } else { card.style.opacity = ''; }
            });
          }
        }
      } catch (e) {}
      try {
        const el = document.getElementById('ltc-table');
        const old = document.getElementById('rd-ltc-disch'); if (old) old.remove();
        if (el && (hidden || _ltcShowDischarged)) {
          const n = document.createElement('p');
          n.id = 'rd-ltc-disch';
          n.className = 'rd-ltc-disch';
          n.innerHTML = _ltcShowDischarged
            ? 'Showing discharged clients. <button type="button" id="rd-ltc-t">Hide them</button>'
            : hidden + ' discharged client' + (hidden === 1 ? '' : 's') +
              ' hidden. <button type="button" id="rd-ltc-t">Show anyway</button>';
          el.parentNode.insertBefore(n, el);
          const b = document.getElementById('rd-ltc-t');
          if (b) b.addEventListener('click', function () {
            _ltcShowDischarged = !_ltcShowDischarged; window.renderLTC();
          });
        }
      } catch (e) {}
    };
    wrapped.__rd = true; wrapped.original = orig;
    window.renderLTC = wrapped;
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
    /* One heading over the tiles AND the list, because they are one thought:
       the tiles are the filters and the list is what they filter. */
    const sAttn = sec('rd-s-attn', 'Needs attention', 'What is new, and not yet sorted');
    sAttn.insertAdjacentHTML('beforeend', '<div id="rd-attn"></div><div id="rd-today"></div>');
    // Today first, because the question a CSM opens the Hub with is "what is
    // happening today", not "how is my caseload trending". The numbers still
    // come, under Caseload health, where they inform rather than greet.
    const sNext = sec('rd-s-next', 'Today', 'And the next two weeks');
    const sCase = sec('rd-s-case', 'Caseload health');
    const sTools = sec('rd-s-tools', 'Your work');
    sTools.className = 'rd-sec quiet';
    /* CASELOAD HEALTH GOES TO THE BOTTOM, CLOSED.
       Courtney, 17 Nov: "Caseload health is manager information. CSMs don't
       need tier mix and touch counts every morning." Her layout has it as one
       line at the bottom, closed by default.

       Not deleted: she said CSMs do not need it each morning, not that nobody
       needs it. Collapsing also retires two of the three disagreeing numbers
       she found, because High touch and the 30-day touch count were only ever
       confusing next to High Need and the compliance figure. */
    if (ph && ph.nextSibling) page.insertBefore(sAttn, ph.nextSibling); else page.appendChild(sAttn);
    sAttn.after(sNext); sNext.after(sTools); sTools.after(sCase);
    sCase.classList.add('rd-sec-fold');
    if (upcoming) sNext.appendChild(upcoming);
    sNext.insertAdjacentHTML('beforeend', '<div class="card" id="rd-next"></div>');
    if (stats) sCase.appendChild(stats);
    if (caseload) sCase.appendChild(caseload);
    if (drill) sCase.appendChild(drill);
    if (grid) sTools.appendChild(grid);

    /* The fold itself. Closed on arrival, opens on the heading, and says so:
       a heading that hides things without looking like it does is worse than
       no fold at all. */
    const caseH = sCase.querySelector('.rd-sec-h');
    if (caseH) {
      caseH.setAttribute('role', 'button');
      caseH.setAttribute('tabindex', '0');
      caseH.setAttribute('aria-expanded', 'false');
      caseH.insertAdjacentHTML('beforeend',
        '<span class="rd-fold-hint">Tier mix, touch counts and visit compliance</span>' +
        '<span class="rd-fold-car" aria-hidden="true">›</span>');
      const toggle = function () {
        const open = sCase.hasAttribute('data-open');
        if (open) sCase.removeAttribute('data-open'); else sCase.setAttribute('data-open', '1');
        caseH.setAttribute('aria-expanded', open ? 'false' : 'true');
      };
      caseH.addEventListener('click', toggle);
      caseH.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
      });
    }
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
    // One definition, asked three ways: these two, the Clients tabs and the
    // Today's list all route through needsAction / dueSoonOnly.
    const bad = real.filter(needsAction);
    const warn = real.filter(dueSoonOnly);

    /* CHANGE OF CONDITION FIRST. Everything else on this row is a cadence
       falling behind; this one is a person whose health has altered, and it
       is the only item here that can be clinically time-critical. It used to
       sit third, below two counts about scheduling. Asked for by a CSM on
       pilot day, and she was plainly right. */
    try {
      if (typeof window._myCocTasks === 'function') {
        const coc = _myCocTasks().filter(function (t) { return t.open; });
        if (coc.length) out.push({ n: coc.length, label: coc.length === 1 ? 'Change of condition' : 'Changes of condition', sub: 'Open in Viv', tone: 'bad', go: 'clients' });
      }
    } catch (e) {}
    /* THIS ONE OWNS THE CLIENTS BADGE. Courtney, section 1: "The Clients
       badge (18) doesn't match anything a CSM sees on Home... I'd make the
       badge equal the number on the Today's list, and nothing else."

       The rail was ADDING every signal that points at Clients, so the badge
       read needs-action plus due-soon plus any change of condition: on a real
       caseload 16 + 6 = 22, a number that appears nowhere else on the Hub.
       Clients opens on Needs attention, so the badge is that tab's count and
       the list under it holds exactly that many, which is her third rule. */
    if (bad.length) out.push({
      n: bad.length, label: bad.length === 1 ? 'Client needs action' : 'Clients need action',
      sub: bad.slice(0, 2).map(function (c) { return String(c.name).split(' ')[0]; }).join(', ') +
        (bad.length > 2 ? ' and ' + (bad.length - 2) + ' more' : ''),
      tone: 'bad', go: 'clients', view: 'attention', badge: true, bucket: 'action'
    });
    if (warn.length) out.push({ n: warn.length, label: 'Due soon', sub: 'Within two weeks', tone: 'warn', go: 'clients', view: 'soon', bucket: 'week' });
    const t = todayISO();
    const ovTodo = todos.filter(function (x) { return !x.done && x.due && x.due < t; });
    if (ovTodo.length) out.push({ n: ovTodo.length, label: 'Tasks past due', sub: String(ovTodo[0].text || '').slice(0, 44), tone: 'warn', go: 'home' });
    try {
      /* THE NUMBER IS THE ROWS YOU GET, which is what she asked of every
         tile: "The number on each tile is the number of rows you get when you
         click it." The tile counted VISITS and the list under it groups them
         by CLIENT, so this was the one tile on Home that disagreed with its
         own list. Both sides read openVisitsSoon() now, so they cannot drift.

         badge: false. This signal put its number on the Fill Priority rail
         item, and Fill Priority ranks the WHOLE caseload for a coverage event
         rather than listing open visits, so no number here was ever one you
         could go and count there. */
      const ovs = openVisitsSoon();
      const ovN = Object.keys(ovs.byClient).length;
      if (ovN) out.push({ n: ovN, label: 'Open visits',
                          sub: 'Within 48 hours \u00b7 ' + plural(ovs.total, 'visit') + ' unfilled in all',
                          tone: 'warn', go: 'priority', badge: false, bucket: 'open' });
    } catch (e) {}
    const onb = real.filter(function (c) { return c.startDate && (daysSince(c.startDate) || 999) <= 30; });
    if (onb.length) out.push({ n: onb.length, label: 'In first 30 days', sub: 'Onboarding milestones', tone: 'info', go: 's60', bucket: 'onboarding' });
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
  /* ── TODAY'S LIST ──────────────────────────────────────────────────────────
     Courtney, 17 Nov: "Four sections answer 'who needs me?' The Needs
     attention tiles, the Following up board, the High need line in Caseload
     health, and 'Overdue: Ruth Richter, Virginia Tips… and 13 more.' A CSM has
     to read all four and put it together themselves."

     One list of anything new or not yet sorted. Each row is a client, why they
     are on it, and the next step. Her sort order exactly: Pulse flags, then
     Success in 30 milestones, then overdue visits and touchpoints, then due
     this week.

     ANYTHING ALREADY SORTED IS NOT NEW. A client whose Pulse flag has been
     acknowledged has left this list and is in their Following up column, which
     is what makes the two halves of Home one thought instead of two.

     The tiles above became the filters for it, so the number on a tile is the
     number of rows you get when you press it, which is her third rule applied
     to Home. */
  /* ONE NAME PER BUCKET, USED EVERYWHERE. The tile took its label from the
     signal and the filter line took it from here, so the same six clients
     were "Due soon · within two weeks" on the tile and "due this week" on the
     line under it. These names are now the only ones.

     Three are Courtney's words from section 2. The second is not: she wrote
     "Due this week", and the data behind it is the warn-tone exception, which
     is due within FOURTEEN days and is what the Clients page has always
     called Due soon. Her label would have been a week's difference from the
     thing it names, so the accurate word wins and this note records the
     deviation rather than hiding it. */
  const TODAY_BUCKETS = [['action', 'Need action today'], ['week', 'Due soon'],
                         ['onboarding', 'In first 30 days'], ['open', 'Open visits']];
  let _todayFilter = '';

  /* OPEN VISITS ON HOME ARE THE URGENT ONES (Courtney, section 9): "Open
     visits on a CSM's clients show on the client's Schedule tab, and on
     Today's list when they're within 48 hours."

     Home was listing all of them, which on a real caseload is 53 unfilled
     visits across 14 clients sitting beside items that genuinely need the CSM
     today. Scheduling fills these; a CSM needs to see the ones about to
     happen, and the rest belong on the client.

     The 48-hour window is the Hub's existing one, not a second definition of
     urgent: index.html's urgentOpen has used `day <= now + 48h` since before
     this review, past-due open visits included, because an unfilled visit
     that has already come round is more urgent rather than less. Two ideas of
     "urgent" on one page is how these numbers stopped agreeing to begin with.

     The full total is not dropped. It is on the tile's sub-line, so a CSM can
     still see the caseload has 53 unfilled visits without them crowding out
     what they have to do this morning. */
  function openVisitsSoon() {
    const app = A();
    let ov = [];
    try { ov = ((app.data.profiles[app.profile.id]) || {}).vivOpenVisits || []; }
    catch (e) { return { byClient: {}, total: 0 }; }
    const cutoff = Date.now() + 48 * 3600 * 1000;
    const byClient = {};
    ov.forEach(function (v) {
      const d = v.day ? new Date(String(v.day).slice(0, 10) + 'T12:00:00') : null;
      if (!d || d.getTime() > cutoff) return;
      const k = v.clientName || v.client || '';
      if (k) byClient[k] = (byClient[k] || 0) + 1;
    });
    return { byClient: byClient, total: ov.length };
  }

  function todayRows() {
    const app = A();
    if (!app.ready) return [];
    const out = [];
    let cl = [];
    try { cl = (app.fn.get('clients') || []).filter(function (c) { return !c.isOffice; }); } catch (e) { return []; }

    cl.forEach(function (c) {
      // 1. Pulse flags, unless somebody has already sorted this one.
      const pp = pulseFor(c);
      if (pp && pp.level && pp.level !== 'green' && !c.pulseAck) {
        out.push({ rank: 0, bucket: 'action', cid: c.id, name: c.name,
                   why: pulseFirst(pp.headline), step: 'Read the Pulse and sort it',
                   tone: pp.level === 'red' ? 'bad' : 'warn' });
      }
      // 2. Success in 30, for anyone inside their first month.
      const age = c.startDate ? daysSince(c.startDate) : null;
      if (age !== null && age <= 30) {
        const done = rowsFor('s60', c.id).length;
        out.push({ rank: 1, bucket: 'onboarding', cid: c.id, name: c.name,
                   why: 'Day ' + (age + 1) + ' of 30' + (done ? ' · ' + plural(done, 'milestone') + ' logged' : ' · nothing logged yet'),
                   step: 'Work the onboarding checklist', tone: done ? 'info' : 'warn' });
      }
      // 3 and 4. The cadence exception, which already knows overdue from due.
      const ex = exceptionFor(c);
      if (ex) out.push({ rank: ex.tone === 'bad' ? 2 : 3,
                         bucket: ex.tone === 'bad' ? 'action' : 'week',
                         cid: c.id, name: c.name, why: ex.text,
                         step: ex.tone === 'bad' ? 'Book it or defer it' : 'Get it in the diary',
                         tone: ex.tone });
    });

    // Open visits are the client's, but they are Scheduling's to fill, so the
    // step says who it goes to rather than implying the CSM covers it. Only
    // the next 48 hours reach this list; see openVisitsSoon().
    try {
      const byClient = openVisitsSoon().byClient;
      Object.keys(byClient).forEach(function (k) {
        const c = cl.find(function (x) { return x.name === k; });
        out.push({ rank: 4, bucket: 'open', cid: c ? c.id : '', name: k,
                   why: plural(byClient[k], 'visit') + ' unfilled in the next 48 hours',
                   step: 'With the Scheduling Partner', tone: 'warn' });
      });
    } catch (e) {}

    out.sort(function (a, b) { return a.rank - b.rank || String(a.name).localeCompare(String(b.name)); });

    /* ONE ROW PER CLIENT, which is what she wrote: "Each row is a client, why
       they're on the list, and the next step." Singular, three times.

       It is also the only way the numbers can agree. A client with a Pulse
       flag AND an overdue visit was two rows, so Home counted 38 things while
       the Clients tab counted 29 people, both labelled as needing action —
       her exact complaint, one layer down. Counting rows and counting clients
       are different questions, and a tile that filters a list has to answer
       the list's question.

       The sort above already put the most urgent first, so the first row a
       client has is the one worth showing; the rest are the same person said
       again. A client in their first thirty days who is ALSO flagged appears
       under Need action today and not under In first 30 days, which is the
       right order of business even though it makes that tile smaller.

       Open-visit rows can carry no client id when the name does not match the
       roster; those are keyed by name so two unmatched clients are not folded
       into one. */
    const seen = {}, one = [];
    out.forEach(function (r) {
      const k = r.cid || ('name:' + r.name);
      if (seen[k]) return;
      seen[k] = 1;
      one.push(r);
    });
    return one;
  }

  /* The tiles and the list are two halves of one control, so both repaint.
     Pressing the tile you are already on clears the filter, which is the way
     back to everything now that the chip row has gone. */
  function setTodayFilter(k) {
    _todayFilter = (_todayFilter === k) ? '' : k;
    _attnKey = '';
    renderAttention();
  }

  function renderToday() {
    const el = $('#rd-today');
    if (!el) return;
    const rows = todayRows();
    const n = {}; TODAY_BUCKETS.forEach(function (b) { n[b[0]] = 0; });
    rows.forEach(function (r) { if (n[r.bucket] !== undefined) n[r.bucket]++; });

    // Nothing to sort is worth saying plainly, and is not the same as a source
    // that failed: that distinction is renderAttention's and is kept there.
    if (!rows.length) {
      el.innerHTML = '<p class="rd-ws-quiet">Nothing new to sort. Anything you have already sorted is in Following up below.</p>';
      return;
    }
    /* NO SECOND ROW OF THE SAME NUMBERS. This used to render its own row of
       filter chips under the tiles, so Home showed "Need action today 16"
       twice: once as a tile that navigated away, once as a chip that
       filtered. The tiles do the filtering now, so all that is needed here is
       a way back to everything when one of them is pressed. */
    const shown = _todayFilter ? rows.filter(function (r) { return r.bucket === _todayFilter; }) : rows;
    const lab = (TODAY_BUCKETS.filter(function (b) { return b[0] === _todayFilter; })[0] || [])[1];
    el.innerHTML =
      (_todayFilter
        ? '<div class="rd-td-f"><span>Showing ' + shown.length + ' of ' + rows.length + ' \u00b7 ' +
          esc(String(lab || '').toLowerCase()) + '</span>' +
          '<button type="button" class="rd-td-all" data-td="">Show everything</button></div>'
        : '') +
      (shown.length
        ? '<ul class="rd-td">' + shown.map(function (r) {
            return '<li class="rd-td-r ' + r.tone + '"' + (r.cid ? ' data-cid="' + esc(r.cid) + '" tabindex="0"' : '') + '>' +
              '<span class="rd-td-n">' + esc(r.name) + '</span>' +
              '<span class="rd-td-w">' + esc(r.why) + '</span>' +
              '<span class="rd-td-s">' + esc(r.step) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="rd-ws-quiet">Nothing under that filter.</p>');

    $$('[data-td]', el).forEach(function (b) {
      b.addEventListener('click', function () { setTodayFilter(b.dataset.td); });
    });
    $$('.rd-td-r[data-cid]', el).forEach(function (r) {
      const go = function () { openClient(r.dataset.cid); };
      r.addEventListener('click', go);
      r.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); }
      });
    });
  }

  function renderAttention() {
    const el = $('#rd-attn');
    if (!el) return;
    const sig = attentionSignals();
    const rank = { bad: 0, warn: 1, info: 2 };
    sig.sort(function (a, b) { return (rank[a.tone] - rank[b.tone]) || (b.n - a.n); });
    // The bucket counts come from the list itself, so the tiles and the rows
    // under them can never disagree: one is a count of the other.
    const tn = {}; TODAY_BUCKETS.forEach(function (b) { tn[b[0]] = 0; });
    todayRows().forEach(function (r) { if (tn[r.bucket] !== undefined) tn[r.bucket]++; });
    // _todayFilter belongs in the key now that it decides which tile is lit:
    // without it, pressing a tile repainted the list and left the row above
    // it looking untouched.
    const key = sig.map(function (s) { return s.tone + s.n + s.label; }).join('|') +
                '#' + failedSources().join(',') + '#' + _todayFilter +
                '#' + TODAY_BUCKETS.map(function (b) { return tn[b[0]]; }).join(',');
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
        /* THE TILES ARE THE FILTERS (Courtney, 17 Nov, section 2): "Keep 4
           tiles across the top, but make them filters for the list below
           (Need action today, Due this week, In first 30 days, Open visits).
           The number on each tile is the number of rows you get when you
           click it."

           They were not. The tiles navigated away to other pages and a
           SECOND row of chips underneath did the filtering, so Home carried
           two rows of the same four numbers and pressing the obvious one took
           you off the page. One row now, and pressing a tile filters the list
           under it. Pressing it again clears the filter.

           A signal that is not one of her four buckets keeps the quiet line
           below: changes of condition, tasks past due, LTC blocked and
           Maryland gaps are real and were never part of the Today's list, and
           dropping them to make the row tidy would lose the one a CSM asked
           to have first on pilot day. Those still navigate, because there IS
           a page behind each of them. */
        const byBucket = {};
        sig.forEach(function (x) { if (x.bucket) byBucket[x.bucket] = x; });
        const rest = sig.filter(function (x) { return !x.bucket; });
        /* AN EMPTY TILE MUST NOT CLAIM MORE THAN IT KNOWS. Open visits is the
           one bucket whose tile can read zero while the caseload is not
           clear: today's figures are 0 within 48 hours and 53 unfilled across
           the month, because Scheduling fills the near days first. "Nothing
           right now" would have been an all-clear nobody earned. */
        const emptySub = function (k) {
          if (k === 'open') {
            const t = openVisitsSoon().total;
            if (t) return plural(t, 'visit') + ' unfilled, none in the next 48 hours';
          }
          return 'Nothing right now';
        };
        el.innerHTML = TODAY_BUCKETS.map(function (b) {
          const k = b[0], x = byBucket[k];
          const n = tn[k] || 0;
          const on = _todayFilter === k;
          return '<button type="button" class="rd-attn-card' + (x ? ' ' + x.tone : ' none') +
            (on ? ' on' : '') + '" data-td="' + k + '"' + (n ? '' : ' disabled') +
            ' aria-pressed="' + on + '">' +
            '<span class="rd-attn-n">' + n + '</span>' +
            '<span class="rd-attn-l">' + esc(b[1]) + '</span>' +
            '<span class="rd-attn-s">' + esc(x ? x.sub : emptySub(k)) + '</span></button>';
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
        $$('.rd-attn-card[data-td]', el).forEach(function (c) {
          c.addEventListener('click', function () { setTodayFilter(c.dataset.td); });
        });
        $$('.rd-attn-link', el).forEach(function (c) {
          c.addEventListener('click', function () {
            if (c.dataset.view) _view = c.dataset.view;
            const n = $('.nav-item[data-page="' + c.dataset.go + '"]');
            if (n) n.click();
          });
        });
      }
      refreshNavCounts(sig);
    }
    // Outside the key check: the list reflects what has been sorted, and that
    // changes without any of the tile numbers changing.
    renderToday();
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

  /* A BADGE IS A NUMBER YOU CAN GO AND COUNT. Summing every signal that
     points at a page produces a total that matches no list anywhere, which is
     exactly what Courtney found on Clients. A signal may claim its page's
     badge with `badge: true`; everything else still sums, because on those
     pages only one signal ever contributes. */
  function refreshNavCounts(sig) {
    const by = {};
    (sig || []).forEach(function (s) {
      if (s.badge === false) return;          // counts on Home, not on the rail
      if (by[s.go] && by[s.go].owned) return;
      if (s.badge) by[s.go] = { n: s.n, owned: true };
      else by[s.go] = { n: (by[s.go] ? by[s.go].n : 0) + s.n, owned: false };
    });
    ['home', 'clients', 's60', 'priority', 'ltc', 'md'].forEach(function (k) {
      const el = $('#rdc-' + k);
      if (!el) return;
      const v = (by[k] && by[k].n > 0) ? String(by[k].n) : '';
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
      '<input id="rd-pal-input" type="text" placeholder="Search clients, family, caregivers, communities…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="rd-pal-results">' +
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
  // caseload, a CSP or director their market, a manager everything.
  function paletteItems() {
    const app = A();
    const items = [];
    // `match` is searched but never shown: a CSM who only remembers the street
    // or the community should still find the person, without the row turning
    // into a paragraph. (§20)
    const add = function (grp, label, sub, run, icon, match) {
      items.push({ grp: grp, label: label, sub: sub, run: run, icon: icon, match: match || '' });
    };

    $$('.nav-item').forEach(function (n) {
      if (n.style.display === 'none') return;
      const lab = (($('.nav-label', n) || n).textContent || '').trim();
      add('Pages', lab, '', function () { n.click(); }, NAV_ICON[n.dataset.page] || 'circle');
    });
    if (!app.ready) return items;
    const p = app.profile;
    try {
      const seen = {};
      /* WHO ELSE IS FINDABLE (Courtney, priority 12): "Search covers family
         contacts, GCMs, caregivers and phone numbers, not just clients. When
         a daughter calls, the CSM knows her name, not always the client's."

         A family contact gets a row of their own, because the CSM is typing
         HER name and wants to see it come back, not guess which client row
         hides it. GCMs and caregivers get one row each however many clients
         they touch, and open the list filtered to them, because the useful
         answer to "Hallowell Associates" is all five of those clients rather
         than an arbitrary one.

         The whole client record is in `match` either way, so a phone number
         or an email finds the client even where no row names it. */
      const mine = [];
      const pushClient = function (c) {
        if (!c || seen[c.id || c.name]) return;
        seen[c.id || c.name] = 1;
        mine.push(c);
        add('Clients', c.name, [c.loc, c.city].filter(Boolean).join(' · '),
          function () { openClient(c.id); }, 'person',
          clientHaystack(c) + ' ' + (c.vivNum || ''));
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
      /* One row per contact, naming the client they belong to, because the
         row has to answer "whose daughter is this?" on sight. The Hub's own
         recorded contact is always here; Viv's fuller list joins it for any
         client already read this session, which is where the phone numbers
         and relationships come from. */
      const contactSeen = {};
      mine.forEach(function (c) {
        const rows = [];
        if (c.contact) rows.push({ name: c.contact, email: c.contactEmail || '', relation: '' });
        vivContactsFor(c).forEach(function (x) {
          if (x && x.name && x.role !== 'caregiver') rows.push(x);
        });
        rows.forEach(function (x) {
          const k = c.id + '|' + String(x.name).toLowerCase();
          if (contactSeen[k]) return;
          contactSeen[k] = 1;
          const rel = x.relation || x.relationship || '';
          add('Family contacts', x.name,
            (rel ? rel + ' \u00b7 ' : '') + c.name,
            function () { openClient(c.id); }, 'person',
            [x.email, x.phone, digits(x.phone), c.name].filter(Boolean).join(' '));
        });
      });

      /* A GCM or a caregiver is not a page, so the row does the only useful
         thing: it puts their name in the client list's search box, which now
         matches these fields, and shows every client they touch. */
      const spread = function (grp, icon, pick) {
        const by = {};
        mine.forEach(function (c) {
          pick(c).forEach(function (nm) {
            const k = String(nm).trim();
            if (!k || /^none$/i.test(k)) return;
            (by[k] = by[k] || []).push(c);
          });
        });
        Object.keys(by).sort().forEach(function (nm) {
          const n = by[nm].length;
          add(grp, nm, plural(n, 'client'), function () { searchClients(nm); }, icon, nm);
        });
      };
      spread('Care managers', 'person', function (c) { return c.gcm ? [c.gcm] : []; });
      spread('Caregivers', 'person', function (c) {
        const out = String(c.caregivers || '').split(/[,;\n]+/);
        vivContactsFor(c).forEach(function (x) { if (x.role === 'caregiver') out.push(x.name); });
        return out;
      });

      const comms = (app.data.shared && app.data.shared.communities) || {};
      Object.keys(comms).forEach(function (n) {
        const cm = comms[n] || {};
        const multi = Array.isArray(p.hub) && p.hub.length > 1;
        if (!p.isManager && !multi && cm.market && p.market && cm.market !== p.market) return;
        add('Communities', n, cm.market || '', function () {
          if (typeof window.selectCommunity === 'function') selectCommunity(n);
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

  /* Put a name in the list's own search box and show everything it matches.
     The view widens to All first, because a caregiver's clients are not all
     going to be in whichever tab happened to be open. */
  function searchClients(q) {
    const nv = $('.nav-item[data-page="clients"]');
    if (nv) nv.click();
    setTimeout(function () {
      const el = $('#cm-search');
      if (el) { el.value = q; }
      _view = 'all';
      _selected = null;
      renderTrackerList();
      if (el && el.focus) el.focus();
    }, 90);
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
    palRows = (q ? all.filter(function (i) { return (i.label + ' ' + (i.sub || '') + ' ' + (i.match || '')).toLowerCase().indexOf(q) > -1; })
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
    areaBlocks: { schedule: [], communication: [], care: [], overview: [], more: [],
                  careplan: [], activity: [], team: [], info: [] },
    exceptionFor: exceptionFor,
    trackerRows: trackerRows,
    tick: tick
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
