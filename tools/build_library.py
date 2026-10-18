"""BTC Treasury Desk: build the three data-driven Library PDFs from verified site data (dark-branded), plus cover previews.
   Treasury Company Cheat Sheet  <- assets/data/desk.json (treasuries, strategy, strive, prefs_desk) + assets/data/strive.json
   Strategy Preferreds Guide     <- desk.json prefs_desk (rows + upcoming)
   Long-Term Cycle Playbook      <- members/members-models.js run on assets/data/btc_daily.json (same math as the site) + block height
   Run at every Sunday refresh:  python3 tools/build_library.py   (file names are stable, so links never change)."""
import json, html, datetime, subprocess, os, tempfile, urllib.request
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(R)
OUT = 'library-files/f31a01ec624a'; IMG = 'assets/img/library'
D = json.load(open('assets/data/desk.json')); SV = json.load(open('assets/data/strive.json'))
e = lambda s: html.escape('' if s is None else str(s), quote=True)
def dfmt(s): return datetime.date.fromisoformat(s[:10]).strftime('%b %-d, %Y') if s else '—'
def n0(x): return f'{x:,.0f}'
TODAY = dfmt(D['treasuries']['as_of'])
CSS = """@page{size:%s;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#0b0b0d;color:#e9e9ec;font:9.4pt/1.42 Inter,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.pg{width:100%%;height:%s;overflow:hidden;padding:13mm 13mm 11mm;position:relative;page-break-after:always;background:#0b0b0d}.pg:last-child{page-break-after:auto}
.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #26262c;padding-bottom:6px;margin-bottom:10px;font:600 7.6pt 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#8d8d96}.top b{color:#F7931A}
h1{font:800 25pt/1.05 Inter;margin:2px 0 6px;letter-spacing:-.02em}h1 i{font-style:normal;color:#F7931A}h2{font:700 12.5pt Inter;margin:14px 0 6px;color:#fff}h2 small{font:500 8pt 'IBM Plex Mono';color:#8d8d96;margin-left:6px}
.lede{color:#b9b9c2;font-size:10.4pt;max-width:175mm;margin:0 0 10px}.mono{font-family:'IBM Plex Mono',monospace}.mu{color:#8d8d96}.o{color:#F7931A}.up{color:#2ecc71}.dn{color:#ff5c5c}
table{width:100%%;border-collapse:collapse;font-size:8.5pt}th{font:600 7pt 'IBM Plex Mono';letter-spacing:.06em;text-transform:uppercase;color:#8d8d96;text-align:left;padding:5px 5px;border-bottom:1px solid #F7931A}
td{padding:4.2px 5px;border-bottom:1px solid #1d1d22;vertical-align:top}tr:nth-child(even) td{background:#111115}td.r,th.r{text-align:right}td.m{font-family:'IBM Plex Mono';font-size:8.2pt}
.kp{display:flex;gap:7px;margin:8px 0 10px}.k{flex:1;background:#131317;border:1px solid #26262c;border-radius:7px;padding:7px 9px}.k small{display:block;font:600 6.8pt 'IBM Plex Mono';letter-spacing:.08em;text-transform:uppercase;color:#8d8d96}.k b{display:block;font:700 14pt Inter;margin-top:2px}.k span{font-size:7.4pt;color:#8d8d96}
.card{background:#121216;border:1px solid #26262c;border-left:3px solid #F7931A;border-radius:7px;padding:9px 11px;margin:0 0 8px;break-inside:avoid}.card h3{margin:0 0 3px;font:700 11pt Inter}.card h3 span{font:500 8pt 'IBM Plex Mono';color:#8d8d96;margin-left:6px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}dl{margin:4px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:8.4pt}dt{color:#8d8d96;font:500 7.6pt 'IBM Plex Mono';padding-top:1px}dd{margin:0}
ul.ck{list-style:none;padding:0;margin:4px 0}ul.ck li{padding:4px 0 4px 20px;position:relative;border-bottom:1px dashed #22222a}ul.ck li:before{content:'';position:absolute;left:2px;top:6px;width:10px;height:10px;border:1.4px solid #F7931A;border-radius:2px}
.foot{position:absolute;left:13mm;right:13mm;bottom:7mm;display:flex;justify-content:space-between;font:500 6.9pt 'IBM Plex Mono';color:#6f6f78;border-top:1px solid #1d1d22;padding-top:4px}
.note{font-size:7.6pt;color:#8d8d96;margin-top:7px;line-height:1.45}.pill{display:inline-block;font:600 7pt 'IBM Plex Mono';padding:1px 6px;border-radius:9px;border:1px solid #3a3a42;color:#cfcfd6;margin:0 3px 2px 0}.pill.o{border-color:#F7931A;color:#F7931A}
.cover{display:flex;flex-direction:column;justify-content:space-between;background:radial-gradient(120%% 80%% at 100%% 0%%,rgba(247,147,26,.22),transparent 55%%),#0b0b0d}
.cover h1{font-size:40pt;margin-top:34mm}.cover .lede{font-size:12.5pt;max-width:150mm}.bar{height:5px;background:#F7931A;width:44mm;margin:12px 0}.zone{display:inline-block;padding:2px 9px;border-radius:10px;font:700 8pt 'IBM Plex Mono'}.z-c{background:rgba(52,152,219,.18);color:#5dade2}.z-n{background:rgba(200,200,200,.12);color:#ddd}.z-h{background:rgba(255,92,92,.18);color:#ff7b7b}"""
BRAND = '<b>&#8383; BTC TREASURY DESK</b>'
def page(inner, label, n, tot, cover=False):
    return f'<section class="pg{" cover" if cover else ""}"><div class="top">{BRAND}<span>{e(label)}</span></div>{inner}<div class="foot"><span>btctreasurydesk.com · Education only, not investment advice.</span><span>As of {TODAY} · {n}/{tot}</span></div></section>'
def render(name, size, pages, title, extra=''):
    doc = f'<!doctype html><html><head><meta charset="utf-8"><title>{e(title)}</title><style>{CSS % (size, '209.5mm' if 'landscape' in size else '296.5mm')}{extra}</style></head><body>{"".join(pages)}</body></html>'
    t = tempfile.NamedTemporaryFile('w', suffix='.html', delete=False); t.write(doc); t.close()
    pdf = f'{OUT}/{name}.pdf'
    subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=4000', f'--print-to-pdf={os.path.abspath(pdf)}', 'file://' + t.name], check=True, capture_output=True)
    subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-png', '-scale-to', '800', pdf, '/tmp/cov_' + name], check=True)
    from PIL import Image
    im = Image.open([f for f in [f'/tmp/cov_{name}-1.png', f'/tmp/cov_{name}-01.png', f'/tmp/cov_{name}-001.png'] if os.path.exists(f)][0]).convert('RGB')
    w = 400; im = im.resize((w, round(im.height * w / im.width))); im = im.crop((0, 0, w, min(im.height, 518))) if im.height > 518 else im
    im.save(f'{IMG}/{name}.webp', 'WEBP', quality=86)
    pages_n = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout.split('Pages:')[1].split()[0]
    print(pdf, pages_n, 'pages', os.path.getsize(pdf) // 1024, 'KB')

# ---------- 1. Treasury Company Cheat Sheet (1 page, landscape) ----------
T = D['treasuries']; rows = T['rows'][:20]; pub = T['public']; S = D['strategy']
spts = sorted(SV['points'], key=lambda p: p['date'])[-1]
PREF = {'MSTR': 'STRF · STRC · STRE · STRK · STRD', 'ASST': 'SATA', 'MPJPY': 'MERCURY (issued, unlisted); MARS shelf'}
BPS = {'MSTR': (f"{S['sats_per_share']:,} sats", 'strategy.com, ' + dfmt(S['kpi_as_of'][:10])),
       'ASST': (f"{spts['btc'] / spts['shares'] * 1e8:,.0f} sats", 'Strive 8-K, ' + dfmt(spts['date']))}
TY = {'treasury': 'Treasury', 'miner': 'Miner', 'operating': 'Operating co.'}
tr = ''.join(f'<tr><td class="m">{r["rank"]}</td><td><b>{e(r["name"])}</b></td><td class="m">{e(r["tk"])}</td><td class="mu">{TY.get(r["type"], r["type"])}</td><td class="r m"><b>{n0(r["btc"])}</b></td><td class="r m">{r["btc"] / pub["total_btc"] * 100:.1f}%</td>'
             f'<td class="r m">{(f"{r["mnav"]:.2f}x") if r.get("mnav") else "—"}</td><td class="r m">{e(BPS.get(r["tk"], ("—",))[0])}</td><td class="mu" style="font-size:7.8pt">{e(PREF.get(r["tk"], "—"))}</td><td class="m">{dfmt(r["last_add"]) if r.get("last_add") else "—"}</td></tr>' for r in rows)
top20 = sum(r['btc'] for r in rows)
inner = (f'<h1>Treasury Company <i>Cheat Sheet</i></h1><p class="lede">The top 20 public bitcoin holders on one page: who holds what, what the market pays for it, and who is still adding. Refreshed every Sunday.</p>'
  f'<div class="kp"><div class="k"><small>Public-company BTC</small><b>{n0(pub["total_btc"])} &#8383;</b><span>{pub["count"]} companies · {dfmt(pub["as_of"])}</span></div><div class="k"><small>Top 20 hold</small><b>{top20 / pub["total_btc"] * 100:.1f}%</b><span>{n0(top20)} &#8383; of the public total</span></div>'
  f'<div class="k"><small>Strategy share</small><b>{S["btc_held"] / pub["total_btc"] * 100:.1f}%</b><span>{n0(S["btc_held"])} &#8383; · avg cost ${n0(S["avg_cost"])}</span></div><div class="k"><small>Strategy mNAV</small><b>{S["mnav"]:.2f}x</b><span>strategy.com method</span></div></div>'
  f'<table><thead><tr><th>#</th><th>Company</th><th>Ticker</th><th>Type</th><th class="r">BTC held</th><th class="r">% public</th><th class="r">mNAV</th><th class="r">BTC / share</th><th>Listed preferreds</th><th>Last reported buy</th></tr></thead><tbody>{tr}</tbody></table>'
  f'<p class="note"><b>How to read it.</b> mNAV = what the market values the company at versus its bitcoin; above 1x the market pays a premium. BTC per share is shown only where the company publishes it ({e(BPS["MSTR"][1])}; {e(BPS["ASST"][1])}, holdings ÷ assumed fully diluted shares). '
  f'Miners and operating companies hold BTC alongside other businesses, so mNAV is left blank for them. <b>Sources:</b> holdings from company filings via BitcoinTreasuries.NET ({e(T["as_of"])}); mNAV: Strategy from strategy.com, others from BitcoinTreasuries.NET (methods differ); last buy = latest reported addition; preferreds from issuer filings.</p>')
render('treasury-company-cheat-sheet', 'A4 landscape', [page(inner, 'Treasury Company Cheat Sheet · weekly', 1, 1)], 'Treasury Company Cheat Sheet', 'td{padding:2.6px 5px}h1{font-size:21pt}.lede{margin-bottom:4px}.kp{margin:5px 0 7px}.k b{font-size:12.5pt}.pg{padding-top:10mm}')

# ---------- 2. Strategy Preferreds Guide ----------
P = D['prefs_desk']; PR = P['rows']
def ey(r): return r['rate'] * r['par'] / r['close']
cov = (f'<div><h1>Strategy <i>Preferreds</i> Guide</h1><div class="bar"></div><p class="lede">STRC, STRF, STRK, STRD and Strive\'s SATA in plain English: what each pays, where it ranks, when dividends land, and how each one behaves.</p>'
  '<p><span class="pill o">Terms from filings</span><span class="pill o">Yields at last close</span><span class="pill o">Dividend dates</span><span class="pill o">Seniority</span></p></div>'
  f'<div class="kp">' + ''.join(f'<div class="k"><small>{e(r["t"])} · {e(r["rate_kind"])}</small><b>{ey(r):.1f}%</b><span>effective · {r["rate"]:.0f}% on ${r["par"]} · ${r["close"]:.2f}</span></div>' for r in PR) + '</div>'
  f'<p class="note">Prices: {e(P["price_src"].split(" (")[0])}, {dfmt(P["price_as_of"])}. {e(P["note"])}</p>')
cmp = ''.join(f'<tr><td><b>{e(r["t"])}</b><br><span class="mu">{e(r["issuer"])} · {e(r["name"])}</span></td><td class="r m">{r["rate"]:.2f}%<br><span class="mu">{e(r["rate_kind"])}</span></td><td class="r m">${r["close"]:.2f}</td><td class="r m"><b class="o">{ey(r):.2f}%</b></td><td>{e(r["pay"])}</td><td>{e(r["type"])}</td><td>{e(r["rank"])}</td><td class="m">{e(dfmt(r["next_ex"]) if r.get("next_ex") and r["next_ex"][0].isdigit() else (r.get("next_ex") or "—"))}</td></tr>' for r in PR)
p2 = ('<h2>Side by side<small>stated rate on $100 par · effective yield = rate × par ÷ last close</small></h2>'
  f'<table><thead><tr><th>Series</th><th class="r">Rate</th><th class="r">Close</th><th class="r">Eff. yield</th><th>Paid</th><th>Type</th><th>Rank</th><th>Next ex-date</th></tr></thead><tbody>{cmp}</tbody></table>'
  '<h2>How each one works</h2><div class="g2">' + ''.join(
  f'<div class="card"><h3>{e(r["t"])}<span>{e(r["issuer"])} · {e(r["name"])}</span></h3><p style="margin:0 0 4px">{e(r["explain"])}</p><dl><dt>Pays</dt><dd>{e(r["pay"])}: {e(r["pay_note"])}</dd><dt>Next</dt><dd>{e(r["next_ex_note"])}</dd><dt>Source</dt><dd class="mu">{e(r["src"]["name"])}</dd></dl></div>' for r in PR) + '</div>')
up = ''.join(f'<div class="card"><h3>{e(u["company"])}<span>{e(u["status"])} · {dfmt(u["date"])}</span></h3><b>{e(u["item"])}</b><p style="margin:3px 0;font-size:8.2pt">{e(u["detail"])}</p><span class="mu" style="font-size:7.6pt">{e(u["src"]["name"])}</span></div>' for u in P['upcoming'])
p3 = ('<h2>Six ideas that explain every preferred</h2><div class="g3">'
  '<div class="card"><h3>Par and stated rate</h3>Each share has a $100 reference amount. The stated rate is paid on that $100, not on what you paid. 10% stated = $10 a year per share.</div>'
  '<div class="card"><h3>Effective yield</h3>Buy below $100 and you earn more than the stated rate on your money; buy above and you earn less. That is why STRD and STRK show higher effective yields.</div>'
  '<div class="card"><h3>Cumulative vs non-cumulative</h3>Cumulative (STRF, STRC, STRK, SATA): a skipped dividend is owed later. Non-cumulative (STRD): a skipped dividend is gone. That difference is a big part of STRD\'s higher yield.</div>'
  '<div class="card"><h3>Seniority</h3>The order of claims if the company is wound up. STRF is first among Strategy\'s preferreds, STRD last; all preferreds rank ahead of common stock and behind debt.</div>'
  '<div class="card"><h3>Fixed vs variable</h3>Fixed-rate series move with interest rates and credit risk, so their price can drift far from $100. Variable-rate series (STRC, SATA) have their rate adjusted to keep the price near $100.</div>'
  '<div class="card"><h3>Conversion</h3>Only STRK converts into common stock (0.1 MSTR per share), so it also moves with MSTR. The others are pure income instruments.</div></div>'
  f'<h2>Upcoming and announced<small>official sources only · checked every Sunday</small></h2><div class="g2">{up}</div>'
  '<p class="note"><b>Risks to understand:</b> dividends must be declared by the board; prices can fall well below par; fixed-rate series lose value when rates rise; all of these depend on the issuer\'s ability to raise capital and on the bitcoin price. Read the prospectus and latest 10-Q before relying on any figure. Education only, not investment advice.</p>')
render('strategy-preferreds-guide', 'A4', [page(cov, 'Strategy Preferreds Guide', 1, 3, True), page(p2, 'Strategy Preferreds Guide', 2, 3), page(p3, 'Strategy Preferreds Guide', 3, 3)], 'Strategy Preferreds Guide')

# ---------- 3. Long-Term Cycle Playbook ----------
js = r"""global.window={};require('%s/members/members-models.js');const B=window.BTDModels,H=require('%s/assets/data/btc_daily.json');const M=B.compute(H,null,0),W={};B.MODELS.forEach(m=>W[m.k]=m.w);const C=B.composite(M,W),i=M.last;
console.log(JSON.stringify({px:M.px,comp:C[i],band:B.band(C[i]),models:B.MODELS.map(m=>({n:m.n,d:m.d,w:m.w,ratio:M.R[m.k][i],pct:M.P[m.k]?M.P[m.k][i]:null,z:M.Z[m.k][i]})),wma:M.S.wma[i],pl:M.S.pl[i],m200:M.S.m200[i],ath:Math.max(...M.S.c),cut:B.CUT}))""" % (R, R)
MD = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout)
H = json.load(open('assets/data/btc_daily.json')); HAS = dfmt(H['as_of'])
try: tip = int(urllib.request.urlopen('https://mempool.space/api/blocks/tip/height', timeout=10).read())
except Exception: tip = None
lastH = datetime.date(2024, 4, 20); dsl = (datetime.date.fromisoformat(H['as_of'][:10]) - lastH).days
nxt = (datetime.date.today() + datetime.timedelta(minutes=10 * (1050000 - tip))) if tip else None
ZN = {-1: ('Historically cool', 'z-c'), 0: ('Mid-range', 'z-n'), 1: ('Historically hot', 'z-h')}
def zof(z): return ZN[-1] if z is not None and z <= -MD['cut'] else ZN[1] if z is not None and z >= MD['cut'] else ZN[0]
mrow = ''.join(f'<tr><td><b>{e(m["n"])}</b>{"" if m["w"] else " <span class=mu>(shown, not in composite)</span>"}<br><span class="mu">{e(m["d"])}</span></td><td class="r m">{m["ratio"]:.2f}x</td><td class="r m">{(f"{m["pct"]:.0f}th") if m["pct"] is not None else "—"}</td><td><span class="zone {zof(m["z"])[1]}">{zof(m["z"])[0]}</span></td></tr>' for m in MD['models'])
zl, zc = ZN[MD['band']]
c1 = (f'<div><h1>Long-Term <i>Cycle</i> Playbook</h1><div class="bar"></div><p class="lede">The models long-term holders watch, a one-page cycle checklist, and how HODLers use the readings to plan macro entries and exits with rules set in advance. Education only.</p>'
  '<p><span class="pill o">Power Law</span><span class="pill o">200-week MA</span><span class="pill o">Mayer Multiple</span><span class="pill o">MVRV proxy</span><span class="pill o">Pi Cycle</span><span class="pill o">Halving clock</span></p></div>'
  f'<div><h2>Today\'s read<small>BTC daily close {HAS}</small></h2><div class="kp"><div class="k"><small>BTC</small><b>${n0(MD["px"])}</b><span>{(MD["px"] / MD["ath"] - 1) * 100:.0f}% from ATH ${n0(MD["ath"])}</span></div>'
  f'<div class="k"><small>Composite</small><b><span class="zone {zc}" style="font-size:11pt">{zl}</span></b><span>score {MD["comp"]:+.2f} (−1 cool … +1 hot)</span></div><div class="k"><small>200-week MA</small><b>${n0(MD["wma"])}</b><span>price {MD["px"] / MD["wma"]:.2f}x</span></div>'
  f'<div class="k"><small>Halving clock</small><b>{dsl} days</b><span>since Apr 20, 2024{(" · next ~" + nxt.strftime("%b %Y")) if nxt else ""}</span></div></div></div>')
c2 = ('<h2>The models<small>ratio today · percentile vs all prior history · zone</small></h2>'
  f'<table><thead><tr><th>Model</th><th class="r">Ratio</th><th class="r">Percentile</th><th>Zone</th></tr></thead><tbody>{mrow}</tbody></table>'
  f'<p class="note">Same definitions and math as the Desk\'s Model Zones and Members tools. Each ratio is ranked only against the days before it (no hindsight). Composite = equal-weight average of the scores, 7-day smoothed; cool ≤ −{MD["cut"]:.2f}, hot ≥ +{MD["cut"]:.2f}. Power Law trend today ${n0(MD["pl"])}; 200-day average ${n0(MD["m200"])}. MVRV here is a proxy (price ÷ 2-year average).</p>'
  '<h2>What the cycle has looked like<small>past halvings and peaks (daily closes)</small></h2><table><thead><tr><th>Halving</th><th>Date</th><th>Next cycle peak</th><th class="r">Months after halving</th></tr></thead><tbody>'
  '<tr><td>1st</td><td class="m">Nov 28, 2012</td><td class="m">Dec 2013</td><td class="r m">~12</td></tr><tr><td>2nd</td><td class="m">Jul 9, 2016</td><td class="m">Dec 2017</td><td class="r m">~17</td></tr><tr><td>3rd</td><td class="m">May 11, 2020</td><td class="m">Nov 2021</td><td class="r m">~18</td></tr><tr><td>4th</td><td class="m">Apr 20, 2024</td><td class="m">Oct 2025 (ATH so far)</td><td class="r m">~18</td></tr></tbody></table>'
  '<p class="note">Three cycles are a small sample, and each was different. Use timing as context, never as a schedule.</p>')
c3 = ('<h2>The cycle checklist<small>run it monthly; tick what is true</small></h2><div class="g2"><div><b class="o">Signs of a historically cool market</b><ul class="ck">'
  '<li>Price near or below the 200-week MA</li><li>Power Law ratio under ~0.6x (lower part of its band)</li><li>Mayer Multiple under 1.0 (below the 200-day average)</li><li>MVRV proxy under 1.0 (below the 2-year average)</li><li>Composite in the cool zone for several weeks</li><li>Treasury-company premiums (mNAV) compressed near 1x or below</li><li>Headlines bored or hostile; ETF outflows</li></ul></div>'
  '<div><b class="o">Signs of a historically hot market</b><ul class="ck"><li>Price 2.5x+ the 200-week MA</li><li>Power Law ratio above ~1.5x</li><li>Mayer Multiple above 2.0</li><li>Pi Cycle 111-day average near 2x the 350-day</li><li>Composite in the hot zone for several weeks</li><li>mNAV premiums stretched across many treasury stocks</li><li>12–18 months after a halving; euphoric headlines</li></ul></div></div>'
  '<h2>How long-term holders use it<small>common approaches, not recommendations</small></h2><div class="g3">'
  '<div class="card"><h3>1 · Baseline</h3>Most HODLers keep a steady schedule (weekly or monthly) no matter the zone. The models only tilt the plan; they never replace it.</div>'
  '<div class="card"><h3>2 · Cool-zone tilt</h3>Some raise contributions while the composite is cool, for example 1.5–2x the baseline, capped by a monthly budget written down in advance.</div>'
  '<div class="card"><h3>3 · Hot-zone plan</h3>Holders with an exit goal set scale-out steps before euphoria, e.g. small slices only when several hot signals agree, keeping a core they never touch.</div>'
  '<div class="card"><h3>4 · Rules first</h3>Write the rules while calm: thresholds, sizes and maximums. Then follow them. Most damage comes from changing the plan mid-cycle.</div>'
  '<div class="card"><h3>5 · No leverage</h3>Cycles include 70%+ drawdowns. Plans that survive avoid margin and forced selling, and keep living costs outside BTC.</div>'
  '<div class="card"><h3>6 · Review, don\'t react</h3>Check the read monthly, not hourly. A zone change is a prompt to review your written plan, not a signal to act.</div></div>'
  '<h2>Your plan<small>fill in</small></h2><table><tbody><tr><td style="width:34%">Baseline contribution</td><td>__________ every __________</td></tr><tr><td>Cool-zone tilt (max per month)</td><td>__________</td></tr><tr><td>Hot-zone scale-out steps</td><td>__________________________________________</td></tr><tr><td>Core I never sell</td><td>__________ &#8383;</td></tr><tr><td>Review date each month</td><td>__________</td></tr></tbody></table>'
  '<p class="note">Build and test these rules with the Desk\'s Entry &amp; Exit Planner and Freedom Plan (Members, free). Models describe history; they do not predict. Education only, not investment advice.</p>')
render('long-term-cycle-playbook', 'A4', [page(c1 + c2, 'Long-Term Cycle Playbook', 1, 2), page(c3, 'Long-Term Cycle Playbook', 2, 2)], 'Long-Term Cycle Playbook')

# ---------- Library manifest -> opt-in list (optin.js), Resources cards, Members download center ----------
import re
F = '/library-files/f31a01ec624a/'
NEWD = D['treasuries']['as_of']
LIBR = [ # key (Kit tag lib_<key>), title, 1-line benefit, file, type, cover, updated, featured
 ('tcs', 'Treasury Company Cheat Sheet', 'The top 20 bitcoin holders on one page: BTC held, mNAV, BTC per share, preferreds and last buy. Updated weekly.', F + 'treasury-company-cheat-sheet.pdf', '1-page PDF', 'treasury-company-cheat-sheet', NEWD, 1),
 ('pguide', 'Strategy Preferreds Guide', 'STRC, STRF, STRK, STRD and SATA explained: terms, yields, seniority, dividend dates and how each behaves.', F + 'strategy-preferreds-guide.pdf', '3-page PDF', 'strategy-preferreds-guide', NEWD, 1),
 ('cycle', 'Long-Term Cycle Playbook', 'The models, a monthly cycle checklist and how HODLers plan macro entries and exits by rules.', F + 'long-term-cycle-playbook.pdf', '2-page PDF', 'long-term-cycle-playbook', NEWD, 1),
 ('numbers', 'MSTR & ASST by the Numbers', 'Holdings, share counts and preferreds for both companies, every figure sourced.', F + 'mstr-asst-by-the-numbers-ff665f.pdf', '3-page PDF', 'by-the-numbers', '2026-10-05', 0),
 ('cheat', 'Treasury Metrics Explained', 'Read any treasury company in minutes: mNAV, BTC Yield and sats per share on two pages.', F + 'bitcoin-treasury-cheat-sheet-6e605f.pdf', '2-page PDF', 'cheat-sheet', '2026-10-18', 0),
 ('data', 'Where to Find the Real Data', 'The primary sources behind every number, so you can check any figure yourself.', F + 'where-to-find-the-real-data-7317af.pdf', '1-page PDF', 'data-sources', '2026-10-05', 0),
 ('quotes', 'Greatest Saylor Quotes', 'Saylor in his own words: verbatim, dated and linked to the source.', F + 'greatest-saylor-quotes-83c9d8.pdf', '3-page PDF', None, '2026-10-05', 0),
 ('whitepaper', 'Bitcoin Whitepaper in 2 Pages', 'Understand what you own: the original paper in plain English.', F + 'bitcoin-whitepaper-in-2-pages-9849b6.pdf', '2-page PDF', 'whitepaper', '2026-10-18', 0),
 ('glossary', 'Speak Treasury: 25 Terms Every BTC Treasury Investor Should Know', 'Minor extra: the vocabulary, one page.', F + 'bitcoin-treasury-glossary-b1be26.pdf', '1-page PDF', 'glossary', '2026-10-05', 0),
]
for x in LIBR: assert os.path.exists(x[3].lstrip('/')), x[3]
js_rows = ',\n'.join('    [' + ', '.join(json.dumps(v, ensure_ascii=False) for v in (k, t, b, f)) + ']' for k, t, b, f, *_ in LIBR)
p = 'assets/js/optin.js'; s = open(p).read()
s, n = re.subn(r'  var LIB = \[[^\n]*\n.*?\n  \];', lambda m: '  var LIB = [ // generated by tools/build_library.py\n' + js_rows + '\n  ];', s, count=1, flags=re.S); assert n == 1
s = re.sub(r"Desk Library PDFs <span class=\"muted\">\(pick any of \d+\)</span>", 'Desk Library PDFs <span class="muted">(pick any of %d)</span>' % len(LIBR), s)
s = s.replace('Pick only the ones you want: cheat sheet, preferreds playbook, MSTR &amp; ASST by the numbers and more.', 'Pick only the ones you want: the weekly Treasury Company Cheat Sheet, the Strategy Preferreds Guide, the Long-Term Cycle Playbook and more.')
open(p, 'w').write(s)
def cov(x, w, h): return f'<img src="/assets/img/library/{x[5]}.webp" alt="" width="{w}" height="{h}" loading="lazy">' if x[5] else '<i class="qcov">&ldquo;&rdquo;</i>'
dl = ''.join(f'<a class="dl{" dl-new" if x[7] else ""}" href="{x[3]}" target="_blank" rel="noopener">{cov(x, 80, 104)}<span><b>{e(x[1])}</b><small>{e(x[2])}</small><small class="mono">{x[4]} · updated {dfmt(x[6])}</small></span></a>' for x in LIBR)
p = 'members/index.html'; s = open(p).read()
s, n = re.subn(r'<span class="tag">\d+ PDFs</span></div><div class="dls">.*?</div></div></section>', lambda m: f'<span class="tag">{len(LIBR)} PDFs</span></div><div class="dls">{dl}</div></div></section>', s, count=1, flags=re.S); assert n == 1
open(p, 'w').write(s)
cards = ''.join(f'<li class="lib-card{" lib-new" if x[7] else ""}"><a href="{x[3]}" target="_blank" rel="noopener">{cov(x, 400, 518).replace("alt=\"\"", "alt=\"Cover: " + e(x[1]) + "\"")}<div><b>{e(x[1])}</b><small>{e(x[2])}</small><small class="mono">{x[4]} · updated {dfmt(x[6])}</small></div></a></li>' for x in LIBR)
p = 'resources/index.html'; s = open(p).read()
s, n = re.subn(r'<ul class="lib">.*?</ul>', lambda m: '<ul class="lib">' + cards + '</ul>', s, count=1, flags=re.S); assert n == 1
s = re.sub(r'free Desk Library</b> \(\d+ downloads\)', 'free Desk Library</b> (%d downloads)' % len(LIBR), s)
open(p, 'w').write(s)
print('library lists updated:', len(LIBR), 'items')
# sitewide counts + the subscribe page cards
import glob
for p in glob.glob('**/*.html', recursive=True):
    if p.startswith(('library-files', 'tools')): continue
    s = open(p).read(); s2 = re.sub(r'Desk Library</b> \(\d+ downloads\)', 'Desk Library</b> (%d downloads)' % len(LIBR), s); s2 = re.sub(r'Free Desk Library \(\d+ downloads\)', 'Free Desk Library (%d downloads)' % len(LIBR), s2)
    if p == 'subscribe/index.html': s2 = re.sub(r'<ul class="lib">.*?</ul>', lambda m: '<ul class="lib">' + cards + '</ul>', s2, count=1, flags=re.S)
    if s2 != s: open(p, 'w').write(s2)
