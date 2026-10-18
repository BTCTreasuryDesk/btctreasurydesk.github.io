/* BTC Treasury Desk: home live panels, all from BTD_FEED (free feeds, no AI).
   [data-mk]  Markets board (customizable: add/remove/reorder, saved, reset): Bitcoin desk (BTC, MSTR, live mNAV, Treasury 10, Street Sentiment, ETH, SOL) + US indexes/futures, rates, dollar, VIX,
              commodities, Japan/Europe, Mag 7. Session-aware: pre-market / after-hours prices and futures outside regular hours; tokenized stocks promoted
              into the board after hours and on weekends. Never blank: last close cached in this browser.
   [data-wl]  Treasury companies window: standard list or your own (add/remove/reorder, saved, reset) + Movers view + Preferreds dropdown (majors).
   [data-cx]  Crypto market (compact, Bitcoin-first): total cap, alt index (ex-BTC), dominance, stablecoins, alt-season breadth, Fear & Greed.
   [data-tok] Tokenized stocks (xStocks, 24/7) vs the last stock price.   [data-wall] Live Wall: BTC + up to 4 picks, small live charts.
   Education only, not investment advice. */
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
  function sessTag(q) { var s = F.session(); if (!q || q.cached && !q.t) return 'last close'; if (s === 'open') return ''; if (q.ext) return q.ext.kind === 'pre' ? 'pre-mkt' : 'after hrs'; return 'close'; }

  /* ---------- Markets board ---------- */
  var mk = document.querySelector('[data-mk]');
  var FUT = { '.SPX': '@SP.1', '.IXIC': '@ND.1', '.DJI': '@DJ.1' };
  var GN = { desk: 'Bitcoin desk', us: 'US stocks', rt: 'Rates · dollar · vol', cm: 'Commodities', gl: 'Global', mag: 'Mag 7 · top stocks', mine: 'My picks' };
  var MKT = { BTC: ['BTC-USD'], ETH: ['ETH-USD'], SOL: ['SOL-USD'], '.SPX': ['SPX', 'S&P 500'], '.IXIC': ['IXIC', 'Nasdaq'], '.DJI': ['DJI', 'Dow'], '.RUT': ['RUT', 'Russell 2000'], '@GC.1': ['GC=F', 'Gold fut'], '@SI.1': ['SI=F', 'Silver fut'], '@CL.1': ['CL=F', 'WTI fut'], '@HG.1': ['HG=F', 'Copper fut'], '@NG.1': ['NG=F', 'Nat gas fut'], '.DXY': ['DXY'], '.VIX': ['VIX'], US2Y: ['US2Y'], US5Y: ['US5Y'], US10Y: ['US10Y'], US30Y: ['US30Y'], 'EUR=': ['EURUSD'], 'JPY=': ['USDJPY'], '.N225': ['N225', 'Nikkei'], '.STOXX': ['SXXP', 'Stoxx 600'], '.FTSE': ['UKX', 'FTSE 100'], '.GDAXI': ['DAX'], '.HSI': ['HSI', 'Hang Seng'], '.KS11': ['KOSPI'], '.SSEC': ['SSEC', 'Shanghai'], MNAV: ['MSTR mNAV'], T10: ['T10', 'Desk Treasury 10'], STREET: ['MSTR', 'Street Sentiment'], MTPLF: ['MTPLF', 'Metaplanet'], '3350.T': ['3350.T', 'Metaplanet'], MPJPY: ['MPJPY'] };
  var FUTL = { '@SP.1': 'ES=F', '@ND.1': 'NQ=F', '@DJ.1': 'YM=F', '@RTY.1': 'RTY=F' };
  var TIPS = { BTC: 'BTC-USD, Coinbase live feed (every trade)', MNAV: 'Strategy method: enterprise value ÷ bitcoin NAV, recomputed live from MSTR and BTC', T10: 'Desk Treasury 10: the top 10 public bitcoin treasury stocks, average day move weighted by BTC held. Desk calculation.', STREET: 'MSTR analysts: 60% ratings mix + 40% average-target upside vs the live price (0–100). Analysts\u2019 views, not ours.' };
  var MKDEF = [['BTC', 'Bitcoin', 'desk'], ['MSTR', 'Strategy MSTR', 'desk'], ['ETH', 'Ether', 'desk'], ['SOL', 'Solana', 'desk'],
    ['.SPX', 'S&P 500', 'us'], ['.IXIC', 'Nasdaq', 'us'], ['.DJI', 'Dow', 'us'], ['.RUT', 'Russell 2000', 'us'],
    ['US2Y', 'US 2Y', 'rt'], ['US10Y', 'US 10Y', 'rt'], ['.DXY', 'Dollar DXY', 'rt'], ['.VIX', 'VIX', 'rt'], ['@GC.1', 'Gold', 'cm'], ['@SI.1', 'Silver', 'cm'], ['@CL.1', 'WTI oil', 'cm'],
    ['.N225', 'Nikkei 225', 'gl'], ['.STOXX', 'Stoxx 600', 'gl'], ['AAPL', 'AAPL', 'mag'], ['MSFT', 'MSFT', 'mag'], ['NVDA', 'NVDA', 'mag'], ['GOOGL', 'GOOGL', 'mag'], ['AMZN', 'AMZN', 'mag'], ['META', 'META', 'mag'], ['TSLA', 'TSLA', 'mag']];
  var MKCAT = MKDEF.concat([['MNAV', 'MSTR mNAV · live', 'desk'], ['T10', 'Treasury 10 · day', 'desk'], ['STREET', 'Street Sentiment', 'desk'], ['US5Y', 'US 5Y', 'rt'], ['US30Y', 'US 30Y', 'rt'], ['EUR=', 'EUR/USD', 'rt'], ['JPY=', 'USD/JPY', 'rt'], ['@HG.1', 'Copper', 'cm'], ['@NG.1', 'Natural gas', 'cm'], ['.FTSE', 'FTSE 100', 'gl'], ['.GDAXI', 'DAX', 'gl'], ['.HSI', 'Hang Seng', 'gl'], ['.KS11', 'KOSPI', 'gl'], ['.SSEC', 'Shanghai', 'gl'],
    ['COIN', 'COIN', 'mag'], ['HOOD', 'HOOD', 'mag'], ['AVGO', 'AVGO', 'mag'], ['CRCL', 'CRCL', 'mag'], ['IBIT', 'IBIT (BTC ETF)', 'mag'], ['GLD', 'GLD', 'mag'], ['BTC.CM=', 'CME BTC futures', 'desk']]);
  var MK_RX = /^[A-Z0-9.@=\-]{1,12}$/;
  function mkGet() { var o = null; try { o = JSON.parse(LS.get('btd_mk') || 'null'); } catch (e) {} if (!Array.isArray(o) || !o.length) return MKDEF.slice();
    var out = o.filter(function (x) { return Array.isArray(x) && MK_RX.test(x[0]) && GN[x[2]]; }).map(function (x) { return [x[0], String(x[1]).slice(0, 22), x[2]]; }).slice(0, 48); if (!out.some(function (x) { return x[0] === 'BTC'; })) out.unshift(MKDEF[0]); return out; }
  function mkSave(L) { if (JSON.stringify(L) === JSON.stringify(MKDEF)) LS.del('btd_mk'); else LS.set('btd_mk', JSON.stringify(L)); }
  function tile(k, label, cls2, tip) { var L = /^X:/.test(k) ? [k.slice(2) + 'x', 'token'] : MKT[k] || [k.replace(/^[.@]/, ''), '']; if (!tip) tip = /^X:/.test(k) ? '' : L[0] + ' · source: CNBC quote service (may be delayed)';
    return '<div class="mk-t ' + (cls2 || '') + '" data-mt="' + esc(k) + '"' + (tip ? ' title="' + esc(tip) + '"' : '') + '><span class="mk-l"><b class="mk-tk">' + esc(L[0]) + '</b>' + (L[1] ? ' <span class="mk-nm">' + esc(L[1]) + '</span>' : '') + '</span><b class="mk-v">…</b><span class="mk-c"></span><span class="mk-x"></span></div>'; }
  function grp(id, name, inner, extra) { return '<div class="mk-g mk-' + id + '"' + (extra || '') + '><div class="mk-gh">' + esc(name) + '</div><div class="mk-gt">' + inner + '</div></div>'; }
  var MKL = mkGet();
  function mkBuild() { if (!mk) return; var after = F.session() !== 'open'; MKL = mkGet(); var by = {}, order = [];
    MKL.forEach(function (x) { if (!by[x[2]]) { by[x[2]] = []; order.push(x[2]); } by[x[2]].push(x); });
    var html = order.map(function (g) { var name = g === 'us' && after ? 'US stocks · futures ' + (F.session() === 'pre' ? 'pre-market' : 'overnight') : GN[g];
      var h = grp(g, name, by[g].map(function (x) { return tile(x[0], x[1], x[0] === 'BTC' ? 'mk-big' : x[0] === 'MSTR' && g === 'desk' ? 'mk-big2' : g === 'mag' ? 'mk-sm' : '', TIPS[x[0]]); }).join(''));
      if (g === 'desk' && after) h += grp('tok', '24/7 tokenized · ' + (F.session() === 'closed' ? 'markets closed' : 'extended hours'), ['MSTR', 'COIN', 'SPY', 'QQQ', 'NVDA'].map(function (t) { return tile('X:' + t, t + 'x', '', 'Tokenized ' + t + ' (xStocks, onchain, trades 24/7). Tracks the stock but can drift from it. Education only.'); }).join(''), ' data-mk-tok hidden');
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
    var c = el.querySelector('.mk-c'); c.textContent = chg ? chg[0] : ''; c.className = 'mk-c ' + (chg ? chg[1] : ''); el.querySelector('.mk-x').innerHTML = x || ''; if (title) el.title = title; }
  function qTile(sym, opt) { opt = opt || {}; var q = F.get(sym); if (!q || q.px == null) return; var s = F.session(), main = q.px, ch = q.chp, x = '';
    if (q.yld) { setT(sym, q.px.toFixed(3) + '%', [(q.ch >= 0 ? '+' : '−') + Math.abs(q.ch * 100).toFixed(1) + ' bp', cls(q.ch)], s === 'open' ? '<small>yield · live</small>' : '<small>yield · last close</small>'); return; }
    if (q.ext && s !== 'open') x = '<em>' + (q.ext.kind === 'pre' ? 'Pre' : 'AH') + '</em> ' + lv(q.ext.px) + ' <span class="' + cls(q.ext.chp) + '">' + pc(q.ext.chp) + '</span>';
    var fs = opt.fut || FUT[sym]; if (fs) { var f = F.get(fs); if (f && f.px != null && s !== 'open') x = '<em>' + (FUTL[fs] || 'Fut') + '</em> ' + lv(f.px) + ' <span class="' + cls(f.chp) + '">' + pc(f.chp) + '</span>'; }
    if (s !== 'open' && !x && q.chp != null) x = '<small>' + (q.cached ? 'cached ' : '') + 'last close</small>';
    setT(sym, opt.usd ? px(main, q.cur) : lv(main), [pc(ch), cls(ch)], x); }
  function mkCrypto(k) { var q = F.get(k); if (!q) return; setT(k, px(q.px), [pc(q.chp), cls(q.chp)], k === 'BTC' ? '<small>24h · H ' + n(q.hi, 0) + ' L ' + n(q.lo, 0) + '</small>' : '<small>24h</small>'); }
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
  function mkAll() { if (!mk) return; mkDesk(); MKL.forEach(function (x) { if (['BTC', 'ETH', 'SOL', 'MNAV', 'T10', 'STREET', 'MSTR'].indexOf(x[0]) < 0) qTile(x[0]); }); mkTok();
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
    var last = q && q.px != null ? (crypto ? px(q.px) : px(q.px, q.cur)) : '…', ch = q ? q.chp : null, ext = !crypto && q && q.ext && s !== 'open' ? '<em>' + (q.ext.kind === 'pre' ? 'Pre' : 'AH') + '</em> <span class="' + cls(q.ext.chp) + '">' + pc(q.ext.chp) + '</span>' : '';
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
  var cx = document.querySelector('[data-cx]');
  if (cx) {
    cx.innerHTML = '<div class="p-h"><span class="p-t">Crypto market</span><span class="tag">BTC-first · live</span></div><div class="cx">' +
      '<div class="cx-k"><span>BTC dominance</span><b data-cx="dom">…</b><small data-cx="dom-s"></small></div>' +
      '<div class="cx-k"><span>Total crypto cap</span><b data-cx="tot">…</b><small data-cx="tot-s"></small></div>' +
      '<div class="cx-k" title="Total crypto market value excluding bitcoin (TOTAL2-style). Desk altcoin index."><span>Alt index (ex-BTC)</span><b data-cx="alt">…</b><small data-cx="alt-s"></small></div>' +
      '<div class="cx-k" title="All USD-pegged stablecoins across chains (DefiLlama). More stablecoin supply means more dollars held on-chain that can move into crypto quickly; it is context, not a forecast."><span>Stablecoins</span><b data-cx="stb">…</b><small data-cx="stb-s"></small></div>' +
      '<div class="cx-k"><span>BTC from ATH</span><b data-cx="ath">…</b><small data-cx="ath-s"></small></div>' +
      '<div class="cx-k"><span>Fear &amp; Greed</span><b data-live="fng">…</b><small data-live="fng-cls"></small></div>' +
      '</div><div class="cx-m" title="Desk calc: share of the top 50 altcoins (ex-stablecoins and wrapped tokens) beating BTC over 30 days. 75+ = altcoin season, 25 or less = bitcoin season."><div class="cx-mh"><span>Season gauge (30d)</span><b data-cx="szn">…</b></div><div class="cx-bar"><i data-cx="szn-i"></i></div><div class="cx-sc"><span>Bitcoin season</span><span>Altcoin season</span></div></div>' +
      '<div data-sent-mini class="cx-sent"></div>' +
      '<p class="p-f">CoinGecko (cap, dominance, alts), DefiLlama (stablecoins), Coinbase (BTC), alternative.me (Fear &amp; Greed). Alt panels are context for a Bitcoin desk.</p>';
    var set = function (k, v, c) { var e = cx.querySelector('[data-cx="' + k + '"]'); if (e) { e.textContent = v; if (c != null) e.className = c; } };
    var ATH = null; J('/assets/data/btc_daily.json').then(function (j) { ATH = Math.max.apply(null, j.closes); athP(); }).catch(function () {});
    var athP = function () { var b = F.get('BTC'); if (!ATH || !b) return; var a = Math.max(ATH, b.px), d = (b.px / a - 1) * 100; set('ath', d > -0.05 ? 'At ATH' : pc(d, 1), cls(d)); set('ath-s', 'ATH close $' + n(a, 0)); };
    var gP = function () { var g = F.get('global'), b = F.get('BTC'); if (!g) return; set('dom', g.dom.toFixed(2) + '%'); set('dom-s', 'ETH ' + g.edom.toFixed(1) + '%'); set('tot', big(g.tot)); set('tot-s', pc(g.chp) + ' 24h', 'up' === cls(g.chp) ? 'up' : 'dn');
      var ach = null; if (b && b.chp != null) { var tp = g.tot / (1 + g.chp / 100), bc = g.tot * g.dom / 100, bp = bc / (1 + b.chp / 100), ap = tp - bp; ach = (g.alt / ap - 1) * 100; } set('alt', big(g.alt)); set('alt-s', ach == null ? '' : pc(ach) + ' 24h', cls(ach)); };
    F.on('global', gP); F.on('stable', function (s) { set('stb', big(s.tot)); set('stb-s', s.ch != null ? pc(s.ch, 2) + ' since ' + Math.round(s.ago / 36e5) + 'h ago' : 'USD-pegged, all chains'); });
    F.on('breadth', function (b) { set('szn', b.score + ' · ' + (b.score >= 75 ? 'Altcoin season' : b.score <= 25 ? 'Bitcoin season' : 'Neutral') + ' (' + b.beat + '/' + b.n + ' beat BTC)'); var i = cx.querySelector('[data-cx="szn-i"]'); if (i) i.style.left = b.score + '%'; });
    var cxT = 0; F.on('BTC', function () { if (Date.now() - cxT > 5000) { cxT = Date.now(); athP(); gP(); } });
  }

  /* ---------- Tokenized stocks ---------- */
  var tk = document.querySelector('[data-tok]');
  if (tk) { var TL = [['MSTR', 'Strategy'], ['COIN', 'Coinbase'], ['CRCL', 'Circle'], ['HOOD', 'Robinhood'], ['NVDA', 'Nvidia'], ['TSLA', 'Tesla'], ['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['GOOGL', 'Alphabet'], ['AMZN', 'Amazon'], ['META', 'Meta'], ['SPY', 'S&P 500'], ['QQQ', 'Nasdaq 100']];
    F.watch(TL.map(function (t) { return t[0]; }).filter(function (t) { return t !== 'SPY' && t !== 'QQQ'; }));
    tk.innerHTML = '<div class="p-h"><span class="p-t">Tokenized stocks</span><span class="tag">24/7 onchain</span></div><div class="wl-wrap tk-wrap"><table class="wl"><thead><tr><th>Token</th><th class="r">Price</th><th class="r">24h</th><th class="r" title="Token price vs the stock\u2019s latest price (regular or extended hours). Outside market hours this hints at where the stock may open; it can also just be drift.">vs stock</th></tr></thead><tbody data-tok-b><tr><td colspan="4" class="wl-mu">Loading tokenized prices from CoinGecko… (free feed, refreshes every 2 min; if it stays empty the feed is rate-limited, try again shortly)</td></tr></tbody></table></div><p class="p-f">xStocks tokens (Backed Finance, on Solana and other chains) via CoinGecko. Tokens track the stock but are separate products with their own risks. Not available to US persons on most platforms. Education only.</p>';
    var tp = function () { var T = F.get('tok'); if (!T) return; var s = F.session(); tk.querySelector('[data-tok-b]').innerHTML = TL.filter(function (t) { return T[t[0]]; }).map(function (t) { var x = T[t[0]], q = F.get(t[0]), ref = q && q.px ? (q.ext && s !== 'open' ? q.ext.px : q.px) : null, d = ref ? (x.px / ref - 1) * 100 : null;
        return '<tr><td><b>' + t[0] + 'x</b><small>' + t[1] + '</small></td><td class="r">' + px(x.px) + '</td><td class="r ' + cls(x.chp) + '">' + pc(x.chp) + '</td><td class="r ' + cls(d) + '">' + (d == null ? '—' : pc(d, 2)) + '</td></tr>'; }).join(''); };
    F.on('tok', tp); F.on('quotes', tp); }

  /* ---------- Live Wall ---------- */
  var wall = document.querySelector('[data-wall]');
  if (wall && C) { var WD = ['MSTR', 'ASST', 'XXI', 'MPJPY'], WR = LS.get('btd_wallr') || '1W', picks;
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

/* Hero strip under the live chart: US indexes (futures outside regular hours) + MSTR and the Mag 7. One row; swipe on phone. */
(function () {
  var el = document.querySelector('[data-hs]'), F = window.BTD_FEED; if (!el || !F) return;
  var IX = [['.SPX', '@SP.1', 'S&P 500', 'SPX', 'ES=F'], ['.IXIC', '@ND.1', 'Nasdaq', 'IXIC', 'NQ=F'], ['.DJI', '@DJ.1', 'Dow', 'DJI', 'YM=F']], ST = ['MSTR', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'];
  F.watch(IX.map(function (x) { return x[0]; }).concat(IX.map(function (x) { return x[1]; }), ST));
  var f2 = function (v, d) { return v == null ? '…' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var pc = function (v) { return v == null || isNaN(v) ? '' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(2) + '%'; };
  var cl = function (v) { return v > 0 ? 'up' : v < 0 ? 'dn' : 'fl'; };
  function tile(tk, nm, px, ch, tag, d, src) { return '<div class="hs-t" title="' + src + '"><span class="hs-l"><b class="hs-tk">' + tk + '</b>' + (nm ? ' ' + nm : '') + (tag ? ' <em>' + tag + '</em>' : '') + '</span><b>' + f2(px, d) + '</b><span class="hs-c ' + cl(ch) + '">' + pc(ch) + '</span></div>'; }
  function paint() { var ses = F.session(), out = [];
    IX.forEach(function (x) { var q = F.get(x[0]), fu = F.get(x[1]);
      if (ses !== 'open' && fu && fu.px != null) out.push(tile(x[4], x[2] + ' fut', fu.px, fu.chp, '', 2, x[2] + ' futures (front month), CNBC quote service')); else out.push(tile(x[3], x[2], q && q.px, q && q.chp, '', 2, x[2] + ' cash index, CNBC quote service')); });
    ST.forEach(function (t) { var q = F.get(t), ext = q && q.ext && ses !== 'open' ? q.ext : null;
      out.push(tile(t, '', ext ? ext.px : q && q.px, ext ? ext.chp : q && q.chp, ext ? (ext.kind === 'pre' ? 'Pre' : 'AH') : '', 2, t + (ext ? (ext.kind === 'pre' ? ' pre-market' : ' after-hours') : '') + ', CNBC quote service (may be delayed)')); });
    el.innerHTML = out.join(''); }
  paint(); F.on('quotes', paint); F.on('session', paint);
})();
