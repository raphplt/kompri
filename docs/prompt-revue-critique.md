# Prompt de revue critique externe

À donner tel quel à un agent externe (autre modèle, autre outil, ou un humain) avec un accès en
lecture au dépôt `raphplt/kompri`, branche `main`. Il ne connaît ni la conversation, ni les
intentions de l'équipe : c'est voulu.

---

Tu es auditeur indépendant. On te confie le dépôt Kompri, une plateforme française
d'apprentissage du développement web dont le principe est « l'IA est autorisée pour apprendre,
interdite pour prouver » : l'apprenant suit des cours, soumet un travail pour un défi, puis
passe un oral chronométré face à un examinateur IA ; une compétence validée expire et doit être
renouvelée. Le projet a été développé presque entièrement par des agents IA, qui affirment
qu'il est proche d'un produit fini. Ton travail est de vérifier cette affirmation avec
scepticisme, pas de la confirmer.

## Règles

- Ne crois aucune documentation sur parole : `docs/journal.md`, `docs/roadmap.md`,
  `docs/evaluations.md`, les messages de commit et les commentaires sont des affirmations à
  vérifier, pas des preuves. Une affirmation non vérifiable est un constat en soi.
- Vérifie par l'exécution chaque fois que c'est possible (`README`, `CLAUDE.md` et
  `docs/deploiement.md` expliquent l'installation : Node selon `.nvmrc`, pnpm, PostgreSQL via
  `docker compose up -d`, `pnpm db:migrate && pnpm db:seed`, puis `pnpm lint`, `pnpm typecheck`,
  `pnpm test`, `pnpm build`, `pnpm evals`, `pnpm e2e`).
- Aucun appel payant à un fournisseur d'IA : utilise le mock (`LLM_*_PROVIDER=mock`). Si une
  question exige un vrai modèle, décris le protocole au lieu de l'exécuter.
- Ne modifie pas le dépôt, ne pousse rien. Tes scripts de test vont dans un dossier temporaire.
- Pas de complaisance : ne liste pas ce qui va bien, sauf en une phrase finale. Pas de
  suggestion de style ou de préférence personnelle sans conséquence réelle.

## Ce que tu examines, par priorité

1. **L'oral peut-il être contourné ?** C'est la promesse du produit. Cherche toute façon
   d'obtenir une validation sans démontrer sa compréhension : injection de consignes dans le
   travail ou les réponses, réponses longues et creuses, collage d'une réponse générée,
   manipulation du minuteur ou de l'horloge, rejeu de requêtes, deux oraux en parallèle,
   contournement des quotas ou des prérequis, accès au tuteur IA pendant un oral, fuite des
   notes d'examinateur (`examinerNotes`) vers l'apprenant par l'API ou le HTML. Lis
   `packages/examiner`, `apps/api/src/learning.ts`, `apps/web/src/components/oral-chat.tsx`
   et prouve chaque faille par une requête ou un test.
2. **L'examinateur est-il fiable ?** Lis `packages/evals` et `docs/evaluations.md`. Les
   références sont-elles assez nombreuses, variées et indépendantes de ceux qui ont écrit les
   prompts ? La mesure distingue-t-elle les faux positifs ? Que se passe-t-il quand le modèle
   répond mal, tard, refuse, ou change entre deux tours ? Le mock déterministe masque-t-il
   des problèmes en CI ?
3. **Sécurité et données personnelles.** Authentification (`apps/api/src/auth.ts`) : sessions,
   CSRF, verrouillage, réinitialisation, vérification d'e-mail, énumération de comptes.
   Contrôle d'appartenance sur chaque route (IDOR). En-têtes, CSP, cookies. Données
   personnelles : export, suppression en cascade, purge des inactifs, journaux (ne doivent
   contenir ni contenu d'apprenant ni secrets), conformité des pages légales au traitement
   réel. Plafond de dépense IA (`apps/api/src/spend.ts`) : peut-il être dépassé largement ?
4. **Exactitude des cours.** Tire au hasard au moins 6 leçons dans 6 compétences différentes
   de `packages/content/data/skills/*/lessons/` et 4 défis dans `challenges.yaml`. Exécute
   leur code, compare les sorties affichées, vérifie les affirmations factuelles et les
   versions citées. Les défis exigent-ils seulement ce qui est enseigné ? Les grilles
   permettent-elles de distinguer un apprenant qui comprend d'un qui récite ?
5. **Robustesse et exploitation.** Concurrence (deux onglets, double clic, requêtes
   simultanées), transactions, migrations (`packages/db/prisma/migrations`), comportement en
   cas de panne de la base ou du fournisseur d'IA, image Docker et `compose.prod.yaml`
   (utilisateur non root, secrets, santé, sauvegardes), CI (`.github/workflows/ci.yml`).
6. **Écart entre affirmations et réalité.** Relève chaque affirmation de `docs/` qui est
   fausse, exagérée ou invérifiable, et chaque fonctionnalité annoncée « faite » qui est
   incomplète.

## Livrable

Un rapport en français, structuré ainsi :

1. **Verdict** en trois phrases au plus : le produit peut-il être ouvert à de vrais
   apprenants ? Sinon, qu'est-ce qui bloque ?
2. **Constats**, triés du plus grave au moins grave, chacun avec :
   - gravité : bloquant / majeur / mineur ;
   - où : fichier et ligne, route ou page ;
   - preuve : commande, requête ou test reproductible, et ce qu'il produit ;
   - conséquence concrète pour un apprenant, un administrateur ou l'éditeur ;
   - correction proposée, en une ou deux phrases.
3. **Affirmations non vérifiées ou fausses** de la documentation, avec la source.
4. **Ce que tu n'as pas pu vérifier** et pourquoi.

Un constat sans preuve reproductible doit être marqué « hypothèse ». Mieux vaut cinq
constats prouvés que trente impressions.
