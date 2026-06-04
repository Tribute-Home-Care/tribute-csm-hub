# Tribute CSM Hub

A self-contained workspace for Tribute Home Care Client Success Managers — caseload,
supervisory-visit cadence, family touchpoints, Success-in-30 onboarding, lead pipeline,
fill priority, coverage notes, and role expectations. One HTML file, no build step.

**Live app:** https://tribute-home-care.github.io/tribute-csm-hub/

## How data works (and where it doesn't go)

- **No client data lives in this repo or on GitHub Pages.** The page is just the app shell.
- Team data is stored in a shared `tribute_csm_data.json` file in a OneDrive folder each
  CSM connects on first launch (File System Access API — Chrome/Edge).
- **Viv Live Sync** pulls each CSM's book of business straight from Viv + HubSpot through
  the gated `csm_hub` endpoint on the team's `tribute-api` Azure Function proxy:
  - **My Clients** — every client where the CSM is the account manager in Viv
    (`clinicalManager`, falling back to `admin`), with community, city, start date and
    live status (pending discharge / on hold / hospitalized / discharged).
  - **Visit Log** — the CSM's "Home Visit" / "Home Assessment" bookings from the Viv
    schedule: past visits feed history + cadence, future ones show as Upcoming.
  - **Fill Priority** — unfilled (open) visits on the CSM's caseload, ready to be ranked
    High / Medium / Low for scheduling.
  - **Leads** — HubSpot deals owned by the CSM; deals that became Viv clients under that
    CSM auto-land in the Converted stage.
- The sync endpoint requires an access key (entered once per computer, stored only in
  that browser's localStorage). Viv wins on facts; everything a CSM types by hand
  (tiers, notes, cadences, contacts, priority factors) is never overwritten.

## Conventions

- Viv spells one CSM's name differently than the team does ("Emily Willson") — the
  name map lives in `VIV_NAMES` in `index.html`.
- Sync runs automatically on profile launch when 30+ minutes stale, or on demand from
  the sidebar ⟳ button.

## Development

Everything is in `index.html`. Open it locally in Chrome/Edge to test.
The proxy endpoint lives in the (private) `tribute-api` project: `src/functions/vivProxy.js`,
endpoint `csm_hub`, gated by the `RETENTION_KEY` app setting.
