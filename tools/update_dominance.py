#!/usr/bin/env python3
"""Sunday refresh: weekly BTC dominance history (1 year) -> desk.json "dominance".
Source: CoinMarketCap global-metrics historical (free public chart endpoint, daily btcDominance), sampled on Sundays.
Verification: each weekly point is cross-checked as CoinGecko BTC market cap / CMC total market cap; the max gap is stored.
The live figure on the site is CoinGecko /global (within ~0.2pp of CMC). Run: python3 tools/update_dominance.py"""
import json, time, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent; P = ROOT / 'assets/data/desk.json'
UA = {'User-Agent': 'Mozilla/5.0'}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40))
now = int(time.time())
q = get(f'https://api.coinmarketcap.com/data-api/v3/global-metrics/quotes/historical?format=chart&interval=1d&timeStart={now - 400 * 86400}&timeEnd={now}')['data']['quotes']
day = {x['timestamp'][:10]: (x['btcDominance'], x['quote'][0]['totalMarketCap']) for x in q}
last = max(day); d = datetime.date.fromisoformat(last)
while d.weekday() != 6: d -= datetime.timedelta(days=1)   # latest Sunday on file
weeks = []
for i in range(53):
    k = (d - datetime.timedelta(weeks=i)).isoformat()
    if k in day: weeks.append([k, round(day[k][0], 2)])
weeks.reverse()
# cross-check with CoinGecko BTC market caps (free, daily)
cg = get('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365&interval=daily')['market_caps']
cgd = {datetime.datetime.utcfromtimestamp(t / 1000).date().isoformat(): v for t, v in cg}
gaps = [abs(cgd[k] / day[k][1] * 100 - v) for k, v in weeks if k in cgd]
D = json.loads(P.read_text())
D['dominance'] = {'as_of': weeks[-1][0], 'weekly': weeks,
    'src': {'name': 'CoinMarketCap global metrics (daily BTC dominance, Sunday samples)', 'url': 'https://coinmarketcap.com/charts/bitcoin-dominance/'},
    'check': {'points': len(gaps), 'max_gap_pp': round(max(gaps), 2) if gaps else None, 'median_gap_pp': round(sorted(gaps)[len(gaps) // 2], 2) if gaps else None, 'method': 'CoinGecko BTC market cap / CMC total market cap vs CMC btcDominance'},
    '_note': 'Sunday refresh: python3 tools/update_dominance.py. Live value on the site is CoinGecko /global; changes compare it with these weekly points.'}
P.write_text(json.dumps(D, ensure_ascii=False, indent=2) + '\n')
print(len(weeks), weeks[0], weeks[-1], 'cross-check max gap pp', D['dominance']['check'])
