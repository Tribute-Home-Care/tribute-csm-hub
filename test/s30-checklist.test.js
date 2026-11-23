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
  ok(label + ': the three states are hers',
     /state=\(late\.length>1\|\|by>3\)\?'atrisk':'watch';/.test(SRC) &&
     /let state='ontrack'/.test(SRC));
  ok(label + ': the line names the oldest overdue item, not a count',
     /const oldest=late\.slice\(\)\.sort\(\(a,b\)=>a\.due\.localeCompare\(b\.due\)\)\[0\];/.test(SRC));
  ok(label + ': ...in her shape, "X is N days overdue"',
     /' is '\+\n?\s*\(by===0\?'due today':\(by\+' day'\+\(by===1\?'':'s'\)\+' overdue'\)\)/.test(SRC));

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
ok('the checklist is at the top of Summary', /wsS30\(c\) \+\n\s*'<div class="rd-sum-l">'/.test(RD));
ok('...and only until it is finished', /if \(!k \|\| k\.finished\) return '';/.test(RD));
// A finished checklist is history and belongs in Activity, not on the page a
// CSM reads before a call.
ok('...and not at all past the window', /if \(k\.daysIn > 30\) return '';/.test(RD));
ok('finished weeks are collapsed and the current one is open',
     /'<details class="rd-s30-w' \+ \(w\.finished \? ' fin' : ''\) \+ '"' \+ \(open \? ' open' : ''\)/.test(RD));
ok('a Viv-confirmed item says so', /\(r\.viv \? 'picked up from Viv ' : ''\)/.test(RD));
ok('...and is marked differently from one a person ticked',
   /\.rd-s30-r\.done\.viv \.rd-s30-b \{ color: var\(--brand-blue/.test(CSS));
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
