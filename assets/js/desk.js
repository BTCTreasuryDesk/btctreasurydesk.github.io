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
  var STALE = {};
  function fieldStale() { var k = ['px', 'global', 'fng'].filter(function (x) { return STALE[x]; }); stale('.p-field', k.length > 0, k.length ? 'Showing saved values: live fetch failed (' + k.join(', ') + ').' : ''); }
  function getJSON(url, key, maxAgeMs) {
    var c = null; try { c = JSON.parse(LS.get('btd:' + key) || 'null'); } catch (e) {}
    if (c && Date.now() - c.t < (maxAgeMs || 0)) return Promise.resolve(c.d);
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { delete STALE[key]; LS.set('btd:' + key, JSON.stringify({ t: Date.now(), d: d })); return d; })
      .catch(function (e) { if (c) { STALE[key] = 1; return c.d; } throw e; });
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
  /* ---------- Top strip: compact Top 10 by BTC held ----------
     Slot 0 = MSTR (large, featured, fixed). Slot 1 = BTC (slim, fixed). Slots 2-10 = the #2-#10 public companies by BTC held,
     read from desk.json's Treasury Board (treasuries.rows), so they follow each Sunday refresh. Nothing auto-moves.
     Visitors can override any of slots 2-10; overrides are saved per slot in localStorage 'btd_strip2' ({slot: {tk, tv}}),
     and slots they never touched keep following the ranking. */
  var STRIP_N = 11;
  var STRIP_EXTRA = [
    { tk: 'BTC', tv: 'BITSTAMP:BTCUSD', name: 'Bitcoin', g: 'Crypto' }, { tk: 'ETH', tv: 'BITSTAMP:ETHUSD', name: 'Ether', g: 'Crypto' }, { tk: 'SOL', tv: 'COINBASE:SOLUSD', name: 'Solana', g: 'Crypto' },
    { tk: 'STRC', tv: 'NASDAQ:STRC', name: 'Strategy Stretch preferred', g: 'Preferreds' }, { tk: 'STRF', tv: 'NASDAQ:STRF', name: 'Strategy Strife preferred', g: 'Preferreds' },
    { tk: 'STRK', tv: 'NASDAQ:STRK', name: 'Strategy Strike preferred', g: 'Preferreds' }, { tk: 'STRD', tv: 'NASDAQ:STRD', name: 'Strategy Stride preferred', g: 'Preferreds' },
    { tk: 'SATA', tv: 'NASDAQ:SATA', name: 'Strive SATA preferred', g: 'Preferreds' },
    { tk: 'MTPLF', tv: 'OTC:MTPLF', name: 'Metaplanet, older OTC line (main ticker is MPJPY)', g: 'Metaplanet-related' },
    { tk: 'SLE', tv: 'NASDAQ:SLE', name: 'Super League (Metaplanet-related; pending Superplanet deal)', g: 'Metaplanet-related' }
  ];
  var STRIP_FALLBACK = [ // ranking used until desk.json's board loads (Oct 11, 2026 order)
    { tk: 'MSTR', tv: 'NASDAQ:MSTR', name: 'Strategy' }, { tk: 'MPJPY', tv: 'OTC:MPJPY', name: 'Metaplanet (ADR)' }, { tk: 'XXI', tv: 'NYSE:XXI', name: 'Twenty One Capital' },
    { tk: 'MARA', tv: 'NASDAQ:MARA', name: 'MARA Holdings' }, { tk: 'ASST', tv: 'NASDAQ:ASST', name: 'Strive' }, { tk: 'BLSH', tv: 'NYSE:BLSH', name: 'Bullish' },
    { tk: 'SPCX', tv: 'NASDAQ:SPCX', name: 'SpaceX' }, { tk: 'COIN', tv: 'NASDAQ:COIN', name: 'Coinbase' }, { tk: 'CLSK', tv: 'NASDAQ:CLSK', name: 'CleanSpark' },
    { tk: 'DJT', tv: 'NASDAQ:DJT', name: 'Trump Media' }
  ];
  var LOCK = { 'NASDAQ:MSTR': 1, 'BITSTAMP:BTCUSD': 1 };
  var SYM_OK = /^[A-Z0-9:._!\-]{1,32}$/;
  function stripOvLoad() {
    var ov = {}, o = null; try { o = JSON.parse(LS.get('btd_strip2') || 'null'); } catch (e) {}
    if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { var x = o[k]; if (+k >= 2 && +k < STRIP_N && x && typeof x.tv === 'string' && SYM_OK.test(x.tv) && !LOCK[x.tv]) ov[+k] = { tk: String(x.tk || x.tv).slice(0, 12), tv: x.tv }; });
    var a = null; try { a = JSON.parse(LS.get('btd_strip') || 'null'); } catch (e) {} // one-time: old 5-tile strip -> keep real customizations as slot overrides
    if (Array.isArray(a)) {
      var oldDef = { 2: /ASST/, 3: /MPJPY|MTPLF/, 4: /XXI/ };
      a.forEach(function (x, i) { if (i >= 2 && i <= 4 && x && typeof x.tv === 'string' && SYM_OK.test(x.tv) && !LOCK[x.tv] && !oldDef[i].test(x.tv) && !ov[i]) ov[i] = { tk: String(x.tk || x.tv).slice(0, 12), tv: x.tv }; });
      try { localStorage.removeItem('btd_strip'); localStorage.removeItem('btd_strip_mig1'); } catch (e) {}
      if (Object.keys(ov).length) LS.set('btd_strip2', JSON.stringify(ov));
    }
    return ov;
  }
  var OV = stripOvLoad(), STRIP = [];
  function stripRank() { // public companies by BTC held, MSTR first
    var rows = (TB && TB.rows) ? TB.rows.filter(function (r) { return r.tv; }).slice().sort(function (a, b) { return b.btc - a.btc; }) : STRIP_FALLBACK;
    return rows.map(function (r) { return { tk: String(r.tk).slice(0, 12), tv: r.tv }; });
  }
  function stripDefaultAt(i) { return stripCompute({})[i]; }
  function stripCompute(ov) {
    var used = { 'NASDAQ:MSTR': 1, 'BITSTAMP:BTCUSD': 1 }; Object.keys(ov).forEach(function (k) { used[ov[k].tv] = 1; });
    var pool = stripRank().filter(function (r) { return !used[r.tv]; }), out = [{ tk: 'MSTR', tv: 'NASDAQ:MSTR' }, { tk: 'BTC', tv: 'BITSTAMP:BTCUSD' }];
    for (var i = 2; i < STRIP_N; i++) out.push(ov[i] ? { tk: ov[i].tk, tv: ov[i].tv, own: 1 } : (pool.shift() || { tk: 'COIN', tv: 'NASDAQ:COIN' }));
    return out;
  }
  function stripCustom() { return Object.keys(OV).length > 0; }
  function stripSave() { if (!stripCustom()) { try { localStorage.removeItem('btd_strip2'); } catch (e) {} } else LS.set('btd_strip2', JSON.stringify(OV)); stripCap(); }
  function stripCap() {
    var c = $('[data-strip-cap]'); if (!c) return; var n = Object.keys(OV).length;
    c.innerHTML = '<b>Top 10 by BTC held</b><span>Public companies ranked by bitcoin on the balance sheet · BTC fixed · updates each Sunday' +
      (n ? ' · <em>' + n + ' tile' + (n > 1 ? 's' : '') + ' are your picks</em>' : ' · ✎ to swap a tile') + '</span><span class="strip-swipe" aria-hidden="true">swipe &rarr;</span>';
  }
  function stripRow(tv0) { return TB && TB.rows ? TB.rows.filter(function (r) { return r.tv === tv0; })[0] : null; }
  function stripMeta(i, c) {
    var r = stripRow(c.tv);
    if (i === 1) return 'Bitcoin · fixed';
    if (r) return '#' + (TB.rows.filter(function (x) { return x.btc > r.btc; }).length + 1) + ' · ' + fmt(r.btc) + ' ₿' + (c.own ? ' · your pick' : '');
    if (c.tv.indexOf('DATA:') === 0) return 'Data · your pick';
    var e = STRIP_EXTRA.filter(function (x) { return x.tv === c.tv; })[0];
    return (e ? (e.g === 'Preferreds' ? 'Preferred' : e.g === 'Crypto' ? 'Crypto' : 'Related') + ' · ' : '') + 'your pick';
  }
  function stripCell(i) {
    var c = STRIP[i];
    if (i === 0) { var r = stripRow(c.tv); // MSTR: first, fixed, same size as the slim tiles, orange accent
      return '<div class="q-cell q-slim q-feat" data-qi="0"><div class="tv-slot" data-tvq="' + esc(c.tv) + '" data-tk="MSTR"></div><div class="q-foot"><span title="MSTR is the fixed featured tile">&#9733; #1' + (r ? '<i class="q-n"> · ' + esc(fmt(r.btc)) + ' ₿</i>' : '') + '</span><span class="q-mkt" data-mstr-mkt hidden></span></div></div>'; }
    if (i === 1) return '<div class="q-cell q-slim q-btc" data-qi="1"><div class="tv-slot" data-tvq="' + esc(c.tv) + '" data-tk="BTC"></div><div class="q-foot"><span>Bitcoin · live 24/7</span><span class="q-lock" title="BTC is a fixed tile">&#128274;</span></div></div>';
    return '<div class="q-cell q-slim' + (c.own ? ' q-own' : '') + '" data-qi="' + i + '"><div class="tv-slot" data-tvq="' + esc(c.tv) + '" data-tk="' + esc(c.tk) + '"></div><div class="q-foot"><span>' + esc(stripMeta(i, c)) + '</span>' +
      (LOCK[c.tv] ? '<span class="q-lock" title="BTC is a fixed tile">&#128274;</span>' : '<button type="button" class="q-ed" data-q-edit="' + i + '" aria-haspopup="dialog" aria-label="Change tile ' + i + ' (' + esc(c.tk) + ')" title="Swap this tile">' +
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.3 1.7a1.5 1.5 0 0 1 2.1 0l.9.9a1.5 1.5 0 0 1 0 2.1L5.6 13.4 2 14l.6-3.6z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg></button>') + '</div></div>';
  }
  var DATA_T = { MNAV: ['mNAV', 'MSTR mNAV (strategy.com)'], DOM: ['BTC.D', 'Bitcoin dominance'], BTCETH: ['BTC/ETH', 'BTC priced in ETH'], FNG: ['F&G', 'Crypto Fear & Greed'], ATH: ['ATH', 'BTC distance from all-time high'] };
  function dataVal(k) { if (typeof live === 'undefined' || !live) return null; switch (k) {
    case 'MNAV': return DESK ? [DESK.strategy.mnav.toFixed(2) + 'x', 'strategy.com'] : null; case 'DOM': return live.dom ? [live.dom.toFixed(1) + '%', 'CoinGecko'] : null;
    case 'BTCETH': return live.btc && live.eth ? [(live.btc / live.eth).toFixed(1), 'ETH per BTC'] : null; case 'FNG': return live.fng ? [live.fng.split(' ')[0], live.fng.split(' ').slice(1).join(' ')] : null;
    case 'ATH': var a = athOf(); return a && live.btc ? [pct((live.btc / a - 1) * 100, 1), 'vs ATH ' + usd(a)] : null; } return null; }
  function athOf() { return HIST && live ? Math.max.apply(null, HIST.closes.concat(live.btc ? [live.btc] : [])) : null; }
  function dataTiles() { $$('[data-dtile]').forEach(function (el) { var v = dataVal(el.dataset.dtile); el.innerHTML = '<small>' + esc(DATA_T[el.dataset.dtile][1]) + '</small><b>' + (v ? esc(v[0]) : '…') + '</b><small>' + (v ? esc(v[1]) : '') + '</small>'; }); }
  var LAST = null; fetch('/members/data/last_closes.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { LAST = j; ticker(); if (typeof qtPaint === 'function') qtPaint(); }).catch(function () {});
  function pxOf(r) { if (r.tv.indexOf('DATA:') === 0) { var v = dataVal(r.tv.slice(5)); return v ? v[0] : ''; }
    if (LAST && LAST.q[r.tk]) return '$' + LAST.q[r.tk].c.toFixed(2);
    if (DESK) { var p = DESK.preferreds.filter(function (x) { return x.t === r.tk; })[0]; if (p) return '$' + p.price.toFixed(2); }
    if (MET && MET.securities[r.tk] && MET.securities[r.tk].price) return MET.securities[r.tk].price;
    if (r.tk === 'BTC' && live.btc) return usd(live.btc); if (r.tk === 'ETH' && live.eth) return usd(live.eth); if (r.tk === 'SOL' && live.sol) return usd(live.sol); return ''; }
  /* Strip quotes: our own compact tiles (no per-tile widgets, so no logo or "D" overlays).
     Stocks: CNBC public quote feed (CORS-enabled; real-time last sale for US listings, flagged "delayed" when not).
     BTC/ETH/SOL: Coinbase Exchange 24h stats, CoinGecko as fallback. Polled every 60s while the tab is visible.
     If a feed fails we fall back to members/data/last_closes.json and label it "last close". Tap a tile for the TradingView chart. */
  var QT = {}, QT_US = /^(NASDAQ|NYSE|AMEX|NYSEARCA|OTC|BATS|CBOE):/, QT_CG = { BTCUSD: 'bitcoin', ETHUSD: 'ethereum', SOLUSD: 'solana' };
  var TK_EX = { LSE: '-GB', TSE: '-JP', HKEX: '-HK', XETR: '-DE', TSX: '-CA', ASX: '-AU', EURONEXT: '-FR' };
  function qtCnbc(tv0) { if (tv0.indexOf(':') < 0) return /^[A-Z0-9.\-]{1,12}$/.test(tv0) ? tv0 : null; var p = tv0.split(':'); if (QT_US.test(tv0)) return p[1]; return TK_EX[p[0]] ? p[1] + TK_EX[p[0]] : null; }
  var CNURL = 'https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1&symbols=';
  function cnCheck(t) { // validate a typed ticker against the live quote feed; resolves {cn, tk, name, px, cur} or null
    var c = qtCnbc(String(t).toUpperCase().replace(/\s+/g, '')); if (!c) return Promise.resolve(null);
    return fetch(CNURL + encodeURIComponent(c)).then(function (r) { return r.json(); }).then(function (j) { var x = (j.FormattedQuoteResult || {}).FormattedQuote; x = Array.isArray(x) ? x[0] : x;
      if (!x || String(x.code) !== '0') return null; var px = parseFloat(String(x.last).replace(/,/g, '')); if (!isFinite(px)) return null;
      return { cn: c, tk: String(x.symbol || c).split('-')[0].slice(0, 12), name: x.name || x.shortName || x.symbol, px: px, cur: x.currencyCode }; }).catch(function () { return null; }); }
  function qtCg(tv0) { var k = tv0.split(':').pop(); return QT_CG[k] || null; }
  function qtFmt(v) { return v >= 1000 ? '$' + fmt(v, 0) : v >= 1 ? '$' + v.toFixed(2) : '$' + v.toFixed(4); }
  function qtChart(tv0) { return 'https://www.tradingview.com/symbols/' + encodeURIComponent(tv0.replace(':', '-')) + '/'; }
  function stripLoadQuote(el) {
    var v = el.dataset.tvq;
    if (v.indexOf('DATA:') === 0) { el.innerHTML = '<div class="dtile" data-dtile="' + esc(v.slice(5)) + '"></div>'; dataTiles(); return; }
    qtPaintOne(el);
  }
  function qtPaintOne(el) {
    var v = el.dataset.tvq, tk = el.dataset.tk || v.split(':').pop(), q = QT[v], lc = !q && LAST && LAST.q[tk] ? LAST.q[tk] : null;
    if (!q && lc) q = { px: lc.c, chp: (lc.c / lc.prev - 1) * 100, ch: lc.c - lc.prev, tag: 'last close ' + dateLbl(lc.d).replace(/, \d+$/, '') };
    var dir = q && q.chp != null ? (q.chp > 0 ? 'up' : q.chp < 0 ? 'dn' : '') : '';
    el.innerHTML = '<a class="qt" href="' + qtChart(v) + '" target="_blank" rel="noopener" title="Live chart on TradingView"><span class="qt-r1"><b class="qt-tk">' + esc(tk) + '</b><span class="qt-px">' + (q ? qtFmt(q.px) : '…') + '</span></span>' +
      '<span class="qt-r2 ' + dir + '"><span class="qt-chp">' + (q && q.chp != null ? (q.chp > 0 ? '+' : '') + q.chp.toFixed(2) + '%' : (q ? '' : (qtCnbc(v) || qtCg(v) ? '' : 'Live chart ↗'))) + '</span><span class="qt-ch">' + (q && q.ch != null ? (q.ch > 0 ? '+' : '') + (Math.abs(q.ch) >= 100 ? fmt(q.ch, 0) : q.ch.toFixed(2)) : '') + '</span>' +
      (q && q.tag ? '<span class="qt-tag">' + esc(q.tag) + '</span>' : '') + '</span></a>';
  }
  function qtPaint() { $$('[data-strip] [data-tvq]').forEach(function (el) { if (el.dataset.tvq.indexOf('DATA:') !== 0) qtPaintOne(el); }); }
  function qtFetch() {
    if (document.hidden) return;
    var syms = STRIP.map(function (c) { return c.tv; }), cn = [], cg = [];
    syms.forEach(function (v) { var a = qtCnbc(v), b = qtCg(v); if (a && cn.indexOf(a) < 0) cn.push(a); else if (b && cg.indexOf(b) < 0) cg.push(b); });
    var jobs = [];
    if (cn.length) jobs.push(fetch('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=' + encodeURIComponent(cn.join('|')) + '&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1')
      .then(function (r) { return r.json(); }).then(function (j) {
        var arr = (j.FormattedQuoteResult || {}).FormattedQuote || []; arr = Array.isArray(arr) ? arr : [arr];
        arr.forEach(function (x) { var px = parseFloat(String(x.last).replace(/,/g, '')); if (!isFinite(px) || x.code !== 0 && x.code !== '0') return;
          var q = { px: px, ch: parseFloat(String(x.change).replace(/[,+]/g, '')), chp: parseFloat(String(x.change_pct).replace(/[%+,]/g, '')), tag: String(x.realTime) === 'false' ? 'delayed' : '' };
          syms.forEach(function (v) { if (qtCnbc(v) === x.symbol) QT[v] = q; }); });
      }).catch(function () {}));
    var CBP = { bitcoin: 'BTC-USD', ethereum: 'ETH-USD', solana: 'SOL-USD' };
    cg.forEach(function (id) { // Coinbase Exchange 24h stats (CORS, no key); CoinGecko as fallback
      jobs.push(fetch('https://api.exchange.coinbase.com/products/' + CBP[id] + '/stats').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (x) {
        var last = +x.last, open = +x.open; if (!last) throw new Error('no price');
        syms.forEach(function (v) { if (qtCg(v) === id) QT[v] = { px: last, chp: open ? (last / open - 1) * 100 : null, ch: open ? last - open : null, tag: '24h' }; });
      }).catch(function () {
        return fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + id + '&vs_currencies=usd&include_24hr_change=true').then(function (r) { return r.json(); }).then(function (j) {
          var x = j[id]; if (!x || !x.usd) return; var chp = x.usd_24h_change;
          syms.forEach(function (v) { if (qtCg(v) === id) QT[v] = { px: x.usd, chp: chp, ch: chp != null ? x.usd - x.usd / (1 + chp / 100) : null, tag: '24h' }; });
        }).catch(function () {});
      }));
    });
    Promise.all(jobs).then(qtPaint);
  }
  setInterval(qtFetch, 60000); document.addEventListener('visibilitychange', function () { if (!document.hidden) qtFetch(); });
  function stripQuote(el) { stripLoadQuote(el); }
  function stripApply(focusI) { // recompute; re-render only tiles whose symbol (or label) changed
    var s = $('[data-strip]'); if (!s) return; var old = STRIP; STRIP = stripCompute(OV);
    var rail = $('.q-rail', s);
    if (!rail || !$('[data-qi="0"]', s)) {
      s.innerHTML = stripCell(1) + stripCell(0) + '<div class="q-rail" aria-label="#2 to #10 by BTC held">' + STRIP.slice(2).map(function (x, j) { return stripCell(j + 2); }).join('') +
        '<a class="q-cell q-slim q-all" href="#board"><b>All 50 &darr;</b><small>Treasury Board: filters, mNAV, last buys</small></a></div>';
      $$('[data-tvq]', s).forEach(stripQuote);
    } else {
      STRIP.forEach(function (c, i) {
        var cell = $('[data-qi="' + i + '"]', s); if (!cell) return;
        var tmp = document.createElement('div'); tmp.innerHTML = stripCell(i); var n = tmp.firstChild;
        if (old[i] && old[i].tv === c.tv) { var f0 = $('.q-foot', cell), f1 = $('.q-foot', n); if (f0 && f1 && f0.innerHTML !== f1.innerHTML) f0.innerHTML = f1.innerHTML; cell.classList.toggle('q-own', !!c.own); return; }
        cell.parentNode.replaceChild(n, cell); stripQuote($('[data-tvq]', n));
      });
    }
    stripCap();
    if (focusI != null) { var b = $('[data-q-edit="' + focusI + '"]'); if (b) b.focus(); }
  }
  function stripAutoDefaults() { stripApply(); qtFetch(); } // desk.json board loaded: real ranking + BTC-held labels
  stripApply(); setTimeout(qtFetch, 0);
  function stripPool() {
    var seen = { 'NASDAQ:MSTR': 1, 'BITSTAMP:BTCUSD': 1 }, out = [], rows = (TB && TB.rows) ? TB.rows.filter(function (r) { return r.tv; }).map(function (r) { return { tk: r.tk, tv: r.tv, name: r.name + ' · ' + fmt(r.btc) + ' ₿', g: 'Treasury stocks (ranked by BTC held)' }; }) : STRIP_FALLBACK.map(function (r) { return { tk: r.tk, tv: r.tv, name: r.name, g: 'Treasury stocks (ranked by BTC held)' }; });
    var pref = STRIP_EXTRA.filter(function (r) { return r.g === 'Preferreds'; }), crypto = STRIP_EXTRA.filter(function (r) { return r.g === 'Crypto' && r.tk !== 'BTC'; }).map(function (r) { return { tk: r.tk, tv: r.tv, name: r.name, g: 'ETH / SOL' }; }), other = STRIP_EXTRA.filter(function (r) { return r.g !== 'Preferreds' && r.g !== 'Crypto'; });
    var data = Object.keys(DATA_T).map(function (k) { return { tk: DATA_T[k][0], tv: 'DATA:' + k, name: DATA_T[k][1], g: 'Data tiles' }; });
    rows.concat(pref, data, crypto, other).forEach(function (r) { if (!seen[r.tv]) { seen[r.tv] = 1; out.push(r); } });
    return out;
  }
  var pk = null, pkI = -1, pkBtn = null;
  function pkClose(refocus) { if (!pk) return; pk.remove(); pk = null; if (refocus && pkBtn) pkBtn.focus(); pkBtn = null; pkI = -1; }
  function pkList(q) {
    var list = $('[data-pk-list]', pk), pool = stripPool(), qq = q.trim().toUpperCase(), g = '', html = '';
    pool.filter(function (r) { return !qq || r.tk.toUpperCase().indexOf(qq) >= 0 || r.name.toUpperCase().indexOf(qq) >= 0 || r.tv.indexOf(qq) >= 0; }).forEach(function (r) {
      if (r.g !== g) { g = r.g; html += '<li class="pk-g" role="presentation">' + esc(g) + '</li>'; }
      var cur = STRIP[pkI] && STRIP[pkI].tv === r.tv;
      html += '<li><button type="button" class="pk-o' + (cur ? ' on' : '') + '" data-pk-tv="' + esc(r.tv) + '" data-pk-tk="' + esc(r.tk) + '"><b>' + esc(r.tk) + '</b><span>' + esc(r.name) + '</span>' + (pxOf(r) ? '<i class="pk-px">' + esc(pxOf(r)) + '</i>' : '') + '</button></li>';
    });
    list.innerHTML = html || '<li class="pk-none">Not in the list. Press Enter to look up “' + esc(qq) + '” on the quote feed (any US ticker, or EXCHANGE:SYMBOL).</li>';
  }
  function pkPick(tv0, tk0) {
    var t = String(tv0 || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9:._!\-]{1,32}$/.test(t)) { var m = $('[data-pk-msg]', pk); if (m) m.textContent = 'Use letters, numbers and an optional exchange prefix, e.g. NASDAQ:COIN.'; return; }
    var hit = stripPool().filter(function (r) { return r.tv === t || r.tk.toUpperCase() === t; })[0];
    if (LOCK[t]) { var m2 = $('[data-pk-msg]', pk); if (m2) m2.textContent = 'MSTR and BTC are already fixed tiles.'; return; }
    if (!hit) { var m3 = $('[data-pk-msg]', pk); if (m3) m3.textContent = 'Checking ' + t + '…';
      cnCheck(t).then(function (v) { if (!pk) return; if (!v) { var m4 = $('[data-pk-msg]', pk); if (m4) m4.textContent = 'No live quote found for ' + t + '. Check the ticker, or use EXCHANGE:SYMBOL (e.g. NASDAQ:COIN, LSE:SWC).'; return; }
        pkSet({ tk: v.tk, tv: t.indexOf(':') < 0 ? v.cn : t }); }); return; }
    pkSet({ tk: hit.tk, tv: hit.tv });
  }
  function pkSet(pick) { var i = pkI;
    Object.keys(OV).forEach(function (k) { if (+k !== i && OV[k].tv === pick.tv) delete OV[k]; }); // no duplicate picks
    delete OV[i]; if (stripCompute(OV)[i].tv !== pick.tv) OV[i] = pick; // picking the slot's own default = back to auto
    stripSave(); pkClose(false); stripApply(i); qtFetch();
  }
  function pkOpen(i, btn) {
    pkClose(false); pkI = i; pkBtn = btn;
    pk = document.createElement('div'); pk.className = 'pk'; pk.setAttribute('role', 'dialog'); pk.setAttribute('aria-label', 'Choose a ticker for tile ' + i);
    pk.innerHTML = '<div class="pk-h"><b>Tile ' + i + '</b><span class="muted">now ' + esc(STRIP[i].tk) + '</span><button type="button" class="pk-x" data-pk-close aria-label="Close">&times;</button></div>' +
      '<input type="text" class="pk-in" data-pk-in placeholder="Search or type a ticker (e.g. NASDAQ:COIN)" autocomplete="off" spellcheck="false" aria-label="Search or type a ticker">' +
      '<ul class="pk-l" data-pk-list role="list"></ul><p class="pk-msg" data-pk-msg></p>' +
      '<div class="pk-f"><button type="button" class="chip" data-pk-mv="-1"' + (i <= 2 ? ' disabled' : '') + ' aria-label="Move tile left">&#9664; Move</button><button type="button" class="chip" data-pk-mv="1"' + (i >= STRIP_N - 1 ? ' disabled' : '') + ' aria-label="Move tile right">Move &#9654;</button><button type="button" class="chip" data-pk-reset1>Back to ranking</button><button type="button" class="chip" data-pk-reset>Reset all tiles</button></div>';
    document.body.appendChild(pk); pkList('');
    var r = btn.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 16);
    pk.style.width = w + 'px';
    pk.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px';
    var top = r.bottom + 4; if (top + 340 > window.innerHeight) top = Math.max(8, window.innerHeight - 348);
    pk.style.top = top + 'px';
    var inp = $('[data-pk-in]', pk); inp.focus();
    inp.addEventListener('input', function () { $('[data-pk-msg]', pk).textContent = ''; pkList(inp.value); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var first = $('[data-pk-tv]', pk); var v = inp.value.trim();
        if (first && v && $$('[data-pk-tv]', pk).length === 1) pkPick(first.dataset.pkTv, first.dataset.pkTk); else if (v) pkPick(v); }
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b && b.dataset.qEdit != null) { e.stopPropagation(); var i = +b.dataset.qEdit; if (pk && pkI === i) pkClose(true); else pkOpen(i, b); return; }
    if (!pk) return;
    if (!pk.contains(e.target)) { pkClose(false); return; }
    if (!b) return;
    if (b.dataset.pkTv) pkPick(b.dataset.pkTv, b.dataset.pkTk);
    else if (b.hasAttribute('data-pk-close')) pkClose(true);
    else if (b.dataset.pkMv) { var a0 = pkI, a1 = pkI + (+b.dataset.pkMv); if (a1 < 2 || a1 >= STRIP_N) return; var A = STRIP[a0], Bq = STRIP[a1];
      OV[a0] = { tk: Bq.tk, tv: Bq.tv }; OV[a1] = { tk: A.tk, tv: A.tv }; var D0 = stripCompute({}); [a0, a1].forEach(function (k) { if (D0[k].tv === OV[k].tv) delete OV[k]; });
      stripSave(); pkClose(false); stripApply(); var nb = $('[data-q-edit="' + a1 + '"]'); if (nb) pkOpen(a1, nb); }
    else if (b.hasAttribute('data-pk-reset1')) { var i1 = pkI; delete OV[i1]; stripSave(); pkClose(false); stripApply(i1); qtFetch(); }
    else if (b.hasAttribute('data-pk-reset')) { var i2 = pkI; OV = {}; stripSave(); pkClose(false); stripApply(i2); qtFetch(); }
  }, true);
  document.addEventListener('keydown', function (e) { if (pk && e.key === 'Escape') { e.stopPropagation(); pkClose(true); } }, true);
  window.addEventListener('resize', function () { pkClose(false); });

  var CHARTS = [
    { n: 'BTC', s: 'BITSTAMP:BTCUSD' },
    { n: 'MSTR', s: 'NASDAQ:MSTR' },
    { n: 'ASST', s: 'NASDAQ:ASST' },
    { n: 'MSTR vs BTC', s: 'NASDAQ:MSTR', cmp: 'BITSTAMP:BTCUSD' }
  ];
  var cs = { i: 0, style: '1', iv: 'D' };
  var tabs = $('[data-chart-tabs]');
  if (tabs) tabs.innerHTML = CHARTS.map(function (c, i) { return '<button data-ci="' + i + '">' + esc(c.n) + '</button>'; }).join('');
  function drawChart() {
    var c = CHARTS[cs.i] || CHARTS[cs.i = 0], box = $('[data-chart]'); if (!box) return;
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
    var b = e.target.closest('button'); if (!b || b.closest('.tc-pane')) return; // trading-desk charts handle their own buttons
    if (b.dataset.ci != null) { cs.i = +b.dataset.ci; drawChart(); }
    else if (b.hasAttribute('data-prev')) step(-1);
    else if (b.hasAttribute('data-next')) step(1);
    else if (b.dataset.style) { cs.style = b.dataset.style; $$('[data-style]').forEach(function (x) { x.classList.toggle('on', x === b); }); drawChart(); }
    else if (b.dataset.iv) { cs.iv = b.dataset.iv; $$('[data-iv]').forEach(function (x) { if (!x.closest('.tc-pane')) x.classList.toggle('on', x === b); }); drawChart(); }
  });
  document.addEventListener('keydown', function (e) {
    if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
    if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Escape' && document.body.classList.contains('dm')) exitDM();
  });
  drawChart();

  /* ---------- weekly data file ---------- */
  var DESK = null, live = { btc: null };
  if (window.BTD_FEED) { BTD_FEED.on('BTC', function (q) { live.btc = q.px; }); BTD_FEED.on('ETH', function (q) { live.eth = q.px; live.eth24 = q.chp; }); BTD_FEED.on('SOL', function (q) { live.sol = q.px; live.sol24 = q.chp; }); }
  function nyToday() { var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); return p; }
  function daysSince(iso) { return Math.max(0, Math.round((Date.parse(nyToday()) - Date.parse(iso)) / 864e5)); }
  fetch('/assets/data/desk.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    DESK = d; setTimeout(tkFetch, 0); setTimeout(paintDom, 0); var s = d.strategy, st = d.strive, ep = d.episode, v = d.video_of_week;
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
    var vm = $('[data-votw-more]'); if (vm) vm.innerHTML = (v.more || []).concat(v.strategy_link ? [v.strategy_link] : []).slice(0, 2).map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' &#8599;</a>'; }).join('');
    spotlight(d);
    board(d.treasuries);
    pdesk(d.prefs_desk);
    var MO = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }, yy = new Date().getFullYear(), today = new Date(); today.setHours(0, 0, 0, 0);
    var wk = d.week_ahead.filter(function (w) { var m = /([A-Z][a-z]{2}) (\d{1,2})/.exec(w.d || ''); if (!m || MO[m[1]] == null) return true; var t = new Date(yy, MO[m[1]], +m[2]); if (t - today > 200 * 864e5) t = new Date(yy - 1, MO[m[1]], +m[2]); return t >= today; });
    if (!wk.length) wk = [{ d: 'Next', e: 'The calendar refreshes with the Sunday update.' }];
    $('[data-week]').innerHTML = wk.map(function (w) { return '<li><b>' + esc(w.d) + '</b><span>' + esc(w.e) + '</span></li>'; }).join('');
    paintStrategyLive(); models();
  }).catch(function (e) { console.warn('desk.json unavailable', e); });

  /* ---------- Preferreds Desk (desk.json prefs_desk, Sunday refresh; live price/day change from TradingView) ---------- */
  function pdesk(P) {
    var tb = $('[data-pd-rows]'); if (!tb || !P) return;
    $('[data-pd-asof]').textContent = 'as of ' + dateLbl(P.as_of);
    tb.innerHTML = P.rows.map(function (r) {
      var ey = r.rate * r.par / r.close, nx = r.next_ex === 'daily' ? 'Daily' : r.next_ex ? dateLbl(r.next_ex) : '—';
      return '<tr><td><details class="pd-x"><summary><b>' + esc(r.t) + '</b><small>' + esc(r.issuer + ' ' + r.name) + '</small></summary><p>' + esc(r.explain) + ' <a href="' + esc(r.src.url) + '" target="_blank" rel="noopener">' + esc(r.src.name) + '</a></p></details></td>' +
        '<td class="pd-live"><div class="pd-tv" data-pd-tv="' + esc(r.tv) + '" data-tk="' + esc(r.t) + '"></div></td>' +
        '<td class="mono">' + r.rate.toFixed(2) + '%<small>' + esc(r.rate_kind) + '</small></td>' +
        '<td class="mono"><b>' + ey.toFixed(2) + '%</b><small>at $' + r.close.toFixed(2) + ' close</small></td>' +
        '<td title="' + esc(r.pay_note) + '">' + esc(r.pay) + '<small>' + esc(r.pay_note) + '</small></td>' +
        '<td class="mono">$' + r.par + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.rank) + '</td>' +
        '<td title="' + esc(r.next_ex_note) + '"><span class="mono">' + esc(nx) + '</span><small>' + esc(r.next_ex_note) + '</small></td></tr>';
    }).join('');
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); var el = e.target;
      tv(el, 'tickers', { symbols: [{ proName: el.dataset.pdTv, title: el.dataset.tk }], colorTheme: 'dark', isTransparent: true, showSymbolLogo: false, locale: 'en' }); }); }, { rootMargin: '200px' }) : null;
    $$('[data-pd-tv]').forEach(function (el) { if (io) io.observe(el); else tv(el, 'tickers', { symbols: [{ proName: el.dataset.pdTv, title: el.dataset.tk }], colorTheme: 'dark', isTransparent: true, showSymbolLogo: false, locale: 'en' }); });
    var up = $('[data-pd-up]');
    if (up) up.innerHTML = (P.upcoming || []).length ? '<b class="pd-uh">Upcoming / announced</b>' + P.upcoming.map(function (u) {
      return '<div class="pd-u"><span class="pd-st">' + esc(u.status) + '</span><span class="mono">' + esc(dateLbl(u.date)) + '</span><b>' + esc(u.company) + ': ' + esc(u.item) + '</b><span class="muted">' + esc(u.detail) + '</span><a href="' + esc(u.src.url) + '" target="_blank" rel="noopener">' + esc(u.src.name) + ' &#8599;</a></div>'; }).join('') : '';
    $('[data-pd-src]').textContent = P.note + ' Last close: ' + P.price_src.split(' (')[0] + ', ' + dateLbl(P.price_as_of) + '. Official sources: issuer 8-Ks, 10-Q, proxy and press releases (linked per row). Tap a ticker for a plain-English line. Education only, not investment advice.';
  }

  /* ---------- Treasury Board (compact; filters + pins saved locally) ---------- */
  var TB = null, tbSyms = '', tbT = null;
  var REG = { US: 'US', JP: 'JP', GB: 'EU', DE: 'EU', FR: 'EU', SE: 'EU', NL: 'EU' };
  var TYL = { treasury: 'pure-play', miner: 'miner', operating: 'operating' };
  function tbState() {
    var st = {}; try { st = JSON.parse(LS.get('btd_tb') || '{}') || {}; } catch (e) {}
    return { n: [10, 20, 50].indexOf(+st.n) >= 0 ? +st.n : 10, reg: st.reg || 'all', type: st.type || 'all', sort: st.sort || 'btc',
             open: !!st.open, live: !!st.live, fopen: !!st.fopen, pins: Array.isArray(st.pins) ? st.pins : [] };
  }
  var TBS = tbState();
  function tbSave() { LS.set('btd_tb', JSON.stringify(TBS)); }
  function shortDate(iso) { if (!iso) return '—'; var p = iso.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1] - 1] + ' ' + (+p[2]) + " '" + p[0].slice(2); }
  function board(t) {
    TB = t; stripAutoDefaults(); var el = $('#board'); if (!el || !t) return;
    $('[data-tb-asof]').textContent = 'as of ' + dateLbl(t.as_of);
    $('[data-tb-src]').innerHTML = 'Source: <a href="' + esc(t.src.url) + '" target="_blank" rel="noopener">' + esc(t.src.name) + '</a>. Education only, not investment advice. <details class="tb-notes"><summary>Notes</summary>' + esc(t.holdings_note) + ' ' + esc(t.pool_note) + ' ' + esc(t.mnav_note) + ' ' + esc(t.last_add_note) + ' ' + esc(t.prices) + ' ' + esc(t.excluded) + '</details>';
    tbPaint();
  }
  function tbList() {
    var rows = TB.rows.filter(function (r) {
      return (TBS.reg === 'all' || (REG[r.flag] || 'OT') === TBS.reg) && (TBS.type === 'all' || r.type === TBS.type);
    }).slice();
    rows.sort(function (a, b) {
      var pa = TBS.pins.indexOf(a.tk) >= 0, pb = TBS.pins.indexOf(b.tk) >= 0; if (pa !== pb) return pa ? -1 : 1;
      if (TBS.sort === 'mnav') { if ((a.mnav == null) !== (b.mnav == null)) return a.mnav == null ? 1 : -1; if (a.mnav != null && a.mnav !== b.mnav) return b.mnav - a.mnav; }
      return b.btc - a.btc;
    });
    return rows.slice(0, TBS.n);
  }
  function tbPaint() {
    if (!TB) return; var el = $('#board');
    $$('[data-tb-n]').forEach(function (b) { b.classList.toggle('on', +b.dataset.tbN === TBS.n); b.setAttribute('aria-pressed', +b.dataset.tbN === TBS.n ? 'true' : 'false'); });
    $$('[data-tb-g]').forEach(function (g) { $$('button', g).forEach(function (b) { var on = TBS[g.dataset.tbG] === b.dataset.v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }); });
    el.classList.toggle('open', TBS.open); el.classList.toggle('qopen', TBS.live); el.classList.toggle('fopen', TBS.fopen);
    var mb = $('[data-tb-more]'); mb.textContent = TBS.open ? 'Collapse' : 'Expand (' + (TBS.n === 50 ? 'all 50' : 'top ' + TBS.n) + ')'; mb.setAttribute('aria-expanded', TBS.open ? 'true' : 'false');
    var lb = $('[data-tb-live]'); lb.textContent = TBS.live ? 'Hide live prices' : 'Live prices'; lb.setAttribute('aria-expanded', TBS.live ? 'true' : 'false');
    $('[data-tb-ftog]').setAttribute('aria-expanded', TBS.fopen ? 'true' : 'false');
    var rows = tbList(), mx = TB.rows[0].btc;
    $('[data-tb] tbody').innerHTML = rows.length ? rows.map(function (r, i) {
      var pin = TBS.pins.indexOf(r.tk) >= 0;
      return '<tr class="' + (pin ? 'pin ' : '') + (i >= 5 ? 'x5' : '') + '"><td class="c-star"><button type="button" class="star' + (pin ? ' on' : '') + '" data-pin="' + esc(r.tk) + '" aria-pressed="' + pin + '" aria-label="' + (pin ? 'Unpin ' : 'Pin ') + esc(r.name) + '">' + (pin ? '&#9733;' : '&#9734;') + '</button></td>' +
        '<td class="muted">' + r.rank + '</td><td class="c-co">' + esc(r.name) + '<span class="fl">' + esc(r.flag) + '</span><span class="ty">' + TYL[r.type] + '</span></td>' +
        '<td class="tk">' + esc(r.tk) + '</td><td class="r"><span class="sbar" style="width:' + Math.max(1, Math.round(36 * Math.sqrt(r.btc / mx))) + 'px"></span>' + fmt(r.btc) + '</td>' +
        '<td class="r c-sec"' + (r.mnav_src ? ' title="' + esc(r.mnav_src) + '"' : '') + '>' + (r.mnav != null ? r.mnav.toFixed(2) + 'x' : '<span class="muted">—</span>') + '</td>' +
        '<td class="c-sec" title="' + esc(r.last_add_src || '') + '">' + (r.last_add ? shortDate(r.last_add) : '<span class="muted">—</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="7" class="tb-empty">No companies match these filters in the top 50.</td></tr>';
    var syms = rows.filter(function (r) { return r.tv; }).map(function (r) { return r.tv + '|' + r.tk; }).join(',');
    var q = $('[data-tb-quotes]'), wide = window.matchMedia('(min-width:721px)').matches;
    if (q && (wide || TBS.live || document.body.classList.contains('dm')) && syms !== tbSyms) {
      tbSyms = syms; clearTimeout(tbT);
      tbT = setTimeout(function () {
        if (!syms) { q.innerHTML = '<p class="tb-empty">No live quotes for this selection.</p>'; return; }
        tv(q, 'market-quotes', { width: '100%', height: '100%', isTransparent: true, colorTheme: 'dark', locale: 'en', showSymbolLogo: false, backgroundColor: 'rgba(0,0,0,0)',
          symbolsGroups: [{ name: 'Treasury Board', symbols: syms.split(',').map(function (x) { var p = x.split('|'); return { name: p[0], displayName: p[1] }; }) }] });
      }, 250);
    }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#board button'); if (!b) return;
    if (b.dataset.tbN) { TBS.n = +b.dataset.tbN; var sc = $('[data-tb-scroll]'); if (sc) sc.scrollTop = 0; }
    else if (b.dataset.pin) { var k = b.dataset.pin, i = TBS.pins.indexOf(k); if (i >= 0) TBS.pins.splice(i, 1); else TBS.pins.push(k); }
    else if (b.dataset.v && b.parentNode.dataset.tbG) TBS[b.parentNode.dataset.tbG] = b.dataset.v;
    else if (b.hasAttribute('data-tb-more')) TBS.open = !TBS.open;
    else if (b.hasAttribute('data-tb-live')) TBS.live = !TBS.live;
    else if (b.hasAttribute('data-tb-ftog')) TBS.fopen = !TBS.fopen;
    else return;
    tbSave(); tbPaint();
  });
  window.addEventListener('resize', function () { clearTimeout(tbT); tbT = setTimeout(tbPaint, 300); });
  document.addEventListener('click', function (e) { // strip "All 50" link/tile: open the board on All 50 and scroll to it
    var a = e.target.closest && e.target.closest('a.q-all, a.strip-all'); if (!a) return; e.preventDefault();
    TBS.n = 50; TBS.reg = 'all'; TBS.type = 'all'; tbSave(); tbPaint(); var sc = $('[data-tb-scroll]'); if (sc) sc.scrollTop = 0;
    var bd = $('#board'); if (bd) bd.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- stale-data dot + jargon tooltips ---------- */
  function tipN(n, t) { return '<span data-tip="' + esc(t) + '">' + esc(n) + '</span>'; }
  function stale(sel, bad, msg) {
    var h = $(sel + ' .p-h'); if (!h) return; var d = $('.stale', h);
    if (bad && !d) { d = document.createElement('span'); d.className = 'stale'; h.appendChild(d); }
    if (d) { d.hidden = !bad; d.title = msg || 'Some live data failed to load; showing the last saved values.'; d.setAttribute('aria-label', d.title); }
  }
  var tipEl = document.createElement('div'); tipEl.className = 'tipbox'; tipEl.setAttribute('role', 'tooltip'); tipEl.hidden = true; document.body.appendChild(tipEl);
  var tipFor = null;
  function showTip(el) { tipFor = el; tipEl.textContent = el.dataset.tip; tipEl.hidden = false;
    var r = el.getBoundingClientRect(), w = Math.min(260, window.innerWidth - 16); tipEl.style.maxWidth = w + 'px';
    var x = Math.max(8, Math.min(r.left, window.innerWidth - tipEl.offsetWidth - 8)), y = r.bottom + 6;
    if (y + tipEl.offsetHeight > window.innerHeight - 8) y = r.top - tipEl.offsetHeight - 6;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; }
  function hideTip() { tipEl.hidden = true; tipFor = null; }
  document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) showTip(t); else if (tipFor) hideTip(); });
  document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) { if (tipFor === t && !tipEl.hidden && e.pointerType !== 'mouse') hideTip(); else showTip(t); } else hideTip(); });
  document.addEventListener('focusin', function (e) { if (e.target.dataset && e.target.dataset.tip) showTip(e.target); });
  window.addEventListener('scroll', hideTip, { passive: true });

  /* ---------- BTC/ETH and BTC/SOL history (CoinGecko daily, 365 days, cached 6h) ---------- */
  var RT = { eth: null, sol: null, btc: null }, RTW = +LS.get('btd_rtw') === 30 ? 30 : 365;
  function hist(id) {
    var k = 'btd:h_' + id, c = null; try { c = JSON.parse(LS.get(k)); } catch (e) {}
    if (c && Date.now() - c.t < 6 * 3600e3) return Promise.resolve(c.d);
    return fetch('https://api.coingecko.com/api/v3/coins/' + id + '/market_chart?vs_currency=usd&days=365&interval=daily').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { var d = j.prices.map(function (p) { return [new Date(p[0]).toISOString().slice(0, 10), p[1]]; }); LS.set(k, JSON.stringify({ t: Date.now(), d: d })); return d; })
      .catch(function (e) { if (c) { c.stale = true; return c.d; } throw e; });
  }
  function ratioSeries(a, b) { var m = {}; b.forEach(function (x) { m[x[0]] = x[1]; }); var out = [], seen = {};
    a.forEach(function (x) { if (m[x[0]] && !seen[x[0]]) { seen[x[0]] = 1; out.push(x[1] / m[x[0]]); } }); return out; }
  function spark(cv, v) {
    var g = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 240, H = cv.clientHeight || 30;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), X = function (i) { return 1 + (W - 2) * i / (v.length - 1); }, Y = function (x) { return 2 + (H - 4) * (1 - (x - lo) / ((hi - lo) || 1)); };
    g.beginPath(); v.forEach(function (x, i) { i ? g.lineTo(X(i), Y(x)) : g.moveTo(X(i), Y(x)); });
    g.strokeStyle = '#F7931A'; g.lineWidth = 1.4; g.stroke();
    g.lineTo(X(v.length - 1), H); g.lineTo(X(0), H); g.closePath(); g.fillStyle = 'rgba(247,147,26,.08)'; g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(X(v.length - 1), Y(v[v.length - 1]), 2, 0, 7); g.fill();
  }
  function paintRatios() {
    $$('[data-rtw]').forEach(function (b) { b.classList.toggle('on', +b.dataset.rtw === RTW); });
    ['eth', 'sol'].forEach(function (k) {
      var s = RT[k]; if (!s || s.length < 40) return; s = s.slice();
      if (live.btc && live[k]) s[s.length - 1] = live.btc / live[k];
      var cur = s[s.length - 1], ago = function (n) { var x = s[s.length - 1 - n]; return x ? (cur / x - 1) * 100 : null; };
      var c = function (n, l) { var v = ago(n); return l + ' <b class="' + (v > 0 ? 'up' : v < 0 ? 'dn' : '') + '">' + pct(v, 1) + '</b>'; };
      $('[data-rt-c="' + k + '"]').innerHTML = c(7, '1W') + ' ' + c(30, '1M') + ' ' + c(s.length - 1, '1Y');
      spark($('[data-spark="' + k + '"]'), s.slice(-RTW));
      var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s), p = pctile(s, cur), U = k.toUpperCase(), line;
      if (cur >= hi * 0.995) line = 'BTC is at its 1-year high vs ' + U + '.';
      else if (cur <= lo * 1.005) line = 'BTC is at its 1-year low vs ' + U + '.';
      else if (p >= 80) line = 'BTC is near its 1-year high vs ' + U + '.';
      else if (p <= 20) line = 'BTC is near its 1-year low vs ' + U + '.';
      else line = 'BTC is mid-range vs ' + U + ' over the past year.';
      $('[data-rt-s="' + k + '"]').innerHTML = esc(line) + ' <span class="muted mono">1Y range ' + (k === 'eth' ? lo.toFixed(1) + '–' + hi.toFixed(1) : fmt(lo) + '–' + fmt(hi)) + ' · ' + Math.round(p) + 'th pctile</span>';
    });
  }
  Promise.all([hist('bitcoin'), hist('ethereum'), hist('solana')]).then(function (h) {
    RT.eth = ratioSeries(h[0], h[1]); RT.sol = ratioSeries(h[0], h[2]); paintRatios();
  }).catch(function () { stale('.p-field', true, 'Ratio history failed to load. Try again in a minute.'); $$('[data-rt-c]').forEach(function (e) { e.textContent = 'History unavailable'; }); });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rtw]'); if (!b) return; RTW = +b.dataset.rtw; LS.set('btd_rtw', String(RTW)); paintRatios(); });

  /* BTC dominance: live (CoinGecko) vs weekly history in desk.json (CoinMarketCap, Sunday samples) */
  function paintDom() {
    var H = DESK && DESK.dominance, box = $('[data-rt="dom"]'); if (!H || !box) return;
    var w = H.weekly.map(function (x) { return x[1]; }), cur = live.dom != null ? live.dom : w[w.length - 1], fresh = Date.now() - Date.parse(H.as_of + 'T00:00:00Z') < 3.5 * 864e5,
      s = fresh ? w.slice(0, -1).concat([cur]) : w.concat([cur]), n = s.length - 1; // the latest Sunday point is replaced by the live value when it is this week's
    var pp = function (k, l) { var x = s[n - k]; if (x == null) return ''; var v = cur - x; return l + ' <b class="' + (v > 0.05 ? 'up' : v < -0.05 ? 'dn' : '') + '">' + (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + 'pp</b>'; };
    $('[data-dom-ch]').innerHTML = [pp(1, '7d'), pp(4, '30d'), pp(13, '90d'), pp(52, '1Y')].join(' ');
    spark($('[data-spark="dom"]'), s);
    var lo = Math.min.apply(null, s), hi = Math.max.apply(null, s), at = hi > lo ? (cur - lo) / (hi - lo) * 100 : 50;
    $('[data-dom-rg]').innerHTML = '<span>' + lo.toFixed(1) + '%</span><i><b style="left:' + at.toFixed(1) + '%"></b></i><span>' + hi.toFixed(1) + '%</span>';
    var up = 0; for (var i = n - 3; i <= n; i++) if (s[i] > s[i - 1]) up++;
    var line = up >= 3 ? 'Rising ' + up + ' of the last 4 weeks: capital rotating into BTC.' : up <= 1 ? 'Falling ' + (4 - up) + ' of the last 4 weeks: alts gaining share.' : 'Mixed over the last 4 weeks: no clear rotation.';
    $('[data-rt-s="dom"]').innerHTML = esc(line) + ' <span class="muted mono">1Y range (weekly) · CoinMarketCap history to ' + esc(dateLbl(H.as_of)) + '</span>';
  }

  function paintStrategyLive() {
    if (!DESK || !live.btc) return; var s = DESK.strategy;
    var val = s.btc_held * live.btc, pl = (live.btc / s.avg_cost - 1) * 100;
    setLive('mstr-val', big(val), val); setLive('mstr-pl', pct(pl, 1), pl, true);
  }

  /* ---------- live market data (CoinGecko, fallback Coinbase) ---------- */
  var CG = 'https://api.coingecko.com/api/v3';
  function coinbaseSpot(sym) { return fetch('https://api.coinbase.com/v2/prices/' + sym + '-USD/spot').then(function (r) { return r.json(); }).then(function (j) { return +j.data.amount; }); }
  function pullPrices() {
    var FD = window.BTD_FEED; if (FD) { var fb = FD.get('BTC'), fe = FD.get('ETH'), fs = FD.get('SOL'); if (fb && fe && fs && fb.px && Date.now() - fb.t < 60e3) return Promise.resolve({ btc: fb.px, btc24: fb.chp, eth: fe.px, sol: fs.px, eth24: fe.chp, sol24: fs.chp, src: 'Coinbase' }); }
    return getJSON(CG + '/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', 'px', 45e3)
      .then(function (p) { return { btc: p.bitcoin.usd, btc24: p.bitcoin.usd_24h_change, eth: p.ethereum.usd, sol: p.solana.usd, eth24: p.ethereum.usd_24h_change, sol24: p.solana.usd_24h_change, src: 'CoinGecko' }; })
      .catch(function () { return Promise.all([coinbaseSpot('BTC'), coinbaseSpot('ETH'), coinbaseSpot('SOL')]).then(function (a) { return { btc: a[0], btc24: null, eth: a[1], sol: a[2], src: 'Coinbase' }; }); });
  }
  function paintAth() { var ath = athOf(); if (!ath || !live.btc) return; var dA = (live.btc / ath - 1) * 100; setLive('ath', dA >= -0.05 ? 'at ATH' : pct(dA, 1), dA, true); setLive('ath-v', usd(ath)); }
  function refreshMarket() {
    pullPrices().then(function (p) {
      live.btc = p.btc; live.eth = p.eth; live.sol = p.sol; live.eth24 = p.eth24; live.sol24 = p.sol24; fieldStale(); paintRatios();
      setLive('btc', usd(p.btc), p.btc); setLive('btc-24h', p.btc24 == null ? '—' : pct(p.btc24), p.btc24, true);
      setLive('btceth', (p.btc / p.eth).toFixed(2) + ' ETH', p.btc / p.eth); setLive('btcsol', fmt(p.btc / p.sol, 1) + ' SOL', p.btc / p.sol);
      setLive('sats', fmt(1e8 / p.btc) + ' sats', 1e8 / p.btc);
      paintAth();
      var nh = Date.UTC(2024, 3, 20) + 210000 * 600e3, dh = Math.max(0, Math.ceil((nh - Date.now()) / 864e5)); setLive('halv', '~' + fmt(dh) + ' days (' + new Date(nh).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) + ')');
      var a = $('[data-field-asof]'); if (a) a.textContent = p.src + ' · ' + new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
      paintStrategyLive(); models(); ticker();
    }).catch(function () { setLive('btc', 'unavailable', null); stale('.p-field', true, 'Live prices failed to load. Retrying every minute.'); });
    getJSON(CG + '/global', 'global', 5 * 60e3).then(function (g) {
      var dom = g.data.market_cap_percentage.btc; setLive('dom', dom.toFixed(2) + '%', +dom.toFixed(2)); live.dom = dom; paintDom(); ticker(); fieldStale();
    }).catch(function () { setLive('dom', '—', null); stale('.p-field', true, 'BTC dominance failed to load.'); });
    getJSON('https://api.alternative.me/fng/?limit=31', 'fng', 30 * 60e3).then(function (f) {
      var d = f.data, v = +d[0].value; setLive('fng', String(v), v); setLive('fng-cls', d[0].value_classification, null); setBar('fng', v);
      setLive('fng-hist', [d[1], d[7], d[30]].map(function (x) { return x ? x.value : '—'; }).join(' · '), null); live.fng = v + ' ' + d[0].value_classification; ticker();
    }).catch(function () { setLive('fng', '—', null); stale('.p-field', true, 'Fear & Greed failed to load.'); });
  }
  refreshMarket(); setInterval(refreshMarket, REFRESH_MS);

  /* ---------- Bitcoin models (client-side) ---------- */
  var HIST = null;
  fetch('/assets/data/btc_daily.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (h) { HIST = h; models(); paintAth(); }).catch(function (e) { console.warn('btc_daily.json unavailable', e); stale('.p-models', true, 'Daily history failed to load.'); stale('.p-zones', true, 'Daily history failed to load.'); });
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
      [tipN('Power Law trend', 'Long-run trend line fitted to BTC\'s price over time (log-log).'), usd(pl[last]), rPl[last].toFixed(2) + 'x', pctile(rPl, rPl[last]), 'https://charts.bitbo.io/long-term-power-law/'],
      [tipN('200-week MA', 'Average BTC price over the last 200 weeks (about 4 years).'), usd(wma[last]), rWma[last].toFixed(2) + 'x', pctile(rWma, rWma[last]), 'https://charts.blockhorizon.io/charts/pb-200wma'],
      [tipN('Mayer Multiple (200D)', 'BTC price divided by its 200-day average. Above 1 means above trend.'), usd(m200[last]), rMay[last].toFixed(2) + 'x', pctile(rMay, rMay[last]), 'https://charts.checkonchain.com/'],
      [tipN('Pi Cycle Top (111D / 2×350D)', 'Compares the 111-day average with 2× the 350-day average; a cross has marked past cycle peaks.'), usd(m111[last]) + ' / ' + usd(m350[last]), '111D at ' + (rPi[last] * 100).toFixed(0) + '% of 2×350D', null, 'https://www.lookintobitcoin.com/charts/pi-cycle-top-indicator/'],
      [tipN('MVRV (price / realized)', 'Market price vs realized price (average price each coin last moved at).'), realized ? usd(realized) : '—', mvrv ? mvrv.toFixed(2) + 'x' : '—', null, 'https://www.lookintobitcoin.com/charts/mvrv-zscore/'],
      [tipN('Stock-to-Flow (PlanB)', 'PlanB\'s model valuing BTC by its scarcity: existing supply vs new supply.'), usd(s2f(T(last))), rS2f[last].toFixed(2) + 'x', pctile(rS2f, rS2f[last]), 'https://charts.blockhorizon.io/charts/pb-s2f']
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
    drawModelChart(c, wma, pl, m350, m111, T, m200, realized);
  }
  /* Models chart: toggleable overlays on log-scale BTC (saved in localStorage 'btd_mchart') */
  var MC_DEF = { pl: 1, s2f: 0, wma: 1, pi: 1, may: 0, rp: 0 };
  var MC = (function () { var s = {}; try { s = JSON.parse(LS.get('btd_mchart') || '{}') || {}; } catch (e) {} var o = {}; Object.keys(MC_DEF).forEach(function (k) { o[k] = s[k] == null ? MC_DEF[k] : s[k] ? 1 : 0; }); return o; })();
  var MC_LBL = { pl: 'Power Law band', s2f: 'Stock-to-Flow', wma: '200W MA', pi: 'Pi Cycle', may: 'Mayer bands', rp: 'Realized / MVRV' };
  var MC_TIP = {
    pl: 'Power Law trend (dashed) with a shaded band: the 5th to 95th percentile of BTC\u2019s own price vs that trend since 2015.',
    s2f: 'PlanB stock-to-flow model value, computed here from the halving-schedule supply (same formula as the table).',
    wma: 'Average BTC price over the last 200 weeks.',
    pi: '111-day average and 2\u00d7 the 350-day average. Dots mark past days the 111D crossed above.',
    may: '200-day average (Mayer 1.0) with 0.8\u00d7 and 2.4\u00d7 bands, levels often cited for the Mayer Multiple.',
    rp: 'Current realized price and 3\u00d7 realized (MVRV 3). Only today\u2019s value is published in our weekly data, so these are flat reference lines, not history.'
  };
  var mcLast = null;
  (function () {
    var box = $('[data-mc-chips]'); if (!box) return;
    box.innerHTML = '<span class="mc-btc" aria-hidden="true">BTC</span>' + Object.keys(MC_DEF).map(function (k) {
      return '<button type="button" class="mc-c mc-' + k + '" data-mc="' + k + '" aria-pressed="' + (MC[k] ? 'true' : 'false') + '" title="' + esc(MC_TIP[k]) + '">' + esc(MC_LBL[k]) + '</button>';
    }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mc]'); if (!b) return; var k = b.dataset.mc; MC[k] = MC[k] ? 0 : 1;
      b.setAttribute('aria-pressed', MC[k] ? 'true' : 'false'); LS.set('btd_mchart', JSON.stringify(MC));
      if (mcLast) drawModelChart.apply(null, mcLast);
    });
  })();
  function drawModelChart(c, wma, pl, m350, m111, T, m200, realized) {
    mcLast = [c, wma, pl, m350, m111, T, m200, realized];
    var cv = $('[data-model-chart]'); if (!cv) return; var dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 900, H = Math.round(W < 640 ? W * 0.62 : W / 3);
    cv.width = W * dpr; cv.height = H * dpr; var g = cv.getContext('2d'); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    var n = c.length, i;
    // series for overlays
    var r = c.map(function (v, j) { return v / pl[j]; }).filter(function (x) { return isFinite(x); }).sort(function (a, b) { return a - b; });
    var q05 = r[Math.floor(r.length * 0.05)], q95 = r[Math.floor(r.length * 0.95)];
    var plLo = pl.map(function (v) { return v * q05; }), plHi = pl.map(function (v) { return v * q95; });
    var sf = new Array(n); for (i = 0; i < n; i++) sf[i] = s2f(T(i));
    var mLo = m200.map(function (v) { return v == null ? null : v * 0.8; }), mHi = m200.map(function (v) { return v == null ? null : v * 2.4; });
    var rpOn = MC.rp && realized;
    var vis = [c]; if (MC.pl) vis.push(plLo, plHi); if (MC.s2f) vis.push(sf); if (MC.wma) vis.push(wma); if (MC.pi) vis.push(m350, m111); if (MC.may) vis.push(mLo, mHi);
    var mn = Infinity, mx = 0; vis.forEach(function (a) { a.forEach(function (v) { if (v != null && v > 0) { if (v < mn) mn = v; if (v > mx) mx = v; } }); });
    if (rpOn) { mx = Math.max(mx, realized * 3); mn = Math.min(mn, realized); }
    var lo = Math.log10(Math.max(50, mn / 1.4)), hi = Math.log10(mx * 1.4), pad = { l: 44, r: 8, t: 8, b: 18 };
    var X = function (j) { return pad.l + (W - pad.l - pad.r) * j / (n - 1); }, Y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - (Math.log10(v) - lo) / (hi - lo)); };
    g.font = '10px ui-monospace,monospace'; g.fillStyle = '#5d6672'; g.strokeStyle = '#161a20'; g.lineWidth = 1;
    [1e2, 1e3, 1e4, 1e5, 1e6, 1e7].forEach(function (v) { var lv = Math.log10(v); if (lv > hi || lv < lo) return; var y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke(); g.fillText(v >= 1e6 ? '$' + v / 1e6 + 'M' : v >= 1e3 ? '$' + v / 1e3 + 'k' : '$' + v, 4, y + 3); });
    var y1 = new Date(T(0)).getUTCFullYear() + 1, y2 = new Date(T(n - 1)).getUTCFullYear(), stepY = W < 640 ? 4 : 2;
    for (var y0 = y1 + (y1 % 2); y0 <= y2; y0 += stepY) { var i0 = Math.round((Date.UTC(y0, 0, 1) - T(0)) / 864e5); g.fillText(String(y0), X(i0) - 12, H - 4); }
    g.save(); g.beginPath(); g.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b); g.clip();
    var st2 = n > 1200 && W < 640 ? 3 : 2;
    function line(a, col, w, dash) { g.beginPath(); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); var st = false;
      for (var j = 0; j < n; j += st2) { var v = a[j]; if (v == null || v <= 0) { st = false; continue; } var x = X(j), y = Y(v); if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); }
      if (a[n - 1] != null && a[n - 1] > 0 && st) g.lineTo(X(n - 1), Y(a[n - 1]));
      g.stroke(); g.setLineDash([]); }
    function band(a, b, fill) { g.beginPath(); var j, started = false;
      for (j = 0; j < n; j += st2) { if (a[j] == null) continue; if (!started) { g.moveTo(X(j), Y(a[j])); started = true; } else g.lineTo(X(j), Y(a[j])); }
      for (j = n - 1; j >= 0; j -= st2) { if (b[j] == null) continue; g.lineTo(X(j), Y(b[j])); }
      g.closePath(); g.fillStyle = fill; g.fill(); }
    function hline(v, col, dash, lbl) { var y = Y(v); g.beginPath(); g.strokeStyle = col; g.lineWidth = 1; g.setLineDash(dash || []); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke(); g.setLineDash([]);
      g.fillStyle = col; g.fillText(lbl, pad.l + 4, y - 3); }
    if (MC.pl) { band(plLo, plHi, 'rgba(247,147,26,.09)'); line(plLo, 'rgba(247,147,26,.35)', 0.8); line(plHi, 'rgba(247,147,26,.35)', 0.8); line(pl, '#F7931A', 1.2, [4, 3]); }
    if (MC.may) { line(mLo, 'rgba(74,168,255,.55)', 0.9, [3, 3]); line(mHi, 'rgba(74,168,255,.55)', 0.9, [3, 3]); line(m200, '#4aa8ff', 1); }
    if (MC.s2f) line(sf, '#b18cff', 1.3);
    if (MC.pi) { line(m350, '#ff5a5f', 1, [2, 3]); line(m111, 'rgba(255,90,95,.55)', 1);
      g.fillStyle = '#ff5a5f'; for (i = 1; i < n; i++) if (m350[i] && m350[i - 1] && m111[i] >= m350[i] && m111[i - 1] < m350[i - 1]) { g.beginPath(); g.arc(X(i), Y(m111[i]), 3.5, 0, 7); g.fill(); } }
    if (MC.wma) line(wma, '#2fd17c', 1.4);
    if (rpOn) { hline(realized, '#e8b04a', [5, 3], 'Realized ' + usd(realized) + ' (today)'); hline(realized * 3, 'rgba(232,176,74,.6)', [2, 3], 'MVRV 3\u00d7 ' + usd(realized * 3)); }
    line(c, '#e6e9ee', 1.1);
    g.restore();
    var lx = X(n - 1), ly = Y(c[n - 1]); g.fillStyle = '#F7931A'; g.beginPath(); g.arc(lx, ly, 3, 0, 7); g.fill();
    cv.setAttribute('aria-label', 'BTC price since ' + new Date(T(0)).getUTCFullYear() + ', log scale' + (Object.keys(MC).filter(function (k) { return MC[k]; }).length ? ', with ' + Object.keys(MC).filter(function (k) { return MC[k]; }).map(function (k) { return MC_LBL[k]; }).join(', ') : ''));
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
    var mt = $('[data-mstr-mkt]'); if (mt) { var ml = st && st[2] === 'open' ? '' : (st ? st[3] : 'Market closed'); mt.textContent = ml; mt.hidden = !ml; }
    var s = Math.max(0, Math.round((nxt - now) / 1e3)), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
    $('[data-mkt-cd]').textContent = nxt ? lbl + (hh >= 24 ? Math.floor(hh / 24) + 'd ' + (hh % 24) + 'h' : hh + 'h ' + String(mm).padStart(2, '0') + 'm ' + String(ss).padStart(2, '0') + 's') : '';
    $('[data-ny]').textContent = new Date(now).toISOString().slice(11, 16) + ' ET';
    /* futures (CME Globex equity index: Sun 6 PM - Fri 5 PM ET, daily 5-6 PM break) + weekend BTC since Friday's 4 PM ET close */
    var fe = $('[data-ms-fut]'); if (fe) { var w = new Date(now), wd2 = w.getUTCDay(), hm = w.getUTCHours() + w.getUTCMinutes() / 60, fo = !(wd2 === 6 || (wd2 === 5 && hm >= 17) || (wd2 === 0 && hm < 18) || (hm >= 17 && hm < 18));
      var fn = 0; if (!fo) { fn = wd2 === 6 ? (24 - hm) * 36e5 + 18 * 36e5 : wd2 === 5 ? (24 - hm + 24 + 18) * 36e5 : wd2 === 0 ? (18 - hm) * 36e5 : (18 - hm) * 36e5; }
      fe.innerHTML = 'Futures <b class="' + (fo ? 'up' : 'dn') + '">' + (fo ? 'open' : 'closed') + '</b>' + (!fo && fn ? ' <small>opens in ' + (fn >= 864e5 ? Math.floor(fn / 864e5) + 'd ' : '') + Math.floor(fn % 864e5 / 36e5) + 'h ' + Math.floor(fn % 36e5 / 6e4) + 'm</small>' : ''); }
    var be = $('[data-ms-btcf]'); if (be) { var wdx = new Date(now).getUTCDay(), hx = new Date(now).getUTCHours(), wk = wdx === 6 || wdx === 0 || (wdx === 5 && hx >= 16) || (wdx === 1 && hx < 9) || (wdx === 1 && hx === 9 && new Date(now).getUTCMinutes() < 30);
      if (!wk) { be.hidden = true; } else { be.hidden = false; if (!clock.fri && !clock.friL) { clock.friL = 1; var d0 = new Date(now), back = (d0.getUTCDay() + 2) % 7, fri = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate() - back, 16) - (now - Date.now()); /* ET wall -> real UTC */
          fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60&start=' + new Date(fri - 6e4).toISOString() + '&end=' + new Date(fri + 4 * 6e4).toISOString()).then(function (r) { return r.json(); }).then(function (a) { if (Array.isArray(a) && a.length) { a.sort(function (x, y) { return x[0] - y[0]; }); var c = a.filter(function (x) { return x[0] * 1e3 <= fri; }).pop() || a[0]; clock.fri = c[4]; } }).catch(function () {}); }
        var bq = window.BTD_FEED && window.BTD_FEED.get('BTC'); if (clock.fri && bq && bq.px) { var ch = (bq.px / clock.fri - 1) * 100; be.innerHTML = 'BTC since Fri close <b class="' + (ch >= 0 ? 'up' : 'dn') + '">' + (ch >= 0 ? '+' : '\u2212') + Math.abs(ch).toFixed(2) + '%</b>'; } } }
  }
  clock(); setInterval(clock, 1000);

  /* ---------- Strategy Spotlight (same panel as /members/; strategy.com first) ---------- */
  function spotlight(D) {
    var box = $('[data-spot]'); if (!box) return; var set = function (k, h) { var e = $('[data-sp="' + k + '"]', box); if (e) e.innerHTML = h; }, s = D.strategy;
    set('mnav', s.mnav.toFixed(2) + 'x'); set('mnav-s', 'MSTR mNAV · ' + esc(s.kpi_as_of));
    var PR = (D.prefs_desk ? D.prefs_desk.rows : []), EY = PR.map(function (x) { return x.rate * x.par / x.close; }); if (EY.length) { set('strc', Math.min.apply(0, EY).toFixed(1) + '–' + Math.max.apply(0, EY).toFixed(1) + '%'); set('strc-s', 'effective yield range · ' + PR.map(function (x) { return x.t; }).join(' · ')); }
    set('btc', fmt(s.btc_held) + ' ₿'); set('btc-s', 'as of ' + dateLbl(s.btc_as_of) + ' · ' + fmt(s.sats_per_share) + ' sats/share');
    fetch('/assets/data/strategy.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (S) {
      var rows = S.purchases.filter(function (x) { return x.adso_k; }), last = rows[rows.length - 1], yr = last.date.slice(0, 4), base = null; rows.forEach(function (x) { if (x.date < yr) base = x; });
      if (base) { set('yield', pct((last.holdings / last.adso_k / (base.holdings / base.adso_k) - 1) * 100, 1)); set('yield-s', dateLbl(base.date) + ' → ' + dateLbl(last.date) + ' · strategy.com ledger'); } }).catch(function () {});
    fetch('/assets/data/quotes.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (Q) {
      var q = Q.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0]; if (!q) return;
      set('quote', '&ldquo;' + esc(q.text.length > 200 ? q.text.slice(0, 197) + '…' : q.text) + '&rdquo;<cite>Michael Saylor · ' + esc(q.date_label || q.date) + (q.url ? ' · <a href="' + esc(q.url) + '" target="_blank" rel="noopener">source</a>' : '') + '</cite>'); }).catch(function () {});
  }

  /* ---------- optional thin ticker (off by default) ---------- */
  var tk = $('[data-ticker]'), tkBtn = $('[data-ticker-toggle]'); if (tk) tk.title = 'Crypto: Coinbase. Stocks, indexes and macro: CNBC quote service (some delayed). Hover any item for its source.';
  var MET = null; fetch('/assets/data/metrics.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { MET = m; ticker(); }).catch(function () {});
  /* Price scroll: top 20 by BTC held (+ Strive and Smarter Web), preferreds, key data, then BTC vs alts. Live via CNBC (same feed as the tiles), last close as fallback. */
  var TKQ = {}, TKP = ['STRC', 'STRF', 'STRK', 'STRD', 'SATA'];
  function tkRows() { if (!DESK) return []; var r = DESK.treasuries.rows.slice().sort(function (a, b) { return b.btc - a.btc; }), L = r.slice(0, 20);
    ['ASST', 'SWC'].forEach(function (t) { if (!L.some(function (x) { return x.tk === t; })) { var x = r.filter(function (y) { return y.tk === t; })[0]; if (x) L.push(x); } }); return L; }
  function tkCn(r) { return r.tk === 'SWC' ? 'SWC-GB' : r.tv ? qtCnbc(r.tv) : null; }
  function tkFetch() {
    if (!tk || tk.hidden || document.hidden || !DESK) return; var sy = [];
    tkList().forEach(function (x) { var m = x.id[0] === 'M' ? TKM[x.id.slice(2)] : null; (m ? [m[1], m[2]] : x.id === 'S:MPJPY' ? ['MPJPY', '3350.T'] : [x.id[0] === 'S' ? tkCnOf(x) : x.id[0] === 'P' ? x.tk : null]).forEach(function (c) { if (c && sy.indexOf(c) < 0) sy.push(c); }); });
    tkList().forEach(function (x) { var k = x.id.slice(2); if (x.id[0] === 'C' && k !== 'ETH' && k !== 'SOL') cbStats(k).then(ticker).catch(function () {}); });
    if (!sy.length) return;
    fetch(CNURL + encodeURIComponent(sy.join('|'))).then(function (r) { return r.json(); }).then(function (j) {
        var arr = (j.FormattedQuoteResult || {}).FormattedQuote || []; arr = Array.isArray(arr) ? arr : [arr];
        arr.forEach(function (x) { var px = parseFloat(String(x.last).replace(/,/g, '')); if (!isFinite(px) || String(x.code) !== '0') return;
          TKQ[x.symbol] = { px: px, chp: parseFloat(String(x.change_pct).replace(/[%+,]/g, '')), cur: x.currencyCode }; });
        ticker(); }).catch(function () {});
  }
  setInterval(tkFetch, 60000);
  function tkPx(q) { if (q.cur === 'JPY') return '¥' + Math.round(q.px).toLocaleString('en-US'); return q.cur === 'GBp' ? q.px.toFixed(2) + 'p' : q.cur && q.cur !== 'USD' ? q.px.toFixed(2) + ' ' + q.cur : '$' + (q.px < 10 ? q.px.toFixed(3) : q.px.toFixed(2)); }
  function mstrLive() { var q = TKQ.MSTR || QT['NASDAQ:MSTR']; return q && q.px ? q.px : (LAST && LAST.q.MSTR ? LAST.q.MSTR.c : null); }
  // Live mNAV, strategy.com method: EV (MSTR price x implied shares + debt + pref - USD reserve/cash) / (BTC held x BTC price).
  window.btdLiveMnav = function (K, mstr, btc) { var L = K && K.live; if (!L || !mstr || !btc) return null; var sh = L.market_cap_musd / L.mstr_close, cash = L.market_cap_musd + L.debt_musd + L.pref_musd - L.ev_musd;
    return (mstr * sh + L.debt_musd + L.pref_musd - cash) / (L.btc_held * btc / 1e6); };
  /* Ribbon list: default = top 20 + ASST/SWC, all preferreds, key data, then ETH and SOL. Visitors can add, remove and reorder; saved in 'btd_tk2'. */
  var TKD = { HOLD: 'Strategy BTC held', BPS: 'Strategy sats per share (BTC held ÷ implied shares)', FUND: 'BTC perp funding (Deribit)', SESS: 'US market session', NEXT: 'Next key date', S2S10: '2s10s spread (10Y minus 2Y)', BTC: 'BTC price', MNAV: 'MSTR mNAV (live)', GAIN: 'Strategy BTC Gain YTD', DOM: 'BTC dominance', BTCETH: 'BTC/ETH', BTCSOL: 'BTC/SOL', FNG: 'Fear & Greed', ATH: 'From ATH', PLAW: 'Power Law position', HALV: 'Days to halving' };
  var TKDL = { HOLD: 'MSTR BTC', BPS: 'Sats/share', FUND: 'Funding', SESS: 'Session', NEXT: 'Next', S2S10: '2s10s', BTC: 'BTC', MNAV: 'MSTR mNAV', GAIN: 'Strategy BTC Gain YTD', DOM: 'BTC.D', BTCETH: 'BTC/ETH', BTCSOL: 'BTC/SOL', FNG: 'Fear & Greed', ATH: 'From ATH', PLAW: 'Power Law', HALV: 'Halving' };
  var TK_ID = /^[SPDCM]:[A-Z0-9.\-]{1,15}$/, TK_CN = /^[A-Z0-9.@=\-]{1,15}$/;
  var TKM = { SPX: ['S&P 500', '.SPX', '@SP.1', 'ix', 'SPX S&P 500', 'ES=F S&P fut'], IXIC: ['Nasdaq', '.IXIC', '@ND.1', 'ix', 'IXIC Nasdaq', 'NQ=F Nasdaq fut'], DJI: ['Dow', '.DJI', '@DJ.1', 'ix', 'DJI Dow', 'YM=F Dow fut'], GOLD: ['Gold', '@GC.1', null, 'cm', 'GC=F Gold fut'], OIL: ['WTI oil', '@CL.1', null, 'cm', 'CL=F WTI fut'], US10Y: ['US 10Y', 'US10Y', null, 'yd', 'US10Y'], DXY: ['DXY', '.DXY', null, 'ix', 'DXY'], VIX: ['VIX', '.VIX', null, 'ix', 'VIX'], SILVER: ['Silver', '@SI.1', null, 'cm', 'SI=F Silver fut'], US2Y: ['US 2Y', 'US2Y', null, 'yd', 'US2Y'], US5Y: ['US 5Y', 'US5Y', null, 'yd', 'US5Y'], US30Y: ['US 30Y', 'US30Y', null, 'yd', 'US30Y'], COPPER: ['Copper', '@HG.1', null, 'cm', 'HG=F Copper fut'], NATGAS: ['Natural gas', '@NG.1', null, 'cm', 'NG=F Nat gas fut'], RUT: ['Russell 2000', '.RUT', null, 'ix', 'RUT Russell 2000'], N225: ['Nikkei 225', '.N225', null, 'ix', 'N225 Nikkei'], STOXX: ['Stoxx 600', '.STOXX', null, 'ix', 'SXXP Stoxx 600'], FTSE: ['FTSE 100', '.FTSE', null, 'ix', 'FTSE 100'], DAX: ['DAX', '.GDAXI', null, 'ix', 'DAX'], HSI: ['Hang Seng', '.HSI', null, 'ix', 'HSI Hang Seng'], EURUSD: ['EUR/USD', 'EUR=', null, 'fx', 'EUR/USD'], USDJPY: ['USD/JPY', 'JPY=', null, 'fx', 'USD/JPY'] };
  var TK_LBL = { MPJPY: 'MPJPY', MTPLF: 'MTPLF', '3350.T': '3350.T' };
  var TKM_DEF = ['SPX', 'IXIC', 'US10Y', 'DXY', 'VIX', 'GOLD', 'OIL'], TKC = {};
  function tkCoinPx(v) { return v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : v >= 1 ? '$' + v.toFixed(2) : '$' + v.toPrecision(4); }
  function cbStats(sym) { return fetch('https://api.exchange.coinbase.com/products/' + encodeURIComponent(sym) + '-USD/stats').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { var l = parseFloat(j.last), o = parseFloat(j.open); if (!isFinite(l)) throw 0; TKC[sym] = { px: l, chp: o ? (l / o - 1) * 100 : null }; return TKC[sym]; }); }
  function tkMq(k) { var m = TKM[k], F = window.BTD_FEED; if (!m) return null; var open = F && F.session ? F.session() === 'open' : true, g = function (c) { return c ? (TKQ[c] || (F && F.get(c))) : null; }, fu = !open && m[2] ? g(m[2]) : null, q = fu && fu.px != null ? fu : g(m[1]); return q && q.px != null ? { q: q, fut: !!(fu && fu.px != null) } : null; }
  function tkPrefs() { var PT = TKP.slice(); (DESK && DESK.prefs_desk ? DESK.prefs_desk.rows : []).forEach(function (x) { if (PT.indexOf(x.t) < 0) PT.push(x.t); }); return PT; }
  /* Views: one-tap presets, each its own editable list. 'desk' = the original default (custom list stays in 'btd_tk2');
     the others + current view + sort live in 'btd_tk3' {v, sort, L:{view:[items]}}. Items may carry h:1 (hidden, kept in the list). */
  /* Altcoins preset: BTC first, then the top 10 (or 20, btd_tk_altn) altcoins by market cap from CoinGecko, no stablecoins or wrapped tokens */
  var ALTS = [], altAt = 0, AST = /^(usdt|usdc|usde|dai|usds|fdusd|pyusd|tusd|usdd|usd1|frax|busd|usdtb|rlusd|gusd|usdp|susde|bsc-usd|usdf|usdg|eurc|xaut|paxg)$/i, AWR = /^(wbtc|weth|steth|wsteth|cbbtc|weeth|reth|wbeth|lbtc|solvbtc|btcb|bnsol|jitosol|msol|meth|ezeth|rseth|tbtc|leo|figr_heloc|wbnb|hbtc|clbtc|bbtc)$/i;
  /* Altcoins config 'btd_alts' {n:10|20, add:[typed coins, max 10], rm:[top-N coins removed]}; migrates the old 'btd_tk_altn' key and any frozen saved Altcoins list */
  var ALLA = [];
  function altCfg() { var o = null; try { o = JSON.parse(localStorage.getItem('btd_alts') || 'null'); } catch (e) {}
    if (!o || typeof o !== 'object') { o = { n: 10, add: [], rm: [] }; try { if (localStorage.getItem('btd_tk_altn') === '20') o.n = 20; localStorage.removeItem('btd_tk_altn');
      var t3 = JSON.parse(localStorage.getItem('btd_tk3') || 'null'); if (t3 && t3.L && t3.L.alts) { delete t3.L.alts; localStorage.setItem('btd_tk3', JSON.stringify(t3)); } } catch (e) {} }
    var ok = function (a) { return (Array.isArray(a) ? a : []).filter(function (x) { return typeof x === 'string' && /^[A-Z0-9]{2,10}$/.test(x); }); };
    return { n: o.n === 20 ? 20 : 10, add: ok(o.add).slice(0, 10), rm: ok(o.rm).slice(0, 20) }; }
  function altCfgSave(c) { LS.set('btd_alts', JSON.stringify(c)); }
  function altBase() { ALTS = ALLA.slice(0, altCfg().n); return ALTS; }
  function altCoins() { var c = altCfg(), B = (ALLA.length ? altBase() : ['ETH', 'SOL']).filter(function (x) { return c.rm.indexOf(x) < 0; }); c.add.forEach(function (x) { if (B.indexOf(x) < 0) B.push(x); }); return B; }
  function altTop() { if (Date.now() - altAt < 5 * 60e3) return; altAt = Date.now();
    fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (a) { if (!Array.isArray(a)) return;
      var L = a.filter(function (c) { return c.symbol !== 'btc' && !AST.test(c.symbol) && !AWR.test(c.symbol) && c.current_price; }).slice(0, 20); ALLA = L.map(function (c) { var S = c.symbol.toUpperCase(); if (S !== 'ETH' && S !== 'SOL') TKC[S] = { px: c.current_price, chp: c.price_change_percentage_24h }; return S; }); altBase(); ticker(); }).catch(function () { altAt = 0; }); }
  function altPx(c) { if (c === 'ETH') return live.eth ? [live.eth, live.eth24] : null; if (c === 'SOL') return live.sol ? [live.sol, live.sol24] : null; return TKC[c] ? [TKC[c].px, TKC[c].chp] : null; }
  var TKV = [['desk', 'Bitcoin Desk'], ['stocks', 'Treasury'], ['macro', 'Macro'], ['fut', 'Futures & Indexes'], ['crypto', 'Crypto'], ['movers', 'Biggest Movers'], ['alts', 'Altcoins'], ['mine', 'My Mix']];
  /* Addable groups (different types of info, all from data already on the site); merged into My Mix, de-duped, capped at TK_CAP */
  var TK_CAP = 40, TKDI = function (a) { return a.map(function (k) { return { id: 'D:' + k, tk: TKDL[k] }; }); }, TKMI = function (a) { return a.map(function (k) { return { id: 'M:' + k, tk: TKM[k][0] }; }); };
  var TKG = [['Treasury companies', 'top holders by BTC', function () { return tkDefault('stocks'); }], ['Treasury metrics', 'mNAV, Strategy BTC held, sats per share, BTC Gain YTD', function () { return TKDI(['MNAV', 'HOLD', 'BPS', 'GAIN']); }],
    ['Macro', 'US10Y, US30Y (bp change), 2s10s, DXY, VIX, gold, oil', function () { return TKMI(['US10Y', 'US30Y']).concat(TKDI(['S2S10']), TKMI(['DXY', 'VIX', 'GOLD', 'OIL'])); }], ['Futures & indexes', 'S&P, Nasdaq, Dow, Russell, metals, oil, Nikkei, Stoxx', function () { return tkDefault('fut'); }],
    ['Ratios', 'BTC/ETH, BTC/SOL with context, BTC dominance', function () { return TKDI(['BTCETH', 'BTCSOL', 'DOM']); }], ['Crypto', 'BTC, ETH, SOL, Fear & Greed, from ATH', function () { return [{ id: 'D:BTC', tk: 'BTC' }, { id: 'C:ETH', tk: 'ETH' }, { id: 'C:SOL', tk: 'SOL' }].concat(TKDI(['FNG', 'ATH'])); }],
    ['Altcoins', 'your Altcoins list (Top 10/20 + typed)', function () { return altCoins().map(function (c) { return { id: 'C:' + c, tk: c }; }); }], ['Derivatives', 'BTC perp funding (Deribit, 8h + annualized)', function () { return TKDI(['FUND']); }],
    ['Market status', 'US session, next key date', function () { return TKDI(['SESS', 'NEXT']); }], ['Biggest movers', 'treasury names + Mag 7, sorted by move', function () { return tkDefault('movers'); }]];
  function tkGroup(gi, add) { var g = TKG[gi]; if (!g) return; var L = tkList().slice(), it = g[2](), ids = {}; it.forEach(function (x) { ids[x.id] = 1; });
    if (add) { var n0 = L.length; it.forEach(function (x) { if (L.length < TK_CAP && !L.some(function (y) { return y.id === x.id; })) L.push({ id: x.id, tk: x.tk, cn: x.cn || null }); }); var added = L.length - n0, skip = it.filter(function (x) { return !L.some(function (y) { return y.id === x.id; }); }).length; tkSaveMine(L); tkeMsg('Added ' + added + ' from ' + g[0] + (skip ? '; ' + skip + ' left out (cap ' + TK_CAP + ')' : '') + '. Saved as My Mix.'); }
    else { L = L.filter(function (x) { return !ids[x.id]; }); if (!L.length) { tkeMsg('Keep at least one item.'); return; } tkSaveMine(L); tkeMsg('Removed ' + g[0] + '. Saved as My Mix.'); } tkePaint(); ticker(); tkFetch(); }
  function tkSaveMine(L) { var V = tkV(); V.L.mine = L; V.v = 'mine'; tkVSave(V); tkViewBtn(); }
  var TKS = [['desk', 'Desk order'], ['movers', 'Biggest movers'], ['cat', 'By category'], ['az', 'A–Z']];
  function tkV() { var o = null; try { o = JSON.parse(LS.get('btd_tk3') || 'null'); } catch (e) {} o = o && typeof o === 'object' ? o : {};
    if (!TKV.some(function (x) { return x[0] === o.v; })) o.v = 'desk'; if (!TKS.some(function (x) { return x[0] === o.sort; })) o.sort = 'desk'; if (!o.L || typeof o.L !== 'object') o.L = {}; return o; }
  function tkVSave(o) { if (o.v === 'desk' && o.sort === 'desk' && !Object.keys(o.L).length) { try { localStorage.removeItem('btd_tk3'); } catch (e) {} } else LS.set('btd_tk3', JSON.stringify(o)); }
  function tkDefault(v) { v = v || tkV().v; var D0 = tkDesk();
    if (v === 'stocks') { var ts = (DESK ? DESK.treasuries.rows.slice().sort(function (a, b) { return b.btc - a.btc; }) : []).filter(function (r) { return tkCn(r); }).slice(0, 12).map(function (r) { return { id: 'S:' + r.tk.toUpperCase(), tk: r.tk }; }); return ts.length ? ts : D0.filter(function (x) { return x.id[0] === 'S'; }); }
    if (v === 'macro') return ['US2Y', 'US10Y'].map(function (k) { return { id: 'M:' + k, tk: TKM[k][0] }; }).concat([{ id: 'D:S2S10', tk: '2s10s' }], ['DXY', 'VIX', 'GOLD', 'OIL'].map(function (k) { return { id: 'M:' + k, tk: TKM[k][0] }; }));
    if (v === 'fut') return ['SPX', 'IXIC', 'DJI', 'RUT', 'GOLD', 'SILVER', 'OIL', 'N225', 'STOXX'].map(function (k) { return { id: 'M:' + k, tk: TKM[k][0] }; });
    if (v === 'movers') { var mv = [{ id: 'D:BTC', tk: 'BTC' }, { id: 'C:ETH', tk: 'ETH' }, { id: 'C:SOL', tk: 'SOL' }]; (DESK ? DESK.treasuries.rows.slice().sort(function (a, b) { return b.btc - a.btc; }) : []).filter(function (r) { return tkCn(r); }).slice(0, 15).forEach(function (r) { mv.push({ id: 'S:' + r.tk.toUpperCase(), tk: r.tk }); }); ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'COIN', 'HOOD'].forEach(function (t) { if (!mv.some(function (y) { return y.id === 'S:' + t; })) mv.push({ id: 'S:' + t, tk: t, cn: t }); }); return mv; }
    if (v === 'crypto') return [{ id: 'D:BTC', tk: 'BTC' }, { id: 'C:ETH', tk: 'ETH' }, { id: 'C:SOL', tk: 'SOL' }, { id: 'D:BTCETH', tk: 'BTC/ETH' }, { id: 'D:BTCSOL', tk: 'BTC/SOL' }, { id: 'D:DOM', tk: TKDL.DOM }, { id: 'D:FNG', tk: TKDL.FNG }, { id: 'D:ATH', tk: TKDL.ATH }];
    if (v === 'prefs') return D0.filter(function (x) { return x.id[0] === 'P'; });
    if (v === 'keys') return ['BTC', 'MNAV', 'GAIN', 'ATH', 'PLAW', 'HALV', 'FNG', 'DOM'].map(function (k) { return { id: 'D:' + k, tk: TKDL[k] }; });
    if (v === 'alts') { altTop(); var AL = [{ id: 'D:BTC', tk: 'BTC' }]; altCoins().forEach(function (c) { AL.push({ id: 'C:' + c, tk: c }); }); return AL.concat([{ id: 'D:BTCETH', tk: 'BTC/ETH' }, { id: 'D:BTCSOL', tk: 'BTC/SOL' }, { id: 'D:DOM', tk: TKDL.DOM }]); }
    if (v === 'mine') return [{ id: 'D:BTC', tk: 'BTC' }, { id: 'S:MSTR', tk: 'MSTR' }, { id: 'D:MNAV', tk: TKDL.MNAV }, { id: 'S:ASST', tk: 'ASST' }, { id: 'D:DOM', tk: TKDL.DOM }, { id: 'D:GAIN', tk: TKDL.GAIN }];
    return D0; }
  function tkDesk() { // Desk default order: BTC, ETH, SOL, treasury + major stocks, Mag 7, US indexes (futures outside regular hours), macro
    var L = [{ id: 'D:BTC', tk: 'BTC' }, { id: 'C:ETH', tk: 'ETH' }, { id: 'C:SOL', tk: 'SOL' }];
    L = [{ id: 'D:BTC', tk: 'BTC' }]; [['MSTR'], ['MPJPY'], ['ASST'], ['MARA'], ['COIN']].forEach(function (a) { L.push({ id: 'S:' + a[0], tk: a[1] || a[0], cn: a[0] }); }); L.push({ id: 'C:ETH', tk: 'ETH' }, { id: 'C:SOL', tk: 'SOL' }); /* Bitcoin Desk: best-of mix, phone-sized */
    TKM_DEF.forEach(function (k) { L.push({ id: 'M:' + k, tk: TKM[k][0] }); }); return L; }
  function tkClean(o) { if (!Array.isArray(o) || !o.length) return null;
    var out = o.filter(function (x) { return x && typeof x.id === 'string' && TK_ID.test(x.id); }).slice(0, 80).map(function (x) { var y = { id: x.id, tk: String(x.tk || x.id.slice(2)).slice(0, 24), cn: x.cn && TK_CN.test(x.cn) ? x.cn : null }; if (x.h) y.h = 1; return y; });
    return out.length ? out : null; }
  function tkSaved(v) { v = v || tkV().v; if (v === 'alts') return null; if (v === 'desk') { var o = null; try { o = JSON.parse(LS.get('btd_tk2') || 'null'); } catch (e) {} return tkClean(o); } return tkClean(tkV().L[v]); }
  function tkList(v) { return tkSaved(v) || tkDefault(v); }
  function tkListKey(L) { return L.map(function (x) { return x.id + (x.h ? '~' : ''); }).join(','); }
  function tkSave(L, v) { var V = tkV(); v = v || V.v; if (v === 'alts') { var ac = altCfg(), base = ALLA.length ? altBase() : ['ETH', 'SOL'], cs = L.filter(function (x) { return x.id[0] === 'C' && !x.h; }).map(function (x) { return x.id.slice(2); });
      ac.rm = base.filter(function (x) { return cs.indexOf(x) < 0; }); ac.add = cs.filter(function (x) { return base.indexOf(x) < 0; }).slice(0, 10); altCfgSave(ac); if (tke && L.some(function (x) { return x.h; })) tkeMsg('Hidden coins are removed from Altcoins; re-add them from the list.'); return; }
    var same = tkListKey(L) === tkListKey(tkDefault(v));
    if (v !== 'mine' && !same) { V.L.mine = L; V.v = 'mine'; tkVSave(V); tkViewBtn(); if (tke) tkeMsg('Edited: saved as My Mix (the preset itself is unchanged).'); return; } /* editing any preset turns it into My Mix */
    if (v === 'desk') { if (same) { try { localStorage.removeItem('btd_tk2'); } catch (e) {} } else LS.set('btd_tk2', JSON.stringify(L)); return; }
    if (same) delete V.L[v]; else V.L[v] = L; tkVSave(V); }
  function tkReset() { var V = tkV(); if (V.v === 'alts') { var c = altCfg(); altCfgSave({ n: c.n, add: [], rm: [] }); return; } if (V.v === 'desk') { try { localStorage.removeItem('btd_tk2'); } catch (e) {} } else { delete V.L[V.v]; tkVSave(V); } }
  function tkShown() { var V = tkV(), CO = { D: 0, C: 1, S: 2, M: 3, P: 4 }, L = tkList().filter(function (x) { return !x.h; }), R = L.map(function (x, i) { return { x: x, it: tkItem(x), i: i }; }).filter(function (r) { return r.it; });
    R.forEach(function (r) { r.it.id = r.x.id; r.it.cn = r.x.cn || null; });
    if (V.v === 'movers') { R.sort(function (a, b) { var A = a.it[2], B = b.it[2], ha = A != null && isFinite(A), hb = B != null && isFinite(B); return ha && hb ? Math.abs(B) - Math.abs(A) : ha ? -1 : hb ? 1 : a.i - b.i; }); return R.slice(0, 15).map(function (r) { return r.it; }); }
    if (V.sort === 'movers') R.sort(function (a, b) { var A = a.it[2], B = b.it[2], ha = A != null && isFinite(A), hb = B != null && isFinite(B); return ha && hb ? Math.abs(B) - Math.abs(A) : ha ? -1 : hb ? 1 : a.i - b.i; });
    else if (V.sort === 'cat') R.sort(function (a, b) { return (CO[a.x.id[0]] - CO[b.x.id[0]]) || a.i - b.i; });
    else if (V.sort === 'az') R.sort(function (a, b) { return String(a.it[0]).localeCompare(String(b.it[0])); });
    return R.map(function (r) { return r.it; }); }
  function tkViewName() { var v = tkV().v; return TKV.filter(function (x) { return x[0] === v; })[0][1]; }
  function tkViewBtn() { var b = $('[data-tk-view]'); if (b) { b.textContent = tkViewName() + ' ▸'; b.setAttribute('aria-label', 'Price scroll view: ' + tkViewName() + '. Tap for the next view'); } }
  function tkSetView(v) { var V = tkV(); V.v = v; tkVSave(V); tkViewBtn(); if (tke) tkePaint(); ticker(); tkFetch(); }
  function tkBoard(tk0) { return DESK ? DESK.treasuries.rows.filter(function (r) { return r.tk.toUpperCase() === tk0; })[0] : null; }
  function tkCnOf(x) { if (x.cn) return x.cn; var r = tkBoard(x.id.slice(2)); return r ? tkCn(r) : null; }
  function tkItem(x) {
    var k = x.id.slice(2), t = x.id[0];
    if (t === 'S') { var cs = tkCnOf(x), sl = cs ? (TK_LBL[cs] || cs.replace(/^[A-Z]+:/, '')) : x.tk, q = TKQ[cs] || (window.BTD_FEED && cs && window.BTD_FEED.get(cs)); if (q && q.px != null) return [sl, tkPx(q), q.chp]; if (cs === 'MPJPY') { var qj = TKQ['3350.T'] || (window.BTD_FEED && window.BTD_FEED.get('3350.T')); if (qj && qj.px != null) return ['3350.T', '¥' + Math.round(qj.px).toLocaleString('en-US'), qj.chp]; } var l = LAST && LAST.q[k]; return l ? [x.tk, '$' + l.c.toFixed(2) + ' close', (l.c / l.prev - 1) * 100] : null; }
    if (t === 'P') { var PR = DESK && DESK.prefs_desk ? DESK.prefs_desk.rows : [], qp = TKQ[k], d = PR.filter(function (y) { return y.t === k; })[0]; if (!qp && !d) return null;
      return [k, (qp ? '$' + qp.px.toFixed(2) : '$' + d.close.toFixed(2) + ' close') + (d ? ' · ' + d.rate.toFixed(2) + '%' : ''), qp ? qp.chp : d && d.prev ? (d.close / d.prev - 1) * 100 : null]; }
    if (t === 'M') { var mq = tkMq(k), mm = TKM[k]; if (!mq) return null; var v = mq.q.px, lab = mq.fut ? mm[5] : mm[4]; return [lab, mm[3] === 'yd' ? v.toFixed(3) + '%' + (mq.q.ch != null && isFinite(mq.q.ch) ? ' ' + (mq.q.ch >= 0 ? '+' : '\u2212') + Math.abs(Math.round(mq.q.ch * 100)) + ' bp' : '') : mm[3] === 'fx' ? v.toFixed(v < 10 ? 4 : 2) : mm[3] === 'cm' ? '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), mm[3] === 'yd' ? null : mq.q.chp]; }
    if (t === 'C' && k !== 'ETH' && k !== 'SOL') return TKC[k] ? [k + '-USD', tkCoinPx(TKC[k].px), TKC[k].chp] : null;
    if (t === 'C') return k === 'ETH' ? (live.eth ? ['ETH-USD', usd(live.eth), live.eth24] : null) : (live.sol ? ['SOL-USD', usd(live.sol), live.sol24] : null);
    switch (k) {
      case 'BTC': return ['BTC-USD', live.btc ? usd(live.btc) : '—'];
      case 'MNAV': if (!DESK) return null; var mn = window.btdLiveMnav(DESK.strategy.kpis, mstrLive(), live.btc); return ['MSTR mNAV', mn ? mn.toFixed(2) + 'x live' : DESK.strategy.mnav.toFixed(2) + 'x'];
      case 'GAIN': var G = DESK && DESK.strategy.kpis && DESK.strategy.kpis.ledger; return G && G.btc_gain_ytd != null ? ['Strategy BTC Gain YTD', (G.btc_gain_ytd < 0 ? '−' : '+') + fmt(Math.abs(G.btc_gain_ytd)) + ' ₿', null, G.btc_gain_ytd < 0 ? 'dn' : 'up'] : null;
      case 'DOM': return live.dom ? ['BTC.D', live.dom.toFixed(1) + '%'] : null;
      case 'BTCETH': case 'BTCSOL': var alt = k === 'BTCETH' ? 'ETH' : 'SOL', ap = k === 'BTCETH' ? live.eth : live.sol, a24 = k === 'BTCETH' ? live.eth24 : live.sol24, bq = window.BTD_FEED && window.BTD_FEED.get('BTC'), b24 = bq && bq.chp != null ? bq.chp : null;
        if (!live.btc || !ap) return null; var rc = b24 != null && a24 != null && isFinite(a24) ? ((1 + b24 / 100) / (1 + a24 / 100) - 1) * 100 : null;
        var xa = false; try { xa = !!(JSON.parse(localStorage.getItem('btd_cxalt') || '{}') || {})[alt.toLowerCase()]; } catch (e) {} /* same saved orientation as the Crypto tiles; default BTC/x */
        var bt = rc != null && Math.abs(rc) >= 0.05 ? (rc > 0 ? 'BTC gaining vs ' + alt : alt + ' gaining vs BTC') : '', why = ' over 24h, computed from the BTC-USD and ' + alt + '-USD 24h changes on Coinbase';
        if (xa) { var ic = rc == null ? null : (1 / (1 + rc / 100) - 1) * 100, iv = ap / live.btc; return [alt + '/BTC', iv.toFixed(iv < 0.01 ? 6 : 5) + (bt ? ' \u00b7 ' + bt : ''), ic, null, alt + ' priced in BTC' + (ic == null ? ' (Coinbase legs)' : ': ' + (ic >= 0 ? '+' : '\u2212') + Math.abs(ic).toFixed(2) + '%' + why) + '. Flip orientation on the Crypto at a glance tile.']; }
        return ['BTC/' + alt, (live.btc / ap).toFixed(k === 'BTCETH' ? 1 : 0) + (bt ? ' \u00b7 ' + bt : ''), rc, null, 'BTC priced in ' + alt + (rc == null ? ' (Coinbase legs)' : ': ' + (rc >= 0 ? '+' : '\u2212') + Math.abs(rc).toFixed(2) + '%' + why)];
      case 'HOLD': var KH = DESK && DESK.strategy.kpis && DESK.strategy.kpis.live; return KH && KH.btc_held ? ['MSTR BTC', fmt(KH.btc_held) + ' \u20bf', null, null, 'Strategy BTC holdings (strategy.com)'] : null;
      case 'BPS': var KB = DESK && DESK.strategy.kpis && DESK.strategy.kpis.live; if (!KB || !KB.btc_held || !KB.market_cap_musd || !KB.mstr_close) return null; var shs = KB.market_cap_musd * 1e6 / KB.mstr_close; return ['Sats/share', Math.round(KB.btc_held * 1e8 / shs).toLocaleString('en-US') + ' sats', null, null, 'Strategy BTC held \u00d7 100M \u00f7 implied shares (market cap \u00f7 close, strategy.com)'];
      case 'FUND': var FU = window.BTD_FUND; return FU ? ['Funding', (FU.f8 >= 0 ? '+' : '\u2212') + Math.abs(FU.f8).toFixed(4) + '%/8h \u00b7 ' + FU.ann.toFixed(1) + '% ann.', null, FU.f8 >= 0 ? 'up' : 'dn', 'BTC-PERPETUAL funding on Deribit; positive = longs pay shorts'] : null;
      case 'SESS': var FS = window.BTD_FEED && window.BTD_FEED.session ? window.BTD_FEED.session() : null; return FS ? ['Session', { open: 'US market open', pre: 'Pre-market', post: 'After hours', closed: 'US market closed' }[FS] || FS] : null;
      case 'NEXT': var NK = window.BTD_NEXTKD; return NK ? ['Next', NK.d + ' \u00b7 ' + NK.t, null, null, 'Next key date (Desk calendar)'] : null;
      case 'FNG': return live.fng ? ['Fear & Greed', live.fng] : null;
      case 'ATH': var ath = athOf(); return ath && live.btc ? ['From ATH', pct((live.btc / ath - 1) * 100, 1)] : null;
      case 'PLAW': return live.btc ? ['Power Law', (live.btc / plaw(Date.now())).toFixed(2) + 'x trend'] : null;
      case 'S2S10': var y10 = window.BTD_FEED && window.BTD_FEED.get('US10Y'), y2 = window.BTD_FEED && window.BTD_FEED.get('US2Y'); if (!y10 || !y2 || y10.px == null || y2.px == null) return null; var spb = Math.round((y10.px - y2.px) * 100); return ['2s10s', (spb >= 0 ? '+' : '\u2212') + Math.abs(spb) + ' bp', null, spb >= 0 ? 'up' : 'dn'];
      case 'HALV': var nh = Date.UTC(2024, 3, 20) + 210000 * 600e3; return ['Halving', '~' + Math.max(0, Math.ceil((nh - Date.now()) / 864e5)) + ' days'];
    } return null;
  }
  /* strip change: tap cycles timeframe (1D/1W/1M/YTD/1Y), hold flips % / amount (shared with the tiles via BTD_CTX) */
  var TKF = { ES: '@SP.1', NQ: '@ND.1', YM: '@DJ.1', GC: '@GC.1', CL: '@CL.1', SI: '@SI.1' }, TKX = { 'BTC-USD': 'BTC', 'ETH-USD': 'ETH', 'SOL-USD': 'SOL', DXY: '.DXY', VIX: '.VIX' }, tkReg = 0;
  function tkKey(l) { var f = /^([A-Z]{2})=F/.exec(l); if (f) return TKF[f[1]] || null; if (TKX[l]) return TKX[l]; var w = l.split(' ')[0]; if (w === 'SPX' || w === 'IXIC' || w === 'DJI') return '.' + w; return /^[A-Z0-9.\-]{1,10}$/.test(w) ? w : null; }
  function tkChg(x) { var X = window.BTD_CTX, F = window.BTD_FEED, k = tkKey(x[0]); if (X && !tkReg) { tkReg = 1; X.onRange(function () { ticker(); }); X.on(function () { ticker(); }); }
    var plain = x[2] != null && isFinite(x[2]) ? ' <span class="' + (x[2] >= 0 ? 'up' : 'dn') + '">' + pct(x[2], 1) + '</span>' : '';
    if (x.id && x.id[0] === 'D' && x.id !== 'D:BTC') return plain; /* desk data items (mNAV, holdings...) never borrow a ticker's change */
    if (!X || !k) return plain; var q = (F && F.get(k)) || null; if (!q || q.px == null) { var v = parseFloat(String(x[1]).replace(/[^0-9.\-]/g, '')); q = isFinite(v) ? { px: v, chp: x[2] } : null; }
    var fq = q ? X.fmt(k, q) : null; if (!fq) return plain;
    var kd = X.kind ? X.kind(k) : 'px', am = ''; if (fq.r === '1D' && kd !== 'yd' && q.ch != null && isFinite(q.ch) && (!X.unit || X.unit(k) === 'pct')) { var A = Math.abs(q.ch), sg = q.ch >= 0 ? '+' : '\u2212'; am = ' <em class="tk-am">' + sg + (kd === 'ix' || /^@/.test(k) ? (A >= 100 ? Math.round(A).toLocaleString('en-US') : A.toFixed(2)) + ' pts' : kd === 'fx' ? A.toFixed(4) : '$' + (A >= 1000 ? Math.round(A).toLocaleString('en-US') : A.toFixed(2))) + '</em>'; }
    return ' <span class="tk-ch ' + (fq.v >= 0 ? 'up' : 'dn') + '" data-spk="' + esc(k) + '" role="button" title="' + X.tip + '">' + esc(window.innerWidth < 600 ? String(fq.t).replace(/(\d+\.\d{2,})%$/, function (m0, n0) { return (+n0).toFixed(1) + '%'; }) : fq.t) + am + '<small>' + fq.r + '</small></span>'; }
  function ticker() {
    dataTiles(); var inn = $('[data-ticker-in]'); if (!inn || tk.hidden) return;
    var items = tkShown(); tkViewBtn();
    var SEG = function (x) { var t = x.id ? x.id[0] : 'D', k = x.id ? x.id.slice(2) : ''; if (t === 'C' || (t === 'D' && /^(BTC|BTCETH|BTCSOL|DOM|FNG)$/.test(k))) return 'CRYPTO'; if (t === 'S') return /^(AAPL|MSFT|NVDA|GOOGL|AMZN|META|TSLA|HOOD|CRCL|AVGO|IBIT|GLD)$/.test(k) ? 'STOCKS' : 'TREASURY'; if (t === 'P') return 'PREFERREDS'; if (t === 'M') { var mm = TKM[k]; return mm && mm[3] === 'cm' ? 'COMMODITIES' : mm && (mm[3] === 'yd' || mm[3] === 'fx' || k === 'DXY' || k === 'VIX') ? 'MACRO' : 'INDEXES'; } if (k === 'S2S10') return 'MACRO'; return 'DESK DATA'; };
    var segOn = tkV().sort === 'desk' || tkV().sort === 'cat', lastSeg = null, PV = ticker.pv || (ticker.pv = {});
    var opener = function (x) { var t = x.id ? x.id[0] : '', k = x.id ? x.id.slice(2) : ''; if (t === 'D' && k === 'BTC') return 'BTC'; if (t === 'S') return x.cn || k; if (t === 'M' && k === 'GOLD') return 'GOLD'; return ''; };
    var mvTop = items.length >= 8 && tkV().v !== 'movers' ? items.filter(function (x) { return x[2] != null && isFinite(x[2]); }).slice().sort(function (a, b) { return Math.abs(b[2]) - Math.abs(a[2]); }).slice(0, 3) : [];
    var one = function (x, mv) { var key = x[0], val = String(x[1]), was = PV[key], dir = was != null && was !== val ? (parseFloat(val.replace(/[^0-9.\-]/g, '')) > parseFloat(was.replace(/[^0-9.\-]/g, '')) ? 1 : -1) : 0; if (!mv) PV[key] = val; var op = opener(x);
      var sg = ''; if (segOn && !mv) { var sn = SEG(x); if (sn !== lastSeg) { lastSeg = sn; sg = '<span class="tk-seg">' + sn + '</span>'; } }
      return sg + '<span class="tk-i' + (dir > 0 ? ' tk-fu' : dir < 0 ? ' tk-fd' : '') + (op ? ' tk-op' : '') + '"' + (op ? ' data-tk-open="' + esc(op) + '" role="link" tabindex="0"' : '') + ' title="' + (x[4] ? esc(x[4]) : (op ? 'Tap to open ' + esc(op) + ' in the chart. ' : '') + esc(/-USD$/.test(x[0]) ? 'Source: Coinbase spot' : /mNAV|BTC\.D|Gain|ATH|Halving|Power|Fear|2s10s|\//.test(x[0]) ? 'Desk data item' : (/ fut$/.test(x[0]) ? 'Futures (front-month contract), trade nearly 24h on weekdays. ' : /^US\d+Y$/.test(x[0]) ? 'US Treasury yield. ' : x[0] === 'DXY' ? 'US dollar index. ' : x[0] === 'VIX' ? 'Volatility index (expected S&P 500 swings). ' : '') + 'Source: CNBC quote service (may be delayed)')) + '">' + (dir ? '<i class="tk-ar">' + (dir > 0 ? '\u25b2' : '\u25bc') + '</i>' : '') + '<b>' + esc(window.innerWidth < 600 ? String(x[0]).replace(/-USD$/, '').replace(/^([A-Z]{2}=F|US\d+Y|SPX|IXIC|DJI|DXY|VIX) .*$/, '$1') : x[0]) + '</b>' + (x[3] ? '<span class="' + x[3] + '">' + esc(x[1]) + '</span>' : esc(x[1])) + tkChg(x) + '</span>'; }; /* phone: compact labels (BTC, ES=F) so 3-4 items fit */
    var seq = items.map(function (x) { return one(x); }).join('') + (mvTop.length ? '<span class="tk-seg tk-segm">BIGGEST MOVERS</span>' + mvTop.map(function (x) { return one(x, 1); }).join('') : '');
    var seqOld = items.map(function (x) { return '<span class="tk-i" title="' + esc(/-USD$/.test(x[0]) ? 'Source: Coinbase spot' : /mNAV|BTC\.D|Gain|ATH|Halving|Power|Fear|\//.test(x[0]) ? 'Desk data item' : (/ fut$/.test(x[0]) ? 'Futures (front-month contract), trade nearly 24h on weekdays. ' : /^US\d+Y$/.test(x[0]) ? 'US Treasury yield. ' : x[0] === 'DXY' ? 'US dollar index. ' : x[0] === 'VIX' ? 'Volatility index (expected S&P 500 swings). ' : '') + 'Source: CNBC quote service (may be delayed)') + '"><b>' + esc(x[0]) + '</b>' + (x[3] ? '<span class="' + x[3] + '">' + esc(x[1]) + '</span>' : esc(x[1])) + tkChg(x) + '</span>'; }).join('');
    /* seamless loop: two identical halves, each at least as wide as the strip; the track slides exactly one half (-50%) and wraps with no gap or jump */
    var halves = inn.querySelectorAll('.tk-seq'); if (halves.length !== 2) { inn.innerHTML = '<span class="tk-seq"></span><span class="tk-seq" aria-hidden="true"></span>'; halves = inn.querySelectorAll('.tk-seq'); }
    halves[0].innerHTML = seq; var w1 = halves[0].scrollWidth || 1, rep = Math.max(1, Math.ceil((tk.clientWidth || 1200) / w1)); if (rep > 1) halves[0].innerHTML = new Array(rep + 1).join(seq);
    halves[1].innerHTML = halves[0].innerHTML; var hw = halves[0].scrollWidth;
    var dur = Math.max(40, Math.round(hw / 24)) + "s"; /* slow, readable: ~24 px/s on every screen */ if (inn.style.animationDuration !== dur) inn.style.animationDuration = dur; // ~45 px per second, steady whatever the list length
  }
  /* Ribbon editor: grouped options + type any ticker (validated via the quote feed), up/down, remove, reset */
  var tke = null, tkeBtn = null, TKE_G = {};
  function tkePool() { var have = {}; tkList().forEach(function (x) { have[x.id] = 1; }); var out = [];
    if (tkV().v === 'alts') { (ALLA.length ? altBase() : ['ETH', 'SOL']).forEach(function (c) { if (!have['C:' + c]) out.push({ id: 'C:' + c, tk: c, name: 'Top ' + altCfg().n + ' by market cap', g: 'Top ' + altCfg().n + ' altcoins' }); }); return out; }
    var GT = 'BTC treasury companies'; [['MSTR', 'Strategy'], ['MPJPY', 'Metaplanet (US ADR)'], ['ASST', 'Strive'], ['MARA', 'MARA Holdings'], ['COIN', 'Coinbase']].forEach(function (a) { out.push({ id: 'S:' + a[0], tk: a[0], name: a[1], g: GT, cn: a[0] }); });
    (DESK ? DESK.treasuries.rows.slice().sort(function (a, b) { return b.btc - a.btc; }) : []).forEach(function (r) { var id = 'S:' + r.tk.toUpperCase(); if ((tkCn(r) || (LAST && LAST.q[r.tk])) && !out.some(function (y) { return y.id === id; })) out.push({ id: id, tk: r.tk, name: '#' + r.rank + ' ' + r.name + ' · ' + fmt(r.btc) + ' ₿', g: GT }); });
    [['C:ETH', 'ETH', 'Ether · Coinbase'], ['C:SOL', 'SOL', 'Solana · Coinbase'], ['D:BTCETH', 'BTC/ETH', 'ratio'], ['D:BTCSOL', 'BTC/SOL', 'ratio'], ['D:DOM', TKDL.DOM, 'BTC dominance'], ['D:FNG', TKDL.FNG, 'Crypto Fear & Greed']].forEach(function (a) { out.push({ id: a[0], tk: a[1], name: a[2], g: 'Crypto' }); });
    var MG = function (keys, g, nm) { keys.forEach(function (k) { out.push({ id: 'M:' + k, tk: TKM[k][0], name: nm || TKM[k][4], g: g }); }); };
    MG(['US2Y', 'US5Y', 'US10Y', 'US30Y'], 'Rates · Dollar · Volatility', 'Treasury yield'); out.push({ id: 'D:S2S10', tk: '2s10s', name: '10Y minus 2Y yield, bp', g: 'Rates · Dollar · Volatility' }); MG(['DXY', 'VIX', 'EURUSD', 'USDJPY'], 'Rates · Dollar · Volatility');
    MG(['GOLD', 'SILVER', 'OIL', 'COPPER', 'NATGAS'], 'Commodities (futures)'); MG(['N225', 'STOXX', 'FTSE', 'DAX', 'HSI'], 'Global indexes');
    ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'].forEach(function (t) { out.push({ id: 'S:' + t, tk: t, name: 'Magnificent 7', g: 'Mag 7 · top stocks', cn: t }); }); ['HOOD', 'CRCL', 'AVGO', 'IBIT', 'GLD'].forEach(function (t) { out.push({ id: 'S:' + t, tk: t, name: 'Top stocks / ETFs', g: 'Mag 7 · top stocks', cn: t }); });
    MG(['SPX', 'IXIC', 'DJI', 'RUT'], 'US futures · indexes', 'cash index; futures outside regular hours');
    tkPrefs().forEach(function (t) { var d = (DESK && DESK.prefs_desk ? DESK.prefs_desk.rows : []).filter(function (x) { return x.t === t; })[0]; out.push({ id: 'P:' + t, tk: t, name: d ? d.issuer + ' ' + d.name + ' · ' + d.rate.toFixed(2) + '%' : 'Preferred', g: 'Preferreds' }); });
    Object.keys(TKD).forEach(function (k) { out.push({ id: 'D:' + k, tk: TKDL[k], name: TKD[k], g: 'Data items' }); });
    return out.filter(function (x) { return !have[x.id]; }); }
  function tkePaint() {
    if (!tke) return; var L = tkList(), q = ($('[data-tke-in]', tke).value || '').trim().toUpperCase(), g = '', h = '';
    var V = tkV(); $('[data-tke-views]', tke).innerHTML = TKV.map(function (x) { return '<button type="button" class="chip' + (x[0] === V.v ? ' on' : '') + '" data-tke-v="' + x[0] + '" aria-pressed="' + (x[0] === V.v) + '">' + esc(x[1]) + (tkSaved(x[0]) ? ' ✎' : '') + '</button>'; }).join('');
    $('[data-tke-sort]', tke).value = V.sort; var ax = $('[data-tke-alts]', tke); if (ax) { var acf = altCfg(); ax.hidden = V.v !== 'alts'; ax.innerHTML = '<span class="tke-s">Altcoins</span><span class="seg" role="group" aria-label="Top altcoins"><button type="button" data-tke-an="10" class="' + (acf.n === 10 ? 'on' : '') + '" aria-pressed="' + (acf.n === 10) + '">Top 10</button><button type="button" data-tke-an="20" class="' + (acf.n === 20 ? 'on' : '') + '" aria-pressed="' + (acf.n === 20) + '">Top 20</button></span><small class="muted">by market cap, no stablecoins · typed coins ' + acf.add.length + '/10 · order follows market cap</small>'; }
    var gu = $('[data-tke-grp]', tke); if (gu) { var cur = {}; L.forEach(function (x) { cur[x.id] = 1; }); $('[data-tke-cnt]', tke).textContent = '(' + L.length + '/' + TK_CAP + ' items; adding a group saves as My Mix)';
      gu.innerHTML = TKG.map(function (g, gi) { var it = g[2](), n = it.filter(function (x) { return cur[x.id]; }).length; return '<li><b>' + esc(g[0]) + '</b><span class="muted">' + esc(g[1]) + '</span>' + (n < it.length ? '<button type="button" class="chip" data-tke-ga="' + gi + '">+ Add</button>' : '') + (n ? '<button type="button" class="chip" data-tke-gr="' + gi + '">\u2212 Remove</button>' : '') + '</li>'; }).join(''); }
    $('[data-tke-cur]', tke).innerHTML = L.map(function (x, i) { return '<li' + (x.h ? ' class="tke-h"' : '') + '><b>' + esc(x.tk) + '</b><span>' + esc(x.id[0] === 'D' ? 'data' : x.id[0] === 'P' ? 'preferred' : x.id[0] === 'C' ? 'crypto' : x.cn ? 'your ticker' : 'stock') + '</span>' +
      '<button type="button" data-tke-hd="' + i + '" aria-pressed="' + (x.h ? 'true' : 'false') + '" class="' + (x.h ? 'off' : '') + '" aria-label="' + (x.h ? 'Show ' : 'Hide ') + esc(x.tk) + '" title="' + (x.h ? 'Hidden: tap to show' : 'Tap to hide (keeps it in the list)') + '">' + (x.h ? '&#9675;' : '&#9679;') + '</button><button type="button" data-tke-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(x.tk) + ' up">&#9650;</button><button type="button" data-tke-dn="' + i + '"' + (i < L.length - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(x.tk) + ' down">&#9660;</button><button type="button" data-tke-rm="' + i + '" aria-label="Remove ' + esc(x.tk) + '">&times;</button></li>'; }).join('');
    tkePool().filter(function (r) { return !q || r.tk.toUpperCase().indexOf(q) >= 0 || r.name.toUpperCase().indexOf(q) >= 0; }).forEach(function (r) {
      if (r.g !== g) { g = r.g; var gOpen = !!q || TKE_G[g] || (TKE_G[g] == null && window.innerWidth >= 900); h += '<li class="pk-g" role="presentation"><button type="button" class="pk-gb" data-tke-g="' + esc(g) + '" aria-expanded="' + gOpen + '">' + (gOpen ? '\u25be ' : '\u25b8 ') + esc(g) + '</button></li>'; }
      if (!(!!q || TKE_G[g] || (TKE_G[g] == null && window.innerWidth >= 900))) return;
      h += '<li><button type="button" class="pk-o" data-tke-add="' + esc(r.id) + '" data-tke-tk="' + esc(r.tk) + '"' + (r.cn ? ' data-tke-cn="' + esc(r.cn) + '"' : '') + '><b>' + esc(r.tk) + '</b><span>' + esc(r.name) + '</span></button></li>'; });
    $('[data-tke-pool]', tke).innerHTML = h || '<li class="pk-none">' + (q ? 'Not in the list. Press Enter (or Add) to look up “' + esc(q) + '” on the quote feed.' : 'Everything is already in your scroll.') + '</li>';
    var cu = $('[data-tke-custom]', tke); if (cu) cu.textContent = tkViewName() + (tkSaved() ? ' · edited, saved in this browser' : ' · default');
  }
  function tkeMsg(t) { var m = $('[data-tke-msg]', tke); if (m) m.textContent = t || ''; }
  function tkeAddTyped() { var v = ($('[data-tke-in]', tke).value || '').trim().toUpperCase().replace(/\s+/g, ''); if (!v) return;
    if (!/^[A-Z0-9:._\-]{1,24}$/.test(v)) { tkeMsg('Use letters and numbers, optionally EXCHANGE:SYMBOL (e.g. NASDAQ:COIN).'); return; }
    if (tkV().v === 'alts') { var cc0 = v.replace(/-USD$/, ''), ac0 = altCfg(); if (!/^[A-Z0-9]{2,10}$/.test(cc0)) { tkeMsg('Type a coin ticker, e.g. HYPE or HYPE-USD.'); return; } if (AST.test(cc0) || AWR.test(cc0)) { tkeMsg(cc0 + ' is a stablecoin or wrapped token; the Altcoins preset leaves those out.'); return; }
      if ((ALLA.length ? altBase() : []).indexOf(cc0) < 0 && ac0.add.indexOf(cc0) < 0 && ac0.add.length >= 10) { tkeMsg('Up to 10 typed coins. Remove one first.'); return; } tkeMsg('Checking ' + cc0 + '-USD on Coinbase…');
      (cc0 === 'ETH' || cc0 === 'SOL' ? Promise.resolve() : cbStats(cc0)).then(function () { if (!tke) return; tkeAdd({ id: 'C:' + cc0, tk: cc0 }); tkeMsg('Added ' + cc0 + '-USD (Coinbase price).'); ticker(); }).catch(function () { if (tke) tkeMsg('Not found: “' + cc0 + '” is not a coin pair on Coinbase.'); }); return; }
    var pool = tkePool(), hit = pool.filter(function (r) { return r.tk.toUpperCase() === v || r.id.slice(2) === v; })[0]; if (hit) { tkeAdd({ id: hit.id, tk: hit.tk }); return; }
    tkeMsg('Checking ' + v + ' on the quote feed…');
    if (/^[A-Z0-9]{2,10}-USD$/.test(v)) { var cc = v.slice(0, -4); tkeMsg('Checking ' + v + '…'); cbStats(cc).then(function () { if (!tke) return; tkeAdd({ id: 'C:' + cc, tk: cc }); tkeMsg('Added ' + v + ' (Coinbase price).'); ticker(); }).catch(function () { if (tke) tkeMsg('Not found: “' + v + '” is not a coin pair on Coinbase.'); }); return; }
    cnCheck(v).then(function (r) { if (!tke) return; if (!r) { var c = v.replace(/-USD$/, ''); if (!/^[A-Z0-9]{2,10}$/.test(c)) { tkeMsg('Not found: “' + v + '”. Check the ticker, or use EXCHANGE:SYMBOL (e.g. LSE:SWC).'); return; } tkeMsg('Checking ' + c + '…');
        cbStats(c).then(function () { if (!tke) return; tkeAdd({ id: 'C:' + c, tk: c }); tkeMsg('Added ' + c + '-USD (Coinbase price).'); ticker(); }).catch(function () { if (tke) tkeMsg('Not found: “' + v + '” isn’t a stock on the quote feed or a coin on Coinbase. Check the spelling, or use EXCHANGE:SYMBOL (e.g. LSE:SWC).'); }); return; }
      tkeAdd({ id: 'S:' + r.cn.replace(/[^A-Z0-9.\-]/g, '').slice(0, 15), tk: r.tk, cn: r.cn }); tkeMsg('Added ' + r.tk + ' (' + r.name + ').'); }); }
  function tkeAdd(x) { var L = tkList(); if (L.length >= TK_CAP) { tkeMsg('Up to ' + TK_CAP + ' items. Remove one first.'); return; } if (L.some(function (y) { return y.id === x.id; })) { tkeMsg(x.tk + ' is already in your scroll.'); return; } L.push(x); tkSave(L); $('[data-tke-in]', tke).value = ''; tkePaint(); ticker(); tkFetch(); }
  function tkeClose(refocus) { if (!tke) return; tke.remove(); tke = null; if (refocus && tkeBtn) tkeBtn.focus(); }
  function tkeOpen(btn) {
    tkeClose(false); pkClose(false); tkeBtn = btn; tke = document.createElement('div'); tke.className = 'pk tke'; tke.setAttribute('role', 'dialog'); tke.setAttribute('aria-label', 'Customize the price scroll');
    tke.innerHTML = '<div class="pk-h"><b>Price scroll</b><span class="muted" data-tke-custom></span><button type="button" class="pk-x" data-tke-close aria-label="Close">&times;</button></div>' +
      '<p class="tke-s">Presets <span class="muted">(editing one saves it as My Mix; Altcoins keeps its own edits)</span></p><div class="tke-views" data-tke-views role="group" aria-label="Price scroll views"></div>' +
      '<div class="tke-row tke-sortr"><label for="tke-sort" class="tke-s">Sort by</label><select id="tke-sort" data-tke-sort>' + TKS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="tke-row tke-alts" data-tke-alts hidden></div><p class="tke-s">Add a group <span class="muted" data-tke-cnt></span></p><ul class="tke-grp" data-tke-grp></ul>' +
      '<p class="tke-s">This view, in order <span class="muted">(&#9679; shown · &#9675; hidden)</span></p><ol class="tke-l" data-tke-cur></ol>' +
      '<p class="tke-s">Add</p><div class="tke-row"><input type="text" class="pk-in" data-tke-in placeholder="Search, or type any ticker" autocomplete="off" spellcheck="false" aria-label="Search or type a ticker"><button type="button" class="chip" data-tke-go>Add</button></div>' +
      '<p class="tke-s muted" style="margin:4px 0">Stocks: type the ticker. Coins: type the ticker followed by -USD.</p><ul class="pk-l" data-tke-pool></ul><p class="pk-msg" data-tke-msg></p><div class="pk-f"><button type="button" class="chip" data-tke-reset>Reset to Bitcoin Desk</button><button type="button" class="chip" data-tke-resetall>Reset strip to default</button><button type="button" class="chip on" data-tke-close>Done</button></div>';
    document.body.appendChild(tke); var r = btn.getBoundingClientRect(), w = Math.min(380, window.innerWidth - 16);
    tke.style.width = w + 'px'; tke.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px'; tke.style.top = Math.min(r.bottom + 4, Math.max(8, window.innerHeight - 560)) + 'px';
    tkePaint(); var inp = $('[data-tke-in]', tke);
    inp.addEventListener('input', function () { tkeMsg(''); tkePaint(); });
    $('[data-tke-sort]', tke).addEventListener('change', function (e) { var V = tkV(); V.sort = e.target.value; tkVSave(V); ticker(); tkeMsg(V.sort === 'desk' ? 'Shown in your list order.' : 'Sorted: ' + e.target.options[e.target.selectedIndex].text + ' (your list order is kept).'); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var only = $$('[data-tke-add]', tke); if (only.length === 1) tkeAdd({ id: only[0].dataset.tkeAdd, tk: only[0].dataset.tkeTk, cn: only[0].dataset.tkeCn || null }); else tkeAddTyped(); } });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b && b.hasAttribute('data-tk-edit')) { e.stopPropagation(); if (tke) tkeClose(true); else tkeOpen(b); return; }
    if (b && b.hasAttribute('data-tk-view')) { e.stopPropagation(); var cv = tkV().v, ix = 0; TKV.forEach(function (x, j) { if (x[0] === cv) ix = j; }); tkSetView(TKV[(ix + 1) % TKV.length][0]); if (tk.hidden) setTicker(true, true); return; }
    if (!tke) return; if (!tke.contains(e.target)) { tkeClose(false); return; } if (!b) return;
    var L = tkList(), i;
    if (b.dataset.tkeUp != null) { i = +b.dataset.tkeUp; if (i > 0) { L.splice(i - 1, 0, L.splice(i, 1)[0]); tkSave(L); tkePaint(); ticker(); var f = $('[data-tke-up="' + (i - 1) + '"]', tke); if (f && !f.disabled) f.focus(); } }
    else if (b.dataset.tkeDn != null) { i = +b.dataset.tkeDn; if (i < L.length - 1) { L.splice(i + 1, 0, L.splice(i, 1)[0]); tkSave(L); tkePaint(); ticker(); var f2 = $('[data-tke-dn="' + (i + 1) + '"]', tke); if (f2 && !f2.disabled) f2.focus(); } }
    else if (b.dataset.tkeGa != null) tkGroup(+b.dataset.tkeGa, true);
    else if (b.dataset.tkeGr != null) tkGroup(+b.dataset.tkeGr, false);
    else if (b.dataset.tkeAn) { var acn = altCfg(); acn.n = b.dataset.tkeAn === '20' ? 20 : 10; acn.rm = []; altCfgSave(acn); altBase(); tkePaint(); ticker(); tkFetch(); tkeMsg('Altcoins: top ' + acn.n + ' by market cap.'); }
    else if (b.dataset.tkeG) { var gk = b.dataset.tkeG, wasOpen = b.getAttribute('aria-expanded') === 'true'; TKE_G[gk] = !wasOpen; tkePaint(); }
    else if (b.dataset.tkeV) { tkSetView(b.dataset.tkeV); tkeMsg('View: ' + tkViewName() + (tk.hidden ? '. Turn the Price scroll on to see it.' : '.')); }
    else if (b.dataset.tkeHd != null) { i = +b.dataset.tkeHd; if (L[i].h) delete L[i].h; else { if (L.filter(function (y) { return !y.h; }).length < 2) { tkeMsg('Keep at least one item visible.'); return; } L[i].h = 1; } tkSave(L); tkePaint(); ticker(); var f3 = $('[data-tke-hd="' + i + '"]', tke); if (f3) f3.focus(); }
    else if (b.dataset.tkeRm != null) { i = +b.dataset.tkeRm; L.splice(i, 1); if (!L.length) { tkeMsg('Keep at least one item.'); return; } tkSave(L); tkePaint(); ticker(); }
    else if (b.dataset.tkeAdd) tkeAdd({ id: b.dataset.tkeAdd, tk: b.dataset.tkeTk, cn: b.dataset.tkeCn || null });
    else if (b.hasAttribute('data-tke-go')) tkeAddTyped();
    else if (b.hasAttribute('data-tke-reset')) { var V2 = tkV(); V2.v = 'desk'; tkVSave(V2); try { localStorage.removeItem('btd_tk2'); } catch (e4) {} tkViewBtn(); tkeMsg('Back to the Bitcoin Desk preset. My Mix stays saved.'); tkePaint(); ticker(); tkFetch(); }
    else if (b.hasAttribute('data-tke-resetall')) { try { localStorage.removeItem('btd_tk2'); localStorage.removeItem('btd_tk3'); localStorage.removeItem('btd_alts'); localStorage.removeItem('btd_scroll'); if (window.btdStripApply) window.btdStripApply(); } catch (e3) {} tkeMsg('All views, the sort and the Desk default are reset.'); tkViewBtn(); tkePaint(); ticker(); tkFetch(); }
    else if (b.hasAttribute('data-tke-close')) tkeClose(true);
  }, true);
  document.addEventListener('keydown', function (e) { if (tke && e.key === 'Escape') { e.stopPropagation(); tkeClose(true); } }, true);
  // Off by default; a visitor's On/Off click is saved as their default. Reduced-motion visitors always start Off (and it never animates for them).
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setTicker(on, save) { tk.hidden = !on; tkBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); var stE = tkBtn.querySelector('[data-tk-st]'); if (stE) stE.textContent = on ? 'On' : 'Off'; else tkBtn.textContent = 'Price scroll: ' + (on ? 'On' : 'Off'); if (save) LS.set('btd_ticker', on ? '1' : '0'); ticker(); if (on) tkFetch(); }
  (function tkMigrate() { // one-time: saved strips that equal an old default move to the new default; real custom strips are kept
    if (LS.get('btd_tkv') === '3') return; var o = null; try { o = JSON.parse(LS.get('btd_tk2') || 'null'); } catch (e) {}
    if (Array.isArray(o) && o.length) { var ids = o.map(function (x) { return x && x.id; }), hid = o.some(function (x) { return x && x.h; }), k = ids.join(',');
      var V2 = 'D:BTC,C:ETH,C:SOL,S:MSTR,S:COIN,S:ASST,S:MPJPY,S:AAPL,S:MSFT,S:NVDA,S:AMZN,S:GOOGL,S:META,S:TSLA,M:SPX,M:IXIC,M:DJI,M:GOLD,M:OIL,M:US10Y,M:DXY,M:VIX';
      var legacy = !hid && Object.keys(TKD).every(function (d) { return ids.indexOf('D:' + d) >= 0; }) && ids.indexOf('C:ETH') >= 0 && ids.indexOf('C:SOL') >= 0 && ids.every(function (i) { return /^[SPDC]:/.test(i || ''); });
      if (k === V2 || legacy) { try { localStorage.removeItem('btd_tk2'); } catch (e) {} } }
    LS.set('btd_tkv', '3'); })();
  /* ✎ edit control on the strip itself (easy to tap on phone) */
  if (tk && !document.querySelector('.tk-wrap')) { var tw = document.createElement('div'); tw.className = 'tk-wrap'; tk.parentNode.insertBefore(tw, tk); tw.appendChild(tk);
    var te = document.createElement('button'); te.type = 'button'; te.className = 'tk-edit'; te.setAttribute('aria-label', 'Customize the price scroll'); te.title = 'Customize the price scroll: add, remove, reorder'; te.innerHTML = '&#9881;<span class="tk-edl"> Customize</span>'; tw.appendChild(te);
    te.addEventListener('click', function (e) { e.stopPropagation(); if (tke) tkeClose(true); else tkeOpen(te); });
    var ss = document.createElement('span'); ss.className = 'tk-sess'; ss.setAttribute('data-tk-sess', ''); tw.insertBefore(ss, tk);
    var sessT = function () { var F2 = window.BTD_FEED, s2 = F2 && F2.session ? F2.session() : 'closed'; ss.textContent = { pre: 'PRE', open: 'OPEN', post: 'AH', closed: 'CLOSED' }[s2] || 'CLOSED'; ss.className = 'tk-sess tk-s-' + s2; ss.title = { pre: 'US stocks: pre-market (4:00\u20139:30 AM ET)', open: 'US stocks: regular session (9:30 AM\u20134:00 PM ET)', post: 'US stocks: after hours (4:00\u20138:00 PM ET)', closed: 'US stocks closed; crypto and most futures still trade' }[s2]; }; sessT(); setInterval(sessT, 30000);
    tk.addEventListener('click', function (e) { var it = e.target.closest && e.target.closest('[data-tk-open]'); if (it && !e.target.closest('[data-spk]') && window.BTD_LC && window.BTD_LC.open) { e.preventDefault(); window.BTD_LC.open(it.getAttribute('data-tk-open')); return; } if (!e.target.closest('[data-spk]')) tk.classList.toggle('tk-paused'); });
    tk.addEventListener('keydown', function (e) { var it = e.target.closest && e.target.closest('[data-tk-open]'); if (it && e.key === 'Enter' && window.BTD_LC) window.BTD_LC.open(it.getAttribute('data-tk-open')); });
    /* desktop second line: headline crawl from the site's own JSON (upcoming key dates, Strategy ledger, this week's news headlines with dates) */
    var hl = document.createElement('div'); hl.className = 'tk-hl'; hl.setAttribute('aria-label', 'Headlines'); hl.innerHTML = '<span class="tk-hl-l">HEADLINES</span><div class="tk-hl-v"><div class="tk-hl-in" data-tk-hl></div></div>'; /* one strip on the site: the headline band is not inserted; its key-date lookup feeds the strip's 'Next' item */
    Promise.all([fetch('/assets/data/keydates.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).catch(function () { return null; }), fetch('/assets/data/news.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).catch(function () { return null; })]).then(function (r) {
      var H = [], now = Date.now(), dd = function (iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }); };
      var KD = r[0] && (r[0].items || r[0].events || []); try { var nk = (KD || []).filter(function (x) { return x.date && Date.parse(x.date + 'T23:59:00-04:00') >= Date.now(); })[0]; if (nk) { window.BTD_NEXTKD = { d: new Date(nk.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), t: String(nk.title || nk.name || '').slice(0, 48) }; ticker(); } } catch (e) {} (KD || []).filter(function (x) { return x.date && Date.parse(x.date + 'T23:59:00-04:00') >= now; }).slice(0, 5).forEach(function (x) { H.push('<span class="tk-h"><em>COMING UP</em> ' + esc(x.title || x.name || '') + ' \u00b7 ' + esc(dd(x.date + 'T12:00:00-04:00')) + (x.time ? ' ' + esc(x.time) : '') + '</span>'); });
      if (DESK && DESK.strategy) { var S2 = DESK.strategy; if (S2.last_buy_btc) H.push('<span class="tk-h"><em>STRATEGY</em> Last reported purchase: ' + fmt(S2.last_buy_btc) + ' BTC (' + esc(S2.last_buy_reported || '') + ') \u00b7 holds ' + fmt(S2.btc_held) + ' BTC</span>'); if (S2.mnav) H.push('<span class="tk-h"><em>STRATEGY</em> mNAV at the last close: ' + S2.mnav.toFixed(2) + 'x</span>'); }
      var N = r[1] && r[1].items ? r[1].items.filter(function (x) { return x.published && now - Date.parse(x.published) < 7 * 864e5; }).sort(function (a, b) { return a.published < b.published ? 1 : -1; }).slice(0, 8) : []; N.forEach(function (x) { H.push('<a class="tk-h" href="' + esc(x.url) + '" target="_blank" rel="noopener"><em>NEWS \u00b7 ' + esc(dd(x.published)) + '</em> ' + esc(x.title) + ' <small>(' + esc(x.source) + ')</small></a>'); });
      var inn2 = hl.querySelector('[data-tk-hl]'); if (!H.length) { hl.hidden = true; return; } var hs = H.join(''); inn2.innerHTML = '<span class="tk-seq">' + hs + '</span><span class="tk-seq" aria-hidden="true">' + hs + '</span>'; inn2.style.animationDuration = Math.max(30, Math.round(inn2.scrollWidth / 2 / 40)) + 's';
      var syncH = function () { hl.hidden = tk.hidden || !H.length; }; new MutationObserver(syncH).observe(tk, { attributes: true, attributeFilter: ['hidden'] }); syncH(); });
    var syncW = function () { tw.hidden = tk.hidden; }; new MutationObserver(syncW).observe(tk, { attributes: true, attributeFilter: ['hidden'] }); syncW(); }
  if (tk && tkBtn) { setTicker(true, false); /* one strip, always present (static by default); the old on/off toggle is retired */ tkBtn.addEventListener('click', function () { setTicker(tk.hidden, true); }); }

  /* ---------- Desk Mode ---------- */
  var mmT = null, cycT = null;
  // Labeled on/off toggle (header) + a top-right Exit button in Desk Mode that wakes on mouse move / tap and fades, + a short hint on entry.
  var dmX = document.createElement('button'); dmX.type = 'button'; dmX.className = 'dm-x'; dmX.setAttribute('data-deskmode-exit', ''); dmX.innerHTML = '&times; Exit Desk Mode'; dmX.setAttribute('aria-label', 'Exit Desk Mode'); document.body.appendChild(dmX);
  var dmH = document.createElement('div'); dmH.className = 'dm-hint'; dmH.setAttribute('role', 'status'); dmH.setAttribute('aria-live', 'polite'); document.body.appendChild(dmH);
  function dmLabel(on) { $$('[data-deskmode]').forEach(function (b) { b.innerHTML = '&#9635;<span class="tb-lg"> Desk Mode' + (on ? ': On' : '') + '</span>'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Exit Desk Mode (Esc)' : 'Full-screen Desk Mode (Esc or the Exit button to leave)'; }); }
  dmLabel(false);
  // Desk Mode layouts: Grid (default), Focus (big numbers + main chart), Ticker wall (dense lists). Remembered per device ('btd_dml', not exported).
  var DML = [['grid', 'Grid'], ['focus', 'Focus'], ['wall', 'Live Wall']], dml = LS.get('btd_dml'); if (!DML.some(function (x) { return x[0] === dml; })) dml = 'grid';
  function dmlApply() { DML.forEach(function (x) { document.body.classList.toggle('dml-' + x[0], x[0] === dml); }); $$('[data-dml]').forEach(function (b) { var on = b.dataset.dml === dml; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); window.dispatchEvent(new Event('resize')); }
  var dmc = $('[data-dm-ctl]'); if (dmc) { var sg = document.createElement('span'); sg.className = 'seg dm-lay'; sg.setAttribute('role', 'group'); sg.setAttribute('aria-label', 'Desk Mode layout');
    sg.innerHTML = DML.map(function (x) { return '<button type="button" data-dml="' + x[0] + '">' + x[1] + '</button>'; }).join(''); dmc.insertBefore(sg, dmc.firstChild);
    sg.addEventListener('click', function (e) { var b = e.target.closest('[data-dml]'); if (!b) return; e.stopPropagation(); dml = b.dataset.dml; LS.set('btd_dml', dml); dmlApply(); dmWake(); }); }
  dmlApply();
  function enterDM() {
    document.body.classList.add('dm'); dmLabel(true);
    var touch = window.matchMedia && window.matchMedia('(hover:none)').matches; dmH.textContent = touch ? 'Desk Mode on · tap the screen, then tap Exit (top-right) to leave' : 'Desk Mode on · press Esc or click Exit (top-right) to leave';
    dmH.classList.add('on'); setTimeout(function () { dmH.classList.remove('on'); }, 3800); dmWake();
    var de = document.documentElement; if (de.requestFullscreen) de.requestFullscreen().catch(function () {});
    setTimeout(function () { modelsKey = ''; models(); }, 400);
  }
  function exitDM() {
    document.body.classList.remove('dm', 'mm'); setCycle(false); dmLabel(false); dmH.classList.remove('on');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setTimeout(function () { modelsKey = ''; models(); }, 400);
  }
  $$('[data-deskmode]').forEach(function (b) { b.addEventListener('click', function () { if (document.body.classList.contains('dm')) exitDM(); else enterDM(); }); });
  $$('[data-deskmode-exit]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); exitDM(); }); });
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('dm')) exitDM(); });
  function dmWake() { // show Desk Mode controls on mouse move OR touch (phones have no mouse and no Esc key)
    if (!document.body.classList.contains('dm')) return; document.body.classList.add('mm');
    clearTimeout(mmT); mmT = setTimeout(function () { document.body.classList.remove('mm'); }, 3500);
  }
  document.addEventListener('mousemove', dmWake); document.addEventListener('touchstart', dmWake, { passive: true });
  function setCycle(on) {
    $$('[data-autocycle]').forEach(function (x) { x.checked = on; });
    clearInterval(cycT); if (on) cycT = setInterval(function () { step(1); }, 45e3);
  }
  $$('[data-autocycle]').forEach(function (x) { x.addEventListener('change', function () { setCycle(x.checked); }); });
  if (/[?&]desk=1/.test(location.search)) document.body.classList.add('dm');
})();
