/* Filing a visit note into Viv is the single most consequential thing the
   product does. These assert the page cannot do it by accident, cannot do it
   on a pilot CSM's behalf, and never uses the word "filed" for a preview. */
const fs=require('fs'), path=require('path');
const P=fs.readFileSync(path.join(__dirname,'../v2/v2-policy.js'),'utf8');
const R=fs.readFileSync(path.join(__dirname,'../v2/v2-scribe-review.js'),'utf8');
const RC=R.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
let pass=0,fail=0;
const ok=(n,c)=>{if(c){pass++;console.log('  PASS  '+n);}else{fail++;console.log('  FAIL  '+n);}};

console.log('--- a commit does not ride on the draft capability ---');
ok('the two writes are told apart by op and mode', /sOp === 'commit' && sMode === 'live'/.test(P));
ok('a commit asks for scribe_viv_write', /isCommit \? 'scribe_viv_write' : 'scribe_draft'/.test(P));
// Was a proximity check (recordBlockedWrite within 300 chars of a 403), which
// broke when an unrelated error body grew. The invariant is narrower than
// "every blocked write is a 403": the DEFINITION is not a call, deny() blocks
// before a request exists so there is nothing to answer, and usage_time
// deliberately answers 202 with a comment saying why. The rule is that a
// blocked write which DOES answer the caller answers 403.
(function () {
  let i = -1, checked = 0, bad = [];
  while ((i = P.indexOf('recordBlockedWrite({', i + 1)) > -1) {
    const after = P.slice(i, i + 900);
    const r = after.indexOf('new Response(');
    if (r < 0) continue;                       // blocks without answering
    const seg = after.slice(r, r + 400);
    if (/usage_time/.test(after.slice(0, r))) continue;   // documented 202
    checked++;
    if (!/status: 403/.test(seg)) bad.push(P.slice(0, i).split('\n').length);
  }
  ok('there are answering blocked-write sites to check', checked >= 2, String(checked));
  ok('a refused capability is blocked, not downgraded',
     /if \(!App\.canWrite\(cap\)\)/.test(P) && bad.length === 0);
  if (bad.length) console.log('        sites without a 403, at lines: ' + bad.join(', '));
})();

console.log('\n--- it is a business write and is counted as one ---');
const BUS=(P.match(/const BUSINESS = new Set\(\[([\s\S]*?)\]\)/)||[])[1]||'';
ok('scribe_viv_write is in the business set', /scribe_viv_write/.test(BUS));
ok('scribe_draft still is not', !/scribe_draft/.test(BUS));
ok('the commit is recorded as a Viv client note', /recordType: 'Viv client note'/.test(P));
ok('the server must agree: it is in SERVER_CAPS', /SERVER_CAPS = new Set\(\['scribe_viv_write'/.test(P));

console.log('\n--- the control only appears where the write would succeed ---');
ok('the button is behind canWrite', /function canFile\(\)[\s\S]{0,180}canWrite\('scribe_viv_write'\)/.test(RC));
ok('a pilot CSM sees the original promise instead',
   /Scribe never writes to Viv\. A person puts this into the record\./.test(RC));
ok('nothing is offered until a field is approved',
   /Approve at least one Visit Note field before it can be filed/.test(RC));
ok('an already-filed encounter offers no second filing',
   /\(enc\.committed \|\| \{\}\)\.visitNote\) return filedRow/.test(RC));

console.log('\n--- preview and filing are never the same word ---');
ok('preview says nothing was written', /Nothing was written\. This is the exact text/.test(RC));
ok('preview requests dryRun', /mode: live \? 'live' : 'dryRun'/.test(RC));
ok('only a live result says Filed', /out\.innerHTML = '<p class="sr-done">Filed to Viv\./.test(RC));
ok('a live file asks first', /window\.confirm\([\s\S]{0,140}cannot be unsent/.test(RC));
ok('a failure says nothing was filed', /Nothing was filed\./.test(RC));

console.log('\n--- still true of everything else ---');
ok('the Care Plan is not filed by this control', !/target: 'carePlan'/.test(RC));
ok('the only commit target is the visit note', (RC.match(/target: '[a-zA-Z]+'/g)||[]).every(t=>/visitNote/.test(t)));

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
