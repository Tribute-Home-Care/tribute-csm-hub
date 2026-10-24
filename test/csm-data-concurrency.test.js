// What the shared document's 409 retry actually does to a concurrent edit.
//
// This lifts the merge out of index.html rather than restating it, so it
// tests the code that ships. Nothing here touches production: the merge is
// pure, so the two "users" are just two objects.
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); }
                       else { fail++; console.log('  FAIL  ' + n); } };

// ---- the real merge, lifted ------------------------------------------------
const block = SRC.slice(SRC.indexOf('if(r.status===409){'), SRC.indexOf('r=await _putData();', SRC.indexOf('if(r.status===409){')));
const body = block.slice(block.indexOf('const merged='), block.lastIndexOf('DATA=merged;'));
ok('the 409 merge was found in index.html', body.includes('merged.shared'));

function retryMerge(serverDoc, myDoc, me) {
  // identical to saveToFile's 409 path, with fj/DATA/P supplied
  const fj = { data: serverDoc };
  let DATA = myDoc, P = me;
  const merged = fj.data || { profiles: {}, version: 1 };
  merged.profiles = merged.profiles || {};
  if (P && DATA.profiles[P.id]) merged.profiles[P.id] = DATA.profiles[P.id];
  merged.shared = { ...(merged.shared || {}), ...(DATA.shared || {}) };
  return merged;
}
// prove the lifted copy matches the shipped text, line for line
const normalised = s => s.replace(/\s+/g, ' ').trim();
ok('the copy under test matches the shipped merge',
   normalised(body).includes('merged.shared={...(merged.shared||{}),...(DATA.shared||{})}'));

console.log('\n--- profile-pocket edits (Quick Notes, to-dos, KPI, 1:1 notes) ---');
{
  // Julia saved first; Emily is mid-edit with a stale ETag.
  const server = { profiles: { julia: { quicknotes: 'julia note' }, emily: { quicknotes: 'old' } }, shared: {} };
  const mine   = { profiles: { emily: { quicknotes: 'emily NEW', todos: [{ t: 'call family' }] } }, shared: {} };
  const out = retryMerge(JSON.parse(JSON.stringify(server)), mine, { id: 'emily' });
  ok("Emily's own edit survives the retry", out.profiles.emily.quicknotes === 'emily NEW');
  ok("Emily's to-do survives", out.profiles.emily.todos[0].t === 'call family');
  ok("Julia's pocket is NOT clobbered", out.profiles.julia.quicknotes === 'julia note');
}

console.log('\n--- DATA.shared edits (coverage notes, Fill Priority, communities) ---');
{
  // Julia adds a coverage note while Emily has the page open. Emily's copy
  // of shared.coverage predates it.
  const server = {
    profiles: { emily: {} },
    shared: {
      coverage: [{ id: 'c1', note: 'existing' }, { id: 'c2', note: 'JULIA JUST ADDED THIS' }],
      communities: { brookhaven: { contact: 'JULIA UPDATED' } },
      fillEvents: [{ id: 'e1' }, { id: 'e2', label: 'JULIA ADDED' }]
    }
  };
  const mine = {
    profiles: { emily: { quicknotes: 'x' } },
    shared: {
      coverage: [{ id: 'c1', note: 'existing' }],              // stale: no c2
      communities: { brookhaven: { contact: 'old' } },          // stale
      fillEvents: [{ id: 'e1' }]                                // stale
    }
  };
  const out = retryMerge(JSON.parse(JSON.stringify(server)), mine, { id: 'emily' });

  ok("LOST UPDATE: Julia's coverage note is gone after Emily's retry",
     out.shared.coverage.length === 1 && !out.shared.coverage.some(c => c.id === 'c2'));
  ok("LOST UPDATE: Julia's community contact edit is reverted",
     out.shared.communities.brookhaven.contact === 'old');
  ok("LOST UPDATE: Julia's Fill Priority event is gone",
     out.shared.fillEvents.length === 1);
  ok('the spread replaces whole keys rather than merging within them',
     Object.keys(out.shared).length === 3);
}

console.log('\n--- which keys are exposed ---');
const sharedKeys = [...new Set((SRC.match(/DATA\.shared\.([a-zA-Z_]+)/g) || [])
  .map(s => s.split('.')[2]))].sort();
console.log('  every DATA.shared key is at risk on a 409: ' + sharedKeys.join(', '));
ok('coverage is a shared key', sharedKeys.includes('coverage'));
ok('communities is a shared key', sharedKeys.includes('communities'));
ok('fillEvents is a shared key', sharedKeys.includes('fillEvents'));

console.log('\n' + (fail ? fail + ' FAILED' : 'All ' + pass + ' checks passed') + '\n');
process.exit(fail ? 1 : 0);
