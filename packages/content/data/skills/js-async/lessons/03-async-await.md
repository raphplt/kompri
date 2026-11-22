---
title: async et await
summary: Écrire du code asynchrone lisible avec async et await, gérer les erreurs avec try et catch, et choisir entre exécution en séquence et en parallèle.
durationMinutes: 55
sources:
  - title: MDN — async function
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/async_function
  - title: MDN — await
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/await
  - title: Node.js — Modules ECMAScript
    url: https://nodejs.org/api/esm.html
---

## Des promesses, écrites comme du code ordinaire

Les chaînes de `then` règlent le problème de la pyramide de callbacks, mais elles restent moins
naturelles à lire qu’une suite d’instructions. Dès qu’une étape a besoin du résultat de deux
étapes précédentes, ou qu’il faut une boucle ou une condition, la chaîne devient difficile à
suivre (tu l’as vu dans l’exercice 2 de la leçon précédente).

Les mots-clés `async` et `await` permettent d’écrire du code asynchrone **qui se lit de haut en
bas**, comme du code synchrone, tout en restant fondé sur les promesses. Ce n’est pas un nouveau
mécanisme : c’est une syntaxe plus agréable pour la même chose.

Les exemples sont des fichiers à lancer avec `node example.js`. Ils utilisent `await` au premier
niveau du fichier : Node.js 24 reconnaît alors automatiquement le fichier comme un **module ES**.
Dans un projet, on le déclare explicitement avec `"type": "module"` dans `package.json`. Dans un
navigateur, `await` au premier niveau fonctionne dans un `script type="module"`.

## Une fonction `async` renvoie toujours une promesse

```js
async function getAnswer() {
  return 42;
}

async function getFailure() {
  throw new Error('raté');
}

console.log(getAnswer());
getAnswer().then((value) => console.log(`valeur : ${value}`));
getFailure().catch((error) => console.log(`erreur : ${error.message}`));
```

Sortie :

```text
Promise { 42 }
valeur : 42
erreur : raté
```

Le mot-clé `async` devant une fonction change deux choses :

- ce qu’elle renvoie avec `return` devient la valeur d’une promesse **tenue** ;
- une erreur levée à l’intérieur devient la raison d’une promesse **rompue**, au lieu de remonter
  directement dans l’appelant.

Une fonction `async` renvoie donc **toujours** une promesse, même si son code ne contient aucune
opération asynchrone. On peut l’utiliser avec `then`, ou avec `await`.

## `await` : attendre une promesse

À l’intérieur d’une fonction `async` (ou au premier niveau d’un module), `await promesse` :

1. **suspend** l’exécution de la fonction jusqu’à ce que la promesse soit réglée, **sans bloquer**
   la boucle d’événements : les autres tâches continuent pendant ce temps ;
2. si la promesse est tenue, `await` **vaut sa valeur** ;
3. si elle est rompue, `await` **lève l’erreur**, exactement comme un `throw` à cet endroit.

Reprenons le résumé de commandes de la leçon précédente :

```js
const users = { 1: { id: 1, name: 'Ada' } };
const orders = { 1: [{ total: 30 }, { total: 12.5 }] };

function getUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (users[id]) {
        resolve(users[id]);
      } else {
        reject(new Error(`Utilisateur ${id} inconnu`));
      }
    }, 100);
  });
}

function getOrders(userId) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(orders[userId] ?? []), 100);
  });
}

async function printSummary(id) {
  try {
    const user = await getUser(id);
    const list = await getOrders(user.id);
    const total = list.reduce((sum, order) => sum + order.total, 0);
    console.log(`${user.name} : ${list.length} commande(s), ${total.toFixed(2)} €`);
  } catch (error) {
    console.log(`Impossible d’afficher le résumé : ${error.message}`);
  } finally {
    console.log(`fin du résumé ${id}`);
  }
}

await printSummary(1);
await printSummary(7);
console.log('terminé');
```

Sortie :

```text
Ada : 2 commande(s), 42.50 €
fin du résumé 1
Impossible d’afficher le résumé : Utilisateur 7 inconnu
fin du résumé 7
terminé
```

Compare avec la version en chaîne : plus d’objet `{ user, list }` à transmettre, `user` reste
simplement disponible dans la fonction. La gestion d’erreurs utilise le `try…catch…finally` que
tu connais déjà : une promesse rompue dans le `try` est rattrapée par le `catch`.

### Que se passe-t-il pendant un `await` ?

Quand la fonction rencontre `await getUser(id)`, elle s’arrête et **rend la main** : la pile se
vide, la boucle d’événements traite d’autres tâches. Quand la promesse est réglée, la suite de la
fonction est programmée comme une **microtâche**. C’est pourquoi `await` ne gèle ni l’interface,
ni le serveur. Le code **après** l’appel d’une fonction `async` non attendue continue, lui,
immédiatement.

## En séquence ou en parallèle ?

`await` dans une suite d’instructions attend chaque opération avant de lancer la suivante. C’est
nécessaire quand une étape dépend de la précédente (il faut l’utilisateur pour charger ses
commandes). Mais quand les opérations sont **indépendantes**, c’est du temps perdu.

```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const loadProfile = () => wait(300, 'profil');
const loadOrders = () => wait(300, 'commandes');
const loadMessages = () => wait(300, 'messages');

function measure(label, start) {
  console.log(`${label} : ${Math.round((Date.now() - start) / 100) * 100} ms`);
}

let start = Date.now();
const profile = await loadProfile();
const orders = await loadOrders();
const messages = await loadMessages();
measure(`en séquence (${profile}, ${orders}, ${messages})`, start);

start = Date.now();
const [profile2, orders2, messages2] = await Promise.all([
  loadProfile(),
  loadOrders(),
  loadMessages(),
]);
measure(`en parallèle (${profile2}, ${orders2}, ${messages2})`, start);
```

Sortie :

```text
en séquence (profil, commandes, messages) : 900 ms
en parallèle (profil, commandes, messages) : 300 ms
```

Dans la version parallèle, les trois fonctions sont **appelées** immédiatement (les trois
opérations démarrent), puis on attend une seule promesse qui les regroupe. La déstructuration
range les trois valeurs dans l’ordre du tableau. Règle : **lance d’abord tout ce qui est
indépendant, attends ensuite.**

### Les boucles et `await`

```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function saveItem(item) {
  await wait(100);
  console.log(`enregistré : ${item}`);
  return item.toUpperCase();
}

const items = ['a', 'b', 'c'];

// 1. forEach n’attend pas les fonctions async
items.forEach(async (item) => {
  await saveItem(item);
});
console.log('forEach terminé ?');
await wait(200);

// 2. for…of avec await : l’un après l’autre
const sequential = [];
for (const item of items) {
  sequential.push(await saveItem(item));
}
console.log('for…of :', sequential);

// 3. map + Promise.all : tous en même temps, résultats dans l’ordre
const parallel = await Promise.all(items.map((item) => saveItem(item)));
console.log('Promise.all :', parallel);
```

Sortie :

```text
forEach terminé ?
enregistré : a
enregistré : b
enregistré : c
enregistré : a
enregistré : b
enregistré : c
for…of : [ 'A', 'B', 'C' ]
enregistré : a
enregistré : b
enregistré : c
Promise.all : [ 'A', 'B', 'C' ]
```

1. **`forEach` ignore les promesses** renvoyées par son callback : il lance les trois
   enregistrements et se termine aussitôt. « forEach terminé ? » s’affiche avant le moindre
   enregistrement, et on n’a aucun moyen de savoir quand ils finissent, ni d’attraper leurs
   erreurs. N’utilise jamais `forEach` avec une fonction `async`.
2. **`for…of` avec `await`** traite les éléments l’un après l’autre (environ 300 ms ici). C’est
   le bon choix quand l’ordre compte ou qu’il faut ménager le service appelé.
3. **`map` puis `Promise.all`** lance tout en même temps (environ 100 ms) et rend les résultats
   dans l’ordre. C’est le bon choix pour des opérations indépendantes, en nombre raisonnable.

## Les erreurs avec `async`/`await`

### Oublier `await`

```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function getUser(id) {
  await wait(100);
  return { id, name: 'Ada', banned: true };
}

async function isBanned(id) {
  const user = await getUser(id);
  return user.banned;
}

async function isAllowed(id) {
  const user = await getUser(id);
  return !user.banned;
}

// Oubli de await : on manipule la promesse, pas la valeur
const user = getUser(1);
console.log(user.name);
console.log(user);

if (isAllowed(1)) {
  console.log('accès autorisé ?!'); // une promesse est truthy
}

if (await isAllowed(1)) {
  console.log('accès autorisé');
} else {
  console.log('accès refusé');
}
console.log(await isBanned(1));
```

Sortie :

```text
undefined
Promise { <pending> }
accès autorisé ?!
accès refusé
true
```

Sans `await`, `user` est une promesse : `user.name` vaut `undefined`, sans erreur. Plus grave,
`if (isAllowed(1))` teste une promesse, qui est un objet, donc **toujours truthy** : l’accès est
accordé à un utilisateur banni. Ce genre d’oubli produit des failles de sécurité réelles. Quand
une fonction est `async`, chaque appel doit être précédé d’`await` (ou consommé avec `then`), sauf
si tu veux volontairement lancer l’opération sans l’attendre.

### `return await` dans un `try`

```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function loadSettings() {
  await wait(100);
  throw new Error('fichier de réglages illisible');
}

async function withoutAwait() {
  try {
    return loadSettings(); // la promesse est renvoyée telle quelle : le catch ne voit rien
  } catch (error) {
    return 'réglages par défaut';
  }
}

async function withAwait() {
  try {
    return await loadSettings(); // l’erreur est levée ici, dans le try
  } catch (error) {
    return 'réglages par défaut';
  }
}

console.log(await withAwait());
try {
  console.log(await withoutAwait());
} catch (error) {
  console.log(`erreur non rattrapée par withoutAwait : ${error.message}`);
}
```

Sortie :

```text
réglages par défaut
erreur non rattrapée par withoutAwait : fichier de réglages illisible
```

Un `catch` n’attrape que ce qui est levé **pendant** l’exécution de son `try`. Sans `await`, le
`try` se termine en renvoyant la promesse, avant qu’elle ne soit rompue. Dans un `try`, écris
donc `return await`.

### Où mettre le `try…catch` ?

Il n’est pas utile d’entourer chaque `await` d’un `try`. Une erreur non rattrapée dans une
fonction `async` rompt la promesse qu’elle renvoie : elle **remonte** à l’appelant qui fait
`await`. Place le `try…catch` là où tu sais **quoi faire** de l’erreur : afficher un message à
l’utilisateur, renvoyer une valeur de secours, répondre 500 à un client. Et assure-toi qu’au
sommet, quelqu’un la gère : un `await` rompu au premier niveau d’un module arrête Node.js, comme
un rejet non géré.

## Pièges courants

1. **Oublier `await`** : on obtient une promesse au lieu de la valeur, et une condition sur une
   promesse est toujours vraie.
2. **`await` dans une fonction qui n’est pas `async`** : erreur de syntaxe. Selon le contexte,
   Node.js affiche « await is only valid in async functions and the top level bodies of
   modules » ou, dans un module ES, « Unexpected reserved word ».
3. **`forEach` avec une fonction `async`** : rien n’est attendu. Utilise `for…of` ou
   `Promise.all(tableau.map(…))`.
4. **Tout faire en séquence** par habitude : lance en parallèle ce qui est indépendant.
5. **`return` sans `await` dans un `try`** : l’erreur échappe au `catch`.
6. **Avaler les erreurs** avec un `catch` vide : au minimum, affiche-les ou relance-les.

## Exercices

### Exercice 1 — Le total du panier

Écris `getCartTotal(userId)` avec `async`/`await` : elle charge le panier, puis récupère le prix
de chaque produit **en parallèle**, et renvoie le total. Mesure la durée : elle doit être proche
de 300 ms, pas de 700 ms.

```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const carts = {
  7: [
    { productId: 'p1', quantity: 2 },
    { productId: 'p2', quantity: 1 },
    { productId: 'p3', quantity: 4 },
  ],
};
const prices = { p1: 4.5, p2: 12, p3: 1.25 };

const loadCart = (userId) => wait(100, carts[userId] ?? []);
const getPrice = (productId) => wait(200, prices[productId]);
```

:::solution
```js
async function getCartTotal(userId) {
  const cart = await loadCart(userId);
  const unitPrices = await Promise.all(cart.map((line) => getPrice(line.productId)));
  return cart.reduce((sum, line, index) => sum + line.quantity * unitPrices[index], 0);
}

const start = Date.now();
const total = await getCartTotal(7);
console.log(`total : ${total.toFixed(2)} € en ${Math.round((Date.now() - start) / 100) * 100} ms`);
console.log(await getCartTotal(99));
```

Sortie :

```text
total : 26.00 € en 300 ms
0
```

Le panier doit être chargé avant de connaître les produits : cette étape est en séquence
(100 ms). Les trois prix, eux, sont indépendants : `map` lance les trois appels, `Promise.all`
les attend ensemble (200 ms). Avec un `await` dans une boucle, on aurait 100 + 3 × 200 = 700 ms.
`Promise.all` rend les prix dans l’ordre du panier, d’où l’usage de `index` dans `reduce`. Un
panier vide donne un total de 0 grâce à la valeur initiale de `reduce` (et `Promise.all([])` est
tenue immédiatement avec un tableau vide).
:::

### Exercice 2 — Réessayer

Écris `retry(operation, attempts, delayMs)` : elle appelle la fonction `async` `operation` ; en
cas d’échec, elle affiche l’erreur, attend `delayMs` puis réessaie, jusqu’à `attempts` tentatives
au total. Après le dernier échec, elle relance la dernière erreur. Teste avec ce service qui
échoue deux fois avant de réussir :

```js
let calls = 0;
async function flakyService() {
  calls += 1;
  if (calls < 3) {
    throw new Error('service indisponible');
  }
  return 'données reçues';
}
```

:::solution
```js
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(operation, attempts, delayMs) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      console.log(`tentative ${attempt} échouée : ${error.message}`);
      if (attempt === attempts) {
        throw error;
      }
      await wait(delayMs);
    }
  }
}

let calls = 0;
async function flakyService() {
  calls += 1;
  if (calls < 3) {
    throw new Error('service indisponible');
  }
  return 'données reçues';
}

console.log(await retry(flakyService, 5, 100));

calls = -10;
try {
  await retry(flakyService, 2, 100);
} catch (error) {
  console.log(`abandon : ${error.message}`);
}
```

Sortie :

```text
tentative 1 échouée : service indisponible
tentative 2 échouée : service indisponible
données reçues
tentative 1 échouée : service indisponible
tentative 2 échouée : service indisponible
abandon : service indisponible
```

Ici, la boucle doit être **séquentielle** : on ne réessaie qu’après un échec. Le `return await`
est indispensable : sans `await`, le `catch` ne verrait jamais l’erreur et il n’y aurait aucune
nouvelle tentative. On passe la **fonction** `flakyService` (sans parenthèses) pour que `retry`
puisse l’appeler plusieurs fois ; une promesse déjà créée ne peut pas être « relancée ».
:::

### Exercice 3 — Revue de code

Trouve tous les problèmes de ce code, puis corrige-le pour qu’il affiche un bilan exact (envois
réussis et échecs) même si un envoi échoue.

```js
async function sendNewsletter(subscribers) {
  subscribers.forEach(async (subscriber) => {
    await sendEmail(subscriber.email);
  });
  console.log('Newsletter envoyée à tout le monde');
}

async function main() {
  const subscribers = loadSubscribers();
  sendNewsletter(subscribers);
}

main();
```

Simulations pour tester :

```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

async function loadSubscribers() {
  await wait(100);
  return [{ email: 'ada@example.com' }, { email: 'invalide' }, { email: 'grace@example.com' }];
}

async function sendEmail(email) {
  await wait(100);
  if (!email.includes('@')) {
    throw new Error(`adresse refusée : ${email}`);
  }
  console.log(`envoyé à ${email}`);
}
```

:::solution
Problèmes :

1. `loadSubscribers()` sans `await` : `subscribers` est une promesse, et
   `subscribers.forEach` lève `TypeError: subscribers.forEach is not a function`. Cette erreur
   rompt la promesse de `sendNewsletter`, que `main` n’attend pas et que personne ne gère :
   c’est un rejet non géré, et Node.js s’arrête.
2. `forEach` avec un callback `async` : les envois ne sont pas attendus.
3. Le message « envoyée à tout le monde » s’affiche avant tout envoi et ment en cas d’échec.
4. Les erreurs de `sendEmail` ne sont rattrapées nulle part.
5. `sendNewsletter(subscribers)` n’est pas attendue dans `main`.

```js
async function sendNewsletter(subscribers) {
  const results = await Promise.allSettled(
    subscribers.map((subscriber) => sendEmail(subscriber.email)),
  );
  const failures = results.filter((result) => result.status === 'rejected');
  console.log(`Newsletter : ${results.length - failures.length} envoi(s) réussi(s), ${failures.length} échec(s)`);
  for (const failure of failures) {
    console.log(`- ${failure.reason.message}`);
  }
}

async function main() {
  try {
    const subscribers = await loadSubscribers();
    await sendNewsletter(subscribers);
  } catch (error) {
    console.log(`Envoi interrompu : ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
```

Sortie :

```text
envoyé à ada@example.com
envoyé à grace@example.com
Newsletter : 2 envoi(s) réussi(s), 1 échec(s)
- adresse refusée : invalide
```

`Promise.allSettled` convient parce qu’un envoi raté ne doit pas empêcher les autres. Avec
`Promise.all`, la première adresse refusée aurait rompu l’ensemble, et le bilan serait perdu. Le
`try…catch` de `main` gère les erreurs qui empêchent tout envoi (liste illisible) et signale
l’échec au shell avec `process.exitCode = 1`. Pour des milliers d’abonnés, on enverrait par lots
plutôt que tout en même temps, pour ne pas saturer le service d’envoi.
:::

## Récapitulatif

- Une fonction `async` renvoie toujours une promesse : `return` la tient, `throw` la rompt.
- `await` suspend la fonction sans bloquer la boucle d’événements ; il vaut la valeur de la
  promesse ou lève son erreur.
- Gère les erreurs avec `try…catch…finally`, là où tu sais quoi en faire ; dans un `try`, écris
  `return await`.
- Lance en parallèle ce qui est indépendant (`Promise.all`), en séquence ce qui dépend d’une étape
  précédente.
- Jamais de `forEach` avec `async` : `for…of` pour la séquence, `map` + `Promise.all` (ou
  `allSettled`) pour le parallèle.
- Un `await` oublié donne une promesse au lieu d’une valeur, et une promesse est toujours truthy.
- `await` au premier niveau fonctionne dans les modules ES (`"type": "module"`, `script
  type="module"`).
