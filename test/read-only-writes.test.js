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

// ── the eight that route through set() ───────────────────────────────────
/* These were reported as "covered by queueSave", and they are -- at the END.
   Log contact opened its full form with an enabled Log Touchpoint button and
   no notice, so the work was done before the refusal arrived.

   Worse: set() assigns into DATA and THEN calls queueSave(), so in read-only
   the row is added in memory, the toast says "Touchpoint logged!", and
   nothing persists. A reload discards it silently. A false confirmation is
   the one thing a read-only mode must never produce. */
const RD2 = read('v2/redesign.js');
const V1  = read('index.html');
/* [^}]* cannot span this body: it contains {} of its own. Match the line. */
ok('set() is the choke point every one of them routes through',
   /function set\(key,val\)\{.*DATA\.profiles\[P\.id\]\[key\]=val;queueSave\(\);\}/.test(V1));
ok('...and it mutates BEFORE it asks, which is why the control must say so first',
   V1.indexOf('DATA.profiles[P.id][key]=val') < V1.indexOf('queueSave();}'));
ok('the controls that commit are disabled in read-only', /const RO_SAVE = \[/.test(RD2));
ok('...with the reason on hover',
   /b\.setAttribute\('title', 'Read-only: unlock to ' \+ pair\[1\]\);/.test(RD2));
ok('...and restored when the view is unlocked',
   /b\.removeAttribute\('disabled'\);/.test(RD2) && /delete b\.dataset\.roWas;/.test(RD2));
/* A disabled button at the foot of a long form is found last. */
/* KEYED ON THE CONTROL, NOT THE CONTAINER. The first cut looked only inside
   .mo.open, assuming a form is a modal. The Log contact form is not -- it
   renders into a .card on #page-comms -- so the one form that prompted all of
   this was the one the notice missed. Caught by opening it. */
ok('...and an open form says it at the top',
   /p\.className = RO_NOTE;/.test(RD2) && /Unlock on the banner to make changes\./.test(RD2));
ok('...wherever that form lives, modal or card',
   /const box = b\.closest\('\.mo, \.card'\);/.test(RD2));
ok('...and the notices go when the view is unlocked',
   /if \(!on\) \$\$\('\.' \+ RO_NOTE\)\.forEach\(function \(n\) \{ n\.remove\(\); \}\);/.test(RD2));
/* Forms are built on demand, so one pass at boot would miss every one. */
ok('...re-applied as the page builds forms', /new MutationObserver\(function \(\) \{ try \{ markReadOnly\(\); \}/.test(RD2));
/* EVERY NAME MUST EXIST. A list of handlers that are not on any control is a
   list that silently protects nothing -- two of the first draft's twelve were
   invented, and this is what caught them. */
/* SCOPED TO THE LIST. The first version matched every ['a', 'b'] pair in the
   file -- 77 of them, nav keys and column definitions included -- and then
   complained that "home" is not a click handler. */
const RO_BLOCK = (RD2.match(/const RO_SAVE = \[([\s\S]*?)\];/) || ['', ''])[1];
const names = [...RO_BLOCK.matchAll(/\['([a-zA-Z]+)',/g)].map(m => m[1]);
ok('...and every handler named is a control that exists in the app',
   names.length >= 12 && names.every(n => V1.indexOf('onclick="' + n) > -1));
/* The list is explicit on purpose: deriving it from "calls set()" would also
   disable the dialog openers, several of which write a default on the way in. */
ok('...and the openers are not in it',
   !names.includes('openSettings') && !names.includes('openNewKBEntry'));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
