"""Rebuild the dashboard Calendar list (dashboard/index.html #calendar) from assets/data/calendar.json. Run at the Sunday refresh after editing calendar.json."""
import json, re, html, datetime
C = json.load(open('assets/data/calendar.json'))
def d(s): return datetime.date.fromisoformat(s).strftime('%b %-d, %Y')
e = lambda s: html.escape(str(s), quote=True)
li = []
for i in C['items']:
    dt = d(i['date']) + (' – ' + d(i['end']) if i.get('end') else '')
    det = '<br><small class=muted>' + e(i['detail']) + '</small>' if i.get('detail') else ''
    li.append(f'<li><span class="cal-d mono">{dt}</span><span><b>{e(i["company"])}</b> · {e(i["title"])}{det}</span><a class="mono" href="{e(i["url"])}" target="_blank" rel="noopener">{e(i["source"])}</a></li>')
for n in C.get('not_announced', []):
    li.append(f'<li><span class="cal-d mono">TBA</span><span><b>{e(n["company"])}</b> · {e(n["item"])}: not yet announced<br><small class="muted">{e(n["note"])}</small></span><a class="mono" href="{e(n["url"])}" target="_blank" rel="noopener">Issuer site</a></li>')
new = '<ul class="cal">' + ''.join(li) + '</ul><p class="src">Source: issuer filings and official announcements (SEC EDGAR, LSE RNS, TSE) · As of ' + C['as_of'] + '</p>'
p = 'dashboard/index.html'; s = open(p).read()
s2, n = re.subn(r'<ul class="cal">.*?</ul><p class="src">.*?</p>', lambda m: new, s, count=1, flags=re.S)
assert n == 1; open(p, 'w').write(s2); print(len(li), 'calendar rows')
