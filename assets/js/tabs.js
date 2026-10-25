/* BTC Treasury Desk: home information architecture (Oct 25, 2026).
   Lean Home (big footprint) + 7 tabs under the strip. Panels keep their own code; this file only assigns each panel to a tab,
   builds the Home "Desk board" (numbers, extended hours first) and the "Biggest movers" card, removes duplicate tiles, and
   keeps token panels from ever sitting empty. Saved: none needed (Home is always the landing view; #tab links deep-link). */
(function () {
  'use strict';
  var main = document.querySelector('main.grid'); if (!main) return;
  var F = window.BTD_FEED, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var TABS = [['home', 'Home'], ['markets', 'Markets'], ['companies', 'Companies'], ['strategy', 'Strategy'], ['crypto', 'Crypto'], ['charts', 'Charts'], ['calendar', 'Calendar & News'], ['show', 'Show']];
  /* panel -> tab (selector inside main) */
  var MAP = [['.p-tc', 'home'], ['[data-home-board]', 'home'], ['.p-hs', 'home'], ['[data-home-movers]', 'home'], ['.p-ep', 'home show'],
    ['.p-mk', 'markets'], ['.p-wl', 'companies'], ['.p-tboard', 'companies'], ['.p-kpi', 'strategy'], ['.p-yb', 'strategy show'],
    ['.p-cx', 'crypto'], ['.p-dv', 'crypto'], ['.p-tok', 'crypto markets'], ['.p-charts', 'charts'], ['[data-alerts]', 'charts'], ['.p-wall', 'charts'],
    ['.p-kd', 'calendar home'], ['.p-news', 'calendar'], ['.p-links', 'calendar'], ['.p-wcw', 'calendar'], ['.p-optin', 'show'], ['.p-movers', 'none'], ['.p-week', 'none'], ['[data-slow-h]', 'none'], ['.p-live', 'none']];
  function tag() { MAP.forEach(function (m) { $$(m[0], main).forEach(function (el) { if (el.parentNode === main) el.setAttribute('data-tabs', m[1]); }); }); }
  /* tab bar */
  var bar = document.createElement('nav'); bar.className = 'tabs'; bar.setAttribute('aria-label', 'Desk sections');
  bar.innerHTML = '<div class="tabs-in" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><a class="tabs-next mono" data-next href="#calendar" hidden></a>';
  main.parentNode.insertBefore(bar, main);
  var ANCH = { derivatives: 'crypto', tokenized: 'crypto', 'key-dates': 'calendar', board: 'companies', charts: 'charts', 'your-bitcoin': 'strategy', 'latest-episode': 'show', 'news-of-the-week': 'calendar', 'preferreds-desk': 'strategy', alerts: 'charts' };
  function cur() { var h = location.hash.replace('#', ''); if (TABS.some(function (t) { return t[0] === h; })) return h; return ANCH[h] || 'home'; }
  function show(t, scroll) { tag(); document.body.setAttribute('data-tab', t); $$('[data-tab]', bar).forEach(function (b) { var on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $$('main.grid > *', document).forEach(function (el) { var ts = (el.getAttribute('data-tabs') || 'none').split(' '); el.classList.toggle('tab-off', ts.indexOf(t) < 0); });
    window.dispatchEvent(new Event('resize')); if (scroll) { var a = $('.tabs-in .on', bar); if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'center' }); window.scrollTo({ top: Math.max(0, bar.offsetTop - 8), behavior: 'auto' }); } }
  bar.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; var t = b.dataset.tab; history.replaceState(null, '', t === 'home' ? location.pathname : '#' + t); show(t, 1); });
  window.addEventListener('hashchange', function () { show(cur(), 0); var id = location.hash.slice(1), el = id && document.getElementById(id); if (el && ANCH[id]) setTimeout(function () { el.scrollIntoView(); }, 50); });
  /* next key event chip (one place) */
  function nextChip() { var n = window.BTD_NEXTKD, a = $('[data-next]', bar); if (!n || !n.t) return; a.hidden = false; a.textContent = 'Next: ' + n.t + ' · ' + n.d; }
  setTimeout(nextChip, 1500); setTimeout(nextChip, 5000);

  /* ---------- Home: Desk board (numbers only; outside the regular session the extended-hours price leads, the regular close sits under it) ---------- */
  /* Market pulse: three even columns of 6 (no ragged ends). Rows always show (the old board hid whatever was on a chart, which left
     ETH/SOL alone). Row on a chart is highlighted; clicking a row loads it into the chart (crypto left, stocks right on desktop). */
  var GROUPS = [['Crypto · live 24/7', [['BTC', 'Bitcoin', 'c'], ['ETH', 'Ether', 'c'], ['SOL', 'Solana', 'c'], ['XRP', 'XRP', 'c'], ['DOGE', 'Dogecoin', 'c'], ['LINK', 'Chainlink', 'c']]],
    ['Bitcoin treasury stocks · your list', []],
    ['Markets & macro', [['.SPX', 'S&P 500', 'i', '@SP.1'], ['.IXIC', 'Nasdaq', 'i', '@ND.1'], ['.DJI', 'Dow', 'i', '@DJ.1'], ['US10Y', '10Y yield', 'y'], ['.DXY', 'Dollar (DXY)', 'i'], ['@GC.1', 'Gold', 'f']]]];
  var HIT = {}, DEF = ['MSTR', 'MPJPY', 'XXI', 'ASST', 'MARA', 'COIN'], NMS = { MSTR: 'Strategy', MPJPY: 'Metaplanet ADR', XXI: 'Twenty One', ASST: 'Strive', MARA: 'MARA Holdings', COIN: 'Coinbase' }, TRS = {}, EDIT = 0;
  var CRYPTO = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'LINK', 'ADA', 'AVAX', 'LTC', 'SUI', 'BCH', 'DOT', 'HBAR'];
  var MINE = (function () { try { var a = JSON.parse(localStorage.getItem('btd_hbs') || 'null'); if (Array.isArray(a) && a.length) return a.slice(0, 12); } catch (e) {} return DEF.slice(); })();
  function saveMine() { try { localStorage.setItem('btd_hbs', JSON.stringify(MINE)); } catch (e) {} }
  function stRows() { GROUPS[1][1] = MINE.map(function (t) { var r = TRS[t]; return [t, NMS[t] || (r && r.name) || '', CRYPTO.indexOf(t) >= 0 ? 'c' : 's']; }); }
  stRows();
  J('/assets/data/desk.json').then(function (j) { (j.treasuries.rows || []).forEach(function (r) { if (r.tk) TRS[r.tk] = r; }); stRows(); paintHB(); }).catch(function () {});
  var CHS = { '.SPX': 'SPX', '.IXIC': 'IXIC', '.DJI': 'DJI', '.DXY': 'DXY', '@GC.1': 'GOLD' };
  var hb = document.createElement('section'); hb.className = 'p p-hb'; hb.setAttribute('data-home-board', ''); hb.setAttribute('aria-label', 'Market pulse: crypto, bitcoin treasury stocks, markets and macro');
  hb.innerHTML = '<div class="p-h"><span class="p-t">Market pulse</span><span class="hb-ses mono" data-hb-ses></span><a class="more" href="#alerts">Alerts</a> <a class="more" href="#markets">All markets →</a></div><div class="hb-ctx mono" data-hb-ctx></div><div class="hb-ctx hb-lv mono" data-hb-lv hidden></div><div class="seg hb-tabs" role="tablist" aria-label="Market pulse group"><button type="button" data-hbt="1" class="on">BTC stocks</button><button type="button" data-hbt="0">Crypto</button><button type="button" data-hbt="2">Macro</button></div><div class="hb" data-hb data-hbg="1"></div><p class="p-f">Context strip: BTC dominance, total crypto market cap and 24h volume from Coinpaprika (every 5 min), BTC perpetual funding from Deribit. Key levels: % = distance of live BTC from each level (daily closes; 200W MA = 200 weekly closes). Tap a row to chart it. Stocks: CNBC exchange prices; outside 9:30–4:00 ET the pre-market (PRE) or after-hours (AH) last trade leads and the official regular-session close sits under it. Crypto: Coinbase, 24h change. Stock price mode: Auto follows the session (regular → PRE/AH → 24/7 tokenized overnight and weekends); Ext, 24/7 and Close force one. 24/7 = Kraken xStocks tokenized MSTR, COIN, MARA (only when actively traded); tokens can differ from the exchange price. Index rows show futures when the cash market is closed. Education only.</p>';
  var tc = $('.p-tc', main); main.insertBefore(hb, tc ? tc.nextSibling : main.firstChild);
  function fmt(v, k) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v), d = k === 'y' ? 3 : a >= 1000 ? (k === 'c' ? 0 : 2) : a < 1 && k === 'c' ? 4 : 2; return (k === 'c' || k === 's' || k === 'f' ? '$' : '') + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + (k === 'y' ? '%' : ''); }
  function pc(v) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; }
  function cls(v) { return v > 0 ? 'up' : v < 0 ? 'dn' : ''; }
  function chSym(s) { return CHS[s] || (/^[A-Z]{2,5}$/.test(s) && s !== 'US10Y' ? s : null); }
  function onChart(s) { var T = window.BTD_TC, c = chSym(s); return !!(c && T && T.panes.some(function (P) { return P.sym === c; })); }
  var DTK = { '.SPX': 'SPX', '.IXIC': 'IXIC', '.DJI': 'DJI', '.DXY': 'DXY', '.VIX': 'VIX', '@GC.1': 'GC', '@CL.1': 'CL', '@SP.1': 'ES', '@ND.1': 'NQ', '@DJ.1': 'YM' };
  var FNM = { '@GC.1': 'Gold futures', US10Y: 'US 10Y yield', '.DXY': 'US Dollar Index' };
  function tkN(it) { var t = DTK[it[0]] || it[0]; return '<span class="hb-n"><b class="hb-tk">' + esc(t) + '</b><span class="hb-nm">' + esc(FNM[it[0]] || it[1]) + '</span></span>'; }
  function cq(s) { var q = F && F.get(s); if (q && q.px != null) return q; return typeof CQ !== 'undefined' && CQ[s] ? CQ[s] : null; }
  /* 24/7 tokenized stocks (Kraken xStocks public ticker, CORS-open). Used only when it has real trading (>=20 trades in 24h). */
  var TOK = {}, TKS = ['MSTR', 'COIN', 'MARA'], MODE = LSg('btd_hbm') || 'auto';
  function LSg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function tokF() { J('https://api.kraken.com/0/public/Ticker?asset_class=tokenized_asset&pair=' + TKS.map(function (t) { return t + 'xUSD'; }).join(',')).then(function (j) { var r = j.result || {}; TKS.forEach(function (t) { var x = r[t + 'xUSD']; if (x && x.c && +x.c[0] > 0 && x.t && +x.t[1] >= 20) TOK[t] = { px: +x.c[0], n: +x.t[1] }; else delete TOK[t]; }); paintHB(); }).catch(function () {}); }
  tokF(); setInterval(tokF, 60e3);
  /* which price leads a stock row: auto = session-aware (open: regular; pre/post: extended; overnight/weekend: 24/7 token if liquid, else last extended) */
  function pickSt(s, q, ses) { var m = MODE, ext = q.ext && q.ext.px != null ? q.ext : null, tk = TOK[s];
    if (m === 'close') return null; if (m === '247') return tk ? { px: tk.px, tag: '24/7', t: 'tok' } : ext ? { px: ext.px, tag: ext.kind === 'pre' ? 'PRE' : 'AH' } : null;
    if (m === 'ext') return ext ? { px: ext.px, tag: ext.kind === 'pre' ? 'PRE' : 'AH' } : null;
    if (ses === 'open') return null; if (ses === 'closed' && tk) return { px: tk.px, tag: '24/7', t: 'tok' }; return ext ? { px: ext.px, tag: ext.kind === 'pre' ? 'PRE' : 'AH' } : null; }
  function cell(it) { var s = it[0], k = it[2] || 's', q = k === 'c' ? cq(s) : F && F.get(s), ses = F ? F.session() : 'open', c = chSym(s);
    var hit = HIT[DTK[s] || s] && Date.now() - HIT[DTK[s] || s] < 30e3, open = '<div class="hb-c' + (onChart(s) ? ' hb-on' : '') + (hit ? ' hb-hit' : '') + '"' + (c ? ' role="button" tabindex="0" data-hb-go="' + c + '" title="Chart ' + esc(c) + '"' : '') + '>';
    if (!q || q.px == null) return open + tkN(it) + '<span class="hb-m"><b class="hb-p">…</b></span><small class="hb-s">&nbsp;</small></div>';
    var main0 = '', sub = '';
    var L = k === 's' ? pickSt(s, q, ses) : null;
    if (L) { var d = (L.px / q.px - 1) * 100; main0 = '<b class="hb-p">' + fmt(L.px, k) + '</b><span class="hb-x ' + cls(d) + '">' + pc(d) + '</span><span class="hb-tag' + (L.t ? ' tok' : '') + '" title="' + (L.t ? '24/7 tokenized price (Kraken xStocks), change vs official close' : 'Extended-hours last trade (CNBC), change vs official close') + '">' + L.tag + '</span>'; sub = 'Close ' + fmt(q.px, k) + ' <i class="' + cls(q.chp) + '">' + pc(q.chp) + '</i>'; }
    else { main0 = '<b class="hb-p">' + fmt(q.px, k) + '</b><span class="hb-x ' + cls(q.chp) + '">' + (k === 'y' && q.ch != null ? (q.ch >= 0 ? '+' : '−') + Math.abs(q.ch * 100).toFixed(1) + ' bp' : pc(q.chp)) + '</span>' + (k === 'c' ? '<span class="hb-tag on">24h</span>' : '');
      sub = k === 'c' ? 'Coinbase · live' : ses === 'open' ? (k === 'f' ? 'futures · live' : 'regular session · live') : (k === 'f' ? 'futures · front month' : 'official close'); }
    if (k === 'i' && it[3] && ses !== 'open') { var f = F.get(it[3]); if (f && f.px != null) sub = 'Close · futures ' + DTK[it[3]] + ' ' + fmt(f.px, 'i') + ' <i class="' + cls(f.chp) + '">' + pc(f.chp) + '</i>'; }
    var tr = TRS[s], fx = tr ? '<small class="hb-f">' + (tr.btc ? '₿ ' + Math.round(tr.btc).toLocaleString('en-US') : '') + (tr.mnav ? ' · mNAV ' + tr.mnav.toFixed(2) + 'x wkly' : '') + '</small>' : '';
    var del = EDIT && GROUPS[1][1].indexOf(it) >= 0 ? '<button type="button" class="hb-del" data-hbdel="' + esc(s) + '" aria-label="Remove ' + esc(s) + '">×</button>' : '';
    return open + tkN(it) + '<span class="hb-m">' + main0 + (hit ? '<span class="hb-tag hit">✓ alert</span>' : '') + del + '</span>' + fx + '<small class="hb-s">' + sub + '</small></div>'; }
  function paintHB() { var ae = document.activeElement; if (ae && ae.closest && ae.closest('[data-hbadd]')) return; var ses = F ? F.session() : 'open'; $('[data-hb-ses]', hb).textContent = { open: 'US market open', pre: 'Pre-market · PRE prices lead', post: 'After hours · AH prices lead', closed: 'US market closed · overnight/weekend: 24/7 tokenized prices lead where available' }[ses] || '';
    $('[data-hb]', hb).innerHTML = GROUPS.map(function (g) { return '<div class="hb-g"><p class="hb-h">' + g[0] + (g[0].indexOf('stocks') > 0 ? '<span class="hb-md" role="group" aria-label="Stock price shown">' + [['auto', 'Auto'], ['ext', 'Ext'], ['247', '24/7'], ['close', 'Close']].map(function (m) { return '<button type="button" data-hbm="' + m[0] + '"' + (MODE === m[0] ? ' class="on"' : '') + '>' + m[1] + '</button>'; }).join('') + '</span><button type="button" class="hb-ed" data-hbed aria-pressed="' + !!EDIT + '">' + (EDIT ? 'Done' : 'Edit') + '</button>' : '') + '</p>' + (g[0].indexOf('stocks') > 0 && EDIT ? '<form class="hb-add" data-hbadd><input name="t" maxlength="12" placeholder="Add any ticker: stock, ETF, index (.SPX) or crypto" aria-label="Add ticker" autocomplete="off"><button type="submit">Add</button><button type="button" data-hbrst>Reset</button></form>' : '') + '<div class="hb-r">' + g[1].map(cell).join('') + '</div></div>'; }).join(''); }
  var GL = null; function glob() { J('https://api.coinpaprika.com/v1/global').then(function (d) { if (d && d.bitcoin_dominance_percentage) { GL = { dom: d.bitcoin_dominance_percentage, cap: d.market_cap_usd, chp: d.market_cap_change_24h, vol: d.volume_24h_usd }; paintCtx(); } }).catch(function () {}); }
  function paintCtx() { var el = $('[data-hb-ctx]', hb), it = [], fu = window.BTD_FUND, b = F && F.get('BTC');
    if (GL) { it.push(['BTC dominance', GL.dom.toFixed(1) + '%', '', '']); it.push(['Total crypto cap', '$' + (GL.cap / 1e12).toFixed(2) + 'T', pc(GL.chp), cls(GL.chp)]); it.push(['24h crypto volume', '$' + (GL.vol / 1e9).toFixed(0) + 'B', '', '']); }
    if (fu && fu.f8 != null) it.push(['BTC funding', (fu.f8 >= 0 ? '+' : '−') + Math.abs(fu.f8).toFixed(4) + '%/8h', fu.ann != null ? (fu.ann >= 0 ? '+' : '−') + Math.abs(fu.ann).toFixed(1) + '% ann.' : '', '']);
    el.innerHTML = it.map(function (x) { return '<span><em>' + x[0] + '</em> <b>' + x[1] + '</b>' + (x[2] ? ' <i class="' + x[3] + '">' + x[2] + '</i>' : '') + '</span>'; }).join(''); el.hidden = !it.length; }
  /* BTC key levels, computed from real closes: btc_daily.json (CoinMarketCap/Coinbase daily closes, weekly refresh) + Coinbase daily candles (prior day H/L, week open) + live price */
  var LV = null;
  Promise.all([J('/assets/data/btc_daily.json'), J('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400')]).then(function (r) { var c = r[0].closes.slice(), t0 = Date.parse(r[0].start + 'T00:00:00Z'), cb = r[1] || [];
    /* extend the file's closes with Coinbase daily closes after its last day */
    var last = t0 + (c.length - 1) * 864e5; cb.slice().reverse().forEach(function (k) { if (k[0] * 1e3 > last && k[0] * 1e3 < Date.now() - 864e5 + 1) { c.push(+k[4]); last = k[0] * 1e3; } });
    function ma(n) { if (c.length < n) return null; var s0 = 0; for (var i = c.length - n; i < c.length; i++) s0 += c[i]; return s0 / n; }
    var wk = []; for (var i = c.length - 1; i >= 0 && wk.length < 200; i -= 7) wk.push(c[i]); var ma200w = wk.length === 200 ? wk.reduce(function (a, b) { return a + b; }, 0) / 200 : null;
    var ath = Math.max.apply(null, c), y = cb[1], now = new Date(), dow = (now.getUTCDay() + 6) % 7, wo = null; cb.forEach(function (k) { var d = new Date(k[0] * 1e3); if (Math.round((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - k[0] * 1e3) / 864e5) === dow) wo = +k[3]; });
    var yr = new Date().getUTCFullYear(), yi = Math.round((Date.UTC(yr, 0, 1) - t0) / 864e5) - 1, ytd0 = yi > 0 && yi < c.length ? c[yi] : null;
    LV = { ma50: ma(50), ma200: ma(200), ma200w: ma200w, ath: Math.max(ath, +(cb[0] || [])[2] || 0), ph: y ? +y[2] : null, pl: y ? +y[1] : null, wo: wo, ytd0: ytd0 }; paintLv(); }).catch(function () {});
  function paintLv() { var el = $('[data-hb-lv]', hb), b = F && F.get('BTC'); if (!LV || !b || b.px == null) return; var px = b.px, it = [];
    function dist(v) { return v ? ((px / v - 1) * 100) : null; }
    [['50D MA', LV.ma50], ['200D MA', LV.ma200], ['200W MA', LV.ma200w]].forEach(function (x) { if (x[1]) it.push([x[0], fmt(x[1], 'c'), pc(dist(x[1])), cls(dist(x[1]))]); });
    if (LV.ath) it.push(['ATH', fmt(LV.ath, 'c'), pc(dist(LV.ath)), cls(dist(LV.ath))]);
    if (LV.ph) it.push(['Prior day H / L', fmt(LV.ph, 'c') + ' / ' + fmt(LV.pl, 'c'), '', '']);
    if (LV.wo) it.push(['Week open', fmt(LV.wo, 'c'), pc(dist(LV.wo)), cls(dist(LV.wo))]);
    var r = Math.round(px / 5000) * 5000; it.push(['Round level', fmt(r, 'c'), pc(dist(r)), cls(dist(r))]);
    var sp = F.get('.SPX'); if (LV.ytd0 && sp && sp.chp != null) it.push(['BTC vs SPX today', pc(b.chp - sp.chp), '', cls(b.chp - sp.chp)]);
    if (LV.ytd0) it.push(['BTC YTD', pc(dist(LV.ytd0)), '', cls(dist(LV.ytd0))]);
    el.innerHTML = '<span class="hb-lvh">BTC key levels</span>' + it.map(function (x) { return '<span><em>' + x[0] + '</em> <b class="' + (x[2] ? '' : x[3]) + '">' + x[1] + '</b>' + (x[2] ? ' <i class="' + x[3] + '">' + x[2] + '</i>' : '') + '</span>'; }).join(''); el.hidden = false; }
  setInterval(paintLv, 15e3);
  glob(); setInterval(glob, 300e3); [3000, 8000, 20000].forEach(function (ms) { setTimeout(paintCtx, ms); }); setInterval(paintCtx, 30e3);
  hb.addEventListener('submit', function (e) { var f = e.target.closest('[data-hbadd]'); if (!f) return; e.preventDefault(); var t = (f.t.value || '').trim().toUpperCase().replace(/[^A-Z0-9.\-@^]/g, ''); if (!t || MINE.indexOf(t) >= 0) return; MINE.push(t); if (MINE.length > 12) MINE.shift(); saveMine(); stRows(); if (CRYPTO.indexOf(t) >= 0) cb1(t); else if (F) F.watch([t]); paintHB(); var i = $('[data-hbadd] input', hb); if (i) i.focus(); });
  hb.addEventListener('click', function (e) { var ed = e.target.closest('[data-hbed]'); if (ed) { EDIT = EDIT ? 0 : 1; paintHB(); return; } var dl = e.target.closest('[data-hbdel]'); if (dl) { MINE = MINE.filter(function (x) { return x !== dl.dataset.hbdel; }); saveMine(); stRows(); paintHB(); return; } if (e.target.closest('[data-hbrst]')) { MINE = DEF.slice(); saveMine(); stRows(); paintHB(); return; }
    var m = e.target.closest('[data-hbm]'); if (m) { MODE = m.dataset.hbm; try { localStorage.setItem('btd_hbm', MODE); } catch (x) {} paintHB(); return; } var b = e.target.closest('[data-hbt]'); if (!b) return; $('[data-hb]', hb).setAttribute('data-hbg', b.dataset.hbt); $$('[data-hbt]', hb).forEach(function (x) { x.classList.toggle('on', x === b); }); });
  function go(e) { if (e.target.closest('[data-hbm],[data-hbdel],[data-hbed],[data-hbadd]')) return; var r = e.target.closest('[data-hb-go]'); if (!r || !window.BTD_TC || !window.BTD_TC.load) return; if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); window.BTD_TC.load(r.dataset.hbGo); setTimeout(paintHB, 50); }
  HIT = {}; document.addEventListener('btd:alert', function (e) { var sy = e.detail && e.detail.sym; if (!sy) return; HIT[sy] = Date.now(); paintHB(); setTimeout(paintHB, 30e3); });
  hb.addEventListener('click', go); hb.addEventListener('keydown', go);
  if (F) { var syms = []; GROUPS.forEach(function (g) { g[1].forEach(function (it) { if (it[2] !== 'c') syms.push(it[0]); if (it[3]) syms.push(it[3]); }); }); F.watch(syms.concat(MINE.filter(function (t) { return CRYPTO.indexOf(t) < 0; }))); var pt = null; F.on('*', function () { if (pt) return; pt = setTimeout(function () { pt = null; paintHB(); }, 400); }); }
  paintHB();

  /* ---------- Home: Biggest movers (top 20 treasury companies + top alts, 1D) ---------- */
  var mv = document.createElement('section'); mv.className = 'p p-bm'; mv.setAttribute('data-home-movers', ''); mv.setAttribute('aria-label', 'Biggest movers today');
  mv.innerHTML = '<div class="p-h"><span class="p-t">Biggest movers</span><span class="seg bm-seg" role="group"><button type="button" class="on" data-bm="all">All</button><button type="button" data-bm="stk">Treasury cos.</button><button type="button" data-bm="cry">Crypto</button></span></div><ol class="bm" data-bm-l></ol><p class="p-f" data-bm-f>Top 20 public bitcoin treasury companies (BitcoinTreasuries.NET ranking) and 12 large coins, ranked by the size of today\'s move. Stocks: last regular session vs prior close (CNBC). Crypto: 24h (Coinbase).</p>';
  main.insertBefore(mv, hb.nextSibling);
  var STK = [], CRY = ['ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'LINK', 'AVAX', 'LTC', 'SUI', 'BCH', 'DOT', 'HBAR'], CQ = {}, BMODE = 'all';
  J('/assets/data/desk.json').then(function (j) { STK = (j.treasuries.rows || []).filter(function (r) { return r.tk && /^[A-Z]{1,5}$/.test(r.tk); }).slice(0, 20).map(function (r) { return [r.tk, r.name]; }); if (F) F.watch(STK.map(function (x) { return x[0]; })); paintMV(); }).catch(function () {});
  function cb1(s) { return fetch('https://api.exchange.coinbase.com/products/' + s + '-USD/stats').then(function (r) { return r.json(); }).then(function (x) { var l = +x.last, o = +x.open; if (l && o) { CQ[s] = { px: l, chp: (l / o - 1) * 100 }; paintMV(); paintHB(); } }).catch(function () {}); }
  /* staggered (Coinbase rate-limits bursts), then one retry for any that failed */
  function cbStats() { CRY.forEach(function (s, i) { setTimeout(function () { cb1(s); }, i * 150); }); setTimeout(function () { CRY.forEach(function (s, i) { if (!CQ[s]) setTimeout(function () { cb1(s); }, i * 300); }); }, 5000); }
  cbStats(); setInterval(cbStats, 120e3);
  function paintMV() { var rows = [];
    if (BMODE !== 'cry') STK.forEach(function (x) { var q = F && F.get(x[0]); if (q && q.px != null && q.chp != null) rows.push({ s: x[0], n: x[1], px: q.px, chp: q.chp, k: 's' }); });
    if (BMODE !== 'stk') CRY.forEach(function (s) { var q = CQ[s] || (F && F.get(s)); if (q && q.px != null && q.chp != null) rows.push({ s: s, n: s, px: q.px, chp: q.chp, k: 'c' }); });
    rows.sort(function (a, b) { return Math.abs(b.chp) - Math.abs(a.chp); });
    var l = $('[data-bm-l]', mv); if (!rows.length) { l.innerHTML = '<li class="muted">Loading quotes…</li>'; return; }
    l.innerHTML = rows.slice(0, 6).map(function (r) { return '<li><b class="bm-s">' + esc(r.s) + '</b><span class="bm-n">' + esc(r.k === 'c' ? 'crypto · 24h' : r.n) + '</span><span class="bm-p mono">' + fmt(r.px, r.k === 'c' ? 'c' : 's') + '</span><span class="bm-c mono ' + cls(r.chp) + '">' + pc(r.chp) + '</span></li>'; }).join(''); }
  mv.addEventListener('click', function (e) { var b = e.target.closest('[data-bm]'); if (!b) return; BMODE = b.dataset.bm; $$('[data-bm]', mv).forEach(function (x) { x.classList.toggle('on', x === b); }); paintMV(); });
  if (F) { var mt = null; F.on('quotes', function () { if (mt) return; mt = setTimeout(function () { mt = null; paintMV(); }, 500); }); }

  /* ---------- duplicates: one copy of each number ---------- */
  function dedupe() {
    /* Key Metrics keeps: Strategy BTC value, BTC bought YTD, dividend coverage, Fear & Greed. BTC Yield lives in the Strategy tab KPIs. */
    $$('.p-hs .n5-c').forEach(function (c) { if (/^\s*BTC YIELD/i.test(c.innerText || '')) c.classList.add('dup-off'); });
    /* Crypto at a Glance: Fear & Greed is on Home (Key Metrics) */
    $$('.p-cx .cx-k').forEach(function (c) { if (/^\s*Fear & Greed/i.test(c.innerText || '')) c.classList.add('dup-off'); });
    /* Markets board: crypto row lives in the Crypto tab; MSTR & co. live in the Companies tab */
    $$('.p-mk .mk-desk, .p-mk .mk-tc').forEach(function (c) { c.classList.add('dup-off'); });
    /* mNAV: one live headline (MSTR chart key numbers, Strategy method). KPI tile is labelled as the official weekly figure */
    $$('.p-kpi .x-k').forEach(function (c) { var s = c.querySelector('small'); if (s && /^MNAV$/i.test(s.textContent.trim())) { s.textContent = 'mNAV · official weekly'; } });
    /* Off-hours row (futures + tokens) is replaced by the Desk board */
    $$('.p-hs .hs-mode, .p-hs [data-hs]').forEach(function (c) { c.classList.add('dup-off'); });
  }
  /* tokens never sit empty: honest note + official extended-hours quotes */
  function tokGuard() { var t = $('.p-tok', main); if (!t) return; var g = F && F.get('tok'); var stuck = /Loading tokenized prices/i.test(t.innerText || '');
    var note = $('[data-tok-note]', t); if (stuck && !g) { if (!note) { note = document.createElement('p'); note.className = 'tok-note'; note.setAttribute('data-tok-note', ''); var x = $$('p, div', t).filter(function (e) { return /Loading tokenized prices/i.test(e.textContent) && e.children.length < 3; })[0]; if (x) { x.style.display = 'none'; x.parentNode.insertBefore(note, x); } else t.appendChild(note); }
      var q = ['MSTR', 'COIN', 'MARA', 'HOOD', 'NVDA'].map(function (s) { var v = F && F.get(s); if (!v || v.px == null) return ''; var e = v.ext && v.ext.px != null ? v.ext : null; return '<span><b>' + s + '</b> ' + (e ? (e.kind === 'pre' ? 'pre-mkt ' : 'after hrs ') + '$' + e.px.toFixed(2) : 'close $' + v.px.toFixed(2)) + '</span>'; }).join(' · ');
      note.innerHTML = 'Token prices are unavailable right now (CoinGecko\'s free feed is rate-limiting this browser; it retries automatically). Official exchange quotes meanwhile: ' + q; }
    else if (note) note.remove(); }
  if (F) F.watch(['MSTR', 'COIN', 'MARA', 'HOOD', 'NVDA']);

  tag(); show(cur(), 0); dedupe(); [1500, 4000, 9000].forEach(function (ms) { setTimeout(function () { tag(); dedupe(); tokGuard(); show(document.body.getAttribute('data-tab') || 'home', 0); }, ms); }); setInterval(dedupe, 4000);
  setInterval(tokGuard, 30e3);
})();
