---
title: Répéter avec while, for et for...of
summary: Faire répéter des instructions avec les boucles while, for et for...of, accumuler des résultats et contrôler la sortie avec break et continue.
durationMinutes: 60
sources:
  - title: MDN — Boucles et itérations
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Loops_and_iteration
  - title: MDN — for...of
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/for...of
  - title: MDN — break
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/break
  - title: MDN — continue
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/continue
---

## Pourquoi répéter ?

Afficher les nombres de 1 à 5, c’est cinq `console.log`. De 1 à 1 000, c’est impensable.
Calculer le total d’un panier dont on ne connaît pas à l’avance le nombre d’articles,
c’est impossible sans un moyen de **répéter** une instruction autant de fois que
nécessaire. C’est le rôle des **boucles**.

Une boucle répète un bloc d’instructions tant qu’une condition est vraie, ou pour chaque
élément d’une collection. Chaque passage dans le bloc s’appelle une **itération**. Cette
leçon présente les trois boucles que tu utiliseras le plus : `while`, `for` et
`for...of`, ainsi que `break` et `continue` qui permettent d’en modifier le déroulement.

## while : tant que la condition est vraie

```js
let count = 1;

while (count <= 5) {
  console.log(`Itération ${count}`);
  count++;
}

console.log(`Après la boucle, count vaut ${count}`);
```

```text
Itération 1
Itération 2
Itération 3
Itération 4
Itération 5
Après la boucle, count vaut 6
```

Déroulement :

1. JavaScript teste la condition `count <= 5`.
2. Si elle est vraie, il exécute le bloc, puis **revient** au test.
3. Si elle est fausse, il sort de la boucle et continue après l’accolade fermante.

La condition est testée **avant** chaque itération : si elle est fausse dès le départ,
le bloc ne s’exécute jamais. Et pour que la boucle s’arrête un jour, le bloc doit
**faire évoluer** quelque chose dont dépend la condition (ici `count++`).

`while` est la boucle idéale quand on ne sait **pas à l’avance** combien d’itérations
seront nécessaires. Exemple : combien d’années faut-il pour doubler une épargne placée à
5 % par an ?

```js
const initialAmount = 1000;
const yearlyRate = 0.05;

let balance = initialAmount;
let years = 0;

while (balance < initialAmount * 2) {
  balance = balance * (1 + yearlyRate);
  years++;
}

console.log(`${years} ans, solde : ${balance.toFixed(2)} €`);
```

```text
15 ans, solde : 2078.93 €
```

:::warning[La boucle infinie]
Si la condition ne devient jamais fausse, la boucle tourne sans fin et le programme ne
répond plus. Cause habituelle : oublier de faire évoluer la variable testée (`count++`
manquant). Dans un terminal, arrête le programme avec `Ctrl` + `C`. Dans un onglet de
navigateur, il faudra fermer l’onglet.

:::

Il existe aussi `do { ... } while (condition);`, qui teste la condition **après** le
bloc : celui-ci s’exécute donc au moins une fois. Elle est rarement nécessaire ; tu la
reconnaîtras si tu la croises.

## for : compter

La plupart des boucles qui comptent ont trois ingrédients : une **initialisation**, une
**condition** et une **mise à jour**. La boucle `for` les réunit sur une seule ligne :

```js
for (let i = 1; i <= 5; i++) {
  console.log(`Itération ${i}`);
}
```

```text
Itération 1
Itération 2
Itération 3
Itération 4
Itération 5
```

Les trois parties, séparées par des points-virgules :

| Partie         | Exemple     | Quand ?                    |
| -------------- | ----------- | -------------------------- |
| initialisation | `let i = 1` | une seule fois, avant tout |
| condition      | `i <= 5`    | avant **chaque** itération |
| mise à jour    | `i++`       | après **chaque** itération |

C’est exactement la boucle `while` précédente, en plus compact. La variable `i` (pour
_index_, un nom conventionnel pour un compteur) est déclarée avec `let`, car elle change
à chaque tour ; elle n’existe que dans la boucle. La déclarer avec `const` provoque une
`TypeError` dès la première mise à jour.

On peut compter dans n’importe quel sens, avec n’importe quel pas :

```js
for (let i = 10; i > 0; i -= 3) {
  console.log(i);
}
```

```text
10
7
4
1
```

### Le piège du décalage d’un

L’erreur la plus fréquente avec `for` est de faire une itération de trop ou de moins (en
anglais _off-by-one error_). Compare :

```js
let withLessThan = 0;
for (let i = 0; i < 5; i++) {
  withLessThan++;
}

let withLessOrEqual = 0;
for (let i = 0; i <= 5; i++) {
  withLessOrEqual++;
}

console.log(withLessThan, withLessOrEqual); // → 5 6
```

`i < 5` en partant de 0 donne 5 itérations (0, 1, 2, 3, 4) ; `i <= 5` en donne 6. Pour
vérifier une boucle, demande-toi toujours : « quelle est la première valeur ? la
dernière ? combien de tours ? ».

## Parcourir une liste

### Les tableaux, en bref

Une **liste** de valeurs s’écrit entre crochets. JavaScript l’appelle un **tableau**
(_array_). Tu l’étudieras en détail dans une prochaine compétence ; voici l’essentiel :

```js
const prices = [12.5, 3, 7.25];

console.log(prices.length); // → 3
console.log(prices[0]); // → 12.5
console.log(prices[2]); // → 7.25
console.log(prices[3]); // → undefined
```

Comme pour les chaînes, les éléments sont numérotés à partir de 0, et `length` donne leur
nombre. Le dernier élément est donc à la position `length - 1`.

### Avec for et un index

```js
const prices = [12.5, 3, 7.25];

for (let i = 0; i < prices.length; i++) {
  console.log(`Article ${i + 1} : ${prices[i]} €`);
}
```

```text
Article 1 : 12.5 €
Article 2 : 3 €
Article 3 : 7.25 €
```

La condition `i < prices.length` (et non `<=`) garantit que `i` s’arrête au dernier
index valide. Avec `<=`, la dernière itération lirait `prices[3]`, qui vaut `undefined`.

### Avec for...of

Quand tu n’as pas besoin de la position, `for...of` est plus simple et plus sûr :

```js
const prices = [12.5, 3, 7.25];

for (const price of prices) {
  console.log(`${price} €`);
}
```

```text
12.5 €
3 €
7.25 €
```

À chaque itération, la constante `price` reçoit l’élément suivant. Ici, `const` convient :
chaque itération crée une **nouvelle** constante, elle n’est pas réaffectée. Aucun index
à gérer, donc aucun risque de décalage.

`for...of` parcourt aussi les **caractères d’une chaîne** :

```js
const word = 'kayak';
let reversed = '';

for (const character of word) {
  reversed = character + reversed; // ajoute chaque caractère au début
}

console.log(reversed); // → kayak
console.log(reversed === word ? 'Palindrome' : 'Pas un palindrome'); // → Palindrome
```

:::note[for...of et for...in]
Il existe aussi une boucle `for...in`, conçue pour parcourir les propriétés d’un objet.
Sur un tableau, elle donne les positions sous forme de **chaînes** (`'0'`, `'1'`…), pas
les éléments. Pour un tableau ou une chaîne, utilise `for...of`.

:::

## Les accumulateurs

Beaucoup de boucles construisent un résultat au fil des itérations. On utilise une
variable déclarée **avant** la boucle (donc avec `let`), qu’on met à jour à chaque tour :
c’est un **accumulateur**.

```js
const prices = [12.5, 3, 7.25, 20];

let total = 0; // somme : on part de 0
let expensiveCount = 0; // compteur : on part de 0
let maxPrice = prices[0]; // maximum : on part du premier élément

for (const price of prices) {
  total += price;
  if (price > 10) {
    expensiveCount++;
  }
  if (price > maxPrice) {
    maxPrice = price;
  }
}

console.log(`Total : ${total} €`); // → Total : 42.75 €
console.log(`Articles à plus de 10 € : ${expensiveCount}`); // → Articles à plus de 10 € : 2
console.log(`Prix maximum : ${maxPrice} €`); // → Prix maximum : 20 €
```

Le choix de la valeur de départ est essentiel : 0 pour une somme ou un compteur, `''`
pour une chaîne construite, le premier élément pour un maximum ou un minimum. Partir de
0 pour un maximum serait faux si tous les nombres étaient négatifs.

## break : sortir de la boucle

`break` arrête **immédiatement** la boucle, même si la condition est encore vraie.
L’exécution reprend après la boucle. Usage typique : arrêter une recherche dès que le
résultat est trouvé.

```js
const temperatures = [12, 18, 31, 25, 33];

let firstHotDay = -1; // -1 signifie « pas trouvé »

for (let day = 0; day < temperatures.length; day++) {
  console.log(`Jour ${day} : ${temperatures[day]} °C`);
  if (temperatures[day] > 30) {
    firstHotDay = day;
    break; // inutile de regarder les jours suivants
  }
}

console.log(`Premier jour au-dessus de 30 °C : ${firstHotDay}`);
```

```text
Jour 0 : 12 °C
Jour 1 : 18 °C
Jour 2 : 31 °C
Premier jour au-dessus de 30 °C : 2
```

Les jours 3 et 4 ne sont jamais examinés. Sans `break`, la boucle continuerait, et
`firstHotDay` serait écrasé par le jour 4 (33 °C) : on obtiendrait le **dernier** jour
chaud, pas le premier.

## continue : passer à l’itération suivante

`continue` interrompt **l’itération en cours** et passe directement à la suivante. Usage
typique : ignorer les éléments invalides.

```js
const measures = [12, null, 18, -999, 25];

let sum = 0;
let validCount = 0;

for (const measure of measures) {
  if (measure === null || measure === -999) {
    continue; // valeur manquante ou code d’erreur du capteur : on l’ignore
  }
  sum += measure;
  validCount++;
}

console.log(`Moyenne sur ${validCount} mesures : ${sum / validCount}`);
```

```text
Moyenne sur 3 mesures : 18.333333333333332
```

`continue` évite d’imbriquer tout le traitement dans un `if`. Il rend la règle
« on ignore ces cas » visible dès le début du bloc.

:::warning[continue dans un while]
Dans une boucle `while`, la mise à jour du compteur fait partie du bloc. Si `continue`
est exécuté **avant** cette mise à jour, elle est sautée, et la boucle peut devenir
infinie :

```js
let i = 0;
while (i < 5) {
  if (i === 2) {
    continue; // i n’est jamais incrémenté : boucle infinie
  }
  console.log(i);
  i++;
}
```

Correction : incrémenter avant le `continue`, ou utiliser une boucle `for`, dont la mise
à jour s’exécute même après un `continue`.

:::

## Les boucles imbriquées

Une boucle peut en contenir une autre. La boucle intérieure s’exécute **entièrement** à
chaque itération de la boucle extérieure :

```js
for (let row = 1; row <= 3; row++) {
  let line = '';
  for (let column = 1; column <= 4; column++) {
    line += String(row * column).padStart(4);
  }
  console.log(line);
}
```

```text
   1   2   3   4
   2   4   6   8
   3   6   9  12
```

3 lignes × 4 colonnes = 12 multiplications. Attention : un `break` dans la boucle
intérieure ne fait sortir **que** de celle-ci ; la boucle extérieure continue.

## Choisir sa boucle

| Situation                                                           | Boucle conseillée |
| ------------------------------------------------------------------- | ----------------- |
| Parcourir tous les éléments d’un tableau ou d’une chaîne            | `for...of`        |
| Besoin de la position de chaque élément, ou d’un pas particulier    | `for`             |
| Répéter un nombre connu de fois                                     | `for`             |
| Répéter jusqu’à ce qu’une condition change, nombre de tours inconnu | `while`           |

Comme pour les conditions, c’est une recommandation de lisibilité : toute boucle `for`
peut s’écrire avec `while`.

## Pièges fréquents

- **Boucle infinie** : la variable testée n’évolue pas, ou `continue` saute sa mise à
  jour. Arrêt d’urgence : `Ctrl` + `C`.
- **Décalage d’un** : `<=` au lieu de `<` avec `length`, ou départ à 1 au lieu de 0.
- **Accumulateur déclaré dans la boucle** : il est recréé à chaque tour et perd sa valeur.
  Déclare-le avant.
- **`const` dans un `for` classique** : `TypeError` à la première mise à jour.
  (Dans un `for...of`, `const` est correct.)
- **`for...in` sur un tableau** : donne les positions en chaînes. Utilise `for...of`.
- **Oublier `break`** dans une recherche : on obtient le dernier résultat au lieu du
  premier.

## Exercices

### Exercice 1 — Somme des nombres pairs

Calcule la somme des nombres pairs de 1 à 100 de deux façons : avec une boucle `for` qui
avance de 2 en 2, puis avec une boucle qui avance de 1 en 1 et un test `%`. Les deux
doivent afficher le même résultat.

:::solution

```js
let sumByStep = 0;
for (let i = 2; i <= 100; i += 2) {
  sumByStep += i;
}

let sumByTest = 0;
for (let i = 1; i <= 100; i++) {
  if (i % 2 !== 0) {
    continue; // nombre impair : on passe au suivant
  }
  sumByTest += i;
}

console.log(sumByStep, sumByTest);
```

```text
2550 2550
```

La première version fait 50 itérations, la seconde 100. Les deux sont correctes ; la
première est plus efficace, la seconde montre l’usage de `%` et de `continue`. Vérifie
la borne : `i <= 100` inclut bien 100.

:::

### Exercice 2 — Compter les voyelles

Compte les voyelles (a, e, i, o, u, y, avec ou sans accent courant : à, â, é, è, ê, ë,
î, ï, ô, ù, û) dans la phrase `'Élève à l’école'`, en ignorant la casse. Utilise
`for...of` et la méthode `includes`.

:::solution

```js
const sentence = 'Élève à l’école';
const vowels = 'aeiouyàâéèêëîïôùû';

let vowelCount = 0;
for (const character of sentence.toLowerCase()) {
  if (vowels.includes(character)) {
    vowelCount++;
  }
}

console.log(`${vowelCount} voyelles`);
```

```text
7 voyelles
```

On met la phrase en minuscules une seule fois, avant la boucle, pour que `'É'` devienne
`'é'`. Les voyelles sont dans une chaîne : `includes` vérifie si le caractère en fait
partie. Les espaces et l’apostrophe ne sont pas des voyelles et ne sont pas comptés.
Détail : é, è, e, à, é, o, e font bien 7.

:::

### Exercice 3 — Le premier jour de gel

Dans `const temperatures = [4, 2, null, -1, 3, -4];`, trouve la position du **premier**
jour de gel (température strictement négative), en ignorant les mesures manquantes
(`null`). Affiche aussi combien de mesures ont été examinées. Si aucun jour de gel
n’existe, affiche « Aucun jour de gel ».

:::solution

```js
const temperatures = [4, 2, null, -1, 3, -4];

let firstFrostDay = -1;
let examinedCount = 0;

for (let day = 0; day < temperatures.length; day++) {
  if (temperatures[day] === null) {
    continue; // mesure manquante
  }
  examinedCount++;
  if (temperatures[day] < 0) {
    firstFrostDay = day;
    break; // on cherche le premier : on s’arrête
  }
}

if (firstFrostDay === -1) {
  console.log('Aucun jour de gel');
} else {
  console.log(`Premier gel au jour ${firstFrostDay}`);
}
console.log(`${examinedCount} mesures examinées`);
```

```text
Premier gel au jour 3
3 mesures examinées
```

On a besoin de la position : boucle `for` avec index. `null` est ignoré avec `continue`
**avant** le comptage, puis `break` arrête la recherche au jour 3. Les mesures examinées
sont 4, 2 et -1. Attention : sans le test `=== null`, la comparaison `null < 0` vaudrait
`false` (car `null` est converti en 0), donc le résultat serait juste ici, mais le
compteur de mesures serait faux et la logique reposerait sur une conversion implicite.

:::

## Récapitulatif

- `while (condition)` répète tant que la condition est vraie ; idéal quand le nombre de
  tours est inconnu. Le bloc doit faire évoluer la condition.
- `for (init; condition; mise à jour)` regroupe les trois ingrédients d’une boucle qui
  compte ; le compteur se déclare avec `let`.
- `for (const element of collection)` parcourt les éléments d’un tableau ou les
  caractères d’une chaîne, sans index.
- Un accumulateur se déclare avant la boucle, avec une valeur de départ adaptée.
- `break` sort de la boucle ; `continue` passe à l’itération suivante. Dans un `while`,
  attention à ne pas sauter la mise à jour.
- Vérifie toujours la première valeur, la dernière et le nombre de tours pour éviter les
  décalages d’un.
