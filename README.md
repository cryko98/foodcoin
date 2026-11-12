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

## Run locally

Any static server works, for example:

```bash
npx serve .
```

## Deploy

Works as-is on GitHub Pages, Vercel or Netlify (publish the repo root).
