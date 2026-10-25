// Community Email send: it must be impossible to send twice by accident.
// Still DISABLED for the V2 pilot; this proves the guard before it is trusted.
const fs = require('fs'); const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

console.log('\n--- in-flight guard ---');
ok('a second call while one is running is refused',
   /if\(_ecSending\)\{ _ecMsg\('Still sending/.test(SRC));
ok('the flag is set before the request goes out', /_ecSending=true; _ecSendBtns\(true,'Sending/.test(SRC));
ok('the flag is cleared in a finally, so a failure cannot wedge it',
   /\}finally\{\s*\n?\s*_ecSending=false; _ecSendBtns\(false\);/.test(SRC));

console.log('\n--- the buttons ---');
ok('both send buttons are addressable', (SRC.match(/data-ec-send/g) || []).length === 3);
ok('they are disabled while sending and relabelled', /b\.disabled=!!disabled;/.test(SRC));

console.log('\n--- idempotency key ---');
ok('a key is derived from community, mode, recipients and subject',
   /_ecSendKey\(test,to\)\{[\s\S]{0,200}_ecSel,test\?'test':'real',\(to\|\|\[\]\)\.join\(','\)/.test(SRC));
// The key used to carry the minute, so the same email a few seconds later
// across a minute boundary counted as a different send and went out twice.
ok('no clock in the key: a minute boundary is not a different send',
   !/_ecSendKey\(test,to\)\{[\s\S]{0,260}toISOString/.test(SRC));
ok('a repeat is refused rather than sent',
   /const _sentAt=_ecSentAt\(_key\);[\s\S]{0,120}That exact email already went out/.test(SRC));
ok('the refusal says plainly that nothing was sent',
   /not sending it twice\. Nothing was sent\./.test(SRC));
ok('the record survives a reload, which is when a duplicate actually happens',
   /localStorage\.setItem\('tribute_ec_sent'/.test(SRC) &&
   /localStorage\.getItem\('tribute_ec_sent'/.test(SRC));
ok('the record expires, so a deliberate resend later still works',
   /_EC_SENT_MS=15\*60\*1000/.test(SRC) && /now-m\[k\]<_EC_SENT_MS/.test(SRC));
ok('a blocked localStorage cannot break sending',
   /catch\(e\)\{\}\s*\n\s*const now=Date\.now\(\)/.test(SRC));
ok('the key is recorded only AFTER Graph accepted it',
   /_ecMarkSent\(_key\);\s*\/\/ only after Graph accepted it/.test(SRC));
ok('a failed send does not record the key, so a real retry works',
   SRC.indexOf('_ecSentKeys.add(_key)') < SRC.indexOf("}catch(err){\n    _ecMsg('Send failed"));
ok('failure says plainly that nothing was sent',
   /Nothing was sent; you can try again/.test(SRC));

console.log('\n--- still switched off for the pilot ---');
const POL = fs.readFileSync(path.join(__dirname, '../v2/v2-policy.js'), 'utf8');
ok('community_send is false in the V2 policy', /community_send: false/.test(POL));
ok('ecSend is still gated in V2', /gate\('ecSend'/.test(POL));

console.log('\n' + (fail ? fail + ' FAILED' : 'All ' + pass + ' checks passed') + '\n');
process.exit(fail ? 1 : 0);
