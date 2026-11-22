---
title: Tester les parcours essentiels
summary: Écrire une suite de tests node:test qui démarre l’application sur une base dédiée, rejoue le parcours d’un utilisateur de bout en bout et protège les règles de sécurité.
durationMinutes: 70
sources:
  - title: Node.js — Test runner (node:test)
    url: https://nodejs.org/api/test.html
  - title: Node.js — Assert (node:assert)
    url: https://nodejs.org/api/assert.html
  - title: MDN — Headers.getSetCookie()
    url: https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
---

## Le problème : vérifier à la main ne passe pas à l’échelle

À chaque modification, il faudrait refaire tout le tour de l’application : créer un compte,
ajouter, cocher, filtrer, supprimer, se déconnecter, vérifier qu’un autre compte ne voit rien,
que les erreurs sont bien gérées… Personne ne le fait vraiment après la troisième fois. Et les
régressions les plus graves, comme une faille de contrôle d’accès, ne se voient **jamais** en
utilisant l’application normalement.

Tu as appris les tests unitaires et d’intégration dans « Tester son code ». Cette leçon
construit la suite de tests du projet, organisée en trois niveaux :

| Niveau | Ce qu’il vérifie | Dans le projet |
| --- | --- | --- |
| Unitaire | Une fonction pure, sans réseau ni base | `state.test.js` : les transformations de l’état de l’interface |
| Intégration | Une route avec la vraie base | `auth.test.js`, `tasks.test.js` |
| Bout en bout | Un **parcours** complet d’utilisateur, du premier appel au dernier | `journey.test.js` |

On écrit beaucoup de tests rapides en bas, quelques-uns plus lents en haut. Le parcours de bout
en bout passe ici par l’API HTTP, exactement comme le ferait l’interface ; la fin de la leçon
explique comment aller jusqu’au navigateur.

## L’outillage : `test/helpers.js`

Trois besoins reviennent dans tous les fichiers : démarrer l’application sur une base de test,
remettre la base à zéro, et simuler un navigateur qui garde son cookie de session.

```js
// test/helpers.js — démarre l’application sur une base de test et simule des navigateurs
import assert from 'node:assert/strict';
import pg from 'pg';
import { loadConfig } from '../src/config.js';
import { createApp } from '../src/app.js';
import { migrate } from '../src/migrate.js';

export async function startTestServer() {
  const config = loadConfig({ ...process.env, NODE_ENV: 'test' });
  // Garde-fou : les tests vident les tables, jamais sur une autre base que celle de test
  if (!new URL(config.databaseUrl).pathname.includes('test')) {
    throw new Error('DATABASE_URL doit désigner une base de test (son nom doit contenir « test »)');
  }
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  await migrate(pool);
  const app = createApp({ pool, config, log: () => {} }); // journaux muets pendant les tests
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://localhost:${server.address().port}`;

  return {
    baseUrl,
    pool,
    async reset() {
      await pool.query('TRUNCATE users, sessions, tasks RESTART IDENTITY CASCADE');
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await pool.end();
    },
  };
}

// Un « navigateur » minimal : garde le cookie de session entre les requêtes
export function createClient(baseUrl) {
  let cookie = null;
  return async function request(method, path, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.getSetCookie()[0];
    if (setCookie) {
      const [pair] = setCookie.split(';');
      cookie = pair.endsWith('=') ? null : pair; // cookie vidé à la déconnexion
    }
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data, headers: response.headers };
  };
}

export const PASSWORD = 'une phrase de passe assez longue';

export async function signUp(baseUrl, email) {
  const request = createClient(baseUrl);
  const { status } = await request('POST', '/api/auth/register', { email, password: PASSWORD });
  assert.equal(status, 201);
  return request;
}
```

- **`createApp` avec un port 0** : le système choisit un port libre ; les tests ne gênent pas un
  serveur de développement déjà lancé. On attend l’événement `listening` avant de continuer.
- **`log: () => {}`** : les journaux sont muets pendant les tests, la sortie reste lisible.
- **`migrate(pool)`** : la base de test est créée vide une fois (`createdb taskboard_test`) ;
  les tests appliquent eux-mêmes les migrations, toujours à jour.
- **Le garde-fou** : `reset()` vide toutes les tables. Si quelqu’un lance les tests avec la
  base de développement (ou pire), le garde-fou refuse de démarrer.
- **`createClient`** est un mini-navigateur : il garde le cookie reçu dans `Set-Cookie` et le
  renvoie dans `Cookie`, et l’oublie quand l’API l’efface à la déconnexion (valeur vide).
  `headers.getSetCookie()` renvoie les en-têtes `Set-Cookie` sous forme de tableau.

## Le parcours de bout en bout

Un seul test, long, qui raconte l’histoire d’un utilisateur. Il échoue dès qu’un maillon du
parcours casse.

```js
// test/journey.test.js — le parcours essentiel d’un utilisateur, de bout en bout par HTTP
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, createClient, startTestServer } from './helpers.js';

let server;
before(async () => {
  server = await startTestServer();
  await server.reset();
});
after(() => server?.stop());

test('inscription, tâches, déconnexion, reconnexion', async () => {
  const browser = createClient(server.baseUrl);

  // 1. Visiteur anonyme
  assert.equal((await browser('GET', '/api/auth/me')).status, 401);

  // 2. Inscription : la session est ouverte
  const signup = await browser('POST', '/api/auth/register', {
    email: ' Ada@Example.fr ',
    password: PASSWORD,
  });
  assert.equal(signup.status, 201);
  assert.deepEqual(signup.data, { user: { id: 1, email: 'ada@example.fr' } });
  assert.match(signup.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);

  // 3. Création, modification, filtre
  const bread = await browser('POST', '/api/tasks', { title: 'Acheter du pain' });
  const review = await browser('POST', '/api/tasks', { title: 'Réviser les promesses' });
  assert.equal(bread.status, 201);
  assert.equal(review.data.done, false);

  const done = await browser('PATCH', `/api/tasks/${bread.data.id}`, { done: true });
  assert.equal(done.data.done, true);
  assert.equal(done.data.title, 'Acheter du pain'); // le titre n’a pas changé

  const open = await browser('GET', '/api/tasks?status=open');
  assert.deepEqual(open.data.map((task) => task.title), ['Réviser les promesses']);

  // 4. Suppression
  assert.equal((await browser('DELETE', `/api/tasks/${review.data.id}`)).status, 204);
  const all = await browser('GET', '/api/tasks');
  assert.deepEqual(all.data.map((task) => task.title), ['Acheter du pain']);

  // 5. Déconnexion : plus aucun accès
  assert.equal((await browser('POST', '/api/auth/logout')).status, 204);
  assert.equal((await browser('GET', '/api/tasks')).status, 401);

  // 6. Reconnexion : les données sont toujours là
  const login = await browser('POST', '/api/auth/login', {
    email: 'ada@example.fr',
    password: PASSWORD,
  });
  assert.equal(login.status, 200);
  assert.equal((await browser('GET', '/api/tasks')).data.length, 1);
});
```

Les commentaires numérotés suivent les récits utilisateur de la leçon 1 : un test lisible
sert aussi de **documentation** du comportement attendu. `assert.match` vérifie que le cookie
porte bien les attributs de sécurité ; `assert.deepEqual` compare des structures entières.

## Les tests d’intégration

```js
// test/tasks.test.js — validation et isolation des tâches
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, signUp, startTestServer } from './helpers.js';

let server;
before(async () => {
  server = await startTestServer();
});
beforeEach(() => server.reset());
after(() => server?.stop());

test('les tâches d’un utilisateur sont invisibles et intouchables pour un autre', async () => {
  const ada = await signUp(server.baseUrl, 'ada@example.fr');
  const bob = await signUp(server.baseUrl, 'bob@example.fr');
  const { data: task } = await ada('POST', '/api/tasks', { title: 'Privé' });

  assert.deepEqual((await bob('GET', '/api/tasks')).data, []);
  assert.equal((await bob('PATCH', `/api/tasks/${task.id}`, { done: true })).status, 404);
  assert.equal((await bob('DELETE', `/api/tasks/${task.id}`)).status, 404);
  assert.equal((await ada('GET', '/api/tasks')).data[0].done, false);
});

test('les entrées invalides sont refusées avec un message', async () => {
  const ada = await signUp(server.baseUrl, 'ada@example.fr');
  const cases = [
    ['POST', '/api/tasks', { title: '   ' }, 400],
    ['POST', '/api/tasks', { title: 'x'.repeat(201) }, 400],
    ['GET', '/api/tasks?status=late', undefined, 400],
    ['PATCH', '/api/tasks/1', { done: 'oui' }, 400],
    ['PATCH', '/api/tasks/abc', { done: true }, 404],
    ['DELETE', '/api/tasks/999', undefined, 404],
  ];
  for (const [method, path, body, expected] of cases) {
    const response = await ada(method, path, body);
    assert.equal(response.status, expected, `${method} ${path}`);
    assert.equal(typeof response.data.error, 'string');
  }
});

test('une requête modifiante venue d’une autre origine est refusée', async () => {
  const response = await fetch(`${server.baseUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    body: JSON.stringify({ title: 'x' }),
  });
  assert.equal(response.status, 403);
});

test('les en-têtes de sécurité sont présents', async () => {
  const anonymous = createClient(server.baseUrl);
  const { headers } = await anonymous('GET', '/api/health');
  assert.match(headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-powered-by'), null);
});
```

```js
// test/auth.test.js — comptes et sessions
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { PASSWORD, createClient, signUp, startTestServer } from './helpers.js';

let server;
before(async () => {
  server = await startTestServer();
});
beforeEach(() => server.reset());
after(() => server?.stop());

test('une adresse ne peut servir qu’une fois, quelle que soit la casse', async () => {
  await signUp(server.baseUrl, 'ada@example.fr');
  const again = createClient(server.baseUrl);
  const response = await again('POST', '/api/auth/register', {
    email: 'ADA@example.fr',
    password: PASSWORD,
  });
  assert.equal(response.status, 409);
});

test('mauvais mot de passe et compte inconnu donnent la même réponse', async () => {
  await signUp(server.baseUrl, 'ada@example.fr');
  const visitor = createClient(server.baseUrl);
  const wrong = await visitor('POST', '/api/auth/login', {
    email: 'ada@example.fr',
    password: 'pas le bon mot de passe',
  });
  const unknown = await visitor('POST', '/api/auth/login', {
    email: 'personne@example.fr',
    password: 'pas le bon mot de passe',
  });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, wrong.status);
  assert.deepEqual(unknown.data, wrong.data);
});

test('l’empreinte du mot de passe n’est jamais renvoyée', async () => {
  const ada = await signUp(server.baseUrl, 'ada@example.fr');
  const { data } = await ada('GET', '/api/auth/me');
  assert.deepEqual(Object.keys(data.user).sort(), ['email', 'id']);
});

test('une session expirée côté serveur n’est plus acceptée', async () => {
  const ada = await signUp(server.baseUrl, 'ada@example.fr');
  await server.pool.query("UPDATE sessions SET expires_at = now() - interval '1 second'");
  assert.equal((await ada('GET', '/api/tasks')).status, 401);
});
```

Remarque le second test de `tasks.test.js` : un **tableau de cas** parcouru par une boucle. Ajouter
un cas limite coûte une ligne ; le troisième argument de `assert.equal` précise lequel a
échoué.

## Les tests unitaires de l’interface

`public/state.js` n’utilise ni le DOM ni le réseau : Node.js peut l’importer directement.

```js
// test/state.test.js — les fonctions pures de l’interface, testées sans navigateur
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remainingLabel, removeTask, upsertTask, visibleTasks } from '../public/state.js';

const tasks = [
  { id: 2, title: 'Réviser', done: false, created_at: '2026-01-02T10:00:00.000Z' },
  { id: 1, title: 'Pain', done: true, created_at: '2026-01-01T10:00:00.000Z' },
];

test('upsertTask ajoute une tâche et garde l’ordre de l’API', () => {
  const added = upsertTask(tasks, {
    id: 3,
    title: 'Courir',
    done: false,
    created_at: '2026-01-03T10:00:00.000Z',
  });
  assert.deepEqual(added.map((task) => task.id), [3, 2, 1]);
  assert.equal(tasks.length, 2); // l’état d’origine n’est pas modifié
});

test('upsertTask remplace une tâche modifiée et la reclasse', () => {
  const updated = upsertTask(tasks, { ...tasks[0], done: true });
  assert.deepEqual(
    updated.map((task) => [task.id, task.done]),
    [
      [2, true],
      [1, true],
    ],
  );
});

test('removeTask et visibleTasks', () => {
  assert.deepEqual(removeTask(tasks, 1).map((task) => task.id), [2]);
  assert.deepEqual(visibleTasks(tasks, 'open').map((task) => task.id), [2]);
  assert.deepEqual(visibleTasks(tasks, 'done').map((task) => task.id), [1]);
  assert.equal(visibleTasks(tasks, 'all'), tasks);
});

test('remainingLabel accorde le texte', () => {
  assert.equal(remainingLabel([]), 'Aucune tâche restante');
  assert.equal(remainingLabel(tasks), '1 tâche restante');
  assert.equal(remainingLabel(upsertTask(tasks, { ...tasks[1], done: false })), '2 tâches restantes');
});
```

Ces tests s’exécutent en quelques millisecondes : on peut en écrire beaucoup, pour chaque cas
d’affichage.

## Lancer la suite

```bash
npm test
```

```text
> taskboard@1.0.0 test
> node --env-file-if-exists=.env.test --test --test-concurrency=1 "test/**/*.test.js"

✔ une adresse ne peut servir qu’une fois, quelle que soit la casse (746.501524ms)
✔ mauvais mot de passe et compte inconnu donnent la même réponse (914.072209ms)
✔ l’empreinte du mot de passe n’est jamais renvoyée (322.438307ms)
✔ une session expirée côté serveur n’est plus acceptée (324.031652ms)
✔ inscription, tâches, déconnexion, reconnexion (751.252672ms)
✔ upsertTask ajoute une tâche et garde l’ordre de l’API (6.660662ms)
✔ upsertTask remplace une tâche modifiée et la reclasse (0.181435ms)
✔ removeTask et visibleTasks (0.186825ms)
✔ remainingLabel accorde le texte (0.119586ms)
✔ les tâches d’un utilisateur sont invisibles et intouchables pour un autre (748.223335ms)
✔ les entrées invalides sont refusées avec un message (347.779081ms)
✔ une requête modifiante venue d’une autre origine est refusée (9.031333ms)
✔ les en-têtes de sécurité sont présents (8.838089ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4663.737968
```

Environ cinq secondes, dont la plus grande part pour les hachages scrypt des inscriptions. Les
durées varient d’une machine à l’autre.

- Le motif `"test/**/*.test.js"` est entre guillemets pour que ce soit Node.js, et non le
  shell, qui l’interprète. Sans motif, `node --test` exécuterait **tous** les fichiers du
  dossier `test/`, y compris `helpers.js`.
- `--test-concurrency=1` : par défaut, `node --test` lance plusieurs fichiers **en parallèle**,
  dans des processus séparés. Ils videraient la même base en même temps et échoueraient au
  hasard.

### Le garde-fou en action

Si `DATABASE_URL` désigne la base de développement :

```bash
DATABASE_URL=postgres://postgres@localhost:5432/taskboard node --test test/journey.test.js
```

```text
✖ inscription, tâches, déconnexion, reconnexion (0.450623ms)
…
  Error: DATABASE_URL doit désigner une base de test (son nom doit contenir « test »)
```

Le test échoue avant d’avoir touché à la moindre donnée. Remarque `after(() => server?.stop())`
dans chaque fichier : si `before` a échoué, `server` vaut `undefined` et l’opérateur `?.`
évite une seconde erreur, plus confuse, dans `after`.

## Un test qui sert vraiment : provoquer la régression

Un test qui n’a jamais échoué ne prouve pas grand-chose. Essaie : dans
`src/routes/tasks.js`, retire le contrôle de propriétaire de la requête `UPDATE` du `PATCH`
(remplace `AND owner_id = $4` par `AND $4::integer IS NOT NULL`, pour garder le même nombre de
paramètres). Relance `node --env-file=.env.test --test test/tasks.test.js` :

```text
✖ les tâches d’un utilisateur sont invisibles et intouchables pour un autre (741.655153ms)
…
  200 !== 404
…
ℹ pass 3
ℹ fail 1
```

Bob a pu modifier la tâche d’Ada (200 au lieu de 404) et le test le signale aussitôt. Remets
le code d’origine : la suite repasse au vert. C’est la vérification qu’on attend d’un test de
sécurité.

## Jusqu’au navigateur

Notre parcours de bout en bout s’arrête à l’API. L’interface est couverte par les tests
unitaires de `state.js`, mais pas le **câblage** de `app.js` (les écouteurs, le rendu). Deux
compléments, du plus simple au plus outillé :

- une **liste de vérifications manuelles**, rejouée avant chaque mise en production :
  chargement anonyme, mauvais mot de passe, inscription, ajout, case cochée, filtre,
  suppression, rechargement, déconnexion, navigation au clavier, largeur de 375 pixels ;
- un outil qui **pilote un vrai navigateur**, comme Playwright : un script ouvre la page,
  remplit les champs, clique et vérifie le DOM. C’est ainsi qu’ont été vérifiés les
  comportements décrits à la leçon 3. Cet outil ajoute une dépendance importante (il télécharge
  des navigateurs) ; pour un projet de cette taille, la liste manuelle et les tests d’API sont
  un compromis raisonnable.

En intégration continue, la même commande `npm test` s’exécute à chaque `push`, avec un service
PostgreSQL et une variable `DATABASE_URL` vers une base de test fournie par la plateforme.

## Pièges et idées reçues

- **Des tests qui dépendent de l’ordre.** Chaque test part d’une base vide (`beforeEach` →
  `reset`) et crée ses propres données. Sinon, lancer un seul test échoue.
- **État caché en mémoire.** Le limiteur de connexion vit dans l’application, créée une fois par
  fichier : des échecs de connexion d’un test comptent pour le suivant. Un test de limitation
  doit utiliser son propre e-mail, ou sa propre application.
- **Ne tester que le cas heureux.** Les règles de sécurité sont des cas d’**échec** : 401, 403,
  404, 400. Ce sont eux qui méritent le plus de tests.
- **Vérifier trop peu.** `assert.ok(response)` passe toujours. Vérifie le statut **et** le
  contenu.
- **Utiliser la base de développement.** Le garde-fou n’est pas un luxe.

## Exercices

### Exercice 1 — Le cookie volé après déconnexion

Écris un test qui prouve qu’après `POST /api/auth/logout`, une **copie** de l’ancien cookie
(par exemple volée plus tôt) ne donne plus accès aux tâches. Pourquoi `createClient` ne suffit-il
pas ?

:::solution
`createClient` oublie le cookie à la déconnexion, exactement comme un navigateur : il ne peut
donc pas rejouer l’ancien. On manipule le cookie à la main avec `fetch` :

```js
test('après déconnexion, une copie de l’ancien cookie ne sert plus à rien', async () => {
  const signup = await fetch(`${server.baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ada@example.fr', password: 'une phrase de passe assez longue' }),
  });
  const stolenCookie = signup.headers.getSetCookie()[0].split(';')[0];
  const logout = await fetch(`${server.baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: stolenCookie },
  });
  assert.equal(logout.status, 204);
  const replay = await fetch(`${server.baseUrl}/api/tasks`, { headers: { Cookie: stolenCookie } });
  assert.equal(replay.status, 401);
});
```

Le test passe parce que la déconnexion supprime la session **en base**. Si `logout` se
contentait de `clearCookie`, `replay` recevrait 200 et le test échouerait : il protège donc
précisément cette règle.

:::

### Exercice 2 — La limitation des tentatives

Écris un test qui vérifie que les cinq premières tentatives ratées reçoivent 401, la sixième
429 avec un en-tête `Retry-After` positif.

:::solution
```js
test('la sixième tentative ratée reçoit 429 avec Retry-After', async () => {
  // Un e-mail qui ne sert qu’à ce test : le limiteur garde en mémoire les échecs des autres
  await signUp(server.baseUrl, 'limite@example.fr');
  const attacker = createClient(server.baseUrl);
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const response = await attacker('POST', '/api/auth/login', {
      email: 'limite@example.fr',
      password: `essai numéro ${i} raté`,
    });
    statuses.push(response.status);
    if (response.status === 429) assert.ok(Number(response.headers.get('retry-after')) > 0);
  }
  assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
});
```

Le test dure environ deux secondes : chaque échec calcule un hachage scrypt, sauf le sixième,
refusé avant. Collecter les statuts dans un tableau puis les comparer d’un coup donne un
message d’échec lisible : en cas d’erreur, `assert.deepEqual` affiche les deux tableaux et
leur différence. Attention au piège mentionné plus haut : le limiteur garde les échecs en
mémoire d’un test à l’autre du même fichier. Dans `auth.test.js`, le test « mauvais mot de passe
et compte inconnu » a déjà enregistré un échec pour `ada@example.fr` : avec cette adresse, la
cinquième tentative recevrait déjà 429. D’où l’adresse `limite@example.fr`, qui ne sert qu’ici
(ou un fichier de test séparé).

:::

## Récapitulatif

- Trois niveaux : unitaires (fonctions pures de l’interface), intégration (routes avec la vraie
  base), bout en bout (le parcours complet d’un utilisateur par l’API).
- Un module d’aide : application sur un port libre, base de test migrée et vidée avant chaque
  test, garde-fou sur le nom de la base, mini-navigateur qui gère le cookie.
- `npm test` lance `node --test` avec un motif explicite et `--test-concurrency=1` pour une base
  partagée.
- Les règles de sécurité se testent par leurs cas d’échec, avec deux utilisateurs.
- Un bon test échoue quand la règle qu’il protège disparaît : vérifie-le en provoquant la
  régression.
- Le câblage de l’interface se vérifie par une liste manuelle ou un outil de pilotage de
  navigateur.
