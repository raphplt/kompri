# Journal de projet

Entrées les plus récentes en haut. Chaque entrée résume ce qui a été livré, les décisions
prises sans attendre de validation et la suite prévue.

## 22 novembre 2026 — Reprise et règle de consommation

- La première nuit a épuisé une fenêtre d’utilisation de 5 h (jusqu’à 9 agents en
  parallèle). Règle désormais appliquée : **un seul agent à la fois** ; le travail ciblé est
  fait directement ; les tâches lourdes sont espacées. Aucun outil ne donne le pourcentage
  consommé : la règle porte donc sur le nombre d’agents.
- **Les 24 compétences sont relues et publiées.** Chaque relecture indépendante a réexécuté
  le code et corrigé des erreurs réelles (serveur qui plantait pendant une expérience, schéma
  OpenAPI faux, politique LTS de Node, plan EXPLAIN, sessions introuvables dans un défi…).
- Livré depuis : oral de positionnement, réinitialisation du mot de passe par e-mail,
  adaptation mobile, audit des dépendances en CI, relectures HTML, CSS, Express/REST et
  JavaScript (données, DOM, asynchrone) appliquées. Tous les cours sont rédigés.

## 21-22 novembre 2026 — Première nuit de travail autonome

Livré (branche `claude/project-autonomous-progress-xyvkry`) :

- **Contenu v2** : domaines, leçons Markdown avec un dialecte contrôlé (encadrés, solutions
  repliables), défis détaillés avec grilles par niveaux et notes d’examinateur jamais
  exposées, archivage du contenu retiré. Arbre de 24 compétences en 6 domaines.
- **Cours** : 118 leçons (~315 000 mots) et 92 défis rédigés par des agents, chaque exemple
  exécuté (Node 24, Express 5, PostgreSQL, Chromium). Relecture indépendante en cours ;
  js-basics, js-control-flow et js-functions sont relues et publiées.
- **Boucle complète** : comptes (scrypt, verrouillage, sessions), tentatives, oral chronométré
  (minuteur, envoi automatique, collage bloqué, abandon), notation avec reprises, validations
  qui expirent, quotas atomiques, progression, export et suppression du compte.
- **Interface** : parcours, compétences, leçons, défis, oral, résultats, tableau de bord,
  compte, pages légales et « Comment ça marche ».
- **Fournisseurs LLM** : mock, Mistral, OpenAI, Gemini, Claude (SDK officiel), Ollama et tout
  endpoint compatible OpenAI.
- **Tuteur IA** sur les leçons, avec quota, sans stockage des échanges, coupé pendant un oral.
- **Production** : images Docker testées, compose de production, en-têtes de sécurité,
  journaux JSON, guide d’exploitation.

Décisions prises sans attendre de validation :

- L’authentification a été faite avec la boucle de l’oral (jalon 1), plutôt qu’après, car
  chaque route d’apprentissage a besoin d’un propriétaire.
- Les prérequis doivent avoir été validés au moins une fois ; une validation expirée demande
  un renouvellement sans verrouiller la suite (`apps/api/src/progress.ts`).
- Un oral par tentative : pour retenter, on soumet une nouvelle version du travail.
- Une réponse en retard ou vide compte comme absente et l’oral continue.
- Produit en français uniquement : le dictionnaire anglais a été retiré.
- Sécurité : `next` 16.4.0 avait des failles critiques (audit) → 16.4.6 ; `zod` 4.6.7 ;
  surcharges pnpm pour `body-parser`, `multer` et `qs`.
- Le chargement du `.env` a été isolé : Turbopack copiait ce fichier dans le build web.
- Les leçons Markdown sont exclues de Prettier, qui cassait les encadrés et les exemples HTML
  volontairement fautifs.

Points d’attention pour le porteur du projet :

- Les mentions légales et la politique de confidentialité contiennent des champs à compléter.
- Les cours restent à relire par des formateurs humains ; les références d’évaluation sont
  `humanReview: pending`.
- Une évaluation réelle de l’examinateur (`pnpm evals:live`) demande une clé de fournisseur.

Suite : fin de la relecture et publication des 21 compétences restantes, oral de
positionnement, signaux d’assistance pendant l’oral, références d’évaluation par famille.

## 21 novembre 2026 — Lancement du travail autonome

Décisions validées par le porteur du projet :

- produit fini pour l’apprenant individuel, découpé en jalons (voir la feuille de route) ;
- authentification et préparation au déploiement entrent dans le périmètre ;
- choix de fournisseur LLM ouvert (Mistral, OpenAI, Gemini, Claude, modèles locaux) ;
  tests et CI restent sur le mock, sans appel payant ;
- les cours sont rédigés en entier, détaillés, exacts et sourcés, marqués à relire.

Suite : format de contenu v2, guide de rédaction, arbre complet, puis rédaction parallèle
des cours pendant le développement de la boucle de l’oral.
