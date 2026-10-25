# Phase V — live external delivery for the pilot

API `b704820` · Hub `eb7ef93` · V1 `index.html` unchanged except the community-send dedupe
25 October 2026

## 1. Verdict

**PILOT LIVE EXCEPT ONE EXTERNAL ACTION.**

| External action | Pilot testers | Andrew / tuadmin walkthrough |
|---|---|---|
| Community Email — real send | **Live** | Suppressed |
| LTC caregiver text | **Live** | Suppressed |
| LTC carrier packet | Workflow live, **delivery blocked by V1's own carrier allow-list** | Suppressed |
| Weekly family email | Not built | Not built |

The carrier packet is the exception, and the reason has nothing to do with V2.
`LTC_LIVE_CARRIERS` is empty in production, so V1 refuses every live carrier
send with *"Live sending is off. No carriers are enabled in LTC_LIVE_CARRIERS."*
V2 now reaches exactly that same refusal rather than stopping earlier, which is
correct parity. A test send to the sender's own address works today. Enabling a
carrier is a business decision about which carriers Tribute submits to
electronically, it changes V1 as well as V2, and I have not made it.

## 2. What changed

**Delivery became a per-identity decision.** Before, `_liveDelivery()` read three
global flags. Setting them would have made Andrew's walkthrough mode live too,
which is the one thing the walkthrough exists to avoid. `_liveDeliveryForUpn`
now decides from the verified Entra UPN: a pilot tester transmits when the
capability's flag is on; a full-capability walkthrough account does not, unless
`V2_FULL_CAPABILITY_ALLOW_LIVE_DELIVERY` is explicitly set. Andrew is in both
sets and the walkthrough rule wins, which is the safe way round.

**The three external workflows joined the pilot capability set**
(`community_send_real`, `ltc_send_carrier`, `ltc_nudge_caregiver`). The
capability says the workflow runs end to end. Whether the last step transmits
is still the separate, default-off delivery flag. The two were deliberately
kept apart in Phase S and they are still apart.

**An unresolved identity transmits nothing.** `_liveDeliveryForUpn('')` used to
fall through to the base flags, which would have sent. It now fails closed, and
so does a throw while resolving the identity. The write gate resolves the same
UPN a moment earlier and refuses when it cannot, so this should be unreachable
— which is exactly why it must not fall through if it ever is reached.

## 3. Duplicate protection — the §9 requirement

Neither LTC send had adequate protection. Both disabled their button and asked
for confirmation. That stops a second click. It does not stop the case that
actually duplicates a carrier submission: the request is accepted, the reply is
lost on the way back, and the sender tries again. It does not stop a replay
either.

`_sendOnce` now claims a blob with `ifNoneMatch:'*'` **immediately before the
wire** — before `_graphSendMail` for the carrier packet, before the Viv unicom
POST for the caregiver text. Two requests for the same operation cannot both
win the claim.

- Everything above the claim is a guard and stays freely retryable.
- A send the far end refused with a status code releases the claim, so a
  corrected retry goes.
- A transport failure with no reply is ambiguous, so the claim stands.
- The claim expires after 15 minutes, so a deliberate resend ("the carrier says
  they never got it") still works. Nothing is blocked permanently.
- A duplicate is a 409 with an honest message and writes **no** "sent" entry
  into the record's history.

Claims live under `_sendonce/` in the `csm-hub` container. One small blob per
operation per window.

**Community Email** sends browser-to-Graph on V1's own path, so there is no
server to claim on. Its client-side guard was strengthened instead: the record
of what went out now lives in `localStorage` for the same 15 minutes rather
than an in-memory Set, because a reload right after a send that *looked* like it
failed is exactly when the same email goes twice. The key also no longer carries
the clock — two attempts either side of a minute boundary were counting as
different sends and getting through.

Both LTC protections apply to V1 as well as V2. V1 gained them; it lost nothing.

## 4. The seven conditions (§7)

A V2 external send requires all of these, in this order, server-side:

1. **Verified Entra identity** — `_entraGateOK`, then `_entraUpn` from the
   validated token. Never from the body or the query.
2. **Pilot membership** — `V2_PILOT_WRITERS`.
3. **Capability enabled** — the `X-Tribute-Capability` header must name a
   capability in the server's own enabled set.
4. **Category switch on** — `V2_WRITES_GRAPH` for the community email,
   `V2_WRITES_LTC` for both LTC sends.
5. **Global kill switch on** — `V2_BUSINESS_WRITES_ENABLED`.
6. **Live-delivery permission for this identity** — `_liveDeliveryForUpn`.
7. **V1's own workflow rules** — the carrier allow-list, the blank-note and
   proof-of-payment guards, the John Hancock upload-only route, caregiver
   thread resolution and ambiguity refusal. All unchanged and all still run.

V1 has no per-market or per-role restriction on LTC: any authenticated hub user
can act on the board. V2 is strictly **more** restrictive, because of conditions
2 to 6. I have not invented a role model V1 does not have.

## 5. Validation

**Executable, against the deployed source** — 71 checks in
`test/v2-live-delivery.test.js`, lifting the real functions out of
`vivProxy.js` and running them:

- all three flags off by default, for everyone
- flags on: each of the four pilot testers transmits on all three channels
- flags on: both walkthrough accounts suppressed on all three channels
- the walkthrough override works, and alone transmits nothing
- one flag does not turn on another
- an empty, blank, null or undefined UPN transmits nothing
- a throw while resolving the identity fails closed
- V1 requests are never narrowed
- the send-once claim: first wins, repeat loses, two concurrent requests
  produce exactly one winner, a different week/recipient/mode is a different
  operation, a refused send releases, an ambiguous failure holds, the window
  expires
- the claim sits after the guards and before the wire, the dry run returns
  before any claim, a duplicate throws rather than writing history

Suites: `v2-live-delivery` 71, `v2-write-gate` 94, `v2-pilot-stays-real` 19,
`v2-feedback-sanitize` 45, `vivproxy-unknown-endpoint` 16, `v2-perf` 30,
`csm-data-concurrency` 41, `ecsend-duplicate` 17. All passing.

**Forged requests, from outside the page** — against production, no token and a
junk bearer, on `ltc_send`, `ltc_nudge` and `v2_write_config`, with the V2
surface and capability headers set by hand: **401 on every one**, before any
send path.

**Live, with all three flags set to `true` in production** — signed in as
`tuadmin@`, a walkthrough account, the server answers:

```
liveDelivery: { community: false, ltcCarrier: false, ltcCaregiver: false }
fullCapability: true     suppressConsequential: true
capabilities: 15 enabled, weekly_schedule false
```

and the capability inspector reads **Suppressed** for the LTC carrier packet,
the LTC caregiver text and both Viv visit actions, while every workflow shows as
available. That is the §8 split working in production: the pilot's flags are on
and the walkthrough account still sends nothing.

**No external message was manufactured to prove any of this.** Per §12, nothing
was sent to a community, a carrier or a caregiver.

## 6. What I could not validate, and why

The server-side delivery suppression for the two LTC sends could not be
exercised end to end today. The LTC board has **zero rows for the current week**,
so there is no real submission to send and no caregiver nudge target. Reaching
the suppression branch needs a caregiver name that resolves to a single Viv
message thread, and manufacturing one would mean sending a real caregiver a real
text, which §12 rules out.

What stands in its place: the branch is proven by executing the deployed
decision function, the call sites are asserted in the write-gate suite, and the
fail-closed hardening in §2 removes the only path by which an unresolved
identity could have slipped through. The first natural live LTC action by a
pilot tester will confirm it.

One correction worth recording. While probing I saw a bogus capability reach the
`csm_data` handler and briefly read it as the write gate not firing. It was not.
V2's own fetch tripwire rewrites `X-Tribute-Capability` from its endpoint table
before the request leaves the browser, so a bogus capability cannot be sent from
inside the V2 page at all. Running the deployed gate in isolation refuses
`weekly_schedule`, an unknown name and an empty string with 403. The gate is
fine; the probe was measuring the wrong layer.

## 7. Production configuration now

```
V2_LIVE_COMMUNITY_SEND_ENABLED      = true
V2_LIVE_LTC_CARRIER_SEND_ENABLED    = true
V2_LIVE_LTC_CAREGIVER_TEXT_ENABLED  = true
LTC_LIVE_CARRIERS                   = (empty — blocks every live carrier send)
```

Everything else runs on its code default: business writes on, all five category
switches on, the walkthrough consequential override off, the walkthrough
live-delivery override off.

To stop any one channel: set its `V2_LIVE_*` to `false`. To stop a family:
`V2_WRITES_GRAPH` or `V2_WRITES_LTC` to `false`. To stop everything V2 writes:
`V2_BUSINESS_WRITES_ENABLED=false`. None needs a deploy.

## 8. Not done, by instruction

- TD-26 remains undeployed on both branches (hub `8c3b8d6`, api `9dfafc3`).
- No mobile or PWA work.
- The weekly family email is still unbuilt, and the guide says so.
- `LTC_LIVE_CARRIERS` left empty.
