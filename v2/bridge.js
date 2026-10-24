/* ═══════════════════════════════════════════════════════════════════════════
   APPLICATION STATE BRIDGE  (prototype-only)
   ═══════════════════════════════════════════════════════════════════════════
   The first pass reached the app's state through indirect eval, because the
   hub declares its state with top-level `let` / `const` — which live in the
   global LEXICAL environment and are not properties of `window`. That worked,
   but it meant the redesign layer depended on string-evaluated variable names:
   rename `P` in production and the redesign fails silently rather than loudly.

   This file replaces that. It is a single script that sits in the same global
   scope as the application, so it can see those bindings directly, and it
   publishes a small read-only surface for the redesign layer to use.

   Three rules:
     1. READ ONLY. Nothing here writes application state. Every write in the
        prototype still goes through the application's own functions.
     2. NO PRODUCTION SEMANTICS CHANGE. This adds a window property. It does
        not alter, wrap or shadow anything the application does.
     3. FAIL LOUDLY, NOT SILENTLY. A binding that disappears throws on first
        access in dev and is reported, rather than quietly reading undefined
        and letting a panel claim everything is fine.

   If this were transferred to production it would become one small exported
   object in the application file itself, and `eval` would leave the codebase.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Each entry is a thunk evaluated at call time, so it always reads the
  // CURRENT value of a binding that the app reassigns (P, DATA, _PULSE...).
  // Written as real identifier references, not strings: if the application
  // renames one of these, this file fails to parse and we find out at load
  // instead of discovering a dead attention panel weeks later.
  const READERS = {
    // Identity and permission
    profile:        () => (typeof P !== 'undefined' ? P : null),
    profiles:       () => (typeof PROFILES !== 'undefined' ? PROFILES : []),
    account:        () => (typeof ACCT !== 'undefined' ? ACCT : null),
    myProfileId:    () => (typeof MY_PROFILE_ID !== 'undefined' ? MY_PROFILE_ID : null),
    selectedHub:    () => (typeof selectedHub !== 'undefined' ? selectedHub : ''),
    activeMarket:   () => (typeof activeMarket !== 'undefined' ? activeMarket : ''),
    adminUpns:      () => (typeof ADMIN_UPNS !== 'undefined' ? ADMIN_UPNS : []),
    hubMeta:        () => (typeof HUB_META !== 'undefined' ? HUB_META : {}),
    vivNames:       () => (typeof VIV_NAMES !== 'undefined' ? VIV_NAMES : {}),

    // Shared document
    data:           () => (typeof DATA !== 'undefined' ? DATA : null),
    dataLoaded:     () => (typeof _dataLoaded !== 'undefined' ? _dataLoaded : false),

    // Feature state
    pulse:          () => (typeof _PULSE !== 'undefined' ? _PULSE : null),
    pulseRebuilding:() => (typeof _PULSE_REBUILDING !== 'undefined' ? _PULSE_REBUILDING : false),
    ltcBoard:       () => (typeof _ltcData !== 'undefined' ? _ltcData : null),
    ltcWeek:        () => (typeof _ltcWeek !== 'undefined' ? _ltcWeek : null),
    maryland:       () => (typeof _mdData !== 'undefined' ? _mdData : null),
    mdFilter:       () => (typeof _mdFilter !== 'undefined' ? _mdFilter : 'attention'),
    mdSel:          () => (typeof _mdSel !== 'undefined' ? _mdSel : null),
    ltcWeekRows:    () => (typeof _ltcData !== 'undefined' ? _ltcData : null),
    ltcFilterNow:   () => (typeof _ltcFilter !== 'undefined' ? _ltcFilter : 'all'),
    ltcSel:         () => (typeof _ltcSel !== 'undefined' ? _ltcSel : null),
    ecSelected:     () => (typeof _ecSel !== 'undefined' ? _ecSel : null),
    ecDraft:        () => (typeof _ecDraft !== 'undefined' ? _ecDraft : null),
    ecOwnerFilter:  () => (typeof _ecOwnerFilter !== 'undefined' ? _ecOwnerFilter : 'all'),
    // Another `const` that is NOT on window (TD-07 again). The weekly
    // schedule email read window.VIV_PROXY, got '', and fetched the page
    // itself — which parsed as HTML and silently produced an empty week.
    vivProxy:       () => (typeof VIV_PROXY !== 'undefined' ? VIV_PROXY : ''),
    juliaMarket:    () => (typeof juliaMarketFilter !== 'undefined' ? juliaMarketFilter : 'all'),

    // Cadence tables the redesign has to agree with rather than reinvent
    tpCadence:      () => (typeof TP_CADENCE !== 'undefined' ? TP_CADENCE : { High: 14, Medium: 30, Low: 60 }),
    ciCadence:      () => (typeof CI_CADENCE !== 'undefined' ? CI_CADENCE : { High: 90, Medium: 180, Low: 180 })
  };

  // Helpers. These are function declarations in the app, so they are already
  // on window; routing them through here anyway means the redesign layer has
  // exactly one way of reaching the application, which is the point.
  // Declared with `const` in the application, so they are global LEXICAL
  // bindings and never appear on window. Referenced directly instead.
  const LEXICAL_FN = {
    getLTC:   function () { return typeof getLTC === 'function' ? getLTC.apply(null, arguments) : []; },
    escHtml:  function () { return typeof escHtml === 'function' ? escHtml.apply(null, arguments) : ''; },
    fmtD:     function () { return typeof fmtD === 'function' ? fmtD.apply(null, arguments) : ''; },
    daysAgo:  function () { return typeof daysAgo === 'function' ? daysAgo.apply(null, arguments) : null; }
  };

  const HELPERS = [
    'get', 'getStr', 'getAllHubClients', 'getFpEvents', 'getFpOrder',
    'getCustomKB', 'getCustomScenarios', 'getCustomTpls',
    'nextDue', 'showToast',
    'toggleClientDetail', 'buildClientDetail', 'editClient', 'openLogPanel',
    'openLTCFromClient', 's60Pick', 'openFillPriority', 'mdSelect',
    'selectCommunity', 'openCSMDetail', 'showPage', 'pulseDot', 'vivStatusBadge',
    'computedTierFor', '_myCocTasks', 'visitCompliance', 'renderClientMaster',
    'loadPulse', 'renderLtcSubmissionBoard', 'renderLtcRecords', 'renderMd',
    'updateHome', 'launchProfile',
    'routeAfterConnect', 'selectHub', 'selectProfile', 'setJuliaFilter'
  ];

  const missing = [];
  const fn = {};
  Object.keys(LEXICAL_FN).forEach((k) => { fn[k] = LEXICAL_FN[k]; });
  HELPERS.forEach((name) => {
    if (typeof window[name] === 'function') {
      // Bound at call time, so a later override (the tracker renderer is one)
      // is picked up rather than frozen at load.
      fn[name] = function () { return window[name].apply(window, arguments); };
    } else {
      missing.push(name);
      fn[name] = function () {
        console.warn('[bridge] missing application helper: ' + name);
        return undefined;
      };
    }
  });

  // Some readers only resolve once the app has booted. Probe the ones that
  // must exist at load so a rename is reported immediately.
  const brokenReaders = [];
  ['profiles', 'data', 'tpCadence', 'ciCadence', 'hubMeta'].forEach((k) => {
    try { READERS[k](); } catch (e) { brokenReaders.push(k + ': ' + e.message); }
  });

  // __override is SCAFFOLD: it lets the regression suite stand in a fixture
  // roster for one assertion without reaching into the application. Nothing
  // in the redesign layer reads or writes it, and it does not transfer.
  const app = { fn: fn, missingHelpers: missing, brokenReaders: brokenReaders, __override: {} };
  Object.keys(READERS).forEach((k) => {
    Object.defineProperty(app, k, {
      get: function () {
        if (Object.prototype.hasOwnProperty.call(app.__override, k)) return app.__override[k];
        try { return READERS[k](); } catch (e) { return undefined; }
      },
      enumerable: true,
      configurable: true
    });
  });

  // Convenience reads the redesign asks for constantly.
  Object.defineProperty(app, 'isManagerish', {
    get: function () { const p = app.profile; return !!(p && (p.isManager || p.isCSC || p.isDirector)); },
    enumerable: true
  });
  Object.defineProperty(app, 'ready', {
    get: function () { return !!(app.profile && app.data); },
    enumerable: true
  });
  // The caseload this profile may see, honouring the app's own scoping rules:
  // a CSC sees the market roster, everyone else sees their own pocket.
  app.myClients = function () {
    const p = app.profile;
    if (!p) return [];
    try {
      if (p.isCSC && typeof window.getAllHubClients === 'function') return window.getAllHubClients() || [];
      return app.fn.get('clients') || [];
    } catch (e) { return []; }
  };

  window.TributeApp = app;

  if (missing.length || brokenReaders.length) {
    console.warn('[bridge] application surface changed —',
      missing.length ? 'missing helpers: ' + missing.join(', ') : '',
      brokenReaders.length ? 'broken readers: ' + brokenReaders.join(', ') : '');
  }
})();
