// The weekly family email's message is editable in the preview (Julia and
// Emily, CSM AI meeting 2026-11-12). The edit is kept for that week only,
// the live preview and the send render the same text, and whatever a CSM
// types is escaped before it reaches a family's inbox.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const CODE = fs.readFileSync(path.join(__dirname, '../v2/workflows.js'), 'utf8');
const PROTO = path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/workflows.js');

ok('the preview has a message box', /id="wk-intro"/.test(CODE));
ok('the preview re-renders as the CSM types', /ta\.addEventListener\('input'/.test(CODE));
ok('the email takes the message as a parameter', /function weeklyEmailHtml\(c, wk, st, intro\)/.test(CODE));
ok('a missing message falls back to this week\'s saved one', /if \(typeof intro !== 'string'\) intro = weeklyIntroFor\(/.test(CODE));
ok('a saved message only applies to the week it was written for', /s\.introWeek === week/.test(CODE));
ok('the send renders through the same function', /const html = weeklyEmailHtml\(c, wk, st\);/.test(CODE));
if (fs.existsSync(PROTO)) ok('prototype and generated copy agree', fs.readFileSync(PROTO, 'utf8') === CODE);

// Exercise the shipped paragraph builder.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const src = CODE.match(/function introHtml\(text\) \{[\s\S]*?\n  \}/);
ok('introHtml is extractable', !!src);
const introHtml = eval('(' + src[0].replace('function introHtml', 'function') + ')');
const two = introHtml('First line.\nSame paragraph.\n\nSecond paragraph.');
ok('blank lines make paragraphs', (two.match(/<p /g) || []).length === 2);
ok('single newlines become line breaks', /First line\.<br>Same paragraph\./.test(two));
ok('typed markup is escaped', !/<script>/.test(introHtml('<script>x</script>')) && /&lt;script&gt;/.test(introHtml('<script>x</script>')));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
