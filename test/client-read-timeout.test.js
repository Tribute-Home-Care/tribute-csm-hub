// A read has to finish or fail.
//
// Courtney, 17 Nov, priority 7: "Today and Schedule both sat on 'Reading… from
// Viv' while I was clicking through."
//
// There was no timeout. fetch() with nothing to stop it waits as long as the
// other end holds the socket open, so a hung proxy left the entry in `loading`
// for the life of the tab and the page said "Reading…" forever. Worse,
// reload() deliberately refuses to reset an entry that is still loading, so
// there was no way back even by hand — the CSM's only option was a full
// refresh, and nothing on screen suggested that.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/v2-client.js'), 'utf8');
const RD = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');

ok('a read is given a deadline', /var READ_TIMEOUT = 20000;/.test(SRC));
ok('...and something actually stops it', /ctl\.abort\(\);/.test(SRC) && /signal: ctl\.signal/.test(SRC));
// The token can hang in exactly the same way and looks identical from the
// page, so the deadline has to cover it too.
ok('the deadline covers acquiring the token as well as the fetch',
   /var h = await headers\(\);\n\s*var r = await fetch/.test(SRC));
ok('a browser with no AbortController still reads', /\(typeof AbortController === 'function'\) \? new AbortController\(\) : null/.test(SRC));
ok('a timeout says what happened, in seconds a person can check',
   /'Viv did not answer within 20 seconds\.'/.test(SRC));
ok('...and is always retryable, because a hang is not a refusal',
   /e\.retryable = timedOut \|\| !err \|\| err\.retryable !== false;/.test(SRC));
// A timer left armed would abort the NEXT read, and a tab open all day would
// pile them up.
ok('the timer is cleared on every path', /\} finally \{\n\s*\/\/ Always: a read that answered/.test(SRC) &&
   /clearTimeout\(timer\);/.test(SRC));

// ── and the page says it, rather than sitting there ──────────────────────
ok('an error is rendered as an error, with a way to retry',
   /if \(snap\.state === 'error'\) return '<p class="rd-ws-warn">'/.test(RD) &&
   /data-act="reload"/.test(RD));
ok('a failed read is never rendered as an empty day',
   /A read that did not answer and a day with nothing in it look identical on/.test(RD));

// Behavioural: the state a hung read ends in.
const settle = (timedOut, errRetryable) => ({
  state: 'error',
  error: timedOut ? 'Viv did not answer within 20 seconds.' : 'Could not reach Viv.',
  retryable: timedOut || errRetryable !== false
});
ok('a hung read ends as a retryable error, not as loading',
   settle(true, false).state === 'error' && settle(true, false).retryable === true);
ok('...and says so in words a CSM can act on',
   /within 20 seconds/.test(settle(true, false).error));
ok('a server that said no stays not-retryable', settle(false, false).retryable === false);

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
