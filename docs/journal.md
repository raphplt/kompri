# Journal de projet

Entrées les plus récentes en haut. Chaque entrée résume ce qui a été livré, les décisions
prises sans attendre de validation et la suite prévue.

## 24 novembre 2026 — Examinateur réel, budget et nouveaux cours

- Clé d’API Claude fournie par le porteur du projet ; elle est restée hors du dépôt. À
  révoquer après usage, car elle a transité par la conversation.
- Mesure réelle de l’examinateur avec Claude Opus 5.5 : 7/7 verdicts conformes et stables,
  0,57 point d’écart moyen par critère, environ 1 $ ([détails](evaluations.md)). Elle a révélé
  une note qui oubliait un critère : le modèle rend désormais une entrée obligatoire par
  critère, et le verdict est calculé par la plateforme.
- Plafond mensuel de dépense IA demandé (20 €) : `LLM_MONTHLY_BUDGET_USD=20` en production.
  Atteint, il suspend les nouveaux oraux et le tuteur ; un oral commencé va à son terme.
  Décision : un plafond en dollars, comme les tarifs, et 20 $ restent sous 20 €.
- Six nouvelles compétences planifiées (Git en équipe, TypeScript ×2, React ×2, déploiement) ;
  blocs de code TypeScript, JSX, YAML et Dockerfile autorisés dans les leçons.

## 22 novembre 2026 (fin de soirée) — Recherche, reprise et accessibilité

- Le tableau de bord propose la prochaine leçon à lire : suite de la compétence lue en dernier,
  sinon première compétence disponible.
- Recherche dans les cours (`/recherche`) : recherche plein texte PostgreSQL en français, sans
  tenir compte des accents (`unaccent`), titre > résumé > corps, extraits surlignés. Décision :
  vecteur stocké avec index GIN, mis à jour par le seed (4 ms par requête contre ~550 ms en
  calcul à la volée). Un PostgreSQL géré doit proposer `unaccent` (noté dans le guide).
- Audit d’accessibilité axe (WCAG 2.1 A/AA) dans les tests de bout en bout : 18 pages en thème
  clair, dont l’oral et son résultat, 5 en thème sombre. Un défaut corrigé : liens des
  conditions et de la confidentialité distingués par la seule couleur à l’inscription.

## 22 novembre 2026 (soir) — Finitions et tests de bout en bout

- `main` avancé sur la branche de travail (avance rapide) pour que le porteur du projet puisse
  tester en local ; procédure Mac donnée.
- Pages d’erreur ; suivi des leçons lues (page compétence, leçon, tableau de bord, export).
- Tests de bout en bout Playwright en CI (visite, leçon, pages légales, 404, parcours complet
  jusqu’à l’oral validé). Ils ont révélé deux défauts corrigés : les pages introuvables
  répondaient 200 à cause d’un état de chargement global, et la zone de réponse de l’oral
  avait le même nom accessible que son champ.

## 22 novembre 2026 (après-midi) — Compte, réexamen et suivi

- Cours de sécurité mis à jour vers le Top 10 OWASP 2025 (vérifié sur owasp.org), avec la
  correspondance 2021 ; les examinateurs acceptent un code 2021 daté.
- Vérification de l’adresse e-mail (exigée avant un oral), changement de mot de passe et
  d’e-mail, réinitialisation par lien unique.
- Contestation d’un oral dans les 30 jours ; file de réexamen pour les administrateurs, qui
  voient la transcription et les notes d’examinateur, puis confirment ou modifient le verdict.
- Tâche quotidienne : rappels d’expiration et purge des comptes inactifs après préavis
  (désactivée tant que la durée n’est pas fixée).
- Statistiques agrégées par défi pour repérer les défis mal calibrés.
- Pages légales complétées à partir des mentions du porteur du projet (micro-entreprise),
  conditions générales d’utilisation ajoutées ; conservation : 2 ans d’inactivité, sauvegardes
  30 jours. Seul l’hébergeur reste à renseigner.
- Proxy HTTPS Caddy intégré au compose de production (profil `https`).
- Quatre oraux de référence réalistes (familles avec, contre et après l’IA), en mode
  `report` pour le mock ; sitemap, robots et métadonnées de partage ; indicateurs de
  déroulement de l’oral visibles au réexamen, jamais notés.
- En attente : choix de l’hébergeur, clé d’API Claude pour mesurer l’examinateur.

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
