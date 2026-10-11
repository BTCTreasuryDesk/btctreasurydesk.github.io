/* BTC Treasury Desk — live desk v2. All client-side: TradingView widgets, CoinGecko, alternative.me,
   plus the weekly data files /assets/data/desk.json and /assets/data/btc_daily.json. No AI per visit. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
             set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var REFRESH_MS = 90 * 1000;
  var fmt = function (n, d) { return n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var usd = function (n, d) { return n == null || isNaN(n) ? '—' : '$' + fmt(n, d); };
  var big = function (n) { if (n == null || isNaN(n)) return '—'; var a = Math.abs(n), s = n < 0 ? '−' : '';
    return a >= 1e12 ? s + '$' + (a / 1e12).toFixed(2) + 'T' : a >= 1e9 ? s + '$' + (a / 1e9).toFixed(2) + 'B' : a >= 1e6 ? s + '$' + (a / 1e6).toFixed(1) + 'M' : s + '$' + fmt(a); };
  var pct = function (n, d) { return n == null || isNaN(n) ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d == null ? 2 : d) + '%'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var dateLbl = function (iso) { var p = iso.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0]; };

  /* in-place updates with a soft flash */
  function setLive(sel, text, num, signed) {
    $$('[data-live="' + sel + '"]').forEach(function (el) {
      var prev = el.dataset.v != null ? +el.dataset.v : null;
      if (el.textContent === text) return;
      el.textContent = text;
      if (signed) { el.classList.toggle('up', num > 0); el.classList.toggle('dn', num < 0); }
      if (num != null && prev != null && !isNaN(prev) && num !== prev) {
        var c = num > prev ? 'flash-up' : 'flash-dn'; el.classList.add(c);
        setTimeout(function () { el.classList.remove(c); }, 1600);
      }
      if (num != null) el.dataset.v = num;
    });
  }
  function setK(k, html) { $$('[data-k="' + k + '"]').forEach(function (el) { el.innerHTML = html; }); }
  function setBar(k, w) { $$('[data-live-bar="' + k + '"]').forEach(function (el) { el.style.width = Math.max(0, Math.min(100, w)) + '%'; }); }

  /* fetch JSON with localStorage cache + graceful fallback */
  function getJSON(url, key, maxAgeMs) {
    var c = null; try { c = JSON.parse(LS.get('btd:' + key) || 'null'); } catch (e) {}
    if (c && Date.now() - c.t < (maxAgeMs || 0)) return Promise.resolve(c.d);
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { LS.set('btd:' + key, JSON.stringify({ t: Date.now(), d: d })); return d; })
      .catch(function (e) { if (c) return c.d; throw e; });
  }

  /* ---------- TradingView embeds ---------- */
  function tv(el, widget, cfg) {
    el.innerHTML = '';
    var box = document.createElement('div'); box.className = 'tradingview-widget-container'; box.style.height = '100%'; box.style.width = '100%';
    var w = document.createElement('div'); w.className = 'tradingview-widget-container__widget'; w.style.height = '100%';
    box.appendChild(w);
    var s = document.createElement('script'); s.type = 'text/javascript'; s.async = true;
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-' + widget + '.js';
    s.textContent = JSON.stringify(cfg); box.appendChild(s); el.appendChild(box);
  }
  $$('[data-tvq]').forEach(function (el) {
    tv(el, 'single-quote', { symbol: el.dataset.tvq, width: '100%', colorTheme: 'dark', isTransparent: true, locale: 'en' });
  });

  var CHARTS = [
    { n: 'BTC', s: 'BITSTAMP:BTCUSD' },
    { n: 'MSTR', s: 'NASDAQ:MSTR' },
    { n: 'ASST', s: 'NASDAQ:ASST' },
    { n: 'MSTR vs BTC', s: 'NASDAQ:MSTR', cmp: 'BITSTAMP:BTCUSD' },
    { n: 'STRC', s: 'NASDAQ:STRC' }
  ];
  var cs = { i: 0, style: '1', iv: 'D' };
  var tabs = $('[data-chart-tabs]');
  if (tabs) tabs.innerHTML = CHARTS.map(function (c, i) { return '<button data-ci="' + i + '">' + esc(c.n) + '</button>'; }).join('');
  function drawChart() {
    var c = CHARTS[cs.i], box = $('[data-chart]'); if (!box) return;
    var cfg = { autosize: true, symbol: c.s, interval: cs.iv, timezone: 'America/New_York', theme: 'dark', style: c.cmp ? '2' : cs.style,
      locale: 'en', hide_side_toolbar: true, allow_symbol_change: false, save_image: false, calendar: false, hide_volume: !!c.cmp,
      backgroundColor: 'rgba(0,0,0,1)', gridColor: 'rgba(30,35,43,0.5)', support_host: 'https://www.tradingview.com' };
    if (c.cmp) cfg.compareSymbols = [{ symbol: c.cmp, position: 'SameScale' }];
    tv(box, 'advanced-chart', cfg);
    $('[data-chart-name]').textContent = c.n;
    $$('[data-ci]').forEach(function (b) { b.classList.toggle('on', +b.dataset.ci === cs.i); });
  }
  function step(d) { cs.i = (cs.i + d + CHARTS.length) % CHARTS.length; drawChart(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ci != null) { cs.i = +b.dataset.ci; drawChart(); }
    else if (b.hasAttribute('data-prev')) step(-1);
    else if (b.hasAttribute('data-next')) step(1);
    else if (b.dataset.style) { cs.style = b.dataset.style; $$('[data-style]').forEach(function (x) { x.classList.toggle('on', x === b); }); drawChart(); }
    else if (b.dataset.iv) { cs.iv = b.dataset.iv; $$('[data-iv]').forEach(function (x) { x.classList.toggle('on', x === b); }); drawChart(); }
  });
  document.addEventListener('keydown', function (e) {
    if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Escape' && document.body.classList.contains('dm')) exitDM();
  });
  drawChart();

  /* ---------- weekly data file ---------- */
  var DESK = null, live = { btc: null };
  function nyToday() { var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return p; }
  function daysSince(iso) { return Math.max(0, Math.round((Date.parse(nyToday()) - Date.parse(iso)) / 864e5)); }
  fetch('/assets/data/desk.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    DESK = d; var s = d.strategy, st = d.strive, ep = d.episode, v = d.video_of_week;
    setK('mstr-btc', fmt(s.btc_held)); setK('asst-btc', fmt(st.btc_held));
    setK('mnav', s.mnav.toFixed(2) + 'x'); setK('bps', fmt(s.sats_per_share) + ' <small>sats</small>');
    setK('mstr-days', daysSince(s.last_buy_reported) + ' <small>(+' + fmt(s.last_buy_btc) + ' BTC, ' + dateLbl(s.last_buy_reported).replace(/, \d+$/, '') + ')</small>');
    setK('asst-days', daysSince(st.last_buy_reported) + ' <small>(+' + fmt(st.last_buy_btc) + ' BTC)</small>');
    setK('mstr-cost', usd(s.avg_cost));
    $('[data-strat-asof]').textContent = 'as of ' + dateLbl(s.btc_as_of);
    $('[data-strat-src]').innerHTML = 'BTC held: <a href="' + esc(s.btc_src.url) + '" target="_blank" rel="noopener">' + esc(s.btc_src.name) + '</a> (holdings as of ' + dateLbl(s.btc_as_of) + '). mNAV and BTC/share: <a href="' + esc(s.kpi_src.url) + '" target="_blank" rel="noopener">' + esc(s.kpi_src.name) + '</a>, ' + esc(s.kpi_as_of) + '. Strive: <a href="' + esc(st.btc_src.url) + '" target="_blank" rel="noopener">' + esc(st.btc_src.name) + '</a>. Preferred prices: Fri close. Refreshed weekly.';
    $('[data-prefs] tbody').innerHTML = d.preferreds.map(function (p) {
      return '<tr><td><a href="' + esc(p.src.url) + '" target="_blank" rel="noopener" title="' + esc(p.src.name + ' · ' + p.pay) + '">' + esc(p.t) + '</a></td><td>' + p.rate.toFixed(2) + '%</td><td>$' + p.price.toFixed(2) + '</td><td>' + (p.rate * 100 / p.price).toFixed(2) + '%</td></tr>';
    }).join('');
    // episode
    $('[data-ep-title]').textContent = ep.title; $('[data-ep-date]').textContent = 'Ep. ' + ep.n + ' · ' + dateLbl(ep.date) + ' · ' + ep.length;
    $('[data-ep-link]').href = ep.url; $('[data-ep-watch]').href = ep.url; $('[data-ep-img]').src = 'https://i.ytimg.com/vi/' + ep.id + '/hqdefault.jpg';
    $('[data-ep-img]').alt = 'Thumbnail: ' + ep.title;
    var dmy = $('[data-dm-yt]'); if (dmy) { dmy.href = ep.url; dmy.lastChild.textContent = ' Watch Ep. ' + ep.n + ' on YouTube'; }
    $('[data-shorts]').innerHTML = (ep.shorts || []).map(function (x) { return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">Short: ' + esc(x.t) + '</a>'; }).join('');
    $('[data-votw]').href = v.url; $('[data-votw-img]').src = 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg';
    $('[data-votw-title]').textContent = v.title; $('[data-votw-meta]').textContent = v.channel + ' · ' + dateLbl(v.date) + ' · official upload';
    // board
    var tot = d.treasuries.rows.reduce(function (a, r) { return a + r.btc; }, 0), mx = d.treasuries.rows[0].btc;
    $('[data-board] tbody').innerHTML = d.treasuries.rows.map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + esc(r.name) + ' <span class="muted">' + esc(r.tk) + '</span></td><td class="r">' + fmt(r.btc) + '</td><td><span class="sbar" style="width:' + Math.max(1, Math.round(40 * r.btc / mx)) + 'px"></span>' + (100 * r.btc / tot).toFixed(1) + '%</td></tr>';
    }).join('');
    $('[data-board-src]').innerHTML = 'Holdings: <a href="' + esc(d.treasuries.src.url) + '" target="_blank" rel="noopener">' + esc(d.treasuries.src.name) + '</a>, as of ' + dateLbl(d.treasuries.as_of) + '. Share = of the top-10 total. Prices: TradingView.';
    var q = $('[data-tv-quotes]'); if (q) tv(q, 'market-quotes', { width: '100%', height: '100%', isTransparent: true, colorTheme: 'dark', locale: 'en', showSymbolLogo: true,
      symbolsGroups: [{ name: 'Top 10', symbols: d.treasuries.rows.map(function (r) { return { name: r.tv, displayName: r.name }; }) }] });
    $('[data-week]').innerHTML = d.week_ahead.map(function (w) { return '<li><b>' + esc(w.d) + '</b><span>' + esc(w.e) + '</span></li>'; }).join('');
    paintStrategyLive(); models();
  }).catch(function (e) { console.warn('desk.json unavailable', e); });

  function paintStrategyLive() {
    if (!DESK || !live.btc) return; var s = DESK.strategy;
    var val = s.btc_held * live.btc, pl = (live.btc / s.avg_cost - 1) * 100;
    setLive('mstr-val', big(val), val); setLive('mstr-pl', pct(pl, 1), pl, true);
  }

  /* ---------- live market data (CoinGecko, fallback Coinbase) ---------- */
  var CG = 'https://api.coingecko.com/api/v3';
  function coinbaseSpot(sym) { return fetch('https://api.coinbase.com/v2/prices/' + sym + '-USD/spot').then(function (r) { return r.json(); }).then(function (j) { return +j.data.amount; }); }
  function pullPrices() {
    return getJSON(CG + '/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', 'px', 45e3)
      .then(function (p) { return { btc: p.bitcoin.usd, btc24: p.bitcoin.usd_24h_change, eth: p.ethereum.usd, sol: p.solana.usd, src: 'CoinGecko' }; })
      .catch(function () { return Promise.all([coinbaseSpot('BTC'), coinbaseSpot('ETH'), coinbaseSpot('SOL')]).then(function (a) { return { btc: a[0], btc24: null, eth: a[1], sol: a[2], src: 'Coinbase' }; }); });
  }
  function refreshMarket() {
    pullPrices().then(function (p) {
      live.btc = p.btc;
      setLive('btc', usd(p.btc), p.btc); setLive('btc-24h', p.btc24 == null ? '—' : pct(p.btc24), p.btc24, true);
      setLive('btceth', (p.btc / p.eth).toFixed(2) + ' ETH', p.btc / p.eth); setLive('btcsol', fmt(p.btc / p.sol, 1) + ' SOL', p.btc / p.sol);
      setLive('sats', fmt(1e8 / p.btc) + ' sats', 1e8 / p.btc);
      var a = $('[data-field-asof]'); if (a) a.textContent = p.src + ' · ' + new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
      paintStrategyLive(); models(); ticker();
    }).catch(function () { setLive('btc', 'unavailable', null); });
    getJSON(CG + '/global', 'global', 5 * 60e3).then(function (g) {
      var dom = g.data.market_cap_percentage.btc; setLive('dom', dom.toFixed(1) + '%', +dom.toFixed(2)); setBar('dom', dom); live.dom = dom; ticker();
    }).catch(function () { setLive('dom', '—', null); });
    getJSON('https://api.alternative.me/fng/?limit=31', 'fng', 30 * 60e3).then(function (f) {
      var d = f.data, v = +d[0].value; setLive('fng', String(v), v); setLive('fng-cls', d[0].value_classification, null); setBar('fng', v);
      setLive('fng-hist', [d[1], d[7], d[30]].map(function (x) { return x ? x.value : '—'; }).join(' · '), null); live.fng = v + ' ' + d[0].value_classification; ticker();
    }).catch(function () { setLive('fng', '—', null); });
  }
  refreshMarket(); setInterval(refreshMarket, REFRESH_MS);

  /* ---------- Bitcoin models (client-side) ---------- */
  var HIST = null;
  fetch('/assets/data/btc_daily.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (h) { HIST = h; models(); }).catch(function (e) { console.warn('btc_daily.json unavailable', e); });
  var GEN = Date.UTC(2009, 0, 3);
  var HALV = [[Date.UTC(2012, 10, 28), 10.5e6, 25], [Date.UTC(2016, 6, 9), 15.75e6, 12.5], [Date.UTC(2020, 4, 11), 18.375e6, 6.25], [Date.UTC(2024, 3, 20), 19.6875e6, 3.125]];
  function s2f(t) { var h = HALV[0]; for (var i = 0; i < HALV.length; i++) if (t >= HALV[i][0]) h = HALV[i];
    var supply = h[1] + (t - h[0]) / 864e5 * 144 * h[2], flow = 144 * 365 * h[2]; return Math.exp(-1.84) * Math.pow(supply / flow, 3.36); }
  function plaw(t) { return 1.0117e-17 * Math.pow((t - GEN) / 864e5, 5.82); }
  function sma(a, n, end) { if (end + 1 < n) return null; var s = 0; for (var i = end - n + 1; i <= end; i++) s += a[i]; return s / n; }
  function pctile(arr, v) { var c = 0, n = 0; arr.forEach(function (x) { if (x != null && isFinite(x)) { n++; if (x <= v) c++; } }); return n ? 100 * c / n : null; }
  function zone(p) { return p == null ? '' : p < 20 ? '<span class="zone z-cool">Historically cool</span>' : p > 80 ? '<span class="zone z-hot">Historically hot</span>' : '<span class="zone z-neu">Mid-range</span>'; }
  var modelsKey = '';
  function models() {
    if (!HIST) return;
    var t0 = Date.parse(HIST.start + 'T00:00:00Z'), c = HIST.closes.slice(), today = Date.parse(nyToday() + 'T00:00:00Z');
    var lastT = t0 + (c.length - 1) * 864e5;
    if (live.btc) { if (today > lastT) { c.push(live.btc); } else c[c.length - 1] = live.btc; }
    var n = c.length, T = function (i) { return t0 + i * 864e5; }, last = n - 1, px = c[last];
    var key = n + ':' + Math.round(px); if (key === modelsKey) return; modelsKey = key;
    // series
    var wma = new Array(n), m111 = new Array(n), m350 = new Array(n), m200 = new Array(n), pl = new Array(n);
    for (var i = 0; i < n; i++) {
      m111[i] = sma(c, 111, i); var x = sma(c, 350, i); m350[i] = x ? 2 * x : null; m200[i] = sma(c, 200, i); pl[i] = plaw(T(i));
      if (i >= 1399) { var s = 0; for (var k = 0; k < 200; k++) s += c[i - k * 7]; wma[i] = s / 200; } else wma[i] = null;
    }
    var rWma = c.map(function (v, i) { return wma[i] ? v / wma[i] : null; }), rMay = c.map(function (v, i) { return m200[i] ? v / m200[i] : null; }),
        rPi = c.map(function (v, i) { return m350[i] ? m111[i] / m350[i] : null; }), rPl = c.map(function (v, i) { return v / pl[i]; }),
        rS2f = c.map(function (v, i) { return v / s2f(T(i)); });
    var realized = DESK && DESK.onchain ? DESK.onchain.realized_price : null, mvrv = realized ? px / realized : null;
    var rows = [
      ['Power Law trend', usd(pl[last]), rPl[last].toFixed(2) + 'x', pctile(rPl, rPl[last]), 'https://charts.bitbo.io/long-term-power-law/'],
      ['200-week MA', usd(wma[last]), rWma[last].toFixed(2) + 'x', pctile(rWma, rWma[last]), 'https://charts.blockhorizon.io/charts/pb-200wma'],
      ['Mayer Multiple (200D)', usd(m200[last]), rMay[last].toFixed(2) + 'x', pctile(rMay, rMay[last]), 'https://charts.checkonchain.com/'],
      ['Pi Cycle Top (111D / 2×350D)', usd(m111[last]) + ' / ' + usd(m350[last]), '111D at ' + (rPi[last] * 100).toFixed(0) + '% of 2×350D', null, 'https://www.lookintobitcoin.com/charts/pi-cycle-top-indicator/'],
      ['MVRV (price / realized)', realized ? usd(realized) : '—', mvrv ? mvrv.toFixed(2) + 'x' : '—', null, 'https://www.lookintobitcoin.com/charts/mvrv-zscore/'],
      ['Stock-to-Flow (PlanB)', usd(s2f(T(last))), rS2f[last].toFixed(2) + 'x', pctile(rS2f, rS2f[last]), 'https://charts.blockhorizon.io/charts/pb-s2f']
    ];
    var piZone = rPi[last] >= 1 ? '<span class="zone z-hot">Crossed: historic top signal</span>' : rPi[last] > 0.9 ? '<span class="zone z-hot">Nearing cross</span>' : '<span class="zone z-neu">No cross</span>';
    var mvZone = mvrv == null ? '' : mvrv < 1 ? '<span class="zone z-cool">Below realized</span>' : mvrv > 3 ? '<span class="zone z-hot">Overheated range</span>' : '<span class="zone z-neu">Mid-range</span>';
    $('[data-models] tbody').innerHTML = rows.map(function (r, i) {
      var z = i === 3 ? piZone : i === 4 ? mvZone : zone(r[3]) + (r[3] != null ? ' <small class="muted">' + r[3].toFixed(0) + 'th pct</small>' : '');
      return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + z + '</td><td><a href="' + r[4] + '" target="_blank" rel="noopener">source&#8599;</a></td></tr>';
    }).join('');
    // Model Zones panel: each model scored cool (-1) / mid (0) / hot (+1)
    var zc = function (p) { return p == null ? null : p < 20 ? -1 : p > 80 ? 1 : 0; };
    var mz = [
      ['Power Law', zc(rows[0][3]), rPl[last].toFixed(2) + 'x trend'],
      ['200-week MA', zc(rows[1][3]), rWma[last].toFixed(2) + 'x'],
      ['Mayer Multiple', zc(rows[2][3]), rMay[last].toFixed(2) + 'x'],
      ['Pi Cycle', rPi[last] > 0.9 ? 1 : 0, (rPi[last] >= 1 ? 'crossed' : rPi[last] > 0.9 ? 'nearing cross' : 'no cross') + ' · ' + (rPi[last] * 100).toFixed(0) + '%'],
      ['MVRV', mvrv == null ? null : mvrv < 1 ? -1 : mvrv > 3 ? 1 : 0, mvrv ? mvrv.toFixed(2) + 'x' : 'n/a'],
      ['Stock-to-Flow', zc(rows[5][3]), rS2f[last].toFixed(2) + 'x model']
    ];
    var ZL = { '-1': ['Historically cool', 'z-cool'], '0': ['Mid-range', 'z-neu'], '1': ['Historically hot', 'z-hot'] };
    var got = mz.filter(function (m) { return m[1] != null; }), sc = got.reduce(function (a, m) { return a + m[1]; }, 0) / (got.length || 1);
    var ov = sc <= -0.34 ? '-1' : sc >= 0.34 ? '1' : '0', ovEl = $('[data-mz-overall]');
    if (ovEl) {
      ovEl.textContent = ZL[ov][0]; ovEl.className = 'mz-v ' + ZL[ov][1];
      var cnt = { '-1': 0, '0': 0, '1': 0 }; got.forEach(function (m) { cnt[m[1]]++; });
      $('[data-mz-sub]').textContent = cnt['-1'] + ' cool · ' + cnt['0'] + ' mid · ' + cnt['1'] + ' hot of ' + got.length + ' models';
      $('[data-mz-dot]').style.left = Math.round((sc + 1) * 50) + '%';
      $('[data-mz-list]').innerHTML = mz.map(function (m) {
        var z = m[1] == null ? ['No data', 'z-na'] : ZL[String(m[1])];
        return '<li><span>' + esc(m[0]) + '</span><small class="mono muted">' + esc(m[2]) + '</small><span class="zone ' + z[1] + '">' + z[0] + '</span></li>';
      }).join('');
    }
    $('[data-models-asof]').textContent = 'BTC ' + usd(px) + ' · history to ' + HIST.as_of;
    // yearly returns
    var yr = {}, firstYear = new Date(t0).getUTCFullYear();
    for (i = 0; i < n; i++) { var y = new Date(T(i)).getUTCFullYear(); if (!yr[y]) yr[y] = { o: i ? c[i - 1] : c[0], c: c[i] }; yr[y].c = c[i]; }
    $('[data-yearly]').innerHTML = Object.keys(yr).filter(function (y) { return +y > firstYear; }).map(function (y) {
      var r = (yr[y].c / yr[y].o - 1) * 100; return '<div><small>' + y + (+y === new Date(today).getUTCFullYear() ? ' YTD' : '') + '</small><span class="' + (r >= 0 ? 'up' : 'dn') + '">' + pct(r, 0) + '</span></div>';
    }).join('');
    drawModelChart(c, wma, pl, m350, m111, T);
  }
  function drawModelChart(c, wma, pl, m350, m111, T) {
    var cv = $('[data-model-chart]'); if (!cv) return; var dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 900, H = Math.round(W / 3);
    cv.width = W * dpr; cv.height = H * dpr; var g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    var n = c.length, lo = Math.log10(150), hi = Math.log10(Math.max.apply(null, c) * 3.2), pad = { l: 44, r: 8, t: 8, b: 18 };
    var X = function (i) { return pad.l + (W - pad.l - pad.r) * i / (n - 1); }, Y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - (Math.log10(v) - lo) / (hi - lo)); };
    g.font = '10px ui-monospace,monospace'; g.fillStyle = '#5d6672'; g.strokeStyle = '#161a20'; g.lineWidth = 1;
    [1e3, 1e4, 1e5, 1e6].forEach(function (v) { if (Math.log10(v) > hi) return; var y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke(); g.fillText(v >= 1e6 ? '$1M' : '$' + v / 1e3 + 'k', 4, y + 3); });
    for (var y0 = 2016; y0 <= 2026; y0 += 2) { var i0 = Math.round((Date.UTC(y0, 0, 1) - T(0)) / 864e5); g.fillText(String(y0), X(i0) - 12, H - 4); }
    function line(a, col, w, dash) { g.beginPath(); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); var st = false;
      for (var i = 0; i < n; i += 2) { var v = a[i]; if (v == null || v <= 0) { st = false; continue; } var x = X(i), y = Y(v); if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); }
      g.stroke(); g.setLineDash([]); }
    line(pl, '#F7931A', 1.2, [4, 3]); line(m350, '#ff5a5f', 1, [2, 3]); line(m111, 'rgba(255,90,95,.45)', 1); line(wma, '#2fd17c', 1.4); line(c, '#e6e9ee', 1.1);
    var lx = X(n - 1), ly = Y(c[n - 1]); g.fillStyle = '#F7931A'; g.beginPath(); g.arc(lx, ly, 3, 0, 7); g.fill();
  }
  window.addEventListener('resize', function () { modelsKey = ''; models(); });

  /* ---------- alts (collapsed, loaded on open) ---------- */
  var alts = $('[data-alts]');
  if (alts) alts.addEventListener('toggle', function () {
    if (!alts.open) return;
    getJSON(CG + '/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,ripple,binancecoin,solana,dogecoin,cardano,tron,chainlink,litecoin&order=market_cap_desc&price_change_percentage=24h,30d', 'alts', 10 * 60e3).then(function (a) {
      var b = a.filter(function (x) { return x.id === 'bitcoin'; })[0], b30 = b ? b.price_change_percentage_30d_in_currency : 0;
      $('[data-alts-tbl] tbody').innerHTML = a.filter(function (x) { return x.id !== 'bitcoin'; }).map(function (x, i) {
        var v = ((1 + x.price_change_percentage_30d_in_currency / 100) / (1 + b30 / 100) - 1) * 100;
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(x.name) + ' <span class="muted">' + esc(x.symbol.toUpperCase()) + '</span></td><td class="r">' + usd(x.current_price, x.current_price < 10 ? 3 : 2) + '</td><td class="r ' + (x.price_change_percentage_24h >= 0 ? 'up' : 'dn') + '">' + pct(x.price_change_percentage_24h) + '</td><td class="r">' + big(x.market_cap) + '</td><td class="r ' + (v >= 0 ? 'up' : 'dn') + '">' + pct(v, 1) + '</td></tr>';
      }).join('');
    }).catch(function () { $('[data-alts-tbl] tbody').innerHTML = '<tr><td colspan="6" class="muted">Unavailable right now. Try again in a minute.</td></tr>'; });
  });

  /* ---------- market clock (NYSE/Nasdaq, ET) ---------- */
  var HOL = ['2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25',
             '2027-01-01','2027-01-18','2027-02-15','2027-03-26','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-11-25','2027-12-24'];
  var EARLY = ['2026-11-27','2026-12-24','2027-11-26'];
  function nyWall() { var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; }); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function clock() {
    var now = nyWall(), day0 = now - now % 864e5, st = null, nxt = null, lbl = '';
    for (var d = 0; d < 8 && !nxt; d++) {
      var D = day0 + d * 864e5, wd = new Date(D).getUTCDay(); if (wd === 0 || wd === 6 || HOL.indexOf(iso(D)) >= 0) continue;
      var cl = EARLY.indexOf(iso(D)) >= 0 ? 13 : 16, H = function (h, m) { return D + (h * 60 + (m || 0)) * 6e4; };
      var seg = [[H(4), H(9, 30), 'pre', 'Pre-market', 'opens'], [H(9, 30), H(cl), 'open', 'Market open', 'closes'], [H(cl), H(20), 'post', 'After hours', 'ends']];
      for (var k = 0; k < seg.length; k++) {
        if (now >= seg[k][0] && now < seg[k][1]) { st = seg[k]; nxt = seg[k][1]; lbl = seg[k][4] + ' in '; break; }
        if (now < seg[k][0]) { nxt = seg[k][0]; lbl = (k === 0 ? 'Pre-market in ' : k === 1 ? 'Opens in ' : 'After hours in '); if (k === 0 && seg[1]) { nxt = seg[1][0]; lbl = 'Opens in '; } break; }
      }
    }
    var el = $('[data-clock]'); if (!el) return;
    el.className = 'clock mono ' + (st ? st[2] : 'closed');
    $('[data-mkt]').textContent = st ? st[3] : 'Market closed';
    var s = Math.max(0, Math.round((nxt - now) / 1e3)), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    $('[data-mkt-cd]').textContent = nxt ? lbl + (hh >= 24 ? Math.floor(hh / 24) + 'd ' + (hh % 24) + 'h' : hh + 'h ' + String(mm).padStart(2, '0') + 'm ' + String(ss).padStart(2, '0') + 's') : '';
    $('[data-ny]').textContent = new Date(now).toISOString().slice(11, 16) + ' ET';
  }
  clock(); setInterval(clock, 1000);

  /* ---------- optional thin ticker (off by default) ---------- */
  var tk = $('[data-ticker]'), tkBtn = $('[data-ticker-toggle]');
  function ticker() {
    var inn = $('[data-ticker-in]'); if (!inn || tk.hidden) return;
    var items = [['BTC', live.btc ? usd(live.btc) : '—'], ['BTC.D', live.dom ? live.dom.toFixed(1) + '%' : '—'], ['F&G', live.fng || '—']];
    if (DESK) { items.push(['MSTR BTC', fmt(DESK.strategy.btc_held)], ['mNAV', DESK.strategy.mnav.toFixed(2) + 'x'], ['ASST BTC', fmt(DESK.strive.btc_held)]);
      DESK.preferreds.forEach(function (p) { items.push([p.t, (p.rate * 100 / p.price).toFixed(2) + '% yld']); }); }
    inn.innerHTML = items.map(function (x) { return '<b>' + esc(x[0]) + '</b>' + esc(x[1]); }).join('');
  }
  function setTicker(on) { tk.hidden = !on; tkBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); tkBtn.textContent = 'Ticker: ' + (on ? 'On' : 'Off'); LS.set('btd_ticker', on ? '1' : '0'); ticker(); }
  if (tk && tkBtn) { setTicker(LS.get('btd_ticker') === '1'); tkBtn.addEventListener('click', function () { setTicker(tk.hidden); }); }

  /* ---------- Desk Mode ---------- */
  var mmT = null, cycT = null;
  function enterDM() {
    document.body.classList.add('dm');
    var de = document.documentElement; if (de.requestFullscreen) de.requestFullscreen().catch(function () {});
    setTimeout(function () { modelsKey = ''; models(); }, 400);
  }
  function exitDM() {
    document.body.classList.remove('dm', 'mm'); setCycle(false);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setTimeout(function () { modelsKey = ''; models(); }, 400);
  }
  $$('[data-deskmode]').forEach(function (b) { b.addEventListener('click', enterDM); });
  $$('[data-deskmode-exit]').forEach(function (b) { b.addEventListener('click', exitDM); });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('dm')) exitDM(); });
  document.addEventListener('mousemove', function () {
    if (!document.body.classList.contains('dm')) return; document.body.classList.add('mm');
    clearTimeout(mmT); mmT = setTimeout(function () { document.body.classList.remove('mm'); }, 2500);
  });
  function setCycle(on) {
    $$('[data-autocycle]').forEach(function (x) { x.checked = on; });
    clearInterval(cycT); if (on) cycT = setInterval(function () { step(1); }, 45e3);
  }
  $$('[data-autocycle]').forEach(function (x) { x.addEventListener('change', function () { setCycle(x.checked); }); });
  if (/[?&]desk=1/.test(location.search)) document.body.classList.add('dm');
})();
