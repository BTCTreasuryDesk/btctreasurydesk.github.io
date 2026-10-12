/* BTC Treasury Desk: Strategy KPIs row, live MSTR mNAV + history, What changed this week (home); Company Compare (companies); full Strategy KPIs (saylor).
   Every number comes from a dated file (desk.json, strategy.json, stocks_daily.json, btc_daily.json, perf.json, weekly.json) or a live public quote. Education only. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, DAY = 864e5;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, d) { return n == null || !isFinite(n) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); }
  function sgn(n, d) { return (n < 0 ? '−' : '+') + fmt(Math.abs(n), d); }
  function pct(n, d) { return n == null || !isFinite(n) ? '—' : sgn(n, d == null ? 1 : d) + '%'; }
  function musd(m) { var a = Math.abs(m); return (m < 0 ? '−' : '') + (a >= 1000 ? '$' + fmt(a / 1000, 2) + 'B' : '$' + fmt(a) + 'M'); }
  function dl(iso) { if (!iso) return ''; var d = new Date(iso.slice(0, 10) + 'T12:00:00Z'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }); }
  function dly(iso) { var d = new Date(iso.slice(0, 10) + 'T12:00:00Z'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
  function J(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
  function O(u) { return J(u).catch(function () { return null; }); }
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var cls = function (n) { return n == null || n === 0 ? '' : n < 0 ? ' x-dn' : ' x-up'; };
  var SRC = '<a href="https://www.strategy.com/" target="_blank" rel="noopener">strategy.com</a>';

  var home = $('[data-x-kpi]') || $('[data-x-mnav]') || $('[data-x-wcw]'), cmp = $('[data-x-compare]'), full = $('[data-kpi-full]');
  if (!home && !cmp && !full) return;

  /* ---------- live quotes (same public feeds as the top strip) ---------- */
  var LV = { mstr: null, btc: null, t: null };
  function pullLive(cb) {
    var a = fetch('https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=MSTR&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1')
      .then(function (r) { return r.json(); }).then(function (j) { var x = (j.FormattedQuoteResult || {}).FormattedQuote; x = Array.isArray(x) ? x[0] : x; var px = parseFloat(String(x.last).replace(/,/g, '')); if (isFinite(px)) LV.mstr = px; }).catch(function () {});
    var b = fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker').then(function (r) { return r.json(); }).then(function (x) { if (+x.price) LV.btc = +x.price; })
      .catch(function () { return fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(function (r) { return r.json(); }).then(function (j) { LV.btc = j.bitcoin.usd; }).catch(function () {}); });
    Promise.all([a, b]).then(function () { LV.t = new Date(); cb(); });
  }
  function liveMnav(K) { // strategy.com method: EV / BTC NAV, EV = MSTR price x implied shares + debt + pref - USD reserve/cash
    if (window.btdLiveMnav) return window.btdLiveMnav(K, LV.mstr, LV.btc);
    var L = K && K.live; if (!L || !LV.mstr || !LV.btc) return null; var sh = L.market_cap_musd / L.mstr_close, cash = L.market_cap_musd + L.debt_musd + L.pref_musd - L.ev_musd;
    return (LV.mstr * sh + L.debt_musd + L.pref_musd - cash) / (L.btc_held * LV.btc / 1e6);
  }
  function nyTime(d) { return d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }) + ' ET'; }

  /* ---------- Strategy KPI tiles ---------- */
  function kpiTiles(D, all) {
    var s = D.strategy, K = s.kpis || {}, G = K.ledger || {}, L = K.live || {}, T = K.totals || {}, t = [];
    var ld = G.as_of ? 'ledger · ' + dl(G.as_of) : '', lv = L.as_of_securities ? dl(L.as_of_securities.replace(/(\d+)\/(\d+)\/(\d+).*/, '$3-$1-$2')) + ' close' : '';
    var tc = T.total_cost_musd || (s.total_cost_usd ? s.total_cost_usd / 1e6 : null), ac = T.avg_cost || s.avg_cost;
    t.push(['BTC holdings', fmt(s.btc_held) + ' ₿', 'as of ' + dl(s.btc_as_of) + ' · 8-K']);
    if (tc) t.push(['Unrealized gain · live', '…', 'BTC price × holdings − total cost', null, '', 'Since inception (first buy Aug 2020): live BTC price × ' + fmt(s.btc_held) + ' BTC minus total cost ' + musd(tc) + ' (strategy.com ledger totals).', 'ug']);
    if (G.btc_yield_ytd_pct != null) t.push(['BTC Yield YTD', pct(G.btc_yield_ytd_pct), ld, G.btc_yield_ytd_pct, '', 'BTC Yield: Strategy KPI. Change in BTC per assumed diluted share since Dec 31.']);
    if (L.sats_per_share) t.push(['Sats per share', fmt(L.sats_per_share), 'strategy.com', null, '', 'BTC per assumed diluted share, in sats (1 BTC = 100M sats), per strategy.com. Change vs the prior ledger row.', 'sps']);
    if (ac) t.push(['BTC vs avg cost · live', '…', 'vs $' + fmt(ac) + ' avg cost', null, '', 'Live BTC price compared with Strategy’s average cost per BTC (strategy.com ledger totals).', 'vac']);
    if (s.mnav) t.push(['mNAV', s.mnav.toFixed(2) + 'x', lv || 'strategy.com']);
    if (T.avg_cost || s.avg_cost) t.push(['Avg cost / BTC', '$' + fmt(T.avg_cost || s.avg_cost), 'ledger totals']);
    if (G.btc_gain_ytd != null) t.push(['BTC Gain YTD', sgn(G.btc_gain_ytd) + ' ₿', ld, G.btc_gain_ytd, '', 'BTC Gain: Strategy KPI. BTC Yield YTD x BTC held at the start of the year.']);
    if (G.usd_gain_ytd_musd != null) t.push(['BTC $ Gain YTD', musd(G.usd_gain_ytd_musd), ld, G.usd_gain_ytd_musd, '', 'BTC $ Gain: Strategy KPI. BTC Gain x the bitcoin price.']);
    if (all) {
      if (G.btc_yield_qtd_pct != null) t.push(['BTC Yield QTD', pct(G.btc_yield_qtd_pct), ld, G.btc_yield_qtd_pct]);
      if (T.total_cost_musd) t.push(['Total cost', musd(T.total_cost_musd), 'ledger totals']);
      if (L.btc_nav_musd) t.push(['Market value of BTC', musd(L.btc_nav_musd), 'BTC NAV · ' + esc(L.as_of_btc || '')]);
      if (L.total_reserve_musd) t.push(['Reserve (BTC + USD)', musd(L.total_reserve_musd), esc(L.as_of_btc || '')]);
      if (L.btc_acquired_ytd) t.push(['BTC acquired YTD', '+' + fmt(L.btc_acquired_ytd) + ' ₿', 'strategy.com']);
      if (L.amplification) t.push(['Amplification', L.amplification.toFixed(2) + 'x', 'per strategy.com']);
      if (L.market_cap_musd) t.push(['Market cap', musd(L.market_cap_musd), lv]);
      if (L.ev_musd) t.push(['Enterprise value', musd(L.ev_musd), lv]);
      if (L.debt_musd) t.push(['Debt', musd(L.debt_musd), lv]);
      if (L.pref_musd) t.push(['Preferred (notional)', musd(L.pref_musd), lv]);
      if (L.dividend_coverage_yrs) t.push(['Dividend coverage', fmt(L.dividend_coverage_yrs, 1) + ' yrs', 'reserve ÷ annual interest + dividends']);
    }
    return t.map(function (x) { return '<div class="x-k' + (x[4] ? ' x-hero' : '') + '"' + (x[6] ? ' data-xl="' + x[6] + '"' : '') + (x[5] ? ' title="' + esc(x[5]) + '"' : '') + '><small>' + esc(x[0]) + '</small><b class="' + cls(x[3]).trim() + '">' + esc(x[1]) + '</b><small>' + esc(x[2]) + '</small></div>'; }).join('');
  }
  function kpiLive(root, D) {
    var s = D.strategy, T = (s.kpis || {}).totals || {}, tc = T.total_cost_musd || s.total_cost_usd / 1e6, ac = T.avg_cost || s.avg_cost;
    function paint() { if (!LV.btc) return; var mv = s.btc_held * LV.btc / 1e6, ug = mv - tc, v = LV.btc / ac * 100 - 100, at = ' · BTC $' + fmt(LV.btc) + ' ' + nyTime(LV.t);
      root.querySelectorAll('[data-xl="ug"]').forEach(function (e) { var b = e.querySelector('b'); b.textContent = musd(ug) + ' (' + pct(ug / tc * 100) + ')'; b.className = cls(ug).trim(); e.querySelector('small:last-child').textContent = 'BTC × holdings − total cost' + at; });
      root.querySelectorAll('[data-xl="vac"]').forEach(function (e) { var b = e.querySelector('b'); b.textContent = pct(v) + (v >= 0 ? ' above' : ' below'); b.className = cls(v).trim(); e.querySelector('small:last-child').textContent = '$' + fmt(LV.btc) + ' vs $' + fmt(ac) + ' avg cost'; }); }
    paint(); pullLive(paint); setInterval(function () { if (!document.hidden) pullLive(paint); }, 60000);
  }
  function kpiSps(root) {
    O('/assets/data/strategy.json').then(function (S) { if (!S) return; var r = S.purchases.filter(function (x) { return x.adso_k; }); if (r.length < 2) return; var a = r[r.length - 2], b = r[r.length - 1], ch = (b.holdings / b.adso_k) / (a.holdings / a.adso_k) * 100 - 100;
      root.querySelectorAll('[data-xl="sps"] small:last-child').forEach(function (e) { e.innerHTML = '<span class="' + cls(ch).trim() + '">' + pct(ch, 2) + '</span> vs ' + dl(a.date) + ' ledger row'; }); });
  }
  function marketRow(D) {
    var P = D.treasuries.public; if (!P) return '';
    return '<div class="x-mkt"><span><b>' + fmt(P.total_btc / 1e6, 3) + 'M ₿</b> held by public companies</span><span><b>' + fmt(P.count) + '</b> listed · <b>' + D.treasuries.rows.length + '</b> on our board</span><span>Strategy <b>' + fmt(P.strategy_btc / P.total_btc * 100, 1) + '%</b> of public-company BTC</span><span class="x-mu">' + esc(P.src.name.replace(' public-company total', '')) + ' · ' + dl(P.as_of) + '</span></div>';
  }

  /* ---------- mNAV history (market-cap basis, verified inputs) ---------- */
  function mnavSeries(S, M, B) {
    var rows = S.purchases.filter(function (p) { return p.adso_k; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); if (!rows.length) return [];
    var b0 = Date.parse(B.start + 'T00:00:00Z'), out = [], k = 0;
    for (var i = 0; i < M.d.length; i++) { var d = M.d[i]; if (d < rows[0].date) continue; while (k + 1 < rows.length && rows[k + 1].date <= d) k++;
      var bi = Math.round((Date.parse(d + 'T00:00:00Z') - b0) / DAY), bp = B.closes[bi]; if (!bp) continue;
      out.push({ d: d, v: M.c[i] * rows[k].adso_k * 1e3 / (rows[k].holdings * bp) }); }
    return out;
  }
  function q(sorted, p) { var i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo); }
  function drawMnav(cv, ser, P, now) {
    var w = cv.clientWidth || 600, h = cv.clientHeight || 220, r = window.devicePixelRatio || 1; cv.width = w * r; cv.height = h * r; var c = cv.getContext('2d'); c.scale(r, r);
    var pl = 38, pr = 8, pt = 12, pb = 18, vals = ser.map(function (x) { return x.v; }).concat(now ? [now] : []), lo = Math.min.apply(0, vals) * 0.95, hi = Math.max.apply(0, vals) * 1.03;
    var X = function (i) { return pl + i / (ser.length - 1) * (w - pl - pr); }, Y = function (v) { return pt + (hi - v) / (hi - lo) * (h - pt - pb); };
    c.font = '10px ui-monospace,Menlo,monospace'; c.fillStyle = '#7d8794';
    c.fillStyle = 'rgba(247,147,26,.07)'; c.fillRect(pl, Y(P[4]), w - pl - pr, Y(P[0]) - Y(P[4]));
    c.fillStyle = 'rgba(247,147,26,.12)'; c.fillRect(pl, Y(P[3]), w - pl - pr, Y(P[1]) - Y(P[3]));
    c.strokeStyle = '#39414c'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(pl, Y(P[2])); c.lineTo(w - pr, Y(P[2])); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#7d8794'; c.textAlign = 'right'; c.textBaseline = 'middle';
    [P[0], P[2], P[4]].forEach(function (v, i) { c.fillText(v.toFixed(2) + 'x', pl - 4, Y(v)); });
    c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText('p10–p90', pl + 4, Y(P[0]) - 3);
    c.strokeStyle = '#F7931A'; c.lineWidth = 1.5; c.beginPath(); ser.forEach(function (x, i) { i ? c.lineTo(X(i), Y(x.v)) : c.moveTo(X(i), Y(x.v)); }); c.stroke();
    c.textAlign = 'center'; c.fillStyle = '#7d8794'; var lastM = '';
    ser.forEach(function (x, i) { var m = x.d.slice(0, 7); if (m !== lastM && /-(01|04|07|10)$/.test(m) && X(i) > pl + 20 && X(i) < w - 30) { c.fillText(new Date(x.d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }), X(i), h - 4); } lastM = m; });
    if (now) { c.fillStyle = '#fff'; c.beginPath(); c.arc(w - pr - 2, Y(now), 3.5, 0, 7); c.fill(); }
  }
  function mnavPanel(box, D, S, M, B) {
    var K = D.strategy.kpis || {}, ser = mnavSeries(S, M, B); if (ser.length < 60) { box.innerHTML = '<p class="x-mu">mNAV history unavailable.</p>'; return; }
    var srt = ser.map(function (x) { return x.v; }).sort(function (a, b) { return a - b; }), P = [0.1, 0.25, 0.5, 0.75, 0.9].map(function (p) { return q(srt, p); });
    var rows = S.purchases.filter(function (p) { return p.adso_k; }), lr = rows[rows.length - 1];
    box.innerHTML = '<div class="x-mn"><div class="x-mn-l">' +
      '<div class="x-k x-hero"><small>Live mNAV · strategy.com method</small><b data-x-live>…</b><small data-x-live-s>loading live MSTR and BTC…</small></div>' +
      '<div class="x-k"><small>Official mNAV</small><b>' + (D.strategy.mnav ? D.strategy.mnav.toFixed(2) + 'x' : '—') + '</b><small>' + SRC + ' · ' + esc((K.live && K.live.as_of_securities) || D.strategy.kpi_as_of || '') + '</small></div>' +
      '<div class="x-k"><small>Market-cap mNAV vs history</small><b data-x-mc>…</b><small data-x-mc-s>percentile since ' + dl(ser[0].d) + ' ' + ser[0].d.slice(0, 4) + '</small></div></div>' +
      '<div class="x-mn-r"><canvas data-x-cv aria-label="MSTR market-cap mNAV history with percentile bands"></canvas>' +
      '<p class="x-f">Line: MSTR close × assumed diluted shares (strategy.com ledger) ÷ (BTC held × BTC close), daily since ' + dly(ser[0].d) + ' (first ledger row with ADSO) to ' + dly(ser[ser.length - 1].d) + '. Bands: 10th–90th and 25th–75th percentile, dashed = median ' + P[2].toFixed(2) + 'x. White dot: today. The official figure uses enterprise value (adds debt and preferreds, subtracts cash), so it reads higher. <b>Education only, not investment advice.</b></p></div></div>';
    var cv = $('[data-x-cv]', box), now = null;
    function paint() {
      var mn = liveMnav(K), el = $('[data-x-live]', box), es = $('[data-x-live-s]', box);
      if (mn) { el.textContent = mn.toFixed(2) + 'x'; es.textContent = 'MSTR $' + LV.mstr.toFixed(2) + ' (latest trade) · BTC $' + fmt(LV.btc) + ' · ' + nyTime(LV.t); } else { el.textContent = '—'; es.textContent = 'live quotes unavailable'; }
      if (LV.mstr && LV.btc) { now = LV.mstr * lr.adso_k * 1e3 / (lr.holdings * LV.btc); var pc = srt.filter(function (v) { return v <= now; }).length / srt.length * 100;
        $('[data-x-mc]', box).textContent = now.toFixed(2) + 'x'; $('[data-x-mc-s]', box).textContent = Math.round(pc) + 'th percentile since ' + dl(ser[0].d) + ' ' + ser[0].d.slice(0, 4) + ' · ' + (pc < 25 ? 'low end of its range' : pc > 75 ? 'high end of its range' : 'middle of its range'); }
      drawMnav(cv, ser, P, now);
    }
    paint(); pullLive(paint); setInterval(function () { if (!document.hidden) pullLive(paint); }, 60000);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(paint, 150); });
  }

  /* ---------- What changed this week ---------- */
  function sma(a, i, n) { if (i < n - 1) return null; var s = 0; for (var k = i - n + 1; k <= i; k++) s += a[k]; return s / n; }
  function badges(c, i) { var w = []; for (var k = i; k >= 0 && w.length < 200; k -= 7) w.unshift(c[k]); var wma = w.length >= 200 ? w.reduce(function (a, b) { return a + b; }, 0) / w.length : null;
    var d200 = sma(c, i, 200), d50 = sma(c, i, 50), may = d200 ? c[i] / d200 : null;
    return { wma: wma ? c[i] >= wma : null, cross: d50 && d200 ? d50 >= d200 : null, may: may, mz: may == null ? null : may < 0.8 ? 'cool' : may > 2.4 ? 'hot' : 'mid' }; }
  function wcw(box, D, W, B) {
    var T = D.treasuries, prev = T.prev, li = [], rows = T.rows;
    if (prev) {
      var buys = rows.map(function (r) { var p = prev.rows[r.tk]; return p ? { r: r, d: r.btc - p.btc } : null; }).filter(function (x) { return x && Math.abs(x.d) >= 1; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
      li.push(buys.length ? '<b>BTC buys:</b> ' + buys.slice(0, 5).map(function (x) { return esc(x.r.name) + ' <span class="' + (x.d > 0 ? 'x-up' : 'x-dn') + '">' + sgn(x.d) + ' ₿</span>'; }).join(' · ') + (buys.length > 5 ? ' · +' + (buys.length - 5) + ' more' : '') : 'No new BTC buys reported on the board this week.');
      var mv = rows.map(function (r) { var p = prev.rows[r.tk]; return p && p.rank ? { r: r, m: p.rank - r.rank, p: p.rank } : null; }).filter(function (x) { return x && x.m; }).sort(function (a, b) { return Math.abs(b.m) - Math.abs(a.m) || a.r.rank - b.r.rank; }).slice(0, 3);
      li.push(mv.length ? '<b>Board movers:</b> ' + mv.map(function (x) { return esc(x.r.name) + ' <span class="' + (x.m > 0 ? 'x-up' : 'x-dn') + '">#' + x.p + '→#' + x.r.rank + '</span>'; }).join(' · ') : '<b>Board movers:</b> no rank changes this week.');
    }
    var up = (D.prefs_desk && D.prefs_desk.upcoming) || [];
    up.slice(0, 2).forEach(function (u) { li.push('<b>Preferreds:</b> ' + esc(u.company) + ', ' + esc(u.item) + ' <span class="x-mu">(' + esc(u.status) + ', ' + dl(u.date) + ')</span>'); });
    if (B) { var c = B.closes, L = c.length - 1, a = badges(c, L - 7), b = badges(c, L), ch = [];
      if (a.wma !== b.wma && b.wma != null) ch.push('BTC moved ' + (b.wma ? 'above' : 'below') + ' the 200-week MA');
      if (a.cross !== b.cross && b.cross != null) ch.push(b.cross ? 'golden cross (50D over 200D)' : 'death cross (50D under 200D)');
      if (a.mz !== b.mz) ch.push('Mayer Multiple zone ' + a.mz + ' → ' + b.mz);
      li.push('<b>Models:</b> BTC ' + pct((c[L] / c[L - 7] - 1) * 100) + ' over 7 days. ' + (ch.length ? ch.join('; ') + '.' : 'No zone or badge flips: ' + (b.wma ? 'above' : 'below') + ' the 200-week MA, ' + (b.cross ? 'golden' : 'death') + ' cross holds, Mayer ' + b.may.toFixed(2) + 'x.')); }
    if (W && W.items) W.items.filter(function (x) { return x.new; }).slice(0, 1).forEach(function (x) { li.push('<b>Members:</b> ' + esc(x.t) + ' <a href="/members/">Open →</a>'); });
    box.innerHTML = '<ul class="x-wl">' + li.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p class="x-f">Board change vs ' + (prev ? esc(prev.src) : 'last week') + '; models from daily BTC closes to ' + dl(B ? B.as_of : '') + '. Updated each Sunday.</p>';
  }

  /* ---------- Company Compare ---------- */
  function compare(box, D, P, S, V) {
    var rows = D.treasuries.rows.slice().sort(function (a, b) { return a.rank - b.rank; }), by = {}; rows.forEach(function (r) { by[r.tk] = r; });
    var pub = D.treasuries.public, K = D.strategy.kpis || {};
    var url = (location.search.match(/[?&]c=([^&]+)/) || [])[1], pick = (url ? decodeURIComponent(url) : LS.get('btd_cmp') || 'MSTR,MPJPY,ASST').split(',').filter(function (t) { return by[t]; }).slice(0, 3);
    if (pick.length < 2) pick = ['MSTR', 'MPJPY', 'ASST'];
    var vp = V && V.points && V.points[V.points.length - 1];
    function bps(r) {
      if (r.tk === 'MSTR' && K.live && K.live.sats_per_share) return [fmt(K.live.sats_per_share) + ' sats', 'strategy.com, ' + esc(K.live.as_of_btc.slice(0, 10))];
      if (r.tk === 'ASST' && vp) return [fmt(vp.btc / vp.shares * 1e8) + ' sats', '8-K, ' + dl(vp.date) + ' (fully diluted)'];
      return ['—', 'not issuer-verified'];
    }
    function perf(r, k) { var x = P && P.q[r.tk]; if (!x || x[k] == null) return ['—', x && x.note ? x.note : 'no verified price history']; return [pct(x[k]), x.sym + ' to ' + dl(x.d) + (x.cur && x.cur !== 'USD' ? ' · ' + x.cur : '')]; }
    var M = [
      ['Rank by BTC held', function (r) { return ['#' + r.rank, '']; }],
      ['BTC held', function (r) { return [fmt(r.btc) + ' ₿', esc(r.last_add_src || D.treasuries.src.name)]; }],
      ['Share of public-company BTC', function (r) { return pub ? [fmt(r.btc / pub.total_btc * 100, 2) + '%', 'of ' + fmt(pub.total_btc / 1e6, 3) + 'M ₿ (' + dl(pub.as_of) + ')'] : ['—', '']; }],
      ['BTC per share', bps],
      ['mNAV', function (r) { return r.mnav ? [r.mnav.toFixed(2) + 'x', esc(r.mnav_src || '')] : ['—', 'not published']; }],
      ['YTD price', function (r) { return perf(r, 'ytd'); }],
      ['1Y price', function (r) { return perf(r, 'y1'); }],
      ['Last BTC added', function (r) { return r.last_add ? [dl(r.last_add) + ' ' + r.last_add.slice(0, 4), ''] : ['—', '']; }]
    ];
    function opts(sel, allowNone) { return (allowNone ? '<option value="">— none —</option>' : '') + rows.map(function (r) { return '<option value="' + esc(r.tk) + '"' + (r.tk === sel ? ' selected' : '') + '>#' + r.rank + ' ' + esc(r.name) + ' (' + esc(r.tk) + ')</option>'; }).join(''); }
    function paint() {
      LS.set('btd_cmp', pick.join(','));
      var cs = pick.map(function (t) { return by[t]; });
      box.innerHTML = '<div class="x-cmp-h"><h2>Company Compare</h2><p class="x-mu">Pick 2 or 3 treasury companies. Your picks are saved in this browser. Figures are dated and sourced; “—” means we could not verify it.</p></div>' +
        '<div class="x-cmp-s">' + [0, 1, 2].map(function (i) { return '<label><span>Company ' + (i + 1) + '</span><select data-cmp-i="' + i + '">' + opts(pick[i], i === 2) + '</select></label>'; }).join('') + '</div>' +
        '<div class="x-cmp-w"><table class="x-cmp"><thead><tr><th></th>' + cs.map(function (r) { return '<th>' + esc(r.name) + '<small>' + esc(r.tk) + '</small></th>'; }).join('') + '</tr></thead><tbody>' +
        M.map(function (m) { return '<tr><th>' + m[0] + '</th>' + cs.map(function (r) { var v = m[1](r); return '<td><b class="' + (/^[+−]/.test(v[0]) && /%$/.test(v[0]) ? (v[0][0] === '−' ? 'x-dn' : 'x-up') : '') + '">' + v[0] + '</b>' + (v[1] ? '<small>' + v[1] + '</small>' : '') + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div><p class="x-f">BTC held and mNAV: ' + esc(D.treasuries.src.name) + '; Strategy from strategy.com. Price performance: ' + esc(P ? P.source + ', as of ' + dly(P.as_of) : 'n/a') + '. BTC per share only where the company publishes its share count (Strategy ledger ADSO, Strive 8-K). <b>Education only, not investment advice.</b></p>';
      box.querySelectorAll('[data-cmp-i]').forEach(function (s) { s.addEventListener('change', function () { var i = +s.dataset.cmpI, v = s.value; var n = pick.slice(); if (v) { var j = n.indexOf(v); if (j >= 0 && j !== i) n[j] = pick[i]; n[i] = v; } else n.splice(i, 1); pick = n.filter(Boolean).slice(0, 3); if (pick.length < 2) return paint(); paint(); }); });
    }
    paint();
  }

  /* ---------- Spotlight (Strategy tab) ---------- */
  function spotlight(D, Q) {
    var p = (D.prefs_desk ? D.prefs_desk.rows : []).filter(function (x) { return x.t === 'STRC'; })[0], qq = Q && Q.items ? Q.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0] : null;
    return '<div class="x-spot">' + (p ? '<div class="x-k"><small>STRC (preferred)</small><b>' + p.rate.toFixed(2) + '%</b><small>' + esc(p.rate_kind) + ' rate · $' + p.close.toFixed(2) + ' close · ' + esc(p.pay) + '</small></div>' : '') +
      (qq ? '<blockquote>&ldquo;' + esc(qq.text.length > 220 ? qq.text.slice(0, 217) + '…' : qq.text) + '&rdquo;<cite>Michael Saylor · ' + esc(qq.date_label || qq.date) + (qq.url ? ' · <a href="' + esc(qq.url) + '" target="_blank" rel="noopener">source</a>' : '') + '</cite></blockquote>' : '') + '</div>';
  }

  Promise.all([J('/assets/data/desk.json'), O('/members/data/weekly.json'), O('/assets/data/btc_daily.json')]).then(function (r) {
    var D = r[0], W = r[1], B = r[2], K = D.strategy.kpis || {};
    var kb = $('[data-x-kpi]'); if (kb) kb.innerHTML = marketRow(D) + '<div class="x-kh"><span class="p-t">Strategy (MSTR) KPIs</span><span class="x-mu">source ' + SRC + (K.retrieved ? ' · retrieved ' + dl(K.retrieved) : '') + '</span><a class="more" href="/saylor/#strategy-kpis">Full Strategy KPIs &rarr;</a></div><div class="x-kg" data-x-kg>' + kpiTiles(D, false) + '</div><button type="button" class="x-more" data-x-more aria-expanded="false">More KPIs ▾</button>';
    if (kb) { kpiLive(kb, D); kpiSps(kb); var mb2 = $('[data-x-more]', kb); mb2.addEventListener('click', function () { var o = kb.classList.toggle('x-open'); mb2.setAttribute('aria-expanded', o ? 'true' : 'false'); mb2.textContent = o ? 'Fewer KPIs ▴' : 'More KPIs ▾'; }); }
    var wb = $('[data-x-wcw]'); if (wb) wcw(wb, D, W, B);
    var mb = $('[data-x-mnav]'); if (mb && B) Promise.all([J('/assets/data/strategy.json'), J('/members/data/stocks_daily.json')]).then(function (x) { mnavPanel(mb, D, x[0], x[1].series.MSTR, B); }).catch(function (e) { mb.innerHTML = '<p class="x-mu">mNAV history unavailable.</p>'; });
    if (cmp) Promise.all([O('/assets/data/perf.json'), O('/assets/data/strive.json')]).then(function (x) { compare(cmp, D, x[0], null, x[1]); });
    if (full) O('/assets/data/quotes.json').then(function (Q) {
      full.innerHTML = '<div class="xw"><div class="x-kh"><span class="x-t">Strategy (MSTR) KPIs</span><span class="x-mu">official figures from ' + SRC + ' (dashboard + <a href="https://www.strategy.com/purchases" target="_blank" rel="noopener">BTC ledger</a>) · retrieved ' + dl(K.retrieved || D.updated) + '</span></div><div class="x-kg x-kg-full">' + kpiTiles(D, true) + '</div>' + spotlight(D, Q) +
        '<p class="x-f">BTC Yield, BTC Gain and BTC $ Gain are Strategy’s own KPIs; see <a href="https://www.strategy.com/notes" target="_blank" rel="noopener">strategy.com/notes</a> for definitions. Negative values mean BTC per assumed diluted share is lower than on Dec 31. Refreshed each Sunday. Education only, not investment advice.</p></div>'; kpiLive(full, D); kpiSps(full); });
  }).catch(function (e) { console.warn('extras', e); });
})();
