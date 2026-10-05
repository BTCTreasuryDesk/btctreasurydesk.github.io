# btctreasurydesk.com

Static site for **BTC Treasury Desk** (YouTube @btctreasurydesk): news and analysis on Bitcoin treasury companies.
Plain HTML/CSS/JS, no framework, no build step needed to host. Pages are pre-rendered from JSON data by a small Python generator.

## Pages
| Path | What it is |
|---|---|
| `/` | Ticker tape, latest episode player (auto-updates from the long-form uploads playlist) + 2 recent episodes, Desk at a glance tiles, network bar, TA gauge, news, takeaways, Saylor card, newsletter, Yield Desk teaser, tools, calendar, leaderboard, Start here, Coming soon, Follow |
| `/dashboard/` | Live BTC price, network stats, sats converter, local stack tracker, Strategy tracker, purchase timeline + what-if, BTC per share (MSTR, ASST), leaderboard top 10, mini charts, TA panel, calendar |
| `/preferreds/` | Preferred Yield Desk: STRC vs SATA, rate history, effective yield / par at your price, dividend estimator, all preferreds table |
| `/companies/` | Strategy (featured #1), Strive (#2), top-10 stats table with callouts and compare mode, share-of-holdings view (tiers, donut, sortable/filterable table), top-20 company cards with badges |
| `/lab/` | Treasury Math Lab: mNAV calculator (equity-only, auto-fills BTC price), months to cover premium, BTC-at-X scenario sliders for MSTR and ASST, STRC/SATA effective yield and par distance. Formulas under each tool. Education only, no price targets. |
| `/saylor/` | The Saylor Desk (unofficial fan resource): quote of the day, verified quote library, Saylor in the news, appearances & interviews, @saylor X embed, timeline, profile |
| `/glossary/`, `/start/`, `/episodes/`, `/resources/` | Glossary, 5-minute guide, episode archive, filings + news + Treasury Quiz + data sources |
| `/about/`, `/subscribe/`, `/privacy/`, `404.html` | Static pages |

Files: `assets/css/style.css`, `assets/js/app.js` (all interactivity), `assets/data/*.json` (all data), `assets/img/`.
`preview/` holds screenshots only (git-ignored; don't deploy). `downloads/` (if present) is for Desk Library files: never link the PDFs publicly; deliver them through your email provider.

## Preview locally
    cd /workspace/btctreasurydesk-site && python3 -m http.server 8765   # open http://127.0.0.1:8765/

## Updating data and pages
The tools live outside the site folder in `/workspace/btctreasurydesk-tools/`:

    python3 update_data.py              # refresh every JSON file, keep old data for any step that fails
    python3 update_data.py --no-browser # skip the strategy.com steps (they need headless Chrome via Playwright)
    python3 update_data.py --rebuild    # refresh, then run generate.py
    python3 generate.py                 # rebuild all pages from assets/data/*.json
    python3 verify.py                   # headless Chrome check: live fetches, TradingView, charts, console errors
    python3 screenshot.py [--all]       # full-page screenshots into preview/ (needs the local server running)

`update_data.py` steps: leaderboard (bitcointreasuries.net), SEC filings (EDGAR, user agent `BTCTreasuryDesk admin@btctreasurydesk.com`),
news (publisher RSS), episodes (YouTube RSS, Shorts filtered out), Strive holdings (weekly 8-Ks), STRC/SATA rate history (EDGAR full-text search),
Strategy ledger and strategy.com metrics (Playwright). Hand-curated files: `episodes.json` takeaways, `preferreds.json`, `calendar.json`,
`quotes.json`, `saylor.json`, `facts.json`; `glossary.json` and `quiz.json` come from `curated_learn.py`.
Add a new Saylor quote only if it is verbatim from a primary source **and the source attributes it to Saylor** (press releases often quote Phong Le or Andrew Kang in the same paragraph block). Non-Saylor lines go in `other_speakers` in `quotes.json`.
More steps: `company details` (BitcoinTreasuries.NET company pages: website, dated holdings changes, 90-day change; Strategy from its own ledger; appends `price_history.json`), `saylor news` (Google News RSS, last 30 days), `strive site` (strive.com holdings line and SATA figures; Playwright).
Hand-curated: `companies_config.json` (TradingView symbols, IR links, one-line descriptions, badge thresholds), `saylor_media.json` appearances/upcoming (news is refreshed automatically), `strive_site.json` (refreshed by the strive site step).

Suggested schedule: run `update_data.py --rebuild` after each Strategy Monday 8-K and before publishing, then commit and push.

## Saylor quote library and speeches (hand-curated)
`assets/data/quotes.json` items: `text` (verbatim), `date`, `date_label`, `type` (x, keynote, sec, podcast, essay, interview), `theme` (property, money, energy, strategy, conviction, predictions, wit), `context` ("what he said at …"), `url`, `excerpt`. Add a quote only after checking it word for word against the linked source. Prediction quotes get the label "Prediction (his view, not ours)" automatically. `saylor_media.json` → `speeches` powers "Great speeches & presentations": summaries in our own words, one verbatim quote, links to the official video, slides or essay. We host no media.

## Saylor appearances (hand-curated)
`assets/data/saylor_media.json` → `appearances` (recent, last ~12 months) and `upcoming`. Add an item only after opening its official source: the organizer's, broadcaster's, podcast's or Strategy's own YouTube upload, or the conference's own speaker page. Leave out listings that appear only on aggregators (for example ConfBase). Fields: `id`, `date` (ET), optional `time_et` for live streams, `kind` (strategy, keynote, tv, podcast, interview), `show`, `topic` (our own one-liner), `channel`, `url`. Upcoming items use `when`, `sort`, `event`, `place`, `topic`, `status`, `url`, `link_label`. When Strategy announces the Q3 2026 earnings date, replace "Date TBA" in `upcoming`.

## Disclaimers (keep them light)
One footer line on every page: "The host owns MSTR and ASST. Education only, not investment advice." The tool and data pages (Lab, Dashboard, Yield Desk, Companies) carry one short `NOTE` under the page intro (`gen_core.NOTE`). Don't add per-block disclaimers; `src()` lines show only the source and date.

## Treasury Math Lab formulas
- mNAV (simple, equity-only) = share price x shares outstanding / (BTC held x BTC price). Strategy's official mNAV uses enterprise value (adds debt and preferreds), so it reads higher.
- Premium = mNAV - 1. Implied BTC price = market cap / BTC held. NAV per share = BTC per share x BTC price.
- Months to cover premium = (mNAV - 1) / (annual BTC Yield / 12). The yield is the reader's own assumption.
- Scenario value per share = BTC per share x chosen BTC price x chosen mNAV.
- Preferred effective yield = stated rate x $100 par / price; par distance = price / $100 - 1.
- Inputs (BTC held, shares, prefilled prices) come from `strategy.json`, `strive_site.json` and `metrics.json` at generate time and are embedded in `<script data-lab-cfg>`.

## Live data in the browser
- BTC price: CoinGecko simple/price → fallback Coinbase Exchange 24h stats → Coinbase spot. Refreshes every 60 s, cached per tab for 60 s, shows "Data unavailable" if all fail.
- Network: mempool.space (block height, fees, difficulty adjustment; halving countdown to block 1,050,000).
- Stock quotes, charts, ticker tape and TA gauges: TradingView widgets (lazy-loaded; attribution kept). Stocks have no free CORS JSON quote, so the site doesn't compute from live MSTR/ASST prices.

## Company badges (tunable)
Thresholds live in `assets/data/companies_config.json` → `badges`; re-run `generate.py` after editing:

    "holdings_window_days": 90,   "fast_growing_pct": 25,   "reducing_pct": -10,
    "price_window_days": 30,      "price_window_tolerance_days": 5,   "price_move_pct": 30

- **Fast-growing** (orange ▲): BTC holdings up ≥ `fast_growing_pct` over `holdings_window_days`.
- **Reducing** (red ▼): BTC holdings down ≤ `reducing_pct` over the window.
- **Price ±X% 30d** (gray): share price moved ≥ `price_move_pct` over `price_window_days`, from our own daily snapshots in `price_history.json` (needs ~30 days of daily `update_data.py` runs before it can appear).
- The holdings change compares today's BTC with the last *dated* balance on/before the window start. No dated baseline → no badge. The page explains this under "How badges work".

## Newsletter config (provider-agnostic)
At the top of `assets/js/app.js`:

    var DESK_CONFIG = { newsletterAction: '', newsletterEmailField: 'email', ... }

- Leave `newsletterAction` empty until sign-ups open: submitting shows "Signups open soon" and nothing is stored or sent.
- To go live, paste your provider's form POST URL (Buttondown, Kit/ConvertKit, MailerLite, Beehiiv embed, etc.) and set the email field name it expects (Kit uses `email_address`). The optional checkbox posts `products_optin=yes`; map it to a tag/field in your provider.
- Set up a double opt-in email in the provider that delivers the Desk Library. Update `/privacy/` with the provider's name once chosen.
- Desk Library covers are resized from `downloads/preview-*.png` into `assets/img/library/<key>.webp` (keys: cheat-sheet, preferred-playbook, saylor-playbook, glossary, data-sources, whitepaper, by-the-numbers; 7 cards). A card without a preview shows a CSS mockup; drop `downloads/preview-mstr-asst-by-the-numbers-1.png` in and re-run `generate.py` to use the real cover for MSTR & ASST by the Numbers. `downloads/` itself is git-ignored so the PDFs are never published; upload them to your email provider instead.

## Social placeholders
TikTok / Instagram / Facebook links are commented out in the footer (`gen_chrome.py`). Uncomment once handles are final.

## Deploy: GitHub Pages + Porkbun DNS
1. Push this folder to a public GitHub repo (e.g. `btctreasurydesk-site`).
2. Repo → Settings → Pages → Deploy from branch `main`, folder `/ (root)`. Custom domain: `btctreasurydesk.com` (the `CNAME` file sets it).
3. Porkbun → Domain Management → DNS: delete the default parking records (ALIAS/CNAME to pixie.porkbun.com), then add
   - `A` @ → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - `AAAA` @ → 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 (optional)
   - `CNAME` www → `<github-username>.github.io`
4. Once DNS resolves, tick **Enforce HTTPS** in Settings → Pages.

Education only, not investment advice. © 2026 BTC Treasury Desk
