// The Director view for Courtney's daily metrics.
//
// Two rules from the spec are easy to break months from now by someone being
// helpful: "no leaderboards" dies the moment a column header becomes
// clickable, and "captured automatically" turns into a fabricated number the
// moment an unreadable source is counted as a clean result. Both are pinned
// here, along with the access gate.
const fs = require('fs'), path = require('path');
const HUB = path.join(process.env.HOME, 'tribute-csm-hub');
const RD = path.join(process.env.HOME, 'tribute-csm-hub-redesign', 'prototype');
const M = fs.readFileSync(path.join(HUB, 'v2/v2-metrics.js'), 'utf8');
const C = fs.readFileSync(path.join(HUB, 'v2/v2-metrics.css'), 'utf8');
const RDS = fs.readFileSync(path.join(RD, 'redesign.js'), 'utf8');
const ROU = fs.readFileSync(path.join(RD, 'router.js'), 'utf8');
const BLD = fs.readFileSync(path.join(HUB, 'build-v2.py'), 'utf8');
const IDX = fs.readFileSync(path.join(HUB, 'v2/index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? '  (' + d + ')' : '')); } };

console.log('\n--- access is not just a hidden nav item ---');
ok('the rail hides it unless the module says yes',
   /ok: function \(\) \{\s*return !!\(window\.TributeMetrics && window\.TributeMetrics\.allowed\(\)\)/.test(RDS));
// Hiding a nav item is not access control. The page refuses on its own.
ok('the page itself refuses when not allowed', /if \(!allowed\(\)\) \{/.test(M));
ok('...and says why rather than rendering empty', /limited to Client Solutions leadership/.test(M));
ok('admin is matched on the signed-in account', /\(a\.adminUpns \|\| \[\]\)\.some/.test(M));
ok('Courtney is named by profile id, not by display name', /OWNER_PROFILE = 'courtney'/.test(M));
ok('it is not open to any manager', !/isManager/.test(M));

console.log('\n--- no leaderboards ---');
ok('markets are in a fixed order', /MARKET_ORDER = \['Massachusetts', 'Maryland', 'Chicago'\]/.test(M));
ok('CSMs are sorted alphabetically inside a market', /\.sort\(\);/.test(M));
// A sortable column is a ranking with one extra click.
ok('no column header is a button or has a sort handler',
   !/<th[^>]*data-sort|<th[^>]*onclick|sortBy|data-a="sort"/.test(M));
ok('the table header is explicitly not clickable', /cursor: default/.test(C));
ok('no CSM row is ever ranked by a metric',
   !/sort\(function \([a-z], [a-z]\) \{ return [a-z]\.(clients|tpOver|visits|conv)/.test(M));
ok('the page says the numbers are not comparable', /not a ranking/.test(M));
// The exceptions list IS ordered, by severity, which is not a ranking of
// people: it is the order a human should read the clients in.
ok('only exceptions are ordered, and only by severity',
   /\.sort\(function \(a, b\) \{ return b\.sev - a\.sev; \}\)/.test(M));

console.log('\n--- a number is never invented ---');
ok('never contacted is its own state, not a large number of days', /tpNever/.test(M));
ok('...and is marked differently in the list', /x\.sev === 2/.test(M) && /li\.sev b/.test(C));
ok('a visit the CSM deliberately moved is not a miss', /&& !r\.visitDeferred/.test(M));
ok('a source that failed is reported, not treated as clean', /Not measured/.test(M));
ok('clients that could not be read are surfaced', /counted neither way/.test(M));
ok('the panel says these are gaps, not results', /gaps in what could be read, not clean results/.test(M));
// Maryland failing must not blank the Massachusetts note cadence.
ok('the two reads are settled independently', /Promise\.allSettled/.test(M));
ok('a failed read carries its own error rather than nothing',
   /status === 'fulfilled' \? res\[0\]\.value : \{ error:/.test(M));
ok('nothing is rendered as clear before anything has been read',
   /Nothing has been read yet/.test(M));
ok('"nothing is off track" requires a successful read', /!ex\.length && S\.cadence/.test(M));

console.log('\n--- an untrusted source is not shown as a result ---');
// Measured 3 November: the touch signal counts every kind of client-feed
// activity (~3.1 events per client per day) and the comms caches are empty,
// so the number reads near-100% green whatever the truth. A compliance
// figure that always passes is worse than none.
ok('there is one predicate for whether a source counts',
   /function usable\(src\) \{ return !!\(src && !src\.error && src\.trusted === true\); \}/.test(M));
// Fail closed: a source that says nothing either way is unverified, not
// trusted. The page and the endpoint ship separately, so a page that trusted
// silence would show the figure it was changed to suppress until the API
// caught up.
ok('silence is treated as unverified, not as trustworthy',
   /trusted === true/.test(M) && !/trusted !== false\); \}/.test(M));
ok('a source that never declared trust gets its own wording',
   /has not confirmed that its numbers can be relied on/.test(M));
ok('exceptions skip an untrusted source', /if \(usable\(c\)\)/.test(M));
ok('the team table skips it too', /if \(usable\(S\.cadence\)\)/.test(M));
ok('the unknown-client count is not shown from an untrusted read',
   /usable\(S\.cadence\) && S\.cadence\.counts/.test(M));
ok('it is reported under Not measured with its reason', /S\.cadence\.untrustedReason/.test(M));
ok('...and says nothing is being flagged from it', /Nothing is being flagged from it/.test(M));
// "Nothing is off track" when a measure was skipped is the exact lie this
// panel exists to prevent.
ok('the all-clear requires every source to be usable', /!ex\.length && usable\(S\.cadence\)/.test(M));
ok('an all-clear with a skipped measure is worded differently',
   /Nothing flagged in what could be measured/.test(M));
ok('...and names what was not measured', /Note cadence was not measured/.test(M));
// A column of dashes beside four real numbers reads as good news.
ok('the Notes column is dropped, not blanked', /var noteCol = usable\(S\.cadence\)/.test(M));
ok('the header is conditional', /noteCol \? '<th>Notes<\/th>' : ''/.test(M));
ok('the cells are conditional', /noteCol \? cell\(noteByCsm\[r\.csm\] \|\| 0\) : ''/.test(M));
ok('and its absence is explained', /Notes column is absent because note cadence is not being measured/.test(M));

console.log('\n--- the thresholds are Courtney’s, not invented ---');
ok('touchpoints flag past 7 days overdue', /r\.tpOverdueBy > 7/.test(M));
ok('Care Conversations flag at any overdue', /r\.ciOverdue/.test(M));
ok('note cadence uses the endpoint’s own flag', /if \(r\.flagged\)/.test(M));

console.log('\n--- the cadence rules are the Hub’s, not a second copy ---');
// Two copies of High-is-14-days is how the Hub and the dashboard start
// disagreeing in a 1:1.
ok('tier cadences come from the bridge', /a\.tpCadence/.test(M) && /a\.ciCadence/.test(M));
ok('nextDue comes from the application', /a\.nextDue/.test(M));
ok('daysAgo comes from the application', /a\.daysAgo/.test(M));
ok('the fallbacks match the application tables',
   /High: 14, Medium: 30, Low: 60/.test(M) && /High: 90, Medium: 180, Low: 180/.test(M));
ok('office clients are excluded', /if \(c\.isOffice\) return;/.test(M));
ok('CSCs are not treated as carrying a caseload', /if \(pr\.isCSC\) return;/.test(M));

console.log('\n--- it is wired in, and cannot be dropped by a rebuild ---');
ok('the rail lists it under Operations', /\['__metrics', 'Daily Metrics'\]/.test(RDS));
ok('the router knows the page', /'guide', 'metrics'\]/.test(ROU));
ok('the build copies both files', /'v2-metrics\.js', 'v2-metrics\.css'/.test(BLD));
// A V2 script that stops being referenced left the pilot's Feedback button
// dead for two hours once already.
ok('the build asserts the script is referenced',
   /'v2-metrics\.js', 'v2-metrics\.css',/.test(BLD.slice(BLD.indexOf('does not load'))) ||
   /_req in out/.test(BLD));
ok('the built page loads the script', /v2-metrics\.js\?v=/.test(IDX));
ok('the built page loads the stylesheet', /v2-metrics\.css\?v=/.test(IDX));

console.log('\n--- showPage cannot throw on it ---');
// showPage() does getElementById('page-' + p).classList.add without a guard,
// so a lazily created page throws on the first click.
ok('the page element is created at load, not on first open', /function boot\(\)/.test(M));
ok('boot runs whether or not the DOM is ready',
   /readyState === 'loading'/.test(M) && /else boot\(\);/.test(M));
ok('the render hook is delegated so it survives rebuildNav',
   /document\.addEventListener\('click'/.test(M) && /\[data-page="metrics"\]/.test(M));
ok('arriving on the route directly also renders', /test\(location\.hash\)/.test(M));
ok('the page is inserted next to page-home, not inside the rail',
   /getElementById\('page-home'\)/.test(M) && !/sb-nav/.test(M));

console.log('\n--- it reads the shared document, it does not write ---');
ok('no write of any kind', !/method: 'POST'|method:'POST'|setCached|queueSave/.test(M));
ok('reads are plain GETs', /fetch\(api\(\) \+ '\?endpoint=' \+ ep/.test(M));
ok('it styles nothing outside itself', !/^\s*(body|\.card|\.page|:root)\s*\{/m.test(C));

console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
