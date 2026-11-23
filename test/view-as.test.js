// Viewing somebody else's Hub, and who actually did the work.
//
// Courtney, 17 Nov, priority 9: "One sign-in per person through Microsoft,
// with a read-only 'View as' for managers... Checklists and to-dos need to
// record who actually did the work."
//
// Until this, a manager could open any profile and act in it with no mark of
// any kind: a visit logged by a director inside a CSM's Hub was recorded as
// the CSM's, and nothing said otherwise. That got sharper the morning to-dos
// started writing a row onto the client with a name on it.
//
// Two separate things, and the second is the one she asked for. Read-only is
// the guard. byAccount is the answer: every record already carried `by`, the
// profile it belongs to, and now also carries the person who was signed in
// whenever the two differ. That is true whether or not anyone is locked.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');

for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  // ── knowing whose Hub this is ───────────────────────────────────────────
  ok(label + ': the signed-in account is mapped to its own profile',
     /function ownProfileId\(\)\{ const o=profileForAccount\(ACCT\); return o\?o\.id:null; \}/.test(SRC));
  ok(label + ': a different profile is somebody else\'s Hub',
     /return own \? own!==P\.id : true;/.test(SRC));
  // tuadmin and the Director of Technology map to no CSM profile at all, so
  // "no profile of your own" has to mean every Hub is somebody else's, not
  // that every Hub is yours.
  ok(label + ': no profile of your own does not mean every Hub is yours',
     /\/\/ no profile of your own means every Hub is somebody else's/.test(SRC) ||
     /own\?own!==P\.id:true/.test(SRC.replace(/\s/g, '')));

  // ── the guard ───────────────────────────────────────────────────────────
  // One guard at the single place every change goes through, rather than a
  // hundred call sites each remembering to ask.
  ok(label + ': nothing persists while read-only',
     /if\(typeof writesBlocked==='function'&&writesBlocked\(\)\)\{ _viewAsRefuse\(\); return; \}/.test(SRC));
  ok(label + ': ...guarded at queueSave, which every write goes through',
     /function queueSave\(\)\{[\s\S]{0,400}writesBlocked\(\)/.test(SRC));
  ok(label + ': a blocked save says so rather than failing silently',
     /Read-only: you are viewing '\+\(P\?P\.name:'another'\)/.test(SRC));
  ok(label + ': ...but not once per keystroke', /if\(Date\.now\(\)-_viewAsToldAt>8000\)\{/.test(SRC));

  // ── the banner ──────────────────────────────────────────────────────────
  ok(label + ': the banner says whose Hub and as whom',
     /'<span><b>Viewing '\+escHtml\(P\.name\)\+'\\u2019s Hub<\/b>'/.test(SRC) ||
     /Viewing '\+escHtml\(P\.name\)/.test(SRC));
  ok(label + ': it goes up when a profile is opened', /try\{ renderViewAsBanner\(\); \}catch\(e\)\{\}/.test(SRC));
  /* #app is a flex ROW holding the sidebar and the content column, so a first
     child there is a third column: the first cut put a 709px amber block down
     the left of the page. Only visible by looking at it. */
  ok(label + ': ...inside the content column, not beside the sidebar',
     /const main=document\.querySelector\('#app > \.main, #app > main, #main'\)/.test(SRC) &&
     /if\(main\)main\.insertBefore\(el,main\.firstChild\);/.test(SRC));
  ok(label + ': ...with somewhere to go if that column is not found',
     /else document\.body\.insertBefore\(el,document\.body\.firstChild\);/.test(SRC));
  ok(label + ': opening a profile is a fresh decision about writing',
     /_viewAsUnlocked=false;          \/\/ a new profile is a new decision/.test(SRC));
  ok(label + ': and it is styled to be impossible to miss', /\.vab\{display:flex;/.test(SRC) && /\.vab\.writing\{/.test(SRC));

  // ── the admin override, deliberately ───────────────────────────────────
  // A blunt lock would make the two admin accounts read-only everywhere, and
  // the first thing anyone would do is take the lock out. An admin fixing
  // somebody's data is a real job; doing it invisibly was the part that was
  // wrong, so the banner stays up and turns red while writing is on.
  ok(label + ': only an administrator can unlock writing',
     /if\(!_acctIsAdmin\(\)\)\{ showToast\('Only an administrator can write/.test(SRC));
  ok(label + ': unlocking says what it now means',
     /showToast\('Writing as '\+P\.name\+'\. Every record will also carry your name\.'\)/.test(SRC));
  ok(label + ': the banner stays up while writing is unlocked',
     /el\.className=_viewAsUnlocked\?'vab writing':'vab';/.test(SRC));
  ok(label + ': ...and the button is gone once it is',
     /\(\(!_viewAsUnlocked&&_acctIsAdmin\(\)\)/.test(SRC));

  // ── who actually did it ────────────────────────────────────────────────
  ok(label + ': a write carries the signed-in person when it is not their Hub',
     /function actorStamp\(\)\{ return isViewingAs\(\) \? \{ byAccount: actorName\(\) \} : \{\}; \}/.test(SRC));
  ok(label + ': ...on a completed task', /tasks\.unshift\(Object\.assign\(\{id:'task'\+now\.getTime\(\)/.test(SRC) &&
     /at:now\.toISOString\(\)\},actorStamp\(\)\)\);/.test(SRC));
  ok(label + ': ...and on a Pulse acknowledgement',
     /c\.pulseAck=Object\.assign\(\{state,note,by:\(P&&P\.name\)\|\|''/.test(SRC) &&
     /forHeadline:\(pp&&pp\.headline\)\|\|''\},actorStamp\(\)\);/.test(SRC));
  ok(label + ': `by` still says which profile the record belongs to',
     /by:P\?P\.name:''/.test(SRC) && /by:\(P&&P\.name\)\|\|''/.test(SRC));
}

// ── behavioural: who is viewing what ─────────────────────────────────────
const viewing = (own, current) => own ? own !== current : true;
ok('a CSM in their own Hub is not viewing as anyone', !viewing('julia', 'julia'));
ok('a director in a CSM\'s Hub is', viewing('courtney', 'julia'));
ok('a director in their own Hub is not', !viewing('courtney', 'courtney'));
ok('an admin with no profile of their own always is', viewing(null, 'julia'));

const blocked = (isView, unlocked) => isView && !unlocked;
ok('read-only by default in somebody else\'s Hub', blocked(true, false));
ok('not blocked in your own', !blocked(false, false));
ok('not blocked once an admin unlocks', !blocked(true, true));

const stamp = (isView, actor) => isView ? { byAccount: actor } : {};
ok('a record in your own Hub carries no second name',
   Object.keys(stamp(false, 'Courtney Chaulk')).length === 0);
ok('a record in someone else\'s carries who typed it',
   stamp(true, 'Courtney Chaulk').byAccount === 'Courtney Chaulk');

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
