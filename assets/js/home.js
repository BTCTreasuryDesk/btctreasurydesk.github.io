/* Homepage key-metrics strip.
   Sources: Coinbase (BTC), strategy.com via desk.json (mNAV, BTC Yield, sats per share), alternative.me (Fear & Greed). Education only. */
(function () {
  'use strict';
  var F = window.BTD_FEED, LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var hero = document.querySelector('.p-live'), hs = document.querySelector('.p-hs');
  if (!hs) return;
  var box = document.createElement('div'); box.className = 'n5'; box.setAttribute('aria-label', 'Key metrics'); hs.appendChild(box);
  var D = null, G = null;
  fetch('/assets/data/desk.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { D = j.strategy; paint(); }).catch(function () {});
  fetch('https://api.alternative.me/fng/?limit=31').then(function (r) { return r.json(); }).then(function (j) { var a = j.data || [], x = a[0]; if (x) { var v = function (i) { return a[i] ? +a[i].value : null; }, A = a.map(function (y) { return +y.value; }); G = { v: +x.value, w: x.value_classification, y: v(1), w1: v(7), m1: v(30), avg: A.length >= 10 ? A.reduce(function (p, c) { return p + c; }, 0) / A.length : null }; paint(); } }).catch(function () {});
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function cell(k, v, m, src, href, ctx) { return '<a class="n5-c" href="' + href + '" title="' + esc(m + ' Source: ' + src) + '"><span class="n5-k">' + k + '</span><b>' + v + '</b>' + (ctx ? '<span class="n5-x">' + ctx + '</span>' : '') + '<small>' + esc(m) + '</small><em>' + esc(src) + '</em></a>'; }
  function sgn(x, d) { return (x >= 0 ? '+' : '\u2212') + Math.abs(x).toFixed(d); } function cc(x) { return x >= 0 ? 'up' : 'dn'; }
  function paint() { var b = F && F.get('BTC'), kl = D && D.kpis && D.kpis.live, lg = D && D.kpis && D.kpis.ledger, h = '<p class="n5-h">Key metrics</p><div class="n5-r">';
    var bx = b && b.chp != null && isFinite(b.chp) ? '<i class="' + cc(b.chp) + '">' + sgn(b.chp, 2) + '% 24h</i>' + (b.hi && b.lo ? ' \u00b7 L ' + Math.round(b.lo).toLocaleString('en-US') + ' H ' + Math.round(b.hi).toLocaleString('en-US') : '') : '';
    h += cell('BTC price', b && b.px ? '$' + Math.round(b.px).toLocaleString('en-US') : '\u2026', 'Spot, live.', 'Coinbase, live', '/long-term-chart/', bx);
    var mq = F && F.get('MSTR'), mpx = mq && mq.px, lmn = D && b && b.px && mpx && window.btdLiveMnav ? window.btdLiveMnav(D.kpis, mpx, b.px) : null;
    h += cell('MSTR mNAV', kl && kl.mnav ? kl.mnav.toFixed(2) + 'x' : '\u2026', 'EV \u00f7 BTC NAV (Strategy method).', 'strategy.com' + (kl ? ', ' + String(kl.as_of_securities || '').split(' ')[0] : ''), '/glossary/#mnav', lmn ? 'live ' + lmn.toFixed(2) + 'x <i class="' + cc(lmn - kl.mnav) + '">' + sgn(lmn - kl.mnav, 2) + 'x</i> vs close' : '');
    h += cell('BTC Yield YTD', lg && lg.btc_yield_ytd_pct != null ? (lg.btc_yield_ytd_pct >= 0 ? '+' : '\u2212') + Math.abs(lg.btc_yield_ytd_pct).toFixed(1) + '%' : '\u2026', 'BTC per diluted share, YTD.', 'strategy.com' + (lg ? ', ' + lg.as_of : ''), '/glossary/#btc-yield', lg && lg.btc_gain_ytd != null ? 'BTC Gain YTD ' + sgn(lg.btc_gain_ytd, 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' \u20bf' + (lg.btc_yield_qtd_pct != null ? ' \u00b7 QTD ' + sgn(lg.btc_yield_qtd_pct, 1) + '%' : '') : '');
    h += cell('Sats per share', D && D.sats_per_share ? D.sats_per_share.toLocaleString('en-US') : '\u2026', 'Sats per MSTR diluted share.', 'strategy.com' + (D ? ', ' + D.btc_as_of : ''), '/your-bitcoin/#calculator', D && D.sats_per_share && b && b.px ? '\u2248 $' + (D.sats_per_share * b.px / 1e8).toFixed(2) + ' of BTC per share at spot' : '');
    var gx = G ? '<span class="n5-sc" title="0 Extreme Fear \u2192 100 Extreme Greed"><i style="left:' + G.v + '%"></i></span>' + [['Yday', G.y], ['1W', G.w1], ['1M', G.m1]].filter(function (z) { return z[1] != null; }).map(function (z) { return z[0] + ' ' + z[1]; }).join(' \u00b7 ') + (G.avg != null ? ' \u00b7 30d avg ' + Math.round(G.avg) : '') : '';
    h += cell('Fear & Greed', G ? G.v + ' <small class="n5-w">' + esc(G.w) + '</small>' : '\u2026', 'Crowd sentiment, 0 Extreme Fear to 100 Extreme Greed; read as a contrarian gauge, not a timing signal.', 'alternative.me', '/glossary/', gx);
    box.innerHTML = h + '</div>'; }
  paint(); if (F) { var t = 0; F.on('BTC', function () { if (Date.now() - t > 5000) { t = Date.now(); paint(); } }); }
})();
