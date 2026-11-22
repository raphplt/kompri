---
title: Tracer l’exécution d’un algorithme à la main
summary: Prévoir précisément ce que fait un programme en suivant ses variables pas à pas dans un tableau, puis vérifier avec des traces console.log.
durationMinutes: 45
sources:
  - title: MDN — Boucles et itérations
    url: https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Loops_and_iteration
  - title: Node.js — Débogueur
    url: https://nodejs.org/api/debugger.html
---

## Pourquoi tracer à la main ?

Quand un programme ne fait pas ce que tu attends, le réflexe est de modifier le code au
hasard jusqu’à ce que « ça marche ». C’est lent, et tu ne sais toujours pas pourquoi ça
ne marchait pas. Un développeur expérimenté fait autre chose : il **simule l’exécution
dans sa tête ou sur papier**, ligne par ligne, en notant la valeur de chaque variable. Il
trouve ainsi l’endroit exact où la réalité s’écarte de son intention.

C’est aussi une compétence utile à l’oral de Kompri : l’examinateur peut te montrer un
extrait de code, parfois ton propre code légèrement modifié, et te demander ce qu’il
affiche. Savoir tracer, c’est prouver que tu comprends ce que fait le code, et pas
seulement ce qu’il est censé faire.

Tracer, c’est aussi le meilleur moyen de **vérifier** du code proposé par une IA : tu
compares ce que le code fait vraiment à ce que tu attends.

## La méthode du tableau de trace

1. **Repère les variables** qui changent pendant l’exécution : elles deviennent les
   colonnes du tableau. Ajoute une colonne pour la condition testée et une pour ce qui
   est affiché.
2. **Note les valeurs initiales** sur la première ligne.
3. **Avance instruction par instruction**. À chaque itération d’une boucle, ajoute une
   ligne. N’écris que ce qui change, mais vérifie toujours la condition.
4. **Ne saute aucune étape**, même si tu « vois » le résultat : c’est précisément dans
   les étapes qu’on croit évidentes que se cachent les erreurs.
5. **Termine par l’état final** : valeur des variables après la boucle et sortie
   complète.

### Premier exemple : la somme des chiffres

Que fait ce programme ?

```js
let number = 4072;
let digitSum = 0;

while (number > 0) {
  const lastDigit = number % 10;
  digitSum += lastDigit;
  number = Math.floor(number / 10);
}

console.log(digitSum);
```

Les variables qui changent sont `number`, `lastDigit` et `digitSum`. La condition est
`number > 0`. Traçons :

| Étape       | `number > 0` ? | `lastDigit` | `digitSum` | `number` (fin d’itération) |
| ----------- | -------------- | ----------- | ---------- | -------------------------- |
| départ      |                |             | 0          | 4072                       |
| itération 1 | 4072 > 0 : oui | 2           | 2          | 407                        |
| itération 2 | 407 > 0 : oui  | 7           | 9          | 40                         |
| itération 3 | 40 > 0 : oui   | 0           | 9          | 4                          |
| itération 4 | 4 > 0 : oui    | 4           | 13         | 0                          |
| test final  | 0 > 0 : non    |             |            |                            |

La boucle s’arrête, le programme affiche `13`, soit 4 + 0 + 7 + 2. Le tableau révèle le
fonctionnement : `% 10` extrait le dernier chiffre, `Math.floor(number / 10)` le
supprime. L’algorithme calcule donc la **somme des chiffres**.

Vérification par exécution :

```js
let number = 4072;
let digitSum = 0;

while (number > 0) {
  const lastDigit = number % 10;
  digitSum += lastDigit;
  number = Math.floor(number / 10);
}

console.log(digitSum); // → 13
```

Les questions à te poser pendant une trace de boucle :

- Combien d’itérations ? (ici, autant que de chiffres : 4)
- Que vaut la condition au **dernier** test, celui qui fait sortir ?
- Que se passe-t-il avec une valeur limite ? Avec `number = 0`, la condition est fausse
  dès le départ : la boucle ne s’exécute pas et le programme affiche 0, ce qui est juste.
  Avec un nombre négatif, il afficherait aussi 0, ce qui est faux.

## Tracer pour trouver un bug

Ce programme doit calculer la moyenne de trois notes, 8, 15 et 11, soit 34 / 3 ≈ 11,33.
Il affiche 8,67. Où est l’erreur ?

```js
const scores = [8, 15, 11];

let sum = 0;
for (let i = 1; i < scores.length; i++) {
  sum += scores[i];
}

console.log(sum / scores.length); // → 8.666666666666666
```

| Étape       | `i` | `i < 3` ? | `scores[i]` | `sum` |
| ----------- | --- | --------- | ----------- | ----- |
| départ      | 1   |           |             | 0     |
| itération 1 | 1   | oui       | 15          | 15    |
| itération 2 | 2   | oui       | 11          | 26    |
| test final  | 3   | non       |             |       |

La trace montre immédiatement que la note `8` (position 0) n’est jamais ajoutée : le
compteur commence à 1. La somme vaut 26, et 26 / 3 ≈ 8,67. Correction :
`let i = 0`. Sans tableau, on aurait pu chercher longtemps du côté de la division.

## Tracer des conditions dans une boucle

Les conditions, `continue` et `break` rendent la trace plus délicate : il faut noter
**quelle branche** est prise à chaque tour.

```js
const values = [3, -2, 0, 7, 5];

let total = 0;
for (const value of values) {
  if (value < 0) {
    continue;
  }
  if (value === 0) {
    console.log('zéro rencontré');
  }
  if (value > 6) {
    break;
  }
  total += value;
}

console.log(`total = ${total}`);
```

| `value` | `< 0` ?          | `=== 0` ? | `> 6` ?       | `total` | Affichage        |
| ------- | ---------------- | --------- | ------------- | ------- | ---------------- |
| 3       | non              | non       | non           | 3       |                  |
| -2      | oui : `continue` |           |               | 3       |                  |
| 0       | non              | oui       | non           | 3       | `zéro rencontré` |
| 7       | non              | non       | oui : `break` | 3       |                  |

La boucle s’arrête sur 7 ; la valeur 5 n’est jamais examinée.

```text
zéro rencontré
total = 3
```

Remarque que 0 est bien ajouté au total (`3 + 0 = 3`) : le premier `if` ne l’écarte pas,
et le message ne l’empêche pas d’être additionné.

## Faire tracer l’ordinateur : console.log

Le tableau sur papier sert à **prévoir**. Pour **vérifier** ou pour explorer un bug sur
un vrai programme, fais afficher les valeurs à chaque étape avec `console.log` :

```js
let number = 4072;
let digitSum = 0;

while (number > 0) {
  const lastDigit = number % 10;
  digitSum += lastDigit;
  number = Math.floor(number / 10);
  console.log({ lastDigit, digitSum, number }); // trace temporaire
}
```

```text
{ lastDigit: 2, digitSum: 2, number: 407 }
{ lastDigit: 7, digitSum: 9, number: 40 }
{ lastDigit: 0, digitSum: 9, number: 4 }
{ lastDigit: 4, digitSum: 13, number: 0 }
```

L’écriture `{ lastDigit, digitSum, number }` crée un petit objet dont chaque propriété
porte le nom de la variable : l’affichage est ainsi étiqueté automatiquement. C’est un
raccourci très pratique pour déboguer.

Bonnes pratiques :

- Affiche des **étiquettes**, pas des nombres nus : `console.log(3, 9, 40)` devient
  illisible dès qu’il y a plusieurs traces.
- Place la trace là où tu soupçonnes le problème, puis déplace-la.
- **Supprime** les traces temporaires une fois le bug compris : elles n’ont rien à faire
  dans le code livré.

:::note[Le débogueur pas à pas]
Les éditeurs de code et Node.js proposent un **débogueur** qui exécute le programme
instruction par instruction et montre les variables à chaque pas. C’est la version
automatique du tableau de trace. Il est utile sur de gros programmes, mais ne remplace
pas la capacité de raisonner sans machine : c’est elle qu’on te demandera de démontrer.

:::

## Pièges fréquents

- **Sauter des étapes** « évidentes » : c’est là que se cachent les erreurs de borne.
- **Oublier le dernier test** de la condition, celui qui fait sortir de la boucle.
- **Confondre la valeur avant et après** une affectation dans une même itération :
  note dans quel ordre les lignes s’exécutent.
- **Supposer ce que le code devrait faire** au lieu de lire ce qu’il fait : trace le code
  écrit, pas celui que tu imagines.
- **Laisser des `console.log` de débogage** dans le code final.

## Exercices

### Exercice 1 — La suite de Syracuse

Trace ce programme à la main (colonnes : `steps`, `value`, condition) et prévois sa
sortie. Vérifie ensuite avec Node.js.

```js
let value = 6;
let steps = 0;

while (value !== 1) {
  if (value % 2 === 0) {
    value = value / 2;
  } else {
    value = 3 * value + 1;
  }
  steps++;
}

console.log(`${steps} étapes`);
```

:::solution

| Étape       | `value !== 1` ? | pair ?          | `value` | `steps` |
| ----------- | --------------- | --------------- | ------- | ------- |
| départ      |                 |                 | 6       | 0       |
| itération 1 | oui             | oui : 6 / 2     | 3       | 1       |
| itération 2 | oui             | non : 3 × 3 + 1 | 10      | 2       |
| itération 3 | oui             | oui             | 5       | 3       |
| itération 4 | oui             | non             | 16      | 4       |
| itération 5 | oui             | oui             | 8       | 5       |
| itération 6 | oui             | oui             | 4       | 6       |
| itération 7 | oui             | oui             | 2       | 7       |
| itération 8 | oui             | oui             | 1       | 8       |
| test final  | non             |                 |         |         |

```text
8 étapes
```

La condition est testée neuf fois pour huit itérations : le dernier test, faux, fait
sortir de la boucle. Avec `value = 1` au départ, la boucle ne s’exécuterait pas et le
programme afficherait `0 étapes`.

:::

### Exercice 2 — Prévoir une chaîne construite

Sans l’exécuter, prévois exactement ce qu’affiche ce code, caractère par caractère.

```js
let result = '';

for (let i = 3; i > 0; i--) {
  if (i === 2) {
    result += '[deux]';
    continue;
  }
  result += i + '-';
}

console.log(result);
```

:::solution

| `i` | `i > 0` ? | `i === 2` ?      | `result`       |
| --- | --------- | ---------------- | -------------- |
| 3   | oui       | non              | `'3-'`         |
| 2   | oui       | oui : `continue` | `'3-[deux]'`   |
| 1   | oui       | non              | `'3-[deux]1-'` |
| 0   | non       |                  |                |

```text
3-[deux]1-
```

`i + '-'` concatène : le nombre est converti en chaîne. Le `continue` empêche d’ajouter
`'2-'`, mais la mise à jour `i--` de la boucle `for` s’exécute quand même : pas de boucle
infinie.

:::

### Exercice 3 — Trouver le bug par la trace

Ce code doit afficher le **plus petit** prix d’une liste. Avec `[4, 9, 2, 7]`, il affiche
`0`. Trace-le, explique le bug et corrige-le.

```js
const prices = [4, 9, 2, 7];

let minPrice = 0;
for (const price of prices) {
  if (price < minPrice) {
    minPrice = price;
  }
}

console.log(minPrice);
```

:::solution

| `price` | `price < minPrice` ? | `minPrice` |
| ------- | -------------------- | ---------- |
| départ  |                      | 0          |
| 4       | 4 < 0 : non          | 0          |
| 9       | 9 < 0 : non          | 0          |
| 2       | 2 < 0 : non          | 0          |
| 7       | 7 < 0 : non          | 0          |

Aucun prix n’est inférieur à 0 : `minPrice` ne change jamais. La valeur de départ est
fausse. Correction : partir du premier élément.

```js
const prices = [4, 9, 2, 7];

let minPrice = prices[0];
for (const price of prices) {
  if (price < minPrice) {
    minPrice = price;
  }
}

console.log(minPrice); // → 2
```

Bug très courant, y compris dans du code généré : la valeur initiale d’un accumulateur
doit être neutre pour l’opération. 0 est neutre pour une somme, pas pour un minimum.

:::

## Récapitulatif

- Tracer, c’est exécuter le code à la main en notant la valeur des variables à chaque
  étape, dans un tableau : une colonne par variable, une ligne par itération.
- Note toujours les valeurs initiales, la condition testée, la branche prise et le
  **dernier** test qui fait sortir de la boucle.
- La trace sert à prévoir une sortie, à comprendre un algorithme inconnu et à localiser
  un bug précisément.
- Pour vérifier, fais tracer l’ordinateur avec `console.log({ a, b })`, puis supprime ces
  traces.
- Teste mentalement les cas limites : boucle qui ne s’exécute pas, une seule itération,
  dernière itération.
