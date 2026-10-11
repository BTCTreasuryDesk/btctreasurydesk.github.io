/* Members tools: TA Overlays, Momentum & Trend, mNAV Radar, BTC Yield tracker */
(function () {
  'use strict';
  var M_ = window.MEM, $ = M_.$, $$ = M_.$$, esc = M_.esc, usd = M_.usd, pct = M_.pct, DAY = 864e5;

  /* ---------- TA Overlays (TradingView Advanced Chart widget, loads only once unlocked) ---------- */
  var ta = { s: 'BITSTAMP:BTCUSD', iv: 'W', key: '' };
  function drawTA() {
    var box = $('[data-ta-box]'); if (!M_.unlocked) return; var key = ta.s + ta.iv; if (key === ta.key) return; ta.key = key; box.innerHTML = '';
    var c = document.createElement('div'); c.className = 'tradingview-widget-container'; c.style.height = '100%';
    var w = document.createElement('div'); w.className = 'tradingview-widget-container__widget'; w.style.height = '100%'; c.appendChild(w);
    var s = document.createElement('script'); s.async = true; s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    s.textContent = JSON.stringify({ autosize: true, symbol: ta.s, interval: ta.iv, timezone: 'America/New_York', theme: 'dark', style: '1', locale: 'en', allow_symbol_change: false, save_image: false, calendar: false,
      hide_side_toolbar: false, backgroundColor: 'rgba(0,0,0,1)', gridColor: 'rgba(30,35,43,0.5)', support_host: 'https://www.tradingview.com',
      studies: ['STD;SMA', 'STD;Bollinger_Bands', 'STD;RSI', 'STD;MACD'] }); // free widget ignores custom MA lengths (object form breaks it); 50/200 cross is computed in Momentum & Trend
    c.appendChild(s); box.appendChild(c);
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-ta-sym] button,[data-ta-iv] button'); if (!b) return;
    var g = b.parentNode; $$('button', g).forEach(function (x) { x.classList.toggle('on', x === b); }); if (g.hasAttribute('data-ta-sym')) ta.s = b.dataset.v; else ta.iv = b.dataset.v; drawTA(); });
  M_.tools.ta = { draw: drawTA };

  /* ---------- Momentum & Trend ---------- */
  function ema(a, k) { var o = [], m = 2 / (k + 1), e = null; for (var i = 0; i < a.length; i++) { e = e == null ? a[i] : a[i] * m + e * (1 - m); o.push(i >= k - 1 ? e : null); } return o; }
  function resample(A, per, cut) { var out = [], lastK = null;
    for (var i = 0; i < A.c.length; i++) { if (cut && A.t[i] > cut) break; var d = new Date(A.t[i]), k = per === 'W' ? Math.floor((A.t[i] / DAY + 3) / 7) : per === 'M' ? d.getUTCFullYear() * 12 + d.getUTCMonth() : d.getUTCFullYear() * 4 + Math.floor(d.getUTCMonth() / 3);
      if (k === lastK) out[out.length - 1] = A.c[i]; else { out.push(A.c[i]); lastK = k; } } return out; }
  function checks(c) {
    var n = c.length, L = n - 1, r = {}, rsi = M_.rsiArr(c, 14)[L];
    r.rsi = rsi; var e12 = ema(c, 12), e26 = ema(c, 26), macd = c.map(function (v, i) { return e12[i] != null && e26[i] != null ? e12[i] - e26[i] : null; });
    var mv = macd.filter(function (x) { return x != null; }), sig = ema(mv, 9); r.hist = mv.length >= 9 && sig[sig.length - 1] != null ? mv[mv.length - 1] - sig[sig.length - 1] : null;
    r.roc = n > 12 ? (c[L] / c[L - 12] - 1) * 100 : null; var ma = n >= 10 ? c.slice(n - 10).reduce(function (s, x) { return s + x; }, 0) / 10 : null; r.ma = ma != null ? c[L] / ma - 1 : null;
    var pos = 0, av = 0; [[r.rsi, 50], [r.hist, 0], [r.roc, 0], [r.ma, 0]].forEach(function (p) { if (p[0] == null) return; av++; if (p[0] > p[1]) pos++; });
    r.pos = pos; r.av = av; r.col = av < 2 ? 'n' : pos / av >= 0.75 ? 'g' : pos / av >= 0.5 ? 'a' : 'r'; return r;
  }
  var LBL = { g: 'Trend up', a: 'Mixed', r: 'Trend down', n: 'Not enough history' };
  function grid(cut) { var res = {}; ['BTC', 'MSTR', 'ASST'].forEach(function (s) { var A = M_.asset(s); if (!A) return; res[s] = {}; ['W', 'M', 'Q'].forEach(function (p) { res[s][p] = checks(resample(A, p, cut)); });
    var L = A.c.length - 1; if (cut) while (L > 0 && A.t[L] > cut) L--; res[s].x = A.m200[L] == null ? null : A.m50[L] > A.m200[L] ? 1 : -1; res[s].t = A.t[L]; }); return res; }
  var weeklyDone = false;
  M_.tools.momentum = { init: function () {
    var now = grid(), A = M_.asset('BTC'), prev = grid(A.t[A.c.length - 1] - 7 * DAY), ch = [];
    Object.keys(now).forEach(function (s) { ['W', 'M'].forEach(function (p) { if (prev[s] && prev[s][p].col !== now[s][p].col && now[s][p].col !== 'n') ch.push(s + ' ' + (p === 'W' ? 'weekly' : 'monthly') + ' momentum: ' + LBL[prev[s][p].col].toLowerCase() + ' → <b>' + LBL[now[s][p].col].toLowerCase() + '</b>'); });
      if (prev[s] && prev[s].x !== now[s].x && now[s].x) ch.push(s + ' <b>' + (now[s].x > 0 ? 'golden' : 'death') + ' cross</b> (50D vs 200D)'); });
    if (!weeklyDone) { weeklyDone = true; M_.weekly.push(ch.length ? 'Momentum changes this week: ' + ch.join('; ') + '.' : 'Momentum grid: no color changes on the weekly or monthly reads this week.'); M_.refreshWeekly(); }
  }, draw: function () {
    var G = grid(), P = { W: 'Weekly', M: 'Monthly', Q: 'Quarterly' };
    $('[data-m-grid]').innerHTML = '<thead><tr><th></th><th>Weekly</th><th>Monthly</th><th>Quarterly</th><th>50D / 200D</th></tr></thead><tbody>' + Object.keys(G).map(function (s) { var r = G[s];
      return '<tr><th style="color:var(--tx);font-size:12px">' + s + '</th>' + ['W', 'M', 'Q'].map(function (p) { var c = r[p]; return '<td class="' + c.col + '">' + LBL[c.col] + '<small>' + (c.av ? c.pos + ' of ' + c.av + ' positive' : '—') + '</small></td>'; }).join('') +
        '<td class="' + (r.x == null ? 'n' : r.x > 0 ? 'g' : 'r') + '">' + (r.x == null ? 'n/a' : r.x > 0 ? 'Golden cross' : 'Death cross') + '<small>daily</small></td></tr>'; }).join('') + '</tbody>';
    var f1 = function (v) { return v == null ? '—' : v.toFixed(0); }, sg = function (v) { return v == null ? '—' : '<span class="' + (v > 0 ? 'up' : 'dn') + '">' + (v > 0 ? 'above 0' : 'below 0') + '</span>'; };
    $('[data-m-detail]').innerHTML = '<thead><tr><th>Asset</th><th>Period</th><th class="r">RSI(14)</th><th class="r">MACD hist</th><th class="r">ROC(12)</th><th class="r">vs 10-period avg</th></tr></thead><tbody>' +
      Object.keys(G).map(function (s) { return ['W', 'M', 'Q'].map(function (p) { var c = G[s][p]; return '<tr><td>' + s + '</td><td>' + P[p] + '</td><td class="r">' + f1(c.rsi) + '</td><td class="r">' + sg(c.hist) + '</td><td class="r">' + pct(c.roc, 0) + '</td><td class="r">' + pct(c.ma == null ? null : c.ma * 100, 1) + '</td></tr>'; }).join(''); }).join('') + '</tbody>';
    var st = M_.stocks; $('[data-m-asof]').textContent = 'BTC ' + M_.H.as_of + (st ? ' · stocks ' + st.as_of + ' (' + st.source.split(' (')[0] + ')' : '') + ' · current period = latest close';
  } };

  /* ---------- mNAV Radar ---------- */
  function ledgerSps() { var s = M_.strategy; if (!s) return []; return s.purchases.filter(function (p) { return p.adso_k; }).map(function (p) { return { t: Date.parse(p.date + 'T00:00:00Z'), sps: p.holdings / (p.adso_k * 1000) * 1e8, d: p.date }; }); }
  function striveSps() { var s = M_.strive; if (!s) return []; return s.points.map(function (p) { return { t: Date.parse(p.date + 'T00:00:00Z'), sps: p.btc / p.shares * 1e8, d: p.date, url: p.url }; }); }
  M_.tools.radar = { draw: function () {
    var D = M_.desk; if (!D || !D.treasuries) return; var rows = D.treasuries.rows.filter(function (r) { return r.mnav != null; });
    var ss = striveSps(), ls = ledgerSps(), base = ss.length ? ss[0].t : null, grow = {};
    if (base && ls.length) { var b0 = ls.filter(function (p) { return p.t >= base; })[0]; if (b0) grow.MSTR = { g: (ls[ls.length - 1].sps / b0.sps - 1) * 100, from: b0.d, to: ls[ls.length - 1].d }; }
    if (ss.length > 1) grow.ASST = { g: (ss[ss.length - 1].sps / ss[0].sps - 1) * 100, from: ss[0].d, to: ss[ss.length - 1].d };
    var cv = $('[data-r-cv]'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 700, H = Math.max(280, Math.round(W * 0.5)); cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr;
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); var pad = { l: 46, r: 14, t: 14, b: 70 }, xl = Math.log10(0.05), xh = Math.log10(3);
    var gy = Object.keys(grow).map(function (k) { return grow[k].g; }), yh = Math.max(10, Math.max.apply(null, gy.concat([0])) * 1.25), ylo = Math.min(0, Math.min.apply(null, gy.concat([0])) * 1.25);
    var X = function (m) { return pad.l + (W - pad.l - pad.r) * (Math.log10(Math.max(0.05, Math.min(3, m))) - xl) / (xh - xl); }, Y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - (v - ylo) / (yh - ylo)); };
    g.font = '10px ui-monospace,monospace'; g.strokeStyle = '#161a20'; g.fillStyle = '#5d6672';
    [0.1, 0.25, 0.5, 1, 2, 3].forEach(function (m) { var x = X(m); g.beginPath(); g.moveTo(x, pad.t); g.lineTo(x, H - pad.b + 34); g.stroke(); g.fillText(m + 'x', x - 9, H - 6); });
    for (var v = 0; v <= yh; v += yh > 40 ? 20 : 5) { var y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke(); g.fillText(v + '%', 4, y + 3); }
    g.strokeStyle = '#F7931A88'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(1), pad.t); g.lineTo(X(1), H - pad.b + 34); g.stroke(); g.setLineDash([]); g.fillStyle = '#F7931A'; g.fillText('mNAV 1.0', X(1) + 4, pad.t + 10);
    g.fillStyle = '#7d8794'; g.fillText('mNAV only (no verified per-share data):', pad.l, H - pad.b + 16);
    var pts = [], sy = H - pad.b + 30;
    rows.forEach(function (r, k) { var gr = grow[r.tk], x = X(r.mnav), y = gr ? Y(gr.g) : sy, rad = Math.max(4, Math.min(22, Math.sqrt(r.btc) / 28));
      g.fillStyle = gr ? 'rgba(247,147,26,.55)' : 'rgba(125,135,148,.45)'; g.strokeStyle = gr ? '#F7931A' : '#7d8794'; g.beginPath(); g.arc(x, y, gr ? rad : 5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#d8dde4'; g.font = (gr ? '700 11px' : '10px') + ' ui-monospace,monospace'; if (gr || k % 2 === 0) g.fillText(r.tk, x + (gr ? rad : 5) + 3, y + (gr ? 4 : -7)); else g.fillText(r.tk, x + 7, y + 13);
      pts.push({ x: x, y: y, r: r, gr: gr }); });
    var tip = $('[data-r-tip]'); cv.onmousemove = function (e) { var b = cv.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top, best = null, bd = 400;
      pts.forEach(function (p) { var d = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my); if (d < bd) { bd = d; best = p; } });
      if (!best) { tip.style.display = 'none'; return; } tip.innerHTML = esc(best.r.name) + ' (' + esc(best.r.tk) + ')<br>mNAV ' + best.r.mnav.toFixed(2) + 'x · ' + esc(best.r.mnav_src) + '<br>' + best.r.btc.toLocaleString('en-US') + ' BTC' + (best.gr ? '<br>BTC/share ' + pct(best.gr.g) + ' (' + best.gr.from + ' → ' + best.gr.to + ')' : '');
      tip.style.display = 'block'; tip.style.left = Math.min(W - tip.offsetWidth - 4, mx + 12) + 'px'; tip.style.top = (my + 12) + 'px'; }; cv.onmouseleave = function () { tip.style.display = 'none'; };
    $('[data-r-tbl] tbody').innerHTML = rows.map(function (r) { var gr = grow[r.tk]; return '<tr><td>' + esc(r.name) + ' <span class="muted">' + esc(r.tk) + '</span></td><td class="r">' + r.mnav.toFixed(2) + 'x</td><td class="r">' + (gr ? pct(gr.g) : '<span class="muted">—</span>') + '</td></tr>'; }).join('');
    $('[data-r-asof]').textContent = 'mNAV as of ' + D.treasuries.as_of;
    $('[data-r-note]').textContent = 'x: mNAV (log scale; Strategy from strategy.com, others as shown on BitcoinTreasuries.NET, ' + D.treasuries.as_of + '; methods differ by source). y: growth in BTC per share over the same window for every plotted company' + (grow.ASST ? ', ' + grow.ASST.from + ' to ' + grow.ASST.to + ' (Strive 8-Ks; Strategy ledger ' + (grow.MSTR ? grow.MSTR.from + ' to ' + grow.MSTR.to : '') + ')' : '') + '. Bubble size = BTC held. Companies without verified share counts sit on the bottom strip.';
  } };

  /* ---------- BTC Yield tracker ---------- */
  var yco = 'mstr';
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-y-co] button'); if (!b) return; yco = b.dataset.v; $$('[data-y-co] button').forEach(function (x) { x.classList.toggle('on', x === b); }); M_.tools.yield.draw(); });
  M_.tools.yield = { draw: function () {
    var P = yco === 'mstr' ? ledgerSps() : striveSps(); if (P.length < 2) return; var L = P[P.length - 1];
    M_.chart($('[data-y-cv]'), { t: P.map(function (p) { return p.t; }), ratio: 0.42, series: [{ a: P.map(function (p) { return p.sps; }), col: '#F7931A', w: 1.6 }],
      markers: P.map(function (p, i) { return { i: i, v: p.sps, col: '#F7931A', up: true, size: 2 }; }).filter(function (m, i) { return P.length < 30 || i % 4 === 0; }),
      yfmt: function (v) { return Math.round(v).toLocaleString('en-US'); }, padL: 58, tip: $('[data-y-tip]'), tipFn: function (i) { return P[i].d + '<br>' + Math.round(P[i].sps).toLocaleString('en-US') + ' sats/share'; } });
    var find = function (t) { var b = null; P.forEach(function (p) { if (p.t <= t) b = p; }); return b; }, gr = function (b) { return b ? pct((L.sps / b.sps - 1) * 100) : '—'; };
    var ytd = find(Date.UTC(new Date(L.t).getUTCFullYear(), 0, 1) - 1), d90 = find(L.t - 90 * DAY);
    var st = [['Sats per share', Math.round(L.sps).toLocaleString('en-US')], ['BTC Yield YTD', ytd ? gr(ytd) : 'n/a'], ['Last 90 days', d90 ? gr(d90) : 'n/a'], ['Since ' + P[0].d, gr(P[0])]];
    if (yco === 'mstr' && M_.desk) st.push(['strategy.com today', M_.desk.strategy.sats_per_share.toLocaleString('en-US') + ' sats']);
    $('[data-y-stats]').innerHTML = st.map(function (s) { return '<div><small>' + s[0] + '</small><b>' + s[1] + '</b></div>'; }).join('');
    $('[data-y-asof]').textContent = 'to ' + L.d;
    $('[data-y-src]').innerHTML = yco === 'mstr' ? 'Strategy: BTC held and assumed diluted shares outstanding (ADSO) per row of the <a href="' + esc(M_.strategy.source_url) + '" target="_blank" rel="noopener">strategy.com purchases ledger</a> (rows with ADSO, from Jan 2025), retrieved ' + esc(M_.strategy.retrieved) + '.'
      : 'Strive: "Bitcoin held" and "Assumed Fully Diluted Shares" from its <a href="' + esc(M_.strive.source_url) + '" target="_blank" rel="noopener">weekly 8-K filings</a> (from Jul 2026), retrieved ' + esc(M_.strive.retrieved) + '. ' + esc(M_.strive.shares_note);
  } };
})();
