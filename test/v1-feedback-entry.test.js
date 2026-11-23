// The production Hub can report things too.
//
// The Feedback button shipped in the V2 pilot only. Everyone working in the
// production Hub, which is most of the team, had no way to file anything, so
// they emailed instead. On 23 Nov the board read as twenty quiet days while
// two substantial reports sat in a mailbox. A queue nobody can reach is not a
// quiet queue, and reading "nothing new" as "nothing wrong" is the trap.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const CODE = strip(fs.readFileSync(path.join(__dirname, rel), 'utf8'));
  ok(label + ': there is a way in from the rail', /onclick="openFeedback\(\)"/.test(CODE));
  ok(label + ': the form exists', /id="m-feedback"/.test(CODE) && /id="fb-msg"/.test(CODE));
  ok(label + ': it posts to the same endpoint the pilot uses',
     /VIV_PROXY\+'\?endpoint=v2_feedback'/.test(CODE));
}

const CODE = strip(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'));

// The five categories and three impacts must match the pilot's exactly, or the
// board ends up with two vocabularies for the same thing.
const V2 = fs.readFileSync(path.join(__dirname, '../v2/v2-feedback.js'), 'utf8');
const listOf = (name) => [...(V2.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];'))[1]
  .matchAll(/\['([a-z_]+)',/g))].map(m => m[1]);
const cats = listOf('CATEGORIES'), imps = listOf('IMPACTS');
ok('every pilot category is offered here', cats.every(c => new RegExp('value="' + c + '"').test(CODE)));
ok('every pilot impact is offered here', imps.every(i => new RegExp('value="' + i + '"').test(CODE)));
ok('and nothing extra was invented',
   (CODE.match(/id="fb-cat"[\s\S]*?<\/select>/) || [''])[0].match(/<option/g).length === cats.length);

// What it must never collect.
ok('no client record field is sent',
   !/clientName|vivId|clientId/.test((CODE.match(/async function sendFeedback\(\)[\s\S]*?\n\}/) || [''])[0]));
ok('the page is sent as a route, not as a client',
   /\.replace\(\/\^page-\/,''\)/.test(CODE) && /location\.hash\|\|''\)\.slice\(0,60\)/.test(CODE));

// Failure handling: the two things that make people stop reporting.
ok('a failed send never clears what they typed',
   /Your words are still here/.test(CODE) && !/fb-msg'\)\.value=''[\s\S]{0,80}catch/.test(CODE));
ok('a failed send is never reported as success',
   /if\(!r\.ok\|\|j\.error\) throw/.test(CODE));
ok('retrying the same text does not create a second row',
   /if\(!_fbKey\)_fbKey='ck_'/.test(CODE) && /_fbKey=null;\s*\n\s*closeM/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
