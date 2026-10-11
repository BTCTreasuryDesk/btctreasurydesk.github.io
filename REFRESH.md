# Sunday refresh

Once a week (Sunday, ET), refresh the two data files the live desk reads. Everything else on the home page (prices, dominance, Fear & Greed, models, Model Zones) is computed in the visitor's browser from these files plus live public APIs.

1. **Update `assets/data/desk.json`** with the week's sourced numbers:
   - `updated` / `refresh`: today's date.
   - `episode` and `video_of_week`: latest episode (title, number, date, length, YouTube id/url, Shorts) and the Video of the Week.
   - `strategy` and `strive`: BTC held, as-of date, last reported purchase (date, BTC), avg cost, mNAV, sats per share, with source names and URLs (strategy.com, SEC 8-Ks, Strive filings).
   - `preferreds`: Friday close price and stated rate for each preferred, with sources.
   - `onchain.realized_price`: latest realized price (feeds MVRV) with its as-of date and source.
   - `treasuries`: top-10 holdings table, as-of date and source.
   - `week_ahead`: dated events for the coming week (ET).
   Check the JSON is valid: `python3 -m json.tool assets/data/desk.json > /dev/null`.
2. **Update BTC history:** `python3 tools/update_btc_history.py`. This rewrites `assets/data/btc_daily.json` with Coinbase daily closes (used for Power Law, 200WMA, Mayer Multiple, Pi Cycle, S2F and Model Zones).
3. **Check locally:** `python3 -m http.server 8765` in the repo root, open http://127.0.0.1:8765/, confirm the panels fill in and the Model Zones panel reads sensibly.
4. **Commit and push to `main`.** GitHub Pages redeploys btctreasurydesk.com in a minute or two.

Rules: every number carries a source, no "buy"/"sell" signal wording, and the line "Model read. Education only, not investment advice." stays on the Model Zones panel.
