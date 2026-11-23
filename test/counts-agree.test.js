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

/* ── THE RAIL BADGE ───────────────────────────────────────────────────────
   Courtney, section 1: "The Clients badge (18) doesn't match anything a CSM
   sees on Home... I'd make the badge equal the number on the Today's list,
   and nothing else."

   The rail ADDED every signal pointing at a page, so Clients read
   needs-action plus due-soon plus any change of condition: 16 + 6 = 22 on a
   real caseload, a number printed nowhere else in the Hub. A badge has to be
   a number you can go and count. */
ok('one signal owns the Clients badge rather than the rail summing them',
   /view: 'attention', badge: true/.test(CODE));
ok('a claimed badge is not added to', /if \(s\.badge\) by\[s\.go\] = \{ n: s\.n, owned: true \};/.test(CODE));
ok('...and nothing after it can overwrite the claim',
   /if \(by\[s\.go\] && by\[s\.go\]\.owned\) return;/.test(CODE));
ok('a signal with no list behind it carries no badge at all',
   /if \(s\.badge === false\) return;/.test(CODE) &&
   /go: 'priority', badge: false/.test(CODE));
// Behavioural: the two rules, over the shape the real signals have.
const badgeOf = (sigs, key) => {
  const by = {};
  sigs.forEach(s => {
    if (s.badge === false) return;
    if (by[s.go] && by[s.go].owned) return;
    if (s.badge) by[s.go] = { n: s.n, owned: true };
    else by[s.go] = { n: (by[s.go] ? by[s.go].n : 0) + s.n, owned: false };
  });
  return (by[key] && by[key].n > 0) ? by[key].n : '';
};
const REAL = [{ go: 'clients', n: 2 },                       // changes of condition
              { go: 'clients', n: 16, badge: true },          // needs action
              { go: 'clients', n: 6 },                        // due soon
              { go: 'priority', n: 14, badge: false },        // open visits
              { go: 's60', n: 3 }];
ok('the Clients badge is the Needs attention count, not the sum',
   badgeOf(REAL, 'clients') === 16);
ok('Fill Priority carries no number it cannot show you', badgeOf(REAL, 'priority') === '');
ok('a page with one signal is unaffected', badgeOf(REAL, 's60') === 3);
ok('a page with no signal stays blank', badgeOf(REAL, 'ltc') === '');

/* ── THE OPEN VISITS TILE ─────────────────────────────────────────────────
   "The number on each tile is the number of rows you get when you click it."
   The tile counted VISITS and the Today's list groups them by CLIENT, so on
   a real caseload the tile said 53 and its own list said 14. */
ok('the tile counts the clients it will show you',
   /const ovN = Object\.keys\(ovClients\)\.length;/.test(CODE) &&
   /if \(ovN\) out\.push\(\{ n: ovN, label: 'Open visits'/.test(CODE));
ok('...and the visit total is kept, not dropped',
   /sub: plural\(ov\.length, 'visit'\) \+ ' unfilled on my caseload'/.test(CODE));
// Both sides derive the client set the same way, or they drift apart again.
ok('the tile and the list group by the same key',
   (CODE.match(/v\.clientName \|\| v\.client \|\| ''/g) || []).length === 2);

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
