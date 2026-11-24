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
   /'<div id="rd-attn"><\/div>' \+/.test(CODE) && /<div class="rd-hl"><div id="rd-today"><\/div>/.test(CODE));
/* The tiles stay full width ABOVE both columns, because they filter the left
   one. A tile inside the left column would read as part of the list. */
ok('...with the tiles spanning both columns, since they filter the left one',
   CODE.indexOf('id="rd-attn"') < CODE.indexOf('id="rd-home-cols"'));
/* NO HEADING OVER THE TILES. Her Home has none: the tiles sit under the date
   and the card below them carries its own title. Ours added a third heading
   competing with the card title and the rail titles for the same job, and it
   read as a label for the tiles rather than for the list. */
ok('the tiles and the list share a section with no heading of its own',
   /sec\('rd-s-attn', '', ''\)/.test(CODE) &&
   /sAttn\.classList\.add\('rd-sec-bare'\)/.test(CODE) &&
   /\.rd-sec-bare > \.rd-sec-h \{ display: none; \}/.test(CSS));
/* Three of the four names are hers. The second is not: she wrote "Due this
   week", and the data behind that bucket is the warn-tone exception, which is
   due within FOURTEEN days and is what the Clients page has always called Due
   soon. Her label would have been a week out from the thing it names. The
   deviation is deliberate and recorded in the source beside the list. */
ok('her four buckets, worded as her Home picture words them',
   /\['action', 'Need action today'\], \['week', 'Due this week'\],[\s\S]{0,80}\['onboarding', 'In first 30 days'\], \['open', 'Open visits'\]/.test(CODE));
// The tile and the filter line under it took their label from different
// places, so the same six clients read "Due soon" above and "due this week"
// below. One source now.
ok('the tile takes its name from the bucket, like the filter line does',
   /'<span class="rd-attn-l">' \+ esc\(b\[1\]\) \+ '<\/span>'/.test(CODE) &&
   /TODAY_BUCKETS\.filter\(function \(b\) \{ return b\[0\] === _todayFilter; \}\)/.test(CODE));
ok('a row is a client, a why and a next step',
   /rd-td-n/.test(CODE) && /rd-td-w/.test(CODE) && /rd-td-s/.test(CODE));

// ── her sort order ────────────────────────────────────────────────────────
// A red flag ranks first; an amber one ranks with the rest of this week, so
// the Today's list and the Clients tabs cannot disagree about one client.
ok('a red Pulse flag ranks first',
   /rank: lvl === 'red' \? 0 : 3,/.test(CODE) &&
   /bucket: lvl === 'red' \? 'action' : 'watch',/.test(CODE));
/* An amber flag is a watch item, not a date. There is no Watch tile here, by
   her design: Home has her four. The row still appears in the unfiltered
   list, and Watch is a chip on the Clients page. Leaving it in the week
   bucket would have made the "Due this week" tile count a client its own tab
   on Clients excluded. */
ok('...and an amber one is a watch item, so no tile claims it',
   !/\['watch',/.test(CODE.match(/const TODAY_BUCKETS = \[[\s\S]*?\];/)[0]));
ok('...and the headline is still what the row says', /why: pulseFirst\(pp\.headline\)/.test(CODE));
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
   /const best = \{\}, order = \[\];/.test(CODE) &&
   /const k = r\.cid \|\| \('name:' \+ r\.name\);/.test(CODE));
/* Her sort order puts Success in 30 above an overdue visit, which is right to
   READ the list by and wrong for deciding which bucket a client falls under:
   a new client who is ALSO overdue was landing under In first 30 days, so
   Home said 27 need action today while the Clients tab said 29. The row kept
   is the most urgent one the client has; her rank still places it. */
ok('...the row kept is the most urgent, not merely the highest-sorted',
   /const isAct = function \(x\) \{ return x\.bucket === 'action' \? 0 : 1; \};/.test(CODE) &&
   /if \(isAct\(r\) < isAct\(best\[k\]\)\) \{ const b = best\[k\]\.buckets; best\[k\] = r; r\.buckets = b; \}/.test(CODE));
/* The four tiles filter one list; they are not a partition of it. A client in
   their first thirty days who also needs action today belongs under both.
   Bucketing exclusively made Home read "0 In first 30 days" on a caseload
   with three of them: true of the list, false of the world, and exactly the
   kind of zero a CSM would believe. */
ok('a row carries every filter it matches',
   /r\.buckets = \[r\.bucket\]; order\.push\(k\);/.test(CODE) &&
   /if \(best\[k\]\.buckets\.indexOf\(r\.bucket\) < 0\) best\[k\]\.buckets\.push\(r\.bucket\);/.test(CODE));
ok('...and the filter reads the set', /\(r\.buckets \|\| \[r\.bucket\]\)\.indexOf\(_todayFilter\) > -1/.test(CODE));
ok('...and the list is still ordered the way she asked',
   /one\.sort\(function \(a, b\) \{ return a\.rank - b\.rank \|\| String\(a\.name\)\.localeCompare\(String\(b\.name\)\); \}\);/.test(CODE));
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
const isAct = x => x.bucket === 'action' ? 0 : 1;
const collapse = rs => {
  const best = {}, order = [];
  rs.forEach(r => { const k = r.cid || ('name:' + r.name);
    if (!best[k]) { best[k] = r; order.push(k); return; }
    if (isAct(r) < isAct(best[k])) best[k] = r; });
  return order.map(k => best[k]).sort((a, b) => a.rank - b.rank || String(a.name).localeCompare(String(b.name)));
};
const kept = collapse(rowsIn);
ok('three reasons for one client become one row', kept.filter(r => r.cid === 'a').length === 1);
ok('...and it is the most urgent one', kept.find(r => r.cid === 'a').rank === 0);
ok('...in the bucket that reason belongs to', kept.find(r => r.cid === 'a').bucket === 'action');
// The case that caused the 27-vs-29 split: onboarding outranks overdue in her
// sort, but a client who needs action belongs under Need action today.
const mixed = collapse([
  { rank: 1, cid: 'z', name: 'Z', bucket: 'onboarding' },
  { rank: 2, cid: 'z', name: 'Z', bucket: 'action' }
]);
ok('a new client who is also overdue counts under Need action today',
   mixed.length === 1 && mixed[0].bucket === 'action');
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
   /todayRows\(\)\.forEach\(function \(r\) \{\n\s*\(r\.buckets \|\| \[r\.bucket\]\)\.forEach\(function \(b\) \{ if \(tn\[b\] !== undefined\) tn\[b\]\+\+; \}\);/.test(CODE));
ok('a signal that is not one of her buckets keeps its own line and its page',
   /const rest = sig\.filter\(function \(x\) \{ return !x\.bucket; \}\);/.test(CODE) &&
   /\$\$\('\.rd-attn-card\[data-go\], \.rd-attn-link', el\)\.forEach/.test(CODE));

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
/* THE TILE IS A DOORWAY SINCE 23 NOVEMBER. Her Home picture reads "38 /
   Open visits / Goes to Fill Priority", with 38 on the rail beside it, so the
   tile counts every open visit rather than the clients with one in the next
   48 hours. Today's LIST still shows only the urgent ones, which is section 9
   unchanged: the two numbers answer different questions and both say which. */
ok('the tile counts every open visit, because that is what is behind the door',
   /if \(ovs\.total\) out\.push\(\{ n: ovs\.total, label: 'Open visits'/.test(CODE));
ok('...and says where it goes', /sub: 'Goes to Fill Priority'/.test(CODE));
ok('one definition of an urgent open visit, read by both the tile and the list',
   (CODE.match(/openVisitsSoon\(\)/g) || []).length === 3);
ok('the LIST is still the 48-hour one, which is her section 9',
   /const cutoff = Date\.now\(\) \+ 48 \* 3600 \* 1000;/.test(CODE));
/* The zero case used to be the one that could lie: the tile counted the next
   48 hours, so it read 0 while 53 visits sat unfilled across the month, and
   "Nothing right now" would have been an all-clear nobody earned. The doorway
   counts every open visit, so zero on this tile now means zero open visits
   and the hedge is no longer needed. It still gets its own words rather than
   the generic ones, because "none open right now" is the true sentence. */
ok('an empty Open visits tile says the true thing about open visits',
   /if \(k === 'open'\) return 'None open right now';/.test(CODE));
ok('...and the other buckets say nothing, because nothing is true of them',
   /return 'Nothing right now';/.test(CODE));
ok('rows are reachable by keyboard', /ev\.key === 'Enter' \|\| ev\.key === ' '/.test(CODE) && /tabindex="0"/.test(CODE));
/* HER CARD. The columns matched her picture and the page still did not: hers
   is a titled card with three column headings, the tier under the client name,
   the reason labelled and coloured, and an Open button on the row. Ours was a
   bare full-bleed list. */
ok('the list is a titled card with her three column headings',
   /rd-td-card/.test(CODE) && /Today.u2019s list .u2014 work top to bottom/.test(CODE) &&
   /scope="col">Client</.test(CODE) && /scope="col">Why it.u2019s here</.test(CODE) &&
   /scope="col">Next step</.test(CODE));
ok('...the tier is a pill under the name', /rd-td-tier/.test(CODE) &&
   /\.rd-td-tier\.high/.test(CSS) && /\.rd-td-tier\.low/.test(CSS));
ok('...the reason is labelled and takes the row s tone',
   /rd-td-k/.test(CODE) && /\.rd-td-r\.bad \.rd-td-k/.test(CSS));
ok('...and the row carries an Open button', /rd-td-b.>Open</.test(CODE));
/* ACCENT WAS NEVER DEFINED. Ten rules reached for var(--accent): every focus
   ring on the new tables, the Show-more link, the Call and Email hover, and
   this button. An undefined custom property makes the whole declaration
   invalid, so the Open button rendered white text on a transparent
   background and the focus rings were simply absent. */
ok('...and the accent the button is painted with exists',
   /--accent: #/.test(CSS));
ok('...so nothing is left reaching for a token that is not there',
   !/var\(--accent\)/.test(CSS) || /--accent: #/.test(CSS));

/* AND IT STOPS AT FIVE. Hers shows five and offers the rest. A caseload like
   Julia s puts twenty-five rows here, which is the wall she complained about:
   "it is easy to miss cards below the fold". */
ok('the list stops at five and offers the rest',
   /const LIMIT = 5;/.test(CODE) &&
   /const vis = _todayAll \? shown : shown\.slice\(0, LIMIT\);/.test(CODE) &&
   /rd-td-more/.test(CODE) && /Show fewer/.test(CODE));
ok('...and pressing a tile is a new question, so it resets',
   /function setTodayFilter\(k\) \{[\s\S]{0,40}_todayAll = false;/.test(CODE));

/* The list is a table now, so the rules that made it a <ul> of CSS-grid rows
   are gone: .rd-td-r IS the <tr>, and display:grid on a table row takes it
   out of the table layout entirely. That put the headings in the wrong place,
   stretched the tier pill into a full-width bar, and left a hundred pixels of
   air in every row. */
ok('only urgency is marked', /\.rd-td-t tbody tr\.bad/.test(CSS) && /\.rd-td-t tbody tr\.warn/.test(CSS));
ok('...and the old grid-row rules are gone, not just overridden',
   !/\.rd-td-r \{\s*\n\s*display: grid;/.test(CSS));

// The list has to redraw when something is sorted, which changes no tile
// number at all, so it cannot sit behind the tiles' change-detection key.
ok('the list redraws outside the tile cache key',
   /refreshNavCounts\(sig\);\s*\n\s*\}\s*\n[\s\S]{0,180}renderToday\(\);/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
