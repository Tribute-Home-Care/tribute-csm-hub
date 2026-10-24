/* ═══════════════════════════════════════════════════════════════════════════
   GUIDE ILLUSTRATION
   ═══════════════════════════════════════════════════════════════════════════
   The same drawing language as the market cards: one 180×124 frame, warm
   graphite ink, masses that carry a fill, and exactly one orange element per
   drawing — the thing the role is actually looking at.

   These orient, they do not teach. The screenshots teach. So each one is a
   quiet architectural scene rather than a character, and none of them tries
   to depict a feature.
   ═══════════════════════════════════════════════════════════════════════════ */
window.GUIDE_ART = (function () {
  'use strict';
  const S = (inner, cls) =>
    '<svg viewBox="0 0 180 124" class="g-art ' + (cls || '') + '" aria-hidden="true" focusable="false">' + inner + '</svg>';

  return {
    /* CSM — one house, one lit window, one path to the door. The daily
       caseload is a street you walk down. */
    csm: S(
      '<g class="a-ctx"><path d="M12 108h156"/></g>' +
      '<path class="a-fill" d="M40 104V52l38-22 38 22v52Z"/>' +
      '<g class="a-1"><path d="M40 104V52l38-22 38 22v52"/><path d="M34 56 78 30l44 26"/>' +
      '<path d="M66 104V82h24v22"/><path d="M78 82v22"/></g>' +
      '<g class="a-2"><path d="M50 62h18v14H50zM88 62h18v14H88z"/></g>' +
      '<g class="a-lit"><rect x="50" y="62" width="18" height="14" rx="1.5"/></g>' +
      '<g class="a-ctx"><path d="M128 104V74M120 74h16l-3 14h-10Z"/></g>'),

    /* CSC — a row rather than a single house: the whole market at once. */
    csc: S(
      '<g class="a-ctx"><path d="M10 108h160"/></g>' +
      '<path class="a-fill" d="M24 104V62h34v42ZM66 104V46h40v58ZM114 104V70h40v34Z"/>' +
      '<g class="a-1"><path d="M24 104V62h34v42M66 104V46h40v58M114 104V70h40v34"/>' +
      '<path d="M20 62h42M62 46h48M110 70h48"/></g>' +
      '<g class="a-2"><path d="M32 72h8v10h-8zM42 72h8v10h-8zM32 88h8v10h-8z"/>' +
      '<path d="M74 56h10v12H74zM90 56h10v12H90zM74 76h10v12H74z"/>' +
      '<path d="M122 80h10v10h-10zM138 80h10v10h-10z"/></g>' +
      '<g class="a-lit"><rect x="90" y="76" width="10" height="12" rx="1.5"/></g>'),

    /* Manager — the same street seen from above: rows, and one that needs
       looking at. */
    manager: S(
      '<g class="a-ctx"><path d="M20 24h140M20 104h140"/></g>' +
      '<path class="a-fill" d="M20 34h140v14H20zM20 56h140v14H20zM20 78h140v14H20z"/>' +
      '<g class="a-1"><path d="M20 34h140v14H20zM20 56h140v14H20zM20 78h140v14H20z"/></g>' +
      '<g class="a-2"><path d="M30 39h26v4H30zM30 61h34v4H30zM30 83h22v4H30z"/>' +
      '<path d="M120 39h30v4h-30zM120 83h30v4h-30z"/></g>' +
      '<g class="a-lit"><rect x="116" y="58" width="38" height="10" rx="2"/></g>'),

    /* Multi-market — two places, one person, and the line between them. */
    multimarket: S(
      '<g class="a-ctx"><path d="M10 108h160"/><path d="M62 70h56" stroke-dasharray="4 5"/></g>' +
      '<path class="a-fill" d="M20 104V58l22-14 22 14v46ZM116 104V64l22-14 22 14v40Z"/>' +
      '<g class="a-1"><path d="M20 104V58l22-14 22 14v46M14 60 42 42l30 18"/>' +
      '<path d="M116 104V64l22-14 22 14v40M110 66l28-18 30 18"/></g>' +
      '<g class="a-2"><path d="M30 68h10v12H30zM46 68h10v12H46z"/>' +
      '<path d="M126 74h10v12h-10zM142 74h10v12h-10z"/></g>' +
      '<g class="a-lit"><rect x="46" y="68" width="10" height="12" rx="1.5"/></g>' +
      '<g class="a-ctx"><circle cx="90" cy="70" r="4"/></g>')
  };
})();
