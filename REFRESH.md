# Sunday refresh

Once a week (Sunday, ET), refresh the two data files the live desk reads. Everything else on the home page (prices, dominance, Fear & Greed, models, Model Zones) is computed in the visitor's browser from these files plus live public APIs.

1. **Update `assets/data/desk.json`** with the week's sourced numbers:
   - `updated` / `refresh`: today's date.
   - `episode` and `video_of_week`: latest episode (title, number, date, length, YouTube id/url, Shorts) and the Video of the Week.
   - `strategy` and `strive`: BTC held, as-of date, last reported purchase (date, BTC), avg cost, mNAV, sats per share, with source names and URLs (strategy.com, SEC 8-Ks, Strive filings).
   - `preferreds`: Friday close price and stated rate for each preferred, with sources.
   - `onchain.realized_price`: latest realized price (feeds MVRV) with its as-of date and source.
   - `treasuries`: Treasury Board pool, the top 50 ranked public companies by BTC held from BitcoinTreasuries.NET (name, ticker, TradingView symbol, BTC, country, type, mNAV only where a source shows it, last add date), with as-of date and notes. Never fill in a number without a source; use null for unknown.
   - `week_ahead`: dated events for the coming week (ET).
   Check the JSON is valid: `python3 -m json.tool assets/data/desk.json > /dev/null`.
2. **Update BTC history:** `python3 tools/update_btc_history.py`. This rewrites `assets/data/btc_daily.json` with Coinbase daily closes (used for Power Law, 200WMA, Mayer Multiple, Pi Cycle, S2F and Model Zones).
3. **Check locally:** `python3 -m http.server 8765` in the repo root, open http://127.0.0.1:8765/, confirm the panels fill in and the Model Zones panel reads sensibly.
4. **Commit and push to `main`.** GitHub Pages redeploys btctreasurydesk.com in a minute or two.

Rules: every number carries a source, no "buy"/"sell" signal wording, and the line "Model read. Education only, not investment advice." stays on the Model Zones panel.

## Standing rules (added Oct 11, 2026)

### Video of the Week (required every Sunday)
1. Feature exactly one Michael Saylor YouTube video. First choice: a new interview or talk from the past 7 days on an official or reputable channel (Strategy, Saylor's own posts on michael.com / X, major media, conference channels). Never a re-upload or clip channel.
2. If there is no new one, use the newest Saylor video that is NOT in `featured_history` in `assets/data/desk.json`. Nothing repeats.
3. Verify the ID resolves (e.g. `yt-dlp --skip-download --print "%(upload_date)s|%(channel)s|%(title)s" <url>`), then update `video_of_week` (id, title, channel, date, url) and append `{id, title, week}` to `featured_history`.
4. Keep `video_of_week.more` pointing to https://www.michael.com/interviews (Saylor's official site, verified Oct 2026) and `video_of_week.strategy_link` to https://www.strategy.com/.

### strategy.com is the primary source for Strategy numbers
- Holdings, BTC Yield, mNAV, sats per share and preferred data (STRC, STRF, STRK, STRD) come from strategy.com first (dashboard, /purchases ledger, preferred pages); SEC 8-Ks confirm. Link strategy.com from every Strategy/MSTR panel and the video section.
- BTC Yield: show Strategy's official BTC Yield KPI from strategy.com (add `strategy.btc_yield_ytd` with as-of date and source to desk.json each Sunday) instead of computed BTC-per-share math. The Spotlight's ledger-based figure is a fallback only until that field exists.

### Members toolkit (Sunday)
- Run `python3 tools/update_members_stocks.py` (MSTR, ASST, MPJPY, XXI, MARA, COIN daily closes -> members/data/stocks_daily.json, plus members/data/last_closes.json for the home price scroll and strip picker).
- Edit `members/data/weekly.json` ("This week in the Members desk"): 1-3 editorial items, `new: true` for fresh items. Zone/badge/momentum changes are computed automatically in the browser.
- Metaplanet uses one ticker only: MPJPY (ADR, OTC). SLE (Super League) is a selectable "Metaplanet-related" option only, never ranked; it may become SUPA after the pending Superplanet deal closes.

## Home top strip, opt-in and "New this week" (added Oct 11, 2026)
- Top strip is automatic and uniform (all tiles the same size): BTC first (fixed, live 24/7), MSTR second (fixed, subtle orange accent, "Market closed" tag outside regular US hours), then the #2–#10 public companies by BTC held from `desk.json` → `treasuries.rows`, plus an "All 50" link tile. Keep holdings current and the strip follows. Visitors' own swaps are saved per tile (`btd_strip2`) and override only those tiles. Tiles are our own compact quotes (no per-tile widgets): stocks from CNBC's public quote feed (CORS, real-time for US listings, "delayed" tag otherwise), BTC/ETH/SOL from Coinbase Exchange 24h stats (CoinGecko fallback), polled every 60s; fallback is `members/data/last_closes.json` labeled "last close". Each tile opens the TradingView chart. Phone: BTC + MSTR on top, the rest swipe two tiles at a time.
- One Kit form for home + /members/ (`assets/js/optin.js`). Choices are Kit tags (ids in `members/members-config.js` → `KIT_TAGS`): weekly, monthly, alerts, and one per Library PDF. One subscriber per email; re-signing just adds tags. Nothing is pre-checked; no popups.
- Email limits we promise on the form: max 1 email/week. New-material alerts are bundled into at most one email a week. Every email must include the Kit preferences link (change choices / weekly vs monthly) and the one-click unsubscribe.
- Each Sunday edit `members/data/weekly.json` → `fresh`: `tools` (Members tab ids) and `library` (cheat, prefs, numbers, data, glossary, whitepaper, quotes) that are new or materially updated this week; clear last week's. These drive the "New this week" badges and the "You're in" box. Never mark something new that isn't.
- NEVER run the old v1 generator (`/workspace/btctreasurydesk-tools/*.v1-disabled`). It overwrites the v2 pages. Pushes from the site checkout need `DESK_PUSH_OK=1` (pre-push hook).

## Preferreds Desk (home, `desk.json` → `prefs_desk`; added Oct 11, 2026)
- Each Sunday: update `close`/`prev` (last two daily closes) and `price_as_of` for STRC, STRF, STRK, STRD, SATA; rates (STRC and SATA are variable and change by 8-K); payment schedule; `next_ex` (record date = ex-date under T+1) only when declared in an issuer 8-K or press release, otherwise null with a note. Live price and day change come from TradingView in the browser.
- Seniority (Strategy 10-Q liquidation order): STRF > STRC > STRE > STRK > STRD. Re-check after any new series.
- `upcoming`: newly announced or pending preferred offerings and term changes from Strategy, Strive or other treasury companies. Official sources only (issuer press release, 8-K/6-K, proxy, prospectus), with date, status and link. Remove items once completed (move a new listed series into `rows`).
- Weekly news check: search for new preferred series, ATM programs for preferreds, rate changes and dividend declarations (Strategy, Strive, Metaplanet, other treasury companies) and update `rows`/`upcoming` from the official filing.
- After editing `calendar.json`, run `python3 tools/build_calendar.py` (rebuilds the dashboard Calendar).
- **Preferreds watch list (every Sunday): The Smarter Web Company (SWC) and Metaplanet (3350).** Check their IR pages, RNS (LSE/Aquis) or TSE timely disclosures, and official X posts for planned or new preferred shares. Only when verified by a filing, IR release or official post: add an `upcoming` row (date, status, source link) AND a `calendar.json` item for any dated step (vote, pricing, listing, first dividend). Once a series lists, give it a full `rows` entry (rate, par, payment schedule, seniority, next ex-date). No rumor, media-only or unverified entries.


## Strategy KPIs, live mNAV, What changed, Company Compare, Price scroll (added Oct 11, 2026)
Order matters; do these after the normal data steps.
1. **Board snapshot first.** Before you overwrite `desk.json → treasuries.rows`, copy each row's current `btc` and `rank` into `treasuries.prev.rows[tk]` and set `treasuries.prev.as_of` to the old `treasuries.as_of`. This drives "Board movers" and "BTC buys" in *What changed this week*. Then update the rows.
2. **Public-company total:** update `treasuries.public` (`total_btc`, `count`, `strategy_btc`, `as_of`) from the BitcoinTreasuries.NET headline, same retrieval date. It feeds the market-wide row above the KPI tiles and "share of public BTC" in Compare.
3. **Strategy KPIs:** `python3 tools/update_strategy_kpis.py` → `desk.json → strategy.kpis` (official strategy.com figures only: api.strategy.com JSON behind the dashboard + the latest row of strategy.com/purchases for BTC Yield QTD/YTD, BTC Gain YTD, BTC $ Gain YTD; ledger totals for avg cost and total cost). If a figure can't be read the script leaves it out; never type in an estimate. Show the values exactly as published, negative included. Also keep `strategy.mnav`, `btc_held`, `btc_as_of` in step with it.
4. **Prices for Compare:** `python3 tools/update_perf.py` → `assets/data/perf.json` (YTD and 1Y per board ticker; Metaplanet uses Tokyo 3350 in JPY; moves below −95% are withheld as unverifiable). Run after step 1.
5. **mNAV history** needs nothing extra: it is built in the browser from `members/data/stocks_daily.json` (run `tools/update_members_stocks.py`), `assets/data/strategy.json` (ledger rows with ADSO) and `assets/data/btc_daily.json`. Check the chart's last date matches the latest Friday close.
6. **What changed this week** is computed from `desk.json` (prev vs rows, `prefs_desk.upcoming`) + `members/data/weekly.json` (items with `new:true`) + btc_daily (model badges). Keep `prefs_desk.upcoming` current; edit `weekly.json` items.
7. **Price scroll** reads the top 20 by BTC held from `treasuries.rows` (+ ASST and SWC always) and every series in `prefs_desk.rows`, so a new verified preferred added there appears automatically. Live quotes come from CNBC; ETH and SOL appear only at the very end of the scroll (nowhere else prominent).
8. **Home order** (top-down): price tiles → market-wide row + Strategy (MSTR) KPIs → MSTR mNAV (live + history) + What changed → Treasury Board → Preferreds Desk → chart + Model Zones → models + BTC vs the field → Latest episode / Video of the Week → Strategy & Strive, Week ahead → email box → links. Full KPI panel + Spotlight live on /strategy/#strategy-kpis. Company Compare lives on /companies/#compare (linked from the Board header).

## Saylor quotes (standing step, added Oct 11, 2026)
Every weekly refresh, or an ad hoc refresh if more than a week has passed since `assets/data/quotes.json → as_of`:
1. Add relevant new Michael Saylor quotes from the past week, plus strong older ones if the week is thin, to `assets/data/quotes.json → items`. Sources must be verified: his X posts (x.com/saylor), official interviews and keynotes (the original video or the outlet's own page), strategy.com, or Strategy filings and press releases. Never use aggregator or "quote" sites.
2. Each item needs the exact verbatim `text`, `date` (ISO) and `date_label`, a `url` to the original source, `type`, `theme`, `context` and `verified: true`. Only quote what the source actually says, word for word.
3. No duplicates: before adding, check whether the same text (or a near copy from the same day) is already there. Keep one entry with the best source.
4. The newest quote by `date` automatically becomes the home and Strategy-tab quote (Spotlight on /saylor/). Pick it so that the newest entry is a strong, on-topic one. Bump `quotes.json → as_of`.
5. If the Saylor page's static quote list needs the new entries, edit `saylor/index.html` by hand (the v1 generator is disabled; see the tools README).

## BTC dominance history + home Charts (added Oct 11, 2026)
- **Dominance:** `python3 tools/update_dominance.py` → `desk.json → dominance` (53 weekly Sunday points from CoinMarketCap's free global-metrics history). The script cross-checks every point as CoinGecko BTC market cap ÷ CMC total market cap and stores the gap in `dominance.check`. If `median_gap_pp` goes above 0.3, stop and investigate before pushing. The live value on the site is CoinGecko `/global`; 7d/30d/90d/1Y changes compare it with these weekly points.
- **Preferred yield history:** `python3 tools/update_pref_history.py` → `members/data/prefs_weekly.json` (weekly closes for fixed-rate STRF, STRK, STRD; yields computed in the browser). If Strategy issues a new fixed-rate series, add it to `RATES` in the script. Variable-rate STRC and SATA stay out until their past rates are stored.
- **Charts tabs** (home, `assets/js/charts.js`) read only existing files: stocks_daily, btc_daily, strategy.json ledger, desk.json board, prefs_weekly. Nothing to edit by hand; check each tab once after the refresh.

## Customizable tiles + Price scroll (standing rule)
- Defaults are code-driven and follow desk.json each Sunday: tiles = BTC, MSTR (fixed), then #2-#10 by BTC held; scroll = top 20 + ASST/SWC, all preferreds (incl. any new prefs_desk row), key data, then ETH, SOL. Never change defaults to suit a visitor.
- Visitor choices live only in their browser: tiles `btd_strip2` (per-slot overrides, incl. moves), scroll `btd_tk2` (ordered list). "Reset" removes the key. Typed tickers are validated against the CNBC quote feed (US tickers, or EXCHANGE:SYMBOL for LSE/TSE/HKEX/XETR/TSX/ASX/EURONEXT).
- If a new data item is added to the scroll, add it to TKD/TKDL in desk.js so it shows in the picker's "Data items" group.

## News of the Week (every Sunday)
- Source of truth: `desk.json → news_week` (home card, below the live panels, above the email box). Archive: `assets/data/news_archive.json` → /news/ ("Past weeks").
- Order: FIRST append last week's whole `news_week` object to the top of `news_archive.json → weeks[]`, THEN replace `news_week` with the new week (`week_of` = Monday ISO, `label` e.g. "Oct 12 – 18, 2026", `as_of`).
- Max 8 items, material only: BTC buys/holdings changes, capital raises and buybacks, new preferreds and converts, earnings dates, big regulatory/macro events, major company launches. Skip price chatter, opinion, alts, hacks unless they hit treasury companies.
- Each item: `cat` (strategy = Strategy & Saylor | treasury = 'Other treasury companies' (label on the site): other big treasury companies: Strive/ASST, Metaplanet, etc. | industry = sector-wide: index decisions, preferred/convert markets, smaller companies, treasury-relevant regulation | bitcoin = price milestones, network, ETFs, adoption, crypto/macro rules; shown in that order, empty groups hidden; pick the most material items from each), `date` (ISO), `text` (one line, numbers as published), `src {name, url}` (official first: SEC/TSE filing, company release, regulator, index provider; Farside for ETF flows). Mark exactly 3 items `"top": 1` (shown when the card is collapsed). Upcoming events are allowed if dated and sourced ("Coming: …").
- Visitor open/closed state is saved in `btd_news_open`; nothing to change at refresh.

## Home layout (standing rules)
- Main chart slot = Charts section (`charts.js` + `price.js`): Price (BTC log, 1Y default; BTC / MSTR / BTC vs MSTR; layers 200W MA, Power Law, Strategy buys, halvings) and the Chart library (mNAV history, MSTR vs BTC, Strategy holdings, BTC dominance, BTC/ETH·BTC/SOL, Models & cycle, Preferred yields, Treasury BTC). Choices saved: btd_ctab, btd_cper, btd_pmode, btd_play, btd_cview, btd_cgrid.
- mNAV card is compact (live, official, 1Y percentile, sparkline); full history = Chart library "mNAV history".
- Customize desk (`layout.js`): sections can be hidden/reordered (btd_layout); export/import covers only whitelisted desk keys, never membership or email state. New home sections must be added to SECS in layout.js. Default-hidden: the old TradingView live chart (kept for Desk Mode).
- ETH/SOL appear only in the Price scroll and the BTC/ETH·BTC/SOL ratio chart; no altcoin section on home.

## Other treasury companies (standing rule)
Strategy is the benchmark, but cover other treasury companies sitewide wherever it makes sense (board, compare, preferreds, calendar, cheat sheet, news). Their major news (BTC buys, capital raises, preferreds, index decisions, earnings) goes in News of the Week under **Other treasury companies** (`cat: "treasury"`).

## Desk Library PDFs (every Sunday, after desk.json is refreshed)
- Run `python3 tools/build_library.py`. It rebuilds the three data-driven PDFs from verified site data (Treasury Company Cheat Sheet from desk.json treasuries/strategy/strive + strive.json; Strategy Preferreds Guide from prefs_desk rows + upcoming; Long-Term Cycle Playbook from the site's own model math on btc_daily.json + mempool.space block height), regenerates their cover previews, and rewrites the Library lists in `optin.js` (opt-in picker), `resources/index.html`, `subscribe/index.html` and the Members download center, plus every "(N downloads)" count. File names are stable, so links never change.
- The script's `LIBR` list is the single source for titles, 1-line benefit, file type and updated date. Order: the three data-driven downloads first, the glossary ("Speak Treasury") last as a minor extra. The old Preferred Stock Playbook is superseded by the Strategy Preferreds Guide and no longer listed (file kept so old links don't 404).
- Check page counts in the output (Cheat Sheet must stay 1 page). Add any new or materially updated keys to `members/data/weekly.json → fresh.library`. Kit tags: `lib_<key>` in members-config.js KIT_TAGS.

## Tip the Desk (standing rule)
- Quiet only: one footer link ("Tip the Desk" → /tip/) and a small card in Members. No popups, no nags, no banners.
- /tip/ shows "Tip on X" (X Money via https://x.com/BTCTreasuryDesk). Lightning and on-chain slots stay hidden until the owner fills `TIP.lightning` / `TIP.onchain` in `members/members-config.js`. Never invent or paste an example address.
- YouTube: add ONE line to the standard description template (with the channel links block), not a separate push in every episode:
  `Support the Desk (optional): https://btctreasurydesk.com/tip/`

## Movers & Makers (every Sunday, after the board rows + treasuries.prev are updated)
1. `python3 tools/update_perf.py` (YTD/1Y + 1W/1M moves, 52-week range, 200-day state/cross, BTC reference).
2. `python3 tools/movers.py`: writes `assets/data/movers.json` (full ranked list; home card shows the top 5) and `desk.json → movers_week` (top 3 with a one-line "why"; use it for the Sunday episode segment).
- Rules (in the script): |1W| ≥ 10%, |1M| ≥ 20%, new 52-week high/low, 200-day cross in the last 5 sessions, 1M strength vs BTC ≥ 15 pts, reported additions ≥ 1,000 BTC or +5%. Moves over 80% (1M) are skipped as likely splits/ticker changes. Wording stays descriptive: never buy/sell language.

## Home order + live chart (standing rules, Oct 11 2026)
- **Full Desk default order** (layout.js `SECS`): tiles (BTC + MSTR fixed, then top holders) → compact Strategy KPI row (BTC Gain, $ Gain, BTC Yield, holdings, mNAV; the rest behind "More KPIs") → live chart card → Quick glance (dominance trend, BTC/ETH + BTC/SOL, Fear & Greed, distance from ATH, halving countdown) → Movers & Makers + Coming up → Preferreds Desk → Video of the Week + latest episode → News of the Week → email box → Charts (library) → Treasury Board → mNAV card → What changed → Strategy & Strive → Model Zones → Models → links.
- **Live chart card** (`assets/js/live.js`, `btd_live`): modest size. `Live` mode = BTC 24/7 from Coinbase Exchange (candles + ticker every 5s), line/area/candles, 1D/1W/1M/1Y, thin day-open line, "since you opened the page" readout, MSTR side-quote. MSTR: CNBC real-time in US market hours, otherwise "Market closed · last close". MSTR is never blank: with no intraday history, 1D shows the last 10 daily closes (from `members/data/stocks_daily.json`) until live prices build up. `Long-term` mode = the overlays/models chart (price.js) with a live current-price dot + label. No data to refresh by hand; keep stocks_daily.json fresh on Sundays.
- **Desk Mode layouts** (`btd_dml`, per device, not exported): Grid / Focus (tiles + KPIs + live chart big) / Ticker wall (tiles + board + movers).

## Desk music (standing rule)
- Off by default, never autoplays; remembers track, volume and playback mode (`btd_music`: Play all (default, continuous with a 2.5s crossfade) / Shuffle / Repeat one), never the playing state. Prev/next buttons.
- Tracks: `assets/audio/tracks.json` lists the slots (Lo-fi `lofi.mp3`, Ambient `ambient.mp3`, Chill electronic `chill-electronic.mp3`, Late-night jazz `late-night-jazz.mp3`). Copy MP3s from `/workspace/desk-music/` into `assets/audio/` using those names. Only files that exist are offered; the Music button stays hidden until at least one exists.
- Only royalty-free or licensed tracks; put the credit line in `credit`. Keep files small (128 kbps, a few MB).

## Legal pages (standing rule)
- `/terms/` (Terms of Use) and `/privacy/` are plain-English and dated ("Last updated"). Update the date whenever you change them.
- **Before any paid launch, have a lawyer review /terms/ and /privacy/** (billing, cancellation and refund terms; Florida governing law; liability limits; any analytics actually in use). The billing/refund section is a placeholder until paid plans exist.
- Analytics wording says "if we use any, cookieless (such as GoatCounter)". If GoatCounter is installed, change both pages to state it plainly.

## Home dedupe (standing rule, Oct 12 2026)
- The long-term BTC chart with models/overlays lives ONLY in the top chart card (Long-term mode). The Charts library holds only charts not shown above: mNAV history, Strategy holdings, BTC per share, Treasury BTC, Preferred yields, MSTR vs BTC, Company compare. Dominance and BTC/ETH, BTC/SOL live in Quick glance.
- Default-hidden (addable via Customize desk): old TradingView chart, compact mNAV card (mNAV is in the KPI row + Charts), What changed this week (covered by Movers + News).
- News of the Week: no "material only" label or filter (every item is material by rule). Groups: Strategy & Saylor / Other treasury companies / Industry & Bitcoin, Top story first; empty groups are hidden.

## Analyst Views + Sentiment gauges (every Sunday)
- Run `python3 tools/update_analysts.py`. It writes `assets/data/analysts.json`: consensus per company from Nasdaq.com's public analyst API (buy/hold/sell, average/low/high 12-month target, monthly consensus history), per-firm latest rating + target from MarketBeat's public forecast page (last 12 months, with change kind: upgrade, downgrade, initiation, target raised/cut, new target, reiterated), a weekly average-target history rebuilt from those dated actions, and one snapshot per week (26 kept).
- Coverage: US-listed treasury pure-plays + miners from the Board top 20, plus ASST; shown only with 3+ analysts (no coverage = hidden). MSTR always first. Items dated within the last week are flagged "this week".
- Notable notes: curate 2-6 recent notes per company in `NOTES` (date, firm, action, from/to, one line, source link). Public reports only; never invent. Drop notes older than ~2 months.
- Street Sentiment = 60% ratings mix + 40% average-target upside (method shown in the ⓘ). Funding heat = OKX BTC-USDT perp funding, live in the browser. Fear & Greed stays separate. Treasury mNAV mood and social buzz are not shown until broad, free, verifiable data exists.
- Label everywhere: "Third-party views, not ours · education only".

## Added Oct 18, 2026 (live desk revision)
- Weekly: `python3 tools/update_stock_hist.py` (daily closes for charts, writes assets/data/stocks_hist.json).
- Weekly: append this week's BTC-per-share snapshot to `assets/data/bps_history.json` (same shape as the 2026-10-04 entry; one object per date, ticker -> btc_per_share_basic from leaderboard.json).
- Weekly: append Strategy's new ledger row to `assets/data/strategy.json` purchases and update `desk.json` strategy (btc_held, btc_as_of, avg_cost, total_cost_usd, sats_per_share, btc_src) from the 8-K Ex. 99.1.
- Weekly: prune past items from `desk.json` week_ahead (the site also hides past dates automatically).
- Library: after desk.json updates run `python3 tools/build_library.py`; for the static PDFs edit `downloads/src/build_*.py`, run `render.py <name>` and copy to `library-files/f31a01ec624a/<name>-<hash>.pdf`.
- Music: set `"ready": true` in `assets/audio/tracks.json` only after the MP3 is uploaded to assets/audio/.
- Live data is client-side only (Coinbase WS, CNBC quote service, CoinGecko, DefiLlama). No API keys, no AI credits.

- Context references for live tiles (5D sparklines, 1y avg / 1 mo ago / 52w range reads): `python3 tools/update_ctx.py` (writes assets/data/ctx.json).
- `tools/update_prefs_kpi.py` (weekly): Strategy preferreds from strategy.com KPI JSON + effective-yield history -> assets/data/prefs_kpi.json (tokenized panel preferreds).
- `tools/update_keydates.py` (weekly, after update_prefs_kpi.py): FOMC (Fed), CPI + jobs (BLS), Strategy preferred dividend dates -> assets/data/keydates.json (Key dates panel, strip headlines).
