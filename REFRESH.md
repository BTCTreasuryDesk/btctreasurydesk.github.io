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


## Strategy KPIs, live mNAV, What changed, Company Compare, Price scroll (added Oct 11, 2026)
Order matters; do these after the normal data steps.
1. **Board snapshot first.** Before you overwrite `desk.json → treasuries.rows`, copy each row's current `btc` and `rank` into `treasuries.prev.rows[tk]` and set `treasuries.prev.as_of` to the old `treasuries.as_of`. This drives "Board movers" and "BTC buys" in *What changed this week*. Then update the rows.
2. **Public-company total:** update `treasuries.public` (`total_btc`, `count`, `strategy_btc`, `as_of`) from the BitcoinTreasuries.NET headline, same retrieval date. It feeds the market-wide row above the KPI tiles and "share of public BTC" in Compare.
3. **Strategy KPIs:** `python3 tools/update_strategy_kpis.py` → `desk.json → strategy.kpis` (official strategy.com figures only: api.strategy.com JSON behind the dashboard + the latest row of strategy.com/purchases for BTC Yield QTD/YTD, BTC Gain YTD, BTC $ Gain YTD; ledger totals for avg cost and total cost). If a figure can't be read the script leaves it out; never type in an estimate. Show the values exactly as published, negative included. Also keep `strategy.mnav`, `btc_held`, `btc_as_of` in step with it.
4. **Prices for Compare:** `python3 tools/update_perf.py` → `assets/data/perf.json` (YTD and 1Y per board ticker; Metaplanet uses Tokyo 3350 in JPY; moves below −95% are withheld as unverifiable). Run after step 1.
5. **mNAV history** needs nothing extra: it is built in the browser from `members/data/stocks_daily.json` (run `tools/update_members_stocks.py`), `assets/data/strategy.json` (ledger rows with ADSO) and `assets/data/btc_daily.json`. Check the chart's last date matches the latest Friday close.
6. **What changed this week** is computed from `desk.json` (prev vs rows, `prefs_desk.upcoming`) + `members/data/weekly.json` (items with `new:true`) + btc_daily (model badges). Keep `prefs_desk.upcoming` current; edit `weekly.json` items.
7. **Price scroll** reads the top 20 by BTC held from `treasuries.rows` (+ ASST and SWC always) and every series in `prefs_desk.rows`, so a new verified preferred added there appears automatically. Live quotes come from CNBC; ETH and SOL appear only at the very end of the scroll (nowhere else prominent).
8. **Home order** (top-down): price tiles → market-wide row + Strategy (MSTR) KPIs → MSTR mNAV (live + history) + What changed → Treasury Board → Preferreds Desk → chart + Model Zones → models + BTC vs the field → Latest episode / Video of the Week → Strategy & Strive, Week ahead → email box → links. Full KPI panel + Spotlight live on /saylor/#strategy-kpis. Company Compare lives on /companies/#compare (linked from the Board header).

## Saylor quotes (standing step, added Oct 11, 2026)
Every weekly refresh, or an ad hoc refresh if more than a week has passed since `assets/data/quotes.json → as_of`:
1. Add relevant new Michael Saylor quotes from the past week, plus strong older ones if the week is thin, to `assets/data/quotes.json → items`. Sources must be verified: his X posts (x.com/saylor), official interviews and keynotes (the original video or the outlet's own page), strategy.com, or Strategy filings and press releases. Never use aggregator or "quote" sites.
2. Each item needs the exact verbatim `text`, `date` (ISO) and `date_label`, a `url` to the original source, `type`, `theme`, `context` and `verified: true`. Only quote what the source actually says, word for word.
3. No duplicates: before adding, check whether the same text (or a near copy from the same day) is already there. Keep one entry with the best source.
4. The newest quote by `date` automatically becomes the home and Strategy-tab quote (Spotlight on /saylor/). Pick it so that the newest entry is a strong, on-topic one. Bump `quotes.json → as_of`.
5. If the Saylor page's static quote list needs the new entries, edit `saylor/index.html` by hand (the v1 generator is disabled; see the tools README).
