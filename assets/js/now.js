/* 'What matters now': one short, session-aware line at the top of the hero. Real data only:
   BTC (Coinbase), MSTR (CNBC quote: close / extended hours), MSTRx token (xStocks via CoinGecko), next date from keydates.json. Education only. */
(function () {
  'use strict';
  var F = window.BTD_FEED, box = document.querySelector('.p-live'); if (!F || !box) return;
  var el = document.createElement('p'); el.className = 'now'; el.setAttribute('data-now', ''); el.hidden = true; box.insertBefore(el, box.firstChild);
  var KD = null; fetch('/assets/data/keydates.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { KD = j && j.items || []; paint(); }).catch(function () {});
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pc = function (v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(1) + '%'; };
  var cl = function (v) { return v > 0 ? 'up' : v < 0 ? 'dn' : ''; };
  var usd = function (v) { return '$' + v.toLocaleString('en-US', { maximumFractionDigits: v >= 1000 ? 0 : 2, minimumFractionDigits: v >= 1000 ? 0 : 2 }); };
  function etDay() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
  function paint() { var s = F.session(), b = F.get('BTC'), m = F.get('MSTR'), tk = F.g && F.g.tok && F.g.tok.MSTR, P = [];
    var lab = { open: 'Market open', pre: 'Pre-market', post: 'After hours', closed: 'Market closed' }[s] || 'Market closed';
    P.push('<b class="now-s now-' + s + '">' + lab + '</b>');
    if (b && b.px != null) P.push('<span title="BTC-USD, Coinbase live; change over 24h">BTC ' + usd(b.px) + (b.chp != null ? ' <i class="' + cl(b.chp) + '">' + pc(b.chp) + ' 24h</i>' : '') + '</span>');
    if (m && m.px != null) { var day = m.lt ? new Date(m.lt + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }) : '';
      if (s === 'open') P.push('<span title="MSTR, CNBC quote service (may be delayed)">MSTR ' + usd(m.px) + (m.chp != null ? ' <i class="' + cl(m.chp) + '">' + pc(m.chp) + '</i>' : '') + '</span>');
      else if (m.ext && m.ext.px != null && (s === 'pre' || s === 'post')) P.push('<span title="MSTR extended-hours last trade vs regular close, CNBC quote service">MSTR ' + (s === 'pre' ? 'pre-mkt ' : 'AH ') + usd(m.ext.px) + ' <i class="' + cl(m.ext.chp) + '">' + pc(m.ext.chp) + ' vs close</i></span>');
      else if (tk && tk.px && Date.now() - (tk.t || 0) < 6 * 3600e3) { var im = (tk.px / m.px - 1) * 100; P.push('<span title="MSTRx token (xStocks via CoinGecko, trades 24/7) vs MSTR\'s ' + esc(day) + ' close. Thin off-hours liquidity: an indication, not a forecast.">MSTRx token <i class="' + cl(im) + '">' + pc(im) + '</i> vs ' + esc(day) + ' close</span>'); }
      else P.push('<span title="MSTR regular-session close, CNBC quote service">MSTR ' + usd(m.px) + ' ' + esc(day) + ' close' + (m.chp != null ? ' <i class="' + cl(m.chp) + '">' + pc(m.chp) + '</i>' : '') + '</span>'); }
    if (KD) { var td = etDay(), nx = KD.filter(function (x) { return x.date >= td; }).sort(function (a, c) { return a.date < c.date ? -1 : 1; })[0];
      if (nx) { var dd = Math.round((Date.parse(nx.date + 'T12:00:00Z') - Date.parse(td + 'T12:00:00Z')) / 864e5); P.push('<a href="#key-dates" title="' + esc(nx.title + ' \u00b7 ' + nx.date + (nx.time ? ' ' + nx.time : '') + ' \u00b7 source: ' + (nx.source || 'official calendar')) + '">Next: ' + esc(nx.title.replace(/ rate decision$/, '')) + ' ' + (dd === 0 ? 'today' : dd === 1 ? 'tomorrow' : 'in ' + dd + 'd') + '</a>'); } }
    if (P.length < 3) return; el.innerHTML = P.join('<span class="now-d" aria-hidden="true">\u00b7</span>'); el.hidden = false; }
  ['BTC', 'MSTR', 'tok', 'session'].forEach(function (k) { F.on(k, function () { clearTimeout(paint.t); paint.t = setTimeout(paint, 400); }); });
  F.watch && F.watch(['MSTR']); setInterval(paint, 20000); paint();
})();
