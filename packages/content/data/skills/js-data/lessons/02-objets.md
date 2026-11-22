---
title: Les objets
summary: Décrire une chose par ses propriétés nommées, les lire, les modifier et les parcourir.
durationMinutes: 50
sources:
  - title: MDN — Utiliser les objets
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Working_with_objects
  - title: MDN — Object.entries()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Object/entries
  - title: MDN — Map
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Map
  - title: MDN — Set
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Set
---

## Pourquoi des objets ?

Un tableau range des valeurs **dans l’ordre**, mais il ne dit rien de leur sens. Dans
`['Ada', 36, false]`, qu’est-ce que `36` ? Un âge, une pointure, un nombre de commandes ?

Un **objet** associe chaque valeur à un **nom**. On parle de **propriété** : une clé (le nom)
et une valeur. Un objet décrit une chose — un utilisateur, un produit, une commande — par
ses caractéristiques. Presque toutes les données qui circulent sur le web ont cette forme :
une réponse d’API, une ligne de base de données, les champs d’un formulaire.

Cette leçon montre comment créer, lire, modifier et parcourir un objet, puis comment combiner
objets et tableaux. Elle se termine par deux structures complémentaires, `Map` et `Set`.

## Créer un objet et lire ses propriétés

On écrit un objet **littéral** entre accolades. Chaque propriété s’écrit `clé: valeur`, et les
propriétés sont séparées par des virgules :

```js
const user = {
  firstName: 'Ada',
  age: 36,
  isAdmin: false,
  address: {
    city: 'Lyon',
    zipCode: '69001',
  },
};

console.log(user.firstName);
console.log(user['age']);
console.log(user.address.city);
console.log(user.email);
console.log(user.phone?.mobile);
console.log(user);
```

Sortie (`node example.js`) :

```text
Ada
36
Lyon
undefined
undefined
{
  firstName: 'Ada',
  age: 36,
  isAdmin: false,
  address: { city: 'Lyon', zipCode: '69001' }
}
```

- La **notation point** `user.firstName` est la plus courante.
- La **notation crochets** `user['age']` prend une chaîne : elle est indispensable quand le
  nom de la clé est dans une variable ou n’est pas un identifiant valide (voir plus bas).
- Une valeur peut être un autre objet : `user.address.city` descend d’un niveau à chaque point.
- Lire une propriété absente donne `undefined`, sans erreur.
- En revanche, lire une propriété **de** `undefined` provoque une `TypeError` :
  `user.phone.mobile` planterait. L’opérateur de chaînage optionnel `?.`, vu dans la
  compétence sur les conditions, s’arrête et renvoie `undefined` si `user.phone` est absent.

La virgule après la dernière propriété (`zipCode: '69001',`) est autorisée. Beaucoup d’équipes
la gardent : ajouter une ligne ne modifie alors pas la ligne précédente dans l’historique Git.

## Modifier un objet

```js
const book = { title: 'Dune', pages: 412 };

book.pages = 896; // modifie une propriété existante
book.author = 'Frank Herbert'; // ajoute une propriété
delete book.pages; // supprime une propriété
console.log(book);

console.log('title' in book);
console.log(Object.hasOwn(book, 'pages'));

const settings = { volume: 0, theme: undefined };
console.log(settings.volume, settings.theme, settings.language);
console.log(
  Object.hasOwn(settings, 'theme'),
  Object.hasOwn(settings, 'language'),
);
```

Sortie :

```text
{ title: 'Dune', author: 'Frank Herbert' }
true
false
0 undefined undefined
true false
```

- Affecter une propriété existante la remplace ; affecter une propriété absente la crée.
- `delete objet.cle` supprime la propriété. On l’utilise rarement : on préfère souvent
  construire un nouvel objet sans la propriété (leçon sur les copies).
- Comme pour un tableau, `const` n’empêche pas de modifier l’objet : il empêche seulement de
  réaffecter la variable `book`.

Pour savoir si une propriété **existe**, ne teste pas sa valeur. `settings.theme` et
`settings.language` valent tous les deux `undefined`, pourtant la première existe et pas la
seconde. `Object.hasOwn(objet, 'cle')` répond précisément à la question « cet objet
possède-t-il cette propriété ? ». L’opérateur `'cle' in objet` est proche, mais il regarde
aussi les propriétés héritées (une notion que tu croiseras plus tard).

De même, `if (settings.volume)` serait faux alors que le volume est bien renseigné : `0` est
falsy. C’est le piège classique déjà vu avec `||` ; utilise `??` ou `Object.hasOwn` selon la
question posée.

## Clés dynamiques et raccourcis d’écriture

```js
const stock = { 'pomme-golden': 12, poire: 4 };

const product = 'poire';
console.log(stock[product]); // la valeur de la variable sert de clé
console.log(stock.product); // cherche une propriété nommée « product »
console.log(stock['pomme-golden']); // nom avec tiret : crochets obligatoires

const field = 'email';
const value = 'ada@example.com';
const name = 'Ada';
const contact = { name, [field]: value };
console.log(contact);
```

Sortie :

```text
4
undefined
12
{ name: 'Ada', email: 'ada@example.com' }
```

- `stock[product]` évalue d’abord la variable `product` (`'poire'`), puis lit la propriété.
- `stock.product` cherche littéralement une propriété nommée `product` : elle n’existe pas.
  Confondre les deux est l’erreur la plus fréquente avec les objets.
- Une clé qui contient un tiret ou une espace doit être écrite entre guillemets et lue avec
  les crochets.
- `{ name }` est un raccourci pour `{ name: name }` quand la variable porte le nom de la clé.
- `{ [field]: value }` est une **clé calculée** : l’expression entre crochets donne le nom de
  la propriété.

## Des fonctions dans un objet : les méthodes

Une propriété peut contenir une fonction. On l’appelle alors une **méthode**. Tu en utilises
depuis le début : `console.log` est la méthode `log` de l’objet `console`.

```js
const counter = {
  value: 0,
  increment() {
    this.value += 1;
    return this.value;
  },
};

counter.increment();
console.log(counter.increment());
console.log(counter.value);
```

Sortie :

```text
2
2
```

`increment() { … }` est l’écriture courte de `increment: function () { … }`. Dans une méthode
appelée sous la forme `counter.increment()`, le mot-clé `this` désigne l’objet placé avant le
point, ici `counter`. Retiens seulement cette règle pour l’instant : `this` dépend de la façon
dont la fonction est appelée, et une fonction fléchée n’a pas son propre `this`. N’écris donc
pas une méthode qui utilise `this` sous forme de fonction fléchée.

## Parcourir un objet : `Object.keys`, `values` et `entries`

Un objet ne se parcourt pas directement avec `for…of`. On le transforme d’abord en tableau :

```js
const prices = { cafe: 2.2, the: 2.5, chocolat: 3 };

console.log(Object.keys(prices));
console.log(Object.values(prices));
console.log(Object.entries(prices));

for (const [item, price] of Object.entries(prices)) {
  console.log(`${item} : ${price.toFixed(2)} €`);
}

const doubled = Object.fromEntries([
  ['cafe', 4.4],
  ['the', 5],
]);
console.log(doubled);
console.log(Object.keys(prices).length);
```

Sortie :

```text
[ 'cafe', 'the', 'chocolat' ]
[ 2.2, 2.5, 3 ]
[ [ 'cafe', 2.2 ], [ 'the', 2.5 ], [ 'chocolat', 3 ] ]
cafe : 2.20 €
the : 2.50 €
chocolat : 3.00 €
{ cafe: 4.4, the: 5 }
3
```

- `Object.keys(obj)` renvoie le tableau des clés, `Object.values(obj)` celui des valeurs.
- `Object.entries(obj)` renvoie un tableau de paires `[clé, valeur]`.
- Dans la boucle, `const [item, price]` range le premier élément de chaque paire dans `item`
  et le second dans `price`. Cette syntaxe s’appelle la **déstructuration** ; la leçon 4 la
  détaille.
- `Object.fromEntries(paires)` fait l’inverse : il construit un objet à partir de paires.
- Un objet n’a pas de `length` ; `Object.keys(obj).length` donne son nombre de propriétés.

Ces trois fonctions ne renvoient que les propriétés **propres** de l’objet (pas les héritées),
ce qui est presque toujours ce que tu veux. C’est une raison de les préférer à `for…in`.

## Tableaux d’objets

La structure la plus répandue en développement web est un **tableau d’objets** de même forme.
Une réponse d’API qui liste des produits ressemble à ceci :

```js
const products = [
  { id: 1, name: 'Clavier', price: 49.9, inStock: true },
  { id: 2, name: 'Souris', price: 19.9, inStock: false },
  { id: 3, name: 'Écran', price: 189, inStock: true },
];

console.log(products[1].name);

let available = 0;
for (const product of products) {
  if (product.inStock) {
    available += 1;
  }
}
console.log(`${available} produits disponibles sur ${products.length}`);

products.push({ id: 4, name: 'Casque', price: 59, inStock: true });
products[0].price = 44.9;
console.log(products[0]);
console.log(products.length);
```

Sortie :

```text
Souris
2 produits disponibles sur 3
{ id: 1, name: 'Clavier', price: 44.9, inStock: true }
4
```

On lit de gauche à droite : `products[1]` est le deuxième objet, `.name` sa propriété. Chaque
objet a un `id` unique : c’est lui qui permet de retrouver un produit sans dépendre de sa
position, qui peut changer. La leçon suivante remplacera ces boucles par des méthodes plus
expressives (`filter`, `find`, `map`…).

## `Map` et `Set` en bref

JavaScript propose deux autres collections, utiles dans des cas précis.

```js
const tags = ['js', 'css', 'js', 'html', 'css'];
const uniqueTags = new Set(tags);
console.log(uniqueTags);
console.log(uniqueTags.size);
console.log(uniqueTags.has('css'));
uniqueTags.add('sql');
console.log(Array.from(uniqueTags));

const visits = new Map();
visits.set('/accueil', 3);
visits.set('/contact', 1);
visits.set('/accueil', visits.get('/accueil') + 1);
console.log(visits.get('/accueil'));
console.log(visits.size);
console.log(visits.has('/blog'));
console.log(visits);
```

Sortie :

```text
Set(3) { 'js', 'css', 'html' }
3
true
[ 'js', 'css', 'html', 'sql' ]
4
2
false
Map(2) { '/accueil' => 4, '/contact' => 1 }
```

- Un **`Set`** est un ensemble de valeurs **sans doublon**. `has` teste la présence, `add`
  ajoute (sans effet si la valeur existe déjà), `size` donne le nombre d’éléments.
  `Array.from(set)` le reconvertit en tableau. C’est la façon la plus simple de dédoublonner.
- Une **`Map`** associe des clés à des valeurs, comme un objet, mais avec des méthodes
  dédiées (`set`, `get`, `has`, `delete`, `size`) et des clés de n’importe quel type, pas
  seulement des chaînes. On la choisit pour un dictionnaire où l’on ajoute et retire souvent
  des entrées.

Pour décrire une chose avec des propriétés connues à l’avance (un utilisateur, un produit),
l’objet littéral reste le bon choix. Attention aussi : `Map` et `Set` ne se convertissent pas
en JSON comme les objets ; la leçon sur JSON y reviendra.

## Pièges courants

```js
const scores = {};
scores[1] = 'premier';
console.log(scores['1']);
console.log(Object.keys(scores));

const order = { b: 1, 10: 'dix', a: 2, 2: 'deux' };
console.log(Object.keys(order));

console.log({ a: 1 } === { a: 1 });
const user = { name: 'Ada' };
console.log(user.nmae);
```

Sortie :

```text
premier
[ '1' ]
[ '2', '10', 'b', 'a' ]
false
undefined
```

1. **Les clés d’un objet sont des chaînes.** `scores[1]` et `scores['1']` désignent la même
   propriété. Si tu as besoin de vraies clés numériques ou d’objets comme clés, prends une `Map`.
2. **L’ordre des clés a une règle surprenante.** Les clés qui ressemblent à des entiers
   viennent d’abord, dans l’ordre croissant, puis les autres dans l’ordre d’ajout. Ne compte
   pas sur l’ordre des propriétés d’un objet pour afficher une liste : utilise un tableau.
3. **Deux objets au contenu identique ne sont pas égaux** avec `===` : ce sont deux objets
   distincts. La leçon 4 explique pourquoi.
4. **Une faute de frappe ne provoque aucune erreur.** `user.nmae` vaut simplement `undefined`.
   Quand une valeur est inexplicablement `undefined`, vérifie d’abord l’orthographe de la clé,
   puis affiche l’objet entier avec `console.log`.
5. **`obj.key` au lieu de `obj[key]`** : si le nom de la propriété est dans une variable, il
   faut les crochets.

## Exercices

### Exercice 1 — Compter les mots

Écris une fonction `countWords(text)` qui renvoie un objet associant chaque mot (en
minuscules) à son nombre d’apparitions. Les mots sont séparés par des espaces ; ignore les
chaînes vides produites par des espaces multiples. Teste avec
`'Le chat voit le  chien et le chat'` (deux espaces avant `chien`).

:::solution

```js
function countWords(text) {
  const counts = {};
  for (const word of text.toLowerCase().split(' ')) {
    if (word === '') {
      continue; // ignore les espaces multiples
    }
    counts[word] = (counts[word] ?? 0) + 1;
  }
  return counts;
}

console.log(countWords('Le chat voit le  chien et le chat'));
```

Sortie :

```text
{ le: 3, chat: 2, voit: 1, chien: 1, et: 1 }
```

Le mot est dans une variable, donc on écrit `counts[word]` et non `counts.word`. La première
fois qu’un mot apparaît, `counts[word]` vaut `undefined` ; `?? 0` le remplace par 0 avant
d’ajouter 1. Les deux espaces consécutives produisent une chaîne vide dans le résultat de
`split(' ')`, d’où le `continue`.
:::

### Exercice 2 — Augmenter les prix sans toucher l’original

Écris `applyIncrease(prices, rate)` qui reçoit un objet `{ produit: prix }` et renvoie un
**nouvel** objet dont chaque prix est augmenté de `rate` (0.1 pour 10 %), arrondi au centime.
L’objet reçu ne doit pas être modifié. Vérifie-le en affichant les deux objets.

:::solution

```js
function applyIncrease(prices, rate) {
  const result = {};
  for (const [item, price] of Object.entries(prices)) {
    result[item] = Math.round(price * (1 + rate) * 100) / 100;
  }
  return result;
}

const prices = { cafe: 2.2, the: 2.5, chocolat: 3 };
const newPrices = applyIncrease(prices, 0.1);
console.log(newPrices);
console.log(prices);
```

Sortie :

```text
{ cafe: 2.42, the: 2.75, chocolat: 3.3 }
{ cafe: 2.2, the: 2.5, chocolat: 3 }
```

On écrit dans `result`, un objet créé dans la fonction : `prices` reste intact, la deuxième
ligne le prouve. Sans arrondi, `2.2 * 1.1` donnerait `2.4200000000000004` à cause de la
représentation binaire des nombres à virgule. Multiplier par 100, arrondir, puis diviser par
100 donne une valeur au centime. Une fonction qui ne modifie pas ses arguments est plus
facile à tester et à réutiliser ; c’est l’une des conditions d’une fonction pure.
:::

### Exercice 3 — Étiquettes uniques et fréquences

À partir du tableau suivant, construis un `Set` de toutes les étiquettes (sans doublon) et
une `Map` qui donne le nombre d’articles par étiquette. Affiche les étiquettes sous forme de
tableau, la `Map`, puis le nombre d’articles étiquetés `'js'`.

```js
const articles = [
  { title: 'Les tableaux', tags: ['js', 'débutant'] },
  { title: 'Flexbox', tags: ['css', 'débutant'] },
  { title: 'Les objets', tags: ['js'] },
];
```

:::solution

```js
const articles = [
  { title: 'Les tableaux', tags: ['js', 'débutant'] },
  { title: 'Flexbox', tags: ['css', 'débutant'] },
  { title: 'Les objets', tags: ['js'] },
];

const allTags = new Set();
const tagCounts = new Map();
for (const article of articles) {
  for (const tag of article.tags) {
    allTags.add(tag);
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
}
console.log(Array.from(allTags));
console.log(tagCounts);
console.log(tagCounts.get('js'));
```

Sortie :

```text
[ 'js', 'débutant', 'css' ]
Map(3) { 'js' => 2, 'débutant' => 2, 'css' => 1 }
2
```

Chaque article contient un tableau `tags` : il faut donc deux boucles. `add` sur un `Set`
ignore les doublons sans qu’on ait à tester. Pour la `Map`, `get` renvoie `undefined` pour une
clé absente, d’où le `?? 0`, exactement comme avec l’objet de l’exercice 1. Un `Set` et une
`Map` conservent l’ordre d’insertion.
:::

## Récapitulatif

- Un objet associe des clés (des chaînes) à des valeurs ; on le décrit avec `{ clé: valeur }`.
- `obj.cle` pour un nom fixe, `obj[expression]` pour un nom calculé ou contenant un tiret.
- Lire une propriété absente donne `undefined` ; `?.` évite de planter sur un niveau absent.
- Affecter crée ou remplace une propriété ; `delete` la supprime ; `const` n’empêche pas de
  modifier l’objet.
- `Object.hasOwn(obj, 'cle')` teste l’existence, sans se tromper sur `0` ou `undefined`.
- `Object.keys`, `Object.values` et `Object.entries` transforment un objet en tableau pour le
  parcourir ; `Object.fromEntries` fait l’inverse.
- Un tableau d’objets avec un `id` unique est la forme de données la plus courante sur le web.
- `Set` dédoublonne, `Map` est un dictionnaire aux clés de tout type.
