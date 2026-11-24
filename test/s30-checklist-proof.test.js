/* THE SUCCESS IN 30 CHECKLIST ON THE CLIENT PAGE.
 *
 * Courtney, 23 Nov: "The checklist on the client page is unchanged. It has
 * next-step buttons, but no checkboxes with proof, no progress bar, and no
 * All / Mine / CSP filter."
 *
 * The onboarding board has had all three since the 21st. The client page had
 * the next-step button and no way to say the step was done -- and measured on
 * the live caseload, BOTH milestone stores (s60 and s60_ms) were empty for
 * every client in their first thirty days. Nobody had ever ticked a Success
 * in 30 item, because there was nothing to tick, and every client therefore
 * read "0 of 10" and "At risk".
 *
 *   node test/s30-checklist-proof.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const OB = fs.readFileSync(path.join(__dirname, '../v2/v2-onboarding.js'), 'utf8');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

/* ── 1. the progress bar ─────────────────────────────────────────────── */
ok('there is a bar, and it is a real progressbar',
   /class="rd-s30-prog" role="progressbar"/.test(CODE) && /aria-valuenow="' \+ pct/.test(CODE));
ok('...driven by the whole checklist', /const pct = k\.total \? Math\.round\(k\.done \/ k\.total \* 100\) : 0;/.test(CODE));
ok('...and a client with no milestones at all does not divide by zero',
   /k\.total \? Math\.round/.test(CODE));
ok('the overdue figure sits beside the count', /rd-s30-late/.test(CODE) && /\.rd-s30-late \{/.test(CSS));

/* ── 2. All / Mine (CSM) / CSP ───────────────────────────────────────── */
/* _s30Owner returns CSP for a Viv item and CSM for everything else, so her
   three tabs cover the whole list with nothing left over. */
ok('her three tabs, in her words',
   /const S30_WHO = \[\['all', 'All'\], \['CSM', 'Mine \(CSM\)'\], \['CSP', 'CSP'\]\];/.test(CODE));
ok('the filter matches on the row owner', /_s30Who === 'all' \|\| r\.owner === _s30Who/.test(CODE));
ok('...and a week left with nothing is not drawn as an empty box',
   /if \(!items\.length\) return '';/.test(CODE));
/* THE FILTER HIDES ROWS, IT DOES NOT MOVE THE BAR. A CSP looking at their
   own four items should still see the client is two of ten through; a bar
   that moved with the filter would be measuring the filter. */
const header = (CODE.match(/const lateN = k\.weeks\.reduce[\s\S]*?return '<section class="rd-s30[\s\S]*?weeks \+ '<\/section>';/) || [''])[0];
ok('the bar is computed before any filtering and from k, not from the rows shown',
   !!header && !/_s30Who/.test(header.split("rd-s30-who")[0]));
ok('...and the week counts stay the week\'s own counts',
   /<span class="n' \+ \(w\.finished \? ' fin' : ''\) \+ '">' \+ w\.done \+ ' of ' \+ w\.total/.test(CODE));

/* ── 3. checkboxes with proof ────────────────────────────────────────── */
ok('the tick box is a button, not an aria-hidden decoration',
   /data-s30tick="/.test(CODE) && /aria-pressed="/.test(CODE) &&
   !/<span class="rd-s30-b" aria-hidden="true">/.test(CODE));
/* A Viv-synced tick is not pressable: un-ticking it would be overruling the
   system of record from a checklist. s30Checklist sets viv from type. */
ok('a Viv-synced tick is shown but cannot be pressed',
   /r\.done && r\.viv\n?\s*\? '<span class="rd-s30-b done viv"/.test(CODE) && /\.rd-s30-b\.viv \{/.test(CSS));
ok('ticking opens the same proof dialog the onboarding board uses',
   /window\.openS30Proof\(c\.id, id,/.test(CODE) && /function openS30Proof\(cid,id,label,owner\)\{/.test(OB) &&
   /_obProofFor=\{cid,id,kind:'s30'/.test(OB));
ok('...and the dialog knows which list it is saving to',
   /if\(_obProofFor\.kind==='s30'\)\{ saveS30Proof\(na\); return; \}/.test(OB));
/* s30Checklist matches a milestone by `id` on an s60 row and reads
   type!=='TASK' as "Viv picked this up", so a hand tick must be type TASK or
   it would claim to be a sync. */
ok('a hand tick is written as a TASK, which is what makes it read as a person',
   /rows\.push\(\{id,clientId:cid,date:when,type:'TASK'/.test(OB));
ok('...carrying who, when and the note as the proof',
   /const proof=\[who\?\('with '\+who\):'',note\]\.filter\(Boolean\)\.join/.test(OB));
ok('...and it is not written twice if it is already there',
   /if\(!rows\.some\(r=>r\.clientId===cid&&r\.id===id\)\)\{/.test(OB));
/* The whole point of proof: it lands on the CLIENT, so a covering CSM or a
   manager sees it was done the right way without opening the checklist. */
ok('the proof also lands on the client record',
   /outcome:'Success in 30 milestone completed'/.test(OB) && /set\('tasks',tasks\);/.test(OB));
ok('...except when the item was marked not applicable', /if\(!na\)\{\n\s*const tasks=get\('tasks'\)/.test(OB));

/* Un-ticking asks nothing. Making somebody justify a correction is how wrong
   ticks stay on the record. */
ok('un-ticking asks for nothing', /function untickS30\(cid,id\)\{/.test(OB) &&
   /set\('s60',\(get\('s60'\)\|\|\[\]\)\.filter\(r=>!\(r\.clientId===cid&&r\.id===id\)\)\);/.test(OB));
/* V1's own delS60(id) filters on id alone, and these rows carry a MILESTONE
   id rather than a timestamp, so removing by id alone would reach across
   clients. The pair is the key here. */
ok('...and removes the one client\'s row, not every client\'s',
   /r\.clientId===cid&&r\.id===id/.test(OB));

/* ── 4. it repaints without the modules knowing about each other ─────── */
ok('the layer exposes a repaint the onboarding module can call',
   /repaintClient: function \(\) \{ try \{ renderWorkspace\(\); \} catch \(e\) \{\} \}/.test(CODE));
ok('...and the onboarding module calls it rather than reaching into the layer',
   /TributeRedesign\.repaintClient\(\)/.test(OB));
ok('a missing onboarding module says so instead of failing silently',
   /The onboarding module is not loaded, so there is nowhere to record the proof/.test(CODE));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
