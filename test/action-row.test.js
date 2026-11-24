// The client page action row.
//
// Four faults reported on 24 Nov, with the first one measured live before the
// fix: the More panel was 9px tall and 190px wide with its items spilling out
// unpainted, and both its top and bottom edges resolved (81.24px / 87.24px).
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const RD  = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const CSSR = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
/* Two helpers, because they answer different questions.

   lastRule: for a property declared more than once under the same selector,
   where order decides the winner -- grid-template-columns, say.

   allRules: for a property declared once, in whichever of several rules that
   share a selector happens to carry it. Non-conflicting declarations spread
   across rules ALL apply, and reading only the last one reported three
   passing rules as broken the moment a second rule with the same selector was
   appended carrying different properties. */
const rulesFor = (sel) => {
  const re = new RegExp('(?:^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'g');
  return [...CSSR.matchAll(re)].map(m => m[1]);
};
const lastRule = (sel) => { const a = rulesFor(sel); return a.length ? a[a.length - 1] : ''; };
const allRules = (sel) => rulesFor(sel).join('\n');

// ── 1. the panel has one edge, not two ───────────────────────────────────
const panel = allRules('.rd-act-menu .rd-menu-list');
ok('the menu opens below its button', /top: calc\(100% \+ 6px\);/.test(panel));
/* The whole fault: an absolutely positioned box with BOTH edges pinned has
   its height forced to the gap. The base rule still sets bottom, for the
   menus that legitimately open upward, so this must clear it explicitly. */
ok('...and the upward edge it inherits is cleared', /bottom: auto;/.test(panel));
ok('...and the base rule still opens upward for the menus that need it',
   /\.rd-menu-list \{[^}]*bottom: calc\(100% \+ 6px\)/.test(CSSR));
ok('...with room to be read', /min-width: 210px;/.test(panel) && /padding: 6px;/.test(panel));
ok('...and rows with room to be pressed',
   /\.rd-act-menu \.rd-menu-list button \{ padding: 9px 12px;/.test(CSSR));

// ── 2. menus that close ──────────────────────────────────────────────────
/* The outside-click handler was registered with { once: true }: it fired on
   the first document click of the session, wherever that landed, and was then
   gone. */
ok('the once-only outside click handler is gone', !/\{ once: true \}\);/.test(RD));
ok('there is one closer for the page', /function installMenuClose\(\) \{/.test(RD) &&
   /let _menuCloseOn = false;/.test(RD));
ok('...installed once, not per render', /if \(_menuCloseOn\) return;\s*\n\s*_menuCloseOn = true;/.test(RD));
ok('...closing on a click outside any menu',
   /if \(e\.target && e\.target\.closest && e\.target\.closest\('\.rd-menu'\)\) return;/.test(RD));
ok('...and on Escape', /if \(e\.key !== 'Escape' \|\| !\$\('\.rd-menu-list\.open'\)\) return;/.test(RD));
/* A keyboard user who dismisses a menu has nowhere to be otherwise. */
ok('...which returns focus to the button that opened it',
   /closeMenus\(true\);/.test(RD) && /if \(focusBtn\) \{ try \{ b\.focus\(\); \} catch \(e\) \{\} \}/.test(RD));
ok('...and the button says whether it is open',
   /b\.setAttribute\('aria-expanded', 'true'\);/.test(RD) &&
   /b\.setAttribute\('aria-expanded', 'false'\);/.test(RD));

// ── 3. the Call label ────────────────────────────────────────────────────
/* "Call Cathy (dtr)" truncated to "Call Cathy (...", spending the width on a
   bracket and then hiding it. The menu header already carries the relationship. */
ok('the label is the first name only',
   /\(first \? 'Call ' \+ esc\(first\) : 'Call'\)/.test(RD));
ok('...while the menu still receives the relationship',
   /const who = first \? first \+ \(fam\.rel \? ' \(' \+ fam\.rel \+ '\)' : ''\) : '';/.test(RD));
ok('...and it is still passed to the button as data-who',
   /callButton\(phone, who, 'rd-act'/.test(RD));

// ── 4. one look, one line, with a primary ────────────────────────────────
const act = lastRule('.rd-cw-acts .rd-act');
ok('the buttons are one line, not a stack', /flex-direction: row;/.test(act));
ok('...and keep a finger-sized height', /min-height: var\(--tap\);/.test(act));
/* button.rd-act { background: none } is (0,1,1) and beat .rd-act at (0,1,0),
   so the two anchors came out white and the four buttons transparent. */
ok('...and all six share one background', /background: #fff;/.test(act));
ok('...which is why the rule had to be scoped to the row',
   /button\.rd-cbtn, button\.rd-act \{ font: inherit; background: none;/.test(CSSR));
/* lastRule escapes the selector itself, so passing a pre-escaped one broke
   the match. Read the rule body straight out of the stylesheet instead. */
const callRule = (CSSR.match(/\.rd-cw-acts \.rd-act\[data-callbtn\] \{([^}]*)\}/) || ['', ''])[1];
ok('Call is the primary button',
   /background: var\(--brand\);/.test(callRule) &&
   /border-color: var\(--brand\);/.test(callRule) &&
   /color: #fff;/.test(callRule));
/* Equal columns were a deliberate earlier fix for uneven widths; widening the
   minimum keeps that and stops the one-line labels clipping. */
ok('...and the equal columns survive, just wider',
   /\.rd-cw-acts \{ grid-template-columns: repeat\(auto-fit, minmax\(146px, 1fr\)\); \}/.test(CSSR));

// ── the two leftovers from 16:31 ─────────────────────────────────────────
/* THE MORE PANEL CLIPPED ITS FIRST LETTER: "dit client", "raft update". It
   carried the `right` class, so the panel extended LEFTWARD from the button's
   right edge -- correct while More was the last button, wrong the moment the
   row wrapped and More became the first on a second line, because the card
   clips and the panel ran past it. Log contact's menu was unaffected: it never
   had the class. */
ok('the More panel is anchored to its button\u2019s left edge',
   /'<div class="rd-menu-list" data-for="more">'/.test(RD) &&
   !/rd-menu-list right" data-for="more"/.test(RD));
/* Left is the DEFAULT, not a lock. Forcing both classes left would stop a menu
   that would run off the OTHER side from flipping, and that is the real risk
   for whichever button ends a wrapped row: a 210px panel on a 184px button
   hangs 26px past one edge or the other. Which edge wins is measured. */
ok('...left is the default for this row\u2019s menus',
   /\.rd-act-menu \.rd-menu-list \{ left: 0; right: auto; \}/.test(CSSR));
ok('...and the flip is still possible',
   /\.rd-act-menu \.rd-menu-list\.right \{ left: auto; right: 0; \}/.test(CSSR));
ok('...decided by measuring against whatever actually clips',
   /function clipBox\(el\) \{/.test(RD) &&
   /if \(o\.overflowX !== 'visible' \|\| o\.overflow !== 'visible'\) return e\.getBoundingClientRect\(\);/.test(RD));
ok('...with the viewport as the fallback',
   /return \{ left: 0, right: window\.innerWidth \};/.test(RD));
ok('...after the panel is open, since a hidden one has no box',
   /list\.classList\.add\('open'\);[\s\S]{0,120}fitMenu\(list, b\);/.test(RD));
/* And if flipping is no better, keep the edge that loses less. */
ok('...and a panel wider than its container does not flap',
   /if \(r\.left < box\.left \+ 4\) list\.classList\.remove\('right'\);/.test(RD));
/* Log contact must keep working, which means not acquiring the class either. */
ok('...and Log contact never had it', /'<div class="rd-menu-list" data-for="log">'/.test(RD));

/* THE ROW WRAPPED FOUR AND TWO on a 1,250px page. A reading measure -- 760px,
   right for prose past 80 characters -- was applied to a row of buttons, and
   760px fits exactly four columns of 184px. */
ok('the prose cap no longer applies to the button row',
   /\.rd-cw-head \.rd-cw-acts \{ max-width: none; \}/.test(CSSR));
ok('...and it still applies to the three that want it',
   /\.rd-ws-body, \.rd-cw-acts, \.rd-cw-addr, \.rd-cw-meta \{ max-width: 760px; \}/.test(CSSR));
/* 6 * 184 + 5 * 8 = 1144px for one line, wrapping below that. */
ok('...so six fit on one line when there is room',
   /grid-template-columns: repeat\(auto-fit, minmax\(146px, 184px\)\);/.test(lastRule('.rd-cw-acts')));
ok('...with the spare width at the end rather than stretched across it',
   /justify-content: start;/.test(lastRule('.rd-cw-acts')));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
