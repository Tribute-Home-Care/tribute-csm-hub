/* DAY 30: GRADUATE, OR EXTEND TO SUCCESS IN 60.
 *
 * Onboarding, Offboarding & Success in 30, Part 3:
 *   "At Day 30: An On Track client graduates to their normal tier cadence. A
 *    Watch or At Risk client gets 30 more days with the same checks (Success
 *    in 60). The manager gets a short summary."
 *
 * Part 4 ("For Andrew"):
 *   "At Day 30, graduate the client or extend them to Success in 60, and
 *    notifies the manager of the result."
 *
 *   node test/d30-graduate-or-extend.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
/* Read the SOURCE copies. v2/ is the build destination for both of these,
   so asserting against v2/ would pass on an overwrite -- see
   test/build-file-direction.test.js. */
const OB = strip(fs.readFileSync(path.join(PROTO, 'v2-onboarding.js'), 'utf8'));
const RD = strip(fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8'));
const CSS = fs.readFileSync(path.join(PROTO, 'v2-onboarding.css'), 'utf8');

/* ── 1. the verdict is her rule, and nobody picks ─────────────────────── */
const v = (OB.match(/function d30Verdict\(c\)\{[\s\S]*?\n\}/) || [''])[0];
ok('there is a Day 30 verdict', !!v);
ok('...which says nothing before day 30', /if\(d===null\|\|d<30\|\|d>S60_DAYS\)return null;/.test(v));
/* AND NOTHING AFTER DAY 60. The first pass had a floor and no ceiling, so
   every client who had ever passed day 30 had a result waiting to be
   cleared: 216 of 238 on the live roster, median 461 days in care, oldest
   1,761. Day 60 is where Success in 60 ends and the decision is over. */
ok('...and nothing after the Success in 60 window closes', /d>S60_DAYS\)return null;/.test(v));
ok('...reads the checklist rather than re-deciding the status',
   /s30Adjusted\(c\)/.test(v) && !/overdue|complaint/i.test(v));
/* And a checklist nobody started does not graduate: we do not know the first
   thirty days went well, only that nothing was written down. */
ok('...and only a genuinely clean thirty days graduates',
   /const grad=\(k\.state==='ontrack'\|\|k\.state==='done'\);/.test(v) &&
   /notstarted:'Not started'/.test(OB));
ok('...graduates On Track and Complete, and extends the other two',
   /const grad=\(k\.state==='ontrack'\|\|k\.state==='done'\);/.test(v) &&
   /outcome:grad\?'graduate':'extend'/.test(v));
ok('...and an extension runs to day 60 from the start of care',
   /const S60_DAYS=60;/.test(OB) && /until:grad\?'':_todoDay\(c\.startDate,S60_DAYS\)/.test(v));
/* No choice is offered anywhere: the status decides, so the only human act is
   acknowledging it. A button that let a manager pick the outcome would be a
   second rule competing with hers. */
ok('nothing offers a choice of outcome',
   !/d30Set|d30Choose|chooseOutcome|data-d30out/.test(OB));

/* ── 2. it is NOT written during a render ─────────────────────────────── */
/* set() mutates before queueSave() gets to refuse, so a write on a render
   path is a write a read-only View As cannot stop. That cost a real Scribe
   encounter on a real client this month. */
ok('the verdict is derived, not saved, when it is read',
   !!v && !/queueSave|DATA\.shared=/.test(v));
const ack = (OB.match(/function d30Ack\(cid\)\{[\s\S]*?\n\}/) || [''])[0];
ok('the only write is the acknowledgement', !!ack && /queueSave\(\);/.test(ack));
ok('...which a manager or director makes', /P\.isManager\|\|P\.isDirector/.test(ack));
ok('...and which the read-only guard knows about',
   /\['d30Ack',\s*'clear a Day 30 result'\]/.test(RD));

/* ── 3. and it freezes, because Day 30 is a fact about Day 30 ─────────── */
/* Two of her At Risk conditions count inside a window -- "any Client
   Complaint SE", "two or more caregiver changes in 30 days" -- so they age
   out, and a client extended on Day 30 would read "graduate" again on Day 45
   from the same function. */
ok('an acknowledged verdict is kept, not recomputed',
   /const frozen=d30Record\(c\.id\);\n\s*if\(frozen\)return/.test(v));
ok('...and the record says who cleared it and when',
   /seenBy:\(P&&P\.name\)\|\|'',seenAt:new Date\(\)\.toISOString\(\)/.test(ack));
ok('...in the shared document, so every profile sees the same answer',
   /DATA\.shared\.d30Results/.test(ack) && /DATA\.shared&&DATA\.shared\.d30Results/.test(OB));

/* ── 4. the manager gets a short summary ──────────────────────────────── */
ok('there is a summary, and it is a sentence', /function d30Summary\(c,v\)\{/.test(OB));
ok('...that reuses the checklist\'s own reason rather than writing a new one',
   /\(why\?': '\+why:''\)/.test(OB));
/* The Not started reason is a sentence of its own and already ends in a full
   stop, so the summary read "...nothing has been done.. They stay...". */
ok('...with one full stop between the two sentences, not two',
   /const why=String\(v\.why\|\|''\)\.replace\(\/\\\.\\s\*\$\/,''\);/.test(OB));
/* And the manager view waits for the profile instead of answering without
   one: on a cold load the route resolves first, and a saved link ending in
   #s60 used to land a manager on a page with no manager view at all. */
/* V1's showPage calls renderObManager BEFORE renderObBoard, and it is
   renderObBoard that calls mountObUI and creates #s60-mgr. On the first
   visit this returned on a null host and the board then mounted an empty
   one, so the manager view was absent until a second visit. */
ok('the manager view mounts its own host before looking for it',
   /function renderObManager\(\)\{\n(\s*\/\*[\s\S]*?\*\/\n)?\s*mountObUI\(\);/.test(OB));
ok('the manager view waits for the profile, for ten seconds and no longer',
   /if\(!P\)\{ if\(_obMgrWaits<20\)\{ _obMgrWaits\+\+; setTimeout\(renderObManager,500\); \} return; \}/.test(OB));
ok('...naming the tier a graduating client goes back to',
   /graduate to the '\+\(c\.tier\|\|'normal'\)\+/.test(OB));
ok('...and the date an extended one runs to', /through '\+until:''\)\+' \(Success in 60\)/.test(OB));
/* Her own channel for telling a manager, set out at the top of the document:
   "Two days later, the owner's manager sees it on the manager view." */
ok('the result lands on the manager view', /const d30=d30Pending\(\);/.test(OB) &&
   /<div class="ct">Day 30 results<\/div>/.test(OB));
ok('...and stays there until it is read', /\.filter\(r=>r\.v&&!r\.v\.frozen\)/.test(OB));
ok('...with a row wide enough for a sentence',
   /\.obb-r\.obb-d30\{/.test(CSS) && /\.obb-r\.obb-d30 \.obb-w\{white-space:normal/.test(CSS));

/* ── 5. "the same checks" really do continue ──────────────────────────── */
ok('there is one window, and the onboarding module owns it',
   /function s60Window\(c\)\{[\s\S]*?return \(v&&v\.outcome==='extend'\)\?S60_DAYS:30;/.test(OB));
ok('...which the redesign layer asks rather than copies',
   /typeof s60Window === 'function' \? s60Window\(c\) : 30/.test(RD));
ok('the board keeps an extended client on it', /const win=s60Window\(c\);\n\s*if\(daysIn===null\|\|daysIn>win\)return;/.test(OB));
ok('...and counts their day against the right total', /Day \$\{r\.daysIn\+1\} of \$\{r\.win\|\|30\}/.test(OB));
ok('the client page keeps the checklist card up', /if \(k\.daysIn > s60Win\(c\)\) return '';/.test(RD));
ok('the At Risk signal keeps watching them', /inFirstDays\(c, s60Win\(c\)\)/.test(RD));
/* Needs action reads s30Risk over the window, so Today's list has to build a
   row over the window too. Otherwise an extended client At Risk on day 35 is
   counted by the Clients chip and has no row for Home's tile to count. */
ok('...and Today builds them a row for the whole window',
   /const win = s60Win\(c\);\n\s*if \(age !== null && age <= win\) \{/.test(RD));
ok('...which says Success in 60 once they are extended',
   /\(win > 30 \? 'Success in 60' : 'Success in 30'\)/.test(RD));

/* HER TILE IS STILL HER TILE. Home's fourth tile reads "In first 30 days".
   An extension continues the checks; it does not rename the tile. */
ok('Home\'s In first 30 days tile still means thirty',
   /if \(age !== null && age <= 30\) b\.push\('onboarding'\);/.test(RD) &&
   /\['onboarding', 'In first 30 days'\]/.test(RD));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
