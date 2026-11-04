// Does the Director view actually RUN, and does it behave?
//
// The static test next door asserts the rules are written down. This one
// executes the module against a stub DOM and synthetic profiles, because a
// syntax-clean module that throws on render is worse than no module, and
// because "an untrusted source is not shown as a result" is a behaviour, not
// a string.
//
// Synthetic throughout. No real client, CSM or market figure appears here.
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub/v2/v2-metrics.js'), 'utf8');
const PTO = fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub/v2/v2-pto.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? '  (' + d + ')' : '')); } };

function el(tag) {
  return { tagName: tag, className: '', children: [], _html: '',
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, classList: { add() {}, remove() {} }, parentNode: null, dataset: {} };
}

/* A fresh module per scenario. open() deliberately does not re-fetch when it
   already has an answer, so reusing one instance would quietly test the
   previous scenario's render. */
function boot(fetchImpl) {
  const pages = {};
  const home = el('div'); const main = el('div'); home.parentNode = main;
  const view = el('div');
  let painted = '';
  Object.defineProperty(view, 'innerHTML', { set(v) { painted = v; }, get() { return painted; } });
  const doc = { readyState: 'complete',
    getElementById(id) { return id === 'page-home' ? home : (pages[id] || null); },
    querySelector(s) { return s === '.main' ? main : null; },
    querySelectorAll() { return []; },
    createElement(t) { const e = el(t);
      Object.defineProperty(e, 'id', { set(v) { this._id = v; pages[v] = this; }, get() { return this._id || ''; } });
      return e; },
    addEventListener() {} };
  const ctx = { console, setTimeout, location: { hash: '' }, fetch: fetchImpl,
    tributeKsfGate: { getGraphToken: async () => 'stub-token' } };
  ctx.window = ctx; ctx.document = doc;
  vm.createContext(ctx);
  // The view calls into the PTO reader, so it loads first, exactly as the
  // built page orders the two script tags.
  vm.runInContext(PTO, ctx);
  vm.runInContext(SRC, ctx);
  const page = pages['page-metrics'];
  if (page) page.querySelector = (s) => (s === '#mx-view' ? view : null);
  return { ctx, page, painted: () => painted };
}

const PROFILE_BY_UPN = { 'courtney.chaulk@tributehomecare.com': { id: 'courtney', name: 'Courtney Chaulk', market: 'Massachusetts', isManager: true },
  'julia.hanna@tributehomecare.com': { id: 'julia', name: 'Julia Hanna', market: 'Massachusetts' },
  'jada.tiglao@tributehomecare.com': { id: 'jada', name: 'Jada Tiglao', market: 'Maryland', isManager: true } };
const matcher = (acct) => PROFILE_BY_UPN[String((acct || {}).username || '').toLowerCase()] || null;

const APP = { account: { username: 'tuadmin@tributehomecare.com' }, profileForAccount: matcher,
  adminUpns: ['tuadmin@tributehomecare.com'], profile: { id: 'tuadmin' },
  profiles: [{ id: 'julia', name: 'Julia Hanna', market: 'Massachusetts' },
             { id: 'jada', name: 'Jada Tiglao', market: 'Maryland' },
             { id: 'sam', name: 'Sam Noren', market: 'Massachusetts', isCSC: true }],
  tpCadence: { High: 14, Medium: 30, Low: 60 }, ciCadence: { High: 90, Medium: 180, Low: 180 },
  daysAgo: (d) => (d ? Math.round((Date.now() - new Date(d)) / 864e5) : null),
  nextDue: (lv, f) => { if (!lv || f === 'NA') return null;
    const x = new Date(lv); x.setDate(x.getDate() + (parseInt(f) || 90)); return x; },
  data: { profiles: {
    julia: { clients: [
      { id: 'c1', name: 'Synthetic One', tier: 'High', freq: '90', lastVisit: '2026-10-30' },
      { id: 'c2', name: 'Synthetic Two', tier: 'High', freq: '90', lastVisit: '2025-01-01' },
      { id: 'c3', name: 'Synthetic Three', tier: 'Low', freq: 'NA', isOffice: true }],
      touchpoints: [{ clientId: 'c1', date: '2026-11-01' }], checkins: [] },
    jada: { clients: [{ id: 'c4', name: 'Synthetic Four', tier: 'Medium', freq: '90',
      lastVisit: '2026-11-01', visitDeferred: true }],
      touchpoints: [{ clientId: 'c4', date: '2026-11-02' }], checkins: [] },
    sam: { clients: [{ id: 'c9', name: 'Should Not Appear', tier: 'High' }], touchpoints: [], checkins: [] } } } };

const reply = (body) => async (u) => ({ ok: true,
  json: async () => (/note_cadence/.test(u) ? body : { rows: [] }) });

const TRUSTED = { generatedAt: '2026-11-03T00:00:00Z', daysLeftInPeriod: 3, trusted: true,
  counts: { clients: 2, withNote: 1, missing: 1, flagged: 1, unknown: 1 },
  clients: [{ cid: 'c1', name: 'Synthetic One', market: 'Boston', csm: 'Julia Hanna', known: true, flagged: true },
            { cid: 'cx', name: 'Unreadable', market: 'Boston', csm: 'Julia Hanna', known: false, flagged: false }] };

// What the endpoint actually returns today.
const LIVE = { generatedAt: '2026-11-03T00:00:00Z', daysLeftInPeriod: 26, trusted: false,
  untrustedReason: 'The touch signal counts client-feed events of every type, including caregiver activity.',
  counts: { clients: 130, withNote: 114, missing: 16, flagged: 0, unknown: 0 },
  clients: [{ cid: 'c1', name: 'Synthetic One', market: 'Boston', csm: 'Julia Hanna', known: true, flagged: true }] };

function after(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  console.log('\n--- the page exists and the gate works ---');
  var A = boot(reply(TRUSTED));
  ok('#page-metrics is created at load, before any click', !!A.page);
  A.ctx.window.TributeApp = { account: { username: 'julia.hanna@tributehomecare.com' },
    adminUpns: ['tuadmin@tributehomecare.com'], profileForAccount: matcher, profile: { id: 'julia' } };
  A.ctx.window.TributeMetrics.render();
  ok('a non-owner is refused', A.painted().indexOf('limited to Client Solutions leadership') >= 0);
  // Courtney keeps the page while LOOKING AT one of her CSMs. The open
  // profile is Julia's; the signed-in identity is hers.
  A.ctx.window.TributeApp = { account: { username: 'courtney.chaulk@tributehomecare.com' },
    adminUpns: ['tuadmin@tributehomecare.com'], profileForAccount: matcher,
    profile: { id: 'julia' }, profiles: [], data: { profiles: {} } };
  A.ctx.window.TributeMetrics.render();
  ok('Courtney keeps it while viewing another CSM',
     A.painted().indexOf('limited to Client Solutions leadership') < 0);
  // And another manager does NOT get it by opening hers.
  A.ctx.window.TributeApp = { account: { username: 'jada.tiglao@tributehomecare.com' },
    adminUpns: ['tuadmin@tributehomecare.com'], profileForAccount: matcher,
    profile: { id: 'courtney' }, profiles: [], data: { profiles: {} } };
  A.ctx.window.TributeMetrics.render();
  ok('another manager cannot gain it by opening her profile',
     A.painted().indexOf('limited to Client Solutions leadership') >= 0);
  // No matcher at all fails closed rather than falling through.
  A.ctx.window.TributeApp = { account: { username: 'courtney.chaulk@tributehomecare.com' },
    adminUpns: [], profile: { id: 'courtney' } };
  A.ctx.window.TributeMetrics.render();
  ok('without the matcher it fails closed',
     A.painted().indexOf('limited to Client Solutions leadership') >= 0);
  A.ctx.window.TributeApp = APP;
  A.ctx.window.TributeMetrics.render();
  ok('an owner gets the page', A.painted().indexOf('Daily Metrics') >= 0);
  ok('and is told nothing has been read yet', A.painted().indexOf('Nothing has been read yet') >= 0);

  console.log('\n--- a trusted read produces exceptions ---');
  A.ctx.window.TributeMetrics.open();
  await after(60);
  var p = A.painted();
  ok('never contacted is surfaced', p.indexOf('Never contacted') >= 0);
  ok('an overdue visit is surfaced', p.indexOf('Visit past due') >= 0);
  ok('a flagged note is surfaced', p.indexOf('No note this month') >= 0);
  ok('a client that could not be read is reported', p.indexOf('counted neither way') >= 0);
  ok('a CSC caseload is excluded', p.indexOf('Should Not Appear') < 0);
  ok('an office client is excluded', p.indexOf('Synthetic Three') < 0);
  ok('a visit the CSM moved is not a miss', p.indexOf('Synthetic Four') < 0);

  console.log('\n--- the LIVE shape: trusted:false ---');
  var B = boot(reply(LIVE));
  B.ctx.window.TributeApp = APP;
  B.ctx.window.TributeMetrics.open();
  await after(60);
  var q = B.painted();
  ok('nothing is flagged from an untrusted source', q.indexOf('No note this month') < 0);
  ok('it is reported under Not measured', q.indexOf('Not measured') >= 0);
  ok('...with the reason it gave', q.indexOf('client-feed events of every type') >= 0);
  ok('...and says nothing is being flagged from it', q.indexOf('Nothing is being flagged from it') >= 0);
  // The whole point: 114 of 130 looks like 88% compliance and means nothing.
  ok('the misleading figure is never rendered', q.indexOf('114') < 0);
  ok('the real exceptions still appear', q.indexOf('Visit past due') >= 0);
  // "Nothing is off track" when a measure was skipped is the lie to avoid.
  ok('the all-clear is not claimed over a skipped measure',
     q.indexOf('Nothing is off track') < 0);

  console.log('\n--- a source that says nothing about trust is not believed ---');
  // Exactly the shape production returns until the API catches up with the
  // page. If silence were trusted, this would render the misleading figure.
  var SILENT = JSON.parse(JSON.stringify(LIVE));
  delete SILENT.trusted; delete SILENT.untrustedReason;
  var D = boot(reply(SILENT));
  D.ctx.window.TributeApp = APP;
  D.ctx.window.TributeMetrics.open();
  await after(60);
  var sp = D.painted();
  ok('an undeclared source flags nothing', sp.indexOf('No note this month') < 0);
  ok('...and is reported as unverified', sp.indexOf('has not confirmed that its numbers') >= 0);
  ok('...and its figure is still not rendered', sp.indexOf('114') < 0);
  ok('the real exceptions are unaffected', sp.indexOf('Visit past due') >= 0);

  console.log('\n--- an all-clear with a skipped measure is worded honestly ---');
  var C = boot(reply(LIVE));
  var CLEAN = JSON.parse(JSON.stringify(APP));
  // One client, contacted today, visited today: nothing to flag.
  CLEAN.data.profiles = { julia: { clients: [{ id: 'c1', name: 'Fine', tier: 'Low', freq: '90',
    lastVisit: new Date().toISOString().slice(0, 10) }],
    touchpoints: [{ clientId: 'c1', date: new Date().toISOString().slice(0, 10) }], checkins: [] } };
  CLEAN.profiles = [{ id: 'julia', name: 'Julia Hanna', market: 'Massachusetts' }];
  CLEAN.daysAgo = APP.daysAgo; CLEAN.nextDue = APP.nextDue;
  C.ctx.window.TributeApp = CLEAN;
  C.ctx.window.TributeMetrics.open();
  await after(60);
  var r = C.painted();
  ok('it does not say nothing is off track', r.indexOf('Nothing is off track') < 0);
  ok('it says what it could measure', r.indexOf('Nothing flagged in what could be measured') >= 0);
  ok('and names what it could not', r.indexOf('Note cadence was not measured') >= 0);

  console.log('\n--- who is out ---');
  // The API answers now, not Graph: the browser has no credential that can
  // read Tribute Public and no longer tries.
  var CAL = async function (u) {
    if (/endpoint=csm_pto/.test(u)) return { ok: true, json: async () => ({ via: 'graph-app', events: [
      { subject: 'Julia Hanna PTO - Jury Duty', isAllDay: true,
        start: { date: '2099-01-05' }, end: { date: '2099-01-10' } },
      { subject: 'Nobody Known PTO', isAllDay: true,
        start: { date: '2099-01-05' }, end: { date: '2099-01-06' } },
      { subject: 'On-call weekend', isAllDay: true,
        start: { date: '2099-01-05' }, end: { date: '2099-01-06' } }] }) };
    return { ok: true, json: async () => (/note_cadence/.test(u) ? LIVE : { rows: [] }) };
  };
  var E = boot(CAL);
  E.ctx.window.TributeApp = APP;
  E.ctx.window.TributeMetrics.open();
  await after(90);
  var ep = E.painted();
  ok('the panel renders', ep.indexOf('Who is out') >= 0);
  // The reason must never reach the page. It is dropped at parse time.
  ok('a reason from the subject is never shown', ep.indexOf('Jury') < 0);
  ok('an unmatched name is listed, not guessed', ep.indexOf('Nobody Known') >= 0);
  ok('...and is labelled as not in the Hub', ep.indexOf('not in the Hub') >= 0);
  ok('an on-call shift is not treated as time off', ep.indexOf('On-call') < 0);

  console.log('\n--- a calendar that cannot be read ---');
  // The shape the endpoint actually returns when Graph refuses it: a 502
  // from us carrying Graph's own status and the grant that would fix it.
  var DENY = async function (u) {
    if (/endpoint=csm_pto/.test(u)) return { ok: false, status: 502, json: async () => ({
      error: 'Tribute Public could not be read', graphStatus: 403,
      hint: 'the app registration needs the APPLICATION permission Calendars.Read with admin consent' }) };
    return { ok: true, json: async () => (/note_cadence/.test(u) ? LIVE : { rows: [] }) };
  };
  var F = boot(DENY);
  F.ctx.window.TributeApp = APP;
  F.ctx.window.TributeMetrics.open();
  await after(90);
  var fp = F.painted();
  // A calendar we could not read is not an empty calendar.
  ok('it does not claim nobody is out', fp.indexOf('Nobody is out') < 0);
  ok('it says the calendar could not be read', fp.indexOf('could not be read') >= 0);
  ok('...and calls it a gap, not an empty calendar', fp.indexOf('not an empty calendar') >= 0);
  ok('it reports what was tried', fp.indexOf('HTTP 502') >= 0);
  // Graph's own refusal must survive the hop, or the panel blames the API for
  // a permission problem that is not the API's.
  ok('...and surfaces the status Graph itself gave', fp.indexOf('Graph replied 403') >= 0);
  ok('...and names the grant that would fix it', fp.indexOf('Calendars.Read') >= 0);
  ok('the rest of the page still works', fp.indexOf('Visit past due') >= 0);

  console.log('\n--- call activity and service exceptions ---');
// Both feeds are trusted:false. They were built, deployed, cached and never
// rendered anywhere, which looked finished from the backend and reached
// nobody. Now they render, but under this page's own rules: no leaderboard,
// and an unreliable count must say so rather than be read as a measure of a
// person.
const CALLS = {
  generatedAt: '2099-01-01T00:00:00Z', days: 14, trusted: false,
  untrustedReason: 'Nextiva is not seeing every call a CSM makes.',
  dispositionNote: 'Nextiva\u2019s CDR carries call length only.',
  sharedOutbound: 68, sharedLines: [{ line: 'Tribute Massachusetts Account', out: 68, in: 0 }],
  zeroOutbound: ['Courtney Chaulk', 'Julia Hanna'],
  csms: [
    { id: 'z', name: 'Zoe Zane',  market: 'Boston', out: 100, in: 4, minutes: 500, avgMinutes: 5, afterHours: 1 },
    { id: 'a', name: 'Ann Able',  market: 'Boston', out: 3,   in: 9, minutes: 40,  avgMinutes: 3.3, afterHours: 0 }
  ]
};
const EXC = {
  generatedAt: '2099-01-01T00:00:00Z', days: 45, scanned: 825, trusted: false,
  untrustedReason: 'A status is not reliably updated when the work is done.',
  closedTodayNote: 'The dataset records no resolution date.',
  unassignedToAnyCsm: 57,
  csms: [
    { csm: 'Zoe Zane', market: 'Boston', openByAge: { '0-2': 1, '3-7': 0, '8-30': 0, '31+': 4 }, oldestOpenDays: 99 },
    { csm: 'Ann Able', market: 'Boston', openByAge: { '0-2': 2, '3-7': 1, '8-30': 0, '31+': 0 }, oldestOpenDays: 5 }
  ]
};
const BOTH = async function (u) {
  if (/endpoint=csm_calls/.test(u)) return { ok: true, json: async () => CALLS };
  if (/endpoint=csm_exceptions/.test(u)) return { ok: true, json: async () => EXC };
  if (/endpoint=csm_pto/.test(u)) return { ok: true, json: async () => ({ via: 'graph-app', events: [] }) };
  return { ok: true, json: async () => (/note_cadence/.test(u) ? LIVE : { rows: [] }) };
};
{
  const G = boot(BOTH);
  G.ctx.window.TributeApp = APP;
  G.ctx.window.TributeMetrics.open();
  await after(120);
  const g = G.painted();
  ok('call activity reaches the page at all', g.indexOf('Call activity') >= 0);
  ok('service exceptions reach the page at all', g.indexOf('Service exceptions') >= 0);

  // Rule 2 of this page: no leaderboards. Alphabetical within market.
  ok('CSMs are alphabetical, not ranked by volume',
     g.indexOf('Ann Able') < g.indexOf('Zoe Zane'));
  // A count that understates by an unknown amount must not look like a score.
  ok('unreliable call counts say so before the table is opened',
     g.indexOf('not reliable enough to measure anyone by') >= 0);
  ok('...and carry the reason', g.indexOf('not seeing every call') >= 0);

  // The correction this session spent its evening on, finally visible.
  ok('outbound belonging to no CSM is stated', g.indexOf('68') >= 0 && g.indexOf('belong to no CSM') >= 0);
  ok('a CSM with no outbound is framed as a gap, not a verdict',
     g.indexOf('not a finding about them') >= 0);
  ok('no answered or missed split is claimed', g.indexOf('call length only') >= 0);

  // Exceptions: age bands, and deliberately no total against the 2-day target.
  ok('exceptions are shown by age', g.indexOf('Over 30 days') >= 0);
  ok('...and no total is compared against the two-day target',
     g.indexOf('No total is compared against the two-day target') >= 0);
  ok('exceptions belonging to nobody are counted', g.indexOf('57') >= 0);
  ok('closed-today is declared underivable rather than estimated',
     g.indexOf('no resolution date') >= 0);
}

console.log('\n--- exceptions that may be typed wrong ---');
// Already filed, already worked, mostly already closed. What is wrong is the
// dropdown. Every row has to stay a question: keyword matching cannot tell a
// caregiver refusing a visit from a family refusing care.
const RETYPE = {
  days: 34, typedNoComplaint: 432, typedComplaint: 119,
  signalTableOk: true, upperBound: true,
  method: 'Keyword match on the narrative of exceptions typed "No complaint".',
  suggestsNothing: 'This never proposes a new exception and never writes to Viv.',
  candidates: [
    { incidentNum: 'SE-1', date: '2099-01-05', client: 'Ada Client', csm: 'Zoe Zane',
      market: 'Boston', typedAs: 'No complaint: internal communication', status: 'resolved',
      signals: ['upset', 'rude'], quote: 'The daughter called very upset.' }
  ]
};
const withRetype = (over) => async function (u) {
  if (/endpoint=se_retype/.test(u)) return { ok: true, json: async () => Object.assign({}, RETYPE, over || {}) };
  if (/endpoint=csm_calls/.test(u)) return { ok: true, json: async () => CALLS };
  if (/endpoint=csm_exceptions/.test(u)) return { ok: true, json: async () => EXC };
  if (/endpoint=csm_pto/.test(u)) return { ok: true, json: async () => ({ via: 'graph-app', events: [] }) };
  return { ok: true, json: async () => (/note_cadence/.test(u) ? LIVE : { rows: [] }) };
};
{
  const K = boot(withRetype());
  K.ctx.window.TributeApp = APP;
  K.ctx.window.TributeMetrics.open();
  await after(130);
  const k = K.painted();
  ok('the queue reaches the page', k.indexOf('Exceptions that may be typed wrong') >= 0);
  ok('the count is shown against its denominator', k.indexOf('432') >= 0 && k.indexOf('119') >= 0);
  ok('it is framed as questions, not findings', k.indexOf('questions, not findings') >= 0);
  ok('the heading hedges, because the match might be wrong', k.indexOf('may be typed wrong') >= 0);
  ok('it says it writes nothing to Viv', k.indexOf('never writes to Viv') >= 0);
  ok('...and that re-typing is done by a person', k.indexOf('Re-type it in Viv if you agree') >= 0);
}

console.log('\n--- an empty queue is only good news if the detector works ---');
{
  // It shipped once matching backspace characters and returned 1 where 26 was
  // right. An empty queue from a broken detector must not read as "all clear".
  const B = boot(withRetype({ candidates: [], signalTableOk: false }));
  B.ctx.window.TributeApp = APP;
  B.ctx.window.TributeMetrics.open();
  await after(130);
  const b = B.painted();
  ok('a broken signal table is called a gap, not a clean result',
     b.indexOf('gap rather than a clean result') >= 0);
  ok('...and is listed under what was not measured',
     b.indexOf('signal table is not matching') >= 0);
}
{
  const G = boot(withRetype({ candidates: [], signalTableOk: true }));
  G.ctx.window.TributeApp = APP;
  G.ctx.window.TributeMetrics.open();
  await after(130);
  const g = G.painted();
  ok('a genuinely empty queue says so plainly',
     g.indexOf('reads like a complaint filed as something else') >= 0);
  ok('...and does not cry gap when the detector is fine',
     g.indexOf('gap rather than a clean result') < 0);
}

console.log('\n--- neither one blanks the other, and neither invents a zero ---');
{
  const HALF = async function (u) {
    if (/endpoint=csm_calls/.test(u)) return { ok: false, status: 502 };
    if (/endpoint=csm_exceptions/.test(u)) return { ok: true, json: async () => EXC };
    if (/endpoint=csm_pto/.test(u)) return { ok: true, json: async () => ({ via: 'graph-app', events: [] }) };
    return { ok: true, json: async () => (/note_cadence/.test(u) ? LIVE : { rows: [] }) };
  };
  const H = boot(HALF);
  H.ctx.window.TributeApp = APP;
  H.ctx.window.TributeMetrics.open();
  await after(120);
  const h = H.painted();
  ok('a failed call feed does not blank the exceptions beside it',
     h.indexOf('Over 30 days') >= 0);
  ok('a failed call feed says it is a gap, not a quiet fortnight',
     h.indexOf('not a quiet fortnight') >= 0);
  ok('...and no call numbers are drawn', h.indexOf('not reliable enough to measure') < 0);
  ok('the failure is listed under what was not measured', h.indexOf('Call activity: ') >= 0);
}

console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'PASSED all ' + pass));
  process.exit(fail ? 1 : 0);
}());
