// No real staff addresses in a public repo.
//
// Tribute-Home-Care/tribute-csm-hub is visibility=PUBLIC and Pages serves it,
// so every file here is a published file. The rule about PHI has always been
// clear; this is the same rule one step out. A real mailbox in a test fixture
// is a real mailbox handed to address scrapers, and it buys nothing: the
// fixtures only ever checked whether a matcher resolved an address, never who
// it belonged to.
//
// Fixtures use the example.test domain, which RFC 2606 reserves so it can
// never route anywhere.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const ROOT = path.join(__dirname, '..');
const RE = /@tributehomecare\.com/;

/* The files that still legitimately carry one, and why. Each is a decision
   taken with Andrew on 24 Nov, not an oversight:

     index.html, v2/index.html  ADMIN_UPNS is GONE as of 24 Nov: the admin
                                check moved server-side, csm_data returns
                                viewer.isAdmin for the caller, and the list
                                lives in an app setting that never leaves the
                                server. What is left is CSM_UPN -- fifteen
                                firstname.lastname local parts that line 7095
                                concatenates the domain onto, so fifteen real
                                addresses are still reconstructable from public
                                source. That is a LARGER exposure than the
                                three that were removed and it needs the same
                                treatment, but it feeds a live feature rather
                                than a routing decision, so it is its own
                                change. Two of the three matches in this file
                                are placeholders in comments, not people.
     v2/v2-pto.js               PUBLIC_UPN is a live functional mailbox the
                                feature actually posts to, not a fixture.
                                Changing it changes behaviour, so it needs its
                                own decision.

   This list is deliberately exact. Adding an address anywhere else fails, and
   REMOVING one from this list fails too, so the list cannot quietly outlive
   the exceptions it records. */
const ALLOWED = ['index.html', 'v2/index.html', 'v2/v2-pto.js'];

/* TRACKED FILES, NOT FILES ON DISK. The first cut walked the directory and
   flagged three _incident/ data snapshots -- which are gitignored (.gitignore
   line 6), have never been tracked and have never been committed. They are
   not published, so they are not what this rule is about, and failing on them
   would have taught the next person to widen ALLOWED until it meant nothing.
   The question is what the repo PUBLISHES, so ask git. */
function tracked() {
  return require('child_process')
    .execSync('git ls-files -z', { cwd: ROOT, maxBuffer: 1 << 26 })
    .toString('utf8').split('\0').filter(Boolean);
}
const walk = (dir, out) => tracked()
  .filter(f => path.resolve(ROOT, f).startsWith(path.resolve(dir)))
  .map(f => path.join(ROOT, f))
  .reduce((a, f) => (a.push(f), a), out);

const hits = tracked()
  .filter(f => { try { return RE.test(fs.readFileSync(path.join(ROOT, f), 'utf8')); } catch (e) { return false; } })
  .sort();

ok('every file carrying a staff address is one that was signed off',
   JSON.stringify(hits) === JSON.stringify([...ALLOWED].sort()));
if (JSON.stringify(hits) !== JSON.stringify([...ALLOWED].sort())) {
  const extra = hits.filter(h => !ALLOWED.includes(h));
  const gone  = ALLOWED.filter(a => !hits.includes(a));
  if (extra.length) console.log('        new, not signed off: ' + extra.join(', '));
  if (gone.length)  console.log('        fixed — take it out of ALLOWED: ' + gone.join(', '));
}

/* The admin list specifically must not come back to the client. The identifier
   test is deliberately narrower than a substring search: CSM_HUB_ADMIN_UPNS is
   the app setting's name and may legitimately appear in a comment. */
for (const f of ['index.html', 'v2/index.html']) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok(f + ' no longer carries the admin list',
     !/(?<![A-Z_])ADMIN_UPNS/.test(s) && /let _viewerIsAdmin=false;/.test(s));
}
ok('...and the answer is taken from the validated token, not from the browser',
   /_viewerIsAdmin=!!\(j\.viewer&&j\.viewer\.isAdmin\);/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));
/* An unknown answer must not grant admin: the dangerous direction is silent
   over-access, and the opposite failure is visible as "No profile assigned". */
ok('...and it defaults to false',
   /let _viewerIsAdmin=false;/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')));

// The three fixtures that were cleaned, checked by what they became rather
// than only by what they no longer are.
for (const f of ['test/metrics-render.test.js', 'test/sereview-view.test.js',
                 'test/shared-key-survival.test.js']) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok(f.replace('test/', '') + ' uses the reserved domain',
     /@example\.test/.test(s) && !RE.test(s));
}
/* A synthetic domain on a real person's name is still that person's address
   shape, so the local parts went too. */
ok('...and no real name survives as a local part',
   !walk(path.join(ROOT, 'test'), []).some(p =>
     /(courtney\.chaulk|julia\.hanna|jada\.tiglao|andrew\.dobson)@/.test(fs.readFileSync(p, 'utf8'))));

/* The standing rule this one sits beside. */
const all = walk(ROOT, []).filter(p => !/\.git/.test(p));
ok('and the family password is still nowhere in the repo',
   !all.some(p => { try { return /Tribute\d{4}!/.test(fs.readFileSync(p, 'utf8')); } catch (e) { return false; } }));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
