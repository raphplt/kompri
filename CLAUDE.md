# Conventions du dépôt

## Périmètre

Fondations de Kompri. Code, variables et commits en anglais ; documentation et interface
en français. Textes UI dans `apps/web/src/messages`, composants serveur par défaut.
Ne pas implémenter auth, paiement, vocal, gamification, espace écoles, mapping RNCP
ou déploiement sans nouvelle demande. Les interfaces vocales sont seulement des réservations.

## Travail et vérification

Utiliser Node `.nvmrc` et pnpm `packageManager`. Lire `docs/architecture.md` avant les
changements structurels. Un commit cohérent doit passer `pnpm lint`, `pnpm typecheck`
et `pnpm test`. Exécuter `pnpm build` pour les changements de compilation/application.
Démarrer PostgreSQL et appliquer migration + seed avant les tests d’intégration.
`pnpm content:validate` et `pnpm evals` sont obligatoires après modification du contenu
ou de l’examinateur. `pnpm format` applique le format partagé.

Les tests de l’examinateur doivent rester exécutables seuls, sans base et sans réseau.
Utiliser le mock déterministe pour tous les tests et la CI ; l’adaptateur HTTP est
vérifié avec un transport simulé. Aucun appel payant automatique.
Vérifier les versions stables et les peer dependencies avant un ajout. Expliquer
chaque nouvelle dépendance dans le corps du commit Conventional Commits, lignes ≤100 caractères.

## Frontières

Les apps consomment les packages. Aucun package ne dépend d’une app.
`examiner`, `llm` et `content` ne dépendent ni de Prisma, ni de NestJS, ni de Next.js.
`examiner` n’effectue aucun accès direct au réseau, au disque ou à la base ; injecter
son client LLM, fournir les horodatages, retourner un nouvel état.
ESLint contrôle les imports interdits. Ne pas contourner ces règles par des alias.
Les dépendances internes sont explicites en `workspace:*`.

## Données et fichiers sensibles

Ne jamais committer `.env`, clés, traces d’oraux réels ou travail d’apprenant.
Les logs LLM contiennent exclusivement usage, modèle, durée, tokens, coût et statut.
Le contenu YAML est la source de vérité. Le seed synchronise sans effacer l’historique.
Une migration appliquée ne se réécrit pas : ajouter une nouvelle migration.
Ne pas modifier `packages/db/src/generated`, `dist`, `.next` ou `pnpm-lock.yaml` à la main.
Préserver les cascades de suppression, les clés composites d’appartenance et les tests associés.
Ne pas changer le mock pour masquer une régression des évaluations.
Les références marquées `humanReview: pending` ne sont pas des mesures de fiabilité humaine.
