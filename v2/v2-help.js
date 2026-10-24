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
    // Sit it in the sidebar's own nav, styled exactly like the other items,
    // in the last section. The Hub rebuilds this list, hence the re-mount.
    const items = [...document.querySelectorAll('.sb-nav .nav-item')];
    if (!items.length) return false;
    const last = items[items.length - 1];
    const a = document.createElement('a');
    a.id = 'v2-guide-link';
    a.className = last.className.replace(/\bactive\b/, '').trim();
    a.href = GUIDE;
    a.target = 'tribute-guide';
    a.setAttribute('aria-label', 'Open the Hub guide in a new tab');
    // Match the internal shape of a nav item so it inherits the layout
    // rather than needing styles of its own.
    const icon = last.querySelector('.nav-icon');
    const label = last.querySelector('.nav-label');
    if (icon && label) {
      a.innerHTML = '<span class="nav-icon" aria-hidden="true">?</span>' +
                    '<span class="nav-label">Guide</span>';
    } else {
      a.textContent = 'Guide';
    }
    last.parentNode.insertBefore(a, last.nextSibling);
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
