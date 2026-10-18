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
    CO = (r[0].public_companies || []).filter(function (c) { return c.btc && c.ticker && +c.rank >= 1 && +c.rank <= 50; }).map(function (c) {
      var bps = c.btc_per_share_basic; if (c.ticker === 'MSTR' && DESK && DESK.strategy && DESK.strategy.sats_per_share) bps = DESK.strategy.btc_held / ((STRAT && STRAT.adso) || (DESK.strategy.btc_held / (DESK.strategy.sats_per_share / 1e8)));
      var btcH = c.ticker === 'MSTR' && DESK && DESK.strategy && DESK.strategy.btc_held ? DESK.strategy.btc_held : c.btc; if (c.ticker === 'MSTR' && STRAT && STRAT.adso) bps = btcH / STRAT.adso;
      return { t: c.ticker, name: c.name, slug: c.slug, rank: +c.rank, btc: btcH, bps: bps || null, cur: c.currency, sp: c.stock_price, mc: c.market_cap_basic, sub: c.subtype }; });
    CO.sort(function (a, b) { return a.rank - b.rank; });
    asof = r[0].as_of; init(); }).catch(function () { box.innerHTML = '<p class="muted">Could not load company data. Please refresh.</p>'; });
  var asof = '', S = { t: 'MSTR', sh: 100 }; try { var so = JSON.parse(LS.get('btd_yb') || '{}'); /* company is never restored: every visit opens on Strategy (MSTR); older builds saved the last pick (e.g. MARA) */ if (so.sh > 0) S.sh = +so.sh; } catch (e) {}
  function co(t) { return CO.filter(function (c) { return c.t === t; })[0] || CO.filter(function (c) { return c.t === 'MSTR'; })[0] || CO[0]; }
  function lbl(c) { return c.name + ' (' + c.t + ')'; }
  function match(v) { v = String(v || '').trim().toLowerCase(); if (!v) return CO.slice(); var ex = [], pre = [], sub = []; CO.forEach(function (c) { var t = c.t.toLowerCase(), nm = c.name.toLowerCase(); if (t === v || t.split('.')[0] === v) ex.push(c); else if (t.indexOf(v) === 0 || nm.indexOf(v) === 0) pre.push(c); else if (nm.indexOf(v) >= 0 || (v.length > 2 && t.indexOf(v) >= 0)) sub.push(c); }); return ex.concat(pre, sub); }
  function init() {
    box.innerHTML = '<div class="yb-in"><div class="yb-f yb-cb"><label for="yb-co">Company \u00b7 top 50 by BTC held</label><input id="yb-co" data-yb-co role="combobox" aria-expanded="false" aria-controls="yb-lb" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Type a ticker or name"><ul class="yb-lb" id="yb-lb" role="listbox" data-yb-lb hidden></ul></div>' +
      '<label class="yb-f yb-sh"><span>Shares you own</span><input type="number" inputmode="decimal" min="0" step="any" data-yb-sh aria-label="Number of shares"></label></div>' +
      '<div class="yb-quick" role="group" aria-label="Quick picks">' + ['MSTR', 'ASST', 'MPJPY', 'XXI', 'MARA', 'SWC.L', 'NAKA'].filter(function (t) { return CO.some(function (c) { return c.t === t; }); }).map(function (t) { return '<button type="button" class="chip" data-yb-q="' + esc(t) + '">' + esc(t === 'MPJPY' ? 'Metaplanet' : t === 'SWC.L' ? 'Smarter Web' : t) + '</button>'; }).join('') + '</div>' +
      '<div class="yb-card" data-yb-card aria-live="polite"></div>' +
      '<div class="yb-out" aria-live="polite"><div class="yb-k yb-main"><span>Your bitcoin</span><b data-yb-btc>…</b><small data-yb-sats></small></div><div class="yb-k"><span>Worth now (live BTC)</span><b data-yb-usd>…</b><small data-yb-btcpx></small></div><div class="yb-k"><span>Your shares are worth</span><b data-yb-stk>…</b><small data-yb-prem></small></div></div>' +
      '<p class="yb-note" data-yb-note></p>' +
      '<div class="yb-disc"><p>Estimates only. Figures are approximate, based on each company\u2019s latest publicly reported bitcoin holdings and share count (source and as-of date shown) and live prices, and may be out of date. Shares don\u2019t give you a direct claim on a company\u2019s bitcoin. Debt, preferred stock, dilution and other factors affect real value. Educational only, not investment advice.</p><details><summary>How these are calculated</summary><p>BTC per share = reported BTC held \u00f7 reported shares outstanding (basic unless noted). % backed = (BTC per share \u00d7 BTC price) \u00f7 share price.</p></details></div>' +
      '<div class="yb-ctx"><div class="yb-c"><h3>Sats per share over time</h3><canvas data-yb-cv height="150" aria-label="Bitcoin per share over time"></canvas><p class="yb-s" data-yb-trend></p></div></div>';
    var ci = box.querySelector('[data-yb-co]'), si = box.querySelector('[data-yb-sh]'), lb = box.querySelector('[data-yb-lb]'), hi = -1, unknown = '';
    ci.value = lbl(co(S.t)); si.value = S.sh;
    function list(show) { var m = match(ci.value === lbl(co(S.t)) ? '' : ci.value); hi = m.length ? 0 : -1;
      lb.innerHTML = m.length ? m.map(function (c, i) { return '<li role="option" id="yb-o' + i + '" data-yb-o="' + esc(c.t) + '"' + (i === 0 ? ' aria-selected="true"' : '') + '><b>' + esc(c.t) + '</b><span>' + esc(c.name) + '</span><small>#' + c.rank + ' \u00b7 ' + n(c.btc) + ' BTC' + (c.bps ? '' : ' \u00b7 data coming soon') + '</small></li>'; }).join('') : '<li class="yb-none">Not in our top-50 list</li>';
      lb.hidden = !show; ci.setAttribute('aria-expanded', show); }
    function choose(t) { S.t = t; unknown = ''; ci.value = lbl(co(t)); lb.hidden = true; ci.setAttribute('aria-expanded', 'false'); save(); paint(); }
    ci.addEventListener('focus', function () { ci.select(); list(true); });
    ci.addEventListener('input', function () { list(true); });
    ci.addEventListener('keydown', function (e) { var o = lb.querySelectorAll('[data-yb-o]');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (lb.hidden) list(true); if (!o.length) return; hi = (hi + (e.key === 'ArrowDown' ? 1 : -1) + o.length) % o.length; o.forEach(function (x, i) { x.setAttribute('aria-selected', i === hi); }); o[hi].scrollIntoView({ block: 'nearest' }); ci.setAttribute('aria-activedescendant', o[hi].id); }
      else if (e.key === 'Enter') { e.preventDefault(); if (o.length && hi >= 0) choose(o[hi].dataset.ybO); else { unknown = ci.value.trim(); lb.hidden = true; paint(); } }
      else if (e.key === 'Escape') { lb.hidden = true; ci.value = lbl(co(S.t)); } });
    lb.addEventListener('mousedown', function (e) { e.preventDefault(); });
    lb.addEventListener('click', function (e) { var li = e.target.closest('[data-yb-o]'); if (li) choose(li.dataset.ybO); });
    ci.addEventListener('blur', function () { setTimeout(function () { if (lb.hidden) return; lb.hidden = true; ci.setAttribute('aria-expanded', 'false'); var m = match(ci.value); if (ci.value.trim() && ci.value !== lbl(co(S.t))) { if (m.length === 1 || (m.length && m[0].t.toLowerCase() === ci.value.trim().toLowerCase())) choose(m[0].t); else if (!m.length) { unknown = ci.value.trim(); paint(); } else ci.value = lbl(co(S.t)); } else ci.value = lbl(co(S.t)); }, 150); });
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-yb-q]'); if (b) choose(b.dataset.ybQ); });
    box._unknown = function () { return unknown; };
    si.addEventListener('input', function () { S.sh = Math.max(0, +si.value || 0); save(); paint(); });
    if (F) { F.on('BTC', throttle(paint, 1500)); F.on('quotes', paint); }
    paint(); pro(); }

  function lastBuy(c) { var r = DESK && DESK.treasuries && (DESK.treasuries.rows || []).filter(function (x) { return x.tk === c.t || (x.tk && x.tk.split(':').pop() === c.t); })[0];
    if (r && r.last_add) return [r.last_add, r.last_add_src || 'company filing'];
    var cc = COS && c.slug && COS[c.slug], ev = cc && (cc.events || []).filter(function (e) { return e.delta > 0; })[0]; return ev ? [ev.date, 'BitcoinTreasuries.NET'] : null; }
  function card(c, b, sq) { var el = box.querySelector('[data-yb-card]'), u = box._unknown && box._unknown();
    if (u) { el.className = 'yb-card yb-bad'; el.innerHTML = '<b class="yb-ck">\u2715</b><div><b>\u201c' + esc(u) + '\u201d is not in our top-50 list</b><small>Try a ticker (MSTR, MPJPY, ASST) or a company name. Showing ' + esc(lbl(c)) + '.</small></div>'; return; }
    var mstr = c.t === 'MSTR', sh = c.bps ? c.btc / c.bps : null, shAsof = mstr && DESK && DESK.strategy.btc_as_of ? DESK.strategy.btc_as_of : String(asof).slice(0, 10), shSrc = mstr ? 'strategy.com, assumed diluted' : 'BitcoinTreasuries.NET, basic';
    var spx = sq && sq.px != null ? sq.px : null, cur = sq ? sq.cur : c.cur, usdL = cur === 'USD' || !cur;
    var back = spx && usdL && b && c.bps ? c.bps * b.px / spx * 100 : null, lb2 = lastBuy(c), L = mstr && DESK && DESK.strategy.kpis ? DESK.strategy.kpis.ledger || {} : null; if (L && L.as_of && L.btc_acq) lb2 = [L.as_of, (L.btc_acq > 0 ? '+' : '') + n(L.btc_acq) + ' BTC \u00b7 strategy.com ledger'];
    var kv = [['BTC held', n(c.btc) + ' BTC <small>#' + c.rank + ' by holdings</small>'],
      ['Shares outstanding', sh ? n(sh) + ' <small>as of ' + esc(shAsof) + ' \u00b7 ' + shSrc + '</small>' : '<small>data coming soon</small>'],
      ['BTC per share', c.bps ? c.bps.toFixed(8) + ' BTC' : '\u2014'], ['Sats per share', c.bps ? n(Math.round(c.bps * 1e8)) + ' sats' : '\u2014'],
      ['Share price (live)', spx ? (usdL ? '$' + n(spx, 2) : n(spx, 2) + ' ' + esc(cur)) + (sq.ext && F.session() !== 'open' && F.xh ? ' <small>regular-session close</small>' + F.xh(sq, { cls: 'xh-yb' }) : '') : '<small>no live quote</small>'],
      ['BTC behind each share', back != null ? '$' + n(c.bps * b.px, 2) + ' <small>= ' + back.toFixed(0) + '% of the share price</small>' : '<small>' + (spx && !usdL ? 'shown for US-dollar listings only' : 'needs a live share price') + '</small>'],
      ['BTC Yield YTD', L && L.btc_yield_ytd_pct != null ? (L.btc_yield_ytd_pct >= 0 ? '+' : '') + L.btc_yield_ytd_pct + '% <small>Strategy KPI, strategy.com</small>' : '<small>n/a (not reported in a standard way)</small>'],
      ['Last purchase', lb2 ? esc(lb2[0]) + ' <small>' + esc(lb2[1]) + '</small>' : '<small>n/a</small>']];
    el.className = 'yb-card ' + (c.bps ? 'yb-ok' : 'yb-warn');
    el.innerHTML = '<div class="yb-ch"><b class="yb-ck">' + (c.bps ? '\u2713' : '!') + '</b><div><b>' + esc(lbl(c)) + '</b><small>' + (c.bps ? 'Recognized \u00b7 top-50 Bitcoin treasury company' : 'Recognized \u00b7 share-count data coming soon') + '</small></div></div><dl>' + kv.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl><p class="yb-s">Source: ' + (mstr ? 'strategy.com (8-K filings), BTC as of ' + esc(shAsof) : 'BitcoinTreasuries.NET, as of ' + esc(String(asof).slice(0, 10))) + ' \u00b7 live prices: Coinbase (BTC), CNBC quote service (shares, may be delayed).</p>'; }
  function throttle(f, ms) { var t = 0; return function () { if (Date.now() - t > ms) { t = Date.now(); f(); } }; }
  function save() { LS.set('btd_yb', JSON.stringify({ sh: S.sh })); }
  function q(t) { var s = F && F.cn(t); if (s) F.watch([s]); return s && F.get(s); }
  function set(k, v, h) { var e = box.querySelector('[data-yb-' + k + ']'); if (e) { if (h) e.innerHTML = v; else e.textContent = v; } }
  function paint() { var c = co(S.t); if (!c) return; var b = F && F.get('BTC'), sq = q(c.t); card(c, b, sq);
    if (!c.bps) { ['btc', 'usd', 'stk'].forEach(function (k) { set(k, '\u2014'); }); set('sats', 'Share-count data coming soon for ' + c.t); set('prem', ''); set('btcpx', b ? 'BTC ' + usd(b.px) + ' \u00b7 Coinbase live' : ''); set('note', c.name + ' is on our top-50 list (' + n(c.btc) + ' BTC), but we don\u2019t have a reliable share count yet, so per-share figures are not shown.'); trend(c); return; }
    var btc = S.sh * c.bps, sats = btc * 1e8;
    set('btc', btcF(btc) + ' BTC'); set('sats', n(sats) + ' sats · ' + n(c.bps * 1e8) + ' sats per share'); set('usd', b ? usd(btc * b.px) : '…'); set('btcpx', b ? 'BTC ' + usd(b.px) + ' · Coinbase live' : 'loading live BTC…');
    var spx = sq && sq.px != null ? sq.px : null, cur = sq ? sq.cur : c.cur;
    if (spx && (cur === 'USD' || !cur)) { var sv = spx * S.sh; set('stk', usd(sv)); if (b) { var m = sv / (btc * b.px); set('prem', 'You pay ' + m.toFixed(2) + 'x the bitcoin inside (' + (m >= 1 ? 'premium' : 'discount') + ') · ' + c.t + ' $' + n(spx, 2)); } }
    else { set('stk', spx ? n(spx * S.sh, 2) + ' ' + (cur || '') : '—'); set('prem', spx ? 'Share price in ' + cur + '; premium shown only for US-dollar listings' : 'No live share price for this listing'); }
    set('note', 'Each of your ' + n(S.sh, S.sh % 1 ? 2 : 0) + ' ' + c.t + ' shares is backed by ' + n(c.bps * 1e8) + ' sats, so together they represent ' + btcF(btc) + ' BTC of the company\u2019s ' + n(c.btc) + ' BTC. This is your proportional claim on paper; shareholders do not own the coins directly, and debt and preferred stock rank ahead of common.');
    trend(c); }
  function trend(c) { var cv = box.querySelector('[data-yb-cv]'), pts = [], msg = '';
    if (!c.bps) { var x0 = cv.getContext('2d'); x0.clearRect(0, 0, cv.width, cv.height); set('trend', 'Per-share history coming soon for ' + c.t + '.'); return; }
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
