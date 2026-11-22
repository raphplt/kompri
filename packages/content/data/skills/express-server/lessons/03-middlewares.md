---
title: La chaîne de middlewares
summary: Comprendre comment Express fait passer une requête de fonction en fonction, et écrire ses propres middlewares.
durationMinutes: 50
sources:
  - title: Express — Écrire un middleware
    url: https://expressjs.com/en/guide/writing-middleware.html
  - title: Express — Utiliser des middlewares
    url: https://expressjs.com/en/guide/using-middleware.html
  - title: Express 5 — Référence de l’API
    url: https://expressjs.com/en/5x/api.html
---

## Le problème : du code commun à beaucoup de routes

Imagine une API de vingt routes. Tu veux journaliser chaque requête, lire le JSON,
refuser les requêtes mal formées, mesurer le temps de réponse. Copier ces lignes dans
chaque gestionnaire serait long, fragile et facile à oublier.

Express résout ce problème avec les **middlewares** : des fonctions placées *entre*
l’arrivée de la requête et la réponse. La requête traverse une **chaîne** de fonctions,
dans l’ordre où tu les as déclarées. Chacune peut :

- lire ou compléter la requête et la réponse ;
- **répondre** elle-même, ce qui arrête la chaîne ;
- **passer la main** à la suivante en appelant `next()`.

Tu en utilises déjà un : `express.json()` est un middleware qui lit le corps et remplit
`req.body`, puis appelle `next()`. Et un gestionnaire de route est lui aussi un
middleware, simplement attaché à une méthode et à un chemin précis.

## Anatomie d’un middleware

Un middleware est une fonction à trois paramètres : `req`, `res` et `next`.

```js
// chain.js
import express from 'express';

const app = express();

app.use((req, res, next) => {
  console.log(`A. premier middleware (${req.method} ${req.url})`);
  next();
  console.log('E. retour dans le premier middleware');
});

app.use((req, res, next) => {
  console.log('B. second middleware');
  next();
});

app.get('/', (req, res) => {
  console.log('C. gestionnaire de la route GET /');
  res.send('Bonjour');
  console.log('D. après res.send');
});

app.use((req, res, next) => {
  console.log('X. dernier middleware : aucune route n’a répondu');
  next();
});

app.listen(3000, () => console.log('Prêt'));
```

Envoie deux requêtes :

```bash
curl -s http://localhost:3000/
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/autre
```

La première affiche `Bonjour`, la seconde `404` (l’option `-w` de curl affiche le code
de statut). Dans le terminal du serveur :

```text
Prêt
A. premier middleware (GET /)
B. second middleware
C. gestionnaire de la route GET /
D. après res.send
E. retour dans le premier middleware
A. premier middleware (GET /autre)
B. second middleware
X. dernier middleware : aucune route n’a répondu
E. retour dans le premier middleware
```

Lis attentivement :

- `app.use(fn)` sans chemin enregistre un middleware pour **toutes** les requêtes, quelle
  que soit la méthode.
- Pour `GET /`, la chaîne s’arrête au gestionnaire de route, qui répond sans appeler
  `next()` : le middleware `X` n’est jamais exécuté.
- Pour `GET /autre`, aucune route ne correspond : la requête arrive jusqu’à `X`, qui
  appelle `next()`. Il n’y a plus personne après lui, donc Express envoie sa réponse 404
  par défaut.
- `res.send()` envoie la réponse mais **n’arrête pas la fonction** : la ligne `D`
  s’exécute quand même.
- `next()` est un simple appel de fonction : quand la suite de la chaîne a fini son
  travail **synchrone**, l’exécution revient dans le premier middleware (ligne `E`). Ne
  compte pas sur ce retour pour agir « après la réponse » : dès qu’un gestionnaire est
  asynchrone, `E` s’exécute avant qu’il ait répondu. Pour agir après la réponse, il
  existe un outil dédié, présenté plus bas.

### Les trois issues d’un middleware

Chaque middleware doit faire **une et une seule** de ces trois choses :

1. appeler `next()` pour passer la main ;
2. répondre (`res.send`, `res.json`, `res.sendStatus`…) et ne pas appeler `next()` ;
3. appeler `next(error)` pour signaler une erreur (leçon suivante).

S’il ne fait rien, la requête reste bloquée jusqu’à ce que le client abandonne. S’il
répond **et** appelle `next()`, une route suivante risque de répondre une seconde fois :
erreur `ERR_HTTP_HEADERS_SENT`.

## Un premier middleware utile : le journal des requêtes

Un journal (log) qui affiche la méthode, l’URL, le statut et la durée de chaque requête
est un grand classique. Le statut n’est connu qu’**après** la réponse : on écoute pour
cela l’événement `finish` de l’objet `res`, émis quand le serveur a fini
d’envoyer la réponse (il l’a confiée au système pour transmission sur le réseau).

```js
// logger.js
import express from 'express';

const app = express();

function requestLogger(req, res, next) {
  const start = performance.now();
  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(1);
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration} ms)`);
  });
  next();
}

function requireJson(req, res, next) {
  if (!req.is('application/json')) {
    res.status(415).json({ error: 'Le corps doit être envoyé en application/json' });
    return;
  }
  next();
}

function requireHeader(name) {
  return (req, res, next) => {
    if (!req.get(name)) {
      res.status(400).json({ error: `En-tête ${name} manquant` });
      return;
    }
    next();
  };
}

app.use(requestLogger);
app.use(express.json());

app.get('/notes', (req, res) => {
  res.json([{ id: 1, title: 'Courses' }]);
});

app.post('/notes', requireJson, requireHeader('X-Client-Version'), (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/notes
curl -s -X POST -d 'title=Test' http://localhost:3000/notes
curl -s --json '{"title":"Test"}' http://localhost:3000/notes
curl -s --json '{"title":"Test"}' -H 'X-Client-Version: 1.2.0' http://localhost:3000/notes
curl -s -o /dev/null http://localhost:3000/inconnu
```

```text
[{"id":1,"title":"Courses"}]
{"error":"Le corps doit être envoyé en application/json"}
{"error":"En-tête X-Client-Version manquant"}
{"id":2,"title":"Test"}
```

Le journal du serveur (les durées varient d’une exécution à l’autre) :

```text
Prêt
GET /notes -> 200 (2.9 ms)
POST /notes -> 415 (0.9 ms)
POST /notes -> 400 (5.0 ms)
POST /notes -> 201 (0.6 ms)
GET /inconnu -> 404 (1.1 ms)
```

Ce fichier montre trois façons d’utiliser un middleware.

### Middleware global

`app.use(requestLogger)` s’applique à toutes les requêtes, même celles qui finissent en
404. Il est déclaré **en premier** pour voir passer tout le monde. `performance.now()`
est une horloge précise disponible globalement dans Node.js ; `toFixed(1)` arrondit à une
décimale pour l’affichage.

### Middleware de route

`app.post('/notes', requireJson, requireHeader('X-Client-Version'), handler)` : une route
accepte **plusieurs fonctions**, exécutées dans l’ordre. `requireJson` ne s’applique qu’à
cette route. Il répond `415 Unsupported Media Type` si le corps n’est pas du JSON :
`req.is()` renvoie `false` pour un autre type et `null` sans corps, deux valeurs falsy.

### Fabrique de middlewares

`requireHeader` n’est **pas** un middleware : c’est une fonction qui en **fabrique** un.
`requireHeader('X-Client-Version')` renvoie une fonction `(req, res, next)` qui « se
souvient » du nom grâce à une fermeture (closure). C’est le même principe que
`express.json({ limit: '10kb' })` : on configure, on obtient un middleware.

Un piège fréquent est d’écrire `app.use(requireHeader)` au lieu de
`app.use(requireHeader('X-Client-Version'))` : Express appellerait `requireHeader(req,
res, next)`, qui renverrait une fonction sans jamais répondre ni appeler `next()`. La
requête resterait bloquée.

## Monter un middleware sur un chemin

`app.use('/api', fn)` n’exécute `fn` que pour les chemins qui **commencent par le segment**
`/api` : `/api`, `/api/status`, `/api/notes/3`… mais pas `/apis`. Express ajuste alors
quelques propriétés de la requête, et tu peux transmettre des informations aux fonctions
suivantes avec `res.locals`, un objet prévu pour cela et propre à chaque requête.

```js
// mount.js
import express from 'express';

const app = express();

app.use('/api', (req, res, next) => {
  console.log(`url=${req.url} originalUrl=${req.originalUrl} baseUrl=${req.baseUrl}`);
  res.locals.startedAt = new Date().toISOString();
  next();
});

app.get('/api/status', (req, res) => {
  res.json({ ok: true, hasStartedAt: typeof res.locals.startedAt === 'string' });
});

app.get('/public', (req, res) => {
  res.json({ hasStartedAt: res.locals.startedAt !== undefined });
});

app.get('/late', (req, res) => {
  res.send('route /late');
});

// Déclaré après la route : n'est jamais exécuté pour GET /late
app.use((req, res, next) => {
  console.log('middleware tardif');
  next();
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s 'http://localhost:3000/api/status?x=1'
curl -s http://localhost:3000/public
curl -s http://localhost:3000/late
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/apis
```

```text
{"ok":true,"hasStartedAt":true}
{"hasStartedAt":false}
route /late
404
```

Côté serveur :

```text
Prêt
url=/status?x=1 originalUrl=/api/status?x=1 baseUrl=/api
middleware tardif
```

- Dans un middleware monté sur `/api`, `req.url` est **relative** au point de montage
  (`/status?x=1`), `req.baseUrl` contient le préfixe et `req.originalUrl` reste complète.
  Pour journaliser, utilise donc `req.originalUrl`.
- `res.locals` n’est rempli que pour les requêtes passées par le middleware : `/public`
  ne l’a pas traversé.
- Le middleware tardif ne s’affiche qu’une fois, pour `/apis` (qui n’a trouvé aucune
  route). Pour `/late`, la route a répondu avant lui. **Un middleware déclaré après les
  routes ne voit que les requêtes qu’aucune route n’a traitées** : c’est exactement ce
  qu’on exploitera pour la réponse 404.

## Les middlewares asynchrones en Express 5

Un middleware a souvent besoin d’attendre : lire un fichier, interroger une base. En
Express 5, il peut être une fonction `async`. Voici un middleware qui charge une note et
la transmet à la suite via `res.locals`, réutilisé par deux routes :

```js
// load-note.js
import express from 'express';

const app = express();

const notes = new Map([
  [1, { id: 1, title: 'Courses' }],
  [2, { id: 2, title: 'Réviser Express' }],
]);

// Simule une lecture asynchrone (fichier, base de données…)
async function findNote(id) {
  await new Promise((resolve) => setTimeout(resolve, 5));
  return notes.get(id);
}

async function loadNote(req, res, next) {
  const note = await findNote(Number(req.params.id));
  if (!note) {
    res.status(404).json({ error: `Note ${req.params.id} introuvable` });
    return;
  }
  res.locals.note = note;
  next();
}

app.get('/notes/:id', loadNote, (req, res) => {
  res.json(res.locals.note);
});

app.delete('/notes/:id', loadNote, (req, res) => {
  notes.delete(res.locals.note.id);
  res.sendStatus(204);
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/notes/2
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:3000/notes/2
curl -s http://localhost:3000/notes/2
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:3000/notes/2
```

```text
{"id":2,"title":"Réviser Express"}
204
{"error":"Note 2 introuvable"}
404
```

Le chargement et le cas « introuvable » sont écrits une seule fois. Et si `findNote`
échouait (promesse rejetée), Express 5 transmettrait automatiquement l’erreur au
gestionnaire d’erreurs : c’est le sujet de la leçon suivante.

## Middlewares fournis par Express et par l’écosystème

Express 5 intègre quelques middlewares : `express.json()`, `express.urlencoded()`,
`express.text()`, `express.raw()` (analyseurs de corps) et `express.static()` (fichiers
statiques, vu plus loin). L’écosystème npm en propose beaucoup d’autres, par exemple
`morgan` (journal des requêtes), `cors` (en-têtes CORS) ou `helmet` (en-têtes de
sécurité). Avant d’ajouter une dépendance, demande-toi si dix lignes de ton propre
middleware suffiraient ; quand tu en ajoutes une, vérifie qu’elle est maintenue et
compatible avec Express 5.

## Pièges courants

- **Oublier `next()`** : la requête reste bloquée sans réponse. Chaque branche du
  middleware doit répondre ou appeler `next()`.
- **Répondre puis appeler `next()`** : la suite peut répondre une seconde fois
  (`ERR_HTTP_HEADERS_SENT`). Après une réponse, `return`.
- **Mauvais ordre** : `app.use(express.json())` placé après les routes, ou un journal
  déclaré après elles. L’ordre de déclaration est l’ordre d’exécution.
- **Passer la fabrique au lieu du middleware** : `app.use(requireHeader)` au lieu de
  `app.use(requireHeader('X-Client-Version'))`.
- **Stocker des données de requête dans une variable globale** : deux requêtes
  simultanées se mélangeraient. Utilise `res.locals`, propre à chaque requête.

## Exercices

### Exercice 1 — Compteur de requêtes

Écris un middleware global `requestCounter` qui compte les requêtes par méthode et
chemin (sans la query string), et une route `GET /stats` qui renvoie ces compteurs en
JSON. Après `GET /hello`, `GET /hello?x=1`, `GET /nope` puis `GET /stats`, que renvoie
`/stats` ?

:::solution

```js
// counter.js
import express from 'express';

const app = express();
const counts = {};

function requestCounter(req, res, next) {
  const key = `${req.method} ${req.path}`;
  counts[key] = (counts[key] ?? 0) + 1;
  next();
}

app.use(requestCounter);

app.get('/hello', (req, res) => {
  res.json({ message: 'Bonjour' });
});

app.get('/stats', (req, res) => {
  res.json(counts);
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/hello > /dev/null
curl -s 'http://localhost:3000/hello?x=1' > /dev/null
curl -s http://localhost:3000/nope > /dev/null
curl -s http://localhost:3000/stats
```

```text
{"GET /hello":2,"GET /nope":1,"GET /stats":1}
```

- `req.path` exclut la query string : les deux appels à `/hello` partagent une clé.
- `/nope` est compté car le middleware est global et déclaré avant tout.
- `/stats` se compte lui-même : le middleware s’exécute avant la route.
- Ici, une variable de module est légitime : le compteur est **volontairement** partagé
  entre toutes les requêtes. Il disparaît au redémarrage du serveur.

:::

### Exercice 2 — Paramètre de requête obligatoire

Écris une fabrique `requireQueryParam(name)` qui renvoie un middleware répondant 400
(JSON) si le paramètre de requête `name` est absent, vide, composé d’espaces ou répété.
Utilise-la sur `GET /search` (paramètre `q`) et sur `GET /convert` (paramètres `from` et
`to`).

:::solution

```js
// require-query.js
import express from 'express';

const app = express();

function requireQueryParam(name) {
  return (req, res, next) => {
    const value = req.query[name];
    if (typeof value !== 'string' || value.trim() === '') {
      res.status(400).json({ error: `Paramètre de requête ${name} obligatoire` });
      return;
    }
    next();
  };
}

app.get('/search', requireQueryParam('q'), (req, res) => {
  res.json({ results: [], q: req.query.q });
});

app.get('/convert', requireQueryParam('from'), requireQueryParam('to'), (req, res) => {
  res.json({ from: req.query.from, to: req.query.to });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s 'http://localhost:3000/search?q=hugo'
curl -s 'http://localhost:3000/search?q=%20'
curl -s 'http://localhost:3000/convert?from=EUR'
curl -s 'http://localhost:3000/convert?from=EUR&to=USD'
```

```text
{"results":[],"q":"hugo"}
{"error":"Paramètre de requête q obligatoire"}
{"error":"Paramètre de requête to obligatoire"}
{"from":"EUR","to":"USD"}
```

- `typeof value !== 'string'` couvre à la fois l’absence (`undefined`) et la répétition
  (tableau).
- La fabrique est appelée une fois par utilisation, au démarrage ; chaque middleware
  produit se souvient de son `name` grâce à la fermeture.
- Deux middlewares s’enchaînent sur `/convert` : le premier qui échoue répond et la
  chaîne s’arrête.

:::

### Exercice 3 — Prédire l’ordre d’exécution

Pour chacune des requêtes `GET /api/items`, `GET /api/items?stop=yes`, `GET /about` et
`GET /api/other`, donne les chiffres affichés par le serveur et la réponse reçue.

```js
app.use((req, res, next) => {
  console.log('1');
  next();
});

app.use('/api', (req, res, next) => {
  console.log('2');
  next();
});

function check(req, res, next) {
  console.log('3');
  if (req.query.stop === 'yes') {
    res.status(403).send('Stop');
    return;
  }
  next();
}

app.get('/api/items', check, (req, res) => {
  console.log('4');
  res.send('Items');
});

app.use((req, res) => {
  console.log('5');
  res.status(404).send('Introuvable');
});
```

:::solution

```text
GET /api/items           1 2 3 4   réponse « Items » (200)
GET /api/items?stop=yes  1 2 3     réponse « Stop » (403)
GET /about               1 5       réponse « Introuvable » (404)
GET /api/other           1 2 5     réponse « Introuvable » (404)
```

- `1` s’affiche toujours : middleware global déclaré en premier.
- `2` ne concerne que les chemins sous `/api`.
- `check` n’est attaché qu’à `GET /api/items` ; quand il répond 403, il n’appelle pas
  `next()`, donc `4` ne s’affiche pas.
- Le dernier middleware ne reçoit que les requêtes qu’aucune route n’a traitées : c’est
  un gestionnaire 404 maison.

:::

## Récapitulatif

- Un middleware est une fonction `(req, res, next)`. Il répond, appelle `next()` ou
  appelle `next(error)` : une seule de ces issues, toujours.
- Les middlewares s’exécutent **dans l’ordre de déclaration**. `app.use(fn)` concerne
  toutes les requêtes ; `app.use('/api', fn)` celles dont le chemin commence par le
  segment `/api` ; une route peut recevoir plusieurs fonctions à la suite.
- `res.on('finish', …)` permet d’agir une fois la réponse envoyée (journal, mesure).
- Une fabrique renvoie un middleware configuré : `requireHeader('X-Client-Version')`.
- `res.locals` transmet des données d’un middleware au suivant, pour une seule requête.
- En Express 5, un middleware peut être `async` ; une promesse rejetée est transmise au
  gestionnaire d’erreurs.
- Un middleware placé après toutes les routes ne voit que les requêtes non traitées.
