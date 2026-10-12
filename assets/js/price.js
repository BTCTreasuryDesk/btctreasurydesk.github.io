/* BTC Treasury Desk: main price chart renderer (used by the home Charts slot). BTC (log) default, MSTR, or BTC vs MSTR (growth of 100).
   Layers: 200-week MA, Power Law band (BTC), Strategy buy markers, halving lines. Mode + layers saved (btd_pmode, btd_play). Period comes from the Charts slot. */
(function () {
  'use strict';
  var DAY = 864e5, GEN = Date.UTC(2009, 0, 3);
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  var MODES = [['btc', 'BTC'], ['mstr', 'MSTR'], ['cmp', 'BTC vs MSTR']];
  var LAYS = [['wma', '200W MA'], ['pl', 'Power Law'], ['buys', 'Strategy buys'], ['halv', 'Halvings']];
  var HALV = [['2012-11-28', '1st halving'], ['2016-07-09', '2nd halving'], ['2020-05-11', '3rd halving'], ['2024-04-20', '4th halving']];
  var mode = LS.get('btd_pmode'); if (!MODES.some(function (m) { return m[0] === mode; })) mode = 'btc';
  var lay = null; try { lay = JSON.parse(LS.get('btd_play') || 'null'); } catch (e) {} if (!Array.isArray(lay)) lay = ['wma', 'halv']; lay = lay.filter(function (x) { return LAYS.some(function (l) { return l[0] === x; }); });
  var D = null, LIVE = {}, loading = null, mounts = [];
  function live() {
    var a = fetch('https://api.exchange.coinbase.com/products/BTC-USD/stats').then(function (r) { return r.json(); }).then(function (x) { var l = +x.last, o = +x.open; if (l) LIVE.btc = { px: l, chp: o ? (l / o - 1) * 100 : null }; }).catch(function () {});
    var b = fetch('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=MSTR&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1').then(function (r) { return r.json(); }).then(function (j) {
      var x = (j.FormattedQuoteResult || {}).FormattedQuote; x = Array.isArray(x) ? x[0] : x; var px = parseFloat(String(x.last).replace(/,/g, '')); if (isFinite(px)) LIVE.mstr = { px: px, chp: parseFloat(String(x.change_pct).replace(/[%+,]/g, '')) }; }).catch(function () {});
    return Promise.all([a, b]);
  }
  function load() { return loading || (loading = Promise.all([J('/assets/data/btc_daily.json'), J('/members/data/stocks_daily.json'), J('/assets/data/strategy.json').catch(function () { return null; }), live()]).then(function (r) {
    D = { btc: r[0], stocks: r[1], strat: r[2] }; setInterval(function () { if (document.hidden) return; live().then(function () { mounts = mounts.filter(function (m) { return document.body.contains(m.body); }); mounts.forEach(function (m) { paint(m); }); }); }, 60000); return D; })); }
  function series(k) {
    var T = [], C = [];
    if (k === 'btc') { var s0 = Date.parse(D.btc.start + 'T00:00:00Z'); D.btc.closes.forEach(function (v, i) { T.push(s0 + i * DAY); C.push(v); }); }
    else { var M = D.stocks.series.MSTR; M.d.forEach(function (d, i) { T.push(Date.parse(d + 'T00:00:00Z')); C.push(M.c[i]); }); }
    var lv = LIVE[k]; if (lv && lv.px) { if (Date.now() - T[T.length - 1] > DAY * 0.5) { T.push(Date.now()); C.push(lv.px); } else C[C.length - 1] = lv.px; }
    return { T: T, C: C };
  }
  function wma(S, step) { var wk = [], W = [], s = 0; for (var i = S.C.length - 1; i >= 0; i -= step) wk.unshift(i); wk.forEach(function (ix, j) { s += S.C[ix]; if (j >= 200) s -= S.C[wk[j - 200]]; if (j >= 199) W.push([S.T[ix], s / 200]); }); return W; }
  function idxAt(T, t) { var a = 0, b = T.length - 1; while (a < b) { var m = (a + b) >> 1; if (T[m] < t) a = m + 1; else b = m; } return a; }

  function paint(m) {
    var body = m.body, cv = body.querySelector('canvas'); if (!cv || !D) return;
    var w = cv.clientWidth || 600, h = cv.clientHeight || 300, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var g = cv.getContext('2d'); g.scale(r, r);
    var on = function (x) { return lay.indexOf(x) >= 0 && (x !== 'pl' || mode === 'btc') && (x !== 'wma' || mode !== 'cmp'); };
    var main = series(mode === 'mstr' ? 'mstr' : 'btc'), end = main.T[main.T.length - 1], f = m.from(end);
    if (mode === 'cmp') { var ms = series('mstr'); f = Math.max(f, ms.T[0]); }
    var i0 = idxAt(main.T, f), P = []; for (var i = i0; i < main.T.length; i++) P.push([main.T[i], main.C[i]]); if (P.length < 2) return;
    var Q = null; if (mode === 'cmp') { var j0 = idxAt(ms.T, f); Q = []; for (i = j0; i < ms.T.length; i++) Q.push([ms.T[i], ms.C[i]]); var b0 = P[0][1], q0 = Q[0][1]; P = P.map(function (p) { return [p[0], p[1] / b0 * 100]; }); Q = Q.map(function (p) { return [p[0], p[1] / q0 * 100]; }); }
    var W = on('wma') ? wma(main, mode === 'btc' ? 7 : 5).filter(function (p) { return p[0] >= f; }) : [];
    var PL = [], PLlo = [], PLhi = []; if (on('pl')) P.forEach(function (p) { var v = 1.0117e-17 * Math.pow((p[0] - GEN) / DAY, 5.82); PL.push([p[0], v]); PLlo.push([p[0], v * 0.5]); PLhi.push([p[0], v * 2]); });
    var log = mode !== 'cmp' || m.per === '5Y' || m.per === 'All', x0 = P[0][0], x1 = end, vals = P.map(function (p) { return p[1]; });
    (Q || []).concat(W, PL).forEach(function (p) { vals.push(p[1]); });
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
    function ln(a, col, wd, dash) { if (a.length < 2) return; g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash || []); g.beginPath(); a.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); g.stroke(); g.setLineDash([]); g.lineWidth = 1; }
    g.save(); g.beginPath(); g.rect(pl, pt, w - pl - pr, h - pt - pb); g.clip();
    if (PL.length) { g.fillStyle = 'rgba(247,147,26,.07)'; g.beginPath(); PLhi.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); for (var j = PLlo.length - 1; j >= 0; j--) g.lineTo(X(PLlo[j][0]), Y(PLlo[j][1])); g.closePath(); g.fill(); ln(PL, '#F7931A', 1.2, [5, 4]); }
    ln(W, '#2fd17c', 1.6);
    if (mode !== 'cmp') { var up = P[P.length - 1][1] >= P[0][1]; g.fillStyle = up ? 'rgba(47,209,124,.06)' : 'rgba(255,90,95,.06)'; g.beginPath(); P.forEach(function (p, j) { j ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])); }); g.lineTo(X(x1), h - pb); g.lineTo(X(x0), h - pb); g.closePath(); g.fill(); }
    ln(P, mode === 'cmp' ? '#c9ced6' : '#e9edf2', 1.5); if (Q) ln(Q, '#F7931A', 1.6);
    var buys = []; if (on('buys') && D.strat) { var tgt = mode === 'cmp' ? Q : P, TT = tgt.map(function (p) { return p[0]; }); D.strat.purchases.forEach(function (b) { if (!(b.btc > 0)) return; var t = Date.parse(b.date + 'T00:00:00Z'); if (t < x0) return; var ix = idxAt(TT, t); if (Math.abs(TT[ix] - t) < 6 * DAY) buys.push([TT[ix], tgt[ix][1], b]); });
      var mx = Math.max.apply(0, buys.map(function (b) { return b[2].btc; }).concat([1])); buys.forEach(function (b) { g.fillStyle = 'rgba(247,147,26,.9)'; g.strokeStyle = '#000'; g.beginPath(); g.arc(X(b[0]), Y(b[1]), 2.2 + Math.sqrt(b[2].btc / mx) * 6, 0, 7); g.fill(); g.stroke(); }); }
    g.restore();
    var lp = P[P.length - 1]; g.fillStyle = '#fff'; g.beginPath(); g.arc(X(lp[0]), Y(lp[1]), 3, 0, 7); g.fill();
    // headline numbers + foot
    var hd = body.querySelector('[data-pc-hd]'), pc = function (a) { return (a[a.length - 1][1] / a[0][1] - 1) * 100; }, cl = function (v) { return v >= 0 ? 'up' : 'dn'; }, sp = function (v) { return (v >= 0 ? '+' : '−') + fmt(Math.abs(v), Math.abs(v) < 100 ? 1 : 0) + '%'; };
    var plbl = m.per === 'All' ? (mode === 'cmp' ? 'since ' + new Date(x0).getUTCFullYear() : 'all') : m.per;
    if (mode === 'cmp') hd.innerHTML = '<span><i class="pc-k" style="background:#c9ced6"></i>BTC <b class="' + cl(pc(P)) + '">' + sp(pc(P)) + '</b></span><span><i class="pc-k" style="background:#F7931A"></i>MSTR <b class="' + cl(pc(Q)) + '">' + sp(pc(Q)) + '</b></span><span class="muted">' + plbl + '</span>';
    else { var lv = LIVE[mode]; hd.innerHTML = '<b class="pc-px">$' + fmt(lp[1], lp[1] < 1000 ? 2 : 0) + '</b>' + (lv && lv.chp != null && isFinite(lv.chp) ? '<span class="' + cl(lv.chp) + '">' + sp(lv.chp).replace('%', '') + (Math.abs(lv.chp) < 100 ? '' : '') + '% today</span>' : '') + '<span class="' + cl(pc(P)) + '">' + sp(pc(P)) + ' ' + plbl + '</span>' + (W.length ? '<span class="muted">' + (lp[1] / W[W.length - 1][1]).toFixed(2) + 'x 200W MA</span>' : '') + (PL.length ? '<span class="muted">' + (lp[1] / PL[PL.length - 1][1]).toFixed(2) + 'x Power Law</span>' : ''); }
    m.foot.innerHTML = (mode === 'cmp' ? 'Growth of 100 from the start of the period, ' + (log ? 'log scale, ' : '') : (mode === 'btc' ? 'BTC daily closes (Coinbase), ' : 'MSTR daily closes (Yahoo Finance, split-adjusted), ') + 'log scale, ') + 'plus a live last point. ' +
      (on('wma') ? '200W MA = average of the last 200 weekly closes. ' : '') + (on('pl') ? 'Power Law trend = 1.0117e-17 × days since genesis^5.82, band 0.5x–2x. ' : '') + (on('buys') ? 'Dots: Strategy BTC purchases from the strategy.com ledger, sized by BTC bought. ' : '') + 'Intraday: <a href="https://www.tradingview.com/chart/?symbol=' + (mode === 'mstr' ? 'NASDAQ%3AMSTR' : 'BITSTAMP%3ABTCUSD') + '" target="_blank" rel="noopener">TradingView &#8599;</a>.';
    // tooltip
    var tip = body.querySelector('.pc-tip');
    cv.onpointermove = function (ev) { var rc = cv.getBoundingClientRect(), cx = ev.clientX - rc.left; if (cx < pl) { tip.hidden = true; return; } var t = x0 + (cx - pl) / (w - pl - pr) * (x1 - x0), ix = idxAt(P.map(function (p) { return p[0]; }), t), p = P[ix];
      var near = function (a) { for (var q = a.length - 1; q >= 0; q--) if (a[q][0] <= p[0] + 3 * DAY) return a[q][1]; return null; }, L = ['<b>' + new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) + '</b>'];
      if (mode === 'cmp') { var qv = near(Q); L.push('BTC ' + sp(p[1] - 100) + (qv ? ' · MSTR ' + sp(qv - 100) : '')); } else L.push((mode === 'btc' ? 'BTC' : 'MSTR') + ' $' + fmt(p[1], p[1] < 1000 ? 2 : 0));
      if (W.length) { var wv = near(W); if (wv) L.push('<i style="color:#2fd17c">200W MA</i> $' + fmt(wv) + ' (' + (p[1] / wv).toFixed(2) + 'x)'); }
      if (PL.length) { var pv = near(PL); L.push('<i style="color:#F7931A">Power Law</i> $' + fmt(pv) + ' (' + (p[1] / pv).toFixed(2) + 'x)'); }
      var bb = buys.filter(function (b) { return Math.abs(b[0] - p[0]) < 3.5 * DAY; })[0]; if (bb) L.push('<i style="color:#F7931A">Strategy bought</i> ' + fmt(bb[2].btc) + ' BTC (' + bb[2].date + ')');
      tip.innerHTML = L.join('<br>'); tip.hidden = false; tip.style.left = Math.min(w - tip.offsetWidth - 2, Math.max(0, cx + 10)) + 'px'; tip.style.top = '4px'; };
    cv.onpointerleave = function () { tip.hidden = true; };
  }
  function controls() {
    return '<div class="pc-ctl"><span class="seg pc-mode" role="group" aria-label="Chart">' + MODES.map(function (x) { return '<button type="button" data-pc-mode="' + x[0] + '" aria-pressed="' + (x[0] === mode) + '"' + (x[0] === mode ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</span>' +
      '<span class="pc-chips" role="group" aria-label="Layers">' + LAYS.map(function (l) { var o = lay.indexOf(l[0]) >= 0, dis = (l[0] === 'pl' && mode !== 'btc') || (l[0] === 'wma' && mode === 'cmp');
        return '<button type="button" class="pc-chip pc-' + l[0] + (o ? ' on' : '') + '" data-pc-lay="' + l[0] + '" aria-pressed="' + o + '"' + (dis ? ' disabled title="Not available in this view"' : '') + '><i></i>' + l[1] + '</button>'; }).join('') + '</span></div>';
  }
  window.BTDPrice = {
    render: function (body, foot, ctx) { // ctx: { per, from(endT), seg }
      var m = { body: body, foot: foot, per: ctx.per, from: ctx.from };
      body.innerHTML = '<div class="ch-sub">' + ctx.seg + controls() + '</div><div class="pc-hd" data-pc-hd></div><div class="pc-w"><canvas class="ch-cv pc-cv" aria-label="Main price chart"></canvas><div class="pc-tip" hidden></div></div>';
      body.onclick = function (e) { var b = e.target.closest && e.target.closest('button'); if (!b) return;
        if (b.dataset.pcMode) { mode = b.dataset.pcMode; LS.set('btd_pmode', mode); window.BTDPrice.render(body, foot, ctx); }
        else if (b.dataset.pcLay) { var l = b.dataset.pcLay, ix = lay.indexOf(l); if (ix >= 0) lay.splice(ix, 1); else lay.push(l); LS.set('btd_play', JSON.stringify(lay)); b.classList.toggle('on', ix < 0); b.setAttribute('aria-pressed', ix < 0); paint(m); } };
      mounts = mounts.filter(function (x) { return x.body !== body && document.body.contains(x.body); }); mounts.push(m);
      load().then(function () { paint(m); }).catch(function () { body.querySelector('[data-pc-hd]').textContent = 'Price history unavailable right now.'; });
    },
    repaint: function () { mounts.forEach(function (m) { if (document.body.contains(m.body)) paint(m); }); }
  };
})();
