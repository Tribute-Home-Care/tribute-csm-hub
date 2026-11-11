// Emily's three buckets, read back onto Home.
//
// Emily, 29 October: "a location where I can view what I have sorted into the
// 'Nothing needed' 'Working on it' and 'Raising in 1:1' options". The first
// reply on her ticket said those buckets were not stored anywhere they could
// be listed back. They always were: setPulseAck() writes {state, note, by, at,
// forReason, forHeadline} onto the client. This panel only reads it.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/v2-followups.js'), 'utf8');

// Run the real module with stubs instead of a browser, so these assertions
// exercise the shipped code rather than a restatement of it.
function load(state) {
  const win = {};
  const noop = () => {};
  const el = () => ({ classList: { add: noop, remove: noop }, style: {}, dataset: {},
    appendChild: noop, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: noop, insertAdjacentHTML: noop, after: noop, remove: noop, contains: () => false });
  const doc = { readyState: 'complete', addEventListener: noop,
    getElementById: () => null, querySelector: () => null, createElement: el };
  const saves = [];
  new Function('window', 'document', 'setInterval', 'setTimeout', 'get', '_PULSE',
               'DATA', 'P', 'queueSave', 'renderClientMaster', 'showToast', SRC)(
    win, doc, () => 0, () => 0,
    k => (state.clients || []), state.pulse || undefined,
    state.DATA || { profiles: {} }, state.P || { name: 'Emily Willson' },
    () => saves.push(1), noop, noop);
  win.__saves = saves;
  return win.TributeFollowUps;
}

const ack = (o) => Object.assign({ state: 'aware_working', note: '', by: 'Emily Willson',
  at: '2026-11-01T10:00:00Z', forReason: 'L3', forLevel: 'red', forHeadline: 'Sleep disturbed' }, o);

// ── the buckets ───────────────────────────────────────────────────────────
const F = load({ clients: [
  { id: 'a', name: 'Client A', vivId: '1', pulseAck: ack({ state: 'aware_none' }) },
  { id: 'b', name: 'Client B', vivId: '2', pulseAck: ack({ state: 'aware_working', at: '2026-11-03T10:00:00Z' }) },
  { id: 'c', name: 'Client C', vivId: '3', pulseAck: ack({ state: 'aware_1to1', at: '2026-11-02T10:00:00Z' }) },
  { id: 'd', name: 'Not sorted', vivId: '4' },
  { id: 'e', name: 'Office', vivId: '5', isOffice: true, pulseAck: ack({}) }
] });

ok('the module exposes its surface', !!F && typeof F.rows === 'function');
ok('the three buckets are in the same order as the buttons on the client record',
   JSON.stringify(F.STATES.map(s => s[0])) === JSON.stringify(['aware_none', 'aware_working', 'aware_1to1']));
ok('the labels are Emily\'s own words',
   JSON.stringify(F.STATES.map(s => s[1])) === JSON.stringify(['Nothing needed', 'Working on it', 'Raising in 1:1']));

const r = F.rows();
ok('only sorted clients appear', r.length === 3 && !r.some(x => x.id === 'd'));
ok('an office pseudo-client never appears', !r.some(x => x.id === 'e'));
ok('newest decision first', r.map(x => x.id).join('') === 'bca');
ok('every bucket is represented',
   ['aware_none', 'aware_working', 'aware_1to1'].every(s => r.some(x => x.state === s)));

// ── stale: the ack is bound to the flag it was raised on ──────────────────
const withPulse = (byCid, a) => load({ pulse: { byCid },
  clients: [{ id: 'a', name: 'A', vivId: '1', pulseAck: ack(a || {}) }] }).rows()[0];
ok('a matching flag is not stale',
   withPulse({ '1': { flagReason: 'L3', level: 'red', headline: 'Sleep disturbed' } }).stale === false);
ok('a changed reason is stale',
   withPulse({ '1': { flagReason: 'L1', level: 'red', headline: 'Sleep disturbed' } }).stale === true);
ok('a changed level is stale',
   withPulse({ '1': { flagReason: 'L3', level: 'amber', headline: 'Sleep disturbed' } }).stale === true);

// THE DEFECT THIS REPLACED. headline is AI prose Client Pulse rewrites on
// every build. Binding to it marked 18 of Emily's 18 acknowledgements stale
// on 11 Nov, most of them for nothing but a rewording.
ok('a reworded headline on an unchanged flag is NOT stale',
   withPulse({ '1': { flagReason: 'L3', level: 'red',
     headline: 'Her sleep has been disturbed this week.' } }).stale === false);
ok('an acknowledgement saved before forLevel existed does not test it',
   withPulse({ '1': { flagReason: 'L3', level: 'amber', headline: 'x' } },
             { forLevel: undefined }).stale === false);
// Not knowing is not the same as knowing it moved.
ok('no Pulse record loaded is not reported as stale', F.rows()[0].stale === false);
ok('a client absent from the Pulse map is not reported as stale',
   withPulse({ '99': { flagReason: 'x', headline: 'y' } }).stale === false);

// ── moving between buckets ────────────────────────────────────────────────
function mover(startState) {
  const c = { id: 'a', name: 'A', vivId: '1', pulseAck: ack({ state: startState, note: 'called daughter' }) };
  const DATA = { profiles: { emily: { clients: [c] } } };
  const win = load({ clients: [c], DATA: DATA });
  global._pulseAckProfile = () => 'emily';
  return { api: win, c: c };
}
let m = mover('aware_working');
m.api.move('a', 'aware_1to1');
ok('moving changes the bucket', m.c.pulseAck.state === 'aware_1to1');
ok('moving keeps the note she typed', m.c.pulseAck.note === 'called daughter');
ok('moving keeps the flag binding, so a stale card stays stale',
   m.c.pulseAck.forReason === 'L3' && m.c.pulseAck.forLevel === 'red');
ok('moving records who moved it and when',
   m.c.pulseAck.by === 'Emily Willson' && m.c.pulseAck.at > '2026-11-01T10:00:00Z');

m = mover('aware_none');
m.api.move('a', null);
ok('reopening removes the acknowledgement entirely', !('pulseAck' in m.c));

m = mover('aware_working');
m.api.move('missing-id', 'aware_1to1');
ok('an unknown id changes nothing', m.c.pulseAck.state === 'aware_working');
delete global._pulseAckProfile;

// ── calm control ──────────────────────────────────────────────────────────
ok('with nothing sorted there are no rows', load({ clients: [] }).rows().length === 0);
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CODE = strip(SRC);
ok('an empty board removes its own section rather than rendering a heading',
   /if \(!list\.length\) \{ if \(sec\) sec\.remove\(\); return; \}/.test(CODE));
ok('every drag target is also reachable as a button',
   /data-move=/.test(CODE) && /data-clear=/.test(CODE) && /dragstart/.test(CODE));
ok('it sits under Needs attention on Home', /getElementById\('rd-s-attn'\)/.test(CODE));
ok('the board never binds staleness to the rewritten headline',
   !/a\.forHeadline !== \(pp\.headline/.test(CODE));

// The client record must agree with the board, or the same card reads handled
// in one place and stale in the other.
const HUB = strip(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'));
ok('the client record binds on reason and level too',
   /ack\.forReason===\(pp\.flagReason\|\|''\) &&\s*\n?\s*\(ack\.forLevel===undefined \|\| ack\.forLevel===\(pp\.level\|\|''\)\)/.test(HUB));
ok('the client record no longer compares the headline',
   !/ack\.forHeadline===\(pp\.headline/.test(HUB));
ok('a new acknowledgement records the level', /forLevel:\(pp&&pp\.level\)\|\|''/.test(HUB));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
