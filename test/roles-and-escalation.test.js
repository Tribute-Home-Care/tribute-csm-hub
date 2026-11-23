// What the roles are called, and who a flag goes to.
//
// Courtney, 17 Nov, priority 11: "Use CSP everywhere, and follow the
// escalation paths for who handles what. CSMs need to know who to go to, and
// the names should match how we talk."
//
// And section 9, Client Pulse: "Add the escalation paths to Pulse's sources so
// 'whose call' matches who handles it now: MA and Chicago come to me, Maryland
// goes to the Senior CSM."
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const RD = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(RD);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const GC = fs.readFileSync(path.join(__dirname, '../v2/guide-content.js'), 'utf8');

// ── the name ──────────────────────────────────────────────────────────────
for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {
  // The old name must be gone from everything a person reads. isCSC is the
  // exception and is checked below.
  const leftover = (SRC.match(/CSCs?/g) || []).length;
  const flag = (SRC.match(/isCSCs?/g) || []).length;
  ok(label + ': no CSC left outside the stored flag', leftover === flag);
  ok(label + ': the role on a profile is CSP', /role:'CSP'/.test(SRC));
  ok(label + ': nobody is called a Coordinator any more', !/Coordinator/.test(SRC));
}
ok('the glossary spells it out', /\['CSP', 'Client Solutions Partner\./.test(GC));
ok('the market-wide panel uses the full name',
   /Client Solutions Partners — market-wide support/.test(V1));

/* isCSC IS A PERSISTED FIELD. It is written onto saved profiles, so renaming
   it would mean migrating stored data for a change that is about what people
   read. The flag keeps its name; every word a human sees changed. */
ok('the stored flag was deliberately not renamed',
   /isCSC:true/.test(V1) && !/isCSP/.test(V1));

// ── who a flag goes to ────────────────────────────────────────────────────
ok('a red flag says who to escalate to', /class="rd-pb-esc">Escalate to/.test(CODE));
ok('...only on red, because an amber is a watch',
   /if \(pp\.level !== 'red'\) return '';/.test(CODE));
ok('Maryland goes to the Senior CSM', /if \(st === 'MD'\) return byRole\(\/\^Senior CSM\/i, 'MD'\);/.test(CODE));
ok('MA and Chicago go to the Director of Client Solutions',
   /if \(st === 'MA' \|\| st === 'IL'\) return byRole\(\/Director of Client Solutions\/i\);/.test(CODE));
// A name typed into the code goes stale the day somebody changes job. The
// routes she gave are roles, so the lookup is by role.
ok('nobody is named in the code, only their role',
   !/Courtney/.test(CODE) && !/Jada/.test(CODE) && /byRole\(/.test(CODE));
ok('a role nobody holds shows no line rather than a wrong one',
   /return e \? '<p class="rd-pb-esc">/.test(CODE) && /return null;/.test(CODE));
ok('the line is styled, not inherited by accident', /\.rd-pb-esc \{/.test(CSS));

/* PULSE_MKT_STATE and PULSE_HUB_STATE are top-level `const` in the Hub, which
   makes them global BINDINGS and not window properties. Reading them off
   window returns undefined and the line would simply never appear — the same
   defect that made the Pulse acknowledgements evaporate. */
ok('the market maps are reached as bindings, not off window',
   /typeof PULSE_MKT_STATE !== 'undefined'/.test(CODE) &&
   !/window\.PULSE_MKT_STATE/.test(CODE));
ok('...and both profiles in the Hub declare the roles it looks for',
   /role:'Senior CSM · Manager'/.test(V1) && /role:'Director of Client Solutions'/.test(V1));

// Behavioural: the routing, over the real PROFILES shape.
const PROFILES = [
  { name: 'A', role: 'Director of Client Solutions', hub: 'MA' },
  { name: 'B', role: 'Senior CSM · Manager', hub: 'MD' },
  { name: 'C', role: 'CSM', hub: 'MA' }
];
const byRole = (re, hub) => PROFILES.filter(p => re.test(p.role) &&
  (!hub || (Array.isArray(p.hub) ? p.hub.indexOf(hub) > -1 : p.hub === hub)))[0];
const route = st => st === 'MD' ? byRole(/^Senior CSM/i, 'MD')
  : (st === 'MA' || st === 'IL') ? byRole(/Director of Client Solutions/i) : null;
ok('Massachusetts routes to the director', (route('MA') || {}).name === 'A');
ok('Chicago routes to the same person', (route('IL') || {}).name === 'A');
ok('Maryland routes to the Senior CSM', (route('MD') || {}).name === 'B');
ok('an unknown market routes nowhere rather than guessing', route('') === null);

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
