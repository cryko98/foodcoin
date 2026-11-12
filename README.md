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

The section under the hero reads the Solana chain directly from the visitor's browser (no backend).
It sums the SOL donated, values it at the live SOL price (Jupiter, CoinGecko as fallback) and converts it with
Feeding America's figure of **$1 = 20 meals**.

Set it up in `CONFIG.DONATION` in `main.js`:

| Key | What it does |
| --- | --- |
| `WALLET` | The Solana wallet the creator rewards flow through. Empty = "goes live at launch". |
| `MODE` | `'received'` counts all SOL arriving in `WALLET`. `'sent'` counts only SOL that `WALLET` sends to `DONATE_TO`. |
| `DONATE_TO` | The donate.gg deposit address (only used with `MODE: 'sent'`). |
| `RPC` | A CORS-enabled Solana RPC. The default (PublicNode) is free; for heavy traffic use your own free Helius URL. |
| `OFFSET_USD` | Donations made outside the tracked wallet, in USD. They're added to the total. |
| `MEALS_PER_USD` | `20`, per feedingamerica.org. |

Preview with any wallet locally: `http://localhost:5173/?wallet=<ADDRESS>` (the `?wallet=` override only works on localhost).

## Run locally

Any static server works, for example:

```bash
npx serve .
```

## Deploy

Works as-is on GitHub Pages, Vercel or Netlify (publish the repo root).
