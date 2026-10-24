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
    const n = App.capabilityInspector().filter(r => r.mode === 'Suppressed').length;
    b.innerHTML = '<b>Full-capability test</b><span>' +
      (n ? n + ' consequential action' + (n === 1 ? '' : 's') + ' suppressed' : 'everything live') +
      '</span>';
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
  // mode: 'live' = a real production write happens.
  //       'suppressed' = the whole workflow runs and the final change does not.
  //       'unbuilt' = the feature does not exist.
  // 'consequential' rows become suppressed for a full-capability tester;
  // 'delivery' rows are suppressed by their own external-delivery flag.
  const ROWS = [
    ['Quick Notes',          'csm_data_pocket',      {}],
    ['To-dos / 1:1 / KPI',   'csm_data_pocket',      {}],
    ['Client metadata',      'csm_data_pocket',      {}],
    ['Touchpoints',          'csm_data_pocket',      {}],
    ['Success in 30',        'csm_data_pocket',      {}],
    ['Pulse acknowledgement','csm_data_pocket',      {}],
    ['Coverage Notes',       'coverage_notes',       {}],
    ['Fill Priority',        'fill_priority',        {}],
    ['Community settings',   'community_settings',   {}],
    ['Maryland cadence',     'md_cadence',           {}],
    ['Community draft save', 'community_draft_save', {}],
    ['Community test send',  'community_send_test',  { note: 'to yourself' }],
    ['Community real send',  'community_send_real',  { delivery: 'community' }],
    ['Calendar add',         'graph_calendar_add',   {}],
    ['Calendar delete',      'graph_calendar_delete',{}],
    ['Viv visit create',     'viv_visit_create',     { consequential: true }],
    ['Viv visit cancel',     'viv_visit_cancel',     { consequential: true }],
    ['LTC approve',          'ltc_approve',          { consequential: true }],
    ['LTC mark sent',        'ltc_mark_sent',        { consequential: true }],
    ['LTC confirm',          'ltc_confirm',          { consequential: true }],
    ['LTC skip / note',      'ltc_note',             { consequential: true }],
    ['LTC carrier packet',   'ltc_send_carrier',     { delivery: 'ltcCarrier' }],
    ['LTC caregiver text',   'ltc_nudge_caregiver',  { delivery: 'ltcCaregiver' }],
    ['Weekly family email',  'weekly_schedule',      { unbuilt: true }]
  ];
  App.capabilityInspector = function () {
    const sw = App.serverWrite || {};
    const map = sw.capabilityMap || {};
    const d = sw.liveDelivery || {};
    const suppressOps = sw.suppressConsequential === true;
    return ROWS.map(function (r) {
      const [label, cap, opt] = r;
      const page = App.writePolicy ? App.writePolicy()[cap] === true : null;
      const server = Object.prototype.hasOwnProperty.call(map, cap) ? map[cap] : null;
      const can = App.canWrite(cap);
      let mode;
      if (opt.unbuilt) mode = 'Unbuilt';
      else if (!can) mode = 'Unavailable';
      else if (opt.delivery) mode = d[opt.delivery] === true ? 'Live' : 'Suppressed';
      else if (opt.consequential && suppressOps) mode = 'Suppressed';
      else mode = 'Live';
      return {
        capability: label, key: cap,
        page: page, server: server,
        functional: opt.unbuilt ? false : can,
        available: can, mode: mode,
        detail: opt.note || '',
        why: can || opt.unbuilt ? '' : (App.writeBlockReason ? (App.writeBlockReason(cap) || '') : '')
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
      '<button type="button" aria-label="Close">\u00d7</button></div>' +
      '<p><b>Live</b> means a real production write happens. <b>Suppressed</b> means the whole ' +
      'workflow runs and the final change does not. <b>Unbuilt</b> means the feature does not exist. ' +
      'Normal pilot users do not see this, and their writes are not suppressed.</p>' +
      '<table><thead><tr><th>Capability</th><th>Page</th><th>Server</th><th>Functional</th>' +
      '<th>Mode</th><th>Note</th></tr></thead><tbody>' +
      rows.map(function (r) {
        const cls = r.mode === 'Live' ? 'live' : r.mode === 'Suppressed' ? 'supp'
                  : r.mode === 'Unbuilt' ? 'unbuilt' : 'off';
        return '<tr class="' + (r.functional ? '' : 'off') + '"><td>' + esc(r.capability) + '</td><td>' +
          yn(r.page) + '</td><td>' + yn(r.server) + '</td><td><b>' + yn(r.functional) + '</b></td><td>' +
          '<span class="m ' + cls + '">' + esc(r.mode) + '</span></td><td>' +
          esc(r.detail || r.why) + '</td></tr>';
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
