/* ═══════════════════════════════════════════════════════════════════════════
   CSM HUB V2 PREVIEW — identity, diagnostics, and the anomaly log
   ═══════════════════════════════════════════════════════════════════════════
   V2 should look like a real application and be unmistakably a pilot. So:
   a quiet mark beside the product name, not a development bar across the top.

   This file also carries the real-data observation the pilot exists for. The
   synthetic book could not produce a null where a string was promised, an
   unknown status, a join that finds nothing, or a 9-second endpoint. When
   production does, V2 shows a safe fallback AND records the condition —
   it never normalises an unknown state just to keep the screen tidy.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const App = (window.TributeApp = window.TributeApp || {});

  /* ── Anomalies ─────────────────────────────────────────────────────────
     Shapes, not contents. "md_compliance row 31 has no cid" is the finding;
     the client's name is not. */
  const anomalies = [];
  const seen = Object.create(null);
  App.anomalies = anomalies;

  App.noteAnomaly = function (kind, where, detail) {
    const key = kind + '|' + where + '|' + (detail || '');
    if (seen[key]) { seen[key].count++; return seen[key]; }
    const row = { at: new Date().toISOString(), kind: kind, where: where,
                  detail: String(detail || '').slice(0, 160), count: 1 };
    seen[key] = row;
    anomalies.push(row);
    try { console.warn('[V2 anomaly]', kind, '@', where, '-', row.detail); } catch (e) {}
    paint();
    return row;
  };

  /* ── Latency ─────────────────────────────────────────────────────────── */
  const timings = [];
  App.timings = timings;
  App.latencyReport = function () {
    const by = {};
    timings.forEach(function (t) {
      const b = by[t.endpoint] = by[t.endpoint] || { n: 0, total: 0, min: Infinity, max: 0, errors: 0, bytes: 0 };
      b.n++; b.total += t.ms; b.bytes += t.bytes || 0;
      if (t.ms < b.min) b.min = t.ms;
      if (t.ms > b.max) b.max = t.ms;
      if (t.error || (t.status && t.status >= 400)) b.errors++;
    });
    return Object.keys(by).sort().map(function (k) {
      const b = by[k];
      return { endpoint: k, calls: b.n, meanMs: Math.round(b.total / b.n),
               minMs: Math.round(b.min), maxMs: Math.round(b.max),
               errors: b.errors, approxKB: Math.round(b.bytes / 1024) };
    });
  };

  /* Wrap fetch for MEASUREMENT only — it forwards everything untouched and
     decides nothing. The write policy is a capability, not this. */
  function instrumentFetch() {
    if (window.__v2Instrumented) return;
    window.__v2Instrumented = true;
    const real = window.fetch.bind(window);
    window.fetch = function (url, opts) {
      const u = String((url && url.url) || url || '');
      const ep = (/[?&]endpoint=([a-z_]+)/.exec(u) || [])[1]
              || (/graph\.microsoft\.com\/v1\.0\/([a-zA-Z/]+)/.exec(u) || [])[1]
              || null;
      if (!ep) return real(url, opts);
      const t0 = performance.now();
      // A slow read must SAY it is slow. Found live: md_compliance took 67
      // seconds to rebuild while the page showed only "Loading Maryland…",
      // with no progress, no timeout and no way to tell a 67-second rebuild
      // from a dead endpoint. The request is not aborted — aborting a
      // legitimate rebuild would be worse — but it stops being silent.
      const slowTimer = setTimeout(function () {
        App.noteAnomaly('still-pending', ep, 'no response after 20s');
        banner(ep, 'slow');
      }, 20000);
      return real(url, opts).then(function (r) {
        clearTimeout(slowTimer);
        clearBanner(ep);
        const ms = performance.now() - t0;
        let bytes = 0;
        try { bytes = +(r.headers.get('content-length') || 0); } catch (e) {}
        timings.push({ endpoint: ep, ms: ms, status: r.status, bytes: bytes, at: Date.now() });
        if (!r.ok) {
          App.noteAnomaly('api-error', ep, 'HTTP ' + r.status);
          banner(ep, 'failed', r.status);
        } else if (ms > 8000) {
          App.noteAnomaly('slow-endpoint', ep, Math.round(ms) + 'ms');
        }
        // Inspect a CLONE so the application still gets an unread body.
        if (r.ok && /json/i.test(r.headers.get('content-type') || '')) {
          r.clone().json().then(function (j) {
            if (!bytes) {
              try { timings[timings.length - 1].bytes = JSON.stringify(j).length; } catch (e) {}
            }
            App.inspectPayload(ep, j);
          }).catch(function () {
            App.noteAnomaly('malformed-json', ep, 'content-type said JSON but the body did not parse');
          });
        }
        paint();
        return r;
      }, function (e) {
        clearTimeout(slowTimer);
        const ms = performance.now() - t0;
        timings.push({ endpoint: ep, ms: ms, error: true, at: Date.now() });
        App.noteAnomaly('api-failure', ep, String((e && e.message) || e).slice(0, 80));
        banner(ep, 'failed');
        paint();
        throw e;
      });
    };
  }

  /* ── Shape checks on live payloads ─────────────────────────────────────
     Run once per endpoint response. Deliberately conservative: it reports
     what is missing or unknown and changes nothing. */
  const ENUMS = {
    // Measured against production, not guessed: client_pulse returns exactly
    // needs_attention / monitor / status_quo. The first list here was invented
    // from the prototype and would have flagged 132 of 238 live clients as an
    // unknown enum on day one of the pilot.
    pulseTier: ['needs_attention', 'monitor', 'status_quo'],
    ltcState: ['not_started', 'approved', 'sent', 'confirmed', 'skipped'],
    mdStatus: ['ok', 'overdue', 'due soon', 'none on file', 'none'],
    // The real market vocabulary is thirteen strings, not three.
    market: ['Boston', 'MetroWest Boston', 'North of Boston', 'South of Boston',
             'Massachusetts', 'Baltimore', 'Annapolis', 'Bethesda', 'Maryland',
             'Chicago', 'Illinois', 'Northern New Jersey', 'Northern Virginia']
  };

  App.inspectPayload = function (ep, data) {
    try {
      if (!data || typeof data !== 'object') return;
      if (data.error) { App.noteAnomaly('endpoint-error-body', ep, String(data.error).slice(0, 80)); return; }

      if (ep === 'csm_hub') {
        const cl = data.clients || [];
        if (cl.length > 400) App.noteAnomaly('large-result', ep, cl.length + ' clients');
        let noId = 0, noName = 0, noMarket = 0;
        cl.forEach(function (c) {
          if (c.vivId == null) noId++;
          if (!c.name) noName++;
          if (!c.market) noMarket++;
        });
        if (noId) App.noteAnomaly('missing-field', ep + '.clients.vivId', noId + ' rows');
        if (noName) App.noteAnomaly('missing-field', ep + '.clients.name', noName + ' rows');
        if (noMarket) App.noteAnomaly('missing-field', ep + '.clients.market', noMarket + ' rows');
        const mk = {};
        cl.forEach(function (c) { if (c.market) mk[c.market] = (mk[c.market] || 0) + 1; });
        Object.keys(mk).forEach(function (m) {
          if (ENUMS.market.indexOf(m) < 0) {
            App.noteAnomaly('unknown-market', ep + '.clients.market', m + ' (' + mk[m] + ' clients)');
          }
        });
      }

      if (ep === 'client_pulse') {
        const by = data.byCid || {};
        Object.keys(by).forEach(function (cid) {
          const t = by[cid] && by[cid].tier;
          if (t && ENUMS.pulseTier.indexOf(t) < 0) App.noteAnomaly('unknown-enum', ep + '.tier', String(t));
          if (by[cid] && by[cid].headline == null) App.noteAnomaly('missing-field', ep + '.headline', 'cid present, headline null');
        });
      }

      if (ep === 'md_compliance') {
        (data.rows || []).forEach(function (r) {
          if (!r.cid) App.noteAnomaly('missing-field', ep + '.rows.cid', 'row has no client id');
          if (r.assessmentStatus && ENUMS.mdStatus.indexOf(r.assessmentStatus) < 0) {
            App.noteAnomaly('unknown-enum', ep + '.assessmentStatus', String(r.assessmentStatus));
          }
          if (r.lastAssessment && r.lastAssessment.date && !/^\d{4}-\d{2}-\d{2}/.test(r.lastAssessment.date)) {
            App.noteAnomaly('malformed-date', ep + '.lastAssessment.date', String(r.lastAssessment.date).slice(0, 24));
          }
        });
      }

      if (ep === 'ltc_board') {
        (data.rows || []).forEach(function (r) {
          const st = (r.submission || {}).state;
          if (st && ENUMS.ltcState.indexOf(st) < 0) App.noteAnomaly('unknown-enum', ep + '.submission.state', String(st));
          if (!r.vivId) App.noteAnomaly('failed-join', ep + '.vivId', 'LTC row with no Viv link');
          if (r.hours == null) App.noteAnomaly('missing-field', ep + '.hours', 'row has no hours');
          if (r.notesComplete == null) App.noteAnomaly('missing-field', ep + '.notesComplete', 'row has no note count');
        });
        if (data.counts && data.counts.unlinked) {
          App.noteAnomaly('failed-join', ep + '.counts.unlinked', data.counts.unlinked + ' records with no Viv link');
        }
      }

      // Stale-while-revalidate: the server may serve a snapshot past its TTL
      // while it refreshes behind the request. That is the right trade for a
      // 59-second rebuild, but the page must never present it as current.
      if (data._stale === true || data._staleServed === true) {
        const age = data._cachedAt
          ? Math.round((Date.now() - new Date(data._cachedAt).getTime()) / 60000) : null;
        App.noteAnomaly('serving-stale', ep,
          age != null ? ('snapshot is ' + age + ' min old; refreshing behind this request') : 'snapshot past TTL');
        banner(ep, 'stale', null, age);
      }

      if (ep === 'csm_data') {
        const d = data.data || data;
        const shared = d.shared || {};
        const comms = shared.communities || {};
        Object.keys(comms).forEach(function (nm) {
          if (!nm.trim()) App.noteAnomaly('malformed-key', 'communities', 'blank community name');
        });
      }
    } catch (e) {
      App.noteAnomaly('inspector-error', ep, String((e && e.message) || e).slice(0, 80));
    }
  };

  /* ── Visible failure ──────────────────────────────────────────────────
     The brief is explicit: V2 must fail visibly and specifically, and must
     never turn an API failure into "nothing to show". Production renders a
     bare page header when client_pulse fails; this says what happened. */
  const SOURCE_PAGE = {
    client_pulse: 'page-pulse', md_compliance: 'page-md', ltc_board: 'page-ltc',
    csm_hub: 'page-home', csm_comms: 'page-home', coc_tasks: 'page-home',
    csm_data: 'page-home', community_email: 'page-emailcomm'
  };
  const LABEL = {
    client_pulse: 'Client Pulse', md_compliance: 'Maryland Compliance',
    ltc_board: 'the LTC board', csm_hub: 'the Viv sync', csm_comms: 'communications',
    coc_tasks: 'change of condition', csm_data: 'the shared document',
    community_email: 'the community draft'
  };
  function banner(ep, state, status, ageMin) {
    const pageId = SOURCE_PAGE[ep];
    if (!pageId) return;
    const page = document.getElementById(pageId);
    if (!page) return;
    let el = page.querySelector('.v2-src-banner[data-ep="' + ep + '"]');
    if (!el) {
      el = document.createElement('div');
      el.className = 'v2-src-banner';
      el.setAttribute('data-ep', ep);
      const h = page.querySelector('.ph');
      if (h && h.nextSibling) page.insertBefore(el, h.nextSibling); else page.prepend(el);
    }
    el.className = 'v2-src-banner ' + state;
    if (state === 'stale') {
      el.textContent = 'Showing the last good ' + (LABEL[ep] || ep) +
        (ageMin != null ? ', from ' + ageMin + ' minutes ago' : '') +
        '. A refresh is running behind this page \u2014 reload shortly for current figures.';
      return;
    }
    el.textContent = state === 'slow'
      ? 'Still loading ' + (LABEL[ep] || ep) + ' \u2014 over 20 seconds so far. ' +
        'Nothing below is complete yet.'
      : 'Could not load ' + (LABEL[ep] || ep) +
        (status ? ' (HTTP ' + status + ')' : '') +
        '. This page is NOT showing an all-clear \u2014 it is showing nothing. Reload to try again.';
  }
  function clearBanner(ep) {
    document.querySelectorAll('.v2-src-banner[data-ep="' + ep + '"]').forEach(function (e) { e.remove(); });
  }
  App.sourceBanner = banner;

  /* ── The quiet mark ────────────────────────────────────────────────────
     A word beside the product name and a small status line. No banner. */
  function mount() {
    if (document.getElementById('v2-mark')) return;
    const brand = document.querySelector('.sb-brand');
    if (!brand) return;
    const m = document.createElement('div');
    m.id = 'v2-mark';
    m.innerHTML =
      '<span class="v2-tag">V2 Preview</span>' +
      '<span class="v2-state"><span id="v2-blocked-count">read-only</span>' +
      '<span class="v2-sep">·</span><span id="v2-anom">0 notes</span></span>';
    brand.appendChild(m);
    m.addEventListener('click', function () { App.showDiagnostics(); });
    paint();
  }

  function paint() {
    const b = document.getElementById('v2-blocked-count');
    if (b) b.textContent = (App.writeAttempts && App.writeAttempts.length)
      ? App.writeAttempts.length + ' blocked' : 'read-only';
    const a = document.getElementById('v2-anom');
    if (a) a.textContent = anomalies.length + (anomalies.length === 1 ? ' note' : ' notes');
  }

  App.showDiagnostics = function () {
    const wr = App.writeReport ? App.writeReport() : { blockedAttempts: 0, policyLeaks: 0 };
    const lat = App.latencyReport();
    const esc = function (s) {
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    const rows = function (list, cols) {
      if (!list.length) return '<p class="v2-none">Nothing recorded.</p>';
      return '<table class="v2-tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c[0]) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + list.map(function (r) {
          return '<tr>' + cols.map(function (c) { return '<td>' + esc(typeof c[1] === 'function' ? c[1](r) : r[c[1]]) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    };
    const html =
      '<h3>V2 Preview diagnostics</h3>' +
      '<p class="v2-lead"><b>Business / operational production writes: 0</b>. ' +
      'Blocked attempts: <b>' + wr.blockedAttempts + '</b>. ' +
      'Policy leaks: <b class="' + (wr.policyLeaks ? 'bad' : '') + '">' + wr.policyLeaks + '</b>.</p>' +
      '<p class="v2-lead v2-lead-fb">Pilot feedback submissions: <b>' +
      (wr.pilotFeedbackSubmissions || 0) + '</b> \u2014 stored in the pilot feedback container, ' +
      'not in any operational system.</p>' +
      '<h4>Endpoint latency</h4>' +
      rows(lat, [['Endpoint', 'endpoint'], ['Calls', 'calls'], ['Mean', function (r) { return r.meanMs + 'ms'; }],
                 ['Min', function (r) { return r.minMs + 'ms'; }], ['Max', function (r) { return r.maxMs + 'ms'; }],
                 ['Errors', 'errors'], ['~KB', 'approxKB']]) +
      '<h4>Blocked writes</h4>' +
      rows(App.writeAttempts || [], [['When', function (r) { return r.at.slice(11, 19); }],
                 ['User', 'user'], ['Feature', 'feature'], ['Endpoint', 'endpoint'], ['Op', 'operation'], ['By', 'blockedBy']]) +
      '<h4>Production data notes</h4>' +
      rows(anomalies, [['Kind', 'kind'], ['Where', 'where'], ['Detail', 'detail'], ['Seen', 'count']]);

    let el = document.getElementById('v2-diag');
    if (!el) {
      el = document.createElement('div');
      el.id = 'v2-diag';
      el.innerHTML = '<div class="v2-diag-box"><button class="v2-diag-x" aria-label="Close">×</button><div class="v2-diag-body"></div></div>';
      document.body.appendChild(el);
      el.addEventListener('click', function (e) {
        if (e.target === el || e.target.classList.contains('v2-diag-x')) el.classList.remove('open');
      });
    }
    el.querySelector('.v2-diag-body').innerHTML = html;
    el.classList.add('open');
  };

  /* One console line that answers the pilot's question. */
  App.pilotSummary = function () {
    return {
      environment: App.environment,
      user: (window.P && P.name) || '(not resolved)',
      profile: (window.P && P.id) || null,
      market: (window.P && P.market) || null,
      productionWrites: 0,
      blockedWriteAttempts: (App.writeAttempts || []).length,
      policyLeaks: App.writeReport ? App.writeReport().policyLeaks : 'n/a',
      anomalies: anomalies.length,
      latency: App.latencyReport()
    };
  };

  instrumentFetch();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  const t = setInterval(function () { mount(); paint(); }, 800);
  setTimeout(function () { clearInterval(t); }, 60000);
})();
