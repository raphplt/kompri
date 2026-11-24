# Feuille de route

Objectif : un produit fini pour l’apprenant individuel. Il crée un compte, suit des cours
complets, réalise des défis, passe un oral chronométré face à l’examinateur et obtient une
validation qui expire. Il suit sa progression dans l’arbre.

Validé avec le porteur du projet le 21 novembre 2026. Les tâches sont priorisées dans
chaque jalon ; l’état réel est tenu à jour ici et détaillé dans [le journal](journal.md).

Légende : ✅ fait · 🚧 en cours · ⏳ à faire

## Jalon 0 — Pilotage

- ✅ Périmètre élargi dans `CLAUDE.md` (authentification, préparation au déploiement)
- ✅ Feuille de route et journal

## Jalon 1 — Contenu pédagogique et boucle de l’oral

Contenu (parcours « développement web full-stack élémentaire ») :

- ✅ Format de contenu v2 : leçons Markdown, défis détaillés, grilles par niveaux, notes
  d’examinateur invisibles pour l’apprenant, archivage des nœuds retirés
- ✅ Guide de rédaction des cours (`docs/content-guide.md`)
- ✅ Arbre de 24 compétences réparties en 6 domaines
- ✅ Cours complets pour les 24 compétences : 119 leçons (~319 000 mots), 96 défis
- ✅ Relecture d’exactitude indépendante de chaque cours, liens sources vérifiés
- ⏳ Relecture par des formateurs humains (hors portée de l’automatisation)

Application :

- ✅ API : détail d’une compétence, leçons, défis (sans les notes d’examinateur)
- ✅ Web : arbre par domaines, page compétence, lecteur de leçon Markdown
- ✅ API : tentative, démarrage d’oral, tours, notation, validation et expiration
- ✅ Web : soumission du travail, oral chronométré par chat, résultat détaillé
- ✅ Références d’évaluation adaptées au nouveau contenu

## Jalon 2 — Comptes

- ✅ Inscription, connexion, déconnexion par email et mot de passe (scrypt)
- ✅ Sessions par cookie HttpOnly, protection CSRF, limitation des tentatives
- ✅ Toutes les données rattachées au compte, contrôle d’appartenance sur chaque route
- ✅ Export et suppression du compte (RGPD)

## Jalon 3 — Progression

- ✅ Tableau de bord : compétences validées, expirées, disponibles, verrouillées
- ✅ Expiration et renouvellement des validations
- ✅ Quotas d’oraux réservés atomiquement
- ✅ Oral de positionnement pour entrer au bon endroit de l’arbre

## Jalon 3 bis — Finitions du compte et réexamen

- ✅ Réinitialisation du mot de passe, vérification de l’e-mail, changement d’e-mail et de mot
  de passe
- ✅ Contestation d’un oral et réexamen humain par un administrateur
- ✅ Rappels d’expiration et purge des comptes inactifs avec préavis (tâche quotidienne)
- ✅ Statistiques agrégées par défi pour les administrateurs

## Jalon 4 — Fournisseurs LLM ouverts

- ✅ Adaptateur compatible OpenAI (Mistral, OpenAI, Gemini, Ollama, vLLM, LM Studio…)
- ✅ Adaptateur Anthropic (Claude) ; Gemini via son endpoint compatible
- ✅ Configuration par usage, documentation, tests par transport simulé uniquement

## Jalon 5 — Fiabilité de l’examinateur

- ✅ Grilles par niveaux et notes d’examinateur exploitées par les prompts
- ✅ Références d’évaluation par famille de défi (7 oraux, dont 4 réalistes)
- ✅ Mesure avec un vrai modèle : Claude Opus 5.5, 7/7 verdicts conformes et stables
  ([mesures](evaluations.md))
- ⏳ Relecture humaine des références
- ✅ Plafond mensuel de dépense IA (20 $ en production, soit moins de 20 €)
- ✅ Défenses contre l’injection de consignes et les réponses assistées : minuteur, collage
  bloqué, tuteur coupé pendant l’oral, indicateurs de déroulement visibles au réexamen
- ✅ Tuteur IA pendant l’apprentissage (autorisé), coupé pendant l’oral (interdit)

## Jalon 6 — Préparation au déploiement

- ✅ Images Docker de production, compose de production, vérifications de santé
- ✅ Configuration de production, en-têtes de sécurité, journaux structurés
- ✅ Pages légales (à compléter par l’éditeur), documentation d’exploitation

## Jalon 7 — Confort d’apprentissage et qualité

- ✅ Suivi des leçons lues et reprise de la lecture depuis le tableau de bord
- ✅ Recherche plein texte dans les cours (accents et terminaisons ignorés, extraits surlignés)
- ✅ Tests de bout en bout Playwright en CI, du compte à l’oral validé
- ✅ Audit d’accessibilité WCAG 2.1 A/AA automatisé (axe), thèmes clair et sombre

## Jalon 8 — Approfondissements (demandé le 24 novembre 2026)

Six compétences de plus, rédigées puis relues une par une, publiées après relecture :

- ✅ Collaborer avec Git (`git-collaboration`) — 5 leçons, 4 défis, relu
- ✅ TypeScript : typer son JavaScript (`typescript-basics`) — 5 leçons, 4 défis, relu
- ✅ TypeScript côté serveur (`typescript-node`) — 5 leçons, 4 défis, relu
- ✅ React : composants et état (`react-fundamentals`) — 6 leçons, 4 défis, relu
- 🚧 React : données, effets et formulaires (`react-data-forms`)
- ⏳ Déployer et exploiter une application (`deployment`)

## Hors périmètre sans nouvelle demande

Paiement et abonnements, vocal, gamification (séries, classements, duels), espace écoles,
correspondances RNCP, mise en ligne effective.
