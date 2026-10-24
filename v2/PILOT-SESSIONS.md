# V2 pilot — session pack

Everything needed to run the four sessions, and to hand the results back for
the consolidated report. Pre-flight below was run and passed on 2026-10-24.

**Pilot URL:** https://tribute-home-care.github.io/tribute-csm-hub/v2/
**V1 (unchanged, stays available):** https://tribute-home-care.github.io/tribute-csm-hub/

---

## Pre-flight (passed)

| Tester | Entra UPN | Resolves to profile | Role | Markets | In write allow-list |
|---|---|---|---|---|---|
| Emily Willson | Emily.Willson@ | `emily` | CSM | MA | yes |
| Julia Hanna | Julia.Hanna@ | `julia` | CSM | **MA + CHI** | yes |
| Kristen Mayhew | Kristen.Mayhew@ | `kristen` | CSM | MD | yes |
| Courtney Chaulk | Courtney.Chaulk@ | `courtney` | **manager** → market/profile picker | MA | yes |

Checked against the shipped matching logic, not assumed: each UPN was run
through `loginNorm` / `PROFILES` / `VIV_NAMES` exactly as the page does it.
Nobody will hit the "not linked to a CSM profile yet" screen.

Also verified: opening a profile and touching nothing produces **zero**
writes, so the diagnostics counters reflect real edits rather than
navigation.

---

## What to say to each tester

> Use V2 as your primary CSM Hub during the pilot. If V2 tells you an action
> is unavailable, use V1 for that action. Avoid editing the same item in V1
> and V2 at the same time.
>
> Use the Feedback button in the bottom-right the moment something is broken,
> confusing, hard to find, looks wrong, or gives you an idea. Don't save it up
> for the end.

Nothing further. Do not explain the design, do not give a click list, and do
not coach interpretation. The point is to watch ordinary work.

---

## Enabled now — V2 saves these for real, and V1 sees them

Quick Notes · to-dos · 1:1 notes · KPI entries · client metadata ·
touchpoints and care conversations · visit log · Success in 30 · Pulse
acknowledgement.

All of these are the shared production record. A change in V2 is the same
record V1 reads — proven live, both directions.

## Blocked — V2 will say so and name V1

Coverage Notes · Fill Priority · community settings · Maryland cadence ·
Community Email test send · Community Email real send · Outlook/calendar
writes · Viv writes · LTC actions · weekly client schedule email ·
Automatic sending.

Verified wording, live: *"Coverage note is shared across the whole team. V2
is not saving those yet — use V1 for this one."*

Community Email **draft save** is technically enabled but has had no clean
live parity test, because every configured community's current-week draft was
already sent. Leave it out of the instructions.

---

## Per-tester focus

### Emily — the ordinary-CSM baseline
Home, Client Tracker, client workspace, search, Pulse, notes, to-dos,
touchpoints, Success in 30.
Answer: does she know what needs attention? Can she find a client quickly?
Can she update her work without thinking about which version she is in? Is
anything harder than V1?

### Kristen — Maryland
Home, Client Tracker, Maryland Compliance, attention states, Pulse, client
updates, notes and touchpoints.
Answer: does Maryland Compliance tell her what needs action? Does anything
look falsely healthy? Are stale / loading / failure states clear? Can she go
from a compliance issue straight to the client?

### Julia — dual market
Work naturally in Massachusetts and Chicago.
Answer: does she always know which market she is in? Does Chicago behave as a
Central-time market? Does switching feel trustworthy? Does her data stay
correctly scoped? Does search behave after a switch?

### Courtney — manager and director view
Team-level visibility, individual CSM detail, client drill-down, attention
signals, Mine vs Team vs All.
Answer: can she tell who needs attention? Can she get from a team signal to
a client? Is there too much operational detail? What is missing for
management use?
She is a tester, not a feedback reviewer.

---

## Debrief — ask exactly these, capture their words

1. What felt easier than the current Hub?
2. What felt harder or more confusing?
3. Was there anything you expected to find but could not?
4. Did anything make you distrust the information?
5. If this replaced the current Hub tomorrow, what would bother you most?

Do not ask "do you like it". Do not explain intent before they answer.

---

## Stop the affected workflow immediately if

wrong client's data shown · unauthorised data exposure · wrong market data ·
a production write outside the approved capability · a policy leak · silent
data loss · a duplicate external action · a false all-clear caused by failed
data · a serious auth or role problem.

A layout nit or a moment of hesitation is **not** a stop condition.

## Do not change the product between testers

Patch mid-pilot only for security or privacy, incorrect data, a broken write,
a policy leak, an authorisation problem, or an unusable app. Everything else:
write it down, finish all four, then look for patterns.

---

## What to capture per session, so the report can be written

Per tester: which workflows they actually used; what they saved; anything
they had to do in V1 instead; defects; usability friction; anything that made
them doubt the data; how it felt performance-wise; what they submitted
through Feedback; and their debrief answers in their own words.

Classify each finding as one of: technical defect · data/parity ·
permission · performance · usability friction · training/expectation ·
feature gap · trust.

### Diagnostics, per session
Open the V2 diagnostics panel at the end of each session and record:
`approvedBusinessWrites`, `blockedBusinessWrites`, `failedWrites`,
`duplicatePrevented`, `pilotFeedbackSubmissions`, `policyLeaks`.

**`policyLeaks` must be 0.** `approvedBusinessWrites` above zero is expected
and good — it means V2 is doing its job. "Zero writes" is no longer the
success criterion.

### Feedback
Everything submitted in-app lands at
https://tribute-home-care.github.io/tribute-csm-hub/v2/feedback.html
(Andrew and tuadmin only). It is already sanitised: no client names, no ids,
no addresses.

---

## Known limits to carry into the pilot

**Pocket concurrency.** Two sessions on the same profile editing the same
pocket within the sync window can still lose one side; the pocket is
whole-replaced on a conflict. Shared keys are now safe (TD-30), the pocket is
not. Tell testers not to edit the same thing in V1 and V2 at once. If a real
conflict happens, record it, keep their work, report it — do not hide it, and
do not manufacture one to test.

**Audit line.** The client-side approved-write log records
`user: {profile: null, name: "unknown"}`. Server-side authorisation is
correct and unaffected. Folded into the next normal deployment.

---

## Deployment warning

Production API runs **`fd7e3b8`** on branch `v2-writes-on-prod` — not `main`.
Hub is **`fc6e7ca`**.

Any future deploy must preserve all four of: Platform v1, Phase J, TD-30, and
the V2 write gate. A deploy from a folder sitting on `main` will silently drop
the write gate, which already happened once today.
