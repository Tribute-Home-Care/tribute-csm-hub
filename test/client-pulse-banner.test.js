// The Pulse flag, at the top of the client page.
//
// Courtney's review, 17 Nov, priority 1: "the most important thing about a
// client is two clicks deep under More > Pulse & Care". Her worked example
// was a client taken by paramedics on 11/11 whose Summary said only "No visit
// on record", because the flag lived under More.
//
// Her rule, kept here: no flag, no banner. A banner that is always on screen
// is wallpaper, and a green client is not news.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const FILES = [['shipped', path.join(__dirname, '../v2/redesign.js')],
               ['source', path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js')]];
for (const [label, p] of FILES) {
  const CODE = strip(fs.readFileSync(p, 'utf8'));
  ok(label + ': the banner renders between the header and the body',
     /wsHeader\(c, snap\) \+ wsPulseBanner\(c, pp\)/.test(CODE));
  ok(label + ': the tabs read Summary, Care Plan, Activity, Schedule',
     /\['overview', 'Summary'\], \['careplan', 'Care Plan'\],[\s\S]{0,60}\['activity', 'Activity'\], \['schedule', 'Schedule'\]/.test(CODE));
  ok(label + ': no raw acknowledgement key can reach the page',
     !/window\.PULSE_ACK_LABEL/.test(CODE) && /function ackLabel\(state\)/.test(CODE));
}
ok('the shipped copy and the build source agree',
   fs.readFileSync(FILES[0][1], 'utf8') === fs.readFileSync(FILES[1][1], 'utf8'));

const CODE = strip(fs.readFileSync(FILES[0][1], 'utf8'));

// Lift the two pure functions and run them.
function lift(decl) {
  const i = CODE.indexOf(decl); if (i < 0) return null;
  let d = 0, on = false;
  for (let j = i; j < CODE.length; j++) {
    const ch = CODE[j];
    if (ch === '{') { d++; on = true; } else if (ch === '}') { d--; if (on && d === 0) return CODE.slice(i, j + 1); }
  }
  return null;
}
const env = new Function('esc', 'pulseHeadline', 'PULSE_ACK_LABEL',
  lift('const ACK_WORDS =') + ';' + lift('function ackLabel(state)') + ';' +
  lift('function wsPulseBanner(c, pp)') + ';return {ackLabel, wsPulseBanner};')(
  s => String(s == null ? '' : s), h => '<p>' + String(h) + '</p>', undefined);
const { ackLabel, wsPulseBanner } = env;

// ── the raw-key bug, which is what she actually saw ───────────────────────
ok('aware_none is never shown raw', ackLabel('aware_none') === 'Nothing needed');
ok('aware_working reads as English', ackLabel('aware_working') === 'Working on it');
ok('aware_1to1 reads as English', ackLabel('aware_1to1') === 'Raising in the 1:1');
ok('an unknown state still never leaks its key',
   ackLabel('something_new') === 'Acknowledged' && ackLabel('') === 'Acknowledged' && ackLabel(undefined) === 'Acknowledged');

// ── no flag, no banner ────────────────────────────────────────────────────
ok('a client with no Pulse read gets no banner', wsPulseBanner({}, null) === '');
ok('a green client gets no banner', wsPulseBanner({}, { level: 'green', headline: 'Fine' }) === '');
ok('a Pulse record with no level gets no banner', wsPulseBanner({}, { headline: 'x' }) === '');

const red = wsPulseBanner({}, { level: 'red', headline: 'Taken by paramedics' });
ok('a red client gets one', red.includes('rd-pb') && red.includes('Needs attention'));
ok('the headline is carried', red.includes('Taken by paramedics'));
ok('an unacknowledged flag offers the three marks',
   ['aware_working', 'aware_1to1', 'aware_none'].every(s => red.includes('data-state="' + s + '"')));
const amber = wsPulseBanner({}, { level: 'amber', headline: 'Watch' });
ok('amber is toned differently and worded differently',
   amber.includes('rd-pb warn') && amber.includes('Watch') && !amber.includes('Needs attention'));

// Acknowledged: settled, not a second alarm, and never a raw key.
const done = wsPulseBanner({ pulseAck: { state: 'aware_working', by: 'Emily Willson' } },
                           { level: 'red', headline: 'x' });
ok('an acknowledged flag shows the words, not the key',
   done.includes('Working on it') && !done.includes('aware_working</') && done.includes('Emily Willson'));
ok('...and offers Undo rather than the three marks again',
   done.includes('ack-clear') && !done.includes('data-state="aware_none"'));

// The buttons must be inside the element the click handler is scoped to.
ok('the handler is scoped to the whole workspace, not just the body',
   /\$\$\('\[data-act\]', ws\)/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
