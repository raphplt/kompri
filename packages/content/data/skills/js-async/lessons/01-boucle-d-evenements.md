---
title: La boucle d’événements
summary: Comprendre comment JavaScript attend sans bloquer, grâce à la pile d’appels, aux files de tâches et aux microtâches.
durationMinutes: 50
sources:
  - title: MDN — Utiliser les microtâches en JavaScript avec queueMicrotask()
    url: https://developer.mozilla.org/fr/docs/Web/API/HTML_DOM_API/Microtask_guide
  - title: WHATWG — HTML, boucles d’événements
    url: https://html.spec.whatwg.org/multipage/webappapis.html#event-loops
  - title: Node.js — The Node.js Event Loop
    url: https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick
---

## Le problème : attendre sans tout bloquer

Un programme passe une grande partie de son temps à **attendre** : la réponse d’un serveur, la
lecture d’un fichier, un clic de l’utilisateur, la fin d’un délai. Pendant une requête réseau
d’une demi-seconde, un processeur pourrait exécuter des centaines de millions d’instructions.

JavaScript n’exécute ton code que sur **un seul fil d’exécution** (*thread*) : une seule
instruction à la fois. S’il restait immobile en attendant chaque réponse, la page ne réagirait
plus aux clics et un serveur Node.js ne pourrait servir qu’un client à la fois.

La solution est l’**asynchrone** : on lance une opération longue, on indique **quoi faire quand
elle sera terminée**, et on continue immédiatement. Le mécanisme qui orchestre tout cela
s’appelle la **boucle d’événements** (*event loop*). Le comprendre permet de prévoir l’ordre
d’exécution d’un programme — et de comprendre la plupart des bugs asynchrones.

Les exemples s’exécutent avec `node example.js` ; l’ordre des affichages est le même dans la
console d’un navigateur (vérifié dans Chromium).

## Premier constat : le code ne s’exécute pas dans l’ordre écrit

```js
console.log('1. début du script');

setTimeout(() => {
  console.log('5. setTimeout (macrotâche)');
}, 0);

Promise.resolve().then(() => {
  console.log('3. then (microtâche)');
});

queueMicrotask(() => {
  console.log('4. queueMicrotask (microtâche)');
});

console.log('2. fin du script');
```

Sortie :

```text
1. début du script
2. fin du script
3. then (microtâche)
4. queueMicrotask (microtâche)
5. setTimeout (macrotâche)
```

Le `setTimeout` demande un délai de 0 milliseconde, et pourtant il passe en dernier. La promesse,
écrite avant `queueMicrotask`, passe avant lui mais après la fin du script. Pour comprendre, il
faut connaître quatre pièces.

## Les quatre pièces du mécanisme

### 1. La pile d’appels

La **pile d’appels** (*call stack*) enregistre les fonctions en cours d’exécution. Quand une
fonction est appelée, elle est **empilée** ; quand elle se termine, elle est **dépilée**. Le
moteur exécute toujours la fonction du sommet.

```js
function formatPrice(price) {
  return price.toFixed(2); // plante si price n’est pas un nombre
}

function formatLine(line) {
  return `${line.name} : ${formatPrice(line.price)} €`;
}

function printCart(cart) {
  for (const line of cart) {
    console.log(formatLine(line));
  }
}

printCart([{ name: 'Stylo', price: 1.5 }, { name: 'Cahier' }]);
```

Sortie (les chemins dépendent de ton dossier, les dernières lignes internes à Node sont
coupées) :

```text
Stylo : 1.50 €
…/stack.js:2
  return price.toFixed(2); // plante si price n’est pas un nombre
               ^

TypeError: Cannot read properties of undefined (reading 'toFixed')
    at formatPrice (…/stack.js:2:16)
    at formatLine (…/stack.js:6:28)
    at printCart (…/stack.js:11:17)
    at Object.<anonymous> (…/stack.js:15:1)
```

La **trace de pile** (*stack trace*) affichée avec une erreur est une photographie de la pile au
moment de l’erreur, du sommet vers la base : `formatPrice` a été appelée par `formatLine`,
appelée par `printCart`, appelée par le code principal du fichier. C’est l’outil de débogage
le plus précieux : lis-la de haut en bas pour remonter à la cause.

Tant que la pile n’est pas vide, **rien d’autre ne peut s’exécuter** : ni un autre écouteur, ni un
`setTimeout`, ni l’affichage de la page.

### 2. L’environnement : navigateur ou Node.js

`setTimeout`, `fetch`, les événements du DOM ou la lecture de fichiers ne font pas partie du
langage JavaScript lui-même : ils sont fournis par l’**environnement** (le navigateur ou Node.js).
Quand tu appelles `setTimeout(fn, 1000)`, le moteur confie le délai à l’environnement et
**continue immédiatement**. L’environnement compte le temps de son côté, sans occuper la pile.

### 3. Les files d’attente

Quand l’opération est terminée (le délai est écoulé, la réponse est arrivée, l’utilisateur a
cliqué), l’environnement ne peut pas interrompre le code en cours. Il place le callback dans une
**file d’attente** :

- la **file des tâches** (on parle souvent de **macrotâches**) reçoit les callbacks des timers,
  des événements du DOM, des entrées-sorties ;
- la **file des microtâches** reçoit les callbacks des promesses (`then`, `catch`, `finally`, la
  suite d’un `await`) et ceux de `queueMicrotask`.

### 4. La boucle d’événements

La boucle répète indéfiniment, de façon simplifiée :

1. prendre **une** tâche dans la file des tâches et l’exécuter jusqu’au bout (jusqu’à ce que la
   pile soit vide) ;
2. exécuter **toutes** les microtâches en attente, y compris celles ajoutées pendant ce temps ;
3. dans un navigateur, mettre à jour l’affichage si nécessaire ;
4. recommencer.

L’exécution du script principal compte comme la première tâche. Relis l’exemple avec cette
règle : le script s’exécute en entier (1 et 2), puis les microtâches (3 puis 4, dans leur ordre
d’arrivée), et seulement ensuite la tâche suivante, le `setTimeout` (5).

:::note[Une règle à retenir]
Le code synchrone en cours se termine toujours en premier. Ensuite, **toutes** les microtâches
passent avant **la** tâche suivante. Les promesses passent donc avant les timers, quel que soit
le délai demandé.
:::

## Un exemple plus fin

```js
setTimeout(() => console.log('E. timeout 1'), 0);
setTimeout(() => {
  console.log('F. timeout 2');
  Promise.resolve().then(() => console.log('G. then dans timeout 2'));
}, 0);
setTimeout(() => console.log('H. timeout 3'), 0);

Promise.resolve()
  .then(() => {
    console.log('B. then 1');
    setTimeout(() => console.log('I. timeout ajouté par then 1'), 0);
  })
  .then(() => console.log('D. then 2 (chaîné)'));

Promise.resolve().then(() => console.log('C. autre then'));

console.log('A. synchrone');
```

Sortie :

```text
A. synchrone
B. then 1
C. autre then
D. then 2 (chaîné)
E. timeout 1
F. timeout 2
G. then dans timeout 2
H. timeout 3
I. timeout ajouté par then 1
```

Trace pas à pas :

1. **Script principal** : trois timers sont confiés à l’environnement ; deux callbacks de promesse
   (`then 1` et `autre then`) entrent dans la file des microtâches ; `A` s’affiche.
2. **Microtâches** : `B` s’exécute et programme un quatrième timer ; comme `then 1` est terminé,
   le `then` chaîné (`D`) entre dans la file des microtâches, **derrière** `C`. On affiche donc
   `C`, puis `D` : la file est vidée entièrement, même si elle s’allonge entre-temps.
3. **Tâche suivante**, le timer 1 : `E`. Pas de microtâche.
4. **Timer 2** : `F`, qui ajoute une microtâche. Avant de passer au timer 3, la boucle vide les
   microtâches : `G`.
5. **Timer 3** : `H`. Enfin le timer ajouté pendant l’étape 2 : `I`, arrivé en dernier dans la
   file des tâches.

## Bloquer la boucle

Puisqu’une tâche s’exécute jusqu’au bout, un calcul long **bloque tout** :

```js
const start = Date.now();

setTimeout(() => {
  console.log(`timeout exécuté après ${Date.now() - start} ms (demandé : 100 ms)`);
}, 100);

// Occupe la pile d’appels pendant environ 500 ms
while (Date.now() - start < 500) {
  // boucle active : rien d’autre ne peut s’exécuter pendant ce temps
}
console.log(`fin de la boucle après ${Date.now() - start} ms`);
```

Sortie (le second nombre varie de quelques millisecondes d’une exécution à l’autre) :

```text
fin de la boucle après 500 ms
timeout exécuté après 502 ms (demandé : 100 ms)
```

Le délai de `setTimeout` est un **minimum**, pas une garantie : le timer a expiré au bout de
100 ms, mais son callback a dû attendre dans la file que la pile se libère. Dans un navigateur,
pendant ces 500 ms, la page ne répond plus : ni clic, ni défilement, ni animation, car
l’affichage n’est mis à jour qu’entre deux tâches. Sur un serveur Node.js, **aucune autre
requête** n’est traitée pendant ce temps.

D’où une règle de conception : un callback doit être **court**. Les opérations longues
(réseau, disque, base de données) sont confiées à l’environnement de façon asynchrone ; seuls les
traitements rapides se font sur la pile.

## Une tâche ne garde pas sa pile

```js
function check() {
  console.log(new Error('trace').stack);
}

function schedule() {
  setTimeout(check, 0);
}

schedule();
console.log('schedule est terminée');
```

Sortie :

```text
schedule est terminée
Error: trace
    at Timeout.check [as _onTimeout] (…/stack2.js:2:15)
    at listOnTimeout (node:internal/timers:685:17)
    at process.processTimers (node:internal/timers:618:7)
```

Quand `check` s’exécute, `schedule` est terminée depuis longtemps : elle n’apparaît pas dans la
pile, seule la machinerie interne des timers de Node est en dessous. Conséquence importante : un
`try…catch` placé autour de `setTimeout` **ne peut pas** attraper une erreur levée plus tard dans
le callback, puisque ce `try` n’est plus sur la pile. La gestion des erreurs asynchrones demande
d’autres outils : les promesses.

## Les callbacks et leurs limites

Avant les promesses, on enchaînait les opérations asynchrones en passant des callbacks :

```js
function countdown(from, onDone) {
  if (from === 0) {
    onDone();
    return;
  }
  console.log(from);
  setTimeout(() => countdown(from - 1, onDone), 1000);
}

countdown(3, () => console.log('Partez !'));
console.log('Compte à rebours lancé');
```

Sortie, sur environ trois secondes :

```text
3
Compte à rebours lancé
2
1
Partez !
```

Ça fonctionne, mais imagine trois opérations qui dépendent l’une de l’autre, chacune pouvant
échouer : il faut imbriquer les callbacks, et prévoir un chemin d’erreur à chaque niveau. Le code
part en diagonale vers la droite (on parle de *callback hell*) et les erreurs se perdent
facilement. Les **promesses**, au programme de la leçon suivante, et la syntaxe `async`/`await`
résolvent ce problème ; elles s’appuient sur la file des microtâches que tu viens de découvrir.

## Pièges courants

1. **Croire que `setTimeout(fn, 0)` exécute `fn` tout de suite** : il passe après tout le code
   synchrone et après toutes les microtâches.
2. **Utiliser une valeur avant qu’elle existe** : une variable modifiée dans un callback
   asynchrone n’a pas encore sa nouvelle valeur à la ligne suivante (exercice 3).
3. **Bloquer la boucle** avec un calcul long ou une boucle d’attente active : l’interface gèle,
   le serveur ne répond plus.
4. **Entourer un `setTimeout` d’un `try…catch`** pour attraper une erreur de son callback : cela ne
   fonctionne pas.
5. **Confondre délai demandé et délai réel** : le délai est un minimum.

## Exercices

### Exercice 1 — Prédire l’ordre

Sans exécuter, écris l’ordre des lettres affichées, puis justifie chaque position. Vérifie
ensuite avec Node.js et dans la console du navigateur.

```js
console.log('A');
setTimeout(() => console.log('B'), 10);
setTimeout(() => console.log('C'), 0);
Promise.resolve()
  .then(() => console.log('D'))
  .then(() => console.log('E'));
queueMicrotask(() => console.log('F'));
console.log('G');
```

:::solution
```text
A
G
D
F
E
C
B
```

`A` et `G` sont synchrones. À la fin du script, la file des microtâches contient `D` puis `F`,
dans l’ordre où ils ont été ajoutés. Quand `D` se termine, le `then` chaîné `E` est ajouté
**derrière** `F`. Toutes les microtâches passent avant les timers. Parmi les timers, celui de
0 ms expire avant celui de 10 ms : `C`, puis `B`.
:::

### Exercice 2 — Pourquoi 0 ?

Ce code affiche `0`. Explique pourquoi, puis modifie-le pour afficher `42` en gardant le
`setTimeout`, à l’aide d’une fonction `computeLater(onResult)` qui reçoit un callback.

```js
let result = 0;
setTimeout(() => {
  result = 42;
}, 0);
console.log(result);
```

:::solution
`console.log(result)` fait partie du script principal : il s’exécute **avant** le callback du
timer, qui ne passera qu’une fois la pile vide. À ce moment-là, `result` vaut encore `0`.
Attendre « un peu » ne suffit pas : il faut que le code qui utilise le résultat s’exécute
**après** l’affectation, donc dans le callback, ou dans une fonction appelée par lui.

```js
function computeLater(onResult) {
  setTimeout(() => {
    onResult(42);
  }, 0);
}

computeLater((result) => {
  console.log(result);
});
```

Sortie :

```text
42
```

C’est le principe de tout code asynchrone : on ne **récupère** pas la valeur, on dit **quoi en
faire** quand elle sera prête. Les promesses formalisent exactement cela.
:::

### Exercice 3 — Le serveur qui ne répond plus

Un collègue a écrit, dans un serveur Node.js, une fonction qui « attend » 2 secondes avant de
répondre, pour simuler un service lent :

```js
function waitTwoSeconds() {
  const start = Date.now();
  while (Date.now() - start < 2000) {
    // on attend
  }
}
```

Explique pourquoi ce serveur, appelé par dix utilisateurs en même temps, mettra environ vingt
secondes à répondre au dernier, et comment il faudrait attendre à la place.

:::solution
La boucle `while` occupe la pile pendant 2 secondes. Pendant ce temps, la boucle d’événements ne
peut traiter aucune autre tâche : les requêtes des autres utilisateurs attendent dans la file. Les
dix requêtes sont donc traitées **l’une après l’autre**, 2 secondes chacune : le dernier
utilisateur attend environ 10 × 2 = 20 secondes.

Il faut attendre **sans occuper la pile**, en confiant le délai à l’environnement :
`setTimeout(() => repondre(), 2000)`. Pendant les 2 secondes, la pile est libre et les autres
requêtes sont traitées : les dix attentes se déroulent en parallèle et tous les utilisateurs
reçoivent leur réponse au bout d’environ 2 secondes. La leçon suivante écrira cette attente sous
forme de promesse : `await wait(2000)`.
:::

## Récapitulatif

- JavaScript exécute ton code sur un seul fil : une instruction à la fois, sur la **pile
  d’appels**.
- Les opérations longues (timers, réseau, fichiers, événements) sont confiées à l’environnement ;
  le code continue immédiatement.
- Une fois l’opération terminée, son callback attend dans une **file** : file des tâches (timers,
  événements, entrées-sorties) ou file des **microtâches** (promesses, `queueMicrotask`).
- La boucle d’événements exécute une tâche jusqu’au bout, puis **toutes** les microtâches, puis
  met à jour l’affichage, et recommence.
- Le délai de `setTimeout` est un minimum ; un calcul long bloque l’interface ou le serveur.
- Un callback exécuté plus tard n’a plus la pile de celui qui l’a programmé : un `try…catch`
  autour de `setTimeout` n’attrape pas ses erreurs.
