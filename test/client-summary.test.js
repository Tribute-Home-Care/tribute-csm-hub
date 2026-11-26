// The Summary tab: one page you can read before a call.
//
// Courtney's review, 17 Nov, priority 2. Her complaints about the old
// Overview, each of which this has to answer:
//   - "No cadence anywhere. Last visit, next visit due, next touchpoint due
//      and care conversation due aren't on the client page."
//   - "The family contact is buried" under More > Client Information.
//   - "The Overview's Care Snapshot is the care plan again, as long
//      paragraphs. It pushes everything else down."
// Her layout: cadence, care team, recent activity on the left; contacts,
// quick care facts, community and LTC, coverage note on the right.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

// ── structure ─────────────────────────────────────────────────────────────
ok('Summary renders as two columns', /<div class="rd-sum">[\s\S]{0,200}rd-sum-l[\s\S]{0,200}rd-sum-r/.test(CODE));
/* THE COLUMNS SWAPPED ON 24 NOV, and the checklist moved into one of them.
   Before: three children in a two-column grid, so the right column wrapped to
   row 2 and row 1 grew as tall as the longer thing in it -- 350px of nothing
   under the checklist on any client inside their first 30 days.
   Now: what you need in your hand on the left with the checklist above it,
   what you are tracking on the right, each its own stack. */
ok('what you need in your hand leads the left column, under the checklist',
   /'<div class="rd-sum-l">' \+ wsS30\(c\) \+ wsSummaryRight\(c, snap\)/.test(CODE));
ok('cadence leads the tracking column',
   /'<div class="rd-sum-r">' \+ wsCadence\(c\) \+ out/.test(CODE));
ok('...and neither column can be moved by the other\u2019s height',
   /\.rd-sum-l, \.rd-sum-r \{ display: flex; flex-direction: column; gap: 12px; \}/.test(CSS));
ok('the right column is its own builder', /wsSummaryRight\(c, snap\)/.test(CODE));
ok('the two columns exist in the stylesheet', /\.rd-sum \{[\s\S]{0,200}grid-template-columns/.test(CSS));
// Her phone order: the number matters more than a late touchpoint in the car.
ok('on a phone the right column comes first',
   /@media \(max-width: 900px\)[\s\S]{0,400}\.rd-sum-r \{ order: 1; \}[\s\S]{0,80}\.rd-sum-l \{ order: 2; \}/.test(CSS));

// ── cadence is composed, not invented ─────────────────────────────────────
// visitSt, tpSt, ciSt and nextVisit already drove the list's exceptions; they
// were simply never shown on the client they describe.
ok('cadence uses the helpers that already existed',
   /const vs = visitSt\(c\), ts = tpSt\(c\), cs = ciSt\(c\);/.test(CODE));
ok('it shows the visit, the touchpoint and the care conversation',
   /row\('Last visit'/.test(CODE) && /row\('Touchpoint'/.test(CODE) && /row\('Care conversation'/.test(CODE));
ok('each row carries the cadence it is measured against',
   /'Every ' \+ plural\(tpCad, 'day'\)/.test(CODE) && /'Every ' \+ plural\(ciCad, 'day'\)/.test(CODE));
ok('a client with no visit cadence says so rather than reading as overdue',
   /c\.freq === 'NA' \? 'No visit cadence set'/.test(CODE));
ok('nothing on record is stated, not shown as a blank',
   /Nothing on record/.test(CODE));
// Only lateness is coloured; on track is the absence of a colour.
ok('only overdue and due-soon are marked', /\.rd-cad\.bad dd/.test(CSS) && /\.rd-cad\.warn dd/.test(CSS) && !/\.rd-cad\.ok dd \{ color/.test(CSS));

// ── contacts, which were the buried thing ─────────────────────────────────
ok('the primary contact is on Summary', /const pc = d\.primaryContact;/.test(CODE));
ok('a phone number is dialable', /'<a href="tel:'/.test(CODE));
ok('other contacts are there but folded away', /plural\(others\.length, 'other contact'\)/.test(CODE));
ok('an emergency contact is marked as one', /x\.emergency \? '<span class="rd-sub">Emergency/.test(CODE));
ok('no contacts on file says so rather than rendering an empty card',
   /No family contact is on file in Viv\./.test(CODE));

// ── the former More views, folded in ──────────────────────────────────────
ok('quick care facts come from the care plan, not retyped', /out \+= wsSnapshot\(c\);/.test(CODE));
// It was briefly rendered in BOTH columns, which doubled the exact thing she
// complained about. Found by looking at the page, not by reading the diff.
ok('the care snapshot is rendered once, not once per column',
   (CODE.match(/wsSnapshot\(c\)/g) || []).length === 2);   // one call, one definition
ok('it is the right column that holds it', /out \+= wsSnapshot\(c\);[\s\S]{0,120}Quick care facts/.test(CODE));
ok('community and LTC are on Summary', /block\('Community and LTC'/.test(CODE));
/* REVERSED ON 26 NOV. Showing the card only while somebody was covering was
   the wrong half: the note is written BEFORE a CSM goes away, so the one
   moment you need to know whether this client has one was exactly when the
   card was absent. It is always there now, and says plainly when there is
   no note. */
ok('the coverage card is always on the page',
   /out \+= block\('Coverage', body\);/.test(CODE));
ok('...naming whoever is covering, when somebody is',
   /cov && \(cov\.coveredBy \|\| cov\.to\)/.test(CODE));
ok('...showing the note itself when there is one', /\? covNoteHtml\(note\)/.test(CODE));
ok('...and saying so plainly when there is not',
   /No coverage note for this client yet\./.test(CODE));
/* One note per client, and it is the OWNER's: a covering CSM's own note
   about somebody else's client is not the handover. */
ok('the note comes from the shared coverage list, so both pages agree',
   /typeof getCov === 'function' \? getCov\(\) : \[\]/.test(CODE));
ok('...preferring the owning CSM\'s note', /return mine\.filter\(function \(n\) \{ return n\.csmId === owner; \}\)\[0\] \|\| mine\[0\];/.test(CODE));
/* And one way in to write it, which sets V1's own select and calls V1's own
   loader rather than drawing a second form to keep in step. */
ok('there is one way in to write it', /data-covopen="/.test(CODE));
ok('...which uses V1\'s own form', /window\.loadCovNote\(\)/.test(CODE));

/* ASK, from her review. */
ok('there is an Ask button on the client', /data-askabout="/.test(CODE));
ok('...that starts the question with the client in it',
   /q\.value = 'About ' \+ \(c\.name \|\| 'this client'\) \+ ': ';/.test(CODE));
ok('...in V1\'s own Assistant box, not a second one', /getElementById\('asst-q'\)/.test(CODE));

// ── the More menu is gone, and nothing went with it ───────────────────────
// This assertion used to be the opposite: it guarded the interim state where
// the menu had to stay until its five views had somewhere to live. They do
// now, so it asserts the removal and, more importantly, that the removal
// stranded nothing.
ok('the More menu is gone', !/rd-cw-more/.test(CODE) && !/data-menu="ws"/.test(CODE));
ok('four tabs and no fifth destination',
   (CODE.match(/role="tab" data-key=/g) || []).length === 1 && /WS_AREAS\.map/.test(CODE));
ok('an old route to a moved view lands on the tab that holds it',
   /const MOVED = \{ team: 'schedule', info: 'overview', communication: 'activity',/.test(CODE) &&
   /if \(MOVED\[_section\]\) _section = MOVED\[_section\];/.test(CODE));
// workflows.js registers "Weekly schedule emails sent" into the Communication
// area. Dropping that view without re-homing the block would have removed a
// record of what was sent to a family, with nothing in the diff to show it.
ok('a block contributed to the dropped Communication view still renders',
   /extraBlocks\('communication', c\)/.test(CODE));
ok('...on Activity, where it belongs', /extraBlocks\('activity', c\)[\s\S]{0,400}extraBlocks\('communication', c\)/.test(CODE));
ok('the care team moved to the Schedule tab', /out \+= block\('Care team', wsTeam\(c, snap\)\);/.test(CODE));

// ── the Activity filter, which is what replaces Communication ─────────────
ok('Activity filters by who the contact was with',
   /const ACT_FILTERS = \[\['all', 'All'\], \['family', 'Family'\],[\s\S]{0,60}\['caregiver', 'Caregiver'\], \['visit', 'Visits'\]\]/.test(CODE));
ok('the party is derived at source, not guessed from a label',
   /party: \/\^CG-\/i\.test\(ty\) \? 'caregiver' : 'family'/.test(CODE));
ok('counts come from everything, so an empty filter still says so',
   /Nothing logged under that filter yet\./.test(CODE));
ok('quick care facts are clamped rather than cut', /\.rd-snap-t \{[\s\S]{0,120}line-clamp: 2/.test(CSS));
ok('the card is called what she called it', /block\('Quick care facts'/.test(CODE) && !/Care snapshot/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
