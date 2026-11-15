# FoodCoin — $FOOD

A Solana memecoin with a dinner plan: 100% of creator fees go, locked on-chain, through donate.gg to Feeding America.

- Site: `index.html`, `styles.css`, `main.js` (animations), `meter.js` (Meal Meter client), assets in `assets/`.
- Motion: GSAP + ScrollTrigger + Lenis, self-hosted in `assets/vendor/`. Fonts self-hosted in `assets/fonts/`.
- API: `api/meter.js`, a Vercel serverless function (core logic in `api/_lib/meter-core.js`).
- Promo video source: `video/` (composition, synthesized soundtrack, renderer).

## Config

The top of `main.js` holds the contract address, X link and buy link:

```js
const CONFIG = {
  CA: 'FTu55MyigXns96jz4nTCDDiTCjYJjyrHSceCgG9Upump',
  X_URL: 'https://x.com/foodcoinpf',
  BUY_URL: 'https://pump.fun/coin/FTu55MyigXns96jz4nTCDDiTCjYJjyrHSceCgG9Upump'
};
```

Every X button, the Buy button and the Copy CA controls pick these up automatically.

## Meal Meter (settled donations, server-side)

Meals are counted **only from donations already settled to Feeding America**, read from donate.gg's public
receipts API by `api/meter.js`:

```text
meals = floor( sum(usdNetE6 of settled $FOOD receipts) × 20 / 1,000,000 )
```

- Net of donate.gg's processing fee: `gross = net + fee + tip` is checked on every receipt (USD and token amounts).
- No live SOL price: a settled donation keeps its recorded dollar value, so a price move can't change counted meals.
- A receipt only counts if it matches the $FOOD mint, Solana (`101`), the Pump Fees donation source, the FOOD
  donation config, Feeding America, USDC settlement and a wrapped-SOL input, is `settled` (receipt and parent),
  and carries a settlement transaction, slot and timestamp. Inconsistent $FOOD receipts reject the refresh.
- Every page is read before publishing (no partial totals). Receipts are deduplicated by receipt id, because
  batched settlements share one transaction. Amounts are summed with `BigInt` and floored once.
- Already-counted history (seeded by `api/_data/settled-snapshot.json`) must stay present and unchanged; otherwise
  the last good reading stays published.
- Creator-vault and donation-account balances are read from Solana (`finalized`, RPC failover) and shown as
  *not yet counted*. Chain failures never block the settled total, and vice versa.

The browser only calls the same-origin `/api/meter`. `meter.js` runs independently of the animation libraries,
and the page un-hides itself if the animations fail to start.

Optional Vercel environment variables (server-side only):

| Variable | Purpose |
| --- | --- |
| `SOLANA_RPC_URLS` | Comma-separated RPC URLs, primary first (e.g. a Helius URL as backup). |
| `DONATE_API_KEY` | donate.gg API key for a higher rate limit. |

## Run locally

```bash
npm install
```

```bash
npm run dev
```

This serves the site and `/api/meter` on http://localhost:5173.

```bash
npm test
```

## Deploy

Vercel (current host of foodcoin.site): pushing to `main` deploys the static site and the `/api/meter` function.
A static-only host (e.g. GitHub Pages) would serve the site, but the Meal Meter needs the `/api` function.
