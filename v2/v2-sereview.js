/* ═══════════════════════════════════════════════════════════════════════════
   EXCEPTION REVIEW — every Service Exception for a client, read for what it
   actually describes
   ═══════════════════════════════════════════════════════════════════════════
   Courtney's ask (6 November 2026): a full view of Service Exceptions for real
   clients (not "Office (Boston)" and the like), so complaints filed as
   internal communication or something else stop disappearing, and a view of
   complaints heard in CSM communication that never became an exception.

   What the server does (tribute-api se_review): reads every client exception
   in the window, has a model say what each one describes, checks that reading
   (types must be real Viv types; the quote must really be in the record), and
   computes a flag where the reading and the dropdown disagree. Separately it
   reads emails FROM client and family addresses into the CSM mailboxes and
   keeps only the concerns, matched against what is on file.

   RULES FOR THIS PAGE:
   · Every flag is a question for a person. The page says so and shows the
     sentence the reading rests on, so Courtney can agree or dismiss without
     opening Viv.
   · Nothing here writes to Viv. A decision is recorded here only; the fix is
     made in Viv. A row re-typed in Viv leaves the queue on the next read.
   · A gap is a gap. Unread rows, a failed scan, and channels not yet
     connected are said plainly and never shown as "nothing found".
   =========================================================================== */
(function () {
  'use strict';

  var PAGE_ID = 'page-sereview';
  var S = { loading: false, scanning: false, err: null, data: null, tab: 'flags',
            q: '', market: '', csm: '', kind: '', open: {}, busy: {}, pick: {}, confirm: {}, types: null };

  function A() { return window.TributeApp || {}; }
  function api() { var a = A(); return (typeof a.vivProxy === 'string' && a.vivProxy) || ''; }
  function esc(s) { return String(s == null ? '' : s)
    .replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function I(n) { return '<span class="ti" data-i="' + n + '"></span>'; }

  /* Same gate as Daily Metrics, for the same reason: keyed on who is signed
     in, not on which profile is open. The server enforces its own list too. */
  var OWNER_PROFILE = 'courtney';
  function allowed() {
    var a = A(); var me = '';
    try { me = String(((a.account || {}).username) || '').toLowerCase(); } catch (e) {}
    if (me && (a.adminUpns || []).some(function (u) { return String(u).toLowerCase() === me; })) return true;
    if (!a.account || typeof a.profileForAccount !== 'function') return false;
    try { var mine = a.profileForAccount(a.account); return !!(mine && mine.id === OWNER_PROFILE); }
    catch (e) { return false; }
  }

  function host() {
    var el = document.getElementById(PAGE_ID);
    if (el) return el;
    var sibling = document.getElementById('page-home');
    if (!sibling || !sibling.parentNode) return null;
    el = document.createElement('div');
    el.id = PAGE_ID; el.className = 'page';
    el.innerHTML = '<div class="sr" id="xr-view"></div>';
    sibling.parentNode.insertBefore(el, sibling.nextSibling);
    return el;
  }

  async function headers() {
    try { return (typeof window.dataHeaders === 'function') ? await window.dataHeaders() : {}; } catch (e) { return {}; }
  }

  async function load(force) {
    S.loading = true; S.err = null; render();
    try {
      var r = await fetch(api() + '?endpoint=se_review&days=60' + (force ? '&refresh=1' : ''), { headers: await headers() });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'the review did not answer (' + r.status + ')');
      S.data = j;
    } catch (e) { S.err = String(e.message || e); }
    S.loading = false; render();
    if (S.data && !S.types) loadTypes();
  }

  /* Viv's current types, for the Fix in Viv picker. If they cannot be read
     the cards fall back to marking a change made by hand in Viv. */
  async function loadTypes() {
    try {
      var r = await fetch(api() + '?endpoint=se_review_types', { headers: await headers() });
      var j = await r.json().catch(function () { return {}; });
      if (r.ok && j.operations && j.clinical) { S.types = j; render(); }
    } catch (e) {}
  }

  /* Change the type in Viv. The server reads the record, refuses if it no
     longer holds what this card shows, saves, reads it back and logs it. */
  async function fix(x, type) {
    var key = 'se:' + x.id;
    S.busy[key] = true; S.confirm[x.id] = null; render();
    try {
      var h = await headers(); h['Content-Type'] = 'application/json';
      var r = await fetch(api() + '?endpoint=se_review_fix', { method: 'POST', headers: h,
        body: JSON.stringify({ id: x.id, types: [type], expect: x.types || [] }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.ok) throw new Error(j.error || 'Viv did not answer (' + r.status + ')');
      x.types = (j.after && j.after.types) || [type];
      S.data.decisions = S.data.decisions || {};
      S.data.decisions[key] = { decision: 'retyped', note: 'Fixed in Viv from the Hub', newType: x.types.join(', '),
        by: 'you', at: new Date().toISOString() };
      toast(j.unchanged ? 'Viv already had that type.' : 'Saved in Viv and confirmed: now ' + x.types.join(', ') +
        (j.qa && j.qa.needed ? (j.qa.notified ? '. QA has been told.' : '. QA was not told: ' + (j.qa.reason || 'unknown')) : '') + '.');
    } catch (e) { toast('Not changed: ' + (e.message || e)); }
    S.busy[key] = false; render();
  }

  async function scan() {
    S.scanning = true; render();
    try {
      var h = await headers();
      var r = await fetch(api() + '?endpoint=se_review_scan&days=30', { method: 'POST', headers: h });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'the scan did not answer');
      toast('Email scan: read ' + (j.read || 0) + ' new messages, found ' + (j.concernsFound || 0) + ' concerns' +
        (j.remaining ? ', ' + j.remaining + ' left for the next run' : ''));
    } catch (e) { toast('Email scan failed: ' + (e.message || e)); }
    S.scanning = false;
    await load(false);
  }

  async function decide(key, decision, extra) {
    S.busy[key] = true; render();
    try {
      var h = await headers(); h['Content-Type'] = 'application/json';
      var r = await fetch(api() + '?endpoint=se_review_decide', { method: 'POST', headers: h,
        body: JSON.stringify(Object.assign({ key: key, decision: decision }, extra || {})) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(j.error || 'not saved');
      S.data.decisions = S.data.decisions || {};
      if (j.decision) S.data.decisions[key] = j.decision; else delete S.data.decisions[key];
    } catch (e) { toast('Not saved: ' + (e.message || e)); }
    S.busy[key] = false; render();
  }

  function toast(msg) {
    if (typeof window.toast === 'function') { try { window.toast(msg); return; } catch (e) {} }
    var t = document.createElement('div'); t.className = 'xr-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 4000);
  }

  /* ── vocabulary ─────────────────────────────────────────────────────── */
  var NATURE = { client_complaint: 'Complaint', safety_incident: 'Safety event',
                 caregiver_performance: 'Caregiver issue', routine: 'Routine' };
  var WHO = { client: 'client', family: 'family', community: 'community', referral_partner: 'referral partner',
              caregiver: 'caregiver', staff: 'staff', none: '' };
  var FLAG_ORDER = ['hidden_incident', 'hidden_complaint', 'wrong_type', 'condition_change', 'over_typed'];
  var FLAG_TITLE = {
    hidden_incident: 'Safety events filed under a non-incident type',
    hidden_complaint: 'Complaints filed as routine',
    wrong_type: 'Complaints or incidents under the wrong type',
    condition_change: 'Hospitalizations and changes of condition filed as routine',
    over_typed: 'Filed as a complaint but reads as routine'
  };
  var DECISION_TEXT = { retyped: 'Re-typed in Viv', type_ok: 'Type is right', filed: 'Filed in Viv',
                        already_filed: 'Already on file', not_a_complaint: 'Not a complaint' };

  function decisionOf(key) { return ((S.data && S.data.decisions) || {})[key] || null; }

  function filtered(list) {
    var q = S.q.trim().toLowerCase();
    return list.filter(function (x) {
      if (S.market && (x.market || '') !== S.market) return false;
      if (S.csm && (x.csm || '') !== S.csm) return false;
      if (!q) return true;
      return [x.client, x.csm, x.market, (x.types || []).join(' '), x.narrative, x.summary, x.subject, x.num]
        .join(' ').toLowerCase().indexOf(q) > -1;
    });
  }

  /* ── pieces ─────────────────────────────────────────────────────────── */
  function meta(x) {
    return '<span class="xr-meta">' + esc(x.date || '') +
      (x.num ? ' · #' + esc(x.num) : '') +
      (x.csm ? ' · ' + esc(x.csm) : ' · no CSM on file') +
      (x.market ? ' · ' + esc(x.market) : '') +
      (x.status ? ' · ' + esc(x.status) : '') + '</span>';
  }
  function reading(ai) {
    if (!ai) return '<p class="xr-read xr-unread">Not read yet.</p>';
    var who = WHO[ai.complainant] ? ' from ' + WHO[ai.complainant] : '';
    return '<p class="xr-read"><span class="xr-nat xr-nat-' + esc(ai.nature) + '">' + esc(NATURE[ai.nature] || ai.nature) + who + '</span>' +
      '<span class="xr-conf">' + esc(ai.confidence) + ' confidence</span> ' + esc(ai.reason || '') + '</p>' +
      (ai.suggestedTypes && ai.suggestedTypes.length
        ? '<p class="xr-sugg">Suggested type: <b>' + ai.suggestedTypes.map(esc).join('</b> or <b>') + '</b></p>' : '') +
      (ai.quote ? '<p class="xr-q">\u201C' + esc(ai.quote) + '\u201D</p>' : '');
  }
  function actions(key, opts) {
    var d = decisionOf(key);
    if (d) {
      return '<div class="xr-act xr-done">' + I('check') + '<span>' + esc(DECISION_TEXT[d.decision] || d.decision) +
        ' · ' + esc(d.by || '') + ' · ' + esc(String(d.at || '').slice(0, 10)) + '</span>' +
        '<button type="button" class="btn btn-o btn-sm" data-dec="clear" data-key="' + esc(key) + '">Undo</button></div>';
    }
    var busy = S.busy[key] ? ' disabled' : '';
    return '<div class="xr-act">' + opts.map(function (o) {
      return '<button type="button" class="btn btn-sm ' + (o[2] ? 'btn-p' : 'btn-o') + '" data-dec="' + o[0] +
        '" data-key="' + esc(key) + '"' + busy + '>' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function narrative(x) {
    var k = 'n:' + x.id; var open = !!S.open[k];
    return '<button type="button" class="xr-more" data-tog="' + esc(k) + '">' + I(open ? 'chevronDown' : 'chevron') +
      (open ? 'Hide' : 'Read') + ' the full exception</button>' +
      (open ? '<div class="xr-narr"><p><b>Narrative</b> ' + esc(x.narrative || '(empty)') + '</p>' +
        (x.resolution ? '<p><b>Resolution</b> ' + esc(x.resolution) + '</p>' : '') +
        (x.caregivers && x.caregivers.length ? '<p><b>Caregivers</b> ' + x.caregivers.map(esc).join(', ') + '</p>' : '') +
        (x.ai && x.ai.checks && x.ai.checks.length ? '<p class="xr-checks">Checks: ' + x.ai.checks.map(esc).join('; ') + '</p>' : '') +
        '</div>' : '');
  }
  function exCard(x) {
    return '<li class="xr-card' + (decisionOf('se:' + x.id) ? ' is-done' : '') + '">' +
      '<div class="xr-head"><b>' + esc(x.client) + '</b>' + meta(x) + '</div>' +
      '<p class="xr-typed">Filed as <b>' + (x.types || []).map(esc).join('</b>, <b>') + '</b></p>' +
      reading(x.ai) + narrative(x) + fixer(x) + '</li>';
  }
  function isClinical(t) { return !!(S.types && S.types.clinical.indexOf(t) >= 0); }
  function pickOf(x) {
    if (S.pick[x.id]) return S.pick[x.id];
    var all = S.types ? S.types.operations.concat(S.types.clinical) : [];
    var sug = ((x.ai && x.ai.suggestedTypes) || []).filter(function (t) { return all.indexOf(t) >= 0; });
    return sug[0] || '';
  }
  /* The decision row for an exception: pick a type and change it in Viv, or
     say the type is right. Without Viv's type list, mark a change made by hand. */
  function fixer(x) {
    var key = 'se:' + x.id;
    if (decisionOf(key) || !S.types) return actions(key, [['retyped', 'I re-typed it in Viv', true], ['type_ok', 'Type is right']]);
    var busy = S.busy[key];
    var pick = pickOf(x);
    var c = S.confirm[x.id];
    if (busy) return '<div class="xr-act"><span class="xr-meta">Changing it in Viv and checking it took…</span></div>';
    var moves = pick && isClinical(pick) && !(x.types || []).every(isClinical);
    if (c) {
      return '<div class="xr-act xr-confirm"><span>Change #' + esc(x.num || '') + ' in Viv from <b>' + (x.types || []).map(esc).join(', ') +
        '</b> to <b>' + esc(c) + '</b>?' + (moves ? ' This moves it from operations to clinical, and QA is told.' : '') +
        ' Nothing else on the record changes.</span>' +
        '<button type="button" class="btn btn-p btn-sm" data-fixgo="' + esc(x.id) + '">Yes, change it</button>' +
        '<button type="button" class="btn btn-o btn-sm" data-fixno="' + esc(x.id) + '">Cancel</button></div>';
    }
    var sug = ((x.ai && x.ai.suggestedTypes) || []).filter(function (t) {
      return S.types.operations.indexOf(t) >= 0 || S.types.clinical.indexOf(t) >= 0; });
    var opt = function (t) { return '<option value="' + esc(t) + '"' + (t === pick ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    return '<div class="xr-act">' +
      '<select class="xr-sel xr-fixsel" data-fixsel="' + esc(x.id) + '" aria-label="New type"><option value="">Choose the right type…</option>' +
      (sug.length ? '<optgroup label="Suggested">' + sug.map(opt).join('') + '</optgroup>' : '') +
      '<optgroup label="Safety events (clinical)">' + S.types.clinical.map(opt).join('') + '</optgroup>' +
      '<optgroup label="Service exceptions (operations)">' + S.types.operations.map(opt).join('') + '</optgroup></select>' +
      '<button type="button" class="btn btn-p btn-sm" data-fix="' + esc(x.id) + '"' + (pick ? '' : ' disabled') + '>Fix in Viv</button>' +
      '<button type="button" class="btn btn-o btn-sm" data-dec="type_ok" data-key="' + esc(key) + '">Type is right</button>' +
      (moves ? '<span class="xr-meta">Moves it to clinical; QA is told.</span>' : '') + '</div>';
  }
  function heardCard(h) {
    var st = h.status === 'missing' ? 'No exception on file for this client within two weeks'
      : h.status === 'mislabeled' ? 'An exception is on file nearby, but typed as routine'
      : 'Filed';
    return '<li class="xr-card' + (decisionOf('heard:' + h.id) ? ' is-done' : '') + '">' +
      '<div class="xr-head"><b>' + esc(h.client || (h.candidateCids ? 'Address on file for several clients' : 'Client not matched')) + '</b>' +
      '<span class="xr-meta">' + esc(h.date) + ' · email to ' + esc(h.mailbox) + (h.csm ? ' · CSM ' + esc(h.csm) : '') +
      ' · from ' + esc(h.from) + '</span></div>' +
      '<p class="xr-typed xr-st-' + esc(h.status) + '">' + esc(st) + '</p>' +
      '<p class="xr-read"><span class="xr-nat xr-nat-' + esc(h.nature) + '">' + esc(NATURE[h.nature] || h.nature) +
      (WHO[h.complainant] ? ' from ' + WHO[h.complainant] : '') + '</span><span class="xr-conf">' + esc(h.confidence) +
      ' confidence</span> ' + esc(h.summary || '') + '</p>' +
      (h.suggestedTypes && h.suggestedTypes.length ? '<p class="xr-sugg">Suggested type: <b>' + h.suggestedTypes.map(esc).join('</b> or <b>') + '</b></p>' : '') +
      (h.quote ? '<p class="xr-q">\u201C' + esc(h.quote) + '\u201D</p>' : '') +
      '<p class="xr-subj">Subject: ' + esc(h.subject || '') +
      (h.webLink ? ' · <a href="' + esc(h.webLink) + '" target="_blank" rel="noopener">Open in Outlook</a>' : '') + '</p>' +
      actions('heard:' + h.id, [['filed', 'I filed it in Viv', true], ['already_filed', 'Already on file'],
                                ['not_a_complaint', 'Not a complaint']]) + '</li>';
  }

  /* ── tabs ───────────────────────────────────────────────────────────── */
  function flagsTab(d) {
    var ex = filtered((d.exceptions || []).filter(function (x) {
      return x.flag && (!S.kind || x.flag === S.kind) && (S.open.showDone || !decisionOf('se:' + x.id));
    }));
    if (!ex.length) return '<div class="card"><p class="xr-note">' +
      (d.unread ? 'Nothing flagged in what has been read, but ' + d.unread + ' exceptions are not read yet, so this is not a clean result.'
        : 'Nothing flagged for these filters.') + '</p></div>';
    var o = '';
    FLAG_ORDER.forEach(function (k) {
      var list = ex.filter(function (x) { return x.flag === k; });
      if (!list.length) return;
      o += '<div class="card xr-grp xr-grp-' + k + '"><h3>' + esc(FLAG_TITLE[k]) + ' <em>' + list.length + '</em></h3><ul class="xr-list">' +
        list.map(exCard).join('') + '</ul></div>';
    });
    return o;
  }
  function heardTab(d) {
    var list = filtered((d.heard || []).filter(function (h) {
      return h.status !== 'filed' && (S.open.showDone || !decisionOf('heard:' + h.id));
    }));
    var filed = (d.heard || []).filter(function (h) { return h.status === 'filed'; }).length;
    var o = '<div class="card xr-chan"><p class="xr-note"><b>Where this listens.</b> ' +
      Object.keys(d.channels || {}).map(function (k) { return '<span class="xr-ch"><b>' + esc(k) + '</b> ' + esc(d.channels[k]) + '</span>'; }).join('') +
      '</p>' + scanLine(d) + '</div>';
    if (!list.length) return o + '<div class="card"><p class="xr-note">' +
      (d.commsLastScan ? 'Every concern found in email in this window is already on file' + (filed ? ' (' + filed + ')' : '') + '.'
        : 'Email has not been scanned yet. Tap Scan email now.') + '</p></div>';
    return o + '<div class="card xr-grp"><h3>Heard in email, not on file as a complaint <em>' + list.length + '</em></h3>' +
      '<p class="xr-note">' + filed + ' other concerns found in email are already on file and are not shown.</p>' +
      '<ul class="xr-list">' + list.map(heardCard).join('') + '</ul></div>';
  }
  function allTab(d) {
    var list = filtered(d.exceptions || []);
    var shown = list.slice(0, S.open.allMore ? list.length : 150);
    return '<div class="card xr-all"><table class="xr-t"><thead><tr><th>Date</th><th>Client</th><th>CSM</th>' +
      '<th>Filed as</th><th>Reads as</th><th></th></tr></thead><tbody>' +
      shown.map(function (x) {
        var k = 'r:' + x.id, open = !!S.open[k];
        return '<tr class="' + (x.flag ? 'is-flag' : '') + '" data-tog="' + esc(k) + '"><td>' + esc(x.date) + '</td><td>' + esc(x.client) +
          '</td><td>' + esc(x.csm || '') + '</td><td>' + (x.types || []).map(esc).join('<br>') + '</td><td>' +
          (x.ai ? esc(NATURE[x.ai.nature] || '') : '<i>not read</i>') + '</td><td>' +
          (x.flag ? '<span class="xr-flag">' + esc(x.flagLabel) + '</span>' : '') + '</td></tr>' +
          (open ? '<tr class="xr-exp"><td colspan="6"><ul class="xr-list">' + exCard(x) + '</ul></td></tr>' : '');
      }).join('') + '</tbody></table>' +
      (list.length > shown.length ? '<button type="button" class="btn btn-o btn-sm" data-a="allmore">Show all ' + list.length + '</button>' : '') +
      '</div>';
  }
  function scanLine(d) {
    var s = d.commsLastScan;
    return '<p class="xr-note">' + (s ? 'Email last scanned ' + esc(String(s.at).slice(0, 16).replace('T', ' ')) + ' UTC: ' +
      s.read + ' new messages read, ' + s.concernsFound + ' concerns' + (s.remaining ? ', ' + s.remaining + ' still to read' : '') +
      (s.errors && s.errors.length ? '. Problems: ' + s.errors.map(esc).join('; ') : '') + '.' : 'Email has never been scanned.') +
      ' <button type="button" class="btn btn-o btn-sm" data-a="scan"' + (S.scanning ? ' disabled' : '') + '>' +
      (S.scanning ? 'Scanning…' : 'Scan email now') + '</button></p>';
  }

  function render() {
    var el = host(); if (!el) return;
    var view = $('#xr-view', el); if (!view) return;
    if (!allowed()) {
      view.innerHTML = '<div class="ph"><h2>Exception Review</h2></div><div class="card"><p class="xr-note">' +
        'This view is limited to Client Solutions leadership while it is being checked.</p></div>';
      return;
    }
    var d = S.data;
    var o = '<div class="ph"><h2>Exception Review</h2><p>Every Service Exception filed for a client, read for what it actually describes, ' +
      'and complaints heard in CSM email that never became one.</p></div>';
    o += '<div class="card xr-rule"><p class="xr-note"><b>Every flag is a question, not a finding.</b> The reading comes from AI and is checked ' +
      'before it reaches you: suggested types are real Viv types, and the quoted sentence is really in the record. ' +
      '<b>Fix in Viv changes only the exception\u2019s type</b>, after you confirm it, and checks with Viv that it took. ' +
      'The narrative, resolution and everything else stay as they are, and every change is logged with your name.</p></div>';
    if (S.err) o += '<div class="card mx-unread"><p class="xr-note">Could not be read: ' + esc(S.err) + '</p></div>';
    if (!d) { view.innerHTML = o + '<div class="card"><p class="xr-note">' + (S.loading ? 'Reading… the first read of a window can take two or three minutes.' : '') + '</p></div>'; return; }

    var fc = d.flagCounts || {}; var nFlag = 0; Object.keys(fc).forEach(function (k) { nFlag += fc[k]; });
    var openFlags = (d.exceptions || []).filter(function (x) { return x.flag && !decisionOf('se:' + x.id); }).length;
    var hc = d.heardCounts || {};
    var openHeard = (d.heard || []).filter(function (h) { return h.status !== 'filed' && !decisionOf('heard:' + h.id); }).length;
    o += '<div class="xr-stats">' +
      stat(d.clientRows, 'client exceptions', 'last ' + d.days + ' days; ' + d.excludedRows + ' office and placeholder rows left out') +
      stat(openFlags, 'to review', nFlag + ' flagged in all') +
      stat(openHeard, 'heard, not filed', (hc.missing || 0) + ' with nothing on file, ' + (hc.mislabeled || 0) + ' filed as routine') +
      (d.unread ? stat(d.unread, 'not read yet', 'the next read continues where this one stopped') : '') +
      '</div>';

    var markets = {}, csms = {};
    (d.exceptions || []).forEach(function (x) { if (x.market) markets[x.market] = 1; if (x.csm) csms[x.csm] = 1; });
    (d.heard || []).forEach(function (x) { if (x.csm) csms[x.csm] = 1; });
    o += '<div class="xr-bar">' +
      '<div class="xr-tabs" role="tablist">' +
      tab('flags', 'Needs a look', openFlags) + tab('heard', 'Heard, not filed', openHeard) + tab('all', 'All exceptions', d.clientRows) +
      '</div><div class="xr-filters">' +
      '<input type="search" class="xr-search" placeholder="Search client, CSM, text" value="' + esc(S.q) + '">' +
      sel('market', 'All markets', Object.keys(markets).sort()) + sel('csm', 'All CSMs', Object.keys(csms).sort()) +
      (S.tab === 'flags' ? sel('kind', 'All flags', FLAG_ORDER, FLAG_TITLE) : '') +
      '<label class="xr-chk"><input type="checkbox" data-a="done"' + (S.open.showDone ? ' checked' : '') + '> Show decided</label>' +
      '<button type="button" class="btn btn-o btn-sm" data-a="refresh"' + (S.loading ? ' disabled' : '') + '>' + (S.loading ? 'Reading…' : 'Re-read') + '</button>' +
      '</div></div>';

    o += S.tab === 'heard' ? heardTab(d) : S.tab === 'all' ? allTab(d) : flagsTab(d);

    o += '<p class="xr-foot">Read ' + esc(String(d.generatedAt || '').slice(0, 16).replace('T', ' ')) + ' UTC by ' + esc(d.model || '') +
      '. Viv rows scanned: ' + (d.inWindow || 0) + '. Left out as not a client: ' +
      (d.excludedClients || []).map(function (e) { return esc(e.name) + ' (' + e.n + ')'; }).join(', ') +
      ((d.errors || []).length ? '. Read problems: ' + d.errors.map(esc).join('; ') : '') + '.</p>';

    view.innerHTML = o;
    if (window.TributeIcons && window.TributeIcons.swap) window.TributeIcons.swap(el);
    wire(el);
  }
  function stat(n, label, sub) {
    return '<div class="xr-stat"><b>' + esc(n == null ? 'n/a' : n) + '</b><span>' + esc(label) + '</span><small>' + esc(sub || '') + '</small></div>';
  }
  function tab(k, label, n) {
    return '<button type="button" role="tab" class="xr-tab' + (S.tab === k ? ' on' : '') + '" data-tab="' + k + '" aria-selected="' +
      (S.tab === k) + '">' + esc(label) + (n != null ? ' <em>' + n + '</em>' : '') + '</button>';
  }
  function sel(k, all, opts, labels) {
    return '<select class="xr-sel" data-f="' + k + '"><option value="">' + esc(all) + '</option>' +
      opts.map(function (v) { return '<option value="' + esc(v) + '"' + (S[k] === v ? ' selected' : '') + '>' + esc(labels ? labels[v] : v) + '</option>'; }).join('') +
      '</select>';
  }

  function wire(el) {
    $$('[data-tab]', el).forEach(function (n) { n.addEventListener('click', function () { S.tab = n.dataset.tab; render(); }); });
    $$('[data-f]', el).forEach(function (n) { n.addEventListener('change', function () { S[n.dataset.f] = n.value; render(); }); });
    var q = $('.xr-search', el);
    if (q) q.addEventListener('input', function () {
      S.q = q.value; var pos = q.selectionStart; render();
      var q2 = $('.xr-search', host()); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) {} }
    });
    $$('[data-tog]', el).forEach(function (n) { n.addEventListener('click', function (e) {
      if (e.target.closest('button[data-dec]')) return;
      S.open[n.dataset.tog] = !S.open[n.dataset.tog]; render(); }); });
    $$('[data-dec]', el).forEach(function (n) { n.addEventListener('click', function (e) {
      e.stopPropagation(); decide(n.dataset.key, n.dataset.dec); }); });
    var byId = function (id) { return ((S.data && S.data.exceptions) || []).filter(function (x) { return x.id === id; })[0]; };
    $$('[data-fixsel]', el).forEach(function (n) { n.addEventListener('change', function () { S.pick[n.dataset.fixsel] = n.value; render(); }); });
    $$('[data-fix]', el).forEach(function (n) { n.addEventListener('click', function () {
      var x = byId(n.dataset.fix); if (x && pickOf(x)) { S.confirm[x.id] = pickOf(x); render(); } }); });
    $$('[data-fixno]', el).forEach(function (n) { n.addEventListener('click', function () { S.confirm[n.dataset.fixno] = null; render(); }); });
    $$('[data-fixgo]', el).forEach(function (n) { n.addEventListener('click', function () {
      var x = byId(n.dataset.fixgo); if (x && S.confirm[x.id]) fix(x, S.confirm[x.id]); }); });
    $$('[data-a]', el).forEach(function (n) {
      n.addEventListener(n.type === 'checkbox' ? 'change' : 'click', function () {
        var a = n.dataset.a;
        if (a === 'refresh') load(true);
        else if (a === 'scan') scan();
        else if (a === 'done') { S.open.showDone = n.checked; render(); }
        else if (a === 'allmore') { S.open.allMore = true; render(); }
      });
    });
  }

  function open() { host(); render(); if (!S.data && !S.loading && allowed()) load(false); }

  /* Same bootstrap as Daily Metrics: the element must exist before showPage
     is ever called for it, and the render hook is a delegated listener so it
     survives rebuildNav(). */
  function boot() {
    host();
    document.addEventListener('click', function (e) {
      var n = e.target && e.target.closest && e.target.closest('[data-page="sereview"]');
      if (n) setTimeout(open, 0);
    });
    if (/^#\/?sereview/.test(location.hash)) setTimeout(open, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.TributeSEReview = { open: open, render: render, allowed: allowed, pageId: PAGE_ID, _state: S, _fix: fix };
}());
