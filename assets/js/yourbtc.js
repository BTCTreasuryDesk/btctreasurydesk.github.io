/* Your Bitcoin: how much BTC / sats your shares of a bitcoin treasury company represent. Free tool.
   BTC per share: Strategy = strategy.com sats per share (assumed diluted shares); others = BitcoinTreasuries.NET basic shares (weekly refresh).
   Live $ value: Coinbase BTC (BTD_FEED). Pro: multi-company portfolio. Education only. */
(function () {
  'use strict';
  var box = document.querySelector('[data-yb]'); if (!box) return;
  var F = window.BTD_FEED, M = window.BTD_MEMBERS || {};
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v, d) { return v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(v) { return v == null || !isFinite(v) ? '—' : '$' + n(v, Math.abs(v) >= 100 ? 0 : 2); }
  function btcF(v) { return v >= 1 ? n(v, 4) : v >= 0.01 ? n(v, 6) : n(v, 8); }
  var CO = [], DESK = null, STRAT = null, COS = null, BH = null;
  Promise.all([J('/assets/data/leaderboard.json'), J('/assets/data/desk.json').catch(function () { return null; }), J('/assets/data/strategy.json').catch(function () { return null; }), J('/assets/data/companies.json').catch(function () { return null; }), J('/assets/data/bps_history.json').catch(function () { return null; })]).then(function (r) {
    DESK = r[1]; STRAT = r[2]; COS = r[3] && r[3].companies; BH = r[4];
    CO = (r[0].public_companies || []).filter(function (c) { return c.btc && (c.btc_per_share_basic || c.ticker === 'MSTR'); }).slice(0, 50).map(function (c) {
      var bps = c.btc_per_share_basic; if (c.ticker === 'MSTR' && DESK && DESK.strategy && DESK.strategy.sats_per_share) bps = DESK.strategy.btc_held / ((STRAT && STRAT.adso) || (DESK.strategy.btc_held / (DESK.strategy.sats_per_share / 1e8)));
      return { t: c.ticker, name: c.name, slug: c.slug, rank: c.rank, btc: c.btc, bps: bps, cur: c.currency, sp: c.stock_price, mc: c.market_cap_basic, sub: c.subtype }; });
    CO.sort(function (a, b) { return a.t === 'MSTR' ? -1 : b.t === 'MSTR' ? 1 : b.btc - a.btc; });
    asof = r[0].as_of; init(); }).catch(function () { box.innerHTML = '<p class="muted">Could not load company data. Please refresh.</p>'; });
  var asof = '', S = { t: 'MSTR', sh: 100 }; try { var so = JSON.parse(LS.get('btd_yb') || '{}'); if (so.t) S.t = String(so.t); if (so.sh > 0) S.sh = +so.sh; } catch (e) {}
  function co(t) { return CO.filter(function (c) { return c.t === t; })[0] || CO[0]; }
  function init() {
    box.innerHTML = '<div class="yb-in"><label class="yb-f"><span>Company</span><input list="yb-list" data-yb-co autocomplete="off" spellcheck="false" placeholder="Search name or ticker" aria-label="Company (search the top 50)"><datalist id="yb-list">' + CO.map(function (c) { return '<option value="' + esc(c.t + ' · ' + c.name) + '"></option>'; }).join('') + '</datalist></label>' +
      '<label class="yb-f yb-sh"><span>Shares you own</span><input type="number" inputmode="decimal" min="0" step="any" data-yb-sh aria-label="Number of shares"></label></div>' +
      '<div class="yb-quick" role="group" aria-label="Quick picks">' + ['MSTR', 'ASST', 'MPJPY', 'XXI', 'MARA', 'SWC.L', 'NAKA'].filter(function (t) { return CO.some(function (c) { return c.t === t; }); }).map(function (t) { return '<button type="button" class="chip" data-yb-q="' + esc(t) + '">' + esc(t === 'MPJPY' ? 'Metaplanet' : t === 'SWC.L' ? 'Smarter Web' : t) + '</button>'; }).join('') + '</div>' +
      '<div class="yb-out" aria-live="polite"><div class="yb-k yb-main"><span>Your bitcoin</span><b data-yb-btc>…</b><small data-yb-sats></small></div><div class="yb-k"><span>Worth now (live BTC)</span><b data-yb-usd>…</b><small data-yb-btcpx></small></div><div class="yb-k"><span>Your shares are worth</span><b data-yb-stk>…</b><small data-yb-prem></small></div></div>' +
      '<p class="yb-note" data-yb-note></p>' +
      '<div class="yb-ctx"><div class="yb-c"><h3>The company</h3><dl data-yb-co-kv></dl></div><div class="yb-c"><h3>Sats per share over time</h3><canvas data-yb-cv height="150" aria-label="Bitcoin per share over time"></canvas><p class="yb-s" data-yb-trend></p></div></div>';
    var ci = box.querySelector('[data-yb-co]'), si = box.querySelector('[data-yb-sh]'); ci.value = co(S.t).t + ' · ' + co(S.t).name; si.value = S.sh;
    ci.addEventListener('change', pick); ci.addEventListener('input', function () { if (CO.some(function (c) { return ci.value === c.t + ' · ' + c.name; })) pick(); });
    ci.addEventListener('focus', function () { ci.select(); });
    si.addEventListener('input', function () { S.sh = Math.max(0, +si.value || 0); save(); paint(); });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-yb-q]'); if (b) { S.t = b.dataset.ybQ; ci.value = co(S.t).t + ' · ' + co(S.t).name; save(); paint(); } });
    function pick() { var v = ci.value.trim().toUpperCase(), c = CO.filter(function (x) { return (x.t + ' · ' + x.name).toUpperCase() === v || x.t.toUpperCase() === v.split(' ')[0]; })[0]; if (c) { S.t = c.t; save(); paint(); } }
    if (F) { F.on('BTC', throttle(paint, 1500)); F.on('quotes', paint); }
    paint(); pro(); }
  function throttle(f, ms) { var t = 0; return function () { if (Date.now() - t > ms) { t = Date.now(); f(); } }; }
  function save() { LS.set('btd_yb', JSON.stringify(S)); }
  function q(t) { var s = F && F.cn(t); if (s) F.watch([s]); return s && F.get(s); }
  function set(k, v, h) { var e = box.querySelector('[data-yb-' + k + ']'); if (e) { if (h) e.innerHTML = v; else e.textContent = v; } }
  function paint() { var c = co(S.t); if (!c) return; var b = F && F.get('BTC'), btc = S.sh * c.bps, sats = btc * 1e8, sq = q(c.t);
    set('btc', btcF(btc) + ' BTC'); set('sats', n(sats) + ' sats · ' + n(c.bps * 1e8) + ' sats per share'); set('usd', b ? usd(btc * b.px) : '…'); set('btcpx', b ? 'BTC ' + usd(b.px) + ' · Coinbase live' : 'loading live BTC…');
    var spx = sq && sq.px != null ? (sq.ext && F.session() !== 'open' ? sq.ext.px : sq.px) : null, cur = sq ? sq.cur : c.cur;
    if (spx && (cur === 'USD' || !cur)) { var sv = spx * S.sh; set('stk', usd(sv)); if (b) { var m = sv / (btc * b.px); set('prem', 'You pay ' + m.toFixed(2) + 'x the bitcoin inside (' + (m >= 1 ? 'premium' : 'discount') + ') · ' + c.t + ' $' + n(spx, 2)); } }
    else { set('stk', spx ? n(spx * S.sh, 2) + ' ' + (cur || '') : '—'); set('prem', spx ? 'Share price in ' + cur + '; premium shown only for US-dollar listings' : 'No live share price for this listing'); }
    set('note', 'Each of your ' + n(S.sh, S.sh % 1 ? 2 : 0) + ' ' + c.t + ' shares is backed by ' + n(c.bps * 1e8) + ' sats, so together they represent ' + btcF(btc) + ' BTC of the company\u2019s ' + n(c.btc) + ' BTC. This is your proportional claim on paper; shareholders do not own the coins directly, and debt and preferred stock rank ahead of common.');
    // company context
    var kv = [['BTC held', n(c.btc) + ' BTC'], ['Rank by BTC held', '#' + c.rank]];
    if (c.t === 'MSTR' && DESK && DESK.strategy.kpis) { var L = DESK.strategy.kpis.ledger || {}; kv.push(['BTC Yield YTD', (L.btc_yield_ytd_pct >= 0 ? '+' : '') + L.btc_yield_ytd_pct + '% <small>strategy.com</small>'], ['BTC Gain YTD', (L.btc_gain_ytd >= 0 ? '+' : '−') + n(Math.abs(L.btc_gain_ytd)) + ' BTC'], ['Sats per share', n(Math.round(c.bps * 1e8)) + ' <small>assumed diluted</small>'], ['mNAV (close)', DESK.strategy.mnav.toFixed(2) + 'x']); }
    else { var cc = COS && c.slug && COS[c.slug]; if (cc && cc.change_90d_pct != null) kv.push(['BTC held, 90-day change', (cc.change_90d_pct >= 0 ? '+' : '') + cc.change_90d_pct + '%']); kv.push(['BTC Yield / Gain', '<small>Not reported in a standard way; see the per-share trend</small>']); }
    kv.push(['Data as of', c.t === 'MSTR' && DESK && DESK.strategy.btc_as_of ? esc(DESK.strategy.btc_as_of) + ' · 8-K' : esc(String(asof).slice(0, 10)) + ' · weekly']); box.querySelector('[data-yb-co-kv]').innerHTML = kv.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('');
    trend(c); }
  function trend(c) { var cv = box.querySelector('[data-yb-cv]'), pts = [], msg = '';
    if (c.t === 'MSTR' && STRAT) { STRAT.purchases.forEach(function (p) { if (p.adso_k && p.holdings) pts.push({ t: Date.parse(p.date + 'T12:00:00Z'), c: p.holdings / (p.adso_k * 1e3) * 1e8 }); });
      if (pts.length > 1) { var a = pts[0], z = pts[pts.length - 1], y1 = pts.filter(function (p) { return p.t >= z.t - 365 * 864e5; })[0]; msg = 'Strategy: ' + n(z.c) + ' sats per share on ' + new Date(z.t).toISOString().slice(0, 10) + (y1 && y1 !== z ? ', ' + (z.c >= y1.c ? 'up ' : 'down ') + Math.abs((z.c / y1.c - 1) * 100).toFixed(1) + '% in a year' : '') + '. Rising sats per share = the company adds bitcoin faster than it issues shares (that is BTC Yield).'; } }
    else if (BH) { BH.snaps.forEach(function (s) { var v = s.bps[c.t]; if (v) pts.push({ t: Date.parse(s.d + 'T12:00:00Z'), c: v * 1e8 }); }); pts.push({ t: Date.now(), c: c.bps * 1e8 });
      msg = pts.length > 2 ? c.t + ': ' + (pts[pts.length - 1].c >= pts[0].c ? 'up ' : 'down ') + Math.abs((pts[pts.length - 1].c / pts[0].c - 1) * 100).toFixed(1) + '% since ' + new Date(pts[0].t).toISOString().slice(0, 10) + '.' : 'Weekly tracking for ' + c.t + ' started Oct 2026; the trend line fills in each Sunday.'; }
    set('trend', msg); if (window.BTD_CH && pts.length > 1) BTD_CH.draw(cv, [{ s: pts, col: '#F7931A', w: 2 }], { area: true, cur: 'sats' }); else if (cv.getContext) { var x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); } }
  /* Pro: whole portfolio across companies */
  function pro() { var pb = document.querySelector('[data-yb-pro]'); if (!pb) return; var ok = M.canAccess ? M.canAccess('pro') : true;
    if (!ok) { pb.innerHTML = '<div class="yb-gate"><b>Portfolio view · Pro Vault</b><p>Add every treasury stock you hold and see your total bitcoin, sats and live value in one place. ' + (M.PRO_GATE ? 'Part of Desk Pro.' : 'Free with your email during launch.') + '</p><a class="btn btn-primary" href="/members/pro/">Unlock in the Pro Vault →</a></div>'; return; }
    var P; try { P = JSON.parse(LS.get('btd_ybp') || 'null'); } catch (e) {} if (!Array.isArray(P) || !P.length) P = [{ t: 'MSTR', sh: 100 }, { t: 'ASST', sh: 0 }];
    var draw = function () { var b = F && F.get('BTC'), tot = 0, tv = 0;
      pb.innerHTML = '<h3>Your treasury-stock portfolio <span class="pill">Pro</span></h3><table class="yb-pt"><thead><tr><th>Company</th><th>Shares</th><th class="r">BTC</th><th class="r">Sats</th><th class="r">Value</th><th></th></tr></thead><tbody>' + P.map(function (r, i) { var c = co(r.t), btc = (r.sh || 0) * c.bps; tot += btc; return '<tr><td><select data-ybp-t="' + i + '" aria-label="Company">' + CO.map(function (x) { return '<option value="' + esc(x.t) + '"' + (x.t === c.t ? ' selected' : '') + '>' + esc(x.t) + '</option>'; }).join('') + '</select></td><td><input type="number" min="0" step="any" value="' + (r.sh || 0) + '" data-ybp-sh="' + i + '" aria-label="Shares"></td><td class="r">' + btcF(btc) + '</td><td class="r">' + n(btc * 1e8) + '</td><td class="r">' + (b ? usd(btc * b.px) : '…') + '</td><td><button type="button" class="chip" data-ybp-rm="' + i + '" aria-label="Remove row">×</button></td></tr>'; }).join('') + '</tbody><tfoot><tr><th>Total</th><th></th><th class="r">' + btcF(tot) + ' BTC</th><th class="r">' + n(tot * 1e8) + '</th><th class="r">' + (b ? usd(tot * b.px) : '…') + '</th><th></th></tr></tfoot></table><button type="button" class="chip" data-ybp-add>＋ Add company</button><p class="yb-s">Saved in this browser only. Education only.</p>'; };
    var keep = function () { LS.set('btd_ybp', JSON.stringify(P)); };
    pb.addEventListener('change', function (e) { var t = e.target; if (t.dataset.ybpT) { P[+t.dataset.ybpT].t = t.value; keep(); draw(); } else if (t.dataset.ybpSh) { P[+t.dataset.ybpSh].sh = Math.max(0, +t.value || 0); keep(); draw(); } });
    pb.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.hasAttribute('data-ybp-add')) { P.push({ t: 'MSTR', sh: 0 }); keep(); draw(); } else if (b.dataset.ybpRm) { P.splice(+b.dataset.ybpRm, 1); if (!P.length) P.push({ t: 'MSTR', sh: 0 }); keep(); draw(); } });
    draw(); if (F) F.on('BTC', throttle(function () { if (!pb.contains(document.activeElement)) draw(); }, 5000)); }
})();
