/* BTC Treasury Desk site script. No dependencies. */
/* ===== CONFIG: edit these values ===== */
var DESK_CONFIG = {
  // Newsletter form action URL from your email provider (e.g. Buttondown, Kit/ConvertKit, MailerLite, Beehiiv embed URL).
  // Leave '' until sign-ups open: the form then shows "Signups open soon" and stores/sends nothing.
  newsletterAction: 'https://app.kit.com/forms/10006069/subscriptions',
  // Field name your provider expects for the email address (most use "email"; Kit uses "email_address").
  newsletterEmailField: 'email_address',
  priceRefreshMs: 60000,
  halvingBlock: 1050000
};
/* ===================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var usd = function (n, d) { return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var num = function (n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var big = function (n) { var a = Math.abs(n), s = n < 0 ? '-' : ''; return a >= 1e12 ? s + '$' + (a / 1e12).toFixed(2) + 'T' : a >= 1e9 ? s + '$' + (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? s + '$' + (a / 1e6).toFixed(1) + 'M' : s + usd(a); };
  var dataCache = {};
  function getData(name) {
    if (!dataCache[name]) dataCache[name] = fetch('/assets/data/' + name + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw r.status; return r.json(); });
    return dataCache[name];
  }
  function fmtDate(iso) { var d = new Date(iso.length <= 10 ? iso + 'T12:00:00' : iso); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function dayOfYear() { var n = new Date(), s = new Date(n.getFullYear(), 0, 0); return Math.floor((n - s) / 864e5); }

  /* ---- Nav ---- */
  var t = $('.nav-toggle'), links = $('#nav-links');
  if (t && links) t.addEventListener('click', function () { var o = links.classList.toggle('open'); t.setAttribute('aria-expanded', o ? 'true' : 'false'); });

  /* ---- YouTube facade ---- */
  $$('.yt').forEach(function (el) {
    var img = $('img', el);
    function fb() { if (img.dataset.fallback && img.src !== img.dataset.fallback) img.src = img.dataset.fallback; }
    if (img) { img.addEventListener('error', fb); img.addEventListener('load', function () { if (img.naturalWidth && img.naturalWidth <= 120) fb(); }); if (img.complete && img.naturalWidth && img.naturalWidth <= 120) fb(); }
    el.addEventListener('click', function () {
      var src = el.dataset.playlist
        ? 'https://www.youtube-nocookie.com/embed/videoseries?list=' + el.dataset.playlist + '&autoplay=1&rel=0'
        : 'https://www.youtube-nocookie.com/embed/' + el.dataset.yt + '?autoplay=1&rel=0';
      var f = document.createElement('iframe');
      f.src = src; f.title = el.dataset.title || 'YouTube video'; f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
      el.innerHTML = ''; el.appendChild(f); el.classList.add('playing');
    });
  });

  /* ---- TradingView widgets (lazy) ---- */
  function loadTV(el) {
    if (el.dataset.loaded) return; el.dataset.loaded = '1';
    var s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-' + el.dataset.tv + '.js';
    s.async = true; s.type = 'text/javascript'; s.text = el.dataset.tvConfig;
    el.appendChild(s);
    setTimeout(function () { var ph = $('.tv-ph', el); if (ph) ph.remove(); }, 2500);
  }
  var tvs = $$('.tv[data-tv]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { io.unobserve(x.target); loadTV(x.target); } }); }, { rootMargin: '400px' });
    tvs.forEach(function (el) { if (el.hasAttribute('data-tv-eager')) loadTV(el); else io.observe(el); });
  } else tvs.forEach(loadTV);
  $$('[data-ta]').forEach(function (panel) {
    $$('[data-ta-symbol]', panel).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('[data-ta-symbol]', panel).forEach(function (x) { x.classList.toggle('on', x === b); });
        var old = $('.tv', panel), cfg = JSON.parse(old.dataset.tvConfig); cfg.symbol = b.dataset.taSymbol;
        var n = document.createElement('div'); n.className = old.className; n.dataset.tv = old.dataset.tv; n.dataset.tvConfig = JSON.stringify(cfg);
        n.innerHTML = '<div class="tradingview-widget-container__widget"></div><div class="tv-ph">Loading TradingView…</div>' + ($('.tradingview-widget-copyright', old) || { outerHTML: '' }).outerHTML;
        old.parentNode.replaceChild(n, old); loadTV(n);
      });
    });
  });

  /* ---- Count-up ---- */
  function countUp(el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), suf = el.dataset.suffix || '';
    if (isNaN(target)) return;
    if (reduce) { el.textContent = num(target, dec) + suf; return; }
    var t0 = null, dur = 900;
    function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / dur), v = target * (1 - Math.pow(1 - p, 3)); el.textContent = num(v, dec) + suf; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  var cs = $$('[data-count]');
  if ('IntersectionObserver' in window) { var co = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { co.unobserve(x.target); countUp(x.target); } }); }); cs.forEach(function (el) { co.observe(el); }); }

  /* ---- Days since ---- */
  $$('[data-days-since]').forEach(function (el) {
    var d = el.dataset.daysSince; if (!d) return;
    var days = Math.max(0, Math.floor((Date.now() - new Date(d + 'T12:00:00').getTime()) / 864e5));
    el.textContent = days + (days === 1 ? ' day' : ' days');
  });

  /* ---- Live BTC price ---- */
  var BTC = { price: null, change: null, src: null, at: null };
  function fetchJSON(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function getPrice() {
    // 1) CoinGecko  2) Coinbase Exchange 24h stats (gives change)  3) Coinbase spot
    return fetchJSON('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true')
      .then(function (j) { if (!j.bitcoin || !j.bitcoin.usd) throw new Error('cg'); return { price: j.bitcoin.usd, change: j.bitcoin.usd_24h_change, src: 'CoinGecko' }; })
      .catch(function () { return fetchJSON('https://api.exchange.coinbase.com/products/BTC-USD/stats').then(function (j) { var l = parseFloat(j.last), o = parseFloat(j.open); if (!l) throw new Error('cbx'); return { price: l, change: o ? (l / o - 1) * 100 : null, src: 'Coinbase' }; }); })
      .catch(function () { return fetchJSON('https://api.coinbase.com/v2/prices/BTC-USD/spot').then(function (j) { return { price: parseFloat(j.data.amount), change: null, src: 'Coinbase' }; }); });
  }
  var PKEY = 'btd.btcprice';
  function cachedPrice() { try { var c = JSON.parse(sessionStorage.getItem(PKEY)); if (c && Date.now() - c.t < DESK_CONFIG.priceRefreshMs) return c; } catch (e) {} return null; }
  function paintPrice() {
    var p = BTC.price, ok = p != null;
    $$('[data-live="btc-price"]').forEach(function (el) { el.textContent = ok ? usd(p) : 'Data unavailable'; el.classList.toggle('na', !ok); });
    $$('[data-live="btc-change"]').forEach(function (el) {
      if (!ok) { el.textContent = 'Live price unavailable, try again shortly'; return; }
      if (BTC.change == null) { el.textContent = '24h change n/a (' + BTC.src + ')'; el.className = ''; return; }
      el.textContent = (BTC.change >= 0 ? '▲ ' : '▼ ') + Math.abs(BTC.change).toFixed(2) + '% 24h'; el.className = BTC.change >= 0 ? 'up' : 'down';
    });
    $$('[data-live="btc-src"]').forEach(function (el) { if (ok) el.innerHTML = 'Source: ' + BTC.src + ' · updated ' + BTC.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · refreshes every 60 s'; });
    $$('[data-usd-btc]').forEach(function (el) { el.textContent = ok ? big(parseFloat(el.dataset.usdBtc) * p) : 'n/a'; });
    $$('[data-live="strategy-value"]').forEach(function (el) { if (ok) el.textContent = big(parseFloat(el.dataset.usdBtc) * p) + (el.closest('.tile') ? ' live value' : ''); });
    $$('[data-live="strategy-pl"]').forEach(function (el) {
      if (!ok) { el.textContent = 'n/a'; return; }
      var pl = parseFloat(el.dataset.btc) * p - parseFloat(el.dataset.cost), pct = pl / parseFloat(el.dataset.cost) * 100;
      el.textContent = (pl >= 0 ? '+' : '') + big(pl) + ' (' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%)'; el.className = pl >= 0 ? 'up' : 'down';
    });
    $$('[data-live="sats-per-usd"]').forEach(function (el) { el.textContent = ok ? num(1e8 / p) : 'n/a'; });
    document.dispatchEvent(new CustomEvent('btcprice'));
  }
  var needsPrice = $('[data-live],[data-usd-btc],[data-conv],[data-stack],[data-whatif],[data-lab-cfg]');
  function refreshPrice() {
    if (document.hidden) return;
    var c = cachedPrice();
    var p = c ? Promise.resolve(c) : getPrice().then(function (r) { r.t = Date.now(); try { sessionStorage.setItem(PKEY, JSON.stringify(r)); } catch (e) {} return r; });
    p.then(function (r) { BTC.price = r.price; BTC.change = r.change; BTC.src = r.src; BTC.at = new Date(r.t); paintPrice(); })
      .catch(function () { if (BTC.price == null) paintPrice(); });
  }
  if (needsPrice) { refreshPrice(); setInterval(refreshPrice, DESK_CONFIG.priceRefreshMs); document.addEventListener('visibilitychange', function () { if (!document.hidden && (!BTC.at || Date.now() - BTC.at > DESK_CONFIG.priceRefreshMs)) refreshPrice(); }); }

  /* ---- Network (mempool.space) ---- */
  if ($('[data-net]')) {
    var set = function (k, v) { $$('[data-net="' + k + '"]').forEach(function (el) { el.textContent = v; }); };
    fetchJSON('https://mempool.space/api/blocks/tip/height').then(function (h) {
      set('height', num(h));
      var left = DESK_CONFIG.halvingBlock - h, eta = new Date(Date.now() + left * 6e5);
      set('halving', num(left) + ' blocks (~' + eta.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + ')');
    }).catch(function () { set('height', 'unavailable'); set('halving', 'unavailable'); });
    fetchJSON('https://mempool.space/api/v1/fees/recommended').then(function (f) { set('fees', f.fastestFee + ' fast · ' + f.hourFee + ' slow'); }).catch(function () { set('fees', 'n/a'); });
    fetchJSON('https://mempool.space/api/v1/difficulty-adjustment').then(function (d) { set('diff', (d.difficultyChange >= 0 ? '+' : '') + d.difficultyChange.toFixed(2) + '% in ' + num(d.remainingBlocks) + ' blocks'); }).catch(function () { set('diff', 'n/a'); });
  }

  /* ---- Sats <-> USD converter ---- */
  $$('[data-conv]').forEach(function (box) {
    var s = $('[data-conv-sats]', box), u = $('[data-conv-usd]', box), last = 's';
    function fromS() { last = 's'; if (BTC.price) u.value = (parseFloat(s.value || 0) / 1e8 * BTC.price).toFixed(2); }
    function fromU() { last = 'u'; if (BTC.price) s.value = Math.round(parseFloat(u.value || 0) / BTC.price * 1e8); }
    s.addEventListener('input', fromS); u.addEventListener('input', fromU);
    document.addEventListener('btcprice', function () { last === 's' ? fromS() : fromU(); });
  });

  /* ---- Stack tracker (localStorage only) ---- */
  $$('[data-stack]').forEach(function (box) {
    var inp = $('[data-stack-btc]', box), KEY = 'btd.stack.btc', STRAT = 847666;
    getData('strategy').then(function (d) { STRAT = d.btc_held || STRAT; paint(); }).catch(function () {});
    try { inp.value = localStorage.getItem(KEY) || ''; } catch (e) {}
    function paint() {
      var b = parseFloat(inp.value || 0);
      $('[data-stack-sats]', box).textContent = num(Math.round(b * 1e8));
      $('[data-stack-usd]', box).textContent = BTC.price ? usd(b * BTC.price, 2) : 'n/a';
      $('[data-stack-pct]', box).textContent = b ? (b / STRAT * 100).toPrecision(3) + '%' : '0%';
    }
    inp.addEventListener('input', function () { try { localStorage.setItem(KEY, inp.value); } catch (e) {} paint(); });
    $('[data-stack-clear]', box).addEventListener('click', function () { inp.value = ''; try { localStorage.removeItem(KEY); } catch (e) {} paint(); });
    document.addEventListener('btcprice', paint); paint();
  });

  /* ---- What-if (educational) ---- */
  $$('[data-whatif]').forEach(function (box) {
    var amt = $('[data-whatif-amt]', box), pick = $('[data-whatif-pick]', box), out = $('[data-whatif-out]', box), rows = [];
    getData('strategy').then(function (d) { rows = d.purchases; paint(); });
    function paint() {
      var r = rows[parseInt(pick.value, 10)]; if (!r) return;
      if (!BTC.price) { out.textContent = 'Waiting for the live BTC price…'; return; }
      var a = parseFloat(amt.value || 0), btc = a / r.avg_price, now = btc * BTC.price, ch = (now / a - 1) * 100;
      out.innerHTML = usd(a) + ' at ' + usd(r.avg_price) + ' (' + fmtDate(r.date) + ') = <b>' + num(btc, 6) + ' BTC</b>, worth <b>' + usd(now) + '</b> today (' + (ch >= 0 ? '+' : '') + ch.toFixed(1) + '%). Educational only.';
    }
    amt.addEventListener('input', paint); pick.addEventListener('change', paint); document.addEventListener('btcprice', paint);
  });

  /* ---- Preferred effective yield at your price ---- */
  $$('[data-pref]').forEach(function (box) {
    var px = $('[data-px]', box), out = $('[data-pref-out]', box), rate = parseFloat(box.dataset.rate);
    function paint() { var p = parseFloat(px.value); if (!p) { out.textContent = 'Enter a price'; return; }
      var y = rate * 100 / p, d = p - 100;
      out.innerHTML = 'Effective yield <b>' + y.toFixed(2) + '%</b> · ' + (d >= 0 ? usd(d, 2) + ' above' : usd(-d, 2) + ' below') + ' $100 par (' + (d / 100 * 100).toFixed(2) + '%)'; }
    px.addEventListener('input', paint); paint();
  });
  $$('[data-divcalc]').forEach(function (box) {
    var sec = $('[data-dc-sec]', box), mode = $('[data-dc-mode]', box), amt = $('[data-dc-amt]', box), px = $('[data-dc-px]', box), out = $('[data-dc-out]', box);
    function paint() {
      var o = sec.options[sec.selectedIndex], rate = parseFloat(o.dataset.rate), p = parseFloat(px.value) || 100, a = parseFloat(amt.value || 0);
      var shares = mode.value === 'usd' ? a / p : a, annual = shares * 100 * rate / 100;
      out.innerHTML = '<b>' + num(shares, 2) + ' shares</b> → about <b>' + usd(annual / 12, 2) + '/month</b>, <b>' + usd(annual, 2) + '/year</b> at ' + rate.toFixed(2) + '% (estimate, before tax).';
    }
    sec.addEventListener('change', function () { px.value = sec.options[sec.selectedIndex].dataset.px; paint(); });
    [mode, amt, px].forEach(function (x) { x.addEventListener('input', paint); x.addEventListener('change', paint); }); paint();
  });

  /* ---- SVG charts ---- */
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function tip(node, text) { var t = svgEl('title', {}, node); t.textContent = text; }
  function frame(el, h) {
    el.innerHTML = ''; var W = Math.max(300, Math.round((el.clientWidth || 1000) - 20)), H = Math.round(Math.min(h || 320, Math.max(220, W * 0.6)));
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'svgchart', preserveAspectRatio: 'xMidYMid meet' }, el);
    var narrow = W < 560; return { svg: svg, W: W, H: H, L: narrow ? 44 : 64, R: narrow ? 14 : 64, T: 16, B: 30, narrow: narrow };
  }
  function axisY(f, min, max, fmt, right, ticks) {
    ticks = ticks || 4;
    for (var i = 0; i <= ticks; i++) {
      var v = min + (max - min) * i / ticks, y = f.H - f.B - (f.H - f.T - f.B) * i / ticks;
      if (!right) svgEl('line', { x1: f.L, x2: f.W - f.R, y1: y, y2: y, class: 'grid' }, f.svg);
      var tx = svgEl('text', { x: right ? f.W - f.R + 6 : f.L - 6, y: y + 4, class: 'ax', 'text-anchor': right ? 'start' : 'end' }, f.svg); tx.textContent = fmt(v);
    }
  }
  function axisX(f, t0, t1) {
    var y0 = new Date(t0).getFullYear(), y1 = new Date(t1).getFullYear(), span = t1 - t0;
    if (span < 400 * 864e5) {
      var d = new Date(t0); d.setDate(1); d.setMonth(d.getMonth() + 1);
      for (; d.getTime() <= t1; d.setMonth(d.getMonth() + (span < 120 * 864e5 ? 1 : 2))) { var x = f.L + (d - t0) / span * (f.W - f.L - f.R); var tx = svgEl('text', { x: x, y: f.H - 10, class: 'ax', 'text-anchor': 'middle' }, f.svg); tx.textContent = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); }
      return;
    }
    if (span < 1100 * 864e5) {
      var q = new Date(t0); q.setDate(1); q.setMonth(Math.floor(q.getMonth() / 3) * 3 + 3);
      var stepM = f.narrow ? 6 : 3;
      for (; q.getTime() <= t1; q.setMonth(q.getMonth() + stepM)) { var xq = f.L + (q - t0) / span * (f.W - f.L - f.R); var tq = svgEl('text', { x: xq, y: f.H - 10, class: 'ax', 'text-anchor': 'middle' }, f.svg); tq.textContent = q.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); }
      return;
    }
    for (var yr = y0 + 1; yr <= y1; yr += (f.narrow ? 2 : 1)) { var x2 = f.L + (new Date(yr, 0, 1) - t0) / span * (f.W - f.L - f.R); var t2 = svgEl('text', { x: x2, y: f.H - 10, class: 'ax', 'text-anchor': 'middle' }, f.svg); t2.textContent = yr; }
  }
  function ts(d) { return new Date(d + 'T12:00:00').getTime(); }
  function lineChart(el, series, opts) {
    var f = frame(el, opts.h), all = [];
    series.forEach(function (s) { all = all.concat(s.pts); });
    var t0 = Math.min.apply(null, all.map(function (p) { return p[0]; })), t1 = Math.max.apply(null, all.map(function (p) { return p[0]; }));
    var vmin = opts.min != null ? opts.min : Math.min.apply(null, all.map(function (p) { return p[1]; })), vmax = Math.max.apply(null, all.map(function (p) { return p[1]; }));
    var pad = (vmax - vmin) * 0.08 || vmax * 0.05; if (opts.min == null) vmin -= pad; vmax += pad;
    if (t1 === t0) t1 = t0 + 864e5;
    var X = function (t) { return f.L + (t - t0) / (t1 - t0) * (f.W - f.L - f.R); }, Y = function (v) { return f.H - f.B - (v - vmin) / (vmax - vmin) * (f.H - f.T - f.B); };
    axisY(f, vmin, vmax, opts.fmt); axisX(f, t0, t1);
    series.forEach(function (s) {
      var d = '';
      s.pts.forEach(function (p, i) {
        if (s.step && i) d += ' L' + X(p[0]).toFixed(1) + ',' + Y(s.pts[i - 1][1]).toFixed(1);
        d += (i ? ' L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1);
      });
      if (s.step && s.extendTo) d += ' L' + X(s.extendTo).toFixed(1) + ',' + Y(s.pts[s.pts.length - 1][1]).toFixed(1);
      svgEl('path', { d: d, class: 'ln ' + (s.cls || '') }, f.svg);
      s.pts.forEach(function (p) { var c = svgEl('circle', { cx: X(p[0]), cy: Y(p[1]), r: s.pts.length > 40 ? 2 : 4, class: 'pt ' + (s.cls || '') }, f.svg); tip(c, s.name + ' · ' + fmtDate(new Date(p[0]).toISOString().slice(0, 10)) + ': ' + opts.fmtTip(p[1])); });
    });
  }
  function timelineChart(el, rows) {
    var f = frame(el, 340); f.R = f.narrow ? 44 : 72;
    var t0 = ts(rows[0].date), t1 = ts(rows[rows.length - 1].date) + 20 * 864e5;
    var bmax = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.btc); })), hmax = Math.max.apply(null, rows.map(function (r) { return r.holdings; })) * 1.05;
    var bmin = Math.min(0, Math.min.apply(null, rows.map(function (r) { return r.btc; })));
    var X = function (t) { return f.L + (t - t0) / (t1 - t0) * (f.W - f.L - f.R); };
    var Yb = function (v) { return f.H - f.B - (v - bmin) / (bmax - bmin) * (f.H - f.T - f.B); };
    var Yh = function (v) { return f.H - f.B - v / hmax * (f.H - f.T - f.B); };
    axisY(f, bmin, bmax, function (v) { return num(v / 1000) + 'k'; }); axisY(f, 0, hmax, function (v) { return num(v / 1000) + 'k'; }, true);
    axisX(f, t0, t1);
    var zero = Yb(0);
    rows.forEach(function (r) {
      var x = X(ts(r.date)), y = Yb(r.btc), neg = r.btc < 0;
      var bw = Math.max(1.2, Math.min(4, (f.W - f.L - f.R) / rows.length * 0.7)); var b = svgEl('rect', { x: x - bw / 2, y: Math.min(y, zero), width: bw, height: Math.max(1, Math.abs(zero - y)), class: neg ? 'bar neg' : 'bar' }, f.svg);
      tip(b, fmtDate(r.date) + ': ' + (r.btc > 0 ? '+' : '') + num(r.btc) + ' BTC at ~' + usd(r.avg_price) + ' · holdings ' + num(r.holdings));
    });
    var d = rows.map(function (r, i) { return (i ? 'L' : 'M') + X(ts(r.date)).toFixed(1) + ',' + Yh(r.holdings).toFixed(1); }).join(' ');
    svgEl('path', { d: d, class: 'ln cum' }, f.svg);
    if (!f.narrow) { var lab = svgEl('text', { x: f.L + 60, y: 12, class: 'ax' }, f.svg); lab.textContent = 'BTC per announcement (left) · cumulative holdings (right)'; }
  }
  var charts = $$('[data-chart]');
  if (charts.length) {
    var draw = function (el) {
      var k = el.dataset.chart;
      var fail = function () { el.innerHTML = '<p class="muted">Chart data unavailable right now.</p>'; };
      if (k === 'timeline') getData('strategy').then(function (d) { timelineChart(el, d.purchases); }).catch(fail);
      if (k === 'bps-mstr') getData('strategy').then(function (d) {
        var pts = d.purchases.filter(function (r) { return r.adso_k; }).map(function (r) { return [ts(r.date), r.holdings / (r.adso_k * 1000) * 1e8]; });
        lineChart(el, [{ name: 'MSTR sats/share', pts: pts, cls: 'o' }], { fmt: function (v) { return num(v / 1000) + 'k'; }, fmtTip: function (v) { return num(v) + ' sats/share'; }, h: 280 });
      }).catch(fail);
      if (k === 'bps-asst') getData('strive').then(function (d) {
        var pts = d.points.map(function (r) { return [ts(r.date), r.btc / r.shares * 1e8]; });
        lineChart(el, [{ name: 'ASST sats/share', pts: pts, cls: 'o' }], { fmt: function (v) { return num(v); }, fmtTip: function (v) { return num(v) + ' sats/share'; }, h: 280 });
      }).catch(fail);
      if (k === 'rates') getData('rates').then(function (d) {
        var mk = function (arr) { return arr.map(function (r) { return [ts(r.effective), r.rate]; }); };
        var end = Date.now();
        lineChart(el, [{ name: 'STRC', pts: mk(d.series.STRC), cls: 'o', step: true, extendTo: end }, { name: 'SATA', pts: mk(d.series.SATA), cls: 'w', step: true, extendTo: end }],
          { fmt: function (v) { return v.toFixed(1) + '%'; }, fmtTip: function (v) { return v.toFixed(2) + '%'; }, h: 300 });
      }).catch(fail);
    };
    if ('IntersectionObserver' in window) { var cio = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { cio.unobserve(x.target); draw(x.target); } }); }, { rootMargin: '300px' }); charts.forEach(function (c) { cio.observe(c); }); }
    else charts.forEach(draw);
  }

  /* ---- Rotators: quote of the day, concept, fact ---- */
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var qhtml = function (q, full) {
    var lbl = full ? (q.type_label || 'Source') + ': ' + (q.context || '') : (q.type_label || 'Source');
    return (q.theme === 'predictions' ? '<span class="q-pred">Prediction (his view, not ours)</span>' : '') + '<p>&ldquo;' + esc(q.text) + '&rdquo;</p><footer class="mono"><span>' + esc(q.date_label || fmtDate(q.date)) + '</span><a href="' + esc(q.url) + '" target="_blank" rel="noopener">' + esc(lbl) + '</a></footer>';
  };
  $$('[data-qotd]').forEach(function (el) {
    getData('quotes').then(function (d) { var q = d.items[dayOfYear() % d.items.length];
      el.innerHTML = qhtml(q, el.hasAttribute('data-qotd-big')); qotdShare(q); }).catch(function () {});
  });
  $$('[data-rotate="concept"]').forEach(function (el) {
    getData('glossary').then(function (d) { var t = d.terms[dayOfYear() % d.terms.length];
      el.innerHTML = '<b><a href="/glossary/#' + esc(t.id) + '">' + esc(t.term) + '</a></b><p>' + esc(t.definition) + '</p>'; }).catch(function () {});
  });
  $$('[data-rotate="fact"]').forEach(function (el) {
    getData('facts').then(function (d) { var f = d.items[dayOfYear() % d.items.length];
      el.innerHTML = '<p>' + esc(f.text) + '</p>';
      var s = el.parentNode.querySelector('[data-rotate-src]'); if (s) s.innerHTML = 'Source: <a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.source) + '</a>'; }).catch(function () {});
  });

  /* ---- Filters: quotes, timeline, glossary ---- */
  function chipFilter(attr, itemSel, itemAttr) {
    var chips = $$('[' + attr + ']'); if (!chips.length) return;
    chips.forEach(function (c) { c.addEventListener('click', function () {
      var v = c.getAttribute(attr); chips.forEach(function (x) { x.classList.toggle('on', x === c); x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      $$(itemSel).forEach(function (it) { it.hidden = !(v === 'all' || it.getAttribute(itemAttr) === v); });
    }); });
  }
  chipFilter('data-qf', '.quotes .quote', 'data-topic');
  chipFilter('data-tl', '.timeline li', 'data-era');
  var gf = $('[data-gfilter]');
  if (gf) gf.addEventListener('input', function () { var q = gf.value.trim().toLowerCase(); $$('.gterm').forEach(function (g) { g.hidden = q && g.dataset.g.indexOf(q) < 0; }); });

  /* ---- Copy / share quotes ---- */
  function tweetUrl(line, url) { return 'https://x.com/intent/tweet?text=' + encodeURIComponent(line.length > 230 ? line.slice(0, 227) + '…' : line) + '&url=' + encodeURIComponent(url); }
  function qotdShare(q) { $$('[data-qotd-share]').forEach(function (a) { a.href = tweetUrl('“' + q.text + '” (Michael Saylor)', location.origin + '/saylor/#quotes'); }); }
  $$('.quotes .quote').forEach(function (b) {
    var text = $('p', b).textContent.trim(), line = text + ' (Michael Saylor)';
    var cp = $('[data-copy]', b), sx = $('[data-share-x]', b);
    if (cp) cp.addEventListener('click', function () {
      var done = function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(line + ' ' + location.origin + '/saylor/').then(done, done); else done();
    });
    if (sx) sx.href = tweetUrl(line, location.origin + '/saylor/' + (b.id ? '#' + b.id : ''));
    if (sx) { sx.target = '_blank'; sx.rel = 'noopener'; }
  });

  /* ---- Treasury Quiz ---- */
  $$('[data-quiz]').forEach(function (box) {
    getData('quiz').then(function (d) {
      var qs = d.questions, i = 0, score = 0;
      function show() {
        if (i >= qs.length) return finish();
        var q = qs[i];
        box.innerHTML = '<p class="mono muted">Question ' + (i + 1) + ' of ' + qs.length + ' · Score ' + score + '</p><h3>' + esc(q.q) + '</h3><div class="quiz-opts">' +
          q.options.map(function (o, k) { return '<button type="button" class="btn btn-ghost" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div><p class="quiz-why" aria-live="polite"></p>';
        $$('[data-k]', box).forEach(function (b) { b.addEventListener('click', function () {
          var k = +b.dataset.k, ok = k === q.answer; if (ok) score++;
          $$('[data-k]', box).forEach(function (x) { x.disabled = true; if (+x.dataset.k === q.answer) x.classList.add('right'); });
          if (!ok) b.classList.add('wrong');
          $('.quiz-why', box).innerHTML = '<b>' + (ok ? 'Correct.' : 'Not quite.') + '</b> ' + esc(q.why) + ' <button type="button" class="btn btn-primary btn-sm" data-next>' + (i + 1 < qs.length ? 'Next' : 'See score') + '</button>';
          $('[data-next]', box).addEventListener('click', function () { i++; show(); });
        }); });
      }
      function finish() {
        var msg = score >= 9 ? 'Desk pro.' : score >= 6 ? 'Solid. A couple of episodes and you are there.' : 'Good start. The Start here guide will help.';
        var share = 'I scored ' + score + '/' + qs.length + ' on the BTC Treasury Desk Treasury Quiz.';
        box.innerHTML = '<p class="label"><span class="n">' + score + '/' + qs.length + '</span> | Your score</p><h3>' + msg + '</h3><div class="cta-row">' +
          '<a class="btn btn-primary" target="_blank" rel="noopener" href="https://x.com/intent/tweet?text=' + encodeURIComponent(share) + '&url=' + encodeURIComponent(location.origin + '/resources/#quiz') + '&via=BTCTreasuryDesk">Share on X</a>' +
          '<button type="button" class="btn btn-ghost" data-copyres>Copy result</button><button type="button" class="btn btn-ghost" data-again>Try again</button><a class="btn btn-ghost" href="/start/">Start here</a></div>';
        $('[data-again]', box).addEventListener('click', function () { i = 0; score = 0; show(); });
        $('[data-copyres]', box).addEventListener('click', function (ev) { if (navigator.clipboard) navigator.clipboard.writeText(share + ' ' + location.origin + '/resources/#quiz'); ev.target.textContent = 'Copied'; });
      }
      show();
    }).catch(function () { box.innerHTML = '<p class="muted">Quiz unavailable right now.</p>'; });
  });


  /* ---- X (Twitter) timeline embeds, lazy ---- */
  var xs = $$('.x-embed');
  if (xs.length) {
    var loadX = function () { if (window.__xLoaded) return; window.__xLoaded = true; var sc = document.createElement('script'); sc.src = 'https://platform.twitter.com/widgets.js'; sc.async = true; sc.charset = 'utf-8'; document.body.appendChild(sc); };
    if ('IntersectionObserver' in window) { var xo = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { xo.disconnect(); loadX(); } }); }, { rootMargin: '300px' }); xs.forEach(function (x) { xo.observe(x); }); }
    else loadX();
  }

  /* ---- Quote of the day: "Another quote" ---- */
  var qn = $('[data-qotd-next]');
  if (qn) {
    var qi = null;
    qn.addEventListener('click', function () {
      getData('quotes').then(function (d) {
        if (qi === null) qi = dayOfYear() % d.items.length;
        qi = (qi + 1) % d.items.length; var q = d.items[qi], el = $('[data-qotd-big]');
        el.innerHTML = qhtml(q, true); qotdShare(q);
      });
    });
  }

  /* ---- Share table: tier filter, search, sortable headers ---- */
  $$('table[data-sortable]').forEach(function (tbl) {
    var body = tbl.tBodies[0], rows = $$('tr', body), tierMax = 2, q = '';
    function apply() { rows.forEach(function (r) { r.hidden = (+r.dataset.tier > tierMax) || (q && r.dataset.name.indexOf(q) < 0); }); }
    $$('[data-tier-f]').forEach(function (c) { c.addEventListener('click', function () {
      tierMax = +c.dataset.tierF; $$('[data-tier-f]').forEach(function (x) { x.classList.toggle('on', x === c); }); apply(); }); });
    var sbox = $('[data-co-search]'); if (sbox) sbox.addEventListener('input', function () { q = sbox.value.trim().toLowerCase(); apply(); });
    $$('th[data-sort]', tbl).forEach(function (th) {
      th.tabIndex = 0; th.setAttribute('role', 'button'); th.title = 'Sort';
      function sort() {
        var idx = Array.prototype.indexOf.call(th.parentNode.children, th), numeric = th.dataset.sort === 'num';
        var dir = th.dataset.dir === 'asc' ? 'desc' : 'asc'; $$('th', tbl).forEach(function (x) { delete x.dataset.dir; x.removeAttribute('aria-sort'); });
        th.dataset.dir = dir; th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
        rows.sort(function (a, b) {
          var va = a.children[idx].dataset.v, vb = b.children[idx].dataset.v;
          var c = numeric ? (parseFloat(va) - parseFloat(vb)) : String(va).localeCompare(String(vb));
          return dir === 'asc' ? c : -c;
        });
        rows.forEach(function (r) { body.appendChild(r); });
      }
      th.addEventListener('click', sort); th.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); sort(); } });
    });
    apply();
  });


  /* ---- Compare two companies ---- */
  $$('[data-compare]').forEach(function (box) {
    var rows = JSON.parse($('[data-cmp-data]', box).textContent), by = {};
    rows.forEach(function (r) { by[r.slug] = r; });
    var A = $('[data-cmp="a"]', box), B = $('[data-cmp="b"]', box), body = $('[data-cmp-body]', box);
    A.value = rows[0].slug; B.value = (rows[1] || rows[0]).slug;
    var tag = function (s) { return s === 'i' ? ' <sup>i</sup>' : s === 'b' ? '†' : ''; };
    var defs = [
      ['Rank', function (r) { return r.rank; }, function (v) { return '#' + v; }, false],
      ['BTC held', function (r) { return r.btc; }, function (v) { return num(v); }, true],
      ['% of public-company BTC', function (r) { return r.share; }, function (v) { return v.toFixed(2) + '%'; }, true],
      ['Live BTC value', function (r) { return BTC.price ? r.btc * BTC.price : null; }, function (v) { return big(v); }, true],
      ['BTC per share', function (r) { return r.bps; }, function (v, r) { return v.toFixed(6) + tag(r.bps_src); }, true],
      ['Market cap', function (r) { return r.mcap; }, function (v, r) { return big(v) + tag(r.mcap_src); }, true],
      ['mNAV', function (r) { return r.mnav; }, function (v, r) { return v.toFixed(2) + 'x' + tag(r.mnav_src); }, true],
      ['90-day BTC change', function (r) { return r.chg90; }, function (v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }, true],
      ['Last holdings change', function (r) { return r.last ? new Date(r.last).getTime() : null; }, function (v, r) { return fmtDate(r.last) + (r.last_delta ? ' (' + (r.last_delta > 0 ? '+' : '') + num(r.last_delta) + ')' : ''); }, true]
    ];
    function paint() {
      var a = by[A.value], b = by[B.value];
      $('[data-cmp-h="a"]', box).textContent = a.name; $('[data-cmp-h="b"]', box).textContent = b.name;
      body.innerHTML = defs.map(function (d) {
        var va = d[1](a), vb = d[1](b), hi = d[3] && va != null && vb != null && va !== vb ? (va > vb ? 'a' : 'b') : '';
        var cell = function (v, r, k) { return '<td class="num' + (hi === k ? ' hi' : '') + '">' + (v == null ? '–' : d[2](v, r)) + '</td>'; };
        return '<tr><th scope="row">' + d[0] + '</th>' + cell(va, a, 'a') + cell(vb, b, 'b') + '</tr>';
      }).join('');
    }
    A.addEventListener('change', paint); B.addEventListener('change', paint); document.addEventListener('btcprice', paint); paint();
  });




  /* ---- Saylor quote library: search, theme/source filters, random ---- */
  var ql = $('[data-qlib]');
  if (ql) {
    var qsI = $('[data-q-search]'), qcnt = $('[data-q-count]'), qempty = $('[data-q-empty]'), fth = 'all', fty = 'all';
    var qcards = $$('.quote', ql), qmore = $('[data-q-more]');
    var unclamp = function () { ql.classList.remove('clamped'); if (qmore) qmore.hidden = true; };
    if (qmore) qmore.addEventListener('click', unclamp);
    if (location.hash && /^#q-\d+$/.test(location.hash)) unclamp();
    var applyQ = function () {
      unclamp();
      var term = (qsI.value || '').trim().toLowerCase(), n = 0;
      qcards.forEach(function (c) {
        var ok = (fth === 'all' || c.dataset.theme === fth) && (fty === 'all' || c.dataset.type === fty) && (!term || c.textContent.toLowerCase().indexOf(term) >= 0);
        c.hidden = !ok; if (ok) n++;
      });
      qcnt.textContent = n + (n === 1 ? ' quote' : ' quotes'); qempty.hidden = n > 0;
    };
    var chipSet = function (attr, set) { $$('[' + attr + ']').forEach(function (c) { c.addEventListener('click', function () {
      $$('[' + attr + ']').forEach(function (x) { x.classList.toggle('on', x === c); }); set(c.getAttribute(attr)); applyQ(); }); }); };
    chipSet('data-q-theme', function (v) { fth = v; }); chipSet('data-q-type', function (v) { fty = v; });
    qsI.addEventListener('input', applyQ);
    $('[data-q-random]').addEventListener('click', function () {
      unclamp(); var vis = qcards.filter(function (c) { return !c.hidden; }); if (!vis.length) return;
      var c = vis[Math.floor(Math.random() * vis.length)];
      qcards.forEach(function (x) { x.classList.remove('flash'); });
      c.scrollIntoView({ behavior: 'smooth', block: 'center' }); void c.offsetWidth; c.classList.add('flash');
    });
    if (location.hash && /^#q-\d+$/.test(location.hash)) { var t = $(location.hash); if (t) { t.classList.add('flash'); } }
  }

  /* ---- Saylor appearances: tabs (mobile), type filter, show all ---- */
  var aw = $('[data-apt-wrap]');
  if (aw) {
    var tabs = $$('[data-apt-tab]', aw), panels = $$('[data-apt-panel]', aw), recl = $('[data-apt-rec]', aw), moreB = $('[data-apt-more]', aw);
    tabs.forEach(function (t) { t.addEventListener('click', function () {
      tabs.forEach(function (x) { var on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); });
      panels.forEach(function (p) { p.classList.toggle('on', p.dataset.aptPanel === t.dataset.aptTab); });
    }); });
    $$('[data-af]', aw).forEach(function (c) { c.addEventListener('click', function () {
      var v = c.dataset.af; $$('[data-af]', aw).forEach(function (x) { x.classList.toggle('on', x === c); });
      $$('.apt', recl).forEach(function (it) { it.hidden = !(v === 'all' || it.dataset.kind === v); });
      if (v !== 'all') { recl.classList.remove('clamped'); if (moreB) moreB.hidden = true; }
    }); });
    if (moreB) moreB.addEventListener('click', function () { recl.classList.remove('clamped'); moreB.hidden = true; });
  }

  /* ---- Treasury Math Lab ---- */
  var labCfgEl = $('[data-lab-cfg]');
  if (labCfgEl) {
    var CO = JSON.parse(labCfgEl.textContent);
    var mbox = $('[data-lab="mnav"]');
    if (mbox) {
      var mc = $('[data-lab-co]', mbox), mpx = $('[data-lab-px]', mbox), mbtc = $('[data-lab-btc]', mbox), note = $('[data-lab-note]', mbox);
      var setCo = function () { var c = CO[mc.value]; mpx.value = c.px; note.textContent = 'Prefilled price: ' + c.px_note + '. Type the live price from the TradingView quote above. Shares: ' + c.shares_note + '. BTC held: ' + num(c.btc) + '.'; paintM(); };
      var paintM = function () {
        var c = CO[mc.value], p = parseFloat(mpx.value), b = parseFloat(mbtc.value) || BTC.price, o = function (k, v) { $('[data-o="' + k + '"]', mbox).textContent = v; };
        if (!p || !b) { o('mnav', 'n/a'); return; }
        var mcap = p * c.shares, nav = c.btc * b, m = mcap / nav;
        o('mnav', m.toFixed(2) + 'x'); o('prem', (m >= 1 ? '+' : '') + ((m - 1) * 100).toFixed(1) + '% ' + (m >= 1 ? 'premium' : 'discount'));
        o('implied', usd(mcap / c.btc)); o('navps', usd(c.btc / c.shares * b, 2));
        var mm = $('[data-m-mnav]'); if (mm && !mm.dataset.touched) { mm.value = m.toFixed(2); mm.dispatchEvent(new Event('input')); }
      };
      mc.addEventListener('change', setCo); [mpx, mbtc].forEach(function (x) { x.addEventListener('input', paintM); });
      document.addEventListener('btcprice', function () { if (!mbtc.value) mbtc.placeholder = 'live ' + usd(BTC.price); paintM(); });
      setCo();
    }
    var mo = $('[data-lab="months"]');
    if (mo) {
      var mi = $('[data-m-mnav]', mo), yi = $('[data-m-yield]', mo), out = $('[data-m-out]', mo);
      var paintMo = function () {
        var m = parseFloat(mi.value), y = parseFloat(yi.value);
        if (!(m > 1)) { out.textContent = 'mNAV is at or below 1: there is no premium to cover. Strategy\u2019s official mNAV (enterprise-value based) is ' + (CO.MSTR.official_mnav || 'n/a') + '; type it in to compare.'; return; }
        if (!(y > 0)) { out.textContent = 'With a zero or negative BTC Yield, the premium is never covered (not meaningful).'; return; }
        var months = (m - 1) / (y / 100 / 12);
        out.innerHTML = 'Premium <b>' + ((m - 1) * 100).toFixed(1) + '%</b> ÷ monthly BTC Yield <b>' + (y / 12).toFixed(2) + '%</b> ≈ <b>' + months.toFixed(1) + ' months</b> (' + (months / 12).toFixed(1) + ' years).';
      };
      mi.addEventListener('input', function (ev) { if (ev.isTrusted) mi.dataset.touched = '1'; paintMo(); }); yi.addEventListener('input', paintMo); paintMo();
    }
    var sc = $('[data-lab="scenario"]');
    if (sc) {
      var sb = $('[data-s-btc]', sc), sm = $('[data-s-mnav]', sc), sbo = $('[data-s-btc-o]', sc), smo = $('[data-s-mnav-o]', sc), body2 = $('[data-s-body]', sc), init = false;
      var paintS = function () {
        var b = parseFloat(sb.value), m = parseFloat(sm.value); sbo.textContent = usd(b); smo.textContent = m.toFixed(2) + 'x';
        body2.innerHTML = ['MSTR', 'ASST'].map(function (k) { var c = CO[k], bps = c.btc / c.shares, nav = bps * b;
          return '<tr><th scope="row">' + k + ' · ' + c.name + '</th><td class="num">' + bps.toFixed(6) + '</td><td class="num">' + usd(nav, 2) + '</td><td class="num"><b>' + usd(nav * m, 2) + '</b></td></tr>'; }).join('');
      };
      sb.value = 100000; sb.addEventListener('input', paintS); sm.addEventListener('input', paintS);
      document.addEventListener('btcprice', function () { if (!init && BTC.price) { init = true; sb.value = Math.round(BTC.price / 1000) * 1000; paintS(); } });
      paintS();
    }
  }

  /* ---- Newsletter (provider-agnostic) ---- */
  $$('[data-newsletter]').forEach(function (form) {
    var msg = $('.nl-msg', form);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = form.querySelector('input[type=email]');
      if (!email.value || !email.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; email.focus(); return; }
      if (!DESK_CONFIG.newsletterAction) { msg.textContent = 'Signups open soon. Nothing was stored or sent. Check back shortly, or follow us on YouTube and X.'; return; }
      var fd = new FormData(); fd.append(DESK_CONFIG.newsletterEmailField, email.value);
      var opt = form.querySelector('[name=products_optin]'); if (opt && opt.checked) fd.append('products_optin', 'yes');
      msg.textContent = 'Sending…';
      fetch(DESK_CONFIG.newsletterAction, { method: 'POST', body: fd, mode: 'no-cors' })
        .then(function () { msg.textContent = 'Thanks! Check your inbox to confirm, then your Desk Library is on its way.'; form.reset(); })
        .catch(function () { msg.textContent = 'Something went wrong. Please try again later.'; });
    });
  });
})();
