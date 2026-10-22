/* tribute-usage.js — active time on Tribute's tools (2026-10-21).
   Counts a second only while the page is in front AND the person clicked, typed,
   scrolled or moved the pointer in the last minute, so a tab left open counts
   nothing. Sends the seconds in chunks about every 5 minutes and when the tab is
   hidden or closed. Totals are shown to everyone by tool and job title; names
   only to admins. The same file is copied into Rise and CSM Hub.

   TributeUsage.start({ app: "ksf" | "rise" | "csm", getToken: async () => token, view?: "Tab name" })
   TributeUsage.start({ app: "calls", endpoint: "/usage/time" })   // same-origin; the app's server adds who
   TributeUsage.setView("DocuSign Assist")   // when an app switches tabs */
(function () {
  "use strict";
  if (window.TributeUsage) return;
  const API = "https://tribute-api-prod-bkc4hfcwf3f2f6bf.centralus-01.azurewebsites.net/api/vivProxy?endpoint=usage_time";
  const IDLE_MS = 60000, TICK_MS = 5000, FLUSH_S = 300;
  let cfg = null, view = "", lastInput = Date.now(), acc = {}, token = null, timer = null, sending = false;
  const now = () => Date.now();
  const active = () => document.visibilityState === "visible" && now() - lastInput < IDLE_MS;
  const total = () => Object.values(acc).reduce((a, s) => a + s, 0);
  async function refreshToken() { if (!cfg.getToken) { token = "none"; return; } try { token = (await cfg.getToken()) || token; } catch (e) { /* keep the last one */ } }
  function tick() {
    if (!active()) return;
    acc[view] = (acc[view] || 0) + TICK_MS / 1000;
    if (total() >= FLUSH_S) flush(false);
  }
  // keepalive lets the request finish while the page unloads; it needs a token in hand.
  async function flush(unloading) {
    const chunks = Object.entries(acc).filter(([, s]) => s >= 1).map(([v, s]) => ({ app: cfg.app, page: location.pathname, view: v || undefined, seconds: Math.min(900, Math.round(s)) }));
    if (!chunks.length || sending) return;
    acc = {};
    if (!unloading) await refreshToken();
    if (!token) { chunks.forEach((c) => { acc[c.view || ""] = (acc[c.view || ""] || 0) + c.seconds; }); return; }
    sending = !unloading;
    try {
      const headers = { "Content-Type": "application/json" }; if (cfg.getToken) headers.Authorization = "Bearer " + token;
      const r = await fetch(cfg.endpoint || API, { method: "POST", keepalive: true, credentials: cfg.endpoint ? "same-origin" : "omit", headers, body: JSON.stringify({ chunks }) });
      if (!r.ok && r.status === 401) { token = null; chunks.forEach((c) => { acc[c.view || ""] = (acc[c.view || ""] || 0) + c.seconds; }); }
    } catch (e) { if (!unloading) chunks.forEach((c) => { acc[c.view || ""] = (acc[c.view || ""] || 0) + c.seconds; }); }
    finally { sending = false; }
  }
  const touch = () => { lastInput = now(); };
  let lastMove = 0;
  const move = () => { const t = now(); if (t - lastMove > 2000) { lastMove = t; touch(); } };
  window.TributeUsage = {
    start(o) {
      if (cfg || !o || !o.app || (typeof o.getToken !== "function" && !o.endpoint)) return;
      cfg = o; view = o.view || ""; lastInput = now();
      ["pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));
      window.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); else touch(); });
      window.addEventListener("pagehide", () => flush(true));
      refreshToken();
      timer = setInterval(tick, TICK_MS);
    },
    setView(v) { const nv = String(v || "").slice(0, 60); if (nv !== view) { view = nv; touch(); } },
    // For tests: what has been counted and not yet sent.
    _pending() { return Object.assign({}, acc); },
  };
})();
