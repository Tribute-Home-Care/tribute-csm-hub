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
  /* Pulse reads red, amber or green, and those are Courtney's three words
     from section 9: red needs action, amber is a watch, green is stable. So a
     RED flag joins Needs attention and an AMBER one joins Due soon. The first
     pass put both into Needs attention, which made a watch look like an
     emergency and filled the tab with things nobody was asked to do today. */
  ok(label + ': ...as a bad cadence exception OR a RED Pulse flag',
     /if \(e && e\.tone === 'bad'\) return true;\n\s*return pulseLevel\(c\) === 'red';/.test(CODE));
  ok(label + ': an amber flag is a watch, so it lands in Due soon',
     /if \(pulseLevel\(c\) === 'amber'\) return true;/.test(CODE));
  ok(label + ': a sorted flag is in neither',
     /if \(c\.pulseAck\) return '';/.test(CODE));
  ok(label + ': green is stable and never a flag at all',
     /return \(l && l !== 'green'\) \? l : '';/.test(CODE));
  ok(label + ': the COUNT asks it', /attention: all\.filter\(needsAction\)\.length,/.test(CODE));
  ok(label + ': the LIST asks it',
     /if \(_view === 'attention'\) list = list\.filter\(function \(r\) \{ return needsAction\(r\.c\); \}\);/.test(CODE));
  ok(label + ': the Home tile asks it', /const bad = real\.filter\(needsAction\);/.test(CODE));
  /* THE PARTITION IS THREE WAYS SINCE 23 NOVEMBER, because her pictures
     have both a Watch chip and a Due this week chip. The rule is unchanged:
     no client may be counted twice. Each of the two lower buckets refuses a
     client the one above it has already claimed. */
  ok(label + ': Due this week excludes anything already needing action, or on watch',
     /function dueThisWeek\(c\) \{\n\s*if \(needsAction\(c\) \|\| pulseLevel\(c\) === 'amber'\) return false;/.test(CODE));
  ok(label + ': Watch excludes anything already needing action, or due this week',
     /function onWatch\(c\) \{\n\s*if \(needsAction\(c\)\) return false;/.test(CODE) &&
     /function onWatch\(c\) \{[\s\S]*?if \(dueThisWeek\(c\)\) return false;/.test(CODE));
  ok(label + ': ...and each count and each list asks its own question',
     /watch: all\.filter\(onWatch\)\.length/.test(CODE) &&
     /soon: all\.filter\(dueThisWeek\)\.length/.test(CODE) &&
     /_view === 'watch'\) list = list\.filter\(function \(r\) \{ return onWatch\(r\.c\); \}\)/.test(CODE) &&
     /_view === 'soon'\) list = list\.filter\(function \(r\) \{ return dueThisWeek\(r\.c\); \}\)/.test(CODE));
  ok(label + ': nothing still counts every exception as needing attention',
     !/attention: all\.filter\(function \(c\) \{ return !!exceptionFor\(c\); \}\)/.test(CODE));
}

/* Behavioural: the partition, now that a Pulse flag can put a client in
   Needs attention on its own. The case that matters is the third one — a
   client whose cadence is merely due soon but whose Pulse is flagged belongs
   in Needs attention, counted ONCE. */
const lvl = c => c.ack ? '' : (c.p && c.p !== 'green' ? c.p : '');
const needsAction = c => (c.t === 'bad') || lvl(c) === 'red';
const dueSoonOnly = c => !needsAction(c) && (lvl(c) === 'amber' || c.t === 'warn');
const CASES = [
  { n: 'bad cadence, no flag',            t: 'bad',  p: null },
  { n: 'no cadence problem, red flag',    t: null,   p: 'red' },
  { n: 'due soon AND red flag',           t: 'warn', p: 'red' },
  { n: 'due soon AND amber flag',         t: 'warn', p: 'amber' },
  { n: 'amber flag, cadence fine',        t: null,   p: 'amber' },
  { n: 'due soon, no flag',               t: 'warn', p: null },
  { n: 'flag already sorted',             t: null,   p: 'red', ack: 1 },
  { n: 'nothing at all',                  t: null,   p: null }
];
const attn = CASES.filter(needsAction), soonOnly = CASES.filter(dueSoonOnly);
ok('a RED flag alone puts a client in Needs attention',
   attn.some(c => c.n === 'no cadence problem, red flag'));
// An amber flag is a watch. Putting it in Needs attention is what made that
// tab most of the caseload and taught people to stop reading it.
ok('no amber flag ever lands in Needs attention on its own',
   !attn.some(c => c.p === 'amber' && c.t !== 'bad'));
ok('a client due soon with a RED flag is counted once, under Needs attention',
   attn.some(c => c.n === 'due soon AND red flag') &&
   !soonOnly.some(c => c.n === 'due soon AND red flag'));
ok('a client due soon with an amber flag is in Due soon only',
   soonOnly.some(c => c.n === 'due soon AND amber flag') &&
   !attn.some(c => c.n === 'due soon AND amber flag'));
ok('an amber flag on a healthy cadence still reaches Due soon',
   soonOnly.some(c => c.n === 'amber flag, cadence fine'));
ok('a sorted flag is in neither', !attn.concat(soonOnly).some(c => c.ack));
ok('the two never overlap', !attn.some(c => soonOnly.indexOf(c) > -1));
ok('and they add up to 6 of the 8', attn.length + soonOnly.length === 6);

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
ok('Home counts due this week as dates, the same way its tab does',
   /const warn = real\.filter\(dueThisWeek\);/.test(CODE));
ok('the old inline copies are gone',
   !/exc\.filter\(function \(r\) \{ return r\.ex\.tone/.test(CODE));
ok('Home sends you to the tab that now agrees with it',
   /tone: 'bad', go: 'clients', view: 'attention'/.test(CODE) &&
   /label: 'Due this week'[\s\S]{0,200}view: 'soon'/.test(CODE));
/* An amber Pulse flag is a watch item on both pages. Left in the week bucket
   it would have been counted by a Home tile whose Clients tab of the same
   name excluded it, which is the exact disagreement this file exists to
   catch. There is no Watch tile on Home, by her design, so the row shows in
   the unfiltered list and is filtered on the Clients page instead. */
ok('an amber flag is a watch item on Home too, not a date',
   /bucket: lvl === 'red' \? 'action' : 'watch',/.test(CODE));
ok('...and so is an exception that describes a gap rather than a deadline',
   /\(ex\.rank === 4 \|\| ex\.rank === 5\) \? 'watch' : 'week'/.test(CODE));

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
/* THE SUPPRESSION RULE STAYS, AND NOTHING USES IT TODAY. I had used it to
   strip the number off Fill Priority, arguing that the page ranks the whole
   caseload for a coverage event rather than listing open visits. Both of
   Courtney's pictures keep "Fill Priority 38" on the rail beside a Home tile
   reading "38 Open visits / Goes to Fill Priority", and her model is the
   coherent one: the badge counts the open visits and the page is where you
   go to deal with them. The mechanism is kept because a future signal may
   genuinely have no list behind it. */
ok('the rail can still suppress a badge', /if \(s\.badge === false\) return;/.test(CODE));
ok('...and Fill Priority is not using it any more',
   !/go: 'priority', badge: false/.test(CODE) &&
   /tone: 'warn', go: 'priority', badge: true,/.test(CODE));
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
              { go: 'clients', n: 6 },                        // due this week
              { go: 'priority', n: 38, badge: true },         // open visits
              { go: 's60', n: 3 }];
ok('the Clients badge is the Needs action count, not the sum',
   badgeOf(REAL, 'clients') === 16);
ok('Fill Priority carries the open visit count, as her pictures do',
   badgeOf(REAL, 'priority') === 38);
ok('a page with one signal is unaffected', badgeOf(REAL, 's60') === 3);
ok('a page with no signal stays blank', badgeOf(REAL, 'ltc') === '');

/* ── THE OPEN VISITS TILE IS A DOORWAY ────────────────────────────────────
   "The number on each tile is the number of rows you get when you click it"
   is the right rule for the three tiles that filter the list below them. Her
   fourth tile does not filter anything: she drew it reading "38 / Open visits
   / Goes to Fill Priority", with 38 on the rail beside it. So it counts what
   is behind the door, says where the door goes, and opens it when pressed. */
ok('the doorway tile counts every open visit, which is what is behind the door',
   /if \(ovs\.total\) out\.push\(\{ n: ovs\.total, label: 'Open visits'/.test(CODE));
ok('...and says where it goes, in her words', /sub: 'Goes to Fill Priority'/.test(CODE));
ok('...and is marked a doorway, so the tile reads its own number',
   /bucket: 'open', doorway: true/.test(CODE) &&
   /const door = !!\(x && x\.doorway\);/.test(CODE) &&
   /const n = door \? x\.n : \(tn\[k\] \|\| 0\);/.test(CODE));
ok('...and pressing it navigates rather than filtering',
   /door \? ' data-go="' \+ esc\(x\.go\) \+ '"' : ' data-td="' \+ k \+ '"'/.test(CODE) &&
   /\.rd-attn-card\[data-go\], \.rd-attn-link/.test(CODE));
/* The other three must keep counting their own rows, or the doorway becomes
   a licence for any tile to invent a number. */
ok('the three filtering tiles still count the rows they will show',
   /const tn = \{\}; TODAY_BUCKETS\.forEach/.test(CODE) &&
   /\(r\.buckets \|\| \[r\.bucket\]\)\.forEach\(function \(b\) \{ if \(tn\[b\] !== undefined\) tn\[b\]\+\+; \}\)/.test(CODE));
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
/* A ROW IN A LIST OF PROBLEMS HAS TO SAY WHAT THE PROBLEM IS. Needs attention
   now includes an unsorted Pulse flag, and the Status column reads
   exceptionFor(), so a flagged client with a healthy cadence appeared there
   with an EMPTY status cell: worse than not appearing at all. */
ok('a Pulse-flagged client with no cadence problem still says why',
   /function pulseStatus\(c\) \{/.test(CODE) && /const st = ex \|\| ps;/.test(CODE));
ok('...and the cadence exception still leads where there is one',
   /const st = ex \|\| ps;/.test(CODE));
ok('...the Status cell reads whichever it is',
   /'<td>' \+ \(st \? '<span class="rd-cl-ex ' \+ st\.tone \+ '"><i class="rd-dot"><\/i>' \+ esc\(st\.text\)/.test(CODE));
/* THE EVIDENCE, NOT THE CODE. The first pass mapped flagReason through
   {L1,L2,L3}, copied from Home's own map. Checked against the live feed: the
   Pulse emits EIGHT codes, L1 to L8, and carries no label for any of them, so
   three read as words and five fell through to a generic line. That is the
   raw-system-text fault Courtney caught as "aware_none", wearing different
   clothes.

   The feed already carries the sentence: `reasons` is the rule evidence in
   English, "1 safety incident (45d)". No map to go stale when a ninth code
   arrives, and something a CSM can act on rather than a letter and a number. */
ok('the row shows the Pulse evidence, not a reason code',
   /const first = \(pp\.reasons \|\| \[\]\)\.map\(function \(r\) \{ return String\(r \|\| ''\)\.trim\(\); \}\)/.test(CODE));
/* THE SENTENCE, NOT THE SIGNAL. reasons[] holds the raw evidence Pulse
   counted -- "5 inbound family contacts in 7d" -- and where it had none this
   fell through to "Flagged by Pulse", which tells a CSM nothing. Home already
   shows the headline sentence for the same client, and two pages saying
   different things about one flag is the fault this review opened with. */
ok('the Clients row says what Home says about the same flag',
   /const head = pulseFirst\(pp\.headline\);/.test(CODE) &&
   /text: head \|\| first \|\| 'Flagged by Pulse',/.test(CODE));
ok('...and the raw signal is kept behind it, not thrown away',
   /note: first && head \? first : String\(pp\.headline \|\| ''\)/.test(CODE));
ok('the stale three-code map is gone', !/PULSE_REASON/.test(CODE));
/* Home's own subtitle had the same bug in a place nobody looked: its map
   covered L1 to L3, so on a real caseload the High need line read
   "41 L4 · 23 L5 · 38 L8". The codes are opaque to the Hub and the feed
   carries no label, so it says the one thing it can stand behind. */
const V1H = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
ok('Home no longer prints Pulse reason codes at a CSM',
   !/const LBL=\{L1:'safety or disclosure'/.test(V1H));
ok('...it counts what needs action and what is a watch',
   /if\(red\)out\.push\(red\+' needing action'\);/.test(V1H) &&
   /if\(amber\)out\.push\(amber\+' to watch'\);/.test(V1H));
// One-line rows: the sentence goes in the title, and she said herself the
// full read belongs on the client page under the banner.
ok('the sentence is on the row, not in the cell',
   /const tip = ps && ps\.note \? ps\.note : '';/.test(CODE));

/* ONE DEFINITION OF EACH BUCKET, SHARED WITH THE CLIENTS CHIPS. Home
   counted a client's bucket from the ROW the dedupe kept, while the chips
   counted with needsAction / onWatch / dueThisWeek over the client. Two
   different questions, so the pages answered differently: Home said Due this
   week 5 where the chip said 3, and In first 30 days 4 where the chip and the
   Onboarding badge said 3. Her rule is the point: if the badge says 9, the
   list under it has 9 clients in it. */
ok('Home buckets a client with the same predicates the chips use',
   /if \(needsAction\(c\)\) b\.push\('action'\);/.test(CODE) &&
   /else if \(onWatch\(c\)\) b\.push\('watch'\);/.test(CODE) &&
   /else if \(dueThisWeek\(c\)\) b\.push\('week'\);/.test(CODE));
ok('needing action today cancels merely due this week, by being an else',
   /if \(needsAction\(c\)\) b\.push\('action'\);\n\s*else if/.test(CODE));
ok('...and In first 30 days still overlaps, being a different axis',
   /if \(age !== null && age <= 30\) b\.push\('onboarding'\);/.test(CODE));
ok('...and a bucket the row carried that is not one of the four survives',
   /\['action', 'watch', 'week', 'onboarding'\]\.indexOf\(x\) < 0/.test(CODE));
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
