/* =========================================================
   FoodCoin — motion
   ========================================================= */
(() => {
  'use strict';

  /* ======= LAUNCH CONFIG: fill these in when ready ======= */
  const CONFIG = {
    CA: 'FTu55MyigXns96jz4nTCDDiTCjYJjyrHSceCgG9Upump', // $FOOD contract address. Empty = "COMING SOON"
    X_URL: 'https://x.com/foodcoinpf', // official X account
    BUY_URL: 'https://pump.fun/coin/FTu55MyigXns96jz4nTCDDiTCjYJjyrHSceCgG9Upump', // empty = "soon" toast

    /* Meal Meter: reads the coin's pump.fun fee accounts straight from the Solana chain.
       Everything is derived from CA: creator vault (unclaimed fees), the donation
       account the fee-sharing config pays into, and that account's total_donated. */
    DONATION: {
      RPC: 'https://solana-rpc.publicnode.com', // any CORS-enabled Solana RPC (e.g. a free Helius URL)
      MEALS_PER_USD: 20, // Feeding America: every $1 provides 20 meals
      OFFSET_USD: 0,     // donations made outside pump.fun, in USD (added to the total)
      REFRESH_MS: 20000  // how often to re-read the chain
    }
  };

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ---------------- Theme (brand red ↔ cream) ---------------- */
  const THEMES = {
    cream: { bg: '#FFF1CA', fg: '#E42721' },
    red: { bg: '#E42721', fg: '#FFF1CA' }
  };
  const theme = { ...THEMES.cream };
  const rootStyle = document.documentElement.style;
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  let fgRGB = [228, 39, 33];
  let currentTheme = 'cream';
  const toRGB = c => c.startsWith('#')
    ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
    : c.match(/[\d.]+/g).slice(0, 3).map(Number);
  function applyTheme() {
    rootStyle.setProperty('--bg', theme.bg);
    rootStyle.setProperty('--fg', theme.fg);
    fgRGB = toRGB(theme.fg);
  }
  function setTheme(name) {
    if (!THEMES[name] || name === currentTheme) return;
    currentTheme = name;
    gsap.to(theme, { ...THEMES[name], duration: 0.9, ease: 'power2.inOut', overwrite: true, onUpdate: applyTheme });
    if (metaTheme) metaTheme.content = THEMES[name].bg;
  }

  /* ---------------- Toast ---------------- */
  const toastEl = $('.toast');
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  /* ---------------- Config → links ---------------- */
  function applyConfig() {
    $$('[data-x-link]').forEach(a => {
      if (CONFIG.X_URL) { a.href = CONFIG.X_URL; a.target = '_blank'; a.rel = 'noopener'; }
      else a.addEventListener('click', e => { e.preventDefault(); toast('Our X drops soon. Stay hungry.'); });
    });
    $$('[data-buy-link]').forEach(a => {
      if (CONFIG.BUY_URL) {
        a.href = CONFIG.BUY_URL; a.target = '_blank'; a.rel = 'noopener';
        const tag = a.querySelector('i'); if (tag) tag.remove();
      } else a.addEventListener('click', e => { e.preventDefault(); toast('Launching soon on Solana.'); });
    });
    const copyCA = async () => {
      if (!CONFIG.CA) return toast('CA drops soon. Watch our X.');
      try { await navigator.clipboard.writeText(CONFIG.CA); toast('Contract address copied'); }
      catch { toast(CONFIG.CA); }
    };
    $$('[data-copy-ca], [data-ca-pill]').forEach(b => b.addEventListener('click', copyCA));
    const pillText = $('[data-ca-pill-text]');
    if (CONFIG.CA && pillText) {
      pillText.textContent = CONFIG.CA.slice(0, 4) + '…' + CONFIG.CA.slice(-4);
      pillText.classList.add('is-ca');
      $('[data-ca-pill]').setAttribute('title', 'Copy CA: ' + CONFIG.CA);
    }
    $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
  }

  /* ---------------- Text splitting ---------------- */
  // chars only (no masks); keeps nested elements like <em>
  function splitChars(root) {
    const out = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          [...n.textContent].forEach(ch => {
            if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'char'; s.textContent = ch;
            frag.appendChild(s); out.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(root);
    return out;
  }

  // words wrapped in an overflow mask, chars inside
  function splitMasked(root) {
    const chars = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'wm';
            [...part].forEach(ch => {
              const c = document.createElement('span');
              c.className = 'char'; c.textContent = ch;
              w.appendChild(c); chars.push(c);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(root);
    return chars;
  }

  function splitWords(root) {
    const out = [];
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'word'; w.textContent = part;
            frag.appendChild(w); out.push(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(root);
    return out;
  }

  /* ---------------- Coin build ---------------- */
  function buildCoin() {
    const coin = $('.coin');
    const N = 16;
    for (let i = 0; i < N; i++) {
      const d = document.createElement('div');
      d.className = 'coin-edge';
      d.style.transform = `translateZ(${((i - (N - 1) / 2) * 0.95).toFixed(2)}px)`;
      coin.prepend(d);
    }
  }

  /* ---------------- Snow ---------------- */
  function snow() {
    const c = $('#snow');
    const ctx = c.getContext('2d');
    let w, h, dpr, flakes = [];
    const count = () => (innerWidth < 700 ? 60 : 140);
    const make = () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: (Math.random() * 1.7 + 0.35) * dpr,
      s: Math.random() * 0.55 + 0.2,
      d: Math.random() * Math.PI * 2,
      o: Math.random() * 0.5 + 0.12
    });
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = c.width = innerWidth * dpr; h = c.height = innerHeight * dpr;
      c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
      flakes = Array.from({ length: count() }, make);
    }
    resize();
    addEventListener('resize', resize);
    let vel = 0, wind = 0, targetWind = 0;
    if (finePointer) addEventListener('pointermove', e => { targetWind = (e.clientX / innerWidth - 0.5) * 0.8; });
    (function tick() {
      ctx.clearRect(0, 0, w, h);
      const v = lenis ? lenis.velocity : 0;
      vel += (v - vel) * 0.08;
      wind += (targetWind - wind) * 0.02;
      for (const f of flakes) {
        f.d += 0.012;
        f.y += (f.s + f.r / dpr * 0.25) * dpr - vel * 0.18 * (f.r / dpr);
        f.x += (Math.sin(f.d) * 0.35 + wind) * dpr;
        if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
        if (f.y < -12) { f.y = h + 8; f.x = Math.random() * w; }
        if (f.x > w + 10) f.x = -10; else if (f.x < -10) f.x = w + 10;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${fgRGB[0]},${fgRGB[1]},${fgRGB[2]},${f.o * (currentTheme === 'red' ? 1 : 0.55)})`;
        ctx.fill();
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ---------------- Cursor + magnetic ---------------- */
  function pointerFX() {
    if (!finePointer) return;
    const ring = $('.cursor'), dot = $('.cursor-dot');
    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
    addEventListener('pointermove', e => { rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY); });
    $$('a, button, [data-hover]').forEach(el => {
      el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
    });

    $$('.magnetic').forEach(el => {
      const xt = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .4)' });
      const yt = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xt((e.clientX - (r.left + r.width / 2)) * 0.32);
        yt((e.clientY - (r.top + r.height / 2)) * 0.32);
      });
      el.addEventListener('pointerleave', () => { xt(0); yt(0); });
    });

    // coin tilt + glow follow
    const tx = gsap.quickTo('.coin-tilt', 'rotationX', { duration: 1, ease: 'power3' });
    const ty = gsap.quickTo('.coin-tilt', 'rotationY', { duration: 1, ease: 'power3' });
    addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      tx(-ny * 30); ty(nx * 40);
    });

    // CA card glow
    const card = $('.ca-card'), glow = $('.ca-glow');
    const gx = gsap.quickTo(glow, 'left', { duration: 0.6, ease: 'power3' });
    const gy = gsap.quickTo(glow, 'top', { duration: 0.6, ease: 'power3' });
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      gx(e.clientX - r.left); gy(e.clientY - r.top);
    });
  }

  /* ---------------- Countdown ---------------- */
  function countdown() {
    const els = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    const label = $('.cd-label');
    const target = () => {
      const now = new Date();
      let t = new Date(now.getFullYear(), 11, 24, 0, 0, 0);
      if (now - t > 2 * 864e5) t = new Date(now.getFullYear() + 1, 11, 24);
      return t;
    };
    const pad = n => String(n).padStart(2, '0');
    const T = target();
    function tick() {
      let diff = Math.max(0, T - new Date());
      if (diff === 0) label.textContent = 'Merry Christmas';
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      els.d.textContent = pad(d); els.h.textContent = pad(h); els.m.textContent = pad(m); els.s.textContent = pad(s);
    }
    tick(); setInterval(tick, 1000);
  }

  /* ---------------- Scramble ---------------- */
  const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  function scramble(el, final, dur = 1500) {
    const start = performance.now();
    const len = final.length;
    cancelAnimationFrame(el._raf);
    const step = now => {
      const p = Math.min(1, (now - start) / dur);
      const reveal = Math.floor(gsap.parseEase('power2.in')(p) * len);
      let s = '';
      for (let i = 0; i < len; i++) {
        s += i < reveal || final[i] === ' ' ? final[i] : B58[(Math.random() * B58.length) | 0];
      }
      el.textContent = s;
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  /* =========================================================
     MEAL METER — live on-chain donation counter
     ========================================================= */
  function makeOdometer(el) {
    let n = 0, slots = [], commas = [];
    function build(digits) {
      el.innerHTML = ''; slots = []; commas = [];
      for (let k = digits - 1; k >= 0; k--) {
        const wrap = document.createElement('span');
        wrap.className = 'odo-d';
        const strip = document.createElement('span');
        strip.className = 'odo-s';
        strip.innerHTML = '01234567890'.split('').map(d => `<span>${d}</span>`).join('');
        wrap.appendChild(strip); el.appendChild(wrap);
        slots.push({ wrap, strip, k });
        if (k > 0 && k % 3 === 0) {
          const c = document.createElement('span');
          c.className = 'odo-c'; c.textContent = ',';
          el.appendChild(c); commas.push({ c, k });
        }
      }
    }
    function set(f) {
      f = Math.max(0, f);
      const len = String(Math.floor(f)).length;
      if (len > n) { n = len; build(n); }
      for (const s of slots) {
        const p = 10 ** s.k;
        const base = Math.floor(f / p) % 10;
        const lower = f % p;
        const frac = lower > p - 1 ? lower - (p - 1) : 0; // roll only when the digits below are carrying
        s.strip.style.transform = `translateY(${-(base + frac)}em)`;
        s.wrap.classList.toggle('lead', s.k >= len && s.k > 0);
      }
      for (const { c, k } of commas) c.classList.toggle('lead', k >= len);
      el.setAttribute('aria-label', Math.round(f).toLocaleString('en-US') + ' meals provided');
    }
    return { set };
  }

  /* ---- tiny Solana toolkit (no dependencies): base58, PDAs, account reads ---- */
  const SOL = (() => {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const dec = s => {
      let n = 0n;
      for (const c of s) { const i = A.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); }
      const out = [];
      while (n > 0n) { out.push(Number(n & 255n)); n >>= 8n; }
      for (const c of s) { if (c === '1') out.push(0); else break; }
      return Uint8Array.from(out.reverse());
    };
    const enc = b => {
      let n = 0n;
      for (const x of b) n = n * 256n + BigInt(x);
      let s = '';
      while (n > 0n) { s = A[Number(n % 58n)] + s; n /= 58n; }
      for (const x of b) { if (x === 0) s = '1' + s; else break; }
      return s;
    };
    // ed25519: is this 32-byte string a valid curve point? (PDAs must NOT be)
    const P = 2n ** 255n - 19n;
    const md = a => { a %= P; return a < 0n ? a + P : a; };
    const pw = (b, e) => { let r = 1n; b = md(b); while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; };
    const D = md(-121665n * pw(121666n, P - 2n));
    const onCurve = b => {
      let y = 0n;
      for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(i === 31 ? b[i] & 0x7f : b[i]);
      if (y >= P) return false;
      const y2 = y * y % P, x2 = md(y2 - 1n) * pw(md(D * y2 + 1n), P - 2n) % P;
      if (x2 === 0n) return (b[31] >> 7) === 0;
      return pw(x2, (P - 1n) / 2n) === 1n;
    };
    const te = new TextEncoder();
    const cat = parts => { const len = parts.reduce((s, p) => s + p.length, 0), o = new Uint8Array(len); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
    async function pda(seeds, program) {
      const prog = dec(program), marker = te.encode('ProgramDerivedAddress');
      const raw = seeds.map(s => (typeof s === 'string' ? te.encode(s) : s));
      for (let bump = 255; bump >= 0; bump--) {
        const h = new Uint8Array(await crypto.subtle.digest('SHA-256', cat([...raw, Uint8Array.of(bump), prog, marker])));
        if (!onCurve(h)) return enc(h);
      }
      throw new Error('no PDA');
    }
    return { dec, enc, pda };
  })();

  function initMeter() {
    const D = CONFIG.DONATION;
    const odo = makeOdometer($('[data-odo]'));
    odo.set(0);
    const els = {
      live: $('[data-m-live]'), status: $('[data-m-status]'), usd: $('[data-m-usd]'), sol: $('[data-m-sol]'),
      sent: $('[data-m-sent]'), ca: $('[data-m-ca]'), updated: $('[data-m-updated]'), lock: $('[data-m-lock]'),
      tVault: $('[data-t-vault]'), tVaultLink: $('[data-t-vault-link]'), tPending: $('[data-t-pending]'),
      tPendingLink: $('[data-t-pending-link]'), tSent: $('[data-t-sent]'), tCrank: $('[data-t-crank]')
    };

    gsap.from('.meter-card', {
      y: 120, scale: 0.92, rotate: -2, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: '.meter', start: 'top 90%' }
    });

    // any coin can be previewed locally via ?ca=MINT (never on the live domain)
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    const ca = (isLocal && new URLSearchParams(location.search).get('ca')) || CONFIG.CA;
    if (!ca) {
      els.live.classList.add('is-idle');
      els.status.textContent = 'Goes live at launch';
      $$('.t-link[href="#"]').forEach(a => a.classList.add('off'));
      return;
    }

    const PROG = {
      pump: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
      amm: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
      fees: 'pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ',
      token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      ata: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      wsol: 'So11111111111111111111111111111111111111112'
    };
    const DISC_SHARING = 'd84a0900388c5d4b', DISC_DONATION = 'f6c56009c11e5d73';
    const short = a => a.slice(0, 4) + '…' + a.slice(-4);
    const solscan = a => 'https://solscan.io/account/' + a;
    els.ca.textContent = short(ca);
    els.ca.href = 'https://solscan.io/token/' + ca;

    async function rpc(method, params) {
      const r = await fetch(D.RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    }
    const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
    async function accounts(keys) {
      const res = await rpc('getMultipleAccounts', [keys, { encoding: 'base64', commitment: 'confirmed' }]);
      return res.value.map(v => (v ? { lamports: v.lamports, data: b64(v.data[0]) } : null));
    }
    const hex8 = d => [...d.subarray(0, 8)].map(x => x.toString(16).padStart(2, '0')).join('');
    const u64 = (d, o) => Number(new DataView(d.buffer, d.byteOffset).getBigUint64(o, true));
    const i64 = (d, o) => Number(new DataView(d.buffer, d.byteOffset).getBigInt64(o, true));
    const key = (d, o) => SOL.enc(d.subarray(o, o + 32));
    const tokenAmount = acc => (acc && acc.data.length >= 72 ? u64(acc.data, 64) : 0);

    const rentCache = {};
    async function rent(len) {
      if (!(len in rentCache)) rentCache[len] = await rpc('getMinimumBalanceForRentExemption', [len]);
      return rentCache[len];
    }

    async function solPrice() {
      try {
        const r = await fetch('https://lite-api.jup.ag/price/v3?ids=' + PROG.wsol);
        const p = (await r.json())[PROG.wsol]?.usdPrice;
        if (p) return p;
      } catch {}
      const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      return (await r.json()).solana.usd;
    }

    // addresses derived once from the CA
    let addr = null;
    async function derive() {
      const mint = SOL.dec(ca);
      const sharing = await SOL.pda(['sharing-config', mint], PROG.fees);
      const sharingB = SOL.dec(sharing);
      const vault = await SOL.pda(['creator-vault', sharingB], PROG.pump);
      const ammAuth = await SOL.pda(['creator_vault', sharingB], PROG.amm);
      const ammVault = await SOL.pda([SOL.dec(ammAuth), SOL.dec(PROG.token), SOL.dec(PROG.wsol)], PROG.ata);
      return { sharing, vault, ammVault };
    }

    const state = { price: 0, totalSol: 0, shownMeals: 0, started: false, lastSync: 0, donationAta: {} };

    async function read() {
      if (!addr) {
        addr = await derive();
        els.tVaultLink.href = solscan(addr.vault);
      }
      const [sharingAcc, vaultAcc, ammAcc] = await accounts([addr.sharing, addr.vault, addr.ammVault]);
      const out = { live: !!sharingAcc, vault: 0, pending: 0, sent: 0, locked: false, donationBps: 0, donation: null, lastCrank: 0 };
      if (!sharingAcc || hex8(sharingAcc.data) !== DISC_SHARING) return out;

      // fee-sharing config: who gets the creator fee, and is the split locked?
      const d = sharingAcc.data;
      out.locked = d[75] === 1;
      const n = new DataView(d.buffer, d.byteOffset).getUint32(76, true);
      const holders = [];
      for (let i = 0, o = 80; i < n; i++, o += 34) holders.push({ key: key(d, o), bps: new DataView(d.buffer, d.byteOffset).getUint16(o + 32, true) });

      // unclaimed fees still sitting in the creator vaults (bonding curve + PumpSwap after graduation)
      const vaultSol = Math.max(0, ((vaultAcc ? vaultAcc.lamports : 0) - (vaultAcc ? await rent(0) : 0))) / 1e9;
      const ammSol = tokenAmount(ammAcc) / 1e9;

      // donation accounts among the shareholders
      for (const h of holders) {
        if (!state.donationAta[h.key]) state.donationAta[h.key] = await SOL.pda([SOL.dec(h.key), SOL.dec(PROG.token), SOL.dec(PROG.wsol)], PROG.ata);
      }
      const holderAccs = holders.length ? await accounts(holders.flatMap(h => [h.key, state.donationAta[h.key]])) : [];
      for (let i = 0; i < holders.length; i++) {
        const acc = holderAccs[i * 2], ata = holderAccs[i * 2 + 1];
        if (!acc || hex8(acc.data) !== DISC_DONATION) continue;
        out.donationBps += holders[i].bps;
        out.donation = holders[i].key;
        // only count the donation account's own totals if it belongs to this coin (not shared with another mint)
        if (key(acc.data, 42) === ca) {
          out.pending += Math.max(0, acc.lamports - await rent(acc.data.length)) / 1e9 + tokenAmount(ata) / 1e9;
          out.sent += u64(acc.data, 138) / 1e9;
          out.lastCrank = Math.max(out.lastCrank, i64(acc.data, 146));
        }
      }
      out.vault = (vaultSol + ammSol) * (out.donationBps / 10000);
      return out;
    }

    const fmtSol = v => v.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' SOL';
    const fmtUsd = v => '$' + v.toLocaleString('en-US', { maximumFractionDigits: v < 1000 ? 2 : 0 });
    const ago = t => {
      const s = Math.max(1, Math.floor(Date.now() / 1000 - t));
      if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago';
      return Math.floor(s / 86400) + 'd ago';
    };

    function pop(text) {
      const p = document.createElement('div');
      p.className = 'meter-pop'; p.textContent = text;
      $('.meter-main').appendChild(p);
      gsap.fromTo(p, { y: 30, scale: 0.6, opacity: 0 }, {
        y: -60, scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2)',
        onComplete: () => gsap.to(p, { opacity: 0, y: -110, duration: 0.8, delay: 1.2, onComplete: () => p.remove() })
      });
    }

    function render() {
      const usd = state.totalSol * state.price + D.OFFSET_USD;
      const meals = Math.floor(usd * D.MEALS_PER_USD);
      els.sol.textContent = state.totalSol.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      els.usd.textContent = fmtUsd(usd);
      if (!state.started) return;
      if (meals !== state.shownMeals) {
        const from = state.shownMeals, o = { v: from };
        gsap.to(o, { v: meals, duration: from === 0 ? 2.8 : 1.8, ease: 'power3.out', overwrite: true, onUpdate: () => odo.set(o.v) });
        if (from > 0 && meals > from) pop(`+${(meals - from).toLocaleString('en-US')} meals`);
        state.shownMeals = meals;
      }
    }

    let busy = false;
    async function sync() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const [price, r] = await Promise.all([solPrice(), read()]);
        state.price = price;
        state.lastSync = Date.now();
        if (!r.live) {
          els.live.classList.add('is-idle');
          els.status.textContent = 'Goes live at launch';
          els.tPendingLink.classList.add('off');
          state.totalSol = 0;
          render();
          return;
        }
        state.totalSol = r.vault + r.pending + r.sent;
        els.live.classList.remove('is-idle', 'is-error');
        els.status.textContent = 'Live on-chain';
        els.tVault.textContent = fmtSol(r.vault);
        els.tPending.textContent = fmtSol(r.pending);
        els.tSent.textContent = fmtSol(r.sent);
        els.sent.textContent = fmtSol(r.sent);
        els.tCrank.textContent = r.lastCrank ? 'Last delivery ' + ago(r.lastCrank) : 'Waiting for the first delivery';
        if (r.donation) { els.tPendingLink.href = solscan(r.donation); els.tPendingLink.classList.remove('off'); }
        if (r.locked) {
          els.lock.hidden = false;
          els.lock.textContent = `🔒 ${(r.donationBps / 100).toFixed(0)}% of creator fees → charity · locked forever`;
          els.lock.title = 'The fee split is locked on-chain (admin revoked) and can never be changed.';
        }
        render();
      } catch (e) {
        els.live.classList.add('is-error');
        els.status.textContent = 'Reconnecting';
      } finally { busy = false; }
    }

    setInterval(() => {
      if (!state.lastSync) { els.updated.textContent = 'Reading the chain…'; return; }
      const s = Math.floor((Date.now() - state.lastSync) / 1000);
      els.updated.textContent = `Updated ${s < 2 ? 'just now' : s + 's ago'} · checks every ${Math.round(D.REFRESH_MS / 1000)}s`;
    }, 1000);

    ScrollTrigger.create({ trigger: '.meter', start: 'top 75%', once: true, onEnter: () => { state.started = true; render(); } });
    sync();
    setInterval(sync, D.REFRESH_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  }

  /* =========================================================
     MAIN
     ========================================================= */
  function init() {
    applyConfig();
    buildCoin();
    countdown();
    snow();
    pointerFX();

    // ---- splits
    const plChars = splitChars($('.pl-word'));
    const heroChars = $$('.hero-title .line-in').flatMap(splitChars);
    $$('[data-split]').forEach(el => (el._chars = splitMasked(el)));
    const manifestoWords = splitWords($('[data-words]'));

    /* ---------- Preloader → hero intro ---------- */
    gsap.set(plChars, { yPercent: 110 });
    const counter = { v: 0 };
    const countEl = $('.pl-count span');

    const heroIntro = () => {
      const tl = gsap.timeline();
      tl.from('.nav', { yPercent: -120, duration: 1.2, ease: 'expo.out', clearProps: 'transform' }, 0.2)
        .from(heroChars, { yPercent: 118, rotate: 8, duration: 1.3, stagger: 0.03, ease: 'expo.out' }, 0)
        .from('.coin-float', { scale: 0, rotation: -40, duration: 1.8, ease: 'elastic.out(1, .55)' }, 0.25)
        .fromTo('.coin', { rotationY: -1260 }, {
          rotationY: 0, duration: 2.6, ease: 'expo.out',
          onComplete: () => gsap.to('.coin', { rotationY: '+=360', duration: 7, ease: 'none', repeat: -1 })
        }, 0.25)
        .from('.hero-glow', { scale: 0.4, opacity: 0, duration: 2.2, ease: 'power2.out' }, 0)
        .from('.eyebrow', { x: -30, opacity: 0, duration: 1, ease: 'power3.out' }, 0.5)
        .from('.hero-bottom > *', { y: 50, opacity: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out' }, 0.7)
        .from('.scroll-cue', { scaleY: 0, transformOrigin: 'top', duration: 0.8 }, 1.2)
        .add(() => $('.hero-title').classList.add('waved'), 0.9);
      return tl;
    };

    const pl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
    pl.fromTo('.pl-logo', { scale: 0.6, rotate: -12 }, { scale: 1, rotate: 0, duration: 1.2, ease: 'elastic.out(1, .6)' }, 0)
      .to('.pl-fill', { clipPath: 'inset(0% 0 0 0)', duration: reduce ? 0.5 : 2.2, ease: 'power2.inOut' }, 0)
      .to(counter, {
        v: 100, duration: reduce ? 0.5 : 2.2, ease: 'power2.inOut',
        onUpdate: () => (countEl.textContent = String(Math.round(counter.v)).padStart(3, '0'))
      }, 0)
      .to(plChars, { yPercent: 0, duration: 0.9, stagger: 0.025, ease: 'power3.out' }, 0.15)
      .to('.pl-inner', { scale: 0.92, opacity: 0, duration: 0.6, ease: 'power2.in' }, '+=0.2')
      .to('.pl-curtain.top', { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, '-=0.15')
      .to('.pl-curtain.bottom', { yPercent: 100, duration: 1.2, ease: 'expo.inOut' }, '<')
      .add(heroIntro(), '-=0.75')
      .add(() => {
        $('.preloader').style.display = 'none';
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }, '-=2.2');

    if (!reduce) gsap.to('.coin-float', { y: -16, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut' });

    /* ---------- Chrome: progress + nav ---------- */
    const nav = $('.nav');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => {
        gsap.set('.progress span', { scaleX: self.progress });
        const y = self.scroll();
        nav.classList.toggle('scrolled', y > 40);
        nav.classList.toggle('hidden', self.direction === 1 && y > 400);
      }
    });

    $$('[data-scroll]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.8 });
      else if (target === 0) scrollTo({ top: 0, behavior: 'smooth' });
      else target.scrollIntoView({ behavior: 'smooth' });
    }));

    /* ---------- Hero scroll-out ---------- */
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-title .line:nth-child(1) .line-in', { xPercent: -14, ease: 'none' }, 0)
      .to('.hero-title .line:nth-child(2) .line-in', { xPercent: 10, ease: 'none' }, 0)
      .to('.hero-title .line:nth-child(3) .line-in', { xPercent: -6, ease: 'none' }, 0)
      .to('.coin-stage', { yPercent: 75, scale: 0.65, rotate: 25, ease: 'none' }, 0)
      .to('.hero-glow', { yPercent: 25, ease: 'none' }, 0)
      .to('.hero-bottom', { yPercent: -40, ease: 'none' }, 0);

    /* ---------- Meal meter ---------- */
    initMeter();

    /* ---------- Explainer video ---------- */
    (() => {
      const frame = $('.ex-frame'), video = $('.ex-video'), play = $('.ex-play'), label = $('[data-ex-label]');
      if (!frame) return;
      // the screen tilts up and opens out as you scroll to it
      gsap.fromTo(frame, { scale: 0.84, rotateX: 14, y: 60 }, {
        scale: 1, rotateX: 0, y: 0, ease: 'none',
        scrollTrigger: { trigger: '.ex-stage', start: 'top bottom', end: 'top 30%', scrub: 1 }
      });
      play.addEventListener('click', () => {
        video.controls = true;
        frame.classList.add('is-playing');
        video.play().catch(() => { frame.classList.remove('is-playing'); });
      });
      video.addEventListener('ended', () => {
        frame.classList.remove('is-playing');
        video.controls = false;
        label.textContent = 'Watch again · 1:11';
      });
      // pause when it scrolls out of view
      new IntersectionObserver(([e]) => { if (!e.isIntersecting && !video.paused) video.pause(); }, { threshold: 0.15 }).observe(frame);
    })();

    /* ---------- Bands: velocity skew + parallax ---------- */
    const skewR = gsap.quickTo('.band-red .marquee-track', 'skewX', { duration: 0.5, ease: 'power3' });
    const skewG = gsap.quickTo('.band-gold .marquee-track', 'skewX', { duration: 0.5, ease: 'power3' });
    if (lenis) lenis.on('scroll', ({ velocity }) => {
      const v = gsap.utils.clamp(-14, 14, velocity * -0.5);
      skewR(v); skewG(-v);
    });
    gsap.fromTo('.band-red', { xPercent: 4 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.bands', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.band-gold', { xPercent: -4 }, { xPercent: 4, ease: 'none', scrollTrigger: { trigger: '.bands', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ---------- Manifesto words ---------- */
    gsap.to(manifestoWords, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.manifesto-text', start: 'top 82%', end: 'bottom 50%', scrub: true }
    });

    /* ---------- Generic heading reveals ---------- */
    $$('[data-split]').forEach(el => {
      gsap.from(el._chars, {
        yPercent: 115, rotate: 6, duration: 1.1, stagger: 0.022, ease: 'expo.out',
        scrollTrigger: {
          trigger: el, start: 'top 85%', toggleActions: 'play none none reverse',
          onEnter: () => el.classList.add('waved'),
          onLeaveBack: () => el.classList.remove('waved')
        }
      });
    });
    $$('[data-reveal]').forEach(el => {
      gsap.from(el, { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    /* ---------- Stats (pinned) ---------- */
    const stats = $$('.stat');
    const idxEl = $('.stat-index b');
    const fmt = (v, st) => Math.round(v).toLocaleString('en-US') + (st.dataset.suffix || '');
    stats.forEach(st => { if (st.dataset.to) $('.n', st).textContent = fmt(0, st); });

    const stl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: '.stats', start: 'top top', end: () => '+=' + innerHeight * stats.length * 0.9,
        pin: true, scrub: 1, anticipatePin: 1,
        onUpdate: self => {
          const i = Math.min(stats.length - 1, Math.floor(self.progress * stats.length * 0.999));
          idxEl.textContent = String(i + 1).padStart(2, '0');
        }
      }
    });
    stl.from('.stat-plate-wrap', { scale: 0.75, rotate: -40, opacity: 0, duration: 0.8 }, 0);
    stats.forEach((st, i) => {
      const at = i * 2;
      if (i > 0) stl.to(stats[i - 1], { autoAlpha: 0, yPercent: -14, scale: 0.94, duration: 0.6, ease: 'power2.in' }, at);
      stl.fromTo(st, { autoAlpha: 0, yPercent: 14, scale: 1.04 }, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.7, ease: 'power3.out' }, at + (i ? 0.45 : 0.2));
      if (st.dataset.to) {
        const o = { v: 0 }, to = +st.dataset.to, n = $('.n', st);
        stl.to(o, { v: to, duration: 1.2, ease: 'power2.out', onUpdate: () => (n.textContent = fmt(o.v, st)) }, at + 0.45);
      }
      stl.to('.stat-ring', { strokeDashoffset: 1 - (i + 1) / stats.length, duration: 1.2 }, at + 0.45);
      stl.to('.stat-plate', { rotate: (i + 1) * 24, duration: 1.4 }, at + 0.3);
    });
    stl.to({}, { duration: 0.8 });

    /* ---------- Mission (horizontal) ---------- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const track = $('.mission-track');
      const flowSpan = $('.flow-line span'), flowCoin = $('.flow-coin');
      const dist = () => track.scrollWidth - innerWidth;
      const h = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.mission', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 },
        onUpdate() {
          const p = this.progress();
          gsap.set(flowSpan, { scaleX: p });
          gsap.set(flowCoin, { left: p * 100 + '%', rotation: p * 1080 });
        }
      });
      $$('.m-card').forEach(card => {
        gsap.from(card, {
          yPercent: 14, rotate: 5, opacity: 0.25, ease: 'none',
          scrollTrigger: { containerAnimation: h, trigger: card, start: 'left 100%', end: 'left 50%', scrub: true }
        });
        gsap.fromTo($('.m-num', card), { xPercent: 50 }, {
          xPercent: -20, ease: 'none',
          scrollTrigger: { containerAnimation: h, trigger: card, start: 'left right', end: 'right left', scrub: true }
        });
      });
      gsap.from('.m-outro p', {
        xPercent: 30, opacity: 0, ease: 'none',
        scrollTrigger: { containerAnimation: h, trigger: '.m-outro', start: 'left 100%', end: 'left 60%', scrub: true }
      });
    });
    mm.add('(max-width: 900px)', () => {
      $$('.m-card, .m-outro').forEach(card => gsap.from(card, {
        y: 70, opacity: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 88%' }
      }));
    });

    /* ---------- The table (pinned) ---------- */
    // landscape table on wide stages, rotated inside the SVG on tall ones (always fits, never overlaps)
    const tsSvg = $('.ts-svg'), tsWorld = $('.ts-world'), tsStage = $('.ts-stage');
    const orientTable = () => {
      const r = tsStage.getBoundingClientRect();
      const portrait = r.height > 0 && r.width / r.height < 1.25;
      tsSvg.setAttribute('viewBox', portrait ? '0 0 600 1200' : '0 0 1200 600');
      if (portrait) tsWorld.setAttribute('transform', 'translate(600 0) rotate(90)');
      else tsWorld.removeAttribute('transform');
    };
    orientTable();
    ScrollTrigger.addEventListener('refreshInit', orientTable);

    const heads = $$('.ts-head');
    gsap.set(heads.slice(1), { yPercent: 110 });
    gsap.set('.food', { scale: 0, rotation: -120, transformOrigin: '50% 50%' });
    gsap.set('.candle-flame', { scale: 0, transformOrigin: '50% 100%' });
    gsap.set('.candle-glow', { scale: 0, opacity: 0, transformOrigin: '50% 50%' });
    const cCandles = $('.c-candles'), cPlates = $('.c-plates');
    const swap = i => gsap.timeline()
      .to(heads[i - 1], { yPercent: -110, duration: 0.5, ease: 'power2.in' })
      .fromTo(heads[i], { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: 'power3.out' }, '-=0.15');
    const cc = { v: 0 }, pc = { v: 0 };

    gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: { trigger: '.table-scene', start: 'top top', end: '+=320%', pin: true, scrub: 1, anticipatePin: 1 }
    })
      .from('.ts-svg', { scale: 0.85, rotate: -4, opacity: 0.3, duration: 1 }, 0)
      .from('.chair', { opacity: 0, y: i => (i < 4 ? -60 : 60), stagger: 0.05, duration: 0.8 }, 0.1)
      .from('.plate', { scale: 0.3, opacity: 0, transformOrigin: '50% 50%', stagger: 0.05, duration: 0.8, ease: 'back.out(1.6)' }, 0.25)
      .add(swap(1), '+=0.2')
      .to('.candle-flame', { scale: 1, stagger: 0.3, duration: 0.6, ease: 'back.out(3)' })
      .to('.candle-glow', { scale: 1, opacity: 1, stagger: 0.3, duration: 0.9 }, '<')
      .to(cc, { v: 3, duration: 1.2, ease: 'none', onUpdate: () => (cCandles.textContent = Math.round(cc.v)) }, '<')
      .to('.ts-glow', { opacity: 0.55, duration: 1.2 }, '<')
      .add(swap(2), '+=0.2')
      .to('.food', { scale: 1, rotation: 0, stagger: 0.35, duration: 0.7, ease: 'back.out(1.8)' })
      .to(pc, { v: 8, duration: 0.35 * 7 + 0.5, ease: 'none', onUpdate: () => (cPlates.textContent = Math.round(pc.v)) }, '<')
      .to('.ts-glow', { opacity: 1, duration: 2 }, '<')
      .add(swap(3), '+=0.25')
      .to('.ts-svg', { scale: 1.05, duration: 1.2, ease: 'power1.inOut' }, '<')
      .to('.ts-hint', { opacity: 0, duration: 0.4 }, '<')
      .to({}, { duration: 0.6 });

    /* ---------- Token ---------- */
    const caEl = $('[data-ca]');
    const caFinal = CONFIG.CA || 'COMING SOON';
    if (CONFIG.CA) caEl.classList.add('is-address');
    caEl.textContent = caFinal.replace(/\S/g, '·');
    ScrollTrigger.create({ trigger: '.ca-card', start: 'top 80%', onEnter: () => scramble(caEl, caFinal, 1800), onEnterBack: () => scramble(caEl, caFinal, 900) });
    $('.ca-card').addEventListener('pointerenter', () => scramble(caEl, caFinal, 700));
    gsap.from('.ca-card', {
      y: 120, rotateX: 18, rotate: -3, opacity: 0, transformPerspective: 1200, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: '.ca-card', start: 'top 90%' }
    });
    gsap.from('.facts > div', {
      y: 30, opacity: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.facts', start: 'top 88%' }
    });

    /* ---------- Advent ---------- */
    $$('.week').forEach((wk, i) => {
      const flame = $('.flame-wrap', wk);
      gsap.from($$('.week-n, h3, p', wk), {
        y: 40, opacity: 0, stagger: 0.08, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: wk, start: 'top 85%' }
      });
      gsap.from($('.body', wk), {
        scaleY: 0, transformOrigin: 'bottom', duration: 1.2, ease: 'expo.out', delay: i * 0.08,
        scrollTrigger: { trigger: wk, start: 'top 85%' }
      });
      ScrollTrigger.create({
        trigger: wk, start: 'top 62%',
        onEnter: () => { wk.classList.add('lit'); gsap.to(flame, { scale: 1, duration: 1.2, ease: 'elastic.out(1, .45)', delay: i * 0.12 }); },
        onLeaveBack: () => { wk.classList.remove('lit'); gsap.to(flame, { scale: 0, duration: 0.4, ease: 'power2.in' }); }
      });
    });

    /* ---------- Footer ---------- */
    gsap.fromTo('.banner-card',
      { rotateX: 38, rotate: -7, scale: 0.78, yPercent: 30, transformPerspective: 1600 },
      { rotateX: 0, rotate: 0, scale: 1, yPercent: 0, ease: 'none',
        scrollTrigger: { trigger: '.banner-stage', start: 'top bottom', end: 'center 60%', scrub: 1 } });

    /* ---------- Section themes (created last, after all pins) ---------- */
    // pinned sections: use their pin-spacer so the theme covers the whole pinned scroll distance
    $$('[data-theme]').forEach(sec => ScrollTrigger.create({
      trigger: sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec,
      start: 'top 55%', end: 'bottom 55%',
      onEnter: () => setTheme(sec.dataset.theme),
      onEnterBack: () => setTheme(sec.dataset.theme)
    }));

    // late images/fonts → recalc
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(init);
})();
