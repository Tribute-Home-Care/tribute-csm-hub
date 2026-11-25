/* AT RISK AS A NEW-CLIENT SIGNAL, AND THE DOUBLE-COUNTING RULE.
 *
 * Onboarding, Offboarding & Success in 30, Part 4 ("For Andrew"):
 *   "Send At Risk clients into Client Pulse as a new-client signal, without
 *    double-counting SEs that Pulse already scores."
 *
 * Client Pulse Flagging Guidance, on where the double-count would happen:
 *   "Service exception volume and caregiver changes are already scored in
 *    Part A's banded Service Events field -- do not score them again here."
 *
 * s30Checklist has decided At Risk since the 21st and nothing outside the
 * Success in 30 board read the answer, so one client could be At Risk on the
 * board and Stable everywhere else on the same afternoon.
 *
 *   node test/s30-atrisk-signal.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
// Comments are stripped before every assertion: a rule stated in prose is not
// a rule the Hub follows, and this suite has twice pinned its own commentary.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

/* ── 1. the signal exists, and reads her rule rather than inventing one ── */
const risk = (CODE.match(/function s30Risk\(c\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('there is an s30Risk', !!risk);
/* Thirty days, or sixty where Day 30 extended the client to Success in 60.
   One window, asked rather than copied, so the board, the client card,
   Today's list and this signal cannot disagree about whether a client is
   still being watched. */
ok('...gated on the success window, not a hardcoded thirty',
   /inFirstDays\(c, s60Win\(c\)\)/.test(risk));
ok('...and that window is the onboarding module\'s answer, not a second copy',
   /typeof s60Window === 'function' \? s60Window\(c\) : 30/.test(CODE));
ok('...answered by s30Checklist, not by a second copy of her status rules',
   /s30Checklist\(c\)/.test(risk) && !/overdue|complaint|caregiver change/i.test(risk));
ok('...and only At Risk raises it', /k\.state === 'atrisk'/.test(risk));
ok('...a missing or throwing s30Checklist yields no signal, not a crash',
   /typeof s30Checklist === 'function'/.test(risk) && /catch \(e\) \{ return null; \}/.test(risk));

/* ── 2. one definition reaches every surface ───────────────────────────── */
const na = (CODE.match(/function needsAction\(c\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('Needs action reads the signal', /return !!s30Risk\(c\);/.test(na));
/* The tile, the sidebar badge, the Clients chip and Today's bucket are all
   derived from needsAction(c) over the CLIENT, so this one line moves all
   four together and they cannot report different numbers. */
ok('...and the Home buckets are still derived from needsAction, not from the row',
   /if \(needsAction\(c\)\) b\.push\('action'\);/.test(CODE));

/* ── 3. the Clients list says what the problem is ──────────────────────── */
ok('the Status cell has a third fallback', /const s3 = \(!ex && !ps\) \? s30RiskStatus\(c\) : null;/.test(CODE));
ok('...which prints a KIND, not a sentence',
   /text: 'At risk in first 30 days'/.test(CODE) &&
   /\(s3 \? s3\.text : ''\)/.test(CODE));
ok('...with her reason in the row title, where a long line cannot widen the column',
   /const tip = \(ps && ps\.note\) \? ps\.note : \(s3 \? s3\.note : ''\);/.test(CODE));
ok('...and the dead `st` binding is gone', !/const st = ex \|\| ps;/.test(CODE));

/* ── 4. Today's list leads with the reason ─────────────────────────────── */
const row = (CODE.match(/const risk = s30Risk\(c\);[\s\S]*?tone: risk \? 'bad'[\s\S]*?\}\);/) || [''])[0];
ok('the Success in 30 row asks the signal', !!row);
ok('...moves to Need action today when At Risk',
   /bucket: risk \? 'action' : 'onboarding'/.test(row));
ok('...keeps rank 2, her reading order, so Pulse flags still lead',
   /rank: 2, bucket: risk/.test(row));
ok('...names the state rather than the day count alone',
   /\(risk \? ' · At Risk' : ''\)/.test(row));
ok('...and says Success in 60 once the client has been extended',
   /\(win > 30 \? 'Success in 60' : 'Success in 30'\)/.test(row));
ok('...carries her own reason sentence', /risk \? \(risk\.why \|\| 'at risk'\)/.test(row));
ok('...and gives a different next step', /brief your manager/.test(row));

/* ── 5. THE DOUBLE-COUNTING RULE ───────────────────────────────────────── */
/* Nothing here may reach the Pulse score. The score is built server side; the
   three client-side readers of it are pulseFor, pulseLevel and pulseStatus,
   and none of them may consult the checklist. */
['pulseFor', 'pulseLevel', 'pulseStatus'].forEach(fn => {
  const body = (CODE.match(new RegExp('function ' + fn + '\\(c\\) \\{[\\s\\S]*?\\n  \\}')) || [''])[0];
  ok(fn + ' does not consult the Success in 30 checklist',
     !!body && !/s30/i.test(body));
});
/* And the other direction: one client with a red Pulse AND an At Risk
   checklist is ONE row, because the dedupe keeps one row per client and
   breaks an action-bucket tie by leaving the incumbent in place -- the Pulse
   flag, which sorted first at rank 0. */
ok('Today keeps one row per client', /const k = r\.cid \|\| \('name:' \+ r\.name\);/.test(CODE));
ok('...and a tie between two action rows keeps the one that sorted first',
   /if \(isAct\(r\) < isAct\(best\[k\]\)\)/.test(CODE));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
