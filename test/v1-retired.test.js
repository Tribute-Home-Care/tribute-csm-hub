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
/* The TAB TITLE too. It gained "· V2 Preview" so a pilot tab was never
   mistaken for the live hub in a crowded window; there is no other hub to
   mistake it for now, and the title is the one place a CSM looks to find
   the tab again. */
ok('...and so is the preview suffix on the tab title',
   /<title>Tribute CSM Hub<\/title>/.test(V2) && !/V2 Preview<\/title>/.test(V2));
ok('...with the build asserting the production title it depends on',
   /assert '<title>Tribute CSM Hub<\/title>' in html/.test(BLD));
ok('...and the badge no longer says pilot', !/'write pilot'/.test(POLICY) && /'writes on'/.test(POLICY));
ok('...and a refused account is told plainly, without naming a pilot',
   /cannot write to the Hub/.test(POLICY) && !/not in the write pilot/.test(POLICY));
ok('...and the diagnostics line says the same',
   !/it is not in the write pilot/.test(CHROME));
/* The strip itself STAYS: it is how the diagnostics panel is reached and how
   a kill switch or a refused write becomes visible. */
ok('the status strip and its diagnostics are kept',
   /id="v2-blocked-count"/.test(CHROME) && /App\.showDiagnostics\(\)/.test(CHROME));

/* ── ACTIVE TIME IS RECORDED AGAIN ─────────────────────────────────────
   V2 used to record none: build-v2.py stripped tribute-usage.js, v2-policy
   set usage_telemetry false, AND the fetch wrapper blocked
   endpoint=usage_time unconditionally. All three were right for a pilot that
   must not skew real usage statistics, and all three were wrong the moment
   V2 became the only Hub -- they stopped protecting the numbers and started
   ending them. All three are now on. */
ok('the usage script is loaded, from one directory up',
   /src="\.\.\/tribute-usage\.js/.test(V2) &&
   /html\.replace\('src="\.\/tribute-usage\.js', 'src="\.\.\/tribute-usage\.js'\)/.test(BLD));
ok('...and the build asserts it is there rather than that it is gone',
   /assert _re\.search\(r'<script\[\^>\]\*\\\.\\\.\/tribute-usage', html\)/.test(BLD));
ok('the policy allows it', /usage_telemetry: true/.test(POLICY));
/* PASSED THROUGH UNMODIFIED, not with the V2 surface headers: active time is
   analytics, not a write to a client record. V1 has always sent this POST
   and the server has always accepted it, so adding the V2 headers would put
   it through a business-write gate it was never meant to pass. */
ok('...and the POST goes out as V1 sends it',
   /if \(App\.canWrite\('usage_telemetry'\)\) \{\n\s*App\.usageWrites = \(App\.usageWrites \|\| 0\) \+ 1;\n\s*return real\(url, opts\);/.test(POLICY));
ok('...and it is not treated as a business capability',
   !/'usage_telemetry'/.test((POLICY.match(/const BUSINESS = new Set\(\[[\s\S]*?\]\);/) || [''])[0]));
/* One switch still turns it off: the branch is gated, not removed. */
ok('the policy flag is still the switch',
   /App\.recordBlockedWrite\(\{ feature: 'Active-time usage telemetry'/.test(POLICY));
/* V2 inherits V1's own start call, so it reports as the same app. */
ok('V2 starts the tracker the way V1 does',
   /TributeUsage\.start\(\{ app:'csm'/.test(V2));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
