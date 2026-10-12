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
     BTC/ETH/SOL: CoinGecko (24h change), Coinbase spot as price fallback. Polled every 60s while the tab is visible.
     If a feed fails we fall back to members/data/last_closes.json and label it "last close". Tap a tile for the TradingView chart. */
  var QT = {}, QT_US = /^(NASDAQ|NYSE|AMEX|NYSEARCA|OTC|BATS|CBOE):/, QT_CG = { BTCUSD: 'bitcoin', ETHUSD: 'ethereum', SOLUSD: 'solana' };
  function qtCnbc(tv0) { if (tv0.indexOf(':') < 0) return /^[A-Z.]{1,6}$/.test(tv0) ? tv0 : null; return QT_US.test(tv0) ? tv0.split(':')[1] : null; }
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
    if (cg.length) jobs.push(fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + cg.join(',') + '&vs_currencies=usd&include_24hr_change=true').then(function (r) { return r.json(); }).then(function (j) {
        syms.forEach(function (v) { var id = qtCg(v), x = id && j[id]; if (x && x.usd) { var chp = x.usd_24h_change; QT[v] = { px: x.usd, chp: chp, ch: chp != null ? x.usd - x.usd / (1 + chp / 100) : null, tag: '24h' }; } });
      }).catch(function () { return coinbaseSpot('BTC').then(function (p) { syms.forEach(function (v) { if (qtCg(v) === 'bitcoin') QT[v] = { px: p, chp: null, ch: null, tag: 'spot' }; }); }).catch(function () {}); }));
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
    var pref = STRIP_EXTRA.filter(function (r) { return r.g === 'Preferreds'; }), crypto = STRIP_EXTRA.filter(function (r) { return r.g === 'Crypto'; }).map(function (r) { return { tk: r.tk, tv: r.tv, name: r.name, g: 'Crypto ref' }; }), other = STRIP_EXTRA.filter(function (r) { return r.g !== 'Preferreds' && r.g !== 'Crypto'; });
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
    list.innerHTML = html || '<li class="pk-none">No match in the list. Press Enter to try “' + esc(qq) + '” as a TradingView symbol.</li>';
  }
  function pkPick(tv0, tk0) {
    var t = String(tv0 || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!/^[A-Z0-9:._!\-]{1,32}$/.test(t)) { var m = $('[data-pk-msg]', pk); if (m) m.textContent = 'Use letters, numbers and an optional exchange prefix, e.g. NASDAQ:COIN.'; return; }
    var hit = stripPool().filter(function (r) { return r.tv === t || r.tk.toUpperCase() === t; })[0];
    if (LOCK[t]) { var m2 = $('[data-pk-msg]', pk); if (m2) m2.textContent = 'MSTR and BTC are already fixed tiles.'; return; }
    var pick = hit ? { tk: hit.tk, tv: hit.tv } : { tk: (tk0 || t.split(':').pop()).slice(0, 12), tv: t }, i = pkI;
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
      '<div class="pk-f"><button type="button" class="chip" data-pk-reset1>Back to ranking</button><button type="button" class="chip" data-pk-reset>Reset all tiles</button></div>';
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
    else if (b.hasAttribute('data-pk-reset1')) { var i1 = pkI; delete OV[i1]; stripSave(); pkClose(false); stripApply(i1); qtFetch(); }
    else if (b.hasAttribute('data-pk-reset')) { var i2 = pkI; OV = {}; stripSave(); pkClose(false); stripApply(i2); qtFetch(); }
  }, true);
  document.addEventListener('keydown', function (e) { if (pk && e.key === 'Escape') { e.stopPropagation(); pkClose(true); } }, true);
  window.addEventListener('resize', function () { pkClose(false); });

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
    var vm = $('[data-votw-more]'); if (vm) vm.innerHTML = (v.more || []).concat(v.strategy_link ? [v.strategy_link] : []).slice(0, 2).map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.label) + ' &#8599;</a>'; }).join('');
    spotlight(d);
    board(d.treasuries);
    pdesk(d.prefs_desk);
    $('[data-week]').innerHTML = d.week_ahead.map(function (w) { return '<li><b>' + esc(w.d) + '</b><span>' + esc(w.e) + '</span></li>'; }).join('');
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
    if (b.dataset.tbN) TBS.n = +b.dataset.tbN;
    else if (b.dataset.pin) { var k = b.dataset.pin, i = TBS.pins.indexOf(k); if (i >= 0) TBS.pins.splice(i, 1); else TBS.pins.push(k); }
    else if (b.dataset.v && b.parentNode.dataset.tbG) TBS[b.parentNode.dataset.tbG] = b.dataset.v;
    else if (b.hasAttribute('data-tb-more')) TBS.open = !TBS.open;
    else if (b.hasAttribute('data-tb-live')) TBS.live = !TBS.live;
    else if (b.hasAttribute('data-tb-ftog')) TBS.fopen = !TBS.fopen;
    else return;
    tbSave(); tbPaint();
  });
  window.addEventListener('resize', function () { clearTimeout(tbT); tbT = setTimeout(tbPaint, 300); });

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
      live.btc = p.btc; live.eth = p.eth; live.sol = p.sol; fieldStale(); paintRatios();
      setLive('btc', usd(p.btc), p.btc); setLive('btc-24h', p.btc24 == null ? '—' : pct(p.btc24), p.btc24, true);
      setLive('btceth', (p.btc / p.eth).toFixed(2) + ' ETH', p.btc / p.eth); setLive('btcsol', fmt(p.btc / p.sol, 1) + ' SOL', p.btc / p.sol);
      setLive('sats', fmt(1e8 / p.btc) + ' sats', 1e8 / p.btc);
      var a = $('[data-field-asof]'); if (a) a.textContent = p.src + ' · ' + new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET';
      paintStrategyLive(); models(); ticker();
    }).catch(function () { setLive('btc', 'unavailable', null); stale('.p-field', true, 'Live prices failed to load. Retrying every minute.'); });
    getJSON(CG + '/global', 'global', 5 * 60e3).then(function (g) {
      var dom = g.data.market_cap_percentage.btc; setLive('dom', dom.toFixed(1) + '%', +dom.toFixed(2)); setBar('dom', dom); live.dom = dom; ticker(); fieldStale();
    }).catch(function () { setLive('dom', '—', null); stale('.p-field', true, 'BTC dominance failed to load.'); });
    getJSON('https://api.alternative.me/fng/?limit=31', 'fng', 30 * 60e3).then(function (f) {
      var d = f.data, v = +d[0].value; setLive('fng', String(v), v); setLive('fng-cls', d[0].value_classification, null); setBar('fng', v);
      setLive('fng-hist', [d[1], d[7], d[30]].map(function (x) { return x ? x.value : '—'; }).join(' · '), null); live.fng = v + ' ' + d[0].value_classification; ticker();
    }).catch(function () { setLive('fng', '—', null); stale('.p-field', true, 'Fear & Greed failed to load.'); });
  }
  refreshMarket(); setInterval(refreshMarket, REFRESH_MS);

  /* ---------- Bitcoin models (client-side) ---------- */
  var HIST = null;
  fetch('/assets/data/btc_daily.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (h) { HIST = h; models(); }).catch(function (e) { console.warn('btc_daily.json unavailable', e); stale('.p-models', true, 'Daily history failed to load.'); stale('.p-zones', true, 'Daily history failed to load.'); });
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
  }
  clock(); setInterval(clock, 1000);

  /* ---------- Strategy Spotlight (same panel as /members/; strategy.com first) ---------- */
  function spotlight(D) {
    var box = $('[data-spot]'); if (!box) return; var set = function (k, h) { var e = $('[data-sp="' + k + '"]', box); if (e) e.innerHTML = h; }, s = D.strategy;
    set('mnav', s.mnav.toFixed(2) + 'x'); set('mnav-s', 'MSTR mNAV · ' + esc(s.kpi_as_of));
    var p = D.preferreds.filter(function (x) { return x.t === 'STRC'; })[0]; if (p) { set('strc', p.rate.toFixed(2) + '%'); set('strc-s', 'rate · $' + p.price.toFixed(2) + ' (' + dateLbl(p.price_as_of) + ')'); }
    set('btc', fmt(s.btc_held) + ' ₿'); set('btc-s', 'as of ' + dateLbl(s.btc_as_of) + ' · ' + fmt(s.sats_per_share) + ' sats/share');
    fetch('/assets/data/strategy.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (S) {
      var rows = S.purchases.filter(function (x) { return x.adso_k; }), last = rows[rows.length - 1], yr = last.date.slice(0, 4), base = null; rows.forEach(function (x) { if (x.date < yr) base = x; });
      if (base) { set('yield', pct((last.holdings / last.adso_k / (base.holdings / base.adso_k) - 1) * 100, 1)); set('yield-s', dateLbl(base.date) + ' → ' + dateLbl(last.date) + ' · strategy.com ledger'); } }).catch(function () {});
    fetch('/assets/data/quotes.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (Q) {
      var q = Q.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0]; if (!q) return;
      set('quote', '&ldquo;' + esc(q.text.length > 200 ? q.text.slice(0, 197) + '…' : q.text) + '&rdquo;<cite>Michael Saylor · ' + esc(q.date_label || q.date) + (q.url ? ' · <a href="' + esc(q.url) + '" target="_blank" rel="noopener">source</a>' : '') + '</cite>'); }).catch(function () {});
  }

  /* ---------- optional thin ticker (off by default) ---------- */
  var tk = $('[data-ticker]'), tkBtn = $('[data-ticker-toggle]');
  var MET = null; fetch('/assets/data/metrics.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { MET = m; ticker(); }).catch(function () {});
  function ticker() { // order: treasury stock prices, preferreds, then the high-value data
    dataTiles(); var inn = $('[data-ticker-in]'); if (!inn || tk.hidden) return; var items = [];
    if (LAST) ['MSTR', 'ASST', 'MPJPY', 'XXI', 'MARA', 'COIN'].forEach(function (t) { var q = LAST.q[t]; if (q) items.push([t, '$' + q.c.toFixed(2), (q.c / q.prev - 1) * 100]); });
    if (DESK) DESK.preferreds.forEach(function (p) { items.push([p.t, '$' + p.price.toFixed(2) + ' · ' + p.rate.toFixed(2) + '%']); });
    if (MET) ['STRF', 'STRK', 'STRD'].forEach(function (t) { var m = MET.securities[t]; if (m) items.push([t, m.price + ' · ' + m.dividend]); });
    items.push(['BTC', live.btc ? usd(live.btc) : '—']);
    if (DESK) { var s = DESK.strategy; items.push(['MSTR mNAV', s.mnav.toFixed(2) + 'x'], ['Strategy', fmt(s.btc_held) + ' ₿'], ['Last buy', '+' + fmt(s.last_buy_btc) + ' ₿ · ' + dateLbl(s.last_buy_reported)]); }
    if (live.dom) items.push(['BTC.D', live.dom.toFixed(1) + '%']); if (live.btc && live.eth) items.push(['BTC/ETH', (live.btc / live.eth).toFixed(1)]); if (live.btc && live.sol) items.push(['BTC/SOL', (live.btc / live.sol).toFixed(0)]);
    if (live.fng) items.push(['Fear & Greed', live.fng]);
    var ath = athOf(); if (ath && live.btc) items.push(['From ATH', pct((live.btc / ath - 1) * 100, 1)]);
    if (live.btc) items.push(['Power Law', (live.btc / plaw(Date.now())).toFixed(2) + 'x trend']);
    var nh = Date.UTC(2024, 3, 20) + 210000 * 600e3; items.push(['Halving', '~' + Math.max(0, Math.ceil((nh - Date.now()) / 864e5)) + ' days']);
    inn.innerHTML = items.map(function (x) { return '<b>' + esc(x[0]) + '</b>' + esc(x[1]) + (x[2] != null ? ' <span class="' + (x[2] >= 0 ? 'up' : 'dn') + '">' + pct(x[2], 1) + '</span>' : ''); }).join('') + '<b class="muted">Stocks: last close</b>';
  }
  // Off by default; a visitor's On/Off click is saved as their default. Reduced-motion visitors always start Off (and it never animates for them).
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setTicker(on, save) { tk.hidden = !on; tkBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); tkBtn.textContent = 'Price scroll: ' + (on ? 'On' : 'Off'); if (save) LS.set('btd_ticker', on ? '1' : '0'); ticker(); }
  if (tk && tkBtn) { setTicker(!RM && LS.get('btd_ticker') === '1', false); tkBtn.addEventListener('click', function () { setTicker(tk.hidden, true); }); }

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
