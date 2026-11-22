---
title: Concevoir l’architecture du projet
summary: Définir le besoin, découper l’application en interface, API et base, fixer le contrat d’API et organiser le projet, sa configuration et ses scripts.
durationMinutes: 60
sources:
  - title: Node.js — Command-line options (--env-file, --watch, --test)
    url: https://nodejs.org/api/cli.html
  - title: The Twelve-Factor App — Configuration
    url: https://12factor.net/fr/config
  - title: PostgreSQL — CREATE TABLE
    url: https://www.postgresql.org/docs/current/sql-createtable.html
---

## Le problème : assembler sans s’y perdre

Tu sais écrire une page HTML accessible, la mettre en forme, la rendre interactive avec
JavaScript, appeler une API avec `fetch`, construire cette API avec Express, stocker les
données dans PostgreSQL, authentifier les utilisateurs et tester ton code. Chaque compétence,
prise seule, est maîtrisée. La difficulté d’un vrai projet est ailleurs : faire tenir tout cela
**ensemble**, de façon cohérente, sans que chaque nouvelle fonctionnalité casse les précédentes.

Cette compétence construit, d’un bout à l’autre, une application complète : **Tâches**, un
gestionnaire de tâches multi-utilisateur. Chaque leçon ajoute une couche :

1. l’architecture, le contrat d’API, la base et l’organisation du projet (cette leçon) ;
2. l’API Express ;
3. l’interface qui appelle l’API et gère ses états ;
4. les tests des parcours essentiels ;
5. la préparation à la mise en production.

À la fin, tu auras un projet que tu peux expliquer ligne par ligne, et c’est ce que
l’examinateur te demandera.

## Le besoin

Avant d’écrire du code, on écrit ce que l’application doit faire, du point de vue de
l’utilisateur. Une forme courante est le **récit utilisateur** (*user story*) : « en tant que…,
je veux… afin de… ».

- En tant que visiteur, je veux **créer un compte** avec mon e-mail et un mot de passe.
- En tant qu’utilisateur, je veux **me connecter** et **me déconnecter**.
- En tant qu’utilisateur connecté, je veux **ajouter** une tâche, la **marquer comme faite** ou
  non, la **supprimer**, et **filtrer** mes tâches (toutes, à faire, terminées).
- En tant qu’utilisateur, je veux voir **combien de tâches il me reste**.
- En tant qu’utilisateur, je veux que **personne d’autre** ne voie mes tâches.

Et les exigences « non fonctionnelles », tout aussi importantes :

- **sécurité** : mots de passe hachés, sessions sûres, contrôle d’accès par propriétaire,
  protections contre l’injection SQL, le XSS et le CSRF ;
- **accessibilité** : utilisable au clavier, libellés, messages annoncés aux lecteurs d’écran ;
- **responsive** : utilisable sur un téléphone ;
- **fiabilité** : des tests automatisés couvrent les parcours essentiels ;
- **exploitabilité** : configuration par variables d’environnement, journaux utiles, sauvegardes.

Ce qui est **hors périmètre** est aussi une décision : pas de partage de listes, pas de
réinitialisation de mot de passe par e-mail, pas d’application mobile. Écrire ces limites
évite que le projet grossisse sans fin.

## Trois couches, une seule origine

```text
 Navigateur                       Serveur Node.js (Express 5)                PostgreSQL
┌──────────────────┐   fetch    ┌──────────────────────────────┐    pg     ┌───────────┐
│ index.html       │ ─────────▶ │ /api/auth/*   /api/tasks/*   │ ────────▶ │ users     │
│ styles.css       │   JSON     │ middlewares de sécurité      │           │ sessions  │
│ app.js, state.js │ ◀───────── │ express.static('public')     │ ◀──────── │ tasks     │
└──────────────────┘  + cookie  └──────────────────────────────┘           └───────────┘
```

- **L’interface** (dossier `public/`) : HTML, CSS et modules JavaScript, sans framework. Elle
  ne parle qu’à l’API, en JSON.
- **L’API** (dossier `src/`) : Express 5 valide les entrées, authentifie, autorise, et seule
  elle parle à la base.
- **La base** : PostgreSQL garde les données et garantit leur cohérence (clés étrangères,
  contraintes).

Le même serveur Express sert les fichiers de `public/` **et** l’API. L’interface et l’API ont
donc la **même origine** : pas de configuration CORS, un cookie de session `SameSite=Lax` qui
fonctionne naturellement, une CSP `default-src 'self'` facile à respecter.

### Les décisions et leurs raisons

| Décision | Raison | Ce qu’on accepte |
| --- | --- | --- |
| Même origine pour l’interface et l’API | Pas de CORS, cookie simple, CSP stricte | Un seul serveur à déployer |
| Session par cookie stockée en base | Révocation immédiate, rien de sensible côté client (compétence Authentification) | Une requête en base par appel |
| JavaScript sans framework | Tout est visible et explicable ; suffisant pour une page | Plus de code d’affichage écrit à la main |
| Mises à jour « pessimistes » : l’interface attend la réponse de l’API | L’affichage reflète toujours la base | Un court délai visible à chaque action |
| Requêtes SQL écrites dans les routes | Peu de routes, lecture directe | À extraire dans une couche d’accès aux données si le projet grandit |
| Migrations SQL versionnées | Le schéma évolue de façon reproductible | Une table `schema_migrations` en plus |

Ce tableau est précieux à l’oral : chaque décision a une raison **et** un coût. Une
architecture n’est pas « la meilleure » dans l’absolu, elle est adaptée à un besoin.

## Le contrat d’API

Le **contrat** décrit ce que l’API accepte et renvoie. On l’écrit avant de coder : l’interface
et l’API pourront ensuite être construites et testées séparément.

| Méthode et chemin | Corps attendu | Succès | Erreurs principales |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ email, password }` | 201 `{ user }` + cookie | 400 validation, 409 adresse prise |
| `POST /api/auth/login` | `{ email, password }` | 200 `{ user }` + nouveau cookie | 401, 429 + `Retry-After` |
| `POST /api/auth/logout` | aucun | 204, cookie effacé | — |
| `GET /api/auth/me` | aucun | 200 `{ user }` | 401 |
| `GET /api/tasks?status=…` | aucun ; `status` vaut `all` (défaut), `open` ou `done` | 200 tableau de tâches | 400 filtre inconnu, 401 |
| `POST /api/tasks` | `{ title }` | 201 tâche créée | 400, 401 |
| `PATCH /api/tasks/:id` | `{ title?, done? }` | 200 tâche modifiée | 400, 401, 404 |
| `DELETE /api/tasks/:id` | aucun | 204 | 401, 404 |
| `GET /api/health` | aucun | 200 `{ status: "ok" }` | 503 si la base ne répond pas |

Conventions communes à toutes les routes :

- une tâche est représentée par `{ id, title, done, created_at }` ;
- toute erreur renvoie `{ "error": "message en français" }` avec le bon code HTTP ;
- une tâche d’un autre utilisateur répond 404, comme une tâche inexistante ;
- les listes sont triées : tâches à faire d’abord, puis les plus récentes.

## Le modèle de données

Fichier `migrations/001_init.sql` :

```sql
-- 001_init.sql — comptes, sessions et tâches
CREATE TABLE users (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

CREATE TABLE tasks (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_owner_id_idx ON tasks (owner_id);
```

La base est la **dernière ligne de défense** : même si l’API oubliait une validation, un titre
vide ou une tâche sans propriétaire seraient refusés par les contraintes `CHECK` et
`NOT NULL`. Les cascades suppriment sessions et tâches avec leur utilisateur.

## L’organisation du projet

```text
taskboard/
├── package.json          dépendances et scripts
├── package-lock.json     versions exactes installées (versionné)
├── .env.example          variables attendues, valeurs factices (versionné)
├── .env, .env.test       valeurs réelles de développement et de test (jamais versionnés)
├── .gitignore
├── migrations/           évolutions du schéma, numérotées
│   └── 001_init.sql
├── scripts/
│   └── migrate.js        commande « npm run db:migrate »
├── src/                  le serveur
│   ├── config.js         lecture et validation de l’environnement
│   ├── migrate.js        application des migrations
│   ├── logger.js         journaux JSON
│   ├── security.js       en-têtes de sécurité, vérification d’origine
│   ├── password.js       ┐
│   ├── sessions.js       │ repris de la compétence Authentification
│   ├── auth.js           │
│   ├── login-limiter.js  ┘
│   ├── routes/
│   │   ├── auth.js       inscription, connexion, déconnexion
│   │   └── tasks.js      tâches de l’utilisateur connecté
│   ├── app.js            assemble l’application (sans la démarrer)
│   └── server.js         démarre le serveur
├── public/               l’interface, servie telle quelle
│   ├── index.html
│   ├── styles.css
│   ├── api.js            appels à l’API
│   ├── state.js          état de l’interface (fonctions pures)
│   └── app.js            affichage et événements
└── test/                 tests node:test
```

Deux principes guident ce découpage :

- **Séparer ce qui change pour des raisons différentes.** La configuration, la sécurité, les
  routes, l’affichage et l’état de l’interface évoluent indépendamment.
- **Séparer construire et démarrer.** `app.js` exporte `createApp({ pool, config, log })` sans
  écouter de port ; `server.js` crée les vraies ressources et démarre. Les tests pourront
  ainsi créer l’application avec une base de test et des journaux muets.

## Mettre en place le projet

```bash
mkdir taskboard && cd taskboard
npm init -y
npm install express@5 pg
mkdir -p migrations scripts src/routes public test
createdb taskboard
createdb taskboard_test
```

Remplace le contenu de `package.json` par :

```json
{
  "name": "taskboard",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch --env-file=.env src/server.js",
    "db:migrate": "node --env-file-if-exists=.env scripts/migrate.js",
    "test": "node --env-file-if-exists=.env.test --test --test-concurrency=1 \"test/**/*.test.js\""
  },
  "dependencies": {
    "express": "^5.3.0",
    "pg": "^8.23.1"
  }
}
```

Garde les numéros de version que `npm install` a réellement inscrits chez toi.

- `"type": "module"` : les fichiers `.js` sont des modules ES (`import`/`export`).
- `"private": true` : empêche une publication accidentelle sur le registre npm.
- `"engines"` documente la version de Node.js attendue.
- `start` : la commande de production, **sans** `--env-file` : en production, les variables
  viennent de la plateforme.
- `dev` : `--watch` redémarre le serveur à chaque modification ; `--env-file=.env` charge la
  configuration locale.
- `db:migrate` et `test` utilisent `--env-file-if-exists` : le fichier est lu s’il existe,
  sans erreur sinon (en intégration continue, les variables seront fournies autrement).
- `--test-concurrency=1` : les fichiers de test s’exécutent l’un après l’autre, car ils
  partagent la même base de test qu’ils vident.

### La configuration

`.env.example`, versionné, documente les variables :

```bash
# Copie ce fichier en .env et adapte les valeurs. Ne versionne jamais .env.
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres@localhost:5432/taskboard
APP_ORIGIN=http://localhost:3000
# Nombre de proxys inverses de confiance devant l’application (0 en local)
TRUST_PROXY=0
```

Copie-le en `.env` et adapte `DATABASE_URL`. Crée aussi `.env.test` avec une seule ligne,
`DATABASE_URL=postgres://postgres@localhost:5432/taskboard_test`. Puis `.gitignore` :

```text
node_modules/
.env
.env.test
backups/
```

`src/config.js` lit et valide l’environnement, en signalant toutes les erreurs d’un coup :

```js
// src/config.js — configuration lue dans l’environnement et validée au démarrage
export function loadConfig(env = process.env) {
  const errors = [];
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT doit être un entier entre 1 et 65535');
  }

  const databaseUrl = env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL doit commencer par postgres:// ou postgresql://');
  }

  const appOrigin = env.APP_ORIGIN ?? `http://localhost:${port}`;
  if (isProduction && !appOrigin.startsWith('https://')) {
    errors.push('APP_ORIGIN doit être une adresse https:// en production');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration invalide :\n- ${errors.join('\n- ')}`);
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    port,
    databaseUrl,
    appOrigin,
    secureCookies: isProduction,
    // Nombre de proxys de confiance devant l’application (0 en local)
    trustProxy: Number(env.TRUST_PROXY ?? 0),
  });
}
```

Toute la configuration passe par cet objet unique : aucun autre fichier ne lit `process.env`.
On sait ainsi, en un coup d’œil, de quoi l’application dépend.

### Les migrations

On a appris à versionner le schéma. Voici un exécuteur minimal : il note dans une table
`schema_migrations` les fichiers déjà appliqués, et applique les autres, chacun dans une
transaction.

```js
// src/migrate.js — applique les migrations SQL qui ne l’ont pas encore été
import { readdir, readFile } from 'node:fs/promises';

const migrationsDir = new URL('../migrations/', import.meta.url);

export async function migrate(pool, log = () => {}) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
  const applied = new Set(
    (await pool.query('SELECT name FROM schema_migrations')).rows.map((row) => row.name),
  );

  for (const name of files) {
    if (applied.has(name)) continue;
    const sql = await readFile(new URL(name, migrationsDir), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      log(`migration appliquée : ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

```js
// scripts/migrate.js — commande « npm run db:migrate »
import pg from 'pg';
import { loadConfig } from '../src/config.js';
import { migrate } from '../src/migrate.js';

const config = loadConfig();
const pool = new pg.Pool({ connectionString: config.databaseUrl });
try {
  await migrate(pool, console.log);
  console.log('Base à jour');
} finally {
  await pool.end();
}
```

Lance-le deux fois :

```bash
npm run db:migrate
npm run db:migrate
```

```text
> taskboard@1.0.0 db:migrate
> node --env-file-if-exists=.env scripts/migrate.js

migration appliquée : 001_init.sql
Base à jour

> taskboard@1.0.0 db:migrate
> node --env-file-if-exists=.env scripts/migrate.js

Base à jour
```

La seconde exécution ne fait rien : l’opération est **idempotente**. C’est indispensable pour
la lancer à chaque déploiement sans risque. Les noms numérotés (`001_`, `002_`) garantissent
l’ordre ; le tri alphabétique de `sort()` suffit tant qu’on garde trois chiffres.

:::warning[Une migration appliquée ne se modifie plus]
Une fois qu’un fichier a été appliqué sur une base (la tienne, celle d’un collègue, la
production), ne le modifie plus : l’exécuteur ne le relira jamais. Pour changer le schéma,
écris une **nouvelle** migration.

:::

## Pièges et idées reçues

- **Commencer par l’interface « pour voir ».** Sans contrat d’API, l’interface invente des
  formats que l’API devra ensuite imiter. Le contrat d’abord, même en dix lignes.
- **Lire `process.env` partout.** Une variable mal orthographiée dans un fichier oublié ne se
  voit qu’en production. Un seul module de configuration, validé au démarrage.
- **Un seul fichier `server.js` de 500 lignes.** Il devient impossible à tester et à relire.
  Sépare les responsabilités dès le départ.
- **Partager la base de développement avec les tests.** Les tests vident les tables : ils
  effaceraient tes données. Une base dédiée, `taskboard_test`.
- **Oublier ce qui est hors périmètre.** Sans liste explicite, chaque idée devient « juste une
  petite fonctionnalité en plus ».

## Exercices

### Exercice 1 — Faire évoluer le contrat

On veut ajouter une **date d’échéance facultative** aux tâches. Indique ce qui change dans le
contrat d’API, écris la migration et lance-la.

:::solution
Contrat :

- une tâche devient `{ id, title, done, due_on, created_at }`, avec `due_on` au format
  `AAAA-MM-JJ` ou `null` ;
- `POST /api/tasks` et `PATCH /api/tasks/:id` acceptent un champ `due_on` facultatif ; une date
  invalide renvoie 400 ;
- éventuellement un nouveau filtre `status=late` pour les tâches à faire dont l’échéance est
  passée.

Migration `migrations/002_due_on.sql` :

```sql
-- 002_due_on.sql — date d’échéance facultative
ALTER TABLE tasks ADD COLUMN due_on date;
```

```bash
npm run db:migrate
```

```text
migration appliquée : 002_due_on.sql
Base à jour
```

(précédé des deux lignes d’en-tête de `npm run`). La colonne est nullable : les tâches
existantes reçoivent `NULL`, ce qui correspond à « pas d’échéance ». On ne modifie pas
`001_init.sql`, déjà appliquée. Attention au piège côté Node.js : `pg` convertit le type
`date` en objet `Date` JavaScript, à minuit **dans le fuseau du serveur** ; pour renvoyer
`AAAA-MM-JJ`, on peut sélectionner `to_char(due_on, 'YYYY-MM-DD') AS due_on`.

:::

### Exercice 2 — Placer une fonctionnalité dans l’architecture

Un utilisateur demande : « je voudrais voir, en haut de la page, le nombre de tâches terminées
cette semaine ». Décris, couche par couche, ce que tu modifierais, et ce que tu **ne**
modifierais **pas**.

:::solution
- **Base** : rien. `done` et `created_at` existent, mais pas la date de fin. Pour « terminées
  cette semaine », il faut savoir **quand** une tâche a été terminée : nouvelle migration
  ajoutant `done_at timestamptz`, renseignée par l’API quand `done` passe à `true` (et remise à
  `NULL` quand elle repasse à `false`).
- **API** : `PATCH /api/tasks/:id` met à jour `done_at` ; une nouvelle route, par exemple
  `GET /api/tasks/stats`, renvoie le nombre de tâches terminées depuis le début de la semaine,
  toujours filtré par `owner_id`. Contrat mis à jour.
- **Interface** : `api.js` ne change pas ; `state.js` gagne un champ `stats` ; `app.js`
  l’affiche et le recharge après chaque modification.
- **Tests** : un test d’API pour la statistique (avec deux utilisateurs), un test de la
  fonction d’affichage.
- **Ne change pas** : l’authentification, la configuration, la sécurité, les migrations
  existantes.

L’intérêt de l’architecture en couches apparaît ici : la demande touche chaque couche, mais
chaque modification reste petite et localisée.

:::

## Récapitulatif

- Écrire le besoin (récits utilisateur), les exigences non fonctionnelles et ce qui est hors
  périmètre avant de coder.
- Trois couches : interface statique dans `public/`, API Express dans `src/`, PostgreSQL. Une
  seule origine : pas de CORS, cookie `SameSite=Lax`, CSP stricte.
- Chaque décision d’architecture a une raison et un coût : sache les dire.
- Le contrat d’API fixe routes, corps, codes de succès et d’erreur, et le format des erreurs.
- La base protège la cohérence (contraintes, clés étrangères, cascades).
- Projet organisé par responsabilité ; `createApp` construit, `server.js` démarre.
- Scripts npm `start`, `dev`, `db:migrate`, `test` ; configuration validée dans un seul
  module ; migrations versionnées et idempotentes.
