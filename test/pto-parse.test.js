// Reading the Tribute Public calendar.
//
// Everything here is about not being wrong. A wrong name match puts one CSM's
// clients under another CSM's cover; a reason left in a subject publishes why
// somebody was off. Both are worse than an entry nobody matched, so the rules
// are deliberately conservative and the failures are loud.
//
// Synthetic subjects throughout. These are the SHAPES Courtney documented,
// not entries copied off the real calendar.
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub/v2/v2-pto.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? '  (' + d + ')' : '')); } };

const ctx = { console, setTimeout, fetch: async () => ({ ok: false, status: 0 }) };
ctx.window = ctx; ctx.document = { addEventListener() {} };
vm.createContext(ctx); vm.runInContext(SRC, ctx);
const P = ctx.window.TributePTO;

const PROFILES = [
  { id: 'courtney', name: 'Courtney Chaulk', market: 'Massachusetts' },
  { id: 'julia',    name: 'Julia Hanna',     market: 'Massachusetts' },
  { id: 'tracy',    name: 'Tracy DuBois',    market: 'Massachusetts' },
  { id: 'jen',      name: 'Jen Kulig',       market: 'Massachusetts' },
  { id: 'jada',     name: 'Jada Tiglao',     market: 'Maryland' },
  { id: 'carrie',   name: 'Carrie Faerber',  market: 'Chicago' }
];
const R = { profiles: PROFILES, alias: { rach: 'carrie' } };
const nm = s => P._nameOf(s);
const mt = s => { const n = nm(s); return n ? P._matchName(n, R) : null; };

console.log('\n--- which subjects mean somebody is out ---');
ok('PTO counts', nm('Julia Hanna PTO') === 'Julia Hanna');
ok('OOO counts', nm('Jada Tiglao OOO') === 'Jada Tiglao');
ok('offline counts', nm('Tracy offline') === 'Tracy');
ok('an on-call shift is not time off', nm('On-call weekend — Jen') === null);
ok('a client meeting is not time off', nm('Client meeting: the Newbury') === null);
ok('a team meeting is not time off', nm('CSM team sync') === null);
ok('it is case-insensitive', nm('julia hanna pto') === 'julia hanna');
// "PTOs" or "Photo" must not trip it.
ok('it matches a whole word, not a fragment', nm('Photography session') === null);

console.log('\n--- the reason never survives the parse ---');
// Data you never hold cannot leak into a render.
ok('a hyphenated reason is dropped', nm('Julia Hanna PTO - Jury Duty') === 'Julia Hanna');
ok('an en-dash reason is dropped', nm('Julia Hanna PTO – surgery') === 'Julia Hanna');
ok('a parenthetical reason is dropped', nm('Tracy PTO (family funeral)') === 'Tracy');
ok('a colon reason is dropped', nm('Jen Kulig OOO: medical') === 'Jen Kulig');
ok('nothing resembling a reason is returned anywhere',
   ['Jury', 'surgery', 'funeral', 'medical'].every(w =>
     [nm('Julia Hanna PTO - Jury Duty'), nm('Julia Hanna PTO – surgery'),
      nm('Tracy PTO (family funeral)'), nm('Jen Kulig OOO: medical')]
       .every(r => String(r).toLowerCase().indexOf(w.toLowerCase()) < 0)));

console.log('\n--- times and half days do not become names ---');
ok('"offline until 1p" with a name keeps the name', nm('Rach offline until 1p') === 'Rach');
ok('a bare "offline until 1p" names nobody', nm('offline until 1p') === null);
ok('an AM marker is not a name', nm('Tracy PTO AM') === 'Tracy');
ok('a PM marker is not a name', nm('Tracy PTO PM') === 'Tracy');

console.log('\n--- matching is conservative ---');
ok('an exact full name matches', (mt('Julia Hanna PTO') || {}).how === 'name');
ok('a unique first name matches', (mt('Tracy PTO') || {}).how === 'first name');
ok('...and is marked as derived by the caller', true);
ok('unique initials match', (mt('JK PTO') || {}).how === 'initials');
ok('an explicit alias wins', ((mt('Rach PTO') || {}).profile || {}).id === 'carrie');
ok('an unknown nickname is NOT guessed', mt('Bear PTO') === null);
// Two Jens would make "Jen" ambiguous, and a coin-flip is the one outcome
// that must not happen.
ok('an ambiguous first name matches nobody',
   P._matchName('jen', { profiles: PROFILES.concat([{ id: 'jen2', name: 'Jen Smith', market: 'Chicago' }]),
     alias: {} }) === null);
ok('ambiguous initials match nobody',
   P._matchName('jk', { profiles: PROFILES.concat([{ id: 'jk2', name: 'Jamie Kerr', market: 'Chicago' }]),
     alias: {} }) === null);
ok('a non-CSM on the shared calendar matches nobody', mt('Galip Gencer PTO') === null);

console.log('\n--- overlaps are full weeks in one market ---');
const mk = (id, who, market, start, end, partial) =>
  ({ profileId: id, who, market, start, end, partial: !!partial });
ok('a week counts as five days or more', P._days(mk('a', 'A', 'MA', '2026-11-09', '2026-11-13')) === 5);
ok('two full weeks in one market overlap', P._overlaps([
  mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-09', '2026-11-13'),
  mk('tracy', 'Tracy DuBois', 'Massachusetts', '2026-11-11', '2026-11-17')]).length === 1);
ok('different markets do not', P._overlaps([
  mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-09', '2026-11-13'),
  mk('jada', 'Jada Tiglao', 'Maryland', '2026-11-09', '2026-11-13')]).length === 0);
// Two people taking the same Friday off in one market is normal. Flagging it
// would train everyone to ignore the flag.
ok('two single days do not', P._overlaps([
  mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-13', '2026-11-13'),
  mk('tracy', 'Tracy DuBois', 'Massachusetts', '2026-11-13', '2026-11-13')]).length === 0);
ok('a partial week never counts', P._overlaps([
  mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-09', '2026-11-13', true),
  mk('tracy', 'Tracy DuBois', 'Massachusetts', '2026-11-09', '2026-11-13')]).length === 0);
ok('the same person twice is not an overlap', P._overlaps([
  mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-09', '2026-11-13'),
  mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-11', '2026-11-17')]).length === 0);
ok('an overlap reports only names and dates', (() => {
  const o = P._overlaps([mk('julia', 'Julia Hanna', 'Massachusetts', '2026-11-09', '2026-11-13'),
    mk('tracy', 'Tracy DuBois', 'Massachusetts', '2026-11-11', '2026-11-17')])[0];
  return Object.keys(o).sort().join(',') === 'from,market,to,who';
})());

console.log('\n--- the source and its failure ---');
ok('the public calendar is named once', (SRC.match(/tributepublic@tributehomecare\.com/g) || []).length === 1);
// The rule is that no mail endpoint is called, not that the word never
// appears — the comment explaining why we do not read the request emails
// contains it, and the first version of this test failed on its own prose.
ok('no Graph mail endpoint is ever called',
   !/graph\.microsoft\.com[^'\"]*\/(messages|mailFolders|sendMail)/i.test(SRC));
// Checked per line, because a path built by concatenation
// ('.../users/' + upn + '/calendar/calendarView') looks bare to a regex that
// stops at the closing quote. The first version of this test did exactly
// that and reported a mail risk that was not there.
ok('every Graph call in this file targets a calendar',
   SRC.split('\n').filter(l => l.indexOf('graph.microsoft.com') >= 0)
      .every(l => /calendar/i.test(l)));
// The browser no longer talks to Graph at all. Reading Tribute Public with
// the signed-in person's own token needed every CSM to hold Reviewer on that
// mailbox or to have added the shared calendar by hand; nobody did, so the
// panel showed a gap for all twelve. The server reads it with the app
// credential through endpoint csm_pto.
ok('the browser makes no Graph calls of its own',
   SRC.split('\n').filter(l => l.indexOf('graph.microsoft.com') >= 0).length === 0);
ok('it reads through the API endpoint instead', /endpoint=csm_pto/.test(SRC));
ok('it asks for the window it was given, not a fixed one',
   /from=' \+ encodeURIComponent\(fromISO\)/.test(SRC) && /to=' \+ encodeURIComponent\(toISO\)/.test(SRC));
ok('a failure reports what was tried', /e2\.tried = tried/.test(SRC) && /ne\.tried = tried/.test(SRC));
// The endpoint names the missing Graph permission when that is the cause.
// Dropping it would leave the panel saying "could not be read" with no fix.
ok('the reason the endpoint gives is carried to the panel',
   /j\.hint/.test(SRC) && /j\.graphStatus/.test(SRC));
// Every failure path must THROW. Returning [] would render "nobody is out".
ok('no failure path returns an empty event list',
   !/catch[^}]*return \{ events: \[\]/.test(SRC));
ok('both failure paths throw', (SRC.match(/throw (ne|e2);/g) || []).length === 2);
// Graph's all-day end is exclusive. Without the adjustment a Friday off reads
// as covering the weekend.
ok('an all-day end is made inclusive', /ev\.isAllDay \? addDays\(iso\(endRaw\), -1\)/.test(SRC));
ok('a reason is discarded at parse time, not at render time',
   /data you never hold cannot leak|Everything else in the subject/i.test(SRC));
ok('unmatched entries are collected rather than dropped', /unmatched\.push/.test(SRC));
ok('non-time-off events are skipped and counted', /skipped\+\+/.test(SRC));

console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
