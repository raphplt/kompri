---
title: Déclarer et appeler des fonctions
summary: Regrouper des instructions dans une fonction réutilisable, avec une déclaration, une expression de fonction ou une fonction fléchée, et comprendre le hoisting.
durationMinutes: 55
sources:
  - title: MDN — Fonctions (guide)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Functions
  - title: MDN — Fonctions fléchées
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Functions/Arrow_functions
  - title: MDN — Hoisting
    url: https://developer.mozilla.org/fr/docs/Glossary/Hoisting
---

## Le problème : du code copié-collé

Imagine un script qui affiche le prix TTC de trois produits. Sans fonction, tu écris trois
fois le même calcul :

```js
const teapotPrice = 32.5;
const cupPrice = 8;
const trayPrice = 19.9;

console.log(`${(teapotPrice * 1.2).toFixed(2).replace('.', ',')} €`);
console.log(`${(cupPrice * 1.2).toFixed(2).replace('.', ',')} €`);
console.log(`${(trayPrice * 1.2).toFixed(2).replace('.', ',')} €`);
```

```text
39,00 €
9,60 €
23,88 €
```

Ça fonctionne, mais le jour où le taux de TVA change ou que le format d’affichage évolue,
il faut modifier trois lignes, sans en oublier une. Et en lisant ces lignes, il faut les
déchiffrer pour comprendre qu’elles font toutes la même chose.

Une **fonction** résout ces deux problèmes. Elle **regroupe des instructions sous un
nom**, et on peut l’**appeler** autant de fois que nécessaire, avec des valeurs
différentes :

```js
function formatPriceIncludingTax(priceExcludingTax) {
  const priceIncludingTax = priceExcludingTax * 1.2;
  return `${priceIncludingTax.toFixed(2).replace('.', ',')} €`;
}

console.log(formatPriceIncludingTax(32.5));
console.log(formatPriceIncludingTax(8));
console.log(formatPriceIncludingTax(19.9));
```

```text
39,00 €
9,60 €
23,88 €
```

Le calcul n’est écrit qu’une fois, et son nom dit ce qu’il fait. Tu utilises des
fonctions depuis le début du parcours : `console.log`, `Number`, `Math.floor` ou
`toUpperCase` en sont. Cette compétence t’apprend à écrire les tiennes.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## Déclarer une fonction

### Anatomie

```js
function greet(firstName) {
  const message = `Bonjour ${firstName} !`;
  return message;
}
```

- `function` : le mot-clé qui déclare une fonction.
- `greet` : le **nom** de la fonction.
- `(firstName)` : la liste des **paramètres**, des variables qui recevront les valeurs
  transmises lors de l’appel. Une fonction peut n’en avoir aucun : `()`.
- `{ ... }` : le **corps** de la fonction, les instructions exécutées à chaque appel.
- `return message;` : la **valeur de retour**, ce que la fonction renvoie à celui qui
  l’appelle.

Déclarer une fonction **n’exécute rien**. C’est comme écrire une recette : tant qu’on ne
la prépare pas, rien ne cuit.

### Appeler une fonction

On appelle une fonction en écrivant son nom suivi de **parenthèses** contenant les
**arguments**, les valeurs transmises :

```js
function greet(firstName) {
  const message = `Bonjour ${firstName} !`;
  return message;
}

const greeting = greet('Inès');
console.log(greeting); // → Bonjour Inès !
console.log(greet('Malik')); // → Bonjour Malik !
```

Que se passe-t-il lors de l’appel `greet('Inès')` ?

1. JavaScript crée le paramètre `firstName` et lui affecte l’argument `'Inès'`.
2. Il exécute le corps de la fonction.
3. `return` arrête la fonction et renvoie la valeur `'Bonjour Inès !'`.
4. L’appel `greet('Inès')` est **remplacé par** cette valeur, rangée ici dans
   `greeting`.

Retiens le vocabulaire : le **paramètre** est le nom dans la définition (`firstName`),
l’**argument** est la valeur passée à l’appel (`'Inès'`).

### Sans parenthèses, pas d’appel

Oublier les parenthèses est une erreur fréquente :

```js
function getShopName() {
  return 'Boulangerie du Port';
}

console.log(getShopName()); // → Boulangerie du Port
console.log(typeof getShopName); // → function
console.log(typeof getShopName()); // → string
```

`getShopName()` **appelle** la fonction et vaut la chaîne qu’elle renvoie. `getShopName`
sans parenthèses désigne **la fonction elle-même**, sans l’exécuter. Cette distinction
deviendra essentielle avec les fonctions d’ordre supérieur.

### return et undefined

`return` fait deux choses : il **renvoie** une valeur et il **arrête** immédiatement la
fonction. Une fonction sans `return` (ou avec un `return;` seul) renvoie `undefined` :

```js
function logTotal(total) {
  console.log(`Total : ${total} €`);
}

const result = logTotal(12);
console.log(result);
```

```text
Total : 12 €
undefined
```

`logTotal` **affiche** quelque chose, mais ne **renvoie** rien. C’est la même différence
qu’entre afficher et évaluer dans la console. Une erreur classique consiste à écrire une
fonction qui affiche un résultat au lieu de le renvoyer, puis à vouloir réutiliser ce
résultat dans un calcul : on obtient `undefined`, puis `NaN`.

## Les expressions de fonction

Une fonction est une **valeur**, comme un nombre ou une chaîne. On peut donc la créer
directement dans une expression et la ranger dans une variable :

```js
const double = function (value) {
  return value * 2;
};

console.log(double(21)); // → 42
```

C’est une **expression de fonction**. La fonction n’a pas de nom propre après le mot
`function` (on dit qu’elle est **anonyme**) ; on l’appelle par le nom de la constante.
Note le point-virgule final : c’est une affectation, comme `const x = 5;`.

## Les fonctions fléchées

Depuis ES2015, JavaScript propose une syntaxe plus courte, la **fonction fléchée**
(_arrow function_), reconnaissable à sa flèche `=>` :

```js
const double = (value) => {
  return value * 2;
};

console.log(double(21)); // → 42
```

Quand le corps se limite à **renvoyer une expression**, on peut supprimer les accolades
et le mot `return` : c’est le **retour implicite**.

```js
const double = (value) => value * 2;
const add = (a, b) => a + b;
const getVatRate = () => 0.2;

console.log(double(21)); // → 42
console.log(add(2, 3)); // → 5
console.log(getVatRate()); // → 0.2
```

Les règles d’écriture :

- les parenthèses autour des paramètres sont obligatoires s’il y en a zéro ou plusieurs ;
  avec un seul paramètre, elles sont facultatives, mais l’outil de formatage du projet
  les ajoute toujours ;
- **sans accolades**, la valeur de l’expression est renvoyée automatiquement ;
- **avec accolades**, c’est un corps normal : sans `return`, la fonction renvoie
  `undefined`.

Ce dernier point est un piège classique :

```js
const tripleWithBraces = (value) => {
  value * 3;
};
const triple = (value) => value * 3;

console.log(tripleWithBraces(5)); // → undefined
console.log(triple(5)); // → 15
```

Pour renvoyer un **objet** avec le retour implicite, il faut l’entourer de parenthèses,
sinon les accolades sont lues comme un corps de fonction :

```js
const createPoint = (x, y) => ({ x: x, y: y });

console.log(createPoint(2, 5)); // → { x: 2, y: 5 }
```

:::note[Les fléchées et this]
Les fonctions fléchées ont une autre particularité : elles n’ont pas leur propre `this`.
Le mot-clé `this` sert surtout dans la programmation orientée objet, que ce parcours
n’aborde pas à ce stade. Retiens seulement qu’à l’intérieur d’une fonction fléchée,
`this` désigne la même chose qu’à l’extérieur, alors qu’une fonction déclarée avec
`function` reçoit son propre `this` selon la façon dont elle est appelée. C’est pourquoi
on évite les fonctions fléchées pour les méthodes d’objets qui utilisent `this`.

:::

## Le hoisting des déclarations

Une différence importante sépare les **déclarations** de fonction des **expressions** (y
compris fléchées) : le moment où elles deviennent utilisables.

```js
console.log(greet('Ana')); // → Bonjour Ana

function greet(name) {
  return `Bonjour ${name}`;
}
```

Une déclaration `function` peut être appelée **avant** l’endroit où elle est écrite dans
le fichier. Avant d’exécuter le code, JavaScript prépare toutes les déclarations de
fonction de la portée : c’est ce qu’on appelle le **hoisting** (« hissage » : tout se
passe comme si la déclaration était remontée en haut).

Ce n’est pas le cas d’une fonction rangée dans une `const` :

```js
console.log(sayHi('Ana'));

const sayHi = (name) => `Salut ${name}`;
```

```text
ReferenceError: Cannot access 'sayHi' before initialization
```

Tu reconnais l’erreur de la compétence sur les variables : `sayHi` est une constante
comme une autre, inutilisable avant sa déclaration. Si un code ancien utilise `var` à la
place de `const`, l’erreur devient `TypeError: sayHi is not a function`, car la variable
existe déjà mais vaut encore `undefined`.

En pratique : le hoisting permet d’écrire le programme principal en haut du fichier et
les fonctions détaillées en dessous. Avec des fonctions fléchées, il faut les définir
**avant** de les utiliser. Les deux organisations sont courantes ; choisis-en une et
garde-la dans tout le fichier.

## Quelle syntaxe choisir ?

| Syntaxe                | Exemple                                          | Utilisable avant sa définition ? |
| ---------------------- | ------------------------------------------------ | -------------------------------- |
| Déclaration            | `function add(a, b) { return a + b; }`           | oui (hoisting)                   |
| Expression de fonction | `const add = function (a, b) { return a + b; };` | non                              |
| Fonction fléchée       | `const add = (a, b) => a + b;`                   | non                              |

Il n’y a pas de règle universelle, seulement des conventions d’équipe. Une convention
répandue, que ce parcours suit :

- **déclarations `function`** pour les fonctions principales d’un fichier, nommées et
  réutilisées ;
- **fonctions fléchées** pour les petites fonctions passées en argument à d’autres
  fonctions (leçon sur les fonctions d’ordre supérieur) et les fonctions d’une ligne.

Les expressions `function (...) { ... }` anonymes sont surtout à reconnaître dans du code
existant.

## Une fonction appelle une fonction

Une fonction peut en appeler d’autres. C’est ainsi qu’on découpe un programme en
**petites étapes nommées** :

```js
function computeSubtotal(unitPrice, quantity) {
  return unitPrice * quantity;
}

function formatEuros(amount) {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

function formatReceiptLine(label, unitPrice, quantity) {
  const subtotal = computeSubtotal(unitPrice, quantity);
  return `${label.padEnd(12, '.')} ${formatEuros(subtotal).padStart(9)}`;
}

console.log(formatReceiptLine('Pain', 1.3, 3));
console.log(formatReceiptLine('Croissant', 1.15, 4));
```

```text
Pain........    3,90 €
Croissant...    4,60 €
```

Chaque fonction fait **une seule chose** et porte un nom qui le dit. On peut lire
`formatReceiptLine` sans connaître le détail de `formatEuros`, comme on lit une table
des matières.

### La pile d’appels

Quand une fonction en appelle une autre, JavaScript empile les appels : il termine
l’appel le plus récent avant de revenir au précédent. Si une erreur survient au fond de
cette pile, le message de Node.js liste les appels en cours, du plus récent au plus
ancien. C’est la **pile d’appels** (_stack trace_) dont on a parlé dès la première
compétence. Voici ce qu’affiche le programme précédent, enregistré dans `receipt.js`, si
l’on oublie le `return` de `computeSubtotal` (le chemin dépend de ta machine, et la fin
de la pile est abrégée) :

```text
TypeError: Cannot read properties of undefined (reading 'toFixed')
    at formatEuros (/home/alice/kompri/receipt.js:6:20)
    at formatReceiptLine (/home/alice/kompri/receipt.js:11:38)
    at Object.<anonymous> (/home/alice/kompri/receipt.js:14:13)
    ...
```

Lis-la de haut en bas : l’erreur s’est produite dans `formatEuros`, appelée par
`formatReceiptLine`, elle-même appelée depuis le programme principal (ligne 14). La
cause, elle, est plus haut : `computeSubtotal` a renvoyé `undefined`. La pile montre
**où** l’erreur éclate ; à toi de remonter vers **pourquoi**. Des fonctions bien nommées
rendent cette pile très parlante.

## Pièges fréquents

- **Oublier les parenthèses** : `getTotal` désigne la fonction, `getTotal()` l’appelle.
- **Afficher au lieu de renvoyer** : une fonction qui fait `console.log` sans `return`
  renvoie `undefined`.
- **Accolades sans `return` dans une fléchée** : `(x) => { x * 2; }` renvoie `undefined`.
- **Objet en retour implicite sans parenthèses** : `() => { x: 1 }` ne renvoie pas un
  objet ; écris `() => ({ x: 1 })`.
- **Appeler une fonction `const` avant sa définition** : `ReferenceError`.
- **Code après `return`** : il n’est jamais exécuté.

## Exercices

### Exercice 1 — Trois syntaxes

Écris la fonction `computeAreaOfRectangle`, qui reçoit une largeur et une hauteur et
renvoie l’aire, de trois façons : déclaration, expression de fonction et fonction
fléchée avec retour implicite. Appelle chacune avec 4 et 2,5.

:::solution

```js
function computeAreaDeclaration(width, height) {
  return width * height;
}

const computeAreaExpression = function (width, height) {
  return width * height;
};

const computeAreaArrow = (width, height) => width * height;

console.log(computeAreaDeclaration(4, 2.5));
console.log(computeAreaExpression(4, 2.5));
console.log(computeAreaArrow(4, 2.5));
```

```text
10
10
10
```

Les trois fonctions font exactement la même chose. Seule la déclaration pourrait être
appelée avant d’être écrite (hoisting). La version fléchée est la plus courte grâce au
retour implicite. Les noms sont différents ici seulement pour coexister dans le même
fichier.

:::

### Exercice 2 — Trouver les erreurs

Ce script devrait afficher `Total : 12 €` puis `Moyenne : 4`. Prévois ce qu’il affiche,
explique chaque erreur et corrige-le.

```js
const values = [3, 4, 5];

console.log(`Total : ${sum(values)} €`);
console.log(`Moyenne : ${average(values)}`);

function sum(numbers) {
  let total = 0;
  for (const number of numbers) {
    total += number;
  }
  console.log(total);
}

const average = (numbers) => {
  sum(numbers) / numbers.length;
};
```

:::solution
Le script affiche `12` puis `Total : undefined €`, puis s’arrête sur
`ReferenceError: Cannot access 'average' before initialization`.

1. `sum` **affiche** le total au lieu de le **renvoyer** : la fonction renvoie
   `undefined`. Correction : `return total;`.
2. `average` est une constante utilisée avant sa déclaration : contrairement à `sum`
   (déclaration hissée), elle n’existe pas encore. Correction : la définir avant les
   appels, ou en faire une déclaration `function`.
3. Le corps de `average` est entre accolades mais n’a pas de `return` : il renverrait
   `undefined`. Correction : retour implicite sans accolades.

```js
const values = [3, 4, 5];

function sum(numbers) {
  let total = 0;
  for (const number of numbers) {
    total += number;
  }
  return total;
}

const average = (numbers) => sum(numbers) / numbers.length;

console.log(`Total : ${sum(values)} €`);
console.log(`Moyenne : ${average(values)}`);
```

```text
Total : 12 €
Moyenne : 4
```

:::

### Exercice 3 — Découper un calcul

Écris trois fonctions : `toCents(euros)` qui convertit un montant en centimes entiers
(avec `Math.round`), `formatCents(cents)` qui renvoie par exemple `'9,60 €'`, et
`formatTotal(unitPrice, quantity)` qui utilise les deux premières pour renvoyer le total
formaté. Vérifie avec `formatTotal(1.15, 3)`.

:::solution

```js
function toCents(euros) {
  return Math.round(euros * 100);
}

function formatCents(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatTotal(unitPrice, quantity) {
  const totalInCents = toCents(unitPrice) * quantity;
  return formatCents(totalInCents);
}

console.log(formatTotal(1.15, 3));
console.log(1.15 * 3);
```

```text
3,45 €
3.4499999999999997
```

Le prix unitaire est converti en centimes **avant** la multiplication : 115 × 3 = 345,
un calcul exact sur des entiers. La dernière ligne montre ce qu’aurait donné le calcul
direct en euros. Chaque fonction a une seule responsabilité et peut être réutilisée
seule.

:::

## Récapitulatif

- Une fonction regroupe des instructions sous un nom ; la déclarer n’exécute rien,
  l’appeler avec `nom(arguments)` l’exécute.
- Les paramètres reçoivent les arguments ; `return` renvoie une valeur et arrête la
  fonction ; sans `return`, la fonction renvoie `undefined`.
- `nom` désigne la fonction, `nom()` l’appelle.
- Trois syntaxes : déclaration `function nom() {}`, expression
  `const nom = function () {};`, fléchée `const nom = () => ...`.
- Une fléchée sans accolades renvoie automatiquement son expression ; un objet se
  renvoie entre parenthèses. Les fléchées n’ont pas leur propre `this`.
- Les déclarations `function` sont hissées (utilisables avant leur définition) ; les
  fonctions rangées dans une `const` ne le sont pas.
- Une fonction peut en appeler d’autres : découpe en petites étapes nommées. La pile
  d’appels d’une erreur montre la chaîne des appels.
