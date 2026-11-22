---
title: Répondre et gérer les erreurs de façon centralisée
summary: Choisir le bon statut, utiliser les méthodes de réponse d’Express 5 et regrouper toute la gestion des erreurs en un seul endroit.
durationMinutes: 60
sources:
  - title: Express — Gestion des erreurs
    url: https://expressjs.com/en/guide/error-handling.html
  - title: Express — Migrer vers Express 5
    url: https://expressjs.com/en/guide/migrating-5.html
  - title: MDN — Codes de statut de réponse HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status
  - title: RFC 9110 — HTTP Semantics
    url: https://www.rfc-editor.org/rfc/rfc9110
---

## Pourquoi soigner les réponses et les erreurs ?

Le client d’une API, souvent un programme, décide quoi faire en lisant d’abord le **code
de statut**. Si ton serveur répond `200 OK` avec `{"error": "introuvable"}`, le client
croit que tout va bien. S’il répond une page HTML pleine de chemins de fichiers à chaque
erreur, il expose des détails internes et oblige le client à deviner.

Cette leçon te donne deux outils :

1. les méthodes de réponse d’Express 5, pour envoyer **le bon statut avec le bon corps** ;
2. un **gestionnaire d’erreurs centralisé**, pour que toutes les erreurs, prévues ou non,
   produisent une réponse cohérente, sans fuite d’information.

## Rappel : les familles de codes de statut

Tu as étudié les codes de statut dans le cours sur HTTP. Ceux que tu utiliseras le plus :

| Code | Signification              | Usage typique                                        |
| ---- | -------------------------- | ---------------------------------------------------- |
| 200  | OK                         | Lecture réussie, ou modification qui renvoie un corps |
| 201  | Created                    | Ressource créée (`POST`)                             |
| 204  | No Content                 | Succès sans corps (souvent `DELETE`)                 |
| 301  | Moved Permanently          | Adresse déplacée définitivement                      |
| 400  | Bad Request                | Requête mal formée ou invalide                       |
| 404  | Not Found                  | Ressource ou route inexistante                       |
| 415  | Unsupported Media Type     | Type de corps non accepté                            |
| 500  | Internal Server Error      | Erreur du serveur, imprévue                          |

La règle de lecture : **4xx = la faute du client** (il peut corriger sa requête),
**5xx = la faute du serveur** (le client n’y peut rien).

## Les méthodes de réponse

```js
// responses.js
import express from 'express';

const app = express();

app.get('/text', (req, res) => {
  res.send('Du texte');
});

app.get('/object', (req, res) => {
  res.send({ via: 'send' });
});

app.get('/json', (req, res) => {
  res.status(200).json({ via: 'json' });
});

app.get('/plain', (req, res) => {
  res.type('text/plain').send('Texte brut');
});

app.get('/created', (req, res) => {
  res.status(201).location('/notes/3').json({ id: 3 });
});

app.delete('/notes/:id', (req, res) => {
  res.sendStatus(204);
});

app.get('/old-page', (req, res) => {
  res.redirect(301, '/text');
});

app.get('/header', (req, res) => {
  res.set('Cache-Control', 'no-store').json({ ok: true });
});

app.listen(3000, () => console.log('Prêt'));
```

Interroge chaque route avec `curl -s -i`. Voici les lignes utiles des réponses :

```text
GET /text       200 OK            Content-Type: text/html; charset=utf-8
GET /object     200 OK            Content-Type: application/json; charset=utf-8
GET /json       200 OK            Content-Type: application/json; charset=utf-8
GET /plain      200 OK            Content-Type: text/plain; charset=utf-8
GET /created    201 Created       Location: /notes/3   corps {"id":3}
DELETE /notes/3 204 No Content    aucun corps
GET /old-page   301 Moved Permanently   Location: /text
GET /header     200 OK            Cache-Control: no-store
```

À retenir :

- `res.status(code)` fixe le code et **renvoie `res`**, ce qui permet de chaîner :
  `res.status(201).json(…)`. Il n’envoie rien tout seul.
- `res.json(value)` sérialise en JSON avec le bon `Content-Type`. `res.send(objet)` fait
  la même chose, mais `res.json` dit clairement ton intention : préfère-le pour une API.
- `res.send(chaîne)` répond en HTML par défaut ; `res.type('text/plain')` change le type.
- `res.sendStatus(204)` fixe le statut et termine la réponse. Pour 204, aucun corps
  n’est transmis, même si tu en fournis un : `res.status(204).json({ ignored: true })`
  arrive vide chez le client.
- `res.location(url)` ajoute l’en-tête `Location` ; `res.set(nom, valeur)` n’importe quel
  en-tête.
- `res.redirect(301, '/text')` : en Express 5, le statut se place **avant** l’URL.
  Sans statut, la redirection est temporaire (302). `curl -L` suit la redirection et
  affiche `Du texte`.

### Les signatures d’Express 4 qui trompent sans erreur

Express 5 a supprimé plusieurs signatures, encore très présentes dans les exemples en
ligne. Le piège : certaines **ne plantent pas**, elles se comportent mal en silence.

```js
// legacy.js
import express from 'express';

const app = express();

app.get('/legacy', (req, res) => {
  res.json({ ok: false }, 500);
});

app.get('/number', (req, res) => {
  res.send(404);
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s -i http://localhost:3000/legacy
curl -s -i http://localhost:3000/number
```

Les deux réponses ont le statut `200 OK` ! La première renvoie `{"ok":false}` (le `500`
est ignoré), la seconde renvoie le corps `404` en `application/json`. Les écritures
correctes sont `res.status(500).json({ ok: false })` et `res.sendStatus(404)`. Quand une
IA te propose `res.json(obj, status)` ou `res.send(status)`, corrige-les. Autre
changement : `res.status()` n’accepte que des entiers entre 100 et 999 et lève une
erreur sinon.

## Que se passe-t-il quand une erreur survient ?

### Les erreurs synchrones et asynchrones

Express 5 attrape les erreurs à plusieurs endroits et les transmet au **gestionnaire
d’erreurs**. Pour le voir, ajoutons le nôtre, très simple, en dernière position :

```js
// errors.js
import express from 'express';

const app = express();
app.use(express.json());

async function findNote(id) {
  // Simule une lecture asynchrone (fichier, base de données…)
  await new Promise((resolve) => setTimeout(resolve, 10));
  if (id === 13) {
    throw new Error('Stockage indisponible');
  }
  return { id, title: `Note ${id}` };
}

app.get('/sync-error', (req, res) => {
  throw new Error('Erreur synchrone');
});

app.get('/notes/:id', async (req, res) => {
  const note = await findNote(Number(req.params.id));
  res.json(note);
});

app.get('/promise', (req, res) => {
  return Promise.reject(new Error('Promesse rejetée'));
});

app.get('/next-error', (req, res, next) => {
  next(new Error('Erreur passée à next'));
});

// 404 : aucune route n'a répondu
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// Gestionnaire d'erreurs : 4 paramètres obligatoires
app.use((err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/sync-error
curl -s http://localhost:3000/notes/1
curl -s http://localhost:3000/notes/13
curl -s http://localhost:3000/promise
curl -s http://localhost:3000/next-error
curl -s http://localhost:3000/nope
```

```text
{"error":"Erreur interne du serveur"}
{"id":1,"title":"Note 1"}
{"error":"Erreur interne du serveur"}
{"error":"Erreur interne du serveur"}
{"error":"Erreur interne du serveur"}
{"error":"Route GET /nope introuvable"}
```

Et dans le terminal du serveur :

```text
Prêt
[GET /sync-error] Erreur synchrone
[GET /notes/13] Stockage indisponible
[GET /promise] Promesse rejetée
[GET /next-error] Erreur passée à next
```

Quatre façons de produire une erreur, toutes acheminées au même endroit :

1. **`throw` dans un gestionnaire synchrone** : Express l’attrape (il appelle ton
   gestionnaire dans un `try…catch`).
2. **Erreur dans une fonction `async`** (ici, `findNote` qui rejette, attendue avec
   `await`) : la fonction `async` renvoie une promesse rejetée ; **Express 5** la détecte
   et appelle `next(erreur)` pour toi. En Express 4, il fallait écrire
   `.catch(next)` ou un `try…catch` dans chaque route, sinon la requête restait bloquée.
3. **Promesse rejetée renvoyée** par un gestionnaire non `async` : même traitement.
4. **`next(erreur)`** : l’appel explicite, qui fonctionne partout.

### Ce qu’Express n’attrape pas

Une erreur levée dans un callback exécuté **plus tard**, hors de la promesse du
gestionnaire, échappe à Express :

```js
app.get('/timer', (req, res) => {
  setTimeout(() => {
    throw new Error('Erreur dans un setTimeout');
  }, 10);
});
```

Ici, `curl` reçoit une réponse vide (code de sortie 52) et **le processus Node.js
s’arrête** :

```text
file:///…/server.js:…
    throw new Error('Erreur dans un setTimeout');
    ^

Error: Erreur dans un setTimeout
    at Timeout._onTimeout (file:///…/server.js:…)
    …

Node.js v24.21.0
```

Tout le serveur tombe, pour tous les utilisateurs. La parade : utiliser des API à base de
promesses et `await` (comme `node:fs/promises` ou `setTimeout` de
`node:timers/promises`), pour que l’erreur reste dans la promesse du gestionnaire.

## Le gestionnaire d’erreurs centralisé

### Quatre paramètres, en dernier

Un gestionnaire d’erreurs est un middleware à **quatre** paramètres :
`(err, req, res, next)`. Express les reconnaît **uniquement à leur nombre de paramètres
déclarés**. Même si tu n’utilises pas `next`, tu dois l’écrire. Avec trois paramètres,
Express le prend pour un middleware ordinaire : il est sauté quand une erreur circule, et
c’est le gestionnaire par défaut d’Express qui répond, en HTML. Les outils de qualité de
code signalent parfois `next` comme « paramètre inutilisé » : ne l’enlève pas.

Il se place **après toutes les routes et après le middleware 404**. Quand une erreur est
signalée, Express saute tous les middlewares ordinaires restants et cherche le prochain
gestionnaire d’erreurs.

### Des erreurs qui portent leur statut

Toutes les erreurs ne sont pas des 500. « Note introuvable » est une 404, « titre
manquant » une 400. Une technique courante consiste à créer une classe d’erreur qui porte
un statut, et à la lever depuis les routes. Le gestionnaire centralisé décide ensuite de
la réponse. Voici la version complète que tu réutiliseras :

```js
// central.js
import express from 'express';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const notes = [{ id: 1, title: 'Courses' }];
let nextId = 2;

const app = express();
app.use(express.json());

app.get('/notes/:id', (req, res) => {
  const note = notes.find((item) => item.id === Number(req.params.id));
  if (!note) {
    throw new HttpError(404, `Note ${req.params.id} introuvable`);
  }
  res.json(note);
});

app.post('/notes', (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new HttpError(400, 'Le champ title est obligatoire');
  }
  const note = { id: nextId, title: title.trim() };
  nextId += 1;
  notes.push(note);
  res.status(201).json(note);
});

app.get('/crash', (req, res) => {
  const settings = undefined;
  res.json({ theme: settings.theme });
});

// 404 : placé après toutes les routes
app.use((req, res, next) => {
  next(new HttpError(404, `Route ${req.method} ${req.path} introuvable`));
});

function publicMessage(err, status) {
  if (status === 500) return 'Erreur interne du serveur';
  if (err instanceof HttpError) return err.message;
  if (err.type === 'entity.parse.failed') return 'Corps JSON mal formé';
  if (err.type === 'entity.too.large') return 'Corps de requête trop volumineux';
  return 'Requête invalide';
}

// Gestionnaire d'erreurs : 4 paramètres, déclaré en tout dernier
app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ error: publicMessage(err, status) });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/notes/1
curl -s http://localhost:3000/notes/9
curl -s --json '{"title":"  Lire  "}' http://localhost:3000/notes
curl -s --json '{"title":""}' http://localhost:3000/notes
curl -s --json '{oops' http://localhost:3000/notes
curl -s -i http://localhost:3000/crash
curl -s -X DELETE http://localhost:3000/notes/1
```

```text
{"id":1,"title":"Courses"}
{"error":"Note 9 introuvable"}
{"id":2,"title":"Lire"}
{"error":"Le champ title est obligatoire"}
{"error":"Corps JSON mal formé"}
HTTP/1.1 500 Internal Server Error
…
{"error":"Erreur interne du serveur"}
{"error":"Route DELETE /notes/1 introuvable"}
```

Un corps de plus de 100 Ko reçoit `{"error":"Corps de requête trop volumineux"}` avec le
statut 413. Le serveur, lui, n’affiche que l’erreur imprévue, avec sa pile complète :

```text
TypeError: Cannot read properties of undefined (reading 'theme')
    at file:///…/central.js:39:30
    …
```

Analysons les choix de ce gestionnaire :

- **Les routes restent simples** : elles lèvent une `HttpError` et ne s’occupent pas du
  format de la réponse d’erreur. Le format est décidé **une seule fois**.
- **Le 404 devient une erreur comme les autres** : le middleware final appelle
  `next(new HttpError(404, …))`, et toutes les erreurs ont le même format JSON.
- **Le statut vient de l’erreur quand il est fiable** : `HttpError` en porte un, et les
  erreurs de `express.json()` aussi (`status` 400 ou 413, avec un `type`). Tout le reste
  devient 500.
- **Pas de fuite d’information** : pour une 500, le client reçoit un message générique ;
  le détail (message, pile, chemins de fichiers) part dans le journal du serveur, où le
  développeur le lira. Un message d’erreur interne peut révéler une requête SQL, un nom
  d’utilisateur de base de données ou l’arborescence du serveur. Pour les erreurs de
  `express.json()`, on n’utilise pas `err.message` qui recopie le corps reçu.
- **`res.headersSent`** : si l’erreur survient alors que la réponse a déjà commencé à
  partir, on ne peut plus changer le statut. On délègue alors au gestionnaire par défaut
  d’Express avec `next(err)`, qui ferme la connexion.

## Pièges courants

- **Gestionnaire d’erreurs à trois paramètres** : jamais appelé pour une erreur. Quatre
  paramètres, toujours.
- **Gestionnaire 404 ou d’erreurs placé avant les routes** : le 404 répond à tout, les
  routes ne sont jamais atteintes.
- **Renvoyer `err.message` ou `err.stack` au client** : fuite d’informations internes.
- **`res.json(obj, status)` et `res.send(status)`** : syntaxes d’Express 4, statut 200 en
  silence.
- **Répondre 200 avec un corps d’erreur** : le client ne détecte pas l’échec.
- **`throw` dans un callback** (`setTimeout`, événement) : le processus s’arrête.

## Exercices

### Exercice 1 — Moderniser du code Express 4

Ce code a été écrit pour Express 4. Il tourne en Express 5 mais répond mal :
`GET /notes/7` (inexistante) renvoie `200` avec le corps `404`, `POST /notes` renvoie
`200` au lieu de `201`, et un `POST` sans corps renvoie une page HTML 500. Réécris-le
avec `async`/`await`, une `HttpError` et un gestionnaire d’erreurs.

```js
import express from 'express';

const notes = new Map([[1, { id: 1, title: 'Courses' }]]);
async function findNote(id) {
  return notes.get(id);
}

const app = express();
app.use(express.json());

app.get('/notes/:id', (req, res, next) => {
  findNote(Number(req.params.id))
    .then((note) => {
      if (!note) {
        return res.send(404);
      }
      res.json(note);
    })
    .catch(next);
});

app.post('/notes', (req, res) => {
  const note = { id: notes.size + 1, title: req.body.title };
  notes.set(note.id, note);
  res.json(note, 201);
});

app.listen(3000, () => console.log('Prêt'));
```

:::solution

```js
// modern.js
import express from 'express';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const notes = new Map([[1, { id: 1, title: 'Courses' }]]);
let nextId = 2;

async function findNote(id) {
  return notes.get(id);
}

const app = express();
app.use(express.json());

app.get('/notes/:id', async (req, res) => {
  const note = await findNote(Number(req.params.id));
  if (!note) {
    throw new HttpError(404, `Note ${req.params.id} introuvable`);
  }
  res.json(note);
});

app.post('/notes', (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new HttpError(400, 'Le champ title est obligatoire');
  }
  const note = { id: nextId, title: title.trim() };
  nextId += 1;
  notes.set(note.id, note);
  res.status(201).json(note);
});

app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s -i http://localhost:3000/notes/7
curl -s -i --json '{"title":"Lire"}' http://localhost:3000/notes
curl -s -i -X POST http://localhost:3000/notes
```

```text
HTTP/1.1 404 Not Found   {"error":"Note 7 introuvable"}
HTTP/1.1 201 Created     {"id":2,"title":"Lire"}
HTTP/1.1 400 Bad Request {"error":"Le champ title est obligatoire"}
```

- `async`/`await` remplace `.then().catch(next)` : Express 5 transmet seul les rejets.
- `throw new HttpError(404, …)` dans une fonction `async` devient une promesse rejetée,
  donc une erreur acheminée au gestionnaire.
- `req.body?.title` et le contrôle de type évitent la `TypeError` quand le corps manque.
- `nextId` remplace `notes.size + 1`, qui produirait des doublons d’identifiants après
  une suppression.
- Limite de ce gestionnaire simplifié : un JSON mal formé y devient une 500. La version
  complète de la leçon, avec `publicMessage`, le traite en 400.

:::

### Exercice 2 — Trouver les trois défauts

Ce serveur a trois défauts. `GET /notes` renvoie `{"error":"Introuvable"}` et
`GET /fail` aussi. Trouve-les, explique-les et corrige-les.

```js
import express from 'express';

const app = express();
app.use(express.json());

app.use((req, res) => {
  res.status(404).json({ error: 'Introuvable' });
});

app.get('/notes', (req, res) => {
  res.json([{ id: 1, title: 'Courses' }]);
});

app.get('/fail', async (req, res) => {
  throw new Error('Connexion à la base perdue (mot de passe refusé pour admin)');
});

app.use((err, req, res) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(3000, () => console.log('Prêt'));
```

:::solution

1. **Le middleware 404 est déclaré avant les routes** : il répond à toutes les requêtes
   sans appeler `next()`. Il doit être placé après la dernière route.
2. **Le gestionnaire d’erreurs n’a que trois paramètres** : Express le prend pour un
   middleware ordinaire et ne l’appelle jamais pour une erreur. Si tu corriges seulement
   l’ordre, `GET /fail` reçoit la page HTML par défaut d’Express (`Internal Server Error`
   en production, la pile complète en développement).
3. **Il renvoie `err.message` et `err.stack` au client** : ici, le message révèle un nom
   de compte de base de données. Le détail doit aller dans le journal du serveur.

```js
// fixed.js
import express from 'express';

const app = express();
app.use(express.json());

app.get('/notes', (req, res) => {
  res.json([{ id: 1, title: 'Courses' }]);
});

app.get('/fail', async (req, res) => {
  throw new Error('Connexion à la base perdue (mot de passe refusé pour admin)');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Introuvable' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(3000, () => console.log('Prêt'));
```

```bash
curl -s http://localhost:3000/notes
curl -s http://localhost:3000/fail
curl -s http://localhost:3000/x
```

```text
[{"id":1,"title":"Courses"}]
{"error":"Erreur interne du serveur"}
{"error":"Introuvable"}
```

Le serveur journalise `Error: Connexion à la base perdue (mot de passe refusé pour
admin)` suivi de la pile : le développeur garde l’information, le client ne la voit pas.

:::

### Exercice 3 — Supprimer une note

Ajoute au fichier `central.js` une route `DELETE /notes/:id` qui supprime la note et
répond `204`, ou lève une `HttpError` 404 si elle n’existe pas. Que renvoient deux
suppressions successives de la note 1 ?

:::solution

À placer avant la route `/crash` (en tout cas avant le middleware 404) :

```js
app.delete('/notes/:id', (req, res) => {
  const index = notes.findIndex((item) => item.id === Number(req.params.id));
  if (index === -1) {
    throw new HttpError(404, `Note ${req.params.id} introuvable`);
  }
  notes.splice(index, 1);
  res.sendStatus(204);
});
```

```bash
curl -s -i -X DELETE http://localhost:3000/notes/1
curl -s -i -X DELETE http://localhost:3000/notes/1
```

La première réponse est `HTTP/1.1 204 No Content`, sans corps. La seconde est
`HTTP/1.1 404 Not Found` avec `{"error":"Note 1 introuvable"}`.

- `findIndex` renvoie `-1` si rien ne correspond ; `splice(index, 1)` retire un élément
  du tableau.
- `sendStatus(204)` est le moyen le plus direct de répondre « succès, rien à renvoyer ».
- Le second appel n’est pas une erreur du serveur : la ressource n’existe plus, 404 est
  la réponse honnête. L’état du serveur est le même après un ou deux appels.

:::

## Récapitulatif

- Le statut est la première information lue par le client : 2xx succès, 4xx faute du
  client, 5xx faute du serveur. Ne réponds jamais 200 avec une erreur.
- `res.status(code).json(body)` pour une API ; `res.sendStatus(204)` sans corps ;
  `res.location()`, `res.set()`, `res.type()` pour les en-têtes ;
  `res.redirect(301, url)` avec le statut en premier.
- Express 5 ne connaît plus `res.json(obj, status)` ni `res.send(status)` : ils
  produisent un 200 silencieux.
- Les erreurs levées (`throw`), les promesses rejetées des gestionnaires `async` et
  `next(err)` arrivent au gestionnaire d’erreurs. Un `throw` dans un `setTimeout` fait
  tomber le processus.
- Le gestionnaire d’erreurs a **quatre** paramètres et se place en dernier, après le
  middleware 404.
- Une classe `HttpError` porte le statut ; le gestionnaire centralisé choisit le statut
  et le message public, journalise les 500 et ne renvoie jamais la pile au client.
