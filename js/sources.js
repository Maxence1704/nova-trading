/* ============================================================
   REGISTRE DES SOURCES — Nova Terminal
   Chaque notion pédagogique du jeu pointe vers une source réelle.
   Aucune notion n'est inventée : chaque carte cite au moins une entrée ici.
   ============================================================ */

window.SOURCES = {

  /* ---------- Régulateurs & institutions ---------- */

  amf2014: {
    label: "AMF (2014) — Étude des résultats des investisseurs particuliers sur le trading de CFD et de Forex en France",
    kind: "institution",
    org: "Autorité des marchés financiers",
    year: 2014,
    url: "https://www.amf-france.org/sites/institutionnel/files/contenu_simple/rapport_etude_analyse/epargne_prestataire/Etude%20des%20resultats%20des%20investisseurs%20particuliers%20sur%20le%20trading%20de%20CFD%20et%20de%20Forex%20en%20France.pdf",
    finding: "14 799 clients particuliers suivis sur 4 ans (2009-2012) : plus de 89 % sont perdants. Résultat moyen négatif de 10 887 € par client, médian de −1 843 €. Les clients qui traitent le plus perdent le plus, et aucun effet d'apprentissage n'est observé avec la durée."
  },

  esma2018: {
    label: "ESMA (2018) — Mesures d'intervention sur les CFD et options binaires",
    kind: "institution",
    org: "Autorité européenne des marchés financiers",
    year: 2018,
    url: "https://www.esma.europa.eu/press-news/esma-news/esma-agrees-prohibit-binary-options-and-restrict-cfds-protect-retail-investors",
    finding: "Les analyses des autorités nationales montrent que 74 à 89 % des comptes de particuliers perdent de l'argent sur les CFD, avec des pertes moyennes par client de 1 600 € à 29 000 €. Conséquence : plafonds de levier (30:1 devises majeures, 20:1 indices mineurs et or, 5:1 actions, 2:1 crypto), protection contre le solde négatif, avertissement de risque standardisé."
  },

  esma_detail: {
    label: "ESMA (2018) — Informations complémentaires sur les mesures d'intervention (ESMA35-43-1000)",
    kind: "institution",
    org: "Autorité européenne des marchés financiers",
    year: 2018,
    url: "https://www.esma.europa.eu/sites/default/files/library/esma35-43-1000_additional_information_on_the_agreed_product_intervention_measures_relating_to_contracts_for_differences_and_binary_options.pdf",
    finding: "Détail des plafonds de levier par sous-jacent et de la règle de clôture automatique à 50 % de la marge initiale minimale requise."
  },

  sec_orders: {
    label: "SEC / Investor.gov — Types of Orders",
    kind: "institution",
    org: "U.S. Securities and Exchange Commission",
    year: 2023,
    url: "https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders",
    finding: "Définitions officielles : ordre au marché (exécution garantie, prix non garanti), ordre à cours limité (exécution au prix indiqué ou mieux, exécution non garantie), ordre stop (devient un ordre au marché dès que le prix stop est touché)."
  },

  sec_stop: {
    label: "SEC / Investor.gov — Investor Bulletin : Stop, Stop-Limit and Trailing Stop Orders",
    kind: "institution",
    org: "U.S. Securities and Exchange Commission",
    year: 2017,
    url: "https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-15",
    finding: "Le prix stop n'est pas un prix d'exécution garanti : il déclenche un ordre au marché dont le prix peut s'en écarter fortement en marché rapide. Le stop-limite évite ce risque mais peut ne jamais être exécuté."
  },

  sec_trading101: {
    label: "SEC — Trading 101 (bases des ordres, coûts et exécution)",
    kind: "institution",
    org: "U.S. Securities and Exchange Commission",
    year: 2017,
    url: "https://www.sec.gov/files/trading101basics.pdf",
    finding: "Le dernier prix échangé n'est pas nécessairement le prix d'exécution d'un ordre au marché ; en marché rapide l'écart peut être significatif."
  },

  /* ---------- Finance académique : marchés & analyse technique ---------- */

  lo2000: {
    label: "Lo, Mamaysky & Wang (2000) — Foundations of Technical Analysis, Journal of Finance 55(4), 1705-1765",
    kind: "academic",
    org: "MIT / Columbia",
    year: 2000,
    url: "https://web.mit.edu/Alo/www/articles.html",
    finding: "En comparant la distribution des rendements conditionnée à 10 figures graphiques à la distribution inconditionnelle sur 1962-1996, plusieurs figures apportent une information incrémentale (5 à 7 figures significatives sur 10 selon le marché). Les auteurs précisent que cela ne prouve pas la possibilité de profits nets de coûts."
  },

  park2007: {
    label: "Park & Irwin (2007) — What Do We Know About the Profitability of Technical Analysis?, Journal of Economic Surveys 21(4), 786-826",
    kind: "academic",
    org: "University of Illinois",
    year: 2007,
    url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-6419.2007.00519.x",
    finding: "Revue de 95 études « modernes » : 56 positives, 20 négatives, 19 mixtes. Les auteurs concluent que la plupart souffrent de data snooping, de sélection ex post des règles et d'une mauvaise estimation des coûts de transaction et du risque."
  },

  marshall2006: {
    label: "Marshall, Young & Rose (2006) — Candlestick technical trading strategies: Can they create value for investors?, Journal of Banking & Finance 30(8), 2303-2323",
    kind: "academic",
    org: "Massey University",
    year: 2006,
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0378426605002955",
    finding: "26 figures en chandeliers testées sur les actions du Dow Jones (1992-2002) avec bootstrap : aucune valeur créée pour l'investisseur, pas de pouvoir prédictif après coûts."
  },

  mandelbrot1963: {
    label: "Mandelbrot (1963) — The Variation of Certain Speculative Prices, Journal of Business 36(4), 394-419",
    kind: "academic",
    org: "Université de Paris / Harvard",
    year: 1963,
    url: "https://www.journals.uchicago.edu/doi/10.1086/294632",
    finding: "« Les grandes variations tendent à être suivies de grandes variations, de l'un ou l'autre signe, et les petites variations de petites variations » : la volatilité se regroupe dans le temps et les queues de distribution sont épaisses."
  },

  engle1982: {
    label: "Engle (1982) — Autoregressive Conditional Heteroscedasticity, Econometrica 50(4), 987-1007",
    kind: "academic",
    org: "LSE (prix Nobel 2003)",
    year: 1982,
    url: "https://www.jstor.org/stable/1912773",
    finding: "La variance conditionnelle dépend des chocs passés : modèle ARCH qui formalise le regroupement de volatilité. La volatilité est prévisible à court terme bien plus que le sens du mouvement."
  },

  /* ---------- Finance comportementale ---------- */

  kahneman1979: {
    label: "Kahneman & Tversky (1979) — Prospect Theory: An Analysis of Decision under Risk, Econometrica 47(2), 263-291",
    kind: "academic",
    org: "Hebrew University / Stanford (prix Nobel 2002)",
    year: 1979,
    url: "https://www.jstor.org/stable/1914185",
    finding: "Les décisions sont prises par rapport à un point de référence, avec une aversion aux pertes (la douleur d'une perte dépasse le plaisir d'un gain équivalent) : aversion au risque dans le domaine des gains, recherche de risque dans celui des pertes."
  },

  shefrin1985: {
    label: "Shefrin & Statman (1985) — The Disposition to Sell Winners Too Early and Ride Losers Too Long, Journal of Finance 40(3), 777-790",
    kind: "academic",
    org: "Santa Clara University",
    year: 1985,
    url: "https://onlinelibrary.wiley.com/doi/10.1111/j.1540-6261.1985.tb05002.x",
    finding: "Définition et première démonstration de l'effet de disposition : tendance à vendre trop tôt les positions gagnantes et à conserver trop longtemps les positions perdantes."
  },

  odean1998: {
    label: "Odean (1998) — Are Investors Reluctant to Realize Their Losses?, Journal of Finance 53(5), 1775-1798",
    kind: "academic",
    org: "UC Davis",
    year: 1998,
    url: "https://onlinelibrary.wiley.com/doi/10.1111/0022-1082.00072",
    finding: "Sur 10 000 comptes (1987-1993), les investisseurs réalisent leurs gains à un taux nettement supérieur à celui de leurs pertes, et les titres vendus (gagnants) surperforment ensuite ceux conservés (perdants) : l'effet de disposition coûte de l'argent."
  },

  barber2000: {
    label: "Barber & Odean (2000) — Trading Is Hazardous to Your Wealth, Journal of Finance 55(2), 773-806",
    kind: "academic",
    org: "UC Davis / UC Berkeley",
    year: 2000,
    url: "https://faculty.haas.berkeley.edu/odean/papers%20current%20versions/individual_investor_performance_final.pdf",
    finding: "66 465 foyers (1991-1996) : les plus actifs (rotation mensuelle > 8,8 %) obtiennent 11,4 %/an net contre 18,5 % pour les moins actifs et 17,9 % pour le marché. Le surtrading détruit de la valeur ; la surconfiance en est l'explication avancée."
  },

  odean1999: {
    label: "Odean (1999) — Do Investors Trade Too Much?, American Economic Review 89(5), 1279-1298",
    kind: "academic",
    org: "UC Davis",
    year: 1999,
    url: "https://www.aeaweb.org/articles?id=10.1257/aer.89.5.1279",
    finding: "Les positions achetées par les particuliers sous-performent en moyenne celles qu'ils vendent, y compris avant coûts : l'activité de trading ne repose pas sur une information supérieure."
  },

  /* ---------- Mathématiques du risque ---------- */

  kelly1956: {
    label: "Kelly (1956) — A New Interpretation of Information Rate, Bell System Technical Journal 35, 917-926",
    kind: "academic",
    org: "Bell Labs",
    year: 1956,
    url: "https://www.bell-labs.com/usr/dmr/www/kelly/papers/gambling.pdf",
    finding: "Le critère de Kelly donne la fraction de capital maximisant le taux de croissance de long terme : f* = p − q/b. Misez plus que Kelly et la croissance chute ; le plein Kelly produit une volatilité très élevée, d'où l'usage pratique d'une fraction de Kelly."
  },

  gambler: {
    label: "Problème de la ruine du joueur (marche aléatoire à dérive positive)",
    kind: "academic",
    org: "Théorie des probabilités — Feller, An Introduction to Probability Theory and Its Applications",
    year: 1968,
    url: "https://en.wikipedia.org/wiki/Gambler%27s_ruin",
    finding: "Pour une marche aléatoire à dérive positive, la probabilité d'atteindre une barrière de ruine décroît exponentiellement avec le capital exprimé en unités de risque : R ≈ exp(−2μB/σ²). Un capital fini et un risque par pari non nul rendent la ruine possible même avec un avantage positif."
  },

  thorndike: {
    label: "Espérance mathématique et variance d'une stratégie (formulation standard)",
    kind: "academic",
    org: "Théorie des probabilités",
    year: 0,
    url: "https://en.wikipedia.org/wiki/Expected_value",
    finding: "E[R] = Σ pᵢ·rᵢ. Sur un jeu répété, la performance dépend de l'espérance par unité de risque et du nombre de répétitions ; la variance ne disparaît qu'avec un grand nombre de tirages (loi des grands nombres)."
  }
};

/* Badge de fiabilité affiché sur chaque carte pédagogique */
window.EVIDENCE = {
  etabli:    { label: "Établi",         tone: "pos",  desc: "Constat d'un régulateur ou résultat académique répliqué." },
  biais:     { label: "Biais documenté", tone: "warn", desc: "Effet comportemental mesuré en laboratoire et sur données réelles." },
  debat:     { label: "Débattu",        tone: "warn", desc: "Preuves limitées, contradictoires ou dépendantes de la période et des coûts." },
  praticien: { label: "Usage pro",      tone: "info", desc: "Convention de métier répandue, non démontrée comme optimale par la recherche." },
  mythe:     { label: "Mythe",          tone: "neg",  desc: "Croyance répandue contredite par les données disponibles." }
};
