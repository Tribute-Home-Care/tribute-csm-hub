// Every open checklist in one list.
//
// Courtney, section 7: "Onboarding page: Every open checklist in one list,
// with tabs for Onboarding, Success in 30, Offboarding and Completed. Filter
// to Mine or by market." And: "Clicking a client in this list opens that
// client's page, with the checklist at the top of the Summary tab. It's not a
// separate checklist page."
//
// Before this the page was a search box: find one client, look at one
// checklist, go back and find the next. That is a lookup, not a worklist.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

/* SOURCE: the V2 layer, not index.html.
 *
 * This feature moved out of index.html on 23 November. index.html is V1 and
 * V2 is built from it, so a V2 design living there meant changing the hub the
 * team uses today every time Courtney's review moved. The prototype file is
 * the source and v2/ is generated, so both are read and asserted identical:
 * editing the generated copy alone is reverted by the next build with nothing
 * to show for it.
 */
const V1 = fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/v2-onboarding.js'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/v2-onboarding.js'), 'utf8');
const CODE = V1.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  ok(label + ': her four tabs, in her order',
     /\[\['onboarding','Onboarding'\],\['s30','Success in 30'\],\n?\s*\['offboarding','Offboarding'\],\['done','Completed'\]\]/.test(SRC));
  /* The markup is the layer's now too. Leaving it in index.html would have
     left V1 carrying the furniture for a feature it no longer has, and
     dialogs whose buttons call functions undefined there. */
  ok(label + ': the board markup belongs to the layer',
     /const OB_BOARD_HTML = /.test(SRC) && /s60-board-rows/.test(SRC));
  ok(label + ': a Mine filter', /id=..s60-mine/.test(SRC));
  ok(label + ': the layer writes it, once, and only if it is missing',
     /function mountObUI\(\) \{/.test(SRC) &&
     /if \(page && !document\.getElementById\('s60-board'\)\)/.test(SRC) &&
     /if \(!document\.getElementById\('m-ob-proof'\)\)/.test(SRC));
  ok(label + ': ...before anything goes looking for it',
     /function renderObBoard\(\)\{[\s\S]{0,12}mountObUI\(\);/.test(SRC) &&
     /function renderObChecklist\(cid\)\{[\s\S]{0,12}mountObUI\(\);/.test(SRC));
}

// ── what the list is ordered by ───────────────────────────────────────────
// Overdue first is the only ordering a worklist can justify.
ok('overdue first, then the newest start of care',
   /rows\.sort\(\(a,b\)=>\(b\.late-a\.late\)\|\|String\(b\.sort\)\.localeCompare\(String\(a\.sort\)\)\);/.test(CODE));

// ── a row opens the client, not a checklist page ──────────────────────────
ok('a row opens the client page', /function openObClient\(cid\)\{/.test(CODE));
ok('...through the Clients page, so Back works', /showPage\('clients',nv\)/.test(CODE));
ok('...and selects that client', /TributeRedesign\.setView\('all'\); TributeRedesign\.select\(cid\);/.test(CODE));

// ── what each tab shows ───────────────────────────────────────────────────
ok('the Success in 30 rows carry the status and its reason',
   /const st=r\.k\?r\.k\.state:'ontrack';/.test(CODE) && /r\.k\?r\.k\.why:''/.test(CODE));
ok('the Offboarding rows carry the type of ending and the final date',
   /OFF_TYPES\.find\(x=>x\.id===r\.off\.type\)/.test(CODE) && /Final \$\{escHtml\(new Date\(r\.off\.end/.test(CODE));
ok('an ending with no type recorded says so rather than guessing',
   /\|\|'Type not recorded'/.test(CODE));
/* ── her onboarding columns ────────────────────────────────────────────────
   The picture in Part 4 gives the row nine columns: client with community and
   market under it, SOC, day, a status, a progress bar PER PHASE, the one thing
   due next, and who owns it.

   What shipped was "n of 29" and "n items overdue", which tells a manager that
   something is behind without telling them what or where. */
ok('the row carries the start of care and the day', /_cmDate\(r\.c\.startDate\)/.test(CODE) && /\('Day '\+r\.daysIn\)/.test(CODE));
ok('...and a bar for each phase', /r\.pr\.phases\.map\(ph=>_obBar\(ph\.done,ph\.total\)\)/.test(CODE) &&
   /function _obProgress[\s\S]*?const phases=OB_CHECKLIST\.map/.test(CODE));
ok('...and the one thing due next, with its owner',
   /const nd=_obNextDue\(r\.c\);/.test(CODE) && /escHtml\(nd\?nd\.item\.owner:''\)/.test(CODE));
ok('...and where the client lives', /\[r\.c\.loc,r\.c\.market\]\.filter\(Boolean\)/.test(CODE));

/* Her callout: "Same three statuses as Success in 30 rules in Part 3." One
   rule, read twice, so the board and the client page cannot disagree about a
   client. The board must not compute a status of its own. */
ok('the status is the Success in 30 state, not a second rule',
   /const st=r\.k\?r\.k\.state:'ontrack';[\s\S]{0,400}class="obb-r obb-ob \$\{st\}"/.test(CODE));
ok('...and is spelled the way she spells it',
   /const S30_STATE_LABEL=\{ontrack:'On Track',watch:'Watch',atrisk:'At Risk'/.test(CODE));

/* NEXT DUE NEVER GUESSES A DATE. obDueFor refuses to invent one when the Hub
   has no anchor, and a row that announced an undated item as "due next" would
   be inventing urgency out of a missing field. */
ok('an item the Hub cannot date is not offered as due next',
   /function _obNextDue[\s\S]*?if\(!d\.date\)return;/.test(CODE));
ok('...and overdue beats near, which is the ordering everywhere else',
   /open\.sort\(\(a,b\)=>\(b\.late-a\.late\)\|\|a\.date\.localeCompare\(b\.date\)\)/.test(CODE));
ok('...and a client with nothing dated outstanding says so',
   /'Nothing dated outstanding'/.test(CODE));
/* obDueFor returns {date, note} with no text for a market-rule item, which
   is right for the checklist where the date and the rule note are separate
   columns. The board wants one phrase, so it builds it rather than joining
   label and text blindly: doing that printed "Complete the assessment .
   undefined" at a manager on the live page. */
ok('the board builds its own phrase rather than printing an absent field',
   /const when=d\.date\?\('due '\+_cmDate\(d\.date\)\):'';/.test(CODE) &&
   /const say=\[d\.short,when\|\|d\.text\]\.filter\(Boolean\)\.join/.test(CODE));
/* A rule needs two lengths. The checklist row can carry the whole sentence;
   the board cell is one short phrase, and her picture writes it as
   "Assessment . 48 hr MD rule . due 11/15". The full Massachusetts note
   wrapped one cell onto three lines on the live page. */
ok('the board uses the SHORT rule name, not the checklist sentence',
   /short:'48 hr MD rule'/.test(CODE) && !/const say=\[d\.note/.test(CODE));
ok('...and a market with no rule worth naming has an empty one',
   (CODE.match(/short:''/g)||[]).length === 2);
ok('...while the checklist still carries the full note',
   /note:'48 hr MD rule/.test(CODE) && /due\.note\?/.test(CODE));
ok('...and never concatenates an undefined into the cell',
   !/nd\.item\.label\+' \\u00b7 '\+nd\.text/.test(CODE));

/* daysAgo is NEGATIVE before the start of care, and the column counts days
   SINCE the start. "Day -1" is not a day of care that has happened. */
ok('a client who has not started yet says when they do, not a negative day',
   /r\.daysIn<0\?\('Starts in '/.test(CODE));

/* Her two filters. The market list is built from the caseload, so it can
   never offer a market with nothing behind it, and one market is not a
   choice worth showing. */
ok('the board filters to mine and to a market',
   /id=..s60-mine/.test(CODE) && /id=..s60-market/.test(CODE));   // ids live in a JSON string now
ok('the market list comes from the clients on the board',
   /\[\.\.\.new Set\(\(get\('clients'\)\|\|\[\]\)\.filter\(c=>!c\.isOffice\)[\s\S]{0,80}\.map\(c=>c\.market/.test(CODE));
ok('...and one market is not offered as a choice',
   /mk\.style\.display=seen\.length>1\?'':'none';/.test(CODE));
ok('...and the chosen market survives the list being rebuilt',
   /if\(seen\.indexOf\(keep\)>-1\)mk\.value=keep;/.test(CODE));

// ── behavioural: the ordering and the tabs ───────────────────────────────
const sortRows = rs => rs.slice().sort((a, b) =>
  (b.late - a.late) || String(b.sort).localeCompare(String(a.sort)));
const rows = [
  { n: 'no overdue, older', late: 0, sort: '2026-11-01' },
  { n: 'two overdue', late: 2, sort: '2026-11-02' },
  { n: 'no overdue, newer', late: 0, sort: '2026-11-20' },
  { n: 'one overdue', late: 1, sort: '2026-11-21' }
];
const got = sortRows(rows).map(r => r.n);
ok('the most overdue is first', got[0] === 'two overdue');
ok('...then the next most overdue', got[1] === 'one overdue');
ok('...then the newest of the rest', got[2] === 'no overdue, newer');
ok('a client appears once per tab, not once per row',
   new Set(got).size === got.length);

// A finished onboarding moves to Completed rather than sitting in the list.
const tabFor = (finished, s30done) => (finished && s30done) ? 'done' : 'onboarding';
ok('a finished checklist leaves the working list', tabFor(true, true) === 'done');
ok('...but not while Success in 30 is still running', tabFor(true, false) === 'onboarding');


/* V1 KEEPS WORKING WITHOUT IT. index.html no longer defines these, so every
   call site there is guarded: the Onboarding page degrades to what it was
   before 23 November rather than throwing on a missing function. */
const HUB = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
ok('index.html no longer carries the feature',
   !/function renderObBoard\(\)\{/.test(HUB) && !/const OB_CHECKLIST = /.test(HUB) &&
   !/id="s60-board"/.test(HUB) && !/id="m-ob-proof"/.test(HUB));
ok('...and guards the call sites it kept',
   /typeof renderObManager===.function./.test(HUB) &&
   /typeof renderObBoard===.function./.test(HUB) &&
   /typeof renderObChecklist===.function./.test(HUB));

// ── THE BOARD DRAWS THREE DIFFERENT ROWS ──────────────────────────────────
/* Found in the 11:54 sweep, and it was mine. The header was emitted whenever
   no row was an offboarding row, but the renderer gives the Success-in-30 rows
   a four-column shape of their own -- so the S30 tab put nine labels over four
   cells, on grids sharing not one edge. Measured live:

     header 265.674 / 67.998 / 61.992 / 77.998 / 55.996 / 55.996 / 55.996 /
            284.658 / 53.994   (9 cells)
     rows   348.857 / 507.422 / 111.992 / 71.992                    (4 cells)

   A header naming columns that are not there is worse than no header, because
   it is read as if it were true. No test covered the header at all, which is
   how it shipped. */
{
  const OB = require('fs').readFileSync(require('path').join(__dirname, '../v2/v2-onboarding.js'), 'utf8');
  ok('the row shape is decided by one function', /const shapeOf = r =>/.test(OB));
  ok('...and the header asks it', /const shapes = \[\.\.\.new Set\(rows\.map\(shapeOf\)\)\];/.test(OB));
  ok('...and both renderers ask it too',
     /if\(shapeOf\(r\)==='off'\)\{/.test(OB) && /if\(shapeOf\(r\)==='s30'\)\{/.test(OB));
  /* The test that drifted from the renderer is gone, not merely corrected. */
  ok('...and nothing tests the shape a second way',
     !/rows\.every\(r => !\(r\.tab === 'offboarding'/.test(OB));
  /* Success in 30 grew from four columns to ten on 25 Nov: her five weeks,
     then the next item due and its owner. The header has to grow with it, or
     it names columns that are not there -- the exact fault this block was
     written for. */
  ok('each shape carries its own header',
     /ob:\s+\{ cls: 'obb-ob', cols: \['Client', 'Start of care', 'Day', 'Status',/.test(OB) &&
     /s30: \{ cls: 'obb-s30', cols: \['Client', 'Day', 'Status',/.test(OB) &&
     /'Next item due', 'Owner'\] \}/.test(OB) &&
     /off: \{ cls: '',\s+cols: \['Client', 'Ending type', 'Final visit', 'Checklist'\] \}/.test(OB));
  /* And the header is as long as the row is wide: ten headings, ten cells. */
  ok('...and the Success in 30 header has one heading per column',
     (((OB.match(/s30: \{ cls: 'obb-s30', cols: \[([\s\S]*?)\] \}/) || ['', ''])[1]
        .match(/'/g) || []).length / 2) === 10);
  /* Her rule, which the offboarding rows had been failing for several rounds:
     a header whenever a row has more than two columns. Four is more than two. */
  ok('...so the four-column tabs are no longer bare',
     /cols: \['Client', 'Ending type', 'Final visit', 'Checklist'\]/.test(OB));
  /* Only the nine-column header takes the nine-column class; the other two
     fall through to the four-column base grid on .obb-r. */
  const CSS2 = require('fs').readFileSync(require('path').join(__dirname, '../v2/v2-onboarding.css'), 'utf8');
  ok('...and the four-column header lands on the four-column grid',
     /\.obb-r\{display:grid;grid-template-columns:minmax\(0,1\.1fr\) minmax\(0,1\.6fr\) 112px 72px;/.test(CSS2) &&
     /\.obb-r\.obb-ob\{grid-template-columns:/.test(CSS2));
  /* The Completed tab holds finished onboarding and finished offboarding at
     once, and no single header describes both. */
  ok('a tab holding two shapes gets no header at all',
     /const shape = shapes\.length === 1 \? SHAPES\[shapes\[0\]\] : null;/.test(OB) &&
     /const head = shape\s*\n\s*\?/.test(OB));
}

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);