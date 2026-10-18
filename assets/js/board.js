/* BTC Treasury Desk: home live panels, all from BTD_FEED (free feeds, no AI).
   [data-mk]  Markets board (customizable: add/remove/reorder, saved, reset): Bitcoin desk (BTC, MSTR, live mNAV, Treasury 10, Street Sentiment, ETH, SOL) + US indexes/futures, rates, dollar, VIX,
              commodities, Japan/Europe, Mag 7. Session-aware: pre-market / after-hours prices and futures outside regular hours; tokenized stocks promoted
              into the board after hours and on weekends. Never blank: last close cached in this browser.
   [data-wl]  Treasury companies window: standard list or your own (add/remove/reorder, saved, reset) + Movers view + Preferreds dropdown (majors).
   [data-cx]  Crypto market (compact, Bitcoin-first): total cap, alt index (ex-BTC), dominance, stablecoins, alt-season breadth, Fear & Greed.
   [data-tok] Tokenized stocks (xStocks, 24/7) vs the last stock price.   [data-wall] Live Wall: BTC + up to 4 picks, small live charts.
   Education only, not investment advice. */
/* BTD_CTX: context for live tiles. 5D sparkline (last daily closes + live), explicit change timeframe, and short reads vs a labelled reference
   (1y average, 1 month ago, 52-week range) from assets/data/ctx.json (weekly, Yahoo daily closes). */
(function () {
  var D = null, subs = [];
  fetch('/assets/data/ctx.json?v=' + Math.floor(Date.now() / 36e5)).then(function (r) { return r.json(); }).then(function (j) { D = j.k || {}; subs.forEach(function (f) { try { f(); } catch (e) {} }); }).catch(function () { D = {}; });
  function et() { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function lastSess() { var e = et(), d = e.weekday, h = +e.hour, W = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; if (W.indexOf(d) >= 0 && h >= 16) return 'today'; if (d === 'Sat' || d === 'Sun' || d === 'Mon') return 'Fri'; return W[W.indexOf(d) - 1]; }
  var CRY = /^(BTC|ETH|SOL|C:.+|X:.+)$/;
  window.BTD_CTX = {
    on: function (f) { subs.push(f); if (D) f(); },
    get: function (k) { return D && D[k]; },
    /* timeframe label for a quote's % change */
    tf: function (k, q, session, ext) { if (CRY.test(k)) return '24h'; if (ext) return 'vs close'; if (/^@/.test(k)) return 'vs settle'; if (q && q.yld) return 'vs prior close';
      if (session === 'open') return 'today'; var l = lastSess(); return l === 'today' ? 'today' : 'on ' + l; },
    spark: function (k, live) { var c = D && D[k]; if (!c || !c.c5 || c.c5.length < 3) return ''; var v = c.c5.slice(); if (live != null && isFinite(live)) v.push(live);
      var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), w = 44, h = 14, rg = hi - lo || 1, up = v[v.length - 1] >= v[0];
      var pts = v.map(function (x, i) { return (i / (v.length - 1) * w).toFixed(1) + ',' + (h - 1 - (x - lo) / rg * (h - 2)).toFixed(1); }).join(' ');
      return '<svg class="spk ' + (up ? 'up' : 'dn') + '" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '"/></svg><small class="spk-l" title="Last 5 daily closes + live">5D</small>'; },
    /* short read vs a labelled reference for gauges / levels */
    read: function (k, px) { var c = D && D[k]; if (!c || px == null) return ''; var y = c.y;
      if (k === '.VIX') { var lv = px < y[0] * 0.85 ? 'calm' : px > y[0] * 1.25 ? 'elevated' : 'normal'; return lv + ' (1y avg ' + y[0].toFixed(1) + ')'; }
      if (/^US\d+Y$/.test(k)) { var bp = Math.round((px - c.m1) * 100); return (bp >= 0 ? '+' : '\u2212') + Math.abs(bp) + ' bp in 1 month'; }
      if (k === '.DXY') { var d = (px / c.m1 - 1) * 100; return (d >= 0 ? '\u2191' : '\u2193') + Math.abs(d).toFixed(1) + '% in 1 month'; }
      return ''; },
    range: function (k, px) { var c = D && D[k]; if (!c || px == null) return ''; var lo = Math.min(c.y[1], px), hi = Math.max(c.y[2], px), p = hi > lo ? (px - lo) / (hi - lo) * 100 : 50;
      return '<span class="rng" title="52-week range ' + lo.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' \u2013 ' + hi.toLocaleString('en-US', { maximumFractionDigits: 2 }) + '"><i style="left:' + p.toFixed(0) + '%"></i></span><small class="spk-l">52w</small>'; }
  };
})();
(function () {
  'use strict';
  var F = window.BTD_FEED, C = window.BTD_CH; if (!F) return;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v, d) { return v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function px(v, cur) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v), d = a >= 10000 ? 0 : a >= 1000 ? 2 : a >= 1 ? 2 : 4; var s = n(v, d); return cur === 'GBp' ? s + 'p' : cur && cur !== 'USD' ? s + ' ' + cur : '$' + s; }
  function lv(v) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v); return n(v, a >= 1000 ? 2 : a >= 10 ? 2 : 3); }
  function pc(v, d) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d == null ? 2 : d) + '%'; }
  function cls(v) { return v == null || !isFinite(v) ? '' : v > 0 ? 'up' : v < 0 ? 'dn' : 'fl'; }
  function big(v) { return v >= 1e12 ? '$' + (v / 1e12).toFixed(2) + 'T' : v >= 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : '$' + n(v / 1e6, 0) + 'M'; }
  function flash(el, dir) { if (!el || !dir) return; el.classList.remove('fl-up', 'fl-dn'); void el.offsetWidth; el.classList.add(dir > 0 ? 'fl-up' : 'fl-dn'); }
  var DESK = null, LB = [], AN = null;
  var dP = J('/assets/data/desk.json').then(function (j) { DESK = j; }).catch(function () {}), lP = J('/assets/data/leaderboard.json').then(function (j) { LB = (j.public_companies || []).filter(function (c) { return c.ticker && c.btc && c.stock_price; }).slice(0, 50); }).catch(function () {});
  J('/assets/data/analysts.json').then(function (j) { AN = j; }).catch(function () {});
  var SESS = F.session();
  function sessTag(q) { var s = F.session(); if (!q || q.cached && !q.t) return 'last close'; if (s === 'open') return ''; if (q.ext) return q.ext.kind === 'pre' ? 'pre-market' : 'after hours'; return 'close'; }

  /* ---------- Markets board ---------- */
  var mk = document.querySelector('[data-mk]');
  var FUT = { '.SPX': '@SP.1', '.IXIC': '@ND.1', '.DJI': '@DJ.1' };
  var GN = { tc: 'Bitcoin Treasury Companies', desk: 'Crypto', us: 'US stocks', rt: 'Rates · Dollar · Volatility', cm: 'Commodities (futures)', gl: 'Global Indexes', mag: 'Magnificent 7 · Top Stocks', mine: 'My Picks' };
  var MKT = { BTC: ['BTC-USD'], ETH: ['ETH-USD'], SOL: ['SOL-USD'], '.SPX': ['SPX', 'S&P 500'], '.IXIC': ['IXIC', 'Nasdaq'], '.DJI': ['DJI', 'Dow'], '.RUT': ['RUT', 'Russell 2000'], '@GC.1': ['GC=F', 'Gold futures'], '@SI.1': ['SI=F', 'Silver futures'], '@CL.1': ['CL=F', 'WTI oil futures'], '@HG.1': ['HG=F', 'Copper futures'], '@NG.1': ['NG=F', 'Natural gas futures'], '.DXY': ['DXY', 'US dollar index'], '.VIX': ['VIX', 'Volatility index'], US2Y: ['US2Y', '2-year Treasury yield'], US5Y: ['US5Y', '5-year yield'], US10Y: ['US10Y', '10-year Treasury yield'], US30Y: ['US30Y', '30-year yield'], 'JPY=': ['USDJPY', 'Dollar in yen'], '.N225': ['N225', 'Nikkei'], '.STOXX': ['SXXP', 'Stoxx 600'], '.FTSE': ['UKX', 'FTSE 100'], '.GDAXI': ['DAX', 'Germany'], '.HSI': ['HSI', 'Hang Seng'], '.KS11': ['KOSPI', 'Korea'], '.SSEC': ['SSEC', 'Shanghai'], MNAV: ['mNAV', 'MSTR value ÷ its bitcoin'], T10: ['T10', 'Desk Treasury 10'], STREET: ['MSTR', 'Street Sentiment'], MTPLF: ['MTPLF', 'Metaplanet'], '3350.T': ['3350.T', 'Metaplanet'], MPJPY: ['MPJPY', 'Metaplanet (US ADR)'], MSTR: ['MSTR', 'Strategy'], ASST: ['ASST', 'Strive'], MARA: ['MARA', 'MARA Holdings'], COIN: ['COIN', 'Coinbase'], HOOD: ['HOOD', 'Robinhood'], CRCL: ['CRCL', 'Circle'], IBIT: ['IBIT', 'iShares Bitcoin ETF'], 'EUR=': ['EURUSD', 'Euro in dollars'] };
  var FUTL = { '@SP.1': 'ES=F', '@ND.1': 'NQ=F', '@DJ.1': 'YM=F', '@RTY.1': 'RTY=F' };
  var TIPS = { BTC: 'BTC-USD, Coinbase live feed (every trade)', MNAV: 'Strategy method: enterprise value ÷ bitcoin NAV, recomputed live from MSTR and BTC', T10: 'Desk Treasury 10: the top 10 public bitcoin treasury stocks, average day move weighted by BTC held. Desk calculation.', STREET: 'MSTR analysts: 60% ratings mix + 40% average-target upside vs the live price (0–100). Analysts\u2019 views, not ours.' };
  var MKDEF = [['MSTR', 'Strategy MSTR', 'tc'], ['MPJPY', 'Metaplanet MPJPY', 'tc'], ['ASST', 'Strive ASST', 'tc'], ['MARA', 'MARA Holdings', 'tc'], /* BTC lives in the hero above (addable from the catalog); indexes live in the row under the chart, so they sit lower here */
    ['ETH', 'Ether', 'desk'], ['SOL', 'Solana', 'desk'],
    ['US2Y', 'US 2Y', 'rt'], ['US10Y', 'US 10Y', 'rt'], ['.DXY', 'Dollar DXY', 'rt'], ['.VIX', 'VIX', 'rt'], ['@GC.1', 'Gold', 'cm'], ['@SI.1', 'Silver', 'cm'], ['@CL.1', 'WTI oil', 'cm'],
    ['.N225', 'Nikkei 225', 'gl'], ['.STOXX', 'Stoxx 600', 'gl'], ['AAPL', 'AAPL', 'mag'], ['MSFT', 'MSFT', 'mag'], ['NVDA', 'NVDA', 'mag'], ['GOOGL', 'GOOGL', 'mag'], ['AMZN', 'AMZN', 'mag'], ['META', 'META', 'mag'], ['TSLA', 'TSLA', 'mag'],
    ['.SPX', 'S&P 500', 'us'], ['.IXIC', 'Nasdaq', 'us'], ['.DJI', 'Dow', 'us'], ['.RUT', 'Russell 2000', 'us']];
  var MKCAT = MKDEF.concat([['BTC', 'Bitcoin', 'desk'], ['MNAV', 'MSTR mNAV · live', 'desk'], ['T10', 'Treasury 10 · day', 'desk'], ['STREET', 'Street Sentiment', 'desk'], ['US5Y', 'US 5Y', 'rt'], ['US30Y', 'US 30Y', 'rt'], ['EUR=', 'EUR/USD', 'rt'], ['JPY=', 'USD/JPY', 'rt'], ['@HG.1', 'Copper', 'cm'], ['@NG.1', 'Natural gas', 'cm'], ['.FTSE', 'FTSE 100', 'gl'], ['.GDAXI', 'DAX', 'gl'], ['.HSI', 'Hang Seng', 'gl'], ['.KS11', 'KOSPI', 'gl'], ['.SSEC', 'Shanghai', 'gl'],
    ['COIN', 'COIN', 'mag'], ['HOOD', 'HOOD', 'mag'], ['AVGO', 'AVGO', 'mag'], ['CRCL', 'CRCL', 'mag'], ['IBIT', 'IBIT (BTC ETF)', 'mag'], ['GLD', 'GLD', 'mag'], ['BTC.CM=', 'CME BTC futures', 'desk']]);
  var MK_RX = /^[A-Z0-9.@=\-]{1,12}$/;
  function mkGet() { var o = null; try { o = JSON.parse(LS.get('btd_mk') || 'null'); } catch (e) {} if (!Array.isArray(o) || !o.length) return MKDEF.slice();
    var out = o.filter(function (x) { return Array.isArray(x) && MK_RX.test(x[0]) && GN[x[2]]; }).map(function (x) { return [x[0], String(x[1]).slice(0, 22), x[2]]; }).slice(0, 48); return out; }
  function mkSave(L) { if (JSON.stringify(L) === JSON.stringify(MKDEF)) LS.del('btd_mk'); else LS.set('btd_mk', JSON.stringify(L)); }
  function tile(k, label, cls2, tip) { var L = /^X:/.test(k) ? [k.slice(2) + 'x', 'token'] : MKT[k] || [k.replace(/^[.@]/, ''), '']; if (!tip) tip = /^X:/.test(k) ? '' : L[0] + ' · source: CNBC quote service (may be delayed)';
    return '<div class="mk-t ' + (cls2 || '') + '" data-mt="' + esc(k) + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span class="mk-l"><b class="mk-tk">' + esc(L[0]) + '</b>' + (L[1] ? ' <span class="mk-nm">' + esc(L[1]) + '</span>' : '') + '</span><b class="mk-v">…</b><span class="mk-c"></span><span class="mk-x"></span></div>'; }
  function grp(id, name, inner, extra) { return '<div class="mk-g mk-' + id + '"' + (extra || '') + '><div class="mk-gh">' + esc(name) + '</div><div class="mk-gt">' + inner + '</div></div>'; }
  var MKL = mkGet();
  function mkBuild() { if (!mk) return; var after = F.session() !== 'open'; MKL = mkGet(); var by = {}, order = [];
    MKL.forEach(function (x) { if (!by[x[2]]) { by[x[2]] = []; order.push(x[2]); } by[x[2]].push(x); });
    var html = order.map(function (g) { var name = g === 'us' && after ? 'US stocks · futures ' + (F.session() === 'pre' ? 'pre-market' : 'overnight') : GN[g];
      var h = grp(g, name, by[g].map(function (x) { return tile(x[0], x[1], x[0] === 'BTC' ? 'mk-big' : x[0] === 'MSTR' && g === 'tc' ? 'mk-big2' : g === 'mag' ? 'mk-sm' : '', TIPS[x[0]]); }).join(''));
      if (g === 'tc' && after) h += grp('tok', '24/7 tokenized · ' + (F.session() === 'closed' ? 'markets closed' : 'extended hours'), ['MSTR', 'COIN', 'SPY', 'QQQ', 'NVDA'].map(function (t) { return tile('X:' + t, t + 'x', '', 'Tokenized ' + t + ' (xStocks, onchain, trades 24/7). Tracks the stock but can drift from it. Education only.'); }).join(''), ' data-mk-tok hidden');
      return h; }).join('');
    mk.innerHTML = '<div class="mk-top"><b class="mk-title">Markets</b><span class="mk-sess" data-mk-sess></span><span class="mk-upd" data-mk-upd></span><button type="button" class="chip mk-ed" data-mk-edit aria-haspopup="dialog">✎ Customize</button></div><div class="mk-grid">' + html + '</div>';
    var w = ['MSTR']; MKL.forEach(function (x) { if (['BTC', 'ETH', 'SOL', 'MNAV', 'T10', 'STREET'].indexOf(x[0]) < 0) w.push(x[0]); if (FUT[x[0]]) w.push(FUT[x[0]]); });
    F.watch(w); mkAll(); }
  /* board editor: add / remove / reorder, saved in this browser, reset to the standard board */
  var mke = null;
  function mkEdit() { if (mke) { mke.remove(); mke = null; return; } mke = document.createElement('div'); mke.className = 'cz'; mke.setAttribute('role', 'dialog'); mke.setAttribute('aria-modal', 'true'); mke.setAttribute('aria-label', 'Customize the markets board');
    var paintE = function (msg) { var have = {}; MKL.forEach(function (x) { have[x[0]] = 1; });
      mke.innerHTML = '<div class="cz-box"><div class="cz-h"><b>Customize the markets board</b><button type="button" class="cz-x" data-e-x aria-label="Close">&times;</button></div><p class="cz-s">Add, remove and reorder tiles. Saved in this browser. The treasury-companies window has its own editor.</p>' +
        '<ol class="cz-l">' + MKL.map(function (x, i) { return '<li><span><b>' + esc(x[1]) + '</b> <small class="muted">' + esc(GN[x[2]]) + '</small></span><button type="button" data-e-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(x[1]) + ' up">&#9650;</button><button type="button" data-e-dn="' + i + '"' + (i < MKL.length - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(x[1]) + ' down">&#9660;</button><button type="button" data-e-rm="' + i + '"' + (x[0] === 'BTC' ? ' disabled title="BTC always stays"' : '') + ' aria-label="Remove ' + esc(x[1]) + '">&times;</button></li>'; }).join('') + '</ol>' +
        '<div class="cz-f"><label class="sr-only" for="mk-add">Add a tile</label><select id="mk-add" data-e-sel><option value="">Add a market…</option>' + MKCAT.filter(function (x) { return !have[x[0]]; }).map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + ' · ' + esc(GN[x[2]]) + '</option>'; }).join('') + '</select>' +
        '<form data-e-form style="display:flex;gap:6px"><input data-e-in maxlength="12" placeholder="or any ticker (e.g. PLTR)" aria-label="Add any ticker"><button class="chip" type="submit">Add</button></form></div>' +
        '<div class="cz-f"><button type="button" class="chip" data-e-reset>Reset to standard board</button><button type="button" class="chip on" data-e-x>Done</button></div><p class="cz-msg" role="status">' + esc(msg || '') + '</p></div>'; };
    var commit = function (msg) { mkSave(MKL); mkBuild(); paintE(msg); };
    mke.addEventListener('click', function (e) { if (e.target === mke) { mkEdit(); return; } var b = e.target.closest('button'); if (!b) return; var i;
      if (b.hasAttribute('data-e-x')) { mkEdit(); return; }
      if (b.dataset.eUp) { i = +b.dataset.eUp; MKL.splice(i - 1, 0, MKL.splice(i, 1)[0]); commit(); } else if (b.dataset.eDn) { i = +b.dataset.eDn; MKL.splice(i + 1, 0, MKL.splice(i, 1)[0]); commit(); }
      else if (b.dataset.eRm) { i = +b.dataset.eRm; var r = MKL.splice(i, 1)[0]; commit('Removed ' + r[1] + '.'); } else if (b.hasAttribute('data-e-reset')) { LS.del('btd_mk'); MKL = MKDEF.slice(); mkBuild(); paintE('Back to the standard board.'); } });
    mke.addEventListener('change', function (e) { if (!e.target.matches('[data-e-sel]') || !e.target.value) return; var x = MKCAT.filter(function (y) { return y[0] === e.target.value; })[0]; if (x) { MKL.push(x.slice()); commit('Added ' + x[1] + '.'); } });
    mke.addEventListener('submit', function (e) { e.preventDefault(); var v = mke.querySelector('[data-e-in]').value.trim().toUpperCase(); if (!MK_RX.test(v)) return; F.watch([v]); var t = 0, iv = setInterval(function () { var q = F.get(v); t++;
      if (q && q.px != null) { clearInterval(iv); MKL.push([v, (q.sn || v).slice(0, 18), 'mine']); commit('Added ' + v + '.'); } else if ((q && q.none) || t > 20) { clearInterval(iv); paintE('No quote found for ' + v + '.'); } }, 300); });
    document.body.appendChild(mke); paintE(); var x0 = mke.querySelector('[data-e-x]'); if (x0) x0.focus(); }
  document.addEventListener('keydown', function (e) { if (mke && e.key === 'Escape') mkEdit(); });
  function setT(k, v, chg, x, title) { if (/\.T$/.test(k) && v && v[0] !== '¥' && v !== '…') v = '¥' + v; var el = mk && mk.querySelector('[data-mt="' + k + '"]'); if (!el) return; var vb = el.querySelector('.mk-v'), old = vb.textContent;
    vb.textContent = v; if (old !== '…' && old !== v) flash(vb, parseFloat(v.replace(/[^0-9.\-]/g, '')) > parseFloat(old.replace(/[^0-9.\-]/g, '')) ? 1 : -1);
    var c = el.querySelector('.mk-c'), X = window.BTD_CTX, q = F.get(k), ses = F.session(); c.innerHTML = chg ? esc(chg[0]) + (X && chg[0] && !/^(MNAV|T10|STREET)$/.test(k) ? ' <small class="mk-tf">' + X.tf(k, q, ses) + '</small>' : '') : ''; c.className = 'mk-c ' + (chg ? chg[1] : ''); el.querySelector('.mk-x').innerHTML = x || ''; if (title) el.title = title;
    if (X) { var kx = el.querySelector('.mk-k'); if (!kx) { kx = document.createElement('span'); kx.className = 'mk-k'; el.appendChild(kx); } var live = q && q.px != null ? q.px : null, rd = X.read(k, live), sp = X.spark(k, live);
      if (k === 'MNAV' && DESK && DESK.strategy) rd = 'vs ' + DESK.strategy.mnav.toFixed(2) + 'x official close' + (DESK.strategy.mnav_date ? ' (' + esc(DESK.strategy.mnav_date) + ')' : '');
      kx.innerHTML = (sp || (X.get(k) ? '' : '')) + (rd ? '<small class="mk-rd">' + rd + '</small>' : (/^(\.VIX|\.DXY|US\d+Y)$/.test(k) ? X.range(k, live) : '')); } }
  function qTile(sym, opt) { opt = opt || {}; var q = F.get(sym); if (!q || q.px == null) return; var s = F.session(), main = q.px, ch = q.chp, x = '';
    if (q.yld) { setT(sym, q.px.toFixed(3) + '%', [(q.ch >= 0 ? '+' : '−') + Math.abs(q.ch * 100).toFixed(1) + ' bp', cls(q.ch)], s === 'open' ? '<small>yield · live</small>' : '<small>yield · last close</small>', sym + ' Treasury yield. bp = basis point = 0.01 percentage point. Source: CNBC quote service (may be delayed)'); return; }
    if (q.ext && s !== 'open') x = '<em title="' + (q.ext.kind === 'pre' ? 'Pre = pre-market trading, 4:00\u20139:30 AM ET' : 'AH = after-hours trading, 4:00\u20138:00 PM ET') + '">' + (q.ext.kind === 'pre' ? 'Pre' : 'AH') + '</em> ' + lv(q.ext.px) + ' <span class="' + cls(q.ext.chp) + '">' + pc(q.ext.chp) + '</span>';
    var fs = opt.fut || FUT[sym]; if (fs) { var f = F.get(fs); if (f && f.px != null && s !== 'open') x = '<em title="Futures (front-month contract), trade nearly 24 hours on weekdays">' + (FUTL[fs] || 'Fut') + '</em> ' + lv(f.px) + ' <span class="' + cls(f.chp) + '">' + pc(f.chp) + '</span>'; }
    if (s !== 'open' && !x && q.chp != null && !/^@/.test(sym)) x = '<small>' + (q.cached ? 'cached ' : '') + 'last close</small>';
    setT(sym, opt.usd ? px(main, q.cur) : lv(main), [pc(ch), cls(ch)], x); }
  function mkCrypto(k) { var q = F.get(k); if (!q) return; setT(k, px(q.px), [pc(q.chp), cls(q.chp)], k === 'BTC' ? '<small>24h H ' + n(q.hi, 0) + ' L ' + n(q.lo, 0) + '</small>' : ''); }
  function mstrPx() { var q = F.get('MSTR'); if (!q || q.px == null) return null; return q.ext && F.session() !== 'open' ? q.ext.px : q.px; }
  function mkDesk() { if (!mk) return; mkCrypto('BTC'); mkCrypto('ETH'); mkCrypto('SOL'); qTile('MSTR', { usd: 1 });
    var b = F.get('BTC'), m = mstrPx(); if (DESK && b && m && window.btdLiveMnav) { var mn = window.btdLiveMnav(DESK.strategy.kpis, m, b.px); if (mn) setT('MNAV', mn.toFixed(3) + 'x', null, '<small>' + (mn < 1 ? 'below' : 'above') + ' BTC value · close ' + DESK.strategy.mnav.toFixed(2) + 'x</small>'); }
    else if (DESK && b && m) { var K = DESK.strategy.kpis.live, sh = K.market_cap_musd / K.mstr_close, cash = K.market_cap_musd + K.debt_musd + K.pref_musd - K.ev_musd, mv = (m * sh + K.debt_musd + K.pref_musd - cash) / (K.btc_held * b.px / 1e6); setT('MNAV', mv.toFixed(3) + 'x', null, '<small>EV ÷ BTC NAV</small>'); }
    // Treasury 10
    var tw = 0, ts = 0, cnt = 0; LB.slice(0, 12).forEach(function (c) { var s = F.cn(c.ticker), q = s && F.get(s); if (!q || q.chp == null || cnt >= 10) return; var ch = q.ext && F.session() !== 'open' ? ((q.ext.px / q.prev) - 1) * 100 : q.chp; if (!isFinite(ch)) ch = q.chp; tw += c.btc; ts += c.btc * ch; cnt++; });
    if (cnt >= 5) { var t10 = ts / tw; setT('T10', pc(t10), null, '<small>' + cnt + ' stocks · BTC-weighted' + (F.session() !== 'open' ? ' · incl. ext. hrs' : '') + '</small>'); var el = mk.querySelector('[data-mt="T10"] .mk-v'); if (el) el.className = 'mk-v ' + cls(t10); }
    // Street Sentiment (MSTR)
    var a = AN && AN.cos && AN.cos.MSTR; if (a && m) { var nA = a.buy + a.hold + a.sell, mix = (a.buy + a.hold * 0.5) / nA * 100, up = (a.pt / m - 1) * 100, sc = Math.round(mix * 0.6 + Math.max(0, Math.min(100, (up + 50) / 150 * 100)) * 0.4), wd = sc >= 65 ? 'Bullish' : sc >= 40 ? 'Mixed' : 'Bearish';
      setT('STREET', sc + ' ' + wd, null, '<small>' + a.buy + '/' + nA + ' Buy · target $' + n(a.pt, 0) + ' (' + pc(up, 0) + ')</small>'); var e2 = mk.querySelector('[data-mt="STREET"] .mk-v'); if (e2) e2.className = 'mk-v ' + (wd === 'Bullish' ? 'up' : wd === 'Bearish' ? 'dn' : ''); } }
  function mkTok() { var T = F.get('tok'); if (!T || !mk) return; var tg = mk.querySelector('[data-mk-tok]'); if (tg) tg.hidden = false; ['MSTR', 'COIN', 'SPY', 'QQQ', 'NVDA'].forEach(function (t) { var x = T[t]; if (!x) return; var st = F.get(t === 'SPY' ? '.SPX' : t === 'QQQ' ? '@ND.1' : t), ref = null;
      if (st && st.px && (t === 'MSTR' || t === 'COIN' || t === 'NVDA')) ref = (x.px / st.px - 1) * 100; setT('X:' + t, px(x.px), [pc(x.chp), cls(x.chp)], ref != null ? '<small>vs close ' + pc(ref, 1) + '</small>' : '<small>24h</small>'); }); }
  if (window.BTD_CTX) window.BTD_CTX.on(function () { try { mkAll(); } catch (e) {} });
  function mkAll() { if (!mk) return; mkDesk(); MKL.forEach(function (x) { if (['BTC', 'ETH', 'SOL', 'MNAV', 'T10', 'STREET', 'MSTR'].indexOf(x[0]) < 0) qTile(x[0], x[2] === 'tc' ? { usd: 1 } : undefined); }); mkTok();
    var s = F.session(), lab = { open: 'US market open · live', pre: 'Pre-market · 4:00–9:30 AM ET', post: 'After hours · 4:00–8:00 PM ET', closed: 'US market closed · futures & 24/7 tokenized shown' }[s];
    var se = mk.querySelector('[data-mk-sess]'); se.textContent = lab; se.className = 'mk-sess s-' + s; }
  var upd = 0; function stamp() { var e = mk && mk.querySelector('[data-mk-upd]'); if (e) e.textContent = 'updated ' + new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit' }) + ' ET'; }
  if (mk) { mkBuild(); mk.addEventListener('click', function (e) { if (e.target.closest('[data-mk-edit]')) mkEdit(); }); F.on('BTC', function () { mkCrypto('BTC'); mkDesk(); if (Date.now() - upd > 1000) { upd = Date.now(); stamp(); } }); F.on('ETH', function () { mkCrypto('ETH'); }); F.on('SOL', function () { mkCrypto('SOL'); });
    F.on('quotes', function () { mkAll(); stamp(); }); F.on('tok', mkTok); F.on('session', function () { mkBuild(); }); Promise.all([dP, lP]).then(function () { F.watch(LB.slice(0, 12).map(function (c) { return F.cn(c.ticker); }).filter(Boolean)); mkAll(); }); }

  /* ---------- Treasury companies window: standard list (BTC + top 12 by BTC held) or your own list; Movers view; own editor + reset ---------- */
  var wl = document.querySelector('[data-wl]'), WT = LS.get('btd_wlt') === 'movers' ? 'movers' : 'core', WE = false;
  function wlDef() { return ['BTC'].concat(LB.slice(0, 12).map(function (c) { return F.cn(c.ticker); }).filter(Boolean)); }
  function wlGet() { var o = null; try { o = JSON.parse(LS.get('btd_tw') || 'null'); } catch (e) {} return Array.isArray(o) && o.length ? o.filter(function (x) { return /^[A-Z0-9.@=\-]{1,12}$/.test(x); }).slice(0, 40) : wlDef(); }
  function wlSave(a) { if (a.join() === wlDef().join()) LS.del('btd_tw'); else LS.set('btd_tw', JSON.stringify(a)); }
  function lbOf(cn) { return LB.filter(function (c) { return F.cn(c.ticker) === cn; })[0]; }
  function row(sym, i, n0) { var crypto = ['BTC', 'ETH', 'SOL'].indexOf(sym) >= 0, q = F.get(sym), c = lbOf(sym), b = F.get('BTC'), s = F.session(); var nm = crypto ? { BTC: 'Bitcoin', ETH: 'Ether', SOL: 'Solana' }[sym] : c ? c.name : q && q.name ? q.name : sym;
    var last = q && q.px != null ? (crypto ? px(q.px) : px(q.px, q.cur)) : '…', ch = q ? q.chp : null, ext = !crypto && q && q.ext && s !== 'open' ? '<em title="' + (q.ext.kind === 'pre' ? 'Pre = pre-market trading, 4:00\u20139:30 AM ET' : 'AH = after-hours trading, 4:00\u20138:00 PM ET') + '">' + (q.ext.kind === 'pre' ? 'Pre' : 'AH') + '</em> <span class="' + cls(q.ext.chp) + '">' + pc(q.ext.chp) + '</span>' : '';
    var mn = ''; if (c && (c.sub === 'treasury' || c.subtype === 'treasury' || c.subtype === 'miner') && q && q.px && b && c.currency === 'USD' && c.stock_price && c.market_cap_basic && c.btc) { var p = q.ext && s !== 'open' ? q.ext.px : q.px, v = (c.market_cap_basic / c.stock_price * p) / (c.btc * b.px); if (isFinite(v) && v < 50) mn = v.toFixed(2) + 'x'; }
    var ed = WE && WT === 'core' ? '<td class="c-ed"><button type="button" data-w-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(sym) + ' up">&#9650;</button><button type="button" data-w-dn="' + i + '"' + (i < n0 - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(sym) + ' down">&#9660;</button><button type="button" data-w-rm="' + i + '" aria-label="Remove ' + esc(sym) + '">&times;</button></td>' : '';
    return '<tr data-wr="' + esc(sym) + '"><td class="c-sy"><b>' + esc(sym) + '</b><small>' + esc(String(nm).slice(0, 26)) + '</small></td><td class="r c-px" data-wpx>' + last + '</td><td class="r ' + cls(ch) + '">' + pc(ch) + (ext ? '<small class="wx">' + ext + '</small>' : '') + '</td>' +
      '<td class="r c-mn" title="Basic mNAV, live: market cap ÷ value of BTC held">' + mn + '</td><td class="r c-bh" title="' + (c ? n(c.btc, 0) + ' BTC' : '') + '">' + (c ? (c.btc >= 1e4 ? n(c.btc / 1e3, 1) + 'K' : n(c.btc, 0)) : '') + '</td>' + ed + '</tr>'; }
  function wlList() { if (WT === 'movers') { var a = LB.map(function (c) { return F.cn(c.ticker); }).filter(function (s) { var q = s && F.get(s); return q && q.chp != null; });
      var mv = function (q) { return q.ext && F.session() !== 'open' && q.ext.chp != null ? q.chp + q.ext.chp : q.chp; }; a.sort(function (x, y) { return Math.abs(mv(F.get(y))) - Math.abs(mv(F.get(x))); }); return a.slice(0, 12); }
    return wlGet(); }
  function prefRows() { var R = DESK && DESK.prefs_desk ? DESK.prefs_desk.rows : []; return R.filter(function (r) { return ['STRC', 'STRF', 'STRK', 'STRD', 'SATA'].indexOf(r.t) >= 0; }).map(function (r) { var q = F.get(r.t), p = q && q.px != null ? q.px : r.close, ch = q ? q.chp : r.prev ? (r.close / r.prev - 1) * 100 : null;
      return '<tr><td><b>' + esc(r.t) + '</b><small>' + esc(r.issuer + ' ' + r.name) + '</small></td><td class="r">$' + p.toFixed(2) + (q ? '' : ' <small>close</small>') + '</td><td class="r ' + cls(ch) + '">' + pc(ch) + '</td><td class="r">' + r.rate.toFixed(2) + '%</td><td class="r"><b>' + (r.rate * (r.par || 100) / p).toFixed(2) + '%</b></td></tr>'; }).join(''); }
  function wlPaint() { if (!wl) return; var L = wlList();
    wl.querySelector('[data-wl-body]').innerHTML = L.map(function (s, i) { return row(s, i, L.length); }).join('') || '<tr><td colspan="5" class="muted">Loading…</td></tr>';
    wl.querySelectorAll('[data-wl-t]').forEach(function (b) { var on = b.dataset.wlT === WT; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    var ebtn = wl.querySelector('[data-wl-edit]'); ebtn.hidden = WT !== 'core'; ebtn.textContent = WE ? 'Done' : '✎ Customize'; ebtn.setAttribute('aria-pressed', WE);
    wl.querySelector('[data-wl-tools]').hidden = !(WE && WT === 'core'); wl.querySelector('.wl').classList.toggle('editing', WE && WT === 'core'); var pr = wl.querySelector('[data-wl-pref]'); if (pr) pr.innerHTML = prefRows();
    var custom = !!LS.get('btd_tw'); wl.querySelector('[data-wl-note]').textContent = WT === 'movers' ? 'Biggest day moves among the top 50 treasury stocks' + (F.session() !== 'open' ? ', including pre-market / after-hours' : '') + '.' : custom ? 'Your list · saved in this browser.' : 'Standard list: BTC and the top 12 public companies by bitcoin held. Customize to make it yours.'; }
  if (wl) {
    wl.innerHTML = '<div class="p-h"><span class="p-t">Treasury companies</span><div class="seg" role="tablist" aria-label="Window view"><button type="button" role="tab" data-wl-t="core">Watchlist</button><button type="button" role="tab" data-wl-t="movers">Movers</button></div><button type="button" class="chip" data-wl-edit aria-pressed="false">✎ Customize</button></div>' +
      '<div class="wl-tools" data-wl-tools hidden><form data-wl-add><select data-wl-sel aria-label="Add a top-50 company"><option value="">Add from top 50…</option></select><input data-wl-in maxlength="12" placeholder="or any ticker" aria-label="Add any ticker" autocomplete="off"><button class="chip" type="submit">Add</button></form><button type="button" class="chip" data-wl-reset>Reset to standard</button><span class="wl-msg" data-wl-msg role="status"></span></div>' +
      '<div class="wl-wrap"><table class="wl"><thead><tr><th>Symbol</th><th class="r">Last</th><th class="r">Day</th><th class="r" title="Basic mNAV, live">mNAV</th><th class="r c-bh">BTC held</th></tr></thead><tbody data-wl-body></tbody></table></div>' +
      '<p class="wl-note" data-wl-note></p>' +
      '<details class="wl-pref" data-wl-pdet><summary>Preferreds <small>STRC · STRF · STRK · STRD · SATA</small><a href="/preferreds/">Yield Desk →</a></summary><table class="wl wl-p"><thead><tr><th>Pref</th><th class="r">Price</th><th class="r">Day</th><th class="r">Rate</th><th class="r" title="Stated rate on $100 par ÷ price">Eff. yield</th></tr></thead><tbody data-wl-pref></tbody></table></details>';
    var det = wl.querySelector('[data-wl-pdet]'); if (LS.get('btd_wlp') === '1') det.open = true; det.addEventListener('toggle', function () { LS.set('btd_wlp', det.open ? '1' : '0'); });
    var addOne = function (s) { var a = wlGet(); if (a.indexOf(s) < 0) a.push(s); wlSave(a); wlPaint(); wl.querySelector('[data-wl-msg]').textContent = 'Added ' + s + '.'; };
    wl.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var a = wlGet(), i;
      if (b.dataset.wlT) { WT = b.dataset.wlT; LS.set('btd_wlt', WT); wlPaint(); }
      else if (b.hasAttribute('data-wl-edit')) { WE = !WE; wlPaint(); }
      else if (b.dataset.wUp) { i = +b.dataset.wUp; a.splice(i - 1, 0, a.splice(i, 1)[0]); wlSave(a); wlPaint(); }
      else if (b.dataset.wDn) { i = +b.dataset.wDn; a.splice(i + 1, 0, a.splice(i, 1)[0]); wlSave(a); wlPaint(); }
      else if (b.dataset.wRm) { a.splice(+b.dataset.wRm, 1); wlSave(a.length ? a : wlDef()); wlPaint(); }
      else if (b.hasAttribute('data-wl-reset')) { LS.del('btd_tw'); wlPaint(); wl.querySelector('[data-wl-msg]').textContent = 'Back to the standard list.'; } });
    wl.addEventListener('change', function (e) { if (e.target.matches('[data-wl-sel]') && e.target.value) { var s = F.cn(e.target.value) || e.target.value; F.watch([s]); addOne(s); e.target.value = ''; } });
    wl.addEventListener('submit', function (e) { e.preventDefault(); var inp = wl.querySelector('[data-wl-in]'), v = inp.value.trim().toUpperCase(), msg = wl.querySelector('[data-wl-msg]'); if (!v) return; if (!/^[A-Z0-9.@=\-]{1,12}$/.test(v)) { msg.textContent = 'Use a ticker like GLXY or .SPX'; return; }
      var s = ['BTC', 'ETH', 'SOL'].indexOf(v) >= 0 ? v : F.cn(v) || v; if (['BTC', 'ETH', 'SOL'].indexOf(s) >= 0) { addOne(s); inp.value = ''; return; } msg.textContent = 'Checking ' + s + '…'; F.watch([s]);
      var tries = 0, iv = setInterval(function () { var q = F.get(s); tries++; if (q && q.px != null) { clearInterval(iv); inp.value = ''; addOne(s); } else if ((q && q.none) || tries > 20) { clearInterval(iv); msg.textContent = 'No quote found for ' + v + '.'; } }, 300); });
    Promise.all([dP, lP]).then(function () { wl.querySelector('[data-wl-sel]').innerHTML = '<option value="">Add from top 50…</option>' + LB.map(function (c) { return '<option value="' + esc(c.ticker) + '">#' + esc(c.rank) + ' ' + esc(c.ticker) + ' · ' + esc(c.name.slice(0, 24)) + '</option>'; }).join('');
      F.watch(LB.map(function (c) { return F.cn(c.ticker); }).filter(Boolean).concat(wlGet().filter(function (s) { return ['BTC', 'ETH', 'SOL'].indexOf(s) < 0; }), ['STRC', 'STRF', 'STRK', 'STRD', 'SATA'])); wlPaint(); });
    var wlT = 0; F.on('quotes', function () { if (!WE) wlPaint(); }); F.on('BTC', function () { if (Date.now() - wlT > 2000) { wlT = Date.now(); var r = wl.querySelector('[data-wr="BTC"] [data-wpx]'), q = F.get('BTC'); if (r && q) { var o = r.textContent; r.textContent = px(q.px); if (o !== r.textContent) flash(r, q.dir); } } }); }

  /* ---------- Crypto market ---------- */
  /* Crypto overall impression: compact, BTC-first context (no coin lists, no gainers). All feeds are 24/7. */
  var cx = document.querySelector('[data-cx]');
  if (cx) {
    var K = function (k, lab, tip) { return '<div class="cx-k"' + (tip ? ' title="' + tip + '"' : '') + '><span>' + lab + '</span><b data-cx="' + k + '">…</b><small data-cx="' + k + '-s"></small><span class="mk-k" data-cx-sp="' + k + '"></span></div>'; };
    cx.innerHTML = '<div class="p-h"><span class="p-t">Crypto at a glance</span><span class="tag">BTC-first · live 24/7</span></div>' +
      '<p class="cx-read" data-cx="read">Reading the market…</p><div class="cx">' +
      K('dom', 'Bitcoin dominance', 'Bitcoin\u2019s share of total crypto market value (CoinGecko). 24h change is a Desk calc from BTC and total-cap moves.') +
      K('tot', 'Total crypto market cap', 'All crypto market value in USD (CoinGecko).') +
      K('alt', 'Altcoin market cap', 'Total crypto market value excluding bitcoin (all coins except BTC, TOTAL2-style). Desk calc from CoinGecko.') +
      K('eth', 'ETH-USD', 'Ether spot price, Coinbase live feed.') + K('sol', 'SOL-USD', 'Solana spot price, Coinbase live feed.') +
      K('eb', 'ETH/BTC', 'Ether priced in bitcoin (ETH-USD \u00f7 BTC-USD, Coinbase). Rising = ether outperforming bitcoin.') +
      K('stb', 'Stablecoin supply', 'All USD-pegged stablecoins across chains (DefiLlama). Growing supply = more on-chain dollars that can move into crypto quickly; context, not a forecast.') +
      '<div class="cx-k" title="Crypto Fear &amp; Greed Index (alternative.me), 0 = extreme fear, 100 = extreme greed. Reference: its own 30-day average."><span>Fear &amp; Greed</span><b data-live="fng">…</b><small data-live="fng-cls"></small><small class="mk-rd" data-cx="fng-r"></small></div>' +
      '</div><div class="cx-m" title="Desk calc (our own gauge): share of the top 50 altcoins (ex-stablecoins and wrapped tokens) beating BTC over 30 days. 75+ = altcoin season, 25 or less = bitcoin season."><div class="cx-mh"><span>Altcoin-season gauge \u00b7 our calc, last 30 days</span><b data-cx="szn">…</b></div><div class="cx-bar"><i data-cx="szn-i"></i></div><div class="cx-sc"><span>Bitcoin season</span><span>Altcoin season</span></div></div>' +
      '<p class="p-f">CoinGecko (caps, dominance, breadth), Coinbase (BTC, ETH, SOL), DefiLlama (stablecoins), alternative.me (Fear &amp; Greed). Context for a Bitcoin desk, not a coin list. Education only.</p>';
    var set = function (k, v, c) { var e = cx.querySelector('[data-cx="' + k + '"]'); if (e) { e.textContent = v; if (c != null) e.className = c; } };
    var DD = null, ST = null, SZ = null;
    var read = function () { var parts = [];
      if (DD != null) parts.push(DD > 0.15 ? 'BTC dominance rising: money concentrating in Bitcoin.' : DD < -0.15 ? 'BTC dominance slipping: alts outpacing Bitcoin today.' : 'BTC dominance steady: crypto moving largely together.');
      if (ST != null) parts.push(ST > 0.5 ? 'Stablecoin supply growing (more dollars on-chain).' : ST < -0.5 ? 'Stablecoin supply shrinking.' : 'Stablecoin supply flat on the week.');
      if (SZ != null && (SZ >= 75 || SZ <= 25)) parts.push(SZ >= 75 ? 'Most large alts beating BTC over 30 days.' : 'Few large alts beating BTC over 30 days.');
      if (parts.length) set('read', parts.join(' ')); };
    var gP = function () { var g = F.get('global'), br = F.get('breadth'); if (!g) return; set('dom', g.dom.toFixed(2) + '%'); set('tot', big(g.tot)); set('alt', big(g.alt));
      /* 24h changes from the top-80 coins' own market-cap changes (CoinGecko's global 24h figure can be badly off) */
      if (br && br.tchp != null && br.achp != null) { set('tot-s', pc(br.tchp) + ' 24h', cls(br.tchp)); set('alt-s', pc(br.achp) + ' 24h', cls(br.achp));
        var altSh = 1 - g.dom / 100, prevAltSh = altSh * (1 + br.tchp / 100) / (1 + br.achp / 100); DD = (prevAltSh - altSh) * 100; set('dom-s', (DD >= 0 ? '\u2191 ' : '\u2193 ') + Math.abs(DD).toFixed(2) + ' pt vs 24h ago', cls(DD)); }
      read(); };
    var cP = function () { var b = F.get('BTC'), e = F.get('ETH'), s = F.get('SOL');
      if (e && e.px) { set('eth', px(e.px)); set('eth-s', pc(e.chp) + ' 24h', cls(e.chp)); } if (s && s.px) { set('sol', px(s.px)); set('sol-s', pc(s.chp) + ' 24h', cls(s.chp)); }
      var X = window.BTD_CTX; if (X) { [['eth', 'ETH', e], ['sol', 'SOL', s]].forEach(function (z) { var sp = cx.querySelector('[data-cx-sp="' + z[0] + '"]'); if (sp && z[2] && z[2].px) sp.innerHTML = X.spark(z[1], z[2].px); }); }
      if (b && b.px && e && e.px) { set('eb', (e.px / b.px).toFixed(5)); if (e.chp != null && b.chp != null) { var r = ((1 + e.chp / 100) / (1 + b.chp / 100) - 1) * 100; set('eb-s', pc(r) + ' 24h', cls(r)); } } };
    var S7 = null; try { S7 = JSON.parse(LS.get('btd_stb7b') || 'null'); } catch (e) {}
    if (!S7 || Date.now() - S7.t > 20 * 36e5) fetch('https://stablecoins.llama.fi/stablecoincharts/all').then(function (r) { return r.json(); }).then(function (a) { if (!Array.isArray(a) || a.length < 9) return; var v = (a[a.length - 8].totalCirculatingUSD || {}).peggedUSD, v1 = (a[a.length - 1].totalCirculatingUSD || {}).peggedUSD; if (!v || !v1) return; S7 = { ch: (v1 / v - 1) * 100, t: Date.now() }; /* same series both ends (DefiLlama daily totals) */ LS.set('btd_stb7b', JSON.stringify(S7)); var st = F.get('stable'); if (st) sP(st); }).catch(function () {});
    var sP = function (s) { set('stb', big(s.tot)); if (S7 && S7.ch != null) { ST = S7.ch; set('stb-s', pc(ST, 2) + ' 7d', cls(ST)); } else set('stb-s', 'USD-pegged, all chains'); read(); };
    F.on('global', gP); F.on('stable', sP);
    F.on('breadth', function (b) { gP(); SZ = b.score; set('szn', b.score + ' \u00b7 ' + (b.score >= 75 ? 'Altcoin season' : b.score <= 25 ? 'Bitcoin season' : 'Neutral') + ' (' + b.beat + '/' + b.n + ' beat BTC)'); var i = cx.querySelector('[data-cx="szn-i"]'); if (i) i.style.left = b.score + '%'; read(); });
    var cxT = 0; var tick = function () { if (Date.now() - cxT > 3000) { cxT = Date.now(); gP(); cP(); } }; F.on('BTC', tick); F.on('ETH', tick); F.on('SOL', tick);
    gP(); cP(); if (F.get('stable')) sP(F.get('stable'));
    if (window.BTD_CTX) window.BTD_CTX.on(cP);
    fetch('https://api.alternative.me/fng/?limit=31').then(function (r) { return r.json(); }).then(function (j) { var d = (j && j.data || []).map(function (x) { return +x.value; }); if (d.length < 10) return; var avg = d.reduce(function (a, b) { return a + b; }, 0) / d.length, now = d[0];
      set('fng-r', (now > avg + 3 ? '\u2191 above' : now < avg - 3 ? '\u2193 below' : '\u2248 near') + ' its 30d avg ' + avg.toFixed(0)); }).catch(function () {});
  }

  /* ---------- Tokenized stocks ---------- */
  /* Tokenized stocks: after-hours / weekend price discovery. Curated default (treasury names, index tokens, Mag 7), customizable (✎ add/remove/reorder, saved, reset), sortable. */
  var tk = document.querySelector('[data-tok]');
  if (tk) { var TN = { MSTR: 'Strategy', STRC: 'Strategy STRC pref', COIN: 'Coinbase', MARA: 'MARA Holdings', HOOD: 'Robinhood', CRCL: 'Circle', SPY: 'S&P 500 ETF', QQQ: 'Nasdaq 100 ETF', AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon', GOOGL: 'Alphabet', META: 'Meta', TSLA: 'Tesla', GLD: 'Gold ETF', BMNR: 'BitMine', AVGO: 'Broadcom', AMD: 'AMD', ORCL: 'Oracle', INTC: 'Intel', GME: 'GameStop' };
    var TZD = ['MSTR', 'COIN', 'MARA', 'HOOD', 'CRCL', 'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA'], TZ, TSORT = 'def', TED = false;
    var tzGet = function () { var o = null; try { o = JSON.parse(LS.get('btd_tokl') || 'null'); } catch (e) {} return Array.isArray(o) && o.length ? o.filter(function (t) { return TN[t]; }).slice(0, 24) : TZD.slice(); };
    var tzSave = function () { if (TZ.join() === TZD.join()) LS.del('btd_tokl'); else LS.set('btd_tokl', JSON.stringify(TZ)); };
    TZ = tzGet(); F.watch(Object.keys(TN));
    var etParts = function () { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).forEach(function (p) { o[p.type] = p.value; }); return o; };
    var closeLbl = function () { var e = etParts(), d = e.weekday, h = +e.hour, W = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']; if (W.indexOf(d) >= 0 && h >= 16) return 'today\u2019s close'; if (d === 'Sat' || d === 'Sun' || d === 'Mon') return 'Fri close'; return W[W.indexOf(d) - 1] + ' close'; };
    var stateLbl = function () { var s = F.session(), d = etParts().weekday; return s === 'open' ? ['Market open: tokens vs stock', 'op'] : (d === 'Sat' || d === 'Sun') ? ['Weekend \u00b7 live 24/7', 'wk'] : s === 'pre' ? ['Pre-market \u00b7 live 24/7', 'ah'] : ['After hours \u00b7 live 24/7', 'ah']; };
    var TIP = 'Source: xStocks tokens (Backed Finance) via CoinGecko, refreshed every 2 min. Weekend and overnight liquidity is thin: a token price is a hint, not the official stock price. Education only.';
    tk.innerHTML = '<div class="p-h tz-h"><span class="p-t">Tokenized stocks</span><span class="tz-st" data-tz-st></span><span class="tz-up" data-tz-up></span>' +
      '<span class="seg tz-sort" role="group" aria-label="Sort"><button type="button" data-tz-sort="def">Default</button><button type="button" data-tz-sort="prem">Premium</button><button type="button" data-tz-sort="move">Move</button></span><button type="button" class="chip" data-tz-ed aria-expanded="false">\u270e Customize</button></div>' +
      '<p class="tz-x" title="' + TIP + '">Tokenized stocks trade 24/7, so off-hours they hint where shares may open. Thin liquidity: a hint, not the official price.</p><div class="tz-ed" data-tz-edp hidden></div>' +
      '<div class="tz-g" data-tz-g><p class="wl-mu">Loading tokenized prices from CoinGecko\u2026 (free feed, refreshes every 2 min; if it stays empty the feed is rate-limited, try again shortly)</p></div>' +
      '<p class="p-f">xStocks tokens (Backed Finance, on Solana and other chains) via CoinGecko; stock reference via CNBC quote service. Tokens track the stock but are separate products with their own risks, and are not available to US persons on most platforms. Education only.</p>';
    var tp = function () { var T = F.get('tok'); var st = stateLbl(), sEl = tk.querySelector('[data-tz-st]'); sEl.textContent = st[0]; sEl.className = 'tz-st tz-' + st[1];
      tk.classList.toggle('tz-open', st[1] === 'op'); tk.querySelectorAll('[data-tz-sort]').forEach(function (b) { b.classList.toggle('on', b.dataset.tzSort === TSORT); });
      if (!T) return; var now = Date.now(), open = st[1] === 'op', cl = closeLbl(), newest = 0;
      var rows = TZ.filter(function (t) { return T[t]; }).map(function (t, i) { var x = T[t], q = F.get(t), ref = q && q.px != null ? q.px : null, d = ref ? (x.px / ref - 1) * 100 : null, stale = !x.t || now - x.t > 30 * 6e4; if (!stale) newest = Math.max(newest, x.t); var off = !stale && d != null && Math.abs(d) > 5; return { t: t, x: x, d: stale || off ? null : d, off: off, stale: stale, i: i }; });
      if (TSORT === 'prem') rows.sort(function (a, b) { return (b.d == null ? -1e9 : Math.abs(b.d)) - (a.d == null ? -1e9 : Math.abs(a.d)); }); else if (TSORT === 'move') rows.sort(function (a, b) { return (b.stale ? -1e9 : Math.abs(b.x.chp || 0)) - (a.stale ? -1e9 : Math.abs(a.x.chp || 0)); });
      tk.querySelector('[data-tz-g]').innerHTML = rows.length ? rows.map(function (r) { var x = r.x, age = x.t ? Math.round((now - x.t) / 6e4) : null;
        var tip = r.t + 'x tracks ' + r.t + ' (' + TN[r.t] + '). ' + (x.vol != null ? '24h token volume ≈ $' + n(x.vol, 0) + '. ' : '') + (r.stale ? 'Stale: no update for ' + age + ' min, so no price is shown. ' : r.off ? 'Token is more than 5% away from the stock\u2019s last close, so it may track differently (e.g. accrued dividends or a thin market); no implied-open hint shown. ' : '') + TIP;
        return '<div class="tz-t' + (r.stale ? ' tz-stale' : '') + '" title="' + esc(tip) + '"><span class="tz-l"><b>' + r.t + 'x</b> <small>' + r.t + '</small>' + (r.stale ? ' <em class="tz-tag">stale</em>' : r.off ? ' <em class="tz-tag">off-track</em>' : '') + '</span>' +
          '<b class="tz-p">' + (r.stale ? '—' : px(x.px)) + '</b><span class="tz-c ' + (r.stale ? '' : cls(x.chp)) + '">' + (r.stale ? 'no recent trades' : pc(x.chp) + ' 24h') + '</span>' +
          '<span class="tz-v">' + (r.d == null ? (r.stale ? '' : '<span class="muted">vs ' + cl + ' ' + (r.off ? 'n/a' : '—') + '</span>') : '<b class="' + cls(r.d) + '">' + pc(r.d, 2) + '</b> ' + (open ? 'vs stock (live)' : 'vs ' + cl + ' <em class="tz-io">implied open</em>')) + '</span></div>'; }).join('') : '<p class="wl-mu">None of your picks have a token on the feed. ✎ Customize to add some.</p>';
      tk.querySelector('[data-tz-up]').textContent = newest ? 'updated ' + new Date(newest).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET' : ''; edPaint(); };
    var edPaint = function () { var e = tk.querySelector('[data-tz-edp]'); if (e.hidden) return; var T = F.get('tok') || {};
      e.innerHTML = '<ol class="cz-l">' + TZ.map(function (t, i) { return '<li><span><b>' + t + 'x</b> <small class="muted">' + esc(TN[t]) + (T[t] ? '' : ' · not on feed now') + '</small></span><button type="button" data-tz-up2="' + i + '" aria-label="Move up">↑</button><button type="button" data-tz-dn="' + i + '" aria-label="Move down">↓</button><button type="button" data-tz-rm="' + i + '" aria-label="Remove">×</button></li>'; }).join('') + '</ol>' +
        '<div class="tz-add">' + Object.keys(TN).filter(function (t) { return TZ.indexOf(t) < 0; }).map(function (t) { return '<button type="button" class="chip" data-tz-add="' + t + '">＋ ' + t + 'x</button>'; }).join('') + '</div><button type="button" class="chip" data-tz-reset>Reset to default</button>'; };
    tk.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; var d = b.dataset;
      if (d.tzSort) TSORT = d.tzSort; else if (b.hasAttribute('data-tz-ed')) { var e = tk.querySelector('[data-tz-edp]'); e.hidden = !e.hidden; b.setAttribute('aria-expanded', !e.hidden); }
      else if (d.tzUp2 != null) { var i = +d.tzUp2; if (i > 0) { TZ.splice(i - 1, 0, TZ.splice(i, 1)[0]); tzSave(); } }
      else if (d.tzDn != null) { var k = +d.tzDn; if (k < TZ.length - 1) { TZ.splice(k + 1, 0, TZ.splice(k, 1)[0]); tzSave(); } }
      else if (d.tzRm != null) { TZ.splice(+d.tzRm, 1); tzSave(); } else if (d.tzAdd) { TZ.push(d.tzAdd); tzSave(); } else if (b.hasAttribute('data-tz-reset')) { TZ = TZD.slice(); tzSave(); } else return; tp(); });
    tp(); F.on('tok', tp); F.on('quotes', tp); F.on('session', tp); setInterval(tp, 6e4); }

  /* ---------- Live Wall ---------- */
  var wall = document.querySelector('[data-wall]');
  if (wall && C) { var WD = ['MSTR', 'ASST', 'XXI', 'MPJPY'], WR = LS.get('btd_wallr') || '1W', picks; if (WR === '1H' || WR === '1D') WR = '1W'; /* never open the Wall on the hero's timeframe or 1H */
    try { picks = JSON.parse(LS.get('btd_wall') || 'null'); } catch (e) {} if (!Array.isArray(picks) || picks.length !== 4) picks = WD.slice();
    var opts = function (cur) { return LB.map(function (c) { return '<option value="' + esc(c.ticker) + '"' + (c.ticker === cur ? ' selected' : '') + '>' + esc(c.ticker) + ' · ' + esc(c.name.slice(0, 22)) + '</option>'; }).join(''); };
    var cells = function () { return ['BTC'].concat(picks); };
    var build = function () { wall.innerHTML = '<div class="p-h"><span class="p-t">Live Wall</span><span class="tag">BTC + 4 picks · 1W vs main chart 1D</span><div class="seg" role="tablist" aria-label="Wall range">' + ['1H', '1D', '1W', '1M'].map(function (r) { return '<button type="button" data-wa-r="' + r + '" class="' + (r === WR ? 'on' : '') + '">' + r + '</button>'; }).join('') + '</div><button type="button" class="chip" data-wa-reset>Reset</button></div>' +
        '<div class="wa">' + cells().map(function (t, i) { return '<div class="wa-c" data-wa="' + i + '"><div class="wa-h">' + (i ? '<select data-wa-sel="' + (i - 1) + '" aria-label="Pick company ' + i + '">' + opts(t) + '</select>' : '<b>BTC</b>') + '<span class="wa-px" data-wa-px>…</span><span class="wa-ch" data-wa-ch></span></div><canvas data-wa-cv aria-label="' + esc(t) + ' chart"></canvas><small data-wa-n></small></div>'; }).join('') + '</div>'; load(); };
    var SER = [];
    var load = function () { var my = cells().join() + WR; cells().forEach(function (t, i) { var c = C.cnOf(t); if (c) F.watch([c]); C.series(t, WR).then(function (s) { if (cells().join() + WR !== my) return; SER[i] = s; paint(i); }).catch(function () {}); }); };
    var paint = function (i) { var t = cells()[i], el = wall.querySelector('[data-wa="' + i + '"]'), s = SER[i]; if (!el || !s) return; var cv = el.querySelector('canvas'), q = t === 'BTC' ? F.get('BTC') : C.liveQ(t), p = t === 'BTC' ? q && q.px : C.curPx(q) || (s.length ? s[s.length - 1].c : null);
      if (t === 'BTC' && q && s.length) { s[s.length - 1].c = q.px; }
      var up = s.length ? p >= s[0].c : true; C.draw(cv, [{ s: s, col: up ? '#2fd17c' : '#ff5a5f', w: 1.6 }], { axis: false, area: true, base: s.length ? s[0].c : null });
      el.querySelector('[data-wa-px]').textContent = C.fp(p, q && q.cur); var ch = s.length && p ? (p / s[0].c - 1) * 100 : null, ce = el.querySelector('[data-wa-ch]'); ce.textContent = C.sg(ch) + ' ' + (s.daily ? '5D' : WR); ce.className = 'wa-ch ' + cls(ch);
      el.querySelector('[data-wa-n]').textContent = t === 'BTC' ? 'Coinbase live' : (q ? (F.session() === 'open' ? 'Live' : q.ext ? (q.ext.kind === 'pre' ? 'Pre-market' : 'After hours') : 'Last close') : 'Last close') + (s.daily ? ' · 5-day closes' : s.flat ? ' · intraday builds while open' : ''); };
    wall.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.waR) { WR = b.dataset.waR; LS.set('btd_wallr', WR); build(); } else if (b.hasAttribute('data-wa-reset')) { picks = WD.slice(); WR = '1W'; LS.del('btd_wall'); LS.del('btd_wallr'); build(); } });
    wall.addEventListener('change', function (e) { var s = e.target.closest('[data-wa-sel]'); if (!s) return; picks[+s.dataset.waSel] = s.value; LS.set('btd_wall', JSON.stringify(picks)); load(); });
    var waT = 0; F.on('BTC', function () { if (Date.now() - waT > 1500 && SER[0]) { waT = Date.now(); paint(0); } }); F.on('quotes', function () { for (var i = 1; i < 5; i++) paint(i); });
    addEventListener('resize', function () { for (var i = 0; i < 5; i++) paint(i); });
    lP.then(build); }
})();
/* Latest episode: click-to-play embed (loads YouTube only when asked; privacy-enhanced domain) */
(function () {
  var a = document.querySelector('.p-ep [data-ep-link]'); if (!a) return;
  a.addEventListener('click', function (e) { var m = /(?:youtu\.be\/|v=)([\w-]{11})/.exec(a.href); if (!m) return; e.preventDefault();
    var f = document.createElement('iframe'); f.src = 'https://www.youtube-nocookie.com/embed/' + m[1] + '?autoplay=1&rel=0'; f.title = document.querySelector('[data-ep-title]').textContent || 'Latest episode';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; f.allowFullscreen = true; f.className = 'ep-frame'; a.replaceWith(f); });
})();

/* My Watchlist = the row under the hero chart. Default: US indexes (futures outside regular hours) + MSTR + Mag 7. Visitors can add any stock/ETF, index, future, yield, or a coin typed as TICKER-USD; remove, reorder, reset. Saved in btd_my2, separate from the price strip. Indexes/futures always stay on the Markets board below. */
(function () {
  var el = document.querySelector('[data-hs]'), sec = el && el.closest('.p-hs'), F = window.BTD_FEED; if (!el || !F) return;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var f2 = function (v) { if (v == null || !isFinite(v)) return '…'; var a = Math.abs(v), d = a >= 1000 ? 2 : a >= 1 ? 2 : a >= 0.01 ? 4 : 6; return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var pc = function (v) { return v == null || !isFinite(v) ? '' : (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(2) + '%'; };
  var cl = function (v) { return v > 0 ? 'up' : v < 0 ? 'dn' : 'fl'; };
  /* friendly names -> quote-service symbols, with the label shown on the tile */
  var AL = { SPX: ['.SPX', 'SPX', 'S&P 500'], '^GSPC': ['.SPX', 'SPX', 'S&P 500'], IXIC: ['.IXIC', 'IXIC', 'Nasdaq'], NASDAQ: ['.IXIC', 'IXIC', 'Nasdaq'], DJI: ['.DJI', 'DJI', 'Dow'], DOW: ['.DJI', 'DJI', 'Dow'], RUT: ['.RUT', 'RUT', 'Russell 2000'], VIX: ['.VIX', 'VIX', 'Volatility'], DXY: ['.DXY', 'DXY', 'Dollar index'],
    'ES=F': ['@SP.1', 'ES=F', 'S&P 500 fut'], 'NQ=F': ['@ND.1', 'NQ=F', 'Nasdaq fut'], 'YM=F': ['@DJ.1', 'YM=F', 'Dow fut'], 'GC=F': ['@GC.1', 'GC=F', 'Gold fut'], GOLD: ['@GC.1', 'GC=F', 'Gold fut'], 'SI=F': ['@SI.1', 'SI=F', 'Silver fut'], SILVER: ['@SI.1', 'SI=F', 'Silver fut'], 'CL=F': ['@CL.1', 'CL=F', 'WTI fut'], OIL: ['@CL.1', 'CL=F', 'WTI fut'], 'HG=F': ['@HG.1', 'HG=F', 'Copper fut'], 'NG=F': ['@NG.1', 'NG=F', 'Nat gas fut'],
    US10Y: ['US10Y', 'US10Y', '10Y yield'], US2Y: ['US2Y', 'US2Y', '2Y yield'], US30Y: ['US30Y', 'US30Y', '30Y yield'], US5Y: ['US5Y', 'US5Y', '5Y yield'] };
  var IX = { 'IX:SPX': ['.SPX', '@SP.1', 'SPX', 'S&P 500', 'ES=F'], 'IX:IXIC': ['.IXIC', '@ND.1', 'IXIC', 'Nasdaq', 'NQ=F'], 'IX:DJI': ['.DJI', '@DJ.1', 'DJI', 'Dow', 'YM=F'] };
  var DEF = [{ k: 'IX:SPX', tk: 'S&P 500' }, { k: 'IX:IXIC', tk: 'Nasdaq' }, { k: 'IX:DJI', tk: 'Dow' }].concat(['MSTR', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'].map(function (t) { return { k: t, tk: t }; })), MAX = 16, L, CB = {}, msg = '';
  var get = function () { var o = null; try { o = JSON.parse(LS.get('btd_my2') || 'null'); } catch (e) {} return Array.isArray(o) ? o.filter(function (x) { return x && typeof x.k === 'string' && typeof x.tk === 'string'; }).slice(0, MAX) : DEF.slice(); };
  var save = function () { if (JSON.stringify(L) === JSON.stringify(DEF)) LS.del('btd_my2'); else LS.set('btd_my2', JSON.stringify(L)); };
  L = get();
  var native = { BTC: 1, ETH: 1, SOL: 1 };
  var cbPoll = function () { L.forEach(function (x) { var m = /^C:(.+)$/.exec(x.k); if (!m || native[m[1]]) return; cbFetch(m[1]).then(function (o) { if (o) { CB[m[1]] = o; paint(); } }); }); };
  var cbFetch = function (c) { return fetch('https://api.exchange.coinbase.com/products/' + encodeURIComponent(c) + '-USD/stats').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (!j || !j.last) return null; var l = +j.last, o = +j.open; return { px: l, chp: o ? (l / o - 1) * 100 : null }; }).catch(function () { return null; }); };
  var watch = function () { var w = []; L.forEach(function (x) { if (IX[x.k]) w.push(IX[x.k][0], IX[x.k][1]); else if (!/^C:/.test(x.k)) w.push(x.k); }); F.watch(w); };
  var quote = function (x) { var m = /^C:(.+)$/.exec(x.k), s = F.session();
    if (IX[x.k]) { var I = IX[x.k], cq = F.get(I[0]), fq = F.get(I[1]); if (s !== 'open' && fq && fq.px != null) return { px: fq.px, chp: fq.chp, tk: I[4], nm: I[3] + ' fut', src: I[3] + ' futures (front month), CNBC quote service' }; return cq && cq.px != null ? { px: cq.px, chp: cq.chp, tk: I[2], nm: I[3], src: I[3] + ' cash index, CNBC quote service' } : { px: null, tk: I[2], nm: I[3], src: 'CNBC quote service' }; }
    if (m) { var q = native[m[1]] ? F.get(m[1]) : CB[m[1]]; return q && q.px != null ? { px: q.px, chp: q.chp, tag: '24/7', src: 'Coinbase spot' } : null; }
    var q2 = F.get(x.k); if (!q2 || q2.px == null) return null; var fut = /^@/.test(x.k);
    if (q2.ext && s !== 'open' && q2.ext.px != null) return { px: q2.ext.px, chp: q2.ext.chp, tag: q2.ext.kind === 'pre' ? 'Pre' : 'AH', src: 'CNBC quote service, extended hours (may be delayed)' };
    return { px: q2.px, chp: q2.chp, tag: fut && !/fut/.test(x.nm || '') ? 'fut' : (s !== 'open' && !/^US\d/.test(x.k) ? 'close' : ''), src: 'CNBC quote service (may be delayed)', yd: /^US\d/.test(x.k) }; };
  el.insertAdjacentHTML('afterend', '<div class="my-edp" data-my-edp hidden></div>');
  var edp = sec.querySelector('[data-my-edp]');
  function tile(x) { var q = quote(x), tk = q && q.tk || x.tk, nm = q && q.nm || x.nm || '', ok = q && q.px != null, X = window.BTD_CTX, I = IX[x.k], cm = /^C:(.+)$/.exec(x.k), ck = I ? (q && q.tk === I[4] ? I[1] : I[0]) : cm ? cm[1] : x.k;
    return '<div class="hs-t" title="' + esc(tk + (nm ? ' \u00b7 ' + nm : '') + ' \u00b7 source: ' + (q ? q.src : 'loading')) + '"><span class="hs-l"><b class="hs-tk">' + esc(tk) + '</b>' + (nm ? ' ' + esc(nm) : '') + (q && q.tag && q.tag !== 'close' ? ' <em title="' + ({ Pre: 'Pre = pre-market trading, 4:00\u20139:30 AM ET', AH: 'AH = after-hours trading, 4:00\u20138:00 PM ET', '24/7': 'Trades 24/7', fut: 'Futures (front-month contract)' }[q.tag] || '') + '">' + q.tag + '</em>' : '') + '</span><b>' + (ok ? (q.yd ? q.px.toFixed(3) + '%' : f2(q.px)) : '\u2026') + '</b><span class="hs-c ' + (ok ? cl(q.chp) : '') + '">' + (ok ? pc(q.chp) : '') + (ok && X ? ' <small class="hs-tf">' + X.tf(ck, null, F.session(), q.tag === 'Pre' ? 'pre' : q.tag === 'AH' ? 'post' : '') + '</small>' : '') + '</span>' + (ok && X ? '<span class="hs-k">' + X.spark(ck, q.px) + '</span>' : '') + '</div>'; }
  function paint() { el.innerHTML = L.map(tile).join('') + '<button type="button" class="hs-t hs-ed" data-my-ed aria-expanded="' + !edp.hidden + '" aria-label="Edit My Watchlist" title="My Watchlist: add any ticker, remove, reorder, reset">\u270e<small>Edit</small></button>'; edPaint(); }
  function edPaint() { var e = edp; if (e.hidden) return;
    e.innerHTML = '<div class="my-eh"><b>My Watchlist</b> <span class="muted">saved on this device \u00b7 indexes and futures stay on the Markets board below</span></div>' + (L.length < MAX ? '<form class="my-add" data-my-form><input data-my-in maxlength="16" placeholder="Type a ticker" aria-label="Add a ticker (stocks, ETFs, indexes, futures; coins as TICKER-USD)" autocomplete="off" autocapitalize="characters" spellcheck="false"><button type="submit" class="chip">\uff0b Add</button></form>' : '') + '<small class="my-msg" data-my-msg>' + esc(msg) + '</small><ol class="cz-l">' + L.map(function (x, i) { return '<li><span><b>' + esc((quote(x) || {}).tk || x.tk) + '</b> <small class="muted">' + esc(x.nm || (IX[x.k] ? 'index, futures off-hours' : '')) + '</small></span><button type="button" data-my-up="' + i + '" aria-label="Move up">\u2191</button><button type="button" data-my-dn="' + i + '" aria-label="Move down">\u2193</button><button type="button" data-my-rm="' + i + '" aria-label="Remove">\u00d7</button></li>'; }).join('') + '</ol>' +
      '<div class="my-q"><span class="muted">Quick add:</span> ' + ['MSTR', 'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'COIN', 'ASST', 'MPJPY', 'MARA', 'IBIT', 'GOLD', 'US10Y', 'DXY', 'VIX'].filter(function (t) { return !L.some(function (x) { return x.tk === t || x.tk === (AL[t] || [])[1]; }); }).map(function (t) { return '<button type="button" class="chip" data-my-add="' + t + '">\uff0b ' + t + '</button>'; }).join('') + '</div>' +
      '<p class="muted my-hint">Type any stock or ETF ticker, an index (SPX, VIX, DXY), a future (ES=F, GC=F, CL=F), a yield (US10Y), or a coin as TICKER-USD. Up to ' + MAX + '.</p><button type="button" class="chip" data-my-reset>Reset to default</button>'; }
  function add(raw) { var t = String(raw || '').trim().toUpperCase().replace(/\s+/g, ''); if (!t) return; if (L.length >= MAX) { msg = 'Watchlist is full (' + MAX + '). Remove one first.'; return paint(); }
    var cm = /^([A-Z0-9]{2,10})-USD$/.exec(t);
    if (cm) { if (L.some(function (x) { return x.k === 'C:' + cm[1]; })) { msg = t + ' is already on your list.'; return paint(); } msg = 'Checking ' + t + ' on Coinbase\u2026'; paint();
      if (native[cm[1]]) { L.push({ k: 'C:' + cm[1], tk: t }); save(); msg = ''; return paint(); }
      return cbFetch(cm[1]).then(function (o) { if (!o) { msg = '\u201c' + t + '\u201d isn\u2019t a Coinbase USD pair. Check the spelling.'; return paint(); } CB[cm[1]] = o; L.push({ k: 'C:' + cm[1], tk: t }); save(); msg = ''; paint(); }); }
    var a = AL[t], k = a ? a[0] : (F.cn ? F.cn(t) : t) || t, tk = a ? a[1] : t, nm = a ? a[2] : '';
    if (!/^[.@A-Z0-9][A-Z0-9.\-=:]{0,15}$/.test(k)) { msg = 'That doesn\u2019t look like a ticker.'; return paint(); }
    if (L.some(function (x) { return x.k === k || (IX[x.k] && (IX[x.k][0] === k || IX[x.k][1] === k)); })) { msg = tk + ' is already on your list.'; return paint(); }
    msg = 'Checking ' + tk + '\u2026'; paint(); F.watch([k]); var t0 = Date.now();
    (function wait() { var q = F.get(k); if (q && q.px != null) { L.push({ k: k, tk: tk, nm: nm }); save(); msg = ''; return paint(); } if (Date.now() - t0 > 7000) { msg = '\u201c' + tk + '\u201d wasn\u2019t found on the quote feed. Coins: type TICKER-USD.'; return paint(); } setTimeout(wait, 500); })(); }
  sec.addEventListener('submit', function (e) { if (!e.target.matches('[data-my-form]')) return; e.preventDefault(); add(sec.querySelector('[data-my-in]').value); });
  sec.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b || b.type === 'submit') return; var d = b.dataset;
    if (b.hasAttribute('data-my-ed')) { edp.hidden = !edp.hidden; b.setAttribute('aria-expanded', !edp.hidden); edPaint(); if (!edp.hidden) { var inp = sec.querySelector('[data-my-in]'); if (inp && innerWidth > 760) inp.focus(); } return; }
    if (d.myAdd) return add(d.myAdd);
    if (d.myUp != null) { var i = +d.myUp; if (i > 0) L.splice(i - 1, 0, L.splice(i, 1)[0]); } else if (d.myDn != null) { var j = +d.myDn; if (j < L.length - 1) L.splice(j + 1, 0, L.splice(j, 1)[0]); }
    else if (d.myRm != null) L.splice(+d.myRm, 1); else if (b.hasAttribute('data-my-reset')) L = DEF.slice(); else return; save(); msg = ''; watch(); paint(); });
  watch(); paint(); cbPoll(); setInterval(cbPoll, 30000);
  if (window.BTD_CTX) window.BTD_CTX.on(function () { if (edp.hidden) paint(); });
  var pt = 0; var soft = function () { if (Date.now() - pt > 2000 && !edp.contains(document.activeElement)) { pt = Date.now(); el.innerHTML = L.map(tile).join('') + el.querySelector('[data-my-ed]').outerHTML; } };
  F.on('quotes', soft); F.on('BTC', soft); F.on('ETH', soft); F.on('SOL', soft); F.on('session', paint);
})();
