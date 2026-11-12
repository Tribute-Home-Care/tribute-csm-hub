// A visit can be logged on behalf of the CSM who did it (CSM AI, 2026-11-12).
// The visit lands in THAT CSM's log, Viv books it to them, and the person
// who logged it is kept.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const CODE = fs.readFileSync(path.join(__dirname, rel), 'utf8');
  ok(label + ': the log-visit form has a Visit done by picker', /id="lp-by">\$\{_lpByOptions\(\)\}/.test(CODE));
  ok(label + ': Viv books the visit to the chosen CSM', /csmId:by,start:/.test(CODE));
  ok(label + ': nobody else\'s id is sent as the performer', !/csmId:P&&P\.id/.test(CODE));
  ok(label + ': a visit for someone else goes in their log', /DATA\.profiles\[by\]\.visits=vs/.test(CODE));
  ok(label + ': the logger is recorded', /rec\.loggedBy=P&&P\.id/.test(CODE));
  ok(label + ': an unknown id falls back to the signed-in CSM', /PROFILES\.some\(p=>p\.id===byEl\.value\)\)\?byEl\.value:\(P&&P\.id\)/.test(CODE));
}
console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
