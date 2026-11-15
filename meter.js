/* =========================================================
   Foodcoin Meal Meter (client)
   Standalone on purpose: it doesn't depend on GSAP, ScrollTrigger or Lenis, so the counter
   keeps working even if the animation layer fails to load.
   All accounting happens server-side in /api/meter; this file only displays it.
   ========================================================= */
(() => {
  'use strict';
  const API = '/api/meter';
  const REFRESH_MS = 30000;
  const TIMEOUT_MS = 12000;

  const $ = (s, c = document) => c.querySelector(s);
  const card = $('.meter-card');
  if (!card) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const els = {
    live: $('[data-m-live]'), status: $('[data-m-status]'), usd: $('[data-m-usd]'), receipts: $('[data-m-receipts]'),
    fees: $('[data-m-fees]'), ca: $('[data-m-ca]'), updated: $('[data-m-updated]'), lock: $('[data-m-lock]'),
    tVault: $('[data-t-vault]'), tVaultLink: $('[data-t-vault-link]'), tPending: $('[data-t-pending]'),
    tPendingLink: $('[data-t-pending-link]'), tSent: $('[data-t-sent]'), tSentLink: $('[data-t-sent-link]'), tCrank: $('[data-t-crank]')
  };

  /* ---------- rolling odometer ---------- */
  function makeOdometer(el) {
    let n = 0, slots = [], commas = [];
    function build(digits) {
      el.innerHTML = ''; slots = []; commas = [];
      for (let k = digits - 1; k >= 0; k--) {
        const wrap = document.createElement('span'); wrap.className = 'odo-d';
        const strip = document.createElement('span'); strip.className = 'odo-s';
        strip.innerHTML = '01234567890'.split('').map(d => `<span>${d}</span>`).join('');
        wrap.appendChild(strip); el.appendChild(wrap);
        slots.push({ wrap, strip, k });
        if (k > 0 && k % 3 === 0) { const c = document.createElement('span'); c.className = 'odo-c'; c.textContent = ','; el.appendChild(c); commas.push({ c, k }); }
      }
    }
    function set(f) {
      f = Math.max(0, f);
      const len = String(Math.floor(f)).length;
      if (len > n) { n = len; build(n); }
      for (const s of slots) {
        const p = 10 ** s.k, base = Math.floor(f / p) % 10, lower = f % p;
        const frac = lower > p - 1 ? lower - (p - 1) : 0;
        s.strip.style.transform = `translateY(${-(base + frac)}em)`;
        s.wrap.classList.toggle('lead', s.k >= len && s.k > 0);
      }
      for (const { c, k } of commas) c.classList.toggle('lead', k >= len);
      el.setAttribute('aria-label', Math.floor(f).toLocaleString('en-US') + ' estimated meals');
    }
    return { set };
  }
  const odo = makeOdometer($('[data-odo]'));
  odo.set(0);

  // own tween (no GSAP): easeOutCubic
  let shown = 0, target = 0, anim = 0, inView = false;
  function animateTo(v) {
    target = v;
    if (!inView) return;
    cancelAnimationFrame(anim);
    if (reduce) { shown = v; odo.set(v); return; }
    const from = shown, dur = from === 0 ? 2600 : 1500, t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      shown = from + (v - from) * e;
      odo.set(shown);
      if (k < 1) anim = requestAnimationFrame(step); else shown = v;
    };
    anim = requestAnimationFrame(step);
  }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !inView) { inView = true; animateTo(target); }
  }, { threshold: 0.25 }).observe(card);

  function pop(text) {
    if (reduce) return;
    const p = document.createElement('div');
    p.className = 'meter-pop'; p.textContent = text;
    $('.meter-main').appendChild(p);
    p.animate([{ transform: 'translateY(30px) scale(.6)', opacity: 0 }, { transform: 'translateY(-60px) scale(1)', opacity: 1, offset: .3 },
      { transform: 'translateY(-60px) scale(1)', opacity: 1, offset: .75 }, { transform: 'translateY(-110px) scale(1)', opacity: 0 }],
      { duration: 2600, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => p.remove();
  }

  /* ---------- formatting ---------- */
  const usdE6 = v => {
    const n = Number(BigInt(v)) / 1e6;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: n < 1000 ? 2 : 0, maximumFractionDigits: n < 1000 ? 2 : 0 });
  };
  const sol = lam => (Number(BigInt(lam)) / 1e9).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' SOL';
  const ago = iso => {
    const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
    if (s < 90) return s + 's ago'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
  };
  const short = a => a.slice(0, 4) + '…' + a.slice(-4);
  const setLink = (a, href) => { if (href) { a.href = href; a.classList.remove('off'); } else a.classList.add('off'); };
  const setLive = (cls, text) => { els.live.classList.remove('is-idle', 'is-error'); if (cls) els.live.classList.add(cls); els.status.textContent = text; };

  /* ---------- render ---------- */
  let last = null;
  function render(d) {
    last = d;
    const s = d.settled, p = d.pending;
    els.ca.textContent = short(d.mint);
    els.ca.href = 'https://solscan.io/token/' + d.mint;

    if (s) {
      const meals = Number(s.meals);
      if (shown > 0 && meals > target) pop('+' + (meals - target).toLocaleString('en-US') + ' meals');
      animateTo(meals);
      els.usd.textContent = usdE6(s.netUsdE6);
      els.receipts.textContent = Number(s.receipts).toLocaleString('en-US');
      els.fees.textContent = usdE6(s.feeUsdE6);
      els.tSent.textContent = usdE6(s.netUsdE6);
      setLink(els.tSentLink, s.lastSettlement && 'https://solscan.io/tx/' + s.lastSettlement.tx);
      els.tCrank.textContent = s.lastSettlement
        ? `USDC received on-chain. Last settlement ${ago(s.lastSettlement.at)}`
        : 'USDC received on-chain. This is what the meals count';
    } else {
      for (const k of ['usd', 'receipts', 'fees', 'tSent']) els[k].textContent = 'unavailable';
    }

    if (p) {
      els.tVault.textContent = sol(BigInt(p.creatorVaultLamports) + BigInt(p.ammVaultLamports));
      els.tPending.textContent = p.donation ? sol(p.donation.pendingLamports) : sol('0');
      setLink(els.tVaultLink, p.accounts && 'https://solscan.io/account/' + (BigInt(p.ammVaultLamports) > 0n ? p.accounts.pumpswapVault : p.accounts.creatorVault));
      setLink(els.tPendingLink, p.donation && 'https://solscan.io/account/' + p.donation.address);
      if (p.locked && s) {
        const gross = BigInt(s.grossUsdE6), fee = BigInt(s.feeUsdE6);
        const pct = gross > 0n ? Math.round(Number(fee * 10000n / gross) / 100) : null;
        els.lock.hidden = false;
        els.lock.textContent = `🔒 ${Math.round(p.shareBps / 100)}% of creator fees → donate.gg → Feeding America · locked forever`
          + (pct !== null ? ` · donate.gg's ${pct}% processing fee is deducted before settlement` : '');
      }
    } else {
      els.tVault.textContent = 'unavailable'; els.tPending.textContent = 'unavailable';
    }

    const stale = (s && s.stale) || !s;
    if (!s) setLive('is-error', 'Unavailable');
    else if (stale) setLive('is-idle', 'Cached');
    else setLive(null, 'Live · settled data');
    updateStatusLine();
  }

  function updateStatusLine() {
    if (!last) return;
    const s = last.settled;
    if (!s || !s.fetchedAt) { els.updated.textContent = 'Settled data unavailable right now. Retrying'; return; }
    const parts = [`Settled data ${s.stale ? 'cached, last confirmed' : 'updated'} ${ago(s.fetchedAt)}`];
    if (last.errors && last.errors.chain) parts.push('vault balances unavailable');
    els.updated.textContent = parts.join(' · ');
  }
  setInterval(updateStatusLine, 15000);

  /* ---------- polling ---------- */
  let busy = false;
  async function load() {
    if (busy || document.hidden) return;
    busy = true;
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(API, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      render(await r.json());
    } catch (e) {
      if (last) { setLive('is-idle', 'Cached'); updateStatusLine(); }
      else { setLive('is-error', 'Unavailable'); els.updated.textContent = 'Meal meter is unavailable right now. Retrying'; }
    } finally { clearTimeout(timer); busy = false; }
  }
  load();
  setInterval(load, REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
  addEventListener('online', load);
})();
