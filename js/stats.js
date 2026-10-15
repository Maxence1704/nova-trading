/* ============================================================
   STATISTIQUES & ANALYSE COMPORTEMENTALE — Nova Terminal
   Métriques de performance, détection des mauvaises habitudes,
   calcul des axes de compétence (l'argent n'est qu'un axe parmi six).
   ============================================================ */

Nova.stats = (function () {

  function equityCurve(records, startCash) {
    let e = startCash; const pts = [{ i: 0, eq: e, ts: records.length ? records[0].openedAt : Date.now() }];
    let peak = e, dd = 0, maxDD = 0;
    records.forEach((r, i) => {
      e += r.pnl;
      peak = Math.max(peak, e);
      dd = (peak - e) / peak * 100;
      maxDD = Math.max(maxDD, dd);
      pts.push({ i: i + 1, eq: e, ts: r.closedAt, dd: dd });
    });
    return { pts, maxDD, final: e };
  }

  function metrics(records, startCash) {
    const n = records.length;
    if (!n) return { n: 0, winRate: 0, avgR: 0, expectancyR: 0, profitFactor: 0, pnl: 0, fees: 0, maxDD: 0, avgWinR: 0, avgLossR: 0, avgHold: 0, avgRiskPct: 0, rrPlanned: 0 };
    const wins = records.filter(r => r.pnl > 0), losses = records.filter(r => r.pnl <= 0);
    const sumW = wins.reduce((a, r) => a + r.R, 0);
    const sumL = Math.abs(losses.reduce((a, r) => a + r.R, 0));
    const eq = equityCurve(records, startCash);
    const rr = records.filter(r => r.plannedRR).map(r => r.plannedRR);
    return {
      n,
      wins: wins.length, losses: losses.length,
      winRate: wins.length / n * 100,
      avgR: records.reduce((a, r) => a + r.R, 0) / n,
      expectancyR: records.reduce((a, r) => a + r.R, 0) / n,
      profitFactor: sumL > 0 ? sumW / sumL : (sumW > 0 ? Infinity : 0),
      avgWinR: wins.length ? sumW / wins.length : 0,
      avgLossR: losses.length ? sumL / losses.length : 0,
      pnl: records.reduce((a, r) => a + r.pnl, 0),
      fees: records.reduce((a, r) => a + r.fees, 0),
      maxDD: eq.maxDD,
      avgHold: records.reduce((a, r) => a + (r.bars || 0), 0) / n,
      avgRiskPct: records.filter(r => r.riskPct != null).reduce((a, r) => a + r.riskPct, 0) / Math.max(1, records.filter(r => r.riskPct != null).length),
      rrPlanned: rr.length ? rr.reduce((a, b) => a + b, 0) / rr.length : 0,
      gross: records.reduce((a, r) => a + (r.gross || 0), 0)
    };
  }

  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const sd = a => { if (a.length < 2) return 0; const m = avg(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };

  /* ---------- Détection des habitudes ---------- */
  function detect(records, barsTraded) {
    const out = [];
    if (records.length < 3) return out;
    const last10 = records.slice(-10);

    /* 1. Stops déplacés en défaveur */
    const moved = last10.filter(r => (r.stopMoves || []).some(s => s.dir === 'worse'));
    if (moved.length >= 2 && moved.length / last10.length >= 0.25) {
      out.push({
        id: 'stopMoved', sev: moved.length >= 3 ? 'high' : 'med',
        title: 'Stop déplacé ' + moved.length + ' fois sur ' + last10.length + ' trades',
        detail: moved.length + ' de vos ' + last10.length + ' derniers trades ont vu leur stop élargi après l\'entrée. Un stop élargi augmente la perte réelle au-delà du risque décidé à l\'avance.',
        drill: 'stopMoved'
      });
    }

    /* 2. Hausse du risque après une perte */
    const afterLoss = [], afterWin = [];
    for (let i = 1; i < records.length; i++) {
      if (records[i].riskPct == null || records[i - 1].riskPct == null) continue;
      if (records[i - 1].pnl < 0) afterLoss.push(records[i].riskPct); else afterWin.push(records[i].riskPct);
    }
    if (afterLoss.length >= 3 && afterWin.length >= 2) {
      const ratio = avg(afterLoss) / Math.max(0.01, avg(afterWin));
      if (ratio > 1.25) out.push({
        id: 'riskEscalation', sev: ratio > 1.6 ? 'high' : 'med',
        title: 'Risque accru de ' + Math.round((ratio - 1) * 100) + ' % après une perte',
        detail: 'Risque moyen après une perte : ' + avg(afterLoss).toFixed(2) + ' % — après un gain : ' + avg(afterWin).toFixed(2) + ' %. C\'est la signature du revenge trading.',
        drill: 'riskEscalation'
      });
    }

    /* 3. Gains coupés trop tôt */
    const w = records.filter(r => r.pnl > 0 && r.plannedRR >= 1.2);
    const early = w.filter(r => r.R < r.plannedRR * 0.6);
    if (w.length >= 4 && early.length / w.length >= 0.45) {
      out.push({
        id: 'earlyCut', sev: 'med',
        title: Math.round(early.length / w.length * 100) + ' % de vos gains sont coupés avant la cible',
        detail: 'Gain moyen réalisé : ' + avg(w.map(r => r.R)).toFixed(2) + ' R pour une cible moyenne de ' + avg(w.map(r => r.plannedRR)).toFixed(2) + ' R. C\'est l\'effet de disposition.',
        drill: 'earlyCut'
      });
    }

    /* 4. Pertes laissées courir */
    const l = records.filter(r => r.pnl <= 0);
    const deep = l.filter(r => r.R < -1.15);
    if (l.length >= 4 && deep.length / l.length >= 0.35) {
      out.push({
        id: 'lateCut', sev: 'high',
        title: 'Perte moyenne de ' + avg(l.map(r => r.R)).toFixed(2) + ' R',
        detail: deep.length + ' de vos ' + l.length + ' pertes dépassent 1,15 R : le stop n\'a pas été respecté tel que défini.',
        drill: 'lateCut'
      });
    }

    /* 5. Surtrading */
    if (barsTraded > 40 && records.length / barsTraded * 100 > 4) {
      out.push({
        id: 'overtrading', sev: records.length / barsTraded * 100 > 7 ? 'high' : 'med',
        title: Math.round(records.length / barsTraded * 100) + ' trades pour 100 bougies',
        detail: 'Votre fréquence est élevée. Barber & Odean (2000) : les investisseurs les plus actifs obtiennent 11,4 %/an contre 18,5 % pour les moins actifs.',
        drill: 'overtrading'
      });
    }

    /* 6. Entrées sans setup déclaré */
    const noSetup = records.filter(r => !r.reasonEntry || /intuition|envie|autre/i.test(r.reasonEntry));
    if (records.length >= 4 && noSetup.length / records.length >= 0.4) {
      out.push({
        id: 'noSetup', sev: 'med',
        title: Math.round(noSetup.length / records.length * 100) + ' % d\'entrées sans raison déclarée',
        detail: 'Sans hypothèse écrite, le résultat d\'un trade n\'apporte aucune information exploitable.',
        drill: 'noSetup'
      });
    }

    /* 7. R:R planifié trop faible */
    const planned = records.filter(r => r.plannedRR != null);
    if (planned.length >= 4 && avg(planned.map(r => r.plannedRR)) < 1) {
      out.push({
        id: 'rrTooLow', sev: 'med',
        title: 'R:R planifié moyen de ' + avg(planned.map(r => r.plannedRR)).toFixed(2),
        detail: 'Vos cibles sont plus proches que vos stops. Une espérance positive devient alors très difficile à atteindre.',
        drill: 'rrTooLow'
      });
    }

    /* 8. Revenge trading immédiat */
    let revenge = 0;
    for (let i = 1; i < records.length; i++) {
      if (records[i - 1].pnl < 0 && records[i].openedBar - records[i - 1].closedBar <= 3
        && records[i].riskPct > records[i - 1].riskPct) revenge++;
    }
    if (revenge >= 1) out.push({
      id: 'revenge', sev: 'high',
      title: revenge + ' re-trade immédiat' + (revenge > 1 ? 's' : '') + ' après une perte',
      detail: 'Trade ouvert dans les 3 bougies suivant une perte, avec un risque supérieur. C\'est la recherche de risque dans le domaine des pertes décrite par Kahneman & Tversky (1979).',
      drill: 'riskEscalation'
    });

    return out.sort((a, b) => (a.sev === 'high' ? -1 : 1) - (b.sev === 'high' ? -1 : 1));
  }

  /* ---------- Axes de compétence ----------
     L'argent n'est qu'un axe sur six, et le moins pondéré. */
  function axes(o) {
    const m = o.metrics, rec = o.records || [], quiz = o.quiz || { correct: 0, total: 0 };
    const clamp = v => Nova.clamp(Math.round(v), 0, 100);

    /* Analyse : qualité des contextes d'entrée + précision des réponses */
    const setups = rec.filter(r => r.ctx && r.ctx.scoreSetup != null).map(r => r.ctx.scoreSetup);
    const analyseRaw = setups.length ? avg(setups) : 50;
    const quizRate = quiz.total ? quiz.correct / quiz.total * 100 : 50;
    const analyse = clamp(setups.length && quiz.total ? analyseRaw * .55 + quizRate * .45
      : setups.length ? analyseRaw : quizRate);

    /* Discipline : stops respectés, pas d'escalade, pas de sorties impulsives */
    let disc = 100;
    const moved = rec.filter(r => (r.stopMoves || []).some(s => s.dir === 'worse')).length;
    disc -= rec.length ? Math.min(45, moved / rec.length * 90) : 0;
    const late = rec.filter(r => r.R < -1.15).length;
    disc -= rec.length ? Math.min(30, late / rec.length * 55) : 0;
    const early = rec.filter(r => r.pnl > 0 && r.plannedRR >= 1.2 && r.R < r.plannedRR * .5).length;
    disc -= rec.length ? Math.min(20, early / rec.length * 40) : 0;
    if (rec.length < 3) disc = 50 + (quiz.total ? quizRate * .2 : 0);

    /* Risque : taille, distance de stop, R:R */
    let risk = 100;
    if (rec.length) {
      const risky = rec.filter(r => r.riskPct > 1.5).length;
      risk -= Math.min(45, risky / rec.length * 70);
      const badAtr = rec.filter(r => r.ctx && r.ctx.stopAtr != null && (r.ctx.stopAtr < .6 || r.ctx.stopAtr > 4)).length;
      risk -= Math.min(25, badAtr / rec.length * 45);
      const lowRR = rec.filter(r => r.plannedRR != null && r.plannedRR < 1).length;
      risk -= Math.min(20, lowRR / rec.length * 35);
      if (sd(rec.filter(r => r.riskPct != null).map(r => r.riskPct)) > .5) risk -= 10;
    } else risk = 50;

    /* Connaissance : concepts vus et quiz */
    const knowledge = clamp(quiz.total ? (o.conceptsSeen || 0) / Math.max(1, o.conceptsTotal || 23) * 55 + quizRate * .45 : 25);

    /* Constance : régularité du risque et de la fréquence */
    let cons = 60;
    if (rec.length >= 5) {
      cons = clamp(100 - sd(rec.filter(r => r.riskPct != null).map(r => r.riskPct)) * 30 - (o.issues || []).length * 4);
    }

    /* Performance : espérance et drawdown, jamais le gain brut seul */
    let perf = 50;
    if (rec.length >= 5) {
      perf = clamp(50 + m.expectancyR * 55 - Math.max(0, m.maxDD - 8) * 1.6);
    } else if (rec.length) perf = clamp(50 + m.expectancyR * 55);

    const vals = { analyse, discipline: clamp(disc), risque: clamp(risk), connaissance: knowledge, constance: cons, performance: perf };
    /* pondération : la performance compte pour 15 % seulement */
    const weights = { analyse: .20, discipline: .20, risque: .20, connaissance: .15, constance: .10, performance: .15 };
    const mastery = Math.round(Object.keys(vals).reduce((a, k) => a + vals[k] * weights[k], 0));
    return { vals, weights, mastery };
  }

  function level(mastery) {
    if (mastery >= 85) return { name: 'Expert', idx: 3 };
    if (mastery >= 68) return { name: 'Avancé', idx: 2 };
    if (mastery >= 45) return { name: 'Intermédiaire', idx: 1 };
    return { name: 'Débutant', idx: 0 };
  }

  return { metrics, equityCurve, detect, axes, level, avg, sd };
})();
