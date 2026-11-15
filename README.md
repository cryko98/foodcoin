# FoodCoin — $FOOD

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

## Meal Meter (settled donations, server-side)

Meals are counted **only from donations already settled to Feeding America**, read from donate.gg's public
receipts API by the serverless function  (Vercel deploys it automatically from ):

    meals = floor( sum(usdNetE6 of settled  receipts) × 20 / 1,000,000 )

- Net of donate.gg's processing fee ( is checked on every receipt).
- No live SOL price: a settled donation keeps its recorded dollar value forever.
- Receipts must match the  mint, Solana (101), the Pump Fees donation source, the FOOD donation config,
  Feeding America, USDC settlement and a wrapped-SOL input, and carry a settlement tx/slot/timestamp.
- Every page is read (no partial totals), receipts are deduplicated by receipt id (batches share one tx),
  and already-counted history (seeded by ) can't silently disappear or change.
- Creator-vault and donation-account balances are read from Solana (finalized, RPC failover) and shown as
  *not yet counted*.

The browser only calls the same-origin ;  runs independently of the animation libraries.

Optional Vercel environment variables:  (comma-separated, primary first, e.g. a Helius URL),
 (higher donate.gg rate limit). They stay server-side.

Local: Unknown command: "install"


Did you mean one of these?
  npm install # Install a package
  npm uninstall # Remove a package
To see a list of supported npm commands, run:
  npm help,  (site + API on http://localhost:5173), Unknown command: "test"


Did you mean this?
  npm test # Test a package
To see a list of supported npm commands, run:
  npm help.

## Run locally

Any static server works, for example:

```bash
npx serve .
```

## Deploy

Works as-is on GitHub Pages, Vercel or Netlify (publish the repo root).
