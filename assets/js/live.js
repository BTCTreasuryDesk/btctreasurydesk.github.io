/* BTC Treasury Desk: home LIVE price chart (medium card). BTC (Coinbase Exchange candles + ticker, polled every 5s) or MSTR (CNBC real-time quote
   during US market hours, last close otherwise; history = daily closes from members/data/stocks_daily.json). Line (default) / Area / Candles (BTC).
   Ranges 1D/1W/1M/1Y. Thin day-open reference line, "since you opened the page" readout, soft tick flash. Choices saved in btd_live.
   The long-term chart with models/TA lives in the Charts section below. Education only. */
(function () {
  'use strict';
  var box = document.querySelector('[data-lvcard]'); if (!box) return;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = { v: 'live', s: 'btc', r: '1D', m: 'line', lr: '1Y' }; try { var o = JSON.parse(LS.get('btd_live') || '{}'); ['v', 's', 'r', 'm', 'lr'].forEach(function (k) { if (o[k]) S[k] = o[k]; }); } catch (e) {}
  if (['btc', 'mstr'].indexOf(S.s) < 0) S.s = 'btc'; if (['1D', '1W', '1M', '1Y'].indexOf(S.r) < 0) S.r = '1D'; if (['line', 'area', 'candle'].indexOf(S.m) < 0) S.m = 'line'; if (S.v !== 'lt') S.v = 'live'; if (['3M', 'YTD', '1Y', '5Y', 'All'].indexOf(S.lr) < 0) S.lr = '1Y';
  function save() { LS.set('btd_live', JSON.stringify(S)); }
  function fmt(v) { return v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + v.toFixed(2); }
  function sg(v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  var CB = 'https://api.exchange.coinbase.com/products/BTC-USD/', CN = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1&symbols=MSTR';
  var GR = { '1D': [300, 1], '1W': [3600, 7], '1M': [21600, 30], '1Y': [86400, 365] };
  var FB = false, D = { btc: {}, mstr: {} }, first = {}, last = {}, dayOpen = {}, quote = null, shown = null, tween = null, err = '';

  box.innerHTML = '<div class="p-h lv-h"><span class="seg lv-v" role="group" aria-label="Chart mode"><button type="button" data-lv-v="live">Live</button><button type="button" data-lv-v="lt">Long-term</button></span>' +
    '<span class="lv-lonly">' +
    '<span class="seg" role="group" aria-label="Symbol"><button type="button" data-lv-s="btc">BTC</button><button type="button" data-lv-s="mstr">MSTR</button></span>' +
    '<span class="seg" role="group" aria-label="Range"><button type="button" data-lv-r="1D">1D</button><button type="button" data-lv-r="1W">1W</button><button type="button" data-lv-r="1M">1M</button><button type="button" data-lv-r="1Y">1Y</button></span>' +
    '<span class="seg lv-m" role="group" aria-label="Chart style"><button type="button" data-lv-m="line">Line</button><button type="button" data-lv-m="area">Area</button><button type="button" data-lv-m="candle">Candles</button></span></span></div>' +
    '<div class="lv-live"><div class="lv-read"><b class="lv-px" data-lv-px>…</b><span class="lv-ch" data-lv-ch></span><span class="lv-since" data-lv-since></span><span class="lv-st" data-lv-st></span><a class="lv-alt" data-lv-alt href="#" hidden></a></div>' +
    '<div class="lv-cv"><canvas data-lv-cv aria-label="Live price chart"></canvas><div class="lv-msg" data-lv-msg hidden></div></div>' +
    '<p class="lv-ft"><span data-lv-src></span> <a href="#charts" data-lv-lt>Chart library ↓</a></p></div>' +
    '<div class="lv-ltw" data-lv-ltw hidden><div data-lv-ltb></div><p class="ch-ft lv-ft" data-lv-ltf></p></div>';
  var cv = box.querySelector('[data-lv-cv]'), msg = box.querySelector('[data-lv-msg]'), hov = null;

  function mktOpen() { var c = document.querySelector('[data-clock]'); if (c) return /\bopen\b/.test(c.className); var n = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })), m = n.getHours() * 60 + n.getMinutes(), d = n.getDay(); return d > 0 && d < 6 && m >= 570 && m < 960; }

  /* ---------- data ---------- */
  function btcHist(r) {
    var g = GR[r][0], now = Date.now(), span = GR[r][1] * 864e5, parts = [];
    for (var a = now - span; a < now; a += g * 290e3) parts.push([a, Math.min(now, a + g * 290e3)]);
    return Promise.all(parts.map(function (p) { return J(CB + 'candles?granularity=' + g + '&start=' + new Date(p[0]).toISOString() + '&end=' + new Date(p[1]).toISOString()); }))
      .then(function (arrs) { var m = {}; arrs.forEach(function (a) { (a || []).forEach(function (k) { m[k[0]] = { t: k[0] * 1e3, l: +k[1], h: +k[2], o: +k[3], c: +k[4] }; }); });
        D.btc[r] = Object.keys(m).map(function (k) { return m[k]; }).sort(function (x, y) { return x.t - y.t; }); D.btc[r].g = g * 1e3; });
  }
  function btcDayOpen() { return J(CB + 'candles?granularity=86400&start=' + new Date(Date.now() - 2 * 864e5).toISOString() + '&end=' + new Date().toISOString())
    .then(function (a) { if (a && a[0]) dayOpen.btc = +a[0][3]; }).catch(function () {}); }
  var closes = null;
  function mstrHist() { return closes ? Promise.resolve() : J('/members/data/stocks_daily.json').then(function (j) { var m = j.series.MSTR; closes = m.d.map(function (d, i) { return { t: Date.parse(d + 'T20:00:00Z'), c: m.c[i], d: d }; }); }); }
  function mstrQuote() { return J(CN).then(function (j) { var x = (j.FormattedQuoteResult || {}).FormattedQuote; x = Array.isArray(x) ? x[0] : x; if (!x) return;
    var n = function (v) { return parseFloat(String(v == null ? '' : v).replace(/[,%+]/g, '')); }, px = n(x.last); if (!isFinite(px)) return;
    quote = { px: px, ch: n(x.change), chp: n(x.change_pct), open: n(x.open), hi: n(x.high), lo: n(x.low), prev: n(x.previous_day_closing), rt: String(x.realTime) !== 'false', t: Date.now() };
    if (isFinite(quote.open) && quote.open > 0) dayOpen.mstr = quote.open; tick('mstr', px); }).catch(function () {}); }
  function mstrSeries(r) {
    FB = false; if (r === '1D') { var it = D.mstr.intra || []; if (it.length >= 2) return it.slice();
      FB = true; var rc = (closes || []).slice(-10).map(function (p) { return { t: p.t, c: p.c }; }); if (quote && mktOpen()) rc.push({ t: Date.now(), c: quote.px, live: 1 }); return rc; } // never blank: recent daily closes until live intraday builds up
    var days = { '1W': 7, '1M': 31, '1Y': 366 }[r], from = Date.now() - days * 864e5, s = (closes || []).filter(function (p) { return p.t >= from; }).map(function (p) { return { t: p.t, c: p.c }; });
    if (quote && mktOpen()) s.push({ t: Date.now(), c: quote.px, live: 1 });
    return s;
  }

  /* ---------- live ticks ---------- */
  function tick(sym, px) {
    if (!isFinite(px)) return; var prev = last[sym]; last[sym] = px; if (first[sym] == null) first[sym] = px;
    if (sym === 'btc') Object.keys(D.btc).forEach(function (r) { var a = D.btc[r]; if (!a || !a.length) return; var k = a[a.length - 1], now = Date.now();
      if (now >= k.t + a.g) a.push({ t: k.t + a.g * Math.floor((now - k.t) / a.g), o: k.c, h: px, l: px, c: px }); else { k.c = px; k.h = Math.max(k.h, px); k.l = Math.min(k.l, px); } });
    if (sym === 'mstr' && mktOpen()) { var it = D.mstr.intra = D.mstr.intra || []; it.push({ t: Date.now(), c: px }); }
    if (sym !== S.s) return;
    if (prev != null && prev !== px && !RM) { var el = box.querySelector('[data-lv-px]'); el.classList.remove('fl-up', 'fl-dn'); void el.offsetWidth; el.classList.add(px > prev ? 'fl-up' : 'fl-dn'); }
    animateTo(px);
  }
  function animateTo(px) {
    if (RM || shown == null) { shown = px; draw(); return; }
    var a = shown, t0 = performance.now(); tween && cancelAnimationFrame(tween);
    (function step(t) { var k = Math.min(1, (t - t0) / 700); k = 1 - Math.pow(1 - k, 3); shown = a + (px - a) * k; draw(); if (k < 1) tween = requestAnimationFrame(step); else tween = null; })(t0);
  }
  function poll() { if (document.hidden) return; J(CB + 'ticker').then(function (x) { tick('btc', +x.price); if (S.v === 'lt' && window.BTDPrice && window.BTDPrice.setLive) window.BTDPrice.setLive('btc', +x.price); }).catch(function () {}); }
  setInterval(poll, 5000);
  setInterval(function () { if (!document.hidden && mktOpen()) mstrQuote(); }, 30000);
  var wasOpen = mktOpen(); setInterval(function () { var o = mktOpen(); if (o !== wasOpen) { wasOpen = o; if (o) D.mstr.intra = []; mstrQuote().then(draw); } }, 60000); // auto-switch to live at the open
  setInterval(function () { if (!document.hidden && S.s === 'btc' && D.btc[S.r]) { var a = D.btc[S.r]; if (a.length && Date.now() - a[a.length - 1].t > a.g * 3) load(true); } }, 120000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { poll(); if (S.s === 'mstr') mstrQuote(); } });

  /* ---------- draw ---------- */
  function series() { var s = S.s === 'btc' ? (D.btc[S.r] || []) : mstrSeries(S.r); return s; }
  function draw() {
    var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return; var dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    var s = series(), cdl = S.m === 'candle' && S.s === 'btc';
    var noIntra = false;
    msg.hidden = !noIntra && !err; if (err && !s.length) { msg.textContent = err; msg.hidden = false; }
    if (noIntra) { var q = quote; msg.innerHTML = mktOpen() ? 'Collecting live MSTR prices… the free feed has no intraday history, so the 1D line builds while this page is open.' + (q ? '<br><span class="mono">Open ' + fmt(q.open) + ' · High ' + fmt(q.hi) + ' · Low ' + fmt(q.lo) + '</span>' : '')
      : 'US market closed' + (q ? ' · last close <b>' + fmt(q.px) + '</b> (' + sg(q.chp) + '%)<br><span class="mono">Open ' + fmt(q.open) + ' · High ' + fmt(q.hi) + ' · Low ' + fmt(q.lo) + ' · Prev close ' + fmt(q.prev) + '</span>' : '') + '<br>Pick 1W, 1M or 1Y for the daily-close chart.'; msg.hidden = false; }
    if (s.length && shown != null && !s[s.length - 1].fixed) { var lk = s[s.length - 1]; if (S.s === 'btc' || lk.live || S.r === '1D') { s = s.slice(); s[s.length - 1] = Object.assign({}, lk, { c: shown, h: Math.max(lk.h || shown, shown), l: Math.min(lk.l || shown, shown) }); } }
    readout(s);
    if (s.length < 2) return;
    var pad = { l: 6, r: W < 500 ? 54 : 64, t: 10, b: 20 }, pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    var lo = Infinity, hi = -Infinity; s.forEach(function (p) { lo = Math.min(lo, cdl ? p.l : p.c); hi = Math.max(hi, cdl ? p.h : p.c); });
    var dO = dayOpen[S.s]; if (dO && dO > lo * 0.97 && dO < hi * 1.03) { lo = Math.min(lo, dO); hi = Math.max(hi, dO); }
    var m = (hi - lo) * 0.08 || hi * 0.01; lo -= m; hi += m;
    var t0 = s[0].t, t1 = s[s.length - 1].t, X = function (t) { return pad.l + (t - t0) / ((t1 - t0) || 1) * pw; }, Y = function (v) { return pad.t + (hi - v) / (hi - lo) * ph; };
    x.font = '10px ui-monospace,Menlo,monospace'; x.fillStyle = '#7d8590'; x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 1;
    for (var i = 0; i <= 3; i++) { var v = lo + (hi - lo) * (i + .5) / 4, y = Math.round(Y(v)) + .5; x.beginPath(); x.moveTo(pad.l, y); x.lineTo(pad.l + pw, y); x.stroke(); x.fillText(fmt(v), pad.l + pw + 6, y + 3); }
    var nx = W < 500 ? 3 : 5; for (i = 0; i < nx; i++) { var tt = t0 + (t1 - t0) * (i + .5) / nx, d = new Date(tt);
      var lb = S.r === '1D' && !(S.s === 'mstr' && FB) ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : S.r === '1Y' ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); x.fillText(lb, X(tt) - x.measureText(lb).width / 2, H - 5); }
    var up = s[s.length - 1].c >= s[0].c, col = S.s === 'btc' ? '#F7931A' : '#e8e6e3';
    if (dO && dO >= lo && dO <= hi) { var yo = Math.round(Y(dO)) + .5; x.save(); x.setLineDash([3, 4]); x.strokeStyle = 'rgba(160,170,180,.45)'; x.beginPath(); x.moveTo(pad.l, yo); x.lineTo(pad.l + pw, yo); x.stroke(); x.restore();
      x.fillStyle = '#7d8590'; x.fillText(S.s === 'btc' ? 'day open (UTC)' : 'today’s open', pad.l + 4, yo - 4); }
    if (cdl) { var bw = Math.max(1, Math.min(9, pw / s.length * 0.7)); s.forEach(function (p) { var cx = X(p.t), g = p.c >= p.o; x.strokeStyle = x.fillStyle = g ? '#3fb950' : '#f85149';
        x.beginPath(); x.moveTo(cx, Y(p.h)); x.lineTo(cx, Y(p.l)); x.stroke(); var y1 = Y(Math.max(p.o, p.c)), y2 = Y(Math.min(p.o, p.c)); x.fillRect(cx - bw / 2, y1, bw, Math.max(1, y2 - y1)); }); }
    else { x.beginPath(); s.forEach(function (p, j) { j ? x.lineTo(X(p.t), Y(p.c)) : x.moveTo(X(p.t), Y(p.c)); });
      if (S.m === 'area') { x.save(); x.lineTo(X(t1), pad.t + ph); x.lineTo(X(t0), pad.t + ph); x.closePath(); var gr = x.createLinearGradient(0, pad.t, 0, pad.t + ph); gr.addColorStop(0, S.s === 'btc' ? 'rgba(247,147,26,.28)' : 'rgba(232,230,227,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fill(); x.restore();
        x.beginPath(); s.forEach(function (p, j) { j ? x.lineTo(X(p.t), Y(p.c)) : x.moveTo(X(p.t), Y(p.c)); }); }
      x.strokeStyle = col; x.lineWidth = 1.6; x.lineJoin = 'round'; x.stroke(); }
    var L = s[s.length - 1], lx = X(L.t), ly = Y(L.c); x.fillStyle = col; x.beginPath(); x.arc(lx, ly, 3, 0, 7); x.fill(); x.fillStyle = S.s === 'btc' ? 'rgba(247,147,26,.25)' : 'rgba(232,230,227,.2)'; x.beginPath(); x.arc(lx, ly, 7, 0, 7); x.fill();
    x.fillStyle = col; x.fillRect(pad.l + pw + 2, ly - 8, pad.r - 3, 16); x.fillStyle = '#0b0d10'; x.font = 'bold 10px ui-monospace,Menlo,monospace'; x.fillText(fmt(L.c), pad.l + pw + 5, ly + 3.5);
    if (hov != null && hov >= pad.l && hov <= pad.l + pw) { var tq = t0 + (hov - pad.l) / pw * (t1 - t0), b = s[0]; s.forEach(function (p) { if (Math.abs(p.t - tq) < Math.abs(b.t - tq)) b = p; });
      var hx = Math.round(X(b.t)) + .5; x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; x.beginPath(); x.moveTo(hx, pad.t); x.lineTo(hx, pad.t + ph); x.stroke();
      var dt = new Date(b.t), lab = fmt(b.c) + '  ' + (S.r === '1D' || S.r === '1W' && S.s === 'btc' ? dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      x.font = '11px ui-monospace,Menlo,monospace'; var tw = x.measureText(lab).width + 12, bx = Math.min(Math.max(pad.l, hx - tw / 2), pad.l + pw - tw); x.fillStyle = 'rgba(11,13,16,.92)'; x.fillRect(bx, pad.t, tw, 18); x.fillStyle = '#e8e6e3'; x.fillText(lab, bx + 6, pad.t + 13); }
  }
  function readout(s) {
    var px = shown != null ? shown : s.length ? s[s.length - 1].c : null, $ = function (q) { return box.querySelector(q); };
    $('[data-lv-px]').textContent = px != null ? (S.s === 'btc' ? 'BTC ' : 'MSTR ') + fmt(px) : '…';
    var ch = $('[data-lv-ch]'); if (px != null && s.length > 1) { var b = s[0].c, p = (px / b - 1) * 100; ch.className = 'lv-ch ' + (p >= 0 ? 'up' : 'dn'); ch.textContent = sg(p) + '% ' + S.r; } else ch.textContent = '';
    var si = $('[data-lv-since]'), f = first[S.s]; if (f != null && px != null) { var d = px - f, dp = (px / f - 1) * 100; si.className = 'lv-since ' + (d > 0 ? 'up' : d < 0 ? 'dn' : '');
      si.textContent = 'since you opened the page: ' + (d >= 0 ? '+' : '−') + (Math.abs(d) >= 100 ? '$' + Math.round(Math.abs(d)).toLocaleString('en-US') : '$' + Math.abs(d).toFixed(2)) + ' (' + sg(dp, 2) + '%)'; } else si.textContent = '';
    var st = $('[data-lv-st]'), src = $('[data-lv-src]');
    if (S.s === 'btc') { st.className = 'lv-st on'; st.textContent = '● live · 24/7'; src.textContent = 'BTC-USD from Coinbase Exchange, updates every 5s.'; }
    else { var open = mktOpen(), lc = closes && closes[closes.length - 1]; st.className = 'lv-st' + (open ? ' on' : '');
      st.textContent = open ? '● live · US market open' + (quote && !quote.rt ? ' (delayed)' : '') : 'Market closed · last close' + (lc ? ' ' + new Date(lc.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
      src.textContent = 'MSTR from the CNBC quote feed (real-time in market hours); history = daily closes' + (FB && S.r === '1D' ? '. 1D shows the last 10 daily closes until live intraday prices build up while this page is open.' : '.'); }
    var al = $('[data-lv-alt]'), o2 = S.s === 'btc' ? 'mstr' : 'btc', v2 = o2 === 'btc' ? last.btc : quote && quote.px;
    if (v2) { var op = mktOpen(), c2 = o2 === 'mstr' ? quote.chp : (dayOpen.btc ? (last.btc / dayOpen.btc - 1) * 100 : null);
      al.hidden = false; al.dataset.sym = o2; al.title = 'Chart ' + o2.toUpperCase();
      al.innerHTML = '<b>' + o2.toUpperCase() + '</b> ' + fmt(v2) + (c2 != null && isFinite(c2) ? ' <span class="' + (c2 >= 0 ? 'up' : 'dn') + '">' + sg(c2) + '%</span>' : '') + (o2 === 'mstr' ? ' <small>' + (op ? '● live' : 'Market closed · last close') + '</small>' : ' <small>● 24/7</small>'); }
    else al.hidden = true;
  }

  /* ---------- controls ---------- */
  function paintCtl() { [['v', 'data-lv-v'], ['s', 'data-lv-s'], ['r', 'data-lv-r'], ['m', 'data-lv-m']].forEach(function (a) { box.querySelectorAll('[' + a[1] + ']').forEach(function (b) { var on = b.getAttribute(a[1]) === S[a[0]]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); });
    var cb = box.querySelector('[data-lv-m="candle"]'); cb.disabled = S.s !== 'btc'; cb.title = S.s !== 'btc' ? 'Candles are BTC only: the free MSTR feed provides closes, not intraday open/high/low.' : ''; if (S.s !== 'btc' && S.m === 'candle') box.querySelector('[data-lv-m="line"]').classList.add('on'); }
  var LTP = ['3M', 'YTD', '1Y', '5Y', 'All'];
  function ltFrom(endT) { var e = new Date(endT), y = e.getUTCFullYear(), m = e.getUTCMonth(), d = e.getUTCDate(); return S.lr === '3M' ? Date.UTC(y, m - 3, d) : S.lr === 'YTD' ? Date.UTC(y, 0, 1) : S.lr === '1Y' ? Date.UTC(y - 1, m, d) : S.lr === '5Y' ? Date.UTC(y - 5, m, d) : 0; }
  function longTerm() { var w = box.querySelector('[data-lv-ltb]'); if (!window.BTDPrice) { w.innerHTML = '<p class="muted">Long-term chart unavailable.</p>'; return; }
    var sgm = '<span class="seg" role="group" aria-label="Period">' + LTP.map(function (k) { return '<button type="button" data-lv-lr="' + k + '"' + (k === S.lr ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + k + '</button>'; }).join('') + '</span>';
    window.BTDPrice.render(w, box.querySelector('[data-lv-ltf]'), { per: S.lr, from: ltFrom, seg: sgm }); }
  function view() { var lt = S.v === 'lt'; box.querySelector('.lv-live').hidden = lt; box.querySelector('[data-lv-ltw]').hidden = !lt; box.querySelector('.lv-lonly').hidden = lt; box.classList.toggle('lv-is-lt', lt); paintCtl(); if (lt) longTerm(); else load(); }
  function load(force) {
    err = ''; paintCtl(); shown = last[S.s] != null ? last[S.s] : null;
    var job = S.s === 'btc' ? Promise.all([D.btc[S.r] && !force ? null : btcHist(S.r), dayOpen.btc ? null : btcDayOpen(), last.btc == null ? J(CB + 'ticker').then(function (x) { tick('btc', +x.price); }) : null])
      : Promise.all([mstrHist(), quote ? null : mstrQuote()]);
    draw(); job.then(function () { if (S.s === 'btc' && shown == null && D.btc[S.r] && D.btc[S.r].length) shown = D.btc[S.r][D.btc[S.r].length - 1].c; if (S.s === 'mstr' && shown == null && quote) shown = quote.px; draw(); })
      .catch(function () { err = 'Live feed unavailable right now; it will retry automatically.'; draw(); });
  }
  box.addEventListener('click', function (e) {
    var vb = e.target.closest('[data-lv-v]'); if (vb) { S.v = vb.dataset.lvV; save(); view(); return; }
    var lr = e.target.closest('[data-lv-lr]'); if (lr) { S.lr = lr.dataset.lvLr; save(); longTerm(); return; }
    var al = e.target.closest('[data-lv-alt]'); if (al) { e.preventDefault(); S.s = al.dataset.sym; save(); load(); return; }
    var b = e.target.closest('[data-lv-s],[data-lv-r],[data-lv-m]'); if (b && !b.disabled) {
      if (b.dataset.lvS) S.s = b.dataset.lvS; if (b.dataset.lvR) S.r = b.dataset.lvR; if (b.dataset.lvM) S.m = b.dataset.lvM; save(); load(); return; }
    var lt = e.target.closest('[data-lv-lt]'); if (lt) { e.preventDefault(); var c = document.getElementById('charts'); c && c.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' }); } });
  cv.addEventListener('mousemove', function (e) { hov = e.offsetX; draw(); }); cv.addEventListener('mouseleave', function () { hov = null; draw(); });
  cv.addEventListener('touchmove', function (e) { var r = cv.getBoundingClientRect(); hov = e.touches[0].clientX - r.left; draw(); }, { passive: true }); cv.addEventListener('touchend', function () { hov = null; draw(); });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(draw, 80); });
  mstrHist().catch(function () {}); if (S.s !== 'mstr') mstrQuote().then(function () { if (S.v === 'live') readout(series()); });
  view();
  window.BTDLive = { state: S, draw: draw };
})();
