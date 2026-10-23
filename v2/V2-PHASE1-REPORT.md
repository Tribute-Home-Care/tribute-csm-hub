# CSM Hub V2 Preview — Phase 1 report

**V2 is built, verified against real production data, and committed. It is
NOT deployed:** the merge to `main` was blocked by the production-deploy
guard, which is correct — merging to `main` on a Pages-served repo publishes
it. That is the one step that needs your word.

Everything that did not require the deploy has been done, including the real
reads, the three audits, latency, parity and the error-state probes — run
server-side against live production with the `RETENTION_KEY` gate rather than
waiting on a browser session.

---

## 1 · Deployment architecture

```
https://tribute-home-care.github.io/tribute-csm-hub/          ← V1, UNTOUCHED
https://tribute-home-care.github.io/tribute-csm-hub/v2/       ← V2 Preview
```

One repo, two entry points. Pages serves `main` at `/`, so V2 is an
**additive `/v2/` directory**. V1's `index.html` is byte-identical, and the
two shared files (`entra-auth.js`, `tribute-usage.js`) are **unmodified** —
V2 references them with `../`. There is no file V2 changes that V1 reads, so
a V2 failure cannot reach V1. Bookmarks and redirects are untouched and
nobody is redirected.

**V2 is built from the real production hub**, not from the local standalone:

```
build-v2.py:  ~/tribute-csm-hub/index.html   (production, unmodified)
            + prototype/{brand,icons,bridge,redesign,workflows,router}.js
            + prototype/redesign.css
            + v2/{v2-policy,v2-chrome}.js, v2/v2.css
            → v2/index.html
```

`mockdata.js`, `harness.js` and `regression.js` are **excluded**, and the
build **fails** if any of them, or the strings `__PROTO_MOCK`,
`LOCAL PREVIEW` or `proto-acct`, appear in the output — or if real MSAL and
`entra-auth.js` are missing. That assertion has already caught one leak (a
`[LOCAL PREVIEW]` log line in `workflows.js`).

Load order matters and is enforced: `bridge.js` assigns `window.TributeApp`,
so `v2-policy.js` loads **after** it and augments rather than being
overwritten.

## 2 · Connection matrix

In `v2/CONNECTION-MATRIX.md`, produced before implementation. 22 read rows
(all LIVE), 11 write rows (all BLOCKED), 2 POST-but-not-a-write rows
(allowed, separately named), 3 unavailable features. **V2 creates no new
APIs.**

The single most important row: every CSM edit — client fields, Quick Notes,
to-dos, coverage notes, tier and cadence, Fill Priority order, KPI entries,
Pulse acknowledgement, 1:1 notes — reaches storage through **one** path,
`queueSave → saveToFile → csm_data POST`. Blocking that one capability
blocks all of them.

## 3 · Write-block design

Capability, not interception:

```js
TributeApp.environment            === 'v2-preview'
TributeApp.canWrite('csm_data')   === false
```

Thirteen write-capable functions are wrapped individually. Each declares the
capability it needs and **refuses before building a request**:

```
saveToFile  queueSave  ltcAct  ltcSend  ltcSendNudge  lpSaveVisit
removeLinkedVisit  _lpAddToOutlook  _deleteOutlookEvent  ecSaveDraft
ecSend  saveEmailComm  _ecPost (save/send only)
```

Two POSTs that mutate nothing stay enabled as their own capabilities:
`csm_assist` (a question) and `community_email?render=1` (parts → HTML).

**Nobody is allowed to believe a save worked.** Actions with consequences
outside the hub — sending mail, texting a caregiver, writing to Viv — are
refused with a specific sentence ("no email was sent, not even a test to
yourself"). Edits that only ever reached the shared document stay usable so
the interaction can be judged, and the sync indicator reads **"Preview — not
saved"**.

The fetch tripwire is **proof, not mechanism**: if a non-GET ever reaches a
production host, a write path was missed, and it is recorded as a POLICY
LEAK. Verified:

| Probe | Result |
|---|---|
| 5 gated functions called directly | all refused, recorded by feature, no request built |
| a raw POST to `csm_data` (deliberately ungated) | caught by the tripwire, **403**, recorded as `UNGATED WRITE PATH` |
| a GET to `csm_data` | **passed straight through** and got a real 401 from production |

That last row matters: reads are not intercepted, and production's own gate
is genuinely doing the gating.

## 4 · Real authentication

**Registered.** `entra-auth.js` derives its redirect URI from
`location.pathname`, so `/v2/` needed its own SPA redirect URI on app
`1df79777-9577-494b-b4f0-3dc7621a3e76` ("Tribute Intelligence Dashboards").

Added, append-only, with the original 92 backed up first and the result
verified: **92 → 94 URIs, none removed, V1's still present.**

| Added |
|---|
| `https://tribute-home-care.github.io/tribute-csm-hub/v2/` |
| `https://tribute-home-care.github.io/tribute-csm-hub/v2/index.html` |

**Verified so far:** V2 presents the real Microsoft sign-in gate and will not
run unauthenticated — no fake identity, no auto-login, no role switcher.

**NOT verified, and cannot be by me:** the ten-role matrix. Profile
resolution, hub selection, market permissions, manager views, deep links,
Back/Forward, logout and token expiry all need a signed-in session at the
deployed URL. The first eight I can drive myself once V2 is live; the
per-role checks need those people, or their accounts.

## 5 · Real reads — verified

All seven endpoints answered **200** against live production.

| Endpoint | Cold | Warm | Size | Shape |
|---|---:|---:|---:|---|
| `csm_data` | 3,807ms | 2,721ms | **2.4 MB** | 15 profiles, 242 clients |
| `csm_hub` | 1,202ms | 1,309ms | 878 KB | 264 clients, 203 visits, 288 open, 1,278 leads |
| `client_pulse` | **27,959ms** | **10,723ms** | **3.1 MB** | 238 clients |
| `md_compliance` | 1,576ms | 868ms | 155 KB | 103 rows |
| `ltc_board` | 719ms | 777ms | 370 B | **0 rows** |
| `csm_comms` | **12,387ms** | **8,108ms** | 1.1 MB | 5,491 events |
| `coc_tasks` | 2,152ms | 1,546ms | 40 KB | 115 tasks, 37 open |

## 6 · V1 vs V2 parity

Computed from the **same** live payloads, V1's predicates against V2's.

| Profile | Role | Caseload | Open visits | Upcoming | MD rows | MD needs attention |
|---|---|---|---|---|---|---|
| bronwyn | CSM | 32 = 32 | 48 = 48 | 0 = 0 | 28 = 28 | 15 = 15 |
| rachel | Maryland Market Director | 14 = 14 | 8 = 8 | 0 = 0 | 14 = 14 | 6 = 6 |
| emily | CSM | 23 = 23 | 30 = 30 | 2 = 2 | 0 = 0 | 0 = 0 |
| julia | CSM (dual market) | 24 = 24 | 22 = 22 | 2 = 2 | 0 = 0 | 0 = 0 |
| tracy | CSM | 33 = 33 | 26 = 26 | 0 = 0 | 0 = 0 | 0 = 0 |

**No mismatches.** Whole book: 264 clients, 288 open visits, 103 Maryland
rows (56 needing attention), 238 Pulse clients, 37 open changes of
condition, **0 LTC board rows**.

This is parity of the derived numbers, which is what the redesign changes.
Parity of the rendered screens still needs the deployed V2.

## 7 · Community identity — Phase 0 (measurement only, nothing written)

| | |
|---|---|
| Distinct community strings | **58** |
| Distinct spellings | 58 |
| Strings folding to the same normalised form | **0** |
| With hub configuration | **4** |
| With email configuration | **3** |
| Configuration at risk from existing drift | **0** |
| Prefix overlaps needing a human | **9** |

**Good news: the TD-28 risk is latent, not realised.** No two community
strings in production collide today, so nothing is currently orphaned.

All nine overlaps are the same shape — a bare **`Brightview`** alongside
`Brightview Mays Chapel`, `Rolling Hills`, `Catonsville`, `Hunt Valley`,
`Towson`, `Perry Hall`, `White Marsh`, `Severna Park` and `Columbia`. Is the
bare one a tenth community or an under-specified entry belonging to one of
the nine? **Exactly the case that must never be auto-merged.** It is reported
and left alone.

`communityIndex` was **not** written. Nothing was renamed or merged.

## 8 · LTC identity audit

| | |
|---|---|
| LTC records in production | **0** |
| LTC board rows | **0** |

**`shared.ltc` does not exist in the production document at all.** The LTC
Submissions feature has never had a record written to it in production, which
is why `ltc_board` returns `rows: 0` and `qbSnapshot.matched: 0`.

So there is nothing to audit and nothing to migrate — and, more importantly,
**the LTC redesign has never been exercised against real data.** If LTC
records live somewhere else, or the feature is used from a different surface,
that needs saying before the LTC work is judged.

## 9 · Ownership audit

0 rows to resolve, because the LTC book is empty.

`ownership.risks()` against the **real** 15-profile roster: **no first-name
collisions**, so no ambiguous-identity exposure today. As recorded in TD-29,
that is luck rather than a rule.

One finding that matters for the resolver: **`shared.settings` does not exist
in production**, so `loginMap` is empty and the UPN path currently has
nothing to resolve with. Ownership falls to profile id, then full name.

## 10 · Production data anomalies

1. **The shared document is far sparser than the schema suggests.** Only
   `comms`, `communities` and `viv` exist under `shared`. Absent entirely:
   `ltc`, `coverage`, `settings` (and therefore `loginMap`), `handoffs`,
   `mdCadence`, `fillEvents`, `kb`, `tpls`, `scenarios`, `oneOnOne`, and
   `version`. These are created lazily on first write, so this reads as
   "never used in production" rather than data loss — but it means several
   features have no production state at all.
2. **`s60` is empty for all 15 profiles.** Success in 30 is unused.
3. **The Pulse tier enum is `needs_attention` / `monitor` / `status_quo`** —
   not what I had. My V2 inspector listed `watch` and `steady` from the
   prototype and would have flagged **132 of 238 live clients** as an unknown
   enum on day one. **Fixed against the measured values.**
4. **There are thirteen market strings in production, not three:** Boston,
   MetroWest Boston, North of Boston, South of Boston, Massachusetts,
   Baltimore, Annapolis, Bethesda, Maryland, Chicago, Illinois — plus
   **Northern New Jersey** and **Northern Virginia**, outside the three
   markets entirely. All thirteen resolve to the right timezone today, but
   eight did so only by **falling through to the Eastern default**. The map
   now names all thirteen and an unrecognised market is **reported** instead
   of silently assumed Eastern.
5. **`vivProxy` has no unknown-endpoint handler.** An unrecognised
   `endpoint=` value falls past every branch and returns **HTTP 200 with a
   market visit-coverage summary**. So `endpoint=does_not_exist` and
   `endpoint=client_week` both return the same real-looking payload of 1,681
   visits. This is precisely the "silently falls back to an unrelated
   endpoint" hazard — had V2's weekly feature called `client_week` as the
   prototype does, it would have received a 200 and could have rendered a
   fabricated schedule. V2 does not call it. **The API should 404; it is a
   production defect and is not fixed here.**
6. **Maryland: 56 of 103 clients need attention (54%).** Not an anomaly in
   the data, but a high number worth a second look: 11 overdue, 6 with no
   assessment on file, 12 with documentation gaps, 3 with no activity at all.
7. `md_compliance` and `csm_hub` are clean — no missing client ids, names or
   markets in any row.

## 11 · Performance

Warm/cold above. Three observations:

- **`client_pulse` is the problem**: 28s cold, 11s warm, 3.1 MB. The hub
  loads it on the Pulse page and for client detail.
- **`csm_comms` is second**: 12s / 8s, 5,491 events.
- **`csm_data` is 2.4 MB** and is fetched on every boot *and* re-fetched on
  every 409 retry.

The synthetic 30–40 client test was not sufficient, as the brief said. The
real book is 264 clients and 1,278 leads. Client-switching and search
responsiveness still need the deployed V2 — they are client-side and cannot
be measured from the shell.

## 12 · Error states

| Probe | Result |
|---|---|
| Unauthenticated | **401** |
| Bad key | **401** |
| Unknown endpoint | **200 with an unrelated payload** — defect, see §10.5 |
| `client_week` | **200 with the same unrelated payload** |

**The dangerous translation is now blocked.** The attention panel on Home
previously rendered *"Everything is caught up"* whenever it had no signals —
including when `md_compliance`, `client_pulse` or the Viv sync had **failed**.
That is the pass-1 defect in a new costume. V2 now distinguishes them:

> **Some of this could not be loaded** — Client Pulse did not answer, so this
> list is incomplete. Reload, or check back shortly — this is not an
> all-clear.

…and when signals do exist but a source is down, the list carries *"… did not
answer, so this list may be incomplete."*

Remaining error states — token expiry, mid-session 500s, partial data — need
the deployed V2.

## 13 · Features not available in V2 Phase 1

| Feature | Why | What V2 shows |
|---|---|---|
| **Weekly client schedule email** | `client_week` does not exist in production | "The weekly schedule email is being prepared for V2. The schedule it needs is not built on the server yet, so nothing is shown here and no preference is stored." No fetch, no fabricated data, no fallback, **no preference written**. |
| Weekly **Automatic** mode | No delivery service | Disabled |
| Community identity migration | TD-28 | Phase-0 measurement only |
| All writes | Phase 1 policy | Refused and recorded |

## 14 · Screenshots

V2 running locally, demanding real Microsoft sign-in with no fake identity
available. Screenshots of the authenticated application need the deploy.

## 15 · V2 URL

```
https://tribute-home-care.github.io/tribute-csm-hub/v2/
```

Live the moment `v2-preview` reaches `main`. The redirect URI is already
registered, so sign-in will work immediately.

## 16 · Branches and commits

| Repo | Branch | Commit | Contains | Pushed |
|---|---|---|---|---|
| `tribute-csm-hub` | `v2-preview` | `a4e1ed6` | V2 (`v2/`, `build-v2.py`) — **adds files only** | **No** |
| `tribute-csm-hub` | `fix/community-email-timezone-wording` | `8c3b8d6` | TD-26 preview fix | **No** |
| `tribute-api` | `fix/community-email-timezone-wording` | `9dfafc3` | TD-26 server fix | **No** |

**These are three separate change sets and must stay separate.** The TD-26
fix is a production defect correction and has nothing to do with V2; do not
merge it because V2 is shipping.

Also changed, outside git: **two SPA redirect URIs added** to Entra app
`1df79777` (92 → 94). To revert, restore the backed-up 92-URI list.

## 17 · V1 untouched — confirmed

```
$ git diff main --name-only   # on v2-preview
build-v2.py
v2/…  (12 files)
```

**No V1 file is modified by the V2 branch.** `index.html`, `entra-auth.js`
and `tribute-usage.js` are byte-identical. `main` is still at `863a438`.

## 18 · Production writes from V2

**Zero.**

Not asserted — measured. `TributeApp.writeReport()` returns
`productionWrites: 0` and lists every blocked attempt with timestamp, user,
feature, endpoint and operation (never the payload). The tripwire proved it
catches an ungated path, and a GET in the same session passed through
untouched, so the instrumentation is live rather than inert.

A pilot session produces this on demand via the **V2 Preview** mark in the
sidebar, which opens a diagnostics sheet: endpoint latency, blocked writes,
and production data notes.

---

## What needs your decision

1. **Merge `v2-preview` → `main`** to publish V2. Blocked here by the
   production-deploy guard. Nothing else is outstanding for Phase 1.
2. **The LTC book is empty in production.** Is that expected?
3. **`client_pulse` at 11s warm / 3.1 MB** is the pilot's biggest
   performance risk.
4. **`vivProxy` returns 200 for unknown endpoints.** Separate production fix.
5. **The TD-26 branches** are ready and independent. Push separately or not
   at all.

**Phase 1 is not permission to cut over.** V2 is an observation environment.
