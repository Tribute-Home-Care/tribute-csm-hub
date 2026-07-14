---
name: tribute-csm-hub
description: >
  Builds or updates the Tribute CSM Hub — a self-contained, single-file HTML dashboard for home care Client Solutions Managers,
  live-synced from Viv + HubSpot. Use this skill whenever the user mentions building, updating, fixing, or extending the
  Tribute CSM Hub dashboard. Also trigger when the user asks to: add a new page or feature to the hub, change the color scheme
  or branding, update role expectations or KPI data, add a new CSM profile, change visit cadence rules, update the AI assistant
  content, change what syncs from Viv, or when they paste a bug from the hub and ask for a fix. If the user says anything like
  "update the hub", "add to the dashboard", "the hub is broken", or "can the hub do X", use this skill immediately.
---

# Tribute CSM Hub — Build & Update Skill

You are building or updating the **Tribute CSM Hub**: a single-file HTML dashboard plus a companion JSON data file in a shared OneDrive folder, **live-synced from Viv (clients + schedule) and HubSpot (leads)** through a gated Azure Function endpoint.

## Canonical locations — read this first

```
Repo (SOURCE OF TRUTH):  github.com/Tribute-Home-Care/tribute-csm-hub
Local checkout:          <your clone>/index.html
Live app (what CSMs open): https://tribute-home-care.github.io/tribute-csm-hub/
Data file:               tribute_csm_data.json in the team's shared OneDrive folder (NEVER in the repo)
Sync endpoint:           the team's tribute-api Azure Function proxy → endpoint 'csm_hub' (key-gated; source in the private tribute-api project)
```

⚠️ **Anti-drift rule:** the original HTML copy in the manager's OneDrive folder is **legacy**.
All changes go through the repo: edit `index.html` → commit → push to `main` → GitHub Pages serves it.
If asked to edit an HTML copy outside the repo, point this out and edit the repo copy instead.

**Deploying app changes:** `git push` (Pages picks it up in ~1 min).
**Deploying sync-endpoint changes:** publish the (private) tribute-api function app.

## What the hub is

A daily-use web app for home care CSMs (Client Solutions Managers) that replaces scattered spreadsheets and trackers. Users open the Pages URL in Chrome/Edge. Data is read/written to a shared JSON file on OneDrive via the File System Access API — no server or login required. Viv/HubSpot facts arrive via the sync layer; CSM judgment stays manual.

**Markets served:** three market hubs — Massachusetts (🦞), Chicago (🌆), Maryland (🦀) — chosen on a hub-picker screen.
**Users:** 12 profiles: CSMs, CSCs, and two Senior CSM / managers (one per coast). One CSM is dual-market (MA+CHI) with an in-app market filter.
**Access:** the page is gated by Microsoft sign-in (MSAL, `entra-auth.js`). The signed-in account decides access: a CSM's login auto-opens their own profile (matched by display name / UPN local part against `PROFILES` + the `VIV_NAMES` aliases, with an explicit override map at `DATA.shared.settings.loginMap = {"upn": "profileId"}`); managers and admin UPNs (`ADMIN_UPNS`) get the full hub/profile picker; unknown accounts get a no-access notice. The manager password modal only remains as a no-account fallback.

---

## Viv Live Sync layer (added 2026-06-04)

One fetch per sync: `GET {VIV_PROXY}?endpoint=csm_hub`, authenticated with the Microsoft sign-in bearer token (preferred) or an `X-Retention-Key` fallback key (localStorage `tribute_csm_viv_key`). Server caches 30 min; first build after idle takes ~2 min, warm hits <1 s. Params: `weeksBack` (≤26, default 9), `weeksFwd` (≤9, default 4).

Returns `{clients, visits, openVisits, leads, metrics}`:
- **clients** — active Viv clients (+120d of discharges). CSM attribution = Viv `queries.clinicalManager.name`, falling back to `queries.admin.name`.
- **visits** — schedule bookings of type "Home Visit"/"Home Assessment" where the assigned worker is a CSM. Past → Visit Log + `lastVisit`; future → Upcoming card.
- **openVisits** — future unfilled billable shifts (no caregiver). Feeds the Fill Priority "Open Visits" card with High/Med/Low ranks (`fillRanks`).
- **leads** — HubSpot deals (open always, closed ≤18 mo) with `owner` = CSM name; `vivId` set when the deal matched a Viv client → auto-`Converted` + linked to the Hub client.
- **metrics** — per-CSM `{caseload, visits90d, leadsWon12mo, leadsClosed12mo, leadClosureRate12mo}` (start of the Role Expectation metrics).

**Merge semantics (sacred):** *Viv wins on facts* — `name, loc(community), city, startDate, market, vivStatus, vivDischarged, tributeSecure`. *Manual judgment is never overwritten* — `tier, freq, notes, contact(s), comm, caregivers, carePlanDate, vacation, rateHistory, birthday`, all priority factors. Clients are anchored by `vivId`; first sync matches existing manual entries by normalized name. A sync merges **all** profiles (shared data file), then `queueSave()`.

**Name map:** `VIV_NAMES` in index.html maps profile id → Viv/HubSpot spellings. Viv spells Emily "**Willson**"; Carrie is "**Faerber**". New CSM = add to `PROFILES` *and* `VIV_NAMES` (the same aliases also drive login→profile matching).

**New per-profile data keys:** `vivUpcoming` (future visits, replaced each sync), `vivOpenVisits` (replaced each sync), `fillRanks` (`{visitId: 'high'|'med'|'low'}`, persists, pruned when filled). New client fields: `vivId, vivNum, vivStatus, vivDischarged, tributeSecure, vivSyncedAt, market`. Viv-sourced visits: `{id:'viv<id>', source:'viv', vivType, vivClient}` — rendered read-only. Shared: `DATA.shared.viv = {generatedAt, window, counts, metrics}`.

**PHI rule:** client data NEVER goes in the repo, Pages, or any ungated endpoint. The sync endpoint stays behind the gate. `.gitignore` blocks `*.json`.

---

## Architecture

```
index.html               ← entire app: HTML + CSS + JS in one file (in the repo)
tribute_csm_data.json    ← shared data store on OneDrive (manual + synced, merged)
vivProxy.js / csm_hub    ← server-side: Viv auth, schedule scan, HubSpot slim-down, per-CSM metrics
```

### Data file structure (`tribute_csm_data.json`)
```json
{
  "version": 1,
  "lastSaved": "<ISO timestamp>",
  "lastSavedBy": "<CSM name>",
  "profiles": {
    "<profileId>": {
      "clients": [], "visits": [], "touchpoints": [], "checkins": [],
      "leads": [], "s60": [], "s60_ms": [], "todos": [],
      "vivUpcoming": [], "vivOpenVisits": [], "fillRanks": {},
      "quicknotes": "", "kpis": []
    }
  },
  "shared": {
    "coverage": [],
    "settings": { "vivEmail": "" },
    "viv": { "generatedAt": "", "counts": {}, "metrics": {} }
  }
}
```

---

## Design language

The hub uses the **Tribute Intelligence design system** — the same light, warm-stone look as the company's other operating dashboards. Light theme only.

**Color tokens (CSS variables in `:root`):**
```css
--canvas: #FAF8F4    /* page + sidebar background (warm stone) */
--surface: #FFFFFF   /* cards */
--line: #EAE6DF      /* borders */   --line-soft: #F1EEE8  /* soft bg/borders */
--ink: #1C1A17       /* text */      --muted: #8C857B      --muted-soft: #B7B0A6
--orange: #FF5A1F    /* accent — used SPARINGLY: brand dot + primary buttons */
--orange-dark: #E25309  --orange-soft: #FBEADF
--hi: #A4271E / --hi-bg: #F8E5E2     /* High Need / danger (soft/fg pill pair) */
--med: #92580B / --med-bg: #F8EEDB   /* Medium / warning */
--lo: #0F6E56 / --lo-bg: #E2F2EC     /* Low / good */
/* extra semantic accents: blue #3B72B8/#E8EFF7, purple #9D2667/#F6E7EF, teal #0F8F6B */
/* legacy aliases --navy/--gold still exist but now POINT AT ink/orange */
```

**Fonts:** Inter (body, letter-spacing −0.005em) + Space Grotesk (`h1/h2/.mt` display headings, −0.02em). Stat numbers (`.sv`) use the mono stack with tabular numerals.
**Chrome:** light sidebar (canvas bg + right border), text-only grouped nav (`.nav-icon` is display:none), active item = `--line-soft` pill + ink semibold; brand is `Tribute` + orange dot; footer tagline *"Remarkable, personified."*
**Feel:** Clean, professional, warm. Not clinical or cold. Tribute is relationship-driven.

**Key reusable classes:**
- `.card` — white rounded card with light shadow
- `.sc` — stat card (label / big number / subtext)
- `.tb` + `.hi/.med/.lo` — tier badge
- `.btn.btn-p` / `.btn.btn-g` / `.btn.btn-o` / `.btn.btn-d` — primary/gold/outline/danger
- `.fg` + `.fl` + `.fc` — form group / label / control
- `.g2/.g3/.g4` — 2/3/4-column grids
- `.ph` — page header (h2 + subtitle p)
- `.mo` + `.md` — modal overlay + dialog (note: `m-viv` = send-to-Viv email modal, `m-vivkey` = sync key modal)
- `.toast` — bottom-right toast notification
- `.tabs` + `.tab` + `.tc` — tab bar + tab + tab content

---

## Application pages

### Startup flow
1. **Microsoft sign-in** (entra-auth.js overlay, once per browser)
2. **Connect Folder screen** (`#screen-folder`) — File System Access API prompt to select the shared OneDrive folder
3. **routeAfterConnect()** — managers/admins → hub picker (`#screen-hub`: MA/CHI/MD cards) then profile grid; CSMs → their own profile auto-launches (dual-market CSMs pick their market first); unmatched accounts → `#screen-noaccess`.
4. On profile launch: auto Viv sync if last sync >30 min old (Microsoft token, no key needed). Sidebar ⟳ row = manual sync + status.

### Navigation sections

#### My Work
| Nav label | Page ID | Purpose |
|---|---|---|
| Home | `page-home` | Daily summary: stat cards, High Priority Tasks, to-dos + quick notes, Needs Attention, Upcoming Viv Visits card, 1:1 notes |
| Clients | `page-clients` | Master tracker table auto-populated from Viv (viv status badges; 🛡️ = Tribute Secure); rows expand to a client detail (visits / touchpoints / care conversations / LTC) with a log panel. LTC insurance records panel lives here too. |
| Success in 30 | `page-s60` | 30-day onboarding tracker: milestone checklist + touchpoint log + calendar + email templates |
| Coverage Notes | `page-coverage` | Shared vacation coverage notes (my clients + team tabs) |
| Fill Priority | `page-priority` | Event-based coverage ranking (manager-created events, drag-to-reorder, auto fill-scores) + the live "Open Visits — My Caseload" card from Viv, ranked 🔴/🟡/🟢 (`fillRanks`) |

(There is also a `page-comms` Communications page — due-now cadence, touchpoint log, care conversations — reachable in code; older pages Visit Log / Check-Ins / To-Dos / Leads were consolidated into Clients + Home, with their old render targets kept as hidden compat sinks. Leads data still syncs into profiles for KPIs even though the Leads page is gone.)

#### Resources
| Nav label | Page ID | Purpose |
|---|---|---|
| Tribute Assistant | `page-assistant` | Knowledge base, email templates ("Tributey" voice), scenario guides, decision framework |
| Role Expectations | `page-expectations` | CSM role expectations incl. KPI targets (dissatisfaction terms <1%, NPS ≥70, lead closure ≥55%, leads from existing accounts, doc & visit compliance) |
| KPI Tracker | `page-kpi` | Quarterly KPI entry + history. (Phase 2: auto-fill from `DATA.shared.viv.metrics` + NPS/discharge-reason feeds.) |

#### Manager (hidden for non-managers)
| Nav label | Page ID | Purpose |
|---|---|---|
| Team Overview | `page-team` | Cross-CSM summary; `DATA.shared.viv.metrics` available for live team stats |

---

## Client data model

Original manual fields (see repo `index.html` `saveClient()` for the authoritative list):
`id, name, tier, loc, city, type, ess, freq, startDate, lastVisit, birthday, contact, contactEmail, comm, caregivers, carePlanDate, vacation, rateHistory, notes, csm, weeklyHours, medComplexity, supportSystem, communityTier, recentInstability, endOfLife, recentFall, activeConcern`
plus the Viv-sync fields listed above. `id` for synced clients is `'viv'+vivId`.

## Visit & cadence rules

- Visit cadence: per-client `freq` (default 90 days, `NA` = no scheduled visits), adjustable via the cadence chip
- Touchpoint cadence by tier: High 14d / Medium 30d / Low 60d
- Care Conversations: High every 90d, Medium & Low every 180d — 8 structured questions (satisfaction 1–5, caregiver fit, communication, unmet needs, care plan accuracy, what's working, improvements, anticipated changes)

## Success in 30 — required milestones

Assessment (day 0–1) → caregiver prep call before 1st visit → 2nd in-person visit ≤14d → caregiver week-1 check-in → weekly family/GCM contact → Viv/tracker updated.
Touchpoint types: ASMT, VISIT, CG-PREP, CG-CHK, PHONE, VIV, OTHER.

## Tributey voice (for all templates/content)

Caregiver-first · warm but clear · boundaries-aware (CSMs coordinate, don't take over) · calm and solutions-oriented · explicit follow-through · love is a core Tribute value, present but professional.

---

## When updating the hub

1. **Work in the repo** — `index.html`. Read the relevant section first.
2. **Preserve all existing functionality** — changes are additive unless removal is requested.
3. **Match the design language** — existing CSS variables and classes.
4. **Use Edit (targeted find/replace)**, not whole-file rewrites.
5. **Respect the merge contract** — never let a new feature overwrite manual judgment fields from sync, and never push manual edits of Viv-owned facts (they'd be re-overwritten next sync anyway).
6. **New data structures** — `get()` defaults to `[]`, but make sure sync (`mergeVivProfile`) and any render functions handle them.
7. **Validate before pushing:** extract the inline script and `node --check` it.
8. **Endpoint changes** — happen in the private tribute-api project: syntax-check, deploy the function app, verify no-key→401 and a gated call.

Always keep it a single self-contained HTML file. External dependencies: Google Fonts, the MSAL CDN script, and `entra-auth.js` (shared sign-in, in the repo).
