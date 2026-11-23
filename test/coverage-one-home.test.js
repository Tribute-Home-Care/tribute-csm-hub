// One home for coverage, one page for communities.
//
// Courtney, 17 Nov, section 5: "Coverage is in five places: My Clients, Team
// Coverage, Handoffs, Communities, and the Coverage updates tab on the Clients
// page." Her fix, in her words:
//   - "Put Handoffs at the top as a 'Going out?' bar (covering CSM, dates,
//      Hand off). Tabs become: My clients, Clients I'm covering, Team notes."
//   - "Communities moves to its own page."
//   - "Remove the Coverage updates tab from the Clients page."
// And section 9: "one Communities page under Operations, instead of Community
// Email plus a Communities tab on Coverage. List on the left, Mine by default."
//
// Five places, three of them merged into two pages. What this guards is that
// the merge did not strand anything: every control that was on a tab that no
// longer exists still has somewhere to be, and every caller that used to open
// one still lands somewhere real.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

const V1 = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const V2 = fs.readFileSync(path.join(__dirname, '../v2/index.html'), 'utf8');
const RD = fs.readFileSync(path.join(__dirname, '../v2/redesign.js'), 'utf8');

for (const [label, SRC] of [['V1', V1], ['V2', V2]]) {

  // ── the three tabs, in her order ────────────────────────────────────────
  const tabs = [...SRC.matchAll(/setCovTab\('([a-z]+)',this\)">([^<]+)</g)].map(m => [m[1], m[2].trim()]);
  ok(label + ': three tabs, in her order',
     JSON.stringify(tabs) === JSON.stringify([['mine', '\u{1F4DD} My clients'],
                                              ['covering', '\u{1F91D} Clients I\'m covering'],
                                              ['team', '\u{1F465} Team notes']]));
  ok(label + ': each tab has a panel to show',
     ['mine', 'covering', 'team'].every(t => SRC.includes('id="cov-tab-' + t + '"')));
  ok(label + ': the Handoffs and Communities panels are gone',
     !SRC.includes('id="cov-tab-handoff"') && !SRC.includes('id="cov-tab-communities"'));

  // ── the bar, above the tabs ─────────────────────────────────────────────
  const goingAt = SRC.indexOf('class="card cov-going"');
  const tabsAt = SRC.indexOf('setCovTab(\'mine\'');
  ok(label + ': the Going out? bar exists', goingAt > -1);
  ok(label + ': ...and it is above the tabs, not inside them',
     goingAt > -1 && tabsAt > -1 && goingAt < tabsAt);
  // Nothing from the old Handoffs panel may be left behind: these four are
  // what startHandoff() reads, and a missing one throws on the covering CSM.
  ok(label + ': every field the handoff reads is still on the page',
     ['ho-csm', 'ho-to', 'ho-note', 'ho-all', 'ho-picker'].every(id => SRC.includes('id="' + id + '"')));
  ok(label + ': handing off and ending it are both still reachable',
     /onclick="startHandoff\(\)"/.test(SRC) && /onclick="endHandoff\(\)"/.test(SRC));
  // The bar is on screen the moment Coverage opens, but the Covering CSM
  // dropdown is filled by renderHandoffPicker(), which used to run only when
  // somebody clicked the Handoffs tab. On a bar, that is an empty dropdown.
  ok(label + ': the covering-CSM dropdown is filled when the page opens',
     /coverage:\(\)=>\{syncCov\(\);renderCovSummary\(\);renderTeamCoverage\(\);renderHandoffPicker\(\);\}/.test(SRC));
  // ...and it must survive being called before anyone has signed in, or the
  // whole page render goes down with it. Found by opening the page, not by
  // reading the diff.
  ok(label + ': filling it cannot throw when no profile is chosen',
     /if\(typeof P==='undefined'\|\|!P\)return;\n  const sel=document\.getElementById\('ho-csm'\);/.test(SRC));
  ok(label + ': the client picker is folded, not dropped',
     /<details class="cov-going-which">/.test(SRC) && /id="ho-picker"/.test(SRC));
  ok(label + ': "Clients I\'m covering" kept its list',
     /id="cov-tab-covering"[\s\S]{0,400}id="ho-covering"/.test(SRC));

  // ── old names still land somewhere ──────────────────────────────────────
  ok(label + ': a call for the old Handoffs tab forwards to Covering',
     /if\(tab==='handoff'\)tab='covering';/.test(SRC));
  ok(label + ': a call for the old Communities tab opens the Communities page',
     /if\(tab==='communities'\)\{ showPage\('emailcomm'/.test(SRC));
  ok(label + ': an unknown tab name cannot blank the page',
     /if\(COV_TABS\.indexOf\(tab\)<0\)tab='mine';/.test(SRC));
  // setCovTab used to be handed `this`. Forwarded calls arrive without it, or
  // with the caller's own button, so the tab to light is looked up.
  ok(label + ': the right tab lights up even when the caller passed nothing',
     /const want=document\.querySelector\('#page-coverage \.tab\[onclick\*=/.test(SRC) &&
     /\(want\|\|el\|\|\{classList:\{add\(\)\{\}\}\}\)\.classList\.add\('active'\)/.test(SRC));
  ok(label + ': the covering banner no longer points at a tab by position',
     !/\.tab:nth-child\(3\)/.test(SRC));

  // ── one Communities page ────────────────────────────────────────────────
  ok(label + ': the page is called Communities', /<h2>\u{1F3D8}\u{FE0F} Communities<\/h2>/u.test(SRC));
  ok(label + ': the rail says Communities too',
     /showPage\('emailcomm',this\)[^>]*>[\s\S]{0,80}Communities</.test(SRC));
  ok(label + ': the tracker came with it', /id="cm-tracker"/.test(SRC) && /id="cm-tr-mine"/.test(SRC));
  ok(label + ': so did the contacts by level of care', /id="cm-dir-detail"/.test(SRC));
  ok(label + ': the Friday draft is still there', /id="ec-detail"/.test(SRC));
  ok(label + ': one list drives both halves',
     /_cmDirSel=n;/.test(SRC) && /renderEmailCommList\(\);renderEmailCommDetail\(\)/.test(SRC));
  ok(label + ': the second community list is gone, not just hidden',
     !SRC.includes('id="cm-dir-list"') && !/function renderCommunityList\(/.test(SRC));
  ok(label + ': the signal that list carried moved onto the one that stayed',
     /needs contacts/.test(SRC));
  ok(label + ': the list opens on Mine', /let _ecOwnerFilter='mine';/.test(SRC));
  ok(label + ': ...and a CSM who owns none still sees their market',
     /_ecFellBack=true;_ecOwnerFilter='all';/.test(SRC));
  ok(label + ': selectCommunity routes to the page rather than assuming it is open',
     /function selectCommunity\(name\)\{[\s\S]{0,260}showPage\('emailcomm'/.test(SRC));
  // "Other" and "Community at Large" are Viv SERVICE TYPES, not buildings.
  // The tracker had always hidden Private Home; the list had not, so Other sat
  // near the top of it with eight clients behind it and no one to call.
  ok(label + ': Viv service types are not listed as communities',
     /function _cmIsServiceType\(n\)\{/.test(SRC) &&
     /\^\(other\|community at large\|private home\|home\)\$/.test(SRC));
  ok(label + ': ...in the tracker and in the list, from one definition',
     (SRC.match(/_cmIsServiceType\(/g) || []).length === 3);
  ok(label + ': the contacts panel stays shut until a community is picked',
     /dw\.style\.display=_ecSel\?'':'none'/.test(SRC));
}

// ── the Guide describes the pages as they are now ─────────────────────────
// A guide that still names four Coverage tabs is worse than no guide: a CSM
// hunts for a tab that is gone and concludes the Hub is broken. The two stale
// screenshots were dropped rather than relabelled, because an alt attribute
// describing something the image does not show misleads a screen reader.
//
// NOTE FOR THE NEXT EDITOR: guide-content.js is maintained in v2/ and the
// prototype copy is GENERATED from it by build-v2.py. An edit to the prototype
// is silently reverted by the next build. This test reads the v2 copy.
const GC = fs.readFileSync(path.join(__dirname, '../v2/guide-content.js'), 'utf8');
const covEntry = GC.slice(GC.indexOf('    coverage: {'), GC.indexOf('    s30: {'));
ok('the Guide no longer lists a Handoffs tab under Coverage', !/h: 'Handoffs'/.test(covEntry));
ok('...and lists the Going out? bar instead', /h: 'Going out\?'/.test(covEntry));
ok('...and the three tabs that are actually there',
   /h: 'My clients'/.test(covEntry) && /covering'/.test(covEntry) && /h: 'Team notes'/.test(covEntry));
ok('the stale Coverage screenshot is gone, not relabelled',
   !/guide-coverage\.png/.test(covEntry));
ok('the Guide calls the page Communities', /title: 'Communities'/.test(GC) && !/title: 'Community Email'/.test(GC));
ok('...and says what moved onto it', /h: 'Who to call'/.test(GC) && /h: 'Last on site'/.test(GC));
ok('the rail description matches the rail', /LTC, Communities and Team/.test(GC));
ok('the prototype copy is in step with the v2 source of record',
   GC === fs.readFileSync(path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/guide-content.js'), 'utf8'));

// ── V2 no longer offers Coverage updates as a client tab ──────────────────
ok('the Coverage updates view is gone from the client list', !/'Coverage updates'/.test(RD));
ok('nothing still navigates to Coverage to reach a community',
   !/data-page="coverage"\]'\); if \(nv\) nv\.click\(\);\s*\n\s*setTimeout\(function \(\) \{ (const g = call\('selectCommunity'\)|if \(typeof window\.selectCommunity)/.test(RD));
ok('the rail icon follows the page it now opens', /emailcomm: 'community'/.test(RD));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
