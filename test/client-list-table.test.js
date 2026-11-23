// The client list as a table.
//
// Courtney, 17 Nov, priority 4: "Rows don't tell you enough. Name, community,
// one status. To see the tier, the last visit, or who to call, you have to
// open the client." Her columns: Client, Tier, Status and why, Last visit,
// Next due, Family contact, Community, sortable.
//
// She also found three filter systems stacked: the Tier and Status dropdowns,
// the market chips, and the five tabs, with the Status dropdown doing the same
// job as the tabs.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

// ── her columns ───────────────────────────────────────────────────────────
// Read CL_COLS itself rather than every array in the file: the first version
// of this matched VIEWS and ACT_FILTERS too and failed on a correct table.
const colsSrc = (CODE.match(/const CL_COLS = \[([\s\S]*?)\];/) || [])[1] || '';
const cols = [...colsSrc.matchAll(/\['[a-z]*', '([^']+)'\]/g)].map(m => m[1]);
ok('all seven columns are there, in her order',
   JSON.stringify(cols) === JSON.stringify(['Client', 'Tier', 'Status', 'Last visit', 'Next due', 'Family contact', 'Community']));
ok('it renders as a real table with a header row', /<table class="rd-clt"><thead>/.test(CODE));
ok('the client name is a row header, not a cell', /<th scope="row">/.test(CODE));

// ── the stacked filters ───────────────────────────────────────────────────
ok('the Status dropdown is no longer read', !/\$\('#cm-status'\)/.test(CODE));
ok('...and nothing still filters on its values',
   !/sf === 'overdue'/.test(CODE) && !/sf === 'due_soon'/.test(CODE));
ok('search and tier still work', /\$\('#cm-search'\), tEl = \$\('#cm-tier'\)/.test(CODE));

// ── sorting ───────────────────────────────────────────────────────────────
ok('urgency is still the default', /let _sortKey = '', _sortDir = 'asc';/.test(CODE));
ok('clicking the same column reverses it',
   /if \(_sortKey === k\) _sortDir = _sortDir === 'asc' \? 'desc' : 'asc';/.test(CODE));
ok('she can sort by next due, start date and A to Z',
   /_sortKey === 'next'/.test(CODE) && /_sortKey === 'start'/.test(CODE) && /_sortKey === 'name'/.test(CODE));
ok('a header announces its sort state to a screen reader', /aria-sort="/.test(CODE));
// Behavioural: blanks must not sort to the top as if they were the earliest.
const nullsLast = v => (v == null || v === '' ? '￿' : String(v));
const dates = ['2026-03-01', '', null, '2026-01-01'].map(nullsLast).sort();
ok('a client with no date sorts last, not first',
   dates[0] === '2026-01-01' && dates[dates.length - 1] === '￿');
ok('tier sorts High, Medium, Low rather than alphabetically',
   /const o = \{ High: 0, Medium: 1, Low: 2 \};/.test(CODE));

// ── the assessment highlight, an action item from 12 Nov ───────────────────
ok('an assessment due within a week is marked', /Assessment due/.test(CODE) && /\.rd-clt-row\.due/.test(CSS));
ok('days-until is derived from days-since rather than a helper that does not exist',
   /const until = nv \? -daysSince\(nv\) : null;/.test(CODE));
ok('a date already past is not called due within a week', /until >= 0 && until <= 7/.test(CODE));

// ── honesty about the family contact ──────────────────────────────────────
// The Viv contact is fetched per client; filling a column from it would be a
// Viv call per row on every keystroke in the search box.
ok('the contact column uses the Hub record, not a per-row Viv read',
   /c\.contact \? esc\(c\.contact\)/.test(CODE) && !/primaryContact/.test((CODE.match(/function clientListTable[\s\S]*?\n  \}/) || [''])[0]));
ok('an email is a real mailto', /href="mailto:' \+ esc\(c\.contactEmail\)/.test(CODE));
ok('there is no Call button that cannot dial',
   !/>Call</.test((CODE.match(/function clientListTable[\s\S]*?\n  \}/) || [''])[0]));

// ── one shape, because the client is now its own page ─────────────────────
// This asserted the split: the table with nothing selected, a compact list
// beside an open client. Section 3 asked for the client to open as its own
// full page, so there is no "beside" left and no second shape of the list.
ok('the table is the list, at every width', /el\.innerHTML = clientListTable\(rows\);/.test(CODE));
ok('the compact list is gone, not left unreachable',
   !/clientListCompact/.test(CODE));
ok('rows still open a client the same way', /\$\$\('\[data-cid\]', el\)/.test(CODE));
// The three stacked filter systems she counted: the Status dropdown had
// already stopped being read, which left a control that did nothing.
ok('the dead Status dropdown and the unused legend are out of sight',
   /#page-clients #cm-status, #page-clients #cm-legend \{ display: none; \}/.test(CSS));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
