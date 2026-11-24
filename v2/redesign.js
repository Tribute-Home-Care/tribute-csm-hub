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
  /* COURTNEY'S RAIL, from the pictures in her 17 November review.

     Four groups, and the point of the fourth is that a CSM's rail should end
     at the work they do. Team, Client Pulse, Daily Metrics and Exception
     Review are already manager-gated, so a CSM has never seen them; they were
     just scattered through Operations and Tools as though everyone did. Named
     and grouped as Manager, the rail a CSM opens is ten items long and every
     one of them is theirs.

     Client Pulse stays here rather than being deleted. Her callout reads "no
     separate Pulse page to check", and in the view she drew, a CSM's, there
     isn't one: Pulse is a filter on the client list. The page behind it is the
     manager read of the same scoring, and removing it would take that with it
     for no gain to the people she is designing for.

     Her shorter labels, as drawn: Clients, Coverage, Team, and My KSFs for
     what the Hub had been calling the KPI Tracker. */
  const GROUPS = [
    ['Work', [['home', 'Home'], ['clients', 'Clients'], ['coverage', 'Coverage'],
              ['s60', 'Onboarding'], ['priority', 'Fill Priority']]],
    ['Operations', [['ltc', 'LTC'], ['emailcomm', 'Communities'],
                    ['md', 'Maryland Compliance']]],
    /* Her section 1: "Guide and Feedback are already on every page through
       the ? link and the Feedback button", and Role Expectations folds into
       My KSFs. The rail is the work, not everything that exists.

       FEEDBACK IS NOT LOST. The sidebar keeps its own Send feedback button
       below the nav, which is how the production Hub got one at all; the
       entry removed here is the duplicate in the list. */
    ['Resources', [['assistant', 'Assistant'], ['kpi', 'My KSFs']]],
    /* DAILY METRICS AND EXCEPTION REVIEW ARE TABS ON TEAM, NOT RAIL ENTRIES.
       Courtney, 23 Nov: "There is no Team page. The sidebar still shows
       Daily Metrics and Exception Review." Team was in the rail and did
       open -- what it opened was V1's "Manager Hub" with two more manager
       destinations sitting beside it, so the manager view was three rail
       entries that answer one question. They are folded in below. */
    ['Manager', [['team', 'Team'], ['pulse', 'Client Pulse']]]
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
      /* ONLY WHAT THE RAIL ASKED FOR. This exists because Guide and Feedback
         come from layers that may finish loading after the rail is built, and
         it re-adds anything missing. When Guide and Feedback were taken OUT
         of GROUPS it re-added them anyway, at the end of the rail, labelled
         with the raw key: a CSM saw "__guide" and "__feedback" under
         Resources. An entry that is not in GROUPS is not missing, it is
         deliberately absent. */
      const entry = GROUPS.reduce(function (a, g) { return a.concat(g[1]); }, [])
        .find(function (it) { return it[0] === key; });
      if (!entry) return;
      const label = entry[1];
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
    /* The sync used to be said three times: twice in the sidebar and once
       here, none of them where a CSM looks. It is said once now, on the line
       under the greeting. See renderSyncLine(). */
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
/* HER TABS, from the two Clients pictures in the 17 November review:
   All 42 / Needs action 9 / Watch 10 / Success in 30 3 / Due this week 6 /
   Covering 0.

   I had collapsed Watch and Due this week into one "Due soon", and argued
   that her label was a week out from the thing it named, because that bucket
   was a fourteen-day warning. Her pictures have both, doing different jobs,
   and reading them that way makes the argument go away:

     Watch        something is off, nothing is due. An amber Pulse flag, or a
                  client with no touchpoint on record at all.
     Due this week  a DATE lands inside seven days.

   So "Due this week" now means seven days and counts dates, which is what it
   says, and the fourteen-day fudge is gone rather than relabelled. */
  const VIEWS = [
    ['all', 'All clients'],
    ['attention', 'Needs action'],
    ['watch', 'Watch'],
    ['onboarding', 'Success in 30'],
    ['soon', 'Due this week'],
    ['covering', 'Covering']
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
  /* PULSE'S OWN THREE STATES ARE THE CLIENTS LIST'S FILTERS (Courtney,
     section 9): "Pulse lives on the Clients list instead of its own page.
     Needs action, Watch and Stable become filters."

     Pulse reads red, amber or green, and those are her three words: red needs
     action, amber is a watch, green is stable. So a RED flag joins Needs
     attention and an AMBER one joins Due soon, the tab that has always meant
     "worth an eye on, not today". Nothing had to be added to the tab bar to
     fold Pulse in, which is the point: she asked for ONE filter row, not for
     Pulse's tabs to arrive beside the existing ones.

     The first pass put both red and amber into Needs attention. That made a
     watch look like an emergency, and on this caseload a watch was most of
     the tab. An alarm that includes the things you were only asked to keep an
     eye on is an alarm people learn to ignore, which is the same failure as a
     count nobody trusts. */
  function pulseLevel(c) {
    if (c.pulseAck) return '';                    // sorted is not unsorted
    const pp = pulseFor(c);
    const l = pp && pp.level;
    return (l && l !== 'green') ? l : '';
  }
  function pulseOpen(c) { return !!pulseLevel(c); }
  /* WHY A PULSE-FLAGGED CLIENT IS ON THE LIST.
     Needs attention now includes an unsorted Pulse flag, which is right: a
     client taken by paramedics needs the CSM whatever their cadence says. But
     the Status column reads exceptionFor(), and a flagged client with a
     healthy cadence has no exception — so they appeared in Needs attention
     with an EMPTY status cell, which is worse than not appearing at all. A
     row in a list of problems has to say what the problem is.

     THE WORDS ARE THE HUB'S OWN. Courtney's section 9 asks for plain labels
     ("Safety, Family not told, Coverage at risk, Care plan out of date, No
     recent contact") and in the same breath makes agreeing them a next step
     we do together. So this uses the reason codes Pulse already emits and the
     wording Home has always shown for them, and the new taxonomy waits for
     that conversation rather than being guessed at here.

     The sentence goes in the row's title, not the cell: she asked for one-line
     rows, and said herself that "the full read goes on the client page under
     the Pulse banner". */
  /* THE EVIDENCE, NOT THE CODE. This first mapped flagReason through
     {L1,L2,L3}, copied from Home's own map. Checked against the live feed:
     the Pulse emits EIGHT codes, L1 to L8, and carries no label for any of
     them. Three of the eight read as words and five fell through to a
     generic line, which is the same raw-system-text fault as "aware_none"
     wearing different clothes.

     The feed already carries the sentence: `reasons` is the rule evidence in
     English, "1 safety incident (45d)", "3 reliability complaints (45d)". So
     the row shows that, which needs no map, cannot go stale when a ninth code
     is added, and says something a CSM can act on rather than a letter and a
     number. Courtney's plain labels sit on top of this later, once they are
     agreed; this is the honest floor until then. */
  function pulseStatus(c) {
    const lvl = pulseLevel(c);
    if (!lvl) return null;
    const pp = pulseFor(c);
    /* THE SENTENCE, NOT THE SIGNAL. reasons[] holds the raw evidence Pulse
       counted -- "5 inbound family contacts in 7d" -- and where it has none,
       this fell through to "Flagged by Pulse", which tells a CSM nothing.
       The headline is the sentence Home already shows for the same client,
       and the two pages saying different things about one flag is the fault
       this whole review opened with. The raw signal is kept behind it. */
    const head = pulseFirst(pp.headline);
    const first = (pp.reasons || []).map(function (r) { return String(r || '').trim(); })
                                    .filter(Boolean)[0];
    return { tone: lvl === 'red' ? 'bad' : 'warn',
             text: head || first || 'Flagged by Pulse',
             note: first && head ? first : String(pp.headline || '') };
  }

  function needsAction(c) {
    const e = exceptionFor(c);
    if (e && e.tone === 'bad') return true;
    return pulseLevel(c) === 'red';
  }
  /* DAYS UNTIL THE NEXT DATE FALLS DUE, across the three cadences, or null
     when the client is on no clock at all. A tab that says "this week" has to
     be able to answer "how many days", and visitSt / tpSt / ciSt only go as
     far as "soon" — which is fourteen days for a visit, seven for a
     touchpoint and thirty for a care conversation. One tab cannot be built
     out of three different meanings of soon. */
  function daysUntilDue(c) {
    const app = A(), out = [];
    if (c.freq !== 'NA') {
      const cad = parseInt(c.freq) || 90, d = daysSince(c.lastVisit);
      if (d !== null) out.push(cad - d);
    }
    const tc = (app.tpCadence || {})[c.tier] || 30, td = daysSince(lastOf('touchpoints', c.id));
    if (td !== null) out.push(tc - td);
    const cc = (app.ciCadence || {})[c.tier] || 180, cd = daysSince(lastOf('checkins', c.id));
    if (cd !== null) out.push(cc - cd);
    const ahead = out.filter(function (n) { return n >= 0; });
    return ahead.length ? Math.min.apply(null, ahead) : null;
  }
  /* A date inside seven days, on a client who is not already in trouble. */
  function dueThisWeek(c) {
    if (needsAction(c) || pulseLevel(c) === 'amber') return false;
    const n = daysUntilDue(c);
    return n !== null && n <= 7;
  }
  /* Something is off and nothing is due: an amber Pulse flag, or one of the
     two exceptions that describe a gap rather than a deadline. */
  function onWatch(c) {
    if (needsAction(c)) return false;
    if (pulseLevel(c) === 'amber') return true;
    if (dueThisWeek(c)) return false;
    const e = exceptionFor(c);
    return !!(e && e.tone === 'warn' && (e.rank === 4 || e.rank === 5));
  }
  /* Clients somebody else owns and I am covering right now. They are not in
     my caseload, so they have to be read across profiles the way the Coverage
     page reads them. */
  function coveringRows() {
    const app = A(), me = (app.profile || {}).id;
    if (!me) return [];
    const today = todayISO(), out = [];
    (app.profiles || []).forEach(function (pr) {
      if (pr.id === me) return;
      (((app.data.profiles || {})[pr.id] || {}).clients || []).forEach(function (c) {
        const h = c && c.coverage;
        if (!h || h.coveredBy !== me) return;
        if (h.to && h.to < today) return;
        out.push({ c: c, owner: pr });
      });
    });
    return out;
  }
  // Kept as the union of the two, for anything that wants "notable but not
  // urgent" without caring which kind of trouble it is.
  function dueSoonOnly(c) { return dueThisWeek(c) || onWatch(c); }

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
      /* VIV'S OWN WORDS ARE NOT THE HUB'S. 'Processing' is the status
         string Viv sets while a client is being set up; it appeared on the
         Clients list as a status and means nothing to a CSM reading it.
         Said plainly here. If Scheduling calls it something else, this is
         the one line to change. */
      const label = { 'pending-discharge': 'Pending discharge', 'onhold': 'On hold', 'on-hold': 'On hold', 'processing': 'Being set up in Viv' }[vst]
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
    else if (_view === 'watch') list = list.filter(function (r) { return onWatch(r.c); });
    else if (_view === 'soon') list = list.filter(function (r) { return dueThisWeek(r.c); });
    else if (_view === 'covering') {
      /* The one tab whose clients are not mine, so it replaces the list
         rather than filtering it. Search and the tier filter are re-applied
         by hand, because they ran above against my own caseload. */
      list = coveringRows().map(function (x) {
        return { c: x.c, ex: exceptionFor(x.c), cov: x.owner };
      });
      if (q) list = list.filter(function (r) { return clientHaystack(r.c).indexOf(q) > -1; });
      if (tf) list = list.filter(function (r) { return r.c.tier === tf; });
    }
    else if (_view === 'onboarding') list = list.filter(function (r) { return inFirstDays(r.c, 30); });

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

    // (the filter row is folded together after the chip row is built)

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
      watch: all.filter(onWatch).length,
      soon: all.filter(dueThisWeek).length,
      onboarding: all.filter(function (c) { return inFirstDays(c, 30); }).length,
      covering: coveringRows().length
    };
    const rows = trackerRows();

    let viewBar = $('#rd-views');
    if (!viewBar) {
      viewBar = document.createElement('div');
      viewBar.id = 'rd-views';

      el.parentElement.insertBefore(viewBar, el);
    }
    const sub = document.getElementById('rd-cl-sub');
    if (sub) sub.textContent = plural(all.length, 'client') + ' \u00b7 click a row to open';

    /* THE CHIPS GET THEIR OWN BOX. They are repainted on every render, and
       ownClientsChrome moves V1's live search box and selects into this same
       row. Setting innerHTML on the row itself DESTROYED those nodes on the
       first repaint: the search box vanished from the page, and
       getElementById('cm-search') returned null from then on, so nothing
       could put it back. Only the chips are repainted now. */
    let chips = $('#rd-chips', viewBar);
    if (!chips) {
      chips = document.createElement('div');
      chips.id = 'rd-chips';
      chips.setAttribute('role', 'tablist');
      viewBar.appendChild(chips);
    }
    chips.innerHTML = VIEWS.map(function (v) {
      return '<button type="button" class="rd-view" role="tab" data-view="' + v[0] + '" aria-selected="' + (_view === v[0]) + '">' +
        esc(v[1]) + (counts[v[0]] ? '<span class="n">' + counts[v[0]] + '</span>' : '') + '</button>';
    }).join('');
    $$('.rd-view', chips).forEach(function (b) {
      b.addEventListener('click', function () { _view = b.dataset.view; renderTrackerList(); });
    });
    ownClientsChrome(viewBar);

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
    /* A ROW opens a client. This used to bind every [data-cid] in the table,
       which now includes the Email link inside a row: pressing Email would
       have opened the draft AND navigated away from the list. */
    $$('tr[data-cid]', el).forEach(function (b) {
      b.addEventListener('click', function () { selectClient(b.dataset.cid); });
    });
    $$('.rd-mailbtn', el).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();                 // not a navigation
        logEmailTouchpoint(b.dataset.cid);    // the draft opens via the href
      });
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
/* WHO TO CALL, ON THE ROW. Courtney's Clients picture gives every row a
   FAMILY CONTACT column reading "Lisa Pike (dtr)" with a Call and an Email
   beside it, and her client-page callout says it in as many words: "Call"
   dials the family contact, not just the client.

   The Hub's own c.contact / c.contactEmail are empty on every client, because
   CSMs keep contacts in Viv. So this reads the same source the search does.
   The full client record wins when it is loaded; the caseload-wide crawl is
   the fallback that makes the other forty-one rows useful.

   RELATIONSHIPS ARE SHORTENED, NOT GUESSED. Her picture writes "(dtr)". Viv's
   rrel is free text, so only the handful we have actually seen are
   abbreviated and anything else is printed as it was stored. A contact whose
   relationship Viv does not record shows a name and no bracket, which is
   true, rather than a guess. */
  const REL_SHORT = {
    daughter: 'dtr', son: 'son', wife: 'wife', husband: 'hus',
    mother: 'mom', father: 'dad', sister: 'sis', brother: 'bro',
    'care manager': 'CM', 'geriatric care manager': 'GCM',
    'power of attorney': 'POA', poa: 'POA', spouse: 'spouse',
    friend: 'friend', neighbor: 'neighbour', guardian: 'guardian',
    niece: 'niece', nephew: 'nephew', granddaughter: 'granddtr', grandson: 'grandson'
  };
  function relShort(r) {
    const k = String(r || '').trim().toLowerCase();
    if (!k) return '';
    if (REL_SHORT[k]) return REL_SHORT[k];
    // "primary", "emergency" and "family" say only where the contact was
    // found, which is not a relationship and reads oddly in a bracket.
    if (k === 'primary' || k === 'emergency' || k === 'family') return '';
    return String(r).trim();
  }
  function familyContact(c) {
    let list = [];
    try { list = (window.TributeClientData && TributeClientData.contacts(c.vivId)) || []; }
    catch (e) { list = []; }
    /* VIV FILES THE SAME PERSON TWICE: once as the primary contact, where
       the relationship field holds the word "primary", and again under
       family, where it holds the actual relationship. Taking the first entry
       gave the right person with no relationship, which is why her "(dtr)"
       bracket was missing on nearly every row. So the name comes from the
       first entry and the relationship from whichever entry for that person
       actually has one. */
    const first = list.find(function (x) { return x && (x.name || x.phone); });
    if (first && !relShort(first.relation) && first.name) {
      const named = list.find(function (x) {
        return x && x !== first && x.name === first.name && relShort(x.relation);
      });
      if (named) first.relation = named.relation;
    }
    if (first) {
      return { name: first.name || '', rel: relShort(first.relation),
               phone: first.phone || '', email: first.email || c.contactEmail || '' };
    }
    // The roster's own fields, for anyone the crawl has not reached.
    if (c.contact || c.contactEmail) {
      return { name: c.contact || '', rel: '', phone: '', email: c.contactEmail || '' };
    }
    return null;
  }
  /* The cell. A missing contact says so rather than leaving a blank the
     reader has to interpret: on this caseload the column was empty on every
     single row, and an empty cell reads as "no contact" when it meant
     "not read yet". */
  /* ── RECORDED OR NOT, AS A CHOICE AT THE MOMENT OF DIALLING ────────────
     Courtney: "Call has no recorded or non-recorded line choice. On the list
     and the client page it is a plain phone link."

     Recorded means placed through Teams, which is what the call recorder
     captures; not recorded means the plain handset link. Both dial the same
     person -- the difference is the route, and therefore whether the call
     joins Call Intelligence.

     This is deliberately a CHOICE and never a default. A recorded call is
     one a family may be told about, so the CSM picks the line each time
     rather than the Hub picking for them. */
  function e164(p) {
    const d = String(p || '').replace(/\D+/g, '');
    if (d.length === 10) return '+1' + d;
    if (d.length === 11 && d[0] === '1') return '+' + d;
    if (String(p || '').trim().charAt(0) === '+' && d.length > 7) return '+' + d;
    return null;   // not a number we can hand to Teams with any confidence
  }
  function teamsCallHref(p) {
    const n = e164(p);
    return n ? 'https://teams.microsoft.com/l/call/0/0?users=4:' + encodeURIComponent(n) : null;
  }
  function telHref(p) { return 'tel:' + String(p || '').replace(/[^\d+]/g, ''); }
  /* One menu, built once, moved to whichever button was pressed. A popover
     per row would be forty popovers in the DOM on a full caseload. */
  function popEl() {
    let m = document.getElementById('rd-callmenu');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'rd-callmenu';
    m.className = 'rd-callmenu';
    m.hidden = true;
    m.setAttribute('role', 'menu');
    document.body.appendChild(m);
    document.addEventListener('click', function (e) {
      if (!m.hidden && !m.contains(e.target) && !e.target.closest('[data-callbtn],[data-sortbtn]')) m.hidden = true;
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') m.hidden = true; });
    window.addEventListener('scroll', function () { m.hidden = true; }, true);
    return m;
  }
  function openCallMenu(btn) {
    const phone = btn.getAttribute('data-phone') || '';
    const who = btn.getAttribute('data-who') || '';
    const teams = teamsCallHref(phone);
    const m = popEl();
    m.innerHTML =
      (who ? '<div class="rd-cm-h">' + esc(who) + '</div>' : '') +
      (teams
        ? '<a class="rd-cm-i" role="menuitem" href="' + esc(teams) + '" target="_blank" rel="noreferrer">' +
          I('phone') + '<span><b>Call on recorded line</b>' +
          '<small>Through Teams. The call is recorded.</small></span></a>'
        : '<div class="rd-cm-i off"><span><b>Recorded line unavailable</b>' +
          '<small>This number is not in a form Teams can dial.</small></span></div>') +
      '<a class="rd-cm-i" role="menuitem" href="' + esc(telHref(phone)) + '">' +
      I('phone') + '<span><b>Call (not recorded)</b>' +
      '<small>Your handset. Nothing is captured.</small></span></a>';
    m.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = m.offsetWidth || 260;
    m.style.top = (r.bottom + 6) + 'px';
    m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    swapIcons(m);
    const first = m.querySelector('a.rd-cm-i');
    if (first) first.focus();
  }
  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-callbtn]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    openCallMenu(b);
  });
  function callButton(phone, who, cls, label) {
    return '<button type="button" class="' + cls + '" data-callbtn' +
      ' data-phone="' + esc(String(phone)) + '"' +
      (who ? ' data-who="' + esc(who) + '"' : '') +
      ' aria-haspopup="menu"' +
      ' title="Choose a recorded or non-recorded line">' +
      I('phone') + (label || 'Call') + '</button>';
  }

  /* ── HER PLAIN LABELS, AND WHO THEY BELONG TO ──────────────────────────
     Courtney: "no plain label (Safety, Family not told), no Who Needs to
     Know or Owner column, and no sort buttons on the row."

     THE LABEL IS DERIVED FROM THE COUNTS, NOT THE CODE. flagReason is L1 to
     L8 and the feed carries no label for any of them, so mapping her words
     onto those letters would be guessing. The counts say what the rule
     actually found, in order of seriousness.

     "FAMILY NOT TOLD" IS DELIBERATELY ABSENT. The nearest field is
     notifyContact, and it holds WHO to tell ("Daughter", "GCM"), not whether
     they have been told. Measured on the live feed, firing her label on a
     populated notifyContact would have labelled 119 of 168 flagged clients
     "Family not told" -- 71%, which tells a CSM nothing and is the same
     fault as a row of L-codes. notifyContact is the audience column instead,
     which is what it actually is. That label needs a field that does not
     exist yet; it is a question for Courtney, not a guess for here.

     OWNER FOLLOWS THE KIND OF FLAG, which is her rule. Measured spread over
     168 flagged clients: Coverage at risk 83, Clinical 36, Reliability 7,
     Safety 1, and 41 with no count to go on. */
  /* THE LABEL DESCRIBES THE SENTENCE IT SITS ABOVE.
     The first cut derived it from the rule counts (safeCount, clinCount,
     coverageCount, relCount) and that was wrong in a way worth recording:
     the counts are 45-day rule tallies and the headline is the AI's read of
     this week, so they answer different questions. Measured live: a client
     whose headline described a skin injury a caregiver had observed, with
     no record that the named contacts were told, carried safeCount 0,
     clinCount 0 and coverageCount 1 -- and so was labelled "Coverage at
     risk" directly above evidence about an unreported injury. A label that
     contradicts the sentence under it is worse than no label.

     So it reads the evidence: the headline, what the card says is already
     done, and what it says is documented. Measured spread over 168 flagged
     clients: Family not told 63, Clinical 58, Safety 23, Coverage at risk
     12, Reliability 4, and 8 with nothing to match on.

     The stems take \w*, because \b(...|bruis|...)\b needs a boundary AFTER
     the stem and so never matched "bruising", "injuries" or "catheterised".
     "on the floor" is in Safety because that is how a fall is most often
     described in a visit note, without the word. `burn` does NOT take \w*,
     because caregiver BURNOUT is not a burn: a flag about a lead caregiver
     carrying too many hours was reading as a safety incident.

     THE ORDER IS THE OPEN DECISION, and it is Courtney's. A fall nobody
     reported is both Safety and Family not told. Safety wins here because
     it is the more serious of the two, but she may want the communication
     gap to lead, since that is the part a CSM can close today. */
  const PULSE_LABELS = [
    ['Safety',
     /\b(fall|fell|falls|fallen|bruis\w*|red marks|skin tear|wound\w*|bed ?sore|pressure (sore|ulcer)|injur\w*|unsafe|burn(s|ed|ing)?|on the floor)\b/i,
     'CSM + MCE',                'Family, MCE'],
    ['Family not told',
     /\b(no record|no documentation|not been|was not|were not|nothing|never)\b[^.]{0,60}\b(told|notified|informed|aware|notif\w*)/i,
     'CSM',                      'Family'],
    ['Clinical',
     /\b(catheter\w*|infection\w*|uti|hospital\w*|medication\w*|condition|weight loss|pain|bleeding|confusion|declin\w*|pneumonia)\b/i,
     'CSM + MCE',                'Family, MCE'],
    ['Coverage at risk',
     /\b(call-?out|coverage|unfilled|no caregiver|open (shift|visit)|cancell?ed (shift|visit)|leave the case|removal|fill)\b/i,
     'CSM + Scheduling Partner', 'Family, Scheduling Partner'],
    ['Reliability',
     /\b(complaint\w*|late|no-?show|reliability|cell ?phone)\b/i,
     'CSM + Scheduling Partner', 'Scheduling Partner'],
    ['Needs a look', null, 'CSM', 'CSM']
  ];
  function pulseEvidence(pp) {
    if (!pp) return '';
    const h = Array.isArray(pp.headline) ? pp.headline.join(' ') : pp.headline;
    const card = pp.card || {};
    return [h, card.alreadyDone, card.documented].filter(Boolean).join(' ');
  }
  function pulseLabel(pp) {
    if (!pp) return null;
    const ev = pulseEvidence(pp);
    for (let i = 0; i < PULSE_LABELS.length; i++) {
      const row = PULSE_LABELS[i];
      if (row[1] === null || row[1].test(ev)) {
        return { label: row[0], owner: row[2], fallbackTell: row[3] };
      }
    }
    return null;
  }
  /* OWNER IS THE CARD'S OWN ANSWER, not a guess from the label. The Pulse
     already writes `whoseCall`, and on the live feed it normalises onto her
     three phrases for 161 of 168 flags: "CSM" 97, "CSM and MCE" and its
     longer forms 54, "CSM and Scheduling" 10. Seven say nothing, and those
     fall back to the owner the label implies. */
  function pulseOwner(pp, lab) {
    const w = String((pp && pp.card && pp.card.whoseCall) || '');
    if (/\bMCE\b/i.test(w)) return 'CSM + MCE';
    if (/schedul/i.test(w)) return 'CSM + Scheduling Partner';
    if (/\bCSM\b/i.test(w)) return 'CSM';
    return (lab && lab.owner) || '';
  }
  /* WHO NEEDS TO KNOW is the card's own sentence, which names the real
     people on this client and how to reach them. The first cut used
     notifyContact, which holds a fragment -- a name, a number and a
     dangling ampersand -- and read as a broken field in a column. */
  function pulseTell(pp, lab) {
    const w = String((pp && pp.card && pp.card.whoNeedsToKnow) || '').trim();
    if (w) return w;
    const bits = [];
    [pp && pp.notifyContact, pp && pp.notifySchedule].forEach(function (v) {
      String(v || '').split(/[,;&]+/).forEach(function (x) {
        const t = x.trim();
        if (t && bits.indexOf(t) < 0) bits.push(t);
      });
    });
    if (bits.length) return bits.join(', ');
    return (lab && lab.fallbackTell) || '';
  }

  /* The three ways a CSM sorts a flag, which are V1's own acknowledgement
     states. Sorting moves the row off Today's list and into Following up,
     which is what the footer has been promising with no button to do it. */
  const SORT_STATES = [
    ['aware_working', 'Working on it',   'It stays with you, off this list.'],
    ['aware_1to1',    'Raising in the 1:1', 'Goes to your next 1:1.'],
    ['aware_none',    'Nothing needed',  'Seen, and no action for now.']
  ];
  function openSortMenu(btn) {
    const cid = btn.getAttribute('data-sortbtn') || '';
    const m = popEl();
    m.innerHTML = '<div class="rd-cm-h">Sort this flag</div>' +
      SORT_STATES.map(function (st) {
        return '<button type="button" class="rd-cm-i" role="menuitem" data-sort-set="' +
          esc(st[0]) + '" data-sort-cid="' + esc(cid) + '">' +
          '<span><b>' + esc(st[1]) + '</b><small>' + esc(st[2]) + '</small></span></button>';
      }).join('');
    m.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = m.offsetWidth || 260;
    m.style.top = (r.bottom + 6) + 'px';
    m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    const first = m.querySelector('button.rd-cm-i');
    if (first) first.focus();
  }
  document.addEventListener('click', function (e) {
    const b = e.target.closest('[data-sortbtn]');
    if (b) { e.preventDefault(); e.stopPropagation(); openSortMenu(b); return; }
    const pick = e.target.closest('[data-sort-set]');
    if (!pick) return;
    e.preventDefault();
    e.stopPropagation();
    const m = document.getElementById('rd-callmenu');
    if (m) m.hidden = true;
    /* The note is passed empty on purpose. setPulseAck prompts when the note
       is left undefined, which is right at the client record and wrong here:
       sorting a row on Today's list is a triage gesture, and a blocking
       prompt in the middle of it is how the gesture stops being used. */
    try { if (window.setPulseAck) setPulseAck(pick.getAttribute('data-sort-cid'), pick.getAttribute('data-sort-set'), ''); }
    catch (err) {}
    renderToday();
  });

  function contactCell(c) {
    const f = familyContact(c);
    if (!f || (!f.name && !f.phone && !f.email)) {
      const warming = window.TributeClientData && TributeClientData.contactsState
        && TributeClientData.contactsState() !== 'ready';
      return '<span class="rd-ws-quiet">' + (warming ? 'Reading\u2026' : 'None on file') + '</span>';
    }
    const who = esc(f.name) + (f.rel ? ' <span class="rd-clt-rel">(' + esc(f.rel) + ')</span>' : '');
    const acts = [];
    if (f.phone) acts.push(callButton(f.phone, f.name + (f.rel ? ' (' + f.rel + ')' : ''), 'rd-cbtn'));
    /* EMAILING THE FAMILY FROM THE LIST COUNTS. Her section 3: "Call and
       Email buttons under the family contact... Both log to the client's
       Activity automatically, so a quick call from the list still counts as a
       touchpoint."

       The draft opens in whatever handles mail, and the touchpoint is written
       here rather than waiting for the CSM to come back and log it, because
       the one they do not come back for is the one that stops counting.
       data-cid carries the client, because the row's own handler is a
       navigation and must not fire. */
    if (f.email) acts.push('<a class="rd-cbtn rd-mailbtn" href="mailto:' + esc(f.email) +
      '" data-cid="' + esc(c.id) + '">' + I('mail') + 'Email</a>');
    return who + (acts.length ? '<span class="rd-clt-act">' + acts.join('') + '</span>' : '');
  }

/* ── THE REDESIGN LAYER OWNS THIS PAGE'S CHROME ───────────────────────────
   Everything above the table was V1's: a page header, a search row holding
   two selects and two buttons, a market chip bar, a legend. The redesign
   restyled some of it and left the rest showing through, which is why the
   page read as V1 with adjustments rather than as the page she drew.

   So it is rebuilt here instead. V1's header and bar are stood down, and the
   live controls inside them are MOVED rather than recreated: #cm-search and
   #cm-tier already carry their own handlers, and rebuilding them would mean
   two things that both think they own the filter.

   Her layout: the title and its one line, with the page's actions on the
   right; then a single filter row of search, the chips, and the two
   dropdowns. "One filter row. Replaces 2 dropdowns + 5 tabs + market chips +
   unused legend." */
  function ownClientsChrome(viewBar) {
    if (!viewBar) return;
    const page = document.getElementById('page-clients');
    if (!page) return;

    // V1's header and its filter/action bar, stood down once.
    const ph = $('.ph', page);
    if (ph) ph.hidden = true;
    const v1bar = $('#cm-search') ? $('#cm-search').closest('div') : null;

    let head = document.getElementById('rd-cl-head');
    if (!head) {
      head = document.createElement('div');
      head.id = 'rd-cl-head';
      head.className = 'rd-pagehead';
      head.innerHTML = '<div><h2>Clients</h2><p id="rd-cl-sub"></p></div>' +
                       '<div class="rd-pageacts" id="rd-cl-acts"></div>';
      page.insertBefore(head, page.firstChild);
    }

    /* The actions are moved out of the filter row and up beside the title,
       which is where her picture leaves room for them: her filter row holds
       filters and nothing else. */
    const acts = document.getElementById('rd-cl-acts');
    $$('button.btn', v1bar || page).forEach(function (b) {
      if (b.closest('#rd-cl-acts')) return;
      if (!/Add Client|LTC Records/i.test(b.textContent || '')) return;
      b.classList.remove('btn-p', 'btn-o');
      b.classList.add('rd-act-btn');
      acts.appendChild(b);
    });

    // Search leads the filter row, as it does in her picture.
    const search = document.getElementById('cm-search');
    if (search && search.parentElement !== viewBar) {
      search.removeAttribute('style');
      search.classList.add('rd-fsearch');
      search.placeholder = 'Search a client, a family contact, a caregiver\u2026';
      viewBar.insertBefore(search, viewBar.firstChild);
      search.setAttribute('aria-label', 'Search clients');
    }

    /* The Status select is the "2 dropdowns" she asked to lose: every state it
       filtered is a chip now, so it would be a second way to ask the same
       question and a second number to disagree with. */
    const status = document.getElementById('cm-status');
    if (status) { status.hidden = true; status.value = ''; }
    const legend = document.getElementById('cm-legend');
    if (legend) legend.hidden = true;

    /* THE MARKET BAR IS ADOPTED, NOT BUILT. V1 creates #julia-mkt-bar itself,
       so a version of this that built its own and guarded on the id never ran:
       whichever fired first won, and it was V1's. The BUTTONS stay in the DOM,
       hidden, because V1 writes to #mfb-all and friends when it resets the
       filter and would throw on null. */
    const bar = document.getElementById('julia-mkt-bar');
    if (bar) {
      bar.classList.add('rd-inrow');
      const lab = $('.mfb-lab', bar);
      if (lab) lab.hidden = true;
      $$('.mfb-btn', bar).forEach(function (b) { b.hidden = true; });
      if (!document.getElementById('rd-mkt-sel')) {
        const sel = document.createElement('select');
        sel.id = 'rd-mkt-sel';
        sel.className = 'rd-fsel';
        sel.setAttribute('aria-label', 'Market');
        sel.innerHTML = '<option value="all">All markets</option>' +
          '<option value="Massachusetts">Massachusetts</option>' +
          '<option value="Chicago">Chicago</option>';
        sel.addEventListener('change', function () {
          const v = this.value;
          const btn = document.getElementById(
            v === 'all' ? 'mfb-all' : v === 'Chicago' ? 'mfb-chi' : 'mfb-ma');
          try { setJuliaFilter(v, btn); } catch (e) {}
        });
        bar.appendChild(sel);
      }
      const cur = document.getElementById('rd-mkt-sel');
      if (cur && A().juliaMarket && cur.value !== A().juliaMarket) cur.value = A().juliaMarket;
      if (bar.parentElement !== viewBar) viewBar.appendChild(bar);
    }

    const tier = document.getElementById('cm-tier');
    if (tier && tier.parentElement !== viewBar) {
      tier.removeAttribute('style');   // V1 pins it to 130px inline
      tier.classList.remove('fc');
      tier.classList.add('rd-fsel');
      viewBar.appendChild(tier);
    }
  }

  /* One listener on the table rather than one per row: the table is
     rewritten on every render, and a listener per row would be rebound with
     it. Logging is a write, so it refuses in a read-only View as session for
     the same reason queueSave does. */
  function logEmailTouchpoint(cid) {
    const app = A();
    try {
      if (typeof writesBlocked === 'function' && writesBlocked()) return;
      const now = new Date(), day = now.toISOString().slice(0, 10);
      const tps = app.fn.get('touchpoints') || [];
      tps.unshift(Object.assign({
        id: 'tp' + now.getTime(), clientId: cid, date: day, type: 'EMAIL',
        note: 'Emailed the family from the client list',
        by: (typeof P !== 'undefined' && P) ? P.name : '', auto: false
      }, typeof actorStamp === 'function' ? actorStamp() : {}));
      if (typeof set === 'function') set('touchpoints', tps);
      if (typeof showToast === 'function') showToast('Draft opened. Logged as a touchpoint.');
    } catch (e) {}
  }

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
      const newish = inFirstDays(c, 30);
      // daysSince is negative for a future date, so days-until is its negation.
      const until = nv ? -daysSince(nv) : null;
      const soonAsmt = newish && until !== null && until >= 0 && until <= 7;
      /* The cadence exception leads where there is one, because it is the
         thing with a date on it. A client whose cadence is fine and whose
         Pulse is flagged shows the flag instead of nothing at all. */
      const ps = pulseStatus(c);
      const st = ex || ps;
      /* HER PLAIN LABEL HERE TOO. "The Clients list still shows only the
         sentence." Today's list has carried the label, the audience and the
         owner since the 23rd; this row carried the word "Pulse" and the
         sentence, so the same flag read as two different things depending
         on which page you were on. One vocabulary. */
      const pp = pulseFor(c);
      const plab = ps ? pulseLabel(pp) : null;
      const powner = ps ? pulseOwner(pp, plab) : '';
      // The cadence exception leads where there is one, because it has a date
      // on it. Where there is not, the flag is named by her label.
      const stText = ex ? ex.text : (ps ? ((plab && plab.label) || 'Pulse flag') : '');
      const stTone = ex ? ex.tone : (ps ? ps.tone : '');
      const tip = ps && ps.note ? ps.note : '';
      return '<tr class="rd-clt-row' + (soonAsmt ? ' due' : '') + '" data-cid="' + esc(c.id) + '" tabindex="0"' +
        (tip ? ' title="' + esc(tip) + '"' : '') + '>' +
        '<th scope="row"><span class="rd-clt-n">' + esc(c.name) + '</span>' +
          (soonAsmt ? '<span class="rd-clt-tag">Assessment due</span>' : '') + '</th>' +
        '<td>' + (c.tier ? '<span class="rd-tier ' + esc(String(c.tier).toLowerCase()) + '">' +
          esc(c.tier) + '</span>' : '<span class="rd-ws-quiet">—</span>') + '</td>' +
        /* C2. THE PULSE REASON ON THE ROW. Her section 9 wants one line per
           client saying what happened, so a CSM can triage the list without
           opening every flagged one. The cadence exception still leads, since
           it is the thing with a date on it; the flag goes underneath.

           Joined here, in the data layer, rather than scraped off Home: the
           Clients page has to be right when Home has never been opened. */
        /* THE STATUS CELL HOLDS A LABEL, NEVER A SENTENCE.
           A client flagged by Pulse with a healthy cadence has no exception,
           so `ex || ps` put the whole Pulse sentence into .rd-cl-ex, which is
           white-space: nowrap. One long sentence stretched the column to
           about 800px and pushed Last visit, Next due, Family contact and
           Community off the screen.

           So the status says what KIND of thing it is, and the sentence goes
           on the same clamped Pulse line every other flagged row already
           uses. Every row with a flag now reads the same way. */
        '<td>' + (stText ? '<span class="rd-cl-ex ' + stTone + '"><i class="rd-dot"></i>' + esc(stText) + '</span>' : '') +
          (ps ? '<div class="rd-clt-pl" title="' + esc(ps.note || ps.text) + '">' +
                '<b>' + esc((plab && plab.label) || 'Pulse') + ':</b> ' + esc(ps.text) + '</div>' +
                (powner ? '<span class="rd-td-ow rd-clt-ow">' + esc(powner) + '</span>' : '') +
                /* AND THE SORT BUTTON, which her Pulse mockup has on the row.
                   Today's list has had it since the 23rd; without it here a
                   CSM reading the Clients list has to go back to Home to
                   sort the same flag. Same three states, same handler. */
                '<button type="button" class="rd-td-sort rd-clt-sort" data-sortbtn="' + esc(c.id) +
                '" aria-haspopup="menu" title="Sort this flag off Today\u2019s list">Sort</button>'
                : '') + '</td>' +
        '<td>' + (c.lastVisit ? esc(fmtShort(c.lastVisit)) : '<span class="rd-ws-quiet">None</span>') + '</td>' +
        '<td>' + (nv ? esc(fmtShort(nv)) : (c.freq === 'NA' ? '<span class="rd-ws-quiet">No cadence</span>' : '')) + '</td>' +
        '<td class="rd-clt-con">' + contactCell(c) + '</td>' +
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
    const tbl = $('#client-master-table', page);

    /* NEVER MARK SOMETHING THAT CONTAINS THE LIST.
       This used to find V1's filter bar by walking UP from #cm-search to the
       direct child of the page. That worked while the search sat in V1's own
       bar. The redesign now moves the search into the filter row, which lives
       in the SAME card as the list, so the walk returned that card: marking
       it as chrome meant opening a client hid the list itself, and the page
       went blank. Reported on the live page.

       So the guard is the rule rather than the lookup: chrome is anything
       named below that does not contain the list. */
    const mark = function (el) {
      if (!el) return;
      if (tbl && el.contains(tbl)) return;
      el.classList.add('rd-list-chrome');
    };
    mark($('.ph', page));
    mark($('#cm-legend', page));
    mark($('#rd-cl-head', page));     // the head the redesign draws
    mark($('#rd-views', page));       // the filter row
    // V1's original filter bar, found by a control still inside it rather
    // than by one the redesign has moved out.
    const status = $('#cm-status', page);
    if (status) mark(status.closest('div'));
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
  /* THE HEADER PAINTS FROM A SNAPSHOT THAT MAY NOT HAVE ARRIVED YET.
     CD() reads the cache and returns whatever is there; nothing in the
     workspace asked for the record or repainted when it landed. V1's own
     detail build happens to kick the read off, so on a warm cache the header
     was complete and on a cold open it quietly lost the unit, the client
     number, start of care and the CSM -- present one build, absent the next,
     with no code change between them. That is what "lost the unit again"
     was: a race, not a field name.

     One wait per client rather than one per paint, and the repaint is
     skipped if you have moved on. `ready` returns early once the state is
     ready, so the repaint cannot drive itself in a loop. */
  let _awaiting = null;
  function wsAwait(c) {
    const S = window.TributeClientData;
    if (!S || !S.ready || !c || !c.vivId) return;
    const snap = CD(c);
    if (snap && (snap.state === 'ready' || snap.state === 'error')) return;
    if (_awaiting === c.vivId) return;
    _awaiting = c.vivId;
    const done = function () {
      if (_awaiting === c.vivId) _awaiting = null;
      if (_selected === c.id) renderWorkspace();
    };
    try { S.ready(c.vivId).then(done, done); }
    catch (e) { _awaiting = null; }
  }
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
    /* Viv's status strings arrive in whatever case Viv stored them, and the
       header line printed them raw: 'active' in the middle of a sentence of
       proper nouns. Capitalised for the line, not altered in the data. */
    const rawStatus = (c.vivStatus && String(c.vivStatus).toLowerCase() !== 'active')
      ? c.vivStatus : (d.service && d.service.status) || 'Active';
    const status = String(rawStatus || '').replace(/^./, function (m) { return m.toUpperCase(); });
    /* P1. ONE HEADER LINE, her section 4: "name, tier, status, market,
       community and unit, start of care, CSM, client number on one line."
       It carried only the market and the status, so everything else was a
       card away: a CSM on the phone had to scroll to say which community the
       client is in or read back a client number.

       Anything the Hub does not know is left out rather than printed as a
       blank or a dash, so the line is short when the record is thin instead
       of being a row of holes. */
    const ok = function (v) {
      return v && !/^(none|n\/a|\u2014|-|not on file|unknown)$/i.test(String(v).trim());
    };
    /* THE REAL FIELD NAMES, taken from the Community and LTC card rather
       than guessed: the first cut invented c.unit, c.clientNo and
       d.service.clientNumber, none of which exist, so the unit and the client
       number were simply absent from the line. */
    const sv = d.service || {};
    const unit = ct.unit || '';
    const soc = sv.careStarted || c.startDate || '';
    const csmName = c.csm || ((A().profile || {}).name) || '';
    const num = sv.clientNum || c.vivNum || '';
    const meta = [
      c.market || (d.market || ''),
      status,
      ok(sv.community || c.loc) ? ((sv.community || c.loc) + (ok(unit) ? ', ' + unit : '')) : '',
      ok(soc) ? 'Start of care ' + fmtShort(soc) : '',
      ok(csmName) ? 'CSM ' + csmName : '',
      ok(num) ? '#' + num : ''
    ].filter(Boolean).join(' · ');

    const acts = [];
    /* "Call" DIALS THE FAMILY CONTACT, NOT JUST THE CLIENT, and says whose
       number it is. Her words, on the client-page picture. The button read
       "Call" over whichever number happened to be first, which on a client
       living in a community is often the community's. */
    const fam = familyContact(c);
    const phone = (fam && fam.phone) || ct.phone || (d.primaryContact && d.primaryContact.phone) || '';
    if (phone) {
      const who = fam && fam.phone && fam.name
        ? String(fam.name).trim().split(/\s+/)[0] + (fam.rel ? ' (' + fam.rel + ')' : '')
        : '';
      acts.push(callButton(phone, who, 'rd-act', '<span>' + (who ? 'Call ' + esc(who) : 'Call') + '</span>'));
    }
    if (fam && fam.email) {
      acts.push('<a class="rd-act" href="mailto:' + esc(fam.email) + '">' +
        I('mail') + '<span>Email family</span></a>');
    }
    if (addr) acts.push('<a class="rd-act" target="_blank" rel="noreferrer"' +
      ' href="https://maps.apple.com/?q=' + encodeURIComponent(addr) + '">' +
      I('pin') + '<span>Directions</span></a>');
    /* P2. ONE LOG BUTTON, AT THE TOP. Her section 4: "One Log button at the
       top. Remove Log activity and '...' at the bottom."

       The footer is gone, so what it could do comes here rather than being
       deleted with it: logging a VISIT and a CARE CONVERSATION lived only in
       that menu, and dropping them would have taken the only way to record a
       visit off the client page. Same for Edit client, Draft update, Fill
       priority and Add LTC record, which are now behind the one small menu
       at the end of the row. */
    acts.push('<div class="rd-menu rd-act-menu"><button type="button" class="rd-act" data-menu="log">' +
      I('conversation') + '<span>Log contact</span>' + I('chevronDown') + '</button>' +
      '<div class="rd-menu-list" data-for="log">' +
      '<button type="button" data-act="log-tp">Touchpoint</button>' +
      '<button type="button" data-act="log-visit">Visit</button>' +
      '<button type="button" data-act="log-ci">Care conversation</button>' +
      '</div></div>');
    // Scribe. The reserved placeholder is now the real thing: one tap from
    // the client, because that is where a CSM is standing when they need it.
    acts.push('<div class="rd-menu rd-act-menu"><button type="button" class="rd-act" data-menu="more" aria-label="More actions">' +
      I('more') + '</button>' +
      '<div class="rd-menu-list right" data-for="more">' +
      '<button type="button" data-act="edit">Edit client</button>' +
      '<button type="button" data-act="draft">Draft update</button>' +
      '<button type="button" data-act="fill">Fill priority</button>' +
      '<button type="button" data-act="ltc-add">Add LTC record</button>' +
      '</div></div>');
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
    wsAwait(c);
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

  /* ── MARYLAND COMPLIANCE ─────────────────────────────────────────────────
     Courtney, section 8. Her three complaints about this page, in her order:

       "Five tabs with one problem per row, instead of one row per client
        with a column for each requirement."
       "Very old items at the top mixed with current deadlines."
       "No Mine / All CSMs / Group by CSM switch, only a Mine toggle."

     A tab per PROBLEM means a client with three problems is read three
     times and a client with none is invisible, so the page answers "which
     problems exist" when the question a CSM has is "is this client clear".
     One row per client, one column per requirement, and the answer is the
     row.

     THE COLUMNS COME FROM MD_REGS, not from a list written here. The page
     calls these "the seven Baltimore requirements" and MD_REGS defines SIX;
     driving the table off the constant means the table and the regulation
     list cannot drift apart, whichever of the two is corrected. */
  const MD_SHORT = {
    initial: '48h initial', cadence: 'Assessment', annual: 'Annual',
    reassess: 'Reassessment', weekly: 'Weekly note', pmof: 'PMOF'
  };
  /* The same expressions renderMdDetail uses, in one place so the table and
     the detail panel cannot disagree about one client. true = on file,
     false = not met, null = nothing to judge it against. */
  function mdStates(r) {
    const a = r.lastAssessment, ini = r.initial || {}, tr = r.reassessmentOwed || [];
    return {
      initial:  (ini.ok === null || ini.ok === undefined) ? null : ini.ok,
      cadence:  !a ? null : (r.overdueByEff > 0 ? false : true),
      annual:   !a ? null : (r.annualOverdueBy > 0 ? false : true),
      reassess: tr.length ? false : true,
      weekly:   (r.touchSource && r.touchSource.noActivity) ? null : (r.missedWeeks12 === 0),
      pmof:     r.pmofNeeded ? null : true
    };
  }
  /* VERY OLD IS NOT URGENT, IT IS HISTORY. Her second complaint: an
     assessment 971 days overdue sat above one due next week. Nothing that
     old is a deadline anybody is going to meet this month; it is a record to
     correct. A year is the line, because an annual assessment that has been
     missed for more than a year is a different kind of problem from one
     that slipped. */
  const MD_CLEANUP_DAYS = 365;
  function mdIsCleanup(r) {
    if (r.overdueByEff !== null && r.overdueByEff !== undefined && r.overdueByEff > MD_CLEANUP_DAYS) return true;
    // No assessment on file AND no Viv forms at all is a records problem.
    return r.statusEff === 'none' && r.formsOnFile === 0;
  }
  const MD_VIEWS = [['mine', 'Mine'], ['all', 'All CSMs'], ['bycsm', 'Group by CSM']];
  let _mdView = 'mine';
  function mdOwn(r) {
    const me = ((A().profile || {}).name) || '';
    return !!me && String(r.csm || '').toLowerCase() === me.toLowerCase();
  }
  function mdCell(st) {
    if (st === null || st === undefined)
      return '<td class="rd-md-c none" title="Nothing on file to judge this against">' +
             '<i class="rd-dot"></i><span class="rd-sr">Not known</span></td>';
    if (st) return '<td class="rd-md-c ok" title="On file"><i class="rd-dot"></i>' +
                   '<span class="rd-sr">On file</span></td>';
    return '<td class="rd-md-c bad" title="Not met"><i class="rd-dot"></i>' +
           '<span class="rd-sr">Not met</span></td>';
  }
  function mdRowHtml(r) {
    const st = mdStates(r);
    const open = (r.overdueByEff !== null && r.overdueByEff !== undefined && r.overdueByEff > 0)
      ? plural(r.overdueByEff, 'day') + ' overdue'
      : (r.nextDueEff ? 'Due ' + fmtShort(r.nextDueEff) : '');
    return '<tr class="rd-md-r" data-mdcid="' + esc(r.cid) + '" tabindex="0">' +
      '<th scope="row">' + esc(r.name || '') +
        (open ? '<span class="rd-md-when">' + esc(open) + '</span>' : '') + '</th>' +
      '<td class="rd-md-csm">' + esc(r.csm || '') + '</td>' +
      MD_REGS.map(function (g) { return mdCell(st[g[0]]); }).join('') +
      '</tr>';
  }
  function mdTableHtml(rows) {
    return '<div class="rd-clt-wrap"><table class="rd-clt rd-md"><thead><tr>' +
      '<th scope="col">Client</th><th scope="col">CSM</th>' +
      MD_REGS.map(function (g) {
        return '<th scope="col" class="rd-md-h" title="' + esc(g[1]) + '">' +
               esc(MD_SHORT[g[0]] || g[0]) + '</th>';
      }).join('') +
      '</tr></thead><tbody>' + rows.map(mdRowHtml).join('') + '</tbody></table></div>';
  }
  /* THE LAYER'S OWN EARLIER BAR, which is the one she can actually see.
     workflows.js builds #md-views: the counted problem tabs -- "Needs
     attention 45", "Assessment due 8" -- and a single Mine toggle. That is
     exactly what she asked to be replaced ("five tabs with one problem per
     row", "only a Mine toggle"), and hiding V1's pill row underneath it
     changed nothing on screen. Without this the page grows a THIRD row of
     controls instead of losing one.

     IT IS DONE ON EVERY RENDER, not once at decorate time: workflows.js
     builds that bar on its own pass, which on a cold open happens AFTER the
     page is first shown. Doing it once found nothing and left the tabs up.

     The SEARCH box lives inside it, because workflows.js MOVED the
     application's own input there rather than recreating one, so it is
     moved out rather than hidden with its parent -- otherwise the page
     loses its search and the table loses the field it filters on. */
  function supersedeMdBar(host) {
    const bar = $('#md-views');
    if (!bar || bar.classList.contains('rd-md-superseded')) return;
    const search = $('#md-search');
    /* BEFORE the host, not inside it: renderMdTable rewrites host.innerHTML
       on every pass, which would destroy the input it had just rescued. */
    if (search && host && host.parentElement) host.parentElement.insertBefore(search, host);
    bar.classList.add('rd-md-superseded');
  }
  function renderMdTable() {
    const host = $('#rd-md-table');
    if (!host || typeof _mdRows !== 'function') return;
    supersedeMdBar(host);
    let rows = [];
    try { rows = _mdRows(); } catch (e) { return; }
    const q = String(($('#md-search') || {}).value || '').trim().toLowerCase();
    if (q) rows = rows.filter(function (r) {
      return (String(r.name || '') + ' ' + String(r.csm || '')).toLowerCase().indexOf(q) > -1;
    });
    if (_mdView === 'mine') rows = rows.filter(mdOwn);
    const live = rows.filter(function (r) { return !mdIsCleanup(r); });
    const old = rows.filter(mdIsCleanup);
    // Soonest deadline first inside the live group; the cleanup group is the
    // worst first, because that is the order you would work a backlog in.
    live.sort(function (a, b) { return (b.overdueByEff || -9999) - (a.overdueByEff || -9999); });
    old.sort(function (a, b) { return (b.overdueByEff || 0) - (a.overdueByEff || 0); });

    let body;
    if (_mdView === 'bycsm') {
      const by = {};
      live.forEach(function (r) { (by[r.csm || 'No CSM'] = by[r.csm || 'No CSM'] || []).push(r); });
      body = Object.keys(by).sort().map(function (k) {
        return '<h4 class="rd-md-g">' + esc(k) + '<span>' + plural(by[k].length, 'client') + '</span></h4>' +
               mdTableHtml(by[k]);
      }).join('');
    } else {
      body = live.length ? mdTableHtml(live)
        : '<p class="rd-ws-quiet">Nothing outstanding under this view.</p>';
    }
    host.innerHTML =
      '<div class="rd-md-views">' + MD_VIEWS.map(function (v) {
        return '<button type="button" class="rd-view' + (_mdView === v[0] ? ' on' : '') +
               '" data-mdview="' + v[0] + '">' + esc(v[1]) + '</button>';
      }).join('') + '</div>' + body +
      (old.length
        ? '<details class="rd-md-clean"><summary>Cleanup · ' + plural(old.length, 'client') +
          ' more than a year past due<span>Records to correct, not deadlines to meet</span></summary>' +
          mdTableHtml(old) + '</details>'
        : '');
    $$('[data-mdview]', host).forEach(function (b) {
      b.addEventListener('click', function () { _mdView = b.dataset.mdview; renderMdTable(); });
    });
    $$('[data-mdcid]', host).forEach(function (tr) {
      const go = function () {
        try { window._mdSel = tr.dataset.mdcid; if (typeof renderMdDetail === 'function') renderMdDetail(); } catch (e) {}
      };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    swapIcons(host);
  }
  /* V1's five problem tabs and its own row list come off, and the table
     takes their place. The DETAIL panel stays exactly as it is: it already
     reads as she wants, and it is the thing a row opens. */
  function decorateMd() {
    const page = $('#page-md');
    if (!page || page.dataset.rdMd) return;
    const rowsEl = $('#md-rows', page);
    if (!rowsEl) return;
    page.dataset.rdMd = '1';
    /* V1's own pill row FIRST, while rowsEl still has it as its previous
       sibling: inserting the table host before rowsEl makes the host the
       previous sibling and this lookup finds the wrong element. */
    const tabs = rowsEl.previousElementSibling;
    if (tabs) {
      $$('button', tabs).forEach(function (b) { b.hidden = true; });
    }
    const host = document.createElement('div');
    host.id = 'rd-md-table';
    rowsEl.parentElement.insertBefore(host, rowsEl);
    rowsEl.hidden = true;
    const search2 = $('#md-search', page);
    if (search2) search2.addEventListener('input', function () { renderMdTable(); });
    if (typeof window.renderMdRows === 'function') {
      const orig = window.renderMdRows;
      window.renderMdRows = function () {
        const r = orig.apply(this, arguments);
        try { renderMdTable(); } catch (e) {}
        return r;
      };
    }
    /* AND THE LOAD ITSELF, which is the one that matters. Caught live: the
       page opens, renderMd() goes off to fetch the board, and the table drew
       once against an empty _mdData and read "Nothing outstanding under this
       view" for a CSM with twenty-seven clients on it. renderMd is async and
       does not call renderMdRows on every path, so the table waits on the
       promise rather than on a redraw that may not come. */
    if (typeof window.renderMd === 'function') {
      const origMd = window.renderMd;
      window.renderMd = function () {
        const out = origMd.apply(this, arguments);
        Promise.resolve(out).then(function () {
          try { renderMdTable(); } catch (e) {}
        }, function () {});
        return out;
      };
    }
    renderMdTable();
    /* The page may already be mid-load when this runs, in which case neither
       hook fires for the pass that is in flight. One short follow-up, only
       while the table is still empty, rather than a poll that never stops. */
    let tries = 0;
    const settle = setInterval(function () {
      tries++;
      const host = $('#rd-md-table');
      if (!host || tries > 12) { clearInterval(settle); return; }
      if (host.querySelector('table.rd-md')) { clearInterval(settle); return; }
      try { renderMdTable(); } catch (e) {}
    }, 1000);
  }

  /* ── TEAM ────────────────────────────────────────────────────────────────
     V1's page is headed "Manager Hub" with a rocket and a sentence about
     cross-market views. Her rail calls it Team, and a page should be called
     what the thing that opens it is called.

     The two manager pages fold in as tabs rather than being rebuilt. Each
     one owns its own element and renders itself; this moves that element
     under the Team page and takes the `page` class off it, because
     showPage() hides everything carrying that class and would otherwise
     hide a panel nested inside the page it had just shown. */
  const TEAM_PANELS = [
    ['metrics',  'Daily Metrics',    'TributeMetrics'],
    ['sereview', 'Exception Review', 'TributeSEReview']
  ];
  let _teamPanel = '';
  function teamModule(name) {
    const m = window[name];
    return (m && typeof m.allowed === 'function' && m.allowed()) ? m : null;
  }
  function showTeamPanel(key) {
    const page = $('#page-team');
    if (!page) return;
    _teamPanel = key;
    const host = $('#rd-team-panel', page);
    // V1's own two views are the page itself, so they come back by being
    // shown rather than by being redrawn.
    ['team-overview-content', 'team-visit-content'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.hidden = !!key;
    });
    const bar = $('#team-market-tabs');
    if (bar) bar.hidden = !!key;
    TEAM_PANELS.forEach(function (p) {
      const m = teamModule(p[2]);
      const el = m && document.getElementById(m.pageId);
      if (!el) return;
      if (p[0] === key) {
        el.classList.remove('page');     // or showPage() hides it under us
        el.hidden = false;
        el.style.display = '';
        if (el.parentElement !== host) host.appendChild(el);
        try { m.open(); } catch (e) {}
      } else if (el.parentElement === host) {
        el.hidden = true;
      }
    });
    $$('[data-teamtab]', page).forEach(function (b) {
      b.classList.toggle('active', b.dataset.teamtab === key);
    });
    ['tv-tab-overview', 'tv-tab-visits'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el && key) el.classList.remove('active');
    });
    if (!key) {
      const ov = document.getElementById('tv-tab-overview');
      if (ov && typeof window.teamViewTab === 'function') window.teamViewTab('overview', ov);
    }
  }
  /* HER TEAM PAGE IS A TABLE, not a card per person (section 9). Nine cards
     of sixteen numbers each is a wall: comparing two CSMs meant reading two
     cards and holding one in your head. One row per CSM, the same numbers,
     and the column you care about reads straight down.

     The numbers are V1's own -- workloadFor() and getOv() -- so the table
     and the cards it replaces cannot disagree. It is rendered after V1's own
     pass, into the element V1 drew the cards in.

     Self is already excluded: V1's pool filters p.id !== P.id. */
  /* HER COLUMNS. The first six were the last build's; Needs action,
     Checklist late and Raised in 1:1 are from her mockup.

     "Coverage ready" is NOT here, and that is deliberate: I could not find a
     reading of the coverage data I would stand behind, and a column of
     numbers nobody can explain is worse on a manager's page than a missing
     one. It is a question for her, not a guess. */
  const TEAM_COLS = [
    ['clients', 'Clients'], ['action', 'Needs action'], ['high', 'High need'],
    ['late', 'Checklist late'], ['s30', 'In first 30'], ['over', 'Overdue'],
    ['one21', 'Raised in 1:1'], ['touch', 'Touches 30d'], ['comp', 'Visit compliance']
  ];
  /* CSPs ARE THEIR OWN SECTION, her words. A CSP does not carry a caseload
     the way a CSM does, so in one table their row read as the worst
     performer on the page: one client, one overdue, nought per cent. */
  function isCSP(p) {
    return /\bCSP\b/i.test(String(p.role || '')) || !!p.isCSC;
  }
  function isCSM(p) {
    return !isCSP(p) && !p.isDirector && !p.isManager;
  }
  const TEAM_WHO = [['csm', 'CSMs'], ['all', 'Everyone']];
  let _teamWho = 'csm';
  /* BARE NAMES, NOT window LOOKUPS. These are top-level `const` declarations
     in a classic script, so they live in the shared global LEXICAL
     environment and are readable by name from here -- but they are not
     properties of window, and asking window for them returned undefined.
     That is how the first cut silently fell back to V1's cards on a page
     that had all the data it needed.

     getOv is worse than that: it is a const declared INSIDE
     renderTeamOverview, so it is a local nothing outside can reach. Its rule
     is three lines and is reproduced here rather than pretended at --
     `freq !== 'NA' && (never visited || days since > cadence)`. If V1's rule
     changes this has to change with it, which is why the rule is written out
     rather than hidden behind a helper name. */
  function teamRowsData() {
    const getCl = (typeof get === 'function') ? get : null;
    const wl = (typeof workloadFor === 'function') ? workloadFor : null;
    const ago = (typeof daysAgo === 'function') ? daysAgo : null;
    const profiles = (typeof PROFILES !== 'undefined') ? PROFILES : null;
    const me = (typeof P !== 'undefined') ? P : null;
    if (!getCl || !wl || !ago || !profiles) return null;
    const ov = function (pid) {
      return (getCl('clients', pid) || []).filter(function (c) {
        const d = ago(c.lastVisit);
        return c.freq !== 'NA' && (d === null || d > (parseInt(c.freq) || 90));
      });
    };
    let pool = [];
    try {
      pool = profiles.filter(function (p) {
        return p.id !== (me && me.id) && !p.coverageMarketOnly;
      });
      const mk = (typeof _teamMarket !== 'undefined') ? _teamMarket : 'all';
      if (mk && mk !== 'all') pool = pool.filter(function (p) {
        return p.market === mk || (Array.isArray(p.hub) ? p.hub.indexOf(mk) > -1 : p.hub === mk);
      });
    } catch (e) { return null; }
    /* MILESTONES PAST THEIR DUE DATE, for a caseload that is not the one
       signed in. get(key, pid) takes a profile id, so the milestone log is
       reachable; the due date is S30_MILESTONES + TODO_MS_DAYS + _todoDay,
       which is how s30Checklist computes it for the current profile. Same
       arithmetic, so the two cannot disagree. */
    const lateFor = function (pid, cl) {
      if (typeof S30_MILESTONES === 'undefined' || typeof TODO_MS_DAYS === 'undefined' ||
          typeof _todoDay !== 'function') return null;
      const logged = getCl('s60', pid) || [];
      const today = localDay(0);
      let n = 0;
      cl.forEach(function (c) {
        if (!c.startDate || !inFirstDays(c, 30)) return;
        S30_MILESTONES.forEach(function (m) {
          if (logged.some(function (x) { return x.clientId === c.id && x.id === m.id; })) return;
          const due = _todoDay(c.startDate, TODO_MS_DAYS[m.id] || 7);
          if (due && due < today) n++;
        });
      });
      return n;
    };
    return pool.map(function (p) {
      const cl = getCl('clients', p.id) || [];
      const over = ov(p.id) || [];
      const w = wl(p.id) || {};
      const trackable = cl.filter(function (c) { return c.freq !== 'NA'; });
      const comp = trackable.length
        ? Math.round((trackable.length - over.length) / trackable.length * 100) : null;
      return { p: p, clients: cl.length,
               high: cl.filter(function (c) { return c.tier === 'High'; }).length,
               touch: w.touches || 0, over: over.length,
               /* inFirstDays, not (daysAgo || 999) <= 30: daysAgo returns 0
                  for care starting today, so the falsy fallback dropped the
                  newest client on every CSM's row. Still live in V1. */
               s30: cl.filter(function (c) { return inFirstDays(c, 30); }).length,
               /* NEEDS ACTION, read from what is true across profiles. The
                  layer's needsAction() leans on touchpoint history for the
                  SIGNED-IN profile, so it cannot be asked about somebody
                  else's caseload. A red Pulse is global (keyed by vivId) and
                  an overdue visit is on the client record, so those two are
                  the honest reading here. It is a floor, not V1's
                  definition, and the page says so. */
               action: cl.filter(function (c) {
                 if (pulseLevel(c) === 'red') return true;
                 const d = ago(c.lastVisit);
                 return c.freq !== 'NA' && (d === null || d > (parseInt(c.freq) || 90));
               }).length,
               late: lateFor(p.id, cl),
               /* Sorting a flag as "raising in the 1:1" writes pulseAck on
                  the client, so this counts what is waiting for their next
                  one-to-one. */
               one21: cl.filter(function (c) {
                 return c.pulseAck && c.pulseAck.state === 'aware_1to1';
               }).length,
               comp: comp };
    });
  }
  function renderTeamTable() {
    const host = $('#team-cards');
    if (!host) return;
    const all = teamRowsData();
    if (!all) return;                        // V1 keeps its cards if we cannot
    if (!all.length) { host.innerHTML = '<p class="rd-ws-quiet">No CSMs for this market.</p>'; return; }
    const csms = all.filter(function (r) { return isCSM(r.p); });
    const csps = all.filter(function (r) { return isCSP(r.p); });
    const others = all.filter(function (r) { return !isCSM(r.p) && !isCSP(r.p); });
    const rows = _teamWho === 'csm' ? csms : csms.concat(others);
    rows.sort(function (a, b) { return b.over - a.over || b.clients - a.clients; });
    csps.sort(function (a, b) { return b.touch - a.touch; });
    const cell = function (r, k) {
      if (k === 'comp') {
        if (r.comp === null) return '<td class="rd-tm-n"><span class="rd-ws-quiet">—</span></td>';
        const tone = r.comp >= 90 ? 'ok' : r.comp >= 75 ? 'warn' : 'bad';
        return '<td class="rd-tm-n ' + tone + '">' + r.comp + '%</td>';
      }
      const v = r[k];
      const tone = (k === 'over' && v) ? 'bad' : (k === 'high' && v) ? 'warn' : '';
      return '<td class="rd-tm-n' + (tone ? ' ' + tone : '') + '">' + v + '</td>';
    };
    const tbl = function (list, cols) {
      return '<div class="rd-clt-wrap"><table class="rd-clt rd-tm"><thead><tr>' +
        '<th scope="col">CSM</th>' +
        cols.map(function (c) { return '<th scope="col" class="rd-tm-h">' + esc(c[1]) + '</th>'; }).join('') +
        '</tr></thead><tbody>' +
        list.map(function (r) {
          return '<tr class="rd-tm-r" data-csm="' + esc(r.p.id) + '" tabindex="0">' +
            '<th scope="row"><span class="rd-tm-who">' + esc(r.p.name) + '</span>' +
            '<span class="rd-tm-role">' + esc(r.p.role || '') +
              (r.p.market ? ' · ' + esc(r.p.market) : '') + '</span></th>' +
            cols.map(function (c) { return cell(r, c[0]); }).join('') + '</tr>';
        }).join('') + '</tbody>' +
        /* THE TOTALS LIVE IN THE TABLE. V1's strip above it carried the same
           five numbers computed a second way, which is how "In Onboarding 3"
           came to sit above a column headed "In first 30" reading 4. One
           source, one number, and the sum is literally the column. */
        (list.length > 1 ? '<tfoot><tr><th scope="row">' + plural(list.length, 'person') + '</th>' +
          cols.map(function (c) {
            if (c[0] === 'comp') return '<td class="rd-tm-n"></td>';
            const vals = list.map(function (r) { return r[c[0]]; })
                             .filter(function (v) { return typeof v === 'number'; });
            return '<td class="rd-tm-n">' + vals.reduce(function (a, b) { return a + b; }, 0) + '</td>';
          }).join('') + '</tr></tfoot>' : '') +
        '</table></div>';
    };
    host.className = '';                     // drop V1's g3 card grid
    host.innerHTML =
      '<div class="rd-md-views">' + TEAM_WHO.map(function (v) {
        return '<button type="button" class="rd-view' + (_teamWho === v[0] ? ' on' : '') +
               '" data-teamwho="' + v[0] + '">' + esc(v[1]) + '</button>';
      }).join('') + '</div>' +
      tbl(rows, TEAM_COLS) +
      '<p class="rd-tm-note">Needs action counts a red Pulse flag or an overdue visit. ' +
      'A touchpoint that is overdue only on someone else\u2019s caseload cannot be read from ' +
      'here, so this is a floor rather than the number on their own Home.</p>' +
      (csps.length
        ? '<h4 class="rd-md-g">Client Solutions Partners<span>' + plural(csps.length, 'person') +
          ' · support across the market, not a caseload</span></h4>' +
          tbl(csps, [['touch', 'Touches 30d'], ['clients', 'Clients named']])
        : '');
    $$('[data-teamwho]', host).forEach(function (b) {
      b.addEventListener('click', function () { _teamWho = b.dataset.teamwho; renderTeamTable(); });
    });
    $$('[data-csm]', host).forEach(function (tr) {
      const go = function () { try { if (window.openCSMDetail) openCSMDetail(tr.dataset.csm); } catch (e) {} };
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  function installTeamTable() {
    if (typeof window.renderTeamOverview !== 'function' || window.renderTeamOverview.__rdTeam) return;
    const orig = window.renderTeamOverview;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      try { renderTeamTable(); } catch (e) { /* V1's cards stand if this throws */ }
      return r;
    };
    wrapped.__rdTeam = true;
    window.renderTeamOverview = wrapped;
  }

  function decorateTeam() {
    const page = $('#page-team');
    if (!page || page.dataset.rdTeam) return;
    page.dataset.rdTeam = '1';
    /* V1'S FIVE-TILE STRIP COMES OFF. It carried Total Clients, Touchpoints,
       High Need, Overdue Visits and IN ONBOARDING -- the same numbers the
       table now has as columns, computed a second way, and its In Onboarding
       uses (daysAgo || 999) <= 30, which drops a client whose care starts
       today. That is the whole of "In Onboarding 3 beside 4 in first 30
       days": not Caseload Health on Home, which has been clean since the
       23rd, but this strip sitting above a column headed In first 30. The
       totals are in the table's own footer now, where the sum is literally
       the column. */
    const strip = $('#team-top-stats', page);
    if (strip) strip.hidden = true;
    installTeamTable();
    try { renderTeamTable(); } catch (e) {}
    const h = $('.ph h2', page);
    if (h) h.textContent = 'Team';
    const p = $('.ph p', page);
    if (p) p.textContent = 'Your CSMs, their caseloads and the two reviews that go with them.';
    const tabs = $$('.tabs', page)[1];       // the inner view tabs
    if (!tabs) return;
    const panel = document.createElement('div');
    panel.id = 'rd-team-panel';
    tabs.parentElement.insertBefore(panel, tabs.nextSibling);
    TEAM_PANELS.forEach(function (t) {
      if (!teamModule(t[2])) return;         // the server decides who may see it
      const b = document.createElement('div');
      b.className = 'tab';
      b.dataset.teamtab = t[0];
      b.textContent = t[1];
      b.addEventListener('click', function () { showTeamPanel(t[0]); });
      tabs.appendChild(b);
    });
    // V1's own two tabs have to put the panel away again when pressed.
    ['tv-tab-overview', 'tv-tab-visits'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', function () {
        if (_teamPanel) showTeamPanel('');
      });
    });
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
  /* THE OPEN CHECKLIST, AT THE TOP OF SUMMARY (Courtney, section 7): "The
     open checklist sits at the top of the Summary tab until it's finished. No
     extra tab, so the client page stays at 4 tabs."

     Until it is finished, exactly: a client past their first thirty days with
     everything logged gets nothing here, because a finished checklist is
     history and belongs in Activity, not at the top of the page a CSM reads
     before a call.

     Finished weeks collapse with their count, the week in progress is open,
     and an overdue row is red and first in its phase. The status line names
     the oldest overdue thing rather than counting them, because that is the
     one to pick up first. */
  /* P5. THE BUTTON IS THE NEXT STEP. Her section 7: "The button is the next
     step: Draft email, Schedule visit, Log check-in, Open call guide, or
     N/A." A checklist that only offers a tick makes the CSM go and find the
     thing themselves, which is how a checklist turns into paperwork.

     VIV SETUP ITEMS GET NO BUTTON, which is also hers: those carry the Viv
     location instead, because the step is "go to this screen in Viv" and a
     button cannot do it for you.

     The mapping is the preview's, by the words the document uses. It is not
     a guess about intent: every phrase here appears in Courtney's own
     checklist labels. An item that matches nothing gets no button rather
     than a wrong one. */
  function s30Step(label) {
    const t = String(label || '');
    if (/\bviv\b|workflow|payor|located in|rate rule|authorization/i.test(t)) return null;
    if (/day 30/i.test(t)) return { act: 'd30', word: 'Open call guide' };
    if (/family\/gcm contact|family contact|update the referral|referral partner|welcome/i.test(t))
      return { act: 'draft', word: 'Draft email' };
    if (/assessment|in-person visit|second visit/i.test(t)) return { act: 'visit', word: 'Schedule visit' };
    if (/prepped by phone|check-in|check in|touch base/i.test(t)) return { act: 'checkin', word: 'Log check-in' };
    return null;
  }

  /* HER CHECKLIST HEADER ON THE CLIENT PAGE (Courtney, 23 Nov): "no
     checkboxes with proof, no progress bar, and no All / Mine (CSM) / CSP
     filter." The onboarding board has had all three since the 21st; this is
     the same thing on the page a CSM actually reads before a call.

     S30 milestones carry exactly two owners -- _s30Owner returns CSP for a
     Viv item and CSM for everything else -- so her three tabs cover the
     whole list with nothing left over.

     THE FILTER HIDES ROWS, IT DOES NOT MOVE THE BAR. The bar and the counts
     are the whole checklist every time. A CSP looking at their own four
     items should still see the client is two of ten through; a bar that
     moved with the filter would be measuring the filter. */
  const S30_WHO = [['all', 'All'], ['CSM', 'Mine (CSM)'], ['CSP', 'CSP']];
  let _s30Who = 'all';
  function wsS30(c) {
    let k = null;
    try { k = typeof s30Checklist === 'function' ? s30Checklist(c) : null; } catch (e) { return ''; }
    if (!k || k.finished) return '';
    if (k.daysIn > 30) return '';          // past the window: the Onboarding page keeps the tail
    const TONE = { ontrack: 'ok', watch: 'warn', atrisk: 'bad', done: 'ok' };
    const WORD = { ontrack: 'On track', watch: 'Watch', atrisk: 'At risk', done: 'Complete' };
    const row = function (r) {
      const when = r.done
        ? '<span class="rd-s30-done">' + (r.viv ? 'picked up from Viv ' : '') + esc(fmtShort(r.at)) +
          (r.by ? ' \u00b7 ' + esc(r.by) : '') + '</span>'
        : '<span class="rd-s30-due">Due ' + esc(fmtShort(r.due)) + '</span>';
      return '<li class="rd-s30-r' + (r.done ? ' done' : '') + (r.overdue ? ' late' : '') +
        (r.done && r.viv ? ' viv' : '') + '">' +
        /* A CHECKBOX, NOT A DECORATION. This was an aria-hidden span showing
           a tick, so there was no way to say an item was done from the page
           a CSM reads: measured live, both milestone stores were empty for
           every client in their first thirty days. A Viv-synced tick is not
           pressable, because un-ticking it would be overruling the system of
           record from a checklist. */
        (r.done && r.viv
          ? '<span class="rd-s30-b done viv" title="Picked up from Viv">\u2713</span>'
          : '<button type="button" class="rd-s30-b' + (r.done ? ' done' : '') +
            '" data-s30tick="' + esc(r.id || '') + '" data-s30done="' + (r.done ? '1' : '') +
            '" aria-pressed="' + (r.done ? 'true' : 'false') +
            '" title="' + (r.done ? 'Remove this tick' : 'Mark it done, with proof') + '">' +
            (r.done ? '\u2713' : '') + '</button>') +
        '<span class="rd-s30-t">' + esc(r.label) +
          (r.proof ? '<span class="rd-s30-p">' + esc(r.proof) + '</span>' : '') +
          (function () {
            if (r.done) return '';
            const s = s30Step(r.label);
            return s ? '<button type="button" class="rd-s30-step" data-step="' + s.act +
              '" data-ms="' + esc(r.id || '') + '">' + esc(s.word) + '</button>' : '';
          })() + '</span>' +
        '<span class="rd-s30-o">' + esc(r.owner) + '</span>' + when + '</li>';
    };
    const weeks = k.weeks.map(function (w) {
      /* FINISHED PHASES COLLAPSE. Everything else is open, which is what she
         wrote: "Finished phases collapse with a green count (8 of 8). The
         phase in progress sits on top."

         The first cut opened only the first unfinished week, and on a real
         client that hid the thing the status line was pointing at: the header
         read "assessment completed is 4 days overdue" while the week holding
         the assessment was shut. A status that names what you cannot see is
         worse than no status. */
      const open = !w.finished;
      // The filter hides rows; the week's own count stays the week's count,
      // for the same reason the bar does not move.
      const items = w.items.filter(function (r) { return _s30Who === 'all' || r.owner === _s30Who; });
      if (!items.length) return '';
      return '<details class="rd-s30-w' + (w.finished ? ' fin' : '') + '"' + (open ? ' open' : '') + '>' +
        '<summary>' + esc(w.label) +
        '<span class="n' + (w.finished ? ' fin' : '') + '">' + w.done + ' of ' + w.total + '</span>' +
        '</summary><ul class="rd-s30-l">' + items.map(row).join('') + '</ul></details>';
    }).join('');
    const lateN = k.weeks.reduce(function (n, w) {
      return n + w.items.filter(function (r) { return r.overdue; }).length;
    }, 0);
    const pct = k.total ? Math.round(k.done / k.total * 100) : 0;
    return '<section class="rd-s30 ' + TONE[k.state] + '">' +
      '<header><h4>First 30 days \u00b7 day ' + (k.daysIn + 1) + '</h4>' +
      '<span class="rd-s30-st">' + esc(WORD[k.state]) + '</span>' +
      '<span class="rd-s30-n">' + k.done + ' of ' + k.total + ' done' +
        (lateN ? '<span class="rd-s30-late">' + lateN + ' overdue</span>' : '') + '</span></header>' +
      '<div class="rd-s30-prog" role="progressbar" aria-valuenow="' + pct +
        '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></div>' +
      '<div class="rd-s30-who">' + S30_WHO.map(function (w) {
        return '<button type="button" class="rd-s30-wb' + (_s30Who === w[0] ? ' on' : '') +
          '" data-s30who="' + w[0] + '">' + esc(w[1]) + '</button>';
      }).join('') + '</div>' +
      '<p class="rd-s30-why">' + esc(k.why) + '</p>' + weeks + '</section>';
  }

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
    /* P4. THE BANNER AND THIS BLOCK WERE SAYING THE SAME THING.
       When a Pulse banner is showing, it carries the flag, the detail and the
       triage buttons; repeating it in a card below made the page look like
       two problems where there is one, and the card said it with less. So the
       block is only built when there is no banner.

       The CADENCE exception still earns a place: it is a different fact from
       the flag, it has a date on it, and it is not in the banner. */
    const banner = !!(pp && pp.level && pp.level !== 'green' && !c.pulseAck);
    const attn = [];
    if (ex) attn.push({ tone: ex.tone, text: ex.text });
    if (pp && pp.level && pp.level !== 'green' && !c.pulseAck && !banner)
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
      wsS30(c) +
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
          /* P3. LOG FAMILY CALL IS THE FIRST TRIAGE BUTTON. Her Home picture
             puts it first on the banner, and it is the only one of the four
             that is an ACTION rather than a filing decision: the other three
             say what you intend to do, this one is you having done it. It
             opens the Log contact form already on the page rather than a
             second way to write a touchpoint. */
          : '<div class="rd-ack"><span>Mark it</span>' +
            '<button type="button" class="rd-link rd-ack-do" data-act="log-tp">Log family call</button>' +
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
    /* THE FOOTER IS GONE. Three ways to log on one page was her complaint:
       "Log contact at the top, Log activity at the bottom, and a '...' menu
       next to it." Both of the bottom two are in the header row now, so
       nothing that was reachable has become unreachable. */
    return '';
  }

  /* Each button opens the thing that already exists rather than a second
     implementation of it: the Day 30 guide the onboarding layer owns, the
     draft library, and V1's own log panels. An action whose function is not
     on the page says so instead of failing silently. */
  function wireS30Steps(ws, c) {
    /* The filter is a view, so it repaints the page and nothing else. */
    $$('[data-s30who]', ws).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        _s30Who = b.dataset.s30who;
        renderWorkspace();
      });
    });
    /* Ticking asks for proof; un-ticking does not. Taking a tick off is
       correcting a mistake, and making somebody justify a correction is how
       wrong ticks stay on the record. */
    $$('[data-s30tick]', ws).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const id = b.dataset.s30tick;
        if (!id) return;
        if (b.dataset.s30done) {
          if (typeof window.untickS30 === 'function') window.untickS30(c.id, id);
          else renderWorkspace();
          return;
        }
        const li = b.closest('.rd-s30-r');
        const tEl = li ? li.querySelector('.rd-s30-t') : null;
        const owner = li ? (li.querySelector('.rd-s30-o') || {}).textContent : '';
        const label = tEl && tEl.firstChild && tEl.firstChild.textContent
          ? tEl.firstChild.textContent : 'Success in 30 milestone';
        if (typeof window.openS30Proof === 'function') {
          window.openS30Proof(c.id, id, String(label).trim(), String(owner || '').trim());
        } else {
          rdDialog({ title: 'Not available',
                     body: 'The onboarding module is not loaded, so there is nowhere to record the proof.' });
        }
      });
    });
    $$('.rd-s30-step', ws).forEach(function (b) {
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        const act = b.dataset.step;
        const fn = function (n) { return typeof window[n] === 'function' ? window[n] : null; };
        try {
          if (act === 'd30') {
            const f = fn('openD30Guide');
            if (f) return f(c.id);
          } else if (act === 'draft') {
            const byId = fn('draftById'), open = fn('openDraftFor');
            const d = byId && (byId('week1') || byId('welcome'));
            if (d && open) return open(d, c);
          } else if (act === 'visit') {
            // openLogPanel(type, clientId, clientName) — same call the header
            // Log menu makes, so there is one way to open the form.
            const f = fn('openLogPanel');
            if (f) return f('visit', c.id, c.name);
          } else if (act === 'checkin') {
            const f = fn('openLogPanel');
            if (f) return f('touchpoint', c.id, c.name);
          }
          if (typeof showToast === 'function') showToast('That step is not wired up yet.');
        } catch (e) {
          if (typeof showToast === 'function') showToast('Could not open that step.');
        }
      });
    });
  }

  function wireWsActions(ws, c) {
    wireS30Steps(ws, c);
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
    if (_view === 'soon') return illustration('allclear', 'Nothing due this week',
      'No visit, touchpoint or care conversation falls due in the next seven days.');
    if (_view === 'watch') return illustration('allclear', 'Nothing on watch',
      'No open Pulse flags, and every client has a touchpoint on record.');
    if (_view === 'covering') return illustration('calm', 'You are not covering anyone',
      'Clients appear here while another CSM has handed them to you.');
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

  /* MY TO-DO HOLDS ONLY WHAT THE CSM TYPED.
     The generated items -- From Pulse, Success in 30, Overdue -- ARE the rows
     of Today's list. Printing them here as well made Home ask the same
     question twice in two different shapes, and buried the CSM's own tasks
     under a queue they had already read at the top of the page.

     Done by neutralising generatedTodos for the duration of V1's render
     rather than by editing V1: renderTodos is index.html's, and index.html is
     V1. A function declaration's global binding IS its window property, so
     swapping it is enough for the bare call inside renderTodos to see it.
     Restored in a finally, because everything else that asks for the
     generated list -- the Today's list itself, the counts -- still needs it. */
  function installTodos() {
    if (typeof window.renderTodos !== 'function' || window.renderTodos.__rd) return;
    const orig = window.renderTodos;
    const wrapped = function () {
      const gen = window.generatedTodos;
      if (typeof gen === 'function') window.generatedTodos = function () { return []; };
      try { return orig.apply(this, arguments); }
      finally { if (typeof gen === 'function') window.generatedTodos = gen; }
    };
    wrapped.__rd = true;
    wrapped.original = orig;
    window.renderTodos = wrapped;
  }

  /* ── CASELOAD HEALTH, IN THE LAYER ────────────────────────────────────
     Courtney questioned four numbers in this card and all four were fair.

     1. "High need = 12 in Caseload health, but High touch = 6 one line
        down." Two different measures wearing the same word. High need is
        Pulse's judgement (trulyHighNeed); High touch was the TIER field.
        Named for what each one is now, and the card says so in a line,
        because the next person to see 12 beside 6 will ask again.

     2. "1730 touches in 30 days for one CSM isn't a number anyone can act
        on. It looks like every auto-logged email and call is being counted."
        It was: workloadFor counts every touchpoint row, and the Viv and
        email syncs write them with auto:true. What a CSM can act on is what
        a PERSON logged, so that is the number. The auto count is still shown
        beside it rather than hidden, because it is real and somebody will
        notice it went missing.

     3. Visits this month reading 0 of 22 beside 60% compliance was the
        month-start fault, fixed on 23 November. The card now takes both
        figures from visitCompliance() so they cannot drift apart again.

     4. "Caseload health is manager information." It is collapsed by default
        and this does not change that. Tier mix only appears when tiers have
        actually been set, which was already true and is kept.

     Rendered here rather than in index.html because index.html is V1. */
  function caseloadHealth() {
    const app = A();
    let cl = [];
    try { cl = (app.fn.get('clients') || []).filter(function (c) { return !c.isOffice; }); } catch (e) { return null; }
    if (!cl.length) return null;

    let vc = null;
    try { vc = typeof visitCompliance === 'function' ? visitCompliance() : null; } catch (e) {}

    const over = cl.filter(function (c) {
      const d = daysSince(c.lastVisit);
      return c.freq !== 'NA' && (d === null || d > (parseInt(c.freq) || 90));
    });

    // Touchpoints in the last thirty days, split by who wrote them.
    let mine = 0, auto = 0;
    try {
      const cutoff = new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10);
      (app.fn.get('touchpoints') || []).forEach(function (t) {
        if (!t.date || String(t.date).slice(0, 10) < cutoff) return;
        if (t.auto) auto++; else mine++;
      });
    } catch (e) {}

    /* Visits LOGGED this month, which is not the same question as visit
       compliance and was sitting unlabelled beside it. V1's tile said "15"
       over "Visits This Month" next to "5 of 27 due visits done", and the two
       numbers look like they should reconcile. They never will: one counts
       visit records written this month, the other counts CLIENTS whose
       cadence fell due this month and have had one. */
    let logged = 0;
    try {
      const now = new Date(), y = now.getFullYear(), m = now.getMonth();
      (app.fn.get('visits') || []).forEach(function (v) {
        if (!v.date) return;
        const d = new Date(String(v.date).slice(0, 10) + 'T12:00:00');
        if (!isNaN(d) && d.getFullYear() === y && d.getMonth() === m) logged++;
      });
    } catch (e) {}

    const firstDays = cl.filter(function (c) { return inFirstDays(c, 30); }).length;

    const tier = function (k) { return cl.filter(function (c) { return (c.tier || 'Medium') === k; }).length; };
    const hi = tier('High'), med = tier('Medium'), lo = tier('Low');
    const tiersSet = [hi, med, lo].filter(function (n) { return n > 0; }).length > 1;

    let highNeed = 0;
    try {
      cl.forEach(function (c) {
        const pp = pulseFor(c);
        if (pp && typeof pp.trulyHighNeed !== 'undefined') { if (pp.trulyHighNeed) highNeed++; }
        else if (c.tier === 'High') highNeed++;
      });
    } catch (e) {}

    return { n: cl.length, vc: vc, over: over.length, mine: mine, auto: auto,
             logged: logged, firstDays: firstDays,
             hi: hi, med: med, lo: lo, tiersSet: tiersSet, highNeed: highNeed };
  }

  function renderCaseloadHealth() {
    const el = $('#home-caseload');
    if (!el) return;
    /* V1'S FOUR STAT TILES COME OUT. They sat beside this card inside the same
       section, saying "In Onboarding 3" where every other count on the page
       said 4 -- the falsy-zero fault, still live in index.html -- and "Visits
       This Month 15" directly above "5 of 27 due visits done" with nothing to
       say why those do not reconcile. Both numbers are in this card now, with
       labels that say what they count, so there is one place to read them and
       one place to fix them. */
    const g4 = $('#rd-s-case .g4');
    if (g4) g4.hidden = true;
    const h = caseloadHealth();
    if (!h) { el.style.display = 'none'; return; }
    el.style.display = '';

    const pill = function (n, label, tone) {
      return '<div class="rd-ch-p' + (tone ? ' ' + tone : '') + '">' +
        '<span class="rd-ch-n">' + esc(String(n)) + '</span>' +
        '<span class="rd-ch-l">' + esc(label) + '</span></div>';
    };
    /* visitCompliance() RETURNS ARRAYS OF CLIENTS, not counts: {due, done,
       deferred, pct}. An empty array is truthy, so `h.vc.due` as a test was
       always true and a month with nothing due would have read 0% rather
       than a dash -- the exact fault the dash was added to prevent. Count
       the array; do not trust its truthiness. */
    const vcDue = h.vc && h.vc.due ? h.vc.due.length : 0;
    const vcDone = h.vc && h.vc.done ? h.vc.done.length : 0;
    const pct = vcDue ? h.vc.pct : null;
    const parts = [
      pill(h.n, 'Clients', ''),
      pill(h.highNeed, 'High need, per Pulse', h.highNeed ? 'warn' : ''),
      pill(h.firstDays, 'In first 30 days', ''),
      pill(h.over, 'Visits overdue', h.over ? 'bad' : 'ok'),
      h.vc ? pill((pct === null ? '\u2014' : pct + '%'), 'Visit compliance',
                  pct === null ? '' : pct >= 90 ? 'ok' : pct >= 75 ? 'warn' : 'bad') : '',
      pill(h.logged, 'Visits logged this month', ''),
      pill(h.mine, 'Touchpoints you logged', '')
    ];
    if (h.tiersSet) {
      parts.push(pill(h.hi, 'High tier', 'bad'));
      parts.push(pill(h.med, 'Medium tier', 'warn'));
      parts.push(pill(h.lo, 'Low tier', 'ok'));
    }

    const notes = [];
    /* The two visit numbers that look like they should reconcile. */
    if (vcDue) {
      notes.push('Visits logged this month counts visit records. Visit compliance counts ' +
                 'clients whose cadence fell due this month, which is a different question.');
    }
    if (vcDue) {
      /* .length on both. Concatenating the arrays themselves printed
         "[object Object],[object Object]... of [object Object],..." in the
         card, which is what reading the live page caught. */
      notes.push(vcDone + ' of ' + vcDue + ' clients due a visit this month have had one.');
    }
    if (h.auto) {
      notes.push(plural(h.auto, 'touchpoint') + ' in the last 30 days were logged automatically ' +
                 'by the Viv and email syncs, and are not counted above.');
    }
    /* The two numbers that looked like one. */
    if (h.tiersSet && h.highNeed !== h.hi) {
      notes.push('High need is ' + h.highNeed + ': what Pulse judges needs the most attention. ' +
                 'High tier is ' + h.hi + ': the cadence set on the client record. They are different things.');
    }
    if (!h.tiersSet) {
      notes.push('Touch tiers are not set yet, so there is no mix to show.');
    }

    el.innerHTML = '<div class="rd-ch">' + parts.filter(Boolean).join('') + '</div>' +
      (notes.length ? '<div class="rd-ch-notes">' +
        notes.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') + '</div>' : '');
  }

  /* V1 owns the element and repaints it, so the layer takes the function
     rather than racing it. Same pattern as the tracker and the to-do list. */
  function installCaseload() {
    if (typeof window.renderHomeCaseload !== 'function' || window.renderHomeCaseload.__rd) return;
    const orig = window.renderHomeCaseload;
    const wrapped = function () {
      try { renderCaseloadHealth(); }
      catch (e) {
        console.error('[redesign] caseload health failed; falling back:', e);
        try { orig.apply(this, arguments); } catch (e2) {}
      }
    };
    wrapped.__rd = true;
    wrapped.original = orig;
    window.renderHomeCaseload = wrapped;
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
    const sAttn = sec('rd-s-attn', '', '');
    sAttn.classList.add('rd-sec-bare');
    /* HER HOME IS TWO COLUMNS, and that is the whole difference between her
       picture and what shipped. Hers fits a screen: the tiles across the top,
       Today's list on the left, and a narrow rail on the right holding the
       next visits, the to-do list, the 1:1 notes and caseload health.

       Ours stacked all four of those BELOW the list, so a CSM scrolled past
       twenty-five rows to reach their own to-do list. Same sections, same
       order in the markup, read as a different page.

       The tiles stay full width above both columns, because they filter the
       left one. Following up inserts itself after this section, so it lands
       under both columns, which is where she draws it. */
    sAttn.insertAdjacentHTML('beforeend',
      '<div id="rd-attn"></div>' +
      '<div id="rd-home-cols"><div class="rd-hl"><div id="rd-today"></div></div>' +
      '<div class="rd-hr"></div></div>');
    // Today first, because the question a CSM opens the Hub with is "what is
    // happening today", not "how is my caseload trending". The numbers still
    // come, under Caseload health, where they inform rather than greet.
    const sNext = sec('rd-s-next', 'Visits', 'Next 7 days');
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
    /* The rail, in her order: visits, then the CSM's own work, then caseload
       health last and closed. */
    const rail = sAttn.querySelector('.rd-hr');
    rail.appendChild(sNext); rail.appendChild(sTools); rail.appendChild(sCase);
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
    // Dates, not watch items: the tile says "Due this week" and her subtitle
    // under it names visits, touchpoints and care conversations.
    const warn = real.filter(dueThisWeek);

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
    if (warn.length) out.push({ n: warn.length, label: 'Due this week',
                                sub: 'Visits, touchpoints, care convos',
                                tone: 'warn', go: 'clients', view: 'soon', bucket: 'week' });
    const t = todayISO();
    const ovTodo = todos.filter(function (x) { return !x.done && x.due && x.due < t; });
    if (ovTodo.length) out.push({ n: ovTodo.length, label: 'Tasks past due', sub: String(ovTodo[0].text || '').slice(0, 44), tone: 'warn', go: 'home' });
    try {
      /* THE NUMBER IS THE ROWS YOU GET, which is what she asked of every
         tile: "The number on each tile is the number of rows you get when you
         click it." The tile counted VISITS and the list under it groups them
         by CLIENT, so this was the one tile on Home that disagreed with its
         own list. Both sides read openVisitsSoon() now, so they cannot drift.

         THE OPEN VISITS TILE IS A DOORWAY, not a filter, and it was wrong
         to make it one. Her Home picture reads "38 / Open visits / Goes to
         Fill Priority", and both her pictures keep "Fill Priority 38" on the
         rail. I had taken that number off, arguing that Fill Priority ranks
         the whole caseload for a coverage event rather than listing open
         visits, so the number was not one you could go and count there.

         Her model is the coherent one: the badge counts the open visits, and
         Fill Priority is where you go to do something about them. Counting
         the rows on the page you land on is the right rule for the three
         tiles that filter the list below them, and the wrong rule for the one
         tile she drew as a way OUT of the page. So this one carries its own
         number, says where it goes, and puts the same figure on the rail. */
      const ovs = openVisitsSoon();
      if (ovs.total) out.push({ n: ovs.total, label: 'Open visits',
                          sub: 'Goes to Fill Priority',
                          tone: 'warn', go: 'priority', badge: true,
                          bucket: 'open', doorway: true });
    } catch (e) {}
    const onb = real.filter(function (c) { return inFirstDays(c, 30); });
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
     were "Due soon" on the tile and "due this week" on the line under it.
     These names are now the only ones, and all four are her words from
     section 2 and her Home picture.

     "Due this week" was the one I argued with, on the grounds that the data
     behind it was a fourteen-day warning and her label would have been a
     week out from the thing it named. The answer was to fix the data, not
     the label: see dueThisWeek(), which counts seven days. */
  const TODAY_BUCKETS = [['action', 'Need action today'], ['week', 'Due this week'],
                         ['onboarding', 'In first 30 days'], ['open', 'Open visits']];
  let _todayFilter = '';
  // Her list stops at five and offers the rest. Pressing a tile is a new
  // question, so the expansion resets with it.
  let _todayAll = false;

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

  /* HOW MANY SUCCESS IN 30 MILESTONES ARE OPEN. Past their day and not
     logged, which is the same test generatedTodos() applies before it writes
     one. Read here so the row can say "3 milestones open" beside the reason,
     rather than making the CSM open the client to find out. */
  function s30Open(c) {
    const age = c.startDate ? daysSince(c.startDate) : null;
    if (age === null || age > 30) return 0;
    let done = [];
    try { done = rowsFor('s60', c.id) || []; } catch (e) { return 0; }
    let ms = [];
    try { ms = (typeof S30_MILESTONES !== 'undefined' && S30_MILESTONES) || []; } catch (e) { return 0; }
    let n = 0;
    ms.forEach(function (m) {
      let due = 7;
      try { due = (typeof TODO_MS_DAYS !== 'undefined' && TODO_MS_DAYS[m.id]) || 7; } catch (e) {}
      if (age <= due) return;                                        // not due yet
      if (done.some(function (x) { return x.id === m.id; })) return; // already logged
      n++;
    });
    return n;
  }

  /* THE NEXT STEP IS THE STEP FOR THIS CLIENT, not a label for the row.
     "Read the Pulse and sort it" is the same sentence on every flagged
     client, which makes the column worthless: the CSM has to open each one to
     learn what to do. Pulse already writes a recommended action, so that is
     what goes here.

     shortStep IS A STOPGAP. It trims a paragraph written for a human reading
     the flag into something that fits a table cell, by cutting at the first
     dash and turning a gerund into an imperative. It will read oddly on
     sentences shaped differently from today's.

     THE REAL FIX IS UPSTREAM: Pulse should write a short imperative next step
     of about ten words onto the flag, beside the long recommendedAction, and
     this should read that field and delete the trimming below. That is a
     change to the Pulse builder in tribute-api, not to the Hub. */
  const STEP_VERB = {
    checking: 'Check', confirming: 'Confirm', clarifying: 'Clarify', calling: 'Call',
    scheduling: 'Schedule', asking: 'Ask', reviewing: 'Review', reaching: 'Reach',
    following: 'Follow', letting: 'Let', getting: 'Get', making: 'Make',
    'a call': 'Call', 'a conversation': 'Talk', 'a quick check': 'Check',
    'a direct call': 'Call', 'a quick call': 'Call', 'a short call': 'Call',
    'a note': 'Note', 'a message': 'Message'
  };
  function shortStep(t) {
    let s = String(t || '').trim().replace(/^Worth\s+/i, '');
    s = s.split(/\s[\u2014\u2013-]\s/)[0];
    if (s.length > 95) { const cut = s.indexOf(', ', 45); if (cut > 0) s = s.slice(0, cut); }
    s = s.replace(/[.,;]$/, '');
    /* Strip the hedges Pulse writes to soften a suggestion. They turn an
       instruction into an opinion, and the column has room for one short
       instruction. "Might be worth a quick call to Dede" becomes "Call
       Dede". */
    s = s.replace(/^(it (?:might|may) be worth|might be worth|worth|consider|perhaps|possibly)\s+/i, '');
    s = s.replace(/^(a (?:direct|quick|short) call|a call)\s+(?:to|with)\b/i, 'Call');
    s = s.replace(/^(a (?:direct|quick|short) call|a call)\b/i, 'Call');
    s = s.replace(/^(the\s+)?(\w+ing)\b/i, function (m, the, verb) {
      const v = STEP_VERB[String(verb).toLowerCase()];
      return v ? v : m;
    });
    s = s.replace(/^(a quick check|a conversation)\b/i, function (m) {
      return STEP_VERB[m.toLowerCase()] || m;
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* DAYS IN CARE, OR NULL. `(daysSince(c.startDate) || 999) <= 30` was in
     four places here and five more in index.html, and it has a hole in it:
     daysSince returns 0 for a client whose care starts TODAY, 0 is falsy, so
     `0 || 999` becomes 999 and the newest client on the caseload drops out of
     every one of those filters.

     Found on 23 November: Home counted four clients in their first 30 days
     and the Clients chip and the Onboarding badge counted three. The missing
     one had started care that very day -- the single client most likely to
     need the checklist worked. */
  function daysInCare(c) {
    if (!c || !c.startDate) return null;
    const d = daysSince(c.startDate);
    return (d === null || d === undefined || isNaN(d)) ? null : d;
  }
  function inFirstDays(c, n) {
    const d = daysInCare(c);
    return d !== null && d <= n;
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
      const lvl = pulseLevel(c);
      if (lvl) {
        // Red is today's work, amber is this week's. The same split as the
        // tabs, so a tile and a tab cannot disagree about one client.
        /* Her plain label replaces the word "Pulse" as the heading on the
           row, with the evidence sentence under it, which is how she draws
           it. Owner and audience ride along so the row can be read without
           opening the client. */
        /* THE BUCKET SPLIT HAD LEAKED INTO THE RANK. An amber Pulse was
           rank 3, which put it below Success in 30 (1) and below "No visit
           on record" (2), so a Safety flag sat under three routine cadence
           rows. Her order is "Pulse flags, then Success in 30 milestones,
           then overdue visits and touchpoints, then due this week" -- ALL
           Pulse flags first, not just the red ones.

           Red still leads amber, and the BUCKET is untouched: amber stays
           in Watch so a tile and a tab cannot disagree about one client.
           Which tab a row belongs to and where it sits in the list are two
           different questions, and one answer was being used for both. */
        const lab = pulseLabel(pp);
        out.push({ rank: lvl === 'red' ? 0 : 1, tier: c.tier,
                   kind: (lab && lab.label) || 'Pulse', isPulse: true,
                   owner: pulseOwner(pp, lab), tell: pulseTell(pp, lab),
                   bucket: lvl === 'red' ? 'action' : 'watch',
                   cid: c.id, name: c.name,
                   why: pulseFirst(pp.headline),
                   step: (pp && pp.card && pp.card.recommendedAction)
                     ? shortStep(pp.card.recommendedAction) : 'Read the Pulse and sort it',
                   full: (pp && pp.card && pp.card.recommendedAction) || '',
                   s30: s30Open(c),
                   tone: lvl === 'red' ? 'bad' : 'warn' });
      }
      // 2. Success in 30, for anyone inside their first month.
      const age = c.startDate ? daysSince(c.startDate) : null;
      if (age !== null && age <= 30) {
        const done = rowsFor('s60', c.id).length;
        out.push({ rank: 2, bucket: 'onboarding', cid: c.id, name: c.name,
                   tier: c.tier, kind: 'Success in 30',
                   why: 'Day ' + (age + 1) + ' of 30' + (done ? ' · ' + plural(done, 'milestone') + ' logged' : ' · nothing logged yet'),
                   step: 'Work the onboarding checklist', s30: s30Open(c),
                   tone: done ? 'info' : 'warn' });
      }
      // 3 and 4. The cadence exception, which already knows overdue from due.
      const ex = exceptionFor(c);
      if (ex) out.push({ rank: ex.tone === 'bad' ? 3 : 4,
                         bucket: ex.tone === 'bad' ? 'action'
                                 : (ex.rank === 4 || ex.rank === 5) ? 'watch' : 'week',
                         cid: c.id, name: c.name, why: ex.text, tier: c.tier,
                         s30: s30Open(c),
                         /* A Viv STATUS is not a cadence problem, so "Book it
                            or defer it" was the wrong instruction on it: you
                            cannot book your way out of a client still being
                            set up. */
                         step: /being set up|on hold|pending discharge|in hospital|in facility|processing/i.test(ex.text)
                                 ? 'Check where Viv has got to'
                               : /no visit on record|visit overdue/i.test(ex.text) ? 'Schedule in-person visit'
                               : /touchpoint/i.test(ex.text) ? 'Check-in call or email'
                               : /^visit due/i.test(ex.text) ? 'Confirm the visit is booked'
                               : ex.tone === 'bad' ? 'Book it or defer it' : 'Get it in the diary',
                         tone: ex.tone });
    });

    // Open visits are the client's, but they are Scheduling's to fill, so the
    // step says who it goes to rather than implying the CSM covers it. Only
    // the next 48 hours reach this list; see openVisitsSoon().
    try {
      const byClient = openVisitsSoon().byClient;
      Object.keys(byClient).forEach(function (k) {
        const c = cl.find(function (x) { return x.name === k; });
        out.push({ rank: 5, bucket: 'open', cid: c ? c.id : '', name: k,
                   tier: c ? c.tier : '', kind: 'Open visits',
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
    const best = {}, order = [];
    out.forEach(function (r) {
      const k = r.cid || ('name:' + r.name);
      /* A ROW CAN MATCH MORE THAN ONE FILTER. The four tiles are filters over
         one list, not a partition of it, so a client in their first thirty
         days who also needs action today belongs under BOTH. Bucketing them
         exclusively made Home read "0 In first 30 days" on a caseload with
         three clients in their first thirty days: true of the list, false of
         the world, and the kind of zero a CSM would believe. */
      if (!best[k]) { best[k] = r; r.buckets = [r.bucket]; order.push(k); return; }
      if (best[k].buckets.indexOf(r.bucket) < 0) best[k].buckets.push(r.bucket);
      /* WHICH OF A CLIENT'S REASONS TO SHOW. Her sort order is "Pulse flags,
         then Success in 30 milestones, then overdue visits and touchpoints,
         then due this week", so Success in 30 outranks an overdue visit. That
         is the right order to READ the list in, and the wrong way to decide
         which bucket a client falls under: a client in their first thirty
         days who is ALSO overdue was landing under In first 30 days, so Home
         said 27 need action today while the Clients tab said 29, which is the
         same two-numbers-one-meaning fault one layer further down.

         So the row kept is the most urgent one the client has, and her rank
         still decides where that row sits in the list. For a new client with
         an overdue visit those are usually the same obligation anyway: the
         second in-person visit by day fourteen. */
      const isAct = function (x) { return x.bucket === 'action' ? 0 : 1; };
      if (isAct(r) < isAct(best[k])) { const b = best[k].buckets; best[k] = r; r.buckets = b; }
    });
    /* TWO URGENCY FILTERS CANNOT BOTH HOLD THE SAME CLIENT. Needs attention
       and Due soon were made to stop counting the same people on the Clients
       page (her priority 3), and they are two readings of one cadence: a
       client who needs action today is not also merely due soon. Letting both
       match put Home's Due soon at 6 against the Clients tab's 4.

       "In first 30 days" and "Open visits" are a different axis — how new the
       client is, what Scheduling owes them — so those still overlap, which is
       why the three onboarding clients appear under their own filter as well
       as under Need action today. */
    /* ONE DEFINITION OF EACH BUCKET, SHARED WITH THE CLIENTS CHIPS.
       Home counted a client's bucket from the ROW it kept -- the tone and
       rank of whichever reason won the dedupe -- while the Clients chips
       counted with needsAction / onWatch / dueThisWeek over the client. Two
       different questions, so the two pages answered differently: Home said
       Due this week 5 where the chip said 3, and In first 30 days 4 where
       the chip and the Onboarding badge said 3.

       Her rule is the whole point: "If the badge says 9, the list under it
       has 9 clients in it." So the buckets are derived from the SAME
       predicates the chips use, over the same client, and the two cannot
       disagree without the predicate itself changing.

       The urgency three stay exclusive, because a client who needs action
       today is not also merely due this week. In first 30 days is a
       different axis -- how new the client is -- so it still overlaps. */
    const byId = {};
    cl.forEach(function (c) { byId[c.id] = c; });
    order.forEach(function (k) {
      const r = best[k];
      const c = r.cid ? byId[r.cid] : null;
      if (!c) return;                       // an open visit with no client row
      const b = [];
      if (needsAction(c)) b.push('action');
      else if (onWatch(c)) b.push('watch');
      else if (dueThisWeek(c)) b.push('week');
      const age = c.startDate ? daysSince(c.startDate) : null;
      if (age !== null && age <= 30) b.push('onboarding');
      // Keep anything the row carried that is not one of the four, such as
      // 'open', so a client with unfilled visits is still under that tile.
      (r.buckets || []).forEach(function (x) {
        if (['action', 'watch', 'week', 'onboarding'].indexOf(x) < 0 && b.indexOf(x) < 0) b.push(x);
      });
      /* NO FALLBACK TO THE ROW'S OWN BUCKET. When none of the client
         predicates match, this used to keep whatever the row had been given,
         which is the row-derived bucket the whole change exists to replace.
         Elizabeth Treitler is due in EIGHT days: not due this week, so the
         Clients chip excluded her, while Home's tile kept her old 'week'
         bucket and read 3 against the chip's 2.

         A row that matches no tile still appears in the unfiltered list. It
         simply is not counted by a tile that does not describe it. */
      r.buckets = b;
    });
    const one = order.map(function (k) { return best[k]; });
    /* HER ORDER: Pulse, then Success in 30, then overdue, then due this week,
       and inside each group the highest tier first. rank already carries the
       first half of that; tier is the tiebreak that was missing, so a High
       need client no longer sat below a Low one just because of the alphabet.
       Name stays as the last resort, so the order is stable between renders
       and the list does not reshuffle under the reader. */
    const TIER_RANK = { High: 0, Medium: 1, Low: 2 };
    /* THE GROUP IS ABOUT THE CLIENT, NOT THE ROW.
       "Success in 30" means this client has open milestones, not that the row
       we kept happens to be a milestone row. A client who is overdue AND has
       milestones open shows their overdue row with the milestone count under
       it, and belongs in the Success in 30 group: they are a new client whose
       onboarding is slipping, which is more urgent than an overdue visit on a
       settled one. Ranking by the row's own kind put them below it. */
    /* ASK isPulse, NOT THE LABEL. This read `r.kind === 'Pulse'`, and kind
       stopped being the word "Pulse" the moment her plain labels went in:
       the row says "Safety" or "Family not told" now. So from that change
       until this one NO row was recognised as a Pulse row here, and every
       flag fell into the ordinary urgent group -- which is how a Safety
       flag came to sit below three "No visit on record" rows on a real
       caseload. The flag is carried by isPulse, which is what the row knows
       about itself rather than what it happens to be called. */
    const group = function (r) {
      const urgent = r.tone === 'bad';
      if (urgent) return r.isPulse ? 0 : (r.s30 ? 1 : 2);
      return r.isPulse ? 3 : 4;
    };
    one.sort(function (a, b) {
      return group(a) - group(b) ||
             ((TIER_RANK[a.tier] === undefined ? 3 : TIER_RANK[a.tier]) -
              (TIER_RANK[b.tier] === undefined ? 3 : TIER_RANK[b.tier])) ||
             String(a.name).localeCompare(String(b.name));
    });
    return one;
  }

  /* The tiles and the list are two halves of one control, so both repaint.
     Pressing the tile you are already on clears the filter, which is the way
     back to everything now that the chip row has gone. */
  function setTodayFilter(k) {
    _todayAll = false;
    _todayFilter = (_todayFilter === k) ? '' : k;
    _attnKey = '';
    renderAttention();
  }

  /* THE LIST REDREW ABOUT ONCE A SECOND WHILE NOTHING HAPPENED.
     boot()'s MutationObserver schedules a tick on any DOM change outside its
     ignore list; tick calls renderAttention, which calls this. renderAttention
     is guarded by a content key, but this was called OUTSIDE that guard on
     purpose, because sorting an item changes the list without changing a
     single tile number. So every tick rewrote #rd-today, and rewriting it is
     itself a mutation.

     The fix is the same guard, applied here: identical content is not
     rewritten, so there is nothing for the observer to see and the loop has
     nothing to feed on. #rd-today is in the observer's ignore list as well,
     because one of the two should not be the only thing standing between the
     page and a spin. */
  let _todayKey = '';
  function renderToday() {
    const el = $('#rd-today');
    if (!el) return;
    const rows = todayRows();
    const n = {}; TODAY_BUCKETS.forEach(function (b) { n[b[0]] = 0; });
    rows.forEach(function (r) {
      (r.buckets || [r.bucket]).forEach(function (b) { if (n[b] !== undefined) n[b]++; });
    });

    // Nothing to sort is worth saying plainly, and is not the same as a source
    // that failed: that distinction is renderAttention's and is kept there.
    if (!rows.length) {
      if (_todayKey === 'empty') return;      // same guard; see above
      _todayKey = 'empty';
      el.innerHTML = '<p class="rd-ws-quiet">Nothing new to sort. Anything you have already sorted is in Following up below.</p>';
      return;
    }
    /* NO SECOND ROW OF THE SAME NUMBERS. This used to render its own row of
       filter chips under the tiles, so Home showed "Need action today 16"
       twice: once as a tile that navigated away, once as a chip that
       filtered. The tiles do the filtering now, so all that is needed here is
       a way back to everything when one of them is pressed. */
    const shown = _todayFilter
      ? rows.filter(function (r) { return (r.buckets || [r.bucket]).indexOf(_todayFilter) > -1; })
      : rows;
    const lab = (TODAY_BUCKETS.filter(function (b) { return b[0] === _todayFilter; })[0] || [])[1];

    /* Identical content is not rewritten. Everything the markup below depends
       on goes into the key, including the filter and the expansion, or the
       list would ignore a press. */
    const key = _todayFilter + '|' + _todayAll + '|' + rows.length + '|' +
      shown.map(function (r) {
        return [r.cid, r.name, r.tone, r.kind, r.why, r.step, r.s30, r.tier,
                r.owner, r.tell, r.isPulse].join('\u0001');
      }).join('\u0002');
    if (key === _todayKey) return;
    _todayKey = key;
    /* HER CARD, from the Home picture: a titled card, three column headings,
       the tier under the client's name, the reason labelled and coloured, and
       an Open button on the row.

       AND IT STOPS AT FIVE. Hers shows five rows and then "Show 4 more". A
       caseload like Julia's puts twenty-five rows here, which is the wall she
       was complaining about: "it's easy to miss cards below the fold". The
       whole point of the list is that you work the top of it. */
    const LIMIT = 8;
    const more = Math.max(0, shown.length - LIMIT);
    const vis = _todayAll ? shown : shown.slice(0, LIMIT);
    const tierPill = function (t) {
      return t ? '<span class="rd-td-tier ' + esc(String(t).toLowerCase()) + '">' + esc(t) + '</span>' : '';
    };
    el.innerHTML =
      (_todayFilter
        ? '<div class="rd-td-f"><span>Showing ' + shown.length + ' of ' + rows.length + ' \u00b7 ' +
          esc(String(lab || '').toLowerCase()) + '</span>' +
          '<button type="button" class="rd-td-all" data-td="">Show everything</button></div>'
        : '') +
      (shown.length
        ? '<div class="rd-td-card">' +
          '<div class="rd-td-head">Today\u2019s list \u2014 work top to bottom</div>' +
          '<table class="rd-td-t"><thead><tr>' +
          '<th scope="col">Client</th><th scope="col">Why it\u2019s here</th>' +
          '<th scope="col" class="rd-td-tell">Who needs to know</th>' +
          '<th scope="col" class="rd-td-own">Owner</th>' +
          '<th scope="col">Next step</th><th scope="col"><span class="rd-sr">Sort and open</span></th>' +
          '</tr></thead><tbody>' +
          vis.map(function (r) {
            /* A cadence exception leads with its own words, so it is toned
               rather than labelled; Pulse and the rest carry a label. Both
               clamp, and the full text is on the title, because a reason
               worth reading in full is worth reading without opening the
               client. */
            const why = r.kind
              ? '<b class="rd-td-k">' + esc(r.kind) + ':</b> ' + esc(r.why)
              : '<span class="' + (r.tone === 'bad' ? 'rd-td-over' : 'rd-td-due') + '">' + esc(r.why) + '</span>';
            return '<tr class="rd-td-r ' + r.tone + '"' + (r.cid ? ' data-cid="' + esc(r.cid) + '" tabindex="0"' : '') + '>' +
              '<td class="rd-td-n"><span>' + esc(r.name) + '</span>' + tierPill(r.tier) + '</td>' +
              /* BELOW 1100px THERE IS NO ROOM FOR SIX COLUMNS. Who needs to
                 know and Next step were getting 109px each in a fixed-layout
                 table, the two headers overlapped and Sort and Open spilled
                 out of the card. At that width the row becomes a four-column
                 grid and the audience moves under the reason, in this cell,
                 with the owner chip below it. A dash is not worth a line, so
                 nothing is written when there is nobody to tell. */
              '<td class="rd-td-w"><div class="rd-c2" title="' + esc(r.why) + '">' + why + '</div>' +
                (r.s30 ? '<div class="rd-td-s30"><b>Success in 30:</b> ' + r.s30 +
                         ' milestone' + (r.s30 > 1 ? 's' : '') + ' open</div>' : '') +
                (r.tell || r.owner
                  ? '<div class="rd-td-tell-in">' +
                    (r.tell ? '<span class="rd-td-tl" title="' + esc(r.tell) + '">' +
                              '<b>Tell:</b> ' + esc(r.tell) + '</span>' : '') +
                    (r.owner ? '<span class="rd-td-ow">' + esc(r.owner) + '</span>' : '') +
                    '</div>'
                  : '') + '</td>' +
              /* The owner rides inside this cell as well, hidden until the
                 Owner column itself is folded away. Six columns do not fit
                 Home's left column below about 1500px, and dropping the
                 owner entirely would lose it rather than move it. */
              '<td class="rd-td-tell">' + (r.tell ? '<span title="' + esc(r.tell) + '">' + esc(r.tell) + '</span>'
                                                   : '<span class="rd-ws-quiet">\u2014</span>') +
                (r.owner ? '<span class="rd-td-ow rd-td-ow-in">' + esc(r.owner) + '</span>' : '') + '</td>' +
              '<td class="rd-td-own">' + (r.owner ? '<span class="rd-td-ow">' + esc(r.owner) + '</span>' : '') + '</td>' +
              '<td class="rd-td-s"><div class="rd-c3" title="' + esc(r.full || r.step) + '">' + esc(r.step) + '</div></td>' +
              '<td class="rd-td-o">' +
                (r.isPulse && r.cid
                  ? '<button type="button" class="rd-td-sort" data-sortbtn="' + esc(r.cid) +
                    '" aria-haspopup="menu" title="Sort this flag off the list">Sort</button>'
                  : '') +
                (r.cid ? '<span class="rd-td-b">Open</span>' : '') + '</td></tr>';
          }).join('') +
          '</tbody></table>' +
          '<div class="rd-td-foot">' +
            (more && !_todayAll
              ? '<button type="button" class="rd-td-more">Show ' + more + ' more \u2193</button>'
              : (_todayAll && more ? '<button type="button" class="rd-td-more">Show fewer \u2191</button>' : '')) +
            '<span>Sort an item and it moves to Following up</span>' +
          '</div></div>'
        : '<p class="rd-ws-quiet">Nothing under that filter.</p>');

    $$('[data-td]', el).forEach(function (b) {
      b.addEventListener('click', function () { setTodayFilter(b.dataset.td); });
    });
    const moreBtn = $('.rd-td-more', el);
    if (moreBtn) moreBtn.addEventListener('click', function () { _todayAll = !_todayAll; renderToday(); });
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
    todayRows().forEach(function (r) {
      (r.buckets || [r.bucket]).forEach(function (b) { if (tn[b] !== undefined) tn[b]++; });
    });
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
          if (k === 'open') return 'None open right now';
          return 'Nothing right now';
        };
        el.innerHTML = TODAY_BUCKETS.map(function (b) {
          const k = b[0], x = byBucket[k];
          /* A doorway tile counts what is behind the door, not what is in the
             list below it, and pressing it opens that door. */
          const door = !!(x && x.doorway);
          const n = door ? x.n : (tn[k] || 0);
          const on = !door && _todayFilter === k;
          return '<button type="button" class="rd-attn-card' + (x ? ' ' + x.tone : ' none') +
            (on ? ' on' : '') + '"' +
            (door ? ' data-go="' + esc(x.go) + '"' : ' data-td="' + k + '"') +
            (n ? '' : ' disabled') +
            (door ? '' : ' aria-pressed="' + on + '"') + '>' +
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
        $$('.rd-attn-card[data-go], .rd-attn-link', el).forEach(function (c) {
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
    renderSyncLine();
  }

  let _nextKey = '';
  /* ONE SYNC LINE, under the greeting, which is the only place on Home a
     CSM actually reads before starting.

     It carries the date V1 already wrote, how many clients are in the
     caseload, when Viv last answered, and -- loudly -- when the Hub's OWN
     data is hours old. That last part is the one that matters: a stale Viv
     pull is a number being old, but stale Hub data means everything on the
     page is describing yesterday, and until now the only hint was a quiet
     "Synced 2h ago" in a corner. */
  let _syncKey = '';
  function renderSyncLine() {
    const el = $('#home-d');
    if (!el) return;
    const app = A();
    /* The date V1 wrote. It is always the first part, and V1 rewrites this
       element on every updateHome(), so the current text is the authority
       rather than whatever was cached the first time through. */
    const live = (el.textContent || '').split(' \u00b7 ')[0].trim();
    if (live) el.dataset.rdBase = live;
    const base = el.dataset.rdBase || live;

    let n = 0;
    try { n = (app.fn.get('clients') || []).filter(function (c) { return !c.isOffice; }).length; } catch (e) {}

    /* WHEN VIV LAST ANSWERED. The Hub keeps this in localStorage under
       viv_last_sync, which is what the sidebar line read before it was
       removed; there is no field for it on the profile, which is where the
       first version of this looked and found nothing. */
    let viv = '';
    try {
      const at = localStorage.getItem('viv_last_sync');
      const d = at ? new Date(at) : null;
      if (d && !isNaN(d)) viv = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {}

    let stale = '';
    try {
      const gen = app.data && app.data.shared && app.data.shared.viv && app.data.shared.viv.generatedAt;
      if (gen) {
        const hrs = (Date.now() - new Date(gen).getTime()) / 36e5;
        if (hrs >= 2) {
          stale = hrs < 24 ? Math.round(hrs) + 'h ago' : Math.round(hrs / 24) + 'd ago';
        }
      }
    } catch (e) {}

    /* V1's updateHome() writes #home-d too, and it writes the bare date. So
       the key cannot be the only test: after V1 repaints, the content is
       different but the key is not, and the line would never come back. Ask
       the element what it currently says as well. */
    const key = base + '|' + n + '|' + viv + '|' + stale;
    const mine = el.querySelector('.rd-syncbits');
    if (key === _syncKey && mine) return;
    _syncKey = key;
    el.innerHTML = esc(base) + '<span class="rd-syncbits">' +
      (n ? ' \u00b7 ' + plural(n, 'client') : '') +
      (viv ? ' \u00b7 Viv synced ' + esc(viv) : '') +
      (stale ? ' \u00b7 <span class="rd-stale">Hub data ' + esc(stale) + '</span>' : '') +
      '</span>';
  }

  function renderComingUp() {
    const el = $('#rd-next');
    const app = A();
    if (!el || !app.ready) return;
    let cl = [], todos = [];
    try { cl = app.fn.get('clients') || []; todos = app.fn.get('todos') || []; } catch (e) { return; }
    /* SEVEN DAYS, not fourteen. The rail card is "what is coming up this
       week"; a fortnight of rows pushed the CSM's own to-do list off the
       screen and nothing in the next seven days stood out among them. */
    /* SEVEN LOCAL DAYS. Date.now() + 7 days then .toISOString() measures
       from the current UTC instant: an evening in Eastern is already
       tomorrow in UTC, so the window ran to the eighth local day and Dec 1
       appeared under "Next 7 days" on Nov 23. Counted from local midnight
       instead, which is the day the reader is actually in. */
    const t = todayISO();
    const _end = new Date(); _end.setHours(0, 0, 0, 0); _end.setDate(_end.getDate() + 7);
    const in14 = _end.getFullYear() + '-' +
      String(_end.getMonth() + 1).padStart(2, '0') + '-' +
      String(_end.getDate()).padStart(2, '0');
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
    if (!rows.length) { el.innerHTML = '<div class="rd-quiet">Nothing scheduled in the next seven days.</div>'; return; }
    el.innerHTML = rows.slice(0, 10).map(function (r) {
      /* The weekday, because "Dec 1" does not tell a CSM whether that is
         tomorrow or next Monday, and planning the week is the whole job of
         this card. */
      const d = new Date(String(r.when).slice(0, 10) + 'T12:00:00');
      const when = isNaN(d) ? fmtShort(r.when)
        : d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
      return '<div class="rd-next-row"><span class="d">' + esc(when) + '</span>' +
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
      installTodos();
      installCaseload();
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
    const wrapped = function (p) {
      const r = orig.apply(this, arguments);
      const pg = $('.page.active');
      if (pg) swapIcons(pg);
      /* Team is decorated on arrival rather than at boot, because the two
         manager modules create their own page elements during their own
         bootstrap and may not have run yet when this layer starts. */
      if (p === 'team') { try { decorateTeam(); swapIcons($('#page-team') || document); } catch (e) {} }
      if (p === 'md') { try { decorateMd(); } catch (e) {} }
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
        // #rd-today is the Today's list. tick() renders it, so watching it
        // means the renderer wakes itself. See renderToday's content key.
        if (tgt.closest('#rd-pal, #rd-top, #proto-bar, .rd-dlg, .rd-cw-rail, #rd-views, #rd-today')) continue;
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
    // v2-onboarding.js calls this after a proof is saved or a tick removed,
    // so the client page redraws without it needing to know how.
    repaintClient: function () { try { renderWorkspace(); } catch (e) {} },
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
