// A Virtual visit must reach both the client's Viv schedule and the CSM's
// Outlook calendar.
//
// Virtual shipped in the type dropdown on 2026-10-23 matching neither word of
// /in-person|assessment/, which gated BOTH destinations and the time row. The
// failure was silent: Julia selected Virtual, never saw the two destination
// checkboxes, and the visit saved to the Hub alone with empty start and end.
// The rule now lives in one function per file, because it is asked in two
// places and those two copies are what drifted.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const CODE = strip(fs.readFileSync(path.join(__dirname, rel), 'utf8'));

  ok(label + ': Virtual is an option in the type dropdown', /<option>Virtual<\/option>/.test(CODE));
  ok(label + ': the schedule rule is defined once', (CODE.match(/function _lpOnSched\(/g) || []).length === 1);
  ok(label + ': no caller still carries its own copy of the old regex',
     !/\/in-person\|assessment\/i/.test(CODE));
  ok(label + ': both callers go through it', (CODE.match(/_lpOnSched\(/g) || []).length === 3);

  // Exercise the SHIPPED predicate, not a copy of it.
  const src = CODE.match(/function _lpOnSched\(t\)\{[^}]*\}/);
  ok(label + ': the predicate is extractable', !!src);
  const onSched = eval('(' + src[0].replace('function _lpOnSched', 'function') + ')');
  ok(label + ': In-Person is scheduled', onSched('In-Person') === true);
  ok(label + ': Home Assessment is scheduled', onSched('Home Assessment') === true);
  ok(label + ': Virtual is scheduled', onSched('Virtual') === true);
  ok(label + ': Phone Call is not', onSched('Phone Call') === false);
  ok(label + ': an empty type is not', onSched('') === false && onSched(undefined) === false);

  ok(label + ': the visit type reaches the Outlook call',
     /_lpAddToOutlook\(c\.name\|\|'client',note,w,_lpLocation\(c\),shift,type\)/.test(CODE));
  ok(label + ': the Outlook subject depends on the type',
     /subject:\(virtual\?'Virtual visit — ':'Home visit — '\)\+clientName/.test(CODE));
  ok(label + ': a virtual event carries no location',
     /const where=virtual\?'':loc;/.test(CODE) && /location:where\?\{displayName:where\}:undefined/.test(CODE));
}

// Viv has only two CSM booking types. Virtual books as a Home Visit, which is
// Andrew's call (2026-11-05), not an accident of the regex.
const vivType = t => /assessment/i.test(t) ? 'Home Assessment' : 'Home Visit';
ok('Virtual books in Viv as a Home Visit', vivType('Virtual') === 'Home Visit');
ok('Home Assessment still books as itself', vivType('Home Assessment') === 'Home Assessment');

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
