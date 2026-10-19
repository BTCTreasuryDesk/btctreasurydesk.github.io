/* Tile detail: phone = tap a Markets tile (not its % or sparkline, which cycle the period) for a small sheet;
   desktop = hover card. Day high/low, volume vs 10-day average, 52-week range, extended hours / overnight token line.
   Source: CNBC quote service (may be delayed); tokens: xStocks via CoinGecko. Education only. */
(function () {
  'use strict';
  var F = window.BTD_FEED; if (!F) return;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches, card = null, ht = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var f2 = function (v) { return v == null || !isFinite(v) ? '\u2014' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: Math.abs(v) < 1 ? 4 : 2 }); };
  function html(k, t) { var q = F.get(k); if (!q || q.px == null) return ''; var nm = (t.querySelector('.mk-l') || t).textContent.trim(), R = [];
    var r = function (a, b, tip) { R.push('<div class="td-r"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span>' + a + '</span><b>' + b + '</b></div>'); };
    if (q.open != null) r('Open', f2(q.open)); if (q.prev != null) r('Prior close', f2(q.prev));
    if (q.hi != null && q.lo != null) r('Day low / high', f2(q.lo) + ' / ' + f2(q.hi));
    if (q.vol) r('Volume', esc(q.vol) + (q.rvol ? ' <small>(' + q.rvol.toFixed(1) + 'x 10-day avg)</small>' : ''), '10-day average ' + (q.avgv || '\u2014'));
    var w = ''; if (q.yh && q.yl && q.yh > q.yl) { var p = Math.max(0, Math.min(100, (q.px - q.yl) / (q.yh - q.yl) * 100)); r('52-week range', f2(q.yl) + ' \u2013 ' + f2(q.yh)); w = '<span class="w52 td-w"><i style="left:' + p.toFixed(1) + '%"></i></span><small class="td-m">' + Math.round(p) + '% of the way from the 52-week low to the high</small>'; }
    var x = F.xh ? F.xh(q) : '', ch = q.chp != null ? (q.chp >= 0 ? '+' : '\u2212') + Math.abs(q.chp).toFixed(2) + '%' : '';
    return '<div class="td-h"><b>' + esc(nm) + '</b><button type="button" class="td-x" data-td-x aria-label="Close">\u00d7</button></div><div class="td-p"><b>' + f2(q.px) + '</b> <span class="' + (q.chp >= 0 ? 'up' : 'dn') + '">' + ch + '</span></div>' + (x ? '<div class="td-xh">' + x + '</div>' : '') + w + R.join('') +
      (/^[A-Z]{1,6}$/.test(k) || k === '.SPX' || k === '.IXIC' ? '<button type="button" class="chip td-o" data-td-open="' + esc(k.replace(/^\./, '')) + '">Open in chart</button>' : '') + '<p class="td-s">Source: CNBC quote service (may be delayed).</p>'; }
  function close() { if (card) { card.remove(); card = null; } var bd = document.querySelector('.td-bd'); if (bd) bd.remove(); }
  function open(t, asSheet) { var k = t.getAttribute('data-mt'), h = html(k, t); if (!h) return; close(); card = document.createElement('div'); card.className = 'td ' + (asSheet ? 'td-sheet' : 'td-card'); card.setAttribute('role', 'dialog'); card.innerHTML = h;
    if (asSheet) { var bd = document.createElement('div'); bd.className = 'td-bd'; bd.addEventListener('click', close); document.body.appendChild(bd); document.body.appendChild(card); }
    else { document.body.appendChild(card); var r = t.getBoundingClientRect(), cw = 280; card.style.left = Math.max(8, Math.min(r.left + scrollX, innerWidth - cw - 12)) + 'px'; card.style.top = (r.bottom + scrollY + 6) + 'px'; } }
  document.addEventListener('click', function (e) { if (!e.target.closest) return;
    if (e.target.closest('[data-td-x]')) return close(); var o = e.target.closest('[data-td-open]'); if (o) { var s = o.dataset.tdOpen; close(); if (window.BTD_LC) window.BTD_LC.open(s === 'SPX' || s === 'IXIC' ? s : s); return; }
    if (fine) return; var t = e.target.closest('[data-mk] .mk-t[data-mt]'); if (!t || e.target.closest('button,a,[data-spk],[role="button"],.mk-c,.spk-b,select,input')) return; open(t, true); });
  if (fine) { document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('[data-mk] .mk-t[data-mt]'); clearTimeout(ht); if (!t) { if (card && !(e.target.closest && e.target.closest('.td-card'))) ht = setTimeout(close, 250); return; } ht = setTimeout(function () { open(t, false); }, 450); }); }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
