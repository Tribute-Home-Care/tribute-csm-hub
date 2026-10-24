// TD-30: the shared document merge, run against the real engine.
//
// The functions are lifted out of index.html and executed, so this tests the
// code that ships. Nothing here touches production: the merge is pure.
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

// ---- lift the engine ------------------------------------------------------
const start = SRC.indexOf('const _SHARED_SPEC = {');
const end   = SRC.indexOf('async function _putData()');
if (start < 0 || end < 0) { console.log('  FAIL  merge engine not found in index.html'); process.exit(1); }
const engine = SRC.slice(start, end);
const mergeSharedDocument = new Function(engine + '\nreturn mergeSharedDocument;')();
ok('the merge engine was lifted from index.html', typeof mergeSharedDocument === 'function');

const clone = o => JSON.parse(JSON.stringify(o));

console.log('\n--- DIFFERENT-RECORD CONCURRENCY: both edits must survive ---');

// COVERAGE — A edits Client A, B edits Client B, both from the same base.
{
  const base = { coverage: [
    { clientId: 'cA', csmId: 'emily', note: 'old A' },
    { clientId: 'cB', csmId: 'julia', note: 'old B' } ] };
  const emily = clone(base); emily.coverage[0].note = 'EMILY NEW';
  const julia = clone(base); julia.coverage[1].note = 'JULIA NEW';
  // Julia saved first and is on the server; Emily now retries.
  const r = mergeSharedDocument(base, emily, julia);
  const byId = Object.fromEntries(r.shared.coverage.map(n => [n.clientId, n.note]));
  ok('coverage: Emily’s edit to client A survives', byId.cA === 'EMILY NEW');
  ok('coverage: Julia’s edit to client B survives', byId.cB === 'JULIA NEW');
  ok('coverage: no conflict reported', r.conflicts.length === 0);
}

// COMMUNITIES — real production shape, keyed by community name.
{
  const base = { communities: {
    'Goddard House':   { email: { to: ['a@x.com'], tier: '1' }, levels: [] },
    'Avita of Needham':{ email: { to: ['b@x.com'], tier: '2' }, levels: [] } } };
  const a = clone(base); a.communities['Goddard House'].email.to = ['NEW-A@x.com'];
  const b = clone(base); b.communities['Avita of Needham'].email.to = ['NEW-B@x.com'];
  const r = mergeSharedDocument(base, a, b);
  ok('communities: edit to Goddard House survives',
     r.shared.communities['Goddard House'].email.to[0] === 'NEW-A@x.com');
  ok('communities: edit to Avita survives',
     r.shared.communities['Avita of Needham'].email.to[0] === 'NEW-B@x.com');
  ok('communities: no conflict', r.conflicts.length === 0);
}

// FILL PRIORITY — events and per-event status.
{
  const base = { fillEvents: [{ id: 'e1', label: 'old 1' }, { id: 'e2', label: 'old 2' }],
                 fillStatus: { e1: { c1: { status: 'unfilled' } }, e2: { c2: { status: 'unfilled' } } } };
  const a = clone(base); a.fillEvents[0].label = 'A CHANGED'; a.fillStatus.e1.c1.status = 'filled';
  const b = clone(base); b.fillEvents[1].label = 'B CHANGED'; b.fillStatus.e2.c2.status = 'filled';
  const r = mergeSharedDocument(base, a, b);
  const ev = Object.fromEntries(r.shared.fillEvents.map(e => [e.id, e.label]));
  ok('fillEvents: event A survives', ev.e1 === 'A CHANGED');
  ok('fillEvents: event B survives', ev.e2 === 'B CHANGED');
  ok('fillStatus: status under e1 survives', r.shared.fillStatus.e1.c1.status === 'filled');
  ok('fillStatus: status under e2 survives', r.shared.fillStatus.e2.c2.status === 'filled');
  ok('fill priority: no conflict', r.conflicts.length === 0);
}

// MARYLAND CADENCE — separate clients.
{
  const base = { mdCadence: { c1: 90, c2: 90 } };
  const a = clone(base); a.mdCadence.c1 = 30;
  const b = clone(base); b.mdCadence.c2 = 60;
  const r = mergeSharedDocument(base, a, b);
  ok('mdCadence: client 1 change survives', r.shared.mdCadence.c1 === 30);
  ok('mdCadence: client 2 change survives', r.shared.mdCadence.c2 === 60);
  ok('mdCadence: no conflict', r.conflicts.length === 0);
}

// ADDITIONS — two people adding different new records at once.
{
  const base = { coverage: [{ clientId: 'c0', csmId: 'x', note: 'keep' }] };
  const a = clone(base); a.coverage.push({ clientId: 'cA', csmId: 'emily', note: 'A added' });
  const b = clone(base); b.coverage.push({ clientId: 'cB', csmId: 'julia', note: 'B added' });
  const r = mergeSharedDocument(base, a, b);
  const ids = r.shared.coverage.map(n => n.clientId).sort();
  ok('both new coverage notes land, and the untouched one stays',
     ids.join(',') === 'c0,cA,cB');
}

console.log('\n--- SAME-RECORD CONCURRENCY ---');

// Different FIELDS of the same record.
{
  const base = { communities: { 'Goddard House': { email: { to: ['a@x.com'], tier: '1', note: '' } } } };
  const a = clone(base); a.communities['Goddard House'].email.to = ['CHANGED@x.com'];
  const b = clone(base); b.communities['Goddard House'].email.tier = '3';
  const r = mergeSharedDocument(base, a, b);
  const e = r.shared.communities['Goddard House'].email;
  ok('same record, different fields: the recipient change survives', e.to[0] === 'CHANGED@x.com');
  ok('same record, different fields: the tier change survives', e.tier === '3');
  ok('same record, different fields: no conflict', r.conflicts.length === 0);
}

// The SAME field, changed differently. Must be an explicit conflict.
{
  const base = { communities: { 'Goddard House': { email: { to: ['a@x.com'] } } } };
  const a = clone(base); a.communities['Goddard House'].email.to = ['MINE@x.com'];
  const b = clone(base); b.communities['Goddard House'].email.to = ['THEIRS@x.com'];
  const r = mergeSharedDocument(base, a, b);
  ok('same field, both changed: reported as a conflict', r.conflicts.length === 1);
  ok('same field: the conflict names the record and field',
     /communities\.Goddard House\.email\.to/.test(r.conflicts[0]));
  ok('same field: the OTHER person’s value is kept, not silently overwritten',
     r.shared.communities['Goddard House'].email.to[0] === 'THEIRS@x.com');
}

// Same coverage record, both edited.
{
  const base = { coverage: [{ clientId: 'cA', csmId: 'emily', note: 'old' }] };
  const a = clone(base); a.coverage[0].note = 'MINE';
  const b = clone(base); b.coverage[0].note = 'THEIRS';
  const r = mergeSharedDocument(base, a, b);
  ok('same coverage note: conflict reported', r.conflicts.length === 1);
  ok('same coverage note: theirs kept', r.shared.coverage[0].note === 'THEIRS');
}

// Both made the SAME change — not a conflict.
{
  const base = { mdCadence: { c1: 90 } };
  const a = clone(base); a.mdCadence.c1 = 30;
  const b = clone(base); b.mdCadence.c1 = 30;
  const r = mergeSharedDocument(base, a, b);
  ok('identical change on both sides is not a conflict', r.conflicts.length === 0 && r.shared.mdCadence.c1 === 30);
}

console.log('\n--- THE ORIGINAL BUG MUST NOT COME BACK ---');
{
  // The exact scenario from the old test: a Quick-Note-only session with a
  // stale shared block used to wipe three of a colleague’s edits.
  const base = { coverage: [{ clientId: 'c1', csmId: 'x', note: 'existing' }],
                 communities: { brookhaven: { contact: 'old' } },
                 fillEvents: [{ id: 'e1' }] };
  const server = clone(base);
  server.coverage.push({ clientId: 'c2', csmId: 'julia', note: 'JULIA JUST ADDED THIS' });
  server.communities.brookhaven.contact = 'JULIA UPDATED';
  server.fillEvents.push({ id: 'e2', label: 'JULIA ADDED' });
  const mine = clone(base);                      // touched nothing shared
  const r = mergeSharedDocument(base, mine, server);
  ok('a pocket-only save no longer drops a colleague’s coverage note',
     r.shared.coverage.some(c => c.clientId === 'c2'));
  ok('a pocket-only save no longer reverts a colleague’s community edit',
     r.shared.communities.brookhaven.contact === 'JULIA UPDATED');
  ok('a pocket-only save no longer drops a colleague’s Fill Priority event',
     r.shared.fillEvents.length === 2);
  ok('and it reports no conflict, because this session changed nothing',
     r.conflicts.length === 0);
}

console.log('\n--- GENERATED CACHES: newest generatedAt wins, by rule ---');
{
  const base   = { viv: { generatedAt: '2026-10-01T00:00:00Z', counts: { a: 1 } } };
  const mine   = { viv: { generatedAt: '2026-10-02T00:00:00Z', counts: { a: 2 } } };
  const server = { viv: { generatedAt: '2026-10-03T00:00:00Z', counts: { a: 3 } } };
  const r = mergeSharedDocument(base, mine, server);
  ok('the later sync wins', r.shared.viv.counts.a === 3);
  ok('a regenerable cache does not raise a conflict', r.conflicts.length === 0);
}

console.log('\n--- DELETION ---');
{
  const base   = { mdCadence: { c1: 90, c2: 60 } };
  const mine   = { mdCadence: { c2: 60 } };            // this session cleared c1
  const server = clone(base);
  const r = mergeSharedDocument(base, mine, server);
  ok('a deletion this session made is honoured', !('c1' in r.shared.mdCadence));
  ok('an untouched record survives the deletion of another', r.shared.mdCadence.c2 === 60);
}

console.log('\n--- NO BASELINE: fall back to the server, never guess ---');
{
  const server = { coverage: [{ clientId: 'c1', csmId: 'x', note: 'server' }] };
  const mine   = { coverage: [{ clientId: 'c1', csmId: 'x', note: 'stale local' }] };
  const r = mergeSharedDocument(null, mine, server);
  ok('with no baseline the server copy is kept', r.shared.coverage[0].note === 'server');
}

console.log('\n--- THE SHIPPED RETRY USES IT ---');
ok('the old blanket spread is gone from index.html',
   !/merged\.shared=\{\.\.\.\(merged\.shared\|\|\{\}\),\.\.\.\(DATA\.shared\|\|\{\}\)\}/.test(SRC));
ok('the 409 path calls mergeSharedDocument', /mg=mergeSharedDocument\(_sharedBaseline,DATA\.shared/.test(SRC));
ok('the baseline is captured on load', /_sharedBaseline=_clone\(DATA\.shared\|\|\{\}\)/.test(SRC));
ok('retries are bounded', /attempts<2/.test(SRC));
ok('a conflict is shown to the user rather than swallowed',
   /changed elsewhere/.test(SRC) && /Their version was kept/.test(SRC));

console.log('\n--- PROFILE POCKET MUST NOT REGRESS ---');
ok('the saver’s own pocket is still written back',
   /if\(P&&DATA\.profiles\[P\.id\]\)merged\.profiles\[P\.id\]=DATA\.profiles\[P\.id\]/.test(SRC));
ok('other pockets still come from the server document',
   /const merged=fj\.data\|\|\{profiles:\{\},version:1\}/.test(SRC));

console.log('\n' + (fail ? fail + ' FAILED' : 'All ' + pass + ' checks passed') + '\n');
process.exit(fail ? 1 : 0);
