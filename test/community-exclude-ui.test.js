// The include/exclude list on a community's email settings.
//
// A Client Solutions Partner asked (2026-11-22) to leave a resident out of a
// community's weekly schedule while they are away for the winter. Viv has no
// signal for that, so it is a human decision held per community.
//
// Everyone is included unless somebody says otherwise. The default matters:
// a community that stops hearing about a resident who is still receiving care
// is the worse of the two mistakes.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const CODE = strip(fs.readFileSync(path.join(__dirname, rel), 'utf8'));
  ok(label + ': the panel is rendered into the settings card', /\$\{_ecWhoHtml\(clientsHere,e,today\)\}/.test(CODE));
  ok(label + ': the client list carries the Viv id the server keys on', /clientsHere\.push\(\{name:c\.name,vivId:c\.vivId\|\|'',csm:p\}\)/.test(CODE));
  ok(label + ': a client with no Viv id is shown as unpausable rather than silently missing',
     /not linked to Viv, so it cannot be paused/.test(CODE));
  ok(label + ': pausing writes an exclusion, re-including deletes it',
     /if\(included\) delete em\.exclude\[cid\]/.test(CODE));
  ok(label + ': an open-ended pause is labelled', /no end date/.test(CODE));
  ok(label + ': the draft is reloaded from the server, not filtered locally',
     /renderEmailCommDetail\(\);ecLoadDraft\(false\);/.test(CODE));
}

// Behavioural: the same expiry rule the server uses, as the panel applies it.
const today = '2026-11-22';
const live = (ex, cid) => { const r = ex[cid]; if (!r) return null; const u = String(r.until || '').slice(0, 10); return (u && u < today) ? null : { until: u }; };
ok('nobody is paused by default', live({}, 'c1') === null);
ok('an undated pause holds', !!live({ c1: { until: '' } }, 'c1'));
// A winter pause set in November ends the following spring, not the one just gone.
ok('a future date holds', !!live({ c1: { until: '2027-04-01' } }, 'c1'));
ok('last spring is not a future date', live({ c1: { until: '2026-04-01' } }, 'c1') === null);
ok('a past date lets them back in on its own', live({ c1: { until: '2026-11-21' } }, 'c1') === null);
ok('the last day still pauses', !!live({ c1: { until: '2026-11-22' } }, 'c1'));

// The settings save spreads over the previous email object, so a pause set by
// the toggle must not be wiped by someone pressing Save settings afterwards.
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const read = (SRC.match(/function _ecRead\(\)\{[\s\S]*?\n\}/) || [''])[0];
ok('Save settings does not rewrite the pause list', !/exclude/.test(read));
ok('...and the save spreads over what was already there', /d\.email=\{\.\.\.prev,\.\.\.e,/.test(SRC));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
