# V2 write matrix

Built before anything was enabled. A capability is turned on only where this
table shows what V1 already does, and where that path is safe with two
interfaces open at once.

The architecture rule is one line: **V2 writes through V1's own functions to
V1's own endpoints.** There is no V2 store, no sync layer and no copy of
business data. A Quick Note saved in V2 is the same bytes V1 reads.

## The shared document, and why it is split in two

Almost every CSM edit funnels through `saveToFile` → `POST csm_data`, one
JSON document with ETag concurrency. On a 409 V1 does this:

```js
if (P && DATA.profiles[P.id]) merged.profiles[P.id] = DATA.profiles[P.id];
merged.shared = { ...(merged.shared || {}), ...(DATA.shared || {}) };
```

Two different behaviours in two lines:

- **The profile pocket is safe.** Only the saver's own pocket is written back;
  every other person's pocket is taken from the server.
- **`DATA.shared` is not.** The spread replaces whole top-level keys with the
  saver's copy. If a colleague added a coverage note, a Fill Priority event or
  a community edit while this tab was open, the retry discards it — and it
  discards it for a user who only typed a Quick Note, because the stale
  `shared` block rides along with every save.

Ten keys are exposed: `assistant, comms, communities, coverage, fillEvents,
fillStatus, ltc, mdCadence, settings, viv`. Proved in
`test/csm-data-concurrency.test.js`, which lifts the merge out of index.html
and runs it rather than restating it.

This is a **pre-existing V1 defect** (TD-30). It is not caused by V2 and it
happens today between two V1 users. V2's answer is not to add a second source
of it: V2 writes no shared key at all, and its own 409 retry keeps the
server's shared block. See *Kill switch and safety* below.

## The matrix

| Feature | V1 production write path | Source of truth | V2 write function | Permission | Duplicate risk | Visible in V1 | Enable now | Reason |
|---|---|---|---|---|---|---|---|---|
| Quick Notes | `setStr('quicknotes')` → `queueSave` → `POST csm_data` | csm_data profile pocket | same function | CSM owns own pocket | none (debounced idempotent PUT) | yes | **YES** | pocket is 409-safe |
| To-dos | `set('todos')` → `queueSave` | pocket | same | own pocket | none | yes | **YES** | pocket is 409-safe |
| 1:1 notes | `set('checkins')` → `queueSave` | pocket | same | own pocket | none | yes | **YES** | pocket is 409-safe |
| KPI / reflection entries | `saveKPI` → `set('kpis')` | pocket | same | own pocket | none | yes | **YES** | pocket is 409-safe |
| Client metadata (tier, freq, contacts, notes) | `saveClient` → `set('clients')` | pocket | same | own caseload | none | yes | **YES** | pocket is 409-safe |
| Touchpoints / care conversations | `set('touchpoints')` | pocket | same | own pocket | none | yes | **YES** | pocket is 409-safe |
| Visit log | `set('visits')` | pocket | same | own pocket | none | yes | **YES** | pocket is 409-safe |
| Success in 30 | `set('s60')`, `set('s60_ms')` | pocket | same | own pocket | none | yes | **YES** | pocket is 409-safe |
| Pulse acknowledgement | pocket field via `set` | pocket | same | own caseload | none | yes | **YES** | pocket is 409-safe |
| Community Email **draft save** | `ecSaveDraft` → `POST community_email&save=1` | server-side draft blob | same | signed-in CSM | last write wins, no send | yes — same draft the Friday run reads | **YES** | not csm_data; single stored object |
| Coverage notes | `setCov` → `DATA.shared.coverage` | csm_data **shared** | gated | — | — | yes | **NO** | 409 drops a colleague's note |
| Fill Priority events / status / order | `createFpEvent`, `setFpStatus`, `setFpOrder` → `DATA.shared.fill*` | csm_data **shared** | gated | — | — | yes | **NO** | same |
| Community directory / email settings | `saveCommunity`, `saveEmailComm`, `ecSkipWeek` → `DATA.shared.communities` | csm_data **shared** | gated | — | — | yes | **NO** | same |
| Maryland cadence | `setMdCadence` → `DATA.shared.mdCadence` | csm_data **shared** | gated | — | — | yes | **NO** | same |
| Community Email **test send** | `ecSend(true)` → Graph `/me/sendMail` | the CSM's mailbox | gated | delegated Mail.Send | **HIGH** — no in-flight guard, no confirm on a test | Sent Items | **NO** | §15: no idempotency, no enablement |
| Community Email **real send** | `ecSend(false)` → Graph `/me/sendMail` | the CSM's mailbox + draft `sentAt` | gated | delegated Mail.Send | **HIGH** — only a `confirm()` stands between a double click and two emails | Sent Items | **NO** | same; needs a busy guard first |
| Outlook calendar add | `_lpAddToOutlook` → Graph events | the CSM's calendar | gated | delegated Calendars.ReadWrite | no idempotency key | yes | **NO** | external, unvalidated |
| Outlook calendar delete | `_deleteOutlookEvent` → Graph | the CSM's calendar | gated | delegated | destructive | yes | **NO** | external, destructive |
| Viv visit create / remove | `lpSaveVisit`, `removeLinkedVisit` | Viv | gated | Viv service account | creates real visits | yes | **NO** | external, unvalidated |
| LTC approve / mark sent / reopen | `ltcAct` | LTC store | gated | — | — | yes | **NO** | §7: no operational record exists to validate against |
| LTC send to carrier | `ltcSend` | carrier, outbound | gated | — | leaves Tribute | yes | **NO** | §7 |
| LTC nudge | `ltcSendNudge` | caregiver SMS | gated | — | leaves Tribute | yes | **NO** | §7 |
| Weekly client schedule email | `weekly_schedule` | — | gated | — | — | — | **NO** | §8: `client_week` is not implemented |
| Active-time telemetry | `tribute-usage.js` | usage store | not loaded in V2 | — | — | — | **NO** | a pilot must not skew real usage stats |
| HubSpot writes | none from the hub | — | — | — | — | — | **NO** | the hub does not write HubSpot; nothing to enable |

Enabled: **`csm_data_pocket`**, **`community_draft_save`**. Everything else is
false.

## Permission model

Three gates, all of which must agree, checked both in the page and again on
the server:

1. **The capability table** — what has been approved at all.
2. **The pilot allow-list** — Emily Willson, Julia Hanna, Kristen Mayhew,
   Courtney Chaulk, plus Andrew's two accounts to run the validation. Taken
   from the verified Entra token, never from the body or a header.
3. **`V2_BUSINESS_WRITES_ENABLED`** — the kill switch, read per request.

V2 stamps `X-Tribute-Surface: v2-preview` and `X-Tribute-Capability: …` on its
writes. V1 sends neither, so the gate never sees V1 traffic and V1 is
unaffected by anything here.

**Honest limit.** The surface header is set by the client, so someone could
strip it in devtools and write as though they were in V1. That is not an
escalation: these are the same people with the same V1 rights. The gate is a
pilot control, not a security boundary. The security boundary is the Entra
gate above it, unchanged. Existing role permissions are untouched — V2 grants
nobody a manager action they do not already have, because it calls the same
functions with the same `P` profile.

## Kill switch and safety

**To stop every V2 business write:**

```bash
az functionapp config appsettings set -g tribute-dashboard -n tribute-api-prod \
  --settings V2_BUSINESS_WRITES_ENABLED=false
```

It is read on each request, so it takes effect on the next call. No deploy, no
restart, no frontend rebuild. V2 stays up and readable, pilot feedback keeps
working (a different endpoint that does not pass through the gate), and open
tabs notice within 60 seconds because the page re-asks `v2_write_config`.

To narrow instead of stop, set `V2_WRITE_CAPABILITIES` to a subset, e.g.
`csm_data_pocket`. To restore the default, remove the setting.

**Three layers stop a shared-key write, not one:**

1. the capability `csm_data_shared` is false, so the editor functions refuse
   and tell the user to use V1 for that one;
2. the outgoing payload is rewritten so the `shared` block V2 sends is the
   server's own copy, whatever the page did to it in memory — this covers the
   editors that are lexical consts and cannot be wrapped, and any future one;
3. V2's own 409 retry keeps the server's `shared` rather than overwriting it.

The count of suppressed shared writes is reported in diagnostics rather than
hidden.

## Diagnostics

`businessWrites: 0` is no longer the goal. The panel now reports
`approvedBusinessWrites`, `blockedBusinessWrites`, `failedWrites`,
`duplicatePrevented`, `sharedWritesSuppressed`, `pilotFeedbackSubmissions` and
`policyLeaks`. Every approved write is logged with timestamp, authenticated
user, capability, endpoint, record type and outcome — never the body, which
carries client names and notes. The goal is **`policyLeaks: 0`**.

## Proposed V1 fix, not applied

TD-30 is worth fixing for V1 too, and the fix is small: capture `DATA.shared`
at load and, on a 409, apply only the keys that actually changed onto the
server's copy instead of spreading the whole object. That is a change to
index.html, so per §17 it is called out here and **not** made.
