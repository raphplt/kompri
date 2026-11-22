---
title: Un CRUD complet en mémoire
summary: Implémenter les cinq opérations d’une ressource avec Express 5, les bons codes de statut, l’en-tête Location et la détection des conflits.
durationMinutes: 70
sources:
  - title: RFC 9110 — HTTP Semantics (201, 204, 404, 409, Location)
    url: https://www.rfc-editor.org/rfc/rfc9110
  - title: MDN — En-tête Location
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/Location
  - title: MDN — Idempotent (glossaire)
    url: https://developer.mozilla.org/fr/docs/Glossary/Idempotent
  - title: Express 5 — Référence de l’API
    url: https://expressjs.com/en/5x/api.html
---

## Objectif de la leçon

Tu vas construire l’API d’un petit catalogue de bibliothèque. Chaque livre a un
identifiant attribué par le serveur, un **code d’inventaire** unique (comme `HUG-001`),
un titre, un auteur, une année de publication et un indicateur de disponibilité :

```json
{
  "id": 1,
  "code": "HUG-001",
  "title": "Les Misérables",
  "author": "Victor Hugo",
  "year": 1862,
  "available": true
}
```

Les données sont gardées **en mémoire**, dans une `Map`. Elles disparaissent à chaque
redémarrage : c’est voulu. La base de données sera étudiée plus tard ; ici, on se
concentre sur le **contrat HTTP** de l’API. Bonne nouvelle : grâce au découpage du
projet, brancher une base ne changera que le module de stockage.

Dans cette leçon, la vérification des données envoyées reste volontairement minimale.
La leçon suivante la remplacera par une vraie validation et un format d’erreur
standard.

## L’organisation du projet

```text
books-api/
  package.json
  src/
    server.js                 démarrage et données d'exemple
    app.js                    assemblage de l'application
    errors.js                 classe HttpError
    seed.js                   livres d'exemple
    store/books-store.js      stockage en mémoire
    routes/books.js           les routes de /api/books
    middlewares/error-handler.js
```

`package.json` déclare les modules ES, Express 5 et deux scripts :

```json
{
  "name": "books-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js"
  },
  "dependencies": {
    "express": "^5.3.0"
  }
}
```

### Le module de stockage

Le stockage est isolé dans un module qui expose des fonctions simples. Les routes ne
savent pas comment les livres sont rangés : c’est ce qui permettra de remplacer la `Map`
par une base de données.

```js
// src/store/books-store.js
// Stockage en mémoire : les données disparaissent à l'arrêt du serveur.
const books = new Map();
let nextId = 1;

export function listBooks() {
  return [...books.values()];
}

export function getBook(id) {
  return books.get(id);
}

export function findBookByCode(code) {
  return listBooks().find((book) => book.code === code);
}

export function createBook(data) {
  const book = { id: nextId, ...data };
  nextId += 1;
  books.set(book.id, book);
  return book;
}

export function replaceBook(id, data) {
  const book = { id, ...data };
  books.set(id, book);
  return book;
}

export function deleteBook(id) {
  return books.delete(id);
}

export function resetBooks(initialBooks = []) {
  books.clear();
  nextId = 1;
  for (const data of initialBooks) {
    createBook(data);
  }
}
```

Quelques choix à comprendre :

- Une **`Map`** indexée par identifiant donne un accès direct à un livre
  (`books.get(3)`), sans parcourir un tableau.
- **`nextId`** ne fait qu’augmenter. Un identifiant n’est jamais réutilisé, même après
  une suppression. Calculer `books.size + 1` donnerait deux fois le même identifiant :
  après la suppression du livre 3 sur 7, le prochain livre recevrait 7… déjà pris.
- **`listBooks()`** renvoie un **nouveau tableau** (`[...books.values()]`). Trier ou
  filtrer ce tableau ne touche pas au stockage.
- Dans `createBook`, `{ id: nextId, ...data }` place l’identifiant du serveur **avant**
  les données : si `data` contenait un `id`, il l’écraserait. Les routes ne transmettent
  donc que des champs contrôlés, jamais `req.body` tel quel.
- **`resetBooks`** remet le stockage dans un état connu : indispensable pour des tests
  reproductibles.

Les données d’exemple :

```js
// src/seed.js
export const sampleBooks = [
  { code: 'HUG-001', title: 'Les Misérables', author: 'Victor Hugo', year: 1862, available: true },
  { code: 'HUG-002', title: 'Notre-Dame de Paris', author: 'Victor Hugo', year: 1831, available: false },
  { code: 'ZOL-001', title: 'Germinal', author: 'Émile Zola', year: 1885, available: false },
  { code: 'ZOL-002', title: 'L’Assommoir', author: 'Émile Zola', year: 1877, available: true },
  { code: 'FLA-001', title: 'Madame Bovary', author: 'Gustave Flaubert', year: 1857, available: true },
  { code: 'DUM-001', title: 'Les Trois Mousquetaires', author: 'Alexandre Dumas', year: 1844, available: true },
  { code: 'MAU-001', title: 'Bel-Ami', author: 'Guy de Maupassant', year: 1885, available: true },
];
```

### Erreurs, assemblage et démarrage

Tu connais ces fichiers depuis le cours sur Express :

```js
// src/errors.js
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
```

```js
// src/middlewares/error-handler.js
import { HttpError } from '../errors.js';

export function notFound(req, res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.path} introuvable`));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corps JSON mal formé' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
}
```

```js
// src/app.js
import express from 'express';
import { booksRouter } from './routes/books.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/books', booksRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
```

```js
// src/server.js
import { createApp } from './app.js';
import { resetBooks } from './store/books-store.js';
import { sampleBooks } from './seed.js';

const port = Number(process.env.PORT) || 3000;

resetBooks(sampleBooks);

createApp().listen(port, (error) => {
  if (error) {
    console.error(`Impossible d’écouter sur le port ${port} :`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`API prête sur http://localhost:${port}/api/books`);
});
```

Les données d’exemple sont chargées dans `server.js`, pas dans `app.js` : un script de
test pourra créer l’application avec ses propres données.

## Les routes, une par une

Voici le routeur complet. On le détaille ensuite opération par opération.

```js
// src/routes/books.js
import { Router } from 'express';
import { HttpError } from '../errors.js';
import {
  createBook,
  deleteBook,
  findBookByCode,
  getBook,
  listBooks,
  replaceBook,
} from '../store/books-store.js';

export const booksRouter = Router();

// Contrôle minimal, remplacé par une vraie validation dans la leçon suivante
function readBook(body) {
  const { code, title, author, year, available = true } = body ?? {};
  if (typeof code !== 'string' || typeof title !== 'string' || typeof author !== 'string') {
    throw new HttpError(400, 'code, title et author sont obligatoires');
  }
  if (!Number.isInteger(year)) {
    throw new HttpError(400, 'year doit être un entier');
  }
  return { code, title, author, year, available: available === true };
}

function findBookOr404(idParam) {
  const book = getBook(Number(idParam));
  if (!book) {
    throw new HttpError(404, `Livre ${idParam} introuvable`);
  }
  return book;
}

function ensureCodeIsFree(code, currentId) {
  const existing = findBookByCode(code);
  if (existing && existing.id !== currentId) {
    throw new HttpError(409, `Le code ${code} est déjà utilisé par le livre ${existing.id}`);
  }
}

booksRouter.get('/', (req, res) => {
  res.json(listBooks());
});

booksRouter.get('/:id', (req, res) => {
  res.json(findBookOr404(req.params.id));
});

booksRouter.post('/', (req, res) => {
  const data = readBook(req.body);
  ensureCodeIsFree(data.code);
  const book = createBook(data);
  res.status(201).location(`${req.baseUrl}/${book.id}`).json(book);
});

booksRouter.put('/:id', (req, res) => {
  const current = findBookOr404(req.params.id);
  const data = readBook(req.body);
  ensureCodeIsFree(data.code, current.id);
  res.json(replaceBook(current.id, data));
});

booksRouter.patch('/:id', (req, res) => {
  const current = findBookOr404(req.params.id);
  const data = readBook({ ...current, ...req.body });
  ensureCodeIsFree(data.code, current.id);
  res.json(replaceBook(current.id, data));
});

booksRouter.delete('/:id', (req, res) => {
  const book = findBookOr404(req.params.id);
  deleteBook(book.id);
  res.sendStatus(204);
});
```

Lance `npm install` puis `npm start`, et suis les requêtes dans l’ordre : chacune
dépend de l’état laissé par les précédentes.

### Lire : `GET /api/books` et `GET /api/books/:id`

```bash
curl -s http://localhost:3000/api/books/3
curl -s -i http://localhost:3000/api/books/42
```

```text
{"id":3,"code":"ZOL-001","title":"Germinal","author":"Émile Zola","year":1885,"available":false}
HTTP/1.1 404 Not Found
…
{"error":"Livre 42 introuvable"}
```

`GET /api/books` renvoie le tableau des sept livres. Un élément inexistant donne **404**,
jamais `200` avec `null` : le client doit pouvoir distinguer « trouvé » de « absent » par
le statut. `findBookOr404` concentre ce contrôle, réutilisé par quatre routes. Un
identifiant non numérique (`/api/books/abc`) donne aussi 404 : `Number('abc')` vaut
`NaN` et aucun livre n’a cet identifiant. On aurait pu répondre 400 ; 404 est plus
simple et tout aussi honnête, puisque cette adresse ne désigne aucune ressource.

À l’inverse, une **collection vide** répond `200` avec `[]` : la collection existe, elle
ne contient rien.

### Créer : `POST /api/books` → 201 et `Location`

```bash
curl -s -i --json '{"code":"VER-001","title":"Cinq semaines en ballon","author":"Jules Verne","year":1863}' http://localhost:3000/api/books
```

```http
HTTP/1.1 201 Created
X-Powered-By: Express
Location: /api/books/8
Content-Type: application/json; charset=utf-8
Content-Length: 111
ETag: W/"6f-Qvb4Ogp57IftPwg25P4TU8vG7A8"
Date: Sat, 21 Nov 2026 21:49:45 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":8,"code":"VER-001","title":"Cinq semaines en ballon","author":"Jules Verne","year":1863,"available":true}
```

Trois éléments forment une bonne réponse de création :

1. le statut **201 Created**, qui dit « une ressource a été créée » ;
2. l’en-tête **`Location`**, qui donne l’adresse de la nouvelle ressource. La norme
   HTTP accepte une référence relative comme `/api/books/8`, résolue par rapport à
   l’URL de la requête. `req.baseUrl` vaut `/api/books`, le chemin de montage du
   routeur : la route ne répète pas son propre préfixe ;
3. le **corps** avec la ressource complète, y compris ce que le serveur a ajouté
   (`id`, `available` par défaut). Le client n’a pas besoin d’une seconde requête.

`curl -s http://localhost:3000/api/books/8` renvoie bien le nouveau livre.

### Les conflits : 409

Renvoie exactement la même requête de création :

```text
HTTP/1.1 409 Conflict
…
{"error":"Le code VER-001 est déjà utilisé par le livre 8"}
```

**409 Conflict** signifie que la requête est correcte en elle-même, mais qu’elle entre en
conflit avec l’**état actuel** de la ressource : ici, la règle « un code d’inventaire est
unique ». Le message dit au client quoi changer. Note au passage l’effet protecteur de
cette règle : sans clé unique, un client qui renverrait son `POST` après une coupure
réseau créerait un doublon.

`ensureCodeIsFree(code, currentId)` prend l’identifiant du livre en cours de
modification : un livre peut garder **son propre** code lors d’un `PUT` ou d’un `PATCH`.

### Remplacer : `PUT /api/books/:id`

`PUT` envoie la représentation **complète** de la ressource, qui remplace l’ancienne.

```bash
curl -s -X PUT --json '{"code":"ZOL-001","title":"Germinal","author":"Émile Zola","year":1885,"available":true}' http://localhost:3000/api/books/3
curl -s -X PUT --json '{"title":"Germinal"}' http://localhost:3000/api/books/3
```

```text
{"id":3,"code":"ZOL-001","title":"Germinal","author":"Émile Zola","year":1885,"available":true}
{"error":"code, title et author sont obligatoires"}
```

Envoie la première commande une seconde fois : la réponse et l’état sont identiques.
C’est l’**idempotence** de `PUT`. La seconde commande montre qu’un `PUT` incomplet est
refusé : remplacer par une représentation partielle effacerait les autres champs.

Que faire d’un `PUT` vers un identifiant qui n’existe pas ? La norme HTTP permet à `PUT`
de **créer** la ressource à l’adresse indiquée. Ce choix a du sens quand le client
choisit les identifiants. Ici, c’est le serveur qui les attribue : on répond 404, et la
création passe par `POST`.

### Modifier en partie : `PATCH /api/books/:id`

`PATCH` n’envoie que les champs à changer :

```bash
curl -s -X PATCH --json '{"available":false}' http://localhost:3000/api/books/1
curl -s -X PATCH --json '{"code":"ZOL-001"}' http://localhost:3000/api/books/1
```

```text
{"id":1,"code":"HUG-001","title":"Les Misérables","author":"Victor Hugo","year":1862,"available":false}
{"error":"Le code ZOL-001 est déjà utilisé par le livre 3"}
```

La route fusionne le livre actuel et les changements (`{ ...current, ...req.body }`),
puis applique les mêmes contrôles que `PUT` au résultat. Cette fusion est simple, mais
imparfaite : elle laisse passer des champs inconnus du corps jusqu’à `readBook`, qui les
ignore silencieusement. La leçon suivante validera précisément chaque champ.

### Supprimer : `DELETE /api/books/:id` → 204

```bash
curl -s -i -X DELETE http://localhost:3000/api/books/8
curl -s -i -X DELETE http://localhost:3000/api/books/8
```

La première réponse est `HTTP/1.1 204 No Content`, sans corps ; la seconde
`HTTP/1.1 404 Not Found` avec `{"error":"Livre 8 introuvable"}`. Les réponses diffèrent,
mais l’**état** du serveur est le même après une ou deux suppressions : `DELETE` est
idempotent. Certaines API répondent 204 aux deux appels pour simplifier le travail des
clients ; c’est un choix défendable, à condition de le documenter.

## Récapitulatif des statuts de l’API

| Requête                       | Succès | Erreurs possibles      |
| ----------------------------- | ------ | ---------------------- |
| `GET /api/books`              | 200    | —                      |
| `GET /api/books/:id`          | 200    | 404                    |
| `POST /api/books`             | 201    | 400, 409               |
| `PUT /api/books/:id`          | 200    | 400, 404, 409          |
| `PATCH /api/books/:id`        | 200    | 400, 404, 409          |
| `DELETE /api/books/:id`       | 204    | 404                    |

Pour `PUT` et `PATCH`, tu pourrais aussi répondre 204 sans corps. Renvoyer la ressource
mise à jour avec 200 évite au client une nouvelle lecture : c’est le choix fait ici.

## Pièges courants

- **200 pour une création** : le client ne sait pas qu’une ressource est née, ni où.
  `res.status(201).location(…).json(…)`.
- **`res.json(book, 201)`** : signature d’Express 4, le statut est ignoré (200).
- **200 avec `null` ou `{}`** pour un élément absent au lieu de 404.
- **Enregistrer `req.body` tel quel** : le client pourrait fixer `id`, ou ajouter
  n’importe quel champ. Construis l’objet stocké à partir de champs contrôlés.
- **Identifiant calculé avec la taille** de la collection : doublons après suppression.
- **`PUT` qui fusionne** au lieu de remplacer : c’est le comportement de `PATCH`. Les
  clients ne peuvent plus effacer un champ facultatif.
- **Oublier de vérifier l’unicité lors d’une modification** : `PATCH` pourrait donner à
  un livre le code d’un autre.
- **Exclure le livre lui-même du contrôle d’unicité** est indispensable : sans
  `currentId`, un `PUT` qui garde le même code répondrait 409.

## Exercices

### Exercice 1 — Prédire une séquence

Le serveur vient de démarrer avec les sept livres d’exemple. Donne le statut de chaque
requête, dans l’ordre :

```text
1. POST   /api/books     {"code":"VOL-001","title":"Candide","author":"Voltaire","year":1759}
2. POST   /api/books     {"code":"VOL-001","title":"Autre","author":"X","year":1900}
3. GET    /api/books/8
4. PATCH  /api/books/8   {"available":false}
5. PATCH  /api/books/8   {"available":false}
6. PUT    /api/books/9   {"code":"AAA-001","title":"A","author":"B","year":1900}
7. DELETE /api/books/8
8. GET    /api/books/8
9. POST   /api/books     {"code":"VOL-001","title":"Candide","author":"Voltaire","year":1759}
```

:::solution

```text
1. 201  Location: /api/books/8
2. 409  code VOL-001 déjà utilisé par le livre 8
3. 200
4. 200  available: false
5. 200  même résultat : cette modification est idempotente
6. 404  le livre 9 n’existe pas et PUT ne crée pas dans cette API
7. 204
8. 404
9. 201  Location: /api/books/9
```

À la requête 9, le code `VOL-001` est de nouveau libre (le livre 8 a été supprimé), et le
nouveau livre reçoit l’identifiant **9** : `nextId` ne revient jamais en arrière.
L’identifiant 8 n’est pas réutilisé, ce qui évite qu’un ancien lien vers `/api/books/8`
désigne soudain un autre livre.

:::

### Exercice 2 — Une ressource « adhérents »

Ajoute une ressource `/api/members` (adhérents de la bibliothèque), stockée en mémoire
dans son propre routeur, avec `GET` (liste), `GET /:id`, `POST` et `DELETE /:id`. Un
adhérent a un nom et une adresse électronique. L’adresse est normalisée (espaces retirés,
minuscules) et doit être unique : 409 sinon. Une adresse sans `@` ou un nom absent donne
400.

:::solution

```js
// src/routes/members.js
import { Router } from 'express';
import { HttpError } from '../errors.js';

const members = new Map();
let nextId = 1;

export const membersRouter = Router();

function findMemberOr404(idParam) {
  const member = members.get(Number(idParam));
  if (!member) {
    throw new HttpError(404, `Adhérent ${idParam} introuvable`);
  }
  return member;
}

membersRouter.get('/', (req, res) => {
  res.json([...members.values()]);
});

membersRouter.get('/:id', (req, res) => {
  res.json(findMemberOr404(req.params.id));
});

membersRouter.post('/', (req, res) => {
  const { name, email } = req.body ?? {};
  if (typeof name !== 'string' || typeof email !== 'string' || !email.includes('@')) {
    throw new HttpError(400, 'name et email (avec @) sont obligatoires');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const taken = [...members.values()].some((member) => member.email === normalizedEmail);
  if (taken) {
    throw new HttpError(409, `L’adresse ${normalizedEmail} est déjà inscrite`);
  }
  const member = { id: nextId, name: name.trim(), email: normalizedEmail };
  nextId += 1;
  members.set(member.id, member);
  res.status(201).location(`${req.baseUrl}/${member.id}`).json(member);
});

membersRouter.delete('/:id', (req, res) => {
  const member = findMemberOr404(req.params.id);
  members.delete(member.id);
  res.sendStatus(204);
});
```

Dans `src/app.js`, importe `membersRouter` et monte-le à côté de l’autre :
`app.use('/api/members', membersRouter);`.

```bash
curl -s -i --json '{"name":"Ada Lovelace","email":"Ada@Example.org"}' http://localhost:3000/api/members
curl -s -i --json '{"name":"Ada L.","email":"ada@example.org "}' http://localhost:3000/api/members
```

La première réponse est `201 Created` avec `Location: /api/members/1` et
`{"id":1,"name":"Ada Lovelace","email":"ada@example.org"}`. La seconde est
`409 Conflict` avec `{"error":"L’adresse ada@example.org est déjà inscrite"}`.

- La normalisation **avant** la comparaison rend l’unicité robuste : sans elle,
  `Ada@Example.org` et `ada@example.org ` seraient deux adhérents.
- Le contrôle de l’adresse est volontairement rudimentaire. Valider parfaitement une
  adresse électronique est difficile ; en pratique, on vérifie surtout qu’elle reçoit
  bien les messages.
- Ici, le stockage est dans le routeur pour aller vite. Pour être cohérent avec les
  livres, déplace-le dans `src/store/members-store.js`.

:::

### Exercice 3 — Le bug des identifiants

Un collègue propose de simplifier `createBook` avec `const book = { id: books.size + 1,
...data };` et de supprimer `nextId`. Décris une séquence de trois requêtes qui casse
l’API, et ses conséquences.

:::solution

Avec les sept livres d’exemple (identifiants 1 à 7) :

```text
1. DELETE /api/books/3      → 204, il reste 6 livres
2. POST   /api/books {…}    → id = 6 + 1 = 7 : déjà utilisé par Bel-Ami
3. GET    /api/books/7      → le nouveau livre ; Bel-Ami a été écrasé dans la Map
```

`books.set(7, …)` remplace silencieusement l’ancien livre 7 : une donnée est perdue
sans aucune erreur. Les liens existants vers `/api/books/7` désignent désormais un autre
livre. Un compteur qui ne fait qu’augmenter (ou un identifiant aléatoire comme
`crypto.randomUUID()`) garantit qu’un identifiant n’est jamais réattribué. Une base de
données fournit le même service avec ses séquences.

:::

## Récapitulatif

- Isole le stockage dans un module (`listBooks`, `getBook`, `createBook`…) : les routes
  ne dépendent pas de la façon dont les données sont rangées.
- Identifiants attribués par le serveur, jamais réutilisés ; objets stockés construits à
  partir de champs contrôlés, jamais `req.body` tel quel.
- `GET` → 200 (404 si absent) ; `POST` → 201 + `Location` + ressource ; `PUT` remplace
  entièrement ; `PATCH` modifie en partie ; `DELETE` → 204 (404 si absent).
- 409 signale un conflit avec l’état actuel, comme une valeur qui doit rester unique.
- `PUT` et `DELETE` sont idempotents : l’état final ne dépend pas du nombre d’envois,
  même si la réponse change.
- Une collection vide est un succès (`200` et `[]`) ; un élément absent est une 404.
