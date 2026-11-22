---
title: Chargement, erreur et annulation dans une interface
summary: Afficher les états d’une requête dans une page, éviter les réponses périmées en annulant les requêtes, et garder l’interface accessible pendant l’attente.
durationMinutes: 60
sources:
  - title: MDN — AbortSignal.any()
    url: https://developer.mozilla.org/fr/docs/Web/API/AbortSignal/any_static
  - title: MDN — AbortSignal.timeout()
    url: https://developer.mozilla.org/fr/docs/Web/API/AbortSignal/timeout_static
  - title: MDN — aria-busy
    url: https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-busy
---

## Ce que l’utilisateur voit pendant qu’on attend

Côté code, une requête est une promesse qui finit par être tenue ou rompue. Côté utilisateur,
c’est une attente dont il ne connaît ni la durée ni l’issue. Une bonne interface lui dit **à
chaque instant** où il en est :

| État         | Ce que l’interface montre                                         |
| ------------ | ----------------------------------------------------------------- |
| chargement   | un indicateur (« Recherche en cours… »), les anciens résultats atténués |
| succès       | les données                                                       |
| vide         | un message explicite (« Aucun livre trouvé. »), pas une zone blanche |
| erreur       | un message compréhensible et un moyen de réessayer               |

Il faut aussi gérer ce que l’utilisateur fait **pendant** l’attente : il tape une autre
recherche, clique deux fois, change de page. Si l’on n’y prend pas garde, une ancienne réponse
peut écraser une plus récente. Cette leçon construit une page de recherche qui traite tous ces
cas.

On réutilise le `server.js` de la leçon précédente : il sert aussi les fichiers du dossier
`public/`. Place les fichiers HTML et JavaScript de cette leçon dans `public/` (ou dans un
sous-dossier), lance `node server.js` et ouvre `http://localhost:3000/`. Comme la page et l’API
viennent de la même origine, `fetch('/api/books')` fonctionne avec une adresse relative. Rappel :
le serveur répond en 1,2 s à une recherche d’une seule lettre, et en 0,3 s sinon.

## Le bug de la réponse périmée

Voici une recherche « au fil de la frappe », écrite naïvement, dans `public/naive/index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Recherche naïve</title>
    <script type="module" src="app.js"></script>
  </head>
  <body>
    <label for="search">Rechercher un livre</label>
    <input id="search" type="search" />
    <ul id="results"></ul>
  </body>
</html>
```

et `public/naive/app.js` :

```js
const input = document.querySelector('#search');
const list = document.querySelector('#results');

input.addEventListener('input', async () => {
  const url = new URL('/api/books', location.origin);
  url.searchParams.set('q', input.value);
  const response = await fetch(url);
  const books = await response.json();
  list.replaceChildren(
    ...books.map((book) => {
      const item = document.createElement('li');
      item.textContent = book.title;
      return item;
    }),
  );
  console.log(`affiché : résultats pour « ${url.searchParams.get('q')} »`);
});
```

Ouvre `http://localhost:3000/naive/` et tape rapidement `du`. Console de Chromium :

```text
affiché : résultats pour « du »
affiché : résultats pour « d »
```

Le champ contient `du`, mais la liste affiche les cinq livres trouvés pour `d` ! La requête pour
`d` est partie la première mais a mis 1,2 s ; celle pour `du`, partie ensuite, a répondu en 0,3 s.
Les réponses sont arrivées **dans le désordre**, et la dernière arrivée a gagné. C’est une
**condition de course** (*race condition*) : le résultat dépend de l’ordre d’arrivée, que tu ne
contrôles pas. Sur un vrai réseau, les temps de réponse varient sans cesse : ce bug arrive
réellement, de façon aléatoire, et il est difficile à reproduire.

Autres défauts de cette version : aucune indication de chargement, aucune gestion d’erreur (un
404 ou une coupure réseau laisse l’ancienne liste sans explication), aucun message quand la
liste est vide, et une requête envoyée à **chaque** touche.

## Une recherche robuste

`public/index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Bibliothèque</title>
    <link rel="stylesheet" href="style.css" />
    <script type="module" src="app.js"></script>
  </head>
  <body>
    <main>
      <h1>Bibliothèque</h1>
      <label for="search">Rechercher un livre</label>
      <input id="search" type="search" autocomplete="off" />
      <p id="status" role="status"></p>
      <div id="error" hidden>
        <p id="error-message"></p>
        <button id="retry" type="button">Réessayer</button>
      </div>
      <ul id="results"></ul>
    </main>
  </body>
</html>
```

`public/style.css` :

```css
[aria-busy='true'] {
  opacity: 0.5;
}
```

`public/app.js` :

```js
const input = document.querySelector('#search');
const status = document.querySelector('#status');
const errorBox = document.querySelector('#error');
const errorMessage = document.querySelector('#error-message');
const retryButton = document.querySelector('#retry');
const list = document.querySelector('#results');

let currentController = null; // contrôleur de la recherche la plus récente
let debounceTimer = null;

function renderBooks(books) {
  list.replaceChildren(
    ...books.map((book) => {
      const item = document.createElement('li');
      item.textContent = `${book.title} — ${book.author}`;
      return item;
    }),
  );
}

function describeError(error) {
  if (error.name === 'TimeoutError') {
    return 'Le serveur met trop de temps à répondre.';
  }
  if (error instanceof TypeError) {
    return 'Impossible de joindre le serveur. Vérifie ta connexion.';
  }
  return error.message;
}

async function search(query) {
  currentController?.abort(); // la recherche précédente est devenue inutile
  const controller = new AbortController();
  currentController = controller;
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]);

  // État « chargement »
  errorBox.hidden = true;
  list.setAttribute('aria-busy', 'true');
  status.textContent = 'Recherche en cours…';

  try {
    const url = new URL('/api/books', location.origin);
    url.searchParams.set('q', query);
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Le serveur a rencontré un problème (erreur ${response.status}).`);
    }
    const books = await response.json();

    // État « succès », éventuellement vide
    renderBooks(books);
    status.textContent =
      books.length === 0 ? 'Aucun livre trouvé.' : `${books.length} livre(s) trouvé(s).`;
  } catch (error) {
    if (error.name === 'AbortError') {
      return; // une recherche plus récente a pris le relais : on ne touche à rien
    }
    // État « erreur »
    list.replaceChildren();
    status.textContent = '';
    errorMessage.textContent = describeError(error);
    errorBox.hidden = false;
  } finally {
    if (currentController === controller) {
      list.removeAttribute('aria-busy');
    }
  }
}

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => search(input.value.trim()), 300);
});

retryButton.addEventListener('click', () => {
  input.focus(); // le bouton va disparaître : on place le focus sur le champ
  search(input.value.trim());
});

search('');
```

Comportement vérifié dans Chromium :

| Action                                   | Statut affiché                   | Liste                    |
| ---------------------------------------- | -------------------------------- | ------------------------ |
| ouverture de la page, immédiatement      | `Recherche en cours…`            | vide, `aria-busy="true"` |
| 0,5 s plus tard                          | `5 livre(s) trouvé(s).`          | les cinq livres          |
| frappe rapide de `du`                    | `1 livre(s) trouvé(s).`          | Dune                     |
| saisie de `zzz`                          | `Aucun livre trouvé.`            | vide                     |
| réponse 500 du serveur (simulée)         | vide, bloc d’erreur affiché      | vide                     |
| clic sur « Réessayer » (serveur rétabli) | `1 livre(s) trouvé(s).`          | Dune ; focus dans le champ |
| réseau coupé (simulé)                    | `Impossible de joindre le serveur. Vérifie ta connexion.` dans le bloc d’erreur | vide |
| réponse en plus de 5 s (simulée)         | `Le serveur met trop de temps à répondre.` | vide           |

Analysons les mécanismes.

### 1. Annuler la requête précédente

Chaque recherche crée son `AbortController` et le range dans `currentController`. La recherche
suivante commence par **annuler** la précédente. La requête annulée est rompue avec une
`AbortError`, que le `catch` ignore : une recherche plus récente s’occupe déjà de l’affichage.
Ainsi, seule la réponse de la **dernière** recherche peut modifier la page : la condition de
course disparaît.

`AbortSignal.any([...])` combine deux signaux : la requête est annulée si l’on lance une autre
recherche **ou** si 5 secondes passent (`AbortSignal.timeout`). Dans ce second cas, l’erreur
s’appelle `TimeoutError` et elle n’est **pas** ignorée : l’utilisateur doit savoir que sa
recherche a échoué.

### 2. Ne pas envoyer une requête à chaque touche

`setTimeout` et `clearTimeout` implémentent un **anti-rebond** (*debounce*) : à chaque frappe, on
annule le minuteur précédent et on en relance un de 300 ms. La recherche ne part que lorsque
l’utilisateur a cessé de taper pendant 300 ms. Moins de requêtes inutiles, moins de charge pour
le serveur. L’anti-rebond ne remplace pas l’annulation : une requête lente peut toujours être
dépassée par la suivante.

### 3. Un état visible et annoncé

- Le paragraphe `role="status"` est présent dès le chargement : chaque changement de son texte
  est annoncé poliment par les lecteurs d’écran (« Recherche en cours… », puis « 1 livre(s)
  trouvé(s). »). Sans lui, un utilisateur aveugle ne saurait pas que la liste a changé.
- `aria-busy="true"` sur la liste indique aux technologies d’assistance qu’elle est en cours de
  mise à jour ; le CSS s’en sert aussi pour atténuer les anciens résultats. Les garder visibles
  pendant le chargement évite que la page « saute » à chaque frappe.
- Le bloc `finally` retire `aria-busy`, que la requête ait réussi ou échoué, **sauf** si une
  recherche plus récente est en cours (`currentController !== controller`) : c’est elle qui le
  retirera.

### 4. Des erreurs compréhensibles et récupérables

`describeError` traduit les erreurs techniques en messages utiles : délai dépassé, serveur
injoignable (`TypeError`, dont le message brut, « Failed to fetch », ne dit rien à un
utilisateur), ou erreur HTTP. Le bouton « Réessayer » relance la même recherche. Comme le bloc
d’erreur, et donc le bouton, va être masqué, le focus est d’abord placé dans le champ : sinon, un
utilisateur au clavier se retrouverait au début de la page.

## Éviter le double envoi

Pour une action qui **modifie** des données (ajouter un livre, payer), un double clic ne doit pas
envoyer deux requêtes. Le réflexe est de désactiver le bouton avec `button.disabled = true`.
Mais dans Chromium, un bouton qui a le focus et qui devient désactivé **perd le focus**, qui
retombe sur `body` : l’utilisateur au clavier est renvoyé au début de la page. Une alternative
consiste à garder le bouton actif, à ignorer les envois pendant la requête, et à signaler l’état
avec `aria-disabled`.

`public/add/index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Ajouter un livre</title>
    <script type="module" src="app.js"></script>
  </head>
  <body>
    <h1>Ajouter un livre</h1>
    <form id="book-form">
      <label for="title">Titre</label>
      <input id="title" name="title" required />
      <label for="author">Auteur ou autrice</label>
      <input id="author" name="author" required />
      <button type="submit">Ajouter</button>
    </form>
    <p id="status" role="status"></p>
  </body>
</html>
```

`public/add/app.js` :

```js
const form = document.querySelector('#book-form');
const button = form.querySelector('button[type="submit"]');
const status = document.querySelector('#status');
let pending = false;

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (pending) {
    return; // une requête est déjà en cours : on ignore le double envoi
  }
  pending = true;
  button.setAttribute('aria-disabled', 'true');
  status.textContent = 'Enregistrement en cours…';

  try {
    const response = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? `Erreur ${response.status}`);
    }
    status.textContent = `« ${body.title} » a été ajouté.`;
    form.reset();
    form.elements.title.focus();
  } catch (error) {
    status.textContent =
      error.name === 'TimeoutError'
        ? 'Le serveur met trop de temps à répondre. Réessaie.'
        : `L’ajout a échoué : ${error.message}`;
  } finally {
    pending = false;
    button.removeAttribute('aria-disabled');
  }
});
```

Vérification dans Chromium : en appuyant deux fois de suite sur Entrée sur le bouton, le statut
affiche « Enregistrement en cours… », `aria-disabled` vaut `"true"`, et **une seule** requête
`POST` part ; une fois la réponse reçue, le statut indique « « Ubik » a été ajouté. » et le focus
est dans le champ Titre.

Le `finally` est essentiel : quelle que soit l’issue, succès, erreur HTTP, réseau coupé ou délai
dépassé, l’état « en cours » est levé et l’utilisateur peut réessayer. Sans lui, la moindre
erreur bloquerait le formulaire pour de bon. Ici, on lit le corps JSON avant de tester `ok`, car
l’API renvoie aussi du JSON en cas d’erreur ; avec une API qui renvoie parfois du HTML, il
faudrait vérifier `Content-Type` d’abord.

## Pièges courants

1. **Laisser la dernière réponse arrivée gagner** : annule la requête précédente (ou ignore les
   réponses qui ne correspondent plus à la dernière demande).
2. **Traiter une `AbortError` comme une erreur** : afficher « La recherche a échoué » chaque fois
   que l’utilisateur tape une lettre de plus. Ignore-la quand c’est toi qui as annulé.
3. **Oublier `finally`** : un indicateur de chargement ou un bouton bloqué pour toujours après une
   erreur.
4. **Une zone vide sans explication** : distingue « chargement », « aucun résultat » et « erreur ».
5. **Afficher le message technique brut** (« Failed to fetch », « Unexpected token ») à
   l’utilisateur.
6. **Changer l’affichage sans l’annoncer** : utilise une région `role="status"` présente dès le
   départ.
7. **Désactiver un bouton qui a le focus** sans gérer le focus.
8. **Réutiliser un `AbortController` déjà annulé** : son signal reste annulé ; crée un contrôleur
   par requête.

## Exercices

### Exercice 1 — Des fiches qui ne se marchent pas dessus

Crée `public/fiche/index.html` avec trois boutons (livres 1, 3 et 42, l’identifiant dans
`data-id`), une région de statut et un `article` masqué qui affichera le titre et l’auteur. Un
clic charge la fiche avec `GET /api/books/:id`. Exigences : statut « Chargement de la fiche… »
pendant la requête ; « Ce livre n’existe pas. » pour un 404 ; un message pour les autres erreurs ;
et si l’on clique sur un autre livre avant la fin du chargement, seule la dernière fiche
demandée s’affiche. Un seul écouteur, par délégation.

:::solution
```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Fiches</title>
    <script type="module" src="app.js"></script>
  </head>
  <body>
    <h1>Fiches de livres</h1>
    <div id="choices">
      <button type="button" data-id="1">Livre 1</button>
      <button type="button" data-id="3">Livre 3</button>
      <button type="button" data-id="42">Livre 42</button>
    </div>
    <p id="status" role="status"></p>
    <article id="card" hidden>
      <h2 id="card-title"></h2>
      <p id="card-author"></p>
    </article>
  </body>
</html>
```

```js
const status = document.querySelector('#status');
const card = document.querySelector('#card');
let currentController = null;

async function showBook(id) {
  currentController?.abort();
  const controller = new AbortController();
  currentController = controller;

  card.hidden = true;
  status.textContent = 'Chargement de la fiche…';
  try {
    const response = await fetch(`/api/books/${id}`, { signal: controller.signal });
    if (response.status === 404) {
      status.textContent = 'Ce livre n’existe pas.';
      return;
    }
    if (!response.ok) {
      throw new Error(`erreur ${response.status}`);
    }
    const book = await response.json();
    document.querySelector('#card-title').textContent = book.title;
    document.querySelector('#card-author').textContent = book.author;
    card.hidden = false;
    status.textContent = `Fiche de « ${book.title} » chargée.`;
  } catch (error) {
    if (error.name !== 'AbortError') {
      status.textContent = `Impossible de charger la fiche (${error.message}).`;
    }
  }
}

document.querySelector('#choices').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (button) {
    showBook(button.dataset.id);
  }
});
```

Vérification dans Chromium : juste après le clic sur « Livre 1 », le statut indique
« Chargement de la fiche… » et la fiche est masquée ; 0,4 s plus tard, « Fiche de « Dune »
chargée. » ; « Livre 42 » donne « Ce livre n’existe pas. » ; un clic sur « Livre 1 » suivi 50 ms
plus tard d’un clic sur « Livre 3 » affiche Hypérion, et jamais Dune.

Le 404 est un cas **attendu** (l’identifiant n’existe pas) : on le traite à part, avec un message
précis, au lieu de le confondre avec une panne. La fiche est masquée pendant le chargement pour
ne pas afficher l’ancien livre sous un statut qui parle du nouveau. Le titre est inséré avec
`textContent` : les données d’une API sont des données externes.
:::

### Exercice 2 — Le bouton bloqué

Ce code charge un rapport. Teste-le avec `/api/broken` (réponse 500), puis en coupant le
serveur. Décris ce qui se passe dans chaque cas et corrige tous les défauts.

```js
const button = document.querySelector('#load');
const status = document.querySelector('#status');

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Chargement…';
  const response = await fetch('/api/broken');
  const data = await response.json();
  status.textContent = `Reçu : ${data.message}`;
  button.disabled = false;
});
```

:::solution
Comportements observés dans Chromium :

- **Réponse 500** : le statut affiche « Reçu : undefined ». `fetch` ne rejette pas sur un 500, le
  code ne teste pas `response.ok` et lit `message` dans un corps qui contient `error`.
- **Serveur coupé** : `fetch` rejette (`TypeError: Failed to fetch`), l’erreur n’est pas
  rattrapée (elle apparaît dans la console comme une erreur non gérée), le statut reste sur
  « Chargement… » et le bouton reste **désactivé pour toujours**.
- Dans les deux cas, désactiver le bouton qui a le focus envoie le focus sur `body`.

```js
const button = document.querySelector('#load');
const status = document.querySelector('#status');
let pending = false;

button.addEventListener('click', async () => {
  if (pending) {
    return;
  }
  pending = true;
  button.setAttribute('aria-disabled', 'true');
  status.textContent = 'Chargement…';
  try {
    const response = await fetch('/api/broken', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(`le serveur a répondu ${response.status}`);
    }
    const data = await response.json();
    status.textContent = `Reçu : ${data.message}`;
  } catch (error) {
    status.textContent =
      error.name === 'TimeoutError'
        ? 'Le serveur met trop de temps à répondre.'
        : `Le chargement a échoué (${error instanceof TypeError ? 'serveur injoignable' : error.message}).`;
  } finally {
    pending = false;
    button.removeAttribute('aria-disabled');
  }
});
```

Le `try…catch` transforme chaque échec en message ; le `finally` garantit que le bouton redevient
utilisable ; `response.ok` est testé avant de lire les données ; le délai maximal évite une
attente infinie ; le bouton garde le focus grâce à `aria-disabled` et au drapeau `pending`. Pour
que le message soit annoncé, `#status` doit porter `role="status"`.
:::

### Exercice 3 — Écrire un anti-rebond réutilisable

Écris `debounce(fn, ms)` qui renvoie une **nouvelle fonction** : chaque appel de cette fonction
repousse l’exécution de `fn` ; `fn` n’est exécutée, avec les derniers arguments reçus, que si
aucun nouvel appel n’arrive pendant `ms` millisecondes. Teste-la dans Node.js avec des appels à
0, 100, 200 et 1000 ms.

:::solution
```js
function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const start = Date.now();
const log = debounce((text) => {
  console.log(`recherche « ${text} » à ${Math.round((Date.now() - start) / 100) * 100} ms`);
}, 300);

log('d');
setTimeout(() => log('du'), 100);
setTimeout(() => log('dun'), 200);
setTimeout(() => log('dune'), 1000);
```

Sortie :

```text
recherche « dun » à 500 ms
recherche « dune » à 1300 ms
```

Les trois premiers appels sont rapprochés : chacun annule le minuteur du précédent, et seul le
dernier (`dun`, à 200 ms) aboutit, 300 ms plus tard. L’appel à 1000 ms arrive après un silence :
il déclenche sa propre exécution à 1300 ms. `timer` est conservé entre les appels grâce à une
**fermeture** : chaque fonction créée par `debounce` a son propre minuteur. Dans la page de
recherche, on écrirait `input.addEventListener('input', debounce(() => search(input.value.trim()), 300))`.
:::

## Récapitulatif

- Une interface asynchrone montre quatre états : chargement, succès, vide, erreur.
- Une région `role="status"` présente dès le départ annonce chaque changement ; `aria-busy`
  signale une zone en cours de mise à jour.
- Les réponses peuvent arriver dans le désordre : annule la requête précédente avec un
  `AbortController` par requête, et ignore l’`AbortError` qui en résulte.
- `AbortSignal.timeout` fixe un délai maximal ; `AbortSignal.any` combine annulation et délai.
- L’anti-rebond (`setTimeout`/`clearTimeout`) limite le nombre de requêtes pendant la frappe.
- `finally` lève l’état « en cours » quoi qu’il arrive.
- Traduis les erreurs en messages compréhensibles, propose de réessayer, et gère le focus quand un
  élément disparaît ou se désactive.
