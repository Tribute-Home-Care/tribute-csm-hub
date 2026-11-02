/* The redesign rail replaces V1's sidebar, but V1's own code keeps writing
 * to the elements that were in it.
 *
 * launchProfile() sets .style.display on the nav elements for EVERY profile
 * it opens, unguarded. rebuildNav() preserved nav-pulse / nav-team / nav-md
 * through NAV_ID and dropped #mgr-sec, so once the rail had been rebuilt,
 * opening another profile threw
 *
 *    Cannot read properties of null (reading 'style')
 *
 * inside launchProfile, ABOVE `await loadDataFromFile()`. The shared
 * document was never reloaded for the profile being opened, and the Viv
 * sync, the landing page and the welcome toast never ran: a half-opened
 * profile from a console error nobody was watching.
 *
 * So: anything inside .sb-nav that V1 dereferences without a null check has
 * to survive the rebuild.
 *
 *   node test/nav-rebuild-survival.test.js
 */
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const V1 = R('index.html');
const RD = R('v2/redesign.js');

let pass = 0, fail = 0;
const ok = (n, c, d) => { if (c) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + (d ? '  (' + d + ')' : '')); } };

console.log('\nnav rebuild: what V1 still writes to must survive\n');

// Every id declared inside the .sb-nav block.
const navStart = V1.indexOf('class="sb-nav"');
ok('the V1 sidebar block was found', navStart > 0);
const seg = V1.slice(navStart, navStart + 4000).split('\n  </div>')[0];
const navIds = [...new Set([...seg.matchAll(/id="([a-z0-9-]+)"/g)].map(m => m[1]))];
ok('it declares the ids we expect', navIds.length >= 4, navIds.join(', '));

// What rebuildNav keeps: NAV_ID values, plus the explicit keep list.
const navIdMap = (RD.match(/const NAV_ID = \{[^}]*\}/) || [''])[0];
const kept = [...navIdMap.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
const keepList = (RD.match(/\[([^\]]*)\]\.forEach\(function \(id\) \{\s*const el = document\.getElementById\(id\);/) || ['', ''])[1];
const keepIds = [...keepList.matchAll(/'([a-z0-9-]+)'/g)].map(m => m[1]);
const survives = new Set(kept.concat(keepIds));
ok('rebuildNav preserves nav-pulse, nav-team and nav-md', 
   ['nav-pulse', 'nav-team', 'nav-md'].every(i => survives.has(i)));
ok('...and mgr-sec, the one that was missed', survives.has('mgr-sec'));

console.log('\n--- the invariant ---');
// An id V1 dereferences as getElementById('x'). with no null check.
const unguarded = navIds.filter(id => {
  const deref = new RegExp("getElementById\\('" + id + "'\\)\\s*\\.");
  return deref.test(V1);
});
ok('some ids are dereferenced unguarded (so this test has teeth)',
   unguarded.length > 0, unguarded.join(', '));
for (const id of unguarded) {
  ok(id + ' is dereferenced unguarded by V1, and survives the rebuild',
     survives.has(id),
     'add it to NAV_ID or the keep list in rebuildNav, or null-guard it in V1');
}

console.log('\n--- the kept node cannot come back visibly ---');
ok('it is parked in a holder hidden on the PARENT',
   /holder\.style\.display = 'none';/.test(RD),
   'a child display set by V1 must not be able to reveal it');
ok('the holder is appended, not the bare node',
   /holder\.appendChild\(keep\);/.test(RD) && /navEl\.appendChild\(holder\)/.test(RD));
ok('the rail still draws its own headings', /className = 'nav-sec'/.test(RD));

console.log('\n--- a V2 tab must notice a deploy ---');
// V1 reloads when ./version.json holds a build it does not have. V2 404d on
// that file, so an open tab never noticed a new build and kept whatever
// write-config it read at startup.
const VER = path.join(__dirname, '..', 'v2', 'version.json');
ok('v2/version.json exists', fs.existsSync(VER));
if (fs.existsSync(VER)) {
  const build = JSON.parse(fs.readFileSync(VER, 'utf8')).build;
  const inPage = (R('v2/index.html').match(/HUB_BUILD='([^']*)'/) || [])[1];
  ok('it carries a build stamp', !!build, String(build));
  ok('the page and the file agree, so a fresh load does not reload itself',
     build === inPage, build + ' vs ' + inPage);
  ok('V2 is stamped separately from V1',
     inPage !== (fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
       .match(/HUB_BUILD='([^']*)'/) || [])[1]);
}

console.log('\n' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail)
                         : 'PASSED all ' + pass) + '\n');
process.exit(fail ? 1 : 0);
