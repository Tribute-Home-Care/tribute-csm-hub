// Filtering the LTC board to one state.
//
// Reported 2026-11-22 by the CSC who sends the Massachusetts packets: the
// Maryland tracker names the CSC on every record, so her counterpart's "Mine"
// works. The Massachusetts tracker names the individual CSM, so she appears
// on no row at all and "Mine" was empty for her.
//
// STATE IS MATCHED THROUGH THE MARKET MAP, NEVER AS A LITERAL. Records carry
// city-level markets, so comparing against "Massachusetts" matches nothing.
// That exact mistake broke the client tracker's market filter in October.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const SRC = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  ok(label + ': there are explicit state buttons', /id="ltc-f-ma"/.test(CODE) && /id="ltc-f-md"/.test(CODE));
  ok(label + ': state is resolved through the market map, not compared literally',
     /PULSE_MKT_STATE\[String\(v\|\|''\)\.trim\(\)\]/.test(CODE) && !/r\.market==='Massachusetts'/.test(CODE));
  ok(label + ': Mine still matches a row that names you', /const named=String\(r\.csm\|\|''\)\.toLowerCase\(\)===me;/.test(CODE));
  ok(label + ': Mine also covers your market if you run LTC there',
     /_ltcOwnsMarket\(\)&&myState&&_ltcStateOf\(r\.market\)===myState/.test(CODE));
  ok(label + ': the active filter is visible', /ltc-f-'\+k/.test(CODE) && /_ltcFilter===k\?' btn-p'/.test(CODE));
}

// Behavioural, against the real map lifted from the page.
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const MAP = eval('(' + (SRC.match(/const PULSE_MKT_STATE=(\{[^}]*\})/) || [])[1] + ')');
const st = v => MAP[String(v || '').trim()] || '';
ok('a city-level MA market resolves to MA', st('MetroWest Boston') === 'MA' && st('North of Boston') === 'MA');
ok('the state name itself still resolves', st('Massachusetts') === 'MA' && st('Maryland') === 'MD');
ok('MD cities resolve to MD', st('Baltimore') === 'MD' && st('Annapolis') === 'MD' && st('Bethesda') === 'MD');
ok('MA and MD never collide', st('Boston') !== st('Baltimore'));
ok('an unknown market resolves to nothing rather than guessing', st('Nowhere') === '' && st('') === '');

// The CSC who prompted this: market set, flagged as the LTC owner for it.
const prof = (SRC.match(/\{id:'sam',[^}]*\}/) || [''])[0];
ok('the MA LTC owner carries a market the map understands', st((prof.match(/market:'([^']+)'/) || [])[1]) === 'MA');
ok('...and is flagged as running LTC there', /ltcPrimary:true/.test(prof));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
