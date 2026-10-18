/* BTC Treasury Desk: Customize desk. Show/hide and reorder home sections (saved in localStorage 'btd_layout'), Reset, and Export/Import of
   all desk settings (layout, tiles, price scroll, chart choices) as a code or JSON file, so a layout can move to another device without an account. */
(function () {
  'use strict';
  var main = document.querySelector('main.grid'); if (!main) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SECS = [ // default order: intraday first screen, then the weekly / research shelf
    ['mk', 'Markets board (BTC desk + TradFi)', '.p-mk'], ['live', 'Live chart (BTC / MSTR / top 50, compare)', '.p-live'], ['my', 'My Watchlist (your picks)', '.p-my'], ['wl', 'Treasury companies window + preferreds', '.p-wl'], ['cx', 'Crypto market (dominance, alts, stablecoins, sentiment)', '.p-cx'], ['tok', 'Tokenized stocks (24/7)', '.p-tok'], ['wall', 'Live Wall (BTC + your 4 picks)', '.p-wall'],
    ['slowh', 'Divider: This week & research', '[data-slow-h]'], ['ep', 'Latest episode + Video of the Week', '.p-ep'], ['yb', 'Your Bitcoin + Pro tools', '.p-yb'], ['kpi', 'Strategy (MSTR) KPIs', '.p-kpi'], ['board', 'Treasury Board (holdings, weekly)', '.p-tboard'], ['charts', 'Long-term charts: models, TA, chart library', '.p-charts'], ['movers', 'Movers & Makers (weekly)', '.p-movers'], ['week', 'Coming up (calendar)', '.p-week'], ['wcw', 'What changed this week', '.p-wcw'], ['news', 'News of the Week', '.p-news'], ['optin', 'Weekly email box', '.p-optin'], ['links', 'Research desk links', '.p-links']
  ];
  var DEFHID = ['wcw']; // default-hidden (addable in Customize): old TradingView chart (superseded), mNAV card (mNAV is in the KPI row + Charts), What changed (covered by Movers + News)
  var NAME = {}, EL = {}, DEF = [];
  SECS.forEach(function (s) { var el = $(s[2], main); if (!el || el.parentNode !== main) return; el.setAttribute('data-sec', s[0]); EL[s[0]] = el; NAME[s[0]] = s[1]; DEF.push(s[0]); });
  var cap = $('[data-strip-cap]', main), tail = document.createComment('end of sections'); main.appendChild(tail);
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del: function (k) { try { localStorage.removeItem(k); } catch (e) {} } };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() { var o = null; try { o = JSON.parse(LS.get('btd_layout') || 'null'); } catch (e) {} var order = [], hidden = [];
    if (o && Array.isArray(o.order)) o.order.forEach(function (k) { if (EL[k] && order.indexOf(k) < 0) order.push(k); });
    DEF.forEach(function (k, i) { if (order.indexOf(k) < 0) { var at = 0; for (var j = i - 1; j >= 0; j--) { var p = order.indexOf(DEF[j]); if (p >= 0) { at = p + 1; break; } } order.splice(at, 0, k); } }); // new sections land near their default spot
    if (o && Array.isArray(o.hidden)) o.hidden.forEach(function (k) { if (EL[k] && hidden.indexOf(k) < 0) hidden.push(k); });
    if (!o) hidden = DEFHID.filter(function (k) { return EL[k]; }); else if (!Array.isArray(o.hidden)) hidden = DEFHID.slice();
    return { order: order, hidden: hidden }; }
  var L = load();
  function isDef() { return L.order.join() === DEF.join() && L.hidden.slice().sort().join() === DEFHID.filter(function (k) { return EL[k]; }).sort().join(); }
  function save() { if (isDef()) LS.del('btd_layout'); else LS.set('btd_layout', JSON.stringify({ v: 1, order: L.order, hidden: L.hidden })); }
  function apply() {
    L.order.forEach(function (k) { main.insertBefore(EL[k], tail); });
    DEF.forEach(function (k) { var h = L.hidden.indexOf(k) >= 0; EL[k].classList.toggle('sec-off', h); });
    main.classList.toggle('lay-custom', !isDef());
    window.dispatchEvent(new Event('resize')); // canvases re-measure after moving
  }
  apply();

  /* settings that travel with Export / Import (never membership or email state) */
  var KEYS = ['btd_layout', 'btd_live', 'btd_music', 'btd_strip2', 'btd_tk2', 'btd_tk3', 'btd_cco', 'btd_ticker', 'btd_ctab', 'btd_cper', 'btd_mnav_p', 'btd_pmode', 'btd_pper', 'btd_cview', 'btd_cgrid', 'btd_news_open', 'btd_cmp', 'btd_mchart', 'btd_rtw', 'btd_tb', 'btd_mem_builder', 'btd_mem_plans', 'btd_mem_lab', 'btd_mem_freedom', 'btd_mk', 'btd_tw', 'btd_wlt', 'btd_wlp', 'btd_lc', 'btd_wall', 'btd_wallr', 'btd_yb', 'btd_ybp'];
  function snapshot() { var o = { app: 'btctreasurydesk', v: 1, saved: new Date().toISOString().slice(0, 10), s: {} }; KEYS.forEach(function (k) { var v = LS.get(k); if (v != null) o.s[k] = v; }); return o; }
  function toCode(o) { return 'BTD1-' + btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
  function parse(txt) { txt = String(txt || '').trim(); var o;
    try { o = /^BTD1-/.test(txt) ? JSON.parse(decodeURIComponent(escape(atob(txt.slice(5).replace(/\s+/g, ''))))) : JSON.parse(txt); } catch (e) { return null; }
    if (!o || o.app !== 'btctreasurydesk' || typeof o.s !== 'object') return null; var out = {}, n = 0;
    Object.keys(o.s).forEach(function (k) { var v = o.s[k]; if (KEYS.indexOf(k) >= 0 && typeof v === 'string' && v.length <= 50000) { out[k] = v; n++; } }); return n ? out : null; }
  function importNow(txt, msg) { var s = parse(txt); if (!s) { msg.textContent = 'That code or file isn’t a BTC Treasury Desk settings export.'; return; }
    KEYS.forEach(function (k) { if (k in s) LS.set(k, s[k]); }); msg.textContent = 'Imported ' + Object.keys(s).length + ' settings. Reloading…'; setTimeout(function () { location.reload(); }, 600); }

  var pnl = null, opener = null;
  /* Preset layouts: one tap sets order + visibility (still fully editable afterwards). Full Desk = the default. */
  var PRESETS = [['full', 'Full Desk', null, null],
    ['trader', 'Trader', ['mk', 'live', 'wl', 'tok', 'wall', 'cx', 'slowh', 'charts', 'board'], ['kpi', 'movers', 'week', 'news', 'ep', 'optin', 'links', 'yb']],
    ['strategy', 'Strategy focus', ['mk', 'live', 'wl', 'slowh', 'kpi', 'charts', 'news', 'week', 'board', 'movers', 'ep'], ['tok', 'cx', 'wall', 'links']],
    ['minimal', 'Minimal', ['mk', 'live', 'wl'], 'rest']];
  function preset(id) { var P = PRESETS.filter(function (x) { return x[0] === id; })[0]; if (!P || !P[2]) return { order: DEF.slice(), hidden: DEFHID.filter(function (k) { return EL[k]; }) };
    var order = P[2].filter(function (k) { return EL[k]; }); DEF.forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
    var hidden = P[3] === 'rest' ? DEF.filter(function (k) { return P[2].indexOf(k) < 0; }) : P[3].filter(function (k) { return EL[k]; }); return { order: order, hidden: hidden }; }
  function same(a, b) { return a.order.join() === b.order.join() && a.hidden.slice().sort().join() === b.hidden.slice().sort().join(); }
  function activePreset() { for (var i = 0; i < PRESETS.length; i++) if (same(L, preset(PRESETS[i][0]))) return PRESETS[i][0]; return null; }
  function presetChips() { var a = activePreset(); return PRESETS.map(function (P) { return '<button type="button" class="chip' + (P[0] === a ? ' on' : '') + '" data-cz-preset="' + P[0] + '" aria-pressed="' + (P[0] === a) + '">' + P[1] + '</button>'; }).join('') + (a ? '' : '<span class="cz-st">Custom</span>'); }
  function rows() { return L.order.map(function (k, i) { var off = L.hidden.indexOf(k) >= 0;
    return '<li' + (off ? ' class="off"' : '') + '><label><input type="checkbox" data-cz-show="' + k + '"' + (off ? '' : ' checked') + '> <span>' + esc(NAME[k]) + '</span></label>' +
      '<button type="button" data-cz-up="' + i + '"' + (i ? '' : ' disabled') + ' aria-label="Move ' + esc(NAME[k]) + ' up">&#9650;</button><button type="button" data-cz-dn="' + i + '"' + (i < L.order.length - 1 ? '' : ' disabled') + ' aria-label="Move ' + esc(NAME[k]) + ' down">&#9660;</button></li>'; }).join(''); }
  function paint(focusSel) { $('[data-cz-list]', pnl).innerHTML = rows(); $('[data-cz-presets]', pnl).innerHTML = presetChips(); $('[data-cz-state]', pnl).textContent = isDef() ? 'Default layout' : 'Your layout · saved in this browser'; if (focusSel) { var f = $(focusSel, pnl); if (f && !f.disabled) f.focus(); } }
  function close() { if (!pnl) return; pnl.remove(); pnl = null; document.body.classList.remove('cz-open'); if (opener) opener.focus(); }
  function open(btn) {
    close(); opener = btn; pnl = document.createElement('div'); pnl.className = 'cz'; pnl.setAttribute('role', 'dialog'); pnl.setAttribute('aria-modal', 'true'); pnl.setAttribute('aria-label', 'Customize desk');
    pnl.innerHTML = '<div class="cz-box"><div class="cz-h"><b>Customize desk</b><span class="cz-st" data-cz-state></span><button type="button" class="cz-x" data-cz-close aria-label="Close">&times;</button></div>' +
      '<p class="cz-s">Show or hide sections and move them up or down. Saved in this browser. The markets board, the treasury-companies window and the price scroll each have their own ✎ Customize.</p>' +
      '<p class="cz-s"><b>Layouts</b> · one tap, then fine-tune below</p><div class="cz-pre" data-cz-presets role="group" aria-label="Preset layouts"></div>' +
      '<ol class="cz-l" data-cz-list></ol>' +
      '<div class="cz-f"><button type="button" class="chip" data-cz-reset>Reset to default</button><button type="button" class="chip" data-cz-exp aria-expanded="false">Export settings</button><button type="button" class="chip" data-cz-imp aria-expanded="false">Import settings</button><button type="button" class="chip on" data-cz-close>Done</button></div>' +
      '<div class="cz-io" data-cz-expbox hidden><p class="cz-s">Your layout, tiles, price scroll and chart choices. Copy the code (or download the file) and import it on another device. No account needed; nothing leaves your browser.</p>' +
      '<textarea class="cz-ta" data-cz-code readonly rows="3" aria-label="Settings code"></textarea><div class="cz-f"><button type="button" class="chip" data-cz-copy>Copy code</button><button type="button" class="chip" data-cz-dl>Download JSON</button></div></div>' +
      '<div class="cz-io" data-cz-impbox hidden><p class="cz-s">Paste a settings code, or upload a .json export. This replaces your current desk settings on this device.</p>' +
      '<textarea class="cz-ta" data-cz-paste rows="3" placeholder="BTD1-…" aria-label="Paste settings code"></textarea><div class="cz-f"><button type="button" class="chip on" data-cz-apply>Import code</button><label class="chip cz-up">Upload JSON<input type="file" accept="application/json,.json" data-cz-file hidden></label></div></div>' +
      '<p class="cz-msg" data-cz-msg role="status"></p></div>';
    document.body.appendChild(pnl); document.body.classList.add('cz-open'); paint(); $('[data-cz-close]', pnl).focus();
    pnl.addEventListener('click', function (e) {
      if (e.target === pnl) { close(); return; }
      var b = e.target.closest('button'); if (!b) return; var i, msg = $('[data-cz-msg]', pnl);
      if (b.dataset.czUp != null) { i = +b.dataset.czUp; L.order.splice(i - 1, 0, L.order.splice(i, 1)[0]); save(); apply(); paint('[data-cz-up="' + (i - 1) + '"]'); }
      else if (b.dataset.czDn != null) { i = +b.dataset.czDn; L.order.splice(i + 1, 0, L.order.splice(i, 1)[0]); save(); apply(); paint('[data-cz-dn="' + (i + 1) + '"]'); }
      else if (b.dataset.czPreset) { L = preset(b.dataset.czPreset); save(); apply(); paint('[data-cz-preset="' + b.dataset.czPreset + '"]'); msg.textContent = b.textContent + ' layout applied. Fine-tune it below; it is saved in this browser.'; }
      else if (b.hasAttribute('data-cz-reset')) { L = { order: DEF.slice(), hidden: DEFHID.filter(function (k) { return EL[k]; }) }; save(); apply(); paint(); msg.textContent = 'Back to the default layout.'; }
      else if (b.hasAttribute('data-cz-close')) close();
      else if (b.hasAttribute('data-cz-exp')) { var eb = $('[data-cz-expbox]', pnl), sh = eb.hidden; eb.hidden = !sh; $('[data-cz-impbox]', pnl).hidden = true; b.setAttribute('aria-expanded', sh); $('[data-cz-imp]', pnl).setAttribute('aria-expanded', 'false'); if (sh) { var ta = $('[data-cz-code]', pnl); ta.value = toCode(snapshot()); ta.select(); } }
      else if (b.hasAttribute('data-cz-imp')) { var ib = $('[data-cz-impbox]', pnl), sh2 = ib.hidden; ib.hidden = !sh2; $('[data-cz-expbox]', pnl).hidden = true; b.setAttribute('aria-expanded', sh2); $('[data-cz-exp]', pnl).setAttribute('aria-expanded', 'false'); if (sh2) $('[data-cz-paste]', pnl).focus(); }
      else if (b.hasAttribute('data-cz-copy')) { var t = $('[data-cz-code]', pnl); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(function () { msg.textContent = 'Code copied.'; }, function () { try { document.execCommand('copy'); msg.textContent = 'Code copied.'; } catch (e2) { msg.textContent = 'Select the code and copy it.'; } }); }
      else if (b.hasAttribute('data-cz-dl')) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot(), null, 1)], { type: 'application/json' })); a.download = 'btctreasurydesk-settings.json'; document.body.appendChild(a); a.click(); a.remove(); msg.textContent = 'Downloaded btctreasurydesk-settings.json.'; }
      else if (b.hasAttribute('data-cz-apply')) importNow($('[data-cz-paste]', pnl).value, msg);
    });
    pnl.addEventListener('change', function (e) { var c = e.target;
      if (c.dataset.czShow) { var k = c.dataset.czShow, h = L.hidden.indexOf(k); if (c.checked && h >= 0) L.hidden.splice(h, 1); else if (!c.checked && h < 0) L.hidden.push(k); save(); apply(); paint('[data-cz-show="' + k + '"]'); }
      else if (c.dataset.czFile != null && c.files && c.files[0]) { var r = new FileReader(), msg = $('[data-cz-msg]', pnl); r.onload = function () { importNow(r.result, msg); }; if (c.files[0].size > 200000) msg.textContent = 'That file is too large to be a settings export.'; else r.readAsText(c.files[0]); }
    });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-customize]'); if (b) { e.preventDefault(); if (pnl) close(); else open(b); } });
  document.addEventListener('keydown', function (e) { if (pnl && e.key === 'Escape') close(); });
})();
