// Read-only means read-only, on every path that writes.
//
// On 24 Nov a session showing "Read-only, nothing you do here is saved"
// recorded a real encounter on a real client: 25 seconds of a visit
// transcribed and stored on the server, attributed to the CSM whose Hub was
// being viewed rather than to the admin account that pressed the button.
//
// queueSave() has refused writes in a view-as session since it was written,
// so everything routed through it was safe. The gap was exactly the modules
// that POST straight to a server and never asked.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* THE RULE, stated once: a module that posts to a server must consult the
   read-only state. v2-feedback is the recorded exception -- it carries no
   client data, and blocking it would stop a manager reporting the very bug
   they just found while viewing somebody else's Hub. */
const WRITERS = ['v2/v2-scribe.js', 'v2/v2-scribe-review.js', 'v2/v2-sereview.js', 'v2/workflows.js'];
const EXEMPT  = ['v2/v2-feedback.js'];

for (const f of WRITERS) {
  const s = read(f);
  ok(f.replace('v2/', '') + ' consults the read-only state',
     /writesBlocked/.test(s));
}
/* The guard has to sit in the path that POSTS, not merely somewhere in the
   file: a helper nobody calls is the same as no helper. */
ok('Scribe refuses before it builds a request',
   /async function call\(body\) \{\s*\n\s*if \(readOnlyBlocked\(\)\) throw new Error\('Read-only: unlock to use Scribe\.'\);/.test(read('v2/v2-scribe.js')));
ok('...and a Scribe draft cannot be changed either',
   /async function post\(body\) \{\s*\n\s*if \(readOnlyBlocked\(\)\) throw new Error\('Read-only: unlock to change a Scribe draft\.'\);/.test(read('v2/v2-scribe-review.js')));
ok('service exception decisions refuse first',
   /async function decide\(key, decision, extra\) \{\s*\n\s*if \(readOnlyBlocked\(\)\) return;/.test(read('v2/v2-sereview.js')));
ok('...and so does a type correction',
   /var key = 'se:' \+ x\.id;\s*\n\s*if \(readOnlyBlocked\(\)\) return;/.test(read('v2/v2-sereview.js')));
/* The one that cannot be taken back. Refused BEFORE the intent is recorded,
   or the tripwire is left holding an authorisation for a request never sent. */
const WF = read('v2/workflows.js');
ok('an email is refused before it is authorised',
   WF.indexOf("if (typeof window.writesBlocked === 'function' && window.writesBlocked())") <
   WF.indexOf("A_.__intent = { capability: 'weekly_send'"));
ok('...and refused before the request is built',
   WF.indexOf('window.writesBlocked()') < WF.indexOf("fetch('https://graph.microsoft.com/v1.0/me/sendMail'"));

/* The exemption is recorded, not forgotten: if feedback ever starts carrying
   client data this test is where somebody will argue about it. */
for (const f of EXEMPT) {
  ok(f.replace('v2/', '') + ' is a deliberate exception, and carries no client record write',
     !/endpoint=(scribe|se_review|csm_data|csm_client)/.test(read(f)));
}

/* Drawing the sheet must not fire the refusal toast; attempting something must. */
const SC = read('v2/v2-scribe.js');
ok('asking whether we are read-only is separate from refusing',
   /function readOnlyNow\(\) \{/.test(SC) && /function readOnlyBlocked\(\) \{/.test(SC));
ok('...and the sheet asks the silent one', /var ro = readOnlyNow\(\);/.test(SC));
ok('...so the options are closed before the microphone is opened',
   /var dis = ro \? ' disabled aria-disabled="true"' : '';/.test(SC) &&
   /Read-only: unlock to use Scribe\./.test(SC));

/* The reason the guards live where they do: queueSave already had one. */
ok('the shared save path still refuses too',
   /if\(typeof writesBlocked==='function'&&writesBlocked\(\)\)\{ _viewAsRefuse\(\); return; \}/.test(read('index.html')));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
