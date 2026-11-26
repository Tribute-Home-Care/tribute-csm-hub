/* THE NUMBERS OPEN THE LIST BEHIND THEM.
 *
 * Courtney, 17 Nov, Team: the numbers "open a detail card for that CSM, not
 * the filtered list". A count on a manager's page is only useful if you can
 * see who is in it.
 *
 *   node test/team-open-the-list.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const SRC = fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CSS = fs.readFileSync(path.join(PROTO, 'redesign.css'), 'utf8');

/* ── 1. the row holds the list, not just the length ──────────────────── */
/* Recomputing it on click would be a second definition of the same number,
   which is the fault this page was rebuilt to fix. One pass, both outputs. */
['_clients', '_high', '_over', '_s30', '_one21', '_action', '_late'].forEach(k => {
  ok('the row carries ' + k, new RegExp('\\' + k + ':').test(CODE));
});
ok('the count and the list come from the same filter',
   /const fHigh = cl\.filter/.test(CODE) && /high: fHigh\.length, _high: fHigh,/.test(CODE) &&
   /const fS30 = cl\.filter/.test(CODE) && /s30: fS30\.length,/.test(CODE) &&
   /action: fAction\.length, _action: fAction,/.test(CODE) &&
   /one21: fOne21\.length, _one21: fOne21,/.test(CODE));
/* Scoped to teamRowsData: needsAction() has the same line and is a
   different question, asked of the signed-in caseload. */
const TEAM = (CODE.match(/function teamRowsData\(\) \{[\s\S]*?\n  \}\n/) || [''])[0];
ok('...and the filter is not written twice inside the team rows',
   !!TEAM && (TEAM.match(/if \(pulseLevel\(c\) === 'red'\) return true;/g) || []).length === 1);
/* lateClients and lateFor use the same arithmetic so they cannot disagree. */
ok('the late list uses the same arithmetic as the late count',
   /const lateClients = function \(pid, cl\)/.test(CODE) &&
   /_late: lateClients\(p\.id, cl\)/.test(CODE) &&
   /late: lateFor\(p\.id, cl\)/.test(CODE));

/* ── 2. the cell becomes a button, where there is something to open ──── */
ok('a count with a list behind it is pressable',
   /<button type="button" class="rd-tm-open" data-tmcell="/.test(CODE));
ok('...a zero is not', /if \(!list \|\| !list\.length\) \{/.test(CODE));
/* The touch columns count ROWS, not clients, so there is no list of people
   behind them and they stay plain numbers. */
ok('...and so are the touch columns, which count rows rather than clients',
   !/_logged:/.test(CODE) && !/_autoc:/.test(CODE));
ok('it still reads as a number first', /\.rd-tm-open \{ background: none; border: 0;/.test(CSS));

/* ── 3. the panel ────────────────────────────────────────────────────── */
ok('the list opens under the table, not over it',
   /tbl\.insertAdjacentHTML\('afterend', panelFor/.test(CODE));
ok('...naming the CSM and what was counted',
   /plural\(list\.length, 'client'\) \+ ' ' \+ esc\(TM_LABEL\[k\] \|\| k\)/.test(CODE));
ok('...with a label for every column that opens',
   ['clients','high','over','late','s30','one21','action']
     .every(k => new RegExp('(^|[{,\\s])' + k + ':').test((CODE.match(/const TM_LABEL = \{[\s\S]*?\};/)||[''])[0])));
ok('...each client named, with their tier and why they are in it',
   /rd-tm-pn/.test(CODE) && /rd-tier/.test(CODE) && /const ex = exceptionFor\(c\);/.test(CODE));
ok('a second press on the same count closes it', /if \(same\) return;/.test(CODE));
ok('...and there is a Close', /data-tmclose/.test(CODE));
ok('only one panel is ever open', /const old = \$\('#rd-tm-panel', host\);/.test(CODE) &&
   /if \(old\) old\.remove\(\);/.test(CODE));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
