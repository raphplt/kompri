---
title: Transformer des collections
summary: Filtrer, transformer, chercher, résumer et trier des tableaux avec map, filter, reduce, find, some et sort.
durationMinutes: 60
sources:
  - title: MDN — Array.prototype.map()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/map
  - title: MDN — Array.prototype.reduce()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
  - title: MDN — Array.prototype.sort()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
  - title: MDN — Array.prototype.toSorted()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted
---

## Le problème : des boucles qui se ressemblent toutes

Dans les leçons précédentes, chaque traitement s’écrivait avec une boucle : compter les
produits disponibles, construire une liste de totaux, chercher un élément. Ces boucles se
ressemblent toutes — une variable de résultat, un `for…of`, un `if`, un `push` — et c’est
précisément ce qui les rend fragiles : on oublie d’initialiser, on se trompe de variable, on
mélange plusieurs intentions dans le même bloc.

Les tableaux disposent de **méthodes de transformation** qui nomment l’intention :
« transformer chaque élément », « garder ceux qui… », « trouver le premier qui… », « réduire à
une seule valeur ». Ce sont des **fonctions d’ordre supérieur** : tu leur passes une fonction
(un callback, c’est-à-dire une fonction appelée par une autre) qu’elles appliquent à chaque
élément. Tu connais déjà ce mécanisme depuis la compétence sur les fonctions.

Toutes les méthodes de cette leçon, sauf `sort`, **ne modifient pas** le tableau d’origine.

## `map` : transformer chaque élément

```js
const prices = [10, 25, 4];

const withTax = prices.map((price) => price * 1.2);
console.log(withTax);
console.log(prices);

const labels = prices.map((price, index) => `#${index + 1} : ${price} €`);
console.log(labels);
```

Sortie (`node example.js`) :

```text
[ 12, 30, 4.8 ]
[ 10, 25, 4 ]
[ '#1 : 10 €', '#2 : 25 €', '#3 : 4 €' ]
```

`map` appelle la fonction pour chaque élément et range **la valeur renvoyée** dans un nouveau
tableau, à la même position. Le résultat a donc toujours **la même longueur** que l’original.
La fonction reçoit l’élément, puis son index (et le tableau entier en troisième argument, rarement
utile).

## `filter` : garder certains éléments

```js
const products = [
  { id: 1, name: 'Clavier', price: 49.9, inStock: true },
  { id: 2, name: 'Souris', price: 19.9, inStock: false },
  { id: 3, name: 'Écran', price: 189, inStock: true },
  { id: 4, name: 'Casque', price: 59, inStock: true },
];

const available = products.filter((product) => product.inStock);
console.log(available.length);

const names = products.map((product) => product.name);
console.log(names);

const cheapAvailable = products
  .filter((product) => product.inStock && product.price < 60)
  .map((product) => product.name);
console.log(cheapAvailable);
```

Sortie :

```text
3
[ 'Clavier', 'Souris', 'Écran', 'Casque' ]
[ 'Clavier', 'Casque' ]
```

`filter` garde les éléments pour lesquels la fonction renvoie une valeur truthy. Le résultat
est un nouveau tableau, de longueur inférieure ou égale. On appelle souvent cette fonction un
**prédicat** : elle répond par vrai ou faux.

Comme `filter` et `map` renvoient des tableaux, on peut les **enchaîner**. On lit la chaîne de
haut en bas comme une phrase : « parmi les produits, garde ceux en stock à moins de 60 €, puis
prends leur nom ». Écrire une méthode par ligne, le point en début de ligne, est une
convention répandue qui rend la chaîne facile à lire et à modifier.

## `find`, `findIndex`, `some` et `every` : chercher et vérifier

```js
const products = [
  { id: 1, name: 'Clavier', price: 49.9, inStock: true },
  { id: 2, name: 'Souris', price: 19.9, inStock: false },
  { id: 3, name: 'Écran', price: 189, inStock: true },
];

const screen = products.find((product) => product.id === 3);
console.log(screen);
console.log(products.find((product) => product.id === 99));

const mouseIndex = products.findIndex((product) => product.name === 'Souris');
console.log(mouseIndex);
console.log(products.findIndex((product) => product.price > 1000));

console.log(products.some((product) => !product.inStock));
console.log(products.every((product) => product.price > 0));
console.log([].every((product) => product.price > 1000));
console.log([].some((product) => product.price > 0));
```

Sortie :

```text
{ id: 3, name: 'Écran', price: 189, inStock: true }
undefined
1
-1
true
true
true
false
```

| Méthode         | Question posée                          | Renvoie                   |
| --------------- | --------------------------------------- | ------------------------- |
| `find(fn)`      | quel est le premier élément qui… ?      | l’élément, ou `undefined` |
| `findIndex(fn)` | à quelle position est le premier qui… ? | l’index, ou `-1`          |
| `some(fn)`      | au moins un élément vérifie-t-il… ?     | `true` ou `false`         |
| `every(fn)`     | tous les éléments vérifient-ils… ?      | `true` ou `false`         |
| `includes(v)`   | la valeur `v` est-elle présente ?       | `true` ou `false`         |

Ces méthodes **s’arrêtent dès qu’elles connaissent la réponse** : `find` au premier élément
trouvé, `some` au premier `true`, `every` au premier `false`. Elles sont donc plus efficaces
qu’un `filter` suivi d’un test de longueur.

`includes` compare une valeur ; `find` et `some` acceptent une **condition**. Pour chercher un
objet selon son contenu (un produit d’`id` 3), il faut `find` ou `some`, car `includes`
comparerait des références d’objets.

Note les deux derniers résultats : sur un tableau vide, `every` renvoie `true` (aucun élément
ne contredit la condition) et `some` renvoie `false`. C’est logique, mais cela surprend :
« tous les produits coûtent plus de 1000 € » est vrai quand il n’y a aucun produit. Si ce cas
compte, teste la longueur à part.

## `reduce` : résumer en une seule valeur

`reduce` parcourt le tableau en transportant un **accumulateur** d’un élément au suivant.

```js
const amounts = [12, 30, 8];

const total = amounts.reduce((sum, amount) => sum + amount, 0);
console.log(total);

const cart = [
  { name: 'Stylo', unitPrice: 1.5, quantity: 4 },
  { name: 'Cahier', unitPrice: 3.2, quantity: 2 },
];
const cartTotal = cart.reduce(
  (sum, line) => sum + line.unitPrice * line.quantity,
  0,
);
console.log(cartTotal.toFixed(2));

const words = ['pomme', 'poire', 'kiwi', 'prune'];
const byInitial = words.reduce((groups, word) => {
  const initial = word[0];
  groups[initial] = groups[initial] ?? [];
  groups[initial].push(word);
  return groups;
}, {});
console.log(byInitial);
```

Sortie :

```text
50
12.40
{ p: [ 'pomme', 'poire', 'prune' ], k: [ 'kiwi' ] }
```

`reduce(fn, initialValue)` fonctionne ainsi :

1. l’accumulateur commence à `initialValue` (ici `0`) ;
2. pour chaque élément, `fn(accumulateur, element)` est appelée et **ce qu’elle renvoie
   devient le nouvel accumulateur** ;
3. à la fin, `reduce` renvoie le dernier accumulateur.

Trace le premier exemple à la main : `0 + 12 = 12`, puis `12 + 30 = 42`, puis `42 + 8 = 50`.

Le troisième exemple montre que l’accumulateur peut être un objet : on regroupe les mots par
initiale. N’oublie pas le `return groups` : avec des accolades, une fonction fléchée ne
renvoie rien sans `return`.

### Toujours fournir la valeur initiale

```js
const amounts = [12, 30, 8];
const max = amounts.reduce((best, amount) => (amount > best ? amount : best));
console.log(max);
try {
  [].reduce((sum, amount) => sum + amount);
} catch (error) {
  console.log(error.name + ': ' + error.message);
}
console.log([].reduce((sum, amount) => sum + amount, 0));
```

Sortie :

```text
30
TypeError: Reduce of empty array with no initial value
0
```

Sans valeur initiale, `reduce` prend le premier élément comme accumulateur de départ. Cela
fonctionne pour un maximum, mais **plante sur un tableau vide**. Avec `0` comme valeur
initiale, la somme d’un tableau vide vaut `0`, ce qui est le bon résultat. Règle pratique :
fournis toujours la valeur initiale, sauf raison précise.

`reduce` est puissant mais moins lisible que `map` ou `filter`. Si une boucle `for…of` ou un
enchaînement `filter`/`map` exprime mieux l’intention, préfère-les.

## `sort` : trier… en modifiant le tableau

### Le tri par défaut compare des chaînes

```js
const numbers = [10, 9, 1, 100];
numbers.sort();
console.log(numbers);

numbers.sort((a, b) => a - b);
console.log(numbers);

numbers.sort((a, b) => b - a);
console.log(numbers);
```

Sortie :

```text
[ 1, 10, 100, 9 ]
[ 1, 9, 10, 100 ]
[ 100, 10, 9, 1 ]
```

Sans argument, `sort` convertit les éléments en chaînes et les compare caractère par
caractère : `'100'` vient avant `'9'` comme « abricot » avant « banane ». Pour des nombres,
c’est presque toujours faux.

On passe donc une **fonction de comparaison** `(a, b) => …` qui renvoie :

- un nombre **négatif** si `a` doit venir avant `b` ;
- un nombre **positif** si `a` doit venir après `b` ;
- **0** si l’ordre entre eux est indifférent.

`a - b` donne l’ordre croissant, `b - a` l’ordre décroissant. Le tri est **stable** : deux
éléments jugés égaux gardent leur ordre d’origine.

### `sort` mute, `toSorted` copie

```js
const original = [3, 1, 2];
const sorted = original.sort((a, b) => a - b);
console.log(sorted);
console.log(original);
console.log(sorted === original);

const scores = [3, 1, 2];
const sortedCopy = scores.toSorted((a, b) => a - b);
console.log(sortedCopy, scores);
const sortedCopy2 = scores.slice().sort((a, b) => a - b);
console.log(sortedCopy2, scores);
```

Sortie :

```text
[ 1, 2, 3 ]
[ 1, 2, 3 ]
true
[ 1, 2, 3 ] [ 3, 1, 2 ]
[ 1, 2, 3 ] [ 3, 1, 2 ]
```

`sort` trie **en place** et renvoie le même tableau : `sorted` et `original` sont un seul et
même tableau (`sorted === original` vaut `true`). Si ce tableau est partagé avec une autre
partie du programme — une liste affichée, un état d’interface — tu viens de la modifier sans
le vouloir.

`toSorted` fait le même travail mais renvoie un **nouveau** tableau trié et laisse l’original
intact. Il est disponible dans les navigateurs à jour et dans Node.js 24. Dans du code plus
ancien, tu verras l’équivalent `slice().sort(…)` : on copie, puis on trie la copie. Il existe
aussi `toReversed` et `toSpliced`, les versions non mutantes de `reverse` et de `splice`.

### Trier des chaînes et des objets

```js
const names = ['émile', 'Zoé', 'adam', 'Élodie'];
console.log(names.toSorted());
console.log(names.toSorted((a, b) => a.localeCompare(b, 'fr')));
console.log(names);

const products = [
  { name: 'Clavier', price: 49.9 },
  { name: 'Souris', price: 19.9 },
  { name: 'Écran', price: 189 },
];
const byPrice = products.toSorted((a, b) => a.price - b.price);
console.log(byPrice.map((product) => product.name));
const byName = products.toSorted((a, b) => a.name.localeCompare(b.name, 'fr'));
console.log(byName.map((product) => product.name));
console.log(products.map((product) => product.name));
```

Sortie :

```text
[ 'Zoé', 'adam', 'Élodie', 'émile' ]
[ 'adam', 'Élodie', 'émile', 'Zoé' ]
[ 'émile', 'Zoé', 'adam', 'Élodie' ]
[ 'Souris', 'Clavier', 'Écran' ]
[ 'Clavier', 'Écran', 'Souris' ]
[ 'Clavier', 'Souris', 'Écran' ]
```

Le tri par défaut compare les codes des caractères : les majuscules passent avant les
minuscules, et les lettres accentuées après `z`. Pour un ordre alphabétique « humain », utilise
`a.localeCompare(b, 'fr')`, qui renvoie justement un nombre négatif, positif ou nul.

Pour trier des objets, la fonction de comparaison compare **une propriété** : `a.price - b.price`
pour un nombre, `a.name.localeCompare(b.name, 'fr')` pour un texte.

## Pièges courants

```js
const result = [1, 2, 3].forEach((n) => n * 2);
console.log(result);

const doubled = [1, 2, 3].map((n) => {
  n * 2;
});
console.log(doubled);

const doubledOk = [1, 2, 3].map((n) => n * 2);
console.log(doubledOk);

console.log(['1', '2', '3'].map(Number));
console.log(['1', '2', '3'].map(parseInt));

const users = [{ name: 'Ada' }];
const found = users.filter((user) => user.name === 'Ada');
console.log(found);
console.log(found.name);
```

Sortie :

```text
undefined
[ undefined, undefined, undefined ]
[ 2, 4, 6 ]
[ 1, 2, 3 ]
[ 1, NaN, NaN ]
[ { name: 'Ada' } ]
undefined
```

1. **`forEach` ne renvoie rien.** Il sert à exécuter une action pour chaque élément (afficher,
   envoyer…), pas à produire un tableau. Pour transformer, c’est `map`.
2. **Accolades sans `return` dans `map`.** Avec `{ … }`, la fonction fléchée a un corps de
   bloc et renvoie `undefined` sans `return` explicite. Écris `(n) => n * 2` ou ajoute `return`.
3. **Passer directement une fonction qui a plusieurs paramètres.** `map` appelle la fonction
   avec `(element, index, tableau)`. `parseInt` reçoit donc l’index comme deuxième argument,
   qu’il interprète comme une base de numération : `parseInt('2', 1)` donne `NaN`. `Number` ne
   lit que son premier argument et fonctionne. En cas de doute, écris la fonction fléchée en
   entier : `.map((text) => Number.parseInt(text, 10))`.
4. **`filter` quand on veut un seul élément.** `filter` renvoie toujours un tableau, même pour
   un seul résultat : `found.name` vaut `undefined`. Pour un élément, c’est `find`.
5. **`sort` sans comparateur sur des nombres**, ou `sort` sur un tableau partagé : préfère
   `toSorted` avec une fonction de comparaison explicite.
6. **Modifier les objets dans un `map`.** `products.map((p) => { p.price = 0; return p; })`
   modifie les objets d’origine, même si le tableau renvoyé est neuf. La leçon suivante
   explique pourquoi et comment l’éviter.

## Exercices

### Exercice 1 — Tableau de bord des commandes

À partir de ce tableau :

```js
const orders = [
  { id: 'A1', customer: 'Inès', total: 72.5, status: 'paid' },
  { id: 'A2', customer: 'Hugo', total: 18, status: 'cancelled' },
  { id: 'A3', customer: 'Léa', total: 120, status: 'paid' },
  { id: 'A4', customer: 'Noah', total: 45.5, status: 'paid' },
];
```

Calcule, sans aucune boucle :

1. les noms des clients dont la commande **payée** dépasse 50 € ;
2. le chiffre d’affaires des commandes payées ;
3. s’il existe au moins une commande annulée ;
4. le client et le montant de la commande `A3`, ou le texte `Commande introuvable`.

:::solution

```js
const orders = [
  { id: 'A1', customer: 'Inès', total: 72.5, status: 'paid' },
  { id: 'A2', customer: 'Hugo', total: 18, status: 'cancelled' },
  { id: 'A3', customer: 'Léa', total: 120, status: 'paid' },
  { id: 'A4', customer: 'Noah', total: 45.5, status: 'paid' },
];

// 1. Noms des clients dont la commande payée dépasse 50 €
const bigCustomers = orders
  .filter((order) => order.status === 'paid' && order.total > 50)
  .map((order) => order.customer);
console.log(bigCustomers);

// 2. Chiffre d’affaires des commandes payées
const revenue = orders
  .filter((order) => order.status === 'paid')
  .reduce((sum, order) => sum + order.total, 0);
console.log(revenue);

// 3. Y a-t-il au moins une commande annulée ?
console.log(orders.some((order) => order.status === 'cancelled'));

// 4. La commande A3, ou un message si elle n’existe pas
const order = orders.find((item) => item.id === 'A3');
console.log(
  order ? `${order.customer} : ${order.total} €` : 'Commande introuvable',
);
```

Sortie :

```text
[ 'Inès', 'Léa' ]
238
true
Léa : 120 €
```

Chaque question correspond à une méthode : « lesquels » → `filter`, « quelle valeur pour
chacun » → `map`, « combien au total » → `reduce`, « existe-t-il » → `some`, « lequel » →
`find`. `find` pouvant renvoyer `undefined`, on teste son résultat avant de lire `customer`.
:::

### Exercice 2 — Le podium

Écris `topNames(students, count)` qui renvoie les noms des `count` meilleurs élèves, par note
décroissante, et par ordre alphabétique en cas d’égalité. Le tableau reçu ne doit pas être
modifié.

```js
const students = [
  { name: 'Zoé', grade: 15 },
  { name: 'Adam', grade: 17 },
  { name: 'Lina', grade: 15 },
  { name: 'Éric', grade: 12 },
  { name: 'Bastien', grade: 17 },
];
```

:::solution

```js
const students = [
  { name: 'Zoé', grade: 15 },
  { name: 'Adam', grade: 17 },
  { name: 'Lina', grade: 15 },
  { name: 'Éric', grade: 12 },
  { name: 'Bastien', grade: 17 },
];

function topNames(list, count) {
  return list
    .toSorted((a, b) => b.grade - a.grade || a.name.localeCompare(b.name, 'fr'))
    .slice(0, count)
    .map((student) => student.name);
}

console.log(topNames(students, 3));
console.log(students[0].name);
```

Sortie :

```text
[ 'Adam', 'Bastien', 'Lina' ]
Zoé
```

`b.grade - a.grade` trie par note décroissante. Quand les notes sont égales, cette différence
vaut `0`, qui est falsy : l’opérateur `||` passe alors au second critère, l’ordre alphabétique.
`toSorted` laisse `students` intact (son premier élément est toujours Zoé) ; avec `sort`, la
fonction aurait modifié le tableau de l’appelant, un effet de bord inattendu.
:::

### Exercice 3 — Totaux et moyennes sans boucle

Reprends la grille de ventes de la leçon sur les tableaux. Avec une petite fonction `sum` et
une fonction `average` (qui renvoie 0 pour un tableau vide), calcule le total et la moyenne de
chaque ligne, cette dernière arrondie à une décimale.

```js
const sales = [
  [120, 80, 95],
  [60, 140, 110],
  [90, 90, 30],
];
```

:::solution

```js
const sales = [
  [120, 80, 95],
  [60, 140, 110],
  [90, 90, 30],
];

const sum = (numbers) => numbers.reduce((total, n) => total + n, 0);
const average = (numbers) =>
  numbers.length === 0 ? 0 : sum(numbers) / numbers.length;

const rowTotals = sales.map(sum);
console.log(rowTotals);
console.log(sales.map(average).map((value) => value.toFixed(1)));
console.log(average([]));
```

Sortie :

```text
[ 295, 310, 210 ]
[ '98.3', '103.3', '70.0' ]
0
```

`sales.map(sum)` passe chaque ligne à `sum` ; c’est sans risque ici car `sum` n’utilise que son
premier paramètre (contrairement à `parseInt`). La valeur initiale `0` de `reduce` et le test
de longueur dans `average` protègent du tableau vide : sans eux, on obtiendrait une
`TypeError` ou `NaN` (0 divisé par 0). `toFixed` renvoie des chaînes, d’où les guillemets.
:::

## Récapitulatif

- `map` transforme chaque élément et renvoie un tableau de même longueur.
- `filter` garde les éléments dont le prédicat est truthy.
- `find` renvoie le premier élément trouvé ou `undefined` ; `findIndex` son index ou `-1`.
- `some` et `every` répondent par un booléen et s’arrêtent dès que la réponse est connue ; sur
  un tableau vide, `every` vaut `true` et `some` vaut `false`.
- `reduce(fn, initial)` résume un tableau ; fournis toujours la valeur initiale.
- `sort` trie **en place** et compare des chaînes par défaut : passe un comparateur
  (`a - b`, `localeCompare`) et préfère `toSorted` pour ne pas modifier l’original.
- `forEach` ne renvoie rien ; une fonction fléchée avec accolades a besoin de `return`.
- Enchaîne les méthodes, une par ligne, pour décrire un traitement comme une phrase.
