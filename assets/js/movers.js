/* BTC Treasury Desk: Movers & Makers home card. Top 5 flagged treasury companies from assets/data/movers.json (tools/movers.py, weekly),
   each with a one-line 'why it stands out'. Descriptive only. Full ranked view + trend-shift alerts: Members Pro. */
(function () {
  'use strict';
  var box = document.querySelector('[data-movers]'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var IC = { move: '&#8597;', high: '&#9650;', low: '&#9660;', trend: '&#8605;', rs: '&#8644;', buy: '&#8383;' };
  function d(s) { return s ? new Date(s + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''; }
  fetch('/assets/data/movers.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (M) {
    var it = (M.items || []).slice(0, 5); if (!it.length) { box.hidden = true; return; }
    box.innerHTML = '<div class="p-h"><span class="p-t">Movers &amp; Makers</span><span class="tag">week to ' + esc(d(M.price_as_of || M.as_of)) + '</span><a class="more" href="/companies/">Board &rarr;</a></div>' +
      '<ol class="mv-l">' + it.map(function (x) { var k = x.flags[0].k, ch = x.w1 != null ? x.w1 : null;
        return '<li><span class="mv-ic mv-' + k + '" aria-hidden="true">' + (IC[k] || '•') + '</span><span class="mv-n"><b>' + esc(x.tk) + '</b> <small>#' + x.rank + ' ' + esc(x.name) + '</small></span>' +
          (ch != null ? '<span class="mv-c ' + (ch >= 0 ? 'up' : 'dn') + '">' + (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(1) + '% 1W</span>' : '<span class="mv-c"></span>') +
          '<span class="mv-w">' + esc(x.why) + (x.flags.length > 1 ? ' <small>· ' + esc(x.flags[1].t) + '</small>' : '') + '</span></li>'; }).join('') + '</ol>' +
      '<p class="p-f">Auto-flagged from the top 50 by BTC held: big 1W/1M moves, 52-week highs/lows, 200-day crosses, strength vs BTC, reported BTC additions. Updated Sundays. ' +
      '<a href="/members/">Full ranked list + trend-shift alerts: Members <span class="mv-pro">Pro</span></a>. <b>Descriptive only, not investment advice.</b></p>';
  }).catch(function () { box.hidden = true; });
})();
