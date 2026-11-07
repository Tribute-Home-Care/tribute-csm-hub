// Exception Review: does it run, is it wired in, and does it tell the truth
// about gaps? Synthetic throughout: no real client, CSM or exception text.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'v2/v2-sereview.js'), 'utf8');
const RDS = fs.readFileSync(path.join(ROOT, 'v2/redesign.js'), 'utf8');
const ROU = fs.readFileSync(path.join(ROOT, 'v2/router.js'), 'utf8');
const BLD = fs.readFileSync(path.join(ROOT, 'build-v2.py'), 'utf8');
let pass = 0, fail = 0; const toasts = [];
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? '  (' + d + ')' : '')); } };

function el() {
  return { className: '', children: [], _html: '', dataset: {},
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.push(c); return c; },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
    classList: { add() {}, remove() {} }, parentNode: null, remove() {}, set textContent(v) { toasts.push(v); }, get textContent() { return ""; } };
}
function boot(account, fetchImpl) {
  const pages = {}; const home = el(); home.parentNode = el();
  let painted = '';
  const view = el(); Object.defineProperty(view, 'innerHTML', { set(v) { painted = v; }, get() { return painted; } });
  const doc = { readyState: 'complete',
    getElementById(id) { return id === 'page-home' ? home : (pages[id] || null); },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
    createElement() { const e = el(); Object.defineProperty(e, 'id', { set(v) { pages[v] = this; }, get() { return ''; } });
      e.querySelector = s => (s === '#xr-view' ? view : null); return e; },
    body: el() };
  const win = { TributeApp: { vivProxy: 'https://x/api/vivProxy', account, adminUpns: ['andrew.dobson@tributehomecare.com'],
    profileForAccount: a => (a && a.username === 'courtney.chaulk@tributehomecare.com' ? { id: 'courtney' } : { id: 'someone' }) },
    dataHeaders: async () => ({}) };
  const ctx = { window: win, document: doc, location: { hash: '' }, setTimeout: (f) => f(), fetch: fetchImpl,
    console, Promise, JSON, String, Object, Array, Date, Error };
  vm.createContext(ctx); vm.runInContext(SRC, ctx);
  return { mod: win.TributeSEReview, html: () => painted };
}
const tick = () => new Promise(r => setImmediate(r));

const DATA = { days: 60, clientRows: 3, excludedRows: 2, unread: 1, inWindow: 5, model: 'm', generatedAt: '2026-11-06T10:00:00Z',
  excludedClients: [{ name: 'Office (Somewhere)', n: 2 }], flagCounts: { hidden_complaint: 1 },
  exceptions: [
    { id: 'a1', date: '2026-11-01', client: 'Pat Example', csm: 'Sam Sample', market: 'Boston', types: ['No complaint: internal communication'],
      ai: { nature: 'client_complaint', complainant: 'family', confidence: 'high', reason: 'Family upset', quote: 'The son was upset.', suggestedTypes: ['Client Complaint: Reliability'] },
      flag: 'hidden_complaint', flagLabel: 'Complaint filed as routine', narrative: 'The son was upset.' },
    { id: 'a2', date: '2026-10-30', client: 'Lee Example', types: ['Lateness'], ai: { nature: 'routine', confidence: 'high', reason: 'x' }, flag: null },
    { id: 'a3', date: '2026-10-29', client: 'Kim Example', types: ['Lateness'], ai: null, flag: null }],
  heard: [{ id: 'h1', status: 'missing', date: '2026-11-02', client: 'Pat Example', mailbox: 'sam.sample', from: 'son@example.com',
    nature: 'client_complaint', complainant: 'family', confidence: 'high', summary: 'Missed visit', quote: 'Nobody came.', suggestedTypes: [] }],
  heardCounts: { missing: 1 }, channels: { email: 'Scanned', calls: 'Not yet', texts: 'Not yet' }, commsLastScan: null, decisions: {} };
const okFetch = async () => ({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(DATA)) });

(async () => {
  console.log('\n--- who may open it ---');
  let b = boot({ username: 'someone@tributehomecare.com' }, okFetch); b.mod.open(); await tick();
  ok('a CSM is refused', /limited to Client Solutions leadership/.test(b.html()));
  b = boot(null, okFetch); b.mod.open(); await tick();
  ok('no account is refused', /limited to/.test(b.html()));
  b = boot({ username: 'courtney.chaulk@tributehomecare.com' }, okFetch); b.mod.open(); await tick(); await tick();
  ok('Courtney is allowed', !/limited to/.test(b.html()));

  console.log('\n--- what it says ---');
  const h = b.html();
  ok('says a flag is a question', /question, not a finding/.test(h));
  ok('says what Fix in Viv changes, and that it is logged', /changes only the exception/.test(h) && /logged with your name/.test(h));
  ok('shows the flagged row', /Pat Example/.test(h) && /Complaints filed as routine/.test(h));
  ok('shows the quoted evidence', /The son was upset\./.test(h));
  ok('unread rows are counted, not hidden', /not read yet/.test(h));
  ok('names what was left out', /Office \(Somewhere\)/.test(h));
  ok('a routine row is not on the review tab', !/Lee Example/.test(h));

  b.mod._state.tab = 'heard'; b.mod.render();
  ok('heard tab shows the missing complaint', /Missed visit/.test(b.html()) && /No exception on file/.test(b.html()));
  ok('heard tab says email was never scanned', /never been scanned/.test(b.html()));
  ok('channels not yet connected are named', /Not yet/.test(b.html()));

  b.mod._state.tab = 'all'; b.mod.render();
  ok('all tab lists every client row', /Lee Example/.test(b.html()) && /Kim Example/.test(b.html()));

  b = boot({ username: 'andrew.dobson@tributehomecare.com' }, async () => ({ ok: false, status: 502, json: async () => ({ error: 'Viv is down' }) }));
  b.mod.open(); await tick(); await tick();
  ok('a failed read says so', /Could not be read: Viv is down/.test(b.html()));

  console.log('\n--- Fix in Viv ---');
  const TYPES = { operations: ['No complaint: internal communication', 'Client Complaint: Reliability'], clinical: ['Combative', 'Change of Condition'] };
  const sent = [];
  const routed = async (u, o) => {
    if (/se_review_types/.test(u)) return { ok: true, status: 200, json: async () => TYPES };
    if (/se_review_fix/.test(u)) { const body = JSON.parse(o.body); sent.push(body);
      if (body.id === 'stale') return { ok: false, status: 409, json: async () => ({ ok: false, error: 'This exception was changed in Viv since the page was read.' }) };
      return { ok: true, status: 200, json: async () => ({ ok: true, after: { types: body.types }, qa: { needed: false } }) }; }
    return okFetch();
  };
  b = boot({ username: 'courtney.chaulk@tributehomecare.com' }, routed); b.mod.open(); await tick(); await tick(); await tick();
  let f = b.html();
  ok('the card offers Fix in Viv once types load', /Fix in Viv/.test(f) && /data-fixsel="a1"/.test(f));
  ok('the AI suggestion is chosen to start', /<option value="Client Complaint: Reliability" selected>/.test(f));
  ok('only real Viv types are offered', !/Client upset/.test(f) && /Safety events \(clinical\)/.test(f));
  const x = b.mod._state.data.exceptions[0];
  b.mod._state.confirm[x.id] = 'Client Complaint: Reliability'; b.mod.render(); f = b.html();
  ok('it asks before changing, naming before and after', /Change #? ?in Viv from <b>No complaint: internal communication<\/b> to <b>Client Complaint: Reliability<\/b>\?/.test(f.replace(/#[^ ]* /, '# ')) || (/from <b>No complaint: internal communication<\/b> to <b>Client Complaint: Reliability<\/b>/.test(f) && /Yes, change it/.test(f)));
  b.mod._state.confirm[x.id] = null; b.mod._state.pick[x.id] = 'Combative'; b.mod.render();
  ok('a safety type says it moves to clinical and QA is told', /Moves it to clinical; QA is told/.test(b.html()));
  await b.mod._fix(x, 'Client Complaint: Reliability'); await tick();
  ok('it sends the id, the new type and the types the card showed',
    sent.length === 1 && sent[0].id === 'a1' && sent[0].types[0] === 'Client Complaint: Reliability' && sent[0].expect[0] === 'No complaint: internal communication');
  ok('after a confirmed save the card shows it done', /Re-typed in Viv/.test(b.html()) || (b.mod._state.data.decisions['se:a1'] || {}).decision === 'retyped');
  const stale = { id: 'stale', types: ['Lateness'] }; b.mod._state.data.exceptions.push(stale);
  await b.mod._fix(stale, 'Combative'); await tick();
  ok('a refused change is not marked done', !(b.mod._state.data.decisions['se:stale']));
  ok('the user is told why it was refused', toasts.some(t => /Not changed: This exception was changed in Viv/.test(t)));
  ok('the user is told it was confirmed', toasts.some(t => /Saved in Viv and confirmed/.test(t)));

  console.log('\n--- wired in, and a rebuild cannot drop it ---');
  ok('rail lists it', /\['__sereview', 'Exception Review'\]/.test(RDS));
  ok('rail gate asks the module', /TributeSEReview\.allowed\(\)/.test(RDS));
  ok('router knows the page', /'sereview'/.test(ROU));
  ok('build ships the script and stylesheet', /stamp\('v2-sereview\.js'\)/.test(BLD) && /stamp\('v2-sereview\.css'\)/.test(BLD));
  ok('build asserts it is present', /'v2-sereview\.js', 'v2-sereview\.css',\s*\n\s*'manifest/.test(BLD));

  // Scribe once owned .sr-tabs/.sr-card too; its selected-tab rule painted
  // this page's active tab black on black. No other stylesheet may use xr-.
  const others = fs.readdirSync(path.join(ROOT, 'v2')).filter(f => /\.css$/.test(f) && f !== 'v2-sereview.css')
    .filter(f => /\.xr-/.test(fs.readFileSync(path.join(ROOT, 'v2', f), 'utf8')));
  ok('no other stylesheet shares the xr- prefix', others.length === 0, others.join(','));
  ok('no sr- class left behind', !/\bsr-/.test(SRC));

  console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'PASSED all ' + pass));
  process.exit(fail ? 1 : 0);
})();
