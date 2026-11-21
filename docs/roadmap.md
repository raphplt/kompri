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

- ⏳ Format de contenu v2 : leçons Markdown, défis détaillés, grilles par niveaux, notes
  d’examinateur invisibles pour l’apprenant, archivage des nœuds retirés
- ⏳ Guide de rédaction des cours (`docs/content-guide.md`)
- ⏳ Arbre d’environ 24 compétences réparties en domaines
- ⏳ Cours complets et relus pour chaque compétence, défis des quatre familles
- ⏳ Relecture d’exactitude de chaque cours et vérification des liens sources

Application :

- ⏳ API : détail d’une compétence, leçons, défis (sans les notes d’examinateur)
- ⏳ Web : arbre par domaines, page compétence, lecteur de leçon Markdown
- ⏳ API : tentative, démarrage d’oral, tours, notation, validation et expiration
- ⏳ Web : soumission du travail, oral chronométré par chat, résultat détaillé
- ⏳ Références d’évaluation adaptées au nouveau contenu

## Jalon 2 — Comptes

- ⏳ Inscription, connexion, déconnexion par email et mot de passe (hachage moderne)
- ⏳ Sessions par cookie HttpOnly, protection CSRF, limitation des tentatives
- ⏳ Toutes les données rattachées au compte, contrôle d’appartenance sur chaque route
- ⏳ Export et suppression du compte (RGPD)

## Jalon 3 — Progression

- ⏳ Tableau de bord : compétences validées, expirées, disponibles, verrouillées
- ⏳ Expiration et renouvellement des validations
- ⏳ Quotas d’oraux réservés atomiquement
- ⏳ Oral de positionnement pour entrer au bon endroit de l’arbre

## Jalon 4 — Fournisseurs LLM ouverts

- ⏳ Adaptateur compatible OpenAI (Mistral, OpenAI, Ollama, vLLM, LM Studio…)
- ⏳ Adaptateurs Anthropic (Claude) et Google (Gemini)
- ⏳ Configuration par usage, documentation, tests par transport simulé uniquement

## Jalon 5 — Fiabilité de l’examinateur

- ⏳ Grilles par niveaux et notes d’examinateur exploitées par les prompts
- ⏳ Davantage de références d’évaluation par famille de défi
- ⏳ Défenses contre l’injection de consignes et les réponses assistées (temps, signaux)
- ⏳ Tuteur IA pendant l’apprentissage (autorisé), séparé de l’oral (interdit)

## Jalon 6 — Préparation au déploiement

- ⏳ Images Docker de production, compose de production, vérifications de santé
- ⏳ Configuration de production, en-têtes de sécurité, journaux structurés
- ⏳ Pages légales (mentions, confidentialité), documentation d’exploitation

## Hors périmètre sans nouvelle demande

Paiement et abonnements, vocal, gamification (séries, classements, duels), espace écoles,
correspondances RNCP, mise en ligne effective.
