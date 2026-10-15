/* ============================================================
   INDICATEURS & LECTURE DE STRUCTURE — Nova Terminal
   Tout est calculé sur bougies CLÔTURÉES uniquement.
   Les pivots ne sont « connus » que k bougies plus tard :
   aucune information future n'est jamais utilisée.
   ============================================================ */

Nova.ind = (function () {

  function ema(vals, p) {
    const k = 2 / (p + 1), out = new Array(vals.length);
    let e = vals[0];
    for (let i = 0; i < vals.length; i++) { e = i === 0 ? vals[0] : vals[i] * k + e * (1 - k); out[i] = e; }
    return out;
  }

  function sma(vals, p) {
    const out = new Array(vals.length); let s = 0;
    for (let i = 0; i < vals.length; i++) {
      s += vals[i]; if (i >= p) s -= vals[i - p];
      out[i] = i >= p - 1 ? s / p : null;
    }
    return out;
  }

  function atr(candles, p) {
    const out = new Array(candles.length);
    let a = null;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i], prev = candles[i - 1];
      const tr = prev ? Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c)) : (c.h - c.l);
      if (i === 0) { a = tr; }
      else if (i < p) { a = (a * i + tr) / (i + 1); }
      else { a = (a * (p - 1) + tr) / p; }
      out[i] = a;
    }
    return out;
  }

  function rsi(candles, p) {
    const out = new Array(candles.length);
    let g = 0, l = 0;
    for (let i = 1; i < candles.length; i++) {
      const d = candles[i].c - candles[i - 1].c;
      const up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= p) { g += up / p; l += dn / p; out[i] = 50; if (i === p) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
      else {
        g = (g * (p - 1) + up) / p; l = (l * (p - 1) + dn) / p;
        out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
      }
    }
    out[0] = 50;
    return out;
  }

  /* Pivots confirmés : un sommet en i exige k bougies plus basses après lui. */
  function pivots(candles, k) {
    const highs = [], lows = [];
    for (let i = k; i < candles.length - k; i++) {
      let isH = true, isL = true;
      for (let j = i - k; j <= i + k; j++) {
        if (j === i) continue;
        if (candles[j].h >= candles[i].h) isH = false;
        if (candles[j].l <= candles[i].l) isL = false;
      }
      if (isH) highs.push({ i: i, p: candles[i].h });
      if (isL) lows.push({ i: i, p: candles[i].l });
    }
    return { highs, lows };
  }

  /* Regroupe les pivots en zones (tolérance en multiple d'ATR). */
  function levels(candles, k, atrArr, tol) {
    const a = atrArr[atrArr.length - 1] || 1;
    const tolP = a * (tol || 0.6);
    const pv = pivots(candles, k);
    const zones = [];
    const add = (p, type, i) => {
      for (const z of zones) {
        if (Math.abs(z.p - p) <= tolP) {
          z.p = (z.p * z.touches + p) / (z.touches + 1);
          z.touches++; z.last = i;
          if (type === 'h') z.h++; else z.l++;
          return;
        }
      }
      zones.push({ p: p, touches: 1, last: i, h: type === 'h' ? 1 : 0, l: type === 'h' ? 0 : 1 });
    };
    pv.highs.forEach(x => add(x.p, 'h', x.i));
    pv.lows.forEach(x => add(x.p, 'l', x.i));
    zones.sort((x, y) => y.touches - x.touches || y.last - x.last);
    return zones.slice(0, 8);
  }

  /* Structure : sommets/creux croissants ou décroissants sur les pivots confirmés. */
  function structure(candles, k) {
    const pv = pivots(candles, k);
    const H = pv.highs.slice(-3), L = pv.lows.slice(-3);
    let score = 0, note = '';
    if (H.length >= 2 && L.length >= 2) {
      const hh = H[H.length - 1].p > H[H.length - 2].p;
      const hl = L[L.length - 1].p > L[L.length - 2].p;
      const lh = H[H.length - 1].p < H[H.length - 2].p;
      const ll = L[L.length - 1].p < L[L.length - 2].p;
      if (hh && hl) { score = 1; note = 'sommets et creux plus hauts'; }
      else if (lh && ll) { score = -1; note = 'sommets et creux plus bas'; }
      else if (hh || hl) { score = 0.4; note = 'structure légèrement haussière'; }
      else if (lh || ll) { score = -0.4; note = 'structure légèrement baissière'; }
      else note = 'structure neutre';
    }
    return { score, note, highs: H, lows: L };
  }

  /* Contexte complet de la dernière bougie clôturée — cœur du coach et du débrief. */
  function context(candles, opts) {
    const n = candles.length;
    if (n < 30) return null;
    const closes = candles.map(c => c.c);
    const k = opts.k || 3;
    const atrArr = atr(candles, 14);
    const e20 = ema(closes, 20);
    const e50 = ema(closes, 50);
    const r = rsi(candles, 14);
    const i = n - 1;
    const a = atrArr[i];
    const st = structure(candles, k);
    const lv = levels(candles, k, atrArr, 0.6);
    const last = candles[i];

    /* tendance : pente de l'EMA20 normalisée par l'ATR */
    const slope = (e20[i] - e20[Math.max(0, i - 10)]) / (a * 3 || 1);
    let trend = 'flat';
    if (slope > 0.22) trend = 'up'; else if (slope < -0.22) trend = 'down';

    /* amplitude de range sur 20 bougies vs ATR → détection de consolidation */
    let hi = -Infinity, lo = Infinity;
    for (let j = i - 19; j <= i; j++) { hi = Math.max(hi, candles[j].h); lo = Math.min(lo, candles[j].l); }
    const rangeW = hi - lo;
    const consolidation = rangeW < a * 5;

    /* distance au niveau le plus proche */
    const mid = (last.h + last.l) / 2;
    let near = null;
    for (const z of lv) {
      const d = (z.p - mid) / a;
      if (!near || Math.abs(d) < Math.abs(near.distAtr)) near = { level: z, distAtr: d, dist: z.p - mid };
    }

    /* cassure : la dernière bougie clôture au-delà d'un niveau qui tenait depuis au moins 5 bougies */
    let breakout = null;
    for (const z of lv) {
      const held = i - z.last >= 4;
      if (!held) continue;
      const crossed = last.c > z.p && candles[i - 1].c <= z.p;
      const crossedDn = last.c < z.p && candles[i - 1].c >= z.p;
      if (crossed || crossedDn) {
        breakout = { level: z, dir: crossed ? 1 : -1, body: Math.abs(last.c - last.o), distAtr: (last.c - z.p) / a };
        break;
      }
    }

    /* expansion / compression de volatilité */
    let atrPrev = 0; for (let j = i - 5; j < i; j++) atrPrev += atrArr[j]; atrPrev /= 5;
    const volRatio = atrPrev ? atrArr[i] / atrPrev : 1;

    const atrArrShort = atrArr.slice(-60);
    const atrMin = Math.min.apply(null, atrArrShort), atrMax = Math.max.apply(null, atrArrShort);
    const volState = atrMax === atrMin ? 'moyenne'
      : (atrArr[i] - atrMin) / (atrMax - atrMin) > 0.7 ? 'élevée'
        : (atrArr[i] - atrMin) / (atrMax - atrMin) < 0.3 ? 'faible' : 'moyenne';

    return {
      i, a, atr: atrArr, e20, e50, rsi: r, rsiV: r[i],
      structure: st, trend, slope, levels: lv, near, breakout,
      consolidation, volRatio, volState,
      last, mid, hi20: hi, lo20: lo, rangeW,
      bodyRatio: Math.abs(last.c - last.o) / Math.max(1e-9, last.h - last.l)
    };
  }

  return { ema, sma, atr, rsi, pivots, levels, structure, context };
})();
