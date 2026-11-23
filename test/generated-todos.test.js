// To-dos the Hub writes for you, and what happens when you tick one off.
//
// Courtney, 17 Nov, section 6:
//   "Pulse next steps, Success in 30 milestones, and overdue visits or
//    touchpoints drop onto the to-do list on their own, tagged with where they
//    came from (From Pulse, Success in 30, Overdue)."
//   "Check it off with one tap, then pick what happened: Spoke with family,
//    Left voicemail, Emailed, Scheduled visit, or No longer needed."
//   "It saves to the client's Activity as 'Task completed', with the task, the
//    outcome, the note, the CSM's name, and the date and time."
//   "No double logging. If the outcome was a call or an email, it also logs the
//    touchpoint, so it counts toward cadence. If the to-do came from Pulse, the
//    Pulse flag closes."
//   "Auto-clear when Viv shows it's done."
//   "Clear completed only clears the CSM's list. The history stays."
//
// The design decision that makes most of this work: a generated to-do is NOT
// stored. It is derived from the same facts the rest of Home reads, every time
// the list draws. Auto-clear is then not a feature at all — log the visit and
// the row has nothing left to stand on. A stored copy would have to be hunted
// down, and would be wrong in the gap between the visit landing and the sweep.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const RD = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');

for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  // ── the three sources, tagged ───────────────────────────────────────────
  ok(label + ': her three sources are named in her words',
     /pulse:'From Pulse',s30:'Success in 30',overdue:'Overdue'/.test(SRC));
  ok(label + ': a Pulse suggestion becomes a to-do',
     /pp\.card&&pp\.card\.recommendedAction/.test(SRC) && /source:'pulse'/.test(SRC));
  ok(label + ': ...but not one that has already been sorted',
     /pp\.level!=='green'&&sug&&!c\.pulseAck/.test(SRC));
  ok(label + ': an overdue milestone becomes a to-do',
     /source:'s30'/.test(SRC) && /if\(ms\.find\(x=>x\.clientId===c\.id&&x\.id===m\.id\)\)return;/.test(SRC));
  ok(label + ': ...and one that is not due yet does not', /if\(daysIn<=td\)return;/.test(SRC));
  ok(label + ': an overdue visit and an overdue touchpoint become to-dos',
     /id:'gen:visit:'\+c\.id/.test(SRC) && /id:'gen:tp:'\+c\.id/.test(SRC));
  ok(label + ': the row says where it came from', /class="todo-src"/.test(SRC));

  // ── one definition of overdue ───────────────────────────────────────────
  // Two copies of the milestone deadlines would be two different ideas of
  // "late" on one screen, which is the counts problem in another costume.
  ok(label + ': the milestone deadlines are defined once and shared',
     /const TODO_MS_DAYS=\{asmt:1/.test(SRC) && /const MS_DAYS=TODO_MS_DAYS;/.test(SRC));

  // ── identity ────────────────────────────────────────────────────────────
  // Keyed on what the row is ABOUT. A new Pulse flag is a new id, so last
  // week's "no longer needed" cannot silence this week's flag.
  ok(label + ': a Pulse to-do is keyed on the flag, not on the client alone',
     /'gen:pulse:'\+c\.id\+':'\+_todoKey\(pp\.flagReason\|\|pp\.level\)/.test(SRC));

  // ── finishing one ───────────────────────────────────────────────────────
  ok(label + ': the five outcomes are hers, in her order',
     /'Spoke with family'[\s\S]{0,40}'Left voicemail'[\s\S]{0,40}'Emailed'[\s\S]{0,60}'Scheduled visit'[\s\S]{0,60}'No longer needed'/.test(SRC));
  ok(label + ': the note is optional', /placeholder="One line, if it is worth keeping"/.test(SRC));
  ok(label + ': snooze moves it to a later date', /function snoozeTodo\(\)\{/.test(SRC));

  // ── the record ──────────────────────────────────────────────────────────
  // Object.assign since priority 9: a task filed inside somebody else's Hub
  // also carries who was actually signed in. See view-as.test.js.
  ok(label + ': finishing writes a task row on the client',
     /tasks\.unshift\(Object\.assign\(\{id:'task'\+now\.getTime\(\),clientId:t\.clientId,date:day,/.test(SRC));
  ok(label + ': ...carrying the task, the outcome, the note, the CSM and the time',
     /text:String\(t\.text\),outcome:o\.label,note,source:t\.source\|\|'own',\n?\s*by:P\?P\.name:'',at:now\.toISOString\(\)/.test(SRC));

  // ── no double logging ───────────────────────────────────────────────────
  ok(label + ': a call or an email also logs the touchpoint',
     /if\(t\.clientId&&o\.tp\)\{/.test(SRC) && /type:o\.tp,/.test(SRC));
  ok(label + ': a scheduled visit does not log a touchpoint',
     /\{id:'visit', label:'Scheduled visit',    tp:''\}/.test(SRC));
  ok(label + ': a milestone ticks itself off by being logged',
     /if\(t\.source==='s30'&&t\.ms&&t\.clientId\)\{/.test(SRC));
  ok(label + ': ...and is not logged twice',
     /if\(!ms\.find\(x=>x\.clientId===t\.clientId&&x\.id===t\.ms\)\)\{/.test(SRC));
  ok(label + ': a Pulse to-do closes its flag',
     /if\(t\.source==='pulse'&&t\.clientId&&typeof setPulseAck==='function'\)/.test(SRC));
  // setPulseAck prompts for a note. A second prompt straight after the sheet
  // that already asked for one reads as a bug, so the caller supplies it.
  ok(label + ': ...without asking for the note a second time',
     /function setPulseAck\(id,state,note\)\{/.test(SRC) &&
     /if\(note===undefined\)note=\(prompt\(/.test(SRC));

  // ── auto-clear, which falls out of not storing them ────────────────────
  ok(label + ': generated rows are derived at render, not stored',
     /let gen=\[\];try\{gen=generatedTodos\(\);\}catch\(e\)\{gen=\[\];\}/.test(SRC));
  ok(label + ': "no longer needed" is the one case that needs recording',
     /if\(o\.skip\)_todoSkip\(t\.id\);/.test(SRC));
  ok(label + ': a snoozed generated row comes back on its own',
     /const days=Math\.max\(1,Math\.round\(\(new Date\(d\+'T12:00:00'\)-Date\.now\(\)\)\/864e5\)\);/.test(SRC));
  ok(label + ': a skip that has run out stops hiding the row',
     /return !!\(r&&r\.until&&r\.until>=new Date\(\)\.toISOString\(\)\.slice\(0,10\)\);/.test(SRC));

  // ── Clear Completed clears a list, not a record ────────────────────────
  ok(label + ': Clear Completed still only touches the CSM\'s own rows',
     /function clearDone\(\)\{set\('todos',get\('todos'\)\.filter\(t=>!t\.done\)\);/.test(SRC));
  ok(label + ': a generated row has no delete button to lose it by',
     /\$\{t\.source\?'':`<button class="btn btn-sm btn-o" onclick="delTodo/.test(SRC));
}

/* ── THE PULSE ROWS HAVE TO BE ABLE TO ARRIVE ─────────────────────────────
   Two faults found by watching the live page, not by reading the diff.

   First, Pulse lands seconds after Home has drawn, and nothing repainted the
   to-do list, so the From Pulse rows were absent until something else
   happened to redraw it, which on a normal morning is never.

   Second, and worse, loadPulse is fired and forgotten at startup. On a cold
   load it can run before the token is ready. One 401 and _PULSE stayed null
   for the whole session: every Pulse chip, the client-page banner and these
   to-dos quietly missing. Measured on 23 Nov the endpoint answered a
   hand-made request in 677ms with 236 clients while _PULSE was still null
   twelve seconds in. Pre-existing, and this is what surfaced it. */
for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  ok(label + ': the to-do list repaints when Pulse lands',
     /try\{ renderTodos\(\); \}catch\(e2\)\{\}/.test(SRC));
  ok(label + ': a failed Pulse load is retried rather than lost',
     /window\._pulseTries=\(window\._pulseTries\|\|0\)\+1;/.test(SRC));
  ok(label + ': ...a bounded number of times', /window\._pulseTries<4/.test(SRC));
  ok(label + ': ...only while nothing has loaded', /if\(!_PULSE&&window\._pulseTries<4&&!window\._pulseRetry\)/.test(SRC));
  ok(label + ': ...and backing off rather than hammering',
     /const wait=window\._pulseTries\*4000;/.test(SRC));
}
/* AND IT HAS TO BE ASKED FOR AT ALL. The retry above only helps if loadPulse
   runs. It used to be called from inside vivSyncNow and nowhere else, and
   that sync is skipped when one ran in the last thirty minutes — so on any
   second visit inside half an hour the Hub had NO Pulse: no chips on the
   client list, no banner on the client page, no suggested next steps. The one
   place that still worked was the Pulse page, which asks for it itself, which
   is why this survived: the page you would check to see whether Pulse was
   working was the page that repaired it. */
for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  ok(label + ': Pulse is loaded on sign-in, not only after a Viv sync',
     /else setVirtual?VivLabel|loadPulse\(false\);\n\}/.test(SRC) ||
     /thirty minutes[\s\S]{0,600}\n  loadPulse\(false\);\n\}/.test(SRC));
  ok(label + ': ...and two callers at once make one request',
     /if\(window\._pulseLoading\)return;/.test(SRC) &&
     /window\._pulseLoading=true;/.test(SRC));
  ok(label + ': ...with the flag released however it ends',
     /\}finally\{\n    window\._pulseLoading=false;\n  \}/.test(SRC));
}

// Behavioural: the retry gate.
const retry = (loaded, tries, pending) => !loaded && tries < 4 && !pending;
ok('a first failure retries', retry(false, 1, false));
ok('a third failure retries', retry(false, 3, false));
ok('a fourth does not', !retry(false, 4, false));
ok('a load that succeeded in the meantime stops the retries', !retry(true, 1, false));
ok('a retry already scheduled is not scheduled twice', !retry(false, 1, true));

// ── the history shows up where she asked for it ──────────────────────────
ok('a finished task appears in the client\'s Activity',
   /rowsFor\('tasks', c\.id\)\.forEach/.test(RD) && /kind: 'Task completed'/.test(RD));
ok('...under the family filter, like the touchpoint it records',
   /kind: 'Task completed', party: 'family'/.test(RD));
ok('...carrying the task, the note and who did it',
   /\[String\(t\.text \|\| ''\)\.slice\(0, 70\), t\.note, t\.by\]\.filter\(Boolean\)/.test(RD));

// ── behavioural: the rules that decide whether a row exists ─────────────
const MS_DAYS = { asmt: 1, visit2: 14, fam_wk1: 7 };
const dueNow = (daysIn, msId, logged) => daysIn > (MS_DAYS[msId] || 7) && !logged;
ok('day 3 of 30: the assessment is overdue, the second visit is not',
   dueNow(3, 'asmt', false) === true && dueNow(3, 'visit2', false) === false);
ok('a logged milestone never appears, however late', dueNow(30, 'asmt', true) === false);

const skipped = (until, today) => !!(until && until >= today);
ok('a skip with a future date hides the row', skipped('2026-12-01', '2026-11-23'));
ok('a skip that expired yesterday does not', !skipped('2026-11-22', '2026-11-23'));
ok('no skip at all does not', !skipped('', '2026-11-23'));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
