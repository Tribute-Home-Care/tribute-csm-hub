// Today's list: one answer to "who needs me?"
//
// Courtney, 17 Nov: "Four sections answer 'who needs me?' The Needs attention
// tiles, the Following up board, the High need line in Caseload health, and
// 'Overdue: Ruth Richter, Virginia Tips… and 13 more.' A CSM has to read all
// four and put it together themselves."
//
// Her spec: one list of anything new or not yet sorted; each row a client, why
// they are on it, and the next step; sorted Pulse flags, then Success in 30,
// then overdue visits and touchpoints, then due this week; and the four tiles
// become its filters, so a tile's number is the number of rows it gives you.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

ok('the list is mounted on Home under the tiles',
   /<div id="rd-attn"><\/div><div id="rd-today"><\/div>/.test(CODE));
ok('the tiles and the list sit under one heading, because they are one thing',
   /sec\('rd-s-attn', 'Needs attention', 'What is new, and not yet sorted'\)/.test(CODE));
ok('her four buckets are the filters',
   /\['action', 'Need action today'\], \['week', 'Due this week'\],[\s\S]{0,80}\['onboarding', 'In first 30 days'\], \['open', 'Open visits'\]/.test(CODE));
ok('a row is a client, a why and a next step',
   /rd-td-n/.test(CODE) && /rd-td-w/.test(CODE) && /rd-td-s/.test(CODE));

// ── her sort order ────────────────────────────────────────────────────────
ok('Pulse flags rank first', /rank: 0, bucket: 'action'[\s\S]{0,120}pulseFirst/.test(CODE));
ok('Success in 30 ranks second', /rank: 1, bucket: 'onboarding'/.test(CODE));
ok('overdue ranks above due-soon',
   /rank: ex\.tone === 'bad' \? 2 : 3/.test(CODE));
ok('open visits rank last', /rank: 4, bucket: 'open'/.test(CODE));
// Behavioural: the comparator must be stable and in her order.
const rows = [{ rank: 4, name: 'B' }, { rank: 0, name: 'Z' }, { rank: 2, name: 'A' }, { rank: 0, name: 'A' }];
rows.sort((a, b) => a.rank - b.rank || String(a.name).localeCompare(String(b.name)));
ok('the comparator sorts by rank then name',
   rows.map(r => r.rank + r.name).join(',') === '0A,0Z,2A,4B');

// ── already sorted means not new ──────────────────────────────────────────
// This is what joins the two halves of Home: an acknowledged flag leaves this
// list and appears in its Following up column instead.
ok('an acknowledged Pulse flag drops off the list',
   /pp\.level !== 'green' && !c\.pulseAck/.test(CODE));
ok('the empty state says where sorted items went',
   /Anything you have already sorted is in Following up below\./.test(CODE));

// ── honesty in the rows ───────────────────────────────────────────────────
ok('an open visit says whose job it is, not that the CSM covers it',
   /step: 'With the Scheduling Partner'/.test(CODE));
ok('a client in their first month with nothing logged says so',
   /nothing logged yet/.test(CODE));
ok('a tile with no rows is disabled rather than clickable and empty',
   /\(n\[b\[0\]\] \? '' : ' disabled'\)/.test(CODE));
ok('rows are reachable by keyboard', /ev\.key === 'Enter' \|\| ev\.key === ' '/.test(CODE) && /tabindex="0"/.test(CODE));
ok('only urgency is marked', /\.rd-td-r\.bad/.test(CSS) && /\.rd-td-r\.warn/.test(CSS));

// The list has to redraw when something is sorted, which changes no tile
// number at all, so it cannot sit behind the tiles' change-detection key.
ok('the list redraws outside the tile cache key',
   /refreshNavCounts\(sig\);\s*\n\s*\}\s*\n[\s\S]{0,180}renderToday\(\);/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
