/* ═══════════════════════════════════════════════════════════════════════════
   CSM HUB V2 PREVIEW — WRITE POLICY
   ═══════════════════════════════════════════════════════════════════════════
   V2 reads production for real and writes nothing.

   The local prototype blocked writes by replacing window.fetch. That was
   right for a machine with no credentials and wrong for a deployment that
   holds a real Entra token: a global interceptor is one typo away from
   either letting a write through or breaking a read, and it decides by
   sniffing URLs rather than by knowing what a feature does.

   So the mechanism here is a CAPABILITY the application asks about:

       TributeApp.environment            === 'v2-preview'
       TributeApp.canWrite('csm_data')   === false

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
     Phase 1: every capability that changes stored state is false.
     `assist` and `render` are POSTs that mutate nothing; they stay on so the
     Assistant and the email preview can be evaluated, and they are named
     separately so either can be switched off without touching the rest. */
  const POLICY = {
    csm_data: false,            // the shared document — ALL CSM edits funnel here
    ltc_action: false,          // approve / mark sent / confirm / reopen
    ltc_send: false,            // send a submission packet to a carrier
    ltc_nudge: false,           // text a caregiver about missing notes
    csm_visit: false,           // create or delete a visit in Viv
    graph_calendar: false,      // create or delete an Outlook event
    graph_mail: false,          // send mail from the CSM's mailbox
    community_draft_save: false,// persist an edited community draft
    community_send: false,      // send the community email, including a test
    weekly_schedule: false,     // not built in production at all
    usage_telemetry: false,     // active-time tracking: a preview must not
                                // write usage rows or skew real usage stats

    assist: true,               // POST, but a question — mutates nothing
    community_render: true,     // POST, but returns HTML — persists nothing

    // The ONE intentionally authorised V2 write. It is not a business write:
    // its own endpoint, its own container, nothing operational. It is counted
    // SEPARATELY so a feedback submission can never make the diagnostics
    // panel imply that V2 has modified operational data.
    v2_feedback: true
  };

  App.canWrite = function (capability) { return POLICY[capability] === true; };
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

  App.writeReport = function () {
    const byFeature = {};
    attempts.forEach(function (a) { byFeature[a.feature] = (byFeature[a.feature] || 0) + 1; });
    const leaks = attempts.filter(function (a) { return /FETCH GUARD/.test(a.blockedBy); });
    return {
      environment: App.environment,
      // Two different things, never added together.
      businessWrites: 0,
      productionWrites: 0,
      pilotFeedbackSubmissions: App.feedbackWrites || 0,
      blockedAttempts: attempts.length,
      byFeature: byFeature,
      policyLeaks: leaks.length,
      leakDetail: leaks,
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
    if (el) el.textContent = attempts.length ? attempts.length + ' blocked' : 'read-only';
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
      feature: 'Shared document save', capability: 'csm_data',
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
      feature: 'Shared document save (queued)', capability: 'csm_data',
      endpoint: 'vivProxy?endpoint=csm_data', operation: 'POST',
      onDeny: function () {
        if (typeof window.setSyncStatus === 'function') {
          window.setSyncStatus('err', 'Preview — not saved');
        }
      }
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
      feature: 'Save community email settings', capability: 'csm_data',
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
      if (!prod || method === 'GET' || method === 'HEAD') return real(url, opts);

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
