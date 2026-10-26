/* ===========================================================================
   SCRIBE REVIEW — professional documentation software, not a chat log
   ---------------------------------------------------------------------------
   Three sections inside the client workspace: what Scribe found, the proposed
   Care Plan changes, and the Visit Note draft. Section-by-section decisions,
   never one giant text box. Every proposal can show the sentence it came from.

   Nothing here writes to Viv. The CSM's decisions are recorded against the
   encounter so the review can be put down and picked up on another device.
   =========================================================================== */
(function () {
  'use strict';

  var A = function () { return window.TributeApp || {}; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var I = function (n) { return window.TributeIcons ? window.TributeIcons.svg(n) : ''; };

  var R = { client: null, enc: null, tab: 'summary', busy: false, err: null, open: false, cache: {} };

  function api() { var a = A(); return (typeof a.vivProxy === 'string' && a.vivProxy) || ''; }
  async function post(body) {
    var h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders(true) : {};
    h['Content-Type'] = 'application/json';
    var r = await fetch(api() + '?endpoint=scribe', { method: 'POST', headers: h, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || 'That change could not be saved.');
    return j;
  }
  async function get(q) {
    var h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders() : {};
    var r = await fetch(api() + '?endpoint=scribe&' + q, { headers: h });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || 'Scribe could not load that.');
    return j;
  }

  /* ── provenance, in words a person uses ───────────────────────────── */
  var SOURCE_LABEL = {
    initial_intake: 'Initial intake', home_assessment: 'Home assessment',
    home_visit_live: 'Home visit', home_visit_recap: 'Quick Recap',
    phone_call_family: 'Call with family', phone_call_client: 'Call with client',
    phone_call_caregiver: 'Call with caregiver', csm_recap: 'Quick Recap', other: 'Interaction'
  };
  var EVIDENCE_LABEL = {
    csm_observed: 'CSM observation', client_reported: 'Client reported',
    family_reported: 'Family reported', caregiver_reported: 'Caregiver reported',
    csm_recollection: 'CSM recollection', csm_clarification: 'CSM clarification'
  };
  function shortDate(d) {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }
  function provenance(enc, fact) {
    return [SOURCE_LABEL[enc.sourceType] || 'Interaction', shortDate(enc.occurredAt),
      fact ? (EVIDENCE_LABEL[fact.evidenceType] || '') : ''].filter(Boolean).join(' · ');
  }
  function factsFor(enc, ids) {
    var all = (enc.result && enc.result.facts) || [];
    return (ids || []).map(function (id) { return all.find(function (f) { return f.id === id; }); }).filter(Boolean);
  }

  /* ── shell ─────────────────────────────────────────────────────────── */
  function host() {
    var el = document.getElementById('scribe-review');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'scribe-review';
    el.innerHTML = '<div class="sc-scrim"></div><div class="sr-panel">' +
      '<div class="sr-top" id="sr-top"></div><div class="sr-body" id="sr-body"></div></div>';
    document.body.appendChild(el);
    el.querySelector('.sc-scrim').addEventListener('click', close);
    return el;
  }
  function close() {
    R.open = false;
    var el = document.getElementById('scribe-review');
    if (el) el.classList.remove('on');
    document.body.style.overflow = '';
    if (window.TributeRedesign && window.TributeRedesign.renderWorkspace) TributeRedesign.renderWorkspace();
  }
  async function open(client, encounterId) {
    R.client = client; R.open = true; R.tab = 'summary'; R.err = null;
    host().classList.add('on');
    document.body.style.overflow = 'hidden';
    paint('<div class="sc-busy"><div class="sc-spin"></div><h2>Opening the draft</h2></div>');
    try {
      R.enc = await get('cid=' + encodeURIComponent(client.vivId) + '&encounterId=' + encodeURIComponent(encounterId));
      render();
    } catch (e) { R.err = e.message; render(); }
  }
  function paint(html) { var b = $('#sr-body'); if (b) b.innerHTML = html; }

  function render() {
    var el = host(), enc = R.enc;
    var counts = summaryCounts();
    $('#sr-top').innerHTML =
      '<div class="sr-head"><button type="button" class="sr-x" data-a="close" aria-label="Close">' + I('close') + '</button>' +
      '<div><h2>Scribe</h2><p>' + esc((R.client || {}).name || '') +
      (enc ? ' · ' + esc(SOURCE_LABEL[enc.sourceType] || '') + ' · ' + esc(shortDate(enc.occurredAt)) : '') + '</p></div>' +
      '<span class="sr-draft">Draft</span></div>' +
      '<nav class="sr-tabs" role="tablist">' +
      [['summary', 'Summary', 0], ['careplan', 'Care Plan', counts.plan], ['note', 'Visit Note', counts.note]]
        .map(function (t) {
          return '<button type="button" role="tab" data-t="' + t[0] + '" aria-selected="' + (R.tab === t[0]) + '">' +
            esc(t[1]) + (t[2] ? '<em>' + t[2] + '</em>' : '') + '</button>';
        }).join('') + '</nav>';
    paint(R.err ? '<p class="sc-err">' + esc(R.err) + '</p>'
      : !enc ? ''
      : R.tab === 'summary' ? viewSummary()
      : R.tab === 'careplan' ? viewPlan() : viewNote());
    if (window.TributeIcons && window.TributeIcons.swap) window.TributeIcons.swap(el);
    $$('[data-t]', el).forEach(function (n) { n.addEventListener('click', function () { R.tab = n.dataset.t; render(); }); });
    $$('[data-a]', el).forEach(function (n) { n.addEventListener('click', action); });
    $$('.sr-src', el).forEach(function (n) {
      n.addEventListener('click', function () { n.nextElementSibling.hidden = !n.nextElementSibling.hidden; });
    });
  }

  function summaryCounts() {
    var r = (R.enc && R.enc.result) || {};
    // `review` is counted apart from `conf`. A possible inconsistency is not a
    // conflict and must never be totalled as one.
    return { plan: (r.carePlan && r.carePlan.sections || []).length,
      note: (r.visitNote && r.visitNote.fields || []).length,
      clar: (r.missingInformation || []).length, conf: (r.conflicts || []).length,
      review: (r.reviewItems || []).filter(function (x) { return x.status === 'needs_review'; }).length,
      fu: (r.followUps || []).length };
  }

  /* ── 1. what did Scribe find? ──────────────────────────────────────── */
  function viewSummary() {
    var enc = R.enc, r = enc.result || {}, c = summaryCounts();
    var mins = enc.source && enc.source.durationSec ? Math.round(enc.source.durationSec / 60) + ' min' : null;
    var out = '<section class="sr-sec"><h3>Interaction</h3>' +
      '<p class="sr-lede">' + esc(SOURCE_LABEL[enc.sourceType] || 'Interaction') + ' · ' +
      esc(shortDate(enc.occurredAt)) + (mins ? ' · ' + esc(mins) : '') +
      (enc.consent && enc.consent.status === 'agreed' ? ' · recorded with consent' : '') + '</p></section>';

    if ((r.keyFindings || []).length) out += '<section class="sr-sec"><h3>Key findings</h3><ul class="sr-ul">' +
      r.keyFindings.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></section>';

    out += '<section class="sr-sec"><h3>Documentation</h3><ul class="sr-ul">' +
      (c.plan ? '<li>' + c.plan + ' proposed Care Plan change' + (c.plan === 1 ? '' : 's') + '</li>' : '<li>No Care Plan change proposed</li>') +
      (c.note ? '<li>Visit Note drafted</li>' : '') +
      (c.conf ? '<li>' + c.conf + ' conflict' + (c.conf === 1 ? '' : 's') + ' to resolve</li>' : '') +
      (c.review ? '<li>' + c.review + ' possible inconsistenc' + (c.review === 1 ? 'y' : 'ies') + ' to review</li>' : '') +
      (c.clar ? '<li>' + c.clar + ' question' + (c.clar === 1 ? '' : 's') + ' for you</li>' : '') +
      '</ul></section>';

    if ((r.conflicts || []).length) out += '<section class="sr-sec"><h3>Conflicting evidence</h3>' +
      r.conflicts.map(function (cf, i) {
        return '<div class="sr-card warn"><h4>' + esc(cf.topic) + '</h4>' +
          '<p>' + esc(cf.description) + '</p>' +
          factsFor(enc, cf.factIds).map(function (f) {
            return '<p class="sr-quote"><span class="sr-prov">' + esc(EVIDENCE_LABEL[f.evidenceType] || '') +
              (f.speaker ? ' · ' + esc(f.speaker) : '') + '</span>“' + esc(f.evidenceExcerpt) + '”</p>';
          }).join('') +
          '<p class="sr-note">Scribe does not decide which is right.</p>' +
          '<div class="sr-row"><input class="fc" placeholder="How you want this recorded" value="' +
          esc(cf.resolution || '') + '" data-cf="' + esc(cf.id) + '">' +
          '<button type="button" class="btn btn-o btn-sm" data-a="conflict" data-id="' + esc(cf.id) + '">Save</button></div></div>';
      }).join('') + '</section>';

    /* Possible inconsistency. Calm, not clinical red — it is a thing to look
       at, not a finding. Deliberately worded so it cannot be read as an
       established disagreement, because Scribe could not establish one. */
    var ri = (r.reviewItems || []).filter(function (x) { return x.status !== 'dismissed'; });
    if (ri.length) out += '<section class="sr-sec"><h3>Needs review</h3>' +
      ri.map(function (x) {
        var facts = factsFor(enc, x.relatedFactIds);
        /* Two kinds live in this section. They read differently because they
           mean different things: one is a disagreement Scribe could not stand
           up, the other is wording Scribe refused to write. Neither is an
           alarm, so both keep the same calm card. */
        var clinical = x.type === 'unsupported_clinical_language';
        var head = clinical ? 'Wording removed' : 'Possible inconsistency';
        return '<div class="sr-card' + (x.status === 'clarified' ? ' done' : '') + '">' +
          '<h4>' + head + (x.about && x.about.length
            ? ' <span class="sr-sec-name">' + esc(x.about.join(', ').replace(/_/g, ' ')) + '</span>' : '') + '</h4>' +
          '<p>' + esc(x.message) + '</p>' +
          (x.reason ? '<p class="sr-note">' + (clinical ? 'Scribe left it out because '
             : 'Scribe could not substantiate it because ') + esc(x.reason) + '.</p>' : '') +
          /* No invalid source references: a removed clinical phrase has no
             surviving fact, and inventing a passage to point at would be the
             same mistake in a different place. */
          (facts.length ? sourceBlock(facts)
            : (clinical ? '' : '<p class="sr-note">No source passage survived checking.</p>')) +
          (x.status === 'clarified'
            ? '<p class="sr-answered">' + esc(x.note || '') + '<span class="sr-prov">Your clarification</span></p>'
            : '<div class="sr-row"><input class="fc" placeholder="Add a clarification (optional)" data-ri="' + esc(x.id) + '">' +
              '<button type="button" class="btn btn-o btn-sm" data-a="review-clarify" data-id="' + esc(x.id) + '">Save</button>' +
              '<button type="button" class="btn btn-o btn-sm" data-a="review-dismiss" data-id="' + esc(x.id) + '">Dismiss</button></div>') +
          '</div>';
      }).join('') + '</section>';

    if ((r.missingInformation || []).length) out += '<section class="sr-sec"><h3>Needs clarification</h3>' +
      r.missingInformation.map(function (m) {
        return '<div class="sr-card"><h4>' + esc(m.topic) + '</h4><p>' + esc(m.question) + '</p>' +
          (m.blocks ? '<p class="sr-note">Without this: ' + esc(m.blocks) + '</p>' : '') +
          (m.answer ? '<p class="sr-answered">' + esc(m.answer) + '<span class="sr-prov">Your clarification</span></p>'
            : '<div class="sr-row"><input class="fc" placeholder="Your answer" data-mi="' + esc(m.id) + '">' +
              '<button type="button" class="btn btn-o btn-sm" data-a="clarify" data-id="' + esc(m.id) + '">Save</button></div>') +
          '</div>';
      }).join('') + '</section>';

    if ((r.followUps || []).length) out += '<section class="sr-sec"><h3>Possible follow-ups</h3><ul class="sr-ul">' +
      r.followUps.map(function (f) { return '<li>' + esc(f.text) + '</li>'; }).join('') +
      '</ul><p class="sr-note">Scribe does not create tasks or message anyone. These are for you to act on.</p></section>';

    return out + finishRow();
  }

  /* ── 2. Care Plan, section by section ──────────────────────────────── */
  function viewPlan() {
    var enc = R.enc, secs = (enc.result && enc.result.carePlan && enc.result.carePlan.sections) || [];
    var mode = (enc.baseline || {}).mode;
    if (!secs.length) return '<div class="sr-empty"><p>Scribe found nothing that changes this client’s Care Plan.</p>' +
      '<p class="sr-note">That is a result, not a gap — most visits do not change a plan.</p></div>' + finishRow();
    var head = mode === 'create'
      ? '<p class="sr-lede">This client has no approved Care Plan. This is a <strong>preliminary draft</strong> built from what Scribe heard — an in-home assessment will still be needed to complete it.</p>'
      : '<p class="sr-lede">Only what changed. Everything else in the plan is untouched.</p>';
    return '<section class="sr-sec">' + head + secs.map(function (s, i) { return planCard(s, i); }).join('') + '</section>' + finishRow();
  }
  function planCard(s, i) {
    var enc = R.enc, facts = factsFor(enc, s.supportingFactIds);
    var st = s.reviewStatus || 'pending';
    return '<div class="sr-card plan ' + esc(st) + '" data-i="' + i + '">' +
      '<div class="sr-card-h"><h4>' + esc(s.fieldLabel) + '</h4>' +
      '<span class="sr-sec-name">' + esc(s.sectionTitle.replace(/\*\*/g, '')) + '</span>' +
      (st !== 'pending' ? '<span class="sr-state ' + esc(st) + '">' + esc(
        st === 'approved' ? 'Approved' : st === 'rejected' ? 'Keeping current' :
        st === 'edited' ? 'Edited' : 'Needs clarification') + '</span>' : '') + '</div>' +
      (s.currentText ? '<div class="sr-diff"><span class="k">Current</span><p>' + esc(s.currentText) + '</p></div>' : '') +
      '<div class="sr-diff new"><span class="k">Proposed</span>' +
      '<textarea class="fc sr-edit" data-i="' + i + '" rows="3">' + esc(s.csmText || s.proposedText) + '</textarea></div>' +
      (s.rationale ? '<p class="sr-why"><span class="k">Why</span> ' + esc(s.rationale) + '</p>' : '') +
      (s.blockedBy === 'possible_inconsistency'
        ? '<p class="sr-blocked">' + esc(s.blockedNote ||
            'This rests on information Scribe could not fully substantiate. Review the source first.') + '</p>' : '') +
      sourceBlock(facts) +
      '<div class="sr-acts">' +
      '<button type="button" class="btn btn-p btn-sm" data-a="plan" data-i="' + i + '" data-s="approved">Approve change</button>' +
      '<button type="button" class="btn btn-o btn-sm" data-a="plan" data-i="' + i + '" data-s="edited">Save my wording</button>' +
      '<button type="button" class="btn btn-o btn-sm" data-a="plan" data-i="' + i + '" data-s="rejected">Keep current</button>' +
      '</div></div>';
  }
  function sourceBlock(facts) {
    if (!facts.length) return '';
    return '<button type="button" class="sr-src">' + I('search') + 'View source</button>' +
      '<div class="sr-srcbox" hidden>' + facts.map(function (f) {
        return '<p class="sr-quote"><span class="sr-prov">' + esc(provenance(R.enc, f)) +
          (f.speaker ? ' · ' + esc(f.speaker) : '') + '</span>“' + esc(f.evidenceExcerpt) + '”</p>';
      }).join('') + '</div>';
  }

  /* ── 3. Visit Note ─────────────────────────────────────────────────── */
  function viewNote() {
    var enc = R.enc, fields = (enc.result && enc.result.visitNote && enc.result.visitNote.fields) || [];
    if (!fields.length) return '<div class="sr-empty"><p>No Visit Note was drafted from this source.</p></div>' + finishRow();
    return '<section class="sr-sec">' +
      '<p class="sr-lede">A record of this interaction. Separate from the Care Plan — things that belong here ' +
      'often do not belong in standing instructions for caregivers.</p>' +
      fields.map(function (f) {
        return '<div class="sr-card note"><div class="sr-card-h"><h4>' + esc(f.title) + '</h4>' +
          (f.reviewStatus === 'approved' ? '<span class="sr-state approved">Approved</span>' : '') + '</div>' +
          '<textarea class="fc sr-note-edit" data-k="' + esc(f.fieldKey) + '" rows="4">' +
          esc(f.csmText || f.draftText) + '</textarea>' +
          sourceBlock(factsFor(enc, f.supportingFactIds)) +
          '<div class="sr-acts">' +
          '<button type="button" class="btn btn-p btn-sm" data-a="note" data-k="' + esc(f.fieldKey) + '" data-s="approved">Approve</button>' +
          '<button type="button" class="btn btn-o btn-sm" data-a="note" data-k="' + esc(f.fieldKey) + '" data-s="edited">Save my wording</button>' +
          '</div></div>';
      }).join('') + '</section>' + finishRow();
  }

  function finishRow() {
    var enc = R.enc || {}, done = enc.reviewStatus === 'finalized';
    return '<footer class="sr-finish">' +
      (done ? '<p class="sr-done">Marked ready. Nothing has been written to Viv.</p>'
        : '<button type="button" class="btn btn-p" data-a="finalize">Mark ready for Viv</button>' +
          '<button type="button" class="btn btn-o" data-a="close">Finish later</button>') +
      '<p class="sr-note">Scribe never writes to Viv. A person puts this into the record.</p></footer>';
  }

  /* ── decisions ─────────────────────────────────────────────────────── */
  async function action(e) {
    var n = e.currentTarget, a = n.dataset.a;
    if (a === 'close') return close();
    if (R.busy) return;
    R.busy = true;
    try {
      var base = { op: 'review', clientVivId: R.client.vivId, encounterId: R.enc.id };
      if (a === 'plan') {
        var i = Number(n.dataset.i);
        var ta = $('.sr-edit[data-i="' + i + '"]');
        await post(Object.assign(base, { decision: { kind: 'carePlan', index: i,
          status: n.dataset.s, text: ta ? ta.value : undefined } }));
      } else if (a === 'note') {
        var k = n.dataset.k, tb = $('.sr-note-edit[data-k="' + k + '"]');
        await post(Object.assign(base, { decision: { kind: 'visitNote', fieldKey: k,
          status: n.dataset.s, text: tb ? tb.value : undefined } }));
      } else if (a === 'clarify') {
        var mi = $('[data-mi="' + n.dataset.id + '"]');
        await post(Object.assign(base, { decision: { kind: 'clarification', id: n.dataset.id,
          answer: mi ? mi.value : '' } }));
      } else if (a === 'review-clarify' || a === 'review-dismiss') {
        var ri2 = $('[data-ri="' + n.dataset.id + '"]');
        var note = ri2 ? ri2.value.trim() : '';
        await post(Object.assign(base, { decision: { kind: 'reviewItem', id: n.dataset.id,
          status: (a === 'review-dismiss' || !note) ? (a === 'review-dismiss' ? 'dismissed' : 'needs_review') : 'clarified',
          note: note } }));
      } else if (a === 'conflict') {
        var cf = $('[data-cf="' + n.dataset.id + '"]');
        await post(Object.assign(base, { decision: { kind: 'conflict', id: n.dataset.id,
          resolution: cf ? cf.value : '', status: 'approved' } }));
      } else if (a === 'finalize') {
        await post(Object.assign(base, { decision: { kind: 'encounter', status: 'finalized' } }));
      }
      R.enc = await get('cid=' + encodeURIComponent(R.client.vivId) + '&encounterId=' + encodeURIComponent(R.enc.id));
      R.err = null;
    } catch (ex) { R.err = ex.message; }
    R.busy = false;
    render();
  }

  /* ── encounters for the client workspace ───────────────────────────── */
  async function listFor(client) {
    if (!client || !client.vivId) return [];
    if (R.cache[client.vivId]) return R.cache[client.vivId];
    try {
      var j = await get('cid=' + encodeURIComponent(client.vivId));
      R.cache[client.vivId] = j.encounters || [];
      window.dispatchEvent(new CustomEvent('tribute:scribe-list', { detail: { cid: client.vivId } }));
      return R.cache[client.vivId];
    } catch (e) { return []; }
  }

  window.TributeScribeReview = {
    open: open, close: close, listFor: listFor,
    cached: function (cid) { return R.cache[cid] || null; },
    invalidate: function () { R.cache = {}; },
    sourceLabel: function (t) { return SOURCE_LABEL[t] || 'Interaction'; }
  };
})();
