/* ═══════════════════════════════════════════════════════════════════════════
   CSM DAILY METRICS — the Director view
   ═══════════════════════════════════════════════════════════════════════════
   Courtney's spec, 29 October: "are clients getting proactive care, and where
   is CSM time actually going?" Phase one covers the metrics whose data already
   exists. The rest arrive with the joins and the call recordings.

   THREE RULES FROM THE SPEC, ENFORCED HERE RATHER THAN HOPED FOR:

   1. EXCEPTIONS FIRST. What is off track is at the top. Everything on track is
      a count behind a disclosure. If the page is quiet, the day is quiet.

   2. NO LEADERBOARDS. CSMs appear grouped by market and alphabetical, always,
      and no column is sortable by a metric. Caseloads and markets differ too
      much for a ranking to mean anything (MD CSPs cannot touch care plans at
      all). A sortable column is a ranking with one extra click, so there
      isn't one.

   3. THE SAME VIEW OF YOUR OWN DAY. One component. Rendered across the team
      for a Director, or scoped to one profile for a CSM, so nothing in a 1:1
      is a surprise.

   WHAT THIS DOES NOT DO: invent a number. Where a source has not answered,
   the metric says it could not be read. A compliance figure that quietly
   reports "no note" when the truth is "we could not look" sends a CSM
   chasing a note that already exists.
   =========================================================================== */
(function () {
  'use strict';

  var PAGE_ID = 'page-metrics';
  var S = { loading: false, err: null, cadence: null, md: null, open: {}, scope: null };

  function A() { return window.TributeApp || {}; }
  function api() { var a = A(); return (typeof a.vivProxy === 'string' && a.vivProxy) || ''; }
  function esc(s) { return String(s == null ? '' : s)
    .replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function I(n) { return '<span class="ti" data-i="' + n + '"></span>'; }

  /* ── who may open it ─────────────────────────────────────────────────────
     Courtney and admin only to start (Andrew, 3 November). Deliberately not
     "any manager": these are CSM-level numbers and they go in front of a
     Market Director only once Courtney has checked them against reality. */
  var OWNER_PROFILE = 'courtney';
  function allowed() {
    var a = A();
    try {
      var me = String(((a.account || {}).username) || '').toLowerCase();
      if ((a.adminUpns || []).some(function (u) { return String(u).toLowerCase() === me; })) return true;
    } catch (e) {}
    var p = a.profile;
    return !!(p && p.id === OWNER_PROFILE);
  }

  /* ── the page ─────────────────────────────────────────────────────────── */
  function host() {
    var el = document.getElementById(PAGE_ID);
    if (el) return el;
    var sibling = document.getElementById('page-home');
    if (!sibling || !sibling.parentNode) return null;
    el = document.createElement('div');
    el.id = PAGE_ID;
    el.className = 'page';
    el.innerHTML = '<div class="mx" id="mx-view"></div>';
    sibling.parentNode.insertBefore(el, sibling.nextSibling);
    return el;
  }

  /* ── the book, across every profile ──────────────────────────────────────
     getAllHubClients() is scoped to one hub and visitCompliance() to one
     profile, which is right for a CSM and wrong for a Director. The shared
     document already holds every profile for a manager, so this reads it
     directly — but the CADENCE RULES come from the application's own tables
     rather than being restated here, because two copies of High-is-14-days is
     how the Hub and the dashboard start disagreeing in a 1:1. */
  function book() {
    var a = A(), DATA = a.data, profiles = a.profiles || [];
    if (!DATA || !DATA.profiles) return [];
    var TP = a.tpCadence || { High: 14, Medium: 30, Low: 60 };
    var CI = a.ciCadence || { High: 90, Medium: 180, Low: 180 };
    var daysAgo = a.daysAgo || function () { return null; };
    var nextDue = a.nextDue || function () { return null; };
    var out = [];
    profiles.forEach(function (pr) {
      if (pr.isCSC) return;                       // CSCs carry no caseload of their own
      var pocket = DATA.profiles[pr.id] || {};
      var tps = pocket.touchpoints || [], cis = pocket.checkins || [];
      (pocket.clients || []).forEach(function (c) {
        if (c.isOffice) return;
        var tpCad = TP[c.tier] || 30, ciCad = CI[c.tier] || 180;
        var lastTP = tps.filter(function (t) { return t.clientId === c.id; })
          .sort(function (x, y) { return new Date(y.date) - new Date(x.date); })[0];
        var tpDays = lastTP ? daysAgo(lastTP.date) : null;
        var lastCI = cis.filter(function (x) { return x.clientId === c.id; })
          .sort(function (x, y) { return new Date(y.date) - new Date(x.date); })[0];
        var ciRef = (lastCI && lastCI.date) || c.startDate || null;
        var ciDays = ciRef ? daysAgo(ciRef) : null;
        var nd = nextDue(c.lastVisit, c.freq);
        out.push({
          cid: c.vivId || c.id, name: c.name || '', tier: c.tier || null,
          market: pr.market || '', csm: c.csm || pr.name, profileId: pr.id,
          // Never contacted is its own state, not "a very large number of days".
          tpNever: tpDays === null, tpDays: tpDays, tpCad: tpCad,
          tpOverdueBy: (tpDays === null) ? null : Math.max(0, tpDays - tpCad),
          ciDays: ciDays, ciCad: ciCad,
          ciOverdue: (ciDays !== null && ciDays > ciCad),
          visitOverdue: !!(c.freq && c.freq !== 'NA' && (!c.lastVisit || (nd && nd < new Date()))),
          visitNever: !!(c.freq && c.freq !== 'NA' && !c.lastVisit),
          visitDeferred: !!c.visitDeferred
        });
      });
    });
    return out;
  }

  /* ── the two reads the Hub cannot do for itself ─────────────────────── */
  async function load(force) {
    S.loading = true; S.err = null; render();
    var h = {};
    try { h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders() : {}; } catch (e) {}
    async function get(ep) {
      var r = await fetch(api() + '?endpoint=' + ep + (force ? '&refresh=1' : ''), { headers: h });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || ep + ' did not answer');
      return j;
    }
    // Settled, not all: Maryland failing must not blank the MA note cadence.
    var res = await Promise.allSettled([get('note_cadence'), get('md_compliance')]);
    S.cadence = res[0].status === 'fulfilled' ? res[0].value : { error: String(res[0].reason && res[0].reason.message || 'unavailable') };
    S.md = res[1].status === 'fulfilled' ? res[1].value : { error: String(res[1].reason && res[1].reason.message || 'unavailable') };
    S.loading = false;
    render();
  }

  /* USABLE means: it answered, AND it says its own numbers can be relied on.
     A source that reports trusted:false is not a soft warning to render in
     grey next to the figure — the figure does not get rendered. One predicate
     so the exception list, the team table and the Not-measured panel cannot
     drift apart about whether a number counts. */
  function usable(src) { return !!(src && !src.error && src.trusted !== false); }

  /* ── exceptions ─────────────────────────────────────────────────────────
     The spec's own flag thresholds. Nothing is an exception because it looks
     untidy; it is an exception because Courtney wrote down a number. */
  function exceptions(rows) {
    var ex = [];
    rows.forEach(function (r) {
      // 1.1 — "flag any client more than 7 days overdue"
      if (r.tpNever) ex.push({ k: 'touchpoint', sev: 2, csm: r.csm, market: r.market,
        name: r.name, what: 'Never contacted' });
      else if (r.tpOverdueBy > 7) ex.push({ k: 'touchpoint', sev: 1, csm: r.csm, market: r.market,
        name: r.name, what: r.tpDays + ' days since last contact, cadence is ' + r.tpCad });
      // 1.3 — "0 overdue"
      if (r.ciOverdue) ex.push({ k: 'conversation', sev: 1, csm: r.csm, market: r.market,
        name: r.name, what: 'Care Conversation ' + (r.ciDays - r.ciCad) + ' days overdue' });
      // 1.2 — a visit a CSM deliberately moved is not a miss.
      if (r.visitOverdue && !r.visitDeferred) ex.push({ k: 'visit', sev: r.visitNever ? 2 : 1,
        csm: r.csm, market: r.market, name: r.name,
        what: r.visitNever ? 'Never visited' : 'Visit past due' });
    });
    // 2.1 — note cadence, the two markets this endpoint covers
    var c = S.cadence;
    if (usable(c)) (c.clients || []).forEach(function (r) {
      if (r.flagged) ex.push({ k: 'note', sev: 1, csm: r.csm || '—', market: r.market,
        name: r.name, what: 'No note this month, ' + c.daysLeftInPeriod + ' days left' });
    });
    return ex;
  }

  function render() {
    var el = host(); if (!el) return;
    var view = $('#mx-view', el); if (!view) return;

    if (!allowed()) {
      view.innerHTML = '<div class="ph"><h2>Daily Metrics</h2></div>' +
        '<div class="card"><p class="mx-note">This view is limited to Client Solutions leadership while the numbers are being checked.</p></div>';
      return;
    }

    var rows = book(), ex = exceptions(rows);
    var byK = {};
    ex.forEach(function (x) { (byK[x.k] = byK[x.k] || []).push(x); });
    var order = [['touchpoint', 'Touchpoints overdue'], ['note', 'No note this period'],
                 ['visit', 'Visits past due'], ['conversation', 'Care Conversations overdue']];

    var out = '<div class="ph"><h2>Daily Metrics</h2>' +
      '<p>Are clients getting proactive care, and where is attention needed today?</p></div>';

    out += '<div class="mx-bar">' +
      '<button type="button" class="btn btn-o btn-sm" data-a="refresh"' + (S.loading ? ' disabled' : '') + '>' +
      (S.loading ? 'Reading…' : 'Refresh') + '</button>' +
      (S.cadence && S.cadence.generatedAt
        ? '<span class="mx-as">Note cadence as of ' + esc(String(S.cadence.generatedAt).slice(0, 10)) + '</span>' : '') +
      '</div>';

    /* ── exceptions first ─────────────────────────────────────────────── */
    if (!S.cadence && !S.loading) out += '<div class="card"><p class="mx-note">Nothing has been read yet. Tap Refresh.</p></div>';

    if (!ex.length && usable(S.cadence)) {
      out += '<div class="card mx-clear"><h3>Nothing is off track</h3>' +
        '<p class="mx-note">Every client is inside their cadence, and every visit and Care Conversation is current.</p></div>';
    } else if (!ex.length && S.cadence && !S.loading) {
      /* Nothing was flagged, but something was not measured. Saying "nothing is
         off track" here would be the lie this whole panel exists to avoid, so
         it says what it did check and names what it did not. */
      out += '<div class="card mx-clear"><h3>Nothing flagged in what could be measured</h3>' +
        '<p class="mx-note">Touchpoints, visits and Care Conversations are all current. ' +
        'Note cadence was not measured — see below.</p></div>';
    } else if (ex.length) {
      out += '<div class="card mx-ex"><h3>Needs attention today <em>' + ex.length + '</em></h3>';
      order.forEach(function (o) {
        var list = (byK[o[0]] || []).sort(function (a, b) { return b.sev - a.sev; });
        if (!list.length) return;
        out += '<div class="mx-grp"><h4>' + esc(o[1]) + ' <em>' + list.length + '</em></h4><ul class="mx-ul">' +
          list.slice(0, 40).map(function (x) {
            return '<li' + (x.sev === 2 ? ' class="sev"' : '') + '><b>' + esc(x.name) + '</b>' +
              '<span class="mx-m">' + esc(x.csm) + (x.market ? ' · ' + esc(x.market) : '') + '</span>' +
              '<span class="mx-w">' + esc(x.what) + '</span></li>';
          }).join('') +
          (list.length > 40 ? '<li class="mx-more">and ' + (list.length - 40) + ' more</li>' : '') +
          '</ul></div>';
      });
      out += '</div>';
    }

    /* ── anything that could not be read, said plainly ─────────────────── */
    var unread = [];
    if (S.cadence && S.cadence.error) unread.push('Note cadence for Massachusetts and Chicago: ' + S.cadence.error);
    else if (S.cadence && S.cadence.trusted === false) unread.push('Note cadence for Massachusetts and Chicago. ' +
      (S.cadence.untrustedReason || 'The source has not been verified.') +
      ' Nothing is being flagged from it, and no figure is shown.');
    if (usable(S.cadence) && S.cadence.counts && S.cadence.counts.unknown)
      unread.push(S.cadence.counts.unknown + ' client' + (S.cadence.counts.unknown === 1 ? '' : 's') +
        ' could not be read for note cadence, so they are counted neither way');
    if (S.md && S.md.error) unread.push('Maryland compliance board: ' + S.md.error);
    if (unread.length) out += '<div class="card mx-unread"><h3>Not measured</h3><ul class="mx-ul">' +
      unread.map(function (u) { return '<li><span class="mx-w">' + esc(u) + '</span></li>'; }).join('') +
      '</ul><p class="mx-note">These are gaps in what could be read, not clean results.</p></div>';

    /* ── context, collapsed, grouped by market and alphabetical ───────── */
    out += team(rows, ex);

    view.innerHTML = out;
    if (window.TributeIcons && window.TributeIcons.swap) window.TributeIcons.swap(el);
    $$('[data-a]', el).forEach(function (n) { n.addEventListener('click', act); });
    $$('[data-open]', el).forEach(function (n) {
      n.addEventListener('click', function () { S.open[n.dataset.open] = !S.open[n.dataset.open]; render(); });
    });
  }

  /* NO LEADERBOARDS. Markets in a fixed order, CSMs alphabetical inside them,
     and not a sortable header anywhere. The counts are context for a 1:1, not
     a ranking, and the order never moves with the numbers. */
  var MARKET_ORDER = ['Massachusetts', 'Maryland', 'Chicago'];
  function team(rows, ex) {
    var byCsm = {};
    rows.forEach(function (r) {
      var k = r.csm || '—';
      byCsm[k] = byCsm[k] || { csm: k, market: r.market, clients: 0, tpOver: 0, visits: 0, conv: 0 };
      byCsm[k].clients++;
      if (r.tpNever || r.tpOverdueBy > 7) byCsm[k].tpOver++;
      if (r.visitOverdue && !r.visitDeferred) byCsm[k].visits++;
      if (r.ciOverdue) byCsm[k].conv++;
    });
    var noteByCsm = {};
    if (usable(S.cadence)) (S.cadence.clients || []).forEach(function (r) {
      if (r.flagged) noteByCsm[r.csm || '—'] = (noteByCsm[r.csm || '—'] || 0) + 1;
    });

    /* The Notes column is DROPPED, not blanked, when note cadence is not
       measured. A column of dashes beside four real numbers reads as "no
       problems here", which is the opposite of the truth. */
    var noteCol = usable(S.cadence);
    var open = !!S.open.team;
    var o = '<div class="card mx-team"><h3><button type="button" class="mx-tog" data-open="team" aria-expanded="' +
      open + '">' + I(open ? 'chevronDown' : 'chevron') + 'The team</button></h3>';
    if (!open) {
      o += '<p class="mx-note">' + Object.keys(byCsm).length + ' CSMs, ' + rows.length +
        ' active clients. Open for the per-CSM counts.</p></div>';
      return o;
    }
    MARKET_ORDER.forEach(function (mk) {
      var list = Object.keys(byCsm).filter(function (k) { return byCsm[k].market === mk; }).sort();
      if (!list.length) return;
      o += '<div class="mx-grp"><h4>' + esc(mk) + '</h4><table class="mx-t"><thead><tr>' +
        '<th>CSM</th><th>Clients</th><th>Touchpoints</th>' +
        (noteCol ? '<th>Notes</th>' : '') + '<th>Visits</th><th>Conversations</th>' +
        '</tr></thead><tbody>' +
        list.map(function (k) {
          var r = byCsm[k];
          var cell = function (n) { return '<td' + (n ? ' class="hot"' : '') + '>' + (n || '—') + '</td>'; };
          return '<tr><th scope="row">' + esc(r.csm) + '</th><td>' + r.clients + '</td>' +
            cell(r.tpOver) + (noteCol ? cell(noteByCsm[r.csm] || 0) : '') +
            cell(r.visits) + cell(r.conv) + '</tr>';
        }).join('') + '</tbody></table></div>';
    });
    o += '<p class="mx-note">Grouped by market and listed alphabetically. These are not comparable between ' +
      'CSMs: caseloads and market rules differ, and the numbers are here for a conversation, not a ranking.' +
      (noteCol ? '' : ' The Notes column is absent because note cadence is not being measured yet.') +
      '</p></div>';
    return o;
  }

  function act(e) {
    var a = e.currentTarget.dataset.a;
    if (a === 'refresh') load(true);
  }

  /* ── the Hub asks for this when the rail routes to it ─────────────────── */
  function open() {
    host();
    render();
    if (!S.cadence && !S.loading) load(false);
  }

  /* BOOTSTRAP. showPage() dereferences document.getElementById('page-' + p)
     without a guard, so the element has to exist before the rail is ever
     clicked — building it lazily on first open is too late and throws. It is
     created empty and costs nothing until it is rendered.

     The render hook is a delegated listener rather than an entry in
     showPage's own dispatch map, because that map lives in V1 and this is a
     V2-only destination. Delegated so it survives rebuildNav(), which
     replaces the rail's children. */
  function boot() {
    host();
    document.addEventListener('click', function (e) {
      var n = e.target && e.target.closest && e.target.closest('[data-page="metrics"]');
      if (n) setTimeout(open, 0);
    });
    // Arriving on #/metrics directly, rather than by clicking the rail.
    if (/^#\/?metrics/.test(location.hash)) setTimeout(open, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.TributeMetrics = { open: open, render: render, allowed: allowed, pageId: PAGE_ID };
}());
