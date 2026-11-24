// One answer per question.
//
// Two faults from the 24 Nov review, which look unrelated and are the same
// mistake: a section that gives NO answer where it will have one, and a page
// that gives TWO answers to one question.
//
//  1. "On a client page, the Today block sat on 'Reading today's schedule from
//     Viv...' for more than seven seconds, and the Next Visit and Care Team
//     cards never appeared." Not a regression -- the read is slow sometimes,
//     and the median measured live on this build was near one second -- but a
//     fair report, because those two sections rendered nothing at all while
//     the read was in flight, and an absent section is indistinguishable from
//     an empty one.
//
//  2. "Maryland Compliance: the top tiles (5, 9, 17, 28) still sit above chips
//     with different numbers (42, 2, 66, 2)." V1's four-problem strip and the
//     grouping Courtney replaced it with, both on screen, both correct, both
//     counting something else.
//
//  And two row-line rules from the previous round that matched nothing: the
//  first pass invented .rd-rdy-row and .rd-comm-row, which exist nowhere.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const RD  = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const V1  = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

// ── 1. a section that is still loading does not read as empty ─────────────
ok('there is one pending line for the sections that share Today’s read',
   /function alsoWaiting\(snap\) \{/.test(RD));
ok('...it says it is still reading while the read is in flight',
   /if \(snap\.state === 'loading'\) return '<p class="rd-ws-load">Still reading from Viv/.test(RD));
ok('...and says the read failed when it failed',
   /if \(snap\.state === 'error'\) return '<p class="rd-ws-warn">Not known/.test(RD));
/* With no Viv connection at all, Today already says so once. Three sections
   saying it is noise, so alsoWaiting returns null and the sections drop. */
ok('...and stays quiet when the whole build has no Viv to read',
   !/snap\.state === 'none'/.test(RD.slice(RD.indexOf('function alsoWaiting'),
                                           RD.indexOf('function alsoWaiting') + 400)));
ok('it is computed once, not once per section', (RD.match(/const wait = alsoWaiting\(snap\);/g) || []).length === 1);
ok('Next visit keeps its heading while the read is in flight',
   /else if \(wait\) out \+= block\('Next visit', wait\);/.test(RD));
ok('Care team keeps its heading while the read is in flight',
   /else if \(wait\) out \+= block\('Care team', wait\);/.test(RD));
/* The ordering matters: a real answer outranks the pending line, and the
   pending line outranks "nothing scheduled". Reversed, a loaded client would
   read as waiting forever. */
const nv = RD.slice(RD.indexOf("if (next) out += block('Next visit'"));
ok('...and a real next visit still outranks the pending line',
   nv.indexOf("else if (wait)") < nv.indexOf("Nothing scheduled in the next two weeks"));
/* A ready read with an empty care team is its own answer, and it was silent
   too: the section simply vanished. */
ok('an empty care team on a finished read says which kind of empty it is',
   /quiet\(sv\.length \? 'No caregiver is named on any visit yet\.'/.test(RD) &&
   /: 'Nothing on the schedule for this client\.'\)\);/.test(RD));

// ── 2. Maryland shows one set of numbers ──────────────────────────────────
/* HIDDEN, NOT REMOVED. V1 rewrites md-kpi on every Viv refresh and does not
   null-guard the handle, which is the same reason the caseload tile went into
   a display:none sink rather than being deleted. */
ok('V1’s four-tile Maryland strip is off the page',
   /#page-md #md-kpi \{ display: none !important; \}/.test(CSS));
ok('...and still exists for V1 to write into', /id="md-kpi"/.test(V1));
/* The old rule hid the tab row and the Mine toggle BY NAME, which left the
   empty .rd-subbar holding a row of vertical space. */
ok('nothing is left of V1’s superseded control bar',
   /#md-views\.rd-md-superseded > \* \{ display: none !important; \}/.test(CSS));
/* supersedeMdBar moves the search input OUT before marking the bar, so hiding
   everything inside it cannot take the search with it. */
ok('...and the search input is rescued before the bar is marked',
   /insertBefore\(search, host\);[\s\S]{0,120}bar\.classList\.add\('rd-md-superseded'\)/.test(RD));

// ── 3. the two row-line rules that matched nothing ────────────────────────
/* The names survive in the comment that explains the mistake, which is worth
   keeping, so this reads the stylesheet with its comments stripped. */
const CSSR = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
ok('the invented class names match nothing any more', !/rd-rdy-row|rd-comm-row/.test(CSSR));
/* Both lists are built by V1 with the row line written INLINE, so a
   stylesheet rule without !important loses to it however specific it is. */
ok('coverage readiness and communities rows are reached as they are built',
   /#cov-summary > div\[onclick\], #ec-list > div\[onclick\] \{/.test(CSS));
ok('...with !important, because the line they beat is an inline style',
   /#cov-summary > div\[onclick\], #ec-list > div\[onclick\] \{\s*\n?\s*border-bottom: 1px solid var\(--row-line\) !important;/.test(CSS));
ok('...and that is still true of V1: readiness writes its own #F1EEE8',
   /border-bottom:1px solid #F1EEE8/.test(V1));
ok('...and communities writes var(--line-soft)',
   /border-bottom:1px solid var\(--line-soft\)/.test(V1));
/* Zebra and hover are NOT set inline, so they need no override. */
ok('zebra and hover need no !important and do not use one',
   /#cov-summary > div\[onclick\]:nth-of-type\(even\)/.test(CSS) &&
   !/nth-of-type\(even\),?\s*\n?#ec-list > div\[onclick\]:nth-of-type\(even\) \{ background: var\(--row-zebra\) !important/.test(CSS));
/* Her floor, restated where it is enforced. */
ok('no list line is lighter than her floor', /--row-line: #DDD6CC;/.test(CSS));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
