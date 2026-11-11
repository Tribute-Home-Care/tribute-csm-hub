/* ═══════════════════════════════════════════════════════════════════════════
   FOLLOWING UP — the three buckets, in one place
   ═══════════════════════════════════════════════════════════════════════════
   Emily, 29 October: "it would be helpful to have a location where I can view
   what I have sorted into the 'Nothing needed' 'Working on it' and 'Raising
   in 1:1' options to keep track of everything." She asked for it near the top
   of Home, as three columns, with a way to move items between them.

   NOTHING NEW IS STORED. setPulseAck() has always written {state, note, by,
   at, forReason, forHeadline} onto the client in the profile pocket. This
   reads it back and lays it out. The first reply on her ticket said the
   buckets "are not stored anywhere they can be listed back"; that was wrong,
   and it made an afternoon's work sound like a project.

   CALM CONTROL. With nothing sorted this renders NOTHING AT ALL. It is a
   place to find what you parked, not a standing reminder that you have not
   parked anything.

   A STALE CARD IS NOT A DONE CARD. An acknowledgement is bound to the flag it
   was raised on, exactly as the client record treats it. If the Pulse reason
   or headline has moved since, the card says so rather than quietly reading
   as handled. Moving a stale card between columns does NOT rebind it: that
   would erase the one signal saying something new happened. Reopening it on
   the client record is how you take the new flag.

   Columns run in the same order as the three buttons on the client record, so
   where you sort and where you review agree.
   =========================================================================== */
(function () {
  'use strict';

  var STATES = [
    ['aware_none', 'Nothing needed'],
    ['aware_working', 'Working on it'],
    ['aware_1to1', 'Raising in 1:1']
  ];
  var LABEL = {};
  STATES.forEach(function (s) { LABEL[s[0]] = s[1]; });

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // _PULSE and DATA are top-level `let` in the Hub, so they are global
  // bindings rather than window properties: reach them bare, behind a guard.
  function pulseByCid() {
    try { return (typeof _PULSE !== 'undefined' && _PULSE && _PULSE.byCid) ? _PULSE.byCid : null; }
    catch (e) { return null; }
  }
  function clients() {
    try { return (typeof get === 'function' ? get('clients') : []) || []; }
    catch (e) { return []; }
  }

  function when(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    var days = Math.floor((Date.now() - d.getTime()) / 864e5);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return days + ' days ago';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function rows() {
    var pm = pulseByCid();
    return clients()
      .filter(function (c) { return c && c.pulseAck && c.pulseAck.state && !c.isOffice; })
      .map(function (c) {
        var a = c.pulseAck;
        var pp = (pm && c.vivId) ? pm[c.vivId] : null;
        // No Pulse record loaded means we cannot tell whether the flag moved,
        // which is not the same as knowing it did. Do not cry stale on it.
        var stale = !!pp && (a.forReason !== (pp.flagReason || '') || a.forHeadline !== (pp.headline || ''));
        return {
          id: c.id, name: c.name || '', state: a.state,
          note: a.note || '', by: a.by || '', at: a.at || '',
          stale: stale, was: a.forHeadline || a.forReason || ''
        };
      })
      .sort(function (x, y) { return String(y.at).localeCompare(String(x.at)); });
  }

  function card(r) {
    var others = STATES.filter(function (s) { return s[0] !== r.state; });
    return '<div class="fup-card' + (r.stale ? ' stale' : '') + '" draggable="true" data-id="' + esc(r.id) + '">' +
      '<button type="button" class="fup-name" data-open="' + esc(r.id) + '">' + esc(r.name) + '</button>' +
      (r.note ? '<div class="fup-note">' + esc(r.note) + '</div>' : '') +
      (r.stale ? '<div class="fup-stale">The Pulse flag has changed since you sorted this.</div>'
               : (r.was ? '<div class="fup-was">' + esc(r.was) + '</div>' : '')) +
      '<div class="fup-meta">' + esc([r.by, when(r.at)].filter(Boolean).join(' · ')) + '</div>' +
      '<div class="fup-acts">' +
        others.map(function (s) {
          return '<button type="button" class="fup-act" data-move="' + esc(r.id) + '" data-state="' + s[0] + '">' +
            'Move to ' + esc(s[1]) + '</button>';
        }).join('') +
        '<button type="button" class="fup-act drop" data-clear="' + esc(r.id) + '">Reopen</button>' +
      '</div>' +
    '</div>';
  }

  function html(list) {
    return '<div class="fup-cols">' + STATES.map(function (s) {
      var mine = list.filter(function (r) { return r.state === s[0]; });
      return '<div class="fup-col" data-state="' + s[0] + '">' +
        '<h4>' + esc(s[1]) + (mine.length ? ' <em>' + mine.length + '</em>' : '') + '</h4>' +
        '<div class="fup-drop">' +
          (mine.length ? mine.map(card).join('')
                       : '<div class="fup-empty">Nothing here</div>') +
        '</div></div>';
    }).join('') + '</div>';
  }

  // Change the bucket without re-asking for a note. setPulseAck() prompts,
  // which is right when you are deciding at the client record and wrong when
  // you are tidying a board. forReason/forHeadline are carried over: this is
  // a change of stance on the same flag, not an acknowledgement of a new one.
  function move(id, state) {
    var pid = (typeof _pulseAckProfile === 'function') ? _pulseAckProfile(id) : null;
    if (!pid) return;
    var cl = ((DATA.profiles || {})[pid] || {}).clients || [];
    var c = cl.find(function (x) { return x.id === id; });
    if (!c || !c.pulseAck) return;
    if (state === null) delete c.pulseAck;
    else c.pulseAck = Object.assign({}, c.pulseAck, {
      state: state, at: new Date().toISOString(),
      by: (typeof P !== 'undefined' && P && P.name) || c.pulseAck.by || ''
    });
    queueSave();
    paint();
    try { if (typeof renderClientMaster === 'function') renderClientMaster(); } catch (e) {}
    try { if (typeof showToast === 'function') showToast(state === null ? 'Reopened' : 'Moved to ' + LABEL[state]); } catch (e) {}
  }

  function openClient(id) {
    var nv = document.querySelector('.nav-item[data-page="clients"]');
    if (nv) nv.click();
    setTimeout(function () {
      try {
        if (window.TributeRedesign) { TributeRedesign.setView('all'); TributeRedesign.select(id); }
      } catch (e) {}
    }, 80);
  }

  function wire(sec) {
    sec.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-open],[data-move],[data-clear]');
      if (!t || !sec.contains(t)) return;
      if (t.dataset.open) return openClient(t.dataset.open);
      if (t.dataset.clear) return move(t.dataset.clear, null);
      if (t.dataset.move) return move(t.dataset.move, t.dataset.state);
    });
    // Drag is the "if possible" half of the ask. Everything it does is also
    // on a button, so nothing here is the only way to reach a bucket.
    var held = null;
    sec.addEventListener('dragstart', function (ev) {
      var c = ev.target.closest && ev.target.closest('.fup-card');
      if (!c) return;
      held = c.dataset.id;
      c.classList.add('dragging');
      try { ev.dataTransfer.setData('text/plain', held); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
    });
    sec.addEventListener('dragend', function () {
      held = null;
      Array.prototype.forEach.call(sec.querySelectorAll('.dragging,.over'),
        function (el) { el.classList.remove('dragging', 'over'); });
    });
    sec.addEventListener('dragover', function (ev) {
      var col = ev.target.closest && ev.target.closest('.fup-col');
      if (!col) return;
      ev.preventDefault();
      try { ev.dataTransfer.dropEffect = 'move'; } catch (e) {}
      col.classList.add('over');
    });
    sec.addEventListener('dragleave', function (ev) {
      var col = ev.target.closest && ev.target.closest('.fup-col');
      if (col && !col.contains(ev.relatedTarget)) col.classList.remove('over');
    });
    sec.addEventListener('drop', function (ev) {
      var col = ev.target.closest && ev.target.closest('.fup-col');
      if (!col) return;
      ev.preventDefault();
      col.classList.remove('over');
      var id = held;
      try { id = ev.dataTransfer.getData('text/plain') || held; } catch (e) {}
      if (id) move(id, col.dataset.state);
    });
  }

  function paint() {
    var home = document.getElementById('page-home');
    if (!home) return;
    var list = rows();
    var sec = document.getElementById('rd-s-fup');

    if (!list.length) { if (sec) sec.remove(); return; }

    if (!sec) {
      sec = document.createElement('div');
      sec.className = 'rd-sec';
      sec.id = 'rd-s-fup';
      sec.innerHTML = '<div class="rd-sec-h"><h3>Following up</h3>' +
        '<span class="lede">What you have sorted out of Client Pulse</span></div>' +
        '<div id="fup-body"></div>';
      // Under Needs attention: these are the ones already triaged, so they sit
      // below what has not been.
      var attn = document.getElementById('rd-s-attn');
      if (attn && attn.parentNode) attn.after(sec);
      else home.appendChild(sec);
      wire(sec);
    }
    var body = sec.querySelector('#fup-body');
    var next = html(list);
    if (body && body.dataset.sig !== next) { body.innerHTML = next; body.dataset.sig = next; }
  }

  function start() {
    paint();
    // The Hub repaints Home on its own cadence and after every save, and this
    // panel is cheap to diff, so it follows along rather than subscribing to
    // a lifecycle it does not own.
    setInterval(paint, 2500);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 900); });
  else setTimeout(start, 900);

  window.TributeFollowUps = { paint: paint, rows: rows, move: move, STATES: STATES };
})();
