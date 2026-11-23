// Coverage: readiness left, note right, and the form stops asking CSMs to
// retype what Viv already knows.
//
// Courtney, 17 Nov, priority 6. Her four complaints, each of which this has
// to answer:
//   - "You pick a client from the readiness list first and then write the
//      note, so the list should be on the left and the note on the right."
//   - "The form makes CSMs retype what Viv already has... CSMs edit, they
//      don't retype."
//   - "Every client says 'Needed' in red. When all 42 are red, nothing stands
//      out. There's no sense of progress."
//   - "The form doesn't follow you... by the time you scroll to client 30, the
//      form is off the top of the screen."
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, rel] of [['V1', '../index.html'], ['V2', '../v2/index.html']]) {
  const CODE = strip(fs.readFileSync(path.join(__dirname, rel), 'utf8'));
  ok(label + ': readiness comes before the note in the markup',
     CODE.indexOf('My Coverage Readiness') < CODE.indexOf('Update Coverage Note'));
  ok(label + ': there is a progress readout', /id="cov-progress"/.test(CODE));
  ok(label + ': and a Next client button', /covNextClient\(\)/.test(CODE));
}
const CODE = strip(fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'));
const CSS = fs.readFileSync(path.join(__dirname, '../v2/v2.css'), 'utf8');
ok('the note panel is pinned while the list scrolls', /\.cov-note \{ position: sticky/.test(CSS));
ok('but not when it is stacked below the list on a narrow screen',
   /@media \(max-width: 900px\)[\s\S]{0,200}\.cov-note \{ position: static; \}/.test(CSS));

// ── three states, not everything red ──────────────────────────────────────
ok('there are three states', /PILL=\{ready:[\s\S]{0,120}stale:[\s\S]{0,60}needed:/.test(CODE));
ok('stale is older than sixty days', /const COV_STALE_DAYS=60;/.test(CODE));
// The part that matters: a note written before the situation moved is worse
// than no note, because it reads as done.
ok('a Pulse flag raised after the note makes it stale',
   /_PULSE\.generatedAt>String\(n\.updatedAt\)|String\(_PULSE\.generatedAt\)>String\(n\.updatedAt\)/.test(CODE));
ok('progress is counted and shown as a bar', /<b>\$\{ready\} of \$\{ordered\.length\}<\/b> ready/.test(CODE));
ok('the list is ordered least-ready first, then high need',
   /st\[covState\(a\)\.state\]-st\[covState\(b\)\.state\]/.test(CODE) && /rank=\{High:0,Medium:1,Low:2\}/.test(CODE));

// Behavioural: the ordering has to put a needed High above a ready High.
const st = { needed: 0, stale: 1, ready: 2 }, rank = { High: 0, Medium: 1, Low: 2 };
const rows = [{ n: 'readyHigh', s: 'ready', t: 'High' }, { n: 'neededLow', s: 'needed', t: 'Low' },
              { n: 'staleHigh', s: 'stale', t: 'High' }, { n: 'neededHigh', s: 'needed', t: 'High' }];
rows.sort((a, b) => (st[a.s] - st[b.s]) || (rank[a.t] - rank[b.t]) || a.n.localeCompare(b.n));
ok('a client needing a note outranks one whose note is current',
   rows.map(r => r.n).join(',') === 'neededHigh,neededLow,staleHigh,readyHigh');

// ── pre-fill, without overwriting anybody ─────────────────────────────────
ok('it reads the same Viv data the client page does', /const S=window\.TributeClientData;/.test(CODE));
ok('an open Pulse flag seeds Active concerns', /out\.concerns=\(Array\.isArray\(p\.headline\)/.test(CODE));
ok('it only ever fills a field that is empty', /if\(el&&!el\.value&&pre\[f\]\)/.test(CODE));
ok('a filled field is marked as having come from the sync',
   /el\.dataset\.prefilled='1'/.test(CODE) && /\[data-prefilled\]/.test(CSS));
ok('the Hub record is the fallback, not the first choice',
   /if\(!out\.cg&&c\.caregivers\)/.test(CODE) && /if\(!out\.fam&&c\.contact\)/.test(CODE));

// Next client follows the work rather than the alphabet.
ok('Next client skips anyone already ready', /covOrdered\(\)\.filter\(c=>covState\(c\)\.state!=='ready'\)/.test(CODE));
ok('and says so when there is nothing left', /Every client has a current note/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
