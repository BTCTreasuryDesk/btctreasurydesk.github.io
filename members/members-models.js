/* BTC Treasury Desk Members: shared model math (client-side, no server, no AI).
   Same model definitions as the home Models panel (/assets/js/desk.js): Power Law, 200-week MA, Mayer Multiple,
   Pi Cycle, Stock-to-Flow. MVRV here is a PROXY (price / 2-year average) because only today's realized price is
   in desk.json, not its history. Percentile ranks are point-in-time (each day ranked only against the days before it),
   so the historical study has no hindsight in the scores. */
(function () {
  'use strict';
  var DAY = 864e5, GEN = Date.UTC(2009, 0, 3);
  var HALV = [[Date.UTC(2012, 10, 28), 10.5e6, 25], [Date.UTC(2016, 6, 9), 15.75e6, 12.5], [Date.UTC(2020, 4, 11), 18.375e6, 6.25], [Date.UTC(2024, 3, 20), 19.6875e6, 3.125]];
  function s2f(t) { var h = HALV[0]; for (var i = 0; i < HALV.length; i++) if (t >= HALV[i][0]) h = HALV[i];
    var supply = h[1] + (t - h[0]) / DAY * 144 * h[2], flow = 144 * 365 * h[2]; return Math.exp(-1.84) * Math.pow(supply / flow, 3.36); }
  function plaw(t) { return 1.0117e-17 * Math.pow((t - GEN) / DAY, 5.82); }
  function clamp(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

  var MODELS = [
    { k: 'pl', n: 'Power Law', d: 'Price vs the long-run log-log trend line.', w: 1 },
    { k: 'wma', n: '200-week MA', d: 'Price vs its 200-week (about 4-year) average.', w: 1 },
    { k: 'may', n: 'Mayer Multiple', d: 'Price vs its 200-day average.', w: 1 },
    { k: 'mvrv', n: 'MVRV proxy', d: 'Price vs its 2-year average, a stand-in for realized price.', w: 1 },
    { k: 'pi', n: 'Pi Cycle', d: '111-day average vs 2x the 350-day average. A cross has marked past cycle peaks.', w: 1 },
    { k: 's2f', n: 'Stock-to-Flow', d: 'Price vs PlanB\'s scarcity model.', w: 0 }
  ];
  var WARM = 365; // days of history a ratio needs before it gets a rank

  // point-in-time percentile (0..100) of a[i] among a[0..i]
  function rollingPct(a) {
    var sorted = [], out = new Array(a.length);
    for (var i = 0; i < a.length; i++) {
      var v = a[i]; if (v == null || !isFinite(v)) { out[i] = null; continue; }
      var lo = 0, hi = sorted.length; while (lo < hi) { var m = (lo + hi) >> 1; if (sorted[m] <= v) lo = m + 1; else hi = m; }
      sorted.splice(lo, 0, v);
      out[i] = sorted.length >= WARM ? 100 * lo / sorted.length : null; // lo = count of values <= v (incl. itself)
    }
    return out;
  }

  function compute(H, livePx, todayUTC) {
    var t0 = Date.parse(H.start + 'T00:00:00Z'), c = H.closes.slice();
    if (livePx) { if (todayUTC > t0 + (c.length - 1) * DAY) c.push(livePx); else c[c.length - 1] = livePx; }
    var n = c.length, T = function (i) { return t0 + i * DAY; };
    var pre = [0]; for (var i = 0; i < n; i++) pre.push(pre[i] + c[i]);
    var sma = function (k, e) { return e + 1 < k ? null : (pre[e + 1] - pre[e + 1 - k]) / k; };
    var S = { c: c, n: n, t0: t0, T: T, pl: [], wma: [], m50: [], m200: [], m111: [], m350x2: [], m730: [] };
    var R = { pl: [], wma: [], may: [], mvrv: [], pi: [], s2f: [] };
    for (i = 0; i < n; i++) {
      var p = plaw(T(i)); S.pl.push(p); R.pl.push(c[i] / p); R.s2f.push(c[i] / s2f(T(i)));
      var m200 = sma(200, i), m111 = sma(111, i), m350 = sma(350, i), m730 = sma(730, i);
      S.m50.push(sma(50, i)); S.m200.push(m200); S.m111.push(m111); S.m350x2.push(m350 ? 2 * m350 : null); S.m730.push(m730);
      R.may.push(m200 ? c[i] / m200 : null); R.pi.push(m350 ? m111 / (2 * m350) : null); R.mvrv.push(m730 ? c[i] / m730 : null);
      if (i >= 1399) { var s = 0; for (var k = 0; k < 200; k++) s += c[i - k * 7]; S.wma.push(s / 200); R.wma.push(c[i] / (s / 200)); } else { S.wma.push(null); R.wma.push(null); }
    }
    var P = { pl: rollingPct(R.pl), wma: rollingPct(R.wma), may: rollingPct(R.may), mvrv: rollingPct(R.mvrv), s2f: rollingPct(R.s2f) };
    // per-model score: -1 (historically cool) .. +1 (historically hot)
    var Z = {};
    ['pl', 'wma', 'may', 'mvrv', 's2f'].forEach(function (k) { Z[k] = P[k].map(function (p) { return p == null ? null : (p - 50) / 50; }); });
    // Pi Cycle is a top-side indicator: it only scores hot as the 111D nears/crosses 2x350D; otherwise neutral (same idea as the home panel)
    Z.pi = R.pi.map(function (r) { return r == null ? null : r >= 0.8 ? clamp((r - 0.8) / 0.2) : 0; });
    return { S: S, R: R, P: P, Z: Z, last: n - 1, px: c[n - 1] };
  }

  // weighted composite; weights: {pl:1,...}. Smoothed with a 7-day mean to reduce day-to-day flicker.
  function composite(M, weights) {
    var n = M.S.n, raw = new Array(n), out = new Array(n);
    for (var i = 0; i < n; i++) {
      var sw = 0, sv = 0;
      for (var k in weights) { var w = +weights[k] || 0, z = M.Z[k] && M.Z[k][i]; if (w > 0 && z != null) { sw += w; sv += w * z; } }
      raw[i] = sw > 0 ? sv / sw : null;
    }
    for (i = 0; i < n; i++) { var s = 0, c = 0; for (var j = Math.max(0, i - 6); j <= i; j++) if (raw[j] != null) { s += raw[j]; c++; } out[i] = raw[i] == null ? null : s / c; }
    return out;
  }
  var CUT = 0.34; // same cut as the home Model Zones overall read
  function band(v) { return v == null ? null : v <= -CUT ? -1 : v >= CUT ? 1 : 0; }
  // zone episodes with hysteresis (enter at +-0.34, exit at +-0.24) so markers don't flicker
  function episodes(score) {
    var st = 0, ev = [], zone = new Array(score.length);
    for (var i = 0; i < score.length; i++) {
      var v = score[i]; if (v == null) { zone[i] = null; continue; }
      if (st === 0) { if (v <= -CUT) { st = -1; ev.push({ i: i, z: -1, t: 'in' }); } else if (v >= CUT) { st = 1; ev.push({ i: i, z: 1, t: 'in' }); } }
      else if (st === -1 && v > -CUT + 0.1) { ev.push({ i: i, z: -1, t: 'out' }); st = 0; }
      else if (st === 1 && v < CUT - 0.1) { ev.push({ i: i, z: 1, t: 'out' }); st = 0; }
      zone[i] = st;
    }
    return { zone: zone, ev: ev };
  }
  var ZL = { '-1': ['Historically cool', 'z-cool', 'accumulation zone'], '0': ['Mid-range', 'z-neu', 'neutral zone'], '1': ['Historically hot', 'z-hot', 'caution zone'] };
  window.BTDModels = { MODELS: MODELS, compute: compute, composite: composite, band: band, episodes: episodes, ZL: ZL, CUT: CUT, plaw: plaw, s2f: s2f, DAY: DAY, HALV: HALV };
})();
