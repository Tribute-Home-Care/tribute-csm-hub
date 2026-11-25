/* THE ESCALATION PATHS, WIRED TO WHO HANDLES WHAT.
 *
 * Courtney, 17 Nov, section 9: "Add the escalation paths to Pulse's sources
 * so 'whose call' matches who handles it now: MA and Chicago come to me,
 * Maryland goes to the Senior CSM."
 *
 * And the document, at the top: "Where the Playbook says 'Senior CSM,' this
 * document says 'your manager': the Director of Client Solutions for MA and
 * Chicago, or the Senior CSM for Maryland."
 *
 * Part 3, on At Risk: "The manager is briefed automatically."
 *
 * escalateTo() has decided this correctly since the 23rd and appeared on
 * exactly one surface: a red Pulse banner. Everywhere else the Hub said "your
 * manager", which is a category, not a person.
 *
 *   node test/escalation-paths.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const RD = strip(fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8'));
const OB = strip(fs.readFileSync(path.join(PROTO, 'v2-onboarding.js'), 'utf8'));
const CSS = fs.readFileSync(path.join(PROTO, 'redesign.css'), 'utf8');
const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

/* ── 1. her two routes, and only hers ─────────────────────────────────── */
const e = (RD.match(/function escalateTo\(c\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('Maryland goes to the Senior CSM', /if \(st === 'MD'\) return byRole\(\/\^Senior CSM\/i, 'MD'\);/.test(e));
ok('MA and Chicago come to the Director of Client Solutions',
   /if \(st === 'MA' \|\| st === 'IL'\) return byRole\(\/Director of Client Solutions\/i\);/.test(e));
ok('...and anywhere else gets no line rather than a wrong one', /\n\s*return null;\n  \}/.test(e));
/* Derived from PROFILES by ROLE. A typed-in name goes stale the day somebody
   changes job while the role stays true -- and a staff name hardcoded into
   the layer is a name in a public repo. */
ok('the route is read from the profiles, by role', /const byRole = function \(re, hub\)/.test(e));
const names = (RD.match(/'(Courtney|Jada|Chelsea|Rachel|Carrie|Jen) [A-Z]/g) || []);
ok('no person is named in the layer' + (names.length ? ' (found: ' + names.join(', ') + ')' : ''),
   names.length === 0);
/* And the roles the routes match are really in the roster, so neither route
   silently resolves to nothing. */
ok('a Director of Client Solutions exists to receive MA and Chicago',
   /role:'Director of Client Solutions'/.test(V1));
ok('...and a Senior CSM exists to receive Maryland',
   /role:'Senior CSM[^']*',[^}]*hub:'MD'/.test(V1));

/* ── 2. one rule, four surfaces ───────────────────────────────────────── */
ok('there is a short form for a line of text', /function escalateFirst\(c\) \{/.test(RD));
ok('...which falls back to the honest generic', /: 'your manager';/.test(RD));
ok('Today\'s At Risk step names them',
   /'Work the checklist and brief ' \+ escalateFirst\(c\)/.test(RD));
ok('the client page says who to take it to',
   /<span class="rd-s30-esc">Take this to ' \+ esc\(e\.name\)/.test(RD) && /\.rd-s30-esc \{/.test(CSS));
/* Only At Risk. A line telling a CSM who to escalate to on an On Track
   client is the same mistake as an alarm that is always on. */
ok('...and only on an At Risk client', /if \(k\.state !== 'atrisk'\) return '';/.test(RD));
ok('the onboarding module borrows the rule rather than copying it',
   /escalateTo: escalateTo,/.test(RD) && /escalateFirst: escalateFirst,/.test(RD) &&
   /TributeRedesign&&TributeRedesign\.escalateTo/.test(OB));
ok('...and keeps no route of its own',
   !/Director of Client Solutions/.test(OB) && !/Senior CSM/.test(OB));

/* ── 3. "the manager is briefed automatically" ────────────────────────── */
const b = (OB.match(/function s30AtRiskBrief\(\)\{[\s\S]*?\n\}/) || [''])[0];
ok('there is an At Risk brief', !!b);
ok('...covering the whole success window, not just thirty days',
   /const win=s60Window\(x\.c\);/.test(b) && /if\(d===null\|\|d>win\)return null;/.test(b));
ok('...carrying only At Risk clients', /if\(!k\|\|k\.state!=='atrisk'\)return null;/.test(b));
ok('...scoped by the escalation route, so a manager sees what is theirs to take',
   /mine:!to\|\|!me\|\|to\.name===me/.test(b) && /\.filter\(r=>r\.mine\)/.test(b));
ok('...oldest first, because a day 28 client has least time left',
   /\.sort\(\(a,b\)=>a\.d-b\.d\)/.test(b));
ok('...landing on the manager view', /<div class="ct">At Risk in the first \$\{/.test(OB));
ok('...above the Day 30 results, because it is the live one',
   OB.indexOf('At Risk in the first') < OB.indexOf('Day 30 results'));
ok('...using the checklist\'s own reason', /escHtml\(r\.k\.why\|\|'At risk'\)/.test(OB));
ok('...and the row opens the client', /onclick="openObClient\('\$\{r\.x\.c\.id\}'\)"/.test(OB));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
