---
title: Types primitifs et conversions
summary: Reconnaître les types de valeurs avec typeof, convertir explicitement, détecter NaN et maîtriser la précision des nombres à virgule.
durationMinutes: 60
sources:
  - title: MDN — Types et structures de données en JavaScript
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Data_structures
  - title: MDN — typeof
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/typeof
  - title: MDN — Number.isNaN()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
  - title: MDN — Number.prototype.toFixed()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed
---

## Le problème : 20 n’est pas « 20 »

Un client tape `20` dans un formulaire pour indiquer le montant qu’il donne. Ton programme
calcule la monnaie à rendre :

```js
const paidAmount = '20'; // ce que fournit un formulaire ou process.argv : du texte
const total = 8.5;

console.log(paidAmount + total);
console.log(paidAmount - total);
```

```text
208.5
11.5
```

La même valeur donne deux comportements différents selon l’opérateur. Pourquoi ? Parce
que `'20'` n’est pas un **nombre** mais une **chaîne de caractères** : le texte composé
du caractère « 2 » puis du caractère « 0 ». Avec `+`, JavaScript colle les textes ; avec
`-`, il convertit en nombre. Comprendre les **types** des valeurs et leurs
**conversions** est la clé pour éviter ce genre de bug, qui n’affiche aucune erreur et
produit simplement un résultat faux.

## Les types primitifs

Chaque valeur JavaScript a un **type**. Les valeurs les plus simples sont dites
**primitives**. Il en existe sept :

| Type        | Exemples                          | Usage                                     |
| ----------- | --------------------------------- | ----------------------------------------- |
| `number`    | `42`, `-3.5`, `1e2`, `NaN`        | Tous les nombres, entiers ou à virgule    |
| `string`    | `'Lyon'`, `"42"`, `` `Bonjour` `` | Du texte                                  |
| `boolean`   | `true`, `false`                   | Vrai ou faux                              |
| `undefined` | `undefined`                       | Pas encore de valeur                      |
| `null`      | `null`                            | Absence de valeur, choisie volontairement |
| `bigint`    | `10n`                             | Entiers arbitrairement grands (rare)      |
| `symbol`    | `Symbol('id')`                    | Identifiants uniques (usage avancé)       |

Tout le reste (les listes, les objets, les fonctions) est un **objet** : tu les
découvriras dans les compétences suivantes. Pour l’instant, concentre-toi sur les cinq
premiers types ; `bigint` et `symbol` sont cités pour que tu les reconnaisses.

Quelques précisions :

- JavaScript n’a **qu’un seul type** pour les entiers et les nombres à virgule. On écrit
  la virgule avec un **point** : `1.15`, jamais `1,15`. La notation scientifique est
  acceptée : `1e2` vaut 100, `2.5e-3` vaut 0,0025.
- `undefined` est la valeur d’une variable déclarée sans affectation, ou d’un argument
  absent comme `process.argv[2]` quand rien n’est tapé.
- `null` est une valeur que le programmeur affecte **exprès** pour dire « il n’y a rien
  ici ». Par exemple, `let selectedProduct = null;` avant que l’utilisateur ait choisi.

## Connaître le type avec typeof

L’opérateur `typeof` renvoie, **sous forme de chaîne**, le nom du type d’une valeur.

Dans les exemples suivants, le commentaire `// →` indique exactement ce qu’affiche la
ligne : c’est une convention de ce cours, pas une syntaxe JavaScript.

```js
console.log(typeof 42); // → number
console.log(typeof 3.14); // → number
console.log(typeof '42'); // → string
console.log(typeof true); // → boolean
console.log(typeof undefined); // → undefined
console.log(typeof 10n); // → bigint
console.log(typeof NaN); // → number
console.log(typeof null); // → object
console.log(typeof typeof 42); // → string
```

Deux résultats surprennent :

- `typeof NaN` vaut `'number'`. NaN (_Not a Number_) est une valeur **spéciale du type
  number** qui signifie « résultat numérique invalide ». Le nom est trompeur, le type ne
  l’est pas.
- `typeof null` vaut `'object'`. C’est une erreur historique des premières versions de
  JavaScript, conservée pour ne pas casser les sites existants. `null` est bien un type
  primitif. Pour savoir si une valeur est `null`, on ne se fie donc pas à `typeof` : on
  compare directement avec `value === null`.

```js
const selectedProduct = null;

console.log(typeof selectedProduct === 'object'); // → true
console.log(selectedProduct === null); // → true
```

La dernière ligne de l’exemple précédent, `typeof typeof 42`, montre aussi que `typeof`
renvoie **toujours une chaîne** : `typeof 42` vaut `'number'`, dont le type est
`'string'`. On compare donc le résultat de `typeof` à une chaîne :
`typeof value === 'number'`.

## Convertir explicitement

Une **conversion explicite** est une conversion que tu écris toi-même, visiblement,
dans le code. C’est la bonne pratique : le lecteur voit l’intention.

### Vers un nombre : Number, parseFloat, parseInt, +

```js
console.log(Number('42')); // → 42
console.log(Number('21.5')); // → 21.5
console.log(Number('  42  ')); // → 42
console.log(Number('1e2')); // → 100
console.log(Number('12px')); // → NaN
console.log(Number('3,5')); // → NaN
console.log(Number('abc')); // → NaN
console.log(Number('')); // → 0
console.log(Number(' ')); // → 0
console.log(Number(true)); // → 1
console.log(Number(false)); // → 0
console.log(Number(null)); // → 0
console.log(Number(undefined)); // → NaN
```

`Number(value)` est **strict** : toute la chaîne (hors espaces au début et à la fin) doit
représenter un nombre, sinon le résultat est `NaN`. Attention à deux cas limites : la
chaîne vide et une chaîne d’espaces donnent `0`, pas `NaN`. Une saisie vide passerait
donc inaperçue si tu ne testes que `NaN`.

```js
console.log(parseFloat('12px')); // → 12
console.log(parseFloat('21.5 €')); // → 21.5
console.log(parseFloat('3,5')); // → 3
console.log(parseFloat('abc')); // → NaN
console.log(parseFloat('')); // → NaN
console.log(parseInt('21.5', 10)); // → 21
console.log(parseInt('  7 kg', 10)); // → 7
console.log(+'3.5'); // → 3.5
console.log(+''); // → 0
console.log(+'12px'); // → NaN
```

- `parseFloat` lit la chaîne **depuis le début** et s’arrête au premier caractère qui ne
  peut plus faire partie d’un nombre. Il est **tolérant** : `'12px'` donne 12, et
  `'3,5'` donne 3 sans aucun avertissement, ce qui peut cacher une saisie erronée.
- `parseInt` fait de même mais ne garde que la partie **entière** : `'21.5'` devient 21. Passe-lui toujours `10` en second argument pour indiquer la base décimale.
- Le **`+` unaire**, placé devant une seule valeur, convertit comme `Number`. Il est
  court mais discret : `Number(value)` est plus lisible pour un débutant comme pour un
  relecteur.

Lequel choisir ? Pour valider une saisie, `Number` est le plus sûr parce qu’il refuse
les valeurs partiellement numériques. `parseFloat` sert quand tu **veux** extraire un
nombre au début d’un texte, par exemple `'12px'` dans du CSS.

### Vers une chaîne : String et toString

```js
const quantity = 3;
console.log(String(quantity) + String(4)); // → 34
console.log(quantity.toString()); // → 3
console.log(String(null)); // → null
console.log(String(undefined)); // → undefined
console.log(String(Number('3.50'))); // → 3.5
```

`String(value)` fonctionne avec toutes les valeurs, y compris `null` et `undefined`.
La méthode `.toString()` produit le même texte pour un nombre, mais provoque une erreur
sur `null` ou `undefined`. Remarque que la saisie `'3.50'` devient `3.5` : un nombre ne
retient pas les zéros inutiles. Pour afficher deux décimales, il faut `toFixed`, vu plus bas.

## NaN, la valeur qui n’est égale à rien

`NaN` apparaît dès qu’un calcul numérique n’a pas de sens : une conversion ratée, `0 / 0`,
ou une opération avec `undefined`.

```js
console.log(Number('abc') * 2); // → NaN
console.log(undefined + 1); // → NaN
console.log(0 / 0); // → NaN
console.log(NaN === NaN); // → false
console.log(Number.isNaN(NaN)); // → true
console.log(Number.isNaN(Number('abc'))); // → true
console.log(Number.isNaN(42)); // → false
```

`NaN` est **contagieux** : tout calcul qui l’utilise produit `NaN`. Et surtout, `NaN` n’est
égal à **rien, pas même à lui-même**. Une condition comme `value === NaN` est donc
toujours fausse. Pour le détecter, utilise `Number.isNaN(value)`.

:::warning[Number.isNaN, pas isNaN]
Il existe aussi une fonction globale `isNaN`, plus ancienne, qui **convertit** d’abord
son argument en nombre : `isNaN('abc')` vaut `true` parce que `'abc'` devient `NaN`,
mais `isNaN(undefined)` vaut aussi `true`. `Number.isNaN` ne convertit rien et répond
uniquement à la question « cette valeur est-elle exactement `NaN` ? » :
`Number.isNaN('abc')` vaut `false`, car `'abc'` est une chaîne. Convertis d’abord avec
`Number`, puis teste avec `Number.isNaN` : chaque étape est explicite.
:::

### Valider une saisie

Voici un script `double.js` qui double le nombre passé en argument, et refuse proprement
une saisie invalide. Il combine `process.argv`, `Number`, `Number.isNaN` et une
condition :

```js
// double.js — usage : node double.js <nombre>
const input = process.argv[2];
const value = Number(input);

if (input === undefined) {
  console.error('Argument manquant. Usage : node double.js <nombre>');
  process.exitCode = 1;
} else if (input.trim() === '' || Number.isNaN(value)) {
  console.error(`Valeur invalide : "${input}"`);
  process.exitCode = 1;
} else {
  console.log(`Le double de ${value} est ${value * 2}`);
}
```

```bash
node double.js 21.5
node double.js 12px
node double.js ""
node double.js
```

```text
Le double de 21.5 est 43
Valeur invalide : "12px"
Valeur invalide : ""
Argument manquant. Usage : node double.js <nombre>
```

- `else if` enchaîne un deuxième test quand le premier est faux. Le cas
  `input === undefined` est traité **en premier** : appeler `input.trim()` sur
  `undefined` provoquerait une erreur.
- `input.trim() === ''` refuse une chaîne vide ou faite d’espaces, que `Number`
  convertirait en 0. `trim` retire les espaces au début et à la fin ; tu le reverras
  dans la leçon sur les chaînes. `||` signifie « ou » : il suffit qu’un des deux tests
  soit vrai.
- `Number.isNaN(value)` refuse toutes les autres saisies non numériques.
- La syntaxe `` `Le double de ${value}` `` est un gabarit de chaîne : `${...}` insère
  une valeur dans le texte. Elle est détaillée dans la leçon sur les chaînes.

## Les conversions implicites

Quand un opérateur reçoit des valeurs d’un type inattendu, JavaScript les **convertit
automatiquement**. On parle de conversion implicite, ou de **coercition**. Les règles
sont précises, mais pas toujours intuitives :

```js
console.log('5' + 3); // → 53
console.log('5' - 3); // → 2
console.log('5' * '2'); // → 10
console.log('10' / 4); // → 2.5
console.log(true + 1); // → 2
console.log('3' + 4 + 5); // → 345
console.log(3 + 4 + '5'); // → 75
console.log('prix : ' + 4.5); // → prix : 4.5
```

- `+` est à double emploi : **addition** de nombres et **concaténation** (mise bout à
  bout) de chaînes. Dès qu’un des deux côtés est une chaîne, l’autre est converti en
  chaîne et les textes sont collés.
- `-`, `*`, `/` et `%` n’ont qu’un sens numérique : ils convertissent leurs deux côtés
  en nombre.
- Les opérations s’évaluent de gauche à droite : `'3' + 4` donne `'34'`, puis
  `'34' + 5` donne `'345'`. À l’inverse, `3 + 4` donne 7, puis `7 + '5'` donne `'75'`.
- `true` devient 1 et `false` devient 0 dans un calcul.

La conversion implicite « fonctionne » parfois par chance : `'20' - 8.5` donne bien
11,5. Mais il suffit de remplacer `-` par `+` pour que tout casse. **Convertis
explicitement les données qui arrivent sous forme de texte**, dès leur lecture, puis
travaille avec des nombres.

## La précision des nombres à virgule

### Le constat

```js
console.log(0.1 + 0.2); // → 0.30000000000000004
console.log(0.1 + 0.2 === 0.3); // → false
console.log(1.3 * 3); // → 3.9000000000000004
console.log(8.5 * 0.05); // → 0.42500000000000004
```

Ce n’est pas un bug de JavaScript. Les nombres sont stockés en **binaire**, en virgule
flottante (format défini par la norme IEEE 754, utilisé par la plupart des langages).
Or beaucoup de nombres décimaux simples, comme 0,1, n’ont pas de représentation binaire
exacte, de la même manière que 1/3 n’a pas d’écriture décimale exacte (0,333…). Le
nombre stocké est la valeur binaire la plus proche, et les minuscules écarts
s’accumulent dans les calculs.

### Arrondir à l’affichage avec toFixed

`toFixed(n)` formate un nombre avec exactement `n` décimales :

```js
const total = 1.3 * 3;

console.log(total.toFixed(2)); // → 3.90
console.log((5).toFixed(2)); // → 5.00
console.log(typeof total.toFixed(2)); // → string
console.log(total.toFixed(2) + 1); // → 3.901
```

Trois choses à retenir :

1. `toFixed` renvoie une **chaîne**, pas un nombre. Ajouter 1 au résultat concatène.
   Utilise donc `toFixed` à la toute fin, pour **afficher**, jamais au milieu d’un
   calcul.
2. `toFixed` ne modifie pas la variable : `total` vaut toujours 3.9000000000000004.
3. Les parenthèses de `(5).toFixed(2)` sont nécessaires : `5.toFixed(2)` est une
   `SyntaxError`, car JavaScript lirait le point comme une virgule décimale.

Si tu veux un **nombre** arrondi à deux décimales au plus, sans zéros inutiles,
reconvertis la chaîne : `Number((1.3 * 3).toFixed(2))` vaut `3.9`, et
`Number((21.5 * 9 / 5 + 32).toFixed(2))` vaut `70.7`.

L’arrondi de `toFixed` hérite lui aussi de la représentation binaire :

```js
console.log((1.005).toFixed(2)); // → 1.00
console.log((8.075).toFixed(2)); // → 8.07
console.log((2.5).toFixed(0)); // → 3
```

On attendrait 1.01 et 8.08. Mais le nombre réellement stocké pour 1,005 est très
légèrement **inférieur** à 1,005, et l’arrondi se fait vers le bas. Pour un affichage,
cet écart d’un centime est souvent acceptable ; pour de la comptabilité, il ne l’est
pas.

### Calculer en centimes

La solution professionnelle pour l’argent est de travailler avec des **entiers**, en
centimes. Les entiers (jusqu’à de très grandes valeurs) sont représentés exactement :

```js
const breadPriceInCents = 130;
const breadQuantity = 3;
const totalInCents = breadPriceInCents * breadQuantity;

console.log(totalInCents); // → 390
console.log((totalInCents / 100).toFixed(2)); // → 3.90
```

Si une valeur arrive en euros, convertis-la en centimes avec `Math.round` :

```js
console.log(1.3 * 100); // → 130
console.log(1.005 * 100); // → 100.49999999999999
console.log(Math.round(1.005 * 100)); // → 100
console.log(Math.round(19.99 * 100)); // → 1999
```

### Les fonctions d’arrondi de Math

`Math` regroupe des outils mathématiques prêts à l’emploi :

```js
console.log(Math.round(2.4)); // → 2
console.log(Math.round(2.5)); // → 3
console.log(Math.round(-2.5)); // → -2
console.log(Math.floor(2.9)); // → 2
console.log(Math.floor(-2.5)); // → -3
console.log(Math.ceil(2.1)); // → 3
console.log(Math.trunc(-2.7)); // → -2
```

- `Math.round` arrondit à l’entier le plus proche ; un `.5` exact est arrondi vers le
  haut, c’est-à-dire vers +∞ : d’où `-2` pour `-2.5`.
- `Math.floor` arrondit vers le bas (vers −∞), `Math.ceil` vers le haut.
- `Math.trunc` supprime simplement la partie décimale.

Tous renvoient un **nombre**, contrairement à `toFixed`.

:::tip[Ne pas comparer des nombres à virgule avec ===]
Comme `0.1 + 0.2 === 0.3` est faux, évite de comparer directement deux résultats de
calcul à virgule. Travaille en centimes (des entiers), ou compare après arrondi.
:::

## Pièges fréquents

- **Additionner une saisie texte** : `paidAmount + total` concatène. Correction :
  `Number(paidAmount) + total`.
- **Tester `NaN` avec `===`** : toujours faux. Correction : `Number.isNaN(value)`.
- **Oublier la chaîne vide** : `Number('')` vaut 0. Correction : tester aussi
  `input.trim() === ''`.
- **Utiliser `parseInt` sur un prix** : `parseInt('21.5', 10)` donne 21. Correction :
  `Number`, ou `parseFloat` si un suffixe est attendu.
- **Arrondir trop tôt** : `toFixed` au milieu d’un calcul renvoie une chaîne et
  accumule les erreurs d’arrondi. Correction : calculer avec les valeurs complètes,
  arrondir à l’affichage, ou calculer en centimes.
- **Se fier à `typeof` pour `null`** : `typeof null` vaut `'object'`. Correction :
  `value === null`.

## Exercices

### Exercice 1 — Quel type ?

Prévois ce qu’affiche chaque ligne, puis vérifie.

```js
console.log(typeof '3.14');
console.log(typeof Number('3.14'));
console.log(typeof Number('trois'));
console.log(typeof (4.5).toFixed(1));
console.log(typeof process.argv[2]);
console.log(typeof null);
console.log(typeof (1 > 0));
```

:::solution
En lançant le script sans argument :

```text
string
number
number
string
undefined
object
boolean
```

- `'3.14'` est une chaîne, même si elle ressemble à un nombre.
- `Number('3.14')` est un nombre ; `Number('trois')` vaut `NaN`, qui est **de type
  number**.
- `toFixed` renvoie toujours une chaîne.
- Sans argument, `process.argv[2]` vaut `undefined` ; avec un argument, ce serait
  `'string'`.
- `typeof null` vaut `'object'` : l’erreur historique du langage.
- `1 > 0` est une comparaison : son résultat est le booléen `true`.

:::

### Exercice 2 — Le convertisseur de saisies

Pour chacune de ces saisies, prévois le résultat de `Number(input)`,
`parseFloat(input)` et `Number.isNaN(Number(input))` : `'42'`, `'4.2kg'`, `''`, `'1e3'`,
`'4,2'`. Écris ensuite le script qui affiche ces résultats pour vérifier.

:::solution

```js
console.log(Number('42'), parseFloat('42'), Number.isNaN(Number('42')));
console.log(
  Number('4.2kg'),
  parseFloat('4.2kg'),
  Number.isNaN(Number('4.2kg')),
);
console.log(Number(''), parseFloat(''), Number.isNaN(Number('')));
console.log(Number('1e3'), parseFloat('1e3'), Number.isNaN(Number('1e3')));
console.log(Number('4,2'), parseFloat('4,2'), Number.isNaN(Number('4,2')));
```

```text
42 42 false
NaN 4.2 true
0 NaN false
1000 1000 false
NaN 4 true
```

Points à remarquer : `Number('')` vaut 0, donc `Number.isNaN` ne détecte pas la saisie
vide ; `parseFloat('4,2')` renvoie 4 sans prévenir, ce qui serait une erreur silencieuse
dans un formulaire français. La notation `1e3` est reconnue par les deux fonctions.
:::

### Exercice 3 — Le ticket en centimes

Un client achète 3 baguettes à 1,30 € et 2 tartelettes à 2,85 €. Calcule le total en
centimes, puis affiche `Total : 9.60 €`. Montre aussi ce qu’afficherait le calcul direct
en euros, sans arrondi.

:::solution

```js
const baguettePriceInCents = 130;
const tartPriceInCents = 285;

const totalInCents = baguettePriceInCents * 3 + tartPriceInCents * 2;

console.log(`Total : ${(totalInCents / 100).toFixed(2)} €`);
console.log(1.3 * 3 + 2.85 * 2); // calcul direct en euros, pour comparaison
```

```text
Total : 9.60 €
9.600000000000001
```

En centimes, tout le calcul se fait sur des entiers exacts (390 + 570 = 960). La
division par 100 et `toFixed(2)` n’interviennent qu’à l’affichage. Le calcul direct en
euros montre l’écart dû à la virgule flottante binaire.
:::

## Récapitulatif

- Sept types primitifs : `number`, `string`, `boolean`, `undefined`, `null`, `bigint`,
  `symbol`. Tout le reste est un objet.
- `typeof` renvoie le nom du type sous forme de chaîne ; `typeof null` vaut `'object'`
  (erreur historique), on teste donc `value === null`.
- Convertis explicitement : `Number` (strict), `parseFloat` (tolérant, lit le début),
  `parseInt(value, 10)` (partie entière), `+` unaire (comme `Number`, moins lisible),
  `String`.
- `Number('')` et `Number(' ')` valent 0 : teste aussi la chaîne vide.
- `NaN` n’est égal à rien ; détecte-le avec `Number.isNaN`, pas avec `===` ni `isNaN`.
- `+` concatène dès qu’un côté est une chaîne ; `-`, `*`, `/` convertissent en nombre.
- Les nombres à virgule sont approximés en binaire : `0.1 + 0.2 !== 0.3`. Arrondis à
  l’affichage avec `toFixed` (qui renvoie une chaîne) ou calcule en centimes.
