---
title: Appeler une API avec fetch
summary: Envoyer des requêtes HTTP avec fetch, lire le statut et le corps JSON, distinguer les erreurs HTTP des erreurs réseau, et annuler une requête.
durationMinutes: 70
sources:
  - title: MDN — Utiliser l’API Fetch
    url: https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch
  - title: MDN — Response
    url: https://developer.mozilla.org/fr/docs/Web/API/Response
  - title: MDN — AbortController
    url: https://developer.mozilla.org/fr/docs/Web/API/AbortController
  - title: WHATWG — Fetch Standard
    url: https://fetch.spec.whatwg.org/
---

## Parler à un serveur depuis le code

Tu sais qu’un navigateur échange avec un serveur par des requêtes et des réponses HTTP : une
méthode (`GET`, `POST`…), une adresse, des en-têtes, parfois un corps ; en retour, un **code de
statut** (200, 404, 500…), des en-têtes et un corps. Jusqu’ici, c’est le navigateur qui envoyait
ces requêtes, quand tu suivais un lien ou envoyais un formulaire.

`fetch` permet à **ton code** d’envoyer une requête HTTP et de lire la réponse, sans recharger la
page. C’est ainsi qu’une application récupère des données auprès d’une **API** (une interface
qu’un serveur expose pour être utilisée par des programmes) et les affiche. `fetch` existe dans
les navigateurs et, avec la même interface, dans Node.js 24. Il renvoie une promesse : tout ce que
tu as appris sur `async`/`await` s’applique.

## Un serveur d’entraînement

Pour s’exercer sans dépendre d’internet, voici une petite API de livres. Crée un dossier, place-y
ce fichier `server.js` et un sous-dossier vide `public` (il servira dans la leçon suivante). Comme
le `serve.js` de la compétence sur le DOM, tu n’as pas besoin d’en comprendre chaque ligne : la
compétence sur Express t’apprendra à écrire des serveurs.

```js
// server.js — petite API de démonstration et fichiers statiques du dossier public/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const port = Number(process.env.PORT ?? 3000);
const publicDir = join(process.cwd(), 'public');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const books = [
  { id: 1, title: 'Dune', author: 'Frank Herbert' },
  { id: 2, title: 'Fondation', author: 'Isaac Asimov' },
  { id: 3, title: 'Hypérion', author: 'Dan Simmons' },
  { id: 4, title: 'La Main gauche de la nuit', author: 'Ursula K. Le Guin' },
  { id: 5, title: 'Les Dépossédés', author: 'Ursula K. Le Guin' },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 10_000) throw new Error('Corps trop volumineux');
  }
  return JSON.parse(text);
}

async function handleApi(request, response, url) {
  const match = url.pathname.match(/^\/api\/books\/(\d+)$/);
  if (request.method === 'GET' && url.pathname === '/api/books') {
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    // Délai simulé : une recherche d’une seule lettre est lente, les autres rapides.
    await wait(query.length === 1 ? 1200 : 300);
    const found = books.filter((book) =>
      `${book.title} ${book.author}`.toLowerCase().includes(query),
    );
    return sendJson(response, 200, found);
  }
  if (request.method === 'GET' && match) {
    await wait(200);
    const book = books.find((item) => item.id === Number(match[1]));
    if (!book) return sendJson(response, 404, { error: 'Livre introuvable' });
    return sendJson(response, 200, book);
  }
  if (request.method === 'POST' && url.pathname === '/api/books') {
    let data;
    try {
      data = await readJsonBody(request);
    } catch {
      return sendJson(response, 400, { error: 'Corps JSON invalide' });
    }
    const title = typeof data?.title === 'string' ? data.title.trim() : '';
    const author = typeof data?.author === 'string' ? data.author.trim() : '';
    if (!title || !author) {
      return sendJson(response, 400, { error: 'Les champs title et author sont obligatoires' });
    }
    const book = { id: Math.max(0, ...books.map((item) => item.id)) + 1, title, author };
    books.push(book);
    response.setHeader('Location', `/api/books/${book.id}`);
    return sendJson(response, 201, book);
  }
  if (request.method === 'GET' && url.pathname === '/api/slow') {
    await wait(5000);
    return sendJson(response, 200, { message: 'Enfin !' });
  }
  if (request.method === 'GET' && url.pathname === '/api/broken') {
    await wait(200);
    return sendJson(response, 500, { error: 'Erreur interne simulée' });
  }
  return sendJson(response, 404, { error: 'Route inconnue' });
}

async function serveStatic(response, pathname) {
  const path = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = normalize(join(publicDir, decodeURIComponent(path)));
  if (!file.startsWith(publicDir + sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Fichier introuvable');
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    console.log(`${request.method} ${url.pathname}${url.search}`);
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
    } else {
      await serveStatic(response, url.pathname);
    }
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: 'Erreur interne' });
  }
});

server.listen(port, () => {
  console.log(`API prête : http://localhost:${port}/`);
});
```

Lance-le dans un premier terminal et laisse-le tourner :

```bash
node server.js
```

```text
API prête : http://localhost:3000/
```

| Requête                  | Réponse                                                    |
| ------------------------ | ---------------------------------------------------------- |
| `GET /api/books?q=texte` | 200, tableau des livres dont le titre ou l’auteur contient `texte` |
| `GET /api/books/2`       | 200, le livre 2 ; 404 `{ "error": … }` s’il n’existe pas   |
| `POST /api/books`        | 201, le livre créé ; 400 si `title` ou `author` manque     |
| `GET /api/slow`          | 200 après 5 secondes                                       |
| `GET /api/broken`        | 500 `{ "error": "Erreur interne simulée" }`                |

Les exemples suivants sont des scripts clients à lancer dans un **second** terminal avec
`node example.js`, dans le même dossier. Les livres ajoutés par `POST` restent en mémoire jusqu’à
l’arrêt du serveur : relance-le (`Ctrl+C` puis `node server.js`) pour retrouver les sorties
indiquées.

## Une première requête

```js
const response = await fetch('http://localhost:3000/api/books/2');

console.log(response.status, response.statusText, response.ok);
console.log(response.headers.get('content-type'));

const book = await response.json();
console.log(book);
console.log(book.title);
```

Sortie :

```text
200 OK true
application/json; charset=utf-8
{ id: 2, title: 'Fondation', author: 'Isaac Asimov' }
Fondation
```

L’échange se fait en **deux temps**, d’où les deux `await` :

1. `await fetch(url)` attend l’arrivée de la **réponse** : le statut et les en-têtes sont alors
   connus, mais le corps est peut-être encore en cours de réception. On obtient un objet
   `Response`.
2. `await response.json()` attend la fin du corps et le transforme avec `JSON.parse`. On obtient
   enfin les données.

L’objet `Response` fournit :

- `status` : le code de statut (200, 404…) ; `statusText` : son libellé ;
- `ok` : `true` si le statut est entre 200 et 299 inclus, `false` sinon ;
- `headers.get(nom)` : la valeur d’un en-tête (sans tenir compte des majuscules) ;
- pour lire le corps : `json()` (des données JSON), `text()` (du texte brut), et d’autres
  formats comme `blob()` pour un fichier.

## `fetch` ne rejette pas sur une erreur HTTP

```js
try {
  const response = await fetch('http://localhost:3000/api/books/42');
  console.log('pas d’exception :', response.ok, response.status);
  console.log(await response.json());
} catch (error) {
  console.log('exception :', error.message);
}
```

Sortie :

```text
pas d’exception : false 404
{ error: 'Livre introuvable' }
```

C’est **le** piège de `fetch` : un 404 ou un 500 **ne rompt pas** la promesse. Du point de vue de
`fetch`, l’échange HTTP a réussi : le serveur a bien répondu, même si c’est pour dire « introuvable »
ou « erreur ». Le `catch` n’est pas exécuté. **C’est à toi de tester `response.ok`** (ou
`response.status`) avant d’utiliser les données. Sans ce test, ton code afficherait
`undefined` comme titre de livre.

`fetch` rejette seulement quand **aucune réponse HTTP** n’a pu être obtenue :

```js
try {
  await fetch('http://localhost:3999/api/books'); // aucun serveur sur ce port
} catch (error) {
  console.log(error.name, ':', error.message);
  console.log('cause :', error.cause?.code);
}
```

Sortie avec Node.js 24 :

```text
TypeError : fetch failed
cause : ECONNREFUSED
```

Serveur injoignable, nom de domaine introuvable, connexion coupée, requête bloquée par le
navigateur (règles CORS) : c’est une `TypeError`. Son message dépend de l’environnement (Chrome
affiche « Failed to fetch ») ; dans Node.js, la cause précise est dans `error.cause`. La requête
annulée, vue plus bas, est l’autre cas de rejet.

| Situation                         | La promesse de `fetch`…  | À tester                         |
| --------------------------------- | ------------------------ | -------------------------------- |
| 200, 201, 204…                    | est tenue, `ok` vaut `true` | lire le corps                  |
| 400, 404, 500…                    | est tenue, `ok` vaut `false` | `response.ok`, puis le corps d’erreur |
| serveur injoignable, réseau coupé | est rompue (`TypeError`) | `try…catch`                      |
| requête annulée                   | est rompue (`AbortError`, `TimeoutError`) | `try…catch`, `error.name` |

## Une fonction utilitaire robuste

Plutôt que de répéter ces tests partout, on écrit une fonction qui **transforme une réponse non
`ok` en erreur** :

```js
async function getJson(url, options) {
  const response = await fetch(url, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message = isJson && body.error ? body.error : `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

for (const path of ['/api/books/1', '/api/books/42', '/api/broken', '/page-absente']) {
  try {
    const data = await getJson(`http://localhost:3000${path}`);
    console.log(`${path} → OK :`, data);
  } catch (error) {
    console.log(`${path} → erreur ${error.status ?? 'réseau'} : ${error.message}`);
  }
}
```

Sortie :

```text
/api/books/1 → OK : { id: 1, title: 'Dune', author: 'Frank Herbert' }
/api/books/42 → erreur 404 : Livre introuvable
/api/broken → erreur 500 : Erreur interne simulée
/page-absente → erreur 404 : HTTP 404
```

- Le type du corps est vérifié avec l’en-tête `Content-Type` : une page d’erreur en texte ou en
  HTML ferait échouer `json()` (voir les pièges).
- Une réponse non `ok` devient une `Error` qui porte le message du serveur et le statut. Le code
  appelant n’a plus qu’**un seul chemin d’erreur**, le `catch`, pour les erreurs HTTP comme pour
  les erreurs réseau (qui n’ont pas de `status`, d’où le `?? 'réseau'`).

## Envoyer des données : `POST` et JSON

```js
const response = await fetch('http://localhost:3000/api/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Ubik', author: 'Philip K. Dick' }),
});

console.log(response.status, response.headers.get('location'));
console.log(await response.json());

const invalid = await fetch('http://localhost:3000/api/books', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: '   ' }),
});
console.log(invalid.status, await invalid.json());
```

Sortie (serveur fraîchement démarré) :

```text
201 /api/books/6
{ id: 6, title: 'Ubik', author: 'Philip K. Dick' }
400 { error: 'Les champs title et author sont obligatoires' }
```

Le second argument de `fetch` est un objet d’options :

- `method` : la méthode HTTP (par défaut `GET`) ;
- `headers` : les en-têtes ; `Content-Type: application/json` indique au serveur comment lire le
  corps ;
- `body` : le corps, ici une **chaîne** produite par `JSON.stringify`. Passer l’objet directement
  ne fonctionne pas : il serait converti en texte `[object Object]`.

Le serveur répond `201 Created` avec un en-tête `Location` qui indique l’adresse de la nouvelle
ressource. La validation côté serveur refuse un titre composé d’espaces : comme pour les
formulaires, le serveur ne fait jamais confiance au client.

## Plusieurs requêtes en parallèle

```js
const ids = [1, 3, 5];
const books = await Promise.all(
  ids.map(async (id) => {
    const response = await fetch(`http://localhost:3000/api/books/${id}`);
    return response.json();
  }),
);
console.log(books.map((book) => book.title));
```

Sortie :

```text
[ 'Dune', 'Hypérion', 'Les Dépossédés' ]
```

Les trois requêtes partent en même temps : la durée totale est proche de celle d’une seule
requête (le serveur simule 200 ms par livre), pas du triple. Dans un vrai projet, on utiliserait
`getJson` pour que les erreurs HTTP soient détectées.

## Annuler une requête

Une requête peut devenir inutile : l’utilisateur a quitté la page, lancé une autre recherche, ou
le serveur met trop de temps. L’annuler libère des ressources et évite d’afficher une réponse
périmée.

```js
const controller = new AbortController();
setTimeout(() => controller.abort(), 500);

const start = Date.now();
try {
  await fetch('http://localhost:3000/api/slow', { signal: controller.signal });
} catch (error) {
  console.log(`${error.name} après ${Math.round((Date.now() - start) / 100) * 100} ms`);
}

const start2 = Date.now();
try {
  await fetch('http://localhost:3000/api/slow', { signal: AbortSignal.timeout(1000) });
} catch (error) {
  console.log(`${error.name} après ${Math.round((Date.now() - start2) / 100) * 100} ms`);
}

console.log(controller.signal.aborted);
```

Sortie :

```text
AbortError après 500 ms
TimeoutError après 1000 ms
true
```

- Un `AbortController` possède un **signal** (`controller.signal`) que l’on passe à `fetch`.
  Appeler `controller.abort()` annule la requête : la promesse est rompue avec une erreur de nom
  `AbortError`.
- `AbortSignal.timeout(ms)` crée directement un signal qui s’annule tout seul après ce délai ;
  l’erreur s’appelle alors `TimeoutError`. C’est la façon la plus simple de fixer un délai maximal.
- On distingue les cas avec `error.name`, pas avec le message.
- Un signal annulé le reste (`aborted` vaut `true`) : il faut un nouveau contrôleur pour chaque
  nouvelle requête.

Contrairement au `Promise.race` de la leçon 2, l’annulation **arrête réellement** la requête côté
client : la connexion est fermée et la réponse ne sera jamais lue.

## Pièges courants

```js
const response = await fetch('http://localhost:3000/api/books/1');
const first = await response.json();
console.log(first.title);
try {
  await response.json();
} catch (error) {
  console.log(`${error.name}: ${error.message}`);
}

const page = await fetch('http://localhost:3000/page-absente');
console.log(page.status, page.headers.get('content-type'));
try {
  await page.json();
} catch (error) {
  console.log(`${error.name}: ${error.message}`);
}
```

Sortie :

```text
Dune
TypeError: Body is unusable: Body has already been read
404 text/plain; charset=utf-8
SyntaxError: Unexpected token 'F', "Fichier introuvable" is not valid JSON
```

1. **Ne pas tester `response.ok`** : un 404 ou un 500 passe pour un succès.
2. **Lire le corps deux fois** : un corps ne se lit qu’une fois. Range le résultat dans une
   variable.
3. **Appeler `json()` sur une réponse qui n’est pas du JSON** (page d’erreur HTML, texte) :
   `SyntaxError`. Vérifie `Content-Type` ou le statut avant.
4. **Oublier un `await`** : `fetch(url).json()` échoue, car `fetch` renvoie une promesse, pas une
   réponse.
5. **Envoyer un objet au lieu d’une chaîne** dans `body`, ou oublier l’en-tête `Content-Type`.
6. **Construire une adresse par concaténation** avec une saisie utilisateur :
   `` `/api/books?q=${query}` `` casse avec `&`, `#` ou des espaces. Utilise `URL` et
   `searchParams` (exercice 1).
7. **Afficher le message d’erreur brut à l’utilisateur** (« fetch failed ») : traduis-le en un
   message compréhensible.

## Exercices

### Exercice 1 — Rechercher sans casser l’adresse

Écris `searchBooks(query)` qui appelle `GET /api/books?q=…` et renvoie le tableau de livres. Construis
l’adresse avec `new URL(…)` et `url.searchParams.set('q', query)`, affiche-la, et teste avec
`'le guin'` puis `'dépossédés & co'`. Pourquoi ne pas écrire simplement
`` `http://localhost:3000/api/books?q=${query}` `` ?

:::solution
```js
async function searchBooks(query) {
  const url = new URL('/api/books', 'http://localhost:3000');
  url.searchParams.set('q', query);
  console.log(url.href);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

const results = await searchBooks('le guin');
console.log(results.map((book) => book.title));
console.log(await searchBooks('dépossédés & co'));
```

Sortie :

```text
http://localhost:3000/api/books?q=le+guin
[ 'La Main gauche de la nuit', 'Les Dépossédés' ]
http://localhost:3000/api/books?q=d%C3%A9poss%C3%A9d%C3%A9s+%26+co
[]
```

`searchParams.set` **encode** la valeur : l’espace devient `+`, les lettres accentuées sont
encodées en UTF-8, et surtout `&` devient `%26`. Avec une simple concaténation,
`?q=dépossédés & co` serait coupé au `&` : le serveur recevrait `q=dépossédés ` et un paramètre
parasite ` co`. Un utilisateur pourrait même ajouter ses propres paramètres à la requête.
`fetch` accepte directement un objet `URL`.
:::

### Exercice 2 — Créer un livre

En réutilisant `getJson` (section « Une fonction utilitaire robuste »), écris
`createBook(book)` qui envoie le livre en `POST` et renvoie le livre créé. Teste avec un livre
complet puis avec un livre sans auteur, et affiche un message adapté dans chaque cas.

:::solution
```js
async function createBook(book) {
  return getJson('http://localhost:3000/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book),
  });
}

for (const book of [{ title: 'Kindred', author: 'Octavia E. Butler' }, { title: 'Sans auteur' }]) {
  try {
    const created = await createBook(book);
    console.log(`créé avec l’id ${created.id} : ${created.title}`);
  } catch (error) {
    console.log(`refusé (${error.status}) : ${error.message}`);
  }
}
```

Sortie (serveur fraîchement démarré) :

```text
créé avec l’id 6 : Kindred
refusé (400) : Les champs title et author sont obligatoires
```

`getJson` fait le travail difficile : elle lit le corps JSON d’erreur du serveur et transforme le
400 en exception. `createBook` n’a qu’à préparer la requête. Le message d’erreur vient du
serveur : il est compréhensible ici, mais dans une interface, on vérifiera qu’il est adapté à
l’utilisateur avant de l’afficher.
:::

### Exercice 3 — Des messages d’erreur compréhensibles

Écris `fetchJson(url, timeoutMs)` qui renvoie les données JSON, ou lève une erreur dont le message
est destiné à un utilisateur : `Le serveur n’a pas répondu en N s.` en cas de dépassement du
délai, `Serveur injoignable. Vérifie ta connexion.` pour une erreur réseau, et
`Le serveur a répondu NNN.` pour une erreur HTTP. Teste les quatre adresses suivantes avec un
délai de 1000 ms : `/api/books/3`, `/api/books/42`, `/api/slow`, et le port 3999.

:::solution
```js
async function fetchJson(url, timeoutMs) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error(`Le serveur n’a pas répondu en ${timeoutMs / 1000} s.`);
    }
    throw new Error('Serveur injoignable. Vérifie ta connexion.');
  }
  if (!response.ok) {
    throw new Error(`Le serveur a répondu ${response.status}.`);
  }
  return response.json();
}

const urls = [
  'http://localhost:3000/api/books/3',
  'http://localhost:3000/api/books/42',
  'http://localhost:3000/api/slow',
  'http://localhost:3999/api/books',
];

for (const url of urls) {
  try {
    const data = await fetchJson(url, 1000);
    console.log(`OK : ${data.title}`);
  } catch (error) {
    console.log(`Échec : ${error.message}`);
  }
}
```

Sortie :

```text
OK : Hypérion
Échec : Le serveur a répondu 404.
Échec : Le serveur n’a pas répondu en 1 s.
Échec : Serveur injoignable. Vérifie ta connexion.
```

Le `try…catch` n’entoure que l’appel à `fetch` : c’est là que surviennent les erreurs réseau et
d’annulation, distinguées par `error.name`. Le statut HTTP est testé ensuite, en dehors du `try`,
pour que cette erreur-là ne soit pas reformulée en « serveur injoignable ». Le délai est respecté
même si `/api/slow` répond en 5 secondes : la requête est réellement annulée au bout d’une
seconde.
:::

## Récapitulatif

- `await fetch(url, options)` renvoie une `Response` dès l’arrivée des en-têtes ;
  `await response.json()` lit et analyse le corps.
- `response.status`, `response.ok` (200 à 299), `response.headers.get(…)` décrivent la réponse.
- **`fetch` ne rejette pas sur un 404 ou un 500** : teste `response.ok`. Il rejette seulement sans
  réponse HTTP (`TypeError`) ou en cas d’annulation (`AbortError`, `TimeoutError`).
- Une fonction comme `getJson` convertit les réponses non `ok` en erreurs : un seul `catch` pour
  tout.
- Pour envoyer du JSON : `method: 'POST'`, en-tête `Content-Type: application/json`,
  `body: JSON.stringify(données)`.
- Construis les adresses avec `URL` et `searchParams`.
- `AbortController` annule à la demande, `AbortSignal.timeout(ms)` fixe un délai maximal ;
  distingue les erreurs avec `error.name`.
