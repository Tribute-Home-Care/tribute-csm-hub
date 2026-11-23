// A client opens as its own page, with a way back and a way through.
//
// Courtney, 17 Nov, section 3. Her complaint:
//   "Opening a client keeps the whole list header above it. The client name
//    starts halfway down the screen under the search bar and filters. On the
//    tabs, an empty 'Choose a client to see how they are doing' panel also
//    sits under the list."
// Her fix:
//   "Client opens as its own full page. A bar across the top has a clear
//    '← Back to [list name]' button that returns to the same tab and filter,
//    and Prev / Next buttons with the client's name ('Next · Vance ›',
//    '2 of 9') so CSMs can move through the list they came from without going
//    back each time."
//
// The hazard in this change is not the layout, it is what read the layout.
// The selected client used to be discoverable in the DOM as `.rd-cl-open.sel`,
// a class on the compact list beside an open client. That list no longer
// renders, so anything still looking for it silently finds nothing. The
// router is the one that mattered: it would have lost the client on every
// back, forward and reload.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const ROUTER = strip(fs.readFileSync(path.join(__dirname, '../v2/router.js'), 'utf8'));
const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));
ok('...and so does the stylesheet',
   CSS === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.css'), 'utf8'));
ok('...and the router',
   fs.readFileSync(path.join(__dirname, '../v2/router.js'), 'utf8') ===
   fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/router.js'), 'utf8'));

// ── the page gives way ────────────────────────────────────────────────────
ok('the list pane stands down for an open client',
   /#rd-split\.has-sel \.rd-split-list \{ display: none; \}/.test(CSS) &&
   /#rd-split\.has-sel \{ grid-template-columns: minmax\(0, 1fr\); \}/.test(CSS));
ok('the workspace drops the sticky column it no longer sits in',
   /#rd-split\.has-sel \.rd-split-ws \{[\s\S]{0,140}border-left: none/.test(CSS));
// The marking already existed for the phone layer; what was missing was using
// it at every width, which is where "halfway down the screen" came from.
ok('the page title and filter row stand down too',
   /#page-clients\.rd-client-open > \.rd-list-chrome \{ display: none; \}/.test(CSS));
ok('...and something actually sets that class',
   /page\.classList\.toggle\('rd-client-open', !!_selected\)/.test(CODE));
ok('the legend is marked as chrome, which needs an id to find it',
   /mark\(\$\('#cm-legend', page\)\)/.test(CODE) && /id="cm-legend"/.test(V1));
ok('the empty "choose a client" panel is gone',
   !/Choose a client to see how they are doing/.test(CODE));
ok('...and the pane is hidden rather than left holding nothing',
   /classList\.toggle\('no-ws', !_selected\)/.test(CODE));

// ── the bar ───────────────────────────────────────────────────────────────
ok('the bar is on the page from the start, not only once scrolled',
   /\.rd-cw-bar \{ display: flex; \}/.test(CSS) &&
   /\.rd-ws-back \{[\s\S]{0,180}display: inline-flex;/.test(CSS));
ok('Back names the list you came from', /'<span>Back to ' \+ esc\(viewName\(\)\)/.test(CODE));
ok('...and the name comes from the live view, not a label frozen at selection',
   /function viewName\(\) \{[\s\S]{0,180}VIEWS\.filter/.test(CODE));
// _view, the search and the tier are never cleared by opening a client, which
// is the whole reason Back can return to the same tab and filter.
ok('opening a client does not reset the view or the filters',
   !/_view = 'attention';/.test(CODE.slice(CODE.indexOf('function selectClient'))) &&
   /function selectClient\(cid\) \{\n    _selected = cid;\n    _section = 'overview';/.test(CODE));

// ── prev / next ───────────────────────────────────────────────────────────
ok('Prev and Next are read from the list as it stands',
   /function listPos\(cid\) \{[\s\S]{0,200}rows = trackerRows\(\)/.test(CODE));
ok('the count is her format', /\(pos\.i \+ 1\) \+ ' of ' \+ pos\.n/.test(CODE));
ok('the buttons carry the client name, as she asked',
   /esc\(word\) \+ ' · ' \+ esc\(c\.name\)/.test(CODE));
ok('the ends of the list are disabled, not missing',
   /<button type="button" class="rd-cw-step" disabled/.test(CODE));
ok('...and say why to a screen reader', /aria-label="No ' \+\n?\s*\(dir === 'prev' \? 'earlier' : 'later'\)/.test(CODE));
ok('a client the filter no longer matches simply has no position',
   /if \(i < 0\) return null;/.test(CODE) && /if \(!pos\) return '';/.test(CODE));
ok('stepping through actually selects', /\$\$\('\[data-seq\]', ws\)\.forEach/.test(CODE));
ok('the names give way before the arrows do on a narrow screen',
   /@media \(max-width: 760px\) \{\n  \.rd-cw-step span \{ display: none; \}/.test(CSS));

// ── what read the old markup ──────────────────────────────────────────────
ok('the router asks the module which client is open, not the DOM',
   /window\.TributeRedesign && window\.TributeRedesign\.selected/.test(ROUTER));
ok('...and the module exposes it', /get selected\(\) \{ return _selected; \}/.test(CODE));
ok('a deep link to a filtered-out client still widens the view',
   /#client-master-table \[data-cid="' \+ s\.client \+ '"\]/.test(ROUTER));
ok('nothing still hunts for the compact list anywhere',
   !/rd-cl-open/.test(CODE) && !/rd-cl-open/.test(ROUTER));
ok('selection marking follows the table rows',
   (CODE.match(/\$\$\('#client-master-table \[data-cid\]'\)/g) || []).length === 2);

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
