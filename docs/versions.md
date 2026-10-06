# Versions vérifiées

Vérification le 6 octobre 2026 via les métadonnées npm, les releases Node et PostgreSQL.

| Outil             | Version retenue |
| ----------------- | --------------- |
| Node LTS          | 24.21.0         |
| PostgreSQL        | 18.6-alpine     |
| pnpm              | 12.10.1         |
| turbo             | 2.11.7          |
| typescript        | 6.0.3           |
| next              | 16.4.0          |
| react             | 19.3.0          |
| @nestjs/core      | 12.1.2          |
| @nestjs/swagger   | 12.0.2          |
| prisma            | 7.10.0          |
| zod               | 4.6.5           |
| tailwindcss       | 4.3.3           |
| vitest            | 5.0.3           |
| eslint            | 10.12.0         |
| typescript-eslint | 8.71.1          |
| prettier          | 3.9.9           |
| husky             | 9.1.7           |
| lint-staged       | 17.6.0          |
| @commitlint/cli   | 21.2.3          |

TypeScript 7.0.2 est stable, mais les peer dependencies de `typescript-eslint` exigent
`<6.1.0`, et Swagger NestJS accepte TypeScript 5/6. Version retenue : **6.0.3**.
Le tag Prisma `latest` pointe vers **8.0.0-rc.20** ; choix de **7.10.0 stable**.
Node 26 est Current ; Node 24 est la LTS. Les versions transitives sont dans le lockfile.

Le pnpm actuel demande une politique explicite pour les scripts de dépendances :
seuls esbuild, Prisma/engines et sharp sont autorisés ; le script de télémétrie Scarf
est désactivé. Les exclusions de délai de publication Next ont été générées par pnpm
pour installer la version stable demandée.

Sources : [Node](https://nodejs.org/en/about/previous-releases),
[PostgreSQL](https://www.postgresql.org/support/versioning/),
[registre npm](https://registry.npmjs.org/),
[API Mistral](https://docs.mistral.ai/api/endpoint/chat),
[configuration Prisma](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).
