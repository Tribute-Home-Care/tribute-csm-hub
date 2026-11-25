/* WHICH COPY OF A FILE IS THE SOURCE.
 *
 * build-v2.py copies files in BOTH directions:
 *
 *   LAYER + the two stylesheets   prototype/  ->  v2/
 *   the v2-only modules           v2/         ->  prototype/
 *
 * Edit the wrong copy and the next build silently throws the work away. That
 * happened on 25 Nov: the Success in 30 week columns and the Viv locations
 * were written into v2/v2-onboarding.js and v2/v2-onboarding.css, both of
 * which are LAYER destinations, and the next build overwrote them from the
 * prototype. Every test still passed, because every test read v2/ -- the
 * destination -- and the commit carried nothing but a build stamp.
 *
 * So this asserts the thing no feature test can see: that the two copies of
 * every mirrored file are identical, and that no file is claimed by both
 * directions at once.
 *
 *   node test/build-file-direction.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const HUB = path.join(__dirname, '..');
const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const BUILD = fs.readFileSync(path.join(HUB, 'build-v2.py'), 'utf8');

/* Read the two lists out of the build script itself, so a file added to
   either one is covered the day it is added rather than the day somebody
   remembers to update this test. */
const layer = (BUILD.match(/LAYER = \[([\s\S]*?)\]/) || ['', ''])[1]
  .match(/'([^']+)'/g).map(s => s.slice(1, -1));
const toV2 = layer.concat(
  (BUILD.match(/for f in LAYER \+ \[([^\]]*)\]/) || ['', ''])[1]
    .match(/'([^']+)'/g).map(s => s.slice(1, -1)));
const toProto = (BUILD.match(/for f in \(([\s\S]*?)\):/) || ['', ''])[1]
  .match(/'([^']+)'/g).map(s => s.slice(1, -1));

ok('the prototype -> v2 list was found', toV2.length >= 8);
ok('the v2 -> prototype list was found', toProto.length >= 15);

/* A file in both lists would be copied twice in one build, and which copy
   won would depend on the order of two loops. */
const both = toV2.filter(f => toProto.indexOf(f) >= 0);
ok('no file is copied in both directions' + (both.length ? ' (both: ' + both.join(', ') + ')' : ''),
   both.length === 0);

const same = (f) => {
  const a = path.join(PROTO, f), b = path.join(HUB, 'v2', f);
  if (!fs.existsSync(a) || !fs.existsSync(b)) return 'missing';
  return fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
};

toV2.forEach(f => ok('prototype/' + f + ' is the source, and v2/ matches it', same(f) === true));
toProto.forEach(f => ok('v2/' + f + ' is the source, and the prototype matches it', same(f) === true));

/* The two specific things that were lost, asserted against the SOURCE copy.
   Reading v2/ here would re-create the exact blind spot above. */
const OB = fs.readFileSync(path.join(PROTO, 'v2-onboarding.js'), 'utf8');
const OBC = fs.readFileSync(path.join(PROTO, 'v2-onboarding.css'), 'utf8');
ok('the Success in 30 week columns live in the prototype', /cls: 'obb-s30'/.test(OB));
ok('...with the row that draws them', /const nd=r\.k\?_s30NextDue\(r\.k\):null;/.test(OB));
ok('...and the grid that lines them up', /\.obb-r\.obb-s30\{/.test(OBC));
ok('the Viv locations live in the prototype', (OB.match(/\bviv:'/g) || []).length === 10);
ok('...and are rendered under the task', /In Viv: \$\{escHtml\(i\.viv\)\}/.test(OB) && /\.ob-viv\{/.test(OBC));

/* The standing family password must never enter this repo: it is public and
   GitHub Pages serves it from main. The Viv app task's location column is
   safe; the TASK sentence beside it in the document is not. */
ok('no family password came across with them', !/Tribute\d{4}!/.test(OB));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
