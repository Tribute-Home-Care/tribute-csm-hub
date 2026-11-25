/* HER QUESTION 5: "What is being counted in '1730 touches in 30 days'?"
 *
 * Courtney, 17 Nov: "1730 touches in 30 days for one CSM isn't a number
 * anyone can act on. It looks like every auto-logged email and call is being
 * counted."
 *
 * Traced: V1's workloadFor() sums every row in the touchpoints store for that
 * CSM's clients inside 30 days. Those rows are of two kinds -- one a person
 * entered through Log contact, and one per individual call, email or text the
 * comms sync matched to a client, written with auto:true. So the figure is
 * every communication, not every deliberate contact.
 *
 * Caseload health was split on 24 Nov. The manager view, which is the one
 * page where one CSM is read against another, was not.
 *
 *   node test/touches-labelled.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const SRC = fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

/* ── 1. the trace itself, asserted against V1 ─────────────────────────── */
/* If any of these three stop being true, the labels below are lying and this
   test should fail rather than the Hub quietly mislabelling a number. */
ok('workloadFor counts touchpoint rows inside thirty days',
   /const tps=get\('touchpoints',pid\)\.filter\(t=>t\.date&&t\.date>=cutoff\);/.test(V1));
ok('...every one of them, with no filter on how it got there',
   /byClient\[t\.clientId\]=\(byClient\[t\.clientId\]\|\|0\)\+1;/.test(V1) &&
   !/t\.auto/.test((V1.match(/function workloadFor\(pid\)\{[\s\S]*?\n\}/) || [''])[0]));
ok('...and an auto flag is what tells the two kinds apart', /t\.auto&&t\.afterHours/.test(V1));

/* ── 2. the manager view splits them ──────────────────────────────────── */
const sp = (CODE.match(/const tSplit = function \(pid\) \{[\s\S]*?\n    \};/) || [''])[0];
ok('the team row splits its touchpoints', !!sp);
ok('...on the same thirty-day cutoff, so the halves still add to the total',
   /const cut = localDay\(-30\);/.test(sp));
ok('...by who put the row there', /if \(t\.auto\) auto\+\+; else mine\+\+;/.test(sp));
ok('...counted once per row, not once per column', /const ts = tSplit\(p\.id\);/.test(CODE) &&
   /logged: ts\.mine, autoc: ts\.auto,/.test(CODE));

/* ── 3. and the columns say what they count ───────────────────────────── */
ok('the unexplained column is gone', !/\['touch', 'Touches 30d'\]/.test(CODE));
ok('...replaced by what a person did', /\['logged', 'Logged contacts 30d'\]/.test(CODE));
ok('...beside what the sync did', /\['autoc', 'Auto-captured 30d'\]/.test(CODE));
/* The auto figure is real, and hiding it would only move the question. */
ok('...on the CSP table too, which is their whole measure',
   /tbl\(csps, \[\['logged', 'Logged contacts 30d'\], \['autoc', 'Auto-captured 30d'\]/.test(CODE));
ok('the note answers the question in words, not just in a heading',
   /Logged contacts are the ones a person entered through Log contact\./.test(CODE) &&
   /the comms sync matched to a client, one row each/.test(CODE));
ok('...and says what the old number was, so it is not simply missing',
   /The two together are the old /.test(CODE));
/* The totals row sums any numeric column, so both halves total correctly
   with nothing added for them. */
ok('the footer still totals whatever columns are shown',
   /const vals = list\.map\(function \(r\) \{ return r\[c\[0\]\]; \}\)/.test(CODE));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
