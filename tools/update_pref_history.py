#!/usr/bin/env python3
"""Sunday refresh: weekly closes for Strategy's fixed-rate preferreds (STRF 10%, STRK 8%, STRD 10%) -> members/data/prefs_weekly.json.
Effective yield = stated annual rate on $100 par / weekly close (computed in the browser). STRC and SATA are variable-rate:
their past rates are not stored, so no yield history is drawn for them. Source: Yahoo Finance chart API (weekly closes, USD)."""
import json, time, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
RATES = {'STRF': 10.0, 'STRK': 8.0, 'STRD': 10.0}
out = {'source': 'Yahoo Finance weekly closes (USD)', 'source_url': 'https://finance.yahoo.com/', 'as_of': datetime.date.today().isoformat(), 'par': 100, 'series': {}}
for t, r in RATES.items():
    x = json.load(urllib.request.urlopen(urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{t}?range=2y&interval=1wk', headers={'User-Agent': 'Mozilla/5.0'}), timeout=30))['chart']['result'][0]
    pts = [[datetime.datetime.fromtimestamp(a, datetime.timezone.utc).date().isoformat(), round(v, 2)] for a, v in zip(x['timestamp'], x['indicators']['quote'][0]['close']) if v]
    out['series'][t] = {'rate': r, 'w': pts}; print(t, len(pts), pts[0], pts[-1]); time.sleep(0.6)
(ROOT / 'members/data/prefs_weekly.json').write_text(json.dumps(out, separators=(',', ':')))
