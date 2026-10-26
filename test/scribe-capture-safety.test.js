/* Scribe must not lose what a CSM already captured.

   Three ways it could, all found in the pre-pilot pass:
     - a dictated recap was wiped whenever processing failed, because the
       textarea was re-rendered empty;
     - the audio blob was dropped the moment the upload was attempted, so one
       flaky minute of signal discarded a whole visit;
     - the microphone kept running if the encounter could not be created,
       leaving the iOS indicator lit with nothing recording.
   And one way it could lie: a button labelled "Save for later" that saved
   nothing. */
const fs=require('fs'), path=require('path');
const S=fs.readFileSync(path.join(__dirname,'../v2/v2-scribe.js'),'utf8');
// Comments in this file EXPLAIN the old wording in order to warn against it,
// so a check for absent wording has to read the code, not the prose about it.
// (Making this mistake twice in one session was enough.)
const CODE=S.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
let pass=0,fail=0;
const ok=(n,c)=>{if(c){pass++;console.log('  PASS  '+n);}else{fail++;console.log('  FAIL  '+n);}};

console.log('--- the recap survives a failure ---');
ok('the typed recap is remembered before anything can fail', /S\.recapText\s*=\s*t;/.test(S));
ok('the textarea is re-rendered with it', /id="sc-recap"[\s\S]{0,200}esc\(S\.recapText/.test(S));
ok('it is cleared only once processing has succeeded',
   /S\.step\s*=\s*'done';[\s\S]{0,120}S\.recapText\s*=\s*null/.test(S));

console.log('\n--- the recording survives a failed upload ---');
ok('the audio is held rather than dropped', /S\.blob\s*=\s*blob/.test(S));
ok('upload is its own retryable step', /async function sendAudio\(\)/.test(S));
ok('a failure routes to a recording-failed state, not straight to retype', /S\.step\s*=\s*'recfail'/.test(S));
ok('that state offers a real retry', /data-act="retry-audio"/.test(S) && /'retry-audio'[\s\S]{0,60}sendAudio/.test(S));
ok('and still offers the retype fallback', /viewRecFail[\s\S]{0,900}data-act="recap"/.test(S));
ok('the blob is released only after the transcript is saved',
   /op: 'transcribe'[\s\S]{0,200}S\.blob\s*=\s*null/.test(S));
ok('choosing retype discards the audio deliberately', /a === 'recap'[\s\S]{0,80}S\.blob\s*=\s*null/.test(S));

console.log('\n--- the microphone is never left running ---');
ok('a failed encounter stops the tracks',
   /startEncounter\('home_visit_live'[\s\S]{0,260}getTracks\(\)[\s\S]{0,60}t\.stop\(\)/.test(S));

console.log('\n--- nothing claims a success it did not have ---');
ok('the failure view does not say the recording was unusable',
   !/could not be used/.test(CODE));
ok('it says the recording is still here', /still held on this device|recording is still here/.test(S));
ok('"Save for later" is gone, because it saved nothing', !/Save for later/.test(CODE));
ok('the honest label replaced it', /Finish later/.test(S));
ok('and it says what Finish later actually does',
   /keeps what you have typed until you close the Hub/.test(S));

console.log('\n--- the unload guard covers unsent work ---');
ok('it guards a live recording, a held blob and an untyped recap',
   /beforeunload[\s\S]{0,400}S\.rec[\s\S]{0,120}S\.blob[\s\S]{0,120}S\.recapText/.test(S));

console.log('\n--- still no Viv documentation write ---');
ok('the capture flow never names a Viv write', !/viv_visit_create|viv_write|careplan.*save|VIV_WRITE/i.test(S));

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
