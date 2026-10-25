/* BTC Treasury Desk: trading-desk charts (Oct 25, 2026). Two synced charts on desktop (BTC | company), one on phone.
   Data: crypto = Coinbase Exchange candles (24/7). Stocks/indexes = CNBC chart service (official exchange prints incl. pre/post,
   5-min bars for the last ~5 sessions, daily/weekly/monthly history) + the CNBC quote feed (BTD_FEED) for the live last price.
   1D for stocks = the most recent trading session 4:00 AM-8:00 PM ET (pre + regular + after hours), shaded outside 9:30-4:00.
   Tools: ranges, intervals (5m/15m/30m/1h/1D), candles/line, MA 20/50/200, VWAP (stocks), volume, log scale, compare %, horizontal lines/alerts, fullscreen.
   Saved in localStorage 'btd_tc' (migrates the old 'btd_lc2' picker). Education only. */
(function () {
  'use strict';
  var root = document.querySelector('[data-tc]'); if (!root || !window.LightweightCharts) return;
  var LW = window.LightweightCharts, F = window.BTD_FEED, DAY = 864e5;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fp(v, cur) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v), d = a >= 10000 ? 0 : a >= 1 ? 2 : 4; var s = v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); return cur === 'none' ? s : '$' + s; }
  function sg(v, d) { return v == null || !isFinite(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + '%'; }
  function sgn(v, cur) { if (v == null || !isFinite(v)) return ''; var a = Math.abs(v); return (v >= 0 ? '+' : '−') + (cur === 'none' ? '' : '$') + a.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: a < 0.1 ? 4 : 2 }); }
  var PHONE = function () { return innerWidth < 1024; };
  var CB = { BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', XRP: 'XRP-USD', DOGE: 'DOGE-USD', LINK: 'LINK-USD', ADA: 'ADA-USD', AVAX: 'AVAX-USD', LTC: 'LTC-USD', SUI: 'SUI-USD' };
  var IDX = { SPX: ['.SPX', 'S&P 500', 'none'], IXIC: ['.IXIC', 'Nasdaq Composite', 'none'], DJI: ['.DJI', 'Dow Jones', 'none'], GOLD: ['@GC.1', 'Gold futures', ''], DXY: ['.DXY', 'US dollar index', 'none'] };
  var NAMES = { BTC: 'Bitcoin', ETH: 'Ether', SOL: 'Solana', MSTR: 'Strategy', MPJPY: 'Metaplanet (ADR)', XXI: 'Twenty One Capital', ASST: 'Strive', MARA: 'MARA Holdings', BLSH: 'Bullish', COIN: 'Coinbase', CLSK: 'CleanSpark', DJT: 'Trump Media', TSLA: 'Tesla', RIOT: 'Riot Platforms', HUT: 'Hut 8', XYZ: 'Block', ABTC: 'American Bitcoin', GLXY: 'Galaxy Digital', GEMI: 'Gemini', NAKA: 'Nakamoto', SPCX: 'SpaceX' };
  var PICK = ['MSTR', 'MPJPY', 'XXI', 'ASST', 'MARA', 'BLSH', 'COIN', 'CLSK', 'DJT', 'TSLA', 'RIOT', 'HUT', 'XYZ', 'ABTC', 'GLXY', 'GEMI', 'NAKA', 'BTC', 'ETH', 'SOL', 'SPX', 'IXIC', 'DJI', 'GOLD', 'DXY'];
  function isC(t) { return !!CB[t]; }
  function cn(t) { return IDX[t] ? IDX[t][0] : t; }
  function cur(t) { return IDX[t] ? IDX[t][2] : ''; }
  function nm(t) { return IDX[t] ? IDX[t][1] : NAMES[t] || t; }
  var RANGES = ['1D', '5D', '1M', '3M', '1Y', '5Y', 'Max'], IVS = ['5m', '15m', '30m', '1h', '1D'], IVS_S = { '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '1D': 86400 };
  var RDAYS = { '1D': 1, '5D': 5, '1M': 31, '3M': 92, '1Y': 366, '5Y': 1830, Max: 99999 };
  /* which intervals make sense per range (bars stay readable and the data exists) */
  function ivOK(t, r, iv) { var crypto = isC(t);
    if (r === '1D') return iv !== '1D'; if (r === '5D') return iv !== '1D' && (crypto ? iv !== '5m' || true : true);
    if (r === '1M') return crypto ? iv === '30m' || iv === '1h' || iv === '1D' : iv === '1D';
    if (r === '3M') return crypto ? iv === '1h' || iv === '1D' : iv === '1D'; return iv === '1D'; }
  function defIv(t, r) { var d = r === '1D' ? '15m' : r === '5D' ? '1h' : r === '1M' ? '1h' : '1D'; return ivOK(t, r, d) ? d : '1D'; }

  /* ---------- settings (persisted) ---------- */
  var S = { r: '1D', iv: '15m', type: 'candle', ma20: 0, ma50: 0, ma200: 0, vwap: 1, vol: 1, log: 0, cmp: 0, sync: 1, r2: '1D', iv2: '15m', s2: 'MSTR', s1p: 'BTC', lines: {}, p2: null };
  try { var o = JSON.parse(LS.get('btd_tc') || 'null'); if (o && o.v === 1) Object.keys(S).forEach(function (k) { if (o[k] != null) S[k] = o[k]; });
    else { var o2 = JSON.parse(LS.get('btd_lc2') || '{}'); if (o2 && typeof o2.s === 'string' && PICK.indexOf(o2.s) >= 0 && o2.s !== 'BTC') S.s2 = o2.s; } } catch (e) {}
  if (RANGES.indexOf(S.r) < 0) S.r = '1D'; if (RANGES.indexOf(S.r2) < 0) S.r2 = S.r; if (IVS.indexOf(S.iv2) < 0) S.iv2 = S.iv;
  /* per-chart view settings (candles/line, MAs, VWAP, volume, log, compare): never shared; right chart keeps its own in S.p2 */
  var VK = ['type', 'ma20', 'ma50', 'ma200', 'vwap', 'vol', 'log', 'cmp'];
  if (!S.p2 || typeof S.p2 !== 'object') { S.p2 = {}; VK.forEach(function (k) { S.p2[k] = S[k]; }); } else VK.forEach(function (k) { if (S.p2[k] == null) S.p2[k] = S[k]; });
  function V(P) { return P && P.idx === 1 ? S.p2 : S; }
  /* per-pane range/interval: shared while Sync is on, independent for the right chart when off */
  function own(P) { return !S.sync && P.idx === 1; }
  function RG(P) { return own(P) ? S.r2 : S.r; }
  function IV(P) { return own(P) ? S.iv2 : S.iv; } if (IVS.indexOf(S.iv) < 0) S.iv = defIv('BTC', S.r);
  function save() { var o = { v: 1 }; Object.keys(S).forEach(function (k) { o[k] = S[k]; }); LS.set('btd_tc', JSON.stringify(o)); }

  /* ---------- data ---------- */
  var cache = {};
  function agg(bars, sec) { if (!bars.length) return bars; var out = [], cur0 = null;
    bars.forEach(function (b) { var k = Math.floor(b.time / sec) * sec; if (!cur0 || cur0.time !== k) { cur0 = { time: k, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume || 0 }; out.push(cur0); } else { cur0.high = Math.max(cur0.high, b.high); cur0.low = Math.min(cur0.low, b.low); cur0.close = b.close; cur0.volume += b.volume || 0; } }); return out; }
  function cbBars(t, r, iv) { var g = { '5m': 300, '15m': 900, '30m': 900, '1h': 3600, '1D': 86400 }[iv], now = Date.now(), span = Math.min(RDAYS[r], 1900) * DAY;
    if (r === 'Max' || r === '5Y') { if (t === 'BTC') return J('/assets/data/btc_daily.json').then(function (j) { var t0 = Date.parse(j.start + 'T00:00:00Z') / 1e3, from = r === '5Y' ? now / 1e3 - 1830 * 86400 : 0; return j.closes.map(function (c, i) { return { time: t0 + i * 86400, open: i ? j.closes[i - 1] : c, high: Math.max(c, i ? j.closes[i - 1] : c), low: Math.min(c, i ? j.closes[i - 1] : c), close: c }; }).filter(function (b) { return b.time >= from; }); }); span = 1830 * DAY; }
    var from = now - span, parts = [], step = g * 300e3; for (var a = from; a < now; a += step) parts.push([a, Math.min(now, a + step)]);
    if (parts.length > 12) parts = parts.slice(-12);
    return Promise.all(parts.map(function (p) { return J('https://api.exchange.coinbase.com/products/' + CB[t] + '/candles?granularity=' + g + '&start=' + new Date(p[0]).toISOString() + '&end=' + new Date(p[1]).toISOString()).catch(function () { return []; }); }))
      .then(function (arrs) { var m = {}; arrs.forEach(function (x) { (Array.isArray(x) ? x : []).forEach(function (q) { m[q[0]] = { time: q[0], low: +q[1], high: +q[2], open: +q[3], close: +q[4], volume: +q[5] }; }); });
        var s = Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return x.time - y.time; }); if (iv === '30m') s = agg(s, 1800); return s; }); }
  function cnbc(t, per) { return J('https://ts-api.cnbc.com/harmony/app/charts/' + per + '.json?symbol=' + encodeURIComponent(cn(t))).then(function (j) { return ((j.barData || {}).priceBars || []).map(function (b) { return { time: Math.round(b.tradeTimeinMills / 1e3), open: +b.open, high: +b.high, low: +b.low, close: +b.close, volume: +b.volume || 0 }; }).filter(function (b) { return isFinite(b.close) && b.close > 0; }); }); }
  function etDay(sec) { return new Date(sec * 1e3).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
  function etMin(sec) { var p = new Date(sec * 1e3).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' }).split(':'); return (+p[0] % 24) * 60 + +p[1]; }
  function stockBars(t, r, iv) {
    if (r === '1D' || r === '5D') return cnbc(t, '5D').then(function (b) {
      if (b.length < 5) return cnbc(t, '1D'); return b; }).then(function (b) {
      if (r === '1D' && b.length) { var last = etDay(b[b.length - 1].time); b = b.filter(function (x) { return etDay(x.time) === last; }); }
      var s = IVS_S[iv] || 300; return s > 300 ? agg(b, s) : b; });
    var per = r === 'Max' ? 'ALL' : r === '5Y' ? '5Y' : r === '1Y' || r === '1M' || r === '3M' ? '1Y' : '6M';
    return cnbc(t, per).then(function (b) { var from = Date.now() / 1e3 - RDAYS[r] * 86400; return r === 'Max' ? b : b.filter(function (x) { return x.time >= from; }); }); }
  function bars(t, r, iv) { var k = t + '|' + r + '|' + iv, c = cache[k]; if (c && Date.now() - c.at < (r === '1D' || r === '5D' ? 60e3 : 600e3)) return Promise.resolve(c.b);
    return (isC(t) ? cbBars(t, r, iv) : stockBars(t, r, iv)).then(function (b) { cache[k] = { at: Date.now(), b: b }; return b; }); }

  /* ---------- indicators ---------- */
  function sma(b, n) { var out = [], s = 0; for (var i = 0; i < b.length; i++) { s += b[i].close; if (i >= n) s -= b[i - n].close; if (i >= n - 1) out.push({ time: b[i].time, value: s / n }); } return out; }
  function vwap(b) { var out = [], pv = 0, v = 0, day = null; b.forEach(function (x) { var d = etDay(x.time); if (d !== day) { day = d; pv = 0; v = 0; } var tp = (x.high + x.low + x.close) / 3; pv += tp * (x.volume || 0); v += x.volume || 0; if (v) out.push({ time: x.time, value: pv / v }); }); return out; }

  /* ---------- quote (official last; extended hours first when the regular session is closed) ---------- */
  function quote(t) { if (!F) return null; if (isC(t)) return F.get(t); var q = F.get(cn(t)); return q && q.px != null ? q : null; }
  if (F) F.watch(PICK.filter(function (t) { return !isC(t); }).map(cn));

  /* ---------- one chart pane ---------- */
  var panes = [];
  var TT = { localization: { timeFormatter: function (t) { return new Date(t * 1e3).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'; } } };
  function mkPane(el, idx) {
    var P = { el: el, idx: idx, sym: idx === 0 ? 'BTC' : S.s2, b: [], lines: [] };
    el.innerHTML = '<div class="tc-read" data-r></div><div class="tc-bar" data-bar></div><div class="tc-cv" data-cv><div class="tc-hud mono" data-hud></div><div class="tc-msg" data-msg hidden></div></div><div class="tc-kn mono" data-kn></div>';
    var cv = el.querySelector('[data-cv]');
    var ch = LW.createChart(cv, Object.assign({ autoSize: true, layout: { background: { color: 'transparent' }, textColor: '#8b95a3', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 11, attributionLogo: false },
      grid: { vertLines: { color: 'rgba(255,255,255,.04)' }, horzLines: { color: 'rgba(255,255,255,.05)' } }, rightPriceScale: { borderColor: '#222831' }, timeScale: { borderColor: '#222831', timeVisible: true, secondsVisible: false, rightOffset: 3,
        tickMarkFormatter: function (t, tt) { var d = new Date(t * 1e3), o = { timeZone: 'America/New_York' }; if (tt >= 3) { o.hour = 'numeric'; o.minute = '2-digit'; } else if (tt === 2) { o.month = 'short'; o.day = 'numeric'; } else if (tt === 1) o.month = 'short'; else o.year = 'numeric'; return d.toLocaleString('en-US', o); } },
      crosshair: { mode: 0 } }, TT)); ch.timeScale().applyOptions({ minBarSpacing: 0.05 });
    P.ch = ch;
    P.main = null; P.vol = ch.addSeries(LW.HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'volume' }, color: 'rgba(140,150,165,.35)', lastValueVisible: false, priceLineVisible: false });
    ch.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    P.ma = [20, 50, 200].map(function (n, i) { return ch.addSeries(LW.LineSeries, { color: ['#4fa3ff', '#f2c94c', '#c084fc'][i], lineWidth: 1, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false }); });
    P.vw = ch.addSeries(LW.LineSeries, { color: '#22d3ee', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false });
    P.cmpS = ch.addSeries(LW.LineSeries, { color: '#9aa4b2', lineWidth: 1.5, lastValueVisible: true, priceLineVisible: false });
    ch.subscribeCrosshairMove(function (p) { hud(P, p); if (S.sync && !P.syncing) panes.forEach(function (Q) { if (Q === P || !Q.main || !Q.b.length) return; Q.syncing = 1; try { if (p && p.time) { var bt = near(Q.b, p.time), tol = IVS_S[Q.iv] || 300; if (bt && Math.abs(bt.time - p.time) < tol) { Q.ch.setCrosshairPosition(bt.close, bt.time, Q.main); hud(Q, { time: bt.time }); } else { Q.ch.clearCrosshairPosition(); hud(Q, null, 1); } } else { Q.ch.clearCrosshairPosition(); hud(Q, null); } } catch (e) {} Q.syncing = 0; }); });
    ch.timeScale().subscribeVisibleLogicalRangeChange(function () {});
    ch.subscribeClick(function (p) { if (!P.drawing || !p || !p.point || !P.main) return; var px = P.main.coordinateToPrice(p.point.y); if (px == null) return; addLine(P, +px.toPrecision(6), 1); P.drawing = 0; bar(P); });
    panes.push(P); return P; }
  function near(b, t) { var lo = 0, hi = b.length - 1; if (!b.length) return null; while (lo < hi) { var m = (lo + hi) >> 1; if (b[m].time < t) lo = m + 1; else hi = m; } var c = b[lo], d = b[lo - 1]; return d && Math.abs(d.time - t) < Math.abs(c.time - t) ? d : c; }
  function hud(P, p, nob) { var h = P.el.querySelector('[data-hud]'); if (nob) { h.innerHTML = '<span>No ' + esc(P.sym) + ' bar at this time (market closed)</span>'; return; } var b = p && p.time ? near(P.b, p.time) : P.b[P.b.length - 1], r0 = RG(P); if (!b) { h.textContent = ''; return; }
    var i = P.b.indexOf(b), pv = i > 0 ? P.b[i - 1].close : b.open, c = cur(P.sym), chg = pv ? (b.close / pv - 1) * 100 : null;
    h.innerHTML = '<span>' + new Date(b.time * 1e3).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: P.iv === '1D' || !/^(1D|5D|1M|3M)$/.test(r0) ? undefined : 'numeric', minute: P.iv === '1D' || !/^(1D|5D|1M|3M)$/.test(r0) ? undefined : '2-digit' }) + '</span> O <b>' + fp(b.open, c) + '</b> H <b>' + fp(b.high, c) + '</b> L <b>' + fp(b.low, c) + '</b> C <b>' + fp(b.close, c) + '</b> <i class="' + (chg >= 0 ? 'up' : 'dn') + '">' + sg(chg) + '</i>' + (b.volume ? ' Vol <b>' + Math.round(b.volume).toLocaleString('en-US') + '</b>' : ''); }

  /* lines / alert levels (per symbol, saved) */
  function addLine(P, px, persist) { if (!P.main) return; var l = P.main.createPriceLine({ price: px, color: '#F7931A', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'alert' }); P.lines.push({ px: px, l: l }); if (persist) { (S.lines[P.sym] = S.lines[P.sym] || []).push(px); if (S.lines[P.sym].length > 8) S.lines[P.sym].shift(); save(); if (window.BTD_ALERTS) window.BTD_ALERTS.add({ sym: P.sym, px: px }); } }
  function clearLines(P) { P.lines.forEach(function (x) { try { P.main.removePriceLine(x.l); } catch (e) {} }); P.lines = []; }

  /* toolbar */
  function seg(name, opts, on, dis) { return '<span class="tc-seg" role="group" aria-label="' + name + '">' + opts.map(function (o) { var d = dis && dis(o); return '<button type="button" data-' + name + '="' + o + '"' + (o === on ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + (d ? ' disabled' : '') + '>' + o + '</button>'; }).join('') + '</span>' + segSel(name, opts.map(function (o) { return [o, o, dis && dis(o)]; }), on); }
  function segSel(name, opts, on) { return '<select class="tc-segsel" data-segsel="' + name + '" aria-label="' + (name === 'rng' ? 'Range' : name === 'iv' ? 'Interval' : name) + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === on ? ' selected' : '') + (o[2] ? ' disabled' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
  document.addEventListener('change', function (e) { var t = e.target; if (!t.matches || !t.matches('select.tc-segsel')) return; var b = t.parentNode.querySelector('button[data-' + t.dataset.segsel + '="' + t.value + '"]'); if (b) b.click(); });
  function tg(k, lab, on, title) { return '<button type="button" class="tc-tg' + (on ? ' on' : '') + '" data-tg="' + k + '" aria-pressed="' + !!on + '"' + (title ? ' title="' + title + '"' : '') + '>' + lab + '</button>'; }
  function bar(P) { var el = P.el.querySelector('[data-bar]'), ph = PHONE(), st = !isC(P.sym);
    var r = RG(P), h = seg('rng', RANGES, r) + seg('iv', IVS, P.iv || IV(P), function (iv) { return !ivOK(P.sym, r, iv); }) +
      '<span class="tc-tools' + (ph && !P.more ? ' tc-hide' : '') + '">' + tg('type', V(P).type === 'candle' ? 'Candles' : 'Line', 1, 'Candles or line') + tg('ma20', 'MA20', V(P).ma20) + tg('ma50', 'MA50', V(P).ma50) + tg('ma200', 'MA200', V(P).ma200) + (st ? tg('vwap', 'VWAP', V(P).vwap) : '') + tg('vol', 'Vol', V(P).vol) + tg('log', 'Log', V(P).log, 'Logarithmic price scale') + tg('cmp', 'Compare %', V(P).cmp, 'Overlay the other chart in % from the first bar') +
      tg('draw', P.drawing ? 'Click chart…' : '+ Line', P.drawing, 'Click the chart to place a horizontal line / alert level') + (P.lines.length ? tg('clr', 'Clear lines', 0) : '') + (idxTwo() ? tg('sync', 'Sync', S.sync, 'Link range and crosshair across both charts') : '') + tg('fs', '⛶', 0, 'Fullscreen') + '</span>' +
      (ph ? '<button type="button" class="tc-tg tc-more" data-tg="more" aria-expanded="' + !!P.more + '">' + (P.more ? 'Less' : 'Tools') + '</button>' : '');
    el.innerHTML = h; }
  function idxTwo() { return panes.length > 1 && !PHONE(); }

  /* readout: price + session; stocks outside the regular session lead with the extended-hours price */
  function read(P) { var el = P.el.querySelector('[data-r]'), t = P.sym, q = quote(t), c = cur(t), ses = F ? F.session() : 'open', h = '';
    var pick = '<select class="tc-pick" data-pick aria-label="Chart symbol">' + PICK.filter(function (x) { return idxTwo() ? (P.idx === 0 ? isC(x) : x !== panes[0].sym) : true; }).map(function (x) { return '<option value="' + x + '"' + (x === t ? ' selected' : '') + '>' + x + ' · ' + esc(nm(x)) + '</option>'; }).join('') + '</select>';
    if (!q || q.px == null) { el.innerHTML = pick + '<span class="tc-px">—</span>'; return; }
    if (isC(t)) h = '<b class="tc-px">' + fp(q.px) + '</b><span class="tc-ch ' + (q.chp >= 0 ? 'up' : 'dn') + '">' + sgn(q.ch) + ' (' + sg(q.chp) + ') 24h</span><span class="tc-ses on">Live 24/7 · Coinbase</span>';
    else if (ses !== 'open' && q.ext && q.ext.px != null) { var d = q.ext.px - q.px, p = d / q.px * 100, lab = q.ext.kind === 'pre' ? 'Pre-market' : 'After hours';
      h = '<b class="tc-px">' + fp(q.ext.px, c) + '</b><span class="tc-ch ' + (d >= 0 ? 'up' : 'dn') + '">' + sgn(d, c) + ' (' + sg(p) + ')</span><span class="tc-ses ext">' + (ses === 'closed' ? 'Last ' + lab.toLowerCase() : lab) + '</span>' +
        '<span class="tc-close">Close ' + fp(q.px, c) + ' <i class="' + (q.chp >= 0 ? 'up' : 'dn') + '">' + sg(q.chp) + '</i></span>'; }
    else h = '<b class="tc-px">' + fp(q.px, c) + '</b><span class="tc-ch ' + (q.chp >= 0 ? 'up' : 'dn') + '">' + sgn(q.ch, c) + ' (' + sg(q.chp) + ')</span><span class="tc-ses' + (ses === 'open' ? ' on' : '') + '">' + (ses === 'open' ? 'Market open' : 'Close') + (q.rt === false ? ' · delayed' : '') + '</span>';
    el.innerHTML = pick + h; }
  /* key numbers under the chart */
  var DESK = null; J('/assets/data/desk.json').then(function (j) { DESK = j; panes.forEach(kn); }).catch(function () {});
  var B7 = null; J('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400').then(function (a) { if (Array.isArray(a) && a[7]) B7 = +a[7][4]; panes.forEach(kn); }).catch(function () {});
  function kn(P) { var el = P.el.querySelector('[data-kn]'), t = P.sym, q = quote(t), c = cur(t), it = [];
    if (!q) { el.innerHTML = ''; return; }
    if (isC(t)) { it.push(['24h range', fp(q.lo) + '–' + fp(q.hi)]); if (t === 'BTC' && B7) it.push(['7D', sg((q.px / B7 - 1) * 100)]); if (t === 'BTC' && window.BTD_FUND && window.BTD_FUND.rate != null) it.push(['Funding', sg(window.BTD_FUND.rate, 4) + '/8h']); }
    else { it.push(['Day range', fp(q.lo, c) + '–' + fp(q.hi, c)]); it.push(['Prev close', fp(q.prev, c)]); if (q.vol) it.push(['Vol', q.vol]); if (q.yh) it.push(['52W', fp(q.yl, c) + '–' + fp(q.yh, c)]);
    }
    el.innerHTML = it.map(function (x) { return '<span><em>' + x[0] + '</em> <b>' + x[1] + '</b></span>'; }).join(''); }

  /* render */
  function render(P) { var t = P.sym, r = RG(P), iv = ivOK(t, r, IV(P)) ? IV(P) : defIv(t, r), msg = P.el.querySelector('[data-msg]'); P.iv = iv; bar(P); read(P); kn(P);
    var tok = P.tok = {}; msg.hidden = true;
    bars(t, r, iv).then(function (b) { if (P.tok !== tok) return; P.b = b;
      if (!b.length) { msg.hidden = false; msg.textContent = 'No chart data for ' + t + ' right now. The price above is the live quote.'; }
      if (P.main) { clearLines(P); P.ch.removeSeries(P.main); }
      P.main = V(P).type === 'candle' ? P.ch.addSeries(LW.CandlestickSeries, { upColor: '#2fd17c', downColor: '#ff5a5f', borderVisible: false, wickUpColor: '#2fd17c', wickDownColor: '#ff5a5f' })
        : P.ch.addSeries(LW.AreaSeries, { lineColor: '#F7931A', topColor: 'rgba(247,147,26,.28)', bottomColor: 'rgba(247,147,26,0)', lineWidth: 2 });
      P.main.setData(V(P).type === 'candle' ? b : b.map(function (x) { return { time: x.time, value: x.close }; }));
      P.vol.setData(V(P).vol ? b.map(function (x) { return { time: x.time, value: x.volume || 0, color: x.close >= x.open ? 'rgba(47,209,124,.35)' : 'rgba(255,90,95,.35)' }; }) : []);
      [20, 50, 200].forEach(function (n, i) { P.ma[i].setData(V(P)['ma' + n] ? sma(b, n) : []); });
      P.vw.setData(V(P).vwap && !isC(t) && r !== 'Max' && /^(1D|5D)$/.test(r) ? vwap(b) : []);
      P.ch.priceScale('right').applyOptions({ mode: V(P).cmp ? 2 : V(P).log ? 1 : 0 });
      /* stocks intraday: shade pre/post */
      if (!isC(t) && /^(1D|5D)$/.test(r) && V(P).type === 'candle') P.main.setData(b.map(function (x) { var m = etMin(x.time), ext = m < 570 || m >= 960; return ext ? Object.assign({}, x, { color: x.close >= x.open ? 'rgba(47,209,124,.45)' : 'rgba(255,90,95,.45)', wickColor: 'rgba(160,170,180,.5)' }) : x; }));
      (S.lines[t] || []).forEach(function (px) { addLine(P, px, 0); });
      P.cmpS.setData([]); if (V(P).cmp) { var other = panes.filter(function (Q) { return Q !== P; })[0], os = other ? other.sym : (t === 'BTC' ? 'MSTR' : 'BTC'); P.cmpS.applyOptions({ title: os });
        bars(os, r, ivOK(os, r, iv) ? iv : defIv(os, r)).then(function (ob) { if (P.tok !== tok || !ob.length || !b.length) return; var t0 = b[0].time, base = near(ob, t0); if (!base) return; var k = b[0].close / base.close; P.cmpS.setData(ob.filter(function (x) { return x.time >= t0 - 1; }).map(function (x) { return { time: x.time, value: x.close * k }; })); }).catch(function () {}); }
      P.ch.timeScale().fitContent(); hud(P, null); bar(P);
    }).catch(function () { if (P.tok !== tok) return; msg.hidden = false; msg.textContent = 'Chart service did not answer. Retrying in a minute; the price above is live.'; setTimeout(function () { render(P); }, 60e3); }); }
  /* live last bar */
  if (F) F.on('*', function (v, k) { panes.forEach(function (P) { if (!P.main || !P.b.length) return; var q = quote(P.sym); if (!q || q !== v) return; read(P); kn(P);
    var px = isC(P.sym) ? q.px : (F.session() === 'open' ? q.px : q.ext && F.session() !== 'closed' ? q.ext.px : null); if (px == null || !/^(1D|5D)$/.test(RG(P))) return;
    var last = P.b[P.b.length - 1], sec = IVS_S[P.iv] || 300, now = Math.floor(Date.now() / 1e3), bt = Math.floor(now / sec) * sec; if (bt < last.time) return;
    if (bt === last.time) { last.close = px; last.high = Math.max(last.high, px); last.low = Math.min(last.low, px); } else { last = { time: bt, open: last.close, high: Math.max(px, last.close), low: Math.min(px, last.close), close: px, volume: 0 }; P.b.push(last); }
    try { P.main.update(V(P).type === 'candle' ? last : { time: last.time, value: last.close }); } catch (e) {} }); });
  setInterval(function () { panes.forEach(function (P) { if (/^(1D|5D)$/.test(RG(P)) && !document.hidden) { delete cache[P.sym + '|' + RG(P) + '|' + P.iv]; render(P); } }); }, 5 * 60e3);

  /* events */
  root.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var P = panes.filter(function (Q) { return Q.el.contains(b); })[0]; if (!P) return; var all = S.sync ? panes : [P];
    if (b.dataset.rng) { var nr = b.dataset.rng, ni = defIv(isC(P.sym) ? P.sym : 'BTC', nr); if (own(P)) { S.r2 = nr; S.iv2 = ni; } else { S.r = nr; S.iv = ni; } save(); all.forEach(render); }
    else if (b.dataset.iv) { if (own(P)) S.iv2 = b.dataset.iv; else S.iv = b.dataset.iv; save(); all.forEach(render); }
    else if (b.dataset.tg) { var k = b.dataset.tg;
      var v = V(P); if (k === 'type') v.type = v.type === 'candle' ? 'line' : 'candle'; else if (k === 'draw') { P.drawing = !P.drawing; bar(P); return; } else if (k === 'clr') { clearLines(P); delete S.lines[P.sym]; save(); bar(P); return; }
      else if (k === 'fs') { var el = P.el; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen(); else el.classList.toggle('tc-fs'); return; }
      else if (k === 'more') { P.more = !P.more; bar(P); return; } else if (k === 'sync') { S.sync = S.sync ? 0 : 1; if (!S.sync) { S.r2 = S.r; S.iv2 = S.iv; } save(); panes.forEach(render); return; } else if (VK.indexOf(k) >= 0) v[k] = v[k] ? 0 : 1; else return;
      if (k === 'log' && v.log) v.cmp = 0; if (k === 'cmp' && v.cmp) v.log = 0; save(); render(P); } });
  root.addEventListener('change', function (e) { var s = e.target.closest('[data-pick]'); if (!s) return; var P = panes.filter(function (Q) { return Q.el.contains(s); })[0]; P.sym = s.value; if (P.idx === 1) S.s2 = s.value; else if (PHONE()) S.s1p = s.value; save(); render(P); if (panes.length > 1) panes.forEach(read); });

  /* build */
  var two = !PHONE();
  root.innerHTML = '<div class="tc-pane" data-p0></div>' + (two ? '<div class="tc-pane" data-p1></div>' : '');
  var P0 = mkPane(root.querySelector('[data-p0]'), 0); if (!two) P0.sym = S.s1p || 'BTC';
  if (two) mkPane(root.querySelector('[data-p1]'), 1);
  panes.forEach(render);
  window.BTD_TC = { panes: panes, S: S, render: function () { panes.forEach(render); } };
})();
