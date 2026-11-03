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

const APP = { account: { username: 'tuadmin@tributehomecare.com' },
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
  A.ctx.window.TributeApp = { account: { username: 'someone@tributehomecare.com' },
    adminUpns: ['tuadmin@tributehomecare.com'], profile: { id: 'julia' } };
  A.ctx.window.TributeMetrics.render();
  ok('a non-owner is refused', A.painted().indexOf('limited to Client Solutions leadership') >= 0);
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
  // Graph answers: one calendar named Tribute Public, two entries in it.
  var CAL = async function (u) {
    if (/me\/calendars\?/.test(u)) return { ok: true, json: async () => ({ value: [
      { id: 'cal1', name: 'Tribute Public', owner: { address: 'tributepublic@tributehomecare.com' } }] }) };
    if (/calendarView/.test(u)) return { ok: true, json: async () => ({ value: [
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
  var DENY = async function (u) {
    if (/graph\.microsoft\.com/.test(u)) return { ok: false, status: 403 };
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
  ok('it reports which access paths were tried', fp.indexOf('HTTP 403') >= 0);
  ok('the rest of the page still works', fp.indexOf('Visit past due') >= 0);

  console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'PASSED all ' + pass));
  process.exit(fail ? 1 : 0);
}());
