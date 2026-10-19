/* Homepage helpers: dismissible 'New here?' card + 'The 5 numbers that matter' strip.
   Sources: Coinbase (BTC), strategy.com via desk.json (mNAV, BTC Yield, sats per share), alternative.me (Fear & Greed). Education only. */
(function () {
  'use strict';
  var F = window.BTD_FEED, LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var hero = document.querySelector('.p-live'), hs = document.querySelector('.p-hs');
  /* New here? (hidden once dismissed or after 4 visits) */
  var nv = +(LS.get('btd_nh_v') || 0) + 1; LS.set('btd_nh_v', nv);
  if (hero && !LS.get('btd_nh_x') && nv <= 4) { var c = document.createElement('div'); c.className = 'nh'; c.innerHTML = '<span><b>New here?</b> See how much bitcoin your shares hold, or learn what mNAV means.</span><a href="/your-bitcoin/#calculator">Your Bitcoin \u2192</a><a href="/glossary/#mnav">Learn the basics \u2192</a><button type="button" aria-label="Dismiss" data-nh-x>\u00d7</button>';
    hero.parentNode.insertBefore(c, hero); c.querySelector('[data-nh-x]').addEventListener('click', function () { LS.set('btd_nh_x', '1'); c.remove(); }); }
  if (!hs) return;
  var box = document.createElement('div'); box.className = 'n5'; box.setAttribute('aria-label', 'The 5 numbers that matter'); hs.appendChild(box);
  var D = null, G = null;
  fetch('/assets/data/desk.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { D = j.strategy; paint(); }).catch(function () {});
  fetch('https://api.alternative.me/fng/?limit=1').then(function (r) { return r.json(); }).then(function (j) { var x = j.data && j.data[0]; if (x) { G = { v: +x.value, w: x.value_classification }; paint(); } }).catch(function () {});
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function cell(k, v, m, src, href) { return '<a class="n5-c" href="' + href + '" title="' + esc(m + ' Source: ' + src) + '"><span class="n5-k">' + k + '</span><b>' + v + '</b><small>' + esc(m) + '</small><em>' + esc(src) + '</em></a>'; }
  function paint() { var b = F && F.get('BTC'), kl = D && D.kpis && D.kpis.live, lg = D && D.kpis && D.kpis.ledger, h = '<p class="n5-h">The 5 numbers that matter</p><div class="n5-r">';
    h += cell('BTC price', b && b.px ? '$' + Math.round(b.px).toLocaleString('en-US') : '\u2026', 'What one bitcoin costs right now.', 'Coinbase, live', '/long-term-chart/');
    h += cell('MSTR mNAV', kl && kl.mnav ? kl.mnav.toFixed(2) + 'x' : '\u2026', 'Company value \u00f7 its bitcoin. Above 1x = premium.', 'strategy.com' + (kl ? ', ' + String(kl.as_of_securities || '').split(' ')[0] : ''), '/glossary/#mnav');
    h += cell('BTC Yield YTD', lg && lg.btc_yield_ytd_pct != null ? (lg.btc_yield_ytd_pct >= 0 ? '+' : '\u2212') + Math.abs(lg.btc_yield_ytd_pct).toFixed(1) + '%' : '\u2026', 'Growth in bitcoin per share this year (MSTR).', 'strategy.com' + (lg ? ', ' + lg.as_of : ''), '/glossary/#btc-yield');
    h += cell('Sats per share', D && D.sats_per_share ? D.sats_per_share.toLocaleString('en-US') : '\u2026', 'Bitcoin behind each MSTR share (100M sats = 1 BTC).', 'strategy.com' + (D ? ', ' + D.btc_as_of : ''), '/your-bitcoin/#calculator');
    h += cell('Fear & Greed', G ? G.v + ' <small class="n5-w">' + esc(G.w) + '</small>' : '\u2026', 'Crypto mood, 0 = extreme fear, 100 = extreme greed.', 'alternative.me', '/glossary/');
    box.innerHTML = h + '</div>'; }
  paint(); if (F) { var t = 0; F.on('BTC', function () { if (Date.now() - t > 5000) { t = Date.now(); paint(); } }); }
})();
