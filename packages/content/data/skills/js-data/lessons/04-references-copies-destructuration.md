---
title: Références, copies et déstructuration
summary: Comprendre pourquoi modifier un objet peut en modifier un autre, copier correctement et extraire des valeurs avec la déstructuration et la décomposition.
durationMinutes: 60
sources:
  - title: MDN — Affecter par décomposition (déstructuration)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Destructuring
  - title: MDN — Syntaxe de décomposition
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Spread_syntax
  - title: MDN — structuredClone()
    url: https://developer.mozilla.org/fr/docs/Web/API/Window/structuredClone
  - title: MDN — Copie superficielle (glossaire)
    url: https://developer.mozilla.org/fr/docs/Glossary/Shallow_copy
---

## Le bug du panier partagé

Imagine une application qui affiche un panier et, à côté, un aperçu « si tu ajoutes ce
produit ». Le développeur copie le panier dans une variable `preview`, y ajoute le produit…
et le panier réel change aussi. Rien n’a été « copié » : les deux variables désignaient le même
tableau.

Ce comportement n’est pas un défaut de JavaScript, c’est la différence entre **valeurs** et
**références**. La comprendre évite une catégorie entière de bugs, parmi les plus difficiles à
diagnostiquer, et elle est indispensable pour travailler avec les interfaces (DOM, React) et
les API. Cette leçon présente aussi deux syntaxes omniprésentes dans le code moderne : la
**déstructuration** et la **décomposition** (`...`).

## Valeurs et références

```js
let a = 5;
let b = a; // copie la valeur 5
b += 1;
console.log(a, b);

const original = { count: 1 };
const alias = original; // copie la référence, pas l’objet
alias.count = 2;
console.log(original.count);
console.log(alias === original);

const twin = { count: 2 };
console.log(twin === original);
```

Sortie (`node example.js`) :

```text
5 6
2
true
false
```

- Les **primitives** (nombres, chaînes, booléens, `null`, `undefined`…) se copient **par
  valeur** : `b` reçoit sa propre copie de `5`. Modifier `b` ne touche pas `a`.
- Les **objets** — et donc les tableaux, les fonctions, les `Map`… — sont manipulés **par
  référence**. Une variable ne contient pas l’objet lui-même mais un moyen de le retrouver,
  comme une adresse. `const alias = original` copie l’adresse : il n’existe toujours qu’un seul
  objet, accessible par deux noms.
- `===` sur deux objets compare les **références** : « est-ce le même objet ? », et non « ont-ils
  le même contenu ? ». `twin` a le même contenu mais c’est un autre objet, d’où `false`.

Une image utile : une variable est une étiquette. Pour une primitive, l’étiquette porte la
valeur. Pour un objet, elle porte l’adresse d’une boîte ; deux étiquettes peuvent porter la
même adresse.

### Les fonctions reçoivent aussi la référence

```js
function addBonus(student) {
  student.grade += 2; // modifie l’objet reçu : visible par l’appelant
}

function replaceStudent(student) {
  student = { name: 'Autre', grade: 20 }; // réaffecte le paramètre local seulement
}

const lina = { name: 'Lina', grade: 13 };
addBonus(lina);
console.log(lina);
replaceStudent(lina);
console.log(lina);
```

Sortie :

```text
{ name: 'Lina', grade: 15 }
{ name: 'Lina', grade: 15 }
```

Le paramètre `student` reçoit une copie de la référence. **Modifier l’objet** au travers de
cette référence (`student.grade += 2`) modifie l’objet de l’appelant. **Réaffecter** le
paramètre (`student = …`) fait seulement pointer la variable locale ailleurs : l’appelant n’est
pas touché.

## Mutation et immutabilité

**Muter** un objet, c’est changer son contenu après sa création : `push`, `splice`, `sort`,
affecter une propriété, `delete`. Une donnée **immuable** ne change jamais : pour la « modifier »,
on crée une nouvelle version. Les chaînes de caractères sont immuables par nature : `toUpperCase`
renvoie une nouvelle chaîne.

Pourquoi préférer souvent l’immutabilité ?

- **Pas d’effet de bord caché** : une fonction qui renvoie une nouvelle valeur ne casse pas
  les données de l’appelant.
- **Détection simple des changements** : si l’objet a changé, c’est un nouvel objet ;
  `ancien !== nouveau` suffit pour le savoir. Les bibliothèques d’interface s’appuient sur ce
  principe.
- **Historique possible** : garder l’ancienne version permet d’annuler.

Ce n’est pas une règle absolue : construire un tableau localement avec `push` dans une fonction
est parfaitement sain. Le danger est de **muter une donnée partagée** sans le vouloir. Pour
écrire du code immuable, il faut savoir copier : c’est le rôle de la décomposition.

## La déstructuration

La déstructuration extrait des valeurs d’un tableau ou d’un objet et les range dans des
variables, en une instruction.

### Déstructurer un tableau

```js
const point = [12, 7, 3];
const [x, y] = point;
console.log(x, y);

const [first, , third] = point;
console.log(first, third);

const [head, ...tail] = point;
console.log(head, tail);

const [a = 'défaut', b = 'défaut'] = ['fourni'];
console.log(a, b);

let left = 'gauche';
let right = 'droite';
[left, right] = [right, left];
console.log(left, right);
```

Sortie :

```text
12 7
12 3
12 [ 7, 3 ]
fourni défaut
droite gauche
```

- Les variables reçoivent les éléments **par position**.
- Une virgule sans nom saute un élément.
- `...tail` (le **reste**) récupère les éléments restants dans un nouveau tableau ; il est
  forcément en dernière position.
- `= valeur` donne une valeur par défaut, utilisée quand l’élément vaut `undefined`.
- L’échange de deux variables en une ligne est un usage classique.

C’est cette syntaxe que tu as vue dans `for (const [key, value] of Object.entries(obj))` :
chaque paire `[clé, valeur]` est déstructurée.

### Déstructurer un objet

```js
const user = {
  id: 7,
  name: 'Ada',
  address: { city: 'Lyon' },
};

const { name, id } = user;
console.log(name, id);

const { name: userName, role = 'lecteur' } = user;
console.log(userName, role);

const {
  address: { city },
} = user;
console.log(city);

const { id: userId, ...profile } = user;
console.log(userId, profile);

function describe({ name, role = 'lecteur' }) {
  return `${name} (${role})`;
}
console.log(describe(user));
console.log(describe({ name: 'Grace', role: 'admin' }));
```

Sortie :

```text
Ada 7
Ada lecteur
Lyon
7 { name: 'Ada', address: { city: 'Lyon' } }
Ada (lecteur)
Grace (admin)
```

- Pour un objet, les variables sont associées **par nom de propriété**, l’ordre n’a pas
  d’importance.
- `name: userName` lit la propriété `name` et la range dans une variable `userName` (lis
  « name devient userName »).
- `role = 'lecteur'` fournit une valeur par défaut à une propriété absente.
- On peut descendre dans un objet imbriqué : `address: { city }` crée seulement la variable
  `city`, pas de variable `address`.
- `...profile` rassemble les propriétés restantes dans un **nouvel** objet : c’est la manière
  propre d’obtenir un objet « sans la propriété `id` », sans `delete`.
- La déstructuration fonctionne dans les **paramètres** d’une fonction. C’est très courant
  pour les fonctions qui reçoivent un objet d’options : la signature montre directement les
  propriétés attendues.

:::warning[Déstructurer `undefined` provoque une erreur]
`const { a } = undefined;` lève `TypeError: Cannot destructure property 'a' of 'undefined'
as it is undefined.` C’est fréquent avec un paramètre oublié ou une propriété imbriquée
absente. Donne une valeur par défaut à l’objet lui-même : `function f({ a } = {})` ou
`address: { city } = {}`.
:::

## La décomposition (`...`)

Les trois points ont deux rôles opposés selon leur place :

- à gauche d’un `=` ou dans des paramètres, c’est le **reste** : il **rassemble** des éléments
  (`const [head, ...tail] = …`, `function f(...args)`) ;
- dans un tableau littéral, un objet littéral ou un appel de fonction, c’est la
  **décomposition** (_spread_) : il **étale** les éléments.

```js
const fruits = ['pomme', 'poire'];
const copy = [...fruits];
const more = [...fruits, 'kiwi'];
const merged = ['banane', ...fruits, ...more];
copy.push('cerise');
console.log(fruits);
console.log(copy);
console.log(more);
console.log(merged);
console.log(Math.max(...[4, 18, 9]));

const defaults = { theme: 'clair', fontSize: 16, language: 'fr' };
const choices = { fontSize: 20 };
const settings = { ...defaults, ...choices };
console.log(settings);
console.log({ ...choices, ...defaults });
console.log(defaults);
```

Sortie :

```text
[ 'pomme', 'poire' ]
[ 'pomme', 'poire', 'cerise' ]
[ 'pomme', 'poire', 'kiwi' ]
[ 'banane', 'pomme', 'poire', 'pomme', 'poire', 'kiwi' ]
18
{ theme: 'clair', fontSize: 20, language: 'fr' }
{ fontSize: 16, theme: 'clair', language: 'fr' }
{ theme: 'clair', fontSize: 16, language: 'fr' }
```

- `[...fruits]` crée un **nouveau** tableau avec les mêmes éléments : ajouter à `copy` ne
  touche pas `fruits`.
- On peut étaler plusieurs tableaux et ajouter des éléments avant, entre ou après.
- `Math.max(...tableau)` passe chaque élément comme un argument séparé.
- `{ ...defaults, ...choices }` fusionne des objets. **En cas de clé en double, la dernière
  gagne** : c’est pourquoi on place les valeurs par défaut en premier et les choix de
  l’utilisateur ensuite. Inverser l’ordre donne le mauvais résultat, comme le montre la
  septième ligne.

### Les mises à jour immuables courantes

```js
const todos = [
  { id: 1, title: 'Lire', done: false },
  { id: 2, title: 'Coder', done: false },
];

const added = [...todos, { id: 3, title: 'Tester', done: false }];
const removed = todos.filter((todo) => todo.id !== 1);
const toggled = todos.map((todo) =>
  todo.id === 2 ? { ...todo, done: true } : todo,
);

console.log(added.length, removed.length);
console.log(toggled[1]);
console.log(todos[1]);
console.log(toggled[0] === todos[0], toggled[1] === todos[1]);
```

Sortie :

```text
3 1
{ id: 2, title: 'Coder', done: true }
{ id: 2, title: 'Coder', done: false }
true false
```

Ces trois motifs reviennent sans cesse :

| Opération         | Mutable                  | Immuable                                                     |
| ----------------- | ------------------------ | ------------------------------------------------------------ |
| ajouter           | `todos.push(item)`       | `[...todos, item]`                                           |
| retirer           | `todos.splice(index, 1)` | `todos.filter((t) => t.id !== id)`                           |
| modifier un objet | `todo.done = true`       | `todos.map((t) => (t.id === id ? { ...t, done: true } : t))` |
| trier             | `todos.sort(compare)`    | `todos.toSorted(compare)`                                    |

La dernière ligne de la sortie montre un point important : l’élément non modifié est **réutilisé**
tel quel (`true`), seul l’élément modifié est un nouvel objet (`false`).

## Copies superficielles et copies profondes

`[...array]` et `{ ...object }` produisent des **copies superficielles** (_shallow copies_) :
seul le premier niveau est copié. Les objets imbriqués, eux, sont partagés.

```js
const order = {
  id: 'A1',
  customer: { name: 'Inès' },
  lines: [{ product: 'Stylo', quantity: 2 }],
};

const shallow = { ...order };
shallow.id = 'A2';
shallow.customer.name = 'Hugo';
shallow.lines.push({ product: 'Cahier', quantity: 1 });

console.log(order.id);
console.log(order.customer.name);
console.log(order.lines.length);
console.log(shallow.customer === order.customer);
```

Sortie :

```text
A1
Hugo
2
true
```

`id` est une primitive copiée : changer `shallow.id` ne touche pas `order`. Mais
`shallow.customer` contient **la même référence** que `order.customer` : modifier le client de
la copie modifie celui de l’original. Idem pour le tableau `lines`. C’est le « bug du panier
partagé » de l’introduction, un niveau plus bas.

Deux solutions :

1. **Copier chaque niveau que tu modifies** :
   `{ ...order, customer: { ...order.customer, name: 'Hugo' } }`. C’est la méthode habituelle
   pour une mise à jour immuable : on ne recopie que le chemin qui change.
2. **Faire une copie profonde** avec `structuredClone`, quand tu as besoin d’un double
   entièrement indépendant.

```js
const order = {
  id: 'A1',
  createdAt: new Date('2026-03-01T10:00:00Z'),
  customer: { name: 'Inès' },
  lines: [{ product: 'Stylo', quantity: 2 }],
};

const deep = structuredClone(order);
deep.customer.name = 'Hugo';
deep.lines[0].quantity = 10;

console.log(order.customer.name, order.lines[0].quantity);
console.log(deep.customer.name, deep.lines[0].quantity);
console.log(deep.createdAt instanceof Date);

try {
  structuredClone({ name: 'Ada', greet() {} });
} catch (error) {
  console.log(error.name);
}
```

Sortie :

```text
Inès 2
Hugo 10
true
DataCloneError
```

`structuredClone` (disponible dans les navigateurs et dans Node.js) copie tous les niveaux et
conserve les `Date`, `Map` et `Set`. En revanche, il **refuse les fonctions** : un objet qui
contient une méthode provoque une erreur `DataCloneError`. Il ne conserve pas non plus le type
des objets créés à partir de classes. Pour des données « simples » (ce que renvoie une API), il
convient parfaitement.

:::tip[Geler un objet]
`Object.freeze(obj)` empêche de modifier les propriétés d’un objet. Dans un module ES (mode
strict), une tentative de modification lève une `TypeError` ; dans un script non strict, elle
est ignorée silencieusement. Le gel est lui aussi **superficiel** : les objets imbriqués restent
modifiables. On s’en sert surtout pour des constantes de configuration.
:::

## Pièges courants

1. **Croire que `const copy = original` copie.** Cela crée un second nom pour le même objet.
   Utilise `[...arr]`, `{ ...obj }` ou `structuredClone`.
2. **Oublier que la copie est superficielle.** Après `{ ...order }`, `order.customer` est
   partagé. Copie aussi les niveaux que tu modifies.
3. **Muter dans `map`.** `todos.map((t) => { t.done = true; return t; })` renvoie un nouveau
   tableau, mais les objets dedans sont les mêmes, et ils ont été modifiés. Écris
   `todos.map((t) => ({ ...t, done: true }))` : les parenthèses autour des accolades indiquent
   un objet littéral, pas un corps de fonction.
4. **Comparer des objets avec `===` pour tester leur contenu.** Compare les propriétés utiles
   (`a.id === b.id`).
5. **Mauvais ordre de fusion.** `{ ...userChoices, ...defaults }` écrase les choix de
   l’utilisateur. Les valeurs par défaut vont en premier.
6. **Déstructurer une valeur possiblement absente** sans valeur par défaut `= {}`.

## Exercices

### Exercice 1 — Prédire avant d’exécuter

Sans exécuter le code, écris ce que chaque `console.log` affiche et justifie. Vérifie ensuite
avec Node.

```js
const team = { name: 'Bleus', members: ['Ada', 'Linus'] };
const copy = { ...team };
const same = team;

copy.name = 'Rouges';
copy.members.push('Grace');
same.name = 'Verts';

console.log(team.name);
console.log(copy.name);
console.log(team.members.length);
console.log(copy.members === team.members);
```

:::solution
Sortie :

```text
Verts
Rouges
3
true
```

- `same` est un second nom pour `team` : `same.name = 'Verts'` modifie `team`.
- `copy` est un nouvel objet (copie superficielle) : son `name` est indépendant, il vaut
  `'Rouges'`, et `team.name` n’a pas été touché par cette ligne.
- `copy.members` et `team.members` désignent **le même tableau** : le `push` sur la copie
  ajoute `'Grace'` au tableau de `team`, qui compte donc 3 membres, et `===` renvoie `true`.

Pour une copie vraiment indépendante : `{ ...team, members: [...team.members] }` ou
`structuredClone(team)`.
:::

### Exercice 2 — Mettre à jour un panier sans le muter

Écris `updateQuantity(cart, productId, quantity)` qui renvoie un **nouveau** panier où la ligne
du produit a la nouvelle quantité ; si `quantity` vaut 0 ou moins, la ligne est retirée. Le
panier reçu ne doit jamais être modifié. Vérifie-le, et vérifie que les lignes non concernées
sont réutilisées.

:::solution

```js
function updateQuantity(cart, productId, quantity) {
  if (quantity <= 0) {
    return cart.filter((line) => line.productId !== productId);
  }
  return cart.map((line) =>
    line.productId === productId ? { ...line, quantity } : line,
  );
}

const cart = [
  { productId: 'p1', name: 'Stylo', quantity: 2 },
  { productId: 'p2', name: 'Cahier', quantity: 1 },
];

const updated = updateQuantity(cart, 'p1', 5);
const emptied = updateQuantity(cart, 'p2', 0);

console.log(updated);
console.log(emptied);
console.log(cart);
console.log(updated[1] === cart[1]);
```

Sortie :

```text
[
  { productId: 'p1', name: 'Stylo', quantity: 5 },
  { productId: 'p2', name: 'Cahier', quantity: 1 }
]
[ { productId: 'p1', name: 'Stylo', quantity: 2 } ]
[
  { productId: 'p1', name: 'Stylo', quantity: 2 },
  { productId: 'p2', name: 'Cahier', quantity: 1 }
]
true
```

Retirer → `filter`, modifier → `map` avec `{ ...line, quantity }`. Ce dernier objet copie la
ligne puis remplace `quantity` (raccourci de `quantity: quantity`, et la dernière clé gagne).
Le panier d’origine est intact (troisième affichage) et la ligne `p2`, non concernée, est le
même objet dans les deux paniers.
:::

### Exercice 3 — Déstructurer des paramètres avec des valeurs par défaut

Écris `formatContact(contact)` qui renvoie `'Prénom Nom — Ville'`. Le nom est facultatif ;
l’adresse aussi, et la ville peut manquer : on affiche alors `ville inconnue`. Utilise la
déstructuration dans les paramètres, sans aucun `if`.

:::solution

```js
function formatContact({
  firstName,
  lastName = '',
  address: { city = 'ville inconnue' } = {},
}) {
  return `${firstName} ${lastName}`.trim() + ` — ${city}`;
}

console.log(
  formatContact({
    firstName: 'Ada',
    lastName: 'Lovelace',
    address: { city: 'Londres' },
  }),
);
console.log(formatContact({ firstName: 'Grace' }));
console.log(formatContact({ firstName: 'Linus', address: {} }));
```

Sortie :

```text
Ada Lovelace — Londres
Grace — ville inconnue
Linus — ville inconnue
```

`address: { … } = {}` est la clé : si `address` est absente, on déstructure un objet vide au
lieu de `undefined`, ce qui évite la `TypeError`. Ensuite `city = 'ville inconnue'` couvre une
adresse sans ville. `trim()` supprime l’espace finale quand le nom est vide.
:::

## Récapitulatif

- Les primitives se copient par valeur ; les objets et tableaux se manipulent par référence.
- `===` entre objets teste « même objet », pas « même contenu ».
- Une fonction qui modifie un objet reçu modifie celui de l’appelant ; réaffecter le
  paramètre, non.
- Muter = modifier en place ; immuable = créer une nouvelle version. Évite de muter une donnée
  partagée.
- Déstructuration : `const [a, b] = arr` par position, `const { name } = obj` par nom, avec
  renommage, valeurs par défaut, reste et imbrication.
- `...` rassemble (reste) ou étale (décomposition) selon sa place ; pour fusionner des objets,
  la dernière clé gagne.
- `[...arr]` et `{ ...obj }` sont des copies **superficielles** ; `structuredClone` fait une
  copie profonde mais refuse les fonctions.
