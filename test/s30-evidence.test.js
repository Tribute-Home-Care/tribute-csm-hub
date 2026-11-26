/* SUCCESS IN 30 READS THE EVIDENCE THE HUB ALREADY HOLDS.
 *
 * Measured on the live roster, 26 Nov: TEN milestone ticks in the whole
 * company against 30 clients inside their window. The checklist was not
 * being worked, so it measured nothing.
 *
 * But the Hub holds the evidence for six of the ten, in the places
 * Courtney's own "How the Hub knows" column points at:
 *
 *   asmt        viv.visits, type "Home Assessment"            10 of 30
 *   visit2      viv.visits, type "Home Visit", after SOC        4 of 30
 *   fam_wk1..4  a family touchpoint inside that week      14 / 14 / 10 / 8
 *
 * And four of her six implemented conditions could never fire: the
 * exceptions store is empty everywhere, and viv.visits carries no caregiver
 * field, so _s30Exceptions and _s30CaregiverChanges answered all-false and 0
 * for all 240 clients. Both counts are in fillEvidence.serviceEvents.
 *
 *   node test/s30-evidence.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const OB = strip(fs.readFileSync(path.join(PROTO, 'v2-onboarding.js'), 'utf8'));
const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

/* ── 1. the evidence, from where her document says to look ───────────── */
const der = (OB.match(/function s30Derived\(c,pid\)\{[\s\S]*?\n\}/) || [''])[0];
ok('there is a derived read', !!der);
ok('the assessment comes off the CSM visit feed', /\/assessment\/i\.test\(String\(v\.type\|\|''\)\)/.test(der));
ok('the second visit is a Home Visit dated after start of care',
   /\/home visit\/i\.test\(String\(v\.type\|\|''\)\)&&\s*String\(v\.day\)\.slice\(0,10\)>soc/.test(der));
ok('the weekly family contacts come off the contact log, in her due weeks',
   /\[\[1,7,'fam_wk1'\],\[8,14,'fam_wk2'\],\[15,21,'fam_wk3'\],\[22,30,'fam_wk4'\]\]/.test(der));
ok('...matching only family contact types',
   /const S30_FAM_TP = \/\^\(Family Email\|Family Phone Call\|Text Follow-Up\|Virtual Meeting\)\$\/i;/.test(OB));
ok('...and the earliest one in the week, not the latest', /const first=\(rows,key\)=>/.test(der));

/* ── 2. a derived milestone is not a tick ────────────────────────────── */
/* Saving one would be the Hub forging a CSM's signature on work it only
   inferred, and it would stop a later real tick from being the record. */
ok('nothing derived is written to a store', !/set\(/.test(der));
ok('...and it is handed over as EVIDENCE, not as a task somebody did',
   /type:'EVIDENCE'/.test(der) && /by:''/.test(der));
ok('the ticked count is still reported separately', /ticked:pr\.done/.test(OB));

/* ── 3. her rules are not restated ───────────────────────────────────── */
const wit = (OB.match(/function s30WithEvidence\(c,pid\)\{[\s\S]*?\n\}/) || [''])[0];
ok('s30Checklist still decides', /try\{ return s30Checklist\(c\); \}/.test(wit));
ok('...on readers swapped for one call only',
   /const realGet=window\.get, realEx=window\._s30Exceptions, realCg=window\._s30CaregiverChanges;/.test(wit));
ok('...and always put back, even on a throw',
   /finally\{ window\.get=realGet; window\._s30Exceptions=realEx; window\._s30CaregiverChanges=realCg; \}/.test(wit));
ok('...with only the s60 read widened', /return key==='s60' \? \(v\|\|\[\]\)\.concat\(extra\) : v;/.test(wit));

/* ── 4. the two dead conditions, and the one still blind ─────────────── */
ok('V1 reads an exceptions store', /get\('exceptions'\)/.test(V1));
ok('...and a caregiver field that the CSM visit feed does not carry',
   /if\(v\.caregiver\)names\.add/.test(V1));
const facts = (OB.match(/function s30Facts\(c\)\{[\s\S]*?\n\}/) || [''])[0];
ok('both counts are parsed from the sentence the feed already writes',
   /service exceptions\?/.test(facts) && /caregiver changes\?/.test(facts));
ok('...and a missing count is null, not zero', /se\?parseInt\(se\[1\],10\):null/.test(facts) &&
   /cg\?parseInt\(cg\[1\],10\):null/.test(facts));
/* The feed counts exceptions without saying which kind, so a Client
   Complaint cannot be claimed from it. Her At Risk condition stays unmet
   rather than guessed. */
ok('a complaint is never invented from a bare count',
   /complaint: !!base\.complaint/.test(OB) && /dissatisfaction: !!base\.dissatisfaction/.test(OB));

/* ── 5. only the items the Hub can see decide At Risk ────────────────── */
/* Four milestones have no feed, so they are permanently overdue on every
   client: four is two or more, which is At Risk forever. */
ok('the six with a feed are named',
   /const S30_OBSERVABLE = \{ asmt:1, visit2:1, fam_wk1:1, fam_wk2:1, fam_wk3:1, fam_wk4:1 \};/.test(OB));
ok('...and the overdue count is taken over those',
   /S30_OBSERVABLE\[i\.id\]&&!i\.done&&i\.overdue/.test(OB));
ok('her three triggers, on what can be asked',
   /if\(s30Evidence\(c\)\|\|late>1\|\|s30D14Missed\(k\)\)\{/.test(OB));
ok('...caregiver churn needing two or more, as she wrote it',
   /f\.cgChanges!==null&&f\.cgChanges>1/.test(OB));
/* The four without a feed still SHOW as outstanding, because they are. */
ok('the unseeable four are not hidden from the checklist',
   !/S30_MILESTONES\s*=\s*S30_MILESTONES\.filter/.test(OB));
ok('...and the quiet state says what is left to tick',
   /only a tick can record those/.test(OB));

/* ── 6. the reason names what fired ──────────────────────────────────── */
/* s30Checklist counts all ten, so a client kept At Risk by a missed day 14
   visit read "5 items overdue" -- four of which the decision ignored. */
ok('caregiver churn is named as itself',
   /f\.cgChanges\+' caregiver changes in the first 30 days'/.test(OB));
ok('a missed day 14 visit is named as itself',
   /'the day 14 visit was missed'/.test(OB));
ok('...and the count says which items it counted',
   /late\+' of the items the Hub can check are overdue'/.test(OB));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
