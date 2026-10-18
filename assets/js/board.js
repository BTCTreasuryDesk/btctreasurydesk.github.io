/* BTC Treasury Desk: home live panels, all from BTD_FEED (free feeds, no AI).
   [data-mk]  Markets board (customizable: add/remove/reorder, saved, reset): Bitcoin desk (BTC, MSTR, live mNAV, Treasury 10, Street Sentiment, ETH, SOL) + US indexes/futures, rates, dollar, VIX,
              commodities, Japan/Europe, Mag 7. Session-aware: pre-market / after-hours prices and futures outside regular hours; tokenized stocks live in their own panel (#tokenized)
              into the board after hours and on weekends. Never blank: last close cached in this browser.
   [data-wl]  Treasury companies window: standard list or your own (add/remove/reorder, saved, reset) + Movers view + Preferreds dropdown (majors).
   [data-cx]  Crypto market (compact, Bitcoin-first): total cap, alt index (ex-BTC), dominance, stablecoins, alt-season breadth, Fear & Greed.
   [data-tok] Tokenized stocks (xStocks, 24/7) vs the last stock price.   [data-wall] Live Wall: BTC + up to 4 picks, small live charts.
   Education only, not investment advice. */
/* BTD_CTX: context for live tiles. 5D sparkline (last daily closes + live), explicit change timeframe, and short reads vs a labelled reference
   (1y average, 1 month ago, 52-week range) from assets/data/ctx.json (weekly, Yahoo daily closes). */
(function () {
  var D = null, subs = [], rsubs = [], RG = {}, TB = {}, CC = {}, EX = {}, DEF = {}, KEEP = {}; try { RG = JSON.parse(localStorage.getItem('btd_rr') || '{}') || {}; Object.keys(RG).forEach(function (k) { KEEP[k] = 1; }); } catch (e) { RG = {}; }
  var UNIT = {}, GU = 'pct'; try { if (localStorage.getItem('btd_chu') === 'amt') GU = 'amt'; } catch (e) {}
  /* Coinbase hourly candles for the native coins' 1D sparkline */
  function cbc() { ['BTC', 'ETH', 'SOL'].forEach(function (c) { fetch('https://api.exchange.coinbase.com/products/' + c + '-USD/candles?granularity=3600').then(function (r) { return r.json(); }).then(function (a) { if (Array.isArray(a) && a.length > 6) { CC[c] = a.slice(0, 24).reverse().map(function (x) { return x[4]; }); subs.forEach(function (f) { try { f(); } catch (e) {} }); } }).catch(function () {}); }); }
  setTimeout(cbc, 2500); setInterval(cbc, 300e3);
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-spk][role="button"]')) e.target.click(); });
  var lpT = 0, lpDone = false;
  document.addEventListener('pointerdown', function (e) { var b = e.target.closest && e.target.closest('[data-spk][role="button"]'); lpDone = false; clearTimeout(lpT); if (!b || e.button > 0) return; lpT = setTimeout(function () { lpDone = true; window.BTD_CTX.flip(b.getAttribute('data-spk')); }, 500); }, true);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { document.addEventListener(ev, function () { clearTimeout(lpT); }, true); });
  document.addEventListener('contextmenu', function (e) { var b = e.target.closest && e.target.closest('[data-spk][role="button"]'); if (!b) return; e.preventDefault(); if (!lpDone) window.BTD_CTX.flip(b.getAttribute('data-spk')); }, true);
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-spk]'); if (!b) return; if (b.getAttribute('data-spk') === 'LC') { if (lpDone) { lpDone = false; e.preventDefault(); e.stopPropagation(); } return; } e.preventDefault(); e.stopPropagation(); if (lpDone) { lpDone = false; return; } var k = b.getAttribute('data-spk'), F = window.BTD_FEED, q = F && F.get(k); window.BTD_CTX.cycle(k, q && q.px, q && q.chp); }, true);
  fetch('/assets/data/ctx.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).then(function (j) { D = j.k || {}; subs.forEach(function (f) { try { f(); } catch (e) {} }); }).catch(function () { D = {}; });
  function et() { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function lastSess() { var e = et(), d = e.weekday, h = +e.hour, W = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; if (W.indexOf(d) >= 0 && h >= 16) return 'today'; if (d === 'Sat' || d === 'Sun' || d === 'Mon') return 'Fri'; return W[W.indexOf(d) - 1]; }
  var CRY = /^(BTC|ETH|SOL|C:.+|X:.+)$/;
  window.BTD_CTX = {
    on: function (f) { subs.push(f); if (D) f(); },
    get: function (k) { return D && D[k]; },
    /* timeframe label for a quote's % change */
    tf: function (k, q, session, ext) { if (CRY.test(k)) return '24h'; if (ext) return 'vs close'; if (/^@/.test(k)) return 'vs settle'; if (q && q.yld) return 'vs prior close';
      if (session === 'open') return 'today'; var l = lastSess(); return l === 'today' ? 'today' : 'on ' + l; },
    /* sparkline with a tappable range pill (1D -> 1W -> 1M -> 1Y). 1D = prior close + live ticks while the page is open (coins: Coinbase hourly candles). */
    ranges: ['1D', '1W', '1M', 'YTD', '1Y'],
    rng: function (k) { return RG[k] || DEF[k] || '1D'; },
    /* extra history for keys not in ctx.json (crypto ratios); def = default range; keep = remember the user's range in localStorage */
    put: function (k, c, cc) { EX[k] = c; if (cc) CC[k] = cc; },
    def: function (k, r, keep) { DEF[k] = r; if (keep) KEEP[k] = 1; },
    series: function (k, r, live, chp) { var c = (D && D[k]) || EX[k], v = null;
      if (r === '1D') { var cc = CC[k]; if (cc && cc.length > 3) v = cc.slice(); else { var b = TB[k]; if (!b && live != null && chp != null && isFinite(chp)) b = TB[k] = [live / (1 + chp / 100)]; if (b) { if (live != null && b[b.length - 1] !== live) { b.push(live); if (b.length > 240) b.splice(1, 1); } v = b.slice(); } } }
      else if (c) { var base = r === '1W' ? c.c5 : r === '1M' ? c.c22 : r === '1Y' ? c.w : r === 'YTD' ? c.ytd : null; if (base && base.length > 2) v = base.slice(); }
      if (!v) return null; if (r !== '1D' && live != null && isFinite(live)) v.push(live); else if (r === '1D' && CC[k] && live != null) v.push(live);
      return v.length > 1 ? { v: v, ch: (v[v.length - 1] / v[0] - 1) * 100 } : null; },
    spark: function (k, live, chp) { var r = this.rng(k), S = this.series(k, r, live, chp); if (!S && r !== '1D' && /^R:/.test(k) && !EX[k]) return ''; if (!S && r !== '1D') { RG[k] = '1D'; r = '1D'; S = this.series(k, r, live, chp); } if (!S) return '';
      var v = S.v, lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), w = 44, h = 14, rg = hi - lo || 1, up = v[v.length - 1] >= v[0];
      var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (h - 1 - (x - lo) / rg * (h - 2)).toFixed(1); }).join(' ');
      return '<button type="button" class="spk-b" data-spk="' + k.replace(/"/g, '') + '" aria-label="Sparkline range ' + r + ', tap to change" title="' + (r === '1D' ? 'Today: prior close to live' : r === '1W' ? 'Last 5 daily closes + live' : r === '1M' ? 'Last month of daily closes + live' : r === 'YTD' ? 'Since the last close of last year + live' : 'Last year (weekly) + live') + ' \u00b7 tap to change range"><svg class="spk ' + (up ? 'up' : 'dn') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '"/></svg><small class="spk-l">' + r + '</small></button>'; },
    /* change % for the tile's chosen range; null on 1D (tile keeps its own live change + timeframe label) */
    chg: function (k, live, chp) { var r = this.rng(k); if (r === '1D') return null; var S = this.series(k, r, live, chp); return S ? { ch: S.ch, r: r } : null; },
    cycle: function (k, live, chp) { var R = this.ranges, i = R.indexOf(this.rng(k)); for (var n = 1; n <= R.length; n++) { var r = R[(i + n) % R.length]; if (this.series(k, r, live, chp)) { RG[k] = r; break; } } if (KEEP[k]) { var sv = {}; Object.keys(KEEP).forEach(function (x) { if (RG[x]) sv[x] = RG[x]; }); try { localStorage.setItem('btd_rr', JSON.stringify(sv)); } catch (e) {} } rsubs.forEach(function (f) { try { f(k); } catch (e) {} }); },
    onRange: function (f) { rsubs.push(f); },
    /* % vs amount: global choice (saved) + per-tile flips (this visit). Yields always in bp; indexes and VIX in points; prices in their own currency. */
    unit: function (k) { return UNIT[k] || GU; },
    kind: function (k) { return /^R:/.test(k) ? 'rt' : /^US\d+Y$/.test(k) ? 'yd' : /^(\.|@SP\.1|@ND\.1|@DJ\.1)/.test(k) ? 'ix' : /=$/.test(k) ? 'fx' : 'px'; },
    fmt: function (k, q) { if (!q || q.px == null) return null; var r = this.rng(k), kd = this.kind(k), ch, amt;
      if (r === '1D' && !(kd === 'rt' && CC[k])) { if (kd === 'yd') { if (q.ch == null) return null; amt = q.ch; ch = null; } else { if (q.chp == null || !isFinite(q.chp)) return null; ch = q.chp; amt = q.px - q.px / (1 + ch / 100); } }
      else { var S = this.series(k, r, q.px, q.chp); if (!S) return null; ch = S.ch; amt = S.v[S.v.length - 1] - S.v[0]; }
      var u = kd === 'yd' ? 'amt' : this.unit(k), sg = function (v) { return v > 0 ? '+' : v < 0 ? '\u2212' : ''; }, a = Math.abs(amt), t;
      if (u === 'pct') t = sg(ch) + Math.abs(ch).toFixed(2) + '%';
      else if (kd === 'yd') t = sg(amt) + (a * 100).toFixed(a * 100 < 10 ? 1 : 0) + ' bp';
      else if (kd === 'rt') t = sg(amt) + (a >= 10 ? a.toFixed(2) : a >= 1 ? a.toFixed(3) : a.toPrecision(3)) + ' ' + k.slice(5);
      else if (kd === 'ix') t = sg(amt) + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' pts';
      else { var cur = q.cur === 'JPY' || /\.T$/.test(k) ? '\u00a5' : q.cur && q.cur !== 'USD' ? '' : '$'; t = sg(amt) + cur + a.toLocaleString('en-US', { minimumFractionDigits: a < 1 ? 4 : 2, maximumFractionDigits: a < 1 ? 4 : 2 }) + (cur || !q.cur ? '' : ' ' + q.cur); }
      return { t: t, v: kd === 'yd' ? amt : ch, r: r }; },
    flip: function (k) { UNIT[k] = this.unit(k) === 'pct' ? 'amt' : 'pct'; rsubs.forEach(function (f) { try { f(k); } catch (e) {} }); },
    setGlobal: function (u) { GU = u; UNIT = {}; try { localStorage.setItem('btd_chu', u); } catch (e) {} rsubs.forEach(function (f) { try { f(); } catch (e) {} }); },
    global: function () { return GU; },
    tip: 'Tap: timeframe \u00b7 Hold: % / $',
    /* short read vs a labelled reference for gauges / levels */
    read: function (k, px) { var c = D && D[k]; if (!c || px == null) return ''; var y = c.y;
      if (k === '.VIX') { var lv = px < y[0] * 0.85 ? 'calm' : px > y[0] * 1.25 ? 'elevated' : 'normal'; return lv + ' (1y avg ' + y[0].toFixed(1) + ')'; }
      if (/^US\d+Y$/.test(k)) { var bp = Math.round((px - c.m1) * 100); return (bp >= 0 ? '+' : '\u2212') + Math.abs(bp) + ' bp in 1 month'; }
      if (k === '.DXY') { var d = (px / c.m1 - 1) * 100; return (d >= 0 ? '\u2191' : '\u2193') + Math.abs(d).toFixed(1) + '% in 1 month'; }
      return ''; },
    range: function (k, px) { var c = D && D[k]; if (!c || px == null) return ''; var lo = Math.min(c.y[1], px), hi = Math.max(c.y[2], px), p = hi > lo ? (px - lo) / (hi - lo) * 100 : 50;
      return '<span class="rng" title="52-week range ' + lo.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' \u2013 ' + hi.toLocaleString('en-US', { maximumFractionDigits: 2 }) + '"><i style="left:' + p.toFixed(0) + '%"></i></span><small class="spk-l">52w</small>'; }
  };
})();
(function () {
  'use strict';
  var F = window.BTD_FEED, C = window.BTD_CH; if (!F) return;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v, d) { return v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function px(v, cur) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v), d = a >= 10000 ? 0 : a >= 1000 ? 2 : a >= 1 ? 2 : 4; var s = n(v, d); return cur === 'GBp' ? s + 'p' : cur && cur !== 'USD' ? s + ' ' + cur : '$' + s; }
  function lv(v) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v); return n(v, a >= 1000 ? 2 : a >= 10 ? 2 : 3); }
  function pc(v, d) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + '%'; }
  function cls(v) { return v == null || !isFinite(v) ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl'; }
  function big(v) { return v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : '$' + n(v / 1e6, 0) + 'M'; }
  function flash(el, dir) { if (!el || !dir) return; el.classList.remove('fl-up', 'fl-dn'); void el.offsetWidth; el.classList.add(dir > 0 ? 'fl-up' : 'fl-dn'); }
  var DESK = null, LB = [], AN = null;
  var dP = J('/assets/data/desk.json').then(function (j) { DESK = j; }).catch(function () {}), lP = J('/assets/data/leaderboard.json').then(function (j) { LB = (j.public_companies || []).filter(function (c) { return c.ticker && c.btc && c.stock_price; }).slice(0, 50); }).catch(function () {});
  J('/assets/data/analysts.json').then(function (j) { AN = j; }).catch(function () {});
  var SESS = F.session();
  function sessTag(q) { var s = F.session(); if (!q || q.cached && !q.t) return 'last close'; if (s === 'open') return ''; if (q.ext) return q.ext.kind === 'pre' ? 'pre-market' : 'after hours'; return 'close'; }

  /* ---------- Markets board ---------- */
  var mk = document.querySelector('[data-mk]');
  var FUT = { '.SPX': '@SP.1', '.IXIC': '@ND.1', '.DJI': '@DJ.1' };
  var GN = { tc: 'Bitcoin Treasury Companies', desk: 'Crypto', us: 'US stocks', rt: 'Rates · Dollar · Volatility', cm: 'Commodities (futures)', gl: 'Global Indexes', mag: 'Magnificent 7 · Top Stocks', mine: 'My Picks' };
  var MKT = { BTC: ['BTC-USD'], ETH: ['ETH-USD'], SOL: ['SOL-USD'], '.SPX': ['SPX', 'S&P 500'], '.IXIC': ['IXIC', 'Nasdaq'], '.DJI': ['DJI', 'Dow'], '.RUT': ['RUT', 'Russell 2000'], '@GC.1': ['GC=F', 'Gold futures'], '@SI.1': ['SI=F', 'Silver futures'], '@CL.1': ['CL=F', 'WTI oil futures'], '@HG.1': ['HG=F', 'Copper futures'], '@NG.1': ['NG=F', 'Natural gas futures'], '.DXY': ['DXY', 'US dollar index'], '.VIX': ['VIX', 'Volatility index'], US2Y: ['US2Y', '2-year Treasury yield'], US5Y: ['US5Y', '5-year yield'], US10Y: ['US10Y', '10-year Treasury yield'], US30Y: ['US30Y', '30-year yield'], 'JPY=': ['USDJPY', 'Dollar in yen'], '.N225': ['N225', 'Nikkei'], '.STOXX': ['SXXP', 'Stoxx 600'], '.FTSE': ['UKX', 'FTSE 100'], '.GDAXI': ['DAX', 'Germany'], '.HSI': ['HSI', 'Hang Seng'], '.KS11': ['KOSPI', 'Korea'], '.SSEC': ['SSEC', 'Shanghai'], MNAV: ['mNAV', 'MSTR value ÷ its bitcoin'], T10: ['T10', 'Desk Treasury 10'], STREET: ['MSTR', 'Street Sentiment'], MTPLF: ['MTPLF', 'Metaplanet'], '3350.T': ['3350.T', 'Metaplanet'], MPJPY: ['MPJPY', 'Metaplanet (US ADR)'], MSTR: ['MSTR', 'Strategy'], ASST: ['ASST', 'Strive'], MARA: ['MARA', 'MARA Holdings'], COIN: ['COIN', 'Coinbase'], HOOD: ['HOOD', 'Robinhood'], CRCL: ['CRCL', 'Circle'], IBIT: ['IBIT', 'iShares Bitcoin ETF'], 'EUR=': ['EURUSD', 'Euro in dollars'] };
  var FUTL = { '@SP.1': 'ES=F', '@ND.1': 'NQ=F', '@DJ.1': 'YM=F', '@RTY.1': 'RTY=F' };
  var TIPS = { S2S10: '2s10s = US 10-year minus 2-year Treasury yield, in basis points (1 bp = 0.01%). Below zero = inverted curve. CNBC quotes.', BTC: 'BTC-USD, Coinbase live feed (every trade)', MNAV: 'Strategy method: enterprise value ÷ bitcoin NAV, recomputed live from MSTR and BTC', T10: 'Desk Treasury 10: the top 10 public bitcoin treasury stocks, average day move weighted by BTC held. Desk calculation.', STREET: 'MSTR analysts: 60% ratings mix + 40% average-target upside vs the live price (0–100). Analysts\u2019 views, not ours.' };
  var MKDEF = [['MSTR', 'Strategy MSTR', 'tc'], ['MPJPY', 'Metaplanet MPJPY', 'tc'], ['ASST', 'Strive ASST', 'tc'], ['MARA', 'MARA Holdings', 'tc'], /* BTC lives in the hero above (addable from the catalog); indexes live in the row under the chart, so they sit lower here */
    ['ETH', 'Ether', 'desk'], ['SOL', 'Solana', 'desk'],
    ['US2Y', 'US 2Y', 'rt'], ['US10Y', 'US 10Y', 'rt'], ['S2S10', '2s10s spread', 'rt'], ['.DXY', 'Dollar DXY', 'rt'], ['.VIX', 'VIX', 'rt'], ['@GC.1', 'Gold', 'cm'], ['@SI.1', 'Silver', 'cm'], ['@CL.1', 'WTI oil', 'cm'],
    ['.N225', 'Nikkei 225', 'gl'], ['.STOXX', 'Stoxx 600', 'gl'], ['AAPL', 'AAPL', 'mag'], ['MSFT', 'MSFT', 'mag'], ['NVDA', 'NVDA', 'mag'], ['GOOGL', 'GOOGL', 'mag'], ['AMZN', 'AMZN', 'mag'], ['META', 'META', 'mag'], ['TSLA', 'TSLA', 'mag'],
    ['.SPX', 'S&P 500', 'us'], ['.IXIC', 'Nasdaq', 'us'], ['.DJI', 'Dow', 'us'], ['.RUT', 'Russell 2000', 'us']];
  var MKCAT = MKDEF.concat([['BTC', 'Bitcoin', 'desk'], ['MNAV', 'MSTR mNAV · live', 'desk'], ['T10', 'Treasury 10 · day', 'desk'], ['STREET', 'Street Sentiment', 'desk'], ['US5Y', 'US 5Y', 'rt'], ['US30Y', 'US 30Y', 'rt'], ['EUR=', 'EUR/USD', 'rt'], ['JPY=', 'USD/JPY', 'rt'], ['@HG.1', 'Copper', 'cm'], ['@NG.1', 'Natural gas', 'cm'], ['.FTSE', 'FTSE 100', 'gl'], ['.GDAXI', 'DAX', 'gl'], ['.HSI', 'Hang Seng', 'gl'], ['.KS11', 'KOSPI', 'gl'], ['.SSEC', 'Shanghai', 'gl'],
    ['COIN', 'COIN', 'mag'], ['HOOD', 'HOOD', 'mag'], ['AVGO', 'AVGO', 'mag'], ['CRCL', 'CRCL', 'mag'], ['IBIT', 'IBIT (BTC ETF)', 'mag'], ['GLD', 'GLD', 'mag'], ['BTC.CM=', 'CME BTC futures', 'desk']]);
  var MK_RX = /^[A-Z0-9.@=\-]{1,12}$/;
  function mkGet() { var o = null; try { o = JSON.parse(LS.get('btd_mk') || 'null'); } catch (e) {} if (!Array.isArray(o) || !o.length) return MKDEF.slice();
    var out = o.filter(function (x) { return Array.isArray(x) && MK_RX.test(x[0]) && GN[x[2]]; }).map(function (x) { return [x[0], String(x[1]).slice(0, 22), x[2]]; }).slice(0, 48); return out; }
  function mkSave(L) { if (JSON.stringify(L) === JSON.stringify(MKDEF)) LS.del('btd_mk'); else LS.set('btd_mk', JSON.stringify(L)); }
  function tile(k, label, cls2, tip) { var L = /^X:/.test(k) ? [k.slice(2) + 'x', 'token'] : MKT[k] || [k.replace(/^[.@]/, ''), '']; if (!tip) tip = /^X:/.test(k) ? '' : L[0] + ' · source: CNBC quote service (may be delayed)';
    return '<div class="mk-t ' + (cls2 || '') + '" data-mt="' + esc(k) + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span class="mk-l"><b class="mk-tk">' + esc(L[0]) + '</b>' + (L[1] ? ' <span class="mk-nm">' + esc(L[1]) + '</span>' : '') + '</span><b class="mk-v">…</b><span class="mk-c"></span><span class="mk-x"></span></div>'; }
  function grp(id, name, inner, extra) { return '<div class="mk-g mk-' + id + '"' + (extra || '') + '><div class="mk-gh">' + esc(name) + '</div><div class="mk-gt">' + inner + '</div></div>'; }
  var MKL = mkGet();
  function mkBuild() { if (!mk) return; var after = F.session() !== 'open'; MKL = mkGet(); var by = {}, order = [];
    MKL.forEach(function (x) { if (!by[x[2]]) { by[x[2]] = []; order.push(x[2]); } by[x[2]].push(x); });
    var html = order.map(function (g) { var name = g === 'us' && after ? 'US stocks · futures ' + (F.session() === 'pre' ? 'pre-market' : 'overnight') : GN[g];
      var h = grp(g, name, by[g].map(function (x) { return tile(x[0], x[1], x[0] === 'BTC' ? 'mk-big' : x[0] === 'MSTR' && g === 'tc' ? 'mk-big2' : g === 'mag' ? 'mk-sm' : '', TIPS[x[0]]); }).join(''));
      return h; }).join('');
    mk.innerHTML = '<div class="mk-top"><b class="mk-title">Markets</b><span class="mk-sess" data-mk-sess></span><span class="mk-upd" data-mk-upd></span><button type="button" class="chip mk-unit" data-mk-unit title="Show every change as % or as amount ($, points, bp)">' + (window.BTD_CTX && window.BTD_CTX.global() === 'amt' ? '$ \u2192 %' : '% \u2192 $') + '</button><button type="button" class="chip mk-ed" data-mk-edit aria-haspopup="dialog">✎ Customize</button></div>' + (after ? '<a class="mk-tokl" href="#tokenized">Stocks closed: see 24/7 tokenized prices \u2193</a>' : '') + '<div class="mk-grid">' + html + '</div>';
    var w = ['MSTR']; MKL.forEach(function (x) { if (['BTC', 'ETH', 'SOL', 'MNAV', 'T10', 'STREET', 'S2S10'].indexOf(x[0]) < 0) w.push(x[0]); if (FUT[x[0]]) w.push(FUT[x[0]]); });
    F.watch(w); mkAll(); }
  /* board editor: add / remove / reorder, saved in this browser, reset to the standard board */
  var mke = null;
  function mkEdit() { if (mke) { mke.remove(); mke = null; return; } mke = document.createElement('div'); mke.className = 'cz'; mke.setAttribute('role', 'dialog'); mke.setAttribute('aria-modal', 'true'); mke.setAttribute('aria-label', 'Customize the markets board');
    var paintE = function (msg) { var have = {}; MKL.forEach(function (x) { have[x[0]] = 1; });
      mke.innerHTML = '<div class="cz-box"><div class="cz-h"><b>Customize the markets board</b><button type="button" class="cz-x" data-e-x aria-label="Close">&times;</button></div><p class="cz-s">Add, remove and reorder tiles. Saved in this browser. The treasury-companies window has its own editor.</p>' +
        '<ol class="cz-l">' + MKL.map(function (x, i) { return '<li><span><b>' + esc(x[1]) + '</b> <small class="muted">' + esc(GN[x[2]]) + '</small></span><button type="button" data-e-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(x[1]) + ' up">&#9650;</button><button type="button" data-e-dn="' + i + '"' + (i < MKL.length - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(x[1]) + ' down">&#9660;</button><button type="button" data-e-rm="' + i + '"' + (x[0] === 'BTC' ? ' disabled title="BTC always stays"' : '') + ' aria-label="Remove ' + esc(x[1]) + '">&times;</button></li>'; }).join('') + '</ol>' +
        '<div class="cz-f"><label class="sr-only" for="mk-add">Add a tile</label><select id="mk-add" data-e-sel><option value="">Add a market…</option>' + MKCAT.filter(function (x) { return !have[x[0]]; }).map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + ' · ' + esc(GN[x[2]]) + '</option>'; }).join('') + '</select>' +
        '<form data-e-form style="display:flex;gap:6px"><input data-e-in maxlength="12" placeholder="or any ticker (e.g. PLTR)" aria-label="Add any ticker"><button class="chip" type="submit">Add</button></form></div>' +
        '<div class="cz-f"><button type="button" class="chip" data-e-reset>Reset to standard board</button><button type="button" class="chip on" data-e-x>Done</button></div><p class="cz-msg" role="status">' + esc(msg || '') + '</p></div>'; };
    var commit = function (msg) { mkSave(MKL); mkBuild(); paintE(msg); };
    mke.addEventListener('click', function (e) { if (e.target === mke) { mkEdit(); return; } var b = e.target.closest('button'); if (!b) return; var i;
      if (b.hasAttribute('data-e-x')) { mkEdit(); return; }
      if (b.dataset.eUp) { i = +b.dataset.eUp; MKL.splice(i - 1, 0, MKL.splice(i, 1)[0]); commit(); } else if (b.dataset.eDn) { i = +b.dataset.eDn; MKL.splice(i + 1, 0, MKL.splice(i, 1)[0]); commit(); }
      else if (b.dataset.eRm) { i = +b.dataset.eRm; var r = MKL.splice(i, 1)[0]; commit('Removed ' + r[1] + '.'); } else if (b.hasAttribute('data-e-reset')) { LS.del('btd_mk'); MKL = MKDEF.slice(); mkBuild(); paintE('Back to the standard board.'); } });
    mke.addEventListener('change', function (e) { if (!e.target.matches('[data-e-sel]') || !e.target.value) return; var x = MKCAT.filter(function (y) { return y[0] === e.target.value; })[0]; if (x) { MKL.push(x.slice()); commit('Added ' + x[1] + '.'); } });
    mke.addEventListener('submit', function (e) { e.preventDefault(); var v = mke.querySelector('[data-e-in]').value.trim().toUpperCase(); if (!MK_RX.test(v)) return; F.watch([v]); var t = 0, iv = setInterval(function () { var q = F.get(v); t++;
      if (q && q.px != null) { clearInterval(iv); MKL.push([v, (q.sn || v).slice(0, 18), 'mine']); commit('Added ' + v + '.'); } else if ((q && q.none) || t > 20) { clearInterval(iv); paintE('No quote found for ' + v + '.'); } }, 300); });
    document.body.appendChild(mke); paintE(); var x0 = mke.querySelector('[data-e-x]'); if (x0) x0.focus(); }
  document.addEventListener('keydown', function (e) { if (mke && e.key === 'Escape') mkEdit(); });
  function setT(k, v, chg, x, title) { if (/\.T$/.test(k) && v && v[0] !== '¥' && v !== '…') v = '¥' + v; var el = mk && mk.querySelector('[data-mt="' + k + '"]'); if (!el) return; var vb = el.querySelector('.mk-v'), old = vb.textContent;
    vb.textContent = v; if (old !== '…' && old !== v) flash(vb, parseFloat(v.replace(/[^0-9.\-]/g, '')) > parseFloat(old.replace(/[^0-9.\-]/g, '')) ? 1 : -1);
    var c = el.querySelector('.mk-c'), X = window.BTD_CTX, q = F.get(k), ses = F.session(); c.innerHTML = chg ? esc(chg[0]) + (X && chg[0] && !/^(MNAV|T10|STREET)$/.test(k) ? ' <small class="mk-tf">' + X.tf(k, q, ses) + '</small>' : '') : ''; c.className = 'mk-c ' + (chg ? chg[1] : ''); var fq = X && chg && q && !/^(MNAV|T10|STREET)$/.test(k) ? X.fmt(k, q) : null; if (fq) { c.setAttribute('data-spk', k); c.setAttribute('role', 'button'); c.setAttribute('tabindex', '0'); c.title = X.tip; c.innerHTML = esc(fq.t) + ' <small class="mk-tf">' + (fq.r === '1D' ? X.tf(k, q, ses) : fq.r) + '</small>'; c.className = 'mk-c ' + cls(fq.v); } el.querySelector('.mk-x').innerHTML = x || ''; if (title) el.title = title;
    if (X) { var kx = el.querySelector('.mk-k'); if (!kx) { kx = document.createElement('span'); kx.className = 'mk-k'; el.appendChild(kx); } var live = q && q.px != null ? q.px : null, rd = X.read(k, live), sp = X.spark(k, live, q && q.chp);
      if (k === 'MNAV' && DESK && DESK.strategy) rd = 'vs ' + DESK.strategy.mnav.toFixed(2) + 'x official close' + (DESK.strategy.mnav_date ? ' (' + esc(DESK.strategy.mnav_date) + ')' : '');
      kx.innerHTML = (sp || (X.get(k) ? '' : '')) + (rd ? '<small class="mk-rd">' + rd + '</small>' : (/^(\.VIX|\.DXY|US\d+Y)$/.test(k) ? X.range(k, live) : '')); } }
  function qTile(sym, opt) { opt = opt || {}; var q = F.get(sym); if (!q || q.px == null) return; var s = F.session(), main = q.px, ch = q.chp, x = '';
    if (q.yld) { setT(sym, q.px.toFixed(3) + '%', [(q.ch >= 0 ? '+' : '−') + Math.abs(q.ch * 100).toFixed(1) + ' bp', cls(q.ch)], s === 'open' ? '<small>yield · live</small>' : '<small>yield · last close</small>', sym + ' Treasury yield. bp = basis point = 0.01 percentage point. Source: CNBC quote service (may be delayed)'); return; }
    if (q.ext && s !== 'open') x = '<em title="' + (q.ext.kind === 'pre' ? 'Pre = pre-market trading, 4:00\u20139:30 AM ET' : 'AH = after-hours trading, 4:00\u20138:00 PM ET') + '">' + (q.ext.kind === 'pre' ? 'Pre' : 'AH') + '</em> ' + lv(q.ext.px) + ' <span class="' + cls(q.ext.chp) + '">' + pc(q.ext.chp) + '</span>';
    var fs = opt.fut || FUT[sym]; if (fs) { var f = F.get(fs); if (f && f.px != null && s !== 'open') x = '<em title="Futures (front-month contract), trade nearly 24 hours on weekdays">' + (FUTL[fs] || 'Fut') + '</em> ' + lv(f.px) + ' <span class="' + cls(f.chp) + '">' + pc(f.chp) + '</span>'; }
    if (s !== 'open' && !x && q.chp != null && !/^@/.test(sym)) x = '<small>' + (q.cached ? 'cached ' : '') + 'last close</small>';
    setT(sym, opt.usd ? px(main, q.cur) : lv(main), [pc(ch), cls(ch)], x); }
  function mkCrypto(k) { var q = F.get(k); if (!q) return; setT(k, px(q.px), [pc(q.chp), cls(q.chp)], k === 'BTC' ? '<small>24h H ' + n(q.hi, 0) + ' L ' + n(q.lo, 0) + '</small>' : ''); }
  function mstrPx() { var q = F.get('MSTR'); if (!q || q.px == null) return null; return q.ext && F.session() !== 'open' ? q.ext.px : q.px; }
  function mkDesk() { if (!mk) return; mkCrypto('BTC'); mkCrypto('ETH'); mkCrypto('SOL'); qTile('MSTR', { usd: 1 });
    var b = F.get('BTC'), m = mstrPx(); if (DESK && b && m && window.btdLiveMnav) { var mn = window.btdLiveMnav(DESK.strategy.kpis, m, b.px); if (mn) setT('MNAV', mn.toFixed(3) + 'x', null, '<small>' + (mn < 1 ? 'zone: below 1x (under its BTC value)' : mn < 2 ? 'zone: 1\u20132x' : 'zone: above 2x') + ' · close ' + DESK.strategy.mnav.toFixed(2) + 'x</small>'); }
    else if (DESK && b && m) { var K = DESK.strategy.kpis.live, sh = K.market_cap_musd / K.mstr_close, cash = K.market_cap_musd + K.debt_musd + K.pref_musd - K.ev_musd, mv = (m * sh + K.debt_musd + K.pref_musd - cash) / (K.btc_held * b.px / 1e6); setT('MNAV', mv.toFixed(3) + 'x', null, '<small>EV ÷ BTC NAV</small>'); }
    /* 2s10s: 10Y minus 2Y yield in basis points (CNBC quotes); change vs prior close from each yield's own change */
    var y10 = F.get('US10Y'), y2 = F.get('US2Y'); if (y10 && y2 && y10.px != null && y2.px != null) { var sp = Math.round((y10.px - y2.px) * 100), dc = y10.ch != null && y2.ch != null ? Math.round((y10.ch - y2.ch) * 100) : null;
      setT('S2S10', (sp >= 0 ? '+' : '\u2212') + Math.abs(sp) + ' bp', dc != null ? [(dc >= 0 ? '+' : '\u2212') + Math.abs(dc) + ' bp', cls(dc)] : null, '<small>' + (sp < 0 ? 'inverted (2Y above 10Y)' : sp < 25 ? 'flat curve' : 'positive slope') + ' \u00b7 US10Y ' + y10.px.toFixed(2) + '% \u2212 US2Y ' + y2.px.toFixed(2) + '%</small>'); }
    // Treasury 10
    var tw = 0, ts = 0, cnt = 0; LB.slice(0, 12).forEach(function (c) { var s = F.cn(c.ticker), q = s && F.get(s); if (!q || q.chp == null || cnt >= 10) return; var ch = q.ext && F.session() !== 'open' ? ((q.ext.px / q.prev) - 1) * 100 : q.chp; if (!isFinite(ch)) ch = q.chp; tw += c.btc; ts += c.btc * ch; cnt++; });
    if (cnt >= 5) { var t10 = ts / tw; setT('T10', pc(t10), null, '<small>' + cnt + ' stocks · BTC-weighted' + (F.session() !== 'open' ? ' · incl. ext. hrs' : '') + '</small>'); var el = mk.querySelector('[data-mt="T10"] .mk-v'); if (el) el.className = 'mk-v ' + cls(t10); }
    // Street Sentiment (MSTR)
    var a = AN && AN.cos && AN.cos.MSTR; if (a && m) { var nA = a.buy + a.hold + a.sell, mix = (a.buy + a.hold * 0.5) / nA * 100, up = (a.pt / m - 1) * 100, sc = Math.round(mix * 0.6 + Math.max(0, Math.min(100, (up + 50) / 150 * 100)) * 0.4), wd = sc >= 65 ? 'Bullish' : sc >= 40 ? 'Mixed' : 'Bearish';
      setT('STREET', sc + ' ' + wd, null, '<small>' + a.buy + '/' + nA + ' Buy · target $' + n(a.pt, 0) + ' (' + pc(up, 0) + ')</small>'); var e2 = mk.querySelector('[data-mt="STREET"] .mk-v'); if (e2) e2.className = 'mk-v ' + (wd === 'Bullish' ? 'up' : wd === 'Bearish' ? 'dn' : ''); } }
  if (window.BTD_CTX) window.BTD_CTX.on(function () { try { mkAll(); } catch (e) {} });
  if (window.BTD_CTX) window.BTD_CTX.onRange(function () { try { mkAll(); } catch (e) {} });
  function mkAll() { if (!mk) return; mkDesk(); MKL.forEach(function (x) { if (['BTC', 'ETH', 'SOL', 'MNAV', 'T10', 'STREET', 'S2S10', 'MSTR'].indexOf(x[0]) < 0) qTile(x[0], x[2] === 'tc' ? { usd: 1 } : undefined); });
    var s = F.session(), lab = { open: 'US market open · live', pre: 'Pre-market · 4:00–9:30 AM ET', post: 'After hours · 4:00–8:00 PM ET', closed: 'US market closed · futures & 24/7 tokenized shown' }[s];
    var se = mk.querySelector('[data-mk-sess]'); se.textContent = lab; se.className = 'mk-sess s-' + s; }
  var upd = 0; function stamp() { var e = mk && mk.querySelector('[data-mk-upd]'); if (e) e.textContent = 'updated ' + new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' }) + ' ET'; }
  if (mk) { mkBuild(); mk.addEventListener('click', function (e) { if (e.target.closest('[data-mk-edit]')) mkEdit(); var ub = e.target.closest('[data-mk-unit]'); if (ub && window.BTD_CTX) { var X = window.BTD_CTX; X.setGlobal(X.global() === 'amt' ? 'pct' : 'amt'); ub.textContent = X.global() === 'amt' ? '$ \u2192 %' : '% \u2192 $'; } }); F.on('BTC', function () { mkCrypto('BTC'); mkDesk(); if (Date.now() - upd > 1000) { upd = Date.now(); stamp(); } }); F.on('ETH', function () { mkCrypto('ETH'); }); F.on('SOL', function () { mkCrypto('SOL'); });
    F.on('quotes', function () { mkAll(); stamp(); }); F.on('session', function () { mkBuild(); }); Promise.all([dP, lP]).then(function () { F.watch(LB.slice(0, 12).map(function (c) { return F.cn(c.ticker); }).filter(Boolean)); mkAll(); }); }

  /* ---------- Treasury companies window: standard list (BTC + top 12 by BTC held) or your own list; Movers view; own editor + reset ---------- */
  var wl = document.querySelector('[data-wl]'), WT = LS.get('btd_wlt') === 'movers' ? 'movers' : 'core', WE = false;
  function wlDef() { return ['BTC'].concat(LB.slice(0, 12).map(function (c) { return F.cn(c.ticker); }).filter(Boolean)); }
  function wlGet() { var o = null; try { o = JSON.parse(LS.get('btd_tw') || 'null'); } catch (e) {} return Array.isArray(o) && o.length ? o.filter(function (x) { return /^[A-Z0-9.@=\-]{1,12}$/.test(x); }).slice(0, 40) : wlDef(); }
  function wlSave(a) { if (a.join() === wlDef().join()) LS.del('btd_tw'); else LS.set('btd_tw', JSON.stringify(a)); }
  function lbOf(cn) { return LB.filter(function (c) { return F.cn(c.ticker) === cn; })[0]; }
  function row(sym, i, n0) { var crypto = ['BTC', 'ETH', 'SOL'].indexOf(sym) >= 0, q = F.get(sym), c = lbOf(sym), b = F.get('BTC'), s = F.session(); var nm = crypto ? { BTC: 'Bitcoin', ETH: 'Ether', SOL: 'Solana' }[sym] : c ? c.name : q && q.name ? q.name : sym;
    var last = q && q.px != null ? (crypto ? px(q.px) : px(q.px, q.cur)) : '…', ch = q ? q.chp : null, ext = !crypto && q && q.ext && s !== 'open' ? '<em title="' + (q.ext.kind === 'pre' ? 'Pre = pre-market trading, 4:00\u20139:30 AM ET' : 'AH = after-hours trading, 4:00\u20138:00 PM ET') + '">' + (q.ext.kind === 'pre' ? 'Pre' : 'AH') + '</em> <span class="' + cls(q.ext.chp) + '">' + pc(q.ext.chp) + '</span>' : '';
    var mn = ''; if (c && (c.sub === 'treasury' || c.subtype === 'treasury' || c.subtype === 'miner') && q && q.px && b && c.currency === 'USD' && c.stock_price && c.market_cap_basic && c.btc) { var p = q.ext && s !== 'open' ? q.ext.px : q.px, v = (c.market_cap_basic / c.stock_price * p) / (c.btc * b.px); if (isFinite(v) && v < 50) mn = v.toFixed(2) + 'x'; }
    var ed = WE && WT === 'core' ? '<td class="c-ed"><button type="button" data-w-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(sym) + ' up">&#9650;</button><button type="button" data-w-dn="' + i + '"' + (i < n0 - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(sym) + ' down">&#9660;</button><button type="button" data-w-rm="' + i + '" aria-label="Remove ' + esc(sym) + '">&times;</button></td>' : '';
    return '<tr data-wr="' + esc(sym) + '"><td class="c-sy"><b>' + esc(sym) + '</b><small>' + esc(String(nm).slice(0, 26)) + '</small></td><td class="r c-px" data-wpx>' + last + '</td><td class="r ' + cls(ch) + '">' + pc(ch) + (ext ? '<small class="wx">' + ext + '</small>' : '') + '</td>' +
      '<td class="r c-mn" title="Basic mNAV, live: market cap ÷ value of BTC held">' + mn + '</td><td class="r c-bh" title="' + (c ? n(c.btc, 0) + ' BTC' : '') + '">' + (c ? (c.btc >= 1e4 ? n(c.btc / 1e3, 1) + 'K' : n(c.btc, 0)) : '') + '</td>' + ed + '</tr>'; }
  function wlList() { if (WT === 'movers') { var a = LB.map(function (c) { return F.cn(c.ticker); }).filter(function (s) { var q = s && F.get(s); return q && q.chp != null; });
      var mv = function (q) { return q.ext && F.session() !== 'open' && q.ext.chp != null ? q.chp + q.ext.chp : q.chp; }; a.sort(function (x, y) { return Math.abs(mv(F.get(y))) - Math.abs(mv(F.get(x))); }); return a.slice(0, 12); }
    return wlGet(); }
  function prefRows() { var R = DESK && DESK.prefs_desk ? DESK.prefs_desk.rows : []; return R.filter(function (r) { return ['STRC', 'STRF', 'STRK', 'STRD', 'SATA'].indexOf(r.t) >= 0; }).map(function (r) { var q = F.get(r.t), p = q && q.px != null ? q.px : r.close, ch = q ? q.chp : r.prev ? (r.close / r.prev - 1) * 100 : null;
      return '<tr><td><b>' + esc(r.t) + '</b><small>' + esc(r.issuer + ' ' + r.name) + '</small></td><td class="r">$' + p.toFixed(2) + (q ? '' : ' <small>close</small>') + '</td><td class="r ' + cls(ch) + '">' + pc(ch) + '</td><td class="r">' + r.rate.toFixed(2) + '%</td><td class="r"><b>' + (r.rate * (r.par || 100) / p).toFixed(2) + '%</b></td></tr>'; }).join(''); }
  function wlPaint() { if (!wl) return; var L = wlList();
    wl.querySelector('[data-wl-body]').innerHTML = L.map(function (s, i) { return row(s, i, L.length); }).join('') || '<tr><td colspan="5" class="muted">Loading…</td></tr>';
    wl.querySelectorAll('[data-wl-t]').forEach(function (b) { var on = b.dataset.wlT === WT; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    var ebtn = wl.querySelector('[data-wl-edit]'); ebtn.hidden = WT !== 'core'; ebtn.textContent = WE ? 'Done' : '✎ Customize'; ebtn.setAttribute('aria-pressed', WE);
    wl.querySelector('[data-wl-tools]').hidden = !(WE && WT === 'core'); wl.querySelector('.wl').classList.toggle('editing', WE && WT === 'core'); var pr = wl.querySelector('[data-wl-pref]'); if (pr) pr.innerHTML = prefRows();
    var custom = !!LS.get('btd_tw'); wl.querySelector('[data-wl-note]').textContent = WT === 'movers' ? 'Biggest day moves among the top 50 treasury stocks' + (F.session() !== 'open' ? ', including pre-market / after-hours' : '') + '.' : custom ? 'Your list · saved in this browser.' : 'Standard list: BTC and the top 12 public companies by bitcoin held. Customize to make it yours.'; }
  if (wl) {
    wl.innerHTML = '<div class="p-h"><span class="p-t">Treasury companies</span><div class="seg" role="tablist" aria-label="Window view"><button type="button" role="tab" data-wl-t="core">Watchlist</button><button type="button" role="tab" data-wl-t="movers">Movers</button></div><button type="button" class="chip" data-wl-edit aria-pressed="false">✎ Customize</button></div>' +
      '<div class="wl-tools" data-wl-tools hidden><form data-wl-add><select data-wl-sel aria-label="Add a top-50 company"><option value="">Add from top 50…</option></select><input data-wl-in maxlength="12" placeholder="or any ticker" aria-label="Add any ticker" autocomplete="off"><button class="chip" type="submit">Add</button></form><button type="button" class="chip" data-wl-reset>Reset to standard</button><span class="wl-msg" data-wl-msg role="status"></span></div>' +
      '<div class="wl-wrap"><table class="wl"><thead><tr><th>Symbol</th><th class="r">Last</th><th class="r">Day</th><th class="r" title="Basic mNAV, live">mNAV</th><th class="r c-bh">BTC held</th></tr></thead><tbody data-wl-body></tbody></table></div>' +
      '<p class="wl-note" data-wl-note></p>' +
      '<details class="wl-pref" data-wl-pdet><summary>Preferreds <small>STRC · STRF · STRK · STRD · SATA</small><a href="/preferreds/">Yield Desk →</a></summary><table class="wl wl-p"><thead><tr><th>Pref</th><th class="r">Price</th><th class="r">Day</th><th class="r">Rate</th><th class="r" title="Stated rate on $100 par ÷ price">Eff. yield</th></tr></thead><tbody data-wl-pref></tbody></table></details>';
    var det = wl.querySelector('[data-wl-pdet]'); if (LS.get('btd_wlp') === '1') det.open = true; det.addEventListener('toggle', function () { LS.set('btd_wlp', det.open ? '1' : '0'); });
    var addOne = function (s) { var a = wlGet(); if (a.indexOf(s) < 0) a.push(s); wlSave(a); wlPaint(); wl.querySelector('[data-wl-msg]').textContent = 'Added ' + s + '.'; };
    wl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var a = wlGet(), i;
      if (b.dataset.wlT) { WT = b.dataset.wlT; LS.set('btd_wlt', WT); wlPaint(); }
      else if (b.hasAttribute('data-wl-edit')) { WE = !WE; wlPaint(); }
      else if (b.dataset.wUp) { i = +b.dataset.wUp; a.splice(i - 1, 0, a.splice(i, 1)[0]); wlSave(a); wlPaint(); }
      else if (b.dataset.wDn) { i = +b.dataset.wDn; a.splice(i + 1, 0, a.splice(i, 1)[0]); wlSave(a); wlPaint(); }
      else if (b.dataset.wRm) { a.splice(+b.dataset.wRm, 1); wlSave(a.length ? a : wlDef()); wlPaint(); }
      else if (b.hasAttribute('data-wl-reset')) { LS.del('btd_tw'); wlPaint(); wl.querySelector('[data-wl-msg]').textContent = 'Back to the standard list.'; } });
    wl.addEventListener('change', function (e) { if (e.target.matches('[data-wl-sel]') && e.target.value) { var s = F.cn(e.target.value) || e.target.value; F.watch([s]); addOne(s); e.target.value = ''; } });
    wl.addEventListener('submit', function (e) { e.preventDefault(); var inp = wl.querySelector('[data-wl-in]'), v = inp.value.trim().toUpperCase(), msg = wl.querySelector('[data-wl-msg]'); if (!v) return; if (!/^[A-Z0-9.@=\-]{1,12}$/.test(v)) { msg.textContent = 'Use a ticker like GLXY or .SPX'; return; }
      var s = ['BTC', 'ETH', 'SOL'].indexOf(v) >= 0 ? v : F.cn(v) || v; if (['BTC', 'ETH', 'SOL'].indexOf(s) >= 0) { addOne(s); inp.value = ''; return; } msg.textContent = 'Checking ' + s + '…'; F.watch([s]);
      var tries = 0, iv = setInterval(function () { var q = F.get(s); tries++; if (q && q.px != null) { clearInterval(iv); inp.value = ''; addOne(s); } else if ((q && q.none) || tries > 20) { clearInterval(iv); msg.textContent = 'No quote found for ' + v + '.'; } }, 300); });
    Promise.all([dP, lP]).then(function () { wl.querySelector('[data-wl-sel]').innerHTML = '<option value="">Add from top 50…</option>' + LB.map(function (c) { return '<option value="' + esc(c.ticker) + '">#' + esc(c.rank) + ' ' + esc(c.ticker) + ' · ' + esc(c.name.slice(0, 24)) + '</option>'; }).join('');
      F.watch(LB.map(function (c) { return F.cn(c.ticker); }).filter(Boolean).concat(wlGet().filter(function (s) { return ['BTC', 'ETH', 'SOL'].indexOf(s) < 0; }), ['STRC', 'STRF', 'STRK', 'STRD', 'SATA'])); wlPaint(); });
    var wlT = 0; F.on('quotes', function () { if (!WE) wlPaint(); }); F.on('BTC', function () { if (Date.now() - wlT > 2000) { wlT = Date.now(); var r = wl.querySelector('[data-wr="BTC"] [data-wpx]'), q = F.get('BTC'); if (r && q) { var o = r.textContent; r.textContent = px(q.px); if (o !== r.textContent) flash(r, q.dir); } } }); }

  /* ---------- Crypto market ---------- */
  /* Crypto overall impression: compact, BTC-first context (no coin lists, no gainers). All feeds are 24/7. */
  var cx = document.querySelector('[data-cx]');
  if (cx) {
    var K = function (k, lab, tip) { return '<div class="cx-k"' + (tip ? ' title="' + tip + '"' : '') + '><span>' + lab + '</span><b data-cx="' + k + '">…</b><small data-cx="' + k + '-s"></small><span class="mk-k" data-cx-sp="' + k + '"></span></div>'; };
    cx.innerHTML = '<div class="p-h"><span class="p-t">Crypto at a glance</span><span class="tag">BTC-first · live 24/7</span></div>' +
      '<p class="cx-read" data-cx="read">Reading the market…</p><div class="cx">' +
      K('dom', 'Bitcoin dominance', 'Bitcoin\u2019s share of total crypto market value (CoinGecko). 24h change is a Desk calc from BTC and total-cap moves.') +
      K('tot', 'Total crypto market cap', 'All crypto market value in USD (CoinGecko).') +
      K('alt', 'Altcoin market cap', 'Total crypto market value excluding bitcoin (all coins except BTC, TOTAL2-style). Desk calc from CoinGecko.') +
      K('eth', 'ETH-USD', 'Ether spot price, Coinbase live feed.') + K('sol', 'SOL-USD', 'Solana spot price, Coinbase live feed.') +
      ['eth', 'sol'].map(function (a) { return '<div class="cx-k cx-r" data-rt="' + a + '"><button type="button" class="cx-rl" data-rt-flip="' + a + '" title="Tap to flip between ' + a.toUpperCase() + '/BTC and BTC/' + a.toUpperCase() + '"></button><b data-rt-v>\u2026</b><small class="cx-rline" data-rt-line></small><small data-rt-ch></small><span class="mk-k" data-rt-sp></span><span class="cx-rb" data-rt-rb></span></div>'; }).join('') +
      K('stb', 'Stablecoin supply', 'All USD-pegged stablecoins across chains (DefiLlama). Growing supply = more on-chain dollars that can move into crypto quickly; context, not a forecast.') +
      '<div class="cx-k" title="Crypto Fear &amp; Greed Index (alternative.me), 0 = extreme fear, 100 = extreme greed. Reference: its own 30-day average."><span>Fear &amp; Greed</span><b data-live="fng">…</b><small data-live="fng-cls"></small><small class="mk-rd" data-cx="fng-r"></small></div>' +
      '</div><div class="cx-m" title="Desk calc (our own gauge): share of the top 50 altcoins (ex-stablecoins and wrapped tokens) beating BTC over 30 days. 75+ = altcoin season, 25 or less = bitcoin season."><div class="cx-mh"><span>Altcoin-season gauge \u00b7 our calc, last 30 days</span><b data-cx="szn">…</b></div><div class="cx-bar"><i data-cx="szn-i"></i></div><div class="cx-sc"><span>Bitcoin season</span><span>Altcoin season</span></div></div>' +
      '<p class="p-f">CoinGecko (caps, dominance, breadth), Coinbase (BTC, ETH, SOL), DefiLlama (stablecoins), alternative.me (Fear &amp; Greed). Context for a Bitcoin desk, not a coin list. Education only.</p>';
    var set = function (k, v, c) { var e = cx.querySelector('[data-cx="' + k + '"]'); if (e) { e.textContent = v; if (c != null) e.className = c; } };
    var DD = null, ST = null, SZ = null;
    var read = function () { var parts = [];
      if (DD != null) parts.push(DD > 0.15 ? 'BTC dominance rising: money concentrating in Bitcoin.' : DD < -0.15 ? 'BTC dominance slipping: alts outpacing Bitcoin today.' : 'BTC dominance steady: crypto moving largely together.');
      if (ST != null) parts.push(ST > 0.5 ? 'Stablecoin supply growing (more dollars on-chain).' : ST < -0.5 ? 'Stablecoin supply shrinking.' : 'Stablecoin supply flat on the week.');
      if (SZ != null && (SZ >= 75 || SZ <= 25)) parts.push(SZ >= 75 ? 'Most large alts beating BTC over 30 days.' : 'Few large alts beating BTC over 30 days.');
      if (parts.length) set('read', parts.join(' ')); };
    var gP = function () { var g = F.get('global'), br = F.get('breadth'); if (!g) return; set('dom', g.dom.toFixed(2) + '%'); set('tot', big(g.tot)); set('alt', big(g.alt));
      /* 24h changes from the top-80 coins' own market-cap changes (CoinGecko's global 24h figure can be badly off) */
      if (br && br.tchp != null && br.achp != null) { set('tot-s', pc(br.tchp) + ' 24h', cls(br.tchp)); set('alt-s', pc(br.achp) + ' 24h', cls(br.achp));
        var altSh = 1 - g.dom / 100, prevAltSh = altSh * (1 + br.tchp / 100) / (1 + br.achp / 100); DD = (prevAltSh - altSh) * 100; set('dom-s', (DD >= 0 ? '\u2191 ' : '\u2193 ') + Math.abs(DD).toFixed(2) + ' pt vs 24h ago', cls(DD)); }
      read(); };
    var cP = function () { var b = F.get('BTC'), e = F.get('ETH'), s = F.get('SOL');
      if (e && e.px) { set('eth', px(e.px)); set('eth-s', pc(e.chp) + ' 24h', cls(e.chp)); } if (s && s.px) { set('sol', px(s.px)); set('sol-s', pc(s.chp) + ' 24h', cls(s.chp)); }
      var X = window.BTD_CTX; if (X) { [['eth', 'ETH', e], ['sol', 'SOL', s]].forEach(function (z) { var sp = cx.querySelector('[data-cx-sp="' + z[0] + '"]'); if (sp && z[2] && z[2].px) { sp.innerHTML = X.spark(z[1], z[2].px, z[2].chp); var fq = X.fmt(z[1], z[2]), es = cx.querySelector('[data-cx="' + z[0] + '-s"]'); if (es) { es.setAttribute('data-spk', z[1]); es.setAttribute('role', 'button'); es.title = X.tip; } if (fq) set(z[0] + '-s', fq.t + ' ' + (fq.r === '1D' ? '24h' : fq.r), cls(fq.v)); } }); }
      rtP(); };
    /* ETH/BTC and SOL/BTC ratio tiles: live = Coinbase ETH-USD / BTC-USD; history = Coinbase ETH-BTC / SOL-BTC daily closes (~600 days) + hourly (1D); All = full Coinbase daily history, loaded on demand (cached 24h).
       Default change period 1M (ratios trend slowly); tap the change to cycle 1D/1W/1M/YTD/1Y (remembered). Label flips to BTC/ETH (remembered). Range bar 3M / 1Y / All (remembered, default 1Y). */
    var RT = {}, RINV = {}, RRB = '1Y'; try { RINV = JSON.parse(LS.get('btd_cxinv') || '{}') || {}; RRB = LS.get('btd_cxrb') || '1Y'; } catch (e) {}
    var rkey = function (a) { return RINV[a] ? 'R:BTC' + a.toUpperCase() : 'R:' + a.toUpperCase() + 'BTC'; };
    ['ETH', 'SOL'].forEach(function (A) { if (window.BTD_CTX) { window.BTD_CTX.def('R:' + A + 'BTC', '1M', 1); window.BTD_CTX.def('R:BTC' + A, '1M', 1); } });
    var mkCtx = function (T, V) { var n = V.length, last = T[n - 1], y1 = V.filter(function (v, i) { return T[i] >= last - 365 * 864e5; }), yr = new Date(last).getUTCFullYear(), j = 0;
      for (var i = 0; i < n; i++) if (new Date(T[i]).getUTCFullYear() < yr) j = i; var w = []; for (var k = n - 1; k >= 0 && T[k] >= last - 365 * 864e5; k -= 7) w.unshift(V[k]);
      return { c5: V.slice(-6), c22: V.slice(-22), w: w.length > 8 ? w : null, ytd: j ? V.slice(j) : null, y: [y1.reduce(function (a, b) { return a + b; }, 0) / y1.length, Math.min.apply(null, y1), Math.max.apply(null, y1)] }; };
    var rtLoad = function (A) { var P = 'https://api.exchange.coinbase.com/products/' + A + '-BTC/candles?granularity=', now = Math.floor(Date.now() / 1e3), iso = function (t) { return new Date(t * 1e3).toISOString(); };
      Promise.all([fetch(P + '86400&start=' + iso(now - 299 * 86400) + '&end=' + iso(now)).then(function (r) { return r.json(); }), fetch(P + '86400&start=' + iso(now - 598 * 86400) + '&end=' + iso(now - 299 * 86400)).then(function (r) { return r.json(); }).catch(function () { return []; }), fetch(P + '3600').then(function (r) { return r.json(); }).catch(function () { return []; })]).then(function (a) {
        var m = {}; a[0].concat(a[1]).forEach(function (c) { if (Array.isArray(c)) m[c[0]] = c[4]; }); var ts = Object.keys(m).map(Number).sort(function (x, y) { return x - y; }); if (ts.length < 30) return;
        var T = ts.map(function (t) { return t * 1e3; }), V = ts.map(function (t) { return m[t]; }), H = Array.isArray(a[2]) ? a[2].slice(0, 24).reverse().map(function (c) { return c[4]; }) : null;
        RT[A] = RT[A] || {}; RT[A].T = T; RT[A].V = V; RT[A].H = H; rtPut(A); rtP(); }).catch(function () {});
      var ck = 'btd_rta_' + A, cc = null; try { cc = JSON.parse(LS.get(ck) || 'null'); } catch (e) {}
      if (cc && Date.now() - cc.t < 24 * 36e5) { RT[A] = RT[A] || {}; RT[A].all = cc.v; } };
    /* All: full Coinbase daily history of the pair, fetched only when the All range is chosen (300-day pages), cached 24h */
    var rtAll = function (A) { if (RT[A] && (RT[A].all || RT[A].allL)) return; RT[A] = RT[A] || {}; RT[A].allL = 1; var P = 'https://api.exchange.coinbase.com/products/' + A + '-BTC/candles?granularity=86400', end = Math.floor(Date.now() / 1e3), m = {}, n = 0;
      var page = function () { var st = end - 299 * 86400; fetch(P + '&start=' + new Date(st * 1e3).toISOString() + '&end=' + new Date(end * 1e3).toISOString()).then(function (r) { return r.json(); }).then(function (a) {
        if (Array.isArray(a)) a.forEach(function (c) { m[c[0]] = c[4]; }); n++; end = st - 86400; if (Array.isArray(a) && a.length > 5 && n < 14) return setTimeout(page, 350);
        var v = Object.keys(m).map(Number).sort(function (x, y) { return x - y; }).map(function (t) { return +(+m[t]).toPrecision(5); }); if (v.length > 400) { RT[A].all = v; LS.set('btd_rta_' + A, JSON.stringify({ t: Date.now(), v: v })); } rtP(); }).catch(function () { rtP(); }); };
      page(); };
    var rtPut = function (A) { var X = window.BTD_CTX, r = RT[A]; if (!X || !r || !r.V) return; X.put('R:' + A + 'BTC', mkCtx(r.T, r.V), r.H && r.H.length > 3 ? r.H : null); var iv = function (x) { return 1 / x; }; X.put('R:BTC' + A, mkCtx(r.T, r.V.map(iv)), r.H && r.H.length > 3 ? r.H.map(iv) : null); };
    var fmtR = function (v) { return v >= 100 ? v.toFixed(1) : v >= 10 ? v.toFixed(2) : v >= 1 ? v.toFixed(3) : v >= 0.01 ? v.toFixed(5) : v.toFixed(6); };
    var rtP = function () { var b = F.get('BTC'), X = window.BTD_CTX; ['eth', 'sol'].forEach(function (a) { var A = a.toUpperCase(), el = cx.querySelector('[data-rt="' + a + '"]'), q = F.get(A); if (!el) return; var inv = !!RINV[a], k = rkey(a);
      el.querySelector('[data-rt-flip]').innerHTML = (inv ? 'BTC/' + A : A + '/BTC') + ' <i aria-hidden="true">\u21c4</i>';
      if (!b || !b.px || !q || !q.px) return; var v = inv ? b.px / q.px : q.px / b.px, r = RT[A], c24 = q.chp != null && b.chp != null ? (((1 + q.chp / 100) / (1 + b.chp / 100)) - 1) * 100 : null; if (inv && c24 != null) c24 = (1 / (1 + c24 / 100) - 1) * 100;
      if (r && r.H && r.H.length > 3) c24 = (v / (inv ? 1 / r.H[0] : r.H[0]) - 1) * 100;
      el.querySelector('[data-rt-v]').textContent = fmtR(v);
      el.querySelector('[data-rt-line]').textContent = inv ? '1 BTC buys ' + fmtR(v) + ' ' + A : '1 ' + A + ' = ' + fmtR(v) + ' BTC';
      var chE = el.querySelector('[data-rt-ch]'), qq = { px: v, chp: c24 }, fq = X && X.fmt(k, qq); if (fq) { chE.textContent = fq.t + ' ' + fq.r; chE.className = cls(fq.v); chE.setAttribute('data-spk', k); chE.setAttribute('role', 'button'); chE.title = 'Tap: change period (1D / 1W / 1M / YTD / 1Y) \u00b7 Hold: % / amount'; } else if (c24 != null) { chE.textContent = pc(c24) + ' 24h'; chE.className = cls(c24); }
      if (X) el.querySelector('[data-rt-sp]').innerHTML = X.spark(k, v, c24);
      var src = null; if (r) { if (RRB === 'All' && r.all) src = r.all.slice(); else if (r.V) src = r.V.slice(RRB === '3M' ? -90 : -365); if (src && inv) src = src.map(function (x) { return 1 / x; }); }
      var rb = el.querySelector('[data-rt-rb]'), nx = { '3M': '1Y', '1Y': 'All', All: '3M' }[RRB]; if (RRB === 'All' && !(r && r.all)) { rtAll(A); src = null; }
      if (src && src.length > 20) { var lo = Math.min.apply(null, src.concat(v)), hi = Math.max.apply(null, src.concat(v)), p = hi > lo ? (v - lo) / (hi - lo) * 100 : 50;
        rb.innerHTML = '<span class="rng" title="' + RRB + ' range ' + fmtR(lo) + ' \u2013 ' + fmtR(hi) + ', now ' + fmtR(v) + '"><i style="left:' + p.toFixed(0) + '%"></i></span><button type="button" class="spk-l cx-rbb" data-rt-rbb title="Range bar period: tap for ' + nx + '">' + RRB + ' range</button><small class="cx-rlh">' + fmtR(lo) + '\u2013' + fmtR(hi) + '</small>'; }
      else rb.innerHTML = RRB === 'All' ? '<small class="cx-rlh">Loading full history\u2026</small> <button type="button" class="spk-l cx-rbb" data-rt-rbb>All range</button>' : ''; }); };
    cx.addEventListener('click', function (e) { var f = e.target.closest && e.target.closest('[data-rt-flip]'); if (f) { var a = f.getAttribute('data-rt-flip'); RINV[a] = !RINV[a]; LS.set('btd_cxinv', JSON.stringify(RINV)); rtP(); return; }
      if (e.target.closest && e.target.closest('[data-rt-rbb]')) { RRB = { '3M': '1Y', '1Y': 'All', All: '3M' }[RRB]; LS.set('btd_cxrb', RRB); rtP(); } });
    rtLoad('ETH'); rtLoad('SOL');
    var S7 = null; try { S7 = JSON.parse(LS.get('btd_stb7b') || 'null'); } catch (e) {}
    if (!S7 || Date.now() - S7.t > 20 * 36e5) fetch('https://stablecoins.llama.fi/stablecoincharts/all').then(function (r) { return r.json(); }).then(function (a) { if (!Array.isArray(a) || a.length < 9) return; var v = (a[a.length - 8].totalCirculatingUSD || {}).peggedUSD, v1 = (a[a.length - 1].totalCirculatingUSD || {}).peggedUSD; if (!v || !v1) return; S7 = { ch: (v1 / v - 1) * 100, t: Date.now() }; /* same series both ends (DefiLlama daily totals) */ LS.set('btd_stb7b', JSON.stringify(S7)); var st = F.get('stable'); if (st) sP(st); }).catch(function () {});
    var sP = function (s) { set('stb', big(s.tot)); if (S7 && S7.ch != null) { ST = S7.ch; set('stb-s', pc(ST, 2) + ' 7d', cls(ST)); } else set('stb-s', 'USD-pegged, all chains'); read(); };
    F.on('global', gP); F.on('stable', sP);
    F.on('breadth', function (b) { gP(); SZ = b.score; set('szn', b.score + ' \u00b7 ' + (b.score >= 75 ? 'Altcoin season' : b.score <= 25 ? 'Bitcoin season' : 'Neutral') + ' (' + b.beat + '/' + b.n + ' beat BTC)'); var i = cx.querySelector('[data-cx="szn-i"]'); if (i) i.style.left = b.score + '%'; read(); });
    var cxT = 0; var tick = function () { if (Date.now() - cxT > 3000) { cxT = Date.now(); gP(); cP(); } }; F.on('BTC', tick); F.on('ETH', tick); F.on('SOL', tick);
    gP(); cP(); if (F.get('stable')) sP(F.get('stable'));
    if (window.BTD_CTX) window.BTD_CTX.on(cP); if (window.BTD_CTX) window.BTD_CTX.onRange(function () { cxT = 0; cP(); });
    fetch('https://api.alternative.me/fng/?limit=31').then(function (r) { return r.json(); }).then(function (j) { var d = (j && j.data || []).map(function (x) { return +x.value; }); if (d.length < 10) return; var avg = d.reduce(function (a, b) { return a + b; }, 0) / d.length, now = d[0];
      set('fng-r', (now > avg + 3 ? '\u2191 above' : now < avg - 3 ? '\u2193 below' : '\u2248 near') + ' its 30d avg ' + avg.toFixed(0)); }).catch(function () {});
  }

  /* ---------- Tokenized stocks ---------- */
  /* Tokenized stocks: after-hours / weekend price discovery. Curated default (treasury names, index tokens, Mag 7), customizable (✎ add/remove/reorder, saved, reset), sortable. */
  var tk = document.querySelector('[data-tok]');
  if (tk) { var TN = { MSTR: 'Strategy', STRC: 'Strategy Stretch preferred', COIN: 'Coinbase', MARA: 'MARA Holdings', HOOD: 'Robinhood', CRCL: 'Circle', SPY: 'S&P 500 ETF', QQQ: 'Nasdaq 100 ETF', AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon', GOOGL: 'Alphabet', META: 'Meta', TSLA: 'Tesla', GLD: 'Gold ETF', BMNR: 'BitMine', AVGO: 'Broadcom', AMD: 'AMD', ORCL: 'Oracle', INTC: 'Intel', GME: 'GameStop' };
    var TZD = ['MSTR', 'COIN', 'MARA', 'STRC', 'HOOD', 'CRCL', 'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'], TZ, SMART = LS.get('btd_tzsm') !== '0', TED = false, TBT = { MSTR: 1, COIN: 1, MARA: 1 }, TPF = { STRC: 1 }, grk = function (t) { return TBT[t] ? 0 : TPF[t] ? 1 : 2; };
    var tzGet = function () { var o = null; try { o = JSON.parse(LS.get('btd_tokl') || 'null'); } catch (e) {} return Array.isArray(o) && o.length ? o.map(function (t) { t = String(t).replace(/^X:/i, ''); return TN[t] ? t : TN[t.replace(/x$/i, '').toUpperCase()] ? t.replace(/x$/i, '').toUpperCase() : t; }).filter(function (t, i, a) { return TN[t] && a.indexOf(t) === i; }).slice(0, 24) : TZD.slice(); };
    var tzSave = function () { if (TZ.join() === TZD.join()) LS.del('btd_tokl'); else LS.set('btd_tokl', JSON.stringify(TZ)); };
    TZ = tzGet(); if (!LS.get('btd_tokp') && LS.get('btd_tokl') && TZ.indexOf('STRC') < 0) { var lt = -1; TZ.forEach(function (t, i) { if (TBT[t]) lt = i; }); TZ.splice(lt + 1, 0, 'STRC'); tzSave(); } LS.set('btd_tokp', '1'); /* one-time: add the preferreds group to saved custom lists */
    /* preferreds: same data + formula as the Yield Desk (desk.json prefs_desk: stated rate on $100 par, Strategy filings). Effective yield = rate x $100 / price. */
    var PREFS = function () { var rows = typeof DESK !== 'undefined' && DESK && DESK.prefs_desk ? DESK.prefs_desk.rows : []; return (rows || []).filter(function (r) { return r.issuer === 'Strategy' && r.rate; }); };
    var prefInfo = function (t) { return PREFS().filter(function (r) { return r.t === t; })[0] || null; };
    var effY = function (pf, price) { return pf && pf.rate && price ? pf.rate * (pf.par || 100) / price : null; };
    /* strategy.com preferred KPIs (rate, effective yield, notional, dates, STRC rate history) + 1Y effective-yield series: assets/data/prefs_kpi.json (weekly, tools/update_prefs_kpi.py) */
    var PK = null, PFN = { STRC: 'Stretch', STRF: 'Strife', STRK: 'Strike', STRD: 'Stride', STRE: 'Stream' }, PFR = {}, PRS = ['1W', '1M', '3M', '1Y']; try { PFR = JSON.parse(LS.get('btd_pfr') || '{}') || {}; } catch (e) {}
    J('/assets/data/prefs_kpi.json').then(function (j) { PK = j; tp(); }).catch(function () {});
    var pfNow = function (t) { var k = PK.p[t], q = F.get(t), live = k.cur === 'USD' && q && q.px ? q.px : null; return { k: k, px: live || k.price, ey: live ? k.rate * 100 / live : k.eff, live: !!live }; };
    var mdy = function (d) { return d ? new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''; };
    var pfTiles = function () { if (!PK) return ''; return Object.keys(PK.p).map(function (t) { var z = pfNow(t), k = z.k, rg = PFR[t] || '1M', S = k.series || [], n = { '1W': 6, '1M': 22, '3M': 64, '1Y': 9999 }[rg], v = S.slice(-n).map(function (x) { return x[2]; }), cur = k.cur === 'EUR' ? '\u20ac' : '$', dp = (desk_pf(t) || {}).pay;
        if (v.length && z.ey) v.push(z.ey); var sp = '', bp = null, rd = '';
        if (v.length > 2) { var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), w = 54, h = 16, rr = hi - lo || 1; bp = Math.round((v[v.length - 1] - v[0]) * 100);
          sp = '<button type="button" class="spk-b" data-pfr="' + t + '" title="Effective-yield trend, ' + rg + ' (daily closes \u00f7 rate in effect) \u00b7 tap to change range"><svg class="spk ' + (bp >= 0 ? 'up' : 'dn') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"><polyline points="' + v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (h - 1 - (x - lo) / rr * (h - 2)).toFixed(1); }).join(' ') + '"/></svg><small class="spk-l">' + rg + '</small></button><b class="tz-bp">' + (bp >= 0 ? '+' : '\u2212') + Math.abs(bp) + ' bp ' + rg + '</b>';
          var pr0 = S.slice(-n)[0]; if (Math.abs(bp) >= 15 && pr0) rd = 'Yield ' + (bp > 0 ? 'up' : 'down') + ' ' + Math.abs(bp) + ' bp ' + { '1W': 'in a week', '1M': 'in a month', '3M': 'in 3 months', '1Y': 'in a year' }[rg] + (z.px < pr0[1] ? ' as price slipped' : z.px > pr0[1] ? ' as price rose' : '') + (t === 'STRC' && k.rate_hist && k.rate_hist.length && pr0[2] && Math.abs(k.rate * 100 / pr0[1] - pr0[2]) > 0.05 ? ' and the rate was reset' : '') + '.'; }
        var Y = S.map(function (x) { return x[1]; }), rb = '';
        if (Y.length > 20) { var ylo = Math.min.apply(null, Y.concat(z.px)), yhi = Math.max.apply(null, Y.concat(z.px)), pp = yhi > ylo ? (z.px - ylo) / (yhi - ylo) * 100 : 50; rb = '<span class="cx-rb"><span class="rng" title="1Y price range ' + cur + ylo.toFixed(2) + ' \u2013 ' + cur + yhi.toFixed(2) + '"><i style="left:' + pp.toFixed(0) + '%"></i></span><small class="spk-l">1Y</small><small class="cx-rlh">' + cur + ylo.toFixed(2) + '\u2013' + cur + yhi.toFixed(2) + '</small></span>'; }
        return '<div class="tz-t tz-pf tz-pfu" title="' + esc(t + ' (' + PFN[t] + ') preferred: effective yield = stated annual rate on ' + cur + '100 par \u00f7 price. Source: strategy.com, as of ' + PK.as_of + '. Education only.') + '"><span class="tz-l"><b>' + t + '</b> <small>' + PFN[t] + '</small> <a class="tz-src" href="' + k.url + '" target="_blank" rel="noopener">strategy.com \u2197</a></span>' +
          '<span class="tz-ey"><b>' + (z.ey != null ? z.ey.toFixed(2) + '%' : '\u2014') + '</b> effective yield</span><span class="tz-pr">Stated ' + k.rate.toFixed(2) + '%' + (t === 'STRC' ? ' variable (reset monthly)' : ' fixed') + (dp ? ' \u00b7 paid ' + dp.toLowerCase() : '') + (k.next_record ? ' \u00b7 next record ' + mdy(k.next_record) : '') + '</span>' +
          (sp ? '<span class="tz-tr">' + sp + '</span>' : '') + '<span class="tz-pr">' + cur + z.px.toFixed(2) + ' ' + (z.live ? 'last close' : 'close ' + esc(k.px_ts || '')) + ' \u00b7 ' + pc((z.px / 100 - 1) * 100, 1) + ' vs ' + cur + '100 par' + (k.notional_musd ? ' \u00b7 notional ' + cur + (k.notional_musd / 1e3).toFixed(2) + 'B' : '') + '</span>' + rb + (rd ? '<em class="tz-rd">' + rd + '</em>' : '') + '</div>'; }).join(''); };
    var desk_pf = function (t) { return prefInfo(t); };
    var pfBars = function (T, now) { if (!PK || TZ.indexOf('STRC') < 0) return ''; var PR = Object.keys(PK.p).map(function (t) { var z = pfNow(t); return { t: t, ey: z.ey, k: z.k }; }).filter(function (z) { return z.ey; });
      var tok = T && T.STRC && !(now - T.STRC.t > 30 * 6e4) ? PK.p.STRC.rate * 100 / T.STRC.px : null; if (tok) PR.push({ t: 'STRCx', ey: tok, tk: 1 }); PR.sort(function (a, b) { return b.ey - a.ey; });
      var y10 = F.get('US10Y'), y2 = F.get('US2Y'), r10 = y10 && y10.px, r2 = y2 && y2.px, mx = Math.max.apply(null, PR.map(function (z) { return z.ey; }).concat([r10 || 0, 1])) * 1.08, X = function (v) { return (v / mx * 100).toFixed(1) + '%'; };
      return '<p class="tz-gh">Strategy preferreds by effective yield <span class="muted">vs US Treasury yields</span></p><div class="tz-bars">' + PR.map(function (z) { return '<div class="tz-br' + (z.tk ? ' tz-brt' : '') + '" title="' + (z.tk ? 'STRCx token: STRC rate \u00f7 live 24/7 token price' : esc(z.t + ' ' + PFN[z.t] + ': stated ' + z.k.rate.toFixed(2) + '%')) + '"><span class="tz-bl">' + z.t + '</span><span class="tz-bt"><i style="width:' + X(z.ey) + '"></i></span><b>' + z.ey.toFixed(2) + '%</b></div>'; }).join('') +
        (r10 || r2 ? '<div class="tz-ref">' + (r10 ? '<span style="left:' + X(r10) + '" title="US 10-year Treasury yield"><em>10Y ' + r10.toFixed(2) + '%</em></span>' : '') + (r2 ? '<span class="tz-r2" style="left:' + X(r2) + '" title="US 2-year Treasury yield"><em>2Y ' + r2.toFixed(2) + '%</em></span>' : '') + '</div>' : '') + '</div>' +
        '<p class="tz-pn">Rates, effective yields, notional and dividend dates from <a href="https://www.strategy.com/strc" target="_blank" rel="noopener">strategy.com</a> (as of ' + esc(PK.as_of) + '); live closes via CNBC. STRC\u2019s rate is reset monthly. Preferreds are not Treasuries: dividends can be suspended and they carry the issuer\u2019s credit and bitcoin risk. Education only, not investment advice.</p>'; };
    F.watch(Object.keys(TN).concat(['STRF', 'STRK', 'STRD', 'US10Y', 'US2Y']));
    var etParts = function () { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); return o; };
    var closeLbl = function () { var e = etParts(), d = e.weekday, h = +e.hour, W = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; if (W.indexOf(d) >= 0 && h >= 16) return 'today\u2019s close'; if (d === 'Sat' || d === 'Sun' || d === 'Mon') return 'Fri close'; return W[W.indexOf(d) - 1] + ' close'; };
    var stateLbl = function () { var s = F.session(), d = etParts().weekday; return s === 'open' ? ['Market open: tokens vs stock', 'op'] : (d === 'Sat' || d === 'Sun') ? ['Weekend \u00b7 live 24/7', 'wk'] : s === 'pre' ? ['Pre-market \u00b7 live 24/7', 'ah'] : ['After hours \u00b7 live 24/7', 'ah']; };
    var TIP = 'Source: xStocks tokens (Backed Finance) via CoinGecko, refreshed every 2 min. Weekend and overnight liquidity is thin: a token price is a hint, not the official stock price. Education only.';
    tk.innerHTML = '<div class="p-h tz-h"><span class="p-t">Tokenized stocks</span><span class="tz-st" data-tz-st></span><span class="tz-up" data-tz-up></span>' +
      '<span class="seg tz-sort" role="group" aria-label="Order"><button type="button" data-tz-sort="smart" title="Smart sort: off-hours, Bitcoin-treasury tokens first, then the biggest moves vs the last close; market hours, the biggest tracking gaps first">Smart sort</button><button type="button" data-tz-sort="mine" title="Your own order (\u270e Customize to reorder)">My order</button></span><button type="button" class="chip" data-tz-ed aria-expanded="false">\u270e Customize</button></div>' +
      '<p class="tz-x" title="' + TIP + '">Tokenized stocks trade 24/7, so off-hours they hint where shares may open. Thin liquidity: a hint, not the official price.</p><p class="tz-sum" data-tz-sum></p><div class="tz-ed" data-tz-edp hidden></div>' +
      '<div class="tz-g" data-tz-g><p class="wl-mu">Loading tokenized prices from CoinGecko\u2026 (free feed, refreshes every 2 min; if it stays empty the feed is rate-limited, try again shortly)</p></div>' +
      '<p class="p-f">xStocks tokens (Backed Finance, on Solana and other chains) via CoinGecko; stock reference via CNBC quote service. Tokens track the stock but are separate products with their own risks, and are not available to US persons on most platforms. Education only.</p>';
    var tp = function () { var T = F.get('tok'); var st = stateLbl(), sEl = tk.querySelector('[data-tz-st]'); sEl.textContent = st[0]; sEl.className = 'tz-st tz-' + st[1];
      tk.classList.toggle('tz-open', st[1] === 'op'); tk.querySelectorAll('[data-tz-sort]').forEach(function (b) { var on = (b.dataset.tzSort === 'smart') === SMART; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      var hd = tk.querySelector('.p-t'), dd = etParts().weekday, sess = F.session(); hd.textContent = st[1] === 'op' ? 'Tokenized stocks \u00b7 tracking check' : (dd === 'Sat' || dd === 'Sun' ? 'Weekend price discovery' : sess === 'pre' ? 'Pre-market price discovery' : 'After-hours price discovery') + ' \u00b7 tokenized stocks';
      if (!T) return; var now = Date.now(), open = st[1] === 'op', cl = closeLbl(), newest = 0;
      var rows = TZ.filter(function (t) { return T[t]; }).map(function (t, i) { var x = T[t], q = F.get(t), ref = q && q.px != null ? q.px : null, d = ref ? (x.px / ref - 1) * 100 : null, stale = !x.t || now - x.t > 30 * 6e4; if (!stale) newest = Math.max(newest, x.t); var off = !stale && d != null && Math.abs(d) > 5; return { t: t, x: x, d: stale || off ? null : d, off: off, stale: stale, i: i }; });
      rows.forEach(function (r) { r.flag = open && r.d != null && Math.abs(r.d) > 1; if (open && !r.stale && r.d == null && T[r.t]) { var q2 = F.get(r.t); if (q2 && q2.px) { r.d = (r.x.px / q2.px - 1) * 100; r.off = false; r.flag = Math.abs(r.d) > 1; } } });
      if (SMART) rows.sort(function (a, b) { if (open) { if (a.stale !== b.stale) return a.stale ? 1 : -1; if (a.flag !== b.flag) return a.flag ? -1 : 1; } else { if (grk(a.t) !== grk(b.t)) return grk(a.t) - grk(b.t); if (a.stale !== b.stale) return a.stale ? 1 : -1; } return (b.d == null ? -1 : Math.abs(b.d)) - (a.d == null ? -1 : Math.abs(a.d)) || a.i - b.i; });
      var sm = tk.querySelector('[data-tz-sum]'), byT = {}; rows.forEach(function (r) { byT[r.t] = r; }); var nm = function (t) { return t === 'SPY' ? 'the S&P 500 (SPY)' : t === 'QQQ' ? 'the Nasdaq 100 (QQQ)' : t; }, ip = [];
      if (open) { var fl = rows.filter(function (r) { return r.flag; }), ok = rows.filter(function (r) { return r.d != null; }).length; sm.innerHTML = !ok ? '' : fl.length ? '<b class="dn">' + fl.length + ' token' + (fl.length > 1 ? 's' : '') + ' more than 1% away from the live stock:</b> ' + fl.map(function (r) { return r.t + 'x ' + pc(r.d, 2); }).join(', ') + '. Thin token liquidity or a delayed stock quote can cause this.' : 'All ' + ok + ' live tokens are within 1% of their stock. Market is open, so the stock price is the one that counts.'; }
      else { ['MSTR', 'SPY', 'QQQ'].forEach(function (t) { var r = byT[t]; if (r && r.d != null) ip.push(nm(t) + ' opens ~' + pc(r.d, 1)); }); if (!ip.length) rows.some(function (r) { if (r.d != null) { ip.push(r.t + ' opens ~' + pc(r.d, 1)); return true; } });
        sm.innerHTML = ip.length ? '<b>Tokens imply ' + ip.join(', ') + '</b> vs ' + cl + '. A hint from thin 24/7 trading, not a forecast.' : ''; }
      var lastG = -1, GL = ['Bitcoin treasury companies', 'Preferreds (Strategy)', 'Indexes \u00b7 top stocks'], inl = SMART && !open && TZ.indexOf('STRC') >= 0 && PK, putPf = function (g) { if (inl && lastG === 1 && g !== 1) { lastG = -2; return pfTiles(); } return ''; };
      tk.querySelector('[data-tz-g]').innerHTML = rows.length ? rows.map(function (r) { var x = r.x, age = x.t ? Math.round((now - x.t) / 6e4) : null, gh = ''; if (SMART && !open && grk(r.t) !== lastG) { gh = putPf(grk(r.t)); lastG = grk(r.t); gh += '<p class="tz-gh">' + GL[lastG] + '</p>'; } var pf = TPF[r.t] ? prefInfo(r.t) : null; if (pf && PK && PK.p[r.t]) pf = { rate: PK.p[r.t].rate, rate_kind: pf.rate_kind, pay: pf.pay, par: 100 }; var ey = pf && !r.stale ? effY(pf, x.px) : null;
        var tip = r.t + 'x tracks ' + r.t + ' (' + TN[r.t] + '). ' + (TPF[r.t] ? 'Preferred token: its price can include accrued dividends and it trades thinly. Effective yield = stated annual dividend ($100 \u00d7 rate) \u00f7 the token price. ' : '') + (x.vol != null ? '24h token volume ≈ $' + n(x.vol, 0) + '. ' : '') + (r.stale ? 'Stale: no update for ' + age + ' min, so no price is shown. ' : r.off ? 'Token is more than 5% away from the stock\u2019s last close, so it may track differently (e.g. accrued dividends or a thin market); no implied-open hint shown. ' : '') + TIP;
        return gh + '<div class="tz-t' + (r.stale ? ' tz-stale' : '') + (TPF[r.t] ? ' tz-pf' : '') + '" title="' + esc(tip) + '"><span class="tz-l"><b>' + r.t + 'x</b> <small>' + r.t + (TPF[r.t] ? ' token' : '') + '</small>' + (r.stale ? ' <em class="tz-tag" title="No token trade for ' + age + ' min">stale</em>' : r.off ? ' <em class="tz-tag" title="More than 5% from the stock’s last close">off-track</em>' : '') + '</span>' + (ey != null ? '<span class="tz-ey"><b>' + ey.toFixed(2) + '%</b> effective yield</span>' : '') +
          '<b class="tz-p">' + (r.stale ? '—' : px(x.px)) + '</b><span class="tz-c ' + (r.stale ? '' : cls(x.chp)) + '">' + (r.stale ? 'no recent trades' : pc(x.chp) + ' 24h') + '</span>' +
          '<span class="tz-v">' + (r.d == null ? (r.stale ? '' : '<span class="muted">vs ' + (open ? 'live stock' : cl) + ' ' + (r.off ? 'n/a' : '—') + '</span>') : '<b class="' + (open ? (r.flag ? 'dn' : '') : cls(r.d)) + '">' + pc(r.d, 2) + '</b> ' + (open ? 'tracking gap vs live stock' + (r.flag ? ' <em class="tz-tag tz-gap">gap &gt;1%</em>' : '') : 'vs ' + cl + (TPF[r.t] ? '' : ' <em class="tz-io">implied open ' + px(x.px) + '</em>'))) + '</span>' + (pf ? '<span class="tz-pr">Stated ' + pf.rate.toFixed(2) + '% ' + (pf.rate_kind || '').toLowerCase() + (ey != null ? ' \u00b7 Effective ' + ey.toFixed(2) + '%' : '') + ' \u00b7 paid ' + (pf.pay || '').toLowerCase() + ' \u00b7 $100 par' + (r.t === 'STRC' ? ' (Strategy aims to keep it near $100)' : '') + '</span>' : '') + '</div>'; }).join('') + putPf(9) : '<p class="wl-mu">None of your picks have a token on the feed. ✎ Customize to add some.</p>';
      var pc2 = tk.querySelector('[data-tz-pc]'); if (!pc2) { pc2 = document.createElement('div'); pc2.className = 'tz-pc'; pc2.setAttribute('data-tz-pc', ''); tk.querySelector('[data-tz-g]').after(pc2); }
      pc2.innerHTML = inl ? pfBars(T, now) : (TZ.indexOf('STRC') >= 0 ? '<p class="tz-gh">Preferreds (Strategy)</p><div class="tz-g">' + pfTiles() + '</div>' + pfBars(T, now) : '');
      tk.querySelector('[data-tz-up]').textContent = newest ? 'updated ' + new Date(newest).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET' : ''; edPaint(); };
    var edPaint = function () { var e = tk.querySelector('[data-tz-edp]'); if (e.hidden) return; var T = F.get('tok') || {};
      e.innerHTML = '<ol class="cz-l">' + TZ.map(function (t, i) { return '<li><span><b>' + t + 'x</b> <small class="muted">' + esc(TN[t]) + (T[t] ? '' : ' · not on feed now') + '</small></span><button type="button" data-tz-up2="' + i + '" aria-label="Move up">↑</button><button type="button" data-tz-dn="' + i + '" aria-label="Move down">↓</button><button type="button" data-tz-rm="' + i + '" aria-label="Remove">×</button></li>'; }).join('') + '</ol>' +
        '<div class="tz-add">' + Object.keys(TN).filter(function (t) { return TZ.indexOf(t) < 0; }).map(function (t) { return '<button type="button" class="chip" data-tz-add="' + t + '">＋ ' + t + 'x</button>'; }).join('') + '</div><button type="button" class="chip" data-tz-reset>Reset to default</button>'; };
    tk.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; var d = b.dataset; if (d.pfr) { ev.stopPropagation(); PFR[d.pfr] = PRS[(PRS.indexOf(PFR[d.pfr] || '1M') + 1) % PRS.length]; LS.set('btd_pfr', JSON.stringify(PFR)); tp(); return; }
      if (d.tzSort) { SMART = d.tzSort === 'smart'; LS.set('btd_tzsm', SMART ? '1' : '0'); } else if (b.hasAttribute('data-tz-ed')) { var e = tk.querySelector('[data-tz-edp]'); e.hidden = !e.hidden; b.setAttribute('aria-expanded', !e.hidden); }
      else if (d.tzUp2 != null) { var i = +d.tzUp2; if (i > 0) { TZ.splice(i - 1, 0, TZ.splice(i, 1)[0]); tzSave(); } }
      else if (d.tzDn != null) { var k = +d.tzDn; if (k < TZ.length - 1) { TZ.splice(k + 1, 0, TZ.splice(k, 1)[0]); tzSave(); } }
      else if (d.tzRm != null) { TZ.splice(+d.tzRm, 1); tzSave(); } else if (d.tzAdd) { TZ.push(d.tzAdd); tzSave(); } else if (b.hasAttribute('data-tz-reset')) { TZ = TZD.slice(); tzSave(); } else return; tp(); });
    tp(); F.on('tok', tp); F.on('quotes', tp); F.on('session', tp); setInterval(tp, 6e4); }

  /* ---------- Live Wall ---------- */
  var wall = document.querySelector('[data-wall]');
  if (wall && C) { var WD = ['MSTR', 'ASST', 'XXI', 'MPJPY'], WR = LS.get('btd_wallr') || '1W', picks; if (WR === '1H' || WR === '1D') WR = '1W'; /* never open the Wall on the hero's timeframe or 1H */
    try { picks = JSON.parse(LS.get('btd_wall') || 'null'); } catch (e) {} if (!Array.isArray(picks) || picks.length !== 4) picks = WD.slice();
    var opts = function (cur) { return LB.map(function (c) { return '<option value="' + esc(c.ticker) + '"' + (c.ticker === cur ? ' selected' : '') + '>' + esc(c.ticker) + ' · ' + esc(c.name.slice(0, 22)) + '</option>'; }).join(''); };
    var cells = function () { return ['BTC'].concat(picks); };
    var build = function () { wall.innerHTML = '<div class="p-h"><span class="p-t">Live Wall</span><span class="tag">BTC + 4 picks · 1W vs main chart 1D</span><div class="seg" role="tablist" aria-label="Wall range">' + ['1H', '1D', '1W', '1M'].map(function (r) { return '<button type="button" data-wa-r="' + r + '" class="' + (r === WR ? 'on' : '') + '">' + r + '</button>'; }).join('') + '</div><button type="button" class="chip" data-wa-reset>Reset</button></div>' +
        '<div class="wa">' + cells().map(function (t, i) { return '<div class="wa-c" data-wa="' + i + '"><div class="wa-h">' + (i ? '<select data-wa-sel="' + (i - 1) + '" aria-label="Pick company ' + i + '">' + opts(t) + '</select>' : '<b>BTC</b>') + '<span class="wa-px" data-wa-px>…</span><span class="wa-ch" data-wa-ch></span></div><canvas data-wa-cv aria-label="' + esc(t) + ' chart"></canvas><small data-wa-n></small></div>'; }).join('') + '</div>'; load(); };
    var SER = [];
    var load = function () { var my = cells().join() + WR; cells().forEach(function (t, i) { var c = C.cnOf(t); if (c) F.watch([c]); C.series(t, WR).then(function (s) { if (cells().join() + WR !== my) return; SER[i] = s; paint(i); }).catch(function () {}); }); };
    var paint = function (i) { var t = cells()[i], el = wall.querySelector('[data-wa="' + i + '"]'), s = SER[i]; if (!el || !s) return; var cv = el.querySelector('canvas'), q = t === 'BTC' ? F.get('BTC') : C.liveQ(t), p = t === 'BTC' ? q && q.px : C.curPx(q) || (s.length ? s[s.length - 1].c : null);
      if (t === 'BTC' && q && s.length) { s[s.length - 1].c = q.px; }
      var up = s.length ? p >= s[0].c : true; C.draw(cv, [{ s: s, col: up ? '#2fd17c' : '#ff5a5f', w: 1.6 }], { axis: false, area: true, base: s.length ? s[0].c : null });
      el.querySelector('[data-wa-px]').textContent = C.fp(p, q && q.cur); var ch = s.length && p ? (p / s[0].c - 1) * 100 : null, ce = el.querySelector('[data-wa-ch]'); ce.textContent = C.sg(ch) + ' ' + (s.daily ? '5D' : WR); ce.className = 'wa-ch ' + cls(ch);
      el.querySelector('[data-wa-n]').textContent = t === 'BTC' ? 'Coinbase live' : (q ? (F.session() === 'open' ? 'Live' : q.ext ? (q.ext.kind === 'pre' ? 'Pre-market' : 'After hours') : 'Last close') : 'Last close') + (s.daily ? ' · 5-day closes' : s.flat ? ' · intraday builds while open' : ''); };
    wall.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.waR) { WR = b.dataset.waR; LS.set('btd_wallr', WR); build(); } else if (b.hasAttribute('data-wa-reset')) { picks = WD.slice(); WR = '1W'; LS.del('btd_wall'); LS.del('btd_wallr'); build(); } });
    wall.addEventListener('change', function (e) { var s = e.target.closest('[data-wa-sel]'); if (!s) return; picks[+s.dataset.waSel] = s.value; LS.set('btd_wall', JSON.stringify(picks)); load(); });
    var waT = 0; F.on('BTC', function () { if (Date.now() - waT > 1500 && SER[0]) { waT = Date.now(); paint(0); } }); F.on('quotes', function () { for (var i = 1; i < 5; i++) paint(i); });
    addEventListener('resize', function () { for (var i = 0; i < 5; i++) paint(i); });
    lP.then(build); }
})();
/* Latest episode: click-to-play embed (loads YouTube only when asked; privacy-enhanced domain) */
(function () {
  var a = document.querySelector('.p-ep [data-ep-link]'); if (!a) return;
  a.addEventListener('click', function (e) { var m = /(?:youtu\.be\/|v=)([\w-]{11})/.exec(a.href); if (!m) return; e.preventDefault();
    var f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0'; f.title = document.querySelector('[data-ep-title]').textContent || 'Latest episode';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true; f.className = 'ep-frame'; a.replaceWith(f); });
})();

/* My Watchlist = the row under the hero chart. Default: US indexes (futures outside regular hours) + MSTR + Mag 7. Visitors can add any stock/ETF, index, future, yield, or a coin typed as TICKER-USD; remove, reorder, reset. Saved in btd_my2, separate from the price strip. Indexes/futures always stay on the Markets board below. */
(function () {
  var el = document.querySelector('[data-hs]'), sec = el && el.closest('.p-hs'), F = window.BTD_FEED; if (!el || !F) return;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var f2 = function (v) { if (v == null || !isFinite(v)) return '…'; var a = Math.abs(v), d = a >= 1000 ? 2 : a >= 1 ? 2 : a >= 0.01 ? 4 : 6; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var pc = function (v) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(2) + '%'; };
  var cl = function (v) { return v > 0 ? 'up' : v < 0 ? 'dn' : 'fl'; };
  /* friendly names -> quote-service symbols, with the label shown on the tile */
  var AL = { SPX: ['.SPX', 'SPX', 'S&P 500'], '^GSPC': ['.SPX', 'SPX', 'S&P 500'], IXIC: ['.IXIC', 'IXIC', 'Nasdaq'], NASDAQ: ['.IXIC', 'IXIC', 'Nasdaq'], DJI: ['.DJI', 'DJI', 'Dow'], DOW: ['.DJI', 'DJI', 'Dow'], RUT: ['.RUT', 'RUT', 'Russell 2000'], VIX: ['.VIX', 'VIX', 'Volatility'], DXY: ['.DXY', 'DXY', 'Dollar index'],
    'ES=F': ['@SP.1', 'ES=F', 'S&P 500 fut'], 'NQ=F': ['@ND.1', 'NQ=F', 'Nasdaq fut'], 'YM=F': ['@DJ.1', 'YM=F', 'Dow fut'], 'GC=F': ['@GC.1', 'GC=F', 'Gold fut'], GOLD: ['@GC.1', 'GC=F', 'Gold fut'], 'SI=F': ['@SI.1', 'SI=F', 'Silver fut'], SILVER: ['@SI.1', 'SI=F', 'Silver fut'], 'CL=F': ['@CL.1', 'CL=F', 'WTI fut'], OIL: ['@CL.1', 'CL=F', 'WTI fut'], 'HG=F': ['@HG.1', 'HG=F', 'Copper fut'], 'NG=F': ['@NG.1', 'NG=F', 'Nat gas fut'],
    US10Y: ['US10Y', 'US10Y', '10Y yield'], US2Y: ['US2Y', 'US2Y', '2Y yield'], US30Y: ['US30Y', 'US30Y', '30Y yield'], US5Y: ['US5Y', 'US5Y', '5Y yield'] };
  var IX = { 'IX:SPX': ['.SPX', '@SP.1', 'SPX', 'S&P 500', 'ES=F'], 'IX:IXIC': ['.IXIC', '@ND.1', 'IXIC', 'Nasdaq', 'NQ=F'], 'IX:DJI': ['.DJI', '@DJ.1', 'DJI', 'Dow', 'YM=F'] };
  var DEF = [{ k: 'IX:SPX', tk: 'S&P 500' }, { k: 'IX:IXIC', tk: 'Nasdaq' }, { k: 'IX:DJI', tk: 'Dow' }].concat(['MSTR', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'].map(function (t) { return { k: t, tk: t }; })), MAX = 16, L, CB = {}, msg = '';
  var get = function () { var o = null; try { o = JSON.parse(LS.get('btd_my2') || 'null'); } catch (e) {} return Array.isArray(o) ? o.filter(function (x) { return x && typeof x.k === 'string' && typeof x.tk === 'string'; }).slice(0, MAX) : DEF.slice(); };
  var save = function () { if (JSON.stringify(L) === JSON.stringify(DEF)) LS.del('btd_my2'); else LS.set('btd_my2', JSON.stringify(L)); };
  L = get();
  var native = { BTC: 1, ETH: 1, SOL: 1 };
  var cbPoll = function () { L.forEach(function (x) { var m = /^C:(.+)$/.exec(x.k); if (!m || native[m[1]]) return; cbFetch(m[1]).then(function (o) { if (o) { CB[m[1]] = o; paint(); } }); }); };
  var cbFetch = function (c) { return fetch('https://api.exchange.coinbase.com/products/' + encodeURIComponent(c) + '-USD/stats').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (!j || !j.last) return null; var l = +j.last, o = +j.open; return { px: l, chp: o ? (l / o - 1) * 100 : null }; }).catch(function () { return null; }); };
  var watch = function () { var w = []; L.forEach(function (x) { if (IX[x.k]) w.push(IX[x.k][0], IX[x.k][1]); else if (!/^C:/.test(x.k)) w.push(x.k); }); F.watch(w); };
  var quote = function (x) { var m = /^C:(.+)$/.exec(x.k), s = F.session();
    if (IX[x.k]) { var I = IX[x.k], cq = F.get(I[0]), fq = F.get(I[1]); if (s !== 'open' && fq && fq.px != null) return { px: fq.px, chp: fq.chp, tk: I[4], nm: I[3] + ' fut', src: I[3] + ' futures (front month), CNBC quote service' }; return cq && cq.px != null ? { px: cq.px, chp: cq.chp, tk: I[2], nm: I[3], src: I[3] + ' cash index, CNBC quote service' } : { px: null, tk: I[2], nm: I[3], src: 'CNBC quote service' }; }
    if (m) { var q = native[m[1]] ? F.get(m[1]) : CB[m[1]]; return q && q.px != null ? { px: q.px, chp: q.chp, tag: '24/7', src: 'Coinbase spot' } : null; }
    var q2 = F.get(x.k); if (!q2 || q2.px == null) return null; var fut = /^@/.test(x.k);
    if (q2.ext && s !== 'open' && q2.ext.px != null) return { px: q2.ext.px, chp: q2.ext.chp, tag: q2.ext.kind === 'pre' ? 'Pre' : 'AH', src: 'CNBC quote service, extended hours (may be delayed)' };
    return { px: q2.px, chp: q2.chp, tag: fut && !/fut/.test(x.nm || '') ? 'fut' : (s !== 'open' && !/^US\d/.test(x.k) ? 'close' : ''), src: 'CNBC quote service (may be delayed)', yd: /^US\d/.test(x.k) }; };
  el.insertAdjacentHTML('afterend', '<div class="my-edp" data-my-edp hidden></div>');
  var edp = sec.querySelector('[data-my-edp]');
  function tile(x) { var q = quote(x), tk = q && q.tk || x.tk, nm = q && q.nm || x.nm || '', ok = q && q.px != null, X = window.BTD_CTX, I = IX[x.k], cm = /^C:(.+)$/.exec(x.k), ck = I ? (q && q.tk === I[4] ? I[1] : I[0]) : cm ? cm[1] : x.k; var fq = ok && X ? X.fmt(ck, q) : null;
    return '<div class="hs-t" title="' + esc(tk + (nm ? ' \u00b7 ' + nm : '') + ' \u00b7 source: ' + (q ? q.src : 'loading')) + '"><span class="hs-l"><b class="hs-tk">' + esc(tk) + '</b>' + (nm ? ' ' + esc(nm) : '') + (q && q.tag && q.tag !== 'close' ? ' <em title="' + ({ Pre: 'Pre = pre-market trading, 4:00\u20139:30 AM ET', AH: 'AH = after-hours trading, 4:00\u20138:00 PM ET', '24/7': 'Trades 24/7', fut: 'Futures (front-month contract)' }[q.tag] || '') + '">' + q.tag + '</em>' : '') + '</span><b>' + (ok ? (q.yd ? q.px.toFixed(3) + '%' : f2(q.px)) : '\u2026') + '</b>' + (fq ? '<span class="hs-c ' + cl(fq.v) + '" data-spk="' + ck + '" role="button" title="' + X.tip + '">' + fq.t + ' <small class="hs-tf">' + (fq.r === '1D' ? X.tf(ck, null, F.session(), q.tag === 'Pre' ? 'pre' : q.tag === 'AH' ? 'post' : '') : fq.r) + '</small></span>' : '<span class="hs-c ' + (ok ? cl(q.chp) : '') + '">' + (ok ? pc(q.chp) : '') + '</span>') + (ok && X ? '<span class="hs-k">' + X.spark(ck, q.px, q.chp) + '</span>' : '') + '</div>'; }
  function paint() { el.innerHTML = L.map(tile).join('') + '<button type="button" class="hs-t hs-ed" data-my-ed aria-expanded="' + !edp.hidden + '" aria-label="Edit My Watchlist" title="My Watchlist: add any ticker, remove, reorder, reset">\u270e<small>Edit</small></button>'; edPaint(); }
  function edPaint() { var e = edp; if (e.hidden) return;
    e.innerHTML = '<div class="my-eh"><b>My Watchlist</b> <span class="muted">saved on this device \u00b7 indexes and futures stay on the Markets board below</span></div>' + (L.length < MAX ? '<form class="my-add" data-my-form><input data-my-in maxlength="16" placeholder="Type a ticker" aria-label="Add a ticker (stocks, ETFs, indexes, futures; coins as TICKER-USD)" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="chip">\uff0b Add</button></form>' : '') + '<small class="my-msg" data-my-msg>' + esc(msg) + '</small><ol class="cz-l">' + L.map(function (x, i) { return '<li><span><b>' + esc((quote(x) || {}).tk || x.tk) + '</b> <small class="muted">' + esc(x.nm || (IX[x.k] ? 'index, futures off-hours' : '')) + '</small></span><button type="button" data-my-up="' + i + '" aria-label="Move up">\u2191</button><button type="button" data-my-dn="' + i + '" aria-label="Move down">\u2193</button><button type="button" data-my-rm="' + i + '" aria-label="Remove">\u00d7</button></li>'; }).join('') + '</ol>' +
      '<div class="my-q"><span class="muted">Quick add:</span> ' + ['MSTR', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'COIN', 'ASST', 'MPJPY', 'MARA', 'IBIT', 'GOLD', 'US10Y', 'DXY', 'VIX'].filter(function (t) { return !L.some(function (x) { return x.tk === t || x.tk === (AL[t] || [])[1]; }); }).map(function (t) { return '<button type="button" class="chip" data-my-add="' + t + '">\uff0b ' + t + '</button>'; }).join('') + '</div>' +
      '<p class="muted my-hint">Type any stock or ETF ticker, an index (SPX, VIX, DXY), a future (ES=F, GC=F, CL=F), a yield (US10Y), or a coin as TICKER-USD. Up to ' + MAX + '.</p><button type="button" class="chip" data-my-reset>Reset to default</button>'; }
  function add(raw) { var t = String(raw || '').trim().toUpperCase().replace(/\s+/g, ''); if (!t) return; if (L.length >= MAX) { msg = 'Watchlist is full (' + MAX + '). Remove one first.'; return paint(); }
    var cm = /^([A-Z0-9]{2,10})-USD$/.exec(t);
    if (cm) { if (L.some(function (x) { return x.k === 'C:' + cm[1]; })) { msg = t + ' is already on your list.'; return paint(); } msg = 'Checking ' + t + ' on Coinbase\u2026'; paint();
      if (native[cm[1]]) { L.push({ k: 'C:' + cm[1], tk: t }); save(); msg = ''; return paint(); }
      return cbFetch(cm[1]).then(function (o) { if (!o) { msg = '\u201c' + t + '\u201d isn\u2019t a Coinbase USD pair. Check the spelling.'; return paint(); } CB[cm[1]] = o; L.push({ k: 'C:' + cm[1], tk: t }); save(); msg = ''; paint(); }); }
    var a = AL[t], k = a ? a[0] : (F.cn ? F.cn(t) : t) || t, tk = a ? a[1] : t, nm = a ? a[2] : '';
    if (!/^[.@A-Z0-9][A-Z0-9.\-=:]{0,15}$/.test(k)) { msg = 'That doesn\u2019t look like a ticker.'; return paint(); }
    if (L.some(function (x) { return x.k === k || (IX[x.k] && (IX[x.k][0] === k || IX[x.k][1] === k)); })) { msg = tk + ' is already on your list.'; return paint(); }
    msg = 'Checking ' + tk + '\u2026'; paint(); F.watch([k]); var t0 = Date.now();
    (function wait() { var q = F.get(k); if (q && q.px != null) { L.push({ k: k, tk: tk, nm: nm }); save(); msg = ''; return paint(); } if (Date.now() - t0 > 7000) { msg = '\u201c' + tk + '\u201d wasn\u2019t found on the quote feed. Coins: type TICKER-USD.'; return paint(); } setTimeout(wait, 500); })(); }
  sec.addEventListener('submit', function (e) { if (!e.target.matches('[data-my-form]')) return; e.preventDefault(); add(sec.querySelector('[data-my-in]').value); });
  sec.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.type === 'submit') return; var d = b.dataset;
    if (b.hasAttribute('data-my-ed')) { edp.hidden = !edp.hidden; b.setAttribute('aria-expanded', !edp.hidden); edPaint(); if (!edp.hidden) { var inp = sec.querySelector('[data-my-in]'); if (inp && innerWidth > 760) inp.focus(); } return; }
    if (d.myAdd) return add(d.myAdd);
    if (d.myUp != null) { var i = +d.myUp; if (i > 0) L.splice(i - 1, 0, L.splice(i, 1)[0]); } else if (d.myDn != null) { var j = +d.myDn; if (j < L.length - 1) L.splice(j + 1, 0, L.splice(j, 1)[0]); }
    else if (d.myRm != null) L.splice(+d.myRm, 1); else if (b.hasAttribute('data-my-reset')) L = DEF.slice(); else return; save(); msg = ''; watch(); paint(); });
  watch(); paint(); cbPoll(); setInterval(cbPoll, 30000);
  if (window.BTD_CTX) window.BTD_CTX.on(function () { if (edp.hidden) paint(); });
  if (window.BTD_CTX) window.BTD_CTX.onRange(function () { el.innerHTML = L.map(tile).join('') + '<button type="button" class="hs-t hs-ed" data-my-ed aria-expanded="' + !edp.hidden + '" aria-label="Edit My Watchlist" title="My Watchlist: add any ticker, remove, reorder, reset">\u270e<small>Edit</small></button>'; });
  var pt = 0; var soft = function () { if (Date.now() - pt > 2000 && !edp.contains(document.activeElement)) { pt = Date.now(); el.innerHTML = L.map(tile).join('') + el.querySelector('[data-my-ed]').outerHTML; } };
  F.on('quotes', soft); F.on('BTC', soft); F.on('ETH', soft); F.on('SOL', soft); F.on('session', paint);
})();
