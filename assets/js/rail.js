/* Desktop (>=1200px) hero stats rail: BTC 24h, Strategy, derivatives, treasury movers, levels, next dates.
   Sources: Coinbase (BTC spot + daily candles), strategy.com via desk.json, Deribit public API, CNBC quotes, keydates.json. Education only. */
(function () {
  'use strict';
  var F = window.BTD_FEED, box = document.querySelector('.p-live'); if (!F || !box || !window.matchMedia) return;
  var mq = matchMedia('(min-width:1200px)'), el = null, DESK = null, LB = [], KD = [], DV = null, LV = null;
  var J = function (u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var usd = function (v, d) { return v == null || !isFinite(v) ? '\u2014' : '$' + v.toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); };
  var pc = function (v, d) { return v == null || !isFinite(v) ? '\u2014' : (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + '%'; };
  var cl = function (v) { return v > 0 ? 'up' : v < 0 ? 'dn' : ''; };
  var row = function (k, v, tip, c) { return '<div class="rl-r"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span>' + k + '</span><b class="' + (c || '') + '">' + v + '</b></div>'; };
  function loadSlow() {
    J('/assets/data/desk.json').then(function (j) { DESK = j; paint(); }).catch(function () {});
    J('/assets/data/leaderboard.json').then(function (j) { LB = (j.public_companies || []).filter(function (c) { return c.ticker && c.btc; }).slice(0, 15); F.watch(LB.map(function (c) { return F.cn(c.ticker); }).filter(Boolean)); paint(); }).catch(function () {});
    J('/assets/data/keydates.json').then(function (j) { KD = j.items || []; paint(); }).catch(function () {});
    J('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400').then(function (a) { if (!Array.isArray(a) || a.length < 200) return; var c = a.map(function (x) { return { t: x[0], h: x[2], l: x[1], c: x[4] }; }).sort(function (x, y) { return x.t - y.t; });
      var ma = function (n) { var s = c.slice(-n); return s.reduce(function (a, x) { return a + x.c; }, 0) / s.length; }, r30 = c.slice(-30);
      LV = { ma50: ma(50), ma200: ma(200), hi30: Math.max.apply(0, r30.map(function (x) { return x.h; })), lo30: Math.min.apply(0, r30.map(function (x) { return x.l; })) }; paint(); }).catch(function () {}); }
  function loadDv() { if (document.hidden && DV) return; J('https://www.deribit.com/api/v2/public/ticker?instrument_name=BTC-PERPETUAL').then(function (j) { var r = j && j.result; if (!r) return; DV = { f8: r.funding_8h, oi: r.open_interest, mark: r.mark_price, idx: r.index_price }; paint(); }).catch(function () {}); }
  function paint() { if (!el) return; var b = F.get('BTC'), h = '';
    h += '<section class="rl-s"><h4>Bitcoin \u00b7 24h</h4>' + (b && b.px != null ? row('Last', usd(b.px), 'BTC-USD, Coinbase live') + row('24h change', pc(b.chp), 'Coinbase 24h', cl(b.chp)) + (b.hi ? row('24h high / low', usd(b.hi) + ' / ' + usd(b.lo), 'Coinbase 24h stats') : '') + (b.vol ? row('24h volume', Math.round(b.vol).toLocaleString('en-US') + ' BTC', 'Coinbase only (one venue)') : '') : '<p class="rl-m">loading\u2026</p>') + '</section>';
    var st = DESK && DESK.strategy, kl = st && st.kpis && st.kpis.live, lg = st && st.kpis && st.kpis.ledger;
    if (st) h += '<section class="rl-s"><h4>Strategy (MSTR)</h4>' + row('BTC held', Math.round(st.btc_held).toLocaleString('en-US'), 'as of ' + st.btc_as_of + ' \u00b7 strategy.com') + (kl && kl.mnav ? row('mNAV', kl.mnav.toFixed(2) + 'x', 'strategy.com method, as of ' + kl.as_of_securities) : '') + (lg && lg.btc_yield_ytd_pct != null ? row('BTC Yield YTD', pc(lg.btc_yield_ytd_pct, 1), 'strategy.com KPI, as of ' + lg.as_of, cl(lg.btc_yield_ytd_pct)) : '') + (st.avg_cost ? row('Avg cost / BTC', usd(st.avg_cost) + (b && b.px ? ' <small class="' + cl(b.px - st.avg_cost) + '">' + pc((b.px / st.avg_cost - 1) * 100, 0) + '</small>' : ''), 'Average purchase price (strategy.com) vs live BTC') : '') + '</section>';
    if (DV) h += '<section class="rl-s"><h4>Derivatives \u00b7 Deribit</h4>' + row('Perp funding (8h)', pc(DV.f8 * 100, 4), 'BTC-PERPETUAL funding over 8h; positive = longs pay shorts', cl(DV.f8)) + row('Perp premium', pc((DV.mark / DV.idx - 1) * 100, 3), 'Mark vs Deribit BTC index', cl(DV.mark - DV.idx)) + row('Perp open interest', '$' + (DV.oi / 1e9).toFixed(2) + 'B', 'BTC-PERPETUAL open interest (USD contracts), Deribit only') + '</section>';
    var mv = LB.map(function (c) { var q = F.get(F.cn(c.ticker)); return q && q.chp != null ? { t: c.ticker, v: q.chp } : null; }).filter(Boolean).sort(function (x, y) { return Math.abs(y.v) - Math.abs(x.v); }).slice(0, 5);
    if (mv.length) h += '<section class="rl-s"><h4>Treasury movers \u00b7 ' + (F.session() === 'open' ? 'today' : 'last session') + '</h4>' + mv.map(function (x) { return '<button type="button" class="rl-r rl-b" data-rl-open="' + esc(x.t) + '" title="Open ' + esc(x.t) + ' in the chart"><span>' + esc(x.t) + '</span><b class="' + cl(x.v) + '">' + pc(x.v) + '</b></button>'; }).join('') + '</section>';
    if (LV && b && b.px) { var L = [['30D high', LV.hi30], ['50D avg', LV.ma50], ['200D avg', LV.ma200], ['30D low', LV.lo30]].sort(function (x, y) { return y[1] - x[1]; });
      h += '<section class="rl-s"><h4>Levels to watch</h4>' + L.map(function (x) { return row(x[0], usd(x[1]) + ' <small class="' + cl(b.px - x[1]) + '">' + pc((b.px / x[1] - 1) * 100, 1) + '</small>', 'Coinbase daily candles; % = live price vs level. Reference levels, not signals.'); }).join('') + '</section>'; }
    var td = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), nx = KD.filter(function (x) { return x.date >= td; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; }).slice(0, 3);
    if (nx.length) h += '<section class="rl-s"><h4>Next key dates</h4>' + nx.map(function (x) { var d = Math.round((Date.parse(x.date + 'T12:00:00Z') - Date.parse(td + 'T12:00:00Z')) / 864e5); return row(esc(x.title), d === 0 ? 'today' : d === 1 ? 'tomorrow' : d + 'd', x.date + (x.time ? ' ' + x.time : '') + ' \u00b7 ' + (x.source || '')); }).join('') + '<a class="rl-a" href="#key-dates">All dates \u2192</a></section>';
    el.innerHTML = h; }
  function mount() { if (mq.matches && !el) { el = document.createElement('aside'); el.className = 'lc-rail'; el.setAttribute('aria-label', 'Desk stats'); box.appendChild(el); box.classList.add('has-rail'); loadSlow(); loadDv(); paint(); }
    else if (!mq.matches && el) { el.remove(); el = null; box.classList.remove('has-rail'); } }
  if (mq.addEventListener) mq.addEventListener('change', mount); mount();
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rl-open]'); if (b && window.BTD_LC) window.BTD_LC.open(b.dataset.rlOpen, 1); });
  var pt = 0; F.on('BTC', function () { if (Date.now() - pt > 3000) { pt = Date.now(); paint(); } }); F.on('quotes', paint); setInterval(loadDv, 60000);
})();
