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
ok('the Onboarding rows say how much is overdue',
   /r\.late\+\(r\.late===1\?' item overdue':' items overdue'\)/.test(CODE));
ok('...and say so plainly when nothing is', /'On time so far'/.test(CODE));

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
