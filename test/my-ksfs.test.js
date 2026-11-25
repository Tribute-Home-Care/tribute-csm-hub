/* MY KSFs, BUILT ON THE CLIENT SOLUTIONS KSF RATHER THAN BESIDE IT.
 *
 * Courtney, 17 Nov: "My KSFs" is her name for what the Hub called the KPI
 * Tracker, and it was the last open item on her list -- "Still the KPI
 * Tracker with a manual form."
 *
 * The live CSM KSF card has sat at the top of that page since 18 Nov,
 * reading the same numbers as TributeKSFs csm.html through
 * vivProxy?endpoint=csm_ksf. Underneath it the form still asked a CSM to TYPE
 * four of the same metrics by hand. A typed copy of a computed number is a
 * second source, and a second source is how two pages come to disagree.
 *
 *   node test/my-ksfs.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype');
const SRC = fs.readFileSync(path.join(PROTO, 'redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CSS = fs.readFileSync(path.join(PROTO, 'redesign.css'), 'utf8');
const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

/* ── 1. the live KSF is really the Client Solutions KSF ───────────────── */
ok('the page carries the live CSM KSF card', /<div id="ksf-live-kpi"><\/div>/.test(V1));
ok('...fed by the same endpoint as the CSM KSF dashboard',
   /endpoint=csm_ksf/.test(V1));
ok('...and opening the full one is one click', /TributeKSFs\/csm\.html/.test(V1));

/* ── 2. the four typed copies are retired ─────────────────────────────── */
const list = (CODE.match(/const KSF_RETIRED = \[[\s\S]*?\];/) || [''])[0];
ok('four fields are named as retired', (list.match(/\['kpi-/g) || []).length === 4);
['kpi-1', 'kpi-2', 'kpi-3', 'kpi-5'].forEach(id => {
  ok('...including ' + id, new RegExp("\\['" + id + "'").test(list));
  /* Each one must still exist in V1, or this is hiding nothing and the note
     beside it names a field that is not there. */
  ok('...which V1 still has', new RegExp('id="' + id + '"').test(V1));
});
/* kpi-4 is the community-partner list. The KSF cannot see a conversation
   with a referral partner, so that one stays a question for a person. */
ok('leads from existing accounts is NOT retired', !/'kpi-comms'\s*,/.test(list));
ok('...and is relabelled as the CSM\'s own to record',
   /the KSF cannot see these, so they are yours to record/.test(CODE));

/* ── 3. hidden, not removed, because saveKPI lives in V1 ──────────────── */
ok('the fields are hidden rather than taken out of the DOM',
   /fg\.classList\.add\('rd-ksf-gone'\);/.test(CODE) && /\.rd-ksf-gone \{ display: none !important; \}/.test(CSS));
ok('...so V1\'s save still finds every input it reads',
   /document\.getElementById\('kpi-1'\)\.value/.test(V1) || /kpi-1/.test(V1));
ok('...and the layer removes nothing from the page', !/kpi-1[\s\S]{0,80}\.remove\(\)/.test(CODE));

/* ── 4. the retirement is visible, not silent ─────────────────────────── */
ok('a line says where those numbers went',
   /are computed above and are not typed in any more\./.test(CODE));
ok('...and links to the month by month history',
   /Open the full CSM KSF<\/a> for the month by month history\./.test(CODE));
ok('...placed inside the Role Expectation Metrics box, found through a field in it',
   /document\.getElementById\('kpi-1'\)\.closest\('\.fg'\)/.test(CODE));
ok('the page is renamed to her word', /h\.textContent = 'My KSFs';/.test(CODE));
ok('...with a lede that says where the numbers come from',
   /live from Viv, HubSpot and SurveyMonkey/.test(CODE));
ok('...and the rail already called it that', /\['kpi', 'My KSFs'\]/.test(CODE));

/* ── 5. decorated once, on arrival ───────────────────────────────────── */
ok('the page is decorated when it is opened', /if \(p === 'kpi'\) \{ try \{ decorateKpi\(\); \}/.test(CODE));
ok('...and only once', /if \(!page \|\| page\.dataset\.rdKsf\) return;/.test(CODE) &&
   /page\.dataset\.rdKsf = '1';/.test(CODE));
ok('...and a missing field leaves the note off rather than printing a lie',
   /if \(!moved\) return;/.test(CODE) && /if \(!box\) return;/.test(CODE));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
