---
title: Transactions et erreurs de contraintes
summary: Exécuter une transaction sur un client emprunté au pool, protéger une règle métier contre les accès concurrents et traduire les erreurs PostgreSQL en réponses HTTP claires.
durationMinutes: 65
sources:
  - title: node-postgres — Transactions
    url: https://node-postgres.com/features/transactions
  - title: PostgreSQL — Codes d’erreur (SQLSTATE)
    url: https://www.postgresql.org/docs/current/errcodes-appendix.html
  - title: PostgreSQL — Verrous explicites (FOR UPDATE)
    url: https://www.postgresql.org/docs/current/explicit-locking.html
  - title: Express — Gestion des erreurs
    url: https://expressjs.com/en/guide/error-handling.html
---

Dans la compétence précédente, tu as utilisé `BEGIN`, `COMMIT` et `ROLLBACK` dans `psql` pour
qu’une opération en plusieurs étapes réussisse entièrement ou pas du tout. Depuis Node.js,
l’idée est la même, avec une difficulté de plus : le pool. Et quand une contrainte refuse une
écriture (un ISBN en double, un auteur inexistant), l’API de la leçon précédente répondait
`500 Erreur interne`, ce qui est faux : c’est la demande du client qui pose problème.

Cette leçon règle ces deux points : des transactions correctes avec `pg`, et des erreurs de
contraintes traduites en réponses HTTP utiles.

## Pourquoi pool.query ne suffit pas

Une transaction est attachée à **une connexion**. Or `pool.query` emprunte une connexion
**quelconque** pour chaque appel, puis la rend. Ce code est donc faux :

```js
// FAUX : chaque appel peut utiliser une connexion différente
await pool.query('BEGIN');
await pool.query('INSERT INTO books (title, isbn, price) VALUES ($1, $2, $3)', ['Essai', '978-2-0000-0013-3', 10]);
await pool.query('ROLLBACK');
```

Le `BEGIN` peut partir sur la connexion A, l’`INSERT` sur la connexion B (où aucune transaction
n’est ouverte, il est donc validé immédiatement) et le `ROLLBACK` sur la connexion C. Selon la
charge du serveur, ce code semble marcher en développement et échoue en production. La
documentation de node-postgres est explicite : toutes les instructions d’une transaction doivent
passer par **le même client**.

## Le schéma correct : connect, try, catch, finally

On emprunte un client avec `pool.connect()`, on l’utilise pour toute la transaction, puis on le
**rend** avec `client.release()`, quoi qu’il arrive. Ajoute cette fonction à `src/db.js` :

```js
// Exécute callback(client) dans une transaction, sur une seule connexion du pool
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

Chaque morceau a un rôle précis :

- `pool.connect()` réserve une connexion pour toi seul, jusqu’à `release()` ;
- si le `callback` réussit, `COMMIT` valide tout et la fonction renvoie son résultat ;
- si **n’importe quelle** étape lève une erreur (erreur SQL, erreur métier, bug JavaScript), le
  `catch` envoie `ROLLBACK` puis **relance** l’erreur, pour que l’appelant sache que l’opération a
  échoué ;
- le `finally` rend la connexion au pool dans **tous** les cas.

:::warning[Un client non rendu est perdu]
Oublier `client.release()` ne provoque aucune erreur immédiate. Mais la connexion reste réservée
pour toujours. Avec un pool de 2 connexions et un délai d’attente de 2 secondes
(`connectionTimeoutMillis: 2000`), une fonction qui oublie `release()` réussit deux fois, puis :

```text
appel 1 : 8
appel 2 : 8
appel 3 : timeout exceeded when trying to connect
```

Sur un serveur web, ce sont toutes les requêtes qui finissent par attendre. Le `finally` n’est
pas facultatif.
:::

## Des repositories utilisables dans une transaction

Les fonctions du repository utilisent le pool. Pour qu’elles puissent participer à une
transaction, on leur ajoute un dernier paramètre `db`, qui vaut le pool par défaut et le client
de la transaction quand on le leur passe. Un pool et un client ont tous deux une méthode
`query` : le code ne change pas. Voici `src/repositories/books-repository.js`, dans lequel la
lecture inclut désormais la liste des auteurs :

```js
import { pool } from '../db.js';

const SELECT_BOOK = `
  SELECT b.id, b.title, b.isbn, b.published_year, b.price, g.name AS genre,
         (SELECT string_agg(a.name, ', ' ORDER BY a.name)
          FROM book_authors AS ba
          JOIN authors AS a ON a.id = ba.author_id
          WHERE ba.book_id = b.id) AS authors
  FROM books AS b
  LEFT JOIN genres AS g ON g.id = b.genre_id
`;

function toBook(row) {
  return {
    id: row.id,
    title: row.title,
    isbn: row.isbn,
    genre: row.genre,
    authors: row.authors,
    publishedYear: row.published_year,
    price: row.price,
  };
}

// Chaque fonction accepte en dernier argument le pool (par défaut)
// ou le client d'une transaction en cours.
export async function findAll({ genre = null, limit = 20, offset = 0 } = {}, db = pool) {
  const { rows } = await db.query(
    `${SELECT_BOOK}
     WHERE ($1::text IS NULL OR g.name = $1)
     ORDER BY b.title, b.id
     LIMIT $2 OFFSET $3`,
    [genre, limit, offset],
  );
  return rows.map(toBook);
}

export async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_BOOK} WHERE b.id = $1`, [id]);
  return rows.length === 0 ? null : toBook(rows[0]);
}

export async function insert({ title, isbn, genreId = null, publishedYear = null, price }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO books (title, isbn, genre_id, published_year, price)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [title, isbn, genreId, publishedYear, price],
  );
  return rows[0].id;
}

export async function addAuthor(bookId, authorId, db = pool) {
  await db.query('INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)', [bookId, authorId]);
}

export async function remove(id, db = pool) {
  const { rowCount } = await db.query('DELETE FROM books WHERE id = $1', [id]);
  return rowCount === 1;
}
```

L’opération « créer un livre avec ses auteurs » touche plusieurs tables et doit être atomique.
On la place dans une couche **service**, au-dessus des repositories, qui orchestre les appels.
Crée `src/services/catalog-service.js` :

```js
import { withTransaction } from '../db.js';
import * as booksRepository from '../repositories/books-repository.js';

// Un livre et ses auteurs sont enregistrés ensemble, ou pas du tout
export async function createBookWithAuthors({ authorIds, ...book }) {
  return withTransaction(async (client) => {
    const bookId = await booksRepository.insert(book, client);
    for (const authorId of authorIds) {
      await booksRepository.addAuthor(bookId, authorId, client);
    }
    return booksRepository.findById(bookId, client);
  });
}
```

Vérifions avec un script, `tx-demo.js`, après avoir rechargé `mediatheque.sql` :

```js
import { pool } from './src/db.js';
import { createBookWithAuthors } from './src/services/catalog-service.js';

const book = {
  title: 'Données et vie privée',
  isbn: '978-2-0000-0009-9',
  genreId: 2,
  publishedYear: 2025,
  price: 26,
};

try {
  try {
    await createBookWithAuthors({ ...book, authorIds: [7, 42] });
  } catch (error) {
    console.log('Échec :', error.code, error.constraint);
  }
  const { rows } = await pool.query('SELECT count(*) AS n FROM books WHERE isbn = $1', [book.isbn]);
  console.log('Livres avec cet ISBN :', rows[0].n);

  console.log(await createBookWithAuthors({ ...book, authorIds: [7, 1] }));
  console.log('Connexions : total', pool.totalCount, '/ inactives', pool.idleCount);
} finally {
  await pool.end();
}
```

```text
Échec : 23503 book_authors_author_id_fkey
Livres avec cet ISBN : 0
{
  id: 10,
  title: 'Données et vie privée',
  isbn: '978-2-0000-0009-9',
  genre: 'informatique',
  authors: 'Claire Martin, Nora Lefèvre',
  publishedYear: 2025,
  price: '26.00'
}
Connexions : total 1 / inactives 1
```

L’auteur 42 n’existe pas : l’insertion du lien échoue, `withTransaction` annule tout, et le livre
inséré juste avant a disparu (zéro livre avec cet ISBN). Le second appel réussit ; le livre a
l’`id` 10, le 9 ayant été consommé par la tentative annulée. Après les deux transactions, la
connexion est bien revenue au pool (une connexion, inactive).

:::warning[Oublier de passer le client]
Dans une transaction, chaque requête doit recevoir `client`. Si tu écris
`return booksRepository.findById(bookId);` (sans `client`), la lecture part sur **une autre
connexion**, qui ne voit pas le livre tant que la transaction n’est pas validée : la fonction
renvoie `null`, alors que le livre sera bien créé une fraction de seconde plus tard. C’est un
bug déroutant ; en cas de doute, cherche les appels de repository sans `client` à l’intérieur
d’un `withTransaction`.
:::

## Une règle métier protégée contre la concurrence

Une règle comme « un livre ne peut pas être emprunté deux fois en même temps » ne s’exprime pas
avec une contrainte `CHECK`. On la vérifie dans le code : lire, contrôler, puis écrire. Mais
entre la lecture et l’écriture, une autre requête peut faire la même chose. Deux demandes
d’emprunt simultanées pour le même livre lisent toutes les deux « disponible », et insèrent
chacune un emprunt.

La solution vue dans la compétence précédente : dans la transaction, verrouiller d’abord la ligne
concernée avec `SELECT … FOR UPDATE`. Une seconde transaction qui veut verrouiller la même ligne
**attend** la fin de la première, puis relit des données à jour.

Commence par des erreurs métier, dans `src/errors.js` :

```js
// Erreur métier : la demande est bien formée mais contraire à une règle de gestion
export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Ressource demandée introuvable
export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

Puis le repository des emprunts, `src/repositories/loans-repository.js` :

```js
import { pool } from '../db.js';

export async function countOngoingByMember(memberId, db = pool) {
  const { rows } = await db.query(
    'SELECT count(*) AS n FROM loans WHERE member_id = $1 AND returned_on IS NULL',
    [memberId],
  );
  return Number(rows[0].n);
}

export async function isBookOut(bookId, db = pool) {
  const { rows } = await db.query(
    'SELECT EXISTS (SELECT 1 FROM loans WHERE book_id = $1 AND returned_on IS NULL) AS out',
    [bookId],
  );
  return rows[0].out;
}

export async function insert({ bookId, memberId, loanedOn, dueOn }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO loans (book_id, member_id, loaned_on, due_on)
     VALUES ($1, $2, $3, $4)
     RETURNING id, book_id, member_id, loaned_on, due_on`,
    [bookId, memberId, loanedOn, dueOn],
  );
  const row = rows[0];
  return { id: row.id, bookId: row.book_id, memberId: row.member_id, loanedOn: row.loaned_on, dueOn: row.due_on };
}
```

Et le service, `src/services/loan-service.js` :

```js
import { withTransaction } from '../db.js';
import { ConflictError, NotFoundError } from '../errors.js';
import * as loansRepository from '../repositories/loans-repository.js';

const MAX_ONGOING_LOANS = 3;

export async function borrowBook({ bookId, memberId, loanedOn, dueOn }) {
  return withTransaction(async (client) => {
    // Verrouille le livre et l'adhérent : une autre transaction qui fait de même attendra
    const book = await client.query('SELECT id FROM books WHERE id = $1 FOR UPDATE', [bookId]);
    if (book.rowCount === 0) throw new NotFoundError('Livre introuvable');
    const member = await client.query('SELECT id FROM members WHERE id = $1 FOR UPDATE', [memberId]);
    if (member.rowCount === 0) throw new NotFoundError('Adhérent introuvable');

    if (await loansRepository.isBookOut(bookId, client)) {
      throw new ConflictError('Ce livre est déjà emprunté');
    }
    if ((await loansRepository.countOngoingByMember(memberId, client)) >= MAX_ONGOING_LOANS) {
      throw new ConflictError(`Pas plus de ${MAX_ONGOING_LOANS} emprunts en cours`);
    }
    return loansRepository.insert({ bookId, memberId, loanedOn, dueOn }, client);
  });
}
```

Une erreur métier levée dans le `callback` déclenche le `ROLLBACK` comme n’importe quelle autre
erreur, ce qui libère aussi les verrous. Pour vérifier le comportement concurrent, ce script
lance deux emprunts du **même** livre en même temps, pour deux adhérents différents :

```js
import { pool } from './src/db.js';
import { borrowBook } from './src/services/loan-service.js';

try {
  const attempts = await Promise.allSettled([
    borrowBook({ bookId: 3, memberId: 4, loanedOn: '2024-11-21', dueOn: '2024-12-12' }),
    borrowBook({ bookId: 3, memberId: 5, loanedOn: '2024-11-21', dueOn: '2024-12-12' }),
  ]);
  for (const attempt of attempts) {
    console.log(attempt.status, attempt.status === 'fulfilled' ? attempt.value.memberId : attempt.reason.message);
  }
} finally {
  await pool.end();
}
```

```text
fulfilled 4
rejected Ce livre est déjà emprunté
```

Un seul emprunt passe. Fais l’essai inverse : retire les deux `FOR UPDATE` du service, recharge
la base et relance le script plusieurs fois. Sur la machine de test, les deux emprunts ont réussi
dans la majorité des essais (`fulfilled 4` puis `fulfilled 5`) : chaque transaction a lu « livre
disponible » avant que l’autre n’écrive. Les autres fois, l’une des deux a simplement été un peu
plus rapide : le résultat dépend du hasard de l’ordonnancement, ce qui rend le bug d’autant plus
traître. Ce genre de bug n’apparaît presque jamais en développement, où l’on clique une
fois à la fois, et surgit en production. Remets les verrous avant de continuer.

## Les erreurs de contraintes et leurs codes

Quand PostgreSQL refuse une écriture, l’erreur reçue par `pg` contient des propriétés précieuses :

- `code` : le code **SQLSTATE**, cinq caractères normalisés, stables d’une version à l’autre ;
- `constraint` : le nom de la contrainte violée, quand il y en a un ;
- `detail` : une explication lisible, qui peut contenir des valeurs (à ne pas renvoyer telle
  quelle au client) ;
- `table`, `column` : la table et, selon l’erreur, la colonne en cause.

Ce script provoque les violations les plus courantes sur une base fraîchement rechargée :

```js
import { pool } from './src/db.js';

async function tryQuery(label, text, values) {
  try {
    await pool.query(text, values);
    console.log(label, 'OK');
  } catch (error) {
    console.log(label, error.code, error.constraint ?? '-', '|', error.detail ?? error.message);
  }
}

try {
  await tryQuery('ISBN en double   :', 'INSERT INTO books (title, isbn, price) VALUES ($1, $2, $3)', ['Copie', '978-2-0000-0001-1', 10]);
  await tryQuery('Genre inexistant :', 'INSERT INTO books (title, isbn, genre_id, price) VALUES ($1, $2, $3, $4)', ['Orphelin', '978-2-0000-0101-1', 99, 10]);
  await tryQuery('Livre emprunté   :', 'DELETE FROM books WHERE id = $1', [4]);
  await tryQuery('Titre manquant   :', 'INSERT INTO books (title, isbn, price) VALUES ($1, $2, $3)', [null, '978-2-0000-0102-2', 10]);
  await tryQuery('Prix négatif     :', 'INSERT INTO books (title, isbn, price) VALUES ($1, $2, $3)', ['Soldé', '978-2-0000-0103-3', -1]);
} finally {
  await pool.end();
}
```

```text
ISBN en double   : 23505 books_isbn_key | Key (isbn)=(978-2-0000-0001-1) already exists.
Genre inexistant : 23503 books_genre_id_fkey | Key (genre_id)=(99) is not present in table "genres".
Livre emprunté   : 23503 loans_book_id_fkey | Key (id)=(4) is still referenced from table "loans".
Titre manquant   : 23502 - | Failing row contains (11, null, 978-2-0000-0102-2, null, null, 10.00).
Prix négatif     : 23514 books_price_check | Failing row contains (12, Soldé, 978-2-0000-0103-3, null, null, -1.00).
```

| Code    | Nom PostgreSQL          | Signification                                         |
| ------- | ----------------------- | ----------------------------------------------------- |
| `23505` | `unique_violation`      | une valeur `UNIQUE` ou de clé primaire existe déjà    |
| `23503` | `foreign_key_violation` | référence vers une ligne absente, ou ligne référencée |
| `23502` | `not_null_violation`    | valeur obligatoire manquante                          |
| `23514` | `check_violation`       | une contrainte `CHECK` est fausse                     |

Le code `23503` couvre deux situations opposées : insérer une référence vers une ligne qui
n’existe pas (genre 99), ou supprimer une ligne encore référencée (le livre 4, qui a des
emprunts). Le nom de la contrainte permet de les distinguer. Pour une violation de `NOT NULL`,
PostgreSQL 16 ne renseigne pas `constraint` (d’où le `-`), mais `column` vaut `'title'` ; ne
compte pas sur `constraint` pour ce cas. Les messages et détails peuvent être traduits selon la
configuration du serveur, alors que les codes ne changent jamais : **teste toujours le code, pas
le texte du message**.

## Traduire les erreurs en réponses HTTP

Le gestionnaire d’erreurs centralisé d’Express est le bon endroit pour cette traduction : les
routes et les services n’ont pas à s’en soucier. Crée `src/http-errors.js` :

```js
import { ConflictError, NotFoundError } from './errors.js';

// Messages choisis pour les contraintes connues : [statut HTTP, message pour le client]
const CONSTRAINT_ERRORS = new Map([
  ['books_isbn_key', [409, 'Un livre avec cet ISBN existe déjà.']],
  ['books_genre_id_fkey', [400, 'Genre inconnu.']],
  ['book_authors_author_id_fkey', [400, 'Auteur inconnu.']],
  ['book_authors_pkey', [400, 'Un auteur est indiqué deux fois.']],
  ['loans_book_id_fkey', [409, 'Ce livre a un historique d’emprunts.']],
  ['loans_due_after_loan', [400, 'La date de retour doit suivre la date d’emprunt.']],
]);

// Réponse par défaut selon le code SQLSTATE
const SQLSTATE_ERRORS = new Map([
  ['23505', [409, 'Cette valeur existe déjà.']], // unique_violation
  ['23503', [409, 'Opération incompatible avec des données liées.']], // foreign_key_violation
  ['23502', [400, 'Une valeur obligatoire est manquante.']], // not_null_violation
  ['23514', [400, 'Une valeur ne respecte pas les règles.']], // check_violation
]);

export function errorHandler(error, req, res, next) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  if (error instanceof ConflictError) {
    return res.status(409).json({ error: error.message });
  }
  const known = CONSTRAINT_ERRORS.get(error.constraint) ?? SQLSTATE_ERRORS.get(error.code);
  if (known) {
    const [status, message] = known;
    return res.status(status).json({ error: message });
  }
  console.error(error);
  res.status(500).json({ error: 'Erreur interne du serveur' });
}
```

Les choix de statut suivent une logique simple : `400` quand la **demande** est invalide (une
référence vers un auteur inexistant, une date incohérente), `409 Conflict` quand elle est bien
formée mais entre en conflit avec l’**état** actuel des données (ISBN déjà pris, livre déjà
emprunté, suppression d’un livre qui a un historique). Seules les erreurs inattendues donnent
`500`, et ce sont les seules qu’on journalise en entier.

Pourquoi ne pas vérifier l’unicité de l’ISBN avec un `SELECT` avant l’`INSERT` ? Parce que deux
requêtes simultanées pourraient passer la vérification ensemble : c’est le même problème de
concurrence que pour les emprunts. La contrainte `UNIQUE` est, elle, garantie par PostgreSQL. On
la laisse faire son travail et on traduit son erreur.

## Les routes

Voici `src/app.js` complet, qui remplace celui de la leçon précédente :

```js
import express from 'express';
import * as booksRepository from './repositories/books-repository.js';
import { createBookWithAuthors } from './services/catalog-service.js';
import { borrowBook } from './services/loan-service.js';
import { errorHandler } from './http-errors.js';

export const app = express();
app.use(express.json());

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

app.get('/books', async (req, res) => {
  const genre = typeof req.query.genre === 'string' ? req.query.genre : null;
  res.json(await booksRepository.findAll({ genre }));
});

app.get('/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Identifiant invalide' });
  const book = await booksRepository.findById(id);
  if (book === null) return res.status(404).json({ error: 'Livre introuvable' });
  res.json(book);
});

app.post('/books', async (req, res) => {
  const { title, isbn, genreId = null, publishedYear = null, price, authorIds } = req.body ?? {};
  if (typeof title !== 'string' || title.trim() === '' || typeof isbn !== 'string') {
    return res.status(400).json({ error: 'title et isbn sont obligatoires' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price doit être un nombre positif ou nul' });
  }
  if (!Array.isArray(authorIds) || authorIds.length === 0 || !authorIds.every((id) => parseId(id) !== null)) {
    return res.status(400).json({ error: 'authorIds doit contenir au moins un identifiant' });
  }
  const book = await createBookWithAuthors({ title: title.trim(), isbn, genreId, publishedYear, price, authorIds });
  res.status(201).json(book);
});

app.delete('/books/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Identifiant invalide' });
  const deleted = await booksRepository.remove(id);
  if (!deleted) return res.status(404).json({ error: 'Livre introuvable' });
  res.status(204).end();
});

app.post('/loans', async (req, res) => {
  const bookId = parseId(req.body?.bookId);
  const memberId = parseId(req.body?.memberId);
  const { loanedOn, dueOn } = req.body ?? {};
  if (bookId === null || memberId === null || !isIsoDate(loanedOn) || !isIsoDate(dueOn)) {
    return res.status(400).json({ error: 'bookId, memberId, loanedOn et dueOn sont obligatoires' });
  }
  const loan = await borrowBook({ bookId, memberId, loanedOn, dueOn });
  res.status(201).json(loan);
});

app.use(errorHandler);
```

Recharge la base, démarre le serveur et envoie ces requêtes. L’option
`-w ' (%{http_code})\n'` de `curl` affiche le code de statut après le corps de la réponse :

```bash
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/books -H 'Content-Type: application/json' \
  -d '{"title":"Données et vie privée","isbn":"978-2-0000-0009-9","genreId":2,"publishedYear":2025,"price":26,"authorIds":[7,42]}'
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/books -H 'Content-Type: application/json' \
  -d '{"title":"Données et vie privée","isbn":"978-2-0000-0009-9","genreId":2,"publishedYear":2025,"price":26,"authorIds":[7,1]}'
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/books -H 'Content-Type: application/json' \
  -d '{"title":"Données et vie privée","isbn":"978-2-0000-0009-9","genreId":2,"publishedYear":2025,"price":26,"authorIds":[7,1]}'
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/books -H 'Content-Type: application/json' \
  -d '{"title":"Livre sans genre connu","isbn":"978-2-0000-0011-1","genreId":99,"price":10,"authorIds":[1]}'
```

```text
{"error":"Auteur inconnu."} (400)
{"id":10,"title":"Données et vie privée","isbn":"978-2-0000-0009-9","genre":"informatique","authors":"Claire Martin, Nora Lefèvre","publishedYear":2025,"price":"26.00"} (201)
{"error":"Un livre avec cet ISBN existe déjà."} (409)
{"error":"Genre inconnu."} (400)
```

Les suppressions et les emprunts :

```bash
curl -s -w ' (%{http_code})\n' -X DELETE http://localhost:3000/books/4
curl -s -w ' (%{http_code})\n' -X DELETE http://localhost:3000/books/6
curl -s -w ' (%{http_code})\n' -X DELETE http://localhost:3000/books/6
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/loans -H 'Content-Type: application/json' \
  -d '{"bookId":4,"memberId":5,"loanedOn":"2024-11-21","dueOn":"2024-12-12"}'
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/loans -H 'Content-Type: application/json' \
  -d '{"bookId":3,"memberId":5,"loanedOn":"2024-11-21","dueOn":"2024-11-01"}'
curl -s -w ' (%{http_code})\n' -X POST http://localhost:3000/loans -H 'Content-Type: application/json' \
  -d '{"bookId":3,"memberId":5,"loanedOn":"2024-11-21","dueOn":"2024-12-12"}'
```

```text
{"error":"Ce livre a un historique d’emprunts."} (409)
 (204)
{"error":"Livre introuvable"} (404)
{"error":"Ce livre est déjà emprunté"} (409)
{"error":"La date de retour doit suivre la date d’emprunt."} (400)
{"id":10,"bookId":3,"memberId":5,"loanedOn":"2024-11-21","dueOn":"2024-12-12"} (201)
```

Le livre 6 n’a jamais été emprunté : sa suppression réussit (`204`, sans corps), et ses liens
avec ses auteurs disparaissent par la cascade définie dans le schéma. La date incohérente est
refusée par la contrainte `CHECK` de la table, traduite en `400`. Aucune de ces réponses ne
révèle de nom de table ni de détail interne.

## Pièges et idées reçues

- **`pool.query('BEGIN')`** : chaque appel peut changer de connexion. Une transaction passe par
  un seul `client` obtenu avec `pool.connect()`.
- **Oublier `client.release()`**, ou le placer ailleurs que dans `finally` : le pool s’épuise.
- **Avaler l’erreur dans le `catch`** sans la relancer : l’appelant croit que tout a réussi.
- **Oublier de passer `client`** à une fonction de repository dans une transaction : la requête
  s’exécute hors transaction, ne voit pas les écritures en cours et n’est pas annulée.
- **Vérifier puis écrire sans verrou** : deux requêtes simultanées passent la vérification.
- **Tester `error.message`** au lieu de `error.code` : les messages changent selon la langue et
  la version.
- **Renvoyer `error.detail` au client** : il contient des valeurs et des noms internes.
- **Répondre `500` à une violation de contrainte** provoquée par une demande invalide : c’est un
  `400` ou un `409`.

## Exercices

Recharge la base avant chaque exercice.

### Exercice 1 : rendre un livre

Ajoute la route `POST /loans/:id/return`, qui reçoit `{ "returnedOn": "2024-11-21" }`. Elle répond
`404` si l’emprunt n’existe pas, `409` s’il est déjà rendu, `400` si la date précède l’emprunt
(contrainte `loans_return_after_loan`), et `200` avec l’emprunt mis à jour sinon. Deux retours
simultanés du même emprunt ne doivent jamais réussir tous les deux.

:::solution
Dans `src/services/loan-service.js` :

```js
export async function returnBook(loanId, returnedOn) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT id, returned_on FROM loans WHERE id = $1 FOR UPDATE', // verrou sur l'emprunt
      [loanId],
    );
    if (rows.length === 0) throw new NotFoundError('Emprunt introuvable');
    if (rows[0].returned_on !== null) throw new ConflictError('Cet emprunt est déjà rendu');
    const result = await client.query(
      `UPDATE loans SET returned_on = $2 WHERE id = $1
       RETURNING id, book_id, member_id, loaned_on, due_on, returned_on`,
      [loanId, returnedOn],
    );
    const row = result.rows[0];
    return {
      id: row.id,
      bookId: row.book_id,
      memberId: row.member_id,
      loanedOn: row.loaned_on,
      dueOn: row.due_on,
      returnedOn: row.returned_on,
    };
  });
}
```

Dans `src/http-errors.js`, une ligne de plus dans `CONSTRAINT_ERRORS` :

```js
  ['loans_return_after_loan', [400, 'Le retour ne peut pas précéder l’emprunt.']],
```

Dans `src/app.js` (en important `returnBook` à côté de `borrowBook`) :

```js
app.post('/loans/:id/return', async (req, res) => {
  const id = parseId(req.params.id);
  const returnedOn = req.body?.returnedOn;
  if (id === null || !isIsoDate(returnedOn)) {
    return res.status(400).json({ error: 'Identifiant ou date de retour invalide' });
  }
  res.json(await returnBook(id, returnedOn));
});
```

Essais sur l’emprunt 5 (« Le Dernier Phare », emprunté le 16 octobre), puis sur un emprunt
inexistant :

```text
{"error":"Le retour ne peut pas précéder l’emprunt."} (400)
{"id":5,"bookId":5,"memberId":3,"loanedOn":"2024-10-16","dueOn":"2024-11-06","returnedOn":"2024-11-21"} (200)
{"error":"Cet emprunt est déjà rendu"} (409)
{"error":"Emprunt introuvable"} (404)
```

Les requêtes envoyaient successivement `2024-10-01`, `2024-11-21`, `2024-11-22` sur l’emprunt 5,
puis `2024-11-22` sur l’emprunt 99. Le `FOR UPDATE` empêche deux retours simultanés de lire tous
les deux « pas encore rendu ». Une variante sans verrou existe : `UPDATE … WHERE id = $1 AND
returned_on IS NULL` puis tester `rowCount`, mais il faut alors une seconde requête pour
distinguer `404` et `409`.
:::

### Exercice 2 : inscrire un adhérent

Ajoute `POST /members` qui reçoit `{ "name": "…", "email": "…" }`, enregistre l’e-mail en
minuscules et répond `201` avec l’adhérent créé. Une adresse déjà utilisée doit donner `409` avec
un message clair, **sans** `SELECT` préalable. Écris le SQL dans un repository.

:::solution
`src/repositories/members-repository.js` (si tu as gardé celui de la leçon 3, ajoute seulement
la fonction `create` à côté des autres) :

```js
import { pool } from '../db.js';

export async function create({ name, email }, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO members (name, email) VALUES ($1, $2) RETURNING id, name, email',
    [name, email],
  );
  return rows[0];
}
```

Dans `src/app.js`, avec `import * as membersRepository from './repositories/members-repository.js';` :

```js
app.post('/members', async (req, res) => {
  const { name, email } = req.body ?? {};
  if (typeof name !== 'string' || name.trim() === '' || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'name et email valides sont obligatoires' });
  }
  const member = await membersRepository.create({
    name: name.trim(),
    email: email.trim().toLowerCase(), // UNIQUE est sensible à la casse : on normalise
  });
  res.status(201).json(member);
});
```

Et dans `CONSTRAINT_ERRORS` :

```js
  ['members_email_key', [409, 'Un adhérent utilise déjà cette adresse e-mail.']],
```

Avec `Farid@Example.com`, puis `farid@example.com` :

```text
{"id":6,"name":"Farid Benali","email":"farid@example.com"} (201)
{"error":"Un adhérent utilise déjà cette adresse e-mail."} (409)
```

Sans la mise en minuscules, la seconde adresse aurait été acceptée : la contrainte `UNIQUE`
compare les chaînes exactement. Et un `SELECT` préalable ne protégerait pas de deux inscriptions
simultanées : c’est la contrainte, avec la traduction de `23505`, qui garantit l’unicité.
:::

### Exercice 3 : relire une transaction

Ce code a été proposé pour enregistrer un emprunt. Trouve au moins trois défauts, explique leurs
conséquences et réécris-le avec `withTransaction`.

```js
export async function borrow(bookId, memberId, loanedOn, dueOn) {
  const client = await pool.connect();
  await client.query('BEGIN');
  const { rows } = await pool.query(
    'SELECT count(*) AS n FROM loans WHERE book_id = $1 AND returned_on IS NULL',
    [bookId],
  );
  if (rows[0].n > 0) {
    return null;
  }
  await client.query(
    `INSERT INTO loans (book_id, member_id, loaned_on, due_on) VALUES (${bookId}, ${memberId}, '${loanedOn}', '${dueOn}')`,
  );
  await client.query('COMMIT');
  client.release();
}
```

:::solution
Défauts :

1. **`pool.query` pour la vérification** : la lecture se fait sur une autre connexion, hors
   transaction, et sans verrou : deux emprunts simultanés passent.
2. **Pas de `try … catch … finally`** : si l’`INSERT` échoue, ni `ROLLBACK` ni `release()` ;
   la connexion reste réservée dans une transaction interrompue, et le pool s’épuise.
3. **`return null` sans `ROLLBACK` ni `release()`** : même fuite de connexion, à chaque livre
   déjà emprunté.
4. **Valeurs collées dans le SQL** : injection possible par les dates (ce sont des chaînes).
5. **`rows[0].n > 0`** compare une chaîne (`'1'`) à un nombre : cela fonctionne par conversion
   implicite, mais `Number(rows[0].n)` est plus clair.
6. Le résultat (l’emprunt créé) n’est pas renvoyé, et un échec métier se confond avec un `null`.

Version corrigée, dans l’esprit du service de la leçon :

```js
export async function borrow(bookId, memberId, loanedOn, dueOn) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM books WHERE id = $1 FOR UPDATE', [bookId]);
    const { rows } = await client.query(
      'SELECT count(*) AS n FROM loans WHERE book_id = $1 AND returned_on IS NULL',
      [bookId],
    );
    if (Number(rows[0].n) > 0) {
      throw new ConflictError('Ce livre est déjà emprunté');
    }
    const result = await client.query(
      `INSERT INTO loans (book_id, member_id, loaned_on, due_on)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [bookId, memberId, loanedOn, dueOn],
    );
    return result.rows[0].id;
  });
}
```

`withTransaction` garantit `ROLLBACK` et `release()` dans tous les cas, l’erreur métier remonte
jusqu’au gestionnaire d’erreurs (`409`), et toutes les valeurs sont des paramètres.
:::

## Récapitulatif

- Une transaction utilise **un seul client** : `pool.connect()`, `BEGIN`, requêtes, `COMMIT` ;
  `ROLLBACK` et relance de l’erreur dans le `catch` ; `client.release()` dans le `finally`.
- Une fonction `withTransaction(callback)` encapsule ce schéma ; les repositories acceptent un
  paramètre `db` (pool ou client) pour y participer.
- Une couche **service** orchestre plusieurs repositories dans une transaction.
- Vérifier puis écrire exige un verrou (`SELECT … FOR UPDATE`) pour résister aux requêtes
  simultanées ; une contrainte `UNIQUE` reste la meilleure garantie d’unicité.
- Les erreurs PostgreSQL portent un `code` SQLSTATE : `23505` (unique), `23503` (clé étrangère),
  `23502` (non nul), `23514` (check), ainsi que `constraint`, `detail`, `table`, `column`.
- Le gestionnaire d’erreurs traduit ces codes en `400` ou `409` avec un message choisi, et
  réserve `500` (journalisé) aux erreurs inattendues.
