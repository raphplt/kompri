---
title: Passer des fonctions en argument et fonctions d’ordre supérieur
summary: Traiter les fonctions comme des valeurs, les passer en argument (callbacks), en renvoyer, et écrire ses propres fonctions d’ordre supérieur.
durationMinutes: 55
sources:
  - title: MDN — Fonctions (guide)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Functions
  - title: MDN — Fonction de rappel (callback)
    url: https://developer.mozilla.org/fr/docs/Glossary/Callback_function
  - title: MDN — Fonction de première classe
    url: https://developer.mozilla.org/fr/docs/Glossary/First-class_Function
---

## Des fonctions qui ne diffèrent que par un détail

Voici deux fonctions qui comptent des caractères dans un texte :

```js
function countDigits(text) {
  let count = 0;
  for (const character of text) {
    if (character >= '0' && character <= '9') {
      count++;
    }
  }
  return count;
}

function countSpaces(text) {
  let count = 0;
  for (const character of text) {
    if (character === ' ') {
      count++;
    }
  }
  return count;
}

console.log(countDigits('Rendez-vous le 12 à 14 h')); // → 4
console.log(countSpaces('Rendez-vous le 12 à 14 h')); // → 5
```

Elles sont identiques, sauf **le test** au cœur de la boucle. Si demain il faut compter
les majuscules, les voyelles, la ponctuation, on recopiera encore la même boucle. Ce
serait bien de pouvoir écrire la boucle une seule fois et de lui **passer le test en
paramètre**. C’est exactement ce que permettent les **fonctions d’ordre supérieur**.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## Les fonctions sont des valeurs

En JavaScript, une fonction est une valeur comme une autre. On dit que les fonctions
sont des **citoyennes de première classe** : on peut les ranger dans une variable, les
passer en argument, les renvoyer depuis une autre fonction.

```js
function shout(text) {
  return `${text.toUpperCase()} !`;
}

const transform = shout; // pas de parenthèses : on copie la fonction, on ne l’appelle pas

console.log(transform('attention')); // → ATTENTION !
console.log(transform === shout); // → true
```

`transform` et `shout` désignent **la même fonction**. Rappelle-toi la distinction de la
première leçon : `shout` est la fonction, `shout('...')` est le résultat de son appel.

## Passer une fonction en argument : les callbacks

Réécrivons le compteur de caractères avec un paramètre qui **est une fonction** :

```js
function countMatching(text, isMatching) {
  let count = 0;
  for (const character of text) {
    if (isMatching(character)) {
      count++;
    }
  }
  return count;
}

function isDigit(character) {
  return character >= '0' && character <= '9';
}

function isSpace(character) {
  return character === ' ';
}

const sentence = 'Rendez-vous le 12 à 14 h';

console.log(countMatching(sentence, isDigit)); // → 4
console.log(countMatching(sentence, isSpace)); // → 5
```

`countMatching` ne sait pas **quoi** compter : elle sait seulement **comment** parcourir
un texte et compter. Le « quoi » lui est fourni sous la forme d’une fonction, appelée
pour chaque caractère. Une fonction passée en argument pour être appelée par une autre
s’appelle une **fonction de rappel** (_callback_). Une fonction qui reçoit ou renvoie
une fonction s’appelle une **fonction d’ordre supérieur** (_higher-order function_).

Une fonction qui renvoie un booléen, comme `isDigit`, s’appelle aussi un **prédicat**.

### Callbacks fléchés en ligne

Pour un test court utilisé une seule fois, inutile de déclarer une fonction nommée : on
écrit une fonction fléchée directement dans l’appel.

```js
function countMatching(text, isMatching) {
  let count = 0;
  for (const character of text) {
    if (isMatching(character)) {
      count++;
    }
  }
  return count;
}

const sentence = 'Rendez-vous le 12 à 14 h';

console.log(countMatching(sentence, (character) => character === 'e')); // → 3
console.log(
  countMatching(sentence, (character) => 'aeiouyàé'.includes(character)),
); // → 6
```

C’est l’usage le plus courant des fonctions fléchées. Si le callback grossit ou sert à
plusieurs endroits, donne-lui un nom : le code se lira mieux.

### Le piège : appeler au lieu de passer

```js
function repeat(times, action) {
  for (let i = 1; i <= times; i++) {
    action(i);
  }
}

function sayHello() {
  console.log('Bonjour');
}

repeat(2, sayHello());
```

```text
Bonjour
TypeError: action is not a function
```

`sayHello()` **appelle** immédiatement la fonction (d’où le « Bonjour » affiché une seule
fois), et c’est son **résultat**, `undefined`, qui est passé à `repeat`. Quand `repeat`
essaie d’appeler `action(i)`, `action` vaut `undefined`. Correction : passer la fonction
sans parenthèses, `repeat(2, sayHello)`.

### Qui fournit les arguments du callback ?

C’est la fonction d’ordre supérieur qui **appelle** le callback, donc c’est elle qui
choisit les arguments transmis. Le callback doit déclarer des paramètres qui
correspondent :

```js
function repeat(times, action) {
  for (let i = 1; i <= times; i++) {
    action(i, times); // repeat transmet le numéro du tour et le total
  }
}

repeat(3, (round, total) => console.log(`Tour ${round} sur ${total}`));
```

```text
Tour 1 sur 3
Tour 2 sur 3
Tour 3 sur 3
```

Le callback est libre de déclarer moins de paramètres que ce qui est transmis (les
arguments en trop sont ignorés). Pour savoir ce que reçoit un callback, il faut donc lire
la documentation ou le code de la fonction qui l’appelle.

## Écrire ses propres fonctions d’ordre supérieur

Les fonctions d’ordre supérieur permettent de séparer **le parcours** (toujours le même)
de **l’action** (qui varie). Deux exemples très utiles sur des listes.

### Trouver le premier élément qui convient

```js
function findFirst(values, isMatching) {
  for (const value of values) {
    if (isMatching(value)) {
      return value; // retour anticipé : on arrête au premier trouvé
    }
  }
  return undefined; // rien trouvé
}

const temperatures = [12, 18, 31, 25, 33];

console.log(findFirst(temperatures, (temperature) => temperature > 30)); // → 31
console.log(findFirst(temperatures, (temperature) => temperature < 0)); // → undefined
```

Le `return` dans la boucle remplace le `break` : il arrête la boucle **et** la fonction.

### Additionner selon une règle

```js
function sumBy(items, getAmount) {
  let total = 0;
  for (const item of items) {
    total += getAmount(item);
  }
  return total;
}

const cart = [
  { label: 'Thé', price: 6.5, quantity: 2 },
  { label: 'Tasse', price: 8, quantity: 1 },
];

console.log(sumBy(cart, (item) => item.price * item.quantity)); // → 21
console.log(sumBy(cart, (item) => item.quantity)); // → 3
```

La même fonction calcule le montant du panier et le nombre d’articles : seul le
callback change.

:::note[Les méthodes de tableaux]
Les tableaux de JavaScript possèdent déjà des fonctions d’ordre supérieur prêtes à
l’emploi, que tu étudieras dans la compétence sur les tableaux et les objets.
`findFirst` ressemble à la méthode `find`, et `sumBy` à ce qu’on fait avec `reduce`. Par
exemple, `[4, 9, 2].find((value) => value > 5)` vaut `9`, et
`[1, 2, 3].map((value) => value * 2)` produit le tableau `[ 2, 4, 6 ]`. Comprendre
comment écrire `findFirst` toi-même te permettra de comprendre ces méthodes au lieu de
les apprendre par cœur.

:::

## Renvoyer une fonction

Une fonction d’ordre supérieur peut aussi **renvoyer** une fonction. Tu l’as vu avec les
fabriques de la leçon précédente (`createMultiplier`, `createCounter`). Combinées aux
callbacks, elles permettent de **fabriquer des prédicats** :

```js
function countMatching(text, isMatching) {
  let count = 0;
  for (const character of text) {
    if (isMatching(character)) {
      count++;
    }
  }
  return count;
}

function createCharacterTest(allowedCharacters) {
  return (character) => allowedCharacters.includes(character);
}

const isVowel = createCharacterTest('aeiouyàâéèêëîïôùû');
const isPunctuation = createCharacterTest('.,;:!?');

const message = 'Attention : départ à 9 h, pas avant !';
console.log(countMatching(message, isVowel)); // → 9
console.log(countMatching(message, isPunctuation)); // → 3
```

Le `A` majuscule de « Attention » n’est pas compté : la liste ne contient que des
minuscules. Pour ignorer la casse, il faudrait passer `character.toLowerCase()` au test.

### Composer et envelopper des fonctions

Puisqu’une fonction peut en recevoir et en renvoyer, on peut **assembler** des fonctions
existantes pour en créer de nouvelles, sans modifier les originales :

```js
function compose(first, second) {
  return (value) => second(first(value));
}

const trimText = (text) => text.trim();
const capitalize = (text) =>
  text[0].toUpperCase() + text.slice(1).toLowerCase();

const normalizeName = compose(trimText, capitalize);

console.log(normalizeName('   aDA  ')); // → Ada
```

`compose` renvoie une fonction qui applique `first`, puis `second` au résultat. Autre
technique fréquente : **envelopper** une fonction pour lui ajouter un comportement, ici
un affichage de contrôle :

```js
function withLogging(name, fn) {
  return (value) => {
    const result = fn(value);
    console.log(`${name}(${value}) → ${result}`);
    return result;
  };
}

const double = (value) => value * 2;
const loggedDouble = withLogging('double', double);

const answer = loggedDouble(21);
console.log(answer + 1);
```

```text
double(21) → 42
43
```

`loggedDouble` se comporte comme `double` (elle renvoie le même résultat), mais affiche
chaque appel. On a ajouté une fonctionnalité sans toucher à `double`.

## Un callback appelé plus tard

Certaines fonctions d’ordre supérieur n’appellent pas le callback tout de suite.
`setTimeout(callback, delayInMilliseconds)` l’appelle **après** un délai, pendant que le
reste du programme continue :

```js
console.log('Commande envoyée');

setTimeout(() => {
  console.log('Confirmation reçue');
}, 500);

console.log('En attente de confirmation…');
```

```text
Commande envoyée
En attente de confirmation…
Confirmation reçue
```

Le troisième message s’affiche une demi-seconde après les deux autres. Ce mécanisme de
callback « différé » est à la base de la programmation **asynchrone** en JavaScript :
réagir à un clic dans une page, à la réponse d’un serveur, à la fin de la lecture d’un
fichier. Tu y reviendras avec Node.js et le DOM.

## Pièges fréquents

- **Appeler au lieu de passer** : `repeat(2, sayHello())` passe `undefined`. Correction :
  `repeat(2, sayHello)`.
- **Callback fléché avec accolades sans `return`** : `(value) => { value > 3; }`
  renvoie `undefined`, donc toujours « faux » pour un prédicat.
- **Mauvais ordre des paramètres du callback** : c’est la fonction appelante qui fixe
  l’ordre ; lis son code ou sa documentation.
- **Callbacks anonymes trop longs** : au-delà de quelques lignes, nomme-les.
- **Empiler les couches** : composer trois fonctions est élégant, en composer dix rend le
  code illisible.

## Exercices

### Exercice 1 — Appliquer plusieurs fois

Écris `applyTimes(fn, times, initialValue)` qui applique `fn` à `initialValue`, puis au
résultat, `times` fois de suite, et renvoie le résultat final. Utilise-la pour calculer
2 doublé 10 fois, et une épargne de 1 000 € après 3 ans à 5 % par an (arrondie au
centime à l’affichage).

:::solution

```js
function applyTimes(fn, times, initialValue) {
  let value = initialValue;
  for (let i = 0; i < times; i++) {
    value = fn(value);
  }
  return value;
}

console.log(applyTimes((value) => value * 2, 10, 2));

const addYearOfInterest = (balance) => balance * 1.05;
console.log(applyTimes(addYearOfInterest, 3, 1000).toFixed(2));
```

```text
2048
1157.63
```

`applyTimes` ne sait rien du calcul : elle répète l’application. 2 doublé 10 fois donne
2 × 2¹⁰ = 2048. Pour l’épargne, 1000 × 1,05³ = 1157,625, affiché 1157.63. Avec
`times = 0`, la fonction renvoie la valeur initiale, ce qui est le résultat attendu.

:::

### Exercice 2 — Tous ou aucun

Écris deux fonctions d’ordre supérieur : `everyCharacter(text, predicate)` qui renvoie
`true` si **tous** les caractères vérifient le prédicat, et
`someCharacter(text, predicate)` qui renvoie `true` si **au moins un** caractère le
vérifie. Utilise-les pour tester si `'29200'` ne contient que des chiffres et si
`'motdepasse'` contient au moins un chiffre. Que renvoient-elles pour une chaîne vide ?

:::solution

```js
function everyCharacter(text, predicate) {
  for (const character of text) {
    if (!predicate(character)) {
      return false; // un seul échec suffit
    }
  }
  return true;
}

function someCharacter(text, predicate) {
  for (const character of text) {
    if (predicate(character)) {
      return true; // une seule réussite suffit
    }
  }
  return false;
}

const isDigit = (character) => character >= '0' && character <= '9';

console.log(everyCharacter('29200', isDigit));
console.log(someCharacter('motdepasse', isDigit));
console.log(everyCharacter('', isDigit), someCharacter('', isDigit));
```

```text
true
false
true false
```

Chaque fonction s’arrête dès que la réponse est connue grâce au retour anticipé. Pour
une chaîne vide, la boucle ne s’exécute pas : `everyCharacter` renvoie `true` (aucun
caractère ne contredit la règle) et `someCharacter` renvoie `false`. C’est la convention
mathématique, mais un validateur de code postal doit donc **aussi** vérifier la longueur.

:::

### Exercice 3 — Corriger les callbacks

Ce code doit afficher `2` (deux prix supérieurs à 10). Il affiche `0` puis plante.
Trouve les deux erreurs.

```js
function countIf(values, predicate) {
  let count = 0;
  for (const value of values) {
    if (predicate(value)) {
      count++;
    }
  }
  return count;
}

const prices = [4, 12, 25, 8];
const isExpensive = (price) => {
  price > 10;
};

console.log(countIf(prices, isExpensive));
console.log(countIf(prices, isExpensive()));
```

:::solution

1. `isExpensive` a un corps entre accolades **sans** `return` : elle renvoie toujours
   `undefined`, qui est falsy. Aucun prix n’est compté : `0`.
2. `isExpensive()` appelle la fonction au lieu de la passer : `countIf` reçoit
   `undefined` et plante avec `TypeError: predicate is not a function`.

```js
function countIf(values, predicate) {
  let count = 0;
  for (const value of values) {
    if (predicate(value)) {
      count++;
    }
  }
  return count;
}

const prices = [4, 12, 25, 8];
const isExpensive = (price) => price > 10;

console.log(countIf(prices, isExpensive));
```

```text
2
```

:::

## Récapitulatif

- Les fonctions sont des valeurs : on peut les ranger, les passer en argument et les
  renvoyer.
- Un callback est une fonction passée à une autre pour être appelée par elle ; une
  fonction d’ordre supérieur reçoit ou renvoie des fonctions.
- On passe la fonction **sans parenthèses** ; avec des parenthèses, on passe son résultat.
- La fonction d’ordre supérieur choisit les arguments transmis au callback.
- Les fonctions d’ordre supérieur séparent le parcours, écrit une fois, de l’action, qui
  varie : `countMatching`, `findFirst`, `sumBy`.
- Renvoyer des fonctions permet de fabriquer des prédicats, de composer et d’envelopper
  des fonctions existantes sans les modifier.
- Un callback peut être appelé plus tard (`setTimeout`) : c’est la base de
  l’asynchrone.
