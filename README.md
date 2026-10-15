# Nova Terminal

Un jeu de trading éducatif : marché simulé crédible, compte virtuel, et un coach qui évalue la
**qualité de vos décisions séparément de leur résultat**.

Aucune notion pédagogique n'est inventée : chaque concept renvoie à une source réelle et vérifiable
(régulateur, publication académique, institution). Voir `js/sources.js` et le tableau ci-dessous.

---

## Lancer

Le projet est en HTML/CSS/JS pur, sans dépendance ni étape de build.

```bash
cd nova-trading
python3 -m http.server 4173 --bind 0.0.0.0
# → http://localhost:4173
```

Ouvrir `index.html` directement fonctionne aussi (le projet n'utilise pas de modules ES).
Sur téléphone, ouvrir la même adresse depuis le réseau local, puis
« Ajouter à l'écran d'accueil » : l'application s'installe avec son icône et fonctionne hors ligne.

## Téléphone

La mise en page change de nature sous 900 px de large — ce n'est pas une simple réduction :

- la barre latérale devient une **barre d'onglets en bas**, avec `env(safe-area-inset-bottom)`
  pour ne pas passer sous la barre gestuelle iOS/Android ;
- la session s'empile : le graphique garde le haut de l'écran (hauteur en `dvh`, donc stable quand
  la barre d'URL se replie), le dock défile en dessous ;
- la barre supérieure se déplie sur trois lignes, le sélecteur d'unité de temps défile
  horizontalement au doigt ;
- les modales s'ouvrent en **feuille basse**, les champs passent à 16 px (sinon iOS zoome à la saisie) ;
- le graphique se pilote au doigt : glisser pour parcourir l'historique, **pincer pour zoomer**,
  tapoter pour placer une entrée, faire glisser la poignée pour déplacer le stop ;
- `prefers-reduced-motion` coupe les animations pour qui le demande.

## Icône et installation

L'icône est une tuile sombre, trois chandeliers et une flèche ascendante — sobre, lisible à 32 px.
`icons/build.py` la régénère à toutes les tailles depuis `icons/icon-source.png` :

```bash
python3 icons/build.py
```

`icon-1024/512/192` ont des coins arrondis et un fond transparent ; `icon-180` (iOS) et
`icon-maskable-512` (Android) sont plein cadre et opaques, les plateformes appliquant leur propre
masque. `manifest.webmanifest` déclare le mode `standalone`, les couleurs de lancement assorties au
thème et trois raccourcis (session, campagne, bibliothèque). `sw.js` met le shell en cache : réseau
d'abord, cache en secours, jamais de version périmée quand le réseau répond.

## Tester

```bash
node test/engine.test.mjs   # moteur : marché, indicateurs, compte, exécution, sources
node test/ui.test.cjs       # interface de bout en bout, 99 assertions (nécessite jsdom)
```

`test/ui.test.cjs` a besoin de jsdom :

```bash
mkdir -p .domtest && cd .domtest && npm init -y && npm install jsdom
```

---

## Ce que fait le jeu

**Marché simulé.** Dérive par régime (tendance haussière / baissière, range, chop, forte et faible
volatilité), regroupement de volatilité de type ARCH, saisonnalité intraday, macro-tendance lente,
pullbacks, accélérations et sweeps de liquidité (faux breakouts). La génération est strictement
forward : aucune bougie future n'existe, jamais. Calibration mesurée :

| Instrument | vol. quotidienne réalisée | \|Δ 1 jour\| médian | \|Δ 1 jour\| p95 |
|---|---|---|---|
| NEO-EU (indice) | 1,25 % | 1,02 % | 3,64 % |
| XAU/EUR (or) | 1,03 % | 0,84 % | 3,01 % |
| BTC/EUR | 3,46 % | 2,80 % | 10,40 % |

Rendements à queues épaisses (kurtosis ≈ 6,5) et autocorrélation des carrés de rendements ≈ 0,28,
conformément à Mandelbrot (1963) et Engle (1982).

**Compte.** 10 000 € virtuels, spread bid/ask réel, commission en points de base, slippage dépendant
de la volatilité, marge et levier plafonnés selon les mesures ESMA 2018 (20:1 indices et or, 2:1 crypto),
clôture automatique à 50 % de la marge.

**Ordres.** Marché, limite, stop. Un ordre tracé sur le graphique devient automatiquement limite ou
stop selon sa position par rapport au marché, comme sur une plateforme réelle.

**Quatre modes.** Apprentissage (assistance complète), Défi (objectif tiré au sort), Libre (aucune
assistance), Campagne (16 leçons, Débutant → Expert, déblocage progressif).

**Coach.** Il interroge au bon moment (niveau touché, cassure, compression, emballement de l'ATR,
repli sur moyenne, absence de setup, sizing, série de pertes, position gagnante), puis corrige avec
la source. Après chaque trade, un débrief calcule un score de décision sur six critères et classe le
trade dans un quadrant : bonne décision / gain, bonne décision / perte, mauvaise décision / gain,
mauvaise décision / perte.

**Analyse comportementale.** Huit dérives détectées objectivement : stops élargis, escalade du risque
après une perte, gains coupés trop tôt, pertes laissées courir, surtrading, entrées sans motif,
R:R trop faible, re-trade immédiat après une perte. Chacune génère un exercice ciblé.

**Progression.** Six axes (analyse, discipline, gestion du risque, connaissance, constance,
performance). La performance ne pèse que 15 % : un compte qui monte en prenant des risques
déraisonnables ne fait pas progresser.

---

## Sources utilisées

| Clé | Référence | Ce qu'elle établit |
|---|---|---|
| `amf2014` | AMF (2014), *Étude des résultats des investisseurs particuliers sur le trading de CFD et de Forex en France* | 14 799 clients suivis 4 ans : > 89 % perdants, −10 887 € en moyenne, aucun effet d'apprentissage |
| `esma2018` | ESMA (2018), mesures d'intervention sur les CFD | 74 à 89 % de comptes de particuliers perdants, pertes de 1 600 € à 29 000 € |
| `esma_detail` | ESMA (2018), ESMA35-43-1000 | Plafonds de levier par sous-jacent, clôture à 50 % de la marge |
| `sec_orders` | SEC / Investor.gov, *Types of Orders* | Définitions officielles des ordres marché, limite et stop |
| `sec_stop` | SEC / Investor.gov, *Stop, Stop-Limit and Trailing Stop Orders* | Le prix stop n'est pas un prix d'exécution garanti |
| `sec_trading101` | SEC, *Trading 101* | Le dernier prix échangé n'est pas le prix d'exécution |
| `lo2000` | Lo, Mamaysky & Wang (2000), *Journal of Finance* 55(4) | Certaines figures graphiques apportent une information incrémentale — sans garantir de profit net |
| `park2007` | Park & Irwin (2007), *Journal of Economic Surveys* 21(4) | 56 études positives sur 95, mais data snooping et coûts mal estimés |
| `marshall2006` | Marshall, Young & Rose (2006), *Journal of Banking & Finance* 30(8) | Aucune valeur créée par les figures en chandeliers sur le Dow Jones après coûts |
| `mandelbrot1963` | Mandelbrot (1963), *Journal of Business* 36(4) | Regroupement de la volatilité, queues épaisses |
| `engle1982` | Engle (1982), *Econometrica* 50(4) | Modèle ARCH : la volatilité est prévisible à court terme |
| `kahneman1979` | Kahneman & Tversky (1979), *Econometrica* 47(2) | Aversion aux pertes, recherche de risque dans le domaine des pertes |
| `shefrin1985` | Shefrin & Statman (1985), *Journal of Finance* 40(3) | Effet de disposition : vendre ses gains trop tôt, garder ses pertes |
| `odean1998` | Odean (1998), *Journal of Finance* 53(5) | Mesure de l'effet de disposition sur 10 000 comptes : le biais coûte de l'argent |
| `barber2000` | Barber & Odean (2000), *Journal of Finance* 55(2) | 11,4 %/an pour les plus actifs contre 18,5 % pour les moins actifs |
| `odean1999` | Odean (1999), *American Economic Review* 89(5) | Les titres achetés sous-performent ceux vendus, avant coûts |
| `kelly1956` | Kelly (1956), *Bell System Technical Journal* 35 | f\* = p − q/b ; sur-miser réduit la croissance de long terme |
| `gambler` | Problème de la ruine du joueur (Feller) | R ≈ exp(−2μB/σ²) : la ruine décroît exponentiellement avec le capital en unités de risque |
| `thorndike` | Espérance mathématique | E[R] = Σ pᵢ·rᵢ ; l'espérance n'est lisible que sur un grand échantillon |

### Niveau de preuve affiché dans le jeu

Chaque carte porte un badge : **Établi** (régulateur ou résultat répliqué), **Biais documenté**
(mesuré en laboratoire et sur données réelles), **Débattu** (preuves limitées ou contradictoires),
**Usage pro** (convention de métier non démontrée — c'est le cas de la règle des 1 à 2 % de risque),
**Mythe** (croyance contredite par les données).

---

## Avertissement

Outil pédagogique. Les prix sont simulés. Le trading à effet de levier expose à un risque de perte
élevé : plus de 89 % des clients particuliers suivis par l'AMF étaient perdants sur quatre ans.
Rien ici ne constitue un conseil en investissement.

## Structure

```
index.html          structure des écrans
css/app.css         système de design
js/sources.js       registre des sources (URL réelles)
js/curriculum.js    concepts, 16 leçons, 7 défis, exercices correctifs
js/market.js        moteur de marché
js/indicators.js    ATR, RSI, EMA, pivots, zones, structure, contexte
js/broker.js        compte, ordres, coûts, marge, journalisation
js/chart.js         rendu canvas des chandeliers
js/stats.js         métriques, détection des dérives, axes de compétence
js/coach.js         questions, photographie du contexte, débrief
js/ui.js            écrans, journal, bibliothèque, coach
js/app.js           boucle de jeu et ticket d'ordre
manifest.webmanifest  installation (mode standalone, icônes, raccourcis)
sw.js               service worker : réseau d'abord, cache en secours
icons/              icônes 1024/512/192/180/32 + maskable + build.py
test/               tests moteur et interface
```
