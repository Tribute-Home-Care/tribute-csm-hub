/* V1 IS RETIRED, AND THE ROOT SENDS EVERYONE TO V2.
 *
 * Andrew, 24 Nov: "Can we retire V1? V2 should be the link for V1 now" and
 * "Everyone needs to start using v2, so we have to give them write access
 * since v2 will be the only version available now."
 *
 * index.html cannot simply be deleted: build-v2.py READS it to build V2, and
 * twenty-nine other tests read it as the production source. So it keeps its
 * job as the source and stops being the page.
 *
 * THE DANGEROUS CASE IS THE REDIRECT SURVIVING INTO V2, which would make V2
 * redirect to itself for ever. Nothing but this test and the build's own
 * assertions would catch it.
 *
 *   node test/v1-retired.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const BLD = fs.readFileSync(path.join(__dirname, '../build-v2.py'), 'utf8');

ok('the root redirects to V2', /location\.replace\('\.\/v2\/' \+ q \+ location\.hash\)/.test(V1));
ok('...and it is the first script in the head, before the app can boot', (() => {
  const i = V1.indexOf("location.replace('./v2/'");
  const j = V1.indexOf('msal-browser.min.js');
  return i > -1 && j > -1 && i < j;
})());

/* THE ONE THAT MATTERS. */
ok('the redirect is NOT in the built V2', !/V1 IS RETIRED/.test(V2) && !/location\.replace\('\.\/v2\//.test(V2));
ok('...and the build asserts that itself, rather than trusting the regex',
   /assert 'V1 IS RETIRED' not in html/.test(BLD) &&
   /assert "location\.replace\('\.\/v2\/'" not in html/.test(BLD));
/* Belt: even if the strip were removed, V2 must not loop, because it checks
   the path it is already on. */
ok('V2 would not loop even if the block survived', /\/\\\/v2\\\/\/\.test\(location\.pathname\)/.test(V1));

/* THE WAY BACK. A bad V2 build must not leave every CSM with nowhere to go. */
ok('?v1=1 still serves V1', /\/\[\?&\]v1=1\\b\/\.test\(location\.search\)/.test(V1));

/* A bookmark to #clients has to land on #clients. */
ok('the hash and the query carry over',
   /var q = location\.search \|\| '';/.test(V1) && /\+ q \+ location\.hash/.test(V1));
// Behavioural, over the four shapes a real bookmark takes.
const go = (pathname, search, hash) => {
  if (/[?&]v1=1\b/.test(search)) return null;
  if (/\/v2\//.test(pathname)) return null;
  return './v2/' + (search || '') + hash;
};
ok('a bare root goes to v2', go('/tribute-csm-hub/', '', '') === './v2/');
ok('a hash bookmark keeps its page', go('/tribute-csm-hub/', '', '#clients') === './v2/#clients');
ok('a query is preserved', go('/tribute-csm-hub/', '?w=1', '#home') === './v2/?w=1#home');
ok('an explicit v1 request is left alone', go('/tribute-csm-hub/', '?v1=1', '#home') === null);
ok('v2 itself never redirects', go('/tribute-csm-hub/v2/', '', '#home') === null);

/* The sign-in path moves with it: entra-auth derives its redirect URI from
   location.pathname, so landing on /v2/ asks Entra for /v2/ -- which is
   already registered, because that is how the pilot has been signing in. */
ok('V2 still loads the real auth script, one level up',
   /src="\.\.\/entra-auth\.js/.test(V2) &&
   /redirectUri: location\.origin \+ location\.pathname/.test(
     fs.readFileSync(path.join(__dirname, '../entra-auth.js'), 'utf8')));

/* ── IT STOPS CALLING ITSELF A PREVIEW ─────────────────────────────────
   A tag reading "V2 Preview" on the only Hub there is tells a CSM their
   real work is a trial, and "write pilot" says the same of every save. */
const CHROME = fs.readFileSync(path.join(__dirname, '../v2/v2-chrome.js'), 'utf8');
const POLICY = fs.readFileSync(path.join(__dirname, '../v2/v2-policy.js'), 'utf8');
ok('the preview tag is gone from the strip', !/class="v2-tag">V2 Preview/.test(CHROME));
ok('...and the badge no longer says pilot', !/'write pilot'/.test(POLICY) && /'writes on'/.test(POLICY));
ok('...and a refused account is told plainly, without naming a pilot',
   /cannot write to the Hub/.test(POLICY) && !/not in the write pilot/.test(POLICY));
ok('...and the diagnostics line says the same',
   !/it is not in the write pilot/.test(CHROME));
/* The strip itself STAYS: it is how the diagnostics panel is reached and how
   a kill switch or a refused write becomes visible. */
ok('the status strip and its diagnostics are kept',
   /id="v2-blocked-count"/.test(CHROME) && /App\.showDiagnostics\(\)/.test(CHROME));

/* ── THE ONE THING DELIBERATELY NOT DONE ───────────────────────────────
   V2 records no active time, because build-v2.py strips tribute-usage.js,
   v2-policy sets usage_telemetry false, AND the fetch wrapper blocks
   endpoint=usage_time unconditionally. That was right for a pilot and is a
   real gap now that V2 is the only Hub. It is three changes on the layer
   that guards Viv, so it is a decision, and this test exists so the gap is
   recorded rather than discovered in a month. */
ok('usage telemetry is still off, in all three places',
   /usage_telemetry: false/.test(POLICY) &&
   /html = _re\.sub\(r'\\s\*<script src="\\\.\/tribute-usage/.test(BLD) &&
   /if \(ep === 'usage_time'\) \{\n\s*App\.recordBlockedWrite/.test(POLICY));
ok('...and the reason it is still off is written down, not just the fact',
   /it is a decision rather than a tidy-up/.test(BLD) &&
   /decision rather than a tidy-up/.test(POLICY));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
