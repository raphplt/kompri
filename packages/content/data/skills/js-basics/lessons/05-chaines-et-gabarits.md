---
title: Chaînes de caractères et gabarits
summary: Écrire, découper, transformer et formater du texte avec les méthodes de chaînes et les gabarits de chaînes.
durationMinutes: 60
sources:
  - title: MDN — String
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/String
  - title: MDN — Littéraux de gabarits
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Template_literals
  - title: MDN — Number.prototype.toLocaleString()
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString
---

## Du texte partout

Un ticket de caisse, une étiquette produit, un message d’erreur, un nom d’utilisateur :
la plupart des programmes passent une grande partie de leur temps à **fabriquer du
texte** à partir de données. Il faut mettre une référence en majuscules, retirer les
espaces qu’un utilisateur a tapées par erreur, aligner des colonnes, afficher un prix
« à la française ». Cette leçon te donne les outils pour tout cela : l’écriture des
chaînes, leurs méthodes principales et les **gabarits de chaînes**, la façon moderne de
composer un texte.

Rappel de convention : dans les exemples, `// →` indique ce qu’affiche la ligne.

## Écrire une chaîne

Une chaîne (type `string`) s’écrit entre trois délimiteurs possibles. Essaie ces lignes
dans le mode interactif de Node.js (commande `node`) :

```text
> 'Bonjour' === "Bonjour"
true
> "Bonjour" === `Bonjour`
true
```

Les trois écritures produisent la même chaîne. Les apostrophes simples et doubles sont
équivalentes ; le choix est une **convention** d’équipe. Ce parcours utilise les
apostrophes simples, que l’outil de formatage du projet (Prettier) applique
automatiquement dans les fichiers. L’accent grave `` ` `` crée un **gabarit de chaîne**,
qui a des pouvoirs supplémentaires (plus bas).

### Les caractères spéciaux

Comment écrire une apostrophe dans une chaîne délimitée par des apostrophes ? On
**échappe** le caractère avec une barre oblique inverse `\` : `\'` produit une
apostrophe sans fermer la chaîne.

```text
> 'L\'été'
"L'été"
> "L'été"
"L'été"
> 'L’été'
'L’été'
```

Le mode interactif affiche la valeur entre guillemets pour montrer que c’est une chaîne,
en choisissant le délimiteur qui évite l’échappement. Dans tes fichiers, Prettier fait
de même : il transforme `'L\'été'` en `"L'été"`. En français, l’apostrophe
typographique `’` n’a même pas besoin d’être échappée : ce n’est pas un délimiteur de
JavaScript.

D’autres séquences d’échappement produisent des caractères spéciaux :

```js
console.log('Ligne 1\nLigne 2');
console.log('Colonne\tsuivante');
console.log('Un antislash : \\');
```

```text
Ligne 1
Ligne 2
Colonne	suivante
Un antislash : \
```

`\n` est un saut de ligne, `\t` une tabulation, `\\` une barre oblique inverse.

## Longueur et caractères

```js
const city = 'Marseille';

console.log(city.length); // → 9
console.log(city[0]); // → M
console.log(city[city.length - 1]); // → e
console.log(city.at(-1)); // → e
console.log(city[20]); // → undefined
```

- `length` donne le nombre de caractères. C’est une **propriété**, pas une méthode :
  pas de parenthèses.
- Les caractères sont numérotés à partir de **0** : le premier est `city[0]`, le
  dernier `city[city.length - 1]`.
- `at(-1)` accepte des positions négatives, comptées depuis la fin.
- Une position qui n’existe pas donne `undefined`, sans erreur.

:::note[Ce que compte vraiment length]
`length` compte des unités de codage internes (UTF-16), pas toujours des caractères
visibles. Les lettres accentuées courantes comptent pour 1 (`'Théière'.length` vaut 7),
mais certains symboles comme les émojis comptent pour 2 : `'🙂'.length` vaut 2. Pour
du texte français ordinaire, `length` donne le résultat attendu.

:::

### Les chaînes sont immuables

On ne peut **pas modifier** une chaîne existante. Toutes les méthodes de chaînes
**renvoient une nouvelle chaîne** et laissent l’originale intacte :

```js
const reference = 'th-0042';
const upperReference = reference.toUpperCase();

console.log(upperReference); // → TH-0042
console.log(reference); // → th-0042
```

C’est une bonne nouvelle : tu peux transformer une donnée pour l’affichage sans risque de
l’abîmer. Mais c’est aussi un piège classique : écrire `reference.toUpperCase();` seul,
sans utiliser ni ranger le résultat, ne sert à rien. Et tenter `reference[0] = 'T'` ne
modifie rien : l’instruction est ignorée dans un script classique et provoque une
`TypeError` en mode strict (dans un module ES).

## Les méthodes essentielles

Une **méthode** est une fonction attachée à une valeur. On l’appelle avec un point et des
parenthèses : `valeur.methode(arguments)`.

### Changer la casse et nettoyer

```js
const rawEmail = '  Alice.Martin@Example.COM \n';

console.log(rawEmail.trim().toLowerCase()); // → alice.martin@example.com
console.log('kompri'.toUpperCase()); // → KOMPRI
console.log(`[${'  centré  '.trimStart()}]`); // → [centré  ]
console.log(`[${'  centré  '.trimEnd()}]`); // → [  centré]
```

- `toUpperCase()` et `toLowerCase()` changent la casse.
- `trim()` retire les **blancs** (espaces, tabulations, sauts de ligne) au début et à la
  fin, jamais au milieu. `trimStart()` et `trimEnd()` ne traitent qu’un côté.
- Les méthodes s’**enchaînent** : `trim()` renvoie une chaîne, sur laquelle on appelle
  `toLowerCase()`. On lit de gauche à droite.

Nettoyer une saisie avec `trim()` avant de la tester est un réflexe à prendre : un
utilisateur qui tape une espace par erreur ne doit pas casser ton programme.

### Chercher dans une chaîne

```js
const sentence = 'Livraison gratuite dès 50 €';

console.log(sentence.includes('gratuite')); // → true
console.log(sentence.includes('Gratuite')); // → false
console.log(sentence.startsWith('Livraison')); // → true
console.log(sentence.endsWith('€')); // → true
console.log(sentence.indexOf('50')); // → 23
console.log(sentence.indexOf('100')); // → -1
```

- `includes`, `startsWith` et `endsWith` répondent par un booléen.
- `indexOf` renvoie la position de la première occurrence, ou **-1** si le texte est
  absent.
- La recherche est **sensible à la casse**. Pour l’ignorer, compare deux versions en
  minuscules : `sentence.toLowerCase().includes(search.toLowerCase())`.

### Extraire une partie avec slice

`slice(start, end)` renvoie le morceau qui commence à la position `start` et s’arrête
**juste avant** `end`. Sans `end`, il va jusqu’à la fin. Les positions négatives comptent
depuis la fin.

```js
const word = 'Bonjour';

console.log(word.slice(0, 3)); // → Bon
console.log(word.slice(3)); // → jour
console.log(word.slice(-4)); // → jour
console.log(word.slice(1, -1)); // → onjou

const cardNumber = '4970101234567890';
console.log(cardNumber.slice(-4)); // → 7890
```

Astuce pour retenir la borne de fin exclue : `word.slice(0, 3)` contient exactement
`3 - 0 = 3` caractères.

### Remplacer

```js
const price = '39.00';

console.log(price.replace('.', ',')); // → 39,00
console.log('a-b-c'.replace('-', '+')); // → a+b-c
console.log('a-b-c'.replaceAll('-', '+')); // → a+b+c
```

`replace` ne remplace que la **première** occurrence ; `replaceAll` les remplace toutes.
Les deux renvoient une nouvelle chaîne.

### Répéter et compléter

```js
console.log('='.repeat(20)); // → ====================
console.log('7'.padStart(3, '0')); // → 007
console.log('Total'.padEnd(12, '.') + ' 8.50 €'); // → Total....... 8.50 €
console.log('Pain'.padStart(8)); // →     Pain
console.log('Croissants'.padEnd(5)); // → Croissants
```

- `repeat(n)` répète la chaîne `n` fois.
- `padStart(length, filler)` ajoute le remplissage **au début** jusqu’à atteindre la
  longueur `length` ; `padEnd` l’ajoute **à la fin**. Sans second argument, on complète
  avec des espaces.
- Si la chaîne est déjà plus longue que `length`, elle est renvoyée **telle quelle**,
  sans être tronquée.

Ces méthodes servent à aligner des colonnes dans un terminal :

```js
const label = 'Croissant x4';
const amount = '4.60 €';

console.log(label.padEnd(20, '.') + amount.padStart(10));
console.log('Pain x3'.padEnd(20, '.') + '3.90 €'.padStart(10));
```

```text
Croissant x4........    4.60 €
Pain x3.............    3.90 €
```

### Centrer un texte

Pour centrer un titre dans une ligne de largeur fixe, on calcule le nombre d’espaces à
gauche, puis on complète à droite :

```js
const width = 30;
const title = 'Théière en fonte';

const leftPadding = Math.floor((width - title.length) / 2);
const centered = title.padStart(title.length + leftPadding).padEnd(width);

console.log('='.repeat(width));
console.log(`|${centered}|`);
console.log('='.repeat(width));
```

```text
==============================
|       Théière en fonte       |
==============================
```

Le titre fait 16 caractères. Il reste 14 espaces à répartir : `Math.floor(14 / 2)` donne 7
à gauche, et `padEnd(30)` complète à droite jusqu’à 30. Les barres `|` permettent de
vérifier les espaces. Avec une différence impaire, l’espace en trop va à droite grâce à
`Math.floor`.

:::warning[Et si le texte est trop long ?]
Avec un titre de 40 caractères, `width - title.length` vaut -10 et `leftPadding` vaut -5.
`padStart` et `padEnd` ne font alors rien : le titre dépasse simplement de la ligne. En
revanche, `' '.repeat(-5)` provoque `RangeError: Invalid count value: -5`. Pense
toujours au cas où la donnée est plus longue que prévu.

:::

## Les gabarits de chaînes

### Insérer des valeurs

Construire un texte avec `+` devient vite illisible, et dangereux à cause des
conversions :

```js
const firstName = 'Inès';
const itemCount = 3;
const total = 12.5;

console.log(
  'Bonjour ' +
    firstName +
    ', ton panier contient ' +
    itemCount +
    ' articles pour ' +
    total.toFixed(2) +
    ' €.',
);
console.log(
  `Bonjour ${firstName}, ton panier contient ${itemCount} articles pour ${total.toFixed(2)} €.`,
);
```

```text
Bonjour Inès, ton panier contient 3 articles pour 12.50 €.
Bonjour Inès, ton panier contient 3 articles pour 12.50 €.
```

Dans un **gabarit de chaîne** (en anglais _template literal_), délimité par des accents
graves, chaque `${...}` est remplacé par la **valeur de l’expression** qu’il contient,
convertie en chaîne. Le texte se lit d’un bloc, sans guillemets ni `+` à rouvrir.

Entre `${` et `}`, on peut mettre **n’importe quelle expression** : un calcul, un appel de
méthode, un opérateur ternaire.

```js
const quantity = 1;
const unitPrice = 2.85;
const isOnSale = true;

console.log(`${quantity} tartelette${quantity > 1 ? 's' : ''}`); // → 1 tartelette
console.log(`Prix : ${(quantity * unitPrice).toFixed(2)} €`); // → Prix : 2.85 €
console.log(`Statut : ${isOnSale ? 'PROMO' : 'prix normal'}`); // → Statut : PROMO
console.log(`Somme : ${2 + 3}, et non ${'2' + 3}`); // → Somme : 5, et non 23
```

Garde les expressions courtes : si un `${...}` devient compliqué, calcule la valeur dans
une constante bien nommée avant le gabarit.

### Plusieurs lignes

Un gabarit peut s’étendre sur plusieurs lignes : les sauts de ligne font partie du texte.

```js
const shopName = 'Boulangerie du Port';
const total = 8.5;

const receipt = `${shopName}
--------------------
Total : ${total.toFixed(2)} €`;

console.log(receipt);
```

```text
Boulangerie du Port
--------------------
Total : 8.50 €
```

Attention : les espaces d’indentation placées au début des lignes suivantes font, elles
aussi, partie du texte. C’est pourquoi les lignes du gabarit ci-dessus commencent tout à
gauche.

## Afficher un prix à la française

En français, on écrit `39,00 €` avec une virgule. Deux approches :

```js
const price = 32.5 * 1.2;

console.log(price); // → 39
console.log(`${price.toFixed(2).replace('.', ',')} €`); // → 39,00 €
console.log(
  price.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
); // → 39,00
```

1. `toFixed(2)` donne `'39.00'`, puis `replace('.', ',')` remplace le point. Simple et
   prévisible.
2. `toLocaleString('fr-FR', ...)` applique les règles d’écriture d’une langue et d’un
   pays (le **format local**). Les options fixent le nombre de décimales.

`toLocaleString` gère aussi les milliers, mais avec un détail qui surprend :

```js
const bigAmount = 1234.5;
const formatted = bigAmount.toLocaleString('fr-FR', {
  minimumFractionDigits: 2,
});

console.log(formatted); // → 1 234,50
console.log(formatted.length); // → 8
console.log(formatted.includes(' ')); // → false
```

L’espace entre `1` et `234` **n’est pas** une espace ordinaire : c’est une espace
insécable fine, un caractère différent qui empêche le retour à la ligne au milieu du
nombre. À l’affichage, c’est parfait. Mais une comparaison avec `'1 234,50'` tapé au
clavier échouera. Retiens-le si un test « identique à l’œil » échoue.

## Pièges fréquents

- **Oublier de récupérer le résultat** : `name.trim();` seul ne change pas `name`.
  Correction : `const cleanName = name.trim();`.
- **Confondre `length` et `length()`** : `length` est une propriété, `length()`
  provoque une `TypeError`.
- **Chercher sans gérer la casse** : `includes('Promo')` ne trouve pas `'PROMO'`.
  Correction : comparer des versions en minuscules.
- **Penser que `replace` remplace tout** : seule la première occurrence change.
  Correction : `replaceAll`.
- **Concaténer avec `+` des nombres et du texte** : `'Total : ' + a + b` colle `a` et
  `b`. Correction : un gabarit avec `${a + b}`.
- **Calculer un remplissage négatif** : `repeat` refuse un nombre négatif. Correction :
  prévoir le cas du texte trop long.

## Exercices

### Exercice 1 — L’identifiant d’utilisateur

Un formulaire fournit `rawFirstName = '  aDA '` et `rawLastName = 'LOVELACE'`. Construis :

- le nom d’affichage `Ada Lovelace` (première lettre en majuscule, le reste en
  minuscules) ;
- l’identifiant `ada.lovelace` ;
- les initiales `A. L.`.

:::solution

```js
const rawFirstName = '  aDA ';
const rawLastName = 'LOVELACE';

const firstName = rawFirstName.trim().toLowerCase();
const lastName = rawLastName.trim().toLowerCase();

// Première lettre en majuscule + le reste à partir de la position 1
const displayFirstName = firstName[0].toUpperCase() + firstName.slice(1);
const displayLastName = lastName[0].toUpperCase() + lastName.slice(1);

console.log(`${displayFirstName} ${displayLastName}`);
console.log(`${firstName}.${lastName}`);
console.log(`${displayFirstName[0]}. ${displayLastName[0]}.`);
```

```text
Ada Lovelace
ada.lovelace
A. L.
```

On nettoie d’abord (`trim`, `toLowerCase`) pour partir d’une forme connue, puis on
construit chaque format. `firstName.slice(1)` renvoie tout sauf le premier caractère.
On applique aussi `trim` au nom de famille : il n’a pas d’espaces ici, mais rien ne
garantit qu’il n’en aura jamais. Attention : avec un prénom vide, `firstName[0]`
vaudrait `undefined` et `toUpperCase()` provoquerait une erreur ; une vraie
application vérifierait d’abord la saisie.

:::

### Exercice 2 — La carte bancaire masquée

À partir de `cardNumber = '4970101234567890'`, affiche `**** **** **** 7890`. Utilise
`slice` et `padStart` ou `repeat`, sans écrire les étoiles à la main dans une longue
chaîne.

:::solution

```js
const cardNumber = '4970101234567890';
const lastDigits = cardNumber.slice(-4);

const maskedGroup = '*'.repeat(4);
console.log(`${maskedGroup} ${maskedGroup} ${maskedGroup} ${lastDigits}`);

// Variante : masquer tout sauf les 4 derniers chiffres, sans espaces
console.log(lastDigits.padStart(cardNumber.length, '*'));
```

```text
**** **** **** 7890
************7890
```

`slice(-4)` extrait les quatre derniers caractères quel que soit le nombre de chiffres.
La variante avec `padStart` s’adapte automatiquement à la longueur du numéro. Dans les
deux cas, la chaîne d’origine n’est pas modifiée : c’est seulement l’affichage qui est
masqué.

:::

### Exercice 3 — La ligne de ticket

Avec `productName = 'Croissant'`, `quantity = 4` et `unitPrice = 1.15`, affiche une ligne
de 32 caractères exactement : le libellé `Croissant x4` à gauche complété par des points,
et le montant au format français `4,60 €` aligné à droite. Vérifie la longueur.

:::solution

```js
const productName = 'Croissant';
const quantity = 4;
const unitPrice = 1.15;

const lineLabel = `${productName} x${quantity}`;
const lineAmount = `${(quantity * unitPrice).toFixed(2).replace('.', ',')} €`;
const line = lineLabel.padEnd(32 - lineAmount.length, '.') + lineAmount;

console.log(line);
console.log(line.length);
```

```text
Croissant x4..............4,60 €
32
```

Le montant fait 6 caractères (`4,60 €`). Le libellé est donc complété jusqu’à
32 − 6 = 26 caractères, puis le montant s’ajoute : 32 au total. `quantity * unitPrice`
vaut 4,6 en mémoire, que `toFixed(2)` affiche `4.60`, transformé en `4,60`.

:::

## Récapitulatif

- Une chaîne s’écrit entre `'...'`, `"..."` ou `` `...` `` ; `\` échappe un caractère
  (`\n`, `\'`, `\\`).
- `length` donne la longueur ; les positions commencent à 0 ; `at(-1)` donne le dernier
  caractère.
- Les chaînes sont **immuables** : chaque méthode renvoie une nouvelle chaîne, qu’il faut
  ranger ou utiliser.
- Méthodes clés : `toUpperCase`, `toLowerCase`, `trim`, `includes`, `startsWith`,
  `indexOf`, `slice`, `replace`, `replaceAll`, `repeat`, `padStart`, `padEnd`.
- Les gabarits `` `...${expression}...` `` insèrent des valeurs et gèrent plusieurs
  lignes : préfère-les à la concaténation avec `+`.
- Prix à la française : `toFixed(2).replace('.', ',')`, ou `toLocaleString('fr-FR', ...)`
  qui insère des espaces insécables.
- Pense aux cas limites : texte trop long, saisie vide, casse différente.
