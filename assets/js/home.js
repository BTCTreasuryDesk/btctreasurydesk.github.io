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
  fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); }).then(function (j) { var x = j.data && j.data[0]; if (x) { G = { v: +x.value, w: x.value_classification }; paint(); } }).catch(function () {});
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function cell(k, v, m, src, href) { return '<a class="n5-c" href="' + href + '" title="' + esc(m + ' Source: ' + src) + '"><span class="n5-k">' + k + '</span><b>' + v + '</b><small>' + esc(m) + '</small><em>' + esc(src) + '</em></a>'; }
  function paint() { var b = F && F.get('BTC'), kl = D && D.kpis && D.kpis.live, lg = D && D.kpis && D.kpis.ledger, h = '<p class="n5-h">Key metrics</p><div class="n5-r">';
    h += cell('BTC price', b && b.px ? '$' + Math.round(b.px).toLocaleString('en-US') : '\u2026', 'Spot, live.', 'Coinbase, live', '/long-term-chart/');
    h += cell('MSTR mNAV', kl && kl.mnav ? kl.mnav.toFixed(2) + 'x' : '\u2026', 'EV \u00f7 BTC NAV (Strategy method).', 'strategy.com' + (kl ? ', ' + String(kl.as_of_securities || '').split(' ')[0] : ''), '/glossary/#mnav');
    h += cell('BTC Yield YTD', lg && lg.btc_yield_ytd_pct != null ? (lg.btc_yield_ytd_pct >= 0 ? '+' : '\u2212') + Math.abs(lg.btc_yield_ytd_pct).toFixed(1) + '%' : '\u2026', 'BTC per diluted share, YTD.', 'strategy.com' + (lg ? ', ' + lg.as_of : ''), '/glossary/#btc-yield');
    h += cell('Sats per share', D && D.sats_per_share ? D.sats_per_share.toLocaleString('en-US') : '\u2026', 'Sats per MSTR diluted share.', 'strategy.com' + (D ? ', ' + D.btc_as_of : ''), '/your-bitcoin/#calculator');
    h += cell('Fear & Greed', G ? G.v + ' <small class="n5-w">' + esc(G.w) + '</small>' : '\u2026', 'Sentiment index, 0\u2013100.', 'alternative.me', '/glossary/');
    box.innerHTML = h + '</div>'; }
  paint(); if (F) { var t = 0; F.on('BTC', function () { if (Date.now() - t > 5000) { t = Date.now(); paint(); } }); }
})();
