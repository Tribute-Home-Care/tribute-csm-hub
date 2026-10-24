# Guide screenshot inventory

Every image in the guide, where it is used, and how to make it again.
All taken from the deployed V2 Hub, October 2026.

| File | Guide section | Source screen | Annotated | Sanitised |
|---|---|---|---|---|
| `guide-market-select.png` | Page · Choosing a market | Market picker, signed in | 1 callout | n/a (no client data on screen) |
| `guide-home-overview.png` | Page · Home | Home, MA, a CSM caseload | 3 callouts | yes |
| `guide-client-tracker.png` | Page · Client Tracker | Client Tracker with a client open | 3 callouts | yes |
| `guide-client-workspace.png` | Page · Client workspace | Workspace pane, detail crop | 3 callouts | yes |
| `guide-success-in-30.png` | Page · Success in 30 | Success in 30, empty state | no | n/a |
| `guide-md-compliance.png` | Page · Maryland Compliance | Compliance board, MD market | 3 callouts | yes |
| `guide-feedback-button.png` | Page · Feedback | Lower-right corner crop | no | n/a |
| `guide-feedback-panel.png` | Page · Feedback | Feedback panel, filled in | no | n/a (example text is invented) |
| `guide-blocked-action.png` | Task · When V2 says an action is not available | The blocked-action message | no | n/a |

## How to regenerate

1. Open the deployed Hub: `https://tribute-home-care.github.io/tribute-csm-hub/v2/`
2. Sign in and choose the market the shot needs (Maryland for the compliance board).
3. **Sanitise before capturing anything that shows clients.** Two passes are
   needed, and the second is not optional:
   - walk `DATA` and replace every name-shaped value with a pseudonym;
   - then walk the DOM and replace any remaining `Firstname Surname` pair
     whose surname is not already a pseudonym.
   The second pass exists because the first one misses names that reach the
   screen from a cache rather than from `DATA` — the first Maryland capture
   leaked five real surnames and was thrown away.
4. Verify before saving: list every `Firstname Surname` in the captured
   region and confirm each surname is one of the pseudonyms, or belongs to
   Tribute staff. Staff names are internal, not PHI, and are left as they are.
5. Capture the region rather than the whole browser, so text stays legible.
6. Save into `v2/guide-shots/` under the existing filename.

## Rules

- No client, caregiver or family names; no addresses, phone numbers or email
  addresses; no notes or care information.
- Tribute staff names may appear — the Hub is internal and the ownership
  column is part of what the screenshot is teaching.
- Never show a capability as available when it is blocked.
- Callout coordinates in `guide-content.js` are **percentages** of the image,
  so a replacement at a different resolution keeps its annotations. If the
  layout moves, update the percentages.

## Not yet captured

Client Pulse, Coverage Notes, Fill Priority, Email Community and Team
Overview are described in the guide without a screenshot. They need a
capture from an account with the right role and market, with the same
two-pass sanitisation.
