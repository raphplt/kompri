# Kompri

Kompri est une plateforme d’apprentissage de l’informatique à l’ère de l’IA.  
L’IA est autorisée pour apprendre, interdite pour prouver.  
Un arbre de compétences organise les défis et leurs prérequis.  
Un oral chronométré, face à un examinateur IA, valide une compétence pour une durée limitée.

Le premier parcours, « développement web full-stack élémentaire », compte 24 compétences
en 6 domaines, avec des cours complets, des défis des quatre familles (sans IA, avec l’IA,
contre l’IA, après l’IA) et un tuteur IA pour apprendre. Voir la
[feuille de route](docs/roadmap.md) et le [journal](docs/journal.md).

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
- API : <http://localhost:3001/health> et <http://localhost:3001/tree>
- Swagger : <http://localhost:3001/docs>
- OpenAPI JSON généré : <http://localhost:3001/openapi.json>

Sans fournisseur configuré, l’examinateur et le tuteur utilisent un mock déterministe :
l’application est entièrement utilisable en local, sans clé ni appel payant. Le mock note
selon la longueur des réponses (au moins 25 mots pour le maximum) ; il ne juge pas la
compréhension. Pour un vrai modèle, voir `.env.example` (Mistral, OpenAI, Gemini, Claude,
Ollama ou tout endpoint compatible OpenAI).

Les tests d’intégration nécessitent la base migrée et seedée. Pour attendre explicitement
sa disponibilité : `docker compose up -d --wait`. Arrêter les services avec Ctrl+C et
`docker compose stop` ; les données locales persistent dans le volume Docker.
Pour la production, voir le [guide de déploiement](docs/deploiement.md).

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
| `pnpm e2e`                               | Parcours de bout en bout dans Chromium (après `pnpm build`) |
| `pnpm evals`                             | Rejoue deux références trois fois, toujours avec le mock    |
| `pnpm evals:live`                        | Évaluation manuelle via le fournisseur configuré            |

Pour `evals:live`, définir dans `.env` un fournisseur réel pour `LLM_EXAMINER_PROVIDER`,
le modèle, la clé et les deux tarifs de cet usage (voir les commentaires de `.env.example`).
Les usages `tutor` et `content-generation` restent indépendants. La CI interdit
les fournisseurs réels. Le modèle et les tarifs ne sont volontairement pas figés.
Ne passer aux données réelles qu’après validation des conditions d’hébergement et de conservation.

## Structure

```text
apps/web          Next.js : parcours, leçons, défis, oral, tuteur ; textes dans src/messages
apps/api          NestJS REST : comptes, contenu, tentatives, oraux, progression, tuteur
packages/db       Prisma, migration, seed et accès PostgreSQL
packages/shared   Contrats Zod et configuration d’environnement
packages/llm      Registre par usage, mock, adaptateurs compatible OpenAI et Anthropic
packages/examiner Préparation, tours, notation ; I/O injectées
packages/content  Arbre, leçons Markdown, défis et grilles ; schémas et validation
packages/evals    Références, mesure des écarts et de la stabilité
packages/config   TypeScript, ESLint et Prettier partagés
docs              Vision, feuille de route, journal, architecture, contenu, déploiement, ADR
```

Lire [l’architecture](docs/architecture.md), les [versions vérifiées](docs/versions.md)
et les [conventions agents](CLAUDE.md). Les hooks vérifient les fichiers modifiés
et les messages Conventional Commits. La CI reproduit les vérifications sur push et PR.
