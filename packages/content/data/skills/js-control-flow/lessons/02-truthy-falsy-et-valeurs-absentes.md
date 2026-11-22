---
title: Truthy, falsy et valeurs absentes avec ?? et ?.
summary: Écrire des conditions sûres sur des valeurs qui peuvent manquer, en maîtrisant truthy et falsy, l’opérateur ?? et le chaînage optionnel ?.
durationMinutes: 50
sources:
  - title: MDN — Falsy
    url: https://developer.mozilla.org/fr/docs/Glossary/Falsy
  - title: MDN — Truthy
    url: https://developer.mozilla.org/fr/docs/Glossary/Truthy
  - title: MDN — Opérateur de coalescence des nuls (??)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
  - title: MDN — Chaînage optionnel (?.)
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Optional_chaining
---

## Le problème des valeurs qui manquent

Dans un vrai programme, les données sont souvent incomplètes : un argument de ligne de
commande non fourni, un client sans adresse, un coupon non saisi. Si ton code suppose que
tout est toujours là, il plante au premier cas réel, avec un message comme
`TypeError: Cannot read properties of undefined`. À l’inverse, un test trop large peut
traiter une valeur **valide** comme absente : un stock de 0 affiché « inconnu », un
volume réglé à 0 remplacé par 50.

Cette leçon t’apprend à écrire des conditions précises sur ces valeurs : savoir ce que
`if (value)` teste vraiment, choisir entre `||` et `??`, et lire une donnée imbriquée sans
risque grâce au chaînage optionnel `?.`.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## Ce que teste vraiment if (value)

Une condition n’a pas besoin d’être un booléen. JavaScript convertit la valeur en
booléen selon une règle simple : il existe une **liste fixe de valeurs falsy**, et toutes
les autres sont **truthy**.

| Valeurs falsy | Commentaire                           |
| ------------- | ------------------------------------- |
| `false`       | le booléen faux                       |
| `0`, `-0`     | le nombre zéro                        |
| `0n`          | le zéro de type bigint                |
| `''`          | la chaîne vide (sans aucun caractère) |
| `null`        | absence de valeur volontaire          |
| `undefined`   | valeur non définie                    |
| `NaN`         | résultat numérique invalide           |

Tout le reste est truthy : `'0'`, `'false'`, `' '`, `-1`, `Infinity`, et aussi une liste
vide `[]` ou un objet vide `{}`.

```js
const values = [0, '', 'texte', '0', ' ', null, undefined, NaN, 42, []];

for (const value of values) {
  if (value) {
    console.log(value, '→ truthy');
  } else {
    console.log(value, '→ falsy');
  }
}
```

```text
0 → falsy
 → falsy
texte → truthy
0 → truthy
  → truthy
null → falsy
undefined → falsy
NaN → falsy
42 → truthy
[] → truthy
```

Cet exemple utilise une **liste** (un tableau, écrit entre crochets) et une boucle
`for...of` qui la parcourt élément par élément ; tu les étudieras dans la leçon sur les
boucles. Remarque les deux lignes trompeuses : `''` s’affiche vide, et `'0'` s’affiche
`0` comme le nombre, mais c’est une chaîne non vide, donc truthy.

### Quand if (value) est le bon test

Le test truthy est pratique quand **toutes** les valeurs falsy signifient vraiment
« rien d’utile ». C’est souvent le cas pour du texte saisi :

```js
const couponInput = '';

if (couponInput) {
  console.log(`Coupon appliqué : ${couponInput}`);
} else {
  console.log('Aucun coupon');
}
```

```text
Aucun coupon
```

### Quand if (value) est un piège

Il devient dangereux dès que 0 (ou la chaîne vide) est une valeur **légitime** :

```js
const quantity = 0;

if (quantity) {
  console.log(`Quantité : ${quantity}`);
} else {
  console.log('Quantité non renseignée');
}
```

```text
Quantité non renseignée
```

La quantité vaut 0, ce qui est une information réelle (« aucun article »), mais `if`
la traite comme absente. Dans ce cas, écris un test **explicite** qui dit exactement ce
que tu veux vérifier :

```js
const quantity = 0;

if (quantity === undefined || quantity === null) {
  console.log('Quantité non renseignée');
} else {
  console.log(`Quantité : ${quantity}`);
}
```

```text
Quantité : 0
```

:::tip[Règle pratique]
Avant d’écrire `if (value)`, demande-toi : « 0, la chaîne vide ou `false` sont-ils des
valeurs possibles et valides ici ? » Si oui, teste explicitement (`=== undefined`,
`=== ''`, `Number.isNaN(...)`) ou utilise `??`. Si non, le test truthy est lisible et
suffisant.

:::

## ?? : une valeur par défaut seulement si elle manque

Tu as découvert `??` dans la compétence précédente. Rappel : `a ?? b` renvoie `a`, sauf si
`a` vaut `null` ou `undefined` (on dit que `a` est **nullish**) ; dans ce cas, il renvoie
`b`. Comparé à `||` :

```js
const volume = 0;
const nickname = '';
const city = undefined;

console.log(volume || 50); // → 50
console.log(volume ?? 50); // → 0
console.log(`[${nickname || 'Anonyme'}]`); // → [Anonyme]
console.log(`[${nickname ?? 'Anonyme'}]`); // → []
console.log(city || 'inconnue'); // → inconnue
console.log(city ?? 'inconnue'); // → inconnue
```

- `||` remplace **toute valeur falsy** : à utiliser quand 0, `''` et `false` doivent
  aussi être remplacés.
- `??` remplace **seulement l’absence** (`null` ou `undefined`) : à utiliser quand 0,
  `''` ou `false` sont des valeurs valides à conserver.

Exemple réaliste : un argument facultatif de ligne de commande.

```js
// discount.js — usage : node discount.js [taux en %]
const rateInput = process.argv[2] ?? '10'; // 10 % si rien n’est fourni
const rate = Number(rateInput);

console.log(`Remise appliquée : ${rate} %`);
```

```bash
node discount.js
node discount.js 0
```

```text
Remise appliquée : 10 %
Remise appliquée : 0 %
```

Sans argument, `process.argv[2]` vaut `undefined` et `??` fournit `'10'`. Avec `0`,
l’argument est la chaîne `'0'`, qui n’est pas nullish : elle est conservée. Ici, `||`
aurait donné le même résultat, car `'0'` est truthy ; mais si l’on convertissait d’abord
en nombre, `Number('0') || 10` remplacerait le 0 par 10. Avec `??`, le résultat est
correct dans les deux ordres.

### Les affectations ??= et ||=

Deux raccourcis combinent ces opérateurs et l’affectation :

```js
let pageSize = 0;
pageSize ??= 20; // affecte 20 seulement si pageSize est null ou undefined
console.log(pageSize); // → 0

let title = '';
title ||= 'Sans titre'; // affecte si title est falsy
console.log(title); // → Sans titre
```

Ils réaffectent la variable : ils exigent `let`. Ils sont pratiques, mais la forme longue
`const finalTitle = title || 'Sans titre';` reste souvent plus claire, surtout pour
débuter.

## Lire des données imbriquées : un premier contact avec les objets

Les données réelles ont souvent une structure : une commande a un client, qui a une
adresse, qui a une ville. JavaScript représente ces regroupements avec des **objets**.
Tu les étudieras en détail dans la compétence sur les tableaux et les objets ; voici le
strict nécessaire pour cette leçon.

```js
const order = {
  id: 'A12',
  total: 42.5,
  customer: {
    name: 'Léa',
    address: {
      city: 'Nantes',
    },
  },
};

console.log(order.id); // → A12
console.log(order.customer.name); // → Léa
console.log(order.customer.address.city); // → Nantes
console.log(order.coupon); // → undefined
```

- Un objet s’écrit entre accolades : une liste de **propriétés** `nom: valeur`,
  séparées par des virgules. Une valeur peut elle-même être un objet.
- On lit une propriété avec un **point** : `order.id`. On enchaîne les points pour
  descendre dans la structure.
- Lire une propriété qui n’existe pas ne provoque **pas** d’erreur : on obtient
  `undefined`.

### Le crash classique

Le problème survient quand on essaie de lire une propriété **sur** `undefined` ou `null` :

```js
const order = {
  id: 'B07',
  customer: {
    name: 'Malik',
    // pas d’adresse renseignée
  },
};

console.log(order.customer.address); // → undefined
console.log(order.customer.address.city);
```

```text
undefined
TypeError: Cannot read properties of undefined (reading 'city')
```

`order.customer.address` vaut `undefined`, et `undefined` n’a aucune propriété : lire
`.city` dessus provoque une `TypeError` qui arrête le programme. Le message est précis :
il dit sur quelle valeur (`undefined`) et quelle propriété (`'city'`) la lecture a
échoué. Avec `null`, le message serait
`Cannot read properties of null (reading 'city')`.

### Le chaînage optionnel ?.

L’opérateur `?.` lit une propriété **seulement si** la valeur à sa gauche n’est ni `null`
ni `undefined`. Sinon, il s’arrête immédiatement et renvoie `undefined`, sans erreur :

```js
const order = {
  id: 'B07',
  customer: {
    name: 'Malik',
  },
};

console.log(order.customer.address?.city); // → undefined
console.log(order.customer?.name); // → Malik
console.log(order.delivery?.date); // → undefined
```

Combiné avec `??`, il donne une valeur de repli lisible :

```js
const order = {
  id: 'B07',
  customer: {
    name: 'Malik',
  },
};

const city = order.customer.address?.city ?? 'ville non renseignée';
console.log(`Livraison : ${city}`); // → Livraison : ville non renseignée
```

Règles d’utilisation :

- Place `?.` **là où la valeur peut légitimement manquer**, pas partout. Si
  `order.customer` doit toujours exister, écrire `order?.customer?.address?.city`
  cacherait un vrai bug : mieux vaut une erreur claire qu’un `undefined` silencieux qui
  se propage.
- `?.` court-circuite toute la suite : dans `order.delivery?.date.toUpperCase()`, si
  `delivery` manque, ni `.date` ni `toUpperCase()` ne sont évalués, et le résultat est
  `undefined`.
- Il existe aussi `?.()` pour appeler une méthode seulement si elle existe, et `?.[ ]`
  pour un accès avec crochets. Tu les croiseras plus tard.
- `?.` ne protège que de `null` et `undefined`. Si `address` vaut `'Nantes'` (une chaîne),
  `address?.city` vaut `undefined` sans erreur, mais ce n’est probablement pas ce que tu
  voulais : `?.` ne remplace pas la vérification des données.

## Écrire des conditions sur des valeurs incertaines

Récapitulons les tests à ta disposition, du plus précis au plus large :

| Je veux savoir si…                                | Test                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| la valeur est exactement `undefined`              | `value === undefined`                                            |
| la valeur est absente (`null` ou `undefined`)     | `value === null` et `value === undefined` reliés par OU, ou `??` |
| la chaîne est vide ou ne contient que des espaces | `text.trim() === ''`                                             |
| la conversion en nombre a échoué                  | `Number.isNaN(Number(input))`                                    |
| la valeur est « quelque chose d’utile »           | `if (value)` (si aucune valeur falsy n’est légitime)             |
| la propriété imbriquée existe                     | `object.parent?.child !== undefined`                             |

Exemple qui combine plusieurs de ces tests : afficher la fiche d’un produit dont
certaines informations peuvent manquer.

```js
const product = {
  name: 'Théière en fonte',
  stock: 0,
  supplier: null,
};

const stockLabel = product.stock ?? 'inconnu';
const supplierName = product.supplier?.name ?? 'fournisseur non renseigné';
const availability = product.stock > 0 ? 'disponible' : 'épuisé';

console.log(`${product.name} — stock : ${stockLabel} (${availability})`);
console.log(`Fournisseur : ${supplierName}`);
```

```text
Théière en fonte — stock : 0 (épuisé)
Fournisseur : fournisseur non renseigné
```

`product.supplier` vaut `null` : `?.` évite le crash en lisant `.name`, et `??` fournit le
texte de repli. Le stock 0 est conservé grâce à `??`.

## Pièges fréquents

- **`if (quantity)` avec une quantité qui peut valoir 0** : 0 est traité comme absent.
  Correction : test explicite ou `??`.
- **Croire que `'0'` ou `'false'` sont falsy** : ce sont des chaînes non vides.
- **Lire une propriété sur `undefined`** : `TypeError: Cannot read properties of
undefined`. Correction : `?.` là où la donnée peut manquer, ou une vérification
  préalable.
- **Mettre `?.` partout** : cela masque les vrais bugs. N’en mets que là où l’absence est
  un cas prévu.
- **Mélanger `??` et `||` sans parenthèses** : `SyntaxError`. Correction : parenthèses
  explicites.

## Exercices

### Exercice 1 — Truthy ou falsy ?

Pour chaque valeur, prévois si `if (value)` exécute le bloc : `0`, `'0'`, `''`, `' '`,
`'false'`, `null`, `NaN`, `-1`, `Number('abc')`, `'abc'.length`, `''.length`.

:::solution
Exécutent le bloc (truthy) : `'0'`, `' '`, `'false'`, `-1`, `'abc'.length` (vaut 3).

Ne l’exécutent pas (falsy) : `0`, `''`, `null`, `NaN`, `Number('abc')` (vaut `NaN`),
`''.length` (vaut 0).

Le piège principal est la chaîne `'0'` : elle contient un caractère, elle est donc
truthy. Seules les valeurs du tableau des falsy sont fausses ; tout le reste est vrai.

:::

### Exercice 2 — Les préférences utilisateur

Un utilisateur a réglé ses préférences ainsi :

```js
const preferences = {
  fontSize: 0,
  theme: '',
  notifications: false,
};
```

Le programme doit utiliser 16 pour la taille si elle manque, `'clair'` pour le thème s’il
est absent **ou vide**, et `true` pour les notifications seulement si le réglage
manque. Une propriété `language` peut aussi manquer : par défaut, `'fr'`. Écris les
quatre lignes, affiche le résultat, et justifie chaque opérateur.

:::solution

```js
const preferences = {
  fontSize: 0,
  theme: '',
  notifications: false,
};

const fontSize = preferences.fontSize ?? 16; // 0 est un réglage (même s’il est étrange)
const theme = preferences.theme || 'clair'; // la chaîne vide doit être remplacée
const notifications = preferences.notifications ?? true; // false est un choix explicite
const language = preferences.language ?? 'fr'; // absente : undefined, donc remplacée

console.log(fontSize, theme, notifications, language);
```

```text
0 clair false fr
```

`??` conserve 0 et `false`, qui sont des choix de l’utilisateur ; `||` remplace la chaîne
vide, comme le demande l’énoncé. Avec `||` partout, les notifications désactivées
seraient réactivées contre l’avis de l’utilisateur : un bug réel et gênant.

:::

### Exercice 3 — Le colis sans adresse

Ce code plante pour certaines commandes. Explique pourquoi, puis corrige-le pour afficher
`Ville : à compléter` quand l’adresse ou la ville manquent, sans masquer l’absence du
client lui-même (qui doit rester une erreur).

```js
const order = {
  id: 'C33',
  customer: { name: 'Zoé', address: null },
};

console.log(`Ville : ${order.customer.address.city}`);
```

:::solution
`order.customer.address` vaut `null`. Lire `.city` sur `null` provoque
`TypeError: Cannot read properties of null (reading 'city')`.

```js
const order = {
  id: 'C33',
  customer: { name: 'Zoé', address: null },
};

console.log(`Ville : ${order.customer.address?.city ?? 'à compléter'}`);
```

```text
Ville : à compléter
```

`?.` est placé seulement après `address`, la valeur qui peut manquer. Si une adresse
existe sans ville, `.city` vaut `undefined` et `??` fournit aussi le repli. On n’écrit pas
`order.customer?.address` : une commande sans client est une anomalie qui doit continuer
à provoquer une erreur visible.

:::

## Récapitulatif

- Valeurs falsy : `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`. Tout le
  reste est truthy, y compris `'0'`, `' '`, `[]` et `{}`.
- `if (value)` est un test pratique mais large : n’y recours que si aucune valeur falsy
  n’est légitime. Sinon, écris un test explicite.
- `a ?? b` remplace seulement `null` et `undefined` ; `a || b` remplace toute valeur falsy.
- Un objet regroupe des propriétés `nom: valeur` ; on les lit avec un point, et une
  propriété absente vaut `undefined`.
- Lire une propriété sur `undefined` ou `null` provoque une `TypeError`.
- `a?.b` renvoie `undefined` au lieu de planter si `a` est nullish. Place-le seulement là
  où l’absence est prévue, et combine-le avec `??` pour une valeur de repli.
