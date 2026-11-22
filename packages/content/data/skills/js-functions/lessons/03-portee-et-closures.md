---
title: Portée lexicale et fermetures (closures)
summary: Savoir quelles variables une fonction peut lire, et comprendre comment une fonction se souvient de l’environnement où elle a été créée.
durationMinutes: 60
sources:
  - title: MDN — Fonctions (guide), portée et fermetures
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Functions
  - title: MDN — Closures (fermetures)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Closures
  - title: MDN — Portée (glossaire)
    url: https://developer.mozilla.org/fr/docs/Glossary/Scope
---

## Qui voit quoi ?

Dès qu’un programme contient plusieurs fonctions, une question se pose : une fonction
peut-elle lire une variable déclarée ailleurs ? Peut-elle la modifier ? Que devient une
variable locale quand la fonction se termine ? Les réponses à ces questions forment les
règles de **portée** (_scope_).

Ces règles semblent théoriques, mais elles expliquent des bugs très concrets (une
variable modifiée « à distance », un compteur partagé par erreur) et une technique
puissante, la **fermeture** (_closure_), utilisée partout en JavaScript : dans les
gestionnaires d’événements d’une page web, dans les serveurs, dans les bibliothèques.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## La portée d’une fonction

Chaque appel de fonction crée sa propre **portée locale**. Les paramètres et les
variables déclarées dans le corps n’existent qu’à l’intérieur :

```js
function computeTotal(price, quantity) {
  const total = price * quantity;
  return total;
}

console.log(computeTotal(4, 3)); // → 12
console.log(typeof total); // → undefined
console.log(typeof price); // → undefined
```

`total`, `price` et `quantity` sont **locales** à `computeTotal`. À l’extérieur, ces noms
n’existent pas (`typeof` renvoie `'undefined'` pour un nom inconnu, sans erreur ; lire
directement `total` provoquerait une `ReferenceError`). Après l’appel, ces variables
disparaissent : chaque nouvel appel repart de zéro, avec des variables neuves.

C’est une excellente chose : deux fonctions peuvent utiliser le même nom `total` sans
interférer, et tu peux lire une fonction sans te soucier des noms utilisés ailleurs.

## La portée lexicale

À l’inverse, une fonction **peut lire** les variables des portées qui l’entourent :

```js
const vatRate = 0.2;

function computePriceIncludingTax(price) {
  return price * (1 + vatRate); // vatRate est lue dans la portée englobante
}

console.log(computePriceIncludingTax(50)); // → 60
```

Quand JavaScript rencontre un nom, il le cherche d’abord dans la portée locale, puis dans
la portée qui l’entoure, et ainsi de suite jusqu’à la portée la plus extérieure (celle du
fichier). C’est la **chaîne des portées**. Si le nom n’est trouvé nulle part :
`ReferenceError`.

Le point essentiel est le mot **lexicale** : ce qui compte, c’est l’endroit où la
fonction est **écrite** dans le code, pas l’endroit d’où elle est **appelée**.

```js
const label = 'global';

function showLabel() {
  return label;
}

function callFromElsewhere() {
  const label = 'local à callFromElsewhere';
  return showLabel();
}

console.log(callFromElsewhere()); // → global
```

`showLabel` est écrite au niveau du fichier : elle voit le `label` du fichier. Qu’elle
soit appelée depuis `callFromElsewhere`, qui possède son propre `label`, ne change rien.
Pour savoir ce qu’une fonction peut lire, il suffit donc de **regarder où elle est
écrite** et de remonter les accolades qui l’entourent.

### Les portées imbriquées

Les blocs (`if`, boucles) et les fonctions s’emboîtent comme des poupées russes :

```js
const shopName = 'Kompri Café';

function buildReceipt(items) {
  let total = 0;
  for (const item of items) {
    const lineTotal = item.price * item.quantity;
    total += lineTotal;
  }
  return `${shopName} — total : ${total} €`;
}

console.log(
  buildReceipt([
    { price: 2, quantity: 3 },
    { price: 1.5, quantity: 2 },
  ]),
);
```

```text
Kompri Café — total : 9 €
```

- `lineTotal` et `item` n’existent que dans le bloc de la boucle ;
- `total` et `items` existent dans toute la fonction, y compris dans la boucle ;
- `shopName` est visible partout, y compris dans la fonction.

### Le masquage

Une variable locale peut porter le même nom qu’une variable extérieure : elle la
**masque** dans sa portée.

```js
const discount = 0.1;

function applyStudentDiscount(price) {
  const discount = 0.25; // masque la constante extérieure
  return price * (1 - discount);
}

console.log(applyStudentDiscount(20)); // → 15
console.log(discount); // → 0.1
```

C’est permis, mais cela trompe le lecteur, qui peut croire que la fonction utilise le
taux extérieur. Préfère des noms distincts (`studentDiscountRate`).

## Lire n’est pas modifier

Une fonction peut aussi **réaffecter** une variable `let` d’une portée extérieure. C’est
légal, mais dangereux :

```js
let total = 0;

function addToTotal(amount) {
  total += amount; // modifie une variable extérieure
  return total;
}

console.log(addToTotal(10)); // → 10
console.log(addToTotal(10)); // → 20
console.log(total); // → 20
```

Le même appel `addToTotal(10)` renvoie 10, puis 20 : le résultat dépend de l’historique
des appels, et n’importe quelle autre partie du programme peut modifier `total`. Ce genre
de variable partagée est une source majeure de bugs. La dernière leçon de cette
compétence montre comment l’éviter avec des fonctions pures. Les fermetures, elles,
permettent de garder un état **sans** l’exposer à tout le fichier.

## Les fermetures (closures)

### Une fonction qui se souvient

Une fonction peut créer et renvoyer une autre fonction. Observe :

```js
function createCounter() {
  let count = 0;

  return function increment() {
    count++;
    return count;
  };
}

const counter = createCounter();

console.log(counter()); // → 1
console.log(counter()); // → 2
console.log(counter()); // → 3
```

C’est surprenant : `createCounter` a fini de s’exécuter dès la ligne
`const counter = createCounter();`. Sa variable locale `count` aurait dû disparaître. Et
pourtant, `counter()` continue de la lire et de l’incrémenter.

Explication : la fonction `increment` a été **créée à l’intérieur** de `createCounter`.
Par la portée lexicale, elle a accès à `count`. Tant que `increment` existe (ici, rangée
dans `counter`), JavaScript **conserve** les variables dont elle a besoin. Une fonction
accompagnée de l’environnement où elle a été créée s’appelle une **fermeture** (_closure_).

Formulé simplement : **une fonction se souvient des variables de l’endroit où elle est
née**, même après que cet endroit a fini de s’exécuter.

### Chaque appel crée un environnement neuf

```js
function createCounter() {
  let count = 0;
  return () => {
    count++;
    return count;
  };
}

const visitsCounter = createCounter();
const clicksCounter = createCounter();

console.log(visitsCounter()); // → 1
console.log(visitsCounter()); // → 2
console.log(clicksCounter()); // → 1
console.log(visitsCounter()); // → 3
```

Chaque appel de `createCounter` crée **sa propre** variable `count`. Les deux compteurs
sont totalement indépendants. Et personne d’autre ne peut modifier `count` : la seule
façon d’y toucher est d’appeler le compteur. C’est un **état privé**, impossible à
obtenir avec une variable `let` au niveau du fichier.

Pour bien visualiser, trace les environnements :

| Instruction                 | `count` de `visitsCounter` | `count` de `clicksCounter` | Affichage |
| --------------------------- | -------------------------- | -------------------------- | --------- |
| création des deux compteurs | 0                          | 0                          |           |
| `visitsCounter()`           | 1                          | 0                          | 1         |
| `visitsCounter()`           | 2                          | 0                          | 2         |
| `clicksCounter()`           | 2                          | 1                          | 1         |
| `visitsCounter()`           | 3                          | 1                          | 3         |

### Les fabriques de fonctions

Une fonction qui fabrique et renvoie des fonctions configurées s’appelle une **fabrique**
(_factory_). Les paramètres de la fabrique sont mémorisés par la fermeture :

```js
function createMultiplier(factor) {
  return (value) => value * factor;
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(10)); // → 20
console.log(triple(10)); // → 30
```

`double` se souvient de `factor = 2`, `triple` de `factor = 3`. Exemple plus concret :
fabriquer des formateurs de prix pour plusieurs devises.

```js
function createPriceFormatter(currencySymbol, decimalSeparator = ',') {
  return (amount) =>
    `${amount.toFixed(2).replace('.', decimalSeparator)} ${currencySymbol}`;
}

const formatEuros = createPriceFormatter('€');
const formatDollars = createPriceFormatter('$', '.');

console.log(formatEuros(12.5)); // → 12,50 €
console.log(formatDollars(12.5)); // → 12.50 $
```

On configure une fois, on utilise partout. Le code qui appelle `formatEuros` n’a plus
besoin de connaître le séparateur ni le symbole.

Une fabrique peut aussi garder un état et le combiner avec une configuration :

```js
function createIdGenerator(prefix) {
  let lastNumber = 0;
  return () => {
    lastNumber++;
    return `${prefix}-${String(lastNumber).padStart(4, '0')}`;
  };
}

const nextOrderId = createIdGenerator('CMD');
const nextInvoiceId = createIdGenerator('FAC');

console.log(nextOrderId()); // → CMD-0001
console.log(nextOrderId()); // → CMD-0002
console.log(nextInvoiceId()); // → FAC-0001
```

### Fermetures et boucles

Les fermetures expliquent aussi un comportement célèbre des boucles. `setTimeout(fonction,
délai)` demande à JavaScript d’exécuter une fonction **plus tard**, après un délai en
millisecondes ; le reste du programme continue sans attendre.

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(`let : ${i}`), 0);
}

console.log('Fin de la boucle');
```

```text
Fin de la boucle
let : 0
let : 1
let : 2
```

Même avec un délai de 0, les fonctions s’exécutent **après** la fin du code en cours,
d’où « Fin de la boucle » en premier. Au moment où elles s’exécutent, la boucle est
terminée. Pourtant chacune affiche une valeur différente : avec `let`, **chaque
itération crée un nouveau `i`**, et chaque fonction fléchée se souvient du sien.

Avec l’ancien `var`, il n’existe qu’**une seule** variable pour toute la boucle : les
trois fonctions se souviennent de la même, qui vaut 3 à la fin. Elles affichent toutes
`3`. C’est l’une des raisons historiques qui ont conduit à introduire `let`.

## Pièges fréquents

- **Croire qu’une fonction voit les variables de son appelant** : la portée est
  lexicale, seul l’endroit où la fonction est écrite compte.
- **Variable d’état au mauvais endroit** : un `let count = 0` placé **hors** de la
  fabrique est partagé par tous les compteurs. Il doit être déclaré **dans** la fabrique.
- **Masquer une variable extérieure** par une locale de même nom : confusion assurée.
- **Modifier une variable extérieure depuis une fonction** : résultats qui dépendent de
  l’historique, bugs difficiles à trouver.
- **Oublier d’appeler la fabrique** : `const counter = createCounter;` range la fabrique
  elle-même ; `counter()` renverrait alors une nouvelle fonction, pas un nombre.

## Exercices

### Exercice 1 — Prévoir la portée

Prévois ce qu’affiche ce code, ligne par ligne, puis vérifie.

```js
const level = 'fichier';

function outer() {
  const level = 'outer';

  function inner() {
    return level;
  }

  return inner();
}

function standalone() {
  return level;
}

function caller() {
  const level = 'caller';
  return standalone();
}

console.log(outer());
console.log(caller());
console.log(level);
```

:::solution

```text
outer
fichier
fichier
```

- `inner` est écrite dans `outer` : elle trouve le `level` de `outer` en remontant d’une
  portée.
- `standalone` est écrite au niveau du fichier : elle voit le `level` du fichier, même
  appelée depuis `caller`. C’est la portée **lexicale**.
- Au niveau du fichier, seul le `level` du fichier est visible : les deux autres sont
  locaux à leurs fonctions.

:::

### Exercice 2 — Le compteur partagé par erreur

Ce code veut deux compteurs indépendants, mais le second affiche 3 au lieu de 1.
Explique et corrige.

```js
let count = 0;

function createCounter() {
  return () => {
    count++;
    return count;
  };
}

const first = createCounter();
const second = createCounter();

console.log(first(), first(), second());
```

:::solution
`count` est déclarée **hors** de `createCounter` : il n’en existe qu’une, partagée par
toutes les fonctions créées. Les deux compteurs incrémentent la même variable, d’où
`1 2 3`. Correction : déclarer `count` **dans** la fabrique, pour que chaque appel crée
son propre environnement.

```js
function createCounter() {
  let count = 0;
  return () => {
    count++;
    return count;
  };
}

const first = createCounter();
const second = createCounter();

console.log(first(), first(), second());
```

```text
1 2 1
```

En prime, `count` n’est plus accessible depuis le reste du fichier : l’état est privé.

:::

### Exercice 3 — La fabrique de validateurs

Écris `createLengthValidator(min, max)` qui renvoie une fonction. Cette fonction reçoit un
texte et renvoie `true` si sa longueur (après `trim`) est comprise entre `min` et `max`
inclus, `false` sinon. Crée un validateur de pseudo (3 à 12 caractères) et un validateur
de code postal (5 à 5), puis teste-les.

:::solution

```js
function createLengthValidator(min, max) {
  return (text) => {
    const length = text.trim().length;
    return length >= min && length <= max;
  };
}

const isValidNickname = createLengthValidator(3, 12);
const isValidPostalCode = createLengthValidator(5, 5);

console.log(isValidNickname('Al')); // false : 2 caractères
console.log(isValidNickname('  Alice  ')); // true : 5 caractères après trim
console.log(isValidPostalCode('29200')); // true
console.log(isValidPostalCode('2920')); // false
```

```text
false
true
true
false
```

Chaque validateur est une fermeture qui se souvient de son `min` et de son `max`. Les
noms commencent par `is` car les fonctions renvoient un booléen. Un vrai validateur de
code postal vérifierait aussi qu’il ne contient que des chiffres : la longueur ne suffit
pas.

:::

## Récapitulatif

- Chaque appel de fonction a sa portée locale : paramètres et variables internes sont
  invisibles de l’extérieur et recréés à chaque appel.
- Une fonction lit les variables des portées qui l’entourent **là où elle est écrite** :
  c’est la portée lexicale. L’endroit de l’appel ne compte pas.
- Modifier une variable extérieure depuis une fonction est possible mais rend le code
  imprévisible.
- Une fermeture (closure) est une fonction qui se souvient de l’environnement où elle a
  été créée, même après la fin de la fonction qui l’a créée.
- Chaque appel d’une fabrique crée un environnement neuf : compteurs indépendants, état
  privé, fonctions configurées (`createMultiplier`, `createPriceFormatter`).
- Avec `let`, chaque itération de boucle a sa propre variable, que les fermetures
  mémorisent séparément.
