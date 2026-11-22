---
title: Prendre des décisions avec if, else, le ternaire et switch
summary: Faire exécuter des instructions différentes selon les données, avec if, else if, else, l’opérateur ternaire et switch.
durationMinutes: 50
sources:
  - title: MDN — Contrôle du flux d’instructions et gestion des erreurs
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
  - title: MDN — if...else
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/if...else
  - title: MDN — switch
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/switch
  - title: MDN — L’opérateur conditionnel
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Conditional_operator
---

## Un programme qui décide

Jusqu’ici, tes scripts s’exécutaient de haut en bas, toujours de la même façon. Or un vrai
programme **réagit aux données** : la livraison est gratuite ou payante selon le montant,
un message d’erreur s’affiche seulement si la saisie est invalide, un tarif dépend de
l’âge. On appelle cela le **flux de contrôle** : l’ordre dans lequel les instructions
s’exécutent, et lesquelles sont sautées.

Cette leçon présente les quatre outils de décision de JavaScript : `if`, ses compagnons
`else if` et `else`, l’opérateur ternaire et `switch`. Tu as déjà croisé `if` et le
ternaire dans la compétence précédente ; ici, on les étudie à fond et on apprend à
choisir le bon outil.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## if : exécuter un bloc sous condition

```js
const cartTotal = 62;

if (cartTotal >= 50) {
  console.log('Livraison offerte');
}

console.log('Fin du calcul');
```

```text
Livraison offerte
Fin du calcul
```

La structure est toujours la même : le mot-clé `if`, une **condition entre
parenthèses**, puis un **bloc** entre accolades. JavaScript évalue la condition ; si elle
est vraie, il exécute le bloc ; sinon, il le saute et continue après l’accolade
fermante. Avec `cartTotal = 30`, seule la ligne `Fin du calcul` s’afficherait.

La condition peut être n’importe quelle expression. Si ce n’est pas un booléen,
JavaScript la considère comme vraie ou fausse selon les règles des valeurs truthy et
falsy (rappelées dans la leçon suivante).

:::warning[Toujours des accolades]
JavaScript accepte un `if` sans accolades quand le bloc ne contient qu’une instruction :
`if (cartTotal >= 50) console.log('Livraison offerte');`. Mais si quelqu’un ajoute
ensuite une deuxième ligne indentée, elle s’exécutera **toujours**, car seule la première
instruction dépend du `if`. Écris systématiquement les accolades : c’est la convention
de ce parcours.

:::

## else : sinon

`else` ajoute un bloc exécuté quand la condition est **fausse**. Exactement un des deux
blocs s’exécute, jamais les deux, jamais aucun.

```js
const age = 16;

if (age >= 18) {
  console.log('Tarif adulte');
} else {
  console.log('Tarif réduit');
}
```

```text
Tarif réduit
```

## else if : enchaîner plusieurs cas

Quand il y a plus de deux possibilités, on enchaîne les tests avec `else if`. JavaScript
les essaie **dans l’ordre** et exécute le bloc de la **première** condition vraie, puis
saute tous les suivants.

```js
const temperature = 24;

if (temperature < 0) {
  console.log('Gel');
} else if (temperature < 15) {
  console.log('Frais');
} else if (temperature < 25) {
  console.log('Doux');
} else {
  console.log('Chaud');
}
```

```text
Doux
```

Avec 24, le premier test (`24 < 0`) est faux, le deuxième (`24 < 15`) aussi, le troisième
(`24 < 25`) est vrai : on affiche `Doux` et on s’arrête là. Le dernier `else` attrape
tout ce qui reste (25 et plus).

### L’ordre des tests compte

Parce que seule la première condition vraie est retenue, l’ordre change le résultat :

```js
const temperature = -5;

if (temperature < 25) {
  console.log('Doux');
} else if (temperature < 0) {
  console.log('Gel');
}
```

```text
Doux
```

`-5 < 25` est vrai, donc « Doux » s’affiche et le test du gel n’est jamais atteint. Avec
des seuils, range les conditions de la plus restrictive à la plus large, ou écris des
intervalles complets (`temperature >= 0 && temperature < 15`) qui ne dépendent pas de
l’ordre.

### Combiner des conditions

Les opérateurs logiques permettent d’exprimer des règles composées :

```js
const age = 30;
const hasStudentCard = true;
const isWeekend = false;

if (age < 26 || hasStudentCard) {
  console.log('Réduction jeune ou étudiant');
}

if (!isWeekend && age >= 18) {
  console.log('Tarif semaine adulte');
}
```

```text
Réduction jeune ou étudiant
Tarif semaine adulte
```

Quand une condition devient longue, donne-lui un nom avec une constante :

```js
const age = 30;
const hasStudentCard = true;

const isEligibleForDiscount = age < 26 || hasStudentCard;

if (isEligibleForDiscount) {
  console.log('Réduction appliquée');
}
```

```text
Réduction appliquée
```

Le `if` se lit alors comme une phrase, et la règle métier est écrite à un seul endroit.

### Imbriquer ou aplatir

On peut placer un `if` dans un autre. C’est parfois nécessaire, mais l’imbrication
profonde rend le code difficile à suivre :

```js
const isLoggedIn = true;
const cartItemCount = 2;
const hasAddress = false;

if (isLoggedIn) {
  if (cartItemCount > 0) {
    if (hasAddress) {
      console.log('Commande possible');
    } else {
      console.log('Ajoute une adresse');
    }
  } else {
    console.log('Panier vide');
  }
} else {
  console.log('Connecte-toi');
}
```

```text
Ajoute une adresse
```

La même logique, aplatie en une chaîne de `else if` qui teste d’abord les cas
d’échec :

```js
const isLoggedIn = true;
const cartItemCount = 2;
const hasAddress = false;

if (!isLoggedIn) {
  console.log('Connecte-toi');
} else if (cartItemCount === 0) {
  console.log('Panier vide');
} else if (!hasAddress) {
  console.log('Ajoute une adresse');
} else {
  console.log('Commande possible');
}
```

```text
Ajoute une adresse
```

Chaque cas est sur une seule ligne de test, et le cas normal arrive à la fin. Tu
retrouveras cette idée avec les fonctions, sous le nom de « retour anticipé ».

## L’opérateur ternaire : choisir une valeur

`if` choisit des **instructions** à exécuter. L’opérateur ternaire choisit une **valeur** :

```js
const itemCount = 3;

const label = itemCount > 1 ? 'articles' : 'article';
console.log(`${itemCount} ${label}`); // → 3 articles
```

Sa forme est `condition ? valeurSiVrai : valeurSiFaux`. Comme il produit une valeur, on
peut le ranger dans une `const`, l’utiliser dans un gabarit de chaîne ou dans un calcul.
Le même résultat avec `if` oblige à utiliser `let` :

```js
const itemCount = 3;

let label;
if (itemCount > 1) {
  label = 'articles';
} else {
  label = 'article';
}
console.log(`${itemCount} ${label}`); // → 3 articles
```

Utilise le ternaire pour un **choix simple entre deux valeurs**. Évite de l’imbriquer :

```js
const score = 14;

// Correct, mais difficile à relire :
const grade = score >= 16 ? 'Très bien' : score >= 12 ? 'Bien' : 'Passable';
console.log(grade); // → Bien
```

Au-delà de deux cas, une chaîne `if / else if / else` est plus claire. N’utilise pas non
plus le ternaire pour déclencher des actions (`ok ? save() : warn()`) : c’est le rôle de
`if`.

## switch : comparer une valeur à une liste de cas

Quand une **même valeur** est comparée à une série de valeurs précises, `switch` est
plus lisible qu’une longue chaîne de `else if` :

```js
const orderStatus = 'shipped';

switch (orderStatus) {
  case 'pending':
    console.log('En attente de paiement');
    break;
  case 'paid':
    console.log('Paiement reçu');
    break;
  case 'shipped':
    console.log('Colis expédié');
    break;
  default:
    console.log(`Statut inconnu : ${orderStatus}`);
}
```

```text
Colis expédié
```

Fonctionnement :

1. JavaScript évalue l’expression entre parenthèses (`orderStatus`).
2. Il la compare, **dans l’ordre**, à chaque `case`, avec l’égalité **stricte** `===`.
3. Au premier cas égal, il exécute les instructions qui suivent…
4. … jusqu’au `break`, qui fait sortir du `switch`.
5. Si aucun cas ne correspond, il exécute le bloc `default` (facultatif, mais
   recommandé pour traiter les valeurs inattendues).

### Le piège du break oublié

Sans `break`, l’exécution **continue dans les cas suivants**, sans les tester. On dit
que l’exécution « tombe » dans le cas suivant (en anglais _fall-through_) :

```js
const code = 1;

switch (code) {
  case 1:
    console.log('un');
  case 2:
    console.log('deux');
  case 3:
    console.log('trois');
    break;
  case 4:
    console.log('quatre');
}
```

```text
un
deux
trois
```

`code` vaut 1, mais les messages des cas 2 et 3 s’affichent aussi, jusqu’au premier
`break`. C’est l’un des bugs les plus fréquents avec `switch`, y compris dans du code
généré.

Ce comportement a pourtant un usage légitime : **regrouper** plusieurs cas qui partagent
le même traitement, en les écrivant l’un sous l’autre sans instruction entre eux.

```js
const day = 'samedi';

switch (day) {
  case 'samedi':
  case 'dimanche':
    console.log('Week-end : ouvert de 10 h à 13 h');
    break;
  case 'lundi':
    console.log('Fermé');
    break;
  default:
    console.log('Ouvert de 9 h à 19 h');
}
```

```text
Week-end : ouvert de 10 h à 13 h
```

### switch compare strictement

Comme `switch` utilise `===`, le type compte :

```js
const level = '2'; // par exemple lu depuis process.argv : une chaîne

switch (level) {
  case 2:
    console.log('Niveau deux');
    break;
  default:
    console.log('Aucun cas ne correspond');
}
```

```text
Aucun cas ne correspond
```

`'2' === 2` est faux. Convertis d’abord (`switch (Number(level))`) ou écris des cas en
chaînes (`case '2':`).

### Les blocs dans un switch

Tous les `case` partagent **le même bloc**, celui des accolades du `switch`. Déclarer la
même constante dans deux cas provoque donc une `SyntaxError` (« already been
declared »). Si un cas a besoin de ses propres variables, entoure ses instructions
d’accolades : `case 'paid': { const message = '...'; console.log(message); break; }`.

## Choisir le bon outil

| Situation                                                           | Outil conseillé       |
| ------------------------------------------------------------------- | --------------------- |
| Exécuter ou non un bloc                                             | `if`                  |
| Deux traitements possibles                                          | `if / else`           |
| Plusieurs cas définis par des intervalles ou des conditions variées | `if / else if / else` |
| Choisir entre deux **valeurs**                                      | ternaire              |
| Une même valeur comparée à une liste de valeurs exactes             | `switch`              |

Ce tableau est une recommandation de lisibilité, pas une règle du langage : un `switch`
peut toujours être réécrit en `if / else if`, et inversement dans beaucoup de cas.

## Pièges fréquents

- **`=` au lieu de `===` dans la condition** : affecte au lieu de comparer.
- **Conditions dans le mauvais ordre** : un test large placé en premier masque les
  suivants.
- **Oubli d’accolades** : une seule instruction dépend du `if`.
- **`break` oublié dans un `switch`** : l’exécution continue dans les cas suivants.
- **Types différents dans un `switch`** : `'2'` ne correspond pas à `case 2`.
- **Ternaires imbriqués** : corrects mais illisibles ; préfère `if / else if`.

## Exercices

### Exercice 1 — L’indice de masse corporelle

À partir de `weightInKg = 70` et `heightInMeters = 1.75`, calcule l’IMC (poids divisé par
la taille au carré), affiche-le avec une décimale, puis la catégorie : moins de 18,5
« insuffisance pondérale », de 18,5 à moins de 25 « corpulence normale », de 25 à moins
de 30 « surpoids », 30 et plus « obésité ». Teste les bornes 18,5, 25 et 30.

:::solution

```js
const weightInKg = 70;
const heightInMeters = 1.75;

const bmi = weightInKg / heightInMeters ** 2;

let category;
if (bmi < 18.5) {
  category = 'insuffisance pondérale';
} else if (bmi < 25) {
  category = 'corpulence normale';
} else if (bmi < 30) {
  category = 'surpoids';
} else {
  category = 'obésité';
}

console.log(`IMC : ${bmi.toFixed(1)} (${category})`);
```

```text
IMC : 22.9 (corpulence normale)
```

`**` est prioritaire sur `/` : `heightInMeters ** 2` est calculé d’abord. Les tests vont
du plus petit seuil au plus grand ; chaque `else if` n’est atteint que si les
précédents sont faux, donc `bmi < 25` signifie en réalité « entre 18,5 inclus et 25
exclu ». Pour tester les bornes, remplace `bmi` par 18.5, 25 et 30 : on obtient
respectivement « corpulence normale », « surpoids » et « obésité », conformément à
l’énoncé.

:::

### Exercice 2 — Le jour de collecte

Une commune collecte les déchets selon le jour : lundi et jeudi, ordures ménagères ;
mercredi, recyclables ; samedi, verre ; les autres jours, pas de collecte. Écris un
`switch` qui affiche la collecte pour `const day = 'jeudi';`. Comment gérer une saisie
comme `'Jeudi '` ?

:::solution

```js
const rawDay = 'Jeudi ';
const day = rawDay.trim().toLowerCase(); // normaliser avant de comparer

switch (day) {
  case 'lundi':
  case 'jeudi':
    console.log('Ordures ménagères');
    break;
  case 'mercredi':
    console.log('Recyclables');
    break;
  case 'samedi':
    console.log('Verre');
    break;
  default:
    console.log('Pas de collecte');
}
```

```text
Ordures ménagères
```

Lundi et jeudi sont regroupés en écrivant deux `case` à la suite. Chaque traitement se
termine par `break`. `switch` compare avec `===` : `'Jeudi '` ne correspondrait à aucun
cas, d’où la normalisation avec `trim` et `toLowerCase` avant le `switch`. Le `default`
couvre aussi les fautes de frappe, ce qui est discutable : une vraie application
distinguerait « pas de collecte » et « jour inconnu ».

:::

### Exercice 3 — Réécrire sans imbrication

Réécris ce code avec une seule chaîne `if / else if / else`, sans imbrication, puis
vérifie qu’il affiche la même chose pour `stock = 0`, `stock = 3` et `stock = 50`.

```js
const stock = 3;

if (stock > 0) {
  if (stock < 5) {
    console.log('Plus que quelques exemplaires');
  } else {
    console.log('En stock');
  }
} else {
  console.log('Rupture de stock');
}
```

:::solution

```js
const stock = 3;

if (stock <= 0) {
  console.log('Rupture de stock');
} else if (stock < 5) {
  console.log('Plus que quelques exemplaires');
} else {
  console.log('En stock');
}
```

```text
Plus que quelques exemplaires
```

On traite d’abord le cas d’échec (rupture), puis le cas limite, puis le cas normal.
Avec `stock = 0`, on obtient « Rupture de stock » ; avec 50, « En stock » : mêmes
résultats que la version imbriquée. On aurait pu écrire `stock === 0`, mais `stock <= 0`
reproduit exactement la condition d’origine (`stock > 0` faux), y compris pour un stock
négatif.

:::

## Récapitulatif

- `if (condition) { ... }` exécute un bloc seulement si la condition est vraie ; écris
  toujours les accolades.
- `else` traite le cas contraire ; `else if` enchaîne des tests, et seule la **première**
  condition vraie est exécutée : l’ordre compte.
- Nomme les conditions complexes avec une constante, et préfère une chaîne de
  `else if` à une imbrication profonde.
- Le ternaire `condition ? a : b` choisit une **valeur** ; ne l’imbrique pas.
- `switch` compare une valeur à des cas avec `===` ; chaque cas se termine par `break`,
  sauf pour regrouper volontairement des cas ; `default` traite l’imprévu.
