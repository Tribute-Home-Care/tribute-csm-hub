/* ===========================================================================
   SCRIBE — the CSM's documentation assistant
   ---------------------------------------------------------------------------
   "Stay present. We'll help you remember the details."

   This is a product, not a chat window. There is no prompt box, no "Generate",
   no assistant persona. A CSM thinks "I am documenting this visit", taps one
   thing, and later reviews what Scribe drafted. The AI is machinery, not the
   interface.

   Everything that matters happens on the server (endpoint=scribe): the
   encounter, the transcript, the extraction, the draft and the review state.
   This file captures, shows and records decisions. It stores nothing itself —
   no transcript in localStorage, no clinical text in a URL — so a CSM can
   start on a phone in someone's hallway and finish at a desk an hour later.
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

  /* ── state ─────────────────────────────────────────────────────────────
     Capture state only. The encounter itself lives on the server from the
     moment it starts, which is what makes "save for later" and picking it up
     on another device work without a second store. */
  var S = {
    open: false, step: null, client: null, encounterId: null, baseline: null,
    sourceType: null, rec: null, chunks: [], startedAt: 0, timer: null,
    paused: false, busy: false, error: null, review: null, tab: 'summary'
  };

  function api() { var a = A(); return (typeof a.vivProxy === 'string' && a.vivProxy) || ''; }
  async function call(body) {
    var h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders(true) : {};
    h['Content-Type'] = 'application/json';
    var r = await fetch(api() + '?endpoint=scribe', { method: 'POST', headers: h, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || ('Scribe could not complete that (' + r.status + ').'));
    return j;
  }
  async function read(q) {
    var h = (typeof window.dataHeaders === 'function') ? await window.dataHeaders() : {};
    var r = await fetch(api() + '?endpoint=scribe&' + q, { headers: h });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || 'Scribe could not load that.');
    return j;
  }

  /* ── the sheet ─────────────────────────────────────────────────────── */
  function host() {
    var el = document.getElementById('scribe');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'scribe';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Scribe');
    el.innerHTML = '<div class="sc-scrim"></div><div class="sc-sheet"><div class="sc-body" id="sc-body"></div></div>';
    document.body.appendChild(el);
    el.querySelector('.sc-scrim').addEventListener('click', function () {
      // Never close out from under a live recording by accident.
      if (S.rec && S.rec.state === 'recording') return;
      close();
    });
    return el;
  }
  function open(client) {
    S.open = true; S.client = client; S.error = null; S.step = 'choose';
    S.encounterId = null; S.baseline = null; S.sourceType = null; S.review = null;
    host().classList.add('on');
    document.body.style.overflow = 'hidden';
    render();
  }
  function close() {
    S.open = false;
    var el = document.getElementById('scribe');
    if (el) el.classList.remove('on');
    document.body.style.overflow = '';
  }

  function head(title, sub) {
    return '<header class="sc-head"><h2>' + esc(title) + '</h2>' +
      (sub ? '<p>' + esc(sub) + '</p>' : '') +
      '<button type="button" class="sc-x" data-act="close" aria-label="Close">' + I('close') + '</button></header>';
  }
  function err() {
    return S.error ? '<p class="sc-err">' + esc(S.error) + '</p>' : '';
  }

  /* ── 1. how would you like to document this? ───────────────────────── */
  function viewChoose() {
    var c = S.client || {};
    return head('How would you like to document this interaction?', c.name || '') + err() +
      '<div class="sc-opts">' +
      '<button type="button" class="sc-opt" data-act="live">' +
        '<span class="sc-opt-i">' + I('mic') + '</span>' +
        '<span class="sc-opt-t">Live Scribe</span>' +
        '<span class="sc-opt-d">Record the conversation while you meet. Needs the client’s agreement.</span></button>' +
      '<button type="button" class="sc-opt" data-act="recap">' +
        '<span class="sc-opt-i">' + I('conversation') + '</span>' +
        '<span class="sc-opt-t">Quick Recap</span>' +
        '<span class="sc-opt-d">Tell Scribe what happened, afterwards. A minute or two is plenty.</span></button>' +
      '<button type="button" class="sc-opt soon" disabled aria-disabled="true">' +
        '<span class="sc-opt-i">' + I('phone') + '</span>' +
        '<span class="sc-opt-t">Call Scribe <em>Soon</em></span>' +
        '<span class="sc-opt-d">Recorded calls will arrive here on their own.</span></button>' +
      '</div>' +
      '<p class="sc-foot">Scribe drafts documentation for you to review. Nothing is saved to Viv.</p>';
  }

  /* ── 2. consent ────────────────────────────────────────────────────── */
  function viewConsent() {
    return head('Before you start recording', 'Say something like this, in your own words.') + err() +
      '<blockquote class="sc-say">I use a secure scribe that helps me remember the details of our conversation ' +
      'so I can give you my full attention instead of taking notes the whole time. ' +
      'It helps me make sure I don’t miss anything important.</blockquote>' +
      '<p class="sc-ask">Is that okay with you?</p>' +
      '<div class="sc-acts">' +
      '<button type="button" class="btn btn-p" data-act="agreed">Client agreed</button>' +
      '<button type="button" class="btn btn-o" data-act="declined">Client declined</button>' +
      '<button type="button" class="btn btn-o" data-act="close">Cancel</button></div>' +
      '<p class="sc-foot">Scribe records who agreed and when. Recording does not start until you tap.</p>';
  }
  function viewDeclined() {
    return head('That’s fine', 'You can still capture this visit.') +
      '<p class="sc-p">The client didn’t want to be recorded, so Scribe won’t listen. ' +
      'Tell it what happened afterwards instead — it works the same way from there.</p>' +
      '<div class="sc-acts">' +
      '<button type="button" class="btn btn-p" data-act="recap">Record a recap after the visit</button>' +
      '<button type="button" class="btn btn-o" data-act="close">Not now</button></div>';
  }

  /* ── 3. recording ──────────────────────────────────────────────────── */
  function clock() {
    var s = Math.floor((Date.now() - S.startedAt) / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function viewRecording() {
    var c = S.client || {};
    return '<div class="sc-rec">' +
      '<div class="sc-rec-dot" aria-hidden="true"></div>' +
      '<h2>Scribe is listening</h2>' +
      '<p class="sc-rec-who">' + esc(c.name || '') + '</p>' +
      '<div class="sc-rec-t" id="sc-clock">' + clock() + '</div>' +
      (S.paused ? '<p class="sc-rec-paused">Paused</p>' : '') +
      '<div class="sc-acts col">' +
      '<button type="button" class="btn btn-p sc-finish" data-act="finish">Finish &amp; Create Documentation</button>' +
      '<button type="button" class="btn btn-o" data-act="pause">' + (S.paused ? 'Resume' : 'Pause') + '</button>' +
      '</div>' +
      '<p class="sc-foot">You can leave this screen. Scribe keeps listening and says so at the top until you finish.</p>' +
      '</div>';
  }

  /* ── 4. quick recap ────────────────────────────────────────────────── */
  function viewRecap() {
    return head('Quick Recap', 'Tell Scribe what happened.') + err() +
      '<p class="sc-p">Mention anything that changed about the client’s condition, concerns raised, ' +
      'care needs, schedule changes, or follow-up needed.</p>' +
      '<textarea id="sc-recap" class="fc" rows="8" placeholder="Tap the microphone on your keyboard and just talk.">' +
        esc(S.recapText || '') + '</textarea>' +
      '<div class="sc-acts">' +
      '<button type="button" class="btn btn-p" data-act="recap-done">Create Documentation</button>' +
      // NOT "Save for later". Nothing is saved: no encounter exists until
      // Create Documentation is tapped, so this only closes the panel. The
      // text is held in this tab and restored if you reopen Scribe, and the
      // browser warns before a reload would lose it - but a button that
      // promises a save that does not happen is worse than no button.
      '<button type="button" class="btn btn-o" data-act="close">Finish later</button></div>' +
      '<p class="sc-foot">Scribe records this as your recollection after the visit, not as the conversation itself. ' +
      'Finish later keeps what you have typed until you close the Hub; nothing is saved to the client until you tap Create Documentation.</p>';
  }

  /* Honest about what happened, and it does not throw the recording away.
     "Could not be sent" is the truth; "could not be used" was not, because
     the audio is still sitting right here. */
  function viewRecFail() {
    var mins = S.dur ? Math.max(1, Math.round(S.dur / 60)) : null;
    return head('That did not send', 'Your recording is safe.') + err() +
      '<p class="sc-p">Scribe could not send ' + (mins ? ('your ' + mins + '-minute recording') : 'the recording') +
      ' for transcription. It is still held on this device. Try again when you have a better signal, ' +
      'or type a recap instead and the recording will be discarded.</p>' +
      '<div class="sc-acts">' +
      '<button type="button" class="btn btn-p" data-act="retry-audio">Try sending again</button>' +
      '<button type="button" class="btn btn-o" data-act="recap">Type a recap instead</button></div>' +
      '<p class="sc-foot">Closing Scribe now will lose the recording. Nothing has been documented yet.</p>';
  }

  function viewBusy(msg) {
    return '<div class="sc-busy"><div class="sc-spin" aria-hidden="true"></div>' +
      '<h2>' + esc(msg) + '</h2><p>This usually takes under a minute.</p></div>';
  }
  function viewDone(counts) {
    var c = counts || {};
    var line = function (n, one, many) { return n ? ('<li>' + n + ' ' + (n === 1 ? one : many) + '</li>') : ''; };
    return head('Scribe has a draft ready', (S.client || {}).name || '') +
      '<ul class="sc-done">' +
      line(c.carePlan, 'proposed care plan change', 'proposed care plan changes') +
      (c.visitNote ? '<li>Visit note drafted</li>' : '') +
      line(c.conflicts, 'conflict to resolve', 'conflicts to resolve') +
      line(c.clarifications, 'question for you', 'questions for you') +
      line(c.followUps, 'possible follow-up', 'possible follow-ups') +
      '</ul>' +
      '<div class="sc-acts">' +
      '<button type="button" class="btn btn-p" data-act="review">Review now</button>' +
      '<button type="button" class="btn btn-o" data-act="close">Finish later</button></div>' +
      '<p class="sc-foot">Nothing is saved to Viv. Your draft is waiting whenever you come back, on any device.</p>';
  }

  function render() {
    var el = host(), b = el.querySelector('#sc-body');
    var v = S.step === 'choose' ? viewChoose()
          : S.step === 'consent' ? viewConsent()
          : S.step === 'declined' ? viewDeclined()
          : S.step === 'recording' ? viewRecording()
          : S.step === 'recfail' ? viewRecFail()
          : S.step === 'recap' ? viewRecap()
          : S.step === 'transcribing' ? viewBusy('Writing down what was said')
          : S.step === 'processing' ? viewBusy('Scribe is reading the conversation')
          : S.step === 'done' ? viewDone(S.counts)
          : viewChoose();
    b.innerHTML = v;
    if (window.TributeIcons && window.TributeIcons.swap) window.TributeIcons.swap(b);
    $$('[data-act]', b).forEach(function (n) { n.addEventListener('click', act); });
    var ta = $('#sc-recap', b); if (ta) ta.focus();
  }

  /* ── actions ───────────────────────────────────────────────────────── */
  async function act(e) {
    var a = e.currentTarget.dataset.act;
    if (S.busy && a !== 'close') return;
    try {
      if (a === 'close') return close();
      if (a === 'live') { S.sourceType = 'home_visit_live'; S.step = 'consent'; return render(); }
      if (a === 'declined') { S.step = 'declined'; return render(); }
      if (a === 'recap') { S.sourceType = 'home_visit_recap'; S.blob = null; S.step = 'recap'; S.error = null; return render(); }
      if (a === 'retry-audio') return sendAudio();
      if (a === 'agreed') return startLive();
      if (a === 'pause') return pause();
      if (a === 'finish') return finish();
      if (a === 'recap-done') return recapDone();
      if (a === 'review') { close(); openReview(S.encounterId); return; }
    } catch (ex) {
      S.busy = false; S.error = ex.message || 'Something went wrong.'; render();
    }
  }

  async function startEncounter(sourceType, consentStatus) {
    var j = await call({ op: 'start', clientVivId: (S.client || {}).vivId,
      sourceType: sourceType, consentStatus: consentStatus,
      csmName: ((A().profile || {}).name) || null });
    S.encounterId = j.encounterId; S.baseline = j.baseline; S.sourceType = sourceType;
    return j;
  }

  async function startLive() {
    S.busy = true; S.error = null;
    try {
      if (!navigator.mediaDevices || !window.MediaRecorder)
        throw new Error('This browser cannot record audio. Use Quick Recap instead.');
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // If the encounter cannot be created, release the microphone. Without
      // this the iOS recording indicator stays lit with nothing recording,
      // which is both alarming and a lie about what is happening.
      try { await startEncounter('home_visit_live', 'agreed'); }
      catch (e) {
        try { (stream.getTracks() || []).forEach(function (t) { t.stop(); }); } catch (e2) {}
        throw e;
      }
      S.chunks = [];
      S.rec = new MediaRecorder(stream);
      S.rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) S.chunks.push(ev.data); };
      S.rec.start(1000);
      S.startedAt = Date.now(); S.paused = false; S.step = 'recording'; S.busy = false;
      render(); tick(); bar();
    } catch (ex) {
      S.busy = false;
      S.error = /denied|NotAllowed/i.test(ex.name + ex.message)
        ? 'The microphone is blocked for this site. Allow it in Safari settings, or use Quick Recap.'
        : (ex.message || 'Recording could not start.');
      S.step = 'consent'; render();
    }
  }
  function pause() {
    if (!S.rec) return;
    if (S.rec.state === 'recording') { S.rec.pause(); S.paused = true; }
    else { S.rec.resume(); S.paused = false; }
    render(); bar();
  }
  function tick() {
    clearInterval(S.timer);
    S.timer = setInterval(function () {
      var c = $('#sc-clock'); if (c && !S.paused) c.textContent = clock();
      var bc = $('#sc-bar-t'); if (bc && !S.paused) bc.textContent = clock();
      if (!S.rec || S.rec.state === 'inactive') clearInterval(S.timer);
    }, 1000);
  }

  /* A recording the CSM has walked away from must still be obvious. This bar
     is fixed, loud and present on every page until they finish. */
  function bar() {
    var b = document.getElementById('sc-bar');
    var live = S.rec && S.rec.state !== 'inactive';
    if (!live) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.id = 'sc-bar';
      document.body.appendChild(b);
    }
    b.innerHTML = '<span class="sc-bar-dot" aria-hidden="true"></span>' +
      '<span class="sc-bar-x">Scribe is still recording ' + esc(((S.client || {}).name || 'this visit')) +
      '<em id="sc-bar-t">' + clock() + '</em></span>' +
      '<button type="button" class="sc-bar-b" data-b="open">Return to Scribe</button>' +
      '<button type="button" class="sc-bar-b p" data-b="fin">Finish Recording</button>';
    $$('[data-b]', b).forEach(function (n) {
      n.addEventListener('click', function () {
        if (n.dataset.b === 'open') { S.step = 'recording'; host().classList.add('on'); S.open = true; render(); }
        else finish();
      });
    });
  }

  async function finish() {
    if (!S.rec) return;
    S.busy = true; S.step = 'transcribing'; render();
    var stopped = new Promise(function (res) { S.rec.onstop = res; });
    try { S.rec.stop(); } catch (e) {}
    try { (S.rec.stream.getTracks() || []).forEach(function (t) { t.stop(); }); } catch (e) {}
    await stopped;
    clearInterval(S.timer);
    var dur = Math.round((Date.now() - S.startedAt) / 1000);
    var blob = new Blob(S.chunks, { type: (S.rec.mimeType || 'audio/webm') });
    S.rec = null; S.chunks = []; bar();
    // HOLD THE AUDIO. It used to be dropped the moment the upload was
    // attempted, so one flaky minute of signal threw away a whole visit and
    // the only way forward was to retype it from memory. It stays in memory
    // until the transcript is safely on the server.
    S.blob = blob; S.dur = dur;
    await sendAudio();
  }

  /* Upload and transcribe whatever is in S.blob. Separate so the failure
     state can offer a real retry rather than only a retype. */
  async function sendAudio() {
    S.busy = true; S.error = null; S.step = 'transcribing'; render();
    try {
      var b64 = await toBase64(S.blob);
      await call({ op: 'transcribe', clientVivId: S.client.vivId, encounterId: S.encounterId,
        audioBase64: b64, mimeType: S.blob.type, durationSec: S.dur });
      S.blob = null;            // the transcript is saved; the audio is not kept
      await process();
    } catch (ex) {
      S.busy = false;
      S.error = ex.message + ' Nothing has been lost — your recording is still here.';
      S.step = 'recfail'; render();
    }
  }
  function toBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1] || ''); };
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }

  async function recapDone() {
    var t = ($('#sc-recap') || {}).value || '';
    // Remember it before anything can fail. A dictated recap is the CSM's
    // own words and the only copy there is; re-rendering this view used to
    // hand back an empty box.
    S.recapText = t;
    if (!t.trim()) { S.error = 'Tell Scribe what happened first.'; return render(); }
    S.busy = true; S.step = 'processing'; render();
    try {
      if (!S.encounterId) await startEncounter('home_visit_recap', 'not_applicable');
      await call({ op: 'source', clientVivId: S.client.vivId, encounterId: S.encounterId, text: t, kind: 'text' });
      await process();
    } catch (ex) { S.busy = false; S.error = ex.message; S.step = 'recap'; render(); }
  }

  async function process() {
    S.step = 'processing'; render();
    var j = await call({ op: 'process', clientVivId: S.client.vivId, encounterId: S.encounterId });
    S.counts = j.counts; S.busy = false; S.step = 'done';
    S.recapText = null; S.blob = null;     // safely on the server now
    render();
    if (window.TributeScribeReview) window.TributeScribeReview.invalidate();
  }

  function openReview(eid) {
    if (window.TributeScribeReview) window.TributeScribeReview.open(S.client, eid);
  }

  /* Leaving the page mid-recording would lose it silently. */
  window.addEventListener('beforeunload', function (e) {
    // Also guard an unsent recording and an untyped recap. Both live only in
    // this tab, so a reload is the one way left to lose them.
    var holding = (S.rec && S.rec.state !== 'inactive') || !!S.blob ||
                  !!(S.recapText && S.recapText.trim());
    if (holding) { e.preventDefault(); e.returnValue = ''; }
  });

  window.TributeScribe = {
    open: open, close: close,
    isRecording: function () { return !!(S.rec && S.rec.state !== 'inactive'); },
    encounterId: function () { return S.encounterId; }
  };
})();
