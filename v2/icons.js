/* ═══════════════════════════════════════════════════════════════════════════
   TRIBUTE ICON SYSTEM
   ═══════════════════════════════════════════════════════════════════════════
   One family, drawn to one specification:

     · 24×24 viewBox, rendered at 15–17px
     · 1.5px stroke, round caps, round joins, no fill
     · monochrome, inheriting currentColor
     · optical weight matched across the set — no icon heavier than its
       neighbours, because an icon that shouts in a row of quiet ones reads
       as an error state when it is not

   The application contains 80 distinct emoji across 379 occurrences, and they
   arrive three ways: literal in the HTML, inside template strings in render
   functions, and inside <option> labels. A build-time find-and-replace would
   only catch the first. So this works on the DOM: it walks text nodes and
   swaps each emoji for its icon, and runs again whenever the app re-renders.

   WHAT IS DELIBERATELY NOT SWAPPED
     · <option>, <textarea>, <input>, <title> — an SVG cannot live in an
       option label, so emoji there is stripped to clean text instead.
     · The three market marks on the hub picker. A lobster, a skyline and a
       crab are how this company talks about Massachusetts, Chicago and
       Maryland. Replacing them with generic pins would remove something the
       product is better for having.
     · The wave in the morning greeting. That is warmth, not labelling.
     · The Tribute Secure shield, which is a brand mark, not an icon.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const P = {
    // ── Structure and affordance ────────────────────────────────────────
    close:      'M6 6l12 12M18 6L6 18',
    check:      'm5 12.5 4.5 4.5L19 8',
    chevron:    'm9 5 7 7-7 7',
    chevronDown:'m5 9 7 7 7-7',
    arrowRight: 'M4 12h15m-6-6 6 6-6 6',
    arrowLeft:  'M20 12H5m6-6-6 6 6 6',
    arrowUp:    'M12 20V5m-6 6 6-6 6 6',
    arrowDown:  'M12 4v15m6-6-6 6-6-6',
    refresh:    'M20 11a8 8 0 0 0-13.7-5.3L4 8M4 4v4h4M4 13a8 8 0 0 0 13.7 5.3L20 16m0 4v-4h-4',
    search:     'M11 4.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM16 16l4 4',
    plus:       'M12 5v14M5 12h14',
    minus:      'M5 12h14',
    download:   'M12 4v11m-4.5-4.5L12 15l4.5-4.5M4.5 19h15',
    external:   'M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
    more:       'M6 12h.01M12 12h.01M18 12h.01',
    edit:       'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM15 6l3 3',
    copy:       'M9 9h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1',
    eye:        'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
    filter:     'M4 6h16M7 12h10M10 18h4',
    sort:       'M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3',

    // ── Status ──────────────────────────────────────────────────────────
    alert:      'M12 4.5 2.8 20h18.4L12 4.5ZM12 10v4.5M12 17.6h.01',
    info:       'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 11v5.5M12 7.8h.01',
    bell:       'M18 9a6 6 0 0 0-12 0c0 5-2 6-2 6h16s-2-1-2-6ZM10.3 20a2 2 0 0 0 3.4 0',
    flag:       'M5 20V4.5h10l-1 2.6 1 2.6H5',
    bolt:       'M13 3 5 13.5h6L11 21l8-10.5h-6L13 3Z',
    shield:     'M12 3.2 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6Z',
    shieldCheck:'M12 3.2 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6ZM9.2 12l2 2 3.6-3.6',
    lock:       'M6.5 10.5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7',
    lightbulb:  'M9.2 17.5h5.6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.2 10c.5.4.8 1 .8 1.6h4.8c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3.5Z',
    star:       'm12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8L12 4Z',
    sparkle:    'M12 3.5 13.6 9l5.4 1.6L13.6 12 12 17.5 10.4 12 5 10.6 10.4 9 12 3.5ZM18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z',

    // ── Time and scheduling ─────────────────────────────────────────────
    calendar:   'M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1ZM4 10.5h16M8.5 4v4M15.5 4v4',
    calendarDue:'M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1ZM4 10.5h16M8.5 4v4M15.5 4v4M12 13.5v3.2',
    clock:      'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7.2V12l3 1.8',
    history:    'M3.5 12a8.5 8.5 0 1 0 2.6-6.1M3.5 4.5V10h5.5M12 7.5V12l3 1.8',
    snow:       'M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9',
    gift:       'M4.5 10.5h15V19a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8.5ZM3.8 7h16.4v3.5H3.8zM12 7v13M12 7S10.8 4 9 4a2 2 0 0 0 0 4M12 7s1.2-3 3-3a2 2 0 0 1 0 4',

    // ── People and relationships ────────────────────────────────────────
    person:     'M12 4.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8ZM5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2',
    people:     'M9 4.5a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4ZM2.8 20c0-3.3 2.8-5.8 6.2-5.8s6.2 2.5 6.2 5.8M16.4 5.2a3 3 0 0 1 0 5.8M18 20c0-2.4-1-4.2-2.7-5.1',
    handshake:  'M3 11.5 7 8l3 2.2 2-1.4 2 1.4 3-2.2 4 3.5M7.5 13.5l2.3 2.3a1.4 1.4 0 0 0 2 0M11 15.5l1.8 1.8a1.3 1.3 0 0 0 1.9 0M14.5 15l1.3 1.3a1.3 1.3 0 0 0 1.9-1.9L13 10',
    heart:      'M12 19.5S4 14.7 4 9.6A4.1 4.1 0 0 1 12 7.8 4.1 4.1 0 0 1 20 9.6c0 5.1-8 9.9-8 9.9Z',
    heartbeat:  'M3 12h3.5L8.5 7l3.5 10 2.5-5H21',
    care:       'M12 19.5S4 14.7 4 9.6A4.1 4.1 0 0 1 12 7.8 4.1 4.1 0 0 1 20 9.6c0 5.1-8 9.9-8 9.9ZM12 10.5v3.4M10.3 12.2h3.4',

    // ── Communication ───────────────────────────────────────────────────
    phone:      'M7.3 4.5H5a1.5 1.5 0 0 0-1.5 1.6C4.1 13.6 10.4 19.9 17.9 20.5A1.5 1.5 0 0 0 19.5 19v-2.3l-4-1.6-2 2a13.6 13.6 0 0 1-5.6-5.6l2-2-2.6-4Z',
    mail:       'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM3.6 7.1l8.4 6 8.4-6',
    message:    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.2V16H5.5A1.5 1.5 0 0 1 4 14.5Z',
    chat:       'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.2V16H5.5A1.5 1.5 0 0 1 4 14.5ZM8.5 10.5h7',
    mobile:     'M8 3.5h8a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM10.8 17.6h2.4',
    fax:        'M7 9V4.5h10V9M5.5 9h13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1ZM7.5 13h9v6.5h-9z',
    laptop:     'M5.5 6h13a1 1 0 0 1 1 1v8.5h-15V7a1 1 0 0 1 1-1ZM3 18.5h18',
    globe:      'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.6 12h16.8M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5S14.2 18.2 12 20.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z',

    // ── Places and work objects ─────────────────────────────────────────
    home:       'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5',
    building:   'M5 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M15 20V9.5h3.5a1 1 0 0 1 1 1V20M3.5 20h17M8 8h4M8 11.5h4M8 15h4',
    community:  'M3 20V11l5-3.5 5 3.5v9M13 20v-6l4-2.8 4 2.8V20M2 20h20M6.5 14h3M15.8 16.5h2.4',
    medical:    'M5 7.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1ZM9 7.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5M12 11.5v5M9.5 14h5',
    stethoscope:'M6 4v4.5a4 4 0 0 0 8 0V4M6 4H4.5M6 4h1.5M14 4h-1.5M14 4h1.5M10 16.5v.5a4 4 0 0 0 8 0v-1.2M18 11.8a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2Z',
    document:   'M6 3.5h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1ZM14 3.5v4h4M8.5 13h7M8.5 16.5h4.5',
    clipboard:  'M9 4.5H7a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-2M9 3.2h6v2.6H9zM9 11h6M9 14.5h4',
    receipt:    'M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4v-17ZM9 8h6M9 11.5h6M9 15h3.5',
    note:       'M5 4.5h14a1 1 0 0 1 1 1v9l-5.5 5.5H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1ZM20 14.2h-4.5a1 1 0 0 0-1 1V20M8 9h8M8 12.5h5',
    briefcase:  'M4 8.5h16a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1ZM8.5 8.5V6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2.5M3 13h18',
    folder:     'M4 7.5h6.5L12 5h8v12.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z',
    book:       'M5 4.5h5.5a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2H5v-13ZM19 4.5h-5.5A2.5 2.5 0 0 0 11 7v13a2 2 0 0 1 2-2h6v-13Z',
    beach:      'M3 19.5h18M12 19.5V9M12 9a7 7 0 0 1 8 2.5L12 9ZM12 9a7 7 0 0 0-8 2.5L12 9ZM12 9a7 7 0 0 1 2.5-5.5L12 9Z',
    pin:        'M12 3.5a5.5 5.5 0 0 0-5.5 5.5c0 4.1 5.5 11 5.5 11s5.5-6.9 5.5-11A5.5 5.5 0 0 0 12 3.5ZM12 7.3a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z',

    // ── Analysis ────────────────────────────────────────────────────────
    chart:      'M4 20V10M10 20V5M16 20v-7M3 20h18',
    trendUp:    'M3.5 16.5 9 11l3.5 3.5L20.5 6.5M20.5 6.5h-5M20.5 6.5v5',
    trendDown:  'M3.5 7.5 9 13l3.5-3.5L20.5 17.5M20.5 17.5h-5M20.5 17.5v-5',
    target:     'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 11.4a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2Z',
    scales:     'M12 4v16M7 20h10M4 9h16M4 9 1.8 14.5a2.6 2.6 0 0 0 4.4 0L4 9ZM20 9l-2.2 5.5a2.6 2.6 0 0 0 4.4 0L20 9ZM4 9l8-2 8 2',
    compass:    'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM14.8 9.2l-1.9 4.4-4.4 1.9 1.9-4.4 4.4-1.9Z',
    gauge:      'M4 17a8 8 0 1 1 16 0M12 17l4-5',

    // ── Operations ──────────────────────────────────────────────────────
    settings:   'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM19.3 14.2a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.3a1.8 1.8 0 1 1-3.6 0v-.2a1.5 1.5 0 0 0-2.6-1l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.3a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1-2.6l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.3a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 2.6 1l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.3a1.8 1.8 0 1 1 0 3.6h-.2a1.5 1.5 0 0 0-1.4.9Z',
    handoff:    'M4 8h11.5M12 4.5 15.8 8 12 11.5M20 16H8.5M12.2 12.5 8.4 16l3.8 3.5',
    robot:      'M7 9.5h10a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1ZM12 6.5v3M12 4a1.2 1.2 0 1 0 0 2.5A1.2 1.2 0 0 0 12 4ZM3.5 12.5V16M20.5 12.5V16M9.8 13h.01M14.2 13h.01M9.8 16.3h4.4',
    rocket:     'M12 3.5s4 2.4 4 7.5c0 2.8-1.3 4.8-2.2 5.8h-3.6C9.3 15.8 8 13.8 8 11c0-5.1 4-7.5 4-7.5ZM12 9.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM10.2 16.8 8.5 20l2.2-.9M13.8 16.8l1.7 3.2-2.2-.9',
    checkCircle:'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM8.3 12.2l2.5 2.5 5-5',
    circle:     'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z',
    dot:        'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z'
  };


  /* ═══════════════════════════════════════════════════════════════════════
     TRIBUTE DOMAIN SYMBOLS
     ═══════════════════════════════════════════════════════════════════════
     Tier 2 of the system. Tier 1 is the utility set above — search, close,
     chevron, refresh — which stays deliberately plain because an action
     control should not have personality. Tier 3 is the market illustrations.

     These are the concepts this product says over and over, and each one was
     drawn against a Tribute motif rather than looked up in an icon library:

       warm window · doorway · threshold · two people · path · continuity ·
       presence

     What each one rejects, and why:

       Visit          not a calendar. A visit is somebody arriving at a door,
                      so it is a door with a path leading to it.
       Client         not a head-and-shoulders. A client is a person AT HOME,
                      so the person sits under a roofline.
       Community      not a building. A community is people around a place.
       Conversation   not a speech bubble. Two people, one seated and one
                      standing, which is the actual shape of the encounter.
       Coverage       not two arrows. Coverage means the thread does not
                      drop, so it is one unbroken arc from a filled anchor to
                      an open one waiting to pick it up.
       Compliance     not a shield. Compliance is evidence on file, so it is
                      a record with the check inside it.
       Schedule       not a calendar page. Care is a rhythm, so it is a
                      cadence line with one beat marked.
       Communication  not an envelope. It is reaching someone: a point and
                      the arcs travelling out from it.
       Pulse          not a heartbeat, which would make this a medical
                      product. Pulse is noticing, so it is attention
                      rippling outward around something being watched.
       Fill priority  not a bolt. It is the empty slot between two filled
                      ones.

     Same specification as the utility set: 24 viewBox, 1.5 stroke, round
     caps and joins, no fill, currentColor.
     ═══════════════════════════════════════════════════════════════════════ */
  const D = {
    client:
      'M4 10.6 12 4.6l8 6' +
      'M12 12.8a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6' +
      'M8.2 21c0-2.1 1.7-3.6 3.8-3.6s3.8 1.5 3.8 3.6',
    visit:
      'M8 21V7.6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V21' +
      'M11.2 14.4h.6' +
      'M2 21h2.2M5.6 21h1.4',
    community:
      'M4 11.2 12 5.4l8 5.8' +
      'M8 15.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8' +
      'M16 15.4a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8' +
      'M12 14a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8',
    conversation:
      'M8 6.4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5' +
      'M4.4 20v-3.3a3.6 3.6 0 0 1 7.2 0V20' +
      'M16.4 10.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4' +
      'M13.2 20v-2.4a3.2 3.2 0 0 1 6.4 0V20',
    coverage:
      'M4.5 16.5a7.5 7.5 0 0 1 15 0' +
      'M4.5 14.6a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8' +
      'M19.5 14.2a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6',
    compliance:
      'M6 3.6h8l4 4v12.8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.6a1 1 0 0 1 1-1Z' +
      'M14 3.6v4h4' +
      'M8.4 13.4l2.3 2.3 4.4-4.7',
    ltc:
      'M5 4h8l4 4v8.4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z' +
      'M13 4v4h4' +
      'M8.2 11.6h5M8.2 14.4h3.4' +
      'M14.6 20.6h6.4M18.8 18.4l2.2 2.2-2.2 2.2',
    schedule:
      'M3 15.4h18' +
      'M7.2 15.4v-3M16.8 15.4v-3' +
      'M12 15.4v-4.2' +
      'M12 7.2a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
    communication:
      'M6 9.8a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8' +
      'M11.4 8.6a5 5 0 0 1 0 6.8' +
      'M15 5.6a9 9 0 0 1 0 12.8',
    pulse:
      'M12 10a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2' +
      'M7.9 7.9a6 6 0 0 0 0 8.4M16.1 7.9a6 6 0 0 1 0 8.4' +
      'M4.9 4.9a10.2 10.2 0 0 0 0 14.4M19.1 4.9a10.2 10.2 0 0 1 0 14.4',
    fill:
      'M4 6.8h16M4 12h10.5M4 17.2h6' +
      'M4 6.8h16',
    onboarding:
      'M20.2 12a8.2 8.2 0 1 1-4.8-7.5' +
      'M8.8 12.3l2.4 2.4 4.6-5',
    team:
      'M9 5.8a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2' +
      'M3.6 20c0-3 2.4-5.2 5.4-5.2s5.4 2.2 5.4 5.2' +
      'M16.4 7.4a2.8 2.8 0 0 1 0 5.6' +
      'M17.6 20c0-2.3-.9-4.1-2.5-5.1'
  };
  Object.keys(D).forEach(function (k) { P[k] = D[k]; });

  // emoji → icon. Anything not listed is left alone, which is deliberate:
  // an unmapped glyph stays visible so it gets noticed and designed, rather
  // than silently disappearing.
  const MAP = {
    '✕': 'close', '✖': 'close', '❌': 'close', '╳': 'close',
    '✓': 'check', '✔': 'check', '✅': 'checkCircle',
    '▶': 'chevron', '▼': 'chevronDown', '▲': 'arrowUp', '◀': 'arrowLeft',
    '→': 'arrowRight', '←': 'arrowLeft', '↑': 'arrowUp', '↓': 'arrowDown',
    '↩': 'arrowLeft', '↻': 'refresh', '🔄': 'refresh', '🔁': 'handoff',
    '⚠': 'alert', '🚨': 'alert', '🔺': 'alert',
    '📅': 'calendar', '🗓': 'calendar', '⏳': 'clock', '🕒': 'clock',
    '📞': 'phone', '☎': 'phone', '📱': 'mobile',
    '📧': 'mail', '✉': 'mail', '📨': 'mail',
    '🤝': 'handshake', '💬': 'chat', '💭': 'chat',
    '👥': 'people', '👤': 'person', '👩': 'person', '🧑': 'person',
    '📊': 'chart', '📈': 'trendUp', '📉': 'trendDown',
    '📝': 'note', '📋': 'clipboard', '📄': 'document', '🧾': 'receipt',
    '🏠': 'home', '🏢': 'building', '🏘': 'community',
    '🏥': 'medical', '🩺': 'stethoscope', '⚕': 'medical',
    '🔒': 'lock', '🔐': 'lock', '⚙': 'settings',
    '🎯': 'target', '💓': 'heartbeat', '🧭': 'compass',
    '📚': 'book', '⚖': 'scales', '🤖': 'robot',
    '🏖': 'beach', '📌': 'pin', '✏': 'edit', '✎': 'edit',
    '🔍': 'search', '🔎': 'search', '👁': 'eye',
    '⬇': 'download', '⚡': 'bolt', '🔔': 'bell', '💡': 'lightbulb',
    '❄': 'snow', '🎄': 'gift', '✦': 'sparkle', '✨': 'sparkle',
    '★': 'star', '☆': 'star',
    '🌐': 'globe', '📠': 'fax', '💻': 'laptop',
    '🌅': 'clock', '🧡': 'heart', '❤': 'heart',
    '🚫': 'alert', '🚀': 'rocket',
    // Status pucks become a filled dot the status colour can drive.
    '🔴': 'dot', '🟡': 'dot', '🟢': 'dot',
    '🟠': 'dot', '⚫': 'dot', '●': 'dot', '■': 'dot'
  };

  // Status pucks carry colour as well as shape.
  const TONE = {
    '🔴': 'bad', '🟠': 'warn', '🟡': 'warn',
    '🟢': 'pos', '⚫': 'mute', '●': 'mute', '■': 'mute',
    '⚠': 'warn', '🚨': 'bad', '🔺': 'bad', '✅': 'pos', '✓': 'pos'
  };

  // Left exactly as they are. See the header for why.
  //
  // The waving hand is NOT in this set. It was, and that is why it kept
  // coming back: the greeting's strip pass removed it and the swapper put
  // it straight back, because KEEP meant "protect this glyph". The wave is
  // decoration standing in for tone, and "Good morning, Julia" at 27px with
  // room around it is warmer than a glyph. The market marks stay because
  // they are market identity, not punctuation.
  const KEEP = new Set(['🦞', '🌆', '🦀', '🛡']);

  const EMOJI_RE = /[←-⇿①-➿⬀-⯿⚕⚖⚙⚠⚫✉❤■▲▶▼◀●★☆]️?|[\uD83C-\uD83E][\uDC00-\uDFFF](?:‍[\uD83C-\uD83E][\uDC00-\uDFFF])*️?/g;

  function svg(name, cls) {
    const d = P[name];
    if (!d) return '';
    return '<svg class="ti' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="' + d + '"/></svg>';
  }
  function node(name, tone) {
    const wrap = document.createElement('span');
    wrap.className = 'ti-w' + (tone ? ' ti-' + tone : '');
    wrap.innerHTML = svg(name);
    return wrap;
  }

  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SVG', 'PATH', 'TITLE', 'CODE', 'PRE']);

  function swap(root) {
    if (!root) return 0;
    let n = 0;

    // <option> cannot hold markup, so strip the glyph and tidy the spacing.
    root.querySelectorAll && root.querySelectorAll('option').forEach(function (o) {
      if (o.dataset.tiDone) return;
      o.dataset.tiDone = '1';
      const t = o.textContent;
      const stripped = t.replace(EMOJI_RE, function (m) { return KEEP.has(m.replace('️', '')) ? m : ''; })
        .replace(/\s{2,}/g, ' ').trim();
      if (stripped !== t) { o.textContent = stripped; n++; }
    });

    // Labels get their glyphs STRIPPED, not converted. A heading that
    // auto-grows an icon is exactly the "icon beside every heading" the
    // design brief rules out; the few headings that deserve a symbol get a
    // designed domain one, chosen by hand, from redesign.js.
    const LABEL_SEL = '.ct, .ph h2, .mh, .mt, th, .sl, .nav-sec, .tab, .rd-sec-h h3, label, .fl, legend';
    root.querySelectorAll && root.querySelectorAll(LABEL_SEL).forEach(function (el) {
      if (el.dataset.tiLab || el.closest('.ti-skip')) return;
      el.dataset.tiLab = '1';
      el.childNodes.forEach(function (n) {
        if (n.nodeType !== 3 || !EMOJI_RE.test(n.nodeValue)) return;
        n.nodeValue = n.nodeValue.replace(EMOJI_RE, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
      });
    });

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (t) {
        const p = t.parentElement;
        if (!p || SKIP_TAGS.has(p.tagName) || p.closest('option, svg, .ti-skip')) return NodeFilter.FILTER_REJECT;
        if (p.closest('.hub-icon')) return NodeFilter.FILTER_REJECT;   // market marks
        if (p.closest(LABEL_SEL)) return NodeFilter.FILTER_REJECT;     // handled above
        return EMOJI_RE.test(t.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const targets = [];
    let t;
    while ((t = walker.nextNode())) targets.push(t);

    targets.forEach(function (text) {
      const parts = text.nodeValue.split(EMOJI_RE);
      const found = text.nodeValue.match(EMOJI_RE) || [];
      if (!found.length) return;
      // If EVERY glyph here is one we deliberately keep, replacing the node
      // would produce an identical node -- but it is still a DOM mutation,
      // which wakes the redesign layer's observer, which runs another pass,
      // which does it again. That loop was running at roughly 10Hz on an
      // idle page purely because of the wave in the greeting. Leave the node
      // alone when nothing would actually change.
      let changes = 0;
      for (let i = 0; i < found.length; i++) {
        if (!KEEP.has(found[i].replace(/\uFE0F/g, ''))) { changes++; break; }
      }
      if (!changes) return;
      const frag = document.createDocumentFragment();
      parts.forEach(function (chunk, i) {
        if (chunk) frag.appendChild(document.createTextNode(chunk));
        const raw = found[i];
        if (!raw) return;
        const bare = raw.replace(/️/g, '');
        if (KEEP.has(bare)) { frag.appendChild(document.createTextNode(raw)); return; }
        const icon = MAP[bare] || MAP[raw];
        if (icon) { frag.appendChild(node(icon, TONE[bare] || TONE[raw])); n++; }
        // Unmapped: drop it rather than leave a lone glyph in a line of icons.
        else n++;
      });
      // Collapse the double space an inline glyph usually leaves behind.
      text.parentNode.replaceChild(frag, text);
    });
    return n;
  }


  /* ═══════════════════════════════════════════════════════════════════════
     MARKET ILLUSTRATIONS
     ═══════════════════════════════════════════════════════════════════════
     Bespoke, not icons. The hub picker is the first thing anyone sees and it
     was carrying a lobster, a skyline emoji and a crab — shorthand that made
     a care product look like a souvenir shop.

     One visual DNA across all three:
       · 180 × 124 viewBox, drawn to the same optical mass
       · three stroke weights — 1.7 structure, 1.35 secondary, 1.1 context
       · one ground line at the same y in every market, so the three cards
         sit on a shared horizon
       · exactly ONE warm window per illustration, in Tribute orange, lit
         from inside. That is the whole idea of the company in one mark:
         somebody is home, and somebody is with them.
       · residential scale throughout. No landmarks, no monuments, nothing
         a tourist would photograph.

     The regional reference is architectural rather than emblematic:
     Massachusetts is a clapboard house with a covered porch, Chicago is
     neighbourhood vertical living with a pitched roof still in the frame,
     Maryland is the rowhouse rhythm of a Baltimore block with a bay window
     and a stoop. Someone from each place would recognise the street. Nobody
     has to be told what the animal means.
     ═══════════════════════════════════════════════════════════════════════ */
  const MARKET_ART = {
    /* MASSACHUSETTS — Beacon Hill. Two bowfronts flanking a raised stoop with
       an iron rail and a gas lamp: the curve of a bowfront row is the one
       Boston residential form nobody mistakes for anywhere else. A lobster
       weathervane on the ridge, large enough to read. The harbour is one
       line. Through the left bow window, someone seated and someone with
       them. */
    MA:
      '<svg viewBox="0 0 180 124" class="rd-mk mk-ma" aria-hidden="true">' +
        '<g class="mk-ctx"><path d="M10 110h160"/></g>' +
        '<path class="mk-fill" d="M34 104V38h116v66Z"/>' +
        '<g class="mk-1">' +
          '<path d="M34 104V38h116v66"/>' +
          '<path d="M32 38h120"/>' +
        '</g>' +
        '<g class="mk-2">' +
          '<path d="M34 46h116"/>' +
          '<path d="M44 54h18v24H44zM122 54h18v24h-18z"/>' +
          '<path d="M40 54h4v24h-4zM62 54h4v24h-4z"/>' +
          '<path d="M118 54h4v24h-4zM140 54h4v24h-4z"/>' +
          '<path d="M44 84h18v16H44zM122 84h18v16h-18z"/>' +
        '</g>' +
        '<g class="mk-1">' +
          '<path d="M78 100V82h22v18"/>' +
          '<path d="M78 82a11 11 0 0 1 22 0"/>' +
          '<path d="M89 71v11"/>' +
          '<path d="M74 104h30M76 100h26"/>' +
          '<path d="M74 100V88M104 100V88M74 88h30"/>' +
          '<path d="M160 104V80M154 80h12l-2 11h-8Z"/>' +
          '<path d="M160 80v-5"/>' +
        '</g>' +
        '<g class="mk-egg mk-cod">' +
          '<path d="M89 38v-7"/>' +
          '<path d="M78 25c5-7 17-9 24-4 2 2 4 3 6 4-2 1-4 2-6 4-7 5-19 3-24-4Z"/>' +
          '<path d="M78 25l-8-7v14Z"/>' +
          '<path d="M88 18l3-4 4 4"/>' +
          '<path d="M88 32l3 4 4-4"/>' +
          '<circle cx="101" cy="23" r="1.3"/>' +
        '</g>' +
        '<g class="mk-lit">' +
          '<rect x="77" y="48" width="24" height="22" rx="2"/>' +
          '<g class="mk-fig">' +
            '<path d="M83 70v-7a3 3 0 0 1 6 0v7"/>' +
            '<circle cx="86" cy="58" r="3"/>' +
            '<path d="M92 70V57a3 3 0 0 1 6 0v13"/>' +
            '<circle cx="95" cy="52" r="3"/>' +
          '</g>' +
        '</g>' +
      '</svg>',
    CHI:
      '<svg viewBox="0 0 180 124" class="rd-mk mk-chi" aria-hidden="true">' +
        '<g class="mk-ctx"><path d="M10 112h160"/></g>' +
        '<path class="mk-fill" d="M20 104V44h78v60Z"/>' +
        '<g class="mk-2">' +
          '<path d="M20 74h78"/>' +
          '<path d="M20 52h78"/>' +
        '</g>' +
        '<g class="mk-1">' +
          '<path d="M20 104V44h78v60"/>' +
          '<path d="M18 44h82"/>' +
          '<path d="M30 104V80h24v24"/>' +
          '<path d="M28 80h28"/>' +
          '<path d="M70 104V84h16v20"/>' +
          '<path d="M66 104h24M68 100h20M70 96h16"/>' +
          '<path d="M66 96V86M90 96V86M66 86h24"/>' +
        '</g>' +
        '<g class="mk-el">' +
          '<path d="M100 72h70M100 78h70"/>' +
          '<path d="M112 104V78M140 104V78M164 104V78"/>' +
          '<path d="M108 90h8M136 90h8M160 90h4"/>' +
        '</g>' +
        '<g class="mk-1 mk-train">' +
          '<path d="M112 72V52h52v20"/>' +
          '<path d="M110 52h56"/>' +
          '<path d="M118 58h12v9h-12zM136 58h12v9h-12z"/>' +
          '<path d="M154 58h8v9h-8z"/>' +
        '</g>' +
        '<g class="mk-lit">' +
          '<rect x="58" y="54" width="24" height="22" rx="2"/>' +
          '<g class="mk-fig">' +
            '<path d="M64 76v-7a3 3 0 0 1 6 0v7"/>' +
            '<circle cx="67" cy="64" r="3"/>' +
            '<path d="M73 76V63a3 3 0 0 1 6 0v13"/>' +
            '<circle cx="76" cy="58" r="3"/>' +
          '</g>' +
        '</g>' +
      '</svg>',

    /* MARYLAND — a Baltimore block with its white marble steps, which are the
       detail Baltimoreans actually point at, drawn filled so they read as
       marble. A skipjack under sail on the Chesapeake behind. One crab in
       the shallows, small enough that you have to look. */
    MD:
      '<svg viewBox="0 0 180 124" class="rd-mk mk-md" aria-hidden="true">' +
        '<g class="mk-ctx"><path d="M10 110h160"/></g>' +
        '<g class="mk-ctx mk-boat">' +
          '<path d="M34 100V56"/>' +
          '<path d="M34 60v38H16Z"/>' +
          '<path d="M34 66v32h15Z"/>' +
          '<path d="M12 97c5 7 35 7 40 0Z"/>' +
          '<path d="M18 97h28"/>' +
        '</g>' +
        '<path class="mk-fill" d="M62 104V58h32v46ZM94 104V46h34v58ZM128 104V58h32v46Z"/>' +
        '<g class="mk-2">' +
          '<path d="M70 70h14v17H70z"/>' +
          '<path d="M138 70h14v17h-14z"/>' +
          '<path d="M64 64h28M130 64h28"/>' +
          '<path d="M96 54h30"/>' +
        '</g>' +
        '<g class="mk-1">' +
          '<path d="M62 104V58h32v46"/>' +
          '<path d="M94 104V46h34v58"/>' +
          '<path d="M128 104V58h32v46"/>' +
          '<path d="M60 58h34M92 46h38M126 58h34"/>' +
          '<path d="M102 100V84h18v16"/>' +
        '</g>' +
        '<g class="mk-marble">' +
          '<path d="M98 104h26v-5h-22v-5h18v-5h-14v15Z"/>' +
        '</g>' +
        '<g class="mk-egg">' +
          '<path d="M150 118c0-3 3-5 7-5s7 2 7 5-3 4-7 4-7-1-7-4Z"/>' +
          '<path d="M150 116l-5-3M145 113a3 3 0 1 0-3-3"/>' +
          '<path d="M164 116l5-3M169 113a3 3 0 1 1 3-3"/>' +
          '<path d="M152 122l-2 3M157 123v3M162 122l2 3"/>' +
        '</g>' +
        '<g class="mk-lit">' +
          '<rect x="99" y="56" width="24" height="22" rx="2"/>' +
          '<g class="mk-fig">' +
            '<path d="M105 78v-7a3 3 0 0 1 6 0v7"/>' +
            '<circle cx="108" cy="66" r="3"/>' +
            '<path d="M114 78V65a3 3 0 0 1 6 0v13"/>' +
            '<circle cx="117" cy="60" r="3"/>' +
          '</g>' +
        '</g>' +
      '</svg>'
  };
  window.TributeIcons = {
    svg: svg, node: node, paths: P, map: MAP, swap: swap,
    market: function (k) { return MARKET_ART[k] || ''; },
    markets: Object.keys(MARKET_ART)
  };
})();
