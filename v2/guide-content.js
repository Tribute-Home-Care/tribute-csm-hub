/* ═══════════════════════════════════════════════════════════════════════════
   TRIBUTE CSM HUB — GUIDE CONTENT
   ═══════════════════════════════════════════════════════════════════════════
   All the words, in one place, so changing wording never means touching
   markup. The renderer (guide-views.js) turns this into pages, and the same
   content is used by the Guide inside the Hub and by the standalone page.

   The shape follows the product rather than the database: a CSM is
   responsible for CLIENTS, and everything else is a tool for caring for them.
   So "Working with a client" comes before the module-by-module material, and
   nothing here describes a capability that does not exist yet.

   Screenshots are taken from the Hub running on SYNTHETIC data. No real
   client, family or caregiver appears in any image in this guide.
   ═══════════════════════════════════════════════════════════════════════════ */
window.GUIDE = (function () {
  'use strict';

  const UPDATED = 'October 2026';
  const BUILD_NOTE = 'Screenshots are of the current Hub, taken against synthetic data.';

  /* ── The shelf ─────────────────────────────────────────────────────── */
  const TOPICS = [
    { id: 'start',   title: 'Start here',
      lede: 'What the Hub is for, how it is laid out, and how to get help.',
      entries: ['what-it-is', 'how-organised', 'find-client', 'getting-help'] },
    { id: 'client',  title: 'Working with a client',
      lede: 'The client is the centre of the Hub. This is everything inside one.',
      entries: ['overview', 'care-plan', 'schedule', 'activity', 'care-team',
                'client-information', 'communication', 'pulse-care', 'ltc-other', 'record-visit'] },
    { id: 'work',    title: 'Managing your work',
      lede: 'Your day, your caseload and the things with a clock on them.',
      entries: ['home', 'coverage', 's30', 'priority', 'pulse'] },
    { id: 'ops',     title: 'Operations',
      lede: 'The machinery behind the caseload.',
      entries: ['md', 'ltc', 'emailcomm', 'team'] },
    { id: 'tools',   title: 'Tools',
      lede: 'What you reach for.',
      entries: ['assistant', 'kpi', 'expectations', 'feedback'] },
    { id: 'mobile',  title: 'On your phone',
      lede: 'The Hub installs on an iPhone and is built to be used standing up.',
      entries: ['install', 'mobile-nav', 'mobile-field', 'mobile-forms', 'mobile-login'] }
  ];

  /* ── Articles ──────────────────────────────────────────────────────── */
  const A = {

    /* ─ Start here ─ */
    'what-it-is': {
      title: 'What CSM Hub is',
      lede: 'One place for your caseload, instead of several trackers and a memory.',
      body: [
        { p: 'CSM Hub pulls your clients, their visits and their open shifts straight out of Viv, ' +
             'and keeps your own judgment — tiers, notes, touchpoints, care conversations, coverage — ' +
             'alongside them. Viv stays the record. The Hub is where you work.' },
        { h: 'What it does for you', ul: [
          'Shows you what needs you today, before anything else.',
          'Opens a client and tells you who they are, who is with them and what is happening.',
          'Keeps the cadence — visits, touchpoints, care conversations — so you are not tracking dates in your head.',
          'Shares coverage notes with the people who cover for you.',
          'Carries the operational work: Maryland compliance, LTC submissions, community emails.'
        ] },
        { h: 'What it does not do', ul: [
          'It does not replace Viv. Client records, care plans and the schedule live there.',
          'It does not schedule caregivers. It shows you where coverage is open.',
          'It does not store anything about a client on your phone.'
        ] }
      ],
      related: ['how-organised', 'overview', 'install']
    },

    'how-organised': {
      title: 'How the Hub is organised',
      lede: 'Three groups on the left, four on a phone. Everything else is inside a client.',
      shot: { src: 'guide-shots/guide-nav.png',
        alt: 'The Hub sidebar showing three groups: Work, Operations and Tools.',
        caption: 'The rail on a desk. You only see what your role allows.' },
      body: [
        { h: 'Work', p: 'Home, Clients, Coverage, Success in 30, Fill Priority and Client Pulse. This is the day.' },
        { h: 'Operations', p: 'Maryland Compliance, LTC, Community Email and Team. The machinery behind the caseload.' },
        { h: 'Tools', p: 'Assistant, KPI Tracker, Role Expectations, Guide and Feedback.' },
        { h: 'On a phone', p: 'Four destinations along the bottom — Home, Clients, Coverage and More. ' +
          'More opens the same list, in the same three groups, scrolling down. Nothing is hidden sideways ' +
          'and nothing is reachable on a desk but not on a phone.' },
        { h: 'Your role decides what you see', p: 'A CSM, a CSC and a director do not see the same rail. ' +
          'Nothing in the Hub lets you reach a page your role does not have — including a link somebody sends you.' }
      ],
      know: ['The market you are in is shown in the Hub chrome and scopes everything: clients, coverage, communities and times.'],
      related: ['find-client', 'mobile-nav', 'home']
    },

    'find-client': {
      title: 'Find a client',
      lede: 'Three ways in, depending on what you remember.',
      shot: { src: 'guide-shots/guide-clients.png',
        alt: 'The Clients page with the caseload list on the left and a client open on the right.',
        caption: 'Clients: your caseload, worst first, with the client open beside it.' },
      body: [
        { steps: [
          { t: 'Open Clients', b: 'Your caseload, ordered so anything out of cadence is at the top.' },
          { t: 'Search', b: 'The box above the list, or the magnifying glass in the top bar on a phone. ' +
            'Search matches the name, the community, the town, the street and the client number — so part of an address finds the person.' },
          { t: 'Or press ⌘K', b: 'Anywhere in the Hub. Start typing a name and go straight there.' }
        ] },
        { h: 'If you cannot find someone', ul: [
          'Check the market first. It is almost always the market.',
          'If you are a manager, check whether you are looking at Mine rather than Team or All.',
          'Discharged clients drop off the Hub. Look them up in Viv.'
        ] }
      ],
      related: ['overview', 'how-organised']
    },

    'getting-help': {
      title: 'Where to get help',
      lede: 'This guide, the question mark on a page, and Feedback.',
      body: [
        { ul: [
          'Most pages carry a “What is this page for?” link that opens this guide at the right part.',
          'Guide sits under Tools in the rail, and under More on a phone.',
          'Feedback goes to the people building the Hub. Say what you were doing and what the screen did.'
        ] },
        { h: 'What Feedback sends', p: 'Which page you were on, your role and market, and technical detail about the screen. ' +
          'No client, caregiver or family information, and never a screenshot.' }
      ],
      related: ['feedback', 'trouble']
    },

    /* ─ Working with a client ─ */
    overview: {
      title: 'Client Overview',
      lede: 'What you need to know about this client right now, in the order you need it.',
      shot: { src: 'guide-shots/guide-client-overview.png',
        alt: 'A client profile showing the name, market and status, the address, four actions, and the Overview section.',
        caption: 'The client, not a dashboard about the client.',
        callouts: [
          { n: 1, x: 4,  y: 5,  title: 'Who, and where',
            b: 'Name, market and status, then the address. Straight from Viv.' },
          { n: 2, x: 4,  y: 20, title: 'What you do standing there',
            b: 'Call, Directions, Log contact, and Scribe to document the visit.' },
          { n: 3, x: 4,  y: 40, title: 'Needs attention',
            b: 'Only appears when something is actually wrong. No news is good news.' },
          { n: 4, x: 4,  y: 53, title: 'Today',
            b: 'Today’s real caregiver schedule, in the client’s own time.' }
        ] },
      body: [
        { h: 'The header', p: 'The client’s name, their market and current status, and their address as Viv holds it. ' +
          'Call dials the number on file. Directions opens the address in Maps.' },
        { h: 'Needs attention', p: 'Shown only when there is something: a visit or touchpoint out of cadence, ' +
          'an unacknowledged Pulse read, an open visit today. If this section is not on screen, nothing is flagged. ' +
          'There is deliberately no “all clear” card — a reassurance shown every day is what stops people reading the one that matters.' },
        { h: 'Today and Next visit', p: 'Today’s caregiver visits with start and end times, then the next one after today. ' +
          'An open visit is marked “Needs coverage”.' },
        { h: 'Care snapshot', p: 'A short read of the care plan — the sections the plan itself flags as important. ' +
          'Full care plan is one tap away.' },
        { h: 'Care team and Recent', p: 'Who is currently visiting, and the last few things anyone did with this client.' }
      ],
      know: [
        'If the Hub cannot reach Viv it says so and offers Try again. It never shows an empty day instead.',
        'Four sections sit along the top — Overview, Care Plan, Schedule, Activity — and More holds Care Team, Client Information, Communication, Pulse & Care, and LTC & Other.'
      ],
      related: ['care-plan', 'schedule', 'care-team', 'client-information']
    },

    'care-plan': {
      title: 'Care Plan',
      lede: 'The client’s approved Care Plan from Viv, laid out to be read standing up.',
      shot: { src: 'guide-shots/guide-care-plan.png',
        alt: 'A client care plan grouped into sections with questions and answers.',
        caption: 'The plan’s own sections, in the plan’s own words.' },
      body: [
        { h: 'Where it comes from', p: 'The Care Plan document on the client’s record in Viv, under Documents. ' +
          'The Hub shows the latest APPROVED Tribute Care Plan on file — not simply the most recently edited one. ' +
          'Abandoned drafts, plans someone has archived, and test documents are never treated as current. ' +
          'If a client has no approved plan at all, the Hub shows the newest one there is and marks it Not approved.' },
        { h: 'How it is laid out', ul: [
          'The plan’s own section headings, in the plan’s own words. Nothing is renamed.',
          'Any section the plan itself marks IMPORTANT or PLEASE READ comes first.',
          'Demographics go last — the name and address are already in the header.',
          'Long sections are folded; tap the heading to open one.'
        ] },
        { h: 'The Hub is not the record', p: 'This is a reader. Changing a care plan happens in Viv, ' +
          'and the link at the bottom opens the signed plan there. If the plan here looks out of date, ' +
          'the answer is almost always that a newer one has not been approved in Viv yet.' }
      ],
      know: [
        'The date and approver are shown at the top, and a plan over six months old is flagged as such.',
        'If Viv holds no approval date for an approved plan, the Hub says “Approval date not recorded in Viv” rather than showing another date in its place.',
        'If a plan has no structured answers recorded, the Hub says so rather than showing an empty page.'
      ],
      related: ['overview', 'schedule']
    },

    schedule: {
      title: 'Schedule',
      lede: 'Who is coming, and when.',
      shot: { src: 'guide-shots/guide-schedule.png',
        alt: 'A client schedule grouped by day, each visit showing times and the caregiver.',
        caption: 'Today, Tomorrow, then each day by name.' },
      body: [
        { h: 'How it reads', p: 'Today first, then Tomorrow, then each day by name for the next two weeks. ' +
          'Each visit shows the start and end time and who is coming.' },
        { h: 'The three states', ul: [
          'A caregiver’s name means the visit is assigned to them.',
          'Open visit means nobody is assigned yet. It is marked “Needs coverage”.',
          'Cancelled visits are shown as cancelled rather than quietly removed.'
        ] },
        { h: 'Times are the client’s, not yours', p: 'Every time on this page is in the client’s own market time. ' +
          'A Chicago visit at 2:30pm shows as 2:30pm whether you are reading it in Boston or Baltimore. ' +
          'The line at the bottom of the page names the zone.' },
        { h: 'Earlier in the fortnight', p: 'The days just gone are folded away at the bottom.' }
      ],
      know: [
        'Viv does not tell the Hub whether a visit is confirmed, so the Hub does not claim it is. A visit is assigned, open, or cancelled.',
        'Your own next CSM visit is listed separately from the caregiver week, because that is your cadence rather than theirs.'
      ],
      related: ['care-team', 'priority', 'overview']
    },

    'care-team': {
      title: 'Care Team',
      lede: 'Who is actually involved with this client at the moment.',
      shot: { src: 'guide-shots/guide-care-team.png',
        alt: 'A care team list showing caregivers with their days, visit counts and next visit.',
        caption: 'Each caregiver with the days they come and when they are next in.' },
      body: [
        { h: 'Where it comes from', p: 'Viv does not keep a separate care-team list. The relationship between a caregiver ' +
          'and a client is the booking. So the Hub builds this from the client’s current fortnight of visits and says so ' +
          'on the page: each caregiver who is actually scheduled, the days they come, how many visits and how many hours, ' +
          'and when they are next in.' },
        { h: 'What that means in practice', ul: [
          'Somebody who stopped visiting a month ago is not here. That is deliberate.',
          'Somebody covering a single visit this week is here, because they are genuinely coming.',
          'Your own written note about the caregivers is kept beside it, not merged into it.'
        ] }
      ],
      know: ['If nobody is scheduled in the fortnight the page says so, rather than showing an empty list that looks like a loading failure.'],
      related: ['schedule', 'overview']
    },

    'client-information': {
      title: 'Client Information',
      lede: 'The administrative detail you need while you are actually working with the client.',
      shot: { src: 'guide-shots/guide-client-information.png',
        alt: 'The Client Information section showing contact details, primary contact and service information.',
        caption: 'Contact, primary contact, and the service facts.' },
      body: [
        { h: 'Contact', p: 'The full address, with Directions, and the client’s own phone and email where Viv has them. ' +
          'Phone numbers dial, email addresses open Mail.' },
        { h: 'Primary contact', p: 'The family member to call: their name, relationship, phone and email. ' +
          'Where Viv has several family contacts, the others are folded underneath.' },
        { h: 'Care and service', p: 'Start of care, market, service type, community, status, the CSM and the scheduling partner, ' +
          'client number, and whether the client is on Tribute Secure.' },
        { h: 'Hub details', p: 'Tier, visit cadence, weekly hours, birthday, communication preferences, rates and your notes — ' +
          'the things the Hub holds rather than Viv — folded away at the bottom.' }
      ],
      know: ['A field Viv does not hold for this client is left out rather than shown as an empty row.'],
      related: ['overview', 'communication']
    },

    activity: {
      title: 'Activity',
      lede: 'What has actually happened with this client, newest first.',
      body: [
        { p: 'Visits, touchpoints, care conversations, Success in 30 milestones, communications, Pulse reads and ' +
             'completed caregiver visits, grouped by month.' },
        { h: 'What it is for', p: 'Picking a client back up. Somebody asks what has been going on and you can answer ' +
          'without opening four pages.' },
        { h: 'What is not in it', p: 'Nothing technical. No sync records, no saves, no page loads — only things a person did.' }
      ],
      related: ['communication', 'overview']
    },

    communication: {
      title: 'Communication',
      lede: 'Recent touchpoints and how this family prefers to be contacted.',
      body: [
        { p: 'The last several touchpoints with dates and types, and the client’s stated communication preferences.' },
        { h: 'Logging one', p: 'Log contact in the client header, or Log activity at the bottom of the client, ' +
          'which also covers visits and care conversations.' }
      ],
      know: ['Touchpoint cadence follows tier: High every 14 days, Medium 30, Low 60. Overdue shows on Overview.'],
      related: ['activity', 'overview']
    },

    'pulse-care': {
      title: 'Pulse & Care',
      lede: 'The Pulse read for this client, and the care conversations behind it.',
      body: [
        { h: 'Pulse', p: 'A read on how the client is doing, drawn from caregiver visit notes, changes of condition, ' +
          'incidents and recent communication. Needs attention, Monitor, or Status quo.' },
        { h: 'Acknowledging', p: 'Three ways to say you have seen it: nothing needed, working on it, or raising it in your 1:1. ' +
          'Acknowledging clears it from Needs attention on Overview.' },
        { h: 'Care conversations', p: 'The longer structured conversation, with satisfaction scores and what is working.' }
      ],
      know: ['Pulse is a pointer, not a verdict. Open the evidence before acting on it.'],
      related: ['pulse', 'overview']
    },

    'ltc-other': {
      title: 'LTC & Other',
      lede: 'This client’s long-term care insurance, their community, and the odds and ends.',
      body: [
        { p: 'Any LTC insurance records attached to this client, the community they live in with its main contact, ' +
             'and a link into the Maryland compliance board where that applies.' },
        { h: 'How records are matched', p: 'By the client’s stable id, not their name. A record that only matches by name ' +
          'is labelled as such, and if two clients share a name the Hub refuses to guess and tells you to link it properly.' }
      ],
      related: ['ltc', 'client-information']
    },

    /* Key kept as record-visit so older deep links still land. */
    'record-visit': {
      title: 'Scribe',
      lede: 'Stay present. We\u2019ll help you remember the details.',
      body: [
        { p: 'Scribe turns what happened into draft documentation so you are not writing notes while someone ' +
             'is still talking to you. It drafts. You review. Nothing Scribe produces is saved anywhere ' +
             'until you say so, and nothing goes into Viv at all yet.' },
        { h: 'Three ways in', ul: [
          'Live Scribe \u2014 record the visit while it happens. Needs consent first.',
          'Quick Recap \u2014 say or type what happened afterwards, in your own words. Just as good a source.',
          'Call Scribe \u2014 the same thing for a phone call rather than a home visit.' ] },
        { p: 'All three make the same thing: an encounter. The way you captured it is recorded on it, ' +
             'because a recap you gave from memory and a recording of the room are not equally certain ' +
             'and the documentation should not pretend otherwise.' },
        { h: 'Consent comes first', p: 'Live Scribe will not start until you have asked and recorded the answer. ' +
          'There is a short script on screen to read out. If the answer is no, say so on the screen \u2014 ' +
          'that is a normal outcome, not a failure, and Quick Recap afterwards works perfectly well.' },
        { h: 'You can always see that it is recording', p: 'A bar stays on screen the whole time. ' +
          'Leaving the page while a recording is running will warn you. When you are done, the button says ' +
          'Finish & Create Documentation, because that is what it does.' },
        { h: 'What happens to the audio', p: 'It is transcribed and not kept.' },
        { h: 'Reviewing the draft', p: 'Three tabs. Summary is the orientation. Care Plan holds proposed changes ' +
          'to specific fields, each showing the current text beside the proposal. Visit Note holds the note itself. ' +
          'Every proposal cites the facts it rests on, and View source shows you the passage it came from. ' +
          'A proposal with nothing behind it does not get made.' },
        { h: 'Needs review', p: 'Two things land here, and they are not alarms. ' +
          '\u201cPossible inconsistency\u201d means Scribe noticed a disagreement but could only trace one side of it ' +
          'to the source \u2014 so it is telling you rather than quietly dropping it, and it will not let an ' +
          'unsubstantiated claim become standing instruction for caregivers on its own. ' +
          '\u201cWording removed\u201d means Scribe refused to write a clinical condition the source never stated.' },
        { h: 'Scribe does not diagnose', p: '\u201cA bit muddled about what day it is\u201d is what the daughter said. ' +
          'It is not cognitive impairment, and Scribe will not turn it into one. It keeps an observation an ' +
          'observation and a family report a family report. If a condition is genuinely established \u2014 the source ' +
          'says it, or the approved care plan already records it \u2014 the words are kept, with who said them. ' +
          'Where Scribe takes wording out it tells you, names it, and leaves the sentence to you.' },
        { h: 'What it will not do', ul: [
          'Write anything to Viv.',
          'Create tasks or change the schedule.',
          'Notify the care team or send anything to anybody.',
          'Approve its own work.' ] }
      ],
      related: ['overview', 'care-plan', 'client-workspace']
    },

    /* ─ Managing your work ─ */
    home: {
      title: 'Home',
      lede: 'What needs you, what is happening today, and what you owe somebody.',
      shot: { src: 'guide-shots/guide-home.png',
        alt: 'The Home page showing a greeting, a Needs attention row of counts, and the day ahead.',
        caption: 'Needs attention first, then today, then your work, then the numbers.' },
      body: [
        { h: 'Needs attention', p: 'Counts that are each a real thing to do — clients out of cadence, open visits, ' +
          'overdue tasks, changes of condition. A category with nothing in it produces no card at all.' },
        { h: 'Today', p: 'Your visits and the fortnight ahead.' },
        { h: 'Your work', p: 'To-dos and quick notes. Both save as you type.' },
        { h: 'Caseload health', p: 'The numbers, last — where they inform rather than greet you.' }
      ],
      related: ['find-client', 'coverage', 'priority']
    },

    coverage: {
      title: 'Coverage',
      lede: 'What a colleague needs to know about your clients while you are out.',
      shot: { src: 'guide-shots/guide-coverage.png',
        alt: 'The Coverage page showing coverage notes, team coverage, handoffs and communities.',
        caption: 'My clients, team coverage, handoffs and the community directory.' },
      body: [
        { h: 'My clients', p: 'What you write. One note per client, for whoever covers you.' },
        { h: 'Team coverage', p: 'What everyone else wrote.' },
        { h: 'Handoffs', p: 'Hand your caseload to a covering CSM for a period. They get your clients and a banner on their Home.' },
        { h: 'Communities', p: 'The shared directory: main contact and who to call, per community.' }
      ],
      know: ['Coverage notes are shared with the whole team by design. If two people edit the same note at the same moment, the Hub keeps the other person’s version, tells you which, and saves the rest of your work.'],
      related: ['ltc-other']
    },

    s30: {
      title: 'Success in 30',
      lede: 'The first thirty days of a new client, as a checklist that knows the dates.',
      body: [
        { p: 'Assessment, the caregiver prep call, the second in-person visit inside fourteen days, the week-one caregiver ' +
             'check-in, weekly family contact, and Viv updated. Anything overdue is surfaced first.' },
        { h: 'A milestone with no date', p: 'has not happened yet. It is not a gap in the data.' }
      ],
      related: ['home', 'communication']
    },

    priority: {
      title: 'Fill Priority',
      lede: 'Which open visit matters most.',
      shot: { src: 'guide-shots/guide-fill-priority.png',
        alt: 'The Fill Priority page showing ranked events and the open visits on the caseload.' },
      body: [
        { p: 'Open visits on your caseload, ranked, plus the events managers create and order by hand. ' +
             'The point is to solve the gap with the biggest consequence first, not the one you saw first.' }
      ],
      related: ['schedule', 'home']
    },

    pulse: {
      title: 'Client Pulse',
      lede: 'Your whole caseload, read for attention.',
      body: [
        { p: 'The same read as Pulse & Care inside a client, across everyone at once, ordered with Needs attention first.' },
        { h: 'Use it', ul: [
          'Start at the top.',
          'Open a row before acting — the summary is a pointer, the evidence is the substance.',
          'Acknowledge when you have seen it, so the next person knows.'
        ] }
      ],
      related: ['pulse-care']
    },

    /* ─ Operations ─ */
    md: {
      title: 'Maryland Compliance',
      lede: 'The seven Baltimore regulations, per client, with the clock showing.',
      shot: { src: 'guide-shots/guide-md-compliance.png',
        alt: 'The Maryland Compliance board showing clients against the regulatory requirements.' },
      body: [
        { p: 'Each Maryland client against each requirement, with what is done, what is due and what is late. ' +
             'The board is assembled on a schedule and tells you when it was last built.' }
      ],
      related: ['ltc-other']
    },

    ltc: {
      title: 'LTC',
      lede: 'Long-term care insurance submissions, and why one is not ready.',
      shot: { src: 'guide-shots/guide-ltc.png',
        alt: 'The LTC page showing submission records grouped by readiness.' },
      body: [
        { h: 'The states', ul: [
          'Blocked — something is missing. The row says what.',
          'Ready to send — everything a carrier needs is attached.',
          'Not sent yet — ready, but nobody has sent it.',
          'Sent — with the date.'
        ] },
        { h: 'Why a packet is blocked', ul: [
          'No QuickBooks invoice for that week. A packet with care notes and no invoice is care documentation with nothing to reimburse against, and carriers return those.',
          'Visit notes are incomplete or blank.',
          'The carrier requires proof of payment and none is attached.',
          'The insurer on the record is not a carrier the Hub recognises.'
        ] },
        { h: 'John Hancock', p: 'takes uploads through their portal only. The Hub prepares the documents; a person uploads them.' }
      ],
      know: ['A blocked packet looks blocked. The Hub will not send one by accident, and a repeated click cannot send the same packet twice.'],
      related: ['ltc-other']
    },

    emailcomm: {
      title: 'Community Email',
      lede: 'The weekly schedule a senior living community gets from us.',
      shot: { src: 'guide-shots/guide-email-community.png',
        alt: 'The Email Community page showing the drafted weekly schedule for a community.' },
      body: [
        { p: 'A week of visits for the clients in one community, drafted for their team. ' +
             'Review it before sending — you are the last person who sees it.' },
        { h: 'Times', p: 'Every time in the email is the community’s own local time, not yours.' }
      ],
      know: ['Nothing client-identifying beyond what the community already holds goes into these emails, and no internal status, Pulse or staffing information appears in one.'],
      related: ['coverage']
    },

    team: {
      title: 'Team',
      lede: 'Everyone’s caseload at once. Managers and directors only.',
      shot: { src: 'guide-shots/guide-team.png',
        alt: 'The Team overview showing each CSM with their caseload summary.' },
      body: [{ p: 'Per-CSM caseload, cadence and visit summary across the market, for 1:1s and for spotting a caseload under strain.' }],
      related: ['kpi']
    },

    /* ─ Tools ─ */
    assistant: {
      title: 'Assistant',
      lede: 'Ask a question and get an answer from Tribute’s own material.',
      body: [
        { p: 'The knowledge base, email templates, scenario guides and the decision framework, plus a question box. ' +
             'It answers from Tribute content only — it does not invent policy.' },
        { h: 'Draft update', p: 'Inside a client, Draft update writes a family update from that client’s recent record. ' +
          'Read it before you send it.' }
      ],
      related: ['getting-help']
    },

    kpi: { title: 'KPI Tracker', lede: 'Your quarterly numbers.',
      body: [{ p: 'Quarterly KPI entry and history, against the targets in Role Expectations.' }],
      related: ['expectations', 'team'] },

    expectations: { title: 'Role Expectations', lede: 'What the CSM role is measured on.',
      body: [{ p: 'The expectations for the role, including the KPI targets: dissatisfaction terminations under 1%, NPS 70 or better, lead closure 55% or better, and documentation and visit compliance.' }],
      related: ['kpi'] },

    feedback: {
      title: 'Feedback',
      lede: 'Tell us what the Hub did. It goes straight to the people building it.',
      shot: { src: 'guide-shots/guide-feedback.png',
        alt: 'The feedback panel open over the Hub, with type, description and impact fields.' },
      body: [
        { p: 'Feedback is in the rail under Tools, and as a small control at the bottom of every page.' },
        { h: 'Worth saying', ul: [
          'What you were doing.',
          'What you expected.',
          'What the screen actually did.'
        ] },
        { h: 'What it sends', p: 'Which page you were on, your role and market, and technical detail about the screen. ' +
          'No client, caregiver or family information, no notes, no email contents, and never a screenshot.' },
        { h: 'If it fails to send', p: 'Your text stays on screen and the Hub says plainly that it was not submitted, with a Retry. ' +
          'It is never quietly dropped.' }
      ],
      related: ['getting-help']
    },

    /* ─ Mobile ─ */
    install: {
      title: 'Install CSM Hub on your iPhone',
      lede: 'Six taps. It then opens like an app.',
      body: [
        { steps: [
          { t: 'Open the Hub in Safari', b: 'It has to be Safari for this. Chrome on iPhone cannot add to the Home Screen.' },
          { t: 'Tap Share', b: 'The square with the arrow, at the bottom of the screen.' },
          { t: 'Tap Add to Home Screen', b: 'Scroll down the share sheet if you do not see it.' },
          { t: 'Confirm the name', b: 'It should read CSM Hub. Tap Add.' },
          { t: 'Launch it from the Home Screen', b: 'No address bar, no Safari tabs — it fills the screen.' },
          { t: 'Sign in as normal', b: 'Your Tribute Microsoft account, the same as on a desk.' }
        ] },
        { h: 'What installing changes', ul: [
          'It runs full screen, in its own window.',
          'It is the same Hub, with the same sign-in and the same data.',
          'Nothing about a client is stored on the phone. Close it and there is nothing left behind.'
        ] }
      ],
      related: ['mobile-nav', 'mobile-login']
    },

    'mobile-nav': {
      title: 'Getting around on a phone',
      lede: 'Four along the bottom, everything else behind More.',
      shot: { src: 'guide-shots/guide-more.png',
        alt: 'The More drawer on a phone showing the Work, Operations and Tools groups.',
        caption: 'More opens the same rail as the desk, scrolling down.' },
      body: [
        { h: 'The bottom bar', p: 'Home, Clients, Coverage and More. These are the three places a CSM lives in, plus everything else.' },
        { h: 'More', p: 'Opens the same navigation as the desk, in the same three groups, scrolling vertically. ' +
          'Nothing is reachable on a desk but not here, and nothing requires swiping a menu sideways.' },
        { h: 'The top bar', p: 'The page name, search, and your profile. Open a client and the bar becomes theirs: ' +
          'their name, with a back arrow where the menu button was.' }
      ],
      related: ['install', 'mobile-field']
    },

    'mobile-field': {
      title: 'Working with a client from the field',
      lede: 'What the phone is actually for.',
      shot: { src: 'guide-shots/guide-mobile-client.png',
        alt: 'A client profile on a phone showing the name, address, four actions and the Overview.',
        caption: 'Standing outside the door: who, where, and what is happening today.' },
      body: [
        { p: 'Open the client before you go in. The top of the screen gives you the name, the address and the four things ' +
             'you do there: Call, Directions, Log contact, and Scribe.' },
        { h: 'While you are there', ul: [
          'Today tells you who else is coming and when.',
          'Care Plan is readable standing up, with the important sections first.',
          'Care Team tells you who has actually been in this fortnight.',
          'Log contact before you leave the drive. It takes a few seconds and it is the thing everyone forgets.'
        ] }
      ],
      related: ['overview', 'mobile-forms']
    },

    'mobile-forms': {
      title: 'Forms and actions on a phone',
      lede: 'Built for thumbs.',
      body: [
        { ul: [
          'Every field is large enough that iOS does not zoom when you tap it.',
          'Every control is a thumb’s width, on a phone and on a tablet.',
          'Panels slide up from the bottom and scroll; Save and Cancel stay reachable with the keyboard up.',
          'Nothing saves halfway. If something does not save, the Hub says so and keeps your text.'
        ] }
      ],
      related: ['mobile-field']
    },

    'mobile-login': {
      title: 'Signing in on a phone',
      lede: 'And what to do if it behaves oddly.',
      body: [
        { ul: [
          'Launching from the Home Screen sends you to Microsoft and brings you back into the app.',
          'Force-quitting and reopening should keep you signed in.',
          'If a session expires, the Hub asks you to sign in again rather than showing an empty page.',
          'If sign-in drops you into Safari instead of the app, close both, reopen from the Home Screen, and report it through Feedback.'
        ] }
      ],
      related: ['install', 'trouble']
    }
  };

  /* ── Troubleshooting ───────────────────────────────────────────────── */
  const trouble = [
    { id: 'looks-wrong', q: 'Something looks wrong', a: [
      'Refresh the page once.',
      'Check which market you are in — it is shown in the Hub chrome.',
      'Check you are on the client you think you are on.',
      'Look for a line saying the page is still loading or that a source could not be reached. The Hub says so rather than guessing.',
      'If it still looks wrong, use Feedback. Say what you were doing and what the screen showed.'
    ] },
    { id: 'cant-save', q: 'I cannot save something', a: [
      'If the status says Save failed, your text is still on screen. Try again in a moment.',
      'If it says Saved with a time, it saved.',
      'If the Hub says an action is not available, nothing was written — the message names where to do it instead.'
    ] },
    { id: 'cant-find-client', q: 'I cannot find a client', a: [
      'Check the market first. This is the usual reason.',
      'Search on any part of the name, the community or the street rather than scrolling.',
      'If you are a manager, check whether you are looking at Mine rather than Team or All.',
      'Discharged clients drop off the Hub by design. Look them up in Viv.'
    ] },
    { id: 'no-client-data', q: 'A client shows no schedule, contact or care team', a: [
      'Those come from Viv when you open the client. If Viv did not answer, the Hub says so and offers Try again.',
      'Try again once. The read is quick.',
      'If it says this part of the Hub is not available on the server yet, that is us, not you — report it through Feedback.',
      'An empty Today with no message genuinely means nothing is scheduled today.'
    ] },
    { id: 'wrong-time', q: 'A visit time looks an hour out', a: [
      'Check the market. Chicago runs on Central time.',
      'Client schedule times are always shown in the client’s own market time, not your laptop’s. A Chicago visit reads the same from Boston as it does from Chicago.',
      'The zone is named at the bottom of the Schedule page.'
    ] },
    { id: 'old-care-plan', q: 'The care plan looks out of date', a: [
      'The Hub shows the latest APPROVED care plan from Viv — not the most recently edited draft.',
      'The date and approver are at the top of the page, and a plan over six months old is flagged.',
      'If a newer plan has been written but not approved in Viv, approving it there is what brings it through.',
      'An archived or test plan is never shown as current, however recent it is.',
      'If no newer plan exists at all, the plan really is the latest one anybody has written.'
    ] },
    { id: 'stale-data', q: 'The data looks old', a: [
      'Some pages are assembled on a schedule rather than the instant you open them. Those pages tell you when they were last built.',
      'If a page is mid-build it says so. A page that is loading is not a page telling you everything is fine.',
      'Refresh once. If the time shown does not move and the number still looks wrong, use Feedback.'
    ] },
    { id: 'lost-work', q: 'I think I have lost something I typed', a: [
      'Do not retype it yet. Check the sync indicator and refresh once.',
      'If two people edited the same item at the same moment, the Hub keeps the other person’s version and tells you which item, so you can redo yours deliberately.',
      'Report it through Feedback either way. We would rather know.'
    ] },
    { id: 'which-hub', q: 'Should I use this Hub or the previous one?', a: [
      'Use this one. Both read and write the same records.',
      'Avoid having the same thing open and being edited in both at once — the second save wins.'
    ] }
  ];

  const ALIASES = {
    'cant-save': "why can't i save why cant i save cannot save not saving save failed greyed out disabled blocked read only",
    'cant-find-client': "can't find missing client where is lost client search not working no results",
    'no-client-data': 'blank empty no schedule no address no contact not loading viv did not answer try again',
    'wrong-time': 'timezone time zone an hour out central eastern chicago wrong time',
    'old-care-plan': 'care plan old stale not updating newest latest approved draft',
    'stale-data': 'old data out of date not updating refresh stale last built numbers wrong',
    'lost-work': 'lost work disappeared overwritten gone my changes vanished conflict',
    'looks-wrong': 'broken wrong looks wrong error something is wrong incorrect'
  };
  const PAGE_ALIASES = {
    home: 'dashboard landing first screen start morning',
    'find-client': 'client list caseload my clients find a client search tracker',
    overview: 'client detail client record open a client profile workspace',
    'care-plan': 'careplan plan of care adls care needs',
    schedule: 'visits shifts who is coming rota calendar',
    'care-team': 'caregivers who is caring aides',
    'client-information': 'address phone contact details demographics',
    activity: 'history timeline what happened recent',
    'record-visit': 'scribe recording record visit dictate transcribe microphone consent recap call scribe documentation visit note draft encounter',
    pulse: 'red amber green attention level needs attention monitor status quo',
    s30: 'onboarding new client first 30 days milestones success in 30',
    coverage: 'time off vacation out of office handoff cover covering communities',
    md: 'compliance regulation baltimore assessment overdue reassessment maryland',
    priority: 'open shifts unfilled visits gaps staffing fill',
    emailcomm: 'community email weekly update senior living building',
    ltc: 'long term care insurance submission carrier invoice blocked',
    assistant: 'ai ask a question chatbot knowledge base templates',
    kpi: 'quarterly numbers metrics targets',
    team: 'manager director team overview everyone mine team all',
    install: 'iphone home screen pwa install app add to home screen safari standalone',
    'mobile-nav': 'phone mobile bottom bar more drawer menu',
    feedback: 'report a problem bug suggestion tell someone'
  };

  /* ── Glossary ──────────────────────────────────────────────────────── */
  const glossary = [
    ['CSM', 'Client Solutions Manager. Owns a caseload of clients and the relationship with each family.'],
    ['CSC', 'Client Solutions Coordinator. Works across a market rather than a single caseload.'],
    ['Pulse', 'A read on how a client is doing, drawn from caregiver notes, changes of condition, incidents and recent communication. Three levels: Needs attention, Monitor, Status quo.'],
    ['Needs attention', 'The most pressing Pulse level. Something in the recent record suggests looking now.'],
    ['Touchpoint', 'A recorded contact with a client or family. Cadence follows tier: High every 14 days, Medium 30, Low 60.'],
    ['Care Conversation', 'The longer structured conversation — satisfaction, caregiver fit, unmet needs, care plan accuracy. High every 90 days, Medium and Low every 180.'],
    ['Care Plan', 'The client’s plan of care. The signed document lives in Viv; the Hub shows the most recent approved one.'],
    ['Care Team', 'The caregivers currently scheduled with a client. Built from the schedule, because Viv keeps no separate list.'],
    ['Open visit', 'A booked visit with no caregiver assigned yet.'],
    ['Success in 30', 'The first thirty days of a new client, tracked as a set of known milestones.'],
    ['Coverage note', 'What a covering colleague needs to know about a client while you are out.'],
    ['Handoff', 'Assigning your caseload to a covering CSM for a period.'],
    ['Fill Priority', 'The ranking of open visits, so the most consequential gap gets solved first.'],
    ['Community', 'A senior living building where Tribute has clients.'],
    ['Market', 'Massachusetts, Chicago or Maryland. Sets the scope of everything you see, including times.'],
    ['Mine / Team / All', 'Three scopes. Your own caseload; the caseloads of people who report to you; everyone in the current market.'],
    ['Tier', 'How closely a client is watched — High, Medium or Low. Drives touchpoint and care conversation cadence.'],
    ['LTC', 'Long-term care insurance. A packet of visit documentation and an invoice, sent to a carrier for reimbursement.'],
    ['Stale', 'A page built on a schedule that has not rebuilt recently. The page says when it was last built rather than hiding it.'],
    ['Standalone', 'The Hub launched from the iPhone Home Screen, running full screen in its own window.']
  ];

  /* ── FAQ ───────────────────────────────────────────────────────────── */
  const faq = [
    ['Is my work saved automatically?', 'Yes. There is no save button. The sync indicator says Saving, then Saved with a time.'],
    ['Where does the client address and schedule come from?', 'Viv, read when you open the client. Nothing is copied or kept — close the tab and it is gone.'],
    ['Which care plan does the Hub show?', 'The latest approved Tribute Care Plan from the client’s documents in Viv. Archived, abandoned and test plans are never treated as current. The date and approver are shown at the top.'],
    ['Why does a visit not say Confirmed?', 'Because Viv does not tell us whether a visit is confirmed. A visit is assigned to a caregiver, open, or cancelled, and the Hub says only what it knows.'],
    ['Is the Care Team a list somebody maintains?', 'No. Viv has no care-team list — the relationship is the booking. The Hub builds it from the client’s current fortnight of visits and says so on the page.'],
    ['Does Feedback send anything about my clients?', 'No. It attaches which page you were on, your role and market, and technical detail about the screen. No client, caregiver or family information, and never a screenshot.'],
    ['Does the iPhone version store client information on my phone?', 'No. There is no offline copy of anything.'],
    ['Why can I see more clients than my own?', 'You are in a scope wider than Mine — Team or All — or your role covers the whole market.'],
    ['A time looks an hour out.', 'Client schedule times are shown in the client’s own market time. Chicago runs on Central.'],
    ['What is Scribe?', 'Documentation help. Record the visit, or give a recap afterwards, and Scribe drafts the visit note and any care plan changes for you to review. It drafts, you decide.'],
    ['Does Scribe record without asking?', 'No. Live recording will not start until you have asked for consent and recorded the answer, and a bar stays on screen the whole time it is running.'],
    ['Is the audio kept?', 'No. It is transcribed and then not retained.'],
    ['Does Scribe write to Viv?', 'No. Nothing Scribe produces reaches Viv, and it creates no tasks, sends no messages and changes no schedules.'],
    ['Scribe said it removed some wording. Why?', 'It was about to state a medical condition that neither the source nor the approved care plan actually establishes. It will not do that. The terms are named in Needs review so you can write it yourself if it belongs.']
  ];

  /* Flat index for search. Built from the content above, so it can never
     drift out of step with what is actually in the guide. */
  const index = (function () {
    const rows = [];
    const push = (kind, id, title, text) =>
      rows.push({ kind: kind, id: id, title: title, text: (title + ' ' + text).toLowerCase() });
    const flat = b => (b || []).map(x =>
      [x.h || '', x.p || '', (x.ul || []).join(' '),
       (x.steps || []).map(s => s.t + ' ' + s.b).join(' ')].join(' ')).join(' ');
    Object.keys(A).forEach(k => {
      const a = A[k];
      push('article', k, a.title,
        [a.lede, flat(a.body), (a.know || []).join(' '), PAGE_ALIASES[k] || ''].join(' '));
    });
    TOPICS.forEach(t => push('topic', t.id, t.title, t.lede));
    trouble.forEach(t => push('trouble', t.id, t.q, t.a.join(' ') + ' ' + (ALIASES[t.id] || '')));
    glossary.forEach(g => push('term', 'words', g[0], g[1]));
    faq.forEach(f => push('faq', 'faq', f[0], f[1]));
    return rows;
  })();

  return { updated: UPDATED, buildNote: BUILD_NOTE,
           topics: TOPICS, articles: A, trouble: trouble,
           glossary: glossary, faq: faq, index: index };
})();
