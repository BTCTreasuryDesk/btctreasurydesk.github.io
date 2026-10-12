#!/usr/bin/env python3
"""Sunday refresh: Strategy headline KPIs from strategy.com (official figures only) -> desk.json strategy.kpis.
Sources: api.strategy.com/btc/bitcoinKpis + /mstrKpiData (the JSON behind strategy.com) and the latest row of
the strategy.com/purchases ledger (BTC Yield QTD/YTD, BTC Gain YTD, BTC $ Gain YTD) via headless Chrome.
If a figure can't be read it is left out (never estimated).  Run: python3 tools/update_strategy_kpis.py"""
import json, re, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent; P = ROOT / 'assets/data/desk.json'
H = {'User-Agent': 'Mozilla/5.0', 'Origin': 'https://www.strategy.com', 'Referer': 'https://www.strategy.com/'}
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30))
def num(s):
    s = str(s).strip().replace(',', '').replace('$', '').replace('%', ''); neg = s.startswith('(') and s.endswith(')')
    v = float(s.strip('()')); return -v if neg else v
k = {}
bk = get('https://api.strategy.com/btc/bitcoinKpis'); r = bk['results']
mk = get('https://api.strategy.com/btc/mstrKpiData')[0]
btc_ts = datetime.datetime.fromtimestamp(r['msTimestamp'] / 1000, datetime.timezone(datetime.timedelta(hours=-4))).strftime('%Y-%m-%d %I:%M %p ET')
k['live'] = {'as_of_btc': btc_ts, 'as_of_securities': mk['timeStamp'] + ' ET',
             'btc_held': num(r['btcHoldings']), 'mnav': r['mNav'], 'btc_nav_musd': r['btcNavNumber'],
             'total_reserve_musd': round(r['totalReserve'] / 1e6), 'net_reserve_musd': round(r['netBtcReserve'] / 1e6),
             'amplification': r['amplification'], 'sats_per_share': round(r['satsPerShare']), 'btc_acquired_ytd': round(r['btcAcquiredYtd']),
             'dividend_coverage_yrs': r['totalYearsOfCoverage'], 'market_cap_musd': num(mk['marketCap']), 'ev_musd': num(mk['entVal']),
             'debt_musd': num(mk['debt']), 'pref_musd': num(mk['pref']), 'mstr_close': num(mk['price'])}
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--disable-blink-features=AutomationControlled'])
    pg = b.new_context(user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36').new_page()
    pg.goto('https://www.strategy.com/purchases', wait_until='domcontentloaded', timeout=60000)
    pg.wait_for_function("/\\d+\\t\\d+\\/\\d+\\/\\d{4}/.test(document.body.innerText)", timeout=45000); t = pg.inner_text('body'); b.close()
m = re.search(r'\n(\d+)\t(\d{1,2}/\d{1,2}/\d{4})\t(.*?)\n(?=\d+\t\d{1,2}/\d{1,2}/\d{4})', t, re.S)
tok = re.findall(r'\(?-?\$?[\d,.]+%?\)?', m.group(3))
if len(tok) >= 10:
    d = datetime.datetime.strptime(m.group(2), '%m/%d/%Y').date().isoformat()
    k['ledger'] = {'as_of': d, 'row': int(m.group(1)), 'btc_held': num(tok[3]), 'adso_k': num(tok[4]),
                   'btc_yield_qtd_pct': num(tok[5]), 'btc_yield_ytd_pct': num(tok[6]), 'btc_gain_ytd': num(tok[7]),
                   'usd_gain_ytd_musd': num(tok[8]), 'btc_reserve_musd': num(tok[9])}
tot = re.search(r'BTC Reserve\s\(\$M\)\s+([\d,]+)\s+\$([\d,]+)\s+\$([\d,]+)', t)
if tot: k['totals'] = {'btc_held': num(tot.group(1)), 'avg_cost': num(tot.group(2)), 'total_cost_musd': num(tot.group(3))}
k.update({'retrieved': datetime.date.today().isoformat(), 'src': {'name': 'strategy.com (dashboard + BTC ledger)', 'url': 'https://www.strategy.com/purchases'},
          '_note': 'Official strategy.com figures only. ledger.* = latest ledger row (BTC Yield / Gain are Strategy KPIs; see strategy.com/notes). live.* = dashboard at retrieval time.'})
D = json.loads(P.read_text()); D['strategy']['kpis'] = k; P.write_text(json.dumps(D, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(k, indent=1))
