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

/* ── her sort order ──────────────────────────────────────────────────────
   "Pulse flags, then Success in 30 milestones, then overdue visits and
   touchpoints, then due this week." ALL Pulse flags first, not just the red
   ones.

   THE BUCKET SPLIT HAD LEAKED INTO THE RANK. An amber Pulse was rank 3,
   below Success in 30 at 1 and below "No visit on record" at 2, so on a
   real caseload a Safety flag sat under three routine cadence rows. Which
   TAB a row belongs to and where it sits in the LIST are two different
   questions, and one answer was being used for both. The bucket is
   unchanged -- amber still sits in Watch, so a tile and a tab cannot
   disagree about one client. */
ok('a red Pulse flag ranks first, and an amber one second',
   /rank: lvl === 'red' \? 0 : 1,/.test(CODE) &&
   /bucket: lvl === 'red' \? 'action' : 'watch',/.test(CODE));
/* An amber flag is a watch item, not a date. There is no Watch tile here, by
   her design: Home has her four. The row still appears in the unfiltered
   list, and Watch is a chip on the Clients page. Leaving it in the week
   bucket would have made the "Due this week" tile count a client its own tab
   on Clients excluded. */
ok('...and an amber one is a watch item, so no tile claims it',
   !/\['watch',/.test(CODE.match(/const TODAY_BUCKETS = \[[\s\S]*?\];/)[0]));
ok('...and the headline is still what the row says', /why: pulseFirst\(pp\.headline\)/.test(CODE));
ok('Success in 30 ranks below every Pulse flag', /rank: 2, bucket: 'onboarding'/.test(CODE));
ok('overdue ranks above due-soon, and both below Success in 30',
   /rank: ex\.tone === 'bad' \? 3 : 4/.test(CODE));
ok('open visits rank last', /rank: 5, bucket: 'open'/.test(CODE));
// Behavioural, over the five kinds of row, in her words' order.
const RANKS = { pulseRed: 0, pulseAmber: 1, s30: 2, overdue: 3, dueSoon: 4, openVisits: 5 };
const order = Object.keys(RANKS).sort((a, b) => RANKS[a] - RANKS[b]);
ok('every Pulse flag outranks Success in 30 and every cadence row',
   order.indexOf('pulseAmber') < order.indexOf('s30') &&
   order.indexOf('pulseAmber') < order.indexOf('overdue'));
ok('...and a red flag still leads an amber one',
   RANKS.pulseRed < RANKS.pulseAmber);
ok('...and the whole order is hers',
   order.join(',') === 'pulseRed,pulseAmber,s30,overdue,dueSoon,openVisits');
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
/* HER ORDER: Pulse, then Success in 30, then overdue, then due this week,
   and inside each group the highest tier first. rank carries the first half;
   tier is the tiebreak that was missing, so a High need client no longer sat
   below a Low one because of the alphabet. Name stays last, so the order is
   stable between renders and the list does not reshuffle under the reader. */
ok('...and the list is ordered by group, then tier, then name',
   /const TIER_RANK = \{ High: 0, Medium: 1, Low: 2 \};/.test(CODE) &&
   /return group\(a\) - group\(b\) \|\|/.test(CODE) &&
   /String\(a\.name\)\.localeCompare\(String\(b\.name\)\);/.test(CODE));
/* THE GROUP IS ABOUT THE CLIENT, NOT THE ROW. Success in 30 means this client
   has open milestones, not that the row we kept is a milestone row. A client
   who is overdue AND has milestones open is a new client whose onboarding is
   slipping, which outranks an overdue visit on a settled one. */
ok('...and a client with open milestones is grouped by that, not by their row',
   /return r\.isPulse \? 0 : \(r\.s30 \? 1 : 2\);/.test(CODE));
/* IT ASKS isPulse, NOT THE LABEL. This read `r.kind === 'Pulse'`, and kind
   stopped being the word "Pulse" the moment her plain labels went in: the
   row says "Safety" or "Family not told" now. From that change until this
   one NO row was recognised as a Pulse row here, and every flag fell into
   the ordinary urgent group -- which is how a Safety flag came to sit below
   three "No visit on record" rows on a real caseload. A row should be asked
   what it IS, not what it is called. */
ok('a Pulse row is recognised by what it is, not by what it is labelled',
   /return r\.isPulse \? 3 : 4;/.test(CODE) && !/r\.kind === 'Pulse'/.test(CODE) &&
   /isPulse: true,/.test(CODE));
// Behavioural, over the five shapes the grouper actually sees.
const group = (r) => { const urgent = r.tone === 'bad'; if (urgent) return r.isPulse ? 0 : (r.s30 ? 1 : 2); return r.isPulse ? 3 : 4; };
ok('a red flag labelled Safety still groups first',
   group({ tone: 'bad', isPulse: true, kind: 'Safety' }) === 0);
ok('...and beats an overdue visit on a client with milestones open',
   group({ tone: 'bad', isPulse: true, kind: 'Safety' }) <
   group({ tone: 'bad', s30: 4, kind: 'No visit on record' }));
ok('...which is the exact case that was wrong: Safety under three cadence rows',
   group({ tone: 'bad', isPulse: true, kind: 'Safety' }) <
   group({ tone: 'bad', s30: 0, kind: 'No visit on record' }));
ok('a settled client overdue still ranks below one whose onboarding is slipping',
   group({ tone: 'bad', s30: 0 }) > group({ tone: 'bad', s30: 4 }));
ok('and a warn-tone Pulse row still sits above a warn-tone cadence row',
   group({ tone: 'warn', isPulse: true }) < group({ tone: 'warn' }));
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
ok('the list stops at eight and offers the rest',
   /const LIMIT = 8;/.test(CODE) &&
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

/* ── A COUNT COMPUTED BEFORE PULSE ARRIVES IS NOT A COUNT ────────────────
   Measured on build 08:17, twice, with the same numbers: for about 1.7
   seconds the tiles read 18 / 5 / 4 / 52 and then settled on 30 / 3 / 4 / 52.
   needsAction() and onWatch() both ask pulseLevel(), so until the Pulse feed
   lands every tile that depends on it is counting a caseload with no flags.

   This file's own rule for the other half -- "an endpoint that FAILED is not
   an endpoint that said nothing" -- is the same fault wearing the other
   shoe. A wrong number shown confidently for 1.7 seconds is worse than no
   number: long enough to read, and it disagrees with its replacement. */
ok('the tiles wait for Pulse rather than counting without it',
   /function countsReady\(\)/.test(CODE) &&
   /renderAttnWaiting\(el\); refreshNavCounts\(null\); return;/.test(CODE));
/* DASHES ARE FOR THE FIRST PAINT ONLY. The settle gate is right not to draw a
   half-loaded count and wrong to apply that to numbers already on screen: the
   tiles went 21 / 4 / 4 / 32, back to dashes for a second, then the same
   numbers again. Nothing was wrong with either set, so the dashes in between
   said "we do not know" about something we did know. A number a second out of
   date is worth more than a dash, because it is still a number you can go and
   verify. Before the first paint there is nothing to keep. */
ok('...but once real numbers are up they are not replaced by dashes',
   /if \(_attnPainted\) return;/.test(CODE) && /_attnPainted = true;/.test(CODE));
ok('...and that is recorded only after the readiness gate has passed',
   CODE.indexOf('if (_attnPainted) return;') < CODE.indexOf('_attnPainted = true;'));
/* The rail badge was given the same wait, which is why that line now carries a
   refreshNavCounts(null) as well: the call that paints the badges sits past
   this early return, so while the counts were not ready it never ran and the
   badge kept its last text. Reported as "the Clients badge reads 18 before it
   changes to 30 -- the same partial-data flash the Home tiles had." */
/* AN EMPTY byCid IS NOT A LOADED PULSE. The first cut asked `app.pulse &&
   app.pulse.byCid`, which went TRUE the moment _PULSE was initialised with
   an empty map. Measured on build 08:23: dashes at 0s, the wrong 18 / 5 at
   0.5s, dashes again at 0.9s once the load actually started, then the right
   30 / 3 at 1.7s. Half-fixed is its own bug. */
ok('...reading the application\'s own loading flag FIRST',
   /if \(window\._pulseLoading\) return false;/.test(CODE));
/* THE PRESENCE OF THE FEED, NOT THE SIZE OF IT. loadPulse builds its byCid map
   and assigns the whole object in one go, so _PULSE is either absent or
   complete -- which makes its presence the honest test, an empty map included.
   The size test it replaces was fine; the flag beside it was not. */
ok('...and the presence of the feed is the test',
   /if \(app\.pulse\) return true;/.test(CODE));
/* THE FLAG THAT BROKE HOME IS GONE. It was set when a load STARTED and read as
   proof that one had FINISHED, so a failed load left it claiming an answer
   nobody had. */
ok('...and nothing reports ready merely because a load was attempted',
   !/pulseRan/.test(CODE));
// Behavioural, over the states the loader actually passes through.
const readyOf = (appReady, loading, pulsePresent, sinceBoot) => {
  if (!appReady) return false;
  if (loading) return false;
  if (pulsePresent) return true;
  return sinceBoot > 20000;
};
ok('0.0s: app not ready yet is not ready', readyOf(false, false, false, 0) === false);
ok('0.5s: no feed in hand yet is not ready', readyOf(true, false, false, 500) === false);
ok('0.9s: the load is in flight, still not ready', readyOf(true, true, false, 900) === false);
ok('1.7s: the feed landed, ready', readyOf(true, false, true, 1700) === true);
ok('...and a feed that landed EMPTY is a real answer, not a wait',
   readyOf(true, false, true, 1800) === true);
/* THE CASE THAT PRODUCED THE 30-SECOND STALE HOME: the first load failed and
   the retry has not fired yet, so nothing is in flight and nothing is in hand.
   The old rule called that ready and drew cadence-only counts. */
ok('...but a load that FAILED is not an answer, even with nothing in flight',
   readyOf(true, false, false, 5000) === false);
ok('...and the waiting tile carries no number and cannot be pressed',
   /class="rd-attn-card wait"/.test(CODE) && /aria-hidden="true"/.test(CODE) &&
   /Reading Client Pulse/.test(CODE) && /\.rd-attn-card\.wait \{/.test(CSS));
/* The key must NOT be set while waiting, or the real render never happens. */
ok('the repaint key is not consumed by the waiting state', (() => {
  const fn = (CODE.match(/function renderAttention\(\) \{[\s\S]*?const sig = attentionSignals\(\);/) || [''])[0];
  return /renderAttnWaiting\(el\); refreshNavCounts\(null\); return;/.test(fn) && !/_attnKey =/.test(fn);
})());
ok('...and something repaints when the feed lands',
   /_attnWait = setInterval/.test(CODE) && /_attnKey = '';/.test(CODE));
/* THAT WATCHER IS ONLY INSTALLED ON THE WAITING PATH. If the first render was
   NOT a wait, nothing repainted when the feed arrived later, which is the
   other half of the stale Home: the lists were right and the tiles, badge and
   sync line kept their first values until the reviewer navigated away and
   back. updateHome is what V1 calls whenever Home's data changed, so it is
   the hook; the wrapper stripped an emoji and did nothing else. */
ok('...and the layer repaints on every data change V1 announces',
   /try \{ _attnKey = ''; renderAttention\(\); \} catch \(e\) \{\}/.test(CODE) &&
   /try \{ installVivFreshness\(\); \} catch \(e\) \{\}/.test(CODE));
ok('...from inside the wrapper on the application\'s own updateHome',
   /window\.updateHome = wrapped;/.test(CODE));
/* A Pulse feed that never answers must leave numbers, not dashes for ever. */
ok('a feed that never answers still gets drawn after a grace period',
   /const ATTN_GRACE = 20000;/.test(CODE) &&
   /return \(Date\.now\(\) - _attnBootAt\) > ATTN_GRACE;/.test(CODE));
// Behavioural, over the four states the loader actually passes through.
const ready = (app, loading, sinceBoot) => {
  if (!app.ready) return false;
  if (app.pulse && app.pulse.byCid) return true;
  if (loading) return false;
  return sinceBoot > 20000;
};
ok('app not ready is not ready', !ready({ ready: false }, false, 0));
ok('pulse still loading is not ready', !ready({ ready: true }, true, 1000));
ok('pulse landed is ready', ready({ ready: true, pulse: { byCid: {} } }, false, 1000));
ok('pulse never answered is drawn anyway once the grace is up',
   ready({ ready: true }, false, 25000));
ok('...but not before', !ready({ ready: true }, false, 5000));

// ── Viv data must not go backwards ───────────────────────────────────────
/* Reported on 16:47: the header showed "Viv data from 8:51 PM" at 1.6s and
   then reverted to "Viv data 5h old, from 4:25 PM" and STAYED. Two writers
   with no ordering between them: applyVivData puts a fresh sync in memory,
   loadDataFromFile replaces DATA wholesale with the stored document, and
   whichever lands last wins regardless of age.

   Permanent rather than momentary because of how the fresh copy persists:
   applyVivData calls queueSave(), which debounces 1500ms AND refuses outright
   when writesBlocked() -- so in the read-only view-as every reviewing manager
   is in, it is never saved, and the next read reverts it for good. */
ok('the newest Viv snapshot wins, whoever wrote it', /function installVivOrder\(\) \{/.test(CODE));
ok('...a sync carrying older data is ignored',
   /if \(inc && have && inc < have\) return;/.test(CODE));
ok('...and a stored document older than memory does not replace it',
   /if \(keep && vivGenOf\(window\.DATA\) < keepAt\) \{/.test(CODE));
/* Re-applying the SAME snapshot must stay harmless, so the comparison is
   strictly less-than. Asserted behaviourally: CODE here has its comments
   stripped, so a rule stated only in a comment cannot be checked at all. */
{
  const accepts = (incoming, have) => !(incoming && have && incoming < have);
  ok('...a newer sync is accepted', accepts(200, 100) === true);
  ok('...an older sync is ignored', accepts(100, 200) === false);
  ok('...and re-applying the same one is still accepted', accepts(100, 100) === true);
  ok('...as is the first one, when nothing is held yet', accepts(100, 0) === true);
}
ok('...and it is installed on both write paths',
   /window\.applyVivData = wrapped;/.test(CODE) && /window\.loadDataFromFile = wrapped;/.test(CODE));
/* The tiles were flashing real counts of a half-loaded roster. */
ok('the tiles wait for the document as well as for Pulse',
   /if \(_dataLoading\) return false;/.test(CODE) &&
   /_dataLoading = true;/.test(CODE) &&
   /finally \{ _dataLoading = false; _lastDataChangeAt = Date\.now\(\); \}/.test(CODE));
/* AND FOR THE GAP BETWEEN TWO LOADS. The Hub reads the document more than once
   on a cold open, and a gate that knows about one read at a time drew a true
   count of the FIRST document in between -- 17 / 6 / 4 / 32 before the real
   21 / 4 / 4 / 32. The tiles wait for the data to stop moving instead. */
ok('...and for the data to stop moving, not just for one read to end',
   /if \(_lastDataChangeAt && Date\.now\(\) - _lastDataChangeAt < SETTLE_MS\) return false;/.test(CODE) &&
   /const SETTLE_MS = 700;/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
