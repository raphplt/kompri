---
title: Fonctions pures, effets de bord et nommage
summary: Écrire des fonctions prévisibles et faciles à tester, isoler les effets de bord, et choisir des noms qui disent exactement ce que fait chaque fonction.
durationMinutes: 50
sources:
  - title: MDN — Fonctions (guide)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Functions
  - title: MDN — import
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/import
  - title: Node.js — Module assert
    url: https://nodejs.org/api/assert.html
---

## Deux fonctions, deux comportements

Compare ces deux fonctions qui ajoutent un article à un total :

```js
let cartTotal = 0;

function addToCart(price) {
  cartTotal += price;
  console.log(`Total : ${cartTotal} €`);
  return cartTotal;
}

function computeNewTotal(currentTotal, price) {
  return currentTotal + price;
}

console.log(addToCart(10)); // affiche aussi le total
console.log(addToCart(10));
console.log(computeNewTotal(0, 10));
console.log(computeNewTotal(0, 10));
```

```text
Total : 10 €
10
Total : 20 €
20
10
10
```

`addToCart(10)` renvoie 10, puis 20 : le résultat dépend de l’historique, et la fonction
modifie une variable extérieure et affiche quelque chose. `computeNewTotal(0, 10)`
renvoie toujours 10 et ne touche à rien d’autre. La seconde est une **fonction pure**.
Cette leçon explique pourquoi c’est précieux, et comment nommer tes fonctions pour
qu’on comprenne ce qu’elles font sans lire leur code.

## Qu’est-ce qu’une fonction pure ?

Une fonction est **pure** si elle respecte deux conditions :

1. **Même entrée, même sortie** : appelée avec les mêmes arguments, elle renvoie toujours
   le même résultat. Son résultat ne dépend que de ses paramètres.
2. **Aucun effet de bord** : elle ne modifie rien en dehors d’elle-même et n’interagit
   pas avec l’extérieur. Son seul effet est de renvoyer une valeur.

Un **effet de bord** (_side effect_) est tout ce qu’une fonction fait en plus de
renvoyer une valeur :

- afficher quelque chose (`console.log`, `console.error`) ;
- modifier une variable extérieure, ou un objet reçu en argument ;
- modifier `process.exitCode`, écrire un fichier, envoyer une requête réseau, modifier
  une page web, enregistrer en base de données.

Une fonction perd aussi la première propriété si elle lit une source qui change d’un
appel à l’autre : une variable extérieure modifiable, l’heure courante, un nombre
aléatoire (`Math.random()`), une saisie de l’utilisateur.

```js
// Pure : ne dépend que de ses paramètres, ne modifie rien
const computeAreaOfCircle = (radius) => Math.PI * radius ** 2;

// Impure : résultat différent à chaque appel
const rollDie = () => Math.floor(Math.random() * 6) + 1;

// Impure : effet de bord (affichage)
const logArea = (radius) => console.log(computeAreaOfCircle(radius));

console.log(computeAreaOfCircle(1)); // → 3.141592653589793
console.log(computeAreaOfCircle(1) === computeAreaOfCircle(1)); // → true
```

`Math.PI` et `Math.floor` ne posent pas de problème : la valeur de `Math.PI` ne change
jamais, et `Math.floor` est elle-même pure.

## Le piège de la modification d’un argument

Un effet de bord discret consiste à modifier un objet reçu en paramètre :

```js
function applyDiscount(product, rate) {
  product.price = product.price * (1 - rate);
  return product;
}

const teapot = { name: 'Théière', price: 40 };
const discountedTeapot = applyDiscount(teapot, 0.1);

console.log(discountedTeapot); // → { name: 'Théière', price: 36 }
console.log(teapot); // → { name: 'Théière', price: 36 }
```

L’appelant voulait obtenir une version remisée, mais l’objet **d’origine** a aussi été
modifié : le prix catalogue est perdu. Quand on passe un objet à une fonction, elle
reçoit l’accès au **même** objet, pas une copie. La compétence sur les tableaux et les
objets détaille ce mécanisme. La version pure crée un **nouvel** objet :

```js
function applyDiscount(product, rate) {
  return { name: product.name, price: product.price * (1 - rate) };
}

const teapot = { name: 'Théière', price: 40 };
const discountedTeapot = applyDiscount(teapot, 0.1);

console.log(discountedTeapot); // → { name: 'Théière', price: 36 }
console.log(teapot); // → { name: 'Théière', price: 40 }
```

Les nombres, chaînes et booléens, eux, ne posent pas ce problème : ils sont immuables,
et réaffecter un paramètre ne change pas la variable de l’appelant.

## Pourquoi préférer les fonctions pures ?

- **Prévisibles** : pour savoir ce que renvoie `computeNewTotal(20, 5)`, il suffit de
  lire la fonction. Pas besoin de connaître l’état du reste du programme.
- **Faciles à tester** : on vérifie qu’une entrée donne la sortie attendue, sans rien
  préparer ni nettoyer.
- **Réutilisables** : elles ne supposent rien sur l’endroit où on les appelle.
- **Sûres** : on peut les appeler une fois, dix fois ou pas du tout sans risque.
- **Faciles à tracer** : le tableau de trace se limite aux paramètres et aux variables
  locales.

Pour autant, un programme **sans** effet de bord ne sert à rien : il faut bien afficher
un résultat, écrire en base, répondre à une requête. L’objectif n’est pas de supprimer
les effets de bord, mais de les **isoler**.

### Un noyau pur, des bords impurs

La stratégie courante : écrire les calculs et les mises en forme dans des fonctions
pures, et regrouper les effets de bord (lecture des entrées, affichage, code de sortie)
dans une petite partie du programme, souvent à la fin du fichier. Exemple avec un
convertisseur en ligne de commande :

```js
// temperature.js — usage : node temperature.js <degrés Celsius>

// --- Noyau pur : calculs et mise en forme ---
function parseCelsius(input) {
  if (input === undefined || input.trim() === '') {
    throw new Error('Argument manquant');
  }
  const celsius = Number(input);
  if (Number.isNaN(celsius)) {
    throw new TypeError(`« ${input} » n’est pas un nombre`);
  }
  return celsius;
}

function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

function formatConversion(celsius) {
  const fahrenheit = celsiusToFahrenheit(celsius);
  return `${celsius} °C = ${Number(fahrenheit.toFixed(2))} °F`;
}

// --- Bord impur : entrées et sorties ---
try {
  const celsius = parseCelsius(process.argv[2]);
  console.log(formatConversion(celsius));
} catch (error) {
  console.error(`Erreur : ${error.message}`);
  process.exitCode = 1;
}
```

```bash
node temperature.js 21.5
node temperature.js abc
```

```text
21.5 °C = 70.7 °F
Erreur : « abc » n’est pas un nombre
```

`parseCelsius`, `celsiusToFahrenheit` et `formatConversion` sont pures : elles ne
lisent pas `process.argv`, n’affichent rien, ne touchent pas au code de sortie.
`parseCelsius` peut lancer une erreur : certains auteurs considèrent cela comme une
entorse à la pureté, mais l’erreur ne modifie rien à l’extérieur, elle remonte vers
l’appelant, qui décide quoi en faire. Seules les dernières lignes interagissent avec le
monde extérieur. `Number(fahrenheit.toFixed(2))` arrondit à deux décimales au plus, puis
reconvertit en nombre pour retirer les zéros inutiles.

### Vérifier une fonction pure en quelques lignes

Parce qu’une fonction pure ne dépend que de ses arguments, on peut la vérifier
automatiquement. Node.js fournit le module `node:assert`, qui lance une erreur si une
vérification échoue :

```js
// check-temperature.js
import assert from 'node:assert/strict';

function celsiusToFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

assert.equal(celsiusToFahrenheit(0), 32);
assert.equal(celsiusToFahrenheit(100), 212);
assert.equal(celsiusToFahrenheit(-40), -40);

console.log('Toutes les vérifications passent');
```

```text
Toutes les vérifications passent
```

`import` charge un module : c’est la syntaxe des modules ES, que Node.js reconnaît
automatiquement dans ce fichier. Si un résultat était faux, `assert.equal` lancerait une
`AssertionError` indiquant la valeur obtenue et la valeur attendue. Tu découvriras les
tests automatisés complets, avec `node:test`, dans une compétence ultérieure ; retiens
pour l’instant qu’une fonction pure se teste en une ligne par cas.

## Bien nommer ses fonctions

Un bon nom permet de comprendre **ce que fait** une fonction sans lire **comment** elle
le fait. C’est ce qui rend lisible un programme découpé en fonctions.

### Des verbes pour des actions

Une fonction **fait** quelque chose : son nom commence en général par un verbe. Voici
des conventions très répandues (en anglais, comme le code de ce parcours) :

| Préfixe                   | Sens habituel                                       | Exemples                           |
| ------------------------- | --------------------------------------------------- | ---------------------------------- |
| `compute`, `calculate`    | calcule une valeur                                  | `computeTotal`, `calculateVat`     |
| `format`                  | transforme une valeur en texte à afficher           | `formatPrice`, `formatDate`        |
| `parse`                   | transforme un texte en valeur exploitable           | `parseCelsius`, `parseQuantity`    |
| `is`, `has`, `can`        | renvoie un booléen (prédicat)                       | `isValidEmail`, `hasDiscount`      |
| `create`, `make`          | fabrique et renvoie une nouvelle valeur ou fonction | `createCounter`, `createValidator` |
| `get`                     | renvoie une valeur sans calcul lourd                | `getShippingCost`                  |
| `log`, `print`, `display` | **effet de bord** : affiche                         | `logReport`, `printReceipt`        |
| `save`, `send`, `update`  | **effet de bord** : modifie l’extérieur             | `saveOrder`, `sendEmail`           |

Ces conventions ne sont pas des règles du langage, mais elles créent une attente chez le
lecteur. Un `computeTotal` qui affiche quelque chose, ou un `isValid` qui renvoie un
message au lieu d’un booléen, **trompent** le lecteur : c’est pire qu’un nom vague.

### Quelques règles pratiques

- **Le nom dit ce que renvoie ou fait la fonction**, pas comment : `findCheapestProduct`
  plutôt que `loopOverProducts`.
- **Évite les noms vagues** : `handle`, `process`, `doStuff`, `data`, `manage`, `temp`
  ne disent rien.
- **Si le nom contient « et »**, la fonction fait sans doute deux choses :
  `validateAndSaveOrder` gagnerait à devenir `validateOrder` et `saveOrder`.
- **Nomme aussi les paramètres** : `computeTotal(unitPrice, quantity)` se comprend,
  `computeTotal(a, b)` non. Précise l’unité si elle compte : `delayInMilliseconds`.
- **Garde un vocabulaire cohérent** : si tu utilises `compute` dans un fichier, n’utilise
  pas aussi `calc` et `get` pour la même idée.
- **Une fonction courte et un nom précis valent mieux qu’un commentaire** : si tu dois
  commenter ce que fait un bloc, c’est souvent le signe qu’il mérite une fonction
  nommée.

Exemple de renommage :

```js
// Avant : noms vagues, un nom qui ment
function process(d) {
  return d * 1.2;
}

function check(s) {
  console.log(s.length >= 8);
}

// Après : le nom dit ce que fait la fonction, les paramètres sont explicites
function computePriceIncludingTax(priceExcludingTax) {
  return priceExcludingTax * 1.2;
}

function isLongEnough(password) {
  return password.length >= 8;
}

console.log(computePriceIncludingTax(10)); // → 12
console.log(isLongEnough('kompri2026')); // → true
```

`check` affichait le résultat au lieu de le renvoyer : impossible de l’utiliser dans une
condition. `isLongEnough` renvoie un booléen, comme son préfixe l’annonce.

## Pièges fréquents

- **Effet de bord caché** dans une fonction au nom innocent (`getTotal` qui modifie une
  variable globale ou affiche). Correction : séparer le calcul de l’effet, ou nommer
  l’effet.
- **Modifier un objet reçu en argument** : l’appelant voit son objet changer.
  Correction : renvoyer un nouvel objet.
- **Lire l’extérieur dans le calcul** (`process.argv`, `Math.random()`, l’heure) :
  résultat imprévisible et difficile à tester. Correction : passer la valeur en
  paramètre.
- **Noms qui mentent** : un `is...` qui ne renvoie pas un booléen, un `compute...` qui
  affiche.
- **Fonctions fourre-tout** : une fonction de cinquante lignes qui lit, calcule, formate
  et affiche. Correction : découper en fonctions pures et garder les effets au bord.

## Exercices

### Exercice 1 — Pure ou impure ?

Pour chaque fonction, dis si elle est pure, et sinon, pourquoi.

```js
let taxRate = 0.2;

const addTax = (price) => price * (1 + taxRate);
const addTaxWithRate = (price, rate) => price * (1 + rate);
const greet = (name) => `Bonjour ${name}`;
const greetAndLog = (name) => console.log(`Bonjour ${name}`);
const pickWinner = (count) => Math.floor(Math.random() * count);
const toUpperName = (user) => {
  user.name = user.name.toUpperCase();
  return user;
};
const getInitial = (name) => name[0].toUpperCase();
```

:::solution

- `addTax` : **impure**, elle lit `taxRate`, une variable `let` extérieure qui peut
  changer ; le même appel peut donner deux résultats différents.
- `addTaxWithRate` : **pure**, tout ce dont elle a besoin est en paramètre.
- `greet` : **pure**.
- `greetAndLog` : **impure**, effet de bord (affichage), et elle renvoie `undefined`.
- `pickWinner` : **impure**, `Math.random()` donne un résultat différent à chaque appel.
- `toUpperName` : **impure**, elle modifie l’objet reçu en argument.
- `getInitial` : **pure** (elle lance une erreur si `name` est vide ou absent, mais ne
  modifie rien et renvoie toujours la même chose pour le même argument).

Pour rendre `addTax` pure, on passe le taux en paramètre : c’est `addTaxWithRate`. Si
`taxRate` était une `const`, `addTax` se comporterait comme une fonction pure, car la
valeur lue ne pourrait plus changer.

:::

### Exercice 2 — Séparer le calcul de l’affichage

Cette fonction calcule et affiche le prix moyen d’un panier, et modifie une variable
globale. Réécris-la en une fonction pure `computeAveragePrice(...prices)` qui renvoie
`null` sans prix, et une partie impure qui affiche le résultat. Vérifie la fonction pure
avec `node:assert`.

```js
let lastAverage;

function showAverage(prices) {
  let total = 0;
  for (const price of prices) {
    total += price;
  }
  lastAverage = total / prices.length;
  console.log(`Prix moyen : ${lastAverage.toFixed(2)} €`);
}
```

:::solution

```js
import assert from 'node:assert/strict';

// Pure : calcule et renvoie, ne touche à rien d’autre
function computeAveragePrice(...prices) {
  if (prices.length === 0) {
    return null;
  }
  let total = 0;
  for (const price of prices) {
    total += price;
  }
  return total / prices.length;
}

// Pure : met en forme
function formatAverage(average) {
  return average === null
    ? 'Aucun prix'
    : `Prix moyen : ${average.toFixed(2)} €`;
}

assert.equal(computeAveragePrice(10, 20), 15);
assert.equal(computeAveragePrice(), null);
assert.equal(formatAverage(null), 'Aucun prix');

// Bord impur : l’affichage
console.log(formatAverage(computeAveragePrice(4.5, 3, 12)));
```

```text
Prix moyen : 6.50 €
```

La variable globale `lastAverage` disparaît : la valeur est renvoyée, et l’appelant la
range où il veut. Le cas « aucun prix », qui donnait `NaN` dans la version d’origine,
est traité explicitement. La mise en forme est elle aussi isolée dans une fonction pure,
vérifiable sans rien afficher.

:::

### Exercice 3 — Renommer

Propose un meilleur nom pour chaque fonction et pour ses paramètres, et explique ton
choix. Une des fonctions mérite d’être découpée.

```js
function data(x) {
  return x.trim().toLowerCase();
}

function f(a, b) {
  return a.length >= b;
}

function doIt(price, qty) {
  const total = price * qty;
  console.log(`Total : ${total.toFixed(2)} €`);
  return total;
}
```

:::solution

- `data(x)` devient `normalizeEmail(rawEmail)` (ou `normalizeText(text)` si elle sert à
  autre chose) : elle **normalise** un texte, le verbe le dit.
- `f(a, b)` devient `hasMinimumLength(text, minimumLength)` : elle renvoie un booléen,
  donc un préfixe `has` ou `is`.
- `doIt` fait deux choses : calculer et afficher. On la découpe :

```js
function computeLineTotal(unitPrice, quantity) {
  return unitPrice * quantity;
}

function formatTotal(total) {
  return `Total : ${total.toFixed(2)} €`;
}

const lineTotal = computeLineTotal(2.5, 3);
console.log(formatTotal(lineTotal));
```

```text
Total : 7.50 €
```

`computeLineTotal` et `formatTotal` sont pures et réutilisables ; l’affichage reste
dans le code appelant. Le paramètre `qty` devient `quantity` : les abréviations
obligent le lecteur à deviner.

:::

## Récapitulatif

- Une fonction pure renvoie toujours le même résultat pour les mêmes arguments et n’a
  aucun effet de bord.
- Effets de bord : affichage, modification d’une variable extérieure ou d’un objet reçu,
  code de sortie, fichiers, réseau. Lire l’heure, le hasard ou une variable modifiable
  rend aussi le résultat imprévisible.
- Les fonctions pures sont prévisibles, testables en une ligne avec `node:assert`,
  réutilisables et faciles à tracer.
- Isole les effets de bord au bord du programme ; garde les calculs et la mise en forme
  dans des fonctions pures.
- Ne modifie pas les objets reçus en argument : renvoie un nouvel objet.
- Nomme une fonction par un verbe qui dit ce qu’elle fait (`compute`, `format`, `parse`,
  `create`), un prédicat par `is`, `has` ou `can`, et ne laisse jamais un nom mentir.
