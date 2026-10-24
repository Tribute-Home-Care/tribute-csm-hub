# V2 write matrix

Built before anything was enabled. A capability is turned on only where this
table shows what V1 already does, and where that path is safe with two
interfaces open at once.

The architecture rule is one line: **V2 writes through V1's own functions to
V1's own endpoints.** There is no V2 store, no sync layer and no copy of
business data. A Quick Note saved in V2 is the same bytes V1 reads.

## The shared document, and the TD-30 fix

Almost every CSM edit funnels through `saveToFile` → `POST csm_data`, one
JSON document with ETag concurrency. The 409 retry used to rebuild it as
`merged.shared = {...server.shared, ...my.shared}`, replacing whole top-level
keys with the saver's copy and discarding a colleague's work — even for a
saver who had only typed a Quick Note, because the stale `shared` block rode
along with every save.

**Fixed.** The retry is now a three-way merge at the level of a business
record: `base` (what this session last agreed with the server), `mine`,
`theirs`. If mine still equals base this session did not touch it and the
server wins; if theirs still equals base nobody else touched it and mine
wins; if both moved it is a conflict and is reported rather than resolved.

### Merge strategy per shared key

| Key | Shape | Record key | Independent records | Nested merge | Same-record concurrency possible | Policy |
|---|---|---|---|---|---|---|
| `coverage` | array of notes | `clientId` + `csmId` | yes | per record | yes (two CSMs, one client) | three-way per record; conflict reported |
| `communities` | map, keyed by community **name** | name, then field inside `email` | yes | 2 levels | yes | three-way per field; different fields both survive |
| `fillEvents` | array | `id` | yes | per record | yes | three-way per record |
| `fillStatus` | map `eventId` → `clientId` → record | event + client | yes | 2 levels | yes | three-way per record |
| `ltc` | array | `id` | yes | per record | yes | three-way per record |
| `mdCadence` | map `clientId` → days | clientId | yes | scalar | yes | three-way per client |
| `settings` | map field → value | field | yes | scalar | rare | three-way per field |
| `assistant` | `{kb, templates, scenarios}` | collection | partly | 1 level | rare | three-way per collection |
| `comms` | generated cache | whole | no | none | no | later `generatedAt` wins, by rule |
| `viv` | generated cache | whole | no | none | no | later `generatedAt` wins, by rule |

Production currently holds only `comms`, `communities` and `viv`; the other
seven are created lazily on first use, and the merge handles an absent key
without inventing one.

### Same-record conflict policy

No silent winner. When both sides changed the same field:

- the **other** person's value is kept — refusing to overwrite someone else
  is the safe direction;
- the record and field are named to the user ("Someone else changed
  communities.Goddard House.email.to while you were editing");
- everything else in the save still lands, so their other work is not lost;
- they are told to reopen that item and redo their change deliberately.

Retries are bounded at two. Beyond that the save reports "Save busy — try
again" and leaves their text on screen.

The profile pocket rule is unchanged: the saver's own pocket is written back,
every other pocket comes from the server.

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
| Coverage notes | `setCov` → `DATA.shared.coverage` | csm_data **shared** | gated | — | — | yes | **NO — next** | TD-30 fixed; awaiting the one-at-a-time validation in §12 |
| Fill Priority events / status / order | `createFpEvent`, `setFpStatus`, `setFpOrder` → `DATA.shared.fill*` | csm_data **shared** | gated | — | — | yes | **NO** | same |
| Community directory / email settings | `saveCommunity`, `saveEmailComm`, `ecSkipWeek` → `DATA.shared.communities` | csm_data **shared** | gated | — | — | yes | **NO** | same |
| Maryland cadence | `setMdCadence` → `DATA.shared.mdCadence` | csm_data **shared** | gated | — | — | yes | **NO** | same |
| Community Email **test send** | `ecSend(true)` → Graph `/me/sendMail` | the CSM's mailbox | gated | delegated Mail.Send | guard now built: in-flight flag, disabled buttons, idempotency key | Sent Items | **NO** | guard not yet exercised against a real send |
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
