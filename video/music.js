// Foodcoin promo soundtrack — fully synthesized, arranged to the video timeline.
// 120 BPM, D major, vi–IV–I–V (Bm G D A). One bar = 2 s. Usage: node music.js out.wav
const fs = require('fs');
const SR = 44100, BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 38;
const N = Math.ceil(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);      // dry mix
const RL = new Float32Array(N), RR = new Float32Array(N);    // reverb send
const SC = new Float32Array(N).fill(1);                      // sidechain gain

let seed = 1234567;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noise = () => rnd() * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const idx = t => Math.round(t * SR);

function out(i, l, r, send = 0) {
  if (i < 0 || i >= N) return;
  L[i] += l; R[i] += r;
  if (send) { RL[i] += l * send; RR[i] += r * send; }
}

// RBJ biquad
class BQ {
  constructor() { this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, q = 0.707) {
    f = Math.min(f, SR * 0.45);
    const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; } // bp
    a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y;
  }
}

// band-limited saw (polyBLEP)
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

/* ---------------- arrangement ---------------- */
const CH = [ // per bar: bass midi, chord midis
  { b: 35, c: [59, 62, 66] },  // Bm
  { b: 31, c: [55, 59, 62] },  // G
  { b: 38, c: [57, 62, 66] },  // D
  { b: 33, c: [57, 61, 64] }   // A
];
const chordAt = bar => CH[((bar % 4) + 4) % 4];
const sec = t => {
  if (t < 4) return 'intro';
  if (t < 8) return 'build1';
  if (t < 14) return 'groove';
  if (t < 16) return 'riser';
  if (t < 32) return 'drop';
  return 'outro';
};

/* ---------------- instruments ---------------- */
function kick(t0, amp = 1) {
  const len = 0.5, n = idx(len), i0 = idx(t0); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 46 + 125 * Math.exp(-t * 32);
    ph += 2 * Math.PI * f / SR;
    let v = Math.sin(ph) * Math.exp(-t * 7.5) + (i < 90 ? noise() * 0.35 * (1 - i / 90) : 0);
    v = Math.tanh(v * 1.6) * 0.95 * amp;
    out(i0 + i, v, v);
  }
  // sidechain dip
  const sn = idx(0.32);
  for (let i = 0; i < sn; i++) {
    const k = i / sn, g = 1 - 0.82 * Math.pow(1 - k, 2);
    const j = i0 + i; if (j < N) SC[j] = Math.min(SC[j], g);
  }
}
function clap(t0, amp = 0.5) {
  const f = new BQ().set('bp', 1300, 0.9), h = new BQ().set('hp', 700), i0 = idx(t0), n = idx(0.32);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) * 90));
    env = Math.max(env, 0.55 * Math.exp(-(t - 0.03) * 16) * (t > 0.03));
    const v = h.p(f.p(noise())) * env * amp * 2.2;
    out(i0 + i, v * 0.95, v, 0.35);
  }
}
function hat(t0, open = false, amp = 0.16) {
  const h = new BQ().set('hp', 8200), b = new BQ().set('bp', 10500, 0.8), i0 = idx(t0), n = idx(open ? 0.22 : 0.06);
  for (let i = 0; i < n; i++) {
    const t = i / SR, v = (h.p(noise()) * 0.6 + b.p(noise()) * 0.8) * Math.exp(-t * (open ? 16 : 70)) * amp;
    out(i0 + i, v * 0.8, v, 0.08);
  }
}
const BELLP = [4120, 5370, 6390, 7180, 8410, 9230];
function sleigh(t0, amp = 0.1) {
  const i0 = idx(t0), n = idx(0.11), parts = BELLP.map(f => ({ f: f * (0.97 + rnd() * 0.06), ph: rnd() * 6.28, a: 0.3 + rnd() * 0.7 }));
  const h = new BQ().set('hp', 6000);
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (const p of parts) v += Math.sin(p.ph + 2 * Math.PI * p.f * t) * p.a;
    v = (v * 0.18 + h.p(noise()) * 0.5) * Math.exp(-t * 38) * amp;
    out(i0 + i, v, v * 0.85, 0.2);
  }
}
function bell(t0, midi, len = 1.2, amp = 0.22, pan = 0) {
  const f = mtof(midi), i0 = idx(t0), n = idx(len + 0.8);
  const parts = [[1, 1, 2.2], [2.76, 0.42, 4.5], [5.4, 0.22, 8], [8.93, 0.1, 12]];
  for (let i = 0; i < n; i++) {
    const t = i / SR; let v = 0;
    for (const [r, a, d] of parts) v += Math.sin(2 * Math.PI * f * r * t + Math.sin(2 * Math.PI * f * 2 * t) * 0.15 * Math.exp(-t * 8)) * a * Math.exp(-t * d);
    v *= amp * Math.min(1, t * 400);
    out(i0 + i, v * (1 - pan * 0.5), v * (1 + pan * 0.5), 0.45);
  }
}
function pluck(t0, midi, amp = 0.09, pan = 0) {
  const f = mtof(midi), i0 = idx(t0), n = idx(0.32), lp = new BQ(); let ph = rnd(), ph2 = rnd();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 32 === 0) lp.set('lp', 300 + 5200 * Math.exp(-t * 22), 1.4);
    ph = (ph + f / SR) % 1; ph2 = (ph2 + f * 1.005 / SR) % 1;
    const s = (2 * ph - 1 - blep(ph, f / SR)) + (2 * ph2 - 1 - blep(ph2, f * 1.005 / SR));
    const v = lp.p(s * 0.5) * Math.exp(-t * 9) * amp;
    out(i0 + i, v * (1 - pan), v * (1 + pan), 0.3);
  }
}
// sustained supersaw chord for one bar, sidechained
function chordBar(t0, notes, amp, cutoff) {
  const i0 = idx(t0), n = idx(BAR), lpL = new BQ(), lpR = new BQ();
  const det = [-0.11, -0.05, 0, 0.05, 0.11];
  const osc = []; for (const m of notes) for (const d of det) osc.push({ f: mtof(m + d), ph: rnd(), pan: d * 6 });
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 64 === 0) { const c = typeof cutoff === 'function' ? cutoff(t0 + t) : cutoff; lpL.set('lp', c, 0.8); lpR.set('lp', c, 0.8); }
    let l = 0, r = 0;
    for (const o of osc) {
      const dt = o.f / SR; o.ph = (o.ph + dt) % 1;
      const s = 2 * o.ph - 1 - blep(o.ph, dt);
      l += s * (1 - o.pan * 0.6); r += s * (1 + o.pan * 0.6);
    }
    const env = Math.min(1, t * 60) * Math.min(1, (BAR - t) * 30);
    const j = i0 + i; if (j >= N) break;
    const g = amp * env * SC[j] / osc.length * 2.4;
    out(j, lpL.p(l) * g, lpR.p(r) * g, 0.25);
  }
}
function bassBar(t0, midi, amp, pattern) {
  const f = mtof(midi), lp = new BQ();
  for (const [b, len] of pattern) {
    const s0 = t0 + b * BEAT, i0 = idx(s0), n = idx(len * BEAT); let ph = 0, ph2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      if (i % 32 === 0) lp.set('lp', 180 + 900 * Math.exp(-t * 14), 1.1);
      ph = (ph + f / SR) % 1; ph2 = (ph2 + f / 2 / SR) % 1;
      const s = (2 * ph - 1 - blep(ph, f / SR)) * 0.6 + Math.sin(2 * Math.PI * ph2) * 0.9;
      const env = Math.min(1, t * 300) * Math.min(1, (n - i) / SR * 80);
      const j = i0 + i; if (j >= N) break;
      const v = Math.tanh(lp.p(s) * 1.4) * env * amp * (0.35 + 0.65 * SC[j]);
      out(j, v, v);
    }
  }
}
function riser(t0, len, amp = 0.22) {
  const i0 = idx(t0), n = idx(len), bp = new BQ(); let ph = 0;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    if (i % 64 === 0) bp.set('bp', 250 + 9000 * k * k, 1.6);
    ph += 2 * Math.PI * (180 + 1500 * k * k) / SR;
    const v = (bp.p(noise()) * 1.2 + Math.sin(ph) * 0.12) * Math.pow(k, 2.2) * amp;
    out(i0 + i, v * (1 - 0.3 * Math.sin(k * 40)), v * (1 + 0.3 * Math.sin(k * 40)), 0.35);
  }
}
function impact(t0, amp = 0.9) {
  const i0 = idx(t0), n = idx(2.2), lp = new BQ(); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 64 === 0) lp.set('lp', 200 + 6000 * Math.exp(-t * 6));
    ph += 2 * Math.PI * (32 + 60 * Math.exp(-t * 9)) / SR;
    const v = (Math.sin(ph) * Math.exp(-t * 1.6) * 0.9 + lp.p(noise()) * Math.exp(-t * 3.5) * 0.5) * amp;
    out(i0 + i, Math.tanh(v), Math.tanh(v), 0.5);
  }
}
function revCymbal(tEnd, len, amp = 0.16) {
  const n = idx(len), i0 = idx(tEnd - len), h = new BQ().set('hp', 5000);
  for (let i = 0; i < n; i++) {
    const k = i / n, v = h.p(noise()) * Math.pow(k, 3) * amp;
    out(i0 + i, v, v * 0.9, 0.3);
  }
}
function pad(t0, notes, len, amp, cutoffFn) {
  // soft detuned pad (2 saws/note, slow attack)
  const i0 = idx(t0), n = idx(len), lp = new BQ(), lp2 = new BQ();
  const osc = []; for (const m of notes) for (const d of [-0.07, 0.07]) osc.push({ f: mtof(m + d), ph: rnd(), p: d * 8 });
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if (i % 64 === 0) { const c = cutoffFn(t0 + t); lp.set('lp', c); lp2.set('lp', c); }
    let l = 0, r = 0;
    for (const o of osc) { const dt = o.f / SR; o.ph = (o.ph + dt) % 1; const s = 2 * o.ph - 1 - blep(o.ph, dt); l += s * (1 - o.p * .5); r += s * (1 + o.p * .5); }
    const env = Math.min(1, t / 0.4) * Math.min(1, (len - t) / 0.3);
    const g = amp * env / osc.length * 2;
    out(i0 + i, lp.p(l) * g, lp2.p(r) * g, 0.5);
  }
}

/* ---------------- the hook (original melody) ---------------- */
const HOOK = [
  [0, 78, 1], [1, 74, .5], [1.5, 76, .5], [2, 78, 1], [3, 81, 1],
  [4, 79, 1], [5, 78, .5], [5.5, 76, .5], [6, 74, 1.5], [7.5, 71, .5],
  [8, 74, 1], [9, 76, .5], [9.5, 78, .5], [10, 81, 1], [11, 83, 1],
  [12, 81, 1.5], [13.5, 78, .5], [14, 76, 1], [15, 73, 1]
];
function hook(t0, amp = 0.2, oct = 0) { for (const [b, m, l] of HOOK) bell(t0 + b * BEAT, m + oct, l * BEAT + 0.4, amp, (m % 3 - 1) * 0.3); }

/* ---------------- sequence ---------------- */
const totalBars = Math.ceil(DUR / BAR);
for (let bar = 0; bar < totalBars; bar++) {
  const t0 = bar * BAR, s = sec(t0), ch = chordAt(bar);

  // pads everywhere except the drop (supersaws take over there)
  if (s === 'intro' || s === 'build1' || s === 'groove' || s === 'riser' || (s === 'outro' && t0 < 36)) {
    const cut = t => s === 'intro' ? 500 + 1400 * (t / 4) : s === 'riser' ? 1500 + 3500 * ((t - 14) / 2) : s === 'outro' ? 2600 : 2200;
    pad(t0, ch.c.map(m => m - 12).concat(ch.c), BAR, s === 'intro' ? 0.22 : 0.17, cut);
  }

  // drums
  const four = s === 'build1' || s === 'groove' || s === 'drop' || (s === 'riser' && t0 < 15);
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    if (four && !(s === 'riser' && tb >= 15)) kick(tb, s === 'build1' ? 0.7 : s === 'drop' ? 1 : 0.82);
    if ((s === 'groove' || s === 'drop') && (b === 1 || b === 3)) clap(tb, s === 'drop' ? 0.55 : 0.45);
    if (s === 'groove' || s === 'drop') { hat(tb + BEAT / 2, s === 'drop' && b % 2 === 1, s === 'drop' ? 0.17 : 0.13); }
    if (s === 'drop') hat(tb + BEAT / 4, false, 0.06), hat(tb + BEAT * 3 / 4, false, 0.06);
    if (s === 'groove' || s === 'drop') for (let q = 0; q < 4; q++) sleigh(tb + q * BEAT / 4, q % 2 ? 0.06 : 0.11);
  }

  // bass
  if (s === 'build1') bassBar(t0, ch.b + 12, 0.32, [[0.5, .45], [1.5, .45], [2.5, .45], [3.5, .45]]);
  if (s === 'groove' || s === 'drop') bassBar(t0, ch.b + 12, s === 'drop' ? 0.44 : 0.3, [[0, .45], [.5, .45], [1, .45], [1.5, .45], [2, .45], [2.5, .45], [3, .45], [3.5, .45]]);
  if (s === 'riser' && t0 < 15) bassBar(t0, ch.b + 12, 0.34, [[0, .25], [.5, .25], [1, .25], [1.5, .25]]);

  // supersaw chords in the drop
  if (s === 'drop') chordBar(t0, ch.c.concat(ch.c.map(m => m + 12)), 0.3, 4200);

  // arpeggio
  if (s === 'groove' || s === 'drop') {
    const tones = ch.c.concat(ch.c.map(m => m + 12)), pat = [0, 1, 2, 3, 4, 3, 2, 1];
    for (let q = 0; q < 16; q++) pluck(t0 + q * BEAT / 4, tones[pat[q % 8]] + 12, s === 'drop' ? 0.075 : 0.065, ((q % 4) - 1.5) * 0.25);
  }
}

// hook placements (4-bar phrase = 8 s)
hook(0, 0.17);                 // intro, soft
hook(8, 0.15);                 // groove
hook(16, 0.24, 12);            // drop, bright octave
hook(24, 0.24, 12);
// outro: slow final cadence on bells
[[32, 74], [32.5, 78], [33, 81], [34, 83], [34.5, 81], [35, 78], [36, 74], [36, 78], [36, 81], [36, 86]].forEach(([t, m]) => bell(t, m, 1.6, t >= 36 ? 0.16 : 0.2));
pad(36, [50, 57, 62, 66, 69], 2, 0.2, () => 2400);

// snare roll + riser into the drop
for (let i = 0; i < 16; i++) { const t = 14 + i * (i < 8 ? BEAT / 2 : BEAT / 4) * (i < 8 ? 1 : 1); }
{ let t = 14; const steps = [[8, BEAT / 2], [8, BEAT / 4], [8, BEAT / 8]]; let k = 0;
  for (const [cnt, step] of steps) for (let i = 0; i < cnt; i++) { if (t < 16 - 0.01) clap(t, 0.18 + 0.4 * (k / 24)); t += step; k++; } }
riser(2, 2, 0.16); riser(14, 2, 0.26); riser(30, 2, 0.2);
revCymbal(4, 1.2); revCymbal(16, 1.6, 0.2); revCymbal(32, 1.4); revCymbal(28, 1, 0.12); revCymbal(24, 1, 0.12);
impact(4, 0.6); impact(16, 1); impact(32, 0.85); impact(36, 0.5);
kick(36, 0.9);

/* ---------------- reverb (Freeverb-style) ---------------- */
function reverb(inp, offset) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ b: new Float32Array(d + offset), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map(d => ({ b: new Float32Array(d + offset), i: 0 }));
  const o = new Float32Array(N), fb = 0.86, damp = 0.25;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015; let y = 0;
    for (const c of combs) { const v = c.b[c.i]; c.s = v * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * fb; c.i = (c.i + 1) % c.b.length; y += v; }
    for (const a of aps) { const v = a.b[a.i]; const z = -y + v; a.b[a.i] = y + v * 0.5; a.i = (a.i + 1) % a.b.length; y = z; }
    o[n] = y;
  }
  return o;
}
const wl = reverb(RL, 0), wr = reverb(RR, 23);

/* ---------------- master ---------------- */
const hpL = new BQ().set('hp', 28), hpR = new BQ().set('hp', 28);
let peak = 0;
for (let i = 0; i < N; i++) {
  let l = hpL.p(L[i] + wl[i] * 1.1), r = hpR.p(R[i] + wr[i] * 1.1);
  l = Math.tanh(l * 1.15); r = Math.tanh(r * 1.15);
  const t = i / SR, fade = t > DUR - 1.6 ? Math.max(0, (DUR - t) / 1.6) : 1, fin = Math.min(1, t / 0.02);
  L[i] = l * fade * fin; R[i] = r * fade * fin;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.93 / peak;
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * g * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * g * 32767))), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'music.wav', buf);
console.log('wrote', process.argv[2] || 'music.wav', DUR + 's', 'peak gain', g.toFixed(2));
