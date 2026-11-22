---
title: Premier serveur, routes et paramètres
summary: Créer un serveur Express 5, définir des routes et lire les paramètres de chemin.
durationMinutes: 50
sources:
  - title: Express — Routage
    url: https://expressjs.com/en/guide/routing.html
  - title: Express — Migrer vers Express 5
    url: https://expressjs.com/en/guide/migrating-5.html
  - title: Express 5 — Référence de l’API
    url: https://expressjs.com/en/5x/api.html
---

## Pourquoi un framework pour écrire un serveur ?

Un serveur HTTP est un programme qui attend des requêtes et renvoie des réponses. Node.js
sait déjà le faire avec son module intégré `node:http`. Voici un serveur minimal qui
répond sur `/` et renvoie une erreur 404 partout ailleurs :

```js
// http-server.js
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bonjour depuis node:http');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Page introuvable');
});

server.listen(3000, () => {
  console.log('Serveur prêt sur http://localhost:3000');
});
```

Ce code fonctionne, mais imagine-le avec trente adresses différentes, des paramètres dans
l’URL, un corps JSON à lire, des erreurs à gérer et des fichiers à servir : une seule
fonction géante pleine de `if`. **Express** est une bibliothèque construite au-dessus de
`node:http` qui apporte trois choses :

- un **routeur** : tu associes une méthode et un chemin à une fonction ;
- des **middlewares** : de petites fonctions enchaînées qui traitent la requête
  (lire le JSON, journaliser, vérifier…) ;
- des **raccourcis** pour répondre : `res.json()`, `res.status()`, `res.sendStatus()`…

Ce cours utilise **Express 5**, la version majeure actuelle. Beaucoup de tutoriels et de
réponses d’IA sont encore écrits pour Express 4 : la leçon signale les différences qui
cassent ton code.

## Installer Express dans un projet

Tu sais déjà initialiser un projet npm. Crée un dossier, déclare-le en modules ES et
installe Express 5 :

```bash
mkdir notes-api
cd notes-api
npm init -y
npm pkg set type=module
npm install express@5
```

`npm init -y` crée un `package.json` en mode CommonJS (`"type": "commonjs"`) ; la commande
`npm pkg set type=module` le passe en modules ES pour pouvoir écrire `import`. Ton
`package.json` contient maintenant notamment :

```json
{
  "type": "module",
  "dependencies": {
    "express": "^5.3.0"
  }
}
```

Le numéro exact de version dépend du jour de l’installation ; l’important est qu’il
commence par 5.

## Le serveur minimal

Crée `server.js` :

```js
// server.js
import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/', (req, res) => {
  res.send('Bonjour depuis Express');
});

app.listen(port, (error) => {
  if (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Serveur prêt sur http://localhost:${port}`);
});
```

Lance-le avec `node server.js`. Le terminal affiche :

```text
Serveur prêt sur http://localhost:3000
```

Le programme ne se termine pas : il **écoute** le port 3000 en attendant des requêtes.
Dans un second terminal, interroge-le avec `curl -i` (l’option `-i` affiche aussi la ligne
de statut et les en-têtes de la réponse) :

```bash
curl -i http://localhost:3000/
```

```http
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: text/html; charset=utf-8
Content-Length: 22
ETag: W/"16-GjgU+LGtxqfrwiK64fB5Xq0y3HQ"
Date: Sat, 21 Nov 2026 21:25:52 GMT
Connection: keep-alive
Keep-Alive: timeout=5

Bonjour depuis Express
```

La date sera évidemment différente chez toi. Décortiquons :

- `express()` crée une **application**, l’objet `app`, qui porte les routes et les
  middlewares.
- `app.get('/', handler)` déclare une **route** : « quand une requête `GET` arrive sur le
  chemin `/`, appelle cette fonction ». La fonction reçoit `req` (la requête) et `res` (la
  réponse).
- `res.send()` envoie la réponse. Avec une chaîne, Express choisit le type
  `text/html; charset=utf-8`, calcule `Content-Length` et ajoute un `ETag` (une empreinte
  du contenu utile pour le cache).
- `app.listen(port, callback)` démarre le serveur HTTP.

Arrête le serveur avec `Ctrl+C`.

### Le port vient de l’environnement

`Number(process.env.PORT) || 3000` lit la variable d’environnement `PORT` et prend 3000
si elle est absente ou invalide (`Number(undefined)` donne `NaN`, qui est falsy). C’est la
convention des hébergeurs : ce sont eux qui choisissent le port. Teste :

```bash
PORT=4000 node server.js
```

```text
Serveur prêt sur http://localhost:4000
```

### Le callback de `app.listen` reçoit l’erreur

Avec Express 5, si le serveur ne peut pas démarrer, l’erreur est passée en premier
argument du callback de `app.listen`. Lance deux fois le serveur sur le même port (le
premier dans un terminal, le second dans un autre) ; le second affiche :

```text
Impossible de démarrer le serveur : listen EADDRINUSE: address already in use 0.0.0.0:3000
```

`EADDRINUSE` signifie « adresse déjà utilisée » : un autre programme écoute déjà ce port.
L’adresse affichée peut varier selon ta machine (`:::3000` par exemple). Sans le test
`if (error)`, ton code afficherait « Serveur prêt » alors que rien n’écoute.

:::tip[Redémarrage automatique]
Pendant le développement, lance `node --watch server.js` : Node relance le script chaque
fois que tu enregistres un fichier importé. Plus besoin de faire `Ctrl+C` puis de
relancer.

:::

## Les routes : méthode + chemin + fonction

Une route associe une **méthode HTTP** et un **chemin** à un gestionnaire. Express fournit
une méthode par verbe HTTP : `app.get`, `app.post`, `app.put`, `app.patch`, `app.delete`.
Que se passe-t-il pour une requête qui ne correspond à aucune route ?

```bash
curl -i http://localhost:3000/abc
```

```http
HTTP/1.1 404 Not Found
X-Powered-By: Express
Content-Security-Policy: default-src 'none'
X-Content-Type-Options: nosniff
Content-Type: text/html; charset=utf-8
Content-Length: 142
Date: Sat, 21 Nov 2026 21:25:52 GMT
Connection: keep-alive
Keep-Alive: timeout=5

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot GET /abc</pre>
</body>
</html>
```

Express répond lui-même 404 avec une petite page HTML. Même chose pour
`curl -X POST http://localhost:3000/` : la route existe pour `GET`, pas pour `POST`, donc
la réponse est `Cannot POST /`. Une route est bien le couple **méthode + chemin**. Dans la
leçon sur les erreurs, tu remplaceras cette page par une réponse JSON.

## Les paramètres de route

Une API doit souvent répondre à des adresses comme `/books/1`, `/books/2`… Tu ne vas pas
écrire une route par livre. Un segment qui commence par deux-points est un **paramètre de
route** : Express accepte n’importe quelle valeur à cet endroit et la range dans
`req.params`.

```js
// routes.js
import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

const books = [
  { id: 1, title: 'Les Misérables', author: 'Victor Hugo' },
  { id: 2, title: 'Germinal', author: 'Émile Zola' },
];

app.get('/books', (req, res) => {
  res.json(books);
});

// Route statique déclarée AVANT la route paramétrée
app.get('/books/count', (req, res) => {
  res.json({ count: books.length });
});

app.get('/books/:id', (req, res) => {
  console.log(req.params, typeof req.params.id);
  const id = Number(req.params.id);
  const book = books.find((item) => item.id === id);
  if (!book) {
    res.status(404).json({ error: `Livre ${req.params.id} introuvable` });
    return;
  }
  res.json(book);
});

app.get('/authors/:author/books/:bookId', (req, res) => {
  res.json(req.params);
});

app.listen(port, () => {
  console.log(`Serveur prêt sur http://localhost:${port}`);
});
```

Lance `node routes.js` puis, dans l’autre terminal (l’option `-s` masque la barre de
progression de curl) :

```bash
curl -s http://localhost:3000/books/2
curl -s http://localhost:3000/books/count
curl -s http://localhost:3000/books/42
curl -s http://localhost:3000/authors/hugo/books/7
```

```text
{"id":2,"title":"Germinal","author":"Émile Zola"}
{"count":2}
{"error":"Livre 42 introuvable"}
{"author":"hugo","bookId":"7"}
```

Et côté serveur, pour les requêtes `/books/2` et `/books/42` :

```text
[Object: null prototype] { id: '2' } string
[Object: null prototype] { id: '42' } string
```

Trois enseignements :

1. **Les paramètres sont toujours des chaînes.** `req.params.id` vaut `'2'`, pas `2`. La
   comparaison stricte `item.id === req.params.id` serait toujours fausse : il faut
   convertir avec `Number()`. Pour `/books/abc`, `Number('abc')` donne `NaN`, aucun livre
   ne correspond et la réponse est 404 — un comportement correct.
2. **`[Object: null prototype]`** : Express crée `req.params` comme un objet sans
   prototype ; il n’hérite donc d’aucune propriété comme `toString`. Pour toi, rien ne
   change : tu lis ses propriétés comme celles d’un objet ordinaire.
3. **`res.json()`** transforme l’objet en JSON et fixe `Content-Type: application/json`.
   Chaîner `res.status(404).json(…)` fixe le code de statut avant d’envoyer.

Par défaut, le routage d’Express ne tient compte ni de la casse ni d’une barre oblique
finale : `/BOOKS/2` et `/books/2/` atteignent aussi la route `/books/:id`. Ces réglages
(`case sensitive routing`, `strict routing`) peuvent être changés, mais garde des URL en
minuscules sans barre finale : c’est la convention la plus répandue.

### L’ordre de déclaration compte

Express teste les routes **dans l’ordre où tu les as déclarées** et s’arrête à la première
qui correspond et répond. Dans l’exemple, `/books/count` est déclarée avant
`/books/:id`. Inverse-les :

```js
app.get('/books/:id', (req, res) => {
  res.send(`Livre ${req.params.id}`);
});

// Jamais atteinte : /books/:id capture déjà /books/count
app.get('/books/count', (req, res) => {
  res.send('2 livres');
});
```

`curl -s http://localhost:3000/books/count` affiche alors `Livre count` : `count` a été
pris pour un identifiant. Règle pratique : **les chemins fixes avant les chemins
paramétrés**.

## La syntaxe des chemins dans Express 5

Express 5 utilise une nouvelle version de la bibliothèque qui interprète les chemins
(`path-to-regexp` en version 8). Plusieurs écritures d’Express 4, que tu retrouveras
dans d’anciens tutoriels, provoquent désormais une **erreur au démarrage**.

### Segment optionnel : des accolades, plus de point d’interrogation

```js
// paths.js
import express from 'express';

const app = express();

// Segment optionnel entre accolades
app.get('/reports/:year{/:month}', (req, res) => {
  res.json(req.params);
});

// Joker nommé : capture un ou plusieurs segments
app.get('/docs/*path', (req, res) => {
  res.json({ path: req.params.path, joined: req.params.path.join('/') });
});

// Extension optionnelle
app.get('/export/:name{.:format}', (req, res) => {
  res.json(req.params);
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/reports/2026
curl -s http://localhost:3000/reports/2026/11
curl -s http://localhost:3000/docs/guide/routing/params
curl -s http://localhost:3000/export/books.csv
curl -s http://localhost:3000/export/books
```

```text
{"year":"2026"}
{"year":"2026","month":"11"}
{"path":["guide","routing","params"],"joined":"guide/routing/params"}
{"name":"books","format":"csv"}
{"name":"books"}
```

Observe :

- Tout ce qui est entre `{` et `}` est **facultatif**. Quand la partie est absente, le
  paramètre n’existe pas du tout dans `req.params` (pas même avec la valeur `undefined`).
- `*path` est un **joker** : il capture un ou plusieurs segments, sous forme de
  **tableau**. Il doit obligatoirement porter un nom (`*path`, `*splat`…).
- `/docs/*path` ne correspond pas à `/docs` seul : le joker exige au moins un segment.
  Pour accepter aussi `/docs`, entoure le joker d’accolades : `/docs{/*path}`. De même,
  `/{*splat}` correspond à toutes les adresses, racine comprise.

### Les anciennes syntaxes qui cassent

Ce code, typique d’Express 4, fait planter le programme **dès le lancement** :

```js
import express from 'express';
const app = express();
app.get('/docs/*', (req, res) => res.send('ok'));
```

```text
PathError [TypeError]: Missing parameter name at index 7: /docs/*; visit https://git.new/pathToRegexpError for info
```

Même chose avec le point d’interrogation d’Express 4 :
`app.get('/reports/:year/:month?', …)` produit
`PathError [TypeError]: Unexpected ? at index 21: /reports/:year/:month?`. Les caractères
`( ) [ ] ? + !` sont réservés ; les expressions régulières dans les chaînes de chemin ne
sont plus acceptées. Si une IA te propose ces syntaxes, traduis-les : `*` devient `*splat`
et `:month?` devient `{/:month}`.

## Pièges courants

### Oublier de répondre

```js
app.get('/forgotten', (req, res) => {
  console.log('Requête reçue, mais aucune réponse envoyée');
});
```

Le serveur affiche le message… et le client attend indéfiniment. Avec
`curl -s --max-time 2 http://localhost:3000/forgotten`, curl abandonne après deux secondes
avec le code de sortie 28 (délai dépassé). **Chaque requête doit recevoir exactement une
réponse.**

### Répondre deux fois

```js
app.get('/twice', (req, res) => {
  res.send('Première réponse');
  res.send('Seconde réponse');
});
```

Le client reçoit `Première réponse`, et le serveur affiche une erreur :

```text
Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
```

Une réponse HTTP part une seule fois. Ce piège apparaît surtout quand on oublie un
`return` après une réponse d’erreur :

```js
// Erreur : sans return, le code continue après la réponse 404
if (!book) {
  res.status(404).json({ error: 'Livre introuvable' });
}
res.json(book);
```

Corrige en ajoutant `return;` après la réponse 404 (ou un `else`), comme dans l’exemple
`routes.js`.

### Comparer un paramètre sans le convertir

`books.find((item) => item.id === req.params.id)` ne trouve jamais rien : `1 === '1'` est
faux. Convertis d’abord avec `Number()`.

### Renvoyer du texte saisi par l’utilisateur en HTML

`res.send()` avec une chaîne répond en `text/html`. Si cette chaîne contient un paramètre
de l’URL, un visiteur peut y glisser du HTML, voire un script, que le navigateur
interprétera : c’est une faille de type XSS (cross-site scripting), étudiée dans le
cours de sécurité. Pour renvoyer du texte construit à partir d’une entrée, réponds en
JSON avec `res.json()` ou force le texte brut avec `res.type('text/plain').send(…)`.

## Exercices

### Exercice 1 — Salutations

Écris un serveur qui répond à `GET /hello/:name` par `Bonjour, Ada !` (pour
`/hello/Ada`). Ajoute un segment optionnel de langue : `/hello/Ada/en` répond
`Hello, Ada!` ; toute autre langue, ou son absence, donne la version française. La
réponse doit être du texte brut, pas du HTML.

:::solution

```js
// hello.js
import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/hello/:name{/:lang}', (req, res) => {
  const { name, lang } = req.params;
  if (lang === 'en') {
    res.type('text/plain').send(`Hello, ${name}!`);
    return;
  }
  res.type('text/plain').send(`Bonjour, ${name} !`);
});

app.listen(port, () => {
  console.log(`Serveur prêt sur http://localhost:${port}`);
});
```

```bash
curl -s http://localhost:3000/hello/Ada
curl -s http://localhost:3000/hello/Ada/en
curl -s http://localhost:3000/hello/Ada/de
curl -s http://localhost:3000/hello/Jean%20Dupont
```

```text
Bonjour, Ada !
Hello, Ada!
Bonjour, Ada !
Bonjour, Jean Dupont !
```

- `{/:lang}` rend le segment facultatif ; sans lui, `lang` est absent de `req.params`
  et la destructuration donne `undefined`.
- Le `return` après la première réponse évite d’en envoyer une seconde.
- `res.type('text/plain')` empêche le navigateur d’interpréter du HTML glissé dans le nom.
- Express décode les paramètres : `%20` devient une espace.

:::

### Exercice 2 — Additionneur

Écris `GET /add/:a/:b` qui renvoie en JSON les deux nombres et leur somme. Si l’un des
deux n’est pas un nombre fini, réponds 400 avec un message d’erreur en JSON. Teste
`/add/2/40`, `/add/0.1/0.2`, `/add/2/abc` et `/add/Infinity/1`.

:::solution

```js
// add.js
import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.get('/add/:a/:b', (req, res) => {
  const a = Number(req.params.a);
  const b = Number(req.params.b);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    res
      .status(400)
      .json({ error: 'Les deux paramètres doivent être des nombres' });
    return;
  }
  res.json({ a, b, sum: a + b });
});

app.listen(port, () => {
  console.log(`Serveur prêt sur http://localhost:${port}`);
});
```

```bash
curl -s http://localhost:3000/add/2/40
curl -s http://localhost:3000/add/0.1/0.2
curl -s -i http://localhost:3000/add/2/abc
curl -s http://localhost:3000/add/Infinity/1
```

```text
{"a":2,"b":40,"sum":42}
{"a":0.1,"b":0.2,"sum":0.30000000000000004}
HTTP/1.1 400 Bad Request
…
{"error":"Les deux paramètres doivent être des nombres"}
{"error":"Les deux paramètres doivent être des nombres"}
```

- Les paramètres sont des chaînes : sans `Number()`, `'2' + '40'` donnerait `'240'`.
- `Number.isFinite` rejette à la fois `NaN` (`abc`) et `Infinity`, que `Number.isNaN`
  laisserait passer.
- `0.30000000000000004` n’est pas un bug d’Express : c’est la virgule flottante binaire
  que tu as vue en JavaScript.
- 400 (Bad Request) indique que la faute vient de la requête du client.

:::

### Exercice 3 — Qui répond ?

Sans exécuter le code, indique la réponse à chacune des requêtes suivantes, puis
vérifie.

```js
app.get('/users/me', (req, res) => res.json({ route: 'me' }));
app.get('/users/:id', (req, res) =>
  res.json({ route: 'id', id: req.params.id }),
);
app.get('/users/:id/posts{/:postId}', (req, res) => res.json(req.params));
app.post('/users', (req, res) => res.status(201).json({ route: 'create' }));
```

Requêtes : `GET /users/me`, `GET /users/12`, `GET /users/12/posts`,
`GET /users/12/posts/3`, `POST /users/12`, `GET /users`.

:::solution

```text
GET  /users/me          {"route":"me"}            (route fixe déclarée en premier)
GET  /users/12          {"route":"id","id":"12"}  (id est une chaîne)
GET  /users/12/posts    {"id":"12"}               (postId absent de req.params)
GET  /users/12/posts/3  {"id":"12","postId":"3"}
POST /users/12          404 « Cannot POST /users/12 » (aucune route POST sur ce chemin)
GET  /users             404 « Cannot GET /users » (seul POST /users existe)
```

Si `/users/me` avait été déclarée après `/users/:id`, `GET /users/me` aurait renvoyé
`{"route":"id","id":"me"}`. Une route se définit par la méthode **et** le chemin : un
chemin connu avec une autre méthode donne aussi 404 par défaut.

:::

## Récapitulatif

- Express s’appuie sur `node:http` et ajoute routeur, middlewares et raccourcis de
  réponse. Installe-le avec `npm install express@5` dans un projet en modules ES.
- `const app = express()` crée l’application ; `app.listen(port, callback)` la démarre.
  En Express 5, le callback reçoit l’erreur de démarrage éventuelle (`EADDRINUSE`).
- Le port se lit dans `process.env.PORT` avec une valeur par défaut.
- Une route = méthode + chemin + gestionnaire `(req, res) => { … }`. Les routes sont
  testées dans l’ordre de déclaration : chemins fixes avant chemins paramétrés.
- `:id` crée un paramètre lu dans `req.params`, **toujours une chaîne** à convertir.
- Express 5 : segment optionnel `{/:month}`, joker nommé `*path` (un tableau),
  `/{*splat}` pour inclure la racine. `*` seul et `?` font planter le démarrage.
- Chaque requête reçoit exactement une réponse : pense au `return` après une réponse
  d’erreur. Ne renvoie pas une entrée utilisateur en HTML.
