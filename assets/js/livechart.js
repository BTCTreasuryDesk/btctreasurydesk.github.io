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
  var IDX = { SPX: ['.SPX', 'S&P 500'], IXIC: ['.IXIC', 'Nasdaq'], GOLD: ['@GC.1', 'Gold'], DXY: ['.DXY', 'US dollar index'] };
  var CBP = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', XRP: 'XRP-USD', DOGE: 'DOGE-USD', ADA: 'ADA-USD', LINK: 'LINK-USD', AVAX: 'AVAX-USD', LTC: 'LTC-USD', BCH: 'BCH-USD', XLM: 'XLM-USD', SUI: 'SUI-USD', HBAR: 'HBAR-USD', DOT: 'DOT-USD', SHIB: 'SHIB-USD', 'ETH/BTC': 'ETH-BTC', 'SOL/BTC': 'SOL-BTC', 'BTC/ETH': 'ETH-BTC', 'BTC/SOL': 'SOL-BTC' }; var CINV = { 'BTC/ETH': 1, 'BTC/SOL': 1 }; /* BTC/ETH, BTC/SOL = inverted Coinbase pair (BTC as numerator) */ function isC(t) { return !!CBP[t]; } /* Coinbase pairs, 24/7 */

  /* ---------- names (top 50 from the weekly leaderboard) ---------- */
  var LB = null, lbP = J('/assets/data/leaderboard.json').then(function (j) { LB = (j.public_companies || []).filter(function (c) { return c.ticker && c.btc && c.stock_price; }).slice(0, 50); return LB; }).catch(function () { LB = []; return LB; });
  function nameOf(t) { if (t === 'BTC') return 'Bitcoin'; if (t === 'ETH') return 'Ether'; if (t === 'SOL') return 'Solana'; var CNM = { XRP: 'XRP', DOGE: 'Dogecoin', ADA: 'Cardano', LINK: 'Chainlink', AVAX: 'Avalanche', LTC: 'Litecoin', BCH: 'Bitcoin Cash', XLM: 'Stellar', SUI: 'Sui', HBAR: 'Hedera', DOT: 'Polkadot', SHIB: 'Shiba Inu' }; if (CNM[t]) return CNM[t]; if (/\/BTC$/.test(t)) return t.split('/')[0] + ' priced in BTC'; if (CINV[t]) return 'BTC priced in ' + t.split('/')[1]; if (IDX[t]) return IDX[t][1]; var c = (LB || []).filter(function (x) { return x.ticker === t; })[0]; return c ? c.name : t; }
  function cnOf(t) { return IDX[t] ? IDX[t][0] : F ? F.cn(t) : null; }

  /* ---------- series ---------- */
  var HIST = null, histP = null; function hist() { return histP || (histP = J('/assets/data/stocks_hist.json').then(function (j) { HIST = j; return j; }).catch(function () { HIST = { series: {} }; return HIST; })); }
  var BTCD = null; function btcDaily() { return BTCD ? Promise.resolve(BTCD) : J('/assets/data/btc_daily.json').then(function (j) { var t0 = Date.parse(j.start + 'T00:00:00Z'); BTCD = j.closes.map(function (c, i) { return { t: t0 + i * DAY, c: c }; }); return BTCD; }); }
  var CBU = 'https://api.exchange.coinbase.com/products/BTC-USD/candles', GR = { '1H': [60, 1 / 24], '1D': [300, 1], '1W': [3600, 7], '1M': [3600, 30], '3M': [86400, 92], '1Y': [86400, 366] }, cache = {};
  function btcSeries(r, t) { t = t || 'BTC'; var CU = 'https://api.exchange.coinbase.com/products/' + CBP[t] + '/candles';
    if (r === 'All' && t !== 'BTC') r = '1Y';
    if (r === 'All') return btcDaily().then(function (d) { var w = d.filter(function (p, i) { return i % 7 === 0 || i === d.length - 1; }); return w.map(function (p) { return { t: p.t, c: p.c }; }); });
    var k = t + r; if (cache[k] && Date.now() - cache[k].at < 120e3) return Promise.resolve(cache[k].s);
    var g = GR[r][0], now = Date.now(), from = now - GR[r][1] * DAY, parts = [];
    for (var a = from; a < now; a += g * 299e3) parts.push([a, Math.min(now, a + g * 299e3)]);
    return Promise.all(parts.map(function (p) { return J(CU + '?granularity=' + g + '&start=' + new Date(p[0]).toISOString() + '&end=' + new Date(p[1]).toISOString()).catch(function () { return []; }); }))
      .then(function (arrs) { var m = {}; arrs.forEach(function (x) { (x || []).forEach(function (q) { m[q[0]] = { t: q[0] * 1e3, l: +q[1], h: +q[2], o: +q[3], c: +q[4] }; }); });
        var s = Object.keys(m).map(function (q) { return m[q]; }).sort(function (x, y) { return x.t - y.t; }); if (CINV[t]) s = s.map(function (p) { return { t: p.t, o: 1 / p.o, c: 1 / p.c, h: 1 / p.l, l: 1 / p.h }; }); s.g = g * 1e3; cache[k] = { at: Date.now(), s: s }; return s; });
  }
  /* intraday buffer per symbol, kept for today (ET) in this browser */
  function etTs(d, hh, mm) { var y = +d.slice(0, 4), mo = +d.slice(5, 7) - 1, da = +d.slice(8, 10), h12 = +new Date(Date.UTC(y, mo, da, 12)).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }); return Date.UTC(y, mo, da, hh + (12 - h12), mm); } /* ET wall-clock time on date d -> ms */
  function etDay(t) { return new Date(t).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
  var IB = {}; function ibGet(t) { if (IB[t]) return IB[t]; var o = null; try { o = JSON.parse(LS.get('btd_ib_' + t) || 'null'); } catch (e) {} IB[t] = o && o.d === etDay(Date.now()) ? o.p : []; return IB[t]; }
  function ibPush(t, px) { if (px == null) return; var a = ibGet(t), now = Date.now(); if (a.length && now - a[a.length - 1][0] < 14e3) { a[a.length - 1][1] = px; } else a.push([now, px]); if (a.length > 2000) a.splice(0, a.length - 2000); LS.set('btd_ib_' + t, JSON.stringify({ d: etDay(now), p: a })); }
  var XSD = {}; function xsIntra(t) { var id = F && F.XS[t]; if (!id) return Promise.resolve(null); var c = XSD[t]; if (c && Date.now() - c.at < 300e3) return Promise.resolve(c.s);
    return J('https://api.coingecko.com/api/v3/coins/' + id + '/market_chart?vs_currency=usd&days=1').then(function (j) { var s = (j.prices || []).map(function (p) { return { t: p[0], c: p[1] }; }); XSD[t] = { at: Date.now(), s: s }; return s; }).catch(function () { return null; }); }
  function liveQ(t) { if (t === 'ETH' || t === 'SOL') { var cq = F && F.get(t); return cq && cq.px != null ? cq : null; } if (/\//.test(t)) return null; var c = cnOf(t); var q = c && F ? F.get(c) : null; return q && q.px != null ? q : null; }
  function curPx(q) { return q ? (q.ext && F.session() !== 'open' ? q.ext.px : q.px) : null; }
  function stockSeries(t, r) {
    var q = liveQ(t), now = Date.now();
    if (r === '1H' || r === '1D') {
      var span = r === '1H' ? 36e5 : DAY, own = ibGet(t).filter(function (p) { return p[0] >= now - span; }).map(function (p) { return { t: p[0], c: p[1] }; });
      return xsIntra(t).then(function (xs) { var s, note = '';
        if (own.length >= 8) { s = own; note = 'Live quotes collected while this page is open'; }
        else if (xs && xs.length > 4) { s = xs.filter(function (p) { return p.t >= now - span; }); note = 'Intraday shape from the tokenized ' + t + ' (xStocks, trades 24/7); last point = live quote'; if (q) s.push({ t: now, c: curPx(q) }); }
        else { var ses = F ? F.session() : 'closed';
          if (q && q.px != null && q.lt && /^\d{4}-\d{2}-\d{2}$/.test(q.lt) && ses !== 'open') { /* market not in its regular session and no intraday detail: show the last regular session as real points (open -> close -> extended last), on that session's own clock */
            var d = q.lt, s3 = [], dn = new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
            if (q.prev != null) s3.push({ t: etTs(d, 9, 25), c: q.prev }); if (q.open != null) s3.push({ t: etTs(d, 9, 30), c: q.open }); s3.push({ t: etTs(d, 16, 0), c: q.px });
            if (q.ext && q.ext.px != null && q.ext.kind === 'post') s3.push({ t: Math.min(Date.now(), etTs(d, 20, 0)), c: q.ext.px });
            if (q.ext && q.ext.px != null && q.ext.kind === 'pre' && etDay(Date.now()) !== d) s3.push({ t: Math.min(Date.now(), etTs(etDay(Date.now()), 9, 29)), c: q.ext.px });
            s3.sess = (etDay(Date.now()) === d ? 'Today' : dn) + ' session'; s3.note = s3.sess + ' (' + d + '): prior close, open, close' + (q.ext ? ' and extended-hours last trade' : '') + ' from the CNBC quote; no free intraday detail for ' + t + ' outside market hours'; s3.flat = 1; return Promise.resolve(s3); }
          return hist().then(function () { var h = histOf(t), base = q && q.prev ? q.prev : h && h.length ? h[h.length - 1].c : null; var s2 = [];
          if (own.length < 3 && h && h.length >= 4) { s2 = h.slice(-6).map(function (p) { return { t: p.t, c: p.c }; }); if (q) s2.push({ t: now, c: curPx(q) }); s2.note = 'No free intraday history for ' + t + ': last 5 daily closes + live quote; the intraday line fills in while this page is open in market hours'; s2.daily = 1; return s2; }
          var st0 = etTs(etDay(now), ses === 'pre' ? 4 : 9, ses === 'pre' ? 0 : 30); if (base) s2.push({ t: Math.min(st0, own.length ? own[0].t : now - 6e4), c: base }); own.forEach(function (p) { s2.push(p); }); if (q) s2.push({ t: now, c: curPx(q) }); s2.sess = 'Today';
          s2.note = 'Prior close → live quote. Intraday line fills in as live quotes arrive (no free intraday history for ' + t + ')'; s2.flat = 1; return s2; }); }
        s.note = note; return s; });
    }
    return hist().then(function () { var h = histOf(t) || [], from = r === 'All' ? 0 : now - { '1W': 8, '1M': 31, '3M': 92, '1Y': 366 }[r] * DAY, s = h.filter(function (p) { return p.t >= from; });
      if (q && s.length) { var lp = curPx(q); if (now - s[s.length - 1].t > 18 * 36e5) s.push({ t: now, c: lp }); else s[s.length - 1] = { t: s[s.length - 1].t, c: lp }; }
      if (!s.length && q) { s = [{ t: now - DAY, c: q.prev || q.px }, { t: now, c: curPx(q) }]; s.note = 'No stored history for ' + t + ' yet; showing prior close → live'; s.flat = 1; }
      else s.note = 'Daily closes (weekly before the last ~18 months) + live quote'; return s; });
  }
  function histOf(t) { var x = HIST && HIST.series[t]; if (!x) return null; var b = Date.parse(x.d0 + 'T20:00:00Z'); return x.o.map(function (o, i) { return { t: b + o * DAY, c: x.c[i] }; }); }
  function series(t, r) { return isC(t) ? btcSeries(r, t) : stockSeries(t, r); }
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
      return { t: th, rows: rows, t0: t0, t1: t1 }; } }
    return { t0: t0, t1: t1 };
  }
  function tlab(t, span) { var d = new Date(t), o = { timeZone: 'America/New_York' }; if (span <= 1.1 * DAY) { o.hour = 'numeric'; o.minute = '2-digit'; } else if (span <= 40 * DAY) { o.month = 'short'; o.day = 'numeric'; } else if (span <= 800 * DAY) { o.month = 'short'; o.year = '2-digit'; } else o.year = 'numeric'; return d.toLocaleString('en-US', o); }
  window.BTD_CH = { series: series, draw: draw, nameOf: nameOf, cnOf: cnOf, lb: function () { return lbP; }, liveQ: liveQ, curPx: curPx, fp: fp, sg: sg, tlab: tlab, hist: hist, histOf: histOf };

  /* ---------- the main chart card ---------- */
  /* Desktop (>=1024px): two live charts side by side, BTC left and a treasury company right (default MSTR, picker saved in 'btd_lc2', never the same symbol as the left).
     Phone/tablet: one chart with the BTC / MSTR / Pick toggle. */
  var box1 = document.querySelector('[data-lc]'); if (!box1) return;
  var TWO = innerWidth >= 1024, L = null, R = null;
  var B7 = null; function b7() { fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400').then(function (r) { return r.json(); }).then(function (a) { if (Array.isArray(a) && a[7]) B7 = { c: +a[7][4], c30: a[30] ? +a[30][4] : null }; }).catch(function () {}); } b7(); setInterval(b7, 15 * 60e3);
  function SYNC() { return LS.get('btd_lc_sync') !== '0'; }
  function alt(t) { return t === 'MSTR' ? 'BTC' : 'MSTR'; }
  L = card(box1, { key: 'btd_lc', other: TWO ? function () { return R && R.cur(); } : null, sync: function (r) { if (R) R.setR(r); }, hsync: function (t) { if (R) R.hoverT(t); }, onDup: function (t) { if (R) R.open(alt(t), 1); } });
  if (TWO) { var b2 = document.createElement('section'); b2.className = 'p p-live p-live2'; b2.setAttribute('data-lc2', ''); b2.setAttribute('aria-label', 'Second live chart: any treasury company'); box1.classList.add('p-live1'); box1.parentNode.insertBefore(b2, box1.nextSibling);
    var s2 = 'MSTR'; try { var o2 = JSON.parse(LS.get('btd_lc2') || '{}'); if (o2 && typeof o2.s === 'string' && /^[A-Z0-9.\/]{1,12}$/.test(o2.s) && o2.s !== 'BTC') s2 = o2.s; } catch (e) {}
    R = card(b2, { key: 'btd_lc2', two: 1, def: s2, other: function () { return L && L.cur(); }, otherR: function () { return L.r(); }, otherW: function () { return L.w(); }, sync: function (r) { L.setR(r); }, pull: function () { R.setR(L.r()); }, hsync: function (t) { L.hoverT(t); } }); setInterval(function () { if (!document.hidden) R.repaint(); }, 5000); }
  window.BTD_LC = { open: function (t, noScroll) { if (!t) return; if (R && t !== 'BTC' && !isC(t) && !/\//.test(t) && L.cur() !== t) return R.open(t, noScroll); return L.open(t, noScroll); }, left: L, right: R };
  function card(box, O) {
  var COLS = ['#F7931A', '#4ea1ff', '#c58bff', '#2fd17c', '#ffd166', '#ff6b9a'];
  var MAXC = function () { return innerWidth <= 760 ? 2 : 5; };
  var S = { s: 'BTC', r: '1D', m: 'area', cmp: [] }; try { var so = JSON.parse(LS.get(O.key) || '{}'); /* symbol is never restored either: every visit opens on BTC-USD 1D */ /* timeframe is never restored: the hero always opens on 1D (older builds saved 1H) */ if (['area', 'line', 'candle'].indexOf(so.m) >= 0) S.m = so.m; if (Array.isArray(so.cmp) && innerWidth > 760) S.cmp = so.cmp.slice(0, 5).map(String); } catch (e) {}
  if (O.def) S.s = O.def;
  function save() { LS.set(O.key, JSON.stringify({ s: S.s, m: S.m, cmp: S.cmp })); if (O.sync && SYNC()) O.sync(S.r); }
  box.innerHTML = '<div class="lc-h"><div class="lc-sym" role="group" aria-label="Symbol" data-lc-syms></div>' +
    '<div class="seg lc-r" role="tablist" aria-label="Time range">' + RANGES.map(function (r) { return '<button type="button" role="tab" data-lc-r="' + r + '">' + r + '</button>'; }).join('') + '</div>' +
    '<div class="seg lc-m" role="group" aria-label="Chart style"><button type="button" data-lc-m="area">Area</button><button type="button" data-lc-m="line">Line</button><button type="button" data-lc-m="candle" title="Candles (BTC)">Candles</button></div>' +
    '<button type="button" class="chip lc-add" data-lc-cmpbtn aria-expanded="false" aria-label="Compare: overlay other symbols">＋ Compare</button></div>' +
    '<div class="lc-read"><span class="lc-name" data-lc-name></span><b class="lc-px" data-lc-px>…</b><span class="lc-ch" data-lc-ch></span><span class="lc-vs" data-lc-vs hidden></span><span class="lc-sess" data-lc-sess></span><span class="lc-xh" data-lc-xh hidden></span><span class="lc-hl" data-lc-hl></span></div><div class="lc-kn" data-lc-kn aria-label="Key numbers for the selected asset" aria-live="off"></div>' +
    '<div class="lc-cmp" data-lc-legend></div><div class="lc-pick" data-lc-pick hidden></div><div class="lc-pick lc-tops" data-lc-tops hidden></div>' +
    '<div class="lc-cv"><canvas data-lc-cv aria-label="Live price chart"></canvas><span class="lc-dot" data-lc-dot hidden></span><div class="lc-tip" data-lc-tip hidden></div><div class="lc-msg" data-lc-msg hidden></div></div>' +
    '<p class="lc-ft" data-lc-ft></p>';
  var $ = function (q) { return box.querySelector(q); }, cv = $('[data-lc-cv]'), LAST = null, WCH = null, hov = null, DATA = [], tok = 0, raf = 0;
  var REC = []; try { if (LS.get('btd_lc_v') !== '2') { LS.del ? LS.del('btd_lc_rec') : localStorage.removeItem('btd_lc_rec'); LS.set('btd_lc_v', '2'); } /* old builds showed recents as hero chips: clear once */ } catch (e) {} try { REC = (JSON.parse(LS.get('btd_lc_rec') || '[]') || []).filter(function (t) { return typeof t === 'string' && t !== 'BTC' && t !== 'MSTR'; }).slice(0, 2); } catch (e) {}
  function remember(t) { if (!t || t === 'BTC' || t === 'MSTR' || ['SPX', 'IXIC', 'GOLD'].indexOf(t) >= 0) return; REC = [t].concat(REC.filter(function (x) { return x !== t; })).slice(0, 2); LS.set('btd_lc_rec', JSON.stringify(REC)); }
  function forget() { REC = []; try { localStorage.removeItem('btd_lc_rec'); } catch (e) {} }
  function lbl(t) { return t === '3350.T' ? 'Metaplanet' : t; }
  /* Symbol row: BTC, MSTR, the current other pick (desktop also shows 2 recent), then '＋ Pick' (sheet on phone, popover on desktop) */
  function symsBar() { if (O.two) { $('[data-lc-syms]').innerHTML = '<button type="button" class="chip lc-pk lc-co" data-lc-pk aria-haspopup="dialog" aria-expanded="false" title="Switch company: search all top-50 treasury companies (remembered)"><b>' + esc(lbl(S.s)) + '</b> <span class="lc-con">' + esc(nameOf(S.s) || '') + '</span> \u25be</button><button type="button" class="chip lc-sync' + (SYNC() ? ' on' : '') + '" data-lc-sync aria-pressed="' + SYNC() + '" title="Link both charts: same time range and a shared crosshair (remembered)">\u21c4 Sync ' + (SYNC() ? 'on' : 'off') + '</button>'; return; } var oth = O.other ? O.other() : null, base = (O.two ? ['MSTR'] : ['BTC', 'MSTR']).filter(function (t) { return t !== oth; }); if (base.indexOf(S.s) < 0) base.push(S.s);
    $('[data-lc-syms]').innerHTML = base.map(function (t) { return '<button type="button" class="chip lc-sc' + (t === S.s ? ' on' : '') + '" data-lc-s="' + esc(t) + '" aria-pressed="' + (t === S.s) + '">' + esc(lbl(t)) + '</button>'; }).join('') +
      '<button type="button" class="chip lc-pk" data-lc-pk aria-haspopup="dialog" aria-expanded="false" title="Chart any symbol: search, treasury companies, crypto, macro, your watchlist">\uff0b Pick</button>'; return;
    $('[data-lc-syms]').innerHTML += '<label class="lc-sel"><span class="sr">More symbols</span><select data-lc-more aria-label="Pick any top-50 treasury company"><option value="">Top 50 ▾</option>' + (REC.length ? '<option value="__clr">\u2715 Clear recent picks</option>' : '') + (LB || []).map(function (c) { return '<option value="' + esc(c.ticker) + '">#' + esc(c.rank) + ' ' + esc(c.ticker) + ' · ' + esc(c.name.slice(0, 26)) + '</option>'; }).join('') + '</select></label><button type="button" class="chip lc-topbtn" data-lc-top aria-expanded="false" aria-label="Pick any top-50 treasury company">Top 50 ▾</button>'; }
  var SH = null, shQ = '';
  function altTop10() { var g = F && F.g && F.g.top; return (g && g.length ? g : ['ETH', 'XRP', 'SOL', 'DOGE', 'ADA', 'LINK', 'AVAX', 'SUI', 'XLM', 'BCH']).slice(0, 10).filter(function (t) { return t !== 'BTC' && CBP[t]; }); }
  function shGroups() { if (O.two) { var oth2 = O.other ? O.other() : null; return [['Top treasury companies', (LB || []).slice(0, 50).filter(function (c) { return c.ticker !== oth2; }).map(function (c) { return [c.ticker, '#' + c.rank + ' ' + c.name]; })], ['Major altcoins (opt-in) \u00b7 top 10 by market cap, no stablecoins', altTop10().filter(function (t) { return t !== oth2; }).map(function (t) { return [t, nameOf(t) + ' \u00b7 Coinbase ' + CBP[t] + ' (24/7)']; })]]; } var G = [], lb = LB || [], F2 = F, mv = lb.slice(0, 15).map(function (c) { var cn = F2 && F2.cn(c.ticker), q = cn && F2.get(cn); return { t: c.ticker, v: q && q.chp != null ? q.chp : null, n: c.name }; }).filter(function (x) { return x.v != null; }).sort(function (a, b) { return Math.abs(b.v) - Math.abs(a.v); }).slice(0, 3);
    G.push(['Suggested', REC.map(function (t) { return [t, 'recently viewed']; }).concat(mv.map(function (x) { return [x.t, (x.v >= 0 ? '+' : '\u2212') + Math.abs(x.v).toFixed(1) + '% today \u00b7 big mover']; }))]);
    G.push(['Top treasury companies', lb.slice(0, 50).map(function (c) { return [c.ticker, '#' + c.rank + ' ' + c.name]; })]);
    G.push(['Bitcoin', [['BTC', 'Bitcoin \u00b7 Coinbase live']]]);
    G.push(['Macro \u00b7 futures', [['SPX', 'S&P 500'], ['IXIC', 'Nasdaq'], ['GOLD', 'Gold futures'], ['DXY', 'US dollar index']]]);
    var wl = []; try { wl = JSON.parse(LS.get('btd_my2') || '[]') || []; } catch (e) {} wl = (Array.isArray(wl) ? wl : []).map(function (x) { return typeof x === 'string' ? x : x && (x.tk || x.k); }).filter(function (x) { return x && /^[A-Z0-9.]{1,12}$/.test(x); });
    if (wl.length) G.push(['My Watchlist', wl.map(function (t) { return [t, 'from your watchlist']; })]);
    return G; }
  function shPaint() { if (!SH) return; var q = shQ.trim().toUpperCase(), h = '', seen = {};
    shGroups().forEach(function (g) { var it = g[1].filter(function (x) { var k = g[0] + x[0]; if (seen[k]) return false; seen[k] = 1; return !q || x[0].toUpperCase().indexOf(q) >= 0 || x[1].toUpperCase().indexOf(q) >= 0; }); if (!it.length) return;
      h += '<p class="lc-shg">' + esc(g[0]) + (g[0] === 'Suggested' && REC.length && !q ? ' <button type="button" class="lc-shc" data-lc-shclr>Clear recent</button>' : '') + '</p><div class="lc-shl">' + it.map(function (x) { return '<button type="button" class="lc-sho' + (x[0] === S.s ? ' on' : '') + '" data-lc-s="' + esc(x[0]) + '"><b>' + esc(lbl(x[0])) + '</b><small>' + esc(x[1]) + '</small></button>'; }).join('') + '</div>'; });
    if (q && /^[A-Z0-9.]{1,10}$/.test(q)) h += '<p class="lc-shg">Any symbol</p><div class="lc-shl"><button type="button" class="lc-sho" data-lc-s="' + esc(q) + '"><b>' + esc(q) + '</b><small>' + (CBP[q] ? 'Coinbase ' + CBP[q] + ' (24/7)' : 'chart ' + esc(q) + ' from the CNBC quote service (if it has it)') + '</small></button></div>';
    SH.querySelector('[data-lc-shb]').innerHTML = h || '<p class="lc-shg">No match</p>'; }
  function shOpen(btn) { shClose(); SH = document.createElement('div'); SH.className = 'lc-sh' + (innerWidth > 760 ? ' lc-pop' : ''); SH.setAttribute('role', 'dialog'); SH.setAttribute('aria-label', 'Pick a symbol to chart');
    SH.innerHTML = '<div class="lc-shh"><b>Chart a symbol</b><button type="button" class="lc-shx" data-lc-shx aria-label="Close">\u00d7</button></div><input type="search" class="lc-shi" data-lc-shi placeholder="Search or type any ticker (e.g. COIN, ETH, SPX)" autocomplete="off" spellcheck="false" aria-label="Search symbols"><div class="lc-shb" data-lc-shb></div>';
    var bd = document.createElement('div'); bd.className = 'lc-shbd'; bd.setAttribute('data-lc-shbd', ''); document.body.appendChild(bd); document.body.appendChild(SH);
    if (innerWidth > 760) { var r = btn.getBoundingClientRect(); SH.style.top = (r.bottom + scrollY + 6) + 'px'; SH.style.left = Math.max(8, Math.min(r.left + scrollX, innerWidth - 420)) + 'px'; }
    shQ = ''; shPaint(); btn.setAttribute('aria-expanded', 'true'); var inp = SH.querySelector('[data-lc-shi]'); inp.addEventListener('input', function () { shQ = inp.value; shPaint(); }); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var f = SH.querySelector('[data-lc-s]'); if (f) f.click(); } if (e.key === 'Escape') shClose(); });
    if (innerWidth > 760) inp.focus();
    SH.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-lc-shx')) { shClose(); return; } if (b.hasAttribute('data-lc-shclr')) { forget(); if (S.s !== 'BTC' && S.s !== 'MSTR') S.s = 'BTC'; save(); ui(); load(); shPaint(); return; } if (b.dataset.lcS) { var t = b.dataset.lcS; shClose(); API.open(t, 1); } }); bd.addEventListener('click', shClose); }
  function shClose() { if (SH) { SH.remove(); SH = null; } var bd = document.querySelector('[data-lc-shbd]'); if (bd) bd.remove(); var pb = box.querySelector('[data-lc-pk]'); if (pb) pb.setAttribute('aria-expanded', 'false'); }
  function topsPaint() { $('[data-lc-tops]').innerHTML = '<span class="lc-pt">Chart a top-50 treasury company' + (REC.length ? ' \u00b7 <button type="button" class="lc-clr" data-lc-clr>clear recent</button>' : '') + '</span><button type="button" class="chip' + (S.s === 'BTC' ? ' on' : '') + '" data-lc-s="BTC">BTC-USD</button>' + (LB || []).map(function (c) { return '<button type="button" class="chip' + (c.ticker === S.s ? ' on' : '') + '" data-lc-s="' + esc(c.ticker) + '" title="#' + esc(c.rank) + ' ' + esc(c.name) + '">' + esc(c.ticker === '3350.T' ? 'Metaplanet' : c.ticker) + '</button>'; }).join(''); }
  function ui() { symsBar(); box.querySelectorAll('[data-lc-r]').forEach(function (b) { var on = b.dataset.lcR === S.r; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    box.querySelectorAll('[data-lc-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.lcM === S.m); b.disabled = b.dataset.lcM === 'candle' && (S.s !== 'BTC' || S.cmp.length > 0); });
    $('[data-lc-legend]').innerHTML = S.cmp.length ? [S.s].concat(S.cmp).map(function (t, i) { return '<span class="lc-lg" style="--c:' + COLS[i] + '"><i></i>' + esc(t) + ' <b data-lc-lgv="' + i + '"></b>' + (i ? '<button type="button" data-lc-rm="' + esc(t) + '" aria-label="Remove ' + esc(t) + '">×</button>' : '') + '</span>'; }).join('') + '<small>% change over the window</small>' : ''; }
  function pickPaint() { var p = $('[data-lc-pick]'); var have = [S.s].concat(S.cmp), opts = REC.concat(['MSTR', 'BTC', 'SPX', 'IXIC', 'GOLD']).concat((LB || []).map(function (c) { return c.ticker; })).filter(function (t, i, a) { return a.indexOf(t) === i && have.indexOf(t) < 0; });
    p.innerHTML = '<span class="lc-pt">Overlay up to ' + MAXC() + ' (' + Math.max(0, MAXC() - S.cmp.length) + ' left) · axis switches to % change</span>' + opts.slice(0, 54).map(function (t) { return '<button type="button" class="chip" data-lc-addt="' + esc(t) + '"' + (S.cmp.length >= MAXC() ? ' disabled' : '') + '>' + esc(t === '3350.T' ? 'Metaplanet' : t) + '</button>'; }).join(''); }
  box.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-lc-pk')) { if (SH) shClose(); else shOpen(b); return; }
    if (b.hasAttribute('data-lc-sync')) { LS.set('btd_lc_sync', SYNC() ? '0' : '1'); symsBar(); if (SYNC() && O.pull) O.pull(); return; }
    if (b.hasAttribute('data-lc-top')) { var tp = $('[data-lc-tops]'); tp.hidden = !tp.hidden; $('[data-lc-pick]').hidden = true; if (!tp.hidden) topsPaint(); box.querySelectorAll('[data-lc-top]').forEach(function (x) { x.setAttribute('aria-expanded', !tp.hidden); }); return; }
    if (b.hasAttribute('data-lc-clr')) { forget(); $('[data-lc-tops]').hidden = true; if (S.s !== 'BTC' && S.s !== 'MSTR') S.s = 'BTC'; save(); ui(); load(); return; }
    if (b.dataset.lcS) { $('[data-lc-tops]').hidden = true; if (O.other && O.other() === b.dataset.lcS) { if (O.onDup) O.onDup(b.dataset.lcS); else return; } S.s = b.dataset.lcS; remember(S.s); S.cmp = S.cmp.filter(function (t) { return t !== S.s; }); if (S.s !== 'BTC' && S.m === 'candle') S.m = 'area'; }
    else if (b.dataset.lcR) S.r = b.dataset.lcR; else if (b.dataset.lcM) S.m = b.dataset.lcM;
    else if (b.dataset.lcRm) S.cmp = S.cmp.filter(function (t) { return t !== b.dataset.lcRm; });
    else if (b.dataset.lcAddt) { if (S.cmp.length < MAXC()) S.cmp.push(b.dataset.lcAddt); pickPaint(); if (S.cmp.length >= MAXC() || innerWidth <= 760) { $('[data-lc-pick]').hidden = true; box.querySelector('[data-lc-cmpbtn]').setAttribute('aria-expanded', 'false'); } }
    else if (b.hasAttribute('data-lc-cmpbtn')) { var p = $('[data-lc-pick]'); p.hidden = !p.hidden; $('[data-lc-tops]').hidden = true; b.setAttribute('aria-expanded', !p.hidden); if (!p.hidden) pickPaint(); return; }
    else return; save(); ui(); load(); });
  box.addEventListener('click', function (e) { if (!e.target.closest('[data-lc-ch]')) return; var R = ['1D', '1W', '1M', '3M', '1Y', 'All'], i = R.indexOf(S.r); S.r = R[(i + 1) % R.length]; save(); ui(); load(); });
  var lcReg = 0;
  box.addEventListener('change', function (e) { if (e.target.matches('[data-lc-more]') && e.target.value === '__clr') { forget(); if (S.s !== 'BTC' && S.s !== 'MSTR') S.s = 'BTC'; save(); ui(); load(); return; } if (e.target.matches('[data-lc-more]') && e.target.value) { remember(e.target.value); S.s = e.target.value; S.cmp = S.cmp.filter(function (t) { return t !== S.s; }); if (S.m === 'candle') S.m = 'area'; save(); ui(); load(); } });
  function watchAll() { if (F) F.watch([S.s].concat(S.cmp).map(cnOf).filter(Boolean)); }
  function load() { var my = ++tok; watchAll(); var hle = $('[data-lc-hl]'); if (hle) hle.textContent = ''; var list = [S.s].concat(S.cmp); $('[data-lc-msg]').hidden = false; $('[data-lc-msg]').textContent = 'Loading ' + S.r + '…';
    Promise.all(list.map(function (t) { return series(t, S.r).catch(function () { return []; }); })).then(function (arr) { if (my !== tok) return;
      /* overlays need one common window: if a stock only has daily closes (market closed), compare everything over 1W instead of squeezing BTC's 24h into a corner */
      if (list.length > 1 && (S.r === '1H' || S.r === '1D') && arr.some(function (a) { return a && a.daily; })) return Promise.all(list.map(function (t) { return series(t, '1W').catch(function () { return []; }); })).then(function (a2) { if (my !== tok) return; DATA = a2; DATA.wk = 1; paint(); var sm = $('[data-lc-legend] small'); if (sm) { sm.textContent = 'Market closed: overlay shown over 1W, % change'; sm.className = 'lc-cn'; } });
      DATA = arr; paint(); }); }

  /* Key-numbers row under the hero (phone): live, around-the-clock metrics for the selected asset. Real data only; a cell is omitted when its source is missing. Refreshes with the hero (feed ticks) plus every 15 s; values flash on change. */
  var KND = null; fetch('/assets/data/desk.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) { KND = d; kn(); }).catch(function () {});
  function knCells() { var s = S.s, F2 = window.BTD_FEED, out = [], m2 = function (v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }, pc = function (v) { return (v >= 0 ? '+' : '\u2212') + Math.abs(v).toFixed(2) + '%'; };
    var bq = F2 && F2.get('BTC'), btc = bq && bq.px;
    if (s === 'BTC') { if (B7 && B7.c && btc) { var d7 = (btc / B7.c - 1) * 100; out.push(['7D', pc(d7), d7 >= 0 ? 'up' : 'dn', 'BTC vs the Coinbase daily close 7 days ago']); }
      if (bq && bq.lo && bq.hi) out.push(['24h range', '$' + m2(bq.lo, 0) + '\u2013' + m2(bq.hi, 0), '', 'BTC-USD 24-hour low and high (Coinbase)']);
      var FU = window.BTD_FUND; if (FU && FU.f8 != null) out.push(['Funding', (FU.f8 >= 0 ? '+' : '\u2212') + Math.abs(FU.f8).toFixed(4) + '%/8h', FU.f8 >= 0 ? 'up' : 'dn', 'BTC-PERPETUAL funding on Deribit (' + (FU.ann != null ? FU.ann.toFixed(1) + '% annualized; ' : '') + 'positive = longs pay shorts)']);
      return out; }
    if (isC(s) || /\//.test(s)) return out;
    var q = liveQ(s), open = F2 && F2.session() === 'open';
    if (q && q.px != null) { if (!open && q.ext && q.ext.px != null) { var d = (q.ext.px / q.px - 1) * 100; out.push([q.ext.kind === 'pre' ? 'Pre-mkt' : 'After hrs', '$' + m2(q.ext.px, 2) + ' ' + pc(d), d >= 0 ? 'up' : 'dn', 'Official extended-hours trade vs the regular close (CNBC, may be delayed)' + (q.ext.t ? '; ' + q.ext.t : '')]); }
      else if (open && q.chp != null) out.push(['Today', pc(q.chp), q.chp >= 0 ? 'up' : 'dn', 'Regular-session change vs the previous close (CNBC)']);
      var tk = F2.g && F2.g.tok && (F2.g.tok[q.sn] || F2.g.tok[String(q.sn || '').replace(/\..*$/, '')]); if (tk && tk.px && Date.now() - (tk.t || 0) < 3 * 3600e3 && (!q.cur || q.cur === 'USD')) { var dt = (tk.px / q.px - 1) * 100; out.push([q.sn + 'x 24/7', '$' + m2(tk.px, 2) + ' ' + pc(dt), dt >= 0 ? 'up' : 'dn', q.sn + 'x token (xStocks, on-chain, 24/7) vs the last regular close; not the official price and can deviate']); } }
    if (s === 'MSTR' && KND && KND.strategy) { var K = KND.strategy.kpis, mp = q && q.px != null ? (open ? q.px : curPx(q)) : null, mn = window.btdLiveMnav && window.btdLiveMnav(K, mp, btc);
      out.push(['mNAV', (mn ? m2(mn, 2) : m2(KND.strategy.mnav, 2)) + 'x' + (mn ? '' : ' close'), '', mn ? 'Live mNAV, strategy.com method: EV at the ' + (open ? 'live' : 'latest extended-hours') + ' MSTR price / BTC held x live BTC' : 'mNAV at the last close (strategy.com)']);
      var sp = KND.strategy.sats_per_share; if (sp) out.push(['BTC/share', (sp / 1e8).toFixed(6) + ' \u20bf' + (btc ? ' \u00b7 $' + m2(sp / 1e8 * btc, 2) : ''), '', 'BTC per MSTR share (' + m2(sp, 0) + ' sats, strategy.com) valued at the live BTC price']); return out; }
    if (KND && KND.treasuries && KND.treasuries.rows) { var r = KND.treasuries.rows.filter(function (x) { return x.tk === s || x.tv === s || x.tv === cnOf(s); })[0];
      if (r && r.mnav != null) out.push(['mNAV', m2(r.mnav, 2) + 'x', '', 'mNAV' + (r.mnav_src ? ' (' + r.mnav_src + ')' : '')]);
      if (r && r.btc) out.push(['BTC held', m2(r.btc, 0) + ' \u20bf' + (btc ? ' \u00b7 $' + (r.btc * btc / 1e9 >= 1 ? m2(r.btc * btc / 1e9, 2) + 'B' : m2(r.btc * btc / 1e6, 0) + 'M') : ''), '', 'Reported BTC holdings (Desk treasury table), valued at the live BTC price']); }
    return out; }
  function kn() { var el = box.querySelector('[data-lc-kn]'); if (!el) return; var c = []; try { c = knCells(); } catch (e) {} el.hidden = !c.length; if (!c.length) { el.innerHTML = ''; return; }
    var key = S.s + c.map(function (x) { return x[0]; }).join('|'); if (el.dataset.k !== key) { el.dataset.k = key; el.innerHTML = c.map(function (x, i) { return '<span class="kn-c" title="' + esc(x[3]) + '"><em>' + esc(x[0]) + '</em><b data-kn="' + i + '"></b></span>'; }).join(''); }
    c.forEach(function (x, i) { var b = el.querySelector('[data-kn="' + i + '"]'); if (!b || b.textContent === x[1]) return; var had = b.textContent; b.textContent = x[1]; b.className = x[2] || ''; if (had) { b.classList.add('kn-fl'); clearTimeout(b._f); b._f = setTimeout(function () { b.classList.remove('kn-fl'); }, 900); } }); }
  setInterval(function () { if (!document.hidden) kn(); }, 15000);
  function paint() { raf = 0; var list = [S.s].concat(S.cmp), pct = list.length > 1, s0 = DATA[0] || [];
    var sets = list.map(function (t, i) { return { s: DATA[i] || [], col: COLS[i], lab: t, w: i ? 1.5 : 2 }; });
    var q = S.s === 'BTC' ? (F && F.get('BTC')) : liveQ(S.s);
    var res = draw(cv, sets, { pct: pct, candle: S.m === 'candle' && S.s === 'BTC', area: S.m === 'area', hover: hov, base: !pct && s0.length && (S.r === '1H' || S.r === '1D') ? s0[0].c : null, cur: q && q.cur, rth: !pct && S.s !== 'BTC' && S.s !== 'GOLD' && !S.cmp.length && (S.r === '1H' || S.r === '1D') && q && 'ext' in q && !q.yld && !/^[.@]/.test(cnOf(S.s) || '') });
    if (res && res.t1 > res.t0) LAST = res;
    var dot = $('[data-lc-dot]'); if (dot) { if (res !== null && cv._last && !pct && isC(S.s) && S.m !== 'candle') { dot.style.left = cv._last.x + 'px'; dot.style.top = cv._last.y + 'px'; dot.hidden = false; } else dot.hidden = true; }
    var msg = $('[data-lc-msg]'); msg.hidden = !!(s0.length > 1); if (!msg.hidden) msg.textContent = s0.length ? 'Waiting for more data…' : 'No data from the free feed right now. Retrying…';
    var tip = $('[data-lc-tip]'); if (res && res.rows) { tip.hidden = false; tip.innerHTML = '<b>' + esc(new Date(res.t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + ' ET</b>' + res.rows.map(function (r) { return '<span>' + esc(r[0]) + ' ' + (pct ? sg(r[1]) : fp(r[1], q && q.cur)) + '</span>'; }).join(''); tip.style.left = Math.min(Math.max(hov - 70, 4), cv.clientWidth - 150) + 'px'; } else tip.hidden = true;
    // readout
    var xhS = !isC(S.s) && q && F && F.session() !== 'open' && F.xh ? F.xh(q, { cls: 'xh-lc' }) : '', px = isC(S.s) ? (q && q.px) || (s0.length ? s0[s0.length - 1].c : null) : (xhS && q.ext ? q.px : curPx(q)) || (s0.length ? s0[s0.length - 1].c : null); var xe = $('[data-lc-xh]'); if (xe) { xe.innerHTML = xhS; xe.hidden = !xhS; } $('[data-lc-name]').textContent = isC(S.s) ? (S.s.indexOf('/') > 0 ? S.s : CBP[S.s]) + ' \u00b7 ' + nameOf(S.s) : (S.s === 'GOLD' ? 'GC=F' : S.s) + ' · ' + nameOf(S.s);
    var pe = $('[data-lc-px]'), old = +pe.dataset.v; pe.textContent = /\/BTC$/.test(S.s) && px ? px.toFixed(px < 0.01 ? 6 : 5) + ' BTC' : CINV[S.s] && px ? px.toFixed(px >= 100 ? 1 : 2) + ' ' + S.s.split('/')[1] : fp(px, q && q.cur); if (px && old && px !== old) { pe.classList.remove('fl-up', 'fl-dn'); void pe.offsetWidth; pe.classList.add(px > old ? 'fl-up' : 'fl-dn'); } pe.dataset.v = px || '';
    var wch = s0.length && px ? (px / s0[0].c - 1) * 100 : null, ce = $('[data-lc-ch]'); var XU = window.BTD_CTX; if (XU && !lcReg) { lcReg = 1; XU.onRange(function (k) { if (k === 'LC' || k == null) paint(); }); } var amtM = XU && XU.unit('LC') === 'amt' && S.cmp.length === 0 && s0.length && px, dv = amtM ? px - s0[0].c : 0; ce.textContent = (amtM ? (dv >= 0 ? '+' : '\u2212') + '$' + Math.abs(dv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : sg(wch)) + ' ' + (DATA.wk ? '1W' : S.r); if (xhS && S.r === '1D' && !amtM && q.chp != null) { wch = q.chp; ce.textContent = sg(q.chp) + ' ' + (XU ? XU.tf(S.s, q, F.session()) : 'day'); } ce.className = 'lc-ch ' + (wch >= 0 ? 'up' : 'dn'); WCH = !pct && !(xhS && S.r === '1D') ? wch : null; var vse = $('[data-lc-vs]'); if (vse) { var ow = O.two && O.other && O.other() === 'BTC' && O.otherR && O.otherR() === S.r && O.otherW ? O.otherW() : null; if (ow != null && WCH != null && isFinite(WCH)) { var dvs = WCH - ow; vse.textContent = 'vs BTC ' + (dvs >= 0 ? '+' : '\u2212') + Math.abs(dvs).toFixed(1) + ' pts'; vse.className = 'lc-vs ' + (dvs >= 0 ? 'up' : 'dn'); vse.title = S.s + ' ' + sg(WCH) + ' vs BTC ' + sg(ow) + ' over ' + S.r + ' (percentage-point difference)'; vse.hidden = false; } else vse.hidden = true; } ce.setAttribute('data-spk', 'LC'); ce.setAttribute('role', 'button'); ce.title = 'Tap: timeframe \u00b7 Hold: % / $';
    var sess = isC(S.s) ? 'Live 24/7 · Coinbase' : (function () { var s = F ? F.session() : 'closed'; if (!q) return 'Last close'; if (s === 'open') return q.rt ? 'Live' : 'Live (may be delayed)'; if (q.ext) return 'Regular-session close'; return 'Market closed · last ' + fp(q.px, q.cur); })();
    $('[data-lc-sess]').textContent = sess; $('[data-lc-sess]').className = 'lc-sess' + (/Live|Pre|After/.test(sess) ? ' on' : '');
    if (s0.length) { var hi = -Infinity, lo = Infinity; s0.forEach(function (p) { hi = Math.max(hi, p.h || p.c); lo = Math.min(lo, p.l || p.c); }); $('[data-lc-hl]').textContent = (DATA.wk ? '1W' : s0.sess && s0.sess !== 'Today' ? s0.sess : S.r) + ' range ' + fp(lo, q && q.cur) + ' – ' + fp(hi, q && q.cur); }
    if (pct) sets.forEach(function (st, i) { var e = box.querySelector('[data-lc-lgv="' + i + '"]'); if (e && st.v && st.v.length) { var v = st.v[st.v.length - 1]; e.textContent = sg(v, 1); e.className = v >= 0 ? 'up' : 'dn'; } });
    var notes = list.map(function (t, i) { return DATA[i] && DATA[i].note && t !== 'BTC' ? t + ': ' + DATA[i].note : null; }).filter(Boolean);
    $('[data-lc-ft]').innerHTML = (S.s === 'BTC' || S.cmp.indexOf('BTC') >= 0 ? 'BTC: Coinbase live feed (same feed as the price board). ' : '') + esc(notes.join(' · ')) + ' · Times ET. Education only.'; var lnm = $('[data-lc-name]'); if (lnm) lnm.title = $('[data-lc-ft]').textContent; kn();
  }
  function soon() { if (!raf) raf = requestAnimationFrame(paint); }
  /* BTC: every tick updates the last candle (1H = 1-minute candles) */
  if (F) F.on('BTC', function (v) { var s = DATA[0]; if (S.s !== 'BTC' || !s || !s.length || !s.g) { if (S.cmp.indexOf('BTC') >= 0) soon(); else if (S.s === 'BTC') soon(); return; }
    var k = s[s.length - 1], now = Date.now(); if (now - k.t >= s.g) { s.push({ t: k.t + s.g * Math.floor((now - k.t) / s.g), o: v.px, h: v.px, l: v.px, c: v.px }); var span = GR[S.r] ? GR[S.r][1] * DAY : 0; while (span && s.length > 2 && s[0].t < now - span) s.shift(); } else { k.c = v.px; k.h = Math.max(k.h, v.px); k.l = Math.min(k.l, v.px); } soon(); });
  /* open a symbol in the hero chart (used by the price strip: tap an item) */
  var API = { cur: function () { return S.s; }, r: function () { return S.r; }, w: function () { return WCH; }, setR: function (r) { if (r && r !== S.r) { S.r = r; ui(); load(); } }, hoverT: function (t) { if (t == null || !LAST) hov = null; else hov = 2 + (t - LAST.t0) / (LAST.t1 - LAST.t0) * (cv.clientWidth - 66); if (hov != null && (hov < 2 || hov > cv.clientWidth - 64)) hov = null; soon(); }, repaint: function () { paint(); }, open: function (t, noScroll) { if (!t) return; if (O.other && O.other() === t) { if (O.onDup) O.onDup(t); else return; } S.s = t; remember(t); S.cmp = S.cmp.filter(function (x) { return x !== t; }); if (t !== 'BTC' && S.m === 'candle') S.m = 'area'; save(); ui(); load(); var sec = box.closest('section') || box; if (!noScroll && sec.scrollIntoView) sec.scrollIntoView({ behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } };
  if (F) F.on('quotes', function () { if (S.s === 'BTC' && !S.cmp.length) return; var list = [S.s].concat(S.cmp); list.forEach(function (t, i) { if (t === 'BTC' || /\//.test(t)) return; var q = liveQ(t), s = DATA[i]; if (!q || !s || !s.length) return; var lp = curPx(q);
      if (s.sess && s.sess !== 'Today') { s[s.length - 1].c = lp; return; } /* closed-session view: never stretch it to "now" */
      if (S.r === '1H' || S.r === '1D') { if (Date.now() - s[s.length - 1].t > 14e3) s.push({ t: Date.now(), c: lp }); else s[s.length - 1].c = lp; } else s[s.length - 1].c = lp; }); soon(); });
  function hv(e) { var r = cv.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; hov = p.clientX - r.left; soon(); if (O.hsync && SYNC() && LAST && LAST.t1 > LAST.t0) { var pw0 = cv.clientWidth - 66; O.hsync(LAST.t0 + (hov - 2) / pw0 * (LAST.t1 - LAST.t0)); } }
  cv.addEventListener('mousemove', hv); cv.addEventListener('touchstart', hv, { passive: true }); cv.addEventListener('touchmove', hv, { passive: true });
  cv.addEventListener('mouseleave', function () { hov = null; soon(); if (O.hsync) O.hsync(null); }); cv.addEventListener('touchend', function () { setTimeout(function () { hov = null; soon(); }, 1200); });
  addEventListener('resize', soon);
  setInterval(function () { if (!document.hidden && S.s === 'BTC' && (S.r === '1W' || S.r === '1M' || S.r === '3M' || S.r === '1Y')) { cache['BTC' + S.r] = null; load(); } }, 300e3);
  ui(); load(); lbP.then(function () { ui(); });
  return API;
  }
})();
