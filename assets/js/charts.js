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
  var TABS = [['price', 'Long-term price + models'], ['mnav', 'mNAV history'], ['perf', 'MSTR vs BTC'], ['hold', 'Strategy holdings'], ['dom', 'BTC dominance'], ['ratios', 'BTC/ETH · BTC/SOL'], ['models', 'Models & cycle'], ['prefs', 'Preferred yields'], ['top', 'Treasury BTC'], ['cmpco', 'Company compare']];
  var NOPER = { top: 1 }, GDEF = ['price', 'perf', 'mnav', 'hold'];
  var cur = LS.get('btd_ctab'); if (!TABS.some(function (t) { return t[0] === cur; })) cur = 'price';
  var view = LS.get('btd_cview') === 'grid' ? 'grid' : 'one', grid = null; try { grid = JSON.parse(LS.get('btd_cgrid') || 'null'); } catch (e) {} if (!Array.isArray(grid) || grid.length !== 4) grid = GDEF.slice(); grid = grid.map(function (k, i) { return TABS.some(function (t) { return t[0] === k; }) ? k : GDEF[i]; });
  var PERS = ['1M', '3M', 'YTD', '1Y', '5Y', 'All'], rng = LS.get('btd_cper'); if (PERS.indexOf(rng) < 0) rng = '1Y'; var DATA = {};
  function fromT(endT) { var e = new Date(endT), y = e.getUTCFullYear(), m = e.getUTCMonth(), d = e.getUTCDate(); return rng === '1M' ? Date.UTC(y, m - 1, d) : rng === '3M' ? Date.UTC(y, m - 3, d) : rng === '5Y' ? Date.UTC(y - 5, m, d) : rng === 'YTD' ? Date.UTC(y, 0, 1) : rng === '1Y' ? Date.UTC(y - 1, m, d) : -Infinity; }
  function perTxt() { return rng === 'All' ? 'full history' : rng === 'YTD' ? 'year to date' : 'past ' + rng; }
  function seg() { if (inGrid) return ''; return '<span class="seg" role="group" aria-label="Period">' + PERS.map(function (k) { return '<button type="button" data-crng="' + k + '" aria-pressed="' + (k === rng) + '"' + (k === rng ? ' class="on"' : '') + '>' + k + '</button>'; }).join('') + '</span>'; }
  function clip(p, from) { var out = p.filter(function (x) { return x[0] >= from; }), prev = null; p.forEach(function (x) { if (x[0] < from) prev = x; }); if (prev && isFinite(from)) out.unshift([from, prev[1]]); return out; }

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

    /* Company compare: overlay treasury companies vs BTC. Public: up to 3 companies, Return vs BTC + BTC holdings. Members: up to 6, + BTC per share growth and mNAV. Saved in btd_cco. */
  var CO = [['MSTR', 'Strategy', '#F7931A'], ['ASST', 'Strive', '#2fd17c'], ['MPJPY', 'Metaplanet (ADR)', '#5aa9ff'], ['XXI', 'Twenty One', '#c77dff'], ['MARA', 'MARA', '#ffcc4d'], ['COIN', 'Coinbase', '#ff7b7b']];
  var CM = [['ret', 'Return vs BTC', 0], ['hold', 'BTC holdings', 0], ['bps', 'BTC per share growth', 1], ['mnav', 'mNAV', 1]];
  function memb() { try { return localStorage.getItem('btd_member') === '1'; } catch (e) { return false; } }
  var CC = null; try { CC = JSON.parse(LS.get('btd_cco') || 'null'); } catch (e) {} if (!CC || !Array.isArray(CC.co)) CC = { co: ['MSTR', 'ASST'], met: 'ret' };
  CC.co = CC.co.filter(function (k) { return CO.some(function (c) { return c[0] === k; }); }); if (!CC.co.length) CC.co = ['MSTR']; if (!CM.some(function (m) { return m[0] === CC.met; })) CC.met = 'ret';
  function ccSave() { LS.set('btd_cco', JSON.stringify(CC)); }
  function holdHist(k, d) { // verified holdings history only: strategy.com ledger (MSTR), Strive weekly 8-Ks (ASST)
    if (k === 'MSTR') return d.strat.purchases.filter(function (p) { return p.holdings; }).map(function (p) { return { t: t0(p.date), btc: p.holdings, sh: p.adso_k ? p.adso_k * 1e3 : null }; });
    if (k === 'ASST' && d.strive) return d.strive.points.map(function (p) { return { t: t0(p.date), btc: p.btc, sh: p.shares }; }); return null; }
  function stepAt(H, t) { var x = null; for (var i = 0; i < H.length; i++) { if (H[i].t <= t) x = H[i]; else break; } return x; }
  var R = {
    cmpco: function (body, foot) {
      Promise.all([need(['btc', 'stocks', 'strat']), O('/assets/data/strive.json').catch(function () { return null; })]).then(function (r) {
        var B = r[0][0], ST = r[0][1].series, d = { strat: r[0][2], strive: r[1] }, mem = memb(), met = CC.met; if (!mem && CM.filter(function (m) { return m[0] === met; })[0][2]) met = 'ret';
        var cos = CC.co.slice(0, mem ? 6 : 3), b0 = t0(B.start), bpx = function (t) { return B.closes[Math.round((t - b0) / DAY)]; }, end = Date.now(), from = fromT(end), S = [], leg = [], miss = [];
        cos.forEach(function (k) { var c = CO.filter(function (x) { return x[0] === k; })[0], M = ST[k], H = holdHist(k, d), pts = [];
          if (met === 'ret') { if (!M) { miss.push(k); return; } for (var i = 0; i < M.d.length; i++) { var t = t0(M.d[i]); if (t >= from) pts.push([t, M.c[i]]); } if (pts.length < 2) { miss.push(k); return; } var p0 = pts[0][1]; pts = pts.map(function (p) { return [p[0], p[1] / p0 * 100]; }); }
          else if (met === 'hold') { if (!H) { miss.push(k); return; } pts = clip(H.map(function (h) { return [h.t, h.btc]; }).concat([[end, H[H.length - 1].btc]]), from); }
          else if (met === 'bps') { if (!H) { miss.push(k); return; } var hb = H.filter(function (h) { return h.sh; }).map(function (h) { return [h.t, h.btc / h.sh]; }); hb.push([end, hb[hb.length - 1][1]]); pts = clip(hb, from); if (pts.length < 2) { miss.push(k); return; } var q0 = pts[0][1]; pts = pts.map(function (p) { return [p[0], p[1] / q0 * 100]; }); }
          else if (met === 'mnav') { if (!H || !M) { miss.push(k); return; } var Hs = H.filter(function (h) { return h.sh; }); for (i = 0; i < M.d.length; i++) { var t2 = t0(M.d[i]); if (t2 < from || t2 < Hs[0].t) continue; var hh = stepAt(Hs, t2), bp = bpx(t2); if (hh && bp) pts.push([t2, M.c[i] * hh.sh / (hh.btc * bp)]); } if (pts.length < 2) { miss.push(k); return; } }
          var last = pts[pts.length - 1][1]; S.push({ p: pts, c: c[2], w: k === 'MSTR' ? 1.8 : 1.4, step: met === 'hold' || met === 'bps' });
          leg.push([c[2], k + ' ' + (met === 'ret' || met === 'bps' ? (last >= 100 ? '+' : '') + fmt(last - 100) + '%' : met === 'hold' ? fmt(last) + ' ₿' : last.toFixed(2) + 'x')]); });
        if (met === 'ret' && S.length) { var f0 = Math.min.apply(0, S.map(function (x) { return x.p[0][0]; })), bb = btcPts(B, Math.max(from, f0)); if (bb.length > 1) { var z = bb[0][1]; bb = bb.map(function (p) { return [p[0], p[1] / z * 100]; }); S.unshift({ p: bb, c: '#c9ced6', w: 1.2, dash: [4, 3] }); leg.unshift(['#c9ced6', 'BTC ' + (bb[bb.length - 1][1] >= 100 ? '+' : '') + fmt(bb[bb.length - 1][1] - 100) + '%', 1]); } }
        var chips = '<div class="cc-row" role="group" aria-label="Companies">' + CO.map(function (c) { var on = cos.indexOf(c[0]) >= 0; return '<button type="button" class="pc-chip' + (on ? ' on' : '') + '" data-cc-co="' + c[0] + '" aria-pressed="' + on + '" title="' + esc(c[1]) + '"><i style="background:' + c[2] + '"></i>' + c[0] + '</button>'; }).join('') + '</div>' +
          '<div class="cc-row" role="group" aria-label="Metric">' + CM.map(function (m) { var lock = m[2] && !mem; return '<button type="button" class="pc-chip' + (m[0] === met ? ' on' : '') + (lock ? ' pc-lock' : '') + '" data-cc-met="' + m[0] + '" aria-pressed="' + (m[0] === met) + '">' + m[1] + (m[2] ? '<sup>M</sup>' : '') + '</button>'; }).join('') + '</div>';
        body.innerHTML = '<div class="ch-sub">' + seg() + '</div>' + chips + '<p class="pc-info" data-cc-msg></p>' + (S.length ? LEG(leg) + '<canvas class="ch-cv"></canvas>' : '<p class="muted">No verified history for this pick in this period.</p>');
        if (S.length) line($('canvas', body), S, { log: met === 'hold' || (met === 'ret' && rng === 'All'), ref: met === 'ret' || met === 'bps' ? 100 : met === 'mnav' ? 1 : null, yf: function (v) { return met === 'hold' ? (v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v)) : met === 'mnav' ? v.toFixed(1) + 'x' : fmt(v); } });
        var NOTE = { ret: 'Growth of 100 from the start of the period (or first trading day), daily closes (' + esc(r[0][1].source) + '); BTC dashed (Coinbase). MPJPY is Metaplanet\'s US ADR.',
          hold: 'BTC held over time, verified history only: Strategy from the strategy.com ledger, Strive from its weekly 8-K filings (from Jul 2026). Log scale.',
          bps: 'BTC per assumed diluted share, indexed to 100 at the start of the period: the companies\' own BTC Yield idea. Strategy ledger and Strive 8-Ks.',
          mnav: 'Market-cap mNAV = share price × assumed diluted shares ÷ (BTC held × BTC price), daily, using the latest filing on each day. Official mNAV figures add debt and preferreds.' };
        foot.innerHTML = NOTE[met] + (miss.length ? ' Not shown (no verified data for this metric/period): ' + esc(miss.join(', ')) + '.' : '') + (mem ? '' : ' <a href="/members/">Members: up to 6 companies, BTC per share growth and mNAV &rarr;</a>');
        body.onclick = function (e) { var b = e.target.closest && e.target.closest('button'); if (!b) return; var msg = $('[data-cc-msg]', body);
          if (b.dataset.ccCo) { var k = b.dataset.ccCo, ix = CC.co.indexOf(k); if (ix >= 0) { if (CC.co.length < 2) { msg.textContent = 'Keep at least one company.'; return; } CC.co.splice(ix, 1); } else { if (CC.co.length >= (mem ? 6 : 3)) { msg.innerHTML = mem ? 'Up to 6 companies.' : 'Up to 3 companies here. <a href="/members/">Members compare up to 6 &rarr;</a>'; return; } CC.co.push(k); } ccSave(); R.cmpco(body, foot); }
          else if (b.dataset.ccMet) { var m = CM.filter(function (x) { return x[0] === b.dataset.ccMet; })[0]; if (m[2] && !mem) { msg.innerHTML = '<b>' + m[1] + '</b> is in the free Members set: <a href="/members/">unlock it with your email &rarr;</a>'; return; } CC.met = m[0]; ccSave(); R.cmpco(body, foot); } };
      });
    },
    price: function (body, foot) { if (!window.BTDPrice) { body.innerHTML = '<p class="muted">Price chart unavailable.</p>'; return; } window.BTDPrice.render(body, foot, { per: rng, from: fromT, seg: seg() }); },
    perf: function (body, foot) {
      need(['btc', 'stocks']).then(function (d) { var B = d[0], M = d[1].series.MSTR, end = t0(M.d[M.d.length - 1]);
        var from = rng === 'All' ? t0('2020-08-10') : fromT(end);
        var mp = [], i; for (i = 0; i < M.d.length; i++) { var t = t0(M.d[i]); if (t >= from) mp.push([t, M.c[i]]); }
        var bp = btcPts(B, from).filter(function (p) { return p[0] <= end + DAY; }); if (!mp.length || !bp.length) return;
        var nm = function (a) { var b = a[0][1]; return a.map(function (p) { return [p[0], p[1] / b * 100]; }); }, mN = nm(mp), bN = nm(bp), ml = mN[mN.length - 1][1], bl = bN[bN.length - 1][1];
        body.innerHTML = '<div class="ch-sub">' + seg() +
          LEG([['#F7931A', 'MSTR ' + (ml >= 100 ? '+' : '') + fmt(ml - 100) + '%'], ['#c9ced6', 'BTC ' + (bl >= 100 ? '+' : '') + fmt(bl - 100) + '%']]) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), [{ p: bN, c: '#c9ced6', w: 1.3 }, { p: mN, c: '#F7931A' }], { log: rng === 'All', ref: 100, yf: function (v) { return fmt(v); } });
        foot.innerHTML = 'Growth of 100, ' + (rng === 'All' ? 'since Strategy’s first BTC purchase (Aug 10, 2020)' : perTxt()) + ' to ' + esc(M.d[M.d.length - 1]) + (rng === 'All' ? ', log scale' : '') + '. MSTR: ' + esc(d[1].source) + '; BTC: Coinbase daily closes.';
        });
    },
    hold: function (body, foot) {
      need(['strat', 'btc']).then(function (d) { var S = d[0], B = d[1], h = 0, cost = 0, H = [], A = [];
        S.purchases.forEach(function (p) { if (p.btc >= 0) { cost += p.cost_musd || 0; h += p.btc; } else { cost -= -p.btc * cost / h; h += p.btc; } var t = t0(p.date); H.push([t, p.holdings]); A.push([t, cost * 1e6 / p.holdings]); });
        var now = Date.now(); H.push([now, S.btc_held]); A.push([now, S.avg_cost_usd]); var from = fromT(now); H = clip(H, from); A = clip(A, from);
        var bp = btcPts(B, Math.max(from, t0(S.purchases[0].date))).filter(function (p, i, a) { return rng !== 'All' || i % 3 === 0 || i === a.length - 1; });
        body.innerHTML = '<div class="ch-sub">' + seg() + LEG([['#F7931A', 'BTC held (left)'], ['#c9ced6', 'BTC price (right)'], ['#2fd17c', 'Avg cost per BTC (right)', 1]]) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), [{ p: H, c: '#F7931A', step: true, fill: 'rgba(247,147,26,.10)' }, { p: bp, c: '#c9ced6', w: 1, ax: 'r' }, { p: A, c: '#2fd17c', dash: [4, 3], ax: 'r', step: true }], { zero: rng === 'All', right: true, logR: rng === 'All', yf: function (v) { return v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v); }, yfr: function (v) { return '$' + (v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v)); } });
        foot.innerHTML = (rng === 'All' ? '' : 'Showing the ' + perTxt() + '. ') + 'Holdings after each of ' + S.purchases.length + ' rows of the <a href="' + esc(S.source_url) + '" target="_blank" rel="noopener">strategy.com ledger</a> (to ' + esc(S.as_of) + '): ' + fmt(S.btc_held) + ' BTC at $' + fmt(S.avg_cost_usd) + ' average (official). The running average is rebuilt from rounded ledger rows (sold BTC removed at average cost), so its path is approximate; the end point is the official figure.'; });
    },
    mnav: function (body, foot) {
      need(['strat', 'stocks', 'btc']).then(function (d) { var X = window.BTDX; if (!X) return; var full = X.mnavSeries(d[0], d[1].series.MSTR, d[2]); if (full.length < 60) return; var fT = fromT(t0(full[full.length - 1].d)), f = isFinite(fT) ? new Date(fT).toISOString().slice(0, 10) : '0000', ser = full.filter(function (x) { return x.d >= f; }); if (ser.length < 20) ser = full.slice(-20);
        var srt = ser.map(function (x) { return x.v; }).sort(function (a, b) { return a - b; }), P = [0.1, 0.25, 0.5, 0.75, 0.9].map(function (p) { return X.q(srt, p); }), last = ser[ser.length - 1].v;
        body.innerHTML = '<div class="ch-sub">' + seg() + LEG([['#F7931A', 'Market-cap mNAV (last ' + last.toFixed(2) + 'x)'], ['rgba(247,147,26,.35)', 'p10–p90 / p25–p75 bands of the ' + perTxt()]]) + '</div><canvas class="ch-cv"></canvas>';
        X.drawMnav($('canvas', body), ser, P, null);
        foot.innerHTML = 'MSTR close × assumed diluted shares (strategy.com ledger) ÷ (BTC held × BTC close), daily, ' + esc(ser[0].d) + ' to ' + esc(ser[ser.length - 1].d) + '. Bands and median (' + P[2].toFixed(2) + 'x) are percentiles of the ' + perTxt() + ', recomputed per period. Live reading and the official EV-based mNAV are in the MSTR mNAV card.'; });
    },
    top: function (body, foot) {
      need(['desk']).then(function (d) { var D = d[0], rows = D.treasuries.rows.slice().sort(function (a, b) { return b.btc - a.btc; }).slice(0, 10);
        body.innerHTML = '<canvas class="ch-cv ch-bars"></canvas>'; bars($('canvas', body), rows);
        foot.innerHTML = 'BTC held, ' + esc(D.treasuries.src.name) + '. Bar length uses a square-root scale so smaller holders stay visible. A verified history of total treasury-company BTC isn’t available free, so this shows the current top 10.'; });
    },
    dom: function (body, foot) {
      need(['desk']).then(function (d) { var H = d[0].dominance; if (!H) { body.innerHTML = '<p class="muted">Dominance history unavailable.</p>'; return; }
        var P = H.weekly.map(function (x) { return [t0(x[0]), x[1]]; }), f = fromT(P[P.length - 1][0]); P = P.filter(function (p) { return p[0] >= f; }); if (P.length < 2) P = H.weekly.slice(-2).map(function (x) { return [t0(x[0]), x[1]]; });
        var a = P[0][1], z = P[P.length - 1][1];
        body.innerHTML = '<div class="ch-sub">' + seg() + LEG([['#F7931A', 'BTC dominance ' + z.toFixed(1) + '% (' + (z - a >= 0 ? '+' : '−') + Math.abs(z - a).toFixed(1) + 'pp over the window)']]) + '</div><canvas class="ch-cv"></canvas>';
        var rgD = Math.max.apply(0, P.map(function (p) { return p[1]; })) - Math.min.apply(0, P.map(function (p) { return p[1]; }));
        line($('canvas', body), [{ p: P, c: '#F7931A', w: 1.6 }], { yf: function (v) { return v.toFixed(rgD < 8 ? 1 : 0) + '%'; } });
        foot.innerHTML = 'Weekly (Sunday) samples, ' + esc(H.src.name) + ', to ' + esc(H.as_of) + '. Stored history covers about 1 year, so 5Y and All show that year. Rising = BTC gaining share of the crypto market.'; });
    },
    ratios: function (body, foot) {
      if (DATA.alt === undefined) DATA.alt = Promise.all(['ethereum', 'solana'].map(function (id) { // share the 6h cache the ratios panel writes (btd:h_<id>), so CoinGecko is hit once
        var k = 'btd:h_' + id, ch = null; try { ch = JSON.parse(LS.get(k)); } catch (e) {} var toMs = function (d) { return d.map(function (x) { return [t0(x[0]), x[1]]; }); };
        if (ch && ch.d && Date.now() - ch.t < 6 * 3600e3) return toMs(ch.d);
        return J('https://api.coingecko.com/api/v3/coins/' + id + '/market_chart?vs_currency=usd&days=365&interval=daily').then(function (j) { var d = j.prices.map(function (p) { return [new Date(p[0]).toISOString().slice(0, 10), p[1]]; }); LS.set(k, JSON.stringify({ t: Date.now(), d: d })); return toMs(d); })
          .catch(function () { return ch && ch.d ? toMs(ch.d) : null; }); }));
      Promise.all([need(['btc']), DATA.alt]).then(function (r) { var B = r[0][0], s = t0(B.start), E = r[1][0], Sx = r[1][1]; if (!E && !Sx) { DATA.alt = undefined; body.innerHTML = '<p class="muted">Ratio history unavailable right now (CoinGecko limit). Try again in a minute.</p>'; return; }
        function rat(A) { var out = []; (A || []).forEach(function (p) { var t = Math.floor(p[0] / DAY) * DAY, i = Math.round((t - s) / DAY), b = B.closes[i]; if (b && p[1]) out.push([t, b / p[1]]); }); var f = fromT(out.length ? out[out.length - 1][0] : Date.now()); return out.filter(function (x) { return x[0] >= f; }); }
        var e = rat(E), so = rat(Sx), S = [], lg = [];
        if (e.length > 1) { S.push({ p: e, c: '#7fb3ff', w: 1.5 }); lg.push(['#7fb3ff', 'BTC/ETH ' + e[e.length - 1][1].toFixed(1) + ' (left)']); }
        if (so.length > 1) { S.push({ p: so, c: '#b9a6ff', w: 1.3, ax: e.length > 1 ? 'r' : 'l' }); lg.push(['#b9a6ff', 'BTC/SOL ' + fmt(so[so.length - 1][1]) + (e.length > 1 ? ' (right)' : '')]); }
        body.innerHTML = '<div class="ch-sub">' + seg() + LEG(lg) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), S, { right: e.length > 1 && so.length > 1, yf: function (v) { return v.toFixed(0); }, yfr: function (v) { return fmt(v); } });
        foot.innerHTML = 'How many ETH / SOL one bitcoin buys, daily: BTC closes (Coinbase) ÷ CoinGecko daily prices, last 365 days (5Y and All show that year). Rising = BTC outperforming.'; });
    },
    models: function (body, foot) {
      need(['btc']).then(function (d) { var B = d[0], s = t0(B.start), c = B.closes, P = [], W = [], L = [], wk = [];
        for (var i = 0; i < c.length; i++) { var t = s + i * DAY; if (i % 7 === 0) wk.push(c[i]); if (i % 3 && i !== c.length - 1) continue; P.push([t, c[i]]); L.push([t, 1.0117e-17 * Math.pow((t - GEN) / DAY, 5.82)]);
          if (wk.length >= 200) { var a = 0; for (var k = wk.length - 200; k < wk.length; k++) a += wk[k]; W.push([t, a / 200]); } }
        var lp = c[c.length - 1], lw = W[W.length - 1][1], ll = L[L.length - 1][1], fm = fromT(s + (c.length - 1) * DAY); if (rng !== 'All') { var dd = function (a) { return a.filter(function (x) { return x[0] >= fm; }); }; P = []; for (var j = Math.max(0, Math.floor((fm - s) / DAY)); j < c.length; j++) P.push([s + j * DAY, c[j]]); W = dd(W); L = dd(L); }
        body.innerHTML = '<div class="ch-sub">' + seg() + LEG([['#c9ced6', 'BTC $' + fmt(lp)], ['#2fd17c', '200-week MA $' + fmt(lw) + ' (' + (lp / lw).toFixed(2) + 'x)'], ['#F7931A', 'Power Law trend $' + fmt(ll) + ' (' + (lp / ll).toFixed(2) + 'x)', 1]]) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), [{ p: P, c: '#c9ced6', w: 1.1 }, { p: W, c: '#2fd17c', w: 1.6 }, { p: L, c: '#F7931A', dash: [5, 4], w: 1.4 }], { log: rng === 'All' || rng === '1Y', yf: function (v) { return '$' + (v >= 1e3 ? fmt(v / 1e3) + 'k' : fmt(v)); } });
        foot.innerHTML = (rng === 'All' ? 'Log scale, daily closes since ' + esc(B.start) : perTxt().replace(/^./, function (x) { return x.toUpperCase(); }) + ', daily closes' + (rng === '1Y' ? ', log scale' : '')) + ' (from ' + esc(B.start) + ', ' + esc(B.source) + '). 200-week MA from weekly closes; Power Law trend = 1.0117e-17 × days since genesis^5.82 (same model as the Model Zones panel). Models are descriptive, not forecasts.'; });
    },
    prefs: function (body, foot) {
      need(['prefs']).then(function (d) { var Q = d[0]; if (!Q) { body.innerHTML = '<p class="muted">Preferred price history unavailable.</p>'; return; }
        var C = { STRF: '#2fd17c', STRK: '#F7931A', STRD: '#ff5a5f' }, S = [], lg = [];
        Object.keys(Q.series).forEach(function (k) { var x = Q.series[k], p = x.w.map(function (a) { return [t0(a[0]), x.rate * Q.par / a[1]]; }), fp = fromT(p[p.length - 1][0]); p = p.filter(function (a) { return a[0] >= fp; }); S.push({ p: p, c: C[k] || '#c9ced6' }); lg.push([C[k] || '#c9ced6', k + ' ' + x.rate + '% → ' + p[p.length - 1][1].toFixed(2) + '%']); });
        body.innerHTML = '<div class="ch-sub">' + seg() + LEG(lg) + '</div><canvas class="ch-cv"></canvas>';
        line($('canvas', body), S, { yf: function (v) { return v.toFixed(1) + '%'; } });
        foot.innerHTML = (rng === 'All' ? '' : 'Showing the ' + perTxt() + '. ') + 'Effective yield = stated annual rate on $100 par ÷ weekly close (' + esc(Q.source) + ', to ' + esc(Q.as_of) + '). Fixed-rate series only: STRC and SATA are variable-rate and their past rates aren’t stored, so no history is drawn for them (current yields are in the Preferreds Desk).'; });
    }
  };
  var inGrid = false;
  function lib() { return '<div class="ch-lib" role="tablist" aria-label="Chart library"><span class="ch-lib-h">Chart library</span>' + TABS.map(function (t) { return '<button type="button" role="tab" class="ch-lb ch-lb-' + t[0] + '" data-ctab="' + t[0] + '"><i></i>' + t[1] + '</button>'; }).join('') + '</div>'; }
  function show() {
    var one = $('[data-ch-one]', box), gw = $('[data-ch-grid]', box), isPhone = window.matchMedia('(max-width:760px)').matches, g = view === 'grid' && !isPhone;
    box.classList.toggle('ch-isgrid', g); $$('[data-cview]').forEach(function (b) { var on = b.dataset.cview === (g ? 'grid' : 'one'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    one.hidden = g; gw.hidden = !g;
    if (!g) { inGrid = false;
      box.querySelectorAll('[data-ctab]').forEach(function (b) { var on = b.dataset.ctab === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var body = $('[data-ch-body]', box), foot = $('[data-ch-foot]', box); body.innerHTML = '<p class="muted">Loading…</p>'; foot.textContent = ''; body.onclick = null; R[cur](body, foot);
      var nm = TABS.filter(function (t) { return t[0] === cur; })[0]; $('[data-ch-name]', box).textContent = nm ? nm[1] : ''; return; }
    gw.innerHTML = '<div class="ch-gbar"><span class="seg" role="group" aria-label="Period">' + PERS.map(function (k) { return '<button type="button" data-crng="' + k + '" aria-pressed="' + (k === rng) + '"' + (k === rng ? ' class="on"' : '') + '>' + k + '</button>'; }).join('') + '</span><span class="muted">Pick any chart for each cell · saved in this browser</span></div><div class="ch-g">' +
      grid.map(function (k, i) { return '<div class="ch-cell"><label class="ch-pick"><span class="sr">Chart ' + (i + 1) + '</span><select data-cg="' + i + '">' + TABS.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === k ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label><div class="ch-cb"></div><p class="ch-cf"></p></div>'; }).join('') + '</div>';
    inGrid = true; $$('.ch-cell', gw).forEach(function (cell, i) { R[grid[i]]($('.ch-cb', cell), $('.ch-cf', cell)); }); inGrid = false;
  }
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  box.innerHTML = '<div class="p-h"><span class="p-t">Chart <b class="ch-nm" data-ch-name></b></span><span class="seg ch-view" role="group" aria-label="View"><button type="button" data-cview="one">Single</button><button type="button" data-cview="grid">Grid</button></span></div>' +
    '<div data-ch-one><div data-ch-body></div>' + lib() + '<p class="p-f"><span data-ch-foot></span> <b>Education only, not investment advice.</b></p></div><div data-ch-grid hidden></div>';
  box.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button'); if (!b || !box.contains(b)) return;
    if (b.dataset.crng) { rng = b.dataset.crng; LS.set('btd_cper', rng); show(); }
    else if (b.dataset.ctab) { cur = b.dataset.ctab; LS.set('btd_ctab', cur); show(); }
    else if (b.dataset.cview) { view = b.dataset.cview; LS.set('btd_cview', view); show(); } });
  box.addEventListener('change', function (e) { var s = e.target; if (s.dataset.cg == null) return; grid[+s.dataset.cg] = s.value; LS.set('btd_cgrid', JSON.stringify(grid)); show(); });
  document.addEventListener('btd:chart', function (e) { var k = e.detail; if (!R[k]) return; cur = k; LS.set('btd_ctab', k); if (view === 'grid') { view = 'one'; LS.set('btd_cview', 'one'); } show(); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  var rt, lw = box.clientWidth; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (box.clientWidth !== lw) { lw = box.clientWidth; show(); } }, 200); });
  show();
})();
