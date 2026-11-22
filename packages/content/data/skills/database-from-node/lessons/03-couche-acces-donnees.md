---
title: Une couche d’accès aux données
summary: Regrouper le SQL dans des modules repository, convertir les lignes en objets métier et brancher ces fonctions sur des routes Express 5 avec validation et gestion d’erreurs.
durationMinutes: 60
sources:
  - title: Express — Gestion des erreurs
    url: https://expressjs.com/en/guide/error-handling.html
  - title: node-postgres — Queries
    url: https://node-postgres.com/features/queries
  - title: OWASP — SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
---

Tu sais exécuter une requête paramétrée. La tentation, maintenant, est d’écrire du SQL
directement dans chaque route Express : `app.get('/books/:id', …)` avec son `pool.query`, puis
`app.get('/members/:id/loans', …)` avec le sien, et ainsi de suite. Au bout de vingt routes, le
même `SELECT` existe en cinq exemplaires légèrement différents, la conversion des colonnes est
faite à moitié partout, et renommer une colonne impose de fouiller tout le projet.

La solution est de ranger tout l’accès à la base dans une **couche dédiée**. Chaque module de
cette couche, souvent appelé **repository** (« dépôt »), expose des fonctions au nom métier
(`findById`, `create`) et cache le SQL. Les routes, elles, s’occupent du HTTP : lire la requête,
valider, choisir le code de statut. Cette leçon construit cette architecture pour l’API de la
médiathèque.

## L’organisation du projet

Dans le projet `library-api` de la leçon 1, ajoute Express 5 :

```bash
npm install express@5
```

Puis organise les fichiers ainsi :

```text
library-api/
  .env
  .gitignore
  package.json
  src/
    db.js                       le pool, créé une seule fois
    repositories/
      books-repository.js       tout le SQL qui concerne les livres
    app.js                      l’application Express et ses routes
    server.js                   le démarrage et l’arrêt du serveur
```

Chaque couche ne dépend que de celle du dessous : `server.js` importe `app.js`, qui importe les
repositories, qui importent `db.js`. Aucune route n’importe `pg`.

## Le module de connexion

Reprends `src/db.js` de la leçon 1, en y ajoutant le réglage des dates, qui doit s’appliquer à
toute l’application :

```js
import pg from 'pg';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error('La variable d’environnement DATABASE_URL est manquante.');
}

// 1082 est l’identifiant interne du type date : on garde la chaîne 'AAAA-MM-JJ' telle quelle.
pg.types.setTypeParser(1082, (value) => value);

export const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });

pool.on('error', (error) => {
  console.error('Erreur inattendue du pool PostgreSQL :', error.message);
});
```

## Le repository des livres

Voici `src/repositories/books-repository.js`. Lis-le en entier, puis les explications.

```js
import { pool } from '../db.js';

const SELECT_BOOK = `
  SELECT b.id, b.title, b.isbn, b.published_year, b.price, g.name AS genre
  FROM books AS b
  LEFT JOIN genres AS g ON g.id = b.genre_id
`;

// Convertit une ligne SQL (snake_case) en objet métier (camelCase)
function toBook(row) {
  return {
    id: row.id,
    title: row.title,
    isbn: row.isbn,
    genre: row.genre,
    publishedYear: row.published_year,
    price: row.price, // chaîne décimale exacte, par exemple '29.90'
  };
}

export async function findAll({ limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(`${SELECT_BOOK} ORDER BY b.title, b.id LIMIT $1 OFFSET $2`, [
    limit,
    offset,
  ]);
  return rows.map(toBook);
}

export async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BOOK} WHERE b.id = $1`, [id]);
  return rows.length === 0 ? null : toBook(rows[0]);
}

export async function create({ title, isbn, genreId = null, publishedYear = null, price }) {
  const { rows } = await pool.query(
    `INSERT INTO books (title, isbn, genre_id, published_year, price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [title, isbn, genreId, publishedYear, price],
  );
  return findById(rows[0].id);
}

export async function updatePrice(id, price) {
  const { rowCount } = await pool.query('UPDATE books SET price = $2 WHERE id = $1', [id, price]);
  return rowCount === 0 ? null : findById(id);
}
```

### Ce que ce module garantit

- **Tout le SQL des livres est ici.** Si la colonne `price` change de nom, un seul fichier est
  à modifier. Si un `SELECT` est lent, on sait où chercher.
- **Toutes les valeurs sont des paramètres.** Le seul gabarit de chaîne, `${SELECT_BOOK}`,
  insère un fragment SQL **écrit dans le code**, jamais une donnée extérieure.
- **Le reste de l’application ne voit pas les noms de colonnes.** `toBook` traduit la ligne
  SQL en objet métier : `published_year` devient `publishedYear`, conformément aux conventions
  de nommage de JavaScript. Le genre arrive par son nom grâce au `LEFT JOIN`, qui garde les
  livres sans genre (`genre: null`).
- **Des valeurs de retour claires.** `findById` renvoie l’objet ou `null` ; `updatePrice` utilise
  `rowCount` pour savoir si une ligne a été modifiée. Le repository ne connaît pas HTTP : il ne
  parle pas de « 404 », c’est la route qui décidera.
- **Le prix reste une chaîne décimale exacte** (`'29.90'`). C’est un choix : le client de l’API
  l’affiche tel quel, sans perte de précision. Une autre option courante consiste à stocker et
  renvoyer des centimes entiers. L’important est de documenter le format.

`create` fait un `INSERT … RETURNING id` puis relit le livre avec `findById`, pour renvoyer le
même format que les autres fonctions (avec le nom du genre). Ce sont deux requêtes : la leçon
suivante te montrera comment les regrouper dans une transaction quand c’est nécessaire.

## Les routes Express

`src/app.js` crée l’application et ses routes. Il ne contient aucun SQL :

```js
import express from 'express';
import * as booksRepository from './repositories/books-repository.js';

export const app = express();
app.use(express.json());

// Transforme un paramètre de route en identifiant entier positif, ou null
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

app.get('/books', async (req, res) => {
  const books = await booksRepository.findAll();
  res.json(books);
});

app.get('/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }
  const book = await booksRepository.findById(id);
  if (book === null) {
    return res.status(404).json({ error: 'Livre introuvable' });
  }
  res.json(book);
});

app.post('/books', async (req, res) => {
  const { title, isbn, genreId, publishedYear, price } = req.body ?? {};
  if (typeof title !== 'string' || title.trim() === '' || typeof isbn !== 'string') {
    return res.status(400).json({ error: 'title et isbn sont obligatoires' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price doit être un nombre positif ou nul' });
  }
  const book = await booksRepository.create({ title: title.trim(), isbn, genreId, publishedYear, price });
  res.status(201).json(book);
});

// Gestionnaire d’erreurs centralisé : Express 5 y envoie aussi les promesses rejetées
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});
```

Points importants :

- **La validation est faite avant d’appeler la base.** Un identifiant `abc` est refusé avec un
  `400` clair, au lieu de provoquer une erreur `22P02` côté PostgreSQL. La validation améliore
  les messages ; ce sont toujours les paramètres qui protègent de l’injection.
- **Les handlers sont `async`.** Avec Express 5, si une promesse est rejetée (par exemple parce
  que la base est injoignable), l’erreur est automatiquement transmise au gestionnaire d’erreurs
  à quatre arguments. Pas besoin de `try … catch` dans chaque route.
- **Le gestionnaire d’erreurs ne renvoie aucun détail technique au client.** Le message
  PostgreSQL complet est écrit dans les journaux du serveur (`console.error`), pas dans la
  réponse : il pourrait révéler la structure de ta base.
- **`req.body ?? {}`** : sans corps JSON, `req.body` vaut `undefined` en Express 5.

`app.js` exporte l’application **sans** démarrer le serveur. Le démarrage est dans
`src/server.js`, ce qui permet plus tard de tester l’application sans ouvrir de port :

```js
import { app } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`API disponible sur http://localhost:${port}`);
});

// Arrêt propre : on cesse d’accepter des requêtes, puis on ferme le pool
async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

`SIGINT` est le signal envoyé par Ctrl+C dans le terminal, `SIGTERM` celui qu’utilisent la
plupart des hébergeurs pour arrêter une application. Fermer le serveur puis le pool évite de
couper des requêtes en cours.

## Essayer l’API

Recharge la base, puis démarre le serveur :

```bash
psql -h localhost -U postgres -d mediatheque -f mediatheque.sql
node --env-file=.env src/server.js
```

```text
API disponible sur http://localhost:3000
```

Dans un **second terminal**, interroge-la avec `curl` :

```bash
curl -s http://localhost:3000/books/4
```

```json
{"id":4,"title":"Bases de données pour tous","isbn":"978-2-0000-0004-4","genre":"informatique","publishedYear":2022,"price":"35.00"}
```

L’option `-i` affiche aussi la ligne de statut et les en-têtes de la réponse. Seule la première
ligne, celle du statut, est reproduite ci-dessous :

```bash
curl -s -i http://localhost:3000/books/99
curl -s -i http://localhost:3000/books/abc
```

```http
HTTP/1.1 404 Not Found
```

```http
HTTP/1.1 400 Bad Request
```

Les corps de réponse sont respectivement `{"error":"Livre introuvable"}` et
`{"error":"Identifiant invalide"}`. Créons un livre :

```bash
curl -s -i -X POST http://localhost:3000/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"Données et vie privée","isbn":"978-2-0000-0009-9","genreId":2,"publishedYear":2025,"price":26}'
```

```http
HTTP/1.1 201 Created
```

```json
{"id":9,"title":"Données et vie privée","isbn":"978-2-0000-0009-9","genre":"informatique","publishedYear":2025,"price":"26.00"}
```

Et maintenant, envoie **exactement la même requête** une seconde fois :

```http
HTTP/1.1 500 Internal Server Error
```

Le corps est `{"error":"Erreur interne du serveur"}`, et le terminal du serveur affiche l’erreur
complète, dont ces lignes :

```text
error: duplicate key value violates unique constraint "books_isbn_key"
  code: '23505',
  detail: 'Key (isbn)=(978-2-0000-0009-9) already exists.',
  constraint: 'books_isbn_key',
```

La contrainte `UNIQUE` a fait son travail, mais l’API répond « erreur interne » alors que c’est le
client qui a envoyé un ISBN déjà utilisé. Un `409 Conflict` serait plus juste. C’est exactement ce
que tu apprendras à faire dans la leçon suivante, grâce au `code` SQLSTATE `23505`. Arrête le
serveur avec Ctrl+C.

## Pourquoi cette séparation paie

- **Lisibilité** : une route se lit comme une suite d’étapes HTTP (valider, appeler, répondre),
  un repository comme une liste d’opérations sur les données.
- **Réutilisation** : `findById` sert à la route `GET`, au `POST` et au `PATCH`.
- **Évolution** : passer d’un `LEFT JOIN` à une vue, ajouter un cache ou changer de bibliothèque
  ne touche que la couche d’accès aux données.
- **Sécurité vérifiable** : pour auditer le SQL, il suffit de relire le dossier `repositories`.
  Une recherche de `${` dans ces fichiers montre tous les fragments dynamiques à vérifier.
- **Tests** : on peut tester un repository contre une base de test, et les routes séparément.

:::note[Et les ORM ?]
Des bibliothèques appelées **ORM** (Object-Relational Mapping) ou constructeurs de requêtes
génèrent le SQL à ta place à partir d’objets JavaScript. Elles jouent le même rôle de couche
d’accès aux données. Écrire d’abord cette couche à la main t’apprend ce qu’elles font, et te
permet de lire le SQL qu’elles produisent quand il faut comprendre un problème.
:::

## Pièges et idées reçues

- **Du SQL dans les routes** : duplication, conversions incohérentes, audit impossible.
- **Renvoyer les lignes SQL telles quelles** : les noms de colonnes deviennent un contrat public
  de l’API, et toute évolution du schéma casse les clients.
- **Un repository qui renvoie des codes HTTP** : il ne doit pas connaître le transport. Il
  renvoie `null`, un objet, ou lève une erreur ; la route traduit.
- **Valider au lieu de paramétrer** : la validation améliore les messages, les paramètres
  protègent. Les deux.
- **Renvoyer `error.message` de PostgreSQL au client** : fuite d’informations sur le schéma.
- **Créer un pool dans chaque repository** : un seul pool, dans `db.js`.
- **Oublier `return` après `res.status(400).json(…)`** : la suite du handler s’exécute et tente
  une seconde réponse.

## Exercices

Pour chaque exercice, recharge la base puis redémarre le serveur après tes modifications.

### Exercice 1 : filtrer par genre

Fais en sorte que `GET /books?genre=roman` ne renvoie que les romans, et que `GET /books` sans
paramètre continue de tout renvoyer. Le filtre doit rester dans le repository, avec un seul
texte SQL.

:::solution
Dans le repository, un paramètre `NULL` désactive le filtre :

```js
export async function findAll({ genre = null, limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `${SELECT_BOOK}
     WHERE ($1::text IS NULL OR g.name = $1)
     ORDER BY b.title, b.id
     LIMIT $2 OFFSET $3`,
    [genre, limit, offset],
  );
  return rows.map(toBook);
}
```

Dans la route, on ne garde le paramètre que s’il s’agit d’une chaîne (un paramètre répété dans
l’URL pourrait arriver sous forme de tableau) :

```js
app.get('/books', async (req, res) => {
  const genre = typeof req.query.genre === 'string' ? req.query.genre : null;
  const books = await booksRepository.findAll({ genre });
  res.json(books);
});
```

```bash
curl -s 'http://localhost:3000/books?genre=roman'
```

```json
[{"id":5,"title":"Le Dernier Phare","isbn":"978-2-0000-0005-5","genre":"roman","publishedYear":2016,"price":"9.90"},{"id":7,"title":"Mystère à Lyon","isbn":"978-2-0000-0007-7","genre":"roman","publishedYear":2024,"price":"21.00"},{"id":2,"title":"Nuit sur le port","isbn":"978-2-0000-0002-2","genre":"roman","publishedYear":2021,"price":"18.50"}]
```

`$1::text` précise le type du paramètre. Sans lui, PostgreSQL répond
`could not determine data type of parameter $1` (code `42P08`) : dans `$1 IS NULL`, rien ne lui
indique le type attendu. Un genre inconnu ou une tentative d’injection (`?genre=x' OR 1=1 --`) renvoie
simplement `[]`.
:::

### Exercice 2 : les emprunts d’un adhérent

Crée `src/repositories/members-repository.js` avec `findById(id)` et `findLoans(memberId)`, puis
la route `GET /members/:id/loans`, qui renvoie `{ member, loans }`. Chaque emprunt contient `id`,
`title`, `loanedOn`, `dueOn` et `returnedOn`, du plus ancien au plus récent. Un adhérent
inexistant donne `404`, un adhérent sans emprunt une liste vide.

:::solution
```js
import { pool } from '../db.js';

export async function findById(id) {
  const { rows } = await pool.query('SELECT id, name, email FROM members WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findLoans(memberId) {
  const { rows } = await pool.query(
    `SELECT l.id, b.title, l.loaned_on, l.due_on, l.returned_on
     FROM loans AS l
     JOIN books AS b ON b.id = l.book_id
     WHERE l.member_id = $1
     ORDER BY l.loaned_on, l.id`,
    [memberId],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    loanedOn: row.loaned_on,
    dueOn: row.due_on,
    returnedOn: row.returned_on,
  }));
}
```

Dans `app.js`, après l’import `import * as membersRepository from
'./repositories/members-repository.js';` :

```js
app.get('/members/:id/loans', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Identifiant invalide' });
  }
  const member = await membersRepository.findById(id);
  if (member === null) {
    return res.status(404).json({ error: 'Adhérent introuvable' });
  }
  const loans = await membersRepository.findLoans(id);
  res.json({ member, loans });
});
```

```bash
curl -s http://localhost:3000/members/3/loans
curl -s http://localhost:3000/members/5/loans
```

```json
{"member":{"id":3,"name":"Chloé Fabre","email":"chloe@example.com"},"loans":[{"id":4,"title":"Nuit sur le port","loanedOn":"2024-10-16","dueOn":"2024-11-06","returnedOn":"2024-11-01"},{"id":5,"title":"Le Dernier Phare","loanedOn":"2024-10-16","dueOn":"2024-11-06","returnedOn":null}]}
{"member":{"id":5,"name":"Eva Rossi","email":"eva@example.com"},"loans":[]}
```

Il faut deux requêtes : sans `findById`, on ne pourrait pas distinguer « adhérent sans emprunt »
(liste vide, `200`) de « adhérent inexistant » (`404`). Les dates restent au format `AAAA-MM-JJ`
grâce au réglage de `db.js`. `/members/9/loans` répond `404` avec `{"error":"Adhérent introuvable"}`.
:::

### Exercice 3 : modifier un prix

Ajoute `PATCH /books/:id` qui reçoit `{ "price": 10.5 }` et renvoie le livre modifié. Réponds
`400` si l’identifiant ou le prix est invalide, `404` si le livre n’existe pas.

:::solution
```js
app.patch('/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const price = req.body?.price;
  if (id === null || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Identifiant ou prix invalide' });
  }
  const book = await booksRepository.updatePrice(id, price);
  if (book === null) {
    return res.status(404).json({ error: 'Livre introuvable' });
  }
  res.json(book);
});
```

```bash
curl -s -X PATCH http://localhost:3000/books/5 -H 'Content-Type: application/json' -d '{"price":10.5}'
```

```json
{"id":5,"title":"Le Dernier Phare","isbn":"978-2-0000-0005-5","genre":"roman","publishedYear":2016,"price":"10.50"}
```

Le `404` s’appuie sur `rowCount` dans `updatePrice` : `UPDATE 0` signifie qu’aucun livre ne
porte cet identifiant. Le prix est renvoyé `'10.50'` car la colonne `numeric(6, 2)` stocke deux
décimales. Un prix de `100000` passerait la validation de la route mais pas la base
(`numeric field overflow`) : une validation plus complète vérifierait aussi la borne supérieure.
:::

## Récapitulatif

- Une **couche d’accès aux données** (repositories) regroupe tout le SQL ; les routes ne
  contiennent que la logique HTTP.
- Un repository expose des fonctions métier (`findById`, `create`…), n’utilise que des requêtes
  paramétrées et convertit les lignes en objets (`snake_case` → `camelCase`).
- Il renvoie des valeurs simples (`null`, un objet, `rowCount`) et ignore tout de HTTP.
- La route valide les entrées, appelle le repository et choisit le statut (`200`, `201`, `400`,
  `404`).
- Avec Express 5, une promesse rejetée dans un handler `async` arrive au gestionnaire d’erreurs
  centralisé, qui répond `500` sans divulguer de détail technique.
- `app.js` exporte l’application, `server.js` la démarre et ferme le pool à l’arrêt.
