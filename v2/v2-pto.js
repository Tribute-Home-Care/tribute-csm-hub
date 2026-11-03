/* ═══════════════════════════════════════════════════════════════════════════
   PTO AND COVERAGE
   ═══════════════════════════════════════════════════════════════════════════
   Courtney, 29 October: "show who is out, who is covering, and whether
   coverage is ready, without me rebuilding it from email threads."

   SOURCE IS THE TRIBUTE PUBLIC CALENDAR, read with the signed-in person's own
   Microsoft token. Not the request emails: their dates change, say "TBD" and
   "tentative", and an unconfirmed date shown as fact is worse than no date.

   TWO RULES THAT OVERRIDE CONVENIENCE:

   1. DATES ONLY. Reasons appear in subjects ("Jury Duty") and are never
      rendered. The calendar is company-wide, so this page reads things it has
      no business repeating. It shows who, when, and who is covering.

   2. NEVER GUESS WHO AN ENTRY BELONGS TO. Names on that calendar are full
      names, first names, nicknames and initials. A wrong match puts the wrong
      person's clients under the wrong cover, which is worse than an entry
      nobody matched. Unmatched entries are listed for a human, and a match
      that came from initials rather than a name says so.
   =========================================================================== */
(function () {
  'use strict';

  var PUBLIC_UPN = 'tributepublic@tributehomecare.com';
  // The spec's own list. "Several words mean out."
  var OUT_RE = /\b(pto|ooo|offline)\b/i;
  // "offline until 1p" is half a day. So is an explicit AM or PM.
  var PARTIAL_RE = /\b(until|til|till|am|pm|half[\s-]?day)\b/i;

  function A() { return window.TributeApp || {}; }
  function esc(s) { return String(s == null ? '' : s)
    .replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; }); }
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d); }

  /* ── reading the calendar ────────────────────────────────────────────────
     Three ways a shared calendar can be reachable with a delegated token, and
     which one works depends on how Tribute Public was shared. Rather than
     assume, each is tried in turn and the one that answered is reported, so
     the first run tells us what the tenant actually allows instead of failing
     with "something went wrong". */
  async function token() {
    var gate = window.tributeKsfGate;
    if (!gate || !gate.getGraphToken) throw new Error('Sign in with Microsoft first');
    var t = await gate.getGraphToken(['Calendars.ReadWrite'], true);
    if (!t) t = await gate.getGraphToken(['Calendars.Read'], true);
    if (!t) throw new Error('Outlook is not connected yet');
    return t;
  }

  async function read(fromISO, toISO) {
    var tok = await token();
    var h = { Authorization: 'Bearer ' + tok };
    var q = 'startDateTime=' + fromISO + 'T00:00:00Z&endDateTime=' + toISO + 'T23:59:59Z&$top=500' +
            '&$select=subject,start,end,isAllDay,organizer,showAs';
    var tried = [];

    async function attempt(label, url) {
      try {
        var r = await fetch(url, { headers: h });
        if (!r.ok) { tried.push(label + ': HTTP ' + r.status); return null; }
        var j = await r.json();
        var v = (j && j.value) || [];
        tried.push(label + ': ' + v.length + ' events');
        return v;
      } catch (e) { tried.push(label + ': ' + (e.message || 'failed')); return null; }
    }

    // 1. The calendar added to the signed-in person's own list. The most
    //    common shape, and the cheapest.
    var mine = await attempt('my calendar list', 'https://graph.microsoft.com/v1.0/me/calendars?$select=id,name,owner&$top=100');
    if (mine) {
      var cal = mine.filter(function (c) {
        return /tribute\s*public/i.test(c.name || '') ||
          String(((c.owner || {}).address) || '').toLowerCase() === PUBLIC_UPN;
      })[0];
      if (cal) {
        var ev = await attempt('shared calendar "' + (cal.name || '') + '"',
          'https://graph.microsoft.com/v1.0/me/calendars/' + encodeURIComponent(cal.id) + '/calendarView?' + q);
        if (ev) return { events: ev, via: 'me/calendars', tried: tried };
      } else {
        tried.push('my calendar list: no calendar named Tribute Public');
      }
    }
    // 2. Direct, which needs at least Reviewer on that mailbox.
    var direct = await attempt('tributepublic mailbox',
      'https://graph.microsoft.com/v1.0/users/' + encodeURIComponent(PUBLIC_UPN) + '/calendar/calendarView?' + q);
    if (direct) return { events: direct, via: 'users/' + PUBLIC_UPN, tried: tried };

    // Nothing worked. Say precisely what was tried, because the fix is an
    // Exchange permission and whoever grants it needs to know which one.
    var e = new Error('Tribute Public could not be read');
    e.tried = tried;
    throw e;
  }

  /* ── reading a subject ───────────────────────────────────────────────────
     Returns the NAME PART only. Everything else in the subject, including any
     reason, is discarded here rather than carried along and filtered later:
     data you never hold cannot leak into a render. */
  function nameOf(subject) {
    var s = String(subject || '');
    if (!OUT_RE.test(s)) return null;
    // Drop the keyword and anything after a separator that usually introduces
    // a reason ("Julia Hanna PTO - Jury Duty").
    var name = s.replace(OUT_RE, ' ')
      .split(/[-–—:(\/]/)[0]
      .replace(PARTIAL_RE, ' ')
      .replace(/\b(\d{1,2}(:\d{2})?)\b/g, ' ')
      .replace(/[^A-Za-z.’' ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
    /* A time leaves a stray letter behind: "Rach offline until 1p" cleans
       down to "Rach p", because the 1 and the p are one token and only the
       digit is stripped. Single-letter tokens are dropped, which costs
       nothing real — the shortest genuine entry is initials, and those are
       two characters in one token. */
    name = name.split(' ').filter(function (w) { return w.replace(/[.\u2019']/g, '').length > 1; }).join(' ');
    return (name && name.length >= 2) ? name : null;
  }

  function isPartial(ev) {
    if (ev.isAllDay) return false;
    return true;   // a timed entry is part of a day by definition
  }

  /* ── matching a name to a profile ────────────────────────────────────────
     Conservative on purpose, in this order: an explicit alias, then an exact
     full name, then a first name or initials ONLY where they are unique
     across the roster. Anything else is unmatched and says so. A derived
     match is marked, the same way a derived family relationship is on the
     weekly email, because "probably Jen" is not the same as "Jen". */
  function roster() {
    var a = A(), profiles = (a.profiles || []).filter(function (p) { return !!p.name; });
    var alias = {};
    try {
      var cfg = ((a.data || {}).shared || {}).settings || {};
      Object.keys(cfg.ptoAliases || {}).forEach(function (k) {
        alias[k.toLowerCase().trim()] = cfg.ptoAliases[k];
      });
    } catch (e) {}
    return { profiles: profiles, alias: alias };
  }

  function matchName(raw, R) {
    var n = String(raw || '').toLowerCase().replace(/[.’']/g, '').replace(/\s+/g, ' ').trim();
    if (!n) return null;
    if (R.alias[n]) {
      var byId = R.profiles.filter(function (p) { return p.id === R.alias[n]; })[0];
      if (byId) return { profile: byId, how: 'alias' };
    }
    var full = R.profiles.filter(function (p) { return p.name.toLowerCase() === n; });
    if (full.length === 1) return { profile: full[0], how: 'name' };
    var first = R.profiles.filter(function (p) { return p.name.toLowerCase().split(' ')[0] === n; });
    if (first.length === 1) return { profile: first[0], how: 'first name' };
    var init = R.profiles.filter(function (p) {
      return p.name.split(/\s+/).map(function (w) { return w[0]; }).join('').toLowerCase() === n;
    });
    if (init.length === 1) return { profile: init[0], how: 'initials' };
    return null;
  }

  /* ── the model ─────────────────────────────────────────────────────────── */
  async function build(weeksAhead) {
    var R = roster();
    var from = iso(new Date());
    var to = addDays(from, 7 * (weeksAhead || 8));
    var got = await read(from, to);
    var out = [], unmatched = [], skipped = 0;

    got.events.forEach(function (ev) {
      var raw = nameOf(ev.subject);
      // Not a time-off entry at all: an on-call shift, a client meeting.
      // Skipped silently, because the calendar is company-wide and most of it
      // is none of this page's business.
      if (!raw) { skipped++; return; }
      var m = matchName(raw, R);
      var startD = iso((ev.start && ev.start.dateTime) || (ev.start && ev.start.date) || new Date());
      var endRaw = (ev.end && ev.end.dateTime) || (ev.end && ev.end.date) || null;
      // Graph's all-day end is EXCLUSIVE. Without this every full day runs one
      // day long and a Friday off reads as covering the weekend.
      var endD = endRaw ? (ev.isAllDay ? addDays(iso(endRaw), -1) : iso(endRaw)) : startD;
      if (endD < startD) endD = startD;
      var row = { start: startD, end: endD, partial: isPartial(ev) };
      if (!m) { unmatched.push({ name: raw, start: startD, end: endD }); return; }
      row.profileId = m.profile.id;
      row.who = m.profile.name;
      row.market = m.profile.market || '';
      row.derived = (m.how === 'initials' || m.how === 'first name');
      row.how = m.how;
      out.push(row);
    });

    out.sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
    return { from: from, to: to, via: got.via, tried: got.tried,
             away: out, unmatched: unmatched, skipped: skipped,
             overlaps: overlaps(out), generatedAt: new Date().toISOString() };
  }

  /* Two or more CSMs in the same market out for overlapping FULL weeks. The
     spec is specific about full weeks: two people taking a Friday off in the
     same market is normal and flagging it would train everyone to ignore the
     flag. */
  function overlaps(rows) {
    var full = rows.filter(function (r) { return !r.partial && days(r) >= 5; });
    var hits = [];
    for (var i = 0; i < full.length; i++) {
      for (var j = i + 1; j < full.length; j++) {
        var a = full[i], b = full[j];
        if (a.market !== b.market || !a.market) continue;
        if (a.profileId === b.profileId) continue;
        if (a.start > b.end || b.start > a.end) continue;
        hits.push({ market: a.market, who: [a.who, b.who],
          from: a.start > b.start ? a.start : b.start,
          to: a.end < b.end ? a.end : b.end });
      }
    }
    return hits;
  }
  function days(r) { return Math.round((new Date(r.end) - new Date(r.start)) / 864e5) + 1; }

  /* ── coverage readiness ──────────────────────────────────────────────────
     "Covering CSM named on each client, and coverage notes done. Flag 5
      business days before PTO starts if either is missing."
     The vacation field on a client is the Hub's own "Covering for Vacation",
     so this reads what CSMs already fill in rather than asking for it twice. */
  function readiness(away) {
    var a = A(), DATA = a.data;
    if (!DATA || !DATA.profiles) return [];
    var cov = ((DATA.shared || {}).coverage) || [];
    var today = iso(new Date());
    var horizon = addDays(today, 7);   // ~5 business days
    return away.filter(function (r) { return r.start > today && r.start <= horizon; })
      .map(function (r) {
        var clients = ((DATA.profiles[r.profileId] || {}).clients || [])
          .filter(function (c) { return !c.isOffice; });
        var noCover = clients.filter(function (c) { return !String(c.vacation || '').trim(); });
        var hasNotes = cov.some(function (n) {
          return String(n.profileId || n.csm || '') === r.profileId ||
                 String(n.csm || '') === r.who;
        });
        return { who: r.who, market: r.market, start: r.start, end: r.end,
                 clients: clients.length, missingCover: noCover.length,
                 coverageNotes: hasNotes,
                 ready: noCover.length === 0 && hasNotes };
      }).filter(function (x) { return !x.ready; });
  }

  window.TributePTO = { build: build, readiness: readiness,
    // exported for tests
    _nameOf: nameOf, _matchName: matchName, _overlaps: overlaps, _days: days };
}());
