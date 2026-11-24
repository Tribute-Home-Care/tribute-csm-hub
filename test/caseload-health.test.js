/* CASELOAD HEALTH, in the V2 layer.
 *
 * Courtney questioned four numbers in this card and all four were fair:
 *
 *   "High need = 12 in Caseload health, but High touch = 6 one line down."
 *   "1730 touches in 30 days for one CSM isn't a number anyone can act on.
 *    It looks like every auto-logged email and call is being counted."
 *   "Visits this month says 0 of 22 due visits done right next to 60% visit
 *    compliance."
 *   "Caseload health is manager information."
 *
 * The first two were real faults in what the numbers counted. The third was
 * the month-start fault, fixed separately. The fourth is why it is collapsed.
 *
 *   node test/caseload-health.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const HUB = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

/* ── it is the layer's card now ───────────────────────────────────────── */
ok('the layer draws it', /function renderCaseloadHealth\(\)/.test(CODE) && /function caseloadHealth\(\)/.test(CODE));
/* V1 owns the element and repaints it on every updateHome, so the layer takes
   the function rather than racing it. Same pattern as the tracker and to-dos. */
ok('...by taking V1\'s function, not by racing its repaint',
   /function installCaseload\(\)/.test(CODE) &&
   /window\.renderHomeCaseload = wrapped;/.test(CODE) && /installCaseload\(\);/.test(CODE));
ok('...and falls back to V1 if it throws, rather than leaving the card blank',
   /caseload health failed; falling back/.test(CODE));

/* ── 1. two measures were wearing the same word ───────────────────────── */
/* High need is Pulse's judgement (trulyHighNeed). High touch was the TIER
   field. 12 beside 6 was not a contradiction, it was two different questions
   sharing an adjective. */
ok('the tier pills say tier, not touch',
   /'High tier'/.test(CODE) && /'Medium tier'/.test(CODE) && /'Low tier'/.test(CODE) &&
   !/'High touch'/.test(CODE));
ok('...and the card explains the difference when the two numbers differ',
   /h\.tiersSet && h\.highNeed !== h\.hi/.test(CODE) &&
   /what Pulse judges needs the most attention/.test(CODE));
ok('high need reads Pulse, and falls back to the tier only when Pulse has no view',
   /typeof pp\.trulyHighNeed !== 'undefined'/.test(CODE) &&
   /else if \(c\.tier === 'High'\) highNeed\+\+;/.test(CODE));

/* ── 2. the 1730 ──────────────────────────────────────────────────────── */
/* workloadFor counted every touchpoint row, and the Viv and email syncs write
   them with auto:true. What a CSM can act on is what a person logged. */
ok('touchpoints are split by who wrote them', /if \(t\.auto\) auto\+\+; else mine\+\+;/.test(CODE));
ok('...and the card counts the ones a person logged',
   /pill\(h\.mine, 'Touchpoints you logged'/.test(CODE));
ok('...and says how many were automatic rather than hiding them',
   /were logged automatically/.test(CODE) && /are not counted above/.test(CODE));

/* ── 3. one source for the two visit numbers ──────────────────────────── */
/* They disagreed because they were computed twice. Both come from
   visitCompliance() now, so they cannot drift apart again. */
ok('both visit figures come from visitCompliance()',
   /typeof visitCompliance === 'function' \? visitCompliance\(\) : null/.test(CODE));
/* visitCompliance() returns ARRAYS of clients -- {due, done, deferred, pct} --
   and not counts. Two faults followed, both caught by reading the live card
   rather than by any assertion here:
     - `h.vc.done + ' of ' + h.vc.due` printed
       "[object Object],[object Object]... of [object Object],..."
     - an empty array is TRUTHY, so `h.vc && h.vc.due` was always true and a
       month with nothing due would have shown 0%, which is precisely what
       the dash exists to prevent. */
ok('the arrays are counted, not concatenated',
   /const vcDue = h\.vc && h\.vc\.due \? h\.vc\.due\.length : 0;/.test(CODE) &&
   /const vcDone = h\.vc && h\.vc\.done \? h\.vc\.done\.length : 0;/.test(CODE) &&
   /notes\.push\(vcDone \+ ' of ' \+ vcDue \+ ' clients due a visit this month have had one\.'\);/.test(CODE));
ok('...and a month with nothing due shows a dash, not a hundred per cent',
   /const pct = vcDue \? h\.vc\.pct : null;/.test(CODE));
/* Behavioural, over the shapes visitCompliance actually returns. A regex over
   the source is what let the truthiness fault through in the first place. */
const pctOf = vc => {
  const vcDue = vc && vc.due ? vc.due.length : 0;
  return vcDue ? vc.pct : null;
};
const C = {}, D = {};
ok('a month with 5 of 27 done reads as a percentage',
   pctOf({ due: [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C], done: [D,D,D,D,D], pct: 19 }) === 19);
ok('a month with NOTHING due reads as a dash, not 0% and not 100%',
   pctOf({ due: [], done: [], pct: 0 }) === null);
ok('no visitCompliance at all also reads as a dash', pctOf(null) === null);
const joined = (vc) => (vc.done.length) + ' of ' + (vc.due.length);
ok('the sentence counts clients rather than stringifying them',
   joined({ due: [C,C,C], done: [D] }) === '1 of 3');

/* ── V1's four stat tiles come out ───────────────────────────────────── */
/* They sat beside this card inside the same section, saying "In Onboarding 3"
   where every other count on the page said 4 (the falsy-zero fault, still
   live in index.html), and "Visits This Month 15" directly above "5 of 27 due
   visits done" with nothing to say why those two do not reconcile. */
ok('V1 stat tiles are stood down', /const g4 = \$\('#rd-s-case \.g4'\);/.test(CODE) && /g4\.hidden = true;/.test(CODE));
ok('...and the card says all four itself',
   /pill\(h\.highNeed, 'High need, per Pulse'/.test(CODE) &&
   /pill\(h\.firstDays, 'In first 30 days'/.test(CODE) &&
   /pill\(h\.logged, 'Visits logged this month'/.test(CODE));
ok('...with first 30 days using the null-checked count, not the falsy one',
   /const firstDays = cl\.filter\(function \(c\) \{ return inFirstDays\(c, 30\); \}\)\.length;/.test(CODE));
/* The two visit numbers never reconcile: one counts visit RECORDS this month,
   the other counts CLIENTS whose cadence fell due this month and have had
   one. Sitting unlabelled next to each other, they read as a contradiction. */
ok('...and the card says why the two visit numbers differ',
   /counts visit records\. Visit compliance counts/.test(CODE));

/* ── 4. still manager information ─────────────────────────────────────── */
ok('it is still the folding section, closed on arrival',
   /sCase\.classList\.add\('rd-sec-fold'\);/.test(CODE) &&
   /\.rd-sec-fold:not\(\[data-open\]\) > \*:not\(\.rd-sec-h\) \{ display: none; \}/.test(CSS));
/* The two-column grid had higher specificity AND !important, so the stat
   cards rendered straight through the closed state. */
ok('...and the open-state grid cannot show through the closed state',
   /\.rd-sec-fold\[data-open\] > \.g4 \{/.test(CSS));
/* #rd-s-case .g4 { display: flex } further up carries an ID, so it outranked
   .rd-sec-fold:not([data-open]) > * and the stat cards rendered through a
   closed section: the card looked open on arrival however often it was shut.
   Same specificity, so the closed state has to say it with an ID too. */
ok('...and the closed state outranks the ID rule that was beating it',
   /#rd-s-case\.rd-sec-fold:not\(\[data-open\]\) > \.g4/.test(CSS) &&
   /#rd-s-case\.rd-sec-fold:not\(\[data-open\]\) > #home-caseload/.test(CSS));
ok('tier mix only appears once tiers are actually set',
   /const tiersSet = \[hi, med, lo\]\.filter/.test(CODE) && /if \(h\.tiersSet\) \{/.test(CODE));

/* V1 keeps its own renderer as the fallback, so index.html is unchanged. */
ok('index.html still has its own version, untouched',
   /function renderHomeCaseload\(\)\{/.test(HUB));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
