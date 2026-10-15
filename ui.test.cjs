/* Test de bout en bout de l'interface (jsdom).
   Vérifie : démarrage, boucle de marché, passation d'ordre, clôture,
   débrief, journal, coach, bibliothèque, campagne. */
const { JSDOM } = require('/home/user/.domtest/node_modules/jsdom');
const path = require('path');

let failures = 0;
const ok = (c, m, x) => { if (!c) { failures++; console.log('  ✗ ' + m + (x ? '  → ' + x : '')); } else console.log('  ✓ ' + m + (x ? '  → ' + x : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Contexte 2D factice : enregistre les appels au lieu de dessiner */
function fakeCtx() {
  const calls = { fillRect: 0, stroke: 0, fillText: 0, measureText: 0 };
  const noop = () => { };
  return {
    calls,
    canvas: null,
    setTransform: noop, clearRect: noop, beginPath: noop, moveTo: noop, lineTo: noop,
    arcTo: noop, closePath: noop, save: noop, restore: noop, setLineDash: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    fillRect: () => { calls.fillRect++; },
    strokeRect: () => { calls.stroke++; },
    stroke: () => { calls.stroke++; },
    fill: () => { calls.fillRect++; },
    fillText: () => { calls.fillText++; },
    measureText: t => { calls.measureText++; return { width: String(t).length * 6 }; },
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
    textAlign: '', textBaseline: ''
  };
}

(async () => {
  const dom = await JSDOM.fromFile(path.join(__dirname, '..', 'index.html'), {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = function () {
        const c = fakeCtx(); c.canvas = this; this._ctx = c; return c;
      };
      Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', { get() { return 900; } });
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', { get() { return 500; } });
      window.HTMLElement.prototype.getBoundingClientRect = function () {
        return { width: 900, height: 500, top: 0, left: 0, right: 900, bottom: 500, x: 0, y: 0 };
      };
      window.URL.createObjectURL = () => 'blob:stub';
      /* stockage en mémoire : file:// est une origine opaque pour jsdom */
      const mem = new Map();
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: k => (mem.has(k) ? mem.get(k) : null),
          setItem: (k, v) => mem.set(k, String(v)),
          removeItem: k => mem.delete(k),
          clear: () => mem.clear(),
          key: i => Array.from(mem.keys())[i],
          get length() { return mem.size; }
        }, configurable: true
      });
      window.addEventListener('error', e => { console.log('  !! erreur script :', e.error && e.error.stack || e.message); failures++; });
    }
  });

  const w = dom.window, d = w.document;
  await sleep(900);
  const Nova = w.eval('Nova');

  console.log('\n1. Démarrage');
  ok(!!Nova && !!Nova.App, 'scripts chargés');
  ok(d.querySelectorAll('#nav button').length === 5, 'navigation construite', d.querySelectorAll('#nav button').length + ' entrées');
  ok(d.querySelector('[data-screen="home"]').classList.contains('on'), 'écran d\'accueil actif');
  ok(d.querySelectorAll('#homeModes .mode').length === 4, 'modes de jeu proposés', d.querySelectorAll('#homeModes .mode').length + ' modes');
  ok(d.querySelector('#homeStats').textContent.includes('Maîtrise'), 'statistiques d\'accueil rendues');
  ok(d.querySelector('.badge.info') !== null, 'badges de fiabilité présents');

  console.log('\n2. Lancement d\'une session');
  d.getElementById('quickStart').click();
  await sleep(400);
  ok(d.querySelector('[data-screen="session"]').classList.contains('on'), 'écran de session affiché');
  const App = Nova.App, St = App.state;
  ok(!!St.market && !!St.broker && !!St.chart, 'marché, compte et graphique instanciés');
  ok(St.market.series['15m'].length >= 220, 'historique initial généré', St.market.series['15m'].length + ' bougies');
  ok(d.getElementById('livePrice').textContent !== '—', 'prix affiché', d.getElementById('livePrice').textContent);
  ok(d.querySelectorAll('#tfSeg button').length === 6, '6 unités de temps', d.querySelectorAll('#tfSeg button').length + ' boutons');
  ok(d.getElementById('rEntry').textContent !== '—', 'ticket d\'ordre calculé', 'entrée ' + d.getElementById('rEntry').textContent);
  ok(d.getElementById('rRisk').textContent.includes('%'), 'risque exprimé en %', d.getElementById('rRisk').textContent);

  console.log('\n3. Boucle de jeu');
  /* si une question du coach est apparue, on y répond d'abord */
  if (d.querySelector('.coach-card')) { d.querySelector('.coach-opts .opt').click(); await sleep(60); d.getElementById('coachOk').click(); await sleep(60); }
  const bars0 = St.bars;
  await sleep(1600);
  ok(St.bars > bars0, 'le marché avance tout seul', bars0 + ' → ' + St.bars + ' bougies');
  const ctxCalls = d.getElementById('chart')._ctx.calls;
  ok(ctxCalls.fillRect > 50, 'chandeliers dessinés sur le canvas', ctxCalls.fillRect + ' rectangles');
  ok(ctxCalls.fillText > 5, 'axes dessinés', ctxCalls.fillText + ' textes');

  console.log('\n4. Contrôle du temps');
  d.getElementById('btnPlay').click();
  const barsPaused = St.bars;
  await sleep(700);
  ok(St.bars === barsPaused, 'pause effective', St.bars + ' bougies');
  d.getElementById('btnStep').click();
  await sleep(60);
  ok(St.bars === barsPaused + 1, 'pas à pas', barsPaused + ' → ' + St.bars);
  d.getElementById('btnSpeed').click();
  ok(d.getElementById('speedLbl').textContent === '2×', 'changement de vitesse', d.getElementById('speedLbl').textContent);

  console.log('\n5. Placement d\'un ordre par le ticket');
  d.getElementById('sideSell').click();
  ok(St.ticket.side === 'sell', 'sens short sélectionné');
  const cashBefore = St.broker.cash;
  d.getElementById('sendSell').click();
  await sleep(80);
  ok(St.broker.positions.length === 1, 'position ouverte', St.broker.positions.length + ' position');
  const p = St.broker.positions[0];
  ok(p.side === 'sell' && p.sl > p.entry && p.tp < p.entry, 'stop au-dessus et cible en dessous pour un short',
    'entrée ' + p.entry.toFixed(2) + ' / SL ' + (p.sl || 0).toFixed(2) + ' / TP ' + (p.tp || 0).toFixed(2));
  ok(St.broker.cash < cashBefore, 'commission débitée', (cashBefore - St.broker.cash).toFixed(2) + ' €');
  ok(p.ctx && typeof p.ctx.scoreSetup === 'number', 'contexte pédagogique capturé', 'setup ' + p.ctx.scoreSetup + '/100');
  ok(p.ctx.stopAtr > 0, 'distance de stop en ATR enregistrée', p.ctx.stopAtr.toFixed(2) + ' ATR');
  ok(St.broker.marginUsed() > 0, 'marge immobilisée', St.broker.marginUsed().toFixed(2) + ' €');
  ok(d.querySelector('#posHost .pos') !== null, 'position affichée dans le dock');

  console.log('\n6. Gestion de position');
  const be = d.querySelector('[data-be]');
  ok(!!be, 'bouton « stop à l\'entrée » présent');
  be.click();
  await sleep(50);
  ok(p.stopMoves.length === 1 && p.stopMoves[0].dir === 'better', 'déplacement du stop tracé', p.stopMoves[0].dir);

  console.log('\n7. Clôture et débrief');
  St.broker.closePosition(St.market, St.broker.positions[0], 'manual', St.market.bid(), St.market.now());
  await sleep(300);
  ok(St.session.length === 1, 'trade enregistré en session');
  ok(App.allRecords().length === 1, 'trade persisté au journal', App.allRecords().length + ' trade(s)');
  const rec = App.allRecords()[0];
  ok(typeof rec.score === 'number' && rec.score >= 0 && rec.score <= 100, 'score de décision calculé', 'score ' + rec.score);
  ok(['good-win', 'good-loss', 'bad-win', 'bad-loss'].includes(rec.quad), 'quadrant décision/résultat', rec.quad);
  ok(d.getElementById('modalRoot').classList.contains('on'), 'modale de débrief ouverte');
  const mtxt = d.getElementById('modalRoot').textContent;
  ok(/Décision|décision/.test(mtxt), 'débrief explicite la décision');
  ok(/amf-france|doi|wiley|jstor|bell-labs|sec\.gov|esma|mit\.edu|uchicago|aeaweb|wikipedia/i.test(d.getElementById('modalRoot').innerHTML),
    'le débrief cite au moins une source vérifiable');
  d.getElementById('dbOk').click();
  await sleep(60);
  ok(!d.getElementById('modalRoot').classList.contains('on'), 'débrief refermé');

  console.log('\n8. Coach en session');
  let prompts = 0;
  for (let i = 0; i < 60 && !d.querySelector('.coach-card'); i++) { d.getElementById('btnStep').click(); await sleep(12); }
  if (d.querySelector('.coach-card')) {
    prompts = d.querySelectorAll('.coach-opts .opt').length;
    ok(prompts >= 3, 'question du coach posée', prompts + ' options');
    ok(d.querySelector('.coach-q').textContent.length > 20, 'question lisible', d.querySelector('.coach-q').textContent.slice(0, 60) + '…');
    d.querySelector('.coach-opts .opt').click();
    await sleep(80);
    ok(d.getElementById('coachFb').textContent.length > 50, 'correction expliquée');
    ok(/https?:\/\//.test(d.getElementById('coachFb').innerHTML), 'source affichée dans la correction');
    ok(App.quiz().total >= 1, 'réponse comptabilisée', App.quiz().correct + '/' + App.quiz().total);
    d.getElementById('coachOk').click();
  } else {
    ok(false, 'aucune question du coach sur 60 bougies');
  }

  console.log('\n9. Autres écrans');
  for (const s of ['journal', 'coach', 'library', 'campaign', 'home']) {
    d.querySelector('#nav button[data-go="' + s + '"]').click();
    await sleep(120);
    ok(d.querySelector('[data-screen="' + s + '"]').classList.contains('on'), 'écran « ' + s + ' » accessible');
  }
  ok(d.querySelector('#jTable table') !== null, 'journal : tableau des trades', d.querySelectorAll('#jTable tbody tr').length + ' ligne(s)');
  ok(d.getElementById('masteryVal').textContent !== '—', 'coach : maîtrise calculée', 'maîtrise ' + d.getElementById('masteryVal').textContent);
  ok(d.querySelectorAll('#axesHost .axis').length === 6, 'coach : six axes de compétence', d.querySelectorAll('#axesHost .axis').length + ' axes');
  const concepts = d.querySelectorAll('.concept');
  ok(concepts.length >= 20, 'bibliothèque : concepts affichés', concepts.length + ' concepts');
  ok(d.querySelectorAll('.concept .src a').length >= 20, 'bibliothèque : chaque concept a un lien de source', d.querySelectorAll('.concept .src a').length + ' liens');
  ok(d.querySelectorAll('.lesson').length === 16, 'campagne : 16 leçons', d.querySelectorAll('.lesson').length + ' leçons');
  ok(d.querySelectorAll('.lesson.locked').length === 15, 'campagne : progression verrouillée au départ', d.querySelectorAll('.lesson.locked').length + ' verrouillées');

  console.log('\n10. Bilan de session');
  d.querySelector('#nav button[data-go="home"]').click();
  d.getElementById('quickStart').click();
  await sleep(200);
  App.state.session.push({ pnl: 1, quad: 'good-win' });
  d.getElementById('endBtn').click();
  await sleep(200);
  ok(d.getElementById('modalRoot').classList.contains('on') && /Bilan de session/.test(d.getElementById('modalRoot').textContent),
    'bilan de session affiché');
  ok(/bonne décision, perte/i.test(d.getElementById('modalRoot').textContent), 'bilan sépare décision et résultat');
  d.getElementById('go').click();

  console.log('\n11. Placement d\'ordre directement sur le graphique');
  d.querySelector('#nav button[data-go="home"]').click();
  d.getElementById('quickStart').click();
  await sleep(300);
  const ch = App.state.chart;
  ok(ch.mode === 'draft', 'mode apprentissage : placement graphique actif');
  const mk = App.state.market, inst = mk.inst;
  const target = mk.mid - (App.state.ctx ? App.state.ctx.a * 2 : 30);
  const r = ch._range;
  const y = ch.pad.t + (r.hi - target) / (r.hi - r.lo) * ch.plotH;
  ch.cv.dispatchEvent(new w.MouseEvent('mousedown', { clientX: 450, clientY: y, bubbles: true }));
  w.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  await sleep(60);
  ok(!!ch.draft && Math.abs(ch.draft.entry - target) < inst.spread * 2, 'entrée définie au clic',
    ch.draft ? 'cible ' + target.toFixed(2) + ' → entrée ' + ch.draft.entry.toFixed(2) : 'aucun brouillon');
  ok(ch.draft && ch.draft.sl < ch.draft.entry && ch.draft.tp > ch.draft.entry, 'stop et cible proposés automatiquement');
  const before2 = App.state.broker.positions.length;
  d.getElementById('sendBuy').click();
  await sleep(80);
  ok(App.state.broker.positions.length === before2, 'entrée sous le marché : pas d\'exécution immédiate');
  ok(App.state.broker.orders.length === 1 && App.state.broker.orders[0].kind === 'limit',
    'ordre converti en ordre à cours limité', App.state.broker.orders.length + ' ordre(s) en attente');
  ok(/cours limité/.test(d.body.textContent), 'l\'utilisateur est informé de la conversion');

  console.log('\n12. Échelles du graphique');
  {
    const ch = App.state.chart;
    ch.render();
    const r = ch._range;
    ok(r.lo < r.hi && isFinite(r.lo) && isFinite(r.hi), 'échelle de prix finie', r.lo.toFixed(2) + ' → ' + r.hi.toFixed(2));
    const p0 = ch.pOf(300);
    ok(Math.abs(ch.yOf(p0) - 300) < 0.001, 'yOf et pOf sont inverses', 'y=' + ch.yOf(p0).toFixed(4));
    const cs = ch._cs;
    ok(cs.length > 20 && cs.length <= ch.visible, 'fenêtre de bougies bornée', cs.length + ' bougies pour ' + ch.visible + ' visibles');
    const ys = cs.map(c => ch.yOf(c.c));
    ok(ys.every(y => y >= ch.pad.t - 1 && y <= ch.h - ch.pad.b + 1), 'toutes les clôtures dans la zone de tracé',
      'min ' + Math.min(...ys).toFixed(1) + ' / max ' + Math.max(...ys).toFixed(1));
    ok(cs.every((c, i) => i === 0 || c.t > cs[i - 1].t), 'bougies en ordre chronologique');
    const last = cs[cs.length - 1];
    ok(last.t <= App.state.market.now(), 'aucune bougie future affichée',
      'dernière bougie ' + new Date(last.t).toISOString().slice(5, 16) + ' ≤ marché ' + new Date(App.state.market.now()).toISOString().slice(5, 16));
    const before = cs.length;
    ch.visible = 40; ch.render();
    ok(ch._cs.length <= 40, 'zoom fonctionnel', before + ' → ' + ch._cs.length + ' bougies');
    ch.visible = 110; ch.offset = 30; ch.render();
    ok(ch._cs[ch._cs.length - 1].t < cs[cs.length - 1].t, 'pan vers le passé fonctionnel');
    ch.offset = 0; ch.render();
  }

  console.log('\n13. Mode défi');
  d.querySelector('#nav button[data-go="home"]').click();
  await sleep(120);
  d.querySelector('[data-mode="challenge"]').click();
  await sleep(250);
  ok(d.getElementById('modalRoot').classList.contains('on') && /Mode défi/.test(d.getElementById('modalRoot').textContent),
    'un objectif de défi est tiré au lancement', d.querySelector('#modalRoot .modal-h .h2') ? d.querySelector('#modalRoot .modal-h .h2').textContent : '');
  d.querySelector('#modalRoot [data-close]').click();
  await sleep(120);
  ok(/objectif/i.test(d.getElementById('modeChip').textContent), 'objectif rappelé pendant la session',
    d.getElementById('modeChip').textContent.trim().replace(/\s+/g, ' ').slice(0, 70));
  d.getElementById('endBtn').click();
  await sleep(200);
  ok(/Défi réussi|Défi non atteint/.test(d.getElementById('modalRoot').textContent), 'bilan du défi affiché');
  ok(d.querySelectorAll('#modalRoot .crit').length >= 1, 'critères du défi détaillés', d.querySelectorAll('#modalRoot .crit').length + ' critère(s)');
  d.getElementById('done').click();

  console.log('\n14. Tactile (téléphone)');
  {
    const ch = App.state.chart;
    ok(ch.cv.style.touchAction === 'none', 'le geste ne fait pas défiler la page', 'touch-action: ' + ch.cv.style.touchAction);
    const touch = (type, pts, target) => {
      const e = new w.Event(type, { bubbles: true, cancelable: true });
      e.touches = pts; e.changedTouches = pts;
      (target || ch.cv).dispatchEvent(e);
    };
    const P = (x, y) => ({ clientX: x, clientY: y });

    /* placement d'une entrée au doigt */
    ch.mode = 'draft'; ch.draft = null;
    touch('touchstart', [P(450, 200)]);
    touch('touchend', []);
    ok(!!ch.draft && isFinite(ch.draft.entry), 'entrée placée au toucher',
      ch.draft ? 'entrée ' + ch.draft.entry.toFixed(2) : 'aucun brouillon');

    /* déplacement du stop au doigt */
    const ySl = ch.yOf(ch.draft.sl);
    touch('touchstart', [P(450, ySl)]);
    ok(ch.dragTarget === 'sl', 'poignée de stop saisie au toucher', String(ch.dragTarget));
    touch('touchmove', [P(450, ySl + 40)]);
    touch('touchend', []);
    ok(ch.dragTarget === null, 'relâchement du doigt géré');

    /* panoramique : glisser vers la droite révèle l'historique */
    ch.mode = 'idle'; ch.offset = 0;
    touch('touchstart', [P(300, 200)]);
    touch('touchmove', [P(400, 200)]);
    touch('touchmove', [P(520, 200)]);
    touch('touchend', []);
    ok(ch.offset > 0, 'panoramique au doigt', 'décalage de ' + ch.offset + ' bougies');
    const off1 = ch.offset;
    touch('touchstart', [P(520, 200)]);
    touch('touchmove', [P(300, 200)]);
    touch('touchend', []);
    ok(ch.offset < off1, 'panoramique dans l\'autre sens', off1 + ' → ' + ch.offset);

    /* pincement */
    ch.offset = 0;
    const v0 = ch.visible;
    touch('touchstart', [P(300, 200), P(500, 200)]);
    touch('touchmove', [P(340, 200), P(460, 200)]);
    touch('touchend', []);
    ok(ch.visible > v0, 'zoom au pincement', v0 + ' → ' + ch.visible + ' bougies');
  }

  console.log('\n15. Installation comme application');
  {
    const fs = require('fs'), pth = require('path');
    const root = pth.join(__dirname, '..');
    const man = JSON.parse(fs.readFileSync(pth.join(root, 'manifest.webmanifest'), 'utf8'));
    ok(man.display === 'standalone' && man.start_url === './index.html', 'manifest installable', man.display + ' · ' + man.start_url);
    ok(man.background_color === '#07080A' && man.theme_color === '#07080A', 'couleurs de lancement cohérentes avec le thème');
    ok((man.icons || []).length >= 3, 'icônes déclarées', man.icons.length + ' icônes');
    const html = fs.readFileSync(pth.join(root, 'index.html'), 'utf8');
    ok(/rel="manifest"/.test(html) && /apple-touch-icon/.test(html) && /theme-color/.test(html), 'liens PWA présents dans le head');
    ok(/viewport-fit=cover/.test(html), 'encoche et barre système prises en compte');
    ok(fs.existsSync(pth.join(root, 'sw.js')), 'service worker présent (fonctionnement hors ligne)');

    const pngSize = f => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
    for (const [f, want] of [['icons/icon-192.png', 192], ['icons/icon-512.png', 512], ['icons/icon-maskable-512.png', 512], ['icons/icon-180.png', 180], ['icons/favicon-32.png', 32], ['icons/icon-1024.png', 1024]]) {
      const full = pth.join(root, f);
      if (!fs.existsSync(full)) { ok(false, f + ' existe'); continue; }
      const s = pngSize(full);
      ok(s[0] === want && s[1] === want, f + ' aux bonnes dimensions', s[0] + '×' + s[1]);
    }

    /* mise en page mobile */
    const css = fs.readFileSync(pth.join(root, 'css', 'app.css'), 'utf8');
    ok(/@media \(max-width: 900px\)/.test(css), 'point de rupture mobile présent');
    const mob = css.slice(css.indexOf('@media (max-width: 900px)'));
    ok(/\.rail \{[\s\S]{0,220}position: fixed/.test(mob), 'la barre latérale devient une barre d\'onglets en bas');
    ok(/\.session \{ grid-template-columns: 1fr;/.test(mob), 'la session s\'empile : graphique au-dessus, dock en dessous');
    ok(/--tabbar: calc\(58px \+ env\(safe-area-inset-bottom/.test(mob), 'zone sûre iOS/Android respectée');
    ok(/\.modal \{[\s\S]{0,140}bottom: 0/.test(mob), 'modales en feuille basse');
    ok(/input, select, textarea \{ font-size: 16px/.test(mob), 'pas de zoom iOS à la saisie');
  }

  console.log(failures === 0 ? '\n✔ Interface de bout en bout : tout passe.\n' : `\n✘ ${failures} échec(s).\n`);
  dom.window.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('\nERREUR FATALE\n', e); process.exit(1); });
