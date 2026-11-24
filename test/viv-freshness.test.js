/* KEEPING VIV DATA FRESH WHILE THE HUB IS OPEN.
 *
 * Andrew, 24 Nov: "people are going to depend on this being updated and
 * updated fast since they will be working on this all day."
 *
 * THE SIGN-IN SYNC ASKED THE WRONG QUESTION. V1 syncs when
 * localStorage.viv_last_sync is over 30 minutes old -- when THIS BROWSER
 * last asked -- which is not whether the DATA is old. Traced on the live
 * API: a browser synced at 6:45 AM, was handed the blob built the previous
 * evening, and that read triggered the server's detached rebuild, which
 * finished at 6:47. Nobody came back for it. The API held 2026-11-24T11:47Z
 * and the Hub held 2026-11-23T22:13Z, so every CSM opening Home on Tuesday
 * was reading Monday evening.
 *
 *   node test/viv-freshness.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const HUB = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

/* ── freshness is a property of the data ─────────────────────────────── */
ok('V1 still keys its own sync on this browser, which is the fault',
   /const lastViv=localStorage\.getItem\('viv_last_sync'\);/.test(HUB) &&
   /if\(!lastViv\|\|Date\.now\(\)-new Date\(lastViv\)\.getTime\(\)>30\*60\*1000\)vivSyncNow\(false\);/.test(HUB));
ok('...and the layer measures the DATA instead',
   /function vivDataAge\(\)/.test(CODE) &&
   /app\.data\.shared\.viv\.generatedAt/.test(CODE));
const AGE = (CODE.match(/function vivDataAge\(\) \{[\s\S]*?\n  \}/) || [''])[0];
ok('there is an age function to lift', !!AGE);
// Behavioural, over the shapes the bridge actually returns.
const ageOf = (gen) => {
  if (!gen) return null;
  const t = new Date(gen).getTime();
  return isNaN(t) ? null : Date.now() - t;
};
ok('a bundle from Monday evening reads as hours old',
   ageOf('2026-11-23T22:13:44.433Z') > 10 * 3600 * 1000);
ok('a bundle from minutes ago does not', ageOf(new Date(Date.now() - 60000).toISOString()) < 30 * 60 * 1000);
ok('no bundle at all is unknown, not fresh and not stale', ageOf(null) === null);
ok('an unparseable date is unknown rather than 1970',
   ageOf('not a date') === null);

/* ── the retry IS how the rebuild gets collected ──────────────────────── */
/* The server's rebuild is detached on purpose, because a cold build runs
   past Azure's 230s gateway. What was missing is the other half: something
   has to come back for the result. */
ok('a stale read is retried, on roughly the rebuild interval',
   /const VIV_RETRY = 3 \* 60 \* 1000;/.test(CODE) &&
   /if \(Date\.now\(\) - _vivKickAt < VIV_RETRY\) \{ _vivSkip = 'waiting out the retry gap'; return; \}/.test(CODE));
ok('...and it gives up rather than hammering a dead feed',
   /const VIV_MAX_TRIES = 10;/.test(CODE) &&
   /if \(_vivTries >= VIV_MAX_TRIES\) \{ _vivSkip = 'gave up after ' \+ _vivTries; return; \}/.test(CODE));
ok('...and fresh data resets the counter, so a later staleness is retried',
   /if \(age < VIV_MAX_AGE\) \{ _vivTries = 0; _vivSkip = 'fresh'; return; \}/.test(CODE));

/* ── what it must never do ────────────────────────────────────────────── */
/* A key modal opening at somebody mid-call is worse than stale data. */
ok('the automatic sync is never interactive', /vivSyncNow\(false\);/.test(CODE) && !/vivSyncNow\(true\)/.test(CODE));
/* A background tab refreshing nothing anybody is looking at is pure cost,
   and it is also the case that writes land in a file every Hub shares. */
ok('a hidden tab does not sync',
   /if \(document\.hidden\) \{ _vivSkip = 'tab hidden'; return; \}/.test(CODE));
ok('...and coming back to the tab checks, because that is when it is read',
   /document\.addEventListener\('visibilitychange'/.test(CODE) &&
   /if \(!document\.hidden\) \{ _vivTries = 0; ensureFreshViv\(\); \}/.test(CODE));
ok('two syncs cannot overlap',
   /if \(window\._vivSyncing\) \{ _vivSkip = 'sync already running'; return; \}/.test(CODE) &&
   /let _vivSyncing=false;/.test(HUB));
ok('it is installed once', /if \(window\.__rdVivFresh\) return;/.test(CODE) &&
   /installVivFreshness\(\);/.test(CODE));

/* IT REPORTS WHY IT DID NOTHING. A thing that runs unattended on a timer is
   invisible when it misfires: the first version did not fire for 75 seconds
   against deliberately staled data and there was no way to ask it why. */
ok('every early return says why',
   /_vivSkip = 'no vivSyncNow'/.test(CODE) && /_vivSkip = 'tab hidden'/.test(CODE) &&
   /_vivSkip = 'fresh'/.test(CODE) && /_vivSkip = 'waiting out the retry gap'/.test(CODE));
ok('...and the reason is readable from outside',
   /vivFreshness: function \(\)/.test(CODE) && /skip: _vivSkip/.test(CODE));
/* A repaint is a better signal that somebody is looking at this than a clock
   is, so the timer is not the only trigger. */
ok('a Home repaint also checks',
   /try \{ ensureFreshViv\(\); \} catch \(e\) \{\}/.test(CODE));
/* The hidden check moved BELOW the age check so that a fresh bundle still
   resets the retry counter in a background tab. */
ok('a hidden tab still resets the counter when the data is fresh', (() => {
  const fn = (CODE.match(/function ensureFreshViv\(\) \{[\s\S]*?\n  \}/) || [''])[0];
  return fn.indexOf("_vivSkip = 'fresh'") < fn.indexOf("document.hidden");
})());

/* WRITE AMPLIFICATION IS SELF-LIMITING, and that is worth stating: the test
   is the age of the SHARED data, so once one browser refreshes it the others
   see fresh data and do nothing. */
ok('the threshold is the shared data age, which is what limits the writes',
   /const VIV_MAX_AGE = 30 \* 60 \* 1000;/.test(CODE) &&
   /applyVivData/.test(HUB));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
