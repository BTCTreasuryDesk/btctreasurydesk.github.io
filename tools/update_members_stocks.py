#!/usr/bin/env python3
"""Sunday refresh: daily closes for the Members toolkit (momentum grid + entry/exit planner).
Writes members/data/stocks_daily.json. Source: Yahoo Finance chart API (split-adjusted daily closes, USD).
Run:  python3 tools/update_members_stocks.py"""
import json, time, urllib.request, datetime, pathlib
SYMS = {'MSTR': 'MSTR', 'ASST': 'ASST', 'MPJPY': 'MPJPY', 'XXI': 'XXI'}
NOTES = {
    'ASST': 'Before the Sep 2025 merger this ticker traded as Asset Entities; history before then is a different business.',
    'XXI': 'Before Twenty One Capital listed, this ticker history belongs to the SPAC (Cantor Equity Partners).',
    'MPJPY': 'Metaplanet sponsored ADR (US OTC; Tokyo: 3350). Short history: the ADR line is recent.'}
out = {'source': 'Yahoo Finance daily closes (split-adjusted, USD)', 'source_url': 'https://finance.yahoo.com/',
       'as_of': datetime.date.today().isoformat(), 'series': {}}
for k, s in SYMS.items():
    req = urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{s}?range=10y&interval=1d', headers={'User-Agent': 'Mozilla/5.0'})
    r = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
    d, c = [], []
    for t, v in zip(r['timestamp'], r['indicators']['quote'][0]['close']):
        if v is None: continue
        day = datetime.datetime.utcfromtimestamp(t).date().isoformat()
        if d and d[-1] == day: c[-1] = round(v, 4); continue
        d.append(day); c.append(round(v, 4))
    out['series'][k] = {'d': d, 'c': c, 'note': NOTES.get(k)}
    print(k, len(d), d[0], d[-1], c[-1]); time.sleep(1)
p = pathlib.Path(__file__).resolve().parent.parent / 'members' / 'data' / 'stocks_daily.json'
p.write_text(json.dumps(out, separators=(',', ':')))
print('wrote', p, p.stat().st_size, 'bytes')
