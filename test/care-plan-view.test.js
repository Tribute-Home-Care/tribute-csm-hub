// The Care Plan tab.
//
// Courtney asked for this tab's content and ORDER to stay exactly as they are,
// so nothing here reorders, rewords or drops an answer. What changed is the
// separation, and one correctness bug.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const RD  = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const CSSR = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

// ── the answer has three shapes, and they are read, not invented ─────────
ok('an answer is parsed into the shapes it already has', /function cpAnswer\(a\) \{/.test(RD));
ok('...bullets become a real list',
   /<ul class="rd-cp-ul">/.test(RD) && /'<li>' \+ esc\(x\) \+ '<\/li>'/.test(RD));
/* A short unpunctuated line is a heading only when it HEADS something. One at
   the very end is just a short answer. */
ok('...a short unpunctuated line becomes a sub-heading only if it heads something',
   /const heads = i < lines\.length - 1 &&/.test(RD) &&
   /l\.length <= 48 &&/.test(RD) &&
   /!\/\[\.!\?,;:\]\$\/\.test\(l\)/.test(RD));
ok('...and everything else stays prose', /'<p class="rd-cp-p">' \+ esc\(l\) \+ '<\/p>'/.test(RD));
/* Every branch escapes. An unescaped care plan would be an injection straight
   from a Viv form into the page. */
ok('...and every branch escapes what it prints',
   (RD.match(/esc\(l\)/g) || []).length >= 2 && /esc\(x\)/.test(RD) &&
   !/<p class="rd-cp-p">' \+ l \+/.test(RD));
ok('the row renders through it', /'<\/dt><dd>' \+ cpAnswer\(it\.a\) \+ '<\/dd><\/div>'/.test(RD));
/* pre-line plus real markup would double every gap. */
ok('...and pre-line is turned off now there is markup',
   /\.rd-cp-kvs \.rd-kv dd \{ white-space: normal; \}/.test(CSSR));

// ── separation ───────────────────────────────────────────────────────────
ok('each section is a card', /\.rd-cp-sec \{[\s\S]{0,140}border: 1px solid var\(--row-line\);/.test(CSSR) &&
   /border-radius: 12px;/.test(CSSR));
ok('...with 14px between cards', /margin-top: 14px;/.test(CSSR));
ok('...and a shaded heading bar on both section shapes',
   /\.rd-cp-sec > h5,\s*\n\.rd-cp-fold > summary \{\s*\n\s*background: #F3EEE7;/.test(CSSR));
ok('rows are 230px and the rest', /grid-template-columns: 230px minmax\(0, 1fr\);/.test(CSSR));
ok('...with her padding and gap', /gap: 20px;/.test(CSSR) && /padding: 12px 16px;/.test(CSSR));
ok('...zebra on alternate rows', /\.rd-cp-kvs \.rd-kv:nth-child\(even\) \{ background: var\(--row-zebra\); \}/.test(CSSR));
ok('labels and answers at her sizes',
   /dt \{ font-weight: 600; color: var\(--ink\); font-size: 13\.5px; \}/.test(CSSR) &&
   /dd \{ font-size: 14px; line-height: 1\.5; \}/.test(CSSR));
/* The Summary tab already overrides the 760px prose cap the same way. */
ok('the tab is wider', /\.rd-ws-body:has\(\.rd-cp-head\) \{ max-width: 960px; \}/.test(CSSR));

/* TWO DEPARTURES FROM THE REQUEST, both recorded in the stylesheet: the row
   line is #DDD6CC and not the #E4DED6 asked for, because #E4DED6 is LIGHTER
   than Courtney's own floor; and zebra is the Hub's one shade. */
ok('row lines respect her floor rather than the lighter value asked for',
   !/#E4DED6/.test(CSSR) && /border-top: 1px solid var\(--row-line\);/.test(CSSR));
ok('...and the floor is still what it was', /--row-line: #DDD6CC;/.test(CSSR));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
