// The client page looks like the rest of the Hub.
//
// Reported against build 11:00: "Cadence, Needs Attention, Today, Next Visit,
// Care Team, Contacts, Quick Care Facts and Community all sit on the bare page
// background with no border", "the Care Plan and Activity tabs have no cards
// either", "contact links are still default browser blue and underlined",
// "there are no lines between contacts or between the Community rows", "the
// header still says Processing", "the '...' button is still an empty box".
//
// Measured on the live build before the fix: .rd-ws-block had background
// rgba(0,0,0,0), border 0px, padding 0px; a contact link computed
// rgb(0, 0, 238) with a full underline; the "..." icon's path bounding box was
// 12.01 x 0 at a 1.5px stroke.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const RD  = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '../v2/redesign.css'), 'utf8');
const ICO = fs.readFileSync(path.join(__dirname, '../v2/icons.js'), 'utf8');
const CSSR = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

// ── every section is a card ───────────────────────────────────────────────
/* The Hub's own card values, read off a live .card: #fff, 1px #E8E4E0, 10px
   radius, 16px/18px padding, 0 1px 2px rgba(35,31,32,.04). */
/* The LAST rule whose selector is exactly .rd-ws-block is the card, because
   it is appended after the original (margin-top and nothing else) and so wins
   on order. indexOf found the rule being replaced; lastIndexOf found the
   nested '.rd-ws-block .rd-ws-block' rule, whose selector ends in the same
   characters. Both were testing the wrong block. */
const blocks = [...CSSR.matchAll(/(?:^|\n)\.rd-ws-block \{([^}]*)\}/g)].map(m => m[1]);
const blk = blocks[blocks.length - 1] || '';
ok('a section on a client page is a card', /\.rd-ws-block \{/.test(CSSR));
ok('...on the Hub\u2019s own card background', /background: #fff;/.test(blk));
ok('...with the Hub\u2019s own outline and radius',
   /border: 1px solid var\(--line\);/.test(blk) && /border-radius: 10px;/.test(blk));
ok('...the Hub\u2019s own padding', /padding: 16px 18px;/.test(blk));
ok('...and the Hub\u2019s one-pixel shadow', /box-shadow: 0 1px 2px rgba\(35, 31, 32, \.04\);/.test(blk));
/* The Care Plan, Activity, Schedule and Team tabs all render through block()
   too, so they are covered by the same rule and need no second one. */
ok('every tab builds its sections with the same helper',
   /function block\(title, body, quiet\) \{[\s\S]{0,200}rd-ws-block/.test(RD));
/* A card drawn inside a card is the failure mode of styling a helper rather
   than a place. */
ok('a nested section does not draw a card inside a card',
   /\.rd-ws-block \.rd-ws-block \{/.test(CSSR));
/* Cadence comes through block() as well. The first pass wrote a
   .rd-cads-card rule for it, which matched nothing. */
ok('Cadence is a section like the others, not a special case',
   /return block\('Cadence',/.test(RD) && !/rd-cads-card/.test(CSSR));

// ── links look like the Hub ───────────────────────────────────────────────
/* .rd-kv dd a already styled a link in a key/value row. A contact is built as
   .rd-con, so that rule never reached it -- the same shape of miss as the
   invented row classes. Stated by what the link IS, not where it sits. */
ok('a phone or email link is styled by what it is',
   /\.rd-ws-block a\[href\^="tel:"\], \.rd-ws-block a\[href\^="mailto:"\],/.test(CSSR));
ok('...in the Hub\u2019s ink rather than browser blue',
   /\.rd-con dd a \{\s*\n?\s*color: var\(--ink\);/.test(CSSR));
ok('...with a rule underline, not the browser\u2019s',
   /text-decoration: none;[\s\S]{0,80}border-bottom: 1px solid var\(--line-2\);/.test(CSSR));

// ── lines between rows ────────────────────────────────────────────────────
/* The contacts had a line all along, on --line (#E8E4E0), which is lighter
   than the floor and so reads as no line at all. The Community rows had none. */
ok('contacts are separated at her floor', /\.rd-con \{ border-top: 1px solid var\(--row-line\);/.test(CSSR));
ok('...and the Community rows now are too', /\.rd-kvs \.rd-kv \{ border-top: 1px solid var\(--row-line\);/.test(CSSR));
ok('...and neither draws a line above the first row',
   /\.rd-con:first-child \{ border-top: 0;/.test(CSSR) && /\.rd-kvs \.rd-kv:first-child \{ border-top: 0;/.test(CSSR));

// ── Viv's status words, said once ─────────────────────────────────────────
ok('there is one translation of Viv\u2019s status words', /function vivStatusLabel\(raw\) \{/.test(RD));
ok('...and "processing" is not one of them',
   /'processing': 'Being set up in Viv'/.test(RD));
ok('the header uses it', /const status = vivStatusLabel\(rawStatus\);/.test(RD));
ok('...and so does Needs attention', /const label = vivStatusLabel\(c\.vivStatus\);/.test(RD));
/* Two copies of the map would be two words for one status again, which is
   the whole bug. */
ok('there is only one copy of the map',
   (RD.match(/'processing': 'Being set up in Viv'/g) || []).length === 1);
ok('a status Viv sends that is not in the list is passed through, not guessed',
   /return t\.replace\(\/\^\.\/, function \(m\) \{ return m\.toUpperCase\(\); \}\);/.test(RD));

// ── the "..." button ──────────────────────────────────────────────────────
/* Three zero-length segments: round caps 1.5px across, technically drawn and
   effectively invisible. */
ok('the icon is still three dots', /more:\s+'M6 12h\.01M12 12h\.01M18 12h\.01'/.test(ICO));
ok('...drawn heavily enough to see', /\.rd-act\[data-menu="more"\] \.ti \{ stroke-width: 3; \}/.test(CSSR));
ok('...beside a word, like every other button in that row',
   /data-menu="more">' \+\s*\n?\s*I\('more'\) \+ '<span>More<\/span>'/.test(RD));

// ── the badge stops flashing a partial count ──────────────────────────────
/* Same gate as the Home tiles, which already wait for Client Pulse. */
ok('the rail badge waits for the same counts the tiles wait for',
   /const v = !countsReady\(\) \? '\\u2014'/.test(RD));
ok('...and says so with the tiles\u2019 em dash, muted',
   /\.nav-item \.nav-cnt\.wait \{ color: var\(--ink-3\)/.test(CSSR));
ok('...and the tiles use that same dash', /<span class="rd-attn-n">\u2014<\/span>/.test(RD));
/* THE BRANCH HAS TO BE REACHABLE. refreshNavCounts is called at the far end of
   renderAttention, past the early return taken when the counts are not ready,
   so while they were not ready it was never called and the badge kept its old
   text. The dash was dead code until the waiting path called it too. Verified
   live before this line was added: forcing the waiting state left the badge
   reading 30. */
ok('...and the waiting path actually calls it',
   /renderAttnWaiting\(el\); refreshNavCounts\(null\); return;/.test(RD));

// ── the leftovers found on 11:27 ─────────────────────────────────────────
/* The "separator" between a contact's phone and email was
   <span class="rd-sub"></span> -- empty, and .rd-sub is display:block
   globally, so it measured 438px and forced a line break between two links
   that were 78px and 117px inside a 445px cell. */
ok('a contact\u2019s phone and email are separated by a separator',
   !/'<span class="rd-sub"><\/span>'/.test(RD) &&
   /'<span class="rd-con-sep" aria-hidden="true">\\u00b7<\/span>'/.test(RD));
ok('...in all three places contacts are built',
   (RD.match(/rd-con-sep/g) || []).length >= 3);
ok('...and it cannot collapse to a block again',
   /\.rd-con-sep \{\s*\n?\s*display: inline;/.test(CSSR));
/* A long email still has to be able to wrap rather than overflow, so the dd
   stays a block and the links stay inline. */
ok('...while a long email can still wrap', !/\.rd-con dd \{[^}]*white-space: nowrap/.test(CSSR));

/* "Needs Attention still repeats the header. Both say 'Being set up in Viv'
   for this client. One is enough." Same rule the Pulse banner already
   follows two blocks above it. */
ok('the Viv status is marked as the thing the header already says',
   /return \{ tone: 'bad', isStatus: true,/.test(RD));
ok('...so the Summary does not say it twice',
   /if \(ex && !ex\.isStatus\) attn\.push\(\{ tone: ex\.tone, text: ex\.text \}\);/.test(RD));
/* Every other exception still earns its place: it carries a date the header
   does not. Dropping all of them would hide an overdue visit. */
ok('...and a cadence exception is still reported',
   /if \(vs === 'never'\) return \{ tone: 'bad', text: 'No visit on record', rank: 1 \};/.test(RD));
/* needsAction drives the badge and the Clients tabs off the same function, so
   the flag must not change what counts -- only what the Summary prints. */
ok('...and what counts as needing action is unchanged',
   /function needsAction\(c\) \{\s*\n\s*const e = exceptionFor\(c\);\s*\n\s*if \(e && e\.tone === 'bad'\) return true;/.test(RD));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
