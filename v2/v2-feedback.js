/* ═══════════════════════════════════════════════════════════════════════════
   CSM HUB V2 PREVIEW — pilot feedback
   ═══════════════════════════════════════════════════════════════════════════
   The one write V2 Preview is allowed to make, and it is deliberately not a
   business write: its own endpoint, its own container, nothing operational.

   The point is that a tester can report something the moment they hit it,
   from the screen they are on, without losing their place. An issue
   remembered until the end of a session is an issue described vaguely.

   PHI: the panel attaches technical context, never clinical or identifying
   content. A route is reduced to its SHAPE — "client workspace / Schedule",
   never "Mary Smith / Schedule" — here AND again on the server, because a
   client-side sanitiser is a convenience, not a control.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const App = (window.TributeApp = window.TributeApp || {});
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const CATEGORIES = [
    ['broken', 'Something is broken'],
    ['confusing', 'Something is confusing'],
    ['cannot_find', 'I can’t find something'],
    ['data_wrong', 'Data looks wrong'],
    ['idea', 'Idea / suggestion']
  ];
  const IMPACTS = [
    ['minor', 'Minor'],
    ['slowed', 'Slowed me down'],
    ['blocked', 'Couldn’t continue']
  ];

  const sessionStart = Date.now();
  let previousRoute = '';
  let lastRoute = location.hash || '#home';
  window.addEventListener('hashchange', function () {
    previousRoute = lastRoute; lastRoute = location.hash || '';
  });

  /* Reduce a route to its shape. #clients/viv6a0f…/schedule identifies a
     person; "client workspace / schedule" does not. */
  function safeRoute(h) {
    return String(h || '')
      .replace(/^#/, '')
      .replace(/^clients\/[A-Za-z0-9]+(?:\/([a-z]+))?/i, function (m, area) {
        return 'client workspace' + (area ? ' / ' + area : '');
      })
      .replace(/\b(?:viv)?[0-9a-f]{24}\b/gi, '[id]') || 'home';
  }

  function workspaceArea() {
    try {
      const R = window.TributeRedesign;
      return (R && R.selected && R.section) ? R.section : '';
    } catch (e) { return ''; }
  }

  /* Technical context. Explicitly a fixed allowlist of SHAPES — adding a
     field here is a deliberate act, so nothing drifts in from the page. */
  function collectContext() {
    const A = App;
    const failed = [], stale = [];
    try {
      (A.anomalies || []).forEach(function (a) {
        const src = String(a.where || '').split('.')[0];
        if (a.kind === 'api-error' || a.kind === 'api-failure') { if (failed.indexOf(src) < 0) failed.push(src); }
        if (a.kind === 'serving-stale') { if (stale.indexOf(src) < 0) stale.push(src); }
      });
    } catch (e) {}
    let lastStatus = '';
    try {
      const t = (A.timings || []).slice(-1)[0];
      if (t) lastStatus = t.endpoint + ' ' + (t.error ? 'failed' : (t.status || '200')) + ' in ' + Math.round(t.ms) + 'ms';
    } catch (e) {}
    return {
      build: (document.querySelector('script[src*="v2-chrome"]') || {}).src
        ? (document.querySelector('script[src*="v2-chrome"]').src.split('?v=')[1] || '') : '',
      viewport: window.innerWidth + 'x' + window.innerHeight,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      language: navigator.language,
      staleSources: stale,
      failedSources: failed,
      lastEndpointStatus: lastStatus,
      previousRoute: safeRoute(previousRoute),
      writeBlockedCount: (A.writeAttempts || []).length,
      anomalyCount: (A.anomalies || []).length,
      sessionMs: Date.now() - sessionStart
    };
  }

  /* ── The control ──────────────────────────────────────────────────────── */
  function mount() {
    if (document.getElementById('v2-fb-btn')) return;
    if (!document.body) return;
    const b = document.createElement('button');
    b.id = 'v2-fb-btn';
    b.type = 'button';
    b.setAttribute('aria-label', 'Send feedback about V2 Preview');
    b.innerHTML = '<span class="v2-fb-dot"></span>Feedback';
    b.addEventListener('click', open);
    document.body.appendChild(b);
  }

  let busy = false, clientKey = null;

  function open() {
    let el = document.getElementById('v2-fb');
    if (el) { el.classList.add('open'); return; }
    el = document.createElement('div');
    el.id = 'v2-fb';
    el.innerHTML =
      '<div class="v2-fb-panel" role="dialog" aria-modal="true" aria-labelledby="v2-fb-h">' +
        '<button class="v2-fb-x" type="button" aria-label="Close">×</button>' +
        '<h3 id="v2-fb-h">Tell us what you found</h3>' +
        '<p class="v2-fb-sub">You can keep working — this does not leave the page.</p>' +
        '<div class="v2-fb-f"><label>Type</label><div class="v2-fb-opts" id="v2-fb-cat">' +
          CATEGORIES.map(function (c, i) {
            return '<button type="button" class="v2-fb-opt' + (i === 0 ? ' on' : '') + '" data-v="' + c[0] + '">' + esc(c[1]) + '</button>';
          }).join('') + '</div></div>' +
        '<div class="v2-fb-f"><label for="v2-fb-msg">What happened?</label>' +
          '<textarea id="v2-fb-msg" rows="4" placeholder="What you were doing, and what the Hub did."></textarea></div>' +
        '<div class="v2-fb-f"><label for="v2-fb-exp">What did you expect? <em>optional</em></label>' +
          '<textarea id="v2-fb-exp" rows="2" placeholder="What you thought would happen."></textarea></div>' +
        '<div class="v2-fb-f"><label>Impact</label><div class="v2-fb-opts" id="v2-fb-imp">' +
          IMPACTS.map(function (m, i) {
            return '<button type="button" class="v2-fb-opt' + (i === 0 ? ' on' : '') + '" data-v="' + m[0] + '">' + esc(m[1]) + '</button>';
          }).join('') + '</div></div>' +
        '<p class="v2-fb-priv">We attach the page you were on, your role and market, the build, and ' +
          'any errors on screen. We never attach client names, notes, schedules or anything from a ' +
          'client’s record.</p>' +
        '<div class="v2-fb-err" id="v2-fb-err" hidden></div>' +
        '<div class="v2-fb-act">' +
          '<button type="button" class="btn btn-o" data-a="cancel">Cancel</button>' +
          '<button type="button" class="btn btn-p" id="v2-fb-send">Send feedback</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    el.classList.add('open');

    const pick = function (wrap) {
      el.querySelectorAll('#' + wrap + ' .v2-fb-opt').forEach(function (o) {
        o.addEventListener('click', function () {
          el.querySelectorAll('#' + wrap + ' .v2-fb-opt').forEach(function (x) { x.classList.remove('on'); });
          o.classList.add('on');
        });
      });
    };
    pick('v2-fb-cat'); pick('v2-fb-imp');

    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.classList.contains('v2-fb-x') || e.target.dataset.a === 'cancel') close();
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.getElementById('v2-fb-send').addEventListener('click', submit);
    setTimeout(function () { const m = document.getElementById('v2-fb-msg'); if (m) m.focus(); }, 30);
  }

  function close() {
    const el = document.getElementById('v2-fb');
    if (el) el.classList.remove('open');
  }

  function sel(wrap) {
    const on = document.querySelector('#' + wrap + ' .v2-fb-opt.on');
    return on ? on.dataset.v : '';
  }

  async function submit() {
    if (busy) return;                       // a double-click is one submission
    const btn = document.getElementById('v2-fb-send');
    const errEl = document.getElementById('v2-fb-err');
    const msg = (document.getElementById('v2-fb-msg') || {}).value || '';
    if (!msg.trim()) {
      errEl.hidden = false;
      errEl.textContent = 'Please say what happened before sending.';
      return;
    }
    busy = true;
    btn.disabled = true; btn.textContent = 'Sending…';
    errEl.hidden = true;

    // One key per attempt, so a retry of the SAME text is not a new row but a
    // genuinely new report is.
    if (!clientKey) clientKey = 'ck_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

    const p = App.profile || {};
    const payload = {
      clientKey: clientKey,
      category: sel('v2-fb-cat'),
      impact: sel('v2-fb-imp'),
      message: msg,
      expected: (document.getElementById('v2-fb-exp') || {}).value || '',
      route: safeRoute(location.hash),
      workspaceArea: workspaceArea(),
      profileId: p.id || '',
      role: p.role || '',
      market: p.market || '',
      build: (collectContext().build || ''),
      technicalContext: collectContext()
    };

    try {
      const base = (App.vivProxy || '') + '?endpoint=v2_feedback';
      const headers = Object.assign({ 'Content-Type': 'application/json' },
        typeof window.dataHeaders === 'function' ? await window.dataHeaders(true) : {});
      const r = await fetch(base, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      const j = await r.json().catch(function () { return {}; });
      if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));

      App.feedbackSubmissions = (App.feedbackSubmissions || 0) + 1;
      if (App.updateWriteBadge) App.updateWriteBadge();
      clientKey = null;
      done();
    } catch (e) {
      // NEVER discard what they typed, and never call a failure a success.
      busy = false;
      btn.disabled = false; btn.textContent = 'Retry sending';
      errEl.hidden = false;
      errEl.textContent = 'That was NOT sent — ' + (e && e.message ? e.message : 'the server did not answer') +
        '. Your words are still here; press Retry sending.';
    }
  }

  function done() {
    const el = document.getElementById('v2-fb');
    if (!el) return;
    el.querySelector('.v2-fb-panel').innerHTML =
      '<div class="v2-fb-done"><div class="v2-fb-tick">✓</div>' +
      '<h3>Thanks — feedback sent.</h3>' +
      '<p>Carry on where you left off. You can send another any time.</p>' +
      '<div class="v2-fb-act"><button type="button" class="btn btn-p" data-a="cancel">Close</button></div></div>';
    el.querySelector('[data-a="cancel"]').addEventListener('click', function () {
      el.remove(); busy = false;
    });
    setTimeout(function () { const x = document.getElementById('v2-fb'); if (x) { x.remove(); busy = false; } }, 4000);
  }

  /* ── READING WHAT CAME IN ─────────────────────────────────────────────
     The submit form, the store, the sanitiser, the reviewer gate and the
     status API all existed. The one screen that makes them useful did not,
     so the only way to read a tester's note was a console command. On the
     first morning of a pilot that is not good enough.

     Reviewer-only, and the server decides that: this asks, and renders
     whatever it is given. A 403 is a normal answer, not an error. */
  async function loadInbox() {
    const proxy = App.vivProxy || '';
    const h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders() : {};
    const r = await fetch(proxy + '?endpoint=v2_feedback', { headers: h });
    if (r.status === 403) return { forbidden: true };
    if (!r.ok) throw new Error('Could not load feedback (' + r.status + ').');
    return await r.json();
  }

  /* The server's own vocabulary, not an invented one. It accepts exactly
     these five and 400s on anything else; the first version offered
     triaged/fixed/wont_fix, so three of the four buttons returned "bad
     status" and the only sign was the button changing to "failed". Same
     mistake as the field names: guessed instead of read. */
  const STATUSES = [
    ['new',          'New'],
    ['reviewed',     'Reviewed'],
    ['fix_planned',  'Fix planned'],
    ['resolved',     'Fixed'],
    ['not_changing', "Won't change"]
  ];
  const STATUS_LABEL = STATUSES.reduce(function (a, s) { a[s[0]] = s[1]; return a; }, {});
  const WHEN = t => { try { return new Date(t).toLocaleString(); } catch (e) { return String(t || ''); } };

  async function openInbox() {
    let el = document.getElementById('v2-fbx');
    if (!el) {
      el = document.createElement('div');
      el.id = 'v2-fbx';
      document.body.appendChild(el);
    }
    el.className = 'open';
    el.innerHTML = '<div class="v2-fbx-panel" role="dialog" aria-modal="true">' +
      '<button class="v2-fb-x" type="button" aria-label="Close">×</button>' +
      '<h3>Pilot feedback</h3><div id="v2-fbx-body"><p class="v2-fb-sub">Loading…</p></div></div>';
    el.querySelector('.v2-fb-x').addEventListener('click', function () { el.classList.remove('open'); });
    el.addEventListener('click', function (e) { if (e.target === el) el.classList.remove('open'); });
    const body = el.querySelector('#v2-fbx-body');
    let j;
    try { j = await loadInbox(); }
    catch (e) { body.innerHTML = '<p class="v2-fbx-err">' + esc(e.message) + '</p>'; return; }
    if (j.forbidden) {
      /* Admin in the page is not the same list as reviewer on the server:
         ADMIN_UPNS is wider than V2_FEEDBACK_REVIEWERS. Someone in the first
         and not the second would otherwise click Feedback and get a panel
         telling them they may not read it, having lost the form they
         actually wanted. Hand them the form. */
      el.classList.remove('open');
      open();
      return;
    }
    if (!j.count) { body.innerHTML = '<p class="v2-fb-sub">Nothing submitted yet.</p>'; return; }
    const tally = j.items.reduce(function (a, i) {
      const k = i.status || 'new'; a[k] = (a[k] || 0) + 1; return a; }, {});
    const open = (tally.new || 0) + (tally.reviewed || 0) + (tally.fix_planned || 0);
    const summary = '<p class="v2-fb-sub"><b>' + open + ' still open</b> of ' + j.count +
      ' \u00b7 ' + STATUSES.map(function (s) {
        return tally[s[0]] ? tally[s[0]] + ' ' + s[1].toLowerCase() : null;
      }).filter(Boolean).join(', ') + '</p>';
    body.innerHTML = summary + j.items.map(function (it) {
      /* Field names read off the stored records, not guessed. The first
         version rendered it.kind and it.submittedBy, which the store does
         not have, so every row said "feedback" from "unknown". */
      var who = it.displayName || it.user || 'unknown';
      var kind = String(it.category || 'feedback').replace(/_/g, ' ');
      /* THE STATE, VISIBLE. The question this screen has to answer at a
         glance is "has this been dealt with", and until now the only sign
         was which button happened to be highlighted. Settled items carry a
         badge, say who settled them and when, and recede. */
      const st = it.status || 'new';
      const settled = (st === 'resolved' || st === 'not_changing');
      const badge = '<span class="v2-fbx-st s-' + esc(st) + '">' +
        esc(STATUS_LABEL[st] || st) + '</span>';
      const by = (it.statusBy && st !== 'new')
        ? '<div class="v2-fbx-by">' + esc(STATUS_LABEL[st] || st) + ' by ' +
          esc(String(it.statusBy).split('@')[0]) +
          (it.statusAt ? ' \u00b7 ' + esc(WHEN(it.statusAt)) : '') + '</div>' : '';
      return '<div class="v2-fbx-item' + (settled ? ' settled' : '') + '" data-id="' + esc(it.id || '') + '">' +
        '<div class="v2-fbx-top"><b>' + esc(kind) + '</b> ' + badge +
        '<span>' + esc(who) + (it.market ? ' \u00b7 ' + esc(it.market) : '') +
        ' \u00b7 ' + esc(WHEN(it.submittedAt)) + '</span></div>' +
        (it.route ? '<div class="v2-fbx-where">' + esc(it.route) + '</div>' : '') +
        '<p class="v2-fbx-text">' + esc(it.message || it.text || '') + '</p>' + by +
        (it.expected ? '<p class="v2-fbx-exp"><em>Expected:</em> ' + esc(it.expected) + '</p>' : '') +
        (it.impact ? '<div class="v2-fbx-where">Impact: ' + esc(it.impact) + '</div>' : '') +
        '<div class="v2-fbx-acts">' + STATUSES.map(function (st) {
          return '<button type="button" class="v2-fb-opt' + (it.status === st[0] ? ' on' : '') +
            '" data-st="' + st[0] + '">' + esc(st[1]) + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    // Status changes go to the PATCH the server already implements.
    [].forEach.call(body.querySelectorAll('.v2-fbx-item'), function (row) {
      [].forEach.call(row.querySelectorAll('[data-st]'), function (b) {
        b.addEventListener('click', async function () {
          const proxy = App.vivProxy || '';
          const h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders(true) : {};
          h['Content-Type'] = 'application/json';
          try {
            /* POST, not PATCH. The function route is GET/POST/OPTIONS, so a
               PATCH never reaches the handler at all - it fails at the edge,
               which looks like the button doing nothing. The server takes the
               status change as {op:'status'} over POST and has done all
               along; the first version of this inbox shipped with the wrong
               verb and the triage buttons were dead. */
            const r = await fetch(proxy + '?endpoint=v2_feedback', { method: 'POST', headers: h,
              body: JSON.stringify({ op: 'status', id: row.dataset.id, status: b.dataset.st }) });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            // Re-read rather than patch the DOM: the badge, the tally and the
            // settled styling all have to move together.
            openInbox();
          } catch (e) {
            b.classList.add('v2-fb-bad');
            b.textContent = 'did not save';
          }
        });
      });
    });
  }

  App.feedback = { open: open, openInbox: openInbox, context: collectContext, safeRoute: safeRoute };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  const t = setInterval(mount, 1000);
  setTimeout(function () { clearInterval(t); }, 30000);
})();
