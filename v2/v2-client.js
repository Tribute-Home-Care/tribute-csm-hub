/* ===========================================================================
   CSM Hub V2 — client reads
   ---------------------------------------------------------------------------
   One small cache in front of two GETs:

     endpoint=csm_client   — address, contacts, service facts, caregiver
                             schedule and the care team derived from it
     endpoint=csm_careplan — the approved care plan, grouped by the form's
                             own sections

   Both are reads. There is no write here, no store, no sync layer and no
   copy of anything: a record lives for as long as the tab does and is asked
   for again when it goes stale. Viv stays the source of truth.

   If this file is absent the workspace still renders — it just shows what the
   Hub's own roster already knows and says the rest is loading nowhere. That
   is deliberate: the local prototype has no production endpoint to call.
   =========================================================================== */
(function () {
  'use strict';

  var TTL = 10 * 60 * 1000;         // a schedule changes; ten minutes is plenty
  /* A READ HAS TO FINISH OR FAIL. Courtney, 17 Nov, priority 7: "Today and
     Schedule both sat on 'Reading… from Viv' while I was clicking through."

     There was no timeout. fetch() with nothing to stop it waits as long as the
     other end holds the socket open, so a hung proxy left the entry in
     `loading` for the life of the tab and the page said "Reading…" forever.
     Worse, reload() deliberately refuses to reset an entry that is still
     loading, so there was no way back even by hand.

     Twenty seconds. A client read that has not answered in twenty seconds is
     not going to, and "Viv did not answer" with a Try again is a far better
     thing to show a CSM than a sentence that never changes. */
  var READ_TIMEOUT = 20000;
  var store = {};                    // cid -> { kind: entry }
  var EV = 'tribute:client-data';

  function entry(cid, kind) {
    var c = store[cid] || (store[cid] = {});
    return c[kind] || (c[kind] = { state: 'idle', data: null, error: null, at: 0 });
  }

  function proxy() {
    var A = window.TributeApp;
    var p = A && A.vivProxy;
    if (typeof p === 'string' && p) return p;
    return (typeof VIV_PROXY !== 'undefined' && VIV_PROXY) || '';
  }

  async function headers() {
    if (typeof window.dataHeaders === 'function') return await window.dataHeaders();
    return {};
  }

  function announce(cid, kind) {
    try {
      window.dispatchEvent(new CustomEvent(EV, { detail: { cid: cid, kind: kind } }));
    } catch (e) {}
  }

  var KIND = {
    client:   function (cid) { return '?endpoint=csm_client&cid=' + encodeURIComponent(cid); },
    careplan: function (cid) { return '?endpoint=csm_careplan&cid=' + encodeURIComponent(cid); }
  };

  function load(cid, kind) {
    if (!/^[a-f0-9]{24}$/i.test(String(cid || ''))) return Promise.resolve(null);
    var e = entry(cid, kind);
    if (e.state === 'loading') return e.promise;
    if (e.state === 'ready' && Date.now() - e.at < TTL) return Promise.resolve(e.data);
    var base = proxy();
    if (!base) {
      // Nothing to call. Say so once rather than retrying forever.
      e.state = 'error';
      e.error = 'This build has no connection to Viv.';
      return Promise.resolve(null);
    }
    e.state = 'loading';
    e.error = null;
    e.promise = (async function () {
      var ctl = (typeof AbortController === 'function') ? new AbortController() : null;
      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        if (ctl) try { ctl.abort(); } catch (e2) {}
      }, READ_TIMEOUT);
      try {
        // The deadline covers the token too: acquiring one can hang in exactly
        // the same way, and from the page it looks identical.
        var h = await headers();
        var r = await fetch(base + KIND[kind](cid),
                            ctl ? { headers: h, signal: ctl.signal } : { headers: h });
        if (!r.ok) {
          // A 404 means two different things and they send a CSM to two
          // different places. "Viv has no record for this client" sends them
          // hunting through Viv; "the server does not have this yet" sends
          // them to us. Read what the server actually said before deciding.
          var said = null;
          try { said = (await r.json()).error || null; } catch (e) {}
          var missingOnServer = /unknown endpoint/i.test(said || '');
          var why = missingOnServer
                      ? 'This part of the Hub is not available on the server yet.'
                  : r.status === 401 || r.status === 403
                      ? 'Your session has expired. Reload the Hub to sign in again.'
                  : r.status === 404
                      ? (said || 'Viv has no record for this client.')
                  : (said || 'Viv did not answer (' + r.status + ').');
          var err = new Error(why);
          err.retryable = !missingOnServer;
          throw err;
        }
        var j = await r.json();
        e.data = j; e.state = 'ready'; e.at = Date.now(); e.error = null;
        return j;
      } catch (err) {
        // A failed read is reported as a failed read. It is never rendered as
        // "no visits scheduled" — an empty day and an unanswered question look
        // identical on screen and mean opposite things.
        e.state = 'error';
        e.error = timedOut
          ? 'Viv did not answer within 20 seconds.'
          : ((err && err.message) || 'Could not reach Viv.');
        e.retryable = timedOut || !err || err.retryable !== false;
        e.data = null;
        return null;
      } finally {
        // Always: a read that answered must not leave a timer armed to abort
        // the NEXT one, and a tab left open all day would accumulate them.
        clearTimeout(timer);
        e.promise = null;
        announce(cid, kind);
      }
    })();
    return e.promise;
  }

  function snapshot(cid, kind) {
    var e = entry(cid, kind);
    if (e.state === 'idle' || (e.state === 'ready' && Date.now() - e.at > TTL)) load(cid, kind);
    return { state: e.state, data: e.data, error: e.error, retryable: e.retryable !== false };
  }

  /* ── The caseload's contacts, in one read ───────────────────────────────
     Courtney, priority 12: "Search covers family contacts, GCMs, caregivers
     and phone numbers, not just clients. When a daughter calls, the CSM knows
     her name, not always the client's."

     The Hub's own roster cannot answer that. Measured on a real 42-client
     caseload, the `contact`, `contactEmail`, `caregivers` and `gcm` fields
     are empty on every single record, because CSMs keep that in Viv. So the
     search had nothing to search.

     The per-client read above would be one Viv call per client per keystroke,
     which is not a search. endpoint=csm_contacts answers for a whole caseload
     at once from a cache the survey crawl already builds, and carries names,
     relationships and phone numbers only.

     Asked for ONCE per session and never on a keystroke. A 202 means the
     cache is warming, so it is tried again later rather than treated as an
     empty answer: "no contacts" and "not yet" are different, and rendering
     the second as the first is how a search quietly lies. */
  var bulk = {};            // vivId -> [{n, r, p}]
  var bulkState = 'idle';   // idle | loading | ready | warming | failed

  function primeContacts(cids) {
    var want = (cids || []).filter(function (c) { return /^[a-f0-9]{24}$/i.test(String(c || '')); });
    if (!want.length) return Promise.resolve(bulk);
    if (bulkState === 'loading' || bulkState === 'ready') return Promise.resolve(bulk);
    var base = proxy();
    // NOT attempted is not FAILED. This runs from the first list render, which
    // can happen before the app has published its proxy URL; calling that a
    // failure made a startup race permanent for the session, because nothing
    // retries a failure. Leaving it idle means the next render tries again.
    if (!base) { bulkState = 'idle'; return Promise.resolve(bulk); }
    bulkState = 'loading';
    return (async function () {
      try {
        var h = await headers();
        var r = await fetch(base + '?endpoint=csm_contacts&cids=' +
                            encodeURIComponent(want.slice(0, 500).join(',')), { headers: h });
        if (r.status === 202) { bulkState = 'warming'; return bulk; }
        if (!r.ok) { bulkState = 'failed'; return bulk; }
        var j = await r.json();
        var by = (j && j.byClient) || {};
        Object.keys(by).forEach(function (k) { bulk[k] = by[k]; });
        bulkState = 'ready';
      } catch (e) {
        bulkState = 'failed';
      }
      announce('*', 'contacts');
      return bulk;
    })();
  }

  window.TributeClientData = {
    client:   function (cid) { return snapshot(cid, 'client'); },
    /* Contacts for one client, from whichever source has them. The full
       client read wins when it is loaded, because it is this client's record
       as it stands rather than a nightly crawl; the bulk answer is the
       fallback that makes the other forty-one searchable. */
    contacts: function (cid) {
      var e = store[cid] && store[cid].client;
      var d = e && e.state === 'ready' && e.data;
      if (d) {
        var out = [];
        if (d.primaryContact) out.push(d.primaryContact);
        (d.contacts || []).forEach(function (x) { if (x) out.push(x); });
        if (out.length) return out;
      }
      return (bulk[cid] || []).map(function (x) {
        return { name: x.n, relation: x.r, phone: x.p };
      });
    },
    primeContacts: primeContacts,
    contactsState: function () { return bulkState; },
    // The snapshot is for rendering: it returns whatever is in hand right
    // now. A caller that has to WAIT for the record (the weekly-email
    // recipient chooser) needs the promise, not a state flag.
    ready:    function (cid, kind) { return load(cid, kind || 'client'); },
    careplan: function (cid) { return snapshot(cid, 'careplan'); },
    reload:   function (cid) {
      var c = store[cid]; if (!c) return;
      Object.keys(c).forEach(function (k) { if (c[k].state !== 'loading') c[k].state = 'idle'; });
      load(cid, 'client');
    },
    event: EV
  };
})();
