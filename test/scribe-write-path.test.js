/* Scribe's writes must reach the server.

   They did not. The policy interceptor matched no rule for the `scribe`
   endpoint, so every Scribe POST fell through to the catch-all, got a
   synthetic 403 back, and was logged as an UNGATED WRITE PATH leak. Scribe
   could not record anything, and merely trying inflated policyLeaks. These
   assertions are cheap and would have caught it on the day it shipped. */
const fs=require('fs'), path=require('path');
const P=fs.readFileSync(path.join(__dirname,'../v2/v2-policy.js'),'utf8');
const API=fs.readFileSync(path.join(process.env.HOME,'tribute-api/src/functions/vivProxy.js'),'utf8');
let pass=0,fail=0;
const ok=(n,c)=>{if(c){pass++;console.log('  PASS  '+n);}else{fail++;console.log('  FAIL  '+n);}};

console.log('--- the page lets Scribe write ---');
ok('scribe_draft is a declared capability', /scribe_draft:\s*true/.test(P));
// Match the catch-all's CODE, not the words: the comment above the scribe
// branch explains the leak and contains the same phrase.
ok('the scribe endpoint is handled before the catch-all',
   P.indexOf("ep === 'scribe'") > 0 &&
   P.indexOf("ep === 'scribe'") < P.indexOf("feature: 'UNGATED WRITE PATH'"));
// The capability is now chosen per call (draft vs Viv commit), so this
// asserts the headers go and that the chosen capability is what rides on
// them, rather than pinning one literal.
ok('it sends the surface and capability headers so the server can still refuse',
   /ep === 'scribe'[\s\S]{0,1600}X-Tribute-Surface[\s\S]{0,120}X-Tribute-Capability': cap/.test(P));
ok('and the capability is scribe_draft unless it is a live commit',
   /isCommit \? 'scribe_viv_write' : 'scribe_draft'/.test(P));

console.log('\n--- but it is not a business write ---');
const BUS=(P.match(/const BUSINESS = new Set\(\[([\s\S]*?)\]\)/)||[])[1]||'';
ok('scribe_draft is NOT in the business set', !/scribe_draft/.test(BUS));
ok('it is counted on its own line', /scribeDrafts:\s*App\.scribeWrites/.test(P));
ok('business writes still report separately', /businessWrites|pilotFeedbackSubmissions/.test(P));

console.log('\n--- and the server still gates it ---');
ok('scribe_draft is in the server capability default', /'scribe_draft',/.test(API));
ok('the scribe endpoint runs the V2 write gate on non-GET',
   /endpoint==='scribe'[\s\S]{0,900}request\.method!=='GET'[\s\S]{0,120}_v2WriteGate/.test(API));
ok('a GET is left alone so review stays readable',
   /request\.method!=='GET'[\s\S]{0,120}_v2WriteGate/.test(API));
ok('scribe_draft carries no category switch, so it cannot be half-on',
   !/_categoryOf[\s\S]{0,400}scribe/.test(API));

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
