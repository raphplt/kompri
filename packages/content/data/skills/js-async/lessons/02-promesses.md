---
title: Les promesses
summary: Créer et consommer des promesses, les enchaîner, propager les erreurs et combiner plusieurs opérations avec Promise.all et ses variantes.
durationMinutes: 60
sources:
  - title: MDN — Utiliser les promesses
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Using_promises
  - title: MDN — Promise
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise
  - title: MDN — Promise.all()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
---

## Une valeur qui arrivera plus tard

Dans la leçon précédente, pour utiliser un résultat asynchrone, il fallait passer un callback à la
fonction qui le produisait. Une **promesse** (`Promise`) renverse la logique : la fonction
asynchrone **renvoie immédiatement un objet** qui représente le résultat futur. Tu peux stocker
cet objet, le passer à une autre fonction, lui attacher des traitements, en combiner plusieurs.

Une promesse est toujours dans l’un de ces trois états :

| État                   | Signification                                   |
| ---------------------- | ----------------------------------------------- |
| en attente (*pending*) | l’opération n’est pas terminée                  |
| tenue (*fulfilled*)    | l’opération a réussi ; la promesse a une valeur |
| rompue (*rejected*)    | l’opération a échoué ; la promesse a une raison, en général une `Error` |

Une promesse tenue ou rompue est dite **réglée** (*settled*). Une fois réglée, elle ne change
plus jamais d’état : elle ne peut pas être tenue deux fois, ni passer de rompue à tenue.

`fetch`, que tu utiliseras dans la leçon 4, renvoie une promesse. Avant d’en consommer de
vraies, apprenons à en fabriquer, pour bien voir ce qui se passe.

Les exemples s’exécutent avec `node example.js` (Node.js 24).

## Créer une promesse

```js
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const promise = wait(500);
console.log(promise);

promise.then(() => {
  console.log('500 ms plus tard');
  console.log(promise);
});

console.log('le script continue');
```

Sortie :

```text
Promise { <pending> }
le script continue
500 ms plus tard
Promise { undefined }
```

`new Promise(executor)` crée une promesse. La fonction `executor` est appelée **immédiatement**
avec deux fonctions :

- `resolve(valeur)` tient la promesse avec cette valeur ;
- `reject(raison)` la rompt avec cette raison.

Ici, `resolve` est appelée par le timer au bout de 500 ms, sans valeur : la promesse est tenue avec
`undefined`, comme le montre le second affichage. Node affiche l’état d’une promesse : `<pending>`
pour en attente, la valeur pour une promesse tenue.

On crée rarement des promesses à la main : la plupart viennent d’API qui les renvoient déjà
(`fetch`, les fonctions de `node:fs/promises`, les clients de base de données). `new Promise` sert
surtout à **adapter** une API à callbacks, comme `setTimeout` ici.

### Tenir ou rompre

```js
const users = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
];

function findUser(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = users.find((item) => item.id === id);
      if (user) {
        resolve(user); // la promesse est tenue, avec cette valeur
      } else {
        reject(new Error(`Utilisateur ${id} introuvable`)); // la promesse est rompue
      }
    }, 200);
  });
}

findUser(1)
  .then((user) => console.log(`Trouvé : ${user.name}`))
  .catch((error) => console.log(`Erreur : ${error.message}`))
  .finally(() => console.log('Recherche 1 terminée'));

findUser(99)
  .then((user) => console.log(`Trouvé : ${user.name}`))
  .catch((error) => console.log(`Erreur : ${error.message}`))
  .finally(() => console.log('Recherche 99 terminée'));
```

Sortie :

```text
Trouvé : Ada
Recherche 1 terminée
Erreur : Utilisateur 99 introuvable
Recherche 99 terminée
```

- `then(onFulfilled)` enregistre ce qu’il faut faire de la valeur, si la promesse est tenue.
- `catch(onRejected)` enregistre ce qu’il faut faire de l’erreur, si elle est rompue.
- `finally(onFinally)` s’exécute dans les deux cas, sans recevoir ni valeur ni erreur : on y place
  le nettoyage (masquer un indicateur de chargement, par exemple).

Rejette toujours avec un objet `Error` (`new Error('…')`) plutôt qu’avec une chaîne : il porte une
trace de pile et un `message`, et le code qui l’attrape peut compter sur `error.message`.

Les callbacks de `then`, `catch` et `finally` sont des **microtâches** : ils ne s’exécutent jamais
de façon synchrone, même si la promesse est déjà réglée au moment où on les enregistre.

## Enchaîner les promesses

`then` (comme `catch` et `finally`) **renvoie une nouvelle promesse**. C’est ce qui permet
d’enchaîner des étapes à plat, au lieu de les imbriquer.

```js
function wait(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

wait(100, 2)
  .then((n) => {
    console.log(`reçu ${n}`);
    return n * 10; // une valeur : la promesse suivante est tenue avec 20
  })
  .then((n) => {
    console.log(`reçu ${n}`);
    return wait(300, n + 1); // une promesse : on attend qu’elle soit tenue
  })
  .then((n) => {
    console.log(`reçu ${n}`);
    throw new Error('quelque chose a échoué'); // une erreur : la chaîne bascule vers catch
  })
  .then(() => {
    console.log('jamais affiché');
  })
  .catch((error) => {
    console.log(`attrapé : ${error.message}`);
    return 'valeur de secours'; // catch renvoie une valeur : la chaîne repart normalement
  })
  .then((value) => {
    console.log(`après catch : ${value}`);
  });
```

Sortie :

```text
reçu 2
reçu 20
reçu 21
attrapé : quelque chose a échoué
après catch : valeur de secours
```

Ce que renvoie le callback d’un `then` détermine la promesse suivante :

| Le callback…               | La promesse renvoyée par `then` est…                          |
| -------------------------- | ------------------------------------------------------------- |
| renvoie une valeur         | tenue avec cette valeur                                       |
| renvoie une promesse       | réglée comme elle, une fois qu’elle l’est : on l’attend       |
| ne renvoie rien            | tenue avec `undefined`                                        |
| lève une erreur (`throw`)  | rompue avec cette erreur                                      |

Une erreur **saute** tous les `then` suivants jusqu’au premier `catch`. Un seul `catch` à la fin
d’une chaîne protège donc toutes les étapes. Et un `catch` qui renvoie une valeur **rétablit** la
chaîne : c’est utile pour une valeur de secours, dangereux si tu masques une erreur sans le
vouloir.

### Le piège du `return` oublié

```js
function wait(ms, value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

// Oubli du return : la chaîne n’attend pas la promesse interne
wait(100, 'A')
  .then((value) => {
    wait(300, `${value} puis B`);
  })
  .then((value) => {
    console.log(`sans return : ${value}`);
  });

// Avec return : la chaîne attend et reçoit la valeur
wait(100, 'A')
  .then((value) => {
    return wait(300, `${value} puis B`);
  })
  .then((value) => {
    console.log(`avec return : ${value}`);
  });
```

Sortie :

```text
sans return : undefined
avec return : A puis B
```

Sans `return`, le premier `then` crée la promesse interne puis se termine en renvoyant
`undefined` : l’étape suivante s’exécute tout de suite, sans attendre. Pire, si la promesse
interne échoue, son erreur n’est attrapée par aucun `catch` de la chaîne. C’est l’erreur la plus
fréquente avec les promesses : **dans un `then`, renvoie toujours la promesse que tu crées.**

## Les rejets non gérés

```js
function failAfter(ms, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

failAfter(100, 'personne ne m’attrape');
setTimeout(() => console.log('cette ligne ne s’affichera pas'), 500);
```

Sortie avec Node.js 24 (chemins raccourcis), puis le processus s’arrête avec le code de sortie 1 :

```text
…/unhandled.js:2
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
                                                            ^

Error: personne ne m’attrape
    at Timeout._onTimeout (…/unhandled.js:2:61)
    at listOnTimeout (node:internal/timers:685:17)
    at process.processTimers (node:internal/timers:618:7)

Node.js v24.21.0
```

Une promesse rompue sans `catch` est un **rejet non géré**. Node.js arrête alors le processus :
pour un serveur, c’est un plantage. Dans un navigateur, l’erreur s’affiche dans la console
(« Uncaught (in promise) ») et le reste de la page continue, mais l’utilisateur n’est prévenu de
rien. Toute chaîne doit se terminer par une gestion d’erreur, ou être **renvoyée** à un appelant
qui s’en charge.

## Combiner plusieurs promesses

Souvent, on lance plusieurs opérations **en même temps** et on veut agir quand elles sont
terminées. Les quatre exemples suivants commencent par ces fonctions utilitaires :

```js
function succeedAfter(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function failAfter(ms, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

const start = Date.now();
const elapsed = () => `${Math.round((Date.now() - start) / 100) * 100} ms`;
```

### `Promise.all` : tout ou rien

```js
Promise.all([succeedAfter(300, 'profil'), succeedAfter(200, 'commandes')]).then((values) => {
  console.log(`tenue après ${elapsed()} :`, values);
});

Promise.all([succeedAfter(300, 'profil'), failAfter(100, 'commandes indisponibles')]).catch(
  (error) => {
    console.log(`rompue après ${elapsed()} : ${error.message}`);
  },
);
```

Sortie :

```text
rompue après 100 ms : commandes indisponibles
tenue après 300 ms : [ 'profil', 'commandes' ]
```

- `Promise.all(tableau)` est tenue quand **toutes** les promesses le sont, avec le tableau de leurs
  valeurs **dans l’ordre du tableau d’origine** (pas dans l’ordre d’arrivée).
- Les opérations se déroulent **en parallèle** : la durée totale est celle de la plus longue
  (300 ms), pas la somme (500 ms).
- Elle est rompue **dès la première erreur**, sans attendre les autres. Les autres opérations ne
  sont pas annulées pour autant : leurs résultats sont simplement ignorés.

C’est le bon choix quand toutes les données sont nécessaires (une page qui a besoin du profil
**et** des commandes).

### `Promise.allSettled` : tout, quoi qu’il arrive

```js
Promise.allSettled([succeedAfter(300, 'profil'), failAfter(100, 'commandes indisponibles')]).then(
  (results) => {
    console.log(`terminée après ${elapsed()}`);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        console.log(`fulfilled : ${result.value}`);
      } else {
        console.log(`rejected : ${result.reason.message}`);
      }
    }
  },
);
```

Sortie :

```text
terminée après 300 ms
fulfilled : profil
rejected : commandes indisponibles
```

`allSettled` attend que **toutes** les promesses soient réglées, et n’est jamais rompue. Elle donne
pour chacune un objet `{ status: 'fulfilled', value }` ou `{ status: 'rejected', reason }`. C’est
le bon choix quand les opérations sont **indépendantes** : un tableau de bord dont un widget en
panne ne doit pas empêcher l’affichage des autres.

### `Promise.race` et `Promise.any` : la première

```js
Promise.race([succeedAfter(400, 'réponse du serveur'), failAfter(200, 'délai dépassé')])
  .then((value) => console.log(`race tenue : ${value}`))
  .catch((error) => console.log(`race rompue après ${elapsed()} : ${error.message}`));

Promise.any([failAfter(100, 'miroir 1 en panne'), succeedAfter(300, 'fichier du miroir 2')])
  .then((value) => console.log(`any tenue après ${elapsed()} : ${value}`));

Promise.any([failAfter(100, 'miroir 1 en panne'), failAfter(200, 'miroir 2 en panne')])
  .catch((error) => {
    console.log(`any rompue après ${elapsed()} : ${error.name}`);
    console.log(error.errors.map((item) => item.message));
  });
```

Sortie :

```text
race rompue après 200 ms : délai dépassé
any rompue après 200 ms : AggregateError
[ 'miroir 1 en panne', 'miroir 2 en panne' ]
any tenue après 300 ms : fichier du miroir 2
```

- `Promise.race` se règle comme **la première promesse réglée**, qu’elle soit tenue ou rompue.
  Usage classique : mettre une opération en concurrence avec un délai maximal.
- `Promise.any` est tenue avec **la première promesse tenue** et ignore les échecs tant qu’il
  reste un espoir. Si toutes échouent, elle est rompue avec une `AggregateError` dont la propriété
  `errors` contient toutes les raisons. Usage : interroger plusieurs sources équivalentes et
  garder la plus rapide qui répond.

| Méthode      | Tenue quand…                     | Rompue quand…                    |
| ------------ | -------------------------------- | -------------------------------- |
| `all`        | toutes sont tenues               | la première est rompue           |
| `allSettled` | toutes sont réglées              | jamais                           |
| `race`       | la première réglée est tenue     | la première réglée est rompue    |
| `any`        | la première est tenue            | toutes sont rompues              |

`Promise.resolve(valeur)` et `Promise.reject(erreur)` créent directement une promesse tenue ou
rompue : pratique pour les tests ou pour renvoyer toujours une promesse depuis une fonction.

## Pièges courants

1. **Oublier `return` dans un `then`** : la chaîne n’attend pas et les erreurs s’échappent.
2. **Imbriquer les `then`** au lieu de les enchaîner : on retombe dans la pyramide des callbacks.
3. **Pas de `catch`** : rejet non géré, plantage du processus Node.js.
4. **Un `catch` qui avale l’erreur** (`catch(() => {})`) : l’échec devient invisible.
5. **Croire que `Promise.all` annule les autres opérations** au premier échec : elles continuent.
6. **Lire une promesse comme une valeur** : `console.log(findUser(1).name)` affiche `undefined`,
   car une promesse n’a pas de propriété `name`. Il faut attendre sa valeur.

## Exercices

### Exercice 1 — Un délai maximal

Écris `withTimeout(promise, ms)` qui renvoie une promesse réglée comme `promise` si elle se règle
en moins de `ms` millisecondes, et rompue avec l’erreur `Délai de … ms dépassé` sinon. Teste avec
une opération rapide et une opération lente.

:::solution
```js
function wait(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Délai de ${ms} ms dépassé`)), ms);
  });
  return Promise.race([promise, timeout]);
}

withTimeout(wait(100, 'rapide'), 500)
  .then((value) => console.log(`tenue : ${value}`))
  .catch((error) => console.log(`rompue : ${error.message}`));

withTimeout(wait(1000, 'lent'), 300)
  .then((value) => console.log(`tenue : ${value}`))
  .catch((error) => console.log(`rompue : ${error.message}`));
```

Sortie :

```text
tenue : rapide
rompue : Délai de 300 ms dépassé
```

`Promise.race` adopte le résultat de la première promesse réglée. Remarque : le programme met
environ une seconde à se terminer. L’opération lente n’est **pas annulée** par la course : son
timer continue, on ignore seulement son résultat. Pour annuler réellement une requête réseau, il
faudra `AbortController` (leçon 4).
:::

### Exercice 2 — Aplatir une pyramide

Ce code fonctionne pour un utilisateur existant, mais pas pour un utilisateur inconnu, et
l’appelant ne peut pas savoir quand il est terminé. Explique les trois problèmes, puis réécris
`printSummary(id)` en une chaîne à plat qui renvoie une promesse et gère les erreurs.

```js
function printSummary(id) {
  getUser(id).then((user) => {
    getOrders(user.id).then((list) => {
      const total = list.reduce((sum, order) => sum + order.total, 0);
      console.log(`${user.name} : ${list.length} commande(s), ${total.toFixed(2)} €`);
    });
  });
}
```

Utilise ces simulations pour tester :

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
```

:::solution
Les trois problèmes : les `then` sont **imbriqués** ; aucune promesse n’est **renvoyée**, donc
l’appelant ne peut ni attendre ni enchaîner ; et il n’y a **aucun `catch`**, donc
`printSummary(7)` provoque un rejet non géré qui arrête Node.js.

```js
function printSummary(id) {
  return getUser(id)
    .then((user) => {
      return getOrders(user.id).then((list) => ({ user, list }));
    })
    .then(({ user, list }) => {
      const total = list.reduce((sum, order) => sum + order.total, 0);
      console.log(`${user.name} : ${list.length} commande(s), ${total.toFixed(2)} €`);
    })
    .catch((error) => {
      console.log(`Impossible d’afficher le résumé : ${error.message}`);
    });
}

printSummary(1).then(() => printSummary(7));
```

Sortie :

```text
Ada : 2 commande(s), 42.50 €
Impossible d’afficher le résumé : Utilisateur 7 inconnu
```

L’étape suivante a besoin à la fois de `user` et de `list` : on renvoie un objet qui contient les
deux (une petite imbrication reste nécessaire pour garder `user` à portée). C’est précisément ce
que `async`/`await`, au programme de la leçon suivante, rendra beaucoup plus simple. Le
`return getUser(id)…` permet à l’appelant d’enchaîner les deux résumés dans l’ordre.
:::

### Exercice 3 — Le tableau de bord résistant

Trois widgets se chargent en parallèle ; l’un d’eux échoue. Avec `Promise.allSettled`, affiche le
nombre de widgets chargés et la liste des échecs avec leur nom.

```js
function succeedAfter(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function failAfter(ms, message) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

const widgets = [
  { name: 'agenda', load: () => succeedAfter(200, '3 rendez-vous') },
  { name: 'météo', load: () => failAfter(100, 'service indisponible') },
  { name: 'messages', load: () => succeedAfter(150, '2 non lus') },
];
```

:::solution
```js
Promise.allSettled(widgets.map((widget) => widget.load())).then((results) => {
  const loaded = results.filter((result) => result.status === 'fulfilled').length;
  const failures = results
    .map((result, index) => ({ result, name: widgets[index].name }))
    .filter(({ result }) => result.status === 'rejected')
    .map(({ result, name }) => `${name} : ${result.reason.message}`);
  console.log(`${loaded} widget(s) chargé(s), ${failures.length} en erreur`);
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
});
```

Sortie :

```text
2 widget(s) chargé(s), 1 en erreur
- météo : service indisponible
```

`widgets.map((widget) => widget.load())` lance les trois chargements **en même temps** et produit
un tableau de promesses. Les résultats de `allSettled` sont dans le même ordre que ce tableau : on
retrouve donc le nom de chaque widget par son index. Avec `Promise.all`, l’échec de la météo
aurait empêché d’afficher l’agenda et les messages.
:::

## Récapitulatif

- Une promesse représente un résultat futur : en attente, puis tenue (valeur) ou rompue (raison),
  définitivement.
- `new Promise((resolve, reject) => …)` adapte une API à callbacks ; rejette avec une `Error`.
- `then`, `catch` et `finally` renvoient une nouvelle promesse ; leurs callbacks sont des
  microtâches.
- Dans une chaîne, une valeur renvoyée passe à l’étape suivante, une promesse renvoyée est
  attendue, une erreur saute jusqu’au prochain `catch`.
- Renvoie toujours la promesse créée dans un `then` ; termine chaque chaîne par un `catch` ou
  renvoie-la à l’appelant. Un rejet non géré arrête Node.js.
- `all` (tout ou rien), `allSettled` (tous les résultats), `race` (la première réglée), `any` (la
  première tenue) combinent des opérations lancées en parallèle.
