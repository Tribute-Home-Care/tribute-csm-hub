/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXTUAL HELP
   ═══════════════════════════════════════════════════════════════════════════
   Help has to be available without being in the way. An experienced CSM
   should barely notice this exists; a new one should never have to go
   looking. So there are exactly two surfaces:

     1. the Guide in the rail, always in the same place (built by the
        redesign layer as an ordinary destination — see v2-guide.js)
     2. one small "What is this?" link per page, and one per section inside a
        client, which lands on THAT part of the guide rather than its front door

   It opens IN the Hub now. A second browser tab was the single biggest reason
   the guide felt like somebody else's website, and on a phone installed to the
   Home Screen a new tab is worse than unhelpful.

   Deliberately NOT here: a help icon beside every label, a product tour, a
   modal on first load, or anything that interrupts somebody mid-task.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Hub page id -> guide article. Only pages where a question is actually
  // likely; a page nobody asks about does not need a link.
  const MAP = {
    home:      'a/home',
    clients:   'a/find-client',
    pulse:     'a/pulse',
    s60:       'a/s30',
    coverage:  'a/coverage',
    emailcomm: 'a/emailcomm',
    ltc:       'a/ltc',
    md:        'a/md',
    priority:  'a/priority',
    assistant: 'a/assistant',
    kpi:       'a/kpi',
    team:      'a/team'
  };
  // Client workspace section -> guide article.
  const SECTION = {
    overview:      'a/overview',
    careplan:      'a/care-plan',
    schedule:      'a/schedule',
    activity:      'a/activity',
    team:          'a/care-team',
    info:          'a/client-information',
    communication: 'a/communication',
    care:          'a/pulse-care',
    admin:         'a/ltc-other'
  };
  const LABEL = {
    md:        'How the compliance board works',
    pulse:     'How Pulse is worked out',
    emailcomm: 'What can I do here today?'
  };
  const SECTION_LABEL = {
    careplan: 'Where does this care plan come from?',
    schedule: 'How to read this schedule',
    team:     'How the care team is worked out'
  };

  function go(route) {
    if (window.TributeGuide && window.TributeGuide.open) window.TributeGuide.open(route);
  }
  function link(id, route, text) {
    let a = document.getElementById(id);
    if (!a) {
      a = document.createElement('a');
      a.id = id;
      a.className = 'v2-help-link';
      a.href = '#';
      a.addEventListener('click', function (e) {
        e.preventDefault();
        go(a.dataset.route);
      });
    }
    a.dataset.route = route;
    a.textContent = text;
    return a;
  }

  function currentPageId() {
    const vis = [...document.querySelectorAll('[id^="page-"]')].find(el => el.offsetParent !== null);
    return vis ? vis.id.replace(/^page-/, '') : null;
  }

  /* ── The per-page link ──────────────────────────────────────────────── */
  function mountPageLink() {
    const id = currentPageId();
    if (!id || !MAP[id]) { const old = document.getElementById('v2-help-link'); if (old) old.remove(); return; }
    const page = document.getElementById('page-' + id);
    if (!page) return;
    const a = link('v2-help-link', MAP[id], LABEL[id] || 'What is this page for?');
    // Sit it directly under the page's own heading, where a question forms,
    // rather than floating somewhere it has to be hunted for.
    const h = page.querySelector('h2, .ph h2, .rd-ph h2, h1');
    const anchor = h ? (h.parentNode.querySelector('p') || h) : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(a, anchor.nextSibling);
    else page.insertBefore(a, page.firstChild);
  }

  /* ── The per-section link, inside a client ──────────────────────────── */
  /* At the END of the section, because the question forms after reading it,
     not before. One link, never one per block. */
  function mountSectionLink() {
    const body = document.querySelector('#rd-ws .rd-ws-body');
    const RD = window.TributeRedesign;
    const sec = RD && RD.section;
    const old = document.getElementById('v2-help-section');
    if (!body || !sec || !SECTION[sec]) { if (old) old.remove(); return; }
    const a = link('v2-help-section', SECTION[sec], SECTION_LABEL[sec] || 'What is this for?');
    if (a.parentNode !== body) body.appendChild(a);
  }

  function tick() { mountPageLink(); mountSectionLink(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
  else tick();
  // The Hub re-renders constantly; re-mount quietly rather than fighting it.
  const mo = new MutationObserver(function () {
    clearTimeout(window.__helpT);
    window.__helpT = setTimeout(tick, 250);
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
