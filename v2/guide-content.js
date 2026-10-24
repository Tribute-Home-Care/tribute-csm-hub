/* ═══════════════════════════════════════════════════════════════════════════
   TRIBUTE CSM HUB — GUIDE CONTENT
   ═══════════════════════════════════════════════════════════════════════════
   All guide copy lives here, in one place, so wording can be changed without
   touching the renderer and a screenshot can be swapped by editing one line.

   Shape of a guide page:
     { id, title, lede, shot?, shots?, what, first, can, saves?, v1?,
       know?, steps?, related? }

   `shot`  : { src, alt, caption?, callouts?: [{n, x, y, title, body}] }
             x/y are PERCENTAGES of the image box, so annotations survive
             responsive scaling instead of drifting off the element.
   ═══════════════════════════════════════════════════════════════════════════ */
window.GUIDE = (function () {
  'use strict';

  const UPDATED = 'October 2026';
  const BUILD_NOTE = 'Screenshots taken from the V2 Hub, October 2026.';

  /* ── Pages ─────────────────────────────────────────────────────────── */
  const pages = {

    home: {
      title: 'Home',
      lede: 'The first thing you see, and the shortest route to what needs you today.',
      shot: {
        src: 'guide-shots/guide-home-overview.png',
        alt: 'The Hub Home screen, showing the attention panel, counts for the caseload, and upcoming visits.',
        callouts: [
          { n: 1, x: 19, y: 22, title: 'Needs attention', body: 'Everything the Hub thinks you should look at today, most pressing first.' },
          { n: 2, x: 17, y: 55, title: 'Caseload health', body: 'Where your caseload stands: how many clients, how many high need, visits done against visits due.' },
          { n: 3, x: 26, y: 81, title: 'Working notes', body: 'Your to-dos and 1:1 notes. Saved for real, and the same list appears in either version of the Hub.' }
        ]
      },
      what: 'Home answers one question: what needs me right now? It gathers overdue visits, clients whose Pulse has moved, open visits in the next few days, and anything you flagged yourself.',
      first: [
        'Read the attention panel top to bottom. It is ordered, not alphabetical.',
        'If a source could not be loaded, Home says so. It will not tell you everything is fine when it does not know.',
        'Your to-dos sit underneath. Add one from here if something comes up mid-review.'
      ],
      can: ['Add, complete and remove to-dos', 'Write in Quick Notes', 'Jump to any client from the attention list'],
      saves: 'To-dos and Quick Notes save to the same shared record the current Hub uses. Anyone who looks at your profile in either version sees the same thing.',
      know: [
        'An empty attention panel is good news, but check for the line about sources that could not be loaded. "Nothing to show" and "we could not look" are different, and the Hub distinguishes them.'
      ],
      related: ['find-client', 'add-todo', 'review-attention']
    },

    tracker: {
      title: 'Client Tracker',
      lede: 'Every client you own, in one list, with a workspace behind each one.',
      shot: {
        src: 'guide-shots/guide-client-tracker.png',
        alt: 'The Client Tracker, showing a searchable list of clients on the left and a selected client workspace on the right.',
        callouts: [
          { n: 1, x: 27, y: 15, title: 'Search', body: 'Type any part of a name. Fastest way to anyone in your caseload.' },
          { n: 2, x: 21, y: 34, title: 'The list, already triaged', body: 'Needs attention, Due soon, All clients, Onboarding, Coverage. It opens on the ones that need you.' },
          { n: 3, x: 50, y: 27, title: 'The workspace', body: 'The client opens beside the list, so you keep your place while working through several.' }
        ]
      },
      what: 'The Tracker is the list; the workspace is where the work happens. They sit side by side so you can move through several clients without losing your position.',
      first: ['Search if you know who you want. Scan the list if you do not.', 'Tier and status badges tell you how closely a client is being watched.'],
      can: ['Open any client in your caseload', 'Search and filter', 'Edit client details, log touchpoints, record care conversations'],
      saves: 'Client details, touchpoints and care conversations save to the shared record immediately. There is no separate publish step.',
      related: ['find-client', 'log-touchpoint', 'workspace']
    },

    workspace: {
      title: 'Client workspace',
      lede: 'One client, five areas, in the order you usually need them.',
      shot: {
        src: 'guide-shots/guide-client-workspace.png',
        alt: 'A client workspace with Overview, Care, Schedule, Communication and More tabs.',
        callouts: [
          { n: 1, x: 27, y: 21, title: 'The five areas', body: 'Overview, Care, Schedule, Communication, More. Overview summarises; the others go deep.' },
          { n: 2, x: 12, y: 37, title: 'What needs attention', body: 'The one thing about this client that is outstanding, stated plainly.' },
          { n: 3, x: 11, y: 90, title: 'One primary action', body: 'Log activity is the thing you do most. Everything rarer sits under the … beside it.' }
        ]
      },
      what: 'Overview is a summary, not a dumping ground: it tells you the state of the client and points at the area that needs you. Care, Schedule, Communication and More hold the detail.',
      first: ['Overview first. It is built to be read in a few seconds.', 'Then the area Overview points you at.'],
      can: ['Update client details', 'Log a touchpoint or care conversation', 'Review the visit log and schedule', 'Acknowledge a Pulse read'],
      saves: 'Everything in the workspace saves to the shared record as you go.',
      saves: 'Logging a visit writes it to Viv and, if you tick the box, to your own Outlook calendar. Both are the same records the current Hub uses.',
      know: ['A visit is recorded in the client\u2019s own market time, not the time zone your laptop happens to be in. A Chicago visit is stored as Chicago time even if you book it from Boston.'],
      related: ['log-touchpoint', 'pulse-status', 'blocked-action']
    },

    pulse: {
      title: 'Client Pulse',
      lede: 'A read on how each client is actually doing, drawn from what caregivers wrote.',
      what: 'Pulse reads caregiver visit notes, changes of condition, incidents and recent communication, and summarises where each client stands. It is a prompt to look, not a verdict.',
      first: ['Start at the top. Needs attention is ordered first.', 'Open a row before acting. The summary is a pointer; the evidence is the substance.'],
      can: ['Review your caseload', 'Open the evidence behind a read', 'Acknowledge that you have seen it'],
      saves: 'Acknowledging a Pulse read saves to the shared record.',
      know: [
        'Pulse is rebuilt on a schedule, not the instant a note is written. If a row looks out of date, the page tells you when it was built.',
        'Managers and CSCs see their market; a CSM sees their own caseload.'
      ],
      related: ['pulse-status', 'review-attention']
    },

    s30: {
      title: 'Success in 30',
      lede: 'The first thirty days of a new client, as a checklist you can see at a glance.',
      shot: { src: 'guide-shots/guide-success-in-30.png', alt: 'The Success in 30 page showing onboarding milestones for recently started clients.' },
      what: 'A new client has a known set of early milestones: the assessment, the caregiver prep call, a second in-person visit inside fourteen days, the week-one caregiver check-in, weekly family contact. This page tracks them.',
      first: ['Anything overdue is surfaced first.', 'A milestone with no date has not happened yet — it is not a data gap.'],
      can: ['Mark milestones complete', 'Log the touchpoints that go with them'],
      saves: 'Milestones and touchpoints save to the shared record.',
      related: ['log-touchpoint']
    },

    coverage: {
      title: 'Coverage Notes',
      lede: 'What a covering colleague needs to know, plus handoffs and the community directory.',
      shot: { src: 'guide-shots/guide-coverage.png',
        alt: 'The Coverage Notes page with tabs for My Clients, Team Coverage, Handoffs and Communities, and a readiness list.',
        caption: 'The link under the heading goes straight to this guide \u2014 every page has one.' },
      what: 'Coverage notes are written for somebody else: the person picking up your caseload while you are out. Handoffs assign that cover. Communities is the shared directory of who to call at each building.',
      first: ['My Clients is what you write. Team Coverage is what everyone else wrote.'],
      can: ['Write and update coverage notes', 'Read team coverage and handoffs', 'Edit the community directory'],
      saves: 'Coverage notes save to the same shared record the current Hub reads. Everyone covering sees the same note, in either version.',
      know: ['Coverage notes are shared across the whole team by design. If two people edit the same note at the same moment, the Hub keeps the other person\u2019s version, tells you which one, and saves the rest of your work so you can redo just that bit.'],
      related: ['blocked-action']
    },

    md: {
      title: 'Maryland Compliance',
      lede: 'The seven Baltimore regulations, per client, with what is outstanding.',
      shot: {
        src: 'guide-shots/guide-md-compliance.png',
        alt: 'The Maryland Compliance board listing clients against regulatory requirements.',
        callouts: [
          { n: 1, x: 23, y: 26, title: 'How current this is', body: 'The board is assembled on a schedule, and says so rather than letting you assume it is live.' },
          { n: 2, x: 16, y: 40, title: 'The four counts', body: 'Assessments overdue, reassessments owed, documentation gaps, and initial 48-hour visits missed.' },
          { n: 3, x: 10, y: 63, title: 'What is outstanding', body: 'Overdue first, with how many days, and the CSM who owns it.' }
        ]
      },
      what: 'A per-client view of Maryland regulatory requirements — assessments, care plans, supervisory visits and the rest — showing what is complete, what is due and what has passed its date.',
      first: ['Overdue first, then due soon.', 'Check the freshness line at the top. The board is built on a schedule and says when it last ran.'],
      can: ['Review compliance by client', 'Open the client to act on what you find'],

      know: [
        'If the board is still assembling you will see that plainly. A board that is loading is not a board that says you are compliant.'
      ],
      related: ['md-issue', 'stale-data']
    },

    priority: {
      title: 'Fill Priority',
      lede: 'Which open visits matter most, and where your caseload is exposed.',
      shot: { src: 'guide-shots/guide-fill-priority.png',
        alt: 'The Fill Priority page showing ranked clients with scores during a coverage event.' },
      what: 'Open visits on your caseload, ranked, alongside any coverage events a manager has created. It answers "if I can only solve one gap today, which one?"',
      first: ['High-rank items first.', 'An open visit in the next 48 hours is called out separately.'],
      can: ['Review open visits and their ranking', 'Change the ranking', 'Record a fill status', 'Create a coverage event if you are a manager'],
      saves: 'Rankings, fill statuses and coverage events save to the shared record and appear in the current Hub immediately.',
      related: ['blocked-action']
    },

    emailcomm: {
      title: 'Email Community',
      lede: 'The weekly update that goes to a senior living community.',
      shot: { src: 'guide-shots/guide-email-community.png',
        alt: 'The Email Community page listing communities with client counts and the CSMs who own them.',
        caption: 'The list view. Opening a community loads that week\u2019s draft.' },
      what: 'For communities where Tribute has clients, the Hub assembles a weekly update and holds it as a draft. You can read it, edit it, save it, and send a test copy to yourself.',
      first: ['Pick a community on the left; its current draft loads on the right.',
              'Read it before you do anything else. It is assembled from the week\u2019s schedule and recent notes.'],
      can: ['Read and edit the generated draft', 'Save the draft the Friday run will use',
            'Edit a community\u2019s recipients and settings', 'Send a test copy to yourself'],
      saves: 'Draft edits and community settings save to the same records the Friday run and the current Hub read.',
      v1: 'Sending the real email to a community is still done in the current Hub.',
      know: ['A test send goes only to you, never to the community. It is the safe way to see exactly what would arrive.'],
      related: ['blocked-action', 'coverage']
    },
    ltc: {
      title: 'LTC Submissions',
      lede: 'Long-term care insurance submissions, per client.',
      what: 'Tracks long-term care insurance submissions and the notes behind them. You can review a submission and move it through its states here.',
      first: ['Open a client record to see what has been recorded, and what state it is in.'],
      can: ['Review what is recorded', 'Approve, unapprove, mark sent, confirm, skip and add a note'],
      saves: 'Status changes save to the same LTC records the current Hub reads.',
      v1: 'Sending a packet to a carrier, and texting a caregiver about missing notes, are still done in the current Hub. Both leave Tribute, and neither has been exercised against a real submission yet.',
      know: [
        'Being straight with you: this area has had very little operational use, so there is not much history to look at and none of it has been exercised against a live carrier submission. The status actions save properly; it is the real-world workflow around them that is untested. If something looks wrong, say so through Feedback rather than working around it.'
      ]
    },

    assistant: {
      title: 'Tribute Assistant',
      lede: 'Ask a question and get an answer from Tribute\'s own material.',
      what: 'The Assistant answers from the Hub\'s knowledge base, scenario guides and email templates — Tribute\'s own documented practice, not the open internet. It will tell you when it does not have an answer.',
      first: ['Ask in your own words. You do not need to phrase it as a search.'],
      can: ['Ask questions', 'Use the knowledge base, templates and scenario guides directly', 'Draft a client update from the workspace'],
      know: ['A drafted update is a starting point. Read it before you send it anywhere.']
    },

    kpi: {
      title: 'KPI Tracker',
      lede: 'Your quarterly numbers, entered and kept.',
      what: 'Where you record quarterly KPI entries and read back what you recorded before.',
      first: ['The current quarter is first; history is behind the second tab.'],
      can: ['Add a KPI entry', 'Review previous quarters'],
      saves: 'KPI entries save to the shared record.'
    },

    team: {
      title: 'Team Overview',
      lede: 'For managers: the whole team in one view, with a route down to the client.',
      shot: { src: 'guide-shots/guide-team.png',
        alt: 'The Manager Hub showing cross-market totals and one summary card per CSM.',
        callouts: [
          { n: 1, x: 24, y: 37, title: 'The market totals', body: 'Clients, touchpoints, high need and overdue visits across every market, or one at a time.' },
          { n: 2, x: 24, y: 85, title: 'One card per CSM', body: 'Caseload, touches, overdue and onboarding. You are looking for the card that does not match the others.' }
        ] },
      what: 'A cross-CSM summary so a manager can see where attention is needed without opening each caseload in turn.',
      first: ['Scan for the outliers, not the averages.'],
      can: ['Review the team', 'Open an individual CSM, then an individual client'],
      know: [
        'Mine, Team and All are scopes, not filters on the same data. Mine is your own caseload. Team is the people who report to you. All is everyone in the market you are currently in.'
      ],
      related: ['manager-views', 'mine-team-all']
    },

    markets: {
      title: 'Choosing a market',
      lede: 'Massachusetts, Chicago or Maryland — and how to tell which one you are in.',
      shot: {
        src: 'guide-shots/guide-market-select.png',
        alt: 'The market selection screen showing Massachusetts, Chicago and Maryland cards.',
        callouts: [
          { n: 1, x: 17, y: 67, title: 'Pick a market', body: 'Everything after this is scoped to it — clients, search, attention, compliance.' }
        ]
      },
      what: 'The Hub is organised by market. Choosing one sets the context for everything that follows. If you work in a single market you will usually go straight in without seeing this screen.',
      first: ['If you work in more than one market, this screen comes first.', 'The market you are in is always shown in the Hub chrome. If you are unsure, look there before you act.'],
      can: ['Choose a market', 'Switch markets at any time'],
      know: [
        'Chicago runs on Central time. Times shown for a Chicago client are Chicago\'s local times, not Eastern.',
        'Switching markets changes which clients you see. It does not change who you are or what you are allowed to do.'
      ],
      related: ['switch-market']
    },

    feedback: {
      title: 'Feedback',
      lede: 'Tell us the moment something is wrong. It takes about fifteen seconds.',
      shots: [
        { src: 'guide-shots/guide-feedback-button.png', alt: 'The Feedback button fixed in the lower-right corner of the Hub.', caption: 'Always there, lower right, on every page.' },
        { src: 'guide-shots/guide-feedback-panel.png', alt: 'The feedback panel asking for type, what happened, what you expected and impact.', caption: 'Four short questions. You stay on the page you were on.' }
      ],
      what: 'A way to report something without leaving what you were doing and without writing an email.',
      first: ['Use it when something is broken, confusing, missing, looks wrong, or sparks an idea.', 'Send it in the moment. A report written three days later loses the detail that makes it fixable.'],
      can: ['Pick a type, say what happened and what you expected, and set how much it slowed you down'],
      saves: 'Your note is sent straight away and you get a confirmation. If it cannot be sent, the panel keeps every word you typed and offers to try again — it will never tell you it sent when it did not.',
      know: [
        'The Hub attaches which page you were on, your role and market, and some technical detail about the state of the screen. It does not attach any client, caregiver or family information, and it never takes a screenshot.',
        'You do not need to describe the client. Say what the screen did.'
      ],
      related: ['leave-feedback']
    }
  };

  /* ── Tasks ─────────────────────────────────────────────────────────── */
  const tasks = {
    'find-client': {
      title: 'Find a client',
      lede: 'Two ways, depending on whether you know who you are looking for.',
      steps: [
        { t: 'Open Client Tracker', b: 'From the sidebar. Your caseload loads as a list.' },
        { t: 'Type any part of the name', b: 'The search box is at the top of the list. Partial names work.' },
        { t: 'Select the client', b: 'The workspace opens beside the list, so you keep your place if you are working through several.' }
      ],
      know: ['If someone is missing, check the market you are in first. The Tracker only shows the market you are currently working in.'],
      related: ['tracker', 'cant-find-client']
    },
    'review-attention': {
      title: 'Review what needs attention',
      lede: 'The morning pass, in about two minutes.',
      steps: [
        { t: 'Start on Home', b: 'The attention panel is ordered by how pressing something is, not alphabetically.' },
        { t: 'Read the whole panel before acting', b: 'The order is the recommendation. Acting on the first item you recognise is how the fourth one gets missed.' },
        { t: 'Check for a loading note', b: 'If a source could not be loaded, Home says so rather than implying all is well.' },
        { t: 'Open what needs you', b: 'Each row takes you to the client or the page that can resolve it.' }
      ],
      related: ['home', 'pulse']
    },
    'add-todo': {
      title: 'Add and complete a to-do',
      lede: 'Your own list, saved for real.',
      steps: [
        { t: 'Open Home', b: 'Your to-dos sit below the attention panel.' },
        { t: 'Type the task and add it', b: 'Keep it short enough to recognise tomorrow.' },
        { t: 'Tick it off when done', b: 'Completed items move out of the way.' }
      ],
      know: ['To-dos save to the same record the current Hub reads, so you will see the same list in either version.'],
      related: ['home']
    },
    'quick-notes': {
      title: 'Use Quick Notes',
      lede: 'A scratchpad that is actually saved.',
      steps: [
        { t: 'Open Home', b: 'Quick Notes sits alongside your to-dos.' },
        { t: 'Type', b: 'It saves on its own a moment after you stop. There is no save button.' },
        { t: 'Watch the status', b: 'The sync indicator says Saved with a time once it has gone through.' }
      ],
      know: ['Because it saves automatically, avoid having the same notes open in both versions of the Hub at once — the second one to save wins.'],
      related: ['home', 'did-it-save']
    },
    'log-touchpoint': {
      title: 'Log a touchpoint or care conversation',
      lede: 'The record of contact that everything else is measured against.',
      steps: [
        { t: 'Open the client', b: 'Client Tracker, then the client.' },
        { t: 'Go to Communication', b: 'Touchpoints and care conversations both live here.' },
        { t: 'Record it', b: 'Pick the type, add what was discussed, save.' }
      ],
      know: [
        'Touchpoint cadence follows the client tier: High every fourteen days, Medium every thirty, Low every sixty.',
        'A care conversation is the longer structured one — High every ninety days, Medium and Low every one hundred and eighty.'
      ],
      related: ['workspace', 'tracker']
    },
    'pulse-status': {
      title: 'Understand a Pulse status',
      lede: 'What the three levels mean, and what they do not.',
      steps: [
        { t: 'Needs attention', b: 'Something in the recent record suggests this client should be looked at now.' },
        { t: 'Monitor', b: 'Worth keeping an eye on. Not urgent.' },
        { t: 'Status quo', b: 'Nothing in the recent record stands out.' },
        { t: 'Always open the evidence', b: 'The level is a pointer. The notes behind it are what you act on.' }
      ],
      know: ['Pulse is a prompt to look, not a judgement about the client or the caregiver.'],
      related: ['pulse']
    },
    'md-issue': {
      title: 'Work a Maryland compliance issue',
      lede: 'From the board to the client, without losing the thread.',
      steps: [
        { t: 'Open Maryland Compliance', b: 'Outstanding items are first.' },
        { t: 'Check how current the board is', b: 'It is assembled on a schedule and tells you when it last ran.' },
        { t: 'Open the client', b: 'Act in the client workspace, where the detail is.' }
      ],

      related: ['md', 'stale-data']
    },
    'switch-market': {
      title: 'Switch markets',
      lede: 'For anyone who works across more than one.',
      steps: [
        { t: 'Use the market control in the Hub chrome', b: 'It always shows the market you are in.' },
        { t: 'Pick the other market', b: 'Clients, search, attention and compliance all re-scope to it.' },
        { t: 'Check the chrome before you act', b: 'One glance confirms where you are. Worth the half second.' }
      ],
      know: ['Chicago is Central time. A Chicago client\'s times are Chicago\'s local times.'],
      related: ['markets']
    },
    'manager-views': {
      title: 'Work from team level down to a client',
      lede: 'For managers and directors.',
      steps: [
        { t: 'Open Team Overview', b: 'One row per CSM.' },
        { t: 'Find the outlier', b: 'You are looking for the row that does not match the others.' },
        { t: 'Open the CSM, then the client', b: 'The path from a team signal to the actual person is two clicks.' }
      ],
      related: ['team', 'mine-team-all']
    },
    'mine-team-all': {
      title: 'Mine, Team and All',
      lede: 'Three scopes, not three filters.',
      steps: [
        { t: 'Mine', b: 'The clients you personally own.' },
        { t: 'Team', b: 'The caseloads of the people who report to you.' },
        { t: 'All', b: 'Everyone in the market you are currently in.' }
      ],
      know: ['If a count looks wrong, check which scope you are in before anything else. It is the most common explanation.'],
      related: ['team']
    },
    'leave-feedback': {
      title: 'Leave feedback',
      lede: 'Fifteen seconds, without leaving the page.',
      steps: [
        { t: 'Click Feedback, lower right', b: 'It is on every page.' },
        { t: 'Pick a type', b: 'Broken, confusing, cannot find it, data looks wrong, or an idea.' },
        { t: 'Say what happened', b: 'What you were doing and what the Hub did. What you expected is optional but useful.' },
        { t: 'Send', b: 'You stay exactly where you were.' }
      ],
      know: ['No client or caregiver information is attached, and no screenshot is taken. Describe the screen, not the client.'],
      related: ['feedback']
    },
    'blocked-action': {
      title: 'When V2 says an action is not available',
      lede: 'What it means and what to do.',
      shot: {
        src: 'guide-shots/guide-blocked-action.png',
        alt: 'A message in the Hub explaining that a shared action is not saved in the new version and to use the current Hub.',
        caption: 'The Hub names the action and tells you where to do it.'
      },
      steps: [
        { t: 'Read the message', b: 'It names the action and says to use the current Hub for it.' },
        { t: 'Do that action in the current Hub', b: 'Same link you have always used. Nothing is lost by switching.' },
        { t: 'Come back', b: 'Everything else carries on as normal.' }
      ],
      know: [
        'A blocked action is a deliberate decision, not a bug. Those actions are shared across the whole team, and they are being switched on carefully, one at a time.',
        'Nothing you did was half-saved. A blocked action does not write anything at all.'
      ],
      related: ['v2-status', 'coverage', 'priority']
    },
    'did-it-save': {
      title: 'Did that save?',
      lede: 'How to tell, without guessing.',
      steps: [
        { t: 'Look at the sync indicator', b: 'It reads Saving while it works, then Saved with a time.' },
        { t: 'If it says Save failed', b: 'Your text is still on screen. Try again in a moment.' },
        { t: 'If the Hub said the action is not available', b: 'Nothing was written. Do it in the current Hub.' }
      ],
      related: ['blocked-action', 'quick-notes']
    }
  };

  /* ── Roles ─────────────────────────────────────────────────────────── */
  const roles = {
    csm: {
      title: 'For CSMs',
      lede: 'The Hub as a daily instrument: what to check, what to update, what still lives in the current Hub.',
      journeyTitle: 'Your day in the Hub',
      sections: [
        { h: 'Every day', b: 'Start on Home and read the attention panel in order. Work what it gives you. Add a to-do for anything you cannot do immediately.' },
        { h: 'Through the week', b: 'Client Tracker is where you work a client properly. Log touchpoints and care conversations as they happen rather than reconstructing them later. Check Success in 30 for anyone new.' },
        { h: 'What you can update here', b: 'Almost everything. Quick Notes, to-dos, 1:1 notes, KPI entries, client details, touchpoints and care conversations, the visit log, Success in 30, Pulse acknowledgement, coverage notes, Fill Priority, community settings, Maryland cadence, community email drafts, your Outlook calendar, and adding or cancelling a visit in Viv. All of it writes to the same records the current Hub reads.' },
        { h: 'What still belongs in the current Hub', b: 'Sending a community email to a community, sending an LTC packet to a carrier, and texting a caregiver about LTC notes. Each one leaves Tribute, so each is being switched on separately. The Hub tells you on screen, by name, if you try one.' }
      ],
      start: ['home', 'tracker', 'pulse'],
      related: ['review-attention', 'find-client', 'log-touchpoint', 'blocked-action']
    },
    csc: {
      title: 'For CSCs',
      lede: 'Where your work differs from a CSM\'s.',
      journeyTitle: 'How your day differs',
      sections: [
        { h: 'Scope', b: 'You see across the market rather than a single caseload, so the Tracker and Pulse cover more ground. Search matters more to you than scrolling does.' },
        { h: 'Day to day', b: 'Pulse and Home are the fastest way to find where attention is needed across the market. From there the route is the same as anyone else\'s: open the client, read the evidence, act.' },
        { h: 'LTC', b: 'You can review a submission and move it through its states here. Sending a packet to a carrier and texting a caregiver are still done in the current Hub. The page has had little operational use, so treat what you see with some care and report anything odd through Feedback.' },
        { h: 'What you can update here', b: 'The same set as a CSM, including the team-wide items: coverage notes, Fill Priority and community settings all save here now.' }
      ],
      start: ['pulse', 'tracker', 'ltc'],
      related: ['find-client', 'blocked-action']
    },
    manager: {
      title: 'For Managers and Directors',
      lede: 'Seeing across the team, and getting from a signal to a person.',
      journeyTitle: 'From the team to the client',
      sections: [
        { h: 'Start at team level', b: 'Team Overview puts one row per CSM in front of you. You are looking for the row that does not match the others, not for an average.' },
        { h: 'Mine, Team and All', b: 'Three scopes. Mine is your own caseload, Team is the people who report to you, All is everyone in the market you are currently in. If a number surprises you, check the scope before anything else.' },
        { h: 'Drilling down', b: 'From a team row to the CSM, from the CSM to the client. Two clicks, and the client workspace is the same one the CSM uses.' },
        { h: 'What this is not for', b: 'It is not a performance dashboard and it is not where staffing decisions get made. It is for finding where attention is needed.' }
      ],
      start: ['team', 'pulse', 'tracker'],
      related: ['manager-views', 'mine-team-all']
    },
    multimarket: {
      title: 'Working in more than one market',
      lede: 'Massachusetts and Chicago, without losing track of which is which.',
      journeyTitle: 'Working across two markets',
      sections: [
        { h: 'Choosing', b: 'You pick a market when you come in, and you can switch whenever you like. The market you are in is always shown in the Hub chrome.' },
        { h: 'What changes', b: 'Clients, search results, attention signals and compliance all re-scope to the market you are in.' },
        { h: 'What does not', b: 'Who you are, what you are allowed to do, and your own notes and to-dos. Those follow you.' },
        { h: 'Chicago and time', b: 'Chicago runs on Central time. Times shown for a Chicago client are Chicago\'s local times, not Eastern. If a time looks an hour out, check which market you are in.' }
      ],
      start: ['markets'],
      related: ['switch-market']
    }
  };

  /* ── Troubleshooting ───────────────────────────────────────────────── */
  const trouble = [
    { q: 'Something looks wrong', a: [
      'Refresh the page once.',
      'Check which market you are in — it is shown in the Hub chrome.',
      'Check you are on the client you think you are on.',
      'Look for a line saying the page is still loading or that a source could not be reached. The Hub says so rather than guessing.',
      'If it still looks wrong, use Feedback. Say what you were doing and what the screen showed.'
    ]},
    { q: 'I cannot save something', a: [
      'If the Hub said the action is not available here, nothing was written. Do that one in the current Hub — the message names it.',
      'If the status says Save failed, your text is still on screen. Try again in a moment.',
      'If it says Saved with a time, it saved. The current Hub will show the same thing.'
    ], id: 'cant-save' },
    { q: 'I cannot find a client', a: [
      'Check the market first. This is the usual reason.',
      'Search on any part of the name rather than scrolling.',
      'If you are a manager, check whether you are looking at Mine rather than Team or All.',
      'If the client is genuinely missing, use Feedback.'
    ], id: 'cant-find-client' },
    { q: 'The data looks old', a: [
      'Some pages are assembled on a schedule rather than the instant you open them, because building them takes real work. Those pages tell you when they were last built.',
      'If a page is mid-build it says so. A page that is loading is not a page telling you everything is fine.',
      'Refresh once. If the time shown does not move and the number still looks wrong, use Feedback.'
    ], id: 'stale-data' },
    { q: 'Should I use the current Hub or the new one?', a: [
      'Use the new one as your main Hub. It will tell you when an action belongs in the current Hub.',
      'Avoid having the same thing open and being edited in both at once — the second save wins.'
    ]},
    { q: 'I think I have lost something I typed', a: [
      'Do not retype it yet. Check the sync indicator and refresh once.',
      'If two people edited the same item at the same time, the Hub keeps the other person\'s version and tells you which item it was, so you can redo yours deliberately.',
      'Report it through Feedback either way. We would rather know.'
    ]}
  ];

  /* What people type, as opposed to what we wrote. Folded into the search
     index only; never shown. Apostrophes appear in both forms because a
     keyboard produces one and our copy produces the other. */
  const ALIASES = {
    'cant-save':       "why can't i save why cant i save can't save cannot save not saving save failed greyed out disabled blocked read only",
    'cant-find-client':"can't find missing client where is lost client search not working no results",
    'stale-data':      'old data out of date not updating refresh stale last built numbers wrong',
    't0':              'broken wrong looks wrong error something is wrong incorrect',
    't4':              'v1 v2 old hub new hub which hub should i use',
    't5':              'lost work disappeared overwritten gone my changes vanished conflict'
  };
  const PAGE_ALIASES = {
    home: 'dashboard landing first screen start morning',
    tracker: 'client list caseload my clients find a client search',
    workspace: 'client detail client record open a client tabs',
    pulse: 'red amber green attention level status needs attention monitor status quo',
    s30: 'onboarding new client first 30 days milestones success in 30',
    coverage: 'time off vacation out of office handoff cover covering',
    md: 'compliance regulation baltimore assessment overdue reassessment',
    priority: 'open shifts unfilled visits gaps staffing fill',
    emailcomm: 'community email weekly update senior living building newsletter',
    ltc: 'long term care insurance submission carrier',
    assistant: 'ai ask a question chatbot knowledge base templates',
    kpi: 'quarterly numbers metrics targets',
    team: 'manager director team overview everyone mine team all',
    markets: 'market switch massachusetts chicago maryland central time timezone',
    feedback: 'report a problem bug suggestion tell someone complain'
  };

  /* ── Glossary ──────────────────────────────────────────────────────── */
  const glossary = [
    ['CSM', 'Client Solutions Manager. Owns a caseload of clients and the relationship with each family.'],
    ['CSC', 'Client Solutions Coordinator. Works across a market rather than a single caseload.'],
    ['Pulse', 'A read on how a client is doing, drawn from caregiver notes, changes of condition, incidents and recent communication. Three levels: Needs attention, Monitor, Status quo.'],
    ['Needs attention', 'The most pressing Pulse level. Something in the recent record suggests looking now.'],
    ['Touchpoint', 'A recorded contact with a client or family. Cadence follows tier: High every 14 days, Medium 30, Low 60.'],
    ['Care Conversation', 'The longer structured conversation — satisfaction, caregiver fit, unmet needs, care plan accuracy. High every 90 days, Medium and Low every 180.'],
    ['Success in 30', 'The first thirty days of a new client, tracked as a set of known milestones.'],
    ['Coverage note', 'What a covering colleague needs to know about a client while you are out.'],
    ['Handoff', 'Assigning your caseload to a covering CSM for a period.'],
    ['Fill Priority', 'The ranking of open visits, so the most consequential gap gets solved first.'],
    ['Community', 'A senior living building where Tribute has clients.'],
    ['Market', 'Massachusetts, Chicago or Maryland. Sets the scope of everything you see.'],
    ['Mine / Team / All', 'Three scopes. Your own caseload; the caseloads of people who report to you; everyone in the current market.'],
    ['Tier', 'How closely a client is watched — High, Medium or Low. Drives touchpoint and care conversation cadence.'],
    ['Stale', 'A page built on a schedule that has not rebuilt recently. The page says when it was last built rather than hiding it.'],
    ['The current Hub', 'The version of the Hub everyone has been using. Still available, still works, and still the place for a few actions.'],
    ['The new Hub', 'The redesigned Hub being introduced. Same data, same records; a few actions are not switched on yet.']
  ];

  /* ── FAQ ───────────────────────────────────────────────────────────── */
  const faq = [
    ['Is my work saved automatically?', 'Yes, for everything the new Hub handles. There is no save button. The sync indicator says Saving, then Saved with a time.'],
    ['Will people using the current Hub see my changes?', 'Yes. Both versions read and write the same records. A note you write in one appears in the other.'],
    ['Why is an action unavailable in the new Hub?', 'Those actions are shared across the whole team, so they are being switched on carefully, one at a time. Nothing is half-saved — a blocked action writes nothing. The message names the action and tells you where to do it.'],
    ['Can I keep using the current Hub?', 'Yes. It is unchanged and stays available. Just avoid editing the same thing in both at the same moment.'],
    ['Why does a page say when it was built?', 'Some pages take real work to assemble, so they are built on a schedule. Showing the time is how you can judge whether a number is current.'],
    ['Does Feedback send anything about my clients?', 'No. It attaches which page you were on, your role and market, and technical detail about the screen. No client, caregiver or family information, and never a screenshot.'],
    ['Why can I see more clients than my own?', 'You are in a scope wider than Mine — Team or All — or your role covers the whole market.'],
    ['A time looks an hour out.', 'Check which market you are in. Chicago runs on Central time and shows Chicago local times.']
  ];

  return {
    updated: UPDATED, buildNote: BUILD_NOTE,
    pages, tasks, roles, trouble, glossary, faq,

    /* Flat index for search. Built once, from the content above, so it can
       never drift out of step with what is actually in the guide. */
    index: (function () {
      const rows = [];
      const push = (kind, id, title, text) => rows.push({ kind, id, title, text: (title + ' ' + text).toLowerCase() });
      Object.keys(pages).forEach(k => { const p = pages[k];
        push('page', k, p.title, [p.lede, p.what, (p.first||[]).join(' '), (p.can||[]).join(' '), p.v1||'', (p.know||[]).join(' '), PAGE_ALIASES[k]||''].join(' ')); });
      Object.keys(tasks).forEach(k => { const t = tasks[k];
        push('task', k, t.title, [t.lede, (t.steps||[]).map(s => s.t + ' ' + s.b).join(' '), (t.know||[]).join(' ')].join(' ')); });
      Object.keys(roles).forEach(k => { const r = roles[k];
        push('role', k, r.title, [r.lede, (r.sections||[]).map(s => s.h + ' ' + s.b).join(' ')].join(' ')); });
      trouble.forEach((t, i) => { const id = t.id || ('t' + i);
        push('trouble', id, t.q, t.a.join(' ') + ' ' + (ALIASES[id] || '')); });
      glossary.forEach(g => push('term', 'glossary', g[0], g[1]));
      faq.forEach(f => push('faq', 'faq', f[0], f[1]));
      return rows;
    })()
  };
})();
