---
title: Choisir ses cas de test
summary: Trouver les cas qui comptent — nominal, limites, erreurs — et écrire des tests en tableau sans répétition.
durationMinutes: 50
sources:
  - title: Documentation Node.js — Test runner (node:test)
    url: https://nodejs.org/api/test.html
  - title: Documentation Node.js — Collecte de la couverture de code
    url: https://nodejs.org/api/test.html#collecting-code-coverage
---

## On ne peut pas tout tester

Une fonction qui prend un nombre accepte des milliards de valeurs possibles. On ne peut pas
toutes les essayer, et ce n’est pas nécessaire : beaucoup de valeurs se comportent de la même
façon. L’art du test consiste à choisir **peu de cas, mais les bons** : ceux qui ont le plus
de chances de révéler une erreur.

Trois familles de cas reviennent toujours :

1. le **cas nominal** : l’usage normal, celui pour lequel la fonction existe ;
2. les **cas limites** : les valeurs à la frontière entre deux comportements, là où se
   cachent la majorité des bugs ;
3. les **cas d’erreur** : les entrées invalides, qui doivent être refusées proprement.

## Partir des règles, pas du code

On écrit les cas à partir de la **spécification** (ce que la fonction doit faire), pas à
partir de son code : sinon on teste ce que le code fait, y compris ses erreurs. Prenons cette
règle métier :

> Les frais de livraison sont de 4,90 €. Ils sont offerts à partir de 50 € d’achat. Un
> panier vide n’a pas de frais. Un montant négatif ou non numérique est une erreur.

Et une implémentation proposée :

```js
// src/shipping.js — frais de livraison selon le montant du panier (en euros)
export const SHIPPING_FEE = 4.9;
export const FREE_SHIPPING_THRESHOLD = 50;

export function shippingCost(total) {
  if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
    throw new RangeError(`Montant invalide : ${total}`);
  }
  if (total === 0) {
    return 0;
  }
  return total > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
```

### Les classes d’équivalence

On découpe les entrées possibles en **classes** : des groupes de valeurs que la règle traite
de la même façon. Un représentant par classe suffit pour le cas nominal.

| Classe                       | Comportement attendu | Représentant |
| ---------------------------- | -------------------- | ------------ |
| panier vide                  | 0 €                  | `0`          |
| montant payant sous le seuil | 4,90 €               | `20`         |
| montant au-dessus du seuil   | 0 €                  | `120`        |
| montant invalide             | `RangeError`         | `-1`         |

### Les valeurs limites

Les erreurs se nichent aux **frontières** entre classes : `>` au lieu de `>=`, `<` au lieu de
`<=`, décalage d’une unité. Pour chaque frontière, on teste la valeur **juste avant**, la
valeur **exacte** et la valeur **juste après**.

| Frontière                  | Valeurs à tester          |
| -------------------------- | ------------------------- |
| vide ou payant             | `0`, `0.01`               |
| seuil de gratuité (50 €)   | `49.99`, `50`, `50.01`    |
| valide ou invalide         | `0`, `-1` (ou `-0.01`)    |

### Les entrées invalides et les valeurs spéciales

En JavaScript, pense systématiquement à : `NaN`, `Infinity`, une chaîne qui ressemble à un
nombre (`'50'`), `undefined`, `null`, la chaîne vide, un tableau vide, un très grand nombre.
Elles arrivent vite dès qu’une donnée vient d’un formulaire, d’un fichier ou d’une requête.

## Des tests en tableau

Écrire un `it` par valeur ferait beaucoup de copier-coller. On décrit plutôt les cas dans un
**tableau**, et une boucle crée un test par ligne :

```js
// test/shipping.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shippingCost } from '../src/shipping.js';

describe('shippingCost', () => {
  const cases = [
    { total: 0, expected: 0, why: 'panier vide : rien à livrer' },
    { total: 0.01, expected: 4.9, why: 'plus petit montant payant' },
    { total: 20, expected: 4.9, why: 'cas nominal sous le seuil' },
    { total: 49.99, expected: 4.9, why: 'juste sous le seuil' },
    { total: 50, expected: 0, why: 'exactement le seuil : gratuit « à partir de » 50 €' },
    { total: 50.01, expected: 0, why: 'juste au-dessus du seuil' },
    { total: 120, expected: 0, why: 'cas nominal au-dessus du seuil' },
  ];

  for (const { total, expected, why } of cases) {
    it(`${total} € -> ${expected} € (${why})`, () => {
      assert.equal(shippingCost(total), expected);
    });
  }

  const invalidCases = [
    { value: -1, label: 'un montant négatif' },
    { value: Number.NaN, label: 'NaN' },
    { value: Infinity, label: 'Infinity' },
    { value: '50', label: "la chaîne '50'" },
    { value: undefined, label: 'undefined' },
  ];

  for (const { value, label } of invalidCases) {
    it(`refuse ${label}`, () => {
      assert.throws(() => shippingCost(value), RangeError);
    });
  }
});
```

Chaque ligne du tableau devient un test distinct, avec un nom qui contient ses données et
la **raison** du cas. Si un cas échoue, le rapport dit exactement lequel :

```text
▶ shippingCost
  ✔ 0 € -> 0 € (panier vide : rien à livrer) (1.726268ms)
  ✔ 0.01 € -> 4.9 € (plus petit montant payant) (0.152693ms)
  ✔ 20 € -> 4.9 € (cas nominal sous le seuil) (0.072307ms)
  ✔ 49.99 € -> 4.9 € (juste sous le seuil) (0.061802ms)
  ✖ 50 € -> 0 € (exactement le seuil : gratuit « à partir de » 50 €) (0.750949ms)
  ✔ 50.01 € -> 0 € (juste au-dessus du seuil) (0.08705ms)
  ✔ 120 € -> 0 € (cas nominal au-dessus du seuil) (0.057625ms)
  …
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  4.9 !== 0
```

Le test de la valeur limite a trouvé le bug : « à partir de 50 € » inclut 50, il fallait
`>=`. Les cas nominaux (`20` et `120`), eux, passaient. Après correction
(`total >= FREE_SHIPPING_THRESHOLD`), les douze tests passent.

Pour les cas invalides, on utilise une propriété `label` plutôt que d’afficher la valeur
directement : `String('50')` et `String(50)` donnent le même texte, et le nom du test serait
trompeur.

## Les cas d’erreur méritent autant d’attention

Une fonction qui accepte silencieusement une donnée invalide propage le problème plus
loin, où il devient difficile à diagnostiquer. Tester les erreurs, c’est vérifier :

- **que** l’erreur est levée (et pas un résultat absurde comme `NaN`) ;
- **laquelle** : son type (`RangeError`, `TypeError`) ou son message, pour que le code
  appelant puisse réagir ;
- que les entrées valides **proches** passent toujours (`0` est valide, `-0.01` ne l’est
  pas).

Si la spécification ne dit rien d’un cas (que faire de `'007'` ? d’un montant à trois
décimales ?), le test oblige à **décider** : c’est une question à poser, pas à deviner. Le
test enregistre ensuite la décision.

## La couverture de code : un indicateur, pas un objectif

Node.js peut mesurer quelles lignes de code ont été exécutées par les tests :

```bash
node --test --experimental-test-coverage
```

Si l’on retire les tests d’entrées invalides, le rapport se termine ainsi :

```text
ℹ start of coverage report
ℹ -------------------------------------------------------------
ℹ file         | line % | branch % | funcs % | uncovered lines
ℹ -------------------------------------------------------------
ℹ src          |        |          |         |
ℹ  shipping.js |  84.62 |    85.71 |  100.00 | 7-8
ℹ -------------------------------------------------------------
ℹ all files    |  84.62 |    85.71 |  100.00 |
ℹ -------------------------------------------------------------
ℹ end of coverage report
```

Les lignes 7 et 8 (le `throw` et l’accolade qui le ferme) ne sont jamais exécutées : aucun
test ne vérifie les erreurs. La couverture est utile pour **repérer ce qui n’est pas testé**.
Elle ne dit rien de la **qualité** des tests : avec la version boguée (`>`) et seulement les
cas `0`, `20`, `120` et les entrées invalides, la couverture atteint 100 % et tous les tests
passent, alors que le bug du seuil est bien là. Une ligne exécutée n’est pas une ligne
vérifiée avec les bonnes valeurs.

L’option porte le mot `experimental` dans Node.js 24 : son format peut encore évoluer.

## Pièges courants

- **Ne tester que le cas nominal.** C’est celui qui a le moins de chances d’être faux.
- **Oublier les deux côtés d’une frontière**, ou la frontière exacte.
- **Écrire les cas en lisant le code** : on reproduit ses erreurs. Pars de la règle.
- **Des tests en tableau illisibles** : garde une ligne par cas, un nom qui dit pourquoi,
  et sépare les cas valides des cas d’erreur.
- **Viser 100 % de couverture** en écrivant des tests sans assertion utile : le chiffre
  monte, la confiance non.
- **Tester au hasard** (`Math.random()` dans un test) : un échec impossible à reproduire ne
  sert à rien.

## Exercices

### Exercice 1 — Les cas d’une quantité

Une fonction `parseQuantity(text)` lit une quantité saisie dans un formulaire. Règle :
la quantité est un entier de 1 à 99 ; les espaces autour sont tolérés ; toute autre saisie
lève une `TypeError` si ce n’est pas un entier, une `RangeError` si l’entier est hors
limites. Liste les classes d’équivalence et les valeurs limites, puis écris les tests en
tableau. Voici l’implémentation :

```js
// src/quantity.js — lit une quantité saisie dans un formulaire
export function parseQuantity(text) {
  const trimmed = String(text ?? '').trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new TypeError(`Quantité invalide : « ${text} »`);
  }
  const quantity = Number(trimmed);
  if (quantity < 1 || quantity > 99) {
    throw new RangeError(`Quantité hors limites : ${quantity}`);
  }
  return quantity;
}
```

:::solution
Classes : entier dans les limites (valide) ; entier hors limites (`RangeError`) ; texte qui
n’est pas un entier (`TypeError`) ; valeur absente (`TypeError`). Limites : `0`/`1` et
`99`/`100`. Valeurs spéciales : chaîne vide, espaces seuls, décimal, négatif, notation
scientifique (`'1e2'`, que `Number` accepterait), zéros initiaux.

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuantity } from '../src/quantity.js';

describe('parseQuantity', () => {
  const valid = [
    { text: '1', expected: 1 },
    { text: '42', expected: 42 },
    { text: '99', expected: 99 },
    { text: ' 5 ', expected: 5 },
    { text: '007', expected: 7 },
  ];
  for (const { text, expected } of valid) {
    it(`lit « ${text} » comme ${expected}`, () => {
      assert.equal(parseQuantity(text), expected);
    });
  }

  for (const text of ['0', '100']) {
    it(`refuse « ${text} », hors limites`, () => {
      assert.throws(() => parseQuantity(text), RangeError);
    });
  }

  for (const text of ['', '   ', 'abc', '1.5', '-3', '1e2', '12a']) {
    it(`refuse « ${text} », qui n'est pas un entier`, () => {
      assert.throws(() => parseQuantity(text), TypeError);
    });
  }

  it('refuse une valeur absente', () => {
    assert.throws(() => parseQuantity(undefined), TypeError);
  });
});
```

Les 15 tests passent. Le cas `'007'` illustre une **décision** : la règle ne l’interdit pas,
l’implémentation l’accepte (7) ; le test fige ce choix, qu’il faudrait valider avec la
personne qui a écrit la règle. Le cas `'1e2'` est un piège classique : `Number('1e2')` vaut
100, mais l’expression régulière le refuse avant.
:::

### Exercice 2 — Quels cas manquent ?

On teste ainsi une fonction de moyenne :

```js
export function average(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

it('calcule la moyenne de 2 et 4', () => {
  assert.equal(average([2, 4]), 3);
});
```

Propose au moins quatre cas supplémentaires. L’un d’eux révèle-t-il un problème ?

:::solution
Cas à ajouter :

1. un seul élément : `average([5])` doit valoir `5` ;
2. des négatifs : `average([-1, 1])` doit valoir `0` ;
3. un résultat non entier : `average([1, 2])` doit valoir `1.5` ;
4. **le tableau vide** : `average([])` renvoie `NaN` (0 divisé par 0). Ce n’est sûrement pas
   le comportement voulu : il faut décider (lever une erreur, renvoyer `null` ?) et écrire le
   test correspondant, par exemple
   `assert.throws(() => average([]), RangeError)` après avoir modifié la fonction ;
5. une valeur non numérique dans le tableau (`[1, '2']`) : `'2'` est concaténé
   (`0 + 1 + '2'` donne `'12'`, puis `'12' / 2` vaut `6`), un résultat faux et silencieux.

Le cas du tableau vide est le plus important : c’est une frontière (zéro élément) qu’un test
nominal ne voit jamais.
:::

### Exercice 3 — Lire un rapport de couverture

Un collègue montre fièrement 100 % de couverture sur un module de validation d’âge
(`isAdult(age)`, majeur à 18 ans) testé seulement avec `isAdult(30)` et `isAdult(5)`. Que
lui réponds-tu ?

:::solution
La couverture dit que chaque ligne a été exécutée, pas qu’elle a été vérifiée aux bons
endroits. Avec `30` et `5`, une implémentation `age > 18` (fausse pour 18 ans) passerait
les deux tests et afficherait quand même 100 %. Il manque les limites `17`, `18` (et
éventuellement `19`), ainsi que les entrées invalides (`-1`, `NaN`, `'18'`). La couverture
sert à trouver le code non testé ; elle ne remplace pas le choix des cas.
:::

## Récapitulatif

- Choisis des cas **nominaux**, **limites** et **d’erreur**, à partir de la règle et non du
  code.
- Découpe les entrées en **classes d’équivalence** ; teste chaque frontière juste avant,
  exactement et juste après.
- Pense aux valeurs spéciales : `0`, chaîne vide, `NaN`, `Infinity`, `undefined`, chaîne
  numérique, tableau vide.
- Les tests en tableau (`for … of` qui crée un `it` par cas) évitent la répétition ; chaque
  nom dit les données et la raison.
- Pour une erreur, vérifie qu’elle est levée **et** laquelle.
- `node --test --experimental-test-coverage` montre le code non exécuté ; 100 % de
  couverture ne garantit pas l’absence de bug.
