/* MARYLAND COMPLIANCE AND TEAM, AS TABLES.
 *
 * Courtney, sections 8 and 9:
 *   "Five tabs with one problem per row, instead of one row per client with
 *    a column for each requirement."
 *   "Very old items at the top of the list mixed with current deadlines."
 *   "No Mine / All CSMs / Group by CSM switch, only a Mine toggle."
 *   Team: "one row per CSM", not one large card per person.
 *
 * A tab per PROBLEM means a client with three problems is read three times
 * and a client with none is invisible, so the page answers "which problems
 * exist" when the question a CSM has is "is this client clear".
 *
 *   node test/md-and-team-tables.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const HUB = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

/* ── MARYLAND: one row per client ──────────────────────────────────────── */
ok('the layer draws a table', /function mdTableHtml\(rows\)/.test(CODE) && /function renderMdTable\(\)/.test(CODE));
ok('...and V1\'s five problem tabs come off',
   /\$\$\('button', tabs\)\.forEach\(function \(b\) \{ b\.hidden = true; \}\);/.test(CODE) &&
   /rowsEl\.hidden = true;/.test(CODE));
/* THE COLUMNS COME FROM MD_REGS. The page calls these "the seven Baltimore
   requirements" and MD_REGS defines SIX. Driving the table off the constant
   means the table and the regulation list cannot drift apart, whichever of
   the two is corrected. */
ok('the columns are generated from MD_REGS, not a list written here',
   /MD_REGS\.map\(function \(g\) \{/.test(CODE) && /MD_SHORT\[g\[0\]\] \|\| g\[0\]/.test(CODE));
ok('...and every reg in index.html has a short name',
   (() => {
     const tbl = (HUB.match(/const MD_REGS=\[[\s\S]*?\];/) || [''])[0];
     const keys = [...tbl.matchAll(/\['([a-z]+)',/g)].map(m => m[1]);
     const shorts = (CODE.match(/const MD_SHORT = \{[\s\S]*?\};/) || [''])[0];
     return keys.length > 0 && keys.every(k => new RegExp('\\b' + k + ':').test(shorts));
   })());
/* The same expressions renderMdDetail uses, in one place, so the table and
   the detail panel cannot disagree about one client. */
const ST = (CODE.match(/function mdStates\(r\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('there is one place deciding each requirement', !!ST);
const mdStates = eval('(' + ST + ')');
const base = { lastAssessment: null, initial: {}, reassessmentOwed: [], touchSource: null };
ok('nothing on file reads as "cannot judge", not as a pass',
   mdStates(base).cadence === null && mdStates(base).annual === null && mdStates(base).initial === null);
ok('an assessment past its cadence is not met',
   mdStates(Object.assign({}, base, { lastAssessment: { date: '2026-01-01' }, overdueByEff: 40 })).cadence === false);
ok('...and one inside it is',
   mdStates(Object.assign({}, base, { lastAssessment: { date: '2026-10-01' }, overdueByEff: -20 })).cadence === true);
ok('a reassessment owed is not met',
   mdStates(Object.assign({}, base, { reassessmentOwed: [{}] })).reassess === false);
ok('a missed week is not met, and no activity at all cannot be judged',
   mdStates(Object.assign({}, base, { missedWeeks12: 2 })).weekly === false &&
   mdStates(Object.assign({}, base, { touchSource: { noActivity: true } })).weekly === null);
/* VERY OLD IS NOT URGENT, IT IS HISTORY. An assessment 971 days overdue sat
   above one due next week. Nothing that old is a deadline anybody is going
   to meet this month; it is a record to correct. */
const CL = (CODE.match(/function mdIsCleanup\(r\) \{[\s\S]*?\n  \}/) || [''])[0];
const mdIsCleanup = eval('(function(){const MD_CLEANUP_DAYS=365;return ' + CL + ';})()');
ok('a year past due is cleanup', mdIsCleanup({ overdueByEff: 971 }) === true);
ok('...and a month past due is not', mdIsCleanup({ overdueByEff: 30 }) === false);
ok('...nor is one due next week', mdIsCleanup({ overdueByEff: -7 }) === false);
ok('a client with no assessment and no Viv forms at all is a records problem',
   mdIsCleanup({ overdueByEff: null, statusEff: 'none', formsOnFile: 0 }) === true);
ok('...but one with forms on file is a live deadline',
   mdIsCleanup({ overdueByEff: null, statusEff: 'none', formsOnFile: 3 }) === false);
ok('cleanup is folded away and named for what it is',
   /Records to correct, not deadlines to meet/.test(CODE) && /\.rd-md-clean > summary \{/.test(CSS));
/* Her switch, in her words. */
ok('Mine / All CSMs / Group by CSM',
   /\[\['mine', 'Mine'\], \['all', 'All CSMs'\], \['bycsm', 'Group by CSM'\]\]/.test(CODE));
ok('...and Group by CSM really groups', /const by = \{\};/.test(CODE) && /rd-md-g/.test(CODE));
ok('a row opens the detail panel V1 already draws',
   /window\._mdSel = tr\.dataset\.mdcid/.test(CODE) && /renderMdDetail\(\)/.test(CODE));
ok('...and the table repaints when V1 re-renders its rows',
   /window\.renderMdRows = function \(\)/.test(CODE));
/* THE LOAD IS THE ONE THAT MATTERS. Caught live: the page opens, renderMd()
   goes off to fetch the board, and the table drew once against an empty
   _mdData and read "Nothing outstanding under this view" for a CSM with
   twenty-seven clients on it. renderMd is async and does not call
   renderMdRows on every path. */
ok('...and it waits on the load, not only on a redraw',
   /window\.renderMd = function \(\)/.test(CODE) &&
   /Promise\.resolve\(out\)\.then\(function \(\) \{/.test(CODE));
/* A load already in flight fires neither hook for that pass. */
ok('...with a short follow-up that stops once there is a table',
   /if \(host\.querySelector\('table\.rd-md'\)\) \{ clearInterval\(settle\); return; \}/.test(CODE) &&
   /tries > 12/.test(CODE));

/* ── TEAM: one row per CSM ─────────────────────────────────────────────── */
ok('the layer draws a table into the element V1 drew cards in',
   /function renderTeamTable\(\)/.test(CODE) && /\$\('#team-cards'\)/.test(CODE));
ok('...by wrapping V1\'s renderer rather than racing it',
   /function installTeamTable\(\)/.test(CODE) && /window\.renderTeamOverview = wrapped;/.test(CODE));
ok('...and V1\'s cards stand if the table throws',
   /V1's cards stand if this throws/.test(SRC) && /if \(!rows\) return;/.test(CODE));
/* BARE NAMES, NOT window LOOKUPS. get, workloadFor, daysAgo, PROFILES and P
   are top-level `const` declarations in a classic script: they live in the
   shared global LEXICAL environment and are readable by name, but they are
   NOT properties of window. Asking window for them returned undefined, and
   the first cut silently fell back to V1's cards on a page that had every
   number it needed. */
ok('the numbers come from V1\'s own helpers, read by name',
   /\(typeof workloadFor === 'function'\) \? workloadFor : null/.test(CODE) &&
   /\(typeof get === 'function'\) \? get : null/.test(CODE) &&
   /\(typeof PROFILES !== 'undefined'\) \? PROFILES : null/.test(CODE));
ok('...and not through window, which does not carry them',
   !/window\.PROFILES/.test(CODE) && !/g\('workloadFor'\)/.test(CODE));
/* getOv is a const declared INSIDE renderTeamOverview, so nothing outside
   can reach it. Its rule is written out rather than pretended at. */
ok('the overdue rule is reproduced, since V1 keeps it as a local',
   /return c\.freq !== 'NA' && \(d === null \|\| d > \(parseInt\(c\.freq\) \|\| 90\)\);/.test(CODE));
ok('...and it matches the rule in index.html',
   /return c\.freq!=='NA'&&\(d===null\|\|d>\(parseInt\(c\.freq\)\|\|90\)\);/.test(HUB));
ok('self is excluded, as V1 already excludes it',
   /p\.id !== \(me && me\.id\)/.test(CODE));
/* daysAgo returns 0 for care starting today, so (daysAgo || 999) <= 30
   dropped the newest client. Still live in V1; not repeated here. */
ok('the first-30 count uses the null-checked helper, not the falsy one',
   /return inFirstDays\(c, 30\); \}\)\.length,/.test(CODE) &&
   !/\(daysAgo\(c\.startDate\) \|\| 999\) <= 30/.test(CODE));
/* V1's card reads `trackable.length ? ... : 100`, so a CSM with no client
   on a visit cadence showed 100% visit compliance: a number that says
   everything is fine where the truth is that nothing was measured. */
ok('a caseload with no trackable clients shows a dash, not 100%',
   /const comp = trackable\.length\n?\s*\? Math\.round\(\(trackable\.length - over\.length\) \/ trackable\.length \* 100\) : null;/.test(CODE) &&
   /r\.comp === null/.test(CODE));
const compOf = (trackable, over) => trackable ? Math.round((trackable - over) / trackable * 100) : null;
ok('...nothing measured is a dash', compOf(0, 0) === null);
ok('...all on track is 100%', compOf(20, 0) === 100);
ok('...and half overdue is 50%', compOf(20, 10) === 50);
ok('the busiest CSM is first', /return b\.over - a\.over \|\| b\.clients - a\.clients;/.test(CODE));
ok('a row opens that CSM', /openCSMDetail\(tr\.dataset\.csm\)/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
