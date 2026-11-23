// The numbers on the Hub have to mean one thing each.
//
// Courtney's third rule (17 Nov): "If the badge says 9, the list under it has
// 9 clients in it." She found 17 on Home, 18 on the Clients tab and 42 as the
// caseload, all presented as if they answered the same question, and wrote:
// "CSMs stop trusting the Hub fast if 17, 18 and 42 all mean needs attention".
//
// The cause was an overlap, not a bug in any one number. Needs attention
// counted EVERY exception; Due soon counted the warnings; so Due soon's
// clients sat inside Needs attention too. Home has always counted only the bad
// ones as needing action, so the tab could never agree with the tile.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, p] of [['shipped', '../v2/redesign.js'],
                          ['source', path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js')]]) {
  const CODE = strip(fs.readFileSync(path.isAbsolute(p) ? p : path.join(__dirname, p), 'utf8'));
  /* ONE DEFINITION, ASKED FOUR WAYS. This used to assert that needing
     action was the bad cadence exception, inline, in each place. That held
     only while Pulse was failing to load. The Today's list, built to her
     section-2 spec, also treats an unsorted Pulse flag as needing action
     today — correctly, because a client taken by paramedics needs the CSM
     whatever their visit cadence says, which is her priority 1. The hour
     Pulse started loading, Home read 38 and the Clients badge read 16, both
     labelled as needing action: exactly the fault she described. */
  ok(label + ': needing action is defined once', /function needsAction\(c\) \{/.test(CODE));
  ok(label + ': ...as a bad cadence exception OR an unsorted Pulse flag',
     /if \(e && e\.tone === 'bad'\) return true;\n\s*return pulseOpen\(c\);/.test(CODE));
  ok(label + ': a sorted flag is not an unsorted one',
     /if \(c\.pulseAck\) return false;/.test(CODE));
  ok(label + ': the COUNT asks it', /attention: all\.filter\(needsAction\)\.length,/.test(CODE));
  ok(label + ': the LIST asks it',
     /if \(_view === 'attention'\) list = list\.filter\(function \(r\) \{ return needsAction\(r\.c\); \}\);/.test(CODE));
  ok(label + ': the Home tile asks it', /const bad = real\.filter\(needsAction\);/.test(CODE));
  // Due soon has to be what is LEFT, or the two overlap again.
  ok(label + ': Due soon excludes anything already needing action',
     /function dueSoonOnly\(c\) \{\n\s*if \(needsAction\(c\)\) return false;/.test(CODE));
  ok(label + ': ...and the count and the list both ask that',
     /soon: all\.filter\(dueSoonOnly\)\.length/.test(CODE) &&
     /_view === 'soon'\) list = list\.filter\(function \(r\) \{ return dueSoonOnly\(r\.c\); \}\)/.test(CODE));
  ok(label + ': nothing still counts every exception as needing attention',
     !/attention: all\.filter\(function \(c\) \{ return !!exceptionFor\(c\); \}\)/.test(CODE));
}

/* Behavioural: the partition, now that a Pulse flag can put a client in
   Needs attention on its own. The case that matters is the third one — a
   client whose cadence is merely due soon but whose Pulse is flagged belongs
   in Needs attention, counted ONCE. */
const needsAction = c => (c.t === 'bad') || (!!c.p && !c.ack);
const dueSoonOnly = c => !needsAction(c) && c.t === 'warn';
const CASES = [
  { n: 'bad cadence, no flag',            t: 'bad',  p: null },
  { n: 'no cadence problem, red flag',    t: null,   p: 'red' },
  { n: 'due soon AND flagged',            t: 'warn', p: 'amber' },
  { n: 'due soon, no flag',               t: 'warn', p: null },
  { n: 'flag already sorted',             t: null,   p: 'red', ack: 1 },
  { n: 'nothing at all',                  t: null,   p: null }
];
const attn = CASES.filter(needsAction), soonOnly = CASES.filter(dueSoonOnly);
ok('a Pulse flag alone puts a client in Needs attention',
   attn.some(c => c.n === 'no cadence problem, red flag'));
ok('a client who is both is counted once, under Needs attention',
   attn.some(c => c.n === 'due soon AND flagged') &&
   !soonOnly.some(c => c.n === 'due soon AND flagged'));
ok('a sorted flag is in neither', !attn.concat(soonOnly).some(c => c.ack));
ok('the two never overlap', !attn.some(c => soonOnly.indexOf(c) > -1));
ok('and they add up to 4 of the 6', attn.length + soonOnly.length === 4);

// Behavioural: the two views must partition the exceptions, never overlap.
const cl = [{ t: 'bad' }, { t: 'bad' }, { t: 'warn' }, { t: 'warn' }, { t: 'warn' }, { t: null }];
const ex = c => c.t ? { tone: c.t } : null;
const attention = cl.filter(c => { const e = ex(c); return e && e.tone === 'bad'; }).length;
const soon = cl.filter(c => { const e = ex(c); return e && e.tone === 'warn'; }).length;
const anyEx = cl.filter(c => !!ex(c)).length;
ok('needs attention and due soon do not overlap', attention + soon === anyEx);
ok('a client with no exception is in neither', attention + soon === 5 && cl.length === 6);
ok('needs attention equals what Home calls needing action', attention === 2);
ok('the old rule double-counted, which is what she saw', anyEx !== soon && anyEx === 5 && soon === 3);

// Home's tile and the tab now ask the same question of the same data.
const CODE = strip(fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8'));
// Home asks the same two functions as the Clients tabs, so "the tile and the
// tab agree" is true by construction rather than by two regexes matching.
ok('Home counts needing action the one way it is defined',
   /const bad = real\.filter\(needsAction\);/.test(CODE));
ok('Home counts due soon as what is left over',
   /const warn = real\.filter\(dueSoonOnly\);/.test(CODE));
ok('the old inline copies are gone',
   !/exc\.filter\(function \(r\) \{ return r\.ex\.tone/.test(CODE));
ok('Home sends you to the tab that now agrees with it',
   /tone: 'bad', go: 'clients', view: 'attention'/.test(CODE) && /label: 'Due soon'[\s\S]{0,80}view: 'soon'/.test(CODE));

/* ── THE RAIL BADGE ───────────────────────────────────────────────────────
   Courtney, section 1: "The Clients badge (18) doesn't match anything a CSM
   sees on Home... I'd make the badge equal the number on the Today's list,
   and nothing else."

   The rail ADDED every signal pointing at a page, so Clients read
   needs-action plus due-soon plus any change of condition: 16 + 6 = 22 on a
   real caseload, a number printed nowhere else in the Hub. A badge has to be
   a number you can go and count. */
ok('one signal owns the Clients badge rather than the rail summing them',
   /view: 'attention', badge: true/.test(CODE));
ok('a claimed badge is not added to', /if \(s\.badge\) by\[s\.go\] = \{ n: s\.n, owned: true \};/.test(CODE));
ok('...and nothing after it can overwrite the claim',
   /if \(by\[s\.go\] && by\[s\.go\]\.owned\) return;/.test(CODE));
ok('a signal with no list behind it carries no badge at all',
   /if \(s\.badge === false\) return;/.test(CODE) &&
   /go: 'priority', badge: false/.test(CODE));
// Behavioural: the two rules, over the shape the real signals have.
const badgeOf = (sigs, key) => {
  const by = {};
  sigs.forEach(s => {
    if (s.badge === false) return;
    if (by[s.go] && by[s.go].owned) return;
    if (s.badge) by[s.go] = { n: s.n, owned: true };
    else by[s.go] = { n: (by[s.go] ? by[s.go].n : 0) + s.n, owned: false };
  });
  return (by[key] && by[key].n > 0) ? by[key].n : '';
};
const REAL = [{ go: 'clients', n: 2 },                       // changes of condition
              { go: 'clients', n: 16, badge: true },          // needs action
              { go: 'clients', n: 6 },                        // due soon
              { go: 'priority', n: 14, badge: false },        // open visits
              { go: 's60', n: 3 }];
ok('the Clients badge is the Needs attention count, not the sum',
   badgeOf(REAL, 'clients') === 16);
ok('Fill Priority carries no number it cannot show you', badgeOf(REAL, 'priority') === '');
ok('a page with one signal is unaffected', badgeOf(REAL, 's60') === 3);
ok('a page with no signal stays blank', badgeOf(REAL, 'ltc') === '');

/* ── THE OPEN VISITS TILE ─────────────────────────────────────────────────
   "The number on each tile is the number of rows you get when you click it."
   The tile counted VISITS and the Today's list groups them by CLIENT, so on
   a real caseload the tile said 53 and its own list said 14. */
ok('the tile counts the clients it will show you',
   /const ovN = Object\.keys\(ovs\.byClient\)\.length;/.test(CODE) &&
   /if \(ovN\) out\.push\(\{ n: ovN, label: 'Open visits'/.test(CODE));
ok('...and the visit total is kept, not dropped',
   /plural\(ovs\.total, 'visit'\) \+ ' unfilled in all'/.test(CODE));
// One helper, read by both, so they cannot drift apart again. The earlier fix
// made them agree; this makes them the same arithmetic.
ok('the tile and the list group by the same key',
   (CODE.match(/v\.clientName \|\| v\.client \|\| ''/g) || []).length === 1 &&
   /function openVisitsSoon\(\)/.test(CODE));

/* Every tile is now a count of the rows behind it, because the counts are
   taken FROM the list rather than computed a second time beside it. */
ok('the tile numbers are counted off the list itself',
   /const tn = \{\}; TODAY_BUCKETS\.forEach\(function \(b\) \{ tn\[b\[0\]\] = 0; \}\);/.test(CODE) &&
   /todayRows\(\)\.forEach\(function \(r\) \{\n\s*\(r\.buckets \|\| \[r\.bucket\]\)\.forEach/.test(CODE));
// The four tiles are filters over one list, not a partition of it, so they
// may overlap and need not sum to the Everything count.
ok('a row can match more than one filter',
   /if \(best\[k\]\.buckets\.indexOf\(r\.bucket\) < 0\) best\[k\]\.buckets\.push\(r\.bucket\);/.test(CODE));
/* Except the two URGENCY filters, which are two readings of one cadence.
   Needs attention and Due soon were made to stop counting the same people on
   the Clients page; letting both match on Home put its Due soon at 6 against
   the tab's 4. First 30 days and Open visits are a different axis and still
   overlap. */
ok('needing action today cancels merely due soon',
   /if \(b\.indexOf\('action'\) > -1\) \{\n\s*const i = b\.indexOf\('week'\);/.test(CODE));
const buckets = bs => { const b = bs.slice();
  if (b.indexOf('action') > -1) { const i = b.indexOf('week'); if (i > -1) b.splice(i, 1); } return b; };
ok('a client who is both reads as needing action only',
   buckets(['action', 'week']).join() === 'action');
ok('a client who is only due soon is unaffected', buckets(['week']).join() === 'week');
ok('a new client who needs action keeps both of those',
   buckets(['action', 'onboarding']).sort().join() === 'action,onboarding');
ok('each of her four buckets has a signal that names it',
   /bucket: 'action'/.test(CODE) && /bucket: 'week'/.test(CODE) &&
   /bucket: 'onboarding'/.test(CODE) && /bucket: 'open'/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
