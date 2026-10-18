/* Desk music: OFF by default, never autoplays. Tracks from /assets/audio/tracks.json; only files that exist are offered, and the
   button stays hidden until at least one does. Remembers track + volume (btd_music), never the playing state. */
(function () {
  'use strict';
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var P = { t: null, vol: 0.5, m: 'all' }; try { var o = JSON.parse(LS.get('btd_music') || '{}'); if (o.t) P.t = o.t; if (['all', 'shuffle', 'one'].indexOf(o.m) >= 0) P.m = o.m; if (o.vol >= 0 && o.vol <= 1) P.vol = +o.vol; } catch (e) {}
  function save() { LS.set('btd_music', JSON.stringify(P)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var TR = [], au = null, pnl = null, btns = [], XF = 2.5, fading = false, ALL = [], fid = 0, MODES = [['all', 'Play all'], ['shuffle', 'Shuffle'], ['one', 'Repeat one']];
  fetch('/assets/audio/tracks.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) {
    return Promise.all((j.tracks || []).filter(function (t) { return t.ready === true; }).map(function (t) { return fetch('/assets/audio/' + t.file, { method: 'HEAD' }).then(function (r) { return r.ok ? t : null; }).catch(function () { return null; }); }));
  }).then(function (a) { TR = a.filter(Boolean); if (TR.length) mount(); }).catch(function () {});
  function playing() { return ALL.some(function (x) { return !x.paused; }); }
  function label() { btns.forEach(function (b) { b.textContent = '♪ Music: ' + (playing() ? 'On' : 'Off'); b.setAttribute('aria-pressed', playing()); b.classList.toggle('on', playing()); }); }
  function cur() { return TR.filter(function (t) { return t.id === P.t; })[0] || TR[0]; }
  function mkAudio() { var a = new Audio(); a.preload = 'none'; ALL.push(a); a.addEventListener('play', label); a.addEventListener('pause', function () { if (!fading) label(); });
    a.addEventListener('timeupdate', function () { if (a !== au || fading || P.m === 'one' || TR.length < 2 || !a.duration) return; if (a.duration - a.currentTime <= XF) step(1, true); });
    a.addEventListener('ended', function () { if (a !== au) return; if (P.m === 'one' || TR.length < 2) { a.currentTime = 0; a.play().catch(function () {}); } else if (!fading) step(1, true); }); return a; }
  function idx() { var c = cur(); return TR.indexOf(c); }
  function nextT(dir) { if (P.m === 'shuffle' && TR.length > 2) { var i, c = idx(); do { i = Math.floor(Math.random() * TR.length); } while (i === c); return TR[i]; } return TR[(idx() + dir + TR.length) % TR.length]; }
  function step(dir, xf) { var t = nextT(dir); if (playing()) play(t, xf); else { P.t = t.id; save(); paint(); } }
  function play(t, xf) { t = t || cur(); P.t = t.id; save(); var src = '/assets/audio/' + t.file, old = au;
    if (old && old.getAttribute('src') === src && !old.paused) { paint(); return; }
    if (old && old.getAttribute('src') === src) { old.volume = P.vol; old.loop = P.m === 'one' || TR.length < 2; old.play().catch(function () {}); paint(); return; }
    var my = ++fid; ALL.forEach(function (x) { if (x !== old) x.pause(); }); ALL = ALL.filter(function (x) { return x === old; }); fading = false; if (old) old.volume = P.vol;
    var n = mkAudio(); n.setAttribute('src', src); n.loop = P.m === 'one' || TR.length < 2; au = n;
    var soft = xf && old && !old.paused && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    n.volume = soft ? 0 : P.vol; n.play().catch(function () {});
    if (soft) { fading = true; var t0 = performance.now(), v0 = old.volume; (function f(now) { if (my !== fid) return; var k = Math.max(0, Math.min(1, (now - t0) / (XF * 1000))); n.volume = Math.max(0, Math.min(1, P.vol * k)); old.volume = Math.max(0, Math.min(1, v0 * (1 - k))); if (k < 1) requestAnimationFrame(f); else { old.pause(); fading = false; label(); } })(t0); }
    else if (old) old.pause();
    paint(); }
  function stop() { fid++; fading = false; ALL.forEach(function (x) { x.pause(); }); if (au) au.volume = P.vol; label(); paint(); }
  function paint() { if (!pnl) return; var c = cur();
    pnl.innerHTML = '<div class="mu-h"><b>Desk music</b><button type="button" class="mu-x" data-mu-close aria-label="Close">&times;</button></div>' +
      '<div class="mu-l" role="radiogroup" aria-label="Track">' + TR.map(function (t) { return '<label><input type="radio" name="mu-t" value="' + esc(t.id) + '"' + (t.id === c.id ? ' checked' : '') + '> ' + esc(t.name) + '</label>'; }).join('') + '</div>' +
      '<div class="mu-c"><button type="button" class="tbtn mu-s" data-mu-prev aria-label="Previous track"' + (TR.length < 2 ? ' disabled' : '') + '>⏮</button><button type="button" class="tbtn" data-mu-play>' + (playing() ? '❚❚ Pause' : '▶ Play') + '</button><button type="button" class="tbtn mu-s" data-mu-next aria-label="Next track"' + (TR.length < 2 ? ' disabled' : '') + '>⏭</button></div>' +
      '<div class="mu-c"><span class="seg mu-m" role="group" aria-label="Playback mode">' + MODES.map(function (m) { return '<button type="button" data-mu-mode="' + m[0] + '" aria-pressed="' + (P.m === m[0]) + '"' + (P.m === m[0] ? ' class="on"' : '') + '>' + m[1] + '</button>'; }).join('') + '</span></div>' +
      '<div class="mu-c"><label class="mu-v">Volume <input type="range" min="0" max="100" value="' + Math.round(P.vol * 100) + '" data-mu-vol aria-label="Volume"></label></div>' +
      (c.credit ? '<p class="mu-cr">' + esc(c.credit) + '</p>' : '') + '<p class="mu-cr">Off by default · never autoplays · remembers track, volume and mode.</p>'; }
  function toggle(b) { if (pnl && !pnl.hidden) { pnl.hidden = true; return; } if (!pnl) { pnl = document.createElement('div'); pnl.className = 'mu-p'; pnl.setAttribute('role', 'dialog'); pnl.setAttribute('aria-label', 'Desk music'); document.body.appendChild(pnl);
      pnl.addEventListener('click', function (e) { if (e.target.closest('[data-mu-close]')) { pnl.hidden = true; return; } if (e.target.closest('[data-mu-play]')) { playing() ? stop() : play(); }
        if (e.target.closest('[data-mu-next]')) step(1, true); if (e.target.closest('[data-mu-prev]')) step(-1, true);
        var mb = e.target.closest('[data-mu-mode]'); if (mb) { P.m = mb.dataset.muMode; save(); if (au) au.loop = P.m === 'one' || TR.length < 2; paint(); } e.stopPropagation(); });
      pnl.addEventListener('change', function (e) { if (e.target.name === 'mu-t') { var t = TR.filter(function (x) { return x.id === e.target.value; })[0]; P.t = t.id; save(); if (playing()) play(t); else paint(); } });
      pnl.addEventListener('input', function (e) { if (e.target.matches('[data-mu-vol]')) { P.vol = e.target.value / 100; if (au && !fading) au.volume = P.vol; save(); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pnl && !pnl.hidden) pnl.hidden = true; }); }
    paint(); pnl.hidden = false; var r = b.getBoundingClientRect(), w = 260; pnl.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
    if (r.top > window.innerHeight / 2) { pnl.style.top = ''; pnl.style.bottom = (window.innerHeight - r.top + 6) + 'px'; } else { pnl.style.bottom = ''; pnl.style.top = (r.bottom + 6) + 'px'; } }
  function mk() { var b = document.createElement('button'); b.type = 'button'; b.className = 'tbtn mu-b'; b.setAttribute('aria-haspopup', 'dialog'); b.addEventListener('click', function (e) { e.stopPropagation(); toggle(b); }); btns.push(b); return b; }
  function mount() { var dm = document.querySelector('[data-deskmode]'); if (dm && dm.parentNode) dm.parentNode.insertBefore(mk(), dm.nextSibling);
    var c = document.querySelector('[data-dm-ctl]'), ex = c && c.querySelector('[data-deskmode-exit]'); if (c) c.insertBefore(mk(), ex || null); label(); }
})();
