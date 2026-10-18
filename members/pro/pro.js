/* Pro Vault: renders members/data/pro.json. Every item is tier 'pro'; access goes through BTD_MEMBERS.canAccess('pro') (one switch: PRO_GATE). */
(function () {
  'use strict';
  var C = window.BTD_MEMBERS || {}, $ = function (q) { return document.querySelector(q); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ok() { return C.canAccess ? C.canAccess('pro') : true; }
  var NAMES = { zones: 'Signal Zones', builder: 'Model Builder', planner: 'Entry & Exit Planner', lab: 'Strategy Lab', freedom: 'Freedom Plan', momentum: 'Momentum & Trend', ta: 'TA Overlays', radar: 'mNAV Radar', yield: 'BTC Yield', clock: 'Cycle Clock', downloads: 'Downloads' };
  var DESC = { builder: 'Your own composite from the models, with weights and history.', planner: 'Write scale-in / scale-out rules from models and TA; live status + history.', lab: 'Test DCA vs zones vs lump sum against history.', momentum: 'Weekly / monthly / quarterly trend confluence for BTC, MSTR, ASST.', radar: 'mNAV vs BTC-per-share growth across treasury companies.' };
  var D = null;
  function gate() { var g = $('[data-pv-gate]'), body = $('[data-pv-body]'), open = ok(); $('[data-pv-state]').textContent = C.PRO_GATE ? 'Desk Pro' : 'Free during launch';
    body.hidden = !open; g.hidden = open; if (open) return;
    g.innerHTML = C.PRO_GATE ? '<section class="p gate1"><h2>The Pro Vault is part of Desk Pro</h2><p class="muted">Members videos, weekly treats and Pro tools.</p><a class="go" href="' + esc(C.PAID_URL || '/subscribe/') + '">See membership &rarr;</a></section>'
      : '<section class="p gate1"><h2>Open free to every email member during launch</h2><p class="muted">One email unlocks the Members desk and the Pro Vault in this browser. No password.</p><div class="optin optin-m" data-optin="members"></div></section>';
    if (window.BTD_OPTIN && window.BTD_OPTIN.paint) window.BTD_OPTIN.paint(); }
  function paint() { if (!D) return; $('[data-pv-week]').textContent = 'Week of ' + new Date(D.week + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    var v = (D.videos || []).filter(function (x) { return x.tier === 'pro'; });
    $('[data-pv-videos]').innerHTML = v.length ? '<div class="pv-g">' + v.map(function (x) { return '<a class="pv-c" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="pv-th" style="background-image:url(https://i.ytimg.com/vi/' + esc(x.id) + '/hqdefault.jpg)"></span><b>' + esc(x.title) + '</b><small>' + esc(x.date || '') + (x.mins ? ' · ' + x.mins + ' min' : '') + '</small><span>' + esc(x.desc || '') + '</span></a>'; }).join('') + '</div>'
      : '<p class="muted" style="margin:6px 0">The first Members video is in production. Planned:</p><ul class="pv-plan">' + (D.videos_planned || []).map(function (x) { return '<li>' + esc(x.title) + '</li>'; }).join('') + '</ul>';
    var t = (D.treats || []).filter(function (x) { return x.tier === 'pro'; }); $('[data-pv-tdate]').textContent = 'week of ' + D.week;
    $('[data-pv-treats]').innerHTML = t.map(function (x, i) { var k = { snapshot: 'Chart snapshot', sheet: 'Cheat sheet', preset: 'Preset' }[x.type] || x.type;
      if (x.type === 'snapshot') return '<a class="pv-c" href="' + esc(x.img) + '" target="_blank" rel="noopener"><span class="pv-k">' + k + ' · ' + esc(x.date) + '</span><img src="' + esc(x.img) + '" alt="' + esc(x.title) + '" loading="lazy"><b>' + esc(x.title) + '</b><span>' + esc(x.desc) + '</span></a>';
      if (x.type === 'sheet') return '<a class="pv-c" href="' + esc(x.href) + '" target="_blank" rel="noopener"><span class="pv-k">' + k + ' · PDF · ' + esc(x.date) + '</span><b>' + esc(x.title) + '</b><span>' + esc(x.desc) + '</span><span class="o">Download &darr;</span></a>';
      return '<div class="pv-c"><span class="pv-k">' + k + '</span><b>' + esc(x.title) + '</b><span>' + esc(x.desc) + '</span><button type="button" class="tbtn" data-pv-apply="' + i + '">Apply &amp; open &rarr;</button></div>'; }).join('');
    var pro = Object.keys(C.TOOLS || {}).filter(function (k) { return C.TOOLS[k] === 'pro'; });
    $('[data-pv-tools]').innerHTML = pro.map(function (k) { return '<a class="pv-c" href="/members/#' + k + '"><span class="pv-k">Pro tool</span><b>' + esc(NAMES[k] || k) + '</b><span>' + esc(DESC[k] || '') + '</span></a>'; }).join('') +
      (D.tools_soon || []).map(function (x) { return '<div class="pv-c pv-soon"><span class="pv-k">Coming soon</span><b>' + esc(x.title) + '</b><span>' + esc(x.desc) + '</span></div>'; }).join(''); }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-pv-apply]'); if (!b || !D) return; var x = D.treats[+b.dataset.pvApply]; if (!x || !x.apply) return;
    try { Object.keys(x.apply).forEach(function (k) { if (/^btd_[a-z0-9_]+$/.test(k)) localStorage.setItem(k, x.apply[k]); }); } catch (er) {} location.href = x.go || '/'; });
  document.addEventListener('btd:joined', function () { try { localStorage.setItem(C.STORAGE_KEY || 'btd_member', '1'); } catch (e) {} gate(); paint(); });
  gate();
  fetch('/members/data/pro.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { D = j; paint(); }).catch(function () { $('[data-pv-treats]').innerHTML = '<p class="muted">Vault unavailable right now.</p>'; });
})();
