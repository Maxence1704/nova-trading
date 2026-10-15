/* ============================================================
   CONTRÔLEUR DE SESSION — Nova Terminal
   Boucle de jeu, ticket d'ordre, coach, débrief, progression.
   ============================================================ */

Nova.App = (function () {

  const START_CASH = 10000;
  const SPEEDS = [1, 2, 4, 8, 16];
  const REASONS = ['Tendance + pullback', 'Cassure confirmée', 'Range : support / résistance', 'Momentum', 'Retournement', 'Intuition'];
  const MODES = {
    learn: { assist: 2, name: 'Apprentissage', tf: '15m' },
    challenge: { assist: 1, name: 'Défi', tf: '15m' },
    free: { assist: 0, name: 'Libre', tf: '15m' },
    drill: { assist: 1, name: 'Exercice', tf: '15m' },
    lesson: { assist: 2, name: 'Leçon', tf: '15m' }
  };

  const S = {
    mode: 'learn', lesson: null, drill: null,
    assist: 2, tf: '15m', inst: 'neo',
    market: null, broker: null, chart: null,
    running: false, speed: 1, acc: 0, last: 0,
    bars: 0, promptActive: null, barsSincePrompt: 99, recentPrompts: [],
    session: [], ctx: null,
    ticket: { side: 'buy', kind: 'market', risk: 1, entry: null, sl: null, tp: null, reason: REASONS[0], price: null },
    overlays: { levels: false, ema: false },
    seedBase: null
  };

  /* ---------- Persistance ---------- */
  const load = (k, d) => Nova.store.get(k, d);
  const save = (k, v) => Nova.store.set(k, v);
  const journal = () => load('journal', []);
  const progress = () => load('progress', {});
  const quiz = () => load('quiz', { correct: 0, total: 0 });
  const seenConcepts = () => load('seen', {});
  const totalBars = () => load('bars', 0);

  function persist() { save('journal', journal()); save('bars', totalBars()); }

  function allRecords() { return journal(); }

  function axes() {
    return Nova.stats.axes({
      records: allRecords(), metrics: Nova.stats.metrics(allRecords(), START_CASH),
      quiz: quiz(), conceptsSeen: Object.keys(seenConcepts()).length, conceptsTotal: CONCEPTS.length,
      issues: Nova.stats.detect(allRecords(), totalBars())
    });
  }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  function start(o) {
    o = o || {};
    const mode = MODES[o.mode] || MODES.learn;
    S.mode = o.mode || 'learn';
    S.assist = mode.assist;
    S.lesson = o.lesson || null;
    S.drill = o.drill || null;
    S.challenge = (o.mode === 'challenge')
      ? (window.CHALLENGES[(Math.random() * CHALLENGES.length) | 0])
      : null;
    S.tf = (o.lesson && o.lesson.tf) || (S.challenge && S.challenge.tf) || mode.tf;
    S.inst = load('inst', 'neo');
    S.seedBase = (Math.random() * 1e9) | 0;
    S.market = new Nova.Market(S.inst, S.seedBase);
    S.broker = new Nova.Broker(S.market.inst, START_CASH);
    S.session = [];
    S.quizStart = quiz().correct;
    S.bars = 0; S.acc = 0; S.recentPrompts = []; S.barsSincePrompt = 99;
    S.ticket = { side: 'buy', kind: 'market', risk: 1, entry: null, sl: null, tp: null, reason: REASONS[0], price: null };
    S.overlays = { levels: S.assist >= 2, ema: S.assist >= 2 };

    /* historique initial : calibré selon l'unité de temps pour rester instantané */
    const need = S.tf === '1d' ? 130 : S.tf === '4h' ? 170 : 220;
    S.market.warmup(S.tf, need);

    wireBroker();
    Nova.UI.show('session');
    syncTfButtons();
    mountChart();
    buildTicket();
    onCandleClose();
    syncPlayBtn();
    S.running = true; S.last = performance.now();
    requestAnimationFrame(loop);

    if (S.assist === 2) {
      S.chart.mode = 'draft'; syncDraftBtn();
      hint('Cliquez sur le graphique pour définir votre <b>entrée</b>, puis faites glisser le <b>stop</b> et la <b>cible</b>.', 9000);
    } else if (S.assist === 1) {
      hint('Onglet <b>Ordre</b> : choisissez Long ou Short, ajustez le risque, puis validez.', 8000);
    }
    if (S.mode === 'challenge' && S.challenge) {
      Nova.UI.modal({
        eyebrow: 'Mode défi · ' + S.challenge.tf, title: S.challenge.name,
        body: '<p class="muted" style="line-height:1.6">' + Nova.UI.esc(S.challenge.brief) + '</p>' +
          '<div class="quad mt" style="background:rgba(126,166,255,.07);border-color:rgba(126,166,255,.24)"><div class="quad-t">Objectif</div><div class="quad-d">' + Nova.UI.esc(S.challenge.task) + '</div></div>' +
          Nova.UI.sourceBlock((CONCEPTS.find(c => c.id === S.challenge.concept) || {}).sources),
        actions: '<button class="btn btn--primary" data-close>Commencer</button>',
        onMount: r => r.querySelector('[data-close]').onclick = () => Nova.UI.closeModal()
      });
    }
    if (S.mode === 'drill' && S.drill) {
      Nova.UI.modal({
        eyebrow: 'Exercice ciblé', title: S.drill.title,
        body: '<p class="muted" style="line-height:1.6">' + Nova.UI.esc(S.drill.text) + '</p>' +
          '<div class="quad mt" style="background:rgba(126,166,255,.07);border-color:rgba(126,166,255,.24)"><div class="quad-t">Règle de l\'exercice</div><div class="quad-d">' + Nova.UI.esc(S.drill.rule) + '</div></div>' +
          Nova.UI.sourceBlock(S.drill.sources),
        actions: '<button class="btn btn--primary" data-close>Commencer</button>',
        onMount: r => r.querySelector('[data-close]').onclick = () => Nova.UI.closeModal()
      });
    }
  }

  function startLesson(id) {
    const l = LESSONS.find(x => x.id === id);
    if (!l) return;
    start({ mode: 'lesson', lesson: l });
    Nova.UI.modal({
      eyebrow: 'Chapitre ' + l.chapter + ' · ' + l.tf, title: l.name,
      body: '<p class="muted" style="line-height:1.6">' + Nova.UI.esc(l.brief) + '</p>' +
        '<div class="quad mt" style="background:rgba(126,166,255,.07);border-color:rgba(126,166,255,.24)"><div class="quad-t">Objectif</div><div class="quad-d">' + Nova.UI.esc(l.task) + '</div></div>' +
        Nova.UI.sourceBlock([l.concept].concat((CONCEPTS.find(c => c.id === l.concept) || {}).sources || []).filter((v, i, a) => a.indexOf(v) === i)),
      actions: '<button class="btn btn--primary" data-close>Commencer</button>',
      onMount: r => r.querySelector('[data-close]').onclick = () => Nova.UI.closeModal()
    });
  }

  /* ============================================================
     BOUCLE
     ============================================================ */
  function loop(t) {
    if (!S.market) return;
    const dt = Math.min(250, t - S.last); S.last = t;
    if (S.running && !S.promptActive) {
      S.acc += dt;
      const per = 1000 / S.speed;
      let guard = 0;
      while (S.acc >= per && guard++ < 8) { S.acc -= per; advanceCandle(); }
    }
    requestAnimationFrame(loop);
  }

  function advanceCandle() {
    const closedTfs = S.market.advance(S.tf, m => S.broker.tick(m));
    S.bars++;
    save('bars', totalBars() + 1);
    S.barsSincePrompt++;
    onCandleClose(closedTfs);
  }

  function step() {
    if (!S.market) return;
    S.running = false; syncPlayBtn();
    advanceCandle();
  }

  function pause() { S.running = false; syncPlayBtn(); }
  function resume() { if (!S.market) return; S.running = !S.running; S.last = performance.now(); syncPlayBtn(); }

  function syncPlayBtn() {
    const b = document.getElementById('btnPlay');
    if (!b) return;
    b.classList.toggle('on', S.running);
    b.innerHTML = S.running
      ? '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5.5 3.5v9M10.5 3.5v9"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5l9 5.5-9 5.5z"/></svg>';
  }

  /* ============================================================
     À CHAQUE CLÔTURE DE BOUGIE
     ============================================================ */
  function onCandleClose() {
    const cs = S.market.series[S.tf];
    S.ctx = Nova.ind.context(cs.slice(-400), { k: 3 });
    refresh();
    maybePrompt();
  }

  function refresh(force) {
    const m = S.market, b = S.broker;
    if (!m) return;
    const inst = m.inst;
    const view = m.view(S.tf, 400);

    /* haut de page */
    document.getElementById('livePrice').textContent = Nova.fmtPrice(m.mid, inst);
    document.getElementById('liveSpread').textContent = 'spread ' + Nova.fmtPrice(inst.spread, inst) + ' · bid ' +
      Nova.fmtPrice(m.bid(), inst) + ' / ask ' + Nova.fmtPrice(m.ask(), inst);
    document.getElementById('clock').textContent = Nova.fmtClock(m.now());

    /* graphique */
    const c = S.chart;
    if (c) {
      const e20 = S.overlays.ema ? Nova.ind.ema(view.candles.map(x => x.c), 20) : null;
      const e50 = S.overlays.ema ? Nova.ind.ema(view.candles.map(x => x.c), 50) : null;
      c.set({ candles: view.candles, live: view.live, tf: Nova.tfMin(S.tf), inst: inst });
      c.setOverlays({
        levels: (S.ctx ? S.ctx.levels : []), showLevels: S.overlays.levels && S.assist > 0,
        showEMA: S.overlays.ema && S.assist > 0, e20, e50,
        position: b.positions[0] ? { entry: b.positions[0].entry, sl: b.positions[0].sl, tp: b.positions[0].tp, side: b.positions[0].side } : null
      });
      c.render();
    }

    renderAccount();
    renderPositions();
    renderFoot();
    renderTicketReadout();
    renderCoachPane();
    renderModeChip();
  }

  function renderFoot() {
    const b = S.broker, m = S.market;
    const ctx = S.ctx;
    const eq = b.equity(m);
    document.getElementById('chartFoot').innerHTML =
      (S.assist > 0 ? '<span>Régime <b>' + (ctx ? ctx.trend === 'up' ? 'haussier' : ctx.trend === 'down' ? 'baissier' : 'neutre' : '—') + '</b></span>' : '') +
      '<span>ATR <b>' + (ctx ? Nova.fmtPrice(ctx.a, m.inst) : '—') + '</b></span>' +
      '<span>Volatilité <b>' + (ctx ? ctx.volState : '—') + '</b></span>' +
      '<span>RSI <b>' + (ctx ? ctx.rsiV.toFixed(0) : '—') + '</b></span>' +
      '<span class="grow"></span>' +
      '<span>Bougies <b>' + S.bars + '</b></span>' +
      '<span>Capital <b class="' + (eq >= START_CASH ? 'up' : 'dn') + '">' + Nova.fmtMoney(eq) + '</b></span>';
  }

  /* ============================================================
     COMPTE & POSITIONS
     ============================================================ */
  function renderAccount() {
    const b = S.broker, m = S.market;
    const eq = b.equity(m), dd = b.drawdown(m), up = b.unrealized(m);
    const atRisk = b.atRisk();
    document.getElementById('paneAccount').innerHTML =
      '<div class="tiles">' +
      '<div class="tile wide"><div class="label">Capital</div><div class="v" style="font-size:22px">' + Nova.fmtMoney(eq) + '</div>' +
      '<div class="tiny ' + (eq >= START_CASH ? 'up' : 'dn') + '" style="margin-top:2px">' + Nova.fmtPct((eq / START_CASH - 1) * 100) + ' depuis le départ</div></div>' +
      '<div class="tile"><div class="label">P&L latent</div><div class="v ' + (up >= 0 ? 'up' : 'dn') + '">' + Nova.fmtSigned(up) + '</div></div>' +
      '<div class="tile"><div class="label">P&L réalisé</div><div class="v ' + (b.cash - START_CASH >= 0 ? 'up' : 'dn') + '">' + Nova.fmtSigned(b.cash - START_CASH) + '</div></div>' +
      '<div class="tile"><div class="label">Drawdown</div><div class="v ' + (dd > 8 ? 'dn' : '') + '">' + dd.toFixed(2) + ' %</div></div>' +
      '<div class="tile"><div class="label">Risque engagé</div><div class="v">' + Nova.fmtMoney(atRisk) + '</div></div>' +
      '<div class="tile"><div class="label">Marge utilisée</div><div class="v">' + Nova.fmtMoney(b.marginUsed()) + '</div></div>' +
      '<div class="tile"><div class="label">Levier</div><div class="v">' + b.leverage + ':1</div></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div class="kv"><span>Commissions payées</span><span>' + Nova.fmtMoney(b.totalCommission) + '</span></div>' +
      '<div class="kv"><span>Slippage cumulé</span><span>' + Nova.fmtMoney(b.totalSlippage) + '</span></div>' +
      '<div class="kv"><span>Trades de la session</span><span>' + S.session.length + '</span></div>' +
      '<div class="divider"></div>' +
      '<div class="field"><label>Levier (plafond ' + m.inst.leverageMax + ':1 — mesure ESMA 2018)</label>' +
      '<input type="range" min="1" max="' + m.inst.leverageMax + '" value="' + b.leverage + '" id="levRange"></div>' +
      '<div class="mt"><button class="btn btn--block" id="endBtn">Terminer la session</button></div>' +
      (S.mode === 'lesson' ? '<div class="mt"><button class="btn btn--block btn--ghost" id="valBtn">Valider la leçon</button></div>' : '');

    const lr = document.getElementById('levRange');
    if (lr) lr.oninput = () => { b.leverage = +lr.value; renderAccount(); };
    document.getElementById('endBtn').onclick = endSession;
    const vb = document.getElementById('valBtn');
    if (vb) vb.onclick = () => evaluateLesson(true);
  }

  function renderPositions() {
    const b = S.broker, m = S.market;
    const host = document.getElementById('paneOrder');
    const pos = host && host.querySelector('#posHost');
    if (!pos) return;

    if (!b.positions.length) {
      pos.dataset.sig = '';
      if (b.orders.length) {
        pos.innerHTML = '<div class="label mb">Ordres en attente</div>' + b.orders.map(o =>
          '<div class="pos"><div class="pos-top"><span class="pos-tag ' + (o.side === 'buy' ? 'up' : 'dn') + '">' +
          (o.kind === 'limit' ? 'LIMITE ' : 'STOP ') + (o.side === 'buy' ? 'ACHAT' : 'VENTE') + '</span>' +
          '<button class="btn btn--sm btn--ghost" data-cancel="' + o.id + '">Annuler</button></div>' +
          '<div class="tiny dim">' + Nova.fmtNum(o.size, 2) + ' · prix ' + Nova.fmtPrice(o.price, m.inst) + '</div></div>').join('');
        pos.querySelectorAll('[data-cancel]').forEach(x => x.onclick = () => { b.cancel(+x.dataset.cancel); refresh(); });
      } else pos.innerHTML = '<div class="empty" style="padding:22px 8px">Aucune position ouverte.</div>';
      return;
    }

    const sig = b.positions.map(p => p.id + ':' + p.sl + ':' + p.tp + ':' + p.size).join('|');
    if (pos.dataset.sig !== sig) {
      pos.dataset.sig = sig;
      pos.innerHTML = b.positions.map(p =>
        '<div class="pos ' + (p.side === 'buy' ? 'long' : 'short') + '" data-pos="' + p.id + '">' +
        '<div class="pos-top"><span class="pos-tag ' + (p.side === 'buy' ? 'up' : 'dn') + '">' + (p.side === 'buy' ? 'LONG' : 'SHORT') +
        ' · ' + Nova.fmtNum(p.size, p.size < 1 ? 2 : 0) + ' ' + m.inst.unitLabel + '</span>' +
        '<span class="pos-pnl" data-pnl></span></div>' +
        '<div class="kv"><span>Entrée</span><span>' + Nova.fmtPrice(p.entry, m.inst) + '</span></div>' +
        '<div class="kv"><span>Stop</span><span class="dn">' + (p.sl != null ? Nova.fmtPrice(p.sl, m.inst) : 'aucun') + '</span></div>' +
        '<div class="kv"><span>Cible</span><span class="up">' + (p.tp != null ? Nova.fmtPrice(p.tp, m.inst) : 'aucune') + '</span></div>' +
        '<div class="kv"><span>Résultat</span><span data-r>—</span></div>' +
        '<div class="row mt-s" style="gap:6px">' +
        '<button class="btn btn--sm grow" data-be="' + p.id + '">Stop à l\'entrée</button>' +
        '<button class="btn btn--sm btn--down grow" data-close="' + p.id + '">Clôturer</button></div>' +
        '</div>').join('');
      pos.querySelectorAll('[data-close]').forEach(x => x.onclick = () => {
        const p = b.positions.find(q => q.id === +x.dataset.close);
        if (p) b.closePosition(m, p, 'manual', p.side === 'buy' ? m.bid() : m.ask(), m.now());
      });
      pos.querySelectorAll('[data-be]').forEach(x => x.onclick = () => {
        const p = b.positions.find(q => q.id === +x.dataset.be);
        if (p) { b.modify(p, { sl: p.entry }, m, S.bars); Nova.flash('Stop déplacé au point d\'entrée', 'info'); refresh(); }
      });
    }

    b.positions.forEach(p => {
      const el = pos.querySelector('[data-pos="' + p.id + '"]');
      if (!el) return;
      const pnl = b.markPnl(p, m);
      const R = p.stopDist ? pnl / (p.size * p.stopDist) : 0;
      const a = el.querySelector('[data-pnl]'), c = el.querySelector('[data-r]');
      a.textContent = Nova.fmtSigned(pnl); a.className = 'pos-pnl ' + (pnl >= 0 ? 'up' : 'dn');
      c.textContent = Nova.fmtR(R); c.className = R >= 0 ? 'up' : 'dn';
    });
  }

  /* ============================================================
     PANNEAU COACH (session)
     ============================================================ */
  function renderModeChip() {
    const chip = document.getElementById('modeChip');
    if (!chip) return;
    const names = { learn: 'Apprentissage', challenge: 'Défi', free: 'Libre', drill: 'Exercice', lesson: 'Leçon' };
    const t = S.lesson ? S.lesson.name : S.drill ? S.drill.title : S.challenge ? S.challenge.name : names[S.mode];
    const s = S.lesson ? 'objectif · ' + S.lesson.task
      : S.drill ? S.drill.rule
        : S.challenge ? 'objectif · ' + S.challenge.task
          : S.assist === 2 ? 'assistance complète' : S.assist === 1 ? 'assistance partielle' : 'aucune assistance';
    chip.innerHTML = '<div class="t">' + Nova.UI.esc(t) + '</div><div class="s">' + Nova.UI.esc(s) + '</div>';
  }

  function renderCoachPane() {
    const host = document.getElementById('paneCoach');
    if (!host) return;
    const issues = Nova.stats.detect(S.session, S.bars);
    const last = S.session.slice(-5).reverse();
    const q = quiz();
    host.innerHTML =
      '<div class="label mb">Objectif en cours</div>' +
      '<div class="readout mb" style="background:var(--panel)">' +
      '<div style="font-size:12.5px;line-height:1.55">' +
      Nova.UI.esc(S.lesson ? S.lesson.task : S.drill ? S.drill.rule : S.challenge ? S.challenge.task :
        S.assist === 2 ? 'Le coach observe chaque bougie et vous interroge dès qu\'une situation intéressante apparaît.'
          : S.assist === 1 ? 'Le coach n\'intervient que sur les situations importantes.'
            : 'Aucune assistance : construisez votre analyse seul.') + '</div></div>' +

      '<div class="label mb">Réponses au coach</div>' +
      '<div class="kv"><span>Questions</span><span>' + q.total + '</span></div>' +
      '<div class="kv"><span>Réponses exactes</span><span class="' + (q.total && q.correct / q.total >= .6 ? 'up' : '') + '">' +
      (q.total ? Math.round(q.correct / q.total * 100) + ' %' : '—') + '</span></div>' +

      '<div class="divider"></div>' +
      '<div class="label mb">Dernières décisions</div>' +
      (last.length ? last.map(r =>
        '<div class="kv"><span class="tiny">' + (r.side === 'buy' ? 'Long' : 'Short') + ' · ' + Nova.fmtR(r.R) + '</span>' +
        '<span class="tiny ' + (r.score >= 60 ? (r.pnl >= 0 ? 'up' : 'acc') : (r.pnl >= 0 ? 'warn' : 'dn')) + '" style="color:' +
        (r.score >= 60 ? (r.pnl >= 0 ? 'var(--up)' : 'var(--accent)') : (r.pnl >= 0 ? 'var(--warn)' : 'var(--down)')) + '">' +
        r.score + ' / 100</span></div>').join('')
        : '<div class="tiny dim">Aucun trade clôturé pour l\'instant.</div>') +

      '<div class="divider"></div>' +
      '<div class="label mb">Observations en direct</div>' +
      (issues.length ? issues.slice(0, 3).map(i =>
        '<div style="padding:7px 0;border-bottom:1px solid var(--line)">' +
        '<div class="tiny" style="color:' + (i.sev === 'high' ? 'var(--down)' : 'var(--txt)') + ';font-weight:600">' + Nova.UI.esc(i.title) + '</div>' +
        '<div class="tiny dim" style="line-height:1.5;margin-top:2px">' + Nova.UI.esc(i.detail) + '</div></div>').join('')
        : '<div class="tiny dim">Aucune dérive détectée sur cette session.</div>') +
      '<div class="mt"><button class="btn btn--block btn--sm" id="goCoach">Ouvrir le rapport complet</button></div>';
    const g = document.getElementById('goCoach');
    if (g) g.onclick = () => Nova.UI.show('coach');
  }

  /* ============================================================
     TICKET D'ORDRE
     ============================================================ */
  function buildTicket() {
    const inst = S.market.inst;
    const host = document.getElementById('paneOrder');
    host.innerHTML =
      '<div class="side-pick mb">' +
      '<button class="btn btn--up" id="sideBuy">Long</button>' +
      '<button class="btn btn--down" id="sideSell">Short</button></div>' +
      '<div class="field mb"><label>Type d\'ordre</label>' +
      '<div class="seg" style="width:100%"><button data-kind="market" class="on" style="flex:1">Marché</button>' +
      '<button data-kind="limit" style="flex:1">Limite</button><button data-kind="stop" style="flex:1">Stop</button></div></div>' +
      '<div class="field mb" id="priceField" style="display:none"><label>Prix déclencheur</label><input type="number" id="ordPrice" step="any"></div>' +
      '<div class="field mb"><label>Risque par trade</label>' +
      '<div class="riskgrid"><button data-risk="0.5">0,5 %</button><button data-risk="1" class="on">1 %</button>' +
      '<button data-risk="1.5">1,5 %</button><button data-risk="2">2 %</button></div></div>' +
      '<div class="field mb"><label>Motif de l\'entrée</label><select id="ordReason">' +
      REASONS.map(r => '<option' + (r === S.ticket.reason ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></div>' +
      '<div class="readout mb" id="ticketReadout">' +
      '<div class="kv"><span>Entrée</span><span id="rEntry">—</span></div>' +
      '<div class="kv"><span>Stop</span><span id="rSl" class="dn">—</span></div>' +
      '<div class="kv"><span>Cible</span><span id="rTp" class="up">—</span></div>' +
      '<div class="divider" style="margin:8px 0"></div>' +
      '<div class="kv"><span>Taille</span><span id="rSize">—</span></div>' +
      '<div class="kv"><span>Risque</span><span id="rRisk">—</span></div>' +
      '<div class="kv"><span>Ratio R:R</span><span id="rRR">—</span></div>' +
      '<div class="kv"><span>Distance du stop</span><span id="rDist">—</span></div>' +
      '<div class="divider" style="margin:8px 0"></div>' +
      '<div class="row" style="gap:6px">' +
      '<button class="btn btn--up grow" id="sendBuy">Acheter</button>' +
      '<button class="btn btn--down grow" id="sendSell">Vendre</button></div></div>' +
      '<button class="btn btn--block mb" id="draftBtn">Placer sur le graphique</button>' +
      '<div id="posHost"></div>';

    document.getElementById('sideBuy').onclick = () => setSide('buy');
    document.getElementById('sideSell').onclick = () => setSide('sell');
    host.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => setKind(b.dataset.kind));
    host.querySelectorAll('[data-risk]').forEach(b => b.onclick = () => {
      S.ticket.risk = +b.dataset.risk;
      host.querySelectorAll('[data-risk]').forEach(x => x.classList.toggle('on', x === b));
      renderTicketReadout();
    });
    document.getElementById('ordReason').onchange = e => { S.ticket.reason = e.target.value; };
    document.getElementById('ordPrice').oninput = e => { S.ticket.price = +e.target.value; renderTicketReadout(); };
    document.getElementById('sendBuy').onclick = () => send('buy');
    document.getElementById('sendSell').onclick = () => send('sell');
    document.getElementById('draftBtn').onclick = toggleDraft;

    setSide('buy');
  }

  function setKind(k) {
    S.ticket.kind = k;
    document.querySelectorAll('#paneOrder [data-kind]').forEach(x => x.classList.toggle('on', x.dataset.kind === k));
    const pf = document.getElementById('priceField');
    if (pf) pf.style.display = k === 'market' ? 'none' : '';
    if (k !== 'market') {
      const inp = document.getElementById('ordPrice');
      if (inp && S.ticket.price != null) inp.value = S.ticket.price;
    }
    renderTicketReadout();
  }

  /* Un ordre tracé sur le graphique devient limite ou stop selon sa position
     par rapport au marché — exactement comme sur une plateforme réelle. */
  function kindForEntry(entry, side) {
    const m = S.market, atr = S.ctx ? S.ctx.a : m.inst.spread * 20;
    if (Math.abs(entry - m.mid) < atr * 0.15) return 'market';
    const better = side === 'buy' ? entry < m.mid : entry > m.mid;
    return better ? 'limit' : 'stop';
  }

  function setSide(side) {
    S.ticket.side = side;
    const b = document.getElementById('sideBuy'), s = document.getElementById('sideSell');
    b.className = 'btn btn--up' + (side === 'buy' ? ' on--up' : '');
    s.className = 'btn btn--down' + (side === 'sell' ? ' on--down' : '');
    if (S.chart && S.chart.draft) { S.chart.draft.side = side; S.chart.render(); }
    renderTicketReadout();
  }

  function toggleDraft() {
    const c = S.chart;
    if (!c) return;
    if (c.mode === 'draft') { c.mode = 'idle'; c.draft = null; c.render(); hint(null); syncDraftBtn(); return; }
    c.mode = 'draft';
    c.draft = null;
    c.render();
    syncDraftBtn();
    hint('Cliquez sur le graphique pour définir le prix d\'entrée, puis faites glisser le <b>stop</b> et la <b>cible</b>.', 9000);
  }
  function syncDraftBtn() {
    const b = document.getElementById('draftBtn');
    if (b) { b.classList.toggle('btn--primary', S.chart && S.chart.mode === 'draft'); b.textContent = S.chart && S.chart.mode === 'draft' ? 'Placement actif — cliquer sur le graphique' : 'Placer sur le graphique'; }
  }

  function currentPlan() {
    const m = S.market, inst = m.inst, ctx = S.ctx;
    const side = S.ticket.side;
    const atr = ctx ? ctx.a : inst.spread * 20;
    let entry;
    if (S.chart && S.chart.draft && S.chart.draft.entry != null) entry = S.chart.draft.entry;
    else if (S.ticket.kind !== 'market' && S.ticket.price != null) entry = S.ticket.price;
    else entry = side === 'buy' ? m.ask() : m.bid();

    let sl = S.chart && S.chart.draft && S.chart.draft.sl != null ? S.chart.draft.sl
      : (S.ticket.sl != null ? S.ticket.sl : entry - (side === 'buy' ? 1 : -1) * atr * 1.5);
    let tp = S.chart && S.chart.draft && S.chart.draft.tp != null ? S.chart.draft.tp
      : (S.ticket.tp != null ? S.ticket.tp : entry + (side === 'buy' ? 1 : -1) * atr * 2.6);

    const dist = Math.abs(entry - sl);
    const b = S.broker;
    const sized = b.sizeForRisk(S.ticket.risk, entry, sl, m);
    const riskCash = sized.size * dist;
    const rr = dist > 0 ? Math.abs(tp - entry) / dist : 0;
    const notional = entry * sized.size;
    return { entry, sl, tp, dist, size: sized.size, riskCash, rr, notional, margin: notional / b.leverage, atr };
  }

  function renderTicketReadout() {
    if (!S.market || !document.getElementById('rEntry')) return;
    const p = currentPlan(), inst = S.market.inst;
    const eq = S.broker.equity(S.market);
    const set = (id, txt, cls) => {
      const e = document.getElementById(id);
      if (!e) return;
      e.textContent = txt;
      e.className = cls || '';
    };
    set('rEntry', Nova.fmtPrice(p.entry, inst));
    set('rSl', Nova.fmtPrice(p.sl, inst), 'dn');
    set('rTp', Nova.fmtPrice(p.tp, inst), 'up');
    set('rSize', Nova.fmtNum(p.size, p.size < 1 ? 2 : 0) + ' ' + inst.unitLabel);
    const rp = eq ? p.riskCash / eq * 100 : 0;
    set('rRisk', Nova.fmtMoney(p.riskCash) + ' · ' + rp.toFixed(2) + ' %', rp > 1.5 ? 'dn' : '');
    set('rRR', p.rr.toFixed(2), p.rr < 1 ? 'dn' : p.rr >= 1.5 ? 'up' : '');
    set('rDist', p.atr ? (p.dist / p.atr).toFixed(2) + ' ATR' : '—');
  }

  function send(side) {
    const m = S.market, b = S.broker;
    const drafted = S.chart && S.chart.draft && S.chart.draft.entry != null;
    if (drafted) {
      const k = kindForEntry(S.chart.draft.entry, side);
      if (k !== S.ticket.kind) {
        S.ticket.price = S.chart.draft.entry;
        setKind(k);
        if (k !== 'market') Nova.flash(k === 'limit'
          ? 'Entrée sous le marché : ordre à cours limité.'
          : 'Entrée au-delà du marché : ordre stop.', 'info');
      }
    }
    const p = currentPlan();
    if (!(p.size > 0)) { Nova.flash('Taille nulle : augmentez le risque ou rapprochez le stop.', 'loss'); return; }
    if (p.dist <= 0) { Nova.flash('Le stop doit être différent du prix d\'entrée.', 'loss'); return; }
    const ctxSnap = Object.assign({}, Nova.coach.snapshot(S.ctx, m) || {});
    ctxSnap.stopAtr = p.atr ? p.dist / p.atr : null;
    const o = {
      kind: S.ticket.kind, side: side, size: p.size,
      price: S.ticket.kind === 'market' ? null : p.entry,
      sl: p.sl, tp: p.tp, reason: S.ticket.reason, tf: S.tf, bar: S.bars, ctx: ctxSnap
    };
    const before = b.positions.length + b.orders.length;
    const res = b.place(m, o);
    if (!res) return;
    if (b.positions.length > before) {
      /* exécution immédiate : animation discrète */
      const host = document.getElementById('chartFoot');
      Nova.pulse(host, side === 'buy' ? 'flash-up' : 'flash-dn');
    }
    if (S.chart && S.chart.mode === 'draft') { S.chart.mode = 'idle'; S.chart.draft = null; syncDraftBtn(); hint(null); }
    S.ticket.sl = null; S.ticket.tp = null;
    refresh(true);
  }

  /* ============================================================
     COACH
     ============================================================ */
  function maybePrompt() {
    if (S.assist === 0 || S.promptActive || !S.ctx) return;
    if (S.bars < 3) return;              /* laisser le temps d'observer le graphique */
    const gap = S.assist === 2 ? 6 : 14;
    if (S.barsSincePrompt < gap) return;
    const prob = S.assist === 2 ? 0.75 : 0.45;
    if (Math.random() > prob) return;
    const p = Nova.coach.pick(S.ctx, S.market, S.broker, S.market.inst, S.broker.equity(S.market),
      { assist: S.assist, recent: S.recentPrompts });
    if (!p) return;
    showPrompt(p);
  }

  function showPrompt(p) {
    S.promptActive = p;
    S.recentPrompts.push(p.id); if (S.recentPrompts.length > 4) S.recentPrompts.shift();
    const host = document.getElementById('coachHost');
    host.innerHTML = '<div class="coach-card"><div class="row" style="justify-content:space-between">' +
      '<span class="label">Coach · observation</span><span class="tiny dim">' + Nova.fmtClock(S.market.now()) + '</span></div>' +
      '<div class="coach-q">' + Nova.UI.esc(p.q) + '</div><div class="coach-opts">' +
      p.options.map((o, i) => '<button class="opt" data-i="' + i + '">' + Nova.UI.esc(o) + '</button>').join('') +
      '</div><div id="coachFb"></div></div>';
    host.querySelectorAll('.opt').forEach(btn => btn.onclick = () => answer(p, +btn.dataset.i));
    syncPlayBtn();
  }

  function answer(p, i) {
    const scores = p.score || null;
    const val = scores ? scores[i] : (i === p.answer ? 1 : 0);
    const q = quiz();
    q.total++; if (val >= 0.999) q.correct++;
    save('quiz', q);
    const seen = seenConcepts(); seen[p.concept] = 1; save('seen', seen);

    const host = document.getElementById('coachHost');
    host.querySelectorAll('.opt').forEach(b => {
      b.disabled = true;
      const bi = +b.dataset.i;
      const good = scores ? scores[bi] >= 0.999 : bi === p.answer;
      if (good) b.classList.add('right');
      else if (bi === i) b.classList.add('wrong');
    });
    const c = CONCEPTS.find(x => x.id === p.concept);
    document.getElementById('coachFb').innerHTML =
      '<div class="coach-fb">' +
      '<b>' + (val >= 0.999 ? 'Exact.' : val >= 0.5 ? 'Partiellement exact.' : 'Pas tout à fait.') + '</b> ' +
      Nova.UI.esc(p.explain) +
      (p.watch ? '<div class="watch">' + p.watch.map(w => '<div>' + Nova.UI.esc(w) + '</div>').join('') + '</div>' : '') +
      (c ? '<div style="margin-top:10px"><span class="badge ' + EVIDENCE[c.evidence].tone + '">' + EVIDENCE[c.evidence].label + '</span></div>' : '') +
      Nova.UI.sourceBlock(p.sources) +
      '<button class="btn btn--primary btn--sm mt" id="coachOk">Continuer</button></div>';
    document.getElementById('coachOk').onclick = () => { document.getElementById('coachHost').innerHTML = ''; S.promptActive = null; S.barsSincePrompt = 0; S.last = performance.now(); };
  }

  /* ---------- Débrief après chaque clôture ---------- */
  function wireBroker() {
    S.broker.on('close', rec => onClose(rec));
    S.broker.on('reject', msg => Nova.flash(msg, 'loss'));
  }

  function onClose(rec) {
    const d = Nova.coach.debrief(rec, S.market.inst);
    rec.score = d.score; rec.quad = d.quad;
    S.session.push(rec);
    save('journal', journal().concat([rec]));
    persist();

    Nova.flash((rec.pnl >= 0 ? 'Position clôturée · ' : 'Position clôturée · ') + Nova.fmtSigned(rec.pnl) + ' (' + Nova.fmtR(rec.R) + ')',
      rec.pnl >= 0 ? 'win' : 'loss');
    const host = document.getElementById('chartFoot');
    Nova.pulse(host, rec.pnl >= 0 ? 'flash-up' : 'flash-dn');
    refresh(true);
    showDebrief(rec, d);
  }

  function showDebrief(rec, d) {
    S.wasRunning = S.running;
    S.running = false; syncPlayBtn();
    const inst = S.market.inst;
    const crit = d.items.map(it => {
      const pct = it.tot > 0 ? Math.max(0, it.pts / it.tot * 100) : 0;
      const col = it.pts < 0 ? 'var(--down)' : pct >= 70 ? 'var(--up)' : pct >= 40 ? 'var(--warn)' : 'var(--down)';
      return '<div class="crit"><div style="flex:1"><div class="crit-l">' + Nova.UI.esc(it.label) + '</div>' +
        '<div class="crit-n">' + Nova.UI.esc(it.note) + '</div></div>' +
        (it.tot > 0 ? '<div class="crit-bar"><div class="bar"><i style="width:' + pct + '%;background:' + col + '"></i></div></div>' +
          '<div class="crit-p">' + it.pts + '/' + it.tot + '</div>'
          : '<div class="crit-p dn">' + it.pts + '</div>') +
        '</div>';
    }).join('');

    Nova.UI.modal({
      dismissible: false,
      eyebrow: d.quad === 'good-loss' ? 'Bonne décision, perte' : d.quad === 'bad-win' ? 'Attention : gain non mérité' : 'Débrief',
      title: d.quadrantLabel,
      body:
        '<div class="quad ' + d.quad + '"><div class="quad-t">' + Nova.UI.esc(d.quadrantLabel) + '</div>' +
        '<div class="quad-d">' + Nova.UI.esc(d.quadrantText) + '</div></div>' +
        '<div class="score-ring">' + Nova.UI.ring(d.score) +
        '<div><div class="label">Score de décision</div>' +
        '<div style="font-size:13px;line-height:1.5;color:var(--txt-2);margin-top:4px">' +
        'Résultat : <b class="' + (rec.pnl >= 0 ? 'up' : 'dn') + '">' + Nova.fmtSigned(rec.pnl) + '</b> · ' +
        '<b class="' + (rec.R >= 0 ? 'up' : 'dn') + '">' + Nova.fmtR(rec.R) + '</b><br>' +
        'Sortie : ' + Nova.UI.exitLabel(rec.reason) + ' · durée ' + Nova.fmtDuration(rec.bars, rec.tfMin) + '</div></div></div>' +
        '<div class="label mb">Ce qui est mesuré</div>' + crit +
        '<div class="divider"></div>' +
        '<div class="kv"><span>Contexte à l\'entrée</span><span>' + Nova.UI.esc((rec.ctx && rec.ctx.regime) || '—') + '</span></div>' +
        '<div class="kv"><span>Qualité du setup</span><span>' + (rec.ctx ? rec.ctx.scoreSetup : '—') + ' / 100</span></div>' +
        Nova.UI.sourceBlock(d.sources),
      actions: '<button class="btn btn--primary" id="dbOk">Continuer</button>',
      onMount: r => {
        r.querySelector('#dbOk').onclick = () => {
          Nova.UI.closeModal();
          S.running = !!S.wasRunning;
          S.last = performance.now();
          syncPlayBtn();
        };
      }
    });
  }

  /* ============================================================
     FIN DE SESSION / LEÇON
     ============================================================ */
  /* Moteur de critères partagé : leçons de campagne et défis. */
  function runChecks(p, recs) {
    const checks = [];
    const m = Nova.stats.metrics(recs, START_CASH);
    const add = (label, ok, detail) => checks.push({ label, ok, detail });
    const qd = quiz().correct - (S.quizStart || 0);

    if (p.trades) add(p.trades + ' trade(s) réalisé(s)', recs.length >= p.trades, recs.length + ' réalisé(s)');
    if (p.maxTrades) add('Au plus ' + p.maxTrades + ' trades', recs.length <= p.maxTrades, recs.length + ' trade(s)');
    if (p.correct) add(p.correct + ' bonnes réponses', qd >= p.correct, qd + ' bonne(s)');
    if (p.maxRisk != null) {
      const bad = recs.filter(r => r.riskPct != null && r.riskPct > p.maxRisk + 0.15).length;
      add('Risque ≤ ' + p.maxRisk + ' % sur chaque trade', bad === 0, bad ? bad + ' dépassement(s)' : 'respecté');
    }
    if (p.minRR != null) {
      const bad = recs.filter(r => r.plannedRR != null && r.plannedRR < p.minRR).length;
      add('R:R planifié ≥ ' + p.minRR, recs.length > 0 && bad === 0, bad ? bad + ' trade(s) sous le seuil' : 'respecté');
    }
    if (p.stopAtr) {
      const bad = recs.filter(r => r.ctx && r.ctx.stopAtr != null && (r.ctx.stopAtr < p.stopAtr[0] || r.ctx.stopAtr > p.stopAtr[1])).length;
      add('Stop entre ' + p.stopAtr[0] + ' et ' + p.stopAtr[1] + ' ATR', recs.length > 0 && bad === 0, bad ? bad + ' trade(s) hors zone' : 'respecté');
    }
    if (p.maxLossR != null) {
      const bad = recs.filter(r => r.R < -p.maxLossR).length;
      add('Aucune perte pire que −' + p.maxLossR + ' R', bad === 0, bad ? bad + ' dépassement(s)' : 'respecté');
    }
    if (p.riskStd != null) {
      const s = Nova.stats.sd(recs.filter(r => r.riskPct != null).map(r => r.riskPct));
      add('Risque constant (écart ≤ ' + p.riskStd + ' %)', s <= p.riskStd, 'écart-type ' + s.toFixed(2) + ' %');
    }
    if (p.minScore != null) {
      const avg = recs.length ? recs.reduce((a2, r) => a2 + (r.score || 0), 0) / recs.length : 0;
      add('Score de décision moyen ≥ ' + p.minScore, avg >= p.minScore, 'moyenne ' + avg.toFixed(0));
    }
    if (p.minExpectancyR != null) add('Espérance ≥ +' + p.minExpectancyR + ' R', m.expectancyR >= p.minExpectancyR, Nova.fmtR(m.expectancyR));
    if (p.maxDD != null) add('Drawdown ≤ ' + p.maxDD + ' %', m.maxDD <= p.maxDD, m.maxDD.toFixed(1) + ' %');
    if (p.earlyCutMax != null) {
      const bad = recs.filter(r => r.pnl > 0 && r.plannedRR >= 1.2 && r.R < r.plannedRR * 0.8).length;
      add('Aucun gain coupé sous 0,8 R de cible', bad <= p.earlyCutMax, bad + ' coupe(s) anticipée(s)');
    }
    if (p.noRiskEscalation) {
      let esc = 0;
      for (let i = 1; i < recs.length; i++) if (recs[i - 1].pnl < 0 && recs[i].riskPct > recs[i - 1].riskPct + 0.05) esc++;
      add('Aucune hausse de risque après une perte', esc === 0, esc + ' escalade(s)');
    }
    if (p.noStopMove) {
      const moved = recs.filter(r => (r.stopMoves || []).some(s => s.dir === 'worse')).length;
      add('Aucun stop élargi après l\'entrée', moved === 0, moved + ' élargissement(s)');
    }
    if (p.needSetup) {
      const bad = recs.filter(r => /intuition/i.test(r.reasonEntry || '')).length;
      add('Chaque trade a un motif déclaré', bad === 0, bad + ' entrée(s) sans motif');
    }
    if (p.bars) add('Session d\'au moins ' + p.bars + ' bougies', S.bars >= p.bars, S.bars + ' bougie(s)');
    return checks;
  }

  function evaluateLesson(manual) {
    const l = S.lesson; if (!l) return endSession();
    const recs = S.session;
    const p = l.pass;
    const m = Nova.stats.metrics(recs, START_CASH);
    const checks = runChecks(p, recs);

    const okAll = checks.length > 0 && checks.every(c => c.ok);
    if (okAll) { const pr = progress(); pr[l.id] = { ts: Date.now(), score: m.expectancyR }; save('progress', pr); }

    Nova.UI.modal({
      dismissible: false, eyebrow: 'Chapitre ' + l.chapter + ' · ' + l.name,
      title: okAll ? 'Leçon validée' : 'Objectif non atteint',
      body: '<div class="quad ' + (okAll ? 'good-win' : 'bad-loss') + '"><div class="quad-t">' +
        (okAll ? 'Tous les critères sont remplis.' : 'Il manque au moins un critère.') + '</div>' +
        '<div class="quad-d">' + Nova.UI.esc(l.task) + '</div></div>' +
        checks.map(c => '<div class="crit"><div style="flex:1"><div class="crit-l">' + Nova.UI.esc(c.label) + '</div>' +
          '<div class="crit-n">' + Nova.UI.esc(c.detail) + '</div></div>' +
          '<div class="crit-p ' + (c.ok ? 'up' : 'dn') + '">' + (c.ok ? 'OK' : '—') + '</div></div>').join('') +
        Nova.UI.sourceBlock([l.concept]),
      actions: (okAll ? '<button class="btn" id="again">Rejouer</button>' : '<button class="btn" id="again">Réessayer</button>') +
        '<button class="btn btn--primary" id="done">Terminer</button>',
      onMount: r => {
        r.querySelector('#again').onclick = () => { Nova.UI.closeModal(); startLesson(l.id); };
        r.querySelector('#done').onclick = () => { Nova.UI.closeModal(); Nova.UI.show('campaign'); };
      }
    });
    S.running = false;
  }

  function endSession() {
    S.running = false; syncPlayBtn();
    if (S.challenge) return showChallengeResult();
    const recs = S.session;
    const m = Nova.stats.metrics(recs, START_CASH);
    const eq = Nova.stats.equityCurve(recs, START_CASH);
    const issues = Nova.stats.detect(recs, S.bars);
    const scores = recs.filter(r => r.score != null);
    const avgScore = scores.length ? scores.reduce((a, r) => a + r.score, 0) / scores.length : 0;
    const q = { 'good-win': 0, 'good-loss': 0, 'bad-win': 0, 'bad-loss': 0 };
    recs.forEach(r => { if (r.quad) q[r.quad]++; });

    Nova.UI.modal({
      eyebrow: 'Session · ' + MODES[S.mode].name + (S.lesson ? ' · ' + S.lesson.name : ''),
      title: 'Bilan de session',
      body:
        '<div class="tiles">' +
        '<div class="tile"><div class="label">Capital final</div><div class="v ' + (eq.final >= START_CASH ? 'up' : 'dn') + '">' + Nova.fmtMoney(eq.final) + '</div></div>' +
        '<div class="tile"><div class="label">Espérance</div><div class="v ' + (m.expectancyR >= 0 ? 'up' : 'dn') + '">' + Nova.fmtR(m.expectancyR) + '</div></div>' +
        '<div class="tile"><div class="label">Score de décision</div><div class="v">' + (scores.length ? avgScore.toFixed(0) : '—') + '</div></div>' +
        '<div class="tile"><div class="label">Drawdown max</div><div class="v">' + m.maxDD.toFixed(1) + ' %</div></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div class="label mb">Décision contre résultat</div>' +
        '<div class="grid2">' +
        '<div class="quad good-win" style="margin:0"><div class="quad-t">' + q['good-win'] + ' · bonne décision, gain</div></div>' +
        '<div class="quad good-loss" style="margin:0"><div class="quad-t">' + q['good-loss'] + ' · bonne décision, perte</div></div>' +
        '<div class="quad bad-win" style="margin:0"><div class="quad-t">' + q['bad-win'] + ' · mauvaise décision, gain</div></div>' +
        '<div class="quad bad-loss" style="margin:0"><div class="quad-t">' + q['bad-loss'] + ' · mauvaise décision, perte</div></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        (issues.length
          ? '<div class="label mb">Ce que le coach a observé</div>' + issues.slice(0, 3).map(i =>
            '<div class="issue ' + (i.sev === 'high' ? 'high' : '') + '" style="margin-bottom:8px"><div class="issue-t">' + Nova.UI.esc(i.title) + '</div><div class="issue-d">' + Nova.UI.esc(i.detail) + '</div></div>').join('')
          : '<div class="muted" style="font-size:12.5px">Aucune dérive comportementale détectée sur cette session.</div>') +
        (recs.length >= 3 ? Nova.UI.sourceBlock(['amf2014', 'barber2000']) : ''),
      actions: '<button class="btn" id="stay">Rester sur le graphique</button><button class="btn btn--primary" id="go">Retour à l\'accueil</button>',
      onMount: r => {
        r.querySelector('#stay').onclick = () => { Nova.UI.closeModal(); S.last = performance.now(); };
        r.querySelector('#go').onclick = () => { Nova.UI.closeModal(); Nova.UI.show('home'); };
      }
    });
  }

  function showChallengeResult() {
    const c = S.challenge;
    const checks = runChecks(c.pass, S.session);
    const okAll = checks.length > 0 && checks.every(x => x.ok);
    const recs = S.session;
    const m = Nova.stats.metrics(recs, START_CASH);
    Nova.UI.modal({
      dismissible: false, eyebrow: 'Mode défi · ' + c.name,
      title: okAll ? 'Défi réussi' : 'Défi non atteint',
      body: '<div class="quad ' + (okAll ? 'good-win' : 'bad-loss') + '"><div class="quad-t">' +
        (okAll ? 'Tous les critères sont remplis.' : 'Au moins un critère manque.') + '</div>' +
        '<div class="quad-d">' + Nova.UI.esc(c.task) + '</div></div>' +
        checks.map(x => '<div class="crit"><div style="flex:1"><div class="crit-l">' + Nova.UI.esc(x.label) + '</div>' +
          '<div class="crit-n">' + Nova.UI.esc(x.detail) + '</div></div>' +
          '<div class="crit-p ' + (x.ok ? 'up' : 'dn') + '">' + (x.ok ? 'OK' : '—') + '</div></div>').join('') +
        '<div class="divider"></div>' +
        '<div class="kv"><span>Trades</span><span>' + m.n + '</span></div>' +
        '<div class="kv"><span>Espérance</span><span>' + Nova.fmtR(m.expectancyR) + '</span></div>' +
        '<div class="kv"><span>Drawdown max</span><span>' + m.maxDD.toFixed(1) + ' %</span></div>' +
        Nova.UI.sourceBlock((CONCEPTS.find(x => x.id === c.concept) || {}).sources),
      actions: '<button class="btn" id="again">Nouveau défi</button><button class="btn btn--primary" id="done">Retour</button>',
      onMount: r => {
        r.querySelector('#again').onclick = () => { Nova.UI.closeModal(); start({ mode: 'challenge' }); };
        r.querySelector('#done').onclick = () => { Nova.UI.closeModal(); Nova.UI.show('home'); };
      }
    });
  }

  /* ============================================================
     INDICATIONS À L'ÉCRAN
     ============================================================ */
  let hintTimer = null;
  function hint(html, ms) {
    const host = document.getElementById('hintHost');
    if (!html) { host.innerHTML = ''; clearTimeout(hintTimer); return; }
    host.innerHTML = '<div class="hint">' + html + '</div>';
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { host.innerHTML = ''; }, ms || 6000);
  }

  /* ============================================================
     MONTAGE
     ============================================================ */
  function syncTfButtons() {
    document.querySelectorAll('#tfSeg [data-tf]').forEach(b => b.classList.toggle('on', b.dataset.tf === S.tf));
    document.querySelectorAll('#overlaySeg [data-ov]').forEach(b => b.classList.toggle('on', !!S.overlays[b.dataset.ov]));
  }

  function mountChart() {
    const cv = document.getElementById('chart');
    if (!S.chart) {
      S.chart = new Nova.Chart(cv);
      S.chart.onPick = price => {
        const inst = S.market.inst;
        const atr = S.ctx ? S.ctx.a : inst.spread * 20;
        const side = S.ticket.side;
        S.chart.draft = {
          side: side, entry: Nova.round(price, inst.digits),
          sl: Nova.round(price - (side === 'buy' ? 1 : -1) * atr * 1.5, inst.digits),
          tp: Nova.round(price + (side === 'buy' ? 1 : -1) * atr * 2.6, inst.digits)
        };
        S.chart.render();
        renderTicketReadout();
        hint('Faites glisser le <b>stop</b> et la <b>cible</b> pour ajuster, puis validez avec Acheter ou Vendre.', 8000);
      };
      S.chart.onDraft = () => renderTicketReadout();
    }
    setTimeout(() => S.chart.resize(), 30);
  }

  function buildTopbar() {
    const sel = document.getElementById('instSel');
    sel.innerHTML = Object.values(Nova.INSTRUMENTS).map(i =>
      '<option value="' + i.id + '">' + i.name + '</option>').join('');
    sel.value = S.inst;
    sel.onchange = () => { S.inst = sel.value; save('inst', sel.value); if (S.market) { start({ mode: S.mode, lesson: S.lesson }); } };

    const tf = document.getElementById('tfSeg');
    tf.innerHTML = Nova.TIMEFRAMES.map(t =>
      '<button data-tf="' + t.key + '">' + t.key + '</button>').join('');
    tf.querySelectorAll('[data-tf]').forEach(b => b.onclick = () => {
      S.tf = b.dataset.tf;
      tf.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      const need = S.tf === '1d' ? 90 : S.tf === '4h' ? 150 : 180;
      if (S.market.series[S.tf].length < need) S.market.warmup(S.tf, need);
      S.chart.visible = Math.min(S.chart.visible, 140);
      refresh(true);
    });

    document.getElementById('overlaySeg').querySelectorAll('[data-ov]').forEach(b => b.onclick = () => {
      const k = b.dataset.ov;
      if (k === 'levels' && S.assist === 0) {
        Nova.flash('Détection automatique des niveaux désactivée en mode Libre.', 'info');
        return;
      }
      S.overlays[k] = !S.overlays[k];
      b.classList.toggle('on', S.overlays[k]);
      refresh();
    });

    document.getElementById('btnPlay').onclick = resume;
    document.getElementById('btnStep').onclick = step;
    document.getElementById('btnSpeed').onclick = () => {
      const i = SPEEDS.indexOf(S.speed);
      S.speed = SPEEDS[(i + 1) % SPEEDS.length];
      document.getElementById('speedLbl').textContent = S.speed + '×';
    };

    document.getElementById('dockTabs').querySelectorAll('button').forEach(b => b.onclick = () => {
      document.getElementById('dockTabs').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('.dock-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === b.dataset.pane));
    });

    document.getElementById('quickStart').onclick = () => start({ mode: 'learn' });
    document.getElementById('goCampaign').onclick = () => Nova.UI.show('campaign');
    document.getElementById('exportBtn').onclick = exportCSV;

    document.addEventListener('keydown', e => {
      if (Nova.UI.current() !== 'session') return;
      if (/input|select|textarea/i.test(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); resume(); }
      if (e.code === 'ArrowRight') { e.preventDefault(); step(); }
    });
  }

  function exportCSV() {
    const recs = journal();
    if (!recs.length) { Nova.flash('Aucun trade à exporter.', 'info'); return; }
    const cols = ['date', 'sens', 'taille', 'entree', 'sortie', 'R', 'pnl', 'risque_pct', 'rr_planifie', 'stop', 'tp', 'tf', 'sortie_motif', 'motif_entree', 'contexte_regime', 'score_setup', 'score_decision', 'stop_deplaces'];
    const rows = recs.map(r => [
      new Date(r.closedAt).toISOString(), r.side === 'buy' ? 'LONG' : 'SHORT', r.size, r.entry.toFixed(4), r.exit.toFixed(4),
      r.R.toFixed(3), r.pnl.toFixed(2), (r.riskPct || 0).toFixed(3), (r.plannedRR || 0).toFixed(2), r.sl, r.tp, r.tf,
      Nova.UI.exitLabel(r.reason), (r.reasonEntry || '').replace(/;/g, ','),
      ((r.ctx && r.ctx.regime) || '').replace(/;/g, ','), (r.ctx && r.ctx.scoreSetup != null) ? r.ctx.scoreSetup : '',
      r.score == null ? '' : r.score, (r.stopMoves || []).filter(s => s.dir === 'worse').length
    ].join(';'));
    const csv = '\uFEFF' + cols.join(';') + '\n' + rows.join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'nova-journal.csv'; a.click();
  }

  /* ---------- Initialisation ---------- */
  function init() {
    Nova.UI.buildNav();
    buildTopbar();
    Nova.UI.show('home');
    document.getElementById('railLvl').textContent = 'N' + (Nova.stats.level(axes().mastery).idx + 1);
  }

  return {
    init, start, startLesson, pause, resume, step,
    allRecords, axes, progress, seenConcepts, totalBars, quiz,
    state: S
  };
})();

window.addEventListener('DOMContentLoaded', () => Nova.App.init());
