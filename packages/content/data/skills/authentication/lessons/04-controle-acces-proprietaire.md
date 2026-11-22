---
title: Contrôler l’accès par propriétaire
summary: Empêcher un utilisateur connecté d’atteindre les données des autres (IDOR), dans chaque requête SQL, et le prouver par des tests.
durationMinutes: 55
sources:
  - title: OWASP — Insecure Direct Object Reference Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
  - title: OWASP Top 10 2021 — A01 Broken Access Control
    url: https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/
  - title: OWASP — Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
  - title: Node.js — Test runner
    url: https://nodejs.org/api/test.html
---

## Le problème : connecté ne veut pas dire autorisé

Ton API sait maintenant **qui** fait chaque requête. Reste la question la plus souvent ratée :
cette personne a-t-elle le droit d’agir sur **cette** donnée ? Le contrôle d’accès défaillant
est la catégorie **A01:2021 Broken Access Control**, la première du Top 10 de l’OWASP.

Sa forme la plus courante porte un nom : **IDOR** (*Insecure Direct Object Reference*,
référence directe non sécurisée à un objet). L’URL contient un identifiant (`/api/notes/1`),
et le serveur renvoie l’objet sans vérifier qu’il appartient à l’utilisateur. Il suffit de
changer le nombre pour lire, modifier ou supprimer les données des autres.

## L’attaque, en vrai

Voici une version de la route de lecture d’une note, telle qu’on l’écrit spontanément :
l’authentification est bien là (`requireAuth`), mais rien d’autre.

```js
// VULNÉRABLE : authentifié, mais pas autorisé
app.get('/api/notes/:id', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, title, body, created_at FROM notes WHERE id = $1',
    [req.params.id],
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Note introuvable' });
  res.json(result.rows[0]);
});
```

Sur une base vide, Ada et Bob créent chacun un compte, puis Ada écrit une note privée :

```bash
B=http://localhost:3000
curl -s -c ada.txt -X POST $B/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.fr","password":"cheval agrafe batterie correcte"}'; echo
curl -s -c bob.txt -X POST $B/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.fr","password":"une phrase de passe assez longue"}'; echo
curl -s -b ada.txt -X POST $B/api/notes -H 'Content-Type: application/json' \
  -d '{"title":"Code du portail","body":"4821"}'; echo
curl -s -b bob.txt -w ' %{http_code}\n' $B/api/notes/1
```

```text
{"user":{"id":1,"email":"ada@example.fr"}}
{"user":{"id":2,"email":"bob@example.fr"}}
{"id":1,"title":"Code du portail","body":"4821","created_at":"2026-11-21T21:46:21.661Z"}
{"id":1,"title":"Code du portail","body":"4821","created_at":"2026-11-21T21:46:21.661Z"} 200
```

Bob lit le code du portail d’Ada. Aucune injection, aucun outil spécial : un simple nombre dans
une URL. Les identifiants séquentiels rendent l’exploration triviale, mais le vrai défaut est
l’absence de vérification.

## La correction : le propriétaire dans chaque requête SQL

La règle : **toute requête qui touche une note filtre aussi par son propriétaire**, et le
propriétaire vient de la session (`req.user.id`), jamais de la requête du client. Voici les
routes de notes à ajouter dans `createApp` (fichier `src/app.js` de la leçon précédente),
avant le gestionnaire d’erreurs :

```js
// Un identifiant d’URL valide : entier positif, sans zéro initial, au plus 10 chiffres
function parseId(value) {
  return /^[1-9][0-9]{0,9}$/.test(value) ? Number(value) : null;
}
```

Place `parseId` en haut du fichier, à côté de `readCredentials`. Puis, dans `createApp` :

```js
  // --- Notes : chaque requête est limitée aux notes de l’utilisateur connecté --
  app.get('/api/notes', requireAuth, async (req, res) => {
    const result = await pool.query(
      'SELECT id, title, body, created_at FROM notes WHERE owner_id = $1 ORDER BY id',
      [req.user.id],
    );
    res.json(result.rows);
  });

  app.post('/api/notes', requireAuth, async (req, res) => {
    const title = String(req.body?.title ?? '').trim();
    const body = String(req.body?.body ?? '');
    if (title.length < 1 || title.length > 120 || body.length > 5000) {
      return res.status(400).json({ error: 'Titre de 1 à 120 caractères, texte de 5000 au plus' });
    }
    const result = await pool.query(
      `INSERT INTO notes (owner_id, title, body) VALUES ($1, $2, $3)
       RETURNING id, title, body, created_at`,
      [req.user.id, title, body], // le propriétaire vient de la session, jamais du corps
    );
    res.status(201).json(result.rows[0]);
  });

  app.get('/api/notes/:id', requireAuth, async (req, res) => {
    const id = parseId(req.params.id);
    const result = await pool.query(
      'SELECT id, title, body, created_at FROM notes WHERE id = $1 AND owner_id = $2',
      [id, req.user.id],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Note introuvable' });
    res.json(result.rows[0]);
  });

  app.patch('/api/notes/:id', requireAuth, async (req, res) => {
    const id = parseId(req.params.id);
    const title = String(req.body?.title ?? '').trim();
    if (title.length < 1 || title.length > 120) {
      return res.status(400).json({ error: 'Titre de 1 à 120 caractères' });
    }
    const result = await pool.query(
      `UPDATE notes SET title = $1 WHERE id = $2 AND owner_id = $3
       RETURNING id, title, body, created_at`,
      [title, id, req.user.id],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Note introuvable' });
    res.json(result.rows[0]);
  });

  app.delete('/api/notes/:id', requireAuth, async (req, res) => {
    const id = parseId(req.params.id);
    const result = await pool.query('DELETE FROM notes WHERE id = $1 AND owner_id = $2', [
      id,
      req.user.id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Note introuvable' });
    res.status(204).end();
  });
```

Rejoue le scénario sur une base vide avec cette version :

```text
{"user":{"id":1,"email":"ada@example.fr"}}
{"user":{"id":2,"email":"bob@example.fr"}}
{"id":1,"title":"Code du portail","body":"4821","created_at":"2026-11-21T21:46:23.849Z"}
{"error":"Note introuvable"} 404
```

### Pourquoi cette forme ?

- **Le filtre est dans la requête SQL.** `WHERE id = $1 AND owner_id = $2` ne peut pas
  « oublier » la vérification : si la note n’est pas à toi, elle n’existe pas pour la base.
  L’alternative — lire la note, puis comparer `note.owner_id` à `req.user.id` en JavaScript —
  fonctionne aussi, mais demande plus de discipline (voir les pièges).
- **Une seule instruction pour vérifier et agir.** `UPDATE … WHERE id AND owner_id` et
  `DELETE … WHERE id AND owner_id` vérifient et modifient en une seule opération. `rowCount`
  dit si une ligne a été touchée : 0 signifie « inexistante ou pas à toi », d’où le 404.
- **404 plutôt que 403** : Bob n’apprend même pas que la note 1 existe.
- **`parseId`** : `abc`, `-1` ou `1.5` deviennent `null`, la requête ne trouve rien et la
  route répond 404, au lieu d’une erreur 500 de conversion de PostgreSQL
  (`invalid input syntax for type integer`).
- **Création** : `owner_id` est pris dans `req.user.id`. Un champ `owner_id` envoyé dans le
  corps est tout simplement ignoré : la route ne lit que `title` et `body`. Recopier tout le
  corps dans la requête serait une **assignation de masse**.
- **Liste** : `WHERE owner_id = $1` ; sans ce filtre, la liste renverrait les notes de tout le
  monde, une fuite massive.

## Prouver l’isolation par des tests

Une faille de contrôle d’accès ne se voit pas en utilisant l’application normalement : chacun
ne clique que sur ses propres notes. Il faut des tests qui jouent **deux utilisateurs**. Tu
connais `node:test` ; voici `test/notes-access.test.js`, qui démarre l’application sur un port
libre et parle à une **base de test dédiée** (les tests la vident avant chaque cas) :

```js
// test/notes-access.test.js — chaque utilisateur ne voit que ses notes
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createApp } from '../src/app.js';

const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
let server;
let baseUrl;

before(async () => {
  server = createApp({ pool }).listen(0); // port libre choisi par le système
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, sessions, notes RESTART IDENTITY CASCADE');
});

after(async () => {
  server.close();
  await pool.end();
});

// Crée un compte et renvoie une fonction qui appelle l’API avec son cookie
async function signUp(email) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'une phrase de passe assez longue' }),
  });
  assert.equal(response.status, 201);
  const cookie = response.headers.getSetCookie()[0].split(';')[0]; // « sid=… »
  return (path, options = {}) =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Cookie: cookie, ...options.headers },
    });
}

test('une note n’est visible que par son propriétaire', async () => {
  const ada = await signUp('ada@example.fr');
  const bob = await signUp('bob@example.fr');

  const created = await ada('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Code du portail', body: '4821' }),
  });
  const note = await created.json();

  assert.equal((await ada(`/api/notes/${note.id}`)).status, 200);
  assert.equal((await bob(`/api/notes/${note.id}`)).status, 404);
  assert.deepEqual(await (await bob('/api/notes')).json(), []);
});

test('un utilisateur ne peut ni modifier ni supprimer la note d’un autre', async () => {
  const ada = await signUp('ada@example.fr');
  const bob = await signUp('bob@example.fr');
  const note = await (
    await ada('/api/notes', { method: 'POST', body: JSON.stringify({ title: 'Privé' }) })
  ).json();

  const patch = await bob(`/api/notes/${note.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: 'Piraté' }),
  });
  assert.equal(patch.status, 404);
  assert.equal((await bob(`/api/notes/${note.id}`, { method: 'DELETE' })).status, 404);

  const unchanged = await (await ada(`/api/notes/${note.id}`)).json();
  assert.equal(unchanged.title, 'Privé');
});

test('le propriétaire vient de la session, pas du corps de la requête', async () => {
  const ada = await signUp('ada@example.fr');
  const bob = await signUp('bob@example.fr');
  await bob('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title: 'Glissée chez Ada ?', owner_id: 1 }),
  });
  assert.deepEqual(await (await ada('/api/notes')).json(), []);
});

test('sans session, les notes sont inaccessibles', async () => {
  const response = await fetch(`${baseUrl}/api/notes`);
  assert.equal(response.status, 401);
});
```

Crée la base de test une fois (`createdb notes_auth_test`, puis
`psql notes_auth_test -f migrations/001_auth.sql`) et lance :

```bash
TEST_DATABASE_URL=postgres://postgres@localhost:5432/notes_auth_test node --test
```

```text
✔ une note n’est visible que par son propriétaire (762.718816ms)
✔ un utilisateur ne peut ni modifier ni supprimer la note d’un autre (681.911492ms)
✔ le propriétaire vient de la session, pas du corps de la requête (628.067964ms)
✔ sans session, les notes sont inaccessibles (9.19155ms)
ℹ tests 4
ℹ suites 0
ℹ pass 4
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2227.047554
```

Quelques détails :

- `listen(0)` demande au système un port libre : les tests ne gênent pas un serveur déjà lancé.
- `response.headers.getSetCookie()` renvoie les en-têtes `Set-Cookie` sous forme de tableau ;
  on garde la partie `sid=…`, avant le premier `;`, pour la renvoyer dans l’en-tête `Cookie`.
- Chaque test dure environ 0,7 seconde : la plus grande part est le hachage scrypt des deux
  inscriptions. C’est le prix d’un vrai hachage.
- Le troisième test vérifie l’assignation de masse : Bob tente de créer une note avec
  `owner_id: 1` ; Ada ne doit rien voir.

Si tu remets la version vulnérable de `GET /api/notes/:id`, le premier test échoue :

```text
✖ une note n’est visible que par son propriétaire (667.573887ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  200 !== 404
```

Bob a reçu 200 là où le test attendait 404. C’est exactement ce qu’on attend d’un test de
sécurité : il casse quand la protection disparaît.

## Au-delà du propriétaire

- **Rôles** : un administrateur peut avoir des droits supplémentaires. Garde des routes
  séparées (`/api/admin/…`) protégées par `requireRole('admin')`, plutôt que d’ajouter des
  exceptions dans chaque requête.
- **Partage** : quand une note peut être lue par d’autres, on modélise ce droit dans une table
  (exercice 2). Lecture et écriture sont des droits distincts.
- **Identifiants aléatoires** : remplacer les entiers par des UUID rend les identifiants plus
  difficiles à deviner. C’est une défense en profondeur utile, **jamais** un remplacement du
  contrôle d’accès : un identifiant finit toujours par circuler (lien partagé, journal,
  capture d’écran).

## Pièges et idées reçues

- **Comparer des types différents.** Les paramètres d’URL (`req.params`) sont des **chaînes** ;
  une colonne `integer` lue par `pg` est un **nombre**. Sur une route
  `/api/notes/:id/attachments/:attachmentId`, un contrôle écrit
  `if (attachment.note_id !== req.params.id)` compare `1 !== '1'`, toujours vrai : le contrôle
  refuse tout le monde, propriétaire compris (l’exercice 1 montre comment une correction hâtive
  peut alors ouvrir une faille). Convertis d’abord (`parseId`), ou laisse PostgreSQL comparer
  dans la clause `WHERE`.
- **Lire l’utilisateur dans la requête.** `GET /api/notes?userId=1` ou un champ `userId` dans
  le corps : le client choisit qui il est. L’identité vient **uniquement** de la session.
- **Protéger la lecture et oublier l’écriture.** Chaque méthode (`GET`, `PATCH`, `DELETE`)
  et chaque route imbriquée (`/api/notes/:id/attachments`) doit filtrer.
- **Vérifier puis agir en deux requêtes séparées.** Sans transaction, l’état peut changer entre
  les deux. Une seule instruction `UPDATE … WHERE … AND owner_id = …` évite le problème.
- **Ne tester qu’avec un seul utilisateur.** Les tests d’accès jouent toujours au moins deux
  comptes.

## Exercices

### Exercice 1 — Trouver les IDOR

Ces trois routes ont été écrites par une IA. Pour chacune, dis si elle est vulnérable ou
défectueuse, explique pourquoi et corrige-la.

```js
app.get('/api/users/:userId/notes', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM notes WHERE owner_id = $1', [req.params.userId]);
  res.json(result.rows);
});

app.put('/api/notes', requireAuth, async (req, res) => {
  const { id, title, body } = req.body;
  await pool.query('UPDATE notes SET title = $1, body = $2 WHERE id = $3', [title, body, id]);
  res.status(204).end();
});

app.delete('/api/notes/:id', requireAuth, async (req, res) => {
  const note = (await pool.query('SELECT owner_id FROM notes WHERE id = $1', [req.params.id])).rows[0];
  if (note && note.owner_id !== req.params.id) {
    return res.status(404).json({ error: 'Note introuvable' });
  }
  await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
```

:::solution
Les deux premières sont des IDOR ; la troisième est défectueuse et dangereuse à corriger
naïvement.

1. **Liste par `userId` de l’URL** : Bob appelle `/api/users/1/notes` et obtient les notes
   d’Ada. Le client choisit l’utilisateur. Correction : supprimer le paramètre et utiliser la
   session, `GET /api/notes` avec `WHERE owner_id = $1` et `[req.user.id]`. Remarque aussi
   `SELECT *` : il renvoie toutes les colonnes, y compris celles qu’on ajoutera plus tard ;
   nomme les colonnes.
2. **`PUT` avec l’identifiant dans le corps** : aucun filtre de propriétaire. Bob modifie
   n’importe quelle note en changeant `id`. Correction :
   `UPDATE notes SET title = $1, body = $2 WHERE id = $3 AND owner_id = $4`, vérifier
   `rowCount` (404 si 0), et valider `title` et `body`.
3. **Suppression** : la comparaison est fausse deux fois. Elle compare `owner_id` à
   l’identifiant **de la note** au lieu de celui de l’utilisateur, et un nombre à une chaîne.
   `note.owner_id !== req.params.id` est donc toujours vrai pour une note existante : la route
   répond 404 à **tout le monde**, propriétaire compris, et 204 pour une note inexistante. Elle
   semble sûre par accident. Le danger vient de la correction naïve du bug de type :
   avec `Number(req.params.id)`, la condition devient « le propriétaire a le même numéro que la
   note », et n’importe qui peut supprimer la note 1 si elle appartient à l’utilisateur 1.
   Correction : une seule requête `DELETE FROM notes WHERE id = $1 AND owner_id = $2` avec
   `[parseId(req.params.id), req.user.id]`, puis 404 si `rowCount` vaut 0.

:::

### Exercice 2 — Partager une note en lecture seule

Ajoute la possibilité de partager une note en **lecture** : une nouvelle table `note_shares`
associe une note à un utilisateur. Le destinataire peut lire la note avec
`GET /api/notes/:id`, mais ni la modifier ni la supprimer. Écris la migration et la nouvelle
requête de lecture.

:::solution
Migration `migrations/002_note_shares.sql` (une nouvelle migration, on ne modifie pas la
première) :

```sql
-- 002_note_shares.sql — partage de notes en lecture seule
CREATE TABLE note_shares (
  note_id integer NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, user_id)
);
```

Lecture :

```js
const result = await pool.query(
  `SELECT id, title, body, created_at FROM notes
   WHERE id = $1
     AND (owner_id = $2
          OR EXISTS (SELECT 1 FROM note_shares
                     WHERE note_shares.note_id = notes.id AND note_shares.user_id = $2))`,
  [id, req.user.id],
);
```

Les routes `PATCH` et `DELETE` restent **inchangées** : elles exigent `owner_id = $…`. Essai :
Ada (id 1) crée la note 1, on la partage avec Bob (id 2) par
`INSERT INTO note_shares (note_id, user_id) VALUES (1, 2)`. Alors Bob obtient la note (200),
Ève (id 3) reçoit 404, et les tentatives de Bob en `PATCH` et `DELETE` reçoivent 404.

La clé primaire composite empêche de partager deux fois la même note avec la même personne ;
les cascades suppriment les partages avec la note ou avec l’utilisateur. Une route
`POST /api/notes/:id/shares` devrait, elle, vérifier que **seul le propriétaire** peut partager.

:::

### Exercice 3 — Un test de plus

Écris un test qui vérifie qu’un identifiant invalide (`/api/notes/abc`) renvoie 404 et non 500,
pour un utilisateur connecté.

:::solution
```js
test('un identifiant invalide renvoie 404', async () => {
  const ada = await signUp('ada@example.fr');
  const response = await ada('/api/notes/abc');
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Note introuvable' });
});
```

Sans `parseId`, la requête enverrait `'abc'` à une colonne `integer` : PostgreSQL lèverait
`invalid input syntax for type integer`, et le gestionnaire d’erreurs répondrait 500. Le test
documente le comportement voulu et empêche une régression.

:::

## Récapitulatif

- L’IDOR consiste à atteindre un objet d’un autre utilisateur en changeant son identifiant :
  c’est le cœur de A01 Broken Access Control.
- Chaque requête SQL sur une ressource filtre par propriétaire, avec `req.user.id` venu de la
  session ; jamais un identifiant d’utilisateur fourni par le client.
- Vérifier et agir en une instruction (`UPDATE`/`DELETE … AND owner_id`), puis `rowCount` → 404.
- Répondre 404 pour la ressource d’un autre ; valider les identifiants d’URL.
- À la création, le propriétaire vient de la session : pas d’assignation de masse.
- Des tests à deux utilisateurs prouvent l’isolation et cassent si elle disparaît.
- Les identifiants aléatoires et les rôles complètent, sans le remplacer, le contrôle par
  propriétaire.
