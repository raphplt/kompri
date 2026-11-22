---
title: Les tableaux
summary: Ranger des valeurs dans l’ordre, les lire, les ajouter, les retirer et les parcourir.
durationMinutes: 45
sources:
  - title: MDN — Array
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array
  - title: MDN — Collections indexées
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Indexed_collections
---

## Pourquoi des tableaux ?

Jusqu’ici, chaque donnée vivait dans sa propre variable : `const score1 = 12`, `const score2 = 15`…
Cela devient vite ingérable. Combien de variables pour une classe de trente élèves ? Comment
calculer une moyenne si l’on ne connaît pas le nombre de notes à l’avance ?

Un **tableau** (`Array` en anglais) résout ce problème : c’est une liste **ordonnée** de valeurs,
rangée dans une seule variable. Chaque valeur occupe une position numérotée, appelée **index**.
Les tableaux sont partout dans une application web : la liste des produits d’un panier, les
messages d’une conversation, les lignes renvoyées par une base de données.

Dans cette leçon, tu apprends à créer un tableau, à lire ses éléments, à le modifier et à le
parcourir. Les leçons suivantes montreront comment le transformer d’un seul geste.

:::note[Comment exécuter les exemples]
Chaque exemple est un fichier complet. Enregistre-le, par exemple sous `example.js`, puis
lance `node example.js` dans un terminal. Les sorties affichées sont celles de Node.js 24.
La console d’un navigateur présente les tableaux un peu différemment (avec un triangle
dépliable), mais les valeurs sont les mêmes.
:::

## Créer un tableau et lire ses éléments

On écrit un tableau entre crochets, les éléments séparés par des virgules :

```js
const fruits = ['pomme', 'banane', 'cerise'];

console.log(fruits);
console.log(fruits.length);
console.log(fruits[0]);
console.log(fruits[2]);
console.log(fruits[3]);
console.log(fruits.at(-1));
console.log(fruits[fruits.length - 1]);
```

Sortie :

```text
[ 'pomme', 'banane', 'cerise' ]
3
pomme
cerise
undefined
cerise
cerise
```

Ce qu’il faut retenir :

- **Les index commencent à 0.** Le premier élément est `fruits[0]`, le dernier est
  `fruits[fruits.length - 1]`.
- `length` donne le nombre d’éléments. Ce n’est pas une fonction : on écrit `fruits.length`,
  sans parenthèses.
- Lire un index qui n’existe pas ne provoque **pas d’erreur** : on obtient `undefined`.
  C’est pratique, mais cela peut masquer une faute de calcul d’index.
- La méthode `at()` accepte un index négatif : `at(-1)` est le dernier élément, `at(-2)`
  l’avant-dernier. C’est plus lisible que `fruits[fruits.length - 1]`. Attention, la notation
  entre crochets, elle, ne comprend pas les index négatifs : `fruits[-1]` vaut `undefined`.

Un tableau peut contenir n’importe quel type de valeur, y compris des types mélangés
(`[1, 'deux', true]`), d’autres tableaux ou des objets. En pratique, on garde des tableaux
**homogènes** : une liste de nombres, une liste de noms, une liste de produits. Le code qui les
parcourt est alors beaucoup plus simple.

### Un tableau est un objet

```js
const colors = ['rouge', 'vert'];
const moreColors = colors.concat(['bleu'], 'jaune');

console.log(moreColors);
console.log(moreColors.join(', '));
console.log('a-b-c'.split('-'));
console.log(typeof colors);
console.log(Array.isArray(colors));
console.log(Array.isArray('rouge'));
```

Sortie :

```text
[ 'rouge', 'vert', 'bleu', 'jaune' ]
rouge, vert, bleu, jaune
[ 'a', 'b', 'c' ]
object
true
false
```

`typeof` renvoie `'object'` pour un tableau : en JavaScript, les tableaux sont des objets
particuliers. Pour savoir si une valeur est un tableau, on utilise `Array.isArray()`.

Au passage, trois méthodes utiles :

- `concat()` renvoie un **nouveau** tableau qui assemble le tableau d’origine et les valeurs
  reçues ;
- `join(separator)` assemble les éléments en une chaîne, séparés par `separator` ;
- à l’inverse, la méthode de chaîne `split(separator)` découpe une chaîne en tableau.

## Modifier un tableau

### Remplacer, ajouter et retirer aux extrémités

```js
const tasks = ['Lire la leçon', 'Faire les exercices'];

tasks[1] = 'Faire les deux exercices'; // remplace l’élément d’index 1
tasks.push('Relire le récapitulatif'); // ajoute à la fin
console.log(tasks);
console.log(tasks.length);

const last = tasks.pop(); // retire et renvoie le dernier
console.log(last);

tasks.unshift('Préparer un café'); // ajoute au début
const first = tasks.shift(); // retire et renvoie le premier
console.log(first);
console.log(tasks);
```

Sortie :

```text
[
  'Lire la leçon',
  'Faire les deux exercices',
  'Relire le récapitulatif'
]
3
Relire le récapitulatif
Préparer un café
[ 'Lire la leçon', 'Faire les deux exercices' ]
```

Node affiche le tableau sur plusieurs lignes quand il devient trop long : c’est seulement de la
mise en forme.

| Méthode      | Effet                     | Valeur renvoyée      |
| ------------ | ------------------------- | -------------------- |
| `push(v)`    | ajoute `v` à la fin       | la nouvelle longueur |
| `pop()`      | retire le dernier élément | l’élément retiré     |
| `unshift(v)` | ajoute `v` au début       | la nouvelle longueur |
| `shift()`    | retire le premier élément | l’élément retiré     |

:::note[`const` et un tableau qu’on modifie]
`tasks` est déclaré avec `const`, et pourtant on le modifie. Ce n’est pas une contradiction :
`const` interdit de **réaffecter la variable** (`tasks = []` provoquerait une `TypeError`),
pas de modifier le contenu du tableau. La variable désigne toujours le même tableau ; c’est
ce tableau qui change. La leçon sur les références reviendra en détail sur cette distinction.
:::

### Retirer ou insérer au milieu : `splice` et `slice`

Deux méthodes aux noms très proches font des choses très différentes.

```js
const letters = ['a', 'b', 'c', 'd', 'e'];

const removed = letters.splice(1, 2); // à partir de l’index 1, retire 2 éléments
console.log(removed);
console.log(letters);

letters.splice(1, 0, 'x', 'y'); // à l’index 1, retire 0 élément et insère 'x', 'y'
console.log(letters);

const middle = letters.slice(1, 3); // copie des index 1 et 2 (3 exclu)
console.log(middle);
console.log(letters); // inchangé par slice
```

Sortie :

```text
[ 'b', 'c' ]
[ 'a', 'd', 'e' ]
[ 'a', 'x', 'y', 'd', 'e' ]
[ 'x', 'y' ]
[ 'a', 'x', 'y', 'd', 'e' ]
```

- `splice(start, deleteCount, ...items)` **modifie** le tableau : il retire `deleteCount`
  éléments à partir de `start`, insère éventuellement de nouveaux éléments à cet endroit, et
  renvoie un tableau des éléments retirés.
- `slice(start, end)` **ne modifie pas** le tableau : il renvoie une copie de la portion qui
  va de `start` inclus à `end` exclu. Sans argument, `slice()` copie tout le tableau.

Cette différence entre méthodes **qui modifient** (on dit qu’elles **mutent** le tableau) et
méthodes **qui renvoient un nouveau tableau** est l’une des plus importantes de cette
compétence. Avant d’utiliser une méthode, demande-toi toujours : modifie-t-elle le tableau
d’origine ? Que renvoie-t-elle ? La documentation MDN répond à ces deux questions pour chaque
méthode.

### Chercher, inverser, vider

```js
const numbers = [3, 7];
numbers[numbers.length] = 9; // écrit juste après le dernier : ajoute à la fin
console.log(numbers);
console.log(numbers.indexOf(7), numbers.indexOf(4));
console.log(numbers.includes(9), numbers.includes(4));
console.log(numbers.reverse(), numbers);

const items = ['a', 'b', 'c'];
items.length = 0; // vide le tableau
console.log(items);
```

Sortie :

```text
[ 3, 7, 9 ]
1 -1
true false
[ 9, 7, 3 ] [ 9, 7, 3 ]
[]
```

- Écrire dans `numbers[numbers.length]` ajoute à la fin, comme `push`.
- `indexOf(v)` renvoie l’index de la première occurrence de `v`, ou `-1` si elle est absente ;
  `lastIndexOf(v)` cherche depuis la fin.
- `includes(v)` renvoie simplement `true` ou `false`. Pour une question « est-ce présent ? »,
  c’est le choix le plus lisible.
- `reverse()` inverse l’ordre **en place** : il modifie le tableau et renvoie ce même
  tableau. C’est pour cela que les deux affichages de la quatrième ligne sont identiques.
- Donner la valeur `0` à `length` vide le tableau.

Ces méthodes comparent les valeurs comme `===` (à une exception près pour `NaN`, vue plus
bas). Elles conviennent donc aux nombres
et aux chaînes, mais pas pour chercher un objet selon son contenu : on utilisera pour cela
`find` et `findIndex`, présentés dans la leçon sur les transformations.

## Parcourir un tableau

Tu connais déjà les boucles. Avec un tableau, deux formes dominent :

```js
const scores = [12, 15, 9];

for (const score of scores) {
  console.log(`Note : ${score}`);
}

for (let i = scores.length - 1; i >= 0; i -= 1) {
  console.log(scores[i]);
}
```

Sortie :

```text
Note : 12
Note : 15
Note : 9
9
15
12
```

- `for…of` est la forme par défaut : elle donne directement chaque valeur, sans risque de se
  tromper d’index.
- La boucle `for` classique reste utile quand tu as besoin de l’index, d’un parcours à
  l’envers ou d’un pas différent de 1.

Évite `for…in` sur un tableau : cette boucle parcourt les **noms** des propriétés (des chaînes
`'0'`, `'1'`…), pas les valeurs. Elle est faite pour les objets.

## Tableaux de tableaux

Un élément de tableau peut lui-même être un tableau. On obtient une grille, comme un tableur :

```js
const grid = [
  [1, 2, 3],
  [4, 5, 6],
];

console.log(grid[1][2]);
console.log(grid.length);
console.log(grid[0].length);

const zeros = Array.from({ length: 3 }, () => 0);
console.log(zeros);
const squares = Array.from({ length: 4 }, (_, index) => index * index);
console.log(squares);
```

Sortie :

```text
6
2
3
[ 0, 0, 0 ]
[ 0, 1, 4, 9 ]
```

`grid[1]` est la deuxième ligne `[4, 5, 6]`, et `grid[1][2]` le troisième élément de cette
ligne. On lit de gauche à droite : d’abord la ligne, ensuite la colonne.

`Array.from({ length: n }, fn)` fabrique un tableau de `n` éléments en appelant `fn` pour
chacun. `fn` reçoit la valeur (ici sans intérêt, d’où le nom `_` par convention) et l’index.

## Pièges courants

### Les trous dans un tableau

```js
const list = ['a', 'b'];
list[5] = 'f';
console.log(list);
console.log(list.length);

const values = [1, NaN, 3];
console.log(values.indexOf(NaN));
console.log(values.includes(NaN));

console.log([1, 2] === [1, 2]);
```

Sortie :

```text
[ 'a', 'b', <3 empty items>, 'f' ]
6
-1
true
false
```

1. **Écrire loin après la fin crée des trous.** `length` passe à 6 et les index 2 à 4 sont
   vides. Ce n’est presque jamais voulu : pour ajouter, utilise `push`.
2. **`indexOf` ne trouve pas `NaN`**, car `NaN === NaN` est faux. `includes` utilise une
   comparaison légèrement différente qui reconnaît `NaN`. Raison de plus pour préférer
   `includes` quand tu veux seulement savoir si une valeur est présente.
3. **Deux tableaux au contenu identique ne sont pas égaux** avec `===`. On compare des
   tableaux distincts, pas leur contenu. La leçon sur les références expliquera pourquoi.

### Oublier de tester `-1`

```js
const names = ['Ada', 'Grace'];
names.splice(names.indexOf('Linus'), 1);
console.log(names);
```

On pense retirer `'Linus'`, absent du tableau. Mais `indexOf` renvoie `-1`, et `splice(-1, 1)`
compte depuis la fin : il retire `'Grace'` ! Le tableau affiché est `[ 'Ada' ]`. Teste
toujours le résultat : `if (index !== -1) { … }`.

### Confondre `splice` et `slice`

Moyen mnémotechnique : `splice` contient un « p » comme « perturbe », il modifie le tableau.
`slice` « tranche » une copie. Dans le doute, affiche le tableau avant et après l’appel.

## Exercices

### Exercice 1 — La playlist

Pars de `const playlist = ['Intro', 'Titre 1', 'Titre 2', 'Titre 3'];` et écris un script qui :

1. ajoute `'Final'` à la fin ;
2. retire `'Titre 2'` en cherchant son index (sans écrire l’index en dur), seulement s’il est
   présent ;
3. insère `'Interlude'` juste après `'Intro'` ;
4. affiche la playlist numérotée à partir de 1, une ligne par titre.

:::solution

```js
const playlist = ['Intro', 'Titre 1', 'Titre 2', 'Titre 3'];

// 1. Ajouter 'Final' à la fin
playlist.push('Final');

// 2. Retirer 'Titre 2' sans connaître son index à l’avance
const index = playlist.indexOf('Titre 2');
if (index !== -1) {
  playlist.splice(index, 1);
}

// 3. Insérer 'Interlude' juste après 'Intro'
playlist.splice(1, 0, 'Interlude');

// 4. Afficher la liste numérotée à partir de 1
for (let i = 0; i < playlist.length; i += 1) {
  console.log(`${i + 1}. ${playlist[i]}`);
}
```

Sortie :

```text
1. Intro
2. Interlude
3. Titre 1
4. Titre 3
5. Final
```

Le test `index !== -1` évite le piège vu plus haut : sans lui, un titre absent ferait
disparaître le dernier élément. Pour l’affichage, on a besoin de l’index, d’où la boucle `for`
classique ; on ajoute 1 car les humains comptent à partir de 1.
:::

### Exercice 2 — Les derniers éléments

Écris une fonction `takeLast(items, count)` qui renvoie un **nouveau** tableau contenant les
`count` derniers éléments de `items`, sans modifier `items`. Elle doit renvoyer un tableau
vide quand `count` vaut 0 et tout le tableau quand `count` dépasse sa longueur.

:::solution

```js
function takeLast(items, count) {
  if (count <= 0) {
    return [];
  }
  return items.slice(-count);
}

const letters = ['a', 'b', 'c', 'd'];
console.log(takeLast(letters, 2));
console.log(takeLast(letters, 10));
console.log(takeLast(letters, 0));
console.log(letters);
console.log(letters.slice(-0));
```

Sortie :

```text
[ 'c', 'd' ]
[ 'a', 'b', 'c', 'd' ]
[]
[ 'a', 'b', 'c', 'd' ]
[ 'a', 'b', 'c', 'd' ]
```

`slice` accepte un début négatif, compté depuis la fin, et ne modifie pas le tableau : la
quatrième ligne le prouve. Le cas `count === 0` est le piège : `-0` vaut `0`, et
`slice(0)` renvoie tout le tableau (dernière ligne). D’où le test explicite au début de la
fonction. Si `count` dépasse la longueur, `slice` s’arrête simplement au début du tableau.
:::

### Exercice 3 — Totaux par ligne

Un tableau à deux dimensions contient les ventes de trois magasins (une ligne par magasin,
une colonne par mois) :

```js
const sales = [
  [120, 80, 95],
  [60, 140, 110],
  [90, 90, 30],
];
```

Construis un tableau `rowTotals` contenant le total de chaque magasin, avec deux boucles
`for…of` imbriquées, puis affiche-le.

:::solution

```js
const sales = [
  [120, 80, 95],
  [60, 140, 110],
  [90, 90, 30],
];

const rowTotals = [];
for (const row of sales) {
  let total = 0;
  for (const amount of row) {
    total += amount;
  }
  rowTotals.push(total);
}
console.log(rowTotals);
```

Sortie :

```text
[ 295, 310, 210 ]
```

La boucle extérieure donne chaque ligne (un tableau), la boucle intérieure chaque montant de
cette ligne. `total` est déclaré **dans** la boucle extérieure pour repartir de 0 à chaque
magasin ; s’il était déclaré avant, les totaux s’accumuleraient. On verra dans la leçon sur
les transformations comment écrire la même chose en une ligne avec `map` et `reduce`.
:::

## Récapitulatif

- Un tableau est une liste ordonnée ; les index commencent à 0 et `length` donne la taille.
- Lire un index absent donne `undefined` ; `at(-1)` lit le dernier élément.
- `push`/`pop` agissent à la fin, `unshift`/`shift` au début ; `splice` retire ou insère
  n’importe où. Toutes ces méthodes **modifient** le tableau.
- `slice`, `concat` et `join` **ne modifient pas** le tableau : elles renvoient une nouvelle
  valeur. Pose-toi toujours la question « mute ou renvoie ? ».
- `includes` répond à « est-ce présent ? », `indexOf` donne la position ou `-1`, à tester
  avant de s’en servir.
- `const` empêche de réaffecter la variable, pas de modifier le tableau.
- `for…of` parcourt les valeurs ; `for` classique quand l’index compte ; pas de `for…in`.
- `Array.isArray` détecte un tableau, car `typeof` renvoie `'object'`.
