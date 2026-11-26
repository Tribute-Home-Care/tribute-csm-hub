/* SILENCE IS NOT RISK.
 *
 * Measured on the live caseload across all eleven profiles, 26 Nov 2026:
 * 21 clients in their first thirty days, 14 of them At Risk, and TEN
 * milestone rows in the whole company. Of those 14, ZERO had a client
 * complaint exception or two or more caregiver changes. Twelve were At Risk
 * for exactly one reason: nobody had ticked anything on their checklist.
 *
 * Courtney's Part 3 rule is right once the checklist is being worked. Until
 * then "two or more items overdue" measures whether anyone RECORDED the
 * work, not whether it happened.
 *
 *   node test/s30-silence-not-risk.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const OB = strip(fs.readFileSync(path.join(PROTO, 'v2-onboarding.js'), 'utf8'));
const RD = strip(fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8'));
const CSS = fs.readFileSync(path.join(PROTO, 'v2-onboarding.css'), 'utf8');
const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

/* ── 1. her rule is untouched ─────────────────────────────────────────── */
/* The layer decides what the Hub DOES with the answer. It does not restate
   her conditions, which would be a second rule competing with hers. */
const adj = (OB.match(/function s30Adjusted\(c,pid\)\{[\s\S]*?\n\}/) || [''])[0];
ok('there is an adjusted read', !!adj);
/* Through s30WithEvidence, which hands s30Checklist the fuller evidence for
   the length of one call and then puts its readers back. Her rules still
   decide; what changed is what they can see. */
ok('...which still asks s30Checklist for the status',
   /k=s30WithEvidence\(c,pid\);/.test(adj) && /try\{ return s30Checklist\(c\); \}/.test(OB));
ok('...and the shim is always undone, even on a throw',
   /finally\{ window\.get=realGet; window\._s30Exceptions=realEx; window\._s30CaregiverChanges=realCg; \}/.test(OB));
ok('...and writes the derived evidence to no store',
   !/set\('s60'/.test(OB.slice(OB.indexOf('function s30Derived'), OB.indexOf('function s30Facts'))));
/* Tested on the CODE, with the message strings taken out: the Not started
   sentence explains itself in English and says the word "overdue", which is
   prose, not a condition being re-decided. */
const adjLogic = adj.replace(/'(\\.|[^'])*'/g, "''");
ok('...and restates none of her conditions',
   !!adj && !/overdue|complaint|day 14|caregiver change/i.test(adjLogic));
ok('V1 still computes At Risk exactly as she wrote it',
   /if\(late\.length>1\)atRisk\.push/.test(V1) &&
   /if\(ses\.complaint\)atRisk\.push/.test(V1) &&
   /if\(cgChanges>1\)atRisk\.push/.test(V1));

/* ── 2. evidence stands on its own ───────────────────────────────────── */
const ev = (OB.match(/function s30Evidence\(c\)\{[\s\S]*?\n\}/) || [''])[0];
/* Narrowed on 26 Nov to caregiver churn alone. The exception FEED counts
   exceptions without saying which kind, and her At Risk condition wants a
   Client Complaint specifically, so claiming one from a bare count would be
   inventing it. The count still raises Watch through her own rule. */
ok('evidence is caregiver churn, counted as she wrote it',
   /f\.cgChanges!==null&&f\.cgChanges>1/.test(ev));
ok('...and does not depend on anybody ticking anything',
   !/started|pr\.done|s60/.test(ev));
/* Evidence keeps a client At Risk whatever the checklist looks like, and so
   does her observable overdue count and her missed day 14 visit. */
ok('...and it keeps the client At Risk',
   /if\(s30Evidence\(c\)\|\|late>1\|\|s30D14Missed\(k\)\)\{/.test(adj));
/* And "started" now means the checklist can be READ, not that somebody
   typed: where the record shows an assessment and three weeks of family
   contact, an item still outstanding really is outstanding. */
ok('...and a checklist with derived evidence counts as started',
   /const started=pr\.started\|\|derived>0;/.test(adj));
/* The day 14 visit is NOT evidence: it is a checklist item, so a missed one
   is the same silence wearing a different hat. */
ok('the day 14 milestone is not treated as evidence', !/visit2/.test(ev));

/* ── 3. only the count on an untouched checklist is downgraded ───────── */
ok('only At Risk and Watch are ever adjusted',
   /if\(k\.state!=='atrisk'&&k\.state!=='watch'\)return out;/.test(adj));
ok('...and the downgrade is a state of its own, not On Track',
   /state:'notstarted'/.test(adj) && !/state:'ontrack'/.test(adj));
ok('...that says what it actually means',
   /nothing has been recorded rather than nothing has been done/.test(OB));
ok('...and is named on the board', /notstarted:'Not started'/.test(OB));
ok('...drawn as the quiet state, not a warning',
   /\.obb-st\.notstarted\{background:#F1EEE8;color:#8C857B;\}/.test(CSS) &&
   /notstarted: ''/.test(RD));

/* ── 4. the counts come from the right caseload ──────────────────────── */
/* s30Checklist calls get('s60') with no profile id, so it reads whoever is
   SIGNED IN. On a manager's page every other CSM's client came back 0 of 10. */
ok('V1 reads the signed-in profile\'s store', /const ms=\(get\('s60'\)\|\|\[\]\)\.filter/.test(V1));
const pr = (OB.match(/function s30Progress\(c,pid\)\{[\s\S]*?\n\}/) || [''])[0];
ok('the layer takes a profile id', /get\('s60',pid\)/.test(pr));
ok('...counts each milestone once, not each row', /hit\[r\.id\]=1;/.test(pr) &&
   /done:Object\.keys\(hit\)\.length/.test(pr));
ok('...only against real milestone ids', /ids\.indexOf\(r\.id\)>-1/.test(pr));
ok('...and the adjusted read reports what a person ticked separately',
   /ticked:pr\.done/.test(adj) && /derived:derived/.test(adj));
ok('the manager brief passes the client\'s own CSM',
   /s30Adjusted\(x\.c,x\.csm&&x\.csm\.id\)/.test(OB));

/* ── 5. everything that acts on the status reads the adjusted one ────── */
ok('the At Risk signal', /const k = s30Read\(c\);\n\s*return \(k && k\.state === 'atrisk'\) \? k : null;/.test(RD));
ok('the client page card', /const k = s30Read\(c\);\n\s*if \(!k \|\| k\.finished\) return '';/.test(RD));
ok('the onboarding board', /try\{ k=s30Adjusted\(c\); \}catch/.test(OB));
ok('and the Day 30 verdict', /try\{ k=s30Adjusted\(c\); \}catch\(e\)\{ return null; \}/.test(OB));
/* A checklist nobody started does not graduate: we do not know the thirty
   days went well, only that nothing was written down. */
ok('...so an unstarted checklist is extended, not graduated',
   /const grad=\(k\.state==='ontrack'\|\|k\.state==='done'\);/.test(OB));
ok('...and the summary says so in words',
   /with nothing logged on the checklist/.test(OB));
ok('nothing still reads the raw checklist to decide an alarm',
   !/s30Checklist\(c\) : null/.test(RD));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
