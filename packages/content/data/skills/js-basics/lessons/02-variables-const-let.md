---
title: Variables avec const et let
summary: Nommer des valeurs, choisir entre const et let, comprendre la portée de bloc et éviter les pièges de déclaration.
durationMinutes: 45
sources:
  - title: MDN — const
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/const
  - title: MDN — let
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/let
  - title: MDN — Types et grammaire (déclarations de variables)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Grammar_and_types
---

## Pourquoi des variables ?

Imagine un script qui calcule le prix d’un panier. Le prix unitaire `19.99` apparaît dans
trois calculs. Le jour où il change, tu dois retrouver et modifier les trois
occurrences, sans en oublier une. Et en relisant `19.99 * 3 + 4.5`, personne ne sait ce
que représentent ces nombres.

Une **variable** résout ces deux problèmes : elle **donne un nom** à une valeur. Le nom
rend le code lisible (`unitPrice * quantity + shippingCost`) et la valeur n’est écrite
qu’à un seul endroit.

```js
const unitPrice = 19.99;
const quantity = 3;
const shippingCost = 4.5;

console.log(unitPrice * quantity + shippingCost);
```

```text
64.47
```

Le signe `=` ne veut pas dire « est égal à » comme en mathématiques. C’est l’opérateur
d’**affectation** : il range la valeur de droite dans la variable de gauche. On le lit
« reçoit » : « `quantity` reçoit 3 ».

## const : une valeur qu’on ne réaffecte pas

`const` (pour _constant_) déclare une variable qui reçoit une valeur **une seule fois**,
au moment de sa déclaration.

```js
const shopName = 'Boulangerie du Port';
console.log(shopName);
shopName = 'Boulangerie de la Gare';
console.log('Cette ligne ne s’affiche pas');
```

```text
Boulangerie du Port
TypeError: Assignment to constant variable.
```

Tenter de **réaffecter** une constante provoque une `TypeError` au moment où la ligne
s’exécute, et le programme s’arrête. C’est une protection : si tu as déclaré une valeur
avec `const`, c’est que tu as décidé qu’elle ne changerait pas. JavaScript t’empêche de
te contredire par accident.

Une constante doit donc recevoir sa valeur dès sa déclaration :

```js
const vatRate;
```

```text
SyntaxError: Missing initializer in const declaration
```

Ici, c’est une `SyntaxError` : le fichier entier est refusé avant même de commencer.

## let : une valeur qui évolue

Quand une valeur doit réellement changer au cours du programme, on la déclare avec `let`.

```js
let score = 0;
console.log(score);

score = score + 10; // on lit la valeur actuelle, on ajoute 10, on range le résultat
console.log(score);

score = 25; // nouvelle affectation : l’ancienne valeur est remplacée
console.log(score);
```

```text
0
10
25
```

La ligne `score = score + 10` surprend souvent au début. Elle se lit de droite à gauche :
JavaScript calcule d’abord `score + 10` avec la valeur actuelle (0), obtient 10, puis
range ce résultat dans `score`.

Une variable `let` peut être déclarée sans valeur. Elle vaut alors `undefined`, la
valeur qui signifie « rien n’a encore été affecté » :

```js
let message;
console.log(message);
message = 'Commande validée';
console.log(message);
```

```text
undefined
Commande validée
```

### On ne déclare qu’une fois

Le mot `let` ou `const` sert à **créer** la variable. On ne l’écrit qu’une fois par nom
dans un même bloc. Pour changer la valeur ensuite, on écrit seulement le nom :

```js
let total = 10;
let total = 20;
```

```text
SyntaxError: Identifier 'total' has already been declared
```

La correction est `total = 20;`, sans `let`.

## Quelle déclaration choisir ?

La règle utilisée dans ce parcours, et dans la plupart des équipes professionnelles :

> **`const` par défaut, `let` seulement quand la valeur doit être réaffectée.**

Pourquoi ? Parce qu’une déclaration est une information pour le lecteur. Quand il voit
`const`, il sait que la valeur ne bougera pas jusqu’à la fin du bloc : il n’a pas besoin
de chercher plus bas si elle a été modifiée. Quand il voit `let`, il sait qu’il doit
suivre son évolution. Un code plein de `let` inutiles oblige à tout surveiller.

Exemple réaliste : un ticket de caisse.

```js
const breadPrice = 1.3;
const breadQuantity = 3;
const breadSubtotal = breadPrice * breadQuantity;

const croissantPrice = 1.15;
const croissantQuantity = 4;
const croissantSubtotal = croissantPrice * croissantQuantity;

const total = breadSubtotal + croissantSubtotal;
console.log(total);
```

```text
8.5
```

Aucune valeur n’est réaffectée : chaque étape du calcul reçoit **son propre nom**. C’est
plus lisible qu’une seule variable `let` modifiée cinq fois, et chaque nom documente
une étape.

:::note[const n’empêche pas tout changement]
`const` interdit de **réaffecter** le nom, c’est-à-dire d’écrire `nom = autre valeur`.
Pour les nombres et les chaînes, cela revient à figer la valeur. Mais certaines valeurs,
comme les listes (tableaux), peuvent être **modifiées de l’intérieur** même quand elles
sont rangées dans une constante :

```js
const cities = ['Lyon'];
cities.push('Nantes'); // ajoute un élément : ce n’est pas une réaffectation
console.log(cities);
```

```text
[ 'Lyon', 'Nantes' ]
```

Tu étudieras cette différence entre réaffectation et modification dans la compétence
sur les tableaux et les objets.
:::

## Les blocs et la portée

### Qu’est-ce qu’un bloc ?

Un **bloc** est une zone de code entre accolades `{ }`. Tu en verras partout : après un
`if`, dans une boucle, dans une fonction. Les variables déclarées avec `const` ou `let`
ont une **portée de bloc** : elles n’existent qu’à l’intérieur du bloc où elles sont
déclarées (et des blocs qu’il contient).

```js
const city = 'Brest';

{
  const greeting = 'Bienvenue';
  console.log(greeting, city); // city est visible : déclarée dans un bloc englobant
}

console.log(city);
console.log(greeting); // greeting n’existe plus ici
```

```text
Bienvenue Brest
Brest
ReferenceError: greeting is not defined
```

Le bloc intérieur « voit » les variables des blocs qui l’entourent, mais l’extérieur ne
voit pas ce qui est déclaré à l’intérieur. Pense à des pièces d’une maison avec des
vitres sans tain : de l’intérieur, on voit dehors ; de dehors, on ne voit pas dedans.

### Une première condition : if

Le bloc le plus courant est celui d’une **condition**. Tu étudieras les conditions en
détail dans la compétence suivante ; voici juste ce qu’il faut pour cette compétence :

```js
const age = 20;

if (age >= 18) {
  console.log('Accès autorisé');
} else {
  console.log('Accès refusé');
}
```

```text
Accès autorisé
```

`if (condition) { ... }` exécute le premier bloc seulement si la condition est vraie ;
sinon, c’est le bloc `else` qui s’exécute. `>=` signifie « supérieur ou égal ».

Le piège classique de la portée apparaît justement avec `if` :

```js
const amount = 60;

if (amount >= 50) {
  let shipping = 0;
} else {
  let shipping = 4.5;
}

console.log(shipping);
```

```text
ReferenceError: shipping is not defined
```

Chaque `shipping` n’existe que dans son propre bloc et disparaît à l’accolade fermante.
La correction consiste à déclarer la variable **avant** les blocs, puis à l’affecter à
l’intérieur :

```js
const amount = 60;
let shipping; // déclarée ici, visible après les blocs

if (amount >= 50) {
  shipping = 0;
} else {
  shipping = 4.5;
}

console.log(shipping);
```

```text
0
```

Ici, `let` est justifié : la variable est déclarée sans valeur puis affectée plus tard.

### Le masquage (shadowing)

Un bloc intérieur peut déclarer une variable qui porte le même nom qu’une variable
extérieure. Elle **masque** alors l’extérieure à l’intérieur du bloc :

```js
const label = 'extérieur';

{
  const label = 'intérieur';
  console.log(label);
}

console.log(label);
```

```text
intérieur
extérieur
```

Ce n’est pas une erreur, mais c’est souvent source de confusion. Préfère des noms
différents et précis.

### Utiliser une variable avant sa déclaration

Avec `const` et `let`, une variable ne peut pas être utilisée avant la ligne qui la
déclare :

```js
console.log(price);
const price = 12;
```

```text
ReferenceError: Cannot access 'price' before initialization
```

Le message est différent de `price is not defined` : JavaScript sait qu’une variable
`price` sera déclarée dans ce bloc, mais refuse qu’on la lise avant sa déclaration. Cette
zone entre le début du bloc et la déclaration s’appelle la **zone morte temporaire**
(_temporal dead zone_). Retiens surtout la règle pratique : déclare avant d’utiliser.

## Et var ?

Tu croiseras le mot-clé `var` dans du code ancien, dans des tutoriels datés ou dans du
code généré. C’était la seule façon de déclarer une variable avant l’arrivée de `let` et
`const` dans la version ES2015 du langage. `var` ignore les blocs :

```js
if (true) {
  var legacy = 'visible partout dans la fonction ou le fichier';
}
console.log(legacy);
```

```text
visible partout dans la fonction ou le fichier
```

Une variable `var` peut aussi être lue avant sa déclaration sans erreur, elle vaut alors
`undefined`, ce qui masque des bugs au lieu de les signaler. **N’écris pas de `var`** :
`const` et `let` font tout ce dont tu as besoin, avec des règles plus prévisibles. Si
une IA t’en propose, remplace-les.

## Nommer ses variables

### Les règles du langage

- Un nom contient des lettres, des chiffres, `_` ou `$`, et **ne commence pas par un
  chiffre** : `total2` est valide, `2total` provoque une `SyntaxError`.
- Les **mots réservés** du langage sont interdits : `const`, `let`, `if`, `class`,
  `return`… Par exemple `const class = 1;` provoque une `SyntaxError`.
- Les majuscules comptent : `total` et `Total` sont deux variables différentes.

### Les conventions

Les conventions ne sont pas imposées par le langage, mais par l’usage et par les
équipes :

- **camelCase** : premier mot en minuscules, mots suivants avec une majuscule initiale
  (`unitPrice`, `freeShippingThreshold`). C’est la convention dominante en JavaScript.
- **Noms en anglais**, comme dans ce parcours et la plupart des projets : JavaScript
  accepte les lettres accentuées (`prénom`), mais elles compliquent la saisie et la
  collaboration.
- **Des noms qui disent ce que la valeur représente** : `paidAmount` plutôt que `x`,
  `p` ou `data2`. Précise l’unité si elle compte : `delayInSeconds`, `priceInCents`.
- Un booléen (vrai ou faux) se nomme comme une question : `isOnSale`, `hasCoupon`,
  `loyaltyCard` à la rigueur.
- Certaines équipes écrivent en `UPPER_SNAKE_CASE` les constantes de configuration
  fixées une fois pour toutes (`MAX_ITEMS`). C’est une convention facultative : suis
  celle du projet où tu travailles.

:::warning[Une faute de frappe peut créer une variable]
Dans un script Node.js classique, affecter un nom jamais déclaré, par exemple
`totl = 5;` au lieu de `total = 5;`, ne provoque pas d’erreur : JavaScript crée
silencieusement une variable globale. Dans un module ES, qui s’exécute en **mode
strict**, la même ligne provoque `ReferenceError: totl is not defined`. Dans tous les
cas, déclare toujours tes variables avec `const` ou `let` : une erreur explicite vaut
mieux qu’un bug silencieux.
:::

## Pièges fréquents

| Erreur typique                               | Ce qui se passe                          | Correction                                            |
| -------------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `let` partout « au cas où »                  | Le lecteur doit surveiller chaque nom    | `const` par défaut                                    |
| `const total = 0;` puis `total = total + 5;` | `TypeError` à l’exécution                | `let` si la valeur change vraiment, ou un nouveau nom |
| Déclarer dans un `if`, utiliser après        | `ReferenceError: ... is not defined`     | Déclarer avant le bloc                                |
| Réécrire `let` à chaque affectation          | `SyntaxError: ... already been declared` | `let` une seule fois, puis `nom = valeur`             |
| Confondre `=` et `===`                       | `=` affecte, il ne compare pas           | `===` pour comparer (leçon sur les opérateurs)        |

## Exercices

### Exercice 1 — const ou let ?

Dans ce script, remplace chaque `???` par `const` ou `let`, en choisissant `const`
chaque fois que c’est possible. Explique ton choix pour `balance`.

```text
??? accountOwner = 'Samia';
??? balance = 100;
??? withdrawal = 30;
balance = balance - withdrawal;
??? deposit = 45;
balance = balance + deposit;
console.log(accountOwner, balance);
```

:::solution

```js
const accountOwner = 'Samia';
let balance = 100; // réaffectée deux fois plus bas : let est obligatoire
const withdrawal = 30;
balance = balance - withdrawal;
const deposit = 45;
balance = balance + deposit;
console.log(accountOwner, balance);
```

```text
Samia 115
```

`balance` est la seule valeur réaffectée : elle doit être déclarée avec `let`. Toutes
les autres gardent leur valeur et sont donc des `const`. Une variante sans aucun `let`
serait `const finalBalance = 100 - withdrawal + deposit;`, avec un nom par étape : les
deux approches sont correctes, l’important est de pouvoir justifier la tienne.
:::

### Exercice 2 — Prévoir avant d’exécuter

Sans l’exécuter, prévois ce qu’affiche ce script ligne par ligne, et à quel endroit il
s’arrête. Vérifie ensuite avec Node.js.

```js
const product = 'Thé vert';
let stock = 12;

{
  const product = 'Thé noir';
  stock = stock - 2;
  console.log(product, stock);
}

console.log(product, stock);

if (stock > 5) {
  const status = 'en stock';
}
console.log(status);
```

:::solution

```text
Thé noir 10
Thé vert 10
ReferenceError: status is not defined
```

- Dans le bloc, `product` désigne la constante intérieure (masquage) : « Thé noir ».
- `stock` n’est pas redéclarée dans le bloc : c’est la variable extérieure qui est
  réaffectée. Elle vaut 10 à l’intérieur **et** après le bloc.
- `status` n’existe que dans le bloc du `if` : la dernière ligne provoque une
  `ReferenceError`. Correction : déclarer `let status;` avant le `if`.

:::

### Exercice 3 — Échanger deux valeurs

Deux variables contiennent les noms des joueurs qui commencent et qui suivent. Écris le
code qui échange leurs valeurs, puis affiche `Ali Bea` avant l’échange et `Bea Ali`
après. Indice : il te faut une troisième variable.

:::solution

```js
let firstPlayer = 'Ali';
let secondPlayer = 'Bea';
console.log(firstPlayer, secondPlayer);

const temporary = firstPlayer; // on met de côté la première valeur
firstPlayer = secondPlayer; // sinon 'Ali' serait perdu ici
secondPlayer = temporary;

console.log(firstPlayer, secondPlayer);
```

```text
Ali Bea
Bea Ali
```

Les deux joueurs sont réaffectés, donc déclarés avec `let`. `temporary` ne change
jamais : `const`. Sans variable temporaire, écrire `firstPlayer = secondPlayer;` puis
`secondPlayer = firstPlayer;` donnerait `Bea Bea`, car la valeur `'Ali'` aurait été
écrasée à la première affectation.
:::

## Récapitulatif

- Une variable donne un nom à une valeur ; `=` est l’affectation, pas l’égalité.
- `const` : affectation unique, obligatoire à la déclaration ; réaffecter provoque une
  `TypeError`.
- `let` : la valeur peut être réaffectée ; sans valeur initiale, elle vaut `undefined`.
- Règle de travail : `const` par défaut, `let` seulement si la valeur change vraiment.
- `const` et `let` ont une portée de bloc : visibles dans leur bloc `{ }` et les blocs
  imbriqués, invisibles à l’extérieur. Déclare avant le bloc ce dont tu as besoin après.
- On ne peut ni redéclarer un nom dans le même bloc, ni utiliser une variable avant sa
  déclaration.
- `var` est historique : à reconnaître, pas à écrire.
- Noms en camelCase, en anglais, qui décrivent la valeur ; un booléen se lit comme une
  question.
