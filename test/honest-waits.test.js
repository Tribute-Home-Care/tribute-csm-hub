// Two places the Hub told a reviewer something it could not stand behind.
//
// Both from the 24 Nov sweep, and both are the same fault as the client-page
// one: a wait with no end, and a promise with no backing.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const RD  = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const POL = fs.readFileSync(path.join(__dirname, '../v2/v2-policy.js'), 'utf8');
const V1  = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const CL  = fs.readFileSync(path.join(__dirname, '../v2/v2-client.js'), 'utf8');

// ── 1. "saving works" in a read-only view ────────────────────────────────
/* writesBlocked() is isViewingAs() && !_viewAsUnlocked -- V1's own read-only
   state, which this strip never consulted. It was wrong before too, but
   "writes on" was vague where "saving works" is a promise. */
ok('the strip asks V1 whether writes are blocked at all',
   /typeof window\.writesBlocked === 'function' && window\.writesBlocked\(\)/.test(POL));
/* Scoped to updateBadge: `const sw = App.serverWrite;` appears in more than
   one function, so a whole-file indexOf compared against the wrong one. */
const BADGE = POL.slice(POL.indexOf('function updateBadge()'),
                        POL.indexOf('App.updateWriteBadge = updateBadge;'));
ok('...and that answer is checked before the server states',
   BADGE.indexOf('window.writesBlocked()') > -1 &&
   BADGE.indexOf('window.writesBlocked()') < BADGE.indexOf('const sw = App.serverWrite;'));
ok('...and says read-only, the same word the other read-only state uses',
   /if \(blocked\) \{ el\.textContent = 'read-only'; return; \}/.test(POL));
/* A thrown writesBlocked must not take the badge down with it. */
ok('...and a throw there leaves the badge working',
   /catch \(e\) \{ blocked = false; \}/.test(POL));
/* Nothing else repaints the strip when a view-as starts or ends. */
ok('the badge is refreshed when V1 redraws its view-as banner',
   /window\.renderViewAsBanner = wrapped;/.test(POL) && /wrapped\.__rdBadge = true;/.test(POL));
ok('...and that install survives V1 defining the function later',
   /setInterval\(function \(\) \{ if \(install\(\) \|\| \+\+n > 40\) clearInterval\(t\); \}, 250\)/.test(POL));
ok('...and the state V1 actually uses is the one being read',
   /function writesBlocked\(\)\{ return isViewingAs\(\) && !_viewAsUnlocked; \}/.test(V1));

// ── 2. LTC's wait with no end ────────────────────────────────────────────
/* renderLtc catches a fetch that REJECTS. A fetch that hangs is never caught
   and has no deadline, and Azure's gateway does not cut until 230s. */
ok('V1 still has no timeout on the LTC read',
   /endpoint=ltc_board/.test(V1) &&
   !/ltc_board[\s\S]{0,400}AbortController/.test(V1));
ok('...while the client reads got one for exactly this failure',
   /READ_TIMEOUT/.test(CL) && /new AbortController\(\)/.test(CL));
ok('a watchdog gives the wait an end', /const LTC_DEADLINE = 12000;/.test(RD) &&
   /function watchLtc\(\) \{/.test(RD));
ok('...armed on arrival at that page', /if \(p === 'ltc'\) \{ try \{ watchLtc\(\); \}/.test(RD));
/* It must stand down the moment the read lands, or it would overwrite a
   board that arrived at second eleven. */
ok('...and it stands down as soon as the week arrives',
   /if \(!\/Loading the week\/i\.test\(el\.textContent \|\| ''\)\) return;/.test(RD));
ok('...and only one is ever running', /if \(_ltcWatch\) \{ clearTimeout\(_ltcWatch\); _ltcWatch = null; \}/.test(RD));
/* The distinction this whole review keeps coming back to. */
ok('...and it says unread rather than empty', /It is not empty \\u2014 it is unread\./.test(RD));
ok('...and offers the retry a CSM would reach for', /onclick="renderLtc\(true\)"/.test(RD));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
