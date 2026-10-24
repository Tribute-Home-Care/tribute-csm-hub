# V2 Pilot Readiness — profiling report

**Verdict: NOT READY for a small pilot.** Two blockers, both measured, both
with a named fix. Neither is a design problem.

**No backend change has been made or deployed.** This phase measured; it did
not optimise. Production writes from V2 remain **0** and V1 is byte-identical.

---

## 1 · Maryland Compliance — the 59-second cold path

Measured against production (one forced rebuild, the same thing the hub's own
Refresh button does):

| | |
|---|---|
| Warm (cache HIT) | **0.77s** |
| **Cold (forced rebuild)** | **59.07s** |
| Warm immediately after | **1.00s** |
| Payload | 156 KB |

### Call graph, with attribution

```
md_compliance                                           59.07s total
├── getCached('client_pulse')                           ~0      (blob read, HIT)
├── authenticate()                                      ~1s     (Viv cookie)
├── _mdAssessmentIndex(103 clients)          cache: 12h  ─┐
│   └── 21 batches × CONC 5                              │
│       ├── 103 × GET /formdata?mid=<cid>                │ ~52.6s
│       └── 21 × 120ms deliberate sleep  = 2.52s         │ combined
├── _mdTouchIndex(103 clients, 84 days)      cache: 12h  │ Viv wait
│   └── 26 batches × CONC 4                              │
│       ├── 103–515 × POST /clientFeeds/search-all       │
│       │   (up to 5 pages/client, 80ms between pages)   │
│       └── 26 × 150ms deliberate sleep = 3.90s         ─┘
├── comms blobs (3 × getCached)                          ~0
├── csm_hub blob read                                    ~0
├── compute 103 rows                                     <50ms
└── serialize 156 KB                                     <20ms
```

**Total Viv requests per cold rebuild: 206 (best case) to 618 (worst).**

### Backend wait vs frontend work

| | |
|---|---|
| Deliberate throttle sleeps | **6.42s** (11%) — a hard floor, computed from the code |
| Viv round-trips + auth | **~52.6s** (89%) |
| Server compute + serialize | **<0.1s** |
| **Browser render of 55 rows** | **25ms, measured** |

**The UI is 0.04% of the cold path.** Per the brief, latency is not attributed
to the UI — it was measured and it is not there.

### Why cold is 59s and warm is 0.8s

Two cache layers with different lifetimes:

| Cache | TTL | Effect |
|---|---|---|
| `md_compliance_v1` (outer) | **1 hour** | expires hourly, but rebuilds cheaply because… |
| `md_assessments_v*` (inner) | **12 hours** | …these still hit |
| `md_touch_v2_84` (inner) | **12 hours** | |

So 23 of every 24 rebuilds are fast. **Twice a day, one unlucky user pays the
full 59-second fan-out inside their own request**, because `withCache` blocks
on a miss — there is no stale-while-revalidate.

### The dominant cause, named

**Not** cold start, not oversized responses, not missing caching. It is a
*full-book Viv fan-out executed synchronously inside a user request*, and it
is deliberately throttled — the throttle exists because a wide fan-out
against Viv slowed the portal for real users on 2026-09-08.

So the throttle must stay. The request must stop waiting for it.

### Recommendation (smallest change that works)

**Add an `mdComplianceTimer` that prebuilds the two inner caches.** `client_pulse`
already has `clientPulseMorningBuild` on `0 30 11 * * 1-5`; Maryland has no
equivalent, and that asymmetry is the whole bug. A timer at, say, 10:50 and
22:50 keeps both 12-hour caches warm so no user ever triggers the fan-out.

Second, smaller: make the outer cache **stale-while-revalidate** so an expired
entry is served immediately and refreshed behind the request.

**No business rule changes. Identical operational results** — same inputs,
same seven requirements, same rows.

---

## 2 · Community Email — the 73-second draft

Measured in the browser: **73.5s** for one community, against a UI promising
"about 15 seconds".

### Where the time goes

```
community_email?draft=1                                 ~73.5s
├── _ceLoadDraft (cached draft blob)                     miss
├── _ceLoadHubDoc + csm_hub blob                         ~0
├── getCached('client_pulse')                            ~0
├── authenticate()                                       ~1s
├── fetchWeekOfVisits(next week)        ← FULL COMPANY   ─┐ dominant
│   └── cursor-paginated GET /scheduling/formatted        │
│       over ~1,681 visits/week, sequential pages         │
├── fetchWeekOfVisits(previous week)    ← FULL COMPANY   ─┘ dominant
├── ONE Anthropic call for all clients in the community   significant
└── _ceSaveDraft                                          ~0
```

### There is no client-level N+1

The brief asked specifically. **There isn't one.** Visits are fetched once for
the whole week and grouped by client id in memory. Ten community clients do
*not* trigger ten schedule lookups.

### There IS a community-level N+1

`buildCommunityDraft` accepts injected `visits` and `pastVisits`, and the
Friday timer uses that to share **one** schedule pull across all communities.
An **interactive** `draft=1` request does not: it re-scans the entire
company's week — twice, current and previous — **per community**.

With 27 communities, previewing each one costs 54 full-company week scans.

### Recommendation

1. **Cache the two week-scans** (`visits_week_<start>`), keyed by week, shared
   across every community. One scan serves all 27. This alone should remove
   most of the 73s.
2. **Prebuild interactive drafts** on the same timer that already builds the
   Friday run, so opening a community is a blob read.
3. Only then revisit the model call, which is irreducible work.

**Do not simply change the message to 75 seconds.** The estimate was wrong
because the work is wrong.

---

## 3 · Client Pulse — 3.18 MB, and 97.6% of it is unused at boot

| | |
|---|---|
| Payload | **3.18 MB**, 238 clients, 57 fields each |
| Cold / warm (shell) | 28s / 11s |
| Warm in-browser | 405–519ms (prebuilt by `clientPulseMorningBuild`) |

### What the bytes are

| Field | Bytes | Share |
|---|---:|---:|
| `visitNotes` | 873,204 | **26.1%** |
| `fillProposal` | 488,021 | **14.6%** |
| `incidents` | 246,433 | 7.4% |
| `card` | 242,868 | 7.3% |
| `recentComms` | 182,798 | 5.5% |
| `aiPulse` | 178,904 | 5.4% |
| `notes` | 158,032 | 4.7% |
| `weekly` | 157,075 | 4.7% |
| *top 16 combined* | *3,010,979* | *90.2%* |

### The finding

The fields Home and the Client Tracker actually read — `cid, name, tier,
score, headline, market, csm, level, flagReason, num, startDate, touchTier` —
total **77 KB. That is 2.4% of the payload.**

**The Hub downloads 3.11 MB it does not use at boot**, on every launch, for
every user. The remaining 97.6% is read only by the full Pulse page and the
client-detail view, one client at a time.

### Recommended architecture — the smallest change

**A server-side projection, not a new pipeline.** `client_pulse?view=summary`
returns the 12 summary fields from the *same* prebuilt snapshot:

- **3.18 MB → ~100 KB** (≈30×), no new build, no new cache, no AI re-run
- Detail stays available as `client_pulse?cid=<id>` for the one client a user
  opened, served from the same snapshot
- **Analytical quality is untouched** — this is a projection over data that has
  already been computed, not a reduction in what gets computed

Warm latency is already fine (405ms); this is about transfer and parse on
slower connections, and about the 11s *warm* figure seen server-side when the
blob has to be re-read and re-serialised in full.

---

## 4 · csm_comms — 1.23 MB, 5,491 events, 30 days

| | |
|---|---|
| Cold / warm | 12.4s / 8.1s |
| Window | 30 days, 5,491 events |
| Last 14 days | 2,500 events (46%) |
| Largest field | `summary` — 21.6% of payload |

The Hub merges these into touchpoints at sync time, so it does need history —
but it needs it **once per sync**, not on every boot, and the Home screen reads
none of it directly.

**Recommendation:** fetch `csm_comms` only when a sync is actually due (it
already is, inside `vivSyncNow`), and consider a 14-day default window with
30 days on demand — that halves the payload for the common case.

---

## 5 · csm_data — 2.60 MB on every boot

| Block | Bytes | Share |
|---|---:|---:|
| `touchpoints` | 1,577,309 | **57.8%** |
| `clients` | 816,535 | 29.9% |
| `vivOpenVisits` | 126,248 | 4.6% |
| `leads` | 113,191 | 4.1% |
| `visits` | 60,081 | 2.2% |
| `shared` | 34,343 | 1.3% |

**Touchpoints are 58% of the boot payload** and are read only when a user opens
a client's Communication area.

### A hazard worth stating before anyone acts on that

`csm_data` is **one JSON document with ETag concurrency**, and the client
**saves the whole document back**. If a boot projection omitted `touchpoints`,
the next save would write a document without them — **deleting every
touchpoint in the company**.

So the lazy-load is *not* a read-side change. It requires splitting the write
path first, which Phase 1 forbids. **Recommend deferring to Phase 2** and
treating it as a schema change, not an optimisation.

Measured today: `csm_data` responds in ~400ms warm, so it is not currently a
pilot blocker. It is a scaling risk.

### Duplicate boot fetches (real, small)

`loadCoC()` is called from **two places** on launch — the profile launcher
(line 1983) and `vivSyncNow` (line 7454). Both fire when a sync is due, so the
browser issues two `coc_tasks` requests and holds two connections for ~11s
each. The server de-duplicates the build (`_buildOnce`), so this is wasted
client wait, not wasted server work. One-line fix; not deployed.

---

## 6 · Caching map and recommended freshness windows

| Endpoint | Cache today | TTL | Scope | Prebuilt? | Stale OK for | Recommendation |
|---|---|---|---|---|---|---|
| `client_pulse` | blob | — | global | **yes**, 11:30 weekdays | hours | keep; add `view=summary` |
| `md_compliance` | `md_compliance_v1` | **1h** | global | **no** | 1–4h | **add a prebuild timer** |
| `md_assessments_v*` | inner | **12h** | global | no | 12h | prebuild |
| `md_touch_v2_84` | inner | **12h** | global | no | 12h | prebuild |
| `coc_tasks_v1` | blob | **15m** | global | no | 15–30m | fine |
| `csm_comms` | blob | — | global | via sync | 1h | narrow the window |
| `csm_data` | none (ETag) | n/a | global | n/a | **0 — must be live** | leave alone |
| `community_email` draft | blob per week+community | week | per community | Friday only | **tight — minutes** | cache the week scans, not the draft |
| `ltc_board` | blob | — | global | QB snapshot daily | 1h | fine |

**Deliberately not one TTL.** The shared document must never be stale — it is
what a CSM is editing. A community draft must be tight because a schedule
change invalidates it. Compliance and Pulse tolerate hours because the
underlying facts move daily.

---

## 7 · Loading and error states — audited in the live browser

| Behaviour | Result |
|---|---|
| Immediate loading state on slow pages | **Yes** |
| Slow state becomes explicit at 20s | **Yes** — "Still loading … over 20 seconds so far" |
| Source-specific failure | **Yes** — names the source and the HTTP status |
| Failed distinguished from empty | **Yes** — "This page is NOT showing an all-clear — it is showing nothing" |
| Failed source never rendered as all-clear | **Verified** — Home appends "Client Pulse did not answer, so this list may be incomplete" |
| Fake progress bars | **None** |

Honest messages only, as asked.

---

## 8 · Boot dependencies — already non-blocking

Measured on a real profile launch:

```
csm_data    start    2ms  end  390ms
HOME USABLE AT      253ms          ← before coc_tasks even starts
coc_tasks   start  591ms  end 4270ms
```

**A slow secondary source does not prevent entry.** Pulse, Maryland, LTC and
community drafts all load on their own pages, on demand. The 20-second first
launch seen earlier was a cold Viv sync plus a cold `coc_tasks`, both after
Home was already usable.

---

## 9 · Performance targets, from measured behaviour

| Workflow | Measured | Target | Verdict |
|---|---|---|---|
| V2 shell loads | <1s | <2s | **PASS** |
| Profile → usable Home | **253ms** (warm) / ~20s (cold sync) | <3s | **ACCEPTABLE** — background the sync |
| Page navigation | ~5ms | <300ms | **PASS** |
| Client workspace open | 20–58ms | <300ms | **PASS** |
| Area switch within client | 13–19ms | <200ms | **PASS** |
| Search (23 clients) | 35–53ms | <150ms | **PASS** |
| Maryland (warm) | 0.77s | <2s | **PASS** |
| **Maryland (cold)** | **59s** | <5s | **BLOCKING** |
| **Community Email draft** | **73s** | <15s | **BLOCKING** |
| Pulse summary | 405ms warm | <1s | **PASS** (payload still 3.1 MB) |
| Pulse client detail | n/a | <1s | needs the projection |

---

## 10 · LTC status — answered

**Status: UNVALIDATED AGAINST REAL PRODUCTION RECORDS.**

`shared.ltc` is absent from `tribute_csm_data.json`. `ltc_board` reads the
**same container and the same blob** the hub serves, so this is not a storage
mismatch.

The submissions blob `tribute_ltc_submissions.json` (last written
2026-09-15) carries the answer:

| Week | Record | History |
|---|---|---|
| 2026-08-23 | `ltc_ma_20` | approve → sent → confirm by Michelle Hejduk, then **unapprove by "Andrew Dobson (test cleanup)"** |
| 2026-08-23 | `ltc_md_12` | **test send** by Andrew Dobson |
| 2026-08-23 | `ltc_ma_16` | **test send** ×2, **dry run** by Andrew Dobson |
| 2026-09-06 | `ltc_md_4` | **test send** by Sam Noren |

So: the feature was **built and tested in Aug–Sep 2026, never used
operationally, and the test roster was deliberately cleaned up.** Zero is
expected. Records do not live anywhere else. No fake records were created and
nothing was written.

---

## 11 · vivProxy unknown-endpoint fix — reviewed, recommend deploying separately

Branch `fix/vivproxy-unknown-endpoint`, commit `3497028`. Re-verified:

| Check | Result |
|---|---|
| Known endpoints behave identically | **Yes** — all 214 allow-listed; every one of the 17 the hub calls is present |
| Unknown endpoint | **404** |
| `client_week` | **404 with its own message** |
| Allow-list can omit a valid handler? | **No** — generated from the `endpoint===` branches; the test re-derives it from source and fails on any gap |
| Any handler matched by something other than `endpoint===`? | **None** — checked for `startsWith`, `includes`, `switch`, index access |
| Default fall-through still reachable | **Yes** — only a *supplied* unknown name is refused |
| Diff | +169 lines, **additions only**, 2 files |
| Tests | 16 checks, all pass |

**Recommendation: deploy it on its own, before the pilot.** It is isolated,
additive, and it closes a path where a not-yet-built endpoint returns 200 and
plausible data for a different question. **Not deployed — awaiting your word.**

---

## 12 · `client_week` — reuse path, not a new pipeline

Profiling the community email answered this. The server already has the exact
capability:

```js
fetchWeekOfVisits(cookie, weekStart, weekEnd)   // one company-wide scan
  → group by v.cid
```

`client_week` is that, filtered to one client. **Proposed contract:**

```
GET /api/vivProxy?endpoint=client_week&cid=<vivId>&week=<YYYY-MM-DD>
→ { cid, weekStart, weekLabel,
    visits: [ { day, dayLabel, time, hours, who, open } ] }
```

Reuse path, no duplicated schedule logic:

1. Cache the week scan once per week (`visits_week_<start>`) — **the same
   cache the community email needs anyway**, so the two features share it.
2. `client_week` reads that cache and filters by `cid`.
3. Times formatted with the existing `_ceTime(iso, tz)` and
   `_ceZoneForMarket(market)` — already correct per market.

That makes `client_week` a projection over a cache the Community Email fix
creates, rather than new infrastructure. **Not implemented. Not deployed.**
Weekly sending and Automatic remain out of scope.

---

## 13 · Real-role auth matrix — blocked on people

Verified with a real Entra session (`tuadmin@tributehomecare.com`):

| Role | Status |
|---|---|
| **Admin** | **PASS** — sign-in, hub picker, all three markets |
| MA CSM (Emily Willson, *via admin*) | **PASS** — profile, market, 4 nav groups, 23 clients, Home, Tracker, Email Community, deep links, Back/Forward |
| MD Market Director (Rachel Kruger, *via admin*) | **PASS** — 6 nav groups, 14 clients, Maryland, Pulse, Team Overview |

**Not verified, and I will not fake them.** The brief says not to impersonate
users or weaken auth, so these are listed as waiting on a person:

| Waiting on | Why it matters |
|---|---|
| **A non-admin CSM signing in themselves** | admin-routed profile selection is a different code path from a CSM whose own account resolves to one profile |
| **A CSC** (Sam Noren / Michelle Hejduk) | different scope, LTC visibility, Mine/All behaviour |
| **A Chicago CSM** | the only way to exercise Central time, Chicago/Illinois mapping, Chicago community scope and schedule dates |
| **A manager / senior CSM** | manager scope distinct from director |
| Expired-token behaviour | needs a session left idle past token lifetime |

**Chicago (§12) and CSC (§13) passes cannot be done by me at all** — both
require those accounts. The checklists are ready to run the moment someone
signs in.

---

## 14 · Production writes and V1 integrity

| | |
|---|---|
| **Production writes from V2** | **0** |
| Blocked attempts this session | recorded by feature, with user and timestamp |
| Policy leaks | **0** after the `usage_time` fix |
| **V1 `index.html` blob** | `c29f376…` — **byte-identical to `863a438`** |
| V1 live | 200 |
| V2 live | 200 |
| `main` | `ab183e7`, nothing unpushed |

---

## Verdict

### NOT READY FOR PILOT — two blockers

1. **Maryland Compliance can take 59 seconds**, twice a day, for whichever
   user hits the expired 12-hour cache. Fix: a prebuild timer, matching the
   one Pulse already has.
2. **Community Email takes 73 seconds per community**, because each
   interactive draft re-scans the whole company's week twice. Fix: cache the
   week scan across communities.

Both are backend scheduling changes with no business-rule impact, and neither
has been made — this phase measured only.

### Also required before real users

3. **A real non-admin CSM, a CSC and a Chicago CSM must sign in themselves.**
   Nothing else can exercise those paths honestly.

### Strongly recommended alongside

4. The `client_pulse?view=summary` projection — 3.18 MB → ~100 KB.
5. Deploy the vivProxy 404 fix on its own.

### Not blockers

Client-side performance is good throughout: navigation ~5ms, client switching
20–58ms, search 35–53ms, Maryland render 25ms. **The UI is not the problem
anywhere I measured.** Boot is already non-blocking — Home is usable at 253ms.
LTC is answered and correctly marked unvalidated.
