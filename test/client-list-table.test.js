// The client list as a table.
//
// Courtney, 17 Nov, priority 4: "Rows don't tell you enough. Name, community,
// one status. To see the tier, the last visit, or who to call, you have to
// open the client." Her columns: Client, Tier, Status and why, Last visit,
// Next due, Family contact, Community, sortable.
//
// She also found three filter systems stacked: the Tier and Status dropdowns,
// the market chips, and the five tabs, with the Status dropdown doing the same
// job as the tabs.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const SRC = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CODE = strip(SRC);
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
ok('the shipped copy and the build source agree',
   SRC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js'), 'utf8'));

// ── her columns ───────────────────────────────────────────────────────────
// Read CL_COLS itself rather than every array in the file: the first version
// of this matched VIEWS and ACT_FILTERS too and failed on a correct table.
const colsSrc = (CODE.match(/const CL_COLS = \[([\s\S]*?)\];/) || [])[1] || '';
const cols = [...colsSrc.matchAll(/\['[a-z]*', '([^']+)'\]/g)].map(m => m[1]);
ok('all seven columns are there, in her order',
   JSON.stringify(cols) === JSON.stringify(['Client', 'Tier', 'Status', 'Last visit', 'Next due', 'Family contact', 'Community']));
ok('it renders as a real table with a header row', /<table class="rd-clt"><thead>/.test(CODE));
ok('the client name is a row header, not a cell', /<th scope="row">/.test(CODE));

// ── the stacked filters ───────────────────────────────────────────────────
ok('the Status dropdown is no longer read', !/\$\('#cm-status'\)/.test(CODE));
ok('...and nothing still filters on its values',
   !/sf === 'overdue'/.test(CODE) && !/sf === 'due_soon'/.test(CODE));
ok('search and tier still work', /\$\('#cm-search'\), tEl = \$\('#cm-tier'\)/.test(CODE));

// ── sorting ───────────────────────────────────────────────────────────────
ok('urgency is still the default', /let _sortKey = '', _sortDir = 'asc';/.test(CODE));
ok('clicking the same column reverses it',
   /if \(_sortKey === k\) _sortDir = _sortDir === 'asc' \? 'desc' : 'asc';/.test(CODE));
ok('she can sort by next due, start date and A to Z',
   /_sortKey === 'next'/.test(CODE) && /_sortKey === 'start'/.test(CODE) && /_sortKey === 'name'/.test(CODE));
ok('a header announces its sort state to a screen reader', /aria-sort="/.test(CODE));
// Behavioural: blanks must not sort to the top as if they were the earliest.
const nullsLast = v => (v == null || v === '' ? '￿' : String(v));
const dates = ['2026-03-01', '', null, '2026-01-01'].map(nullsLast).sort();
ok('a client with no date sorts last, not first',
   dates[0] === '2026-01-01' && dates[dates.length - 1] === '￿');
ok('tier sorts High, Medium, Low rather than alphabetically',
   /const o = \{ High: 0, Medium: 1, Low: 2 \};/.test(CODE));

// ── the assessment highlight, an action item from 12 Nov ───────────────────
ok('an assessment due within a week is marked', /Assessment due/.test(CODE) && /\.rd-clt-row\.due/.test(CSS));
ok('days-until is derived from days-since rather than a helper that does not exist',
   /const until = nv \? -daysSince\(nv\) : null;/.test(CODE));
ok('a date already past is not called due within a week', /until >= 0 && until <= 7/.test(CODE));

/* ── the family contact column ─────────────────────────────────────────────
   Courtney's Clients picture gives every row "Lisa Pike (dtr)" with a Call
   and an Email beside it. The column shipped reading c.contact, which is
   empty on every client in production because CSMs keep contacts in Viv, so
   it was blank on all forty-two rows.

   THE CONSTRAINT THAT PUT IT THERE STILL HOLDS: a Viv read per row would be
   a call per client on every keystroke in the search box. It is satisfied a
   different way now. The caseload-wide crawl is asked for ONCE per session by
   primeContacts(), and the cell reads that cache; it never fetches. */
const CELL = (CODE.match(/function contactCell\(c\)[\s\S]*?\n  \}/) || [''])[0];
ok('the contact cell reads the primed cache', /TributeClientData\.contacts\(c\.vivId\)/.test(CODE));
ok('...and never fetches, per row or otherwise',
   !!CELL && !/fetch\(|primeContacts\(|TributeClientData\.ready\(/.test(CELL));
ok('the crawl is still asked for once, not per render',
   /if \(bulkState === 'loading' \|\| bulkState === 'ready'\) return/.test(
     fs.readFileSync(path.join(__dirname, '../v2/v2-client.js'), 'utf8')));
/* CALL IS A CHOICE OF LINE, NOT A LINK. Courtney: "Call has no recorded or
   non-recorded line choice. On the list and the client page it is a plain
   phone link." Recorded means placed through Teams, which the call recorder
   captures; not recorded is the plain handset link. It is never a default:
   a recorded call is one a family may be told about, so the CSM picks. */
ok('a call offers the two lines rather than dialling one',
   /function callButton\(phone, who, cls, label\)/.test(CODE) &&
   /acts\.push\(callButton\(f\.phone/.test(CODE));
ok('...the recorded line goes through Teams',
   /teams\.microsoft\.com\/l\/call\/0\/0\?users=4:/.test(CODE) &&
   /Call on recorded line/.test(CODE));
ok('...and the other is the plain handset link, named as not recorded',
   /function telHref\(p\)/.test(CODE) && /Call \(not recorded\)/.test(CODE));
/* A number Teams cannot dial must not silently become a non-recorded call.
   e164() returns null rather than guessing, and the menu says so. */
ok('a number Teams cannot dial says so instead of guessing',
   /Recorded line unavailable/.test(CODE) &&
   /return null;   \/\/ not a number we can hand to Teams with any confidence/.test(SRC));
// Behavioural, over the shapes the roster actually holds.
const e164 = (p) => {
  const d = String(p || '').replace(/\D+/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  if (String(p || '').trim().charAt(0) === '+' && d.length > 7) return '+' + d;
  return null;
};
ok('a ten digit number becomes E.164', e164('6178773313') === '+16178773313');
ok('...however it was punctuated', e164('(617) 877-3313') === '+16178773313');
ok('...and a leading 1 is not doubled', e164('16178773313') === '+16178773313');
ok('an extension or a fragment is not dialled', e164('x412') === null && e164('') === null);
ok('an email is a real mailto', /href="mailto:' \+ esc\(f\.email\)/.test(CODE));

/* "NOT READ YET" IS NOT "NO CONTACT". The column was blank on every row and
   blank reads as "nobody to call". While the crawl is still warming the cell
   has to say so, or it tells the CSM something false about their client. */
ok('a cell with nothing yet says which kind of nothing it is',
   /warming \? 'Reading\\u2026' : 'None on file'/.test(CODE));
ok('...and asks the module, rather than assuming', /TributeClientData\.contactsState\(\) !== 'ready'/.test(CODE));

/* Her picture writes "(dtr)". Viv's rrel is free text, so only relationships
   actually seen are shortened and anything else prints as stored. The three
   placement words are not relationships and must not sit in the bracket. */
ok('relationships are shortened from a list, not guessed at', /const REL_SHORT = \{/.test(CODE));
ok('...and Viv\'s placement words never reach the bracket',
   /if \(k === 'primary' \|\| k === 'emergency' \|\| k === 'family'\) return '';/.test(CODE));
ok('...and an unknown relationship is printed, not dropped',
   /return String\(r\)\.trim\(\);/.test(CODE));

/* ── HER DESIGN, NOT JUST HER COLUMNS ─────────────────────────────────────
   The columns matched her picture and the page still did not look like it.
   Four reasons, all of them V1 bleeding through the redesign layer, and each
   one is asserted here because each came back once already.

   1. V1 carries a bare `th { text-transform: uppercase; font-size: 10.5px;
      background: #F7F4EF }` written for column HEADINGS. The client name is a
      `<th scope="row">`, correctly, for screen readers. So every client was
      printed SHOUTING, small and on a tinted cell: "NANCY MUNSON" where her
      picture has "Nancy Munson". Reset on the redesign table rather than by
      weakening V1's rule, which other tables rely on. */
ok('the client name is not styled as a column heading',
   /\.rd-clt th\[scope="row"\] \{[\s\S]{0,200}text-transform: none;/.test(CSS) &&
   /\.rd-clt th\[scope="row"\] \{[\s\S]{0,200}background: none;/.test(CSS));

// 2. Tier is a category, not a word you read. Her picture pills it.
ok('tier is a pill with a tone', /class="rd-tier ' \+ esc\(String\(c\.tier\)\.toLowerCase\(\)\)/.test(CODE) &&
   /\.rd-tier\.high \{/.test(CSS) && /\.rd-tier\.medium \{/.test(CSS) && /\.rd-tier\.low \{/.test(CSS));

// 3. Her Status column leads with a coloured dot, so a red row is findable
//    without reading a word. The dot inherits the tone, so there is still
//    exactly one place deciding what tone a row is.
ok('the status leads with a dot', /<i class="rd-dot"><\/i>/.test(CODE));
ok('...and the dot takes its colour from the tone, not a second rule',
   /\.rd-dot \{[\s\S]{0,200}background: currentColor;/.test(CSS));

// 4. Call and Email are buttons in her picture. A bare link under a name
//    reads as part of the name; a button reads as a thing you press.
ok('call and email are buttons', /callButton\(f\.phone[\s\S]{0,80}'rd-cbtn'\)/.test(CODE) &&
   /class="rd-cbtn rd-mailbtn" href="mailto:/.test(CODE) && /\.rd-cbtn \{/.test(CSS) &&
   /button\.rd-cbtn, button\.rd-act \{/.test(CSS));

/* EMAILING THE FAMILY FROM THE LIST COUNTS. Her section 3: "Both log to the
   client's Activity automatically, so a quick call from the list still counts
   as a touchpoint." The one a CSM does not come back to log is the one that
   stops counting. */
ok('emailing from the list writes a touchpoint',
   /function logEmailTouchpoint\(cid\)/.test(CODE) && /type: 'EMAIL'/.test(CODE) &&
   /set\('touchpoints', tps\)/.test(CODE));
ok('...and refuses in a read-only View as session, like every other write',
   /if \(typeof writesBlocked === 'function' && writesBlocked\(\)\) return;/.test(CODE));
ok('...and records who actually did it',
   /typeof actorStamp === 'function' \? actorStamp\(\) : \{\}/.test(CODE));

/* ONE FILTER ROW, her words: "One filter row. Replaces 2 dropdowns + 5 tabs +
   market chips + unused legend." The market sat in a chip bar of its own
   ABOVE the chips and the tier in a select above that, so the page carried
   three rows of filters where she drew one. */
ok('the market is a dropdown at the end of the chip row, not a row of its own',
   /sel\.id = 'rd-mkt-sel';/.test(CODE) && /viewBar\.appendChild\(bar\);/.test(CODE));
ok('...and the tier select is moved into the same row',
   /const tier = document\.getElementById\('cm-tier'\);/.test(CODE) &&
   /viewBar\.appendChild\(tier\);/.test(CODE));
ok('...with V1\'s inline width stripped, since inline beats any stylesheet',
   /tier\.removeAttribute\('style'\);/.test(CODE));
/* IT ADOPTS THE BAR RATHER THAN BUILDING ONE. V1 creates #julia-mkt-bar
   itself, so the first version of this, which built its own and guarded on
   the id, never ran: whichever fired first won and it was V1s. It also ran
   before #rd-views existed, so it had nothing to append to. */
ok('it takes whatever bar is there, whoever built it',
   /const bar = document\.getElementById\('julia-mkt-bar'\);/.test(CODE) &&
   !/if \(app\.profile\.dualMarket && !/.test(CODE));
/* THE CHIPS GET THEIR OWN BOX. They are repainted on every render, and the
   chrome moves V1's live search box and selects into the same row. Setting
   innerHTML on the row itself DESTROYED them on the first repaint: the search
   box vanished and getElementById('cm-search') returned null from then on, so
   nothing could put it back. Caught on the live page, not by a test. */
ok('only the chips are repainted, not the row holding the moved controls',
   /chips\.innerHTML = VIEWS\.map/.test(CODE) && !/viewBar\.innerHTML = VIEWS\.map/.test(CODE));
ok('...and the chips live in a box of their own', /chips\.id = 'rd-chips';/.test(CODE));
ok('...which is the tablist now, since the row holds more than tabs',
   /chips\.setAttribute\('role', 'tablist'\)/.test(CODE) &&
   !/viewBar\.setAttribute\('role', 'tablist'\)/.test(CODE));
ok('the moved search is still labelled for a screen reader',
   /search\.setAttribute\('aria-label', 'Search clients'\)/.test(CODE));
ok('...and runs after the chip row exists, not before',
   CODE.indexOf('ownClientsChrome(viewBar);') > CODE.indexOf('let viewBar = '));
ok('...and the chip row lays out as one row', /#rd-views \{ display: flex;/.test(CSS));
/* The market buttons stay in the DOM, hidden: V1 writes to #mfb-all and
   friends when it resets the filter, and removing them would throw there. */
ok('the market buttons V1 writes to are hidden, not deleted',
   /\.mfb-btn', bar\)\.forEach\(function \(b\) \{ b\.hidden = true; \}\);/.test(CODE));
ok('...and the dropdown drives them, so one thing still owns the filter',
   /try \{ setJuliaFilter\(v, btn\); \} catch \(e\) \{\}/.test(CODE));
ok('...and follows the filter if something else changes it',
   /cur\.value !== A\(\)\.juliaMarket\) cur\.value = A\(\)\.juliaMarket;/.test(CODE));

/* Her client-page callout: "Call" dials the family contact, not just the
   client, and the button says whose number it is. On a client living in a
   community the first number on the record is often the community's. */
ok('the client page prefers the family contact to dial',
   /const phone = \(fam && fam\.phone\) \|\| ct\.phone/.test(CODE));
ok('...and names who it is about to call', /\? 'Call ' \+ esc\(who\) : 'Call'/.test(CODE));
ok('there is no Call button that cannot dial',
   !/>Call</.test((CODE.match(/function clientListTable[\s\S]*?\n  \}/) || [''])[0]));

// ── one shape, because the client is now its own page ─────────────────────
// This asserted the split: the table with nothing selected, a compact list
// beside an open client. Section 3 asked for the client to open as its own
// full page, so there is no "beside" left and no second shape of the list.
ok('the table is the list, at every width', /el\.innerHTML = clientListTable\(rows\);/.test(CODE));
ok('the compact list is gone, not left unreachable',
   !/clientListCompact/.test(CODE));
/* A ROW opens a client, and only a row. This bound every [data-cid] in the
   table, which now includes the Email link inside one: pressing Email would
   have opened the draft AND navigated away from the list. */
ok('rows still open a client', /\$\$\('tr\[data-cid\]', el\)/.test(CODE));
ok('...and the Email link does not also navigate',
   /\$\$\('\.rd-mailbtn', el\)/.test(CODE) && /ev\.stopPropagation\(\);/.test(CODE));

/* C2. THE PULSE REASON ON THE ROW, joined here rather than scraped off Home:
   the Clients page has to be right when Home has never been opened. */
ok('a flagged client says why, under the status',
   /class="rd-clt-pl"/.test(CODE) && /<b>Pulse:<\/b>/.test(CODE));
ok('...clamped to two lines, with the rest on hover',
   /\.rd-clt-pl \{[\s\S]{0,200}-webkit-line-clamp: 2;/.test(CSS));
/* THE STATUS CELL HOLDS A LABEL, NEVER A SENTENCE. A client flagged by
   Pulse with a healthy cadence has no exception, so `ex || ps` put the whole
   Pulse sentence into .rd-cl-ex, which was white-space: nowrap. One sentence
   stretched the column to about 800px and pushed Last visit, Next due, Family
   contact and Community off the screen. */
ok('the status says what kind of thing it is, not the whole sentence',
   /const stText = ex \? ex\.text : \(ps \? 'Pulse flag' : ''\);/.test(CODE));
ok('...and every flagged row carries the sentence on the clamped line',
   /\(ps \? '<div class="rd-clt-pl"/.test(CODE));
ok('...and nothing in that cell can widen the column again',
   /\.rd-cl-ex \{[\s\S]{0,220}white-space: normal; max-width: 34ch;/.test(CSS));

/* D. VIV'S OWN WORDS ARE NOT THE HUB'S. "Processing" is the status string Viv
   sets while a client is being set up, and it appeared on the Clients list
   meaning nothing to the CSM reading it. */
ok('Viv\'s processing status is said plainly',
   /'processing': 'Being set up in Viv'/.test(CODE) && !/'processing': 'Processing'/.test(CODE));
// The three stacked filter systems she counted: the Status dropdown had
// already stopped being read, which left a control that did nothing.
ok('the dead Status dropdown and the unused legend are out of sight',
   /#page-clients #cm-status, #page-clients #cm-legend \{ display: none; \}/.test(CSS));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
