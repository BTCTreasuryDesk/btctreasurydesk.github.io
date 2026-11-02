/* Macro backdrop (Home, under Market pulse): weekly macro snapshot from assets/data/macro.json (FRED + Farside; tools/update_macro.py).
   Only items not already live in Market pulse (SPX, NDX, DJI, 10Y yield, DXY, gold are there). Education only. */
(function () {
  'use strict';
  var box = document.querySelector('[data-mac]'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dl(d, long) { var t = new Date(d + 'T12:00:00Z'); return t.toLocaleDateString('en-US', long ? { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function days(d) { var n = Math.round((new Date(d + 'T12:00:00Z').getTime() - Date.now()) / 864e5); return n <= 0 ? 'today' : 'in ' + n + 'd'; }
  function paint(D) {
    var f = D.next_fomc;
    box.innerHTML = '<div class="p-h"><span class="p-t">Macro backdrop</span><span class="mac-sub">Rates, liquidity, inflation and ETF flows: what sits behind the price</span>' +
      (f ? '<a class="mac-fomc mono" href="' + esc(f.src && f.src.url || '#') + '" target="_blank" rel="noopener" title="' + esc(f.detail || '') + '">Next FOMC <b>' + esc(dl(f.date, 1)) + '</b> <span>' + days(f.date) + '</span></a>' : '') + '</div>' +
      '<ul class="mac-g">' + D.items.map(function (i) {
        var arr = i.dir === 'up' ? '▲ ' : i.dir === 'dn' ? '▼ ' : '';
        var cc = i.id === 'etf' ? ' ' + i.dir : '';
        return '<li class="mac-c"><a href="' + esc(i.src.url) + '" target="_blank" rel="noopener" title="' + esc(i.tip + ' Source: ' + i.src.name + ', ' + i.as_of + '.') + '">' +
          '<span class="mac-l"><b>' + esc(i.label) + '</b><i class="mono">' + esc(i.tk) + '</i></span>' +
          '<span class="mac-v mono">' + esc(i.value) + '</span>' +
          '<span class="mac-d mono' + cc + '">' + (i.chg ? arr + esc(i.chg) : '') + '</span>' +
          '<span class="mac-a mono">as of ' + esc(dl(i.as_of)) + '</span></a></li>';
      }).join('') + '</ul>' +
      '<p class="p-f">Weekly snapshot from FRED (St. Louis Fed) and Farside Investors, refreshed Sundays; tap a tile for its source. Stocks, 10Y yield, dollar and gold are live in Market pulse above. Education only, not investment advice.</p>';
  }
  fetch('/assets/data/macro.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).then(paint).catch(function () { box.hidden = true; });
})();
