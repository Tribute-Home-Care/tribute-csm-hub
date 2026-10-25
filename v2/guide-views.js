/* ═══════════════════════════════════════════════════════════════════════════
   TRIBUTE CSM HUB — GUIDE RENDERER
   ═══════════════════════════════════════════════════════════════════════════
   Turns guide-content.js into pages. Two hosts use this, unchanged:

     · the Guide inside the Hub   (v2-guide.js, links prefixed "#guide/")
     · the standalone guide page  (guide.html,  links prefixed "#/")

   One renderer, so the Guide a CSM reads on their phone inside the app and
   the Guide somebody opens from a link are the same words in the same shape.
   Everything it emits is escaped; nothing here fetches, writes or decides.

   Routes:  (empty) · topic/<id> · a/<id> · help · words
   ═══════════════════════════════════════════════════════════════════════════ */
window.GuideViews = (function () {
  'use strict';

  const G = () => window.GUIDE || { topics: [], articles: {}, trouble: [], glossary: [], faq: [], index: [] };
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let PREFIX = '#/';
  const href = r => PREFIX + (r || '');

  /* ── pieces ─────────────────────────────────────────────────────────── */
  function shot(s) {
    if (!s) return '';
    const marks = (s.callouts || []).map(c =>
      '<span class="g-cm" style="left:' + c.x + '%;top:' + c.y + '%" aria-hidden="true">' + c.n + '</span>').join('');
    const fig = '<figure class="g-fig"><div class="g-shot"><img src="' + esc(s.src) + '" alt="' + esc(s.alt) +
      '" loading="lazy">' + marks + '</div>' +
      (s.caption ? '<figcaption>' + esc(s.caption) + '</figcaption>' : '') + '</figure>';
    const cs = s.callouts || [];
    if (!cs.length) return '<div class="g-shotwrap">' + fig + '</div>';
    // The dots only point; the key is the explanation. Side by side on a wide
    // screen so the eye moves between them without scrolling.
    const key = '<div class="g-key"><h3>What to look at first</h3><ol>' + cs.map(c =>
      '<li><span class="n" aria-hidden="true">' + c.n + '</span><span class="g-key-b">' +
      '<span class="t">' + esc(c.title) + '</span><span class="b">' + esc(c.b) + '</span></span></li>').join('') +
      '</ol></div>';
    return '<div class="g-shotwrap"><div class="g-shotkey">' + fig + key + '</div></div>';
  }

  function blocks(body) {
    return (body || []).map(b => {
      let out = b.h ? '<h3>' + esc(b.h) + '</h3>' : '';
      if (b.p) out += '<p>' + esc(b.p) + '</p>';
      if (b.ul) out += '<ul class="g-ul">' + b.ul.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
      if (b.steps) out += '<ol class="g-steps">' + b.steps.map((s, i) =>
        '<li><span class="n">' + (i + 1) + '</span><span><span class="t">' + esc(s.t) +
        '</span><span class="b">' + esc(s.b) + '</span></span></li>').join('') + '</ol>';
      return out;
    }).join('');
  }

  const back = (r, label) =>
    '<a class="g-back" href="' + href(r) + '">&larr; ' + esc(label) + '</a>';

  function cardlist(rows) {
    return '<div class="g-cards">' + rows.map(r =>
      '<a href="' + href(r[0]) + '"><span class="t">' + esc(r[1]) + '</span>' +
      (r[2] ? '<span class="d">' + esc(r[2]) + '</span>' : '') + '</a>').join('') + '</div>';
  }

  function relatedBlock(ids) {
    const g = G();
    const rows = (ids || []).map(id => {
      if (g.articles[id]) return ['a/' + id, g.articles[id].title, g.articles[id].lede];
      const t = g.trouble.find(x => x.id === id);
      if (t) return ['help#' + id, t.q, 'Troubleshooting'];
      if (id === 'trouble') return ['help', 'Troubleshooting', 'When something is not right'];
      return null;
    }).filter(Boolean);
    if (!rows.length) return '';
    return '<section class="g-block"><h2>Related</h2>' + cardlist(rows) + '</section>';
  }

  /* ── views ──────────────────────────────────────────────────────────── */
  function home() {
    const g = G();
    const quick = ['overview', 'care-plan', 'schedule', 'find-client', 'install', 'feedback'];
    return '<header class="g-hero"><h1>Hub Guide</h1>' +
      '<p>Short answers about the Hub you are using right now. Start wherever you are — ' +
      'you do not need to read it through.</p>' +
      '<div class="g-search"><input type="search" id="g-q" placeholder="Search the guide" ' +
      'autocomplete="off" aria-label="Search the guide"><div id="g-res" class="g-res" hidden></div></div>' +
      '</header>' +
      '<section class="g-block"><h2>Jump to</h2>' +
      cardlist(quick.map(k => ['a/' + k, g.articles[k].title, g.articles[k].lede])) + '</section>' +
      g.topics.map(t =>
        '<section class="g-block"><h2><a href="' + href('topic/' + t.id) + '">' + esc(t.title) + '</a></h2>' +
        '<p class="g-lede">' + esc(t.lede) + '</p>' +
        cardlist(t.entries.map(k => ['a/' + k, g.articles[k].title, g.articles[k].lede])) +
        '</section>').join('') +
      '<section class="g-block"><h2>When something is not right</h2>' +
      cardlist([['help', 'Troubleshooting', 'The things that go wrong, and what to do'],
                ['words', 'Words we use', 'Glossary and common questions']]) + '</section>' +
      '<p class="g-foot">Updated ' + esc(g.updated) + '. ' + esc(g.buildNote) + '</p>';
  }

  function topic(id) {
    const g = G();
    const t = g.topics.find(x => x.id === id);
    if (!t) return notFound();
    return back('', 'Guide') +
      '<header class="g-head"><h1>' + esc(t.title) + '</h1><p class="g-lede">' + esc(t.lede) + '</p></header>' +
      cardlist(t.entries.map(k => ['a/' + k, g.articles[k].title, g.articles[k].lede]));
  }

  function article(id) {
    const g = G();
    const a = g.articles[id];
    if (!a) return notFound();
    const parent = g.topics.find(t => t.entries.indexOf(id) > -1);
    return back(parent ? 'topic/' + parent.id : '', parent ? parent.title : 'Guide') +
      '<header class="g-head"><h1>' + esc(a.title) + '</h1><p class="g-lede">' + esc(a.lede) + '</p></header>' +
      shot(a.shot) +
      '<div class="g-prose">' + blocks(a.body) + '</div>' +
      ((a.know && a.know.length)
        ? '<section class="g-note"><h2>Worth knowing</h2><ul class="g-ul">' +
          a.know.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul></section>' : '') +
      relatedBlock(a.related);
  }

  function help() {
    const g = G();
    return back('', 'Guide') +
      '<header class="g-head"><h1>Troubleshooting</h1>' +
      '<p class="g-lede">The things that actually go wrong, and what to do about each.</p></header>' +
      g.trouble.map(t =>
        '<section class="g-tcard" id="' + esc(t.id) + '"><h2>' + esc(t.q) + '</h2>' +
        '<ol class="g-steps plain">' + t.a.map(x => '<li><span class="b">' + esc(x) + '</span></li>').join('') +
        '</ol></section>').join('');
  }

  function words() {
    const g = G();
    return back('', 'Guide') +
      '<header class="g-head"><h1>Words we use</h1>' +
      '<p class="g-lede">Terms, and the questions that keep coming up.</p></header>' +
      '<section class="g-block"><h2>Glossary</h2><dl class="g-gl">' +
      g.glossary.map(x => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') +
      '</dl></section>' +
      '<section class="g-block"><h2>Common questions</h2><dl class="g-gl">' +
      g.faq.map(x => '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>').join('') +
      '</dl></section>';
  }

  function notFound() {
    return back('', 'Guide') + '<header class="g-head"><h1>Not here</h1>' +
      '<p class="g-lede">That part of the guide has moved or does not exist.</p></header>';
  }

  /* ── search ─────────────────────────────────────────────────────────── */
  function wireSearch(root, navigate) {
    const q = root.querySelector('#g-q'), res = root.querySelector('#g-res');
    if (!q || !res) return;
    const routeFor = r => r.kind === 'trouble' ? 'help#' + r.id
                        : r.kind === 'topic' ? 'topic/' + r.id
                        : (r.kind === 'term' || r.kind === 'faq') ? 'words'
                        : 'a/' + r.id;
    const LABEL = { article: '', trouble: 'Troubleshooting', topic: 'Section', term: 'Glossary', faq: 'Question' };
    let cur = -1;
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      if (s.length < 2) { res.hidden = true; res.innerHTML = ''; return; }
      const hits = G().index.filter(r => r.text.indexOf(s) > -1).slice(0, 8);
      if (!hits.length) {
        res.hidden = false;
        res.innerHTML = '<p class="g-res-none">Nothing matching “' + esc(q.value.trim()) + '”</p>';
        return;
      }
      cur = -1;
      res.hidden = false;
      res.innerHTML = hits.map((r, i) =>
        '<a href="' + href(routeFor(r)) + '" data-i="' + i + '"><span class="t">' + esc(r.title) + '</span>' +
        (LABEL[r.kind] ? '<span class="d">' + esc(LABEL[r.kind]) + '</span>' : '') + '</a>').join('');
      [].forEach.call(res.querySelectorAll('a'), a =>
        a.addEventListener('click', e => {
          if (!navigate) return;
          e.preventDefault();
          navigate(a.getAttribute('href').slice(PREFIX.length));
          q.value = ''; res.hidden = true;
        }));
    };
    q.addEventListener('input', draw);
    q.addEventListener('keydown', e => {
      const items = [].slice.call(res.querySelectorAll('a'));
      if (!items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); cur = Math.min(cur + 1, items.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cur = Math.max(cur - 1, 0); }
      else if (e.key === 'Enter' && items[cur]) { e.preventDefault(); items[cur].click(); return; }
      else if (e.key === 'Escape') { res.hidden = true; q.blur(); return; }
      else return;
      items.forEach((a, i) => a.classList.toggle('on', i === cur));
    });
  }

  /* ── entry ──────────────────────────────────────────────────────────── */
  function render(route) {
    const raw = String(route || '').replace(/^#?\/?/, '');
    const [path] = raw.split('#');
    const p = path.split('/').filter(Boolean);
    if (!p.length) return home();
    if (p[0] === 'topic') return topic(p[1]);
    if (p[0] === 'a') return article(p[1]);
    if (p[0] === 'help') return help();
    if (p[0] === 'words') return words();
    // A route the guide does not have still has to resolve to something a
    // person can read, not a blank panel.
    if (G().articles[p[0]]) return article(p[0]);
    return notFound();
  }

  return {
    render: render,
    wireSearch: wireSearch,
    get prefix() { return PREFIX; },
    set prefix(v) { PREFIX = v; },
    fragmentOf: function (route) { const i = String(route || '').indexOf('#'); return i > -1 ? route.slice(i + 1) : ''; }
  };
})();
