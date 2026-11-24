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
ok('...and V1\'s own pill row comes off',
   /\$\$\('button', tabs\)\.forEach\(function \(b\) \{ b\.hidden = true; \}\);/.test(CODE) &&
   /rowsEl\.hidden = true;/.test(CODE));
/* THE BAR SHE CAN ACTUALLY SEE IS THE LAYER'S OWN. workflows.js builds
   #md-views -- the counted problem tabs ("Needs attention 45", "Assessment
   due 8") and a single Mine toggle -- which is exactly what she asked to be
   replaced. Hiding V1's pill row underneath it changed nothing on screen,
   and the new switch arrived as a THIRD row of controls. */
ok('...and so does the layer\'s own earlier bar',
   /function supersedeMdBar\(host\)/.test(CODE) &&
   /bar\.classList\.add\('rd-md-superseded'\);/.test(CODE) &&
   /#md-views\.rd-md-superseded \.rd-views,[\s\S]{0,80}display: none !important;/.test(CSS));
/* ON EVERY RENDER, NOT ONCE. workflows.js builds that bar on its own pass,
   which on a cold open happens AFTER the page is first shown, so doing this
   at decorate time found nothing and left the tabs up. */
ok('...on every render, because that bar is built after the page is shown',
   /supersedeMdBar\(host\);/.test(CODE) &&
   /if \(!bar \|\| bar\.classList\.contains\('rd-md-superseded'\)\) return;/.test(CODE));
ok('...and workflows.js is still the thing that builds it',
   /bar\.id = 'md-views';/.test(fs.readFileSync(path.join(__dirname, '../v2/workflows.js'), 'utf8')));
/* The search input lives INSIDE that bar: workflows.js MOVED the
   application's own input there rather than recreating one, so hiding the
   bar with it inside would cost the page its search and cost the table the
   field it filters on. */
/* The search is moved BEFORE the host, not into it: renderMdTable rewrites
   host.innerHTML on every pass and would destroy the input it just
   rescued. */
ok('the search is moved out, and to a place the render does not overwrite',
   /host\.parentElement\.insertBefore\(search, host\);/.test(CODE));
/* The pill row has to be found BEFORE the table host is inserted, or the
   host becomes rowsEl's previous sibling and the lookup finds the wrong
   element. */
ok('V1\'s pill row is found before the host is inserted', (() => {
  const i = CODE.indexOf('const tabs = rowsEl.previousElementSibling;');
  const j = CODE.indexOf("host.id = 'rd-md-table';");
  return i > -1 && j > -1 && i < j;
})());
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
/* "NOTHING OUTSTANDING" IS NOT "NOT READ YET". Her reviewer: "the table
   hadn't loaded when I looked, probably because of the Viv refresh." An
   empty state that reads as an answer told a manager their board was clear
   when it had simply not arrived -- the same fault as the contacts cache
   saying "None on file" while it was still warming. */
ok('an empty board says which kind of empty it is',
   /function mdWaiting\(\)/.test(CODE) &&
   /Reading the Maryland board from Viv/.test(CODE) &&
   /Nothing outstanding under this view/.test(CODE));
ok('...reading the application\'s own loading flag',
   /typeof _mdLoading !== 'undefined' && _mdLoading/.test(CODE) &&
   /return !\(_mdData\.rows && _mdData\.rows\.length\);/.test(CODE));
ok('...and the follow-up waits long enough for a Viv refresh',
   /tries > 60/.test(CODE) && /\}, 2000\);/.test(CODE));
ok('...and stops the moment there is a table',
   /if \(host\.querySelector\('table\.rd-md'\)\) \{ clearInterval\(settle\); return; \}/.test(CODE));

/* ── TEAM: one row per CSM ─────────────────────────────────────────────── */
ok('the layer draws a table into the element V1 drew cards in',
   /function renderTeamTable\(\)/.test(CODE) && /\$\('#team-cards'\)/.test(CODE));
ok('...by wrapping V1\'s renderer rather than racing it',
   /function installTeamTable\(\)/.test(CODE) && /window\.renderTeamOverview = wrapped;/.test(CODE));
/* THE FALLBACK IS THE DANGEROUS PART, and this session proved it twice: a
   half-applied edit left the renderer referencing identifiers that did not
   exist, it threw, and V1's cards stood with nothing on screen to say the
   table had failed. It is still the right behaviour -- a manager seeing
   last week's cards beats a manager seeing a blank page -- but it is why
   this page is checked live rather than taken on a green suite. */
ok('...and V1\'s cards stand if the table throws',
   /V1's cards stand if this throws/.test(SRC) && /if \(!all\) return;/.test(CODE));
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

/* ── her extra Team columns, and the strip that contradicted them ─────── */
ok('her four extra columns are there', (() => {
  const t = (CODE.match(/const TEAM_COLS = \[[\s\S]*?\];/) || [''])[0];
  return /'Needs action'/.test(t) && /'Checklist late'/.test(t) && /'Raised in 1:1'/.test(t);
})());
/* "Coverage ready" is deliberately absent: a column of numbers nobody can
   explain is worse on a manager's page than a missing one. */
ok('...and Coverage ready is left out rather than guessed at',
   !/'Coverage ready'/.test(CODE) && /It is a question for her, not a guess/.test(SRC));
/* V1'S FIVE-TILE STRIP COMES OFF. It carried the same numbers computed a
   second way, and its In Onboarding uses (daysAgo || 999) <= 30, which drops
   a client whose care starts today. THAT is "In Onboarding 3 beside 4 in
   first 30 days" -- the Team page, not Caseload Health on Home. */
/* [hidden] LOSES TO AN INLINE DISPLAY. The strip carries style="display:grid"
   written by index.html, and V1 rewrites gridTemplateColumns on it every
   render, so setting .hidden left it on screen with its In Onboarding tile
   intact -- which is what the live check found after I had reported it gone.
   Twice now on this page: assert the override, not the intent. */
ok('V1\'s stat strip is stood down',
   /function hideTeamStrip\(\)/.test(CODE) && /strip\.style\.display = 'none';/.test(CODE));
ok('...on every render, because V1 touches that element each time',
   /hideTeamStrip\(\);\n\s*const all = teamRowsData\(\);/.test(CODE) ||
   /if \(!host\) return;\n\s*hideTeamStrip\(\);/.test(CODE));
ok('...and the strip really does carry an inline display in index.html',
   /id="team-top-stats" style="display:grid/.test(HUB));
ok('...and the totals live in the table footer instead',
   /<tfoot><tr><th scope="row">All ' \+ list\.length/.test(CODE) &&
   /\.rd-tm tfoot th, \.rd-tm tfoot td \{/.test(CSS));
/* The footer sums the column above it, so the two cannot disagree the way
   the strip and the table did. Visit compliance is left blank rather than
   summed: adding percentages would be a number with no meaning. */
ok('...summing the column, and refusing to sum a percentage',
   /if \(c\[0\] === 'comp'\) return '<td class="rd-tm-n"><\/td>';/.test(CODE) &&
   /vals\.reduce\(function \(a, b\) \{ return a \+ b; \}, 0\)/.test(CODE));
ok('...and the strip in index.html is still the thing with the falsy count',
   /allS30=allCl\.filter\(c=>c\.startDate&&\(daysAgo\(c\.startDate\)\|\|999\)<=30\)/.test(HUB));
/* CSPs ARE THEIR OWN SECTION. In one table a CSP read as the worst
   performer on the page: one client, one overdue, nought per cent. */
ok('CSPs are a section of their own',
   /function isCSP\(p\)/.test(CODE) && /Client Solutions Partners/.test(CODE) &&
   /support across the market, not a caseload/.test(CODE));
ok('...and the table shows CSMs by default',
   /let _teamWho = 'csm';/.test(CODE) &&
   /\[\['csm', 'CSMs'\], \['all', 'Everyone'\]\]/.test(CODE));
/* NEEDS ACTION IS A FLOOR AND SAYS SO. needsAction() leans on touchpoint
   history for the SIGNED-IN profile, so it cannot be asked about somebody
   else's caseload. A red Pulse is global and an overdue visit is on the
   client record. */
ok('needs action is read from what is true across profiles',
   /if \(pulseLevel\(c\) === 'red'\) return true;/.test(CODE));
ok('...and the page says it is a floor rather than pretending otherwise',
   /so this is a floor rather than the number on their own Home/.test(CODE));
/* Checklist late uses the same arithmetic s30Checklist uses, so the two
   cannot disagree, and returns null rather than 0 when it cannot be read. */
ok('checklist-late uses the milestone log for that profile',
   /const logged = getCl\('s60', pid\) \|\| \[\];/.test(CODE) &&
   /_todoDay\(c\.startDate, TODO_MS_DAYS\[m\.id\] \|\| 7\)/.test(CODE));
ok('...and says nothing rather than zero when the globals are missing',
   /typeof _todoDay !== 'function'\) return null;/.test(CODE));
ok('...counting only clients inside their first thirty days',
   /if \(!c\.startDate \|\| !inFirstDays\(c, 30\)\) return;/.test(CODE));

/* ── HER CHIPS, AND THEY COUNT WHAT IS ON SCREEN ─────────────────────────
   "Maryland Compliance shows 'Nothing outstanding under this view' directly
   under counts of 5, 9, 17 and 28." The KPI row showed market totals while
   the list showed one CSM's clients, so an empty list sat directly beneath
   four numbers saying otherwise. A count beside a list has to be a count OF
   that list -- her rule from the first review: "if the badge says 9, the
   list under it has 9 clients in it." */
ok('her five groups, in her words',
   /\['late',\s*'Late now'/.test(CODE) && /\['soon',\s*'Due in 14 days'/.test(CODE) &&
   /\['byhand',\s*'Check by hand'/.test(CODE) && /chip\('cleanup', 'Cleanup'/.test(CODE) &&
   /chip\('all', 'All', counts\.all\)/.test(CODE));
ok('...and they are clickable, not decoration',
   /data-mdgroup="/.test(CODE) && /\$\$\('\[data-mdgroup\]', host\)/.test(CODE));
/* THE COUNT IS OF live0 -- the rows this filter leaves -- not of the market. */
ok('the counts follow the filter',
   /counts\[g\[0\]\] = live0\.filter\(function \(r\) \{ return g\[2\]\(r, mdStates\(r\)\); \}\)\.length;/.test(CODE) &&
   /if \(_mdView === 'mine'\) rows = rows\.filter\(mdOwn\);\n\s*const live0/.test(CODE));
ok('...and Cleanup counts the cleanup group, not the live one',
   /counts\.cleanup = old\.length;/.test(CODE));
ok('pressing Cleanup opens the fold rather than filtering to nothing',
   /if \(k === 'cleanup'\) \{/.test(CODE) && /det\.open = true;/.test(CODE));
/* "Check by hand" is the state a dot cannot settle: no form on file, so the
   requirement is neither met nor breached and somebody has to open Viv. */
const ANY = (CODE.match(/function anyState\(st, want\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('there is one place deciding whether any requirement is in a state', !!ANY);
const MD_REGS = [['initial'], ['cadence'], ['annual'], ['reassess'], ['weekly'], ['pmof']];
const anyState = eval('(' + ANY + ')');
ok('a client with one unmet requirement is Late now',
   anyState({ initial: true, cadence: false, annual: true, reassess: true, weekly: true, pmof: true }, false));
ok('a client with nothing on file is Check by hand, not Late',
   anyState({ initial: null, cadence: true, annual: true, reassess: true, weekly: true, pmof: true }, null) &&
   !anyState({ initial: null, cadence: true, annual: true, reassess: true, weekly: true, pmof: true }, false));
ok('a client with every requirement met is neither',
   !anyState({ initial: true, cadence: true, annual: true, reassess: true, weekly: true, pmof: true }, false) &&
   !anyState({ initial: true, cadence: true, annual: true, reassess: true, weekly: true, pmof: true }, null));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
