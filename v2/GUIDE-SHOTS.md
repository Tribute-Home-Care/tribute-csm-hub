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
| `guide-coverage.png` | Page · Coverage Notes | Coverage Notes, My Clients tab | no | yes |
| `guide-fill-priority.png` | Page · Fill Priority | Fill Priority, ranked list | no | yes |
| `guide-email-community.png` | Page · Email Community | Community list, no draft open | no | yes (list only) |
| `guide-team.png` | Page · Team Overview | Manager Hub, all markets | 2 callouts | yes |

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

## Not captured, and why

**Client Pulse — deliberately not screenshotted.** The page is free-text
clinical narrative. A single row on the live page contained a client's name
with a quoted nickname, two caregivers' first names, three family contacts
by name, and a paragraph describing overnight confusion, coughing episodes
and a malfunctioning oxygen tank. Pattern matching cannot make prose like
that safe, and a partly-sanitised clinical note is worse than none because
it looks safe. A Pulse screenshot needs either a purpose-built demo record
or a redaction pass somebody reads line by line before it ships.

**LTC, Tribute Assistant and KPI Tracker** have no screenshot yet. LTC has no
operational records to show, and the other two are low-question pages. None
of them is blocked on safety.

## A label is not a person

The Team Overview capture had to be retaken: the sanitiser rewrote the stat
label "IN ONBOARDING" as "RUSSELL THORNE", because a two-capitalised-word
label looks exactly like a name. The capture pass now skips text that is
entirely uppercase or sits in an element styled `text-transform: uppercase`.
Check labels, not just names, before saving a screenshot.
