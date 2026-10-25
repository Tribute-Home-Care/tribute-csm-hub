// 2026-10-25 incident: shared.ltc (110 records), shared.coverage and
// shared.settings vanished from the hub's shared document.
//
// THE QUESTION: can an untouched shared key disappear? The merge is lifted
// out of index.html and executed, rather than reasoned about.
const fs = require('fs'); const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const i = SRC.indexOf('const _SHARED_SPEC = {');
const j = SRC.indexOf('async function _putData()');
if (i < 0 || j < 0) throw new Error('could not lift the merge');
const merge = new Function(SRC.slice(i, j) + '\nreturn {mergeSharedDocument,_SHARED_SPEC};')();
const { mergeSharedDocument } = merge;

// ── The pre-loss document, shaped from the real import ───────────────────
// 110 LTC records (memory 2026-09-04: 66 MA + 44 MD + 4 header rows discarded),
// field shape taken from saveLTCRecord() in index.html.
const ltc110 = Array.from({length:110}, (_,n) => ({
  id:'ltc'+n, clientName:'Client '+n, vivId:'viv'+n, insurer:['Genworth','Unum','John Hancock','MetLife'][n%4],
  policyNum:'P'+n, claimNum:'C'+n, delivery:['email','fax','portal'][n%3],
  email:'claims'+n+'@example.com', fax:'', market:'MA', status:'Active' }));
const preLoss = () => ({
  ltc: JSON.parse(JSON.stringify(ltc110)),
  coverage: [{clientId:'c1', csmId:'julia', note:'out this week'},
             {clientId:'c2', csmId:'emily', note:'covering'}],
  settings: { loginMap:{'someone@tributehomecare.com':'julia'}, vivEmail:'x@y.com' },
  communities: { 'Goddard House': { email:{to:['a@b.com']}, levels:[] } },
  comms: { generatedAt:'2026-10-25T12:00:00Z', mergedBy:'server-timer' },
  viv:  { generatedAt:'2026-10-25T10:35:07Z', counts:{} },
  fillEvents: [{id:'e1', name:'snow'}],
  fillStatus: { e1: { c1: {state:'open'} } },
  mdCadence: { c1: 30 },
  assistant: { kb:[{id:'k1'}], templates:[], scenarios:[] }
});
const PROTECTED = ['ltc','coverage','settings','communities','fillEvents','fillStatus','mdCadence','assistant'];
const report = (label, out) => {
  const gone = PROTECTED.filter(k => {
    const v = out[k];
    const empty = v === undefined || (Array.isArray(v) && !v.length) ||
                  (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
    return empty;
  });
  ok(label + (gone.length ? '  >>> LOST: ' + gone.join(', ') : ''), gone.length === 0);
  return gone;
};

console.log('\n--- 1. the ordinary case: everyone has the whole document ---');
{
  const server = preLoss(), base = preLoss(), mine = preLoss();
  mine.coverage[0].note = 'edited';
  const { shared } = mergeSharedDocument(base, mine, server);
  report('a normal save keeps every shared key', shared);
  ok('ltc still has 110 records', (shared.ltc||[]).length === 110);
  ok('the edit survives', shared.coverage.find(c=>c.clientId==='c1').note === 'edited');
}

console.log('\n--- 2. THE PARTIAL-CLIENT HAZARD (incident §7) ---');
console.log('    A session holds a document with no `ltc` key and saves something else.');
{
  const server = preLoss();
  // base = what this session loaded. An older/partial client never had ltc.
  const base = preLoss(); delete base.ltc; delete base.settings; delete base.coverage;
  const mine = preLoss(); delete mine.ltc; delete mine.settings; delete mine.coverage;
  mine.communities['Goddard House'].email.to = ['changed@b.com'];
  const { shared } = mergeSharedDocument(base, mine, server);
  report('a stale client saving communities must NOT drop ltc/coverage/settings', shared);
}

console.log('\n--- 3. a profile-only save from a client that never loaded shared ---');
{
  const server = preLoss();
  const { shared } = mergeSharedDocument({}, {}, server);
  report('base and mine empty: the server document must survive intact', shared);
}

console.log('\n--- 4. 409 retry: server moved on, my copy is partial ---');
{
  const base = preLoss(); delete base.ltc;
  const mine = preLoss(); delete mine.ltc; mine.coverage.push({clientId:'c3',csmId:'tina',note:'new'});
  const server = preLoss();                       // server still HAS ltc
  const { shared } = mergeSharedDocument(base, mine, server);
  report('409 retry with a partial local copy must not drop ltc', shared);
  ok('my new coverage record still lands', (shared.coverage||[]).some(c=>c.clientId==='c3'));
}

console.log('\n--- 5. the key was introduced after this session loaded ---');
{
  const base = preLoss(); delete base.mdCadence;
  const mine = preLoss(); delete mine.mdCadence;
  const server = preLoss();                       // someone added mdCadence meanwhile
  const { shared } = mergeSharedDocument(base, mine, server);
  report('a key added by someone else while I was open must survive my save', shared);
}

console.log('\n--- 6. server-side timer rewrote comms while I was editing ---');
{
  const base = preLoss(), mine = preLoss(), server = preLoss();
  server.comms = { generatedAt:'2026-10-25T13:00:00Z', mergedBy:'server-timer' };
  mine.coverage[0].note = 'mine';
  const { shared } = mergeSharedDocument(base, mine, server);
  report('a concurrent timer write keeps everything', shared);
  ok('the newer generated comms wins', shared.comms.generatedAt === '2026-10-25T13:00:00Z');
}

console.log('\n--- 7. deliberate removal must still be possible ---');
{
  const base = preLoss(), server = preLoss();
  const mine = preLoss(); mine.coverage = mine.coverage.filter(c => c.clientId !== 'c1');
  const { shared } = mergeSharedDocument(base, mine, server);
  ok('a record the user actually deleted is removed',
     !(shared.coverage||[]).some(c => c.clientId === 'c1'));
  ok('the other coverage record is untouched',
     (shared.coverage||[]).some(c => c.clientId === 'c2'));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
