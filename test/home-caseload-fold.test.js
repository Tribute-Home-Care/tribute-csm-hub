// Caseload health, folded to one line at the bottom of Home.
//
// Courtney, 17 Nov: "Caseload health is manager information. CSMs don't need
// tier mix and touch counts every morning. That belongs on Team Overview or
// the KPI Tracker." Her layout: one line at the bottom, closed by default.
//
// It is folded rather than deleted. She said CSMs do not need it each morning,
// not that nobody needs it. Folding also retires two of the three disagreeing
// numbers she found, because High touch and the 30-day touch count were only
// ever confusing standing next to High Need and the compliance figure.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

ok('Home reads attention, today, your work, then caseload health last',
   /sAttn\.after\(sNext\); sNext\.after\(sTools\); sTools\.after\(sCase\);/.test(CODE));
ok('caseload health is the folding one', /sCase\.classList\.add\('rd-sec-fold'\);/.test(CODE));
ok('it is closed on arrival', /caseH\.setAttribute\('aria-expanded', 'false'\);/.test(CODE) &&
   /\.rd-sec-fold:not\(\[data-open\]\) > \*:not\(\.rd-sec-h\) \{ display: none; \}/.test(CSS));
ok('nothing but the heading shows while it is closed',
   /:not\(\[data-open\]\) > \*:not\(\.rd-sec-h\)/.test(CSS));

// A heading that hides things without looking like it does is worse than no
// fold, so it says what is inside and shows a caret.
ok('it says what is inside', /Tier mix, touch counts and visit compliance/.test(CODE));
ok('and shows that it opens', /rd-fold-car/.test(CODE) && /\.rd-sec-fold\[data-open\][\s\S]{0,80}rotate\(90deg\)/.test(CSS));

// Reachable without a mouse.
ok('it is a button to a screen reader', /caseH\.setAttribute\('role', 'button'\)/.test(CODE));
ok('it is focusable', /caseH\.setAttribute\('tabindex', '0'\)/.test(CODE));
ok('Enter and Space open it', /ev\.key === 'Enter' \|\| ev\.key === ' '/.test(CODE));
ok('aria-expanded tracks the state, not just the class',
   /caseH\.setAttribute\('aria-expanded', open \? 'false' : 'true'\)/.test(CODE));
ok('there is a visible focus ring', /\.rd-sec-fold > \.rd-sec-h:focus-visible/.test(CSS));

// Behavioural: the toggle has to be symmetric, which an early version of this
// pattern often is not.
let openState = false;
const toggle = () => { openState = !openState; return openState; };
ok('it opens then closes rather than opening twice',
   toggle() === true && toggle() === false && toggle() === true);

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
