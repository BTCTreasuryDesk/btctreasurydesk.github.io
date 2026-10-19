/* BTC Treasury Desk: main price chart renderer (used by the home Charts slot). BTC (log) default, MSTR, or BTC vs MSTR (growth of 100).
   Overlays (200W MA, 50/200D, Power Law, S2F, halvings, Strategy buys; Members: Model Zones) + sub-panels (weekly RSI, Mayer, Pi Cycle; Members: mNAV, sats/share, MVRV proxy). Default = price only. Mode + picks saved (btd_pmode, btd_play). Period comes from the Charts slot. */
(function () {
  'use strict';
  var DAY = 864e5, GEN = Date.UTC(2009, 0, 3);
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  var MODES = [['btc', 'BTC'], ['mstr', 'MSTR'], ['cmp', 'Compare']];
  /* compare overlays (growth of 100 from the start of the period): MSTR from the Members daily file, the rest from stocks_hist.json (Yahoo daily closes) */
  var CMPS = [['mstr', 'MSTR', '#F7931A'], ['spx', 'S&P 500', '#5aa9ff'], ['gold', 'Gold', '#e5c15a'], ['dxy', 'DXY (dollar)', '#c77dff']];
  var cmpSel = null; try { cmpSel = JSON.parse(LS.get('btd_pcmp') || 'null'); } catch (e) {} if (!Array.isArray(cmpSel) || !cmpSel.length) cmpSel = ['mstr']; cmpSel = cmpSel.filter(function (k) { return CMPS.some(function (c) { return c[0] === k; }); });
  var EVTS = [['2017-12-16', '2017 top'], ['2018-12-15', '2018 bottom'], ['2020-08-11', 'Strategy first buy'], ['2021-11-08', '2021 top'], ['2022-11-21', '2022 bottom'], ['2024-01-11', 'Spot ETFs launch'], ['2025-10-06', 'Oct 2025 high']];
  /* Overlays + long-term sub-panels. Tier: 'pub' = standard, well-known (home, everyone); 'mem' = free Members set (email unlock). Modes each works in. */
  var LAYS = [
    ['wma', '200W MA', 'pub', 'btc mstr', 'Average of the last 200 weekly closes (about 4 years). Over BTC\'s history, weekly closes far below it have been rare, so many treat it as the long-run floor line.'],
    ['ma', '50/200-day MA', 'pub', 'btc mstr', 'The 50-day (short) and 200-day (long) trend averages. While the 50-day sits above the 200-day the trend has been up; crossings mark changes in trend.'],
    ['pl', 'Power Law corridor', 'pub', 'btc', 'Long-run log-log trend of BTC vs time since 2009, with a 0.5x–2x band. Over time price has swung around the line: low in the band in bear markets, high near tops.'],
    ['s2f', 'Stock-to-Flow', 'pub', 'btc', 'PlanB\'s scarcity model: a price implied by existing supply vs new supply, stepping up at each halving. Price has run far below it since 2022, so read it as history, not a target.'],
    ['halv', 'Halvings', 'pub', 'btc mstr cmp', 'Dates when new BTC issuance was cut in half (about every 4 years). Past cycle peaks came roughly 12–18 months after each halving.'],
    ['ev', 'Events', 'pub', 'btc mstr cmp', 'Marked dates: prior cycle tops and bottoms (daily closes), Strategy\'s first bitcoin purchase (Aug 2020) and the US spot bitcoin ETF launch (Jan 2024).'],
    ['buys', 'Strategy buys', 'pub', 'btc mstr cmp', 'Each dot is a Strategy BTC purchase from the strategy.com ledger, sized by BTC bought. Shows when the biggest buyer added over time.'],
    ['sr', 'Support / resistance', 'pub', 'btc mstr', 'Auto levels: price zones where past swing highs and lows cluster in this period (green = below price, red = above). Mechanical reference lines from history, not predictions.'],
    ['fib', 'Fibonacci', 'pub', 'btc mstr', 'Fibonacci retracements (23.6%, 38.2%, 50%, 61.8%, 78.6%) between the period low and high. Widely watched reference levels; they describe, they do not predict.'],
    ['wmz', '200W MA zone', 'pub', 'btc mstr', 'Shaded zone from the 200-week average up to 1.2x it. In past BTC bear markets, weekly closes sat in or near this zone around cycle lows.'],
    ['mayb', 'Mayer bands', 'pub', 'btc', 'The 200-day average x 0.8, x 1.0 and x 2.4. Above 2.4x has historically been stretched; below 0.8x has been rare and deep.'],
    ['vp', 'Volume profile', 'pub', 'btc', 'Coinbase BTC-USD daily volume stacked by price for this period (bars on the right). Thick bars = prices where a lot traded; POC = the busiest price. Coinbase volume only, not the whole market.'],
    ['zones', 'Model Zones', 'mem', 'btc', 'Shades the periods when the Desk composite of models (Power Law, 200W MA, Mayer, MVRV proxy, Pi Cycle) read historically cool (blue) or hot (red).']];
  var SUBS = [
    ['rsi', 'Weekly RSI', 'pub', 'btc mstr', 'Momentum of weekly closes on a 0–100 scale (14 weeks). Above 70 has marked overheated stretches; below 30, washed-out ones.'],
    ['mayer', 'Mayer Multiple', 'pub', 'btc', 'Price ÷ its 200-day average. Above about 2.4 has historically been stretched; below 1.0, price sat under its long trend.'],
    ['pi', 'Pi Cycle', 'pub', 'btc', '111-day average ÷ 2× the 350-day average. Readings reaching 1.0 lined up with past cycle peaks (2013, 2017, 2021).'],
    ['mnav', 'MSTR mNAV', 'mem', 'btc mstr', 'What the market pays for Strategy vs its bitcoin (market cap ÷ BTC value, diluted shares from the strategy.com ledger). Above 1x = premium.'],
    ['bps', 'Sats per share', 'mem', 'btc mstr', 'Bitcoin (in sats) behind each assumed diluted MSTR share, from the strategy.com ledger. A rising line = more BTC per share over time.'],
    ['mvrv', 'MVRV proxy', 'mem', 'btc', 'Price ÷ its 2-year average: a stand-in for MVRV, because free realized-price history is not available. Below 1 has lined up with deep bear markets.']];
  var ALL = LAYS.concat(SUBS);
  function isMem() { try { return localStorage.getItem('btd_member') === '1'; } catch (e) { return false; } }
  function okIn(id) { var d = ALL.filter(function (x) { return x[0] === id; })[0]; return d && d[3].split(' ').indexOf(mode) >= 0 && (d[2] === 'pub' || isMem()); }
  var HALV = [['2012-11-28', '1st halving'], ['2016-07-09', '2nd halving'], ['2020-05-11', '3rd halving'], ['2024-04-20', '4th halving']];
  var mode = LS.get('btd_pmode'); if (!MODES.some(function (m) { return m[0] === mode; })) mode = 'btc';
  var lay = null; try { lay = JSON.parse(LS.get('btd_play') || 'null'); } catch (e) {} if (!Array.isArray(lay)) lay = []; lay = lay.filter(function (x) { return ALL.some(function (l) { return l[0] === x; }); }); // default: clean, price only
  var PRESETS = [['cycle', 'Cycle', ['wma', 'wmz', 'pl', 'halv', 'pi']], ['trend', 'Trend', ['ma', 'mayb', 'rsi', 'mayer']], ['levels', 'Levels', ['sr', 'fib', 'vp']]];
  var HIDE = null; try { HIDE = JSON.parse(LS.get('btd_phide') || 'null'); } catch (e) {} if (!Array.isArray(HIDE)) HIDE = [];
  var VOL = null, volP = null; /* Coinbase BTC-USD daily candles [t, low, high, open, close, volume], paged 300 days at a time, on demand for the volume profile */
  function needVol(from) { if (VOL && VOL.from <= from) return Promise.resolve(VOL); if (volP) return volP; var out = [], end = Date.now(), pages = Math.min(14, Math.ceil((end - from) / (300 * DAY)) + 1), k = 0;
    function pg() { var e = end - k * 300 * DAY, st = e - 299 * DAY; return fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start=' + new Date(st).toISOString() + '&end=' + new Date(e).toISOString()).then(function (r) { return r.json(); }).then(function (a) { if (Array.isArray(a)) out = out.concat(a); k++; if (k < pages && Array.isArray(a) && a.length) return pg(); }); }
    volP = pg().then(function () { out.sort(function (a, b) { return a[0] - b[0]; }); VOL = { from: out.length ? out[0][0] * 1e3 : from, c: out }; volP = null; return VOL; }).catch(function () { volP = null; return null; }); return volP; }
  /* swing-point support/resistance: pivots over a window, clustered within ~3.5% (log), strongest + nearest kept */
  function srLevels(P) { var n = P.length, k = Math.max(4, Math.round(n / 45)), piv = []; for (var i = k; i < n - k; i++) { var v = P[i][1], hi = true, lo = true; for (var j = i - k; j <= i + k; j++) { if (P[j][1] > v) hi = false; if (P[j][1] < v) lo = false; } if (hi || lo) piv.push([v, i]); }
    piv.sort(function (a, b) { return a[0] - b[0]; }); var cl = []; piv.forEach(function (p) { var c = cl[cl.length - 1]; if (c && p[0] / c.lo < 1.035) { c.v.push(p[0]); c.n++; c.last = Math.max(c.last, p[1]); } else cl.push({ lo: p[0], v: [p[0]], n: 1, last: p[1] }); });
    var cur = P[n - 1][1]; cl.forEach(function (c) { c.px = c.v.reduce(function (a, b) { return a + b; }, 0) / c.v.length; c.sc = c.n + c.last / n; });
    var dn = cl.filter(function (c) { return c.px < cur * 0.995; }).sort(function (a, b) { return b.px - a.px; }).slice(0, 3), up = cl.filter(function (c) { return c.px > cur * 1.005; }).sort(function (a, b) { return a.px - b.px; }).slice(0, 3);
    return dn.map(function (c) { return { px: c.px, t: 'S', n: c.n }; }).concat(up.map(function (c) { return { px: c.px, t: 'R', n: c.n }; })); }
  function fibLevels(P) { var hi = -Infinity, lo = Infinity, ih = 0, il = 0; P.forEach(function (p, i) { if (p[1] > hi) { hi = p[1]; ih = i; } if (p[1] < lo) { lo = p[1]; il = i; } }); var upMove = il < ih;
    return { hi: hi, lo: lo, up: upMove, L: [0.236, 0.382, 0.5, 0.618, 0.786].map(function (r) { return { r: r, px: upMove ? hi - (hi - lo) * r : lo + (hi - lo) * r }; }) }; }
  var ZM = null; // Model Zones (members-models.js, loaded on demand)
  function needZones() { if (ZM || window.BTDModels) return Promise.resolve(); return new Promise(function (ok) { var sc = document.createElement('script'); sc.src = '/members/members-models.js?v=pz1'; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); }); }
  function zones() { if (ZM) return ZM; var B = window.BTDModels; if (!B || !D) return null; var M = B.compute(D.btc, null, 0), W = {}; B.MODELS.forEach(function (x) { W[x.k] = x.w; }); var C = B.composite(M, W);
    ZM = { t0: M.S.t0, z: C.map(function (v) { return B.band(v); }) }; return ZM; }
  function sma(C, k) { var o = new Array(C.length), s = 0; for (var i = 0; i < C.length; i++) { s += C[i]; if (i >= k) s -= C[i - k]; o[i] = i >= k - 1 ? s / k : null; } return o; }
  var HV = [[Date.UTC(2012, 10, 28), 10.5e6, 25], [Date.UTC(2016, 6, 9), 15.75e6, 12.5], [Date.UTC(2020, 4, 11), 18.375e6, 6.25], [Date.UTC(2024, 3, 20), 19.6875e6, 3.125]];
  function s2f(t) { var h = HV[0]; for (var i = 0; i < HV.length; i++) if (t >= HV[i][0]) h = HV[i]; var sup = h[1] + (t - h[0]) / DAY * 144 * h[2], fl = 144 * 365 * h[2]; return Math.exp(-1.84) * Math.pow(sup / fl, 3.36); }
  function rsiW(S) { var wk = []; for (var i = S.C.length - 1; i >= 0; i -= (mode === 'btc' ? 7 : 5)) wk.unshift(i); var out = [], ag = 0, al = 0, N = 14;
    for (var j = 1; j < wk.length; j++) { var ch = S.C[wk[j]] - S.C[wk[j - 1]], gn = Math.max(ch, 0), ls = Math.max(-ch, 0);
      if (j <= N) { ag += gn / N; al += ls / N; if (j === N) out.push([S.T[wk[j]], al ? 100 - 100 / (1 + ag / al) : 100]); } else { ag = (ag * (N - 1) + gn) / N; al = (al * (N - 1) + ls) / N; out.push([S.T[wk[j]], al ? 100 - 100 / (1 + ag / al) : 100]); } }
    return out; }
  var D = null, LIVE = {}, loading = null, mounts = [];
  function live() {
    var FD = window.BTD_FEED, fb = FD && FD.get('BTC'); if (fb && fb.px) LIVE.btc = { px: fb.px, chp: fb.chp }; var a = fb && fb.px ? Promise.resolve() : fetch('https://api.exchange.coinbase.com/products/BTC-USD/stats').then(function (r) { return r.json(); }).then(function (x) { var l = +x.last, o = +x.open; if (l) LIVE.btc = { px: l, chp: o ? (l / o - 1) * 100 : null }; }).catch(function () {});
    var b = fetch('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=MSTR&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1').then(function (r) { return r.json(); }).then(function (j) {
      var x = (j.FormattedQuoteResult || {}).FormattedQuote; x = Array.isArray(x) ? x[0] : x; var px = parseFloat(String(x.last).replace(/,/g, '')); if (isFinite(px)) LIVE.mstr = { px: px, chp: parseFloat(String(x.change_pct).replace(/[%+,]/g, '')) }; }).catch(function () {});
    return Promise.all([a, b]);
  }
  function load() { return loading || (loading = Promise.all([J('/assets/data/btc_daily.json'), J('/members/data/stocks_daily.json'), J('/assets/data/strategy.json').catch(function () { return null; }), live(), J('/assets/data/stocks_hist.json').catch(function () { return null; })]).then(function (r) {
    D = { btc: r[0], stocks: r[1], strat: r[2], hist: r[4] }; setInterval(function () { if (document.hidden) return; live().then(function () { mounts = mounts.filter(function (m) { return document.body.contains(m.body); }); mounts.forEach(function (m) { paint(m); }); }); }, 60000); return D; })); }
  function series(k) {
    var T = [], C = [];
    if (k === 'btc') { var s0 = Date.parse(D.btc.start + 'T00:00:00Z'); D.btc.closes.forEach(function (v, i) { T.push(s0 + i * DAY); C.push(v); }); }
    else if (k !== 'mstr') { var H = D.hist && D.hist.series[{ spx: 'SPX', gold: 'GOLD', dxy: 'DXY' }[k]]; if (H) { var h0 = Date.parse(H.d0 + 'T00:00:00Z'); H.o.forEach(function (o, i) { T.push(h0 + o * DAY); C.push(H.c[i]); }); } return { T: T, C: C }; }
    else { var M = D.stocks.series.MSTR; M.d.forEach(function (d, i) { T.push(Date.parse(d + 'T00:00:00Z')); C.push(M.c[i]); }); }
    var lv = LIVE[k]; if (lv && lv.px) { if (Date.now() - T[T.length - 1] > DAY * 0.5) { T.push(Date.now()); C.push(lv.px); } else C[C.length - 1] = lv.px; }
    return { T: T, C: C };
  }
  function wma(S, step) { var wk = [], W = [], s = 0; for (var i = S.C.length - 1; i >= 0; i -= step) wk.unshift(i); wk.forEach(function (ix, j) { s += S.C[ix]; if (j >= 200) s -= S.C[wk[j - 200]]; if (j >= 199) W.push([S.T[ix], s / 200]); }); return W; }
  function idxAt(T, t) { var a = 0, b = T.length - 1; while (a < b) { var m = (a + b) >> 1; if (T[m] < t) a = m + 1; else b = m; } return a; }

  function paint(m) {
    var body = m.body, cv = body.querySelector('canvas'); if (!cv || !D) return;
    var w = cv.clientWidth || 600, h = cv.clientHeight || 300, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var g = cv.getContext('2d'); g.scale(r, r);
    var on = function (x) { return lay.indexOf(x) >= 0 && okIn(x); };
    var main = series(mode === 'mstr' ? 'mstr' : 'btc'), end = main.T[main.T.length - 1], f = m.from(end);
    var CS = []; if (mode === 'cmp') { cmpSel.forEach(function (k) { var sr = series(k); if (sr.T.length > 2) { CS.push({ k: k, s: sr }); f = Math.max(f, sr.T[0]); } }); }
    var i0 = idxAt(main.T, f), P = []; for (var i = i0; i < main.T.length; i++) P.push([main.T[i], main.C[i]]); if (P.length < 2) return;
    var Q = null, QS = []; if (mode === 'cmp') { var b0 = P[0][1]; P = P.map(function (p) { return [p[0], p[1] / b0 * 100]; }); CS.forEach(function (c) { var j0 = idxAt(c.s.T, f), a = []; for (var ii = j0; ii < c.s.T.length; ii++) a.push([c.s.T[ii], c.s.C[ii]]); if (a.length < 2) return; var q0 = a[0][1]; QS.push({ k: c.k, p: a.map(function (p) { return [p[0], p[1] / q0 * 100]; }), col: CMPS.filter(function (x) { return x[0] === c.k; })[0][2], nm: CMPS.filter(function (x) { return x[0] === c.k; })[0][1] }); }); Q = QS.length ? QS[0].p : null; }
    var W = on('wma') ? wma(main, mode === 'btc' ? 7 : 5).filter(function (p) { return p[0] >= f; }) : [];
    var PL = [], PLlo = [], PLhi = []; if (on('pl')) P.forEach(function (p) { var v = 1.0117e-17 * Math.pow((p[0] - GEN) / DAY, 5.82); PL.push([p[0], v]); PLlo.push([p[0], v * 0.5]); PLhi.push([p[0], v * 2]); });
    var M50 = [], M200 = [], SF = []; if (on('ma')) { var a50 = sma(main.C, 50), a200 = sma(main.C, 200); for (i = i0; i < main.T.length; i++) { if (a50[i]) M50.push([main.T[i], a50[i]]); if (a200[i]) M200.push([main.T[i], a200[i]]); } }
    if (on('s2f')) P.forEach(function (p, k) { if (k % 3 === 0 || k === P.length - 1) SF.push([p[0], s2f(p[0])]); });
    var WZ = on('wmz') ? wma(main, mode === 'btc' ? 7 : 5).filter(function (p) { return p[0] >= f; }) : [];
    var MB = []; if (on('mayb') && mode === 'btc') { var a2b = sma(main.C, 200); [0.8, 1, 2.4].forEach(function (mul) { var a = []; for (var ii = i0; ii < main.T.length; ii++) if (a2b[ii]) a.push([main.T[ii], a2b[ii] * mul]); MB.push({ m: mul, a: a }); }); }
    var SR = mode !== 'cmp' && P.length > 30 ? srLevels(P) : [], FB = mode !== 'cmp' && P.length > 10 ? fibLevels(P) : null; m.lv = { SR: SR, FB: FB, P: P };
    var log = mode !== 'cmp' || m.per === '5Y' || m.per === 'All', x0 = P[0][0], x1 = end, vals = P.map(function (p) { return p[1]; });
    [].concat.apply([], QS.map(function (q) { return q.p; })).concat(W, PL, M50, M200, WZ.map(function (p) { return [p[0], p[1] * 1.2]; }), MB.length ? MB[0].a.concat(MB[1].a) : []).forEach(function (p) { vals.push(p[1]); }); if (SF.length) { var pmx = Math.max.apply(0, vals) * 3; SF.forEach(function (p) { if (p[1] < pmx) vals.push(p[1]); }); }
    var lo = Math.min.apply(0, vals), hi = Math.max.apply(0, vals); if (log) { lo /= 1.1; hi *= 1.1; } else { var pd = (hi - lo) * 0.08; lo -= pd; hi += pd; }
    var pl = 54, pr = 10, pt = 8, pb = 20, F = function (v) { return log ? Math.log(Math.max(v, 1e-9)) : v; };
    var X = function (t) { return pl + (t - x0) / (x1 - x0 || 1) * (w - pl - pr); }, Y = function (v) { return pt + (F(hi) - F(v)) / (F(hi) - F(lo)) * (h - pt - pb); };
    g.font = '10px ui-monospace,Menlo,monospace'; g.textBaseline = 'middle';
    var ticks = []; if (log) { for (var e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) [1, 2, 5].forEach(function (k) { var v = k * Math.pow(10, e); if (v >= lo && v <= hi) ticks.push(v); }); if (ticks.length < 3) { ticks = []; var st0 = (hi - lo) / 4; for (var q = 1; q < 4; q++) ticks.push(+(lo + st0 * q).toPrecision(2)); } }
    else { var st = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4))), kk = (hi - lo) / st; st *= kk > 8 ? 2 : kk < 3 ? 0.5 : 1; for (var v = Math.ceil(lo / st) * st; v <= hi; v += st) ticks.push(v); }
    var yf = mode === 'cmp' ? function (v) { return fmt(v); } : function (v) { return '$' + (v >= 1e3 ? fmt(v / 1e3, v >= 1e4 ? 0 : 1) + 'k' : fmt(v, v < 10 ? 2 : 0)); };
    ticks.forEach(function (v) { var y = Y(v); g.strokeStyle = '#161a20'; g.beginPath(); g.moveTo(pl, y); g.lineTo(w - pr, y); g.stroke(); g.fillStyle = '#6b7480'; g.textAlign = 'right'; g.fillText(yf(v), pl - 5, y); });
    var span = (x1 - x0) / DAY, stepM = span > 1500 ? 12 : span > 500 ? 6 : span > 120 ? 2 : span > 45 ? 1 : 0; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#6b7480';
    if (stepM) { for (var yy = new Date(x0).getUTCFullYear(); yy <= new Date(x1).getUTCFullYear(); yy++) for (var mm = 0; mm < 12; mm += stepM) { var tt = Date.UTC(yy, mm, 1); if (tt <= x0 || tt >= x1) continue; var xx = X(tt); if (xx < pl + 18 || xx > w - pr - 18) continue; g.fillText(mm === 0 ? String(yy) : new Date(tt).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), xx, h - 5); } }
    else for (var t2 = x0 + 7 * DAY; t2 < x1 - 2 * DAY; t2 += 7 * DAY) g.fillText(new Date(t2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }), X(t2), h - 5);
    if (mode === 'cmp') { var y100 = Y(100); g.strokeStyle = '#39414c'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pl, y100); g.lineTo(w - pr, y100); g.stroke(); g.setLineDash([]); }
    if (on('halv')) HALV.forEach(function (hv) { var t = Date.parse(hv[0] + 'T00:00:00Z'); if (t <= x0 || t > x1) return; var xx = X(t); g.strokeStyle = '#4a525d'; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(xx, pt); g.lineTo(xx, h - pb); g.stroke(); g.setLineDash([]); g.fillStyle = '#8a939e'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(hv[1], xx + 3, pt + 1); });
    if (on('ev')) EVTS.forEach(function (ev, n) { var t = Date.parse(ev[0] + 'T00:00:00Z'); if (t <= x0 || t > x1) return; var xx = X(t); g.strokeStyle = /top|high/.test(ev[1]) ? 'rgba(255,90,95,.55)' : /bottom/.test(ev[1]) ? 'rgba(47,209,124,.55)' : 'rgba(247,147,26,.6)'; g.setLineDash([1, 3]); g.beginPath(); g.moveTo(xx, pt + 12); g.lineTo(xx, h - pb); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle.replace(/[\d.]+\)$/, '1)'); g.save(); g.translate(xx - 3, h - pb - 4); g.rotate(-Math.PI / 2); g.textAlign = 'left'; g.textBaseline = 'bottom'; g.font = '10px ui-monospace, Menlo, monospace'; g.fillText(ev[1], 0, 0); g.restore(); });
    function ln(a, col, wd, dash) { if (a.length < 2) return; g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash || []); g.beginPath(); a.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); g.setLineDash([]); g.lineWidth = 1; }
    g.save(); g.beginPath(); g.rect(pl, pt, w - pl - pr, h - pt - pb); g.clip();
    if (on('zones')) { var Z = zones(); if (Z) { var zi0 = Math.max(0, Math.round((x0 - Z.t0) / DAY)), cur = null, st = 0;
      for (var zi = zi0; zi <= Z.z.length; zi++) { var zv = zi < Z.z.length ? Z.z[zi] : null; if (zv !== cur) { if (cur === -1 || cur === 1) { g.fillStyle = cur < 0 ? 'rgba(80,160,255,.13)' : 'rgba(255,90,95,.13)'; var xa = X(Math.max(x0, Z.t0 + st * DAY)), xb = X(Math.min(x1, Z.t0 + zi * DAY)); g.fillRect(xa, pt, Math.max(1, xb - xa), h - pt - pb); } cur = zv; st = zi; } } } }
    if (PL.length) { g.fillStyle = 'rgba(247,147,26,.07)'; g.beginPath(); PLhi.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); for (var j = PLlo.length - 1; j >= 0; j--) g.lineTo(X(PLlo[j][0]), Y(PLlo[j][1])); g.closePath(); g.fill(); ln(PL, '#F7931A', 1.2, [5, 4]); }
    if (WZ.length > 1) { g.fillStyle = 'rgba(47,209,124,.13)'; g.beginPath(); WZ.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1] * 1.2)) : g.moveTo(X(p[0]), Y(p[1] * 1.2)); }); for (var wj = WZ.length - 1; wj >= 0; wj--) g.lineTo(X(WZ[wj][0]), Y(WZ[wj][1])); g.closePath(); g.fill(); ln(WZ, 'rgba(47,209,124,.7)', 1); }
    MB.forEach(function (b) { ln(b.a, b.m === 2.4 ? 'rgba(255,90,95,.8)' : b.m === 1 ? 'rgba(90,169,255,.8)' : 'rgba(47,209,124,.8)', 1, [4, 3]); var lb = b.a[b.a.length - 1]; if (lb) { g.fillStyle = '#8a939e'; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText('Mayer ' + b.m + 'x', w - pr - 2, Y(lb[1]) - 2); } });
    var LBY = []; var hl = function (v, col, lbl, dash) { if (v < lo || v > hi) return; var y = Y(v); var clash = LBY.some(function (yy) { return Math.abs(yy - y) < 13; }); g.strokeStyle = col; g.setLineDash(dash || [6, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(pl, y); g.lineTo(w - pr, y); g.stroke(); g.setLineDash([]); if (clash) return; LBY.push(y); g.font = '10px ui-monospace,Menlo,monospace'; var tw2 = g.measureText(lbl).width + 6; g.fillStyle = 'rgba(11,13,16,.85)'; g.fillRect(pl + 2, y - 7, tw2, 14); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(lbl, pl + 5, y); };
    if (on('sr')) SR.forEach(function (L) { hl(L.px, L.t === 'S' ? 'rgba(47,209,124,.85)' : 'rgba(255,90,95,.85)', (L.t === 'S' ? 'Support ' : 'Resistance ') + yf(L.px), [6, 4]); });
    if (on('fib') && FB) FB.L.forEach(function (L) { hl(L.px, 'rgba(199,125,255,.75)', 'Fib ' + (L.r * 100).toFixed(1) + '% ' + yf(L.px), [2, 3]); });
    if (on('vp') && mode === 'btc') { if (VOL && VOL.from <= x0 + 5 * DAY) { var NB = 36, bins = new Array(NB).fill(0), Fl = F(lo), Fh = F(hi), mxv = 0, vsum = 0; VOL.c.forEach(function (c) { var t = c[0] * 1e3; if (t < x0 || t > x1) return; var bi = Math.floor((F(c[4]) - Fl) / (Fh - Fl) * NB); if (bi < 0 || bi >= NB) return; bins[bi] += c[5] * c[4]; vsum += c[5] * c[4]; });
        bins.forEach(function (b) { mxv = Math.max(mxv, b); }); var poc = bins.indexOf(mxv), bw = (w - pl - pr) * 0.28, bh = (h - pt - pb) / NB;
        bins.forEach(function (b, bi) { if (!b) return; var yb = h - pb - (bi + 1) * bh, len = b / mxv * bw; g.fillStyle = bi === poc ? 'rgba(247,147,26,.45)' : 'rgba(154,163,173,.22)'; g.fillRect(w - pr - len, yb + 1, len, Math.max(1, bh - 2)); });
        if (mxv) { var pocPx = Math.exp(Fl + (poc + 0.5) / NB * (Fh - Fl)); if (!log) pocPx = lo + (poc + 0.5) / NB * (hi - lo); m.lv.POC = pocPx; g.fillStyle = '#F7931A'; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText('POC ~' + yf(pocPx), w - pr - 4, h - pb - (poc + 1) * bh - 1); } }
      else needVol(x0).then(function (v) { if (v) paint(m); }); }
    ln(W, '#2fd17c', 1.6); ln(M200, '#5aa9ff', 1.3); ln(M50, '#c77dff', 1.1); ln(SF, '#9aa3ad', 1.1, [2, 3]);
    if (mode !== 'cmp') { var up = P[P.length - 1][1] >= P[0][1]; g.fillStyle = up ? 'rgba(47,209,124,.06)' : 'rgba(255,90,95,.06)'; g.beginPath(); P.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); g.lineTo(X(x1), h - pb); g.lineTo(X(x0), h - pb); g.closePath(); g.fill(); }
    ln(P, mode === 'cmp' ? '#c9ced6' : '#e9edf2', 1.5); QS.forEach(function (q) { ln(q.p, q.col, 1.5); });
    var buys = []; if (on('buys') && D.strat) { var tgt = P, TT = tgt.map(function (p) { return p[0]; }); D.strat.purchases.forEach(function (b) { if (!(b.btc > 0)) return; var t = Date.parse(b.date + 'T00:00:00Z'); if (t < x0) return; var ix = idxAt(TT, t); if (Math.abs(TT[ix] - t) < 6 * DAY) buys.push([TT[ix], tgt[ix][1], b]); });
      var mx = Math.max.apply(0, buys.map(function (b) { return b[2].btc; }).concat([1])); buys.forEach(function (b) { g.fillStyle = 'rgba(247,147,26,.9)'; g.strokeStyle = '#000'; g.beginPath(); g.arc(X(b[0]), Y(b[1]), 2.2 + Math.sqrt(b[2].btc / mx) * 6, 0, 7); g.fill(); g.stroke(); }); }
    g.restore();
    var lp = P[P.length - 1]; g.fillStyle = '#fff'; g.beginPath(); g.arc(X(lp[0]), Y(lp[1]), 3, 0, 7); g.fill();
    if (mode !== 'cmp' && LIVE[mode] && LIVE[mode].px) { var lx = X(lp[0]), ly = Y(lp[1]), lt = 'live $' + fmt(lp[1], lp[1] < 1000 ? 2 : 0); g.font = 'bold 10px ui-monospace,Menlo,monospace'; var tw = g.measureText(lt).width + 10; // live current-price dot + label
      g.fillStyle = 'rgba(247,147,26,.25)'; g.beginPath(); g.arc(lx, ly, 7, 0, 7); g.fill(); g.fillStyle = '#F7931A'; g.fillRect(Math.min(lx - tw - 9, w - pr - tw), ly - 8, tw, 16); g.fillStyle = '#0b0d10'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(lt, Math.min(lx - tw - 9, w - pr - tw) + 5, ly); }
    // headline numbers + foot
    var hd = body.querySelector('[data-pc-hd]'), pc = function (a) { return (a[a.length - 1][1] / a[0][1] - 1) * 100; }, cl = function (v) { return v >= 0 ? 'up' : 'dn'; }, sp = function (v) { return (v >= 0 ? '+' : '−') + fmt(Math.abs(v), Math.abs(v) < 100 ? 1 : 0) + '%'; };
    var plbl = m.per === 'All' ? (mode === 'cmp' ? 'since ' + new Date(x0).getUTCFullYear() : 'all') : m.per;
    if (mode === 'cmp') hd.innerHTML = '<span><i class="pc-k" style="background:#c9ced6"></i>BTC <b class="' + cl(pc(P)) + '">' + sp(pc(P)) + '</b></span>' + QS.map(function (q) { return '<span><i class="pc-k" style="background:' + q.col + '"></i>' + q.nm + ' <b class="' + cl(pc(q.p)) + '">' + sp(pc(q.p)) + '</b></span>'; }).join('') + '<span class="muted">' + plbl + '</span>';
    else { var lv = LIVE[mode]; hd.innerHTML = '<b class="pc-px">$' + fmt(lp[1], lp[1] < 1000 ? 2 : 0) + '</b>' + (lv && lv.chp != null && isFinite(lv.chp) ? '<span class="' + cl(lv.chp) + '">' + sp(lv.chp).replace('%', '') + (Math.abs(lv.chp) < 100 ? '' : '') + '% today</span>' : '') + '<span class="' + cl(pc(P)) + '">' + sp(pc(P)) + ' ' + plbl + '</span>' + (W.length ? '<span class="muted">' + (lp[1] / W[W.length - 1][1]).toFixed(2) + 'x 200W MA</span>' : '') + (PL.length ? '<span class="muted">' + (lp[1] / PL[PL.length - 1][1]).toFixed(2) + 'x Power Law</span>' : '') + (M200.length ? '<span class="muted">' + (lp[1] / M200[M200.length - 1][1]).toFixed(2) + 'x 200D</span>' : ''); }
    m.foot.innerHTML = (mode === 'cmp' ? 'Growth of 100 from the start of the period, ' + (log ? 'log scale, ' : '') : (mode === 'btc' ? 'BTC daily closes (Coinbase), ' : 'MSTR daily closes (Yahoo Finance, split-adjusted), ') + 'log scale, ') + 'plus a live last point. ' +
      (on('wma') ? '200W MA = average of the last 200 weekly closes. ' : '') + (on('pl') ? 'Power Law trend = 1.0117e-17 × days since genesis^5.82, band 0.5x–2x. ' : '') + (on('ma') ? 'Purple = 50-day, blue = 200-day average. ' : '') + (on('s2f') ? 'Grey dotted = Stock-to-Flow model price (PlanB, 2019 fit). ' : '') + (on('zones') ? 'Shading = Desk Model Zones composite (blue cool, red hot). ' : '') + (on('buys') ? 'Dots: Strategy BTC purchases from the strategy.com ledger, sized by BTC bought. ' : '') + 'Intraday: <a href="https://www.tradingview.com/chart/?symbol=' + (mode === 'mstr' ? 'NASDAQ%3AMSTR' : 'BITSTAMP%3ABTCUSD') + '" target="_blank" rel="noopener">TradingView &#8599;</a>.';
    m.map = { pl: pl, pr: pr, pt: pt, pb: pb, w: w, h: h, lo: lo, hi: hi, log: log, x0: x0, x1: x1, yf: yf };
    levels(m, lp[1], W, PL, MB, yf);
    if (on('vp') && mode === 'btc') m.foot.innerHTML += ' Volume profile: Coinbase BTC-USD daily candles (Coinbase volume only), traded value bucketed by daily close.';
    if (on('sr') || on('fib')) m.foot.innerHTML += ' Support/resistance and Fibonacci lines are mechanical, from this period\u2019s daily closes.';
    // tooltip
    var tip = body.querySelector('.pc-tip');
    cv.onpointermove = function (ev) { var rc = cv.getBoundingClientRect(), cx = ev.clientX - rc.left; if (cx < pl) { tip.hidden = true; return; } var t = x0 + (cx - pl) / (w - pl - pr) * (x1 - x0), ix = idxAt(P.map(function (p) { return p[0]; }), t), p = P[ix];
      var near = function (a) { for (var q = a.length - 1; q >= 0; q--) if (a[q][0] <= p[0] + 3 * DAY) return a[q][1]; return null; }, L = ['<b>' + new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) + '</b>'];
      if (mode === 'cmp') { L.push('BTC ' + sp(p[1] - 100) + QS.map(function (q) { var qv = near(q.p); return qv ? ' · ' + q.nm + ' ' + sp(qv - 100) : ''; }).join('')); } else L.push((mode === 'btc' ? 'BTC' : 'MSTR') + ' $' + fmt(p[1], p[1] < 1000 ? 2 : 0));
      if (W.length) { var wv = near(W); if (wv) L.push('<i style="color:#2fd17c">200W MA</i> $' + fmt(wv) + ' (' + (p[1] / wv).toFixed(2) + 'x)'); }
      if (M50.length) { var a5 = near(M50), a2 = near(M200); L.push('<i style="color:#c77dff">50D</i> $' + fmt(a5) + (a2 ? ' · <i style="color:#5aa9ff">200D</i> $' + fmt(a2) : '')); }
      if (SF.length) { var sv = near(SF); if (sv) L.push('<i style="color:#9aa3ad">S2F</i> $' + fmt(sv)); }
      if (PL.length) { var pv = near(PL); L.push('<i style="color:#F7931A">Power Law</i> $' + fmt(pv) + ' (' + (p[1] / pv).toFixed(2) + 'x)'); }
      var bb = buys.filter(function (b) { return Math.abs(b[0] - p[0]) < 3.5 * DAY; })[0]; if (bb) L.push('<i style="color:#F7931A">Strategy bought</i> ' + fmt(bb[2].btc) + ' BTC (' + bb[2].date + ')');
      var xc = body.querySelector('.pc-xh'); if (xc) { var cy = ev.clientY - rc.top, xr = window.devicePixelRatio || 1; xc.width = w * xr; xc.height = h * xr; var xg = xc.getContext('2d'); xg.scale(xr, xr); xg.clearRect(0, 0, w, h);
        if (cy > pt && cy < h - pb) { var fr = (cy - pt) / (h - pt - pb), vv = log ? Math.exp(Math.log(hi) - fr * (Math.log(hi) - Math.log(lo))) : hi - fr * (hi - lo); xg.strokeStyle = 'rgba(200,206,214,.5)'; xg.setLineDash([3, 3]); xg.beginPath(); xg.moveTo(pl, cy); xg.lineTo(w - pr, cy); xg.moveTo(cx, pt); xg.lineTo(cx, h - pb); xg.stroke(); xg.setLineDash([]);
          var lbl = yf(vv) + (mode !== 'cmp' ? ' (' + ((vv / lp[1] - 1) * 100 >= 0 ? '+' : '\u2212') + Math.abs((vv / lp[1] - 1) * 100).toFixed(1) + '% vs now)' : ''); xg.font = 'bold 10px ui-monospace,Menlo,monospace'; var lw = xg.measureText(lbl).width + 8; xg.fillStyle = '#d8dde4'; xg.fillRect(pl, cy - 8, lw, 16); xg.fillStyle = '#0b0d10'; xg.textAlign = 'left'; xg.textBaseline = 'middle'; xg.fillText(lbl, pl + 4, cy); }
        if (mode !== 'cmp') L.push('<span class="muted">Crosshair: price level at your cursor vs now on the left axis</span>'); }
      tip.innerHTML = L.join('<br>'); tip.hidden = false; tip.style.left = Math.min(w - tip.offsetWidth - 2, Math.max(0, cx + 10)) + 'px'; tip.style.top = '4px'; };
    cv.onpointerleave = function () { tip.hidden = true; var xc = body.querySelector('.pc-xh'); if (xc) xc.getContext('2d').clearRect(0, 0, xc.width, xc.height); };
    subs(m, main, x0, x1, pl, pr);
  }
  function subs(m, main, x0, x1, pl, pr) {
    var box = m.body.querySelector('[data-pc-subs]'); if (!box) return; var ids = SUBS.filter(function (d) { return lay.indexOf(d[0]) >= 0 && okIn(d[0]); });
    box.innerHTML = ids.map(function (d) { return '<div class="pc-sub"><div class="pc-sub-h"><b>' + d[1] + '</b><span data-pc-sv="' + d[0] + '"></span><small>' + d[4] + '</small></div><canvas data-pc-sc="' + d[0] + '" aria-label="' + d[1] + '"></canvas></div>'; }).join('');
    ids.forEach(function (d) { var k = d[0], pts = [], ref = [], fx = function (v) { return v.toFixed(2) + 'x'; }, lo = null, hi = null, col = '#F7931A';
      var C = main.C, T = main.T;
      if (k === 'rsi') { pts = rsiW(main); ref = [[70, '#ff5a5f'], [30, '#2fd17c'], [50, '#39414c']]; lo = 0; hi = 100; fx = function (v) { return v.toFixed(0); }; }
      else if (k === 'mayer') { var a = sma(C, 200); for (var i = 0; i < C.length; i++) if (a[i]) pts.push([T[i], C[i] / a[i]]); ref = [[2.4, '#ff5a5f'], [1, '#39414c']]; }
      else if (k === 'pi') { var a1 = sma(C, 111), a3 = sma(C, 350); for (i = 0; i < C.length; i++) if (a1[i] && a3[i]) pts.push([T[i], a1[i] / (2 * a3[i])]); ref = [[1, '#ff5a5f']]; fx = function (v) { return v.toFixed(2); }; }
      else if (k === 'mvrv') { var a7 = sma(C, 730); for (i = 0; i < C.length; i++) if (a7[i]) pts.push([T[i], C[i] / a7[i]]); ref = [[1, '#39414c']]; }
      else if (k === 'mnav') { if (window.BTDX && window.BTDX.mnavSeries && D.strat) pts = window.BTDX.mnavSeries(D.strat, D.stocks.series.MSTR, D.btc).map(function (x) { return [Date.parse(x.d + 'T00:00:00Z'), x.v]; }); ref = [[1, '#39414c']]; }
      else if (k === 'bps') { if (D.strat) D.strat.purchases.filter(function (x) { return x.adso_k && x.holdings; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (x) { pts.push([Date.parse(x.date + 'T00:00:00Z'), x.holdings / (x.adso_k * 1e3) * 1e8]); }); fx = function (v) { return fmt(v) + ' sats'; }; col = '#2fd17c';
        if (pts.length) pts.push([x1, pts[pts.length - 1][1]]); }
      var cv = box.querySelector('[data-pc-sc="' + k + '"]'), sv = box.querySelector('[data-pc-sv="' + k + '"]');
      var inR = pts.filter(function (p) { return p[0] >= x0 && p[0] <= x1; }); if (k === 'bps') { var before = pts.filter(function (p) { return p[0] < x0; }).pop(); if (before) inR.unshift([x0, before[1]]); }
      if (inR.length < 2) { sv.textContent = 'no data for this period'; return; } sv.innerHTML = 'now <b>' + fx(inR[inR.length - 1][1]) + '</b>';
      var w = cv.clientWidth || 600, h = cv.clientHeight || 70, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var g = cv.getContext('2d'); g.scale(r, r);
      var vs = inR.map(function (p) { return p[1]; }); if (lo == null) { lo = Math.min.apply(0, vs.concat(ref.map(function (x) { return x[0]; }))); hi = Math.max.apply(0, vs.concat(ref.map(function (x) { return x[0]; }))); var pd = (hi - lo) * 0.1 || 1; lo -= pd; hi += pd; if (k === 'bps') lo = Math.max(0, lo); }
      var X = function (t) { return pl + (t - x0) / (x1 - x0 || 1) * (w - pl - pr); }, Y = function (v) { return 4 + (hi - v) / (hi - lo) * (h - 8); };
      g.font = '9px ui-monospace,Menlo,monospace'; g.textBaseline = 'middle'; g.textAlign = 'right';
      ref.forEach(function (rf) { if (rf[0] < lo || rf[0] > hi) return; var y = Y(rf[0]); g.strokeStyle = rf[1]; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(pl, y); g.lineTo(w - pr, y); g.stroke(); g.setLineDash([]); g.fillStyle = '#6b7480'; g.fillText(fx(rf[0]).replace(' sats', ''), pl - 4, y); });
      g.fillStyle = '#6b7480'; var clear = function (y) { return ref.every(function (rf) { return Math.abs(Y(rf[0]) - y) > 11; }); }; if (clear(8)) g.fillText(fx(hi).replace(' sats', ''), pl - 4, 8); if (clear(h - 6)) g.fillText(fx(lo).replace(' sats', ''), pl - 4, h - 6);
      g.strokeStyle = col; g.lineWidth = 1.4; g.beginPath(); inR.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); g.stroke();
    });
  }
  function levels(m, cur, W, PL, MB, yf) { var box = m.body.querySelector('[data-pc-lv]'); if (!box) return; if (mode === 'cmp' || !m.lv) { box.innerHTML = ''; return; } var L = [];
    m.lv.SR.forEach(function (x) { L.push([x.px, x.t === 'S' ? 'Support (swing lows)' : 'Resistance (swing highs)', x.t === 'S' ? 'up' : 'dn']); });
    if (m.lv.FB) m.lv.FB.L.forEach(function (x) { if (x.r === 0.382 || x.r === 0.5 || x.r === 0.618) L.push([x.px, 'Fib ' + (x.r * 100).toFixed(1) + '% of the period range', 'fb']); });
    var wv = wma(series(mode === 'mstr' ? 'mstr' : 'btc'), mode === 'btc' ? 7 : 5); if (wv.length) L.push([wv[wv.length - 1][1], '200-week average', 'up']);
    if (mode === 'btc') { var C = series('btc').C, a2 = sma(C, 200), last = a2[a2.length - 1]; if (last) { L.push([last * 2.4, 'Mayer 2.4x (historically stretched)', 'dn']); L.push([last, '200-day average (Mayer 1.0x)', 'fb']); L.push([last * 0.8, 'Mayer 0.8x', 'up']); }
      var t = Date.now(), plv = 1.0117e-17 * Math.pow((t - GEN) / DAY, 5.82); L.push([plv, 'Power Law trend line', 'fb']); L.push([plv * 2, 'Power Law corridor top (2x)', 'dn']); L.push([plv * 0.5, 'Power Law corridor floor (0.5x)', 'up']); }
    if (m.lv.POC) L.push([m.lv.POC, 'Volume profile POC (Coinbase)', 'fb']);
    L.sort(function (a, b) { return b[0] - a[0]; }); var above = L.filter(function (x) { return x[0] > cur; }).slice(-4), below = L.filter(function (x) { return x[0] <= cur; }).slice(0, 4);
    var row = function (x) { var d = (x[0] / cur - 1) * 100; return '<li><span class="pc-lvp">' + yf(x[0]) + '</span><span class="pc-lvn">' + x[1] + '</span><span class="pc-lvd ' + (d >= 0 ? 'up' : 'dn') + '">' + (d >= 0 ? '+' : '\u2212') + Math.abs(d).toFixed(1) + '%</span></li>'; };
    box.innerHTML = '<div class="pc-lvh"><b>Levels to watch</b><small>nearest reference levels above and below ' + yf(cur) + ' (' + (mode === 'btc' ? 'BTC' : 'MSTR') + ')</small></div><ol class="pc-lvl">' + above.map(row).join('') + '<li class="pc-lvnow"><span class="pc-lvp">' + yf(cur) + '</span><span class="pc-lvn">Now</span><span></span></li>' + below.map(row).join('') + '</ol><p class="pc-lvf">Reference levels computed from past prices and published models, for planning and education only. Not predictions, targets or advice.</p>'; }
  function controls() {
    return '<div class="pc-ctl"><span class="seg pc-mode" role="group" aria-label="Chart">' + MODES.map(function (x) { return '<button type="button" data-pc-mode="' + x[0] + '" aria-pressed="' + (x[0] === mode) + '"' + (x[0] === mode ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</span>' +
      (mode === 'cmp' ? '<span class="pc-chips" role="group" aria-label="Compare with"><span class="pc-gl">Compare with</span>' + CMPS.map(function (c) { var o = cmpSel.indexOf(c[0]) >= 0; return '<button type="button" class="pc-chip' + (o ? ' on' : '') + '" data-pc-cmp="' + c[0] + '" aria-pressed="' + o + '" style="' + (o ? 'border-color:' + c[2] + ';color:' + c[2] : '') + '"><i style="background:' + c[2] + '"></i>' + c[1] + '</button>'; }).join('') + '</span>' : '') +
      '<span class="pc-chips" role="group" aria-label="Presets"><span class="pc-gl">Presets</span>' + PRESETS.map(function (p) { var o = p[2].every(function (x) { return lay.indexOf(x) >= 0; }); return '<button type="button" class="pc-chip pc-pre' + (o ? ' on' : '') + '" data-pc-pre="' + p[0] + '" aria-pressed="' + o + '" title="' + p[1] + ' preset: ' + p[2].map(function (x) { return ALL.filter(function (a) { return a[0] === x; })[0][1]; }).join(', ') + '">' + p[1] + '</button>'; }).join('') + '</span>' +
      chips(LAYS, 'Overlays') + chips(SUBS, 'Panels below') + '<button type="button" class="pc-chip pc-reset" data-pc-reset title="Clear all overlays, panels and compares">Reset</button><button type="button" class="pc-chip pc-edb" data-pc-ed aria-expanded="false" title="Choose which overlay and panel chips appear">\u270e Edit</button></div><div class="sec-ed pc-ed" data-pc-edp hidden></div><p class="pc-info" data-pc-info aria-live="polite"></p>' +
      '<p class="pc-more">' + (isMem() ? 'Members set unlocked (M). ' : '<a href="/members/">More in Members (free with email)</a>: Model Zones, mNAV, sats per share, MVRV proxy. ') + '<a href="/members/">Pro (free for now)</a>: Chart Builder, multi-timeframe confluence, alerts &rarr;</p>';
  }
  function chips(list, lbl) { return '<span class="pc-chips" role="group" aria-label="' + lbl + '"><span class="pc-gl">' + lbl + '</span>' + list.filter(function (l) { return HIDE.indexOf(l[0]) < 0 || lay.indexOf(l[0]) >= 0; }).map(function (l) { var o = lay.indexOf(l[0]) >= 0, inMode = l[3].split(' ').indexOf(mode) >= 0, lock = l[2] === 'mem' && !isMem();
      return '<button type="button" class="pc-chip pc-' + l[0] + (o && !lock ? ' on' : '') + (lock ? ' pc-lock' : '') + '" data-pc-lay="' + l[0] + '" aria-pressed="' + (o && !lock) + '"' + (!inMode ? ' disabled' : '') + ' title="' + (inMode ? '' : 'Not available in this view. ') + l[4].replace(/"/g, '&quot;') + '"><i></i>' + l[1] + (l[2] === 'mem' ? '<sup>M</sup>' : '') + '</button>'; }).join('') + '</span>'; }
  function noop() {
  }
  window.BTDPrice = {
    render: function (body, foot, ctx) { // ctx: { per, from(endT), seg }
      var m = { body: body, foot: foot, per: ctx.per, from: ctx.from };
      body.innerHTML = '<div class="ch-sub">' + ctx.seg + controls() + '</div><div class="pc-hd" data-pc-hd></div><div class="pc-wrapx"><div class="pc-w"><canvas class="ch-cv pc-cv" aria-label="Main price chart"></canvas><canvas class="pc-xh" aria-hidden="true"></canvas><div class="pc-tip" hidden></div></div><div class="pc-lv" data-pc-lv></div></div><div class="pc-subs" data-pc-subs></div>';
      body.onclick = function (e) { var b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.dataset.pcMode) { mode = b.dataset.pcMode; LS.set('btd_pmode', mode); window.BTDPrice.render(body, foot, ctx); }
        else if (b.dataset.pcCmp) { var ck = b.dataset.pcCmp, ci = cmpSel.indexOf(ck); if (ci >= 0) { if (cmpSel.length > 1) cmpSel.splice(ci, 1); } else cmpSel.push(ck); LS.set('btd_pcmp', JSON.stringify(cmpSel)); window.BTDPrice.render(body, foot, ctx); }
        else if (b.dataset.pcPre) { var pr = PRESETS.filter(function (x) { return x[0] === b.dataset.pcPre; })[0], allOn = pr[2].every(function (x) { return lay.indexOf(x) >= 0; }); lay = allOn ? [] : pr[2].filter(function (x) { return okIn(x); }); LS.set('btd_play', JSON.stringify(lay)); window.BTDPrice.render(body, foot, ctx); }
        else if (b.hasAttribute('data-pc-ed')) { var ep = body.querySelector('[data-pc-edp]'); ep.hidden = !ep.hidden; b.setAttribute('aria-expanded', String(!ep.hidden)); if (!ep.hidden) ep.innerHTML = '<p class="sec-ed-h">Choose which chips appear (switched-on overlays always show).</p><ol class="sec-ed-l">' + ALL.map(function (d) { return '<li><label><input type="checkbox" data-pc-hk="' + d[0] + '"' + (HIDE.indexOf(d[0]) < 0 ? ' checked' : '') + '> ' + d[1] + '</label></li>'; }).join('') + '</ol><p class="sec-ed-f"><button type="button" class="chip" data-pc-edreset>Reset to default</button><button type="button" class="chip" data-pc-eddone>Done</button></p>'; }
        else if (b.hasAttribute('data-pc-edreset')) { HIDE = []; lay = []; try { localStorage.removeItem('btd_phide'); localStorage.removeItem('btd_play'); } catch (e) {} window.BTDPrice.render(body, foot, ctx); }
        else if (b.hasAttribute('data-pc-eddone')) { window.BTDPrice.render(body, foot, ctx); }
        else if (b.hasAttribute('data-pc-reset')) { lay = []; cmpSel = ['mstr']; mode = 'btc'; ['btd_play', 'btd_pcmp', 'btd_pmode'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); window.BTDPrice.render(body, foot, ctx); }
        else if (b.dataset.pcLay) { var l = b.dataset.pcLay, d = ALL.filter(function (x) { return x[0] === l; })[0], info = body.querySelector('[data-pc-info]');
          if (d[2] === 'mem' && !isMem()) { info.innerHTML = '<b>' + d[1] + '</b> is in the free Members set: <a href="/members/">unlock it with your email &rarr;</a> ' + d[4]; return; }
          var ix = lay.indexOf(l); if (ix >= 0) lay.splice(ix, 1); else lay.push(l); LS.set('btd_play', JSON.stringify(lay)); b.classList.toggle('on', ix < 0); b.setAttribute('aria-pressed', ix < 0);
          info.innerHTML = ix < 0 ? '<b>' + d[1] + ':</b> ' + d[4] : '';
          if (l === 'zones' && ix < 0) needZones().then(function () { paint(m); }); else paint(m); } };
      body.onchange = function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-pc-hk'); if (!k) return; var i = HIDE.indexOf(k); if (e.target.checked) { if (i >= 0) HIDE.splice(i, 1); } else if (i < 0) HIDE.push(k); if (HIDE.length) LS.set('btd_phide', JSON.stringify(HIDE)); else { try { localStorage.removeItem('btd_phide'); } catch (x) {} } };
      mounts = mounts.filter(function (x) { return x.body !== body && document.body.contains(x.body); }); mounts.push(m);
      load().then(function () { return lay.indexOf('zones') >= 0 && isMem() ? needZones() : null; }).then(function () { paint(m); }).catch(function () { body.querySelector('[data-pc-hd]').textContent = 'Price history unavailable right now.'; });
    },
    setLive: function (k, px) { if (!px) return; LIVE[k] = Object.assign({}, LIVE[k] || {}, { px: px }); var n = Date.now(); if (n - (this._t || 0) < 15000) return; this._t = n; this.repaint(); },
    repaint: function () { mounts.forEach(function (m) { if (document.body.contains(m.body)) paint(m); }); }
  };
})();
