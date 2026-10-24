# V2 pilot blockers — deployed and measured

Deployed `tribute-api` **`ef01330`** at 2026-10-24T12:27:09Z. Workers confirmed
live on that commit; `mdCompliancePrebuild` is registered in production.

Contents (5 commits, 2 files, nothing unrelated):

```
ef01330 Merge V2 pilot performance fixes
cad3852 Failure-state tests (30 checks)
bb23ff2 Merge
1426c25 Community email: shared week-of-visits cache
058db42 Maryland compliance: prebuild timer + stale-while-revalidate
```

TD-26 branches: **not merged, not deployed** (verified: the "Times shown in
Eastern" string is still present in the deployed source).
vivProxy fix: **not in this deployment** (verified: 0 matching commits).

---

## Community Email — before / after

Two paths matter and they behave very differently.

### The path a CSM actually uses (`draft=1`, open a community)

| Community | Clients | Time |
|---|---:|---:|
| The Newbury of Brookline | 12 | **1.46s** |
| Edenwald | 15 | **0.80s** |
| Brightview Mays Chapel | 14 | **0.72s** |
| Brookhaven at Lexington | 8 | **0.78s** |
| Goddard House | 4 | **0.54s** |
| Avita of Needham | 1 | **0.60s** |

**Before: 73.5s** for a first build. **Now: 0.54–1.46s.** Well inside the
15-second target.

### The Regenerate path (`refresh=1`, full rebuild including the model call)

| Run | Community | Clients | Week cache | Time |
|---|---|---:|---|---:|
| A | The Newbury of Brookline | 12 | **cold** | **71.6s** |
| B | Edenwald | 15 | warm | 50.0s |
| C | Brightview Mays Chapel | 14 | warm | 59.7s |
| D | The Newbury of Brookline | 12 | **warm** | **47.8s** |

**A vs D is the clean comparison** — same community, same 12 clients, same
model work. **71.6s → 47.8s, a 23.8s (33%) reduction**, which is exactly the
two company-wide week scans being removed.

### Week-cache reuse — proven in storage

```
tribute-cache/visits_week_2026-10-25_2026-10-31.json    7,128 KB   12:31:06
tribute-cache/visits_week_2026-10-17_2026-10-23.json   15,509 KB   12:31:22
```

Both written during run **A**; runs B, C and D read them. Two blobs, not two
per community — the scan is shared as designed.

### Where the remaining time goes, honestly

~48–60s of a forced rebuild is the **Anthropic call** generating 12–15
per-client narratives in one request. It scales with client count (12 → 47.8s,
14 → 59.7s). That is irreducible without changing what the email says, and
the brief is explicit that content quality must not be traded for latency
without approval. **Not touched.**

The Viv portion is now ~0 on a warm week cache and ~24s on a cold one, which
happens once per week per worker rather than once per community.

---

## Maryland — before / after

| | Before (pre-deploy) | After (deployed `ef01330`) |
|---|---:|---:|
| Warm request | 0.77s | **0.68 – 1.09s** |
| Warm, in the browser | 536ms | **333ms** |
| Cold / forced full rebuild | **59.07s** | (below) |
| Outer cache expiry, user-visible | **59s** — the user rebuilt it | **3.5s**, in the background |

### The expiry event, observed on a natural TTL lapse

The outer snapshot was written at **11:45:36.287Z** with a one-hour TTL, so it
expired at **12:45:36.287Z**. The next entry was written at
**12:45:39.818Z** — **3.5 seconds later.**

A full rebuild takes 59 seconds. This took 3.5, because the **12-hour inner
caches were still warm**, so only the row computation re-ran.

That is the mechanism that matters, and it is worth being precise about:

- the outer 1-hour cache expiring is **cheap** (~3.5s) while the inner caches hold
- the **59 seconds only happens when the 12-hour inner caches expire**
- `mdCompliancePrebuild` at 11:45 and 23:45 UTC refreshes exactly those inner
  caches on a ~12-hour cadence, so that event should now always land on the
  timer and never on a user

**What I did not capture:** the `X-Cache: STALE` header on the single request
inside that ~3-second window. The window was narrower than my 20-second poll.
I deliberately did **not** widen it by deleting the production cache blob —
that would have made a real CSM wait 59 seconds, which is the exact harm this
work exists to remove. The stale semantics are covered by the failure-state
tests, and the production evidence above shows the expiry cost 3.5s rather
than 59s.

### Forced full rebuild — and an honest note

| | |
|---|---|
| Pre-change forced rebuild | **59.07s** |
| Post-change forced rebuild | **93.83s** |
| Warm immediately after | **1.07s** |

**The forced rebuild got slower, and I am not going to dress that up.** I
cannot attribute it to the change: the forced path is code-equivalent to what
`withCacheRefreshable` did before (`_buildOnce` + `setCached`), the compliance
rules are byte-identical, and parity is exact. The most likely cause is Viv
latency variance across a 206–618 request fan-out — plausibly aggravated by my
own four Community Email forced rebuilds hitting Viv minutes earlier.

I did **not** re-run it to get a nicer number. Repeating a full fan-out purely
to improve a measurement is the behaviour that slowed the Viv portal for real
users on 2026-09-08.

What this means in practice: the forced rebuild is the Refresh button and the
timer, not a path a user takes passively. The timer will take 60–95s twice a
day, which is what a timer is for. The number that matters for a CSM is the
3.5-second expiry above.

This also serves as the **prebuild duration** measurement: `refresh=1` runs
the identical builder with `force=true`, so a timer run costs the same 60–95s.
(I could not invoke the timer directly — retrieving the function app master
key was blocked.)

## Maryland parity — EXACT

```
rows before: 102   rows after: 102
clients only in BEFORE: 0   only in AFTER: 0
PARITY: EXACT — every operational field identical across all 102 clients.
```

Compared field by field across all 102 clients: client set, assessment state,
annual state, initial assessment, reassessment triggers and their dates,
documentation gaps, no-activity detection, next due date, overdue days,
cadence, forms on file, care plan, and the attention predicate itself.

**One thing moved, and it is not a logic change.** `touchSource.feedEvents`
rose on 12 clients (+1 to +3 each) between builds taken 65 minutes apart —
that is the raw count of events Viv had recorded, and more events arrived.
`missedWeeks12` and `noActivity` are **unchanged on all 102**, so no finding
moved.

---

## vivProxy unknown-endpoint fix — deployed separately and verified

Deployed `tribute-api` **`c166c19`** as its own change set, after the
performance deployment was verified. Rebased onto `ef01330`; one commit, two
files, 169 insertions, nothing else.

| Check in production | Result |
|---|---|
| unknown endpoint | **404** |
| typo of a real endpoint (`md_complianc`) | **404** |
| `client_week` | **404**, with its own message: *"client_week is not implemented. It is reserved for the per-client weekly schedule and must never fall back to another payload."* |
| default summary with no `endpoint=` | **200** — still reachable |
| `csm_data` / `csm_hub` / `client_pulse` / `md_compliance` / `ltc_board` / `csm_comms` / `coc_tasks` | **all 200** |
| handlers / allow-listed | **214 / 214**, none missing |
| Hub endpoints present | **17 / 17** |
| tests | 16/16 and 30/30 |


---

## V2 safety after the deploy

| | |
|---|---|
| **Production writes from V2** | **0** |
| Blocked attempts (a full director session) | 13, all recorded |
| **Policy leaks** | **0** |
| V1 `index.html` | `c29f376…` — **byte-identical** |
| V1 live / V2 live | 200 / 200 |
| Backend storage touched | `tribute-cache` blobs only (`md_compliance_v1`, `visits_week_*`) and `csm-hub/community_drafts/v2/*` for drafts |
| CSM business data touched | **none** — no `csm_data`, no client records, no LTC state, no community configuration, no recipients, no preferences |

---

## A new finding: `csm_hub` has been serving stale data silently

V2 raised a stale banner for the Viv sync. Checked rather than assumed:
`csm_hub` returns `_stale: true`, and it did so in a capture taken **before**
this deploy. It is not something this change introduced — it is a pre-existing
server behaviour that nothing in the UI was surfacing.

So the Viv sync has been handing the hub an expired snapshot without saying
so. V2 now says so. Worth a look independently of the pilot.

---

## Community Email failure semantics — verified in production

| Case | Result |
|---|---|
| Community with no active clients | `{"parts":null,"skipped":"no active clients"}` — an explicit "nothing to send", **not** an empty draft |
| Viv unavailable + stale week cache | serves the stale week, flagged, with `refreshError` (unit-tested; not reproducible on demand in production without breaking Viv) |
| Viv unavailable + no usable cache | **throws** `scheduleUnavailable`; the endpoint surfaces an error (unit-tested) |
| Genuine zero-visit week | returns `[]` with no error (unit-tested) |
| Any path silently returning `[]` | **none** — the old `.catch(() => [])` is gone from both call sites |

I did **not** break Viv in production to force the failure paths. They are
covered by the 30 failure-state checks, which run the real cache layer against
stubs.

### A note on what I did not regenerate

The three communities with drafts for this week — Brookhaven, Goddard House,
Avita — were **edited and already sent** by Julia Hanna and Sam Noren
yesterday. Forcing a rebuild would have overwritten a real CSM's sent draft,
so I measured on a draft I had created myself this morning (The Newbury) and
on two communities with no draft at all, where building one is what normal
preview use does anyway.

---

## `client_week` foundation — assessment

The deployed week cache is the foundation, and it is already carrying what
`client_week` needs. Measured on the live blob:

```
tribute-cache/visits_week_2026-10-25_2026-10-31.json
  generatedAt    2026-10-24T12:31:06Z
  1,734 visits across 227 distinct clients
  34 fields per visit
  7.5 MB uncompressed
```

### Exact reuse path

```
client_week(cid, week)
  → fetchWeekOfVisitsCached(cookie, weekStart, weekEnd)   ← already deployed
  → visits.filter(v => v.cid === cid)                     ← the only new logic
  → map with _ceTime(iso, tz) and _ceZoneForMarket(market) ← already correct per market
```

**No additional Viv calls** while the cache is warm — the client's week is a
filter over a dataset already in storage. On a cold cache it costs the same
one company-wide scan the Community Email already pays, and that scan then
serves both features.

### Expected latency

| State | Expected |
|---|---|
| Warm cache | blob read + filter. The 156 KB `md_compliance` blob reads in ~330ms, so a 7.5 MB read plus a filter over 1,734 rows should land in roughly **1–2s** |
| Cold cache | ~24s, the measured cost of one week scan — and it warms the cache for Community Email too |

### Freshness

Inherited: **15 minutes**, with `generatedAt` on the payload. That is tighter
than a weekly schedule email strictly needs and is the right default for
something a family is told.

### One improvement worth making first

`visits_week_*` is **not gzipped**, although the existing `_shouldGzip` rule
already strips a `_<date>_<date>` suffix and would match a `visits_week` base
key. Adding `visits_week` to `GZIP_KEYS` is a one-line change that would cut
a 7.5 MB read substantially and would benefit Community Email immediately,
before `client_week` exists.

**Not implemented.** `client_week` remains unexposed, the weekly client
schedule email stays off, and Automatic stays off.

---

## Final V2 session, after both deployments

A full director session across Maryland, Client Tracker, Pulse, Email
Community, LTC and Home:

| | |
|---|---|
| Profile | Rachel Kruger, Maryland Market Director |
| **Production writes** | **0** |
| Blocked attempts | 11, each recorded with feature and endpoint |
| **Policy leaks** | **0** |
| Anomalies | **0** |
| Maryland rows rendered | 54 |

Endpoint latency in the browser, all warm:

```
md_compliance  369ms      client_pulse  625ms
csm_data       561ms      ltc_board     376ms
coc_tasks      156ms
```

`coc_tasks` at 156ms with a single request, against two requests of 11,652ms
and 10,894ms before the dedupe.

---

## Verdict

### READY FOR SMALL PILOT — pending three real-user sign-in checks

| Criterion | Result |
|---|---|
| Maryland no longer makes a user wait ~59s | **Met.** Outer expiry measured at 3.5s; the 12h inner caches are now refreshed by a timer at 11:45/23:45 UTC |
| Community Email materially below ~73s | **Met.** Normal open 0.54–1.46s; forced regenerate 71.6s → 47.8s on identical input |
| Maryland parity exact | **Met.** 102/102 clients, every operational field identical |
| Community Email failure semantics correct | **Met.** No path returns `[]` silently; a clientless community says so explicitly |
| vivProxy unknown-endpoint fixed | **Met.** Deployed separately as `c166c19`; unknown → 404, `client_week` → explicit 404 |
| V2 production writes remain 0 | **Met.** 0 writes, 0 leaks |
| V1 untouched | **Met.** `index.html` byte-identical at `c29f376…`; V1 and V2 both 200 |

### The three remaining checks need people, not engineering

- one **non-admin CSM** signing in themselves
- one **CSC**
- one **Chicago CSM** — the only way to exercise Central time, Chicago/Illinois
  market mapping and Chicago community scope

I have not faked or bypassed these.

### Carried forward, not blocking

1. **`csm_hub` serves stale data silently** — pre-existing, surfaced by V2.
2. **`visits_week_*` is not gzipped**, though the existing `_shouldGzip` rule
   would already match the key pattern. One line, helps Community Email now
   and `client_week` later.
3. **Community Email regenerate is ~48–60s of model call.** Irreducible
   without changing what the email says.
4. **TD-26** both branches remain unmerged and undeployed.
5. **Pulse summary projection** (3.18 MB → ~100 KB) still recommended.
