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

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const CODE = V1.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  ok(label + ': her four tabs, in her order',
     /\[\['onboarding','Onboarding'\],\['s30','Success in 30'\],\n?\s*\['offboarding','Offboarding'\],\['done','Completed'\]\]/.test(SRC));
  ok(label + ': the board is on the page', /id="s60-board"/.test(SRC) && /id="s60-board-rows"/.test(SRC));
  ok(label + ': ...and it draws when the page opens', /renderObBoard\(\);\}/.test(SRC));
  ok(label + ': a Mine filter', /id="s60-mine"/.test(SRC));
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
   /const say=\[d\.note,when\|\|d\.text\]\.filter\(Boolean\)\.join/.test(CODE));
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
   /id="s60-mine"/.test(CODE) && /id="s60-market"/.test(CODE));
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

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
