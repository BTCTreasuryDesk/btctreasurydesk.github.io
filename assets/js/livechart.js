/* BTC Treasury Desk: main LIVE chart + shared series/draw core (window.BTD_CH, also used by the Live Wall).
   BTC: Coinbase Exchange candles, last candle driven tick-by-tick by BTD_FEED (the SAME feed as the board tiles, so header and chart always match).
   Stocks: intraday = live quotes collected in this browser + tokenized-stock (xStocks) 24/7 intraday where one exists; daily/weekly closes from
   assets/data/stocks_hist.json (weekly refresh) + the live quote. Ranges 1H 1D 1W 1M 3M 1Y All (BTC: Coinbase 1-min/5-min/hourly/hourly/daily/daily candles; All = btc_daily.json weekly). Compare up to 5 symbols (% change). Education only. */
(function () {
  'use strict';
  var F = window.BTD_FEED, DAY = 864e5;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fp(v, cur) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v), d = a >= 1000 ? 0 : a >= 100 ? 2 : a >= 1 ? 2 : 4; var s = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); return cur === 'pct' ? s + '%' : cur && cur !== 'USD' ? s : '$' + s; }
  function sg(v, d) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + '%'; }
  var RANGES = ['1H', '1D', '1W', '1M', '3M', '1Y', 'All'];
  var IDX = { SPX: ['.SPX', 'S&P 500'], IXIC: ['.IXIC', 'Nasdaq'], GOLD: ['@GC.1', 'Gold'] };

  /* ---------- names (top 50 from the weekly leaderboard) ---------- */
  var LB = null, lbP = J('/assets/data/leaderboard.json').then(function (j) { LB = (j.public_companies || []).filter(function (c) { return c.ticker && c.btc && c.stock_price; }).slice(0, 50); return LB; }).catch(function () { LB = []; return LB; });
  function nameOf(t) { if (t === 'BTC') return 'Bitcoin'; if (IDX[t]) return IDX[t][1]; var c = (LB || []).filter(function (x) { return x.ticker === t; })[0]; return c ? c.name : t; }
  function cnOf(t) { return IDX[t] ? IDX[t][0] : F ? F.cn(t) : null; }

  /* ---------- series ---------- */
  var HIST = null, histP = null; function hist() { return histP || (histP = J('/assets/data/stocks_hist.json').then(function (j) { HIST = j; return j; }).catch(function () { HIST = { series: {} }; return HIST; })); }
  var BTCD = null; function btcDaily() { return BTCD ? Promise.resolve(BTCD) : J('/assets/data/btc_daily.json').then(function (j) { var t0 = Date.parse(j.start + 'T00:00:00Z'); BTCD = j.closes.map(function (c, i) { return { t: t0 + i * DAY, c: c }; }); return BTCD; }); }
  var CBU = 'https://api.exchange.coinbase.com/products/BTC-USD/candles', GR = { '1H': [60, 1 / 24], '1D': [300, 1], '1W': [3600, 7], '1M': [3600, 30], '3M': [86400, 92], '1Y': [86400, 366] }, cache = {};
  function btcSeries(r) {
    if (r === 'All') return btcDaily().then(function (d) { var w = d.filter(function (p, i) { return i % 7 === 0 || i === d.length - 1; }); return w.map(function (p) { return { t: p.t, c: p.c }; }); });
    var k = 'BTC' + r; if (cache[k] && Date.now() - cache[k].at < 120e3) return Promise.resolve(cache[k].s);
    var g = GR[r][0], now = Date.now(), from = now - GR[r][1] * DAY, parts = [];
    for (var a = from; a < now; a += g * 299e3) parts.push([a, Math.min(now, a + g * 299e3)]);
    return Promise.all(parts.map(function (p) { return J(CBU + '?granularity=' + g + '&start=' + new Date(p[0]).toISOString() + '&end=' + new Date(p[1]).toISOString()).catch(function () { return []; }); }))
      .then(function (arrs) { var m = {}; arrs.forEach(function (x) { (x || []).forEach(function (q) { m[q[0]] = { t: q[0] * 1e3, l: +q[1], h: +q[2], o: +q[3], c: +q[4] }; }); });
        var s = Object.keys(m).map(function (q) { return m[q]; }).sort(function (x, y) { return x.t - y.t; }); s.g = g * 1e3; cache[k] = { at: Date.now(), s: s }; return s; });
  }
  /* intraday buffer per symbol, kept for today (ET) in this browser */
  function etDay(t) { return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
  var IB = {}; function ibGet(t) { if (IB[t]) return IB[t]; var o = null; try { o = JSON.parse(LS.get('btd_ib_' + t) || 'null'); } catch (e) {} IB[t] = o && o.d === etDay(Date.now()) ? o.p : []; return IB[t]; }
  function ibPush(t, px) { if (px == null) return; var a = ibGet(t), now = Date.now(); if (a.length && now - a[a.length - 1][0] < 14e3) { a[a.length - 1][1] = px; } else a.push([now, px]); if (a.length > 2000) a.splice(0, a.length - 2000); LS.set('btd_ib_' + t, JSON.stringify({ d: etDay(now), p: a })); }
  var XSD = {}; function xsIntra(t) { var id = F && F.XS[t]; if (!id) return Promise.resolve(null); var c = XSD[t]; if (c && Date.now() - c.at < 300e3) return Promise.resolve(c.s);
    return J('https://api.coingecko.com/api/v3/coins/' + id + '/market_chart?vs_currency=usd&days=1').then(function (j) { var s = (j.prices || []).map(function (p) { return { t: p[0], c: p[1] }; }); XSD[t] = { at: Date.now(), s: s }; return s; }).catch(function () { return null; }); }
  function liveQ(t) { var c = cnOf(t); var q = c && F ? F.get(c) : null; return q && q.px != null ? q : null; }
  function curPx(q) { return q ? (q.ext && F.session() !== 'open' ? q.ext.px : q.px) : null; }
  function stockSeries(t, r) {
    var q = liveQ(t), now = Date.now();
    if (r === '1H' || r === '1D') {
      var span = r === '1H' ? 36e5 : DAY, own = ibGet(t).filter(function (p) { return p[0] >= now - span; }).map(function (p) { return { t: p[0], c: p[1] }; });
      return xsIntra(t).then(function (xs) { var s, note = '';
        if (own.length >= 8) { s = own; note = 'Live quotes collected while this page is open'; }
        else if (xs && xs.length > 4) { s = xs.filter(function (p) { return p.t >= now - span; }); note = 'Intraday shape from the tokenized ' + t + ' (xStocks, trades 24/7); last point = live quote'; if (q) s.push({ t: now, c: curPx(q) }); }
        else { return hist().then(function () { var h = histOf(t), base = q && q.prev ? q.prev : h && h.length ? h[h.length - 1].c : null; var s2 = [];
          if (own.length < 3 && h && h.length >= 4) { s2 = h.slice(-6).map(function (p) { return { t: p.t, c: p.c }; }); if (q) s2.push({ t: now, c: curPx(q) }); s2.note = 'No free intraday history for ' + t + ': last 5 daily closes + live quote; the intraday line fills in while this page is open in market hours'; s2.daily = 1; return s2; }
          if (base) s2.push({ t: now - span, c: base }); own.forEach(function (p) { s2.push(p); }); if (q) s2.push({ t: now, c: curPx(q) });
          s2.note = 'Prior close → live quote. Intraday line fills in as live quotes arrive (no free intraday history for ' + t + ')'; s2.flat = 1; return s2; }); }
        s.note = note; return s; });
    }
    return hist().then(function () { var h = histOf(t) || [], from = r === 'All' ? 0 : now - { '1W': 8, '1M': 31, '3M': 92, '1Y': 366 }[r] * DAY, s = h.filter(function (p) { return p.t >= from; });
      if (q && s.length) { var lp = curPx(q); if (now - s[s.length - 1].t > 18 * 36e5) s.push({ t: now, c: lp }); else s[s.length - 1] = { t: s[s.length - 1].t, c: lp }; }
      if (!s.length && q) { s = [{ t: now - DAY, c: q.prev || q.px }, { t: now, c: curPx(q) }]; s.note = 'No stored history for ' + t + ' yet; showing prior close → live'; s.flat = 1; }
      else s.note = 'Daily closes (weekly before the last ~18 months) + live quote'; return s; });
  }
  function histOf(t) { var x = HIST && HIST.series[t]; if (!x) return null; var b = Date.parse(x.d0 + 'T20:00:00Z'); return x.o.map(function (o, i) { return { t: b + o * DAY, c: x.c[i] }; }); }
  function series(t, r) { return t === 'BTC' ? btcSeries(r) : stockSeries(t, r); }
  /* feed every watched stock into its intraday buffer */
  if (F) F.on('*', function (v, k) { if (!v || v.px == null || ['BTC', 'ETH', 'SOL', 'global', 'breadth', 'stable', 'tok', 'quotes', 'session'].indexOf(k) >= 0 || v.cached) return; var s = F.session(); if (s === 'closed') return; ibPush(k, curPx(v)); });

  var ETF = null; function inRTH(t) { try { ETF = ETF || new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }); var P = {}; ETF.formatToParts(new Date(t)).forEach(function (a) { P[a.type] = a.value; }); if (P.weekday === 'Sat' || P.weekday === 'Sun') return false; var m = (+P.hour % 24) * 60 + (+P.minute); return m >= 570 && m <= 960; } catch (e) { return true; } }
  /* ---------- canvas drawing ---------- */
  function draw(cv, sets, o) { // sets: [{s:[{t,c,o,h,l}], col, w}], o: {pct, candle, area, hover, axis, base}
    o = o || {}; var dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return null;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    var ax = o.axis !== false, pr = ax ? (o.prw || 64) : 2, pb = ax ? 18 : 2, pt = 6, pw = W - pr - 2, ph = H - pb - pt;
    var all = [], t0 = Infinity, t1 = -Infinity;
    sets.forEach(function (S) { var s = S.s; if (!s || !s.length) return; var b = s[0].c; S.v = s.map(function (p) { return o.pct ? (p.c / b - 1) * 100 : p.c; });
      s.forEach(function (p, i) { t0 = Math.min(t0, p.t); t1 = Math.max(t1, p.t); all.push(S.v[i]); if (o.candle && !o.pct && p.h) { all.push(p.h, p.l); } }); });
    if (!all.length || !(t1 > t0)) return null;
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all); if (o.base != null && !o.pct) { lo = Math.min(lo, o.base); hi = Math.max(hi, o.base); } var lo0 = lo, pad = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1; lo -= pad; hi += pad; if (!o.pct && lo0 >= 0 && lo < 0) lo = 0;
    var X = function (t) { return 2 + (t - t0) / (t1 - t0) * pw; }, Y = function (v) { return pt + (1 - (v - lo) / (hi - lo)) * ph; };
    if (ax) { x.font = '11px ui-monospace,Menlo,monospace'; x.fillStyle = '#7d8794'; x.strokeStyle = '#1a1f26'; x.lineWidth = 1; x.textAlign = 'left';
      for (var i = 0; i <= 4; i++) { var v = lo + (hi - lo) * i / 4, y = Y(v); x.beginPath(); x.moveTo(2, Math.round(y) + .5); x.lineTo(pw + 2, Math.round(y) + .5); x.stroke(); x.fillText(o.pct ? sg(v, 1) : fp(v, o.cur), pw + 8, y + 4); }
      x.textAlign = 'center'; var span = t1 - t0, nt = pw < 420 ? 2 : 4; for (i = 0; i <= nt; i++) { var tt = t0 + span * i / nt; x.fillText(tlab(tt, span), Math.min(Math.max(X(tt), 24), pw - 20), H - 4); } }
    if (o.base != null && !o.pct && o.base > lo && o.base < hi) { x.setLineDash([3, 4]); x.strokeStyle = '#5a6370'; x.beginPath(); x.moveTo(2, Y(o.base)); x.lineTo(pw + 2, Y(o.base)); x.stroke(); x.setLineDash([]); }
    if (o.pct) { x.strokeStyle = '#3a414b'; x.beginPath(); x.moveTo(2, Y(0)); x.lineTo(pw + 2, Y(0)); x.stroke(); }
    sets.forEach(function (S, si) { var s = S.s; if (!s || !s.length) return; var col = S.col || '#F7931A';
      if (o.candle && !o.pct && si === 0 && s[0].h) { var bw = Math.max(1, pw / s.length * 0.7);
        s.forEach(function (p) { var up = p.c >= p.o, cx = X(p.t); x.strokeStyle = x.fillStyle = up ? '#2fd17c' : '#ff5a5f'; x.beginPath(); x.moveTo(cx, Y(p.h)); x.lineTo(cx, Y(p.l)); x.stroke(); var y1 = Y(Math.max(p.o, p.c)), y2 = Y(Math.min(p.o, p.c)); x.fillRect(cx - bw / 2, y1, bw, Math.max(1, y2 - y1)); }); return; }
      if (o.rth && si === 0 && s.length > 1) { /* Robinhood-style: extended-hours stretches of the line in a lighter tone */ x.lineWidth = S.w || 1.8; x.lineJoin = 'round'; x.strokeStyle = col;
        for (var j = 1; j < s.length; j++) { var rt = inRTH(s[j - 1].t) && inRTH(s[j].t); x.globalAlpha = rt ? 1 : 0.4; x.beginPath(); x.moveTo(X(s[j - 1].t), Y(S.v[j - 1])); x.lineTo(X(s[j].t), Y(S.v[j])); x.stroke(); } x.globalAlpha = 1;
        x.beginPath(); s.forEach(function (p, i) { var px = X(p.t), py = Y(S.v[i]); i ? x.lineTo(px, py) : x.moveTo(px, py); }); }
      else { x.beginPath(); s.forEach(function (p, i) { var px = X(p.t), py = Y(S.v[i]); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.strokeStyle = col; x.lineWidth = S.w || 1.8; x.lineJoin = 'round'; x.stroke(); }
      if (si === 0 && S.v) cv._last = { x: X(s[s.length - 1].t), y: Y(S.v[s.length - 1]) };
      if (o.area && si === 0 && !o.pct) { x.lineTo(X(s[s.length - 1].t), pt + ph); x.lineTo(X(s[0].t), pt + ph); x.closePath(); var g = x.createLinearGradient(0, pt, 0, pt + ph); g.addColorStop(0, col + '59'); g.addColorStop(0.6, col + '1a'); g.addColorStop(1, col + '00'); x.fillStyle = g; x.fill(); }
      var lx = X(s[s.length - 1].t), ly = Y(S.v[S.v.length - 1]); x.fillStyle = col; x.beginPath(); x.arc(lx, ly, si === 0 ? 3 : 2.5, 0, 7); x.fill();
      if (ax && si === 0) { x.fillStyle = col; x.fillRect(pw + 3, ly - 8, pr - 4, 16); x.fillStyle = '#000'; x.textAlign = 'left'; x.font = 'bold 11px ui-monospace,Menlo,monospace'; x.fillText(o.pct ? sg(S.v[S.v.length - 1], 1) : fp(S.v[S.v.length - 1], o.cur), pw + 6, ly + 4); } });
    if (o.hover != null) { var hx = o.hover; if (hx >= 2 && hx <= pw + 2) { var th = t0 + (hx - 2) / pw * (t1 - t0); x.strokeStyle = '#8892a0'; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(hx, pt); x.lineTo(hx, pt + ph); x.stroke(); x.setLineDash([]);
      var rows = sets.map(function (S) { var s = S.s; if (!s || !s.length) return null; var bi = 0, bd = Infinity; s.forEach(function (p, i) { var d = Math.abs(p.t - th); if (d < bd) { bd = d; bi = i; } }); x.fillStyle = S.col; x.beginPath(); x.arc(X(s[bi].t), Y(S.v[bi]), 3.5, 0, 7); x.fill(); return [S.lab || '', S.v[bi], s[bi]]; }).filter(Boolean);
      return { t: th, rows: rows }; } }
    return { t0: t0, t1: t1 };
  }
  function tlab(t, span) { var d = new Date(t), o = { timeZone: 'America/New_York' }; if (span <= 1.1 * DAY) { o.hour = 'numeric'; o.minute = '2-digit'; } else if (span <= 40 * DAY) { o.month = 'short'; o.day = 'numeric'; } else if (span <= 800 * DAY) { o.month = 'short'; o.year = '2-digit'; } else o.year = 'numeric'; return d.toLocaleString('en-US', o); }
  window.BTD_CH = { series: series, draw: draw, nameOf: nameOf, cnOf: cnOf, lb: function () { return lbP; }, liveQ: liveQ, curPx: curPx, fp: fp, sg: sg, tlab: tlab, hist: hist, histOf: histOf };

  /* ---------- the main chart card ---------- */
  var box = document.querySelector('[data-lc]'); if (!box) return;
  var COLS = ['#F7931A', '#4ea1ff', '#c58bff', '#2fd17c', '#ffd166', '#ff6b9a'];
  var MAXC = function () { return innerWidth <= 760 ? 2 : 5; };
  var S = { s: 'BTC', r: '1D', m: 'area', cmp: [] }; try { var so = JSON.parse(LS.get('btd_lc') || '{}'); /* symbol is never restored either: every visit opens on BTC-USD 1D */ /* timeframe is never restored: the hero always opens on 1D (older builds saved 1H) */ if (['area', 'line', 'candle'].indexOf(so.m) >= 0) S.m = so.m; if (Array.isArray(so.cmp) && innerWidth > 760) S.cmp = so.cmp.slice(0, 5).map(String); } catch (e) {}
  function save() { LS.set('btd_lc', JSON.stringify({ s: S.s, m: S.m, cmp: S.cmp })); }
  box.innerHTML = '<div class="lc-h"><div class="lc-sym" role="group" aria-label="Symbol" data-lc-syms></div>' +
    '<div class="seg lc-r" role="tablist" aria-label="Time range">' + RANGES.map(function (r) { return '<button type="button" role="tab" data-lc-r="' + r + '">' + r + '</button>'; }).join('') + '</div>' +
    '<div class="seg lc-m" role="group" aria-label="Chart style"><button type="button" data-lc-m="area">Area</button><button type="button" data-lc-m="line">Line</button><button type="button" data-lc-m="candle" title="Candles (BTC)">Candles</button></div>' +
    '<button type="button" class="chip lc-add" data-lc-cmpbtn aria-expanded="false" aria-label="Compare: overlay other symbols">＋ <span class="lc-addl">Compare</span><span class="lc-adds">vs</span></button></div>' +
    '<div class="lc-read"><span class="lc-name" data-lc-name></span><b class="lc-px" data-lc-px>…</b><span class="lc-ch" data-lc-ch></span><span class="lc-sess" data-lc-sess></span><span class="lc-xh" data-lc-xh hidden></span><span class="lc-hl" data-lc-hl></span></div>' +
    '<div class="lc-cmp" data-lc-legend></div><div class="lc-pick" data-lc-pick hidden></div><div class="lc-pick lc-tops" data-lc-tops hidden></div>' +
    '<div class="lc-cv"><canvas data-lc-cv aria-label="Live price chart"></canvas><span class="lc-dot" data-lc-dot hidden></span><div class="lc-tip" data-lc-tip hidden></div><div class="lc-msg" data-lc-msg hidden></div></div>' +
    '<p class="lc-ft" data-lc-ft></p>';
  var $ = function (q) { return box.querySelector(q); }, cv = $('[data-lc-cv]'), hov = null, DATA = [], tok = 0, raf = 0;
  var REC = []; try { REC = (JSON.parse(LS.get('btd_lc_rec') || '[]') || []).filter(function (t) { return typeof t === 'string' && t !== 'BTC' && t !== 'MSTR'; }).slice(0, 2); } catch (e) {}
  function remember(t) { if (!t || t === 'BTC' || t === 'MSTR' || ['SPX', 'IXIC', 'GOLD'].indexOf(t) >= 0) return; REC = [t].concat(REC.filter(function (x) { return x !== t; })).slice(0, 2); LS.set('btd_lc_rec', JSON.stringify(REC)); }
  function forget() { REC = []; try { localStorage.removeItem('btd_lc_rec'); } catch (e) {} }
  function symsBar() { var base = ['BTC', 'MSTR'].concat(REC); if (base.indexOf(S.s) < 0) base.push(S.s);
    $('[data-lc-syms]').innerHTML = base.map(function (t) { return '<button type="button" class="chip' + (t === S.s ? ' on' : '') + '" data-lc-s="' + esc(t) + '">' + esc(t === '3350.T' ? 'Metaplanet' : t) + '</button>'; }).join('') +
      '<label class="lc-sel"><span class="sr">More symbols</span><select data-lc-more aria-label="Pick any top-50 treasury company"><option value="">Top 50 ▾</option>' + (REC.length ? '<option value="__clr">\u2715 Clear recent picks</option>' : '') + (LB || []).map(function (c) { return '<option value="' + esc(c.ticker) + '">#' + esc(c.rank) + ' ' + esc(c.ticker) + ' · ' + esc(c.name.slice(0, 26)) + '</option>'; }).join('') + '</select></label><button type="button" class="chip lc-topbtn" data-lc-top aria-expanded="false" aria-label="Pick any top-50 treasury company">Top 50 ▾</button>'; }
  function topsPaint() { $('[data-lc-tops]').innerHTML = '<span class="lc-pt">Chart a top-50 treasury company' + (REC.length ? ' \u00b7 <button type="button" class="lc-clr" data-lc-clr>clear recent</button>' : '') + '</span><button type="button" class="chip' + (S.s === 'BTC' ? ' on' : '') + '" data-lc-s="BTC">BTC-USD</button>' + (LB || []).map(function (c) { return '<button type="button" class="chip' + (c.ticker === S.s ? ' on' : '') + '" data-lc-s="' + esc(c.ticker) + '" title="#' + esc(c.rank) + ' ' + esc(c.name) + '">' + esc(c.ticker === '3350.T' ? 'Metaplanet' : c.ticker) + '</button>'; }).join(''); }
  function ui() { symsBar(); box.querySelectorAll('[data-lc-r]').forEach(function (b) { var on = b.dataset.lcR === S.r; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    box.querySelectorAll('[data-lc-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.lcM === S.m); b.disabled = b.dataset.lcM === 'candle' && (S.s !== 'BTC' || S.cmp.length > 0); });
    $('[data-lc-legend]').innerHTML = S.cmp.length ? [S.s].concat(S.cmp).map(function (t, i) { return '<span class="lc-lg" style="--c:' + COLS[i] + '"><i></i>' + esc(t) + ' <b data-lc-lgv="' + i + '"></b>' + (i ? '<button type="button" data-lc-rm="' + esc(t) + '" aria-label="Remove ' + esc(t) + '">×</button>' : '') + '</span>'; }).join('') + '<small>% change over the window</small>' : ''; }
  function pickPaint() { var p = $('[data-lc-pick]'); var have = [S.s].concat(S.cmp), opts = REC.concat(['MSTR', 'BTC', 'SPX', 'IXIC', 'GOLD']).concat((LB || []).map(function (c) { return c.ticker; })).filter(function (t, i, a) { return a.indexOf(t) === i && have.indexOf(t) < 0; });
    p.innerHTML = '<span class="lc-pt">Overlay up to ' + MAXC() + ' (' + Math.max(0, MAXC() - S.cmp.length) + ' left) · axis switches to % change</span>' + opts.slice(0, 54).map(function (t) { return '<button type="button" class="chip" data-lc-addt="' + esc(t) + '"' + (S.cmp.length >= MAXC() ? ' disabled' : '') + '>' + esc(t === '3350.T' ? 'Metaplanet' : t) + '</button>'; }).join(''); }
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-lc-top')) { var tp = $('[data-lc-tops]'); tp.hidden = !tp.hidden; $('[data-lc-pick]').hidden = true; if (!tp.hidden) topsPaint(); box.querySelectorAll('[data-lc-top]').forEach(function (x) { x.setAttribute('aria-expanded', !tp.hidden); }); return; }
    if (b.hasAttribute('data-lc-clr')) { forget(); $('[data-lc-tops]').hidden = true; if (S.s !== 'BTC' && S.s !== 'MSTR') S.s = 'BTC'; save(); ui(); load(); return; }
    if (b.dataset.lcS) { $('[data-lc-tops]').hidden = true; S.s = b.dataset.lcS; remember(S.s); S.cmp = S.cmp.filter(function (t) { return t !== S.s; }); if (S.s !== 'BTC' && S.m === 'candle') S.m = 'area'; }
    else if (b.dataset.lcR) S.r = b.dataset.lcR; else if (b.dataset.lcM) S.m = b.dataset.lcM;
    else if (b.dataset.lcRm) S.cmp = S.cmp.filter(function (t) { return t !== b.dataset.lcRm; });
    else if (b.dataset.lcAddt) { if (S.cmp.length < MAXC()) S.cmp.push(b.dataset.lcAddt); pickPaint(); if (S.cmp.length >= MAXC() || innerWidth <= 760) { $('[data-lc-pick]').hidden = true; box.querySelector('[data-lc-cmpbtn]').setAttribute('aria-expanded', 'false'); } }
    else if (b.hasAttribute('data-lc-cmpbtn')) { var p = $('[data-lc-pick]'); p.hidden = !p.hidden; $('[data-lc-tops]').hidden = true; b.setAttribute('aria-expanded', !p.hidden); if (!p.hidden) pickPaint(); return; }
    else return; save(); ui(); load(); });
  box.addEventListener('click', function (e) { if (!e.target.closest('[data-lc-ch]')) return; var R = ['1D', '1W', '1M', '3M', '1Y', 'All'], i = R.indexOf(S.r); S.r = R[(i + 1) % R.length]; save(); ui(); load(); });
  var lcReg = 0;
  box.addEventListener('change', function (e) { if (e.target.matches('[data-lc-more]') && e.target.value === '__clr') { forget(); if (S.s !== 'BTC' && S.s !== 'MSTR') S.s = 'BTC'; save(); ui(); load(); return; } if (e.target.matches('[data-lc-more]') && e.target.value) { remember(e.target.value); S.s = e.target.value; S.cmp = S.cmp.filter(function (t) { return t !== S.s; }); if (S.m === 'candle') S.m = 'area'; save(); ui(); load(); } });
  function watchAll() { if (F) F.watch([S.s].concat(S.cmp).map(cnOf).filter(Boolean)); }
  function load() { var my = ++tok; watchAll(); var list = [S.s].concat(S.cmp); $('[data-lc-msg]').hidden = false; $('[data-lc-msg]').textContent = 'Loading ' + S.r + '…';
    Promise.all(list.map(function (t) { return series(t, S.r).catch(function () { return []; }); })).then(function (arr) { if (my !== tok) return;
      /* overlays need one common window: if a stock only has daily closes (market closed), compare everything over 1W instead of squeezing BTC's 24h into a corner */
      if (list.length > 1 && (S.r === '1H' || S.r === '1D') && arr.some(function (a) { return a && a.daily; })) return Promise.all(list.map(function (t) { return series(t, '1W').catch(function () { return []; }); })).then(function (a2) { if (my !== tok) return; DATA = a2; DATA.wk = 1; paint(); var sm = $('[data-lc-legend] small'); if (sm) { sm.textContent = 'Market closed: overlay shown over 1W, % change'; sm.className = 'lc-cn'; } });
      DATA = arr; paint(); }); }
  function paint() { raf = 0; var list = [S.s].concat(S.cmp), pct = list.length > 1, s0 = DATA[0] || [];
    var sets = list.map(function (t, i) { return { s: DATA[i] || [], col: COLS[i], lab: t, w: i ? 1.5 : 2 }; });
    var q = S.s === 'BTC' ? (F && F.get('BTC')) : liveQ(S.s);
    var res = draw(cv, sets, { pct: pct, candle: S.m === 'candle' && S.s === 'BTC', area: S.m === 'area', hover: hov, base: !pct && s0.length && (S.r === '1H' || S.r === '1D') ? s0[0].c : null, cur: q && q.cur, rth: !pct && S.s !== 'BTC' && S.s !== 'GOLD' && !S.cmp.length && (S.r === '1H' || S.r === '1D') && q && 'ext' in q && !q.yld && !/^[.@]/.test(cnOf(S.s) || '') });
    var dot = $('[data-lc-dot]'); if (dot) { if (res !== null && cv._last && !pct && S.s === 'BTC' && S.m !== 'candle') { dot.style.left = cv._last.x + 'px'; dot.style.top = cv._last.y + 'px'; dot.hidden = false; } else dot.hidden = true; }
    var msg = $('[data-lc-msg]'); msg.hidden = !!(s0.length > 1); if (!msg.hidden) msg.textContent = s0.length ? 'Waiting for more data…' : 'No data from the free feed right now. Retrying…';
    var tip = $('[data-lc-tip]'); if (res && res.rows) { tip.hidden = false; tip.innerHTML = '<b>' + esc(new Date(res.t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + ' ET</b>' + res.rows.map(function (r) { return '<span>' + esc(r[0]) + ' ' + (pct ? sg(r[1]) : fp(r[1], q && q.cur)) + '</span>'; }).join(''); tip.style.left = Math.min(Math.max(hov - 70, 4), cv.clientWidth - 150) + 'px'; } else tip.hidden = true;
    // readout
    var xhS = S.s !== 'BTC' && q && q.ext && F && F.session() !== 'open' && F.xh ? F.xh(q, { cls: 'xh-lc' }) : '', px = S.s === 'BTC' ? (q && q.px) : (xhS ? q.px : curPx(q)) || (s0.length ? s0[s0.length - 1].c : null); var xe = $('[data-lc-xh]'); if (xe) { xe.innerHTML = xhS; xe.hidden = !xhS; } $('[data-lc-name]').textContent = S.s === 'BTC' ? 'BTC-USD' : (S.s === 'GOLD' ? 'GC=F' : S.s) + ' · ' + nameOf(S.s);
    var pe = $('[data-lc-px]'), old = +pe.dataset.v; pe.textContent = fp(px, q && q.cur); if (px && old && px !== old) { pe.classList.remove('fl-up', 'fl-dn'); void pe.offsetWidth; pe.classList.add(px > old ? 'fl-up' : 'fl-dn'); } pe.dataset.v = px || '';
    var wch = s0.length && px ? (px / s0[0].c - 1) * 100 : null, ce = $('[data-lc-ch]'); var XU = window.BTD_CTX; if (XU && !lcReg) { lcReg = 1; XU.onRange(function (k) { if (k === 'LC' || k == null) paint(); }); } var amtM = XU && XU.unit('LC') === 'amt' && S.cmp.length === 0 && s0.length && px, dv = amtM ? px - s0[0].c : 0; ce.textContent = (amtM ? (dv >= 0 ? '+' : '\u2212') + '$' + Math.abs(dv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : sg(wch)) + ' ' + (DATA.wk ? '1W' : S.r); if (xhS && S.r === '1D' && !amtM && q.chp != null) { wch = q.chp; ce.textContent = sg(q.chp) + ' ' + (XU ? XU.tf(S.s, q, F.session()) : 'day'); } ce.className = 'lc-ch ' + (wch >= 0 ? 'up' : 'dn'); ce.setAttribute('data-spk', 'LC'); ce.setAttribute('role', 'button'); ce.title = 'Tap: timeframe \u00b7 Hold: % / $';
    var sess = S.s === 'BTC' ? 'Live 24/7 · Coinbase' : (function () { var s = F ? F.session() : 'closed'; if (!q) return 'Last close'; if (s === 'open') return q.rt ? 'Live' : 'Live (may be delayed)'; if (q.ext) return 'Regular-session close'; return 'Market closed · last ' + fp(q.px, q.cur); })();
    $('[data-lc-sess]').textContent = sess; $('[data-lc-sess]').className = 'lc-sess' + (/Live|Pre|After/.test(sess) ? ' on' : '');
    if (s0.length) { var hi = -Infinity, lo = Infinity; s0.forEach(function (p) { hi = Math.max(hi, p.h || p.c); lo = Math.min(lo, p.l || p.c); }); $('[data-lc-hl]').textContent = (DATA.wk ? '1W' : S.r) + ' range ' + fp(lo, q && q.cur) + ' – ' + fp(hi, q && q.cur); }
    if (pct) sets.forEach(function (st, i) { var e = box.querySelector('[data-lc-lgv="' + i + '"]'); if (e && st.v && st.v.length) { var v = st.v[st.v.length - 1]; e.textContent = sg(v, 1); e.className = v >= 0 ? 'up' : 'dn'; } });
    var notes = list.map(function (t, i) { return DATA[i] && DATA[i].note && t !== 'BTC' ? t + ': ' + DATA[i].note : null; }).filter(Boolean);
    $('[data-lc-ft]').innerHTML = (S.s === 'BTC' || S.cmp.indexOf('BTC') >= 0 ? 'BTC: Coinbase live feed (same feed as the price board). ' : '') + esc(notes.join(' · ')) + ' · Times ET. Education only.'; var lnm = $('[data-lc-name]'); if (lnm) lnm.title = $('[data-lc-ft]').textContent;
  }
  function soon() { if (!raf) raf = requestAnimationFrame(paint); }
  /* BTC: every tick updates the last candle (1H = 1-minute candles) */
  if (F) F.on('BTC', function (v) { var s = DATA[0]; if (S.s !== 'BTC' || !s || !s.length || !s.g) { if (S.cmp.indexOf('BTC') >= 0) soon(); else if (S.s === 'BTC') soon(); return; }
    var k = s[s.length - 1], now = Date.now(); if (now - k.t >= s.g) { s.push({ t: k.t + s.g * Math.floor((now - k.t) / s.g), o: v.px, h: v.px, l: v.px, c: v.px }); var span = GR[S.r] ? GR[S.r][1] * DAY : 0; while (span && s.length > 2 && s[0].t < now - span) s.shift(); } else { k.c = v.px; k.h = Math.max(k.h, v.px); k.l = Math.min(k.l, v.px); } soon(); });
  if (F) F.on('quotes', function () { if (S.s === 'BTC' && !S.cmp.length) return; var list = [S.s].concat(S.cmp); list.forEach(function (t, i) { if (t === 'BTC') return; var q = liveQ(t), s = DATA[i]; if (!q || !s || !s.length) return; var lp = curPx(q);
      if (S.r === '1H' || S.r === '1D') { if (Date.now() - s[s.length - 1].t > 14e3) s.push({ t: Date.now(), c: lp }); else s[s.length - 1].c = lp; } else s[s.length - 1].c = lp; }); soon(); });
  function hv(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; hov = p.clientX - r.left; soon(); }
  cv.addEventListener('mousemove', hv); cv.addEventListener('touchstart', hv, { passive: true }); cv.addEventListener('touchmove', hv, { passive: true });
  cv.addEventListener('mouseleave', function () { hov = null; soon(); }); cv.addEventListener('touchend', function () { setTimeout(function () { hov = null; soon(); }, 1200); });
  addEventListener('resize', soon);
  setInterval(function () { if (!document.hidden && S.s === 'BTC' && (S.r === '1W' || S.r === '1M' || S.r === '3M' || S.r === '1Y')) { cache['BTC' + S.r] = null; load(); } }, 300e3);
  ui(); load(); lbP.then(function () { ui(); });
})();
