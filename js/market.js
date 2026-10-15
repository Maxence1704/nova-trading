/* ============================================================
   MOTEUR DE MARCHÉ — Nova Terminal
   Simulation crédible : dérive par régime, regroupement de
   volatilité (ARCH), saisonnalité intraday, macro-tendance,
   pullbacks, accélérations, sweeps de liquidité (faux breakouts).
   Génération strictement forward : aucune bougie future n'existe.
   ============================================================ */

Nova.TIMEFRAMES = [
  { key: '1m',  min: 1,    label: '1 min' },
  { key: '5m',  min: 5,    label: '5 min' },
  { key: '15m', min: 15,   label: '15 min' },
  { key: '1h',  min: 60,   label: '1 h' },
  { key: '4h',  min: 240,  label: '4 h' },
  { key: '1d',  min: 1440, label: '1 jour' }
];
Nova.tfMin = (k) => Nova.TIMEFRAMES.find(t => t.key === k).min;

/* Instruments simulés, libellés et réglés en euros.
   Plafonds de levier conformes aux mesures ESMA 2018 (voir SOURCES.esma_detail). */
Nova.INSTRUMENTS = {
  neo: {
    id: 'neo', name: 'NEO-EU', subtitle: 'Indice européen · futur simulé',
    price: 5240, digits: 1, tick: 0.5, unitLabel: 'contrat',
    spread: 1.0, dailyVol: 0.0128, leverageMax: 20, commissionBps: 0.25,
    sizeStep: 1, minSize: 1, accent: '#7EA6FF'
  },
  xau: {
    id: 'xau', name: 'XAU/EUR', subtitle: 'Or au comptant · simulé',
    price: 2185, digits: 2, tick: 0.05, unitLabel: 'once',
    spread: 0.55, dailyVol: 0.0106, leverageMax: 20, commissionBps: 0.6,
    sizeStep: 1, minSize: 1, accent: '#C9A227'
  },
  btc: {
    id: 'btc', name: 'BTC/EUR', subtitle: 'Actif numérique · simulé',
    price: 58400, digits: 0, tick: 1, unitLabel: 'BTC',
    spread: 28, dailyVol: 0.0355, leverageMax: 2, commissionBps: 4,
    sizeStep: 0.01, minSize: 0.01, accent: '#E08A3C'
  }
};

/* Échelle de dérive : exprimée en multiple de la volatilité par minute.
   Calibrée pour qu'une tendance de 5 h représente ~0,8 à 2 % du prix. */
const DRIFT = 0.12;

const REGIMES = {
  trend_up:   { drift:  1.0, vol: 1.00, revert: 0.000, min: 90,  max: 400 },
  trend_down: { drift: -1.0, vol: 1.00, revert: 0.000, min: 90,  max: 400 },
  range:      { drift:  0.0, vol: 0.85, revert: 0.055, min: 140, max: 620 },
  chop:       { drift:  0.0, vol: 1.10, revert: 0.000, min: 80,  max: 320 },
  highvol:    { drift:  0.35, vol: 2.30, revert: 0.000, min: 60, max: 260 },
  lowvol:     { drift:  0.1, vol: 0.45, revert: 0.010, min: 120, max: 500 }
};
const REGIME_KEYS = Object.keys(REGIMES);
const TRANSITIONS = {
  trend_up:   { trend_up: .42, chop: .14, range: .14, trend_down: .08, highvol: .13, lowvol: .09 },
  trend_down: { trend_down: .42, chop: .14, range: .14, trend_up: .08, highvol: .13, lowvol: .09 },
  range:      { chop: .22, trend_up: .20, trend_down: .20, range: .18, highvol: .10, lowvol: .10 },
  chop:       { range: .26, trend_up: .18, trend_down: .18, chop: .16, highvol: .14, lowvol: .08 },
  highvol:    { chop: .26, trend_up: .18, trend_down: .18, range: .12, highvol: .16, lowvol: .10 },
  lowvol:     { range: .30, chop: .22, trend_up: .16, trend_down: .16, highvol: .06, lowvol: .10 }
};

class Market {
  constructor(instrumentId, seed) {
    this.inst = Nova.INSTRUMENTS[instrumentId] || Nova.INSTRUMENTS.neo;
    this.seed = seed || (Math.random() * 1e9) | 0;
    this.rnd = Nova.rng(this.seed);

    this.baseSigma = this.inst.dailyVol / Math.sqrt(1440);   // volatilité par minute
    this.sub = 4;                                            // sous-pas de 15 s par minute

    /* état caché */
    this.regime = 'range';
    this.regimeLeft = 180;
    this.regimeDrift = 0;
    this.center = Math.log(this.inst.price);
    this.h = 1;                       // multiplicateur de volatilité (ARCH)
    this.zPrev = 0;
    this.macroPhase = this.rnd() * Math.PI * 2;
    this.macroPeriod = 26 + this.rnd() * 90;                  // en jours
    this.macroWalk = 0;
    this.event = null;

    /* horloge : lundi 06/01/2025 07:00 UTC, marché continu (24/7 simulé) */
    this.t0 = Date.UTC(2025, 0, 6, 7, 0, 0);
    this.bar = 0;                                            // minutes écoulées
    this.logP = Math.log(this.inst.price);
    this.mid = this.inst.price;

    /* séries par unité de temps */
    this.series = {};
    this.partial = {};
    Nova.TIMEFRAMES.forEach(t => { this.series[t.key] = []; this.partial[t.key] = null; });
    this.closed = [];                                        // unités de temps clôturées au dernier tick
    this.tickCount = 0;
    this.regimeLog = [];
  }

  /* ---------- Sélecteurs ---------- */
  get(key) { return this.series[key]; }
  last(key) { const s = this.series[key]; return s.length ? s[s.length - 1] : null; }
  candleCount(key) { return this.series[key].length; }

  /* ---------- Régimes ---------- */
  pickRegime() {
    const t = TRANSITIONS[this.regime] || TRANSITIONS.range;
    let r = this.rnd(), acc = 0;
    for (const k of REGIME_KEYS) { acc += (t[k] || 0); if (r <= acc) return k; }
    return 'chop';
  }

  enterRegime(k) {
    const R = REGIMES[k];
    this.regime = k;
    this.regimeLeft = Math.round(R.min + this.rnd() * (R.max - R.min));
    this.regimeDrift = R.drift * (0.30 + this.rnd() * 0.55);
    this.regimeLen = this.regimeLeft;
    if (k === 'range') {
      /* le centre du range s'ancre sur le prix courant */
      this.center = this.logP;
      this.rangeHalf = Math.abs(this.baseSigma) * Math.sqrt(180) * (0.9 + this.rnd() * 0.8);
    }
    this.regimeLog.push({ t: this.now(), regime: k });
    if (this.regimeLog.length > 400) this.regimeLog.shift();
  }

  spawnEvent() {
    if (this.event) return;
    const r = this.rnd();
    if (this.regime === 'trend_up' || this.regime === 'trend_down') {
      if (r < 0.30) this.event = { type: 'pullback', left: 18 + (this.rnd() * 45 | 0), amp: 1.5 + this.rnd() * 1.3 };
      else if (r < 0.44) this.event = { type: 'accel', left: 12 + (this.rnd() * 26 | 0), amp: 2.2 + this.rnd() * 1.4 };
    } else if (r < 0.18) {
      /* sweep : poussée à travers un niveau puis reprise */
      const d1 = 5 + (this.rnd() * 9 | 0);
      const a1 = (1.2 + this.rnd() * 1.1) * DRIFT;
      const d2 = Math.round(d1 * (1.4 + this.rnd() * 2.0));
      this.event = { type: 'sweep', left: d1, phase: 1, sign: this.rnd() < .5 ? 1 : -1, amp: a1, d1: d1, a1: a1, d2: d2 };
    } else if (r < 0.26) {
      this.event = { type: 'accel', left: 10 + (this.rnd() * 20 | 0), amp: 2.0 + this.rnd() * 1.2 };
    }
  }

  stepEvent() {
    if (!this.event) return;
    this.event.left--;
    if (this.event.type === 'sweep' && this.event.left <= 0) {
      if (this.event.phase === 1) {
        const e = this.event;
        /* la reprise ramène le prix vers le niveau, plus lentement qu'il n'en est sorti */
        e.phase = 2; e.left = e.d2;
        e.amp = -e.a1 * (e.d1 / e.d2) * (0.85 + this.rnd() * 0.3);
      } else this.event = null;
    } else if (this.event.left <= 0) this.event = null;
  }

  /* ---------- Dérive et volatilité instantanées (par minute) ---------- */
  driftNow() {
    const R = REGIMES[this.regime];
    const prog = this.regimeLen ? 1 - this.regimeLeft / this.regimeLen : 0.5;
    const env = Math.pow(Math.sin(Math.PI * Nova.clamp(prog, 0.02, 0.98)), 0.6);
    let d = this.regimeDrift * R.drift * DRIFT * env * this.baseSigma;

    /* macro-tendance lente : donne les tendances visibles en 4 h et 1 jour */
    const days = this.bar / 1440;
    const macro = Math.sin(this.macroPhase + (2 * Math.PI * days) / this.macroPeriod);
    d += (macro * 0.010 + this.macroWalk * 0.004) * this.baseSigma;

    /* retour à la moyenne en range */
    if (R.revert > 0 && this.rangeHalf) {
      const dev = (this.logP - this.center) / this.rangeHalf;
      d -= R.revert * dev * this.baseSigma * 3;
    }

    /* événements */
    if (this.event) {
      const e = this.event;
      if (e.type === 'pullback') {
        const s = Math.sign(this.regimeDrift || 1);
        d += -s * e.amp * Math.abs(this.regimeDrift) * DRIFT * this.baseSigma;
      } else if (e.type === 'sweep') {
        d += e.sign * e.amp * this.baseSigma;
      }
    }
    return d;
  }

  volNow() {
    const R = REGIMES[this.regime];
    let v = R.vol * this.h;
    if (this.event && this.event.type === 'accel') v *= this.event.amp;
    /* saisonnalité intraday : calme asiatique, activité sur l'ouverture US */
    const hour = ((this.bar / 60) % 24);
    const seas = 0.78 + 0.30 * Math.exp(-Math.pow((hour - 14.5) / 3.4, 2))
      + 0.16 * Math.exp(-Math.pow((hour - 8) / 2.2, 2));
    return v * seas;
  }

  now() { return this.t0 + this.bar * 60000; }

  bid() { return this.mid - this.inst.spread / 2; }
  ask() { return this.mid + this.inst.spread / 2; }

  /* ---------- Une minute de marché ---------- */
  tickMinute() {
    if (--this.regimeLeft <= 0) this.enterRegime(this.pickRegime());
    this.stepEvent();
    if (!this.event && this.rnd() < 0.012) this.spawnEvent();

    /* marche aléatoire lente du macro */
    this.macroWalk = this.macroWalk * 0.9992 + Nova.gauss(this.rnd) * 0.012;

    const dMin = this.driftNow();
    const sMin = Math.max(1e-9, this.volNow() * this.baseSigma);

    let o = this.mid, hi = -Infinity, lo = Infinity, c = this.mid;
    const sSub = sMin / Math.sqrt(this.sub);
    const dSub = dMin / this.sub;

    for (let i = 0; i < this.sub; i++) {
      const z = Nova.gauss(this.rnd);
      /* ARCH(1,1) : la volatilité se regroupe (Engle 1982, Mandelbrot 1963) */
      this.h = 0.05 + 0.05 * z * z + 0.90 * this.h;
      this.h = Nova.clamp(this.h, 0.25, 7);
      this.logP += dSub + sSub * z;
      this.mid = Math.exp(this.logP);
      if (this.mid > hi) hi = this.mid;
      if (this.mid < lo) lo = this.mid;
      c = this.mid;
    }
    this.zPrev = (c / o - 1);

    const bar = {
      t: this.now(),
      o: o, h: Math.max(hi, o, c), l: Math.min(lo, o, c), c: c,
      tf: null
    };

    this.bar++;
    this.tickCount++;
    this.lastBar = bar;
    this.aggregate(bar);
  }

  /* Agrège la minute 1m dans toutes les unités de temps */
  aggregate(bar) {
    this.closed.length = 0;
    for (const t of Nova.TIMEFRAMES) {
      const P = t.min;
      const bucket = Math.floor(bar.t / (P * 60000));
      let p = this.partial[t.key];
      if (!p || p.bucket !== bucket) {
        if (p) { this.series[t.key].push(p.candle); this.closed.push(t.key); if (this.series[t.key].length > 4200) this.series[t.key].shift(); }
        p = { bucket: bucket, candle: { t: bucket * P * 60000, o: bar.o, h: bar.h, l: bar.l, c: bar.c } };
        this.partial[t.key] = p;
      } else {
        const cd = p.candle;
        cd.h = Math.max(cd.h, bar.h); cd.l = Math.min(cd.l, bar.l); cd.c = bar.c;
      }
    }
  }

  /* ---------- Pilotage ---------- */
  /* Avance jusqu'à disposer de `n` bougies clôturées sur `tf` (plus un contexte initial). */
  warmup(tf, n) {
    const target = n;
    let guard = 0;
    while (this.series[tf].length < target && guard++ < 4000000) this.tickMinute();
  }

  /* Avance d'exactement une bougie fermée sur `tf` ; retourne les TF clôturées.
     onMinute est appelée à chaque minute simulée (exécution des ordres en temps réel). */
  advance(tf, onMinute) {
    const before = this.series[tf].length;
    let guard = 0;
    do {
      this.tickMinute();
      if (onMinute) onMinute(this);
    } while (this.series[tf].length === before && guard++ < 60000);
    return this.closed.slice();
  }

  /* Vue publique : bougies fermées + bougie en cours (aucune donnée future). */
  view(tf, count) {
    const s = this.series[tf];
    const out = s.slice(Math.max(0, s.length - count));
    const p = this.partial[tf];
    return { candles: out, live: p ? Object.assign({}, p.candle) : null };
  }

  /* Diagnostic pédagogique : nom du régime courant (utilisé par le coach après coup) */
  regimeLabel() {
    const m = {
      trend_up: 'tendance haussière', trend_down: 'tendance baissière', range: 'range',
      chop: 'marché sans direction', highvol: 'forte volatilité', lowvol: 'faible volatilité'
    };
    return m[this.regime] || 'marché sans direction';
  }
}

Nova.Market = Market;
