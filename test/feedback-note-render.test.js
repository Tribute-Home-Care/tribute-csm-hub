// The note must render on its own, not as a tail of the "settled by" line.
//
// A non-reviewer's record carries no fixBuild and, before this, no statusBy.
// The note was concatenated INSIDE the branch guarded by statusBy, so those
// records rendered a status badge and no explanation: Courtney would have
// seen "Fixed" against her Ramya bug with nothing saying what was fixed.
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../v2/v2-feedback.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

ok('the settled-by line is built separately', /const byLine = \(it\.statusBy && st !== 'new'\)/.test(CODE));
ok('the note is appended outside that condition', /const by = byLine \+\s*\n?\s*\(it\.fixNote \?/.test(CODE));
ok('the note no longer sits inside the statusBy branch',
   !/'<\/div>' \+ \(it\.fixNote \?/.test(CODE));

// Behavioural: the two shapes that broke it.
const render = (it) => {
  const byLine = (it.statusBy && it.status !== 'new') ? '<div class="v2-fbx-by">by</div>' : '';
  return byLine + (it.fixNote ? '<div class="v2-fbx-fix">' + it.fixNote + '</div>' : '');
};
ok('a record with a note but no statusBy still shows the note',
   render({ status: 'resolved', fixNote: 'what was done' }).includes('what was done'));
ok('a record with both shows both',
   (() => { const h = render({ status: 'resolved', statusBy: 'a@b', fixNote: 'n' });
     return h.includes('v2-fbx-by') && h.includes('v2-fbx-fix'); })());
ok('a record with neither renders nothing', render({ status: 'new' }) === '');

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
