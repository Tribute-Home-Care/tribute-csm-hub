# V2 pilot feedback

A pilot-only way for the four testers to say what the Hub did, without
leaving the page. V2 only. V1 has no part in it and references none of it.

## Where it lives

A fixed `Feedback` button, lower right (`#v2-fb-btn`, 20px from both edges).
It opens a panel in place; the panel is built on first open, so the page
carries nothing until someone asks for it. Nobody is navigated anywhere and
nothing in the workspace is disturbed.

The panel asks four things: **Type** (something is broken / confusing /
can't find something / data looks wrong / idea), **What happened?** (free
text, required), **What did you expect?** (optional), **Impact** (minor /
slowed me down / couldn't continue). One button: *Send feedback*. On
success it says *Thanks — feedback sent.*

## Storage

Its own blob container, `v2-feedback`. Nothing is written to `csm_data`,
Viv, HubSpot, LTC, community configuration or any client record. One blob
per submission at `YYYY-MM-DD/<id>.json`, with an immutable id of the form
`fb_<base36 time>_<random>`.

Fields: `id, submittedAt, user, displayName, profileId, role, market,
category, impact, message, expected, route, workspaceArea, build, browser,
viewport, technicalContext, status`. A status change adds `statusBy` and
`statusAt`.

No credentials, tokens, request headers or payloads are stored. `user` is
taken from the verified token, never from the request body, so a submission
cannot be filed under someone else's name.

## What is deliberately not captured

No client, caregiver or family name; no notes, communications, email
bodies, schedule detail or care information; no screenshots, ever.

Two sanitisers run server-side before anything is written:

- **route** — `#clients/viv6a07.../schedule` becomes `client workspace /
  schedule`. The *shape* of where someone was, never who they were looking
  at.
- **free text** (message and expected) — 24-hex ids become `[id]`, email
  addresses become `[email]`. A tester's own words are not automatically
  PHI, but a family's address lands in them easily ("the email to
  mary.smith@… didn't send"), and that is a client identifier however it
  arrived.

`technicalContext` is an **allow-list**, not a block-list: only `build,
buildAt, viewport, userAgent, online, language, staleSources,
failedSources, lastEndpointStatus, previousRoute, writeBlockedCount,
anomalyCount, sessionMs` survive, and each is itself run through the route
sanitiser. A new field added upstream is dropped until someone adds it
here on purpose.

## Write policy

Feedback is the one intentionally authorised V2 write:
`TributeApp.canWrite('v2_feedback') === true`. Every operational
capability stays false — `csm_data`, `ltc_action`, `ltc_send`,
`ltc_nudge`, `csm_visit`, `graph_calendar`, `graph_mail`,
`community_draft_save`, `community_send`, `weekly_schedule`,
`usage_telemetry`.

The fetch tripwire was not weakened. It still refuses every unlisted write
and records it. `v2_feedback` is allowed through one named branch and
counted on its own line, so the diagnostics panel reports:

```
Business / operational production writes: 0
Pilot feedback submissions:               N
```

A feedback submission can never make V2 look as though it has modified
operational data.

## Permissions

Submitting requires a signed-in Entra user; the server reads the UPN from
the token and refuses anything without one (a RETENTION_KEY service call
included). Reading and status changes are limited to
`V2_FEEDBACK_REVIEWERS`, currently Andrew's two accounts only. A signed-in
non-reviewer gets 403 from the API itself, not an empty list from a hidden
page, so a direct URL reaches nothing.

Courtney is both leadership and one of the four testers. Whether a tester
may read other testers' notes is Andrew's call, so she is not on the list
yet. Adding her is one line; taking the data back after she has read it is
not.

## Reviewing

`v2/feedback.html`. Date and time, tester, type, impact, the feedback, what
they expected, route / market / role, build, and a status dropdown: New,
Reviewed, Fix planned, Resolved, Not changing. Filters by tester, type,
impact and unresolved. It is a review list, not a ticketing system.

## Failures

If the send fails the panel keeps every word the tester typed, says plainly
that it was **not** sent, and offers *Retry sending*. Nothing is discarded
and a failure is never reported as success. A double or triple click sends
one submission: the panel holds a `busy` flag, and the server absorbs a
repeated `clientKey` through a marker blob.

On the review page a failed status change puts the dropdown back to the
status the server actually holds and shows an inline message, so the screen
never displays a state that was rejected.

## Two defects found by testing rather than reading

**The endpoint regex rejected digits.** `/[?&]endpoint=([a-z_]+)/` parsed
`v2_feedback` as `v`, so the tripwire blocked the one authorised write and
logged a policy leak against a capability called "v". Found by submitting.
Widened to `[a-z0-9_]+` in `v2-policy.js`, `v2-chrome.js` and `harness.js`.

**The status change was sent as PATCH.** The vivProxy route registers
`GET, POST, OPTIONS`, so PATCH never reached the function: the dropdown
moved and nothing saved. Found by reading the status back from the server
instead of from the control that had just been clicked. It now posts
`{op:'status'}` behind the same reviewer gate, and both entry points call
one writer. The route was deliberately **not** widened to accept PATCH —
that hands a new method to all 214 endpoints to fix one, and several treat
anything that is not POST as a read.

## Tests

`tribute-api/test/v2-feedback-sanitize.test.js`, 45 checks. It lifts
`sanitizeRoute` and `sanitizeText` out of `vivProxy.js` and runs them, so a
rewrite is tested rather than a copy. It also pins the parts of this
document that are promises rather than code paths: no client-identifying
field in the stored record, SAFE_TC as an allow-list, identity read from
the token, 403 to a signed-in non-reviewer, the duplicate-click marker, and
that the status change is reachable by the method the route accepts.
