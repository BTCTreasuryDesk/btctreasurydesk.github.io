/* Desk Pro indicators (Oct 25, 2026). Three in-house readings built only from real data, with the method shown.
   1) MSTR-implied BTC price: what the market pays per bitcoin through MSTR = live EV / BTC held (strategy.com method, live MSTR price).
   2) Session gap: MSTR's move since the last 4:00 PM ET close (after hours or 24/7 tokenized) vs BTC's move over the same window.
   3) Cycle position: where today's Mayer Multiple, price/200-week MA, MVRV and 14-day RSI rank versus BTC's own history since 2015 (0-100).
   Education only. Not financial advice. No signals, no predictions. Lives inside the Pro Vault body, so the members switch gates it. */
(function () {
  'use strict';
  var box = document.querySelector('[data-pi]'); if (!box) return;
  var F = window.BTD_FEED, DESK = null, D = null, TOK = null, B0 = null;
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function usd(v, d) { return v == null || !isFinite(v) ? '—' : '$' + v.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function pc(v) { return v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%'; }
  function cl(v) { return v > 0 ? 'up' : v < 0 ? 'dn' : ''; }
  var DIS = '<p class="pi-dis">Educational only. Not financial advice. Not a signal or a forecast.</p>';
  if (F) F.watch(['MSTR']);
  /* direct CNBC quote (same service the Desk uses) so this works even if the shared feed has not loaded MSTR */
  var MQ = null; function mq() { J('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=MSTR&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1').then(function (j) { var x = (j.FormattedQuoteResult || {}).FormattedQuote; x = Array.isArray(x) ? x[0] : x; var n = function (v) { return parseFloat(String(v).replace(/[,%$+]/g, '')); }, px = n(x.last); if (!isFinite(px)) return;
    var e = x.ExtendedMktQuote, ep = e ? n(e.last) : NaN; MQ = { px: px, ext: isFinite(ep) ? { px: ep, kind: /pre/i.test(e.type || '') ? 'pre' : 'post' } : null }; paint(); }).catch(function () {}); }
  mq(); setInterval(mq, 60e3);
  function mstr() { var q = F && F.get('MSTR'); return q && q.px != null ? q : MQ; }
  /* last regular close, 4:00 PM ET on the latest weekday (exchange holidays not modeled) */
  function lastClose() { var n = new Date(), et = new Date(n.toLocaleString('en-US', { timeZone: 'America/New_York' })), off = n - et, d = new Date(et); d.setHours(16, 0, 0, 0); if (et < d) d.setDate(d.getDate() - 1); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1); return new Date(d.getTime() + off); }
  var LC = lastClose();
  J('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=300&start=' + new Date(LC - 3e5).toISOString() + '&end=' + new Date(+LC + 3e5).toISOString()).then(function (a) { if (a && a.length) { a.sort(function (x, y) { return Math.abs(x[0] * 1e3 - LC) - Math.abs(y[0] * 1e3 - LC); }); B0 = +a[0][4]; paint(); } }).catch(function () {});
  function tok() { J('https://api.kraken.com/0/public/Ticker?asset_class=tokenized_asset&pair=MSTRxUSD').then(function (j) { var x = j.result && j.result.MSTRxUSD; TOK = x && +x.t[1] >= 20 ? +x.c[0] : null; paint(); }).catch(function () {}); }
  tok(); setInterval(tok, 60e3);
  Promise.all([J('/assets/data/desk.json'), J('/assets/data/btc_daily.json')]).then(function (r) { DESK = r[0]; D = r[1].closes; paint(); }).catch(function () { box.innerHTML = '<p class="muted">Indicator data unavailable right now.</p>'; });
  function implied() { var L = DESK && DESK.strategy && DESK.strategy.kpis && DESK.strategy.kpis.live, q = mstr(), b = F && F.get('BTC'); if (!L || !q || q.px == null || !b || b.px == null) return null;
    var ses = F ? F.session() : 'closed', px = ses !== 'open' && q.ext && q.ext.px != null ? q.ext.px : q.px, lab = px === q.px ? (ses === 'open' ? 'live' : 'close') : q.ext.kind === 'pre' ? 'pre-market' : 'after hours';
    var sh = L.market_cap_musd / L.mstr_close, cash = L.market_cap_musd + L.debt_musd + L.pref_musd - L.ev_musd, ev = px * sh + L.debt_musd + L.pref_musd - cash, imp = ev * 1e6 / L.btc_held;
    return { imp: imp, spot: b.px, prem: (imp / b.px - 1) * 100, px: px, lab: lab, asof: L.as_of_securities }; }
  function pctRank(arr, v) { var n = 0; arr.forEach(function (x) { if (x <= v) n++; }); return n / arr.length * 100; }
  function cycle() { if (!D || D.length < 1500) return null; var b = F && F.get('BTC'), px = b && b.px ? b.px : D[D.length - 1], c = D.concat([px]);
    var may = [], w2 = [], rsi = [], i, s = 0; for (i = 0; i < c.length; i++) { s += c[i]; if (i >= 200) s -= c[i - 200]; if (i >= 199) may.push(c[i] / (s / 200)); }
    for (i = 1399; i < c.length; i++) { var t = 0; for (var k = 0; k < 200; k++) t += c[i - k * 7]; w2.push(c[i] / (t / 200)); }
    var g = 0, l = 0; for (i = 1; i < c.length; i++) { var d = c[i] - c[i - 1]; if (i <= 14) { g += Math.max(d, 0) / 14; l += Math.max(-d, 0) / 14; } else { g = (g * 13 + Math.max(d, 0)) / 14; l = (l * 13 + Math.max(-d, 0)) / 14; } if (i >= 14) rsi.push(l ? 100 - 100 / (1 + g / l) : 100); }
    var parts = [['Mayer Multiple (price ÷ 200-day MA)', may[may.length - 1], pctRank(may, may[may.length - 1]), 'x'], ['Price ÷ 200-week MA', w2[w2.length - 1], pctRank(w2, w2[w2.length - 1]), 'x'], ['14-day RSI', rsi[rsi.length - 1], pctRank(rsi, rsi[rsi.length - 1]), '']];
    var rp = DESK && DESK.onchain && DESK.onchain.realized_price; if (rp) parts.push(['MVRV (price ÷ realized price ' + usd(rp) + ', ' + DESK.onchain.as_of + ')', px / rp, null, 'x']);
    var ranked = parts.filter(function (p) { return p[2] != null; }), score = ranked.reduce(function (a, p) { return a + p[2]; }, 0) / ranked.length; return { parts: parts, score: score }; }
  function paint() { if (!DESK || !D) return; var h = '', I = implied(), q = mstr(), b = F && F.get('BTC');
    h += '<div class="pi-c"><h3>MSTR-implied BTC price</h3>' + (I ? '<p class="pi-big">' + usd(I.imp) + ' <small>per BTC via MSTR</small></p><p>Spot ' + usd(I.spot) + ' · premium <b class="' + cl(I.prem) + '">' + pc(I.prem) + '</b> (MSTR ' + usd(I.px, 2) + ', ' + I.lab + ')</p>' : '<p class="muted">Waiting for live quotes…</p>') +
      '<p class="pi-m">Method: enterprise value at the live MSTR price (implied shares from strategy.com market cap ÷ close, plus debt and preferreds, minus the USD reserve) ÷ ' + Math.round(DESK.strategy.kpis.live.btc_held).toLocaleString('en-US') + ' BTC held. Balance-sheet inputs as of ' + DESK.strategy.kpis.live.as_of_securities + '. Plain English: the bitcoin price you are effectively paying if you hold MSTR instead of BTC.</p>' + DIS + '</div>';
    var mNow = null, mLab = ''; if (q && q.px != null) { if (TOK && F.session() === 'closed') { mNow = TOK; mLab = '24/7 tokenized (Kraken xStocks)'; } else if (q.ext && q.ext.px != null && F.session() !== 'open') { mNow = q.ext.px; mLab = q.ext.kind === 'pre' ? 'pre-market' : 'after hours'; } }
    var mMv = mNow ? (mNow / q.px - 1) * 100 : null, bMv = B0 && b && b.px ? (b.px / B0 - 1) * 100 : null;
    h += '<div class="pi-c"><h3>Session gap · MSTR vs BTC since the close</h3>' + (F && F.session() === 'open' ? '<p class="muted">US market is open; this reads the gap outside regular hours (after 4:00 PM ET, overnight and weekends).</p>' :
      '<p>Since ' + LC.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' }) + ' ET close:</p><p class="pi-big"><span class="' + cl(mMv) + '">MSTR ' + pc(mMv) + '</span> · <span class="' + cl(bMv) + '">BTC ' + pc(bMv) + '</span></p>' +
      (mMv != null && bMv != null ? '<p>Gap (MSTR − BTC): <b class="' + cl(mMv - bMv) + '">' + pc(mMv - bMv) + '</b> · MSTR price source: ' + mLab + '</p>' : '<p class="muted">No liquid after-hours or tokenized MSTR price right now.</p>')) +
      '<p class="pi-m">Method: MSTR off-hours price (after hours / pre-market from CNBC; overnight and weekends the Kraken xStocks token when it has 20+ trades in 24h) vs the official close; BTC = Coinbase now vs the Coinbase price at 4:00 PM ET. Plain English: how much MSTR has already moved compared with bitcoin while the exchange was shut. Tokens can trade away from the real share; holidays are not modeled.</p>' + DIS + '</div>';
    var C = cycle(); if (C) h += '<div class="pi-c"><h3>Cycle position (history rank)</h3><p class="pi-big">' + C.score.toFixed(0) + ' <small>/ 100</small></p><div class="pi-bar"><i style="left:' + C.score.toFixed(1) + '%"></i></div><ul class="pi-l">' + C.parts.map(function (p) { return '<li>' + p[0] + ': <b>' + p[1].toFixed(2) + p[3] + '</b>' + (p[2] != null ? ' · higher than ' + p[2].toFixed(0) + '% of days' : ' · shown for context, not ranked') + '</li>'; }).join('') + '</ul>' +
      '<p class="pi-m">Method: each reading is ranked against every day in BTC\'s daily-close history since July 2015 (0 = lowest ever, 100 = highest); the score is the average rank of Mayer, price ÷ 200-week MA and RSI. Plain English: how stretched today is compared with BTC\'s own past, high or low. History does not predict the future.</p>' + DIS + '</div>';
    box.innerHTML = h; }
  setInterval(paint, 20e3); if (F) F.on('*', function () { clearTimeout(paint._t); paint._t = setTimeout(paint, 800); });
})();
