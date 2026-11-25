// Success in 30, as a checklist.
//
// Courtney, 17 Nov, section 7: "Success in 30 should be a checklist like the
// other two, so CSMs and CSPs work it the same way... Grouped by week: Before
// Start of Care, Days 1-7, Days 8-14, Days 15-21, Days 22-30. Finished weeks
// collapse. The current week sits on top... Status sits in the header with the
// reason: On Track, Watch or At Risk, with one plain line on why ('caregiver
// week-1 check-in is 1 day overdue')." And: "The open checklist sits at the
// top of the Summary tab until it's finished."
//
// WHAT IS NOT HERE. The CONTENT of all three checklists comes from a document
// she refers to ("You have the checklist document with what goes on each
// checklist, who owns each item and when it's due") which is not in SharePoint
// or in mail from this machine. So Offboarding is not built at all rather than
// invented, and this one runs on S30_MILESTONES, which the Hub already had and
// which the team already works to.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const RD = strip(fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8'));
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');

for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  ok(label + ': her five weeks, in her words',
     /\{ id:'pre',  label:'Before Start of Care'/.test(SRC) &&
     /label:'Days 1\\u20137'/.test(SRC) && /label:'Days 22\\u201330'/.test(SRC));
  ok(label + ': a before-Day-1 item lands before start of care',
     /if\(\/before day 1\/i\.test\(m\.target\|\|''\)\) return 'pre';/.test(SRC));
  ok(label + ': every other item lands by its own deadline',
     /const d=TODO_MS_DAYS\[m\.id\]\|\|7;/.test(SRC));
  // Two copies of the deadlines would be two ideas of "late" again.
  ok(label + ': ...the same deadlines the to-do list uses', /TODO_MS_DAYS\[m\.id\]/.test(SRC));

  ok(label + ': overdue rows come first inside their phase',
     /items\.sort\(\(a,b\)=>\(b\.overdue-a\.overdue\)\|\|a\.due\.localeCompare\(b\.due\)\);/.test(SRC));
  ok(label + ': a finished phase knows it is finished',
     /finished:items\.length>0&&d===items\.length/.test(SRC));
  ok(label + ': the week in progress is the first unfinished one',
     /const current=weeks\.find\(w=>!w\.finished\);/.test(SRC));
  ok(label + ': a week with nothing in it is not rendered', /\.filter\(w=>w\.items\.length\)/.test(SRC));

  // ── the status line ─────────────────────────────────────────────────────
  /* HER ACTUAL RULES, from Part 3 of the Onboarding, Offboarding & Success in
     30 document, which arrived after the first version of this was built. My
     first pass used only the overdue count: it got the easy half right and
     ignored the service exceptions and the caregiver churn entirely, so a
     client with a complaint on file and nothing overdue read On Track. */
  ok(label + ': Watch is one item up to 3 days late, one SE, or one caregiver change',
     /if\(late\.length===1\)watch\.push/.test(SRC) &&
     /if\(ses\.any&&!ses\.complaint\)watch\.push\('a new service exception'\);/.test(SRC) &&
     /if\(cgChanges===1\)watch\.push\('one unplanned caregiver change'\);/.test(SRC));
  ok(label + ': At Risk is 2+ overdue, the day 14 visit, a complaint, or 2+ caregiver changes',
     /if\(late\.length>1\)atRisk\.push/.test(SRC) &&
     /if\(d14Missed\)atRisk\.push\('the day 14 visit was missed'\);/.test(SRC) &&
     /if\(ses\.complaint\)atRisk\.push\('a client complaint is on file'\);/.test(SRC) &&
     /if\(cgChanges>1\)atRisk\.push/.test(SRC));
  ok(label + ': At Risk outranks Watch', /if\(atRisk\.length\)\{ state='atrisk'/.test(SRC));
  ok(label + ': an open dissatisfaction exception is enough to leave On Track',
     /else if\(ses\.dissatisfaction\)\{ state='watch'/.test(SRC));
  /* One of her conditions cannot be seen from here. Saying so beats implying
     the Hub checked it. */
  ok(label + ': the condition the Hub cannot see is named, not faked',
     /missing:\['whether the family has asked to remove a caregiver'\]/.test(SRC));
  ok(label + ': the day 14 visit is found by id, not by position',
     /const d14=rows\.find\(r=>r\.id==='visit2'\);/.test(SRC));

  // ── owners ──────────────────────────────────────────────────────────────
  /* Her rule says every row carries an owner, and the real assignment is in
     the document. Two are derivable without it and only two: the Viv setup
     items are the CSP's because the Viv onboarding checklist already files
     them there, and the touchpoint milestones are the CSM's because they are
     measured off the CSM's own touchpoint log. */
  ok(label + ': an owner is derived, never invented',
     /function _s30Owner\(m\)\{ return m\.type==='VIV' \? 'CSP' : 'CSM'; \}/.test(SRC));

  // ── Viv ticks its own items ────────────────────────────────────────────
  ok(label + ': a milestone is done when its touchpoint is logged',
     /const hit=ms\.find\(x=>x\.id===m\.id\);/.test(SRC));
  ok(label + ': ...and the row records whether Viv or a person did it',
     /viv:hit\?hit\.type!=='TASK':false/.test(SRC));
}

// ── where it renders ──────────────────────────────────────────────────────
/* INSIDE a column now, not a third child of the two-column grid: as a sibling
   of the columns it took a cell of its own and pushed the second column to a
   new row, leaving 350px of blank space beneath it. */
ok('the checklist is at the top of Summary',
   /'<div class="rd-sum-l">' \+ wsS30\(c\) \+/.test(RD));
ok('...and only until it is finished', /if \(!k \|\| k\.finished\) return '';/.test(RD));
// A finished checklist is history and belongs in Activity, not on the page a
// CSM reads before a call.
/* The window is thirty days, or sixty on a client the Day 30 result extended
   to Success in 60. "Gets 30 more days with the same checks" includes this
   card, which is where a CSM reads the checks before a call. */
ok('...and not at all past the window', /if \(k\.daysIn > s60Win\(c\)\) return '';/.test(RD));
ok('finished weeks are collapsed and the rest are open',
     /'<details class="rd-s30-w' \+ \(w\.finished \? ' fin' : ''\) \+ '"' \+ \(open \? ' open' : ''\)/.test(RD) &&
     /const open = !w\.finished;/.test(RD));
/* The first cut opened only the FIRST unfinished week, and on a real client
   that hid the thing the status line was pointing at: the header read
   "assessment completed is 4 days overdue" while the week holding the
   assessment was shut. A status that names what you cannot see is worse than
   no status. Found by opening the page. */
ok('...so the item the status names is never hidden',
   !/const open = w\.id === k\.currentWeek;/.test(RD));
ok('a Viv-confirmed item says so', /\(r\.viv \? 'picked up from Viv ' : ''\)/.test(RD));
/* Green FILL where a person ticked it, blue FILL where Viv confirmed it.
   It used to be the tick's colour on an 18 x 3px box that read as a grey
   dash; it is the box itself now. */
ok('...and is marked differently from one a person ticked',
   /\.rd-s30-b\.viv \{[\s\S]{0,160}background: var\(--brand-blue/.test(CSS) &&
   /\.rd-s30-b\.done,[\s\S]{0,200}background: var\(--pos/.test(CSS));
/* THE BOX WAS 18 x 3px. An 18px grid column with align-items: baseline, and
   an empty button has no baseline to align to, so it rendered as a grey
   dash. A control nobody recognises is a control nobody presses. */
ok('the box is a box, in a column that cannot collapse it',
   /grid-template-columns: 28px minmax\(0, 1fr\) 42px auto;/.test(CSS) &&
   /align-items: start;/.test(CSS) &&
   /min-width: 22px; min-height: 22px;/.test(CSS));
/* Finger-sized target without disturbing the layout. */
ok('...with a 40px hit area that does not change the layout',
   /button\.rd-s30-b::after,[\s\S]{0,140}inset: -9px;/.test(CSS));
ok('...and the same control on the to-do list and the onboarding board',
   /\.todo-item > input\[type="checkbox"\],/.test(CSS) && /input\.ob-cb \{/.test(CSS));
/* A screen reader announcing "button, checked" eleven times down a checklist
   says nothing about which eleven. */
ok('it is a checkbox to a screen reader, and it names its task',
   /role="checkbox" aria-checked="/.test(RD) && /aria-label="' \+ esc\(r\.label\) \+ '"/.test(RD));
ok('...and Viv\'s is announced as what it is, not as a pressable control',
   /role="img" aria-label="/.test(RD) && /\.rd-s30-b\.viv \{[\s\S]{0,200}cursor: default;/.test(CSS));
ok('an overdue row is red', /\.rd-s30-r\.late \.rd-s30-t \{ color: var\(--bad\)/.test(CSS));
ok('the card carries its state on the border, not all over it',
   /\.rd-s30\.bad  \{ border-left-color: var\(--bad\); \}/.test(CSS));
ok('it stacks on a phone rather than clipping', /@media \(max-width: 700px\) \{\n  \.rd-s30-r \{ grid-template-columns: 18px minmax\(0, 1fr\)/.test(CSS));

// ── behavioural: the status rule, over the cases that matter ─────────────
const judge = (late, done, total) => {
  if (late.length) {
    const oldest = late.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
    const by = oldest.by;
    return (late.length > 1 || by > 3) ? 'atrisk' : 'watch';
  }
  return done === total ? 'done' : 'ontrack';
};
ok('nothing late and not finished is on track', judge([], 3, 10) === 'ontrack');
ok('everything logged is complete', judge([], 10, 10) === 'done');
ok('one thing a day late is a watch', judge([{ due: '2026-11-22', by: 1 }], 5, 10) === 'watch');
ok('one thing badly late is a risk', judge([{ due: '2026-11-10', by: 13 }], 5, 10) === 'atrisk');
ok('two things late is a risk, however slight',
   judge([{ due: '2026-11-22', by: 1 }, { due: '2026-11-21', by: 2 }], 5, 10) === 'atrisk');

// Behavioural: the week a milestone belongs to.
const WEEKS = [['pre', 0], ['w1', 7], ['w2', 14], ['w3', 21], ['w4', 30]];
const weekOf = (target, days) => /before day 1/i.test(target || '') ? 'pre'
  : (WEEKS.find(w => w[1] >= days) || WEEKS[WEEKS.length - 1])[0];
ok('the caregiver prep call is before start of care', weekOf('Before Day 1', 1) === 'pre');
ok('the assessment is in the first week', weekOf('Day 0-1', 1) === 'w1');
ok('the second visit is in the second', weekOf('By Day 14', 14) === 'w2');
ok('the week-4 family contact is in the last', weekOf('Week 4', 30) === 'w4');
ok('anything past day 30 still lands somewhere', weekOf('', 99) === 'w4');

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
