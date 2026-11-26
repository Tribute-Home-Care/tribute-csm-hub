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
const RD = strip(fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8'));
const CSSRD = fs.readFileSync(path.join(PROTO, 'redesign.css'), 'utf8');

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
/* CORRECTED 26 NOV. The exceptions were never missing: they are in the Pulse
   payload, _PULSE.byCid[vivId].incidents, 646 rows each carrying a `types`
   array with the full 38-type taxonomy. I checked the Hub's own empty
   `exceptions` store and concluded the data did not exist. */
const facts = (OB.match(/function s30Facts\(c\)\{[\s\S]*?\n\}/) || [''])[0];
const incs = (OB.match(/function s30Incidents\(c\)\{[\s\S]*?\n\}/) || [''])[0];
ok('exceptions are read from the Pulse payload', /_PULSE\.byCid\[c\.vivId\]/.test(incs));
ok('...windowed to the client\'s own first 30 or 60 days, by the incident date',
   /const end=_obPlus\(soc,60\)/.test(incs) && /d>=soc&&\(!end\|\|d<=end\)/.test(incs));
ok('...and a client with no Pulse record yields none, not a crash',
   /if\(!c\.vivId\|\|typeof _PULSE==='undefined'/.test(incs));
/* Caregiver changes stay with the fillEvidence sentence: it is computed
   server-side with added/removed semantics, and counting distinct names off
   weeklyCgNames calls a five-person rotating team four changes. */
ok('caregiver changes still come from the sentence, which has added/removed semantics',
   /caregiver changes\?/.test(facts) && /cg\?parseInt\(cg\[1\],10\):null/.test(facts));
/* Her complaint condition can fire at last, off the type rather than a count. */
ok('a complaint is read from the type, not invented from a count',
   /const S30_COMPLAINT = \/\^Client Complaint\/i;/.test(OB) &&
   /complaint: !!base\.complaint\|\|f\.complaints>0/.test(OB));
ok('...and dissatisfaction is still left alone, not being a type at all',
   /dissatisfaction: !!base\.dissatisfaction/.test(OB));
/* "No complaint:" types are 444 of the 646 rows and do not raise a Watch. */
ok('the taxonomy\'s own non-complaints do not raise a Watch',
   /const S30_NOT_A_COMPLAINT = \/\^No complaint:\/i;/.test(OB) &&
   /const real=inc\.filter\(x=>!S30_NOT_A_COMPLAINT\.test\(T\(x\)\)\);/.test(OB));

/* ── 10. call-outs, which are typed after all ────────────────────────── */
ok('call-outs are read from the type', /const S30_CALLOUT = \/call \?out\/i;/.test(OB));
ok('...and preventability is what triggers',
   /const S30_CALLOUT_PREVENTABLE = \/preventable call \?out\/i;/.test(OB) &&
   /f\.callOutsPreventable>=S30_CALLOUT_ATRISK/.test(OB));
ok('...one is a Watch and two or more is At Risk, like her caregiver rule',
   /const S30_CALLOUT_WATCH = 1, S30_CALLOUT_ATRISK = 2;/.test(OB));
/* A caregiver whose car broke down is not evidence about the client, so the
   non-preventable ones are counted and shown and do not move the status. */
ok('...and a non-preventable call-out is counted but does not move the status',
   /callOuts:f\.callOuts/.test(OB));

/* ── 11. visit notes, which were there too ───────────────────────────── */
ok('visit notes are read from the Pulse payload',
   /pc\.visitNotes/.test(OB) && /function s30NewestVisitNote\(c\)\{/.test(OB));
ok('...reporting no note at all separately from a stale one',
   /No visit note on record for this client\./.test(OB) &&
   /The last visit note is '\+age\+' days old\./.test(OB));
ok('...against a named staleness bar', /const S30_NOTE_STALE = 7;/.test(OB));

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

/* ── 7. unfilled visits, and the call-out we cannot see ──────────────── */
/* Part 4: "Turn caregiver changes, call-outs, and open visits in the first
   30 days into Watch or At Risk triggers." */
ok('the thresholds are named, so they can be moved in one place',
   /const S30_OPEN_WATCH = 1, S30_OPEN_ATRISK = 3;/.test(OB));
const ov = (OB.match(/function s30OpenVisits\(c,pid\)\{[\s\S]*?\n\}/) || [''])[0];
ok('open visits are counted from the client\'s own feed, inside the window',
   /vivOpenVisits/.test(ov) && /d>=soc/.test(ov));
const sch = (OB.match(/function s30WithSchedule\(c,pid,k\)\{[\s\S]*?\n\}/) || [''])[0];
ok('three or more unfilled visits is At Risk', /open>=S30_OPEN_ATRISK&&k\.state!=='atrisk'/.test(sch));
ok('one is a Watch, and only on a client who was otherwise fine',
   /open>=S30_OPEN_WATCH&&\(k\.state==='ontrack'\|\|k\.state==='done'\)/.test(sch));
ok('...naming the count rather than saying "unfilled visits" vaguely',
   /why:open\+' unfilled visits in the first 30 days'/.test(sch));
/* The schedule is the one thing that can raise the status, so it runs last,
   and a status it raised is not the checklist's to take back. */
ok('the schedule can only raise, never lower',
   /if\(out\.state!==k\.state\)return out;/.test(OB));
/* AN UNFILLED VISIT STILL DOES NOT SAY WHY. Call-outs are now read from the
   incident type instead, which does, so the two are separate signals rather
   than one inferred from the other. */
ok('an unfilled visit is not read as a call-out',
   !/open[\s\S]{0,60}call ?out/i.test((OB.match(/function s30WithSchedule[\s\S]*?\n\}/)||[''])[0]
     .split('const open=')[1] || ''));
/* THREE came off, and the third is the one I was most wrong about. The
   per-visit note figure is NOT unanswerable: the API already runs a grouped
   visitAudit query returning queries.tasks summed per client-day, and the
   LTC packet check has counted blank note prompts for months. So the list
   says "one API change away", not "cannot". */
ok('the missing list distinguishes unwired from unknowable',
   /one API change away rather than unavailable/.test(OB) &&
   /whether a client dissatisfaction exception is open/.test(OB) &&
   !/which kind of service exception was raised/.test(OB));

/* ── 8. the one condition made answerable ────────────────────────────── */
/* "The family has asked to remove a caregiver" is the At Risk condition
   nothing in Viv records. Two rounds said so on the card. Saying so is
   honest; leaving it unanswerable forever is not. */
ok('the card asks the question', /Has the family asked to remove a caregiver\?/.test(RD));
ok('...once answered Yes, it says so rather than asking again',
   /The family has asked to remove a caregiver\. /.test(RD));
ok('...and the answer is kept in the shared document, like a discharge approval',
   /DATA\.shared\.s30FamilyRemove/.test(OB));
ok('...with who answered and when', /by:\(P&&P\.name\)\|\|'',at:new Date\(\)\.toISOString\(\)/.test(OB));
/* Unanswered is NOT No. */
ok('an unanswered question is null, not a No',
   /function s30FamilyAsk\(cid\)\{ const r=s30FamilyAsks\(\)\[cid\]; return r\?r\.answer:null; \}/.test(OB));
ok('...and only a Yes raises the client', /if\(s30FamilyAsk\(c\.id\)==='yes'\)return true;/.test(OB));
ok('...named first in the reason, being the most serious of the three',
   /s30FamilyAsk\(c\.id\)==='yes' \? 'the family has asked to remove a caregiver'/.test(OB));
/* Listed by its data attribute, not its handler name: this layer binds with
   addEventListener, and RO_SAVE only selects onclick attributes. */
ok('...and it is a write, so read-only knows about it',
   /\['data-s30ask', 'answer the caregiver question'\]/.test(RD));
ok('...and it is no longer listed as something the Hub cannot see',
   !/whether the family has asked to remove a caregiver/.test(OB));

/* ── 9. documentation gaps, stated and not scored ────────────────────── */
/* Part 4: "point out documentation gaps neutrally, without blaming anyone." */
const gaps = (OB.match(/function s30DocGaps\(c\)\{[\s\S]*?\n\}/) || [''])[0];
ok('there is a gaps read', !!gaps);
ok('...using the care plan edit count that is really on the record',
   /c\.carePlanEdits30===0/.test(gaps) && /d>7/.test(gaps));
ok('...worded without blaming anyone', !/you |your |failed|missed|should have/i.test(gaps));
/* They are a line on the card and nothing else: they do not move the status
   and they do not reach Needs action. */
ok('a gap does not move the status',
   !/s30DocGaps/.test(OB.slice(OB.indexOf('function s30Adjusted'))));
ok('...and is drawn as the quiet line it is', /\.rd-s30-gap \{/.test(CSSRD));
/* The other half she describes cannot be measured: the Hub's visit log is
   synced from the same Viv feed as the CSM visit list, so comparing them is
   one list against itself. It is listed as unseeable instead. */
/* The staleness half is built from the payload the Hub already loads. The
   per-visit half is a plumbing job, and the card says which it is rather
   than implying nobody could know. */
ok('the per-visit figure is described as unwired, not unknowable',
   /which particular visits are missing a note/.test(OB) &&
   /one API change away/.test(OB));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
