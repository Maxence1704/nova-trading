/* ============================================================
   BIBLIOTHÈQUE PÉDAGOGIQUE — Nova Terminal
   Concept → explication → source. Chaque notion cite SOURCES.
   ============================================================ */

window.CONCEPTS = [

  /* ================= ANALYSE DU MARCHÉ ================= */
  {
    id: "tendance", cat: "analyse", level: 1, evidence: "debat",
    title: "Tendance",
    short: "Une succession de sommets et de creux plus hauts (haussière) ou plus bas (baissière).",
    body: "Une tendance n'est pas une ligne : c'est une structure de sommets et de creux. On l'objective avec des pivots (plus hauts / plus bas locaux) ou avec la pente d'une moyenne mobile. Un mouvement n'est qualifié de tendanciel que s'il persiste plus longtemps que le bruit environnant.",
    keys: ["Sommets et creux croissants = tendance haussière", "La tendance se lit sur plusieurs unités de temps", "Une moyenne mobile lisse le bruit mais retarde"],
    trap: "Une moyenne mobile qui monte ne prouve pas une tendance exploitable : Lo, Mamaysky & Wang (2000) montrent une information incrémentale, mais pas de profit garanti après coûts.",
    sources: ["lo2000", "park2007"]
  },
  {
    id: "range", cat: "analyse", level: 1, evidence: "etabli",
    title: "Range et retour à la moyenne",
    short: "Le prix oscille entre un support et une résistance sans direction nette.",
    body: "En range, la meilleure hypothèse de travail est le retour vers le centre de l'intervalle, et la pire est la recherche de cassure. Identifier un range se fait objectivement : amplitude compressée, pivots qui se répètent au même niveau, moyennes mobiles plates et enchevêtrées.",
    keys: ["En range, acheter près du support et vendre près de la résistance", "Une moyenne mobile plate signale l'absence de tendance", "Un range se termine toujours : par une cassure ou par un élargissement"],
    sources: ["lo2000"]
  },
  {
    id: "volatilite", cat: "analyse", level: 1, evidence: "etabli",
    title: "Volatilité et regroupement",
    short: "La volatilité se regroupe : les fortes variations en appellent d'autres.",
    body: "Mandelbrot (1963) a établi que les grandes variations tendent à être suivies de grandes variations, et Engle (1982) l'a formalisé avec le modèle ARCH. Conséquence pratique majeure : la volatilité est bien plus prévisible à court terme que le sens du prix. C'est pour cela qu'un stop se dimensionne avec l'ATR et non avec un nombre de points arbitraire.",
    keys: ["La volatilité se mesure (ATR, écart-type des rendements)", "Elle alterne phases calmes et phases agitées", "Une compression précède souvent une expansion"],
    sources: ["mandelbrot1963", "engle1982"]
  },
  {
    id: "support", cat: "analyse", level: 2, evidence: "debat",
    title: "Supports et résistances",
    short: "Niveaux où l'offre et la demande se sont déjà manifestées.",
    body: "Un niveau devient significatif lorsqu'il a été testé plusieurs fois, et sa force tient davantage à une zone qu'à un prix exact. La recherche (Lo, Mamaysky & Wang, 2000) trouve qu'une partie des figures construite sur ces niveaux apporte une information incrémentale, mais sans garantie de rentabilité nette.",
    keys: ["Penser en zones, pas en prix au point près", "Plus un niveau est testé, plus il est surveillé", "Un niveau cassé tend à inverser son rôle"],
    sources: ["lo2000", "park2007"]
  },
  {
    id: "breakout", cat: "analyse", level: 2, evidence: "debat",
    title: "Cassure et faux breakout",
    short: "Une cassure n'est confirmée que par ce qui suit, jamais par le franchissement lui-même.",
    body: "Le franchissement d'un niveau est un événement, pas une preuve : une part importante des cassures est reprise rapidement (le « piège »). La seule façon honnête de traiter une cassure est probabiliste — définir avant l'entrée ce qui l'invaliderait, et où.",
    keys: ["Une cassure se juge sur la tenue du niveau, pas sur l'impulsion", "Volume et amplitude aident, mais ne garantissent rien", "Le faux breakout est un retournement classique en range"],
    trap: "« Une cassure avec beaucoup de volume fonctionne à coup sûr » n'est étayé par aucune étude ; les tests de figures sur données réelles (Marshall et al., 2006) ne dégagent pas de profit après coûts.",
    sources: ["marshall2006", "lo2000"]
  },
  {
    id: "pullback", cat: "analyse", level: 2, evidence: "debat",
    title: "Pullback et retournement",
    short: "Un repli dans une tendance est un point d'entrée ; un retournement change la structure.",
    body: "La différence se lit sur la structure : tant que les creux tiennent au-dessus du précédent, un repli reste un repli. Le retournement n'est avéré que lorsqu'un pivot est cassé, c'est-à-dire après coup — jamais pendant.",
    keys: ["Un pullback ne casse pas le dernier pivot", "Un retournement se confirme tardivement, par construction", "Anticiper un retournement, c'est prendre un risque de contre-tendance"],
    sources: ["lo2000"]
  },
  {
    id: "probabiliste", cat: "analyse", level: 3, evidence: "etabli",
    title: "Le trading est probabiliste",
    short: "Une bonne décision peut perdre, une mauvaise peut gagner.",
    body: "Sur un tirage, le résultat est dominé par le hasard ; c'est l'espérance cumulée sur de nombreux tirages qui révèle la qualité d'une méthode (loi des grands nombres). Évaluer une décision sur son résultat immédiat est une erreur statistique : c'est le biais de résultat. Le jeu sépare donc en permanence le score de décision du résultat en euros.",
    keys: ["Une perte n'invalide pas une bonne décision", "Un gain ne valide pas une mauvaise décision", "La seule mesure fiable est l'espérance sur un grand échantillon"],
    sources: ["thorndike", "park2007"]
  },
  {
    id: "couts", cat: "analyse", level: 2, evidence: "etabli",
    title: "Coûts de transaction",
    short: "Spread, commission et slippage se paient à chaque aller-retour.",
    body: "Les coûts sont un prélèvement certain, alors que l'avantage est incertain. Park & Irwin (2007) relèvent que la mauvaise estimation des coûts de transaction est l'un des principaux défauts des études concluant à la rentabilité de l'analyse technique. Plus le timeframe est court, plus les coûts pèsent lourd par rapport au mouvement capturé.",
    keys: ["Un aller-retour coûte environ 1 spread + 2 commissions + slippage", "En intraday, les coûts peuvent absorber l'essentiel du mouvement", "La SEC rappelle que le prix d'exécution n'est jamais garanti"],
    sources: ["park2007", "sec_trading101", "sec_orders"]
  },

  /* ================= EXÉCUTION ================= */
  {
    id: "ordres", cat: "execution", level: 1, evidence: "etabli",
    title: "Market, Limit, Stop",
    short: "Trois ordres, trois arbitrages différents entre certitude d'exécution et maîtrise du prix.",
    body: "L'ordre au marché garantit l'exécution, pas le prix. L'ordre à cours limité garantit le prix, pas l'exécution. L'ordre stop devient un ordre au marché dès que le prix stop est touché : il garantit le déclenchement, pas le prix obtenu.",
    keys: ["Market : je veux sortir, peu importe le prix", "Limit : je veux ce prix, tant pis si je ne suis pas servi", "Stop : je déclenche une sortie quand mon scénario est invalidé"],
    sources: ["sec_orders", "sec_stop"]
  },
  {
    id: "sl", cat: "execution", level: 1, evidence: "etabli",
    title: "Stop-loss",
    short: "Le prix auquel votre scénario est invalidé — pas celui qui vous fait le moins mal.",
    body: "Un stop se place là où votre analyse est contredite (au-delà d'un pivot, de l'autre côté d'une zone), puis la taille de position s'ajuste à cette distance. La SEC précise que le prix stop n'est pas un prix d'exécution garanti : en marché rapide, le glissement peut être significatif.",
    keys: ["D'abord le stop, ensuite la taille", "Un stop trop près du prix est détruit par le bruit", "Un stop n'est pas négociable une fois la position ouverte"],
    trap: "Déplacer un stop pour « laisser de la place » transforme un risque borné en risque non borné : c'est l'une des dérives les plus coûteuses.",
    sources: ["sec_stop", "shefrin1985"]
  },
  {
    id: "tp", cat: "execution", level: 2, evidence: "praticien",
    title: "Take-profit et ratio R:R",
    short: "Le ratio risque/rendement compare ce que vous risquez à ce que vous visez.",
    body: "Un R:R de 1:2 signifie viser deux fois le risque pris. C'est un outil de cohérence, pas une promesse : la rentabilité dépend du produit entre le taux de réussite et le gain moyen. La définition d'un objectif avant l'entrée sert surtout à éviter l'effet de disposition, bien documenté par Shefrin & Statman (1985) et Odean (1998).",
    keys: ["R = distance du stop ; le résultat se mesure en multiples de R", "Un R:R élevé avec un faible taux de réussite peut être rentable, et inversement", "Fixer la cible avant d'entrer limite les sorties impulsives"],
    sources: ["shefrin1985", "odean1998", "thorndike"]
  },
  {
    id: "gestion", cat: "execution", level: 3, evidence: "praticien",
    title: "Gérer une position",
    short: "Une position se gère avec des règles définies avant l'entrée.",
    body: "Sortie partielle, déplacement au point mort, suivi de tendance : chaque règle doit être écrite à l'avance, sinon la décision se prend sous l'effet de l'émotion du moment. L'effet de disposition (vendre trop tôt les gagnants, garder trop longtemps les perdants) est l'un des biais les mieux documentés de la finance.",
    keys: ["Écrire la règle de sortie avant d'entrer", "Déplacer un stop dans le sens du trade est acceptable, dans l'autre non", "Une sortie manuelle non prévue doit être journalisée"],
    sources: ["shefrin1985", "odean1998"]
  },

  /* ================= GESTION DU RISQUE ================= */
  {
    id: "risque_par_trade", cat: "risque", level: 1, evidence: "praticien",
    title: "Risque par trade",
    short: "Le montant maximum perdu si le stop est touché, exprimé en % du capital.",
    body: "Formule : taille = risque en euros ÷ distance entrée-stop. La règle « 1 à 2 % » est une convention professionnelle répandue, mais elle n'est pas démontrée comme optimale par la recherche : la ruine dépend conjointement de l'avantage, de la variance et du capital (problème de la ruine du joueur).",
    keys: ["Le risque en euros est fixe, la taille varie avec la distance du stop", "Réduire le risque divise la variance mais ne crée pas d'avantage", "1 % ou 2 % : convention, pas loi scientifique"],
    sources: ["gambler", "kelly1956"]
  },
  {
    id: "taille", cat: "risque", level: 2, evidence: "etabli",
    title: "Taille de position et critère de Kelly",
    short: "f* = p − q/b maximise la croissance de long terme, et le plein Kelly est trop volatil pour être utilisé tel quel.",
    body: "Kelly (1956) montre que la fraction optimale dépend de la probabilité de gain p, de la probabilité de perte q et du ratio gain/perte b. Comme p et b sont mal connus en trading, la pratique consiste à utiliser une fraction de Kelly. Miser davantage que Kelly réduit la croissance de long terme.",
    keys: ["Plus l'avantage est incertain, plus la taille doit être réduite", "Doubler Kelly peut annuler la croissance malgré un avantage réel", "La taille se déduit du risque, jamais de la conviction"],
    sources: ["kelly1956", "gambler"]
  },
  {
    id: "ruine", cat: "risque", level: 2, evidence: "etabli",
    title: "Risque de ruine",
    short: "La probabilité que le capital touche un seuil irrécupérable avant que l'avantage ne s'exprime.",
    body: "Pour une marche aléatoire à dérive positive, R ≈ exp(−2μB/σ²) : la probabilité de ruine décroît exponentiellement avec le capital exprimé en unités de risque. Autrement dit, diviser le risque par deux ne divise pas le risque de ruine par deux, il le réduit bien plus fortement.",
    keys: ["Même un avantage positif peut ruiner un compte trop engagé", "Une perte de 50 % exige +100 % pour revenir au départ", "Le risque de ruine dépend de la variance, pas seulement de l'espérance"],
    sources: ["gambler", "kelly1956"]
  },
  {
    id: "drawdown", cat: "risque", level: 1, evidence: "etabli",
    title: "Drawdown",
    short: "La baisse du capital depuis son plus haut historique.",
    body: "Le drawdown mesure la souffrance d'une stratégie, pas seulement son résultat. Un retour au point de départ exige un gain supérieur à la perte subie : −20 % demande +25 %, −50 % demande +100 %. C'est l'argument arithmétique principal en faveur d'un risque unitaire faible.",
    keys: ["Drawdown ≠ perte sur un trade", "Plus la chute est profonde, plus le retour est difficile", "Une série de petites pertes crée un drawdown réel"],
    sources: ["gambler", "thorndike"]
  },
  {
    id: "esperance", cat: "risque", level: 3, evidence: "etabli",
    title: "Espérance mathématique",
    short: "E = (taux de réussite × gain moyen) − (taux d'échec × perte moyenne).",
    body: "C'est la seule mesure qui agrège correctement vos décisions. Un taux de réussite de 35 % avec un gain moyen de 2,5 R donne une espérance positive ; un taux de 70 % avec un gain moyen de 0,4 R donne une espérance négative. Sur un petit nombre de trades, l'espérance est indiscernable du bruit.",
    keys: ["Taux de réussite seul ne veut rien dire", "L'espérance se mesure en R, pas en euros", "Il faut un grand nombre de trades pour l'estimer"],
    sources: ["thorndike", "park2007"]
  },
  {
    id: "realite_retail", cat: "risque", level: 1, evidence: "etabli",
    title: "La réalité statistique des particuliers",
    short: "89 % des clients particuliers suivis par l'AMF étaient perdants sur 4 ans.",
    body: "L'AMF (2014) a suivi 14 799 clients français : plus de 89 % sont perdants, avec un résultat moyen de −10 887 € par client, et aucun effet d'apprentissage avec la durée. L'ESMA (2018) constate 74 à 89 % de comptes perdants sur les CFD dans l'Union européenne. Ce n'est pas une fatalité morale : c'est le résultat mesuré d'un levier élevé, de coûts répétés et de biais comportementaux.",
    keys: ["Plus on trade, plus on perd en moyenne (AMF 2014)", "L'expérience seule ne suffit pas à corriger la trajectoire", "Les régulateurs ont plafonné le levier en conséquence"],
    sources: ["amf2014", "esma2018", "esma_detail"]
  },

  /* ================= PSYCHOLOGIE ================= */
  {
    id: "disposition", cat: "psy", level: 1, evidence: "biais",
    title: "Effet de disposition",
    short: "Vendre trop tôt ses gains, garder trop longtemps ses pertes.",
    body: "Shefrin & Statman (1985) ont nommé et démontré ce biais ; Odean (1998) a mesuré sur 10 000 comptes que les investisseurs réalisent leurs gains bien plus vite que leurs pertes, et que les titres vendés surperforment ensuite ceux conservés. Le biais coûte donc réellement de l'argent.",
    keys: ["Symptôme : R moyen des gagnants inférieur au R planifié", "Cause : aversion aux pertes et recherche de confirmation", "Contre-mesure : règle de sortie écrite avant l'entrée"],
    sources: ["shefrin1985", "odean1998", "kahneman1979"]
  },
  {
    id: "aversion", cat: "psy", level: 1, evidence: "biais",
    title: "Aversion aux pertes",
    short: "Une perte fait plus mal que le plaisir d'un gain équivalent.",
    body: "La théorie des perspectives (Kahneman & Tversky, 1979) établit que les décisions sont prises par rapport à un point de référence, avec une aversion au risque dans le domaine des gains et une recherche de risque dans celui des pertes. C'est le mécanisme qui fait déplacer un stop plutôt que l'accepter.",
    keys: ["Le point de référence est souvent le prix d'entrée", "Dans une perte, on devient joueur : on laisse courir", "Dans un gain, on devient prudent : on encaisse trop vite"],
    sources: ["kahneman1979", "shefrin1985"]
  },
  {
    id: "surtrading", cat: "psy", level: 2, evidence: "biais",
    title: "Surtrading et surconfiance",
    short: "Plus on trade, moins on gagne en moyenne.",
    body: "Barber & Odean (2000) : sur 66 465 foyers, les plus actifs obtiennent 11,4 %/an net contre 18,5 % pour les moins actifs. Odean (1999) montre que les titres achetés sous-performent ceux vendus, même avant coûts. L'AMF observe la même chose en France : ceux qui traitent le plus perdent le plus.",
    keys: ["L'activité crée un coût certain contre un avantage incertain", "Le signal à surveiller : trader sans setup identifié", "Ne rien faire est une décision de trading légitime"],
    sources: ["barber2000", "odean1999", "amf2014"]
  },
  {
    id: "fomo", cat: "psy", level: 1, evidence: "biais",
    title: "FOMO et revenge trading",
    short: "Entrer parce que le prix part, ou re-trader pour récupérer une perte.",
    body: "Ces comportements relèvent de la recherche de risque dans le domaine des pertes décrite par Kahneman & Tversky (1979) : pour éviter d'acter une perte, on augmente l'engagement. Ils sont mesurables objectivement dans un journal : délai très court après une perte, risque augmenté, entrée sans setup.",
    keys: ["Mesurable : trade ouvert juste après une perte", "Mesurable : risque supérieur au précédent après une perte", "Contre-mesure : règle de pause obligatoire après 2 pertes"],
    sources: ["kahneman1979", "barber2000"]
  },
  {
    id: "mythe_prediction", cat: "psy", level: 2, evidence: "mythe",
    title: "« Il faut prédire le marché »",
    short: "Non. Il faut un avantage, un risque borné et de la répétition.",
    body: "Park & Irwin (2007) : sur 95 études modernes, 56 concluent à une rentabilité, mais la majorité souffre de data snooping et d'une mauvaise prise en compte des coûts. Marshall et al. (2006) ne trouvent aucune valeur créée par les figures en chandeliers sur le Dow Jones. La compétence démontrable n'est pas la prédiction : c'est la gestion du risque et la discipline d'exécution.",
    keys: ["Personne ne prédit chaque mouvement", "La répétabilité vaut mieux que la précision", "Une méthode avec un léger avantage et un risque faible bat une prédiction brillante et irrégulière"],
    sources: ["park2007", "marshall2006", "amf2014"]
  }
];

/* ---------- CAMPAGNE ---------- */
window.LESSONS = [
  /* ---- Chapitre 1 : Débutant ---- */
  { id:"c1l1", chapter:1, name:"Lire un chandelier", focus:"analyse", concept:"tendance",
    brief:"Un chandelier résume 4 prix : ouverture, plus haut, plus bas, clôture. Apprenez à lire ce qu'il raconte.",
    task:"Répondez aux questions de lecture posées par le coach.",
    pass:{ correct:3, min:3 }, tf:"15m", assist:2 },
  { id:"c1l2", chapter:1, name:"Identifier la tendance", focus:"analyse", concept:"tendance",
    brief:"Observez la structure des sommets et des creux.",
    task:"Identifiez correctement la structure de marché 3 fois.",
    pass:{ correct:3, min:3 }, tf:"15m", assist:2 },
  { id:"c1l3", chapter:1, name:"Le premier trade", focus:"execution", concept:"ordres",
    brief:"Ouvrez une position avec un stop, en risquant exactement 1 % du capital.",
    task:"1 trade, risque ≤ 1 %, stop défini.",
    pass:{ trades:1, maxRisk:1.0 }, tf:"15m", assist:2 },
  { id:"c1l4", chapter:1, name:"Accepter la perte", focus:"psy", concept:"probabiliste",
    brief:"Vous allez perdre. Le but n'est pas d'éviter la perte, mais de la borner.",
    task:"Terminez 3 trades sans jamais dépasser 1,2 R de perte.",
    pass:{ trades:3, maxLossR:1.25 }, tf:"15m", assist:1 },

  /* ---- Chapitre 2 : Intermédiaire ---- */
  { id:"c2l1", chapter:2, name:"Range et niveaux", focus:"analyse", concept:"range",
    brief:"En range, on achète le support et on vend la résistance. Encore faut-il les voir.",
    task:"Identifiez 3 situations de range ou de niveau.",
    pass:{ correct:3, min:3 }, tf:"15m", assist:1 },
  { id:"c2l2", chapter:2, name:"Dimensionner avec l'ATR", focus:"risque", concept:"volatilite",
    brief:"Un stop se place au-delà du bruit, pas au point près.",
    task:"3 trades dont la distance de stop est comprise entre 1 et 3 ATR.",
    pass:{ trades:3, stopAtr:[0.8,3.5] }, tf:"15m", assist:1 },
  { id:"c2l3", chapter:2, name:"Ratio risque/rendement", focus:"execution", concept:"tp",
    brief:"Définissez votre cible avant d'entrer.",
    task:"3 trades avec un R:R planifié d'au moins 1,5.",
    pass:{ trades:3, minRR:1.5 }, tf:"15m", assist:1 },
  { id:"c2l4", chapter:2, name:"Cassure ou piège ?", focus:"analyse", concept:"breakout",
    brief:"Le franchissement d'un niveau n'est pas une confirmation.",
    task:"Répondez correctement à 3 questions sur les cassures.",
    pass:{ correct:3, min:3 }, tf:"1h", assist:1 },

  /* ---- Chapitre 3 : Avancé ---- */
  { id:"c3l1", chapter:3, name:"L'espérance avant le résultat", focus:"risque", concept:"esperance",
    brief:"20 trades, un risque constant, aucune exception.",
    task:"20 trades avec un écart-type de risque ≤ 0,2 %.",
    pass:{ trades:20, riskStd:0.2 }, tf:"15m", assist:0 },
  { id:"c3l2", chapter:3, name:"Vaincre l'effet de disposition", focus:"psy", concept:"disposition",
    brief:"Laissez vos gagnants aller à leur cible.",
    task:"Sur 10 trades, aucun gain clôturé en dessous de 0,8 R planifié.",
    pass:{ trades:10, earlyCutMax:0 }, tf:"1h", assist:0 },
  { id:"c3l3", chapter:3, name:"Ne rien faire", focus:"psy", concept:"surtrading",
    brief:"Le marché n'offre pas toujours une opportunité.",
    task:"Sur 120 bougies, 3 trades maximum, tous avec un setup déclaré.",
    pass:{ maxTrades:3, bars:120, needSetup:true }, tf:"15m", assist:0 },
  { id:"c3l4", chapter:3, name:"Faux breakout", focus:"analyse", concept:"breakout",
    brief:"Identifiez le piège avant d'entrer.",
    task:"4 bonnes réponses sur des situations de cassure.",
    pass:{ correct:4, min:4 }, tf:"1h", assist:0 },

  /* ---- Chapitre 4 : Expert ---- */
  { id:"c4l1", chapter:4, name:"Autonomie complète", focus:"analyse", concept:"probabiliste",
    brief:"Aucune assistance. Analyse libre, risque 1 %.",
    task:"15 trades, score de décision moyen ≥ 65.",
    pass:{ trades:15, minScore:65, maxRisk:1.0 }, tf:"15m", assist:0 },
  { id:"c4l2", chapter:4, name:"Discipline sous pression", focus:"psy", concept:"fomo",
    brief:"Après une série de pertes, la tentation est de doubler la mise.",
    task:"10 trades sans jamais augmenter le risque après une perte.",
    pass:{ trades:10, noRiskEscalation:true, maxRisk:1.0 }, tf:"15m", assist:0 },
  { id:"c4l3", chapter:4, name:"Espérance positive", focus:"risque", concept:"esperance",
    brief:"30 trades. L'espérance par trade doit être positive.",
    task:"30 trades, espérance ≥ +0,05 R, drawdown ≤ 12 %.",
    pass:{ trades:30, minExpectancyR:0.05, maxDD:12, maxRisk:1.0 }, tf:"1h", assist:0 },
  { id:"c4l4", chapter:4, name:"Unité de temps supérieure", focus:"analyse", concept:"tendance",
    brief:"Une tendance en 15 minutes n'est souvent qu'un repli en 4 heures. Changez d'échelle : les mêmes règles, plus de patience.",
    task:"8 trades en 1 h, score de décision moyen ≥ 60, aucun stop élargi.",
    pass:{ trades:8, minScore:60, noStopMove:true, maxRisk:1.0 }, tf:"1h", assist:0 }
];

/* ---------- MODE DÉFI : objectifs courts ---------- */
window.CHALLENGES = [
  { id:"ch_trend", name:"Identifier la tendance", focus:"analyse", concept:"tendance", tf:"15m",
    brief:"La structure des sommets et des creux avant toute décision.",
    task:"Répondez correctement à 3 questions de structure posées par le coach.",
    pass:{ correct:3 } },
  { id:"ch_break", name:"Trouver la cassure", focus:"analyse", concept:"breakout", tf:"15m",
    brief:"Une cassure n'est confirmée que par ce qui la suit.",
    task:"2 trades avec un R:R planifié d'au moins 1,5.",
    pass:{ trades:2, minRR:1.5 } },
  { id:"ch_risk", name:"Risque maximum 1 %", focus:"risque", concept:"risque_par_trade", tf:"15m",
    brief:"Le risque est constant : c'est le stop qui commande la taille.",
    task:"6 trades à risque ≤ 1 %, aucun stop élargi après l'entrée.",
    pass:{ trades:6, maxRisk:1.0, noStopMove:true } },
  { id:"ch_stop", name:"Déterminer où placer le stop", focus:"execution", concept:"sl", tf:"15m",
    brief:"Au-delà du bruit, pas au point près.",
    task:"5 trades dont la distance de stop est comprise entre 0,8 et 3 ATR.",
    pass:{ trades:5, stopAtr:[0.8, 3] } },
  { id:"ch_manage", name:"Gérer une position gagnante", focus:"psy", concept:"disposition", tf:"15m",
    brief:"La cible a été fixée avant l'entrée : c'est elle qui décide.",
    task:"4 trades, aucun gain clôturé sous 0,8 R de sa cible.",
    pass:{ trades:4, earlyCutMax:0 } },
  { id:"ch_patience", name:"Ne pas surtrader", focus:"psy", concept:"surtrading", tf:"15m",
    brief:"Le marché n'offre pas toujours une opportunité.",
    task:"Sur 150 bougies : 4 trades au maximum.",
    pass:{ maxTrades:4, bars:150 } },
  { id:"ch_expect", name:"Espérance avant résultat", focus:"risque", concept:"esperance", tf:"1h",
    brief:"Seule l'espérance cumulée juge une méthode.",
    task:"12 trades, espérance ≥ +0,05 R, drawdown ≤ 10 %.",
    pass:{ trades:12, minExpectancyR:0.05, maxDD:10 } }
];

/* ---------- EXERCICES CORRECTIFS (générés par l'analyse comportementale) ---------- */
window.DRILLS = {
  stopMoved: {
    title: "Le stop ne se négocie pas",
    text: "Vous avez élargi votre stop après l'entrée. Un stop déplacé contre vous transforme un risque borné en risque non borné : c'est le mécanisme décrit par Kahneman & Tversky (1979) dans le domaine des pertes.",
    rule: "10 trades. Interdiction de déplacer un stop en défaveur. Si le stop est touché, la perte est acceptée telle quelle.",
    sources: ["kahneman1979", "sec_stop"]
  },
  riskEscalation: {
    title: "Le risque est constant",
    text: "Augmenter la taille après une perte est la signature du revenge trading. Kelly (1956) montre que sur-miser réduit la croissance de long terme même avec un avantage réel.",
    rule: "15 trades à risque strictement constant. La taille ne dépend que de la distance du stop.",
    sources: ["kelly1956", "kahneman1979"]
  },
  earlyCut: {
    title: "Laisser courir les gagnants",
    text: "Vos gains sont clôturés bien avant leur cible : c'est l'effet de disposition, mesuré par Odean (1998) sur 10 000 comptes.",
    rule: "10 trades. Aucune sortie manuelle avant 0,8 R de gain ; la cible ou le stop décide.",
    sources: ["odean1998", "shefrin1985"]
  },
  lateCut: {
    title: "Couper la perte au niveau prévu",
    text: "Vos pertes dépassent systématiquement 1 R : le stop est ignoré ou déplacé. Odean (1998) montre que conserver les perdants coûte plus que les vendre.",
    rule: "10 trades. Aucune perte supérieure à 1,15 R tolérée.",
    sources: ["odean1998", "shefrin1985"]
  },
  overtrading: {
    title: "Moins, mais mieux",
    text: "Barber & Odean (2000) : les investisseurs les plus actifs obtiennent 11,4 %/an contre 18,5 % pour les moins actifs. L'AMF observe le même lien en France.",
    rule: "Sur 150 bougies : 5 trades maximum, chacun avec un setup déclaré.",
    sources: ["barber2000", "odean1999", "amf2014"]
  },
  noSetup: {
    title: "Pas de setup, pas de trade",
    text: "Une part importante de vos entrées n'a aucune raison déclarée. Sans hypothèse falsifiable, il n'y a rien à apprendre du résultat.",
    rule: "10 trades. Chacun exige une raison écrite : structure, niveau, cassure ou pullback.",
    sources: ["park2007", "odean1999"]
  },
  rrTooLow: {
    title: "Un objectif avant d'entrer",
    text: "Vos R:R planifiés sont inférieurs à 1. Sans cible définie, l'espérance ne peut pas être positive de façon stable.",
    rule: "10 trades avec un R:R planifié ≥ 1,5, cible fixée avant l'entrée.",
    sources: ["thorndike", "shefrin1985"]
  }
};
