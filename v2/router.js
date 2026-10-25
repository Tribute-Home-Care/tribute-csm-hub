/* ═══════════════════════════════════════════════════════════════════════════
   ROUTER  —  History API, no framework
   ═══════════════════════════════════════════════════════════════════════════
   The hub behaves like a single-page app but keeps no history, so Back leaves
   the application entirely. That is the single most jarring thing about using
   it: a user who opens a client, glances at Coverage and presses Back lands
   on whatever they were doing before the hub.

   Routes
     #home
     #clients
     #clients/<client-id>
     #clients/<client-id>/<section>
     #coverage  #ltc  #md  #priority  #s60  #pulse  #emailcomm
     #assistant #expectations #kpi #team
     ...plus /edit and /log as layered suffixes for modal state

   Design decisions worth stating:

   · THE CLIENT ID IS THE APP'S OWN ID (`viv<vivId>`), never a name. Names
     change — the Viv sync overwrites `name` on every run — and a URL that
     breaks when a client is renamed is worse than no URL.

   · DEEP LINKS NEVER BYPASS PERMISSION. A route is applied by clicking the
     nav item the user actually has, so a link to #md held by someone with no
     Maryland access falls back to Home. The router cannot reach a page the
     rail does not offer, because it has no other way in.

   · BACK CLOSES THE TOP LAYER FIRST. Modal, then client detail, then page.
     Only layers a user would call "a place" are pushed; a toast or a tooltip
     is not history.

   · UNSAVED WORK IS NOT DISCARDED SILENTLY. The hub autosaves through
     queueSave(), so the risk is small, but a modal with a dirty field asks
     before Back closes it.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const A = () => window.TributeApp;
  const PAGES = ['home', 'clients', 's60', 'pulse', 'coverage', 'emailcomm',
    'ltc', 'md', 'priority', 'assistant', 'expectations', 'kpi', 'team', 'comms',
    'guide'];

  const R = {
    enabled: false,
    suspend: 0,            // >0 while the router itself is driving the UI
    last: null,
    log: []                // for the regression suite
  };

  const navFor = (page) => document.querySelector('.nav-item[onclick*="\'' + page + '\'"]');
  const navVisible = (page) => { const n = navFor(page); return !!n && n.style.display !== 'none'; };

  function parse(hash) {
    const raw = String(hash || '').replace(/^#\/?/, '');
    if (!raw) return { page: 'home', client: null, section: null, layer: null };
    const p = raw.split('/').filter(Boolean);
    const known = PAGES.indexOf(p[0]) > -1;
    const page = known ? p[0] : 'home';
    // An unknown route resolves to Home AND rewrites the address, so the bar
    // never shows a location the application is not actually at.
    const out = { page: page, client: null, section: null, layer: null, unknown: !known };
    // Everything after #guide/ belongs to the guide's own router.
    if (page === 'guide') { out.section = p.slice(1).join('/'); return out; }
    if (page === 'clients' && p[1]) {
      out.client = decodeURIComponent(p[1]);
      if (p[2] === 'edit' || p[2] === 'log') out.layer = p[2];
      else if (p[2]) out.section = p[2];
      if (p[3] === 'edit' || p[3] === 'log') out.layer = p[3];
    }
    return out;
  }

  function build(s) {
    let h = '#' + (s.page || 'home');
    if (s.page === 'guide') return h + (s.section ? '/' + s.section : '');
    if (s.page === 'clients' && s.client) {
      h += '/' + encodeURIComponent(s.client);
      if (s.section) h += '/' + s.section;
      if (s.layer) h += '/' + s.layer;
    }
    return h;
  }

  function current() {
    const page = (document.querySelector('.page.active') || {}).id || 'page-home';
    const s = { page: page.replace(/^page-/, ''), client: null, section: null, layer: null };
    // The client record is no longer an expanded row: it is the workspace
    // beside the list, so the selection lives there.
    const selBtn = document.querySelector('.rd-cl-open.sel');
    if (selBtn) s.client = selBtn.dataset.cid;
    if (s.client) {
      const tab = document.querySelector('.rd-ws-head .rd-cw-rail button[aria-selected="true"]');
      if (tab && tab.dataset.key && tab.dataset.key !== 'overview') s.section = tab.dataset.key;
    }
    const modal = document.querySelector('.mo.open');
    if (modal) s.layer = modal.id === 'm-client' ? 'edit' : (modal.id === 'm-asmt' ? 'log' : null);
    return s;
  }

  // ── Pushing ──────────────────────────────────────────────────────────────
  function push(partial, replace) {
    if (!R.enabled || R.suspend) return;
    const s = Object.assign(current(), partial || {});
    const h = build(s);
    if (h === location.hash) return;
    R.log.push({ at: Date.now(), hash: h, mode: replace ? 'replace' : 'push' });
    try {
      if (replace) history.replaceState({ t: 'hub' }, '', h);
      else history.pushState({ t: 'hub' }, '', h);
    } catch (e) { /* file:// can refuse pushState; routing then degrades to none */ }
    R.last = h;
  }

  // ── Applying ─────────────────────────────────────────────────────────────
  async function apply(s, opts) {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    R.suspend++;
    try {
      // 1. Close any layer that is not in the target route.
      if (!s.layer) {
        document.querySelectorAll('.mo.open').forEach((m) => m.classList.remove('open'));
      }

      // 2. Page. Permission is enforced by routing THROUGH the rail: if the
      //    user has no nav item for this page, they cannot reach it.
      if (!navVisible(s.page)) {
        if (s.page !== 'home') {
          console.info('[router] no permission for #' + s.page + ' — falling back to Home');
          if (window.showToast) showToast('That page is not available for your profile');
          s = { page: 'home', client: null, section: null, layer: null };
          try { history.replaceState({ t: 'hub' }, '', '#home'); } catch (e) {}
        }
      }
      if (s.unknown) { try { history.replaceState({ t: 'hub' }, '', '#home'); } catch (e) {} }
      const nav = navFor(s.page);
      const already = (document.querySelector('.page.active') || {}).id === 'page-' + s.page;
      if (nav && !already) { nav.click(); await wait(opts && opts.fast ? 60 : 260); }

      // 3. Client record.
      if (s.page === 'clients') {
        const RD = window.TributeRedesign;
        if (!s.client) {
          if (RD && RD.deselect) RD.deselect();
        } else {
          // The client may be filtered out of the current view. Widen to All
          // once rather than failing the deep link.
          if (!document.querySelector('.rd-cl-open[data-cid="' + s.client + '"]')) {
            const search = document.getElementById('cm-search');
            if (search && search.value) search.value = '';
            if (RD && RD.setView) RD.setView('all');
            await wait(opts && opts.fast ? 60 : 180);
          }
          if (RD && RD.select) RD.select(s.client);
          await wait(opts && opts.fast ? 40 : 140);
          // No section in the route means Overview. Without this, stepping
          // back from #clients/<id>/schedule to #clients/<id> left the
          // workspace on Schedule while the address said otherwise.
          // Both header class names, deliberately: the workspace header was
          // renamed .rd-ws-head -> .rd-cw-head and this selector was not,
          // which left every deep link to a section landing on Overview with
          // the address bar claiming otherwise.
          const want = s.section || 'overview';
          const RAIL = '.rd-cw-head .rd-cw-rail, .rd-ws-head .rd-cw-rail';
          const cur = document.querySelector(RAIL.split(', ').map(x => x + ' button[aria-selected="true"]').join(', '));
          if (!cur || cur.dataset.key !== want) {
            const btn = document.querySelector(RAIL.split(', ').map(x => x + ' button[data-key="' + want + '"]').join(', '));
            if (btn) btn.click();
            else {
              // A section that lives behind More has no chip to click.
              const more = document.querySelector('.rd-cw-more');
              if (more) {
                more.click();
                const alt = document.querySelector('.rd-menu-list[data-for="ws"] button[data-go="' + want + '"]');
                if (alt) alt.click(); else more.click();
              }
            }
          }
        }
      }

      // 3b. The guide's own route, applied without pushing history back at
      //     the router that is already applying it.
      if (s.page === 'guide' && window.TributeGuide && window.TributeGuide.show) {
        window.TributeGuide.show(s.section || '');
      }

      // 4. Layer.
      if (s.layer === 'edit' && s.client && window.editClient) {
        if (!document.querySelector('.mo.open')) { try { editClient(s.client); } catch (e) {} }
      }
    } finally {
      R.suspend--;
    }
  }

  // ── Back / forward ───────────────────────────────────────────────────────
  function onPop() {
    if (!R.enabled) return;
    const s = parse(location.hash);
    R.log.push({ at: Date.now(), hash: location.hash, mode: 'pop' });
    apply(s, { fast: true });
  }

  // ── Dirty-state guard ────────────────────────────────────────────────────
  // Only a modal with a genuinely changed field asks. Everything else in the
  // hub autosaves through queueSave(), so a prompt would be noise.
  function modalIsDirty() {
    const m = document.querySelector('.mo.open');
    if (!m) return false;
    return [...m.querySelectorAll('input,textarea,select')].some((el) => {
      if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
      if (el.tagName === 'SELECT') return el.value !== (el.querySelector('[selected]') || {}).value;
      return (el.value || '') !== (el.defaultValue || '');
    });
  }

  // ── Wiring ───────────────────────────────────────────────────────────────
  function start() {
    if (R.enabled) return;
    R.enabled = true;
    window.addEventListener('popstate', onPop);

    // Record page changes. showPage is the single funnel for every nav.
    if (typeof window.showPage === 'function' && !window.showPage.__routed) {
      const orig = window.showPage;
      const wrapped = function (p, el) {
        const r = orig.apply(this, arguments);
        // Going BACK to the Clients page keeps whichever client is selected,
        // so the address matches the screen. Every other page has no client,
        // so those are cleared.
        if (!R.suspend) {
          push(p === 'clients' ? { page: p, layer: null }
            : { page: p, client: null, section: null, layer: null });
        }
        return r;
      };
      wrapped.__routed = true;
      window.showPage = wrapped;
    }
    // Selection is pushed by the redesign layer (TributeRedesign.select),
    // because the client record is a workspace now, not an expanded row.
    // Record the edit modal as a layer.
    if (typeof window.editClient === 'function' && !window.editClient.__routed) {
      const orig = window.editClient;
      const wrapped = function (id) {
        const r = orig.apply(this, arguments);
        if (!R.suspend) push({ page: 'clients', client: id, layer: 'edit' });
        return r;
      };
      wrapped.__routed = true;
      window.editClient = wrapped;
    }
    // Closing a modal by its own control should also step history back, so the
    // Back button and the X agree about where they leave you.
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('.mc, [onclick*="closeM("]');
      if (!btn) return;
      setTimeout(() => {
        if (!document.querySelector('.mo.open') && /\/(edit|log)$/.test(location.hash)) {
          R.suspend++; try { history.back(); } finally { setTimeout(() => R.suspend--, 50); }
        }
      }, 40);
    }, true);

    // Restore the route the page was opened with, after auth, profile
    // resolution and data load have all completed.
    const want = parse(location.hash);
    if (location.hash && location.hash !== '#home') {
      apply(want);
    } else {
      push({ page: 'home' }, true);
    }
  }

  window.TributeRouter = {
    start: start,
    parse: parse,
    build: build,
    current: current,
    apply: apply,
    push: push,
    get log() { return R.log; },
    get enabled() { return R.enabled; },
    modalIsDirty: modalIsDirty
  };
})();
