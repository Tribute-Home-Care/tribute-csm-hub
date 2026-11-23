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
/* Three of the four names are hers. The second is not: she wrote "Due this
   week", and the data behind that bucket is the warn-tone exception, which is
   due within FOURTEEN days and is what the Clients page has always called Due
   soon. Her label would have been a week out from the thing it names. The
   deviation is deliberate and recorded in the source beside the list. */
ok('her four buckets are the filters',
   /\['action', 'Need action today'\], \['week', 'Due soon'\],[\s\S]{0,80}\['onboarding', 'In first 30 days'\], \['open', 'Open visits'\]/.test(CODE));
// The tile and the filter line under it took their label from different
// places, so the same six clients read "Due soon" above and "due this week"
// below. One source now.
ok('the tile takes its name from the bucket, like the filter line does',
   /'<span class="rd-attn-l">' \+ esc\(b\[1\]\) \+ '<\/span>'/.test(CODE) &&
   /TODAY_BUCKETS\.filter\(function \(b\) \{ return b\[0\] === _todayFilter; \}\)/.test(CODE));
ok('a row is a client, a why and a next step',
   /rd-td-n/.test(CODE) && /rd-td-w/.test(CODE) && /rd-td-s/.test(CODE));

// ── her sort order ────────────────────────────────────────────────────────
ok('Pulse flags rank first', /rank: 0, bucket: 'action'[\s\S]{0,120}pulseFirst/.test(CODE));
ok('Success in 30 ranks second', /rank: 1, bucket: 'onboarding'/.test(CODE));
ok('overdue ranks above due-soon',
   /rank: ex\.tone === 'bad' \? 2 : 3/.test(CODE));
ok('open visits rank last', /rank: 4, bucket: 'open'/.test(CODE));
/* ── ONE ROW PER CLIENT ───────────────────────────────────────────────────
   "Each row is a client, why they're on the list, and the next step."
   Singular, three times. It is also the only way the counts can agree: a
   client with a Pulse flag AND an overdue visit was two rows, so Home counted
   38 things while the Clients tab counted 29 people, both labelled as needing
   action. Counting rows and counting clients are different questions, and a
   tile that filters a list has to answer the list's question. */
ok('a client appears once, however many reasons they have',
   /const seen = \{\}, one = \[\];/.test(CODE) &&
   /const k = r\.cid \|\| \('name:' \+ r\.name\);/.test(CODE));
ok('...keeping the most urgent reason, because the sort already ranked them',
   /out\.sort\(function \(a, b\) \{ return a\.rank - b\.rank[\s\S]{0,900}const seen = \{\}, one = \[\];/.test(CODE));
ok('an open visit with no matching client is not folded into another',
   /\('name:' \+ r\.name\)/.test(CODE));
// Behavioural: the collapse, over a client who qualifies three ways.
const rowsIn = [
  { rank: 0, cid: 'a', name: 'A', bucket: 'action' },
  { rank: 1, cid: 'a', name: 'A', bucket: 'onboarding' },
  { rank: 2, cid: 'a', name: 'A', bucket: 'action' },
  { rank: 1, cid: 'b', name: 'B', bucket: 'onboarding' },
  { rank: 4, cid: '',  name: 'Unmatched One', bucket: 'open' },
  { rank: 4, cid: '',  name: 'Unmatched Two', bucket: 'open' }
];
const collapse = rs => { const seen = {}, out = []; rs.forEach(r => {
  const k = r.cid || ('name:' + r.name); if (seen[k]) return; seen[k] = 1; out.push(r); }); return out; };
const kept = collapse(rowsIn);
ok('three reasons for one client become one row', kept.filter(r => r.cid === 'a').length === 1);
ok('...and it is the most urgent one', kept.find(r => r.cid === 'a').rank === 0);
ok('...in the bucket that reason belongs to', kept.find(r => r.cid === 'a').bucket === 'action');
ok('two unmatched open visits stay two rows', kept.filter(r => !r.cid).length === 2);
ok('the list is four rows, not six', kept.length === 4);

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
   /\(n \? '' : ' disabled'\)/.test(CODE));

/* ── THE TILES ARE THE FILTERS, AND THERE IS ONLY ONE ROW OF THEM ─────────
   "Keep 4 tiles across the top, but make them filters for the list below."
   They were not: the tiles navigated to other pages and a second row of
   chips underneath did the filtering, so Home carried two rows of the same
   four numbers and pressing the obvious one took you off the page. */
ok('pressing a tile filters the list rather than leaving the page',
   /data-td="' \+ k \+ '"/.test(CODE) &&
   /\$\$\('\.rd-attn-card\[data-td\]', el\)\.forEach/.test(CODE));
ok('the second row of chips is gone', !/rd-td-fb/.test(CODE));
ok('...and there is still a way back to everything',
   /class="rd-td-all" data-td=""/.test(CODE));
ok('pressing the tile you are on clears the filter',
   /_todayFilter = \(_todayFilter === k\) \? '' : k;/.test(CODE));
ok('both halves repaint together, so the pressed tile is not left stale',
   /function setTodayFilter\(k\) \{[\s\S]{0,160}_attnKey = '';[\s\S]{0,40}renderAttention\(\);/.test(CODE));
ok('...and the filter is part of the repaint key',
   /failedSources\(\)\.join\(','\) \+ '#' \+ _todayFilter/.test(CODE));
ok('a pressed tile looks pressed', /\.rd-attn-card\.on \{/.test(CSS));
ok('the tile number IS the row count, not a second count of its own',
   /todayRows\(\)\.forEach\(function \(r\) \{ if \(tn\[r\.bucket\] !== undefined\) tn\[r\.bucket\]\+\+; \}\);/.test(CODE));
ok('a signal that is not one of her buckets keeps its own line and its page',
   /const rest = sig\.filter\(function \(x\) \{ return !x\.bucket; \}\);/.test(CODE) &&
   /\$\$\('\.rd-attn-link', el\)\.forEach/.test(CODE));

/* ── OPEN VISITS ON HOME ARE THE URGENT ONES ──────────────────────────────
   Section 9: "Open visits on a CSM's clients show on the client's Schedule
   tab, and on Today's list when they're within 48 hours." Home was listing
   all 53 unfilled visits across 14 clients, beside items that genuinely
   needed the CSM that morning. */
ok('only the next 48 hours reach the list',
   /const cutoff = Date\.now\(\) \+ 48 \* 3600 \* 1000;/.test(CODE) &&
   /if \(!d \|\| d\.getTime\(\) > cutoff\) return;/.test(CODE));
ok('the row says the window it is talking about',
   /' unfilled in the next 48 hours'/.test(CODE));
ok('the full total is kept on the tile rather than dropped',
   /plural\(ovs\.total, 'visit'\) \+ ' unfilled in all'/.test(CODE));
ok('one definition of an urgent open visit, read by both the tile and the list',
   (CODE.match(/openVisitsSoon\(\)/g) || []).length === 4);
/* The zero case is the one that can lie. On this caseload today it is 0
   within 48 hours and 53 unfilled across the month, because Scheduling fills
   the near days first; "Nothing right now" would be an all-clear nobody
   earned. Every other bucket at zero really is nothing. */
ok('an empty Open visits tile still says what is unfilled later',
   /if \(k === 'open'\) \{[\s\S]{0,200}' unfilled, none in the next 48 hours'/.test(CODE));
ok('...and the other buckets say nothing, because nothing is true of them',
   /return 'Nothing right now';/.test(CODE));
ok('rows are reachable by keyboard', /ev\.key === 'Enter' \|\| ev\.key === ' '/.test(CODE) && /tabindex="0"/.test(CODE));
ok('only urgency is marked', /\.rd-td-r\.bad/.test(CSS) && /\.rd-td-r\.warn/.test(CSS));

// The list has to redraw when something is sorted, which changes no tile
// number at all, so it cannot sit behind the tiles' change-detection key.
ok('the list redraws outside the tile cache key',
   /refreshNavCounts\(sig\);\s*\n\s*\}\s*\n[\s\S]{0,180}renderToday\(\);/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
