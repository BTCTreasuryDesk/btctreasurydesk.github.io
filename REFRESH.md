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

### Members toolkit (Sunday)
- Run `python3 tools/update_members_stocks.py` (MSTR, ASST, MPJPY, XXI daily closes -> members/data/stocks_daily.json).
- Edit `members/data/weekly.json` ("This week in the Members desk"): 1-3 editorial items, `new: true` for fresh items. Zone/badge/momentum changes are computed automatically in the browser.
- Metaplanet uses one ticker only: MPJPY (ADR, OTC). SLE (Super League) is a selectable "Metaplanet-related" option only, never ranked; it may become SUPA after the pending Superplanet deal closes.
