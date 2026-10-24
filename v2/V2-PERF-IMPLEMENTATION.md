# V2 pilot blockers — implementation report

**Both backend fixes are written, tested and committed. Neither is deployed:
`./deploy.sh` is blocked by the production-deploy guard and needs your word.**

So the before/after production timings the brief asks for cannot be produced
yet. Everything that did not require the Azure deploy is done and measured,
including two defects found while verifying.

Production writes from V2: **0**. V1 `index.html`: **byte-identical**.

---

## 1 · Maryland — implementation

Branch `perf/md-prebuild` → merged into local `tribute-api` main (undeployed).

### A. One builder, two callers

The build closure was hoisted out of the request handler into
`_mdBuildCompliance(clients, force)`. The endpoint and the new timer call
**the same function**; the seven rules exist once.

### B. Prebuild timer

```js
app.timer('mdCompliancePrebuild', { schedule: '0 45 11,23 * * *', ... })
```

**Rationale for the schedule.** The inner assessment and touch caches last 12
hours, so a ~12-hour cadence refreshes them just before they expire and a user
never becomes the cache warmer. **11:45 UTC is 15 minutes after
`clientPulseMorningBuild` (11:30)** because `md_compliance` reads the Pulse
cache for its client list and returns 503 without it — running first would
simply skip. It calls `_mdBuildCompliance(clients, true)` so the inner caches
are rebuilt rather than re-read.

A failed prebuild logs and returns, leaving the previous snapshot in place.

### C. Stale-while-revalidate

**Using the `withCacheSWR` helper that already existed**, not a new one.

I first wrote a second `withCacheSWR` with a different signature. It would have
shadowed the existing helper and **broken the five endpoints already using it**
(`caregiver_avail_windows_v1`, `ai_training_corpus_v1`, `f90d_visits_v1`,
`ts_fit_context_v6`, `caregiver_supply`). Caught before commit, removed, and
the existing helper reused — which is also what the brief asks for in not
creating competing implementations.

`md_compliance_v1` registered in `CACHE_TTL` at one hour so `resolveTtl` does
not fall back to its ten-minute default.

**Honesty rules, all implemented:**

| Rule | How |
|---|---|
| Stale is never presented as fresh | `X-Cache: STALE`, `X-Cache-Stale: true`, and `_stale: true` in the body |
| A failed refresh never becomes empty | the background rebuild's `.catch` leaves the previous snapshot; it is not overwritten |
| No snapshot at all → no fake answer | the caller waits for a real build rather than seeing an empty board |
| Refresh button still refreshes | `refresh=1` forces a real rebuild through `_buildOnce` |

**Throttle unchanged.** `CONC=5` for assessments, `CONC=4, LIM=400, PAGES=5`
for the touch index, and both 12-hour inner TTLs are exactly as they were.
Viv concurrency was not increased.

## 2 · Maryland — parity

The rules were not edited; they were moved. Verified mechanically:

```
original closure statements : 122
hoisted function statements : 122
IDENTICAL — every line of the Maryland rules is unchanged.
```

Every field the brief lists — client set, assessment state, annual state,
initial assessment, reassessment triggers, documentation gaps, no-activity
detection, next due, overdue days, attention predicate — is produced by the
same unmodified code.

**A forced post-deploy rebuild still needs to be diffed against the saved
pre-change payload** (`resp_md_cold.json`, 103 rows, captured before any
change). That comparison is ready to run and is one of the first things to do
after deploying.

## 3 · Community Email — implementation

Branch `perf/community-week-cache`.

```js
fetchWeekOfVisitsCached(cookie, weekStart, weekEnd)
  → key  visits_week_<start>_<end>
  → TTL  15 minutes
  → { visits, cached, stale, generatedAt, refreshError? }
```

`fetchWeekOfVisits` itself is **unchanged** — it has ~44 callers and most want
a live read — so only the two Community Email call sites opt in. One normalised
week dataset now serves every community instead of two company-wide scans per
community.

**`client_week` is designed onto this.** It becomes a filter of the cached week
by `cid`, reusing `_ceTime`/`_ceZoneForMarket`. No second schedule pipeline.
Not implemented, not exposed.

## 4 · Community Email — freshness and failure

| | |
|---|---|
| Key | `visits_week_<startISO>_<endISO>` |
| TTL | **15 minutes** |
| Timestamp | `generatedAt` stored in the payload |
| Invalidation | time only; a new week is a new key |
| Stale behaviour | served **only** when Viv cannot be reached, flagged `stale:true` with `refreshError` |
| Viv fails, cache exists | last good week returned, flagged |
| Viv fails, no cache | **throws** `scheduleUnavailable` — the endpoint surfaces an error |

**Why 15 minutes:** long enough that a CSM paging through several communities
in one sitting pays for one pull; short enough that a schedule change made in
the morning appears before they send in the afternoon.

**The failure fix matters more than the speed fix.** Both call sites previously
did `.catch(() => [])`, which turns *"Viv did not answer"* into *"this family
has no visits next week"* — the worst failure this feature can have. An empty
week is now reported only when Viv actually says the week is empty. The
look-back week may still degrade to empty: it is context for the narrative, not
the schedule the family is told.

## 5 · Failure-state tests — 30 checks, all passing

`test/v2-perf-failure-states.test.js` runs the real cache layer against stubs
rather than grepping for reassuring comments.

| Community Email | Result |
|---|---|
| cache miss fetches once | PASS |
| second community reuses it (the 54-scans fix) | PASS |
| a different week is its own key | PASS |
| Viv down + stale cache → stale week, flagged, with the error | PASS |
| **Viv down + no cache → THROWS, never `[]`** | PASS |
| a genuinely empty week → `[]` with no error | PASS |
| malformed upstream row does not crash | PASS |

| Maryland | Result |
|---|---|
| one builder, three call sites all pointing at it | PASS |
| timer on a 12h cadence, after the Pulse build | PASS |
| timer skips when the Pulse cache is not ready | PASS |
| failed prebuild leaves the old snapshot | PASS |
| only one `withCacheSWR` implementation | PASS |
| STALE distinct from HIT; `_stale` in the body | PASS |
| `refresh=1` still rebuilds | PASS |
| **the Viv throttle was not loosened** | PASS |

## 6 · Loading UX — three visibly distinct states, live

Verified on the deployed V2:

| State | What a CSM sees |
|---|---|
| **stale** | *"Showing the last good Maryland Compliance, from 42 minutes ago. A refresh is running behind this page — reload shortly for current figures."* |
| **failed** | *"Could not load Client Pulse (HTTP 500). This page is NOT showing an all-clear — it is showing nothing. Reload to try again."* |
| **slow** | *"Still loading the LTC board — over 20 seconds so far. Nothing below is complete yet."* |

No fake progress. A failed source still never reaches the Home attention panel
as an all-clear.

## 7 · CoC duplicate boot fetch — fixed, V2 only

`loadCoC()` is called from two places on a sync-due launch. It now shares the
in-flight promise. Behaviour identical: both callers get their data, both
re-render, a later call still refetches.

**Patched in `build-v2.py`, not in `index.html`** — I first committed it
against `index.html` and backed it out, because `index.html` **is V1** and V1
must stay byte-identical. Live and verified.

## 8 · A deployment defect found while verifying

A reload served the new `index.html` against a **cached `v2-chrome.js`**, so
V2 ran current markup with the previous script and the stale banner appeared
broken when it simply was not loaded.

V2 referenced its assets with no version string; V1 already versions its own
(`entra-auth.js?v=…`). **Every V2 asset now carries a content hash.** A pilot
running a mixture of old and new files would have produced bug reports nobody
could reproduce.

## 9 · Pulse summary projection — not started

Correctly out of scope until the blockers close, per the brief. The design
stands: `client_pulse?view=summary` as a projection over the existing
snapshot, 3.18 MB → ~100 KB.

## 10 · csm_data and csm_comms

`csm_data` untouched, as instructed. `csm_comms` schema untouched; it is
already fetched only inside `vivSyncNow`, so it is not an unconditional boot
cost. Documented for Phase 2.

## 11 · vivProxy unknown-endpoint fix — revalidated, ready

Branch `fix/vivproxy-unknown-endpoint`, commit `3497028`, rebased and current
with `origin/main`.

| Check | Result |
|---|---|
| allow-listed endpoints | **214** |
| handlers in source | **214** |
| handlers missing from the allow-list | **none** |
| endpoints the hub calls, missing | **none** (17/17) |
| unknown endpoint | 404 |
| `client_week` | 404, with its own message |
| tests | 16/16 |
| scope | +169 lines, additions only |

**Recommend deploying it on its own, before the pilot. Not bundled with the
performance work. Not deployed.**

## 12 · Commits and branches

### tribute-api (nothing pushed, nothing deployed)

| Branch | Commit | Contents |
|---|---|---|
| `perf/md-prebuild` | `058db42` | Maryland: hoisted builder, prebuild timer, SWR |
| `perf/community-week-cache` | `1426c25` | shared week cache + failure semantics |
| `perf/community-week-cache` | `cad3852` | 30 failure-state tests |
| `main` (local) | `ef01330` | merge of both — **5 commits ahead of origin, undeployed** |
| `fix/vivproxy-unknown-endpoint` | `3497028` | separate, revalidated |

### tribute-csm-hub (pushed and live — V2 frontend only)

| Commit | Contents |
|---|---|
| `36fe64f` | stale-banner handling + CoC dedupe in the V2 build |
| `e2c41ad` | content-hashed V2 assets |

## 13 · What is still unmeasured, and why

The brief's before/after tables need the Azure deploy:

- Maryland: warm / stale / forced rebuild / user-visible / timer duration
- Community Email: cold week cache / warm / repeat / model portion
- Post-deploy forced-rebuild parity diff against `resp_md_cold.json`

**I will not report theoretical improvements as if they were measured.** The
pre-change baseline is captured and the comparison is ready to run the moment
`./deploy.sh` is approved.

---

## Verdict

**NOT READY FOR PILOT — one deployment away.**

Both blockers are implemented, tested and committed, with the compliance rules
proven unchanged. What remains is not engineering:

1. **Approve `./deploy.sh` for `tribute-api`** (local main `ef01330`), then
   I measure before/after and run the parity diff.
2. **Approve the separate vivProxy deploy** (`3497028`).
3. **Three real sign-ins** — a non-admin CSM, a CSC, and a Chicago CSM.

If the deploy lands and the measurements hold, the verdict becomes
**READY FOR SMALL PILOT — pending three named user sign-in checks.**
