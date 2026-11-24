// What is due, when the ranking means anything, and the Hub's own words.
//
// Four items from the 24 Nov list, all of them the Hub saying less than it
// knows or more than it should.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const RD  = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const POL = fs.readFileSync(path.join(__dirname, '../v2/v2-policy.js'), 'utf8');
const CHR = fs.readFileSync(path.join(__dirname, '../v2/v2-chrome.js'), 'utf8');

// ── 1. Next due says which clock ──────────────────────────────────────────
/* It read the VISIT clock alone and printed a bare date. On the Needs action
   tab -- where every client with no visit on record is -- nextVisit() is null,
   so the column was empty for all thirty rows. Measured live before the fix:
   twelve of twelve cells blank on that tab, and "Dec 1" / "Nov 29" with no
   title attribute on the tab where it did render. */
ok('the three cadences each keep their own name', /function dueClocks\(c\) \{/.test(RD));
ok('...all three of them',
   /add\('Visit', parseInt\(c\.freq\) \|\| 90, c\.lastVisit, nextVisit\(c\)\)/.test(RD) &&
   /add\('Touchpoint', \(app\.tpCadence \|\| \{\}\)\[c\.tier\] \|\| 30/.test(RD) &&
   /add\('Care conversation', \(app\.ciCadence \|\| \{\}\)\[c\.tier\] \|\| 180/.test(RD));
ok('the soonest one that is still ahead wins', /function nextDueDetail\(c\) \{/.test(RD));
/* ONE SET OF SUMS. daysUntilDue drives the "Due this week" tab; if it kept
   its own copy of the arithmetic the tab and the column could disagree about
   which date they meant, which is the fault this whole review is about. */
ok('...and daysUntilDue is derived from it, not repeated',
   /function daysUntilDue\(c\) \{\s*\n\s*const n = nextDueDetail\(c\);\s*\n\s*return n \? n\.days : null;\s*\n\s*\}/.test(RD));
ok('the cell prints the clock beside the date',
   /esc\(fmtShort\(nd\.date\)\) \+ '<span class="rd-clt-due">' \+ esc\(nd\.what\) \+ '<\/span>'/.test(RD));
/* Three different kinds of nothing that all used to render as an empty cell. */
ok('...and tells the three kinds of nothing apart',
   /clocks\.length \? '<span class="rd-ws-quiet">Overdue<\/span>'/.test(RD) &&
   /c\.freq === 'NA' \? '<span class="rd-ws-quiet">No cadence<\/span>'/.test(RD) &&
   /'<span class="rd-ws-quiet">Nothing on record<\/span>'/.test(RD));
ok('...and the clock name is styled to read as a sub-label', /\.rd-clt-due \{/.test(CSS));
/* The visit date must be V1's own, or two pages would name different days for
   the same visit. */
ok('the visit date comes from V1’s nextDue, not a second copy',
   /function nextVisit\(c\) \{[\s\S]{0,120}fn\.nextDue\(c\.lastVisit, c\.freq\)/.test(RD));

// ── 2. the sort that had no column ────────────────────────────────────────
ok('Start of care is a column now', /\['start', 'Start of care'\]/.test(RD));
ok('...and the sort it needs was already written',
   /else if \(_sortKey === 'start'\) list\.sort\(function \(a, b\) \{\s*\n\s*return dir \* nullsLast\(a\.c\.startDate\)/.test(RD));
/* WITH THE YEAR. fmtShort drops it, which is right for a visit last week and
   wrong here: the first sort by start date came back reading "Jul 20, Aug 10,
   Nov 7, May 11, Sep 2" -- correct across 2022 and 2023, and indistinguishable
   from broken. A column people sort by has to show what it is sorted on. */
ok('...and the cell renders the date with its year',
   /c\.startDate \? esc\(fmtWithYear\(c\.startDate\)\)/.test(RD) &&
   /const fmtWithYear = \(d\) => \{/.test(RD));
ok('...except for this year, where the year is the one thing nobody needs',
   /thisYear \? \{ month: 'short', day: 'numeric' \}/.test(RD));

// ── 3. Fill Priority ranks nothing without an event ───────────────────────
/* The page printed "Active Coverage Event: no active event" and then #1, #2,
   #3 with scores underneath. */
ok('the ranking is gated on an open event', /function fpHasEvent\(\) \{/.test(RD) &&
   /function decorateFillPriority\(\) \{/.test(RD));
ok('...and it is checked on arrival', /if \(p === 'priority'\) \{ try \{ decorateFillPriority\(\); \}/.test(RD));
ok('...and again when an event is chosen, so the list comes straight back',
   /sel\.addEventListener\('change', function \(\) \{ setTimeout\(decorateFillPriority, 0\); \}\)/.test(RD));
/* Hidden, not emptied: V1 rewrites #fp-list on its own passes and would not
   know to rebuild anything this layer had thrown away. */
ok('...and V1’s list is hidden rather than destroyed',
   /list\.style\.display = on \? '' : 'none';/.test(RD));
ok('...with an empty state that says what the ranking is for',
   /No coverage event is open\./.test(RD) && /\.rd-fp-none \{/.test(CSS));

// ── 4. the sidebar speaks the CSM's language ──────────────────────────────
/* "Under the logo it reads 'writes on, 1 thing to look at', which is still
   unclear." All four states in one vocabulary, and it is saving, not writes. */
ok('the normal state says saving works', /el\.textContent = 'saving works';/.test(POL));
ok('...and the off state matches it', /el\.textContent = 'saving is off';/.test(POL));
ok('...and the word "writes" is gone from the strip',
   !/'writes on'/.test(POL) && !/'writes off'/.test(POL));
ok('...and the tooltip says the same thing',
   /title="Whether your work is being saved\. Click for diagnostics\."/.test(CHR));
/* The strip is the only way into the diagnostics panel, so it must still have
   something to click. */
ok('...and the strip still has text in every state, so it stays clickable',
   !/el\.textContent = '';/.test(POL.slice(POL.indexOf('function updateBadge'),
                                           POL.indexOf('function updateBadge') + 1400)));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
