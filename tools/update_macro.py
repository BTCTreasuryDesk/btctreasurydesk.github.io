#!/usr/bin/env python3
"""Weekly: macro backdrop for the home 'Macro backdrop' panel -> assets/data/macro.json.
Sources: FRED public CSV (Fed funds target, 10Y TIPS real yield, 2s10s, M2, Fed balance sheet, CPI) and Farside Investors (US spot BTC ETF net flows).
Only published figures; changes are computed from the same series. Never typed in by hand."""
import csv, io, json, re, html, datetime, urllib.request, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = {"User-Agent": "Mozilla/5.0 (BTC Treasury Desk weekly refresh)"}

def get(url, tries=3):
    import subprocess
    for k in range(tries):
        ua = ["-A", UA["User-Agent"]] if "farside" in url else []  # FRED rejects browser-like UAs
        r = subprocess.run(["curl", "-s", "-m", "40"] + ua + [url], capture_output=True)
        if r.returncode == 0 and r.stdout: return r.stdout.decode("utf-8", "replace")
    raise RuntimeError("fetch failed: " + url)

def fred(sid, start="2024-09-01"):
    rows = list(csv.reader(io.StringIO(get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}&cosd={start}"))))[1:]
    return [(d, float(v)) for d, v in rows if v not in ("", ".")]

def fnum(s):
    s = s.strip().replace(",", "")
    if s in ("", "-"): return 0.0
    return -float(s[1:-1]) if s.startswith("(") else float(s)

def mon(d): return datetime.date.fromisoformat(d).strftime("%b %-d, %Y")
def src(sid): return {"name": f"FRED {sid} (St. Louis Fed)", "url": f"https://fred.stlouisfed.org/series/{sid}"}
def sgn(v, nd=2): return ("+" if v > 0 else "−" if v < 0 else "") + f"{abs(v):.{nd}f}"
def dirn(v, eps=1e-9): return "up" if v > eps else "dn" if v < -eps else ""

items = []
# 1 Fed funds target range
lo, hi = fred("DFEDTARL"), fred("DFEDTARU")
chg_d, prev = None, None
for i in range(1, len(hi)):
    if hi[i][1] != hi[i-1][1] or lo[i][1] != lo[i-1][1]:
        chg_d, prev = hi[i][0], (lo[i-1][1], hi[i-1][1])
cur = (lo[-1][1], hi[-1][1])
last_move = ("unchanged since " + mon(chg_d)) if chg_d else "unchanged over the past year"
if chg_d and prev: last_move += f" (was {prev[0]:.2f}–{prev[1]:.2f}%)"
items.append({"id": "fedfunds", "label": "Fed funds target", "tk": "DFEDTARL/U", "value": f"{cur[0]:.2f}–{cur[1]:.2f}%", "chg": last_move, "dir": "",
  "as_of": hi[-1][0], "src": src("DFEDTARU"), "tip": "The Fed's target range for overnight rates. It anchors short-term borrowing costs and is the main dial for liquidity."})
# 2 real 10Y
s = fred("DFII10"); v, w = s[-1], s[-6] if len(s) > 6 else s[0]
items.append({"id": "real10y", "label": "10Y real yield", "tk": "DFII10", "value": f"{v[1]:.2f}%", "chg": f"{sgn((v[1]-w[1])*100,0)} bp vs 1 wk", "dir": dirn(v[1]-w[1]),
  "as_of": v[0], "src": src("DFII10"), "tip": "10-year TIPS yield: the yield after inflation. Higher real yields are a headwind for non-yielding assets; falling ones tend to ease it."})
# 3 2s10s
s = fred("T10Y2Y"); v, w = s[-1], s[-6]
items.append({"id": "curve", "label": "Yield curve 2s10s", "tk": "T10Y2Y", "value": f"{sgn(v[1])} pp", "chg": f"{sgn((v[1]-w[1])*100,0)} bp vs 1 wk", "dir": dirn(v[1]-w[1]),
  "as_of": v[0], "src": src("T10Y2Y"), "tip": "10-year minus 2-year Treasury yield. Below zero (inverted) has historically flagged recession risk; positive means a normal curve."})
# 4 M2 YoY
s = fred("M2SL", "2024-01-01"); d = dict(s); v = s[-1]; ly = f"{int(v[0][:4])-1}{v[0][4:]}"
yoy = (v[1]/d[ly]-1)*100; pv = s[-2]; ply = f"{int(pv[0][:4])-1}{pv[0][4:]}"; pyoy = (pv[1]/d[ply]-1)*100
items.append({"id": "m2", "label": "M2 money supply YoY", "tk": "M2SL", "value": f"{sgn(yoy,1)}%", "chg": f"${v[1]/1000:.2f}T · {sgn(yoy-pyoy,1)} pp vs prior month", "dir": dirn(yoy-pyoy),
  "as_of": v[0], "src": src("M2SL"), "tip": "Growth of the broad US money supply over 12 months (monthly, seasonally adjusted). Faster growth means more dollars chasing assets."})
# 5 Fed balance sheet
s = fred("WALCL"); v, w = s[-1], s[-5]
items.append({"id": "walcl", "label": "Fed balance sheet", "tk": "WALCL", "value": f"${v[1]/1e6:.2f}T", "chg": f"{'+' if v[1]>w[1] else '−' if v[1]<w[1] else ''}${abs(v[1]-w[1])/1000:,.0f}B vs 4 wks", "dir": dirn(v[1]-w[1]),
  "as_of": v[0], "src": src("WALCL"), "tip": "Total assets held by the Federal Reserve (weekly, Wednesday). Shrinking drains liquidity; growing adds it."})
# 6 CPI YoY
s = fred("CPIAUCSL", "2024-01-01"); d = dict(s); v = s[-1]; ly = f"{int(v[0][:4])-1}{v[0][4:]}"; yoy = (v[1]/d[ly]-1)*100
pv = s[-2]; ply = f"{int(pv[0][:4])-1}{pv[0][4:]}"; pyoy = (pv[1]/d[ply]-1)*100
items.append({"id": "cpi", "label": "US CPI inflation YoY", "tk": "CPIAUCSL", "value": f"{yoy:.1f}%", "chg": f"{sgn(yoy-pyoy,1)} pp vs prior month", "dir": dirn(yoy-pyoy, 0.04),
  "as_of": v[0], "src": src("CPIAUCSL"), "tip": "Year-over-year change in the all-items consumer price index (BLS, monthly). The headline inflation rate the Fed watches."})
# 7 spot BTC ETF flows (Farside)
t = get("https://farside.co.uk/btc/"); rows = []
for r in re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S):
    c = [html.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)]
    if c and re.match(r"\d{1,2} \w{3} 20\d\d$", c[0]):
        rows.append((datetime.datetime.strptime(c[0], "%d %b %Y").date().isoformat(), fnum(c[-1])))
tot = [r for r in re.findall(r"<tr[^>]*>(.*?)</tr>", t, re.S) if ">Total<" in r]
cum = None
if tot:
    c = [html.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tot[0], re.S)]; cum = fnum(c[-1])
rows.sort(); last = rows[-1]
wk = [x for x in rows if x[0] > (datetime.date.fromisoformat(last[0]) - datetime.timedelta(days=7)).isoformat()]
wsum = sum(x[1] for x in wk)
def m(v): return ("+" if v > 0 else "−" if v < 0 else "") + f"${abs(v):,.0f}M"
items.append({"id": "etf", "label": "US spot BTC ETF flows", "tk": "Farside", "value": m(last[1]), "chg": f"{m(wsum)} over last {len(wk)} sessions" + (f" · ${cum/1000:,.1f}B cumulative" if cum else ""), "dir": dirn(last[1]),
  "as_of": last[0], "src": {"name": "Farside Investors", "url": "https://farside.co.uk/btc/"}, "tip": "Net daily creations minus redemptions across the US spot Bitcoin ETFs (IBIT, FBTC, GBTC and others), in US$ millions. Shown for the latest session."})
# next FOMC from keydates
nf = None
try:
    kd = json.load(open(os.path.join(ROOT, "assets/data/keydates.json")))
    today = datetime.date.today().isoformat()
    f = sorted([i for i in kd["items"] if "FOMC" in i.get("title", "") and i["date"] >= today], key=lambda i: i["date"])
    if f: nf = {"date": f[0]["date"], "time": f[0].get("time", ""), "detail": f[0].get("detail", ""), "src": {"name": f[0].get("source", "Federal Reserve"), "url": f[0].get("url", "")}}
except Exception as e:
    print("keydates:", e, file=sys.stderr)
out = {"as_of": datetime.date.today().isoformat(), "note": "Macro backdrop: weekly snapshot from FRED and Farside (not live). Live markets are in the Market pulse above. Education only.", "next_fomc": nf, "items": items}
json.dump(out, open(os.path.join(ROOT, "assets/data/macro.json"), "w"), indent=1, ensure_ascii=False)
for i in items: print(i["label"], i["value"], "|", i["chg"], "|", i["as_of"])
print("next FOMC", nf)
