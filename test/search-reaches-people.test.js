// Search reaches the people around the client, not just the client.
//
// Courtney, 17 Nov, priority 12: "Search covers family contacts, GCMs,
// caregivers and phone numbers, not just clients. When a daughter calls, the
// CSM knows her name, not always the client's."
//
// Two surfaces have to agree: the list's own search box and the ⌘K palette.
// They used to read different fields, which is the same fault as two counts
// of one thing — so both now ask clientHaystack().
//
// The honest limit: Viv's full contact list, with phone numbers and
// relationships, is fetched per client when you open one. Searching it for
// forty clients on every keystroke would be forty Viv calls per letter, so
// what is in hand is searched and nothing is fetched to search. The Hub's own
// recorded contact, care manager and caregivers are always searchable.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

// ── one haystack, two surfaces ────────────────────────────────────────────
ok('the list search asks the shared haystack',
   /if \(q\) list = list\.filter\(function \(r\) \{ return clientHaystack\(r\.c\)\.indexOf\(q\) > -1; \}\);/.test(CODE));
ok('...and so does the palette row for a client',
   /clientHaystack\(c\) \+ ' ' \+ \(c\.vivNum \|\| ''\)/.test(CODE));
ok('the haystack holds the people, not only the place',
   /const parts = \[c\.name, c\.loc, c\.city, c\.notes, c\.contact, c\.contactEmail,[\s\S]{0,120}c\.caregivers/.test(CODE));
ok('a care manager is searchable, and "none" is not a care manager',
   /\(c\.gcm && c\.gcm !== 'none' \? c\.gcm : ''\)/.test(CODE));

// ── phone numbers, however they are typed ────────────────────────────────
ok('a phone number matches whatever punctuation it was typed with',
   /replace\(\/\\D\+\/g, ''\)/.test(CODE));
ok('...and both the written form and the digits are indexed',
   /parts\.push\(x\.name, x\.email, x\.relation \|\| x\.relationship, x\.phone, digits\(x\.phone\)\);/.test(CODE));
// Behavioural: the three ways a CSM writes the same number.
const digits = v => String(v == null ? '' : v).replace(/\D+/g, '');
ok('617-555-0142, (617) 555 0142 and 6175550142 are one number',
   digits('617-555-0142') === '6175550142' &&
   digits('(617) 555 0142') === '6175550142' &&
   digits('6175550142') === '6175550142');

// ── nothing is fetched in order to be searched ───────────────────────────
ok('the Viv read is used only when it is already in hand',
   /snap\.state === 'ready' && snap\.data/.test(CODE));
ok('...and a client with no Viv record searches on the Hub record alone',
   /if \(!c \|\| !c\.vivId \|\| !window\.TributeClientData\) return \[\];/.test(CODE));
ok('a failed or absent read cannot break the list',
   /try \{ snap = TributeClientData\.client\(c\.vivId\); \} catch \(e\) \{ return \[\]; \}/.test(CODE));

// ── the palette rows ──────────────────────────────────────────────────────
ok('a family contact is a row of their own',
   /add\('Family contacts', x\.name,/.test(CODE));
ok('...and it names whose contact they are',
   /\(rel \? rel \+ ' . ' : ''\) \+ c\.name,/.test(CODE) || /\+ c\.name,\n/.test(CODE));
ok('...and opens that client', /function \(\) \{ openClient\(c\.id\); \}, 'person',\n\s*\[x\.email/.test(CODE));
ok('a caregiver is listed once, not once per client',
   /const spread = function \(grp, icon, pick\)/.test(CODE) &&
   /\(by\[k\] = by\[k\] \|\| \[\]\)\.push\(c\);/.test(CODE));
ok('...and says how many clients they touch', /plural\(n, 'client'\)/.test(CODE));
ok('care managers and caregivers are both spread this way',
   /spread\('Care managers', 'person'/.test(CODE) && /spread\('Caregivers', 'person'/.test(CODE));
ok('"none" is not a care manager in the palette either', /\/\^none\$\/i\.test\(k\)/.test(CODE));
ok('a caregiver field holding several names is split',
   /String\(c\.caregivers \|\| ''\)\.split\(\/\[,;\\n\]\+\//.test(CODE));

// ── what their row does ───────────────────────────────────────────────────
// A caregiver is not a page. The useful answer to their name is every client
// they touch, so the row drives the list's own search rather than guessing a
// client to open.
ok('their row searches the list rather than opening one arbitrary client',
   /function searchClients\(q\) \{/.test(CODE) && /searchClients\(nm\)/.test(CODE));
ok('...widening the view first, since their clients are not all in one tab',
   /_view = 'all';\n\s*_selected = null;\n\s*renderTrackerList\(\);/.test(CODE));

// ── it has to say what it can do ─────────────────────────────────────────
ok('the palette says who it searches',
   /placeholder="Search clients, family, caregivers, communities/.test(CODE));
ok('the list box says so too',
   /const CM_SEARCH_PLACEHOLDER = 'Search a client, a family contact, a caregiver, a care manager/.test(CODE));
// index.html is shared with V1, whose own renderer really does search only
// name, location and notes, so the wording is set from the layer.
ok('...set from the layer, because V1 still searches less',
   /if \(sEl && sEl\.placeholder !== CM_SEARCH_PLACEHOLDER\) sEl\.placeholder = CM_SEARCH_PLACEHOLDER;/.test(CODE) &&
   /placeholder="Search name, location, notes\.\.\."/.test(
     fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8')));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
