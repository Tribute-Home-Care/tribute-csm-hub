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
ok('cadence leads the left column', /'<div class="rd-sum-l">' \+ wsCadence\(c\) \+ out/.test(CODE));
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
ok('a coverage note shows only when somebody is covering',
   /if \(cov && \(cov\.coveredBy \|\| cov\.to \|\| cov\.note\)\)/.test(CODE));

// The More menu must still exist until nothing depends on it.
ok('the More menu is still reachable while its tabs remain',
   /const WS_MORE = \[/.test(CODE) && /rd-cw-more/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
