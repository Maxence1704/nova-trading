/* ============================================================
   COACH PÉDAGOGIQUE — Nova Terminal
   1. snapshot()  : photographie objective du contexte d'entrée
   2. PROMPTS     : questions posées au bon moment, sourcées
   3. debrief()   : score de décision séparé du résultat
   ============================================================ */

Nova.coach = (function () {

  /* ---------- Photographie du contexte ---------- */
  function snapshot(ctx, market) {
    if (!ctx) return null;
    const nearAtr = ctx.near ? Math.abs(ctx.near.distAtr) : null;
    let score = 0;
    const flags = [];
    if (nearAtr != null && nearAtr < 1.2) { score += 32; flags.push('niveau proche'); }
    if (ctx.trend !== 'flat') { score += 20; flags.push('tendance ' + ctx.trend); }
    if (ctx.breakout) { score += 20; flags.push('cassure'); }
    if (ctx.consolidation) { score += 10; flags.push('compression'); }
    const ema = ctx.e20[ctx.i];
    if (ctx.trend !== 'flat' && ema && Math.abs(ctx.last.c - ema) < ctx.a * 1.2) { score += 16; flags.push('repli sur moyenne'); }
    return {
      trend: ctx.trend, slope: +ctx.slope.toFixed(3), atr: +ctx.a.toFixed(4),
      rsi: +ctx.rsiV.toFixed(1), volState: ctx.volState, volRatio: +ctx.volRatio.toFixed(2),
      nearAtr: nearAtr == null ? null : +nearAtr.toFixed(2),
      touches: ctx.near ? ctx.near.level.touches : 0,
      breakout: ctx.breakout ? ctx.breakout.dir : 0,
      consolidation: ctx.consolidation,
      regime: market ? market.regimeLabel() : '',
      scoreSetup: Nova.clamp(Math.round(score), 0, 100),
      flags
    };
  }

  /* ---------- Banque de questions ---------- */
  const P = [];
  const add = (p) => P.push(p);

  add({
    id: 'trend', minAssist: 1, concept: 'tendance',
    when: c => Math.abs(c.slope) > 0.28 && c.structure.highs.length >= 2,
    build(c) {
      const ans = c.trend === 'up' ? 0 : c.trend === 'down' ? 1 : 2;
      return {
        q: 'Quelle est la structure de marché sur cette unité de temps ?',
        options: ['Tendance haussière : sommets et creux plus hauts', 'Tendance baissière : sommets et creux plus bas', 'Range : le prix oscille sans direction'],
        answer: ans,
        explain: c.structure.note.charAt(0).toUpperCase() + c.structure.note.slice(1) + '. Une tendance se lit sur la structure des pivots, pas sur la dernière bougie. Lo, Mamaysky & Wang (2000) montrent qu\'une partie de ces structures apporte une information incrémentale — sans garantir de profit après coûts.',
        sources: ['lo2000', 'park2007'],
        watch: ['Le dernier pivot qui, s\'il est cassé, invaliderait la tendance', 'La distance au prochain niveau']
      };
    }
  });

  add({
    id: 'level', minAssist: 1, concept: 'support',
    when: c => c.near && Math.abs(c.near.distAtr) < 1.0 && c.near.level.touches >= 2,
    build(c) {
      const above = c.near.distAtr > 0;
      const z = c.near.level;
      return {
        q: 'Le prix arrive sur une zone touchée ' + z.touches + ' fois, à ' + Math.abs(c.near.distAtr).toFixed(1) + ' ATR. Que remarques-tu ?',
        options: [
          above ? 'Une résistance : les vendeurs s\'y sont déjà manifestés' : 'Un support : les acheteurs s\'y sont déjà manifestés',
          above ? 'Un support : les acheteurs s\'y sont déjà manifestés' : 'Une résistance : les vendeurs s\'y sont déjà manifestés',
          'Un simple bruit sans signification',
          'Une cassure déjà confirmée'
        ],
        answer: 0,
        explain: 'Le niveau est ' + (above ? 'au-dessus' : 'en dessous') + ' du prix : c\'est donc ' + (above ? 'une résistance' : 'un support') + '. Plus un niveau est testé, plus il est surveillé — mais un test de plus augmente aussi la probabilité de traversée. Pense en zones, pas en prix exacts.',
        sources: ['lo2000'],
        watch: ['La réaction du prix au contact (mèche, hésitation, amplitude)', 'Ce qui se passerait en cas de traversée : le niveau change de rôle']
      };
    }
  });

  add({
    id: 'breakout', minAssist: 1, concept: 'breakout',
    when: c => !!c.breakout,
    build(c) {
      const dir = c.breakout.dir > 0 ? 'au-dessus' : 'en dessous';
      return {
        q: 'Le prix vient de clôturer ' + dir + ' d\'un niveau qui tenait depuis plusieurs bougies. Que fais-tu ?',
        options: [
          'J\'attends une confirmation : tenue du niveau ou repli qui ne le reprend pas',
          'J\'entre immédiatement dans le sens de la cassure',
          'Je vends le retour dans le range',
          'Je ne fais rien, une cassure n\'a aucune valeur'
        ],
        score: [1, 0.35, 0.45, 0.7],
        answer: 0,
        explain: 'Le franchissement est un événement, pas une preuve : une part importante des cassures est reprise. Marshall, Young & Rose (2006) ne trouvent aucune valeur créée par les figures en chandeliers sur le Dow Jones après coûts ; Lo et al. (2000) trouvent une information incrémentale mais sans garantie de profit. La seule réponse honnête est probabiliste : définir avant l\'entrée ce qui invaliderait la cassure.',
        sources: ['marshall2006', 'lo2000', 'park2007'],
        watch: ['La tenue du niveau sur les bougies suivantes', 'L\'amplitude du corps par rapport à l\'ATR', 'Où placer le stop si la cassure échoue']
      };
    }
  });

  add({
    id: 'consolidation', minAssist: 2, concept: 'volatilite',
    when: c => c.consolidation && c.volRatio < 0.95,
    build(c) {
      return {
        q: 'L\'amplitude des 20 dernières bougies est très faible et l\'ATR se contracte. Qu\'est-ce que cela suggère ?',
        options: [
          'Une expansion de volatilité est probable, mais sa direction ne l\'est pas',
          'Une hausse est imminente',
          'Une baisse est imminente',
          'Rien : la volatilité est constante par nature'
        ],
        answer: 0,
        explain: 'La volatilité se regroupe dans le temps (Mandelbrot 1963, formalisé par Engle 1982 avec le modèle ARCH). Une phase calme précède donc souvent une phase agitée — mais la direction, elle, n\'est pas prédite par la compression. C\'est exactement pour cela que la volatilité est plus prévisible que le sens.',
        sources: ['mandelbrot1963', 'engle1982'],
        watch: ['Les deux bornes de la compression', 'Le niveau d\'ATR à utiliser pour dimensionner le stop après l\'expansion']
      };
    }
  });

  add({
    id: 'volspike', minAssist: 2, concept: 'volatilite',
    when: c => c.volRatio > 1.5,
    build(c) {
      return {
        q: 'L\'ATR a progressé de ' + Math.round((c.volRatio - 1) * 100) + ' % en une bougie. Quelle conséquence sur ta position ?',
        options: [
          'Stop plus large et taille plus petite, pour un risque identique',
          'Stop plus serré, le mouvement est lancé',
          'Aucun changement',
          'Taille doublée : la volatilité est une opportunité'
        ],
        answer: 0,
        explain: 'Le risque en euros est la taille multipliée par la distance au stop. Si la distance augmente à cause de la volatilité, la taille doit diminuer pour que le risque reste constant. La volatilité se regroupe : un ATR élevé a tendance à persister (Engle 1982).',
        sources: ['engle1982', 'mandelbrot1963'],
        watch: ['La nouvelle valeur d\'ATR', 'Le risque en euros, pas la taille en unités']
      };
    }
  });

  add({
    id: 'pullback', minAssist: 1, concept: 'pullback',
    when: c => c.trend !== 'flat' && c.e20[c.i] && Math.abs(c.last.c - c.e20[c.i]) < c.a * 1.1,
    build(c) {
      const up = c.trend === 'up';
      return {
        q: 'La tendance est ' + (up ? 'haussière' : 'baissière') + ' et le prix revient au contact de sa moyenne mobile 20. Que observes-tu ?',
        options: [
          'Un repli dans la tendance : le dernier pivot tient encore',
          'Un retournement confirmé',
          'Un range qui s\'installe',
          'Une cassure de niveau'
        ],
        answer: 0,
        explain: 'Tant que le dernier pivot ' + (up ? 'bas' : 'haut') + ' n\'est pas cassé, un repli reste un repli. Un retournement ne se confirme qu\'après la rupture d\'un pivot — donc toujours avec du retard. Anticiper un retournement, c\'est prendre un risque de contre-tendance assumé.',
        sources: ['lo2000'],
        watch: ['Le dernier pivot ' + (up ? 'bas' : 'haut') + ' : sa cassure signerait le retournement', 'La réaction du prix sur la zone']
      };
    }
  });

  add({
    id: 'nothing', minAssist: 1, concept: 'surtrading',
    when: c => !c.breakout && !c.consolidation && c.trend === 'flat' && (!c.near || Math.abs(c.near.distAtr) > 2),
    build(c) {
      return {
        q: 'Aucune structure claire, aucun niveau proche, aucune cassure. Que fais-tu ?',
        options: [
          'J\'attends : ne rien faire est une décision de trading',
          'Je prends une petite position au marché',
          'J\'entre contre le dernier mouvement',
          'J\'augmente ma taille sur le prochain signal'
        ],
        answer: 0,
        explain: 'Barber & Odean (2000) : sur 66 465 foyers, les investisseurs les plus actifs obtiennent 11,4 %/an net contre 18,5 % pour les moins actifs. L\'AMF (2014) constate la même chose en France : ceux qui traitent le plus perdent le plus. Attendre ne coûte rien ; chaque aller-retour coûte un spread, deux commissions et du slippage.',
        sources: ['barber2000', 'odean1999', 'amf2014'],
        watch: ['L\'apparition d\'une structure', 'Le nombre de trades pour 100 bougies']
      };
    }
  });

  add({
    id: 'sizing', minAssist: 1, concept: 'risque_par_trade',
    when: c => true,
    build(c, inst, eq) {
      const entry = c.last.c;
      const stop = entry - c.a * 1.5;
      const risk = eq * 0.01;
      const size = risk / Math.abs(entry - stop);
      const dec = inst.digits > 2 ? 2 : 0;
      const wrong = [size * 2.4, size * 0.45, size * 12].map(v => Nova.round(v, dec));
      const opts = [Nova.round(size, dec)].concat(wrong);
      const order = [1, 0, 2, 3].map(i => opts[i % opts.length]);
      return {
        q: 'Capital ' + Nova.fmtMoney(eq, 0) + ', risque 1 %. Entrée ' + Nova.fmtPrice(entry, inst) + ', stop ' + Nova.fmtPrice(stop, inst) + '. Quelle taille ?',
        options: order.map(v => Nova.fmtNum(v, dec) + ' ' + inst.unitLabel + (inst.id === 'neo' ? 's' : 's')),
        answer: order.indexOf(Nova.round(size, dec)),
        explain: 'Taille = risque en euros ÷ distance entrée-stop = ' + Nova.fmtMoney(risk, 0) + ' ÷ ' + Nova.fmtPrice(Math.abs(entry - stop), inst) + ' = ' + Nova.round(size, 2) + '. Le risque est fixe, la taille varie : c\'est le stop qui commande la taille, jamais l\'inverse. La règle des 1 à 2 % est une convention professionnelle, pas un résultat scientifique : la ruine dépend de l\'avantage, de la variance et du capital.',
        sources: ['gambler', 'kelly1956'],
        watch: ['La distance au stop avant de calculer la taille', 'Le risque en euros, identique à chaque trade']
      };
    }
  });

  add({
    id: 'streak', minAssist: 1, concept: 'fomo',
    when: (c, m, b) => b.closed.length >= 2 && b.closed[b.closed.length - 1].pnl < 0 && b.closed[b.closed.length - 2].pnl < 0,
    build(c) {
      return {
        q: 'Deux pertes consécutives. Que fais-tu pour le prochain trade ?',
        options: [
          'Exactement le même risque : 1 %',
          'J\'augmente le risque pour récupérer plus vite',
          'J\'arrête d\'utiliser un stop pour éviter une troisième perte',
          'Je prends plusieurs positions pour lisser'
        ],
        answer: 0,
        explain: 'Augmenter la mise après une perte est la recherche de risque dans le domaine des pertes décrite par Kahneman & Tversky (1979). Kelly (1956) montre que sur-miser réduit la croissance de long terme même avec un avantage réel. Deux pertes à 1 % représentent −2 % : c\'est le prix normal d\'une stratégie probabiliste, pas un signal à corriger.',
        sources: ['kahneman1979', 'kelly1956', 'thorndike'],
        watch: ['Le risque en euros du prochain trade, identique au précédent', 'Le nombre de bougies avant la prochaine entrée']
      };
    }
  });

  add({
    id: 'disposition', minAssist: 2, concept: 'disposition',
    when: (c, m, b) => {
      const p = b.positions[0];
      return !!p && p.plannedRR >= 1.5 && p.maxFavR >= 0.9 && p.maxFavR < p.plannedRR * 0.7;
    },
    build(c, inst, eq, b) {
      const p = b.positions[0];
      return {
        q: 'Ta position est à +' + p.maxFavR.toFixed(1) + ' R, ta cible est à +' + p.plannedRR.toFixed(1) + ' R. Que fais-tu ?',
        options: [
          'Je laisse la cible ou le stop décider',
          'J\'encaisse maintenant, un gain reste un gain',
          'J\'élargis mon stop pour laisser respirer le trade',
          'J\'ajoute à la position'
        ],
        answer: 0,
        explain: 'Vendre trop tôt ses gains et conserver ses pertes est l\'effet de disposition (Shefrin & Statman 1985). Odean (1998) a mesuré sur 10 000 comptes que les titres vendés surperforment ensuite ceux conservés : le biais coûte réellement de l\'argent. Si la cible a été fixée avant l\'entrée, c\'est elle qui décide.',
        sources: ['shefrin1985', 'odean1998', 'kahneman1979'],
        watch: ['La règle de sortie écrite avant l\'entrée', 'La tentation d\'encaisser : c\'est le biais, pas une information']
      };
    }
  });

  /* Sélection d'une question pertinente, sans répétition immédiate */
  function pick(ctx, market, broker, inst, eq, opts) {
    if (!ctx) return null;
    const pool = P.filter(p => p.minAssist <= opts.assist);
    /* tirage indépendant du générateur du marché : l'interface ne doit pas
       influencer la trajectoire des prix */
    const shuffled = pool.slice().sort(() => Math.random() - 0.5);
    for (const p of shuffled) {
      let ok = false;
      try { ok = p.when(ctx, market, broker); } catch (e) { ok = false; }
      if (!ok) continue;
      if (opts.recent.indexOf(p.id) >= 0) continue;
      let built = null;
      try { built = p.build(ctx, inst, eq, broker); } catch (e) { continue; }
      if (!built) continue;
      return Object.assign({ id: p.id, concept: p.concept }, built);
    }
    return null;
  }

  /* ---------- Débrief : score de décision, indépendant du résultat ---------- */
  function debrief(rec, inst) {
    const ctx = rec.ctx || {};
    const items = [];
    let score = 0, max = 0;

    const add = (label, pts, tot, note) => { items.push({ label, pts, tot, note }); score += pts; max += tot; };

    /* 1. Risque */
    const rp = rec.riskPct == null ? 1 : rec.riskPct;
    add('Risque maîtrisé', rp <= 1.05 ? 20 : rp <= 1.6 ? 12 : rp <= 2.5 ? 5 : 0, 20,
      'Risque réel : ' + rp.toFixed(2) + ' % du capital.');

    /* 2. Distance de stop */
    const sa = ctx.stopAtr;
    add('Stop placé au-delà du bruit', sa == null ? 8 : (sa >= 0.8 && sa <= 3) ? 15 : (sa >= 0.5 && sa <= 4.5) ? 8 : 0, 15,
      sa == null ? 'Distance de stop non mesurable.' : 'Distance : ' + sa.toFixed(2) + ' ATR (zone saine : 0,8 à 3).');

    /* 3. R:R planifié */
    const rr = rec.plannedRR;
    add('Objectif défini avant l\'entrée', rr == null ? 0 : rr >= 1.5 ? 15 : rr >= 1 ? 8 : 2, 15,
      rr == null ? 'Aucune cible n\'avait été définie.' : 'R:R planifié : ' + rr.toFixed(2) + '.');

    /* 4. Alignement avec la structure */
    const aligned = rec.side === 'buy' ? ctx.trend === 'up' : ctx.trend === 'down';
    const declaredReversal = /retournement|reversal/i.test(rec.reasonEntry || '');
    add('Cohérence avec la structure',
      ctx.trend === 'flat' ? 12 : aligned ? 20 : declaredReversal ? 12 : 4, 20,
      'Tendance au moment de l\'entrée : ' + (ctx.trend === 'up' ? 'haussière' : ctx.trend === 'down' ? 'baissière' : 'neutre') +
      (aligned ? ' — votre sens était aligné.' : declaredReversal ? ' — contre-tendance déclaré.' : ' — entrée contre la tendance.'));

    /* 5. Présence d'un setup */
    const setup = ctx.scoreSetup == null ? 30 : ctx.scoreSetup;
    add('Setup identifiable', Math.round(setup / 100 * 20), 20,
      ctx.flags && ctx.flags.length ? 'Éléments présents : ' + ctx.flags.join(', ') + '.' : 'Aucun élément de contexte notable au moment de l\'entrée.');

    /* 6. Raison déclarée */
    const hasReason = rec.reasonEntry && !/intuition|envie|^autre$/i.test(rec.reasonEntry);
    add('Raison écrite', hasReason ? 10 : 0, 10, hasReason ? 'Motif : ' + rec.reasonEntry + '.' : 'Aucun motif exploitable n\'a été enregistré.');

    /* Ajustements de gestion */
    const moved = (rec.stopMoves || []).filter(s => s.dir === 'worse').length;
    if (moved) { add('Stop déplacé en défaveur', -12 * moved, 0, moved + ' élargissement(s) après l\'entrée.'); }
    if (rec.pnl > 0 && rr >= 1.2 && rec.R < rr * 0.5) { add('Gain coupé avant la cible', -10, 0, 'Sortie à +' + rec.R.toFixed(2) + ' R pour une cible à +' + rr.toFixed(2) + ' R.'); }
    if (rec.R < -1.15) { add('Perte au-delà du stop', -14, 0, 'Sortie à ' + rec.R.toFixed(2) + ' R alors que le stop définissait −1 R.'); }

    score = Nova.clamp(Math.round(score), 0, 100);
    const win = rec.pnl > 0;
    const good = score >= 60;
    const quad = good && win ? 'good-win' : good && !win ? 'good-loss' : !good && win ? 'bad-win' : 'bad-loss';

    const sources = [];
    if (moved) sources.push('kahneman1979');
    if (rec.pnl > 0 && rr >= 1.2 && rec.R < rr * 0.5) sources.push('shefrin1985', 'odean1998');
    if (rp > 1.5) sources.push('gambler', 'kelly1956');
    if (ctx.trend === 'flat' || setup < 40) sources.push('barber2000', 'odean1999');
    if (!sources.length) sources.push('thorndike', 'lo2000');

    return {
      score, quad, win, items: items.filter(i => i.tot > 0 || i.pts < 0),
      setup, context: ctx,
      sources: sources.filter((v, i, a) => a.indexOf(v) === i).slice(0, 3),
      quadrantLabel: {
        'good-win': 'Bonne décision · gain',
        'good-loss': 'Bonne décision · perte',
        'bad-win': 'Mauvaise décision · gain',
        'bad-loss': 'Mauvaise décision · perte'
      }[quad],
      quadrantText: {
        'good-win': 'Le processus et le résultat sont alignés. C\'est le cas idéal, mais ce n\'est pas la preuve que la décision était bonne : un seul tirage ne prouve rien.',
        'good-loss': 'Décision solide, résultat défavorable. C\'est le coût normal d\'une approche probabiliste : sur un tirage, le hasard domine. La décision reste correcte.',
        'bad-win': 'Le cas le plus dangereux : vous êtes récompensé pour une mauvaise décision. Répété, ce comportement détruit un compte malgré des gains ponctuels.',
        'bad-loss': 'Décision fragile et résultat négatif. À corriger en priorité : le problème est le processus, pas la chance.'
      }[quad]
    };
  }

  return { snapshot, pick, debrief, PROMPTS: P };
})();
