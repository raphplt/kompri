---
title: Tester du code asynchrone et une route HTTP
summary: Écrire des tests async fiables, remplacer le réseau et le temps par des doublures, et tester une vraie route HTTP.
durationMinutes: 70
sources:
  - title: Documentation Node.js — Test runner (mocking et minuteurs simulés)
    url: https://nodejs.org/api/test.html
  - title: Documentation Node.js — assert.rejects
    url: https://nodejs.org/api/assert.html#assertrejectsasyncfn-error-message
  - title: Documentation Node.js — HTTP
    url: https://nodejs.org/api/http.html
  - title: MDN — Codes de réponse HTTP
    url: https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Status
---

## Le résultat arrive plus tard

Lire un fichier, interroger une API, attendre un délai : ces opérations renvoient des
**promesses**. Un test doit attendre leur résultat avant de vérifier quoi que ce soit, sinon
il vérifie… une promesse en attente. Ce type de code pose aussi d’autres questions : comment
tester un appel réseau sans dépendre d’Internet ? Comment tester un délai de cinq secondes
sans attendre cinq secondes ? Comment tester un serveur HTTP ? Cette leçon répond à chacune.

Rappel : une fonction déclarée `async` renvoie toujours une promesse ; `await` attend sa
résolution et lève une exception si elle est **rejetée** (en cas d’erreur).

## Un test asynchrone

Il suffit que la fonction du test soit `async` : l’exécuteur attend la promesse qu’elle
renvoie, et le test échoue si elle est rejetée.

Module testé, qui lit et écrit un catalogue JSON :

```js
// src/catalog-store.js — lit et écrit un catalogue JSON dans le fichier indiqué
import { readFile, writeFile } from 'node:fs/promises';

export async function loadCatalog(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function saveCatalog(file, items) {
  await writeFile(file, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}
```

Comme ce module touche le disque, ses tests sont des **tests d’intégration**. Pour qu’ils
restent isolés et ne salissent rien, ils travaillent dans un **dossier temporaire** créé
avant les tests et supprimé après :

```js
// test/catalog-store.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadCatalog, saveCatalog } from '../src/catalog-store.js';

describe('catalog-store', () => {
  let dir;

  before(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'catalogue-'));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('relit ce qui a été enregistré', async () => {
    const file = path.join(dir, 'aller-retour.json');
    await saveCatalog(file, [{ title: 'La Peste' }]);
    assert.deepEqual(await loadCatalog(file), [{ title: 'La Peste' }]);
  });

  it('renvoie une liste vide si le fichier n’existe pas', async () => {
    assert.deepEqual(await loadCatalog(path.join(dir, 'absent.json')), []);
  });

  it('rejette un fichier JSON corrompu au lieu de renvoyer une liste vide', async () => {
    const file = path.join(dir, 'corrompu.json');
    await writeFile(file, '{ pas du JSON', 'utf8');
    await assert.rejects(loadCatalog(file), SyntaxError);
  });
});
```

```text
▶ catalog-store
  ✔ relit ce qui a été enregistré (4.430954ms)
  ✔ renvoie une liste vide si le fichier n’existe pas (1.108292ms)
  ✔ rejette un fichier JSON corrompu au lieu de renvoyer une liste vide (4.277767ms)
✔ catalog-store (17.341959ms)
```

- `os.tmpdir()` donne le dossier temporaire du système ; `mkdtemp` y crée un dossier au nom
  unique (`catalogue-` suivi de caractères aléatoires) : deux exécutions simultanées ne se
  gênent pas.
- `after` supprime le dossier même si un test a échoué.
- `assert.rejects(promesse, attendu)` est l’équivalent asynchrone de `assert.throws` : il
  vérifie que la promesse est **rejetée** avec l’erreur attendue. Lui-même renvoie une
  promesse : il faut l’attendre avec `await`.

## Le piège de l’await oublié

Sans `await`, le test se termine avant que la vérification ait lieu. Exemple volontairement
faux (le message attendu ne correspond pas) :

```js
it('rejette si le service répond 503 (await oublié)', (t) => {
  const fakeFetch = t.mock.fn(async () => ({ ok: false, status: 503 }));
  assert.rejects(getWeatherSummary('Lyon', fakeFetch), { message: 'mauvais message' });
});
```

```text
✔ rejette si le service répond 503 (await oublié) (3.113338ms)
ℹ Error: Test "rejette si le service répond 503 (await oublié)" at test/forgot.test.js:5:1 generated asynchronous activity after the test ended. …
✖ test/forgot.test.js (68.033808ms)
```

Le test s’affiche d’abord comme **réussi** (`✔`). Node.js remarque ensuite qu’une erreur est
survenue après la fin du test et fait échouer le fichier, mais le rapport devient confus.
Selon le code, l’erreur peut même passer inaperçue. La règle est simple : **un test qui
manipule des promesses est `async` et attend chaque promesse avec `await`**, y compris
`assert.rejects`.

## Remplacer le réseau : les doublures

Une fonction qui appelle une API externe est difficile à tester tel quel : le réseau peut
être absent, l’API lente, payante ou changeante. On veut tester **notre** code (construction
de l’adresse, traitement de la réponse, gestion des erreurs), pas le service distant.

La technique : permettre de **fournir** la fonction d’accès au réseau en paramètre
(on parle d’**injection de dépendance**), avec la vraie fonction par défaut :

```js
// src/weather.js — résume la météo d'une ville à partir d'une API HTTP
const API_URL = 'https://api.example.com/weather';

export async function getWeatherSummary(city, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_URL}?city=${encodeURIComponent(city)}`);
  if (!response.ok) {
    throw new Error(`Service météo indisponible (statut ${response.status})`);
  }
  const data = await response.json();
  return `${city} : ${data.temperature} °C, ${data.description}`;
}
```

En production, on appelle `getWeatherSummary('Lyon')` et le vrai `fetch` est utilisé. Dans
les tests, on passe une **doublure** (_mock_) : une fausse fonction qui renvoie une réponse
préparée, et qui **enregistre** ses appels. `node:test` en crée avec `t.mock.fn` :

```js
// test/weather.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getWeatherSummary } from '../src/weather.js';

describe('getWeatherSummary', () => {
  it('résume la réponse du service', async (t) => {
    const fakeFetch = t.mock.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ temperature: 18, description: 'ensoleillé' }),
    }));

    const summary = await getWeatherSummary('Saint-Étienne', fakeFetch);

    assert.equal(summary, 'Saint-Étienne : 18 °C, ensoleillé');
    assert.equal(fakeFetch.mock.callCount(), 1);
    assert.equal(
      fakeFetch.mock.calls[0].arguments[0],
      'https://api.example.com/weather?city=Saint-%C3%89tienne',
    );
  });

  it('rejette avec un message clair si le service répond 503', async (t) => {
    const fakeFetch = t.mock.fn(async () => ({ ok: false, status: 503 }));

    await assert.rejects(getWeatherSummary('Lyon', fakeFetch), {
      message: 'Service météo indisponible (statut 503)',
    });
  });
});
```

- La fonction du test reçoit un **contexte** `t` ; `t.mock.fn(implémentation)` crée une
  doublure qui est automatiquement nettoyée à la fin du test.
- `fakeFetch.mock.callCount()` donne le nombre d’appels ; `fakeFetch.mock.calls[0].arguments`
  les arguments du premier appel. On vérifie ainsi que l’adresse est correctement construite
  et encodée (`É` devient `%C3%89`).
- La fausse réponse n’imite que ce dont le code a besoin (`ok`, `status`, `json`).
- Le cas d’erreur (503), difficile à provoquer avec le vrai service, devient trivial à tester.

Il existe aussi `t.mock.method(objet, 'nomDeMéthode', implémentation)`, qui remplace
temporairement une méthode d’un objet existant et la restaure après le test.

:::warning[Une doublure ne prouve pas que le vrai service répond ainsi]
Une doublure reproduit ce que **tu crois** que le service renvoie. Si l’API change le nom
d’un champ, tes tests restent verts. Les doublures servent aux tests unitaires ; il faut
aussi, ailleurs, quelques vérifications avec le vrai service (tests d’intégration, essais
manuels documentés). N’abuse pas des doublures : remplace seulement ce qui est lent, externe
ou imprévisible.
:::

## Maîtriser le temps : les minuteurs simulés

Une fonction qui attend un délai rendrait le test lent. Exemple : rejeter une opération trop
longue.

```js
// src/timeout.js — rejette si une promesse met trop de temps
export function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Délai dépassé (${ms} ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
```

`t.mock.timers` remplace `setTimeout` par une version simulée : le temps n’avance que quand
le test appelle `tick`.

```js
// test/timeout.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withTimeout } from '../src/timeout.js';

describe('withTimeout', () => {
  it('renvoie le résultat si la promesse arrive à temps', async () => {
    assert.equal(await withTimeout(Promise.resolve('ok'), 1000), 'ok');
  });

  it('rejette après le délai, sans attendre réellement', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const never = new Promise(() => {}); // une promesse qui ne se résout jamais
    const result = withTimeout(never, 5000);
    t.mock.timers.tick(5000);
    await assert.rejects(result, { message: 'Délai dépassé (5000 ms)' });
  });
});
```

Le second test simule cinq secondes et s’exécute pourtant en un peu plus d’une
milliseconde. Les minuteurs simulés sont rétablis automatiquement à la fin du test. On peut
de la même façon figer la date courante avec
`t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-03-15T10:00:00Z') })` pour tester
du code qui dépend de « maintenant ».

## Tester une route HTTP

### Le minimum à savoir sur HTTP

Un client (navigateur, `fetch`, `curl`) envoie une **requête** : une **méthode** (`GET` pour
lire, `POST` pour créer…), un **chemin** (`/products`) et éventuellement des **paramètres de
requête** après `?` (`?maxPrice=5`). Le serveur renvoie une **réponse** : un **code de
statut** (200 succès, 400 requête invalide, 404 introuvable, 500 erreur du serveur), des
**en-têtes** (dont `Content-Type`, le format du corps) et un **corps**, ici du JSON.

Voici une petite API écrite avec le module natif `node:http` :

```js
// src/app.js — une petite API HTTP écrite avec le module node:http
import http from 'node:http';

const products = [
  { id: 1, name: 'Carnet', price: 4.5 },
  { id: 2, name: 'Stylo', price: 1.2 },
  { id: 3, name: 'Sac en toile', price: 12 },
];

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

export function createApp() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { status: 'ok' });
    } else if (request.method === 'GET' && url.pathname === '/products') {
      const maxPrice = url.searchParams.get('maxPrice');
      if (maxPrice === null) {
        sendJson(response, 200, products);
        return;
      }
      const limit = Number(maxPrice);
      if (maxPrice.trim() === '' || Number.isNaN(limit) || limit < 0) {
        sendJson(response, 400, { error: 'maxPrice doit être un nombre positif' });
        return;
      }
      sendJson(response, 200, products.filter((product) => product.price <= limit));
    } else {
      sendJson(response, 404, { error: 'Ressource introuvable' });
    }
  });
}
```

Point de conception important : `app.js` **crée** le serveur sans le démarrer. Le démarrage
réel est dans un autre fichier :

```js
// src/server.js — démarre l'API pour de vrai
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`API disponible sur http://localhost:${port}`);
});
```

Les tests peuvent ainsi créer leur propre serveur, sur le port de leur choix, et l’arrêter
quand ils ont fini.

### Le test

```js
// test/app.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';

describe('API du catalogue', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createApp();
    server.listen(0, '127.0.0.1'); // port 0 : le système choisit un port libre
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => {
    server.close();
  });

  it('GET /health répond 200 et { status: "ok" }', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  it('GET /products?maxPrice=5 ne renvoie que les produits à 5 € ou moins', async () => {
    const response = await fetch(`${baseUrl}/products?maxPrice=5`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.map((product) => product.name), ['Carnet', 'Stylo']);
  });

  it('GET /products?maxPrice=abc répond 400', async () => {
    const response = await fetch(`${baseUrl}/products?maxPrice=abc`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'maxPrice doit être un nombre positif' });
  });

  it('une route inconnue répond 404', async () => {
    const response = await fetch(`${baseUrl}/inconnue`);
    assert.equal(response.status, 404);
  });
});
```

```text
▶ API du catalogue
  ✔ GET /health répond 200 et { status: "ok" } (17.586837ms)
  ✔ GET /products?maxPrice=5 ne renvoie que les produits à 5 € ou moins (3.665868ms)
  ✔ GET /products?maxPrice=abc répond 400 (2.192824ms)
  ✔ une route inconnue répond 404 (1.603235ms)
✔ API du catalogue (33.195423ms)
ℹ tests 4
ℹ suites 1
ℹ pass 4
ℹ fail 0
```

Les étapes clés :

1. **Port 0** : au lieu d’un port fixe comme 3000 (peut-être déjà utilisé par ton serveur de
   développement, ou par un autre fichier de test qui s’exécute en même temps), on demande au
   système un port libre. `server.address().port` indique lequel il a choisi.
2. **Attendre l’écoute** : `listen` est asynchrone ; `await once(server, 'listening')`
   attend l’événement qui signale que le serveur est prêt.
3. **Une vraie requête** avec `fetch`, exactement comme un client.
4. **Vérifier statut, en-têtes et corps** : un test de route qui ne vérifie que le corps
   passerait à côté d’un mauvais code de statut.
5. **Arrêter le serveur** dans `after`. Sans `server.close()`, le serveur continue d’écouter,
   le processus de test ne se termine jamais et `node --test` reste bloqué.

Ce test est un test d’**intégration** : il vérifie ensemble le routage, la lecture des
paramètres, la validation et la sérialisation JSON, à travers une vraie connexion réseau
locale. Il reste rapide (quelques millisecondes par requête) et ne dépend d’aucun service
externe. La même technique fonctionnera avec Express : `app.listen(0)` renvoie aussi un
serveur `node:http`.

## Pièges courants

- **Oublier `await`** devant un appel asynchrone ou `assert.rejects`.
- **Utiliser `assert.throws` pour une promesse** : une fonction `async` ne lève jamais
  d’exception directement, elle renvoie une promesse rejetée. Utilise `assert.rejects`.
- **Appeler le vrai service externe dans les tests unitaires** : lents, instables,
  parfois payants. Injecte la dépendance et utilise une doublure.
- **Attendre réellement un délai** (`setTimeout` de plusieurs secondes dans un test) :
  utilise `t.mock.timers`.
- **Un port fixe dans les tests** : conflits aléatoires. Utilise le port 0.
- **Ne pas fermer le serveur** ou ne pas supprimer le dossier temporaire : processus bloqué
  ou fichiers qui s’accumulent.
- **Des tests qui partagent un état serveur** (une liste modifiée par un `POST` puis relue
  par un autre test) : l’ordre des tests compte. Réinitialise les données avant chaque test
  ou crée un serveur par suite.

## Exercices

### Exercice 1 — Tester une route supplémentaire

Ajoute à l’API une route `GET /products/:id` (par exemple `/products/2`) qui renvoie le
produit correspondant (200), 404 si l’identifiant n’existe pas, et 400 si l’identifiant
n’est pas un entier positif. Écris d’abord les trois tests, vois-les échouer, puis
implémente la route.

:::solution
Tests à ajouter dans la suite existante (ils réutilisent `baseUrl`) :

```js
it('GET /products/2 renvoie le stylo', async () => {
  const response = await fetch(`${baseUrl}/products/2`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: 2, name: 'Stylo', price: 1.2 });
});

it('GET /products/99 répond 404', async () => {
  const response = await fetch(`${baseUrl}/products/99`);
  assert.equal(response.status, 404);
});

it('GET /products/abc répond 400', async () => {
  const response = await fetch(`${baseUrl}/products/abc`);
  assert.equal(response.status, 400);
});
```

Avant l’implémentation, toute adresse `/products/…` tombe dans le cas « route inconnue » et
reçoit 404 : le premier test échoue (404 au lieu de 200), le troisième aussi (404 au lieu de
400), et le deuxième passe déjà, par chance. Implémentation, à insérer avant le `else` final :

```js
} else if (request.method === 'GET' && url.pathname.startsWith('/products/')) {
  const idText = url.pathname.slice('/products/'.length);
  const id = Number(idText);
  if (!/^\d+$/.test(idText) || id < 1) {
    sendJson(response, 400, { error: 'Identifiant invalide' });
    return;
  }
  const product = products.find((item) => item.id === id);
  if (!product) {
    sendJson(response, 404, { error: 'Produit introuvable' });
    return;
  }
  sendJson(response, 200, product);
```

Le test « 99 → 404 » passait avant l’implémentation : il ne prouvait rien seul. C’est
pourquoi on regarde quels tests échouent **avant** d’écrire le code.
:::

### Exercice 2 — Une doublure pour l’envoi de courriel

Une fonction envoie un courriel de bienvenue grâce à une fonction `send` reçue en paramètre :

```js
export async function welcome(user, send) {
  if (!user.email) {
    return false;
  }
  await send(user.email, `Bienvenue ${user.name} !`);
  return true;
}
```

Écris deux tests : l’un vérifie que `send` est appelée une fois avec la bonne adresse et le
bon message, l’autre qu’elle n’est pas appelée pour un utilisateur sans adresse.

:::solution
```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { welcome } from '../src/welcome.js';

describe('welcome', () => {
  it('envoie un message de bienvenue', async (t) => {
    const send = t.mock.fn(async () => {});
    const result = await welcome({ name: 'Ana', email: 'ana@example.com' }, send);
    assert.equal(result, true);
    assert.equal(send.mock.callCount(), 1);
    assert.deepEqual(send.mock.calls[0].arguments, ['ana@example.com', 'Bienvenue Ana !']);
  });

  it('n’envoie rien sans adresse', async (t) => {
    const send = t.mock.fn(async () => {});
    const result = await welcome({ name: 'Ben' }, send);
    assert.equal(result, false);
    assert.equal(send.mock.callCount(), 0);
  });
});
```

La doublure remplace un service externe (le serveur de courriel) et permet de vérifier
**comment** il a été appelé, sans rien envoyer. `deepEqual` compare le tableau des arguments.
:::

### Exercice 3 — Pourquoi ce test ne se termine-t-il jamais ?

Un collègue écrit ce test ; `npm test` reste bloqué indéfiniment après l’affichage du
résultat. Trouve les problèmes.

```js
describe('API', () => {
  const server = createApp().listen(3000);

  it('répond 200', async () => {
    const response = await fetch('http://localhost:3000/health');
    assert.equal(response.status, 200);
  });
});
```

:::solution
1. Le serveur n’est **jamais fermé** : il continue d’écouter, donc le processus de test ne
   se termine pas. Il faut `after(() => server.close())`.
2. Le **port fixe 3000** entre en conflit avec un serveur de développement déjà lancé
   (erreur `EADDRINUSE`) ou avec un autre fichier de test. Utiliser `listen(0)` et lire
   `server.address().port`.
3. Le serveur est démarré au moment où la suite est **déclarée**, sans attendre l’événement
   `listening` : la première requête peut partir trop tôt. Démarrer dans un `before` async
   avec `await once(server, 'listening')`.

La version corrigée est celle de la leçon.
:::

## Récapitulatif

- Un test qui manipule des promesses est `async` et attend chaque promesse avec `await` ;
  `assert.rejects` vérifie un rejet et doit lui-même être attendu.
- Les tests qui touchent le disque utilisent un dossier temporaire (`mkdtemp` dans
  `os.tmpdir()`), supprimé dans `after`.
- L’injection de dépendance permet de remplacer le réseau par une doublure `t.mock.fn`,
  qui enregistre ses appels (`mock.callCount()`, `mock.calls`).
- `t.mock.timers` simule `setTimeout` ou `Date` : le temps avance avec `tick`.
- Pour tester une route : créer le serveur sans le démarrer dans l’application, l’écouter
  sur le port 0 dans `before`, envoyer de vraies requêtes avec `fetch`, vérifier statut,
  en-têtes et corps, fermer le serveur dans `after`.
