/* ═══════════════════════════════════════════════════════════════════════════
   TRIBUTE CSM HUB — WORKFLOW REDESIGNS  (pass 4)
   ═══════════════════════════════════════════════════════════════════════════
   Not a theme pass. Three screens were measured, ranked worst, and redesigned
   on their own terms. The Client Tracker's LESSON travels here — show the
   answer first, put the apparatus behind it — but its LAYOUT does not: a
   compliance board and a weekly submission queue are different jobs.

   Each screen replaces the application's own renderers. The application's
   state, selection, filters, data ownership and write paths are untouched:
   every override reads the same variables and calls the same functions.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const A = () => window.TributeApp || { fn: {} };
  const U = () => (window.TributeRedesign && window.TributeRedesign.ui) || {};
  const esc = (s) => (U().esc ? U().esc(s) : String(s == null ? '' : s));
  const I = (n) => (U().icon ? U().icon(n) : '');
  const fmtShort = (d) => (U().fmtShort ? U().fmtShort(d) : (d || '—'));
  const illustration = (k, t, b) => (U().illustration ? U().illustration(k, t, b) : '<p>' + esc(t) + '</p>');

  /* ═══════════════════════════════════════════════════════════════════════
     1 · MARYLAND COMPLIANCE
     ═══════════════════════════════════════════════════════════════════════
     Measured before: nine KPI tiles of which FOUR read zero, six filter
     pills plus a search box in one persistent bar, and every row repeating
     its own badge as red text directly underneath it. 25 bordered boxes,
     the highest count of any screen after Home.

     The page exists to answer one question — who is out of compliance, and
     on what — and it was answering it fourth, after a description, a tile
     wall and a filter bar.

     Now: four purposeful views carry the question. Mine and search drop to a
     quiet secondary line. A tile appears only when its number is not zero,
     so a clean market gets a clean page instead of a wall of noughts. One
     line per row, the worst thing first, said once.

     The seven requirements stay explicit and evidence-bearing in the detail
     pane — each with its status, its date and the Viv form it came from.
     Nothing became a score. ───────────────────────────────────────────── */

  const MD_VIEWS = [
    ['attention', 'Needs attention'],
    ['assess', 'Assessment due'],
    ['reassess', 'Reassessment owed'],
    ['touch', 'Weekly documentation'],
    ['all', 'All clients']
  ];
  let _mdMine = false;

  // The application computes effective cadence per row (the 45/90-day
  // override lives in the hub document, not in Viv). Use ITS function, so a
  // CSM's designation takes effect here exactly as it does natively.
  function mdAll() {
    const d = A().maryland;
    const rows = (d && d.rows) || [];
    return typeof window._mdRow === 'function' ? rows.map(window._mdRow) : rows;
  }
  const mdFlags = (r) => (typeof window._mdFlags === 'function' ? window._mdFlags(r) : []);
  const mdView = () => A().mdFilter || 'attention';

  function mdMatch(r, view) {
    const docGap = (r.missedWeeks12 > 0) || (r.touchSource && r.touchSource.noActivity);
    if (view === 'attention') return mdFlags(r).length > 0;
    if (view === 'assess') return r.statusEff === 'overdue' || r.statusEff === 'none' || r.statusEff === 'soon' || r.annualStatus === 'overdue';
    if (view === 'reassess') return r.reassessmentCount > 0 || r.pmofNeeded;
    if (view === 'touch') return docGap;
    return true;
  }

  function mdRowsFor(view) {
    const q = (($('#md-search') || {}).value || '').toLowerCase().trim();
    let rows = mdAll().filter(function (r) {
      if (_mdMine && !ownedByMe(r.csm)) return false;
      if (q && ((r.name || '') + ' ' + (r.csm || '') + ' ' + (r.community || '')).toLowerCase().indexOf(q) < 0) return false;
      return mdMatch(r, view);
    });
    // Worst first, as the application sorts: overdue days, then how many
    // requirements are open.
    rows.sort(function (a, b) {
      return (b.overdueByEff || -9999) - (a.overdueByEff || -9999) || mdFlags(b).length - mdFlags(a).length;
    });
    return rows;
  }

  // ONE line. The badge-and-identical-red-text duplication is gone, and the
  // order is the order a CSM would triage in.
  function mdLine(r) {
    if (r.statusEff === 'none') return { tone: 'bad', t: 'No assessment on file' };
    if (r.statusEff === 'overdue') return { tone: 'bad', t: 'Assessment overdue ' + r.overdueByEff + ' day' + (r.overdueByEff === 1 ? '' : 's') };
    if (r.annualStatus === 'overdue') return { tone: 'bad', t: 'Annual assessment overdue' };
    if (r.reassessmentCount > 0) return { tone: 'bad', t: r.reassessmentCount + ' reassessment' + (r.reassessmentCount > 1 ? 's' : '') + ' owed' };
    if (r.initial && r.initial.ok === false) return { tone: 'warn', t: r.initial.withinDays === null ? 'No admission form on file' : 'Initial assessment outside 48 hours' };
    if (r.touchSource && r.touchSource.noActivity) return { tone: 'warn', t: 'No activity at all in 12 weeks' };
    if (r.missedWeeks12 > 0) return { tone: 'warn', t: r.missedWeeks12 + ' week' + (r.missedWeeks12 > 1 ? 's' : '') + ' with no note' };
    if (r.statusEff === 'soon') return { tone: 'warn', t: 'Assessment due ' + fmtShort(r.nextDueEff) };
    if (r.pmofNeeded) return { tone: 'warn', t: 'Medication change — PMOF not confirmed' };
    return null;
  }

  /* The tile strip. Six candidates, only the live ones drawn, four at most.
     A zero is not information on a compliance board: it is the absence of
     work, and the page should look like that. */
  function mdKpi() {
    const el = $('#md-kpi');
    if (!el) return;
    const rows = mdAll();
    const CAND = [
      ['Assessment overdue', rows.filter(function (r) { return r.statusEff === 'overdue' || r.statusEff === 'none'; }).length],
      ['Reassessment owed', rows.filter(function (r) { return r.reassessmentCount > 0; }).length],
      ['Documentation gaps', rows.filter(function (r) { return r.missedWeeks12 > 0 || (r.touchSource && r.touchSource.noActivity); }).length],
      ['Initial 48h missed', rows.filter(function (r) { return r.initial && r.initial.ok === false; }).length],
      ['Annual overdue', rows.filter(function (r) { return r.annualStatus === 'overdue'; }).length],
      ['Due in 14 days', rows.filter(function (r) { return r.statusEff === 'soon'; }).length]
    ];
    const live = CAND.filter(function (c) { return c[1] > 0; }).slice(0, 4);
    el.removeAttribute('style');
    el.className = 'rd-strip';
    el.innerHTML = live.length
      ? live.map(function (c) {
          return '<div class="rd-stat"><span class="n">' + c[1] + '</span><span class="l">' + esc(c[0]) + '</span></div>';
        }).join('')
      : '<div class="rd-allgood"><span class="ti-skip">' + I('compliance') + '</span>All ' +
        rows.length + ' Maryland client' + (rows.length === 1 ? '' : 's') + ' meet every requirement.';
    const cnt = $('#md-count');
    if (cnt) cnt.textContent = rows.length + ' Maryland client' + (rows.length === 1 ? '' : 's');
    mdStale();
  }

  function mdStale() {
    const el = $('#md-stale');
    if (!el) return;
    const d = A().maryland;
    const g = d && d.generatedAt;
    const incomplete = mdAll().filter(function (r) { return r.touchSource && r.touchSource.complete === false; }).length;
    el.innerHTML =
      (g ? 'Read from Viv ' + new Date(g).toLocaleString() + ' · forms and the client feed refresh every 12 hours' : '') +
      (incomplete ? ' · <span class="warn">' + incomplete + ' client' + (incomplete === 1 ? ' has' : 's have') +
        ' no client-feed history, so their weekly notes are counted from communications alone</span>' : '');
  }

  /* The view bar, built once, and the application's own search input MOVED
     rather than recreated — so its handler, its value and the caret all
     survive a re-render. Recreating it was the obvious thing to do and it
     cost the field its focus on every keystroke. */
  function mdChrome() {
    const rowsEl = $('#md-rows');
    if (!rowsEl) return;
    const host = rowsEl.parentElement;
    let bar = $('#md-views');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'md-views';
      bar.innerHTML = '<div class="rd-views" role="tablist"></div>' +
        '<div class="rd-subbar"><button type="button" class="rd-toggle" id="md-mine">Mine</button></div>';
      host.insertBefore(bar, rowsEl);
      const se = $('#md-search');
      if (se) { se.className = 'rd-quietsearch'; se.removeAttribute('style'); se.placeholder = 'Search client, CSM or community'; $('.rd-subbar', bar).appendChild(se); }
      $('#md-mine').addEventListener('click', function () {
        _mdMine = !_mdMine;
        mdKpi(); renderMdRows();
      });
      // The native pill row keeps its buttons (and their handlers) so
      // mdFilter() still works; it is hidden, not emptied.
      const old = $$('button[id^="md-f-"]', host)[0];
      if (old && old.parentElement) old.parentElement.classList.add('rd-native-filters');
    }
    const view = mdView();
    $('#md-mine').setAttribute('aria-pressed', String(_mdMine));
    $('#md-mine').classList.toggle('on', _mdMine);
    $('.rd-views', bar).innerHTML = MD_VIEWS.map(function (v) {
      const n = mdRowsFor(v[0]).length;
      return '<button type="button" class="rd-view" role="tab" data-v="' + v[0] + '" aria-selected="' + (view === v[0]) + '">' +
        esc(v[1]) + (n ? '<span class="n">' + n + '</span>' : '') + '</button>';
    }).join('');
    $$('.rd-view', bar).forEach(function (b) {
      b.addEventListener('click', function () { window.mdFilter(b.dataset.v); });
    });
  }

  function renderMdRows() {
    const el = $('#md-rows');
    if (!el) return;
    mdChrome();
    const view = mdView();
    const rows = mdRowsFor(view);
    const sel = A().mdSel;
    if (!rows.length) {
      el.innerHTML = illustration('allclear',
        view === 'attention' ? 'Nothing out of compliance' : 'Nothing in this view',
        view === 'attention'
          ? 'Every Maryland client here is inside all seven requirements.'
          : 'Try another view, or clear the search.');
      return;
    }
    el.innerHTML = '<ul class="rd-cl md-list" role="listbox">' + rows.map(function (r) {
      const line = mdLine(r);
      const on = sel === r.cid;
      return '<li><button type="button" class="rd-cl-open md-row' + (on ? ' sel' : '') +
        '" data-cid="' + esc(r.cid) + '" role="option" aria-selected="' + on + '">' +
        '<span class="rd-cl-id"><span class="rd-cl-name">' + esc(r.name || '') + '</span>' +
        '<span class="rd-cl-where">' + esc([r.csm || 'No CSM', r.community].filter(Boolean).join(' · ')) + (r.cadEff === 45 ? '<span class="md-cad-tag">45-day</span>' : '') + '</span></span>' +
        (line ? '<span class="rd-cl-ex ' + line.tone + '">' + esc(line.t) + '</span>'
              : '<span class="rd-cl-ok">Meets all seven</span>') +
        '</button></li>';
    }).join('') + '</ul>';
    $$('.md-row', el).forEach(function (b) {
      b.addEventListener('click', function () { window.mdSelect(b.dataset.cid); });
    });
  }

  /* The detail pane. Seven requirements, each one a status word, the fact
     behind it, the date, and the Viv form it was read from. The brief is
     explicit that regulatory truth must not become a score, so none of this
     is aggregated and none of it is coloured without a reason. */
  function mdReq(name, state, detail, evidence, when) {
    const cls = state === true ? 'met' : state === false ? 'missed' : 'unknown';
    const word = state === true ? 'Met' : state === false ? 'Not met' : 'Cannot tell';
    return '<div class="md-req ' + cls + '">' +
      '<div class="md-req-h"><span class="md-req-n">' + esc(name) + '</span>' +
      '<span class="md-req-s">' + word + '</span></div>' +
      (detail ? '<div class="md-req-d">' + detail + '</div>' : '') +
      (when ? '<div class="md-req-w">' + esc(when) + '</div>' : '') +
      (evidence ? '<div class="md-req-e">' + esc(evidence) + '</div>' : '') + '</div>';
  }

  function renderMdDetail() {
    const el = $('#md-detail');
    if (!el) return;
    const sel = A().mdSel;
    const r = mdAll().find(function (x) { return x.cid === sel; });
    if (!r) {
      el.innerHTML = '<div class="md-det rd-ws-empty">' + (U().art ? U().art.calm : '') +
        '<p>Choose a client to see all seven requirements, the date on each, and the form it came from.</p></div>';
      return;
    }
    const a = r.lastAssessment, ini = r.initial || {};
    const src = function (f) { return f && f.date ? 'From “' + f.title + '” dated ' + fmtShort(f.date) : ''; };
    const ts = r.touchSource || {};
    const nW = (r.weeklyTouch || []).length;
    const gapWeeks = (r.weeklyTouch || []).filter(function (w) { return !w.touched; })
      .map(function (w) { return fmtShort(w.week); });

    el.innerHTML = '<div class="md-det">' +
      '<header class="md-det-h"><h3>' + esc(r.name || '') + '</h3>' +
      '<p>' + esc([r.csm || 'No CSM', r.community].filter(Boolean).join(' · ')) + '</p></header>' +

      '<div class="md-cad"><span class="lb">Assessment cadence</span>' +
      '<button type="button" class="rd-toggle' + (r.cadEff === 90 ? ' on' : '') + '" data-cad="90">90 days</button>' +
      '<button type="button" class="rd-toggle' + (r.cadEff === 45 ? ' on' : '') + '" data-cad="45">45 days</button>' +
      (r.cadOverride ? '<button type="button" class="rd-linkbtn" data-cad="0">Clear</button>' : '') +
      (r.medHint ? '<em>Care plan: medication by ' + esc(r.medHint) + '</em>' : '') + '</div>' +

      '<div class="md-reqs">' +
      mdReq('Initial assessment within 48 hours',
        ini.ok === undefined ? null : ini.ok,
        ini.withinDays !== null && ini.withinDays !== undefined
          ? 'Admitted ' + fmtShort(ini.admitted) + ', care started ' + fmtShort(ini.careStarted) +
            ' — ' + ini.withinDays + ' day' + (ini.withinDays === 1 ? '' : 's') + ' apart.'
          : esc(ini.unknownReason || ''),
        ini.admitted ? 'From “Client Admission Form”' : '', '') +

      mdReq('Nursing assessment every ' + r.cadEff + ' days',
        !a ? null : (r.overdueByEff > 0 ? false : true),
        !a ? 'No nursing assessment on file.'
           : (r.overdueByEff > 0 ? '<strong>' + r.overdueByEff + ' days overdue.</strong>'
                                 : Math.abs(r.overdueByEff) + ' days until the next one is due.'),
        src(a), a ? 'Last ' + fmtShort(a.date) + ' · next due ' + fmtShort(r.nextDueEff) : '') +

      mdReq('Annual nursing assessment',
        !a ? null : (r.annualStatus === 'overdue' ? false : true),
        !a ? 'No assessment on file.'
           : (r.annualStatus === 'overdue' ? '<strong>' + r.annualOverdueBy + ' days past the annual deadline.</strong>'
                                           : Math.abs(r.annualOverdueBy) + ' days of the year remaining.'),
        src(a), '') +

      mdReq('Reassessment after hospitalisation or change of condition',
        (r.reassessmentOwed || []).length ? false : true,
        (r.reassessmentOwed || []).length
          ? (r.reassessmentOwed || []).map(function (t) {
              return fmtShort(t.date) + ' — <strong>' + esc(t.kind) + '</strong>' +
                (t.detail ? ': ' + esc(t.detail) : '') +
                (t.evidence ? '<span class="md-req-q">“' + esc(t.evidence) + '”</span>' : '');
            }).join('')
          : 'No hospital admission or change of condition since the last assessment.',
        (r.reassessmentOwed || []).length ? 'From service exceptions and changes of condition, last 45 days' : '', '') +

      mdReq('A note in the record every week',
        ts.noActivity ? null : (r.missedWeeks12 === 0),
        ts.noActivity
          ? 'No visit, note, call, email or CSM visit in 12 weeks. That usually means no care is being delivered — check whether this client is still active.'
          : (r.missedWeeks12 === 0
              ? 'A note in every one of the last ' + nW + ' week' + (nW === 1 ? '' : 's') + '.'
              : '<strong>' + r.missedWeeks12 + ' of the last ' + nW + ' weeks have no note of any kind.</strong>' +
                (gapWeeks.length ? '<span class="md-req-q">Weeks beginning ' + esc(gapWeeks.join(', ')) + '</span>' : '')),
        ts.feedEvents != null
          ? 'From ' + ts.feedEvents + ' client-feed entries and ' + (ts.comms || 0) + ' communications over ' + (ts.windowDays || 84) + ' days'
          : '',
        ts.careStarted ? 'Counted from ' + fmtShort(ts.careStarted) + ', when care started' : '') +

      mdReq('Signed PMOF for any medication change',
        r.pmofNeeded ? null : true,
        r.pmofNeeded
          ? 'A medication change appears in the record. Viv holds no PMOF form type, so this one cannot be confirmed from data — open the client’s documents and check.'
          : 'No medication change found in the window.',
        '', '') +

      mdReq('Care plan on file',
        r.lastCarePlan && r.lastCarePlan.date ? true : null,
        r.lastCarePlan && r.lastCarePlan.date ? 'Updated ' + fmtShort(r.lastCarePlan.date) + '.' : 'No care plan found in Viv.',
        src(r.lastCarePlan), '') +
      '</div>' +

      '<footer class="md-det-f">' + esc(r.formsOnFile || 0) + ' form' + (r.formsOnFile === 1 ? '' : 's') +
      ' on file in Viv for this client.</footer></div>';

    $$('[data-cad]', el).forEach(function (b) {
      b.addEventListener('click', function () { window.setMdCadence(r.cid, +b.dataset.cad); });
    });
  }


  /* ═══════════════════════════════════════════════════════════════════════
     2 · LTC SUBMISSIONS
     ═══════════════════════════════════════════════════════════════════════
     Measured before: a six-column table (CLIENT / CARRIER / ROUTE / VISITS /
     NOTES / STATUS), five KPI tiles, five filter pills and a search box.
     Fifteen bordered boxes. The same failure the Client Tracker had — the
     screen showed a database, and the user had to do the reading.

     This is a weekly QUEUE, not a report. Every Monday someone works down
     it: what can go out, what is stuck and why, what already went. So the
     views ARE the states, in the order you work them, and each row says the
     one thing that decides what you do with it.

     Route, visit count, hours, note percentage, policy and claim numbers are
     all still here — in the detail pane, where you look once you have picked
     the row. Nothing was dropped; six columns became one sentence.
     ───────────────────────────────────────────────────────────────────── */

  const LTC_VIEWS = [
    ['blocked', 'Blocked'],
    ['ready', 'Ready to send'],
    ['open', 'Not sent yet'],
    ['all', 'All'],
    ['mine', 'Mine']
  ];

  const ltcRows = () => ((A().ltcBoard || {}).rows) || [];
  const ltcView = () => A().ltcFilterNow || 'all';
  const LTC_STATE_WORD = { not_started: 'Not sent', approved: 'Approved', sent: 'Sent', confirmed: 'Confirmed', skipped: 'Skipped' };

  function ltcCount(view) { return ltcRowsFor(view, true).length; }

  function ltcRowsFor(view, ignoreScope) {
    const q = (($('#ltc-submission-search') || {}).value || '').toLowerCase().trim();
    return ltcRows().filter(function (r) {
      const st = (r.submission || {}).state || 'not_started';
      if (!ignoreScope && view === 'mine' && !ownedByMe(r.csm)) return false;
      if (view === 'ready' && (!r.ready || ['sent', 'confirmed', 'skipped'].indexOf(st) > -1)) return false;
      if (view === 'blocked' && r.ready) return false;
      if (view === 'open' && ['sent', 'confirmed', 'skipped'].indexOf(st) > -1) return false;
      if (!ignoreScope && q && (r.clientName + ' ' + r.insurer).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) {
      // Blocked first, then ready, then everything already handled.
      const rank = function (r) {
        const st = (r.submission || {}).state || 'not_started';
        if (st === 'confirmed') return 4;
        if (st === 'sent') return 3;
        if (st === 'approved') return 2;
        return r.ready ? 1 : 0;
      };
      return rank(a) - rank(b) || String(a.clientName).localeCompare(String(b.clientName));
    });
  }

  // One sentence per row: what is true about this packet right now.
  function ltcLine(r) {
    const s = r.submission || {};
    const st = s.state || 'not_started';
    if (st === 'confirmed') return { tone: 'done', t: 'Confirmed' + (s.confirmation ? ' · ' + s.confirmation : '') };
    if (st === 'sent') return { tone: 'done', t: 'Sent ' + fmtShort(s.sentAt) };
    if (st === 'skipped') return { tone: 'mute', t: 'Skipped this week' };
    if (!r.ready) {
      const b = r.blockers || [];
      return { tone: 'bad', t: b.length ? b[0] + (b.length > 1 ? ' · +' + (b.length - 1) + ' more' : '') : 'Blocked' };
    }
    if (st === 'approved') return { tone: 'warn', t: 'Approved — not sent yet' };
    return { tone: 'ok', t: 'Ready · ' + r.visits + ' visit' + (r.visits === 1 ? '' : 's') + ', notes complete' };
  }

  function ltcKpi() {
    const el = $('#ltc-kpi');
    const d = A().ltcBoard;
    if (!el || !d) return;
    const all = ltcRows();
    const sent = all.filter(function (r) {
      const st = (r.submission || {}).state;
      return st === 'sent' || st === 'confirmed';
    }).length;
    // Counted from the same predicate as the views, so the strip can never
    // say "4 ready" above a view tab reading "Ready to send 2".
    const CAND = [
      ['Blocked', ltcCount('blocked')],
      ['Ready to send', ltcCount('ready')],
      ['Sent this week', sent],
      ['Clients this week', all.length]
    ];
    const live = CAND.filter(function (x) { return x[1] > 0; });
    el.removeAttribute('style');
    el.className = 'rd-strip';
    el.innerHTML = live.length
      ? live.map(function (x) { return '<div class="rd-stat"><span class="n">' + x[1] + '</span><span class="l">' + esc(x[0]) + '</span></div>'; }).join('')
      : '<div class="rd-allgood"><span class="ti-skip">' + I('ltc') + '</span>No LTC submissions due for this week.</div>';
    ltcStale();
  }

  function ltcStale() {
    const el = $('#ltc-stale');
    const d = A().ltcBoard;
    if (!el || !d) return;
    const q = d.qbSnapshot;
    el.innerHTML =
      (q ? 'QuickBooks payment data from ' + fmtShort(q.generatedAt) + ' · ' + q.matched + ' clients matched' +
           (q.unmatched ? ', ' + q.unmatched + ' unmatched' : '')
         : '<span class="bad">No QuickBooks payment data loaded — proof-of-payment carriers cannot be cleared.</span>') +
      ((d.counts && d.counts.unlinked) ? ' · <span class="warn">' + d.counts.unlinked +
        ' records have no Viv link and are not shown</span>' : '');
  }

  function ltcChrome() {
    const rowsEl = $('#ltc-rows');
    if (!rowsEl) return;
    const host = rowsEl.parentElement;
    let bar = $('#ltc-views');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ltc-views';
      bar.innerHTML = '<div class="rd-views" role="tablist"></div><div class="rd-subbar"></div>';
      host.insertBefore(bar, rowsEl);
      const se = $('#ltc-submission-search');
      if (se) { se.className = 'rd-quietsearch'; se.removeAttribute('style'); se.placeholder = 'Search client or carrier'; $('.rd-subbar', bar).appendChild(se); }
      const old = $$('button[id^="ltc-f-"]', host)[0];
      if (old && old.parentElement) old.parentElement.classList.add('rd-native-filters');
      rowsEl.classList.add('rd-scroll');
    }
    const view = ltcView();
    $('.rd-views', bar).innerHTML = LTC_VIEWS.map(function (v) {
      const n = ltcRowsFor(v[0]).length;
      return '<button type="button" class="rd-view" role="tab" data-v="' + v[0] + '" aria-selected="' + (view === v[0]) + '">' +
        esc(v[1]) + (n ? '<span class="n">' + n + '</span>' : '') + '</button>';
    }).join('');
    $$('.rd-view', bar).forEach(function (b) {
      b.addEventListener('click', function () { window.ltcFilter(b.dataset.v); });
    });
    // The week is the frame for the whole screen, so it reads as a heading
    // rather than as two buttons with a date wedged between them.
    const wk = $('#ltc-week');
    if (wk && !wk.dataset.rd) { wk.dataset.rd = '1'; wk.classList.add('rd-weeklabel'); }
  }

  function renderLtcSubmissionRows() {
    const el = $('#ltc-rows');
    if (!el) return;
    ltcChrome();
    const view = ltcView();
    const rows = ltcRowsFor(view);
    const sel = A().ltcSel;
    if (!rows.length) {
      el.innerHTML = illustration('allclear',
        view === 'blocked' ? 'Nothing is blocked' : view === 'ready' ? 'Nothing waiting to go out' : 'Nothing in this view',
        view === 'blocked' ? 'Every packet this week has what it needs.'
          : view === 'ready' ? 'Everything ready has already been sent.'
          : 'Try another view, or clear the search.');
      return;
    }
    el.innerHTML = '<ul class="rd-cl ltc-list" role="listbox">' + rows.map(function (r) {
      const line = ltcLine(r);
      const on = sel === r.id;
      return '<li><button type="button" class="rd-cl-open ltc-row' + (on ? ' sel' : '') +
        '" data-id="' + esc(r.id) + '" role="option" aria-selected="' + on + '">' +
        '<span class="rd-cl-id"><span class="rd-cl-name">' + esc(r.clientName) + '</span>' +
        '<span class="rd-cl-where">' + esc(r.insurer) + (r.csm ? ' · ' + esc(r.csm) : '') + '</span></span>' +
        '<span class="rd-cl-ex ' + line.tone + '">' + esc(line.t) + '</span>' +
        '</button></li>';
    }).join('') + '</ul>';
    $$('.ltc-row', el).forEach(function (b) {
      b.addEventListener('click', function () { window.ltcSelect(b.dataset.id); });
    });
  }

  /* The detail pane. The native one was a stack of seventeen label/value
     rows with the actions at the bottom, so the thing you came to do was the
     last thing you reached. Now: status and the one action that moves this
     packet forward at the top, what is blocking it, what is in it, and the
     reference numbers folded into a quiet footer.

     Every button calls the application's own function. ltcAct, ltcPreview
     and ltcNudge are untouched, so the write path and its history record are
     exactly as they were. */
  function renderLtcDetail() {
    const el = $('#ltc-detail');
    if (!el) return;
    const sel = A().ltcSel;
    const d = A().ltcBoard;
    const r = ltcRows().find(function (x) { return x.id === sel; });
    if (!r) {
      el.innerHTML = '<div class="ltc-det rd-ws-empty">' + (U().art ? U().art.calm : '') +
        '<p>Choose a client to see the week’s visits, anything missing, and the submission actions.</p></div>';
      return;
    }
    const s = r.submission || {};
    const st = s.state || 'not_started';

    // One primary action, named for what it does next.
    let primary = '', secondary = [];
    if (st === 'not_started') {
      primary = { fn: "ltcAct('approve')", t: r.ready ? 'Approve this packet' : 'Approve anyway' };
    } else if (st === 'approved') {
      primary = { fn: "ltcAct('sent')", t: 'Mark sent' };
      secondary.push({ fn: "ltcAct('unapprove')", t: 'Undo approval' });
    } else if (st === 'sent') {
      primary = { fn: "ltcAct('confirm')", t: 'Add confirmation' };
      secondary.push({ fn: "ltcAct('unapprove')", t: 'Reopen' });
    } else if (st === 'confirmed') {
      secondary.push({ fn: "ltcAct('unapprove')", t: 'Reopen' });
    }
    secondary.push({ fn: 'ltcPreview()', t: 'Preview what will be sent' });

    const kv = function (l, v) {
      return '<div class="ltc-kv"><span class="k">' + esc(l) + '</span><span class="v">' + v + '</span></div>';
    };

    el.innerHTML = '<div class="ltc-det">' +
      '<header class="ltc-det-h">' +
        '<h3>' + esc(r.clientName) + '</h3>' +
        '<p>' + esc([r.insurer, r.market, r.csm || 'unassigned'].filter(Boolean).join(' · ')) + '</p>' +
        '<span class="ltc-det-st ' + st + '">' + esc(LTC_STATE_WORD[st] || st) + '</span>' +
      '</header>' +

      (r.blockers && r.blockers.length
        ? '<div class="ltc-block"><h4>' +
          // "Approved" in the corner above a panel reading BLOCKED is
          // accurate and reads as a contradiction. Say what happened.
          (st === 'approved' || st === 'sent' || st === 'confirmed'
            ? 'Blocked \u2014 approved anyway' : 'Blocked') + '</h4><ul>' +
          r.blockers.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>'
        : '') +

      '<div class="ltc-facts">' +
        kv('Week', esc((d && d.week && d.week.label) || '')) +
        kv('Visits', r.visits + ' · ' + r.hours + ' hrs') +
        kv('Care notes', r.visits
          ? (r.notesComplete === r.visits
              ? 'all ' + r.visits + ' complete'
              : '<span class="bad">' + r.notesComplete + ' of ' + r.visits + ' complete</span>')
          : 'no visits') +
        kv('Send to', (r.destinationOk ? '' : '<span class="bad">') + esc(r.destination || '—') + (r.destinationOk ? '' : '</span>')) +
        (r.needsProofOfPayment
          ? kv('Proof of payment', r.invoice
              ? '#' + esc(r.invoice.docNumber) + ' · $' + r.invoice.total +
                (r.invoice.balance > 0 ? ' <span class="bad">(unpaid)</span>' : ' <span class="pos">(paid)</span>')
              : '<span class="bad">invoice not found</span>')
          : (r.invoice ? kv('Invoice', '#' + esc(r.invoice.docNumber) + ' · $' + r.invoice.total) : '')) +
      '</div>' +

      (r.missingDetail && r.missingDetail.length
        ? '<div class="ltc-missing"><h4>Visits missing notes</h4>' +
          r.missingDetail.map(function (m) {
            return '<div class="ltc-miss"><span>' + esc(/^\d{4}-\d{2}-\d{2}/.test(String(m.day)) ? fmtShort(m.day) : m.day) + ' · ' + esc(m.caregiver) + '</span>' +
              '<span class="bad">' + m.tasksCompleted + ' of ' + m.tasksTotal + ' tasks</span></div>';
          }).join('') +
          '<p>Carriers deny reimbursement when hands-on care is not documented, so these need chasing before the packet goes.</p>' +
          '<button type="button" class="btn btn-sm btn-o" data-act="nudge">Text the caregiver' +
          (r.missingDetail.length > 1 ? 's' : '') + '</button></div>'
        : '') +

      (r.instructions ? '<div class="ltc-note">' + esc(r.instructions) + '</div>' : '') +
      (r.route === 'portal'
        ? '<div class="ltc-note">' + esc(r.insurer) + ' has no provider API, so the upload stays manual. ' +
          '<a href="' + esc(r.destination) + '" target="_blank" rel="noopener">Open the portal</a></div>'
        : '') +

      '<div class="ltc-acts">' +
        (primary ? '<button type="button" class="btn btn-sm btn-p" data-fn="' + esc(primary.fn) + '">' + esc(primary.t) + '</button>' : '') +
        secondary.map(function (a) {
          return '<button type="button" class="btn btn-sm btn-o" data-fn="' + esc(a.fn) + '">' + esc(a.t) + '</button>';
        }).join('') +
      '</div>' +

      '<footer class="ltc-det-f">' +
        [r.policyNum ? 'Policy ' + esc(r.policyNum) : '',
         r.claimNum ? 'Claim ' + esc(r.claimNum) : '',
         s.approvedBy ? 'Approved by ' + esc(s.approvedBy) + ' on ' + fmtShort(s.approvedAt) : '',
         s.sentBy ? 'Sent by ' + esc(s.sentBy) + ' on ' + fmtShort(s.sentAt) : ''
        ].filter(Boolean).join(' · ') +
      '</footer>' +

      ((s.history || []).length
        ? '<details class="ltc-hist"><summary>History</summary>' +
          (s.history || []).slice().reverse().slice(0, 8).map(function (h) {
            return '<div>' + fmtShort(h.at) + ' · ' + esc(h.by) + ' · ' + esc(h.action) +
              (h.detail ? ' (' + esc(h.detail) + ')' : '') + '</div>';
          }).join('') + '</details>'
        : '') +
      '</div>';

    $$('[data-fn]', el).forEach(function (b) {
      b.addEventListener('click', function () {
        const m = b.dataset.fn.match(/^(\w+)\((?:'([^']*)')?\)$/);
        if (m && typeof window[m[1]] === 'function') window[m[1]](m[2]);
      });
    });
    const n = $('[data-act="nudge"]', el);
    if (n) n.addEventListener('click', function () { if (window.ltcNudge) window.ltcNudge(); });
  }


  /* ═══════════════════════════════════════════════════════════════════════
     3 · EMAIL COMMUNITY
     ═══════════════════════════════════════════════════════════════════════
     Measured before: NINE settings controls — To, CC, Signed by, Automatic
     Friday send, Client names, Caregiver names, Header line, Tier, Standing
     note — plus Skip and Save, all stacked ABOVE the thing you came for.
     The email itself started below the fold.

     That is an inversion, not clutter: the configuration is set once per
     community and then almost never touched, while the draft is read and
     edited every single week.

     So the draft comes first and the settings go behind a disclosure, with
     a one-line summary of what they currently say — which is what someone
     actually needs to know before pressing send ("who is this going to, and
     is it signed by the right person").

     Nothing is removed and nothing is reimplemented. _ecSettingsHtml() is
     the application's own markup, placed inside a <details>, so every field
     keeps its id and stays in the DOM whether the panel is open or shut —
     which matters, because saveEmailComm() and _ecCollect() read #ec-to,
     #ec-cc, #ec-csm and #ec-header by id. A disclosure that unmounted its
     children would have silently saved empty settings.
     ───────────────────────────────────────────────────────────────────── */

  function ecSettingsSummary() {
    const sel = A().ecSelected;
    const data = A().data;
    const d = (((data && data.shared && data.shared.communities) || {})[sel]) || {};
    const e = d.email || {};
    const to = (e.to || []).filter(Boolean);
    const today = new Date().toISOString().slice(0, 10);
    const skipping = e.skipUntil && e.skipUntil >= today;
    const prof = (A().profiles || []).find(function (p) { return p.id === e.csmId; });
    const bits = [];
    bits.push(to.length
      ? '<span>To <b>' + esc(to[0]) + '</b>' + (to.length > 1 ? ' and ' + (to.length - 1) + ' more' : '') + '</span>'
      : '<span class="warn">No recipient set — this cannot be sent yet</span>');
    if ((e.cc || []).length) bits.push('<span>cc ' + (e.cc || []).length + '</span>');
    if (prof) bits.push('<span>Signed by ' + esc(prof.name) + '</span>');
    bits.push('<span>' + (e.enabled ? 'Sends automatically at 2 PM Friday' : 'You send it yourself') + '</span>');
    if (skipping) bits.push('<span class="warn">Skipping this Friday</span>');
    return bits.join('<span class="sep">·</span>');
  }

  function renderEmailCommDetail() {
    const el = $('#ec-detail');
    const sel = A().ecSelected;
    if (!el || !sel) return;
    const settings = typeof window._ecSettingsHtml === 'function' ? window._ecSettingsHtml() : '';
    el.innerHTML =
      '<div id="ec-draft"></div>' +
      '<details class="ec-settings" id="ec-settings">' +
        '<summary><span class="ec-set-sum">' + ecSettingsSummary() + '</span>' +
        '<span class="ec-set-open">Settings</span></summary>' +
        settings +
      '</details>';
    if (typeof window.renderEmailDraft === 'function') window.renderEmailDraft();
  }

  // The list's Mine / All in my market was two full-width buttons stacked
  // over a search box. It is one choice between two options, so it is one
  // segmented control.
  function ecChrome() {
    const mine = $('#ec-f-mine');
    if (!mine || mine.dataset.rd) return;
    const host = mine.parentElement;
    host.classList.add('rd-seg');
    [mine, $('#ec-f-all')].forEach(function (b) {
      if (!b) return;
      b.dataset.rd = '1';
      b.removeAttribute('style');
      b.className = 'rd-seg-b';
    });
    const se = $('#ec-search');
    if (se) { se.className = 'rd-quietsearch'; se.removeAttribute('style'); se.placeholder = 'Search communities'; }
  }

  function renderEmailCommList() {
    const out = renderEmailCommList.original.apply(this, arguments);
    try {
      ecChrome();
      // Read the application's own filter state rather than sniffing the
      // class it just wrote — the class is both what marks the selection and
      // what the restyle overwrites, so reading it back gave neither button
      // a selected state.
      const f = A().ecOwnerFilter;
      // The application writes INLINE styles on the active button every
      // render (`background:#FF5A1F; color:#fff; flex:1`), so stripping them
      // once in ecChrome was not enough — the old orange came straight back
      // on the next list render, over the top of the segmented control.
      [['#ec-f-mine', f === 'mine'], ['#ec-f-all', f !== 'mine']].forEach(function (pair) {
        const b = $(pair[0]);
        if (!b) return;
        b.removeAttribute('style');
        b.className = 'rd-seg-b' + (pair[1] ? ' on' : '');
      });
    } catch (e) { console.error('[workflows] ec list:', e); }
    return out;
  }


  /* ═══════════════════════════════════════════════════════════════════════
     4 · WEEKLY CLIENT SCHEDULE EMAILS
     ═══════════════════════════════════════════════════════════════════════
     The brief is specific that this is a capability of the CLIENT, not a new
     screen, and that is the right call: a family wants their own week, and
     half of Tribute's clients are in a private residence with no community
     to be part of. So it lives in the client workspace — the preference and
     the state in Schedule, the record of what went out in Communication —
     and it reaches Home ONLY when it needs a person.

     The three preferences the brief names:
       Off        nothing is prepared and nothing is sent
       Draft      a draft is prepared each week; a person reviews and sends
       Automatic  it goes out on Friday unless someone stops it

     SCHEDULE-CHANGE DETECTION. Every send records a signature of the week it
     described — day, time and caregiver for each visit. If the week later
     differs from what the family was told, that is the thing worth
     surfacing, because the family is now holding a schedule that is wrong.
     It is the ONLY condition from this feature allowed onto Home.

     In local preview no mail is sent. The send is recorded in the shared
     document, written to the client's communication history and logged.
     ───────────────────────────────────────────────────────────────────── */

  /* AUTOMATIC IS BEHIND A FLAG, and this is the reason.

     A stored preference is not an automation. Setting a client to
     "Automatic" writes one field to a shared JSON document; it does not
     create a scheduled process, and nothing in the hub sends anything on a
     Friday. Showing "Sent on Friday at 2 PM unless you stop it" would have
     told a CSM that a family is being kept informed when nobody is sending
     anything at all — a silence that looks like success, which is the worst
     shape a defect can take in a product about keeping families informed.

     Flip this to true only when the delivery service in WEEKLY-EMAIL.md
     exists and has passed its readiness checks. Until then Automatic is
     visible, disabled, and honest about why; anything already stored as
     'auto' is treated as 'draft' and says so. */
  const WEEKLY_AUTOMATION_READY = false;

  const WEEKLY_MODES = [
    ['off', 'Off', 'Nothing is prepared or sent.'],
    ['draft', 'Draft weekly', 'A draft is ready each week for you to review and send.'],
    ['auto', 'Automatic',
      WEEKLY_AUTOMATION_READY
        ? 'Sent on Friday afternoon unless you stop it.'
        : 'The scheduled send service is not built. Until it is, this behaves like Draft weekly.']
  ];
  const autoLive = function () { return WEEKLY_AUTOMATION_READY; };

  /* ── Market time, and the signature ───────────────────────────────────────
     Two release gates, and they are the same gate underneath: a value that
     is supposed to identify a week must not change because of where the
     reader is sitting or what order a server happened to return rows in.

     TIMEZONE. The prototype asked the browser what day it was. A CSM in
     Boston working at 9pm sees `new Date().toISOString()` roll over to
     tomorrow, so "next Sunday" moves by a week at the wrong moment. And a
     Chicago client's family was being told their times were Eastern.
     Operational time is a property of the MARKET, never of the browser.

     SIGNATURE. Row order, "8:00am" vs "08:00 AM", a duplicated upstream
     record and a trailing space all produced different signatures for the
     same week, which would raise "the family was told a different week" for
     a week that had not changed. Normalise, dedupe, sort, then hash.
     ───────────────────────────────────────────────────────────────────── */

  // Production uses THIRTEEN market strings, not three — measured against the
  // live book, which the synthetic three-market fixture could never show:
  // Boston, MetroWest Boston, North of Boston, South of Boston, Massachusetts,
  // Baltimore, Annapolis, Bethesda, Maryland, Chicago, Illinois, and two
  // outside the three markets entirely (Northern New Jersey, Northern
  // Virginia). All of them happen to land correctly today, but eight did so
  // only by falling through to the default — so an unrecognised market is now
  // REPORTED rather than silently assumed Eastern. A Chicago-area name nobody
  // listed ("North Shore", "Naperville") is the case that would go wrong.
  const MARKET_TZ = {
    'massachusetts': 'America/New_York', 'ma': 'America/New_York',
    'boston': 'America/New_York', 'metrowest boston': 'America/New_York',
    'north of boston': 'America/New_York', 'south of boston': 'America/New_York',
    'maryland': 'America/New_York', 'md': 'America/New_York',
    'baltimore': 'America/New_York', 'annapolis': 'America/New_York',
    'bethesda': 'America/New_York',
    'northern virginia': 'America/New_York', 'northern new jersey': 'America/New_York',
    'chicago': 'America/Chicago', 'chi': 'America/Chicago', 'illinois': 'America/Chicago'
  };
  const DEFAULT_TZ = 'America/New_York';

  function tzFor(c) {
    const keys = [c && c.market, c && c.city, (A().profile || {}).market, A().selectedHub];
    for (let i = 0; i < keys.length; i++) {
      const k = String(keys[i] || '').trim().toLowerCase();
      if (MARKET_TZ[k]) return MARKET_TZ[k];
    }
    const named = String((c && c.market) || '').trim();
    if (named && window.TributeApp && window.TributeApp.noteAnomaly) {
      window.TributeApp.noteAnomaly('unknown-market-timezone', 'weekly.tzFor',
        named + ' \u2014 defaulting to ' + DEFAULT_TZ);
    }
    return DEFAULT_TZ;
  }

  // Civil-date arithmetic only. Date.UTC has no DST, so adding days to a
  // YYYY-MM-DD string this way is correct across both transitions; doing it
  // with a local Date is not.
  function civil(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function civilAdd(iso, days) {
    const c = civil(iso);
    if (!c) return iso;
    return new Date(Date.UTC(c.y, c.m - 1, c.d + days)).toISOString().slice(0, 10);
  }
  function civilDow(iso) {
    const c = civil(iso);
    return c ? new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay() : 0;
  }
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function todayInZone(tz) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  // The Sunday that starts next week, in the market's own time.
  function nextSundayIn(tz) {
    const today = todayInZone(tz || DEFAULT_TZ);
    const dow = civilDow(today);
    return civilAdd(today, (7 - dow) % 7 || 7);
  }
  function nextSundayFor(c) { return nextSundayIn(tzFor(c)); }
  // Kept for callers that have no client in hand; the market-aware form is
  // the one every client-facing path uses.
  function nextSunday() { return nextSundayIn(DEFAULT_TZ); }

  function weekLabelFor(iso) {
    const c = civil(iso);
    if (!c) return '';
    return 'Week of ' + new Date(Date.UTC(c.y, c.m - 1, c.d))
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  }

  /* ── Normalisation ────────────────────────────────────────────────────── */

  // "8:00am", "08:00 AM", "8am", "20:00" → minutes past midnight.
  function minutesOf(s) {
    const t = String(s || '').trim().toLowerCase().replace(/\s+/g, '');
    const m = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(t);
    if (!m) return null;
    let h = +m[1];
    const min = m[2] ? +m[2] : 0;
    if (h > 23 || min > 59) return null;
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }
  const pad2 = (n) => (n < 10 ? '0' : '') + n;
  const hhmm = (mins) => pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60);

  // Any dash, any spacing. Returns a canonical "HH:MM-HH:MM", or the
  // collapsed lowercase original when the value is not a range at all
  // ("Live-in", "24 hours") — which is still deterministic.
  function normTime(s) {
    const raw = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    const parts = raw.split(/\s*[‐-―−-]\s*/);
    if (parts.length === 2) {
      const a = minutesOf(parts[0]), b = minutesOf(parts[1]);
      if (a !== null && b !== null) return hhmm(a) + '-' + hhmm(b);
    }
    const one = minutesOf(raw);
    if (one !== null) return hhmm(one);
    return raw.toLowerCase();
  }
  // Case and spacing are not a schedule change. "Rosa  M." and "rosa m."
  // are the same caregiver; a different caregiver is a different string.
  function normWho(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function normDay(v) {
    const c = civil(v && (v.day || v.date));
    if (c) return pad2(c.y) + '-' + pad2(c.m) + '-' + pad2(c.d);
    // No date: fall back to the weekday name so a label-only feed still
    // sorts and compares deterministically.
    const nm = String((v && (v.dayLabel || v.day)) || '').trim().toLowerCase();
    const i = DAY_NAMES.findIndex(function (d) { return d.toLowerCase() === nm; });
    return i >= 0 ? 'dow-' + i : 'unknown-' + nm;
  }

  function normalizeVisits(visits) {
    const rows = (visits || []).map(function (v) {
      return { day: normDay(v), time: normTime(v && v.time), who: normWho(v && v.who),
               open: !!(v && v.open) };
    });
    // Deduplicate identical upstream records. Two rows describing the same
    // visit are one visit, and an upstream repeat must not read as a change.
    const seen = Object.create(null), out = [];
    rows.forEach(function (r) {
      const k = r.day + '|' + r.time + '|' + r.who + '|' + (r.open ? '1' : '0');
      if (seen[k]) return;
      seen[k] = 1;
      out.push(r);
    });
    // Stable, total ordering on the normalised fields.
    out.sort(function (a, b) {
      return a.day.localeCompare(b.day) || a.time.localeCompare(b.time) ||
             a.who.localeCompare(b.who) || (a.open === b.open ? 0 : a.open ? 1 : -1);
    });
    return out;
  }

  // Versioned, so a later change to the normaliser is visible rather than
  // silently reclassifying every stored week as "changed".
  const SIG_VERSION = 'v2';
  function weekSig(visits) {
    return SIG_VERSION + ':' + normalizeVisits(visits).map(function (r) {
      return r.day + '|' + r.time + '|' + r.who + (r.open ? '|open' : '');
    }).join(';');
  }

  // Same shape as DATA.shared.mdCadence: a shared-document key, written
  // through the application's own queueSave, never a new storage mechanism.
  function weeklyStore() {
    const data = A().data;
    if (!data) return {};
    data.shared = data.shared || {};
    data.shared.clientWeekly = data.shared.clientWeekly || {};
    return data.shared.clientWeekly;
  }
  function weeklyFor(cid) { return weeklyStore()[cid] || {}; }
  function weeklySave(cid, patch) {
    if (!weeklyAvailable()) return {};
    const st = weeklyStore();
    st[cid] = Object.assign({}, st[cid] || {}, patch);
    if (typeof window.queueSave === 'function') window.queueSave();
    return st[cid];
  }

  // `client_week` does not exist in production (confirmed: zero occurrences
  // in vivProxy.js). In V2 the feature is visible and inert rather than
  // fabricating a schedule or quietly reading some other endpoint.
  function weeklyAvailable() {
    const App = window.TributeApp;
    if (App && App.environment === 'v2-preview') return App.canWrite && App.canWrite('weekly_schedule');
    return true;   // local preview has a synthetic endpoint
  }

  const _weekCache = {};
  async function clientWeek(cid, week) {
    if (!weeklyAvailable()) {
      return { cid: cid, weekStart: week, visits: [], unavailable: true,
               reason: 'client_week is not built in production yet' };
    }
    const key = cid + '@' + week;
    if (_weekCache[key]) return _weekCache[key];
    const base = (A().vivProxy || '') + '?endpoint=client_week&cid=' + encodeURIComponent(cid) + '&week=' + week;
    try {
      const h = typeof window.dataHeaders === 'function' ? await window.dataHeaders() : {};
      const r = await fetch(base, { headers: h });
      const ct = r.headers.get('content-type') || '';
      // A non-JSON answer means the request never reached the mock layer.
      // Say so loudly rather than returning an empty week that reads as
      // "this client has no visits".
      if (ct.indexOf('json') < 0) throw new Error('client_week did not return JSON (got ' + (ct || 'nothing') + ')');
      const j = await r.json();
      _weekCache[key] = j;
      return j;
    } catch (e) {
      return { cid: cid, weekStart: week, visits: [], error: String(e.message || e) };
    }
  }

  /* The state of one client's weekly email, as a person would describe it. */
  function weeklyState(c, wk) {
    const s = weeklyFor(c.id);
    const stored = s.mode || 'off';
    // What is stored, and what actually happens, are two different things
    // while the delivery service does not exist.
    const mode = (stored === 'auto' && !autoLive()) ? 'draft' : stored;
    const pending = stored === 'auto' && !autoLive();
    const to = s.to || c.contactEmail || '';
    const week = nextSundayFor(c);
    const sent = s.lastSentWeek === week;
    const changed = !!(sent && wk && s.lastSig && weekSig(wk.visits) !== s.lastSig);
    return {
      mode: mode, stored: stored, pendingAutomation: pending,
      to: to, week: week, sent: sent, changed: changed, tz: tzFor(c),
      lastSentAt: s.lastSentAt, lastSentBy: s.lastSentBy,
      history: s.history || [],
      needsAttention: mode !== 'off' && (changed || !to)
    };
  }

  /* ── The email itself ─────────────────────────────────────────────────── */
  function weeklyEmailHtml(c, wk, st) {
    const first = String(c.name || '').split(' ')[0];
    const rows = (wk.visits || []).length
      ? (wk.visits || []).map(function (v) {
          return '<tr><td>' + esc(v.dayLabel) + '</td><td>' + esc(v.time) + '</td><td>' + esc(v.who) + '</td></tr>';
        }).join('')
      : '<tr><td colspan="3" class="q">No Tribute visits are scheduled next week.</td></tr>';
    const prof = A().profile || {};
    return '<div class="wk-mail">' +
      '<div class="wk-mail-brand">Tribute<span>.</span></div>' +
      '<h4>' + esc(first) + '’s week with Tribute</h4>' +
      '<p class="wk-mail-sub">' + esc(wk.weekLabel || '') + '</p>' +
      '<p>Hello,</p>' +
      '<p>Here is ' + esc(first) + '’s Tribute schedule for next week. Please call me with anything at all — a change, a question, or just to talk something through.</p>' +
      '<table class="wk-mail-t">' + rows + '</table>' +
      '<p class="wk-mail-sign">Warmly,<br><b>' + esc(prof.name || '') + '</b><br>' +
      '<span>Client Solutions Manager · Tribute Home Care</span></p>' +
      // No timezone sentence. The times ARE the client's own local times,
      // and the old line asserted Eastern over a Chicago schedule.
      '<p class="wk-mail-foot"><i>Remarkable, personified.</i> · ' +
      'Schedules can change; we will let you know.</p></div>';
  }

  async function weeklyPreview(c) {
    const week = nextSundayFor(c);
    const wk = await clientWeek(c.id, week);
    const st = weeklyState(c, wk);
    const body =
      '<div class="wk-prev-to"><span>To</span><b>' + (st.to ? esc(st.to) : '<i class="warn">no family email on file</i>') + '</b></div>' +
      '<div class="wk-prev-to"><span>Subject</span><b>' + esc(String(c.name || '').split(' ')[0]) +
      '’s Tribute schedule — ' + esc(wk.weekLabel || '') + '</b></div>' +
      weeklyEmailHtml(c, wk, st);
    const R = window.TributeRedesign;
    if (!R || !R.dialog) return;
    const go = await R.dialog({
      title: 'Weekly schedule email',
      html: body,
      ok: st.to ? 'Send now' : '',
      cancel: 'Close',
      wide: true
    });
    if (go && st.to) weeklySend(c, wk);
  }

  /* The send. Nothing leaves the machine: the harness intercepts mail, and
     this records what WOULD have gone, where, and the exact week it
     described, so change detection has something true to compare against. */
  function weeklySend(c, wk) {
    const st = weeklyState(c, wk);
    const who = (A().profile || {}).name || 'unknown';
    const entry = {
      at: new Date().toISOString(), by: who, to: st.to,
      week: st.week, weekLabel: wk.weekLabel || '',
      visits: (wk.visits || []).length, sig: weekSig(wk.visits)
    };
    const prev = weeklyFor(c.id);
    weeklySave(c.id, {
      lastSentAt: entry.at, lastSentBy: who, lastSentWeek: st.week, lastSig: entry.sig,
      history: [entry].concat(prev.history || []).slice(0, 20)
    });
    // The client's own communication record, through the application's data
    // rather than a parallel log.
    try {
      const data = A().data, pid = (A().profile || {}).id;
      if (data && pid && data.profiles && data.profiles[pid]) {
        data.profiles[pid].touchpoints = data.profiles[pid].touchpoints || [];
        data.profiles[pid].touchpoints.unshift({
          id: 'wk' + Date.now(), clientId: c.id, date: entry.at.slice(0, 10),
          type: 'Email', by: who, note: 'Weekly schedule email — ' + entry.weekLabel +
            ' (' + entry.visits + ' visit' + (entry.visits === 1 ? '' : 's') + ')'
        });
        if (typeof window.queueSave === 'function') window.queueSave();
      }
    } catch (e) { console.error('[workflows] weekly touchpoint:', e); }
    console.log('[' + ((window.TributeApp && window.TributeApp.environment) || 'local') +
      '] weekly schedule email simulated \u2014 nothing was sent', entry);
    if (typeof window.showToast === 'function') {
      window.showToast('Weekly email recorded — nothing was actually sent in local preview');
    }
    const R = window.TributeRedesign;
    if (R && R.renderWorkspace) R.renderWorkspace();
  }

  /* ── The Schedule-area block ──────────────────────────────────────────── */
  function weeklyBlock(c) {
    if (!weeklyAvailable()) {
      return '<div class="wk-block"><div class="wk-head">' +
        '<span class="wk-mode">Not yet available</span></div>' +
        '<p class="rd-ws-quiet">The weekly schedule email is being prepared for V2. ' +
        'The schedule it needs is not built on the server yet, so nothing is shown ' +
        'here and no preference is stored.</p></div>';
    }
    const st = weeklyState(c, _weekCache[c.id + '@' + nextSundayFor(c)]);
    const mode = st.mode;
    const label = st.pendingAutomation
      ? 'Draft weekly'
      : (WEEKLY_MODES.find(function (m) { return m[0] === mode; }) || WEEKLY_MODES[0])[1];
    let line;
    if (mode === 'off') line = '<p class="rd-ws-quiet">Not set up. The family gets no weekly schedule from us.</p>';
    else if (st.changed) line = '<p class="wk-alert">The schedule has changed since the family was told. They are holding a week that is now wrong.</p>';
    else if (!st.to) line = '<p class="wk-alert">No family email on file, so this cannot go out.</p>';
    else if (st.sent) line = '<p class="rd-ws-plain">Sent ' + fmtShort(st.lastSentAt) + ' to ' + esc(st.to) + '.</p>';
    else line = '<p class="rd-ws-plain">' +
      (mode === 'auto' ? 'Goes out Friday afternoon' : 'Draft ready Friday') +
      ' to ' + esc(st.to) + '.</p>';
    // Say plainly that the stored choice is not doing what its name says.
    const note = st.pendingAutomation
      ? '<p class="wk-note">Automatic was chosen for this client, but the scheduled send service is not built yet, ' +
        'so nothing goes out on its own. Send it from here each week until it is.</p>'
      : '';
    return '<div class="wk-block">' +
      '<div class="wk-head"><span class="wk-mode">' + esc(label) + '</span>' +
      '<button type="button" class="rd-linkbtn" data-wk="mode">Change</button></div>' +
      line + note +
      (mode === 'off' ? '' :
        '<div class="wk-acts">' +
          '<button type="button" class="btn btn-sm btn-o" data-wk="preview">Preview the email</button>' +
          (st.to ? '<button type="button" class="btn btn-sm btn-o" data-wk="send">Send now</button>' : '') +
        '</div>') +
      '</div>';
  }

  async function weeklyChooseMode(c) {
    const cur = weeklyFor(c.id).mode || 'off';
    const R = window.TributeRedesign;
    if (!R || !R.dialog) return;
    const html = '<div class="wk-modes">' + WEEKLY_MODES.map(function (m) {
      // Automatic is shown rather than hidden, because a CSM should know the
      // option is coming — but it cannot be selected, and the reason is on
      // the row rather than in a tooltip.
      const off = m[0] === 'auto' && !autoLive();
      return '<label class="wk-mode-opt' + (off ? ' disabled' : '') + '">' +
        '<input type="radio" name="wkmode" value="' + m[0] + '"' +
        (cur === m[0] && !off ? ' checked' : '') + (off ? ' disabled' : '') + '>' +
        '<span><b>' + esc(m[1]) + (off ? ' <em>not available yet</em>' : '') + '</b>' +
        esc(m[2]) + '</span></label>';
    }).join('') + '</div>' +
    '<label class="wk-to"><span>Family email</span>' +
    '<input type="email" id="wk-to" value="' + esc(weeklyFor(c.id).to || c.contactEmail || '') +
    '" placeholder="family@example.com"></label>';
    const okd = await R.dialog({
      title: 'Weekly schedule email for ' + (c.name || ''),
      html: html, ok: 'Save', cancel: 'Cancel'
    });
    if (!okd) return;
    const picked = document.querySelector('input[name="wkmode"]:checked');
    const to = document.getElementById('wk-to');
    let mode = picked ? picked.value : cur;
    // Belt and braces: a disabled radio cannot be chosen, but nothing should
    // be able to store 'auto' while the delivery service does not exist.
    if (mode === 'auto' && !autoLive()) mode = 'draft';
    weeklySave(c.id, { mode: mode, to: to ? to.value.trim() : '' });
    if (R.renderWorkspace) R.renderWorkspace();
  }

  /* ── Communication-area history ───────────────────────────────────────── */
  function weeklyHistoryBlock(c) {
    const h = weeklyFor(c.id).history || [];
    if (!h.length) return '';
    return h.slice(0, 5).map(function (e) {
      return '<div class="rd-ws-ev"><span class="d">' + fmtShort(e.at) + '</span>' +
        '<span class="t">Weekly schedule · ' + esc(e.weekLabel) + '</span>' +
        '<span class="m">' + esc(e.to) + '</span></div>';
    }).join('');
  }

  /* ── Home ─────────────────────────────────────────────────────────────── */
  // One condition only: a family is holding a schedule that has since
  // changed. Everything else about this feature stays inside the client.
  function weeklySignal() {
    if (!weeklyAvailable()) return null;
    try {
      const R = window.TributeRedesign;
      const cs = (R && R.caseload) ? R.caseload() : [];
      // A dual-market caseload spans two timezones, so "next week" is
      // computed per client rather than once for the whole list.
      const stale = cs.filter(function (c) {
        const s = weeklyFor(c.id);
        const week = nextSundayFor(c);
        if (!s.mode || s.mode === 'off' || s.lastSentWeek !== week || !s.lastSig) return false;
        const wk = _weekCache[c.id + '@' + week];
        return wk && weekSig(wk.visits) !== s.lastSig;
      });
      if (!stale.length) return null;
      return {
        n: stale.length, label: 'Schedules changed after sending',
        sub: stale.length === 1 ? stale[0].name + ' was told a different week' : 'Families were told a different week',
        tone: 'warn', go: 'clients'
      };
    } catch (e) { return null; }
  }

  // Warm the week cache for the caseload so change detection and the Home
  // signal have something to compare, without blocking any render.
  function weeklyWarm() {
    if (!weeklyAvailable()) return;
    try {
      const R = window.TributeRedesign;
      const cs = (R && R.caseload) ? R.caseload() : [];
      cs.filter(function (c) {
        const s = weeklyFor(c.id);
        return s.mode && s.mode !== 'off';
      }).slice(0, 40).forEach(function (c) { clientWeek(c.id, nextSundayFor(c)); });
    } catch (e) {}
  }

  /* ═══════════════════════════════════════════════════════════════════════
     5 · HOME — the two things CSS could not reach
     ═══════════════════════════════════════════════════════════════════════ */

  // 1. A zero in alarm red is not a warning, it is the absence of one.
  //    The application colours every stat by category — High Need is always
  //    red, In Onboarding always purple — so a clean caseload rendered a row
  //    of coloured noughts. A zero is ink.
  // 2. #home-caseload's inner tiles carry tinted BACKGROUNDS rather than
  //    borders, so the stylesheet's border rules never touched them: six
  //    coloured pills repeating the row directly above.
  function tidyHomeStats() {
    const page = $('#page-home');
    if (!page || !page.classList.contains('active')) return;
    $$('#rd-s-case .sv, #rd-s-case .snum, #rd-s-case .num, #home-caseload .sv, #home-caseload .snum', page)
      .forEach(function (el) {
        const z = (el.textContent || '').trim() === '0';
        if (z && !el.dataset.rdZero) { el.dataset.rdZero = '1'; el.style.setProperty('color', 'var(--ink-3)', 'important'); }
        else if (!z && el.dataset.rdZero) { delete el.dataset.rdZero; el.style.removeProperty('color'); }
      });
    $$('#home-caseload div[style*="background"]', page).forEach(function (el) {
      if (el.dataset.rdFlat) return;
      el.dataset.rdFlat = '1';
      el.style.setProperty('background', 'none', 'important');
      el.style.setProperty('border-radius', '0', 'important');
    });
    // 3. Six numbers in six different colours. The application colours each
    //    by category, so "1 High touch" is red whether or not anything is
    //    wrong with it. Colour goes back to meaning something: a number is
    //    ink unless it is a problem — an overdue visit, or compliance under
    //    100%. Nothing is hidden; the numbers are all still there.
    //    The numbers carry no class at all — they are bare divs with an
    //    inline colour — so they are found by shape, not by selector.
    const strip = document.getElementById('home-caseload');
    const nums = strip ? $$('*', strip).filter(function (e) {
      return e.children.length === 0 && /^[\d.]+%?$/.test((e.textContent || '').trim());
    }) : [];
    nums.forEach(function (el) {
      const label = (el.parentElement ? el.parentElement.textContent : '').toLowerCase();
      const n = parseFloat((el.textContent || '').replace('%', ''));
      const bad = (/overdue/.test(label) && n > 0) || (/compliance/.test(label) && n < 100);
      // The application's colour is INLINE, so removing it does not restore
      // the red — it falls back to inherited ink. Set it explicitly.
      if (bad) {
        if (el.dataset.rdTone !== 'bad') { el.dataset.rdTone = 'bad'; el.style.setProperty('color', 'var(--bad)', 'important'); }
        return;
      }
      if (el.dataset.rdTone === 'ink') return;
      el.dataset.rdTone = 'ink';
      el.style.setProperty('color', 'var(--ink)', 'important');
    });
  }


  /* ═══════════════════════════════════════════════════════════════════════
     6 · CLIENT IDENTITY — the LTC join
     ═══════════════════════════════════════════════════════════════════════
     LTC records are joined to clients by a case-insensitive match on the
     client's NAME. The Viv sync overwrites `name` on every run, so a client
     renamed in Viv silently loses their LTC record: no error, the panel just
     reads "No record on file", and the next weekly submission for that
     client does not exist.

     The surprising part, found by reading the write path rather than the
     read path: `openLTCFromClient(clientId, clientName)` is ALREADY HANDED
     the stable id and throws it away. `saveLTCRecord` stores `clientName`
     only. So most of the fix is to stop discarding what is already there.

     What this layer does:
       1. captures `clientId` when a record is created from a client
       2. joins on `clientId` first
       3. falls back to a name match ONLY for records with no id, and marks
          those matches as legacy rather than presenting them as certain
       4. refuses to attach a legacy record when the name is ambiguous —
          two clients with the same name get a flag, not a guess

     A rename must not disconnect a client's operational history, and a
     coincidence of names must not invent one.
     ═══════════════════════════════════════════════════════════════════════ */

  const normName = function (s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[.,'’\-]/g, '')   // punctuation is not identity
      .replace(/\s+/g, ' ')
      .trim();
  };

  function allLtcRecords() {
    try {
      return (typeof window.getLTC === 'function' ? window.getLTC()
        : (((A().data || {}).shared || {}).ltc)) || [];
    } catch (e) { return []; }
  }

  /* Returns { linked, legacy, ambiguous } for one client.
       linked     joined on a stable id — certain
       legacy     joined on name, no id present — probably right, flagged
       ambiguous  a name match that more than one client would also match */
  function ltcForClient(c) {
    const out = { linked: [], legacy: [], ambiguous: [] };
    if (!c) return out;
    const recs = allLtcRecords();
    const cid = c.id, vivId = c.vivId != null ? String(c.vivId) : '';
    const want = normName(c.name);
    if (!want && !cid) return out;

    // How many clients in the whole book would answer to this name? More
    // than one, and a name match is a coin toss rather than a join.
    let sameName = 0;
    try {
      (A().myClients ? A().myClients() : []).forEach(function (x) {
        if (normName(x.name) === want) sameName++;
      });
    } catch (e) { sameName = 1; }

    recs.forEach(function (r) {
      const rid = r.clientId != null ? String(r.clientId) : '';
      if (rid) {
        if (rid === String(cid) || (vivId && (rid === vivId || rid === 'viv' + vivId))) out.linked.push(r);
        return;                       // a record WITH an id never name-matches
      }
      if (!want || normName(r.clientName) !== want) return;
      (sameName > 1 ? out.ambiguous : out.legacy).push(r);
    });
    return out;
  }

  /* Capture the id the application already has in hand. */
  function installLtcIdentity() {
    if (typeof window.openLTCFromClient === 'function' && !window.openLTCFromClient.__rd) {
      const orig = window.openLTCFromClient;
      const wrapped = function (clientId, clientName) {
        const r = orig.apply(this, arguments);
        try {
          const form = document.getElementById('ltc-client-name');
          if (form) {
            let h = document.getElementById('ltc-client-id');
            if (!h) {
              h = document.createElement('input');
              h.type = 'hidden'; h.id = 'ltc-client-id';
              form.parentElement.appendChild(h);
            }
            h.value = clientId || '';
          }
        } catch (e) { console.error('[workflows] ltc id capture:', e); }
        return r;
      };
      wrapped.__rd = true; wrapped.original = orig;
      window.openLTCFromClient = wrapped;
    }

    if (typeof window.saveLTCRecord === 'function' && !window.saveLTCRecord.__rd) {
      const orig = window.saveLTCRecord;
      const wrapped = function () {
        const idEl = document.getElementById('ltc-client-id');
        const cid = idEl ? idEl.value : '';
        const editing = (document.getElementById('ltc-edit-id') || {}).value || '';
        const r = orig.apply(this, arguments);
        // The application rebuilds the record wholesale, so the id is
        // written back onto the saved row rather than into its builder.
        try {
          if (cid) {
            const recs = allLtcRecords();
            const row = editing
              ? recs.find(function (x) { return String(x.id) === String(editing); })
              : recs[recs.length - 1];
            if (row && !row.clientId) {
              row.clientId = cid;
              if (typeof window.setLTC === 'function') window.setLTC(recs);
            }
          }
          if (idEl) idEl.value = '';
        } catch (e) { console.error('[workflows] ltc id save:', e); }
        return r;
      };
      wrapped.__rd = true; wrapped.original = orig;
      window.saveLTCRecord = wrapped;
    }
  }

  /* A one-shot report, for deciding whether a migration is worth running.
     Run `TributeWorkflows.ltcIdentity.audit()` in the console. */
  function ltcIdentityAudit(clientsIn) {
    const recs = allLtcRecords();
    // The WHOLE book, not the signed-in CSM's pocket. Run as a CSM, the
    // audit reported eight of nine records as "no matching client" simply
    // because those clients belong to someone else — which would have read
    // as a catastrophe and is only a scoping mistake.
    let clients = clientsIn || [];
    if (!clients.length) {
      try {
        clients = (typeof window.getAllHubClients === 'function' && window.getAllHubClients()) || [];
      } catch (e) {}
    }
    if (!clients.length) clients = (A().myClients ? A().myClients() : []);
    const byName = {};
    clients.forEach(function (c) {
      const k = normName(c.name);
      (byName[k] = byName[k] || []).push(c);
    });
    const withId = recs.filter(function (r) { return r.clientId; });
    const noId = recs.filter(function (r) { return !r.clientId; });
    const matchable = noId.filter(function (r) { return (byName[normName(r.clientName)] || []).length === 1; });
    const ambiguous = noId.filter(function (r) { return (byName[normName(r.clientName)] || []).length > 1; });
    const orphan = noId.filter(function (r) { return !(byName[normName(r.clientName)] || []).length; });
    const staleName = withId.filter(function (r) {
      const c = clients.find(function (x) {
        return String(x.id) === String(r.clientId) || 'viv' + x.vivId === String(r.clientId);
      });
      return c && normName(c.name) !== normName(r.clientName);
    });
    return {
      total: recs.length, withStableId: withId.length, withoutId: noId.length,
      migratableNow: matchable.length, ambiguousName: ambiguous.length,
      noMatchingClient: orphan.length,
      linkedButNameDrifted: staleName.length,
      clientsConsidered: clients.length,
      note: 'Run against production data, signed in as an admin or manager so ' +
            'clientsConsidered covers the whole book. migratableNow is the ' +
            'back-fill; ambiguousName and noMatchingClient must be resolved by hand.'
    };
  }


  /* ═══════════════════════════════════════════════════════════════════════
     7 · OWNERSHIP — who does this row belong to
     ═══════════════════════════════════════════════════════════════════════
     The LTC board's "Mine" filter compared the signed-in CSM's FIRST NAME
     against the row's owner:

       function _ltcMineName(){ return (P && P.name ? P.name.split(' ')[0] : '').toLowerCase(); }
       if (_ltcFilter === 'mine' && String(r.csm||'').toLowerCase() !== me) return false;

     It works today, and only by coincidence: an LTC record stores `csm` as a
     PROFILE ID (the select's option values are `p.id`), and every one of the
     fifteen profile ids currently happens to equal its owner's lowercased
     first name. Nothing enforces that. The first CSM hired who shares a first
     name with another — or the first profile id that is a short form, like
     `jen` for "Jennifer" — and a CSM sees somebody else's submission queue,
     or an empty one.

     Maryland fails the other way: it compares FULL DISPLAY NAMES against a
     Viv-sourced string, and the hub already keeps a VIV_NAMES alias map
     precisely because Viv spells Emily "Willson".

     So ownership resolves to a stable profile id, in this order:
       1. the profile id itself
       2. the UPN, through DATA.shared.settings.loginMap
       3. an exact canonical full name, through VIV_NAMES  (legacy fallback)
     A first name is never a key. An owner that resolves to nothing is NOT
     silently treated as mine.
     ═══════════════════════════════════════════════════════════════════════ */

  const canon = function (s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/[.,'’\-]/g, '').replace(/\s+/g, ' ').trim();
  };

  let _ownerIndex = null, _ownerIndexKey = '';
  function ownerIndex() {
    const profiles = A().profiles || [];
    const map = A().vivNames || {};
    const login = (((A().data || {}).shared || {}).settings || {}).loginMap || {};
    const key = profiles.length + ':' + Object.keys(map).length + ':' + Object.keys(login).length;
    if (_ownerIndex && _ownerIndexKey === key) return _ownerIndex;

    const byId = Object.create(null);     // 1. the stable key
    const byUpn = Object.create(null);    // 2. authoritative sign-in identity
    const byName = Object.create(null);   // 3. canonical full name, legacy only
    const ambiguousName = Object.create(null);
    const firstNameCount = Object.create(null);

    profiles.forEach(function (p) {
      const f = canon(String(p && p.name || '').split(' ')[0]);
      if (f) firstNameCount[f] = (firstNameCount[f] || 0) + 1;
    });
    profiles.forEach(function (p) {
      if (!p || !p.id) return;
      byId[String(p.id).toLowerCase()] = p.id;
      const names = [p.name].concat(map[p.id] || []);
      names.filter(Boolean).forEach(function (nm) {
        const k = canon(nm);
        if (!k) return;
        // A full name that two profiles answer to is not an identity.
        if (byName[k] && byName[k] !== p.id) ambiguousName[k] = true;
        else byName[k] = p.id;
      });
    });
    Object.keys(login).forEach(function (upn) {
      const pid = login[upn];
      if (pid) byUpn[String(upn).toLowerCase()] = pid;
    });

    _ownerIndexKey = key;
    _ownerIndex = { byId: byId, byUpn: byUpn, byName: byName,
                    ambiguousName: ambiguousName, firstNameCount: firstNameCount };
    return _ownerIndex;
  }

  /* Resolve any stored owner value to a profile id.
     Returns { id, via } — via is 'id' | 'upn' | 'name' | null.
     A FIRST NAME never resolves; that is the whole point. */
  function resolveOwner(value) {
    const raw = String(value == null ? '' : value).trim();
    if (!raw) return { id: null, via: null };
    const ix = ownerIndex();

    // The profile id is the canonical key and always resolves. An earlier
    // version refused it when two profiles shared that first name, on the
    // grounds that `julia` is indistinguishable from the name "Julia" — and
    // that was the wrong trade: it emptied a CSM's own queue to guard
    // against a rarer mis-attribution. The guard that matters is below —
    // a bare token that is NOT a profile id never resolves at all.
    const asId = raw.toLowerCase();
    if (ix.byId[asId]) return { id: ix.byId[asId], via: 'id' };

    if (raw.indexOf('@') > -1) {
      const upn = asId;
      if (ix.byUpn[upn]) return { id: ix.byUpn[upn], via: 'upn' };
      // A Tribute address whose local part is a profile id is still the
      // profile; anything else is not guessed at.
      const local = upn.split('@')[0];
      if (ix.byId[local]) return { id: ix.byId[local], via: 'upn' };
    }

    const nm = canon(raw);
    // Only a FULL name resolves. One token is a first name, and a first name
    // is not an identity even when it happens to match a profile id.
    if (nm && nm.indexOf(' ') > -1 && !ix.ambiguousName[nm] && ix.byName[nm]) {
      return { id: ix.byName[nm], via: 'name' };
    }
    return { id: null, via: null };
  }

  function myProfileId() {
    const p = A().profile;
    return p && p.id ? p.id : null;
  }

  /* Is this row mine? Managers, directors and CSCs are deliberately NOT
     given everything by this predicate — "Mine" means mine for them too.
     Their wider view is the "All" view, which is a different question and
     is already scoped by the application's own permission rules. */
  function ownedByMe(value) {
    const me = myProfileId();
    if (!me) return false;
    return resolveOwner(value).id === me;
  }

  /* The one case this design cannot separate: a profile id that is also a
     first name two people share. `julia` resolves to the profile id, which
     is right for every record the hub created — but a Viv-sourced row
     carrying the bare display name "Julia" would resolve the same way. The
     durable fix is for rows to carry the id, which hub-created records
     already do; until then this names the exposure rather than hiding it. */
  function ownershipRisks() {
    const ix = ownerIndex();
    const out = [];
    (A().profiles || []).forEach(function (p) {
      const f = canon(String(p.name || '').split(' ')[0]);
      if ((ix.firstNameCount[f] || 0) > 1 && ix.byId[f]) {
        out.push({ firstName: f, resolvesTo: ix.byId[f],
                   note: 'a bare "' + f + '" resolves to this profile id; other ' +
                         (ix.firstNameCount[f] - 1) + ' profile(s) share the first name' });
      }
    });
    return out;
  }

  // A one-shot report: which owner strings in the LTC book resolve, and how.
  function ownershipAudit() {
    const rows = ((A().ltcBoard || {}).rows) || allLtcRecords();
    const out = { total: rows.length, byId: 0, byUpn: 0, byName: 0, unresolved: [] };
    rows.forEach(function (r) {
      const res = resolveOwner(r.csm);
      if (res.via === 'id') out.byId++;
      else if (res.via === 'upn') out.byUpn++;
      else if (res.via === 'name') out.byName++;
      else out.unresolved.push({ record: r.id, owner: r.csm || '(blank)' });
    });
    out.note = 'byName is the legacy fallback and should trend to zero. ' +
               'unresolved rows appear under All but never under Mine.';
    out.ambiguousFirstNames = ownershipRisks();
    return out;
  }


  /* ═══════════════════════════════════════════════════════════════════════
     8 · COMMUNITY IDENTITY  (TD-28) — resolver and Phase-0 measurement
     ═══════════════════════════════════════════════════════════════════════
     DESIGN ONLY. Nothing here writes to the shared document and nothing is
     migrated. It exists so the proposal in COMMUNITY-IDENTITY.md can be
     tested rather than argued about, and so Phase 0 — measure, change
     nothing — can actually be run.

     The problem: Viv has no community identifier. A client's community is
     free text on the client record (`customFields.community`), so identity
     drifts one client at a time, and everything the hub knows about a
     community — contacts, levels of care, and the WHOLE weekly email
     configuration including the recipient list — is keyed by that string.
     ═══════════════════════════════════════════════════════════════════════ */

  // Case, spacing and punctuation are not identity. "St. Elizabeth's" and
  // "St Elizabeths" are one place. Nothing beyond that is folded: "NewBridge"
  // and "NewBridge on the Charles" stay two names, because they may be two
  // places and only a person can say.
  function normCommunity(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      // Apostrophes and periods are REMOVED, not spaced: "St. Elizabeth's"
      // has to fold onto "St Elizabeths", and replacing them with a space
      // gave "st elizabeth s", which matched nothing. Separators (hyphens,
      // slashes, commas, brackets, ampersands) do become spaces.
      .replace(/['’‘.]/g, '')
      .replace(/[,"“”\-–—/()&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function communityIndex() {
    const shared = ((A().data || {}).shared) || {};
    return shared.communityIndex || {};
  }

  /* resolve(name, index?) → { id, display, via, candidates }
       via: 'id' | 'alias' | 'normalised' | null
     Two or more candidates resolve to NOTHING. The gate is explicit that a
     rename must never be guessed when more than one community could fit, and
     a wrong guess here moves one community's recipient list onto another. */
  function resolveCommunity(name, indexIn) {
    const ix = indexIn || communityIndex();
    const raw = String(name == null ? '' : name).trim();
    const out = { id: null, display: '', via: null, candidates: [] };
    if (!raw) return out;

    if (ix[raw]) return { id: raw, display: ix[raw].display || raw, via: 'id', candidates: [] };

    const exact = [], norm = [];
    const want = normCommunity(raw);
    Object.keys(ix).forEach(function (id) {
      const e = ix[id] || {};
      const names = (e.names || []).concat(e.display ? [e.display] : []);
      if (names.some(function (n) { return String(n).trim() === raw; })) exact.push(id);
      else if (want && names.some(function (n) { return normCommunity(n) === want; })) norm.push(id);
    });

    if (exact.length === 1) return { id: exact[0], display: ix[exact[0]].display || raw, via: 'alias', candidates: [] };
    if (exact.length > 1) return { id: null, display: '', via: null, candidates: exact };
    if (norm.length === 1) return { id: norm[0], display: ix[norm[0]].display || raw, via: 'normalised', candidates: [] };
    if (norm.length > 1) return { id: null, display: '', via: null, candidates: norm };
    return out;
  }

  /* Phase 0: measure, change nothing. Builds a candidate index in memory
     from the community names actually in use and reports what a migration
     would face. Writes nothing. */
  function communityPhase0() {
    const data = A().data || {};
    const shared = data.shared || {};
    const configured = shared.communities || {};
    const seen = Object.create(null);     // normalised → { names:Set, clients:n }

    const note = function (nm, isClient) {
      const t = String(nm || '').trim();
      if (!t || /^private (home|residence)$/i.test(t)) return;
      const k = normCommunity(t);
      const e = seen[k] = seen[k] || { names: {}, clients: 0, configured: false, withEmail: false };
      e.names[t] = (e.names[t] || 0) + 1;
      if (isClient) e.clients++;
    };

    Object.keys(configured).forEach(function (nm) {
      note(nm, false);
      const k = normCommunity(nm);
      if (seen[k]) {
        seen[k].configured = true;
        const e = configured[nm] || {};
        if (e.email && ((e.email.to || []).length || e.email.enabled)) seen[k].withEmail = true;
      }
    });
    try {
      const profiles = (data.profiles) || {};
      Object.keys(profiles).forEach(function (pid) {
        ((profiles[pid] || {}).clients || []).forEach(function (c) { note(c.loc, true); });
      });
    } catch (e) {}

    const groups = Object.keys(seen).map(function (k) {
      const e = seen[k];
      const spellings = Object.keys(e.names);
      return { normalised: k, spellings: spellings, spellingCount: spellings.length,
               clients: e.clients, configured: e.configured, hasEmailConfig: e.withEmail };
    });

    // Distinct names that fold together — the drift a migration must merge.
    const drifted = groups.filter(function (g) { return g.spellingCount > 1; });
    // Names that look like one another without folding — the judgement calls.
    const nearby = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i].normalised, b = groups[j].normalised;
        if (a.indexOf(b) === 0 || b.indexOf(a) === 0) nearby.push([groups[i].spellings[0], groups[j].spellings[0]]);
      }
    }
    return {
      distinctCommunities: groups.length,
      distinctSpellings: groups.reduce(function (n, g) { return n + g.spellingCount; }, 0),
      spellingDrift: drifted.map(function (g) { return g.spellings; }),
      prefixOverlaps: nearby,
      configured: groups.filter(function (g) { return g.configured; }).length,
      withEmailConfig: groups.filter(function (g) { return g.hasEmailConfig; }).length,
      atRisk: groups.filter(function (g) { return g.hasEmailConfig && g.spellingCount > 1; })
        .map(function (g) { return g.spellings; }),
      note: 'Measurement only — nothing was written. atRisk is the set whose ' +
            'recipient list would be orphaned by the drift already present.'
    };
  }

  // Build an index from a list of {id, display, names} — used by the tests
  // and by a future Phase 1. Returns a new object; writes nothing.
  function buildCommunityIndex(entries) {
    const ix = {};
    (entries || []).forEach(function (e) {
      if (!e || !e.id) return;
      ix[e.id] = { id: e.id, display: e.display || (e.names || [])[0] || e.id,
                   names: (e.names || []).slice(), market: e.market || '',
                   merged: (e.merged || []).slice() };
    });
    return ix;
  }

  /* ── INSTALL ──────────────────────────────────────────────────────────── */
  let _hooked = false;
  function hookRedesign() {
    const R = window.TributeRedesign;
    if (_hooked || !R || !R.areaBlocks) return;
    _hooked = true;
    R.areaBlocks.schedule.push(function (c) {
      return { title: 'Weekly schedule email', html: weeklyBlock(c) };
    });
    R.areaBlocks.communication.push(function (c) {
      const h = weeklyHistoryBlock(c);
      return h ? { title: 'Weekly schedule emails sent', html: h } : null;
    });
    R.signalSources.push(weeklySignal);
    // The workspace's own click handling does not know about these blocks,
    // so the layer that contributed them listens for their controls.
    document.addEventListener('click', function (e) {
      const b = e.target.closest && e.target.closest('[data-wk]');
      if (!b) return;
      const R2 = window.TributeRedesign;
      const cid = R2 && R2.selected;
      const c = (A().myClients ? A().myClients() : []).find(function (x) { return x.id === cid; });
      if (!c) return;
      e.preventDefault(); e.stopPropagation();
      if (b.dataset.wk === 'mode') weeklyChooseMode(c);
      else if (b.dataset.wk === 'preview') weeklyPreview(c);
      else if (b.dataset.wk === 'send') {
        clientWeek(c.id, nextSundayFor(c)).then(function (wk) { weeklySend(c, wk); });
      }
    }, true);
    setTimeout(weeklyWarm, 1500);
  }

  function install() {
    hookRedesign();
    try { installLtcIdentity(); } catch (e) { console.error('[workflows] ltc identity:', e); }
    try { tidyHomeStats(); } catch (e) {}
    if (window.renderMdRows && !window.renderMdRows.__rd) {
      renderMdRows.__rd = true; renderMdRows.original = window.renderMdRows;
      renderMdDetail.__rd = true; renderMdDetail.original = window.renderMdDetail;
      mdKpi.__rd = true; mdKpi.original = window.renderMdKpi;
      window.renderMdRows = renderMdRows;
      window.renderMdDetail = renderMdDetail;
      window.renderMdKpi = mdKpi;
    }
    if (window.renderEmailCommDetail && !window.renderEmailCommDetail.__rd) {
      renderEmailCommDetail.__rd = true; renderEmailCommDetail.original = window.renderEmailCommDetail;
      renderEmailCommList.__rd = true; renderEmailCommList.original = window.renderEmailCommList;
      window.renderEmailCommDetail = renderEmailCommDetail;
      window.renderEmailCommList = renderEmailCommList;
    }
    if (window.renderLtcSubmissionRows && !window.renderLtcSubmissionRows.__rd) {
      renderLtcSubmissionRows.__rd = true; renderLtcSubmissionRows.original = window.renderLtcSubmissionRows;
      renderLtcDetail.__rd = true; renderLtcDetail.original = window.renderLtcDetail;
      window.renderLtcSubmissionRows = renderLtcSubmissionRows;
      window.renderLtcDetail = renderLtcDetail;
      // The tile strip is written inline by the board loader rather than by a
      // renderer of its own, so the loader is wrapped and the strip redrawn
      // after it. The fetch, the cache and the error path stay the app's.
      if (typeof window.renderLtcSubmissionBoard === 'function' && !window.renderLtcSubmissionBoard.__rd) {
        const ob = window.renderLtcSubmissionBoard;
        const wb = async function () {
          const out = await ob.apply(this, arguments);
          try { ltcKpi(); } catch (e) { console.error('[workflows] ltc kpi:', e); }
          return out;
        };
        wb.__rd = true; wb.original = ob;
        window.renderLtcSubmissionBoard = wb;
      }
    }
  }

  window.TributeWorkflows = {
    install: install,
    md: { rows: renderMdRows, kpi: mdKpi, detail: renderMdDetail, rowsFor: mdRowsFor, all: mdAll,
          get mine() { return _mdMine; }, set mine(v) { _mdMine = !!v; } },
    ltc: { rows: renderLtcSubmissionRows, kpi: ltcKpi, detail: renderLtcDetail, rowsFor: ltcRowsFor, all: ltcRows },
    ec: { detail: renderEmailCommDetail, list: renderEmailCommList, summary: ecSettingsSummary },
    home: { tidyStats: tidyHomeStats },
    ltcIdentity: { forClient: ltcForClient, audit: ltcIdentityAudit, normName: normName,
                   all: allLtcRecords },
    ownership: { resolve: resolveOwner, mine: ownedByMe, audit: ownershipAudit,
                 risks: ownershipRisks, index: ownerIndex, canon: canon },
    community: { resolve: resolveCommunity, norm: normCommunity,
                 phase0: communityPhase0, buildIndex: buildCommunityIndex,
                 index: communityIndex },
    weekly: {
      block: weeklyBlock, history: weeklyHistoryBlock, signal: weeklySignal,
      preview: weeklyPreview, chooseMode: weeklyChooseMode, send: weeklySend,
      state: weeklyState, store: weeklyStore, sig: weekSig,
      week: nextSunday, weekFor: nextSundayFor, tzFor: tzFor,
      normalize: normalizeVisits, weekLabel: weekLabelFor,
      warm: weeklyWarm, fetchWeek: clientWeek, emailHtml: weeklyEmailHtml,
      available: weeklyAvailable,
      automationReady: autoLive
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  // The application's script may not have run yet when this file loads.
  const t = setInterval(function () { install(); if (window.renderMdRows && window.renderMdRows.__rd) clearInterval(t); }, 60);
  setTimeout(function () { clearInterval(t); }, 8000);
})();
