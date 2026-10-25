/* ===========================================================================
   CSM Hub V2 — the Guide, inside the Hub
   ---------------------------------------------------------------------------
   The Guide used to open in a second browser tab with its own header, its own
   navigation and its own palette, which is why it read as a different website.
   It is now an ordinary Hub destination: the same rail on a desk, the same
   bottom bar and More drawer on a phone, the same top bar, the same market and
   profile, the same tokens.

   It renders with guide-views.js — the same renderer the standalone page uses,
   so there is one Guide, not two that drift apart.

   This file adds a page and routes to it. It fetches nothing, writes nothing
   and reads no client data.
   =========================================================================== */
(function () {
  'use strict';

  var PAGE_ID = 'page-guide';
  var PREFIX = '#guide/';
  var route = '';

  function views() { return window.GuideViews; }

  /* ---- the page ---------------------------------------------------------- */
  function host() {
    var el = document.getElementById(PAGE_ID);
    if (el) return el;
    var main = document.querySelector('.main');
    var sibling = document.getElementById('page-home');
    if (!main || !sibling) return null;
    el = document.createElement('div');
    el.id = PAGE_ID;
    el.className = 'page';
    // .gdoc scopes every guide style, so none of them can reach the rest of
    // the Hub. The Hub's own tokens are inherited rather than redefined.
    el.innerHTML = '<div class="gdoc"><div class="gdoc-in" id="gdoc-view" tabindex="-1"></div></div>';
    sibling.parentNode.insertBefore(el, sibling.nextSibling);
    return el;
  }

  function draw() {
    var el = host();
    if (!el || !views()) return;
    var V = views();
    V.prefix = PREFIX;
    var view = el.querySelector('#gdoc-view');
    view.innerHTML = V.render(route);
    V.wireSearch(view, go);
    // In-app links are navigation, not page loads.
    [].forEach.call(view.querySelectorAll('a[href^="' + PREFIX + '"]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        go(a.getAttribute('href').slice(PREFIX.length));
      });
    });
    var frag = V.fragmentOf(route);
    if (frag) {
      var t = view.querySelector('#' + CSS.escape(frag));
      if (t) { t.scrollIntoView({ block: 'start' }); return; }
    }
    window.scrollTo(0, 0);
    try { view.focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---- navigation -------------------------------------------------------- */
  function go(r, noPush) {
    route = String(r || '');
    host();
    if (typeof window.showPage === 'function') {
      var nav = document.getElementById('v2-guide-link');
      window.showPage('guide', nav || undefined);
    }
    draw();
    if (!noPush) {
      var h = '#guide' + (route ? '/' + route : '');
      if (location.hash !== h) {
        try { history.pushState({ t: 'guide' }, '', h); } catch (e) { location.hash = h; }
      }
    }
  }

  /* The Hub's router owns the address bar. It hands the guide anything under
     #guide/ and leaves the rest alone. */
  function fromHash() {
    var m = /^#guide(?:\/(.*))?$/.exec(location.hash || '');
    if (!m) return false;
    route = m[1] || '';
    host();
    draw();
    return true;
  }

  window.addEventListener('popstate', function () {
    if (/^#guide/.test(location.hash || '')) { route = (location.hash.replace(/^#guide\/?/, '') || ''); host(); draw(); }
  });

  /* ---- public surface ---------------------------------------------------- */
  /* Replaces the old window.open(). Contextual help from a page now lands in
     the Hub, with the rail still there and Back behaving normally. */
  window.TributeGuide = {
    open: function (r) { go(String(r || '').replace(/^#?\/?/, '')); },
    url: function (r) { return PREFIX + String(r || '').replace(/^#?\/?/, ''); },
    // Applied by the Hub's router, which is already managing the address bar.
    show: function (r) { go(String(r || '').replace(/^#?\/?/, ''), true); },
    inApp: true,
    // The standalone page is still there for a link somebody emails.
    externalUrl: function (r) { return './guide.html#/' + String(r || '').replace(/^#?\/?/, ''); }
  };

  function start() {
    host();
    if (!fromHash()) draw();
    // showPage is wrapped elsewhere too; this only needs to know when the
    // guide becomes visible so a cold deep link paints.
    var orig = window.showPage;
    if (typeof orig === 'function' && !orig.__v2guide) {
      var wrapped = function (p) {
        var r = orig.apply(this, arguments);
        if (p === 'guide') { host(); draw(); }
        return r;
      };
      wrapped.__v2guide = true;
      window.showPage = wrapped;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  // The rail is rebuilt after sign-in, so re-check for a while.
  var n = 0, t = setInterval(function () { if (++n > 20) return clearInterval(t); host(); }, 1000);
})();
