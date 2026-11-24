---
title: Automatiser les vérifications avec l’intégration continue
summary: Ajouter une vérification statique, écrire un workflow GitHub Actions qui installe, vérifie, teste contre un service PostgreSQL et construit l’image à chaque push, avec déclencheurs, cache, actions épinglées et secrets du dépôt.
durationMinutes: 70
sources:
  - title: GitHub Docs — Workflow syntax for GitHub Actions
    url: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
  - title: GitHub Docs — Creating PostgreSQL service containers
    url: https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services/creating-postgresql-service-containers
  - title: GitHub Docs — Using secrets in GitHub Actions
    url: https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions
  - title: GitHub Docs — Security hardening for GitHub Actions
    url: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
---

## Le problème : un test qu’on oublie de lancer ne protège rien

Le livre d’or a des tests. Encore faut-il les lancer : avant chaque commit, sur chaque branche,
pour chaque pull request d’un collègue, avec une base propre et la bonne version de Node.js.
« Ça passait chez moi » ne dit rien de l’état du code fusionné.

L’**intégration continue** (CI) exécute automatiquement ces vérifications sur une machine neuve,
à chaque `push` et à chaque pull request. Le résultat s’affiche à côté du commit ou de la pull
request : une coche verte, ou une croix rouge avec le journal de l’étape qui a échoué. On
utilise **GitHub Actions**, intégré à GitHub ; GitLab CI, Forgejo Actions et d’autres
fonctionnent sur les mêmes principes.

Notre CI fera quatre choses, de la plus rapide à la plus lente : installer les dépendances
exactes, vérifier le code sans l’exécuter, lancer les tests contre un vrai PostgreSQL, construire
l’image Docker.

## Une vérification statique : ESLint

Un **linter** lit le code sans l’exécuter et signale les erreurs probables : variable non
définie, import inutilisé, code inaccessible. **ESLint** est l’outil de référence en
JavaScript. Installe-le en dépendance de **développement** (il ne sert pas en production) :

```bash
npm install --save-dev eslint @eslint/js globals
```

Les trois paquets : ESLint lui-même, ses règles recommandées, et la liste des variables
globales de Node.js et du navigateur (`process`, `document`…). Configuration à la racine :

```js
// eslint.config.js — règles recommandées, globales Node.js ou navigateur selon le dossier
import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
]);
```

Et un script dans `package.json` : `"lint": "eslint ."`. Si le gestionnaire d’erreurs de
`src/app.js` s’appelait encore `(error, req, res, next)` :

```bash
npm run lint
```

```text
> guestbook@1.0.0 lint
> eslint .


/chemin/vers/guestbook/src/app.js
  60:29  error  'next' is defined but never used  no-unused-vars

✖ 1 problem (1 error, 0 warnings)
```

ESLint affiche le chemin absolu du fichier, la ligne et la colonne, le message et le nom de la
règle, puis sort avec le code 1. Ici, le paramètre est **nécessaire** (Express reconnaît un
gestionnaire d’erreurs à ses quatre paramètres) : on le renomme `_next`, et on l’indique à la
règle en ajoutant à la configuration, juste après `js.configs.recommended` :

```js
  {
    // Un paramètre préfixé par _ est volontairement inutilisé (gestionnaire d’erreurs Express)
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
```

`npm run lint` ne produit alors que ses deux lignes d’en-tête et sort avec le code 0. Désactiver
une règle doit toujours être une décision ciblée et commentée, pas un réflexe pour faire taire
l’outil.

## Les tests

Deux fichiers. Les tests de configuration, unitaires :

```js
// test/config.test.js — la configuration est validée avant tout démarrage
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

const valid = { DATABASE_URL: 'postgres://app@localhost:5432/guestbook' };

test('valeurs par défaut et conversions', () => {
  const config = loadConfig({ ...valid, PORT: '8080' });
  assert.equal(config.port, 8080);
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.trustProxy, 0);
});

test('toutes les erreurs sont signalées d’un coup', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'Production', PORT: 'abc' }),
    /NODE_ENV doit valoir[\s\S]*PORT doit[\s\S]*DATABASE_URL doit/,
  );
});
```

Et les tests d’intégration de l’API, contre une vraie base, avec le garde-fou de la compétence
« Application full-stack » :

```js
// test/api.test.js — routes de l’API contre une vraie base de test
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { migrate } from '../src/migrate.js';

let pool;
let server;
let baseUrl;

before(async () => {
  const config = loadConfig({ ...process.env, NODE_ENV: 'test' });
  // Garde-fou : les tests vident la table, jamais ailleurs que sur une base de test
  if (!new URL(config.databaseUrl).pathname.includes('test')) {
    throw new Error('DATABASE_URL doit désigner une base de test');
  }
  pool = new pg.Pool({ connectionString: config.databaseUrl });
  await migrate(pool);
  server = createApp({ pool, config, log: () => {} }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(() => pool.query('TRUNCATE messages RESTART IDENTITY'));

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool?.end();
});

test('un message publié apparaît dans la liste', async () => {
  const created = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'Ada', body: 'Bravo pour le site' }),
  });
  assert.equal(created.status, 201);
  const list = await (await fetch(`${baseUrl}/api/messages`)).json();
  assert.deepEqual(
    list.map((message) => [message.author, message.body]),
    [['Ada', 'Bravo pour le site']],
  );
});

test('un message vide est refusé', async () => {
  const response = await fetch(`${baseUrl}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: 'Ada', body: '   ' }),
  });
  assert.equal(response.status, 400);
});

test('les routes de santé répondent', async () => {
  assert.equal((await fetch(`${baseUrl}/api/health/live`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/health/ready`)).status, 200);
});
```

En local, `.env.test` contient `DATABASE_URL=postgres://postgres@localhost:5432/guestbook_test`
(crée la base avec `createdb guestbook_test`). En CI, il n’y aura pas de fichier : la variable
viendra du workflow.

## GitHub Actions en cinq mots

| Terme | Sens |
| --- | --- |
| **Workflow** | Un fichier YAML dans `.github/workflows/`, qui décrit quand et quoi exécuter |
| **Événement** | Ce qui déclenche le workflow : `push`, `pull_request`, un horaire… (clé `on`) |
| **Job** | Un ensemble d’étapes exécutées sur **une** machine neuve (un *runner*) ; les jobs tournent en parallèle sauf dépendance (`needs`) |
| **Étape** (*step*) | Une commande shell (`run`) ou une **action** réutilisable (`uses`) |
| **Action** | Un module publié dans un dépôt GitHub, par exemple `actions/checkout`, qui récupère ton code |

## Le workflow

```yaml
# .github/workflows/ci.yml — vérifie chaque push sur main et chaque pull request
name: CI

on:
  push:
    branches: [main]
  pull_request:

# Le jeton automatique GITHUB_TOKEN ne peut que lire le dépôt
permissions:
  contents: read

# Un nouveau push annule l’exécution précédente de la même branche
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    services:
      postgres:
        image: postgres:18
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: guestbook_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    env:
      # Base jetable créée pour ce job : ce mot de passe n’est pas un secret
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/guestbook_test
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test

  image:
    needs: test
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: docker/setup-buildx-action@v4
      - uses: docker/build-push-action@v7
        with:
          push: false
          tags: guestbook:${{ github.sha }}
          build-args: APP_VERSION=${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Les déclencheurs

- `push` sur `main` : chaque commit fusionné est vérifié.
- `pull_request` : chaque pull request est vérifiée **avant** la fusion ; c’est là que la CI
  rend le plus service. GitHub peut ensuite **exiger** que ce workflow passe avant d’autoriser
  la fusion (règles de protection de branche).
- Sans filtre `branches` sur `pull_request`, toutes les pull requests sont concernées.

D’autres événements existent : `schedule` (un horaire au format cron, utile pour une analyse
hebdomadaire des dépendances, leçon 6), `workflow_dispatch` (un bouton pour lancer à la main),
`push` avec `tags` (publier une version, plus bas).

`concurrency` regroupe les exécutions par branche : si tu pousses deux commits coup sur coup,
la vérification du premier, devenue inutile, est annulée. `timeout-minutes` évite qu’un test
bloqué consomme des heures de machine.

### Le service PostgreSQL

`services` démarre des conteneurs à côté du job, le temps du job. Le bloc ressemble à un service
Compose : image, variables, ports. Les étapes du job s’exécutent directement sur la machine
virtuelle du runner ; le port publié `5432:5432` rend donc la base joignable sur
`localhost:5432`.

`options` passe des options à `docker run`, dont un contrôle de santé : GitHub attend que le
service soit sain avant de lancer les étapes, comme `condition: service_healthy` dans Compose.

`DATABASE_URL`, défini dans `env` au niveau du job, est visible de toutes les étapes. Son mot de
passe n’est pas un secret : la base est créée vide pour ce job, n’est joignable que depuis lui,
et disparaît à la fin. Le nom de la base contient `test`, comme l’exige le garde-fou.

### Les étapes

1. `actions/checkout` récupère le code du commit à vérifier.
2. `actions/setup-node` installe Node.js 24. `cache: npm` conserve le cache de npm d’une
   exécution à l’autre, avec une clé calculée à partir de `package-lock.json` : tant que les
   dépendances ne changent pas, `npm ci` n’a plus besoin de les télécharger.
3. `npm ci` : installation exacte, **avec** les dépendances de développement (ESLint en fait
   partie). Il échoue si `package-lock.json` n’est pas à jour : la CI détecte le collègue qui a
   modifié `package.json` sans commiter le fichier de verrouillage.
4. `npm run lint`, puis `npm test`. Chaque étape échoue si sa commande renvoie un code non nul ;
   le job s’arrête alors, et les étapes suivantes ne s’exécutent pas. Le journal de `npm test`
   contient la même sortie que chez toi.

### Le job `image`

`needs: test` : l’image n’est construite que si les tests passent. Ce job n’a pas besoin de
`actions/checkout` : `docker/build-push-action` construit par défaut à partir du dépôt Git, au
commit qui a déclenché le workflow, en respectant `.dockerignore`.

- `docker/setup-buildx-action` prépare le constructeur BuildKit nécessaire au cache.
- `push: false` : on vérifie seulement que l’image se construit. Une image qui ne se construit
  plus (un fichier oublié dans un `COPY`, une dépendance cassée) est détectée avant le
  déploiement.
- `tags` et `build-args` utilisent `github.sha`, l’empreinte du commit : chaque image construite
  porte l’identité exacte de son code.
- `cache-from` et `cache-to` avec `type=gha` stockent les couches dans le cache de GitHub
  Actions : les couches inchangées (dont `npm ci`) ne sont pas reconstruites. `mode=max` garde
  aussi les couches des étapes intermédiaires, comme `deps`.

## Épingler les actions

`uses: actions/checkout@v7` exécute **du code d’un autre dépôt** avec accès à ton code et à
tes secrets. La partie après `@` choisit quelle version :

| Référence | Exemple | Ce que tu acceptes |
| --- | --- | --- |
| Version majeure | `actions/checkout@v7` | Toute version 7.x que l’auteur publiera, sans changement incompatible annoncé |
| Version exacte | `actions/checkout@v7.0.1` | Une version précise, si l’étiquette n’est pas déplacée |
| Empreinte de commit | `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` | Exactement ce code, pour toujours |

Une étiquette Git peut être déplacée par quiconque contrôle le dépôt de l’action ; une empreinte
de commit, non. Les actions officielles de GitHub (`actions/…`) et de Docker (`docker/…`) sont
raisonnablement épinglées sur leur version majeure ; pour une action tierce moins connue,
l’empreinte est recommandée par le guide de sécurité de GitHub. On ajoute alors la version en
commentaire pour rester lisible :

```yaml
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
```

Pour vérifier les versions disponibles et retrouver l’empreinte :

```bash
git ls-remote --tags https://github.com/actions/checkout | grep -E 'refs/tags/v7'
```

```text
3d3c42e5aac5ba805825da76410c181273ba90b1	refs/tags/v7
9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0	refs/tags/v7.0.0
3d3c42e5aac5ba805825da76410c181273ba90b1	refs/tags/v7.0.1
```

`v7` et `v7.0.1` désignent le même commit : l’étiquette majeure suit la dernière version 7.
Les versions de ce workflow (`checkout@v7`, `setup-node@v7`, `setup-buildx-action@v4`,
`build-push-action@v7`) étaient les dernières majeures au moment de la rédaction ; vérifie-les
de la même façon. La leçon 6 montre comment être prévenu des nouvelles versions.

## Les secrets du dépôt

Notre CI n’a besoin d’aucun secret. Dès qu’un workflow doit publier une image, déployer ou
appeler un service payant, il en faut un. On l’enregistre dans les paramètres du dépôt
(**Settings**, **Secrets and variables**, **Actions**), jamais dans le fichier YAML, et on le
lit avec l’expression `${{ secrets.NOM }}`.

GitHub chiffre ces secrets, les masque (`***`) s’ils apparaissent dans un journal, et **ne les
fournit pas** aux workflows déclenchés par une pull request venant d’un fork : sans cela,
n’importe qui pourrait ouvrir une pull request qui affiche tes secrets.

Exemple : un second workflow qui publie l’image dans le registre de GitHub (GHCR) quand on pousse
une étiquette de version.

```yaml
# .github/workflows/release.yml — publie l’image quand on pousse une étiquette v1.2.3
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    permissions:
      contents: read
      packages: write
    steps:
      - uses: docker/setup-buildx-action@v4
      - uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v7
        with:
          push: true
          tags: ghcr.io/ton-compte/guestbook:${{ github.ref_name }}
          build-args: APP_VERSION=${{ github.ref_name }}
          cache-from: type=gha
```

- `secrets.GITHUB_TOKEN` est un jeton créé automatiquement pour chaque exécution, valable le
  temps du job. Ses droits sont ceux de `permissions` : le bloc global les réduit à la lecture,
  et ce job seul reçoit en plus `packages: write`, nécessaire pour publier. C’est le **moindre
  privilège** appliqué à la CI.
- Pour un registre extérieur, tu créerais un jeton chez ce registre, enregistré comme secret
  `REGISTRY_TOKEN`, et lu avec `${{ secrets.REGISTRY_TOKEN }}`.
- `github.ref_name` vaut le nom de l’étiquette poussée, par exemple `v1.1.0`. Remplace
  `ton-compte` par ton identifiant GitHub, en minuscules (le registre l’exige).

N’affiche jamais un secret volontairement (`echo`), même « pour vérifier » : le masquage ne
couvre pas toutes les transformations (un secret encodé en base64 n’est plus reconnu).

## Vérifier un workflow avant de le pousser

Une faute de frappe dans un workflow ne se voit qu’après le `push`, quand GitHub refuse le
fichier ou qu’une étape ne fait pas ce qu’on croit. L’outil `actionlint`, téléchargeable depuis
la page des versions de son dépôt (`rhysd/actionlint`), vérifie les workflows sur ton poste.
Sur un workflow fautif :

```text
.github/workflows/ci.yml:4:5: unexpected key "branch" for "push" section. expected one of "branches", "branches-ignore", "paths", "paths-ignore", "tags", "tags-ignore", "types", "workflows" [syntax-check]
  |
4 |     branch: [main]
  |     ^~~~~~~
.github/workflows/ci.yml:12:22: undefined variable "secret". available variables are "env", "github", "inputs", "job", "matrix", "needs", "runner", "secrets", "steps", "strategy", "vars" [expression]
   |
12 |           TOKEN: ${{ secret.API_TOKEN }}
   |                      ^~~~~~~~~~~~~~~~
```

Deux fautes de frappe que tu n’aurais découvertes qu’après le `push`, en lisant le message
d’erreur de GitHub au lieu de voir tes vérifications tourner.

Tu peux aussi rejouer les étapes du job `test` sur ton poste, avec Docker :

```bash
docker run -d --name ci-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=guestbook_test \
  -p 5432:5432 postgres:18
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/guestbook_test
npm ci && npm run lint && npm test
docker rm -f ci-postgres
```

(si un PostgreSQL local occupe déjà le port 5432, publie sur un autre port, par exemple
`5433:5432`, et adapte l’URL). La sortie de `npm test` est celle qu’affichera GitHub :

```text
> guestbook@1.0.0 test
> node --env-file-if-exists=.env.test --test --test-concurrency=1 "test/**/*.test.js"

.env.test not found. Continuing without it.
.env.test not found. Continuing without it.
✔ un message publié apparaît dans la liste (72.406423ms)
✔ un message vide est refusé (6.158038ms)
✔ les routes de santé répondent (6.159987ms)
.env.test not found. Continuing without it.
✔ valeurs par défaut et conversions (0.700104ms)
✔ toutes les erreurs sont signalées d’un coup (0.406797ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 288.007322
```

Les lignes `.env.test not found` sont normales : `--env-file-if-exists` le signale, puis
continue avec la variable déjà présente dans l’environnement.

## Pièges et idées reçues

- **Écrire un secret dans le YAML** « parce que le dépôt est privé » : il est dans
  l’historique Git, comme n’importe quel fichier.
- **`permissions` absent** : le jeton reçoit les droits par défaut du dépôt ou de
  l’organisation, parfois en écriture. Déclare le minimum, en haut du fichier.
- **`npm install` en CI** : il peut modifier les versions résolues et masquer un fichier de
  verrouillage pas à jour ; `npm ci` les détecte.
- **Des tests qui dépendent d’un `.env.test` présent seulement sur ton poste** : en CI, toute la
  configuration vient du workflow.
- **Une action tierce épinglée sur `@main`** : chaque exécution prend le code du moment, sans
  revue. Version, voire empreinte de commit.
- **Ignorer une CI rouge** pour « fusionner vite » : elle ne sert que si son verdict bloque.

## Exercices

### Exercice 1 — Ce que voit ESLint, ce qu’il ne voit pas

Prévois la sortie de `npm run lint` sur ce fichier, puis indique le défaut qu’ESLint ne signale
**pas** et comment la suite de tests l’aurait détecté.

```js
// src/routes.js — extrait proposé par un assistant
import path from 'node:path';

export function listHandler(pool) {
  return async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'limit invalide' });
    }
    const result = pool.query('SELECT id, author FROM messages LIMIT $1', [limit]);
    res.json(results.rows);
  };
}
```

:::solution
```text
/chemin/vers/guestbook/src/routes.js
   2:8   error  'path' is defined but never used             no-unused-vars
  10:11  error  'result' is assigned a value but never used  no-unused-vars
  11:14  error  'results' is not defined                     no-undef

✖ 3 problems (3 errors, 0 warnings)
```

- `path` est importé sans être utilisé : code mort.
- `results` (avec un `s`) n’existe pas : à l’exécution, `ReferenceError` et réponse 500. ESLint
  le trouve sans lancer le code.
- `result` est donc inutilisé.

Le défaut non signalé : `pool.query(…)` n’est pas attendu avec `await`. Même après correction de
la faute de frappe, `result` serait une **promesse**, et `result.rows` vaudrait `undefined` ; la
route répondrait 200 avec un corps vide. Les règles recommandées d’ESLint ne le voient pas (des
règles supplémentaires existent, avec une configuration plus avancée). Un test d’intégration qui
publie un message puis vérifie le contenu de la liste, comme `un message publié apparaît dans la
liste`, échoue immédiatement. Le linter et les tests sont complémentaires.

:::

### Exercice 2 — Faire évoluer le workflow

Modifie `ci.yml` pour que : (1) le workflow puisse aussi être lancé à la main depuis l’interface
de GitHub ; (2) les tests tournent sur Node.js 24 **et** sur la prochaine version que tu veux
anticiper, par exemple 26, sans dupliquer le job ; (3) un changement qui ne touche que des
fichiers Markdown ne déclenche pas la CI sur `push`. Vérifie ton fichier avec `actionlint`.

:::solution
```yaml
on:
  push:
    branches: [main]
    paths-ignore: ['**.md']
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    strategy:
      matrix:
        node: [24, 26]
    # services et env inchangés
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

- `workflow_dispatch` ajoute le bouton **Run workflow** dans l’onglet Actions.
- `strategy.matrix` crée **deux** jobs à partir d’un seul, un par valeur de `node`, exécutés en
  parallèle ; chacun a son propre service PostgreSQL. `${{ matrix.node }}` lit la valeur
  courante.
- `paths-ignore` sous `push` : si **tous** les fichiers modifiés correspondent au motif, le
  workflow n’est pas déclenché. Attention si une protection de branche exige ce workflow : une
  pull request qui ne le déclencherait pas resterait bloquée ; c’est pour cela qu’on ne filtre
  ici que `push`.
- Le job `image` a toujours `needs: test` : il attend que les deux variantes réussissent.

`actionlint` ne doit rien afficher et sortir avec le code 0.

:::

## Récapitulatif

- La CI exécute à chaque `push` et pull request, sur une machine neuve : `npm ci`, ESLint,
  tests contre un vrai PostgreSQL, construction de l’image.
- ESLint (dépendance de développement) trouve variables non définies et code mort sans
  exécuter le code ; il ne remplace pas les tests.
- Un workflow : déclencheurs (`on`), jobs sur des runners, étapes `run` ou `uses` ; `needs`
  pour l’ordre ; `concurrency` et `timeout-minutes` pour ne pas gaspiller.
- `services` fournit un PostgreSQL jetable, attendu grâce à son contrôle de santé ; son mot de
  passe n’est pas un secret.
- Cache : `cache: npm` de `setup-node` (clé sur `package-lock.json`) et `type=gha` pour les
  couches Docker.
- Actions épinglées sur une version majeure vérifiée, ou sur une empreinte de commit pour les
  actions tierces ; jamais `@main`.
- Secrets dans les paramètres du dépôt, lus par `${{ secrets.NOM }}`, absents des pull requests
  de forks ; `permissions` au minimum, élargies job par job.
