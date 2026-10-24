# CSM Hub V2 Preview — connection matrix

Produced **before** implementation, by reading the production source
(`tribute-csm-hub@863a438`, `tribute-api@0eb5c8f`). Every row names the real
production contract V2 will consume. **V2 creates no new APIs.**

Authentication is **Entra (MSAL)** for every row. The hub acquires a token
for `api://1df79777-9577-494b-b4f0-3dc7621a3e76/Dashboards.Read` and sends it
as a bearer token via `dataHeaders()`; `vivProxy` gates on `_entraGateOK`
with a `RETENTION_KEY` fallback. V2 uses the same path unchanged.

---

## Reads — all LIVE in Phase 1

| Feature | Endpoint / source | Method | V2 Phase 1 | Missing dependency |
|---|---|---|---|---|
| Shared CSM document | `csm_data` (`loadDataFromFile`) | GET | **LIVE** | none |
| Viv + HubSpot sync | `csm_hub` (`vivSyncNow`) | GET | **LIVE** | none |
| Communications feed | `csm_comms` (`vivSyncNow`) | GET | **LIVE** | none |
| Client Tracker | `csm_hub` + `csm_data` | GET | **LIVE** | none |
| Client Pulse | `client_pulse` (`loadPulse`) | GET | **LIVE** | none |
| Change of condition | `coc_tasks` (`loadCoC`) | GET | **LIVE** | none |
| Care plan (client detail) | `csm_careplan` (`loadCarePlan`) | GET | **LIVE** | none |
| Maryland Compliance | `md_compliance` (`renderMd`) | GET | **LIVE** | none |
| LTC submission board | `ltc_board` (`renderLtcSubmissionBoard`) | GET | **LIVE** | none |
| LTC records | `csm_data` → `shared.ltc` | GET | **LIVE** | none |
| LTC packet preview | `ltc_packet` (`ltcPreview`) | GET | **LIVE** | none |
| LTC sheet export | `ltc_sheet` (`ltcDownloadAll`) | GET | **LIVE** | none |
| QuickBooks doc lookup | `qb_doc` (`ltcDownloadAll`) | GET | **LIVE** | none |
| Communities directory | `csm_data` → `shared.communities` | GET | **LIVE** | none |
| Community HubSpot activity | `community_activity` (`loadCommunityHubspot`) | GET | **LIVE** | none |
| Community send history | `community_email?history=1` | GET | **LIVE** | none |
| Email Community draft | `community_email?draft=1` | GET | **LIVE (read-only)** | none |
| Success in 30 | `csm_data` → profile `s60` | GET | **LIVE** | none |
| Fill Priority | `csm_data` + `csm_hub` openVisits | GET | **LIVE** | none |
| KPI Tracker | `csm_data` → profile `kpis` | GET | **LIVE** | none |
| Team Overview | `csm_data` + `shared.viv.metrics` | GET | **LIVE** | none |
| Identity / profile resolution | MSAL account + `PROFILES` + `VIV_NAMES` + `shared.settings.loginMap` | — | **LIVE** | none |

## Writes — all BLOCKED in Phase 1

| Feature | Endpoint / source | Method | V2 Phase 1 | Capability key |
|---|---|---|---|---|
| Save shared document | `csm_data` (`saveDataToFile`) | POST | **BLOCKED** | `csm_data` |
| LTC approve / sent / confirm / reopen | `ltc_board` (`ltcAct`) | POST | **BLOCKED** | `ltc_action` |
| LTC send packet | `ltc_send` | POST | **BLOCKED** | `ltc_send` |
| LTC nudge caregivers (SMS) | `ltc_nudge` | POST | **BLOCKED** | `ltc_nudge` |
| Create visit in Viv | `csm_visit` | POST | **BLOCKED** | `csm_visit` |
| Delete visit in Viv | `csm_visit&action=delete` | POST | **BLOCKED** | `csm_visit` |
| Create calendar event | Graph `/me/events` | POST | **BLOCKED** | `graph_calendar` |
| Delete calendar event | Graph `/me/events/{id}` | DELETE | **BLOCKED** | `graph_calendar` |
| Save community email draft | `community_email?save=1` | POST | **BLOCKED** | `community_draft_save` |
| Send community email (incl. test) | `community_email?send=1` / `?test=1` | POST | **BLOCKED** | `community_send` |
| Send mail from the CSM's Outlook | Graph `/me/sendMail` | POST | **BLOCKED** | `graph_mail` |

Everything a CSM edits — client fields, Quick Notes, to-dos, coverage notes,
tier and cadence, Fill Priority order, KPI entries, Pulse acknowledgement,
1:1 notes — reaches storage through **one** path, `queueSave` →
`saveDataToFile` → `csm_data` POST. Blocking that one capability blocks all
of them, which is why `csm_data` is the single most important row here.

## POST that is not a write

| Feature | Endpoint | Method | V2 Phase 1 | Note |
|---|---|---|---|---|
| Tribute Assistant | `csm_assist` (`assistFetch`) | POST | **LIVE** | POST carries the question; it mutates nothing. It does spend Anthropic API budget, so it is a named capability (`assist`) and can be turned off independently. |
| Render community email | `community_email?render=1` | POST | **LIVE** | Returns HTML from supplied parts. No persistence. |

## Not available in V2 Phase 1

| Feature | Why | V2 behaviour |
|---|---|---|
| **Weekly client schedule email** | `client_week` **does not exist in production** — confirmed, zero occurrences in `vivProxy.js`. The prototype endpoint is synthetic. | Feature visible, explained, inert. No schedule data fabricated, no fallback to another endpoint, no preference written. |
| Weekly schedule **Automatic** mode | No delivery service (`WEEKLY-EMAIL.md`) | Disabled, as in the prototype |
| Community identity migration | TD-28 — no stable id exists | Phase-0 measurement only; `communityIndex` is never written |

---

## What must be registered before V2 can authenticate

`entra-auth.js` builds its redirect URI as `location.origin + location.pathname`,
so a new path needs a new SPA redirect URI on app
`1df79777-9577-494b-b4f0-3dc7621a3e76` ("Tribute Intelligence Dashboards").

| | |
|---|---|
| Currently registered for the hub | `https://tribute-home-care.github.io/tribute-csm-hub/`<br>`https://tribute-home-care.github.io/tribute-csm-hub/index.html` |
| V2 needs | `https://tribute-home-care.github.io/tribute-csm-hub/v2/`<br>`https://tribute-home-care.github.io/tribute-csm-hub/v2/index.html` |

The app currently holds **92** SPA redirect URIs and `az ad app update`
**replaces** the whole array, so the change is read-append-write with the
original list backed up first and verified after.
