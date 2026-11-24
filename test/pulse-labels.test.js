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

/* ── the mapping, lifted and run ─────────────────────────────────────────
   THE LABEL DESCRIBES THE SENTENCE IT SITS ABOVE. The first cut derived it
   from the rule counts and that was wrong in a way worth keeping a record
   of: the counts are 45-day rule tallies, the headline is the AI's read of
   this week, and they answer different questions. Measured live, a client
   whose headline described an unreported skin injury carried safeCount 0,
   clinCount 0 and coverageCount 1 -- and so was labelled "Coverage at risk"
   directly above evidence of an injury nobody had passed on. A label that
   contradicts the sentence under it is worse than no label.

   EVERY SENTENCE BELOW IS INVENTED. The repository is public, so the
   fixtures are written to the SHAPE of a Pulse headline and carry no client,
   contact or caregiver who exists. */
const TBL = (CODE.match(/const PULSE_LABELS = \[[\s\S]*?\n  \];/) || [''])[0];
ok('the table is there to lift', !!TBL);
let PULSE_LABELS = [];
eval(TBL.replace(/^const PULSE_LABELS/, 'PULSE_LABELS'));
const EV = (CODE.match(/function pulseEvidence\(pp\) \{[\s\S]*?\n  \}/) || [''])[0];
const pulseEvidence = eval('(' + EV + ')');
const label = (pp) => {
  const ev = pulseEvidence(pp);
  for (const row of PULSE_LABELS) if (row[1] === null || row[1].test(ev)) return { label: row[0], owner: row[2], fallbackTell: row[3] };
  return null;
};
const hl = (h) => ({ headline: h, card: {} });

ok('a fall is Safety',
   label(hl('The client fell in the hallway on the 23rd, a second fall this week.')).label === 'Safety');
ok('...and so is bruising or a skin tear',
   label(hl('Visible bruising and shoulder swelling documented over the past week.')).label === 'Safety');
ok('a condition nobody passed on is Family not told',
   label(hl('The catheter has been leaking since the 19th with no record that the daughter was told.')).label === 'Family not told');
ok('...and the negation has to sit near the telling, not anywhere in the sentence',
   label(hl('Nothing has changed. The daughter was told on the 20th and is satisfied.')).label !== 'Family not told');
ok('a hospital admission that was passed on is Clinical',
   label(hl('The client was admitted to hospital with pneumonia; both contacts have been in touch.')).label === 'Clinical');
ok('caregivers leaving the case is Coverage at risk',
   label(hl('Two caregivers have asked to leave the case since the 17th.')).label === 'Coverage at risk');
ok('complaints alone are Reliability',
   label(hl('Four complaints were logged about cell phone use on the case.')).label === 'Reliability');
ok('a flag the words do not reach is still labelled',
   label(hl('The lead caregiver reported burnout and a disproportionate share of the hours.')).label === 'Needs a look');
/* Caught by the line above rather than by reading: `burn\w*` matched
   BURNOUT, so a flag about a caregiver carrying too many hours was reading
   as a safety incident. Stems are only as wide as the word they belong to. */
ok('...and caregiver burnout is not a burn',
   label(hl('Caregiver burnout on this case.')).label !== 'Safety');
ok('...while an actual burn still is',
   label(hl('The client burned a hand on the stove during the visit.')).label === 'Safety');
/* THE ORDER IS THE OPEN DECISION, and it is Courtney's. A fall nobody
   reported is both Safety and Family not told; safety leads because it is
   the more serious, but she may want the communication gap to lead, since
   that is the part a CSM can close today. Pinned here so a reorder is a
   decision somebody makes, not a diff nobody notices. */
ok('a fall nobody reported reads as Safety, not Family not told',
   label(hl('The caregiver found the client on the floor and there is no record that the son was told.')).label === 'Safety');
ok('...and Safety is listed before Family not told, which is what decides that',
   PULSE_LABELS.findIndex(r => r[0] === 'Safety') < PULSE_LABELS.findIndex(r => r[0] === 'Family not told'));
ok('the evidence read is the headline plus what the card documents',
   /\[h, card\.alreadyDone, card\.documented\]\.filter\(Boolean\)\.join\(' '\)/.test(CODE));
ok('...and a headline that arrives as an array of points is still read',
   pulseEvidence({ headline: ['a fall on the 23rd', 'nobody told'] }).indexOf('nobody told') > -1);
ok('every label resolves to one of her three owners',
   PULSE_LABELS.every(r => ['CSM', 'CSM + MCE', 'CSM + Scheduling Partner'].indexOf(r[2]) > -1));
ok('it says Scheduling Partner', /Scheduling Partner/.test(CODE) && !/CSM \+ Scheduler/.test(CODE));

/* ── owner comes from the card, not from the label ──────────────────────
   The Pulse already writes whoseCall. On the live feed it normalises onto
   her three phrases for 161 of 168 flags: a plain CSM 97, MCE forms 54,
   Scheduling forms 10, and 7 that say nothing. */
const OWN = (CODE.match(/function pulseOwner\(pp, lab\) \{[\s\S]*?\n  \}/) || [''])[0];
const pulseOwner = eval('(' + OWN + ')');
const card = (w) => ({ card: { whoseCall: w } });
ok('a plain CSM call is the CSM', pulseOwner(card('CSM'), {}) === 'CSM');
ok('MCE anywhere in the sentence brings the MCE in',
   pulseOwner(card('CSM to call the contacts about the falls; MCE to review the care plan'), {}) === 'CSM + MCE');
ok('so does a scheduling sentence',
   pulseOwner(card('CSM and Scheduling'), {}) === 'CSM + Scheduling Partner');
ok('...and MCE wins when the sentence names both',
   pulseOwner(card('MCE for coaching. Scheduling for the hours.'), {}) === 'CSM + MCE');
ok('a card that says nothing falls back to the owner the label implies',
   pulseOwner(card(''), { owner: 'CSM + MCE' }) === 'CSM + MCE');
/* "office" is not one of her three, and must not be read as Scheduling. */
ok('an owner outside her three is not forced into Scheduling',
   pulseOwner(card('CSM and office'), {}) === 'CSM');

/* ── who needs to know ───────────────────────────────────────────────────
   The card writes a sentence naming the people to reach. notifyContact,
   which the first cut used, holds a fragment -- a name, a number and a
   dangling ampersand -- and read as a broken field in a column. */
const TELL = (CODE.match(/function pulseTell\(pp, lab\) \{[\s\S]*?\n  \}/) || [''])[0];
const pulseTell = eval('(' + TELL + ')');
ok('the card’s own sentence is used',
   pulseTell({ card: { whoNeedsToKnow: 'The daughter and the care manager, per the client card.' } }, {}) ===
   'The daughter and the care manager, per the client card.');
ok('...and where the card is silent, the notify fields are tidied',
   pulseTell({ notifyContact: 'Front desk &' }, {}) === 'Front desk');
ok('a duplicate across both notify fields is said once',
   pulseTell({ notifyContact: 'Daughter,', notifySchedule: 'Daughter, GCM' }, {}) === 'Daughter, GCM');
ok('a flag with nobody named at all falls back to the label’s audience',
   pulseTell({}, { fallbackTell: 'Family, MCE' }) === 'Family, MCE');

/* ── "FAMILY NOT TOLD" IS NOT DERIVED FROM THE NOTIFY FIELD ─────────────
   notifyContact holds WHO to tell, not whether they were told. Firing her
   label on a populated notifyContact would have labelled 119 of 168 flagged
   clients "Family not told" -- 71%, which tells a CSM nothing. */
ok('the label is not read off the notify field',
   !/notifyContact[\s\S]{0,40}Family not told/.test(CODE));

/* ── the columns and the sort buttons ────────────────────────────────────── */
ok('the table has her two new headings',
   /<th scope="col">Who needs to know<\/th><th scope="col" class="rd-td-own">Owner<\/th>/.test(CODE));
/* Six columns do not fit Home's left column below about 1500px: the rail is
   a fixed 320px, so the list gets roughly 720 and the two new columns were
   squeezed to 74px each with the table overflowing its own card. Above that
   the Owner is its own column, as she draws it; below it the owner moves
   into the Who needs to know cell rather than being dropped. */
ok('...and the Owner column folds into the audience cell where there is no room',
   /rd-td-ow rd-td-ow-in/.test(CODE) &&
   /@media \(max-width: 1499px\) \{[\s\S]{0,160}\.rd-td-t \.rd-td-own \{ display: none; \}/.test(CSS) &&
   /\.rd-td-ow-in \{ display: none;/.test(CSS));
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
