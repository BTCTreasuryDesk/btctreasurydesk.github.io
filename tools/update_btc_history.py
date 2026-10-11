#!/usr/bin/env python3
"""Weekly refresh: BTC-USD daily closes from Coinbase Exchange public candles API -> assets/data/btc_daily.json.
Used client-side for 200WMA, Mayer Multiple, Pi Cycle Top, Power Law. Run at the Sunday refresh."""
import json, time, urllib.request, datetime as dt, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'data', 'btc_daily.json')
start = dt.datetime(2015, 7, 21, tzinfo=dt.timezone.utc)
end = dt.datetime.now(dt.timezone.utc)
rows = {}
t = start
while t < end:
    t2 = min(t + dt.timedelta(days=299), end)
    url = ('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400&start=%s&end=%s'
           % (t.strftime('%Y-%m-%dT%H:%M:%SZ'), t2.strftime('%Y-%m-%dT%H:%M:%SZ')))
    req = urllib.request.Request(url, headers={'User-Agent': 'btctreasurydesk-refresh'})
    for c in json.load(urllib.request.urlopen(req, timeout=30)):
        d = dt.datetime.fromtimestamp(c[0], dt.timezone.utc).strftime('%Y-%m-%d')
        rows[d] = round(c[4], 2)
    t = t2
    time.sleep(0.4)
days = sorted(rows)
json.dump({'source': 'Coinbase Exchange BTC-USD daily candles (UTC close)', 'source_url': 'https://api.exchange.coinbase.com/products/BTC-USD/candles',
           'as_of': days[-1], 'start': days[0], 'closes': [rows[d] for d in days]}, open(OUT, 'w'), separators=(',', ':'))
print(len(days), days[0], days[-1])
