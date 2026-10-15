/* ============================================================
   UTILITAIRES — Nova Terminal
   ============================================================ */

const Nova = {};

/* ---------- Générateur pseudo-aléatoire déterministe (mulberry32) ---------- */
Nova.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

Nova.gauss = function (rnd) {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

Nova.hashSeed = function (str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

/* ---------- Maths ---------- */
Nova.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
Nova.lerp = (a, b, t) => a + (b - a) * t;
Nova.round = (v, d) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };

/* Pas « joli » pour une échelle de prix */
Nova.niceStep = function (range, target) {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
  return step * mag;
};

/* ---------- Formatage ---------- */
const nf = (d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

Nova.fmtMoney = (v, d = 2) => (v < 0 ? '−' : '') + nf(d).format(Math.abs(v)) + ' €';
Nova.fmtSigned = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(d).format(Math.abs(v)) + ' €';
Nova.fmtPct = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(d).format(Math.abs(v)) + ' %';
Nova.fmtR = (v, d = 2) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(d).format(Math.abs(v)) + ' R';
Nova.fmtNum = (v, d = 0) => nf(d).format(v);

Nova.fmtPrice = function (v, inst) {
  return nf(inst.digits).format(v);
};

Nova.fmtTime = function (ts, tf) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const dd = pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1);
  const hh = pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  if (tf >= 1440) return dd + '/' + String(d.getUTCFullYear()).slice(2);
  if (tf >= 240) return dd + ' · ' + hh;
  return dd + ' ' + hh;
};

Nova.fmtClock = function (ts) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + ' · ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ' UTC';
};

Nova.fmtDuration = function (bars, tf) {
  const mins = bars * tf;
  if (mins < 60) return mins + ' min';
  if (mins < 1440) return (mins / 60).toFixed(mins % 60 ? 1 : 0) + ' h';
  return (mins / 1440).toFixed(1) + ' j';
};

/* ---------- DOM ---------- */
Nova.el = function (tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

Nova.on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

/* ---------- Stockage ---------- */
Nova.store = {
  get(k, dflt) {
    try { const v = localStorage.getItem('nova.' + k); return v == null ? dflt : JSON.parse(v); }
    catch (e) { return dflt; }
  },
  set(k, v) {
    try { localStorage.setItem('nova.' + k, JSON.stringify(v)); } catch (e) { }
  }
};

/* ---------- Micro animations ---------- */
Nova.pulse = function (el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 900);
};

Nova.flash = function (text, tone) {
  const t = Nova.el('div', 'toast toast--' + (tone || 'info'), text);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 320); }, 2600);
};

Nova.easings = { out: 'cubic-bezier(.22,1,.36,1)' };
