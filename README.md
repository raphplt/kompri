# Kompri

Kompri est une plateforme d’apprentissage de l’informatique à l’ère de l’IA.  
L’IA est autorisée pour apprendre, interdite pour prouver.  
Un arbre de compétences organise les défis et leurs prérequis.  
Un oral valide une compétence pour une durée limitée.  
Ce dépôt contient les fondations techniques et une démonstration minimale.

## Prérequis et installation

Node **24.21.0 LTS** (`nvm install && nvm use`), pnpm **12.10.1**, Docker avec Compose.
Le champ `packageManager` fixe pnpm ; installer au besoin `npm install -g pnpm@12.10.1`.
Les ports 3000, 3001 et 54329 doivent être libres.

```sh
pnpm install
docker compose up -d
pnpm db:migrate && pnpm db:seed
pnpm content:validate
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm evals
pnpm dev
```

`pnpm install` crée `.env` depuis `.env.example` seulement s’il est absent et génère
le client Prisma. Les valeurs fournies sont uniquement locales ; aucun compte externe
ni aucune clé ne sont nécessaires. Les variables du processus priment sur `.env`.
Le démarrage refuse une configuration manquante ou invalide.

- Web : <http://localhost:3000>
- API : <http://localhost:3001/health> et <http://localhost:3001/skills>
- Swagger : <http://localhost:3001/docs>
- OpenAPI JSON généré : <http://localhost:3001/openapi.json>

La page rend les trois compétences depuis l’API et PostgreSQL. Le contenu est illustratif.
Les tests d’intégration nécessitent la base migrée et seedée. Pour attendre explicitement
sa disponibilité : `docker compose up -d --wait`. `db:migrate` attend aussi la
base jusqu’à 30 secondes avant de lancer Prisma. Arrêter les services avec Ctrl+C
et `docker compose stop` ; les données locales persistent dans le volume Docker.

## Commandes

| Commande                                 | Rôle                                                        |
| ---------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                               | Démarre web et API en parallèle                             |
| `pnpm build`                             | Compile les packages, NestJS et Next.js                     |
| `pnpm lint` / `pnpm format`              | Vérifie / applique le style partagé                         |
| `pnpm typecheck`                         | Vérifie le code, les tests et les configurations TypeScript |
| `pnpm test`                              | Tests Vitest unitaires et intégration PostgreSQL/HTTP       |
| `pnpm exec vitest run packages/examiner` | Oral avec mock, sans base ni réseau                         |
| `pnpm content:validate`                  | Vérifie les références, doublons, grilles et cycles         |
| `pnpm db:generate`                       | Régénère le client après modification du schéma             |
| `pnpm db:migrate` / `pnpm db:seed`       | Applique les migrations / synchronise les exemples          |
| `pnpm evals`                             | Rejoue deux références trois fois, toujours avec le mock    |
| `pnpm evals:live`                        | Évaluation manuelle via le fournisseur configuré            |

Pour `evals:live`, définir `LLM_EXAMINER_PROVIDER=mistral`, le modèle, l’URL de base,
la clé et les deux tarifs propres à cet usage dans `.env` (voir ses commentaires).
Les usages `tutor` et `content-generation` restent indépendants. La CI interdit
les fournisseurs réels. Le modèle et les tarifs ne sont volontairement pas figés.
Ne passer aux données réelles qu’après validation des conditions d’hébergement et de conservation.

## Structure

```text
apps/web          Next.js, composants serveur, textes français et anglais externalisés
apps/api          NestJS REST, validation Zod, Swagger
packages/db       Prisma, migration, seed et accès PostgreSQL
packages/shared   Contrats Zod et configuration d’environnement
packages/llm      Interface, registre par usage, mock et adaptateur Mistral
packages/examiner Préparation, tours, notation ; I/O injectées
packages/content  Fichiers YAML, schémas et validation de l’arbre
packages/evals    Références, mesure des écarts et de la stabilité
packages/config   TypeScript, ESLint et Prettier partagés
docs              Vision, architecture, versions et décisions
```

Lire [l’architecture](docs/architecture.md), les [versions vérifiées](docs/versions.md)
et les [conventions agents](CLAUDE.md). Les hooks vérifient les fichiers modifiés
et les messages Conventional Commits. La CI reproduit les vérifications sur push et PR.
Aucun endpoint d’oral, système d’authentification ou déploiement n’est livré.
