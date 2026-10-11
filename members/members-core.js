/* BTC Treasury Desk Members: gate, tabs, data loading, shared chart helper, live badges, weekly box. */
(function () {
  'use strict';
  var CFG = window.BTD_MEMBERS || {}, B = window.BTDModels, DAY = 864e5;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LS = { get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
             set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  function usd(v, d) { if (v == null || !isFinite(v)) return '—'; var a = Math.abs(v);
    if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    return '$' + v.toLocaleString('en-US', { maximumFractionDigits: d == null ? (a < 10 ? 2 : 0) : d, minimumFractionDigits: d == null ? 0 : d }); }
  function pct(v, d) { return v == null || !isFinite(v) ? '—' : (v >= 0 ? '+' : '') + v.toFixed(d == null ? 1 : d) + '%'; }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function dlbl(t) { return new Date(t).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }); }
  function nyToday() { return Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T00:00:00Z'); }
  function json(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }

  /* ---------- gate ---------- */
  function isMember() { if (!CFG.EMAIL_GATE && !CFG.MEMBERS_GATE) return true; if (CFG.MEMBERS_GATE) return LS.get('btd_paid', null) === 1; try { return localStorage.getItem(CFG.STORAGE_KEY || 'btd_member') === '1'; } catch (e) { return false; } }
  function setMember(v) { try { v ? localStorage.setItem(CFG.STORAGE_KEY || 'btd_member', '1') : localStorage.removeItem(CFG.STORAGE_KEY || 'btd_member'); } catch (e) {}
    document.body.classList.toggle('member', isMember()); if (isMember()) { MEM.unlocked = true; show(cur, true); } }
  document.body.classList.toggle('paidgate', !!CFG.MEMBERS_GATE);
  var pl = $('[data-paid-link]'); if (pl && CFG.PAID_URL) pl.href = CFG.PAID_URL;
  var f = $('[data-unlock]');
  if (f) f.addEventListener('submit', function (ev) {
    ev.preventDefault(); var em = f.querySelector('input[type=email]'), msg = f.querySelector('.msg');
    if (!em.value || !em.checkValidity()) { msg.textContent = 'Please enter a valid email address.'; em.focus(); return; }
    var fd = new FormData(); fd.append('email_address', em.value); if (f.products_optin.checked) fd.append('products_optin', 'yes');
    msg.textContent = 'Unlocking…';
    fetch(CFG.KIT_FORM, { method: 'POST', body: fd, mode: 'no-cors' }).then(function () { setMember(true); window.scrollTo(0, 0); })
      .catch(function () { msg.textContent = 'Could not reach the signup service. Please try again.'; });
  });
  var rl = $('[data-relock]'); if (rl) rl.addEventListener('click', function () { setMember(false); });
  var gg = $('[data-goto-gate]'); if (gg) gg.addEventListener('click', function (e) { e.preventDefault(); var em = $('#m-email'); em.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { em.focus(); }, 400); });

  /* ---------- shared chart helper (canvas, time x-axis, log or linear y) ---------- */
  function chart(cv, o) {
    var dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 800, H = o.height || Math.max(220, Math.min(420, Math.round(W * (o.ratio || 0.42))));
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var t = o.t, n = t.length, pad = { l: o.padL || 50, r: 10, t: 10, b: 20 }, lg = !!o.log;
    var lo = Infinity, hi = -Infinity;
    o.series.forEach(function (s) { if (s.noScale) return; for (var i = 0; i < n; i++) { var v = s.a[i]; if (v == null || !isFinite(v) || (lg && v <= 0)) continue; if (v < lo) lo = v; if (v > hi) hi = v; } });
    (o.hlines || []).forEach(function (h) { if (h.v < lo) lo = h.v; if (h.v > hi) hi = h.v; });
    if (o.ymin != null) lo = o.ymin; if (o.ymax != null) hi = o.ymax; if (!(hi > lo)) { hi = lo + 1; }
    var f = function (v) { return lg ? Math.log10(v) : v; }, L = f(lo), Hh = f(hi), sp = (Hh - L) * 0.06; if (o.ymin == null) L -= sp; if (o.ymax == null) Hh += sp;
    var t0 = t[0], t1 = t[n - 1] + (o.tPadEnd || 0), X = function (x) { return pad.l + (W - pad.l - pad.r) * (x - t0) / ((t1 - t0) || 1); }, Y = function (v) { return pad.t + (H - pad.t - pad.b) * (1 - (f(v) - L) / ((Hh - L) || 1)); };
    // background bands
    if (o.bands) { for (var i = 0; i < n; i++) { var z = o.bands[i]; if (!z) continue; var j = i; while (j + 1 < n && o.bands[j + 1] === z) j++;
      g.fillStyle = z < 0 ? (o.coolCol || 'rgba(47,209,124,.16)') : (o.hotCol || 'rgba(255,90,95,.18)'); g.fillRect(X(t[i]), pad.t, Math.max(1, X(t[j]) - X(t[i])), H - pad.t - pad.b); i = j; } }
    // grid + y labels
    g.font = '10px ui-monospace,monospace'; g.lineWidth = 1; g.strokeStyle = '#161a20'; g.fillStyle = '#5d6672';
    var ticks = [];
    if (lg) { for (var e = Math.floor(L); e <= Math.ceil(Hh); e++) [1, 2, 5].forEach(function (m) { var v = m * Math.pow(10, e); if (f(v) >= L && f(v) <= Hh) ticks.push(v); }); if (ticks.length > 9) ticks = ticks.filter(function (v) { return /^1/.test(String(v)) || String(v).indexOf('e') > 0; }); }
    else { var step = Math.pow(10, Math.floor(Math.log10((Hh - L) / 4))), k = (Hh - L) / step; step *= k > 8 ? 2 : k < 3 ? 0.5 : 1; for (var v = Math.ceil(L / step) * step; v <= Hh; v += step) ticks.push(+v.toFixed(10)); }
    var yf = o.yfmt || function (v) { return v >= 1e6 ? '$' + v / 1e6 + 'M' : v >= 1e3 ? '$' + v / 1e3 + 'k' : '$' + v; };
    ticks.forEach(function (v) { var y = Y(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke(); g.fillText(yf(v), 3, y + 3); });
    var y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear(), ys = Math.max(1, Math.ceil((y1 - y0) / Math.max(2, Math.floor(W / 70))));
    for (var yy = y0 + 1; yy <= y1; yy += ys) { var xx = X(Date.UTC(yy, 0, 1)); g.fillText(String(yy), xx - 12, H - 5); g.beginPath(); g.moveTo(xx, pad.t); g.lineTo(xx, H - pad.b); g.stroke(); }
    if (y1 === y0 || y1 - y0 < 2) { g.fillText(iso(t0).slice(0, 7), pad.l, H - 5); g.fillText(iso(t1).slice(0, 7), W - pad.r - 44, H - 5); }
    (o.hlines || []).forEach(function (h) { var y = Y(h.v); g.strokeStyle = h.col || '#F7931A'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke(); g.setLineDash([]); if (h.label) { g.fillStyle = h.col || '#F7931A'; g.fillText(h.label, pad.l + 4, y - 3); } });
    var stepI = Math.max(1, Math.floor(n / (W * 1.5)));
    o.series.forEach(function (s) { g.beginPath(); g.strokeStyle = s.col; g.lineWidth = s.w || 1.2; g.setLineDash(s.dash || []); var st = false;
      for (var i = 0; i < n; i += (i + stepI < n ? stepI : 1)) { var v = s.a[i]; if (v == null || !isFinite(v) || (lg && v <= 0)) { st = false; continue; } var x = X(t[i]), y = Y(v); if (!st) { g.moveTo(x, y); st = true; } else g.lineTo(x, y); }
      g.stroke(); g.setLineDash([]); });
    (o.markers || []).forEach(function (m) { var x = X(t[m.i]), y = Y(m.v), s = m.size || 5; g.fillStyle = m.col; g.beginPath();
      if (m.up) { y += 7; g.moveTo(x, y - s); g.lineTo(x - s, y + s); g.lineTo(x + s, y + s); } else { y -= 7; g.moveTo(x, y + s); g.lineTo(x - s, y - s); g.lineTo(x + s, y - s); }
      g.closePath(); if (m.hollow) { g.strokeStyle = m.col; g.lineWidth = 1.3; g.stroke(); } else g.fill(); });
    if (o.dot !== false && o.series[0]) { var a0 = o.series[0].a, li = n - 1; while (li > 0 && a0[li] == null) li--; g.fillStyle = '#F7931A'; g.beginPath(); g.arc(X(t[li]), Y(a0[li]), 3, 0, 7); g.fill(); }
    // hover tooltip
    if (o.tip && o.tipFn) {
      cv.onmousemove = function (ev) { var r = cv.getBoundingClientRect(), mx = ev.clientX - r.left; var tt = t0 + (mx - pad.l) / (W - pad.l - pad.r) * (t1 - t0);
        var lo2 = 0, hi2 = n - 1; while (lo2 < hi2) { var m = (lo2 + hi2) >> 1; if (t[m] < tt) lo2 = m + 1; else hi2 = m; }
        if (lo2 > n - 1 || mx < pad.l) { o.tip.style.display = 'none'; return; }
        o.tip.innerHTML = o.tipFn(lo2); o.tip.style.display = 'block'; var tw = o.tip.offsetWidth; o.tip.style.left = Math.min(W - tw - 4, Math.max(0, mx + 12)) + 'px'; o.tip.style.top = (ev.clientY - r.top + 12) + 'px'; };
      cv.onmouseleave = function () { o.tip.style.display = 'none'; };
    }
  }

  /* ---------- tabs ---------- */
  var MEM = window.MEM = { $: $, $$: $$, esc: esc, LS: LS, usd: usd, pct: pct, iso: iso, dlbl: dlbl, chart: chart, tools: {}, weekly: [], unlocked: false, ready: false, DAY: DAY };
  MEM.unlocked = isMember(); document.body.classList.toggle('member', MEM.unlocked);
  var cur = (location.hash || '').replace('#', ''); if (!$('[data-pane="' + cur + '"]')) cur = 'zones';
  function show(name, force) {
    cur = name; $$('[data-tab]').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === name); b.setAttribute('aria-selected', b.dataset.tab === name); });
    $$('[data-pane]').forEach(function (p) { p.classList.toggle('on', p.dataset.pane === name); });
    var t = MEM.tools[name]; if (t && MEM.ready) { try { t.draw(force); } catch (e) { console.error('tool ' + name, e); } }
  }
  MEM.show = show;
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; show(b.dataset.tab); if (history.replaceState) history.replaceState(null, '', '#' + b.dataset.tab); });
  var NEW = CFG.NEW_TOOLS || []; $$('[data-tab]').forEach(function (b) { if (NEW.indexOf(b.dataset.tab) >= 0) b.insertAdjacentHTML('beforeend', '<span class="newb">NEW</span>'); });
  var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { show(cur, true); }, 200); });
  show(cur);

  /* ---------- data ---------- */
  function livePx() {
    return json('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd').then(function (p) { return p.bitcoin.usd; })
      .catch(function () { return json('https://api.coinbase.com/v2/prices/BTC-USD/spot').then(function (j) { return +j.data.amount; }); })
      .catch(function () { return null; });
  }
  var opt = function (p) { return p.catch(function (e) { console.warn('members data', e && e.message); return null; }); };
  Promise.all([json('/assets/data/btc_daily.json'), opt(json('/assets/data/desk.json')), livePx(), opt(json('/members/data/stocks_daily.json')),
               opt(json('/members/data/weekly.json')), opt(json('/assets/data/strategy.json')), opt(json('/assets/data/strive.json')), opt(json('/assets/data/quotes.json'))]).then(function (r) {
    var H = r[0], today = nyToday(), M = B.compute(H, r[2], today);
    MEM.H = H; MEM.M = M; MEM.desk = r[1]; MEM.live = r[2]; MEM.stocks = r[3]; MEM.wkData = r[4]; MEM.strategy = r[5]; MEM.strive = r[6];
    MEM.T = M.S.c.map(function (v, i) { return M.S.T(i); });
    MEM.W0 = {}; B.MODELS.forEach(function (m) { MEM.W0[m.k] = m.w; });
    MEM.comp = B.composite(M, MEM.W0); MEM.ep = B.episodes(MEM.comp);
    MEM.realized = r[1] && r[1].onchain ? r[1].onchain.realized_price : null;
    $('[data-asof]').textContent = 'BTC ' + usd(M.px) + (r[2] ? ' live' : ' (last close)') + ' · daily history to ' + H.as_of + (r[1] ? ' · desk data ' + r[1].updated : '');
    MEM.quotes = r[7]; badges(); try { spotlight(); } catch (e) { console.error('spotlight', e); } MEM.ready = true;
    Object.keys(MEM.tools).forEach(function (k) { var t = MEM.tools[k]; if (t.init) try { t.init(); } catch (e) { console.error('init ' + k, e); } });
    show(cur, true); weekly();
  }).catch(function (e) { console.error('Members data failed', e); $('[data-asof]').textContent = 'Live models unavailable right now. Please refresh in a minute.'; });

  /* ---------- Strategy Spotlight (strategy.com first; MSTR last close from the Sunday stock file) ---------- */
  function spotlight() {
    var D = MEM.desk, set = function (k, h) { var e = $('[data-sp="' + k + '"]'); if (e) e.innerHTML = h; };
    var st = MEM.stocks && MEM.stocks.series.MSTR; if (st) { var L = st.c.length - 1; set('mstr', usd(st.c[L], 2)); set('mstr-s', 'close ' + st.d[L] + (D ? ' · mNAV ' + D.strategy.mnav.toFixed(2) + 'x' : '')); }
    if (D) { var s = D.strategy, p = D.preferreds.filter(function (x) { return x.t === 'STRC'; })[0];
      if (p) { set('strc', p.rate.toFixed(2) + '%'); set('strc-s', 'rate · price $' + p.price.toFixed(2) + ' (' + p.price_as_of + ')'); }
      set('btc', s.btc_held.toLocaleString('en-US') + ' ₿'); set('btc-s', 'as of ' + s.btc_as_of + ' · ' + s.sats_per_share.toLocaleString('en-US') + ' sats/share'); }
    var S = MEM.strategy; if (S) { var rows = S.purchases.filter(function (x) { return x.adso_k; }), last = rows[rows.length - 1], yr = last.date.slice(0, 4), base = null;
      rows.forEach(function (x) { if (x.date < yr) base = x; }); if (base) { var sps = function (x) { return x.holdings / x.adso_k; }; set('yield', pct((sps(last) / sps(base) - 1) * 100)); set('yield-s', base.date + ' → ' + last.date + ' · from strategy.com ledger ADSO; official BTC Yield KPI may differ'); } }
    var Q = MEM.quotes; if (Q && Q.items && Q.items.length) { var q = Q.items.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      set('quote', '&ldquo;' + esc(q.text.length > 220 ? q.text.slice(0, 217) + '…' : q.text) + '&rdquo;<cite>Michael Saylor · ' + esc(q.date_label || q.date) + (q.url ? ' · <a href="' + esc(q.url) + '" target="_blank" rel="noopener">source</a>' : '') + '</cite>'); }
  }

  /* ---------- live badges (computed in the browser) ---------- */
  function stateAt(i) {
    var M = MEM.M, S = M.S, R = M.R;
    return { comp: B.band(MEM.comp[i]), pi: R.pi[i], wma: R.wma[i], may: R.may[i], mayP: M.P.may[i],
             cross: S.m50[i] != null && S.m200[i] != null ? (S.m50[i] > S.m200[i] ? 1 : -1) : null };
  }
  MEM.stateAt = stateAt;
  function badges() {
    var M = MEM.M, L = M.last, s = stateAt(L), out = [], ZL = B.ZL;
    out.push(['Composite: ' + ZL[s.comp][0].replace('Historically ', ''), s.comp < 0 ? 'g' : s.comp > 0 ? 'r' : 'a', '(' + MEM.comp[L].toFixed(2) + ')']);
    out.push(['Pi Cycle: ' + (s.pi >= 1 ? 'crossed' : s.pi > 0.9 ? 'nearing cross' : 'no cross'), s.pi >= 1 ? 'r' : s.pi > 0.9 ? 'a' : 'g', Math.round(s.pi * 100) + '%']);
    out.push([(s.wma >= 1 ? 'Above' : 'Below') + ' 200WMA', s.wma >= 1 ? 'g' : 'a', s.wma.toFixed(2) + 'x']);
    out.push(['Mayer ' + s.may.toFixed(2) + 'x ' + (s.mayP < 20 ? 'cool' : s.mayP > 80 ? 'hot' : 'mid'), s.mayP < 20 ? 'g' : s.mayP > 80 ? 'r' : 'a', '']);
    out.push([s.cross > 0 ? 'Golden cross active' : 'Death cross active', s.cross > 0 ? 'g' : 'r', '50D/200D']);
    if (MEM.realized) { var mv = M.px / MEM.realized; out.push(['MVRV ' + mv.toFixed(2) + 'x', mv < 1 ? 'g' : mv > 3 ? 'r' : 'a', 'realized ' + usd(MEM.realized)]); }
    var hv = Date.UTC(2024, 3, 20); out.push(['Halving cycle: day ' + Math.floor((nyToday() - hv) / DAY), 'o', '']);
    $('[data-badges]').innerHTML = out.map(function (b) { return '<span class="bdg ' + b[1] + '"><i></i>' + esc(b[0]) + (b[2] ? ' <small>' + esc(b[2]) + '</small>' : '') + '</span>'; }).join('');
  }

  /* ---------- "This week in the Members desk": editorial items (weekly.json, Sunday refresh) + auto week-over-week changes ---------- */
  function weekly() {
    var M = MEM.M, L = M.last, P = Math.max(0, L - 7), a = stateAt(P), b = stateAt(L), ZL = B.ZL, auto = [];
    var chg = MEM.M.S.c[L] / MEM.M.S.c[P] * 100 - 100;
    auto.push('BTC ' + pct(chg) + ' over 7 days. Composite ' + MEM.comp[P].toFixed(2) + ' → ' + MEM.comp[L].toFixed(2) + (a.comp !== b.comp ? ': moved from ' + ZL[a.comp][0] + ' to <b>' + ZL[b.comp][0] + '</b>.' : ' (still ' + ZL[b.comp][0].toLowerCase() + ').'));
    if (a.cross !== b.cross) auto.push('<b>' + (b.cross > 0 ? 'Golden cross' : 'Death cross') + '</b> this week (50D vs 200D).');
    if ((a.wma >= 1) !== (b.wma >= 1)) auto.push('BTC moved <b>' + (b.wma >= 1 ? 'above' : 'below') + '</b> the 200-week MA.');
    if ((a.pi > 0.9) !== (b.pi > 0.9)) auto.push('Pi Cycle is now <b>' + (b.pi > 0.9 ? 'nearing a cross' : 'away from a cross') + '</b>.');
    if (auto.length === 1) auto.push('No badge flips this week: Pi Cycle, 200-week MA and the 50/200 cross are unchanged.');
    var W = MEM.wkData, items = (W && W.items || []).map(function (x) { return (x.new ? '<span class="newb" style="margin:0 6px 0 0">NEW</span>' : '') + esc(x.t); });
    $('[data-wk-date]').textContent = W && W.week ? 'week of ' + W.week : 'auto';
    $('[data-wk-list]').innerHTML = items.concat(auto, MEM.weekly).map(function (x) { return '<li>' + x + '</li>'; }).join('');
  }
  MEM.refreshWeekly = function () { if (MEM.ready) weekly(); };
})();
