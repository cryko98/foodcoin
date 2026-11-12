# FoodCoin — $FOODCOIN

A Solana memecoin with a dinner plan: creator rewards from trading go to feeding families who can't afford food over the holidays.

Static site with no build step: `index.html`, `styles.css` and `main.js`, plus SVG assets in `assets/`.
Motion is built with GSAP + ScrollTrigger and Lenis smooth scroll (loaded from jsDelivr).

## Going live: CA and X link

Open `main.js` and fill in the `CONFIG` block at the top:

```js
const CONFIG = {
  CA: '',       // Solana contract address. Empty = "COMING SOON"
  X_URL: '',    // e.g. 'https://x.com/yourhandle'
  BUY_URL: ''   // e.g. pump.fun / Jupiter link
};
```

Every X button, the "Buy" button and the "Copy CA" button pick these up automatically.

## Meal Meter (live on-chain donation counter)

The section under the hero reads the coin's pump.fun fee accounts straight from the Solana chain, in the visitor's
browser (no backend). Everything is derived from `CONFIG.CA`:

1. **Fee-sharing config** (`sharing-config` PDA of the mint, pump.fun fees program): who receives the creator fee, and
   whether the split is locked (`admin_revoked`).
2. **Creator vault** (bonding curve, plus the PumpSwap WSOL vault after graduation): fees that have built up but
   haven't been claimed yet. These count too.
3. **Donation account** (`DonationFeePda`, the shareholder): what's on its way, plus `total_donated` (already delivered).
   Its totals only count if the account belongs to this mint (`base_mint == CA`), so a shared account can't inflate
   the number.

Total SOL × live SOL price (Jupiter, CoinGecko fallback) × **20 meals per $1** (Feeding America) = the counter.

`CONFIG.DONATION` in `main.js`:

| Key | What it does |
| --- | --- |
| `RPC` | A CORS-enabled Solana RPC. The default (PublicNode) is free; for heavy traffic use your own free Helius URL. |
| `MEALS_PER_USD` | `20`, per feedingamerica.org. |
| `OFFSET_USD` | Donations made outside pump.fun, in USD. They're added to the total. |
| `REFRESH_MS` | How often the chain is re-read (default 20s). |

Before the mint exists on-chain the meter shows "Goes live at launch" and switches to live by itself once trading starts.
Preview any coin locally: `http://localhost:5173/?ca=<MINT>` (the `?ca=` override only works on localhost).

## Run locally

Any static server works, for example:

```bash
npx serve .
```

## Deploy

Works as-is on GitHub Pages, Vercel or Netlify (publish the repo root).
