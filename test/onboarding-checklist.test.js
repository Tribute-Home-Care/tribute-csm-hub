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
/* renderObChecklist is lifted and RUN, not stubbed, which is why its
   dependencies come with it. That is deliberate: the real render is what
   caught _obMap being deleted by a rewrite of the data above it. */
const decls = ['const OB_OWNERS =', 'const OB_MARKET_RULES =', 'const OB_CHECKLIST =',
               'function _obMarket(', 'function _obPlus(', 'function obDueFor(',
               'function _obMap(', 'function renderObChecklist(', 'const OB_HUB_HELP=',
               'let _obProofFor=null', 'function toggleObTask(', 'function openObProof(',
               'function saveObProof(', 'function closeObProof(',
               'function setObBy(', 'function _initialsOf('].map(lift);
ok('the checklist and its handlers are liftable', decls.every(Boolean));

/* Ticking an item opens a proof dialog rather than writing straight to the
   store, so the harness has to stand in for the few DOM reads that collects.
   A field that was never filled comes back empty, which is the real case when
   somebody ticks a box and tells us nothing. */
let store = {}, opened = [], toasts = [];
const fields = {};
const el = id => ({
  get value() { return fields[id] === undefined ? '' : fields[id]; },
  set value(v) { fields[id] = v; },
  textContent: '', innerHTML: '', disabled: false, style: {},
  classList: { remove() {}, add() {} }
});
const decl = decls.join(';');
const env = new Function('get', 'set', 'P', 'document', 'escHtml', 'openM', 'showToast',
  'draftById', 'actorStamp', 'renderObChecklist', 'renderClientMaster', 'openDraftFor',
  decl + ';return {OB_CHECKLIST,_obMap,toggleObTask,openObProof,saveObProof,closeObProof,setObBy,_initialsOf};')(
  (k) => JSON.parse(JSON.stringify(store[k] || [])),
  (k, v) => { store[k] = v; },
  { name: 'Emily Willson' },
  { getElementById: el }, s => s,
  (id) => opened.push(id), (t) => toasts.push(t),
  () => null, () => ({}), () => {}, () => {}, () => {});
const { OB_CHECKLIST, toggleObTask, openObProof, saveObProof, closeObProof,
        setObBy, _initialsOf, _obMap } = env;
// The old harness kept one flat array; the store is keyed now because ticking
// writes to two of them, s60_ob and the client's tasks.
Object.defineProperty(globalThis, 'rows', { get: () => store.s60_ob || [] });

// ── the content, against the document ─────────────────────────────────────
const items = OB_CHECKLIST.flatMap(g => g.items);
/* REBUILT FROM HER OWN DOCUMENT, 23 Nov. This used to assert two sections of
   5 and 12 taken from the 2026 Viv template. "CSM Hub_Onboarding Offboarding
   and Success in 30_final.docx" supersedes it with three phases: Assessment
   and initial tasks, Viv setup, and the first 60 days. Her Part 1, item for
   item, with her owners, due rules and Hub behaviours. */
ok('three phases, in her order',
   OB_CHECKLIST.length === 3 &&
   /Phase 1 — Assessment & initial tasks/.test(OB_CHECKLIST[0].g) &&
   /Phase 2 — Viv setup/.test(OB_CHECKLIST[1].g) &&
   /Phase 3 — First 60 days/.test(OB_CHECKLIST[2].g));
ok('eight, thirteen and eight items, as the document has',
   OB_CHECKLIST[0].items.length === 8 && OB_CHECKLIST[1].items.length === 13 &&
   OB_CHECKLIST[2].items.length === 8);
// Her key: AUTO, CHECK, EMAIL, ALERT and the combinations she uses.
ok('every item declares an owner and a Hub behaviour',
   items.every(i => i.owner && i.hub));
ok('the Hub behaviours are only ones from her key',
   items.every(i => i.hub.split('+').every(h => ['AUTO', 'CHECK', 'EMAIL', 'ALERT'].includes(h))));
ok('every item carries a due rule', items.every(i => i.due && typeof i.due === 'object'));
ok('the items she marked NEW are marked NEW', items.filter(i => i.isNew).length === 4);
ok('the per-caregiver items are flagged as such',
   items.filter(i => i.perCaregiver).length === 2);
/* "Steps that have to happen in order stay locked until the step before is
   done. For example, the Viv Workflow can't be checked until Located In and
   Payor are set." */
ok('the Geo step gates the Viv setup items that depend on it',
   items.filter(i => i.needs === 'ob_geo').length >= 6 &&
   items.find(i => i.id === 'ob_geo').gate === true);
ok('a gate points at an item that exists',
   items.filter(i => i.needs).every(i => items.some(x => x.id === i.needs)));
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
   items.some(i => /Viv app access/i.test(i.label)) &&
   /it is not repeated here/.test(CODE));

// Detail that makes the step followable rather than a bare title.
/* "Viv location under the task in small grey text (Profile > General) for the
   Viv setup items, so the CSP doesn't have to look it up." Asserted by naming
   the items the document gives a location for, rather than by counting
   matches of a regex: the old count-based version broke the day an item's
   location was "Profile" rather than "Profile >". */
const WITH_LOCATION = {
  ob_geo:'Profile > General', ob_icd:'Profile > General', ob_contacts:'Profile',
  ob_reqs:'Scheduling > Requirements', ob_tag:'Summary', ob_mgrs:'Summary',
  ob_wf:'Blue box', ob_cp:'Documents > Tribute Care Plan',
  ob_note:'Service Delivery > Notes', ob_app:'Accounts > User'
};
ok('every Viv step the document locates carries that location',
   Object.keys(WITH_LOCATION).every(id => {
     const it = items.find(x => x.id === id);
     return it && it.hint && it.hint.indexOf(WITH_LOCATION[id]) > -1;
   }));
/* Part 2, which did not exist before today. Step 1 is universal; Step 2
   depends on how the service ended, and the type comes from the Service
   Cancellation Pending Form. */
const OFF_CHECKLIST = lift('const OFF_CHECKLIST =') && eval(lift('const OFF_CHECKLIST =').replace(/^const OFF_CHECKLIST =/, ''));
const OFF_TYPES = lift('const OFF_TYPES =') && eval(lift('const OFF_TYPES =').replace(/^const OFF_TYPES =/, ''));
ok('the universal close-out is her nine steps', OFF_CHECKLIST && OFF_CHECKLIST.length === 9);
ok('...each with an owner and a Hub behaviour',
   OFF_CHECKLIST.every(i => i.owner && i.hub));
ok('setting the client to Discharged is the last step and says it is gated',
   OFF_CHECKLIST[OFF_CHECKLIST.length - 1].lastStep === true &&
   /will not allow this until every item above is done/.test(OFF_CHECKLIST[OFF_CHECKLIST.length - 1].hint));
ok('her six endings are all there', OFF_TYPES && OFF_TYPES.length === 6);
ok('...and each carries the Hub rule she wrote for it',
   OFF_TYPES.every(t => t.rule && t.steps && t.steps.length));
// Two of the six change what the Hub does, not just what the CSM does.
ok('a Tribute-initiated discharge is locked until a manager approves',
   OFF_TYPES.find(t => t.id === 'tribute').locked === true);
ok('a death is handled gently and never as a template email',
   OFF_TYPES.find(t => t.id === 'death').gentle === true &&
   /suggestions only, never a template email/.test(OFF_TYPES.find(t => t.id === 'death').rule));
ok('a hospitalisation goes to Hospitalized, not Discharged',
   /Hospitalized on the Viv Timeline, not Discharged/.test(OFF_TYPES.find(t => t.id === 'hosp').rule));

/* "Market rules set the due date. A Maryland client shows '48 hr MD rule'
   next to the assessment." It is a state regulation, and virtual assessments
   are not allowed there at all. */
ok('Maryland carries the 48 hour rule and no virtual assessment',
   /MD: \{ hrs:48, virtual:false,/.test(CODE) &&
   /48 hr MD rule/.test(CODE));
ok('MA and Chicago allow a virtual assessment',
   /MA: \{ hrs:null, virtual:true,/.test(CODE) && /IL: \{ hrs:null, virtual:true,/.test(CODE));
/* "the real due date (11/18, not just 'Day 14')". Where the anchor is not
   known yet the row says what it is waiting for; it never guesses, because a
   wrong due date turns the whole list red and teaches people to ignore it. */
ok('due dates are computed from this client\'s own dates', /function obDueFor\(c,item\)\{/.test(CODE));
ok('...and an unknowable one says what it waits for, rather than guessing',
   /return \{date:null,text:'Before the first visit'\};/.test(CODE));
ok('the Geo step keeps its ordering warning', items.some(i => /BEFORE the workflow/i.test(i.hint || '')));
ok('the Add CSM step keeps what to leave blank',
   items.some(i => /Billing Assignee and Scheduling Partner blank/.test(i.hint || '')));

/* ── ticking asks for proof ───────────────────────────────────────────────
   "Checking it off asks for proof. Who they talked to, the date, and a
   one-line note... Checked items show that proof on the checklist, not just a
   check mark, so a manager or covering CSM can see it was done the right
   way." */
const tick = (cid, id, proof) => {
  toggleObTask(cid, id);
  if (!proof) return;
  fields['obp-who'] = proof.who || '';
  fields['obp-date'] = proof.when || '2026-11-23';
  fields['obp-note'] = proof.note || '';
  saveObProof(!!proof.na);
};
store = {}; opened = [];
toggleObTask('c1', 'ob_welcome');
ok('ticking opens the proof dialog instead of writing straight away',
   opened.includes('m-ob-proof') && rows.length === 0);
fields['obp-who'] = 'Dana Example'; fields['obp-date'] = '2026-11-20'; fields['obp-note'] = 'Left the packet';
saveObProof(false);
ok('saving records the client, the task and a date',
   rows.length === 1 && rows[0].clientId === 'c1' && rows[0].id === 'ob_welcome' && !!rows[0].at);
ok('initials default to whoever is signed in', rows[0].by === 'EW');
ok('the proof is kept: who, when and the note',
   rows[0].who === 'Dana Example' && rows[0].when === '2026-11-20' && rows[0].note === 'Left the packet');
/* And it lands on the CLIENT, which is the point: a covering CSM should not
   have to open the checklist to see that it was done properly. */
ok('the proof also lands on the client record',
   (store.tasks || []).length === 1 && store.tasks[0].clientId === 'c1' &&
   /Dana Example/.test(store.tasks[0].note) && /Left the packet/.test(store.tasks[0].note));

setObBy('c1', 'ob_welcome', ' jh ');
ok('initials are trimmed and upper-cased', rows[0].by === 'JH');

// Taking a tick off is correcting a mistake. Making somebody justify a
// correction is how wrong ticks stay on the board.
opened = [];
toggleObTask('c1', 'ob_welcome');
ok('unticking removes the row and asks nothing',
   rows.length === 0 && !opened.includes('m-ob-proof'));

store = {};
setObBy('c1', 'ob_welcome', 'JH');
ok('initials on an unticked task are ignored rather than creating a row', rows.length === 0);

// N/A is her option on the items that carry one, and it records that it was
// considered without claiming the work was done.
store = {};
tick('c1', 'ob_comm', { na: true });
ok('an N/A is recorded as not applicable', rows.length === 1 && rows[0].na === true);
ok('...and does not land on the client record as work done', !(store.tasks || []).length);

/* "Steps that have to happen in order stay locked until the step before is
   done." The checkbox is disabled in the page, and the handler refuses too,
   so a stale render cannot get round it. */
store = {}; toasts = []; opened = [];
toggleObTask('c1', 'ob_wf');
ok('a gated step cannot be ticked before the one it waits on',
   rows.length === 0 && !opened.includes('m-ob-proof') &&
   toasts.some(t => /waiting on the one before it/.test(t)));
tick('c1', 'ob_geo', { note: 'Geo set' });
toggleObTask('c1', 'ob_wf');
ok('...and can be once that step is done', opened.includes('m-ob-proof'));
closeObProof();

store = {};
tick('c1', 'ob_csa', {}); tick('c2', 'ob_csa', {});
ok('two clients keep separate checklists',
   Object.keys(_obMap('c1')).length === 1 && Object.keys(_obMap('c2')).length === 1 && rows.length === 2);
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
