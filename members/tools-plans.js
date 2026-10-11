/* Members tools: Entry & Exit Planner, Strategy Lab, Freedom Plan */
(function () {
  'use strict';
  var M_ = window.MEM, B = window.BTDModels, $ = M_.$, $$ = M_.$$, esc = M_.esc, usd = M_.usd, pct = M_.pct, DAY = 864e5;

  /* ---------- asset series (BTC from btc_daily, stocks from members/data/stocks_daily.json) ---------- */
  var cache = {};
  function smaArr(c, k) { var o = new Array(c.length), s = 0; for (var i = 0; i < c.length; i++) { s += c[i]; if (i >= k) s -= c[i - k]; o[i] = i >= k - 1 ? s / k : null; } return o; }
  function rsiArr(c, k) { var o = new Array(c.length).fill(null), g = 0, l = 0; for (var i = 1; i < c.length; i++) { var d = c[i] - c[i - 1], up = d > 0 ? d : 0, dn = d < 0 ? -d : 0;
    if (i <= k) { g += up; l += dn; if (i === k) { g /= k; l /= k; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } } else { g = (g * (k - 1) + up) / k; l = (l * (k - 1) + dn) / k; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } } return o; }
  function asset(sym) {
    if (cache[sym]) return cache[sym]; var M = M_.M, t, c;
    if (sym === 'BTC') { t = M_.T; c = M.S.c; }
    else { var s = M_.stocks && M_.stocks.series[sym]; if (!s) return null; t = s.d.map(function (d) { return Date.parse(d + 'T00:00:00Z'); }); c = s.c; }
    var bi = t.map(function (x) { return Math.max(0, Math.min(M.last, Math.round((x - M.S.t0) / DAY))); });
    return (cache[sym] = { sym: sym, t: t, c: c, bi: bi, rsi: rsiArr(c, 14), m50: smaArr(c, 50), m200: smaArr(c, 200), note: sym !== 'BTC' && M_.stocks.series[sym].note });
  }
  M_.asset = asset; M_.rsiArr = rsiArr; M_.smaArr = smaArr;
  function mnavOf(sym) { var d = M_.desk; if (!d || !d.treasuries) return null; var r = d.treasuries.rows.filter(function (x) { return x.tk === sym; })[0]; return r && r.mnav != null ? { v: r.mnav, src: r.mnav_src } : null; }

  /* ---------- 3. Entry & Exit Planner ---------- */
  var RT = {
    zone_cool: { g: 'lt', n: 'Composite in accumulation zone (historically cool)' }, zone_hot: { g: 'lt', n: 'Composite in caution zone (historically hot)' },
    wma_below: { g: 'lt', n: 'BTC below 200-week MA ×', v: 1 }, wma_above: { g: 'lt', n: 'BTC above 200-week MA ×', v: 2.5 },
    mayer_below: { g: 'lt', n: 'Mayer Multiple below', v: 0.8 }, mayer_above: { g: 'lt', n: 'Mayer Multiple above', v: 2.4 },
    mvrv_below: { g: 'lt', n: 'MVRV proxy below', v: 0.8 }, mvrv_above: { g: 'lt', n: 'MVRV proxy above', v: 2.5 },
    pi_near: { g: 'lt', n: 'Pi Cycle nearing cross (111D/2×350D ≥)', v: 0.9 }, pi_cross: { g: 'lt', n: 'Pi Cycle crossed' },
    price_below: { g: 'lt', n: 'Asset price at or below $', v: 60000 }, price_above: { g: 'lt', n: 'Asset price at or above $', v: 150000 },
    mnav_below: { g: 'lt', n: 'mNAV below (stocks, live only)', v: 1 }, mnav_above: { g: 'lt', n: 'mNAV above (stocks, live only)', v: 2.5 },
    rsi_d_below: { g: 'tm', n: 'Daily RSI(14) below', v: 35 }, rsi_d_above: { g: 'tm', n: 'Daily RSI(14) above', v: 70 },
    cross_golden: { g: 'tm', n: 'Daily 50D above 200D (golden cross)' }, cross_death: { g: 'tm', n: 'Daily 50D below 200D (death cross)' },
    near_support: { g: 'tm', n: 'Price within 5% above support $', v: 0 }, above_res: { g: 'tm', n: 'Price closed above resistance $', v: 0 }
  };
  function pre(asset, style) {
    var stk = asset !== 'BTC', R;
    if (style === 'hodl') R = { entry: [{ type: 'zone_cool', size: 50 }, { type: 'wma_below', v: 1, size: 50 }], exit: [], timing: [{ type: 'rsi_d_below', v: 35 }] };
    else if (style === 'macro') R = { entry: [{ type: 'zone_cool', size: 34 }, { type: 'mvrv_below', v: 1, size: 33 }, { type: 'wma_below', v: 1, size: 33 }], exit: [{ type: 'zone_hot', size: 34 }, { type: 'pi_cross', size: 33 }, { type: 'mvrv_above', v: 2.5, size: 33 }], timing: [{ type: 'rsi_d_below', v: 35 }, { type: 'rsi_d_above', v: 70 }] };
    else R = { entry: [{ type: 'zone_cool', size: 50 }, { type: 'mayer_below', v: 0.8, size: 50 }], exit: [{ type: 'zone_hot', size: 50 }, { type: 'pi_cross', size: 50 }], timing: [{ type: 'cross_golden' }] };
    if (stk) { R.entry.push({ type: 'mnav_below', v: 1, size: 0 }); if (style !== 'hodl') R.exit.push({ type: 'mnav_above', v: 2.5, size: 0 }); }
    return R;
  }
  var PK = 'btd_mem_plans', PS = M_.LS.get(PK, null);
  function newPlan(asset, style) { return { name: 'My plan', asset: asset || 'BTC', style: style || 'hybrid', core: 70, rules: pre(asset || 'BTC', style || 'hybrid') }; }
  if (!PS || !PS.cur) PS = { cur: newPlan(), plans: {} };
  var plan = PS.cur;
  function savePS() { M_.LS.set(PK, PS); }
  function clean(p) { // validate imported/saved plans
    if (!p || typeof p !== 'object') return null; var o = { name: String(p.name || 'Imported plan').slice(0, 40), asset: ['BTC', 'MSTR', 'ASST', 'MPJPY', 'XXI'].indexOf(p.asset) >= 0 ? p.asset : 'BTC',
      style: ['hodl', 'macro', 'hybrid'].indexOf(p.style) >= 0 ? p.style : 'hybrid', core: Math.max(0, Math.min(100, +p.core || 0)), rules: { entry: [], exit: [], timing: [] } };
    ['entry', 'exit', 'timing'].forEach(function (s) { (p.rules && p.rules[s] || []).slice(0, 12).forEach(function (r) { if (RT[r.type]) o.rules[s].push({ type: r.type, v: r.v != null && isFinite(+r.v) ? +r.v : RT[r.type].v, size: Math.max(0, Math.min(100, +r.size || 0)) }); }); });
    return o;
  }
  function evalRule(r, A, i) { // true / false / null (n/a)
    var M = M_.M, b = A.bi[i], px = A.c[i], R = M.R;
    switch (r.type) {
      case 'zone_cool': return B.band(M_.comp[b]) === -1; case 'zone_hot': return B.band(M_.comp[b]) === 1;
      case 'wma_below': return R.wma[b] == null ? null : R.wma[b] < r.v; case 'wma_above': return R.wma[b] == null ? null : R.wma[b] > r.v;
      case 'mayer_below': return R.may[b] == null ? null : R.may[b] < r.v; case 'mayer_above': return R.may[b] == null ? null : R.may[b] > r.v;
      case 'mvrv_below': return R.mvrv[b] == null ? null : R.mvrv[b] < r.v; case 'mvrv_above': return R.mvrv[b] == null ? null : R.mvrv[b] > r.v;
      case 'pi_near': return R.pi[b] == null ? null : R.pi[b] >= r.v; case 'pi_cross': return R.pi[b] == null ? null : R.pi[b] >= 1;
      case 'price_below': return px <= r.v; case 'price_above': return px >= r.v;
      case 'mnav_below': case 'mnav_above': if (i !== A.c.length - 1) return null; var m = mnavOf(A.sym); if (!m) return null; return r.type === 'mnav_below' ? m.v < r.v : m.v > r.v;
      case 'rsi_d_below': return A.rsi[i] == null ? null : A.rsi[i] < r.v; case 'rsi_d_above': return A.rsi[i] == null ? null : A.rsi[i] > r.v;
      case 'cross_golden': return A.m200[i] == null ? null : A.m50[i] > A.m200[i]; case 'cross_death': return A.m200[i] == null ? null : A.m50[i] < A.m200[i];
      case 'near_support': return r.v > 0 ? px >= r.v && px <= r.v * 1.05 : null; case 'above_res': return r.v > 0 ? px > r.v : null;
    } return null;
  }
  function valueOf(r, A, i) {
    var M = M_.M, b = A.bi[i], R = M.R, f2 = function (x) { return x == null ? '—' : x.toFixed(2) + 'x'; };
    switch (r.type) {
      case 'zone_cool': case 'zone_hot': return 'score ' + M_.comp[b].toFixed(2); case 'wma_below': case 'wma_above': return f2(R.wma[b]);
      case 'mayer_below': case 'mayer_above': return f2(R.may[b]); case 'mvrv_below': case 'mvrv_above': return f2(R.mvrv[b]);
      case 'pi_near': case 'pi_cross': return Math.round(R.pi[b] * 100) + '%'; case 'price_below': case 'price_above': case 'near_support': case 'above_res': return usd(A.c[i]);
      case 'mnav_below': case 'mnav_above': var m = mnavOf(A.sym); return m ? m.v.toFixed(2) + 'x · ' + m.src : 'no reliable mNAV';
      case 'rsi_d_below': case 'rsi_d_above': return A.rsi[i] == null ? '—' : A.rsi[i].toFixed(0);
      case 'cross_golden': case 'cross_death': return A.m200[i] == null ? '—' : (A.m50[i] > A.m200[i] ? 'golden' : 'death');
    } return '';
  }
  function ruleRows(side) {
    var g = side === 'timing' ? 'tm' : 'lt';
    return plan.rules[side].map(function (r, k) { var d = RT[r.type];
      var opts = Object.keys(RT).filter(function (t) { return RT[t].g === g && (plan.asset !== 'BTC' || t.indexOf('mnav') < 0); }).map(function (t) { return '<option value="' + t + '"' + (t === r.type ? ' selected' : '') + '>' + esc(RT[t].n) + '</option>'; }).join('');
      return '<div class="rule"><label class="fld">Condition<select data-r="' + side + '" data-k="' + k + '" data-rf="type">' + opts + '</select></label>' +
        (d.v != null ? '<label class="fld">Level<input type="number" step="any" value="' + r.v + '" data-r="' + side + '" data-k="' + k + '" data-rf="v"></label>' : '<span></span>') +
        (side !== 'timing' ? '<label class="fld">Step % <input type="number" min="0" max="100" step="5" value="' + (r.size || 0) + '" data-r="' + side + '" data-k="' + k + '" data-rf="size"></label>' : '<span></span>') +
        '<button type="button" data-rdel="' + side + '" data-k="' + k + '" aria-label="Remove">×</button></div>'; }).join('') || '<p class="p-f">No conditions yet.</p>';
  }
  var SN = { hodl: 'HODL: a permanent core. Entry conditions pace new money in; nothing is ever exited, so exit conditions are off.',
    macro: 'Macro: long-term entries and exits for the whole position, paced by your conditions. Step % = share of the position each condition moves.',
    hybrid: 'Hybrid: the core % is held permanently; exit steps only ever apply to the tactical sleeve.' };
  function form() {
    $('[data-p-asset]').value = plan.asset; $('[data-p-style]').value = plan.style; $('[data-p-core]').value = plan.core; $('[data-p-name]').value = plan.name;
    $('[data-p-corewrap]').style.display = plan.style === 'hybrid' ? '' : 'none'; $('[data-p-stylenote]').textContent = SN[plan.style];
    ['entry', 'exit', 'timing'].forEach(function (s) { $('[data-p-rules="' + s + '"]').innerHTML = ruleRows(s); });
    var hx = plan.style === 'hodl'; $('[data-p-rules="exit"]').style.display = hx ? 'none' : ''; $('[data-p-add="exit"]').style.display = hx ? 'none' : '';
    $('[data-p-exith]').textContent = hx ? 'Exit plan · off in HODL style' : 'Exit plan · long-term conditions' + (plan.style === 'hybrid' ? ' (tactical sleeve only)' : '');
    $('[data-p-saved]').innerHTML = Object.keys(PS.plans).map(function (n) { return '<button type="button" class="chip' + (n === plan.name ? ' on' : '') + '" data-pload="' + esc(n) + '">' + esc(n) + '<span class="x" data-pdel="' + esc(n) + '" title="Delete">×</span></button>'; }).join('') || '<span class="p-f">No saved plans yet.</span>';
  }
  function drawP() {
    var A = asset(plan.asset); savePS();
    if (!A) { $('[data-p-check]').innerHTML = '<li><span></span><span class="muted">No price history for ' + esc(plan.asset) + ' right now.</span><span></span></li>'; return; }
    var L = A.c.length - 1, sides = plan.style === 'hodl' ? ['entry', 'timing'] : ['entry', 'exit', 'timing'], met = { entry: [0, 0, 0], exit: [0, 0, 0], timing: [0, 0, 0] }, html = [];
    sides.forEach(function (s) { plan.rules[s].forEach(function (r) { var v = evalRule(r, A, L); met[s][1]++; if (v) { met[s][0]++; met[s][2] += r.size || 0; }
      html.push('<li><span class="st ' + (v ? 'y' : v === false ? '' : '') + '">' + (v ? '✓' : v === false ? '·' : '?') + '</span><span><b class="' + (s === 'entry' ? 'up' : s === 'exit' ? 'dn' : 'o') + '" style="font:700 10px var(--mono);text-transform:uppercase">' + (s === 'timing' ? 'timing' : s) + '</b> ' + esc(RT[r.type].n) + (RT[r.type].v != null ? ' ' + esc(r.v) : '') + (s !== 'timing' && r.size ? ' <small class="muted">step ' + r.size + '%</small>' : '') + '</span><small class="mono muted">' + esc(valueOf(r, A, L)) + (v == null ? ' · n/a' : '') + '</small></li>'); }); });
    $('[data-p-check]').innerHTML = html.join('') || '<li><span></span><span class="muted">Add a condition to start.</span><span></span></li>';
    $('[data-p-asset-l]').textContent = plan.asset + ' ' + usd(A.c[L]); $('[data-p-asof]').textContent = 'as of ' + M_.dlbl(A.t[L]);
    var sleeve = plan.style === 'hybrid' ? (100 - plan.core) : 100;
    var sum = [['Entry conditions met', met.entry[0] + ' / ' + met.entry[1], 'steps in play: ' + Math.min(100, met.entry[2]) + '%']];
    if (plan.style !== 'hodl') sum.push(['Exit conditions met', met.exit[0] + ' / ' + met.exit[1], 'steps in play: ' + Math.min(100, met.exit[2]) + '% of ' + (plan.style === 'hybrid' ? 'the ' + sleeve + '% sleeve' : 'position')]);
    sum.push(['Timing layer', met.timing[1] ? met.timing[0] + ' / ' + met.timing[1] : 'off', 'aid only']);
    $('[data-p-sum]').innerHTML = sum.map(function (s) { return '<div><small>' + s[0] + '</small><b>' + s[1] + '</b><small>' + s[2] + '</small></div>'; }).join('');
    // historical triggers (long-term conditions; first day true, then at most once per 90 days per condition)
    var mk = [], cnt = { entry: 0, exit: 0 };
    sides.filter(function (s) { return s !== 'timing'; }).forEach(function (s) { plan.rules[s].forEach(function (r) { if (r.type.indexOf('mnav') === 0) return; var prev = false, lastT = -1e15;
      for (var i = 0; i < A.c.length; i++) { var v = evalRule(r, A, i); if (v && !prev && A.t[i] - lastT >= 90 * DAY) { mk.push({ i: i, v: A.c[i], col: s === 'entry' ? '#2fd17c' : '#ff5a5f', up: s === 'entry', size: 4 }); cnt[s]++; lastT = A.t[i]; } prev = !!v; } }); });
    var zb = A.bi.map(function (b) { return M_.ep.zone[b]; });
    M_.chart($('[data-p-cv]'), { t: A.t, log: true, ratio: 0.36, bands: zb, coolCol: 'rgba(47,209,124,.10)', hotCol: 'rgba(255,90,95,.10)', series: [{ a: A.c, col: '#e6e9ee', w: 1.1 }], markers: mk,
      yfmt: plan.asset === 'BTC' ? null : function (v) { return '$' + (v >= 1000 ? v / 1000 + 'k' : v); },
      tip: $('[data-p-tip]'), tipFn: function (i) { return M_.dlbl(A.t[i]) + ' · ' + usd(A.c[i]); } });
    $('[data-p-note]').textContent = 'History: ' + cnt.entry + ' entry-step and ' + cnt.exit + ' exit-step triggers since ' + M_.dlbl(A.t[0]) + '. Markers show the first day a condition became true, then at most once per 90 days per condition. mNAV conditions are checked live only (no verified mNAV history here); timing checks are not plotted.' + (A.note ? ' Note: ' + A.note : '');
  }
  M_.tools.planner = { init: function () {
    var root = $('[data-pane="planner"]'); form();
    root.addEventListener('change', function (e) { var t = e.target;
      if (t.dataset.r) { var r = plan.rules[t.dataset.r][+t.dataset.k]; if (t.dataset.rf === 'type') { r.type = t.value; r.v = RT[t.value].v; form(); } else r[t.dataset.rf] = +t.value; drawP(); return; }
      if (t.matches('[data-p-asset]')) { var keep = plan.asset; plan.asset = t.value; if ((keep === 'BTC') !== (t.value === 'BTC')) plan.rules = pre(t.value, plan.style); form(); drawP(); }
      else if (t.matches('[data-p-style]')) { plan.style = t.value; plan.rules = pre(plan.asset, plan.style); form(); drawP(); }
      else if (t.matches('[data-p-core]')) { plan.core = Math.max(0, Math.min(100, +t.value || 0)); drawP(); }
      else if (t.matches('[data-p-name]')) { plan.name = (t.value || '').trim().slice(0, 40) || 'My plan'; savePS(); }
      else if (t.matches('[data-p-import]') && t.files[0]) { var fr = new FileReader(); fr.onload = function () { try { var d = JSON.parse(fr.result), list = d.plans ? Object.keys(d.plans).map(function (k) { return d.plans[k]; }) : [d], n = 0;
          list.forEach(function (p) { var c = clean(p); if (c) { PS.plans[c.name] = c; plan = PS.cur = JSON.parse(JSON.stringify(c)); n++; } }); savePS(); form(); drawP(); alert(n + ' plan(s) imported.'); } catch (er) { alert('That file is not a valid plan export.'); } t.value = ''; }; fr.readAsText(t.files[0]); }
    });
    root.addEventListener('click', function (e) { var t = e.target;
      if (t.dataset.pdel) { delete PS.plans[t.dataset.pdel]; savePS(); form(); e.stopPropagation(); return; }
      var pl = t.closest('[data-pload]'); if (pl) { plan = PS.cur = clean(PS.plans[pl.dataset.pload]); form(); drawP(); return; }
      if (t.dataset.padd || t.dataset.pAdd) {}
      if (t.hasAttribute('data-p-add')) { var s = t.getAttribute('data-p-add'); plan.rules[s].push(s === 'timing' ? { type: 'rsi_d_below', v: 35 } : s === 'entry' ? { type: 'zone_cool', size: 25 } : { type: 'zone_hot', size: 25 }); form(); drawP(); }
      else if (t.dataset.rdel) { plan.rules[t.dataset.rdel].splice(+t.dataset.k, 1); form(); drawP(); }
      else if (t.hasAttribute('data-p-save')) { plan.name = ($('[data-p-name]').value || '').trim().slice(0, 40) || 'My plan'; PS.plans[plan.name] = JSON.parse(JSON.stringify(plan)); savePS(); form(); }
      else if (t.hasAttribute('data-p-new')) { plan = PS.cur = newPlan(plan.asset, plan.style); plan.name = 'Plan ' + (Object.keys(PS.plans).length + 1); form(); drawP(); }
      else if (t.hasAttribute('data-p-export')) { var all = { app: 'BTC Treasury Desk entry & exit plans', v: 1, exported: new Date().toISOString(), plans: Object.keys(PS.plans).length ? PS.plans : { cur: plan } };
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })); a.download = 'btd-plans.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
    });
  }, draw: function () { drawP(); } };

  /* ---------- 4. Strategy Lab ---------- */
  var LK = 'btd_mem_lab', ls = M_.LS.get(LK, { asset: 'BTC', start: '2020-01-01', amt: 500, style: 'hodl', cool: 2, hot: 0.25, trim: 25, core: 70 });
  function sim(A, i0, amtFn, opt) { // returns {inv, units, cash, val[], dd}
    var units = 0, core = 0, cash = 0, inv = 0, val = new Array(A.c.length).fill(null), lastM = -1, peak = 0, dd = 0, prevZ = 0;
    for (var i = i0; i < A.c.length; i++) { var px = A.c[i], d = new Date(A.t[i]), mo = d.getUTCFullYear() * 12 + d.getUTCMonth(), z = M_.ep.zone[A.bi[i]];
      if (opt.lump && i === i0) { units += opt.lump / px; inv += opt.lump; }
      if (!opt.lump && mo !== lastM) { lastM = mo; var a = amtFn(z); inv += a;
        if (opt.core != null) { core += a * opt.core / px; units += a * (1 - opt.core) / px; } else units += a / px;
        if (opt.trim && z === -1 && cash > 0) { var dep = Math.min(cash, Math.max(cash / 6, 0)); cash -= dep; units += dep / px; } }
      if (opt.trim && z === 1 && prevZ !== 1 && units > 0) { var s = units * opt.trim; units -= s; cash += s * px; }
      prevZ = z; var v = (units + core) * px + cash; val[i] = v; if (v > peak) peak = v; if (peak > 0) dd = Math.min(dd, v / peak - 1); }
    return { inv: inv, units: units + core, cash: cash, val: val, dd: dd, fin: val[A.c.length - 1] };
  }
  function drawL() {
    M_.LS.set(LK, ls); var A = asset(ls.asset); if (!A) return;
    var st = Date.parse(ls.start + 'T00:00:00Z'), i0 = 0; while (i0 < A.c.length - 1 && A.t[i0] < st) i0++;
    var mult = function (z) { return z === -1 ? ls.cool : z === 1 ? ls.hot : 1; };
    var dca = sim(A, i0, function () { return ls.amt; }, {}), zd = sim(A, i0, function (z) { return ls.amt * mult(z); }, {}), lump = sim(A, i0, null, { lump: dca.inv });
    var rows = [['DCA (fixed monthly)', dca, '#e6e9ee'], ['Zone-weighted DCA' + (ls.style === 'hodl' ? ' · your HODL style' : ''), zd, '#F7931A'], ['Lump sum (same total, day one)', lump, '#7aa7ff']];
    if (ls.style === 'macro') rows.push(['Your style · Macro (zones + ' + ls.trim + '% trim in hot)', sim(A, i0, function (z) { return ls.amt * mult(z); }, { trim: ls.trim / 100 }), '#2fd17c']);
    if (ls.style === 'hybrid') rows.push(['Your style · Hybrid (' + ls.core + '% core + sleeve)', sim(A, i0, function (z) { return ls.amt * mult(z); }, { trim: ls.trim / 100, core: ls.core / 100 }), '#2fd17c']);
    var u = ls.asset === 'BTC' ? function (x) { return x.toFixed(4) + ' BTC'; } : function (x) { return x.toFixed(1) + ' sh'; };
    $('[data-l-tbl] tbody').innerHTML = rows.map(function (r) { var s = r[1]; return '<tr><td><span style="color:' + r[2] + '">■</span> ' + esc(r[0]) + '</td><td class="r">' + usd(s.inv) + '</td><td class="r">' + usd(s.fin) + '</td><td class="r">' + u(s.units) + '</td><td class="r">' + (s.cash ? usd(s.cash) : '—') + '</td><td class="r ' + (s.fin >= s.inv ? 'up' : 'dn') + '">' + (s.fin / s.inv).toFixed(2) + 'x</td><td class="r dn">' + pct(s.dd * 100, 0) + '</td></tr>'; }).join('');
    var t = A.t.slice(i0); M_.chart($('[data-l-cv]'), { t: t, log: true, ratio: 0.36, series: rows.map(function (r) { return { a: r[1].val.slice(i0), col: r[2], w: 1.2 }; }), dot: false,
      tip: $('[data-l-tip]'), tipFn: function (k) { return M_.dlbl(t[k]) + '<br>' + rows.map(function (r) { return '<span style="color:' + r[2] + '">■</span> ' + usd(r[1].val[i0 + k]); }).join('<br>'); } });
    $('[data-l-legend]').innerHTML = rows.map(function (r) { return '<span style="--c:' + r[2] + '">' + esc(r[0]) + '</span>'; }).join('');
    $('[data-l-range]').textContent = ls.asset + ' · ' + M_.dlbl(A.t[i0]) + ' to ' + M_.dlbl(A.t[A.c.length - 1]);
    $('[data-l-macro]').style.display = ls.style === 'hodl' ? 'none' : '';
    $('[data-l-note]').textContent = { hodl: 'HODL: zone-weighted buying pace (more in cool zones, less in hot), never trims.', macro: 'Macro: zone-weighted DCA; trims the % you set the day the composite enters the caution zone, then re-deploys that cash over about 6 months of accumulation zone.', hybrid: 'Hybrid: the core % of each contribution is held forever; the sleeve follows the Macro rules.' }[ls.style] + (A.note ? ' ' + A.note : '');
  }
  M_.tools.lab = { init: function () {
    var root = $('[data-pane="lab"]');
    $('[data-l-asset]').value = ls.asset; $('[data-l-start]').value = ls.start; $('[data-l-amt]').value = ls.amt; $('[data-l-cool]').value = ls.cool; $('[data-l-hot]').value = ls.hot; $('[data-l-trim]').value = ls.trim; $('[data-l-core]').value = ls.core;
    $$('[data-l-style] .chip').forEach(function (c) { c.classList.toggle('on', c.dataset.v === ls.style); });
    root.addEventListener('change', function (e) { var t = e.target, num = function (v, d) { v = +v; return isFinite(v) ? v : d; };
      if (t.matches('[data-l-asset]')) ls.asset = t.value; else if (t.matches('[data-l-start]')) ls.start = t.value || '2020-01-01'; else if (t.matches('[data-l-amt]')) ls.amt = Math.max(1, num(t.value, 500));
      else if (t.matches('[data-l-cool]')) ls.cool = Math.max(0, num(t.value, 2)); else if (t.matches('[data-l-hot]')) ls.hot = Math.max(0, num(t.value, .25)); else if (t.matches('[data-l-trim]')) ls.trim = Math.max(0, Math.min(100, num(t.value, 25))); else if (t.matches('[data-l-core]')) ls.core = Math.max(0, Math.min(100, num(t.value, 70)));
      drawL(); });
    root.addEventListener('click', function (e) { var c = e.target.closest('[data-l-style] .chip'); if (!c) return; ls.style = c.dataset.v; $$('[data-l-style] .chip').forEach(function (x) { x.classList.toggle('on', x === c); }); drawL(); });
  }, draw: function () { drawL(); } };

  /* ---------- Freedom Plan (long-term exit planner) ---------- */
  var FK = 'btd_mem_freedom', FD = { btc: 0.5, mstr: 20, asst: 100, pref: 5000, pyield: 12, monthly: 500, mixbtc: 50, mixstk: 25, mixpref: 25, target: 1000000, tyear: 2040, expenses: 4000, bear: 8, base: 20, bull: 35, plaw: true };
  var fs = Object.assign({}, FD, M_.LS.get(FK, {}));
  function lastPx(sym) { var A = asset(sym); return A ? A.c[A.c.length - 1] : 0; }
  function drawF() {
    M_.LS.set(FK, fs); var M = M_.M, p0 = M.px, now = Date.now(), pM = lastPx('MSTR'), pA = lastPx('ASST');
    var mix = [fs.mixbtc, fs.mixstk, fs.mixpref].map(function (x) { return Math.max(0, +x || 0); }), ms = mix[0] + mix[1] + mix[2] || 1;
    var stk0 = fs.mstr * pM + fs.asst * pA, val0 = fs.btc * p0 + stk0 + fs.pref;
    var ratio0 = p0 / B.plaw(now), endY = Math.min(2075, Math.max(+fs.tyear || 2040, 2030) + 8), months = (endY - new Date().getUTCFullYear()) * 12;
    var SC = [['Bear', fs.bear, '#ff5a5f'], ['Base', fs.base, '#e6e9ee'], ['Bull', fs.bull, '#2fd17c']]; if (fs.plaw) SC.push(['Power Law path', null, '#F7931A']);
    var tArr = [], out = SC.map(function (s) {
      var btc = fs.btc, stkBtcEq = stk0 / p0, pref = fs.pref, y = (+fs.pyield || 0) / 100, val = [], goal = null, inc = null, atT = null, incT = null;
      for (var m = 0; m <= months; m++) { var t = now + m * 30.4375 * DAY, px = s[1] == null ? B.plaw(t) * ratio0 : p0 * Math.pow(1 + s[1] / 100, m / 12), yr = new Date(t).getUTCFullYear();
        if (m > 0) { var c = +fs.monthly || 0; btc += c * mix[0] / ms / px; stkBtcEq += c * mix[1] / ms / px; pref += c * mix[2] / ms + (yr <= fs.tyear ? pref * y / 12 : 0); }
        var v = (btc + stkBtcEq) * px + pref; val.push(v); if (out === undefined && s === SC[0]) {}
        if (goal == null && v >= fs.target) goal = t; if (inc == null && pref * y / 12 >= fs.expenses) inc = t; if (atT == null && yr >= fs.tyear) { atT = v; incT = pref * y / 12; } if (s === SC[0]) tArr.push(t); }
      return { n: s[0], col: s[2], val: val, goal: goal, inc: inc, atT: atT, incT: incT };
    });
    var yl = function (t) { return t == null ? 'not by ' + endY : new Date(t).getUTCFullYear() + (t <= now + 31 * DAY ? ' (already)' : ''); };
    $('[data-f-tbl] tbody').innerHTML = out.map(function (o) { return '<tr><td><span style="color:' + o.col + '">■</span> ' + esc(o.n) + '</td><td class="r">' + yl(o.goal) + '</td><td class="r">' + usd(o.atT) + '</td><td class="r">' + usd(o.incT) + '</td><td class="r">' + yl(o.inc) + '</td></tr>'; }).join('');
    M_.chart($('[data-f-cv]'), { t: tArr, log: true, ratio: 0.38, series: out.map(function (o) { return { a: o.val, col: o.col, w: 1.3 }; }), hlines: [{ v: Math.max(1, fs.target), col: '#F7931A', label: 'target ' + usd(fs.target) }], dot: false,
      tip: $('[data-f-tip]'), tipFn: function (k) { return new Date(tArr[k]).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + '<br>' + out.map(function (o) { return '<span style="color:' + o.col + '">■</span> ' + esc(o.n) + ' ' + usd(o.val[k]); }).join('<br>'); } });
    $('[data-f-legend]').innerHTML = out.map(function (o) { return '<span style="--c:' + o.col + '">' + esc(o.n) + (o.n === 'Power Law path' ? ' (today\'s distance to trend held)' : '') + '</span>'; }).join('');
    $('[data-f-asof]').textContent = 'BTC ' + usd(p0) + ' · MSTR ' + usd(pM, 2) + ' · ASST ' + usd(pA, 2);
    $('[data-f-now]').innerHTML = [['Portfolio today', usd(val0)], ['Preferred income today', usd(fs.pref * fs.pyield / 1200) + '/mo'], ['Expenses covered today', Math.round(100 * fs.pref * fs.pyield / 1200 / Math.max(1, fs.expenses)) + '%']]
      .map(function (s) { return '<div><small>' + s[0] + '</small><b>' + s[1] + '</b></div>'; }).join('');
  }
  M_.tools.freedom = { init: function () {
    $$('[data-f]').forEach(function (el) { var k = el.dataset.f; if (el.type === 'checkbox') el.checked = !!fs[k]; else el.value = fs[k]; });
    $('[data-pane="freedom"]').addEventListener('change', function (e) { var el = e.target, k = el.dataset.f; if (!k) return; fs[k] = el.type === 'checkbox' ? el.checked : (isFinite(+el.value) ? +el.value : FD[k]); drawF(); });
  }, draw: function () { drawF(); } };
})();
