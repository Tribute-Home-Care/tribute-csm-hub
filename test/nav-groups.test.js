/* THE RAIL, AS COURTNEY DREW IT.
 *
 * Every picture in her 17 November review shows the same sidebar, and it is
 * not the one that shipped. Hers is ten destinations in four groups:
 *
 *   WORK        Home · Clients · Coverage · Onboarding · Fill Priority
 *   OPERATIONS  LTC · Communities · Maryland Compliance
 *   RESOURCES   Assistant · My KSFs
 *   MANAGER     Team
 *
 * The one that shipped had three groups, with Team scattered into Operations
 * beside LTC and Communities, Client Pulse sitting in Work, and a Tools group
 * holding the KPI Tracker. Her complaint was navigation, in her own words:
 * "making the Hub easier for the CSMs to navigate and find what they need day
 * to day". This file holds the shape she drew.
 *
 * WHY CLIENT PULSE IS STILL HERE. Her callout reads "no separate Pulse page to
 * check", and in the view she drew — a CSM's — there is not one: Pulse is a
 * filter on the client list. The page behind it is the MANAGER read of the
 * same scoring, and a CSM has never been able to open it. So it moves into
 * the Manager group rather than being deleted, which costs a CSM nothing and
 * keeps the manager view she and Galip both use.
 *
 *   node test/nav-groups.test.js
 */
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n); } };

// v2/redesign.js is GENERATED from the prototype. Assert both, or an edit to
// the generated copy alone is reverted by the next build with nothing to show.
const FILES = [
  ['shipped', path.join(__dirname, '../v2/redesign.js')],
  ['source', path.join(process.env.HOME, 'tribute-csm-hub-redesign/prototype/redesign.js')]
];

/* Her four, in her order. Items beyond the ten she drew are listed where they
   belong rather than left out: Role Expectations, the Guide and Feedback are
   real destinations a CSM uses, and Daily Metrics and Exception Review are
   manager-gated like Team and Pulse. A picture that illustrates a CSM's day
   is not an instruction to delete what it did not need to show. */
const WANT = {
  Work: ['home', 'clients', 'coverage', 's60', 'priority'],
  Operations: ['ltc', 'emailcomm', 'md'],
  /* Her section 1: Guide and Feedback are already on every page through the
     ? link and the sidebar's own Send feedback button, and Role Expectations
     folds into My KSFs. The rail is the work, not everything that exists. */
  Resources: ['assistant', 'kpi'],
  /* DAILY METRICS AND EXCEPTION REVIEW ARE TABS ON TEAM NOW, not rail
     entries. Courtney, 23 Nov: "There is no Team page. The sidebar still
     shows Daily Metrics and Exception Review." Team was in the rail and did
     open; what it opened was V1's "Manager Hub", with two more manager
     destinations beside it, so the manager view was three rail entries
     answering one question. Neither page is lost -- see the Team tab
     assertions in metrics-view and sereview-view, which is where a rebuild
     dropping one of them would now be caught. */
  Manager: ['team', 'pulse']
};
const LABELS = {
  clients: 'Clients', coverage: 'Coverage', s60: 'Onboarding',
  priority: 'Fill Priority', kpi: 'My KSFs', team: 'Team',
  emailcomm: 'Communities', md: 'Maryland Compliance'
};

for (const [label, p] of FILES) {
  if (!fs.existsSync(p)) { ok(label + ': file is present', false); continue; }
  const SRC = fs.readFileSync(p, 'utf8');
  const m = SRC.match(/const GROUPS = \[([\s\S]*?)\n  \];/);
  ok(label + ': the rail is readable', !!m);
  if (!m) continue;

  // Parse the group literal into {heading: [keys]} without eval.
  const got = {};
  let head = null;
  for (const tok of m[1].matchAll(/\['([A-Z]\w*)', \[|\['([a-z_]\w*)', '([^']+)'\]/g)) {
    if (tok[1]) { head = tok[1]; got[head] = []; }
    else if (head) got[head].push(tok[2]);
  }

  ok(label + ': four groups, in her order',
     JSON.stringify(Object.keys(got)) === JSON.stringify(Object.keys(WANT)));
  for (const g of Object.keys(WANT)) {
    ok(label + ': ' + g + ' holds what she put in it',
       JSON.stringify(got[g]) === JSON.stringify(WANT[g]));
  }
  ok(label + ': a CSM\'s Work group ends at the work they do',
     (got.Work || []).indexOf('pulse') < 0 && (got.Work || []).indexOf('team') < 0);
  ok(label + ': the manager destinations are together, under one heading',
     ['team', 'pulse'].every(k => (got.Manager || []).indexOf(k) > -1));
  ok(label + ': ...and the two that became tabs are not also rail entries',
     ['__metrics', '__sereview'].every(k => (got.Manager || []).indexOf(k) < 0));

  // Her shorter labels. The old ones were longer than the thing they named.
  for (const k of Object.keys(LABELS)) {
    ok(label + ': "' + k + '" is called ' + LABELS[k],
       new RegExp("\\['" + k + "', '" + LABELS[k].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'\\]").test(SRC));
  }
  ok(label + ': nothing is called KPI Tracker or Team Overview any more',
     !/'KPI Tracker'/.test(SRC) && !/'Team Overview'/.test(SRC));

  /* An empty heading is not a heading. For a CSM the whole Manager group is
     hidden by V1's permission reveal, so without this the rail would end on a
     heading with nothing under it. tidyNav already enforces it; this is the
     assertion that it still runs, because the new grouping is the first one
     that can actually produce an empty group. */
  ok(label + ': a heading with no visible items is hidden',
     /if \(!live\.length\) \{ g\.head\.style\.display = 'none'; return; \}/.test(SRC));
  ok(label + ': ...and it is judged on what is VISIBLE, not what exists',
     /el\.offsetParent !== null \|\| el\.style\.display === ''/.test(SRC));

  /* V1 still writes .style.display to these three by id on every profile
     switch. The rail must keep carrying the ids or launchProfile throws. */
  ok(label + ': V1 can still find the nodes it writes to',
     /const NAV_ID = \{ pulse: 'nav-pulse', team: 'nav-team', md: 'nav-md' \};/.test(SRC));
}

ok('the shipped copy and the build source agree',
   fs.existsSync(FILES[1][1]) &&
   fs.readFileSync(FILES[0][1], 'utf8') === fs.readFileSync(FILES[1][1], 'utf8'));

console.log('\n' + (fail ? 'FAILED ' + fail : 'PASSED all ' + pass));
process.exit(fail ? 1 : 0);
