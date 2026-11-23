// The numbers on the Hub have to mean one thing each.
//
// Courtney's third rule (17 Nov): "If the badge says 9, the list under it has
// 9 clients in it." She found 17 on Home, 18 on the Clients tab and 42 as the
// caseload, all presented as if they answered the same question, and wrote:
// "CSMs stop trusting the Hub fast if 17, 18 and 42 all mean needs attention".
//
// The cause was an overlap, not a bug in any one number. Needs attention
// counted EVERY exception; Due soon counted the warnings; so Due soon's
// clients sat inside Needs attention too. Home has always counted only the bad
// ones as needing action, so the tab could never agree with the tile.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

for (const [label, p] of [['shipped', '../v2/redesign.js'],
                          ['source', path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js')]]) {
  const CODE = strip(fs.readFileSync(path.isAbsolute(p) ? p : path.join(__dirname, p), 'utf8'));
  ok(label + ': the Needs attention COUNT is the bad ones only',
     /attention: all\.filter\(function \(c\) \{ const e = exceptionFor\(c\); return e && e\.tone === 'bad'; \}\)/.test(CODE));
  ok(label + ': the Needs attention LIST matches its own count',
     /if \(_view === 'attention'\) list = list\.filter\(function \(r\) \{ return r\.ex && r\.ex\.tone === 'bad'; \}\)/.test(CODE));
  ok(label + ': Due soon is the warnings', /soon: all\.filter\(function \(c\) \{ const e = exceptionFor\(c\); return e && e\.tone === 'warn'; \}\)/.test(CODE));
  ok(label + ': nothing still counts every exception as needing attention',
     !/attention: all\.filter\(function \(c\) \{ return !!exceptionFor\(c\); \}\)/.test(CODE));
}

// Behavioural: the two views must partition the exceptions, never overlap.
const cl = [{ t: 'bad' }, { t: 'bad' }, { t: 'warn' }, { t: 'warn' }, { t: 'warn' }, { t: null }];
const ex = c => c.t ? { tone: c.t } : null;
const attention = cl.filter(c => { const e = ex(c); return e && e.tone === 'bad'; }).length;
const soon = cl.filter(c => { const e = ex(c); return e && e.tone === 'warn'; }).length;
const anyEx = cl.filter(c => !!ex(c)).length;
ok('needs attention and due soon do not overlap', attention + soon === anyEx);
ok('a client with no exception is in neither', attention + soon === 5 && cl.length === 6);
ok('needs attention equals what Home calls needing action', attention === 2);
ok('the old rule double-counted, which is what she saw', anyEx !== soon && anyEx === 5 && soon === 3);

// Home's tile and the tab now ask the same question of the same data.
const CODE = strip(fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8'));
ok('Home still counts needing action as the bad ones',
   /const bad = exc\.filter\(function \(r\) \{ return r\.ex\.tone === 'bad'; \}\)/.test(CODE));
ok('Home still counts due soon as the warnings',
   /const warn = exc\.filter\(function \(r\) \{ return r\.ex\.tone === 'warn'; \}\)/.test(CODE));
ok('Home sends you to the tab that now agrees with it',
   /tone: 'bad', go: 'clients', view: 'attention'/.test(CODE) && /label: 'Due soon'[\s\S]{0,80}view: 'soon'/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
