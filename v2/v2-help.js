/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXTUAL HELP
   ═══════════════════════════════════════════════════════════════════════════
   Help has to be available without being in the way. An experienced CSM
   should barely notice this exists; a new one should never have to go
   looking. So there are exactly two surfaces:

     1. one Guide link in the sidebar, always in the same place
     2. one small "What is this?" link per page, which deep-links to THAT
        page's section of the guide rather than to the guide's front door

   Deliberately NOT here: a help icon beside every label, a product tour, a
   modal on first load, or anything that interrupts somebody mid-task.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const GUIDE = './guide.html';

  // Hub page id -> guide route. Only pages where a question is actually
  // likely; a page nobody asks about does not need a link.
  const MAP = {
    home:      '#/page/home',
    clients:   '#/page/tracker',
    pulse:     '#/page/pulse',
    s60:       '#/page/s30',
    coverage:  '#/page/coverage',
    emailcomm: '#/page/emailcomm',
    ltc:       '#/page/ltc',
    md:        '#/page/md',
    priority:  '#/page/priority',
    assistant: '#/page/assistant',
    kpi:       '#/page/kpi',
    team:      '#/page/team'
  };
  const LABEL = {
    md:        'How the compliance board works',
    pulse:     'How Pulse is worked out',
    coverage:  'Why can’t I save this here?',
    priority:  'Why can’t I save this here?',
    emailcomm: 'What can I do here today?'
  };

  function open(route) {
    window.open(GUIDE + (route || ''), 'tribute-guide');
  }
  window.TributeGuide = { open: open, url: r => GUIDE + (r || '') };

  /* ── The sidebar link ───────────────────────────────────────────────── */
  function mountSidebarLink() {
    if (document.getElementById('v2-guide-link')) return true;
    const settings = document.getElementById('sb-settings') ||
                     [...document.querySelectorAll('.nav-item, .rd-nav-item')]
                       .find(e => /settings/i.test(e.textContent || ''));
    const host = settings && settings.parentNode;
    if (!host) return false;
    const a = document.createElement('a');
    a.id = 'v2-guide-link';
    a.className = settings.className;
    a.href = GUIDE;
    a.target = 'tribute-guide';
    a.textContent = 'Guide';
    a.setAttribute('aria-label', 'Open the Hub guide in a new tab');
    host.insertBefore(a, settings);
    return true;
  }

  /* ── The per-page link ──────────────────────────────────────────────── */
  function currentPageId() {
    const vis = [...document.querySelectorAll('[id^="page-"]')]
      .find(el => el.offsetParent !== null);
    return vis ? vis.id.replace(/^page-/, '') : null;
  }
  function mountPageLink() {
    const id = currentPageId();
    if (!id || !MAP[id]) { const old = document.getElementById('v2-help-link'); if (old) old.remove(); return; }
    const page = document.getElementById('page-' + id);
    if (!page) return;
    let a = document.getElementById('v2-help-link');
    if (!a) {
      a = document.createElement('a');
      a.id = 'v2-help-link';
      a.className = 'v2-help-link';
      a.target = 'tribute-guide';
    }
    a.href = GUIDE + MAP[id];
    a.textContent = LABEL[id] || 'What is this page for?';
    // Sit it directly under the page's own heading, where a question forms,
    // rather than floating somewhere it has to be hunted for.
    const h = page.querySelector('h2, .ph h2, .rd-ph h2, h1');
    const anchor = h ? (h.parentNode.querySelector('p') || h) : null;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(a, anchor.nextSibling);
    else page.insertBefore(a, page.firstChild);
  }

  function tick() { mountSidebarLink(); mountPageLink(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
  else tick();
  // The Hub re-renders constantly; re-mount quietly rather than fighting it.
  const mo = new MutationObserver(function () {
    clearTimeout(window.__helpT);
    window.__helpT = setTimeout(tick, 250);
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
