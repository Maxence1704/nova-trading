/* ============================================================
   GRAPHIQUE — Nova Terminal
   Chandeliers sur canvas, DPR-aware. Zoom, pan, crosshair,
   niveaux, position, brouillon d'ordre déplaçable à la souris.
   ============================================================ */

class Chart {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.pad = { t: 16, r: 74, b: 28, l: 10 };
    this.visible = 110;
    this.offset = 0;          // 0 = collé à la dernière bougie
    this.hover = null;
    this.mode = 'idle';       // idle | draft | drag
    this.dragTarget = null;
    this.panStart = null;
    this.draft = null;        // {side, entry, sl, tp}
    this.overlays = { levels: [], position: null, orders: [], showLevels: false, showEMA: false, e20: null, e50: null, marks: [] };
    this.data = { candles: [], live: null, tf: 15, inst: null };
    this.onPick = null;
    this.onDraft = null;
    this.bind();
    this.resize();
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    this.w = Math.max(320, r.width); this.h = Math.max(220, r.height);
    this.cv.width = this.w * this.dpr; this.cv.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.render();
  }

  set(data) { Object.assign(this.data, data); }
  setOverlays(o) { Object.assign(this.overlays, o); }

  /* ---------- Échelles ---------- */
  get plotW() { return this.w - this.pad.l - this.pad.r; }
  get plotH() { return this.h - this.pad.t - this.pad.b; }

  windowCandles() {
    const all = this.data.candles;
    const live = this.data.live;
    const arr = live ? all.concat([live]) : all.slice();
    const end = arr.length - this.offset;
    const start = Math.max(0, end - this.visible);
    const out = arr.slice(start, Math.max(start + 1, end));
    this._start = start;
    return out;
  }

  priceRange(cs) {
    let lo = Infinity, hi = -Infinity;
    for (const c of cs) { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; }
    const p = this.overlays.position;
    if (p) { [p.entry, p.sl, p.tp].forEach(v => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); }
    if (this.draft) [this.draft.entry, this.draft.sl, this.draft.tp].forEach(v => { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
    const m = (hi - lo) * 0.10 || 1;
    return { lo: lo - m, hi: hi + m };
  }

  yOf(p) { const r = this._range; return this.pad.t + (r.hi - p) / (r.hi - r.lo) * this.plotH; }
  pOf(y) { const r = this._range; return r.hi - (y - this.pad.t) / this.plotH * (r.hi - r.lo); }
  xOf(i) { return this.pad.l + (i + 0.5) * this.slot; }

  /* ---------- Rendu ---------- */
  render() {
    const g = this.ctx;
    const cs = this.windowCandles();
    if (!cs.length) { g.clearRect(0, 0, this.w, this.h); return; }
    this._cs = cs;
    this._range = this.priceRange(cs);
    this.slot = this.plotW / this.visible;

    g.clearRect(0, 0, this.w, this.h);
    this.grid(cs);
    if (this.overlays.showLevels) this.levels();
    if (this.overlays.showEMA) this.emas(cs);
    this.candles(cs);
    this.draftLines();
    this.positionLines();
    this.lastPrice(cs);
    this.axis(cs);
    if (this.hover) this.crosshair();
    this.watermark(cs);
  }

  grid(cs) {
    const g = this.ctx, r = this._range;
    const step = Nova.niceStep(r.hi - r.lo, 6);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,.035)';
    g.beginPath();
    for (let p = Math.ceil(r.lo / step) * step; p < r.hi; p += step) {
      const y = Math.round(this.yOf(p)) + .5;
      g.moveTo(this.pad.l, y); g.lineTo(this.w - this.pad.r, y);
    }
    g.stroke();
  }

  axis(cs) {
    const g = this.ctx, r = this._range, inst = this.data.inst;
    const step = Nova.niceStep(r.hi - r.lo, 6);
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,.34)';
    for (let p = Math.ceil(r.lo / step) * step; p < r.hi; p += step) {
      g.fillText(Nova.fmtPrice(p, inst), this.w - this.pad.r + 10, this.yOf(p));
    }
    /* axe temporel */
    const every = Math.max(1, Math.round(this.visible / 7));
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = 'rgba(255,255,255,.26)';
    cs.forEach((c, i) => {
      if (i % every) return;
      g.fillText(Nova.fmtTime(c.t, this.data.tf), this.xOf(i), this.h - this.pad.b + 8);
    });
  }

  candles(cs) {
    const g = this.ctx;
    const bw = Math.max(1, Math.min(18, this.slot * 0.62));
    const UP = '#2FD39F', DN = '#FF6168';
    const n = cs.length;
    for (let i = 0; i < n; i++) {
      const c = cs[i];
      const x = this.xOf(i);
      const up = c.c >= c.o;
      const isLive = (i === n - 1 && this.data.live);
      const col = up ? UP : DN;
      g.strokeStyle = col;
      g.globalAlpha = isLive ? 1 : 0.62;
      g.lineWidth = Math.max(1, bw > 3 ? 1.2 : 1);
      g.beginPath();
      g.moveTo(Math.round(x) + .5, this.yOf(c.h));
      g.lineTo(Math.round(x) + .5, this.yOf(c.l));
      g.stroke();
      const yo = this.yOf(c.o), yc = this.yOf(c.c);
      const top = Math.min(yo, yc), hgt = Math.max(1.2, Math.abs(yc - yo));
      g.globalAlpha = isLive ? 0.98 : 0.9;
      g.fillStyle = col;
      g.fillRect(x - bw / 2, top, bw, hgt);
      if (bw > 4) {
        g.globalAlpha = isLive ? 0.5 : 0.28;
        g.strokeStyle = col; g.lineWidth = 1;
        g.strokeRect(Math.round(x - bw / 2) + .5, Math.round(top) + .5, Math.round(bw), Math.round(hgt));
      }
    }
    g.globalAlpha = 1;
  }

  emas(cs) {
    const g = this.ctx;
    const draw = (arr, color) => {
      if (!arr) return;
      const start = this._start || 0;
      g.beginPath(); g.strokeStyle = color; g.lineWidth = 1.3; g.globalAlpha = .75;
      let began = false;
      for (let i = 0; i < cs.length; i++) {
        const v = arr[start + i];
        if (v == null) continue;
        const x = this.xOf(i), y = this.yOf(v);
        if (!began) { g.moveTo(x, y); began = true; } else g.lineTo(x, y);
      }
      g.stroke(); g.globalAlpha = 1;
    };
    draw(this.overlays.e20, 'rgba(126,166,255,.85)');
    draw(this.overlays.e50, 'rgba(201,162,39,.7)');
  }

  levels() {
    const g = this.ctx, inst = this.data.inst;
    const lv = this.overlays.levels || [];
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    g.textBaseline = 'middle'; g.textAlign = 'left';
    lv.slice(0, 5).forEach(z => {
      const y = this.yOf(z.p);
      if (y < this.pad.t || y > this.h - this.pad.b) return;
      const band = Math.max(2, (this._range.hi - this._range.lo) * 0.0016 * this.plotH);
      g.fillStyle = 'rgba(255,255,255,.035)';
      g.fillRect(this.pad.l, y - band / 2, this.plotW, band);
      g.strokeStyle = 'rgba(255,255,255,.13)';
      g.setLineDash([2, 4]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(this.pad.l, y + .5); g.lineTo(this.w - this.pad.r, y + .5); g.stroke();
      g.setLineDash([]);
      g.fillStyle = 'rgba(255,255,255,.34)';
      g.fillText(z.touches + '× ' + Nova.fmtPrice(z.p, inst), this.pad.l + 6, y - 8);
    });
  }

  hline(price, color, label, dashed) {
    if (price == null) return;
    const g = this.ctx, y = this.yOf(price);
    if (y < this.pad.t - 2 || y > this.h - this.pad.b + 2) return;
    g.save();
    g.strokeStyle = color; g.lineWidth = 1;
    if (dashed) g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(this.pad.l, Math.round(y) + .5); g.lineTo(this.w - this.pad.r, Math.round(y) + .5); g.stroke();
    g.setLineDash([]);
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    const w = g.measureText(label).width + 14;
    const x = this.w - this.pad.r + 4;
    g.fillStyle = color; g.globalAlpha = .95;
    this.rr(g, x, y - 8, w, 16, 4); g.fill(); g.globalAlpha = 1;
    g.fillStyle = '#0A0C0F'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(label, x + 7, y + .5);
    g.restore();
  }

  rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  positionLines() {
    const p = this.overlays.position; if (!p) return;
    const inst = this.data.inst;
    const long = p.side === 'buy';
    this.hline(p.entry, 'rgba(126,166,255,.9)', 'ENTRÉE ' + Nova.fmtPrice(p.entry, inst), false);
    this.hline(p.sl, 'rgba(255,97,104,.9)', 'SL ' + Nova.fmtPrice(p.sl, inst), true);
    this.hline(p.tp, 'rgba(47,211,159,.9)', 'TP ' + Nova.fmtPrice(p.tp, inst), true);
  }

  draftLines() {
    const d = this.draft; if (!d) return;
    const inst = this.data.inst;
    const acc = d.side === 'buy' ? 'rgba(47,211,159,.95)' : 'rgba(255,97,104,.95)';
    this.hline(d.entry, acc, (d.side === 'buy' ? 'ACHAT ' : 'VENTE ') + Nova.fmtPrice(d.entry, inst), false);
    this.hline(d.sl, 'rgba(255,97,104,.75)', 'SL ' + Nova.fmtPrice(d.sl, inst), true);
    this.hline(d.tp, 'rgba(47,211,159,.75)', 'TP ' + Nova.fmtPrice(d.tp, inst), true);
    /* zone de risque */
    const g = this.ctx, y1 = this.yOf(d.entry), y2 = this.yOf(d.sl);
    g.fillStyle = d.side === 'buy' ? 'rgba(255,97,104,.06)' : 'rgba(255,97,104,.06)';
    g.fillRect(this.pad.l, Math.min(y1, y2), this.plotW, Math.abs(y2 - y1));
  }

  lastPrice(cs) {
    const g = this.ctx, inst = this.data.inst;
    const last = cs[cs.length - 1]; if (!last) return;
    const y = this.yOf(last.c), up = last.c >= last.o;
    const col = up ? '#2FD39F' : '#FF6168';
    g.save();
    g.strokeStyle = col; g.globalAlpha = .35; g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(this.pad.l, Math.round(y) + .5); g.lineTo(this.w - this.pad.r, Math.round(y) + .5); g.stroke();
    g.setLineDash([]); g.globalAlpha = 1;
    const txt = Nova.fmtPrice(last.c, inst);
    g.font = '11px ui-sans-serif, system-ui, sans-serif';
    const w = g.measureText(txt).width + 16;
    g.fillStyle = col;
    this.rr(g, this.w - this.pad.r + 4, y - 9, w, 18, 4); g.fill();
    g.fillStyle = '#07090B'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(txt, this.w - this.pad.r + 12, y + .5);
    g.restore();
  }

  crosshair() {
    const g = this.ctx, m = this.hover;
    if (m.x < this.pad.l || m.x > this.w - this.pad.r) return;
    const inst = this.data.inst;
    g.save();
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath();
    g.moveTo(Math.round(m.x) + .5, this.pad.t); g.lineTo(Math.round(m.x) + .5, this.h - this.pad.b);
    g.moveTo(this.pad.l, Math.round(m.y) + .5); g.lineTo(this.w - this.pad.r, Math.round(m.y) + .5);
    g.stroke(); g.setLineDash([]);
    const p = this.pOf(m.y), txt = Nova.fmtPrice(p, inst);
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    const w = g.measureText(txt).width + 14;
    g.fillStyle = '#1A1F26'; this.rr(g, this.w - this.pad.r + 4, m.y - 8, w, 16, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(txt, this.w - this.pad.r + 11, m.y + .5);
    const i = Math.round((m.x - this.pad.l) / this.slot - .5);
    const c = this._cs[i];
    if (c) {
      const t = Nova.fmtTime(c.t, this.data.tf);
      const tw = g.measureText(t).width + 16;
      g.fillStyle = '#1A1F26'; this.rr(g, Nova.clamp(m.x - tw / 2, this.pad.l, this.w - this.pad.r - tw), this.h - this.pad.b + 4, tw, 17, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'center';
      g.fillText(t, Nova.clamp(m.x, this.pad.l + tw / 2, this.w - this.pad.r - tw / 2), this.h - this.pad.b + 12.5);
    }
    g.restore();
  }

  watermark(cs) {
    const g = this.ctx, inst = this.data.inst;
    if (!inst) return;
    g.save();
    g.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,.20)'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(inst.name, this.pad.l + 8, this.pad.t + 2);
    g.font = '10px ui-sans-serif, system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,.12)';
    const last = cs[cs.length - 1];
    g.fillText(Nova.TIMEFRAMES.find(t => t.min === this.data.tf).label + (last ? ' · ' + Nova.fmtTime(last.t, this.data.tf) : ''), this.pad.l + 8, this.pad.t + 20);
    g.restore();
  }

  /* ---------- Interaction (souris + tactile) ---------- */
  down(m) {
    if (this.mode === 'draft' && this.draft) {
      const hit = this.hitLine(m.y);
      if (hit) { this.dragTarget = hit; this.mode = 'drag'; return; }
    }
    if (this.mode === 'draft' && !this.draft) {
      this.draft = null;
      this.onPick && this.onPick(this.pOf(m.y));
      return;
    }
    this.panStart = { x: m.x, offset: this.offset };
  }

  move(m) {
    if (this.dragTarget && this.draft) {
      this.draft[this.dragTarget] = this.pOf(m.y);
      this.onDraft && this.onDraft(this.draft);
      this.render();
      return;
    }
    if (this.panStart) {
      const d = Math.round((m.x - this.panStart.x) / this.slot);
      this.offset = Nova.clamp(this.panStart.offset + d, 0, Math.max(0, this.data.candles.length - 6));
      this.render();
      return;
    }
    this.render();
  }

  up() {
    this.dragTarget = null;
    this.panStart = null;
    this.pinch = null;
  }

  bind() {
    const cv = this.cv;
    cv.style.touchAction = 'none';          /* le geste pilote le graphique, pas la page */
    Nova.on(window, 'resize', () => this.resize());
    Nova.on(window, 'orientationchange', () => setTimeout(() => this.resize(), 180));

    /* --- souris --- */
    Nova.on(cv, 'wheel', (e) => {
      e.preventDefault();
      this.visible = Nova.clamp(Math.round(this.visible * (e.deltaY > 0 ? 1.12 : 0.89)), 18, 600);
      this.render();
    }, { passive: false });

    Nova.on(cv, 'mousedown', (e) => {
      if (e.button !== 0) return;
      this.down(this.pos(e));
      cv.style.cursor = (this.mode === 'draft' && this.draft && this.dragTarget) ? 'grabbing' : cv.style.cursor;
    });

    Nova.on(window, 'mousemove', (e) => {
      const m = this.pos(e);
      this.hover = (m.x >= 0 && m.x <= this.w && m.y >= 0 && m.y <= this.h) ? m : null;
      if (this.dragTarget || this.panStart) { this.move(m); return; }
      cv.style.cursor = (this.mode === 'draft' && this.draft && this.hitLine(m.y)) ? 'ns-resize'
        : this.mode === 'draft' ? 'crosshair' : 'crosshair';
      this.render();
    });

    Nova.on(window, 'mouseup', () => { this.up(); cv.style.cursor = 'crosshair'; });
    Nova.on(cv, 'mouseleave', () => { this.hover = null; this.render(); });
    Nova.on(cv, 'dblclick', () => { this.offset = 0; this.render(); });

    /* --- tactile --- */
    const tp = t => this.pos(t);
    const dist = ts => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY);

    Nova.on(cv, 'touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        this.pinch = { d: dist(e.touches), visible: this.visible };
        this.panStart = null; this.dragTarget = null;
        return;
      }
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const m = tp(e.touches[0]);
      this.hover = m;
      this.down(m);
    }, { passive: false });

    Nova.on(cv, 'touchmove', (e) => {
      if (e.touches.length === 2 && this.pinch) {
        e.preventDefault();
        const d = dist(e.touches);
        this.visible = Nova.clamp(Math.round(this.pinch.visible * this.pinch.d / Math.max(1, d)), 18, 600);
        this.render();
        return;
      }
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const m = tp(e.touches[0]);
      this.hover = m;
      this.move(m);
    }, { passive: false });

    const endTouch = (e) => {
      if (e.touches.length === 0) { this.up(); this.hover = null; this.render(); }
      else if (e.touches.length === 1) this.pinch = null;
    };
    Nova.on(cv, 'touchend', endTouch, { passive: true });
    Nova.on(cv, 'touchcancel', endTouch, { passive: true });
  }

  pos(e) {
    const r = this.cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  hitLine(y) {
    if (!this.draft) return null;
    const t = [['sl', 7], ['tp', 7], ['entry', 5]];
    for (const [k, tol] of t) {
      if (this.draft[k] == null) continue;
      if (Math.abs(this.yOf(this.draft[k]) - y) < tol) return k;
    }
    return null;
  }

  follow() { return this.offset === 0; }
  snapFollow() { this.offset = 0; this.render(); }
}

Nova.Chart = Chart;
