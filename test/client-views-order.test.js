// The Clients tab bar, in Courtney's order.
//
// Courtney, 3 November: "Can we reorganize this tab that it goes 'all
// clients', 'needs attention', 'success in 30', 'due soon', 'coverage
// updates'". The first reply on her ticket said those five tabs did not
// exist and this was a restructure. All five views already existed. She
// called it a reorder and she was right.
//
// "Success in 30" rather than "Onboarding" is deliberate and comes from her
// other ticket: the PAGE became Onboarding, and she asked to keep the Success
// in 30 plan at the client level, which is what this view is.
//
// SIX CHIPS SINCE 23 NOVEMBER, from the two Clients pictures in her review:
// All 42 / Needs action 9 / Watch 10 / Success in 30 3 / Due this week 6 /
// Covering 0, over "one filter row".
//
// "Covering" is NOT the "coverage updates" tab she had removed on 17 Nov. That
// one duplicated the Coverage page's note writing, and her reason was "one
// home for coverage". This is a filter over the client list: whose clients am
// I holding right now. The note writing still lives only on Coverage, which
// the assertions below keep checking.
//
// "Needs action" rather than "Needs attention", and "Due this week" rather
// than "Due soon", are both her words. Due this week now counts seven days of
// dates rather than fourteen days of anything, so the label and the data say
// the same thing; Watch is where "something is off, nothing is due" went.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const WANT = [['all', 'All clients'], ['attention', 'Needs action'],
              ['watch', 'Watch'], ['onboarding', 'Success in 30'],
              ['soon', 'Due this week'], ['covering', 'Covering']];

// v2/redesign.js is GENERATED from the prototype by build-v2.py. Assert both,
// or an edit to the generated copy alone is reverted by the next build with
// nothing to show for it.
const FILES = [
  ['shipped', path.join(__dirname, '../v2/redesign.js')],
  ['source',  path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js')]
];

for (const [label, p] of FILES) {
  if (!fs.existsSync(p)) { ok(label + ': file is present', false); continue; }
  const SRC = fs.readFileSync(p, 'utf8');
  const m = SRC.match(/const VIEWS = \[([\s\S]*?)\];/);
  ok(label + ': the view list is readable', !!m);
  if (!m) continue;
  const got = [...m[1].matchAll(/\['([a-z0-9]+)',\s*'([^']+)'\]/g)].map(x => [x[1], x[2]]);
  ok(label + ': six chips, in her order', JSON.stringify(got) === JSON.stringify(WANT));

  /* The split is the point, so it is asserted rather than left to the labels.
     Watch and Due this week must not be able to claim the same client, and
     neither may claim one that already needs action. */
  ok(label + ': Due this week counts seven days of dates, not fourteen of anything',
     /function dueThisWeek\(c\) \{[\s\S]*?return n !== null && n <= 7;/.test(SRC));
  ok(label + ': ...and never a client who already needs action, or is on watch',
     /function dueThisWeek\(c\) \{\s*\n\s*if \(needsAction\(c\) \|\| pulseLevel\(c\) === 'amber'\) return false;/.test(SRC));
  ok(label + ': Watch is the trouble with no date on it',
     /function onWatch\(c\) \{[\s\S]*?if \(dueThisWeek\(c\)\) return false;/.test(SRC));
  ok(label + ': days-until-due reads all three cadences, not one',
     /function daysUntilDue\(c\)[\s\S]*?tpCadence[\s\S]*?ciCadence/.test(SRC));
  ok(label + ': Covering reads the other CSMs\' caseloads, since they are not mine',
     /function coveringRows\(\)[\s\S]*?h\.coveredBy !== me/.test(SRC));
  ok(label + ': ...and respects the end of the handoff',
     /function coveringRows\(\)[\s\S]*?h\.to && h\.to < today/.test(SRC));
  // Removing a tab must not leave its filter, its count or its empty state
  // behind: an unreachable branch is how a view comes back by accident.
  ok(label + ': the coverage-NOTES view is still gone root and branch',
     !/_view === 'coverage'/.test(SRC) && !/coverage: all\.filter/.test(SRC) &&
     !/No coverage notes/.test(SRC));
  ok(label + ': coverage is still a destination in the rail',
     /\['coverage', 'Coverage'\]/.test(SRC));
  ok(label + ': ...and Communities is its own, under Operations',
     /\['emailcomm', 'Communities'\]/.test(SRC));
  // The filters are keyed on the view id, so a rename must not touch them.
  for (const [id] of WANT.filter(v => v[0] !== 'all')) {
    ok(label + ': the "' + id + '" filter still exists',
       new RegExp("_view === '" + id + "'").test(SRC));
  }
  ok(label + ': the landing view is still the one that needs action',
     /let _view = 'attention';/.test(SRC));
}

ok('the shipped copy and the build source agree',
   fs.existsSync(FILES[1][1]) &&
   fs.readFileSync(FILES[0][1], 'utf8') === fs.readFileSync(FILES[1][1], 'utf8'));

// The build has dropped a hand-added module before (v2-feedback.js), which is
// why build-v2.py carries that warning. A module not registered there is one
// rebuild away from vanishing.
const BUILD = fs.readFileSync(path.join(__dirname, '../build-v2.py'), 'utf8');
for (const f of ['v2-followups.js', 'v2-followups.css']) {
  ok('build-v2.py emits a tag for ' + f, BUILD.includes("stamp('" + f + "')"));
  ok('build-v2.py mirrors ' + f + ' back to the prototype', BUILD.includes("'" + f + "'"));
}
const PAGE = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
for (const f of ['v2-followups.js', 'v2-followups.css']) {
  ok('the built page loads ' + f, new RegExp('\\./' + f.replace('.', '\\.') + '\\?v=[0-9a-f]{8}').test(PAGE));
}

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
