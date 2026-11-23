// "Visits this month: N of M due visits done" has to be able to move.
//
// Courtney, 17 Nov, review of V2: "Visits this month says '0 of 22 due visits
// done'". On a real caseload on 23 Nov it read 0 of 20 while eight of those
// clients had been visited that month.
//
// It was not a miscount. `due` was built from nextDue(c.lastVisit, freq) using
// TODAY'S last visit, so logging a visit pushed next-due past the month end and
// the client left the DENOMINATOR instead of entering the numerator. Doing the
// work took you off the list of people with work to do, which pins the number
// at or near zero for every cadence longer than a month.
//
// The fix: decide who was due from the position at the START of the month.
// These assertions run the real function over fixtures, because the bug was in
// what the arithmetic does, not in how it is spelled.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');

// Brace counting, not a regex slice: a lazy match to the next `}` stops at the
// first nested block and silently hands back a fragment that still "parses".
function grab(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no function ' + name);
  const open = src.indexOf('{', i);
  let d = 0, j = open;
  for (; j < src.length; j++) {
    if (src[j] === '{') d++;
    else if (src[j] === '}') { d--; if (!d) { j++; break; } }
  }
  if (d !== 0) throw new Error('unbalanced ' + name);
  return src.slice(i, j);
}

const body = ['_visitMonthWindow', 'nextDue', 'visitCompliance'].map(n => grab(V1, n)).join('\n');
const build = new Function('get', body + '\nreturn visitCompliance;');

// ── fixtures, relative to whatever month the test runs in ─────────────────
const now = new Date(), y = now.getFullYear(), m = now.getMonth();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const offsetFrom1st = n => iso(new Date(y, m, 1 + n));
const IN_MONTH = iso(new Date(y, m, Math.min(now.getDate(), 28)));
const LONG_AGO = offsetFrom1st(-100);   // a 90-day client was already overdue on the 1st
const RECENT   = offsetFrom1st(-10);    // ...and this one was not
const FUTURE   = iso(new Date(y, m + 2, 1));

const clients = [
  { id: 'due_and_visited', name: 'Visited this month',   freq: 90, lastVisit: IN_MONTH },
  { id: 'due_not_visited', name: 'Still owed',           freq: 90, lastVisit: LONG_AGO },
  { id: 'caught_up',       name: 'Not due until later',  freq: 90, lastVisit: RECENT },
  { id: 'never',           name: 'Never visited',        freq: 90, lastVisit: '' },
  { id: 'typed_only',      name: 'Typed in by hand',     freq: 90, lastVisit: IN_MONTH },
  { id: 'deferred',        name: 'Deferred',             freq: 90, lastVisit: LONG_AGO, visitDeferred: { until: FUTURE } },
  { id: 'no_cadence',      name: 'No cadence',           freq: 'NA', lastVisit: LONG_AGO },
  { id: 'office',          name: 'Office',               freq: 90, lastVisit: LONG_AGO, isOffice: true }
];
const visits = [
  { clientId: 'due_and_visited', date: LONG_AGO },
  { clientId: 'due_and_visited', date: IN_MONTH },
  { clientId: 'due_not_visited', date: LONG_AGO },
  { clientId: 'caught_up',       date: RECENT },
  { clientId: 'deferred',        date: LONG_AGO }
  // typed_only deliberately has NO row: cf-lastv lets a CSM enter a date direct.
];
const r = build(k => (k === 'clients' ? clients : k === 'visits' ? visits : []))();
const ids = l => l.map(c => c.id).sort();

// ── the regression itself ─────────────────────────────────────────────────
ok('a client visited this month STAYS in the denominator',
   r.due.some(c => c.id === 'due_and_visited'));
ok('...and lands in the numerator',
   r.done.some(c => c.id === 'due_and_visited'));

// ── and the rest of the partition still holds ─────────────────────────────
ok('a client owed a visit and not yet seen is due and not done',
   r.due.some(c => c.id === 'due_not_visited') && !r.done.some(c => c.id === 'due_not_visited'));
ok('a client not due until a later month is counted neither way',
   !r.due.some(c => c.id === 'caught_up') && !r.done.some(c => c.id === 'caught_up'));
ok('a client with nothing on record is due', r.due.some(c => c.id === 'never'));
ok('a deferred visit is set aside, not counted against the month',
   ids(r.deferred).join() === 'deferred' && !r.due.some(c => c.id === 'deferred'));
ok('no cadence means no obligation', !r.due.some(c => c.id === 'no_cadence'));
ok('office records are not clients', !r.due.some(c => c.id === 'office'));
ok('a last-visit typed on the client form counts as done even with no row logged',
   r.due.some(c => c.id === 'typed_only') && r.done.some(c => c.id === 'typed_only'));

ok('the denominator is exactly the clients who were owed a visit',
   ids(r.due).join() === ['due_and_visited', 'due_not_visited', 'never', 'typed_only'].sort().join());
ok('the percentage is done over due', r.pct === Math.round(r.done.length / r.due.length * 100));
ok('...and it is no longer pinned near zero', r.pct === 50);

// ── nothing is read from today's position any more ────────────────────────
for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  const fn = grab(SRC, 'visitCompliance');
  ok(label + ': the old today-based test is gone', !/const neverVisited=!c\.lastVisit;/.test(fn));
  ok(label + ': due is measured against the start of the month',
     /const monthStart=new Date\(y,m,1\)/.test(fn) && /asDate\(d\)<monthStart/.test(fn));
  ok(label + ': and against the end of it, so an overdue client stays due',
     /nd<nextMonth/.test(fn));
}
ok('both copies of the function agree', grab(V1, 'visitCompliance') === grab(V2, 'visitCompliance'));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
