---
title: Pourquoi tester et premier test
summary: Comprendre à quoi servent les tests automatisés, distinguer tests unitaires et d’intégration, et écrire son premier test avec node:test.
durationMinutes: 45
sources:
  - title: Documentation Node.js — Test runner (node:test)
    url: https://nodejs.org/api/test.html
  - title: Documentation Node.js — Assert
    url: https://nodejs.org/api/assert.html
---

## Le problème : « ça marchait hier »

Tu écris une fonction, tu l’essaies avec deux ou trois valeurs dans le terminal, elle
fonctionne. Une semaine plus tard, tu modifies une autre partie du programme… et la
fonction renvoie un résultat faux. Personne ne s’en aperçoit avant qu’un utilisateur le
signale. C’est une **régression** : quelque chose qui fonctionnait ne fonctionne plus.

Vérifier à la main après chaque modification est long, ennuyeux, et on finit toujours par
oublier un cas. Un **test automatisé** est un petit programme qui appelle ton code avec des
valeurs choisies et **vérifie** que le résultat est celui attendu. Il s’exécute en une
fraction de seconde, autant de fois que nécessaire.

Les tests servent à :

- **détecter les régressions** dès qu’elles apparaissent ;
- **modifier le code sans peur** : si les tests passent encore, le comportement est
  préservé ;
- **documenter** le comportement attendu par des exemples exécutables ;
- **mieux concevoir** : une fonction difficile à tester est souvent une fonction qui fait
  trop de choses.

Un test ne prouve pas l’absence de bugs : il prouve que les cas testés se comportent comme
prévu. Le choix des cas est donc essentiel (leçon 3).

## Tests unitaires, tests d’intégration

On classe souvent les tests selon la quantité de code qu’ils mettent en jeu :

| Type                 | Ce qu’il vérifie                                                   | Exemple                                                  |
| -------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| **unitaire**         | une petite unité de code (une fonction), isolée du reste           | `applyDiscount(50, 20)` renvoie `40`                     |
| **d’intégration**    | plusieurs parties qui travaillent ensemble, ou avec un vrai système externe | la route `GET /products` lit les données et renvoie du JSON ; une fonction lit un vrai fichier |
| **de bout en bout**  | l’application complète, comme un utilisateur                       | un navigateur automatisé remplit le formulaire et voit la confirmation |

Les tests unitaires sont rapides, précis (quand ils échouent, on sait où chercher) et
faciles à écrire. Les tests d’intégration sont plus lents et plus complexes, mais ils
détectent ce que les tests unitaires ne voient pas : deux parties correctes séparément qui
ne s’emboîtent pas. Une **convention** répandue, souvent représentée par une pyramide,
recommande beaucoup de tests unitaires, un nombre moyen de tests d’intégration et quelques
tests de bout en bout. C’est un repère, pas une règle absolue : l’important est que les
comportements essentiels soient couverts.

La frontière entre unitaire et intégration varie selon les équipes. Retiens le critère
pratique : un test qui touche le disque, le réseau ou une base de données est un test
d’intégration.

## node:test et node:assert

Node.js fournit tout ce qu’il faut pour tester, sans dépendance :

- **`node:test`** : la fonction `test` pour déclarer un test, et l’**exécuteur** lancé
  par `node --test` ;
- **`node:assert/strict`** : les **assertions**, des fonctions qui vérifient une condition
  et lèvent une erreur si elle est fausse.

Utilise toujours la version `strict` d’`assert` : ses comparaisons utilisent l’égalité
stricte (`===`) et ne convertissent pas les types. La version non stricte considère par
exemple `1` et `'1'` comme égaux.

## Premier test, pas à pas

Le projet :

```text
panier/
  package.json
  src/
    price.js
  test/
    price.test.js
```

`package.json` :

```json
{
  "name": "panier",
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

`src/price.js`, première version :

```js
// price.js — calculs du panier
export function applyDiscount(price, percent) {
  return (price * (100 - percent)) / 100;
}
```

`test/price.test.js` :

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount } from '../src/price.js';

test('applique une remise de 20 % sur 50 €', () => {
  const result = applyDiscount(50, 20);
  assert.equal(result, 40);
});

test('arrondit le prix remisé au centime', () => {
  const result = applyDiscount(9.99, 15);
  assert.equal(result, 8.49);
});
```

Chaque appel à `test` prend un **nom**, qui décrit le comportement attendu en français
clair, et une **fonction** qui contient la vérification. `assert.equal(réel, attendu)`
échoue si les deux valeurs ne sont pas strictement égales. L’ordre des arguments compte :
d’abord la valeur obtenue, ensuite la valeur attendue, pour que les messages d’erreur soient
justes.

### Lancer les tests

```bash
npm test
```

```text

> test
> node --test

✔ applique une remise de 20 % sur 50 € (0.894983ms)
✖ arrondit le prix remisé au centime (1.016645ms)
ℹ tests 2
ℹ suites 0
ℹ pass 1
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 81.414793

✖ failing tests:

test at test/price.test.js:10:1
✖ arrondit le prix remisé au centime (1.016645ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  8.4915 !== 8.49

      at TestContext.<anonymous> (file:///home/camille/panier/test/price.test.js:12:10)
      …
```

Les durées varient d’une exécution à l’autre, et la pile d’appels (lignes `at …`) a été
raccourcie. Lis ce rapport ainsi :

- `✔` : test réussi ; `✖` : test échoué ;
- le résumé `ℹ` compte les tests réussis (`pass`), échoués (`fail`), ignorés, etc. ;
- la section `failing tests` détaille chaque échec : le fichier et la ligne du test
  (`test/price.test.js:10:1`), puis l’erreur. `8.4915 !== 8.49` : la fonction a renvoyé
  `8.4915` alors qu’on attendait `8.49`.

Le test a trouvé un vrai défaut : le prix n’est pas arrondi au centime. On corrige :

```js
// price.js — calculs du panier
export function applyDiscount(price, percent) {
  return Math.round(price * (100 - percent)) / 100;
}
```

```bash
npm test
```

```text

> test
> node --test

✔ applique une remise de 20 % sur 50 € (0.573748ms)
✔ arrondit le prix remisé au centime (0.116353ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 65.967893
```

Tout est vert. Le **code de sortie** de `npm test` vaut 0 quand tous les tests passent et 1
sinon : c’est ce qui permet à un outil d’intégration continue de bloquer une modification
qui casse un test.

:::tip[Voir le test échouer d’abord]
Un test qu’on n’a jamais vu échouer peut être faux : une assertion oubliée, une mauvaise
fonction importée, et il passe quoi qu’il arrive. Quand tu écris un test, assure-toi au
moins une fois qu’il échoue si le code est faux (par exemple en cassant volontairement
le code un instant).
:::

## Quels fichiers node --test exécute-t-il ?

Sans argument, `node --test` cherche les fichiers de test dans le dossier courant et ses
sous-dossiers (hors `node_modules`) selon des motifs de nom :

| Motif                                  | Exemples                         |
| -------------------------------------- | -------------------------------- |
| `*.test.js`, `*-test.js`, `*_test.js`  | `price.test.js`, `price-test.js` |
| `test-*.js`, `test.js`                 | `test-price.js`                  |
| tout fichier `.js`, `.mjs` ou `.cjs` d’un dossier `test/` | `test/price.js` |

Chaque fichier de test s’exécute dans un **processus séparé** : un test ne peut pas
modifier les variables d’un autre fichier. Tu peux aussi désigner des fichiers précis :
`node --test test/price.test.js`, ou un motif entre guillemets :
`node --test "src/**/*.test.js"`.

Deux conventions de rangement coexistent : un dossier `test/` séparé (comme ici), ou les
fichiers `*.test.js` à côté du code qu’ils testent. Choisis-en une par projet.

## La structure d’un bon test

Un test lisible suit trois étapes, souvent appelées **Arrange, Act, Assert** :

```js
test('le total du panier applique la remise de chaque ligne', () => {
  // Préparer (Arrange) : les données d'entrée
  const price = 80;
  const percent = 25;

  // Agir (Act) : un seul appel au code testé
  const result = applyDiscount(price, percent);

  // Vérifier (Assert) : le résultat attendu
  assert.equal(result, 60);
});
```

Les qualités d’un bon test :

- **rapide** : quelques millisecondes ; on les lance à chaque modification ;
- **isolé** : il ne dépend ni des autres tests, ni de leur ordre ;
- **reproductible** : même résultat à chaque exécution, sur toutes les machines (pas de
  dépendance à l’heure, au hasard ou au réseau sans contrôle) ;
- **lisible** : son nom dit ce qui est attendu ; en cas d’échec, on comprend tout de suite
  ce qui ne va pas ;
- **centré sur le comportement** : il vérifie ce que fait la fonction (ses résultats), pas
  comment elle le fait. On peut ainsi réécrire l’intérieur de la fonction sans réécrire les
  tests.

## Pièges courants

- **Un test sans assertion.** Il appelle la fonction et réussit toujours. Un
  `console.log` n’est pas une vérification.
- **Inverser réel et attendu** dans `assert.equal` : le message d’erreur devient trompeur.
- **Utiliser `node:assert` au lieu de `node:assert/strict`** : `assert.equal(1, '1')`
  réussit avec la version non stricte.
- **Calculer l’attendu avec le code testé** (`assert.equal(applyDiscount(50, 20),
  applyDiscount(50, 20))`) : le test ne vérifie rien. L’attendu s’écrit en dur, calculé à la
  main.
- **Un nom de test vague** (`test 1`, `ça marche`) : quand il échoue, on ne sait pas ce qui
  est cassé.

## Exercices

### Exercice 1 — Unitaire ou intégration ?

Classe chacun de ces tests et justifie en une phrase :

1. vérifier que `formatEuros(3.5)` renvoie `'3,50 €'` ;
2. vérifier que `saveCatalog` écrit un fichier JSON lisible par `loadCatalog` dans un
   dossier temporaire ;
3. démarrer le serveur, envoyer `GET /products` et vérifier le code 200 ;
4. vérifier que `isAdult(17)` renvoie `false`.

:::solution
1. **Unitaire** : une fonction pure, aucune ressource externe.
2. **Intégration** : deux fonctions travaillent ensemble avec le vrai système de fichiers.
3. **Intégration** : le serveur HTTP, le routage et la sérialisation JSON sont testés
   ensemble, à travers le réseau local.
4. **Unitaire** : une fonction isolée, un cas limite (17 ans, juste sous 18).
:::

### Exercice 2 — Tester un code postal

Voici une fonction qui vérifie un code postal français (cinq chiffres). Écris dans
`test/postal-code.test.js` au moins cinq tests qui couvrent des codes valides et invalides,
puis lance-les.

```js
// src/postal-code.js
export function isValidPostalCode(value) {
  return typeof value === 'string' && /^\d{5}$/.test(value);
}
```

:::solution
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidPostalCode } from '../src/postal-code.js';

test('accepte un code à cinq chiffres', () => {
  assert.equal(isValidPostalCode('75011'), true);
});

test('accepte un code qui commence par zéro', () => {
  assert.equal(isValidPostalCode('01000'), true);
});

test('refuse un code trop court ou trop long', () => {
  assert.equal(isValidPostalCode('7501'), false);
  assert.equal(isValidPostalCode('750111'), false);
});

test('refuse les lettres et les espaces', () => {
  assert.equal(isValidPostalCode('75 011'), false);
  assert.equal(isValidPostalCode('7501A'), false);
});

test('refuse un nombre (le zéro initial serait perdu)', () => {
  assert.equal(isValidPostalCode(1000), false);
});
```

```text
✔ accepte un code à cinq chiffres (0.694943ms)
✔ accepte un code qui commence par zéro (0.152557ms)
✔ refuse un code trop court ou trop long (0.0777ms)
✔ refuse les lettres et les espaces (0.073943ms)
✔ refuse un nombre (le zéro initial serait perdu) (0.116082ms)
ℹ tests 5
```

Chaque nom décrit un comportement. Le cas `'01000'` est important : un code postal stocké
comme nombre perdrait son zéro initial, d’où le dernier test. Pour vérifier tes tests,
remplace un instant `\d{5}` par `\d{4,5}` dans la fonction : le test « trop court » doit
échouer.
:::

### Exercice 3 — Ce test sert-il à quelque chose ?

Explique ce qui ne va pas dans chacun de ces tests.

```js
test('applyDiscount', () => {
  console.log(applyDiscount(100, 10));
});

test('remise de 10 %', () => {
  const expected = applyDiscount(100, 10);
  assert.equal(applyDiscount(100, 10), expected);
});

test('remise', () => {
  assert.equal(90, applyDiscount(100, 10));
});
```

:::solution
1. Aucune assertion : le test réussit même si la fonction renvoie n’importe quoi. Il faut
   `assert.equal(applyDiscount(100, 10), 90)`.
2. L’attendu est calculé avec la fonction testée : le test compare la fonction à elle-même
   et passe toujours. L’attendu (`90`) doit être écrit en dur.
3. Le test vérifie bien quelque chose, mais les arguments sont inversés (attendu puis réel) :
   en cas d’échec, le rapport afficherait l’attendu comme valeur obtenue. Et le nom
   `remise` ne dit pas quel comportement est attendu : préfère
   `'retire 10 % du prix'`.
:::

## Récapitulatif

- Un test automatisé appelle ton code et **vérifie** le résultat ; il détecte les
  régressions et permet de modifier le code avec confiance.
- Test **unitaire** : une unité isolée, rapide ; test d’**intégration** : plusieurs parties
  ou un système réel (fichiers, réseau, base) ; test de **bout en bout** : l’application
  entière.
- `import { test } from 'node:test'` et `import assert from 'node:assert/strict'`.
- `assert.equal(réel, attendu)` ; l’attendu est écrit en dur.
- `node --test` (ou `npm test`) trouve les fichiers `*.test.js`, ceux d’un dossier
  `test/`, etc., et renvoie un code de sortie non nul en cas d’échec.
- Structure Préparer, Agir, Vérifier ; un bon test est rapide, isolé, reproductible et
  lisible.
- Vois chaque test échouer au moins une fois.
