---
title: Paramètres, valeurs par défaut, paramètres du reste et retour
summary: Concevoir l’entrée et la sortie d’une fonction, gérer les arguments absents ou en nombre variable, et renvoyer un résultat clair, au besoin avec un retour anticipé.
durationMinutes: 50
sources:
  - title: MDN — Valeurs par défaut des arguments
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Functions/Default_parameters
  - title: MDN — Paramètres du reste
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Functions/rest_parameters
  - title: MDN — return
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/return
---

## Une fonction est un contrat

Une fonction bien conçue ressemble à un contrat : « donne-moi **ceci** (les paramètres),
je te rends **cela** (la valeur de retour) ». Celui qui l’appelle n’a pas besoin de
savoir comment elle travaille, seulement ce qu’elle attend et ce qu’elle renvoie.

Pour que ce contrat soit fiable, il faut savoir ce qui se passe quand l’appelant fournit
trop ou pas assez d’arguments, prévoir des valeurs par défaut, accepter un nombre
variable de valeurs, et renvoyer un résultat sans ambiguïté. C’est l’objet de cette
leçon.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## Arguments manquants ou en trop

JavaScript ne vérifie pas le nombre d’arguments :

```js
function describe(name, city) {
  return `${name} habite à ${city}`;
}

console.log(describe('Léa', 'Brest')); // → Léa habite à Brest
console.log(describe('Léa')); // → Léa habite à undefined
console.log(describe('Léa', 'Brest', 'France')); // → Léa habite à Brest
```

- Un paramètre qui ne reçoit pas d’argument vaut **`undefined`**. Aucune erreur n’est
  signalée : le bug apparaît plus loin, sous forme de `undefined` ou de `NaN`.
- Les arguments en trop sont **ignorés** silencieusement.

Les arguments sont associés aux paramètres **par position** : le premier argument va au
premier paramètre, et ainsi de suite. Inverser deux arguments ne provoque aucune erreur,
seulement un résultat faux :

```js
function computeUnitPrice(total, quantity) {
  return total / quantity;
}

console.log(computeUnitPrice(12, 4)); // → 3
console.log(computeUnitPrice(4, 12)); // → 0.3333333333333333
```

Des noms de paramètres explicites et un ordre logique limitent ce risque.

## Les valeurs par défaut

Un paramètre peut recevoir une **valeur par défaut**, utilisée quand l’argument est
absent :

```js
function computePriceIncludingTax(priceExcludingTax, vatRate = 0.2) {
  return priceExcludingTax * (1 + vatRate);
}

console.log(computePriceIncludingTax(100)); // → 120
console.log(computePriceIncludingTax(100, 0.055)); // → 105.5
console.log(computePriceIncludingTax(100, 0)); // → 100
console.log(computePriceIncludingTax(100, undefined)); // → 120
console.log(computePriceIncludingTax(100, null)); // → 100
```

Règle précise : la valeur par défaut s’applique **uniquement si l’argument vaut
`undefined`** (absent ou passé explicitement comme `undefined`). Un taux de 0 est
conservé, et c’est voulu : 0 est une vraie valeur. Attention à `null` : il est conservé
lui aussi, puis converti en 0 dans le calcul. C’est le même principe que l’opérateur
`??`, à une différence près (`??` remplace aussi `null`).

:::warning[L’ancienne méthode avec ||]
Avant l’arrivée des valeurs par défaut, on écrivait souvent
`vatRate = vatRate || 0.2;` dans le corps de la fonction. Tu le croiseras dans du code
ancien ou généré. Ce code remplace **toute valeur falsy**, donc un taux de 0 devient
0,2 : un produit exonéré de TVA serait facturé avec 20 %. Préfère toujours la syntaxe
`vatRate = 0.2` dans la liste des paramètres.

:::

Quelques précisions :

- La valeur par défaut est une expression, évaluée **à chaque appel** où l’argument
  manque. Elle peut utiliser les paramètres précédents :
  `function createRange(start, end = start + 10) { ... }`.
- Place les paramètres avec valeur par défaut **à la fin** de la liste : pour profiter
  d’un défaut placé au milieu, l’appelant devrait passer `undefined` explicitement.

## Les paramètres du reste

Certaines fonctions acceptent un nombre **variable** d’arguments, comme `Math.max(3, 9, 2)`
ou `console.log`. Pour écrire les tiennes, utilise un **paramètre du reste** : trois
points devant le dernier paramètre.

```js
function sum(...numbers) {
  let total = 0;
  for (const number of numbers) {
    total += number;
  }
  return total;
}

console.log(sum(1, 2, 3)); // → 6
console.log(sum(10)); // → 10
console.log(sum()); // → 0
```

`numbers` est un **tableau** qui contient tous les arguments reçus à cet endroit, même
s’il n’y en a aucun (tableau vide). On le parcourt avec `for...of`.

Le paramètre du reste se combine avec des paramètres classiques, mais il doit être
**le dernier** : il récupère « le reste » des arguments.

```js
function formatList(title, ...items) {
  let text = `${title} (${items.length})`;
  for (const item of items) {
    text += `\n- ${item}`;
  }
  return text;
}

console.log(formatList('Courses', 'pain', 'lait', 'pommes'));
```

```text
Courses (3)
- pain
- lait
- pommes
```

Écrire `function formatList(...items, title)` provoque
`SyntaxError: Rest parameter must be last formal parameter`.

:::note
Ne confonds pas les **paramètres du reste** (`...items` dans la définition, qui
**rassemble** des arguments dans un tableau) avec la **décomposition** (`...` dans un
appel ou un tableau, qui **étale** un tableau en valeurs séparées). Cette seconde
syntaxe est présentée dans la compétence sur les tableaux et les objets.

:::

## Concevoir la valeur de retour

### Renvoyer plutôt qu’afficher

Une fonction qui **renvoie** son résultat est réutilisable : on peut l’afficher,
l’utiliser dans un calcul, le passer à une autre fonction, le tester. Une fonction qui
**affiche** son résultat ne sert qu’à afficher.

```js
// Peu réutilisable : affiche et ne renvoie rien
function printDiscount(total) {
  console.log(total * 0.1);
}

// Réutilisable : renvoie, l’appelant décide quoi faire du résultat
function computeDiscount(total) {
  return total * 0.1;
}

const discount = computeDiscount(80);
console.log(`Remise : ${discount} €`); // → Remise : 8 €
console.log(`À payer : ${80 - discount} €`); // → À payer : 72 €
```

### Le retour anticipé

`return` arrête la fonction. On s’en sert pour traiter les cas particuliers **dès le
début**, puis écrire le cas normal sans imbrication. On parle de **retour anticipé** ou
de **clause de garde** (_guard clause_) :

```js
function getShippingCost(country, subtotal) {
  if (country !== 'FR') {
    return 12;
  }
  if (subtotal >= 60) {
    return 0;
  }
  return 4.9;
}

console.log(getShippingCost('BE', 100)); // → 12
console.log(getShippingCost('FR', 60)); // → 0
console.log(getShippingCost('FR', 20)); // → 4.9
```

Chaque cas particulier sort immédiatement, et la dernière ligne est le cas général. Cette
écriture remplace avantageusement des `if / else` imbriqués. Vérifie toujours que
**tous les chemins** se terminent par un `return` : un chemin oublié renvoie `undefined`.

### Signaler une entrée invalide

Que doit faire une fonction qui reçoit un argument impossible, comme une quantité
négative ? Deux approches courantes :

- **lancer une erreur** (`throw`), quand l’appelant a commis une faute qu’il doit
  corriger ;
- **renvoyer une valeur spéciale** (`null`, par exemple), quand l’absence de résultat
  est un cas normal, comme « aucun produit trouvé ».

```js
function computeLineTotal(unitPrice, quantity) {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantité invalide : ${quantity}`);
  }
  return unitPrice * quantity;
}

try {
  console.log(computeLineTotal(2.5, 4));
  console.log(computeLineTotal(2.5, -1));
} catch (error) {
  console.log(`Erreur : ${error.message}`);
}
```

```text
10
Erreur : Quantité invalide : -1
```

C’est ici que `throw` prend tout son sens : l’erreur est détectée **dans** la fonction,
mais traitée **par l’appelant**, qui sait quoi en faire (afficher un message, ignorer la
ligne, arrêter le script). La fonction n’a pas à connaître le contexte.

### Renvoyer plusieurs informations

Une fonction ne renvoie qu’**une** valeur. Pour transmettre plusieurs informations, on
renvoie un **objet** qui les regroupe :

```js
function analyzeTemperatures(...temperatures) {
  let min = temperatures[0];
  let max = temperatures[0];
  for (const temperature of temperatures) {
    if (temperature < min) {
      min = temperature;
    }
    if (temperature > max) {
      max = temperature;
    }
  }
  return { min: min, max: max, amplitude: max - min };
}

const report = analyzeTemperatures(4, -2, 11, 7);
console.log(report); // → { min: -2, max: 11, amplitude: 13 }
console.log(`Amplitude : ${report.amplitude} °C`); // → Amplitude : 13 °C
```

Quand le nom de la propriété est identique au nom de la variable, on peut abréger
`{ min: min, max: max }` en `{ min, max }`. Tu verras cette syntaxe et d’autres en
détail avec les objets.

## Pièges fréquents

- **Argument manquant non détecté** : le paramètre vaut `undefined`, le résultat devient
  `NaN`. Correction : valeur par défaut, ou vérification et `throw`.
- **`param = param || défaut`** : écrase 0, `''` et `false`. Correction : valeur par
  défaut dans la signature.
- **Valeur par défaut au milieu de la liste** : inutilisable sans passer `undefined`.
- **Paramètre du reste qui n’est pas le dernier** : `SyntaxError`.
- **Chemin sans `return`** : la fonction renvoie `undefined` pour certains cas.
- **Afficher au lieu de renvoyer** : résultat inutilisable par l’appelant.

## Exercices

### Exercice 1 — Le message de bienvenue

Écris `buildWelcomeMessage(firstName, greeting = 'Bonjour')` qui renvoie par exemple
`'Bonjour Ana !'`. Si `firstName` est absent ou ne contient que des espaces, la
fonction renvoie `'Bonjour !'` (avec la formule choisie). Teste quatre appels :
`('Ana')`, `('Ana', 'Salut')`, `()`, `('   ', 'Bonsoir')`.

:::solution

```js
function buildWelcomeMessage(firstName, greeting = 'Bonjour') {
  if (firstName === undefined || firstName.trim() === '') {
    return `${greeting} !`;
  }
  return `${greeting} ${firstName.trim()} !`;
}

console.log(buildWelcomeMessage('Ana'));
console.log(buildWelcomeMessage('Ana', 'Salut'));
console.log(buildWelcomeMessage());
console.log(buildWelcomeMessage('   ', 'Bonsoir'));
```

```text
Bonjour Ana !
Salut Ana !
Bonjour !
Bonsoir !
```

La valeur par défaut s’applique quand `greeting` est absent. Le cas particulier
(prénom absent ou vide) est traité par un retour anticipé ; le test `=== undefined` est
placé avant `trim()` pour ne pas l’appeler sur `undefined`.

:::

### Exercice 2 — La moyenne de rien du tout

Écris `average(...values)` qui renvoie la moyenne des nombres reçus, et `null` si aucun
nombre n’est fourni. Pourquoi `null` plutôt que `0` ou `NaN` ? Teste `average(12, 15, 9)`
et `average()`.

:::solution

```js
function average(...values) {
  if (values.length === 0) {
    return null; // pas de moyenne possible sans valeur
  }
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total / values.length;
}

console.log(average(12, 15, 9));
console.log(average());
console.log(average() ?? 'aucune note');
```

```text
12
null
aucune note
```

Sans le retour anticipé, `average()` calculerait `0 / 0`, soit `NaN`, une valeur qui se
propage silencieusement dans les calculs. `0` serait une moyenne fausse (on n’a pas eu
zéro). `null` dit clairement « pas de résultat », et l’appelant peut fournir un repli
avec `??`. Lancer une erreur serait aussi défendable si une liste vide est une faute de
l’appelant.

:::

### Exercice 3 — Corriger une valeur par défaut

Ce code facture un produit alimentaire exonéré (taux 0) comme s’il était taxé à 20 %.
Explique pourquoi, puis corrige-le.

```js
function computePrice(priceExcludingTax, vatRate) {
  vatRate = vatRate || 0.2;
  return priceExcludingTax * (1 + vatRate);
}

console.log(computePrice(10, 0));
```

:::solution
`0` est falsy : `vatRate || 0.2` le remplace par 0,2, et le programme affiche 12 au lieu
de 10. Réaffecter un paramètre est en plus une source de confusion.

```js
function computePrice(priceExcludingTax, vatRate = 0.2) {
  return priceExcludingTax * (1 + vatRate);
}

console.log(computePrice(10, 0));
console.log(computePrice(10));
```

```text
10
12
```

La valeur par défaut de la signature ne s’applique que si l’argument vaut `undefined` :
le taux 0 est respecté, et l’appel sans taux utilise toujours 20 %.

:::

## Récapitulatif

- Les arguments sont associés aux paramètres par position ; un paramètre sans argument
  vaut `undefined`, les arguments en trop sont ignorés.
- `param = valeur` dans la signature fixe une valeur par défaut, utilisée seulement si
  l’argument vaut `undefined`. Mets ces paramètres en fin de liste.
- `...rest` en dernier paramètre rassemble les arguments restants dans un tableau.
- Préfère renvoyer un résultat plutôt que l’afficher.
- Le retour anticipé traite les cas particuliers d’abord ; chaque chemin doit se
  terminer par un `return`.
- Pour une entrée invalide, lance une erreur que l’appelant traitera ; pour une absence
  normale de résultat, renvoie par exemple `null`.
- Pour renvoyer plusieurs informations, renvoie un objet.
