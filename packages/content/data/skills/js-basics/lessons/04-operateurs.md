---
title: Opérateurs arithmétiques, de comparaison et logiques
summary: Calculer, comparer strictement, combiner des conditions et comprendre les valeurs falsy, la priorité des opérateurs et l’opérateur ??.
durationMinutes: 60
sources:
  - title: MDN — Expressions et opérateurs
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Expressions_and_operators
  - title: MDN — Précédence des opérateurs
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Operator_precedence
  - title: MDN — Utiliser les comparaisons d’égalité
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Equality_comparisons_and_sameness
  - title: MDN — Falsy
    url: https://developer.mozilla.org/fr/docs/Glossary/Falsy
---

## À quoi servent les opérateurs ?

Un programme passe son temps à **calculer** (un total, une remise), à **comparer** (le
montant atteint-il le seuil de livraison gratuite ?) et à **combiner** des réponses
(le client a-t-il une carte fidélité **et** un panier de plus de 10 € ?). Les opérateurs
sont les outils de ces trois actions. La plupart sont familiers, mais quelques-uns
réservent des surprises qui produisent des bugs silencieux : une comparaison qui
convertit les types, une concaténation évaluée trop tôt, un 0 remplacé par une valeur
par défaut. Cette leçon les passe en revue un par un.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## Les opérateurs arithmétiques

```js
console.log(7 + 2); // → 9
console.log(7 - 2); // → 5
console.log(7 * 2); // → 14
console.log(7 / 2); // → 3.5
console.log(7 % 2); // → 1
console.log(2 ** 10); // → 1024
console.log(-7); // → -7
```

- `/` est une division **décimale** : `7 / 2` vaut 3,5, pas 3. Pour la partie entière,
  combine avec `Math.floor` ou `Math.trunc`.
- `%` donne le **reste** de la division entière. `7 % 2` vaut 1 car 7 = 2 × 3 + 1. Il
  sert à savoir si un nombre est pair (`n % 2 === 0`) ou à découper une durée.
- `**` est la puissance : `2 ** 10` vaut 2 à la puissance 10.

Exemple concret du reste : convertir 135 minutes en heures et minutes.

```js
const durationInMinutes = 135;
const hours = Math.floor(durationInMinutes / 60);
const minutes = durationInMinutes % 60;

console.log(hours, 'h', minutes, 'min'); // → 2 h 15 min
```

Une division par zéro ne provoque pas d’erreur en JavaScript : `1 / 0` vaut `Infinity`
et `0 / 0` vaut `NaN`. Ce sont des valeurs du type number, qui se propagent ensuite
dans les calculs.

### Affectations combinées, incrémentation

Modifier une variable à partir de sa propre valeur est si courant qu’il existe des
raccourcis :

```js
let count = 5;
count++; // équivaut à count = count + 1
console.log(count); // → 6
count += 10; // count = count + 10
console.log(count); // → 16
count -= 1; // count = count - 1
count *= 2; // count = count * 2
console.log(count); // → 30
count /= 4; // count = count / 4
console.log(count); // → 7.5
count--; // count = count - 1
console.log(count); // → 6.5
```

Ces raccourcis réaffectent la variable : ils exigent `let`. Attention, `+=` suit les
mêmes règles que `+` : sur une chaîne, il concatène.

## La priorité des opérateurs

Comme en mathématiques, `*`, `/` et `%` passent **avant** `+` et `-`, et `**` passe avant
tout le reste. À priorité égale, on évalue de **gauche à droite** (sauf `**`, évalué de
droite à gauche). Les parenthèses imposent l’ordre.

```js
console.log(2 + 3 * 4); // → 14
console.log((2 + 3) * 4); // → 20
console.log(10 - 4 - 3); // → 3
console.log(2 ** (3 ** 2)); // → 512
console.log(100 - 100 * 0.1); // → 90
```

Écrit sans parenthèses, `2 ** 3 ** 2` se lit déjà `2 ** (3 ** 2)`, soit 2 puissance 9 :
l’outil de formatage du projet ajoute ces parenthèses pour rendre l’ordre visible. En
cas de doute, **mets des parenthèses** : elles ne coûtent rien et rendent l’intention
évidente.

Le piège le plus fréquent mélange concaténation et calcul :

```js
const total = 53.97;
const discounted = 48.57;

console.log('Économie : ' + total - discounted); // → NaN
console.log('Économie : ' + (total - discounted)); // → Économie : 5.399999999999999
console.log(`Économie : ${(total - discounted).toFixed(2)}`); // → Économie : 5.40
```

Que s’est-il passé à la première ligne ? `+` et `-` ont la même priorité, donc
l’évaluation se fait de gauche à droite :

1. `'Économie : ' + total` donne la chaîne `'Économie : 53.97'` ;
2. `'Économie : 53.97' - discounted` : `-` veut des nombres, la chaîne devient `NaN`,
   et `NaN - 48.57` vaut `NaN`.

Aucune erreur, juste un affichage faux. Les parenthèses ou, mieux, un gabarit de chaîne
avec `${...}` règlent le problème.

## Les opérateurs de comparaison

Une comparaison produit un **booléen** : `true` ou `false`.

```js
const subtotal = 50;
const freeShippingThreshold = 50;

console.log(subtotal > freeShippingThreshold); // → false
console.log(subtotal >= freeShippingThreshold); // → true
console.log(subtotal < 100); // → true
console.log(subtotal <= 49.99); // → false
console.log(subtotal === 50); // → true
console.log(subtotal !== 50); // → false
```

Lis attentivement les règles métier : « gratuit **à partir de** 50 € » inclut 50, donc
`>=` ; « gratuit **au-delà de** 50 € » l’exclut, donc `>`. Une erreur de borne ne se
voit qu’avec la valeur exacte du seuil : c’est elle qu’il faut tester en priorité.

### Égalité stricte === et égalité faible ==

JavaScript possède deux opérateurs d’égalité :

- `===` (égalité **stricte**) : vrai seulement si les deux valeurs ont **le même type et
  la même valeur**. `!==` est son contraire.
- `==` (égalité **faible**) : si les types diffèrent, JavaScript **convertit** d’abord
  les valeurs selon des règles complexes, puis compare. `!=` est son contraire.

```js
console.log(5 === '5'); // → false
console.log(5 == '5'); // → true
console.log('' == 0); // → true
console.log('0' == 0); // → true
console.log(' \n' == 0); // → true
console.log('0' == false); // → true
console.log(null == undefined); // → true
console.log(null == 0); // → false
console.log(NaN == NaN); // → false
```

Avec `==`, une chaîne vide, une chaîne `'0'` et une chaîne contenant seulement un saut de
ligne sont toutes « égales » à 0. Ces règles sont définies par la norme, donc
prévisibles en théorie, mais impossibles à garder en tête au quotidien.

:::warning[Règle de ce parcours]
Utilise **toujours** `===` et `!==`. Si les types peuvent différer, convertis d’abord
explicitement (`Number(input) === 0`), puis compare strictement. Si tu rencontres `==`
dans du code existant ou généré, demande-toi quelles valeurs il laisse passer par
accident.
:::

### Comparer des chaînes

Les chaînes se comparent **caractère par caractère**, selon le code de chaque caractère,
comme dans un dictionnaire… à quelques différences près :

```js
console.log('abricot' < 'banane'); // → true
console.log('Zèbre' < 'abeille'); // → true
console.log('10' < '9'); // → true
console.log(10 < 9); // → false
console.log('10' < 9); // → false
```

- Toutes les majuscules sont rangées **avant** les minuscules : `'Z'` vient avant `'a'`.
- Deux chaînes de chiffres se comparent comme du texte : `'1'` vient avant `'9'`, donc
  `'10' < '9'` est vrai. Encore une raison de convertir les saisies en nombres.
- Si un seul côté est un nombre, l’autre est converti en nombre : `'10' < 9` compare 10
  et 9.

### Ne pas confondre = et ===

`=` affecte, `===` compare. Une affectation écrite par erreur dans une condition est
valide en JavaScript, et c’est bien le problème :

```js
let discountRate = 0.1;

if ((discountRate = 0)) {
  console.log('Pas de remise');
} else {
  console.log('Remise de', discountRate);
}
```

```text
Remise de 0
```

La condition **affecte** 0 à `discountRate`, puis teste la valeur 0, considérée comme
fausse (voir plus bas). Résultat : la branche `else` s’exécute et annonce une remise
de… 0, parce que la variable a été écrasée. Avec `const discountRate`, la même ligne
provoquerait une `TypeError` : une raison de plus de préférer `const`.

Tu as sans doute remarqué la double parenthèse `if ((discountRate = 0))`. Un développeur
l’écrit parfois pour signaler une affectation **volontaire** dans une condition, et
l’outil de formatage Prettier, utilisé dans ce parcours, l’ajoute automatiquement. Si
tu vois une double parenthèse dans une condition, vérifie qu’il s’agit bien d’une
affectation voulue ; dans un code de débutant, c’est presque toujours un `===` oublié.

## Les opérateurs logiques

### ET, OU, NON

- `a && b` (ET) est vrai quand `a` **et** `b` sont vrais ;
- `a || b` (OU) est vrai quand **au moins l’un** des deux est vrai ;
- `!a` (NON) est vrai quand `a` est faux.

```js
const hasLoyaltyCard = true;
const cartTotal = 8.5;

console.log(hasLoyaltyCard && cartTotal > 10); // → false
console.log(hasLoyaltyCard || cartTotal > 10); // → true
console.log(!hasLoyaltyCard); // → false
console.log(cartTotal > 0 && cartTotal < 100); // → true
```

`&&` est prioritaire sur `||` : `a || b && c` se lit `a || (b && c)`. Là encore, les
parenthèses lèvent toute ambiguïté.

### Les valeurs falsy et truthy

Les opérateurs logiques et les conditions (`if`) acceptent **n’importe quelle valeur**,
pas seulement des booléens. Chaque valeur est alors considérée comme « fausse » ou
« vraie ». Il existe une liste **courte et fixe** de valeurs considérées comme fausses,
dites **falsy** :

| Valeur falsy | Type        |
| ------------ | ----------- |
| `false`      | boolean     |
| `0` et `-0`  | number      |
| `0n`         | bigint      |
| `''`         | string vide |
| `null`       | null        |
| `undefined`  | undefined   |
| `NaN`        | number      |

**Toutes les autres valeurs** sont **truthy** (considérées comme vraies), y compris
`'0'`, `'false'`, `' '` (une espace) ou les nombres négatifs.

```js
console.log(Boolean(0)); // → false
console.log(Boolean('')); // → false
console.log(Boolean(NaN)); // → false
console.log(Boolean('0')); // → true
console.log(Boolean(' ')); // → true
console.log(Boolean('false')); // → true
console.log(!!-1); // → true
```

`Boolean(value)` convertit explicitement une valeur en booléen. `!!value` produit le même
résultat (deux négations successives) ; tu le croiseras souvent.

### Ce que renvoient vraiment && et ||

`&&` et `||` ne renvoient pas forcément `true` ou `false` : ils renvoient **l’une des deux
valeurs**, et s’arrêtent dès que le résultat est connu (on parle d’évaluation en
**court-circuit**).

- `a || b` renvoie `a` si `a` est truthy, sinon `b`.
- `a && b` renvoie `a` si `a` est falsy, sinon `b`.

```js
console.log('Alice' || 'Anonyme'); // → Alice
console.log('' || 'Anonyme'); // → Anonyme
console.log(0 || 'aucun'); // → aucun
console.log(true && 'accès'); // → accès
console.log(false && 'accès'); // → false
console.log(null && 'accès'); // → null
```

Ce comportement explique un usage très répandu de `||` : fournir une **valeur par
défaut**. C’est aussi la source d’un bug classique.

### Le piège de || avec 0, et l’opérateur ??

```js
const stock = 0;
const stockLabel = stock || 'inconnu';

console.log(`Stock : ${stockLabel}`); // → Stock : inconnu
```

Le stock vaut 0, une valeur parfaitement connue ! Mais 0 est falsy, donc `||` le remplace.
L’opérateur `??` (_nullish coalescing_, que l’on peut traduire par « coalescence des
valeurs nulles ») corrige ce problème : il ne remplace que `null` et `undefined`, les
deux valeurs qui signifient « absence de valeur ».

```js
console.log(0 ?? 'inconnu'); // → 0
console.log(`[${'' ?? 'inconnu'}]`); // → []
console.log(null ?? 'inconnu'); // → inconnu
console.log(undefined ?? 'inconnu'); // → inconnu

const stock = 0;
console.log(`Stock : ${stock ?? 'inconnu'}`); // → Stock : 0
```

À la deuxième ligne, les crochets montrent que la chaîne vide a été conservée : `''`
n’est ni `null` ni `undefined`.

Quand choisir lequel ?

- `??` quand 0, `''` ou `false` sont des valeurs **valides** à conserver (un stock, une
  quantité, un prix, une remise) ;
- `||` quand **toute** valeur falsy doit être remplacée, par exemple un nom vide à
  remplacer par « Anonyme ».

JavaScript interdit de mélanger `??` avec `||` ou `&&` sans parenthèses :
`null || 0 ?? 1` provoque `SyntaxError: Unexpected token '??'`. Écris
`(null || 0) ?? 1` pour préciser l’ordre voulu.

## Calculer sans if : booléens et opérateur ternaire

Les opérateurs permettent souvent d’éviter une condition. Exemple : une remise
fidélité de 5 % qui ne s’applique que si `hasLoyaltyCard` vaut `true`.

```js
const total = 8.5;
const hasLoyaltyCard = true;

const discount = total * 0.05 * Number(hasLoyaltyCard);
console.log(discount); // → 0.42500000000000004
console.log((total - discount).toFixed(2)); // → 8.07
```

`Number(true)` vaut 1 et `Number(false)` vaut 0 : multiplier par ce nombre « active » ou
« désactive » la remise. C’est correct et explicite, mais demande de connaître la
conversion des booléens.

L’**opérateur ternaire** exprime le même choix de façon plus lisible. Il a trois
parties : `condition ? valeurSiVrai : valeurSiFaux`.

```js
const total = 8.5;
const hasLoyaltyCard = false;

const discount = hasLoyaltyCard ? total * 0.05 : 0;
console.log(discount); // → 0
console.log(hasLoyaltyCard ? 'Carte fidélité' : 'Sans carte'); // → Sans carte
```

Le ternaire est une **expression** : il produit une valeur, que l’on peut ranger dans
une `const`. Tu le retrouveras avec les conditions dans la compétence suivante. Évite de
l’imbriquer : au-delà d’un choix simple, un `if` est plus lisible.

## Pièges fréquents

- **`==` au lieu de `===`** : des valeurs de types différents passent pour égales.
  Correction : `===`, après conversion explicite si besoin.
- **Concaténation puis soustraction** : `'Total : ' + a - b` donne `NaN`. Correction :
  parenthèses ou gabarit de chaîne.
- **Mauvaise borne** : `>` au lieu de `>=` pour « à partir de ». Correction : relire la
  règle et tester la valeur exacte du seuil.
- **`=` dans une condition** : affecte au lieu de comparer. Correction : `===`, et
  `const` par défaut pour que l’erreur soit signalée.
- **`||` pour une valeur par défaut numérique** : 0 est remplacé. Correction : `??`.
- **Croire que `'0'` ou `'false'` sont falsy** : ce sont des chaînes non vides, donc
  truthy.

## Exercices

### Exercice 1 — Prévoir les résultats

Prévois la valeur affichée par chaque ligne, puis vérifie.

```js
console.log(20 - 8 / 2);
console.log((20 - 8) / 2);
console.log(17 % 5);
console.log('7' * 2 + 1);
console.log('7' + 2 * 3);
console.log('Total : ' + 2 + 3);
console.log(3 > 2 > 1);
```

:::solution

```text
16
6
2
15
76
Total : 23
false
```

- `8 / 2` est calculé avant la soustraction : 20 − 4 = 16.
- `17 % 5` : 17 = 5 × 3 + 2, le reste vaut 2.
- `'7' * 2` convertit en nombre (14), puis `+ 1` additionne deux nombres : 15.
- `2 * 3` est prioritaire (6), puis `'7' + 6` concatène : `'76'`.
- De gauche à droite : `'Total : ' + 2` donne `'Total : 2'`, puis `+ 3` concatène.
- `3 > 2 > 1` se lit `(3 > 2) > 1`, soit `true > 1`. `true` devient 1, et `1 > 1` est
  faux. On ne peut pas enchaîner des comparaisons comme en mathématiques : écris
  `3 > 2 && 2 > 1`.

:::

### Exercice 2 — La remise conditionnelle

Une boutique accorde 10 % de remise sur un panier **à partir de** 30 €. Sans `if`, calcule
la remise et le montant à payer pour un panier de 30 €, puis pour un panier de 29,99 €.
Propose deux versions : une avec `Number(...)`, une avec l’opérateur ternaire.

:::solution

```js
const cartTotal = 30;
const isEligible = cartTotal >= 30; // « à partir de » : >=

// Version 1 : le booléen converti vaut 1 ou 0
const discountWithNumber = cartTotal * 0.1 * Number(isEligible);

// Version 2 : le ternaire, plus lisible
const discountWithTernary = isEligible ? cartTotal * 0.1 : 0;

console.log(discountWithNumber, discountWithTernary);
console.log(`À payer : ${(cartTotal - discountWithTernary).toFixed(2)} €`);
```

```text
3 3
À payer : 27.00 €
```

Avec `const cartTotal = 29.99;`, `isEligible` vaut `false`, les deux remises valent 0 et
le script affiche `À payer : 29.99 €`. Nommer la condition (`isEligible`) rend les deux
versions plus lisibles. Le ternaire exprime directement l’intention ; la version
`Number` repose sur une conversion qu’il faut connaître. Tester exactement 30 vérifie la
borne.
:::

### Exercice 3 — Corriger les valeurs par défaut

Ce code affiche les informations d’une commande. Les valeurs peuvent valoir 0 ou une
chaîne vide légitimement, sauf le prénom du client : un prénom vide doit être remplacé par
« client ». Corrige-le et explique chaque choix.

```js
const firstName = '';
const quantity = 0;
const note = undefined;

console.log(`Bonjour ${firstName ?? 'client'}`);
console.log(`Quantité : ${quantity || 1}`);
console.log(`Note : ${note || 'aucune'}`);
```

:::solution

```js
const firstName = '';
const quantity = 0;
const note = undefined;

console.log(`Bonjour ${firstName || 'client'}`); // '' doit être remplacé : ||
console.log(`Quantité : ${quantity ?? 1}`); // 0 est une quantité valide : ??
console.log(`Note : ${note ?? 'aucune'}`); // seule l’absence doit être remplacée : ??
```

```text
Bonjour client
Quantité : 0
Note : aucune
```

Le code d’origine avait deux erreurs inversées : `??` ne remplace pas la chaîne vide (il
affichait « Bonjour » suivi de rien), et `||` remplaçait la quantité 0 par 1. Pour la note, `||` et
`??` donnent ici le même résultat, mais `??` exprime mieux l’intention : on ne veut
remplacer que l’absence de valeur, pas une note volontairement vide.
:::

## Récapitulatif

- Arithmétique : `+ - * / % **` ; `/` est décimale, `%` donne le reste. Les raccourcis
  `+=`, `-=`, `++`… réaffectent la variable.
- Priorité : `**`, puis `* / %`, puis `+ -`, de gauche à droite. Les parenthèses
  clarifient. `'texte' + a - b` donne `NaN`.
- Comparaisons : `< > <= >=` et surtout `===` / `!==`. `==` convertit les types : ne
  l’utilise pas. Les chaînes se comparent comme du texte (`'10' < '9'`).
- `=` affecte, `===` compare.
- Valeurs falsy : `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Tout le
  reste est truthy.
- `&&` et `||` renvoient l’une de leurs valeurs et court-circuitent. `||` remplace toute
  valeur falsy ; `??` ne remplace que `null` et `undefined`.
- Pour choisir une valeur selon une condition sans `if` : l’opérateur ternaire
  `condition ? a : b`.
