/* ============================================================
   COMPTE & EXÉCUTION — Nova Terminal
   Spread, commission, slippage, marge, liquidation à 50 %
   (règle de clôture ESMA 2018). Chaque exécution est journalisée.
   ============================================================ */

class Broker {
  constructor(inst, startingCash) {
    this.inst = inst;
    this.startCash = startingCash;
    this.cash = startingCash;
    this.leverage = Math.min(10, inst.leverageMax);
    this.slippageOn = true;
    this.positions = [];
    this.orders = [];
    this.closed = [];
    this.peakEquity = startingCash;
    this.maxDD = 0;
    this.seq = 1;
    this.listeners = { fill: [], close: [], order: [], reject: [] };
    this.totalCommission = 0;
    this.totalSlippage = 0;
  }

  on(ev, fn) { this.listeners[ev].push(fn); }
  emit(ev, x) { this.listeners[ev].forEach(f => f(x)); }

  /* ---------- Prix ---------- */
  ask(m) { return m.ask(); }
  bid(m) { return m.bid(); }

  slippage(m, aggressive) {
    if (!this.slippageOn) return 0;
    const volBoost = Nova.clamp(m.h || 1, 0.4, 6);
    const base = this.inst.spread * (0.10 + Math.random() * 0.35) * (aggressive ? 1.8 : 1);
    return base * (0.6 + 0.4 * volBoost);
  }

  commission(price, size) {
    return Math.abs(price * size) * (this.inst.commissionBps / 10000);
  }

  /* ---------- Évaluation ---------- */
  unrealized(m) {
    return this.positions.reduce((s, p) => s + this.markPnl(p, m), 0);
  }
  markPnl(p, m) {
    const px = p.side === 'buy' ? m.bid() : m.ask();
    return (px - p.entry) * p.size * (p.side === 'buy' ? 1 : -1) - p.exitFeesEstimate;
  }
  equity(m) { return this.cash + this.unrealized(m); }
  marginUsed() { return this.positions.reduce((s, p) => s + p.margin, 0); }
  atRisk() { return this.positions.reduce((s, p) => s + p.riskCash, 0); }
  drawdown(m) {
    const eq = this.equity(m);
    if (eq > this.peakEquity) this.peakEquity = eq;
    return this.peakEquity > 0 ? (this.peakEquity - eq) / this.peakEquity * 100 : 0;
  }

  freeMargin(m) { return this.equity(m) - this.marginUsed(); }

  /* ---------- Dimensionnement ---------- */
  sizeForRisk(riskPct, entry, stop, m) {
    const riskCash = this.equity(m) * riskPct / 100;
    const dist = Math.abs(entry - stop);
    if (dist <= 0) return { size: 0, riskCash: 0 };
    let size = riskCash / dist;
    size = Math.floor(size / this.inst.sizeStep) * this.inst.sizeStep;
    return { size: Nova.round(size, 4), riskCash: riskCash };
  }

  maxLeverageSize(price, m) {
    return (this.freeMargin(m) * this.leverage) / price;
  }

  /* ---------- Passation ---------- */
  place(m, o) {
    /* o = {kind:'market'|'limit'|'stop', side:'buy'|'sell', size, price, sl, tp, reason, tf, ctx, bar} */
    if (!(o.size > 0)) { this.emit('reject', 'Taille de position nulle.'); return null; }
    const px = o.kind === 'market' ? (o.side === 'buy' ? this.ask(m) : this.bid(m)) : o.price;
    const notional = px * o.size;
    const margin = notional / this.leverage;
    if (margin > this.freeMargin(m) + 1) {
      this.emit('reject', 'Marge insuffisante : ' + Nova.fmtMoney(margin) + ' requis, ' + Nova.fmtMoney(this.freeMargin(m)) + ' disponible.');
      return null;
    }
    const order = Object.assign({ id: this.seq++, createdBar: o.bar, createdAt: m.now() }, o);

    if (o.kind === 'market') {
      return this.fillEntry(m, order, o.side === 'buy' ? this.ask(m) : this.bid(m), true);
    }
    this.orders.push(order);
    this.emit('order', order);
    return order;
  }

  cancel(id) {
    const i = this.orders.findIndex(o => o.id === id);
    if (i >= 0) { this.orders.splice(i, 1); return true; }
    return false;
  }

  fillEntry(m, order, refPrice, aggressive) {
    const slip = this.slippage(m, aggressive) * (order.side === 'buy' ? 1 : -1);
    const fill = refPrice + slip;
    const fee = this.commission(fill, order.size);
    const entryDist = Math.abs(fill - (order.sl == null ? fill : order.sl));
    const p = {
      id: this.seq++,
      side: order.side, size: order.size, entry: fill,
      sl: order.sl, tp: order.tp,
      openedBar: order.bar, openedAt: m.now(),
      riskCash: order.size * entryDist,
      stopDist: entryDist,
      plannedRR: (order.sl != null && order.tp != null)
        ? Math.abs(order.tp - fill) / Math.max(1e-9, entryDist) : null,
      reason: order.reason || '', kind: order.kind, tf: order.tf,
      ctx: order.ctx || null, margin: (fill * order.size) / this.leverage,
      entryFee: fee, exitFeesEstimate: this.commission(fill, order.size),
      equityAtEntry: this.equity(m),
      stopMoves: [], beAt: null, maxFavR: 0, maxAdvR: 0
    };
    this.cash -= fee;
    this.totalCommission += fee;
    this.totalSlippage += Math.abs(slip) * order.size;
    this.positions.push(p);
    this.emit('fill', p);
    return p;
  }

  /* ---------- Modification (suivie par l'analyse comportementale) ---------- */
  modify(p, patch, m, bar) {
    const before = { sl: p.sl, tp: p.tp };
    if (patch.sl !== undefined) {
      const worse = p.side === 'buy' ? patch.sl < p.sl : patch.sl > p.sl;
      if (p.sl != null && patch.sl != null && worse) {
        p.stopMoves.push({ bar, from: p.sl, to: patch.sl, dir: 'worse' });
      } else if (p.sl != null && patch.sl != null) {
        p.stopMoves.push({ bar, from: p.sl, to: patch.sl, dir: 'better' });
      }
      p.stopDist = Math.abs(patch.sl - p.entry) || p.stopDist;
    }
    Object.assign(p, patch);
    p.riskCash = p.size * p.stopDist;
    return before;
  }

  /* ---------- Boucle d'exécution : appelée à chaque minute ---------- */
  tick(m) {
    const bar = m.lastBar;
    if (!bar) return;

    /* ordres en attente */
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const o = this.orders[i];
      let hit = false, ref = 0, aggressive = false;
      if (o.kind === 'limit') {
        if (o.side === 'buy' && bar.l <= o.price) { hit = true; ref = Math.min(o.price, m.ask()); }
        if (o.side === 'sell' && bar.h >= o.price) { hit = true; ref = Math.max(o.price, m.bid()); }
      } else if (o.kind === 'stop') {
        if (o.side === 'buy' && bar.h >= o.price) { hit = true; ref = m.ask(); aggressive = true; }
        if (o.side === 'sell' && bar.l <= o.price) { hit = true; ref = m.bid(); aggressive = true; }
      }
      if (hit) {
        this.orders.splice(i, 1);
        this.fillEntry(m, o, ref, aggressive);
      }
    }

    /* stop-loss et take-profit des positions ouvertes */
    for (let i = this.positions.length - 1; i >= 0; i--) {
      const p = this.positions[i];
      const fav = p.side === 'buy' ? (bar.h - p.entry) : (p.entry - bar.l);
      const adv = p.side === 'buy' ? (p.entry - bar.l) : (bar.h - p.entry);
      p.maxFavR = Math.max(p.maxFavR, fav / Math.max(1e-9, p.stopDist));
      p.maxAdvR = Math.max(p.maxAdvR, adv / Math.max(1e-9, p.stopDist));

      let exit = null, price = 0;
      /* la bougie d'entrée ne peut pas déclencher un stop/TP :
         le prix stop n'est pas un prix d'exécution garanti (SEC) et le
         marché ne peut pas sortir au-dessous de l'entrée dès l'exécution. */
      if (bar.t <= p.openedAt) continue;
      const slHit = p.sl != null && (p.side === 'buy' ? bar.l <= p.sl : bar.h >= p.sl);
      const tpHit = p.tp != null && (p.side === 'buy' ? bar.h >= p.tp : bar.l <= p.tp);

      if (slHit && tpHit) {
        /* les deux touchés dans la même minute : hypothèse prudente = stop d'abord */
        exit = 'sl'; price = p.sl;
      } else if (slHit) {
        exit = 'sl'; price = p.sl;
      } else if (tpHit) {
        exit = 'tp'; price = p.tp;
      }
      if (exit) this.closePosition(m, p, exit, price, bar.t);
    }

    /* clôture automatique à 50 % de la marge (mesure ESMA 2018) */
    if (this.positions.length && this.equity(m) < this.marginUsed() * 0.5) {
      while (this.positions.length) {
        const p = this.positions[this.positions.length - 1];
        const px = p.side === 'buy' ? m.bid() : m.ask();
        this.closePosition(m, p, 'margin', px, bar.t);
      }
      this.emit('reject', 'Clôture automatique : marge insuffisante (règle des 50 %).');
    }
  }

  closePosition(m, p, reason, price, ts) {
    const i = this.positions.indexOf(p);
    if (i < 0) return null;
    const px = typeof price === 'function' ? price() : price;
    const slip = reason === 'tp' ? 0 : this.slippage(m, reason !== 'manual' ? 0.6 : 1) * (p.side === 'buy' ? -1 : 1);
    const exit = px + slip;
    const fee = this.commission(exit, p.size);
    const gross = (exit - p.entry) * p.size * (p.side === 'buy' ? 1 : -1);
    const net = gross - fee - p.entryFee;
    this.cash += gross - fee;
    this.totalCommission += fee;
    this.positions.splice(i, 1);

    const rec = {
      id: p.id, side: p.side, size: p.size, entry: p.entry, exit: exit,
      openedAt: p.openedAt, closedAt: ts || m.now(),
      openedBar: p.openedBar, closedBar: Math.floor(((ts || m.now()) - m.t0) / 60000),
      bars: Math.max(1, Math.round(((ts || m.now()) - p.openedAt) / 60000 / (p.tf ? Nova.tfMin(p.tf) : 1))),
      sl: p.sl, tp: p.tp, plannedRR: p.plannedRR, stopDist: p.stopDist,
      riskCash: p.riskCash, pnl: net, gross: gross,
      riskPct: p.equityAtEntry ? p.riskCash / p.equityAtEntry * 100 : null,
      fees: fee + p.entryFee, reason: reason, kind: p.kind, tf: p.tf,
      reasonEntry: p.reason, ctx: p.ctx, stopMoves: p.stopMoves,
      maxFavR: p.maxFavR, maxAdvR: p.maxAdvR,
      R: p.stopDist > 0 ? net / (p.size * p.stopDist) : 0,
      tfMin: p.tf ? Nova.tfMin(p.tf) : 15
    };
    this.closed.push(rec);
    this.emit('close', rec);
    return rec;
  }

  closeAll(m, reason) {
    for (let i = this.positions.length - 1; i >= 0; i--) {
      const p = this.positions[i];
      this.closePosition(m, p, reason || 'manual', p.side === 'buy' ? m.bid() : m.ask(), m.now());
    }
  }

  reset(startingCash) {
    this.cash = startingCash || this.startCash;
    this.startCash = this.cash;
    this.positions = []; this.orders = []; this.closed = [];
    this.peakEquity = this.cash; this.maxDD = 0;
    this.totalCommission = 0; this.totalSlippage = 0;
  }
}

Nova.Broker = Broker;
