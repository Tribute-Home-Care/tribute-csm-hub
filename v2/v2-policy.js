/* ═══════════════════════════════════════════════════════════════════════════
   CSM HUB V2 PREVIEW — WRITE POLICY
   ═══════════════════════════════════════════════════════════════════════════
   V2 reads production for real, and writes to the SAME production sources
   of truth V1 writes to — never a copy, never a V2-only store.

   The local prototype blocked writes by replacing window.fetch. That was
   right for a machine with no credentials and wrong for a deployment that
   holds a real Entra token: a global interceptor is one typo away from
   either letting a write through or breaking a read, and it decides by
   sniffing URLs rather than by knowing what a feature does.

   So the mechanism here is a CAPABILITY the application asks about:

       TributeApp.environment                 === 'v2-preview'
       TributeApp.canWrite('csm_data_pocket') === true   (approved)
       TributeApp.canWrite('community_send')  === false  (not approved)

   Each write-capable function is wrapped individually, declares which
   capability it needs, and refuses before it builds a request. A blocked
   write is recorded, shown to the user, and never silently swallowed.

   The fetch guard at the bottom is NOT the mechanism. It is the PROOF —
   a tripwire that fires only if a write path was missed, so "0 production
   writes" is something measured rather than asserted.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const App = (window.TributeApp = window.TributeApp || {});
  App.environment = 'v2-preview';
  App.version = 'V2 Preview';

  /* ── The policy ────────────────────────────────────────────────────────
     A capability is true only when it maps to a write path V1 ALREADY uses,
     and only when that path has been shown to be safe for two interfaces at
     once. Everything else stays false. Three things decide the answer, and
     all three must agree:

       1. this table                       (what has been approved)
       2. the signed-in user               (the four pilot testers)
       3. the server's own switch          (V2_BUSINESS_WRITES_ENABLED)

     The server enforces 2 and 3 again on every write, so turning writes off
     does not depend on this file being reloaded.

     WHY THE SHARED-DOCUMENT SPLIT. csm_data is one JSON document. V1's 409
     retry replaces whole top-level keys of DATA.shared with its own copy, so
     a save made while someone else's coverage note was in flight discards
     that note. The profile pocket does not have this problem: the retry
     keeps each person's own pocket and leaves every other pocket alone.
     So the transport is split in two here — the pocket is enabled and the
     shared keys are not — and V2's own retry refuses to write shared keys
     at all. See TECH-DEBT TD-30 and test/csm-data-concurrency.test.js. */
  const POLICY = {
    // ENABLED — profile-pocket edits through V1's own saveToFile/queueSave.
    // Quick Notes, to-dos, 1:1 notes, KPI entries, client metadata,
    // touchpoints, the visit log and Success-in-30 all live here.
    csm_data_pocket: true,

    // ENABLED — the community draft. ecSaveDraft POSTs community_email&save=1,
    // the same stored draft the Friday run reads and V1 edits.
    community_draft_save: true,

    // BLOCKED — writes to DATA.shared.* (coverage notes, Fill Priority
    // events and status, community settings, Maryland cadence). Same
    // document, but the 409 retry can drop another person's edit.
    csm_data_shared: false,

    // BLOCKED — ecSend has no in-flight guard and no idempotency key, so a
    // double click sends two emails from the CSM's own mailbox. Brief §15:
    // no idempotency, no enablement.
    community_send: false,

    ltc_action: false,          // approve / mark sent / confirm / reopen
    ltc_send: false,            // send a submission packet to a carrier
    ltc_nudge: false,           // text a caregiver about missing notes
    csm_visit: false,           // create or delete a visit in Viv
    graph_calendar: false,      // create or delete an Outlook event
    graph_mail: false,          // send mail from the CSM's mailbox
    weekly_schedule: false,     // client_week is not implemented in production
    usage_telemetry: false,     // a pilot must not skew real usage stats

    assist: true,               // POST, but a question — mutates nothing
    community_render: true,     // POST, but returns HTML — persists nothing
    v2_feedback: true           // counted separately; never a business write
  };

  /* Which capabilities are business writes, for the diagnostics split. */
  const BUSINESS = new Set(['csm_data_pocket','csm_data_shared','community_draft_save',
    'community_send','ltc_action','ltc_send','ltc_nudge','csm_visit',
    'graph_calendar','graph_mail','weekly_schedule']);
  App.isBusinessCapability = function (c) { return BUSINESS.has(c); };

  /* ── What the server will actually accept ──────────────────────────────
     Asked once at boot. Until it answers, nothing business-y is writable:
     an unknown switch is treated as off, so a slow network cannot produce a
     page that looks write-enabled when it is not. */
  App.serverWrite = { known: false, enabled: false, isPilotWriter: false, capabilities: [] };
  App.loadWriteConfig = async function (proxy, headers) {
    try {
      const r = await fetch(proxy + '?endpoint=v2_write_config', { headers: await headers() });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      App.serverWrite = {
        known: true,
        enabled: !!j.businessWritesEnabled,
        isPilotWriter: !!j.isPilotWriter,
        capabilities: j.capabilities || [],
        user: j.user
      };
    } catch (e) {
      App.serverWrite = { known: false, enabled: false, isPilotWriter: false,
                          capabilities: [], error: String(e.message || e) };
    }
    if (App.updateWriteBadge) App.updateWriteBadge();
    if (App.onWriteConfig) try { App.onWriteConfig(); } catch (e) {}
    return App.serverWrite;
  };

  // Three gates, all of which must agree. A business capability additionally
  // needs the server's switch, the pilot allow-list, and the server's own
  // list of enabled capabilities — so the answer here matches what the
  // server would do with the request, and the UI never offers a control
  // whose write the server is going to refuse.
  App.canWrite = function (capability) {
    if (POLICY[capability] !== true) return false;
    if (!BUSINESS.has(capability)) return true;          // assist, render, feedback
    const sw = App.serverWrite;
    if (!sw.known || !sw.enabled || !sw.isPilotWriter) return false;
    return sw.capabilities.indexOf(capability) !== -1;
  };
  // Why a capability is off, in words, for the UI and the diagnostics panel.
  App.writeBlockReason = function (capability) {
    if (POLICY[capability] !== true) return 'not approved for the V2 pilot';
    if (!BUSINESS.has(capability)) return null;
    const sw = App.serverWrite;
    if (!sw.known) return 'still checking what the server will accept';
    if (!sw.enabled) return 'business writes are switched off on the server';
    if (!sw.isPilotWriter) return 'this account is not in the write pilot';
    if (sw.capabilities.indexOf(capability) === -1) return 'the server has not enabled this capability';
    return null;
  };
  App.writePolicy = function () { return JSON.parse(JSON.stringify(POLICY)); };

  /* ── Instrumentation ───────────────────────────────────────────────────
     What was attempted, by whom, when. Deliberately NOT the payload: a body
     carries client names and clinical notes, and a pilot does not need them
     to prove a write was stopped. */
  const attempts = [];
  App.writeAttempts = attempts;

  function whoAmI() {
    try {
      const p = window.P;
      if (p && p.name) return { profile: p.id, name: p.name };
      const acct = (window.TributeAuth && TributeAuth.getAccount && TributeAuth.getAccount()) || null;
      if (acct) return { profile: null, name: acct.username || acct.name || 'signed-in' };
    } catch (e) {}
    return { profile: null, name: 'unknown' };
  }

  App.recordBlockedWrite = function (info) {
    const who = whoAmI();
    const row = {
      at: new Date().toISOString(),
      user: who.name,
      profile: who.profile,
      feature: info.feature || '(unnamed)',
      capability: info.capability || '',
      endpoint: info.endpoint || '',
      operation: info.operation || 'POST',
      blockedBy: info.leak ? 'FETCH GUARD (a write path was missed)' : 'write policy'
    };
    attempts.push(row);
    try {
      console.warn('[V2] write blocked:', row.feature, '->', row.endpoint, '(' + row.capability + ')');
    } catch (e) {}
    updateBadge();
    return row;
  };

  /* Approved writes that actually happened. Same rule as the blocked log:
     who, when, what capability, which endpoint, whether it worked, and a
     record type — never the body, which carries client names and notes. */
  const writes = [];
  App.writeLog = writes;
  App.recordWrite = function (info) {
    const row = {
      at: new Date().toISOString(),
      user: whoAmI(),
      capability: info.capability,
      endpoint: info.endpoint,
      operation: info.operation || 'POST',
      recordType: info.recordType || null,
      recordId: info.recordId || null,
      ok: info.ok === true,
      status: info.status || null
    };
    writes.push(row);
    updateBadge();
    return row;
  };
  let duplicatePrevented = 0;
  App.recordDuplicatePrevented = function (what) {
    duplicatePrevented++;
    try { console.warn('[V2] duplicate prevented:', what); } catch (e) {}
    return duplicatePrevented;
  };

  App.writeReport = function () {
    const byFeature = {};
    attempts.forEach(function (a) { byFeature[a.feature] = (byFeature[a.feature] || 0) + 1; });
    const leaks = attempts.filter(function (a) { return /FETCH GUARD/.test(a.blockedBy); });
    const ok = writes.filter(function (w) { return w.ok; });
    const bad = writes.filter(function (w) { return !w.ok; });
    return {
      environment: App.environment,
      // The goal is no longer "no writes". It is "no writes we did not approve".
      approvedBusinessWrites: ok.length,
      blockedBusinessWrites: attempts.filter(function (a) {
        return App.isBusinessCapability(a.capability); }).length,
      pilotFeedbackSubmissions: App.feedbackWrites || 0,
      policyLeaks: leaks.length,
      duplicatePrevented: duplicatePrevented,
      failedWrites: bad.length,
      // Context for the panel
      writesEnabledOnServer: App.serverWrite.enabled && App.serverWrite.known,
      isPilotWriter: App.serverWrite.isPilotWriter,
      enabledCapabilities: Object.keys(POLICY).filter(function (c) { return App.canWrite(c); }),
      byFeature: byFeature,
      leakDetail: leaks,
      writeLog: writes.slice(),
      attempts: attempts.slice()
    };
  };

  /* ── Telling the user ──────────────────────────────────────────────────
     Never let someone believe a save happened. Two shapes, and the choice
     is per workflow: an action with real-world consequences outside the hub
     (sending mail, texting a caregiver, writing to Viv) is DISABLED, because
     a disabled control cannot be misread. An edit that only ever reached the
     shared document stays usable so the interaction can be evaluated, and
     says plainly that it was not saved. */
  const NOTE = 'Preview only — changes are not saved.';
  App.previewNote = NOTE;

  let toastTimer = null;
  App.previewToast = function (msg) {
    let el = document.getElementById('v2-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'v2-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg || NOTE;
    el.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = ''; }, 4200);
  };

  function updateBadge() {
    const el = document.getElementById('v2-blocked-count');
    if (!el) return;
    const sw = App.serverWrite;
    if (!sw.known)        el.textContent = 'checking\u2026';
    else if (!sw.enabled) el.textContent = 'writes off';
    else if (!sw.isPilotWriter) el.textContent = 'read-only';
    else el.textContent = writes.length ? writes.length + ' saved' : 'write pilot';
  }
  App.updateWriteBadge = updateBadge;

  /* ── Wrapping ──────────────────────────────────────────────────────────
     Each entry names the production function, the capability it needs, the
     endpoint it would have called, and what to do instead. `guard` runs
     BEFORE the original, so no request is ever built. */
  function deny(spec) {
    App.recordBlockedWrite({
      feature: spec.feature, capability: spec.capability,
      endpoint: spec.endpoint, operation: spec.operation || 'POST'
    });
    if (spec.onDeny) { try { spec.onDeny(); } catch (e) {} }
    else App.previewToast(spec.message || NOTE);
  }

  const wrapped = [];
  function gate(name, spec) {
    const orig = window[name];
    if (typeof orig !== 'function') { wrapped.push({ name: name, status: 'MISSING' }); return; }
    const fn = function () {
      if (!App.canWrite(spec.capability)) { deny(spec); return spec.returns; }
      return orig.apply(this, arguments);
    };
    fn.__v2 = true;
    fn.original = orig;
    window[name] = fn;
    wrapped.push({ name: name, status: 'GATED', capability: spec.capability });
  }

  App.installWritePolicy = function () {
    if (App.__policyInstalled) return wrapped;
    App.__policyInstalled = true;

    // The shared document. Every client edit, note, to-do, tier change,
    // Pulse acknowledgement and KPI entry reaches storage through here.
    gate('saveToFile', {
      feature: 'Shared document save', capability: 'csm_data_pocket',
      endpoint: 'vivProxy?endpoint=csm_data', operation: 'POST',
      onDeny: function () {
        if (typeof window.setSyncStatus === 'function') {
          window.setSyncStatus('err', 'Preview — not saved');
        }
        App.previewToast('Preview only — your change is shown here but not saved to the shared document.');
      }
    });
    // Stop the debounce too, so a blocked save is reported once per edit
    // rather than once per keystroke burst.
    gate('queueSave', {
      feature: 'Shared document save (queued)', capability: 'csm_data_pocket',
      endpoint: 'vivProxy?endpoint=csm_data', operation: 'POST',
      onDeny: function () {
        if (typeof window.setSyncStatus === 'function') {
          window.setSyncStatus('err', 'Preview — not saved');
        }
      }
    });

    /* DATA.shared editors. The payload guard above already makes these
       harmless, but a change that quietly does nothing is worse than one
       that says why, so each is gated and explains itself. */
    [['saveCovNote','Coverage note'],
     ['setMdCadence','Maryland visit cadence'],
     ['saveCommunity','Community directory entry'],
     ['ecSkipWeek','Skip this week\u2019s community email'],
     ['setFpStatus','Fill Priority status'],
     ['setFpOrder','Fill Priority order'],
     ['createFpEvent','Fill Priority event'],
     ['saveSettings','Hub settings']].forEach(function (pair) {
      gate(pair[0], {
        feature: pair[1], capability: 'csm_data_shared',
        endpoint: 'vivProxy?endpoint=csm_data', operation: 'POST',
        message: pair[1] + ' is shared across the whole team. V2 is not saving '
               + 'those yet \u2014 use V1 for this one.'
      });
    });

    gate('ltcAct', {
      feature: 'LTC submission action', capability: 'ltc_action',
      endpoint: 'vivProxy?endpoint=ltc_board', operation: 'POST',
      message: 'Preview only — approvals and send-state changes are not written.'
    });
    gate('ltcSend', {
      feature: 'LTC packet send', capability: 'ltc_send',
      endpoint: 'vivProxy?endpoint=ltc_send', operation: 'POST',
      message: 'Preview only — nothing was sent to the carrier.'
    });
    gate('ltcSendNudge', {
      feature: 'LTC caregiver nudge (SMS)', capability: 'ltc_nudge',
      endpoint: 'vivProxy?endpoint=ltc_nudge', operation: 'POST',
      message: 'Preview only — no text message was sent.'
    });

    gate('lpSaveVisit', {
      feature: 'Write visit to Viv', capability: 'csm_visit',
      endpoint: 'vivProxy?endpoint=csm_visit', operation: 'POST',
      message: 'Preview only — the visit was not written to Viv.'
    });
    gate('removeLinkedVisit', {
      feature: 'Delete visit in Viv', capability: 'csm_visit',
      endpoint: 'vivProxy?endpoint=csm_visit&action=delete', operation: 'POST',
      message: 'Preview only — nothing was deleted in Viv.'
    });
    gate('_lpAddToOutlook', {
      feature: 'Create Outlook event', capability: 'graph_calendar',
      endpoint: 'graph.microsoft.com/v1.0/me/events', operation: 'POST',
      message: 'Preview only — no calendar event was created.'
    });
    gate('_deleteOutlookEvent', {
      feature: 'Delete Outlook event', capability: 'graph_calendar',
      endpoint: 'graph.microsoft.com/v1.0/me/events/{id}', operation: 'DELETE',
      message: 'Preview only — no calendar event was deleted.'
    });

    gate('ecSaveDraft', {
      feature: 'Save community email draft', capability: 'community_draft_save',
      endpoint: 'vivProxy?endpoint=community_email&save=1', operation: 'POST',
      message: 'Preview only — the draft was not saved.'
    });
    gate('ecSend', {
      feature: 'Send community email', capability: 'community_send',
      endpoint: 'vivProxy?endpoint=community_email&send=1 + graph sendMail', operation: 'POST',
      message: 'Preview only — no email was sent, not even a test to yourself.'
    });
    gate('saveEmailComm', {
      feature: 'Save community email settings', capability: 'csm_data_shared',
      endpoint: 'vivProxy?endpoint=csm_data', operation: 'POST',
      message: 'Preview only — community settings are not saved.'
    });

    // _ecPost is the shared poster for render=1 / save=1. Render is allowed
    // because it only turns parts into HTML; save is not.
    const origEcPost = window._ecPost;
    if (typeof origEcPost === 'function') {
      window._ecPost = function (q, parts) {
        const query = String(q || '');
        if (/save=1|send=1|test=1/.test(query)) {
          if (!App.canWrite('community_draft_save')) {
            deny({ feature: 'Community email persist', capability: 'community_draft_save',
                   endpoint: 'vivProxy?endpoint=community_email&' + query, operation: 'POST',
                   message: 'Preview only — the draft was not saved.' });
            return Promise.resolve({ ok: false, v2Blocked: true });
          }
        }
        return origEcPost.apply(this, arguments);
      };
      window._ecPost.__v2 = true;
      window._ecPost.original = origEcPost;
      wrapped.push({ name: '_ecPost', status: 'GATED (save/send only)', capability: 'community_draft_save' });
    } else {
      wrapped.push({ name: '_ecPost', status: 'MISSING' });
    }

    installFetchTripwire();
    updateBadge();
    return wrapped;
  };
  App.writeGates = function () { return wrapped.slice(); };

  /* ── The tripwire ──────────────────────────────────────────────────────
     Not the mechanism — the proof. If a non-GET to a production host ever
     reaches the network, a write path was missed above. It is recorded as a
     POLICY LEAK, loudly, and stopped. In a correct Phase 1 this never fires,
     and writeReport().policyLeaks is 0. */
  function installFetchTripwire() {
    if (window.__v2Tripwire) return;
    window.__v2Tripwire = true;
    const real = window.fetch.bind(window);
    window.fetch = function (url, opts) {
      const u = String((url && url.url) || url || '');
      const method = String((opts && opts.method) || 'GET').toUpperCase();
      const prod = /azurewebsites\.net|graph\.microsoft\.com|tributehomecare\.com/i.test(u);
      if (!prod || method === 'GET' || method === 'HEAD') {
        return real(url, opts);
      }

      // Allowed non-GET reads, by capability.
      const ep = (/[?&]endpoint=([a-z0-9_]+)/.exec(u) || [])[1] || '';
      if (ep === 'csm_assist' && App.canWrite('assist')) return real(url, opts);
      // Pilot feedback: allowed, and tallied on its own counter so the
      // business-write total stays 0.
      if (ep === 'v2_feedback' && App.canWrite('v2_feedback')) {
        App.feedbackWrites = (App.feedbackWrites || 0) + 1;
        return real(url, opts);
      }
      // usage_time is a known write and is named rather than reported as a
      // missed path, so a genuine leak stays visible in policyLeaks.
      if (ep === 'usage_time') {
        App.recordBlockedWrite({ feature: 'Active-time usage telemetry',
          capability: 'usage_telemetry', endpoint: u.split('?')[0] + '?endpoint=usage_time',
          operation: method });
        return Promise.resolve(new Response(JSON.stringify({ ok: false, v2Blocked: true }),
          { status: 202, headers: { 'Content-Type': 'application/json' } }));
      }
      if (ep === 'community_email' && /render=1/.test(u) && !/save=1|send=1|test=1/.test(u)
          && App.canWrite('community_render')) return real(url, opts);

      /* ── Approved business writes ──────────────────────────────────────
         These go to V1's own endpoints, unchanged. V2 adds two headers so
         the server can apply the pilot allow-list and the kill switch to
         V2 traffic without affecting V1, which sends neither header. The
         result is recorded: an approved write is a fact to be counted, not
         a silent pass-through. */
      /* The payload guard that used to live here rewrote the outgoing
         DATA.shared to the last copy the server had sent. It existed because
         V1's 409 retry replaced shared keys wholesale. That retry is now a
         three-way merge at record level (TD-30), so substituting a remembered
         copy would itself discard whatever the merge had just reconciled.
         Removed deliberately; the capability gates below still refuse the
         shared-key editors, which is now about policy rather than safety. */

      const APPROVED = [
        { test: function () { return ep === 'csm_data'; },
          capability: 'csm_data_pocket', recordType: 'csm_data document' },
        { test: function () { return ep === 'community_email' && /save=1/.test(u) && !/send=1|test=1/.test(u); },
          capability: 'community_draft_save', recordType: 'community draft' }
      ];
      for (let i = 0; i < APPROVED.length; i++) {
        const a = APPROVED[i];
        if (!a.test()) continue;
        if (!App.canWrite(a.capability)) {
          App.recordBlockedWrite({ feature: a.recordType, capability: a.capability,
            endpoint: u.split('?')[0] + '?endpoint=' + ep, operation: method });
          App.previewToast('Not saved — ' + App.writeBlockReason(a.capability) + '.');
          return Promise.resolve(new Response(JSON.stringify(
            { error: 'v2: ' + App.writeBlockReason(a.capability), v2Blocked: true }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }));
        }
        let o = Object.assign({}, opts || {});
        o.headers = Object.assign({}, (opts && opts.headers) || {},
          { 'X-Tribute-Surface': 'v2-preview', 'X-Tribute-Capability': a.capability });
        return real(url, o).then(function (r) {
          App.recordWrite({ capability: a.capability, endpoint: 'vivProxy?endpoint=' + ep,
            operation: method, recordType: a.recordType, ok: r.ok, status: r.status });
          return r;
        }, function (err) {
          App.recordWrite({ capability: a.capability, endpoint: 'vivProxy?endpoint=' + ep,
            operation: method, recordType: a.recordType, ok: false, status: 'network' });
          throw err;
        });
      }

      App.recordBlockedWrite({
        feature: 'UNGATED WRITE PATH', capability: ep || 'unknown',
        endpoint: u.split('?')[0] + (ep ? '?endpoint=' + ep : ''),
        operation: method, leak: true
      });
      App.previewToast('Preview only — that action would have written to production and was stopped.');
      return Promise.resolve(new Response(
        JSON.stringify({ error: 'v2-preview: writes are disabled', v2Blocked: true }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    };
  }

  /* Ask the server what it will accept, as soon as there is a token to ask
     with. Until it answers, canWrite() says no to every business capability,
     so the page cannot offer a control whose write would be refused. */
  function askServer() {
    // bridge.js exposes each reader as a GETTER on TributeApp itself, not as
    // a function under .fn — so this is a property read, not a call.
    // VIV_PROXY is a top-level const in index.html and therefore not on
    // window (TD-07), which makes the bridge the only way to reach it.
    const proxy = App.vivProxy || '';
    const gate = window.tributeKsfGate;
    if (!proxy || !gate || !gate.getToken) return false;
    App.loadWriteConfig(proxy, async function () {
      const t = await gate.getToken();
      return t ? { Authorization: 'Bearer ' + t } : {};
    });
    return true;
  }
  App.refreshWriteConfig = askServer;
  if (!askServer()) {
    const ct = setInterval(function () { if (askServer()) clearInterval(ct); }, 300);
    setTimeout(function () { clearInterval(ct); }, 30000);
  }
  // Re-ask periodically so flipping the kill switch reaches an open tab
  // without anyone having to reload it.
  setInterval(askServer, 60000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { App.installWritePolicy(); });
  } else {
    App.installWritePolicy();
  }
  // The application's own script may define these after us.
  const t = setInterval(function () {
    if (window.saveToFile && !window.saveToFile.__v2) { App.__policyInstalled = false; App.installWritePolicy(); }
  }, 120);
  setTimeout(function () { clearInterval(t); }, 10000);
})();
