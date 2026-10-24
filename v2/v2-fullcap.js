/* ═══════════════════════════════════════════════════════════════════════════
   FULL-CAPABILITY TEST MODE
   ═══════════════════════════════════════════════════════════════════════════
   For a very small list of testers, every connected V1 workflow is available
   in V2. What is NOT automatically available is external delivery: a
   community email reaching a community, a packet reaching a carrier, a text
   reaching a caregiver. Those are separate flags, default off.

   So this file's whole job is to tell the truth about that difference. It
   never changes what a workflow does; it changes what the screen says is
   going to happen at the end of it.

   Nothing here is shown to a normal pilot user.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const App = (window.TributeApp = window.TributeApp || {});

  const isFull = () => App.serverWrite && App.serverWrite.fullCapability === true;

  /* ── The indicator ─────────────────────────────────────────────────── */
  function mountBadge() {
    const old = document.getElementById('v2-fullcap');
    if (!isFull()) { if (old) old.remove(); return; }
    if (old) return;
    const b = document.createElement('div');
    b.id = 'v2-fullcap';
    b.className = 'v2-fullcap';
    const d = App.serverWrite.liveDelivery || {};
    const suppressed = ['community', 'ltcCarrier', 'ltcCaregiver'].filter(k => d[k] !== true).length;
    b.innerHTML = '<b>Full-capability test</b>' +
      (suppressed ? '<span>' + suppressed + ' external ' +
        (suppressed === 1 ? 'delivery' : 'deliveries') + ' suppressed</span>' : '<span>all deliveries live</span>');
    b.title = 'Every connected workflow is available. Open diagnostics for the capability inspector.';
    b.addEventListener('click', function () { App.showCapabilityInspector(); });
    document.body.appendChild(b);
  }

  /* ── Honest labels on the things that would otherwise claim to send ── */
  function relabelSend() {
    if (!isFull()) return;
    const suppressed = App.suppressCommunitySend && App.suppressCommunitySend();
    document.querySelectorAll('[data-ec-send]').forEach(function (btn) {
      if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
      const isReal = /onclick/i.test('') || /Outlook/i.test(btn.dataset.origLabel || '');
      if (!isReal) return;                       // the test-send button is honest already
      btn.textContent = suppressed ? 'Validate send →' : btn.dataset.origLabel;
      btn.title = suppressed
        ? 'Runs the whole send and stops before delivery. Nothing leaves Tribute.'
        : 'This will send a real email to the community.';
      let note = btn.parentNode.querySelector('.v2-suppressed-note');
      if (suppressed && !note) {
        note = document.createElement('div');
        note.className = 'v2-suppressed-note';
        note.textContent = 'External delivery is disabled in full-capability test mode.';
        btn.parentNode.appendChild(note);
      } else if (!suppressed && note) note.remove();
    });
  }

  /* ── The inspector ─────────────────────────────────────────────────── */
  const ROWS = [
    ['Quick Notes',          'csm_data_pocket',      null],
    ['To-dos / 1:1 / KPI',   'csm_data_pocket',      null],
    ['Client metadata',      'csm_data_pocket',      null],
    ['Touchpoints',          'csm_data_pocket',      null],
    ['Success in 30',        'csm_data_pocket',      null],
    ['Pulse acknowledgement','csm_data_pocket',      null],
    ['Coverage Notes',       'coverage_notes',       null],
    ['Fill Priority',        'fill_priority',        null],
    ['Community settings',   'community_settings',   null],
    ['Maryland cadence',     'md_cadence',           null],
    ['Community draft save', 'community_draft_save', null],
    ['Community test send',  'community_send_test',  'self'],
    ['Community real send',  'community_send_real',  'community'],
    ['Calendar add',         'graph_calendar_add',   null],
    ['Calendar delete',      'graph_calendar_delete',null],
    ['Viv visit create',     'viv_visit_create',     null],
    ['Viv visit cancel',     'viv_visit_cancel',     null],
    ['LTC approve',          'ltc_approve',          null],
    ['LTC mark sent',        'ltc_mark_sent',        null],
    ['LTC confirm',          'ltc_confirm',          null],
    ['LTC skip / note',      'ltc_note',             null],
    ['LTC carrier packet',   'ltc_send_carrier',     'ltcCarrier'],
    ['LTC caregiver text',   'ltc_nudge_caregiver',  'ltcCaregiver'],
    ['Weekly family email',  'weekly_schedule',      null]
  ];
  App.capabilityInspector = function () {
    const sw = App.serverWrite || {};
    const map = sw.capabilityMap || {};
    const d = sw.liveDelivery || {};
    return ROWS.map(function (r) {
      const [label, cap, delivery] = r;
      const page = App.writePolicy ? App.writePolicy()[cap] === true : null;
      const server = Object.prototype.hasOwnProperty.call(map, cap) ? map[cap] : null;
      const can = App.canWrite(cap);
      return {
        capability: label, key: cap,
        page: page, server: server, available: can,
        delivery: !delivery ? 'n/a'
                : delivery === 'self' ? 'to yourself'
                : (d[delivery] === true ? 'LIVE' : 'suppressed'),
        why: can ? '' : (App.writeBlockReason ? (App.writeBlockReason(cap) || '') : '')
      };
    });
  };
  App.showCapabilityInspector = function () {
    const rows = App.capabilityInspector();
    const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const yn = v => v === true ? 'yes' : v === false ? 'no' : '—';
    let el = document.getElementById('v2-capinsp');
    if (!el) { el = document.createElement('div'); el.id = 'v2-capinsp'; el.className = 'v2-capinsp'; document.body.appendChild(el); }
    el.innerHTML =
      '<div class="v2-capinsp-in"><div class="v2-capinsp-h"><b>Capability inspector</b>' +
      '<button type="button" aria-label="Close">×</button></div>' +
      '<p>Workflow availability and external delivery are separate. A suppressed row means the ' +
      'whole workflow runs and stops before anything leaves Tribute.</p>' +
      '<table><thead><tr><th>Capability</th><th>Page</th><th>Server</th><th>Available</th>' +
      '<th>Delivery</th><th>Why not</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="' + (r.available ? '' : 'off') + '"><td>' + esc(r.capability) + '</td><td>' +
          yn(r.page) + '</td><td>' + yn(r.server) + '</td><td><b>' + yn(r.available) + '</b></td><td>' +
          (r.delivery === 'LIVE' ? '<b class="live">LIVE</b>' : esc(r.delivery)) + '</td><td>' +
          esc(r.why) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    el.querySelector('button').addEventListener('click', function () { el.remove(); });
    el.addEventListener('click', function (e) { if (e.target === el) el.remove(); });
  };

  function tick() { mountBadge(); relabelSend(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick);
  else tick();
  const mo = new MutationObserver(function () { clearTimeout(window.__fcT); window.__fcT = setTimeout(tick, 300); });
  mo.observe(document.body, { childList: true, subtree: true });
  const old = App.onWriteConfig;
  App.onWriteConfig = function () { if (old) try { old(); } catch (e) {} tick(); };
})();
