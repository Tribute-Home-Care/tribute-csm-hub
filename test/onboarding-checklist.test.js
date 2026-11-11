// The Viv Onboarding Checklist, on the Onboarding page.
//
// Courtney, 3 November: "I think I'd like this page to be labeled
// 'Onboarding' and have the onboarding check list." The page already held the
// Success in 30 touchpoints, which is not what she meant: her ticket
// distinguishes the two and asks for Success in 30 to move to the client. The
// checklist she means is the Word template the team copies per client,
// SharePoint > CSM Resources > Operational Documents and Checklists >
// "Viv Onboarding Checklist for New Client_Template 2025.docx".
//
// That document has three sections. Its third, Touchpoint Tasks, IS the
// Success in 30 card, which already ticks itself off the touchpoint log, so
// only the first two are reproduced here. Asking for the same thing twice in
// one page is how a checklist stops being used.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

function lift(decl) {
  const i = CODE.indexOf(decl);
  if (i < 0) return null;
  let d = 0, started = false;
  for (let j = i; j < CODE.length; j++) {
    const ch = CODE[j];
    if (ch === '{' || ch === '[') { d++; started = true; }
    else if (ch === '}' || ch === ']') { d--; if (started && d === 0) return CODE.slice(i, j + 1); }
  }
  return null;
}
const decls = ['const OB_CHECKLIST =', 'function _obMap(', 'function renderObChecklist(',
               'function toggleObTask(', 'function setObBy(', 'function _initialsOf('].map(lift);
ok('the checklist and its handlers are liftable', decls.every(Boolean));

let store = [];
const env = new Function('get', 'set', 'P', 'document', 'escHtml',
  decls.join(';') + ';return {OB_CHECKLIST,_obMap,toggleObTask,setObBy,_initialsOf};')(
  () => JSON.parse(JSON.stringify(store)),
  (k, v) => { store = v; },
  { name: 'Emily Willson' },
  { getElementById: () => null }, s => s);
const { OB_CHECKLIST, toggleObTask, setObBy, _initialsOf, _obMap } = env;

// ── the content, against the document ─────────────────────────────────────
const items = OB_CHECKLIST.flatMap(g => g.items);
ok('two sections: the initial tasks and the Viv setup', OB_CHECKLIST.length === 2);
ok('five initial tasks, as the template has', OB_CHECKLIST[0].items.length === 5);
ok('twelve Viv setup tasks, as the template has', OB_CHECKLIST[1].items.length === 12);
ok('no duplicate ids', new Set(items.map(i => i.id)).size === items.length);
const s30 = [...CODE.matchAll(/\{id:'([a-z0-9_]+)',\s+label:/g)].map(m => m[1]);
ok('checklist ids never collide with a Success in 30 milestone id',
   items.every(i => !['asmt','cg_prep','visit2','cg_chk','fam_wk1','fam_wk2','fam_wk3','fam_wk4','viv_req','viv_icd','tracker'].includes(i.id)));

// The touchpoint section belongs to the milestones card, not here.
ok('the touchpoint section is not duplicated',
   !items.some(i => /second visit|week-1 check|prep each caregiver|maintain contact/i.test(i.label)));

// A standing shared secret in a Word template does not get copied into a
// second system just because it was in the source.
//
// Matched by SHAPE, never by value. This repository is public, so writing the
// real one here to assert its absence would publish the very thing the
// assertion exists to keep out.
ok('no standing passcode is carried into the Hub', !/Tribute\d{4}!/.test(SRC));
ok('the family-access step still exists without it',
   items.some(i => /Viv access/i.test(i.label)) &&
   /standing passcode from the checklist document/.test(CODE));

// Detail that makes the step followable rather than a bare title.
ok('the fiddly Viv steps carry their location',
   items.filter(i => i.hint && /Profile >|Scheduling >|Clinical >|Documents >|Service Delivery >|Summary/.test(i.hint)).length >= 8);
ok('the Geo step keeps its ordering warning', items.some(i => /BEFORE the workflow/i.test(i.hint || '')));
ok('the Add CSM step keeps what to leave blank',
   items.some(i => /Billing Assignee and Scheduling Partner blank/.test(i.hint || '')));

// ── ticking, initials and dates ───────────────────────────────────────────
store = [];
toggleObTask('c1', 'ob_welcome');
ok('ticking records the client, the task and a date',
   store.length === 1 && store[0].clientId === 'c1' && store[0].id === 'ob_welcome' && !!store[0].at);
ok('initials default to whoever is signed in', store[0].by === 'EW');
setObBy('c1', 'ob_welcome', ' jh ');
ok('initials are trimmed and upper-cased', store[0].by === 'JH');
toggleObTask('c1', 'ob_welcome');
ok('unticking removes the row', store.length === 0);

store = [];
setObBy('c1', 'ob_welcome', 'JH');
ok('initials on an unticked task are ignored rather than creating a row', store.length === 0);

store = [];
toggleObTask('c1', 'ob_csa'); toggleObTask('c2', 'ob_csa');
ok('two clients keep separate checklists',
   Object.keys(_obMap('c1')).length === 1 && Object.keys(_obMap('c2')).length === 1 && store.length === 2);
toggleObTask('c1', 'ob_csa');
ok('unticking one client leaves the other alone',
   Object.keys(_obMap('c1')).length === 0 && Object.keys(_obMap('c2')).length === 1);

ok('initials cope with a single name', _initialsOf('Tracy') === 'T');
ok('initials cope with an empty name', _initialsOf('') === '' && _initialsOf(null) === '');

// ── the page ──────────────────────────────────────────────────────────────
ok('the checklist renders above the touchpoint card',
   CODE.indexOf('id="s60-ob"') > -1 && CODE.indexOf('id="s60-ob"') < CODE.indexOf('id="s60-milestones"'));
ok('the milestones card is now named for what it holds', /Touchpoint Tasks/.test(CODE));
ok('it is drawn whenever a client is opened', /renderObChecklist\(cid\);/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
