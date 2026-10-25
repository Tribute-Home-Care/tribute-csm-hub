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
      try {
        var r = await fetch(base + KIND[kind](cid), { headers: await headers() });
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
        e.error = (err && err.message) || 'Could not reach Viv.';
        e.retryable = !err || err.retryable !== false;
        e.data = null;
        return null;
      } finally {
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

  window.TributeClientData = {
    client:   function (cid) { return snapshot(cid, 'client'); },
    careplan: function (cid) { return snapshot(cid, 'careplan'); },
    reload:   function (cid) {
      var c = store[cid]; if (!c) return;
      Object.keys(c).forEach(function (k) { if (c[k].state !== 'loading') c[k].state = 'idle'; });
      load(cid, 'client');
    },
    event: EV
  };
})();
