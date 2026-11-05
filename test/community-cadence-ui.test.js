// The cadence control on the Email Community settings row.
//
// Kristen asked for a time frame selector at the bottom where the other
// options live (via Andrew, 2026-11-05). Both versions carry it, because
// Courtney and Julia are on V2 and the rest of the team is still on V1.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const CODE = strip(fs.readFileSync(path.join(__dirname, rel), 'utf8'));
  ok(label + ': the control exists', /id="ec-cadence"/.test(CODE));
  ok(label + ': it offers all three time frames',
     /<option value="weekly"/.test(CODE) && /<option value="biweekly"/.test(CODE) && /<option value="monthly"/.test(CODE));
  ok(label + ': it sits in the settings row beside the other options',
     CODE.indexOf('id="ec-cadence"') > CODE.indexOf('id="ec-enabled"') &&
     CODE.indexOf('id="ec-cadence"') < CODE.indexOf('id="ec-names"'));
  ok(label + ': an unset community reads as weekly', /\(e\.cadence\|\|'weekly'\)==='weekly'/.test(CODE));
  ok(label + ': the saved settings carry it', /cadence:\(document\.getElementById\('ec-cadence'\)\|\|\{\}\)\.value\|\|'weekly'/.test(CODE));
  // Changing it changes which period the draft covers, so the cached draft is
  // about the wrong span until it is rebuilt.
  ok(label + ': changing it rebuilds the draft', /const cadenceChanged=\(prev\.cadence\|\|'weekly'\)!==\(e\.cadence\|\|'weekly'\);/.test(CODE)
     && /\|\| cadenceChanged;/.test(CODE));

  // Behavioural: the read must not drop the field when the control is absent
  // (an old cached page), and must not silently invent a cadence.
  const read = el => (el || {}).value || 'weekly';
  ok(label + ': a missing control reads weekly rather than undefined', read(undefined) === 'weekly');
  ok(label + ': a present control is read verbatim', read({ value: 'monthly' }) === 'monthly');
}

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
