/* ============================================================
   INTERFACE — Nova Terminal
   Écrans, navigation, modales, journal, bibliothèque, coach.
   ============================================================ */

Nova.UI = (function () {

  const ICONS = {
    home: '<path d="M3 8.5L9 3l6 5.5V14a1 1 0 01-1 1h-3v-4H7v4H4a1 1 0 01-1-1z"/>',
    flag: '<path d="M4 15V3l8 2.5L4 8"/><path d="M4 3l8 2.5v5L4 8"/>',
    list: '<path d="M4 5h9M4 9h9M4 13h6"/>',
    target: '<circle cx="9" cy="9" r="6"/><circle cx="9" cy="9" r="2.4"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2"/>',
    book: '<path d="M3 4.5A1.5 1.5 0 014.5 3H14v12H4.5A1.5 1.5 0 003 16.5z"/><path d="M3 15.5A1.5 1.5 0 014.5 14H14"/>',
    x: '<path d="M4 4l8 8M12 4l-8 8"/>',
    play: '<path d="M4 2.5l9 5.5-9 5.5z"/>',
    arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
    doc: '<path d="M5 2h5l4 4v10H5z"/><path d="M10 2v4h4"/>',
    check: '<path d="M3 9l3.5 3.5L13 5.5"/>',
    lock: '<rect x="3.5" y="8" width="9" height="7" rx="1.4"/><path d="M6 8V6a2 2 0 014 0v2"/>'
  };

  const svg = (n, s) => '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:' + (s || 16) + 'px;height:' + (s || 16) + 'px">' + (ICONS[n] || '') + '</svg>';

  const NAV = [
    { id: 'home', icon: 'home', title: 'Accueil' },
    { id: 'campaign', icon: 'flag', title: 'Campagne' },
    { id: 'journal', icon: 'list', title: 'Journal' },
    { id: 'coach', icon: 'target', title: 'Coach' },
    { id: 'library', icon: 'book', title: 'Bibliothèque' }
  ];

  let current = 'home';

  function buildNav() {
    const n = document.getElementById('nav');
    n.innerHTML = NAV.map(x => '<button data-go="' + x.id + '" title="' + x.title + '">' + svg(x.icon, 18) + '</button>').join('');
    n.querySelectorAll('button').forEach(b => b.onclick = () => show(b.dataset.go));
  }

  function show(id) {
    current = id;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.dataset.screen === id));
    document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.go === id));
    if (id === 'home') renderHome();
    if (id === 'campaign') renderCampaign();
    if (id === 'journal') renderJournal();
    if (id === 'coach') renderCoachScreen();
    if (id === 'library') renderLibrary();
    if (id !== 'session' && Nova.App && Nova.App.pause) Nova.App.pause();
  }

  /* ================= MODALE ================= */
  function modal(o) {
    const root = document.getElementById('modalRoot');
    root.innerHTML =
      '<div class="modal-bg" data-close></div>' +
      '<div class="modal" role="dialog">' +
      '<div class="modal-h"><div><div class="label" style="margin-bottom:5px">' + (o.eyebrow || '') + '</div>' +
      '<div class="h2">' + (o.title || '') + '</div></div>' +
      (o.dismissible === false ? '' : '<button class="x" data-close>' + svg('x', 14) + '</button>') + '</div>' +
      '<div class="modal-b">' + (o.body || '') + '</div>' +
      (o.actions ? '<div class="modal-f">' + o.actions + '</div>' : '') +
      '</div>';
    root.classList.add('on');
    root.querySelectorAll('[data-close]').forEach(e => e.onclick = () => { close(); o.onClose && o.onClose(); });
    if (o.onMount) o.onMount(root);
    function close() { root.classList.remove('on'); root.innerHTML = ''; }
    return { close, root };
  }
  const closeModal = () => { const r = document.getElementById('modalRoot'); r.classList.remove('on'); r.innerHTML = ''; };

  /* ================= BLOCS RÉUTILISABLES ================= */
  function sourceBlock(ids) {
    const s = (ids || []).map(id => SOURCES[id]).filter(Boolean);
    if (!s.length) return '';
    return s.map(x =>
      '<div class="src"><span class="ic">' + svg('doc', 12) + '</span><div>' +
      esc(x.label) + (x.finding ? '<div style="margin-top:4px;color:var(--txt-3)">' + esc(x.finding) + '</div>' : '') +
      '<div style="margin-top:4px"><a href="' + x.url + '" target="_blank" rel="noopener">' + shortUrl(x.url) + '</a></div>' +
      '</div></div>').join('');
  }

  const shortUrl = u => u.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 58) + (u.length > 66 ? '…' : '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function ring(score, size) {
    size = size || 62;
    const r = (size - 8) / 2, C = 2 * Math.PI * r;
    const col = score >= 70 ? 'var(--up)' : score >= 45 ? 'var(--warn)' : 'var(--down)';
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="var(--panel-3)" stroke-width="4" fill="none"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke="' + col + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - score / 100)) + '"/>' +
      '</svg><div class="val">' + score + '</div></div>';
  }

  function sparkline(canvas, pts, color) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    if (!pts || pts.length < 2) { g.fillStyle = 'rgba(255,255,255,.2)'; g.font = '11px ' + getComputedStyle(document.body).fontFamily; g.fillText('Pas encore assez de données', 12, h / 2); return; }
    const vals = pts.map(p => p.eq);
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * .12; hi += pad; lo -= pad;
    const X = i => 4 + i / (vals.length - 1) * (w - 8);
    const Y = v => h - 6 - (v - lo) / (hi - lo) * (h - 12);
    const base = pts[0].eq;
    const col = color || (vals[vals.length - 1] >= base ? 'rgba(47,211,159,' : 'rgba(255,97,104,');
    g.beginPath(); g.moveTo(X(0), Y(vals[0]));
    vals.forEach((v, i) => g.lineTo(X(i), Y(v)));
    g.strokeStyle = col + '1)'; g.lineWidth = 1.6; g.stroke();
    g.lineTo(X(vals.length - 1), h); g.lineTo(X(0), h); g.closePath();
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, col + '.20)'); grd.addColorStop(1, col + '0)');
    g.fillStyle = grd; g.fill();
    /* ligne de référence : capital initial */
    g.setLineDash([3, 4]); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, Y(base)); g.lineTo(w, Y(base)); g.stroke(); g.setLineDash([]);
  }

  /* ================= ACCUEIL ================= */
  function renderHome() {
    const recs = Nova.App.allRecords();
    const m = Nova.stats.metrics(recs, 10000);
    const ax = Nova.App.axes();
    document.getElementById('railLvl').textContent = 'N' + (Nova.stats.level(ax.mastery).idx + 1);

    const tiles = [
      { l: 'Maîtrise', v: ax.mastery + ' / 100', s: Nova.stats.level(ax.mastery).name },
      { l: 'Trades', v: m.n, s: m.n ? 'taux de réussite ' + m.winRate.toFixed(0) + ' %' : 'aucun pour l\'instant' },
      { l: 'Espérance', v: m.n ? Nova.fmtR(m.expectancyR) : '—', s: m.n ? 'par trade' : 'moyenne en R' },
      { l: 'Drawdown max', v: m.n ? m.maxDD.toFixed(1) + ' %' : '—', s: 'depuis le plus haut' }
    ];
    document.getElementById('homeStats').innerHTML = tiles.map(t =>
      '<div class="tile"><div class="label">' + t.l + '</div><div class="v">' + t.v + '</div>' +
      '<div class="tiny dim" style="margin-top:3px">' + t.s + '</div></div>').join('');

    const modes = [
      { id: 'learn', t: 'Apprentissage', d: 'Le coach observe, pose des questions au bon moment et explique chaque notion avec sa source. Assistance maximale.', ic: 'book' },
      { id: 'challenge', t: 'Défi', d: 'Un objectif précis et des contraintes : identifier une tendance, trouver la cassure, tenir 1 % de risque.', ic: 'target' },
      { id: 'free', t: 'Libre', d: 'Aucune assistance. Analyse, exécution et gestion entièrement à votre charge.', ic: 'flag' },
      { id: 'campaign', t: 'Campagne', d: 'Seize leçons, du premier chandelier à l\'espérance positive sur trente trades.', ic: 'list' }
    ];
    document.getElementById('homeModes').innerHTML = modes.map(x =>
      '<button class="mode" data-mode="' + x.id + '"><div class="mode-ic">' + svg(x.ic, 17) + '</div>' +
      '<h3>' + x.t + '</h3><p>' + x.d + '</p><span class="go">' + svg('arrow', 15) + '</span></button>').join('');
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
      const id = b.dataset.mode;
      if (id === 'campaign') show('campaign');
      else Nova.App.start({ mode: id });
    });
  }

  /* ================= CAMPAGNE ================= */
  const CHAPTERS = { 1: 'Débutant', 2: 'Intermédiaire', 3: 'Avancé', 4: 'Expert' };

  function renderCampaign() {
    const prog = Nova.App.progress();
    const host = document.getElementById('chapters');
    let html = '';
    for (const c of [1, 2, 3, 4]) {
      const ls = LESSONS.filter(l => l.chapter === c);
      html += '<div class="chapter"><div class="chapter-h"><div class="h2">' + CHAPTERS[c] + '</div>' +
        '<div class="dim tiny">chapitre ' + c + ' · ' + ls.filter(l => prog[l.id]).length + '/' + ls.length + ' validées</div></div>' +
        '<div class="lessons">' + ls.map((l, i) => {
          const prev = LESSONS[LESSONS.indexOf(l) - 1];
          const locked = prev && !prog[prev.id];
          const done = prog[l.id];
          return '<button class="lesson' + (locked ? ' locked' : '') + (done ? ' done' : '') + '" data-lesson="' + l.id + '"' + (locked ? ' disabled' : '') + '>' +
            '<div class="row" style="gap:8px"><span class="badge ' + (done ? 'pos' : locked ? 'info' : 'info') + '">' + (done ? 'Validée' : locked ? 'Verrouillée' : 'À faire') + '</span>' +
            '<span class="tiny dim">' + l.tf + '</span></div>' +
            '<div class="lesson-t">' + esc(l.name) + '</div>' +
            '<div class="lesson-b">' + esc(l.task) + '</div>' +
            '<div class="lesson-f"><span class="tiny dim">' + esc(l.brief) + '</span></div>' +
            '</button>';
        }).join('') + '</div></div>';
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => {
      if (b.disabled) return;
      Nova.App.startLesson(b.dataset.lesson);
    });

    const done = Object.keys(prog).length;
    document.getElementById('campProgress').innerHTML =
      '<div class="label">Leçons validées</div>' +
      '<div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:24px;font-weight:600">' + done + '</span><span class="dim">/ ' + LESSONS.length + '</span></div>' +
      '<div class="bar mt-s"><i style="width:' + (done / LESSONS.length * 100) + '%"></i></div>';
  }

  /* ================= JOURNAL ================= */
  function renderJournal() {
    const recs = Nova.App.allRecords();
    const m = Nova.stats.metrics(recs, 10000);
    const tiles = [
      { l: 'Trades', v: m.n, s: m.wins + ' gagnants · ' + m.losses + ' perdants' },
      { l: 'Taux de réussite', v: m.n ? m.winRate.toFixed(1) + ' %' : '—', s: 'ne dit rien seul' },
      { l: 'Espérance', v: m.n ? Nova.fmtR(m.expectancyR) : '—', s: 'gain moyen · perte moyenne ' + m.avgWinR.toFixed(2) + ' / −' + m.avgLossR.toFixed(2) },
      { l: 'Coûts', v: Nova.fmtMoney(m.fees), s: 'spread + commission + slippage' }
    ];
    document.getElementById('jStats').innerHTML = tiles.map(t =>
      '<div class="tile"><div class="label">' + t.l + '</div><div class="v">' + t.v + '</div><div class="tiny dim" style="margin-top:3px">' + t.s + '</div></div>').join('');

    const eq = Nova.stats.equityCurve(recs, 10000);
    const cv = document.getElementById('eqCanvas');
    requestAnimationFrame(() => sparkline(cv, eq.pts));
    document.getElementById('eqRange').textContent = recs.length
      ? 'départ 10 000 € · final ' + Nova.fmtMoney(eq.final) + ' · drawdown max ' + eq.maxDD.toFixed(1) + ' %' : '';

    document.getElementById('jCount').textContent = recs.length + ' trades enregistrés';
    if (!recs.length) {
      document.getElementById('jTable').innerHTML = '<div class="empty">Aucun trade pour l\'instant. Lancez une session pour remplir le journal.</div>';
      return;
    }
    const rows = recs.slice().reverse().map(r => {
      const d = new Date(r.closedAt);
      const q = r.score == null ? '' : r.score;
      const qc = q === '' ? '' : q >= 70 ? 'up' : q >= 45 ? '' : 'dn';
      return '<tr>' +
        '<td class="tiny">' + Nova.fmtClock(r.closedAt) + '</td>' +
        '<td class="' + (r.side === 'buy' ? 'up' : 'dn') + '" style="font-weight:600">' + (r.side === 'buy' ? 'LONG' : 'SHORT') + '</td>' +
        '<td class="r">' + Nova.fmtNum(r.size, r.size < 1 ? 2 : 0) + '</td>' +
        '<td class="r">' + Nova.fmtNum(r.entry, 2) + '</td>' +
        '<td class="r">' + Nova.fmtNum(r.exit, 2) + '</td>' +
        '<td class="r ' + (r.R >= 0 ? 'up' : 'dn') + '">' + Nova.fmtR(r.R) + '</td>' +
        '<td class="r ' + (r.pnl >= 0 ? 'up' : 'dn') + '">' + Nova.fmtSigned(r.pnl) + '</td>' +
        '<td class="r dim">' + (r.riskPct != null ? r.riskPct.toFixed(2) + ' %' : '—') + '</td>' +
        '<td class="r dim">' + (r.plannedRR ? r.plannedRR.toFixed(2) : '—') + '</td>' +
        '<td class="dim tiny">' + r.tf + '</td>' +
        '<td class="dim tiny">' + exitLabel(r.reason) + '</td>' +
        '<td class="tiny">' + esc(r.reasonEntry || '—') + '</td>' +
        '<td class="tiny dim">' + esc((r.ctx && r.ctx.regime) || '—') + '</td>' +
        '<td class="r dim">' + (r.ctx && r.ctx.scoreSetup != null ? r.ctx.scoreSetup : '—') + '</td>' +
        '<td class="r ' + qc + '">' + q + '</td>' +
        '</tr>';
    }).join('');
    document.getElementById('jTable').innerHTML =
      '<table><thead><tr><th>Date</th><th>Sens</th><th class="r">Taille</th><th class="r">Entrée</th><th class="r">Sortie</th>' +
      '<th class="r">R</th><th class="r">P&L</th><th class="r">Risque</th><th class="r">R:R</th><th>TF</th><th>Sortie</th><th>Motif</th><th>Contexte</th><th class="r">Setup</th><th class="r">Décision</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>';
  }

  const exitLabel = r => ({ sl: 'Stop', tp: 'Cible', manual: 'Manuelle', margin: 'Marge' }[r] || r);

  /* ================= COACH ================= */
  function renderCoachScreen() {
    const recs = Nova.App.allRecords();
    const m = Nova.stats.metrics(recs, 10000);
    const issues = Nova.stats.detect(recs, Nova.App.totalBars());
    const ax = Nova.App.axes();
    document.getElementById('masteryVal').textContent = ax.mastery;
    document.getElementById('masteryLvl').textContent = Nova.stats.level(ax.mastery).name;

    const host = document.getElementById('issuesHost');
    if (!issues.length) {
      host.innerHTML = '<div class="panel"><div class="panel-b empty">' +
        (recs.length < 3 ? 'Encore trop peu de trades pour dégager une habitude. Au-delà de 3 trades, le coach commence à mesurer vos dérives.'
          : 'Aucune dérive détectée sur les derniers trades. Continuez : la discipline se mesure dans la durée, pas sur une session.') +
        '</div></div>';
    } else {
      host.innerHTML = issues.map(i =>
        '<div class="issue ' + (i.sev === 'high' ? 'high' : '') + '">' +
        '<div class="issue-t">' + svg(i.sev === 'high' ? 'target' : 'list', 14) + esc(i.title) + '</div>' +
        '<div class="issue-d">' + esc(i.detail) + '</div>' +
        (DRILLS[i.drill] ? '<div class="mt-s">' + sourceBlock(DRILLS[i.drill].sources.slice(0, 2)) + '</div>' : '') +
        '</div>').join('');
    }

    const names = { analyse: 'Analyse', discipline: 'Discipline', risque: 'Gestion du risque', connaissance: 'Connaissance', constance: 'Constance', performance: 'Performance' };
    document.getElementById('axesHost').innerHTML = Object.keys(ax.vals).map(k =>
      '<div class="axis"><div class="n">' + names[k] + '</div>' +
      '<div class="bar"><i style="width:' + ax.vals[k] + '%;background:' + (ax.vals[k] >= 70 ? 'var(--up)' : ax.vals[k] >= 45 ? 'var(--warn)' : 'var(--down)') + '"></i></div>' +
      '<div class="v">' + ax.vals[k] + '</div></div>').join('') +
      '<div class="divider"></div><div class="kv"><span>Pondération de la performance</span><span>15 %</span></div>' +
      '<div class="kv"><span>Échantillon</span><span>' + m.n + ' trades</span></div>';

    const drills = issues.map(i => DRILLS[i.drill]).filter((v, i, a) => v && a.indexOf(v) === i);
    document.getElementById('drillsHost').innerHTML = drills.length ? drills.map(d =>
      '<div style="padding:10px 0;border-bottom:1px solid var(--line)">' +
      '<div class="h3" style="margin-bottom:5px">' + esc(d.title) + '</div>' +
      '<div class="tiny muted" style="line-height:1.55">' + esc(d.text) + '</div>' +
      '<div class="mt-s tiny acc">' + esc(d.rule) + '</div></div>').join('') +
      '<button class="btn btn--primary btn--block mt" id="startDrill">Lancer l\'exercice</button>'
      : '<div class="empty">Aucun exercice nécessaire pour l\'instant.</div>';
    const b = document.getElementById('startDrill');
    if (b) b.onclick = () => Nova.App.start({ mode: 'drill', drill: drills[0] });
  }

  /* ================= BIBLIOTHÈQUE ================= */
  const CATS = { all: 'Tout', analyse: 'Analyse', execution: 'Exécution', risque: 'Risque', psy: 'Psychologie' };
  let libCat = 'all';

  function renderLibrary() {
    const f = document.getElementById('libFilters');
    f.innerHTML = Object.keys(CATS).map(c =>
      '<button class="btn btn--sm' + (c === libCat ? ' btn--primary' : '') + '" data-cat="' + c + '">' + CATS[c] + '</button>').join('');
    f.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { libCat = b.dataset.cat; renderLibrary(); });

    const seen = Nova.App.seenConcepts();
    const list = CONCEPTS.filter(c => libCat === 'all' || c.cat === libCat);
    document.getElementById('libHost').innerHTML = list.map(c => {
      const ev = EVIDENCE[c.evidence];
      return '<div class="concept">' +
        '<div class="concept-h"><h3>' + esc(c.title) + '</h3>' +
        '<span class="badge ' + ev.tone + '" title="' + esc(ev.desc) + '">' + ev.label + '</span>' +
        (seen[c.id] ? '<span class="badge pos">Vu en session</span>' : '') + '</div>' +
        '<div class="concept-b">' + esc(c.short) + '</div>' +
        '<div class="concept-b mt-s">' + esc(c.body) + '</div>' +
        (c.keys ? '<div class="keys">' + c.keys.map(k => '<div>' + esc(k) + '</div>').join('') + '</div>' : '') +
        (c.trap ? '<div class="trap">' + esc(c.trap) + '</div>' : '') +
        '<div style="margin-top:12px">' + sourceBlock(c.sources) + '</div>' +
        '</div>';
    }).join('');
  }

  return {
    svg, show, modal, closeModal, sourceBlock, esc, ring, sparkline, buildNav,
    renderHome, renderCampaign, renderJournal, renderCoachScreen, renderLibrary,
    exitLabel, current: () => current
  };
})();
