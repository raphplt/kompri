---
title: Fichiers statiques et structure d’un petit projet
summary: Servir des fichiers avec express.static et organiser un projet Express en routes, middlewares et configuration.
durationMinutes: 60
sources:
  - title: Express — Servir des fichiers statiques
    url: https://expressjs.com/en/starter/static-files.html
  - title: Express 5 — Référence de l’API (express.static, Router)
    url: https://expressjs.com/en/5x/api.html
  - title: Node.js — Options de la ligne de commande
    url: https://nodejs.org/api/cli.html
---

## Deux besoins de tout projet réel

Ton serveur sait maintenant recevoir des requêtes, les traiter et répondre proprement.
Deux besoins apparaissent vite :

1. **Servir des fichiers** tels quels : une page d’accueil HTML, une feuille de style, des
   images. Écrire une route par fichier serait absurde.
2. **Organiser le code** : un fichier `server.js` de 400 lignes qui mélange routes,
   middlewares et configuration devient illisible et impossible à tester.

Express répond au premier avec le middleware `express.static`, et au second avec
`Router` et quelques conventions d’organisation.

## Servir des fichiers statiques

Un fichier **statique** est envoyé tel qu’il est sur le disque, sans traitement : HTML,
CSS, JavaScript exécuté par le navigateur, images, polices. Crée cette arborescence :

```text
static-demo/
  package.json
  server.js
  public/
    index.html
    css/
      style.css
```

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>Notes</title>
    <link rel="stylesheet" href="/css/style.css">
  </head>
  <body>
    <h1>Mes notes</h1>
  </body>
</html>
```

```css
body { font-family: system-ui, sans-serif; }
```

```js
// server.js
import path from 'node:path';
import express from 'express';

const app = express();
const publicDir = path.join(import.meta.dirname, 'public');

app.use(express.static(publicDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => console.log(`Fichiers servis depuis ${publicDir}`));
```

Le serveur affiche le chemin absolu du dossier, propre à ta machine, par exemple
`Fichiers servis depuis /home/ada/static-demo/public`. Teste :

```bash
curl -s -i http://localhost:3000/
curl -s -i http://localhost:3000/css/style.css
curl -s http://localhost:3000/api/health
```

Lignes utiles des réponses :

```text
GET /               200 OK   Content-Type: text/html; charset=utf-8   (contenu de index.html)
                             Cache-Control: public, max-age=0
                             Last-Modified: …   ETag: …
GET /css/style.css  200 OK   Content-Type: text/css; charset=utf-8
GET /api/health     {"status":"ok"}
```

Ce que fait `express.static(dossier)` :

- l’URL est traduite en chemin dans le dossier : `/css/style.css` devient
  `public/css/style.css` ;
- pour `/`, il cherche `index.html` dans le dossier ;
- le `Content-Type` est déduit de l’**extension** du fichier ;
- il ajoute des en-têtes de cache (`Cache-Control`, `ETag`, `Last-Modified`) qui
  permettent au navigateur de ne pas retélécharger un fichier inchangé ;
- si le fichier n’existe pas, il appelle `next()` : la requête continue vers tes routes.
  C’est pour cela que `/api/health` fonctionne alors que le middleware est déclaré avant.
- Pour `/css` (un dossier sans barre finale), il redirige (301) vers `/css/`.

### Un chemin absolu, pas relatif

`import.meta.dirname` contient le **dossier du fichier en cours** (ici, celui de
`server.js`). `path.join` assemble les morceaux de chemin avec le bon séparateur pour le
système. Pourquoi ne pas écrire simplement `express.static('public')` ? Parce qu’un chemin
relatif est résolu par rapport au **dossier courant du processus** (`process.cwd()`), pas
par rapport au fichier. Démonstration avec `express.static('public')` :

```bash
cd static-demo
node server.js        # GET / → 200
cd ..
node static-demo/server.js   # GET / → 404 : il cherche ./public depuis le dossier parent
```

Selon la manière dont tu lances le serveur (script npm, outil de supervision, autre
dossier), le site disparaît. Avec `path.join(import.meta.dirname, 'public')`, le chemin ne
dépend plus du dossier courant.

### Ce qui n’est pas servi

`express.static` est prudent par défaut :

- **Fichiers cachés** : avec Express 5, l’option `dotfiles` vaut `'ignore'` par défaut.
  Une requête vers `/.env` reçoit 404, même si le fichier existe dans `public/`. Les
  dossiers cachés (comme `.well-known`) sont aussi ignorés ; pour en servir un
  volontairement, il faut l’option `dotfiles: 'allow'`.
- **Sortie du dossier** : une requête comme `/../server.js` (envoyée avec
  `curl --path-as-is` pour que curl ne la normalise pas) ne sort pas de `public/` : la
  réponse est 404.

Ces protections ne remplacent pas le bon sens : **ne mets dans `public/` que ce que tu
acceptes de publier**. Jamais de code serveur, de fichier de configuration ni de secret.

### Préfixe et durée de cache

Tu peux monter les fichiers statiques sous un préfixe et allonger la durée de cache :

```js
app.use('/assets', express.static(publicDir, { maxAge: '1d' }));
```

`/assets/css/style.css` sert alors `public/css/style.css` avec l’en-tête
`Cache-Control: public, max-age=86400` (86 400 secondes = un jour). Un cache long
améliore les performances, mais le navigateur peut garder une ancienne version après une
mise à jour : on réserve en général les longues durées aux fichiers dont le nom change à
chaque version.

## Structurer un petit projet

### L’arborescence cible

Voici une organisation simple et répandue pour une petite API avec une page d’accueil.
Ce n’est pas une norme, mais elle sépare clairement les responsabilités :

```text
notes-app/
  package.json
  .gitignore
  public/
    index.html
    style.css
  src/
    server.js              démarre le serveur (seul fichier qui appelle listen)
    app.js                 construit l'application : middlewares, routes, erreurs
    config.js              lit la configuration dans l'environnement
    errors.js              classe HttpError
    routes/
      notes.js             routes de /api/notes
    middlewares/
      request-logger.js
      not-found.js
      error-handler.js
```

### `package.json` et `.gitignore`

```json
{
  "name": "notes-app",
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

```text
node_modules/
.env
```

`npm start` lance le serveur, `npm run dev` le relance à chaque modification. Le
`.gitignore` exclut les dépendances (réinstallables avec `npm install`) et le fichier
`.env`, qui peut contenir des secrets.

### La configuration : `src/config.js`

```js
// src/config.js
// Toute la configuration vient de l'environnement, avec des valeurs par défaut sûres.
export const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV ?? 'development',
};
```

Un seul fichier lit `process.env` : le reste du code importe `config`. Tu vois d’un coup
d’œil tous les réglages de l’application. Pour charger un fichier `.env` en
développement, Node.js propose l’option `--env-file` :
`node --env-file=.env src/server.js`.

### Les erreurs et les middlewares

Tu reconnais le code de la leçon précédente, découpé en modules :

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
// src/middlewares/request-logger.js
export function requestLogger(req, res, next) {
  const start = performance.now();
  res.on('finish', () => {
    const duration = (performance.now() - start).toFixed(1);
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration} ms)`);
  });
  next();
}
```

```js
// src/middlewares/not-found.js
import { HttpError } from '../errors.js';

export function notFound(req, res, next) {
  next(new HttpError(404, `Route ${req.method} ${req.path} introuvable`));
}
```

```js
// src/middlewares/error-handler.js
import { HttpError } from '../errors.js';

function publicMessage(err, status) {
  if (status === 500) return 'Erreur interne du serveur';
  if (err instanceof HttpError) return err.message;
  if (err.type === 'entity.parse.failed') return 'Corps JSON mal formé';
  if (err.type === 'entity.too.large') return 'Corps de requête trop volumineux';
  return 'Requête invalide';
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({ error: publicMessage(err, status) });
}
```

Dans un module ES, les imports relatifs **doivent** préciser l’extension : `'../errors.js'`,
pas `'../errors'`.

### Les routes : `express.Router`

Un `Router` est une mini-application qui ne contient que des routes et des middlewares.
Tu la montes ensuite sur un préfixe.

```js
// src/routes/notes.js
import { Router } from 'express';
import { HttpError } from '../errors.js';

const notes = [{ id: 1, title: 'Acheter du pain' }];
let nextId = 2;

export const notesRouter = Router();

notesRouter.get('/', (req, res) => {
  res.json(notes);
});

notesRouter.get('/:id', (req, res) => {
  const note = notes.find((item) => item.id === Number(req.params.id));
  if (!note) {
    throw new HttpError(404, `Note ${req.params.id} introuvable`);
  }
  res.json(note);
});

notesRouter.post('/', (req, res) => {
  const title = req.body?.title;
  if (typeof title !== 'string' || title.trim() === '') {
    throw new HttpError(400, 'Le champ title est obligatoire');
  }
  const note = { id: nextId, title: title.trim() };
  nextId += 1;
  notes.push(note);
  res.status(201).json(note);
});
```

Les chemins du routeur sont **relatifs** à son point de montage : `'/'` et `'/:id'`
deviendront `/api/notes` et `/api/notes/:id`. Le routeur ne sait pas où il sera monté :
tu pourrais le déplacer sous `/api/v2/notes` sans toucher à ce fichier. Les notes sont
gardées en mémoire, dans une variable du module : elles disparaissent à chaque
redémarrage. La persistance viendra avec la base de données.

### L’assemblage : `src/app.js`

```js
// src/app.js
import path from 'node:path';
import express from 'express';
import { requestLogger } from './middlewares/request-logger.js';
import { notFound } from './middlewares/not-found.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notesRouter } from './routes/notes.js';

const publicDir = path.join(import.meta.dirname, '..', 'public');

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.static(publicDir));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/notes', notesRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

L’ordre se lit de haut en bas, comme le trajet d’une requête : journal, fichiers
statiques, analyse du JSON, routes, 404, erreurs. Le dossier `public` est un niveau
au-dessus de `src`, d’où le `'..'`.

### Le démarrage : `src/server.js`

```js
// src/server.js
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, (error) => {
  if (error) {
    console.error(`Impossible d’écouter sur le port ${config.port} :`, error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Serveur (${config.env}) prêt sur http://localhost:${config.port}`);
});
```

**Pourquoi séparer `app.js` et `server.js` ?** `createApp()` construit une application
sans la démarrer. Un script de test peut donc créer l’application, la lancer sur un port
libre choisi par le système, l’interroger puis l’arrêter, sans dépendre d’un serveur déjà
lancé. Tu le feras dans l’exercice 3.

### Lancer et vérifier

Ajoute `public/index.html` (une page simple avec un titre `Mes notes`) et
`public/style.css`, puis :

```bash
npm install
npm start
```

Dans un autre terminal :

```bash
curl -s http://localhost:3000/ | grep h1
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/notes
curl -s --json '{"title":"Réviser Express"}' http://localhost:3000/api/notes
curl -s http://localhost:3000/api/notes/2
curl -s http://localhost:3000/api/notes/99
curl -s --json '{"title":' http://localhost:3000/api/notes
curl -s http://localhost:3000/api/inconnu
```

```text
    <h1>Mes notes</h1>
{"status":"ok"}
[{"id":1,"title":"Acheter du pain"}]
{"id":2,"title":"Réviser Express"}
{"id":2,"title":"Réviser Express"}
{"error":"Note 99 introuvable"}
{"error":"Corps JSON mal formé"}
{"error":"Route GET /api/inconnu introuvable"}
```

Le terminal du serveur (durées variables) :

```text
> notes-app@1.0.0 start
> node src/server.js

Serveur (development) prêt sur http://localhost:3000
GET / -> 200 (5.9 ms)
GET /api/health -> 200 (2.2 ms)
GET /api/notes -> 200 (1.1 ms)
POST /api/notes -> 201 (7.2 ms)
GET /api/notes/2 -> 200 (0.7 ms)
GET /api/notes/99 -> 404 (0.7 ms)
POST /api/notes -> 400 (1.2 ms)
GET /api/inconnu -> 404 (0.5 ms)
```

Et en changeant l’environnement : `PORT=8080 NODE_ENV=production npm start` affiche
`Serveur (production) prêt sur http://localhost:8080`.

## Pièges courants

- **`express.static('public')` avec un chemin relatif** : fonctionne ou non selon le
  dossier d’où tu lances Node. Utilise `path.join(import.meta.dirname, …)`.
- **Un fichier statique masque une route** : `express.static` est consulté avant tes
  routes. Si `public/api/health` existait, il serait servi à la place de la route
  `/api/health`.
- **Des secrets dans `public/`** : tout ce qui s’y trouve est potentiellement
  téléchargeable.
- **Oublier l’extension `.js`** dans un import relatif : `ERR_MODULE_NOT_FOUND`.
- **Monter le routeur sans préfixe cohérent** : `app.use('/api/notes', notesRouter)` avec
  des chemins `'/api/notes/:id'` dans le routeur donnerait `/api/notes/api/notes/:id`.
- **Appeler `listen` dans `app.js`** : impossible de créer l’application sans la démarrer,
  donc difficile à tester.

## Exercices

### Exercice 1 — Statique contre route

Dans l’exemple `static-demo`, crée le fichier `public/api/health` contenant
`{"status":"fichier statique"}`, puis ajoute `/assets` avec un cache d’un jour. Prédis
ce que renvoient `GET /api/health`, `GET /assets/css/style.css` et `GET /css/style.css`
(corps ou en-tête `Cache-Control`), puis vérifie.

```js
app.use('/assets', express.static(publicDir, { maxAge: '1d' }));
app.use(express.static(publicDir));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

:::solution

```text
GET /api/health           200  Content-Type: application/octet-stream
                               {"status":"fichier statique"}
GET /assets/css/style.css 200  Cache-Control: public, max-age=86400
GET /css/style.css        200  Cache-Control: public, max-age=0
```

- Le fichier `public/api/health` existe : `express.static`, déclaré avant la route, le
  sert et la route n’est jamais atteinte.
- Le fichier n’a pas d’extension : le type ne peut pas être déduit, il est servi comme
  `application/octet-stream` (données binaires génériques).
- Le même fichier `style.css` est accessible par deux URL, avec deux politiques de cache.
- Conclusion pratique : garde des préfixes distincts (`/api` pour les routes, rien de
  tel dans `public/`) ou déclare les fichiers statiques après les routes de l’API.

:::

### Exercice 2 — Un nouveau routeur

Ajoute au projet `notes-app` un routeur `src/routes/quotes.js` monté sur `/api/quotes`,
avec `GET /api/quotes` (toute la liste) et `GET /api/quotes/random` (un élément au
hasard). Les données sont deux proverbes en mémoire. Quelles lignes modifies-tu dans
`app.js` ?

:::solution

```js
// src/routes/quotes.js
import { Router } from 'express';

const quotes = [
  { id: 1, text: 'Petit à petit, l’oiseau fait son nid.', source: 'proverbe' },
  { id: 2, text: 'Il faut battre le fer pendant qu’il est chaud.', source: 'proverbe' },
];

export const quotesRouter = Router();

quotesRouter.get('/', (req, res) => {
  res.json(quotes);
});

quotesRouter.get('/random', (req, res) => {
  const index = Math.floor(Math.random() * quotes.length);
  res.json(quotes[index]);
});
```

Dans `src/app.js`, deux lignes seulement : l’import, et le montage **avant** `notFound`.

```js
import { quotesRouter } from './routes/quotes.js';
```

```js
app.use('/api/notes', notesRouter);
app.use('/api/quotes', quotesRouter);
```

```bash
curl -s http://localhost:3000/api/quotes
```

```text
[{"id":1,"text":"Petit à petit, l’oiseau fait son nid.","source":"proverbe"},{"id":2,"text":"Il faut battre le fer pendant qu’il est chaud.","source":"proverbe"}]
```

- `Math.random()` renvoie un nombre dans [0, 1[ ; multiplié par la longueur et arrondi
  par défaut, il donne un indice valide.
- La route `/random` est fixe et il n’y a pas de route `/:id` dans ce routeur : pas de
  conflit d’ordre. Si tu en ajoutes une, déclare `/random` avant.
- Le reste de l’application (journal, 404, erreurs) s’applique sans rien changer.

:::

### Exercice 3 — Vérifier l’application sans la lancer à la main

Écris `smoke.js` à la racine du projet. Il crée l’application avec `createApp()`, la
démarre sur le port `0` (le système choisit un port libre), vérifie trois réponses avec
`fetch`, puis arrête le serveur. Utilise le module intégré `node:assert/strict`, dont la
fonction `assert.equal(réel, attendu)` lève une erreur si les valeurs diffèrent
(`assert.deepEqual` compare le contenu de deux objets).

:::solution

```js
// smoke.js
import assert from 'node:assert/strict';
import { createApp } from './src/app.js';

const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://localhost:${server.address().port}`;

try {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const quote = await fetch(`${baseUrl}/api/quotes/random`);
  assert.equal(quote.status, 200);
  assert.equal(typeof (await quote.json()).text, 'string');

  const missing = await fetch(`${baseUrl}/api/nope`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Route GET /api/nope introuvable' });

  console.log('Tous les contrôles sont passés');
} finally {
  server.close();
}
```

```bash
node smoke.js
```

```text
GET /api/health -> 200 (4.1 ms)
GET /api/quotes/random -> 200 (1.3 ms)
GET /api/nope -> 404 (1.4 ms)
Tous les contrôles sont passés
```

- `listen(0)` demande un port libre ; `server.address().port` indique lequel.
- `await` au niveau supérieur du module est permis dans un module ES.
- `try…finally` garantit l’arrêt du serveur même si une assertion échoue ; sinon le
  processus resterait ouvert.
- Si une vérification échoue (par exemple en attendant 200 au lieu de 404), le script
  s’arrête sur `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:` suivi
  de `404 !== 200`, et le code de sortie n’est pas 0.
- Ce script n’est possible que parce que `app.js` construit l’application sans appeler
  `listen`. Les tests automatisés avec `node:test` reprennent cette idée.

:::

## Récapitulatif

- `express.static(dossier)` sert les fichiers tels quels, déduit le `Content-Type` de
  l’extension, gère le cache, sert `index.html` pour `/` et passe la main si le fichier
  n’existe pas.
- Construis le chemin avec `path.join(import.meta.dirname, 'public')` : un chemin relatif
  dépend du dossier courant.
- Express 5 ignore les fichiers et dossiers cachés par défaut, et une requête ne sort pas
  du dossier. Ne mets rien de secret dans `public/`.
- `express.static` déclaré avant les routes est prioritaire sur elles.
- Une structure simple : `config.js` (environnement), `errors.js`, `middlewares/`,
  `routes/` avec `express.Router`, `app.js` qui assemble (`createApp`) et `server.js` qui
  démarre.
- Séparer la construction de l’application de son démarrage permet de la tester sur un
  port libre.
