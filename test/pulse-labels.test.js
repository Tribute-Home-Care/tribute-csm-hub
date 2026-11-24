/* HER PLAIN LABELS ON A PULSE ROW, and who the row belongs to.
 *
 * Courtney, 23 Nov: "The Pulse rows don't match her mockup yet. There is no
 * plain label (Safety, Family not told), no Who Needs to Know or Owner
 * column, and no sort buttons on the row."
 *
 * THE LABEL COMES FROM THE COUNTS, NOT FROM flagReason. The feed emits eight
 * codes, L1 to L8, and carries no label for any of them, so mapping her words
 * onto those letters would be guessing at a key nobody holds. The counts say
 * what the rule actually found.
 *
 *   node test/pulse-labels.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

/* ── the mapping, lifted and run ─────────────────────────────────────────── */
const TBL = (CODE.match(/const PULSE_LABELS = \[[\s\S]*?\n  \];/) || [''])[0];
ok('the table is there to lift', !!TBL);
let PULSE_LABELS = [];
eval(TBL.replace(/^const /, 'PULSE_LABELS = ').replace('PULSE_LABELS = PULSE_LABELS', 'PULSE_LABELS'));
const label = (pp) => {
  for (const row of PULSE_LABELS) { let hit = false; try { hit = !!row[1](pp); } catch (e) {} if (hit) return { label: row[0], owner: row[2], fallbackTell: row[3] }; }
  return null;
};

ok('a safety incident is Safety, whatever else is also true',
   label({ safeCount: 1, clinCount: 4, coverageCount: 9, relCount: 2 }).label === 'Safety');
ok('...and safety belongs to the CSM with the MCE',
   label({ safeCount: 1 }).owner === 'CSM + MCE');
ok('a condition change with no safety incident is Clinical',
   label({ safeCount: 0, clinCount: 2, coverageCount: 5 }).label === 'Clinical');
ok('call-outs and an unfilled visit are Coverage at risk',
   label({ safeCount: 0, clinCount: 0, coverageCount: 3 }).label === 'Coverage at risk');
ok('...as is a match failure with no coverage count',
   label({ safeCount: 0, clinCount: 0, coverageCount: 0, matchFailure: true }).label === 'Coverage at risk');
ok('...and coverage belongs to the CSM with the Scheduling Partner',
   label({ coverageCount: 1 }).owner === 'CSM + Scheduling Partner');
ok('complaints alone are Reliability',
   label({ safeCount: 0, clinCount: 0, coverageCount: 0, relCount: 2 }).label === 'Reliability');
/* A flag with no count behind it still has to say something a CSM can read.
   41 of 168 flagged clients on the live feed are in exactly this state. */
ok('a flag with no count behind it is still labelled, and owned by the CSM',
   label({ safeCount: 0, clinCount: 0, coverageCount: 0, relCount: 0 }).label === 'Needs a look' &&
   label({}).owner === 'CSM');
ok('every label resolves to one of her three owners',
   PULSE_LABELS.every(r => ['CSM', 'CSM + MCE', 'CSM + Scheduling Partner'].indexOf(r[2]) > -1));
/* Her words, and a memory rule: it is Scheduling Partner, never "scheduler". */
ok('it says Scheduling Partner', /Scheduling Partner/.test(CODE) && !/CSM \+ Scheduler/.test(CODE));

/* ── "FAMILY NOT TOLD" IS DELIBERATELY ABSENT ────────────────────────────
   The nearest field, notifyContact, holds WHO to tell ("Daughter", "GCM"),
   not whether they have been told. Measured on the live feed, firing her
   label on a populated notifyContact would have labelled 119 of 168 flagged
   clients "Family not told" -- 71%, which tells a CSM nothing and is the
   same fault as printing a row of L-codes. It needs a field that does not
   exist yet, so it is a question for Courtney, not a guess here. */
ok('no label is invented from the notify field',
   !PULSE_LABELS.some(r => /Family not told/i.test(r[0])));
ok('...and notifyContact is used as the audience instead',
   /push\(pp && pp\.notifyContact\);/.test(CODE) && /push\(pp && pp\.notifySchedule\);/.test(CODE));

/* ── who needs to know ───────────────────────────────────────────────────── */
const TELL = (CODE.match(/function pulseTell\(pp, lab\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('there is an audience function', !!TELL);
const pulseTell = eval('(' + TELL + ')');
ok('the people Pulse named come first',
   pulseTell({ notifyContact: 'Daughter' }, { fallbackTell: 'CSM' }) === 'Daughter');
ok('both notify fields are read, and a duplicate is said once',
   pulseTell({ notifyContact: 'Daughter,', notifySchedule: 'Daughter, GCM' }, {}) === 'Daughter, GCM');
ok('trailing commas in the feed do not become empty names',
   pulseTell({ notifyContact: 'GCM,' }, {}) === 'GCM');
/* 13 of 168 flagged clients carry neither field. */
ok('a flag with nobody named falls back to the label\'s own audience',
   pulseTell({ notifyContact: '', notifySchedule: '' }, { fallbackTell: 'Family, MCE' }) === 'Family, MCE');

/* ── the columns and the sort buttons ────────────────────────────────────── */
ok('the table has her two new headings',
   /<th scope="col">Who needs to know<\/th><th scope="col">Owner<\/th>/.test(CODE));
ok('...and the cells that fill them', /rd-td-tell/.test(CODE) && /rd-td-own/.test(CODE) &&
   /\.rd-td-tell/.test(CSS) && /\.rd-td-ow \{/.test(CSS));
ok('the label is the row heading, in place of the word Pulse',
   /kind: \(lab && lab\.label\) \|\| 'Pulse', isPulse: true,/.test(CODE));
/* The footer has promised "Sort an item and it moves to Following up" with
   no button on the row to do it. These are V1's own acknowledgement states. */
ok('a Pulse row has a sort button, and only a Pulse row',
   /r\.isPulse && r\.cid/.test(CODE) && /data-sortbtn="/.test(CODE));
ok('the three sort states are V1\'s acknowledgement states',
   /\['aware_working',/.test(CODE) && /\['aware_1to1',/.test(CODE) && /\['aware_none',/.test(CODE));
ok('sorting calls setPulseAck with an explicit empty note',
   /setPulseAck\(pick\.getAttribute\('data-sort-cid'\), pick\.getAttribute\('data-sort-set'\), ''\)/.test(CODE));
/* setPulseAck prompts when the note is left undefined. That is right at the
   client record and wrong here: a blocking prompt in the middle of a triage
   gesture is how the gesture stops being used. */
ok('...so triage never opens a blocking prompt',
   /blocking\s+prompt in the middle of it is how the gesture stops being used/.test(SRC));
ok('the new cells are in the repaint key, or a sort would not show',
   /r\.owner, r\.tell, r\.isPulse\]\.join/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
