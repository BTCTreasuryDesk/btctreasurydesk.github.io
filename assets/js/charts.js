/* Home "Charts": one chart at a time, tab saved in localStorage. Static canvas charts from dated files only. Education only. */
(function () {
  'use strict';
  var box = document.querySelector('[data-charts]'); if (!box) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, DAY = 864e5, GEN = Date.UTC(2009, 0, 3);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function O(u) { return J(u).catch(function () { return null; }); }
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var t0 = function (d) { return Date.parse(d + 'T00:00:00Z'); };
  var TABS = [['perf', 'MSTR vs BTC'], ['hold', 'Strategy holdings'], ['mnav', 'MSTR mNAV'], ['top', 'Top 10 holders'], ['models', '200WMA + Power Law'], ['prefs', 'Preferred yields']];
  var cur = LS.get('btd_ctab'); if (!TABS.some(function (t) { return t[0] === cur; })) cur = 'perf';
  var rng = LS.get('btd_cperf') || '1Y', DATA = {};

  /* generic static line chart: series [{p:[[t,v]], c, w, dash, ax:'l'|'r', fill}] */
  function line(cv, S, o) {
    var w = cv.clientWidth || 640, h = cv.clientHeight || 260, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var c = cv.getContext('2d'); c.scale(r, r);
    var pl = 46, pr = o.right ? 50 : 10, pt = 10, pb = 20, all = [].concat.apply([], S.map(function (s) { return s.p; }));
    var x0 = Math.min.apply(0, all.map(function (p) { return p[0]; })), x1 = Math.max.apply(0, all.map(function (p) { return p[0]; }));
    function rngOf(ax) { var v = [].concat.apply([], S.filter(function (s) { return (s.ax || 'l') === ax; }).map(function (s) { return s.p.map(function (p) { return p[1]; }); })).filter(function (x) { return x > 0 || !o.log; }); var lo = Math.min.apply(0, v), hi = Math.max.apply(0, v); if (o.zero && ax === 'l') lo = Math.min(lo, 0); return [lo, hi]; }
    var R = { l: rngOf('l'), r: o.right ? rngOf('r') : null }, LOG = { l: !!o.log, r: !!o.logR };
    function Y(v, ax) { var g = R[ax], lg = LOG[ax], a = lg ? Math.log(g[0]) : g[0], b = lg ? Math.log(g[1]) : g[1], x = lg ? Math.log(Math.max(v, 1e-9)) : v; if (!lg) { var pad = (b - a) * 0.06; a -= o.zero ? 0 : pad; b += pad; } else { a -= 0.05; b += 0.05; } return pt + (b - x) / (b - a) * (h - pt - pb); }
    var X = function (t) { return pl + (t - x0) / (x1 - x0 || 1) * (w - pl - pr); };
    c.font = '10px ui-monospace,Menlo,monospace'; c.textBaseline = 'middle';
    function ticks(ax) { var g = R[ax], out = []; if (LOG[ax]) { var e0 = Math.floor(Math.log10(g[0])), e1 = Math.ceil(Math.log10(g[1])); for (var e = e0; e <= e1; e++) [1, 2, 5].forEach(function (m) { var v = m * Math.pow(10, e); if (v >= g[0] * 0.9 && v <= g[1] * 1.1) out.push(v); }); if (out.length > 7) out = out.filter(function (v, i) { return /^1/.test(String(v)) || i % 2 === 0; }); } else { var st = (g[1] - g[0]) / 4; for (var i = 0; i <= 4; i++) out.push(g[0] + st * i); } return out; }
    ticks('l').forEach(function (v) { var y = Y(v, 'l'); if (y < pt - 2 || y > h - pb + 2) return; c.strokeStyle = '#161a20'; c.beginPath(); c.moveTo(pl, y); c.lineTo(w - pr, y); c.stroke(); c.fillStyle = '#7d8794'; c.textAlign = 'right'; c.fillText(o.yf(v), pl - 4, y); });
    if (o.right) ticks('r').forEach(function (v) { var y = Y(v, 'r'); if (y < pt - 2 || y > h - pb + 2) return; c.fillStyle = '#7d8794'; c.textAlign = 'left'; c.fillText(o.yfr(v), w - pr + 4, y); });
    var yrs = (x1 - x0) / (365 * DAY); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#7d8794';
    for (var y = new Date(x0).getUTCFullYear(); y <= new Date(x1).getUTCFullYear() + 1; y++) for (var m = 0; m < 12; m += yrs > 2.5 ? 12 : yrs > 1.2 ? 6 : 3) { var t = Date.UTC(y, m, 1); if (t <= x0 || t >= x1) continue; var xx = X(t); if (xx < pl + 16 || xx > w - pr - 16) continue; c.fillText(m === 0 ? String(y) : new Date(t).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }) + (yrs > 1.2 ? ' ' + String(y).slice(2) : ''), xx, h - 5); }
    if (o.ref != null) { c.strokeStyle = '#39414c'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(pl, Y(o.ref, 'l')); c.lineTo(w - pr, Y(o.ref, 'l')); c.stroke(); c.setLineDash([]); }
    S.forEach(function (s) { var ax = s.ax || 'l'; c.strokeStyle = s.c; c.lineWidth = s.w || 1.5; c.setLineDash(s.dash || []); c.beginPath(); s.p.forEach(function (p, i) { var xx = X(p[0]), yy = Y(p[1], ax); if (s.step && i) c.lineTo(xx, Y(s.p[i - 1][1], ax)); i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); }); c.stroke(); c.setLineDash([]);
      if (s.fill) { c.lineTo(X(s.p[s.p.length - 1][0]), h - pb); c.lineTo(X(s.p[0][0]), h - pb); c.closePath(); c.fillStyle = s.fill; c.fill(); } });
  }
  function bars(cv, rows) {
    var w = cv.clientWidth || 640, h = cv.clientHeight || 260, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var c = cv.getContext('2d'); c.scale(r, r);
    var mx = Math.max.apply(0, rows.map(function (x) { return x.btc; })), lw = w < 500 ? 92 : 150, bh = (h - 8) / rows.length;
    c.font = (w < 500 ? '10px' : '11px') + ' ui-monospace,Menlo,monospace'; c.textBaseline = 'middle';
    rows.forEach(function (x, i) { var y = 4 + i * bh, bw = Math.max(2, Math.sqrt(x.btc / mx) * (w - lw - 80)); c.fillStyle = '#c9ced6'; c.textAlign = 'right'; c.fillText(('#' + x.rank + ' ' + x.name).slice(0, w < 500 ? 13 : 24), lw - 6, y + bh / 2);
      c.fillStyle = x.tk === 'MSTR' ? '#F7931A' : 'rgba(247,147,26,.55)'; c.fillRect(lw, y + bh * 0.18, bw, bh * 0.64); c.fillStyle = '#d8dde4'; c.textAlign = 'left'; c.fillText(fmt(x.btc) + ' ₿', lw + bw + 6, y + bh / 2); });
  }
  var LEG = function (a) { return '<div class="ch-leg">' + a.map(function (x) { return '<span><i style="background:' + x[0] + (x[2] ? ';height:0;border-top:2px dashed ' + x[0] + ';background:none' : '') + '"></i>' + esc(x[1]) + '</span>'; }).join('') + '</div>'; };

  function need(keys) { return Promise.all(keys.map(function (k) { if (DATA[k] !== undefined) return DATA[k]; var u = { btc: '/assets/data/btc_daily.json', stocks: '/members/data/stocks_daily.json', strat: '/assets/data/strategy.json', desk: '/assets/data/desk.json', prefs: '/members/data/prefs_weekly.json' }[k]; return O(u).then(function (v) { DATA[k] = v; return v; }); })); }
  function btcPts(B, from) { var s = t0(B.start), out = []; B.closes.forEach(function (v, i) { var t = s + i * DAY; if (t >= from) out.push([t, v]); }); return out; }

  var R = {
    perf: function (body, foot) {
      need(['btc', 'stocks']).then(function (d) { var B = d[0], M = d[1].series.MSTR, end = t0(M.d[M.d.length - 1]);
        var from = rng === '1Y' ? end - 365 * DAY : rng === '3Y' ? end - 3 * 365 * DAY : t0('2020-08-10');
        var mp = [], i; for (i = 0; i < M.d.length; i++) { var t = t0(M.d[i]); if (t >= from) mp.push([t, M.c[i]]); }
        var bp = btcPts(B, from).filter(function (p) { return p[0] <= end + DAY; }); if (!mp.length || !bp.length) return;
        var nm = function (a) { var b = a[0][1]; return a.map(function (p) { return [p[0], p[1] / b * 100]; }); }, mN = nm(mp), bN = nm(bp), ml = mN[mN.length - 1][1], bl = bN[bN.length - 1][1];
        body.innerHTML = '<div class="ch-sub"><span class="seg" role="group" aria-label="Range">' + ['1Y', '3Y', 'All'].map(function (k) { return '<button type="button" data-crng="' + k + '"' + (k === rng ? ' class="on"' : '') + '>' + k + '</button>'; }).join('') + '</span>' +
          LEG([['#F7931A', 'MSTR ' + (ml >= 100 ? '+' : '') + fmt(ml - 100) + '%'], ['#c9ced6', 'BTC ' + (bl >= 100 ? '+' : '') + fmt(bl - 100) + '%']]) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), [{ p: bN, c: '#c9ced6', w: 1.3 }, { p: mN, c: '#F7931A' }], { log: rng !== '1Y', ref: 100, yf: function (v) { return fmt(v); } });
        foot.innerHTML = 'Growth of 100, ' + (rng === 'All' ? 'since Strategy’s first BTC purchase (Aug 10, 2020)' : 'past ' + rng) + ' to ' + esc(M.d[M.d.length - 1]) + (rng !== '1Y' ? ', log scale' : '') + '. MSTR: ' + esc(d[1].source) + '; BTC: Coinbase daily closes.';
        body.querySelectorAll('[data-crng]').forEach(function (b) { b.addEventListener('click', function () { rng = b.dataset.crng; LS.set('btd_cperf', rng); show(); }); }); });
    },
    hold: function (body, foot) {
      need(['strat', 'btc']).then(function (d) { var S = d[0], B = d[1], h = 0, cost = 0, H = [], A = [];
        S.purchases.forEach(function (p) { if (p.btc >= 0) { cost += p.cost_musd || 0; h += p.btc; } else { cost -= -p.btc * cost / h; h += p.btc; } var t = t0(p.date); H.push([t, p.holdings]); A.push([t, cost * 1e6 / p.holdings]); });
        var now = Date.now(); H.push([now, S.btc_held]); A.push([now, S.avg_cost_usd]);
        var bp = btcPts(B, t0(S.purchases[0].date)).filter(function (p, i, a) { return i % 3 === 0 || i === a.length - 1; });
        body.innerHTML = '<div class="ch-sub">' + LEG([['#F7931A', 'BTC held (left)'], ['#c9ced6', 'BTC price (right)'], ['#2fd17c', 'Avg cost per BTC (right)', 1]]) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), [{ p: H, c: '#F7931A', step: true, fill: 'rgba(247,147,26,.10)' }, { p: bp, c: '#c9ced6', w: 1, ax: 'r' }, { p: A, c: '#2fd17c', dash: [4, 3], ax: 'r', step: true }], { zero: true, right: true, logR: true, yf: function (v) { return v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v); }, yfr: function (v) { return '$' + (v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v)); } });
        foot.innerHTML = 'Holdings after each of ' + S.purchases.length + ' rows of the <a href="' + esc(S.source_url) + '" target="_blank" rel="noopener">strategy.com ledger</a> (to ' + esc(S.as_of) + '): ' + fmt(S.btc_held) + ' BTC at $' + fmt(S.avg_cost_usd) + ' average (official). The running average is rebuilt from rounded ledger rows (sold BTC removed at average cost), so its path is approximate; the end point is the official figure.'; });
    },
    mnav: function (body, foot) {
      need(['strat', 'stocks', 'btc']).then(function (d) { var X = window.BTDX; if (!X) return; var ser = X.mnavSeries(d[0], d[1].series.MSTR, d[2]); if (ser.length < 60) return;
        var srt = ser.map(function (x) { return x.v; }).sort(function (a, b) { return a - b; }), P = [0.1, 0.25, 0.5, 0.75, 0.9].map(function (p) { return X.q(srt, p); }), last = ser[ser.length - 1].v;
        body.innerHTML = '<div class="ch-sub">' + LEG([['#F7931A', 'Market-cap mNAV (last ' + last.toFixed(2) + 'x)'], ['rgba(247,147,26,.35)', 'p10–p90 / p25–p75 bands']]) + '</div><canvas class="ch-cv"></canvas>';
        X.drawMnav($('canvas', body), ser, P, null);
        foot.innerHTML = 'MSTR close × assumed diluted shares (strategy.com ledger) ÷ (BTC held × BTC close), daily since ' + esc(ser[0].d) + '. Median ' + P[2].toFixed(2) + 'x. Live reading and the official EV-based mNAV are in the MSTR mNAV panel above.'; });
    },
    top: function (body, foot) {
      need(['desk']).then(function (d) { var D = d[0], rows = D.treasuries.rows.slice().sort(function (a, b) { return b.btc - a.btc; }).slice(0, 10);
        body.innerHTML = '<canvas class="ch-cv ch-bars"></canvas>'; bars($('canvas', body), rows);
        foot.innerHTML = 'BTC held, ' + esc(D.treasuries.src.name) + '. Bar length uses a square-root scale so smaller holders stay visible. A verified history of total treasury-company BTC isn’t available free, so this shows the current top 10.'; });
    },
    models: function (body, foot) {
      need(['btc']).then(function (d) { var B = d[0], s = t0(B.start), c = B.closes, P = [], W = [], L = [], wk = [];
        for (var i = 0; i < c.length; i++) { var t = s + i * DAY; if (i % 7 === 0) wk.push(c[i]); if (i % 3 && i !== c.length - 1) continue; P.push([t, c[i]]); L.push([t, 1.0117e-17 * Math.pow((t - GEN) / DAY, 5.82)]);
          if (wk.length >= 200) { var a = 0; for (var k = wk.length - 200; k < wk.length; k++) a += wk[k]; W.push([t, a / 200]); } }
        var lp = c[c.length - 1], lw = W[W.length - 1][1], ll = L[L.length - 1][1];
        body.innerHTML = '<div class="ch-sub">' + LEG([['#c9ced6', 'BTC $' + fmt(lp)], ['#2fd17c', '200-week MA $' + fmt(lw) + ' (' + (lp / lw).toFixed(2) + 'x)'], ['#F7931A', 'Power Law trend $' + fmt(ll) + ' (' + (lp / ll).toFixed(2) + 'x)', 1]]) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), [{ p: P, c: '#c9ced6', w: 1.1 }, { p: W, c: '#2fd17c', w: 1.6 }, { p: L, c: '#F7931A', dash: [5, 4], w: 1.4 }], { log: true, yf: function (v) { return '$' + (v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v)); } });
        foot.innerHTML = 'Log scale, daily closes since ' + esc(B.start) + ' (' + esc(B.source) + '). 200-week MA from weekly closes; Power Law trend = 1.0117e-17 × days since genesis^5.82 (same model as the Model Zones panel). Models are descriptive, not forecasts.'; });
    },
    prefs: function (body, foot) {
      need(['prefs']).then(function (d) { var Q = d[0]; if (!Q) { body.innerHTML = '<p class="muted">Preferred price history unavailable.</p>'; return; }
        var C = { STRF: '#2fd17c', STRK: '#F7931A', STRD: '#ff5a5f' }, S = [], lg = [];
        Object.keys(Q.series).forEach(function (k) { var x = Q.series[k], p = x.w.map(function (a) { return [t0(a[0]), x.rate * Q.par / a[1]]; }); S.push({ p: p, c: C[k] || '#c9ced6' }); lg.push([C[k] || '#c9ced6', k + ' ' + x.rate + '% → ' + p[p.length - 1][1].toFixed(2) + '%']); });
        body.innerHTML = '<div class="ch-sub">' + LEG(lg) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), S, { yf: function (v) { return v.toFixed(1) + '%'; } });
        foot.innerHTML = 'Effective yield = stated annual rate on $100 par ÷ weekly close (' + esc(Q.source) + ', to ' + esc(Q.as_of) + '). Fixed-rate series only: STRC and SATA are variable-rate and their past rates aren’t stored, so no history is drawn for them (current yields are in the Preferreds Desk).'; });
    }
  };
  function show() {
    box.querySelectorAll('[data-ctab]').forEach(function (b) { var on = b.dataset.ctab === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    var body = $('[data-ch-body]', box), foot = $('[data-ch-foot]', box); body.innerHTML = '<p class="muted">Loading…</p>'; foot.textContent = ''; R[cur](body, foot);
  }
  box.innerHTML = '<div class="p-h"><span class="p-t">Charts</span><div class="ch-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" data-ctab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div><div data-ch-body></div><p class="p-f"><span data-ch-foot></span> <b>Education only, not investment advice.</b></p>';
  box.querySelectorAll('[data-ctab]').forEach(function (b) { b.addEventListener('click', function () { cur = b.dataset.ctab; LS.set('btd_ctab', cur); show(); }); });
  var rt, lw = box.clientWidth; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (box.clientWidth !== lw) { lw = box.clientWidth; show(); } }, 200); });
  show();
})();
